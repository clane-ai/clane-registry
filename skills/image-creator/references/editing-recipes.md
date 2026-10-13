# Editing Recipes Reference

Detailed templates for `image_edit` use cases — single-source edits, multi-image compositing, identity-locked changes, and surgical surface changes. Read this when SKILL.md's "preserve list" guidance isn't enough for a complex edit.

`image_edit` accepts 1–16 input images. Reference each by its order in the `images: [...]` array (`Image 1`, `Image 2`, …). The model treats the FIRST image as the primary subject; later images are usually styles, references, or composited elements.

---

## Multi-image compositing

**When to use:** Place an element from one image into another. Combine references. "Put the dog from photo 2 next to the woman in photo 1."

**Template:**

```
Image 1: <DESCRIPTION OF FIRST INPUT — primary scene>
Image 2: <DESCRIPTION OF SECOND INPUT — element to transplant>
[Image N: …]

Place <ELEMENT FROM IMAGE 2> into <LOCATION IN IMAGE 1>.
Match Image 1's lighting, perspective, scale, and shadows so the
composite looks naturally captured in the original photo.
Do not change anything else.
```

**Critical rules:**
- Pass images in the order Image 1, Image 2, … in `images: [...]`. The order matters.
- Describe each input by **what it shows**, not just "an image". The model uses your descriptions to know which is the scene and which is the element.
- Always specify lighting/perspective/scale matching — without it, the composited element looks pasted on.
- Add: *"Do not change anything else"* — without it, the model often regenerates the whole scene.

**Worked example (dog into scene):**

```
Image 1: A woman sitting on a park bench in golden-hour light, autumn leaves on the ground.
Image 2: A small terrier dog standing on a white background.

Place the dog from Image 2 into the setting of Image 1, sitting on the ground next to the woman.
Use the same style of lighting, composition, and background.
Match the warm golden-hour light, soft shadows on grass, and shallow depth of field.
Do not change anything else.
```

**Recommended:** `quality: "medium"` (or `high` for identity preservation), `input_fidelity: "high"`.

---

## Virtual clothing try-on (identity-locked)

**When to use:** Ecommerce previews, fashion mock-ups, "show me wearing this" workflows. The user is in Image 1; clothing items in subsequent images.

**Template:**

```
Edit Image 1 to dress the <PERSON> using the provided clothing images.

Do not change <face / facial features / skin tone / body shape / pose / identity>.
Preserve exact likeness, expression, hairstyle, and proportions.

Replace only the clothing, fitting the garments naturally to the existing pose
and body geometry with realistic fabric behavior (draping, folds, occlusion).
Match lighting, shadows, and color temperature to the original photo so the
outfit integrates photorealistically, without looking pasted on.

Do not change the background, camera angle, framing, or image quality.
Do not add accessories, text, logos, or watermarks.
```

**Pass:** `[person_photo, top, bottom, shoes, ...]` in `images: [...]` — up to 16 inputs.

**Recommended:** `size: "1024x1536"`, `quality: "medium"`, `input_fidelity: "high"`.

---

## Object removal

**When to use:** Remove a person, item, watermark, or distraction from an existing image.

**Template:**

```
Remove <X> from <WHERE>. Do not change anything else.
```

**Tips:**
- Be specific about WHAT to remove. *"Remove the flower from the man's hand"* is better than *"remove the flower"*.
- For larger removals or where context matters, add: *"Fill the area naturally with what would have been behind <X> — match the surrounding texture, lighting, and depth."*
- The model is good at small removals (objects, watermarks, faces in the background). For large structural removals (e.g. removing a whole building), expect lower quality — flag the limitation to the user.

**Worked examples:**

```
Remove the flower from the man's hand. Do not change anything else.
```

```
Remove the watermark "STOCK PHOTO" from the bottom-right corner of Image 1. Fill the area naturally with the background texture. Do not change anything else.
```

**Recommended:** `quality: "medium"`, `input_fidelity: "high"`.

---

## Lighting / weather transformation

**When to use:** Re-stage a scene for a different mood, time of day, or weather. "Same image but at sunset", "make it look stormy", "winter version".

**Template:**

```
Make Image 1 look like <NEW CONDITIONS — concrete>.

Preserve scene composition, identity, geometry, and camera angle.
Change only environmental conditions: lighting direction/quality,
shadows, atmosphere, precipitation, ground wetness.
```

**Tips:**
- Describe the NEW lighting concretely: *"a winter evening with snowfall and warm window light"*, *"golden hour, low sun from camera-right, long shadows"*. Vague *"make it darker"* drifts.
- The model handles small environmental changes very well (sunny → overcast, dry → rain). Big seasonal changes (summer → winter with snow) work, but flag if the scene has season-specific details (foliage, clothing) that you want preserved or updated.

**Worked example (billboard at winter dusk):**

```
Make Image 1 look like a winter evening with snowfall.
Preserve the billboard composition, the product placement, and the camera angle.
Change only the environmental conditions: lighting direction (low ambient sky), atmospheric haze, falling snowflakes, snow accumulation on the ground and ledges, warm window glow from buildings in the distance.
```

**Recommended:** `quality: "medium"`, `input_fidelity: "high"`.

---

## Surgical surface change

**When to use:** Swap a single object/material in a scene without changing anything else. *"Same room but with wood chairs instead of white ones"*, *"red car instead of blue"*, *"this couch but in green velvet"*.

**Template:**

