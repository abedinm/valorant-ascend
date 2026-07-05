/* ==========================================================================
   VALORANT ASCEND — UI effects layer
   Count-up stats, 3D tilt cards, scroll reveals, confetti bursts.
   Self-healing: a MutationObserver re-applies effects after any re-render.
   ========================================================================== */

(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- count-up numbers ---------- */
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    var text = el.childNodes[0] ? el.childNodes[0].nodeValue : el.textContent;
    if (text === null) return;
    var m = String(text).trim().match(/^(\d+)(.*)$/);
    if (!m) return;
    var target = parseInt(m[1], 10), suffix = m[2] || "";
    if (reduced || target === 0) return;
    var start = null, DUR = 700;
    function step(ts) {
      if (!start) start = ts;
      var k = Math.min((ts - start) / DUR, 1);
      var eased = 1 - Math.pow(1 - k, 3);
      el.childNodes[0].nodeValue = Math.round(target * eased) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- scroll reveals ---------- */
  var io = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.08 })
    : null;

  /* ---------- 3D tilt (delegated, rAF-throttled) ---------- */
  var tiltEl = null, tiltRaf = 0;
  document.addEventListener("mousemove", function (e) {
    var t = e.target.closest ? e.target.closest(".tilt3d") : null;
    if (tiltEl && tiltEl !== t) resetTilt(tiltEl);
    tiltEl = t;
    if (!t || reduced) return;
    if (tiltRaf) return;
    tiltRaf = requestAnimationFrame(function () {
      tiltRaf = 0;
      if (!tiltEl) return;
      var r = tiltEl.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      tiltEl.style.transform =
        "perspective(700px) rotateX(" + (-py * 7).toFixed(2) + "deg) rotateY(" + (px * 9).toFixed(2) + "deg) translateY(-2px)";
    });
  }, { passive: true });
  document.addEventListener("mouseout", function (e) {
    if (tiltEl && !e.relatedTarget) resetTilt(tiltEl);
  });
  function resetTilt(el) {
    el.style.transform = "";
    if (el === tiltEl) tiltEl = null;
  }

  /* ---------- confetti ---------- */
  var confettiCanvas = null;
  function confetti() {
    if (reduced) return;
    if (!confettiCanvas) {
      confettiCanvas = document.createElement("canvas");
      confettiCanvas.className = "confetti-layer";
      document.body.appendChild(confettiCanvas);
    }
    var c = confettiCanvas, ctx = c.getContext("2d");
    c.width = window.innerWidth; c.height = window.innerHeight;
    var colors = ["#ff4655", "#2fe8c8", "#ffc24b", "#ffffff"];
    var parts = [];
    for (var i = 0; i < 120; i++) {
      parts.push({
        x: c.width / 2 + (Math.random() - 0.5) * 200,
        y: c.height * 0.35,
        vx: (Math.random() - 0.5) * 11,
        vy: -(4 + Math.random() * 9),
        w: 4 + Math.random() * 5,
        h: 6 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        life: 1
      });
    }
    var frames = 0;
    (function loop() {
      frames++;
      ctx.clearRect(0, 0, c.width, c.height);
      var alive = false;
      parts.forEach(function (p) {
        p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        p.life -= 0.008;
        if (p.life > 0 && p.y < c.height + 20) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(p.life, 0);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });
      if (alive && frames < 260) requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, c.width, c.height);
    })();
  }
  window.VAFX = { confetti: confetti };

  /* ---------- enhancer: runs after every re-render ---------- */
  var pending = 0;
  function enhance() {
    document.querySelectorAll(".stat-val").forEach(countUp);
    document.querySelectorAll(".stat, .ring-card, .focus-card").forEach(function (el) {
      el.classList.add("tilt3d");
    });
    if (io) {
      document.querySelectorAll(
        ".view.active .card:not(.in), .view.active .module:not(.in), .view.active .rm-node:not(.in), .view.active .day-col:not(.in)"
      ).forEach(function (el) {
        el.classList.add("reveal");
        io.observe(el);
      });
      /* failsafe: if IO never fires (zero-size viewport, odd embeds),
         force-reveal so content can never be stuck invisible */
      setTimeout(function () {
        document.querySelectorAll(".reveal:not(.in)").forEach(function (el) {
          el.classList.add("in");
        });
      }, 1500);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    enhance();
    var main = document.querySelector(".wrap");
    if (main && "MutationObserver" in window) {
      new MutationObserver(function () {
        clearTimeout(pending);
        pending = setTimeout(enhance, 80);
      }).observe(main, { childList: true, subtree: true });
    }
  });
})();
