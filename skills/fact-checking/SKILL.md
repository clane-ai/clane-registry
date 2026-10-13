---
name: fact-checking
version: 0.1.0
description: |
  How to verify factual claims in a long-form document against a shared source ledger using risk-weighted sampling instead of exhaustive re-reading. Used by the fact-checker role during the book-builders revision pass.
when_to_use: |
  Activate when you are the fact-checker role dispatched by long-doc-writer with one section path + the source ledger path. Not used outside the publishing pipeline.
inputs:
  - type: section_markdown
    required: true
  - type: source_ledger
    required: true
outputs:
  - type: critique_md
---

# Fact-checking

You have ONE section to verify and a source ledger to check against. Exhaustive verification of every sentence is uneconomic; risk-weighted sampling catches the high-impact errors.

## What to verify (the sample)

Always sample ALL of these regardless of section length:

- **Numbers** — percentages, currency amounts, counts, magnitudes, dates with specific days/months/years
- **Direct quotations** — anything in quote marks attributed to a named source
- **Named events with specific dates** — "the Galaxy Leader seizure on 19 November 2023"
- **Named entity actions** — "Maersk announced full Cape-of-Good-Hope diversion on 14 December"

For aggregate / qualitative claims, sample by section length:
- <2000 words → every claim
- 2000-5000 words → every other
- 5000-8000 words → every third
- >8000 words → every fourth, PLUS hand-pick the section's headline claims

## What NOT to flag

- General-knowledge claims ("the Suez Canal connects the Mediterranean and Red Sea") — these don't need citations.
- Style choices the style sheet permits.
- Wording differences (that's copy-editor's job).
- Missing transitions (that's continuity-editor's job).

## The four verdicts

For each sampled claim:

1. **supported** — claim has inline `[n]` AND ledger entry [n]'s URL/snippet matches the claim's substance.
2. **contradicted** — claim has inline `[n]` BUT ledger entry [n] says something different. Drift between source and prose.
3. **needs-source** — claim is a specific fact (number/date/named-event/quote) AND has no `[n]` citation.
4. **unflagged** — general knowledge, no citation needed.

## Output format

Write `.bible/review/<section-id>-fact-check.md`:

```markdown
# Fact-check critique — Section 4: Red Sea / Suez Disruption

Reviewed 47 claims, 18 sampled.

## Supported (12)
- line 14: "247% increase Nov 2023 → Feb 2024" [12] ✓
- line 28: "Galaxy Leader seizure 19 November 2023" [13] ✓
- ... (10 more)

## Contradicted (1)
- line 47: "Maersk diverted on 14 November 2023" — citation [15]
  shows the announcement date as 14 December 2023, not November.
  Confirm with writer; date error or wrong source.

## Needs source (5)
- line 92: "Smurfit Kappa disclosed elevated working-capital
  positions in Q1 2024 results" — specific factual claim, no [n].
- ... (4 more)
```

## Worked example claim sweep

Section paragraph:

> "By February 2024, Drewry's WCI Asia→North Europe rate had risen
> 247% from its November 2023 baseline [12], with major carriers
> Maersk, MSC, and CMA CGM all announcing full Cape-of-Good-Hope
> rerouting within a 10-day window in mid-December [13, 15, 18]."

Sampled claims:

- "247% increase Nov 2023 → Feb 2024" [12] → look up [12] in ledger. Ledger says Drewry WCI Asia→N.Europe weekly dataset. Snippet shows the rate movements. **Supported**.
- "Maersk, MSC, CMA CGM diverted within a 10-day window in mid-December" [13, 15, 18] → look up each. [13] is Lloyd's List timeline (mentions Maersk Dec 14). [15] is Maersk press release Dec 14. [18] is industry tracker showing all three majors by Dec 24. **Supported** — the "10-day window" is supported by [18].

## Anti-patterns

- **Rewriting the prose.** You produce critique notes; writers rewrite.
- **Fabricating verdicts.** If a claim isn't in the ledger, flag "needs-source" — don't infer it.
- **Sampling 5 claims out of 47 then declaring "looks fine"** — undersample defeats the purpose. Stick to the sampling rates above.
- **Flagging every passive-voice sentence as "needs-source"** — that's copy-editor's territory; fact-checking is about WHAT THE TEXT SAYS, not HOW.
