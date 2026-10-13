---
name: book-outlining
version: 0.1.0
description: |
  How to design the outline of a long-form document (5-100 pages) so it can be
  decomposed into independent parallel sections that still read as one
  coherent work. Used by the editorial lead in the book-builders team after
  parsing the brief, before dispatching section writers.
when_to_use: |
  Activate this skill when you are the orchestrator of a long-form document
  (long-doc-writer / chief-editor) and you need to convert a one-paragraph
  brief into an outline.json with N sections, each independent enough to
  be drafted by a separate agent. Skip when the user has already supplied
  an outline; activate when they've given a goal + maybe a length and
  expect you to plan the structure.
inputs:
  - type: brief
    required: true
  - type: target_pages
    required: false
  - type: style
    required: false
outputs:
  - type: outline_json
  - type: section_dependency_map
---

# Book outlining

You're the chief editor of a long-form work. Before any section is drafted,
you need an outline that makes the work decomposable into independent
parallel sections while keeping the whole work coherent. This is the most
important step — a bad outline produces a bad document no matter how good
the section writers are.

## The four outline patterns

Pick one based on the brief's nature. Don't mix patterns in one document.

| Pattern | When to pick | Section shape |
|---|---|---|
| **Problem-Solution** | Most non-fiction reports, whitepapers, business cases | Intro → Problem definition → Constraints → Options → Recommendation → Risks → Conclusion |
| **Chronological** | History papers, post-mortems, longitudinal studies, biographical | Intro → Era 1 → Era 2 → Era 3 → ... → Conclusion |
| **Thematic** | Research papers, comparative analyses, multi-aspect topics | Intro → Aspect 1 → Aspect 2 → ... → Synthesis → Conclusion |
| **Methodological** (academic) | PhD dissertations, scientific papers | Abstract → Intro → Literature review → Methodology → Results → Discussion → Conclusion → References |

For the user's task, **read the brief carefully**:
- "Impact of X on Y" → almost always thematic (impacts cluster by aspect)
- "How to ..." / "Guide to ..." → problem-solution OR methodological
- "Comparison of A, B, C" → thematic by feature/criterion
- "PhD on ..." → methodological, force the dissertation skeleton
- "History of ..." → chronological

## Sizing the outline

Section count and word target are mechanical functions of total length:

| Total pages | Total words (~250 wpm) | Sections (incl. intro+conclusion) | Words per body section |
|---|---|---|---|
| 10 | 2,500 | 3-4 | 700-900 |
| 25 | 6,000 | 5-6 | 1,000-1,300 |
| 50 | 12,500 | 7-10 | 1,400-2,000 |
| 100 | 25,000 | 10-12 | 2,200-2,800 |
| 200+ (book) | 50,000+ | 12-20 (chapters) | 3,500-5,000 |

**Hard limit: max 12 body sections per run.** Past that, dispatch
coordination drift compounds. If the user wants more, split into
volumes (orchestrate Volume 1 and Volume 2 as separate runs).

A section should target ~5000 words OR less. A 6000+ word section is
usually doing two things — split it.

## Anatomy of a section in the outline

Each section in `outline.json` is an object:

```json
{
  "ord": 3,
  "id": "constraints",
  "title": "Constraints and assumptions",
  "target_words": 1800,
  "target_pages": 7,
  "brief": "Explain the regulatory, economic, and operational constraints that bound the solution space. The reader should leave this section knowing WHY certain otherwise-obvious options are off the table. Reference: 2023 SEC guidance, IFRS 17, anti-money-laundering directives.",
  "key_points": [
    "Regulatory landscape — SEC Rule 17a-4, Reg ATS, MiFID II",
    "Economic constraints — current rate environment, balance-sheet impact",
    "Operational constraints — legacy core systems, talent supply",
    "What's explicitly out of scope and why"
  ],
  "depends_on": ["problem-definition"],
  "section_research_cluster": "C2"
}
```

Field rules:
- **ord**: insertion order. Drives section order in the final doc. Integer.
- **id**: kebab-case, used in file paths (`drafts/section-<id>.md`).
- **title**: what appears as the H2 heading in the assembled doc.
- **target_words**: section writer aims for ±30% of this. Sized from
  the total-pages → words table above.
