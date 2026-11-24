// ETHOS v2 — story controller.
import { AGENTS, buildTimeline, createCouncil } from './v2/council.js';
import { searchEntities, health, runCouncil, apiBase } from './v2/api.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ORDER = ['prologue', 'product', 'journey', 'intervention', 'future'];
const EV_LABEL = { documentary: 'Documented', indicator: 'Risk indicator', inference: 'Inference', missing: 'Missing', simulated: 'Simulated' };
const PRIORITY_LABEL = { cost: 'Lowest cost', speed: 'Fastest delivery', responsible: 'Responsible sourcing' };

// ─────────── Data ───────────
const J = async (p, tries = 3) => { for (let i = 0; ; i++) { try { const r = await fetch(p); if (!r.ok) throw new Error(`${p}: ${r.status}`); return await r.json(); } catch (e) { if (i >= tries - 1) { document.body.insertAdjacentHTML('beforeend', `<p class="notice" style="position:fixed;left:24px;bottom:24px;z-index:50;background:#101D18">ETHOS could not load its evidence files (${esc(e.message)}). Please reload.</p>`); throw e; } await wait(400 * (i + 1)); } } };
const [caseData, run, r1, r2, r3, r4] = await Promise.all([
  J('data/case-tfm.json'), J('data/council/run.json'), J('data/council/round1.json'),
  J('data/council/round2.json'), J('data/council/round3.json'), J('data/council/round4.json'),
]);
const EV = Object.fromEntries(caseData.evidence.map(e => [e.id, e]));
const NODE = Object.fromEntries(caseData.nodes.map(n => [n.id, n]));
let rounds = { r1, r2, r3, r4 };
let source = { kind: 'recorded', label: `Recorded AI council run · ${run.date} · ${run.model} · independent agent instances, replayed` };
let priority = 'responsible';
let live = { ok: false };

// ─────────── Evidence cards ───────────
function card(e, { open = false } = {}) {
  const urls = [e.url, e.url2].filter(Boolean);
  return `<article class="card ${e.class}${open ? ' open' : ''}" data-ev="${e.id}" tabindex="0">
    <span class="ev ${e.class}">${EV_LABEL[e.class]} · ${e.id}</span>
    <h4>${esc(e.title)}</h4>
    <p>${esc(e.text)}</p>
    <div class="more">
      ${e.quote ? `<blockquote>${esc(e.quote)}</blockquote>` : ''}
      ${e.revision ? `<p><b>Revised after a challenge from ${esc(AGENTS[e.revision.challenged_by]?.name)}:</b> ${esc(e.revision.reason)}</p>` : ''}
      ${e.basis ? `<p class="src">Based on: ${e.basis.join(', ')}</p>` : ''}
      ${e.source ? `<p class="src">${esc(e.source)}${e.licensed ? ' · <span class="lic">licensed data, records not republished</span>' : ''}${e.retrieved ? ` · retrieved ${e.retrieved}` : ''}</p>` : ''}
      ${urls.map(u => `<p class="src"><a href="${u}" target="_blank" rel="noopener">${esc(new URL(u).hostname)} ↗</a></p>`).join('')}
    </div>
  </article>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('.card'); if (c && !e.target.closest('a')) c.classList.toggle('open');
  const chip = e.target.closest('[data-chip]'); if (chip) showEvidence(chip.dataset.chip);
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList?.contains('card')) e.target.classList.toggle('open'); });

// ─────────── Chapter navigation ───────────
let current = 'prologue';
let phone, globe, council;
const loaders = {};
async function ensurePhone() { if (!phone) { const m = await import('./v2/phone.js'); phone = m.createPhone({ onSelect: id => showPart(id) }); loaders.PARTS = m.PARTS; renderParts(); } return phone; }
async function ensureGlobe() { if (!globe) { const m = await import('./v2/globe.js'); globe = m.createGlobe($('#globeCanvas'), caseData, { onSelect: id => openNode(id) }); } return globe; }

async function go(id) {
  if (!ORDER.includes(id)) return;
  const prev = current; current = id;
  $$('.chapter').forEach(s => s.classList.toggle('active', s.id === id));
  document.body.dataset.ch = id;
  const idx = ORDER.indexOf(id);
  $$('.chapters button').forEach((b, i) => { b.classList.toggle('active', i + 1 === idx); b.classList.toggle('done', i + 1 < idx); });
  $('#count').textContent = `${idx} / 4`;
  if (id === 'prologue' || id === 'product') { const p = await ensurePhone(); p.mount(id === 'prologue' ? $('#heroCanvas') : $('#phoneCanvas'), id === 'product' ? 'explore' : 'hero'); }
  else phone?.stop();
  if (id === 'journey') { (await ensureGlobe()).start(); } else globe?.stop();
  if (id === 'intervention' && !council) { council = createCouncil($('#council')); renderRunLabel(); }
  if (id === 'future') renderFuture();
  history.replaceState(null, '', `#${id}`);
  if (document.body.classList.contains('present') && prev !== id) presentBeats(id);
}
const step = (d) => go(ORDER[Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(current) + d))]);
$$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));

