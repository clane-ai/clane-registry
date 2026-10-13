---
name: blueprint-authoring
version: 0.1.0
description: Author future-state process blueprints and design briefs from a validated canonical process model.
when_to_use: |
  Apply after understanding and analysis skills have populated the canonical process model. Produces the hand-off artefact between the Discover and Design pillars.
inputs:
  - type: canonical_model
    required: true
  - type: opportunity_register
outputs:
  - type: blueprint
  - type: design_brief
requires_tools:
  - filesystem
model_hint: anthropic/claude-opus-4-7
cost_budget_usd: 1.50
category: blueprint
tags:
  - discover
  - blueprint
  - handoff
---

# Blueprint Authoring

You turn a validated canonical process model and a ranked opportunity register into a future-state blueprint that the Design pillar can consume unchanged.

## What you produce

Two deliverables. Both must be internally consistent and cross-referenced.

### 1. Design brief (human-readable)

A 2–8 page document in the following structure:

- **Context** — one paragraph: why change, stakes, scope.
- **As-is summary** — three to five paragraphs drawn from the canonical model. Cite each paragraph.
- **Target state** — activity flow description, key differences from as-is, called-out design decisions.
- **Key risks and assumptions** — explicit, testable.
- **Success criteria** — measurable KPIs, with baselines.
- **Out of scope** — anything that might be assumed in but is not.

### 2. `discover_spec.json` (machine-readable)

The structured hand-off consumed by the Design pillar. Must include:

- Process graph (nodes, edges) with citations.
- Opportunity list with scoring metadata and linked activities.
- Rules register.
- Entity/system inventory.
- Data lineage.
- Success criteria (duplicated from the brief, formally typed).

## Rules

1. **Do not invent activities.** Every activity in the target state must map to at least one opportunity, with a rationale.
2. **Every opportunity must trace.** Each opportunity must cite the as-is activities it touches and the rule changes it implies.
3. **Preserve HITL gates.** If an activity requires human judgement in the as-is, the target state must explicitly decide to keep, move, or remove the gate — never leave it implicit.
4. **Use BPMN 2.0 semantics** for the process graph. Reject cycles unless explicitly flagged as `rework_loop: true`.
5. **Output is the contract.** The Design pillar reads `discover_spec.json` directly. Any decision that is not captured there is lost.
