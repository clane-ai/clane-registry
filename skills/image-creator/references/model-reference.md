# gpt-image-2 Model Reference

Hard facts about the model and the tool surface. Read this when you need to pick a non-default size, hit a parameter limit, or understand a specific behaviour.

---

## Model

The platform locks `image_generate` and `image_edit` to **`gpt-image-2`** (snapshot 2026 → current). This is OpenAI's most capable image model as of writing — supersedes gpt-image-1.5, gpt-image-1, and DALL·E 3. The agent does NOT pick the model; it's hard-coded in the tool implementation.

Other family members exist (`gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini`) but Clane doesn't expose them yet. If a user asks for a "cheaper" variant, the right answer is `quality: "low"` on gpt-image-2 — it's already fast and cheap.

---

## Size constraints (non-negotiable)

`size` accepts any `WxH` string that satisfies ALL of:

- Maximum edge length **< 3840px**.
- Both edges **multiple of 16**.
- Long-to-short edge ratio **≤ 3:1**.
- Total pixels **≤ 8,294,400** (≈ 4K UHD).
- Total pixels **≥ 655,360**.

Anything that violates these returns a 400 from OpenAI. Stay inside the popular sizes unless you have a specific reason.

### Popular sizes

| Label | Resolution | Aspect | Use case |
|---|---|---|---|
| **HD portrait** | `1024x1536` | 2:3 | Default. People, characters, scenes, mobile mockups, holiday cards. |
| **HD landscape** | `1536x1024` | 3:2 | Slides, decks, diagrams, panoramas, billboards. |
| **Square** | `1024x1024` | 1:1 | Logos, icons, app tiles, social posts. |
| **2K / QHD** | `2560x1440` | 16:9 | Wallpapers, hero images, "high-res". Recommended upper boundary — slower and more variable above this. |
| **4K / UHD-ish** | `3824x2144` | ~16:9 | Experimental — round down from 3840 to keep edge < 3840 and multiple of 16. Quality more variable. |
| **Tall portrait** | `1024x1792` | ~9:16 | Stories, vertical video stills. Just inside ratio limits. |

---

## Quality

| Value | What you get | When to use |
|---|---|---|
| `low` | Fast, cheap, generally fine for casual asks | Default. Ideation, "make me X", drafts, previews. |
| `medium` | Balanced — better realism, sharper edges | Posed compositions, product shots, marketing visuals where realism matters. |
| `high` | Maximum fidelity, slowest | Dense in-image text (slides, infographics), identity-sensitive close-ups, "production" / "publish-ready" requests. |

`quality: "high"` is roughly 4× the latency and cost of `low`. Don't use it pre-emptively.

---

## Output format

| Value | When |
|---|---|
| `png` | Default. Lossless. Use unless there's a reason not to. |
| `webp` | Smaller files, comparable quality. Use when the user asks for "small" or "lightweight". |
| `jpeg` | Smaller files for photos with no transparency. Skip if the result might need a clean background. |

**`gpt-image-2` does NOT support transparent PNG output.** If the user asks for a transparent logo, deliver an opaque version on a clean background and tell them they can background-remove it downstream.

---

## `n` (variants per call)

Range: 1–10. The platform's tool clamps to this range silently.

- `n: 1` default — you almost always want this.
- `n: 4` for brainstorming logo / character / ad variants.
- `n > 4` only for batch ideation — costs scale linearly, so be deliberate.

Each variant is independent; the model isn't optimising for diversity. To get variety, write a prompt that admits multiple valid interpretations.

---

## `image_edit`-only knobs

### `images` (required)

Array of 1–16 relative paths in the conversation files folder. The order matters — the prompt's "Image 1, Image 2, …" references map to this order.

For paths: use the filename returned by `image_generate` or `file_glob`. Don't pass absolute paths or paths with `..` — the tool will reject them.

### `mask` (optional)

PNG path with alpha channel. Transparent pixels mark the editable region; opaque pixels are preserved. The mask must be the same dimensions as the FIRST image in `images`.

