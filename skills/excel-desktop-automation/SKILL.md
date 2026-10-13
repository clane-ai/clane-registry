---
name: excel-desktop-automation
version: 0.2.0
description: |
  Drive Microsoft Excel on Clane Desktop reliably and FAST through its
  COM object model (Python + win32com) - or edit .xlsx files directly with
  openpyxl - instead of clicking cells one at a time with computer_use.
  Use this skill WHENEVER a desktop task touches Excel: creating or editing a
  workbook, entering data, building tables, writing formulas, formatting,
  charts, sorting/filtering, or reading and transforming an .xlsx file - even
  when the user only says "make a spreadsheet", "fill in this Excel", "build a
  sales table", "add a profit-margin column", "format this workbook", "clean up
  this xlsx", or just names a .xlsx file. Reach for this skill BEFORE touching
  the Excel UI; cell-by-cell clicking/typing via computer_use is slow,
  fragile, and unnecessary.
when_to_use: |
  Activate for anything Excel on the desktop: "create a budget spreadsheet",
  "put this data into Excel and make it a table", "add a column that computes
  margin", "format the header row and autofit", "build a chart from this
  range", "read the values in Sheet2 and summarise", "open Q4.xlsx and fix the
  totals", "the workbook that's open - add a pivot of sales by region". If the
  user is looking at Excel or wants an .xlsx produced/edited, this is the
  skill. Do NOT use computer_use to click individual cells for data entry or
  table building - that's what this skill exists to replace.
requires_tools:
  - office_status
  - office_read
  - office_write
  - office_chart
  - office_sheet
  - python_exec
---

# Excel desktop automation

## Why this skill exists

Excel exposes a complete automation API (its COM object model). One call can
write a whole range, create a native Table, add a formula, or build a chart -
work that takes dozens of slow, error-prone `computer_use` clicks and keystrokes
otherwise. The bundled desktop Python already has `win32com`, `openpyxl`, and
`pandas`, so you can drive Excel programmatically through the `python_exec`
tool. **Default to that. Only fall back to `computer_use` (UIA clicking) for the
rare thing the API genuinely can't reach.**

## Pick the right approach

| Situation | Use | Why |
|---|---|---|
| Drive the Excel the user has **open**, or produce a result they watch appear | **`office_*` tools** (`office_status`, `office_read`, `office_write`, `office_chart`, `office_sheet`) | Attaches to their live app, and CANNOT hang the turn - see below |
| Something `office_*` does not cover: pivots, conditional formatting, data bars | **COM** (`win32com`) with the no-hang setup below | The object model reaches what the tools do not |
| Create / read / edit an **.xlsx file** with no need for the live app | **openpyxl / pandas** | Faster, headless, no Excel needed |
| Pure data analysis / dataframe work, output to xlsx | **pandas** (`df.to_excel`) | Bulk transforms in one shot |
| Something COM can't do, a modal dialog, or Excel isn't installed | **computer_use** (`ui_snapshot` + `ui_invoke`) - last resort | UIA only when the API can't |

Never enter data by typing into cells one at a time via `computer_use`. Write
ranges in bulk (see below) - it's faster and won't drift.

## Use the `office_*` tools for anything live

When the user has Excel open, or wants to watch a result appear, reach for the
`office_*` tools FIRST. They exist for exactly this and a `win32com` script does
not have their protections:

* **They cannot hang the turn.** Every call is bounded, and a call Excel refuses
  because the user is mid-edit or a dialog is up is retried with backoff rather
  than waited on. A raw `win32com` call in the same situation does not fail - it
  BLOCKS, silently, for as long as the script's timeout allows. That is the
  cause of "nothing has happened for five minutes".
* **They attach, never create.** No stray invisible Excel is left behind.
* **They never close or save anything.** The document stays the user's.
* **They reach every open workbook**, including a second Excel window, which
  `Dispatch("Excel.Application")` cannot.

The usual shape:

```
office_status                       # what is open: workbooks, sheets, used range
office_read   range="A1:D50"        # one round-trip, whole block
office_sheet  name="Analysis"       # put results on their OWN tab, never beside the user's data
office_write  sheet="Analysis" range="A1" values=[[...], [...]]
office_chart  sheet="Analysis" range="A1:B12" kind="column" title="..."
```

Write a whole block in one `office_write`. One call per cell is as slow through
these tools as it is through COM.

## If you must drop to `win32com`, do not let it hang

