#!/usr/bin/env python3
"""One-time migration: wrap each page's existing <header class="nav..."> and
<footer class="footer"> with @partial markers so sync-partials.py can take
over.

Usage:
    python3 scripts/wrap-with-markers.py
    python3 scripts/sync-partials.py     # regenerate from /partials

Safe to re-run — files already containing a marker are skipped per-partial.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Pages to migrate. Skipping /app/ (different gate UI) and /brand-document/
# (custom design-doc nav). Add here to extend coverage.
TARGETS = [
    "index.html",
    "blog/index.html",
    "blog/_template/index.html",
    "blog/what-is-copy-trade-protection/index.html",
    "blog/how-copy-traders-are-stealing-your-edge/index.html",
    "blog/hyperbot-dexly-hyperdash-copy-trading-tools/index.html",
    "contact/index.html",
    "privacy/index.html",
    "terms/index.html",
    "request-access/index.html",
    "trust-model/index.html",
]


def infer_nav_variant(header_open_tag: str) -> str:
    if re.search(r"\bnav-blog\b", header_open_tag):
        return "nav-blog"
    if re.search(r"\bnav-docs\b", header_open_tag):
        return "nav-docs"
    return ""


def find_block(source: str, open_regex: re.Pattern, close_tag: str):
    m = open_regex.search(source)
    if not m:
        return None
    close_idx = source.find(close_tag, m.start())
    if close_idx == -1:
        return None
    return (m.start(), close_idx + len(close_tag), m.group(0))


def wrap_block(source: str, block, partial_name: str, attrs: dict) -> str:
    start, end, _open_line = block
    line_start = source.rfind("\n", 0, start) + 1
    indent_match = re.match(r"\s*", source[line_start:start])
    indent = indent_match.group(0) if indent_match else ""
    attr_str = "".join(f' {k}="{v}"' for k, v in attrs.items())
    original = source[start:end]
    open_marker = f"<!-- @partial {partial_name}{attr_str} -->"
    close_marker = f"<!-- /@partial {partial_name} -->"
    replacement = f"{open_marker}\n{indent}{original}\n{indent}{close_marker}"
    return source[:start] + replacement + source[end:]


def migrate_file(rel_path: str) -> None:
    full = ROOT / rel_path
    if not full.exists():
        print("skip missing", rel_path, file=sys.stderr)
        return
    source = full.read_text(encoding="utf-8")
    changed = False

    if "<!-- @partial nav" not in source:
        nav = find_block(
            source,
            re.compile(r'<header[^>]*class="nav[^"]*"[^>]*>'),
            "</header>",
        )
        if nav:
            variant = infer_nav_variant(nav[2])
            attrs = {"variant": variant} if variant else {}
            source = wrap_block(source, nav, "nav", attrs)
            changed = True
        else:
            print("  no <header class=\"nav\"> in", rel_path, file=sys.stderr)

    if "<!-- @partial footer" not in source:
        footer = find_block(
            source,
            re.compile(r'<footer[^>]*class="footer"[^>]*>'),
            "</footer>",
        )
        if footer:
            source = wrap_block(source, footer, "footer", {})
            changed = True
        else:
            print("  no <footer class=\"footer\"> in", rel_path, file=sys.stderr)

    if changed:
        full.write_text(source, encoding="utf-8")
        print("wrapped", rel_path)
    else:
        print("already wrapped", rel_path)


def main() -> int:
    for t in TARGETS:
        migrate_file(t)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
