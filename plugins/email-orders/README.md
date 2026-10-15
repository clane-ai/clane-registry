# Orders from Email

Send or forward customer order emails to the automation's Clane address. Each email comes back as an Order Form CSV per order, with a short summary of what was found.

- Reads orders typed in the email body, including reply threads where a later message changes the order.
- Reads purchase-order PDFs, scanned or not (scans go through Clane OCR).
- Uses the stock code printed on the order when there is one, or your stock code mapping file.
- Never guesses: anything missing (a stock code, a PO number, a vague quantity) is listed, and that order's file is named `REVIEW-…csv`.
- Emails that are not orders (confirmations, delivery questions) are reported as such.

## Layout

- `.claude-plugin/plugin.json` is the Claude Code manifest.
- `clane/plugin.json` lists the workflow.
- `clane/workflows/email-orders/` holds the workflow, its steps and prompts.