- **brief**: self-contained 1-3 sentence description so the writer
  doesn't need to read other sections to know what THIS section is for.
- **key_points**: 3-6 bullets the section MUST cover. Writers will be
  evaluated on hitting these.
- **depends_on**: section IDs that must be drafted FIRST. Use sparingly —
  most sections should be independent so they can run in parallel.
- **section_research_cluster**: (research papers only) the topic-cluster
  id the research-coordinator used; drives which sources go into this
  section's brief.

## Dependencies: keep them rare

Sections SHOULD be parallel-safe. If section 4 needs section 2's
conclusions, capture those conclusions in section 4's `brief` so the
writer has them inline. Don't force the writer to read section 2.

Acceptable dependencies:
- Conclusion section depends on the body sections (so it summarises real
  content rather than the brief). The conclusion runs in a SECOND wave
  after body sections complete.
- A "Methodology" section's results section depends on it. The results
  writer needs to know the method used.

NOT acceptable:
- Section 3 depending on section 2 just because they're adjacent in
  the outline. Capture cross-references in the briefs and run both in
  parallel.

## Worked example 1 — a research paper

**Brief:** "Impact of the 2023-2025 Middle East conflict on European
packaging industry supply chains, 50 pages, evidence-based, with
citations, for board-level audience."

**Pattern:** thematic (aspects of impact cluster by category).

**Outline:**

```json
[
  { "ord": 1, "id": "executive-summary", "title": "Executive summary",
    "target_words": 600, "target_pages": 2,
    "brief": "Three-paragraph overview of headline impacts, key magnitudes, and the strategic implications for European packaging firms. Written LAST after body sections complete (depends_on body).",
    "key_points": ["Headline TEU/cost shifts", "Most-affected packaging segments", "Top-3 strategic responses"],
    "depends_on": ["energy-cost", "shipping-routes", "input-chemicals", "regulatory", "market-shifts", "strategic-response"]
  },
  { "ord": 2, "id": "context",  "title": "The 2023-2025 conflict — context for packaging readers",
    "target_words": 1500, "target_pages": 6,
    "brief": "Frame the conflict's timeline and the supply-chain channels through which it reaches European packaging. Audience knows business, not geopolitics — give them just enough context to follow the rest of the paper.",
    "key_points": ["Timeline of major events 2023-2025", "Channels of impact (energy, shipping, chemicals, demand)", "Geographic scope of effects"],
    "section_research_cluster": "C1"
  },
  { "ord": 3, "id": "energy-cost", "title": "Energy and feedstock cost effects",
    "target_words": 2000, "target_pages": 8,
    "brief": "Quantify the impact on European energy prices and on petrochemical feedstocks (ethylene, polypropylene, polyethylene). Tie to packaging cost-of-goods directly. Include specific TWh / €/MWh / €/tonne movements with dates.",
    "key_points": ["EU natural gas TTF price movements", "Brent + petrochemical feedstock prices", "Effect on resin pricing", "Pass-through to packaging COGS"],
    "section_research_cluster": "C2"
  },
  { "ord": 4, "id": "shipping-routes", "title": "Red Sea / Suez disruption and shipping rerouting",
    "target_words": 2000, "target_pages": 8,
    "brief": "The Bab-el-Mandeb attacks and resulting Cape-of-Good-Hope rerouting added time and cost to Asia→Europe lanes. Quantify the impact on packaging supply chains specifically — which packaging inputs / finished goods flow through this corridor, what the delay + cost-per-TEU surcharges look like, and how that flows into European retailer and brand inventory cycles.",
    "key_points": ["Bab-el-Mandeb incident timeline", "Drewry / WCI rate movements", "Rerouting time/distance impact", "Specific packaging supply chain flows affected"],
    "section_research_cluster": "C3"
  },
  { "ord": 5, "id": "input-chemicals", "title": "Speciality chemicals and additives — second-order impacts",
    "target_words": 1800, "target_pages": 7,
    "brief": "Beyond bulk resins, packaging depends on speciality additives, inks, coatings, and adhesives — many sourced from MENA or via the affected corridors. Map the exposure and quantify second-order impacts.",
    "key_points": ["Categories of packaging additives at risk", "Geographic source concentration", "Substitution options and their cost premium"],
    "section_research_cluster": "C2"
  },
  { "ord": 6, "id": "regulatory", "title": "EU regulatory response — Packaging and Packaging Waste Regulation in a wartime supply context",
    "target_words": 1500, "target_pages": 6,
    "brief": "The PPWR rollout proceeded against a backdrop of supply shocks. Examine how regulators responded, what derogations / phase-in adjustments materialised, and what packaging firms learned about navigating policy under crisis.",
    "key_points": ["PPWR timeline 2023-2025", "Specific derogations / phased adjustments", "ESPR and CBAM interactions", "Compliance cost trajectory"],
    "section_research_cluster": "C4"
  },
  { "ord": 7, "id": "market-shifts", "title": "Demand-side shifts — consumer behaviour, retailer reformulation, downstream margin pressure",
    "target_words": 1800, "target_pages": 7,
    "brief": "How did European retailers and brand owners respond? Trade-down to private label, packaging downsizing, materials substitution. Quantify the demand-side moves and their feed-through to packaging volume + mix.",
    "key_points": ["FMCG private-label share movements", "Pack-size and material trade-downs", "Retailer SKU rationalisation", "Effect on packaging order books"],
    "section_research_cluster": "C5"
  },
  { "ord": 8, "id": "strategic-response", "title": "Strategic responses by European packaging firms",
    "target_words": 1500, "target_pages": 6,
    "brief": "What did the top European packaging firms (Smurfit Kappa, Mondi, DS Smith, Amcor Europe, Sealed Air Europe) actually do? Inventory build, supplier diversification, vertical integration, pricing model changes. Reference specific announcements and reported actions.",
    "key_points": ["Inventory + working-capital responses", "Supplier-base geographic shifts", "Vertical integration moves", "Pricing model evolution"],
    "section_research_cluster": "C6"
  },
  { "ord": 9, "id": "implications", "title": "Implications and outlook 2026-2028",
    "target_words": 1200, "target_pages": 5,
    "brief": "What does all this mean for the European packaging industry's strategic posture going forward? Three scenarios for the next 2-3 years and what each means for capex, M&A, and capability investment.",
    "key_points": ["Scenarios (base / conflict-easing / conflict-escalation)", "Capex implications", "Strategic-resilience playbook"],
    "depends_on": ["energy-cost", "shipping-routes", "input-chemicals", "regulatory", "market-shifts", "strategic-response"]
  }
]
```

