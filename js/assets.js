/* ==========================================================================
   VALORANT ASCEND — Assets (VAASSETS)
   Official game art from valorant-api.com (the community CDN of Riot's own
   assets — free, no key). Loaded once, cached 7 days in localStorage.
   Everything degrades gracefully: if a fetch fails, lookups return null and
   the UI falls back to text/icons. Never blocks the app.
   ========================================================================== */

window.VAASSETS = (function () {
  "use strict";
  const BASE = "https://valorant-api.com/v1/";
  const KEY = "va_assets_v2";
  const TTL = 7 * 24 * 3600 * 1000;
  let data = null;

  function fireReady() {
    try { document.dispatchEvent(new Event("va-assets-ready")); } catch (e) {}
  }

  function build([ag, ct, mp]) {
    const out = { agents: {}, ranks: {}, maps: {}, at: Date.now() };
    if (ag && ag.data) {
      ag.data.forEach((a) => {
        if (!a.displayName) return;
        out.agents[a.displayName.toLowerCase()] = {
          name: a.displayName,
          icon: a.displayIcon,
          portrait: a.fullPortrait || a.fullPortraitV2 || a.displayIcon,
          bg: a.background,
          grad: (a.backgroundGradientColors || []).map((c) => "#" + c.slice(0, 6)),
          role: a.role ? a.role.displayName : "",
          roleIcon: a.role ? a.role.displayIcon : null,
          abilities: (a.abilities || [])
            .filter((x) => x.displayIcon && x.slot !== "Passive")
            .map((x) => ({ name: x.displayName, icon: x.displayIcon, slot: x.slot, desc: x.description }))
        };
      });
    }
    if (ct && ct.data && ct.data.length) {
      const latest = ct.data[ct.data.length - 1];
      (latest.tiers || []).forEach((t) => {
        if (t.tierName) out.ranks[t.tierName.toLowerCase()] = t.largeIcon;
      });
    }
    if (mp && mp.data) {
      mp.data.forEach((m) => {
        if (m.displayName) out.maps[m.displayName.toLowerCase()] = { splash: m.splash, card: m.listViewIcon };
      });
    }
    return out;
  }

  function load() {
    const cached = Store.get(KEY, null);
    if (cached && cached.at && Date.now() - cached.at < TTL && Object.keys(cached.agents || {}).length) {
      data = cached; fireReady(); return;
    }
    const j = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([
      j(BASE + "agents?isPlayableCharacter=true"),
      j(BASE + "competitivetiers"),
      j(BASE + "maps")
    ]).then((res) => {
      const out = build(res);
      if (Object.keys(out.agents).length) {
        data = out;
        try { Store.set(KEY, out); } catch (e) {}
        fireReady();
      }
    }).catch(function () {});
  }

  function agent(name) { return data && name ? data.agents[name.toLowerCase()] || null : null; }
  function rank(tier) { return data && tier ? data.ranks[tier.toLowerCase()] || null : null; }
  function map(name) { return data && name ? data.maps[name.toLowerCase()] || null : null; }

  document.addEventListener("DOMContentLoaded", load);
  return { agent: agent, rank: rank, map: map, ready: function () { return !!data; } };
})();
