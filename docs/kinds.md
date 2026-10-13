# Item kinds

The registry holds four kinds of item, each in its own folder. The folder name is the
item's name: kebab-case (`a-z`, `0-9`, single hyphens), at most 64 characters, and equal to
the `name` in its manifest. There are no version folders; git is the history and each
manifest carries its own semver `version`.

```
skills/<name>/SKILL.md              + references/, scripts/, assets/ (optional)
roles/<name>/role.yaml              + system_prompt.md, README.md (optional)
workflows/<name>/workflow.json      + README.md, steps/, prompts/ (optional)
connectors/<name>/connector.yaml    + README.md (optional)
```

A `README.md` in an item folder is the item's page in Clane's Browse registry view
(rendered as plain Markdown, HTML stripped).

## Skills

[Agent Skills](https://agentskills.io) format: `SKILL.md` is YAML frontmatter plus a
Markdown body, with optional `references/`, `scripts/` and `assets/` folders.

- Required: `name` (equals the folder) and `description` (at most 1024 characters; say
  what the skill does and when to use it).
- Optional, Agent Skills: `license`, `allowed-tools`, `metadata`, `compatibility`.
- Optional, Clane: `version` (default `0.1.0`), `title`, `when_to_use`, `inputs`,
  `outputs`, `requires_tools`, `model_hint`, `cost_budget_usd`, `category`, `tags`,
  `publisher`, `trigger_keywords`. They sit at the top level of the frontmatter; the
  skills CLI copies them through untouched.
- `requires_tools` is documentation. A skill never widens what a role may do.
- Scripts are plain files. Clane runs them only inside the sandbox, never on the server.

## Roles

`role.yaml` is a Clane role manifest: required `name`, `description`, `system_prompt`;
`version` defaults to `0.1.0`; optional `display`, `category`, `tags`, `allowed_skills`,
`allowed_tools`, `denied_*`, `core_builtins`, `priority_tools`, limits, `allowed_models`,
`default_model`, `cost_cap_per_run_usd`, `hitl_gates`, `risk_tier`, prompt scaffolding,
`examples` and `hooks`.

Write `system_prompt: ./system_prompt.md` to keep the prompt in its own Markdown file next
to the manifest; Clane inlines it before parsing.

Dependencies are the existing fields: `allowed_skills` names skills (installed alongside
the role when missing), and `allowed_tools` entries of the form `connector:<name>` name
connectors (listed as "connect after install"; credentials never travel with an install).

## Workflows

`workflow.json` is the manifest the Clane workflow runner reads: `name`, `version`,
`description`, `definition` (`version: "1.0"`, `nodes`, `edges`), and optional
`host_role`, `inputs`, `outputs`, `category`, `tags`, plus a `requires` block:

```json
"requires": {
  "skills": ["excel-power-user"],
  "roles": [],
  "connectors": [],
  "tools": ["python_exec", "file_write"],
  "files": [
    { "name": "code_mapping", "label": "Stock code mapping", "format": "csv",
      "expected_columns": ["customer", "customer_code", "stock_code"], "required": true }
  ]
}
```

`requires.files` declares organisation data the workflow needs before its first run. The
registry only declares it; each organisation binds its own file after install. Business
data is never committed here.

Code and prompts may also be kept as readable sidecars: `steps/<node-id>.<ext>` and
`prompts/<node-id>.md`. CI checks that each sidecar is byte-identical to the matching
node's `code` or `prompt` in `workflow.json`.

## Connectors

`connector.yaml` is a catalogue entry, never a secret:

```yaml
name: hubspot
title: HubSpot
description: Contacts, deals and tickets from your HubSpot account.
version: 0.1.0
publisher: clane
kind: mcp                   # mcp | builtin (builtin also names a preset)
transport: streamable-http  # streamable-http | sse
url: https://mcp.hubspot.com/mcp
auth:
  type: oauth               # none | api-key | oauth
  authorization_url: https://app.hubspot.com/oauth/authorize
  token_url: https://api.hubapi.com/oauth/v1/token
  scopes: [crm.objects.contacts.read]
  pkce: true
  fields:                   # what the user enters on the Connect screen
    - { key: client_id, label: Client ID }
    - { key: client_secret, label: Client secret, secret: true }
permissions:                # read never asks, write asks once, delete always asks
  read: [search_contacts]
  write: [create_contact]
  delete: [delete_contact]
```

`stdio` connectors are refused: the Clane server never starts local processes for a
registry connector.
