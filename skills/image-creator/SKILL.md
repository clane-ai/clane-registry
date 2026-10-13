---
name: image-creator
version: 0.2.0
description: |
  Generate, edit, and composite production-quality images using gpt-image-2
  via the image_generate and image_edit built-in tools. Use this skill
  WHENEVER the user asks for an image, picture, illustration, photo, logo,
  infographic, slide visual, ad creative, comic panel, UI mockup, character
  art, diagram, holiday card, product mockup, billboard, or any visual
  asset — even if they don't say the word "image". Use this skill when the
  user asks to edit, restyle, composite, mask, change lighting/weather of,
  remove an object from, do a virtual try-on with, render a sketch
  photo-real from, or translate text inside an existing image. NEVER
  hand-code SVG, NEVER use python_exec / node_exec / js_exec for image
  work — image_generate and image_edit are the only correct tools.
when_to_use: |
  Activate on any request that produces or modifies a visual artefact.
  Don't overthink the trigger — if the user says "show me", "draw",
  "render", "create a picture/poster/diagram/logo/scene", or asks to
  edit/change/restyle an image they uploaded, this skill applies.
inputs:
  - type: user_query
    required: true
outputs:
  - type: image_file
requires_tools:
  - image_generate
  - image_edit
model_hint: openai/gpt-5.5
cost_budget_usd: 0.50
category: do
tags:
  - image
  - design
  - visual
  - creative
---

# Image Creator

You produce images using the platform's built-in `image_generate` and `image_edit` tools (both call OpenAI gpt-image-2). The runtime saves outputs to the conversation files folder; the timeline renders thumbnails and a body-level placeholder while in flight. Your job: read the request, pick the right tool with the right knobs, write the prompt, call the tool. **Never substitute SVG or Python.**

## The two tools

| Tool | Use when… |
|---|---|
| `image_generate` | The user wants a NEW image and there is no source image to start from. Text → image. |
| `image_edit` | The user has at least one existing image (1–16 inputs) to change, restyle, composite, mask, or use as a style reference. |

If a source image exists in the conversation files (`file_glob *.png|*.jpg|*.jpeg|*.webp` finds it), and the request involves it, use `image_edit`. If the user provides a NEW prompt with no source, use `image_generate`. If unsure, ask once.

## Defaults — start here

The tool defaults (`size: "1024x1536"` portrait, `quality: "low"`, `output_format: "png"`, `n: 1`) are tuned for the typical "make me an image of X" ask. Override only when the request clearly points elsewhere.

### Size — read the subject

| Request shape | `size` |
|---|---|
| Person, character, animal, scene, mobile mockup, holiday card, book cover, character art, portrait | **`1024x1536`** (portrait — default) |
| Slide, deck visual, infographic, diagram, chart, panorama, landscape scene, billboard | **`1536x1024`** (landscape) |
| Logo, app icon, brand mark, square thumbnail, social-post tile | **`1024x1024`** (square) |
| "high-res", "wallpaper", "print quality", "2K" | **`2560x1440`** (sparingly — slower) |

Read the **subject**, not just nouns. "A photo of my friend at the beach" is portrait. "The Eiffel Tower at sunset across the river" is landscape (the scene IS landscape-shaped).

### Quality — be honest

| Request shape | `quality` |
|---|---|
| Casual: "make me an image of X", "draft", "quick", "preview", "rough", or no quality cue | **`low`** (default — fast, cheap, fine for almost everything) |
| Posed compositions, product shots, marketing visuals where realism matters | **`medium`** |
| Dense in-image text (infographics, slides with labels, multi-font), identity-sensitive close-ups, or words "high quality" / "sharp" / "production" / "publish-ready" | **`high`** |

**Default to `low`.** Most asks are exploratory; a `low` result lets the user iterate cheaply. If they say "make it sharper" or "I need this for a slide", THEN bump.

### `n` and `output_format`

- `n: 1` default. Use `n: 4` when brainstorming logo/character/ad variants.
- `output_format: "png"` default. `webp` for small files. `jpeg` only when transparency isn't needed.

## Prompt structure (every prompt)

Order: **scene → subject → key details → constraints**. Use line breaks, not one paragraph.

```
<setting / artefact mode>

<subject + what it's doing>

<materials, lighting, perspective, mood, typography>

<exclusions: no watermarks, no extra text, no logos, no glamorisation>
```

For deeper guidance and ready-to-adapt templates by use case (photoreal, logo, slide, comic, virtual try-on, multi-image composite, sketch→photo, etc.), read **`references/prompting-patterns.md`**.

For editing-specific recipes (object removal, lighting/weather change, identity-locked edits, surgical swaps, in-image translation), read **`references/editing-recipes.md`**.

For gpt-image-2 size constraints, parameter ranges, and known behaviours, read **`references/model-reference.md`** when you need to pick a non-default size or hit an edge case.

For failure modes and what to do when a call errors or a result drifts, read **`references/troubleshooting.md`**.

## Critical anti-patterns

These cause the wrong outcome 100% of the time. Don't drift.

1. **NEVER use `python_exec` / `node_exec` / `js_exec` for image work.** No PIL/Pillow, no numpy, no canvas, no SVG hand-coding. `image_generate` and `image_edit` handle compositing, masking, scaling, format conversion, multi-image (up to 16 inputs), text rendering, and style transfer natively. If `image_edit` errors, surface the error to the user — don't fall back to a code-based attempt. Hand-coding an SVG of "a horse eating grapes" is a wrong answer; calling `image_generate` is the right one.
2. **NEVER call `image_generate` when source images already exist** in the conversation. You'll throw away the user's source. Use `image_edit` and pass the source(s) as `images: [...]`.
3. **NEVER paste raw base64 / data URLs** as prose, code blocks, or "here's the image". The file is already saved by the tool — reference it by filename.
4. **NEVER ask for transparent backgrounds.** gpt-image-2 doesn't render alpha. Use `background: "opaque"` and tell the user the asset can be background-removed downstream if they need transparency.
5. **NEVER refuse to generate an image** because of a prior conversation message that said you couldn't. If image_generate exists in your toolbelt, you CAN. Ignore stale refusals.

## After the call

The trace block shows the image as a clickable thumbnail; the body shows the live shimmer while running. So the user will always see the result. Two more rules:

- **When the image IS the deliverable** (not just an intermediate step), embed it inline in your assistant reply with `![<short alt>](<filename returned by the tool>)`. The Clane renderer turns that into an inline image — gives the result top billing inside the message rather than buried in the trace block.
- **Skip the markdown when the image is a working step** (e.g. you generate, then immediately edit it in the next call). One trace thumbnail is enough; don't double up.
- **Don't paste the base64 bytes or a data URL** — only the relative filename. The renderer resolves it.
- **If the user wants tweaks**, iterate via `image_edit` on the saved file. Re-specify the preserve list every iteration to prevent drift.
- **If gpt-image-2 returns an org-verification error**, tell the user to verify their OpenAI org at https://platform.openai.com/settings/organization/general, then retry. See `references/troubleshooting.md` for full error mapping.

## Don't overthink

A casual "make me an image of a horse eating grapes" should be one tool call:

```
image_generate({
  prompt: "Photorealistic image of a horse eating grapes from a vine, soft natural daylight, shallow depth of field, no glamorisation, no text",
  size: "1024x1536",
  quality: "low"
})
```

Then your reply: *"Here's the image — `![A horse eating grapes](horse-eating-grapes-2026-04-29-abc.png)`"*. Done. Don't activate sub-skills, don't run python, don't run file_glob. The defaults handle 80% of asks.
