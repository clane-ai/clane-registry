# Pattern library

When the user asks for a particular kind of flow, reach for the
matching pattern below. Each pattern is a starter spec — adapt the
node labels and edge labels to the specific scenario.

## BPMN-style approval flow

Standard "request → check → branch → action" pattern.

```yaml
kind: flow
title: <Process name>
theme: tech-blue
nodes:
  - { id: start,    shape: start,      label: <Trigger event> }
  - { id: check,    shape: task,       label: <Validation step> }
  - { id: gate,     shape: gateway,    label: <Question?> }
  - { id: happy,    shape: task,       label: <Happy-path action> }
  - { id: sad,      shape: task,       label: <Exception action> }
  - { id: complete, shape: end,        label: <Outcome> }
edges:
  - { from: start,  to: check }
  - { from: check,  to: gate }
  - { from: gate,   to: happy, label: <yes-condition> }
  - { from: gate,   to: sad,   label: <no-condition> }
  - { from: happy,  to: complete }
  - { from: sad,    to: complete }
```

## Cross-team handoff (swimlanes)

Two-or-more actors passing work between them.

```yaml
kind: flow
title: <Cross-team process>
direction: TB
swimlanes:
  - { name: <Team A>, nodes: [a1, a2] }
  - { name: <Team B>, nodes: [b1] }
  - { name: System,   nodes: [s1, s2] }
nodes:
  - { id: a1, shape: start,   label: <Trigger> }
  - { id: a2, shape: task,    label: <Team A action> }
  - { id: b1, shape: task,    label: <Team B action> }
  - { id: s1, shape: task,    label: <System action> }
  - { id: s2, shape: end,     label: Done }
edges:
  - { from: a1, to: a2 }
  - { from: a2, to: b1, label: hand off }
  - { from: b1, to: s1, label: trigger }
  - { from: s1, to: s2 }
```

## Decision tree (deeper branching)

Three-way branches, multiple gates. Use `kind: decision` so the script
optimises layout for branchiness.

```yaml
kind: decision
title: <Decision name>
nodes:
  - { id: start,  shape: start,   label: <Trigger> }
  - { id: g1,     shape: gateway, label: <Top-level question?> }
  - { id: g2,     shape: gateway, label: <Sub-question?> }
  - { id: a,      shape: task,    label: <Branch A action> }
  - { id: b,      shape: task,    label: <Branch B action> }
  - { id: c,      shape: task,    label: <Branch C action> }
  - { id: end,    shape: end,     label: Decision recorded }
edges:
  - { from: start, to: g1 }
  - { from: g1,    to: a,  label: <answer A> }
  - { from: g1,    to: g2, label: <answer to subgate> }
  - { from: g2,    to: b,  label: <answer B> }
  - { from: g2,    to: c,  label: <answer C> }
  - { from: a,     to: end }
  - { from: b,     to: end }
  - { from: c,     to: end }
```

## Sequence flow (system-to-system messaging)

Use `kind: sequence` when the relationship between participants is
ordered messages, not control flow. Edge `label` is the message name;
`style: dashed` indicates an async / fire-and-forget message.

```yaml
kind: sequence
title: <Interaction name>
nodes:
  - { id: client,  shape: actor,  label: Client }
  - { id: api,     shape: system, label: API }
  - { id: queue,   shape: system, label: Queue }
  - { id: worker,  shape: system, label: Worker }
edges:
  - { from: client, to: api,    label: POST /resource }
  - { from: api,    to: queue,  label: enqueue, style: dashed }
  - { from: api,    to: client, label: 202 Accepted }
  - { from: queue,  to: worker, label: dequeue }
  - { from: worker, to: api,    label: callback, style: dashed }
```

## Network topology

`kind: network` swaps the geometric shapes for vendor icons and uses a
star/hub-and-spoke layout by default.

### Branch office (small)

```yaml
kind: network
title: <Branch site> — topology
theme: mono
nodes:
  - { id: net, shape: internet, label: Internet }
  - { id: fw,  shape: firewall, label: <FW model>,    meta: { vendor: cisco } }
  - { id: r1,  shape: router,   label: <Router name>, meta: { vendor: cisco } }
  - { id: ap,  shape: ap,       label: <Wi-Fi> }
  - { id: sw1, shape: switch,   label: <Switch>,      meta: { vendor: cisco } }
edges:
  - { from: net, to: fw  }
  - { from: fw,  to: r1  }
  - { from: r1,  to: ap,  label: VLAN <Wi-Fi> }
  - { from: r1,  to: sw1, label: VLAN <Wired> }
```

### AWS three-tier web app

```yaml
kind: network
title: <App name> — AWS architecture
theme: tech-blue
nodes:
  - { id: users, shape: client,        label: Users }
  - { id: cf,    shape: load_balancer, label: CloudFront,        meta: { vendor: aws } }
  - { id: alb,   shape: load_balancer, label: ALB,               meta: { vendor: aws } }
  - { id: ec2a,  shape: server,        label: EC2 (web fleet),   meta: { vendor: aws } }
  - { id: ec2b,  shape: server,        label: EC2 (api fleet),   meta: { vendor: aws } }
  - { id: rds,   shape: data,          label: RDS Postgres,      meta: { vendor: aws } }
edges:
  - { from: users, to: cf  }
  - { from: cf,    to: alb }
  - { from: alb,   to: ec2a, label: 80/443 }
  - { from: alb,   to: ec2b, label: 80/443 }
  - { from: ec2b,  to: rds,  label: 5432 }
```

## Mermaid → drawio quick map

Most Mermaid `flowchart` diagrams translate one-for-one. Use this
table when converting an existing Mermaid block.

| Mermaid | drawio spec |
|---|---|
| `A([Start])` | `{ shape: start }` |
| `A([End])` | `{ shape: end }` |
| `A[Task]` | `{ shape: task }` |
| `A{Decision?}` | `{ shape: gateway }` |
| `A[[Subprocess]]` | `{ shape: subprocess }` |
| `A[(Database)]` | `{ shape: data }` |
| `A --> B` | `{ from: A, to: B }` |
| `A -->|yes| B` | `{ from: A, to: B, label: yes }` |
| `A -.-> B` | `{ from: A, to: B, style: dashed }` |
| `A ==> B` | `{ from: A, to: B, style: thick }` |
| `subgraph "lane"` … `end` | `swimlanes:` entry |

## Anti-patterns — refuse these

- **Single 50-node mega-diagram**: split into a master + sub-flows.
- **Gateway with no `?` in the label**: rename or use `task` shape.
- **Edges with no label out of a gateway**: every branch must say what
  the answer was.
- **Mixing per-node `style` overrides with a non-default theme**: pick one.
- **Network kind without vendor icons**: if there's no `meta.vendor`,
  the script falls back to generic shapes — fine for a quick sketch,
  but flag this to the user so they know to set vendors for production
  diagrams.