```
In Image 1, replace ONLY <X> with <Y>.
Preserve camera angle, lighting, shadows, and surrounding objects.
Keep all other aspects of the image unchanged.
Photorealistic contact shadows and material texture.
```

**Tips:**
- The word "ONLY" is doing real work. Without it, the model often re-stages the whole scene.
- Specify "contact shadows" — without it, the swapped object can look like it's floating.
- For material changes (matte → glossy, leather → velvet), add: *"with realistic <new material> texture, matching the lighting in the scene"*.

---

## Sketch → photo-realistic render

**When to use:** User uploads a hand-drawn sketch, a wireframe, or a low-fi mockup and wants it rendered as a believable photo.

**Template:**

```
Turn this drawing into a photorealistic image.

Preserve the exact layout, proportions, and perspective.
Choose realistic materials and lighting consistent with the sketch's intent.

Do not add new elements or text.
```

**Tips:**
- "Preserve layout/proportions/perspective" is critical — without it, the model re-imagines the scene.
- "Do not add new elements" prevents creative drift (the model loves to add a coffee cup, a window, an extra plant).
- For architectural sketches, add: *"Use realistic building materials (concrete, wood, glass), natural daylight, no people"*.
- For product sketches, add: *"On a plain neutral background, studio lighting"*.

---

## In-image text translation / localisation

**When to use:** Translate or change the text inside an existing image (ad, packaging, infographic) without rebuilding the layout.

**Template:**

```
Translate the text in Image 1 to <LANGUAGE>. Do not change any other aspect of the image.
```

OR for explicit copy replacement:

```
In Image 1, replace the text "<OLD>" with "<NEW>".
Do not change typography, placement, color, or any other aspect of the image.
```

**Tips:**
- For non-Latin scripts (Japanese, Arabic, Hindi), the model can handle it — but flag to the user that small typography may need a human review.
- For brand names, keep them in the original language unless the user specifies otherwise.
- If the original text wraps, specify desired wrapping: *"Wrap to two lines, centered"*.

---

## Product mockup (clean background extraction)

**When to use:** User has a product photo with a busy background and wants it on a clean background for catalog use.

**Template:**

```
Extract the product from Image 1 and place it on a plain white opaque background.
Output: centered product, crisp silhouette, no halos/fringing.
Preserve product geometry and label legibility exactly.
Add only light polishing and a subtle realistic contact shadow.
Do not restyle the product; only remove the background and lightly polish.
```

**Tool args:** `background: "opaque"`.

**Tips:**
- Always say "preserve label legibility" — the model loves to "improve" labels into illegibility.
- "Subtle contact shadow" prevents the product from floating; without it, the result looks like a bad cutout.
- For transparency, the user must run a downstream background-removal step. gpt-image-2 doesn't render alpha.

---

## Marketing creative with in-image text

**When to use:** Billboards, posters, ads, social cards — where the IMAGE includes typography that must read correctly.

**Template:**

```
Create a <FORMAT> mockup of <SUBJECT> in <SETTING>.

<TEXT> (EXACT, verbatim, no extra characters):
"<COPY HERE>"

Typography: <FONT WEIGHT/STYLE>, <COLOR>, <PLACEMENT>, clean kerning.
Ensure text appears once and is perfectly legible.
No watermarks, no logos.
```

**Recommended:** `quality: "medium"` for headlines, `quality: "high"` for any body copy.

**Worked example (billboard):**

```
Create a realistic billboard mockup of the shampoo on a highway scene during sunset.

Billboard text (EXACT, verbatim, no extra characters):
"Fresh and clean"

Typography: bold sans-serif, high contrast, centered, clean kerning.
Ensure text appears once and is perfectly legible.
No watermarks, no logos.
```

---

## Mask-based editing (precision changes)

**When to use:** You want to constrain a change to a specific region of an image. Less common than prompt-based editing — only reach for masks when prompts alone drift.

**How:** Pass a `mask` (PNG with alpha channel) alongside the source image. Transparent pixels = "this region can be edited". Opaque pixels = "preserve". The mask must be the same dimensions as the source.

**Practical:**
- The agent rarely creates masks itself — usually the user provides one, or you generate one programmatically (this would be a rare exception to the no-Python rule, only if the user explicitly requests masked editing AND no mask exists). Even then, the right move is usually to ask the user.
- If you have a mask, the prompt focuses on WHAT to put in the masked region, not where: *"In the masked area, place a window with daylight streaming in"*.

---

## Iteration discipline (re-stating the rule)

For multi-step refinement of the same image:

1. **Use `image_edit` on the SAVED FILE.** Don't regenerate from scratch.
2. **One change per iteration.** Multiple simultaneous changes confuse the model.
3. **Re-specify the preserve list each time.** What stayed stable last time may drift this time if you don't restate it.
4. **Reference stable elements clearly:** *"same character"*, *"same composition"*, *"same camera angle"*.

Three iterations of "make the lighting warmer", "now make the dog smaller", "now add a window in the background" each take ONE call to `image_edit` on the previous result.

---

## When NOT to use `image_edit`

| Situation | Use instead |
|---|---|
| User asks for a fresh image with no source | `image_generate` |
| User wants to "describe" what's in an image (no change needed) | `file_read` (vision model in your toolbelt) |
| User wants to crop / resize without semantic change | Tell the user the platform doesn't have a non-AI crop tool yet — gpt-image-2 will re-render at the new size, which may shift content. |
| User wants to convert format (PNG → JPEG) without re-render | Same — flag the limitation. |
