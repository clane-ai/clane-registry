---
name: excel-layout-polish
description: |
  Final-pass layout audit and polish for any Excel build. Activate
  AFTER the mechanical work (DCF, tracker, dashboard) is done but
  BEFORE reporting back to the user. Reads the actual rendered
  layout (column widths, format strings, merge ranges, freeze panes,
  header styling), compares against the house style + per-domain
  conventions, and applies fixes via excel_run_js. Owns the cross-
  cutting "make it look right" rules that would otherwise drift and
  duplicate across every domain skill.
trigger_keywords:
  - polish
  - format
  - layout
  - alignment
  - tidy
  - clean up
  - fix the formatting
  - looks ugly
  - looks off
  - columns are wrong
  - headers
  - freeze panes
  - banding
  - professional
  - presentable
---

# Excel layout polish

## When to use
- After ANY excel build (DCF, tracker, dashboard, comps table) — call this as a final pass before reporting "done" to the user
- When the user says "the formatting is off", "the columns are wrong", "make it look more professional", "this looks ugly", "tidy this up"
- After a long multi-step build where you set ranges in phases and want to audit consistency before handing back

## House style defaults
The platform-wide rules every Clane-built workbook should follow unless a domain skill explicitly overrides them:

| Element | Default |
|---|---|
| Font | Calibri 11 (Excel default — change only if user asks) |
| Header row | Bold, white text on dark fill (`#1F4E78`) |
| Frozen panes | Top row always; first column when it's a label column |
| Section banding | Alternating `#F2F2F2` on every other data row |
| Number alignment | Numbers right, text left, headers centred |
| Number format consistency | One format per column — never mix `$1,234` and `1234.00` in the same column |
| Borders | Minimal — only on section boundaries (top + bottom of header row, bottom of last data row) |
| Merged cells | Only in titles / section headers — NEVER in data ranges (breaks sort, filter, lookup) |
| Section spacing | One blank row between sections |
| Column widths | Auto-fit then round up to nearest 2 — matching widths within a logical group |
| Tab colours | Use to group sheets — Inputs (blue), Outputs (green), Sources (grey) |

## Per-domain overrides (when active)
- **financial-modeling** — keep the cell-colour discipline (Blue inputs / Black calcs / Green links / Red errors) on top of the house style. Header fill stays house-default.
- **excel-dashboards** — header fill matches the dashboard accent colour the skill picked. Hero KPI cards override the banding rule (no banding inside a card).
- **project-tracking** — Status column uses RAG fills; do NOT overwrite those with the section-banding colour.
- **data-analysis-excel** — pivot tables manage their own format; skip banding on pivot ranges.

## Audit checklist (run BEFORE fixing)
Walk the used range and check each:

1. **Header row** — bold? White-on-dark fill? Frozen? Centred?
2. **Column widths** — every column wide enough that nothing is truncated? No columns absurdly wide (>50)? Widths consistent within logical groups?
3. **Number formats** — every column with numbers has a format set (not `General`)? Format consistent within the column? Negatives handled (red parens for currency)?
4. **Alignment** — numeric columns right-aligned? Text columns left? Headers centred?
5. **Merged cells** — any merges in the data range that would break sort/filter? Title merges spanning the right number of columns?
6. **Freeze panes** — top row frozen? First column frozen if it's a label column?
7. **Banding** — alternating rows applied? Skipped on cards / RAG / pivots per overrides above?
8. **Blank rows** — separating sections? Not stranded mid-section (signals a half-finished build)?
9. **Borders** — minimal and meaningful? No "every cell has all four borders" sprawl?
10. **Tab colour + name** — sheet name descriptive? Tab colour grouping consistent?
11. **Data sanity** — does the just-written range show the broadcast-corruption pattern (same large blob across every cell)? See "Data sanity audit" below — this is critical, run it on every set_range you just made.

## Data sanity audit
This is structurally separate from the layout audit because it checks
WHAT is in the cells, not how they look. Triggered by a 2026-05-07
incident where excel_set_range received a JSON-stringified array as
its `values` arg and Office.js broadcast that single string into
every cell of the target range — workbook looked styled but every
data cell was JSON garbage. The backend now validates `values`
shape before dispatch, but a defensive in-workbook check stays
worth running because:
- The bug could surface again from a different code path (manual
  paste, a future MCP tool, a misbehaved excel_run_js snippet that
  did `range.values = blob` on its own).
