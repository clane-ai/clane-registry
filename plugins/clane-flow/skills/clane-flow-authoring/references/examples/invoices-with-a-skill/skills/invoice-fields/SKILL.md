---
name: invoice-fields
version: 0.1.0
description: How this organisation reads a supplier invoice - which number is the invoice number, which date counts, and how to report the totals. Use when reading an invoice into fields.
---

# Invoice fields

Read the invoice text you are given and report these fields.

- `supplier`: the company that sent the invoice, as printed in its letterhead, not the bill-to name.
- `invoice_number`: the number labelled Invoice No., Invoice #, or Rechnung Nr. Never a PO number, an order number or a customer number.
- `invoice_date`: the invoice date as `yyyy-mm-dd`. Not the delivery date and not the due date.
- `total`: the amount payable including VAT, as a number with no currency sign.
- `currency`: the three-letter code (EUR, GBP, USD). Read the sign: `€` is EUR, `£` is GBP.

When a field is not printed, report `null`; never guess. For the label words used by the
suppliers this organisation buys from, read `references/labels.md`.
