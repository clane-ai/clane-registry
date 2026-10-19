# Step types and the config keys each reads

| type | What it does | config keys |
|---|---|---|
| `trigger` | Where the run's input enters. Exactly one. | `output_key` (default `trigger`) |
| `role` | An AI step: the only free-form step. | `role_ref`, `prompt`, `model`, `tools`, `skills`, `max_tool_rounds` (1 to 200), `max_output_tokens`, `contract` (required), `output_retries` (0 to 5), `output_key` |
| `code` | Deterministic Python / Node / Bash. | `language`, `code`, `contract` (required), `output_key`, `continue_on_error` |
| `action` | Calls one tool of a connected app, or a built-in `clane` step (documents and data, storage). | `connector`, `action` (`<server>__<tool>`), `params` (strings may hold `{{step.path}}`), `output_key`. No `contract`: a built-in step's is fixed, a connected app's reply is a record |
| `router` | **Decision**: branches on a question. One outcome per branch. | `decide` (required: `rules` / `ai`), `outcomes[].when` (rules), `condition` (the question, `ai` only), `reads`, `decision` (`min_confidence` 0..1 for `ai`, `fallback` outcome id or `stop`). See "Rules" |
| `validator` | A pass / fail gate. Outcomes `pass`, `fail`. | `condition` (the pass rule), `reads`, `output_schema`; both are checked when both are set. See "Rules" |
| `loop` | Repeats with a hard cap. Outcomes `continue`, `done`. | `condition` (the continue rule), `max_iterations` (required) |
| `foreach` | Maps over a list, in Clane Cloud only. | `items_from`, `item_as`, `concurrency`, `on_item_error` |
| `human` | Waits for a person. Outcomes `approved`, `rejected`. | `approver_role`, `approver_user`, `due_hours`, `require_reason` (`review_key` does nothing); see "Human step" |
| `output` | Deliver: the end. | `deliver_as` (`file` / `json` / `message`), `from` (outputs to include), `filename`, `format`, `summarise`, `contract` (required: its `needs` are the workflow's result) |
| `note` | A canvas note. Never runs. | none |

A failed step stops the run unless that step sets `continue_on_error: true`.

The `clane` connector needs no connection. Its nine actions come in two groups:
- **Documents and data**: `clane__read_documents` (Read documents), `clane__ocr` (Read
  scanned documents), `clane__write_table` (Write a table), `clane__remember` (Already
  seen?) and `clane__forget` (Forget). See "Documents and data steps".
- **Storage**, over the folders the installer chose: `clane__storage_list`,
  `clane__storage_download`, `clane__storage_upload` and `clane__storage_move`. Those folder
  params must be `{{settings.<folder>}}`. See "Storage actions".

Use these steps instead of writing the same thing in a code step: do not hand-write PDF,
Word, Excel, HTML or `.eml` reading, OCR calls, CSV or Excel writing (byte order mark,
delimiter, formula guard) or "did we do this before" checks. A code step is for the business
rules: mapping, totals, what needs review. For amounts and dates inside it, use
`from clane import parse`.

## Contract: what a step needs and produces

**Every work step declares `contract.produces`; a table always has columns; the Deliver step
declares the result.** Work steps are `role`, `code` and `output`. `check` refuses a workflow
without them (`contract_missing`), and names a removed key (`removed_field`): `output_fields`,
`inputs`, `contract.inputs` and `contract.outputs` are gone, with no alias.

```json
"contract": {
  "needs":    [ { "name": "order", "from": "read.file", "type": "file" } ],
  "produces": [
    { "name": "lines", "type": "table", "description": "One row per order line",
      "columns": [
        { "name": "po_number",  "type": "text",   "required": true },
        { "name": "sku",        "type": "text",   "required": true },
        { "name": "quantity",   "type": "number", "required": true },
        { "name": "unit_price", "type": "money" },
        { "name": "line_total", "type": "money",  "required": true } ] },
    { "name": "order_total", "type": "money", "description": "The total printed on the order" } ]
}
```

- Types: `text`, `number`, `money` (a finite amount, at most 4 decimals), `date` (ISO),
  `boolean`, `list`, `record`, `table` (a list of records, **with `columns`**) and `file` (a
  file name in the run folder). A column is `{name, type, required?}` with type `text`,
  `number`, `money`, `date` or `boolean`. No enums, patterns or nested schemas: put those in
  a code step or a Decision by rules.
- `needs` is what the step reads: `name` is the local it gets (a code step's variable),
  `from` is `<key>.<field>` of an earlier step, `required` defaults to `true`. A `from` must
  name a value an earlier step produces with a compatible type (`contract_from`).
- `produces` is what the step must hand on. In Clane Cloud the step **fails** when a value is
  missing or of the wrong type, when a required column is empty in any row (*"'Extract the
  order lines' promised a table with a required line_total, but row 3 has none"*), or when a
  file does not exist or is empty. A code step returns every produced value from `main()`;
  an AI step is asked for exactly these values, so its prompt need not describe a JSON shape.
- The Deliver step's `needs` are the result the person gets: each value, each table (rows,
  columns and the sum of every number and money column) and each file, shown on the run.
- When a person names a file's columns ("a CSV with PO number, SKU, quantity, unit price and
  line total"), the step that finds the rows produces a table with exactly those columns, in
  that order; Write a table takes them from it.

## AI step output and limits

- An AI step's channel holds `output` (its text) plus the values its contract produces:
  `<key>.<name>`. In Clane Cloud a second extraction call fills them from the reply and is
  re-asked up to `output_retries` times while the answer breaks the contract.
- `max_tool_rounds` must be a whole number from 1 to 200: `0` is rejected by `check`
  (`Number must be greater than 0`). To give an AI step no tools, leave `tools` out and say
  in the prompt not to use tools; do not set `0`. On a machine an inline AI step always has
  the four file tools (`file_read`, `file_write`, `file_glob`, `file_grep`) plus whatever
  `tools` names.
- `max_output_tokens` is a positive whole number. Clane Cloud applies it and
  `max_tool_rounds`; the machine runner does not read either, so do not rely on them in a
  test.

## Human step

- `approver_role` is one of `owner`, `admin`, `builder`, `member` (the organisation's
  member roles). Any other text is accepted by `check` but matches nobody. Members with
  that role can decide it; the run's owner and organisation admins/owners always can.
  `approver_user` is a user id (uuid). Either one clears the `no_assignee` warning. When no
  role fits "the finance team", use `member` or `builder` and say so in the README.
- What the approver is shown: the workflow name, the step's label, and the **text output
  of the last step before the gate**. Put what must be approved in that step's `output`.
  `review_key` is not read by the server or the machine runner; do not use it.
- To show the approver what Clane suggests, have the step before the gate also return
  `recommendation: {"verdict": "approve" | "reject", "reason": "<one sentence>"}` (a code
  step returns it; an AI step declares `{"name": "recommendation", "type": "record"}` in
  `contract.produces`). The Inbox shows it as "Clane suggests: Approve — <reason>". Any other
  verdict, or no reason, shows nothing; the review text is never read for it.
- `require_reason`: `true` needs a reason to approve and to reject; `false` never; left
  out, only a rejection needs one. The reason is stored with the approval record; it is
  **not** put on any channel.
- `due_hours` (a whole number, up to 720) sets a deadline on the approval; the inbox shows
  it as overdue after that. Nothing in the code I checked approves or rejects it for them.
- A later step learns the answer only by **which edge ran**: `approved` or `rejected`
  (the human step writes no channel). Give each outcome its own next step, and in a test
  assert a channel only the taken branch writes.

## Rules

A rule is one line, evaluated with no model. It is used in three places: a Decision by rules
(`when` on each answer, in `data.outcomes[]`), a Check (`condition` = the **pass** rule) and a
Loop (`condition` = the **continue** rule). A rule is a yes/no test, never a bare value.

| Part | Form |
|---|---|
| Value from a step or setting | `invoice.total`, `settings.approval_limit`, `build.needs_review` |
| Fixed values | `412.5`, `"text"` or `'text'` (escapes `\"` `\'` `\`), `true`, `false`, `null` |
| Compare | `==` `!=` `<` `<=` `>` `>=` |
| Membership | `x in ["a", "b"]` (list of fixed values only), `text in "longer text"` |
| Empty test | `empty(step.value)`: null, `""`, `[]`, `{}` |
| Combine | `and` `or` `not`, or `&&` `\|\|` `!`; group with `( )` |

Gotchas:
- **No coercion.** `"5"` is not `5`; `"true"` is not `true`.
- **A missing value is `null`.** `a.total > 10` is false when `a.total` is missing; `empty(a.total)` is true.
- **Mixed types compare false** for `<` `<=` `>` `>=` (a number against text, or either against `null`).
- `==`, `!=` and `in` work on plain values only (text, number, yes/no, `null`); a list or object is never equal to anything.
- `and` / `or` / `not` need yes or no on **both** sides: `invoice.total and x` is an error, not a test.
- `in` is a substring test on text and a membership test on a list.

Decision by rules (`decide: "rules"`): answers are tried **in list order, first true wins**. An
answer with no `when` never matches by rule; make it `decision.fallback` (an outcome id). If no
rule matches and there is no fallback, the step fails (and the run). No `condition`/question is
needed (a `condition` on a rules Decision is ignored and warns). Money example:

```json
{"config": {"decide": "rules", "decision": {"fallback": "export"}},
 "outcomes": [
  {"id": "review",  "label": "Unknown PO",     "when": "invoice.po_known == false"},
  {"id": "approve", "label": "Over the limit", "when": "invoice.total > settings.approval_limit"},
  {"id": "export",  "label": "Export"}]}
```

`decide` is required on every Decision: `"rules"` or `"ai"` (see `examples/invoices-by-rules`).

Check (`validator`), the lead-intake case: a code step writes `needs_review`, the Check passes only
when `{"condition": "build.needs_review == true"}`. `condition` is the pass rule and is ANDed with
`output_schema` when both are set; give at least one, or `check` warns.

Loop: `{"condition": "draft.score < 80", "max_iterations": 5}` continues while the rule is true;
`max_iterations` still ends it.

A rule that cannot be read, does not give yes/no, or (Decision) matches nothing with no fallback
fails the step. The run report shows the rule, the values it read and **no model**.

`check` problems you will see: `decide_missing`, `rule_unreadable` (with the plain reason),
`rule_unknown_step` (names a step or setting the workflow does not have), `rule_missing` (an answer
with no rule and not the fallback, or a Loop with no continue rule), `fallback_unknown`,
`question_unused` (warning), `gate_checks_presence` (warning: a Check with neither rule nor schema).
Use `reads` plus `output_schema` for structural checks; keep rules for values and money.

## Storage actions (`clane` connector)

All four take their folder params as a whole `{{settings.<folder>}}` of a folder setting
whose `access` allows the use: list/download need `read`, upload `write`, move needs
`from` = `read_write` and `to` = `write`. An action's reply is its channel: each key of
the reply is a field, plus `output` (the reply as text).

| Action | Params | Reply |
|---|---|---|
| `clane__storage_list` | `folder`, `pattern` (glob, default `*`), `limit` (1 to 200, default 50) | `{"items": [item, ...]}`, oldest first |
| `clane__storage_download` | `folder`, `item` (one item from a list), `max_mb` (default 50, at most 250) | `{"file": "<name>"}`; the file is saved in the run's working folder |
| `clane__storage_upload` | `folder`, `file` (a plain name in the working folder), `name` (optional new name), `conflict` | `{"item": item}` |
| `clane__storage_move` | `from`, `to`, `item` (from a list of `from`), `conflict` | `{"item": item}` |

An `item` is `{id, name, size, etag, modified_at, mime?, drive_id, web_url, path}`.
`conflict`: only `"fail"` is honoured (an existing name is an error); anything else, or
leaving it out, saves under a new name. These actions never overwrite. `check` does not
validate `conflict`. A download takes one item, not a folder, and a move takes one item
(no list, no pattern).

Reading what is in a folder on a schedule (a schedule run starts with nothing):
`clane__storage_list` (set `limit`), then a code step that picks the item (a template
cannot index a list, so `{{list.items.0}}` does not work: return `{"first": items[0]}`
and pass `"item": "{{pick.first}}"`, which passes the whole object), then download.
There is no `foreach` on a machine and no counter loop, so one run handles one file: use a
`folder_watch` trigger when each new file should start its own run, or `limit: 1` plus a
frequent schedule to take the oldest each tick. Both patterns are assembled from the facts
above; neither has been run end to end. To skip a file you handled in an earlier run, put Already
seen? after the list step (key: the business number inside the file, or the item's `id` and
`etag`) and route on `dup.seen` with a Decision by rules.

**Decision by AI** (`config.decide: "ai"`): `config.condition` is the question. The answers are the
node's `data.outcomes[{id, label, description}]` (not in `config`); `description` says when to pick
it, and the model only ever returns one of the ids. Below `decision.min_confidence` the run takes
`decision.fallback`. Each edge out of a Decision sets `sourceHandle` to its outcome id. Put a
Decision before expensive steps (OCR, extraction) so off-topic inputs skip them.
A Decision by rules after Already seen? skips a duplicate: see "Documents and data steps". Worked example:
`examples/orders-with-decision/`.

## Documents and data steps (`clane` connector)

Five built-in steps, `type: "action"`, `connector: "clane"`. Params may hold `{{step.path}}`;
a param that is exactly one template passes the value itself, so a list or an object arrives
intact (`"files": "{{collect.needs_ocr}}"`, `"rows": "{{extract.lines}}"`). The reply is the
channel: each key a field, plus `output`. File names are **plain names in the run's working
folder** (no `/`, `\` or `..`); anything else fails. A failed step stops the run unless
`continue_on_error`. A param the step does not read is a `check` warning
(`tool_param_unknown`) and, for Read documents and Write a table, a run-time failure.

| Step | Runs | Credits | In `clane workflow test` |
|---|---|---|---|
| Read documents | where the files are: the Clane Cloud code sandbox, or the machine's Clane Python runtime (the bytes never leave the machine) | 0 | always runs for real; a stub is ignored |
| Write a table | same as Read documents | 0 | always runs for real; a stub is ignored |
| Read scanned documents | Clane OCR. From a machine the files are sent to Clane OCR, so the machine must be enrolled with `clane serve --jobs --allow-cloud-ocr` | 1 per page | stubbed: `stubs/<step id>.json`, which may carry `files` |
| Already seen? / Forget | Clane (a machine sends only the key and the value) | 0 | stubbed: `stubs/<step id>.json` |

### Read documents (`clane__read_documents`)

| Param | Default | Meaning |
|---|---|---|
| `files` | every file in the working folder except `payload.json`, `*.ocr.md`, the `output` file and dotfiles | A list, comma-separated names, or one name. A named file that is not there fails the step. |
| `trigger_text` | not read | Set `"{{trigger.output}}"` to include the text of an email or webhook trigger. Used **only when no `.eml` is among the files**, so a body is never read twice. JSON with `body`/`text` and `from`/`subject`/`date` is read as an email; anything else as plain text. |
| `output` | `sources.md` | The Markdown file it writes: `## Email (trigger)` or `## Email <file>` (From, To, Subject, Date, then the body), and `## Document <file>` per document (its text, or `*(scanned: needs OCR)*`). |
| `max_chars` | 60000 | 1000 to 500000, per document. The text goes in the file only; the channel never carries it. |
| `min_image_side` | 300 | 0 to 4000 px. A smaller image (logo, signature) is skipped. |

It reads `.pdf` (text layer), `.png .jpg .jpeg .gif .bmp .tif .tiff`, `.docx` (paragraphs and
tables, a row as `a | b | c`), `.xlsx` (every sheet as `### Sheet <name>`, rows `a | b | c`),
`.csv`, `.txt`, `.htm`/`.html` (tags stripped, cells joined with ` | `) and `.eml` (the body
once, plain text over HTML; each attachment is written beside it, name sanitised, `-2`, `-3`
on a clash, and read too). A PDF with fewer than 40 characters per page, and every image, is
marked `needs_ocr`.

Reply:
```json
{ "file": "order-sources.md",
  "documents": [ { "file": "2281_001.pdf", "kind": "pdf", "pages": 2, "chars": 0, "needs_ocr": true },
                 { "file": "lines.xlsx", "kind": "xlsx", "sheets": 1, "chars": 840, "needs_ocr": false, "from": "order.eml" } ],
  "needs_ocr": [ "2281_001.pdf" ],
  "emails": [ { "file": null, "from": "...", "subject": "...", "date": "...", "attachments": 0 } ],
  "skipped": [ { "file": "logo.png", "why": "image smaller than 300 px" } ],
  "output": "Read 1 email and 2 documents; 1 needs OCR. Everything is in order-sources.md." }
```
`kind` is `pdf`, `image`, `docx`, `xlsx`, `csv`, `text` or `html`; `from` names the `.eml` an
attachment came from; `emails[].file` is `null` for the trigger's text. A file it cannot open
is `skipped` with the reason and the step succeeds. It fails on: nothing to read (*"Nothing to
read: no email text and no documents."*), more than 200 files or 100 MB, a missing library
(*"Reading PDFs needs the Clane Python runtime on this machine."*).

### Read scanned documents (`clane__ocr`)

| Param | Default | Meaning |
|---|---|---|
| `files` | required | PDFs or images: `"{{collect.needs_ocr}}"`. An empty list succeeds with no documents and no charge, so the step can always sit after Read documents (on a machine, see below). |
| `max_pages` | 50 | 1 to 200, per file. A longer file fails: *"scan.pdf has 73 pages; this step reads at most 50. Raise max_pages or split the file."* |

It writes `<name>.ocr.md` beside each file (`scan.pdf` gives `scan.ocr.md`). Reply:
`{"documents": [{"file": "scan.pdf", "output_file": "scan.ocr.md", "pages": 2, "chars": 2858}], "pages": 2, "credits": 2, "output": "Read 1 scanned document (2 pages) with Clane OCR."}`.
The AI step after it reads each `output_file` with `file_read`; do not also give it the
`ocr_document` tool. It fails, naming the file, on: not a PDF or image, over 25 MB, OCR not set
up on the server, a provider error. On a machine not enrolled with `--allow-cloud-ocr` it fails
with *"This machine is not allowed to send documents to Clane OCR. Enrol it with
--allow-cloud-ocr, or run this automation in Clane Cloud."*. With no files to send it succeeds empty.
Each file sent from a machine shows in the run as *"Sent scan.pdf (2 pages) to Clane OCR"*.
`clane workflow check --run-on machine` warns `ocr_sends_files` on every OCR step, and
`check` warns `ocr_unused` when Read documents marks scans that nothing reads.

### Write a table (`clane__write_table`)

| Param | Default | Meaning |
|---|---|---|
| `rows` | required | A table some step produces: `"{{extract.lines}}"`. Its declared columns are the file's columns, in order, each heading the column name in title case (`po_number` gives `Po Number`). There is no `columns` param. A nested value is written as JSON text. |
| `file` | required | A plain name ending `.csv` or `.xlsx`. It overwrites a file of that name in the working folder. |
| `format` | from the extension | `csv` or `xlsx`. |
| `delimiter` | `,` | `,`, `;` or `tab`. CSV only. |
| `bom` | `true` | UTF-8 byte order mark, so Excel opens it cleanly. CSV only. |
| `line_ending` | `crlf` | `crlf` or `lf`. CSV only. |
| `guard_formulas` | `true` | Prefixes `'` to a cell that starts with `=`, `@`, tab, CR, or `+`/`-` followed by something that is not a digit, space, `.` or `,`. `+353 1 234`, `-5` and `-1,20` stay as they are. |
| `sheet` | `Sheet1` | XLSX only; at most 31 characters, none of `[ ] : * ? / \`. |

Reply: `{"file": "B528564.csv", "rows": 7, "columns": 7, "missing_fields": [], "output": "Wrote 7 rows and 7 columns to B528564.csv."}`.
Numbers are written as numbers in XLSX and as Python `repr` in CSV (`3.5`, never `3.50`):
format money and dates as text in the code step that builds the rows. One step writes one
file. For several files in one run (an email with several orders), write them in the code
step with `csv` and `parse.guard`: there is no `foreach` on a machine. It fails on: `rows`
not a list of records (*"rows must be a list of records; got text."*), `rows` not bound to a
table with columns (a `check` error), an unknown `format` / `delimiter` / `line_ending`, more
than 200000 rows or 50 MB. A machine takes the columns from the table the same way, and
reports the run's result (rows and sums) as Clane Cloud does.

### Already seen? (`clane__remember`) and Forget (`clane__forget`)

| `clane__remember` param | Default | Meaning |
|---|---|---|
| `key` | required | 1 to 500 characters: the business key, `"po:{{build.po}}"` or `"{{build.key}}"`. Kept **per workflow per organisation**: the same workflow on an email and a webhook trigger shares its keys; two workflows do not. Hash a key you consider sensitive. |
| `value` | none | A small JSON value (at most 4 KB), stored on first sight. |
| `ttl_days` | 90 | 1 to 3650. After that the key is forgotten. |
| `overwrite` | `false` | Store `value` even when the key was seen. |

Reply: `{"seen": false, "first_seen_at": "2026-10-18T09:12:00.000Z", "run_id": "...", "run_status": "running", "value": null, "output": "First time: po:4471"}`
or `{"seen": true, ..., "run_status": "awaiting_approval", "output": "Seen before on 2026-10-18 09:12 (run awaiting approval)."}`.
The first call reserves the key at once, so a resend that arrives while the first run waits
for approval already sees `seen: true`. `run_status` is the first run's live status:
`running`, `awaiting_approval`, `completed`, `failed`, `cancelled` or `unknown`. Route on it
with a Decision by rules, and let a retry through after a failure:

```json
{"config": {"decide": "rules", "decision": {"fallback": "new"}},
 "outcomes": [
  {"id": "again", "label": "Already handled", "when": "dup.seen == true and dup.run_status != \"failed\""},
  {"id": "new",   "label": "New"}]}
```

`clane__forget {key}` gives `{"forgotten": true, "output": "Forgot po:4471."}` (or `false`
and *"po:4471 was not remembered."*); it never fails on a missing key. Put it on the
`rejected` branch of a human step so a rejected order can be sent again. Both fail on a
missing or too-long key, and in a workflow that was never saved (*"Already seen? needs a
saved workflow."*). In the Designer's Test run and in `clane workflow test --live-actions`
the key is really remembered under the workflow's slug.

Pick the key from what makes the work unique. A customer who resends an order sends a new
email, so an email's Message-ID only catches the same email arriving twice, and Clane already
drops the same email delivered twice to one automation. The examples key on the PO numbers
(`po:63584-00+63585-00`), which are known only after the AI step: a resend still costs the
OCR and AI credits, but never writes a second set of files.

Worked examples: `examples/orders-from-email` (Read documents, OCR, Already seen? on the PO
numbers), `examples/orders-from-folder` (the same, plus Write a table).

## `clane.parse` in code steps

A module every Python code step can import, in Clane Cloud and on a machine (the engine puts
it in the run's `.clane/` folder; with the Clane Python SDK installed, `from clane import
filesystem` keeps working). Pure functions, ISO strings out, `None` when the text is not a
value:

```python
from clane import parse
parse.amount("2.280,00")               # 2280.0   (with "." and ",", the last one is the decimal)
parse.amount("1,234.50")               # 1234.5
parse.amount("€ 1.234")                # 1234.0   (one separator, 3 digits after: thousands)
parse.amount("0.500")                  # 0.5      (unless the part before is 0)
parse.amount("12,5", decimal=",")      # 12.5     (say so when it is ambiguous)
parse.amount("12,50-")                 # -12.5    (also "-€ 12" and "(12.50)")
parse.amount("abc")                    # None
parse.integer("1.200 Stk")             # 1200     (None when it is not whole)
parse.date("12.10.2026")               # "2026-10-12"  (day first by default)
parse.date("10/12/2026", order="mdy")  # "2026-10-12"
parse.date("2026-10-12T08:00:00Z")     # "2026-10-12"
parse.date("21.10.26")                 # "2026-10-21"  (a two-digit year is in the 2000s)
parse.date("tomorrow")                 # None     (no words, no month names)
parse.guard("=SUM(A1)")                # "'=SUM(A1)"   (Write a table's formula guard)
```
