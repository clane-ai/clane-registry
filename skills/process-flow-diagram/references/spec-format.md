# Spec format reference

The spec is a YAML object describing the diagram's logical structure.
The build script (`scripts/build_flow.js`) turns it into draw.io XML
with auto-layout, theming, edge routing, and validation in one pass.

## Top-level fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `kind` | yes | enum | `flow` (default) · `network` · `sequence` · `decision` |
| `title` | yes | string | Diagram page title; appears in draw.io's tab |
| `theme` | no | enum | `tech-blue` (default) · `mono` · `warm` · `dark` · `high-contrast` |
| `direction` | no | enum | `TB` (top-bottom, default) · `LR` (left-right) · `BT` · `RL` |
| `nodes` | yes | array | See below |
| `edges` | yes | array | See below |
| `swimlanes` | no | array | Optional; groups nodes into horizontal/vertical lanes |
| `metadata` | no | object | Free-form notes; preserved into the .drawio file as a comment |

## Nodes

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | yes | string | Unique within the diagram. Slugs only: `[a-z0-9_-]` |
| `shape` | yes | enum | See shape table below |
| `label` | yes | string | What the box says |
| `style` | no | object | Per-node override. Only set when the theme isn't enough. Mixing themes + per-node `style.*` is rejected by the validator. |
| `lane` | no | string | Lane name from `swimlanes[].name`. Alternative to listing the node id under `swimlanes[].nodes`. |
| `meta` | no | object | Free-form; survives into the .drawio user-object so subsequent edits keep it |

### Shapes — `flow` / `decision` kinds

| `shape` value | What it draws | Use for |
|---|---|---|
| `start` | Rounded green oval | Process start event |
| `end` | Rounded red oval (thick border) | Process end event |
| `task` | Rounded rectangle | A regular step / activity |
| `gateway` | Diamond | Decision / branch — label MUST end with `?` |
| `subprocess` | Rectangle with internal divider | Compound activity (zooms into another flow) |
| `data` | Document shape | Data store / database |
| `document` | Page-fold shape | Document artefact |
| `note` | Sticky note | Side comment, not part of the flow |

### Shapes — `network` kind

| `shape` value | What it draws | Use for |
|---|---|---|
| `internet` | Cloud | Public network boundary |
| `router` | Vendor router icon | L3 device |
| `switch` | Vendor switch icon | L2 device |
| `firewall` | Brick wall icon | Security boundary |
| `load_balancer` | LB icon | Traffic distribution |
| `server` | Tower / rack | Compute |
| `subnet` | Boxed group | Address range; can contain other nodes via `lane: <subnet-name>` |
| `ap` | Wireless access point | Wi-Fi |
| `client` | Workstation | End user device |

When `kind: network`, `meta.vendor` per node picks the icon family:
`aws` · `gcp` · `azure` · `cisco` · `generic` (default).

### Shapes — `sequence` kind

`sequence` diagrams use participants + arrows. Nodes are participants,
edges are messages. The shape field must be `actor` for human stick figures
and `system` for boxed services. Sequence kind is ordered by node array
order, top → bottom; `direction` is ignored.

## Edges

| Field | Required | Type | Notes |
|---|---|---|---|
| `from` | yes | string | Source node id |
| `to` | yes | string | Target node id |
| `label` | no | string | Edge label. For gateway exits this is the answer ("yes" / "no" / "> $5K"). |
| `style` | no | enum | `solid` (default) · `dashed` · `dotted` · `thick` |
| `color` | no | enum | `default` · `accent` · `success` · `warning` · `failure` |
| `arrow` | no | enum | `forward` (default) · `back` · `both` · `none` |

Constraint: every node id referenced in `edges` must exist in `nodes`.
The validator rejects orphan edges before XML emission.

## Swimlanes

```yaml
swimlanes:
  - name: AP team           # human-readable lane label
    direction: vertical     # 'vertical' (default for kind=flow with TB)
                            # | 'horizontal' (default for kind=flow with LR)
    nodes: [start, match]   # ids of nodes that live in this lane
  - name: System
    nodes: [approve, pay, end]
```

Two ways to assign a node to a lane: list it under `swimlanes[].nodes`,
OR set `nodes[].lane: <swimlane-name>`. Both are accepted; the build
script merges them. The same node id in two lanes is a hard error.

## Themes

Themes are fully baked-in palettes. Selecting one applies a coherent
set of fills, strokes, and edge colours so the agent doesn't need to
choose hex values. See `references/styling.md` for the actual palettes.

## Validation rules (enforced by the build script)

1. Every `edges[].from` and `edges[].to` references an existing node id.
2. `kind: flow` and `kind: decision` must have at least one `start` node.
3. Every `gateway` shape has a label ending in `?`.
4. Every gateway has at least 2 outgoing edges, each with a `label`.
5. No node has both `nodes[].style` AND a non-default `theme` set.
6. `swimlanes[].nodes` references existing ids and contains no duplicates.
7. Total node count ≤ 60. Above 25 the script emits a warning ("split
   the diagram"); above 60 it refuses ("unreadable in any layout").

Validation failures return `{ ok: false, errors: [...] }`. The build
script does NOT write a partial file when validation fails.

## Minimal example — one-page flow

```yaml
kind: flow
title: New customer onboarding
theme: tech-blue
nodes:
  - { id: start,  shape: start,    label: Application received }
  - { id: kyc,    shape: task,     label: Run KYC checks }
  - { id: ok,     shape: gateway,  label: KYC clear? }
  - { id: open,   shape: task,     label: Open account }
  - { id: review, shape: task,     label: Send to reviewer }
  - { id: end,    shape: end,      label: Onboarded }
edges:
  - { from: start,  to: kyc }
  - { from: kyc,    to: ok }
  - { from: ok,     to: open,   label: yes }
  - { from: ok,     to: review, label: no }
  - { from: open,   to: end }
  - { from: review, to: end,    label: approved }
```

## Network example

```yaml
kind: network
title: Branch office topology
theme: mono
nodes:
  - { id: net,   shape: internet, label: Internet }
  - { id: fw,    shape: firewall, label: FW-edge,  meta: { vendor: cisco } }
  - { id: r1,    shape: router,   label: R-core,   meta: { vendor: cisco } }
  - { id: sw1,   shape: switch,   label: SW-A,     meta: { vendor: cisco } }
  - { id: sw2,   shape: switch,   label: SW-B,     meta: { vendor: cisco } }
  - { id: srv,   shape: server,   label: app01 }
edges:
  - { from: net, to: fw  }
  - { from: fw,  to: r1  }
  - { from: r1,  to: sw1, label: VLAN 10 }
  - { from: r1,  to: sw2, label: VLAN 20 }
  - { from: sw1, to: srv }
```
