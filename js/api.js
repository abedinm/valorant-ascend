/* ==========================================================================
   VALORANT ASCEND — Intel data layer (HenrikDev community API)
   Pulls account / MMR / competitive matches by Riot ID and computes the
   improvement metrics the cockpit cares about. All client-side fetch;
   results cached in localStorage so the cockpit works offline afterwards.
   ========================================================================== */

const VAPI = (function () {
  "use strict";

  const DIRECT_BASE = "https://api.henrikdev.xyz/valorant";
  const PROXY_BASE = "/api/henrik";
  /* proxy-first: use the server's key when the backend has one, fall back
     to a direct call with the browser-stored key otherwise */
  let proxyMode = null; // null = unknown, true/false = decided

  async function getJson(path, key) {
    if (proxyMode !== false) {
      try {
        const res = await fetch(PROXY_BASE + "/" + path);
        if (res.status === 501) {
          proxyMode = false; /* server has no key — go direct below */
        } else {
          if (res.status === 401) throw new Error("Session expired — reload the page and log in.");
          if (!res.ok) throw new Error(statusMsg(res.status));
          proxyMode = true;
          const body = await res.json();
          return body.data !== undefined ? body.data : body;
        }
      } catch (e) {
        if (proxyMode === true) throw e;      /* proxy works, real error */
        if (e.message && /Session expired|HTTP|rejected|not found|Rate limited/.test(e.message)) throw e;
        proxyMode = false;                     /* network-level: no backend */
      }
    }
    if (!key) throw new Error("No API key: the server has none configured and none is saved here. Add one in Account.");
    const res = await fetch(DIRECT_BASE + "/" + path, { headers: { Authorization: key } });
    if (!res.ok) throw new Error(statusMsg(res.status));
    const body = await res.json();
    return body.data !== undefined ? body.data : body;
  }

  function statusMsg(status) {
    if (status === 401 || status === 403) return "API key rejected (401/403). Check the key.";
    if (status === 404) return "Account not found. Check name, tag and region.";
    if (status === 429) return "Rate limited (429). Wait a minute and refresh.";
    return "HTTP " + status;
  }

  /* Fetch everything the cockpit needs in one go. */
  async function fetchAll(cfg) {
    const enc = encodeURIComponent;
    const name = enc(cfg.name), tag = enc(cfg.tag), region = enc(cfg.region);

    const account = await getJson(`v1/account/${name}/${tag}`, cfg.key);
    const mmr = await getJson(`v2/mmr/${region}/${name}/${tag}`, cfg.key);
    const matches = await getJson(`v3/matches/${region}/${name}/${tag}?filter=competitive&size=10`, cfg.key);
    let history = [];
    try {
      history = await getJson(`v1/mmr-history/${region}/${name}/${tag}`, cfg.key);
    } catch (e) {
      /* history endpoint is optional — cockpit degrades gracefully */
    }

    /* featured store bundle (public, same for everyone) — optional */
    let store = null;
    try {
      const prev = Store.getApiCache();
      if (prev && prev.store && prev.store.fetchedAt &&
          Date.now() - new Date(prev.store.fetchedAt).getTime() < 6 * 3600 * 1000) {
        store = prev.store; /* reuse for 6h — it only changes with bundle rotations */
      } else {
        const raw = await getJson("v2/store-featured", cfg.key);
        store = normalizeStore(raw);
      }
    } catch (e) {
      /* store is a bonus — never block the cockpit on it */
    }

    const cache = {
      at: new Date().toISOString(),
      account: {
        name: account.name,
        tag: account.tag,
        level: account.account_level,
        card: account.card && account.card.small ? account.card.small : null,
        wide: account.card && account.card.wide ? account.card.wide : null,
        puuid: account.puuid
      },
      mmr: normalizeMmr(mmr),
      matches: (matches || []).map((m) => normalizeMatch(m, account.puuid, cfg)).filter(Boolean),
      history: (history || []).slice(0, 15).map((h) => ({
        change: h.mmr_change_to_last_game,
        date: h.date
      })),
      store: store
    };
    Store.setApiCache(cache);
    return cache;
  }

  function normalizeStore(raw) {
    try {
      /* v2 shape: [{bundle_price, seconds_remaining, items:[{name,type,amount,base_price,...}]}] */
      const bundles = Array.isArray(raw) ? raw : (raw && raw.FeaturedBundle ? [raw.FeaturedBundle] : []);
      return {
        fetchedAt: new Date().toISOString(),
        bundles: bundles.slice(0, 3).map((b) => ({
          price: b.bundle_price || null,
          secondsLeft: b.seconds_remaining || null,
          items: (b.items || []).slice(0, 12).map((it) => ({
            name: it.name || (it.Item && it.Item.name) || "?",
            type: it.type || "",
            price: it.base_price || null,
            image: it.image || null
          }))
        }))
      };
    } catch (e) {
      return null;
    }
  }

  /* first kill of each round -> first blood (killer) / first death (victim) */
  function firstEngagements(m, puuid) {
    const kills = Array.isArray(m.kills) ? m.kills : [];
    if (!kills.length) return { fb: null, fd: null };
    const byRound = {};
    kills.forEach((k) => {
      const r = k.round != null ? k.round : -1;
      const t = k.kill_time_in_round != null ? k.kill_time_in_round : Infinity;
      if (!byRound[r] || t < byRound[r].t) {
        byRound[r] = { t: t, killer: k.killer_puuid, victim: k.victim_puuid };
      }
    });
    let fb = 0, fd = 0;
    Object.values(byRound).forEach((e) => {
      if (e.killer === puuid) fb++;
      if (e.victim === puuid) fd++;
    });
    return { fb: fb, fd: fd };
  }

  function normalizeMmr(m) {
    const cur = m && m.current_data ? m.current_data : m || {};
    return {
      tier: cur.currenttierpatched || "Unknown",
      rr: cur.ranking_in_tier != null ? cur.ranking_in_tier : null,
      lastChange: cur.mmr_change_to_last_game != null ? cur.mmr_change_to_last_game : null,
      elo: cur.elo != null ? cur.elo : null
    };
  }

  function normalizeMatch(m, puuid, cfg) {
    try {
      const all = m.players && m.players.all_players ? m.players.all_players : [];
      let me = all.find((p) => p.puuid === puuid);
      if (!me) {
        me = all.find(
          (p) =>
            p.name && p.tag &&
            p.name.toLowerCase() === cfg.name.toLowerCase() &&
            p.tag.toLowerCase() === cfg.tag.toLowerCase()
        );
      }
      if (!me) return null;
      const teamKey = (me.team || "").toLowerCase();
      const team = m.teams && m.teams[teamKey] ? m.teams[teamKey] : null;
      const shots = (me.stats.headshots || 0) + (me.stats.bodyshots || 0) + (me.stats.legshots || 0);
      const rounds = (m.metadata && m.metadata.rounds_played) || 1;
      const eng = firstEngagements(m, me.puuid);
      const board = all.map((p) => ({
        name: p.name, tag: p.tag,
        agent: p.character,
        team: (p.team || "").toLowerCase(),
        k: p.stats.kills, d: p.stats.deaths, a: p.stats.assists,
        acs: Math.round((p.stats.score || 0) / rounds),
        me: p.puuid === me.puuid
      })).sort((a, b) => b.acs - a.acs);
      return {
        map: m.metadata ? m.metadata.map : "?",
        started: m.metadata ? m.metadata.game_start_patched : "",
        startedTs: m.metadata && m.metadata.game_start ? m.metadata.game_start * 1000 : null,
        agent: me.character,
        kills: me.stats.kills,
        deaths: me.stats.deaths,
        assists: me.stats.assists,
        fb: eng.fb,
        fd: eng.fd,
        hsPct: shots ? Math.round(((me.stats.headshots || 0) / shots) * 100) : 0,
        adr: Math.round(((me.damage_made != null ? me.damage_made : 0)) / rounds),
        won: team ? !!team.has_won : null, /* null = result unknown (API gap) — never fabricate a loss */
        roundsWon: team ? team.rounds_won : null,
        roundsLost: team ? team.rounds_lost : null,
        myTeam: teamKey,
        board: board
      };
    } catch (e) {
      return null;
    }
  }

  /* ---- cockpit metrics over the cached matches ---- */
  function metrics(cache) {
    const ms = (cache && cache.matches) || [];
    const n = ms.length;
    if (!n) return null;
    /* matches with unknown results (API gaps) are excluded from win rate —
       we never fabricate a loss */
    const decided = ms.filter((m) => m.won === true || m.won === false);
    const wins = decided.filter((m) => m.won).length;
    const sum = (fn) => ms.reduce((a, m) => a + fn(m), 0);
    const kd = sum((m) => m.deaths) ? sum((m) => m.kills) / sum((m) => m.deaths) : 0;
    const under13 = ms.filter((m) => m.deaths < 13).length;
    const mainAgent = (typeof COURSE !== "undefined" && COURSE.student ? COURSE.student.agent : "").toLowerCase();
    const onMain = ms.filter((m) => (m.agent || "").toLowerCase() === mainAgent).length;
    const rrNet = (cache.history || []).reduce((a, h) => a + (Number(h.change) || 0), 0);
    const withEng = ms.filter((m) => m.fb != null);
    const fbSum = withEng.reduce((a, m) => a + m.fb, 0);
    const fdSum = withEng.reduce((a, m) => a + m.fd, 0);
    return {
      avgFb: withEng.length ? (fbSum / withEng.length).toFixed(1) : null,
      avgFd: withEng.length ? (fdSum / withEng.length).toFixed(1) : null,
      openingPositive: withEng.length ? fbSum >= fdSum : null,
      games: n,
      decided: decided.length,
      unknownResults: n - decided.length,
      winRate: decided.length ? Math.round((wins / decided.length) * 100) : 0,
      wins,
      losses: decided.length - wins,
      kd: kd.toFixed(2),
      avgDeaths: (sum((m) => m.deaths) / n).toFixed(1),
      avgAssists: (sum((m) => m.assists) / n).toFixed(1),
      avgAdr: Math.round(sum((m) => m.adr) / n),
      hsPct: Math.round(sum((m) => m.hsPct) / n),
      under13Pct: Math.round((under13 / n) * 100),
      mainPct: Math.round((onMain / n) * 100),
      rrNet: rrNet,
      deathsTrend: ms.map((m) => m.deaths).reverse(),
      winTrend: decided.map((m) => (m.won ? 1 : 0)).reverse()
    };
  }

  return { fetchAll, metrics };
})();
