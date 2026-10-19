def main():
    import csv, hashlib, json, re
    from clane import parse

    def setting(name, default):
        value = getattr(settings, name, default)
        return default if value is None else value

    raw = extracted.output or ""
    raw = re.sub(r"<thinking>.*?</thinking>", "", raw, flags=re.S | re.I)
    raw = raw.replace("```json", "").replace("```", "")
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        raise ValueError("The extraction returned no order data.")
    try:
        spec = json.loads(m.group(0))
    except ValueError:
        raise ValueError("The extraction returned order data that could not be read.")
    orders = spec.get("orders") if isinstance(spec, dict) else None
    if not isinstance(orders, list):
        raise ValueError("The extraction returned order data that could not be read.")
    not_orders = [n for n in (spec.get("not_orders") or []) if isinstance(n, dict)]

    def norm(s):
        return re.sub(r"\s+", "", str(s or "")).upper()

    def rows_of(name, columns):
        path = setting(name, None)
        if not path:
            return []
        with open(path, encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh)
            missing = [c for c in columns if c not in (reader.fieldnames or [])]
            if missing:
                raise ValueError("The %s file is missing the column%s %s." % (
                    name.replace("_", " "), "" if len(missing) == 1 else "s", ", ".join(missing)))
            return list(reader)

    mapping = {}
    for r in rows_of("code_mapping", ["customer", "customer_code", "stock_code"]):
        mapping.setdefault((norm(r.get("customer")), norm(r.get("customer_code"))), set()).add(
            (r.get("stock_code") or "").strip())
    registry = {norm(r.get("customer_name")): (r.get("account_code") or "").strip()
                for r in rows_of("customer_registry", ["customer_name", "account_code"])}
    known = {c for c, _ in mapping} | set(registry)

    def resolve_customer(name):
        typed = norm(name)
        if typed in known:
            return typed
        inside = [k for k in known if k and (k in typed or typed in k)] if typed else []
        return max(inside, key=len) if inside else None

    def fmt_date(iso, fallback):
        if iso is None:
            return str(fallback or "")
        year, month, day = (int(p) for p in iso.split("-"))
        style = setting("csv_date_format", "dd.mm.yy")
        if style == "dd/mm/yyyy":
            return "%02d/%02d/%04d" % (day, month, year)
        if style == "yyyy-mm-dd":
            return iso
        return "%02d.%02d.%02d" % (day, month, year % 100)

    def price_text(price):
        if price is None:
            return ""
        text = ("%.4f" % price).rstrip("0")
        return text + "0" * max(0, 2 - len(text.split(".")[1]))

    default_columns = ("customer:Customer,store_branch:Store/Branch,required_date:Required Date,"
                       "po_number:Customer Order Number,qty:Order Qty.,stock_code:Stock Code,price:Price")
    columns = [[f.strip(), h.strip()] for f, h in
               (c.split(":", 1) for c in str(setting("csv_columns", default_columns)).split(",") if ":" in c)]
    if not columns:
        raise ValueError("The CSV columns setting is empty.")
    fields = {"customer", "store_branch", "required_date", "po_number", "qty", "stock_code", "price",
              "description", "customer_code", "uom"}
    unknown = [f for f, _ in columns if f not in fields]
    if unknown:
        raise ValueError("The CSV columns setting names unknown fields: %s." % ", ".join(unknown))

    report, taken = [], set()
    for idx, order in enumerate(orders, 1):
        if not isinstance(order, dict):
            continue
        problems = [str(q) for q in (order.get("questions") or []) if str(q).strip()]
        notes = [str(q) for q in (order.get("notes") or []) if str(q).strip()]
        customer_in = str(order.get("customer") or "")
        key = resolve_customer(customer_in)
        account = registry.get(key) if key else None
        if registry and not account:
            problems.append("Customer '%s' is not in the customer accounts file." % (customer_in or "(unknown)"))
        po = str(order.get("po_number") or "").strip()
        if not po:
            problems.append("No purchase order number.")
        required = parse.date(str(order.get("required_date") or ""))
        if order.get("required_date") and required is None:
            problems.append("The required date '%s' is not a date." % order.get("required_date"))
        header = {
            "customer": account or customer_in,
            "store_branch": "",
            "required_date": fmt_date(required, order.get("required_date")),
            "po_number": po,
        }

        rows, lines_sum, priced = [], 0.0, True
        for i, ln in enumerate(order.get("lines") or [], 1):
            if not isinstance(ln, dict):
                continue
            qty = parse.amount(ln.get("qty"))
            price = parse.amount(ln.get("price"))
            supplier = str(ln.get("supplier_code") or "").strip()
            cust_code = str(ln.get("customer_code") or "").strip()
            found = set()
            for code in (cust_code, supplier):
                if key and code:
                    found |= mapping.get((key, norm(code)), set())
            found.discard("")
            if len(found) > 1:
                problems.append("Line %d code %s is mapped more than once." % (i, cust_code or supplier))
                stock = ""
            else:
                stock = found.pop() if found else supplier
            label = ln.get("description") or cust_code or supplier or "line %d" % i
            if not stock:
                problems.append("Line %d (%s) has no stock code." % (i, label))
            if qty is None or qty <= 0:
                problems.append("Line %d (%s) has no quantity." % (i, label))
            if price is None:
                priced = False
            else:
                lines_sum += (qty or 0.0) * price
            printed = parse.amount(ln.get("line_total"))
            if qty is not None and price is not None and printed is not None:
                if abs(qty * price - printed) > max(0.02, 0.005 * abs(printed)):
                    problems.append("Line %d (%s): %s x %s = %.2f, but the printed line total is %.2f." % (
                        i, label, ("%g" % qty), ("%g" % price), qty * price, printed))
            rows.append(dict(header,
                             qty="" if qty is None else ("%d" % qty if qty.is_integer() else repr(qty)),
                             price=price_text(price), stock_code=stock, customer_code=cust_code,
                             description=str(ln.get("description") or ""), uom=str(ln.get("uom") or "")))
        if not rows:
            problems.append("No order lines.")
        count = parse.integer(order.get("printed_line_count"))
        if count is not None and rows and count != len(rows):
            problems.append("The document prints %d lines but %d were read." % (count, len(rows)))
        total = parse.amount(order.get("total_net"))
        if priced and rows and total is not None and abs(total - lines_sum) > 0.02:
            problems.append("The order total is %.2f but the lines add up to %.2f." % (total, lines_sum))

        stem = re.sub(r"[^A-Za-z0-9._-]+", "_", po or customer_in or "order-%d" % idx).strip("_") or "order-%d" % idx
        name = ("REVIEW-" if problems else "") + stem + ".csv"
        n = 1
        while name in taken:
            n += 1
            name = ("REVIEW-" if problems else "") + "%s-%d.csv" % (stem, n)
        taken.add(name)
        report.append({"file": name, "source": order.get("source"), "customer": customer_in, "po_number": po,
                       "lines": len(rows), "status": "needs review" if problems else "ready",
                       "problems": problems, "notes": notes, "rows": rows})

    pos = sorted({norm(r["po_number"]) for r in report if r["po_number"]})
    if pos:
        key = "po:" + "+".join(pos)
    else:
        with open(collect.file, "rb") as fh:
            key = "text:" + hashlib.sha256(fh.read()).hexdigest()[:20]

    ready = sum(1 for r in report if r["status"] == "ready")
    if not report:
        summary = "No orders found. " + " ".join("%s: %s" % (n.get("source") or "?", n.get("why") or "")
                                                for n in not_orders)
    else:
        summary = "%d order%s found: %d ready, %d need review (%s)." % (
            len(report), "" if len(report) == 1 else "s", ready, len(report) - ready,
            ", ".join("PO %s" % (r["po_number"] or "(none)") for r in report))
    return {"orders": report, "not_orders": not_orders, "columns": columns, "key": key[:500],
            "output": summary.strip()}
