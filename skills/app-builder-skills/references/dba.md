# Data hat — the app's data model

Every app/report has ONE data store: its **own Postgres schema** on the app-data
plane (`app_<id>`). There is **no SQLite**. You design the **data model first**,
then build the UI on top of it — that is the framework's core rule.

## Two phases: Draft (cheap) then Build (materialise)

You iterate in a **draft** that touches no database, and create the real Postgres
tables only when the design is confirmed. This matters because every change while
exploring the idea may reshape the schema — you don't want a DB migration per edit.

- **Draft** — the data model + a small sample live in `_app/datamodel.json`. No
  Postgres yet. Reshape it freely; it's a versioned file in `_app/`, so it survives
  refresh and rolls back with the app's History (the data model and the UI roll back
  *together*). The preview renders from the sample.
- **Build / Confirm** — when the design is ready, the selected tables are copied in
  full (up to 1000 rows) into the app's Postgres schema. The same report then runs
  on real data, unchanged.

## Connect external data (the report path)

A report is built on data **copied** from a business database (a DataConnection).
**Connecting copies the data in — it never queries the live source at run time.**

1. The user connects a source + picks tables in the **Data tab**. The platform
   samples them into `_app/datamodel.json`:
   ```json
   { "v": 1, "connection": { "name": "BO-DataBase" },
     "tables": [
       { "name": "vw_boibocons",
         "source": { "schema": "hcl", "table": "vw_boibocons" },
         "columns": [ {"name":"region","type":"text"},
                      {"name":"processed_volumes","type":"numeric"} ],
         "sample": [ {"region":"ROI","processed_volumes":120}, "… ~50 rows" ],
         "truncated": true } ] }
   ```
2. **Read `datamodel.json` first** (it's in the app's files). It tells you the exact
   tables, columns + types, and gives real sample rows. Build the UI against these
   names. If it's absent, the user hasn't connected data yet — ask them to, in the
   Data tab.

## Building the UI

**Draft preview — render from the sample.** `await window.nexaData()` returns the
parsed `datamodel.json` (`{ tables: [{ name, columns, sample }] }`). Chart/table the
sample so the user sees the report immediately, with no Build:
```jsx
const model = await window.nexaData();
const rows = model.tables.find((t) => t.name === 'vw_boibocons').sample;
// aggregate in JS for the draft preview, render with recharts
```

**Real data (after Build) — named queries.** Declare the report's datasets in
`_app/queries.json` and call them by name:
```json
{ "queries": {
    "by_region": {
      "sql": "select region, round(sum(processed_volumes)) processed from vw_boibocons group by region order by processed desc",
      "limit": 200 } } }
```
```jsx
const { rows } = await window.nexaQuery('by_region');   // runs on the Postgres copy
```
- **Reference tables by their plain name** (`from vw_boibocons`) — they live in the
  app's own schema and the platform pins the `search_path`. Do NOT schema-qualify.
- SELECT / WITH only (read-only, row-capped). Use `$1`, `$2` for bound params
  (injection-safe — never string-interpolate user input).
- **Named only:** the browser sends a query NAME, never SQL — so a shared/public
  report can only run the queries you defined, against its own copied data.

Chart with **recharts** (already in the importmap) — bar / line / pie — and show a
table beneath. Write `queries.json` even while drafting: it's the report's real
logic, ready the moment the user clicks Build.

## Build = materialise

When the user clicks **Build**, the platform copies the full data into the app's
Postgres schema and `window.nexaQuery` switches from sample to real data
automatically — same `queries.json`, no rewrite. (Until then, `window.nexaQuery`
has nothing to run against; that's why the draft preview uses `window.nexaData`.)

## Rules

- **No SQLite. No DDL from app code.** You never write `schema.sql` or run
  `CREATE TABLE` from React. The data model is `datamodel.json` (draft) → copied to
  Postgres (Build).
- **Don't query the live customer DB at run time.** Connecting copied it in; the
  report runs on the copy.
- **Data model first.** Make sure `datamodel.json` (the tables you'll use) is in
  place before building the frontend — read it, design around the real columns.

## Hand-off

Once the data model (`datamodel.json`) + named queries (`queries.json`) are set,
build the UI (**Developer**, [developer.md](developer.md)) against the table/column
names in the model — draft preview via `window.nexaData`, live via `window.nexaQuery`.
