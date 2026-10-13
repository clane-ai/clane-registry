---
name: interactive-component
version: 0.3.0
description: |
  Build a runnable, interactive React UI artifact (calculator,
  dashboard, chart, mini-tool, mini-game, form, prototype, drawing
  canvas, simulator, mockup) that renders LIVE in Clane's artifact
  pane. Use this skill ANY time the user asks for something they
  will click, type into, drag, or watch update — even when they
  don't say "React" or "JSX". Triggers: "build me a calculator",
  "make a dashboard", "show me a chart of X", "give me a Pomodoro
  timer", "draft a tip splitter", "mock up a settings page",
  "prototype an inbox UI", "create a tool that does Y", "make this
  data interactive", "visualize Z", "make a mini app for…". Output
  is one or more `.jsx` files in a per-artifact subfolder; the
  artifact pane sandboxes and renders them.

  Do NOT use when the user wants:
    - A static document (file_write → .md)
    - Office formats (docx / xlsx / pptx skills)
    - A diagram (process-diagram skill)
    - An image (image-creator skill)
    - Code that needs network / npm / filesystem (node_exec)
requires_tools:
  - file_write
---

# Interactive Component artifacts

Render live React UI inside Clane's sandboxed artifact pane. JSX is
transpiled in-browser (no build step). The user sees the result
immediately and can interact with it. The same scaffold powers a
"Download as runnable HTML" + "Download .zip" so non-devs can share
the artifact and devs can drop the source into a Vite project.

## Output: one folder per artifact

Always write the artifact into its **own subfolder**. The folder name
is the artifact's slug (kebab-case of what the user asked for). Each
folder is a self-contained app — its own entry, its own components,
its own helpers. This keeps multiple artifacts in the same conversation
from polluting each other's module namespace and produces clean zip
downloads.

```
file_write({ path: "tip-splitter/App.jsx",        content: ... })
file_write({ path: "customer-360/App.jsx",        content: ... })
file_write({ path: "customer-360/KPICards.jsx",   content: ... })
file_write({ path: "customer-360/RevenueChart.jsx", content: ... })
file_write({ path: "customer-360/mockData.js",    content: ... })
```

**Why folders, even for single-file artifacts**: a single calculator
might grow into a multi-component app one turn later. Starting in a
folder means "add a sibling" is a one-line write, not a restructure.
And users browsing the conversation files see one row per artifact,
not a soup of mixed files.

**Modifying an existing artifact**: locate the folder, edit files in
place. Don't create a v2-suffixed copy; the folder IS the artifact.

**Creating a new artifact in the same conversation**: pick a fresh
slug, new folder. Two artifacts coexist cleanly.

## Required entry shape

The entry file is named `App.jsx` and lives at the root of the
artifact folder. It must `export default` a React component:

```jsx
export default function App() {
  return <div className="p-6">Hello</div>;
}
```

Sibling components and helpers use ES module exports:

```jsx
// KPICards.jsx
export function KPICards({ data }) { return <div>…</div>; }
```

```jsx
// format.js — pure helpers, no React
export function formatCurrency(n) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }); }
```

Imports are relative; extension optional:

```jsx
import { KPICards } from './KPICards';
import { formatCurrency } from './format';
```

`App.jsx` does NOT need `import React from 'react'` — the runtime
injects React into every module's scope.

## Available imports

The runtime pre-loads these via an import map. **Use these exact
specifiers**; anything else fails:

| Specifier | Use for |
|---|---|
| `react` | Hooks, components |
| `lucide-react` | Icons (~1000) — `Plus`, `Trash2`, `ChevronDown`, etc. |
| `recharts` | Charts — `BarChart`, `LineChart`, `PieChart`, etc. |
| `clsx` | Conditional class strings |
| `date-fns` | Date manipulation, formatting |
| `motion/react` | Spring/transition animations (Motion library) |

Tailwind CSS classes work inline — no import or config needed. Every
default v3 utility is available, plus arbitrary values: `w-[420px]`,
`text-[#6366f1]`, `grid-cols-[220px_1fr]`.

For full module APIs, see `references/libraries.md`.

## Constraints (sandbox + bundle cap)

The iframe runs with `sandbox="allow-scripts"` (no `allow-same-origin`)
and a strict CSP. These will silently fail or throw — design around
them:

