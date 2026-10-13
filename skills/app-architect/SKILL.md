---
name: app-architect
version: 0.1.0
description: |
  Build production-quality multi-file web apps inside a Clane app
  conversation. Replaces interactive-component for app-builder runs:
  this skill teaches multi-file project structure, component libraries,
  data fetching, routing, design tokens, and the iteration loop that
  turns a one-line prompt into a polished tool. Use ANY time the role
  is `app-builder` or the conversation's `kind='app'`.

  This is the heavy app-construction skill — comparable to pptx / xlsx
  in depth. Activate it on the first turn of every app chat. Read the
  references lazily based on what the app needs (a stat dashboard
  reaches for charts.md; a CRUD tool reaches for forms.md).

  Do NOT use:
    - For inline conversation artifacts (single-file JSX in a task chat)
      → use `interactive-component` instead.
    - For reading/parsing an uploaded source repo → no skill applies;
      use file_read.
    - For backend/server code → app-builder runs in a sandboxed iframe;
      no Node, no DB, no auth.
when_to_use: |
  Activate on every turn of a `kind='app'` conversation. The app's
  source lives in `_app/` (already scaffolded from app-starter); your
  job is to extend / refine that project to match the user's intent.
inputs:
  - type: app_spec
    required: true
outputs:
  - type: app_files
requires_tools:
  - file_write
  - file_edit
  - file_read
  - file_glob
model_hint: anthropic/claude-opus-4-7
cost_budget_usd: 1.5
category: build
tags:
  - app
  - jsx
  - lovable
  - multi-file
---

# App Architect

You build production-quality multi-file web apps. Your output is the
file tree under `_app/` in the conversation files folder. The runtime
renders `_app/src/App.jsx` as the entry; everything under `_app/src/`
is reachable via relative imports. The user sees a live preview
update after every run; they can publish the app to a public URL
with one click.

**You are not building toy demos.** You build apps people actually
use — calculators that handle edge cases, dashboards that load
gracefully, forms that validate inline. Treat every app like it's
going on the user's homepage.

## Quick reference

| Task | Read |
|------|------|
| First-turn scaffold for a NEW app | [first-turn.md](references/first-turn.md) |
| Add a new feature to an existing app | [iteration.md](references/iteration.md) |
| Build a chart / data viz | [charts.md](references/charts.md) |
| Build a form (input, validation, submit) | [forms.md](references/forms.md) |
| Multi-page app with routes | [routing.md](references/routing.md) |
| Wire up a component library (Card, Button, Modal) | [components.md](references/components.md) |
| Apply a design system (tokens, spacing, type) | [design.md](references/design.md) |
| Pull live data from a public API | [data-fetch.md](references/data-fetch.md) |
| Errors, loading states, empty states | [states.md](references/states.md) |
| Accessibility (keyboard, ARIA, focus) | [a11y.md](references/a11y.md) |

Read references **on demand** — most apps need 2-3 of these per turn,
not all of them. Loading every reference up front burns tokens.

## The runtime — what you can rely on

Every app runs in a sandboxed iframe with these globals via importmap:

| Module | What it gives you |
|---|---|
| `react`, `react-dom` | Standard React 18 hooks API |
| `lucide-react` | Icon set — `import { Search, ChevronRight } from 'lucide-react'` |
| `recharts` | Charts: LineChart, BarChart, PieChart, AreaChart, etc. |
| `clsx` | className helper for conditional classes |
| `date-fns` | Date formatting + arithmetic |
| Tailwind via CDN | Utility classes inline (`className="p-6 text-xl font-medium"`) |

**No npm install at runtime.** If you need a library that's not in
this list, do one of:
1. Use one that IS in the list (recharts covers most chart needs;
   lucide covers icons; date-fns covers date math).
2. Switch the app to plain HTML (`_app/index.html`) and load via
   `<script src="https://cdn.jsdelivr.net/...">` — heavier, only do
   this when JSX truly can't.

**Network access**: yes, the iframe can `fetch()` from any public
endpoint. CORS rules apply — the public API has to allow it.

## Project layout — the contract

```
_app/
  src/
    App.jsx              ← entry — `export default function App()` ONLY
    styles.css           ← global CSS (imported from App.jsx)
    components/          ← reusable UI primitives (Button, Card, Modal)
    features/            ← feature-specific UI (FxCalculator, RatesTable)
    lib/                 ← pure helpers (formatCurrency, parseRate)
    hooks/               ← custom React hooks (useFxRates, useDebounce)
    data/                ← static data + mocks (currencies.js, fixtures.json)
  README.md              ← project notes; updated as you add files
```

**Paths the runtime cares about:**
- `_app/src/App.jsx` — the entry. Don't rename.
- Anything under `_app/src/**/*.{jsx,js,css}` — reachable via relative
  imports.
