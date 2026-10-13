---
name: section-researching
version: 0.1.0
description: |
  How to research one topic cluster of a long-form work, contribute sources
  to a shared deduplicated ledger, and produce a per-cluster brief that
  section writers consume. Used by the research-coordinator role in the
  book-builders team.
when_to_use: |
  Activate when you are the research-coordinator and you need to gather
  sources for ONE topic cluster of a longer document. Also activate when
  you are a researcher subagent dispatched by the coordinator to handle
  one cluster's research_run + source extraction. Not used in handbook
  / knowledge-doc runs (those skip the research phase entirely).
inputs:
  - type: cluster_question
    required: true
  - type: cluster_id
    required: true
  - type: sections_served
    required: true
outputs:
  - type: cluster_brief_md
  - type: ledger_entries
---

# Section researching

A long-form work needs durable, shared evidence. The research-coordinator's
job is to convert the document's central question into N topic clusters,
dispatch researchers to gather sources for each, then write the cluster's
findings into a brief that section writers consume.

This skill describes BOTH halves of the contract — the coordinator's
decomposition + dispatch, AND the researcher subagent's per-cluster
output shape.

## The coordinator's view: decomposing into clusters

A topic cluster is a research scope that:
- Has ONE concrete research question (not three).
- Maps to 1-3 adjacent sections that share a source base.
- Returns a coherent body of evidence rather than scattered facts.

**Heuristics for clustering:**
- If two sections cite the same likely sources, cluster them together.
- If a section is methodological/structural (intro, conclusion,
  abstract), it probably doesn't need its own cluster — it can lean
  on other clusters' synthesis.
- A 50-page paper typically needs 4-8 clusters, not 50. Don't
  one-cluster-per-section unless sections are genuinely independent.

### Cluster spec

```json
{
  "cluster_id": "C3",
  "question": "How did Red Sea / Bab-el-Mandeb shipping disruption from late 2023 onward affect Asia→Europe container freight costs, transit times, and capacity, and what specific packaging-relevant cargo flows were impacted?",
  "sections": ["shipping-routes"],
  "model": "pro",
  "expected_source_types": ["Drewry/WCI reports", "Lloyd's List", "industry trade press", "shipper announcements", "official EU shipping data"],
  "specific_data_to_capture": ["WCI Asia→N.Europe rate movements with dates", "transit-time deltas via Cape vs Suez", "named incidents with dates", "capacity utilisation %"]
}
```

The `expected_source_types` + `specific_data_to_capture` fields go INTO
the researcher's dispatch prompt — they tighten the search so the
researcher returns concrete numbers, not vibes.

## The researcher's view: per-cluster output shape

A researcher dispatched on a cluster returns TWO artefacts:

### 1. Cluster brief: `.bible/research-briefs/<cluster_id>.md`

Structure:

```markdown
# Cluster C3 — Red Sea shipping disruption impact on Asia→Europe freight

**Cluster question:** How did Red Sea / Bab-el-Mandeb shipping disruption
from late 2023 onward affect Asia→Europe container freight costs,
transit times, and capacity, and what specific packaging-relevant
cargo flows were impacted?

**Sections served:** shipping-routes

## Headline findings

1. Asia→North Europe WCI rate rose from $1,488/40ft (Nov 2023) to
   $5,158/40ft (Feb 2024), a 247% increase, before partially
   normalising through Q3 2024 [12, 14].
2. Transit time via Cape of Good Hope adds 10-14 days vs Suez routing;
   carriers absorbed half the time penalty via faster steaming, the
   rest fell on shipper inventory [17].
3. Major lines (Maersk, MSC, CMA CGM) announced full Red Sea
   diversion within 10 days of December 2023 attacks [13, 15, 18].

## Quantitative evidence

| Metric | Pre-conflict (Sep 2023) | Peak (Feb 2024) | Q3 2024 | Source |
|---|---|---|---|---|
| WCI Asia→N.Europe ($/40ft) | 1,488 | 5,158 | 2,840 | [12] |
| Transit days (Asia→Rotterdam) | 30-33 | 42-46 | 38-42 | [17] |
| Suez transit volume (TEU/month) | 1.6M | 0.6M | 0.9M | [19] |

## Named events and timeline

- 19 November 2023 — first major Galaxy Leader seizure [13]
- 14 December 2023 — Maersk diversion announcement [15]
- ... etc

## Packaging-relevant cargo flows specifically

- Resin pellets (HDPE, PP, LLDPE) from Saudi / UAE petrochem to
  EU converters via Suez: 12-15% of EU resin imports affected [22].
- Speciality additives and inks (originating from Asia, transiting
  Suez): ~40% of EU packaging additive imports affected, with
  Q1 2024 lead-time increases of 4-6 weeks [23].
- Finished flexible packaging from Asian converters (Tetra Pak
  aseptic stock, BOPP films): ~7% of EU consumption, lead-times
  +14 days [25].

## Gaps and caveats

- Drewry data is the standard industry benchmark but is dollar-
  denominated; rates in EUR terms moved less due to FX effects.
- "Packaging-relevant" attribution to specific cargo flows relies
  on industry estimates; no official customs breakdown exists.
- Effects after Q4 2024 are less well-documented at time of writing.

## Sources (assigned [n] indices in the global ledger)

[12] Drewry "World Container Index — Asia to North Europe" weekly
     dataset. Drewry Supply Chain Advisors. https://drewry.co.uk/...
     Accessed 2026-05-20.
[13] Lloyd's List "Houthi attack timeline 2023-2024". 14 Mar 2024.
     https://...
[14] ... etc
```

