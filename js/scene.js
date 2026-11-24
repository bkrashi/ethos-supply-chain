// ETHOS digital twin: a miniature, explorable supply-chain world in Three.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const POS = {
  asm:       new THREE.Vector3(-18, 0, -0.5),
  mine:      new THREE.Vector3(-12.5, 0, -7.5),
  community: new THREE.Vector3(-15, 0, 7),
  refinery:  new THREE.Vector3(-5.5, 0, -2.5),
  factory:   new THREE.Vector3(0.5, 0, -4.5),
  port:      new THREE.Vector3(3.8, 0, 6),
  warehouse: new THREE.Vector3(13.6, 0, 4.2),
  hq:        new THREE.Vector3(19, 0, -1.5),
  recycle:   new THREE.Vector3(19.5, 0, 5.2),
};
const LABEL_H = { asm: 2.4, mine: 3.6, community: 3.0, refinery: 5.2, factory: 3.4, port: 4.6, warehouse: 3.2, hq: 7.4, recycle: 3.4 };

const C = {
  safe: new THREE.Color('#3df0a0'), warn: new THREE.Color('#ffb347'), bad: new THREE.Color('#ff3d6e'),
  cyan: new THREE.Color('#3df0ff'), dim: new THREE.Color('#5a2236'), green: new THREE.Color('#5ee6a8'),
  riverClean: new THREE.Color('#2a8cff'), riverDirty: new THREE.Color('#7a5a2a'),
};
const riskColor = (r, out = new THREE.Color()) =>
  r < 0.5 ? out.copy(C.safe).lerp(C.warn, r / 0.5) : out.copy(C.warn).lerp(C.bad, (r - 0.5) / 0.5);

const matCache = new Map();
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.1, flatShading: true, ...o }));
  return matCache.get(key);
}
function mesh(geo, material, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1, cast = true, recv = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(...s);
  m.castShadow = cast; m.receiveShadow = recv;
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
const rand = mulberry(7);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function softDotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ───────────────────────── Node builders ─────────────────────────
function worker(helmet) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CapsuleGeometry(0.09, 0.22, 3, 6), mat('#c98b5a'), { y: 0.2 }));
  g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), mat('#8a5a3a'), { y: 0.42 }));
  const h = mesh(new THREE.SphereGeometry(0.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ffd23f', { emissive: '#ffb000', emissiveIntensity: 0.4 }), { y: 0.45 });
  h.visible = false; g.add(h); helmet.push(h);
  return g;
}

function buildASM(ctx) {
  const g = new THREE.Group();
  const ground = mesh(new THREE.CircleGeometry(3.2, 28), mat('#5a3d2a'), { y: 0.02, rx: -Math.PI / 2 });
  g.add(ground);
  ctx.helmets = []; ctx.beacons = [];
  const shafts = [[-1.2, -0.8], [0.9, -1.1], [1.4, 0.9], [-0.6, 1.3], [0, 0]];
  for (const [x, z] of shafts) {
    g.add(mesh(cyl(0.35, 0.35, 0.05, 10), mat('#120b07'), { x, y: 0.04, z }));
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      g.add(mesh(cyl(0.025, 0.025, 1.1, 4), mat('#8a6a3a'), { x: x + Math.cos(a) * 0.3, y: 0.5, z: z + Math.sin(a) * 0.3, rz: Math.cos(a) * 0.3, rx: -Math.sin(a) * 0.3 }));
    }
    const b = mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshBasicMaterial({ color: '#ff3d6e', transparent: true }), { x, y: 1.5, z, cast: false });
    g.add(b); ctx.beacons.push(b);
  }
  // tarps
  for (let i = 0; i < 4; i++) {
    const a = rand() * 6.28, r = 2 + rand() * 0.8;
    g.add(mesh(box(0.9, 0.04, 0.7), mat(['#2b6cb0', '#c05621', '#2f855a', '#9b2c2c'][i]), { x: Math.cos(a) * r, y: 0.55, z: Math.sin(a) * r, rz: 0.2, ry: a }));
    g.add(mesh(cyl(0.02, 0.02, 0.55, 4), mat('#6b4f2a'), { x: Math.cos(a) * r, y: 0.27, z: Math.sin(a) * r }));
  }
  // ore sacks
  for (let i = 0; i < 9; i++) g.add(mesh(new THREE.DodecahedronGeometry(0.13), mat('#3b4a5a'), { x: -2 + rand() * 0.8, y: 0.12, z: 1.6 + rand() * 0.8 }));
  // workers
  for (let i = 0; i < 9; i++) {
    const w = worker(ctx.helmets); const a = rand() * 6.28, r = 0.6 + rand() * 2;
    w.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); w.rotation.y = rand() * 6;
    g.add(w);
  }
  // formalised zone fence (appears after rebuild)
  const fence = new THREE.Group();
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2;
    fence.add(mesh(cyl(0.03, 0.03, 0.6, 4), mat('#3df0ff', { emissive: '#3df0ff', emissiveIntensity: 0.6 }), { x: Math.cos(a) * 3.4, y: 0.3, z: Math.sin(a) * 3.4 }));
  }
  const rail = mesh(new THREE.TorusGeometry(3.4, 0.025, 4, 64), new THREE.MeshBasicMaterial({ color: '#3df0ff' }), { y: 0.55, rx: Math.PI / 2, cast: false });
  fence.add(rail);
  // safety station
  fence.add(mesh(box(0.8, 0.6, 0.6), mat('#e2e8f0', { emissive: '#3df0ff', emissiveIntensity: 0.15 }), { x: 2.6, y: 0.3, z: -1.6 }));
  fence.add(mesh(box(0.5, 0.12, 0.08), mat('#3df0a0', { emissive: '#3df0a0', emissiveIntensity: 1 }), { x: 2.6, y: 0.72, z: -1.29 }));
  fence.scale.setScalar(0.001); g.add(fence); ctx.fence = fence;
  return g;
}

