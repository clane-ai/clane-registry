# draw.io XML primer

You only need this when modifying an uploaded `.drawio` file. For
authoring from scratch, use `scripts/build_flow.js` and skip this doc.

## File anatomy

A `.drawio` file is XML. The root is `<mxfile>` with one or more
`<diagram>` children (one per page). Each diagram contains a
zlib-compressed `<mxGraphModel>` payload — but draw.io also accepts
uncompressed inline XML, which is what the build script emits because
it's easier to diff and patch.

```xml
<mxfile host="app.diagrams.net" type="device">
  <diagram name="Page-1" id="default">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" page="1" pageWidth="827" pageHeight="1169">
      <root>
        <mxCell id="0"/>                                  <!-- root cell, never delete -->
        <mxCell id="1" parent="0"/>                       <!-- default layer, never delete -->

        <!-- A node -->
        <mxCell id="n-start" value="Start" vertex="1" parent="1"
                style="ellipse;fillColor=#0891B2;strokeColor=#0F172A;fontColor=#FFFFFF;">
          <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
        </mxCell>

        <!-- An edge between two nodes -->
        <mxCell id="e1" edge="1" source="n-start" target="n-task" parent="1"
                style="endArrow=classic;html=1;rounded=0;">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

## Cell identity

`mxCell` is the universal unit. Two flavours:

- `vertex="1"` → a node (box, circle, custom shape).
- `edge="1"` → an edge between two cells. References them by id via
  `source="..." target="..."`.

Cell ids must be unique within a diagram. The build script prefixes
node ids with `n-` and edge ids with `e-` to avoid collision with the
two reserved cells (`0` and `1`).

## Geometry

Vertices need `<mxGeometry x y width height as="geometry"/>`. Edges
need `<mxGeometry relative="1" as="geometry"/>`; their actual visual
path is derived from the source/target cell positions plus optional
waypoints in `<Array as="points">`.

Coordinates are page-space pixels with origin at the top-left.

## Style strings

The `style="..."` attribute is a semicolon-delimited bag of
key=value pairs. There's no schema — values are mostly hex colours,
font sizes, and shape names from drawio's library.

Common keys:

| Key | Used by | Example |
|---|---|---|
| `shape` | vertex | `shape=mxgraph.flowchart.start_2` |
| `fillColor` | vertex | `fillColor=#E0F2FE` |
| `strokeColor` | vertex / edge | `strokeColor=#0F172A` |
| `fontColor` | vertex / edge | `fontColor=#0F172A` |
| `fontSize` | vertex / edge | `fontSize=12` |
| `fontStyle` | vertex / edge | `fontStyle=1` (bold) · `2` (italic) · `4` (underline). Sum bits. |
| `rounded` | vertex | `rounded=1` (rounded rectangle) |
| `dashed` | edge | `dashed=1` |
| `endArrow` | edge | `endArrow=classic` (default) · `none` · `block` |
| `endFill` | edge | `endFill=1` (filled head) |
| `edgeStyle` | edge | `orthogonalEdgeStyle` (right-angle routing) |
| `html` | both | `html=1` (allow HTML in label — set by default for multi-line labels) |

## Editing patterns

### Add a node

Add an `mxCell` with `vertex="1"` and `parent="1"`. Pick an unused id.

### Add an edge

Add an `mxCell` with `edge="1"`, `source="<existing-id>"`,
`target="<existing-id>"`. The geometry is `relative="1"` — drawio
computes the path.

### Move a node

Edit the `<mxGeometry>` inside that node's mxCell. Change `x` / `y`
only — don't touch `width` / `height` unless the user asked to resize.

### Add a waypoint to an edge

Insert an `<Array as="points">` under the edge's `<mxGeometry>`:

```xml
<mxGeometry relative="1" as="geometry">
  <Array as="points">
    <mxPoint x="300" y="200"/>
  </Array>
</mxGeometry>
```

drawio will route the edge through that point.

### Multi-page diagram

Add a second `<diagram name="Page-2" id="page2">` sibling under the
`<mxfile>`. Each page has its own `<mxGraphModel>` and `<root>`. The
build script ships single-page only; multi-page edits are manual.

## What to avoid

- **Never delete `mxCell` id `0` or `1`**. They're the root and the
  default layer. Removing them breaks the file.
- **Never put a vertex inside an edge's `<mxGeometry>`** — they're
  separate cells, joined by id reference.
- **Don't compress the inner `<mxGraphModel>`** when emitting from a
  script. drawio's compressed format is `pako` zlib-deflate base64,
  fiddly and unreviewable in PRs. Inline XML is fine.

## Loading and saving from Node

The `mxgraph` npm package (preloaded in the sandbox) parses drawio
XML into an in-memory model. For one-shot edits, regex / DOM-string
edits are usually less work. For structural changes (adding many
nodes, repositioning whole layers), use mxgraph's API:

```js
const mxgraph = require('mxgraph')({ mxImageBasePath: '', mxBasePath: '' });
const { mxCodec, mxUtils, mxGraphModel } = mxgraph;
const doc = mxUtils.parseXml(xmlString);
const codec = new mxCodec(doc);
const model = new mxGraphModel();
codec.decode(doc.documentElement, model);
// ... mutate model ...
const out = codec.encode(model);
const xmlOut = mxUtils.getXml(out);
```

For the build script's purposes, hand-emitting XML strings is simpler
and produces cleaner output than round-tripping through mxgraph.
