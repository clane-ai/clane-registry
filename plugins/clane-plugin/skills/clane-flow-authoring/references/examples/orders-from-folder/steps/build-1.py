def main():
    import csv, json, re
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
    if not isinstance(spec, dict):
        raise ValueError("The extraction returned order data that could not be read.")
    strict = bool(setting("strict", True))

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
        qty, price = parse.amount(ln.get("qty")), parse.amount(ln.get("price"))
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
        ln["qty"], ln["price"] = qty, price
        lines_sum += (qty or 0.0) * (price or 0.0)

    account = registry.get(key) if key is not None else None
    if key is not None and not account:
        problems.append("No account code for customer '%s' in the customer accounts file." % customer_in)

    total = parse.amount(spec.get("total"))
    if total is not None and abs(total - lines_sum) > 0.005:
        problems.append("The PO states an order total %.2f but the lines add up to %.2f." % (total, lines_sum))

    required = parse.date(str(spec.get("required_date") or ""))
    if required is None:
        problems.append("The required date '%s' is not a date." % (spec.get("required_date") or ""))

    if problems and strict:
        raise ValueError(" ".join(problems))

    def fmt_date():
        if required is None:
            return str(spec.get("required_date") or "")
        year, month, day = (int(p) for p in required.split("-"))
        style = setting("csv_date_format", "dd.mm.yy")
        if style == "dd/mm/yyyy":
            return "%02d/%02d/%04d" % (day, month, year)
        if style == "yyyy-mm-dd":
            return required
        return "%02d.%02d.%02d" % (day, month, year % 100)

    def money(value):
        # Unit prices can carry more than 2 decimals (1.321); keep up to 4, never fewer than 2.
        text = ("%.4f" % value).rstrip("0")
        return text + "0" * max(0, 2 - len(text.split(".")[1]))

    fields = {"customer", "store_branch", "required_date", "po_number", "qty", "stock_code", "price"}
    columns = [c.split(":", 1)[0].strip() for c in str(setting("csv_columns", "")).split(",") if c.strip()]
    unknown = [f for f in columns if f not in fields]
    if unknown:
        raise ValueError("The CSV columns setting names unknown fields: %s." % ", ".join(unknown))

    po = str(spec.get("po_number") or "")
    header = {
        "customer": account or customer_in,
        "store_branch": str(spec.get("store_branch") or ""),
        "required_date": fmt_date(),
        "po_number": po,
    }
    rows = [dict(header,
                 qty="" if ln["qty"] is None else ("%d" % ln["qty"] if ln["qty"].is_integer() else repr(ln["qty"])),
                 stock_code=ln["stock_code"],
                 price="" if ln["price"] is None else money(ln["price"]))
            for ln in lines]

    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", po or "order").strip("_") or "order"
    summary = "Order CSV ready for %s — PO %s, %d line%s." % (
        account or customer_in, po or "(none)", len(lines), "" if len(lines) == 1 else "s")
    if problems:
        summary += " Unmapped or unchecked: " + " ".join(problems)
    return {"rows": rows, "file": stem + ".csv", "key": "po:" + (norm(po) or stem), "output": summary}
