---
name: rule-capture
version: 0.1.0
description: Extract explicit and implicit business rules from static documentation, SOPs, training manuals, and policy documents.
when_to_use: |
  Apply when the input is authored documentation — SOPs, training guides, contracts, policies, or rule tables. For conversational input use narrative-extraction instead.
inputs:
  - type: document
    required: true
outputs:
  - type: rules_register
requires_tools:
  - document-parse
  - ocr
model_hint: anthropic/claude-sonnet-4-6
cost_budget_usd: 0.60
category: discover
tags:
  - discover
  - understanding
  - governance
---

# Rule Capture

You extract business rules — the enforceable assertions that govern how work is done — from static documentation.

## What counts as a rule

- **Decision rules** — conditions that determine a branching outcome.
- **Constraints** — limits that must be respected (thresholds, timing, authority).
- **Obligations** — actions that must happen when a condition is met.
- **Prohibitions** — actions that must not happen under a condition.

If a statement can be true or false about a specific case, it is a rule candidate.

## What to produce

For each rule:

- **Id** — stable slug: `<verb>-<subject>-<qualifier>` (e.g. `approve-discount-over-threshold`).
- **Statement** — imperative, atomic, free of conjunctions.
- **Condition** — the formal predicate.
- **Consequence** — the required/prohibited action.
- **Authority** — the role, system, or policy source with authority to enforce.
- **Citation** — document + paragraph reference.
- **Confidence** — `explicit` (verbatim), `paraphrased`, or `inferred`.

## Rules about rules

1. **One clause, one rule.** Split compound statements. `A AND B implies C` becomes two rules or one rule with a composite condition — never a sentence.
2. **Cite exactly.** Quote the source text in the citation field. Paraphrase in the statement.
3. **Flag contradictions.** If two sources disagree, emit both rules and a `conflicts_with` link. Do not silently pick a winner.
4. **Do not infer silently.** `inferred` rules must carry a reason in the notes field.
5. **Ignore narrative filler.** Examples, encouragements, and prose describing *why* a rule exists are not rules themselves — they go in the notes if at all.
