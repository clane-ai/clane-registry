---
name: continuity-reviewing
version: 0.1.0
description: |
  How to read a multi-section long-form document end-to-end and flag narrative-arc problems that per-section reviewers can't see — terminology drift, missing transitions, contradictions, unfulfilled promises, unsupported callbacks. Used by the continuity-editor role.
when_to_use: |
  Activate when you are the continuity-editor role with the assembled markdown + style sheet. Not used outside the book-builders revision pass.
inputs:
  - type: assembled_markdown
    required: true
  - type: style_sheet
    required: true
  - type: outline
    required: true
outputs:
  - type: critique_md
---

# Continuity reviewing

You are the only reviewer that reads the WHOLE document end-to-end. The per-section reviewers (fact-checker, copy-editor) can't see across section boundaries — they get one section each. Your job is the cross-section issues.

## What to look for

### 1. Terminology drift

A concept introduced in section 3 as "supplier base" is referred to in section 7 as "vendor list" and in section 9 as "procurement network". Pick the right term (usually the first or most-specific use) and flag the inconsistent ones with line numbers.

### 2. Missing transitions

Section N ends mid-thought; section N+1 opens with content that assumes a hand-off that wasn't made. Flag both sides:

> Sec 4 → Sec 5: Sec 4 ends discussing resin pricing impact; Sec 5 opens with regulatory landscape. No bridging sentence. Add a one-paragraph transition at end of Sec 4 saying "with cost pressure mounting, the policy response became material" before the H2 break.

### 3. Contradictions

Section 3 says "12-15% of EU resin imports affected"; section 7 says "approximately 20%". Either reconcile by writer revision OR confirm both are correct (different denominators). Always cite both line numbers.

### 4. Unfulfilled promises

Section 1's executive summary or introduction says "we examine X in section 6" — but section 6 covers something else. Either Section 6 needs to actually cover X, or Section 1's promise needs to drop.

### 5. Unsupported callbacks

Section 7 says "as we showed in section 3..." — but section 3 didn't show that. Either Section 7's claim is overreaching (section 3 was weaker), or the callback should point at a different section.

## What NOT to flag

- **Style sheet conformance** — that's copy-editor's job. If the sheet says "third-person impersonal" and a section uses it, that's fine.
- **Factual accuracy** — that's fact-checker's job. You're checking that the doc tells a coherent story, not that each claim is true.
- **Cross-references** — that's cross-ref-editor's job. They ADD links; you flag missing CONTENT cohesion.
- **Cosmetic transitions** — if section 4 → section 5 reads naturally without a bridge, don't flag a missing one for the sake of flagging.

## Output format

Write `.bible/review/continuity.md`:

```markdown
# Continuity critique

## Terminology drift
- "supplier base" (sec 3, line 47) vs "vendor list" (sec 5, line 22)
  vs "procurement network" (sec 7, line 89) — standardise on
  "supplier base" (first use, most precise).

## Missing transitions
- Sec 4 → Sec 5: ends additive-pricing, opens regulatory landscape.
  Add a paragraph bridging "with cost pressure ... policy
  response became material".

## Contradictions
- Sec 3 line 92: "12-15% of EU resin imports"
  vs Sec 5 line 14: "approximately 20%". Source ledger entry [22]
  cites 12-15%; Sec 5's 20% appears uncited. Update Sec 5 or
  surface a second citation.

## Unfulfilled promises
- Sec 1 line 38 ("we examine the regulatory response in
  section 6") — Sec 6 covers strategic responses, not regulatory.
  Either re-target the promise to Sec 5 (which DOES cover
  regulatory) or expand Sec 6.

## Unsupported callbacks
- Sec 8 line 22 ("as we showed in section 3 ...") — Sec 3
  established context but didn't make the comparative claim Sec 8
  is anchoring to. Reword to "building on Section 3's context"
  or trim the back-reference.
```

## Worked example pattern

A 50-page paper with 9 sections — you read all ~14K words. Mental ledger:

- Sec 1 introduces "Bab-el-Mandeb" — bolded.
- Sec 3 uses "Red Sea bottleneck" without re-introducing.
- Sec 7 uses "Houthi-attacked corridor" without re-introducing.
- → **Terminology drift**. Flag both Sec 3 and Sec 7 line numbers; standardise on "Bab-el-Mandeb" or whatever the style sheet defined.

Sec 1 promises "section 6 walks the strategic responses by Smurfit Kappa, Mondi, DS Smith, Amcor Europe, Sealed Air Europe." Sec 6 covers Smurfit Kappa and Mondi only. → **Unfulfilled promise** — Sec 6 needs Amcor + Sealed Air + DS Smith filled in, OR Sec 1's promise narrowed.

## Anti-patterns

- **Critiquing prose-level wording** — that's copy-editor's job.
- **Flagging every section break as "needs transition"** — natural section breaks are fine. Only flag where the prose actually feels jarring.
- **Rewriting the document** — you produce critique notes; section writers revise.
- **Demanding callbacks where none make sense** — not every section needs a "as we discussed earlier" pointer.