### 2. Source-ledger entries

Each source gets appended to `.bible/source-ledger.jsonl` as ONE LINE
of JSON (JSONL format = one JSON object per line, no surrounding
array):

```jsonl
{"n":12,"url":"https://drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index","title":"World Container Index — Asia to North Europe","author":"Drewry Supply Chain Advisors","accessed":"2026-05-20","cluster_id":"C3","sections":["shipping-routes"],"snippet":"Weekly composite of 8 major east-west trade-lane rates for 40ft containers..."}
{"n":13,"url":"https://lloydslist.com/...","title":"Houthi attack timeline 2023-2024","author":"Lloyd's List","accessed":"2026-05-20","cluster_id":"C3","sections":["shipping-routes","context"],"snippet":"..."}
```

**Field rules:**
- `n`: assigned by the coordinator at append time. NEVER renumber.
- `url`: deduped on this. If the same URL is found across clusters,
  the coordinator merges into ONE entry whose `cluster_id` becomes
  the first cluster's id and `sections` is a union.
- `accessed`: ISO date the researcher saw it. Bibliography format
  uses this for "Accessed YYYY-MM-DD" trailer.
- `cluster_id` / `sections`: routing metadata. The section writer
  for `shipping-routes` reads ALL entries where `"shipping-routes"
  in sections`.
- `snippet`: first 240 chars of the source — gives section writers
  quick orientation without re-fetching.

## Process: how a researcher actually runs the cluster

1. **Read the cluster spec** from the coordinator's dispatch prompt.
   Sharpen the central research question if it's still vague.

2. **Run `research_run`** with the cluster question. Use model="pro"
   for complex synthesis clusters, "mini" for narrow lookups. Wait
   for the cited result (1-30 min wall-clock).

3. **Extract sources from the result.sources array**. Tavily returns
   `{title, url, snippet}` per source. Map to the ledger schema
   above. Assign provisional indices `[1] [2] ...` LOCAL to this
   cluster; the coordinator reassigns global `n` at merge time.

4. **Write the cluster brief** following the structure above.
   Include named events with dates, quantitative tables where the
   data warrants, and ALL the specific_data_to_capture items from
   the spec.

5. **Flag gaps**. If the research returned thin coverage on any
   specific_data_to_capture item, say so explicitly in the "Gaps
   and caveats" section. Better to flag a gap than to invent.

6. **Return** the brief markdown + the source list to the coordinator.
   The coordinator handles global `n` assignment and merging into
   the ledger.

## Worked example coordinator → researcher dispatch

A research-coordinator handling the Middle East paper would issue
something like this in ONE LLM round:

```
agent_dispatch({
  kind: "role",
  target: "researcher",
  tier: "balanced",
  wait: true,
  max_wait_ms: 3600000,
  prompt: `Research cluster C3 of a long-form paper on the impact
of the 2023-2025 Middle East conflict on European packaging supply
chains.

Cluster question: How did Red Sea / Bab-el-Mandeb shipping
disruption from late 2023 onward affect Asia→Europe container
freight costs, transit times, and capacity, and what specific
packaging-relevant cargo flows were impacted?

Sections this serves: shipping-routes

Specific data to capture (REQUIRED — flag gaps if missing):
- WCI Asia→N.Europe rate movements with dates (monthly or weekly
  resolution preferred)
- Transit-time deltas: Cape-of-Good-Hope route vs Suez route
- Major named carrier diversion announcements with dates
- Suez transit volume changes (TEU/month)
- Identification of packaging-relevant cargo flows affected: resin
  imports from MENA, Asian speciality chemicals via Suez, finished
  Asian packaging imports

Output:
1. A cluster brief in the standard book-builders structure (see
   section-researching skill).
2. A list of sources in the source-ledger JSONL shape (you assign
   provisional indices; the coordinator will reassign at merge
   time).

Use the research_run tool — research_run will spawn a sandbox-side
polling loop and wait for the upstream result. Allow up to 30
minutes wall-clock.`
})
```

Eight clusters like this go out in ONE LLM response (8 parallel
`agent_dispatch` calls). Coordinator waits for all to return,
merges into the ledger, hands the ledger path + section→[n]
mapping back to the orchestrator.

## Anti-patterns

- **One researcher per section.** Often over-fragments — adjacent
  sections share sources. Cluster first.
- **Vague cluster question.** "Research X" — too broad. Always a
  specific question with named entities + time window.
- **Dispatching researchers sequentially.** Always batch into one
  LLM round so they run in parallel.
- **Renumbering [n] after assignment.** Section writers cite by
  index; renumbering breaks every citation. Append-only.
- **Pre-filtering sources for "relevance"** at the coordinator
  level. Keep everything; writers filter at citation time.
- **Researcher writing prose for the section.** The researcher
  returns a BRIEF — bullet-style findings + a quantitative table
  + sources. The section writer writes the actual prose.
