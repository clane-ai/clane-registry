---
name: roi-ranker
version: 0.1.0
description: |
  Rank a list of automation opportunities by ROI and surface the
  top candidates with payback period. Inputs a portfolio of
  candidate processes; outputs a ranked table (annual savings,
  build cost, payback months, confidence) plus a one-paragraph
  prioritisation narrative. Pairs with cost-model — that skill
  costs ONE process; this one ranks MANY.
when_to_use: |
  Activate for: "which of these should we automate first", "rank
  these by ROI", "what's the highest-impact automation", "build
  me an automation roadmap", "which processes have the best
  payback". Also: when the user lists 3+ candidate processes and
  asks for a recommendation — that's a ranking question.
  Do NOT activate for a single-process ROI estimate — use
  cost-model for that.
inputs:
  - type: opportunity_list
    required: true
    description: 2+ candidate processes with enough detail to
      apply the cost-model — minimally name + volume + duration
      + manual touchpoint count
  - type: build_cost_estimates
    required: false
    description: One-off automation cost per opportunity. Defaults
      to size-tiered baselines if absent (small £50k / medium £150k
      / large £400k).
outputs:
  - type: ranked_table
  - type: prioritisation_narrative
  - type: assumption_log
requires_tools:
  - python_exec
category: analysis
tags:
  - process
  - roi
  - rank
  - automation
  - portfolio
---

# ROI Ranker

You rank a portfolio of automation opportunities and produce an
ordered shortlist with payback periods. Use cost-model's per-
process math under the hood; this skill is the wrapper that
applies it across N candidates and orders them.

## Method

For each opportunity, compute:

- `annual_savings_£` — current_cost − automated_cost (per the
  cost-model formula).
- `build_cost_£` — one-off automation cost. Use the user's number
  if given. Otherwise size-tier:
  - **Small** (single workflow, ≤3 systems, no human-in-the-loop): £50k
  - **Medium** (multi-step, 3-5 systems, some HITL): £150k
  - **Large** (cross-functional, ≥5 systems, complex exceptions): £400k
- `payback_months` = build_cost / annual_savings × 12.
- `confidence` — same {D, B, G} tagging as cost-model. A
  portfolio of opportunities usually has mixed confidence;
  surface that.

Rank by **payback_months ascending** (faster payback = top).
Tiebreak on `annual_savings_£` descending.

## Workflow

1. **Parse the opportunity list.** Each entry needs at minimum
   name + volume + minutes-per-run + touchpoint count. Anything
   missing → infer with industry baselines + log the assumption.

2. **Compute per-opportunity cost** using the cost-model formula.
   Run all the math in `python_exec`:

   ```python
   import pandas as pd
   ops = [
     dict(name='Invoice approval',          v=10400, fte_m=22, touch=4, build=150_000),
     dict(name='Onboarding paperwork',      v=2_080, fte_m=85, touch=7, build=400_000),
     dict(name='Expense classification',    v=52_000, fte_m=4, touch=1, build=50_000),
     dict(name='Vendor master data update', v=  520, fte_m=35, touch=5, build=150_000),
   ]
   rate = 55                # £/hr
   def compute(o):
     curr = o['v'] * o['fte_m']/60 * rate
     red = 0.15 if o['touch'] <= 2 else 0.10  # naive: more touchpoints, less reduction
     auto = curr * red
     savings = curr - auto
     payback = (o['build'] / savings * 12) if savings > 0 else None
     return dict(name=o['name'], current=curr, automated=auto, savings=savings,
                 build=o['build'], payback_m=payback)
   df = pd.DataFrame([compute(o) for o in ops]).sort_values('payback_m')
   ```

3. **Render the ranked table** (top 5–10 rows; if more, group
   the tail under "Below the cut"):

   ```
   | rank | opportunity                | annual £   | annual saving £ | build £   | payback (mo) | conf |
   |-----:|----------------------------|-----------:|----------------:|----------:|-------------:|:----:|
   |   1  | Expense classification     |  190,400   |        161,840  |   50,000  |          3.7 | DDB  |
   |   2  | Invoice approval           |  209,733   |        188,760  |  150,000  |          9.5 | DDB  |
   |   3  | Onboarding paperwork       |  162,067   |        137,757  |  400,000  |         34.8 | DBB  |
   |   4  | Vendor master data update  |   16,683   |         15,015  |  150,000  |        119.9 | DBG  |
   ```

4. **Write the prioritisation narrative** — 5–8 sentences. Lead
   with the top pick and why. Call out the second pick if its
   payback is meaningfully different. Flag any opportunity below
   the "12-month payback" line as a "consider later" item with a
   reason. End with the elephant if there is one (e.g., "Vendor
   master data is a bad ROI candidate but a real risk reducer —
   consider it for compliance reasons not savings").

5. **Assumption log** — same shape as cost-model, applied across
   the portfolio. Highlight the ones that affect ranking (e.g.,
   "We assumed onboarding paperwork has 7 touchpoints; if it's
   really 4, payback drops to ~22 months and it overtakes vendor
   master data").

## Output shape

```
## Recommended automation order

[ranked table — top N rows]

## Why this order

[5–8 sentences anchored on payback period; flag any "consider
later" candidates]

## Assumptions

- Loaded rate: £55/hr (UK knowledge worker baseline)
- Build costs: size-tiered defaults except Invoice approval
  (user-supplied)
- Touchpoint reduction: 85-90% (industry baseline for RPA)
- ...
```

## Don't

- Lump opportunities into a single "automation programme" cost.
  Each line item gets its own build cost; the user might pick
  the top 2 and skip the rest.
- Ignore confidence. A high-savings, high-confidence (DDD)
  opportunity outranks a higher-savings, all-baseline (BBB)
  opportunity for prioritisation purposes — flag this.
- Skip the narrative. The table is the data; the narrative is
  the recommendation. Both are required.
- Recommend the top of the list blindly. If the top opportunity
  has all-baseline confidence and the #2 has user data, say so.
