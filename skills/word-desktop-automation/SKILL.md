---
name: word-desktop-automation
version: 0.1.0
description: |
  Create and edit Microsoft Word documents on Clane Desktop reliably and
  FAST through its COM object model (Python + win32com) - or produce .docx files
  directly with python-docx - instead of typing and formatting line by line with
  computer_use. Use this skill WHENEVER a desktop task touches Word: writing a
  report, memo, letter, contract, or any formatted document; adding headings,
  tables, lists, images, headers/footers, page numbers, or a table of contents;
  find-and-replace; or reading content out of a .docx - even when the user only
  says "write me a report", "draft a letter", "put this into a Word doc", "make a
  memo", "add a section on X", "format this document", or just names a .docx
  file. Reach for this skill BEFORE touching the Word UI; formatting a document by
  hand via computer_use is slow and inconsistent.
when_to_use: |
  Activate for anything Word on the desktop: "write a 2-page report on our Q4
  results", "draft a cover letter", "turn these notes into a formatted memo",
  "add a table of contents and page numbers", "insert a summary table", "make
  this look like a professional report", "read report.docx and summarise", "open
  contract.docx and change the term to 60 days", "the document that's open - add
  a signature block". If the user wants a Word document produced/edited or is
  looking at Word, this is the skill. Do NOT use computer_use to type and format
  a document control by control - that is what this skill replaces.
requires_tools:
  - python_exec
---

# Word desktop automation

## Why this skill exists

Word exposes a complete automation API (its COM object model). One call can apply
a heading style, insert a styled table, add a numbered list, drop in a header with
page numbers, or build a table of contents - work that takes dozens of slow,
inconsistent `computer_use` keystrokes and ribbon clicks otherwise. The bundled
desktop Python already has `win32com` and `python-docx`, so you drive Word
programmatically through the `python_exec` tool. **Default to that. Only fall back
to `computer_use` for the rare thing the API genuinely can't reach.**

This skill gives you the tools and the decision rules. It does not write the
document for you - you decide the content, structure, and styling based on what
the user asked. The recipes are building blocks; compose them.

## Pick the right approach

| Situation | Use | Why |
|---|---|---|
| Drive the Word the user has **open**, or build a doc they watch appear | **COM** (`win32com`, attach to the running app) | Operates the live app; the document builds in their window |
| Create / read / edit a **.docx file** with no need for the live app | **python-docx** | Faster, headless, no Word needed |
| A doc needing **tracked changes, comments, or render-to-PDF QA** | the platform **`docx`** skill (docx-js + unpack/edit XML + LibreOffice render) | Purpose-built for redlining and polished file output |
| Something COM can't do, a modal dialog, or Word isn't installed | **computer_use** (`ui_snapshot` + `ui_invoke`) - last resort | UIA only when the API can't |

Never type and format a document control by control via `computer_use`. Apply
styles and insert structures programmatically - it is faster and consistent.

## How to run it

Run all of this through the **`python_exec`** tool (the bundled CPython has
`win32com.client` and `docx`). Each snippet is self-contained - adapt it and pass
it to `python_exec`.

## Canonical COM recipe (the pattern to copy)

`win32com.client.Dispatch("Word.Application")` **attaches to a running Word if one
is open, otherwise launches it.** The cleanest way to build a document is to
append paragraphs at the end of the content range and apply a **built-in style**
to each (`"Title"`, `"Heading 1"`, `"Heading 2"`, `"Normal"`, `"List Bullet"`,
`"List Number"`) - never hand-format what a style can do.

```python
import win32com.client as win32

def rgb(r, g, b):                        # Office colors are BGR-packed; convert from RGB.
    return r | (g << 8) | (b << 16)

def add_para(doc, text, style):
    """Append a paragraph at the end of the document and apply a built-in style."""
    rng = doc.Content
    rng.Collapse(0)                      # wdCollapseEnd = 0 -> caret at the very end
    start = rng.End
    rng.InsertAfter(text + "\r")         # \r ends the paragraph
    para = doc.Range(start, doc.Content.End)
    para.Style = doc.Styles(style)       # built-in style by name
    return para

word = win32.Dispatch("Word.Application")
word.Visible = True                      # let the user watch it build
doc = word.Documents.Add()               # new doc; or word.ActiveDocument for the open one

# 1-inch margins (points: 1 inch = 72 pt)
doc.PageSetup.TopMargin = 72
doc.PageSetup.LeftMargin = 72
doc.PageSetup.RightMargin = 72

add_para(doc, "Clane Quarterly Report", "Title")
add_para(doc, "Executive Summary", "Heading 1")
add_para(doc, "Revenue grew across all regions this quarter.", "Normal")
add_para(doc, "North region up 17%", "List Bullet")
add_para(doc, "South region up 16%", "List Bullet")

print("done:", doc.Paragraphs.Count, "paragraphs")
```

