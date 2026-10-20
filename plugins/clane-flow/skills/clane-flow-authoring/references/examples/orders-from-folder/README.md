# PO to Order CSV

Watches a folder for purchase-order PDFs (text or scanned) and writes one Order Form CSV per order.

## What happens to each PDF

1. **Read the purchase order** (built-in Read documents step) writes the PDF's text into `po-sources.md`, or marks it as a scan.
2. **Read scanned documents** (built-in Clane OCR step) reads a scan into `<name>.ocr.md`. A PDF with a text layer skips it at no cost.
3. **Extract + self-correct** reads those files: the header, every line, and the order total the PO states.
4. **Check the order** maps each customer product code to your stock code, fills in the customer account code, checks that the lines add up to the PO total, and returns the rows.
5. **Already seen?** (built-in) looks up the PO number; **Handled before?** (a Decision by rules, `dup.seen == true and dup.run_status != "failed"`) ends a PO already handled at **Already handled** with no CSV. The folder watch already skips a file it has seen; this catches the same PO dropped in again as a new file.
6. **Write the order CSV** (built-in Write a table step) writes `PO-number.csv` in your column order, delimiter and byte-order-mark setting, with the spreadsheet formula guard.
7. **Save the CSV to the output folder** uploads it. A name clash is renamed, never overwritten.
8. The PDF moves to your Processed folder. If anything fails, it moves to your Failed folder with a `.error.txt` beside it saying why.

## Strict by default

An order with an unmapped line, a missing account code or a total that does not add up fails, and no CSV is written. Add the missing mapping row and drag the PDF back into the inbox; the next check picks it up. Turn **Fail an order with any unmapped line** off to get a CSV with blank stock codes and a warning instead.

## Settings

| Setting | What it does |
|---|---|
| Purchase orders arrive in | Folder watched for new PDFs |
| Move processed PDFs to / Move failed PDFs to | Where each PDF ends up (same drive as the inbox) |
| Write order CSVs to | Folder that receives the CSV files |
| Stock code mapping | CSV with `customer`, `customer_code`, `stock_code` |
| Customer accounts | CSV with `customer_name`, `account_code` |
| Check for new orders | How often to look (every 5 minutes at the most) |
| CSV columns, delimiter, date format, byte order mark | The file format; the defaults are 7 columns, comma, `dd.mm.yy`, with a byte order mark |

## Needs

- Clane OCR, 1 credit per scanned page. On a customer's machine, the machine must be enrolled with `clane serve --jobs --allow-cloud-ocr`: the scans are sent to Clane OCR.
- The code sandbox (Clane Cloud) or the Clane Python runtime (a machine), for the Python step.

## How it was tested

`clane flow test` (machine runner) with real purchase orders. Clane OCR, Already seen? and the upload are recorded replies in each case's `stubs/`; the OCR stub carries the real Clane OCR text of the scan. Read documents and Write a table always run for real.

| Case | PDF | Checks |
|---|---|---|
| `digital-po` | text PDF PO B528564, every code mapped | 7 rows, `B528564.csv`, account code and stock codes from the mapping files |
| `resend-duplicate` | B528564 again | Already seen? says seen, no CSV is written |
| `scanned-po` | 2-page scanned JELD-WEN PO, customer not in the mapping | OCR read, then the run fails (strict) and no CSV is written |

The sample orders are customer documents and are not published with this example.

## Files

`workflow.json` is what the runner reads. `steps/` and `prompts/` hold the same code and prompt as plain files for review; CI checks that they match `workflow.json` exactly.
