# Contributing

## Adding or changing an item

1. Put the item in its kind folder (see [kinds.md](kinds.md)). The folder name equals
   the manifest `name`.
2. Bump the item's `version` whenever any file in its folder changes. CI compares every
   item with the last signed release and refuses a change without a higher version.
3. Run the checks locally:

   ```sh
   npm ci
   node scripts/validate.mjs        # manifests, layout, dependencies, version bumps
   node scripts/compat.mjs          # skills CLI discovery (+ agentskills, if installed)
   ```

4. Open a pull request. A maintainer listed in `.github/CODEOWNERS` reviews it and CI
   must pass.

Rules CI enforces:

- Every item parses with the same parsers the Clane server uses; nothing unreadable.
- No `SKILL.md` at the repo root or outside `skills/` (either hides skills from the
  skills CLI).
- Agent Skills limits: `name` kebab-case and at most 64 characters, `description` at
  most 1024 characters.
- Every skill and role a role or workflow needs exists in this repo; every tool a role
  or workflow needs is one the Clane server provides.
- No symlinks, no hidden files inside items, no file over 16 MB, no binary over 5 MB.
- No raw HTML in Markdown documents (model prompts such as `system_prompt.md` are
  exempt).
- No `stdio` connectors.
- Workflow sidecars in `steps/` and `prompts/` match `workflow.json` exactly.

## Releases

A maintainer pushes a CalVer tag from `main`: `v2026.10.0`, `v2026.10.1`, ... The
`release` workflow waits for a maintainer's approval in the protected `release`
environment, then:

1. validates again;
2. builds `index.json` (every item with its version, path and tree digest) and signs it
   with the registry-release key (`typ: registry-index`);
3. builds `registry-<tag>.tar.gz` from the tagged commit, for air-gapped installs;
4. publishes both as assets of a GitHub release, first as a pre-release;
5. downloads both from their public URLs, plus the tarball GitHub serves for the commit,
   and checks the signature and every item digest with the server's own code;
6. only then marks the release as the latest, which is what Clane installs by default.

## The vendored code in `scripts/lib`

`scripts/lib/core.mjs` is generated from the Clane platform's source: the item parsers,
the tree digest and the Ed25519 signing code the server runs. It stands in for a shared
schema package that is not published yet. Never edit it by hand; regenerate it from a
checkout of the platform:

```sh
node scripts/vendor/build.mjs --monorepo /path/to/platform
```

`scripts/lib/server-names.json` is a snapshot of the server's core skill names and
builtin tool names, used by the dependency check. Refresh it when the server adds a
builtin tool. `scripts/lib/keys.json` holds the public half of the release key.