- `_app/README.md` and other non-`src/` files — documentation only,
  not in the runtime.

**Don't dump everything in App.jsx.** A 200-line App.jsx is an
anti-pattern; split into focused files even for a v1. Lovable's
default scaffold has 15+ files for a 100-line app — that's the
right ratio. See [iteration.md](references/iteration.md) for the
splitting heuristics.

## The five-rule contract

Every published version must pass these:

1. **It runs.** No syntax errors, no missing imports, no `eval`. Test
   the file paths in your imports match what's on disk (`file_glob`
   if unsure).
2. **It's not a toy.** Real interactive behaviour — typing updates
   things, dropdowns close on outside click, errors show inline.
   No "Coming soon" placeholders inside the app.
3. **It looks designed.** Sane padding (Tailwind's `p-6` baseline),
   readable type (text-base or text-lg for body, text-2xl+ for
   headings), consistent spacing (use `space-y-4` not random margins),
   restrained colour (one accent, neutrals everywhere else).
4. **It handles edge cases.** Empty state when there's no data.
   Loading state when fetching. Error state when fetch fails. Don't
   leave the user staring at a blank screen.
5. **It's keyboard-usable.** Buttons are real `<button>`s, not
   `<div onClick>`. Focus rings show. Tab order is logical.

Violating any of these = ship a fix, not an excuse.

## On turn 1 — the scaffold-vs-rewrite decision

The app starts with the app-starter template (Hello/counter). Your
first turn:

1. **Read the prompt** — what's the actual job? Currency converter,
   habit tracker, KPI dashboard, expense splitter, etc.
2. **Read the existing files** — `file_glob({pattern: "_app/**"})` to
   see the scaffold; `file_read` the entry to confirm.
3. **Decide the structure** — see [first-turn.md](references/first-turn.md)
   for the file layout per app type.
4. **Build the v1** — write each file via `file_write` (new) or
   `file_edit` (modifying the scaffold). Don't bundle multiple files'
   content into a single `file_write`; one tool call per file.
5. **Update the README** — note what's there so future turns (or other
   agents on this app) can orient.
6. **Tell the user briefly** what you built (1–2 sentences) and what
   they could ask for next.

Don't ask clarifying questions on turn 1 unless the prompt is genuinely
ambiguous (one-line prompts give you full leeway).

## Iteration — turns 2+

Refinement turns are 90% of the work. The user says "make it bigger"
or "add EUR" or "use green for positive".

- Read the file you're changing first (`file_read`) — don't rewrite
  from memory.
- Use `file_edit` for surgical changes — preserves unchanged sections,
  much cheaper than `file_write` of the whole file.
- Use `file_write` only for new files or when the change is so deep
  that an edit would be larger than a rewrite.
- After ~5 turns of accumulated changes, scan the file structure —
  if App.jsx has crept past 150 lines, split into a feature folder.
- Keep the README.md current.

## Output to the user — the chat thread

The user sees the preview re-render automatically. Don't narrate the
implementation; surface only the *intent* in chat:

- Bad: "I'll create src/App.jsx, src/styles.css, and src/components/Button.jsx with the following code…"
- Good: "Built a clean FX calculator with USD/EUR/GBP, live rates from open.er-api.com, and a swap button."

One short paragraph per turn. The Code tab shows what changed; the
preview shows the result. Save the user's tokens.

## Things to absolutely not do

- **Don't include API keys** in source. v1 has no per-app secret
  store. Use public endpoints, or stub the data with a "wire your
  key here" placeholder.
- **Don't write outside `_app/src/`** for app source. README and
  other doc files can live in `_app/` directly; everything else
  belongs under `src/`.
- **Don't use `python_exec` / `node_exec` for app rendering** —
  they're for data work. The iframe runs your `_app/src/` files
  directly.
- **Don't ship loading-state-as-the-feature** — "your data is
  loading" forever isn't an app, it's a placeholder. Stub data
  inline if the API isn't reachable.
- **Don't build a SPA-of-popups.** If everything is a modal, the
  user is lost. Use modals for confirmations and edits, not
  navigation.
- **Don't reinvent components every file.** If you write a Button
  in App.jsx and a Button in features/Foo.jsx, factor to
  components/Button.jsx on the next turn.

## Quality bar — be honest with yourself

Before announcing the version is ready, check:

- Open the preview mentally — is the FIRST screen useful, or is it
  a wall of inputs?
- Click each button mentally — does anything misbehave?
- Resize the window mentally — does the layout collapse?
- Try the empty state — does it show something helpful?
- Try the error state — does the user get a useful message, or a
  cryptic stack trace?

If any of these fail, ship a fix in this run. The user notices.
