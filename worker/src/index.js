// ETHOS backend — Cloudflare Worker.
// Holds Sayari + Anthropic credentials server-side. Exposes three fixed routes only;
// it is NOT a general-purpose proxy.
//
//   GET  /health                 → which integrations are configured (no secrets)
//   GET  /sayari/search?q=...    → trimmed Sayari entity search (label, type, countries, risk ids)
//   POST /council {priority}     → runs the 4-round, 8-call agent council on the curated case
//
// Protection: origin allowlist (CORS + server-side check), presenter access code
// (X-ETHOS-Code, constant-time compare), Cloudflare rate-limit bindings, input
// validation, response trimming, no-store caching, and no secret ever echoed.

const SAYARI = 'https://api.sayari.com';
const ANTHROPIC = 'https://api.anthropic.com/v1/messages';
let tokenCache = { token: null, exp: 0 };

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const originOk = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': originOk ? origin : allowed[0] || 'null',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-ETHOS-Code',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    if (!originOk) return json({ error: 'origin not allowed' }, 403);

    if (url.pathname === '/health' && req.method === 'GET') {
      return json({ ok: true, sayari: !!(env.SAYARI_CLIENT_ID && env.SAYARI_CLIENT_SECRET), model: env.ANTHROPIC_API_KEY ? (env.MODEL || 'claude-opus-5-5') : null, code_required: !!env.ACCESS_CODE });
    }

    // Everything below needs the presenter access code.
    if (env.ACCESS_CODE && !safeEqual(req.headers.get('X-ETHOS-Code') || '', env.ACCESS_CODE)) return json({ error: 'access code required' }, 401);
    const ip = req.headers.get('CF-Connecting-IP') || 'anon';

    try {
      if (url.pathname === '/sayari/search' && req.method === 'GET') {
        if (env.SEARCH_LIMIT && !(await env.SEARCH_LIMIT.limit({ key: ip })).success) return json({ error: 'rate limited' }, 429);
        if (!env.SAYARI_CLIENT_ID) return json({ error: 'Sayari not configured' }, 503);
        const q = (url.searchParams.get('q') || '').trim();
        if (q.length < 2 || q.length > 120) return json({ error: 'query must be 2–120 characters' }, 400);
        const token = await sayariToken(env);
        const r = await fetch(`${SAYARI}/v1/search/entity?limit=10`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) });
        if (!r.ok) return json({ error: `Sayari ${r.status}` }, 502);
        const data = await r.json();
        // Trim to what the UI needs; licensed records are not stored or cached by ETHOS.
        const items = (data.data || []).map(e => ({ id: e.id, label: e.label || e.name || '(unnamed)', type: e.type, countries: e.countries || [], risk: e.risk ? Object.keys(e.risk) : [] }));
        return json({ items, retrieved: new Date().toISOString(), source: 'Sayari (licensed)' });
      }

      if (url.pathname === '/council' && req.method === 'POST') {
        if (env.COUNCIL_LIMIT && !(await env.COUNCIL_LIMIT.limit({ key: ip })).success) return json({ error: 'rate limited' }, 429);
        if (!env.ANTHROPIC_API_KEY) return json({ error: 'model not configured' }, 503);
        const body = await req.json().catch(() => ({}));
        if (!['cost', 'speed', 'responsible'].includes(body.priority)) return json({ error: 'invalid priority' }, 400);
        const caseData = await (await fetch(env.CASE_URL)).json();
        const rounds = await runCouncil(env, caseData);
        return json({ model: env.MODEL || 'claude-opus-5-5', rounds, ran: new Date().toISOString() });
      }
      return json({ error: 'not found' }, 404);
    } catch (err) {
      console.error('ETHOS worker error', err && err.message);
      return json({ error: 'upstream failure' }, 502);
    }
  },
};

