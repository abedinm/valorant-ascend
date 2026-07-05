/* ==========================================================================
   VALORANT ASCEND — App
   Renders all views from COURSE + Store. Vanilla JS, no framework.
   Loaded after data.js and storage.js (plain script tags, shared globals).
   ========================================================================== */

(function () {
  "use strict";

  const VIEWS = ["dashboard", "modules", "daily", "roadmap", "intel", "schedule"];
  let pathwayMounted = false;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    wireNav();
    wireGlobalClicks();
    wireTilt();
    wireShortcuts();
    renderAll();
    switchView(Store.getView(), false);
    setTimeout(autoRefresh, 800);
  }

  /* ---------- keyboard shortcuts (skipped while typing) ---------- */
  function wireShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const map = { "1": "dashboard", "2": "modules", "3": "daily", "4": "roadmap", "5": "intel", "6": "schedule" };
      if (map[e.key]) { switchView(map[e.key], true); return; }
      if (e.key === "t" || e.key === "T") openTilt();
      if (e.key === "r" || e.key === "R") intelRefresh(true);
    });
  }

  /* ---------- data export (never includes the API key) ---------- */
  function exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf("va_") === 0 && k !== "va_api" && k !== "va_profiles") {
        data[k] = localStorage.getItem(k);
      }
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "valorant-ascend-backup-" + Store.todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function renderAll() {
    renderIdentity();
    renderDashboard();
    renderModules();
    renderDaily();
    renderRoadmap();
    renderIntel();
    renderSchedule();
  }

  /* ---------- navigation ---------- */
  function wireNav() {
    $$("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view, true));
    });
  }

  function switchView(view, persist) {
    if (!VIEWS.includes(view)) view = "dashboard";
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    $$(".nav-link").forEach((l) => {
      const cur = l.dataset.view === view;
      l.classList.toggle("active", cur);
      if (cur) l.setAttribute("aria-current", "page");
      else l.removeAttribute("aria-current");
    });
    if (persist) Store.setView(view);
    if (view === "roadmap") setTimeout(mountPathway, 60);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- account-dedication helpers ---------- */
  function acctData() {
    const cache = Store.getApiCache();
    if (!cache) return null;
    return { cache, m: VAPI.metrics(cache) };
  }

  function tierToStage(tier) {
    const t = (tier || "").toLowerCase();
    if (t.indexOf("silver 3") === 0) return "s3";
    if (t.indexOf("silver") === 0) return "s2";       /* Silver 1-2 -> start */
    if (t.indexOf("iron") === 0 || t.indexOf("bronze") === 0) return "s2";
    if (t.indexOf("gold 1") === 0) return "g1";
    if (t.indexOf("gold 2") === 0) return "g2";
    if (t.indexOf("gold 3") === 0) return "g3";
    if (t.indexOf("platinum 1") === 0) return "p1";
    if (t.indexOf("platinum 2") === 0) return "p2";
    if (t.indexOf("platinum 3") === 0) return "p3";
    if (t.indexOf("diamond") === 0 || t.indexOf("ascendant") === 0 ||
        t.indexOf("immortal") === 0 || t.indexOf("radiant") === 0) return "d1";
    return null;
  }

  function renderIdentity() {
    const el = $("#topbar-id");
    if (!el) return;
    const a = acctData();
    if (!a) { el.style.display = "none"; return; }
    const acc = a.cache.account, mmr = a.cache.mmr;
    el.style.display = "";
    el.innerHTML = `
      ${acc.card ? `<img src="${acc.card}" alt="">` : ""}
      <span class="tid-name">${escapeHtml(acc.name)}<small>#${escapeHtml(acc.tag)}</small></span>
      <span class="tid-tier">${escapeHtml(mmr.tier)}</span>`;
    el.onclick = () => switchView("intel", true);
  }

  /* ---------- SVG progress ring ---------- */
  function ring(pct, size, sub) {
    const r = size / 2 - 12;
    const c = 2 * Math.PI * r;
    const off = c * (1 - pct / 100);
    const mid = size / 2;
    return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${pct} percent complete">
      <circle class="ring-track" cx="${mid}" cy="${mid}" r="${r}"></circle>
      <circle class="ring-fill" cx="${mid}" cy="${mid}" r="${r}"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        transform="rotate(-90 ${mid} ${mid})"></circle>
      <text class="ring-pct" x="50%" y="48%">${pct}%</text>
      <text class="ring-sub" x="50%" y="64%">${sub}</text>
    </svg>`;
  }

  function bar(pct, accent) {
    return `<div class="bar"><span class="bar-fill ${accent ? "accent-" + accent : ""}" style="width:${pct}%"></span></div>`;
  }

  /* ===================================================================
     DASHBOARD
     =================================================================== */
  function renderDashboard() {
    const el = $("#view-dashboard");
    const ov = Store.overallProgress(COURSE.modules);
    const streak = Store.goalStreak();
    const days = Store.daysLogged();
    const games = Store.totalGames();
    const modsDone = COURSE.modules.filter((m) => Store.moduleProgress(m).pct === 100).length;
    const today = Store.getDay(Store.todayKey());
    const sensOk = Store.sensConfirmed();
    const rank = Store.getRank();
    const rankIdx = COURSE.roadmap.findIndex((r) => r.id === rank);
    const rankPct = Math.round((rankIdx / (COURSE.roadmap.length - 1)) * 100);

    const a0 = acctData();
    const heroName = a0 ? a0.cache.account.name.toUpperCase() : "OPERATOR";
    el.innerHTML = `
      <header class="page-head">
        <div>
          <p class="eyebrow">Mission // ${a0 ? escapeHtml(a0.cache.mmr.tier) : "Silver"} to Diamond</p>
          <h1 class="page-title">WELCOME BACK, ${escapeHtml(heroName)}</h1>
          ${coachLine(a0)}
        </div>
        <button class="btn btn-ghost" data-action="tilt-open"><i class="ti ti-alert-triangle"></i> Tilt check</button>
      </header>

      ${acctBanner()}
      ${!sensOk ? `<div class="alert">
        <i class="ti ti-settings-bolt"></i>
        <div><strong>Lock your sens first.</strong> You haven't confirmed 800 DPI / 0.375 (300 eDPI).
        Open <a href="#" data-action="goto-aim">Aim Mechanics</a> and confirm it. Then never change it.</div>
      </div>` : ""}

      <section class="rank-strip card">
        <div class="rank-strip-head">
          <span>Rank path</span>
          <span class="rank-now">You are here: <strong>${COURSE.roadmap[rankIdx].tier}</strong></span>
        </div>
        <div class="rank-track">
          ${COURSE.roadmap.map((r, i) => `
            <div class="rank-pip ${i <= rankIdx ? "reached" : ""} ${r.id === rank ? "current" : ""}">
              <span class="rank-dot" style="--c:${r.color}"></span>
              <span class="rank-label">${r.tier}</span>
            </div>`).join("")}
          <div class="rank-line"><span style="width:${rankPct}%"></span></div>
        </div>
      </section>

      <div class="dash-grid">
        <section class="card ring-card">
          <h2 class="card-h">Course completion</h2>
          ${ring(ov.pct, 180, ov.done + " / " + ov.total)}
          <p class="muted center">checklist habits locked in</p>
        </section>

        <div class="stat-grid">
          ${stat("ti-flame", streak, "Goal-hit streak", "days")}
          ${stat("ti-calendar-check", days, "Days logged", "")}
          ${stat("ti-stack-2", modsDone + "/" + COURSE.modules.length, "Modules complete", "")}
          ${stat("ti-target-arrow", games, "Games logged", "")}
        </div>
      </div>

      <section class="card focus-card">
        <h2 class="card-h"><i class="ti ti-bookmark"></i> Today's focus goal</h2>
        ${today && today.focus
          ? `<p class="focus-now">"${escapeHtml(today.focus)}"</p>
             <p class="muted">${today.games || 0} game(s) &middot; ${today.fd || 0} first bloods ${today.hit ? '<span class="tag tag-ok">goal hit</span>' : '<span class="tag tag-pending">in progress</span>'}</p>`
          : `<p class="muted">No focus goal set today. One goal — not RR.</p>`}
        <button class="btn" data-action="goto-daily">${today && today.focus ? "Update today" : "Set today's goal"} <i class="ti ti-arrow-right"></i></button>
      </section>

      <section class="card">
        <h2 class="card-h"><i class="ti ti-list-check"></i> Module progress</h2>
        <div class="modprog">
          ${COURSE.modules.map((m) => {
            const p = Store.moduleProgress(m);
            return `<button class="modprog-row" data-action="goto-module" data-id="${m.id}">
              <span class="modprog-icon accent-${m.accent}"><i class="ti ${m.icon}"></i></span>
              <span class="modprog-name">${m.no} &middot; ${m.title}</span>
              <span class="modprog-bar">${bar(p.pct, m.accent)}</span>
              <span class="modprog-pct">${p.done}/${p.total}</span>
            </button>`;
          }).join("")}
        </div>
      </section>

      ${typeof VAGAME !== "undefined" && VAGAME.questCard ? VAGAME.questCard() : ""}
      ${typeof VAGAME !== "undefined" ? VAGAME.dashboardCard() : ""}
      ${typeof VAGAME !== "undefined" ? VAGAME.badgeWall() : ""}

      <section class="card creed-card">
        <h2 class="card-h"><i class="ti ti-shield-bolt"></i> The Creed (non-negotiables)</h2>
        <ul class="creed">
          ${COURSE.creed.map((c) => `<li><i class="ti ti-point-filled"></i><span>${c}</span></li>`).join("")}
        </ul>
      </section>
    `;
    if (typeof VAGAME !== "undefined") VAGAME.evaluate();
  }

  function coachLine(a) {
    let text;
    if (!a || !a.m) {
      text = "Connect your account in Intel and this dashboard starts coaching from your real games.";
    } else {
      const m = a.m;
      if (m.mainPct < 100) {
        text = `The lock is broken: only ${m.mainPct}% of your last ${m.games} games were on ${escapeHtml(COURSE.student.agent)}. One agent. That was the deal.`;
      } else if (Number(m.avgDeaths) >= 13) {
        text = `${m.avgDeaths} deaths a game is the leak. Under 13 tonight — trade cover on every fight.`;
      } else if (m.winRate <= 50) {
        text = `${m.winRate}% win rate — right at the line. The gates break it: deaths under 13, entries counted, stop-loss honored.`;
      } else if (m.openingPositive === false) {
        text = `Winning record — now win the openings: ${m.avgFb} FB vs ${m.avgFd} FD. Leer, count, swing.`;
      } else {
        text = `${m.winRate}% and climbing. Nothing to fix tonight except keeping it exactly like this.`;
      }
    }
    return `<p class="coach-line"><i class="ti ti-message-bolt" aria-hidden="true"></i> ${text}</p>`;
  }

  function acctBanner() {
    const a = acctData();
    if (!a || !a.m) return "";
    const acc = a.cache.account, mmr = a.cache.mmr, m = a.m;
    const age = cacheAgeLabel(a.cache);
    const bg = acc.wide ? `style="background-image:linear-gradient(90deg, rgba(11,16,20,.92) 30%, rgba(11,16,20,.55)), url('${acc.wide}')"` : "";
    return `<section class="card acct-banner" ${bg}>
      <div class="ab-left">
        <p class="eyebrow">This system is dedicated to</p>
        <span class="ab-name">${escapeHtml(acc.name)}<small>#${escapeHtml(acc.tag)}</small></span>
        <span class="ab-tier">${escapeHtml(mmr.tier)} ${mmr.rr != null ? "&middot; " + mmr.rr + " RR" : ""}</span>
        ${age ? `<span class="ab-fresh ${age.fresh ? "ok" : "stale"}">${age.text}</span>` : ""}
      </div>
      <div class="ab-stats">
        <span class="${m.winRate > 50 ? "good" : "bad"}"><strong>${m.winRate}%</strong> win rate</span>
        <span><strong>${m.avgDeaths}</strong> avg deaths</span>
        ${m.avgFb != null ? `<span class="${m.openingPositive ? "good" : "bad"}"><strong>${m.avgFb}/${m.avgFd}</strong> FB/FD</span>` : ""}
        <span class="${m.rrNet >= 0 ? "good" : "bad"}"><strong>${m.rrNet >= 0 ? "+" : ""}${m.rrNet}</strong> net RR</span>
      </div>
      <button class="btn btn-ghost" data-action="goto-intel">Intel <i class="ti ti-arrow-right"></i></button>
    </section>`;
  }

  function stat(icon, value, label, unit) {
    return `<div class="stat">
      <i class="ti ${icon}"></i>
      <span class="stat-val">${value}<small>${unit}</small></span>
      <span class="stat-label">${label}</span>
    </div>`;
  }

  /* ===================================================================
     MODULES
     =================================================================== */
  function renderModules() {
    const el = $("#view-modules");
    const habitWeek = Store.getHabitWeek();
    el.innerHTML = `
      <header class="page-head">
        <div>
          <p class="eyebrow">Six pillars</p>
          <h1 class="page-title">Training Modules</h1>
        </div>
      </header>
      <p class="muted lead">Expand a card to read the lesson, then tick the habits as they become automatic. Progress saves itself.</p>
      <div class="modules">
        ${COURSE.modules.map((m) => moduleCard(m, habitWeek)).join("")}
      </div>
    `;
  }

  function moduleCard(m, habitWeek) {
    const p = Store.moduleProgress(m);
    const sensExtra = m.id === "aim" ? sensPanel() : "";
    const open = p.pct < 100 && m.id === "mindset" ? "open" : "";
    return `<details class="module accent-${m.accent}" id="mod-${m.id}" ${open}>
      <summary>
        <span class="mod-no">${m.no}</span>
        <span class="mod-icon"><i class="ti ${m.icon}"></i></span>
        <span class="mod-titles">
          <span class="mod-title">${m.title}</span>
          <span class="mod-tag">${m.tagline}</span>
        </span>
        <span class="mod-prog">
          <span class="mod-prog-pct">${p.pct}%</span>
          ${bar(p.pct, m.accent)}
        </span>
        <i class="ti ti-chevron-down mod-chev"></i>
      </summary>
      <div class="mod-body">
        ${sensExtra}
        ${m.sections.map(section).join("")}
        ${m.id === "gamesense" ? habitNote(habitWeek) : ""}
        <div class="checklist">
          <h3 class="checklist-h"><i class="ti ti-checkbox"></i> Habit checklist</h3>
          ${m.checklist.map((it) => checklistItem(m.id, it)).join("")}
        </div>
      </div>
    </details>`;
  }

  function section(s) {
    return `<div class="mod-section">
      <h3 class="mod-section-h">${s.heading}</h3>
      <p>${s.body}</p>
      ${s.list ? `<ul class="bullets">${s.list.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>` : ""}
    </div>`;
  }

  function habitNote(week) {
    const idx = Math.min(Math.max(week, 1), 5) - 1;
    const item = COURSE.modules.find((m) => m.id === "gamesense").checklist[idx];
    return `<div class="callout">
      <i class="ti ti-flag-bolt"></i>
      <div>Your current Habit of the Week is <strong>Week ${week}</strong>. Set it in the
      <a href="#" data-action="goto-daily">Daily</a> view. Focus only on: <em>${escapeHtml(item.text)}</em></div>
    </div>`;
  }

  function checklistItem(moduleId, it) {
    const checked = Store.isChecked(moduleId, it.id);
    return `<label class="check ${checked ? "done" : ""}" data-module="${moduleId}" data-item="${it.id}">
      <input type="checkbox" ${checked ? "checked" : ""} data-module="${moduleId}" data-item="${it.id}">
      <span class="check-box"><i class="ti ti-check"></i></span>
      <span class="check-text">${it.text}</span>
    </label>`;
  }

  function sensPanel() {
    const ok = Store.sensConfirmed();
    return `<div class="sens-panel ${ok ? "locked" : ""}">
      <div class="sens-readout">
        <div><span class="sens-k">DPI</span><span class="sens-v">800</span></div>
        <div class="sens-x">x</div>
        <div><span class="sens-k">In-game</span><span class="sens-v">0.375</span></div>
        <div class="sens-x">=</div>
        <div><span class="sens-k">eDPI</span><span class="sens-v hot">300</span></div>
      </div>
      <button class="btn ${ok ? "btn-ok" : ""}" data-action="confirm-sens">
        <i class="ti ${ok ? "ti-lock-check" : "ti-lock"}"></i>
        ${ok ? "Sens locked — do not change it" : "Confirm & lock my sens"}
      </button>
    </div>`;
  }

  /* ===================================================================
     DAILY TRACKER
     =================================================================== */
  function renderDaily() {
    const el = $("#view-daily");
    const key = Store.todayKey();
    const day = Store.getDay(key) || { focus: "", games: 0, fd: 0, hit: false };
    const week = Store.getHabitWeek();
    const gs = COURSE.modules.find((m) => m.id === "gamesense");
    const weekHabit = gs.checklist[week - 1].text;
    const goals = COURSE.focusGoals;
    const prettyDate = new Date().toLocaleDateString(undefined, {
      weekday: "long", month: "short", day: "numeric"
    });

    el.innerHTML = `
      <header class="page-head">
        <div>
          <p class="eyebrow">${prettyDate}</p>
          <h1 class="page-title">Daily Routine</h1>
        </div>
        <span class="streak-chip"><i class="ti ti-flame"></i> ${Store.goalStreak()} day streak</span>
      </header>

      <div class="daily-grid">
        <section class="card">
          <h2 class="card-h"><i class="ti ti-bookmark"></i> 1. Today's ONE focus goal</h2>
          <p class="muted">Pick one. Just one. This is what you judge the session on — not RR.</p>
          <input class="input" id="focus-input" list="focus-list" placeholder="Type or pick a focus goal"
            value="${escapeAttr(day.focus)}">
          <datalist id="focus-list">
            ${goals.map((g) => `<option value="${escapeAttr(g)}">`).join("")}
            <option value="${escapeAttr(weekHabit)}">
          </datalist>
          <div class="chips">
            ${goals.slice(0, 6).map((g) => `<button class="chip" data-action="pick-goal" data-goal="${escapeAttr(g)}">${g}</button>`).join("")}
          </div>
        </section>

        <section class="card">
          <h2 class="card-h"><i class="ti ti-device-gamepad-2"></i> 2. Games & first bloods</h2>
          <div class="counter-row">
            <span class="counter-label">Games played</span>
            <div class="counter">
              <button class="counter-btn" data-action="games-dec"><i class="ti ti-minus"></i></button>
              <span class="counter-val" id="games-val">${day.games || 0}</span>
              <button class="counter-btn" data-action="games-inc"><i class="ti ti-plus"></i></button>
            </div>
          </div>
          <div class="counter-row">
            <span class="counter-label">First bloods <i class="ti ti-swords" aria-hidden="true"></i></span>
            <div class="counter">
              <button class="counter-btn" data-action="fd-dec"><i class="ti ti-minus"></i></button>
              <span class="counter-val fd" id="fd-val">${day.fd || 0}</span>
              <button class="counter-btn" data-action="fd-inc"><i class="ti ti-plus"></i></button>
            </div>
          </div>
          <p class="muted center">Your entry KPI: 2+ first bloods per game — counted, covered, never dry.</p>
        </section>

        <section class="card">
          <h2 class="card-h"><i class="ti ti-target"></i> 3. Did you hit the focus goal?</h2>
          <div class="toggle-row">
            <button class="toggle ${day.hit ? "on" : ""}" id="hit-yes" data-action="hit" data-val="1"><i class="ti ti-check"></i> Yes, I executed it</button>
            <button class="toggle ${day.hit === false && (Store.getDay(key)) ? "off" : ""}" id="hit-no" data-action="hit" data-val="0"><i class="ti ti-x"></i> Not today</button>
          </div>
          <p class="muted center">Goal hit = streak +1. Missing it is data, not failure — feed it into VOD review.</p>
        </section>
      </div>

      ${dailyPullBanner()}
      <div class="save-row">
        <button class="btn btn-big" data-action="save-day"><i class="ti ti-device-floppy"></i> Save today's log</button>
        <span class="save-status" id="save-status" role="status" aria-live="polite"></span>
      </div>

      <section class="card">
        <h2 class="card-h"><i class="ti ti-flag-bolt"></i> Habit of the Week</h2>
        <p class="muted">Lock one game-sense habit per week. Drill only this until it's automatic, then advance.</p>
        <div class="weekpick">
          ${gs.checklist.map((it, i) => `
            <button class="week-btn ${week === i + 1 ? "active" : ""}" data-action="set-week" data-week="${i + 1}">
              <span class="week-n">W${i + 1}</span>
              <span class="week-t">${it.text}</span>
            </button>`).join("")}
        </div>
      </section>

      <section class="card">
        <h2 class="card-h"><i class="ti ti-history"></i> Last 14 days</h2>
        <div class="history">${historyDots()}</div>
        <div class="history-legend">
          <span><span class="hd hit"></span> goal hit</span>
          <span><span class="hd miss"></span> logged, missed</span>
          <span><span class="hd none"></span> no session</span>
        </div>
      </section>
    `;
  }

  function todayFromAccount() {
    const a = acctData();
    if (!a) return null;
    const today = new Date().toDateString();
    const ms = (a.cache.matches || []).filter((x) => x.startedTs && new Date(x.startedTs).toDateString() === today);
    if (!ms.length) return null;
    const withFb = ms.filter((x) => x.fb != null);
    return {
      games: ms.length,
      fb: withFb.reduce((s, x) => s + x.fb, 0),
      hasFb: withFb.length === ms.length,
      name: a.cache.account.name
    };
  }

  function dailyPullBanner() {
    const t = todayFromAccount();
    if (!t) return "";
    return `<div class="callout daily-pull">
      <i class="ti ti-cloud-download"></i>
      <div>Your account shows <strong>${t.games} competitive game(s) today</strong>${t.hasFb ? ` with <strong>${t.fb} first blood(s)</strong>` : ""} — pulled from ${escapeHtml(t.name)}'s match history.</div>
      <button class="btn btn-ghost" data-action="daily-pull">Fill counters</button>
    </div>`;
  }

  function dailyPull() {
    const t = todayFromAccount();
    if (!t) return;
    const g = $("#games-val"), f = $("#fd-val");
    if (g) g.textContent = t.games;
    if (f && t.hasFb) f.textContent = t.fb;
    flashSave("Counters filled from your account — remember to save");
  }

  function historyDots() {
    const all = Store.allDays();
    const out = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 13);
    for (let i = 0; i < 14; i++) {
      const k = Store.dateKey(cursor);
      const entry = all[k];
      let cls = "none";
      if (entry) cls = entry.hit ? "hit" : "miss";
      const dayNum = cursor.getDate();
      out.push(`<span class="hd ${cls}" title="${k}${entry ? " — " + escapeAttr(entry.focus || "") : ""}">${dayNum}</span>`);
      cursor.setDate(cursor.getDate() + 1);
    }
    return out.join("");
  }

  /* in-memory draft for today before save */
  function currentDraft() {
    const key = Store.todayKey();
    const saved = Store.getDay(key) || { focus: "", games: 0, hit: false };
    const input = $("#focus-input");
    const gv = $("#games-val");
    return {
      focus: input ? input.value.trim() : saved.focus,
      games: gv ? Number(gv.textContent) || 0 : saved.games,
      hit: saved.hit
    };
  }

  /* ===================================================================
     PATHWAY (3D) — Silver 2 -> Diamond
     =================================================================== */
  function renderRoadmap() {
    const el = $("#view-roadmap");
    el.innerHTML = `
      <header class="page-head">
        <div>
          <p class="eyebrow">Silver 2 to Diamond</p>
          <h1 class="page-title">The Pathway</h1>
        </div>
        <span class="streak-chip"><i class="ti ti-mountain"></i> ${pathwayStageLabel()}</span>
      </header>
      <p class="muted lead">Each crystal is a stage with measurable GATES — conditions over your recent games, not timers. Pass the gates, take the stage. That is the fastest honest route. Click a crystal or use the arrows.</p>
      <div class="pathway-shell card">
        <div id="pw-canvas" class="pw-canvas"></div>
        <div class="pw-controls">
          <button class="btn btn-ghost" data-action="pw-prev" aria-label="Previous stage"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
          <button class="btn btn-ghost" data-action="pw-next" aria-label="Next stage"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
        </div>
      </div>
      <div id="pw-panel"></div>
      <div id="pw-fallback"></div>
    `;
    if (pathwayMounted && typeof PATH3D !== "undefined") PATH3D.dispose();
    pathwayMounted = false;
    renderPwPanel(Store.getStage());
  }

  function pathwayStageLabel() {
    const s = COURSE.pathway.find((x) => x.id === Store.getStage());
    return s ? "You are at: " + s.tier : "";
  }

  function mountPathway() {
    const wrap = $("#pw-canvas");
    if (!wrap) return;
    if (pathwayMounted) return;
    if (typeof PATH3D !== "undefined" && PATH3D.supported()) {
      const ok = PATH3D.mount(wrap, COURSE.pathway, Store.getStage(), renderPwPanel);
      pathwayMounted = ok;
      if (ok) { $("#pw-fallback").innerHTML = ""; return; }
    }
    /* 2D fallback: render the stage list the classic way */
    $(".pathway-shell").style.display = "none";
    renderPwFallback();
  }

  function renderPwFallback() {
    const curIdx = COURSE.pathway.findIndex((s) => s.id === Store.getStage());
    $("#pw-fallback").innerHTML = `<div class="roadmap">
      ${COURSE.pathway.map((s, i) => {
        const status = i < curIdx ? "done" : i === curIdx ? "current" : "locked";
        return `<button class="rm-node ${status}" data-action="pw-select" data-id="${s.id}" style="--c:${s.color}">
          <div class="rm-marker"><i class="ti ${i < curIdx ? "ti-check" : i === curIdx ? "ti-user-bolt" : "ti-lock"}"></i></div>
          <div class="rm-body">
            <div class="rm-head">
              <span class="rm-tier">${s.tier}</span>
              ${i === curIdx ? '<span class="rm-here">You are here</span>' : ""}
              ${s.kind === "summit" ? '<span class="rm-goal">Summit</span>' : ""}
            </div>
            <p class="rm-focus">${s.focus}</p>
            <ul class="rm-points">${s.gates.map((g) => `<li><i class="ti ti-chevron-right"></i>${g}</li>`).join("")}</ul>
          </div>
        </button>`;
      }).join("")}
    </div>`;
  }

  function renderPwPanel(id) {
    const panel = $("#pw-panel");
    if (!panel) return;
    const s = COURSE.pathway.find((x) => x.id === id);
    if (!s) return;
    pwSelected = id;
    const isCurrent = Store.getStage() === id;
    const idx = COURSE.pathway.findIndex((x) => x.id === id);
    const curIdx = COURSE.pathway.findIndex((x) => x.id === Store.getStage());
    const status = idx < curIdx ? "CLEARED" : isCurrent ? "CURRENT STAGE" : "LOCKED AHEAD";
    panel.innerHTML = `
      <section class="card pw-detail" style="--c:${s.color}">
        <div class="pw-detail-head">
          <div>
            <span class="pw-status ${isCurrent ? "cur" : idx < curIdx ? "done" : ""}">${status}</span>
            <h2 class="pw-tier">${s.tier}</h2>
            <p class="pw-focus">${s.focus}</p>
          </div>
          ${!isCurrent ? `<button class="btn" data-action="pw-set-current" data-id="${s.id}"><i class="ti ti-user-bolt"></i> I am here</button>` : ""}
        </div>
        <h3 class="pw-gates-h"><i class="ti ti-lock-open"></i> Gates to advance</h3>
        <ul class="pw-gates">${s.gates.map((g) => `<li><i class="ti ti-target-arrow"></i>${g}</li>`).join("")}</ul>
        ${pwLiveCheck()}
        <div class="callout"><i class="ti ti-barbell"></i><div>${s.drill}</div></div>
      </section>
    `;
  }

  function pwLiveCheck() {
    const a = acctData();
    if (!a || !a.m) return "";
    const m = a.m;
    const liveStage = tierToStage(a.cache.mmr.tier);
    const mismatch = liveStage && liveStage !== Store.getStage();
    const row = (label, val, pass) =>
      `<span class="pwl ${pass ? "pass" : "fail"}"><i class="ti ${pass ? "ti-check" : "ti-x"}"></i> ${label}: <strong>${val}</strong></span>`;
    return `
      <div class="pw-live">
        <span class="pw-live-h"><i class="ti ti-activity"></i> Live check — ${escapeHtml(a.cache.account.name)} (last ${m.games} games)</span>
        <div class="pw-live-rows">
          ${row("Win rate", m.winRate + "% (need >50)", m.winRate > 50)}
          ${row("Avg deaths", m.avgDeaths + " (need <13)", Number(m.avgDeaths) < 13)}
          ${m.avgFb != null ? row("Opening duels", m.avgFb + " FB / " + m.avgFd + " FD", m.openingPositive) : ""}
        </div>
        ${mismatch ? `<div class="pw-mismatch">Your live rank is <strong>${escapeHtml(a.cache.mmr.tier)}</strong> but the pathway marker is elsewhere.
          <button class="btn btn-ghost" data-action="pw-sync-rank" data-id="${liveStage}">Sync marker to live rank</button></div>` : ""}
      </div>`;
  }

  /* ===================================================================
     INTEL — live account cockpit (HenrikDev API)
     =================================================================== */
  function renderIntel() {
    const el = $("#view-intel");
    const cfg = Store.getApiConfig();
    const cache = Store.getApiCache();
    el.innerHTML = `
      <header class="page-head">
        <div>
          <p class="eyebrow">Live account intel</p>
          <h1 class="page-title">Improvement Cockpit</h1>
        </div>
        ${cfg ? `<button class="btn btn-ghost" data-action="intel-edit"><i class="ti ti-settings"></i> Account</button>` : ""}
      </header>
      ${!cfg ? intelSetupForm() : `
        <div class="intel-bar card">
          <span class="intel-id"><i class="ti ti-user"></i> ${escapeHtml(cfg.name)}#${escapeHtml(cfg.tag)} <small>(${escapeHtml(cfg.region)})</small></span>
          <span class="intel-updated">${cache ? "Updated " + new Date(cache.at).toLocaleString() : "No data yet"}</span>
          <button class="btn" data-action="intel-refresh"><i class="ti ti-refresh"></i> Refresh data</button>
        </div>
        <div id="intel-status"></div>
        <div id="intel-body">${cache ? intelCockpit(cache) : `<p class="muted lead">Hit Refresh to pull your live rank and last 10 competitive games.</p>`}</div>
      `}
    `;
  }

  function intelSetupForm(prefill) {
    const p = prefill || Store.getApiConfig() || { name: "", tag: "", region: "ap", key: "" };
    return `
      <section class="card intel-setup">
        <h2 class="card-h"><i class="ti ti-plug"></i> Connect your account</h2>
        <p class="muted">Riot login isn't possible for personal apps, so this uses the HenrikDev community API. Get a free key from their Discord (discord.gg/X3GaVkX2YN — Get a Key channel), then enter your Riot ID.</p>
        <div class="intel-grid">
          <label>Riot name<input class="input" id="api-name" value="${escapeAttr(p.name)}" placeholder="ABEDIN"></label>
          <label>Tag<input class="input" id="api-tag" value="${escapeAttr(p.tag)}" placeholder="1234 (no #)"></label>
          <label>Region
            <select class="input" id="api-region">
              ${["ap", "eu", "na", "kr", "latam", "br"].map((r) => `<option value="${r}" ${p.region === r ? "selected" : ""}>${r.toUpperCase()}</option>`).join("")}
            </select>
          </label>
          <label>API key (optional if the server holds one)<input class="input" id="api-key" value="${escapeAttr(p.key)}" placeholder="HDEV-... or leave blank"></label>
        </div>
        <button class="btn btn-big" data-action="intel-save"><i class="ti ti-plug-connected"></i> Save & connect</button>
        <p class="muted intel-note">Your key is stored only in this browser (localStorage). Never share it.</p>
      </section>
    `;
  }

  function spark(arr, color, goodLow) {
    if (!arr || arr.length < 2) return "";
    const w = 120, h = 34, max = Math.max(...arr, 1), min = Math.min(...arr, 0);
    const pts = arr.map((v, i) => {
      const x = (i / (arr.length - 1)) * (w - 4) + 2;
      const y = h - 4 - ((v - min) / (max - min || 1)) * (h - 8);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function intelCockpit(cache) {
    const m = VAPI.metrics(cache);
    if (!m) return `<p class="muted lead">No competitive matches found on this account yet.</p>`;
    const acc = cache.account, mmr = cache.mmr;
    const wrClass = m.winRate > 50 ? "good" : m.winRate < 50 ? "bad" : "";
    const mainAgent = COURSE.student.agent;
    const hopWarn = m.mainPct < 100;
    return `
      <div class="intel-rank card">
        ${acc.card ? `<img class="intel-card-img" src="${acc.card}" alt="">` : ""}
        <div>
          <span class="intel-tier">${escapeHtml(mmr.tier)}</span>
          <span class="muted">${mmr.rr != null ? mmr.rr + "/100 RR" : ""} ${mmr.lastChange != null ? "&middot; last game " + (mmr.lastChange > 0 ? "+" : "") + mmr.lastChange : ""}</span>
        </div>
        <div class="intel-rank-right">
          <span class="muted">Level ${acc.level}</span>
          <span class="muted">Net RR (last ${cache.history.length}): <strong class="${m.rrNet >= 0 ? "good" : "bad"}">${m.rrNet >= 0 ? "+" : ""}${m.rrNet}</strong></span>
        </div>
      </div>

      <div class="stat-grid intel-stats">
        <div class="stat"><i class="ti ti-percentage"></i>
          <span class="stat-val ${wrClass}">${m.winRate}<small>%</small></span>
          <span class="stat-label">Win rate (${m.wins}W-${m.losses}L${m.unknownResults ? " &middot; " + m.unknownResults + " unknown excluded" : ""}) &middot; need &gt;50</span>
          ${spark(m.winTrend, "#2fe8c8")}
        </div>
        <div class="stat"><i class="ti ti-skull"></i>
          <span class="stat-val">${m.avgDeaths}</span>
          <span class="stat-label">Avg deaths &middot; target &lt;13 (${m.under13Pct}% of games)</span>
          ${spark(m.deathsTrend, "#ff4655")}
        </div>
        <div class="stat"><i class="ti ti-crosshair"></i>
          <span class="stat-val">${m.kd}</span>
          <span class="stat-label">K/D over ${m.games} games</span>
        </div>
        <div class="stat"><i class="ti ti-users"></i>
          <span class="stat-val">${m.avgAssists}</span>
          <span class="stat-label">Avg assists &middot; your util landing</span>
        </div>
        <div class="stat"><i class="ti ti-focus-2"></i>
          <span class="stat-val">${m.hsPct}<small>%</small></span>
          <span class="stat-label">Headshot rate</span>
        </div>
        <div class="stat"><i class="ti ti-mask"></i>
          <span class="stat-val ${hopWarn ? "bad" : "good"}">${m.mainPct}<small>%</small></span>
          <span class="stat-label">Games on ${escapeHtml(mainAgent)} ${hopWarn ? "&middot; AGENT-HOP DETECTED" : "&middot; locked in"}</span>
        </div>
        ${m.avgFb != null ? `<div class="stat"><i class="ti ti-swords"></i>
          <span class="stat-val ${m.openingPositive ? "good" : "bad"}">${m.avgFb}<small>/${m.avgFd}</small></span>
          <span class="stat-label">First bloods / first deaths per game &middot; entry KPI</span>
        </div>` : ""}
      </div>

      <section class="card">
        <h2 class="card-h"><i class="ti ti-list-details"></i> Last ${m.games} competitive <span class="muted intel-note" style="margin-left:auto">click a match for the full scoreboard</span></h2>
        <div class="intel-matches">
          ${cache.matches.map((x, xi) => `
            <div class="im-wrap">
              <button class="im-row ${x.won === true ? "w" : x.won === false ? "l" : "u"}" data-action="im-toggle" data-i="${xi}">
                <span class="im-res">${x.won === true ? "W" : x.won === false ? "L" : "?"}</span>
                <span class="im-map">${escapeHtml(x.map)}</span>
                <span class="im-agent ${(x.agent || "").toLowerCase() !== COURSE.student.agent.toLowerCase() ? "offagent" : ""}">${escapeHtml(x.agent)}</span>
                <span class="im-kda">${x.kills}/${x.deaths}/${x.assists}</span>
                ${x.fb != null ? `<span class="im-fb ${x.fb >= x.fd ? "good" : "bad"}">FB ${x.fb} / FD ${x.fd}</span>` : ""}
                <span class="im-extra">${x.adr} ADR &middot; ${x.hsPct}% HS</span>
                <span class="im-score">${x.roundsWon != null ? x.roundsWon + "-" + x.roundsLost : "&mdash;"}</span>
                <i class="ti ti-chevron-down im-chev"></i>
              </button>
              <div class="im-board" id="im-board-${xi}">${matchBoard(x)}</div>
            </div>`).join("")}
        </div>
        <p class="muted intel-note">Red agent = you swapped off ${escapeHtml(COURSE.student.agent)} that game. FB/FD = opening kills you got vs opening deaths you gave.</p>
      </section>
      ${storeSection(cache)}
    `;
  }

  function matchBoard(x) {
    if (!x.board || !x.board.length) return `<p class="muted intel-note">No scoreboard data for this match.</p>`;
    const side = (teamKey, label) => {
      const rows = x.board.filter((p) => p.team === teamKey);
      if (!rows.length) return "";
      return `<div class="mb-team">
        <span class="mb-team-h ${teamKey === x.myTeam ? "mine" : ""}">${label}${teamKey === x.myTeam ? " (you)" : ""}</span>
        ${rows.map((p) => `
          <div class="mb-row ${p.me ? "me" : ""}">
            <span class="mb-name">${escapeHtml(p.name)}<small>#${escapeHtml(p.tag)}</small></span>
            <span class="mb-agent">${escapeHtml(p.agent)}</span>
            <span class="mb-acs">${p.acs} ACS</span>
            <span class="mb-kda">${p.k}/${p.d}/${p.a}</span>
          </div>`).join("")}
      </div>`;
    };
    return side(x.myTeam, "Your team") + side(x.myTeam === "red" ? "blue" : "red", "Enemy team");
  }

  function storeSection(cache) {
    const s = cache.store;
    if (!s || !s.bundles || !s.bundles.length) return "";
    return `<section class="card">
      <h2 class="card-h"><i class="ti ti-building-store"></i> Featured store bundle</h2>
      ${s.bundles.map((b) => `
        <div class="store-bundle">
          ${b.price ? `<span class="store-price">${b.price} VP bundle</span>` : ""}
          <div class="store-items">
            ${b.items.map((it) => `
              <div class="store-item">
                ${it.image ? `<img src="${it.image}" alt="" loading="lazy">` : ""}
                <span class="si-name">${escapeHtml(it.name)}</span>
                ${it.price ? `<span class="si-price">${it.price} VP</span>` : ""}
              </div>`).join("")}
          </div>
        </div>`).join("")}
      <p class="muted intel-note">This is the public featured bundle. Your personal 4-skin daily shop can't be read by any legitimate third-party app — it requires your Riot login tokens, and tools that ask for those steal accounts.</p>
    </section>`;
  }

  async function intelRefresh(background) {
    const cfg = Store.getApiConfig();
    if (!cfg) return;
    const status = $("#intel-status");
    if (!background && !status) return;
    if (status) status.innerHTML = `<div class="skeleton-block" role="status" aria-label="Loading account data">
      <span class="skel skel-wide"></span><span class="skel"></span><span class="skel skel-short"></span>
    </div>`;
    try {
      const cache = await VAPI.fetchAll(cfg);
      if (status) status.innerHTML = "";
      const body = $("#intel-body");
      if (body) body.innerHTML = intelCockpit(cache);
      renderIntelBarTime(cache);
      renderIdentity();
      renderDashboard();
    } catch (e) {
      if (status) {
        status.innerHTML = `<div class="alert"><i class="ti ti-alert-triangle"></i><div><strong>Fetch failed:</strong> ${escapeHtml(e.message)}<br>
          <span class="muted">Common causes: wrong key, wrong region, or the API being briefly down. Your last cached data (if any) is still shown below.</span></div></div>`;
      }
      const cache = Store.getApiCache();
      const body = $("#intel-body");
      if (cache && body) body.innerHTML = intelCockpit(cache);
    }
  }

  /* keep data live: on boot, silently re-pull if the cache is older than 10 min */
  function autoRefresh() {
    const cfg = Store.getApiConfig();
    if (!cfg) return;
    const cache = Store.getApiCache();
    const age = cache ? Date.now() - new Date(cache.at).getTime() : Infinity;
    if (age > 10 * 60 * 1000) intelRefresh(true);
  }

  function cacheAgeLabel(cache) {
    if (!cache) return null;
    const mins = Math.round((Date.now() - new Date(cache.at).getTime()) / 60000);
    if (mins < 1) return { text: "LIVE &middot; just now", fresh: true };
    if (mins < 60) return { text: "LIVE &middot; " + mins + "m ago", fresh: mins <= 15 };
    const hrs = Math.round(mins / 60);
    if (hrs < 48) return { text: "STALE &middot; " + hrs + "h old", fresh: false };
    return { text: "STALE &middot; " + Math.round(hrs / 24) + "d old", fresh: false };
  }

  function renderIntelBarTime(cache) {
    const t = $(".intel-updated");
    if (t && cache) t.textContent = "Updated " + new Date(cache.at).toLocaleString();
  }

  /* ===================================================================
     SCHEDULE
     =================================================================== */
  function renderSchedule() {
    const el = $("#view-schedule");
    const week = Store.getHabitWeek();
    const gs = COURSE.modules.find((m) => m.id === "gamesense");
    const weekHabit = gs.checklist[week - 1].text;
    const todayName = new Date().toLocaleDateString(undefined, { weekday: "short" });
    el.innerHTML = `
      <header class="page-head">
        <div>
          <p class="eyebrow">Weekly rhythm</p>
          <h1 class="page-title">Training Schedule</h1>
        </div>
      </header>

      <div class="habit-banner">
        <i class="ti ti-flag-bolt"></i>
        <div>
          <span class="hb-label">Habit of the Week ${week}</span>
          <span class="hb-text">${escapeHtml(weekHabit)}</span>
        </div>
        <button class="btn btn-ghost" data-action="goto-daily">Change <i class="ti ti-arrow-right"></i></button>
      </div>

      <div class="week-grid">
        ${COURSE.schedule.map((d) => `
          <div class="day-col ${d.day === todayName ? "today" : ""}">
            <div class="day-head"><span class="day-name">${d.day}</span><span class="day-label">${d.label}</span></div>
            <ul class="day-plan">${d.plan.map((p) => `<li><i class="ti ti-point"></i>${p}</li>`).join("")}</ul>
          </div>`).join("")}
      </div>

      <section class="card tip-card">
        <i class="ti ti-bulb"></i>
        <div>
          <strong>Every session, no exceptions:</strong> warmup first, set ONE focus goal, log it in Daily,
          and run a tilt-check before you re-queue after a loss. The schedule is the skeleton — the habits are the muscle.
        </div>
      </section>
    `;
  }

  /* ===================================================================
     GLOBAL CLICK / CHANGE HANDLERS (event delegation)
     =================================================================== */
  function wireGlobalClicks() {
    document.addEventListener("change", (e) => {
      const cb = e.target.closest('input[type="checkbox"][data-module]');
      if (cb) {
        Store.setChecked(cb.dataset.module, cb.dataset.item, cb.checked);
        const label = cb.closest(".check");
        if (label) label.classList.toggle("done", cb.checked);
        refreshProgressUI(cb.dataset.module);
      }
    });

    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-action]");
      if (!a) return;
      const action = a.dataset.action;

      switch (action) {
        case "goto-daily": e.preventDefault(); switchView("daily", true); break;
        case "goto-aim":
          e.preventDefault();
          switchView("modules", true);
          openModule("aim");
          break;
        case "goto-module":
          switchView("modules", true);
          openModule(a.dataset.id);
          break;
        case "confirm-sens": toggleSens(); break;
        case "pick-goal": $("#focus-input").value = a.dataset.goal; flashSave("Goal selected — remember to save"); break;
        case "games-inc": bumpCounter("#games-val", 1); break;
        case "games-dec": bumpCounter("#games-val", -1); break;
        case "fd-inc": bumpCounter("#fd-val", 1); break;
        case "fd-dec": bumpCounter("#fd-val", -1); break;
        case "hit": setHit(a.dataset.val === "1"); break;
        case "save-day": saveDay(); break;
        case "set-week": setWeek(Number(a.dataset.week)); break;
        case "set-rank": setRank(a.dataset.id); break;
        case "pw-prev": pwStep(-1); break;
        case "pw-next": pwStep(1); break;
        case "pw-select": pwSelect(a.dataset.id); break;
        case "pw-set-current": pwSetCurrent(a.dataset.id); break;
        case "intel-save": intelSave(); break;
        case "intel-edit": intelEdit(); break;
        case "intel-refresh": intelRefresh(); break;
        case "goto-intel": switchView("intel", true); break;
        case "im-toggle": {
          const b = $("#im-board-" + a.dataset.i);
          if (b) b.classList.toggle("open");
          const chev = a.querySelector(".im-chev");
          if (chev) chev.classList.toggle("flip");
          break;
        }
        case "profile-switch": profileSwitch(a.dataset.i); break;
        case "profile-del": profileDel(a.dataset.i); break;
        case "pw-sync-rank": pwSetCurrent(a.dataset.id); break;
        case "daily-pull": dailyPull(); break;
        case "sess-log": if (typeof VASESSION !== "undefined") VASESSION.log(a.dataset.r); break;
        case "sess-undo": if (typeof VASESSION !== "undefined") VASESSION.undo(); break;
        case "sess-bank": if (typeof VASESSION !== "undefined") VASESSION.bank(); break;
        case "sess-override": if (typeof VASESSION !== "undefined") VASESSION.override(); break;
        case "export-data": e.preventDefault(); exportData(); break;
        case "tilt-open": openTilt(); break;
        default: break;
      }
    });
  }

  function openModule(id) {
    const d = $("#mod-" + id);
    if (!d) return;
    d.open = true;
    setTimeout(() => d.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function refreshProgressUI(moduleId) {
    /* update the module summary bar + dashboard without full re-render */
    const m = COURSE.modules.find((x) => x.id === moduleId);
    if (!m) return;
    const p = Store.moduleProgress(m);
    const det = $("#mod-" + moduleId);
    if (det) {
      const pctEl = $(".mod-prog-pct", det);
      const fill = $(".mod-prog .bar-fill", det);
      if (pctEl) pctEl.textContent = p.pct + "%";
      if (fill) fill.style.width = p.pct + "%";
    }
    if (p.pct === 100 && window.VAFX) window.VAFX.confetti();
    renderDashboard();
  }

  function toggleSens() {
    const now = !Store.sensConfirmed();
    Store.setSensConfirmed(now);
    if (now) Store.setChecked("aim", "sens", true);
    renderModules();
    openModule("aim");
    renderDashboard();
  }

  function bumpCounter(sel, delta) {
    const el = $(sel);
    if (!el) return;
    const next = Math.max(0, (Number(el.textContent) || 0) + delta);
    el.textContent = next;
  }

  function setHit(val) {
    $("#hit-yes").classList.toggle("on", val);
    $("#hit-no").classList.toggle("off", !val);
    $("#hit-yes").dataset.pending = val ? "1" : "0";
    /* store pending hit on the button for save */
    $("#view-daily").dataset.hit = val ? "1" : "0";
  }

  function saveDay() {
    const key = Store.todayKey();
    const focus = ($("#focus-input").value || "").trim();
    const games = Number($("#games-val").textContent) || 0;
    const fd = Number($("#fd-val") ? $("#fd-val").textContent : 0) || 0;
    const hitAttr = $("#view-daily").dataset.hit;
    const existing = Store.getDay(key);
    const hit = hitAttr !== undefined ? hitAttr === "1" : existing ? existing.hit : false;
    if (!focus) { flashSave("Set a focus goal first", true); return; }
    Store.saveDay(key, { focus, games, fd, hit });
    flashSave("Saved. Streak: " + Store.goalStreak() + " day(s)");
    if (hit && window.VAFX) window.VAFX.confetti();
    renderDashboard();
    /* refresh history + streak chip without losing inputs */
    const hist = $(".history");
    if (hist) hist.innerHTML = historyDots();
    const chip = $(".streak-chip");
    if (chip) chip.innerHTML = '<i class="ti ti-flame"></i> ' + Store.goalStreak() + " day streak";
  }

  function flashSave(msg, warn) {
    const s = $("#save-status");
    if (!s) return;
    s.textContent = msg;
    s.className = "save-status show" + (warn ? " warn" : "");
    clearTimeout(flashSave._t);
    flashSave._t = setTimeout(() => { s.className = "save-status"; }, 2600);
  }

  function setWeek(n) {
    Store.setHabitWeek(n);
    renderDaily();
    renderSchedule();
    renderModules();
  }

  function setRank(id) {
    Store.setRank(id);
    renderDashboard();
  }

  /* ---------- pathway actions ---------- */
  let pwSelected = null;

  function pwSelect(id) {
    pwSelected = id;
    if (pathwayMounted && typeof PATH3D !== "undefined") PATH3D.focus(id);
    else renderPwPanel(id);
  }

  function pwStep(delta) {
    const cur = pwSelected || Store.getStage();
    const idx = COURSE.pathway.findIndex((s) => s.id === cur);
    const next = Math.min(Math.max(idx + delta, 0), COURSE.pathway.length - 1);
    pwSelect(COURSE.pathway[next].id);
  }

  function pwSetCurrent(id) {
    Store.setStage(id);
    /* keep the dashboard rank strip roughly in sync */
    const map = { s2: "silver", s3: "silver", g1: "gold", g2: "gold", g3: "gold", p1: "platinum", p2: "platinum", p3: "platinum", d1: "diamond" };
    if (map[id]) Store.setRank(map[id]);
    if (pathwayMounted && typeof PATH3D !== "undefined") PATH3D.setCurrent(id);
    renderPwPanel(id);
    const chip = $("#view-roadmap .streak-chip");
    if (chip) chip.innerHTML = '<i class="ti ti-mountain"></i> ' + pathwayStageLabel();
    if ($("#pw-fallback").innerHTML) renderPwFallback();
    renderDashboard();
  }

  /* ---------- intel actions ---------- */
  function intelSave() {
    const cfg = {
      name: ($("#api-name").value || "").trim(),
      tag: ($("#api-tag").value || "").trim().replace(/^#/, ""),
      region: $("#api-region").value,
      key: ($("#api-key").value || "").trim()
    };
    if (!cfg.name || !cfg.tag) { flashIntel("Enter your Riot name and tag first."); return; }
    Store.setApiConfig(cfg);
    renderIntel();
    setTimeout(intelRefresh, 100);
  }

  function intelEdit() {
    const el = $("#view-intel");
    const head = el.querySelector(".page-head");
    el.innerHTML = "";
    if (head) el.appendChild(head);
    const profiles = Store.getProfiles();
    const active = Store.getActiveProfileIndex();
    const activeKey = profiles.length ? (profiles[active].key || "") : "";
    el.insertAdjacentHTML("beforeend", `
      ${profiles.length ? `<section class="card">
        <h2 class="card-h"><i class="ti ti-users"></i> Your accounts</h2>
        <div class="profile-list">
          ${profiles.map((p, i) => `
            <div class="profile-row ${i === active ? "active" : ""}">
              <span class="pr-name">${escapeHtml(p.name)}<small>#${escapeHtml(p.tag)}</small> <small>(${escapeHtml(p.region)})</small></span>
              ${i === active
                ? '<span class="tag tag-ok">active</span>'
                : `<button class="btn btn-ghost" data-action="profile-switch" data-i="${i}">Switch to</button>`}
              <button class="btn btn-ghost pr-del" data-action="profile-del" data-i="${i}" title="Remove" aria-label="Remove account ${escapeAttr(p.name)}"><i class="ti ti-trash" aria-hidden="true"></i></button>
            </div>`).join("")}
        </div>
        <p class="muted intel-note">Switching re-dedicates every data-driven view to that account. Training progress (checklists, streaks) is yours and stays shared.</p>
      </section>` : ""}
      ${intelSetupForm({ name: "", tag: "", region: "ap", key: activeKey })}
    `);
  }

  function profileSwitch(i) {
    Store.setActiveProfileIndex(Number(i));
    pwSelected = null;
    renderAll();
    switchView("intel", true);
    if (!Store.getApiCache()) setTimeout(intelRefresh, 100);
  }

  function profileDel(i) {
    Store.removeProfile(Number(i));
    renderAll();
    switchView("intel", true);
    intelEdit();
  }

  function flashIntel(msg) {
    const s = $("#intel-status");
    if (s) s.innerHTML = `<div class="alert"><i class="ti ti-alert-triangle"></i><div>${escapeHtml(msg)}</div></div>`;
    else alert(msg);
  }

  /* ===================================================================
     TILT CHECK MODAL
     =================================================================== */
  function wireTilt() {
    const fab = $("#tilt-fab");
    if (fab) fab.addEventListener("click", openTilt);
    const modal = $("#tilt-modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.closest("[data-action='tilt-close']")) closeTilt();
        const submit = e.target.closest("[data-action='tilt-submit']");
        if (submit) scoreTilt();
        const reset = e.target.closest("[data-action='tilt-reset']");
        if (reset) renderTiltQuestions();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTilt();
    });
    renderTiltQuestions();
  }

  function renderTiltQuestions() {
    const box = $("#tilt-body");
    if (!box) return;
    box.innerHTML = `
      <p class="tilt-intro">Be honest. Tick every warning sign that's true right now.</p>
      <div class="tilt-qs">
        ${COURSE.tiltCheck.questions.map((q, i) => `
          <label class="tilt-q">
            <input type="checkbox" data-tiltq="${i}">
            <span class="tilt-box"><i class="ti ti-check"></i></span>
            <span>${q}</span>
          </label>`).join("")}
      </div>
      <div class="tilt-actions">
        <button class="btn btn-big" data-action="tilt-submit"><i class="ti ti-scan"></i> Check me</button>
      </div>
      <div id="tilt-verdict"></div>
    `;
  }

  function scoreTilt() {
    const checked = $$('[data-tiltq]').filter((c) => c.checked).length;
    const v = $("#tilt-verdict");
    const tilted = checked >= 2;
    const data = tilted ? COURSE.tiltCheck.tilted : COURSE.tiltCheck.clear;
    v.innerHTML = `<div class="verdict ${tilted ? "bad" : "good"}">
      <div class="verdict-head"><i class="ti ${tilted ? "ti-hand-stop" : "ti-shield-check"}"></i>
        <span>${data.title}</span></div>
      <p>${data.body}</p>
      <p class="verdict-score">${checked} of ${COURSE.tiltCheck.questions.length} warning signs.</p>
      <button class="btn btn-ghost" data-action="tilt-reset"><i class="ti ti-refresh"></i> Run again</button>
    </div>`;
    v.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  let tiltReturnFocus = null;
  function openTilt() {
    const m = $("#tilt-modal");
    if (!m) return;
    tiltReturnFocus = document.activeElement;
    m.classList.add("open");
    document.body.style.overflow = "hidden";
    const first = m.querySelector("input, button");
    if (first) first.focus();
    m.addEventListener("keydown", trapTiltFocus);
  }
  function closeTilt() {
    const m = $("#tilt-modal");
    if (!m) return;
    m.classList.remove("open");
    document.body.style.overflow = "";
    m.removeEventListener("keydown", trapTiltFocus);
    if (tiltReturnFocus && tiltReturnFocus.focus) tiltReturnFocus.focus();
    tiltReturnFocus = null;
  }
  function trapTiltFocus(e) {
    if (e.key !== "Tab") return;
    const m = $("#tilt-modal");
    const focusables = m.querySelectorAll("button, input, [tabindex]:not([tabindex='-1'])");
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- utils ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }
})();
