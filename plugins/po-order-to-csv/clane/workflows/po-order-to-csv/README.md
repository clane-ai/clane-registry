# PO to Order CSV

Watches a folder for purchase-order PDFs and writes one Order Form CSV per order.

## What happens to each PDF

1. **Parse PO** reads the PDF text.
2. **Extract + self-correct** reads the header and every line, and the order total the PO states.
3. **Build Order CSV** maps each customer product code to your stock code, fills in the customer account code, and checks that the lines add up to the PO total.
4. **Write CSV** saves `PO-number.csv` to your output folder. A name clash is renamed, never overwritten.
5. The PDF moves to your Processed folder. If anything fails, it moves to your Failed folder with a `.error.txt` beside it saying why.

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

## Files

`workflow.json` is what the runner reads. `steps/` and `prompts/` hold the same code and prompt as plain files for review; CI checks that they match `workflow.json` exactly.
