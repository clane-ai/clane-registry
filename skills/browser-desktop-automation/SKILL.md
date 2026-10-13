---
name: browser-desktop-automation
version: 0.1.0
description: |
  Drive the real Chrome/Edge browser on Clane Desktop with the
  browser_control tool: navigate, log in, fill and submit forms, click through
  multi-step flows, handle popups/new tabs, read and extract page data, and run
  JavaScript on the page. Use this skill WHENEVER a desktop task needs a real
  browser and interaction - "log into X and download my invoices", "search this
  site and grab the results", "fill in this web form", "click through the
  checkout", "scrape this JavaScript-heavy page", "complete the signup on this
  site", "go to my dashboard and read the numbers" - even when the user doesn't
  say "browser". It is the snapshot-first, ref-based way to operate a page;
  reach for it instead of guessing coordinates or screenshots.
when_to_use: |
  Activate for desktop browsing that needs INTERACTION or page data: logging in,
  forms, clicking through flows, OAuth popups, multi-tab work, reading/scraping
  rendered content, downloading files from a site, running JS on a page. Do NOT
  use it for plain fact-lookup ("what's the latest on X") - that's faster via
  web_search. (Note: browser_control is the user's REAL local browser via CDP;
  the separate web-browsing skill is sandbox Playwright - different surface.)
requires_tools:
  - browser_control
---

# Browser desktop automation

## Why this skill exists

`browser_control` drives a real Chrome/Edge on the user's machine through the
Chrome DevTools Protocol. The reliable way to operate it is **snapshot-first**:
you read an accessibility-tree snapshot that lists interactive elements with
stable refs (`[ref=e5]`), then act on those refs - NOT by guessing pixel
coordinates or eyeballing screenshots. This is the same model Playwright-MCP and
Claude-in-Chrome use. Learn the loop below and the browser stops being a
guessing game.

## browser_control vs the alternatives

| Need | Use |
|---|---|
| Interact with a real page: log in, fill forms, click flows, scrape rendered/JS content, multi-tab, download from a site | **browser_control** (this skill) |
| Plain information lookup ("latest news on X", "the docs for Y") | **web_search** - cheaper, faster, no browser |
| Headless scripted browsing inside the sandbox microVM | the **web-browsing** skill (Playwright) - a different surface |

## The core loop (snapshot-first)

1. `navigate` to a URL - it returns a fresh snapshot automatically.
2. The snapshot lists elements with refs, e.g. `- button "Sign in" [ref=e3]`,
   `- textbox "Email" [ref=e5]`. New elements (modals) are marked `*`.
3. Act by **ref**: `click({ ref: "e3", element: "Sign in button" })`,
   `type({ ref: "e5", text: "me@x.com", submit: true })`.
4. After anything that changes the page, `snapshot` again to get fresh refs.
5. If a ref is stale ("Stale ref" / "no longer in DOM"), the error includes a
   fresh snapshot - just use the new refs.

Refs map to the live DOM node, so a `click` does `element.click()` on the exact
element - reliable for links/buttons/inputs. Prefer refs over CSS selectors
(which break on dynamic class names).

## Clicking and typing

- **By ref** is the default and most reliable: `click({ ref })`,
  `type({ ref, text, submit?, clear_first? })`.
- **Coordinate click** `click({ x, y, button? })` is a SEPARATE primitive for
  things a DOM click can't drive: `<canvas>`, map/drawing widgets, hover-only
  menus, or a right/middle click. Use it only when ref-click can't.
- **If a click reports success but nothing happens**, or the element is
  unreachable (e.g. inside a stubborn cross-origin iframe), fall back to
  `evaluate` with element JS: `document.querySelector(...).click()`.

## Tabs and popups

You drive ONE active tab at a time. When a site opens a new tab/window (OAuth
login, a preview, `target=_blank`), the snapshot prepends a line like:
`A new tab/window opened: [<id>] "title" - switch_tab to interact.`

- `tabs` - list open tabs (each with `active` and `isNew` flags).
- `switch_tab({ id })` - make that tab active; act there, then `switch_tab` back
  to the original id.
- `new_tab({ url })` / `close_tab({ id })` - manage tabs.

OAuth/login popups: `switch_tab` into the popup, complete the step, switch back.

## Reading and extracting data

- `read_page({ format?: "text"|"html", selector?, max_length? })` - page text/HTML.
- `extract_links({ selector? })` - all links as `{text, href}`.
- `extract_table({ selector?, index? })` - a table as JSON.
- `extract_forms({ selector? })` - form fields.
- `read_selected` - whatever the user has highlighted.

Prefer these over screen-scraping from a screenshot.

## Running JavaScript: evaluate

`evaluate({ expression })` runs JS on the page with console (REPL) semantics:
statements, a trailing expression as the return value, and top-level `await` all
work. Use it for things the structured actions don't cover - reading computed
state, triggering a download, custom DOM queries:

```js
// returns the last expression's value
const rows = [...document.querySelectorAll("tr")].map(r => r.innerText);
rows.length
```
```js
// trigger a file download
const a = document.createElement("a");
a.href = "https://site/report.csv"; a.download = "report.csv";
document.body.appendChild(a); a.click(); a.remove();
"download started"
```

## Logins

The desktop browser uses a **dedicated Clane profile** - it does NOT have
the user's existing logins/cookies. So when a site needs auth you must sign in
within this browser. BUT the profile **persists across runs**: once you (or the
user) sign in, the session stays for next time. If the user expects to be logged
in and isn't, that's why - sign in once and it sticks.

## Waiting

For pages that load or change asynchronously:
`wait_for_element({ selector, timeout_ms? })`, `wait_for_text({ text })`,
`wait_for_text_gone({ text })` (e.g. a "Saving..." spinner), `wait_for_navigation`.

## Gotchas

- **Snapshot before acting, re-snapshot after.** Refs reset on navigation; a
  stale ref means take a fresh snapshot (the error gives you one).
- **Ref-click is reliable; coordinate click is the special-case tool.** Don't
  default to coordinates.
- **evaluate is the escape hatch** for anything the actions can't reach.
- **Verify outcomes.** After a click/submit, snapshot or read_page to confirm the
  page actually advanced before reporting done.
- **Dedicated profile** - no pre-existing logins, but sessions persist.
- It's the user's real browser: don't navigate away from or close tabs the user
  was using unless that's the task.