// ─────────── Chapter 1 ───────────
function renderParts() {
  $('#parts').innerHTML = loaders.PARTS.map(p => `<li><button data-part="${p.id}">${p.name}</button></li>`).join('');
  $('#parts').addEventListener('click', e => { const b = e.target.closest('[data-part]'); if (b) { phone.select(b.dataset.part); showPart(b.dataset.part); } });
  $('#partCard').innerHTML = `<p class="fineprint">Tip: the battery is where our story begins.</p>`;
}
function showPart(id) {
  const p = loaders.PARTS.find(x => x.id === id);
  $$('#parts button').forEach(b => b.classList.toggle('on', b.dataset.part === id));
  $('#product .question').hidden = true;
  $('#partCard').innerHTML = `<h3>${p.name}</h3>
    <ul class="materials">${p.materials.map(([m, why, flag]) => `<li class="${flag ? 'flag' : ''}"><b>${m}</b> <span class="fineprint">${why}</span></li>`).join('')}</ul>
    <p class="fineprint" style="color:var(--ink-2)">${p.note}</p>
    ${p.lead ? `<button class="btn ghost" data-go-journey style="margin-top:10px">Follow the cobalt →</button>` : ''}`;
  $('[data-go-journey]')?.addEventListener('click', () => go('journey'));
}

// ─────────── Chapter 2 ───────────
const routeOrder = ['tfm', 'ixm', 'brunp', 'cells', 'phone', 'you'];
$('#route').innerHTML = routeOrder.map((id, i) => {
  const n = NODE[id];
  return `${i ? `<span class="sep ${n.status === 'unknown' ? 'unknown' : ''}"></span>` : ''}<button data-node="${id}"><span class="dot ${n.status}"></span>${esc(n.short || n.name)}</button>`;
}).join('') + `<span class="sep"></span><button data-node="cmoc"><span class="dot"></span>CMOC</button><button data-node="catl"><span class="dot"></span>CATL</button>`;
$('#route').addEventListener('click', e => { const b = e.target.closest('[data-node]'); if (b) openNode(b.dataset.node); });
function openNode(id) {
  const n = NODE[id]; globe?.focus(id);
  $$('#route button').forEach(b => b.classList.toggle('on', b.dataset.node === id));
  const edges = caseData.edges.filter(e => e.from === id || e.to === id);
  const evIds = [...new Set([...n.evidence, ...edges.flatMap(e => e.evidence)])];
  const statusLine = n.status_note || { documented: 'Documented in public records', reported: 'Reported by secondary sources only', unknown: 'Unknown: no documented link' }[n.status];
  $('#nodePanel').innerHTML = `<button class="close" aria-label="Close">×</button>
    <span class="ev ${n.status === 'documented' ? 'documentary' : n.status === 'reported' ? 'inference' : 'missing'}">${statusLine}</span>
    <h3>${esc(n.name)}</h3>
    <p class="meta">${esc(n.role)} · ${esc(n.place)}</p>
    ${edges.length ? `<p class="fineprint" style="margin:0 0 12px">${edges.map(e => `${esc(NODE[e.from].name)} → ${esc(NODE[e.to].name)}: <b style="color:var(--ink)">${esc(e.label)}</b>`).join('<br>')}</p>` : ''}
    ${evIds.map(i => EV[i] && card(EV[i])).join('') || '<p class="fineprint">No evidence. That is the point: nobody can see this far.</p>'}`;
  $('#nodePanel').classList.remove('hidden');
  $('.close', $('#nodePanel')).addEventListener('click', () => { $('#nodePanel').classList.add('hidden'); globe?.overview(); });
}

