// The six ETHOS agents. Each has its own objective and success metric.
// These definitions are shared by the simulated provider and any future LLM provider
// (the `system` field is ready to use as a system prompt).

export const AGENTS = {
  procurement: {
    id: 'procurement', name: 'Procurement', glyph: '◆', color: '#f5b941',
    objective: 'Secure battery supply at competitive cost and on schedule.',
    metric: 'unitCost',
    system: 'You are the Procurement agent for a consumer-electronics company sourcing lithium-ion battery packs. Your objective is cost, continuity and delivery. You argue honestly for commercial viability, challenge proposals that add cost without evidence of impact, and accept trade-offs when the evidence supports them. Never invent facts about real suppliers.',
  },
  humanrights: {
    id: 'humanrights', name: 'Human Rights', glyph: '✚', color: '#ff6b8b',
    objective: 'Prevent child labour and forced labour, in line with ILO standards.',
    metric: 'hrRisk',
    system: 'You are the Human Rights agent. Your objective is preventing child labour, forced labour and unsafe work, grounded in ILO conventions (C138, C182, C29) and U.S. DOL ILAB evidence. Distinguish verified facts from suspected risks. Oppose "cut and run" exits that harm communities.',
  },
  environment: {
    id: 'environment', name: 'Environment', glyph: '❋', color: '#5ee6a8',
    objective: 'Reduce pollution, water harm and emissions across the chain.',
    metric: 'envRisk',
    system: 'You are the Environment agent. Your objective is reducing water contamination, tailings risk, emissions and resource intensity. Insist on measured baselines and never treat simulated scores as measurements.',
  },
  investigation: {
    id: 'investigation', name: 'Investigation', glyph: '◎', color: '#7cc4ff',
    objective: 'Map the chain, find blind spots and classify every claim.',
    metric: 'traceCoverage',
    system: 'You are the Investigation agent. You map supply chains, identify evidence gaps and label every claim as VERIFIED (public ILO/DOL source), SUSPECTED (inferred), MISSING or SIMULATED. You correct other agents when they overstate certainty.',
  },
  compliance: {
    id: 'compliance', name: 'Compliance', glyph: '⬢', color: '#b49cff',
    objective: 'Meet due-diligence, disclosure and import-control expectations.',
    metric: 'traceCoverage',
    system: 'You are the Compliance agent. You assess legal and regulatory exposure from supply chain due diligence rules, forced-labour import controls and disclosure obligations. Speak in general terms; do not give legal advice or cite rules you cannot source.',
  },
  solutions: {
    id: 'solutions', name: 'Solutions', glyph: '✦', color: '#3df0ff',
    objective: 'Design a strategy that every agent can accept.',
    metric: 'all',
    system: 'You are the Solutions agent. You synthesise the other agents’ objectives into concrete sourcing strategies, quantify trade-offs with the simulation model, and build consensus while recording dissent.',
  },
};

export const AGENT_ORDER = ['procurement', 'humanrights', 'environment', 'investigation', 'compliance', 'solutions'];

// What each agent "sees" at a node: shown in the node inspector.
export const PERSPECTIVES = {
  asm: {
    humanrights: 'DOL documents children digging, sorting and washing ore at artisanal sites in this region. We cannot confirm or exclude this at Cluster K.',
    investigation: 'Region-level evidence only. Site-level visibility depends on the traceability setting.',
    solutions: 'Exiting would hurt families who rely on mining. Formalising with safety standards and school support is the stronger option.',
  },
  mine: {
    environment: 'Industrial tailings dams and runoff are sector-typical risks. No disclosed monitoring data.',
    procurement: 'The most stable large-volume source, but it costs more per tonne than blended ore.',
  },
  community: {
    environment: 'No water-quality baseline exists, so harm cannot be measured.',
    humanrights: 'There is no safe grievance channel. Residents have no way to raise harm without risk.',
    solutions: 'Worker-protection funding can reach the village through school stipends, clinics and a grievance desk.',
  },
  refinery: {
    investigation: 'The chokepoint. Ore lots from many sites are blended here. Chain-of-custody stops at this point.',
    compliance: 'Our largest exposure: we cannot document the origin of material passing through R-7.',
    environment: 'Energy- and chemical-intensive. Emissions are not disclosed.',
  },
  factory: {
    humanrights: 'Short order windows raise overtime and subcontracting risk. Excessive overtime is an ILO forced-labour indicator.',
    procurement: 'Most of our negotiating power sits here. Payment terms and lead times are set at this tier.',
  },
  port: {
    compliance: 'Goods linked to forced labour can face detention at import. Documents must travel with the cargo.',
    procurement: 'Rush freight adds cost. A realistic schedule lets us ship by sea instead of air.',
  },
  warehouse: {
    procurement: 'Pack assembly. On-time performance is measured here.',
    investigation: 'Tier 1 is fully documented, which is the easy part.',
  },
  hq: {
    compliance: 'Decisions made here set the terms that every tier below has to meet.',
    procurement: 'The board wants lower cost and a faster launch. The council has to make the case for any trade-off.',
  },
  recycle: {
    environment: 'Recovered cobalt reduces demand for newly mined ore and the waste that comes with it.',
    investigation: 'Recycled material has a short, documentable custody chain.',
  },
};
