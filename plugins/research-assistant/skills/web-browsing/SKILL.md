---
name: web-browsing
version: 0.1.0
description: |
  Drive a real headless Chromium browser (Playwright) inside the user's
  sandbox microVM to do things plain web search can't: log in, fill forms,
  click through multi-step flows, wait for JavaScript-rendered content,
  take screenshots, or scrape sites that block API-style fetchers.
  Activate whenever the task needs *interaction* with a page, *visual*
  verification, or *authenticated* access — not just reading text.
when_to_use: |
  Activate for: "log into X and ...", "click through to ...", "fill this
  form and submit", "take a screenshot of ...", "wait for the chart to
  render and ...", "scroll down and ...", "scrape this site that requires
  JS / login / a session", "submit this search and grab the second page",
  "verify this page looks correct visually". Do NOT activate for plain
  information-retrieval questions ("what's the latest on X", "look up the
  docs for Y", "extract this URL into markdown") — those are cheaper and
  faster via the web-search skill (Tavily).
inputs:
  - type: user_task
    required: true
outputs:
  - type: extracted_data
  - type: screenshot
  - type: interaction_result
requires_tools:
  - node_exec
  - bash_exec
---

# Web Browsing (Playwright in the sandbox microVM)

You have a real headless Chromium browser available **inside the user's
per-user sandbox microVM**. The browser binaries, Playwright, and
`@playwright/mcp` are pre-installed in the rootfs — no `npm install`,
no `playwright install` required.

There are **two ways** to drive the browser. Pick based on what's
registered for this user.

## Path A — `browser_*` MCP tools (preferred when available)

If your tool list includes `browser_navigate`, `browser_click`,
`browser_type`, `browser_take_screenshot`, `browser_snapshot`,
`browser_wait_for`, `browser_press_key`, etc. — these come from the
`@playwright/mcp` server running inside the user's microVM. **Use them
directly**, like any other tool. No code-writing needed; the MCP server
maintains a persistent browser session across calls in the same
conversation.

These tools appear under names like `mcp:sandbox-mcp-playwright-<8>:browser_navigate`.
You don't need to memorise the prefix — your tool list shows the full
name. The platform auto-registers Playwright-MCP for any user who has
asked for it in their session; if the tools aren't in your list, the
user hasn't enabled it yet — fall back to Path B.

## Path B — `node_exec` with `require('playwright')` (fallback)

If the `browser_*` MCP tools aren't in your tool list, drive Playwright
yourself via `node_exec`. The rootfs ships Playwright globally, so this
just works:

```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.goto('https://example.com', { waitUntil: 'networkidle', timeout: 30000 });
const title = await page.title();
const text = await page.evaluate(() => document.body.innerText);
await browser.close();
console.log(JSON.stringify({ title, charsCaptured: text.length }));
```

The `--no-sandbox` + `--disable-dev-shm-usage` args are required — the
microVM init runs as PID 1 and Chromium's user-namespace sandbox conflicts
with that. Always include them.

## When to use this skill vs `web-search` (Tavily)

This is the single most important call you'll make. **Try web-search
first** for almost everything; only fall back to web-browsing when the
job genuinely needs a real browser.

| If the user wants... | Use | Why |
|---|---|---|
| "What's the latest on X?" / discovery | `tavily_search` (web-search) | Indexed, cheap (~$0.005), milliseconds |
| "Read this URL and summarise" | `tavily_extract` (web-search) | Returns clean markdown, ~$0.003, handles most JS pages |
| "Pull all pages from docs.foo.com" | `tavily_crawl` (web-search) | Cost scales but it's still cheaper than driving Playwright N times |
| "Deep cited research on X" | `tavily_research` (web-search) | Synthesised report; web-browsing produces raw page, not synthesis |
| **"Log into X and do Y"** | **web-browsing** | Tavily has no session/cookie/auth surface |
| **"Fill this form and submit"** | **web-browsing** | Tavily is read-only |
| **"Take a screenshot of X"** | **web-browsing** | Tavily returns text, not pixels |
| **"Scroll until ... appears, then ..."** | **web-browsing** | Tavily doesn't execute interaction |
| **"Page is JS-rendered and `tavily_extract` came back empty"** | **web-browsing** | Last resort for stubborn SPAs |
| **"Click through pagination and collect..."** | **web-browsing** | Multi-step interaction |
| **"Verify the chart on the dashboard actually rendered"** | **web-browsing** | Visual verification needs a real DOM render |

Rule of thumb: if you can phrase the job as "search for X" or "read page
Y," that's web-search. If it's "do X on page Y," that's web-browsing.

## Common recipes

### Extract DOM after JS render (the eolasflow.ai-style page)

```javascript
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
const facts = await page.evaluate(() => ({
  title: document.title,
  h2s: [...document.querySelectorAll('h2')].map(e => e.textContent.trim()),
  links: [...document.querySelectorAll('a[href]')]
    .map(a => ({ text: a.textContent.trim(), href: a.href }))
    .slice(0, 40),
  body: document.body.innerText.slice(0, 3000),
}));
console.log(JSON.stringify(facts, null, 2));
```

### Full-page screenshot (with lazy-load fix)

`networkidle` does NOT trigger images that load via `IntersectionObserver`
as you scroll. For a screenshot that captures the whole page, scroll
first:

```javascript
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let total = 0;
    const step = 400;
    const t = setInterval(() => {
      window.scrollBy(0, step);
      total += step;
      if (total >= document.body.scrollHeight) { clearInterval(t); resolve(); }
    }, 100);
  });
});
await page.waitForTimeout(1000);  // let lazy images finish
await page.screenshot({ path: '/workspace/page.png', fullPage: true });
```

### Form fill + submit + wait for navigation

```javascript
await page.goto('https://example.com/login');
await page.fill('input[name="email"]', user_email);
await page.fill('input[name="password"]', user_password);
await Promise.all([
  page.waitForURL(/\/dashboard/, { timeout: 15000 }),
  page.click('button[type="submit"]'),
]);
console.log('logged in, on:', page.url());
```

### Click-through pagination

```javascript
const rows = [];
while (true) {
  const pageRows = await page.$$eval('table tr', (trs) =>
    trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()))
  );
  rows.push(...pageRows);
  const next = await page.$('a[rel="next"]:not([disabled])');
  if (!next) break;
  await Promise.all([page.waitForLoadState('networkidle'), next.click()]);
}
```

## Limits and gotchas

- **Cold boot ~3s**: the first call in a fresh session spawns the microVM
  (~2.8s cold) — subsequent calls are ~30ms warm. Don't apologise for
  the first one; do batch related work in a single conversation so the
  warm VM gets reused.
- **`/workspace` is tmpfs**: files written there survive within the
  conversation but are gone when the microVM is destroyed. For
  durable outputs (screenshots the user wants to keep), the platform
  auto-uploads `/workspace` writes to blob — visible to the user via
  the standard files surface.
- **Headless only**: there's no display. Don't try `headless: false` —
  Chromium will refuse to start.
- **Bot detection / captcha**: Playwright does not solve these. If a
  site is hard-blocking you (Cloudflare interstitial, hCaptcha, etc.),
  **stop and tell the user** — don't loop trying to bypass. They may
  have an authenticated path or want a different source.
- **`--no-sandbox` is mandatory**: see Path B example. Forgetting it
  makes Chromium fail to start with a SUID-sandbox error.
- **Always `await browser.close()`**: leaking browsers eats memory in
  the microVM. Wrap your work in try/finally if it's nontrivial.
- **Don't replace `tavily_crawl` with a Playwright loop**: if you find
  yourself writing "navigate, extract, navigate, extract, ..." across
  dozens of URLs on the same site, you wrote a worse `tavily_crawl`.
  Stop and switch.

## What this skill is NOT

This skill does NOT install Playwright, configure browsers, or set up
infrastructure — that's all baked into the platform's sandbox rootfs.
It does NOT cover non-browser web access (HTTP fetches from inside
node_exec are perfectly fine for JSON APIs; you don't need Playwright
for `fetch(url)`). It does NOT cover local-server testing of
in-development webapps — that's the `webapp-testing` skill, which
assumes a dev server fixture.
