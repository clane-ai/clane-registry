---
name: invoice-check
version: 1.0.0
description: Read the supplier invoices in a folder (text PDFs and scans), check their arithmetic and the person's rules, and list each as OK or NEEDS A PERSON with the reason.
when_to_use: |
  Activate when the person asks to read, check, log or review supplier invoices or bills in a folder. Not for customer orders.
category: do
tags:
  - invoices
---

# Invoice check

Read every supplier invoice in the working folder, check it, and say plainly which need a person. Never change an amount to make a check pass.

## Folder layout

- Invoices: PDFs (text or scanned) and images in the folder itself.
- Optional `rules.md`: the person's rules (for example "invoices over 5,000 need approval", "supplier X always charges VAT at 23%", "every invoice needs a PO number").
- Outputs: `output/invoices.csv` and `output/invoices-summary.md`. Never overwrite them without asking.
- Scratch files go in `.clane/tmp/`.

## Step 1: Read every invoice

Text PDFs: read the text and tables. Scans: OCR them (`ocr_document`, found with `tool_search`) and re-check the invoice number, dates and amounts against the image.

Capture: supplier, invoice number, invoice date, due date, PO number (if any), currency, each line (description, quantity, unit price, line total), net total, VAT, gross total.

## Step 2: Check

1. Each line: quantity x unit price = line total, to the cent.
2. Lines add up to the net total; net + VAT = gross.
3. The same supplier and invoice number does not appear twice (a duplicate).
4. Every rule in `rules.md`.

Any failed check makes the invoice NEEDS A PERSON, with the difference shown (`printed <x>, calculated <y>, difference <x - y>`). Re-check for a misread number first.

## Step 3: Write

`output/invoices.csv`, one row per invoice: `file, supplier, invoice_number, invoice_date, due_date, po_number, currency, net, vat, gross, status, reasons`. Dates as `yyyy-mm-dd`.

`output/invoices-summary.md`: a table of the same, then numbered reasons for each NEEDS A PERSON invoice, then the total value due by due date.

## Step 4: Report

A short reply: how many invoices, how many OK, which need a person and why, and where the files are.
