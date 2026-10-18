# case.json

```json
{
  "name": "order-email",
  "trigger": "order_in",
  "event": { "kind": "email", "file": "event.eml" },
  "decisions": { "approve-1": "approved" },
  "expect": {
    "outcome": "succeeded",
    "files": [ { "glob": "*.csv", "count": 2 }, { "name": "PO-4471.csv", "min_bytes": 200 } ],
    "channels": [
      { "path": "extracted.orders", "length": 2 },
      { "path": "extracted.orders[0].po_number", "equals": "PO-4471" },
      { "path": "build.rows_written", "gte": 12 }
    ],
    "graded": [ "Every order line in PO-4471.pdf appears once in PO-4471.csv with its quantity" ]
  }
}
```

- `name`: optional; the case folder's name when left out.
- `trigger`: the name of a trigger in workflow.json.
- `event.kind`: `email` (`file`), `webhook` (`payload` or `payload_file` or
  `payload_text`, plus `files[]`, a list of file names), `folder_watch` (`file`), or
  `schedule`. Every file named sits inside this case's folder.
- `decisions`: `approved` or `rejected`, keyed by human step id.
- `expect.outcome`: `succeeded` (default), `failed` or `awaiting_approval`. It is always
  checked, so every case has at least this one expectation.
- `expect.files[]`: `glob` or `name`, plus `count` and/or `min_bytes`. These match the
  files the run wrote at the top of its working folder, not its inputs.
- `expect.channels[]`: `path` (dots, `[n]` for list items, from the channel name, for
  example `extract.orders[0].po_number`) plus any of the checks below. Several in one entry
  must all hold. Channel names are the step's `output_key`, else its step id as written
  (`extract-1.output`), not the sanitised code name.

  | Check | Passes when |
  |---|---|
  | `equals` | the value is equal. Numbers compare by value (`3130` equals `3130.0`). `null` also matches a channel that is not set. Strings, booleans, lists and objects must match exactly |
  | `length` | a list's item count, an object's key count, or a string's characters |
  | `gte`, `lte` | the value is a number at or above / at or below. Not for lists: use `length` |
  | `contains` | the value, as text, contains the string. A string is searched as is; a list or object is searched as its JSON text, so it is a substring match, not "is a member" (`contains: "A1"` also matches `"A10"`; write `"\"A1\""` for a whole element) |
  | `exists` | `true`: the channel is set (a `null` value counts as set). `false`: it is not set. With no other check, `exists: true` is assumed |

- `expect.graded[]`: plain statements a reader could check against the files.
- `stubs/<step id>.json`: the recorded reply for a connected-app step or a remote built-in
  step (Read scanned documents, Already seen?, Forget, storage). The whole file is the reply;
  an object may carry `files` (plain name to text), written into the working folder and left
  out of the channel. Read documents and Write a table are local and **never stubbed**: they
  run on the case's files. See the testing skill.

Not supported: a per-case `settings` override, an assertion on error text, an assertion on
which branch ran (use `exists` on a branch-only channel), a `not_equals`.