// ─────────── Chapter 3 ───────────
function renderRunLabel() { $('#runLabel').innerHTML = `<b>${source.kind === 'live' ? 'LIVE' : source.kind === 'recorded' ? 'RECORDED' : 'SCRIPTED'}</b> · ${esc(source.label)}`; }
$$('#priorities input').forEach(i => i.addEventListener('change', () => { priority = i.value; }));
let running = false, runId = 0, skip = null;
$('#btnChange').addEventListener('click', () => changeTheFuture());
async function changeTheFuture({ pace = 1 } = {}) {
  if (running) return; running = true; const my = ++runId;
  priority = $('#priorities input:checked').value;
  $('#btnChange').disabled = true; $('#btnChange').textContent = 'The council is working…';
  $('#decision').classList.add('hidden'); council.reset();
  // Try live agents first when a backend is configured; fall back to the recorded run.
  if (live.ok) {
    $('#phaseLabel').textContent = 'Contacting live agents…';
    try { const res = await runCouncil({ priority, caseId: caseData.id }); rounds = res.rounds; source = { kind: 'live', label: `Live run · ${res.model} · ${new Date().toLocaleString()}` }; }
    catch (err) { console.warn('[ETHOS] live council failed, replaying recorded run', err); rounds = { r1, r2, r3, r4 }; source = { kind: 'recorded', label: `Live agents unavailable (${err.message}). Replaying recorded run from ${run.date}` }; }
    renderRunLabel();
  }
  const T = buildTimeline({ caseData, ...rounds, priority });
  for (const ev of T) {
    if (my !== runId) return;
    if (ev.type === 'phase') { $('#phaseLabel').textContent = ev.label; await wait(500 * pace); continue; }
    if (ev.type === 'decision') { showDecision(); break; }
    const a = AGENTS[ev.agent];
    council.setActive(ev.agent, ev.kind); council.showChallenge(ev.to && (ev.kind === 'challenge') ? ev.agent : null, ev.to);
    $('#say').innerHTML = `<div class="who" aria-hidden="true">${a.glyph}</div><div class="bubble">
      <header><b>${a.name}</b>${ev.to ? ` → ${AGENTS[ev.to].name}` : ''}<span class="kind ${ev.kind === 'challenge' ? 'challenge' : ''}">${esc(ev.stance || ({ challenge: 'Challenge', revised: 'Revised', proposal: 'Proposal', priority: PRIORITY_LABEL[priority] }[ev.kind] || 'Finding'))}</span></header>
      <p>${esc(ev.text)}</p>
      ${ev.evidence?.length ? `<div class="chips">${ev.evidence.filter(i => EV[i]).map(i => `<button class="chip" data-chip="${i}"><span class="ev ${EV[i].class}" style="font-size:11px">${i}</span></button>`).join('')}</div>` : ''}
    </div>`;
    (ev.evidence || []).forEach((id, i) => EV[id] && setTimeout(() => council.token(id, EV[id].class, ev.flow === 'out' ? 'store' : ev.agent, ev.flow === 'out' ? ev.agent : 'store'), i * 220));
    const ms = (2600 + ev.text.length * 32) * pace;
    await Promise.race([wait(ms), new Promise(r => (skip = r))]);
  }
  running = false; $('#btnChange').disabled = false; $('#btnChange').textContent = 'Run again';
}
$('#say').addEventListener('dblclick', () => skip?.());
document.addEventListener('keydown', e => { if (e.key === 'ArrowDown' && current === 'intervention') skip?.(); });
function showDecision() {
  const s = rounds.r3.strategies[priority];
  council.setActive('solutions'); council.showChallenge();
  $('#say').innerHTML = '';
  const conds = rounds.r4.map(a => `<li><b>${AGENTS[a.agent].name}:</b> ${esc(a.verdicts[priority].stance)}. ${esc(a.condition_for_approval)}</li>`).join('');
  $('#decision').innerHTML = `<span class="ev simulated">Simulated decision · ${PRIORITY_LABEL[priority]}</span>
    <h3>${esc(s.headline)}</h3>
    <p style="color:var(--ink-2);margin:0 0 12px">${esc(s.summary)}</p>
    <details><summary class="fineprint" style="cursor:pointer">Conditions and objections (${rounds.r4.length})</summary><ul class="fineprint" style="padding-left:18px">${conds}</ul></details>
    <p style="margin:14px 0 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="stamp">Requires human review</span><button class="btn" id="toFuture">See what changes →</button></p>`;
  $('#decision').classList.remove('hidden');
  $('#toFuture').addEventListener('click', () => go('future'));
  $('#phaseLabel').textContent = '7 · Decide (pending human review)';
}

