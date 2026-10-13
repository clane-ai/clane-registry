# Styling reference

How the build script applies themes and what each theme looks like.
Read this only when the user wants branded output, when they reject the
default theme, or when the validator complains about mixed styling.

## Theme palettes

Every theme defines six tokens. Per-node `style` fields can override
specific tokens but you cannot mix-and-match per-node colours with a
themed default — pick one approach per diagram.

| Token | Purpose |
|---|---|
| `fillBase` | Default node fill |
| `fillAccent` | Highlighted nodes (start, end, primary action) |
| `stroke` | Borders |
| `text` | Label colour |
| `edgeDefault` | Regular arrows |
| `edgeAccent` | Highlighted arrows (happy path) |

### `tech-blue` (default)

| Token | Hex |
|---|---|
| fillBase | `#E0F2FE` |
| fillAccent | `#0891B2` (start), `#DB2777` (end) |
| stroke | `#0F172A` |
| text | `#0F172A` |
| edgeDefault | `#475569` |
| edgeAccent | `#0891B2` |

Use for engineering / systems diagrams. Reads well at slide scale.

### `mono`

| Token | Hex |
|---|---|
| fillBase | `#FFFFFF` |
| fillAccent | `#111827` (start/end inverse) |
| stroke | `#111827` |
| text | `#111827` |
| edgeDefault | `#374151` |
| edgeAccent | `#111827` |

Use for academic papers, IEEE-style figures, anywhere you want a
print-safe black-and-white look.

### `warm`

| Token | Hex |
|---|---|
| fillBase | `#FEF3C7` |
| fillAccent | `#D97706` (start), `#B91C1C` (end) |
| stroke | `#7C2D12` |
| text | `#7C2D12` |
| edgeDefault | `#92400E` |
| edgeAccent | `#D97706` |

Use for organisational / people-centric flows. Less clinical than
`tech-blue`.

### `dark`

| Token | Hex |
|---|---|
| fillBase | `#1E293B` |
| fillAccent | `#22D3EE` (start), `#F472B6` (end) |
| stroke | `#0F172A` |
| text | `#F1F5F9` |
| edgeDefault | `#94A3B8` |
| edgeAccent | `#22D3EE` |

Use for embedding in dark-mode docs / dashboards.

### `high-contrast`

| Token | Hex |
|---|---|
| fillBase | `#FFFFFF` |
| fillAccent | `#000000` (start/end inverse) |
| stroke | `#000000` |
| text | `#000000` |
| edgeDefault | `#000000` |
| edgeAccent | `#000000` |

For accessibility — passes WCAG AAA at any size. No colour-coding info
(stroke weight + position carry the meaning).

## Per-node overrides (when allowed)

If you set `theme: <name>` AND any node has a `style:` block, the
validator rejects the spec. Two ways to apply per-node styling:

1. **Pick a theme and override only with semantic edge colours**:
   ```yaml
   theme: tech-blue
   edges:
     - { from: a, to: b, color: success }    # picks edgeAccent in green
     - { from: a, to: c, color: failure }    # picks failure red
   ```
   Edge `color` overrides ARE allowed even when a theme is set — they
   apply pre-defined semantic colours that compose with the theme.

2. **No theme; full per-node control**:
   ```yaml
   # No `theme:` field at all
   nodes:
     - { id: ..., style: { fill: "#E0F2FE", stroke: "#0F172A" } }
   ```
   Now you own every colour. Use this only when the user provides a
   brand palette.

## Edge colour semantics

When `theme:` is set, edges accept these `color` values:

| `color` | Meaning | Renders as |
|---|---|---|
| `default` (omit) | regular flow | theme `edgeDefault` |
| `accent` | happy path / primary | theme `edgeAccent` |
| `success` | positive outcome | green (`#16A34A`) |
| `warning` | caution / attention | amber (`#D97706`) |
| `failure` | error / negative | red (`#DC2626`) |

Don't use `success`/`failure` as the only differentiator — they're
redundant with the gateway label (`yes` / `no`). Use them when the
diagram is dense and you want the eye to land on the failure path
faster.

## Layout sizing

The build script picks node sizes per theme:

| Theme | Node W × H |
|---|---|
| `tech-blue`, `dark` | 160 × 80 |
| `mono`, `high-contrast` | 180 × 80 |
| `warm` | 170 × 80 |

Auto-layout horizontal spacing is 80 px; vertical is 100 px (TB) or
100 px (LR). These constants don't need tweaking unless you're hitting
the page edge for a 60-node diagram — at that size, split the diagram.

## Label wrapping

Every shape ships with `html=1;whiteSpace=wrap;` baked into its style,
so labels longer than the node width wrap at word boundaries instead
of overflowing horizontally. Default node height (80 px) accommodates
two lines of 12pt text comfortably. If your label needs three or more
lines you're probably writing a paragraph into a node — rephrase to
the verb-phrase rule in SKILL.md instead of expanding the box.

## Typography

All themes use draw.io's default sans (`Helvetica`) at:
- `12pt` for labels
- `10pt` for edge labels
- `14pt bold` for swimlane headers

Don't override fonts. drawio's PDF export hits its sweet spot with
defaults.

## Swimlane rendering

Swimlanes get a thin grey divider (`#E5E7EB`), header band (theme
`fillAccent`), and 14pt bold header text. Lane width is auto-fit to
the widest node + 60 px padding either side.

## Network-kind icon size

Vendor icons are drawn at 80 × 80 px regardless of theme. Labels sit
14 px below the icon, centred. Edge labels offset 12 px from the
midpoint.
