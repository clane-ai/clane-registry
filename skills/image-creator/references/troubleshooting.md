# Troubleshooting Reference

What to do when things go wrong. Read this when a call errors, a result drifts, or you're tempted to fall back to the wrong tool.

---

## Tool errors — what they mean and what to do

The `image_generate` / `image_edit` tools return an `error` field when something fails. Always surface the error to the user; never pretend success.

### `OpenAI rejected the API key (401)…`
The key is missing, expired, or wrong. Tell the user:
> The OpenAI key isn't accepted. An admin needs to re-enter it in Admin → Providers.

Don't retry the call.

### `OpenAI org not verified for gpt-image models. Verify the org at…`
The org hasn't completed verification. Tell the user:
> Your OpenAI org needs verification to use gpt-image-2. Visit https://platform.openai.com/settings/organization/general → "Verifications", then retry. Usually takes a few minutes.

Don't retry until the user confirms verification is done.

### `OpenAI rate-limited the request (429)…`
You've hit a request-rate limit. Tell the user:
> OpenAI rate-limited the request. Retry in ~30 seconds, or reduce `n` if you were generating multiple variants.

Wait before retrying.

### `Network error reaching OpenAI…`
Connectivity problem. Tell the user the request failed to reach OpenAI and offer to retry once. If a single retry also fails, stop — don't loop.

### `OpenAI returned 400: …` (with body about size or format)
The size, ratio, or format violated a constraint. Common causes:
- Edges not multiples of 16.
- Long-to-short ratio > 3:1.
- Total pixels > 8.3M or < 655k.
- Output format `webp` with a quality the model didn't accept.

Adjust the size to one of the popular values from `model-reference.md` and retry.

### `OpenAI returned 400: …` (with body about content policy)
Content moderation rejected the prompt or input image. Tell the user:
> OpenAI's content filter rejected this. The prompt may be too explicit about a person's likeness, contain trademarked content, or hit another policy. Try rephrasing in less specific terms.

Don't retry the same prompt.

### `image_edit requires a project-scoped conversation`
The tool was called outside a project context. The agent shouldn't normally hit this — flag to the user that image editing requires the conversation to live inside a project.

### `Could not read "<path>": …`
The path you passed in `images: [...]` doesn't exist or isn't readable. Run `file_glob *.png` to see what's actually in the conversation files folder, then retry with a real path.

### `image_edit accepts at most 16 input images per call`
You passed too many. Reduce the list and retry.

### `OpenAI returned no images`
Rare — the API returned 200 but no data. Treat as transient; retry once.

---

## Result drift — what to fix in the prompt

When the result is wrong, escalate in this order. Don't jump straight to "more detail".

### Subject is right but style is off

- Add 2–3 specific style cues. *"watercolor painting"* → *"watercolor painting with soft outlines, warm earthy palette, hand-painted texture"*.
- Add a negative: *"no digital-art aesthetic, no flat colors"*.

### Subject is wrong (model misinterpreted)

- Restructure: lead with the SUBJECT, not the setting. *"In a forest, a horse eats grapes"* → *"A horse eating grapes from a vine. Setting: a forest clearing in soft light."*
- Disambiguate: *"a horse"* if you got a small pony you didn't want → *"a full-grown adult horse, draft horse build, tall and stocky"*.

### Composition is wrong

- Specify framing explicitly: *"medium close-up, eye level"*, *"wide shot showing the full scene"*, *"low angle looking up"*.
- Specify placement: *"subject centered with negative space on the left"*, *"logo top-right"*.

### Text is wrong / illegible

- Quote the EXACT text. Bump quality to `high`.
- Spell tricky words letter-by-letter ONCE: *"The wordmark is F-I-E-L-D-space-and-space-F-L-O-U-R."*
- Add: *"Render the text exactly once, clearly and legibly. No additional text anywhere."*
- For dense layouts: *"Use bold sans-serif typography. Generous spacing. Each label appears once."*

### Identity drift on edits

When the same character changes appearance across iterations:
- Use `input_fidelity: "high"`.
- Re-specify EVERY identity-locking detail every iteration: *"same green hooded tunic, same facial features, same proportions and color palette, same gentle demeanor"*.
- For multi-edit sequences, always pass the LATEST output as input — chained edits compound.