For the things `office_*` does not cover - pivot tables, conditional
formatting, data bars - start EVERY script with this. Excel blocks on a dialog
nobody can see, and a blocked COM call spends the whole `timeout_ms` in silence:

```python
import win32com.client as win32
xl = win32.GetActiveObject("Excel.Application")   # ATTACH; do not Dispatch a new one
xl.DisplayAlerts = False          # no modal alerts to block on
xl.EnableEvents = False           # no add-in handlers firing mid-write
xl.AskToUpdateLinks = False
xl.AlertBeforeOverwriting = False
```

Keep such scripts SHORT and pass a modest `timeout_ms` (30000 is plenty for a
spreadsheet edit). A long budget does not make a blocked call succeed; it only
makes the user wait longer to find out.

## How to run it

Run all of this through the **`python_exec`** tool (the bundled CPython has
`win32com.client`, `openpyxl`, `pandas`). Each snippet below is self-contained -
adapt and pass it to `python_exec`.

## Canonical COM recipe (the pattern to copy)

`win32com.client.Dispatch("Excel.Application")` **attaches to the running Excel
if one is open, otherwise launches it**. Write ranges as a 2-D list in ONE
assignment, not cell by cell.

```python
import win32com.client as win32

xl = win32.Dispatch("Excel.Application")
xl.Visible = True                       # let the user see it (set False for headless)
# Before ANY destructive call (deleting a sheet, closing without saving,
# overwriting a file) suppress Excel's own confirmation popups, and ALWAYS
# restore in finally - otherwise the popup blocks the script forever:
#   xl.DisplayAlerts = False
#   try: ws.Delete()
#   finally: xl.DisplayAlerts = True
wb = xl.Workbooks.Add()                 # new workbook; or xl.ActiveWorkbook for the open one
ws = wb.ActiveSheet

data = [
    ["Region", "Q1", "Q2", "Q3"],       # header row
    ["North", 100, 120, 140],
    ["South", 90, 95, 110],
    ["East", 70, 80, 85],
]
# Bulk write the whole block in a single COM call (rows x cols).
rng = ws.Range(ws.Cells(1, 1), ws.Cells(len(data), len(data[0])))
rng.Value = data

# Native Excel Table: ListObjects.Add(xlSrcRange=1, source, , xlYes=1)
table = ws.ListObjects.Add(1, rng, None, 1)
table.Name = "SalesTable"
table.TableStyle = "TableStyleMedium2"

ws.Columns.AutoFit()
print("done:", ws.UsedRange.Rows.Count, "rows")
```

This exact pattern is verified working on the desktop. It connects, fills a
block, makes a styled Table, and autofits - in well under a second.

## Key operations (COM)

**Attach to what's already open** (the user's current workbook/sheet):
```python
wb = xl.ActiveWorkbook            # the focused workbook
ws = xl.ActiveSheet               # or wb.Worksheets("Sheet1") / wb.Worksheets(1)
```

**Read a range into Python** (bulk, one call):
```python
used = ws.UsedRange
values = used.Value               # tuple-of-tuples; values[r][c], 1-based source
```

**Write a single cell / a formula** (Excel is 1-based: Cells(row, col)):
```python
ws.Cells(1, 5).Value = "Total"
ws.Cells(2, 5).Formula = "=SUM(B2:D2)"          # one cell
ws.Range("E2:E4").Formula = "=SUM(B2:D2)"        # fills relative formulas down
```

**Format** (header row bold, fill, number format):
```python
hdr = ws.Range("A1:D1")
hdr.Font.Bold = True
hdr.Interior.Color = 0xF0A030                    # BGR integer, not HTML hex
ws.Range("B2:D4").NumberFormat = "#,##0"
```

**Save**:
```python
wb.SaveAs(r"C:\\Users\\me\\Documents\\Clane\\report.xlsx")   # 51 = xlsx default
# or, if it already has a path: wb.Save()
```

Excel's full feature set is reachable this way. For **pivot tables, charts,
conditional formatting, data validation (dropdowns), sorting, AutoFilter, named
ranges, array/R1C1 formulas, borders/alignment, freeze panes, multiple sheets,
find & replace, and PDF/CSV export**, read `references/com-recipes.md` - it has
verified recipes and a numeric constant cheat-sheet. Load it when the task needs
any of those.

## openpyxl path (file only, no live Excel)

