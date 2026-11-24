// Chapter 1: an explorable, exploded smartphone. One renderer is shared by the hero and Chapter 1.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PARTS = [
  { id: 'display', name: 'Display', z: 3, materials: [['Glass', 'cover glass made from silica'], ['Indium', 'in indium tin oxide, which makes the touchscreen conductive']],
    note: 'The screen you touch is a sandwich of glass and very thin conductive layers.' },
  { id: 'frame', name: 'Frame', z: 1.5, materials: [['Aluminium', 'or stainless steel, depending on the model']],
    note: 'The frame holds everything together and often doubles as the antenna.' },
  { id: 'board', name: 'Logic board', z: 0.6, materials: [['Copper', 'wiring'], ['Gold', 'contacts', true], ['Tin', 'solder', true], ['Tantalum', 'capacitors', true], ['Silicon', 'chips']],
    note: 'Tin, tantalum, tungsten and gold are “conflict minerals” under U.S. SEC disclosure rules.' },
  { id: 'battery', name: 'Battery', z: -0.6, materials: [['Cobalt', 'in the cathode', true], ['Lithium', 'carries the charge'], ['Nickel', 'cathode, in some chemistries'], ['Graphite', 'anode'], ['Copper & aluminium', 'foils']],
    note: 'Many phone batteries use lithium cobalt oxide. The U.S. Department of Labor lists cobalt ore from DR Congo as produced with child labor.', lead: true },
  { id: 'camera', name: 'Camera', z: 0.2, materials: [['Glass', 'lens elements'], ['Neodymium', 'magnets that move the lens']],
    note: 'Tiny rare-earth magnets focus and steady the image.' },
  { id: 'back', name: 'Back', z: -2, materials: [['Glass', 'back panel'], ['Copper', 'wireless-charging coil']],
    note: 'Even the back hides a coil of copper for wireless charging.' },
];

