---
name: fpa-budgeting
description: |
  Activate for FP&A and budgeting work — annual budgets, monthly /
  quarterly variance analysis, budget-vs-actual roll-ups, headcount
  models, cost categorization, fiscal-year structures, departmental
  P&L roll-ups, KPI dashboards. Encodes how a corporate finance team
  structures a budget book.
trigger_keywords:
  - budget
  - "FP&A"
  - variance
  - actual
  - forecast
  - plan
  - fiscal year
  - Q1
  - Q2
  - monthly
  - quarterly
  - headcount
  - OPEX
  - CAPEX
  - COGS
  - gross margin
  - EBITDA
  - KPI
---

# FP&A & Budgeting

## When to use
- "Build me an annual budget"
- "Add a variance report — actuals vs budget"
- "Roll up these department P&Ls into one summary"
- "Build a headcount model"
- "Forecast Q4 based on Q1-Q3 actuals"

## Period conventions
- Always include a "Period type" header row: `Actual | Actual | … | Forecast | … | Budget | … | YTD | FY`
- Format month columns: `Jan-26, Feb-26, …`
- Quarter columns: `Q1-26, Q2-26, …`
- YTD is always to the LATEST actual month
- FY column = sum of 12 months OR 4 quarters (use a check row)

## Cost categorization
Standard tier hierarchy (rows, top-to-bottom):
1. **Revenue** (with sub-lines per product/segment)
2. **COGS** (direct costs only — materials, direct labour, allocated overhead)
3. **Gross profit** = Revenue − COGS (calculated)
4. **OPEX** broken into:
   - Sales & marketing
   - R&D / Engineering
   - G&A (rent, legal, finance, HR)
5. **EBITDA** = Gross profit − OPEX (calculated)
6. **D&A** (separate line, not in OPEX)
7. **EBIT** = EBITDA − D&A
8. **Interest, tax, other**
9. **Net income**

Each section has a coloured banner row above it (light grey fill).

## Variance analysis pattern
For each line item, three columns side by side:

`Budget | Actual | Variance ($) | Variance (%)`

- Variance ($) = Actual − Budget
- Variance (%) = Variance ($) / Budget
- Conditional format: green if favourable, red if unfavourable
- Favourable for revenue = positive; favourable for cost = negative
- The favourability flip is per-line; encode via a sign column or via the formatting rule

## Budget-vs-actual roll-up
- Each department is a sheet (`Sales`, `Marketing`, `R&D`, `G&A`)
- Summary sheet `=SUM('Sales:G&A'!B5)` — sum across the sheet range
- Always have a check row that ties to the underlying detail
- Department sheets follow the same row order so the SUM range works

## Headcount model
Columns: `Department | Role | Level | Start date | End date | FTE | Salary | Bonus | Benefits | Total cost`
- Salary annualised; multiply by months active in period for monthly cost
- `Months active = MAX(0, MIN(period_end, end_date) - MAX(period_start, start_date))/30`
- Total cost per period feeds into the OPEX line for that department
- Add a column "Open / Filled / Hire-in-month" status

## Forecasting patterns
- **Run-rate forecast:** `=AVERAGE(last_3_months) * remaining_months_in_year`
- **YoY forecast:** `=last_year_period * (1 + growth_assumption)`
- **Linear regression:** `=TREND(actuals_array, period_array, forecast_periods)` — gives a line
- **Seasonal:** decompose to seasonality index × trend; revisit if you see weird Q4 spikes

## KPI rollups
Hero metrics for the summary sheet (all formulas):
- Revenue YoY: `=this_FY_revenue / last_FY_revenue - 1`
- Gross margin %: `=Gross profit / Revenue`
- EBITDA margin %: `=EBITDA / Revenue`
- Burn rate: `=Net loss / months_active` (early-stage)
- Runway: `=cash_balance / monthly_burn`
- Rule of 40: `=Revenue growth + EBITDA margin` (SaaS)
- LTV/CAC ratio (SaaS): `=customer_LTV / blended_CAC`

Each KPI has a card with: label, current value, prior period, delta % (coloured).

## Anti-patterns
- DON'T mix actuals and forecast in the same column without labelling
- DON'T hardcode "Months in period" — use a count of dates
- DON'T forget the FX column for multi-currency budgets — convert at month-end rate, not annual avg
- DON'T sum percentages (margins) across periods — recalculate from the underlying $
- DON'T let department sheets have different row orders than the summary

## Citations
Inputs from external sources (last year's filings, market data, board guidance) get cell comments. See excel-citations.