// ─────────── Chapter 4 ───────────
function renderFuture() {
  const s = rounds.r3.strategies[priority];
  const stanceRow = (p) => rounds.r4.map(a => `${AGENTS[a.agent].glyph} ${esc(a.verdicts[p].stance)}`).join('<br>');
  $('#futureBody').innerHTML = `
    <p class="eyebrow">Chapter 4 · The Future</p>
    <h2>Same phone. A company that knows more and acts on it.</h2>
    <p class="lede" style="max-width:52ch">Priority chosen: <b style="color:var(--amber)">${PRIORITY_LABEL[priority]}</b>. The result is not a score. It is a set of concrete changes, with the uncertainty left in view.</p>
    <div class="compare">
      <div><span class="ev missing">Today</span><h3>Buying blind</h3><ul>
        <li><b>Knows its direct supplier,</b> not the refiner or the mine.</li>
        <li><b>Can't show</b> whether its cobalt is kept apart from hand-dug mines.</li>
        <li><b>Treats silence as safety:</b> no labour or environmental data has been reviewed.</li>
        <li><b>Faces DRC export quotas</b> that could push it toward unchecked refiners.</li></ul></div>
      <div class="after"><span class="ev simulated">Proposed · needs human review</span><h3>${esc(s.headline)}</h3><ul>
        ${s.actions.map(a => `<li><b>${esc(a.when[0].toUpperCase() + a.when.slice(1))}:</b> ${esc(a.text)}</li>`).join('')}</ul></div>
    </div>
    <div class="grid3">
      <div><span class="ev inference">Why it matters</span><h4>From warning signs to knowledge</h4><ul>
        <li>${esc(EV.K1.text)}</li><li>${esc(rounds.r3.resolution)}</li></ul></div>
      <div><span class="ev simulated">Commercial implications</span><h4>Illustrative, not measured</h4><ul>
        <li>${esc(s.commercial)}</li><li>${esc(s.tradeoffs)}</li></ul></div>
      <div><span class="ev missing">Still uncertain</span><h4>What nobody knows yet</h4><ul>
        ${rounds.r3.unresolved.slice(0, 4).map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>
    </div>
    <div class="tradeoffs"><span class="ev simulated">Three priorities, three futures</span>
      <table><thead><tr><th>Priority</th><th>What the company does</th><th>Main trade-off</th><th>Reviewers</th></tr></thead><tbody>
      ${['cost', 'speed', 'responsible'].map(p => `<tr class="${p === priority ? 'chosen' : ''}"><td>${PRIORITY_LABEL[p]}</td><td>${esc(rounds.r3.strategies[p].headline)}</td><td>${esc(rounds.r3.strategies[p].tradeoffs)}</td><td style="white-space:nowrap">${stanceRow(p)}</td></tr>`).join('')}
      </tbody></table></div>
    <div class="review"><span class="stamp">Requires human review</span>
      <h4>Before anyone claims an improvement, verify:</h4>
      <ul>${rounds.r3.verification_needed.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
      <p class="fineprint">No evidence links Tenke Fungurume's cobalt to any particular phone or battery brand. Nothing here is an allegation against any company. The AI council's output is advice for people to weigh.</p>
    </div>
    <div class="cta-row" style="margin-top:40px"><button class="btn" id="again">Try another priority</button><button class="btn ghost" id="restart">Start over</button><button class="btn ghost" id="openAnalyst2">Open Analyst mode</button></div>`;
  $('#again').addEventListener('click', () => go('intervention'));
  $('#restart').addEventListener('click', resetAll);
  $('#openAnalyst2').addEventListener('click', () => toggleAnalyst(true));
}

// ─────────── Analyst mode ───────────
const analyst = $('#analyst'), scrim = $('#scrim');
function toggleAnalyst(on = !analyst.classList.contains('open')) {
  analyst.classList.toggle('open', on); scrim.classList.toggle('on', on);
  analyst.setAttribute('aria-hidden', !on); $('#btnAnalyst').setAttribute('aria-pressed', on);
  if (on) renderAnalyst();
}
$('#btnAnalyst').addEventListener('click', () => toggleAnalyst());
$('#closeAnalyst').addEventListener('click', () => toggleAnalyst(false));
scrim.addEventListener('click', () => toggleAnalyst(false));
$$('.tabs button').forEach(b => b.addEventListener('click', () => { $$('.tabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.tab').forEach(t => t.classList.toggle('on', t.id === b.dataset.tab)); }));
function showEvidence(id) { toggleAnalyst(true); $$('.tabs button')[0].click(); const c = $(`#tEvidence [data-ev="${id}"]`); c?.classList.add('open'); c?.scrollIntoView({ block: 'center' }); }

