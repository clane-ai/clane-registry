---
name: cost-model
version: 0.1.0
description: |
  Estimate the cost of a process and the savings of automating it.
  Standard model: FTE time × loaded rate + system cost + error rate
  × cost-of-error. Outputs current-state cost, automated-state
  cost, payback period, and the assumptions list. Numbers come
  with explicit confidence levels — no false precision.
when_to_use: |
  Activate for: "what does this process cost", "how much would we
  save by automating this", "what's the ROI of automating X",
  "estimate the FTE hours we'd recover", "what's the payback
  period". Also: when a recommendation skill produces an option
  ranked by ROI, this skill computes the underlying numbers.
  Do NOT activate when the user already has a costed business
  case — they don't need the model recomputed.
inputs:
  - type: process_description
    required: true
  - type: volume_and_duration
    required: false
    description: Runs per period + minutes per run. Defaulted to
      industry baselines if absent (with a note saying so).
  - type: loaded_rate
    required: false
    description: Cost per FTE-hour fully loaded. Defaults to
      $75/hr (UK/IE knowledge worker baseline) when absent.
outputs:
  - type: cost_table
  - type: savings_summary
  - type: assumption_log
requires_tools:
  - python_exec
category: analysis
tags:
  - process
  - cost
  - roi
  - savings
  - automation
---

# Cost Model

You estimate process cost and automation savings using a standard
five-factor model. The output is a cost table + a one-paragraph
savings summary + an explicit list of assumptions. The assumption
list is mandatory — the user needs to know which numbers are
data-driven and which are baselines.

## The model

Annual cost of running a process =
```
volume_per_year
  × ( fte_minutes_per_run / 60 × loaded_hourly_rate
    + system_cost_per_run
    + error_rate × cost_of_error )
+ fixed_annual_overhead
```

Five inputs:

1. **volume_per_year** — runs per year. Get from event-log row
   count (extrapolated), the user's stated estimate, or the
   description ("we do this weekly per branch, 200 branches" =
   10,400/year).

2. **fte_minutes_per_run** — minutes of human time per execution.
   Sum across all manual touchpoints. Includes wait/handoff
   time only when the human is blocked (a sign-off doesn't count
   if they sign off async).

3. **loaded_hourly_rate** — fully-loaded cost per FTE-hour.
   Defaults: $75 (US knowledge worker), £55 (UK), €60 (EU). If
   the user doesn't say, pick by geography clue and note the
   default in the assumption log.

4. **system_cost_per_run** — vendor / API / infra cost per
   execution. Often $0 for internal processes; non-zero for
   processes that consume paid APIs (Salesforce ops, OCR per
   document, AI calls).

5. **error_rate × cost_of_error** — failure rate (e.g., 8% of
   invoices need rework) times the average cost of fixing one
   (often = full re-run cost, sometimes more if it triggers
   downstream rework).

Plus **fixed_annual_overhead** — sunk costs that don't scale with
volume: license fees, SaaS seats, training. Most processes have
zero here.

## Automation savings model

For automated state, recompute with:
- `fte_minutes_per_run` reduced by the proportion of touchpoints
  the automation removes (often 70–95%, never 100% unless the
  user has data showing zero human touch).
- `system_cost_per_run` increased by the per-run cost of the
  automation (RPA bot license/run, agent token cost, integration
  fees).
- `error_rate` adjusted — usually drops, but not to zero. Bots
  fail on edge cases; agents hallucinate. Industry baseline:
  RPA reduces error rate by 60-80%; LLM agents 40-70% (more
  variance).
- `volume_per_year` unchanged unless the user says automation
  unlocks higher throughput.

Savings = current_annual_cost − automated_annual_cost.
Payback = automation_one_off_cost ÷ annual_savings.

## Workflow

1. **Extract the five inputs** from the process description.
   Anything missing → use a baseline AND log the assumption.

2. **Compute current-state cost** in `python_exec`:
   ```python
   v = 10_400          # runs/year
   fte_m = 22          # minutes/run
   rate = 55           # £/hr
   sys = 0
   err_rate = 0.08
   err_cost = 25       # £ per error
   fixed = 0
   per_run = fte_m/60 * rate + sys + err_rate * err_cost
   annual = v * per_run + fixed
   print(f"per_run = £{per_run:.2f}, annual = £{annual:,.0f}")
   ```

3. **Compute automated-state cost** with the adjustments above.

4. **Render the cost table**:
   ```
   | factor              | current      | automated   | delta       |
   |---------------------|-------------:|------------:|------------:|
   | volume / year       | 10,400       | 10,400      | —           |
   | fte minutes / run   | 22           | 3 (−86%)    | −19 min     |
   | loaded rate / hr    | £55          | £55         | —           |
   | system cost / run   | £0           | £0.40       | +£0.40      |
   | error rate          | 8%           | 2.5%        | −5.5pp      |
   | cost / run          | £22.17       | £3.66       | −£18.51     |
   | annual cost         | £230,568     | £38,064     | −£192,504   |
   ```

5. **Write the savings summary** — one paragraph. Lead with the
   annual savings number; include payback period if you can
   estimate the automation's one-off build cost (otherwise say
   "payback depends on build cost — at £100k it's 6 months,
   at £400k it's 25 months").

6. **List assumptions explicitly**:
   ```
   ## Assumptions
   - **volume**: 10,400/year (extracted from "weekly × 200 branches")
   - **loaded rate**: £55/hr (UK knowledge-worker baseline; user
     didn't specify)
   - **automation removes 86% of touchpoints**: industry baseline
     for invoice processing; user data could refine
   - **error rate post-automation**: 2.5% (industry baseline for
     OCR + rule-based extraction; LLM agents would change this)
   - **automation per-run cost**: £0.40 (estimate for OCR + 1
     LLM call per run; substitute your actual costs)
   ```

## Confidence

Tag every estimate as one of:
- **D** — driven by user data
- **B** — industry baseline (not user-specific)
- **G** — agent guess (rare; only when no baseline applies)

The cost table caption should say "Confidence: 4D 1B" so the
user sees at a glance how much is data-driven.

## Don't

- Quote a single point estimate without a range. Annual savings
  of "£192,504" is false precision; "£180-205k" is honest.
- Skip the assumption list. It's the most-read part of the
  output for a finance reader.
- Roll automation cost in as zero. Even a "free" agent has token
  cost; even an RPA bot has license cost.
- Use US dollars by default. Detect geography from the prompt;
  default to local currency.
