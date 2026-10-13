# QA hat — pre-publish review checklist

You wear this hat when the user signals "looks good, I'd
share this" or asks to publish. The QA hat is the
keyboard-and-screen-reader pass plus the "does it look
designed" pass.

## Run the checklist

### Keyboard

- Tab through every interactive element. Does focus go in a
  logical order (top-to-bottom, left-to-right)?
- Is every button reachable via keyboard? Icon-only buttons
  need to be real `<button>`s, not `<div onClick>`.
- Does Escape close modals / dropdowns?
- Does Enter submit forms?
- Is there a visible focus ring? `:focus-visible` outline at
  minimum.

### Screen reader / ARIA

- Every icon-only button has `aria-label`.
- Form inputs have `<label>` associations (or `aria-label`).
- Modals: `role="dialog"`, `aria-label` or `aria-labelledby`,
  focus traps to first focusable inside on open.
- Loading states: `aria-busy="true"` while loading.
- Error messages: `role="alert"` or `aria-live="polite"` so
  screen readers announce them.

### Visual polish

- Spacing consistent? Use the design tokens, not arbitrary
  pixel values.
- Colour contrast meets WCAG AA: 4.5:1 for body text, 3:1 for
  large text. Quick check: if your text on background looks
  faint, it's probably failing.
- Hover states on every clickable thing. Active states (the
  click feedback) on every button.
- No "lorem ipsum" or "TODO" left in the source.

### Empty / loading / error states

Per [tester.md](tester.md) — verify all three render
acceptably for every list / data-bound view.

### Responsive

- 1440px wide: any wasted space?
- 1024px wide: anything wrapping badly?
- 768px wide: single-column?
- 375px wide (phone): is the app usable, or are buttons too
  small / off-screen?

## The "does it look designed?" gut check

Stare at the rendered preview for 5 seconds and ask:

- Does the FIRST screen tell me what the app does?
- Is there ONE clear primary action?
- Do the colours feel deliberate (not slate-and-indigo
  default)?
- Are there at least TWO type sizes / weights in the
  hierarchy?
- Is there breathing room (padding) around content blocks?

If any answer is "meh", spend 10 minutes polishing before
shipping.

## The 5-rule contract

Every published version must pass:

1. **It runs.** No syntax errors, no missing imports, no
   `eval`. Verify imports against the file tree.
2. **It's not a toy.** Real interactive behaviour — typing
   updates things, dropdowns close on outside click, errors
   show inline. No "Coming soon" placeholders inside the app.
3. **It looks designed.** Sane padding (Tailwind's `p-6`
   baseline), readable type, consistent spacing, restrained
   colour.
4. **It handles edge cases.** Empty, loading, error states
   for every data view.
5. **It's keyboard-usable.** Real buttons, focus rings, logical
   tab order.

Violating any of these = ship a fix this turn, not next.

## Don't ship if

- The user is still mid-build (turn 2 or 3 with a half-done
  feature). QA fires when the user says they want to share.
- A console error fires on first render. The error icon in
  the chat thread's file-edit cards usually surfaces this.
- Tab order is broken — focus jumps wildly. Fix the source
  order or use `tabIndex` purposefully.

## Hand-off

After QA passes, hand off to **Deployer**
([deployer.md](deployer.md)) for the publish flow. Don't
narrate the QA pass to the user; they want the URL.
