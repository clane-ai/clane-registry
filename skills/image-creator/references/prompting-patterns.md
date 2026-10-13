# Prompting Patterns Reference

Detailed templates for common image-generation use cases. Read this when SKILL.md's "scene → subject → details → constraints" structure isn't enough — usually for use cases with strong conventions (logos, slides, photorealism, character art).

Each section includes: when it applies, the template, recommended `size` and `quality` overrides, and worked examples adapted from production runs.

---

## Photorealistic candid photography

**When to use:** User asks for a "photo", "photograph", "real picture of", "candid", "portrait of <person>", or implies a real-world image. Avoid for stylised art, cartoon, painted, anime, etc.

**Template:**

```
Create a photorealistic candid photograph of <SUBJECT>.
<TEXTURE / SKIN / WEAR DETAILS>
<ACTION / GAZE / FRAMING>
Shot like a 35mm film photograph, <ANGLE>, using a 50mm lens.
<LIGHTING>, shallow depth of field, subtle film grain, natural color balance.
The image should feel honest and unposed, with real texture and everyday detail.
No glamorisation, no heavy retouching.
```

**Recommended:** `size: "1024x1536"`, `quality: "medium"` (or `high` for close-up portraits where face/skin detail matters).

**Cues to include:**
- "real photograph", "taken on a real camera", "professional photography", "iPhone photo" — engages the photorealism mode.
- Texture detail: "visible wrinkles, pores, sun texture", "weathered skin", "fabric wear and stitching imperfections".
- Lens / lighting language: "35mm", "50mm", "shallow depth of field", "soft coastal daylight", "golden hour".

**Cues to avoid:**
- "cinematic", "dramatic", "movie-poster", "stylised", "epic" — these push toward stylised, not real.
- "perfect", "flawless", "magazine quality", "glamorised" — these push toward over-retouching.

**Worked example (sailor on fishing boat):**

```
Create a photorealistic candid photograph of an elderly sailor standing on a small fishing boat.
He has weathered skin with visible wrinkles, pores, and sun texture, and a few faded traditional sailor tattoos on his arms.
He is calmly adjusting a net while his dog sits nearby on the deck.
Shot like a 35mm film photograph, medium close-up at eye level, using a 50mm lens.
Soft coastal daylight, shallow depth of field, subtle film grain, natural color balance.
The image should feel honest and unposed, with real skin texture, worn materials, and everyday detail.
No glamorisation, no heavy retouching.
```

---

## Logo / brand mark

**When to use:** User asks for a logo, brand mark, app icon, or visual identity for a company/product/event.

**Template:**

```
Create an original, non-infringing logo for <BRAND>, a <CATEGORY>.
The logo should feel <PERSONALITY ADJECTIVES>. Use clean, vector-like shapes,
a strong silhouette, and balanced negative space.
Favor simplicity over detail so it reads clearly at small and large sizes.
Flat design, minimal strokes, no gradients unless essential.
Plain background. Deliver a single centered logo with generous padding.
No watermark.
```

**Recommended:** `size: "1024x1024"`, `quality: "medium"`, `n: 4` (give the user options to pick from).

**Tips:**
- Personality adjectives ("warm and timeless", "playful and energetic", "premium and minimal") drive style more than visual descriptors.
- "Vector-like shapes" + "flat design" + "strong silhouette" = scales-to-favicon. Add "intricate" or "detailed" only when the brand demands it.
- For wordmark logos, quote the brand name in the prompt: `Include only the wordmark "Field & Flour" in clean serif typography. No tagline.`
- For monogram: `A clean monogram combining the letters F and F.`

---

## Slide / infographic / data viz

**When to use:** Pitch-deck slides, dashboards, charts, infographics, scientific diagrams. Anything with structured information and in-image text.

**Template:**

```
Create one <SLIDE TITLE> slide that feels like a real <CONTEXT> deck.
Clean white background, modern sans-serif typography (Inter), crisp minimal layout.
Include:
  • <DIAGRAM / CHART TYPE>
  • <EXACT NUMBERS, LABELS, COPY — verbatim, in quotes>
  • <FOOTNOTES>
Highly readable text, clear data hierarchy, polished spacing.
Avoid clip art, stock photography, decorative elements.
```

