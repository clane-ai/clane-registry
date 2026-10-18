---
description: Build a Clane workflow from a prompt, check it, test it on this machine with recorded events, and publish it as a draft.
argument-hint: "<what the workflow should do, and where the sample files are>"
---

# Create a Clane workflow

The builder asked for: $ARGUMENTS

Work through these steps in order, and say which step you are on as you go. Use the skills
`clane-workflow-authoring` and `clane-workflow-testing`. Every rule is checked by the `clane`
CLI, so never try to bypass it.

1. **Preflight.** Run `clane --version`. It must be 0.1.26 or newer; otherwise stop and tell
   the builder to update (`clane update`). Run `clane whoami`. If it fails, stop and tell
   them to run `clane login`. Say in one line who you will test as:
   "Testing as <email> on <server> — right?"
   Ask which organisation the draft is for if the builder has not said (`clane workflow
   publish` lists the organisations you can build in when there is more than one). Confirm
   in one line: "Publishing a draft to **<Org>** as <email> — right?"
2. **Understand.** Read the samples the builder named. If the prompt leaves the trigger kind
   (email, webhook, folder watch, schedule), the deliverable, or who receives it unclear, ask
   at most three short questions. Otherwise go on.
3. **Author.** Write the package folder (authoring skill): `workflow.json`, `steps/`,
   `prompts/`, `tests/settings.json`, `README.md`. Turn each sample into a case under
   `tests/cases/<name>/` (testing skill). Prefer exact checks. Use graded statements only for
   what exact checks cannot say.
4. **Check.** Run `clane workflow check <dir> --pack --json`. It prints one JSON object:
   `{"ok": true|false, "problems": [{"code", "node_id", "message", "severity"}], "inlined": N}`,
   or `{"ok": false, "error": {"code", "message"}}` when it could not check at all (signed
   out, no organisation, server unreachable). Fix every problem with severity `error` and run
   it again. Stop after 3 rounds that still have problems, and show the builder the last list.
   An `error` object is not a package problem: stop and tell the builder (see exit codes).
5. **Test.** Run `clane workflow test <dir> --json` and read the JSON it prints (it is also
   saved to `<dir>/.clane/test-report.json`). If it has `problems` or `error` instead of
   `cases`, no new report was written: fix that first, and never read an older report file.
   For each failed expectation, decide whether to fix the step or fix the expectation
   (testing skill). Run the test again. Stop after 3 rounds that still have failures, and
   show the last report.
   **Fix an expectation only when it was wrong about the sample; tell the builder what
   changed and why. Never loosen a check just to get it green.**
   Exit codes: 0 all passed · 1 a case failed, or the package has problems · 2 a case waits
   for a person (add a decision to the case; remove the gate only if the builder did not ask for one) · 3 signed out, permission or policy
   (stop, tell the builder) · 4 server, gateway or model trouble (stop, tell the builder; do
   not loop) · 5 update `clane`.
6. **Publish as a draft.** Run `clane workflow publish <dir> --draft --org <slug> --json`.
   Use `--allow-untested` only when the builder agrees the workflow has no sensible recorded
   event yet; the draft is then marked Untested. If it exits 1 with `error.code` `untested`,
   there is no passing report for these exact files, so test again. If it exits 1 with
   `error.code` `live`, a live workflow already has this name: tell the builder and stop. If
   it prints `problems` instead, the server found problems: fix them as in step 4. If it
   exits 3, the builder is not an owner, admin or builder there: stop and say so.
7. **Summary.** Give the Definitions link (`url`), each automation's address
   (`automations[].ingress`), the cases passed and the credits spent, and what a person
   should review. End with: "Nothing runs until someone in <Org> switches it on."

If any round limit is hit, stop and report. Never keep looping.
