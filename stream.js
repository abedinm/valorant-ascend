/* ASCEND stream kit — shared engine for all OBS screens.
   EDIT THIS ARRAY with your real handles. */
const SOCIALS = [
  { tag: "YOUTUBE", handle: "LIKE + SUBSCRIBE" },
  { tag: "STORE", handle: "minhazul4.gumroad.com" },
  { tag: "GRIND", handle: "IRON → ASCENDANT" }
];

/* per-screen rotating lines */
const LINES = {
  soon: ["Warming up the aim…","Loading the grind…","Chat, we climbing today","Iron → Ascendant. No excuses.","Lock in incoming…"],
  brb:  ["Grabbing water…","Quick stretch, back in a sec…","Don't go anywhere…","Resetting the mental…","Right back — hold the lobby"],
  offline: ["GG — thanks for watching","Clips dropping on Shorts","Follow for the next climb","Same grind tomorrow","Lock in. Ascend."]
};

document.addEventListener("DOMContentLoaded", () => {
  const screen = document.body.dataset.screen;

  /* ---- particle field ---- */
  const cv = document.getElementById("fx");
  if (cv) {
    const ctx = cv.getContext("2d");
    let W, H, P = [];
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    function size(){ W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; }
    size(); addEventListener("resize", size);
    const N = screen === "overlay" ? 0 : 70;
    for (let i = 0; i < N; i++) P.push({ x: Math.random()*W, y: Math.random()*H,
      r: (.6 + Math.random()*2.4) * dpr, vy: (-.15 - Math.random()*.55) * dpr,
      vx: (Math.random()-.5)*.3*dpr, a: .1 + Math.random()*.5, red: Math.random() < .3 });
    (function draw(){ ctx.clearRect(0,0,W,H);
      for (const p of P){ p.x += p.vx; p.y += p.vy; if (p.y < -6){ p.y = H+6; p.x = Math.random()*W; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.shadowBlur = 10*dpr; ctx.shadowColor = p.red ? "#ff4655" : "#2fe8c8";
        ctx.fillStyle = (p.red ? "rgba(255,70,85," : "rgba(47,232,200,") + p.a + ")"; ctx.fill(); }
      requestAnimationFrame(draw); })();
  }

  /* ---- subtitle rotator ---- */
  const rot = document.querySelector(".rotator");
  if (rot && LINES[screen]) {
    const lines = LINES[screen]; let i = 0;
    const tick = () => { rot.innerHTML = "<span>" + lines[i % lines.length] + "</span>"; i++; };
    tick(); setInterval(tick, 3200);
  }

  /* ---- socials strip (scene screens) ---- */
  const strip = document.querySelector(".socials");
  if (strip) strip.innerHTML = SOCIALS.map(s => "<div><b>" + s.tag + "</b>" + s.handle + "</div>").join("");

  /* ---- overlay rotating social ---- */
  const ovs = document.querySelector(".ov-social");
  if (ovs) {
    let j = 0;
    const tick = () => { const s = SOCIALS[j % SOCIALS.length];
      ovs.innerHTML = "<span class='row'><b>" + s.tag + "</b>" + s.handle + "</span>"; j++; };
    tick(); setInterval(tick, 4000);
  }

  /* ---- countdown (soon): add ?in=10 to the OBS URL for a 10-minute timer ---- */
  const cd = document.getElementById("countdown");
  if (cd) {
    const params = new URLSearchParams(location.search);
    const mins = parseFloat(params.get("in"));
    if (!isNaN(mins) && mins > 0) {
      const key = "ascend_cd_target";
      let target = parseInt(sessionStorage.getItem(key) || "0", 10);
      const now = Date.now();
      if (!target || target < now) { target = now + mins * 60000; sessionStorage.setItem(key, String(target)); }
      const fmt = (ms) => { const s = Math.max(0, Math.floor(ms/1000));
        return String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0"); };
      const upd = () => { const left = target - Date.now();
        if (left <= 0) { cd.innerHTML = "STARTING NOW<small>lock in</small>"; return; }
        cd.innerHTML = fmt(left) + "<small>until we go live</small>"; };
      upd(); setInterval(upd, 500);
    } else {
      cd.style.display = "none";
    }
  }
});