export function createPhone({ onSelect } = {}) {
  const mobile = matchMedia('(max-width: 900px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(9, 4, 13);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.7;

  // Light: warm key, cool rim, soft fill (editorial product look)
  scene.add(new THREE.HemisphereLight('#F5F1E8', '#101D18', 0.6));
  const key = new THREE.DirectionalLight('#FFE9C4', 2.4); key.position.set(6, 8, 7); scene.add(key);
  const rim = new THREE.DirectionalLight('#8DB8A0', 1.6); rim.position.set(-8, 2, -6); scene.add(rim);
  const under = new THREE.PointLight('#CFAA6B', 18, 30); under.position.set(0, -6, 2); scene.add(under);

  const W = 3.4, H = 7, R = 0.42;
  const phone = new THREE.Group(); phone.rotation.set(-0.35, 0.5, 0.1); scene.add(phone);
  const parts = {};
  const mat = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.4, metalness: 0.2, ...o });

  function part(id, build) { const g = new THREE.Group(); build(g); g.traverse(m => { if (m.isMesh) m.userData.part = id; }); phone.add(g); parts[id] = { group: g, def: PARTS.find(p => p.id === id) }; return g; }

  part('back', g => {
    g.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, 0.12, 4, R), mat('#244B3C', { roughness: 0.15, clearcoat: 1, metalness: 0.1 })));
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 48), mat('#C47A4A', { metalness: 1, roughness: 0.3 }));
    coil.position.z = 0.08; g.add(coil);
  });
  part('battery', g => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(W * 0.74, H * 0.56, 0.32, 3, 0.12), mat('#CFAA6B', { metalness: 0.65, roughness: 0.3, emissive: '#5a3c12', emissiveIntensity: 0.25 }));
    b.position.y = -0.7; g.add(b);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.5, 0.5), new THREE.MeshBasicMaterial({ color: '#101D18', transparent: true, opacity: 0.6 }));
    label.position.set(0, -0.7, 0.17); g.add(label);
  });
  part('board', g => {
    const pcb = new THREE.Mesh(new RoundedBoxGeometry(W * 0.86, H * 0.3, 0.06, 2, 0.1), mat('#1f3b30', { roughness: 0.6 }));
    pcb.position.y = 2.1; g.add(pcb);
    const chips = [[-0.7, 2.2, 0.8, 0.8], [0.5, 2.4, 0.6, 0.5], [0.6, 1.7, 0.5, 0.35], [-0.2, 1.5, 0.4, 0.3]];
    for (const [x, y, w, h] of chips) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), mat('#1a1a1a', { roughness: 0.3, metalness: 0.5 })); c.position.set(x, y, 0.08); g.add(c); }
    for (let i = 0; i < 14; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8), mat('#E2B45A', { metalness: 1, roughness: 0.2 })); d.rotation.x = Math.PI / 2; d.position.set(-1.3 + (i % 7) * 0.42, 1.25 + Math.floor(i / 7) * 1.6, 0.05); g.add(d); }
  });
  part('camera', g => {
    for (const [x, y] of [[-0.95, 2.75], [-0.95, 2.05], [-0.35, 2.4]]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.3, 32), mat('#0d0d0d', { metalness: 0.8, roughness: 0.15, clearcoat: 1 }));
      lens.rotation.x = Math.PI / 2; lens.position.set(x, y, 0); g.add(lens);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 32), mat('#c9c4b8', { metalness: 1, roughness: 0.25 })); ring.position.set(x, y, 0.15); g.add(ring);
    }
  });
  part('frame', g => {
    const s = new THREE.Shape(); const w = W / 2, h = H / 2;
    s.moveTo(-w + R, -h); s.lineTo(w - R, -h); s.quadraticCurveTo(w, -h, w, -h + R); s.lineTo(w, h - R); s.quadraticCurveTo(w, h, w - R, h); s.lineTo(-w + R, h); s.quadraticCurveTo(-w, h, -w, h - R); s.lineTo(-w, -h + R); s.quadraticCurveTo(-w, -h, -w + R, -h);
    const hole = new THREE.Path(); const t = 0.12; hole.moveTo(-w + t + R, -h + t); hole.lineTo(w - t - R, -h + t); hole.quadraticCurveTo(w - t, -h + t, w - t, -h + t + R); hole.lineTo(w - t, h - t - R); hole.quadraticCurveTo(w - t, h - t, w - t - R, h - t); hole.lineTo(-w + t + R, h - t); hole.quadraticCurveTo(-w + t, h - t, -w + t, h - t - R); hole.lineTo(-w + t, -h + t + R); hole.quadraticCurveTo(-w + t, -h + t, -w + t + R, -h + t);
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 }); geo.translate(0, 0, -0.25);
    g.add(new THREE.Mesh(geo, mat('#b9b4a8', { metalness: 0.9, roughness: 0.28 })));
  });
  part('display', g => {
    g.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, 0.1, 4, R), mat('#050807', { roughness: 0.05, clearcoat: 1, metalness: 0.3 })));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.25, H - 0.3), new THREE.MeshBasicMaterial({ color: '#244B3C', transparent: true, opacity: 0.55 }));
    screen.position.z = 0.06; g.add(screen);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.39, 64), new THREE.MeshBasicMaterial({ color: '#CFAA6B' })); ring.position.set(0, 0.6, 0.07); g.add(ring);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.11, 32), new THREE.MeshBasicMaterial({ color: '#CFAA6B' })); dot.position.set(0, 0.6, 0.07); g.add(dot);
  });

  // Explode amount (0 assembled → 1 exploded)
  let explode = 0, explodeTarget = 0, selected = null, hovered = null;
  const ROT = { hero: [-0.35, 0.5, 0.1], explore: [-0.2, 1.1, 0.04] }; let rot = ROT.hero;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickables = []; phone.traverse(m => m.isMesh && pickables.push(m));
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(pickables, false)[0]?.object.userData.part || null;
  }
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; controls.autoRotate = false; });
  canvas.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) { const id = pick(e); if (id && explodeTarget > 0.5) select(id, true); } down = null; });
  canvas.addEventListener('pointermove', e => { if (explodeTarget < 0.5) return; hovered = pick(e); canvas.style.cursor = hovered ? 'pointer' : 'grab'; });

  function select(id, fromScene) { selected = id; if (fromScene) onSelect?.(id); }

  let container = null, running = false;
  function mount(el, mode) {
    container = el; el.querySelector('.loading')?.remove(); el.appendChild(canvas); resize();
    explodeTarget = mode === 'explore' ? 1 : 0; rot = ROT[mode === 'explore' ? 'explore' : 'hero'];
    if (document.body.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      explode = explodeTarget; phone.rotation.set(...rot);
      for (const p of Object.values(parts)) p.group.position.z = p.def.z * 1.25 * explode;
    }
    controls.autoRotate = true; controls.autoRotateSpeed = mode === 'explore' ? 0.5 : 0.9;
    camera.position.set(mode === 'explore' ? -7 : 9, mode === 'explore' ? 5 : 4, mode === 'explore' ? 21 : 13);
    controls.target.set(mode === 'explore' ? 4.2 : -3.4, 0, 0);
    if (mobile) { controls.target.set(0, mode === 'explore' ? 0 : -3.2, 0); camera.position.multiplyScalar(mode === 'explore' ? 1.05 : 1.35); }
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  function stop() { running = false; }
  function resize() { if (!container) return; const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h, false); canvas.style.width = '100%'; canvas.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);

  const clock = new THREE.Clock(); const tmp = new THREE.Color();
  function loop() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    explode += (explodeTarget - explode) * 0.045; // frame-based, like the rotation easing
    for (const [id, p] of Object.entries(parts)) {
      const def = p.def; const on = selected === id; const hov = hovered === id;
      p.group.position.z += ((def.z * 1.25 * explode) - p.group.position.z) * 0.12;
      p.group.position.x += ((on ? 1.2 * explode : 0) - p.group.position.x) * 0.1;
      p.group.traverse(m => { if (m.isMesh && m.material.emissive) { tmp.set(on ? '#CFAA6B' : hov ? '#3a5a4c' : '#000000'); m.material.emissive.lerp(tmp, 0.15); if (id === 'battery' && !on) m.material.emissive.lerp(tmp.set('#5a3c12'), 0.2); } });
    }
    phone.rotation.x += (rot[0] - phone.rotation.x) * 0.05; phone.rotation.y += (rot[1] - phone.rotation.y) * 0.05; phone.rotation.z += (rot[2] - phone.rotation.z) * 0.05;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  return { mount, stop, select, resize, canvas };
}
