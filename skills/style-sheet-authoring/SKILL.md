---
name: style-sheet-authoring
version: 0.1.0
description: |
  How to author the project-wide style sheet for a long-form document so N
  parallel section writers produce prose that reads as if written by one
  author. Used by the editorial lead in book-builders after outlining and
  before dispatching section writers.
when_to_use: |
  Activate when you are the orchestrator of a long-form document and you
  have an outline + audience + tone hints, and you need to write the
  style-sheet.md that every section writer receives verbatim in its
  prompt. Skip when the user supplied an explicit style guide; activate
  in every other case (default).
inputs:
  - type: brief
    required: true
  - type: audience
    required: false
  - type: tone
    required: false
  - type: style
    required: false
outputs:
  - type: style_sheet_md
---

# Style sheet authoring

The style sheet is the single most important consistency tool in a
multi-author work. N parallel section writers each receive the same
style sheet in their prompt. If the sheet is precise, the chapters
read as one voice. If it's vague ("professional tone"), each writer
picks their own interpretation and the assembled doc reads as
ten-different-people.

Target length: 150-300 words. Short enough to fit in every section
writer's prompt without bloating context; long enough to leave no
ambiguity on the questions writers actually face.

## The seven axes a style sheet must cover

Every style sheet answers these in order. Skipping any leaves room
for writers to diverge.

### 1. Voice and person

Pick exactly ONE:
- **First-person plural** ("we") — academic papers, internal reports
- **Second-person** ("you") — handbooks, primers, how-to guides
- **Third-person impersonal** — research papers, regulatory submissions,
  formal whitepapers
- **First-person singular** ("I") — opinion pieces, blog-style books
  (rare in business)

### 2. Tense and voice

- **Tense**: present (most non-fiction), past (history/case studies),
  future (forecasts/strategy docs). Mixed tense is OK at section
  boundaries (a case study using past + lessons in present) but be
  explicit about WHICH section uses what.
- **Active vs passive**: default to active ("the team measured X")
  except where passive is conventional (academic results sections —
  "X was measured"). State the rule explicitly.

### 3. Heading conventions

- The orchestrator owns H1 (the doc title) and H2 (section titles).
- Section writers use H3 for subsections, H4 sparingly for sub-subs.
- Never H5+.
- Heading case: Title Case (most common), or Sentence case (academic
  papers, technical docs). Pick one, state it.

### 4. Citation format

- **Inline citation style**: `[n]` numeric (matches our source-ledger
  ordering), or `(Author, Year)` Harvard, or `[Author Year]` chicago.
  Numeric is the default unless the user requested otherwise.
- **Reference list format**: the orchestrator's bibliography-assembler
  handles formatting; section writers only need to know the inline
  marker style.
- **Direct quotes**: when allowed, max length (e.g. 50 words), and
  whether they need a page reference.

### 5. Formatting features

- **Lists**: when to use bullets vs prose. Default rule: lists for
  >3 parallel items the reader needs to scan; prose otherwise.
- **Tables**: encouraged for comparative data, discouraged for narrative.
- **Code blocks**: when they appear (technical docs yes; business reports
  usually no).
- **Bold/italics**: emphasis sparingly; bold for first-use of defined
  terms; italics for titles + foreign words.
- **Numbers**: spell out 1-9, digits for 10+; OR digits for everything
  (technical); OR digits except sentence-start (journalistic). Pick one.
- **Dates**: 14 March 2026 (DD-Month-YYYY) for European audiences,
  March 14, 2026 for North American.

### 6. Tone words — taboo list

Specific words to avoid (writers will fall into them by default):
- "delve", "robust", "navigate", "leverage" (verb), "myriad",
  "tapestry", "in today's fast-paced world", "in conclusion",
  "it is important to note", "various", "numerous"
- Add domain-specific taboos: marketing reports might ban "synergy",
  technical docs might ban "simply", legal docs might ban "obviously".

State the rule once and writers will avoid them.

### 7. Reader assumptions

- What does the reader already know? (technical depth — surface or deep)
- What jargon is OK without definition? (industry-standard terms)
- What needs first-use definition? (acronyms, internal terms)
- What examples will resonate? (industry context — finance examples
  for finance audiences, healthcare for healthcare).

## Template

Drop this into `.bible/style-sheet.md`:

