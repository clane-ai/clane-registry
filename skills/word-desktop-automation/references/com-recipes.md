# Word COM recipes and constant cheat-sheet

Verified recipes for driving live Word through `win32com` via `python_exec`, plus
python-docx equivalents for headless file output. Load this when a task needs
anything beyond the basics in SKILL.md.

All COM snippets assume the setup:

```python
import win32com.client as win32

def rgb(r, g, b):                 # Office colors are BGR-packed; think in RGB, convert.
    return r | (g << 8) | (b << 16)

def add_para(doc, text, style):
    rng = doc.Content
    rng.Collapse(0)               # wdCollapseEnd = 0
    start = rng.End
    rng.InsertAfter(text + "\r")
    para = doc.Range(start, doc.Content.End)
    para.Style = doc.Styles(style)
    return para

word = win32.Dispatch("Word.Application")
word.Visible = True
doc = word.ActiveDocument if word.Documents.Count else word.Documents.Add()
```

---

## Numeric constant cheat-sheet

Late-bound `Dispatch` does NOT populate named constants. Pass these integers.

**Collapse direction (WdCollapseDirection):** `wdCollapseStart = 1`, `wdCollapseEnd = 0`.

**Paragraph alignment (WdParagraphAlignment):** `wdAlignParagraphLeft = 0`,
`wdAlignParagraphCenter = 1`, `wdAlignParagraphRight = 2`, `wdAlignParagraphJustify = 3`.

**Save formats (WdSaveFormat)** - argument 2 of `SaveAs2`:
`wdFormatDocument (.doc) = 0`, `wdFormatXMLDocument (.docx) = 12`,
`wdFormatPDF = 17`, `wdFormatXPS = 18`, `wdFormatRTF = 6`, `wdFormatText = 2`,
`wdFormatHTML = 8`, `wdFormatTemplate (.dotx) = 14`.

**Header/footer index (WdHeaderFooterIndex):** `wdHeaderFooterPrimary = 1`,
`wdHeaderFooterFirstPage = 2`, `wdHeaderFooterEvenPages = 3`.

**Field types (WdFieldType)** - `Range.Fields.Add(range, type)`:
`wdFieldPage = 33`, `wdFieldNumPages = 26`, `wdFieldDate = 31`, `wdFieldTOC = 8`,
`wdFieldFileName = 29`, `wdFieldHyperlink = 88`.

**Built-in style names** (English install): `"Title"`, `"Subtitle"`, `"Heading 1"`,
`"Heading 2"`, `"Heading 3"`, `"Normal"`, `"Quote"`, `"Intense Quote"`,
`"List Bullet"`, `"List Number"`, `"Caption"`, `"TOC Heading"`.

**Replace scope (WdReplace):** `wdReplaceNone = 0`, `wdReplaceOne = 1`,
`wdReplaceAll = 2`. **Find wrap (WdFindWrap):** `wdFindContinue = 1`.

**Break types (WdBreakType):** `wdPageBreak = 7`, `wdColumnBreak = 8`,
`wdSectionBreakNextPage = 2`, `wdLineBreak = 6`.

**Table behavior (WdAutoFitBehavior):** `wdAutoFitFixed = 0`, `wdAutoFitContent = 1`,
`wdAutoFitWindow = 2`.

**Bullet/number list shortcuts:** `ListFormat.ApplyBulletDefault()`,
`ListFormat.ApplyNumberDefault()`, `ListFormat.RemoveNumbers()`.

---

## Override built-in heading styles (do this once)

Restyle the built-in styles instead of formatting each heading by hand - then every
`"Heading 1"` paragraph picks it up.

```python
h1 = doc.Styles("Heading 1").Font
h1.Name = "Calibri"; h1.Size = 16; h1.Bold = True; h1.Color = rgb(0x1E, 0x27, 0x61)
doc.Styles("Heading 1").ParagraphFormat.SpaceBefore = 12
doc.Styles("Heading 1").ParagraphFormat.SpaceAfter = 6

body = doc.Styles("Normal").Font
body.Name = "Calibri"; body.Size = 11; body.Color = rgb(0x36, 0x45, 0x4F)
```

## Multi-level / numbered lists

```python
para = add_para(doc, "First numbered item", "List Number")
add_para(doc, "Second numbered item", "List Number")
# or apply numbering directly to a range without a style:
rng = doc.Paragraphs(doc.Paragraphs.Count).Range
rng.ListFormat.ApplyNumberDefault()
# indent a sub-item one level
rng.ListFormat.ListIndent()
```

## Table of contents