**That's 9 sections totalling ~13,900 words ≈ 55 pages.** Body sections 3-8 are
independent and run in parallel (one researcher dispatch per cluster C1-C6,
one section-writer per section). Executive summary + implications run in a
second wave after body completes.

## Worked example 2 — a knowledge handbook

**Brief:** "Comprehensive operational handbook for a 25-person SaaS
support team — intake, triage, escalation, root-cause analysis, customer
communication, knowledge base maintenance. ~40 pages, professional
in-house tone."

**Pattern:** problem-solution (each section solves one operational
problem the team faces).

**Outline:** 7 sections, no research-coordinator needed (handbook content
comes from training data + the user's brief, not fresh research). Each
section runs in parallel under doc-section-writer; no cluster ids on the
sections. Style sheet says "second-person, active voice".

(Same JSON shape as above; abridged for brevity.)

## Anti-patterns

- **One mega-section** ("Everything about X — 12000 words"). Always
  split. Writers truncate or under-deliver on big briefs.
- **Tiny sections** (under 800 words). Stitched output reads as a
  bulleted list, not a document. Merge.
- **Vague briefs** ("write about X"). The writer needs WHAT specifically
  to cover. Always 3-6 key_points.
- **Cross-section dependencies for cosmetic flow.** "Section 4 mentions
  things from section 3." Don't depend on actual content; capture the
  reference inline in 4's brief.
- **Outline written by the section writers**. The outline is the
  orchestrator's job — section writers receive the outline, they don't
  negotiate it.
