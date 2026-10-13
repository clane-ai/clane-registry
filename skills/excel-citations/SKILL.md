---
name: excel-citations
description: |
  Activate this skill on every Excel role run. Defines the canonical
  citation pattern: cell-level comments with [source: ...] tags on
  any value pulled from outside the workbook (web search, PDF
  extraction, chat threads, rules sheets, user-provided inputs).
  Auditability is non-negotiable — Endex / FactSet / VisibleAlpha
  ship this and our role.yaml mandates it via a guard.
trigger_keywords:
  - citation
  - source
  - audit
  - traceable
  - comment
  - reference
  - provenance
  - cite
---

# Cell-level citation discipline

## When to cite
ALWAYS cite when a written cell value came from outside the current workbook:
- `web_search` results
- A PDF you extracted from
- An earlier message in this chat thread
- A "rules" sheet in this workbook (yes — even cross-sheet citations help)
- User-provided inputs (so the next reader knows it's user-supplied)

DON'T cite:
- Pure formulas with no external inputs (`=A1*1.05`)
- Format-only changes (colour, border, alignment)
- The agent's own arithmetic on already-cited values

## Source taxonomy

```
[source: web:<url>]                               — web_search result
[source: pdf:<filename>:p<page>]                  — PDF page reference
[source: chat:<conv-id>:msg-<message-id>]         — earlier chat message
[source: rules-sheet:<sheet>!<range>]             — same-workbook rules
[source: user-input]                              — user typed the value directly
[source: market-data:<provider>:<ticker>:<date>]  — external data provider
[source: sources!<row>]                           — see "Sources sheet" below
```

Use the most specific tag that applies. Multiple sources allowed: `[source: web:url1, pdf:foo.pdf:p3]`.

## How to add a comment via excel_run_js

```js
// excel_run_js — add a citation comment to a single cell
const ws = context.workbook.worksheets.getActiveWorksheet();
const cell = ws.getRange("B5");
ws.comments.add(cell, "[source: web:https://10kfilings.com/foo]");
await context.sync();
```

For an existing comment (overwrite):

```js
const existing = ws.comments.getItemAt(0); // or by cell address
existing.delete();
ws.comments.add(cell, "[source: ...]");
```

## One-shot pattern for multi-cell writes
When writing a block of cells from a single source, comment ONLY the top-left anchor cell, not every cell:

```js
// Wrote B5:F5 with 5 quarterly figures from one 10K
ws.comments.add(ws.getRange("B5"), "[source: pdf:tesla-10k-2025.pdf:p23]");
```

Rationale: 5 identical comments clutter the workbook. The reader sees the anchor and infers the row.

## Sources sheet pattern
For models with many citations (>10 sources), maintain a separate `Sources` sheet:

| ID | Type | Source | Date pulled | Notes |
|----|------|--------|-------------|-------|
| S1 | web | https://… | 07-May-2026 | Q1 2026 earnings call |
| S2 | pdf | tesla-10k-2025.pdf | 07-May-2026 | Annual 10-K filing |
| S3 | market-data | Bloomberg:AAPL:2026-05-06 | 07-May-2026 | Closing price |

Then cell comments reference the sheet: `[source: sources!S2]`. Cleaner than embedding long URLs everywhere.

## Visual indicator (optional but recommended)
For cells with citations, add a subtle visual:
- Tiny red triangle in the top-right corner (Excel's default comment marker handles this — don't override)
- Or — apply a thin underline to the cell to signal "external source"
- Don't change the cell colour — that's reserved for input/calc/link discipline

## Citation completeness check
At the end of any model build, run a check:

```js
// excel_run_js — count cells with comments vs cells with externally-sourced values
const ws = context.workbook.worksheets.getActiveWorksheet();
const allComments = ws.comments.load("count");
await context.sync();
console.log(`${allComments.count} citations on this sheet`);
```

Add a "Citations" KPI on the dashboard for sheet-level coverage.

## Anti-patterns
- DON'T cite the agent's own previous output — that's not a source, it's transient
- DON'T cite formulas (`=A1*1.05`) — only cells with externally-sourced values
- DON'T leave URL parameters / tracking IDs in `[source: web:...]` — strip query params unless they're meaningful
- DON'T cite a chat by its full text — use the conversation/message ID
- DON'T paste a 200-character URL into a comment — use the Sources sheet pattern instead
- DON'T forget `[source: user-input]` for values the user explicitly provided — the next reader needs to know it's not derived

## Why this matters
Endex / Apers / Bloomberg's selling point is auditable AI output. A finance analyst who hands a board their unsourced model is gone. Citations are how the agent earns trust at the level a real analyst is held to.
