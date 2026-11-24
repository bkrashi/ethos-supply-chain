// Client for the optional ETHOS backend (worker/). The browser never holds Sayari or model credentials.
// Configure with ?api=https://your-worker.workers.dev, or set window.ETHOS_API before app.js loads.
// The worker can additionally require a presenter access code, which is typed at runtime and kept in sessionStorage only.

const params = new URLSearchParams(location.search);
if (params.get('api')) sessionStorage.setItem('ethos.api', params.get('api'));
export const apiBase = () => (window.ETHOS_API || sessionStorage.getItem('ethos.api') || '').replace(/\/$/, '');

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const code = sessionStorage.getItem('ethos.code'); if (code) h['X-ETHOS-Code'] = code;
  return h;
}
async function call(path, opts = {}, timeout = 8000) {
  const base = apiBase(); if (!base) throw new Error('No backend configured');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    let res = await fetch(base + path, { ...opts, headers: headers(), signal: ctl.signal });
    if (res.status === 401) {
      const code = prompt('Presenter access code for live data:'); if (!code) throw new Error('Access code required');
      sessionStorage.setItem('ethos.code', code);
      res = await fetch(base + path, { ...opts, headers: headers() });
    }
    if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`.trim());
    return res.json();
  } finally { clearTimeout(t); }
}

/** { ok, sayari, model } — never throws */
export async function health() {
  if (!apiBase()) return { ok: false };
  try { const h = await call('/health', {}, 4000); return { ok: !!h.ok, ...h }; } catch { return { ok: false }; }
}
export const searchEntities = (q) => call(`/sayari/search?q=${encodeURIComponent(q)}`);
export const runCouncil = ({ priority, caseId }) => call('/council', { method: 'POST', body: JSON.stringify({ priority, caseId }) }, 120000);
