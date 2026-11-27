#!/usr/bin/env python3
"""
Build the email-client-safe edition of a weekly ShieldTX issue.

    python3 scripts/build-newsletter-email.py newsletter/issue-001

Reads  <issue-dir>/issue.json   (single source of truth for the figures)
Writes <issue-dir>/email.html   (table layout, inline styles, no images)

Why a generator and not a hand-authored file: the web edition and the email
edition must never disagree on a number. issue.json holds the data; this
script holds the email layout. scripts/check-newsletter-email.py then asserts
the email, the JSON and the web page all agree.

Email constraints this renderer respects
  - no flex / grid / float / position — tables only
  - no external stylesheet, no <script>, no SVG, no background-image
  - no raster images at all, so blocked images cannot break the design
  - every colour set inline as an attribute and a style (Outlook drops one)
  - Gmail clips at 102KB; the guard in the checker enforces it
"""

import json
import sys
import html
from pathlib import Path

# ---------------------------------------------------------------- tokens
CANVAS = "#040405"
PANEL = "#0F1917"
T1 = "#F6FEFD"
T2 = "#C3CAD6"
T3 = "#8BA6A1"
T4 = "#6B7488"
DIV = "#252B36"
BRAND = "#97FCE4"
TRACK = "#1A222B"
BAR_PAST = "#2A4A43"
HAIR = "#1E252E"

SANS = "Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
MONO = "'SFMono-Regular',Menlo,Consolas,'Courier New',monospace"

W = 600           # email width
PAD = 32          # side padding
INNER = W - PAD * 2
BAR_MAX_H = 148   # px height of the tallest bar


def e(s):
    """Escape text for HTML, keeping the typographic characters we author."""
    return html.escape(str(s), quote=False)


def pad(extra=""):
    return f"padding-left:{PAD}px;padding-right:{PAD}px;{extra}"


# ---------------------------------------------------------------- chrome
def rule():
    return (
        f'<tr><td class="nl-pad" style="{pad()}">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td height="1" bgcolor="{DIV}" style="height:1px;line-height:1px;font-size:0;'
        f'background:{DIV};">&nbsp;</td></tr></table></td></tr>'
    )


def section_label(text):
    return (
        f'<div style="font-family:{MONO};font-size:10px;line-height:16px;'
        f'letter-spacing:.14em;text-transform:uppercase;color:{T4};'
        f'margin:0 0 14px;">{e(text)}</div>'
    )


def h2(text):
    return (
        f'<h2 style="margin:0 0 18px;font-family:{SANS};font-size:23px;line-height:30px;'
        f'font-weight:400;letter-spacing:-.02em;color:{T1};">{e(text)}</h2>'
    )


def read_line(text):
    """One sentence of interpretation under every chart. House rule."""
    return (
        f'<p style="margin:16px 0 0;font-family:{SANS};font-size:14px;line-height:22px;'
        f'color:{T3};"><span style="color:{BRAND};">Read:</span> {e(text)}</p>'
    )


def link(url, text, color=T1, size=13, weight=400, ls="0", underline=False):
    td = "underline" if underline else "none"
    return (
        f'<a href="{e(url)}" style="font-family:{MONO};font-size:{size}px;'
        f'color:{color};text-decoration:{td};letter-spacing:{ls};font-weight:{weight};">'
        f'{e(text)}</a>'
    )


# ---------------------------------------------------------------- blocks
def build_topbar(d):
    iss = d["issue"]
    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:26px;padding-bottom:18px;")}">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td align="left" style="font-family:{MONO};font-size:10px;line-height:14px;'
        f'letter-spacing:.14em;text-transform:uppercase;color:{T4};">'
        f'ShieldTX &middot; The weekly report</td>'
        f'<td align="right" style="font-family:{MONO};font-size:10px;line-height:14px;'
        f'letter-spacing:.1em;color:{T4};">'
        f'<a href="{e(iss["url"])}" style="color:{T3};text-decoration:underline;'
        f'font-family:{MONO};font-size:10px;">View in browser &rarr;</a></td>'
        f'</tr></table></td></tr>'
    )


