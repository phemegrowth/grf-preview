/* Global Rubber Factory · three.js scenes: hero gasket fly-through + pressure-test pipe */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GRF = window.GRF || { hero: 0, test: 0, mouse: { x: 0, y: 0 } };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mobile = matchMedia('(max-width: 820px)').matches;
const DPR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);

function supportsGL() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
if (!supportsGL() || matchMedia('(prefers-reduced-motion: reduce)').matches) throw new Error('no webgl / reduced motion');

/* rubber micro-texture, shared */
function noiseTex(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), d = x.createImageData(size, size);
  for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 60; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 3); return t;
}
const NOISE = noiseTex();
const rubber = (color = 0x111216) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.62, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.55,
  sheen: 0.22, sheenColor: new THREE.Color(0x8d8bff), sheenRoughness: 0.6, bumpMap: NOISE, bumpScale: 0.8
});

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(DPR); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  return r;
}
function envFor(renderer, scene, intensity = 0.55) {
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = intensity;
}
function fit(renderer, camera, canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
function whenVisible(el, cb) {
  const io = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: '100px' });
  io.observe(el);
}

/* ================= HERO: lip-seal gasket, camera flies through ================= */
(function hero() {
  const canvas = document.querySelector('.hero-canvas');
  if (!canvas) return;
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  envFor(renderer, scene, 0.32);

  // lip seal profile (radius, height), smoothed, lathed into a ring
  const prof = [[2.05, -0.34], [2.42, -0.34], [2.5, -0.26], [2.5, 0.22], [2.42, 0.32], [2.3, 0.3], [2.26, 0.12], [2.18, 0.1],
    [2.08, 0.26], [1.92, 0.44], [1.84, 0.42], [1.9, 0.24], [1.98, 0.06], [1.96, -0.12], [2.0, -0.3]];
  const curve = new THREE.SplineCurve(prof.map(([x, y]) => new THREE.Vector2(x, y)).concat([new THREE.Vector2(prof[0][0], prof[0][1])]));
  const pts = curve.getPoints(160);
  const geo = new THREE.LatheGeometry(pts, mobile ? 140 : 220);
  geo.rotateX(Math.PI / 2); geo.computeVertexNormals();
  const ringMat = rubber();
  const ring = new THREE.Mesh(geo, ringMat);
  const ringGroup = new THREE.Group(); ringGroup.add(ring); scene.add(ringGroup);

  // brand indigo light ring inside the gasket
  const glow = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.008, 8, 220), new THREE.MeshBasicMaterial({ color: 0x8d8bff, transparent: true, opacity: 0.9 }));
  ringGroup.add(glow);

  // floating o-rings for depth
  const N = mobile ? 14 : 26;
  const oGeo = new THREE.TorusGeometry(0.34, 0.085, 24, 64);
  const orings = new THREE.InstancedMesh(oGeo, rubber(0x16171c), N);
  const seeds = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, rad = 3.4 + Math.random() * 4.5;
    seeds.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad * 0.62, z: -6 + Math.random() * 10, rx: Math.random() * 6, ry: Math.random() * 6, sp: 0.2 + Math.random() * 0.5, sc: 0.5 + Math.random() * 0.9 });
  }
  scene.add(orings);

  // lights: cool key, indigo rim, warm "curing heat" fill
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 5, 6); scene.add(key);
  const rim = new THREE.PointLight(0x7c7aff, 34, 30); rim.position.set(-3, 2, -4); scene.add(rim);
  const warm = new THREE.PointLight(0xff7a2e, 26, 20); warm.position.set(-5, -3, 3); scene.add(warm);
  const top = new THREE.PointLight(0xc4c3ff, 18, 20); top.position.set(2, 4, 1); scene.add(top);

  let on = true, t0 = performance.now();
  const sm = { mx: 0, my: 0, p: 0 };
  whenVisible(canvas, vis => (on = vis));
  addEventListener('resize', () => fit(renderer, camera, canvas));
  fit(renderer, camera, canvas);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!on) return;
    const t = (now - t0) / 1000;
    sm.mx = lerp(sm.mx, GRF.mouse.x, 0.05); sm.my = lerp(sm.my, GRF.mouse.y, 0.05);
    sm.p = lerp(sm.p, GRF.hero, 0.12);
    const p = sm.p;
    const face = ease(clamp(p / 0.45));           // ring turns to face the camera
    const fly = ease(clamp((p - 0.38) / 0.6));    // camera dives through the hole

    // ring: idle spin + tilt, then squares up
    const sideX = mobile ? 0 : 1.7;
    ringGroup.position.set(lerp(sideX, 0, face), lerp(mobile ? 0.9 : 0.15, 0, face), 0);
    ringGroup.rotation.x = lerp(-1.05 + sm.my * 0.15 + Math.sin(t * 0.4) * 0.05, 0, face);
    ringGroup.rotation.y = lerp(0.55 + sm.mx * 0.25, 0, face);
    ring.rotation.z = t * 0.18;
    glow.material.opacity = 0.35 + face * 0.65;
    const sc = lerp(mobile ? 0.62 : 1, 1, face); ringGroup.scale.setScalar(sc);

    camera.position.set(sm.mx * 0.25 * (1 - fly), -sm.my * 0.2 * (1 - fly), lerp(mobile ? 12 : 9.5, -3.5, fly));
    camera.lookAt(0, 0, camera.position.z - 10);
    camera.fov = lerp(35, 70, fly * fly); camera.updateProjectionMatrix();

    for (let i = 0; i < N; i++) {
      const d = seeds[i];
      v.set(d.x + Math.sin(t * d.sp + i) * 0.25, d.y + Math.cos(t * d.sp * 0.8 + i) * 0.25, d.z);
      e.set(d.rx + t * d.sp * 0.6, d.ry + t * d.sp * 0.4, 0); q.setFromEuler(e); s.setScalar(d.sc);
      orings.setMatrixAt(i, m4.compose(v, q, s));
    }
    orings.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();

