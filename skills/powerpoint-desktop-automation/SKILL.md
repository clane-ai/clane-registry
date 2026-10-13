---
name: powerpoint-desktop-automation
version: 0.1.0
description: |
  Build and edit Microsoft PowerPoint decks on Clane Desktop reliably and
  FAST through its COM object model (Python + win32com) - or produce .pptx files
  directly with python-pptx - instead of dragging boxes around the canvas with
  computer_use. Use this skill WHENEVER a desktop task touches PowerPoint:
  creating a slide deck or pitch deck, adding or editing slides, inserting text /
  tables / charts / images / shapes, styling and theming, reading content out of
  a .pptx, or turning data into a presentation - even when the user only says
  "make a deck", "build slides", "put this into PowerPoint", "create a pitch
  deck", "add a slide on X", "make it look professional", or just names a .pptx
  file. Reach for this skill BEFORE touching the PowerPoint UI; placing and
  formatting shapes one click at a time via computer_use is slow and fragile.
when_to_use: |
  Activate for anything PowerPoint on the desktop: "create a 10-slide deck on
  our Q4 results", "turn this outline into slides", "add a title slide and a
  chart slide", "make this deck look modern", "build a comparison slide", "read
  the text out of deck.pptx and summarise", "open pitch.pptx and fix slide 3",
  "the presentation that's open - add a closing slide". If the user wants a deck
  produced/edited or is looking at PowerPoint, this is the skill. Do NOT use
  computer_use to place and type shapes one at a time - that is what this skill
  replaces.
requires_tools:
  - python_exec
---

# PowerPoint desktop automation

## Why this skill exists

PowerPoint exposes a complete automation API (its COM object model). One call can
add a slide, drop in a formatted textbox, build a native table, insert a chart, or
recolor a shape - work that takes dozens of slow, imprecise `computer_use` drags
and clicks otherwise. The bundled desktop Python already has `win32com` and
`python-pptx`, so you drive PowerPoint programmatically through the `python_exec`
tool. **Default to that. Only fall back to `computer_use` for the rare thing the
API genuinely can't reach.**

This skill gives you the tools and the decision rules. It does not script one
fixed deck for you - you decide the structure, the words, and the look based on
what the user asked for. The recipes below are building blocks; compose them.

## Pick the right approach

| Situation | Use | Why |
|---|---|---|
| Drive the PowerPoint the user has **open**, or build a deck they watch appear | **COM** (`win32com`, attach to the running app) | Operates the live app; slides build in their window |
| Create / read / edit a **.pptx file** with no need for the live app | **python-pptx** | Faster, headless, no PowerPoint needed |
| A deck that must hit a **high visual bar** with rendered QA (render to images, inspect, fix) | the platform **`pptx`** skill (pptxgenjs + a render-and-inspect loop) | Purpose-built for polished file output with a visual QA harness |
| Something COM can't do, a modal dialog, or PowerPoint isn't installed | **computer_use** (`ui_snapshot` + `ui_invoke`) - last resort | UIA only when the API can't |

Never build slides by dragging and typing shapes one at a time via `computer_use`.
Add and format shapes programmatically (see below) - it is faster and precise.

## How to run it

Run all of this through the **`python_exec`** tool (the bundled CPython has
`win32com.client` and `pptx`). Each snippet is self-contained - adapt it and pass
it to `python_exec`.

## Canonical COM recipe (the pattern to copy)

`win32com.client.Dispatch("PowerPoint.Application")` **attaches to a running
PowerPoint if one is open, otherwise launches it.** PowerPoint measures
everything in **points** (1 inch = 72 pt). A standard 16:9 deck is 960 x 540 pt.
Build on the **blank layout (12)** and place shapes yourself for full control.

```python
import win32com.client as win32

# BGR helper: Office colors are packed blue-green-red, so think in RGB and convert.
def rgb(r, g, b):
    return r | (g << 8) | (b << 16)

ppt = win32.Dispatch("PowerPoint.Application")
ppt.Visible = True                          # let the user watch (COM needs it visible)
pres = ppt.Presentations.Add()              # new deck; or ppt.ActivePresentation for the open one
W = pres.PageSetup.SlideWidth               # 960 pt on a 16:9 deck
H = pres.PageSetup.SlideHeight              # 540 pt

# ppLayoutBlank = 12 -> no default placeholders, you own the canvas
slide = pres.Slides.Add(1, 12)

# dark title background (the "sandwich" look: dark title + conclusion, light content)
slide.FollowMasterBackground = False
slide.Background.Fill.Solid()
slide.Background.Fill.ForeColor.RGB = rgb(0x1E, 0x27, 0x61)   # navy

# title textbox: AddTextbox(orientation=1, Left, Top, Width, Height) in points
tb = slide.Shapes.AddTextbox(1, 60, 200, W - 120, 120)
tr = tb.TextFrame.TextRange
tr.Text = "Q4 Revenue Review"
tr.Font.Size = 40
tr.Font.Bold = True
tr.Font.Name = "Calibri"
tr.Font.Color.RGB = rgb(0xFF, 0xFF, 0xFF)

print("done:", pres.Slides.Count, "slide(s)")
```

