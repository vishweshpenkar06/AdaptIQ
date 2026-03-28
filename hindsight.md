# Overview

# Overview

Why Hindsight?[​](#why-hindsight)AI agents forget everything between sessions. Every conversation starts from zero—no context about who you are, what you've discussed, or what the assistant has learned. This isn't just an implementation detail; it fundamentally limits what AI Agents can do.**The problem is harder than it looks:**
- **Simple vector search isn't enough** — "What did Alice do last spring?" requires temporal reasoning, not just semantic similarity

- **Facts get disconnected** — Knowing "Alice works at Google" and "Google is in Mountain View" should let you answer "Where does Alice work?" even if you never stored that directly

- **AI Agents need to consolidate knowledge** — A coding assistant that remembers "the user prefers functional programming" should consolidate this into an observation and weigh it when making recommendations

- **Context matters** — The same information means different things to different memory banks with different personalities

Hindsight solves these problems with a memory system designed specifically for AI agents.What Hindsight Does[​](#what-hindsight-does)#mermaid-svg-3296089{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;fill:#1e293b;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#mermaid-svg-3296089 .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#mermaid-svg-3296089 .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#mermaid-svg-3296089 .error-icon{fill:#e6f7f8;}#mermaid-svg-3296089 .error-text{fill:#1e293b;stroke:#1e293b;}#mermaid-svg-3296089 .edge-thickness-normal{stroke-width:1px;}#mermaid-svg-3296089 .edge-thickness-thick{stroke-width:3.5px;}#mermaid-svg-3296089 .edge-pattern-solid{stroke-dasharray:0;}#mermaid-svg-3296089 .edge-thickness-invisible{stroke-width:0;fill:none;}#mermaid-svg-3296089 .edge-pattern-dashed{stroke-dasharray:3;}#mermaid-svg-3296089 .edge-pattern-dotted{stroke-dasharray:2;}#mermaid-svg-3296089 .marker{fill:#009296;stroke:#009296;}#mermaid-svg-3296089 .marker.cross{stroke:#009296;}#mermaid-svg-3296089 svg{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;}#mermaid-svg-3296089 p{margin:0;}#mermaid-svg-3296089 .label{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;}#mermaid-svg-3296089 .cluster-label text{fill:#1e293b;}#mermaid-svg-3296089 .cluster-label span{color:#1e293b;}#mermaid-svg-3296089 .cluster-label span p{background-color:transparent;}#mermaid-svg-3296089 .label text,#mermaid-svg-3296089 span{fill:#ffffff;color:#ffffff;}#mermaid-svg-3296089 .node rect,#mermaid-svg-3296089 .node circle,#mermaid-svg-3296089 .node ellipse,#mermaid-svg-3296089 .node polygon,#mermaid-svg-3296089 .node path{fill:#0074d9;stroke:#005db0;stroke-width:1px;}#mermaid-svg-3296089 .rough-node .label text,#mermaid-svg-3296089 .node .label text,#mermaid-svg-3296089 .image-shape .label,#mermaid-svg-3296089 .icon-shape .label{text-anchor:middle;}#mermaid-svg-3296089 .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#mermaid-svg-3296089 .rough-node .label,#mermaid-svg-3296089 .node .label,#mermaid-svg-3296089 .image-shape .label,#mermaid-svg-3296089 .icon-shape .label{text-align:center;}#mermaid-svg-3296089 .node.clickable{cursor:pointer;}#mermaid-svg-3296089 .root .anchor path{fill:#009296!important;stroke-width:0;stroke:#009296;}#mermaid-svg-3296089 .arrowheadPath{fill:#0b0b0b;}#mermaid-svg-3296089 .edgePath .path{stroke:#009296;stroke-width:2.0px;}#mermaid-svg-3296089 .flowchart-link{stroke:#009296;fill:none;}#mermaid-svg-3296089 .edgeLabel{background-color:transparent;text-align:center;}#mermaid-svg-3296089 .edgeLabel p{background-color:transparent;}#mermaid-svg-3296089 .edgeLabel rect{opacity:0.5;background-color:transparent;fill:transparent;}#mermaid-svg-3296089 .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#mermaid-svg-3296089 .cluster rect{fill:rgba(0, 146, 150, 0.08);stroke:#009296;stroke-width:1px;}#mermaid-svg-3296089 .cluster text{fill:#1e293b;}#mermaid-svg-3296089 .cluster span{color:#1e293b;}#mermaid-svg-3296089 div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;background:#e6f7f8;border:1px solid hsl(183.3333333333, 16.25%, 83.7254901961%);border-radius:2px;pointer-events:none;z-index:100;}#mermaid-svg-3296089 .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#1e293b;}#mermaid-svg-3296089 rect.text{fill:none;stroke-width:0;}#mermaid-svg-3296089 .icon-shape,#mermaid-svg-3296089 .image-shape{background-color:transparent;text-align:center;}#mermaid-svg-3296089 .icon-shape p,#mermaid-svg-3296089 .image-shape p{background-color:transparent;padding:2px;}#mermaid-svg-3296089 .icon-shape .label rect,#mermaid-svg-3296089 .image-shape .label rect{opacity:0.5;background-color:transparent;fill:transparent;}#mermaid-svg-3296089 .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#mermaid-svg-3296089 .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#mermaid-svg-3296089 :root{--mermaid-font-family:"trebuchet ms",verdana,arial,sans-serif;}**Hindsight**

**Your Application**

retain

recall

reflect

**Memory Bank**

Mental Models

Observations

Memories & Entities

Chunks

Documents

AI Agent

API Server

**Your AI agent** stores information via `retain()`, searches with `recall()`, and reasons with `reflect()` — all interactions with its dedicated **memory bank**Key Components[​](#key-components)Memory Types[​](#memory-types)Hindsight organizes knowledge into a hierarchy of facts and consolidated knowledge:| Type | What it stores | Example |
| **Mental Model** | User-curated summaries for common queries | "Team communication best practices" |
| **Observation** | Automatically consolidated knowledge from facts | "User was a React enthusiast but has now switched to Vue" (captures history) |
| **World Fact** | Objective facts received | "Alice works at Google" |
| **Experience Fact** | Bank's own actions and interactions | "I recommended Python to Bob" |
During reflect, the agent checks sources in priority order: **Mental Models → Observations → Raw Facts**.Multi-Strategy Retrieval (TEMPR)[​](#multi-strategy-retrieval-tempr)Four search strategies run in parallel:#mermaid-svg-341375{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;fill:#1e293b;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#mermaid-svg-341375 .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#mermaid-svg-341375 .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#mermaid-svg-341375 .error-icon{fill:#e6f7f8;}#mermaid-svg-341375 .error-text{fill:#1e293b;stroke:#1e293b;}#mermaid-svg-341375 .edge-thickness-normal{stroke-width:1px;}#mermaid-svg-341375 .edge-thickness-thick{stroke-width:3.5px;}#mermaid-svg-341375 .edge-pattern-solid{stroke-dasharray:0;}#mermaid-svg-341375 .edge-thickness-invisible{stroke-width:0;fill:none;}#mermaid-svg-341375 .edge-pattern-dashed{stroke-dasharray:3;}#mermaid-svg-341375 .edge-pattern-dotted{stroke-dasharray:2;}#mermaid-svg-341375 .marker{fill:#009296;stroke:#009296;}#mermaid-svg-341375 .marker.cross{stroke:#009296;}#mermaid-svg-341375 svg{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;}#mermaid-svg-341375 p{margin:0;}#mermaid-svg-341375 .label{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;}#mermaid-svg-341375 .cluster-label text{fill:#1e293b;}#mermaid-svg-341375 .cluster-label span{color:#1e293b;}#mermaid-svg-341375 .cluster-label span p{background-color:transparent;}#mermaid-svg-341375 .label text,#mermaid-svg-341375 span{fill:#ffffff;color:#ffffff;}#mermaid-svg-341375 .node rect,#mermaid-svg-341375 .node circle,#mermaid-svg-341375 .node ellipse,#mermaid-svg-341375 .node polygon,#mermaid-svg-341375 .node path{fill:#0074d9;stroke:#005db0;stroke-width:1px;}#mermaid-svg-341375 .rough-node .label text,#mermaid-svg-341375 .node .label text,#mermaid-svg-341375 .image-shape .label,#mermaid-svg-341375 .icon-shape .label{text-anchor:middle;}#mermaid-svg-341375 .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#mermaid-svg-341375 .rough-node .label,#mermaid-svg-341375 .node .label,#mermaid-svg-341375 .image-shape .label,#mermaid-svg-341375 .icon-shape .label{text-align:center;}#mermaid-svg-341375 .node.clickable{cursor:pointer;}#mermaid-svg-341375 .root .anchor path{fill:#009296!important;stroke-width:0;stroke:#009296;}#mermaid-svg-341375 .arrowheadPath{fill:#0b0b0b;}#mermaid-svg-341375 .edgePath .path{stroke:#009296;stroke-width:2.0px;}#mermaid-svg-341375 .flowchart-link{stroke:#009296;fill:none;}#mermaid-svg-341375 .edgeLabel{background-color:transparent;text-align:center;}#mermaid-svg-341375 .edgeLabel p{background-color:transparent;}#mermaid-svg-341375 .edgeLabel rect{opacity:0.5;background-color:transparent;fill:transparent;}#mermaid-svg-341375 .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#mermaid-svg-341375 .cluster rect{fill:rgba(0, 146, 150, 0.08);stroke:#009296;stroke-width:1px;}#mermaid-svg-341375 .cluster text{fill:#1e293b;}#mermaid-svg-341375 .cluster span{color:#1e293b;}#mermaid-svg-341375 div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;background:#e6f7f8;border:1px solid hsl(183.3333333333, 16.25%, 83.7254901961%);border-radius:2px;pointer-events:none;z-index:100;}#mermaid-svg-341375 .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#1e293b;}#mermaid-svg-341375 rect.text{fill:none;stroke-width:0;}#mermaid-svg-341375 .icon-shape,#mermaid-svg-341375 .image-shape{background-color:transparent;text-align:center;}#mermaid-svg-341375 .icon-shape p,#mermaid-svg-341375 .image-shape p{background-color:transparent;padding:2px;}#mermaid-svg-341375 .icon-shape .label rect,#mermaid-svg-341375 .image-shape .label rect{opacity:0.5;background-color:transparent;fill:transparent;}#mermaid-svg-341375 .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#mermaid-svg-341375 .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#mermaid-svg-341375 :root{--mermaid-font-family:"trebuchet ms",verdana,arial,sans-serif;}Query

Semantic

Keyword

Graph

Temporal

RRF Fusion

Cross-Encoder

Results

| Strategy | Best for |
| **Semantic** | Conceptual similarity, paraphrasing |
| **Keyword (BM25)** | Names, technical terms, exact matches |
| **Graph** | Related entities, indirect connections |
| **Temporal** | "last spring", "in June", time ranges |
Observation Consolidation[​](#observation-consolidation)After memories are retained, Hindsight automatically consolidates related facts into **observations** — synthesized knowledge representations that capture patterns and learnings:
- **Automatic synthesis**: New facts are analyzed and consolidated into existing or new observations

- **Evidence tracking**: Each observation tracks which facts support it

- **Continuous refinement**: Observations evolve as new evidence arrives

Mission, Directives & Disposition[​](#mission-directives--disposition)Memory banks can be configured to shape how the agent reasons during `reflect`:| Configuration | Purpose | Example |
| **Mission** | Natural language identity for the bank | "I am a research assistant specializing in ML. I prefer simplicity over cutting-edge." |
| **Directives** | Hard rules the agent must follow | "Never recommend specific stocks", "Always cite sources" |
| **Disposition** | Soft traits that influence reasoning style | Skepticism, literalism, empathy (1-5 scale) |
The **mission** tells Hindsight what knowledge to prioritize and provides context for reasoning. **Directives** are guardrails and compliance rules that must never be violated. **Disposition traits** subtly influence interpretation style.These settings only affect the `reflect` operation, not `recall`.Clients & Languages[​](#clients--languages)[Python](/sdks/python)[![TypeScript](/img/icons/typescript.png)TypeScript](/sdks/nodejs)[Go](/sdks/go)[CLI](/sdks/cli)[HTTP](/developer/api/quickstart)Integrations[​](#integrations)Browse all supported integrations in the [Integrations Hub](/integrations).Next Steps[​](#next-steps)Getting Started[​](#getting-started)
- [**Quick Start**](/developer/api/quickstart) — Install and get up and running in 60 seconds

- [**RAG vs Hindsight**](/developer/rag-vs-hindsight) — See how Hindsight differs from traditional RAG with real examples

Core Concepts[​](#core-concepts)
- [**Retain**](/developer/retain) — How memories are stored with multi-dimensional facts

- [**Recall**](/developer/retrieval) — How TEMPR's 4-way search retrieves memories

- [**Reflect**](/developer/reflect) — How mission, directives, and disposition shape reasoning

API Methods[​](#api-methods)
- [**Retain**](/developer/api/retain) — Store information in memory banks

- [**Recall**](/developer/api/recall) — Search and retrieve memories

- [**Reflect**](/developer/api/reflect) — Agentic reasoning with memory

- [**Mental Models**](/developer/api/mental-models) — User-curated summaries for common queries

- [**Memory Banks**](/developer/api/memory-banks) — Configure mission, directives, and disposition

- [**Documents**](/developer/api/documents) — Manage document sources

- [**Operations**](/developer/api/operations) — Monitor async tasks

Deployment[​](#deployment)
- [**Server Setup**](/developer/installation) — Deploy with Docker Compose, Helm, or pip