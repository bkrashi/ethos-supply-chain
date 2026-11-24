# ETHOS · Intelligence for Good

**Every product has a past. We can change its future.**

ETHOS is an interactive documentary about where the cobalt in a phone battery comes from, and what a company could do differently. It follows one real, documented trail from an industrial mine in DR Congo, shows exactly where the evidence runs out, and lets a council of six AI agents argue over a better sourcing strategy, all of it marked for human review.

▶ **Live:** https://bkrashi.github.io/ethos-supply-chain/

## The story (about three minutes)

| Chapter | What happens |
|---|---|
| **1 · The Product** | Rotate an exploded 3D phone, tap parts and see their materials. The battery leads to cobalt. |
| **2 · The Hidden Journey** | A globe traces Tenke Fungurume (TFM) → IXM → … Solid lines are documented. Dashed lines are unknown, and unknown stops float off the map because their location is not known. |
| **3 · The Intervention** | Pick a priority (lowest cost, fastest delivery or responsible sourcing) and press **Change the Future**. Six agents activate around a shared evidence store, pass evidence IDs and challenge each other. |
| **4 · The Future** | Before and after: concrete actions, illustrative commercial implications, what is still unknown, and what must be verified. No ethics score. |

**Analyst mode** (top right) contains the evidence store, the case graph, a company search, the agent-run transcripts, the original **Scenario Lab** digital twin (`/lab/`) and the sources and licensing notes.

**Presentation mode:** press **Present** or add `?present`. It runs full screen with minimal chrome. ← → move between chapters, Space continues (and starts the council in Chapter 3), **R** resets, Esc exits. Each chapter plays a short curated sequence automatically.

## Evidence classes

Each class has one colour and one icon everywhere it appears:

| | Class | Meaning |
|---|---|---|
| ● | **Documented** | A primary or authoritative public document states it (CMOC filings, U.S. DOL, ILO, IEA policy database), or licensed trade data shows it. |
| ▲ | **Risk indicator** | A list or screening method flags a risk. Not a finding of abuse. |
| ◇ | **Inference** | A reasoned conclusion. It can be wrong, and one was corrected during the agent run. |
| ○ | **Missing** | Something a responsible buyer needs but does not have. |
| ⬡ | **Simulated** | Agent decisions and commercial implications. Illustrative, and they need human review. |

**What ETHOS does not claim:** that TFM's cobalt is in any particular phone, or that any abuse occurred at any named company. Trade and ownership links are not presented as proof of forced or child labour.

## What is real, what is recorded, what is simulated

| Feature | Status |
|---|---|
| Curated case `data/case-tfm.json` | **Cached real data.** Built 23 Nov 2026 from a Sayari MCP investigation plus public sources. Public statements cite public documents. |
| Sayari records | **Reviewed, not republished.** Sayari's terms restrict use to what is expressly authorised, so raw records, IDs and counts stay in a local, git-ignored cache (`data/private/`). The only Sayari-derived items in the public build are T1 and K2. They give a qualitative summary and a paraphrased risk definition, with no records attached. Confirm with Sayari before publishing more. |
| Agent council (Chapter 3) | **Recorded model-driven run.** Eight independent Claude Opus 5.5 instances across four rounds: 3 in parallel, then 1, then 1, then 3 in parallel. All read the same evidence store, and their outputs are stored verbatim in `data/council/`. One inference (I2) was withdrawn after the Human Rights agent challenged it. The browser replays this run; it is not generated on page load. |
| Live council and live company search | **Built, not yet deployed.** Requires the Worker below. If it is missing or fails, ETHOS falls back to the recorded run and the curated case, and it says so. |
| Scenario Lab (`/lab/`) | **Simulation.** A fictional company and an illustrative model. |

## Architecture

```
index.html, css/ethos.css        Story Mode shell and design system (5 brand colours, Fraunces + Inter)
js/app.js                        Chapters, analyst mode, presentation mode, council replay
js/v2/phone.js                   Chapter 1: Three.js exploded phone (one renderer shared with the hero)
js/v2/globe.js                   Chapter 2: dotted globe (Natural Earth via world-atlas), documented and unknown arcs
js/v2/council.js                 Chapter 3: agent network (SVG) and timeline builder
js/v2/api.js                     Client for the optional backend (no secrets in the browser)
data/case-tfm.json               Shared evidence store: nodes, edges, evidence with provenance and retrieval dates
data/council/*.json              Recorded agent outputs, round by round, plus run metadata
worker/                          Cloudflare Worker: Sayari + Anthropic, server-side only
lab/                             The original ETHOS digital twin (v1), preserved
```

## Enabling live data (optional)

The site is static (GitHub Pages). Live features need the Worker in `worker/`, which keeps every credential server-side.

```bash
cd worker
npx wrangler secret put SAYARI_CLIENT_ID
npx wrangler secret put SAYARI_CLIENT_SECRET
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ACCESS_CODE          # presenter code, typed in the browser at runtime
npx wrangler deploy
```

Then open `https://bkrashi.github.io/ethos-supply-chain/?api=https://ethos-api.<you>.workers.dev`.

**Worker safeguards:**
- Only three fixed routes. It is not a general proxy.
- An origin allowlist.
- A presenter access code, compared in constant time.
- Per-IP rate limits: 20 searches and 2 council runs per minute.
- Input validation, and trimmed responses with `no-store` caching.
- Credentials are never echoed back.

*The Worker has not been deployed or tested against live Sayari or Anthropic endpoints from this repository, because no credentials were configured.*

## Running locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

URL flags:
- `?present` starts presentation mode.
- `?analyst` opens Analyst mode.
- `#journey` jumps to a chapter.
- `?run=0.5#intervention` runs the council at speed.
- `?nomotion` turns off animation, for screenshots.

## Classroom demo (3 minutes)

1. **0:00 Prologue.** Read the headline aloud. Press → or Space.
2. **0:15 The Product.** The battery highlights automatically. *"Cobalt. Where does it come from?"*
3. **0:40 The Hidden Journey.** The globe visits TFM, then IXM, then the cold trail. Point at the dashed lines: *"This is what nobody can see."*
4. **1:25 The Intervention.** Choose a priority with the class, then press Space. Point out the Human Rights agent correcting the Investigation agent, and Procurement pushing back.
5. **2:25 The Future.** Scroll through the actions, then **Still uncertain**, then **Requires human review**. Press R to reset.

## Sources

U.S. DOL ILAB ([batteries](https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods/supply-chains/lithium-ion-batteries)), ILO & UNICEF ([Child Labour 2024](https://www.ilo.org/publications/major-publications/child-labour-global-estimates-2024-trends-and-road-forward)), CMOC ([TFM](https://en.cmoc.com/html/Business/Congo-Cu-Co/), [IXM](https://en.cmoc.com/html/Business/IXM/)), IEA Policies Database ([ARECOMS quotas](https://www.iea.org/policies/29138-drc-arecoms-decision-no-0042025-cobalt-quota-system)), Natural Earth (via world-atlas), Sayari (licensed; not redistributed).

MIT licence (code). Third-party data remains subject to its own terms.
