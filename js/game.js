/* ==========================================================================
   VALORANT ASCEND — gamification layer
   Operator XP, levels, titles, achievements. XP is DERIVED from real
   progress (checklists, daily logs, streaks, stages, live stats), so it can
   never desync — redoing the math on every evaluate() is the source of truth.
   Level-ups and new badges trigger overlay celebrations.
   ========================================================================== */

const VAGAME = (function () {
  "use strict";

  const TITLES = [
    "Recruit", "Cadet", "Operator", "Specialist", "Agent",
    "Veteran", "Elite", "Commander", "Phantom", "Legend", "Radiant Mind"
  ];

  /* ---------- XP ---------- */
  function xpBreakdown() {
    const checklist = Store.get("va_checklist", {});
    const days = Store.allDays();
    const dayList = Object.values(days);
    const ticks = Object.keys(checklist).length;
    const logged = dayList.length;
    const hits = dayList.filter((d) => d.hit).length;
    const games = dayList.reduce((s, d) => s + (Number(d.games) || 0), 0);
    const modsDone = COURSE.modules.filter((m) => Store.moduleProgress(m).pct === 100).length;
    const streak = Store.goalStreak();
    const stageIdx = Math.max(COURSE.pathway.findIndex((s) => s.id === Store.getStage()), 0);
    return {
      ticks: ticks * 15,
      logged: logged * 25,
      hits: hits * 40,
      games: games * 5,
      modules: modsDone * 150,
      streak: streak * 10,
      stage: stageIdx * 200,
      sens: Store.sensConfirmed() ? 50 : 0,
      quests: Object.values(Store.get("va_quests", {})).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0) * 30,
      banks: Store.get("va_banks", 0) * 40
    };
  }

  function totalXp() {
    const b = xpBreakdown();
    return Object.values(b).reduce((a, v) => a + v, 0);
  }

  /* level curve: each level needs 120 + 60*(level-1) xp */
  function levelFromXp(xp) {
    let level = 1, need = 120, rem = xp;
    while (rem >= need) {
      rem -= need;
      level++;
      need = 120 + 60 * (level - 1);
    }
    return { level, into: rem, need, title: TITLES[Math.min(level - 1, TITLES.length - 1)] };
  }

  /* ---------- achievements ---------- */
  function defs() {
    const m = (function () {
      const c = Store.getApiCache();
      return c ? VAPI.metrics(c) : null;
    })();
    const days = Object.values(Store.allDays());
    const streak = Store.goalStreak();
    const modsDone = COURSE.modules.filter((x) => Store.moduleProgress(x).pct === 100).length;
    const maxModPct = Math.max(...COURSE.modules.map((x) => Store.moduleProgress(x).pct), 0);
    const stageIdx = Math.max(COURSE.pathway.findIndex((s) => s.id === Store.getStage()), 0);
    const clamp = (v) => Math.max(0, Math.min(1, v));
    /* prog = 0..1 partial progress toward a LOCKED badge (near-completion principle) */
    return [
      { id: "firstTick", icon: "ti-checkbox", name: "First rep", desc: "Tick your first habit", ok: Object.keys(Store.get("va_checklist", {})).length >= 1 },
      { id: "sensLock", icon: "ti-lock", name: "Locked in", desc: "Confirm your one sens", ok: Store.sensConfirmed() },
      { id: "firstLog", icon: "ti-calendar-check", name: "Day one", desc: "Log your first session", ok: days.length >= 1 },
      { id: "firstHit", icon: "ti-target-arrow", name: "Goal down", desc: "Hit a daily focus goal", ok: days.some((d) => d.hit) },
      { id: "streak3", icon: "ti-flame", name: "On fire", desc: "3-day goal streak", ok: streak >= 3, prog: clamp(streak / 3), progText: streak + "/3" },
      { id: "streak7", icon: "ti-flame", name: "Inferno", desc: "7-day goal streak", ok: streak >= 7, prog: clamp(streak / 7), progText: streak + "/7" },
      { id: "module1", icon: "ti-stack-2", name: "Pillar down", desc: "Complete any module", ok: modsDone >= 1, prog: clamp(maxModPct / 100), progText: maxModPct + "%" },
      { id: "allModules", icon: "ti-trophy", name: "Full course", desc: "Complete all 6 modules", ok: modsDone === 6, prog: clamp(modsDone / 6), progText: modsDone + "/6" },
      { id: "stage2", icon: "ti-mountain", name: "Climbing", desc: "Advance a pathway stage", ok: stageIdx >= 1 },
      { id: "gold", icon: "ti-medal", name: "Golden", desc: "Reach the Gold stages", ok: stageIdx >= 2, prog: clamp(stageIdx / 2), progText: stageIdx + "/2 stages" },
      { id: "lockHolds", icon: "ti-shield-check", name: "The lock holds", desc: "10 straight games on your main (live data)", ok: !!(m && m.games >= 10 && m.mainPct === 100), prog: m ? clamp((m.mainPct / 100) * (Math.min(m.games, 10) / 10)) : null, progText: m ? m.mainPct + "% on-main" : null },
      { id: "winning", icon: "ti-percentage", name: "Winning record", desc: "Win rate above 50% (live data)", ok: !!(m && m.winRate > 50), prog: m ? clamp(m.winRate / 51) : null, progText: m ? m.winRate + "%/51%" : null },
      { id: "opener", icon: "ti-swords", name: "Entry prodigy", desc: "Positive opening-duel record (live data)", ok: !!(m && m.openingPositive) },
      { id: "discipline", icon: "ti-heartbeat", name: "Iron discipline", desc: "Avg deaths under 13 (live data)", ok: !!(m && Number(m.avgDeaths) < 13), prog: m ? clamp(13 / Math.max(Number(m.avgDeaths), 13)) : null, progText: m ? m.avgDeaths + " avg" : null },
      { id: "walkAway", icon: "ti-pig-money", name: "The exit", desc: "Bank a session — walk away on your own terms", ok: Store.get("va_banks", 0) >= 1 },
      { id: "walk5", icon: "ti-door-exit", name: "Master of the exit", desc: "Bank 5 sessions", ok: Store.get("va_banks", 0) >= 5, prog: clamp(Store.get("va_banks", 0) / 5), progText: Store.get("va_banks", 0) + "/5" }
    ];
  }

  function unlocked() {
    return Store.get("va_achievements", {});
  }

  /* ---------- daily quests ----------
     3 quests per day, rotated deterministically by date. Evaluated ONLY
     against real matches pulled from the account (no manual claiming, no
     fake completion). Completions persist to va_quests for stable XP. */
  const QUEST_POOL = [
    { id: "play2",   icon: "ti-device-gamepad-2", name: "Show up",         desc: "Play 2+ competitive games today",        test: (t) => t.games >= 2,                          prog: (t) => Math.min(t.games, 2) + "/2" },
    { id: "win1",    icon: "ti-trophy",           name: "Take one",        desc: "Win a competitive game today",           test: (t) => t.wins >= 1,                           prog: (t) => t.wins + "/1" },
    { id: "under13", icon: "ti-heartbeat",        name: "Stay alive",      desc: "Finish a game with under 13 deaths",     test: (t) => t.under13 >= 1,                        prog: (t) => t.under13 + "/1" },
    { id: "fb2",     icon: "ti-swords",           name: "First strike",    desc: "2+ first bloods in a single game",       test: (t) => t.bestFb >= 2,                         prog: (t) => t.bestFb + "/2" },
    { id: "onmain",  icon: "ti-shield-check",     name: "The lock holds",  desc: "Every game today on " + (COURSE.student ? COURSE.student.agent : "your main"), test: (t) => t.games >= 1 && t.onMain === t.games, prog: (t) => t.onMain + "/" + Math.max(t.games, 1) },
    { id: "assist5", icon: "ti-users",            name: "Team player",     desc: "5+ assists in a single game",            test: (t) => t.bestAssists >= 5,                    prog: (t) => t.bestAssists + "/5" }
  ];

  function todayStats() {
    const cache = Store.getApiCache();
    if (!cache || !cache.matches) return null;
    const today = new Date().toDateString();
    const mainAgent = (COURSE.student ? COURSE.student.agent : "").toLowerCase();
    const ms = cache.matches.filter((x) => {
      const ts = x.startedTs || (x.started ? Date.parse(x.started) : NaN);
      return ts && !isNaN(ts) && new Date(ts).toDateString() === today;
    });
    if (!ms.length) return { games: 0, wins: 0, under13: 0, bestFb: 0, onMain: 0, bestAssists: 0 };
    return {
      games: ms.length,
      wins: ms.filter((x) => x.won === true).length,
      under13: ms.filter((x) => x.deaths < 13).length,
      bestFb: Math.max(...ms.map((x) => (x.fb != null ? x.fb : 0))),
      onMain: ms.filter((x) => (x.agent || "").toLowerCase() === mainAgent).length,
      bestAssists: Math.max(...ms.map((x) => x.assists || 0))
    };
  }

  function todaysQuests() {
    const key = Store.todayKey();
    /* deterministic rotation: hash the date string, pick 3 consecutive */
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    const start = h % QUEST_POOL.length;
    const picks = [0, 1, 2].map((i) => QUEST_POOL[(start + i * 2) % QUEST_POOL.length]);
    const seen = new Set();
    const quests = picks.filter((q) => !seen.has(q.id) && seen.add(q.id));
    while (quests.length < 3) {
      const next = QUEST_POOL.find((q) => !seen.has(q.id));
      seen.add(next.id); quests.push(next);
    }
    const t = todayStats();
    const done = Store.get("va_quests", {})[key] || [];
    return quests.map((q) => ({
      ...q,
      state: t === null ? "offline" : (done.includes(q.id) || q.test(t)) ? "done" : "open",
      progress: t ? q.prog(t) : null
    }));
  }

  function persistQuests() {
    const t = todayStats();
    if (t === null) return [];
    const key = Store.todayKey();
    const all = Store.get("va_quests", {});
    const done = all[key] || [];
    const fresh = [];
    todaysQuests().forEach((q) => {
      if (q.state === "done" && !done.includes(q.id)) {
        done.push(q.id);
        fresh.push(q);
      }
    });
    if (fresh.length) {
      all[key] = done;
      Store.set("va_quests", all);
    }
    return fresh;
  }

  function questCard() {
    const quests = todaysQuests();
    const offline = quests.length && quests[0].state === "offline";
    const doneCount = quests.filter((q) => q.state === "done").length;
    return `<section class="card quest-card">
      <h2 class="card-h"><i class="ti ti-flag-3"></i> Today's quests
        <span class="muted" style="margin-left:auto;font-size:.85rem">${offline ? "connect Intel to track" : doneCount + "/3 &middot; +30 XP each"}</span>
      </h2>
      <div class="quests">
        ${quests.map((q) => `
          <div class="quest ${q.state}">
            <span class="quest-check"><i class="ti ${q.state === "done" ? "ti-check" : q.icon}"></i></span>
            <span class="quest-body">
              <span class="quest-name">${q.name}</span>
              <span class="quest-desc">${q.desc}</span>
            </span>
            <span class="quest-prog">${q.state === "offline" ? "&mdash;" : q.state === "done" ? "+30 XP" : (q.progress || "")}</span>
          </div>`).join("")}
      </div>
      ${offline ? `<p class="muted intel-note">Quests auto-complete from your real matches — no manual claiming. Connect your account in Intel.</p>` : ""}
    </section>`;
  }

  /* ---------- evaluate: detect level-ups + new badges ---------- */
  function evaluate(celebrate) {
    const freshQuests = persistQuests(); /* before XP math so completions count */
    const xp = totalXp();
    const lv = levelFromXp(xp);
    const lastLevel = Store.get("va_level", 1);
    const store = unlocked();
    const fresh = [];
    defs().forEach((d) => {
      if (d.ok && !store[d.id]) {
        store[d.id] = new Date().toISOString();
        fresh.push(d);
      }
    });
    if (fresh.length) Store.set("va_achievements", store);
    if (lv.level !== lastLevel) Store.set("va_level", lv.level);

    if (celebrate !== false) {
      if (lv.level > lastLevel) {
        overlay("LEVEL UP", "Level " + lv.level + " — " + lv.title, "ti-military-rank");
        if (window.VAFX) window.VAFX.confetti();
      } else if (fresh.length) {
        const d = fresh[0];
        overlay("ACHIEVEMENT UNLOCKED", d.name, d.icon);
        if (window.VAFX) window.VAFX.confetti();
      } else if (freshQuests.length) {
        overlay("QUEST COMPLETE", freshQuests[0].name + " &middot; +30 XP", freshQuests[0].icon);
        if (window.VAFX) window.VAFX.confetti();
      }
    }
    renderTopbarXp(xp, lv);
    return { xp, lv, fresh };
  }

  /* ---------- UI pieces ---------- */
  function renderTopbarXp(xp, lv) {
    let bar = document.getElementById("xp-bar");
    if (!bar) return;
    const pct = Math.round((lv.into / lv.need) * 100);
    bar.innerHTML = `
      <span class="xp-level">LV ${lv.level}</span>
      <span class="xp-track"><span class="xp-fill" style="width:${pct}%"></span></span>
      <span class="xp-title">${lv.title}</span>`;
    bar.title = xp + " XP total — " + lv.into + "/" + lv.need + " to next level";
  }

  function overlay(kicker, text, icon) {
    let el = document.getElementById("game-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "game-overlay";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="go-card">
      <i class="ti ${icon}"></i>
      <span class="go-kicker">${kicker}</span>
      <span class="go-text">${text}</span>
    </div>`;
    el.classList.add("show");
    clearTimeout(overlay._t);
    overlay._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function dashboardCard() {
    const xp = totalXp();
    const lv = levelFromXp(xp);
    const pct = Math.round((lv.into / lv.need) * 100);
    /* goal gradient: surface the locked badge you're CLOSEST to */
    const store = unlocked();
    const next = defs()
      .filter((d) => !store[d.id] && !d.ok && d.prog != null && d.prog > 0)
      .sort((a, b) => b.prog - a.prog)[0];
    return `<section class="card level-card tilt3d">
      <h2 class="card-h"><i class="ti ti-military-rank"></i> Operator level</h2>
      <div class="level-row">
        <div class="level-badge"><span>${lv.level}</span></div>
        <div class="level-info">
          <span class="level-title">${lv.title}</span>
          <div class="bar"><span class="bar-fill accent-teal" style="width:${pct}%"></span></div>
          <span class="muted level-next">${lv.into} / ${lv.need} XP to level ${lv.level + 1} &middot; ${xp} total</span>
        </div>
      </div>
      ${next ? `<div class="next-unlock"><i class="ti ${next.icon}"></i>
        <span>NEXT UNLOCK: <strong>${next.name}</strong> &middot; ${next.progText || Math.round(next.prog * 100) + "%"} there</span></div>` : ""}
    </section>`;
  }

  function badgeWall() {
    const store = unlocked();
    const list = defs();
    const got = list.filter((d) => store[d.id]).length;
    return `<section class="card">
      <h2 class="card-h"><i class="ti ti-trophy"></i> Achievements <span class="muted" style="margin-left:auto;font-size:.85rem">${got}/${list.length}</span></h2>
      <div class="badges">
        ${list.map((d) => {
          const locked = !store[d.id];
          const showProg = locked && d.prog != null && d.prog > 0 && d.prog < 1;
          return `
          <div class="badge ${locked ? "locked" : "unlocked"} ${showProg ? "in-progress" : ""}" title="${d.desc}">
            <i class="ti ${d.icon}"></i>
            <span class="badge-name">${d.name}</span>
            <span class="badge-desc">${d.desc}</span>
            ${showProg ? `<span class="badge-prog"><span class="badge-prog-fill" style="width:${Math.round(d.prog * 100)}%"></span></span>
            <span class="badge-prog-text">${d.progText || Math.round(d.prog * 100) + "%"}</span>` : ""}
          </div>`;
        }).join("")}
      </div>
    </section>`;
  }

  return { evaluate, dashboardCard, badgeWall, questCard, todaysQuests, totalXp, levelFromXp };
})();
