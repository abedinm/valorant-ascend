/* ==========================================================================
   VALORANT ASCEND — Mechanics Lab (VAMECH)
   Trains aim + crosshair placement + game sense against REALISTIC targets
   pulled from real ranked benchmarks, not aim-trainer/highlight myths.
   Reads the player's real HS% / KD / ADR from the cached match history.
   ========================================================================== */

(function () {
  "use strict";

  /* honest ranked HS% bands — sustained comp games, not DM/aim-trainer.
     Sources: aggregate community/tracker data on real match headshot rates. */
  const HS_BANDS = [
    { rank: "Iron / Bronze", lo: 12, hi: 16 },
    { rank: "Silver",        lo: 15, hi: 18 },
    { rank: "Gold",          lo: 16, hi: 19 },
    { rank: "Platinum",      lo: 18, hi: 21 },
    { rank: "Diamond",       lo: 19, hi: 23 },
    { rank: "Immortal+",     lo: 22, hi: 27 },
    { rank: "Radiant / Pro", lo: 23, hi: 28 }
  ];

  /* daily pre-ranked routine — fixed drills, ~25-30 min. Each is checkable
     and resets every day (own storage key, independent of the Daily flow). */
  const DRILLS = [
    { id: "aim", min: 10, title: "Aim trainer — 10 min",
      body: "Aim Lab or Kovaak's, SAME 3 tasks daily so the score is comparable: Gridshot (click accuracy), Spidershot (target switching), one flick task. Log the score. Only rule: beat yesterday by a little.",
      metric: "Write today's Gridshot score in your head. Up or down vs yesterday?" },
    { id: "range", min: 5, title: "Range — head level only",
      body: "Open Range, 100 bots on HARD. One-taps and short bursts only — no spraying. Crosshair pinned at HEAD height the entire time. Watch the Range HS%: that's your clean-conditions ceiling.",
      metric: "Range HS% today: aim to creep it toward 30%+ (range is easier than comp)." },
    { id: "dm", min: 10, title: "1 Deathmatch — placement only",
      body: "One DM. Ignore your placement/K/D completely. ONE goal: was your crosshair at head height before you saw them, and was your FIRST bullet on target? That's it. First-bullet accuracy > spray-down kills.",
      metric: "Rough count: how many kills started from a pre-aimed head-height crosshair?" },
    { id: "placement", min: 0, title: "Placement law — 1 ranked game",
      body: "For one whole game, one conscious job at every corner: crosshair already at head height, pre-aimed at where the head will pop, before you swing. You're not flicking up — they walk into it.",
      metric: "Did you catch yourself crosshair-on-the-floor? Fewer times = winning." }
  ];

  /* one game-sense focus per day, rotated — bronze game sense is an
     information-usage gap, fixed one habit at a time, never all at once. */
  const SENSE = [
    { t: "Minimap discipline", d: "Flick your eyes to the minimap every few seconds — after every kill, every corner, every reload. You have Bronze game sense because you're not reading the free information already on your screen." },
    { t: "Trade, don't solo", d: "Never fight alone. Stand where you can shoot the enemy who just killed your teammate. Two of you on one angle wins the round; one hero peek loses it." },
    { t: "Stop over-peeking", d: "You cleared that angle 3 seconds ago and nobody rotated? Don't re-peek it for no reason. Most Bronze deaths are free deaths to angles you already knew were empty or held." },
    { t: "Use sound", d: "Stop, hold still, LISTEN before you move. Footsteps, reloads, abilities, spike defuse — the round is narrated to you if you shut up and listen. Bronze plays deaf." },
    { t: "Post-plant is a clock", d: "Spike planted, you're attacking: you don't need kills, you need TIME. Play for the clock, hold angles from safety, let them walk into you. Defending: you need info fast — don't wait." },
    { t: "Default, don't force", d: "Not every round is a play. Take map control slowly, trade info for space, and only commit to a site when you actually know where people are." },
    { t: "Economy awareness", d: "Check your team's money. Save together, buy together. A half-buy where two people force is a thrown round. Eco discipline wins Bronze/Silver by itself." }
  ];

  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  /* real HS% average across cached comp matches (never fabricated) */
  function realHs() {
    const cache = Store.getApiCache();
    if (!cache || !cache.matches || !cache.matches.length) return null;
    const vals = cache.matches.map((m) => m.hsPct).filter((v) => typeof v === "number");
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  function nextTarget(hs) {
    if (hs == null) return { now: 18, next: 21, label: "Silver → Gold" };
    if (hs < 16) return { now: 18, next: 21, label: "into Silver mechanics" };
    if (hs < 18) return { now: 21, next: 24, label: "into Gold/Plat mechanics" };
    if (hs < 21) return { now: 24, next: 26, label: "into Diamond mechanics" };
    return { now: 26, next: 28, label: "Immortal+ territory — you're not Bronze anymore" };
  }

  function todayKey() { return "mech:" + Store.todayKey(); }
  function getDone() { return Store.get(todayKey(), {}); }
  function setDone(id, v) {
    const all = Store.get("va_mechDays", {});
    const t = Store.todayKey();
    if (!all[t]) all[t] = {};
    if (v) all[t][id] = true; else delete all[t][id];
    Store.set("va_mechDays", all);
    Store.set(todayKey(), all[t]);
  }
  function doneToday() {
    const all = Store.get("va_mechDays", {});
    return all[Store.todayKey()] || {};
  }
  function senseOfDay() {
    const epoch = Math.floor(Date.parse(Store.todayKey() + "T00:00:00Z") / 86400000);
    return SENSE[((epoch % SENSE.length) + SENSE.length) % SENSE.length];
  }

  function render() {
    const el = document.getElementById("view-mechanics");
    if (!el) return;
    const hs = realHs();
    const tgt = nextTarget(hs);
    const done = doneToday();
    const sense = senseOfDay();
    const doneCount = DRILLS.filter((d) => done[d.id]).length;

    /* HS ladder with the player's real position marked */
    const ladder = HS_BANDS.map((b) => {
      const here = hs != null && hs >= b.lo && hs <= b.hi;
      return `<div class="hs-band ${here ? "here" : ""}">
        <span class="hs-rank">${esc(b.rank)}</span>
        <span class="hs-range">${b.lo}–${b.hi}%</span>
        ${here ? '<span class="hs-you">◄ you</span>' : ""}
      </div>`;
    }).join("");

    el.innerHTML = `
      <div class="view-head">
        <h1><i class="ti ti-crosshair"></i> Mechanics Lab</h1>
        <p class="view-sub">Real targets, not aim-lab myths. You raise headshots by
        <b>crosshair placement</b>, not flicks — train the easy 80%, the reflex 20% follows.</p>
      </div>

      <div class="mech-target">
        <div class="mech-target-now">
          <div class="mt-label">YOUR REAL HS%</div>
          <div class="mt-val">${hs != null ? hs + "%" : "—"}</div>
          <div class="mt-sub">${hs != null ? "avg over " + (Store.getApiCache().matches.length) + " matches" : "connect account in Intel"}</div>
        </div>
        <div class="mech-target-arrow"><i class="ti ti-arrow-right"></i></div>
        <div class="mech-target-next">
          <div class="mt-label">NEXT MILESTONE</div>
          <div class="mt-val teal">${tgt.now}%</div>
          <div class="mt-sub">${esc(tgt.label)} · ceiling ~${tgt.next}%</div>
        </div>
      </div>
      <p class="mech-myth"><i class="ti ti-alert-triangle"></i> <b>The 40–50% target is a myth.</b>
      Radiant pros sit ~22–28% in real ranked games. A steady <b>22%</b> means your mechanics are
      Diamond-level. Chase that, not the highlight-reel number.</p>

      <div class="hs-ladder">${ladder}</div>

      <div class="mech-routine">
        <div class="mr-head">
          <h2><i class="ti ti-barbell"></i> Today's mechanics routine</h2>
          <span class="mr-count ${doneCount === DRILLS.length ? "full" : ""}">${doneCount}/${DRILLS.length}</span>
        </div>
        ${DRILLS.map((d) => {
          const on = !!done[d.id];
          return `<button class="mech-drill ${on ? "done" : ""}" data-action="mech-toggle" data-id="${d.id}">
            <span class="md-check"><i class="ti ti-${on ? "circle-check-filled" : "circle"}"></i></span>
            <span class="md-body">
              <span class="md-title">${esc(d.title)}${d.min ? ` <em>~${d.min}m</em>` : ""}</span>
              <span class="md-desc">${esc(d.body)}</span>
              <span class="md-metric"><i class="ti ti-chart-line"></i> ${esc(d.metric)}</span>
            </span>
          </button>`;
        }).join("")}
      </div>

      <div class="mech-sense">
        <div class="ms-tag">TODAY'S GAME-SENSE FOCUS</div>
        <div class="ms-title">${esc(sense.t)}</div>
        <div class="ms-desc">${esc(sense.d)}</div>
        <div class="ms-note">One habit today. Not all seven. Rotates daily — master one, it sticks.</div>
      </div>

      <div class="mech-law">
        <div class="ml-tag"><i class="ti ti-scale"></i> THE PLACEMENT LAW</div>
        <p>Crosshair at <b>head height</b>, always. <b>Pre-aim</b> the angle before you peek.
        The enemy walks into a crosshair already on their head — you barely move. That single habit
        is worth more HS% than a month of flick drills.</p>
      </div>
    `;
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action='mech-toggle']");
    if (!t) return;
    const id = t.dataset.id;
    const done = doneToday();
    setDone(id, !done[id]);
    if (typeof VAGAME !== "undefined" && VAGAME.evaluate) { try { VAGAME.evaluate(); } catch (err) {} }
    render();
  });

  window.VAMECH = { render, realHs };
})();
