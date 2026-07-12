/* ==========================================================================
   VALORANT ASCEND — Agent Fit (VAFIT)
   Ranks every agent best->worst FOR THIS PLAYER specifically, then enforces
   a one-agent lock. Scoring blends two things and is honest about both:
     1. Coach profile — fixed facts the player has stated:
        - hates taking first contact ("second/third guy, not the entry")
        - inconsistent aim, skips aim practice
        - tilt-prone; agents that need kills to function amplify tilt
        - chronic role-hopping (the lock exists to stop this)
        - Iron/Bronze/Silver lobbies (simple util > lineup art)
     2. Live evidence — real per-agent W/L + K/D from the cached match
        history (small samples are labelled, never oversold).
   ========================================================================== */

(function () {
  "use strict";

  /* score dims 0-10: entry = how little first-contact the role demands,
     aim = value delivered when aim is off, simple = low decision load,
     tilt = keeps functioning while losing, elo = power in iron-silver. */
  const W = { entry: 0.25, aim: 0.25, simple: 0.20, tilt: 0.15, elo: 0.15 };

  const AGENTS = [
    { name: "Sage",      role: "Sentinel",  s: { entry: 10, aim: 10, simple: 9,  tilt: 10, elo: 10 },
      why: "Everything you said points here. Never first in. Heals and walls are value your aim can't miss. Res flips rounds in Iron. Nothing to tilt off — your job is keeping people alive, not popping off.",
      tip: "Hold the wall for retakes or anti-rush. Never wide-swing first. Res only behind a teammate's gun." },
    { name: "Cypher",    role: "Sentinel",  s: { entry: 10, aim: 8,  simple: 7,  tilt: 9,  elo: 9 },
      why: "Anchor from behind a setup. Trips and cam do the fighting for you; Iron players never clear utility. You get free info kills without duels.",
      tip: "One default setup per site per map. Re-use it. Camera high, trips low." },
    { name: "Killjoy",   role: "Sentinel",  s: { entry: 10, aim: 8,  simple: 8,  tilt: 9,  elo: 9 },
      why: "Turret spots, alarmbot tags, mollies clear post-plant — all of it works when your crosshair doesn't. Sit on your site and farm the lockdown.",
      tip: "Turret watches flank, you watch main. Save lockdown for retakes." },
    { name: "Brimstone", role: "Smokes",    s: { entry: 9,  aim: 7,  simple: 10, tilt: 8,  elo: 8 },
      why: "The simplest smoker in the game — tap the map, done. Smokes from the back line, molly post-plant. If you want smokes, it's this, not the galaxy-brain ones.",
      tip: "Smoke the two choke points every round, same spots. Post-plant molly wins Iron rounds alone." },
    { name: "Fade",      role: "Initiator", s: { entry: 7,  aim: 6,  simple: 6,  tilt: 6,  elo: 7 },
      why: "Your real history: your most-played recent agent with a positive record over ~43 games. Second-in fits you. But she needs follow-up aim to convert her own info, and you drift into hero-ball on her.",
      tip: "Haunt, CALL what it sees, let a teammate swing first, you trade." },
    { name: "Skye",      role: "Initiator", s: { entry: 7,  aim: 7,  simple: 6,  tilt: 7,  elo: 7 },
      why: "Flash for a teammate, heal after the fight — support initiator, second-in by design.",
      tip: "Flash FOR someone, never for a solo push." },
    { name: "Omen",      role: "Smokes",    s: { entry: 8,  aim: 6,  simple: 7,  tilt: 7,  elo: 7 },
      why: "Smokes with escape tools. More forgiving than Viper, less braindead-simple than Brim. Solid if Brim feels too plain.",
      tip: "Smoke first, tp out of trouble, never blink into site alone." },
    { name: "Vyse",      role: "Sentinel",  s: { entry: 9,  aim: 7,  simple: 6,  tilt: 8,  elo: 6 },
      why: "Setup sentinel like Cypher but newer and less proven in low elo; wall and thorns punish pushes without duels.",
      tip: "Play her exactly like Cypher — static anchor, let util bite first." },
    { name: "Deadlock",  role: "Sentinel",  s: { entry: 9,  aim: 6,  simple: 6,  tilt: 8,  elo: 6 },
      why: "Reactive anchor. Sensors stop rushes cold — but weaker info than Cypher/KJ, so you work harder for the same result.",
      tip: "Gravnet the rush, fall back, let them walk into the team." },
    { name: "KAY/O",     role: "Initiator", s: { entry: 6,  aim: 6,  simple: 7,  tilt: 6,  elo: 6 },
      why: "You tried him once and moved on. Suppress is great — but his flashes demand an immediate swing, and that swing keeps being you. That's entry pressure you said you don't want.",
      tip: "Knife BEFORE the team hits site, pop flash for the duelist, not yourself." },
    { name: "Gekko",     role: "Initiator", s: { entry: 7,  aim: 7,  simple: 7,  tilt: 7,  elo: 6 },
      why: "On paper he suits you (recyclable util, second-in). In practice you played him and it went badly — evidence beats paper.",
      tip: "If you ever return: Wingman plants the spike, you never do." },
    { name: "Sova",      role: "Initiator", s: { entry: 8,  aim: 5,  simple: 4,  tilt: 7,  elo: 5 },
      why: "Back-line info agent — but darts need lineup study you won't do (you skip Aim Lab; you'll skip dart lineups too), and shock-dart damage needs precision.",
      tip: "Skip unless you enjoy homework." },
    { name: "Viper",     role: "Smokes",    s: { entry: 8,  aim: 6,  simple: 3,  tilt: 6,  elo: 5 },
      why: "Strong agent, wrong player. One-smoke economy plus lineup dependence = decision load you don't need while rebuilding confidence.",
      tip: "—" },
    { name: "Clove",     role: "Smokes",    s: { entry: 6,  aim: 5,  simple: 7,  tilt: 5,  elo: 6 },
      why: "Smoker that plays like a duelist and rewards aggression + kills to use their kit. That loop is your tilt trap wearing a different outfit.",
      tip: "—" },
    { name: "Phoenix",   role: "Duelist",   s: { entry: 5,  aim: 6,  simple: 8,  tilt: 6,  elo: 7 },
      why: "IF you insist on duelist, the only sane one: self-flash, self-heal, simple kit. Still entry. Still not recommended right now.",
      tip: "Flash off a wall, swing off the flash, heal after. Never dry-peek." },
    { name: "Breach",    role: "Initiator", s: { entry: 7,  aim: 5,  simple: 5,  tilt: 6,  elo: 4 },
      why: "Needs teammates who swing on your stun. Iron soloq teammates don't. Your util evaporates into nothing all game.",
      tip: "—" },
    { name: "Tejo",      role: "Initiator", s: { entry: 7,  aim: 6,  simple: 5,  tilt: 6,  elo: 5 },
      why: "Guided-salvo initiator; playable second-in but more kit to manage than Fade for the same job.",
      tip: "—" },
    { name: "Astra",     role: "Smokes",    s: { entry: 8,  aim: 5,  simple: 2,  tilt: 6,  elo: 3 },
      why: "Galaxy-brain agent. Global map control means global decision load — the exact opposite of what a tilt-prone role-hopper needs.",
      tip: "—" },
    { name: "Harbor",    role: "Smokes",    s: { entry: 7,  aim: 5,  simple: 5,  tilt: 6,  elo: 3 },
      why: "Weak solo impact; needs a coordinated team to convert his cover. Iron is not that.",
      tip: "—" },
    { name: "Chamber",   role: "Sentinel",  s: { entry: 7,  aim: 2,  simple: 6,  tilt: 4,  elo: 5 },
      why: "A sentinel whose whole kit is 'hit your shots.' You told me your aim is inconsistent. This is an aim check you'd fail on bad days — and bad days are the problem we're solving.",
      tip: "—" },
    { name: "Raze",      role: "Duelist",   s: { entry: 3,  aim: 5,  simple: 5,  tilt: 4,  elo: 6 },
      why: "Entry + movement mechanics (satchels) you haven't trained. Fun, not a climb vehicle for you.",
      tip: "—" },
    { name: "Neon",      role: "Duelist",   s: { entry: 2,  aim: 3,  simple: 5,  tilt: 3,  elo: 4 },
      why: "Sprinting first onto site with run-and-gun precision demands — maximum entry, maximum aim, maximum tilt exposure.",
      tip: "—" },
    { name: "Iso",       role: "Duelist",   s: { entry: 3,  aim: 2,  simple: 6,  tilt: 3,  elo: 4 },
      why: "His kit literally schedules 1v1 duels. You'd be queueing aim checks.",
      tip: "—" },
    { name: "Waylay",    role: "Duelist",   s: { entry: 2,  aim: 3,  simple: 4,  tilt: 3,  elo: 4 },
      why: "Motion-dash entry duelist. Everything Neon is, for you, again.",
      tip: "—" },
    { name: "Yoru",      role: "Duelist",   s: { entry: 3,  aim: 4,  simple: 2,  tilt: 3,  elo: 3 },
      why: "High-concept solo plays that need mechanics AND game sense AND confidence. Wrong tool on all three counts today.",
      tip: "—" },
    { name: "Jett",      role: "Duelist",   s: { entry: 1,  aim: 2,  simple: 4,  tilt: 2,  elo: 4 },
      why: "First through every door, kit pays off only with sharp aim. She's the rank-up agent for smurfs and the derank agent for everyone else in Iron.",
      tip: "—" },
    { name: "Reyna",     role: "Duelist",   s: { entry: 2,  aim: 2,  simple: 6,  tilt: 1,  elo: 5 },
      why: "Four years of comfort, and she's the trap. Her kit is dead until YOU get a kill — behind = blank agent = faster tilt. She rewards exactly the hero-ball that sank you to Iron. Comfort isn't fit.",
      tip: "—" }
  ];

  function fitScore(a) {
    return Math.round((a.s.entry * W.entry + a.s.aim * W.aim + a.s.simple * W.simple +
      a.s.tilt * W.tilt + a.s.elo * W.elo) * 10);
  }

  /* real per-agent evidence from the cached competitive matches */
  function evidence() {
    const cache = Store.getApiCache();
    const out = {};
    if (!cache || !cache.matches) return out;
    cache.matches.forEach((m) => {
      const key = (m.agent || "").toLowerCase();
      if (!key) return;
      const e = out[key] || (out[key] = { games: 0, wins: 0, losses: 0, k: 0, d: 0 });
      e.games++;
      if (m.won === true) e.wins++;
      if (m.won === false) e.losses++;
      e.k += m.kills || 0; e.d += m.deaths || 0;
    });
    return out;
  }

  /* evidence nudges the static score, capped and only with >=3 games */
  function evidenceAdj(e) {
    if (!e || e.games < 3) return 0;
    const dec = e.wins + e.losses;
    const wr = dec ? e.wins / dec : 0.5;
    const kd = e.d ? e.k / e.d : 1;
    return Math.max(-8, Math.min(8, Math.round((wr - 0.5) * 12 + (kd - 1) * 4)));
  }

  function tierOf(score) {
    if (score >= 88) return { id: "S", label: "LOCK CANDIDATE" };
    if (score >= 76) return { id: "A", label: "WORKS" };
    if (score >= 62) return { id: "B", label: "PLAYABLE" };
    if (score >= 50) return { id: "C", label: "RISKY" };
    return { id: "D", label: "AVOID" };
  }

  function ranked() {
    const ev = evidence();
    return AGENTS.map((a) => {
      const e = ev[a.name.toLowerCase()] || null;
      const base = fitScore(a);
      const adj = evidenceAdj(e);
      return { ...a, base, adj, score: Math.max(0, Math.min(100, base + adj)), ev: e };
    }).sort((x, y) => y.score - x.score);
  }

  /* ---------- lock state ---------- */
  function getLock() { return Store.get("va_agentLock", null); }
  function setLock(agent) {
    Store.set("va_agentLock", { agent, since: Date.now(), breaks: (getLock() && getLock().breaks) || 0 });
  }
  function breakLock() {
    const l = getLock();
    Store.set("va_agentLock", null);
    Store.set("va_lockBreaks", (Store.get("va_lockBreaks", 0) || 0) + 1);
    return l;
  }

  /* compliance: matches since lock date on / off the locked agent */
  function compliance() {
    const l = getLock();
    const cache = Store.getApiCache();
    if (!l || !cache || !cache.matches) return null;
    const since = l.since;
    const ms = cache.matches.filter((m) => m.startedTs && m.startedTs >= since);
    const on = ms.filter((m) => (m.agent || "").toLowerCase() === l.agent.toLowerCase()).length;
    return { total: ms.length, on, off: ms.length - on };
  }

  /* ---------- render ---------- */
  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function render() {
    const el = document.getElementById("view-agents");
    if (!el) return;
    const list = ranked();
    const lock = getLock();
    const comp = compliance();
    const hasApi = !!Store.getApiCache();

    let lockHtml;
    if (lock) {
      const compHtml = comp && comp.total
        ? `<div class="lock-comp ${comp.off ? "bad" : "good"}">
             Since lock: <b>${comp.on}</b> on ${esc(lock.agent)} · <b>${comp.off}</b> off-script
             ${comp.off ? " — every off-script game is a vote to stay hardstuck" : " — perfect discipline"}
           </div>`
        : `<div class="lock-comp">No matches on record since locking — next games get judged here.</div>`;
      lockHtml = `
        <div class="lock-panel locked">
          <div class="lock-head"><i class="ti ti-lock"></i> LOCKED: <b>${esc(lock.agent)}</b>
            <span class="lock-since">since ${new Date(lock.since).toLocaleDateString()}</span></div>
          ${compHtml}
          <button class="lock-break" data-action="agent-unlock">Break lock (recorded)</button>
        </div>`;
    } else {
      lockHtml = `
        <div class="lock-panel">
          <div class="lock-head"><i class="ti ti-lock-open"></i> NO AGENT LOCKED</div>
          <p>You told me you've been hopping smokes, initiator, sentinel — that hop IS the derank.
          Rank measures your average, and the average of five half-learned agents is worse than
          one boring mastered one. Pick from the top of this list and lock it.</p>
        </div>`;
    }

    el.innerHTML = `
      <div class="view-head">
        <h1><i class="ti ti-target"></i> Agent Fit — built for you, not the meta</h1>
        <p class="view-sub">Scored on YOUR stated profile: no first-contact, aim-forgiving, simple,
        tilt-proof, Iron-lobby-effective. ${hasApi
          ? "Blended with real per-agent results from your match history (small samples labelled)."
          : "Connect your account in Intel to blend in real per-agent results."}</p>
      </div>
      ${lockHtml}
      <div class="fit-list">
        ${list.map((a, i) => {
          const t = tierOf(a.score);
          const dec = a.ev ? a.ev.wins + a.ev.losses : 0;
          const evHtml = a.ev
            ? `<span class="fit-ev" title="from your cached matches">${a.ev.games}g
                 ${dec ? " · " + Math.round((a.ev.wins / dec) * 100) + "% WR" : ""}
                 · ${a.ev.d ? (a.ev.k / a.ev.d).toFixed(1) : "—"} KD
                 ${a.ev.games < 3 ? " · small sample" : ""}
                 ${a.adj ? " · " + (a.adj > 0 ? "+" : "") + a.adj + " adj" : ""}</span>`
            : `<span class="fit-ev dim">no recent data</span>`;
          const lockBtn = (!lock && t.id === "S")
            ? `<button class="fit-lock" data-action="agent-lock" data-agent="${esc(a.name)}">
                 <i class="ti ti-lock"></i> LOCK ${esc(a.name.toUpperCase())}</button>`
            : (!lock ? `<button class="fit-lock ghost" data-action="agent-lock" data-agent="${esc(a.name)}">lock anyway</button>` : "");
          return `
          <div class="fit-card tier-${t.id} ${lock && lock.agent === a.name ? "is-locked" : ""}">
            <div class="fit-rank">#${i + 1}</div>
            <div class="fit-tier t-${t.id}">${t.id}</div>
            <div class="fit-main">
              <div class="fit-name">${esc(a.name)} <span class="fit-role">${esc(a.role)}</span>
                <span class="fit-score">${a.score}</span> ${evHtml}</div>
              <div class="fit-why">${esc(a.why)}</div>
              ${a.tip !== "—" ? `<div class="fit-tip"><i class="ti ti-bulb"></i> ${esc(a.tip)}</div>` : ""}
            </div>
            ${lockBtn}
          </div>`;
        }).join("")}
      </div>
      <p class="fit-foot">Scores: profile fit (fixed weights: first-contact 25%, aim-forgiveness 25%,
      simplicity 20%, tilt-resilience 15%, low-elo power 15%) ± up to 8 from your real match evidence
      at 3+ games. Roster as of my knowledge — if a newer agent is missing, tell me and I'll score it.</p>`;
  }

  /* own event delegation so app.js barely changes */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    if (t.dataset.action === "agent-lock") {
      const agent = t.dataset.agent;
      if (!agent) return;
      setLock(agent);
      if (typeof VAGAME !== "undefined" && VAGAME.evaluate) { try { VAGAME.evaluate(); } catch (err) {} }
      render();
    }
    if (t.dataset.action === "agent-unlock") {
      if (confirm("Breaking the lock gets recorded. The lock is the fix for the exact habit that deranked you. Still break it?")) {
        breakLock();
        render();
      }
    }
  });

  window.VAFIT = { render, ranked, getLock, compliance };
})();
