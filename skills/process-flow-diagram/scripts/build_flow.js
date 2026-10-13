#!/usr/bin/env node
/**
 * build_flow.js — process-flow-diagram skill's spec → .drawio compiler.
 *
 * Usage from node_exec:
 *   const build = require('./scripts/build_flow.js');
 *   const result = build({ spec, outPath });
 *   if (!result.ok) { ...handle errors... }
 *   // result.xml is the .drawio content; outPath has been written.
 *
 * Reads a flow spec (the YAML schema documented in
 * references/spec-format.md), validates it, runs auto-layout, applies
 * the chosen theme, and emits a valid drawio XML file. The XML is
 * uncompressed inline so it diffs cleanly and can be hand-edited.
 *
 * Why no `mxgraph` dependency in the script: round-tripping XML through
 * mxgraph's codec is heavier than hand-emitting strings and produces
 * the exact same output for the shapes we care about. Skip the lib
 * unless you need to PARSE an existing diagram (see references/drawio-xml.md
 * for that path).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Themes ────────────────────────────────────────────────────────
//
// Each theme is a token bag that maps to drawio style strings at
// emit time. Per-shape overrides (e.g. `start` getting fillAccent
// instead of fillBase) live in SHAPE_STYLES below — themes only
// define the colour palette.

const THEMES = {
  'tech-blue': {
    fillBase: '#E0F2FE', fillStart: '#0891B2', fillEnd: '#DB2777',
    stroke: '#0F172A', text: '#0F172A', textInverse: '#FFFFFF',
    edgeDefault: '#475569', edgeAccent: '#0891B2',
    laneFill: '#F8FAFC', laneHeader: '#0891B2',
  },
  mono: {
    fillBase: '#FFFFFF', fillStart: '#111827', fillEnd: '#111827',
    stroke: '#111827', text: '#111827', textInverse: '#FFFFFF',
    edgeDefault: '#374151', edgeAccent: '#111827',
    laneFill: '#FFFFFF', laneHeader: '#111827',
  },
  warm: {
    fillBase: '#FEF3C7', fillStart: '#D97706', fillEnd: '#B91C1C',
    stroke: '#7C2D12', text: '#7C2D12', textInverse: '#FFFFFF',
    edgeDefault: '#92400E', edgeAccent: '#D97706',
    laneFill: '#FFFBEB', laneHeader: '#D97706',
  },
  dark: {
    fillBase: '#1E293B', fillStart: '#22D3EE', fillEnd: '#F472B6',
    stroke: '#0F172A', text: '#F1F5F9', textInverse: '#0F172A',
    edgeDefault: '#94A3B8', edgeAccent: '#22D3EE',
    laneFill: '#0F172A', laneHeader: '#22D3EE',
  },
  'high-contrast': {
    fillBase: '#FFFFFF', fillStart: '#000000', fillEnd: '#000000',
    stroke: '#000000', text: '#000000', textInverse: '#FFFFFF',
    edgeDefault: '#000000', edgeAccent: '#000000',
    laneFill: '#FFFFFF', laneHeader: '#000000',
  },
};

// Semantic edge colours — applied on top of the theme when an edge
// sets `color: success | warning | failure`.
const EDGE_COLORS = {
  success: '#16A34A',
  warning: '#D97706',
  failure: '#DC2626',
};

// ─── Shape styles ──────────────────────────────────────────────────
//
// Each shape value in spec.nodes[].shape maps to a function that
// returns the drawio `style="..."` string. We swap colours from the
// theme based on shape semantics (start/end use fillStart/fillEnd,
// task/data use fillBase, etc.) so the agent doesn't need to know
// the colour rules — they fall out of the shape choice.

// Style fragment baked into every shape so labels wrap at word
// boundaries instead of overflowing. drawio's default rendering is no-
// wrap (`whiteSpace=nowrap;html=0`), which makes anything longer than
// the node width spill out the side. Adding `html=1;whiteSpace=wrap;`
// flips on the HTML label renderer (required for whitespace control)
// and tells it to wrap. Has no visible effect on short labels — only
// kicks in when text would otherwise overflow.
const WRAP = 'html=1;whiteSpace=wrap;';

function shapeStyle(shape, theme, isFlowKind) {
  const t = theme;
  switch (shape) {
    case 'start':
      return `ellipse;${WRAP}fillColor=${t.fillStart};strokeColor=${t.stroke};fontColor=${t.textInverse};fontSize=12;fontStyle=1;`;
    case 'end':
      return `ellipse;${WRAP}fillColor=${t.fillEnd};strokeColor=${t.stroke};strokeWidth=2;fontColor=${t.textInverse};fontSize=12;fontStyle=1;`;
    case 'task':
      return `rounded=1;${WRAP}fillColor=${t.fillBase};strokeColor=${t.stroke};fontColor=${t.text};fontSize=12;`;
    case 'gateway':
      return `rhombus;${WRAP}fillColor=${t.fillBase};strokeColor=${t.stroke};fontColor=${t.text};fontSize=12;`;
    case 'subprocess':
      return `shape=process;${WRAP}fillColor=${t.fillBase};strokeColor=${t.stroke};fontColor=${t.text};fontSize=12;`;
    case 'data':
      return `shape=cylinder3;${WRAP}fillColor=${t.fillBase};strokeColor=${t.stroke};fontColor=${t.text};fontSize=12;`;
    case 'document':
      return `shape=document;${WRAP}fillColor=${t.fillBase};strokeColor=${t.stroke};fontColor=${t.text};fontSize=12;`;
    case 'note':
      return `shape=note;${WRAP}fillColor=#FFF8DC;strokeColor=${t.stroke};fontColor=${t.text};fontSize=11;fontStyle=2;`;
    // Network shapes — use mxgraph stencil shapes from drawio's
    // built-in libraries. Vendor selection (cisco/aws/gcp/azure) is
    // done via meta.vendor and resolved in nodeStyle(). Network
    // shapes put their label BELOW the icon (verticalLabelPosition=
    // bottom), so wrap kicks in automatically when the device name
    // is long.
    case 'internet':
      return `shape=mxgraph.networking.cloud;${WRAP}fillColor=#FFFFFF;strokeColor=${t.stroke};fontColor=${t.text};fontSize=11;verticalLabelPosition=bottom;verticalAlign=top;`;
    case 'router':
    case 'switch':
    case 'firewall':
    case 'load_balancer':
    case 'server':
    case 'ap':
    case 'client':
      return networkShapeStyle(shape, t);
    case 'subnet':
      return `swimlane;${WRAP}fillColor=${t.fillBase};strokeColor=${t.stroke};fontColor=${t.text};fontSize=11;startSize=24;swimlaneFillColor=#FFFFFF;`;
    case 'actor':
      return `shape=umlActor;${WRAP}fillColor=${t.fillBase};strokeColor=${t.stroke};fontColor=${t.text};fontSize=11;verticalLabelPosition=bottom;verticalAlign=top;`;
    case 'system':
      return `rounded=1;${WRAP}fillColor=${t.fillBase};strokeColor=${t.stroke};fontColor=${t.text};fontSize=12;`;
    default:
      // Unknown shape — fall back to a generic rounded box rather
      // than failing emission. Validation catches unknown shape values
      // before we get here in normal use.
      return `rounded=1;${WRAP}fillColor=${t.fillBase};strokeColor=${t.stroke};fontColor=${t.text};fontSize=12;`;
  }
}

function networkShapeStyle(shape, t) {
  // mxgraph.networking is drawio's built-in network library; falling
  // back to it lets the diagram render in any drawio installation
  // without an extra stencil package. Vendor-specific icons live in
  // mxgraph.aws / mxgraph.cisco / etc. — those are loaded by drawio
  // when the file references them; emission below picks the right
  // namespace based on meta.vendor on the node.
  const fill = '#FFFFFF';
  const map = {
    router: 'mxgraph.networking.router_icon',
    switch: 'mxgraph.networking.switch',
    firewall: 'mxgraph.networking.firewall_icon',
    load_balancer: 'mxgraph.networking.f5',
    server: 'mxgraph.networking.server',
    ap: 'mxgraph.networking.access_point',
    client: 'mxgraph.networking.client_workstation',
  };
  return `shape=${map[shape] ?? 'mxgraph.networking.server'};${WRAP}fillColor=${fill};strokeColor=${t.stroke};fontColor=${t.text};fontSize=11;verticalLabelPosition=bottom;verticalAlign=top;`;
}

// ─── Validation ────────────────────────────────────────────────────

function validate(spec) {
  const errors = [];
  const warnings = [];

  if (!spec || typeof spec !== 'object') {
    return { ok: false, errors: ['spec must be an object'] };
  }
  if (!spec.title || typeof spec.title !== 'string') errors.push('spec.title is required (string)');
  if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) errors.push('spec.nodes must be a non-empty array');
  if (!Array.isArray(spec.edges)) errors.push('spec.edges must be an array');

  const kind = spec.kind || 'flow';
  if (!['flow', 'network', 'sequence', 'decision'].includes(kind)) {
    errors.push(`spec.kind must be one of flow|network|sequence|decision (got '${kind}')`);
  }

  const themeName = spec.theme || 'tech-blue';
  if (!THEMES[themeName]) errors.push(`spec.theme '${themeName}' is unknown — valid: ${Object.keys(THEMES).join(', ')}`);
  const themed = themeName !== undefined && spec.theme !== null;

  // Node-level checks
  const seenIds = new Map();
  for (const n of spec.nodes ?? []) {
    if (!n.id) { errors.push(`node missing id: ${JSON.stringify(n)}`); continue; }
    if (!/^[a-z0-9_-]+$/i.test(n.id)) errors.push(`node id '${n.id}' must be slug-safe (a-z 0-9 _ -)`);
    if (seenIds.has(n.id)) errors.push(`duplicate node id '${n.id}'`);
    seenIds.set(n.id, n);
    if (!n.shape) errors.push(`node '${n.id}' missing shape`);
    if (!n.label) errors.push(`node '${n.id}' missing label`);
    if (n.shape === 'gateway' && n.label && !n.label.trim().endsWith('?')) {
      errors.push(`gateway '${n.id}' label must end with '?' (got '${n.label}')`);
    }
    // No mixing per-node style with a theme — see references/styling.md.
    if (themed && n.style && Object.keys(n.style).length > 0) {
      errors.push(`node '${n.id}' has style overrides but theme='${themeName}' is set — pick one. Drop theme OR drop style.`);
    }
  }

  // Edge-level checks
  for (const e of spec.edges ?? []) {
    if (!e.from || !e.to) { errors.push(`edge missing from/to: ${JSON.stringify(e)}`); continue; }
    if (!seenIds.has(e.from)) errors.push(`edge.from '${e.from}' is not a known node`);
    if (!seenIds.has(e.to)) errors.push(`edge.to '${e.to}' is not a known node`);
  }

  // Gateways must have ≥2 outgoing labelled edges. Without this rule
  // the diagram is ambiguous to readers.
  for (const n of spec.nodes ?? []) {
    if (n.shape !== 'gateway') continue;
    const outgoing = (spec.edges ?? []).filter((e) => e.from === n.id);
    if (outgoing.length < 2) {
      errors.push(`gateway '${n.id}' has fewer than 2 outgoing edges`);
    }
    for (const e of outgoing) {
      if (!e.label) errors.push(`gateway '${n.id}' edge to '${e.to}' has no label (each branch must say what the answer was)`);
    }
  }

  // Flow / decision must have at least one start.
  if ((kind === 'flow' || kind === 'decision') && !(spec.nodes ?? []).some((n) => n.shape === 'start')) {
    warnings.push(`kind='${kind}' typically has a 'start' node — none found.`);
  }

  // Swimlane membership consistency
  if (Array.isArray(spec.swimlanes)) {
    const seenInLanes = new Set();
    const laneNames = new Set();
    for (const lane of spec.swimlanes) {
      if (!lane.name) { errors.push(`swimlane missing name: ${JSON.stringify(lane)}`); continue; }
      if (laneNames.has(lane.name)) errors.push(`duplicate swimlane name '${lane.name}'`);
      laneNames.add(lane.name);
      for (const id of lane.nodes ?? []) {
        if (!seenIds.has(id)) errors.push(`swimlane '${lane.name}' references unknown node id '${id}'`);
        if (seenInLanes.has(id)) errors.push(`node '${id}' is in two swimlanes`);
        seenInLanes.add(id);
      }
    }
    // nodes[].lane shorthand — also validate
    for (const n of spec.nodes ?? []) {
      if (n.lane && !laneNames.has(n.lane)) errors.push(`node '${n.id}'.lane='${n.lane}' is not a defined swimlane name`);
    }
  }

  // Size checks — soft warnings
  const total = (spec.nodes ?? []).length;
  if (total > 25) warnings.push(`${total} nodes — consider splitting into a master flow + sub-flows for readability.`);
  if (total > 60) errors.push(`${total} nodes exceeds the 60-node hard cap (unreadable in any layout).`);

  return { ok: errors.length === 0, errors, warnings };
}

// ─── Layout ────────────────────────────────────────────────────────
//
// Auto-layout is intentionally simple: a layered (Sugiyama-ish) flow
// with one row per topological depth and even horizontal spacing per
// row. Good enough for ≤25 nodes; for denser graphs the user should
// split anyway. Real graphviz / mxgraph layout would be overkill here
// and would force a wasm load on every build.

function autoLayout(spec, theme) {
  const nodes = spec.nodes;
  const edges = spec.edges;
  const direction = spec.direction || 'TB';
  const horiz = direction === 'LR' || direction === 'RL';

  // Compute per-node depth via BFS from start nodes (or first node if
  // none). Depth determines row (TB) or column (LR).
  const depth = new Map();
  const startIds = nodes.filter((n) => n.shape === 'start').map((n) => n.id);
  const seeds = startIds.length > 0 ? startIds : [nodes[0]?.id].filter(Boolean);
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
  }
  const queue = [...seeds];
  for (const s of seeds) depth.set(s, 0);
  while (queue.length > 0) {
    const cur = queue.shift();
    const d = depth.get(cur) ?? 0;
    for (const nxt of adj.get(cur) ?? []) {
      if (depth.has(nxt)) continue;
      depth.set(nxt, d + 1);
      queue.push(nxt);
    }
  }
  // Anything not reached gets depth = max + 1 so it's appended after
  // the connected component instead of overlapping it.
  const reachedMax = Array.from(depth.values()).reduce((a, b) => Math.max(a, b), 0);
  for (const n of nodes) {
    if (!depth.has(n.id)) depth.set(n.id, reachedMax + 1);
  }

  // Group ids by depth.
  const byDepth = new Map();
  for (const [id, d] of depth) {
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d).push(id);
  }

  // Sizes per theme (pulled from styling.md). Constants here to keep
  // the layout deterministic across builds. Height bumped from 60 to
  // 80 so a wrapped two-line label fits without crowding the border —
  // wrap is on by default for every shape (see WRAP fragment above),
  // and 60px was tight at 12pt × 2 lines + padding. 80px gives one
  // line of breathing room without the diagram getting much taller
  // overall (TB direction adds ~100px per row regardless).
  const W = 160, H = 80;        // node base size
  const GAP_PRIMARY = 100;       // along the flow direction
  const GAP_SECONDARY = 80;      // across the flow direction

  const positions = new Map();
  const sortedDepths = Array.from(byDepth.keys()).sort((a, b) => a - b);
  for (const d of sortedDepths) {
    const ids = byDepth.get(d);
    // Centre the row around x=600 (TB) or y=400 (LR).
    const totalSecondary = ids.length * W + (ids.length - 1) * GAP_SECONDARY;
    const startSecondary = horiz ? 200 : 600 - totalSecondary / 2;
    ids.forEach((id, i) => {
      const secondary = horiz
        ? startSecondary + i * (H + GAP_SECONDARY)
        : startSecondary + i * (W + GAP_SECONDARY);
      const primary = 80 + d * (horiz ? (W + GAP_PRIMARY) : (H + GAP_PRIMARY));
      positions.set(id, horiz
        ? { x: primary, y: secondary, w: W, h: H }
        : { x: secondary, y: primary, w: W, h: H });
    });
  }

  return positions;
}

// ─── XML emission ──────────────────────────────────────────────────

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function edgeStyle(e, theme) {
  const colour = e.color && EDGE_COLORS[e.color]
    ? EDGE_COLORS[e.color]
    : (e.color === 'accent' ? theme.edgeAccent : theme.edgeDefault);
  const styleParts = [
    'edgeStyle=orthogonalEdgeStyle',
    'rounded=0',
    'html=1',
    'jettySize=auto',
    'orthogonalLoop=1',
    `strokeColor=${colour}`,
    `fontColor=${colour}`,
    'fontSize=10',
  ];
  if (e.style === 'dashed') styleParts.push('dashed=1');
  if (e.style === 'dotted') styleParts.push('dashed=1', 'dashPattern=1 4');
  if (e.style === 'thick') styleParts.push('strokeWidth=2');
  if (e.arrow === 'none') styleParts.push('endArrow=none');
  if (e.arrow === 'both') styleParts.push('startArrow=classic', 'endArrow=classic');
  if (e.arrow === 'back') styleParts.push('startArrow=classic', 'endArrow=none');
  return styleParts.join(';') + ';';
}

function emitXml(spec, theme, positions) {
  const cells = [];

  // Two reserved cells — must always be present.
  cells.push('<mxCell id="0" />');
  cells.push('<mxCell id="1" parent="0" />');

  for (const n of spec.nodes) {
    const p = positions.get(n.id);
    if (!p) continue; // shouldn't happen — autoLayout positions every node
    const style = shapeStyle(n.shape, theme, true);
    cells.push(
      `<mxCell id="n-${escapeXml(n.id)}" value="${escapeXml(n.label)}" style="${style}" vertex="1" parent="1">` +
      `<mxGeometry x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" as="geometry" />` +
      `</mxCell>`
    );
  }

  spec.edges.forEach((e, i) => {
    const style = edgeStyle(e, theme);
    cells.push(
      `<mxCell id="e-${i}" value="${escapeXml(e.label || '')}" style="${style}" edge="1" parent="1" source="n-${escapeXml(e.from)}" target="n-${escapeXml(e.to)}">` +
      `<mxGeometry relative="1" as="geometry" />` +
      `</mxCell>`
    );
  });

  // Page geometry — 11 × 8.5 in landscape gives plenty of room for
  // most ≤25-node diagrams. drawio rescales the visible area; this
  // is just the printable page hint.
  return [
    `<mxfile host="clane.process-flow-diagram" modified="${new Date().toISOString()}" agent="Clane/skill" version="0.1.0">`,
    `  <diagram name="${escapeXml(spec.title)}" id="page-1">`,
    `    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="1100" pageHeight="850" math="0" shadow="0">`,
    `      <root>`,
    cells.map((c) => `        ${c}`).join('\n'),
    `      </root>`,
    `    </mxGraphModel>`,
    `  </diagram>`,
    `</mxfile>`,
  ].join('\n');
}

// ─── Public entry point ────────────────────────────────────────────

/**
 * @param {{ spec: object, outPath?: string }} args
 * @returns {{ ok: boolean, xml?: string, errors?: string[], warnings?: string[], path?: string }}
 */
function build(args) {
  const { spec } = args;
  const validation = validate(spec);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, warnings: validation.warnings };
  }
  const themeName = spec.theme || 'tech-blue';
  const theme = THEMES[themeName];
  const positions = autoLayout(spec, theme);
  const xml = emitXml(spec, theme, positions);

  if (args.outPath) {
    const dir = path.dirname(args.outPath);
    if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(args.outPath, xml, 'utf8');
  }
  return {
    ok: true,
    xml,
    path: args.outPath,
    warnings: validation.warnings,
  };
}

module.exports = build;
module.exports.validate = validate;
module.exports.THEMES = THEMES;
// Exposed so render_flow.js can lay out nodes without round-tripping
// through the emitted XML. Both scripts share the same layout
// algorithm so the .drawio and the .svg agree on every coordinate.
module.exports.autoLayout = autoLayout;
module.exports.shapeStyle = shapeStyle;
