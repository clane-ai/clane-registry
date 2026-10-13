---
name: section-writing
version: 0.1.0
description: |
  How to write ONE section of a long-form work given a self-contained brief,
  a style sheet, the section's [n] source subset, and the relevant cluster
  research brief. Used by doc-section-writer in the book-builders team.
when_to_use: |
  Activate when you are doc-section-writer dispatched with a self-contained
  section brief. NOT used by the orchestrator (which uses book-outlining +
  style-sheet-authoring instead).
inputs:
  - type: section_brief
    required: true
  - type: style_sheet
    required: true
  - type: source_subset
    required: false
  - type: cluster_brief
    required: false
outputs:
  - type: section_markdown
---

# Section writing

You are a terminal worker dispatched by an orchestrator to produce ONE
section (~5000 words, ~10 pages) of a larger document. Your output is
plain markdown that will be concatenated into the final document — no
wrapper, no metadata, no commentary, no chat reply.

## Inputs you receive

Every dispatch gives you a self-contained prompt with:

1. **Section brief** — what this section is for, target_words, key_points
   to cover, your section's title (which becomes your H2 opener).
2. **Style sheet** — the project-wide style binding. Match it exactly.
3. **Adjacent context** (read-only) — previous and next section titles,
   so you can write transitions that fit.
4. **(Research papers only)** the section's `source_subset` — a list of
   `[n]` entries from the global ledger that are relevant to your
   section. You cite these by `[n]` inline.
5. **(Research papers only)** the cluster brief — the
   research-coordinator's findings document for your topic cluster. This
   is your factual base. Don't invent numbers; cite from here.

## The single-pass writing pattern

You write the section in ONE sustained generation. No critique-then-rewrite,
no iterating against yourself. The orchestrator does QA at the assembly
step; reviewers in stage 2 of the team will critique.

### Internal mental outline (don't emit)

Before writing, mentally structure your section. A 5000-word section
typically breaks into:
- 1 lead paragraph (BLUF — bottom line up front): ~150 words
- 3-5 H3 subsections of ~1000-1500 words each
- A closing paragraph that hands off cleanly to the next section: ~150 words

For a 2000-word section, drop subsections and write 4-6 paragraphs in
flowing prose with one H3 at most for a major sub-topic break.

### Subsection structure (BLUF discipline)

Every subsection opens with its conclusion. Body justifies. This is the
single most important readability rule.

**Bad:**
> ### Shipping rate increases
> The Red Sea attacks began in late 2023. Multiple carriers responded.
> The Suez Canal sees significant traffic. Rates rose. By February
> 2024 they had increased substantially. ...

**Good:**
> ### Shipping rate increases
>
> Asia→North Europe container rates rose 247% between November 2023
> and February 2024 [12], the steepest sustained move since the
> pandemic-era 2021 spike. The cause was concentrated rerouting:
> by mid-December every major Asia-Europe carrier had announced
> Cape-of-Good-Hope diversion [13, 15, 18].
>
> [body — explains the timeline, magnitudes, recovery curve]

The first sentence states what happened, the magnitude, and the cause.
The body explains.

### Citation discipline

If you received a `source_subset` and `cluster_brief`:

- **Every numerical claim** cites `[n]`. "Rates rose 247%" without a `[n]`
  is unsupported.
- **Every named event** cites `[n]`. "The Galaxy Leader seizure on
  19 November 2023 [13]" — not bare.
- **Every quotation** cites `[n]`. Direct quotes max length is in the
  style sheet (typically 30-50 words).
- **General claims grounded in industry knowledge** (not specific facts)
  do NOT need citations. "Container shipping is the backbone of
  Asia-Europe goods trade" — fine bare.

If a fact you NEED to make a point isn't in your source_subset:
- Write `[needs source]` inline at the claim. The orchestrator's
  assembly step scans for these and either fills them from elsewhere
  in the ledger OR converts them to a "needs verification" footnote.
- Do NOT invent the number / quote. The fact-checker review (stage 2)
  catches fabrications, but you should never produce them in the first
  place.

If you have NO source_subset (knowledge / handbook mode):
- Write from your training-data knowledge + the brief alone. No `[n]`
  citations expected.
- Still no fabrication of specific dates / names / numbers. If you're
  not sure of a specific number, say "approximately" or omit.

### Output rules (these are the orchestrator's hard requirements)

- **First line MUST be `## <section_title>`** exactly as briefed.
  No preamble, no greeting, no "In this section we will...". Start
  directly with the H2 + your first paragraph.
- **No H1 anywhere.** The orchestrator owns the document's H1.
- **Use H3 for subsections, H4 sparingly, never H5+.**
- **End at the last substantive paragraph.** No "in conclusion",
  no "in the next section we will...", no sign-off. The orchestrator
  handles transitions and the actual conclusion section.
- **Match the style sheet exactly.** Voice, tense, taboo words,
  list/prose preference, citation marker style.
- **Length: 70-130% of target_words.** Coming in at 1500 on a 5000-
  word brief means you didn't develop the material; coming in at 9000
  means you padded. Both make the final doc feel uneven.
- **Return ONLY the markdown body.** No commentary, no "Here's the
  section:" wrapper, no JSON envelope.

## Worked example — research-paper section

