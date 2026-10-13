# Common pitfalls + fixes

Every error you might see when an artifact doesn't render, with the fix.

---

## "No `App` component found" / "Entry module must export default…"

**Cause:** The entry file (typically `App.jsx`) doesn't `export default` a component.

**Fix:** Use one of these forms exactly:

```jsx
// Option A
export default function App() { return <div>…</div>; }

// Option B
function App() { return <div>…</div>; }
export default App;
```

A bare top-level `function App() {}` without `export default` does NOT work. The runtime reads `module.exports.default`, not the JS file's eval scope.

---

## "Failed to resolve module specifier 'X'"

**Cause:** Importing a name that's not in the import map.

**Fix:** Only these specifiers are valid:

```jsx
import 'react'
import 'react-dom/client'
import 'react/jsx-runtime'
import 'lucide-react'
import 'recharts'
import 'clsx'
import 'date-fns'
import 'motion/react'
```

Plus relative paths to siblings: `./Foo`, `./Foo.jsx`, `./Foo.js`.

If you need a library that isn't on the list, inline its functionality. Don't try to add `<script src="…">` to other CDNs — the CSP blocks them.

---

## Blank screen, console says "Refused to load the script…" or "violates the following Content Security Policy"

**Cause:** Some code (yours or a transitive dependency) is trying to load a resource from an origin not on the CSP allowlist.

**Common triggers:**
- An `<img src="https://example.com/…">` — img-src is data: + blob: only.
- A `<script src="https://example.com/…">` — script-src allows only esm.sh, jsdelivr, unpkg, tailwindcss CDN.
- A custom font URL.
- A `<link rel="stylesheet" href="https://example.com/…">` — style-src allows jsdelivr + Google Fonts only.

**Fix:**
- Images: switch to a Lucide icon, inline SVG, or `data:image/png;base64,…`.
- Fonts: use a Tailwind font stack (`font-serif`, `font-sans`, `font-mono`) or `@import url('https://fonts.googleapis.com/css2?family=…')` from `<style>` (Google Fonts is allowlisted).
- Scripts: refuse — refactor to use an in-allowlist library.

---

## `fetch` calls just hang or throw "Failed to fetch"

**Cause:** CSP `connect-src 'none'` blocks all network requests inside the sandbox.

**Fix:** Bake data inline. If the demo genuinely needs live data, refuse the request: "I can build the UI but the sandbox can't make network calls — paste a snapshot or I'll bake in samples."

---

## Hooks don't work / "Invalid hook call"

**Cause:** Two copies of React loaded. This happens when one of your siblings imports React from a different source than the entry — usually because someone wrote `import React from 'https://esm.sh/react@18'` instead of `import React from 'react'`.

**Fix:** ALWAYS use bare specifiers (`import React from 'react'`). The import map ensures every file gets the same React instance. Never inline esm.sh URLs — that's what the import map is for.

---

## Tailwind classes look wrong / not applied

**Cause:** Most often a typo (`bg-zinc-90` instead of `bg-zinc-900`) or using a class that doesn't exist (`bg-primary` without a custom config).

