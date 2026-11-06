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
    "graded": [ "Every order line in PO-4471.pdf appears once in PO-4471.csv with its quantity" ],
    "sent": [
      { "step": "quote-1", "method": "POST", "path": "/v2/quotes", "json": { "po": "PO-4471", "lines": 2 } }
    ]
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
- `expect.sent[]`: what a Call an API (`clane__http`) step sent. `step` (its id, required) plus
  any of the fields below; only the fields you name are compared. `clane flow check` refuses an
  entry that names another kind of step, an unknown field or a credential header.

  | Field | Passes when |
  |---|---|
  | `method` | the method matches (any case) |
  | `path` | the address's path matches (`/v2/quotes`); with a `?`, path and query must both match (`/v2/quotes?dry=true`). The host is never compared |
  | `headers` | each named header has exactly that value (names in any case). Never name `Authorization`, `Cookie` or any header holding a key, token, secret or password: credentials are never compared or written down |
  | `json` | the JSON body is equal, nested values included (numbers by value; an extra or missing key fails) |
  | `text` | the text body is equal |
  | `form` | each named form field has that value (a list for a repeated name); other fields are ignored |

  A failure names the first difference, for example
  `json.po: expected "PO-4471", got "PO-4470"`. The request is checked whether the step was
  stubbed or ran with `--live-actions`.
- `stubs/<step id>.json`: the recorded reply for a connected-app step or a remote built-in
  step (Read scanned documents, Already seen?, Forget, storage). The whole file is the reply;
  an object may carry `files` (plain name to text), written into the working folder and left
  out of the channel. Read documents and Write a table are local and **never stubbed**: they
  run on the case's files. See the testing skill.
- A Call an API stub is the reply: `status` (default 200), `headers`, `body`, `file`; `ok`, `url`,
  `attempts` and `output` are filled in. A `file` reply needs its bytes in `files`
  (`{ "label.pdf": { "base64": "…" } }`; text works too). A status outside 200-299 fails the step
  exactly as a live call would (`HTTP 404 Not Found from GET /v2/quotes — …`), unless the step
  has `fail_on_error: false`.

Not supported: a per-case `settings` override, an assertion on error text, an assertion on
which branch ran (use `exists` on a branch-only channel), a `not_equals`, an assertion on what
a connected-app step (other than Call an API) was sent.
