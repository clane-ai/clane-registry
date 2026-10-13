---
name: excel-dashboards
description: |
  Activate when the user wants a one-page summary / dashboard / KPI
  scorecard / executive view in Excel. Covers single-page layout
  (5-6 hero KPIs, 2-3 charts, a data table), conditional formatting
  (data bars, colour scales, icon sets), chart styling discipline
  (no chart-junk, consistent colours), small-multiples patterns,
  sparklines.
trigger_keywords:
  - dashboard
  - KPI
  - scorecard
  - executive summary
  - one-pager
  - summary
  - chart
  - sparkline
  - conditional format
  - data bar
  - colour scale
  - icon set
---

# Excel dashboards

## When to use
- "Build me a one-page dashboard"
- "Make a KPI summary on top of this data"
- "Add an executive summary sheet"
- "Visualise this with charts"

## Single-page layout (the standard 3-zone)

```
┌─────────────────────────────────────────────────────────────────┐
│ TITLE BLOCK                                  Date | Filters     │
├─────────────────────────────────────────────────────────────────┤
│ HERO KPI ROW                                                    │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│ │ Revenue│ │ Margin │ │ NRR    │ │ Churn  │ │ NPS    │          │
│ │  $4.2M │ │   62%  │ │  118%  │ │  3.1%  │ │   58   │          │
│ │ +12% ▲ │ │ +2pp ▲ │ │ -3pp ▼ │ │ +0.4 ▼ │ │ +5 ▲   │          │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │
├─────────────────────────────────────────────────────────────────┤
│ CHART ROW (2 charts side by side)                               │
│ ┌────────────────────────┐ ┌────────────────────────┐           │
│ │ Revenue trend          │ │ Customer count         │           │
│ │ [line chart]           │ │ [bar chart]            │           │
│ └────────────────────────┘ └────────────────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│ DATA TABLE (sortable, conditionally formatted)                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Customer | Region | Revenue | Growth | Status               │ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Hero KPI card pattern
Each card occupies a 4-cell wide block:
- Row 1: Label (small, grey, light-weight)
- Row 2: Value (large, bold, currency/percentage as needed)
- Row 3: Delta vs prior period — `+12% ▲` (green) or `-3pp ▼` (red)
- Border the whole card with a thin grey rule
- Background tint white or very light grey to lift it from the page

Apply via excel_run_js with a loop over the KPIs (don't write 5 manual blocks).

## Chart styling discipline
- **Always set chart title** — match the data labels above
- **Remove chart-junk:** no gridlines, no border, no shadow, no rotation
- **Axis labels** — yes, but minimal: only what the reader needs
- **Y-axis** starts at 0 for bar charts; can start at min for line charts (zoom in on trend)
- **Colour palette** — pick 4 colours and reuse: e.g. `#4472C4 (blue), #ED7D31 (orange), #A5A5A5 (grey), #70AD47 (green)`. Don't let Excel auto-pick rainbow.
- **No 3-D charts.** Ever.
- **Single-series charts** can use a single brand colour
- **Multi-series:** colour-blind-safe ordering (blue/orange before red/green)

```js
// excel_run_js — chart styling
const chart = sheet.charts.add("Line", range, "Auto");
chart.title.text = "Revenue trend";
chart.legend.visible = false; // single-series
chart.axes.valueAxis.majorUnit = 1000000;
chart.format.border.color = "#FFFFFF"; // hide border
```

## Conditional formatting palette
- **Data bars** — for ranking columns (top customers, longest deals)
- **Colour scales** — for matrix-style data (cohort retention)
- **Icon sets** — for status indicators (3-arrow, 5-rating)
- **Single-cell rules** — for outliers (`>3*STDEV` etc.)

## Sparklines
For trend-in-a-cell visuals:
- Right of each row's hero metric: a sparkline showing the last 12 periods
- `sheet.sparklineGroups.add(...)` via excel_run_js
- Type: "Line" for trends, "Column" for counts, "Win/Loss" for binary outcomes
- High point markers in green; low point in red

## Filter affordances
- Dashboard reads from a "Data" sheet via XLOOKUP / SUMIFS
- A "Filters" cell (e.g. region selector) drives the KPIs
- Use Excel's data validation (dropdown) to constrain the input
- All KPIs update automatically — never paste-values

## Small-multiples pattern
For comparing many segments:
- Grid of small charts, each showing one segment
- Same axes / scale across all (so they're comparable)
- 4 columns × 3 rows = 12 — covers most segment counts
- Each chart is ~150x100px

## Anti-patterns
- DON'T put more than 6 hero KPIs — at 7+, the reader's eye loses focus
- DON'T mix card styles — pick one and stick with it across the dashboard
- DON'T use 3-D / pie / donut charts (information density is bad)
- DON'T leave Excel default chart titles ("Chart 1") — always rename
- DON'T let charts auto-resize differently — set explicit width/height in run_js
- DON'T forget the date / refresh time in the title block

## Citations
The KPI source (which sheet/range/external) goes in the dashboard footer or as cell comments. See excel-citations.
