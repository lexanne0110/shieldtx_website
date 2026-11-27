#!/usr/bin/env python3
"""
Package an issue of the ShieldTX weekly report for review by someone else.

    python3 scripts/build-newsletter-review.py newsletter/issue-001

Produces  build/review/issue-001/
    README.md                what this is, what to look at, known limits
    web-edition.html         standalone: CSS, fonts and logos embedded, no JS
    email-edition.html       the send, already self-contained
    web-edition.pdf          print of the standalone web edition
    email-edition.pdf        print of the email edition
    source/                  index.html, email.html, issue.json
    shieldtx-newsletter-issue-001.zip   the lot

Nothing here needs a server: both HTML files open on a double-click, offline.
Root-relative links are rewritten to production so a reviewer's click lands
somewhere real.
"""

import base64
import json
import mimetypes
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SITE = "https://www.shieldtx.xyz"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS_ORDER = ["/css/theme.css", "/css/site.css", "/css/newsletter.css"]


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def strip_scripts(html: str) -> str:
    html = re.sub(r"<!-- PostHog analytics -->.*?<!-- Google tag \(gtag\.js\) -->.*?</script>\s*",
                  "", html, flags=re.S)
    html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
    html = re.sub(r'<script\b[^>]*/>', "", html)
    return html


def inline_css(html: str) -> str:
    """Replace the three <link rel=stylesheet> tags with one inlined <style>."""
    blocks = []
    for href in CSS_ORDER:
        name = href.split("?")[0]
        css = (REPO / name.lstrip("/")).read_text(encoding="utf-8")
        blocks.append(css)
    combined = "\n".join(blocks)

    # fonts and any other root-absolute asset inside the CSS become data URIs
    def repl(m):
        raw = m.group(1).strip().strip("'\"")
        if raw.startswith("/assets/"):
            p = REPO / raw.lstrip("/")
            if p.exists():
                return f"url({data_uri(p)})"
        return m.group(0)

    combined = re.sub(r"url\(([^)]+)\)", repl, combined)

    html = re.sub(r'<link rel="stylesheet"[^>]*>\s*', "", html)
    html = re.sub(r"<link rel=\"preload\"[^>]*>\s*", "", html)
    html = html.replace("</head>", f"<style>\n{combined}\n</style>\n</head>", 1)
    return html


def inline_images(html: str) -> str:
    def repl(m):
        src = m.group(2)
        if src.startswith("/assets/"):
            p = REPO / src.split("?")[0].lstrip("/")
            if p.exists():
                return f'{m.group(1)}="{data_uri(p)}"'
        return m.group(0)

    html = re.sub(r'(src|href)="(/assets/[^"]+)"', repl, html)
    return html


def absolutise_links(html: str) -> str:
    def repl(m):
        attr, url = m.group(1), m.group(2)
        if url.startswith(("/", "#")) and not url.startswith("//"):
            return f'{attr}="{SITE}{url}"'
        return m.group(0)

    # hrefs only: internal navigation should land on production, not on file:///
    return re.sub(r'(href)="(/[^"]*)"', repl, html)


def clean_head(html: str) -> str:
    html = re.sub(r'<link rel="icon"[^>]*>\s*', "", html)
    html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\s*', "", html)
    html = re.sub(r'<meta name="theme-color"[^>]*>\s*', "", html)
    return html


def build_web(src: Path) -> str:
    html = src.read_text(encoding="utf-8")
    html = strip_scripts(html)
    html = inline_css(html)
    html = inline_images(html)
    html = absolutise_links(html)
    html = clean_head(html)
    banner = (
        '<!-- Review copy: CSS, fonts and logos embedded; analytics removed.\n'
        '     Internal links point at https://www.shieldtx.xyz -->\n'
    )
    return html.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n" + banner, 1)


def _pdf_pages(pdf: Path) -> int:
    counts = re.findall(rb"/Count\s+(\d+)", pdf.read_bytes())
    return int(counts[0]) if counts else 0


