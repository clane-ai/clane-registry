# Invoices by Rules (plugin example)

A Decision **by rules** routes each invoice. No model is called: the report shows the rule that matched and the values it read.

## What happens

1. **Read the invoice** parses the JSON message and works out `invoice.po_known` (is the PO in the *Known PO numbers* setting) and `invoice.total`.
2. **Where does it go?** is a Decision by rules. The answers are tried in order, first true wins:
   - `Unknown PO`: `invoice.po_known == false` -> held for review
   - `Over the limit`: `invoice.total > settings.approval_limit` -> **Approve the invoice** (a person)
   - `Export` has no rule and is the fallback -> exported
3. An approved invoice is exported; a rejected one stops.

## Settings

| Setting | What it does |
|---|---|
| Approval limit | Totals above this need approval. Default 1000 |
| Known PO numbers | Comma-separated list; an invoice with any other PO is held |

Input: `{"supplier": "Acme", "po_number": "PO-1", "total": 1250.5}`.
