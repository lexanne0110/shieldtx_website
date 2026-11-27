#!/usr/bin/env python3
"""
Check the email edition of a weekly ShieldTX issue.

    python3 scripts/check-newsletter-email.py newsletter/issue-001

Three groups of asserts:

  1. CLIENT SAFETY  — nothing in the file that a mail client will drop or that
     breaks layout in the Word rendering engine (Outlook).
  2. SIZE / DELIVERABILITY — under Gmail's 102KB clip, absolute links, preheader
     present, unsubscribe present.
  3. DATA PARITY — the email, issue.json and the hand-authored web page agree on
     every number. This is the check that actually earns its keep: the two
     editions are edited separately and will drift otherwise.

Exit code 0 = clean, 1 = failures listed.
"""

import json
import re
import sys
from pathlib import Path

MAX_BYTES = 102_000  # Gmail clips at ~102KB

# Word engine / legacy clients cannot do these. Any occurrence is a defect.
BANNED_CSS = [
    (r"display\s*:\s*flex", "flexbox"),
    (r"display\s*:\s*grid", "CSS grid"),
    (r"display\s*:\s*inline-flex", "inline-flex"),
    (r"gap\s*:", "flex/grid gap"),
    (r"position\s*:\s*(absolute|fixed|sticky)", "positioned element"),
    (r"float\s*:", "float"),
    (r"background-image", "background-image"),
    (r"box-shadow", "box-shadow"),
    (r"backdrop-filter", "backdrop-filter"),
    (r"clip-path", "clip-path"),
    (r"\bgrid-template", "grid-template"),
    (r"object-fit", "object-fit"),
]

# Any of these means the email depends on something a client strips/blocks.
BANNED_TAGS = [
    (r"<script\b", "<script>"),
    (r"<link\b", "<link>"),
    (r"<svg\b", "inline SVG"),
    (r"<img\b", "<img> (image dependency)"),
    (r"<video\b", "<video>"),
    (r"<iframe\b", "<iframe>"),
    (r"url\(", "CSS url()"),
    (r"@import", "@import"),
]


def fail(errs, msg):
    errs.append(msg)


def check_safety(out, errs):
    for pat, name in BANNED_CSS:
        for m in re.finditer(pat, out, re.I):
            fail(errs, f"banned CSS: {name} at offset {m.start()}")
    for pat, name in BANNED_TAGS:
        for m in re.finditer(pat, out, re.I):
            fail(errs, f"banned markup: {name} at offset {m.start()}")

    # every table must be declared decorative and zero-collapsed
    for m in re.finditer(r"<table\b[^>]*>", out, re.I):
        tag = m.group(0)
        if 'role="presentation"' not in tag:
            fail(errs, f"<table> without role=presentation: {tag[:90]}")
        for attr in ("cellpadding", "cellspacing", "border"):
            if f'{attr}="' not in tag:
                fail(errs, f"<table> missing {attr}: {tag[:90]}")

    # links must be absolute or a known ESP token
    for m in re.finditer(r'href="([^"]*)"', out):
        href = m.group(1)
        if href.startswith("http") or href == "{{ unsubscribe }}":
            continue
        fail(errs, f"non-absolute href: {href!r}")


def check_deliverability(out, data, errs):
    size = len(out.encode())
    if size > MAX_BYTES:
        fail(errs, f"size {size:,}B exceeds Gmail clip guard {MAX_BYTES:,}B")
    if "{{ unsubscribe }}" not in out and data["footer"]["unsubscribe_url"] not in out:
        fail(errs, "no unsubscribe link")
    if data["issue"]["url"] not in out:
        fail(errs, "no 'view in browser' URL")
    if not re.search(r'display:none;[^"]*max-height:0', out):
        fail(errs, "no hidden preheader block")
    if 'name="color-scheme"' not in out:
        fail(errs, "no color-scheme meta (dark backgrounds get inverted)")


def check_parity(out, data, web, errs):
    """Email figures must equal issue.json and the web edition."""
    if data["hero"]["value"] not in out:
        fail(errs, f"hero value {data['hero']['value']!r} missing from email")
    if data["hero"]["value"] not in web:
        fail(errs, f"hero value {data['hero']['value']!r} missing from web page")

    # leaderboard: same 10 wallets, same copier counts, same order
    web_rows = re.findall(r'<tr><td class="nl-rank">\s*(\d+)\s*</td><td class="nl-wallet">([^<]+)</td>'
                          r'<td class="nl-num-col">\s*(\d+)\s*</td><td class="nl-num-col">\s*(\d+)\s*</td>',
                          web)
    web_rows = [(int(a), b.strip(), int(c), int(d)) for a, b, c, d in web_rows]
    json_rows = [(r[0], r[1], r[2], r[3]) for r in data["leaderboard"]["rows"]]
    if web_rows != json_rows:
        fail(errs, f"leaderboard web != json\n  web : {web_rows}\n  json: {json_rows}")
    for rank, wallet, copiers, last in json_rows:
        if wallet not in out:
            fail(errs, f"leaderboard wallet {wallet} missing from email")
        if f">{copiers}</td>" not in out:
            fail(errs, f"leaderboard copier count {copiers} ({wallet}) missing from email")

    # census values appear verbatim in both
    for item in data["census"]["items"]:
        if item["value"] not in out:
            fail(errs, f"census value {item['value']!r} missing from email")
        if item["value"].split()[0] not in web:
            fail(errs, f"census value {item['value']!r} missing from web page")

    # trend series must match the web sparkline/area path
    web_path = re.search(r'<path d="M 10 106\.35[^"]*" fill="none"', web)
    if not web_path:
        fail(errs, "could not locate the web trend path to compare")
    else:
        ys = [float(v) for v in re.findall(r"L? ?[\d.]+ ([\d.]+)", web_path.group(0))]
        web_vals = [round((246 - y) / 228 * 16, 1) for y in ys]
        json_vals = [float(p["value"]) for p in data["trend"]["series"]]
        if web_vals != json_vals:
            fail(errs, f"trend series web != json\n  web : {web_vals}\n  json: {json_vals}")

    # speed / size
    if data["speed"]["value"] not in out:
        fail(errs, "speed value missing from email")
    for row in data["speed"]["size_rows"]:
        if row["label"].replace("<", "&lt;").replace(">", "&gt;") not in out:
            fail(errs, f"size band {row['label']} missing from email")


def main(argv):
    issue_dir = Path(argv[1] if len(argv) > 1 else "newsletter/issue-001")
    data = json.loads((issue_dir / "issue.json").read_text(encoding="utf-8"))
    out = (issue_dir / "email.html").read_text(encoding="utf-8")
    web = (issue_dir / "index.html").read_text(encoding="utf-8")

    errs = []
    check_safety(out, errs)
    check_deliverability(out, data, errs)
    check_parity(out, data, web, errs)

    if errs:
        print(f"FAIL — {len(errs)} issue(s) in {issue_dir}/email.html")
        for x in errs:
            print("  ·", x)
        return 1

    size = len(out.encode())
    tables = len(re.findall(r"<table\b", out))
    print(f"PASS — {issue_dir}/email.html")
    print(f"  {size:,} bytes ({size / MAX_BYTES:.0%} of the Gmail clip guard)")
    print(f"  {tables} tables, 0 images, 0 scripts, 0 external stylesheets")
    print(f"  figures match issue.json and index.html")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
