---
name: data-analysis-excel
description: |
  Activate for analytical workflows in Excel — pivot tables, statistical
  summaries, cohort analysis, time-series, lookups, deduping, normalising
  messy data. Covers the common patterns a data analyst reaches for when
  the data is small/medium and Excel is the right tool.
trigger_keywords:
  - pivot
  - pivottable
  - cohort
  - retention
  - statistics
  - correlation
  - regression
  - time series
  - rolling average
  - year over year
  - lookup
  - vlookup
  - xlookup
  - dedupe
  - deduplicate
  - normalize
  - filter
---

# Data analysis in Excel

## When to use
- "Pivot this raw data by region and quarter"
- "What's the correlation between X and Y in this table?"
- "Build a cohort retention curve"
- "Add a 30-day rolling average"
- "Dedupe this list and count occurrences"
- "Normalise this messy date column"

## CRITICAL: Large data files use DuckDB, NOT in-memory pandas

When the user uploads a tabular file >5MB OR with >10K rows AND asks
analytical questions, DO NOT load the whole thing into memory via
`pd.read_excel`/`pd.read_csv`. That route blows out your context
budget within 2 turns. Instead, use the deferred DB tools:

1. First time only — call `tool_search('database')` to surface
   `db_load` and `db_query`. They're not in your default toolbelt
   because most tasks don't need them; you have to ask for them.
2. `db_load({source_path: 'sales-q3.xlsx'})` — ingests every sheet
   into a DuckDB scratch DB at `.cache/data.duckdb` (one-time cost,
   ~10-30s for a 500MB file). Returns the inferred schema.
3. `db_query({sql: "SELECT region, SUM(revenue) FROM sales GROUP BY region"})`
   — runs the query, returns ONLY the result set (≤100 rows by
   default). The underlying data never enters your context.
4. Subsequent turns — the DuckDB file persists in `.cache/`.
   Re-issue `db_query` directly; you don't need to reload.

**Why this matters:** a 500MB Excel = ~50M cells. Loading it into
your context via pandas would burn millions of tokens for one
turn, then you'd lose it on the next turn anyway. DuckDB lets you
inspect the file ONCE and ask many questions cheaply.

**Threshold heuristic:**
- File <5MB AND <10K rows total → use pandas/openpyxl in-process,
  it's fine.
- File >5MB OR any single sheet >10K rows → switch to DuckDB.
- Unsure → DuckDB. False-positive cost is one extra file write;
  false-negative cost is a context blowout that crashes the turn.

