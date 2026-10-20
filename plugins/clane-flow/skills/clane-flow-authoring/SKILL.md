---
name: clane-flow-authoring
description: Use when writing or editing a Clane workflow package (workflow.json, steps/, prompts/, settings, triggers) for a customer organisation. Covers the step vocabulary, settings and triggers, the code-step contract, AI step instructions, the package layout and the loop (`clane flow init`, `check`, `test`, `try`, `publish`, `pull`).
---

# Writing a Clane workflow package

A package is a folder:

```
<slug>/
├── workflow.json        name, version, description, settings[], triggers[], definition
├── steps/<step id>.py   review copy of each code step (also .js, .ts)
├── prompts/<step id>.md review copy of each AI step's instructions
├── tests/               settings.json + cases/ (see clane-flow-testing)
└── README.md            what it does, settings to fill in, how it was tested
```

The folder name is the workflow's slug: lower-case letters, digits and `-`.

## The loop

1. **Start.** A new package: `clane flow init <dir>` (its `workflow.json` names the server's
   `$schema`, so the editor completes and underlines). A workflow that already exists on the
   server: `clane flow pull <slug>` (writes the files, the published tests and
   `.clane/published.json`, and says what changed). `clane flow schema <dir>` saves the org's
   own schema, with its connector, role and model names, to `.clane/workflow.schema.json`.
   A `flow.json` with `{ "org": "<slug>" }` in the repo saves `--org` on every command.
2. **After every edit:** `clane flow check <dir> --pack --json`. Fix exactly what a problem
   names, then check again. Never report a change as working without a clean check.
3. **Recorded cases:** `clane flow test <dir> --json` (see clane-flow-testing).
4. **Before saying "it works":** `clane flow try <dir>` once (`--on <machine>` for a
   machine, `--case <name>` or `--input <file>` for the event). It publishes the draft, runs
   it once as a test run, prints each step, saves the files to `.clane/try-runs/<run id>/`
   and prints Clane's review and the run page. The run is the truth. Action steps use the
   builder's real connectors. A live workflow is never tried in place: use
   `--as <slug>-next`.
5. **Publish:** `clane flow publish <dir> --draft --org <slug> --json`.
6. **The 409 rule.** Publish sends the base recorded in `.clane/published.json`. `error.code`
   `stale` means someone saved the workflow since (the Designer, or another CLI): run
   `clane flow pull <slug>`, merge the change into what it wrote, check, test, publish again.
   `exists` means the server holds this slug and it was never pulled here: pull first. Never
   overwrite: use `--force` only when the builder says to replace what is on the server.