def build_masthead(d):
    iss = d["issue"]
    chip = ""
    if iss.get("sample_data"):
        chip = (
            f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
            f'align="left" style="margin:14px 0 0;"><tr>'
            f'<td bgcolor="{PANEL}" style="background:{PANEL};border:1px solid #2C3A44;'
            f'border-radius:10px;padding:4px 9px;font-family:{MONO};font-size:9px;'
            f'line-height:12px;letter-spacing:.12em;text-transform:uppercase;color:{T4};">'
            f'Sample data</td></tr></table>'
        )
    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:8px;padding-bottom:30px;")}">'
        f'<h1 style="margin:0 0 12px;font-family:{SANS};font-size:38px;line-height:42px;'
        f'font-weight:400;letter-spacing:-.035em;color:{T1};">{e(iss["title"])}</h1>'
        f'<div style="font-family:{MONO};font-size:11px;line-height:16px;letter-spacing:.1em;'
        f'text-transform:uppercase;color:{T4};">Issue {e(iss["number_label"])} &middot; '
        f'{e(iss["date"])}</div>'
        f'<p style="margin:16px 0 0;font-family:{SANS};font-size:15px;line-height:24px;'
        f'color:{T2};">{e(iss["standfirst"])}</p>'
        f'{chip}</td></tr>'
    )


def build_hero(d):
    h = d["hero"]
    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:30px;padding-bottom:34px;")}">'
        f'{section_label(h["label"])}'
        f'<div class="nl-herofig" style="font-family:{SANS};font-size:66px;line-height:68px;'
        f'letter-spacing:-.045em;color:{T1};margin:0 0 14px;">{e(h["value"])}</div>'
        f'<p style="margin:0 0 18px;font-family:{SANS};font-size:16px;line-height:24px;'
        f'color:{T2};">{e(h["line"])}</p>'
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left">'
        f'<tr><td bgcolor="{PANEL}" style="background:{PANEL};border:1px solid #2A463F;'
        f'border-radius:4px;padding:5px 10px;font-family:{MONO};font-size:11px;line-height:15px;'
        f'color:{BRAND};">&#9650; {e(h["delta"])}</td></tr></table>'
        f'<div style="clear:both;height:0;line-height:0;font-size:0;">&nbsp;</div>'
        f'<p style="margin:18px 0 0;font-family:{SANS};font-size:13px;line-height:20px;'
        f'color:{T4};"><span style="font-family:{MONO};color:{T3};">{e(h["basis_prefix"])}</span>'
        f'{e(h["basis"])} &middot; '
        f'<a href="{e(d["issue"]["url"])}#methodology" style="color:{T3};text-decoration:underline;">'
        f'Methodology &rarr;</a></p>'
        f'</td></tr>'
    )


