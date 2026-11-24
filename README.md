# ETHOS · The Supply Chain of Tomorrow

**An interactive 3D digital twin where six AI agents with competing objectives debate how a company should source batteries without human-rights abuses or environmental harm, while staying commercially viable.**

▶ **Live demo:** https://bkrashi.github.io/ethos-supply-chain/

ETHOS combines a futuristic command center, a miniature explorable world and an ethical decision-making lab. It is built for a **three-minute classroom demonstration**.

---

## The scenario

**Lumen Devices** (fictional) needs lithium-ion battery packs for its phones and laptops. Its original brief is the lowest price, a six-week delivery window, and paperwork only from direct suppliers.

The digital twin shows the chain behind that brief: artisanal and industrial cobalt mines, a mining village, a refiner, a cell gigafactory, an export port, pack assembly, the brand's HQ and (after the rebuild) a closed-loop recycling hub.

### What you can do

| Interaction | What happens |
|---|---|
| **Adjust four levers**: cost pressure, delivery deadline, traceability requirement, worker-protection investment | Risk halos change colour, refinery smoke thickens or clears, the river turns brown or blue, the "blind spot" fog lifts as traceability rises, workers get helmets, village windows light up, freight speeds up under deadline pressure. |
| **Click any node** | The inspector shows the node's simulated risk, what each agent sees there, and the linked evidence cards. |
| **Watch the agent council** | Agents react live to every slider change. They post findings, challenge each other and cite evidence. |
| **Press ✦ Rebuild Ethically** | A six-phase workflow (Discover → Assess → Challenge → Design → Debate → Decide). The agents compare three strategies, vote against their own objectives, record dissent, and rebuild the twin. |
| **Before / after** | A side-by-side comparison of the original and rebuilt strategies, including what is **still unknown**. |
| **Evidence locker** | Every evidence card, grouped by type. |
| **▶ Guided demo** | A narrated, roughly three-minute tour for presenting in class. |

### The six agents

| Agent | Objective |
|---|---|
| ◆ Procurement | Cost, continuity and delivery |
| ✚ Human Rights | Prevent child and forced labour, grounded in ILO standards |
| ❋ Environment | Water, tailings, emissions |
| ◎ Investigation | Map the chain, find blind spots, classify every claim |
| ⬢ Compliance | Due diligence, disclosure, import-control exposure |
| ✦ Solutions | Synthesise a strategy all agents can accept |

---

## Evidence integrity

ETHOS strictly separates four kinds of information. Each has its own colour throughout the interface.

| Type | Meaning |
|---|---|
| 🟩 **Verified fact** | Published by the **ILO** or the **U.S. Department of Labor**, at country or sector level, with a link. |
| 🟧 **Suspected risk** | An *inference* about a **fictional** supplier, drawn from public sector evidence. Never a finding. |
| 🟪 **Missing evidence** | Information a responsible buyer would need but does not have. |
| 🟦 **Simulated outcome** | Output of the illustrative model in [`js/model.js`](js/model.js). Not a measurement or prediction. |

**Ground rules**
- Lumen Devices and every supplier, site, village and person in the app are **fictional**.
- No evidence is invented about real suppliers or workers. Verified facts are never attributed to a fictional supplier.
- Simulated risk scores are always labelled as simulated, and they show an uncertainty band that widens when traceability is low.

**Sources used** (see [`js/evidence.js`](js/evidence.js))
- U.S. DOL ILAB, [Lithium-ion batteries supply chain](https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods/supply-chains/lithium-ion-batteries): cobalt ore from the DRC on the List of Goods since 2009; DRC supplies over 70% of world cobalt; child labour in artisanal mines.
- U.S. DOL ILAB, [List of Goods Produced by Child Labor or Forced Labor](https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods).
- U.S. DOL ILAB, [Findings on the Worst Forms of Child Labor: DRC](https://www.dol.gov/agencies/ilab/resources/reports/child-labor/congo-democratic-republic-drc).
- ILO & UNICEF, [Child Labour: Global Estimates 2024](https://www.ilo.org/publications/major-publications/child-labour-global-estimates-2024-trends-and-road-forward): 138 million children in child labour, 54 million in hazardous work.
- ILO, Walk Free & IOM, [Global Estimates of Modern Slavery (2022)](https://www.ilo.org/publications/global-estimates-modern-slavery-forced-labour-and-forced-marriage-1): 27.6 million in forced labour.
- ILO [Convention No. 182](https://normlex.ilo.org/dyn/nrmlx_en/f?p=NORMLEXPUB:12100:0::NO::P12100_ILO_CODE:C182) and [ILO Indicators of Forced Labour](https://www.ilo.org/publications/ilo-indicators-forced-labour).

---

## Running it

No build step and no dependencies. Three.js loads from a CDN through an import map.

```bash
git clone https://github.com/bkrashi/ethos-supply-chain.git
cd ethos-supply-chain
python3 -m http.server 8000      # or any static server
open http://localhost:8000
```

**Presenter shortcuts:** `?demo` starts the guided demo, `?skipintro` skips the title card, `?rebuild` runs the council immediately, `?compare` opens the before/after view, `?inspect=asm` opens a node.

---

## Architecture: simulated now, real agents later

```
index.html ─ css/styles.css
js/
  main.js            UI controller: sliders, metrics, council feed, inspector, modals, guided demo
  scene.js           Three.js digital twin (procedural models, flows, fog, bloom, labels, camera flights)
  model.js           Illustrative simulation model (transparent equations)
  evidence.js        Evidence base, typed as verified / suspected / missing / simulated
  agents/agents.js   Six agent definitions: objective, metric, system prompt
  agents/runtime.js  AgentCouncil + Provider interface
                       ├─ SimulatedProvider (default): scripted, state-aware deliberation
                       └─ RemoteProvider: calls an HTTP endpoint, falls back to simulation on error
server/agent-proxy.mjs  Optional Node proxy that answers as real LLM agents
```

The UI only talks to `AgentCouncil`, which streams typed events (`message`, `phase`, `options`, `votes`, `apply`, `done`) from a **provider**. To switch to live agents:

```bash
ANTHROPIC_API_KEY=sk-... node server/agent-proxy.mjs      # Node 18+
open "http://localhost:8000/?agents=http://localhost:8787"
```

The badge in the top bar changes from **SIMULATION** to **LIVE AGENTS**. Every agent's system prompt carries the same evidence guardrails. The API key stays on the server.

---

## Limitations

- The model is deliberately simple and is **not calibrated** to real data. Use it to discuss direction and trade-offs, not magnitudes.
- Country-level evidence describes risk in a region. It cannot tell you what happens at any particular site; only on-site verification can.
- The "rebuild" strategy is one defensible option, not the answer. Encourage students to argue for others.

## License

MIT
