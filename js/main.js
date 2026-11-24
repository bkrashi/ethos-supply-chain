import { createScene } from './scene.js';
import { simulate, nodeRisk, riskLabel, NODES, ORIGINAL_STRATEGY } from './model.js';
import { EVIDENCE, EVIDENCE_TYPES, evidenceById, evidenceForNode } from './evidence.js';
import { AGENTS, AGENT_ORDER, PERSPECTIVES } from './agents/agents.js';
import { AgentCouncil, SimulatedProvider, RemoteProvider, IMPROVED_STRATEGY } from './agents/runtime.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (s) => ({ ...s, structure: { ...s.structure } });
const nodeById = Object.fromEntries(NODES.map(n => [n.id, n]));
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ─────────── Provider selection (simulation by default) ───────────
const params = new URLSearchParams(location.search);
const endpoint = params.get('agents');
const provider = endpoint ? new RemoteProvider(endpoint) : new SimulatedProvider();
const council = new AgentCouncil(provider);
const badge = $('#modeBadge');
badge.textContent = provider.live ? 'LIVE AGENTS' : 'SIMULATION';
badge.classList.toggle('live', provider.live);
badge.title = provider.live
  ? `Agents answered by ${endpoint}. Falls back to the simulation on error.`
  : 'Agents are a scripted, state-aware simulation. Add ?agents=<endpoint> to connect real AI agents.';

// ─────────── State ───────────
let state = clone(ORIGINAL_STRATEGY);
const baseline = simulate(ORIGINAL_STRATEGY);
let metrics = simulate(state);
let rebuilt = false;
let follow = true;
let selected = null;

const scene = createScene($('#world'), { onSelect: (id) => openInspector(id) });
scene.setLabels((id, el) => {
  $('.nl-name', el).textContent = nodeById[id].name;
  const types = [...new Set(evidenceForNode(id).map(e => e.type))];
  el.insertAdjacentHTML('beforeend', `<span class="nl-ev">${types.map(t => `<i class="${t}"></i>`).join('')}</span>`);
});

// ─────────── Sliders ───────────
const FORMAT = {
  cost: v => `${v}`,
  deadline: v => `${v} wks`,
  trace: v => `${v}`,
  protect: v => `${(+v).toFixed(1)}%`,
};
const sliders = $$('.slider').map(el => ({ el, key: el.dataset.key, input: $('input', el), out: $('output', el) }));
let pending = null;
sliders.forEach(s => {
  s.input.addEventListener('input', () => {
    const prevState = clone(state), prevMetrics = metrics;
    state[s.key] = +s.input.value;
    apply();
    setStep(Math.max(currentStep, rebuilt ? 3 : 1));
    clearTimeout(pending?.timer);
    const first = pending?.prev || { ...prevMetrics, state: prevState };
    pending = { prev: first, timer: setTimeout(() => { council.react({ state: clone(state), metrics, prev: first, changed: s.key }); pending = null; }, 700) };
  });
});

function syncSliders() {
  for (const s of sliders) { s.input.value = state[s.key]; s.out.textContent = FORMAT[s.key](state[s.key]); paintRange(s.input); }
}
function paintRange(input) {
  const p = (input.value - input.min) / (input.max - input.min) * 100;
  input.style.setProperty('--p', `${p}%`);
}

function strategyName() {
  const same = (a, b) => ['cost', 'deadline', 'trace', 'protect'].every(k => Math.abs(a[k] - b[k]) < 0.01);
  if (same(state, ORIGINAL_STRATEGY) && !state.structure.recycled) return ['Original', 'orig'];
  if (same(state, IMPROVED_STRATEGY) && state.structure.recycled) return ['Rebuilt', 'rebuilt'];
  return ['Custom', 'custom'];
}

const STRUCT_LABELS = {
  dualSource: 'Dual sourcing', engageASM: 'Formalised artisanal mining', grievance: 'Grievance channel',
  lfp: '30% LFP (cobalt-free) cells', recycled: '20% recycled cobalt',
};
function renderStructure() {
  const on = Object.entries(state.structure).filter(([, v]) => v);
  $('#structure').innerHTML = on.length
    ? `<span class="eyebrow">Structural changes from the council</span>` + on.map(([k]) => `<span class="pill">✦ ${STRUCT_LABELS[k]}</span>`).join('')
    : '';
}

