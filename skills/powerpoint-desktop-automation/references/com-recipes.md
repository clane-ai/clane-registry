# PowerPoint COM recipes and constant cheat-sheet

Verified recipes for driving live PowerPoint through `win32com` via `python_exec`,
plus the python-pptx equivalents for headless file output. Load this when a task
needs anything beyond the basics in SKILL.md.

All COM snippets assume the setup:

```python
import win32com.client as win32

def rgb(r, g, b):                 # Office colors are BGR-packed; think in RGB, convert.
    return r | (g << 8) | (b << 16)

ppt = win32.Dispatch("PowerPoint.Application")
ppt.Visible = True
pres = ppt.ActivePresentation if ppt.Presentations.Count else ppt.Presentations.Add()
W = pres.PageSetup.SlideWidth     # 960 pt (16:9) or 720 pt (4:3)
H = pres.PageSetup.SlideHeight    # 540 pt
```

---

## Numeric constant cheat-sheet

Late-bound `Dispatch` does NOT populate named constants. Pass these integers.

**Slide layouts (PpSlideLayout)** - argument 2 of `Slides.Add(index, layout)`:

| Constant | Value | Constant | Value |
|---|---|---|---|
| ppLayoutTitle | 1 | ppLayoutBlank | 12 |
| ppLayoutText | 2 | ppLayoutObject | 16 |
| ppLayoutTwoColumnText | 4 | ppLayoutTitleOnly | 11 |
| ppLayoutTextAndChart | 7 | ppLayoutComparison | 0x22 (34) |

Prefer **12 (blank)** and place shapes yourself for design control.

**Text box orientation** - argument 1 of `AddTextbox`: `msoTextOrientationHorizontal = 1`.

**AutoShape types (MsoAutoShapeType)** - `AddShape(type, L, T, W, Hgt)`:

| Shape | Value | Shape | Value |
|---|---|---|---|
| Rectangle | 1 | RoundedRectangle | 5 |
| Oval | 9 | RightArrow | 33 |
| Pentagon (chevron) | 51 | Chevron | 52 |
| LeftRightArrow | 37 | Line callout | 41 |

**Chart types (XlChartType)** - argument 2 of `AddChart2(Style, Type, ...)`:

| Type | Value | Type | Value |
|---|---|---|---|
| xlColumnClustered | 51 | xlColumnStacked | 52 |
| xlBarClustered | 57 | xlLine | 4 |
| xlLineMarkers | 65 | xlPie | 5 |
| xlXYScatter | -4169 | xlArea | 1 |
| xlDoughnut | -4120 | xlRadar | -4151 |

`AddChart2(Style, Type, ...)`: `Style = -1` uses the default style for the type.

**Alignment (PpParagraphAlignment)** - `TextRange.ParagraphFormat.Alignment`:
`ppAlignLeft = 1`, `ppAlignCenter = 2`, `ppAlignRight = 3`, `ppAlignJustify = 4`.

**Anchor (MsoVerticalAnchor)** - `TextFrame.VerticalAnchor`:
`msoAnchorTop = 1`, `msoAnchorMiddle = 3`, `msoAnchorBottom = 4`.

**Save formats (PpSaveAsFileType)** - argument 2 of `SaveAs`:
`ppSaveAsDefault = 11`, `ppSaveAsPPTX = 24`, `ppSaveAsPDF = 32`, `ppSaveAsPNG = 18`,
`ppSaveAsJPG = 17`, `ppSaveAsTemplate (.potx) = 27`.

**Export filter** - `slide.Export(path, "PNG", width_px, height_px)`.

**MsoTriState** (booleans in older signatures): `msoTrue = -1`, `msoFalse = 0`.

---

## Slides: add, duplicate, reorder, delete

```python
slide = pres.Slides.Add(pres.Slides.Count + 1, 12)   # append a blank slide
slide.MoveTo(2)                                       # reorder to position 2
dup = pres.Slides(2).Duplicate().Item(1)              # duplicate slide 2
pres.Slides(5).Delete()                               # delete slide 5
slide.Select()                                        # bring into view for the user
```

