// LOCAL DEVELOPMENT ONLY (Scenario Lab v1). No auth or rate limiting: never deploy publicly. Use worker/ for production.
// Optional: a tiny proxy that lets ETHOS use real LLM agents instead of the simulation.
//
//   ANTHROPIC_API_KEY=sk-... node server/agent-proxy.mjs
//   open http://localhost:8000/?agents=http://localhost:8787
//
// The browser never sees the API key. Each agent gets its own system prompt
// (from js/agents/agents.js, sent with each request) and must return JSON.
// If anything fails, the front end falls back to the simulation automatically.
// Requires Node 18+ (built-in fetch). No dependencies.

import http from 'node:http';

const PORT = process.env.PORT || 8787;
const MODEL = process.env.ETHOS_MODEL || 'claude-opus-5-5';
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error('Set ANTHROPIC_API_KEY'); process.exit(1); }

const GUARDRAILS = `Ground rules (non-negotiable):
- Lumen Devices and every supplier, site, village and person in the scenario are fictional.
- Never invent evidence about real companies, suppliers or workers.
- Only cite evidence IDs that exist in the provided evidence list. V* = verified ILO/DOL facts at country or sector level,
  S* = suspected (inferred) risks, M* = missing evidence, X1 = simulated outcomes.
- Always describe model numbers as simulated.`;

async function llm(system, user, maxTokens = 1500) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(json);
}

async function react({ state, metrics, prev, changed, agents }) {
  // Ask the two agents most affected by this lever to respond, then let them challenge each other.
  const who = { cost: ['procurement', 'humanrights'], deadline: ['humanrights', 'procurement'], trace: ['investigation', 'compliance'], protect: ['humanrights', 'procurement'] }[changed] || ['solutions'];
  const messages = [];
  for (const id of who) {
    const a = agents[id];
    const out = await llm(`${a.system}\n\n${GUARDRAILS}`,
      `The user just changed "${changed}". Previous metrics: ${JSON.stringify(prev)}. New state: ${JSON.stringify(state)}. New simulated metrics: ${JSON.stringify(metrics)}.
Conversation so far: ${JSON.stringify(messages)}.
Reply with JSON only: {"kind":"finding|concern|challenge|reply|support","text":"<= 45 words","to":"<agent id or null>","focus":"asm|mine|community|refinery|factory|port|warehouse|hq|null","evidence":["V1",...]}`, 400);
    messages.push({ agent: id, ...out });
  }
  return { messages };
}

async function deliberate({ state, metrics, agents }) {
  // A single orchestrated call that returns the full event script. Swap for a
  // turn-by-turn loop (one call per agent per phase) for a truly independent debate.
  const out = await llm(`You orchestrate a council of six agents: ${JSON.stringify(Object.values(agents).map(a => ({ id: a.id, objective: a.objective })))}.\n\n${GUARDRAILS}`,
    `Current sourcing state: ${JSON.stringify(state)}; simulated metrics: ${JSON.stringify(metrics)}.
Run phases 1 Discover, 2 Assess, 3 Challenge, 4 Design, 5 Debate, 6 Decide. Agents must challenge each other.
Return JSON only: {"events":[{"type":"phase","phase":1,"label":"Discover"},{"type":"message","message":{"agent":"investigation","kind":"finding","text":"...","focus":"refinery","evidence":["M1"]}}, ...,
{"type":"apply","strategy":{"cost":55,"deadline":14,"trace":85,"protect":3,"structure":{"lfp":0.3,"recycled":0.2,"engageASM":true,"grievance":true,"dualSource":true}}},
{"type":"done","decision":{}}]}`, 6000);
  return out;
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.end();
  let body = ''; for await (const c of req) body += c;
  try {
    const ctx = JSON.parse(body || '{}');
    const out = req.url === '/react' ? await react(ctx) : req.url === '/deliberate' ? await deliberate(ctx) : null;
    if (!out) { res.statusCode = 404; return res.end('{}'); }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(out));
  } catch (e) {
    console.error(e); res.statusCode = 500; res.end(JSON.stringify({ error: String(e.message || e) }));
  }
}).listen(PORT, () => console.log(`ETHOS agent proxy on http://localhost:${PORT} (model ${MODEL})`));