function buildMine(ctx) {
  const g = new THREE.Group();
  const pts = [[0, 0.03], [0.8, 0.03], [0.85, 0.28], [1.4, 0.28], [1.45, 0.55], [2.0, 0.55], [2.05, 0.82], [2.6, 0.82], [3.2, 0.0]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(mesh(new THREE.LatheGeometry(pts, 40), mat('#7a5c45', { side: THREE.DoubleSide })));
  g.add(mesh(new THREE.CircleGeometry(0.8, 24), mat('#2d5a6a', { metalness: 0.4, roughness: 0.2 }), { y: 0.05, rx: -Math.PI / 2 }));
  // headframe
  const hx = 3.4, hz = -1.2;
  for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) g.add(mesh(cyl(0.05, 0.07, 2.6, 4), mat('#9aa5b1', { metalness: 0.6 }), { x: hx + dx, y: 1.3, z: hz + dz }));
  g.add(mesh(cyl(0.35, 0.35, 0.1, 16), mat('#cbd5e0', { metalness: 0.7 }), { x: hx, y: 2.65, z: hz, rx: Math.PI / 2 }));
  // trucks + ore piles
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Group(); t.add(mesh(box(0.7, 0.3, 0.4), mat('#f6ad55'), { y: 0.3 })); t.add(mesh(box(0.25, 0.25, 0.4), mat('#2d3748'), { x: 0.42, y: 0.28 }));
    t.position.set(-1.5 + i * 1.6, 0.85, 2.9); t.rotation.y = 0.3 * i; g.add(t);
  }
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.ConeGeometry(0.6 + rand() * 0.4, 0.8, 7), mat(['#4a5568', '#2c6e7f', '#5a4632'][i % 3]), { x: 3.2 + rand(), y: 0.4, z: 1.2 + i * 0.6 }));
  // tailings pond
  const pond = mesh(new THREE.CircleGeometry(1.1, 20), new THREE.MeshStandardMaterial({ color: '#8a7a3a', transparent: true, opacity: 0.85, roughness: 0.2 }), { x: -3.4, y: 0.04, z: -1.4, rx: -Math.PI / 2 });
  g.add(pond); ctx.pond = pond;
  return g;
}

