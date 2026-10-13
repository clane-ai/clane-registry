# Clane Registry

[![skills.sh](https://skills.sh/b/clane-ai/clane-registry)](https://skills.sh/clane-ai/clane-registry)

The public catalogue of roles, skills, workflows and connectors for
[Clane](https://clane.ai). Anyone can browse it, use it and install from it.

| Folder | What is in it |
|---|---|
| [`skills/`](skills) | Skills in the [Agent Skills](https://agentskills.io) format: a `SKILL.md` plus optional references, scripts and assets |
| [`roles/`](roles) | Roles: a `role.yaml` manifest and its `system_prompt.md` |
| [`workflows/`](workflows) | Workflows: a `workflow.json` the Clane workflow runner reads |
| [`connectors/`](connectors) | Connector catalogue entries (`connector.yaml`), never credentials |
| [`docs/`](docs) | [Item kinds](docs/kinds.md), [contributing](docs/contributing.md), [community sources](docs/sources.md) |

## Use the skills in any agent

The skills work in any agent that supports the skills CLI:

```sh
npx skills add clane-ai/clane-registry                          # pick from the list
npx skills add clane-ai/clane-registry --skill excel-power-user  # one skill
npx skills add clane-ai/clane-registry --list                   # just list them
```

## Install in Clane

In Clane, open **Build → Registry**. The Clane registry is the default source, labelled
**Published by Clane**. Pick an item and install it for yourself or, as an admin, for your
organisation. Clane shows what the item needs (other skills, connectors to connect, files
to set up) and asks once before installing anything.

How it works:

- Clane installs from the **latest release**, never from `main`. Each release is a tag
  (`v2026.10.0`, ...) with a signed `index.json`; Clane checks the signature and every
  item's digest before installing.
- An install is pinned to the release's commit. Clane checks daily and shows **Update
  available** with what changed; updating is always your choice.
- Air-gapped deployments upload a release's `registry-<tag>.tar.gz` and `index.json`
  instead of reaching GitHub.
- Other public GitHub repositories with the same layout can be added as sources too.
  They are labelled third-party and are not reviewed by Clane.

## Contributing

Pull requests are welcome. Read [docs/contributing.md](docs/contributing.md) first. In
short: keep each item in its own folder named after it, bump the item's `version` when
you change it, and run `node scripts/validate.mjs` and `node scripts/compat.mjs` before
opening the pull request. A maintainer reviews every change, and releases are cut by a
maintainer.

## Licence

TODO: the licence for this repository is pending the owner's choice; no licence is
granted until it is chosen. Some items carry their own licence, which applies to them:
the Anthropic-published skills here (for example `skill-creator`, `mcp-builder`,
`frontend-design`) are Apache-2.0 and include their `LICENSE.txt`.

Anthropic's document skills `docx`, `xlsx`, `pptx` and `pdf` are not in this repository:
their licence does not allow redistribution. Install them from Anthropic's own
repository, [anthropics/skills](https://github.com/anthropics/skills) (in Clane, add it as
a source in Build → Registry).
