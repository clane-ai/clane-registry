---
publisher: clane
name: video-creator
description: "Create a real MP4 video inside the sandbox. TWO modes: (1) an animated text explainer via Remotion (React-based scenes); (2) narrate your ACTUAL slides — turn a PPTX/PDF/images into a slideshow video with an ElevenLabs voiceover (the slides appear verbatim on screen). Use whenever the user asks to \"generate/make/create a video\", \"turn this into a video\", \"voiceover over my slides/deck\", an explainer/intro/promo clip, or animate text/scenes into a shareable .mp4. Optional voiceover via the tts_generate tool when the user has an ElevenLabs key. Do NOT use for editing an existing uploaded video file, GIFs (use slack-gif-creator), or static images (use image_generate)."
license: Proprietary (Clane). Renders with Remotion — a Remotion company license is required for commercial use above their size threshold.
requires_tools:
  - node_exec
  - bash_exec
  - file_write
---

# Video Creator

Render a narrated/animated MP4 in the sandbox with **Remotion**. Remotion +
ffmpeg + a headless browser + the **pre-compiled video composition** are baked
into the sandbox image — you do NOT install or build anything; you only write a
props file and run the renderer.

## How it works

**Where files go (important).** Your working directory IS the conversation's
workspace. Write `video.json` and render `video.mp4` using **plain relative
paths** (just `video.json`, `video.mp4`) — they land in your working directory,
which is staged back so the `.mp4` shows up in the conversation's **Files**
panel for the user to download. Do **NOT** use absolute `/workspace/...` paths:
`/workspace/` is the VM root, *outside* your working directory, and files
written there do not reliably reach the Files panel.

1. **Plan the video** as a list of scenes. Each scene is one screen of content
   (a heading + a short body line). Keep it tight — ~3s per scene.
2. **Write a props file** `video.json` into the working directory describing the
   video (`file_write` with the relative name `video.json`):

   ```json
   {
     "title": "How Clane connects your tools",
     "scenes": [
       { "heading": "One message.", "body": "Your whole stack." },
       { "heading": "Connect once", "body": "Slack, Gmail, Notion, and more" },
       { "heading": "Then just ask", "body": "Clane does the work across them" }
     ],
     "accent": "#3E7BFA"
   }
   ```

   - `scenes` (required): 1–20 items. Each ≈3s; total is capped at **60s**.
   - `accent` (optional): hex accent colour (defaults to Clane Flow blue).
   - `audioSrc` (optional): the narration filename in your working directory
     (e.g. `narration.mp3` — the relative path `tts_generate` returns; see
     "Voiceover" below). Omit for a silent video.

3. **Render** by running the pre-built renderer baked into the sandbox image
   (via `node_exec` / `bash_exec`), with **relative paths**:

   ```
   node /app/video/render.cjs video.json video.mp4
   ```

   It prints `rendered .../video.mp4`. Because the paths are relative, the file
   is written into your working directory and **auto-appears in the
   conversation's Files panel** (downloadable + inline-playable). Tell the user
   it's ready there. Output is 720p H.264. The composition is pre-compiled into
   the image, so this step only renders (no bundling) — fast and light.

## Voiceover (optional)

If the user wants narration, call the `tts_generate` builtin with the narration
text — it uses the user's ElevenLabs key (added in **Settings → Voice**) and
saves the mp3 into the conversation files (it returns a relative path, e.g.
`narration.mp3`). Then set `"audioSrc": "narration.mp3"` (the returned relative
path, no `/workspace/` prefix) in `video.json` before rendering — the renderer
resolves it against your working directory. If `tts_generate` reports no key,
render a clean silent video and tell the user to add an ElevenLabs key in
Settings → Voice for narration.

## Mode 2 — narrate your ACTUAL slides (PPTX / PDF / images → MP4)

Use this when the user wants their **real slides on screen** with a voiceover
(not the animated text template above). The Remotion composition only renders
text scenes, so for "voiceover over my deck" build a slideshow with **ffmpeg** —
it shows the slides verbatim and is fast and reliable.

**Run every step in `bash_exec`, NOT `python_exec` + `subprocess`.** A long
ffmpeg run launched from `python_exec` can return `exit=0` while the output is
truncated/unfinalised (`ffprobe` then reports **`moov atom not found`**) — the
child was cut off but Python didn't notice. `bash_exec` propagates ffmpeg's real
exit code and stderr, so you actually see failures.

Keep intermediates (PDF, slide images, concat list) under `.scratch/` so they
don't clutter the user's Files panel; write only the final `.mp4` to the
working-dir root.

1. **Slides → images:**
   ```
   mkdir -p .scratch
   libreoffice --headless --convert-to pdf deck.pptx --outdir .scratch
   pdftoppm -jpeg -r 200 .scratch/deck.pdf .scratch/slide   # → .scratch/slide-1.jpg, ...
   ```
2. **Voiceover:** call the `tts_generate` builtin with the narration text → it
   returns an mp3 path (e.g. `vo.mp3`). Get its duration:
   ```
   ffprobe -v error -show_entries format=duration -of csv=p=0 vo.mp3
   ```
3. **Concat list** with per-slide duration (= audio_duration / n_slides). The
   concat demuxer drops the final slide unless you list the last image **twice**:
   ```
   # .scratch/slides.txt
   file 'slide-1.jpg'
   duration 17.1
   file 'slide-2.jpg'
   duration 17.1
   file 'slide-3.jpg'
   duration 17.1
   file 'slide-3.jpg'      # repeat last image, no duration line — fixes dropped last frame
   ```
   (paths are relative to the concat file's own dir, hence bare `slide-N.jpg`).
4. **Render** (1080p is fine — static images are cheap, so the 720p/60s caps of
   Mode 1 do NOT apply here):
   ```
   ffmpeg -y -f concat -safe 0 -i .scratch/slides.txt -i vo.mp3 \
     -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p" \
     -r 30 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -shortest deck_video.mp4
   ```
5. **VERIFY before telling the user it's ready** — a corrupt render still leaves
   a file on disk, so check it actually plays:
   ```
   ffprobe -v error -show_entries format=duration -of csv=p=0 deck_video.mp4
   ```
   A duration prints → good. `moov atom not found` / an error → the encode didn't
   finalise; re-run the ffmpeg step (in `bash_exec`) and check stderr.

## Guidance (borrowed from production video pipelines)

- **Avoid the "slideshow" feel**: vary scene content, keep headings short (≤6
  words), body lines ≤12 words. Don't put paragraphs on screen.
- **One idea per scene.** 4–8 scenes is a good explainer length.
- **Caps**: 720p, ≤60s, 30fps. Don't request larger — the render is CPU-only
  (~6× realtime) and will be clamped anyway.
- After rendering, sanity-check the file exists and is non-trivial in size; if
  the render errored, read stderr and fix the props (most failures are malformed
  `video.json`).

## Notes

The visual template is a parametric Remotion `<Composition id="Video">`
pre-compiled into the sandbox image (`/app/video/`), driven entirely by the
`video.json` props above — so every video uses the same template with different
content. Changing the template itself is a platform change (rootfs rebuild), not
something to do per request; just write good `video.json` props.
