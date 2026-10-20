def main():
    import glob
    import pdfplumber
    from bs4 import BeautifulSoup

    cands = sorted(f for f in glob.glob("*")
                   if f.lower().endswith((".pdf", ".htm", ".html")))
    if not cands:
        raise ValueError("No PO file (.pdf/.htm) found in the working folder.")
    path = cands[0]
    if path.lower().endswith(".pdf"):
        text = ""
        with pdfplumber.open(path) as pdf:
            for pg in pdf.pages:
                text += (pg.extract_text() or "") + "\n"
        fmt = "pdf"
    else:
        html = open(path, encoding="utf-8", errors="replace").read()
        text = BeautifulSoup(html, "html.parser").get_text("\n")
        fmt = "html"
    return {"file": path, "format": fmt, "text": text}