## Bulleted / numbered list formatting

```python
tf = slide.Shapes.AddTextbox(1, 60, 130, W - 120, 300).TextFrame
tf.WordWrap = True
tr = tf.TextRange
tr.Text = "Reduced churn\rGrew ARR 22%\rLaunched two regions"
tr.Font.Size = 18
# bullet on every paragraph; ppBulletUnnumbered = 2, ppBulletNumbered = 3, ppBulletNone = 0
tr.ParagraphFormat.Bullet.Type = 2
tr.ParagraphFormat.Bullet.Character = 8226            # round bullet (Unicode dot)
tr.ParagraphFormat.SpaceAfter = 8                     # points of space after each paragraph
tr.ParagraphFormat.Alignment = 1                      # left
# indent a sub-point: address a single paragraph and set its IndentLevel
tr.Paragraphs(2).IndentLevel = 2
```

## Paragraph spacing and line height

```python
pf = tr.ParagraphFormat
pf.SpaceBefore = 6
pf.SpaceAfter = 6
pf.LineRuleWithin = 0          # 0 = SpaceWithin is in points, -1 = in lines
pf.SpaceWithin = 1.1           # line spacing
```

## Tables: full styling

```python
shape = slide.Shapes.AddTable(4, 3, 60, 120, W - 120, 220)
table = shape.Table
table.FirstRow = True          # style band the header row (if the table style supports it)
# column widths (points)
table.Columns(1).Width = (W - 120) * 0.5
table.Columns(2).Width = (W - 120) * 0.25
table.Columns(3).Width = (W - 120) * 0.25
for c in range(1, 4):                              # header row
    cell = table.Cell(1, c)
    cell.Shape.Fill.ForeColor.RGB = rgb(0x1E, 0x27, 0x61)
    tr = cell.Shape.TextFrame.TextRange
    tr.Font.Bold = True
    tr.Font.Color.RGB = rgb(0xFF, 0xFF, 0xFF)
# zebra striping on body rows
for r in range(2, 5):
    if r % 2 == 0:
        for c in range(1, 4):
            table.Cell(r, c).Shape.Fill.ForeColor.RGB = rgb(0xF2, 0xF2, 0xF2)
# cell text alignment + margins
cell = table.Cell(2, 2)
cell.Shape.TextFrame.TextRange.ParagraphFormat.Alignment = 3   # right-align numbers
cell.Shape.TextFrame.MarginLeft = 6
```

## Charts: data, titles, colors

```python
ch = slide.Shapes.AddChart2(-1, 51, 60, 120, W - 120, 300).Chart   # 51 = clustered columns
wb = ch.ChartData.Workbook
ws = wb.Worksheets(1)
headers = ["Region", "Q3", "Q4"]
data = [["North", 120, 140], ["South", 95, 110], ["East", 70, 85]]
for c, h in enumerate(headers, start=1):
    ws.Cells(1, c).Value = h
for r, row in enumerate(data, start=2):
    for c, val in enumerate(row, start=1):
        ws.Cells(r, c).Value = val
wb.Close()                                          # commit data, close backing workbook
ch.HasTitle = True
ch.ChartTitle.Text = "Revenue by region"
ch.HasLegend = True
# recolor the first series; SeriesCollection is 1-based
ch.SeriesCollection(1).Format.Fill.ForeColor.RGB = rgb(0x02, 0x80, 0x90)
```

## Pictures and cropping

```python
# AddPicture(FileName, LinkToFile=0, SaveWithDocument=-1, Left, Top, Width, Height)
pic = slide.Shapes.AddPicture(r"C:\img\photo.jpg", 0, -1, 60, 120, 360, 240)
pic.PictureFormat.CropLeft = 20      # crop in points
pic.LockAspectRatio = -1             # msoTrue, keep proportions when resizing
pic.Line.Weight = 3                  # framed photo (the rounded-frame motif)
pic.Line.ForeColor.RGB = rgb(0xFF, 0xFF, 0xFF)
```

## Gradient and transparency fills

