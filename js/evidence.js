// ETHOS evidence base.
//
// Four strictly separated evidence classes:
//   VERIFIED  – a fact published by the ILO or the U.S. Department of Labor,
//               quoted or closely paraphrased, with a link. Country/sector level only.
//   SUSPECTED – a risk *inferred* for a FICTIONAL supplier from sector or
//               country evidence. Never a confirmed finding.
//   MISSING   – a data gap: evidence the company would need but does not have.
//   SIMULATED – an output of this app's model. Illustrative, not measured.
//
// Rule: no real supplier, site or worker is named or described anywhere.
// Every company, facility and person in the scenario is fictional.

export const EVIDENCE_TYPES = {
  verified:  { label: 'Verified fact',    short: 'VERIFIED',  desc: 'Published by the ILO or U.S. Department of Labor. Country- or sector-level, never about a specific supplier.' },
  suspected: { label: 'Suspected risk',   short: 'SUSPECTED', desc: 'Inferred for a fictional supplier from public sector evidence. Not confirmed at any site.' },
  missing:   { label: 'Missing evidence', short: 'MISSING',   desc: 'Information a responsible buyer would need but does not yet have.' },
  simulated: { label: 'Simulated outcome',short: 'SIMULATED', desc: 'Produced by this app’s illustrative model. Not a measurement and not a verified finding.' },
};

const DOL_BATTERIES = 'https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods/supply-chains/lithium-ion-batteries';
const DOL_LIST = 'https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods';
const DOL_DRC = 'https://www.dol.gov/agencies/ilab/resources/reports/child-labor/congo-democratic-republic-drc';
const ILO_CL2024 = 'https://www.ilo.org/publications/major-publications/child-labour-global-estimates-2024-trends-and-road-forward';
const ILO_CL_FAQ = 'https://www.ilo.org/resource/other/2024-global-estimates-child-labour-frequently-asked-questions';
const ILO_MS2022 = 'https://www.ilo.org/publications/global-estimates-modern-slavery-forced-labour-and-forced-marriage-1';
const ILO_C182 = 'https://normlex.ilo.org/dyn/nrmlx_en/f?p=NORMLEXPUB:12100:0::NO::P12100_ILO_CODE:C182';
const ILO_INDICATORS = 'https://www.ilo.org/publications/ilo-indicators-forced-labour';