| Blocked | Workaround |
|---|---|
| `fetch()`, `XMLHttpRequest`, WebSockets | Bake mock data inline as a `const`. If real data is essential, refuse and ask the user to paste a snapshot. |
| `localStorage`, `sessionStorage`, cookies | State lives in `useState`. Resets on reopen — that's expected. |
| `window.open`, `<a target="_blank">` | Render the URL as plain text the user can copy. |
| `<img src="https://...">` (any HTTPS) | Use `lucide-react` icons, inline SVG, or `data:` URLs. |
| Top-level navigation, form submit | Handle everything client-side. |
| Loading scripts/imports outside the table above | Inline the helper or pick a listed lib. |

**Bundle cap**: the entry + every sibling totals **256 KB max**. The
runtime refuses larger payloads. Splitting across files does NOT
bypass this.

If the user's request *requires* network or storage ("a tool that
fetches the latest exchange rate"), say so plainly: "the sandbox can't
make network calls — paste rates inline or I'll bake in samples."
Don't pretend it works.

## Design: avoid AI-slop

Anthropic's `frontend-design` calls these out — they're the visual
markers that say "an AI made this." **Avoid:**

- Centered everything inside `max-w-md mx-auto`
- Purple-to-pink or indigo-to-blue gradients on white
- Uniform `rounded-2xl` on every element
- `font-family: Inter` (or system default) for everything
- Soft drop shadows on every card
- Emoji headers, "Get Started ✨" copy, sparkle/spark/zap iconography

**Do** — pick a single dominant accent + neutral grayscale, vary corner
radii, use serif headings (`font-serif`) with sans body, restrain
shadows, use Lucide icons sparingly.

If the user gives no aesthetic direction: light theme, `zinc`
neutrals, ONE accent (pick `indigo` / `emerald` / `amber` / `rose`
based on the artifact's domain, not always indigo), `font-serif` on
h1/h2, sans body.

See `references/tailwind-patterns.md` for tested UI recipes (buttons,
inputs, cards, tabs, modals, tables, empty states, palettes).

## Templates

Start from a template when the artifact matches one of these shapes.
Each is a complete working folder under `templates/`:

| Template | Use for |
|---|---|
| `calculator/` | Numeric inputs → derived result (tip / mortgage / unit / discount calculators) |
| `todo/` | List CRUD (todos, shopping list, tags) |
| `bar-chart/` | KPI dashboard + Recharts bar chart (revenue, comparisons) |
| `data-table/` | Sortable + filterable rows (customers, transactions, search results) |
| `form-wizard/` | Multi-step form (onboarding, registration, configuration) |
| `tabbed-dashboard/` | Sidebar + multi-section app — multi-file template |

Read the relevant template before writing — copy the structure, adapt
the content to the user's request. **Don't blindly clone.**

## State patterns

- **Form state**: flat object, `setForm({ ...form, [field]: value })`. Inputs as strings; parse to number where computed.
- **Lists with CRUD**: array of `{ id: crypto.randomUUID(), ... }`; functional updates so successive ops compose.
- **3+ actions on the same state**: `useReducer` instead of chained `setX` calls.
- **Derived values**: `useMemo` only when the computation is non-trivial OR the result is a memoized child's prop.
- **Debounced input**: `setTimeout` + cleanup inside `useEffect`. No library.

See `references/state-patterns.md` for tested recipes (debounce,
intervals, refs, RAF loops, multi-select).

## Iteration with the user

After producing the artifact, summarize in 2–3 lines what it does
and ask one specific next-step question:

> Tip splitter is in `tip-splitter/App.jsx`. Type a bill and tip
> percentage; per-person split updates automatically. Want a
> custom-tip slider, or split-by-uneven-shares?

Don't ask "what would you like to change?" generically. Pick the most
likely next move and offer it.

## What NOT to do

- Don't write at the conversation root (always use a subfolder).
- Don't add `<script src="…">` — the CSP blocks every CDN not in the
  import map. The user gets a blank screen.
- Don't try to read or write files via the agent's tools from inside
  the artifact. The artifact is leaf code; the iframe can't call back.
- Don't `console.log` debug noise — the iframe console is hidden.
- Don't import from URLs (`https://esm.sh/...`) — use the bare
  specifiers above. The import map handles resolution.

## Reference

- `references/libraries.md` — module APIs (Lucide catalog, Recharts
  components, date-fns most-used functions, full Tailwind notes)
- `references/tailwind-patterns.md` — UI recipes
- `references/state-patterns.md` — React state recipes
- `references/pitfalls.md` — every common error with the fix
- `templates/<name>/` — full working artifact folders
