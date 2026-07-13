/* ==========================================================================
   VALORANT ASCEND — Combat Stats (VACOMBAT)
   Per-map and per-weapon breakdowns from the player's real match history,
   with official map splash art + weapon killfeed icons. Everything is real
   or labelled small-sample; nothing is invented.
   ========================================================================== */

window.VACOMBAT = (function () {
  "use strict";

  function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function aggregate(cache) {
    const ms = (cache && cache.matches) || [];
    const maps = {}, weps = {};
    ms.forEach((m) => {
      const mp = m.map || "?";
      const e = maps[mp] || (maps[mp] = { name: mp, games: 0, wins: 0, losses: 0, k: 0, d: 0 });
      e.games++;
      if (m.won === true) e.wins++;
      else if (m.won === false) e.losses++;
      e.k += m.kills || 0; e.d += m.deaths || 0;
      (m.weapons || []).forEach((w) => {
        if (!weps[w.name]) weps[w.name] = { name: w.name, kills: 0, icon: w.icon };
        weps[w.name].kills += w.kills;
        if (w.icon && !weps[w.name].icon) weps[w.name].icon = w.icon;
      });
    });
    const mapArr = Object.values(maps).sort((a, b) => b.games - a.games);
    const wepArr = Object.values(weps).sort((a, b) => b.kills - a.kills);
    return { maps: mapArr, weapons: wepArr, totalKills: wepArr.reduce((a, w) => a + w.kills, 0) };
  }

  function wr(m) { const dec = m.wins + m.losses; return dec ? Math.round((m.wins / dec) * 100) : null; }

  function render() {
    const el = document.getElementById("view-combat");
    if (!el) return;
    const A = window.VAASSETS;
    const cache = Store.getApiCache();

    if (!cache || !cache.matches || !cache.matches.length) {
      el.innerHTML = `
        <div class="view-head"><h1><i class="ti ti-crosshair"></i> Combat Stats</h1></div>
        <div class="combat-empty">
          <i class="ti ti-map-off"></i>
          <div>Connect your account in <a href="#" data-action="goto-intel">Intel</a> and refresh —
          your per-map win rates and weapon kills load here with real Valorant art.</div>
        </div>`;
      return;
    }

    const agg = aggregate(cache);
    const decidedMaps = agg.maps.filter((m) => m.wins + m.losses > 0);
    const best = decidedMaps.slice().sort((a, b) => (wr(b) || 0) - (wr(a) || 0))[0];
    const worst = decidedMaps.slice().sort((a, b) => (wr(a) || 0) - (wr(b) || 0))[0];
    const maxKills = agg.weapons.length ? agg.weapons[0].kills : 1;

    const mapCards = agg.maps.map((m) => {
      const art = A ? A.map(m.name) : null;
      const w = wr(m);
      const kd = m.d ? (m.k / m.d).toFixed(2) : (m.k ? m.k.toFixed(2) : "0.00");
      const splash = art && art.splash ? art.splash : null;
      const cls = w == null ? "u" : w >= 50 ? "win" : "loss";
      return `
        <div class="map-card ${cls}" ${splash ? `style="background-image:linear-gradient(180deg,rgba(6,10,13,.35),rgba(6,10,13,.92)),url('${esc(splash)}')"` : ""}>
          <div class="map-top">
            <span class="map-name">${esc(m.name)}</span>
            <span class="map-wr">${w == null ? "&mdash;" : w + "%"}</span>
          </div>
          <div class="map-bot">
            <span class="map-rec">${m.wins}W &middot; ${m.losses}L${m.games - m.wins - m.losses ? " &middot; " + (m.games - m.wins - m.losses) + "?" : ""}</span>
            <span class="map-kd">${kd} KD</span>
          </div>
        </div>`;
    }).join("");

    const wepRows = agg.weapons.map((w) => {
      const pct = Math.round((w.kills / maxKills) * 100);
      return `
        <div class="wep-row">
          <div class="wep-icon">${w.icon ? `<img src="${esc(w.icon)}" alt="${esc(w.name)}" loading="lazy">` : `<i class="ti ti-flame"></i>`}</div>
          <div class="wep-main">
            <div class="wep-head"><span class="wep-name">${esc(w.name)}</span><span class="wep-kills">${w.kills}</span></div>
            <div class="wep-bar"><span style="width:${pct}%"></span></div>
          </div>
        </div>`;
    }).join("");

    const insight = (best && worst && best.name !== worst.name)
      ? `<p class="combat-insight"><i class="ti ti-bulb"></i> Your best map is <b>${esc(best.name)}</b>
         (${wr(best)}%), your worst is <b>${esc(worst.name)}</b> (${wr(worst)}%).
         You can't pick maps in comp — but knowing where you fall apart tells you which map's
         angles and setups to actually study.</p>`
      : "";

    el.innerHTML = `
      <div class="view-head">
        <h1><i class="ti ti-crosshair"></i> Combat Stats</h1>
        <p class="view-sub">Real per-map and per-weapon breakdown from your last
        ${cache.matches.length} matches. Small samples are what they are — read the trend, not one game.</p>
      </div>

      <h2 class="combat-h"><i class="ti ti-map-2"></i> Maps</h2>
      <div class="map-grid">${mapCards}</div>
      ${insight}

      <h2 class="combat-h"><i class="ti ti-swords"></i> Weapons &mdash; ${agg.totalKills} kills logged</h2>
      <div class="wep-list">${wepRows || '<p class="muted">No weapon data yet — refresh in Intel to pull kill details.</p>'}</div>
      <p class="combat-foot">Weapon kills come straight from your match killfeed; map art is official
      (valorant-api.com). "Top weapon" on your dashboard is whatever's #1 here.</p>
    `;
  }

  document.addEventListener("va-assets-ready", render);
  window.VACOMBAT = { render: render, aggregate: aggregate };
  return window.VACOMBAT;
})();