**Recommended:** `size: "1536x1024"` (landscape), `quality: "high"` (small text needs it).

**Critical rules for data viz:**
- Quote ALL exact text the user wants visible. The model will paraphrase if not quoted.
- Specify the chart type explicitly: "concentric-circle TAM/SAM/SOM diagram", "bar chart", "line chart with subtle upward trend", "Sankey diagram".
- Keep numbers BELIEVABLE — round numbers suggest mockup, specific numbers suggest real data.
- Avoid: "decorative", "modern" (too vague), gradients, drop shadows, 3D — these read as overdesigned.

**Worked example (Series A pitch slide):**

```
Create one pitch-deck slide titled "Market Opportunity" that feels like a real Series A fundraising slide from a YC-backed startup.
Use a clean white background, modern sans-serif typography like Inter, and a crisp, minimal layout.
The slide should include:
  • A TAM/SAM/SOM concentric-circle diagram in muted blues and grays.
  • Specific, believable market sizing numbers: TAM: $42B, SAM: $8.7B, SOM: $340M.
  • A clean bar chart below showing market growth from 2021 to 2026, with a subtle upward trend.
  • Small footnotes: "AGI Research, 2024" and "Internal analysis".
  • A company logo placeholder in the bottom-right corner.
The design should look like it belongs in a deck that actually raised money: highly readable text, clear data hierarchy, polished spacing, professional startup-style visual language.
Avoid clip art, stock photography, gradients, shadows, decorative elements, or anything that feels generic or overdesigned.
```

---

## Comic / story panels

**When to use:** Multi-panel storytelling, story-to-comic, narrative visuals.

**Template:**

```
Create a short <vertical/horizontal> comic-style reel with <N> equal-sized panels.
Panel 1: <CONCRETE BEAT — what's in frame, who's where, what's happening>
Panel 2: <NEXT BEAT>
Panel 3: <NEXT BEAT>
Panel 4: <FINAL BEAT>
```

**Recommended:** `size: "1024x1536"` (vertical) or `1536x1024` (horizontal), `quality: "medium"`.

**Tips:**
- Each panel description should be ONE sentence + ONE atmospheric detail. Keep beats concrete and visual; the model can't read between the lines.
- Don't write dialogue inside the prompt — the model can't render speech bubbles reliably. If you need text, use a separate beat per text overlay.
- For consistent character across panels, describe distinguishing features (clothing, colour, scale) in EVERY panel description.

---

## UI mockup

**When to use:** Mobile app screens, dashboards, web UI references — when you want a "looks like a real app" mockup.

**Template:**

```
Create a realistic mobile app UI mockup for <APP CONCEPT>.
Show <SECTIONS / FEATURES VISIBLE>.
Design it to be practical and easy to use. White background, subtle natural accent colors, clear typography, minimal decoration.
It should look like a real, well-designed, beautiful app for <CONTEXT>.
Place the UI mockup in an iPhone frame.
```

**Recommended:** `size: "1024x1536"` (portrait, fits a phone frame), `quality: "medium"`.

**Tips:**
- "Place in an iPhone frame" is a strong cue — the model adds rounded corners, status bar, etc.
- Describe the product as if it ALREADY exists ("Show today's market", not "design a screen for browsing markets"). Keeps the model in production-mockup mode rather than concept-art mode.
- For dashboard mockups, ask for landscape and specify "tabs", "sidebar nav", "data widgets" explicitly.

---

## Children's book art / character consistency

**When to use:** Multi-page illustration where the same character appears in multiple scenes.

### Step 1 — character anchor

Generate a clean reference shot of the character on a plain background:

```
Create a children's book illustration introducing a main character.

Character:
A young, storybook-style hero <DESCRIPTION>, wearing <DISTINCTIVE OUTFIT>.
The character has <FACIAL FEATURES, EXPRESSION, DEMEANOR>.
<ICONIC OBJECT they carry>.

Theme:
<WHAT THIS CHARACTER DOES>.

Style:
Children's book illustration, hand-painted watercolor look, soft outlines, warm earthy colors, whimsical and friendly.
Proportions suitable for picture books (slightly oversized head, expressive face).

Constraints:
- Original character (no copyrighted characters)
- No text
- No watermarks
- Plain forest background to clearly showcase the character
```

