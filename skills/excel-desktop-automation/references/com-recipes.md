# Excel COM recipes (advanced features)

Deep recipes for driving Excel through `win32com` from `python_exec`. Load this
when a task needs pivots, charts, conditional formatting, validation, sorting,
named ranges, multi-sheet work, or specific save/export formats. Every snippet
assumes you already have a sheet, e.g.:

```python
import win32com.client as win32
xl = win32.Dispatch("Excel.Application"); xl.Visible = True
wb = xl.ActiveWorkbook or xl.Workbooks.Add()
ws = wb.ActiveSheet
```

## Contents
- [Constants: use numeric literals](#constants-use-numeric-literals)
- [Pivot tables](#pivot-tables)
- [Charts](#charts)
- [Conditional formatting](#conditional-formatting)
- [Data validation (dropdowns)](#data-validation-dropdowns)
- [Sort](#sort)
- [AutoFilter](#autofilter)
- [Formulas (incl. fill-down, R1C1, arrays)](#formulas)
- [Named ranges](#named-ranges)
- [Formatting: borders, fonts, alignment, number formats](#formatting)
- [Freeze panes & view](#freeze-panes--view)
- [Multiple sheets](#multiple-sheets)
- [Find & replace](#find--replace)
- [Reading data efficiently](#reading-data-efficiently)
- [Save & export (xlsx, csv, pdf)](#save--export)
- [Constant cheat-sheet](#constant-cheat-sheet-numeric-values)
- [Verify: zero formula errors](#verify-zero-formula-errors)
- [Cleanup & errors](#cleanup--errors)

## Constants: use numeric literals

Excel's named constants (`xlRowField`, `xlSum`, `xlColumnClustered`, …) live in
the type library. Two ways to use them:

1. **Numeric literals (recommended, always works).** Late-bound
   `win32.Dispatch(...)` does NOT populate `win32com.client.constants`, so pass
   the integer value directly: `pt.PivotFields("Region").Orientation = 1`. The
   [cheat-sheet](#constant-cheat-sheet-numeric-values) lists the common ones. This is robust across
   fresh installs and avoids the makepy/gencache "fails on first run" trap.
2. **`win32.constants` (cleaner names).** Works only after
   `xl = win32.gencache.EnsureDispatch("Excel.Application")`, which generates the
   typelib wrappers. Then `win32.constants.xlRowField` is available. Verified
   working on the bundled runtime, but the numeric path is the safer default for
   shipping recipes.

The recipes below use numeric literals with the constant name in a comment.

## Pivot tables

Verified working. `SourceType=1` is `xlDatabase`; field orientations
`1/2/3/4` = row/column/page/data; `-4157` is `xlSum`.

```python
src = ws.Range(ws.Cells(1, 1), ws.Cells(5, 3))  # incl. header row
pc = wb.PivotCaches().Create(SourceType=1, SourceData=src)            # xlDatabase
pt = pc.CreatePivotTable(TableDestination=ws.Cells(1, 6), TableName="PT1")
pt.PivotFields("Region").Orientation = 1     # xlRowField
pt.PivotFields("Product").Orientation = 2    # xlColumnField
pt.AddDataField(pt.PivotFields("Sales"), "Total Sales", -4157)  # xlSum
# Other functions: xlCount=-4112, xlAverage=-4106, xlMax=-4136, xlMin=-4139
```

## Charts

`ChartType` is numeric: clustered column `51`, line `4`, pie `5`, bar `57`,
scatter `-4169`, area `1`.

```python
data = ws.Range("A1:D5")
co = ws.ChartObjects().Add(Left=300, Top=10, Width=360, Height=220)
ch = co.Chart
ch.SetSourceData(Source=data)
ch.ChartType = 51                      # xlColumnClustered
ch.HasTitle = True
ch.ChartTitle.Text = "Quarterly Sales"
# ch.Export(r"C:\\Users\\me\\Documents\\Clane\\chart.png")  # save chart as image
```

## Conditional formatting

`FormatConditions.Add(Type, Operator, Formula1)`. `Type`: `xlCellValue=1`,
`xlExpression=2`. `Operator`: `xlGreater=5`, `xlLess=6`, `xlBetween=1`,
`xlEqual=3`.

```python
rng = ws.Range("C2:C100")
fc = rng.FormatConditions.Add(Type=1, Operator=5, Formula1="=1000")  # cell value > 1000
fc.Interior.Color = 0x00B050           # green fill (BGR)
fc.Font.Bold = True

# Color scale (heatmap) across a range:
rng.FormatConditions.AddColorScale(ColorScaleType=3)

# Data bars:
rng.FormatConditions.AddDatabar()
```

## Data validation (dropdowns)

`Validation.Add(Type, AlertStyle, Operator, Formula1)`. `Type`:
`xlValidateList=3`, `xlValidateWholeNumber=1`, `xlValidateDecimal=2`,
`xlValidateDate=4`. `AlertStyle`: `xlValidAlertStop=1`.

```python
cell = ws.Range("F2")
cell.Validation.Delete()
cell.Validation.Add(Type=3, AlertStyle=1, Formula1="North,South,East,West")  # dropdown list
cell.Validation.InCellDropdown = True
```

## Sort

Quick single-key sort: `Range.Sort(Key1, Order1)`, `xlAscending=1`,
`xlDescending=2`, header `xlYes=1`.

```python
rng = ws.Range("A1").CurrentRegion
rng.Sort(Key1=ws.Range("C2"), Order1=2, Header=1)   # sort by col C descending
```

## AutoFilter

```python
ws.Range("A1").CurrentRegion.AutoFilter(Field=1, Criteria1="North")
# Field is 1-based within the filtered range. Clear: ws.AutoFilterMode = False
```

## Formulas

```python
ws.Cells(2, 5).Formula = "=SUM(B2:D2)"          # one cell, A1-style
ws.Range("E2:E50").Formula = "=SUM(B2:D2)"       # relative refs fill down per row
ws.Range("E2:E50").FormulaR1C1 = "=SUM(RC[-3]:RC[-1])"   # R1C1 (relative) form
ws.Range("G2").FormulaArray = "=SUM(B2:B50*C2:C50)"      # array/CSE formula
```

## Named ranges

```python
wb.Names.Add(Name="SalesData", RefersTo="=Sheet1!$A$1:$D$50")
ws.Range("SalesData")                 # then reference by name
```

## Formatting

Colors are **BGR integers** (`0xBBGGRR`), not HTML hex. Alignment:
`xlCenter=-4108`, `xlLeft=-4131`, `xlRight=-4152`, `xlTop=-4160`,
`xlBottom=-4107`.

```python
hdr = ws.Range("A1:D1")
hdr.Font.Bold = True
hdr.Font.Size = 12
hdr.Font.Color = 0xFFFFFF              # white text
hdr.Interior.Color = 0x903010          # dark-blue-ish fill (BGR)
hdr.HorizontalAlignment = -4108        # xlCenter

# Borders: xlEdgeBottom=9, xlContinuous=1, weight xlThin=2 / xlMedium=-4138
ws.Range("A1:D50").Borders.LineStyle = 1
ws.Range("A1:D1").Borders(9).Weight = -4138

ws.Range("B2:D50").NumberFormat = "#,##0.00"
ws.Range("E2:E50").NumberFormat = "0.0%"
ws.Range("F2:F50").NumberFormat = "$#,##0"
ws.Columns.AutoFit()
ws.Rows("1:1").RowHeight = 22
```

**Think in RGB.** Colours are BGR integers, which is error-prone. Define a
helper and pass RGB triples:

```python
def rgb(r, g, b):
    return r + (g << 8) + (b << 16)   # Excel BGR long

hdr.Font.Color = rgb(255, 255, 255)        # white
hdr.Interior.Color = rgb(31, 78, 121)      # dark blue
```

**Professional / financial-model conventions** (match these unless the user or
an existing template says otherwise - they're what make output look credible):

```python
# Number formats that carry meaning:
ws.Range("B2:B50").NumberFormat = "$#,##0;($#,##0);-"   # currency, negatives in (), zero as -
ws.Range("C2:C50").NumberFormat = "0.0%"                # percentages, one decimal
ws.Range("D2:D50").NumberFormat = "0.0x"                # valuation multiples
ws.Range("A2:A50").NumberFormat = "@"                   # years/IDs as text (no thousands comma)

# Colour-coding (industry standard for models):
inputs = ws.Range("B2:B10");    inputs.Font.Color = rgb(0, 0, 255)    # blue = hardcoded inputs
formulas = ws.Range("C2:C10");  formulas.Font.Color = rgb(0, 0, 0)    # black = formulas/calcs
links = ws.Range("D2:D10");     links.Font.Color = rgb(0, 128, 0)     # green = links to other sheets
external = ws.Range("E2:E10");  external.Font.Color = rgb(255, 0, 0)  # red = links to other files
assume = ws.Range("F2:F10");    assume.Interior.Color = rgb(255, 255, 0)  # yellow fill = key assumptions

# Consistent professional font across the sheet:
ws.UsedRange.Font.Name = "Calibri"
```

Always name the unit in the header when a column is scaled or currency -
"Revenue ($000s)", not a bare "Revenue".

## Freeze panes & view

```python
ws.Activate()
xl.ActiveWindow.FreezePanes = False
xl.ActiveWindow.SplitColumn = 0
xl.ActiveWindow.SplitRow = 1           # freeze the header row
xl.ActiveWindow.FreezePanes = True
```

## Multiple sheets

```python
ws2 = wb.Worksheets.Add(After=wb.Worksheets(wb.Worksheets.Count))
ws2.Name = "Summary"
wb.Worksheets("Summary").Activate()
# Existing: wb.Worksheets("Sheet1") or wb.Worksheets(1) (1-based)
# Delete without a prompt:
xl.DisplayAlerts = False; wb.Worksheets("Old").Delete(); xl.DisplayAlerts = True
```

## Find & replace

```python
ws.UsedRange.Replace(What="N/A", Replacement="0", LookAt=2)   # xlPart=2, xlWhole=1
cell = ws.UsedRange.Find(What="Total")   # returns the Range or None
if cell is not None:
    print(cell.Address, cell.Value)
```

## Reading data efficiently

```python
used = ws.UsedRange
values = used.Value                     # tuple-of-tuples, 1-based in Excel
rows = [list(r) for r in values]        # to a Python list-of-lists
# A specific block:
block = ws.Range("A1:D50").Value
# Last row/col of data:
last_row = ws.Cells(ws.Rows.Count, 1).End(-4162).Row   # xlUp=-4162
last_col = ws.Cells(1, ws.Columns.Count).End(-4159).Column  # xlToLeft=-4159
```

## Save & export

```python
wb.SaveAs(r"C:\\Users\\me\\Documents\\Clane\\report.xlsx", FileFormat=51)  # xlsx
# xlsm (macros) = 52, csv = 6, default = 51
# PDF export (xlTypePDF=0):
ws.ExportAsFixedFormat(0, r"C:\\Users\\me\\Documents\\Clane\\report.pdf")
wb.Save()                               # if it already has a path
```

## Constant cheat-sheet (numeric values)

| Constant | Value | Use |
|---|---|---|
| xlSrcRange | 1 | `ListObjects.Add` source type |
| xlYes / xlNo | 1 / 2 | has-headers |
| xlDatabase | 1 | `PivotCaches.Create` source type |
| xlRowField / xlColumnField / xlPageField / xlDataField | 1 / 2 / 3 / 4 | pivot field orientation |
| xlSum / xlCount / xlAverage / xlMax / xlMin | -4157 / -4112 / -4106 / -4136 / -4139 | pivot/consolidation function |
| xlColumnClustered / xlLine / xlPie / xlBarClustered / xlXYScatter / xlArea | 51 / 4 / 5 / 57 / -4169 / 1 | chart type |
| xlCellValue / xlExpression | 1 / 2 | conditional-format type |
| xlGreater / xlLess / xlEqual / xlBetween | 5 / 6 / 3 / 1 | conditional-format / criteria operator |
| xlValidateWholeNumber / xlValidateDecimal / xlValidateList / xlValidateDate | 1 / 2 / 3 / 4 | data-validation type |
| xlValidAlertStop | 1 | validation alert style |
| xlAscending / xlDescending | 1 / 2 | sort order |
| xlCenter / xlLeft / xlRight | -4108 / -4131 / -4152 | horizontal alignment |
| xlTop / xlBottom | -4160 / -4107 | vertical alignment |
| xlContinuous | 1 | border line style |
| xlThin / xlMedium / xlThick | 2 / -4138 / 4 | border weight |
| xlEdgeBottom / xlEdgeTop / xlEdgeLeft / xlEdgeRight | 9 / 8 / 7 / 10 | border edge |
| xlUp / xlDown / xlToLeft / xlToRight | -4162 / -4121 / -4159 / -4161 | `Range.End` direction |
| xlPart / xlWhole | 2 / 1 | find/replace match |
| xlOpenXMLWorkbook (xlsx) / xlsm / xlCSV | 51 / 52 / 6 | save FileFormat |
| xlTypePDF | 0 | `ExportAsFixedFormat` |

## Verify: zero formula errors

A model with `#REF!`/`#DIV/0!`/`#VALUE!`/`#NAME?`/`#N/A` in it isn't done. Before
reporting success, scan for error cells with `SpecialCells` (the idiomatic Excel
way) - it raises when none are found, so the empty case is the happy path:

```python
def formula_errors(ws):
    try:
        rng = ws.UsedRange.SpecialCells(-4123, 16)  # xlCellTypeFormulas, xlErrors
    except Exception:
        return []  # "No cells found" -> clean
    out = []
    for area in rng.Areas:
        for cell in area:
            out.append((cell.Address, cell.Text))  # e.g. ("$C$5", "#DIV/0!")
    return out

errs = formula_errors(ws)
print("errors:", errs)   # [] means clean
```

If `errs` is non-empty, fix the offending formulas (check denominators for
`#DIV/0!`, references for `#REF!`) and re-scan. Also read a couple of key cells
back (`ws.Cells(r, c).Value`) and confirm no placeholder text ("TODO", "TBD")
slipped through before you tell the user it's done.

## Cleanup & errors

- Wrap COM calls in `try/except` and print `repr(e)` - COM raises HRESULT errors
  (e.g. a property that doesn't apply to the current selection); surface the
  message so you can adjust rather than fail silently.
- Set `xl.DisplayAlerts = False` around deletes / overwrites to avoid blocking
  dialogs, then set it back to `True`.
- Don't call `xl.Quit()` if the user had Excel open - you'd close their session.
  Only quit an instance YOU launched for headless file work.
- After a user-facing task, leave `xl.Visible = True` and the workbook open so
  they see the result. Read a couple of cells back to confirm before reporting
  done.

## Sources

- [Create a pivot table with win32com - Trenton McKinney](https://trenton3983.github.io/posts/create-pivot-table-with-win32com/)
- [Automating pivot tables with Python - Python Excels](https://pythonexcels.com/python/2009/11/23/automating-pivot-tables-with-python)
- [Mapping Excel VB macros to Python - Python Excels](https://pythonexcels.com/python/2009/10/20/mapping-excel-vb-macros-to-python-revisited)
- [Conditional formatting in Excel with Python (gist)](https://gist.github.com/pythonexcels/3748306)
- [Using COM constants - Python Programming on Win32 (O'Reilly)](https://www.oreilly.com/library/view/python-programming-on/1565926218/ch12s03s05.html)
- [pywin32 gencache notes - Tim Golden](https://timgolden.me.uk/pywin32-docs/html/com/win32com/HTML/QuickStartClientCom.html)