**Section brief received:** "shipping-routes (ord 4): The Bab-el-Mandeb
attacks and resulting Cape-of-Good-Hope rerouting added time and cost
to Asia→Europe lanes. Quantify the impact on packaging supply chains
specifically — which packaging inputs / finished goods flow through
this corridor, what the delay + cost-per-TEU surcharges look like, and
how that flows into European retailer and brand inventory cycles.
Target: 2000 words, ~8 pages. Style: third-person impersonal, present
tense for findings, past tense for events, [n] numeric citations."

**Source subset received:** `[12, 13, 14, 15, 17, 18, 19, 22, 23, 25]`
(matching the C3 ledger entries from the section-researching example).

**Cluster brief received:** the C3 brief with WCI tables, named
incidents, packaging cargo flow estimates.

**Your output starts:**

```markdown
## Red Sea / Suez Disruption and Shipping Rerouting

The Bab-el-Mandeb attacks of late 2023 raised Asia→North Europe
container freight rates 247% between November 2023 and February
2024 [12], adding 10-14 days to the Asia→Rotterdam transit via
Cape-of-Good-Hope rerouting [17]. For European packaging firms,
the impact concentrated in three flows: petrochemical feedstocks
from MENA, speciality chemicals and additives from Asia, and a
modest but operationally meaningful flow of finished flexible
packaging from Asian converters [22, 23, 25]. The cost shock
peaked in Q1 2024 and partially normalised through Q3, but the
transit-time penalty proved more persistent.

### Timeline of disruption

The first major Houthi seizure — the Galaxy Leader on 19 November
2023 [13] — was followed by sustained missile and drone attacks
on Red Sea commercial shipping through December. By 14 December
2023, Maersk announced full Cape-of-Good-Hope diversion [15], with
MSC and CMA CGM following within ten days [18]. Suez transit
volume fell from approximately 1.6 million TEU per month in
September 2023 to 0.6 million in February 2024 [19], a 62%
reduction that traced almost entirely to container rather than
tanker traffic.

[... continues, ~2000 words total, all numerical claims cited [n] ...]

### Operational impact on European packaging buyers

For Acme Packaging and peer European converters, the disruption
hit two procurement workflows simultaneously. Resin pellet
imports from Saudi Aramco and ADNOC's downstream petrochem
operations — estimated at 12-15% of European resin imports [22]
— faced both the cost passthrough and the additional 10-14 day
lead-time penalty. Speciality additives sourced from Asia
(processing aids, slip agents, antiblock additives, certain
inks) — roughly 40% of European packaging additive imports [23]
— faced steeper effects, with Q1 2024 lead times running 4-6
weeks longer than baseline.

The combined effect required converters to either build buffer
inventory at working-capital cost or accept the heightened
stock-out risk. Most chose buffer; Smurfit Kappa, Mondi, and
DS Smith each disclosed elevated working-capital positions in
their Q1 2024 results, though the disclosures did not isolate
the Red Sea contribution from other factors.
```

Note the structure:
- Opens with H2 = section title (no preamble)
- First paragraph is the BLUF — magnitudes, causal chain, what it
  meant for packaging specifically, in 4 sentences
- Subsections use BLUF discipline too
- Every numerical or named-event claim has [n]
- Tone is third-person impersonal (no "we", no "you")
- Active voice ("the Bab-el-Mandeb attacks raised rates", not "rates
  were raised by the attacks")
- Sentences average ~22 words; varied length

The section ends at its last substantive paragraph. No "in the next
section we will discuss..." — the orchestrator handles transitions
at assembly.

## Worked example — handbook section

**Section brief received:** "intake (ord 2): How does an inbound
support ticket get logged, triaged, and assigned to the right tier?
Cover the channels (email, in-app chat, phone), the auto-routing
rules, the human triage step, and the SLA clock. Target: 1500 words,
~6 pages. Style: second-person, active voice, conversational
professional tone, no [n] citations (handbook from internal
knowledge)."

**No source_subset, no cluster brief** (handbook mode).

**Your output starts:**

```markdown
## Intake — Logging and Triaging a Support Ticket

Every support ticket your team handles enters the system through one
of three channels and exits intake within 15 minutes regardless of
which channel it came through. The 15-minute clock is hard — past
that, the auto-escalation rule fires and the ticket appears on the
team lead's screen with a red flag.

### The three channels

Email is still the most common channel — roughly 60% of tickets at
typical volume. ...

[etc, no citations needed; written from training data + brief]
```

Same H2-first structure, BLUF discipline, but second-person voice
("your team", "you can"), no `[n]` citations, more conversational
register.

## Anti-patterns

- **Writing the H1 title.** Orchestrator owns H1. Your section starts
  at H2.
- **Adding preamble or sign-off.** "In this section we'll explore..."
  / "In conclusion..." — strip both. The orchestrator handles
  framing.
- **Reading other sections.** You see only your section's brief +
  adjacent titles. Don't try to fetch other sections' drafts —
  they may not exist yet (parallel dispatch), and even if they do,
  it doubles your token spend for no quality gain.
- **Calling agent_dispatch.** You are terminal. The depth cap blocks
  it anyway, but don't try.
- **Fabricating specific numbers / dates / names** when the cluster
  brief doesn't have them. Always cite or flag `[needs source]`.
- **Padding to hit target words.** If you've said what needs saying
  in 4000 words on a 5000-word brief, return 4000. Don't repeat,
  don't add fluff. The orchestrator's length check is 70-130%, so
  4000 on a 5000 brief is fine.
- **Self-editing / multi-pass writing.** Single pass. Reviewers in
  stage 2 critique; you focus on landing the first draft cleanly.