Most edits don't need a mask — prompt-only editing handles >90% of real cases. Use a mask when:
- The user provides one.
- Prompt-based editing repeatedly drifts outside the area you want to change.

### `background`

| Value | When |
|---|---|
| `opaque` | Product mockups on a clean background; any time you want to guarantee no transparency. |
| `auto` | Default. Let the model decide. |

Note: `opaque` produces a SOLID background, not white. Specify the colour in the prompt if it matters: *"plain white opaque background"*.

### `input_fidelity`

`low` | `high`. Pass `high` for edits where source detail matters (faces, scene composition, identity). The cookbook examples use `input_fidelity: "high"` on most edit calls.

The official table says it's "disabled" for gpt-image-2 (output is high-fidelity by default), but the API tolerates the parameter. Always pass `"high"` for edits — costs nothing if it's a no-op.

---

## Cost / speed expectations

Approximate per-image cost (subject to OpenAI pricing changes):

| Quality | Size | Approx cost |
|---|---|---|
| low | 1024x1024 | ~$0.01 |
| low | 1024x1536 | ~$0.015 |
| medium | 1024x1024 | ~$0.04 |
| medium | 1024x1536 | ~$0.06 |
| high | 1024x1536 | ~$0.10 |
| high | 2560x1440 | ~$0.20 |

Latency: ~3–8s for `low`, ~10–20s for `medium`, ~20–40s for `high`. The body-level shimmer placeholder spans this window so the user has visual feedback.

`image_edit` is roughly the same cost as `image_generate` at the same quality/size, plus a small premium for input image processing.

---

## Known behaviours

### Strengths
- **Photorealism** — strong, especially with concrete texture/lighting cues.
- **Text-in-image** — reliably renders quoted text, especially at `quality: "medium"` or above. Multi-word brand names work; small body copy works at `high`.
- **Multi-image compositing** — up to 16 inputs in one call. Identity preservation for faces is solid with `input_fidelity: "high"`.
- **Style transfer** — copies palette, brushwork, grain, lighting from a reference.
- **World knowledge** — can infer context from period/place cues ("Bethel, NY August 1969" → Woodstock).

### Weaknesses
- **Hands and text on objects** — still drift. For hands, "natural hand position" + close-cropped subjects helps.
- **Very fine text** at `quality: "low"` — bumps up to medium/high needed for text smaller than headline size.
- **Exact colour matching** between iterations — drifts even with explicit colour values. Specify in the prompt every time.
- **Negative prompts** — soft. *"No glasses"* sometimes adds glasses. Better to describe the desired state positively: *"clean face, no eyewear"*.
- **Counts** — *"three apples"* sometimes returns four. For exact counts, mention twice or use spatial cues: *"exactly three apples, arranged in a row, no others"*.

---

## Org verification (one-time gate)

`gpt-image-2` requires the OpenAI org to be verified. First call from an unverified org returns:

```
{ "error": { "message": "Your organization must be verified to use gpt-image-2...", "type": "organization_verification_required" } }
```

The tool surfaces this as an error string. When you see it, tell the user:

> Your OpenAI org needs to be verified to use gpt-image-2. Verify at https://platform.openai.com/settings/organization/general (under "Verifications"), then retry — verification usually takes a few minutes.

Don't retry the call yourself; it'll keep failing until the user verifies.

---

## Tool I/O shape (for reference when reading tool results)

### `image_generate` → returns

```json
{
  "files": [
    { "path": "image-2026-04-29T12-35-47-oy40.png", "bytes": 234567, "revised_prompt": "..." }
  ],
  "model": "gpt-image-2"
}
```

### `image_edit` → returns

Same shape as `image_generate`.

### Either tool → on error

```json
{ "error": "OpenAI rejected the API key (401). Re-enter the key in Admin → Providers." }
```

When you see `error`, surface it to the user verbatim or paraphrased — don't pretend success. See `troubleshooting.md` for the full error map.
