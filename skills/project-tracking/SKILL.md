---
name: project-tracking
description: |
  Activate when the user wants to build or extend a project tracker /
  task list / Gantt chart / RAG status report in Excel. Encodes the
  conventions a PMO would recognise: status colour codes, priority
  colour codes, owner / due / dependency columns, milestone markers,
  schedule roll-ups, totals row formulas.
trigger_keywords:
  - project tracker
  - project plan
  - task list
  - gantt
  - schedule
  - milestone
  - RAG
  - status
  - owner
  - due date
  - dependency
  - PMO
  - sprint
  - kanban
  - roadmap
---

# Project tracking

## When to use
- "Build me a project tracker"
- "Add a Gantt chart for this list of tasks"
- "Convert this list into a RAG status report"
- "Update the status of the X task to At Risk"
- "What's overdue?"

## Standard column set (in order)
1. **ID** — short text or number, unique
2. **Task** — one-line action sentence
3. **Owner** — person name (use proper case)
4. **Priority** — High / Medium / Low (colour-coded)
5. **Start Date** — `dd-mmm-yyyy` format (e.g. `07-May-2026`)
6. **Due Date** — same format
7. **% Complete** — percentage, 0–100%
8. **Status** — colour-coded enum (see Status lookup below)
9. **Dependencies** — comma-separated IDs of upstream tasks
10. **Notes** — free text

## Status lookup (5-state)
| Status | Colour | Hex |
|---|---|---|
| ✅ Complete | Blue | `#4F81BD` |
| 🟢 On Track | Green | `#9BBB59` |
| 🟡 At Risk | Amber | `#F79646` |
| 🔴 Behind | Red | `#C0504D` |
| ⬜ Not Started | Grey | `#BFBFBF` |

Apply via excel_run_js with a single loop over the column. Document the lookup at the top of the reply, then apply.

## Priority lookup (3-state)
| Priority | Colour | Hex |
|---|---|---|
| 🔴 High | Light red | `#F2C0C0` |
| 🟡 Medium | Amber | `#FFE5A0` |
| 🟢 Low | Light green | `#D9EAD3` |

## Totals / summary row
Appears at the bottom; bold border above:
- Task count: `=COUNTA(task_column)` (excluding the totals row itself)
- % complete avg: `=AVERAGE(pct_complete_column)`
- Status counts: `=COUNTIF(status_column, "On Track")` etc. — one per status

## Gantt chart pattern
The chart is a date-shaded conditional format on a grid:
- Columns to the right of "Notes": one column per week (or day, depending on duration)
- Header row: dates in `dd-mmm` format, rotated 90° if many columns
- Cell formula for shading: `=AND(col_date>=start_date, col_date<=due_date)` returns TRUE → fill colour matches the row's Status
- Use conditional formatting "Format only cells that contain" → "specific text" or formula

```js
// excel_run_js — apply the Gantt fill rule
const range = sheet.getRange("L2:AZ50");
const cf = range.conditionalFormats.add(Excel.ConditionalFormatType.custom);
cf.custom.rule.formula = "=AND(L$1>=$E2, L$1<=$F2)";
cf.custom.format.fill.color = "#9BBB59"; // status-driven, see lookup
```

For status-driven colour, use multiple conditional formats stacked (one per status) with a formula that combines the date-window check AND the status match.

## Milestone markers
- Add a column "Milestone?" (Y/N)
- For Y rows, render a diamond (`◆`) in the Gantt grid at the start date
- Conditional format: yellow background, bold

## Dependency rendering
- Dependencies column lists comma-separated IDs (`T-001, T-003`)
- For visual: add a column to the right of dependencies showing the latest finish date among them: `=MAX(XLOOKUP(ids, ID column, Due Date column))`
- Highlight rows where Start Date < latest dependency finish (in red — that's a scheduling violation)

## Schedule roll-ups
For projects with phases:
- Phase rows are **subtotal** rows above their child tasks
- Phase Start = `=MIN(child start dates)`
- Phase End = `=MAX(child due dates)`
- Phase % complete = weighted average by duration: `=SUMPRODUCT(child_pcts, child_durations) / SUM(child_durations)`
- Phase Status = the worst child status (Behind > At Risk > Not Started > On Track > Complete)

## Conditional formatting cheat sheet
- Overdue rows: `=AND(due_date<TODAY(), pct_complete<1)` → row fill light red
- High-priority + at-risk: `=AND(priority="High", status="At Risk")` → bold red text
- Completed: `=pct_complete=1` → strikethrough text, grey fill

## Anti-patterns
- DON'T use raw text statuses without colour — the user can't scan a 30-row tracker without colour
- DON'T hardcode dependencies — use IDs so they survive row reordering
- DON'T date-format with `mm/dd/yyyy` — ambiguous with `dd/mm/yyyy`. Always `dd-mmm-yyyy`
- DON'T use percentages without the `%` format — readers assume `0.5` means 50% only with the format applied
- DON'T put the totals row inline with task data — it pollutes filters; always at the bottom with a visible separator

## Citations
- External tasks (e.g. imported from Jira) carry [source: jira:PROJ-123] comments
- See excel-citations.