This exact pattern is verified working on the desktop: it connects, adds a blank
slide, sets a background color, and drops a formatted title - in well under a
second.

## Key operations (COM)

**Attach to what's already open** (the user's current deck):
```python
pres = ppt.ActivePresentation
slide = pres.Slides(1)                       # 1-based; or pres.Slides(pres.Slides.Count) for the last
```

**Add a slide and a body textbox:**
```python
slide = pres.Slides.Add(2, 12)               # (index, ppLayoutBlank=12)
body = slide.Shapes.AddTextbox(1, 60, 130, W - 120, H - 190)
tf = body.TextFrame
tf.WordWrap = True
tf.MarginLeft = 0                            # kill default padding when aligning to an edge
p = tf.TextRange
p.Text = "First point\rSecond point\rThird point"   # \r starts a new paragraph
p.Font.Size = 18
```

**A native table** (header row filled, white bold text):
```python
shape = slide.Shapes.AddTable(3, 3, 60, 120, W - 120, 200)   # rows, cols, L, T, W, Hgt
table = shape.Table
rows = [["Region", "Q3", "Q4"], ["North", "120", "140"], ["South", "95", "110"]]
for r, row in enumerate(rows, start=1):
    for c, val in enumerate(row, start=1):
        cell = table.Cell(r, c)
        cr = cell.Shape.TextFrame.TextRange
        cr.Text = str(val)
        if r == 1:                            # header
            cr.Font.Bold = True
            cr.Font.Color.RGB = rgb(0xFF, 0xFF, 0xFF)
            cell.Shape.Fill.ForeColor.RGB = rgb(0x1E, 0x27, 0x61)
```

**A native chart** (data-driven; clustered columns):
```python
# AddChart2(Style, Type, L, T, W, Hgt); xlColumnClustered = 51, Style=-1 = default
ch = slide.Shapes.AddChart2(-1, 51, 60, 120, W - 120, 300).Chart
wb = ch.ChartData.Workbook
ws = wb.Worksheets(1)
ws.Cells(1, 1).Value = "Region"; ws.Cells(1, 2).Value = "Q4"
ws.Cells(2, 1).Value = "North";  ws.Cells(2, 2).Value = 140
ws.Cells(3, 1).Value = "South";  ws.Cells(3, 2).Value = 110
ch.ChartData.Workbook.Close()                 # commit the data back into the chart
```

**A shape / accent / picture:**
```python
acc = slide.Shapes.AddShape(5, 60, 330, 180, 8)        # msoShapeRoundedRectangle = 5
acc.Fill.ForeColor.RGB = rgb(0x02, 0xC3, 0x9A)         # mint accent bar
acc.Line.Visible = False
pic = slide.Shapes.AddPicture(r"C:\path\logo.png", 0, -1, W - 200, 40, 140, 60)  # file, linktofile=0, savewithdoc=-1
```

**Save / export:**
```python
pres.SaveAs(r"C:\Users\me\Documents\Clane\deck.pptx")    # 24 = pptx (default for .pptx ext)
pres.SaveAs(r"C:\Users\me\Documents\Clane\deck.pdf", 32) # ppSaveAsPDF = 32
```

PowerPoint's full feature set is reachable this way. For **bulleted/numbered list
formatting, slide layouts and placeholders, paragraph alignment and spacing,
speaker notes, SmartArt-style layouts via shape groups, picture cropping, line
connectors, gradient/transparency fills, chart styling, duplicating/reordering
slides, applying a template (.potx), and exporting slides to images** read
`references/com-recipes.md` - it has verified recipes and a numeric constant
cheat-sheet. Load it when the task needs any of those.

## python-pptx path (file only, no live PowerPoint)

When you just need to produce a .pptx and don't need the app on screen:
```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

prs = Presentation()                                  # 4:3 by default; set prs.slide_width/height for 16:9
slide = prs.slides.add_slide(prs.slide_layouts[6])    # layout 6 = blank
box = slide.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(8), Inches(1.2))
tf = box.text_frame
tf.text = "Q4 Revenue Review"
run = tf.paragraphs[0].runs[0]
run.font.size = Pt(40); run.font.bold = True
run.font.color.rgb = RGBColor(0x1E, 0x27, 0x61)       # RGBColor takes plain RGB, not BGR
prs.save(r"C:\Users\me\Documents\Clane\deck.pptx")
```
`references/com-recipes.md` covers the python-pptx equivalents (tables, charts,
pictures) too.

## Make it modern and stylish (what "good" looks like)

A deck that is merely correct is forgettable. These are the conventions the
platform's `pptx` skill enforces - apply them so the result looks designed, not
defaulted. **These are guidelines for your judgment, not a rigid template. Pick
choices that fit the topic.**

**Don't make boring slides.** Plain bullets on a white background impress no one.
Every slide should earn its place visually.

- **Pick a bold, content-informed palette.** If the same colors would work on a
  completely different topic, they are too generic. Don't default to corporate
  blue. One color should dominate (60-70% of visual weight), with 1-2 supporting
  tones and one sharp accent - never give all colors equal weight.
