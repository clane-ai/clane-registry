---
name: financial-modeling
description: |
  Activate when building or extending finance models in Excel — DCF,
  three-statement (P&L / BS / CF), NPV/IRR, sensitivity tables,
  scenario analysis, comparable-company tables, cap tables. Encodes
  the conventions a finance analyst would expect: section banding,
  formula-only cells, blue inputs / black calcs / green links,
  per-period columns, and audit-friendly structure.
trigger_keywords:
  - DCF
  - valuation
  - NPV
  - IRR
  - three-statement
  - "P&L"
  - balance sheet
  - cash flow
  - model
  - forecast
  - sensitivity
  - scenario
  - WACC
  - terminal value
  - cap table
  - comps
  - EBITDA
  - free cash flow
---

# Financial modeling

## When to use
- "Build me a DCF / NPV / IRR / valuation model"
- "Extend this model out two more years"
- "Add a sensitivity on growth × terminal multiple"
- "Reconcile the three statements"
- "Build a comparable-companies table"
- "Capture the cap table after this funding round"

## Section conventions
Every analyst-grade model has the same vertical layout:

  1. **Title block** — model name, version, as-of date, currency, units
  2. **Inputs** — assumptions in BLUE; never hardcoded inside formulas
  3. **Drivers** — derived quantities used in multiple sections (BLACK)
  4. **Outputs** — P&L → BS → CF, in that order; per-period columns
  5. **Summary / KPIs** — one-page deck-ready output (GREEN cross-links)
  6. **Sources sheet** — every external citation with date + URL/file

## Cell colour discipline
- **Blue (#0070C0)** — input cells (the user can change these)
- **Black** — calculated cells
- **Green (#006100)** — links to other sheets
- **Red (#9C0006)** — error/check rows (e.g. BS doesn't balance)
- Apply via excel_run_js using a lookup loop, never per-cell

## Number formatting
- Currency: `"$"#,##0;[Red]("$"#,##0);"-"` — negatives in red parens
- Percent: `0.0%;[Red](0.0%)`
- Multiples: `0.0"x"` for valuation multiples (EV/EBITDA, P/E)
- Always thousands-separators; never raw integers

## DCF skeleton
```
Year                    Y0    Y1    Y2    Y3    Y4    Y5    Terminal
Revenue                 input grow  grow  grow  grow  grow
EBIT                    =Revenue * EBIT margin
Tax                     =EBIT * tax_rate
NOPAT                   =EBIT - Tax
+D&A                    =Revenue * da_pct
-CapEx                  =Revenue * capex_pct
-Δ NWC                  =Δ(NWC_pct * Revenue)
FCF                     =NOPAT + D&A - CapEx - Δ NWC
Discount factor         =1/(1+WACC)^year
PV(FCF)                 =FCF * discount factor
Terminal value          =FCF_terminal * (1+g) / (WACC - g)
PV(TV)                  =TV * discount factor_terminal
EV                      =SUM(PV(FCF)) + PV(TV)
- Net debt              input
Equity value            =EV - Net debt
÷ Shares outstanding    input
Implied price/share     =Equity / Shares
```

## Three-statement linkage rules
- Net income (P&L) → Retained earnings (BS) AND start of CF
- Δ Cash (CF) → Cash line on BS
- BS check row: `=Total assets - (Total liab + Total equity)` should always be 0
- D&A appears in P&L (expense) AND CF (add-back, positive)
- CapEx is a CF line; PP&E gross on BS goes up by CapEx, down by accumulated depreciation
- Working capital changes flow CF only — no double-count in P&L
- Interest expense (P&L) ties to debt balance (BS) × cost of debt
- Always include a "BS balances?" check row in red — if non-zero, model is broken

## Sensitivity table pattern
Use Excel's two-input data table feature via excel_run_js:

```js
sheet.getRange("D10:H15").dataTable({
  rowInput: "Growth",
  columnInput: "WACC",
});
```

- Always label both axes
- Always put the base case (current cell value) at the centre cell
- Border the centre cell so the reader can find it
- Conditional-format with a 3-colour scale (green high, red low)

## Scenario analysis pattern
- Inputs sheet has a "Scenario" cell with a CHOOSE / INDEX driver
- Each scenario column lives in a flat block: Bull / Base / Bear
- Switching scenarios is a single cell change → entire model updates
- Document the scenario assumptions in plain English under the inputs

## Comparable-company table conventions
Columns (left to right):
- Ticker | Company | Region | Sector | Market cap | EV | Revenue | Revenue growth | EBITDA | EBITDA margin | EV/Revenue | EV/EBITDA | P/E | Source
The "Source" column carries the [source: ...] tag. The mean / median / 75th / 25th rows go at the bottom in bold.

## Cap table conventions
- Pre-money / Post-money / New money / Implied price-per-share / Dilution
- Each round is a column; share classes are rows
- Diluted share count includes options + warrants + convertibles (assume converted)
- Total ownership column on the right with `=THIS_ROW / SUM_TOTAL_ROW`
- Highlight the new investor's row in bold

## Anti-patterns (DON'T do these)
- DON'T hardcode numbers inside formulas (`=Revenue * 0.25` — use `=Revenue * tax_rate` and put `tax_rate` in inputs)
- DON'T mix units in one column (revenue $M and headcount # — separate sections)
- DON'T leave a row labelled "check" red and uncalculated — define what it checks
- DON'T forecast growth past Y5 without a terminal value (model breaks)
- DON'T compute terminal value with a multiple AND a perpetuity in the same model — pick one and document why
- DON'T use VLOOKUP — XLOOKUP / INDEX-MATCH only (VLOOKUP breaks on column inserts)
- DON'T leave the discount factor as a hardcoded value — `=1/(1+WACC)^year`
- DON'T forget the Sources sheet — every external number needs an entry

## Common formulas to reach for
- `=NPV(rate, cash_flows)` — simple NPV from a flat array
- `=IRR(cash_flows)` — single-rate IRR (assumes equal periods)
- `=XIRR(cash_flows, dates)` — IRR with irregular dates
- `=XNPV(rate, cash_flows, dates)` — NPV with irregular dates
- `=PV(rate, nper, pmt, [fv])` — present value of an annuity
- `=FV(rate, nper, pmt, [pv])` — future value
- `=PMT(rate, nper, pv)` — periodic payment

## Citations
Every input that came from outside the workbook gets a cell comment:
`[source: web:https://10kfilings.com/foo]`, `[source: pdf:annual-2025.pdf:p23]`, etc. See the excel-citations skill.