function safeEqual(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function sayariToken(env) {
  if (tokenCache.token && Date.now() < tokenCache.exp - 60_000) return tokenCache.token;
  const r = await fetch(`${SAYARI}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.SAYARI_CLIENT_ID, client_secret: env.SAYARI_CLIENT_SECRET, audience: 'sayari.com', grant_type: 'client_credentials' }) });
  if (!r.ok) throw new Error(`Sayari auth ${r.status}`);
  const t = await r.json();
  tokenCache = { token: t.access_token, exp: Date.now() + (t.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

// ───────── Agent council (same structure as the recorded run in data/council/) ─────────
const RULES = 'Use ONLY the evidence store and earlier rounds provided. Cite only existing evidence IDs. Never treat trade or ownership links or screening flags as proof of abuse; make no allegations about real companies; invent no numbers (qualitative only, labelled as illustrative assumptions). Plain English a teenager understands; each text at most 2 sentences. Reply with JSON only.';
const ROLE = {
  humanrights: 'You are the HUMAN RIGHTS agent: prevent child labour, forced labour and unsafe work, grounded in ILO standards and U.S. DOL evidence. Challenge overreaching inferences.',
  environment: 'You are the ENVIRONMENT agent: reduce pollution, water harm, tailings risk and emissions; insist on measured evidence.',
  compliance: 'You are the COMPLIANCE agent: due-diligence, disclosure and import-control exposure, in general terms only, no legal advice.',
  procurement: 'You are the PROCUREMENT agent: cost, continuity and delivery for a company that buys battery packs (not cobalt). Push back on cost without evidence of impact.',
  solutions: 'You are the SOLUTIONS agent: synthesise everyone into concrete strategies, resolve disagreements explicitly, record unresolved concerns.',
};
const SHAPE = {
  r1: '{"agent":"<id>","findings":[{"text":"","evidence":[],"confidence":"low|medium|high"}],"challenges":[{"target":"","text":"","evidence":[]}],"evidence_requests":[""],"recommendations":[""]}',
  r2: '{"agent":"procurement","findings":[...],"challenges":[{"target":"humanrights|environment|compliance","text":"","evidence":[]}],"feasibility":[{"recommendation":"","from":"","cost":"low|medium|high","time":"low|medium|high","verdict":"do now|phase in|needs evidence first","note":""}],"priority_views":{"cost":"","speed":"","responsible":""}}',
  r3: '{"agent":"solutions","strategies":{"cost":{"headline":"","summary":"","actions":[{"when":"now|next 6 months|next 12-18 months","text":"","owner":"","evidence":[]}],"tradeoffs":"","commercial":"","residual_risk":""},"speed":{...},"responsible":{...}},"resolution":"","unresolved":[""],"verification_needed":[""],"messages":[]}',
  r4: '{"agent":"<id>","verdicts":{"cost":{"stance":"support|support with conditions|object","text":""},"speed":{...},"responsible":{...}},"challenge":{"target":"","text":"","evidence":[]},"revised_recommendation":"","condition_for_approval":""}',
};

async function agent(env, id, task, context, shape) {
  const r = await fetch(ANTHROPIC, { method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.MODEL || 'claude-opus-5-5', max_tokens: 3000, system: `${ROLE[id]}\n${RULES}`,
      messages: [{ role: 'user', content: `${task}\n\nReturn JSON in this shape:\n${shape.replace('<id>', id)}\n\nCONTEXT:\n${JSON.stringify(context)}` }] }) });
  if (!r.ok) throw new Error(`model ${r.status}`);
  const d = await r.json();
  const text = d.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const out = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  out.agent = id; return out;
}

async function runCouncil(env, caseData) {
  const store = { evidence: caseData.evidence, nodes: caseData.nodes, edges: caseData.edges };
  const r1 = await Promise.all(['humanrights', 'environment', 'compliance'].map(id =>
    agent(env, id, 'Independently examine the shared evidence store. Give 2-3 findings, 1-2 challenges, 1-3 evidence requests, 2-3 recommendations.', { store }, SHAPE.r1)));
  const r2 = await agent(env, 'procurement', 'Evaluate the commercial feasibility of the other agents\' recommendations under three priorities: cost, speed, responsible.', { store, r1 }, SHAPE.r2);
  const r3 = await agent(env, 'solutions', 'Design three strategies (cost, speed, responsible) with 4-6 concrete actions each. Never claim this cobalt is in the company\'s products.', { store, r1, r2 }, SHAPE.r3);
  const r4 = await Promise.all(['humanrights', 'environment', 'compliance'].map(id =>
    agent(env, id, 'Review the Solutions proposal critically. Give a stance on each strategy, one challenge, and say how your recommendation changed after the debate.', { store, r1, r2, r3 }, SHAPE.r4)));
  return { r1, r2, r3, r4 };
}
