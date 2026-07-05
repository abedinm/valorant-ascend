/* ==========================================================================
   VALORANT ASCEND — Storage layer
   Thin wrapper over localStorage. All progress lives here, no backend.
   ========================================================================== */

const Store = {
  KEYS: {
    checklist: "va_checklist",  // { "moduleId.itemId": true }
    daily: "va_daily",          // { "YYYY-MM-DD": {focus, games, hit} }
    habitWeek: "va_habitWeek",  // 1..5
    sens: "va_sens",            // true once confirmed
    rank: "va_rank",            // current rank id on the roadmap
    stage: "va_stage",          // current pathway stage id (s2..d1)
    api: "va_api",              // { name, tag, region, key } for HenrikDev
    apiCache: "va_apiCache",    // { at, account, mmr, matches, history }
    view: "va_view"             // last active view id
  },

  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage full / disabled — fail silently, app still runs in-session */
    }
  },

  /* ---- date helpers (local time, not UTC) ---- */
  todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  },

  dateKey(d) {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  },

  /* ---- checklist ---- */
  isChecked(moduleId, itemId) {
    const all = this.get(this.KEYS.checklist, {});
    return !!all[`${moduleId}.${itemId}`];
  },

  setChecked(moduleId, itemId, value) {
    const all = this.get(this.KEYS.checklist, {});
    const k = `${moduleId}.${itemId}`;
    if (value) all[k] = true; else delete all[k];
    this.set(this.KEYS.checklist, all);
  },

  moduleProgress(module) {
    const total = module.checklist.length;
    let done = 0;
    module.checklist.forEach((it) => {
      if (this.isChecked(module.id, it.id)) done++;
    });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  },

  overallProgress(modules) {
    let total = 0, done = 0;
    modules.forEach((m) => {
      const p = this.moduleProgress(m);
      total += p.total;
      done += p.done;
    });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  },

  /* ---- daily log ---- */
  getDay(key) {
    const all = this.get(this.KEYS.daily, {});
    return all[key] || null;
  },

  saveDay(key, data) {
    const all = this.get(this.KEYS.daily, {});
    all[key] = data;
    this.set(this.KEYS.daily, all);
  },

  allDays() {
    return this.get(this.KEYS.daily, {});
  },

  /* Goal-hit streak: consecutive days up to today where a session was
     logged AND the focus goal was hit. */
  goalStreak() {
    const all = this.allDays();
    let streak = 0;
    const cursor = new Date();
    /* allow today to be unlogged without breaking yesterday's streak */
    if (!all[this.dateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (true) {
      const entry = all[this.dateKey(cursor)];
      if (entry && entry.hit) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  },

  daysLogged() {
    return Object.keys(this.allDays()).length;
  },

  totalGames() {
    const all = this.allDays();
    return Object.values(all).reduce((sum, d) => sum + (Number(d.games) || 0), 0);
  },

  /* ---- habit of the week ---- */
  getHabitWeek() {
    return this.get(this.KEYS.habitWeek, 1);
  },
  setHabitWeek(n) {
    this.set(this.KEYS.habitWeek, n);
  },

  /* ---- current rank on the roadmap ---- */
  getRank() {
    return this.get(this.KEYS.rank, "silver");
  },
  setRank(id) {
    this.set(this.KEYS.rank, id);
  },

  /* ---- pathway stage ---- */
  getStage() {
    return this.get(this.KEYS.stage, "s2");
  },
  setStage(id) {
    this.set(this.KEYS.stage, id);
  },

  /* ---- account profiles (multi-account) ----
     va_profiles = [{name, tag, region, key}], va_activeProfile = index.
     Legacy va_api (single account) migrates to profiles[0] on first read. */
  getProfiles() {
    let list = this.get("va_profiles", null);
    if (list === null) {
      const legacy = this.get(this.KEYS.api, null);
      list = legacy ? [legacy] : [];
      if (legacy) this.set("va_profiles", list);
    }
    return list;
  },
  setProfiles(list) {
    this.set("va_profiles", list);
  },
  getActiveProfileIndex() {
    const i = this.get("va_activeProfile", 0);
    const n = this.getProfiles().length;
    return n ? Math.min(Math.max(i, 0), n - 1) : 0;
  },
  setActiveProfileIndex(i) {
    this.set("va_activeProfile", i);
  },
  profileKey(p) {
    return p ? (p.name + "#" + p.tag).toLowerCase() : "";
  },

  /* ---- API config + per-profile cache ---- */
  getApiConfig() {
    const list = this.getProfiles();
    return list.length ? list[this.getActiveProfileIndex()] : null;
  },
  setApiConfig(cfg) {
    const list = this.getProfiles();
    const key = this.profileKey(cfg);
    const idx = list.findIndex((p) => this.profileKey(p) === key);
    if (idx >= 0) { list[idx] = cfg; this.setActiveProfileIndex(idx); }
    else { list.push(cfg); this.setActiveProfileIndex(list.length - 1); }
    this.setProfiles(list);
  },
  removeProfile(index) {
    const list = this.getProfiles();
    list.splice(index, 1);
    this.setProfiles(list);
    if (this.getActiveProfileIndex() >= list.length) this.setActiveProfileIndex(0);
  },
  getApiCache() {
    const p = this.getApiConfig();
    if (!p) return null;
    const map = this.get("va_apiCacheMap", {});
    const key = this.profileKey(p);
    if (!map[key]) {
      /* one-time adoption of the pre-profiles cache (va_apiCache) so real
         account data survives the multi-account upgrade */
      const legacy = this.get(this.KEYS.apiCache, null);
      if (legacy && legacy.account &&
          this.profileKey({ name: legacy.account.name, tag: legacy.account.tag }) === key) {
        map[key] = legacy;
        this.set("va_apiCacheMap", map);
        try { localStorage.removeItem(this.KEYS.apiCache); } catch (e) {}
      }
    }
    return map[key] || null;
  },
  setApiCache(data) {
    const p = this.getApiConfig();
    if (!p) return;
    const map = this.get("va_apiCacheMap", {});
    map[this.profileKey(p)] = data;
    this.set("va_apiCacheMap", map);
  },

  /* ---- sens confirmation ---- */
  sensConfirmed() {
    return this.get(this.KEYS.sens, false);
  },
  setSensConfirmed(v) {
    this.set(this.KEYS.sens, !!v);
  },

  /* ---- view ---- */
  getView() {
    return this.get(this.KEYS.view, "dashboard");
  },
  setView(v) {
    this.set(this.KEYS.view, v);
  },

  /* ---- danger: full reset ---- */
  resetAll() {
    Object.values(this.KEYS).forEach((k) => localStorage.removeItem(k));
  }
};