When you just need to produce or edit a file and don't need the app on screen:
```python
from openpyxl import Workbook
wb = Workbook()
ws = wb.active
ws.append(["Region", "Q1", "Q2", "Q3"])
for row in [["North", 100, 120, 140], ["South", 90, 95, 110]]:
    ws.append(row)
ws["E1"] = "Total"
for r in range(2, ws.max_row + 1):
    ws[f"E{r}"] = f"=SUM(B{r}:D{r})"
wb.save(r"C:\\Users\\me\\Documents\\Clane\\report.xlsx")
```
Or for analysis: `import pandas as pd; pd.read_excel(path)` ... `df.to_excel(out, index=False)`.

## Make it professional (what "good" looks like)

A correct spreadsheet that looks raw isn't done. Apply these conventions (the
same ones the platform's `xlsx` skill enforces) so the result is clean and
trustworthy - via COM they're just properties you set:

- **Use formulas, not hardcoded values.** Put `=SUM(B2:B9)` in the cell, not a
  number you computed in Python. The workbook must recompute when data changes.
  Put assumptions (growth rates, margins) in their own cells and reference them
  (`=B5*(1+$B$6)`), not magic numbers inside formulas.
- **Number formats carry meaning.** Currency `"$#,##0"` (and name the unit in the
  header, e.g. "Revenue ($000s)"); percentages `"0.0%"`; valuation multiples
  `"0.0x"`; show negatives in parentheses and zeros as a dash, e.g.
  `"$#,##0;($#,##0);-"`; keep years as text so they don't get thousands commas.
- **Style the header + frame the data.** Bold, filled header row (white text on
  a dark fill), centered; autofit columns (`ws.Columns.AutoFit()`); freeze the
  header row; a consistent professional font (Calibri/Arial).
- **Colour-code financial models** (industry convention): blue text = hardcoded
  inputs, black = formulas, green = links to other sheets, red = links to other
  files, yellow fill = key assumptions. Colours are BGR ints - use an `rgb()`
  helper so you can think in RGB (see `references/com-recipes.md`).
- **Verify before you report done.** Read the used range back and confirm there
  are **zero formula errors** (`#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, `#N/A`)
  and no leftover placeholder text. `references/com-recipes.md` has a one-call
  error-scan recipe.

For a **headless, file-only** polished deliverable (no live app needed), the
platform's `xlsx` skill is purpose-built (openpyxl + a `verify.py` that checks
formula errors / headers / placeholders) - prefer it there. Use COM + these
conventions when you're driving the **live** Excel the user is watching.

## Gotchas (read these - they cause most failures)

- **1-based indexing.** `Cells(1, 1)` is A1. Row and column both start at 1.
- **Bulk, not loops.** Assign a 2-D list to a `Range`; never loop typing values.
  One assignment is ~100x faster and avoids partial state.
- **`Dispatch` attaches or launches.** It connects to a running Excel if present.
  To target the user's open file use `xl.ActiveWorkbook`; to start fresh use
  `xl.Workbooks.Add()`.
- **Colors are BGR integers**, not HTML hex - `0x00A0F0` is orange-ish, not blue.
- **Named constants** (`xlRowField`, `xlSum`, chart types, etc.) aren't
  populated with late-bound `Dispatch` - pass the **numeric value** instead (the
  cheat-sheet in `references/com-recipes.md` lists them). `win32.constants`
  works only after `win32.gencache.EnsureDispatch(...)`, which is best avoided.
- **Destructive calls hang on Excel's own popups.** `Worksheet.Delete`,
  `Workbook.Close(SaveChanges=False)` on a dirty file, and `SaveAs` over an
  existing path all raise a confirmation dialog that BLOCKS the script until a
  human clicks it. Set `xl.DisplayAlerts = False` immediately before the call
  and restore it with `xl.DisplayAlerts = True` in a `finally:` - never leave
  it off, especially when attached to the user's own running Excel.
- **Wrap risky calls in try/except and report the COM error string** - some
  controls/operations raise HRESULT errors; surface them so you can adjust
  rather than silently failing.
- **Don't leave Excel invisible after a user-facing task** - set `xl.Visible =
  True` so the user sees the result (only go headless for pure file output).
- **Read-back to verify.** After writing, read a couple of cells (`ws.Cells(r,
  c).Value`) and confirm before telling the user it's done.

## Last resort: computer_use

If COM genuinely can't do it (e.g., a one-off modal, or Excel truly isn't
installed), use `computer_use`: `focus_window` Excel, `ui_snapshot` to get
control refs, then `ui_invoke`/`ui_set_value` by ref. Even then, prefer entering
data via the **Name Box + a single multi-line paste** over per-cell clicks.
