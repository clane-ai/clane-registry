---
name: inline-chart
version: 0.2.0
description: Render data charts (bar, line, area, pie/donut, scatter, heatmap) INLINE in the chat reply via a ```chart fence — no saved image file.
when_to_use: |
  Activate whenever the user wants to SEE a chart in the conversation — "how is the team performing", "show the breakdown", "chart this", "plot the trend". Emit a ```chart fence and the UI renders it inline (themed, hover tooltips, a "See data" table, Copy / Download / Expand). Do NOT save a matplotlib PNG for this — that clutters the Files panel with a flat image. Only produce an image FILE when the user explicitly wants a downloadable asset ("a PNG for the deck") or the chart must live inside a generated .xlsx / .pptx / .docx.
inputs:
  - type: dataset
    required: true
outputs:
  - type: chart_block
category: visualization
tags:
  - design
  - visualization
  - data
---

# Inline chart

You render charts directly in the chat reply by emitting a fenced ` ```chart ` block. The block carries a small JSON **envelope**; the platform validates it, applies the house theme, and renders it with Vega-Lite. No tool call, no file — just the fence in your prose.

## The envelope

````
```chart
{
  "v": 1,
  "engine": "vega-lite",
  "title": "Revenue vs profit - last 6 months",
  "data": [
    { "month": "Jan", "metric": "Revenue", "value": 120 },
    { "month": "Jan", "metric": "Profit",  "value": 38 }
  ],
  "spec": {
    "mark": "bar",
    "encoding": {
      "x": { "field": "month", "type": "nominal" },
      "xOffset": { "field": "metric" },
      "y": { "field": "value", "type": "quantitative" },
      "color": { "field": "metric", "type": "nominal" }
    }
  }
}
```
````

| Field | Meaning |
|---|---|
| `v` | Envelope version — always `1`. |
| `engine` | `"vega-lite"` (the only engine today). |
| `title` | Shown in the chart's header. |
| `data` | Array of row objects. Feeds BOTH the chart and the "See data" table — the single source of truth. |
| `query` | OPTIONAL provenance. The Cube (semantic-layer) query — or SQL string — you ran to produce `data`. Shown read-only behind a "Peek" button in the chart's Expand view so the reader can verify where the numbers came from. Never executed by the UI. |
| `spec` | A Vega-Lite spec that references fields by name. **Omit its own `data` block** — the platform injects `data` for you. |

## Rules

- **Put the rows in `data`, not in `spec.data`.** The platform injects them.
- **When the rows came from a Cube query (or SQL), include it as `query`.** It powers the Peek provenance modal; an object pretty-prints, a string passes through verbatim. Omit the field when the data didn't come from a query.
- **Don't set colours, fonts, gridlines, radii, or tooltips.** The house theme handles all styling and adapts to light/dark. Just add a `color` encoding when a category should split the series; the palette is automatic.
- **Pies/donuts**: use `"mark": "arc"` with a `theta` encoding. The platform turns it into a donut and adds % labels automatically — you don't layer anything.
- **Hover tooltips** are on for every chart type automatically.
- **NEVER put a remote `url` in the spec.** Only inline `data` renders (any `url` is stripped for safety).

## Choosing a mark

| Ask | `mark` |
|---|---|
| Compare categories | `bar` |
| Trend over time | `line` (points are added automatically) |
| Cumulative / volume over time | `area` |
| Share of a whole | `arc` (donut + % labels) |
| Correlation | `point` |
| Matrix / density | `rect` (heatmap) |

## Inline chart vs image file vs interactive artifact

- **`inline-chart` (this skill)** — a chart the user wants to glance at in the reply. Default for "show me / how is / chart this".
- **matplotlib PNG via python_exec** — only when the user wants a downloadable image file, or the chart goes inside a generated Office doc.
- **`interactive-component` skill** — when the user needs a genuinely interactive / stateful dashboard (filters, inputs), not just a static chart.
