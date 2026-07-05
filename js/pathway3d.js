/* ==========================================================================
   VALORANT ASCEND — 3D Pathway (Silver 2 -> Diamond)
   Interactive Three.js scene: rank stages as floating crystal platforms
   along an ascending glowing route. Click a node (or use the arrows) to fly
   the camera to it; the app shows that stage's gates in the side panel.
   Falls back to the 2D list if WebGL/Three is unavailable.
   ========================================================================== */

const PATH3D = (function () {
  "use strict";

  let renderer, scene, camera, raycaster, pointer;
  let nodes = [], stages = [], curve = null;
  let container = null, onSelect = null;
  let currentId = null, selectedId = null;
  let camTarget = null, lookTarget = null;
  let running = false, disposed = false, rafId = 0;
  let clock = null;

  function supported() {
    if (typeof THREE === "undefined") return false;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  }

  function stagePos(i, total) {
    /* ascending S-curve: left->right, rising, gentle depth wobble */
    const k = i / (total - 1);
    return new THREE.Vector3(
      -16 + k * 32,
      -3 + k * 9 + Math.sin(k * Math.PI * 2) * 0.8,
      Math.sin(k * Math.PI * 3) * 3.2
    );
  }

  function mount(el, stageData, curId, selectCb) {
    if (!supported()) return false;
    dispose();
    disposed = false;
    container = el;
    stages = stageData;
    currentId = curId;
    selectedId = curId;
    onSelect = selectCb;

    const W = Math.max(el.clientWidth, 320);
    const H = Math.max(el.clientHeight, 380);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    el.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1014, 0.02);

    camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
    camera.position.set(-18, 2, 16);
    camTarget = camera.position.clone();
    lookTarget = new THREE.Vector3(0, 2, 0);

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(amb);
    const key = new THREE.PointLight(0x2fe8c8, 1.2, 60);
    key.position.set(0, 14, 10);
    scene.add(key);
    const rim = new THREE.PointLight(0xff4655, 1.0, 50);
    rim.position.set(-10, -6, -8);
    scene.add(rim);

    /* route curve + glowing tube */
    const pts = stages.map((s, i) => stagePos(i, stages.length));
    curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 120, 0.07, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x2fe8c8, transparent: true, opacity: 0.55 })
    );
    scene.add(tube);

    /* faint wider aura around the route */
    const aura = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 120, 0.18, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x2fe8c8, transparent: true, opacity: 0.10 })
    );
    scene.add(aura);

    /* stage nodes */
    nodes = stages.map(function (s, i) {
      const group = new THREE.Group();
      const pos = pts[i];
      group.position.copy(pos);

      const color = new THREE.Color(s.color);
      const crystal = new THREE.Mesh(
        s.kind === "summit" ? new THREE.OctahedronGeometry(1.25) : new THREE.OctahedronGeometry(0.8),
        new THREE.MeshStandardMaterial({
          color: color, metalness: 0.35, roughness: 0.25,
          emissive: color, emissiveIntensity: 0.25, transparent: true, opacity: 0.95
        })
      );
      group.add(crystal);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(s.kind === "summit" ? 1.8 : 1.25, 0.045, 10, 48),
        new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6 })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const plat = new THREE.Mesh(
        new THREE.CylinderGeometry(s.kind === "summit" ? 1.5 : 1.05, 1.3, 0.16, 6),
        new THREE.MeshStandardMaterial({ color: 0x16212c, metalness: 0.2, roughness: 0.8 })
      );
      plat.position.y = -1.15;
      group.add(plat);

      group.userData = { id: s.id, index: i, crystal: crystal, ring: ring, baseY: pos.y };
      scene.add(group);
      return group;
    });

    /* background particles */
    const P = 260, ppos = new Float32Array(P * 3);
    for (let p = 0; p < P; p++) {
      ppos[p * 3] = (Math.random() - 0.5) * 70;
      ppos[p * 3 + 1] = (Math.random() - 0.5) * 34;
      ppos[p * 3 + 2] = (Math.random() - 0.5) * 40 - 6;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(ppos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0x9aa6ad, size: 0.06, transparent: true, opacity: 0.5
    })));

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.style.cursor = "pointer";
    window.addEventListener("resize", onResize);

    applyStates();
    focus(selectedId, true);
    running = true;
    clock = new THREE.Clock();
    loop();
    return true;
  }

  function onResize() {
    if (!renderer || !container) return;
    const W = Math.max(container.clientWidth, 320);
    const H = Math.max(container.clientHeight, 380);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  function onClick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = [];
    nodes.forEach(function (g) { g.children.forEach(function (c) { meshes.push(c); }); });
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) {
      let g = hits[0].object.parent;
      if (g && g.userData && g.userData.id) focus(g.userData.id);
    }
  }

  function indexOfStage(id) {
    for (let i = 0; i < stages.length; i++) if (stages[i].id === id) return i;
    return 0;
  }

  function focus(id, instant) {
    selectedId = id;
    const i = indexOfStage(id);
    const p = nodes[i].position;
    /* camera sits back-left of the node, slightly above */
    const dest = new THREE.Vector3(p.x - 4.5, p.y + 2.2, p.z + 7.5);
    if (instant) {
      camera.position.copy(dest);
      lookTarget = p.clone();
    }
    camTarget = dest;
    lookTarget = lookTarget || p.clone();
    lookTarget.userDataTarget = p.clone();
    applyStates();
    if (onSelect) onSelect(id);
  }

  function setCurrent(id) {
    currentId = id;
    applyStates();
  }

  function applyStates() {
    const curIdx = indexOfStage(currentId);
    nodes.forEach(function (g, i) {
      const done = i < curIdx, isCur = i === curIdx, isSel = g.userData.id === selectedId;
      const cry = g.userData.crystal, ring = g.userData.ring;
      cry.material.opacity = done || isCur ? 0.95 : 0.45;
      cry.material.emissiveIntensity = isCur ? 0.7 : isSel ? 0.5 : done ? 0.3 : 0.12;
      ring.material.opacity = isSel ? 0.95 : isCur ? 0.8 : done ? 0.5 : 0.25;
      g.userData.spin = isCur || isSel ? 0.02 : 0.006;
    });
  }

  function loop() {
    if (disposed || !running) return;
    rafId = requestAnimationFrame(loop);
    /* Clock-based timing keeps speed identical across refresh rates */
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.getElapsedTime();
    const f = dt * 60;
    nodes.forEach(function (g, i) {
      g.userData.crystal.rotation.y += (g.userData.spin || 0.006) * f;
      g.position.y = g.userData.baseY + Math.sin(t * 1.2 + i) * 0.12;
      g.userData.ring.rotation.z += 0.004 * f;
    });
    const camEase = 1 - Math.pow(1 - 0.045, f);
    const lookEase = 1 - Math.pow(1 - 0.08, f);
    if (camTarget) camera.position.lerp(camTarget, camEase);
    if (lookTarget && lookTarget.userDataTarget) lookTarget.lerp(lookTarget.userDataTarget, lookEase);
    if (lookTarget) camera.lookAt(lookTarget);
    renderer.render(scene, camera);
  }

  function dispose() {
    disposed = true;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    if (renderer) {
      if (renderer.domElement) {
        renderer.domElement.removeEventListener("click", onClick);
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      renderer = null;
    }
    nodes = [];
    scene = null;
  }

  return { mount: mount, focus: focus, setCurrent: setCurrent, dispose: dispose, supported: supported };
})();