function buildCommunity(ctx) {
  const g = new THREE.Group();
  ctx.windows = []; ctx.trees = [];
  const winMat = new THREE.MeshStandardMaterial({ color: '#ffd28a', emissive: '#ffb347', emissiveIntensity: 0.2 });
  ctx.winMat = winMat;
  const houses = [[-2, -1.5], [-0.5, -2.2], [1.2, -1.8], [-2.4, 0.6], [2.2, -0.2], [-1.2, 2.2], [0.6, 2.4], [2.4, 1.6]];
  houses.forEach(([x, z], i) => {
    const h = new THREE.Group();
    h.add(mesh(box(0.8, 0.55, 0.7), mat(['#d6bc8a', '#c9a27a', '#e2cfa8'][i % 3]), { y: 0.28 }));
    h.add(mesh(new THREE.ConeGeometry(0.66, 0.45, 4), mat(['#8b4a2b', '#5b6b7a', '#9c7a3c'][i % 3]), { y: 0.78, ry: Math.PI / 4 }));
    h.add(mesh(box(0.18, 0.18, 0.02), winMat, { y: 0.32, z: 0.36, cast: false }));
    h.position.set(x, 0, z); h.rotation.y = rand() * 1.5; g.add(h);
  });
  // school
  const school = new THREE.Group();
  school.add(mesh(box(1.8, 0.7, 1), mat('#f0e6d2'), { y: 0.35 }));
  school.add(mesh(box(2, 0.12, 1.2), mat('#c0392b'), { y: 0.76 }));
  for (let i = 0; i < 4; i++) school.add(mesh(box(0.25, 0.22, 0.02), winMat, { x: -0.6 + i * 0.4, y: 0.4, z: 0.51, cast: false }));
  school.add(mesh(cyl(0.02, 0.02, 1.4, 4), mat('#cbd5e0'), { x: 1.1, y: 0.7, z: 0.6 }));
  school.position.set(0.2, 0, 0.1); g.add(school);
  // clinic + grievance desk (appear after rebuild)
  const clinic = new THREE.Group();
  clinic.add(mesh(box(1, 0.6, 0.8), mat('#f7fafc'), { y: 0.3 }));
  clinic.add(mesh(box(0.5, 0.12, 0.04), mat('#3df0a0', { emissive: '#3df0a0', emissiveIntensity: 1.2 }), { y: 0.75, z: 0.2 }));
  clinic.add(mesh(box(0.12, 0.5, 0.04), mat('#3df0a0', { emissive: '#3df0a0', emissiveIntensity: 1.2 }), { y: 0.75, z: 0.2 }));
  clinic.position.set(-3, 0, -0.6); clinic.scale.setScalar(0.001); g.add(clinic); ctx.clinic = clinic;
  const desk = new THREE.Group();
  desk.add(mesh(cyl(0.35, 0.4, 0.5, 8), mat('#e2e8f0'), { y: 0.25 }));
  desk.add(mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: '#b49cff' }), { y: 0.9, cast: false }));
  desk.position.set(2.8, 0, 3); desk.scale.setScalar(0.001); g.add(desk); ctx.desk = desk;
  // well
  g.add(mesh(cyl(0.28, 0.28, 0.35, 12), mat('#8a8a8a'), { x: -0.3, y: 0.17, z: -0.6 }));
  const well = mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshStandardMaterial({ color: '#2a8cff', roughness: 0.1 }), { x: -0.3, y: 0.36, z: -0.6, rx: -Math.PI / 2 });
  g.add(well); ctx.well = well;
  // trees
  for (let i = 0; i < 16; i++) {
    const a = rand() * 6.28, r = 3 + rand() * 1.4;
    const t = new THREE.Group();
    t.add(mesh(cyl(0.05, 0.07, 0.4, 5), mat('#6b4f2a'), { y: 0.2 }));
    t.add(mesh(new THREE.ConeGeometry(0.35, 0.9, 6), mat('#2f855a'), { y: 0.8 }));
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); const s = 0.7 + rand() * 0.6; t.scale.setScalar(s);
    g.add(t); ctx.trees.push(t);
  }
  return g;
}

function buildRefinery(ctx) {
  const g = new THREE.Group();
  g.add(mesh(box(5, 0.12, 4), mat('#4a5568'), { y: 0.06 }));
  const tankM = mat('#cbd5e0', { metalness: 0.6, roughness: 0.35 });
  for (let i = 0; i < 4; i++) g.add(mesh(cyl(0.55, 0.55, 1.4, 16), tankM, { x: -1.6 + i * 1.1, y: 0.82, z: 1 }));
  g.add(mesh(box(2.6, 1.3, 1.6), mat('#718096'), { x: -0.6, y: 0.75, z: -0.7 }));
  g.add(mesh(box(2.8, 0.1, 1.8), mat('#2d3748'), { x: -0.6, y: 1.45, z: -0.7 }));
  ctx.stacks = [];
  for (const [x, z] of [[1.4, -1.2], [2.0, -0.4]]) {
    g.add(mesh(cyl(0.18, 0.26, 3.6, 12), mat('#a0aec0', { metalness: 0.5 }), { x, y: 1.9, z }));
    g.add(mesh(cyl(0.2, 0.2, 0.15, 12), mat('#e53e3e', { emissive: '#e53e3e', emissiveIntensity: 0.6 }), { x, y: 3.5, z }));
    ctx.stacks.push(new THREE.Vector3(x, 3.7, z));
  }
  // pipes
  const pipe = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.6, 1.4, 1), new THREE.Vector3(-0.5, 1.9, 0.2), new THREE.Vector3(1.4, 1.6, -1.2)]);
  g.add(mesh(new THREE.TubeGeometry(pipe, 20, 0.07, 6), mat('#e2e8f0', { metalness: 0.7 })));
  // smoke
  const N = 90, pos = new Float32Array(N * 3), seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) seeds[i] = rand();
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const smoke = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.1, map: softDotTexture(), transparent: true, depthWrite: false, color: '#8c8070', opacity: 0.55 }));
  smoke.frustumCulled = false; g.add(smoke); ctx.smoke = { points: smoke, seeds, N };
  return g;
}