/* ================= PRESSURE TEST: cut-away pipe + inflatable plug ================= */
(function test() {
  const canvas = document.querySelector('.test-canvas');
  if (!canvas) return;
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  envFor(renderer, scene, 0.4);
  const R_IN = 1.0, R_OUT = 1.12, LEN = 16;

  // pipe: 270° annulus sector, extruded, so the cut faces read as real wall thickness
  const a0 = Math.PI * 0.5, a1 = Math.PI * 2.0; // open quadrant faces camera/top
  const sh = new THREE.Shape();
  sh.absarc(0, 0, R_OUT, a0, a1, false);
  sh.lineTo(Math.cos(a1) * R_IN, Math.sin(a1) * R_IN);
  sh.absarc(0, 0, R_IN, a1, a0, true);
  sh.closePath();
  const pg = new THREE.ExtrudeGeometry(sh, { depth: LEN, bevelEnabled: false, curveSegments: 96 });
  pg.translate(0, 0, -LEN / 2); pg.rotateY(-Math.PI / 2);
  const pipeMat = new THREE.MeshPhysicalMaterial({ color: 0xc4561d, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.35, side: THREE.DoubleSide });
  const pipe = new THREE.Mesh(pg, pipeMat);
  pipe.rotation.x = 0;
  scene.add(pipe);

  // plug: ribbed rubber body (lathe), steel end plate, valve, hose
  const plug = new THREE.Group();
  const L = 1.25, prof = [];
  for (let i = 0; i <= 120; i++) {
    const y = -L + (2 * L * i) / 120;
    const u = Math.abs(y / L);
    const r = Math.pow(1 - Math.pow(u, 6), 1 / 6) * (1 + 0.03 * Math.sin(y * 26) * (u < 0.8 ? 1 : 0));
    prof.push(new THREE.Vector2(Math.max(r, 0.001), y));
  }
  const bodyGeo = new THREE.LatheGeometry(prof, 96); bodyGeo.rotateZ(-Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, rubber(0x101114));
  plug.add(body);
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xc9ccd4, metalness: 1, roughness: 0.25 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.12, 64), steel); plate.rotation.z = Math.PI / 2; plate.position.x = L + 0.02; plug.add(plate);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 24), new THREE.MeshPhysicalMaterial({ color: 0xc8a24a, metalness: 1, roughness: 0.3 }));
  stem.rotation.z = Math.PI / 2; stem.position.x = L + 0.32; plug.add(stem);
  const hoseCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(L + 0.55, 0, 0), new THREE.Vector3(L + 2, 0.1, 0.1), new THREE.Vector3(L + 4, -0.4, 0.5), new THREE.Vector3(L + 6.5, -0.8, 1.6), new THREE.Vector3(L + 9, -1.2, 2.6)]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 80, 0.05, 12), rubber(0x1a1b22)); plug.add(hose);
  // seal glow band
  const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0 }));
  band.rotation.y = Math.PI / 2; plug.add(band);
  scene.add(plug);
  plug.rotation.x = pipe.rotation.x;

  // water: particles flowing down the pipe, stopped by the plug once sealed
  const W = mobile ? 900 : 2200;
  const wp = new Float32Array(W * 3), wd = [];
  for (let i = 0; i < W; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.86;
    wd.push({ y: Math.sin(a) * r, z: Math.cos(a) * r, sp: 1.6 + Math.random() * 1.6, x: -LEN / 2 + Math.random() * LEN });
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(wp, 3));
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const water = new THREE.Points(wg, new THREE.PointsMaterial({ color: 0x6fc3ff, size: 0.07, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
  water.rotation.x = pipe.rotation.x; scene.add(water);

  scene.add(new THREE.HemisphereLight(0xbcc4ff, 0x1a1020, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3, 6, 6); scene.add(key);
  const rim = new THREE.PointLight(0x8d8bff, 40, 30); rim.position.set(-4, 3, -3); scene.add(rim);
  const inner = new THREE.PointLight(0xffffff, 6, 6); scene.add(inner);

  let on = false, last = performance.now();
  const sm = { p: 0 };
  whenVisible(canvas, vis => (on = vis));
  addEventListener('resize', () => fit(renderer, camera, canvas));
  fit(renderer, camera, canvas);

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!on) return;
    sm.p = lerp(sm.p, GRF.test, 0.1);
    const ph = (GRF.phase || (() => ({ insert: 0, inflate: 0, seal: 0 })))(sm.p);

    // plug slides in from the right, then inflates to the wall
    const px = lerp(8.5, mobile ? 0.6 : 1.4, ease(ph.insert));
    const rr = lerp(0.6, 0.985, ease(ph.inflate));
    plug.position.set(px, 0, 0);
    body.scale.set(1 + 0.06 * ph.inflate, rr, rr);
    band.scale.setScalar(rr * 1.005);
    band.material.opacity = ph.seal * (0.6 + 0.4 * Math.sin(now / 200));
    inner.position.set(px - 2.5, 0.3, 0.2);

    // camera: side view -> three-quarter view, slow drift
    const c = ease(sm.p);
    const look = lerp(-0.5, px - 1.2, c) + (mobile ? 0 : 1.2);
    camera.position.set(look + lerp(-4.5, 3.2, c), lerp(4.6, 5.4, c), lerp(mobile ? 22 : 17, mobile ? 16 : 12.5, c));
    camera.lookAt(look, mobile ? 0.2 : 0.7, 0);

    // water flow
    const stopX = px - L * (1 + 0.06 * ph.inflate) - 0.05;
    const sealed = ph.inflate > 0.92;
    for (let i = 0; i < W; i++) {
      const d = wd[i];
      d.x += d.sp * dt * (sealed ? 0.6 : 1);
      if (sealed && d.x > stopX) d.x = stopX - Math.random() * 0.6 * (1 + (d.sp - 1.6));
      if (d.x > LEN / 2) d.x = -LEN / 2;
      wp[i * 3] = d.x; wp[i * 3 + 1] = d.y - 0.05; wp[i * 3 + 2] = d.z;
    }
    wg.attributes.position.needsUpdate = true;
    water.material.opacity = 0.35 + 0.5 * clamp(sm.p * 4);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
