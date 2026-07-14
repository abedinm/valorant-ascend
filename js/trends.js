/* ==========================================================================
   VALORANT ASCEND — Trends (VATREND)
   Turns the climb into something you can SEE over time.
   - snapshot(cache): one stat point per day (elo/rr/hs/kd/wr), accumulates
   - card(a0): dashboard "CLIMB" card — RR movement, HS% vs target, and a
     long-term elo line once enough days exist. Pure inline SVG, no libs.
   All from real data; charts only draw what actually exists.
   ========================================================================== */

window.VATREND = (function () {
  "use strict";
  const SNAP = "va_snapshots";

  function snapshot(cache) {
    if (!cache) return;
    const day = Store.todayKey();
    const ms = cache.matches || [];
    const hsVals = ms.map((m) => m.hsPct).filter((v) => typeof v === "number");
    const hs = hsVals.length ? Math.round((hsVals.reduce((a, b) => a + b, 0) / hsVals.length) * 10) / 10 : null;
    const k = ms.reduce((a, m) => a + (m.kills || 0), 0);
    const d = ms.reduce((a, m) => a + (m.deaths || 0), 0);
    const dec = ms.filter((m) => m.won === true || m.won === false);
    const wins = dec.filter((m) => m.won).length;
    const pt = {
      date: day,
      elo: cache.mmr && cache.mmr.elo != null ? cache.mmr.elo : null,
      rr: cache.mmr && cache.mmr.rr != null ? cache.mmr.rr : null,
      tier: cache.mmr ? cache.mmr.tier : null,
      hs: hs, kd: d ? Math.round((k / d) * 100) / 100 : null,
      wr: dec.length ? Math.round((wins / dec.length) * 100) : null
    };
    const all = Store.get(SNAP, []);
    const i = all.findIndex((s) => s.date === day);
    if (i >= 0) all[i] = pt; else all.push(pt);
    if (all.length > 180) all.splice(0, all.length - 180);
    Store.set(SNAP, all);
  }

  function snaps() { return Store.get(SNAP, []); }

  /* build an SVG path from numeric values across a fixed viewBox */
  function path(vals, w, h, pad) {
    if (!vals.length) return { line: "", area: "", last: null };
    const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    const span = max - min || 1;
    const n = vals.length;
    const x = (i) => pad + (n === 1 ? (w - 2 * pad) / 2 : (i / (n - 1)) * (w - 2 * pad));
    const y = (v) => h - pad - ((v - min) / span) * (h - 2 * pad);
    let line = "", area = "";
    vals.forEach((v, i) => {
      const px = x(i).toFixed(1), py = y(v).toFixed(1);
      line += (i ? "L" : "M") + px + " " + py + " ";
    });
    area = "M" + x(0).toFixed(1) + " " + (h - pad) + " " +
      line.replace(/^M/, "L") + "L" + x(n - 1).toFixed(1) + " " + (h - pad) + " Z";
    return { line: line.trim(), area: area, x: x, y: y, min: min, max: max };
  }

  function chart(id, vals, opts) {
    opts = opts || {};
    const W = 300, H = 82, PAD = 8;
    if (!vals.length) return `<div class="tr-empty">${opts.empty || "no data yet"}</div>`;
    const p = path(vals, W, H, PAD);
    const col = opts.color || "var(--teal)";
    const grad = "g" + id;
    let target = "";
    if (opts.target != null && p.y) {
      const ty = p.y(opts.target);
      if (isFinite(ty)) target = `<line x1="${PAD}" y1="${ty.toFixed(1)}" x2="${W - PAD}" y2="${ty.toFixed(1)}"
        stroke="var(--red)" stroke-width="1" stroke-dasharray="4 4" opacity=".7"></line>
        <text x="${W - PAD}" y="${(ty - 4).toFixed(1)}" fill="var(--red)" font-size="9" text-anchor="end">${opts.targetLabel || opts.target}</text>`;
    }
    let zero = "";
    if (opts.zeroLine && p.y && p.min < 0 && p.max > 0) {
      const zy = p.y(0);
      zero = `<line x1="${PAD}" y1="${zy.toFixed(1)}" x2="${W - PAD}" y2="${zy.toFixed(1)}" stroke="var(--line-2)" stroke-width="1"></line>`;
    }
    const lastX = p.x(vals.length - 1), lastY = p.y(vals[vals.length - 1]);
    return `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${opts.aria || "trend"}">
      <defs><linearGradient id="${grad}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${col}" stop-opacity=".28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/>
      </linearGradient></defs>
      ${zero}${target}
      <path d="${p.area}" fill="url(#${grad})"></path>
      <path d="${p.line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3" fill="${col}"></circle>
    </svg>`;
  }

  function card(a0) {
    if (!a0 || !a0.cache) return "";
    const c = a0.cache;

    /* RR movement — cumulative over recent games (history is newest-first) */
    const hist = (c.history || []).slice().reverse();
    let cum = 0; const rrTraj = hist.map((h) => (cum += (Number(h.change) || 0)));
    const netRr = rrTraj.length ? rrTraj[rrTraj.length - 1] : null;

    /* HS% per match (oldest->newest) */
    const hsSeries = (c.matches || []).slice().reverse().map((m) => m.hsPct).filter((v) => typeof v === "number");

    /* long-term elo from daily snapshots */
    const s = snaps().filter((x) => x.elo != null);
    const eloSeries = s.map((x) => x.elo);

    return `
    <section class="card climb-card">
      <div class="climb-head">
        <h2 class="card-h"><i class="ti ti-chart-line"></i> Your climb</h2>
        ${netRr != null ? `<span class="climb-net ${netRr >= 0 ? "up" : "down"}">
          ${netRr >= 0 ? "+" : ""}${netRr} RR <span>last ${rrTraj.length} games</span></span>` : ""}
      </div>
      <div class="climb-grid">
        <div class="tr-block">
          <div class="tr-title">RR MOVEMENT</div>
          ${chart("rr", rrTraj, { color: netRr >= 0 ? "var(--teal)" : "var(--red)", zeroLine: true,
            empty: "play a few games to chart RR", aria: "RR movement over recent games" })}
        </div>
        <div class="tr-block">
          <div class="tr-title">HEADSHOT % <span>vs 18% target</span></div>
          ${chart("hs", hsSeries, { color: "var(--gold,#ffd447)", target: 18, targetLabel: "18%",
            empty: "no HS data yet", aria: "headshot percent per match" })}
        </div>
        <div class="tr-block tr-wide">
          <div class="tr-title">ELO OVER TIME <span>${eloSeries.length >= 2 ? eloSeries.length + " days" : "building — 1 point/day"}</span></div>
          ${eloSeries.length >= 2
            ? chart("elo", eloSeries, { color: "var(--teal)", aria: "elo over days" })
            : `<div class="tr-empty">Your day-by-day elo line starts filling in as you play across days. Come back tomorrow — first point logged today.</div>`}
        </div>
      </div>
    </section>`;
  }

  return { snapshot: snapshot, card: card, snaps: snaps };
})();