def print_pdf(src: Path, out: Path, page_w: int, start_h=4000) -> bool:
    """Chrome headless print-to-pdf with an injected @page rule.

    page_h=None  -> single page, auto-fitted: start tall, and if Chrome still
                    splits the document, grow the page until it fits. A page
                    taller than the content is invisible, because the tail is
                    the same black as the canvas.
    start_h      -> first page height tried; grows if the document does not fit.
    """
    if not Path(CHROME).exists():
        return False
    html = src.read_text(encoding="utf-8").replace(
        "</head>",
        "<style>@page{size:__W__px __H__px;margin:0}"
        "html,body{background:#040405}"
        "*{-webkit-print-color-adjust:exact;print-color-adjust:exact}"
        ".skip,.scroll-top,.menu-toggle{display:none!important}</style></head>",
        1,
    )
    heights = [start_h, int(start_h * 1.5), int(start_h * 2.5)]

    for h in heights:
        tmp = src.with_suffix(".print.html")
        tmp.write_text(
            html.replace("__W__", str(page_w)).replace("__H__", str(h)),
            encoding="utf-8",
        )
        try:
            subprocess.run(
                [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                 f"--print-to-pdf={out}", "--no-pdf-header-footer",
                 "--virtual-time-budget=4000", tmp.as_uri()],
                check=True, capture_output=True, timeout=120,
            )
        finally:
            tmp.unlink(missing_ok=True)
        if _pdf_pages(out) == 1:
            return True
    print(f"  ! {out.name}: still multi-page after {heights[-1]}px", file=sys.stderr)
    return out.exists()


def main(argv):
    issue_dir = Path(argv[1] if len(argv) > 1 else "newsletter/issue-001").resolve()
    data = json.loads((issue_dir / "issue.json").read_text(encoding="utf-8"))
    slug = issue_dir.name
    out = Path.home() / "Downloads" / "shieldtx-review" / slug
    if out.exists():
        shutil.rmtree(out)
    (out / "source").mkdir(parents=True)

    web = out / "web-edition.html"
    web.write_text(build_web(issue_dir / "index.html"), encoding="utf-8")

    email_src = issue_dir / "email.html"
    if not email_src.exists():
        sys.exit(f"{email_src} missing — run scripts/build-newsletter-email.py first")
    email = out / "email-edition.html"
    shutil.copy2(email_src, email)

    for src in ("index.html", "email.html", "issue.json"):
        shutil.copy2(issue_dir / src, out / "source" / src)

    pdf_web = print_pdf(web, out / "web-edition.pdf", 1440, 4000)
    pdf_email = print_pdf(email, out / "email-edition.pdf", 640, 2800)

    iss = data["issue"]
    bar = "=" * 62
    readme = f"""{bar}
SHIELDTX WEEKLY REPORT  ·  ISSUE {iss['number_label']}  ·  REVIEW COPY
{bar}

Two editions of the same issue. Open the .html files in a browser: they
need no server and no internet connection.

1. web-edition.html
   The canonical read, as it appears on www.shieldtx.xyz. This is where a
   reader lands when they click "view in browser" in the email.

   Also as web-edition.pdf.

2. email-edition.html
   What actually arrives in an inbox: 600px wide, table layout, no images at
   all (the charts are built from table cells), so nothing breaks when a mail
   client blocks remote images on a first send.

   Also as email-edition.pdf.

WHAT NEEDS A DECISION
---------------------
* The hero figure, leaderboard, census and speed/size bands are SAMPLE DATA.
  Each placeholder keeps its bracket token in the source ($[X.X]M, [N], [X]ms)
  so real numbers drop in without a redesign.
* The email's sign-up form is not connected to a list yet.
* The web edition is not yet linked from the site nav or footer.

KNOWN LIMITS
------------
* The email edition has been checked in Chrome at 640px and 390px only. It has
  not been through Outlook on Windows, the Gmail Android app or Apple Mail;
  that needs one real send across clients.
* Links inside these files point at https://www.shieldtx.xyz . The /newsletter
  pages do not exist there yet, so archive and footer links will 404 until
  this branch is deployed.

SOURCE
------
source/ holds the three files as they sit in the repository: index.html (web
edition), email.html (rendered email edition) and issue.json (the figures both
editions are checked against).
"""
    (out / "README.txt").write_text(readme, encoding="utf-8")

    zip_path = out / f"shieldtx-newsletter-{slug}.zip"
    subprocess.run(["zip", "-qr", str(zip_path), ".", "-x", f"{zip_path.name}"],
                   cwd=out, check=True)

    for f in sorted(out.iterdir()):
        size = f.stat().st_size if f.is_file() else "-"
        print(f"{size:>9}  {f.name}")
    print(f"\nPDFs: web={pdf_web} email={pdf_email}")


if __name__ == "__main__":
    main(sys.argv)
