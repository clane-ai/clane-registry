---
name: excel-power-user
description: |
  Spreadsheet work via the Clane Excel Add-in. Activate when the
  conversation is connected to an Excel session (?source=office-addin)
  and the user wants to read, modify, or build a workbook.
trigger_keywords:
  - spreadsheet
  - excel
  - formula
  - pivot
  - sheet
  - range
  - xlsx
---

# Excel power-user skill

## When to use
- Conversation is in the Clane Excel Add-in (chat URL contains
  ?source=office-addin).
- User wants to modify, analyse, or build a workbook.

## How to deliver

### Read before write
Always call `excel_get_range` first to see the structure you're
modifying. Don't guess column positions or sheet names.

```
excel_get_range({ address: null })  // active selection
excel_get_range({ address: "A1:G50" })  // explicit range
```

### Write in chunks
Break large rebuilds into phases. Each phase is a separate
`excel_set_range` call so the user sees progress.

```
// Phase 1: headers
excel_set_range({ address: "A1", values: [["Q1","Q2","Q3","Q4"]] })

// Phase 2: data
excel_set_range({ address: "A2", values: dataRows })

// Phase 3: totals row (formulas, not numbers)
excel_set_range({
  address: "A6",
  values: [["=SUM(A2:A5)","=SUM(B2:B5)","=SUM(C2:C5)","=SUM(D2:D5)"]]
})
```

### Format with lookup tables
For colours/styles, output the lookup FIRST in a code block, then
call `excel_run_js` once with a loop that applies it.

```
const RAG_FILL = { GREEN: '#C6EFCE', AMBER: '#FFEB9C', RED: '#FFC7CE' };
const RAG_FONT = { GREEN: '#006100', AMBER: '#9C5700', RED: '#9C0006' };
const range = ctx.workbook.worksheets.getActiveWorksheet().getRange("D2:D20");
range.load("values");
await ctx.sync();
range.values.forEach((row, i) => {
  const v = String(row[0] ?? '').toUpperCase();
  if (RAG_FILL[v]) {
    const cell = range.getCell(i, 0);
    cell.format.fill.color = RAG_FILL[v];
    cell.format.font.color = RAG_FONT[v];
  }
});
await ctx.sync();
```

### Source-of-truth references
Project names, status values, RAG enums — pull from a `rules` sheet
in the workbook, not your memory. If the workbook has no rules
sheet and the user wants conventions enforced, OFFER to create one
before applying anything.

## What NOT to do
- Don't generate a whole workbook in one tool call. Break into phases.
- Don't invent column headers — read first.
- Don't hardcode values that should be formulas.
- Don't use `excel_run_js` for things `excel_get_range`/`excel_set_range`
  can do — schema + linting is better than free-form JS for the basic ops.
