---
name: cross-referencing
version: 0.1.0
description: |
  How to add internal "see Section X" pointers between sections that touch on related concepts, without bloating the document with noise. Used by the cross-ref-editor role.
when_to_use: |
  Activate when you are the cross-ref-editor role with the assembled markdown + outline. Not used outside the book-builders revision pass.
inputs:
  - type: outline
    required: true
  - type: assembled_markdown
    required: true
outputs:
  - type: cross_ref_map_json
---

# Cross-referencing

You ADD value, not flag problems. Find pairs of sections where one would benefit from an explicit pointer to the other. Output the cross-ref-map.json the orchestrator's assembly step merges in.

## The three rules

### 1. Backwards-only

Forward references ("see Section 8" from Section 3) break linear flow. Readers either skip ahead (losing thread) or come back later (forgetting). Backward references ("see Section 3" from Section 8) say "the concept here was established earlier, re-anchor if you need" — legitimate reader service.

### 2. No adjacents

Section N → Section N+1 or N-1: trivial walk. Don't bother. Cross-refs earn their cost when they jump 3+ sections.

### 3. Max 2 per section

A doc full of "see Section X" markers reads worse than one with none. Pick the cross-refs that genuinely save the reader from flipping back.

## How to find candidates (efficiently)

Don't read every word of every section pairwise — that's 25×25 = 625 comparisons for a 25-section book. Instead:

1. Read the outline.json first (1K words, all sections summarised).
2. From the outline, identify candidate pairs: section N references a concept defined earlier or builds on an earlier finding.
3. Spot-check the actual section text only for those candidate pairs.

The outline IS the cross-ref-discovery scaffolding.

## Output format

Write `.bible/cross-ref-map.json`:

```json
[
  {
    "from_section": "implications",
    "from_anchor": "scenarios",
    "to_section": "shipping-routes",
    "anchor_text": "Section 4 (Red Sea / Suez Disruption)",
    "reason": "Implications section's 'conflict-escalation scenario' rests on the shipping-cost magnitudes from section 4 — reader needs the explicit pointer to re-anchor."
  },
  {
    "from_section": "strategic-response",
    "from_anchor": "additive-substitution",
    "to_section": "input-chemicals",
    "anchor_text": "Section 5 (Speciality Chemicals)",
    "reason": "Strategic response section mentions 'substitution by alternative additives'; the underlying availability data is in Section 5."
  }
]
```

Fields:

- `from_section` / `to_section` — section IDs from outline.json.
- `from_anchor` — a short string that should be unique in the source section's text; the orchestrator's assembly step finds this string and inserts `(see Section X)` after it.
- `anchor_text` — the literal text rendered as the cross-ref. Typically `Section <N>` or `Section <N> (<title>)` for the first cross-ref to a target.
- `reason` — orchestrator QA only; not rendered in final doc.

## Worked example

50-page paper, 9 sections:

| Section | Title | Notes from outline |
|---|---|---|
| 1 | Executive summary | — |
| 2 | Context | introduces Bab-el-Mandeb conflict |
| 3 | Energy + feedstock | uses cost data |
| 4 | Shipping routes | quantifies WCI movements |
| 5 | Speciality chemicals | additive supply impact |
| 6 | Regulatory | PPWR + crisis derogations |
| 7 | Demand-side shifts | retailer reformulation |
| 8 | Strategic response | named-firm actions |
| 9 | Implications | scenarios for 2026-28 |

Backwards-only candidates:

- Section 9 (implications) → Section 4 (shipping routes) — scenarios rely on shipping-cost magnitudes. ✅ Worth a cross-ref. Jump distance 5.
- Section 8 (strategic response) → Section 5 (speciality chemicals) — substitution strategy references chemicals supply. ✅ Worth it. Jump distance 3.
- Section 8 (strategic response) → Section 7 (demand-side) — strategic moves to address demand shifts. ❌ Adjacent (distance 1). Skip.
- Section 9 (implications) → Section 8 (strategic response) — implications build on strategy. ❌ Adjacent. Skip.
- Section 6 (regulatory) → Section 2 (context) — regulatory response IS context for conflict. Stretch; the context is more about geopolitics than regulation. ❌ Skip — too thin.

Result: 2 cross-refs in the map. Good ratio for a 9-section paper.

## Anti-patterns

- **Cross-referencing for the sake of it** — if section 9 references section 4 and section 5 and section 6 and section 7, the reader gives up. Pick the ONE most-load-bearing pointer.
- **Forward references** — break linear flow. Always backwards.
- **Adjacent cross-refs** — trivially walkable. Don't bother.
- **Reading every word of every section to find concept overlaps** — wastes tokens. The outline is enough scaffolding to find candidates; only spot-check the actual text.
