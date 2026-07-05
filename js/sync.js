/* ==========================================================================
   VALORANT ASCEND — server sync layer
   Mirrors progress (all va_* keys except the API key) to /api/state so the
   same account works from any device. localStorage stays the source of
   truth offline; newest updatedAt wins on boot. Degrades silently when the
   backend is absent (static hosting / file://).
   ========================================================================== */

(function () {
  "use strict";

  var EXCLUDE = { va_api: true, va_profiles: true, va_apiCacheMap: true, va_apiCache: true }; // keys + device-local caches (incl. legacy) never sync
  var TS_KEY = "va_updatedAt";
  var pushTimer = 0;
  var available = null;                     // null = unknown, false = no backend

  function nowIso() { return new Date().toISOString(); }

  function snapshot() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf("va_") === 0 && !EXCLUDE[k] && k !== TS_KEY) {
        data[k] = localStorage.getItem(k);
      }
    }
    return { updatedAt: localStorage.getItem(TS_KEY) || "1970-01-01", data: data };
  }

  function apply(state) {
    if (!state || !state.data) return;
    Object.keys(state.data).forEach(function (k) {
      /* EXCLUDE applies on the way in too — a stale server snapshot must
         never resurrect device-local keys (API caches, credentials) */
      if (k.indexOf("va_") === 0 && !EXCLUDE[k]) {
        localStorage.setItem(k, state.data[k]);
      }
    });
    localStorage.setItem(TS_KEY, state.updatedAt || nowIso());
  }

  function setStatus(text, ok) {
    var el = document.getElementById("sync-status");
    if (el) {
      el.textContent = text;
      el.className = "sync-status " + (ok ? "ok" : "off");
    }
  }

  async function push() {
    if (available === false) return;
    try {
      var res = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot())
      });
      if (res.status === 401) { location.reload(); return; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      available = true;
      setStatus("Synced " + new Date().toLocaleTimeString(), true);
    } catch (e) {
      available = available === true ? true : false;
      setStatus("Local only", false);
    }
  }

  function schedule() {
    localStorage.setItem(TS_KEY, nowIso());
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 1500);
  }

  async function pull() {
    try {
      var res = await fetch("/api/state");
      if (res.status === 401) { location.reload(); return; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      var server = await res.json();
      available = true;
      var localTs = localStorage.getItem(TS_KEY) || "1970-01-01";
      var serverTs = (server && server.updatedAt) || "1970-01-01";
      if (serverTs > localTs && server.data && Object.keys(server.data).length) {
        apply(server);
        /* reload once so every view re-renders from the newer state */
        if (!sessionStorage.getItem("va_justSynced")) {
          sessionStorage.setItem("va_justSynced", "1");
          location.reload();
          return;
        }
      } else if (localTs > serverTs) {
        push();
      }
      sessionStorage.removeItem("va_justSynced");
      setStatus("Synced " + new Date().toLocaleTimeString(), true);
    } catch (e) {
      available = false;
      setStatus("Local only", false);
    }
  }

  /* wrap Store.set so every persisted change schedules a push */
  if (typeof Store !== "undefined") {
    var origSet = Store.set.bind(Store);
    Store.set = function (key, value) {
      origSet(key, value);
      schedule();
    };
    var origReset = Store.resetAll.bind(Store);
    Store.resetAll = function () {
      origReset();
      schedule();
    };
  }

  async function logout() {
    try { await fetch("/auth/logout", { method: "POST" }); } catch (e) {}
    location.reload();
  }

  document.addEventListener("DOMContentLoaded", function () {
    pull();
    var out = document.getElementById("logout-link");
    if (out) out.addEventListener("click", function (e) { e.preventDefault(); logout(); });
    /* hide the sign-out link when there's no gate */
    fetch("/auth/status").then(function (r) { return r.json(); }).then(function (s) {
      if (out && !s.auth) out.style.display = "none";
    }).catch(function () {
      if (out) out.style.display = "none";
    });
  });

  window.VASYNC = { push: push, pull: pull };
})();
