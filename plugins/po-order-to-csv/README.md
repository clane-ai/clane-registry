# PO to Order CSV

Drop purchase-order PDFs in a SharePoint folder; get an Order Form CSV for each one in another folder. Each PDF moves to Processed or Failed.

- Your stock codes and customer account codes come from two CSV files you point the automation at.
- Strict by default: nothing with a blank stock code reaches your ERP pickup folder.
- The CSV format (columns, delimiter, date format, byte order mark) is set in the automation's settings, not in code.

## Needs

- A Microsoft 365 connection that can read and write the SharePoint folders you choose.

## Layout

- `.claude-plugin/plugin.json` is the Claude Code manifest.
- `clane/plugin.json` lists the workflows and the connectors this plugin needs.
- `clane/workflows/po-order-to-csv/` holds the workflow, its steps and prompts.
