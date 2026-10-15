def main():
    import csv, io, json, re

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
    not_orders = spec.get("not_orders") if isinstance(spec.get("not_orders"), list) else []

    def norm(s):
        return re.sub(r"\s+", "", str(s or "")).upper()

    def num(v):
        if isinstance(v, bool):
            return None
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            cleaned = re.sub(r"[^0-9.,-]", "", v)
            if not cleaned or cleaned in ("-", ".", ","):
                return None
            if "," in cleaned and "." in cleaned:
                if cleaned.rfind(",") > cleaned.rfind("."):
                    cleaned = cleaned.replace(".", "").replace(",", ".")
                else:
                    cleaned = cleaned.replace(",", "")
            elif "," in cleaned:
                head, _, tail = cleaned.rpartition(",")
                cleaned = head.replace(",", "") + ("." + tail if len(tail) != 3 else tail)
            try:
                return float(cleaned)
            except ValueError:
                return None
        return None

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

    def parse_date(value):
        d = re.match(r"^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\s*$", str(value or ""))
        if not d:
            return None
        day, month, year = int(d.group(1)), int(d.group(2)), d.group(3)
        year = int(year) + 2000 if len(year) == 2 else int(year)
        if not (1 <= day <= 31 and 1 <= month <= 12):
            return None
        return day, month, year

    def fmt_date(parsed, fallback):
        if parsed is None:
            return str(fallback or "")
        day, month, year = parsed
        style = setting("csv_date_format", "dd.mm.yy")
        if style == "dd/mm/yyyy":
            return "%02d/%02d/%04d" % (day, month, year)
        if style == "yyyy-mm-dd":
            return "%04d-%02d-%02d" % (year, month, day)
        return "%02d.%02d.%02d" % (day, month, year % 100)

    def safe(text):
        text = str(text)
        return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text

    default_columns = ("customer:Customer,store_branch:Store/Branch,required_date:Required Date,"
                       "po_number:Customer Order Number,qty:Order Qty.,stock_code:Stock Code,price:Price")
    columns = [c.split(":", 1) for c in str(setting("csv_columns", default_columns)).split(",") if ":" in c]
    if not columns:
        raise ValueError("The CSV columns setting is empty.")
    fields = {"customer", "store_branch", "required_date", "po_number", "qty", "stock_code", "price",
              "description", "customer_code", "uom"}
    unknown = [k.strip() for k, _ in columns if k.strip() not in fields]
    if unknown:
        raise ValueError("The CSV columns setting names unknown fields: %s." % ", ".join(unknown))
    delimiter = setting("csv_delimiter", ",")
    delim = "\t" if delimiter == "tab" else delimiter
    encoding = "utf-8-sig" if setting("csv_bom", True) else "utf-8"

    files, report, taken = [], [], set()
    ready_count = 0
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
        parsed_date = parse_date(order.get("required_date"))
        if order.get("required_date") and parsed_date is None:
            problems.append("The required date '%s' is not a date." % order.get("required_date"))

        lines, lines_sum, priced = [], 0.0, True
        for i, ln in enumerate(order.get("lines") or [], 1):
            if not isinstance(ln, dict):
                continue
            qty = num(ln.get("qty"))
            price = num(ln.get("price"))
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
            printed = num(ln.get("line_total"))
            if qty is not None and price is not None and printed is not None:
                if abs(qty * price - printed) > max(0.02, 0.005 * abs(printed)):
                    problems.append("Line %d (%s): %s x %s = %.2f, but the printed line total is %.2f." % (
                        i, label, ("%g" % qty), ("%g" % price), qty * price, printed))
            lines.append({"qty": qty, "price": price, "stock_code": stock, "customer_code": cust_code,
                          "description": str(ln.get("description") or ""), "uom": str(ln.get("uom") or "")})
        if not lines:
            problems.append("No order lines.")
        count = num(order.get("printed_line_count"))
        if count is not None and lines and int(count) != len(lines):
            problems.append("The document prints %d lines but %d were read." % (int(count), len(lines)))
        total = num(order.get("total_net"))
        if priced and lines and total is not None and abs(total - lines_sum) > 0.02:
            problems.append("The order total is %.2f but the lines add up to %.2f." % (total, lines_sum))

        header = {
            "customer": account or customer_in,
            "store_branch": "",
            "required_date": fmt_date(parsed_date, order.get("required_date")),
            "po_number": po,
        }

        def cell(field, ln):
            if field == "qty":
                q = ln["qty"]
                return "" if q is None else (str(int(q)) if q.is_integer() else repr(q))
            if field == "price":
                if ln["price"] is None:
                    return ""
                text = ("%.4f" % ln["price"]).rstrip("0")
                return text + "0" * max(0, 2 - len(text.split(".")[1]))
            if field in ("stock_code", "customer_code", "description", "uom"):
                return safe(ln[field])
            return safe(header[field])

        buf = io.StringIO()
        writer = csv.writer(buf, delimiter=delim, lineterminator="\r\n")
        writer.writerow([label.strip() for _, label in columns])
        for ln in lines:
            writer.writerow([cell(f.strip(), ln) for f, _ in columns])
        stem = re.sub(r"[^A-Za-z0-9._-]+", "_", po or customer_in or "order-%d" % idx).strip("_") or "order-%d" % idx
        name = ("REVIEW-" if problems else "") + stem + ".csv"
        n = 1
        while name in taken:
            n += 1
            name = ("REVIEW-" if problems else "") + "%s-%d.csv" % (stem, n)
        taken.add(name)
        with open(name, "w", encoding=encoding, newline="") as fh:
            fh.write(buf.getvalue())
        files.append(name)
        if not problems:
            ready_count += 1
        report.append({"file": name, "source": order.get("source"), "customer": customer_in, "po_number": po,
                       "lines": len(lines), "status": "needs review" if problems else "ready",
                       "problems": problems, "notes": notes})

    md = ["# Orders found", ""]
    for r in report:
        md.append("## %s: %s, PO %s (%s)" % (r["status"].upper(), r["customer"] or "(unknown customer)",
                                            r["po_number"] or "(none)", r["source"] or "?"))
        md.append("File: %s. Lines: %d." % (r["file"], r["lines"]))
        md.extend("- " + p for p in r["problems"])
        md.extend("- Note: " + n for n in r["notes"])
        md.append("")
    for n_o in not_orders:
        if isinstance(n_o, dict):
            md.append("Not an order (%s): %s" % (n_o.get("source") or "?", n_o.get("why") or ""))
    if files or not_orders:
        with open("orders-summary.md", "w", encoding="utf-8") as fh:
            fh.write("\n".join(md).strip() + "\n")
        files.append("orders-summary.md")

    if not report:
        summary = "No orders found. " + " ".join(
            "%s: %s" % (n_o.get("source") or "?", n_o.get("why") or "") for n_o in not_orders if isinstance(n_o, dict))
    else:
        summary = "%d order%s found: %d ready, %d need review. Files: %s." % (
            len(report), "" if len(report) == 1 else "s", ready_count, len(report) - ready_count, ", ".join(files))
    return {"files": files, "orders": report, "not_orders": not_orders, "output": summary.strip()}