def build_trend(d):
    t = d["trend"]
    series = t["series"]
    axis = float(t["axis_max"])
    n = len(series)
    col_w = INNER // n
    bar_w = 30
    heights = [max(2, round(float(p["value"]) / axis * BAR_MAX_H)) for p in series]

    bar_cells = []
    for i, p in enumerate(series):
        hgt = heights[i]
        gap = BAR_MAX_H - hgt
        colour = BRAND if i == n - 1 else BAR_PAST
        bar_cells.append(
            f'<td align="center" valign="bottom" width="{col_w}" style="padding:0;">'
            f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
            f'align="center" style="margin:0 auto;">'
            f'<tr><td height="{gap}" style="height:{gap}px;line-height:{gap}px;font-size:0;">'
            f'&nbsp;</td></tr>'
            f'<tr><td width="{bar_w}" height="{hgt}" bgcolor="{colour}" '
            f'style="width:{bar_w}px;height:{hgt}px;line-height:{hgt}px;font-size:0;'
            f'background:{colour};">&nbsp;</td></tr>'
            f'</table></td>'
        )

    label_cells = []
    for i, p in enumerate(series):
        colour = T2 if i == n - 1 else T4
        label_cells.append(
            f'<td align="center" width="{col_w}" style="padding:8px 0 0;font-family:{MONO};'
            f'font-size:9px;line-height:12px;color:{colour};white-space:nowrap;">'
            f'{e(p["label"])}</td>'
        )

    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:0;padding-bottom:34px;")}">'
        f'{section_label(t["label"])}{h2(t["heading"])}'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="border:1px solid {DIV};">'
        f'<tr><td style="padding:18px 18px 0;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td align="left" style="font-family:{MONO};font-size:9px;line-height:13px;'
        f'letter-spacing:.1em;text-transform:uppercase;color:{T4};">{e(t["legend"])}'
        f' &middot; $0&ndash;{int(axis)}M</td>'
        f'<td align="right" style="font-family:{MONO};font-size:9px;line-height:13px;color:{T4};'
        f'white-space:nowrap;"><span style="color:{BRAND};">&#9650; {e(t["delta"])}</span> '
        f'&middot; vol &#9660; {e(t["volume"])}</td>'
        f'</tr></table>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="margin:14px 0 0;"><tr>{"".join(bar_cells)}</tr></table>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td height="1" bgcolor="{HAIR}" style="height:1px;line-height:1px;font-size:0;'
        f'background:{HAIR};">&nbsp;</td></tr></table>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr>{"".join(label_cells)}</tr></table>'
        f'</td></tr></table>'
        f'{read_line(t["read"])}'
        f'</td></tr>'
    )


def build_copied(d):
    c = d["copied"]
    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:0;padding-bottom:34px;")}">'
        f'{section_label(c["label"])}{h2(c["heading"])}'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="border:1px solid {DIV};">'
        f'<tr><td class="nl-stack" width="360" valign="top" style="padding:20px;">'
        f'<div style="font-family:{MONO};font-size:17px;line-height:24px;color:{T1};'
        f'letter-spacing:-.02em;">{e(c["wallet"])}</div>'
        f'<p style="margin:8px 0 0;font-family:{SANS};font-size:14px;line-height:22px;'
        f'color:{T3};">{e(c["note"])}</p>'
        f'</td>'
        f'<td class="nl-stack nl-stack-pad" valign="top" align="right" style="padding:20px;">'
        f'<div style="font-family:{SANS};font-size:40px;line-height:44px;letter-spacing:-.04em;'
        f'color:{T1};">{e(c["copiers"])}</div>'
        f'<div style="font-family:{MONO};font-size:9px;line-height:13px;letter-spacing:.12em;'
        f'text-transform:uppercase;color:{T4};margin:4px 0 0;">Copiers</div>'
        f'</td></tr></table>'
        f'</td></tr>'
    )


