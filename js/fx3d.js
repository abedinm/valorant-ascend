/* ==========================================================================
   VALORANT ASCEND — GPU shader background
   Fullscreen fragment-shader VFX: layered fbm noise flowing as red/teal
   aurora ribbons over the dark base. Real-time, frame-rate independent,
   mouse-parallaxed. Degrades silently: no WebGL / no Three / reduced-motion
   => static CSS background only. DPR capped for perf.
   ========================================================================== */

(function () {
  "use strict";

  if (typeof THREE === "undefined") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.getElementById("fx3d");
  if (!canvas) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
  } catch (e) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  var W = Math.max(window.innerWidth, 1), H = Math.max(window.innerHeight, 1);
  renderer.setSize(W, H);

  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  var uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(W, H) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) }
  };

  var frag = [
    "precision highp float;",
    "uniform float uTime;",
    "uniform vec2 uRes;",
    "uniform vec2 uMouse;",
    "",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }",
    "float noise(vec2 p){",
    "  vec2 i = floor(p); vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),",
    "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
    "}",
    "float fbm(vec2 p){",
    "  float v = 0.0; float a = 0.5;",
    "  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);",
    "  for (int i = 0; i < 5; i++) {",
    "    v += a * noise(p);",
    "    p = rot * p * 2.02;",
    "    a *= 0.5;",
    "  }",
    "  return v;",
    "}",
    "",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / uRes.xy;",
    "  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 2.2;",
    "  vec2 par = (uMouse - 0.5) * 0.35;",
    "  p += par;",
    "  float t = uTime * 0.05;",
    "",
    "  /* domain-warped fbm: q warps r, r warps the field — organic smoke flow */",
    "  vec2 q = vec2(fbm(p + t * 0.9), fbm(p + vec2(5.2, 1.3) - t * 0.6));",
    "  vec2 r = vec2(fbm(p + 3.1 * q + vec2(1.7, 9.2) + t * 0.5),",
    "                fbm(p + 2.8 * q + vec2(8.3, 2.8) - t * 0.4));",
    "  float f = fbm(p + 3.0 * r);",
    "",
    "  vec3 base = vec3(0.043, 0.063, 0.078);",
    "  vec3 teal = vec3(0.184, 0.910, 0.784);",
    "  vec3 red  = vec3(1.000, 0.275, 0.333);",
    "",
    "  /* two interleaved ribbons driven by the warp fields */",
    "  float tealBand = smoothstep(0.42, 0.78, f) * smoothstep(0.9, 0.35, q.x);",
    "  float redBand  = smoothstep(0.55, 0.95, r.y) * smoothstep(0.85, 0.4, f);",
    "",
    "  vec3 col = base;",
    "  col += teal * tealBand * 0.16;",
    "  col += red  * redBand  * 0.13;",
    "  col += teal * pow(max(q.y - 0.55, 0.0), 2.0) * 0.35;",
    "  col += red  * pow(max(r.x - 0.62, 0.0), 2.0) * 0.30;",
    "",
    "  /* vignette keeps edges dark so content stays readable */",
    "  float vig = smoothstep(1.25, 0.35, length(uv - 0.5));",
    "  col = mix(base * 0.9, col, vig);",
    "",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: "void main(){ gl_Position = vec4(position, 1.0); }",
    fragmentShader: frag,
    depthWrite: false,
    depthTest: false
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  var targetMouse = new THREE.Vector2(0.5, 0.5);
  document.addEventListener("mousemove", function (e) {
    targetMouse.set(e.clientX / Math.max(window.innerWidth, 1), 1.0 - e.clientY / Math.max(window.innerHeight, 1));
  }, { passive: true });

  window.addEventListener("resize", function () {
    var w = Math.max(window.innerWidth, 1), h = Math.max(window.innerHeight, 1);
    renderer.setSize(w, h);
    uniforms.uRes.value.set(w, h);
  });

  var running = true;
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) { clock.getDelta(); tick(); }
  });

  var clock = new THREE.Clock();
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    /* real elapsed time — frame-rate independent, no fixed-step drift */
    uniforms.uTime.value += Math.min(clock.getDelta(), 0.1);
    uniforms.uMouse.value.lerp(targetMouse, 0.04);
    renderer.render(scene, camera);
  }
  tick();
})();