- The same broadcast pattern can come from user error too (paste of
  a single cell across a multi-cell selection).

### What's a legitimate blob in a cell vs. corruption
**Legit blobs** — these are real workflows; do NOT flag them:
- Audit log sheets — `payload`, `metadata`, `body` columns holding `{...}`
- API test data — request body / expected response columns each holding JSON
- Rule / config sheets — JSON-Logic, YAML snippets, regex patterns
- ML datasets — model outputs (logits, classifications, embeddings, base64)
- Stack traces / error messages in QA workbooks
- Markdown notes in PMO trackers, meeting minutes
- Encoded payloads — hashes, signatures, base64 attachments

**Corruption** — flag and ask:
- A range of ≥10 cells that all hold the EXACT SAME value, AND that value is >200 chars
- A single cell holding what looks like the entire intended multi-row dataset (size ratio anomaly)
- Cells with doubly-escaped quotes (`""USD""` instead of `"USD"`)
- Cells ending with orphan close-delimiters (`]]}` with no matching open) — sign of a `{values:...}` wrapper that got partially stripped

### Column-header whitelist (blobs expected here, skip the audit)
Header keyword match (case-insensitive, substring) → treat the column as intentionally blob-bearing:
- `payload`, `body`, `metadata`, `request`, `response`
- `json`, `yaml`, `xml`, `config`, `rules`
- `notes`, `comment`, `description`, `markdown`
- `stacktrace`, `stack`, `error`, `log`
- `embedding`, `logits`, `vector`

### Diagnostic query (run on the just-written range)
```js
const sheet = context.workbook.worksheets.getActiveWorksheet();
const range = sheet.getRange(WRITTEN_RANGE_ADDRESS); // e.g. "B5:F46"
range.load(['rowCount', 'columnCount', 'values']);
const header = sheet.getRange(WRITTEN_RANGE_ADDRESS).getRow(0);
header.load('values');
await context.sync();

const headerCells = (header.values[0] || []).map((h) => String(h ?? '').toLowerCase());
const BLOB_KEYWORDS = [
  'payload', 'body', 'metadata', 'request', 'response',
  'json', 'yaml', 'xml', 'config', 'rules',
  'notes', 'comment', 'description', 'markdown',
  'stacktrace', 'stack', 'error', 'log',
  'embedding', 'logits', 'vector',
];
const blobColumns = new Set();
headerCells.forEach((h, idx) => {
  if (BLOB_KEYWORDS.some((kw) => h.includes(kw))) blobColumns.add(idx);
});

// Flatten all cells (excluding header) and bucket by exact value to
// detect the broadcast pattern. Skip cells in blob-whitelisted columns.
const buckets = new Map();
for (let r = 1; r < range.rowCount; r++) {
  for (let c = 0; c < range.columnCount; c++) {
    if (blobColumns.has(c)) continue;
    const v = range.values[r][c];
    if (typeof v !== 'string' || v.length < 200) continue;
    const key = v;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
}

// Confirming signals on the most-repeated cell value.
let suspect = null;
for (const [val, count] of buckets) {
  if (count < 10) continue;
  const doubleQuoted = /""[^"]+""/.test(val);
  const orphanClose = /[\]}]\s*$/.test(val) && (val.match(/\{/g)?.length ?? 0) < (val.match(/\}/g)?.length ?? 0);
  suspect = {
    sample: val.slice(0, 120),
    repeated_in_cells: count,
    length_chars: val.length,
    doubly_escaped_quotes: doubleQuoted,
    orphan_close_delimiter: orphanClose,
  };
  break;
}

return {
  range: WRITTEN_RANGE_ADDRESS,
  blob_columns_skipped: [...blobColumns],
  suspect_broadcast: suspect,
};
```

### Flag, don't auto-fix
If the diagnostic returns a non-null `suspect_broadcast`, DO NOT silently rewrite. Tell the user what you found:

> *"The B5:F46 range I just wrote contains 252 cells holding the same 3,140-character JSON-like string (sample: `[[1,"US Dollar","USD",1.1724,...`). This looks like broadcast corruption — Office.js does this when `values` is passed as a single string instead of a 2D array. Want me to clear B5:F46 and rebuild from the original data, or was this intentional?"*

