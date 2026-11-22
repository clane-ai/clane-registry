# Invoices with a Skill (plugin example)

An AI step that follows a skill shipped inside the package. The skill lives in
`skills/invoice-fields/` (the Anthropic layout: `SKILL.md` plus `references/`), and the step
names it by its slug: `"agent": {"skills": ["invoice-fields"]}`.

## What happens

1. **Invoice arrives** by webhook, as text.
2. **Read the invoice** activates `invoice-fields`, reads `references/labels.md` when it needs
   the label words, and returns supplier, invoice number, date, total and currency.
3. **Invoice read** delivers the invoice number and total.

## The bundled skill

`clane flow publish` uploads `skills/` with the draft, and the server installs
`invoice-fields` 0.1.0 as an organisation skill. Change the skill, then bump `version:` in its
`SKILL.md` before you publish again: the same version with different content is refused.
