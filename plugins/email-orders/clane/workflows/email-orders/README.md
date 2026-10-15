# Orders from Email

Runs once per email that reaches the automation's address (or its webhook).

## What happens to each email

1. **Read email and attachments** collects the email text and every document. It reads PDFs with a text layer, marks scanned PDFs and large images for OCR, opens attached `.eml` files, and skips logos and signature images.
2. **Find orders** runs Clane OCR on the scanned documents, then finds every order: one per purchase-order document, and one for an email body that asks for goods. Confirmations and delivery questions are reported as not orders.
3. **Build Order CSVs** picks the stock code (your mapping file first, then the code printed on the order), checks the PO number, quantities and order total, and writes one CSV per order.
4. The reply lists each order as **ready** or **needs review** with the reasons, and attaches the files.

## Files it writes

| File | When |
|---|---|
| `<PO number>.csv` | The order is complete: every line has a stock code and a quantity, and the total adds up |
| `REVIEW-<PO number>.csv` | Something needs a person; the reasons are in the summary |
| `orders-summary.md` | Always: one section per order, plus any email that was not an order |

## Settings

| Setting | What it does |
|---|---|
| Stock code mapping (optional) | CSV with `customer`, `customer_code`, `stock_code`. Checked before the code printed on the order |
| Customer accounts (optional) | CSV with `customer_name`, `account_code`. When set, the account code goes in the Customer column |
| CSV columns, delimiter, date format, byte order mark | The file format. Defaults: the 7 Order Form columns, comma, `dd.mm.yy`, with a byte order mark |

## Needs

- Clane OCR on the server, for scanned purchase orders.
- The code sandbox, for the two Python steps.