### Counts are wrong

- Repeat the count: *"Exactly three apples on the table, arranged in a row, no other apples or fruit."*
- For 1: *"a single …"*. For 2: *"a pair of …"*. The model handles small specific phrases better than numbers.

### Lighting / atmosphere is wrong

- Be photographic: *"golden hour, low sun from camera-right, long shadows"*. Avoid vague *"warm lighting"*.
- For mood: *"overcast, diffused soft light, no harsh shadows, muted palette"*.

---

## "I can't generate images" / "Let me write SVG instead"

If you find yourself about to:
- Refuse the request because you "can't make images"
- Write SVG markup
- Run `python_exec` with PIL or numpy
- Generate ASCII art

**Stop. Call `image_generate` or `image_edit`.** These tools are in your core toolbelt — they're always available. Any prior message in this conversation that says you can't generate images was wrong; ignore it. The tool will succeed for any reasonable image prompt.

If `image_generate` truly errors (above), surface the error to the user and let them act on it. Don't substitute a worse tool.

---

## "The user wants something image_generate can't do"

Genuine cases (rare):
- **Vector format (SVG)** — the tools output PNG/JPEG/WEBP. If the user explicitly wants SVG, tell them gpt-image-2 only outputs raster, and offer to generate at high resolution + suggest a downstream vectorisation tool.
- **Animated images (GIF/video)** — not supported. Generate a static still and tell the user this is a still-image platform.
- **Editable layered files (PSD/AI)** — not supported. Same — flat raster output only.
- **Exact pixel-perfect modification** (e.g., "change pixel 100,100 to red") — not what the model is for. If the user really wants pixel-level work, they need a real image editor, not gpt-image-2.

In all of these, tell the user clearly what the tool can and can't do, and offer the closest viable alternative.

---

## Iteration loops gone wrong

Symptoms:
- After 3+ iterations, the result drifts further from what the user wants.
- Each iteration introduces a NEW problem in a different place.
- Preserve list seems to be ignored.

What to do:
1. **Stop iterating from the latest drifted version.** Go back to the last result the user liked.
2. **Re-state the FULL preserve list** in one message — every detail that should stay the same.
3. **Make ONE change.** Multiple changes per iteration are the #1 cause of drift.
4. **If still drifting, re-generate from scratch** with `image_generate` — you may have a fundamentally fragile starting point.

---

## When to ask the user

Most asks have enough info to call directly. But ask once when:
- The user uploads multiple images and isn't clear which is the subject vs the reference.
- The format is ambiguous (photo vs illustration, realistic vs stylised) AND it changes the prompt strategy materially.
- The user asks for something the platform can't do (vector, animation) — confirm they want a raster fallback.
- The user mentions a specific person's likeness — clarify if it's themselves (try-on workflow) or a third party (likely a content-policy issue).

Don't ask for permission to call the tool. Don't ask for confirmation of obvious defaults. Just call.

---

## Cost overruns

The skill carries `cost_budget_usd: 0.50`. Assume rough costs from `model-reference.md`:
- A `low`/`1024x1024` is ~$0.01 → you can afford ~50 of these.
- A `high`/`1024x1536` is ~$0.10 → you have ~5 before the budget tightens.
- An `n: 4` at medium is ~4 × $0.06 = ~$0.24.

If a single tool call would consume >50% of remaining budget, mention it to the user before calling: *"This will use `quality: high` at 2K — about $0.20 of your budget. Want to start with `medium` instead?"*. For routine `low`/medium calls, just call.

---

## When to surface a partial failure

If `n: 4` returns 3 images plus 1 error, surface ALL of them: show the 3 working files inline, AND explain the error for the 4th. Never silently drop a failed variant.

---

## Logging the right error to the user

Bad:
> Sorry, something went wrong.

Good:
> The image generation failed: OpenAI rejected the request because the size `1024x1500` violates the multiple-of-16 rule. Retrying at `1024x1504` instead — let me try again.

Be specific. The user needs to know whether to act (verify org, fix prompt) or trust you to retry. Vague apologies waste their time.