This exact pattern is verified working on the desktop: it connects, sets margins,
and builds Title / Heading / body / bulleted paragraphs with real Word styles.

## Key operations (COM)

**Attach to what's already open** (the user's current document):
```python
doc = word.ActiveDocument
```

**A styled table** (header row filled white-on-navy):
```python
end = doc.Content
end.Collapse(0)
table = doc.Tables.Add(end, 3, 3)        # (range, rows, cols)
table.Style = "Table Grid"               # built-in bordered style
rows = [["Region", "Q3", "Q4"], ["North", "120", "140"], ["South", "95", "110"]]
for r, row in enumerate(rows, start=1):
    for c, val in enumerate(row, start=1):
        cell = table.Cell(r, c)
        cell.Range.Text = str(val)
        if r == 1:                        # header
            cell.Range.Font.Bold = True
            cell.Range.Font.Color = rgb(0xFF, 0xFF, 0xFF)
            cell.Shading.BackgroundPatternColor = rgb(0x1E, 0x27, 0x61)
table.Rows(1).HeadingFormat = True        # repeat header row across page breaks
```

**Direct character formatting** (when a style is not enough):
```python
rng = doc.Paragraphs(3).Range
rng.Font.Name = "Calibri"
rng.Font.Size = 11
rng.Font.Color = rgb(0x36, 0x45, 0x4F)    # charcoal body text
rng.ParagraphFormat.SpaceAfter = 8        # points after the paragraph
rng.ParagraphFormat.Alignment = 3         # wdAlignParagraphJustify = 3
```

**Header / footer with a page number:**
```python
section = doc.Sections(1)
footer = section.Footers(1)               # wdHeaderFooterPrimary = 1
footer.Range.Text = "Clane - Confidential\t\tPage "
footer.Range.Fields.Add(footer.Range, 33) # wdFieldPage = 33 (page number field)
header = section.Headers(1)
header.Range.Text = "Quarterly Report"
```

**Insert a picture:**
```python
rng = doc.Content; rng.Collapse(0)
shape = doc.InlineShapes.AddPicture(r"C:\img\logo.png", False, True, rng)
shape.Width = 140; shape.Height = 60
```

**Save / export:**
```python
doc.SaveAs2(r"C:\Users\me\Documents\Clane\report.docx", 12)  # 12 = .docx
doc.SaveAs2(r"C:\Users\me\Documents\Clane\report.pdf", 17)   # 17 = PDF
```

Word's full feature set is reachable this way. For **table of contents, numbered
multi-level lists, find-and-replace, tracked changes, comments, sections and
columns, page breaks, footnotes, hyperlinks, bookmarks, styles you define
yourself, and reading a document's text back** read `references/com-recipes.md` -
it has verified recipes and a numeric constant cheat-sheet. Load it when the task
needs any of those.

## python-docx path (file only, no live Word)

When you just need to produce a .docx and don't need the app on screen:
```python
from docx import Document
from docx.shared import Pt, Inches, RGBColor

doc = Document()
doc.add_heading("Clane Quarterly Report", level=0)   # level 0 = Title
doc.add_heading("Executive Summary", level=1)
doc.add_paragraph("Revenue grew across all regions this quarter.")
doc.add_paragraph("North region up 17%", style="List Bullet")
table = doc.add_table(rows=1, cols=3)
table.style = "Table Grid"
hdr = table.rows[0].cells
hdr[0].text, hdr[1].text, hdr[2].text = "Region", "Q3", "Q4"
doc.save(r"C:\Users\me\Documents\Clane\report.docx")
```
`references/com-recipes.md` covers the python-docx equivalents (styles, page setup,
images, page numbers) too.

## Make it professional (what "good" looks like)