The user confirms before you take destructive action. Auto-fix here would destroy a legit JSON-payload sheet someone built last quarter.

### When to skip the audit entirely
- The just-written range is a single cell — broadcast is impossible by definition.
- Every column in the range is on the blob whitelist (the user's intent is clearly "structured data per cell").
- The user explicitly said "I'm building a payload sheet" / "the cells should hold JSON" — trust the stated intent.

## Diagnostic queries
Read the current state via excel_run_js so the audit is fact-based, not guessed:

```js
// Inspect a sheet's overall layout
const sheet = context.workbook.worksheets.getActiveWorksheet();
const used = sheet.getUsedRange();
used.load(['address', 'rowCount', 'columnCount', 'numberFormat', 'format/horizontalAlignment']);
const header = used.getRow(0);
header.load(['format/font/bold', 'format/font/color', 'format/fill/color', 'format/horizontalAlignment']);
const freeze = sheet.freezePanes.getLocationOrNullObject();
freeze.load('address');
await context.sync();

return {
  used_range: used.address,
  header_bold: header.format.font.bold,
  header_fill: header.format.fill.color,
  header_align: header.format.horizontalAlignment,
  freeze_anchor: freeze.isNullObject ? null : freeze.address,
  number_formats: used.numberFormat, // 2-D array
};
```

```js
// Inspect column widths to spot inconsistency
const sheet = context.workbook.worksheets.getActiveWorksheet();
const used = sheet.getUsedRange();
used.load('columnCount');
await context.sync();
const widths = [];
for (let c = 0; c < used.columnCount; c++) {
  const col = sheet.getCell(0, c).getEntireColumn();
  col.load('format/columnWidth');
  widths.push(col);
}
await context.sync();
return widths.map((w, i) => ({ col: i, width: w.format.columnWidth }));
```

```js
// Find merged ranges in the data area (these break sort/filter)
const sheet = context.workbook.worksheets.getActiveWorksheet();
const used = sheet.getUsedRange();
const merged = used.getMergedAreasOrNullObject();
merged.load('areaCount');
await context.sync();
if (merged.isNullObject) return { merges: [] };
const out = [];
for (let i = 0; i < merged.areaCount; i++) {
  const a = merged.areas.getItemAt(i);
  a.load('address');
  out.push(a);
}
await context.sync();
return { merges: out.map((a) => a.address) };
```

## Fix patterns
After the audit reports issues, apply targeted fixes — NOT a full re-format. Touch only what's wrong.

### Apply the house-style header
```js
const sheet = context.workbook.worksheets.getActiveWorksheet();
const used = sheet.getUsedRange();
used.load('columnCount');
await context.sync();
const header = sheet.getRangeByIndexes(0, 0, 1, used.columnCount);
header.format.font.bold = true;
header.format.font.color = '#FFFFFF';
header.format.fill.color = '#1F4E78';
header.format.horizontalAlignment = 'Center';
sheet.freezePanes.freezeRows(1);
await context.sync();
```

### Apply alternating row banding
```js
const sheet = context.workbook.worksheets.getActiveWorksheet();
const used = sheet.getUsedRange();
used.load(['rowCount', 'columnCount']);
await context.sync();
// Skip header (row 0); band data rows starting at row 1.
for (let r = 1; r < used.rowCount; r++) {
  if (r % 2 === 0) {
    const row = sheet.getRangeByIndexes(r, 0, 1, used.columnCount);
    row.format.fill.color = '#F2F2F2';
  }
}
await context.sync();
```

### Auto-fit and round column widths
```js
const sheet = context.workbook.worksheets.getActiveWorksheet();
const used = sheet.getUsedRange();
used.format.autofitColumns();
await context.sync();
used.load('columnCount');
await context.sync();
// Round up to nearest 2 so columns look uniform-ish, not jagged.
for (let c = 0; c < used.columnCount; c++) {
  const col = sheet.getCell(0, c).getEntireColumn();
  col.load('format/columnWidth');
  await context.sync();
  col.format.columnWidth = Math.ceil(col.format.columnWidth / 2) * 2;
}
await context.sync();
```

### Fix alignment by column type
```js
const sheet = context.workbook.worksheets.getActiveWorksheet();
const used = sheet.getUsedRange();
used.load(['rowCount', 'columnCount', 'values']);
await context.sync();
// Look at row 1 (first data row) to decide alignment per column.
for (let c = 0; c < used.columnCount; c++) {
  const probe = used.values[1]?.[c];
  const align = typeof probe === 'number' ? 'Right' : 'Left';
  const dataCol = sheet.getRangeByIndexes(1, c, used.rowCount - 1, 1);
  dataCol.format.horizontalAlignment = align;
}
// Headers always centred.
const header = sheet.getRangeByIndexes(0, 0, 1, used.columnCount);
header.format.horizontalAlignment = 'Center';
await context.sync();
```

### Unmerge data-area merges (preserve title merges)
```js
const sheet = context.workbook.worksheets.getActiveWorksheet();
const used = sheet.getUsedRange();
const merged = used.getMergedAreasOrNullObject();
merged.load('areaCount');
await context.sync();
if (merged.isNullObject) return;
for (let i = 0; i < merged.areaCount; i++) {
  const a = merged.areas.getItemAt(i);
  a.load('address');
  await context.sync();
  // Heuristic: rows 0-1 are titles → keep merged.
  // Anything below is data → unmerge.
  const firstRow = parseInt(a.address.match(/(\d+):?/)?.[1] ?? '99', 10);
  if (firstRow > 2) a.unmerge();
}
await context.sync();
```

## One-shot polish pass
For a fresh build that hasn't had any styling applied yet, this is the canonical "everything at once" recipe. Use ONLY when starting from raw values; never on a workbook with existing intentional formatting.

```js
const sheet = context.workbook.worksheets.getActiveWorksheet();
const used = sheet.getUsedRange();
used.load(['rowCount', 'columnCount', 'values']);
await context.sync();

// 1. Header
const header = sheet.getRangeByIndexes(0, 0, 1, used.columnCount);
header.format.font.bold = true;
header.format.font.color = '#FFFFFF';
header.format.fill.color = '#1F4E78';
header.format.horizontalAlignment = 'Center';

// 2. Freeze top row
sheet.freezePanes.freezeRows(1);

// 3. Banding (every even row, data only)
for (let r = 1; r < used.rowCount; r++) {
  if (r % 2 === 0) {
    sheet.getRangeByIndexes(r, 0, 1, used.columnCount).format.fill.color = '#F2F2F2';
  }
}

// 4. Alignment by detected type
for (let c = 0; c < used.columnCount; c++) {
  const probe = used.values[1]?.[c];
  const align = typeof probe === 'number' ? 'Right' : 'Left';
  sheet.getRangeByIndexes(1, c, used.rowCount - 1, 1).format.horizontalAlignment = align;
}

// 5. Auto-fit columns
used.format.autofitColumns();

await context.sync();
```

## Anti-patterns
- DON'T re-apply the full polish on a workbook that already has intentional formatting (financial-modeling colour discipline, project-tracking RAG fills) — read first, fix only what's wrong
- DON'T touch ranges outside the used range — leaves the rest of the sheet stable
- DON'T set borders on every cell — minimal borders only at section boundaries
- DON'T merge cells in the data area — breaks sort, filter, autofilter, and XLOOKUP across the merge
- DON'T forget freeze panes — without them the header scrolls away on row 30 and the user is lost
- DON'T overwrite a column's number format without reading what's there first — destroys the financial-modeling team's painstakingly applied negative-paren format

## Audit-then-fix flow
1. Run the diagnostic queries → get current state (header style, widths, merges, freeze, formats)
2. Compare against the audit checklist → list the issues with cell addresses
3. Tell the user what's off in one short paragraph
4. Apply the fix patterns — TARGETED, only the broken bits
5. Run the data-sanity diagnostic on the just-written range. If it flags broadcast corruption, STOP — ask the user to confirm before rewriting (per the "Flag, don't auto-fix" rule).
6. Re-run a quick verification query (header bold? freeze set? banded?) and confirm
7. Report back: "Fixed 4 issues — header was unstyled, columns C-E inconsistent widths, no freeze pane, A:F merged in row 12. House style applied. Data sanity: clean."
