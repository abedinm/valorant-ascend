/* ==========================================================================
   VALORANT ASCEND — The Range (hands-free warmup timer)
   Press start; it walks you through the warmup block phase by phase with a
   big countdown ring, auto-advancing. On completion it ticks the Daily
   "warm up" steps done and celebrates. Drift-corrected timing (timestamp
   based), pause/skip/restart, optional Web Audio phase beeps.
   ========================================================================== */

const VARANGE = (function () {
  "use strict";

  const PHASES = [
    { name: "Range — head one-taps", detail: "100 bots, Hard, no timer. One-taps to the head only.", secs: 240, icon: "ti-target" },
    { name: "Counter-strafe reps", detail: "Strafe → tap the opposite key → shoot, fully stopped. 50 clean reps.", secs: 180, icon: "ti-arrows-horizontal" },
    { name: "Deathmatch", detail: "One game. Crosshair at head height + counter-strafe. Ignore the score.", secs: 480, icon: "ti-crosshair" },
    { name: "Aim trainer (optional)", detail: "Gridshot ×2 + Spidershot — or Kovaak's 1wall6targets ×2.", secs: 300, icon: "ti-device-gamepad-2" }
  ];

  let idx = 0, remaining = 0, endAt = 0, running = false, raf = 0, audio = null;

  function totalSecs() { return PHASES.reduce((a, p) => a + p.secs, 0); }
  function fmt(s) {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function beep(freq, dur) {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = freq; o.type = "sine";
      g.gain.setValueAtTime(0.001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + dur);
    } catch (e) { /* audio optional */ }
  }

  function open() {
    idx = 0;
    remaining = PHASES[0].secs;
    running = false;
    let el = document.getElementById("range-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "range-modal";
      el.className = "modal";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-label", "Warmup timer");
      document.body.appendChild(el);
      el.addEventListener("click", onClick);
    }
    el.classList.add("open");
    document.body.style.overflow = "hidden";
    render();
  }

  function close() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    const el = document.getElementById("range-modal");
    if (el) el.classList.remove("open");
    document.body.style.overflow = "";
  }

  function onClick(e) {
    const a = e.target.closest("[data-range]");
    if (e.target.id === "range-modal") return close();
    if (!a) return;
    const act = a.dataset.range;
    if (act === "close") close();
    else if (act === "toggle") toggle();
    else if (act === "skip") skip();
    else if (act === "restart") { idx = 0; remaining = PHASES[0].secs; running = false; render(); }
  }

  function toggle() {
    running = !running;
    if (running) { endAt = performance.now() + remaining * 1000; beep(660, 0.12); loop(); }
    else if (raf) cancelAnimationFrame(raf);
    render();
  }

  function skip() {
    if (idx < PHASES.length - 1) { idx++; remaining = PHASES[idx].secs; if (running) endAt = performance.now() + remaining * 1000; render(); }
    else finish();
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    remaining = (endAt - performance.now()) / 1000;
    if (remaining <= 0) {
      if (idx < PHASES.length - 1) {
        idx++; remaining = PHASES[idx].secs; endAt = performance.now() + remaining * 1000;
        beep(880, 0.18);
      } else { finish(); return; }
    }
    paintTime();
  }

  function finish() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    beep(1046, 0.3);
    /* mark the Daily warmup steps done */
    if (typeof Store !== "undefined" && Store.setDayFlowItem) {
      Store.setDayFlowItem("w_drills", true);
      Store.setDayFlowItem("w_dm", true);
    }
    if (window.VAFX) window.VAFX.confetti();
    const el = document.getElementById("range-modal");
    if (el) {
      el.querySelector(".range-card").innerHTML = `
        <div class="range-done">
          <i class="ti ti-flame-off" aria-hidden="true"></i>
          <h2>YOU'RE WARM</h2>
          <p>Drills done, hands online. Now queue your block — Reyna, counted entries, log the pips.</p>
          <button class="btn btn-big" data-range="close"><i class="ti ti-check"></i> Let's go</button>
        </div>`;
    }
    if (typeof window.__rangeDone === "function") window.__rangeDone();
  }

  function paintTime() {
    const t = document.getElementById("range-time");
    if (t) t.textContent = fmt(remaining);
    const ring = document.getElementById("range-ring-fill");
    if (ring) {
      const p = PHASES[idx];
      const frac = Math.max(0, Math.min(1, remaining / p.secs));
      const C = 2 * Math.PI * 130;
      ring.style.strokeDashoffset = String(C * (1 - frac));
    }
  }

  function render() {
    const el = document.getElementById("range-modal");
    if (!el) return;
    const p = PHASES[idx];
    const next = PHASES[idx + 1];
    const C = 2 * Math.PI * 130;
    el.innerHTML = `
      <div class="range-card">
        <button class="modal-x" data-range="close" aria-label="Close warmup timer"><i class="ti ti-x"></i></button>
        <p class="range-kicker">WARMUP · PHASE ${idx + 1} OF ${PHASES.length}</p>
        <div class="range-ring-wrap">
          <svg viewBox="0 0 300 300" class="range-ring" aria-hidden="true">
            <circle cx="150" cy="150" r="130" class="range-ring-track"></circle>
            <circle id="range-ring-fill" cx="150" cy="150" r="130" class="range-ring-fill"
              stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - remaining / p.secs)).toFixed(1)}"
              transform="rotate(-90 150 150)"></circle>
          </svg>
          <div class="range-center">
            <i class="ti ${p.icon} range-phase-ico" aria-hidden="true"></i>
            <span id="range-time" class="range-time">${fmt(remaining)}</span>
          </div>
        </div>
        <h2 class="range-phase">${p.name}</h2>
        <p class="range-detail">${p.detail}</p>
        <div class="range-dots">
          ${PHASES.map((_, i) => `<span class="range-dot ${i < idx ? "done" : i === idx ? "cur" : ""}"></span>`).join("")}
        </div>
        <div class="range-controls">
          <button class="btn btn-big" data-range="toggle">
            <i class="ti ${running ? "ti-player-pause" : "ti-player-play"}"></i> ${running ? "Pause" : (remaining < p.secs ? "Resume" : "Start")}
          </button>
          <button class="btn btn-ghost" data-range="skip" aria-label="Skip phase"><i class="ti ti-player-skip-forward"></i> Skip</button>
          <button class="btn btn-ghost" data-range="restart" aria-label="Restart"><i class="ti ti-refresh"></i></button>
        </div>
        ${next ? `<p class="range-next">Next: ${next.name} · ${fmt(next.secs)}</p>` : `<p class="range-next">Last phase — then you're warm.</p>`}
      </div>`;
  }

  return { open, close };
})();