### Step 2 — subsequent scenes (`image_edit` with the anchor)

```
Continue the children's book story using the same character.

Scene:
<NEW SCENE — what's happening, where>.

Character Consistency:
- Same <DISTINCTIVE OUTFIT>
- Same facial features, proportions, color palette
- Same <PERSONALITY DEMEANOR>

Style:
Children's book watercolor illustration, soft lighting, <ENVIRONMENT>, warm and comforting mood.

Constraints:
- Do not redesign the character
- No text
- No watermarks
```

Pass the character anchor image as the input to `image_edit`. The model uses it as a reference for the character's appearance.

---

## Style transfer

**When to use:** User has a reference image with a distinctive style (painting, illustration, photo treatment) and wants a NEW subject in that same style.

**Template:**

```
Use the same style from the input image and generate <NEW SUBJECT>.
<OPTIONAL: setting, framing, what subject is doing>.
```

**Tool:** `image_edit` with the style reference as input. Single image input is fine — the model treats it as style source.

**Tips:**
- Don't over-describe the style. The reference image carries it; your prompt should focus on what's NEW.
- For painting / illustration styles, add: "preserve the brushwork / palette / line weight from the input".
- For photo treatments (film grain, lighting, color grading), specify: "match the lighting and color grading of the input photo".

---

## Holiday card / nostalgic asset

**When to use:** Greeting cards, seasonal marketing, nostalgic / sentimental imagery.

**Template:**

```
Create a <OCCASION> card illustration.

Scene:
<COZY, EMOTIONAL SCENE — concrete details, what's in frame>.

Mood:
<EMOTIONAL ADJECTIVES — warm, nostalgic, gentle, emotional>.

Style:
Premium <OCCASION> card photography, soft cinematic lighting, realistic textures, shallow depth of field, tasteful bokeh lights, high print-quality composition.

Constraints:
- Original artwork only
- No trademarks, no watermarks, no logos

Include ONLY this card text (verbatim):
"<EXACT MESSAGE>"
```

**Recommended:** `size: "1024x1536"` (portrait), `quality: "high"` (small in-card text needs it).

---

## Iterative refinement (no template — the discipline)

When the user wants to tweak a result you just generated:

1. Use `image_edit` on the saved file (NOT `image_generate` again — you'll lose the source).
2. Make ONE change per iteration. Multiple changes in one prompt cause cross-drift.
3. RE-SPECIFY the preserve list every iteration. *"Make lighting warmer. Keep face, body, pose, clothing, background, framing unchanged."*
4. Reference what's stable: *"same style as before"*, *"the subject"* — but if the model drifts, re-specify the critical detail.

A good iteration prompt is half "what to change" and half "what to keep the same".

---

## Cross-cutting patterns

### Specificity escalator

If a result misses, escalate specificity in this order:
1. Add lighting/lens detail.
2. Add texture/material detail.
3. Add framing/composition detail.
4. Add explicit exclusions ("no X, no Y").
5. Bump quality from low → medium → high.
6. Try a different angle/framing entirely.

Don't bump quality first — usually a more specific prompt at `low` beats a vague prompt at `high`.

### Realism cues vs stylisation cues

| Want photorealistic | Want stylised |
|---|---|
| "real photograph" | "illustration" |
| "natural lighting" | "stylised lighting" |
| "honest and unposed" | "expressive" |
| "real texture, imperfections" | "clean lines, flat colors" |
| "shallow depth of field" | "isometric" / "flat design" |

### Text-in-image quick reference

- Quote the EXACT text: `Include only the tagline "Yours to Create."`
- Caps and punctuation matter — the model renders what's quoted.
- For multi-word brand names, spell letter-by-letter once: `The wordmark spells F-I-E-L-D and below it F-L-O-U-R.`
- Bump quality to `high` for any text dense enough to need readability (slides, infographics, cards with body copy).
- Repeat the rendering instruction once: `Render the tagline EXACTLY ONCE, clearly and legibly.`
