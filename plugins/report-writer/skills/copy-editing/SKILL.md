---
name: copy-editing
version: 0.1.0
description: |
  How to enforce a project style sheet across one section — voice/tense conformance, heading levels, citation marker consistency, taboo words. Used by the copy-editor role.
when_to_use: |
  Activate when you are the copy-editor role with one section file + the style sheet. Not used outside the book-builders revision pass.
inputs:
  - type: section_markdown
    required: true
  - type: style_sheet
    required: true
outputs:
  - type: critique_md
---

# Copy-editing

Mechanical style-conformance work. Your judgement comes ONLY from the style sheet — don't impose external preferences.

## The six things to check

### 1. Voice / tense / person

Sheet says "third-person impersonal, present-tense findings". Section uses second-person at lines 14, 47, 92? → Flag.

Sheet says "active voice default". Section has >30% passive voice? → Flag the section overall (not every sentence — pattern + 3-5 examples).

### 2. Heading levels

Sheet says H2 for top, H3 for subsections, no H4? → Flag any H4 or deeper. Flag stray H1 (the orchestrator owns the doc-level H1).

Heading case: sheet says Title Case? Section uses Sentence case? → Flag with line numbers.

### 3. Citation marker format

Sheet says `[n]` numeric? Section uses `(Author, 2024)` Harvard or `[Author 2024]` Chicago? → Flag every wrong-format citation.

### 4. Taboo words

Walk the section grepping for taboo words from the sheet's taboo list. Typical: `delve`, `robust`, `leverage` (verb), `navigate`, `myriad`, `tapestry`, `in today's fast-paced world`, `in conclusion`, `it is important to note`, `various`, `numerous`.

Flag with line numbers, suggest a replacement.

### 5. Number / date format

Sheet says "DD Month YYYY" (e.g. "14 March 2026")? Section uses "March 14, 2026"? → Flag.

Sheet says "digits everywhere except sentence-start"? Section uses "twelve percent"? → Flag.

### 6. Currency / units

Sheet says "€ primary, USD/GBP in parens on first appearance"? Section uses $ as primary? → Flag.

## What NOT to flag

- **Choices the style sheet permits.** If sheet allows either Oxford comma or no Oxford comma, don't pick a fight.
- **Factual claims** — fact-checker's job.
- **Cross-section issues** — continuity-editor's job.
- **Missing cross-refs** — cross-ref-editor's job.
- **YOUR preferences** that aren't in the sheet. The sheet IS the standard.

## Output format

Write `.bible/review/<section-id>-copy.md`:

```markdown
# Copy-edit critique — Section 4: Red Sea / Suez Disruption

## Voice / tense
- Section uses second-person ("you") at lines 14, 47, 92. Style
  sheet specifies third-person impersonal. Replace with "firms" /
  "operators" / "European converters" depending on subject.

## Headings
- Line 58: H4 used (`#### Detailed mechanics`); sheet limits to H3.
  Flatten to a bolded paragraph lead, or merge into the H3 above.

## Citation format
- Line 22: "(Drewry, 2024)" used; sheet specifies `[n]`. Replace
  with `[12]` (the Drewry source in the ledger).
- Same at lines 31, 56, 89 — apply consistently.

## Taboo words
- "delve" at lines 31, 78 → replace with "examine" / "look at".
- "robust" at line 102 → replace with specific quality term.
- "leverage" (verb) at line 144 → "use" / "exploit" / "draw on".
- And similar throughout — apply consistently.

## Numbers / dates
- Line 47: "March 14, 2026" → "14 March 2026" per sheet's
  DD-Month-YYYY rule.
- Line 89: "twelve percent" → "12%" per digits-default rule.

## Currency
- Line 22: "$5,158/40ft" → "€4,750/40ft ($5,158)" per sheet's
  € primary + USD in parens rule.
```

## Worked example (paragraph audit)

Original paragraph:

> "You'd think the Bab-el-Mandeb attacks would have caused only a brief disruption, but actually they delved into a more profound impact: by February 2024, container rates had risen approximately twelve percent (Drewry, 2024)."

Style sheet says: third-person impersonal, present-tense findings, active voice, [n] citations, digits-default for numbers, taboo word "delved", "approximately" is fine.

Critique:

- "You'd think" (line N) — second-person, sheet specifies third-person impersonal. Replace with "Casual observers might expect".
- "delved into a more profound impact" (line N) — taboo "delved". Replace with "had a more substantial impact".
- "approximately twelve percent" (line N) — number in words; sheet says digits-default. "approximately 12%".
- "(Drewry, 2024)" (line N) — Harvard format; sheet says `[n]`. Replace with `[12]`.

## Anti-patterns

- **Rewriting the prose** — produce notes, the writer rewrites. Your prose voice differs from theirs; rewriting yourself creates voice inconsistency.
- **Flagging every passive sentence individually** — call out the pattern + 3-5 examples + "apply consistently".
- **Flagging taboo words that ARE in the sheet's taboo list** — wait that's exactly what to flag. (I mean, don't add words to the taboo list that AREN'T there.)
- **Adding new style rules** — the sheet is the standard. If a rule's missing and you think it should be there, that's a STYLE SHEET update task for the orchestrator, not a per-section critique entry.
