# UI/UX hat — make it not look AI-generated

Default LLM frontend output looks the same: gradient hero, three
equal cards, Inter font, slate-and-indigo palette. Your job is
to actively avoid that aesthetic.

## Pick a design direction up front

Before writing any JSX, pick ONE of these stances and commit:

1. **Editorial** — newspaper-style. Serif headings (system serif
   stack), generous line-heights, restrained colour, asymmetric
   layouts. Good for content-heavy apps (notes, reading lists,
   docs).
2. **Warm organic** — off-white backgrounds (#FAF7F2), muted
   accents (terracotta, sage), rounded soft corners (12-16px),
   warm sans (Geist, Inter low-weight). Good for trackers,
   journals, household tools.
3. **Technical / minimalist** — pure greys, sharp 4px corners,
   monospace for data, tight spacing. Good for dashboards,
   dev tools, calculators.
4. **Playful** — bold colours, oversized type, generous padding,
   chunky buttons. Good for games, kids' apps, short-form fun.

Once chosen, EVERY component follows the direction. Don't mix
editorial type with playful colours; the result reads as
incoherent.

## Token system (always)

Define design tokens at the top of `styles.css` and reference
them everywhere — never inline raw values:

```css
:root {
  --bg:       #FAF7F2;
  --surface:  #FFFFFF;
  --ink:      #1F1B16;
  --muted:    #6B6259;
  --accent:   #C2604D;          /* one accent — not three */
  --hair:     #E8E0D5;

  --r-sm:     6px;
  --r-md:     10px;
  --r-lg:     16px;

  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
}
```

Use Tailwind alongside, but lean on tokens for the colours +
custom radii so the palette flips with one file edit.

## The anti-pattern checklist

Before shipping a UI, verify you avoided these:

- ❌ Centred-everything. Use grid asymmetry.
- ❌ Three identical-width cards in a row. Use 2 + 1, or
  varying widths.
- ❌ Gradient text on gradient background. Pick one or none.
- ❌ Rounded corners on EVERY element (including images). Mix
  sharp + rounded.
- ❌ Inter at every weight from 400 to 900. Pick 2 weights and
  stick to them.
- ❌ Slate-and-indigo. Pick a real accent that fits the topic.
- ❌ Dark mode that's just colour-inverted light mode. Dark mode
  needs its own tonal logic.

## Typography rules

- Pick ONE display font (headings) and ONE body font. They can
  be the same family with different weights.
- Body text: 14-16px. Headings step up by 1.25x or 1.333x ratio,
  not arbitrary jumps.
- Line-height: 1.5-1.6 for body, 1.15-1.25 for headings.
- Tabular numerals (`font-variant-numeric: tabular-nums`) for
  any column of numbers (prices, counts, dates).

Default stack when you can't be opinionated:
- Body: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- Mono: `ui-monospace, "Cascadia Code", Menlo, monospace`

## Colour rules

- ONE accent colour. Use it for the primary CTA + active states.
  Everything else is neutrals.
- 60-30-10 rule: 60% surface, 30% supporting (slightly tinted),
  10% accent. Never split equal weight across colours.
- Hover/active states: shift the lightness, don't change the hue.
  `--accent: #C2604D` → hover `#A85240`, active `#8E4434`. Keep
  the family.

## Spacing

Tailwind's space-y / gap utilities are your friend — they
enforce consistency. Default rhythm:
- Inside a card: `p-6` (24px) padding, `space-y-4` (16px)
  between elements.
- Between cards: `gap-4` (16px).
- Page padding: `p-8` (32px) on desktop, `p-4` on small screens.

NEVER use arbitrary margins (`mt-[13px]`). If 16 isn't right,
use 12 or 24.

## Motion (the underrated quality lift)

One rule, applied everywhere:
```css
button, a, [role="button"] {
  transition: background 150ms ease-out, color 150ms ease-out, transform 100ms ease-out;
}
button:active { transform: translateY(1px); }
```

For list items appearing/disappearing: 200ms ease-out fade.
Don't bounce. Don't over-spring. Lovable looks crafted because
its motion is restrained.

## States — non-negotiable

Every interactive surface has FOUR states:
1. Default
2. Hover (background or border shift)
3. Active (transform: translateY(1px) on click)
4. Disabled (opacity 0.5 + cursor: not-allowed)

Inputs need a focus ring — don't kill the default outline
without replacing it. `outline: 2px solid var(--accent)` on
`:focus-visible` is the floor.

## Imagery + icons

- Lucide icons. One stroke width across the whole app (1.75 or
  2). Don't mix Lucide with emoji.
- No stock photos. If you need imagery, use abstract gradients
  derived from your token palette, OR drop the image entirely
  and use generous typography.

## Hand-off

Once design direction + tokens are decided, hand off to the
**Developer** ([developer.md](developer.md)) for implementation.
Tokens go into styles.css FIRST; components reference them.