export const EVIDENCE = [
  // ───────────── VERIFIED (ILO / U.S. DOL) ─────────────
  {
    id: 'V1', type: 'verified', nodes: ['mine', 'asm'],
    title: 'Cobalt ore from the DRC is on the U.S. DOL child-labor list',
    body: 'The U.S. Department of Labor placed cobalt ore (heterogenite) from the Democratic Republic of the Congo on its List of Goods Produced by Child Labor or Forced Labor in 2009.',
    quote: '“Recognizing the prevalence of child labor in the mining of this mineral, in 2009 the Department of Labor placed cobalt ore from the DRC on its List of Goods Produced by Child Labor or Forced Labor.”',
    source: 'U.S. Department of Labor, ILAB: Lithium-ion batteries supply chain', url: DOL_BATTERIES,
  },
  {
    id: 'V2', type: 'verified', nodes: ['factory', 'refinery'],
    title: 'DOL: lithium-ion batteries are made with an input produced by child labor',
    body: 'ILAB research finds that lithium-ion batteries are produced with an input, cobalt, made by child labor, and that children work at the earliest stages of the rechargeable battery supply chain.',
    quote: '“Our research shows that lithium-ion batteries are produced with an input—cobalt—made by child labor.”',
    source: 'U.S. Department of Labor, ILAB: Lithium-ion batteries supply chain', url: DOL_BATTERIES,
  },
  {
    id: 'V3', type: 'verified', nodes: ['mine', 'asm', 'refinery'],
    title: 'Over 70% of world cobalt comes from the DRC; artisanal mines are rarely inspected',
    body: 'DOL reports that over 70% of the world’s cobalt comes from mines in the DRC, that artisanal and small-scale mines produce 15–30% of local output, and that child labor is often found in these less-regulated sites, which labor inspectors rarely visit.',
    quote: '“Child labor is often found in these artisanal and small-scale mines, which are less regulated and rarely visited by labor inspectors.”',
    source: 'U.S. Department of Labor, ILAB: Lithium-ion batteries supply chain', url: DOL_BATTERIES,
  },
  {
    id: 'V4', type: 'verified', nodes: ['asm', 'community'],
    title: 'DOL documents hazardous tasks performed by children in mining',
    body: 'DOL’s DRC country findings list children’s work in mining, including carrying heavy loads, digging, sifting, sorting, transporting, washing and working underground in the production of copper and cobalt ore (heterogenite). DOL also describes the risk of falls into open shafts and tunnel collapses.',
    quote: '“Children also perform dangerous tasks mining cobalt ore (heterogenite) and copper ore.”',
    source: 'U.S. Department of Labor, ILAB: Findings on the Worst Forms of Child Labor – DRC', url: DOL_DRC,
  },
  {
    id: 'V5', type: 'verified', nodes: ['refinery', 'port'],
    title: 'Concentration: a refining chokepoint between mine and factory',
    body: 'DOL describes a cobalt supply chain dominated by China, which imports nearly 90% of its cobalt from the DRC. Ore from many mine sites converges on a small number of refiners, which makes the refiner the key point for tracing where ore came from.',
    quote: '“…a supply chain dominated by China, which imports nearly 90% of its cobalt from the DRC.”',
    source: 'U.S. Department of Labor, ILAB: Lithium-ion batteries supply chain', url: DOL_BATTERIES,
  },
  {
    id: 'V6', type: 'verified', nodes: ['community', 'asm'],
    title: 'ILO–UNICEF: 138 million children in child labour (2024)',
    body: 'The joint ILO–UNICEF global estimates count about 138 million children aged 5–17 in child labour in 2024, 54 million of them in hazardous work. Sub-Saharan Africa accounts for nearly two-thirds, around 87 million children.',
    quote: '138 million children in child labour; 54 million in hazardous work.',
    source: 'ILO & UNICEF, Child Labour: Global Estimates 2024, Trends and the Road Forward', url: ILO_CL2024, url2: ILO_CL_FAQ,
  },
  {
    id: 'V7', type: 'verified', nodes: ['factory', 'warehouse'],
    title: 'ILO: 27.6 million people in forced labour',
    body: 'The ILO, Walk Free and IOM Global Estimates of Modern Slavery (2022) estimate 27.6 million people in forced labour on any given day in 2021, an increase of 2.7 million since 2016.',
    quote: '27.6 million people in forced labour (2021 estimate).',
    source: 'ILO, Walk Free & IOM, Global Estimates of Modern Slavery (2022)', url: ILO_MS2022,
  },
  {
    id: 'V8', type: 'verified', nodes: ['asm', 'mine'],
    title: 'ILO Convention No. 182: hazardous child labour is a “worst form”',
    body: 'ILO Convention No. 182 (1999) on the Worst Forms of Child Labour includes work that is likely to harm the health, safety or morals of children. In 2020 it became the first ILO convention ratified by every ILO member state.',
    quote: 'Hazardous work by children is classed among the worst forms of child labour.',
    source: 'ILO NORMLEX, Convention C182', url: ILO_C182,
  },
  {
    id: 'V9', type: 'verified', nodes: ['factory'],
    title: 'ILO indicators of forced labour include excessive overtime and debt bondage',
    body: 'The ILO publishes 11 indicators of forced labour, including abuse of vulnerability, deception, retention of identity documents, withholding of wages, debt bondage and excessive overtime. Auditors use them to spot risk; one indicator alone does not prove forced labour.',
    quote: 'Eleven indicators, including excessive overtime and withholding of wages.',
    source: 'ILO, Indicators of Forced Labour', url: ILO_INDICATORS,
  },

  // ───────────── SUSPECTED (about FICTIONAL suppliers) ─────────────
  {
    id: 'S1', type: 'suspected', nodes: ['asm'],
    title: 'Fictional “Cluster K” may include artisanal ore from high-risk sites',
    body: 'Cluster K is a fictional aggregator. Because it buys from artisanal sites in a region where DOL documents child labor (V1, V3), the risk is inferred. No site-level observation exists.',
    basis: ['V1', 'V3'],
  },
  {
    id: 'S2', type: 'suspected', nodes: ['refinery'],
    title: 'Fictional “Refiner R-7” blends ore lots, which hides their origin',
    body: 'R-7 is fictional. It mixes industrial and artisanal ore before shipping. Without chain-of-custody records, the origin of any given batch cannot be established.',
    basis: ['V5'],
  },
  {
    id: 'S3', type: 'suspected', nodes: ['factory'],
    title: 'Short deadlines raise overtime and subcontracting risk at fictional “CellWorks”',
    body: 'When order windows are shortened, suppliers may resort to excessive overtime or unauthorised subcontracting. Excessive overtime is one of the ILO forced-labour indicators (V9). This risk is inferred from the order terms, not observed.',
    basis: ['V9'],
  },
  {
    id: 'S4', type: 'suspected', nodes: ['community', 'mine'],
    title: 'Possible tailings runoff into the village water source',
    body: 'Sector-typical environmental risk: runoff from tailings and ore washing can contaminate nearby water. For this fictional site the risk is suspected, not measured.',
    basis: [],
  },
  {
    id: 'S5', type: 'suspected', nodes: ['refinery'],
    title: 'Refinery emissions and energy intensity',
    body: 'Hydrometallurgical refining is energy- and chemical-intensive. R-7’s emissions profile is not disclosed, so the risk is estimated from the sector.',
    basis: [],
  },

  // ───────────── MISSING EVIDENCE ─────────────
  {
    id: 'M1', type: 'missing', nodes: ['refinery', 'asm', 'mine'],
    title: 'No chain-of-custody beyond the refiner',
    body: 'The company can trace cells to CellWorks and cathode material to R-7, but has no documents showing which mine sites supplied the ore.',
  },
  {
    id: 'M2', type: 'missing', nodes: ['factory'],
    title: 'No independent worker interviews at CellWorks',
    body: 'Existing audits were announced in advance and did not include confidential worker interviews. Wage, hours and recruitment-fee data are missing.',
  },
  {
    id: 'M3', type: 'missing', nodes: ['community'],
    title: 'No water-quality baseline for the village',
    body: 'Without baseline sampling, harm cannot be measured and improvement cannot be shown.',
  },
  {
    id: 'M4', type: 'missing', nodes: ['community', 'asm', 'factory'],
    title: 'No grievance channel workers or residents can use safely',
    body: 'No supplier has a grievance mechanism that workers or community members can use without fear of retaliation.',
  },

  // ───────────── SIMULATED OUTCOMES ─────────────
  {
    id: 'X1', type: 'simulated', nodes: ['asm', 'mine', 'factory', 'community', 'refinery', 'port', 'warehouse', 'hq', 'recycle'],
    title: 'All risk scores in ETHOS are simulated',
    body: 'Human-rights risk, environmental risk, community wellbeing, cost and on-time figures come from a simple illustrative model driven by your slider settings. They show direction and trade-offs. They are not measurements of any real place.',
  },
];

export const evidenceById = Object.fromEntries(EVIDENCE.map(e => [e.id, e]));
export const evidenceForNode = (nodeId) => EVIDENCE.filter(e => e.nodes.includes(nodeId));