// ─────────── Metrics ───────────
const METRICS = [
  { key: 'unitCost', label: 'Cost per pack', fmt: v => `$${v.toFixed(2)}`, better: 'low', max: 50 },
  { key: 'onTime', label: 'On-time delivery', fmt: v => `${v}%`, better: 'high', max: 100 },
  { key: 'traceCoverage', label: 'Traced to mine site', fmt: v => `${v}%`, better: 'high', max: 100 },
  { key: 'hrRisk', label: 'Human-rights risk', fmt: v => `${v}`, better: 'low', max: 100, band: true, risk: true },
  { key: 'envRisk', label: 'Environmental risk', fmt: v => `${v}`, better: 'low', max: 100, band: true, risk: true },
  { key: 'wellbeing', label: 'Community wellbeing', fmt: v => `${v}`, better: 'high', max: 100 },
];
function renderMetrics() {
  $('#metrics').innerHTML = METRICS.map(m => {
    const v = metrics[m.key], d = v - baseline[m.key];
    const good = m.better === 'low' ? d < 0 : d > 0;
    const dTxt = Math.abs(d) < 0.005 ? '·' : `${d > 0 ? '+' : '−'}${m.key === 'unitCost' ? '$' + Math.abs(d).toFixed(2) : Math.abs(Math.round(d))}`;
    const pct = Math.min(100, v / m.max * 100);
    const band = m.band ? metrics.uncertainty : 0;
    const level = m.risk ? riskLabel(v) : '';
    return `<div class="metric ${m.risk ? 'is-risk' : ''}" style="--p:${pct}%;--band:${band / m.max * 100}%">
      <div class="m-top"><span>${m.label}</span><em class="${Math.abs(d) < 0.005 ? '' : good ? 'up' : 'down'}">${dTxt}</em></div>
      <div class="m-val">${m.fmt(v)}${band ? `<small>±${band}</small>` : ''}${level ? `<b class="lvl lvl-${level.toLowerCase()}">${level}</b>` : ''}</div>
      <div class="m-bar ${m.better}"><i></i>${band ? '<s></s>' : ''}</div>
    </div>`;
  }).join('');
}

function apply() {
  metrics = simulate(state);
  syncSliders(); renderMetrics(); renderStructure();
  const [name, cls] = strategyName();
  const tag = $('#strategyTag'); tag.textContent = name; tag.className = `strategy-tag ${cls}`;
  const risks = nodeRisk(state, metrics);
  scene.update(state, metrics, risks);
  scene.setLabels((id, el) => { $('.nl-risk', el).textContent = riskLabel(Math.round(risks[id] * 100)); });
  if (selected) renderInspector(selected);
}

function animateTo(target, ms = 2400) {
  const from = clone(state); const t0 = performance.now();
  state.structure = { ...target.structure };
  return new Promise(res => {
    function step() {
      const t = Math.max(0, Math.min(1, (performance.now() - t0) / ms)); const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      for (const k of ['cost', 'deadline', 'trace', 'protect']) {
        const v = from[k] + (target[k] - from[k]) * e;
        state[k] = k === 'protect' ? Math.round(v * 10) / 10 : Math.round(v);
      }
      apply();
      t < 1 ? requestAnimationFrame(step) : res();
    }
    requestAnimationFrame(step);
  });
}

$('#btnReset').addEventListener('click', async () => {
  if (council.busy) return;
  await animateTo(ORIGINAL_STRATEGY, 1200);
  addSystem('Strategy reset to the original brief.');
});

// ─────────── Steps ───────────
let currentStep = 0;
function setStep(n) {
  currentStep = n;
  $$('#steps li').forEach((li, i) => { li.classList.toggle('active', i === n); li.classList.toggle('done', i < n); });
}

// ─────────── Council feed ───────────
const feed = $('#feed');
$('#roster').innerHTML = AGENT_ORDER.map(id => {
  const a = AGENTS[id];
  return `<div class="agent" data-agent="${id}" style="--c:${a.color}" title="${esc(a.objective)}">
    <span class="av">${a.glyph}</span><span class="an">${a.name}</span><span class="as">idle</span></div>`;
}).join('');
const KIND = { finding: 'Finding', concern: 'Concern', challenge: 'Challenge', reply: 'Reply', proposal: 'Proposal', support: 'Supports', dissent: 'Condition', consensus: 'Consensus', system: 'Council' };

