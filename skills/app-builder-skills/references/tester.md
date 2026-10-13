# Tester hat — edge cases, every state

You wear this hat at the END of an implementation turn (before
declaring done) and any time the user reports unexpected
behavior. The tester's job is to surface the states the user
will actually hit.

## The four-state rule for every list-rendering component

Every component that renders data MUST handle:

1. **Loading**: data is being fetched. Render a skeleton or
   "Loading…" — never nothing.
2. **Empty**: data loaded successfully but the list is empty.
   Render an empty-state with the affordance to add a first
   item ("No notes yet — add one below").
3. **Error**: fetch failed. Show the error message + a Retry
   button. Don't show a generic "Something went wrong".
4. **Success**: data loaded with rows. Render the rows.

A component without all four is incomplete. Add them in the
SAME turn — don't ship and let the user discover.

## Concrete pattern

```jsx
function NotesList() {
  const db = useDb();
  const [state, setState] = useState({ kind: 'loading' });

  useEffect(() => {
    if (!db) return;
    db.all('SELECT * FROM notes ORDER BY created_at DESC')
      .then((rows) => setState({ kind: 'ok', rows }))
      .catch((err) => setState({ kind: 'error', message: err.message }));
  }, [db]);

  if (state.kind === 'loading') return <Skeleton />;
  if (state.kind === 'error')   return <ErrorState message={state.message} onRetry={...} />;
  if (state.rows.length === 0)  return <EmptyState />;
  return <ul>{state.rows.map((n) => <NoteRow key={n.id} note={n} />)}</ul>;
}
```

This is more code than `if (!notes) return null` — and it's
worth every line. The user notices.

## Form-input edge cases

For every input, mentally try:

- **Empty submit**: blank string, all whitespace, just numbers
  in a name field. Validate inline; submit button disabled
  when invalid.
- **Long values**: 1000-char names, paragraph-long titles. Use
  `maxLength` on inputs; truncate with `…` in display.
- **Special characters**: quotes, emojis, unicode. SQL params
  (`?`) handle this — never string-interpolate.
- **Whitespace boundaries**: leading/trailing spaces. Trim on
  save (`body.trim()`) but allow internal spaces.
- **Very fast double-clicks**: button submits twice. Disable
  the button during the async call.

## Numeric inputs

- Negative numbers when only positive makes sense.
- Zero when the spec assumes positive (division-by-zero risks).
- Scientific notation (`1e5`) accidentally pasted in.
- Locale-specific decimals (`,` vs `.`) — pick `parseFloat`
  semantics consistently and document.

## Network failure modes

- API returns 404 / 500 → ErrorState.
- API returns 200 but empty / malformed JSON → guard
  `if (!data || !Array.isArray(data.results))`.
- Network is offline → `fetch` throws TypeError. Catch it.
- Timeout — wrap fetch in a 10-second timeout via AbortController.

## Layout / responsive

Mentally resize the browser window:
- 1440px (desktop default): does the layout hog space?
- 1024px (tablet): does anything wrap badly?
- 768px and below: single-column? Buttons reachable?

Don't optimise for mobile in v1 unless asked, but DON'T break
on tablet — that's table-stakes.

## Database edge cases

- Empty table on first boot — schema applied but no rows.
- A row where an optional field is NULL — render "—" or omit,
  don't print "null".
- Foreign keys — orphan rows after a parent delete. v1 SQLite
  has FKs off by default; either turn them on (`PRAGMA
  foreign_keys = ON`) or accept best-effort cleanup.
- Schema upgrade — old data with the old shape, new code
  expecting the new shape. Either backfill in schema.sql with
  `UPDATE` or guard reads with `?? defaultValue`.

## Public-link permission edge cases

- `useDb()` returns `{ readOnly: true }` for view-only shares.
  Hide write UI; the alternative — letting them click and see
  a 403 — is a worse UX than not showing the affordance.
- The unauthenticated visitor opens the app — the iframe loads
  but the per-app DB needs the token (passed via the bootstrap).
  If `__nexa_db` is missing, db.js throws a clear error. Catch
  it in your component or render a "this link is broken"
  state.

## The mental walkthrough — every reply

Before announcing done, walk through:

1. Open the preview MENTALLY — is the FIRST screen useful, or
   a wall of inputs?
2. Click each button mentally — does anything misbehave?
3. Try the empty state — does it show something helpful?
4. Try the error state — useful message, or cryptic stack?
5. Tab through the page mentally — does focus go in a logical
   order?
6. If there's a list, what does 0 / 1 / 100 / 1000 rows look
   like? Is pagination needed?

If any check fails, ship a fix in this run, not the next one.

## Hand-off

Tester is usually the LAST hat in a build turn before reply.
After tester, hand off to **QA** ([qa.md](qa.md)) for
accessibility + polish — but only if you have token budget.
For most turns, tester checks are sufficient and QA fires
pre-publish.