```markdown
# Style sheet — <Document Title>

**Voice:** [first-person plural / second-person / third-person impersonal]
**Tense:** [present / past / future] — [active / passive] voice.
**Audience:** [one-sentence description of who's reading]
**Reader knows:** [bullet list of assumed knowledge]
**Reader does NOT know:** [bullet list of what needs definition]

## Headings
- H2 for section titles (orchestrator owns).
- H3 for subsections (writers own).
- H4 only when truly necessary. No H1, no H5+.
- Heading case: [Title Case / Sentence case].

## Citations
- Inline: [`[n]` numeric / `(Author, Year)` Harvard / `[Author Year]` Chicago].
- The reference list is assembled by the orchestrator from
  `.bible/source-ledger.jsonl` — writers don't write references at
  the end of their section.
- Direct quotes max [N] words; longer requires summarisation.

## Formatting
- Lists: [rule for bullets vs prose]
- Tables: [when encouraged / when discouraged]
- Code blocks: [allowed / not allowed]
- Bold: [first-use of defined terms only]
- Italics: [titles + foreign words only]
- Numbers: [rule]
- Dates: [DD Month YYYY / Month DD, YYYY]

## Voice rules
- Active voice default.
- Sentences average 15-25 words. Vary; avoid monotony.
- Lead with the most important point in each subsection (BLUF — bottom
  line up front).

## Taboo words
Do NOT use: [list]
Replace [X] with [Y] in writing about [domain Z].

## Section-specific notes
- [Optional. Per-section style hints if some sections need a slightly
  different register — e.g. "Executive Summary uses bullets exclusively;
  body uses prose."]
```

## Worked example — research paper

**Brief signals:** Board-level audience, research-paper style, must cite
sources, must be sober/measured tone.

```markdown
# Style sheet — Impact of Middle East War on Acme Packaging

**Voice:** Third-person impersonal. No "we", no "you". The document
speaks AS the firm's analytical voice, not as anyone in particular.
**Tense:** Present for findings, past for historical events, future
conditional ("would likely") for forecasts. Active voice except
where passive is conventional in financial-analyst writing.
**Audience:** Acme Packaging board + senior leadership (CEO, CFO,
COO). Read 1-2 long documents per week; expect a 3-sentence
headline they can repeat in a meeting.
**Reader knows:** Packaging industry value chain, basic European
geography + trade, Acme's own ops, P&L mechanics, common
financial-statement terminology.
**Reader does NOT know:** Specifics of Middle East geopolitics
beyond headlines, technical shipping/maritime terminology (Bab-el-
Mandeb, TEU surcharges), petrochemicals chain (catalytic cracking
yields, polymer feedstock substitution). Define first-use.

## Headings
- H2 for section titles. H3 for subsections. H4 rarely.
- Title Case.

## Citations
- Inline `[n]` numeric, where n is the source's index in
  `.bible/source-ledger.jsonl`.
- Cite every numerical claim, every named event, every quotation.
- The References section is assembled at the end by the
  bibliography-assembler from the source ledger. Do not draft
  references at the end of your section.
- Direct quotes max 30 words; longer needs summarisation.

## Formatting
- Lists: bulleted lists for ≥3 parallel items (e.g. comparison
  axes, scenario sets). Prose elsewhere.
- Tables: encouraged for cost / pricing / volume comparisons.
- Code blocks: not applicable.
- Bold: first use of defined terms (e.g. **Bab-el-Mandeb**).
- Italics: company names ARE NOT italicised. Foreign phrases yes.
- Numbers: digits everywhere except sentence-start ("Twenty-three
  percent of European packaging...").
- Dates: DD Month YYYY format (14 March 2026), not US.
- Currency: € primary; convert USD/GBP in parentheses on first
  appearance.
- Units: SI (€/MWh, €/tonne, TEU, days).

## Voice rules
- BLUF: every section's opening paragraph states the section's
  conclusion. Body justifies.
- Sentences average 18-22 words. Long compound sentences are fine
  for nuance, short sentences for emphasis.
- No hedging fillers: replace "it is important to note that X"
  with "X.". Replace "X tends to" with "X".
- Quantify where possible: "shipping costs rose materially" →
  "Drewry's WCI rose 247% between November 2023 and February 2024
  [12]".

## Taboo words
Do NOT use: delve, robust (use "resilient" or specific quality),
leverage (verb — use "use" or "exploit"), navigate (use "respond
to" or "manage through"), myriad, tapestry, "in today's fast-
paced world", "it is important to note", "in conclusion", "various",
"numerous".

Replace "supply chain" with the SPECIFIC chain segment whenever
possible ("inbound resin supply", "EU→UK distribution leg").
Generic "supply chain" obscures more than it explains.

## Section-specific notes
- Executive summary uses ONE three-paragraph structure: 1)
  headline impact magnitude, 2) most-affected segments, 3) top-3
  strategic responses.
- Each body section opens with a one-sentence finding, then
  justification.
- Implications section ends with "Recommended next steps"
  bulleted list.
```

## Anti-patterns

- **"Professional tone"** — gives writers no information. State the
  voice, tense, taboos, sentence-length norm explicitly.
- **Style sheet that contradicts the brief** — if the brief says
  "approachable, conversational" and the sheet says "third-person
  impersonal", you've fought yourself.
- **Endless taboo list** — keep it to 8-12 high-impact words.
  Writers can't track 50 banned words.
- **Per-section style sheets** — there's ONE sheet for the whole
  document. If a section needs a different register, that's a
  one-line note in the "Section-specific notes" of the single sheet.
- **Forgetting the audience** — "who's reading this" drives
  every other decision. Always state it concretely (job titles,
  what they already know).
