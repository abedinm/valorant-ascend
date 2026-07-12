/* ==========================================================================
   VALORANT ASCEND — Profile Hero (VAHERO)
   The dashboard's Valorant-style identity card: real player card art, rank
   badge, most-played agent portrait, most-used weapon, and the core stats
   (HS% / K.D / WIN% / ADR) — all from the player's real match history.
   Returns HTML; app.js injects it at the top of the dashboard.
   ========================================================================== */

window.VAHERO = (function () {
  "use strict";

  function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function profile(cache) {
    const ms = (cache && cache.matches) || [];
    const agents = {}, weps = {};
    let hs = 0, hsN = 0, adr = 0, adrN = 0, k = 0, d = 0, wins = 0, dec = 0;
    ms.forEach((m) => {
      if (m.agent) agents[m.agent] = (agents[m.agent] || 0) + 1;
      (m.weapons || []).forEach((w) => {
        if (!weps[w.name]) weps[w.name] = { name: w.name, kills: 0, icon: w.icon };
        weps[w.name].kills += w.kills;
        if (w.icon && !weps[w.name].icon) weps[w.name].icon = w.icon;
      });
      if (typeof m.hsPct === "number") { hs += m.hsPct; hsN++; }
      if (typeof m.adr === "number") { adr += m.adr; adrN++; }
      k += m.kills || 0; d += m.deaths || 0;
      if (m.won === true) { wins++; dec++; } else if (m.won === false) { dec++; }
    });
    const topAgent = Object.entries(agents).sort((a, b) => b[1] - a[1])[0];
    const topWeapon = Object.values(weps).sort((a, b) => b.kills - a.kills)[0];
    return {
      topAgent: topAgent ? { name: topAgent[0], count: topAgent[1] } : null,
      topWeapon: topWeapon || null,
      hs: hsN ? Math.round((hs / hsN) * 10) / 10 : null,
      adr: adrN ? Math.round(adr / adrN) : null,
      kd: d ? (k / d).toFixed(2) : (k ? k.toFixed(2) : "0.00"),
      wr: dec ? Math.round((wins / dec) * 100) : null,
      games: ms.length
    };
  }

  function html(a0) {
    if (!a0 || !a0.cache) {
      return `<section class="vhero vhero-empty">
        <div class="vhero-empty-in">
          <i class="ti ti-user-scan"></i>
          <div><b>Connect your account</b> in <a href="#" data-action="goto-intel">Intel</a>
          to load your player card, rank, most-played agent, top weapon and live stats here.</div>
        </div></section>`;
    }
    const c = a0.cache, acc = c.account || {}, mmr = c.mmr || {};
    const p = profile(c);
    const A = window.VAASSETS;
    const rankImg = A ? A.rank(mmr.tier) : null;
    const ta = (p.topAgent && A) ? A.agent(p.topAgent.name) : null;
    const wide = acc.wide || acc.card || "";
    const card = acc.card || "";

    const banner = wide ? `style="background-image:linear-gradient(90deg,rgba(6,10,13,.94),rgba(6,10,13,.55)),url('${esc(wide)}')"` : "";

    const stat = (label, val, suffix) =>
      `<div class="vh-stat"><div class="vh-stat-v">${val == null ? "&mdash;" : esc(String(val))}${suffix ? `<span>${suffix}</span>` : ""}</div><div class="vh-stat-l">${label}</div></div>`;

    const agentPanel = p.topAgent ? `
      <div class="vh-side vh-agent" ${ta && ta.grad && ta.grad.length ? `style="--g1:${esc(ta.grad[0])};--g2:${esc(ta.grad[ta.grad.length-1])}"` : ""}>
        ${ta && ta.portrait ? `<img class="vh-agent-art" src="${esc(ta.portrait)}" alt="${esc(p.topAgent.name)}" loading="lazy">` : ""}
        <div class="vh-side-meta">
          <div class="vh-side-tag">MOST PLAYED</div>
          <div class="vh-side-name">${esc(p.topAgent.name)}</div>
          <div class="vh-side-sub">${ta && ta.role ? esc(ta.role) + " &middot; " : ""}${p.topAgent.count} of last ${p.games}</div>
        </div>
      </div>` : "";

    const wep = p.topWeapon ? `
      <div class="vh-side vh-weapon">
        ${p.topWeapon.icon ? `<img class="vh-weapon-art" src="${esc(p.topWeapon.icon)}" alt="${esc(p.topWeapon.name)}" loading="lazy">` : `<i class="ti ti-flame vh-weapon-fallback"></i>`}
        <div class="vh-side-meta">
          <div class="vh-side-tag">TOP WEAPON</div>
          <div class="vh-side-name">${esc(p.topWeapon.name)}</div>
          <div class="vh-side-sub">${p.topWeapon.kills} kills logged</div>
        </div>
      </div>` : "";

    return `
    <section class="vhero" ${banner}>
      <div class="vhero-id">
        <div class="vh-avatar">${card ? `<img src="${esc(card)}" alt="player card">` : `<i class="ti ti-user"></i>`}</div>
        <div class="vh-idmeta">
          <div class="vh-name">${esc((acc.name || "OPERATOR").toUpperCase())}<span class="vh-tag">#${esc(acc.tag || "")}</span></div>
          <div class="vh-rankrow">
            ${rankImg ? `<img class="vh-rankbadge" src="${esc(rankImg)}" alt="${esc(mmr.tier)}">` : ""}
            <span class="vh-rank">${esc(mmr.tier || "Unranked")}</span>
            ${mmr.rr != null ? `<span class="vh-rr">${mmr.rr} RR</span>` : ""}
            ${acc.level ? `<span class="vh-level">LVL ${acc.level}</span>` : ""}
          </div>
        </div>
      </div>

      <div class="vh-stats">
        ${stat("HS %", p.hs, "%")}
        ${stat("K / D", p.kd)}
        ${stat("WIN %", p.wr, "%")}
        ${stat("ADR", p.adr)}
      </div>

      <div class="vh-sides">
        ${agentPanel}
        ${wep}
      </div>
    </section>`;
  }

  return { html: html, profile: profile };
})();
