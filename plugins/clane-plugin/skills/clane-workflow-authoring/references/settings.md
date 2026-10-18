# Settings and triggers

`settings[]`: each has `name` (lower_snake_case, never containing secret, password, token
or api key), `label`, optional `help` and `required`, and a `type`:
`folder` (`access`: read | write | read_write), `file` (`format`: csv | xlsx | json | txt,
`expected_columns`), `text` (`default`, `pattern`, `max_length`), `number` (`min`, `max`,
`integer`, `default`), `select` (`options[{value, label}]`, `default`), `boolean`
(`default`), `schedule` (`default`: `{ every_minutes }` or `{ cron, tz }`). `every_minutes` must be one of
5, 6, 10, 12, 15, 20, 30, 60, 120, 180, 240, 360, 480, 720, 1440; `every_minutes` runs in UTC.
`cron` is a 5-field expression parsed with `cron-parser`, which accepts `L` (so
`0 18 L * *` is 18:00 on the last day of every month).

`triggers[]`: each has `name` (lower_snake_case) and `kind`: `email` | `webhook` |
`folder_watch` | `schedule`. A `folder_watch` needs `source: "{{settings.<folder>}}"` and
`schedule`, and may set `pattern` (for example `*.pdf`). A `schedule` needs `schedule`.
`schedule` is `"{{settings.<schedule>}}"` or a schedule value. Optional `limits`:
`max_items_per_tick`, `max_concurrent_runs`, `max_file_mb`, `run_timeout_minutes`.
Optional `after.success` / `after.failure` `{ move_to: "{{settings.<folder>}}" }`
(folder watch only; `after.failure` may add `write_reason: true`).

What a run starts from, by trigger kind:
- email: `trigger.output` is the email header block plus the body, and the attachments are files
- webhook: `trigger.output` is the JSON body (pretty) or the text; `payload.json` and any
  sent files are files; `trigger.payload` is the parsed body
- folder watch: `trigger.output` is `New file: <name>`; the file is a file;
  `trigger.file` is `{name, size, source_path}`
- schedule: nothing. To read what is in a folder, see "Storage actions" in `nodes.md`.
