---
name: process-flow-diagram
version: 0.1.0
description: |
  Author professional process / workflow / system diagrams as `.drawio` files
  (the native draw.io format). Use when the user asks for a diagram, flowchart,
  process map, swimlane diagram, BPMN-style flow, system architecture, network
  topology, decision tree, sequence flow, or any "draw / chart / diagram /
  visualise the process / map the workflow" task that warrants a downloadable
  artefact. Pairs with the `process-diagram` skill: that one emits inline
  Mermaid for quick markdown previews; this one emits a downloadable `.drawio`
  file the user can open and refine in draw.io Desktop or app.diagrams.net.
when_to_use: |
  Reach for this skill (instead of `process-diagram`) whenever the user wants:
    - a downloadable diagram file they can edit further (`.drawio`)
    - SVG/PNG export with publication-grade styling (swimlanes, themed colours)
    - a multi-page or stencil-rich diagram (network gear, cloud icons)
    - explicit BPMN-shape semantics (start/end events, gateways, subprocesses)
  Stay with `process-diagram` for inline-rendered preview blocks in chat or
  for diagrams that should live INSIDE a markdown document.
inputs:
  - type: process_model
    required: true
outputs:
  - type: drawio_file
  - type: svg_preview
    optional: true
requires_tools:
  - file_write
  - node_exec
model_hint: anthropic/claude-opus-4-6
cost_budget_usd: 0.60
category: visualization
tags:
  - design
  - diagram
  - drawio
  - bpmn
  - architecture
  - network
---

# Process Flow Diagram (`.drawio`)

You produce **downloadable `.drawio` files** that the user can open in
draw.io Desktop or [app.diagrams.net](https://app.diagrams.net) for
further editing, plus an optional `.svg` preview rendered server-side
so the diagram is visible in the conversation immediately.

## Quick reference

| Task | What to do |
|---|---|
| Author a flow from a description | Build a YAML spec → run `scripts/build_flow.js` → save `.drawio` and (optionally) `.svg` |
| Author a network topology | Same path, with `kind: network` in the spec |
| Convert an existing Mermaid block | Read `references/patterns.md` for the Mermaid → drawio mapping, then build the spec |
| Modify an uploaded `.drawio` | Read `references/drawio-xml.md` to understand the format, then patch and re-save |

The runtime contract is `node_exec` + `mxgraph` (preloaded in the
node sandbox). Everything happens server-side; the user does not need
draw.io installed to receive the file — they only need it (or the web
app) if they want to keep editing.

## Output contract

Always produce two things in the conversation files folder:

1. `<name>.drawio` — the editable source (this is the deliverable).
2. `<name>.svg` — a rendered preview so the user can see the diagram
   in chat without opening anything. SVG only; the agent must NOT attempt
   PNG export from this skill (PNG needs a headless browser we don't host).

Skip step 2 only when the user explicitly says "drawio file only,
don't render".

## The spec is a YAML object you feed to `build_flow.js`

```yaml
kind: flow                  # 'flow' | 'network' | 'sequence' | 'decision'
title: Invoice approval
theme: tech-blue            # tech-blue | mono | warm | dark | high-contrast
nodes:
  - id: start
    shape: start            # start | end | task | gateway | subprocess | data | document
    label: Invoice received
  - id: match
    shape: gateway
    label: 3-way match?
  - id: approve
    shape: task
    label: Auto-approve
  - id: exception
    shape: task
    label: Route to exception team
  - id: pay
    shape: task
    label: Schedule payment
  - id: end
    shape: end
    label: Paid
edges:
  - { from: start,    to: match }
  - { from: match,    to: approve,   label: yes }
  - { from: match,    to: exception, label: no }
  - { from: approve,  to: pay }
  - { from: exception, to: pay,      label: after review }
  - { from: pay,      to: end }
swimlanes:                    # optional — group nodes by lane
  - { name: AP team,    nodes: [start, match] }
  - { name: System,     nodes: [approve, pay, end] }
  - { name: Reviewer,   nodes: [exception] }
```

The build script handles auto-layout (top-down by default;
left-to-right for sequence flows), swimlane partitioning, edge
routing, theme application, and validation. Read `references/spec-format.md`
for every field, including network/sequence/decision variants.

## Reading order — only load what the route needs

| Route | Read | Skip |
|---|---|---|
| Author a basic flow | `references/spec-format.md` only | the rest |
| BPMN-style with gateways / events | `references/patterns.md` + `references/spec-format.md` | drawio-xml.md |
| Network topology with vendor icons | `references/patterns.md#network` + `references/styling.md` | — |
| Modify an uploaded `.drawio` | `references/drawio-xml.md` | spec-format.md |
| Themed / branded output | `references/styling.md` | drawio-xml.md |

Don't load reference files speculatively. Each costs tokens.

## Style rules — non-negotiable

1. **One concept per diagram.** Split anything beyond ~25 nodes into a master
   flow + zoomed sub-flows; the build script will warn you above the limit.
2. **Names are short verb-phrases** ("Invoice received") not noun bricks
   ("InvoiceReceivedFromVendorViaEmail").
3. **Decision nodes always end with `?`** and use `shape: gateway`.
4. **Edge labels say the answer**, not the question. `{label: yes}` not
   `{label: 'is matched?'}`.
5. **Swimlanes for cross-actor flows**, not for single-team processes.
6. **Pick a theme up front** — don't mix per-node colour overrides with
   themed defaults. The build script will reject mixed input.

## Validation before announcing the file is ready

Before telling the user "here's your diagram", confirm via the script's
own validation pass — the script returns `{ ok: true, warnings: [...] }`
when the diagram is well-formed. Surface any warnings in your reply
verbatim so the user sees them.

## What this skill does NOT do

- **PNG / PDF export** — needs a headless browser; route to draw.io Desktop
  if the user needs raster output.
- **Live editing** — this is a one-shot generator. Use draw.io Desktop or
  the web app for interactive refinement.
- **Mermaid output** — that's the `process-diagram` skill's job.
- **Hand-drawn / sketchy aesthetic** — drawio's native look only.