function buildFactory(ctx) {
  const g = new THREE.Group();
  g.add(mesh(box(6, 0.1, 3.6), mat('#4a5568'), { y: 0.05 }));
  g.add(mesh(box(4.6, 1.1, 2.4), mat('#e2e8f0'), { y: 0.6 }));
  for (let i = 0; i < 6; i++) {
    const tooth = mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.4, 3, 1), mat('#a0aec0'), { x: -1.95 + i * 0.78, y: 1.3, rx: Math.PI / 2, rz: Math.PI / 2 });
    g.add(tooth);
    g.add(mesh(box(0.05, 0.3, 2.3), mat('#7cc4ff', { emissive: '#3df0ff', emissiveIntensity: 0.6 }), { x: -2.1 + i * 0.78, y: 1.4, cast: false }));
  }
  g.add(mesh(box(4.6, 0.08, 0.04), mat('#3df0ff', { emissive: '#3df0ff', emissiveIntensity: 1 }), { y: 0.45, z: 1.22, cast: false }));
  // LFP line (appears after rebuild)
  const lfp = new THREE.Group();
  lfp.add(mesh(box(1.6, 0.8, 1.4), mat('#f7fafc'), { y: 0.4 }));
  lfp.add(mesh(box(1.62, 0.1, 1.42), mat('#5ee6a8', { emissive: '#5ee6a8', emissiveIntensity: 1 }), { y: 0.84, cast: false }));
  lfp.position.set(3.4, 0, 0.6); lfp.scale.setScalar(0.001); g.add(lfp); ctx.lfp = lfp;
  // solar array (appears after rebuild)
  const solar = new THREE.Group();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++)
    solar.add(mesh(box(0.7, 0.04, 0.45), mat('#1a365d', { metalness: 0.8, roughness: 0.2, emissive: '#1e3a8a', emissiveIntensity: 0.4 }), { x: -2.2 + j * 0.8, y: 0.35, z: -2.3 - i * 0.55, rx: -0.4 }));
  solar.scale.setScalar(0.001); g.add(solar); ctx.solar = solar;
  return g;
}

function buildPort(ctx) {
  const g = new THREE.Group();
  g.add(mesh(box(4, 0.3, 3), mat('#4a5568'), { y: 0.15 }));
  const colors = ['#e53e3e', '#3182ce', '#38a169', '#d69e2e', '#805ad5', '#dd6b20'];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 1 + ((i + j) % 3); k++)
    g.add(mesh(box(0.8, 0.32, 0.36), mat(colors[(i * 3 + j + k) % 6]), { x: -1.4 + i * 0.85, y: 0.46 + k * 0.33, z: -1 + j * 0.42 }));
  for (const x of [-0.8, 0.9]) {
    const crane = new THREE.Group();
    crane.add(mesh(box(0.12, 3, 0.12), mat('#f6ad55'), { x: -0.4, y: 1.5 })); crane.add(mesh(box(0.12, 3, 0.12), mat('#f6ad55'), { x: 0.4, y: 1.5 }));
    crane.add(mesh(box(0.15, 0.15, 3.4), mat('#f6ad55'), { y: 3, z: 0.8 }));
    crane.position.set(x, 0.3, 1); g.add(crane);
  }
  return g;
}

function buildWarehouse() {
  const g = new THREE.Group();
  g.add(mesh(box(4.2, 0.1, 3), mat('#4a5568'), { y: 0.05 }));
  g.add(mesh(box(3.4, 1.2, 2.2), mat('#cbd5e0'), { y: 0.65 }));
  g.add(mesh(new THREE.CylinderGeometry(1.15, 1.15, 3.4, 3, 1), mat('#718096'), { y: 1.25, rz: Math.PI / 2, s: [1, 1, 0.55] }));
  for (let i = 0; i < 3; i++) g.add(mesh(box(0.6, 0.7, 0.04), mat('#2d3748'), { x: -1 + i, y: 0.4, z: 1.12, cast: false }));
  g.add(mesh(box(2.4, 0.05, 0.05), mat('#3df0ff', { emissive: '#3df0ff', emissiveIntensity: 1 }), { y: 1.0, z: 1.13, cast: false }));
  return g;
}

function buildHQ(ctx) {
  const g = new THREE.Group();
  g.add(mesh(cyl(2, 2.2, 0.2, 6), mat('#2d3748'), { y: 0.1 }));
  const glass = new THREE.MeshStandardMaterial({ color: '#1a2a44', metalness: 0.9, roughness: 0.1, emissive: '#0b3a5a', emissiveIntensity: 0.6 });
  g.add(mesh(box(1.6, 5.6, 1.6), glass, { y: 3, ry: Math.PI / 4 }));
  for (let i = 0; i < 9; i++) g.add(mesh(box(1.64, 0.04, 1.64), mat('#3df0ff', { emissive: '#3df0ff', emissiveIntensity: 0.9 }), { y: 0.8 + i * 0.6, ry: Math.PI / 4, cast: false }));
  g.add(mesh(box(1.1, 3, 1.1), glass, { x: 1.4, y: 1.6, z: 0.6 }));
  const ring = mesh(new THREE.TorusGeometry(1.6, 0.03, 6, 64), new THREE.MeshBasicMaterial({ color: '#3df0ff', transparent: true, opacity: 0.8 }), { y: 6.4, rx: Math.PI / 2, cast: false });
  g.add(ring); ctx.hqRing = ring;
  return g;
}