def build_leaderboard(d):
    lb = d["leaderboard"]
    head = (
        f'<tr>'
        f'<td width="26" style="padding:0 0 8px;font-family:{MONO};font-size:9px;'
        f'line-height:13px;letter-spacing:.1em;text-transform:uppercase;color:{T4};">#</td>'
        f'<td style="padding:0 0 8px;font-family:{MONO};font-size:9px;line-height:13px;'
        f'letter-spacing:.1em;text-transform:uppercase;color:{T4};">Wallet</td>'
        f'<td align="right" width="58" style="padding:0 0 8px;font-family:{MONO};font-size:9px;'
        f'line-height:13px;letter-spacing:.1em;text-transform:uppercase;color:{T4};">Copiers</td>'
        f'<td align="right" width="42" style="padding:0 0 8px;font-family:{MONO};font-size:9px;'
        f'line-height:13px;letter-spacing:.1em;text-transform:uppercase;color:{T4};">Last</td>'
        f'<td align="right" width="56" style="padding:0 0 8px;font-family:{MONO};font-size:9px;'
        f'line-height:13px;letter-spacing:.1em;text-transform:uppercase;color:{T4};">Move</td>'
        f'</tr>'
    )
    rows = []
    for r in lb["rows"]:
        rank, wallet, copiers, last, move = r
        if move.strip() == "—":
            move_colour = T4
        elif move.strip().startswith("▲"):
            move_colour = BRAND
        else:
            move_colour = T2
        rows.append(
            f'<tr>'
            f'<td style="padding:9px 0;border-top:1px solid {HAIR};font-family:{MONO};'
            f'font-size:11px;line-height:16px;color:{T4};">{e(rank)}</td>'
            f'<td style="padding:9px 0;border-top:1px solid {HAIR};font-family:{MONO};'
            f'font-size:12px;line-height:16px;color:{T1};">{e(wallet)}</td>'
            f'<td align="right" style="padding:9px 0;border-top:1px solid {HAIR};'
            f'font-family:{MONO};font-size:12px;line-height:16px;color:{T1};">{e(copiers)}</td>'
            f'<td align="right" style="padding:9px 0;border-top:1px solid {HAIR};'
            f'font-family:{MONO};font-size:12px;line-height:16px;color:{T4};">{e(last)}</td>'
            f'<td align="right" style="padding:9px 0;border-top:1px solid {HAIR};'
            f'font-family:{MONO};font-size:11px;line-height:16px;color:{move_colour};">'
            f'{e(move)}</td>'
            f'</tr>'
        )
    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:0;padding-bottom:34px;")}">'
        f'{section_label(lb["label"])}{h2(lb["heading"])}'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'{head}{"".join(rows)}</table>'
        f'</td></tr>'
    )


def build_census(d):
    c = d["census"]
    items = c["items"]
    cells = []
    for i, it in enumerate(items):
        note = ""
        if it.get("note"):
            note = (
                f' <span style="color:{BRAND};font-size:11px;letter-spacing:0;">'
                f'{e(it["note"])}</span>'
            )
        borders = f"border-top:1px solid {HAIR};"
        if i % 2:
            borders += f"border-left:1px solid {HAIR};"
        cells.append(
            f'<td class="nl-stack nl-census-cell" width="50%" valign="top" style="padding:16px 16px 18px;'
            f'{borders}">'
            f'<div style="font-family:{MONO};font-size:9px;line-height:13px;letter-spacing:.1em;'
            f'text-transform:uppercase;color:{T4};margin:0 0 8px;">{e(it["label"])}</div>'
            f'<div style="font-family:{MONO};font-size:19px;line-height:24px;color:{T1};">'
            f'{e(it["value"])}{note}</div></td>'
        )
    rows = []
    for i in range(0, len(cells), 2):
        pair = cells[i:i + 2]
        if len(pair) == 1:
            pair.append('<td class="nl-stack" width="50%" style="padding:0;"></td>')
        rows.append(f'<tr>{"".join(pair)}</tr>')
    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:0;padding-bottom:34px;")}">'
        f'{section_label(c["label"])}{h2(c["heading"])}'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="border:1px solid {DIV};border-top:1px solid {DIV};">{"".join(rows)}</table>'
        f'</td></tr>'
    )