A document that is merely correct can still look amateur. Apply these conventions
(the same ones the platform's `docx` skill enforces) so the result reads as
designed. **These are guidelines for your judgment, not a rigid template.**

- **Use real styles, never hand-formatting, for structure.** Apply `"Heading 1"`,
  `"Heading 2"`, `"Title"`, `"List Bullet"`, `"List Number"`. Styles give a
  consistent look, enable a table of contents, and survive theme changes. Override
  the built-in heading styles once (size/font/color) rather than formatting each
  heading by hand.
- **One clean default font.** Arial or Calibri at 11pt body is universally safe;
  keep titles black or a single dark brand color for readability. Two font
  families maximum (one for headings, one for body).
- **Hierarchy through size and weight.** Title ~26pt bold, Heading 1 ~16pt bold,
  Heading 2 ~13pt bold, body 11pt. Add space before/after headings (e.g. 12pt
  before, 6pt after) so sections breathe.
- **Consistent margins** (1 inch / 72pt all round) and left-aligned or justified
  body text - never center body paragraphs.
- **Tables: shade and pad the header, repeat it across pages.** Bold white text on
  a dark fill header (`HeadingFormat = True` so it repeats), light zebra striping
  optional, cell padding for readability, a bordered style (`"Table Grid"`). Set
  column widths deliberately; don't leave a lop-sided auto-fit.
- **Never insert bullet characters by hand.** Use `"List Bullet"` / `"List
  Number"` styles (or `ListFormat.ApplyBulletDefault`) so indentation and numbering
  are real and continue correctly.
- **Use smart quotes and real symbols.** Word's AutoFormat usually handles curly
  quotes; if you insert text literally, prefer the curly forms for body copy.
- **Page furniture for anything multi-page.** A footer with a page number, and a
  header or title block, makes a report feel finished. Add a table of contents for
  long documents (recipe in references).

### Verify before you report done

For a multi-page or formatted document, **render and look** - checking the object
model is not enough. Export to PDF (`doc.SaveAs2(path, 17)`), then inspect the
pages with fresh eyes (a subagent is ideal). Hunt for: heading styles not applied
(flat-looking text), tables overflowing the margin, orphaned headings at page
bottoms, missing page numbers, inconsistent spacing, leftover placeholder text.
Also read the text back (recipe in references) and confirm no `XXXX`/`TODO`/
`lorem` placeholders remain. Fix, re-export, look again before declaring success.

For a **headless, file-only** document - especially one needing tracked changes or
comments - the platform `docx` skill is purpose-built (unpack/edit XML/repack with
a validator and a LibreOffice render step). Prefer it there. Use COM + these
conventions when driving the **live** Word the user is watching.

## Gotchas (read these - they cause most failures)

- **Points, not pixels.** Margins, font sizes, and spacing are points (1 in =
  72 pt).
- **1-based collections.** `doc.Paragraphs(1)`, `doc.Tables(1)`, `table.Cell(1,1)`,
  `doc.Sections(1)`.
- **`\r` ends a paragraph**, not `\n`. Cell text comes back with a trailing
  `\r\a` (`\x07`) - strip it when reading (`cell.Range.Text.strip("\r\a ")`).
- **Build at the end of the range.** `rng = doc.Content; rng.Collapse(0)` then
  `InsertAfter`, then style the range you just inserted (see `add_para`).
- **Colors are BGR integers** - use the `rgb()` helper; `Font.Color` and
  `Shading.BackgroundPatternColor` both take BGR. python-docx's `RGBColor` takes
  plain RGB instead.
- **Named constants** (`wdCollapseEnd`, `wdFieldPage`, `wdFormatXMLDocument`,
  alignment) are NOT populated with late-bound `Dispatch` - pass the **numeric
  value** (cheat-sheet in `references/com-recipes.md`).
- **Apply styles by the built-in name** (`doc.Styles("Heading 1")`). The name is
  localized; on an English install the names above are correct.
- **Wrap risky calls in try/except and surface the COM error string** so you can
  adjust rather than fail silently.
- **Don't close the user's other open documents.** `Quit()` only when no documents
  remain; otherwise `Close()` just yours, or leave it open for them.

## Last resort: computer_use

If COM genuinely can't do it (a one-off modal, or Word truly isn't installed), use
`computer_use`: `focus_window` Word, `ui_snapshot` for control refs, then
`ui_invoke`/`ui_set_value` by ref. Even then, prefer pasting a whole block of text
at once over typing control by control.
