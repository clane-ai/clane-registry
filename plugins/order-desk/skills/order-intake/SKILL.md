---
name: order-intake
version: 1.0.0
description: Read the customer purchase orders in a folder (text PDFs, scans, emails saved as files), write one CSV per order, mark each READY or NEEDS REVIEW, and fill an order form per order when the folder has a template.
when_to_use: |
  Activate when the person asks to process, read, check or key in customer orders or purchase orders (POs) in a folder. Not for invoices from suppliers.
category: do
tags:
  - orders
---

# Order intake

Turn every customer order in the working folder into (1) one CSV per order, (2) a READY / NEEDS REVIEW summary, and (3) when the folder has an order form template, one filled form per order. Never guess: a code, date or number you cannot read is flagged, not filled.

## Folder layout

- Orders: PDFs (text or scanned), `.htm`/`.eml`/`.msg` saved emails, images, in the folder itself.
- Optional `master/` (read only): a code mapping CSV (customer, customer code, your code, description, unit, price) and an order form template (`.xlsx`).
- Outputs: `output/<customer>_<order number>.csv`, `output/orders-summary.md`, and `order_forms/<order number>.xlsx` when there is a template. Create the folders if missing. Never overwrite an existing file without asking.
- Scratch files go in `.clane/tmp/`.

## Step 1: Read every order

| Format | How |
|---|---|
| Text PDF | its text and tables |
| Scan (no text layer) | OCR it (`ocr_document`, found with `tool_search`); re-check order number, dates, quantities and prices against the image |
| Saved email / `.htm` | strip the markup; read the order lines and any attached order |

One file can hold several orders: make one order per order number. Wrapped description text is not a new line.

Capture per order: customer, order number exactly as printed, order date, required date (blank if none), delivery address, the printed total (blank if none), and per line: customer item code, description, quantity, unit, unit price.

## Step 2: Map codes (only when `master/` has a mapping)

- Look up (customer, customer code) in the mapping. Match exactly after trimming spaces.
- One code with several of your codes: use the first listed and say so in the notes.
- Code not in the mapping: leave your code BLANK and mark the line NEEDS CODE. Never invent a code or infer one from the description.

## Step 3: Quantities, prices and totals

- Keep quantity and unit price exactly as printed. Never convert units or round.
- If the order prints a total, add up quantity x unit price over its lines and compare to the cent (like with like: without VAT/delivery unless the lines include it). A difference makes the order NEEDS REVIEW; write `Total mismatch: order total <printed>, lines add up to <calculated>, difference <printed - calculated>`. Re-check for a misread line or missing page first. Never adjust a number to make it match.

## Step 4: One CSV per order

UTF-8, header row then one row per line:
`customer, order_number, order_date, required_date, delivery_address, line_no, customer_code, description, qty, unit, unit_price, your_code, status, notes`

Dates as `yyyy-mm-dd`. `status` per line: `OK`, `NEEDS CODE` or `NEEDS REVIEW`; `notes` says why.

## Step 5: `output/orders-summary.md`

A table: file, customer, order number, order date, required date, lines, value, READY or NEEDS REVIEW, CSV name. Then numbered reasons for each NEEDS REVIEW order. READY only when every line is read and mapped (if there is a mapping), totals reconcile and nothing needs asking.

## Step 6: Order forms (only when there is a template)

Copy the template once per order (never edit the template), fill the header (customer, required date, order number) and one row per order line (quantity, your code, unit price) where the template's own example shows them, and keep every line in order, including lines with a blank code. Open each form afterwards and check it against its CSV.

## Step 7: Report

A short reply: how many orders, which are READY, which NEED REVIEW and why, the codes that need a code, and where the files are. Do not paste whole files.
