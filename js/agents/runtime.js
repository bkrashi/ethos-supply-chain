// Agent runtime. The UI talks only to AgentCouncil; the council talks to a Provider.
//
//   Provider interface
//   ──────────────────
//   name:  string
//   live:  boolean            – true only when real AI agents are answering
//   react(ctx)        → Promise<Message[]>        short reactions to a slider change
//   *deliberate(ctx)  → AsyncGenerator<Event>     the "Rebuild Ethically" workflow
//
//   Message: { agent, kind, text, evidence?: string[], focus?: nodeId, to?: agentId }
//            kind ∈ finding | concern | challenge | reply | proposal | support | dissent | consensus | system
//   Event:   { type: 'message', message } | { type: 'phase', phase, label }
//            { type: 'options', options } | { type: 'votes', votes }
//            { type: 'apply', strategy } | { type: 'done', decision }
//
// SimulatedProvider is the default. RemoteProvider sends the same context to an
// HTTP endpoint (see server/agent-proxy.mjs) and falls back to simulation on error.

import { AGENTS } from './agents.js';
import { simulate, ORIGINAL_STRATEGY } from '../model.js';

const fmt$ = (v) => `$${v.toFixed(2)}`;
const sign = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);

export const IMPROVED_STRATEGY = {
  name: 'Rebuilt strategy',
  cost: 55,
  deadline: 14,
  trace: 85,
  protect: 3,
  structure: { lfp: 0.3, recycled: 0.2, engageASM: true, grievance: true, dualSource: true },
};

const OPTION_A = {
  name: 'A · Cut and run',
  cost: 70, deadline: 8, trace: 40, protect: 0.5,
  structure: { lfp: 0, recycled: 0, engageASM: false, grievance: false, dualSource: false },
  blurb: 'Drop every artisanal-linked supplier and move to a single industrial source.',
  hidden: 'Pushes Mbuyi Valley families toward less visible sites. Supply depends on one source.',
};
const OPTION_B = {
  name: 'B · Audit and hope',
  cost: 82, deadline: 7, trace: 25, protect: 1,
  structure: { lfp: 0, recycled: 0, engageASM: false, grievance: false, dualSource: false },
  blurb: 'Keep the current chain and add an annual announced audit at CellWorks.',
  hidden: 'Paperwork improves. Conditions on the ground barely change.',
};
const OPTION_C = {
  ...IMPROVED_STRATEGY,
  name: 'C · Rebuild ethically',
  blurb: 'A realistic schedule, mine-site traceability, a protection fund, formalised artisanal mining, a grievance channel, LFP cells for budget models and recycled cobalt.',
  hidden: 'Requires multi-year supplier commitments and on-site verification.',
};

const wait = (ms) => new Promise(r => setTimeout(r, ms));

export class SimulatedProvider {
  name = 'Simulation';
  live = false;

  async react({ state, metrics, prev, changed }) {
    const out = [];
    const d = (k) => metrics[k] - prev[k];
    switch (changed) {
      case 'cost':
        if (state.cost > prev.state.cost) {
          out.push({ agent: 'procurement', kind: 'finding', focus: 'hq', text: `Cost pressure is now ${state.cost}. Simulated pack cost: ${fmt$(metrics.unitCost)} (${sign(d('unitCost'))}).` });
          out.push({ agent: 'humanrights', kind: 'challenge', to: 'procurement', focus: 'asm', evidence: ['V3'], text: `Every squeeze on price travels upstream to the least protected people in the chain. Simulated human-rights risk is now ${metrics.hrRisk} (±${metrics.uncertainty}).` });
        } else {
          out.push({ agent: 'procurement', kind: 'concern', focus: 'hq', text: `Lower cost pressure raises our simulated pack cost to ${fmt$(metrics.unitCost)}. I need to see what that money buys.` });
          out.push({ agent: 'solutions', kind: 'reply', to: 'procurement', text: `It gives suppliers room for fair wages and safety. Simulated human-rights risk ${prev.hrRisk} → ${metrics.hrRisk}.` });
        }
        break;
      case 'deadline':
        if (state.deadline < 10) {
          out.push({ agent: 'humanrights', kind: 'concern', focus: 'factory', evidence: ['V9', 'S3'], text: `A ${state.deadline}-week window pushes CellWorks toward excessive overtime, which is an ILO forced-labour indicator. This is a suspected risk, not an observation.` });
          out.push({ agent: 'procurement', kind: 'reply', to: 'humanrights', text: `Rushing doesn't even help delivery. Simulated on-time is ${metrics.onTime}%. Suppliers under pressure tend to slip.` });
        } else {
          out.push({ agent: 'procurement', kind: 'finding', focus: 'warehouse', text: `A ${state.deadline}-week window lets suppliers plan. Simulated on-time delivery: ${metrics.onTime}% (${d('onTime') >= 0 ? '+' : ''}${d('onTime')} pts).` });
        }
        break;
      case 'trace':
        out.push({ agent: 'investigation', kind: 'finding', focus: 'refinery', evidence: ['M1', 'V5'], text: `Traceability requirement ${state.trace}: ${metrics.traceCoverage}% of cobalt volume is now traced to a known mine site (simulated). Confidence in our own risk estimates: ${metrics.confidence}%.` });
        if (state.trace > prev.state.trace && state.trace > 50) {
          out.push({ agent: 'compliance', kind: 'support', to: 'investigation', focus: 'port', text: 'Chain-of-custody documents are what due-diligence and import reviewers ask for. This lowers our exposure.' });
          out.push({ agent: 'investigation', kind: 'reply', text: 'Fair warning: seeing more can surface problems that were already there. A new red flag means the system is working.' });
        } else if (state.trace < 30) {
          out.push({ agent: 'compliance', kind: 'concern', focus: 'refinery', text: 'Below this level our visibility ends at the refiner. We could not answer a regulator who asked where the ore came from.' });
        }
        break;
      case 'protect':
        out.push({ agent: 'humanrights', kind: state.protect > prev.state.protect ? 'support' : 'concern', focus: 'community', evidence: ['M4'], text: `Protection investment at ${state.protect.toFixed(1)}% of spend. This funds PPE, fair wages, a school-attendance stipend and a grievance desk (simulated). Wellbeing index: ${metrics.wellbeing}.` });
        out.push({ agent: 'procurement', kind: 'challenge', to: 'humanrights', text: `That adds ${sign(d('unitCost'))} per pack. Can we verify it reaches workers, rather than ending up in a supplier's margin?` });
        out.push({ agent: 'investigation', kind: 'reply', to: 'procurement', text: 'Only with traceability and independent monitoring. Money without verification is a hope, not a control.' });
        break;
    }
    return out;
  }