def build_speed(d):
    s = d["speed"]
    size_rows = []
    for r in s["size_rows"]:
        pct = int(r["pct"])
        size_rows.append(
            f'<tr><td width="86" style="padding:7px 0;font-family:{MONO};font-size:10px;'
            f'line-height:14px;color:{T3};white-space:nowrap;">{e(r["label"])}</td>'
            f'<td style="padding:7px 10px;" valign="middle">'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
            f'<tr><td width="{pct}%" height="6" bgcolor="{BRAND}" style="height:6px;'
            f'line-height:6px;font-size:0;background:{BRAND};">&nbsp;</td>'
            f'<td height="6" bgcolor="{TRACK}" style="height:6px;line-height:6px;font-size:0;'
            f'background:{TRACK};">&nbsp;</td></tr></table></td>'
            f'<td align="right" width="40" style="padding:7px 0;font-family:{MONO};font-size:11px;'
            f'line-height:14px;color:{T1};">{pct}%</td></tr>'
        )
    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:0;padding-bottom:34px;")}">'
        f'{section_label(s["label"])}{h2(s["heading"])}'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'<tr>'
        f'<td class="nl-stack nl-speed-left" width="44%" valign="top" style="padding-right:24px;">'
        f'<div style="font-family:{MONO};font-size:9px;line-height:13px;letter-spacing:.12em;'
        f'text-transform:uppercase;color:{T4};">{e(s["value_label"])}</div>'
        f'<div style="font-family:{SANS};font-size:46px;line-height:50px;letter-spacing:-.04em;'
        f'color:{T1};margin:10px 0 8px;">{e(s["value"])}</div>'
        f'<p style="margin:0;font-family:{SANS};font-size:13px;line-height:20px;color:{T3};">'
        f'{e(s["line"])}</p></td>'
        f'<td class="nl-stack nl-stack-pad" width="56%" valign="top">'
        f'<div style="font-family:{MONO};font-size:9px;line-height:13px;letter-spacing:.12em;'
        f'text-transform:uppercase;color:{T4};margin:0 0 6px;">{e(s["size_label"])}</div>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        f'{"".join(size_rows)}</table></td>'
        f'</tr></table>'
        f'{read_line(s["read"])}'
        f'</td></tr>'
    )


def build_tiein(d):
    t = d["tiein"]
    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:0;padding-bottom:34px;")}">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="border:1px solid {DIV};">'
        f'<tr><td class="nl-stack" valign="middle" style="padding:22px 20px;">'
        f'<div style="font-family:{SANS};font-size:21px;line-height:28px;letter-spacing:-.02em;'
        f'color:{T1};margin:0 0 8px;">{e(t["heading"])}</div>'
        f'<p style="margin:0;font-family:{SANS};font-size:14px;line-height:22px;color:{T3};">'
        f'{e(t["line"])}</p></td>'
        f'<td class="nl-stack nl-stack-pad nl-cta" width="196" align="right" valign="middle" '
        f'style="padding:22px 20px;">'
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0">'
        f'<tr><td bgcolor="{T1}" style="background:{T1};border-radius:4px;white-space:nowrap;">'
        f'<a href="{e(t["url"])}" style="display:inline-block;padding:15px 24px;'
        f'font-family:{SANS};font-size:12px;line-height:14px;font-weight:600;'
        f'letter-spacing:.09em;text-transform:uppercase;color:{CANVAS};white-space:nowrap;'
        f'text-decoration:none;">{e(t["cta"])} &rarr;</a></td></tr></table>'
        f'</td></tr></table></td></tr>'
    )


def build_methodology(d):
    return (
        f'<tr><td class="nl-pad" id="methodology" style="{pad("padding-top:0;padding-bottom:30px;")}">'
        f'<div style="font-family:{MONO};font-size:9px;line-height:13px;letter-spacing:.12em;'
        f'text-transform:uppercase;color:{T4};margin:0 0 8px;">Methodology</div>'
        f'<p style="margin:0;font-family:{SANS};font-size:12px;line-height:19px;color:{T3};">'
        f'{e(d["methodology"])}</p></td></tr>'
    )


