---
name: clane-flow-machine
description: Use when setting up or fixing a Clane worker on a machine so workflows can run there - install clane, sign in, clane serve --jobs, worker labels and folders, "Select folder" shows nothing, "another Clane worker is already running", clane service start/stop/status/uninstall, or the build/test/try/publish loop for a workflow that uses machine folders.
---

# Running Clane workflows on your own machine

A **worker** is `clane` running in the background on a machine. It takes runs for its
**label** (a pool name) and works only in the **folders** it was given. Windows commands
are shown (PowerShell).

## 1. Install the CLI

```
irm https://clane.sh/install.ps1 | iex
clane --version            # 0.1.57 or newer
```

Version still old after installing? Another `clane.exe` comes first on PATH:
`Get-Command clane -All`. Remove the older one, then open a new terminal.

## 2. Sign in

```
clane login                # https://workflow.clane.ai by default
clane whoami
```

- Dev server only: `clane login --server https://clane.aihq.ie`. For one command:
  `$env:CLANE_URL = 'https://clane.aihq.ie'`.
- A machine that once had CLI 0.1.28 still has the dev server saved. Fix:
  `clane login --server https://workflow.clane.ai`.

## 3. Start the worker (per user, no admin)

```
clane serve --jobs --install-service --user-level --label <pool> --parallel <1-16> `
  --folder "invoices=\\fileserver\finance\invoices" `
  --folder "out=C:\Clane\out:rw"
```

- It is `clane serve`, not `clane server`.
- **Folders are the only places the worker can see.** Without `--folder`, "Select folder"
  in the web app shows nothing.
- Folder names: lower-case letters, digits and `-`. Up to 16 folders.
- Read-only unless the path ends in `:rw`.
- Background tasks often cannot see mapped drive letters (`Z:`). Use the network path
  (`\\server\share`) instead.
- `--parallel` is how many runs at once (1 to 16, default 1).

### A server that must run when nobody is signed in

From an Administrator PowerShell, sign in as above, then install it as a Windows service
under a service account (password in `CLANE_SERVICE_PASSWORD`):

```
clane serve --jobs --install-service --service-user .\clane-worker --label <pool> --parallel <n> --folder "<name>=<path>"
```

### Make the workflow run on the machine

Machine folders only appear when the workflow runs on the machine. In `workflow.json` set
`"run_on": { "kind": "label", "label": "<pool>" }` (the worker's `--label`), or in the web app
open the workflow → Settings → **Runs on** → the machine. A workflow left on the cloud
(`"run_on": { "kind": "cloud" }` or no `run_on`) offers only cloud folders (Microsoft 365).
Folder settings for a machine are `"type": "machine_folder"`; ones added while the workflow
ran in the cloud are `"type": "folder"` and must be removed and added again after the move.

## 4. Manage it

```
clane service status | start | stop | uninstall
```

Changing folders or label means installing again:

```
clane service stop
clane service uninstall
clane serve --jobs --install-service --user-level --label ... --folder ...
```

(With CLI 0.1.57, `uninstall` alone leaves the worker running, so always `stop` first.
Fixed in 0.1.58.)

## Troubleshooting

**"another Clane worker is already running"**: something already holds this machine's
worker. Usually one of:

- Clane Desktop: quit it from the tray.
- A terminal still running `clane serve --jobs`: close it.
- A leftover worker. Find it and stop the one whose command line has `serve --jobs`:
  ```
  Get-CimInstance Win32_Process -Filter "Name='clane.exe'" | Select ProcessId, CommandLine
  Stop-Process -Id <ProcessId>
  ```

**"Select folder" is empty**: the worker was started without `--folder`. Reinstall with
folders (section 4).

**Runs go to the wrong server**: `clane whoami`, then sign in again with the right
`--server` (section 2).

## Build, test and run a workflow

```
clane flow init <dir>
clane flow check <dir> [--run-on cloud|machine]
clane flow test <dir> [--case <name>] [--live-actions] [--report <path>] [--json]
clane flow try <dir> [--on <machine label>] [--input <file>]
clane flow publish <dir> --draft
clane flow pull <slug|id> [--into <dir>]
clane flow schema [<dir>]
clane flow list | run <workflow> | status [run] | cancel [run]
```

`flow.json` in the package folder (or above it) may name the organisation:
`{ "org": "<slug>" }`.

Work in this order:

1. **check** - fix every error.
2. **test** on this machine until every case passes. Never add `--live-actions` unless the
   builder says so: it acts for real.
3. **try --on <label>** when the workflow uses machine folders, so it runs once on the real
   worker.
4. **publish --draft**. A person switches it on in Workflows; nothing runs before that.

Folder steps must use folder **names** the worker declared, never paths. If you do not
know the worker's label and folder names, ask the builder (they chose them at install).