  async *deliberate({ state }) {
    const m0 = simulate(state);
    const say = (agent, kind, text, extra = {}) => ({ type: 'message', message: { agent, kind, text, ...extra } });

    yield { type: 'phase', phase: 1, label: 'Discover' };
    yield say('solutions', 'system', 'Council convened. Objective: a battery sourcing strategy that every agent can accept. Each of us argues for our own mandate.');
    yield say('investigation', 'finding', `Mapping from Lumen HQ back to the ore. Tiers 1 and 2 are documented. After Refiner R-7, visibility drops: only ${m0.traceCoverage}% of cobalt volume is traced to a mine site.`, { focus: 'refinery', evidence: ['M1', 'V5'] });
    yield say('investigation', 'finding', 'Cluster K buys from artisanal sites in a region where the U.S. DOL documents child labor in cobalt mining. That is a regional fact, not a finding about Cluster K, so I am logging it as SUSPECTED.', { focus: 'asm', evidence: ['V1', 'V3', 'S1'] });

    yield { type: 'phase', phase: 2, label: 'Assess' };
    yield say('humanrights', 'concern', 'DOL lists children digging, carrying heavy loads and working underground in DRC mining. ILO Convention 182 classes hazardous work as a worst form of child labour. We cannot rule it out in our ore.', { focus: 'asm', evidence: ['V4', 'V8'] });
    yield say('humanrights', 'concern', `The ${state.deadline}-week order window at CellWorks creates pressure for excessive overtime, which is an ILO forced-labour indicator. We have no worker interviews to check.`, { focus: 'factory', evidence: ['V9', 'S3', 'M2'] });
    yield say('environment', 'concern', `There is no water baseline for Mbuyi Valley and no disclosed refinery emissions. Simulated environmental risk is ${m0.envRisk} (±${m0.uncertainty}). That is a model output, not a measurement.`, { focus: 'community', evidence: ['S4', 'S5', 'M3'] });

    yield { type: 'phase', phase: 3, label: 'Challenge' };
    yield say('procurement', 'challenge', `Let's be realistic. A cost pressure of ${state.cost} is a board target, and a longer window risks the launch date. Before I accept new costs, I need to see their effect.`, { focus: 'hq', to: 'humanrights' });
    yield say('humanrights', 'reply', 'Pushing prices down does not remove the cost. It moves it onto people with the least protection. And cutting Cluster K entirely could drive families to sites that are even less visible.', { to: 'procurement', focus: 'community' });
    yield say('investigation', 'challenge', 'One correction: our existing CellWorks audit was announced in advance and had no confidential worker interviews. "No findings" is not the same as "no problems".', { to: 'procurement', focus: 'factory', evidence: ['M2'] });
    yield say('compliance', 'finding', 'Due-diligence expectations for batteries are tightening, and goods linked to forced labour can be detained at import. An untraced refiner is our largest exposure. I need chain-of-custody documents, not supplier assurances.', { focus: 'port', evidence: ['V2', 'M1'] });

    yield { type: 'phase', phase: 4, label: 'Design' };
    yield say('solutions', 'proposal', 'Three strategies, each run through the simulation:', { focus: 'hq' });
    const options = [OPTION_A, OPTION_B, OPTION_C].map(o => ({ ...o, metrics: simulate(o) }));
    yield { type: 'options', options };
    await wait(400);

    yield { type: 'phase', phase: 5, label: 'Debate' };
    const mc = options[2].metrics;
    const dc = mc.unitCost - m0.unitCost;
    yield say('environment', 'challenge', `Option A fixes our reputation risk, not the harm. The village still loses income, and simulated wellbeing falls to ${options[0].metrics.wellbeing}. I reject A.`, { to: 'solutions', focus: 'community' });
    yield say('procurement', 'support', `Option C costs ${sign(dc)} per pack (${(dc / m0.unitCost * 100).toFixed(1)}%), and simulated on-time rises from ${m0.onTime}% to ${mc.onTime}% because we stop rushing suppliers. LFP cells for budget models cover part of it. I support C, with a quarterly cost review.`, { focus: 'warehouse' });
    yield say('investigation', 'finding', 'Note for the record: C improves the scores partly because we see more and fund more. Every C number is still SIMULATED until on-site evidence closes gaps M1 to M4.', { evidence: ['X1', 'M1', 'M2', 'M3', 'M4'] });
    yield say('compliance', 'support', 'C gives us a documentation pathway from mine to market. Supported.', { focus: 'refinery' });
    yield say('humanrights', 'dissent', 'I support C, with a condition on record: formalisation must include independent monitoring and remediation. A child found working must be supported back into school, not dismissed.', { focus: 'asm' });
    yield { type: 'votes', votes: {
      procurement:  ['object', 'support', 'support'],
      humanrights:  ['object', 'object', 'conditional'],
      environment:  ['object', 'object', 'support'],
      investigation:['conditional', 'object', 'support'],
      compliance:   ['conditional', 'object', 'support'],
      solutions:    ['object', 'object', 'support'],
    } };

    yield { type: 'phase', phase: 6, label: 'Decide' };
    yield say('solutions', 'consensus', 'Shared decision: adopt Option C. 5 agents support and 1 supports with conditions. Rebuilding the digital twin now.', { focus: 'hq' });
    yield { type: 'apply', strategy: IMPROVED_STRATEGY };
    await wait(2600);
    yield say('environment', 'finding', `The recycling hub is online. 20% of cobalt now comes back from end-of-life packs. Simulated environmental risk: ${m0.envRisk} → ${mc.envRisk}.`, { focus: 'recycle' });
    yield say('humanrights', 'finding', `The protection fund reaches Mbuyi Valley: PPE, a school stipend and a grievance desk. Simulated human-rights risk: ${m0.hrRisk} → ${mc.hrRisk}.`, { focus: 'community', evidence: ['X1'] });
    yield { type: 'done', decision: { from: state, to: IMPROVED_STRATEGY } };
  }
}

