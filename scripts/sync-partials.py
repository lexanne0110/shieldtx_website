#!/usr/bin/env python3
"""sync-partials.py — single-source nav/footer (and friends) for the site.

Each .html file declares partial slots with marker comments:

    <!-- @partial nav -->
    ...generated content lives here...
    <!-- /@partial nav -->

Optional attributes are passed to the partial template as substitutions:

    <!-- @partial nav variant="docs" -->

Partials live in /partials/<name>.html and may contain {{token}} placeholders
that get replaced with attribute values. A token with no matching attribute is
replaced with the empty string.

Re-running the script regenerates the content between markers, so it is safe
to invoke after every edit to a partial. Run via `npm run sync` (which calls
this script via python3).
"""

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTIALS_DIR = ROOT / "partials"
SKIP_DIRS = {"node_modules", ".git", "partials", ".vercel"}

OPEN_RE = re.compile(r"<!--\s*@partial\s+([\w-]+)([^>]*?)-->")
ATTR_RE = re.compile(r'([\w-]+)\s*=\s*"([^"]*)"')
TOKEN_RE = re.compile(r"{{\s*([\w-]+)\s*}}")


def read_partial(name: str) -> str:
    path = PARTIALS_DIR / f"{name}.html"
    if not path.exists():
        raise FileNotFoundError(f"Partial not found: {path}")
    return path.read_text(encoding="utf-8")


def apply_tokens(template: str, attrs: dict) -> str:
    return TOKEN_RE.sub(lambda m: attrs.get(m.group(1), ""), template)


def parse_attrs(raw: str) -> dict:
    return {m.group(1): m.group(2) for m in ATTR_RE.finditer(raw)}


def sync_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    out = []
    cursor = 0
    changed = False

    while True:
        m = OPEN_RE.search(original, cursor)
        if not m:
            out.append(original[cursor:])
            break

        name = m.group(1)
        attrs = parse_attrs(m.group(2) or "")
        open_end = m.end()
        close_tag = f"<!-- /@partial {name} -->"
        close_idx = original.find(close_tag, open_end)
        if close_idx == -1:
            raise ValueError(
                f"Missing close marker for '{name}' in {path.relative_to(ROOT)}"
            )

        # Compute indent from the open marker's line.
        line_start = original.rfind("\n", 0, m.start()) + 1
        indent_match = re.match(r"\s*", original[line_start:m.start()])
        indent = indent_match.group(0) if indent_match else ""

        rendered = apply_tokens(read_partial(name), attrs).strip()
        lines = rendered.split("\n")
        indented = lines[0] + "".join("\n" + indent + ln for ln in lines[1:])

        # Append unchanged text (including open marker) then the new block.
        out.append(original[cursor:open_end])
        out.append("\n" + indent + indented + "\n" + indent)
        cursor = close_idx

        if original[open_end:close_idx].strip() != indented.strip():
            changed = True

    new_content = "".join(out)
    if changed:
        path.write_text(new_content, encoding="utf-8")
    return changed


def walk_html_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        # Mutate dirnames in place to prune walk.
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for f in filenames:
            if f.endswith(".html"):
                yield Path(dirpath) / f


def main() -> int:
    scanned = 0
    touched = 0
    errors = 0
    for path in walk_html_files(ROOT):
        scanned += 1
        try:
            if sync_file(path):
                touched += 1
                print("updated", path.relative_to(ROOT))
        except Exception as err:  # noqa: BLE001
            errors += 1
            print("error in", path.relative_to(ROOT), "-", err, file=sys.stderr)
    print(f"scanned {scanned} files, updated {touched}, errors {errors}")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
