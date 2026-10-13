---
name: web-search
version: 0.2.0
description: |
  Clane Web — five web-intelligence tools: search, extract, crawl, map, plus deep research (dispatched as a subagent). Activate when the user asks about current events, recent news, fact-checking, or any topic that depends on information beyond your training data. Picks the cheapest viable tool for the job.
when_to_use: |
  Activate for: "search for X", "what's the latest on Y", "find articles about Z", "look up the docs for W", "ingest these docs", "extract this URL", "research the competitive landscape for V", or any explicit current-information request. Do NOT activate when the answer is in attached project files (use project_search instead) or in conversation files (use file_grep).
inputs:
  - type: user_query
    required: true
outputs:
  - type: text_summary
  - type: cited_findings
---

# Clane Web

You have **four native web tools** plus a deep-research path. All are platform builtins — no MCP connector, no setup. Pick the cheapest one that can do the job.

## When to use which

| Need | Call | Notes |
|---|---|---|
| "What's the latest on X?" / unknown sources | `web_search` | Default. Returns titles + URLs + snippets. Cheap (~$0.005/call). |
| "Read this URL for me" / specific page | `web_extract` | Returns clean markdown. Handles JS-rendered pages via `extract_depth: "advanced"`. ~$0.003/URL, accepts up to 20 URLs in one call. |
| "Research X and produce a cited report" | dispatch `researcher` role | DO NOT do deep research inline. Use `agent_dispatch({ kind: "role", target: "researcher", prompt: "<the research question, self-contained>", max_wait_ms: 3600000 })`. The subagent runs the async lifecycle end-to-end (it can take 1–30 minutes) and returns one synthesised brief. You see ONE clean tool_result. Cost: $0.05–$0.30 per research task plus the subagent's model time. |
| "Pull the entire docs site into the project" | `web_crawl` | Walks a site, returns markdown per page. Cost scales with page count — confirm with the user first if the site is large. |
| "Find the right page on this site" | `web_map` | URL discovery only — no content fetched. Nearly free. Pair with `web_extract`: map → pick the right URL → extract. |

## Decision tree

1. **Specific URL the user gave you?** → `web_extract`
2. **Known docs site, want to see what's there?** → `web_map` to list URLs, then `web_extract` on the right one(s)
3. **Whole docs site to ingest into the project?** → `web_crawl`
4. **Deep research question that explicitly needs synthesis across many sources?** → dispatch the `researcher` role via `agent_dispatch({ kind: "role", target: "researcher", prompt: "<the research question, self-contained>", max_wait_ms: 3600000 })`. Warn the user it'll take a few minutes.
5. **Anything else** → `web_search`

## Always

- **Set `intent` on `web_search`** — a one-line past-tense sentence describing why you're searching ("Hunted for Andrew Ng's comments on org AI OS"). This shows up as a header above the results in the user's UI and lets them sanity-check your direction. When you fire several searches for the same goal, pass the same `intent` on each — the UI groups them.
- **Cite sources** when you reference web results in your reply. Domain + title is enough: "per [example.com] …".
- **Don't repeat searches** with near-identical queries. Refine the query (add a date range, exclude a domain, add a synonym) — don't fan out the same idea five times.
- **Prefer local sources first.** If the user uploaded files to the project, use `project_search` over `web_search`. If they attached files to the conversation, use `file_grep`. Web costs money and tokens; local search is free.

## Options worth knowing

These are the input parameters each tool accepts — the schemas have full detail; this is the cheat sheet:

- `web_search`:
  - `time_range`: "day" | "week" | "month" | "year" — narrow when freshness matters
  - `topic`: "news" / "general" / "finance" — `news` gives heavier news coverage
  - `include_domains` / `exclude_domains`: scope to or away from specific sites
  - `max_results`: 1–10 (default 5; bump for noisy topics)
  - `search_depth`: "basic" / "advanced" — advanced costs more, picks better

- `web_extract`:
  - `extract_depth`: "basic" / "advanced" — advanced handles JS-heavy pages
  - `include_images`: usually leave false (extra tokens)
  - `urls`: array, up to 20 URLs per call

- `web_crawl`:
  - `max_depth`: 1–3 (default 1)
  - `limit`: cap total pages (default 50, ceiling 250)
  - `instructions`: natural-language guidance ("only follow /docs/")
  - `select_paths` / `exclude_paths`: regex allowlists / denylists for URL paths

- `web_map`:
  - `max_depth`: 1–3 (default 1)
  - `limit`: max URLs returned (default 50, ceiling 500)

- **Deep research** (subagent dispatch):
  - The `researcher` role uses an async lifecycle: it submits the task to the upstream, then waits inside the sandbox for the result (up to 30 min). You don't see the polling — just the final cited brief.
  - Pick `tier: "balanced"` for typical questions, `tier: "deep"` only for genuinely hard ones. Cost rises sharply with depth.

## What this skill is NOT

This skill describes the **native Clane Web tools the platform provides**. There is no MCP connector to install, no CLI to run, no shell commands. Just call the tool.
