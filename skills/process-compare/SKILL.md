---
name: process-compare
version: 0.1.0
description: |
  Compare two processes side-by-side and surface meaningful deltas.
  Used when the user wants to evaluate "current vs proposed",
  "region A vs region B", "this quarter vs last quarter", or any
  paired-process diff. Produces a structured comparison table
  (steps, durations, costs, error rates, pain points) plus a
  short narrative of where they diverge and why it matters.
when_to_use: |
  Activate for any of: "compare these two processes", "what's
  different between X and Y workflow", "current state vs proposed
  state", "before vs after", "region A's process vs region B",
  "this month vs last month", "control group vs treatment group".
  Also fires when the user pastes two process descriptions and
  asks "which is better?" — that's a comparison too.
  Do NOT activate when the user has only ONE process and wants a
  general improvement recommendation — use process-improvement
  hints in the agent's system prompt instead.
inputs:
  - type: process_a
    required: true
    description: First process — can be a description, a CSV of
      steps, an event log slice, or pointers to files
  - type: process_b
    required: true
    description: Second process — same shape as process_a
outputs:
  - type: comparison_table
  - type: delta_narrative
  - type: recommendation
requires_tools:
  - python_exec
  - file_read
category: analysis
tags:
  - process
  - compare
  - delta
  - diff
---

# Process Compare

You compare two processes and produce a structured diff plus a short
narrative on where they meaningfully differ. The user's mental model
is "which one is better, and what would I have to change in the
other to match?" — anchor your output on that question.

## What "compare" means here

Two processes are usually defined by some subset of:

- **Steps**: ordered list of activities. Diff: which steps appear
  in A but not B (and vice versa); which appear in different
  order; which take a different actor.
- **Durations**: time per step, end-to-end cycle time. Diff: which
  steps are faster/slower in one vs the other.
- **Cost**: FTE time × loaded rate, plus system / vendor cost
  per execution. Diff: which legs cost more, where the savings
  hide.
- **Error rate**: percentage of executions that fail or rework.
  Diff: which steps misfire more often.
- **Variants**: how many distinct happy-path-vs-deviation flows
  exist in each process. A process with 30 variants is more
  fragile than one with 3.
- **Bottlenecks**: the longest-duration or highest-queue step.
- **Touchpoints**: where humans hand off (often the source of
  delay and error).

You don't need all of these for every comparison — pick the
dimensions the user provided data for, plus 1–2 derived dimensions
the data supports.

## Workflow

1. **Read both inputs** carefully. If they're files (CSV, Excel,
   process descriptions), `file_read` them. If they're pasted in
   the prompt, parse them inline. If they're event logs, treat
   them as case_id × activity × timestamp tuples.

2. **Normalise to a common shape**. If A is an event log and B is
   a flowchart description, derive the same comparable fields
   from each — even if it means inferring durations from event
   timestamps, or inferring steps from a narrative.

3. **Compute the diff** in `python_exec`. The math is short — you
   want a structured object you can render as a table:
   ```python
   import pandas as pd
   diff = {
     'metric':           ['cycle_time_avg_h', 'fte_hours_per_run', 'error_rate_pct', 'distinct_variants', 'manual_touchpoints'],
     'process_a':        [38.4, 2.7, 12, 18, 5],
     'process_b':        [12.1, 1.8, 4,  6,  2],
     'delta_abs':        [-26.3, -0.9, -8, -12, -3],
     'delta_pct':        [-68, -33, -67, -67, -60],
     'better':           ['B', 'B', 'B', 'B', 'B'],
   }
   pd.DataFrame(diff).to_markdown(index=False)
   ```

4. **Produce the comparison table** — the dataframe above rendered
   as a markdown table is the centerpiece of your reply.

5. **Write the delta narrative** — 4–8 sentences max. Lead with
   the biggest single delta, explain the likely cause (e.g.,
   "Process B drops the manual approval at step 4, which alone
   accounts for 9 hours of the 26-hour cycle-time saving"), and
   close with the dimension where they're most similar (or where
   A wins, if either applies).

6. **Recommendation**. One paragraph: based on the data, which
   should the user pick, and what's the one biggest blocker if
   they want to migrate from A → B (or merge their best parts).

## Output shape

```
## Comparison

| metric              | process A | process B | delta    | better |
|---------------------|----------:|----------:|---------:|:------:|
| cycle_time_avg (h)  |      38.4 |      12.1 |   -26.3  |   B    |
| fte_hours_per_run   |       2.7 |       1.8 |    -0.9  |   B    |
| error_rate (%)      |        12 |         4 |     -8   |   B    |
| variants            |        18 |         6 |    -12   |   B    |
| manual touchpoints  |         5 |         2 |     -3   |   B    |

## Where they diverge

[4-8 sentence narrative anchored on the largest deltas]

## Recommendation

[one paragraph — which to pick, biggest blocker, suggested next step]
```

## Edge cases

- **Sparse data**: if one process has rich data and the other is
  just a description, say so explicitly. Render the table with
  `—` for unknown cells; don't fabricate numbers.
- **Apples-to-oranges**: if A is "annual budget process" and B is
  "weekly expense approval", the comparison is meaningless. Push
  back: "These don't run at the same cadence — comparing them
  directly will mislead. Did you mean…?"
- **Identical processes**: rare but possible if A and B are the
  same process under different names. Surface that fact and
  stop — the user has a naming/data problem, not a process one.

## Don't

- Recommend a third option that's "the best of both" without the
  user asking for it. The brief is a comparison, not a redesign.
- Use vague qualitative language ("A is more efficient") when you
  have numbers. Always cite the metric.
- Skip the recommendation. Even if the answer is "they're equally
  good — pick by team preference", say that explicitly.
