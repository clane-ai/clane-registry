---
name: bibliography-assembly
version: 0.1.0
description: |
  How to format the source ledger into a References section in Harvard, APA, MLA, Chicago, or numbered style. Dedupe by URL, handle missing fields gracefully, never renumber [n], skip uncited entries. Used by the bibliography-assembler role.
when_to_use: |
  Activate when you are the bibliography-assembler role with the source ledger + assembled document + a citation_format hint. Runs once at the end of the publishing pipeline, alongside the indexer.
inputs:
  - type: source_ledger_jsonl
    required: true
  - type: assembled_markdown
    required: true
  - type: citation_format
    required: false
outputs:
  - type: references_md
---

# Bibliography assembly

You take the JSONL source ledger built by `research-coordinator` and produce a formatted References section. The numbered `[n]` indices are STABLE — section writers cite by `[n]`; renumbering breaks every citation.

## Step 1: Build the cited-set

Grep the assembled doc for `[n]` markers. ONLY these ledger entries appear in the final References. Uncited entries got captured during research but the writer didn't use them — they don't belong in the bibliography.

If non-numbered style (Harvard / APA / MLA / Chicago), grep instead for `(Author, Year)` or `[Author Year]` patterns.

## Step 2: Format per citation style

### Numbered (default — pairs naturally with `[n]` in the body)

```
[12] Drewry Supply Chain Advisors. (2024). World Container Index — Asia
     to North Europe. drewry.co.uk. Accessed 2026-05-20.
[13] Lloyd's List. (2024). Houthi attack timeline 2023-2024.
     lloydslist.com. Accessed 2026-05-20.
[15] Maersk. (2023). Statement on Cape-of-Good-Hope rerouting,
     14 December 2023. maersk.com. Accessed 2026-05-20.
```

### Harvard

```
Drewry Supply Chain Advisors (2024) 'World Container Index — Asia
  to North Europe'. Drewry. Available at:
  https://drewry.co.uk/... (Accessed: 20 May 2026).
Lloyd's List (2024) 'Houthi attack timeline 2023-2024'.
  Lloyd's List Intelligence. Available at: https://lloydslist.com/...
  (Accessed: 20 May 2026).
```

### APA

```
Drewry Supply Chain Advisors. (2024). World Container Index — Asia
  to North Europe. Drewry. https://drewry.co.uk/...
Lloyd's List. (2024). Houthi attack timeline 2023-2024. Lloyd's
  List Intelligence. https://lloydslist.com/...
```

### MLA

```
Drewry Supply Chain Advisors. "World Container Index — Asia to North
  Europe." Drewry, 2024, drewry.co.uk/.... Accessed 20 May 2026.
Lloyd's List. "Houthi attack timeline 2023-2024." Lloyd's List
  Intelligence, 2024, lloydslist.com/.... Accessed 20 May 2026.
```

### Chicago (notes-bibliography, the most common variant in HSS)

```
Drewry Supply Chain Advisors. "World Container Index — Asia to North
  Europe." Drewry, 2024. https://drewry.co.uk/....
Lloyd's List. "Houthi attack timeline 2023-2024." Lloyd's List
  Intelligence, 2024. https://lloydslist.com/....
```

## Step 3: Handle missing fields

Ledger entries are best-effort — researchers couldn't always recover full metadata. Format with what's there:

| Missing | Harvard / APA / MLA / Chicago | Numbered |
|---|---|---|
| No author | Drop author position; start with title | Same |
| No year | "n.d." in place of year | "n.d." |
| No publisher | Use URL host (e.g. "drewry.co.uk") | Same |
| No URL | Omit URL trailer | Omit URL |

NEVER fabricate metadata. A missing author is missing.

## Step 4: Order

- **Numbered** → by `[n]` ascending (ledger insertion order). Don't sort alphabetically — the numbers must match the body.
- **All other styles** → alphabetical by first author's surname. For no-author entries, sort by the first content word of the title (skipping leading "A", "An", "The").

## Step 5: Output

Write `.bible/references.md`:

```markdown
## References

[12] Drewry Supply Chain Advisors. (2024). World Container Index — Asia
     to North Europe. drewry.co.uk. Accessed 2026-05-20.
...
```

Return the path. The orchestrator's assembly step appends this AFTER the index, BEFORE any appendices.

## Worked dedupe example

Two ledger entries that ARE the same source:

```jsonl
{"n":12,"url":"https://drewry.co.uk/supply-chain-advisors/.../index","title":"World Container Index","cluster_id":"C3","sections":["shipping-routes"],...}
{"n":31,"url":"https://drewry.co.uk/supply-chain-advisors/.../index","title":"WCI","cluster_id":"C4","sections":["energy-cost"],...}
```

These point to the SAME URL — research-coordinator should have deduped at ledger-build time, but if a duplicate slipped through:

- Keep the EARLIER entry's `[n]` ([12]).
- Drop the duplicate ([31]) entirely.
- If any body text cites `[31]`, change it to `[12]`. (This requires a small body-text patch — flag the issue back to the orchestrator rather than silently editing.)

The cleaner path: research-coordinator's dedup logic catches it upstream. This step is defensive.

## Anti-patterns

- **Renumbering [n]** — breaks every citation in the body. The body cites by [n]; the References section MUST keep the same indices.
- **Fabricating "et al." or year info** — if the ledger entry has just one author and no date, that's what the reference shows. Don't invent.
- **Including uncited entries** — the bibliography lists what was cited, not everything the researcher found.
- **Sorting numbered-style references alphabetically** — breaks the [n] → entry correspondence the reader uses.
- **Picking citation style from your taste** — the team's `citation_format` input is the source of truth; if not supplied, default to numbered.
