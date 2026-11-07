/* Global Rubber Factory · dotted globe with export arcs (d3 orthographic on canvas) */
(() => {
  const canvas = document.querySelector('.globe');
  if (!canvas || !window.d3 || !window.topojson) return;
  const ctx = canvas.getContext('2d');
  const T = window.T || { regions: [], world_hub: 'Factory' };
  const GRF = window.GRF || { world: 0 };
  const HUBS = [[39.17, 21.54, 'Jeddah'], [55.27, 25.2, 'Dubai']];
  // export destinations per region (lon, lat), grouped as in T.regions order: Europe, USA, Middle East, Africa, Asia
  const DEST = [
    [[13.4, 52.5], [-0.1, 51.5], [2.35, 48.86], [12.5, 41.9]],
    [[-95.4, 29.8], [-74, 40.7], [-118.2, 34]],
    [[46.7, 24.7], [51.5, 25.3], [35.9, 31.95], [58.4, 23.6]],
    [[3.4, 6.5], [36.8, -1.3], [31.2, 30], [28, -26.2]],
    [[72.8, 19], [103.8, 1.35], [121.5, 31.2], [67, 24.9]]
  ];
  const ARCS = [];
  DEST.forEach((g, gi) => g.forEach((d, k) => ARCS.push({ from: HUBS[(gi + k) % 2], to: d, g: gi, k })));

  let dots = [], W = 0, H = 0, R = 0, dpr = Math.min(devicePixelRatio || 1, 2);
  const proj = d3.geoOrthographic().clipAngle(90);

  function size() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.42; proj.scale(R).translate([W / 2, H / 2]);
  }

  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then(r => r.json()).then(topo => {
    const land = topojson.feature(topo, topo.objects.land);
    // rasterise land on an equirectangular canvas, then sample a dot grid
    const cw = 720, ch = 360, c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d');
    const eq = d3.geoEquirectangular().scale(cw / (2 * Math.PI)).translate([cw / 2, ch / 2]);
    x.fillStyle = '#fff'; x.beginPath(); d3.geoPath(eq, x)(land); x.fill();
    const px = x.getImageData(0, 0, cw, ch).data;
    const step = innerWidth < 820 ? 2.4 : 1.6;
    for (let lat = -58; lat <= 80; lat += step) {
      const lonStep = step / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
      for (let lon = -180; lon < 180; lon += lonStep) {
        const [ix, iy] = eq([lon, lat]);
        if (px[(Math.floor(iy) * cw + Math.floor(ix)) * 4] > 128) dots.push([lon, lat]);
      }
    }
    size(); addEventListener('resize', size);
    requestAnimationFrame(draw);
  }).catch(() => (canvas.style.display = 'none'));

  const sm = { p: 0 };
  function draw(now) {
    requestAnimationFrame(draw);
    if (GRF.worldOn === false) return;
    sm.p += (GRF.world - sm.p) * 0.08;
    const p = sm.p;
    const lon = -25 + p * 85 + Math.sin(now / 4000) * 3; // Atlantic -> Arabia -> Asia
    proj.rotate([-lon - 0, -18 + p * 6, 0]);
    const center = proj.invert([W / 2, H / 2]);
    ctx.clearRect(0, 0, W, H);

    // atmosphere
    const g = ctx.createRadialGradient(W / 2, H / 2, R * 0.85, W / 2, H / 2, R * 1.25);
    g.addColorStop(0, 'rgba(141,139,255,0.18)'); g.addColorStop(1, 'rgba(141,139,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, R, 0, Math.PI * 2);
    const sph = ctx.createRadialGradient(W / 2 - R * 0.35, H / 2 - R * 0.35, R * 0.1, W / 2, H / 2, R);
    sph.addColorStop(0, '#1a1c2e'); sph.addColorStop(1, '#0b0c14');
    ctx.fillStyle = sph; ctx.fill();
    ctx.strokeStyle = 'rgba(141,139,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();

    // land dots, fading toward the limb
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i], dist = d3.geoDistance(d, center);
      if (dist > 1.55) continue;
      const [x, y] = proj(d), a = Math.cos(dist);
      ctx.fillStyle = `rgba(200,202,230,${0.15 + a * 0.6})`;
      ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
    }

    // arcs, drawn in region by region with scroll
    ARCS.forEach(arc => {
      const start = 0.1 + arc.g * 0.15 + arc.k * 0.025;
      const t = Math.min(1, Math.max(0, (p - start) / 0.18));
      if (t <= 0) return;
      const interp = d3.geoInterpolate(arc.from, arc.to), n = 48, total = d3.geoDistance(arc.from, arc.to);
      ctx.beginPath();
      let started = false, head = null;
      for (let i = 0; i <= n * t; i++) {
        const f = i / n, pt = interp(f);
        if (d3.geoDistance(pt, center) > Math.PI / 2) { started = false; continue; }
        const [x, y] = proj(pt);
        const lift = Math.sin(f * Math.PI) * total * R * 0.12; // raise arc off the surface
        const vx = x - W / 2, vy = y - H / 2, len = Math.hypot(vx, vy) || 1;
        const X = x + (vx / len) * lift, Y = y + (vy / len) * lift;
        started ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); started = true; head = [X, Y];
      }
      const grad = ctx.createLinearGradient(0, 0, W, H);
      ctx.strokeStyle = 'rgba(160,158,255,0.85)'; ctx.lineWidth = 1.4; ctx.shadowColor = '#8d8bff'; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
      if (t >= 1 && d3.geoDistance(arc.to, center) < Math.PI / 2) {
        const [x, y] = proj(arc.to); ctx.fillStyle = '#c4c3ff'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      } else if (head) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(head[0], head[1], 2.2, 0, Math.PI * 2); ctx.fill(); }
    });

    // hubs: pulsing factories
    HUBS.forEach(([lo, la, name], i) => {
      if (d3.geoDistance([lo, la], center) > Math.PI / 2) return;
      const [x, y] = proj([lo, la]), pulse = ((now / 1600 + i * 0.5) % 1);
      ctx.strokeStyle = `rgba(74,222,128,${1 - pulse})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 4 + pulse * 18, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(236,238,244,.9)';
      ctx.fillText(`${name.toUpperCase()} · ${T.world_hub}`, x + 10, y + (i ? 14 : -8));
    });
  }
})();
