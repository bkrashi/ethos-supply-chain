// Chapter 3: the agent council as a living network around a shared evidence store.
export const AGENTS = {
  investigation: { name: 'Investigation', glyph: '⌕', role: 'Retrieves and checks evidence' },
  humanrights:   { name: 'Human Rights', glyph: '♡', role: 'Protects workers and children' },
  environment:   { name: 'Environment', glyph: '❦', role: 'Protects water, land and climate' },
  procurement:   { name: 'Procurement', glyph: '⇄', role: 'Keeps supply affordable and on time' },
  solutions:     { name: 'Solutions', glyph: '✦', role: 'Designs a strategy everyone can accept' },
  compliance:    { name: 'Compliance', glyph: '§', role: 'Checks due diligence and disclosure' },
};
const ORDER = ['investigation', 'humanrights', 'environment', 'procurement', 'solutions', 'compliance'];
const STANCE = { support: 'Supports', 'support with conditions': 'Supports, with conditions', object: 'Objects' };

/** Build the replay timeline for one business priority from the recorded (or live) rounds. */
export function buildTimeline({ caseData, r1, r2, r3, r4, priority }) {
  const by = (arr, id) => arr.find(a => a.agent === id);
  const hr = by(r1, 'humanrights'), env = by(r1, 'environment'), comp = by(r1, 'compliance');
  const s = r3.strategies[priority];
  const pick = (arr, i) => (arr && (arr[i] || arr[0])) || { text: '', evidence: [] };
  const T = [];
  const phase = (label) => T.push({ type: 'phase', label });
  const say = (agent, text, evidence = [], extra = {}) => T.push({ type: 'say', agent, text, evidence, ...extra });

  phase('1 · Investigate');
  say('investigation', 'I followed cobalt from Tenke Fungurume. Company filings show CMOC owns 80% of the mine and all of the trader IXM.', ['D1', 'D2'], { flow: 'in', nodes: ['tfm', 'cmoc', 'ixm'] });
  say('investigation', 'Trade records show the mine sending cobalt hydroxide to IXM-named companies in Tanzania. After that, the trail goes cold.', ['T1', 'M1'], { flow: 'in', nodes: ['ixm', 'refiners'] });
  say('investigation', 'Screening tools flag this cobalt because DR Congo cobalt is on the U.S. Labor Department list. That is a warning about the country, not a finding about this mine.', ['K1', 'K2'], { flow: 'in' });

  phase('2 · Examine independently');
  for (const [id, a, i] of [['humanrights', hr, 1], ['environment', env, 0], ['compliance', comp, 1]]) { const f = pick(a?.findings, i); if (f.text) say(id, f.text, f.evidence, { flow: 'out' }); }

  phase('3 · Challenge');
  const c1 = pick(hr?.challenges, 0); if (c1.text) say('humanrights', c1.text, c1.evidence, { to: c1.target in AGENTS ? c1.target : 'investigation', kind: 'challenge' });
  if (/I2/.test(c1.text || '')) say('investigation', 'Fair point. I have withdrawn that inference, and the refiner’s country is now marked unknown.', ['I2'], { kind: 'revised', nodes: ['refiners'] });
  const c2 = pick(r2?.challenges, 0); if (c2.text) say('procurement', c2.text, c2.evidence, { to: c2.target in AGENTS ? c2.target : 'humanrights', kind: 'challenge' });
  const c3 = pick(env?.challenges, 1); if (c3.text) say('environment', c3.text, c3.evidence, { to: c3.target in AGENTS ? c3.target : 'procurement', kind: 'challenge' });

  phase('4 · Weigh the trade-offs');
  say('procurement', r2.priority_views[priority], ['D3'], { kind: 'priority' });

  phase('5 · Propose');
  say('solutions', `${s.headline}. ${s.summary}`, [...new Set(s.actions.flatMap(a => a.evidence))].slice(0, 4), { kind: 'proposal' });

  phase('6 · Review');
  for (const id of ['humanrights', 'environment', 'compliance']) {
    const v = by(r4, id)?.verdicts?.[priority]; if (!v) continue;
    say(id, v.text, [], { to: 'solutions', kind: v.stance === 'object' ? 'challenge' : 'review', stance: STANCE[v.stance] || v.stance });
  }
  T.push({ type: 'decision', priority });
  return T;
}

