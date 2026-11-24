# Orders from Email

Runs once per email that reaches the automation's address (or its webhook).

## What happens to each email

1. **Read the email and documents** (built-in Read documents step) writes the email text and the text of every attachment into `order-sources.md`. It reads PDFs with a text layer, HTML, Word, Excel and CSV files, opens attached `.eml` files, skips logos and signature images, and lists the scanned PDFs and images that need OCR.
2. **Read scanned documents** (built-in Clane OCR step) reads each of those scans into `<name>.ocr.md`. With no scans it does nothing and costs nothing.
3. **Find orders** reads those files and finds every order: one per purchase-order number (one scan can hold several), and one for an email body that asks for goods. Confirmations and delivery questions are reported as not orders.
4. **Check the orders** picks the stock code (your mapping file first, then the code printed on the order), checks the PO number, quantities and order total, and works out the order's key: its PO numbers (`po:63584-00+63585-00`).
5. **Already seen?** (built-in) looks the key up. **Handled before?** (a Decision by rules) sends an order already handled to **Already handled**, which writes nothing: `dup.seen == true and dup.run_status != "failed"`, so a first attempt that failed does not block a retry.
6. **Write the order CSVs** writes one CSV per order and `orders-summary.md`. The reply lists each order as **ready** or **needs review** with the reasons, and attaches the files.

Why the PO number and not the email's Message-ID: a customer who resends an order sends a new email with a new Message-ID, and Clane already ignores the same email delivered twice to one automation. The PO number is known only after **Find orders**, so a resend still costs the OCR and AI credits; it never produces a second set of CSVs. An amended order sent again under the same PO number is reported as already handled: give it to a person. Keys are kept 90 days.

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

- Clane OCR, 1 credit per scanned page. On a customer's machine, the machine must be enrolled with `clane serve --jobs --allow-cloud-ocr`: the scans are sent to Clane OCR.
- The code sandbox (Clane Cloud) or the Clane Python runtime (a machine), for the two Python steps.

## How it was tested

`clane flow test` (machine runner) with real purchase orders as test cases. Clane OCR and Already seen? are recorded replies in each case's `stubs/`; the OCR stub carries the real Clane OCR text of the scan.

| Case | Input | Checks |
|---|---|---|
| `scanned-po` | email, a 2-page scanned JELD-WEN PO; page 2 prints a different PO number | 2 orders, `REVIEW-63585-00.csv` (2 lines) and `REVIEW-63584-00.csv`, key `po:63584-00+63585-00` |
| `digital-po` | email, a text PDF PO (B528564) | 1 order, 7 lines, no OCR |
| `html-po-webhook` | webhook, an SAP Business Network HTML PO (4590351203) | 1 order, `4590351203.csv` |
| `resend-duplicate` | email, B528564 sent again | Already seen? says seen, no CSV is written |

The sample orders are customer documents and are not published with this example.