function setAgentStatus(id, s) {
  const el = $(`.agent[data-agent="${id}"]`); if (!el) return;
  el.dataset.state = s; $('.as', el).textContent = s;
}
function scrollFeed() { feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' }); }

function addMessage(m) {
  const a = AGENTS[m.agent] || AGENTS.solutions;
  $('.typing', feed)?.remove();
  const ev = (m.evidence || []).filter(id => evidenceById[id]);
  const html = `<article class="msg kind-${m.kind}" style="--c:${a.color}">
    <div class="msg-av">${a.glyph}</div>
    <div class="msg-body">
      <header><b>${a.name}</b>${m.to && AGENTS[m.to] ? `<span class="to">→ ${AGENTS[m.to].name}</span>` : ''}<span class="kind">${KIND[m.kind] || m.kind}</span></header>
      <p>${esc(m.text)}</p>
      ${ev.length || m.focus ? `<footer>
        ${ev.map(id => `<button class="chip ${evidenceById[id].type}" data-ev="${id}">${EVIDENCE_TYPES[evidenceById[id].type].short} · ${id}</button>`).join('')}
        ${m.focus && nodeById[m.focus] ? `<button class="chip focus" data-node="${m.focus}">📍 ${esc(nodeById[m.focus].name)}</button>` : ''}
      </footer>` : ''}
    </div></article>`;
  feed.insertAdjacentHTML('beforeend', html);
  AGENT_ORDER.forEach(id => setAgentStatus(id, id === m.agent ? 'speaking' : (council.busy ? 'listening' : 'idle')));
  setTimeout(() => setAgentStatus(m.agent, council.busy ? 'listening' : 'idle'), 2500);
  if (m.focus) { scene.pulse(m.focus); if (follow && council.busy) scene.focus(m.focus); }
  scrollFeed();
}
function addSystem(text) {
  feed.insertAdjacentHTML('beforeend', `<div class="sysline">${esc(text)}</div>`); scrollFeed();
}
function addTyping(agent) {
  $('.typing', feed)?.remove();
  const a = AGENTS[agent];
  feed.insertAdjacentHTML('beforeend', `<div class="typing" style="--c:${a.color}"><span>${a.glyph}</span>${a.name} is thinking<i></i><i></i><i></i></div>`);
  setAgentStatus(agent, 'thinking'); scrollFeed();
}
function addOptions(options) {
  options = options.map(o => ({ blurb: '', hidden: '', ...o, metrics: o.metrics || simulate({ ...ORIGINAL_STRATEGY, ...o }) }));
  const rows = [
    ['Cost / pack', o => `$${o.metrics.unitCost.toFixed(2)}`],
    ['On-time', o => `${o.metrics.onTime}%`],
    ['Traced', o => `${o.metrics.traceCoverage}%`],
    ['Human-rights risk', o => o.metrics.hrRisk],
    ['Env. risk', o => o.metrics.envRisk],
    ['Wellbeing', o => o.metrics.wellbeing],
  ];
  feed.insertAdjacentHTML('beforeend', `<div class="options-card">
    <div class="oc-head"><b>Strategy options</b><span class="sim-chip">SIMULATED</span></div>
    <div class="oc-grid">
      ${options.map(o => `<div class="oc-opt ${o.name.startsWith('C') ? 'best' : ''}"><h4>${esc(o.name)}</h4><p>${esc(o.blurb)}</p><p class="hidden-cost">⚠ ${esc(o.hidden)}</p></div>`).join('')}
    </div>
    <table><tbody>${rows.map(([l, f]) => `<tr><th>${l}</th>${options.map(o => `<td>${f(o)}</td>`).join('')}</tr>`).join('')}</tbody></table>
  </div>`);
  scrollFeed();
}
function addVotes(votes) {
  const sym = { support: '✓', object: '✕', conditional: '◐' };
  feed.insertAdjacentHTML('beforeend', `<div class="votes-card">
    <div class="oc-head"><b>Each agent scores the options against its own objective</b></div>
    <table><thead><tr><th></th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>
    ${AGENT_ORDER.map(id => `<tr><th style="color:${AGENTS[id].color}">${AGENTS[id].glyph} ${AGENTS[id].name}</th>${(votes[id] || []).map(v => `<td class="v-${v}">${sym[v]}</td>`).join('')}</tr>`).join('')}
    </tbody></table><p class="fine">✓ supports · ◐ supports with conditions · ✕ objects</p></div>`);
  scrollFeed();
}

feed.addEventListener('click', e => {
  const ev = e.target.closest('[data-ev]'); if (ev) return openEvidence(ev.dataset.ev);
  const n = e.target.closest('[data-node]'); if (n) { scene.focus(n.dataset.node); openInspector(n.dataset.node); }
});

council.on(ev => {
  switch (ev.type) {
    case 'start': document.body.classList.add('deliberating'); $$('#phases li').forEach(li => li.className = ''); break;
    case 'typing': addTyping(ev.agent); break;
    case 'message': addMessage(ev.message); break;
    case 'phase': $$('#phases li').forEach((li, i) => { li.className = i + 1 < ev.phase ? 'done' : i + 1 === ev.phase ? 'active' : ''; }); addSystem(`Phase ${ev.phase} · ${ev.label}`); break;
    case 'options': addOptions(ev.options); break;
    case 'votes': addVotes(ev.votes); break;
    case 'apply': animateTo({ ...IMPROVED_STRATEGY, ...ev.strategy }, 2600); scene.overview(2.4); break;
    case 'done': rebuilt = true; $('#btnCompare').disabled = false; setStep(3); $$('#phases li').forEach(li => li.className = 'done'); break;
    case 'end':
      document.body.classList.remove('deliberating'); $('.typing', feed)?.remove();
      AGENT_ORDER.forEach(id => setAgentStatus(id, 'idle'));
      $('#btnRebuild .rb-text').textContent = 'Rebuild again';
      if (rebuilt) { addSystem('Rebuild complete. Open Before / after to compare the two strategies.'); $('#btnCompare').classList.add('nudge'); }
      break;
  }
});

$('#btnFollow').addEventListener('click', e => {
  follow = !follow; e.currentTarget.setAttribute('aria-pressed', follow);
  e.currentTarget.textContent = follow ? '📍 camera follows' : '📍 camera free';
});

// ─────────── Rebuild ───────────
async function rebuild(pace = 1) {
  if (council.busy) return;
  closeInspector(); closeModal();
  setStep(2);
  $('#btnRebuild').classList.add('running');
  $('#btnRebuild .rb-text').textContent = 'Agents deliberating…';
  await council.rebuild({ state: clone(state), metrics }, { pace });
  $('#btnRebuild').classList.remove('running');
}
$('#btnRebuild').addEventListener('click', () => rebuild());

// ─────────── Inspector ───────────
const inspector = $('#inspector');
function openInspector(id) {
  selected = id; scene.select(id); renderInspector(id); inspector.classList.remove('hidden');
}
function closeInspector() { selected = null; scene.select(null); inspector.classList.add('hidden'); }
function renderInspector(id) {
  const n = nodeById[id]; const r = Math.round(nodeRisk(state, metrics)[id] * 100);
  const persp = PERSPECTIVES[id] || {};
  const ev = evidenceForNode(id).filter(e => e.type !== 'simulated');
  inspector.innerHTML = `
    <button class="close" data-close-insp>×</button>
    <span class="eyebrow">${esc(n.tier)} · ${esc(n.kind)}</span>
    <h3>${esc(n.name)}</h3>
    <div class="insp-tags"><span class="fiction-tag">fictional site</span><span class="sim-chip">SIMULATED risk ${r} · ${riskLabel(r)}</span></div>
    <div class="gauge" style="--p:${r}%"><i></i></div>
    ${Object.keys(persp).length ? `<h4>What the agents see here</h4>
      <ul class="persp">${Object.entries(persp).map(([a, t]) => `<li style="--c:${AGENTS[a].color}"><b>${AGENTS[a].glyph} ${AGENTS[a].name}</b>${esc(t)}</li>`).join('')}</ul>` : ''}
    <h4>Evidence linked to this node</h4>
    <div class="cards">${ev.map(cardHTML).join('') || '<p class="fine">No evidence linked.</p>'}</div>`;
}
inspector.addEventListener('click', e => {
  if (e.target.closest('[data-close-insp]')) return closeInspector();
  const ev = e.target.closest('[data-ev]'); if (ev) openEvidence(ev.dataset.ev);
});

function cardHTML(e) {
  const t = EVIDENCE_TYPES[e.type];
  return `<article class="ev-card ${e.type}" data-ev="${e.id}">
    <header><span class="ev-type">${t.short}</span><span class="ev-id">${e.id}</span></header>
    <h5>${esc(e.title)}</h5>
    ${e.source ? `<p class="ev-src">${esc(e.source)}</p>` : e.type === 'suspected' ? `<p class="ev-src">Inferred${e.basis?.length ? ' from ' + e.basis.join(', ') : ' from sector patterns'}. Not confirmed.</p>` : ''}
  </article>`;
}

// ─────────── Modals ───────────
const modal = $('#modal'), modalBody = $('#modalBody');
function openModal(html, cls = '') { modalBody.innerHTML = html; modal.className = `modal ${cls}`; }
function closeModal() { modal.className = 'modal hidden'; }
modal.addEventListener('click', e => {
  if (e.target === modal || e.target.closest('[data-close]')) return closeModal();
  const ev = e.target.closest('[data-ev]'); if (ev && !e.target.closest('a')) openEvidence(ev.dataset.ev);
  const show = e.target.closest('[data-show]'); if (show) { animateTo(show.dataset.show === 'orig' ? ORIGINAL_STRATEGY : IMPROVED_STRATEGY, 1600); closeModal(); scene.overview(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeInspector(); } });

function openEvidence(id) {
  const e = evidenceById[id]; const t = EVIDENCE_TYPES[e.type];
  openModal(`<div class="ev-detail ${e.type}">
    <span class="ev-type big">${t.label}</span><span class="ev-id">${e.id}</span>
    <h2>${esc(e.title)}</h2>
    <p>${esc(e.body)}</p>
    ${e.quote ? `<blockquote>${esc(e.quote)}</blockquote>` : ''}
    ${e.source ? `<p class="ev-src">Source: <a href="${e.url}" target="_blank" rel="noopener">${esc(e.source)} ↗</a>${e.url2 ? ` · <a href="${e.url2}" target="_blank" rel="noopener">FAQ ↗</a>` : ''}</p>` : ''}
    ${e.basis?.length ? `<p class="ev-src">Inferred from: ${e.basis.map(b => `<button class="chip verified" data-ev="${b}">VERIFIED · ${b}</button>`).join(' ')}</p>` : ''}
    <p class="ev-note">${esc(t.desc)}</p>
  </div>`, 'narrow');
}

$('#btnEvidence').addEventListener('click', () => {
  const groups = Object.keys(EVIDENCE_TYPES).map(type => `
    <section class="locker-group ${type}">
      <h3><span class="ev ${type}">${EVIDENCE_TYPES[type].label}</span></h3>
      <p class="fine">${EVIDENCE_TYPES[type].desc}</p>
      <div class="cards">${EVIDENCE.filter(e => e.type === type).map(cardHTML).join('')}</div>
    </section>`).join('');
  openModal(`<h2>Evidence locker</h2>
    <p class="lede">ETHOS separates what is <b>known</b>, what is <b>suspected</b>, what is <b>missing</b> and what is <b>simulated</b>. Verified facts describe countries and sectors. They are never attributed to the fictional suppliers in this scenario.</p>
    <div class="locker">${groups}</div>`, 'wide');
});

$('#btnCompare').addEventListener('click', () => { setStep(3); $('#btnCompare').classList.remove('nudge'); openCompare(); });
function openCompare() {
  const A = baseline, B = simulate(IMPROVED_STRATEGY);
  const row = (m) => {
    const a = A[m.key], b = B[m.key]; const max = m.max;
    const better = m.better === 'low' ? b < a : b > a;
    return `<div class="cmp-row">
      <span class="cmp-l">${m.label}</span>
      <div class="cmp-bars"><div class="cmp-bar orig" style="--p:${a / max * 100}%"><b>${m.fmt(a)}</b></div><div class="cmp-bar new" style="--p:${b / max * 100}%"><b>${m.fmt(b)}</b></div></div>
      <span class="cmp-d ${better ? 'up' : 'down'}">${better ? '▲ better' : '▼ worse'}</span></div>`;
  };
  const dc = B.unitCost - A.unitCost;
  openModal(`<div class="cmp-head"><div><span class="eyebrow">Before / after</span><h2>Same product. A different story.</h2></div><span class="sim-chip">ALL FIGURES SIMULATED</span></div>
    <div class="cmp-legend"><span class="orig">Original strategy</span><span class="new">Rebuilt by the council</span></div>
    ${METRICS.map(row).join('')}
    <div class="cmp-cols">
      <div><h4>Original brief</h4><ul>
        <li>Cost pressure ${ORIGINAL_STRATEGY.cost}/100</li><li>${ORIGINAL_STRATEGY.deadline}-week delivery window</li>
        <li>Tier-1 paperwork only (trace ${ORIGINAL_STRATEGY.trace})</li><li>${ORIGINAL_STRATEGY.protect}% for worker protection</li></ul></div>
      <div><h4>Rebuilt strategy</h4><ul>
        <li>Cost pressure ${IMPROVED_STRATEGY.cost}/100, with a quarterly review</li><li>${IMPROVED_STRATEGY.deadline}-week window and dual sourcing</li>
        <li>Mine-site chain of custody through the refiner</li><li>${IMPROVED_STRATEGY.protect}% protection fund: PPE, wages, school stipend</li>
        <li>Artisanal mining formalised instead of abandoned</li><li>30% LFP cells · 20% recycled cobalt · grievance channel</li></ul></div>
      <div><h4>Still unknown</h4><ul>
        ${['M1', 'M2', 'M3', 'M4'].map(id => `<li><button class="chip missing" data-ev="${id}">MISSING · ${id}</button> ${esc(evidenceById[id].title)}</li>`).join('')}</ul></div>
    </div>
    <p class="cmp-take"><b>Commercial viability (simulated):</b> ${dc >= 0 ? '+' : '−'}$${Math.abs(dc).toFixed(2)} per pack (${(dc / A.unitCost * 100).toFixed(1)}%), while on-time delivery rises from ${A.onTime}% to ${B.onTime}%. The improvement is a model projection. It becomes real only when on-site evidence confirms it.</p>
    <div class="cmp-actions"><button class="ghost" data-show="orig">Show original in the twin</button><button class="ghost" data-show="new">Show rebuilt in the twin</button></div>`, 'wide');
}

$('#btnAbout').addEventListener('click', () => openModal(`<h2>About ETHOS</h2>
  <p class="lede">ETHOS is an educational simulation. It explores how collaborating AI agents with different objectives could help a company prevent human-rights abuses and environmental damage in its supply chain, while staying commercially viable.</p>
  <h4>Ground rules</h4>
  <ul class="rules">
    <li><b>No invented evidence about real actors.</b> Lumen Devices and every supplier, site, village and person are fictional.</li>
    <li><b>Verified facts</b> come only from public ILO and U.S. Department of Labor publications, and describe countries and sectors.</li>
    <li><b>Suspected risks</b> are inferences about fictional suppliers. They are not findings.</li>
    <li><b>Simulated outcomes</b> come from a simple, transparent model (<code>js/model.js</code>) meant to show trade-offs. They are not predictions.</li>
  </ul>
  <h4>Agents</h4>
  <ul class="rules">${AGENT_ORDER.map(id => `<li><b style="color:${AGENTS[id].color}">${AGENTS[id].glyph} ${AGENTS[id].name}</b>: ${esc(AGENTS[id].objective)}</li>`).join('')}</ul>
  <p class="fine">Mode: <b>${provider.live ? 'Live agents' : 'Simulation'}</b>. The agent runtime uses a provider interface. Add <code>?agents=https://your-endpoint</code> to route agents to a real LLM backend (see README).</p>`, 'narrow'));

// ─────────── Guided demo (~3 minutes) ───────────
const caption = $('#caption');
let demoRun = 0;
function say(text) { caption.innerHTML = text; caption.classList.remove('hidden'); }
async function demo() {
  const run = ++demoRun; const alive = () => run === demoRun;
  $('#intro').classList.add('gone'); closeModal(); closeInspector();
  $('#btnDemo').textContent = '■ Stop demo';
  if (rebuilt || strategyName()[1] !== 'orig') { await animateTo(ORIGINAL_STRATEGY, 800); }
  const steps = [
    [() => { setStep(0); scene.overview(2.5); scene.autoRotate(true); }, '<b>This is a digital twin</b> of the battery supply chain behind Lumen Devices, a fictional electronics brand. Ore travels from mines to a refiner, a cell factory and a port, then to Lumen.', 11000],
    [() => { scene.autoRotate(false); scene.focus('hq'); }, 'Lumen’s original brief is simple: <b>the lowest possible price</b> and <b>delivery in six weeks</b>. The paperwork covers only its direct suppliers.', 9000],
    [() => { scene.focus('refinery'); openInspector('refinery'); }, 'Visibility ends here, at the refiner. Ore from many sites is blended, and beyond this point is a <b>blind spot</b>.', 10000],
    [() => { scene.focus('asm'); openInspector('asm'); }, 'Upstream, the <b>U.S. Department of Labor</b> documents child labour in cobalt mining in the region. That is a <span class="ev verified">verified</span> country-level fact. For our fictional supplier it remains a <span class="ev suspected">suspected</span> risk.', 13000],
    [async () => { closeInspector(); scene.overview(); setStep(1); await wait(800);
      const prev = { ...metrics, state: clone(state) };
      await animateTo({ ...state, deadline: 4, cost: 95 }, 2200);
      council.react({ state: clone(state), metrics, prev, changed: 'deadline' }); }, '<b>Stress test:</b> the board demands even cheaper batteries, even faster. Watch the risk halos turn red and the smoke thicken. Every number here is <span class="ev simulated">simulated</span>.', 11000],
    [async () => { await animateTo(ORIGINAL_STRATEGY, 1200); }, 'Now we hand the problem to six AI agents with <b>competing objectives</b>. They will challenge each other before they agree.', 6000],
    [async () => { caption.classList.add('hidden'); await rebuild(0.8); }, null, 0],
    [async () => { scene.overview(); openCompare(); }, '<b>Same product, different story.</b> The rebuilt strategy costs a little more, delivers more reliably and lowers simulated harm. What is still unknown is listed openly.', 14000],
  ];
  for (const [fn, text, ms] of steps) {
    if (!alive()) return;
    if (text) say(text);
    await fn();
    if (ms) await wait(ms);
  }
  if (alive()) { caption.classList.add('hidden'); $('#btnDemo').textContent = '▶ Guided demo'; demoRun++; }
}
$('#btnDemo').addEventListener('click', () => {
  if ($('#btnDemo').textContent.startsWith('■')) { demoRun++; caption.classList.add('hidden'); $('#btnDemo').textContent = '▶ Guided demo'; scene.autoRotate(false); return; }
  demo();
});

// ─────────── Intro ───────────
function enter() {
  $('#intro').classList.add('gone'); scene.intro();
  setTimeout(() => {
    addSystem('Council online. Six agents are monitoring the original strategy.');
    council.react({ state, metrics, prev: { ...metrics, state: clone(state) }, changed: 'trace' });
  }, 1800);
}
$('#btnStart').addEventListener('click', enter);
$('#btnStartDemo').addEventListener('click', () => { scene.intro(); setTimeout(demo, 600); });

apply();

// Presenter shortcuts: ?skipintro skips the title card, ?demo starts the guided demo, ?rebuild runs the council at once.
if (params.has('skipintro') || params.has('rebuild')) { $('#intro').classList.add('gone'); scene.overview(0.1); }
if (params.has('rebuild')) setTimeout(() => rebuild(0.3), 500);
if (params.has('compare')) { $('#intro').classList.add('gone'); openCompare(); }
if (params.has('inspect')) { $('#intro').classList.add('gone'); openInspector(params.get('inspect') || 'asm'); }
if (params.has('demo')) { scene.intro(); setTimeout(demo, 600); }