function renderAnalyst() {
  $('#tEvidence').innerHTML = `<div class="legend" style="margin-bottom:16px">${Object.keys(EV_LABEL).map(k => `<span class="ev ${k}">${EV_LABEL[k]}</span>`).join('')}</div>
    ${Object.entries(caseData.classes).map(([k, d]) => { const items = caseData.evidence.filter(e => e.class === k); return items.length ? `<p class="fineprint" style="margin:18px 0 8px">${esc(d)}</p>${items.map(e => card(e)).join('')}` : ''; }).join('')}`;
  $('#tGraph').innerHTML = `<p class="fineprint">${esc(caseData.scope_note)}</p>
    <table><thead><tr><th>From</th><th>Relationship</th><th>To</th><th>Status</th><th>Evidence</th></tr></thead><tbody>
    ${caseData.edges.map(e => `<tr><td>${esc(NODE[e.from].name)}</td><td>${esc(e.label)}</td><td>${esc(NODE[e.to].name)}</td><td>${e.status}</td><td>${e.evidence.map(i => `<button class="chip" data-chip="${i}">${i}</button>`).join(' ')}</td></tr>`).join('')}
    </tbody></table>
    <p class="fineprint" style="margin-top:14px">Investigated ${caseData.investigated} by ${esc(caseData.investigator)}.</p>`;
  $('#tSearch').innerHTML = `<p>Investigate another company or commodity.</p>
    <div class="search"><input id="q" placeholder="e.g. cobalt hydroxide, Kamoto Copper, lithium" aria-label="Search" /><button class="btn" id="qGo" style="padding:12px 18px">Search</button></div>
    <p class="fineprint"><span class="status-dot ${live.ok ? 'ok' : ''}"></span>${live.ok ? `Live Sayari search via ${esc(apiBase())}` : 'Live search is not configured on this deployment. Searching the curated case only.'}</p>
    <div id="results"></div>`;
  $('#qGo').addEventListener('click', doSearch); $('#q').addEventListener('keydown', e => e.key === 'Enter' && doSearch());
  $('#tCouncil').innerHTML = `<p><b>${esc(source.label)}</b></p><p class="fineprint">${esc(run.orchestrator)}.</p>
    <ol class="fineprint">${run.rounds.map(r => `<li><b>${esc(r.name)}</b>: ${r.agents.map(a => AGENTS[a].name).join(', ')}${r.parallel ? ' (independently, in parallel)' : ''}${r.note ? ` · ${esc(r.note)}` : ''}</li>`).join('')}</ol>
    <h4 style="margin-top:18px">Revisions after challenges</h4>${run.revisions.map(v => `<div class="card inference open"><span class="ev inference">${v.evidence} revised</span><p>${esc(v.summary)}</p></div>`).join('')}
    <h4 style="margin-top:18px">Raw agent outputs</h4><p class="fineprint">${['round1', 'round2', 'round3', 'round4', 'run'].map(f => `<a href="data/council/${f}.json" target="_blank">${f}.json</a>`).join(' · ')}</p>`;
  $('#tLab').innerHTML = `<p>The original ETHOS digital twin: a fictional battery chain with sliders for cost pressure, deadlines, traceability and worker protection.</p>
    <p class="notice">Everything in the Scenario Lab is fictional and simulated. It is for exploring trade-offs, not for evidence.</p>
    <a class="btn" href="lab/" style="text-decoration:none">Open the Scenario Lab →</a>`;
  $('#tSources').innerHTML = `<h4>Data modes</h4><ul class="fineprint">
      <li><b>Cached real data:</b> the curated case (data/case-tfm.json), built from public sources, retrieved ${caseData.investigated}.</li>
      <li><b>Licensed data:</b> Sayari records were reviewed during the investigation but are not republished. ${esc(caseData.licensing_note)}</li>
      <li><b>Live data:</b> ${live.ok ? 'connected' : 'not connected on this deployment'}. Requires the ETHOS Worker (see README) with server-side credentials.</li>
      <li><b>Simulated:</b> agent decisions and all commercial implications.</li></ul>
    <h4>Public sources</h4><ul class="fineprint">${[...new Set(caseData.evidence.flatMap(e => [e.url, e.url2]).filter(Boolean))].map(u => `<li><a href="${u}" target="_blank" rel="noopener">${esc(u)}</a></li>`).join('')}</ul>`;
}
async function doSearch() {
  const q = $('#q').value.trim(); if (!q) return;
  const out = $('#results'); out.innerHTML = '<p class="fineprint">Searching…</p>';
  if (live.ok) {
    try { const r = await searchEntities(q); out.innerHTML = `<p class="fineprint">Live results · retrieved ${new Date(r.retrieved).toLocaleString()} · licensed data, shown for this session only</p>` + r.items.map(i => `<div class="card documentary"><span class="ev documentary">${esc(i.type)} · ${esc((i.countries || []).join(', '))}</span><h4>${esc(i.label)}</h4><p class="src">${i.risk?.length ? `Risk indicators: ${esc(i.risk.join(', '))}` : 'No risk indicators returned'}</p></div>`).join(''); return; }
    catch (err) { out.innerHTML = `<p class="notice">Live search failed (${esc(err.message)}). Showing curated case matches instead.</p>`; }
  } else out.innerHTML = '';
  const hits = [...caseData.nodes.filter(n => (n.name + n.role + n.place).toLowerCase().includes(q.toLowerCase())), ...caseData.evidence.filter(e => (e.title + e.text).toLowerCase().includes(q.toLowerCase()))];
  out.innerHTML += hits.length ? hits.map(h => h.class ? card(h) : `<div class="card documentary"><span class="ev documentary">Case node</span><h4>${esc(h.name)}</h4><p>${esc(h.role)} · ${esc(h.place)}</p></div>`).join('') : '<p class="fineprint">No matches in the curated case.</p>';
}

