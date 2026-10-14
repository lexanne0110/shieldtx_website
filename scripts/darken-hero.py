"""Recolour a ShieldTX blog hero: bright-blue background -> design dark panel.

Usage: python3 scripts/darken-hero.py blog/<post>/hero.png blog/<post>/hero-dark.webp [width=2048]
Then point the post's hero <img> at hero-dark.webp (width="2048" height="1152").
Needs Pillow (pip install pillow).
Each pixel is treated as foreground blended over the flat blue BG. Alpha is
the largest per-channel move away from BG (normalised by the room left in
that direction), divided by SOLID so strokes/accents at >= SOLID stay exact.
Composited onto DARK with alpha squared: pure BG -> DARK, solid art unchanged,
anti-aliased edges blend, and the faint grid stays faint.
"""
import sys
from PIL import Image

BG = (3, 83, 241)          # sampled: identical in all five heroes
DARK = (14, 17, 26)        # design --panel (#0E111A)
SOLID = 0.8                # channel move counted as fully opaque art
MIN_ROOM = 60              # ignore moves in directions with less headroom

src, dst = sys.argv[1], sys.argv[2]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 2048
im = Image.open(src).convert("RGB")
if im.width > width:
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)

room_up = [255 - b for b in BG]
room_dn = list(BG)
delta = [d - b for d, b in zip(DARK, BG)]


def recolour(p):
    a = 0.0
    for c in range(3):
        diff = p[c] - BG[c]
        # A channel with little room in a direction can't signal opacity that way
        # (blue has 14 left above, red 3 below); resize ringing and the faint grid
        # only nudge it, so ignore moves in directions with little room.
        if (diff > 0 and room_up[c] < MIN_ROOM) or (diff < 0 and room_dn[c] < MIN_ROOM):
            continue
        r = diff / room_up[c] if diff > 0 else (-diff / room_dn[c] if diff < 0 else 0.0)
        if r > a:
            a = r
    a = min(1.0, a / SOLID)
    # p = BG + a(F - BG)  ->  out = DARK + a'(F - DARK), with a' = a**2 so faint
    # pixels (the grid) fade on dark while solid art (a = 1) is returned exactly.
    # Expanded: out = DARK + a(p - BG) + a**2 (BG - DARK).
    a2 = a * a
    return tuple(max(0, min(255, round(DARK[c] + a * (p[c] - BG[c]) - a2 * delta[c]))) for c in range(3))


cache = {}
out = []
for p in im.getdata():
    v = cache.get(p)
    if v is None:
        v = cache[p] = recolour(p)
    out.append(v)
im.putdata(out)
im.save(dst, "WEBP", lossless=True, method=6)  # lossy WebP chroma-subsamples thin lines into blue halos
print(dst, im.size)