function buildRecycle(ctx) {
  const g = new THREE.Group();
  g.add(mesh(cyl(1.6, 1.8, 0.15, 24), mat('#2d3748'), { y: 0.08 }));
  g.add(mesh(new THREE.SphereGeometry(1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e2e8f0', { roughness: 0.3, metalness: 0.3 }), { y: 0.15 }));
  const loop = mesh(new THREE.TorusGeometry(1.5, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: '#5ee6a8' }), { y: 1.9, rx: Math.PI / 2.4, cast: false });
  g.add(loop); ctx.recycleLoop = loop;
  g.scale.setScalar(0.001);
  return g;
}

// ───────────────────────── Scene ─────────────────────────
export function createScene(container, { onSelect, onHover } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.className = 'label-layer';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#040912');
  scene.fog = new THREE.FogExp2('#040912', 0.0115);

  const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 400);
  camera.position.set(60, 70, 90);
  const controls = new OrbitControls(camera, labelRenderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.06;
  controls.maxPolarAngle = 1.32; controls.minDistance = 7; controls.maxDistance = 95;
  controls.target.set(0, 0, 0);
  controls.autoRotateSpeed = 0.35;

  // Lights
  scene.add(new THREE.HemisphereLight('#9cc8ff', '#1a1208', 0.9));
  const sun = new THREE.DirectionalLight('#fff2d8', 2.2);
  sun.position.set(-20, 35, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 24, bottom: -24, near: 1, far: 100 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#3df0ff', 0.6); rim.position.set(30, 12, -30); scene.add(rim);

  // Holographic water
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#06223a') }, uLine: { value: new THREE.Color('#1ad8ff') } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform vec3 uLine; varying vec3 vW;
      float grid(vec2 p, float s){ vec2 g = abs(fract(p/s-0.5)-0.5)/fwidth(p/s); return 1.-min(min(g.x,g.y),1.); }
      void main(){
        float d = length(vW.xz);
        float g = grid(vW.xz, 2.0)*0.35 + grid(vW.xz, 10.0)*0.5;
        float wave = 0.5+0.5*sin(d*0.6 - uTime*1.2);
        float fade = smoothstep(90., 20., d);
        vec3 col = uColor*(0.6+0.4*wave) + uLine*g*fade*0.55;
        gl_FragColor = vec4(col*fade + vec3(0.01,0.02,0.04)*(1.-fade), 1.);
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.y = -0.45; scene.add(water);

  // Islands
  function island(x, z, r) {
    const g = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(r, r * 0.82, 1.6, 64, 1), mat('#2b2f36'), { y: -0.8 });
    const top = mesh(new THREE.CircleGeometry(r, 64), mat('#3a4a3a', { roughness: 0.95 }), { y: 0.001, rx: -Math.PI / 2, cast: false });
    const rimRing = mesh(new THREE.TorusGeometry(r + 0.05, 0.05, 6, 128), new THREE.MeshBasicMaterial({ color: '#3df0ff' }), { y: 0.02, rx: Math.PI / 2, cast: false, recv: false });
    const polar = new THREE.PolarGridHelper(r * 0.98, 12, 6, 64, '#2a6a7a', '#1d4552');
    polar.position.y = 0.012; polar.material.transparent = true; polar.material.opacity = 0.25;
    g.add(body, top, rimRing, polar); g.position.set(x, 0, z); scene.add(g);
  }
  island(-7, 0, 15.5); island(17, 1.5, 7.6);

  // River from mine area to the sea (colour = environmental state)
  const riverCurve = new THREE.CatmullRomCurve3([[-10, -5], [-12, 0], [-11.5, 4], [-9, 8], [-6, 11], [-3, 14.5]].map(([x, z]) => new THREE.Vector3(x, 0.03, z)));
  const riverMat = new THREE.MeshStandardMaterial({ color: C.riverDirty.clone(), roughness: 0.2, metalness: 0.2, emissive: '#0a1a33', emissiveIntensity: 0.3 });
  const river = new THREE.Mesh(new THREE.TubeGeometry(riverCurve, 60, 0.45, 6), riverMat);
  river.scale.y = 0.06; river.position.y = 0.02; river.receiveShadow = true; scene.add(river);

  // Scattered trees
  const treeGroup = new THREE.Group();
  for (let i = 0; i < 70; i++) {
    const a = rand() * 6.28, r = 3 + rand() * 12;
    const x = -7 + Math.cos(a) * r, z = Math.sin(a) * r;
    if (Object.values(POS).some(p => Math.hypot(p.x - x, p.z - z) < 4.2)) continue;
    const t = new THREE.Group();
    t.add(mesh(cyl(0.05, 0.08, 0.5, 5), mat('#5a4022'), { y: 0.25 }));
    t.add(mesh(new THREE.ConeGeometry(0.45, 1.1, 6), mat(rand() > 0.5 ? '#2f6b4a' : '#3b7a4f'), { y: 0.95 }));
    t.position.set(x, 0, z); t.scale.setScalar(0.6 + rand() * 0.8); treeGroup.add(t);
  }
  scene.add(treeGroup);

  // Nodes
  const ctx = {};
  const builders = { asm: buildASM, mine: buildMine, community: buildCommunity, refinery: buildRefinery, factory: buildFactory, port: buildPort, warehouse: buildWarehouse, hq: buildHQ, recycle: buildRecycle };
  const nodes = {};
  const pickables = [];
  const haloGeo = new THREE.RingGeometry(3.6, 4.0, 64);
  for (const [id, build] of Object.entries(builders)) {
    const group = build(ctx);
    group.position.copy(POS[id]);
    group.traverse(o => { if (o.isMesh) { o.userData.nodeId = id; pickables.push(o); } });
    scene.add(group);
    const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: '#3df0a0', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.copy(POS[id]).setY(0.05); scene.add(halo);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.5, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#3df0ff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.copy(POS[id]).setY(7); scene.add(beam);
    // label
    const el = document.createElement('button');
    el.className = 'node-label'; el.dataset.node = id;
    el.innerHTML = `<span class="nl-dot"></span><span class="nl-name"></span><span class="nl-risk"></span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); onSelect?.(id); });
    const label = new CSS2DObject(el); label.position.copy(POS[id]).setY(LABEL_H[id]); scene.add(label);
    nodes[id] = { group, halo, beam, el, label, risk: 0.5, target: 0.5, pulse: 0 };
  }
  const recycleGroup = nodes.recycle.group;

  // Blind-spot fog over the untraced upstream
  const fog = new THREE.Group();
  const fogTex = softDotTexture();
  const fogSprites = [];
  for (let i = 0; i < 26; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, color: '#3a2a55', transparent: true, opacity: 0.5, depthWrite: false }));
    const cx = -14 + rand() * 9, cz = -8 + rand() * 9;
    sp.position.set(cx, 1 + rand() * 2.5, cz); const s = 5 + rand() * 5; sp.scale.set(s, s * 0.6, 1);
    sp.userData = { base: sp.position.clone(), ph: rand() * 6.28 };
    fog.add(sp); fogSprites.push(sp);
  }
  scene.add(fog);
  const fogLabelEl = document.createElement('div'); fogLabelEl.className = 'fog-label';
  fogLabelEl.innerHTML = '<b>BLIND SPOT</b><span>Origin of ore is untraced</span>';
  const fogLabel = new CSS2DObject(fogLabelEl); fogLabel.position.set(-13.5, 2.4, -3); scene.add(fogLabel);

  // Routes
  const routeDefs = [
    { from: 'asm', to: 'refinery', upstream: true, pts: [[-16, -1.8], [-11, -3], [-7, -2.8]] },
    { from: 'mine', to: 'refinery', upstream: true, pts: [[-10, -6.5], [-8, -4.5]] },
    { from: 'refinery', to: 'factory', pts: [[-3, -3.2], [-1.5, -4]] },
    { from: 'factory', to: 'port', pts: [[2.5, -1], [3.5, 3]] },
    { from: 'port', to: 'warehouse', sea: true, pts: [[6.4, 7.4], [9, 9.3], [11.8, 6.4]] },
    { from: 'warehouse', to: 'hq', pts: [[15.5, 2.5], [17.5, 0]] },
    { from: 'hq', to: 'recycle', circular: true, pts: [[20.6, 1.5]] },
    { from: 'recycle', to: 'refinery', circular: true, arc: true, pts: [[12, 14, 6], [0, 12, 2], [-4.5, 6, -2]] },
  ];
  const particleGeo = new THREE.SphereGeometry(0.11, 8, 6);
  const routes = routeDefs.map(def => {
    const a = POS[def.from].clone().setY(def.sea ? -0.3 : 0.25), b = POS[def.to].clone().setY(def.sea ? -0.3 : 0.25);
    const mids = def.pts.map(p => p.length === 3 ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p[0], def.sea ? -0.3 : 0.25, p[1]));
    const curve = new THREE.CatmullRomCurve3([a, ...mids, b]);
    const tubeMat = new THREE.MeshBasicMaterial({ color: '#3df0ff', transparent: true, opacity: 0.55 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, def.arc ? 0.05 : 0.06, 6), tubeMat);
    scene.add(tube);
    const n = def.arc ? 20 : Math.max(6, Math.round(curve.getLength() * 1.1));
    const pMat = new THREE.MeshBasicMaterial({ color: '#bffaff' });
    const inst = new THREE.InstancedMesh(particleGeo, pMat, n);
    inst.frustumCulled = false; scene.add(inst);
    return { ...def, curve, tube, tubeMat, inst, pMat, n, offset: rand() };
  });

  // Ship
  const ship = new THREE.Group();
  ship.add(mesh(box(1.8, 0.35, 0.6), mat('#2d3748'), { y: 0 }));
  ship.add(mesh(box(0.4, 0.4, 0.5), mat('#e2e8f0'), { x: -0.6, y: 0.35 }));
  for (let i = 0; i < 3; i++) ship.add(mesh(box(0.3, 0.22, 0.45), mat(['#e53e3e', '#3182ce', '#d69e2e'][i]), { x: -0.1 + i * 0.33, y: 0.28 }));
  scene.add(ship);
  const seaRoute = routes.find(r => r.sea);
  let shipT = 0, shipDir = 1;

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.55, 0.5, 0.78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Interaction
  const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  let downAt = null, hovered = null;
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false).find(h => nodes[h.object.userData.nodeId]?.group.scale.x > 0.5);
    return hit?.object.userData.nodeId || null;
  }
  const dom = labelRenderer.domElement;
  dom.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; stopTour(); });
  dom.addEventListener('pointerup', e => {
    if (!downAt) return; const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null;
    if (moved < 6) { const id = pick(e); if (id) onSelect?.(id); }
  });
  dom.addEventListener('pointermove', e => {
    const id = pick(e); if (id !== hovered) { hovered = id; dom.style.cursor = id ? 'pointer' : 'grab'; onHover?.(id); }
  });
  dom.addEventListener('wheel', stopTour, { passive: true });

  // Camera flights
  let flight = null;
  function flyTo(pos, target, dur = 1.6) {
    flight = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, t: 0, dur };
  }
  const OVERVIEW = { pos: new THREE.Vector3(1, 36, 47), target: new THREE.Vector3(0, -1, 2) };
  function overview(dur = 1.8) { flyTo(OVERVIEW.pos.clone(), OVERVIEW.target.clone(), dur); }
  function focus(id, dur = 1.5) {
    const p = POS[id]; if (!p) return;
    const dir = new THREE.Vector3(0.45, 0.62, 1).normalize();
    const dist = id === 'hq' ? 15 : 13;
    flyTo(p.clone().addScaledVector(dir, dist), p.clone().setY(1), dur);
  }
  function stopTour() { controls.autoRotate = false; }

  // State targets (lerped)
  const T = { trace: 0.15, env: 0.6, well: 0.3, protect: 0.1, speed: 0.6, recycle: 0, engage: 0, grievance: 0, lfp: 0, hr: 0.7, uncertainty: 0.3 };
  const V = { ...T };
  let selected = null;

  function update(state, metrics, risks) {
    for (const [id, r] of Object.entries(risks)) if (nodes[id]) nodes[id].target = r;
    const st = state.structure || {};
    Object.assign(T, {
      trace: metrics.traceCoverage / 100, env: metrics.envRisk / 100, well: metrics.wellbeing / 100,
      protect: state.protect / 5, hr: metrics.hrRisk / 100,
      speed: 0.35 + (state.deadline < 10 ? (10 - state.deadline) * 0.12 : 0) + state.cost / 400,
      recycle: st.recycled > 0 ? 1 : 0, engage: st.engageASM ? 1 : 0, grievance: st.grievance ? 1 : 0, lfp: st.lfp > 0 ? 1 : 0,
    });
  }
  function setLabels(fn) { for (const [id, n] of Object.entries(nodes)) fn(id, n.el); }
  function select(id) { selected = id; for (const [nid, n] of Object.entries(nodes)) n.el.classList.toggle('selected', nid === id); }
  function pulse(id) { if (nodes[id]) nodes[id].pulse = 1; }

  // Loop
  const clock = new THREE.Clock(); const dummy = new THREE.Object3D(); const tmpC = new THREE.Color();
  let elapsed = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
    const k = 1 - Math.exp(-dt * 2.2);
    for (const key in T) V[key] += (T[key] - V[key]) * k;

    if (flight) {
      flight.t += dt / flight.dur; const t = Math.min(flight.t, 1); const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(flight.p0, flight.p1, e); controls.target.lerpVectors(flight.t0, flight.t1, e);
      if (t >= 1) flight = null;
    }
    controls.update();
    waterMat.uniforms.uTime.value = elapsed;

    // nodes
    for (const [id, n] of Object.entries(nodes)) {
      n.risk += (n.target - n.risk) * k;
      riskColor(n.risk, tmpC);
      n.halo.material.color.copy(tmpC);
      const pul = 1 + Math.sin(elapsed * (2 + n.risk * 4)) * 0.04 * (0.4 + n.risk);
      n.halo.scale.setScalar(pul * (1 + n.pulse * 0.25));
      n.halo.material.opacity = 0.35 + n.risk * 0.45 + n.pulse * 0.4;
      n.beam.material.opacity = Math.min(0.45, (selected === id ? 0.25 : 0) + n.pulse * 0.4);
      n.pulse = Math.max(0, n.pulse - dt * 0.6);
      n.el.style.setProperty('--risk', `#${tmpC.getHexString()}`);
    }
    nodes.recycle.halo.visible = nodes.recycle.beam.visible = V.recycle > 0.3;
    nodes.recycle.label.visible = V.recycle > 0.3;

    // ASM: beacons, helmets, fence
    ctx.beacons.forEach((b, i) => { b.material.opacity = Math.max(0, V.hr - 0.2) * 1.3; b.position.y = 1.5 + Math.sin(elapsed * 3 + i) * 0.12; b.rotation.y += dt * 2; b.visible = V.hr > 0.22; });
    ctx.helmets.forEach((h, i) => { h.visible = (i / ctx.helmets.length) < V.protect * 1.4; });
    ctx.fence.scale.setScalar(Math.max(0.001, V.engage));
    // community
    ctx.winMat.emissiveIntensity = 0.1 + V.well * 1.6;
    ctx.clinic.scale.setScalar(Math.max(0.001, Math.min(1, V.protect * 1.6)));
    ctx.desk.scale.setScalar(Math.max(0.001, V.grievance)); ctx.desk.rotation.y += dt;
    // water/river/pond
    riverMat.color.copy(C.riverClean).lerp(C.riverDirty, Math.min(1, V.env * 1.4));
    ctx.pond.material.color.set('#2c6e7f').lerp(new THREE.Color('#9a7a2a'), V.env);
    ctx.well.material.color.copy(C.riverClean).lerp(C.riverDirty, V.env);
    // smoke
    const sm = ctx.smoke, pos = sm.points.geometry.attributes.position;
    const active = Math.floor(sm.N * Math.min(1, V.env * 1.3));
    for (let i = 0; i < sm.N; i++) {
      const s = sm.seeds[i]; const life = (elapsed * 0.25 + s) % 1; const stack = ctx.stacks[i % 2];
      pos.setXYZ(i, stack.x + life * 2.2 + Math.sin(s * 30 + elapsed) * 0.3 * life, stack.y + life * 3.5, stack.z + Math.cos(s * 20) * 0.5 * life);
    }
    pos.needsUpdate = true; sm.points.geometry.setDrawRange(0, active);
    sm.points.material.opacity = 0.25 + V.env * 0.5;
    // factory upgrades
    ctx.lfp.scale.setScalar(Math.max(0.001, V.lfp)); ctx.solar.scale.setScalar(Math.max(0.001, V.recycle));
    ctx.hqRing.rotation.z += dt * 0.6;
    recycleGroup.scale.setScalar(Math.max(0.001, V.recycle)); ctx.recycleLoop.rotation.z += dt * 1.5;

    // blind-spot fog
    const fogA = Math.max(0, 1 - V.trace * 1.15);
    fogSprites.forEach(sp => { sp.material.opacity = fogA * 0.55; const u = sp.userData; sp.position.x = u.base.x + Math.sin(elapsed * 0.3 + u.ph) * 0.6; sp.position.y = u.base.y + Math.sin(elapsed * 0.5 + u.ph) * 0.2; });
    fog.visible = fogA > 0.02;
    fogLabelEl.style.opacity = fogA > 0.25 ? Math.min(1, fogA * 1.3) : 0;

    // routes
    for (const r of routes) {
      const visible = r.circular ? V.recycle : 1;
      r.tube.visible = r.inst.visible = visible > 0.05;
      if (!r.tube.visible) continue;
      if (r.upstream) {
        tmpC.copy(C.dim).lerp(C.cyan, V.trace);
        r.tubeMat.color.copy(tmpC); r.pMat.color.copy(tmpC).lerp(new THREE.Color('#ffffff'), 0.3);
        r.tubeMat.opacity = 0.35 + V.trace * 0.4;
      } else if (r.circular) {
        r.tubeMat.color.copy(C.green); r.pMat.color.set('#c8ffe6'); r.tubeMat.opacity = 0.5 * visible;
      }
      const speed = (r.arc ? 0.05 : 0.12) * V.speed;
      for (let i = 0; i < r.n; i++) {
        const t = (i / r.n + elapsed * speed + r.offset) % 1;
        r.curve.getPointAt(t, dummy.position);
        dummy.scale.setScalar(r.upstream ? 0.8 + (1 - V.trace) * 0.4 : 1);
        dummy.updateMatrix(); r.inst.setMatrixAt(i, dummy.matrix);
      }
      r.inst.instanceMatrix.needsUpdate = true;
    }
    // ship ping-pong
    shipT += dt * 0.06 * V.speed * shipDir * 1.6;
    if (shipT > 1) { shipT = 1; shipDir = -1; } if (shipT < 0) { shipT = 0; shipDir = 1; }
    seaRoute.curve.getPointAt(shipT, ship.position); ship.position.y = -0.3 + Math.sin(elapsed * 2) * 0.03;
    const tan = seaRoute.curve.getTangentAt(shipT); ship.rotation.y = Math.atan2(-tan.z, tan.x) + (shipDir < 0 ? Math.PI : 0);

    composer.render();
    labelRenderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h); labelRenderer.setSize(w, h); composer.setSize(w, h); bloom.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  function intro() { camera.position.set(-70, 55, 75); flyTo(OVERVIEW.pos.clone(), OVERVIEW.target.clone(), 4.2); }
  function autoRotate(on) { controls.autoRotate = on; }

  requestAnimationFrame(frame);
  return { update, focus, overview, select, pulse, setLabels, intro, autoRotate, positions: POS };
}