```python
# place a TOC at the top: collapse to start, insert, then build from heading styles
rng = doc.Range(0, 0)
doc.TablesOfContents.Add(rng, True, 1, 3)   # (range, UseHeadingStyles, upperLevel, lowerLevel)
# after adding content, refresh page numbers:
doc.TablesOfContents(1).Update()
```

## Find and replace

```python
find = doc.Content.Find
find.ClearFormatting()
find.Replacement.ClearFormatting()
# Execute(FindText, MatchCase, MatchWholeWord, MatchWildcards, MatchSoundsLike,
#         MatchAllWordForms, Forward, Wrap, Format, ReplaceWith, Replace)
find.Execute("30 days", False, False, False, False, False, True, 1, False, "60 days", 2)  # 2 = wdReplaceAll
```

## Tracked changes and comments

```python
doc.TrackRevisions = True                   # turn on redlining; edits now record as changes
# add a comment on a range (e.g. paragraph 3)
rng = doc.Paragraphs(3).Range
doc.Comments.Add(rng, "Please verify this figure against the source.")
# accept / reject everything
doc.AcceptAllRevisions()
# doc.RejectAllRevisions()
```
For heavy redlining workflows the platform `docx` skill (XML-level tracked changes
with a validator) is more robust - prefer it for review-heavy documents.

## Sections, columns, page breaks

```python
end = doc.Content; end.Collapse(0)
end.InsertBreak(7)                          # wdPageBreak = 7
# two-column layout for the current section
doc.Sections(1).PageSetup.TextColumns.SetCount(2)
doc.Sections(1).PageSetup.TextColumns.EvenlySpaced = True
```

## Footnotes and hyperlinks

```python
rng = doc.Paragraphs(2).Range
rng.Collapse(0)
doc.Footnotes.Add(rng, "", "Source: Annual Report 2024")
# hyperlink
doc.Hyperlinks.Add(rng, "https://clane.ai", "", "", "Clane")
```

## Page setup, orientation, paper size

```python
ps = doc.PageSetup
ps.TopMargin = ps.BottomMargin = ps.LeftMargin = ps.RightMargin = 72   # 1 inch
ps.Orientation = 1                          # wdOrientLandscape = 1 (0 = portrait)
ps.PaperSize = 1                            # wdPaperLetter = 1 (8 = A4)
```

## Read a document's text back (extraction / verification)

```python
doc = word.Documents.Open(r"C:\reports\q4.docx", ReadOnly=True)
full = doc.Content.Text                     # whole document as a string
print(full[:2000])
# heading outline only:
for p in doc.Paragraphs:
    name = p.Range.Style.NameLocal
    if name.startswith("Heading") or name == "Title":
        print(name, "->", p.Range.Text.strip("\r\a "))
```
For pure extraction with no live app, `docx_to_markdown` (a platform converter) or
python-docx is lighter:
```python
from docx import Document
d = Document(r"C:\reports\q4.docx")
for p in d.paragraphs:
    print(p.style.name, "|", p.text)
```

---

## python-docx equivalents (headless file output)

```python
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION

doc = Document()

# page margins
for s in doc.sections:
    s.top_margin = s.bottom_margin = s.left_margin = s.right_margin = Inches(1)

# restyle the body + headings once
normal = doc.styles["Normal"]
normal.font.name = "Calibri"; normal.font.size = Pt(11)
h1 = doc.styles["Heading 1"]
h1.font.size = Pt(16); h1.font.color.rgb = RGBColor(0x1E, 0x27, 0x61)

doc.add_heading("Clane Quarterly Report", level=0)   # 0 = Title
doc.add_heading("Executive Summary", level=1)
p = doc.add_paragraph("Revenue grew across all regions this quarter.")
p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
doc.add_paragraph("North region up 17%", style="List Bullet")

# table with a shaded header (python-docx needs XML for cell shading)
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
table = doc.add_table(rows=1, cols=3); table.style = "Table Grid"
hdr = table.rows[0].cells
for cell, text in zip(hdr, ["Region", "Q3", "Q4"]):
    cell.text = text
    cell.paragraphs[0].runs[0].font.bold = True
    shd = OxmlElement("w:shd"); shd.set(qn("w:fill"), "1E2761")
    cell._tc.get_or_add_tcPr().append(shd)

# page number in the footer
from docx.oxml.ns import qn as _qn
footer = doc.sections[0].footer
run = footer.paragraphs[0].add_run()
fld = OxmlElement("w:fldSimple"); fld.set(_qn("w:instr"), "PAGE"); run._r.append(fld)

doc.save(r"C:\Users\me\Documents\Clane\report.docx")
```

`RGBColor` takes plain RGB (not BGR). python-docx cannot render to PDF/image -
use COM `doc.SaveAs2(path, 17)` or the platform `docx` skill's LibreOffice render
step for visual QA.