The CLI is `clane` (Clane's own). If `clane --version` is below the floor in the plugin
README, say so and stop; never install another `clane`. Change only what the ask names, and
never weaken a test expectation silently.

## Rules

- `workflow.json` is the only thing Clane runs. `steps/` and `prompts/` are copies for
  review. Edit the copy, then run `clane flow pack <dir>` (or `check --pack`), which
  writes it back into `config.code` / `config.prompt`. `check` fails when a copy and its
  step differ, or when a copy names no step.
- A review copy is only `steps/<step id>.py`, `.js` or `.ts`, or `prompts/<step id>.md`.
  Other files in those folders are ignored. A Bash code step has no review copy: keep its
  code in `workflow.json`.
- Every step has an `id`, a `type`, a `position` (`{"x":0,"y":0}` is fine) and `data`
  `{ label, outcomes, config }`. Every edge has `id`, `source`, `target`, and `sourceHandle`
  when the source step has several outcomes.
- The graph starts at one `trigger` step and must reach an `output` (Deliver) step.
  Every outcome of a branching step needs an edge.
- Never put a password, token or key anywhere in the package. Apps are reached through
  connectors by name; Clane holds their credentials.
- `foreach` runs only in Clane Cloud. Do not use it when the workflow will run on a
  customer's machine. `clane flow check <dir> --run-on machine` proves it can.

## Code steps

A code step (`type: "code"`, `config.language`: `python` | `node` | `bash`) defines `main()`.
It reads what earlier steps produced as local variables, named after the **channel**:

| What | Local name |
|---|---|
| a step's output | its `config.output_key` if set, else its step id; every character that is not a letter or digit becomes `_` (`extract-1` is `extract_1`), and a leading digit becomes `_` |
| the trigger | `trigger` (or the trigger's `output_key`): `trigger.output`, `trigger.payload`, `trigger.file` |
| settings | `settings.<name>` |
| a declared need | `config.contract.needs: [{"name": "po", "from": "extract.po_number", "type": "text"}]`; it wins over a channel of the same name |

A channel is `{output, ...fields}`: `output` is the step's text, the fields are the values
the step's `contract.produces` declares (a code step returns them from `main()`). A step
that returns a plain string has only `output`.

Python: every object (nested ones too) is dot-accessible **and** behaves like a mapping:
`x.k`, `x["k"]`, `x.get("k", d)`, `"k" in x`, `len(x)`, `x.keys()`, `x.items()`,
`x.values()`, `for k in x`. Lists are real lists. It is not a `dict`, so `isinstance(x, dict)`
is False; `vars(x)` gives the plain dict. A key that is not a valid name (`"PO No"`), or
that is `items`, `keys`, `values` or `get`, must be read as `x["key"]` (Python's own rule:
the field shadows the method). Node and Bash get plain JSON values (Bash: a JSON string).

A channel from a branch that did not run is **not defined at all**: Python raises
`NameError` (use `globals().get("x")`), and `{{x.y}}` in a template is empty. To get `None`
instead, declare it as a need that is not required:
`contract.needs: [{"name": "x", "from": "x.output", "type": "text", "required": false}]` (a
path that does not resolve binds `None`/`null`).

It returns a JSON-able dict, which becomes that step's output (`config.output_key`
names it). It reads and writes files only in its working folder: the trigger's files are
there, and anything it writes there is a deliverable.

Keep code steps to the business rules. Reading documents (PDF, Word, Excel, HTML, `.eml`),
OCR, writing a CSV or Excel file, and "have we handled this before" are built-in steps:
Read documents, Read scanned documents, Write a table, Already seen? and Forget (see
"Documents and data steps" in `references/nodes.md`). For amounts, dates and whole numbers
inside a code step, `from clane import parse` (`parse.amount("2.280,00")` is `2280.0`,
`parse.date("21.10.26")` is `"2026-10-21"`); do not write your own number or date parser.

## AI steps

An AI step (`type: "role"`) has `config.prompt`: bounded instructions saying what to read,
and what to produce. The values it hands on are its `config.contract.produces` (each with
`name`, `type` and `description`; a table with its `columns`), and the engine holds it to
them. Name the exact values you want back. Do not ask it to "do everything".
See "AI step output and limits" in `references/nodes.md`: the prompt itself must ask for a
JSON reply, and on a machine `max_tool_rounds` / `max_output_tokens` are not applied.
Leave `config.model` unset unless the customer requires a model.

## Settings and triggers

See `references/settings.md`. Declare a setting for every value an installer must choose
(folders, mapping files, column lists). Reference it as `{{settings.<name>}}` in triggers
and as `settings.<name>` in steps.

## Step vocabulary

See `references/nodes.md`. `clane flow <check|pack|test|publish> --help` prints the usage.

## Worked packages

`references/examples/` holds five packages:
- `orders-from-email`: an email or a webhook in, orders typed in the body or sent as PDF,
  scanned or HTML documents out as Order Form CSV files. Read documents, then Read scanned
  documents, before the AI step; Already seen? on the PO numbers and a Decision by rules
  skip a resent order
- `orders-from-folder`: a folder watch, the same built-in steps, the CSV written by Write a
  table and saved into another folder through the `clane` storage connector, the PDF moved
  on success or failure
- `orders-with-decision`: the email example with a Decision step in front of the expensive
  steps, so off-topic mail skips them
- `invoices-by-rules`: a Decision by rules (unknown PO, over the limit, else export) with a
  human approval step; no model
- `po-order-extractor`: the minimal five-step version

The order examples use the built-in steps for reading, OCR, files and duplicates; their code
steps hold only the business rules (stock code mapping, totals, what needs review).
Only `invoices-by-rules` has a `human` step: see `references/nodes.md`.

Start from the closest one.
