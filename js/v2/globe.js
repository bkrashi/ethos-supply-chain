// Chapter 2: a dotted globe showing the documented (solid) and unknown (dashed) journey of cobalt.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const R = 5;
const COLORS = { documented: '#F5F1E8', reported: '#8DB8A0', unknown: '#9A968B' };

export function toVec(lat, lon, r = R) {
  const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

async function landMask() {
  // Natural Earth 110m land (public domain) via world-atlas; rasterised to an equirectangular mask.
  const [{ feature }, topo] = await Promise.all([
    import('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm'),
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then(r => r.json()),
  ]);
  const geo = feature(topo, topo.objects.land);
  const W = 720, H = 360; const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#fff';
  const px = ([lon, lat]) => [(lon + 180) / 360 * W, (90 - lat) / 180 * H];
  for (const f of geo.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) { g.beginPath(); for (const ring of poly) ring.forEach((p, i) => { const [x, y] = px(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.fill('evenodd'); }
  }
  const data = g.getImageData(0, 0, W, H).data;
  return (lat, lon) => { const x = Math.floor((lon + 180) / 360 * (W - 1)), y = Math.floor((90 - lat) / 180 * (H - 1)); return data[(y * W + x) * 4] > 128; };
}

export function createGlobe(container, caseData, { onSelect } = {}) {
  const mobile = matchMedia('(max-width: 900px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  container.querySelector('.loading')?.remove();
  container.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer(); labels.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  container.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 9; controls.maxDistance = 30; controls.rotateSpeed = 0.5;

  const world = new THREE.Group(); scene.add(world);
  // Ocean sphere + soft atmosphere
  world.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 48), new THREE.MeshBasicMaterial({ color: '#0d1814' })));
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 64, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 n; void main(){ n = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 n; void main(){ float i = pow(0.62 - dot(n, vec3(0.,0.,1.)), 3.); gl_FragColor = vec4(0.36,0.58,0.47,1.) * i; }',
  }));
  scene.add(atmo);

  // Dots (land) — fallback to a faint graticule if offline
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, 7); g.fill(); return new THREE.CanvasTexture(c); })();
  landMask().then(isLand => {
    const N = mobile ? 9000 : 16000; const pos = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      const lat = Math.asin(y) * 180 / Math.PI; let lon = (Math.atan2(Math.sin(th) * r, Math.cos(th) * r) * 180 / Math.PI);
      if (isLand(lat, lon)) { const v = toVec(lat, lon, R); pos.push(v.x, v.y, v.z); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    world.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.055, map: dotTex, transparent: true, color: '#557a69', depthWrite: false })));
  }).catch(() => {
    world.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(R, 24, 16)), new THREE.LineBasicMaterial({ color: '#244B3C' })));
  });

  // Nodes
  const nodes = {};
  for (const n of caseData.nodes) {
    const alt = n.layout_only ? R * 1.32 : R * 1.005; // unknown stops float: their position is layout only
    const p = toVec(n.lat, n.lon, alt);
    const color = COLORS[n.status] || COLORS.unknown;
    const g = new THREE.Group(); g.position.copy(p); g.lookAt(p.clone().multiplyScalar(2)); world.add(g);
    const core = new THREE.Mesh(new THREE.CircleGeometry(n.status === 'documented' ? 0.07 : 0.06, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: n.status === 'unknown' ? 0.6 : 1 }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.14, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
    g.add(core, ring);
    const el = document.createElement('button');
    el.className = `glabel ${n.status}`; el.innerHTML = `<i></i>${n.short || n.name}${n.layout_only ? ' <small>location unknown</small>' : ''}`; el.style.pointerEvents = 'auto';
    el.addEventListener('click', () => onSelect?.(n.id));
    const lab = new CSS2DObject(el); lab.position.copy(toVec(n.lat, n.lon, alt * 1.015)); world.add(lab);
    nodes[n.id] = { n, g, ring, el, p };
  }

  // Arcs
  const arcs = [];
  for (const e of caseData.edges) {
    const a = nodes[e.from], b = nodes[e.to]; if (!a || !b) continue;
    const dist = a.p.distanceTo(b.p);
    const mid = a.p.clone().add(b.p).normalize().multiplyScalar(R + 0.3 + dist * 0.22);
    const curve = new THREE.QuadraticBezierCurve3(a.p, mid, b.p);
    const pts = curve.getPoints(80); const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const color = COLORS[e.status] || COLORS.unknown;
    const line = e.status === 'unknown'
      ? new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.85 }))
      : e.status === 'reported'
        ? new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: 0.3, gapSize: 0.06 }))
        : new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.012, 6), new THREE.MeshBasicMaterial({ color }));
    if (line.isLine) line.computeLineDistances();
    world.add(line);
    let flow = null;
    if (e.status === 'documented' && e.type === 'ships_to') {
      flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#CFAA6B' }), 6);
      world.add(flow);
    }
    arcs.push({ e, curve, line, flow, reveal: 0 });
  }

  // Camera
  let fly = null;
  function lookAtLatLon(lat, lon, dist = mobile ? 20 : 15, dur = 1.6) {
    const to = toVec(lat, lon, dist); fly = { from: camera.position.clone(), to, t: 0, dur };
  }
  camera.position.copy(toVec(5, 30, 24));
  let sel = null;
  function focus(id) {
    const n = nodes[id]; if (!n) return; sel = id;
    for (const [k, v] of Object.entries(nodes)) v.el.classList.toggle('on', k === id);
    lookAtLatLon(n.n.lat - 6, n.n.lon, mobile ? 19 : 14);
  }
  function overview() { sel = null; for (const v of Object.values(nodes)) v.el.classList.remove('on'); lookAtLatLon(-2, 58, mobile ? 27 : 22, 2.2); }

  function resize() { const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h); labels.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  let running = false; const clock = new THREE.Clock(); const dummy = new THREE.Object3D(); const tmpV = new THREE.Vector3();
  function loop() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (fly) {
      fly.t = Math.min(1, fly.t + dt / fly.dur); const e = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - Math.pow(-2 * fly.t + 2, 3) / 2;
      const len = fly.from.length() + (fly.to.length() - fly.from.length()) * e;
      camera.position.copy(fly.from.clone().normalize().lerp(fly.to.clone().normalize(), e).normalize().multiplyScalar(len));
      if (fly.t >= 1) fly = null;
    }
    for (const [id, v] of Object.entries(nodes)) {
      const s = 1 + Math.sin(t * 2 + id.length) * 0.15 + (sel === id ? 0.6 : 0); v.ring.scale.setScalar(s);
      // hide labels on the far side of the globe
      tmpV.copy(v.p).normalize(); const facing = tmpV.dot(camera.position.clone().normalize());
      v.el.style.opacity = facing > 0.15 ? 1 : 0; v.el.style.pointerEvents = facing > 0.15 ? 'auto' : 'none';
    }
    for (const a of arcs) if (a.flow) {
      for (let i = 0; i < 6; i++) { a.curve.getPoint(((t * 0.18) + i / 6) % 1, dummy.position); dummy.updateMatrix(); a.flow.setMatrixAt(i, dummy.matrix); }
      a.flow.instanceMatrix.needsUpdate = true;
    }
    controls.update();
    renderer.render(scene, camera); labels.render(scene, camera);
    requestAnimationFrame(loop);
  }
  function start() { if (!running) { running = true; clock.getDelta(); resize(); requestAnimationFrame(loop); } }
  function stop() { running = false; }
  overview();
  return { start, stop, focus, overview };
}