// Calls a server endpoint that hosts real LLM agents (see server/agent-proxy.mjs).
// The endpoint must return { messages: Message[] } for react and an
// array of Events for deliberate. Any failure falls back to the simulation.
export class RemoteProvider {
  name = 'Live agents';
  live = true;
  constructor(endpoint, fallback = new SimulatedProvider()) {
    this.endpoint = endpoint;
    this.fallback = fallback;
  }
  async #post(path, body) {
    const res = await fetch(this.endpoint + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, agents: AGENTS }),
    });
    if (!res.ok) throw new Error(`Agent endpoint ${res.status}`);
    return res.json();
  }
  async react(ctx) {
    try { return (await this.#post('/react', ctx)).messages; }
    catch (e) { console.warn('[ETHOS] live agents unavailable, using simulation', e); return this.fallback.react(ctx); }
  }
  async *deliberate(ctx) {
    let events;
    try { events = (await this.#post('/deliberate', ctx)).events; }
    catch (e) { console.warn('[ETHOS] live agents unavailable, using simulation', e); yield* this.fallback.deliberate(ctx); return; }
    for (const ev of events) yield ev;
  }
}

export class AgentCouncil {
  constructor(provider) {
    this.provider = provider;
    this.listeners = new Set();
    this.busy = false;
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { this.listeners.forEach(fn => fn(ev)); }

  async react(ctx) {
    if (this.busy) return;
    const msgs = await this.provider.react(ctx);
    for (const m of msgs) { this.emit({ type: 'message', message: m }); await wait(650); }
  }

  async rebuild(ctx, { pace = 1 } = {}) {
    if (this.busy) return;
    this.busy = true;
    this.emit({ type: 'start' });
    try {
      for await (const ev of this.provider.deliberate(ctx)) {
        if (ev.type === 'message') this.emit({ type: 'typing', agent: ev.message.agent });
        await wait((ev.type === 'message' ? 900 + Math.min(ev.message.text.length * 14, 1900) : 500) * pace);
        this.emit(ev);
      }
    } finally {
      this.busy = false;
      this.emit({ type: 'end' });
    }
  }
}

export { ORIGINAL_STRATEGY };
