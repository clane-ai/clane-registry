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
    if not isinstance(spec, dict):
        raise ValueError("The extraction returned order data that could not be read.")
    strict = bool(setting("strict", True))

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

    mapping = rows_of("code_mapping", ["customer", "customer_code", "stock_code"])
    registry = {}
    for r in rows_of("customer_registry", ["customer_name", "account_code"]):
        registry[norm(r.get("customer_name"))] = (r.get("account_code") or "").strip()

    customer_in = str(spec.get("customer") or "")
    known = {norm(r.get("customer")) for r in mapping if norm(r.get("customer"))} | {k for k in registry if k}
    typed = norm(customer_in)
    key = typed if typed in known else None
    if key is None and typed:
        inside = [k for k in known if k in typed]
        key = max(inside, key=len) if inside else None

    problems = []
    lines = spec.get("lines") or []
    if not isinstance(lines, list) or not lines:
        raise ValueError("The order has no lines.")
    if key is None:
        problems.append("Customer '%s' is not in your stock code mapping or customer accounts." % customer_in)

    lines_sum = 0.0
    for i, ln in enumerate(lines, 1):
        qty, price = num(ln.get("qty")), num(ln.get("price"))
        code = norm(ln.get("code"))
        shown = ln.get("code") or "(blank)"
        ln["stock_code"] = ""
        if key is not None:
            found = {(r.get("stock_code") or "").strip() for r in mapping
                     if norm(r.get("customer")) == key and norm(r.get("customer_code")) == code and code}
            found.discard("")
            if len(found) > 1:
                problems.append("Line %d code %s is mapped more than once." % (i, shown))
            elif not found:
                problems.append("Line %d code %s has no stock code mapping." % (i, shown))
            else:
                ln["stock_code"] = found.pop()
        if qty is None:
            problems.append("Line %d has no valid quantity." % i)
        if price is None:
            problems.append("Line %d has no price." % i)
        lines_sum += (qty or 0.0) * (price or 0.0)

    account = registry.get(key) if key is not None else None
    if key is not None and not account:
        problems.append("No account code for customer '%s' in the customer accounts file." % customer_in)

    total = num(spec.get("total"))
    if total is not None and abs(total - lines_sum) > 0.005:
        problems.append("The PO states an order total %.2f but the lines add up to %.2f." % (total, lines_sum))

    def parse_date(value):
        d = re.match(r"^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\s*$", str(value or ""))
        if not d:
            return None
        day, month, year = int(d.group(1)), int(d.group(2)), d.group(3)
        year = int(year) + 2000 if len(year) == 2 else int(year)
        if not (1 <= day <= 31 and 1 <= month <= 12):
            return None
        return day, month, year

    parsed_date = parse_date(spec.get("required_date"))
    if parsed_date is None:
        problems.append("The required date '%s' is not a date." % (spec.get("required_date") or ""))

    if problems and strict:
        raise ValueError(" ".join(problems))

    def fmt_date():
        if parsed_date is None:
            return str(spec.get("required_date") or "")
        day, month, year = parsed_date
        style = setting("csv_date_format", "dd.mm.yy")
        if style == "dd/mm/yyyy":
            return "%02d/%02d/%04d" % (day, month, year)
        if style == "yyyy-mm-dd":
            return "%04d-%02d-%02d" % (year, month, day)
        return "%02d.%02d.%02d" % (day, month, year % 100)

    header_fields = {
        "customer": account or customer_in,
        "store_branch": str(spec.get("store_branch") or ""),
        "required_date": fmt_date(),
        "po_number": str(spec.get("po_number") or ""),
    }
    default_columns = ("customer:Customer,store_branch:Store/Branch,required_date:Required Date,"
                       "po_number:Customer Order Number,qty:Order Qty.,stock_code:Stock Code,price:Price")
    columns = [c.split(":", 1) for c in str(setting("csv_columns", default_columns)).split(",") if ":" in c]
    if not columns:
        raise ValueError("The CSV columns setting is empty.")
    fields = {"customer", "store_branch", "required_date", "po_number", "qty", "stock_code", "price"}
    unknown = [k.strip() for k, _ in columns if k.strip() not in fields]
    if unknown:
        raise ValueError("The CSV columns setting names unknown fields: %s." % ", ".join(unknown))

    def safe(text):
        text = str(text)
        return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text

    def cell(field, ln):
        if field == "qty":
            q = num(ln.get("qty"))
            if q is None:
                return ""
            return str(int(q)) if q.is_integer() else repr(q)
        if field == "price":
            p = num(ln.get("price"))
            return "%.2f" % p if p is not None else ""
        if field == "stock_code":
            return safe(ln.get("stock_code", ""))
        return safe(header_fields[field])

    delimiter = setting("csv_delimiter", ",")
    delim = "\t" if delimiter == "tab" else delimiter
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=delim, lineterminator="\r\n")
    writer.writerow([label.strip() for _, label in columns])
    for ln in lines:
        writer.writerow([cell(field.strip(), ln) for field, _ in columns])

    po = re.sub(r"[^A-Za-z0-9._-]+", "_", str(spec.get("po_number") or "order")).strip("_") or "order"
    out = po + ".csv"
    encoding = "utf-8-sig" if setting("csv_bom", True) else "utf-8"
    with open(out, "w", encoding=encoding, newline="") as fh:
        fh.write(buf.getvalue())
    summary = "Order CSV ready for %s — PO %s, %d line%s." % (
        account or customer_in, spec.get("po_number") or "(none)", len(lines), "" if len(lines) == 1 else "s")
    if problems:
        summary += " Unmapped or unchecked: " + " ".join(problems)
    return {"file": out, "output": summary}
