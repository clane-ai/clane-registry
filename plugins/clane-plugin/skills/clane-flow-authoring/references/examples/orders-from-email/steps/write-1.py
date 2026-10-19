def main():
    import csv
    from clane import parse

    delimiter = getattr(settings, "csv_delimiter", None) or ","
    bom = getattr(settings, "csv_bom", True) is not False
    columns = [(c[0], c[1]) for c in build.columns]

    files = []
    for order in build.orders:
        with open(order["file"], "w", encoding="utf-8-sig" if bom else "utf-8", newline="") as fh:
            writer = csv.writer(fh, delimiter="\t" if delimiter == "tab" else delimiter, lineterminator="\r\n")
            writer.writerow([heading for _, heading in columns])
            for row in order["rows"]:
                writer.writerow([parse.guard(str(row.get(field) or "")) for field, _ in columns])
        files.append(order["file"])

    md = ["# Orders found", ""]
    for r in build.orders:
        md.append("## %s: %s, PO %s (%s)" % (r["status"].upper(), r["customer"] or "(unknown customer)",
                                            r["po_number"] or "(none)", r["source"] or "?"))
        md.append("File: %s. Lines: %d." % (r["file"], r["lines"]))
        md.extend("- " + p for p in r["problems"])
        md.extend("- Note: " + n for n in r["notes"])
        md.append("")
    for n in build.not_orders:
        md.append("Not an order (%s): %s" % (n.get("source") or "?", n.get("why") or ""))
    if files or build.not_orders:
        with open("orders-summary.md", "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(md).strip() + "\n")
        files.append("orders-summary.md")
    tail = " Files: %s." % ", ".join(files) if files else ""
    return {"files": files, "output": build.output + tail}