def build_footer(d):
    f = d["footer"]
    iss = d["issue"]
    link_style = (
        f'font-family:{MONO};font-size:11px;color:{T3};text-decoration:underline;'
    )
    return (
        f'<tr><td class="nl-pad" style="{pad("padding-top:22px;padding-bottom:30px;")}">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'style="border-top:1px solid {DIV};"><tr><td style="padding-top:18px;">'
        f'<div style="font-family:{MONO};font-size:11px;line-height:20px;color:{T4};">'
        f'<a href="{e(iss["url"])}" style="{link_style}">Read on the web</a>'
        f' &nbsp;&middot;&nbsp; '
        f'<a href="{e(iss["archive_url"])}" style="{link_style}">Archive</a>'
        f' &nbsp;&middot;&nbsp; '
        f'<a href="{e(f["unsubscribe_url"])}" style="{link_style}">'
        f'{e(f["unsubscribe_label"])}</a></div>'
        f'<div style="font-family:{MONO};font-size:11px;line-height:20px;color:{T4};'
        f'margin:16px 0 0;">{e(f["tagline"])} &middot; '
        f'<a href="https://www.shieldtx.xyz/" style="{link_style}">shieldtx.xyz</a></div>'
        f'<p style="margin:12px 0 0;font-family:{SANS};font-size:11px;line-height:17px;'
        f'color:{T4};">{e(f["risk"])}</p>'
        f'</td></tr></table></td></tr>'
    )


HEAD_STYLE = """
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
  body{margin:0!important;padding:0!important;width:100%!important}
  a{text-decoration:none}
  @media only screen and (max-width:620px){
    .nl-wrap{width:100%!important;max-width:100%!important}
    .nl-pad{padding-left:20px!important;padding-right:20px!important}
    .nl-herofig{font-size:52px!important;line-height:54px!important}
    .nl-stack{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}
    .nl-stack-pad{padding-left:0!important;padding-right:0!important;padding-top:20px!important}
    .nl-census-cell{border-left:0!important}
    .nl-cta{text-align:center!important}
    .nl-speed-left{padding-right:0!important}
  }
"""


def build(d):
    iss = d["issue"]
    filler = "&#847;&zwnj;&nbsp;" * 40
    parts = [
        build_topbar(d),
        rule(),
        build_masthead(d),
        build_hero(d),
        rule(),
        build_trend(d),
        rule(),
        build_copied(d),
        rule(),
        build_leaderboard(d),
        rule(),
        build_census(d),
        rule(),
        build_speed(d),
        rule(),
        build_tiein(d),
        build_methodology(d),
        build_footer(d),
    ]
    body = "\n".join(parts)
    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="dark light" />
<meta name="supported-color-schemes" content="dark light" />
<meta name="robots" content="noindex,nofollow" />
<meta property="og:image" content="https://shieldtx.xyz/assets/og-image-v2.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/jpeg" />
<title>Issue {e(iss["number_label"])} &middot; {e(iss["title"])} &middot; ShieldTX</title>
<style>{HEAD_STYLE}</style>
<!--[if mso]>
<style>body,table,td,p,a,h1,h2,div{{font-family:Arial,Helvetica,sans-serif!important}}</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:{CANVAS};">
<div style="display:none;font-size:1px;color:{CANVAS};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{e(iss["preheader"])}{filler}</div>
<div role="article" aria-roledescription="email" aria-label="Issue {e(iss["number_label"])} of the ShieldTX weekly report" lang="en" dir="ltr" style="background:{CANVAS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{CANVAS}" style="background:{CANVAS};">
<tr><td align="center" style="padding:0;">
<table role="presentation" class="nl-wrap" width="{W}" cellpadding="0" cellspacing="0" border="0" bgcolor="{CANVAS}" style="width:{W}px;max-width:{W}px;background:{CANVAS};">
{body}
</table>
</td></tr>
</table>
</div>
</body>
</html>
"""


def main(argv):
    issue_dir = Path(argv[1] if len(argv) > 1 else "newsletter/issue-001")
    data = json.loads((issue_dir / "issue.json").read_text(encoding="utf-8"))
    out = build(data)
    target = issue_dir / "email.html"
    target.write_text(out, encoding="utf-8")
    print(f"wrote {target} ({len(out.encode()):,} bytes)")


if __name__ == "__main__":
    main(sys.argv)
