---
name: book-indexing
version: 0.1.0
description: |
  How to build a back-of-book concept index from a finished long-form document — extract terms, dedupe synonyms, cap section refs, format alphabetically. Used by the indexer role in the book-builders production pass.
when_to_use: |
  Activate when you are the indexer role with the assembled markdown + style sheet. Runs once at the end of the publishing pipeline.
inputs:
  - type: assembled_markdown
    required: true
  - type: style_sheet
    required: true
outputs:
  - type: index_md
---

# Book indexing

The back-of-book index is the reader's JUMP-IN tool. It points at WHERE in the doc each concept lives, so a reader who arrives looking for "PPWR" can flip straight there instead of reading 80 pages linearly.

## What goes in (curated, not exhaustive)

- **Defined terms** — bolded first-use entries (style sheet convention).
- **Named entities** — companies (Smurfit Kappa, Maersk), regulators (SEC, EU), people (Eli Lilly, Yermak), places (Bab-el-Mandeb, Rotterdam, Suez).
- **Acronyms** — PPWR, WCI, TEU, MENA, NATO. Index under the acronym; list the expansion in parens.
- **Technical terms** — italicised first-use entries.

## What stays out

- Ordinary English words (the, and, of, system, data, value, role). The index is for CONCEPTS, not a concordance.
- Numbers and dates. Those are for fact-checking, not navigation.
- Generic terms a reader wouldn't look up ("approach", "method", "consideration").

## The three normalisation rules

### 1. Dedupe synonyms

If the document uses "Bab-el-Mandeb" and "Red Sea bottleneck" and "Houthi-attacked corridor" interchangeably:

- Pick the canonical (usually the first-use, most-specific term).
- The canonical entry gets all section refs.
- The variants render as `Red Sea bottleneck. See Bab-el-Mandeb`.

### 2. Cap section refs at 5 per entry

If "shipping" appears in 9 sections, that means the term is too broad to be useful as an index entry — split into more specific sub-concepts ("shipping rates", "shipping diversion", "shipping costs") OR pick the 3-5 most-load-bearing sections.

### 3. Use section titles, not line numbers

The final doc may render as PDF where line numbers disappear. Section titles or "Section <N>" survive layout.

## Output format

```markdown
## Index

Acceleration (cost). *See* energy and feedstock cost effects
Bab-el-Mandeb, Section 2.1, 4, 9
BOPP films, Section 5
Cape of Good Hope, Section 4
Container shipping. *See* shipping routes
DS Smith, Section 8
Drewry, Section 4
EU regulation. *See* PPWR
Maersk, Section 4
MENA (Middle East and North Africa), Section 1, 3, 5
PPWR (Packaging and Packaging Waste Regulation),
  Section 1.2, 6
Red Sea bottleneck. *See* Bab-el-Mandeb
Smurfit Kappa, Section 8
TEU (twenty-foot equivalent unit), Section 4
Tirlán, Section 1, 8
WCI (World Container Index), Section 4
```

## Worked example sweep

50-page paper on Middle East impact on EU packaging:

| Term | Where it appears | Action |
|---|---|---|
| **Bab-el-Mandeb** (bolded sec 2) | sec 2, 4, 9 | Canonical entry, 3 refs. |
| "Red Sea bottleneck" (sec 3) | sec 3 | Variant. → "See Bab-el-Mandeb" |
| **PPWR** (bolded sec 1) | sec 1.2, 6 | Acronym + expansion in parens, 2 refs. |
| "EU regulation" (sec 6) | sec 6 | Variant. → "See PPWR" |
| Maersk | sec 4 | Named entity, 1 ref. |
| MSC | sec 4 | Named entity, 1 ref. |
| CMA CGM | sec 4 | Named entity, 1 ref. |
| Smurfit Kappa | sec 8 | Named entity, 1 ref. |
| WCI (sec 4) | sec 4 | Acronym + expansion, 1 ref. |
| TEU (sec 4) | sec 4, intro | Acronym + expansion, 2 refs. |
| "the" / "a" / "is" | — | Not indexed (ordinary). |
| "247%" / "14 December 2023" | — | Not indexed (numeric). |

Output: ~12 entries from a 50-page paper. That's the right magnitude — busy enough to be useful, sparse enough to be readable.

## Anti-patterns

- **Indexing every capitalised word.** "European" appears 200 times; not an index entry. "European Union" might be if it's a substantive concept; usually it's just an adjective.
- **Indexing numbers.** Numbers are facts, not concepts. Readers don't look up "247%" in an index.
- **One-section-only entries that are obvious from context.** If "Smurfit Kappa" only appears in section 8 (the strategic-response section about named firms), and the section's heading already says "Strategic responses by named firms", indexing Smurfit Kappa is just redundant.
- **Listing 10 synonyms as separate entries.** Always dedupe with "See" pointers.
- **Cap at 5 refs per entry violated.** If a term appears in 12 sections, it's the wrong granularity — break into sub-concepts.