**Fix:**
- Check the class name in Tailwind docs (or use the IntelliSense autocompletes the agent's brain has).
- The Play CDN works with all default Tailwind v3 utilities. There's no custom theme — `bg-primary` does NOT work; use `bg-zinc-900` etc.
- Arbitrary values work: `w-[420px]`, `text-[#6366f1]`.

---

## Animations stutter / page feels janky

**Cause:** Too many state updates per second, or animating layout properties.

**Fix:**
- Animate `transform` and `opacity`, not `width` / `height` / `top` / `left`. Tailwind: `transition-transform`, not `transition-all` for free.
- For interval-based animations, throttle to 60 fps max (16 ms intervals are usually overkill — try 100 ms or 200 ms).
- Don't trigger React re-renders from `requestAnimationFrame` callbacks unless necessary; use refs to mutate canvas/DOM directly.

---

## Charts (Recharts) don't show up

**Cause:** Almost always missing `<ResponsiveContainer>` or zero height.

**Fix:**

```jsx
// ❌ This is invisible — no height
<BarChart data={data}>…</BarChart>

// ✅ Wrap in ResponsiveContainer with explicit height
<ResponsiveContainer width="100%" height={320}>
  <BarChart data={data}>…</BarChart>
</ResponsiveContainer>
```

Or set width/height directly on the chart:

```jsx
<BarChart width={600} height={320} data={data}>…</BarChart>
```

---

## "data is undefined" on first render

**Cause:** State initialized as `undefined` or `null` and consumed before populated.

**Fix:** Initialize state with the right shape:

```jsx
// ❌
const [data, setData] = useState();
const total = data.reduce(…); // crashes

// ✅
const [data, setData] = useState([]);
const total = data.reduce(…, 0);
```

Or guard with optional chaining + early return:

```jsx
if (!data) return <Spinner />;
```

---

## Form input shows the wrong character / cursor jumps to end

**Cause:** Storing form value as a number when the input expects a string. React re-formats on every keystroke.

**Fix:** Always store input values as strings; parse to number only when computing:

```jsx
const [amount, setAmount] = useState('100');           // ✅ string
const numericAmount = parseFloat(amount) || 0;         // parse where used

<input value={amount} onChange={(e) => setAmount(e.target.value)} />
```

---

## Scroll inside the artifact doesn't work / page scrolls weirdly

**Cause:** The iframe is fixed-height; if your content overflows, your inner container needs `overflow-y-auto`.

**Fix:**

```jsx
// Long list inside a fixed-height shell
<div className="h-screen flex flex-col">
  <header className="flex-none">…</header>
  <main className="flex-1 overflow-y-auto p-4">{longList}</main>
</div>
```

---

## Numbers don't align in tables

**Cause:** Default font isn't tabular.

**Fix:** Add `tabular-nums` to the cell or column:

```jsx
<td className="text-right tabular-nums">${value.toLocaleString()}</td>
```

---

## "Cannot find module './Foo'" but `Foo.jsx` exists

**Cause:** Sibling files weren't fetched — usually because the artifact was opened from a project context, not a conversation.

**Fix:** Multi-file artifacts are conversation-scoped. Project files are read-only and don't get sibling resolution. Write all files into the same conversation folder.

---

## Console shows "cdn.tailwindcss.com should not be used in production"

**Cause:** Tailwind's own message reminding you the Play CDN regenerates classes at runtime.

**Fix:** Ignore it. We're not in production; we're in a sandboxed demo runtime. The Play CDN is the right tool for in-browser JSX with no build step.

---

## Console shows "Connecting to '…' violates connect-src 'none'"

**Cause:** Almost always a sourcemap fetch — `babel.min.js` declares a
`//# sourceMappingURL=babel.min.js.map` comment, and DevTools fetches
that file via `fetch()` whenever the panel is open. CSP `connect-src
'none'` correctly blocks it.

**Fix:** Ignore. Sourcemaps are a DevTools-only convenience; closing
DevTools makes the warning disappear, and execution is unaffected
either way. We deliberately keep `connect-src 'none'` strict — adding
unpkg.com / jsdelivr.net to the allowlist would let an agent encode
secrets into URL paths and exfil them via a "fetch that returns 404",
which the browser would still send before the 404. The single warning
line in DevTools is worth keeping that exfil channel closed.

---

## Console shows "frame-ancestors directive is ignored when delivered via meta"

**Cause:** Browsers only honor `frame-ancestors` from an HTTP response header, not from a meta tag.

**Fix:** Already removed from our CSP. The sandbox attribute on the parent iframe is the actual protection.

---

## Render error caught by the runtime (red box at the bottom)

The runtime catches render errors and surfaces them. When this happens:
1. Open the **Source** tab in the artifact pane to inspect the offending file.
2. Look for the line in the error message — Babel's source-mapped line numbers refer to the entry file as you wrote it.
3. Common culprits: missing `key` in a `.map()`, calling a hook conditionally, mutating state directly.

---

## Bundle too large

**Cause:** Total .jsx + .js bytes across all sibling files exceed 256 KB.

**Fix:**
- Inline tabular data into a `const` rather than embedding huge JSON.
- For "lots of mock data", generate it programmatically inside the artifact instead of writing it out.
- For very long components, split into siblings — but remember the cap is on the SUM, not per-file. Splitting doesn't bypass it; it only helps if you can prune dead code.