```python
sh = slide.Shapes.AddShape(1, 0, 0, W, H)          # full-bleed rectangle
sh.Fill.OneColorGradient(1, 1, 0.3)                # style=1 horizontal, variant=1, degree
sh.Fill.ForeColor.RGB = rgb(0x06, 0x5A, 0x82)
sh.Fill.Transparency = 0.15                        # 0 opaque .. 1 clear
sh.Line.Visible = False
sh.ZOrder(1)                                       # msoSendToBack = 1, so content sits on top
```

## Connectors / flow arrows

```python
# AddConnector(type, x1, y1, x2, y2); msoConnectorStraight=1, Elbow=2
conn = slide.Shapes.AddConnector(2, 200, 200, 400, 200)
conn.Line.ForeColor.RGB = rgb(0x02, 0xC3, 0x9A)
conn.Line.EndArrowheadStyle = 3                    # msoArrowheadTriangle = 3
```

## Speaker notes

```python
notes_tf = slide.NotesPage.Shapes.Placeholders(2).TextFrame   # placeholder 2 = the notes body
notes_tf.TextRange.Text = "Open with the headline number, then walk the chart left to right."
```

## Apply a template (.potx) or theme

```python
pres.ApplyTemplate(r"C:\templates\brand.potx")     # applies theme colors/fonts/master to the deck
```

## Export slides to images (for visual QA)

```python
import os
out = r"C:\Users\me\AppData\Local\Temp\clane_slides"
os.makedirs(out, exist_ok=True)
for i in range(1, pres.Slides.Count + 1):
    pres.Slides(i).Export(os.path.join(out, f"slide-{i:02d}.png"), "PNG", 1280, 720)
print("exported to", out)
```
Then read those PNGs back (or hand them to a subagent) and inspect for overlap,
overflow, contrast, and alignment problems before declaring done.

## Read a deck's content (extraction)

```python
pres = ppt.Presentations.Open(r"C:\decks\pitch.pptx", WithWindow=False)
for i in range(1, pres.Slides.Count + 1):
    texts = []
    for sh in pres.Slides(i).Shapes:
        if sh.HasTextFrame and sh.TextFrame.HasText:
            texts.append(sh.TextFrame.TextRange.Text)
    print(f"--- slide {i} ---")
    print("\n".join(texts))
```
For pure extraction with no live app, `pptx_to_text` (a platform converter) or
python-pptx is lighter:
```python
from pptx import Presentation
prs = Presentation(r"C:\decks\pitch.pptx")
for i, slide in enumerate(prs.slides, 1):
    for shape in slide.shapes:
        if shape.has_text_frame:
            print(i, shape.text_frame.text)
```

---

## python-pptx equivalents (headless file output)

```python
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE

prs = Presentation()
prs.slide_width = Inches(13.333)          # 16:9
prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]
slide = prs.slides.add_slide(blank)

# background fill
slide.background.fill.solid()
slide.background.fill.fore_color.rgb = RGBColor(0x1E, 0x27, 0x61)

# title textbox
box = slide.shapes.add_textbox(Inches(0.8), Inches(2.6), Inches(11.7), Inches(1.6))
p = box.text_frame.paragraphs[0]
p.text = "Q4 Revenue Review"
p.alignment = PP_ALIGN.LEFT
r = p.runs[0]
r.font.size = Pt(40); r.font.bold = True; r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

# table
rows, cols = 3, 3
tbl = slide.shapes.add_table(rows, cols, Inches(0.8), Inches(1), Inches(8), Inches(2)).table
tbl.cell(0, 0).text = "Region"

# chart
cd = CategoryChartData()
cd.categories = ["North", "South", "East"]
cd.add_series("Q4", (140, 110, 85))
slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED,
                       Inches(0.8), Inches(3.2), Inches(8), Inches(3.5), cd)

prs.save(r"C:\Users\me\Documents\Clane\deck.pptx")
```

`RGBColor` takes plain RGB (not BGR). python-pptx cannot render to image itself -
use COM `slide.Export` or the platform `pptx` skill's render harness for visual QA.
