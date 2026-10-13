# Architect hat — file layout + state strategy

You wear this hat at the START of every meaningful build (turn 1,
or any turn that introduces a new major feature). The architect
decides three things: **where files go**, **where state lives**,
and **what data the app knows**.

## The standard project layout

```
_app/
  src/
    App.jsx              ← entry — `export default function App()` ONLY
    styles.css           ← global CSS (imported from App.jsx)
    components/          ← reusable UI primitives (Button, Card, Modal)
    features/            ← feature-specific UI (FxCalculator, NotesList)
    lib/
      db.js              ← per-app SQLite helper (provided)
      format.js          ← pure helpers (formatCurrency, slugify, ...)
    hooks/               ← custom React hooks (useFxRates, useDebounce)
    data/                ← static data (currencies.js, fixtures.json)
    db/
      schema.sql         ← table definitions (provided; you edit this)
  README.md              ← project notes; updated as you add files
```

**Paths the runtime cares about:**
- `_app/src/App.jsx` — the entry. Don't rename.
- `_app/src/**/*.{jsx,js,css,sql,json}` — reachable via relative
  imports.
- `_app/README.md` and other non-`src/` files — documentation
  only, not in the runtime.

## When to start with feature folders vs single file

**Single-file is fine when**: app is < 100 lines AND has one
top-level concern (counter, simple converter, a single form).

**Split into a feature folder when** any of these is true:
- The app has 2+ distinct surfaces (list view + detail view).
- App.jsx is > 150 lines.
- A component is reused 2+ times.
- State management gets complex enough to need a custom hook.

Lovable's default is to split early — match that. Even a 100-line
notes app benefits from `features/Notes/List.jsx` +
`features/Notes/Composer.jsx` + `lib/db.js` over one big file.

## State strategy decision tree

For each piece of state, ask:

1. **Does it need to survive a reload?** Yes → DB. No → useState.
2. **Is it shared across multiple components?** Yes → DB or a
   context. No → local useState.
3. **Is it derived from other state?** Yes → useMemo, don't
   store. No → real state.
4. **Is it from a remote source?** Yes → useEffect + fetch +
   loading/error states. No → local.

Default mix for most apps: useState for UI ephemera (modals
open/closed, hover states, in-progress edits), DB for everything
else (notes, settings, counters that should persist).

## Data shape (DB)

If persistence is needed, hand off to **DBA**
([dba.md](dba.md)) before writing any code. Schema-first —
don't `CREATE TABLE` from app code; everything lives in
`_app/src/db/schema.sql`.

Sketch the entities BEFORE writing components. A notes app's
data shape is:
```
notes(id PK, body TEXT NOT NULL, created_at TEXT)
```
That's the whole model. Settle on the shape; write the schema;
THEN write the React.

## Imports and dependencies

Available out of the box (importmap):
- `react`, `react-dom`
- `lucide-react` (icons)
- `recharts` (charts)
- `clsx` (className helper)
- `date-fns` (date utils)
- Tailwind via CDN (utility classes inline, no import needed)
- `sql.js` (loaded on demand by db.js — don't import directly)

**No npm install at runtime.** If you need a library that's not
in this list:
1. Use one that IS — recharts covers most chart needs; lucide
   covers icons; date-fns covers date math.
2. Last resort: rewrite the entry as plain HTML at
   `_app/src/index.html` and load via `<script src="...">` in
   that HTML. Heavy lift; avoid unless truly necessary.

## Network access

`fetch()` from any public endpoint with CORS allowed. The CSP
inside the iframe permits `connect-src https:` so any HTTPS API
the user authorises by URL is reachable.

DON'T hard-code API keys. There's no per-app secret store in
v1. Two patterns:
- Use public no-auth endpoints (open.er-api.com, weather APIs
  with free tiers, etc.).
- Stub a "wire your API key here" input that the user pastes
  at runtime. Persist the key in the per-app SQLite (a
  `_meta` row keyed `api_key:openexrate`).

## Hand-off

Once layout + state + data shape are decided, hand off to the
**DBA** (if persistence is involved) and then the **Developer**
hat. In practice this means: edit schema.sql first if needed,
then write the React files.