- **Dark/light "sandwich".** Dark background for the title and closing slides,
  light for content - or commit to dark throughout for a premium feel.
- **Commit to one visual motif** and repeat it on every slide: a thick single-side
  accent bar, icons in colored circles, rounded image frames. Consistency reads
  as design.
- **Every slide needs a visual element** - a chart, table, image, icon, or shape.
  Text-only slides are forgettable.
- **Typography with hierarchy.** Pick a header font with personality and a clean
  body font (e.g. Georgia + Calibri, Arial Black + Arial). Titles 36-44pt bold,
  section headers 20-24pt bold, body 14-18pt, captions 10-12pt muted. Two font
  families maximum.
- **Whitespace is a design element.** Keep >= 0.5 inch (36pt) margins from slide
  edges, consistent 0.3-0.5 inch gaps between blocks. Leave breathing room; don't
  fill every inch. Left-align body text and lists; center only titles.
- **Strip data visuals down.** Clean lines, one accent color, no heavy gridlines
  or clutter. Make the number the hero (big 60-72pt stat callouts with small
  labels beat a dense table).

### Color palettes to draw from

| Theme | Primary | Secondary | Accent |
|---|---|---|---|
| Midnight Executive | `1E2761` navy | `CADCFC` ice blue | `FFFFFF` white |
| Forest & Moss | `2C5F2D` forest | `97BC62` moss | `F5F5F5` cream |
| Coral Energy | `F96167` coral | `F9E795` gold | `2F3C7E` navy |
| Ocean Gradient | `065A82` deep blue | `1C7293` teal | `21295C` midnight |
| Charcoal Minimal | `36454F` charcoal | `F2F2F2` off-white | `212121` black |
| Teal Trust | `028090` teal | `00A896` seafoam | `02C39A` mint |
| Berry & Cream | `6D2E46` berry | `A26769` dusty rose | `ECE2D0` cream |

Convert each hex to BGR with the `rgb()` helper before assigning (`rgb(0x1E,0x27,0x61)`).

### Avoid (these read as AI-generated or amateur)

- **NEVER put a thin accent line under a title** - it is the hallmark of
  AI-generated slides. Use whitespace or a background color block instead.
- Don't repeat the exact same layout on every slide - vary columns, cards, grids,
  and stat callouts.
- Don't center body text; don't skimp on title/body size contrast.
- Don't use low-contrast text (light text on light bg, dark on dark).
- Don't leave default-theme placeholder look - if you used a layout with
  placeholders, restyle or remove leftover prompt text.

### Verify before you report done

PowerPoint is visual, so checking the object model is not enough - **render and
look**. Save to PDF (`pres.SaveAs(path, 32)`) or export slides to PNG (recipe in
`references/com-recipes.md`), then inspect the images with fresh eyes (a subagent
is ideal - you will see what you expect, not what is there). Hunt for: overlapping
shapes, text overflow or cut-off, elements too close (< 0.3"), insufficient edge
margin, misaligned columns, low-contrast text, leftover placeholder text. Fix,
re-render the affected slides, and look again. Do not declare success before at
least one fix-and-verify cycle.

For a **headless, file-only** deck that must hit a high visual bar, the platform
`pptx` skill is purpose-built (it ships a render-to-image + inspect harness).
Prefer it there. Use COM + these conventions when driving the **live** PowerPoint
the user is watching.

## Gotchas (read these - they cause most failures)

- **Points, not pixels or inches.** All positions and sizes are points (1 in =
  72 pt). A 16:9 slide is 960 x 540 pt; 4:3 is 720 x 540.
- **1-based collections.** `pres.Slides(1)` is the first slide; `table.Cell(1,1)`
  is the top-left cell.
- **`\r` starts a new paragraph** inside a `TextRange.Text`, not `\n`.
- **Colors are BGR integers** - use the `rgb()` helper; `python-pptx`'s `RGBColor`
  takes plain RGB instead.
- **Named constants** (`ppLayoutBlank`, `xlColumnClustered`, `msoShape*`,
  `ppSaveAsPDF`) are NOT populated with late-bound `Dispatch` - pass the **numeric
  value** (cheat-sheet in `references/com-recipes.md`).
- **PowerPoint must be `Visible = True`** for most COM operations - unlike Excel it
  does not run cleanly hidden. For pure file output use python-pptx instead.
- **Charts open a backing workbook.** After writing chart data, call
  `ch.ChartData.Workbook.Close()` so the values commit and the temp Excel closes.
- **Wrap risky calls in try/except and surface the COM error string** so you can
  adjust rather than fail silently.
- **Don't close the user's other open decks.** `Quit()` only when no presentations
  remain; otherwise just `Close()` the one you made if appropriate, or leave it
  open for them to see.

## Last resort: computer_use

If COM genuinely can't do it (a one-off modal, or PowerPoint truly isn't
installed), use `computer_use`: `focus_window` PowerPoint, `ui_snapshot` for
control refs, then `ui_invoke`/`ui_set_value` by ref. Even then, prefer the
Outline view (paste a whole outline at once) over placing shapes by hand.
