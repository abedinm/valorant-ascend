/* ==========================================================================
   VALORANT ASCEND — Debrief (tap-based death review)
   Instead of writing paragraphs, you tap what killed you. Each death is one
   pattern tag + mechanical/decision. Reviews aggregate into a 14-day death-
   pattern chart so the recurring leak becomes visible — and one tap turns
   your #1 pattern into tomorrow's focus goal. Stored in va_deaths.
   ========================================================================== */

const VADEBRIEF = (function () {
  "use strict";

  const PATTERNS = [
    { id: "alone", label: "Peeked alone", icon: "ti-user", goal: "Never fight alone (trade distance)" },
    { id: "repeek", label: "Re-peeked after a kill", icon: "ti-repeat", goal: "ZERO re-peeks after a kill — reset or Dismiss" },
    { id: "dry", label: "Dry entry (no util)", icon: "ti-door-enter", goal: "Entry ONLY on a count with trade cover — never dry" },
    { id: "aggro", label: "Over-aggressive / pushed", icon: "ti-flame", goal: "Hunt 2+ first bloods — counted and covered" },
    { id: "duel", label: "Lost a straight aim duel", icon: "ti-crosshair", goal: "Counter-strafe before every shot" },
    { id: "crosshair", label: "Crosshair too low/off", icon: "ti-target-off", goal: "Crosshair at head height EVERY round" },
    { id: "flank", label: "Caught off-guard / flanked", icon: "ti-eye-exclamation", goal: "Check flanks — hold info angles" },
    { id: "notrade", label: "Died un-traded", icon: "ti-users-minus", goal: "Never fight alone (trade distance)" }
  ];

  function all() { return Store.get("va_deaths", []); }

  function add(patternId, mechanical) {
    const list = all();
    list.push({ date: Store.todayKey(), ts: Date.now(), pattern: patternId, mechanical: !!mechanical });
    Store.set("va_deaths", list);
  }

  function recent(days) {
    const cutoff = Date.now() - days * 86400000;
    return all().filter((d) => (d.ts || 0) >= cutoff);
  }

  function counts(list) {
    const map = {};
    list.forEach((d) => { map[d.pattern] = (map[d.pattern] || 0) + 1; });
    return Object.entries(map)
      .map(([id, n]) => ({ id, n, def: PATTERNS.find((p) => p.id === id) }))
      .filter((x) => x.def)
      .sort((a, b) => b.n - a.n);
  }

  function todayCount() {
    const t = Store.todayKey();
    return all().filter((d) => d.date === t).length;
  }

  let el, mech = false;

  function open() {
    mech = false;
    el = document.getElementById("debrief-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "debrief-modal";
      el.className = "modal";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-label", "Death review");
      document.body.appendChild(el);
      el.addEventListener("click", onClick);
    }
    el.classList.add("open");
    document.body.style.overflow = "hidden";
    render();
  }
  function close() {
    if (el) el.classList.remove("open");
    document.body.style.overflow = "";
    if (typeof window.__debriefDone === "function") window.__debriefDone();
  }

  function onClick(e) {
    if (e.target.id === "debrief-modal") return close();
    const a = e.target.closest("[data-db]");
    if (!a) return;
    const act = a.dataset.db;
    if (act === "close") close();
    else if (act === "mech") { mech = a.dataset.val === "1"; render(); }
    else if (act === "pattern") {
      add(a.dataset.id, mech);
      if (window.VAFX && false) {}
      mech = false;
      render(true);
    } else if (act === "goal") {
      /* jump to Daily with this as the focus goal */
      const inp = document.getElementById("focus-input");
      if (inp) { inp.value = a.dataset.goal; inp.dispatchEvent(new Event("input", { bubbles: true })); }
      try { localStorage.setItem("va_pendingFocus", a.dataset.goal); } catch (err) {}
      close();
    }
  }

  function chart() {
    const c = counts(recent(14));
    if (!c.length) return `<p class="muted db-note">No deaths logged yet. Review a few after your next game — the pattern is the whole point.</p>`;
    const max = c[0].n;
    const top = c[0];
    return `
      <p class="db-verdict">Your #1 leak (14 days): <strong>${top.def.label}</strong> — ${top.n}×</p>
      <div class="db-bars">
        ${c.map((x) => `
          <div class="db-bar-row">
            <span class="db-bar-label"><i class="ti ${x.def.icon}" aria-hidden="true"></i> ${x.def.label}</span>
            <span class="db-bar-track"><span class="db-bar-fill" style="width:${Math.round((x.n / max) * 100)}%"></span></span>
            <span class="db-bar-n">${x.n}</span>
          </div>`).join("")}
      </div>
      <button class="btn btn-big db-goal" data-db="goal" data-goal="${top.def.goal}">
        <i class="ti ti-bookmark"></i> Make "${top.def.goal}" tomorrow's focus goal
      </button>`;
  }

  function render(justAdded) {
    if (!el) return;
    el.innerHTML = `
      <div class="modal-card db-card">
        <div class="modal-head">
          <h2><i class="ti ti-device-tv"></i> Death Review</h2>
          <button class="modal-x" data-db="close" aria-label="Close"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <p class="db-lead">${justAdded ? `Logged. <strong>${todayCount()}</strong> death(s) reviewed today.` : "What killed you? Tap the pattern. Review only your deaths — 3 to 5 is plenty."}</p>
          <div class="db-mech">
            <span class="db-mech-q">Was it:</span>
            <button class="db-mech-btn ${!mech ? "on" : ""}" data-db="mech" data-val="0">Decision error</button>
            <button class="db-mech-btn ${mech ? "on" : ""}" data-db="mech" data-val="1">Mechanical miss</button>
          </div>
          <div class="db-patterns">
            ${PATTERNS.map((p) => `
              <button class="db-pattern" data-db="pattern" data-id="${p.id}">
                <i class="ti ${p.icon}" aria-hidden="true"></i><span>${p.label}</span>
              </button>`).join("")}
          </div>
          <h3 class="db-chart-h"><i class="ti ti-chart-bar"></i> Death patterns — last 14 days</h3>
          ${chart()}
        </div>
      </div>`;
  }

  /* dashboard mini-widget: surface the top leak without opening the modal */
  function widget() {
    const c = counts(recent(14));
    if (!c.length) return "";
    const top = c[0];
    return `<section class="card db-widget tilt3d">
      <h2 class="card-h"><i class="ti ti-skull"></i> Your recurring leak</h2>
      <p class="db-widget-top"><i class="ti ${top.def.icon}"></i> ${top.def.label} <span class="db-widget-n">${top.n}× in 14 days</span></p>
      <button class="btn btn-ghost" data-action="open-debrief"><i class="ti ti-device-tv"></i> Review deaths</button>
    </section>`;
  }

  return { open, close, widget, todayCount };
})();
