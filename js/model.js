// ETHOS simulation model. ILLUSTRATIVE ONLY.
// These equations encode plausible directional trade-offs for teaching.
// They are not calibrated to any real supplier, site or market.

export const ORIGINAL_STRATEGY = {
  name: 'Original strategy',
  cost: 85,        // cost pressure 0–100
  deadline: 6,     // weeks to deliver
  trace: 15,       // traceability requirement 0–100 (0 = tier-1 only, 100 = mine site)
  protect: 0.5,    // % of spend invested in worker protections
  structure: { lfp: 0, recycled: 0, engageASM: false, grievance: false, dualSource: false },
};

export const NODES = [
  { id: 'asm',       name: 'Cluster K: artisanal mining sites', kind: 'Artisanal & small-scale mining', tier: 'Tier 4', fictional: true },
  { id: 'mine',      name: 'Kaleo Industrial Mine',              kind: 'Industrial copper-cobalt mine',  tier: 'Tier 4', fictional: true },
  { id: 'community', name: 'Mbuyi Valley village',               kind: 'Local community',                tier: 'Affected stakeholders', fictional: true },
  { id: 'refinery',  name: 'Refiner R-7',                        kind: 'Cobalt refining & cathode precursor', tier: 'Tier 3', fictional: true },
  { id: 'factory',   name: 'CellWorks gigafactory',             kind: 'Battery cell manufacturing',     tier: 'Tier 2', fictional: true },
  { id: 'port',      name: 'Port of Asterion',                   kind: 'Export port',                    tier: 'Logistics', fictional: true },
  { id: 'warehouse', name: 'Lumen pack assembly & warehouse',    kind: 'Battery pack assembly',          tier: 'Tier 1', fictional: true },
  { id: 'hq',        name: 'Lumen Devices HQ',                   kind: 'Consumer electronics brand (buyer)', tier: 'Buyer', fictional: true },
  { id: 'recycle',   name: 'Closed-loop recycling hub',          kind: 'Battery recycling (unlocked by rebuild)', tier: 'Circular', fictional: true },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function simulate(s) {
  const st = { lfp: 0, recycled: 0, engageASM: false, grievance: false, dualSource: false, ...(s.structure || {}) };
  const rush = s.deadline < 10 ? (10 - s.deadline) : 0;

  // Cost per battery pack (USD, simulated)
  const base = 42;
  let unitCost = base * (1 - 0.12 * s.cost / 100)
    + rush * 0.6
    + (s.trace / 100) * 1.6
    + base * s.protect / 100
    - st.lfp * 4            // cobalt-free LFP cells for budget models are cheaper
    + st.recycled * 3
    + (st.engageASM ? 0.4 : 0)
    + (st.grievance ? 0.15 : 0);

  // On-time probability (%)
  const onTime = clamp(55 + (s.deadline - 4) * 2.6 - Math.max(0, s.trace - 70) * 0.15 + (st.dualSource ? 5 : 0) - s.cost * 0.04, 30, 97);

  // Traceability coverage: share of cobalt volume traced to a known mine site (%)
  const traceCoverage = clamp(s.trace * 0.88 + (st.engageASM ? 8 : 0) + st.recycled * 10, 0, 98);

  // Human-rights risk index (0–100, higher = worse)
  const hrRisk = clamp(50 + s.cost * 0.3 + rush * 2.5 - s.trace * 0.25 - s.protect * 4
    - (st.engageASM ? 8 : 0) - (st.grievance ? 5 : 0) - st.lfp * 20 - st.recycled * 15, 8, 95);

  // Environmental risk index (0–100, higher = worse)
  const envRisk = clamp(40 + s.cost * 0.25 - s.trace * 0.1 - s.protect * 3 - st.recycled * 40 - st.lfp * 20 + rush * 1.5, 8, 95);

  // Community wellbeing (0–100, higher = better)
  const wellbeing = clamp(35 + s.protect * 9 + (st.engageASM ? 12 : 0) + (st.grievance ? 5 : 0) - envRisk * 0.25 - s.cost * 0.08, 5, 95);

  // Confidence in our own estimates rises with traceability (we see more)
  const confidence = clamp(20 + traceCoverage * 0.7, 15, 92);

  return {
    unitCost: +unitCost.toFixed(2),
    onTime: Math.round(onTime),
    traceCoverage: Math.round(traceCoverage),
    hrRisk: Math.round(hrRisk),
    envRisk: Math.round(envRisk),
    wellbeing: Math.round(wellbeing),
    confidence: Math.round(confidence),
    uncertainty: Math.round((100 - confidence) / 3), // ± band on risk indices
  };
}

// Per-node risk (0..1) used for scene colouring. Simulated.
export function nodeRisk(s, m) {
  const st = s.structure || {};
  const hr = m.hrRisk / 100, env = m.envRisk / 100;
  return {
    asm: clamp(hr * 1.1 - (st.engageASM ? 0.15 : 0), 0, 1),
    mine: clamp(hr * 0.7 + env * 0.3, 0, 1),
    community: clamp(1 - m.wellbeing / 100, 0, 1),
    refinery: clamp(env * 0.6 + (1 - m.traceCoverage / 100) * 0.4, 0, 1),
    factory: clamp(hr * 0.5 + (s.deadline < 10 ? (10 - s.deadline) * 0.06 : 0), 0, 1),
    port: clamp((1 - m.traceCoverage / 100) * 0.4, 0, 1),
    warehouse: clamp((1 - m.onTime / 100) * 0.6, 0, 1),
    hq: clamp(hr * 0.35 + (1 - m.traceCoverage / 100) * 0.25, 0, 1),
    recycle: 0.1,
  };
}

export function riskLabel(v) {
  if (v >= 70) return 'High';
  if (v >= 45) return 'Elevated';
  if (v >= 25) return 'Moderate';
  return 'Lower';
}