export function createCouncil(el) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 800 620'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Six AI agents arranged around a shared evidence store');
  el.appendChild(svg);
  const C = { x: 400, y: 310 }, RAD = 225;
  const pos = {};
  ORDER.forEach((id, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; pos[id] = { x: C.x + Math.cos(a) * RAD, y: C.y + Math.sin(a) * RAD }; });
  const mk = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };

  const linkLayer = mk('g', {}); const tokenLayer = mk('g', {});
  const links = {};
  for (const id of ORDER) links[id] = mk('line', { class: 'link', x1: C.x, y1: C.y, x2: pos[id].x, y2: pos[id].y }, linkLayer);
  // ring between neighbours
  ORDER.forEach((id, i) => { const n = ORDER[(i + 1) % 6]; mk('line', { class: 'link', x1: pos[id].x, y1: pos[id].y, x2: pos[n].x, y2: pos[n].y, opacity: .5 }, linkLayer); });
  const challenge = mk('path', { class: 'link challenge', d: '', opacity: 0 }, linkLayer);

  const store = mk('g', { class: 'store' });
  mk('circle', { cx: C.x, cy: C.y, r: 56 }, store);
  mk('text', { x: C.x, y: C.y - 4 }, store).textContent = 'Shared';
  mk('text', { x: C.x, y: C.y + 14 }, store).textContent = 'evidence store';
  const storeCount = mk('text', { x: C.x, y: C.y + 34, style: 'font-size:11px;fill:#CFAA6B' }, store);

  const nodes = {};
  for (const id of ORDER) {
    const g = mk('g', { class: 'agent-node', transform: `translate(${pos[id].x},${pos[id].y})`, tabindex: 0 });
    mk('circle', { class: 'halo', r: 48 }, g);
    mk('circle', { class: 'core', r: 36 }, g);
    mk('text', { class: 'glyph', y: 7 }, g).textContent = AGENTS[id].glyph;
    const below = pos[id].y > C.y + 10 || Math.abs(pos[id].y - C.y) < 10;
    mk('text', { y: below ? 66 : -56 }, g).textContent = AGENTS[id].name;
    mk('text', { y: below ? 84 : -74, style: 'font-size:11.5px;opacity:.7' }, g).textContent = AGENTS[id].role;
    nodes[id] = g;
  }

  const seen = new Set();
  function setActive(id, kind) {
    for (const [k, g] of Object.entries(nodes)) { g.classList.toggle('active', k === id); g.classList.toggle('challenging', k === id && kind === 'challenge'); }
    for (const [k, l] of Object.entries(links)) l.classList.toggle('hot', k === id);
  }
  function showChallenge(from, to) {
    if (!from || !to) { challenge.setAttribute('opacity', 0); return; }
    const a = pos[from], b = pos[to]; const mx = (a.x + b.x) / 2 + (C.x - (a.x + b.x) / 2) * 0.6, my = (a.y + b.y) / 2 + (C.y - (a.y + b.y) / 2) * 0.6;
    challenge.setAttribute('d', `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`); challenge.setAttribute('opacity', 1);
  }
  function token(evId, evClass, from, to) {
    const g = mk('g', { class: `token ${evClass || 'documentary'}` }, tokenLayer);
    mk('circle', { r: 13 }, g); mk('text', {}, g).textContent = evId;
    const a = from === 'store' ? C : pos[from], b = to === 'store' ? C : pos[to];
    const t0 = performance.now(), dur = 1100 + Math.random() * 300;
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      g.setAttribute('transform', `translate(${a.x + (b.x - a.x) * e},${a.y + (b.y - a.y) * e})`);
      g.style.opacity = t > .85 ? (1 - t) / .15 : 1;
      if (t < 1) requestAnimationFrame(step); else { g.remove(); if (to === 'store') { seen.add(evId); storeCount.textContent = `${seen.size} items`; } }
    })(t0);
  }
  function reset() { seen.clear(); storeCount.textContent = ''; setActive(null); showChallenge(); tokenLayer.innerHTML = ''; }
  return { setActive, showChallenge, token, reset };
}
