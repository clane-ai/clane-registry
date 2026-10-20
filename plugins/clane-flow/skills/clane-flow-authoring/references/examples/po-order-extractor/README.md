# PO Order Extractor

Turns a customer purchase order (PDF or HTM) into an Order Form spreadsheet with your
own stock codes and the customer's account code filled in.

## What it does

1. **Parse PO** reads the purchase order you drop in (or that arrives by email) and
   extracts its text.
2. **Extract + self-correct** reads the header and every line, checks the line totals
   against the PO total and normalises the date.
3. **Build Order Form** maps each customer product code to your stock code, fills in the
   customer's account code, and flags any line it cannot map instead of guessing.
4. **Deliver** hands you the `.xlsx`.

## Set up after install

The workflow needs two files from you. They stay in your organisation's files and are
never part of this registry.

| File | Format | Columns |
|---|---|---|
| Stock code mapping (`code_mapping`) | CSV | `customer`, `customer_code`, `stock_code` |
| Customer accounts (`customer_registry`) | CSV | `customer_name`, `account_code` |

Point the workflow at each file in its settings. Until both are set, the workflow shows
"Needs setup".

## Needs

- The Python and file-writing tools that every Clane deployment provides. The Order Form
  is written with `openpyxl` inside the sandbox; no extra skill is needed.

## Files

`workflow.json` is what the workflow runner reads. `steps/` and `prompts/` hold the same
code and prompt as plain files so they can be reviewed; CI checks that they match
`workflow.json` exactly.
