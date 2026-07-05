/* ==========================================================================
   VALORANT ASCEND — Session Guard
   The stop-loss as software. A persistent session bar tracks today's live
   W/L run (quick-log or pulled from real matches). Two losses in a row trips
   a full-screen intervention. BANKING the session (walking away) pays XP —
   the exit is the rep this system rewards hardest.
   ========================================================================== */

const VASESSION = (function () {
  "use strict";

  function state() {
    const s = Store.get("va_session", null);
    const today = Store.todayKey();
    if (!s || s.date !== today) {
      return { date: today, results: [], banked: false, overridden: false };
    }
    return s;
  }

  function save(s) {
    Store.set("va_session", s);
  }

  function lossStreak(s) {
    let n = 0;
    for (let i = s.results.length - 1; i >= 0; i--) {
      if (s.results[i] === "L") n++; else break;
    }
    return n;
  }

  function log(result) {
    const s = state();
    if (s.banked) return; /* session is closed — honor it */
    s.results.push(result);
    save(s);
    render();
    if (result === "L" && lossStreak(s) >= 2 && !s.overridden) tripGuard(s);
    else if (typeof VAGAME !== "undefined") VAGAME.evaluate(false);
  }

  function undo() {
    const s = state();
    if (s.banked || !s.results.length) return;
    s.results.pop();
    save(s);
    render();
  }

  function bank() {
    const s = state();
    if (s.banked) return;
    s.banked = true;
    save(s);
    const banks = Store.get("va_banks", 0) + 1;
    Store.set("va_banks", banks);
    closeGuard();
    render();
    if (typeof VAGAME !== "undefined") {
      VAGAME.evaluate(); /* discipline XP + possible badge celebrates the WALK-AWAY */
    }
    if (window.VAFX) window.VAFX.confetti();
  }

  function override() {
    const s = state();
    s.overridden = true; /* recorded honestly — the tracker will show it */
    save(s);
    closeGuard();
    render();
  }

  /* ---------- UI ---------- */
  function render() {
    const bar = document.getElementById("session-bar");
    if (!bar) return;
    const s = state();
    const streak = lossStreak(s);
    const wins = s.results.filter((r) => r === "W").length;
    const losses = s.results.length - wins;
    const pips = s.results.map((r) =>
      `<span class="sess-pip ${r === "W" ? "w" : "l"}" aria-hidden="true">${r}</span>`
    ).join("");

    bar.innerHTML = `
      <span class="sess-label"><i class="ti ti-shield-half" aria-hidden="true"></i> SESSION</span>
      <span class="sess-pips">${pips || '<span class="sess-empty">no games logged yet</span>'}</span>
      <span class="sess-score" aria-live="polite">${wins}W-${losses}L${s.overridden ? ' <span class="sess-ovr" title="Stop-loss was overridden today">OVERRIDE</span>' : ""}</span>
      ${s.banked
        ? `<span class="sess-banked"><i class="ti ti-lock-check" aria-hidden="true"></i> BANKED &middot; see you tomorrow</span>`
        : `
        <button class="sess-btn w" data-action="sess-log" data-r="W" aria-label="Log a win">+W</button>
        <button class="sess-btn l" data-action="sess-log" data-r="L" aria-label="Log a loss">+L</button>
        <button class="sess-btn" data-action="sess-undo" aria-label="Undo last logged game"><i class="ti ti-arrow-back-up" aria-hidden="true"></i></button>
        <button class="sess-btn bank" data-action="sess-bank" aria-label="Bank the session and stop for today"><i class="ti ti-pig-money" aria-hidden="true"></i> BANK IT</button>
        ${streak === 1 ? '<span class="sess-warn" role="status">1 loss — next one trips the guard</span>' : ""}`}
    `;
  }

  function tripGuard(s) {
    let el = document.getElementById("session-guard");
    if (!el) {
      el = document.createElement("div");
      el.id = "session-guard";
      el.setAttribute("role", "alertdialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-labelledby", "sg-title");
      document.body.appendChild(el);
    }
    const wins = s.results.filter((r) => r === "W").length;
    const losses = s.results.length - wins;
    el.innerHTML = `
      <div class="sg-card">
        <i class="ti ti-hand-stop sg-icon" aria-hidden="true"></i>
        <h2 id="sg-title">STOP-LOSS TRIPPED</h2>
        <p class="sg-line">Two losses in a row. Session: <strong>${wins}W-${losses}L</strong>.</p>
        <p class="sg-body">This is the rule you set when you were calm, for exactly this moment.
        Every long slide this account has ever taken started right here — at "one more."</p>
        <button class="btn btn-big sg-bank" data-action="sess-bank"><i class="ti ti-pig-money" aria-hidden="true"></i> BANK IT — I'm done for today (+XP)</button>
        <button class="sg-override" data-action="sess-override">override the guard (recorded)</button>
      </div>`;
    el.classList.add("show");
    document.body.style.overflow = "hidden";
    const bankBtn = el.querySelector(".sg-bank");
    if (bankBtn) bankBtn.focus();
  }

  function closeGuard() {
    const el = document.getElementById("session-guard");
    if (el) el.classList.remove("show");
    document.body.style.overflow = "";
  }

  document.addEventListener("DOMContentLoaded", render);

  return { log, undo, bank, override, render, state, lossStreak };
})();