**Working memory under `.cache/`:** the `.cache/` folder inside
the conversation files is YOUR scratchpad. The user doesn't see
it in their Files panel. Beyond `data.duckdb`, stash:
- `.cache/notes.md` — durable findings the agent needs across
  turns ("the 'CustomerID' column is actually the Stripe customer
  id, not a UUID — confirmed with user 2 turns ago")
- `.cache/schema.json` — the table layouts the agent inferred,
  so subsequent turns don't have to re-introspect
- `.cache/queries.sql` — frequently-reused SQL the agent has
  already validated

Read these via `file_read` / `file_grep` next turn instead of
trying to recall. Same pattern Claude Code uses to handle huge
codebases — explore on demand, persist findings, never load
everything.

**Use `think` between phases** for multi-step analysis. After
db_load returns the schema, call `think({thought: "Schema shows X
tables; user asked about Y; my plan is Z. Order of queries:
..."})` BEFORE issuing queries. The trace becomes readable, AND
the agent makes ~50% fewer wrong-direction tool calls.

## Pivot table conventions
Always use Excel's native pivot table — never recreate by hand with SUMIFS.

```js
// excel_run_js — create a pivot table
const ws = context.workbook.worksheets.getItem("Data");
const src = ws.getRange("A1").getSurroundingRegion();
const dst = ws.getRange("F1");
const pt = context.workbook.pivotTables.add("Sales pivot", src, dst);
pt.rowHierarchies.add(pt.hierarchies.getItem("Region"));
pt.columnHierarchies.add(pt.hierarchies.getItem("Quarter"));
pt.dataHierarchies.add(pt.hierarchies.getItem("Revenue"));
```

- Always name the pivot (so you can reference / refresh it later)
- Add subtotals at the row dimension level
- Number-format the values column (currency, %, etc.)
- Sort rows by the data column descending unless the user said otherwise

## Lookup patterns
**Always XLOOKUP, never VLOOKUP.** XLOOKUP survives column inserts.

```
=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])
```

- match_mode: 0 (exact, default), -1 (next smaller), 1 (next larger), 2 (wildcard)
- For multi-key lookup: concatenate keys with a delimiter
  `=XLOOKUP(A2&"|"&B2, key_col1&"|"&key_col2, return_col)`
- For two-way lookup (row + column): `INDEX(matrix, XMATCH(row_key, row_keys), XMATCH(col_key, col_keys))`

## Statistical functions
- `=AVERAGE(range)` — mean
- `=MEDIAN(range)` — median (resistant to outliers)
- `=STDEV.S(range)` — sample standard deviation
- `=PERCENTILE.INC(range, k)` — k=0.25 / 0.5 / 0.75 for quartiles
- `=CORREL(x_range, y_range)` — Pearson correlation
- `=SLOPE(y_range, x_range)`, `=INTERCEPT(y_range, x_range)` — simple linear regression
- `=RSQ(y_range, x_range)` — R² (goodness of fit)
- `=COUNTIF(range, criteria)` / `=COUNTIFS(range, c, range2, c2)` — conditional counts
- `=SUMIFS(sum_range, c_range, c, c_range2, c2)` — conditional sum

## Cohort analysis pattern
Layout: rows = cohort start month; columns = months since start; values = retention %

```
                    M0     M1     M2     M3     M4
Jan-26 cohort       100%   72%    61%    55%    51%
Feb-26 cohort       100%   75%    63%    57%    -
Mar-26 cohort       100%   71%    60%    -      -
```

- Diagonal of NaN (or "-") for cohorts that haven't aged that far yet
- Conditional format with a colour scale (green high, red low)
- Add a "Avg retention by month" row at the bottom (= AVERAGE of column, ignoring blanks)

## Time-series patterns
- **30-day rolling average:** `=AVERAGE(OFFSET(this_cell, -29, 0, 30, 1))`
  Or with structured table refs: `=AVERAGEIFS(value, date, ">="&this_date-29, date, "<="&this_date)`
- **YoY change:** `=this_period / last_year_same_period - 1`
- **MoM change:** `=this_month / prev_month - 1`
- **CAGR:** `=(end_value / start_value)^(1/years) - 1`
- **Trailing 12 months:** `=SUMIFS(value, date, ">="&this_date-365, date, "<="&this_date)`

## Dedupe + count occurrences
Use Excel's `UNIQUE` + `COUNTIF`:

```
Name (col A)        Unique (col D)              Count (col E)
Alice               =UNIQUE(A2:A100)            =COUNTIF(A:A, D2)
Bob                 (D auto-spills)             (drag down)
Alice               
```

- For multi-column dedupe: `=UNIQUE(A2:B100)`
- For case-sensitive dedupe: `=UNIQUE(EXACT-comparison wrapper)` — usually overkill

## Normalising messy data
- **Dates as text:** `=DATEVALUE(text_cell)` to convert; format the result
- **Mixed-case names:** `=PROPER(text)` for Title Case, `=LOWER(text)`, `=UPPER(text)`
- **Trim whitespace:** `=TRIM(text)`
- **Remove non-numeric:** `=VALUE(SUBSTITUTE(SUBSTITUTE(text,"$",""),",",""))` — chain SUBSTITUTEs for known noise
- **Split a column:** Excel's "Text to columns" via excel_run_js or `TEXTSPLIT(text, delimiter)` (newer)
- **Combine columns:** `=A2 & " " & B2` or `TEXTJOIN(" ", TRUE, range)`

## Filter / sort patterns
- `FILTER(array, condition)` returns rows matching a boolean expression: `=FILTER(A2:D100, B2:B100>1000)`
- `SORT(array, [col], [order])` returns the array sorted: `=SORT(A2:D100, 3, -1)` for col 3 desc
- `SORTBY(array, by_array, [order])` sort one array using another's order

## Anti-patterns
- DON'T use VLOOKUP (column-insert fragile, slow on big sheets)
- DON'T paste values when a formula would track changes
- DON'T put formulas inside data ranges meant for pivots — pivots stop working
- DON'T calculate quartiles / percentiles by hand — use PERCENTILE.INC
- DON'T forget to handle empty cells in COUNTIF (use COUNTA for "is anything there")

## Citations
External datasets (CSVs from public sources, web data, customer DBs) carry [source: …] cell comments on the top-left anchor of the imported range. See excel-citations.
