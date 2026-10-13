#!/usr/bin/env node
/**
 * render_flow.js — render a built spec to SVG for in-conversation preview.
 *
 * Usage from node_exec:
 *   const render = require('./scripts/render_flow.js');
 *   const result = render({ spec, outPath: 'preview.svg' });
 *
 * What this is and isn't:
 *   - This is a PREVIEW renderer. drawio's full rendering (orthogonal
 *     edge routing, vendor stencils, exact theming) requires the
 *     drawio web app or Desktop. We can't host either in node_exec.
 *   - What we can do is emit an SVG that's visually close enough for
 *     the user to confirm "yes, that's the diagram I asked for" before
 *     downloading the .drawio for editing.
 *   - For publication-grade SVG, the user opens the .drawio in
 *     draw.io and exports SVG from there. We surface that pointer.
 *
 * Renderer choice: hand-written SVG. Two reasons over going via mxgraph:
 *   1. mxgraph's Node-side rendering wants jsdom + a rasteriser; that's
 *      a heavy load for a preview that's meant to be quick.
 *   2. We control every coordinate from the build script's autoLayout,
 *      so emitting SVG directly is no harder than emitting drawio XML.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const build = require('./build_flow.js');

const SHAPE_RENDERERS = {
  start:      renderEllipse,
  end:        renderEllipseThick,
  task:       renderRoundedRect,
  gateway:    renderDiamond,
  subprocess: renderRoundedRect,
  data:       renderCylinder,
  document:   renderRoundedRect,
  note:       renderRoundedRect,
  internet:   renderCloud,
  router:     renderRoundedRect,
  switch:     renderRoundedRect,
  firewall:   renderRoundedRect,
  load_balancer: renderRoundedRect,
  server:     renderRoundedRect,
  ap:         renderEllipse,
  client:     renderRoundedRect,
  subnet:     renderRoundedRect,
  actor:      renderEllipse,
  system:     renderRoundedRect,
};

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function renderRoundedRect(p, label, fill, stroke, text) {
  const r = 8;
  return [
    `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${r}" ry="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    renderLabel(p, label, text),
  ].join('');
}

function renderEllipse(p, label, fill, stroke, text) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, rx = p.w / 2, ry = p.h / 2;
  return [
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    renderLabel(p, label, text),
  ].join('');
}

function renderEllipseThick(p, label, fill, stroke, text) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, rx = p.w / 2, ry = p.h / 2;
  return [
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`,
    renderLabel(p, label, text),
  ].join('');
}

function renderDiamond(p, label, fill, stroke, text) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const points = `${cx},${p.y} ${p.x + p.w},${cy} ${cx},${p.y + p.h} ${p.x},${cy}`;
  return [
    `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    renderLabel(p, label, text),
  ].join('');
}

function renderCylinder(p, label, fill, stroke, text) {
  // Simple cylinder: rect body + ellipse cap. Visual approximation
  // of drawio's cylinder3 shape.
  const lipR = 8;
  return [
    `<ellipse cx="${p.x + p.w / 2}" cy="${p.y + lipR}" rx="${p.w / 2}" ry="${lipR}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    `<rect x="${p.x}" y="${p.y + lipR}" width="${p.w}" height="${p.h - 2 * lipR}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    `<ellipse cx="${p.x + p.w / 2}" cy="${p.y + p.h - lipR}" rx="${p.w / 2}" ry="${lipR}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
    renderLabel(p, label, text),
  ].join('');
}

function renderCloud(p, label, fill, stroke, text) {
  // Cloud-ish blob — three circles overlapped + a baseline ellipse.
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const r1 = p.h * 0.45, r2 = p.h * 0.4, r3 = p.h * 0.45;
  return [
    `<g fill="${fill}" stroke="${stroke}" stroke-width="1.5">`,
    `  <ellipse cx="${cx - p.w * 0.25}" cy="${cy + p.h * 0.05}" rx="${r1}" ry="${r1 * 0.8}"/>`,
    `  <ellipse cx="${cx + p.w * 0.25}" cy="${cy + p.h * 0.05}" rx="${r3}" ry="${r3 * 0.8}"/>`,
    `  <ellipse cx="${cx}" cy="${cy - p.h * 0.05}" rx="${r2}" ry="${r2 * 0.9}"/>`,
    `</g>`,
    renderLabel(p, label, text),
  ].join('');
}

function renderLabel(p, label, text) {
  // SVG text placement — vertically centred, horizontally centred,
  // wrapped at ~20 chars per line for readability.
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const lines = wrapText(label, 22);
  const lh = 14;
  const startY = cy - ((lines.length - 1) * lh) / 2 + 4;
  return lines.map((line, i) => (
    `<text x="${cx}" y="${startY + i * lh}" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${text}" text-anchor="middle">${escapeXml(line)}</text>`
  )).join('');
}

function wrapText(s, maxChars) {
  const words = String(s ?? '').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur.length > 0) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.length === 0 ? [''] : lines;
}

function renderEdge(e, fromPos, toPos, theme, idx) {
  // Centre-to-centre orthogonal-ish path. We pick an L-shaped route
  // to mimic drawio's orthogonal edge rendering. Good enough for a
  // preview; final routing in drawio will be cleaner.
  const sx = fromPos.x + fromPos.w / 2;
  const sy = fromPos.y + fromPos.h / 2;
  const tx = toPos.x + toPos.w / 2;
  const ty = toPos.y + toPos.h / 2;
  const colour = e.color === 'success' ? '#16A34A'
    : e.color === 'warning' ? '#D97706'
    : e.color === 'failure' ? '#DC2626'
    : (e.color === 'accent' ? theme.edgeAccent : theme.edgeDefault);
  // L-shape: vertical then horizontal (or vice versa depending on direction).
  // For TB layouts the parent is above, so go down then across.
  const midY = (sy + ty) / 2;
  const path = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
  const dash = e.style === 'dashed' ? 'stroke-dasharray="6 4"' : (e.style === 'dotted' ? 'stroke-dasharray="2 3"' : '');
  const width = e.style === 'thick' ? 2 : 1.5;
  const arrowId = `arrow-${idx}`;
  const labelEls = e.label
    ? `<text x="${(sx + tx) / 2}" y="${midY - 4}" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="${colour}" text-anchor="middle">${escapeXml(e.label)}</text>`
    : '';
  return [
    `<defs><marker id="${arrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${colour}"/></marker></defs>`,
    `<path d="${path}" stroke="${colour}" stroke-width="${width}" fill="none" ${dash} marker-end="url(#${arrowId})"/>`,
    labelEls,
  ].join('');
}

function render(args) {
  const built = build({ spec: args.spec });
  if (!built.ok) {
    return { ok: false, errors: built.errors, warnings: built.warnings };
  }
  // Reuse the build script's layout so .drawio and .svg agree on
  // every coordinate — single source of truth.
  const theme = build.THEMES[args.spec.theme || 'tech-blue'];
  const positions = build.autoLayout(args.spec, theme);

  // Compute viewBox bounds.
  let maxX = 0, maxY = 0;
  for (const p of positions.values()) {
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  }
  const W = maxX + 60, H = maxY + 60;

  // Emit SVG.
  const cells = [];
  for (const n of args.spec.nodes) {
    const p = positions.get(n.id);
    if (!p) continue;
    const fill = n.shape === 'start' ? theme.fillStart
      : n.shape === 'end' ? theme.fillEnd
      : theme.fillBase;
    const text = (n.shape === 'start' || n.shape === 'end') ? theme.textInverse : theme.text;
    const renderer = SHAPE_RENDERERS[n.shape] ?? renderRoundedRect;
    cells.push(renderer(p, n.label, fill, theme.stroke, text));
  }
  args.spec.edges.forEach((e, i) => {
    const fromPos = positions.get(e.from);
    const toPos = positions.get(e.to);
    if (!fromPos || !toPos) return;
    cells.push(renderEdge(e, fromPos, toPos, theme, i));
  });

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="${W}" height="${H}" fill="${theme.laneFill || '#FFFFFF'}"/>`,
    cells.join('\n'),
    `</svg>`,
  ].join('\n');

  if (args.outPath) {
    const dir = path.dirname(args.outPath);
    if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(args.outPath, svg, 'utf8');
  }
  return { ok: true, svg, path: args.outPath, warnings: built.warnings };
}

module.exports = render;