// ─────────── Presentation mode ───────────
let beatId = 0;
async function togglePresent(on = !document.body.classList.contains('present')) {
  document.body.classList.toggle('present', on); $('#btnPresent').setAttribute('aria-pressed', on);
  try { if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen(); if (!on && document.fullscreenElement) await document.exitFullscreen(); } catch {}
  if (on) presentBeats(current);
}
$('#btnPresent').addEventListener('click', () => togglePresent());
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('present')) togglePresent(false); });
async function presentBeats(id) {
  const my = ++beatId; const alive = () => my === beatId && document.body.classList.contains('present');
  if (id === 'product') { await wait(1800); if (alive()) { await ensurePhone(); phone.select('battery'); showPart('battery'); } }
  if (id === 'journey') { for (const n of ['tfm', 'ixm', 'refiners']) { await wait(n === 'tfm' ? 1500 : 6000); if (!alive()) return; openNode(n); } }
  if (id === 'intervention') { await wait(1500); if (alive() && !running) changeTheFuture({ pace: 0.72 }); }
}
function resetAll() {
  runId++; beatId++; running = false; council?.reset(); $('#decision').classList.add('hidden'); $('#say').innerHTML = ''; $('#phaseLabel').textContent = '';
  $('#btnChange').disabled = false; $('#btnChange').textContent = 'Change the Future';
  $('#nodePanel').classList.add('hidden'); toggleAnalyst(false); go('prologue');
}
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') step(1);
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') step(-1);
  else if (e.key === ' ' && document.body.classList.contains('present')) { e.preventDefault(); if (current === 'intervention' && !running && $('#decision').classList.contains('hidden')) changeTheFuture({ pace: 0.72 }); else step(1); }
  else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) resetAll();
  else if (e.key === 'Escape') { toggleAnalyst(false); if (document.body.classList.contains('present')) togglePresent(false); }
});

// ─────────── Boot ───────────
health().then(h => { live = h; if (h.ok && council) renderRunLabel(); }).catch(() => {});
const params = new URLSearchParams(location.search);
if (params.has('nomotion')) document.body.classList.add('no-motion');
if (params.has('debug')) setTimeout(() => { const W = innerWidth; for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.right > W + 2 && getComputedStyle(el).position !== 'fixed' && r.width > 0) console.log('[wide]', el.tagName, el.id, el.className, Math.round(r.left), Math.round(r.right)); } }, 2500);
const start = location.hash.slice(1);
await go(ORDER.includes(start) ? start : 'prologue');
if (params.has('present')) document.body.classList.add('present'), presentBeats(current);
if (params.has('analyst')) toggleAnalyst(true);
if (params.get('node') && NODE[params.get('node')] && current === 'journey') openNode(params.get('node'));
if (params.has('run') && current === 'intervention') changeTheFuture({ pace: Number(params.get('run')) || 0.3 });
window.ETHOS = { go, changeTheFuture, toggleAnalyst, togglePresent };
