#!/usr/bin/env python3
"""Build site/ from DOORS. One source of truth for every page.

    python3 build.py && python3 scripts/deploy.py

Direction: Plan View (chosen by Aidan 2026-10-05 from three live directions).
Blueprint ground, white linework, one amber. The landing is a plan drawing of an
outbound dock; the ten dock doors on it are the ten ideas. Each door page is a paper
sheet that opens on its own figure, drawn for that door's mechanism and nothing else.

Vocabulary follows research/vernacular.md: the building, the dock, the floor; doors,
lanes, chutes, cases and pieces; cutoff and "missed the truck"; cube; live load vs
drop-and-hook; deadhead and all-in RPM. Never "associate", "facility", "visibility",
"dashboard", "optimize".

Every sentence passes one test before it ships: it is equally true at any large
parcel network. Nothing here names a company, a building, a system, a tuned
constant, a dollar figure or a colleague. The build asserts a banned-word list.
"""
from __future__ import annotations

import html
import random
import re
from pathlib import Path

SITE = Path(__file__).resolve().parent / "site"
TITLE = "Run Sheet"
TAGLINE = "Ten ideas for running a dock, a DC or a fleet, drawn to scale. Each one is a lesson from the biggest parcel network on earth, rewritten for everyone who isn't it."
AUDIENCE = "For the people who own the outbound wall: the ops manager graded on cost per case and on-time ship, the shift lead graded on trailers out by cutoff and the crew's rate, the owner-dispatcher graded on all-in rate per mile after deadhead."

# ----------------------------------------------------------------------------
# Figures: one per door, hand-authored SVG on the paper sheet
# ----------------------------------------------------------------------------

INK = "#0f2f63"
AMBER = "#ffb627"
RED = "#c0392b"
PALE = "#b9cdef"
MONO = "IBM Plex Mono, monospace"
SANS = "Archivo, sans-serif"


def defs(mid: str) -> str:
    return f'<defs><marker id="{mid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="{INK}"/></marker></defs>'


def t(x, y, s, size=11, anchor="middle", fill=INK, font=MONO, weight="normal"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" fill="{fill}" font-family="{font}" font-weight="{weight}">{html.escape(s)}</text>'


def fig(svg: str, caption: str, label: str, vb: str) -> str:
    return (f'<figure class="fig"><svg viewBox="{vb}" role="img" aria-label="{html.escape(label)}">{svg}</svg>'
            f'<figcaption>{html.escape(caption)}</figcaption></figure>')


def fig_signal() -> str:
    s = defs("a1")
    s += f'<rect x="20" y="30" width="110" height="54" rx="3" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    s += f'<circle cx="45" cy="57" r="9" fill="{AMBER}" stroke="{INK}" stroke-width="2"/>'
    s += t(90, 51, "lane-full", 12) + t(90, 69, "light", 12)
    s += f'<rect x="20" y="116" width="110" height="54" rx="3" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    s += f'<rect x="36" y="130" width="18" height="26" rx="3" fill="none" stroke="{INK}" stroke-width="2"/>'
    s += t(90, 137, "RF gun", 12) + t(90, 155, "scans", 12)
    s += f'<path d="M130 57 L190 95" stroke="{INK}" stroke-width="2" fill="none" marker-end="url(#a1)"/>'
    s += f'<path d="M130 143 L190 105" stroke="{INK}" stroke-width="2" fill="none" marker-end="url(#a1)"/>'
    s += f'<rect x="192" y="80" width="70" height="40" rx="20" fill="{AMBER}" stroke="{INK}" stroke-width="2"/>'
    s += t(227, 104, "JOIN", 11, "middle", INK, MONO, "bold")
    s += f'<path d="M262 100 L312 100" stroke="{INK}" stroke-width="2" marker-end="url(#a1)"/>'
    s += f'<rect x="312" y="72" width="100" height="56" rx="3" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    s += t(362, 95, "“door 7 is", 12) + t(362, 112, "backed up”", 12)
    s += f'<path d="M30 200 H400" stroke="{PALE}" stroke-width="1" stroke-dasharray="3 3"/>'
    s += f'<path d="M60 226 C 120 204, 300 204, 360 226 C 300 248, 120 248, 60 226 Z" fill="none" stroke="{RED}" stroke-width="2" stroke-dasharray="6 4"/>'
    s += f'<circle cx="60" cy="226" r="6" fill="{RED}"/>'
    s += t(210, 268, "the lead walking the wall all shift: a person polling the same two signals", 11, "middle", RED, SANS)
    return fig(s, "Two signals the building already gives off, joined once, replace a ten-hour walk.",
               "A lane-full light and RF scans joined into one message to the nearest free person; below, the loop the shift lead walks to do the same job by hand.", "0 0 420 280")


def fig_deadend_pair() -> str:
    a = defs("a2")
    a += f'<rect x="20" y="16" width="280" height="44" rx="22" fill="none" stroke="{INK}" stroke-width="2"/>' + t(160, 43, "SORTER")
    a += f'<path d="M160 60V98" stroke="{INK}" stroke-width="2" marker-end="url(#a2)"/>'
    a += f'<rect x="138" y="100" width="44" height="54" fill="{AMBER}" stroke="{INK}" stroke-width="2"/>' + t(160, 132, "FULL", 12, "middle", INK, MONO, "bold")
    a += f'<path d="M182 128 Q238 128 238 60" stroke="{RED}" stroke-width="2" fill="none" stroke-dasharray="5 4" marker-end="url(#a2)"/>'
    a += t(336, 98, "recirc, then", 11, "end", RED) + t(336, 114, "problem solve", 11, "end", RED)
    a += t(160, 176, "one destination → one chute", 11, "middle", INK, SANS, "600")
    b = f'<rect x="20" y="16" width="280" height="44" rx="22" fill="none" stroke="{INK}" stroke-width="2"/>' + t(160, 43, "SORTER")
    b += f'<path d="M50 60V96M95 60V96M140 60V96M185 60V96M230 60V96M275 60V96" stroke="{INK}" stroke-width="2" fill="none"/>'
    for i, x in enumerate((36, 81, 126, 171, 216, 261)):
        b += f'<rect x="{x}" y="98" width="28" height="48" fill="{AMBER if i == 2 else "#fff"}" stroke="{INK}" stroke-width="2"/>'
    b += t(140, 126, "FULL", 8.5, "middle", INK, MONO, "bold")
    b += t(160, 176, "one destination → six chutes", 11, "middle", INK, SANS, "600")
    return ('<div class="two">'
            + fig(a, "A dead end. Only a body clears it.", "One destination mapped to one chute; when it blocks the freight recirculates and drops to problem solve.", "0 0 340 185")
            + fig(b, "A mirror. The light is on. Nothing is wrong yet.", "One destination mirrored across six chutes; one blocks, the sorter uses the other five.", "0 0 340 185")
            + '</div>')


def fig_three_full() -> str:
    s = ""
    s += f'<path d="M40 20 L40 110 L70 150 L110 150 L140 110 L140 20" fill="none" stroke="{INK}" stroke-width="2"/>'
    s += f'<line x1="44" y1="60" x2="136" y2="60" stroke="{RED}" stroke-width="1.5" stroke-dasharray="3 3"/>'
    s += f'<circle cx="40" cy="60" r="5" fill="{AMBER}" stroke="{INK}" stroke-width="1.5"/>'
    s += f'<rect x="62" y="38" width="56" height="30" fill="#fff" stroke="{INK}" stroke-width="2" transform="rotate(-18 90 53)"/>'
    s += f'<rect x="58" y="152" width="64" height="60" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    s += f'<rect x="60" y="184" width="60" height="26" fill="{PALE}"/>'
    s += t(90, 232, "sortation full", 13, "middle", INK, SANS, "600") + t(90, 247, "beam blocked,", 11) + t(90, 261, "box half empty", 11)
    s += f'<path d="M200 20 L200 110 L230 150 L270 150 L300 110 L300 20" fill="none" stroke="{INK}" stroke-width="2"/>'
    s += f'<line x1="204" y1="60" x2="296" y2="60" stroke="{PALE}" stroke-width="1.5" stroke-dasharray="3 3"/>'
    s += f'<circle cx="200" cy="60" r="5" fill="#fff" stroke="{INK}" stroke-width="1.5"/>'
    s += f'<rect x="218" y="152" width="64" height="60" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    s += f'<rect x="220" y="154" width="60" height="56" fill="{PALE}"/>'
    s += t(250, 232, "container full", 13, "middle", INK, SANS, "600") + t(250, 247, "no light,", 11) + t(250, 261, "no room left", 11)
    s += f'<rect x="350" y="80" width="130" height="70" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    s += f'<rect x="352" y="112" width="60" height="36" fill="{PALE}"/><rect x="414" y="126" width="30" height="22" fill="{PALE}"/>'
    s += f'<circle cx="372" cy="158" r="7" fill="none" stroke="{INK}" stroke-width="2"/><circle cx="460" cy="158" r="7" fill="none" stroke="{INK}" stroke-width="2"/>'
    s += t(415, 102, "air", 13, "middle", RED, MONO, "bold")
    s += t(415, 232, "trailer cube", 13, "middle", INK, SANS, "600") + t(415, 247, "closed early,", 11) + t(415, 261, "shipped air", 11)
    return fig(s, "One photo-eye, three questions. Decide which one your action serves.",
               "Three panels: a chute whose beam is blocked by a wedged box over a half-empty gaylord; a gaylord truly full with the beam clear; a trailer leaving with empty cube.", "0 0 500 272")


def fig_slammed() -> str:
    s = defs("a4")
    s += f'<path d="M40 180 H460 M40 180 V20" stroke="{INK}" stroke-width="1.5" fill="none"/>'
    s += t(250, 198, "minutes →", 12) + t(14, 100, "work", 12)
    s += f'<rect x="300" y="21" width="80" height="158" fill="{PALE}" opacity=".45"/><rect x="380" y="21" width="80" height="158" fill="{PALE}" opacity=".25"/>'
    s += t(340, 36, "next 15", 11) + t(420, 36, "15–30", 11)
    s += f'<path d="M40 165 L120 160 L180 158 L230 150 L260 120 L290 70 L320 50 L360 45 L400 60 L460 65" fill="none" stroke="{INK}" stroke-width="2"/>'
    s += t(292, 62, "inbound to the lane", 11, "end", INK, SANS)
    s += f'<path d="M40 170 L230 168 L260 150 L290 110 L320 75 L340 40" fill="none" stroke="{AMBER}" stroke-width="3"/>'
    s += t(352, 88, "freight sitting on it", 11, "start", INK, SANS)
    s += f'<line x1="300" y1="20" x2="300" y2="180" stroke="{RED}" stroke-width="1.5" stroke-dasharray="4 3"/>'
    s += f'<circle cx="300" cy="94" r="6" fill="{AMBER}" stroke="{INK}" stroke-width="1.5"/>'
    s += t(300, 14, "light trips", 11, "middle", RED)
    s += f'<line x1="345" y1="20" x2="345" y2="180" stroke="{RED}" stroke-width="1.5" stroke-dasharray="4 3"/>'
    s += t(345, 190, "help arrives", 11, "middle", RED)
    s += f'<path d="M232 150 L258 123" stroke="{INK}" stroke-width="1" fill="none" marker-end="url(#a4)"/>'
    s += t(228, 146, "looked fine here", 11, "end", INK, SANS)
    return fig(s, "The light is the end state. The inbound that caused it was visible fifteen minutes earlier.",
               "Line chart: inbound to a lane triples over ten minutes; freight on the lane lags then climbs; the lane-full light trips at the peak and help arrives later still; shaded bands show the 15 and 30 minute forecast windows.", "0 0 480 204")


def fig_ghosts() -> str:
    s = ""
    s += f'<path d="M40 170 H460 M40 170 V20" stroke="{INK}" stroke-width="1.5" fill="none"/>'
    s += t(250, 192, "how long a piece sits on the lane →", 12) + t(20, 14, "count", 11, "start")
    bars = [150, 120, 70, 42, 26, 16, 10, 7, 5, 4, 3, 2, 2, 1, 1, 1, 1, 1, 1, 1]
    for i, hgt in enumerate(bars):
        x = 44 + i * 20
        s += f'<rect x="{x}" y="{170 - hgt}" width="16" height="{hgt}" fill="{PALE if i < 8 else "#fff"}" stroke="{INK}" stroke-width="1"/>'
    s += f'<rect x="204" y="21" width="256" height="149" fill="{RED}" opacity=".07"/>'
    s += f'<line x1="204" y1="20" x2="204" y2="170" stroke="{INK}" stroke-width="2"/>'
    s += t(204, 14, "99th percentile of real work", 11, "middle", INK, MONO, "bold")
    s += f'<line x1="440" y1="20" x2="440" y2="170" stroke="{RED}" stroke-width="2" stroke-dasharray="5 4"/>'
    s += t(436, 38, "the round number", 11, "end", RED) + t(436, 54, "in the config", 11, "end", RED)
    s += t(330, 100, "ghosts the system", 12, "middle", RED, SANS, "600") + t(330, 114, "counts as work", 12, "middle", RED, SANS, "600")
    return fig(s, "Set the cutoff where real work actually ends. Everything between that and the round number is a ghost.",
               "Histogram of dwell time with a long tail; a solid line at the 99th percentile of real work, a dashed red line far to the right at an unmeasured round-number cutoff; the region between is shaded as ghosts.", "0 0 480 200")


def fig_size_it() -> str:
    s = ""
    ax = 230
    s += f'<path d="M{ax} 20 V200" stroke="{INK}" stroke-width="1.5"/>'
    rows = [("trailer reposition", 180, True), ("return an empty", 120, True), ("bobtail", -36, False), ("pool swap", -70, False)]
    for i, (lab, w, pos) in enumerate(rows):
        y = 34 + i * 42
        s += t(12, y + 16, lab, 12, "start")
        if pos:
            s += f'<rect x="{ax}" y="{y}" width="{w}" height="24" fill="{AMBER}" stroke="{INK}" stroke-width="1.5"/>'
            s += t(ax + 8, y + 16, "costs more", 11, "start", INK, SANS, "600")
        else:
            s += f'<rect x="{ax + w}" y="{y}" width="{-w}" height="24" fill="#fff" stroke="{INK}" stroke-width="1.5"/>'
            s += t(ax + 8, y + 16, "cheaper", 11, "start", INK, SANS, "600")
    s += t(ax, 222, "tour cost with this empty leg − tour cost without it", 11, "middle", INK, SANS)
    return fig(s, "Split deadhead by cause, then compare tours with the cause against tours without. Some causes cost money. Some come with cheaper tours and are not the target.",
               "Horizontal bar chart of cost delta by empty-movement cause: trailer repositioning and returning empties are positive and large; bobtail and pool swaps are negative.", "0 0 480 232")


def fig_touches() -> str:
    s = defs("a7")

    def node(x, y, lab, fill="#fff"):
        return f'<rect x="{x - 26}" y="{y - 14}" width="52" height="28" rx="3" fill="{fill}" stroke="{INK}" stroke-width="2"/>' + t(x, y + 4, lab, 11)

    def arrow(x1, y1, x2, y2, lab=""):
        o = f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{INK}" stroke-width="1.5" fill="none" marker-end="url(#a7)"/>'
        if lab:
            o += t((x1 + x2) / 2, (y1 + y2) / 2 - 6, lab, 8.5, "middle", RED)
        return o
    s += t(20, 24, "national: fill from wherever still has it", 12, "start", INK, SANS, "600")
    s += node(50, 60, "DC far") + arrow(76, 60, 120, 60, "truck") + node(150, 60, "hub") + arrow(176, 60, 220, 60, "sort") + node(250, 60, "hub") + arrow(276, 60, 320, 60, "sort") + node(350, 60, "station") + arrow(376, 60, 420, 60, "van") + node(450, 60, "door", AMBER)
    s += t(470, 90, "5 touches · 4 legs", 12, "end", RED, MONO, "bold")
    s += t(20, 134, "regional: the region serves itself first", 12, "start", INK, SANS, "600")
    s += node(250, 170, "DC near") + arrow(276, 170, 320, 170, "full truck") + node(350, 170, "station") + arrow(376, 170, 420, 170, "van") + node(450, 170, "door", AMBER)
    s += t(470, 200, "3 touches · 2 legs", 12, "end", INK, MONO, "bold")
    return fig(s, "Every hub is a sort, a dwell, a trailer and a chance to roll the freight. Touches and miles fall together because they are the same thing.",
               "Two routes for the same order: a national path through two hubs with five touches, and a regional path from a nearby DC with three.", "0 0 480 210")


def fig_legible() -> str:
    s = ""
    s += f'<rect x="20" y="20" width="200" height="86" rx="6" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    s += t(30, 42, "MOVE TO", 11, "start") + t(30, 66, "A01-10108", 16, "start", INK, MONO, "bold") + t(30, 90, "the controller's address", 11, "start", RED)
    s += f'<rect x="260" y="20" width="200" height="86" rx="6" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    s += t(270, 42, "MOVE TO", 11, "start") + t(270, 66, "Door 8, Chute 1", 16, "start", INK, MONO, "bold") + t(270, 90, "what is painted on the floor", 11, "start", INK)
    s += t(20, 140, "share of messages followed", 12, "start", INK, SANS, "600")
    s += f'<rect x="20" y="150" width="200" height="18" fill="none" stroke="{INK}" stroke-width="1.5"/><rect x="20" y="150" width="60" height="18" fill="{PALE}"/>'
    s += f'<rect x="260" y="150" width="200" height="18" fill="none" stroke="{INK}" stroke-width="1.5"/><rect x="260" y="150" width="116" height="18" fill="{AMBER}"/>'
    s += t(120, 186, "before", 12) + t(360, 186, "after the rename", 12)
    return fig(s, "Same rule, same move, same floor. The only thing that changed was the name on the gun.",
               "Two RF-gun messages side by side: one naming a controller address, one naming the door and chute painted on the floor; below, adherence bars where the second is nearly twice the first.", "0 0 480 196")


def fig_ab() -> str:
    s = ""
    rnd = random.Random(7)
    s += t(20, 20, "one building · one week · the coin flips every hour", 12, "start", INK, SANS, "600")
    for d in range(7):
        for h in range(24):
            on = rnd.random() < 0.5
            s += f'<rect x="{20 + h * 18}" y="{30 + d * 16}" width="16" height="14" fill="{AMBER if on else "#fff"}" stroke="{INK}" stroke-width=".8"/>'
    s += t(20, 160, "■ rule on", 11, "start", INK) + t(100, 160, "□ rule off", 11, "start", INK)
    s += t(20, 190, "rolled freight, per thousand pieces", 12, "start", INK, SANS, "600")
    s += f'<rect x="20" y="200" width="220" height="16" fill="#fff" stroke="{INK}" stroke-width="1.5"/>' + t(248, 213, "off", 12, "start")
    s += f'<rect x="20" y="222" width="160" height="16" fill="{AMBER}" stroke="{INK}" stroke-width="1.5"/>' + t(248, 235, "on", 12, "start")
    s += t(300, 208, "and the crew you", 11, "start", RED) + t(300, 224, "pulled bodies from?", 11, "start", RED) + t(300, 240, "measure them too", 11, "start", RED)
    return fig(s, "Flip it by the hour so weather, volume and the manager fall out. Then read the metric you care about and the ones next to it.",
               "A 7 by 24 grid of hours randomly colored on or off, and two outcome bars comparing on hours to off hours, with a note to measure the neighboring crew.", "0 0 460 250")


def fig_stand() -> str:
    s = ""
    s += t(20, 24, "the model believes", 12, "start", INK, SANS, "600") + t(240, 24, "building A", 12, "middle", INK, SANS, "600") + t(360, 24, "building B", 12, "middle", INK, SANS, "600")
    rows = [("every piece is scanned off the lane", "✓", "✗  scans off, rate 4× higher"),
            ("the stager stages to the staging strip", "✓", "✗  they load straight to the trailer"),
            ("one container type per lane", "✓", "✗  shuttles with holes cut in them"),
            ("a drop from the chute is harmless", "✓", "✗  big boxes break, so no direct drop")]
    for i, (claim, a, b) in enumerate(rows):
        y = 52 + i * 34
        s += f'<line x1="20" y1="{y + 12}" x2="460" y2="{y + 12}" stroke="{PALE}" stroke-width="1"/>'
        s += t(20, y + 4, claim, 11, "start", INK, SANS)
        s += t(240, y + 4, a, 12, "middle", INK, MONO, "bold")
        s += t(300, y + 4, b, 11, "start", RED, SANS)
    s += t(20, 200, "same blueprint, same conveyor, opposite process. none of it is in a query.", 11, "start", INK, SANS, "600")
    return fig(s, "A model is a list of claims about a floor. Two identical buildings will disagree with it in different places.",
               "A table of four claims the model makes about a floor; building A matches all four, building B contradicts all four for locally sensible reasons.", "0 0 480 210")


FIGS = {"signal": fig_signal, "deadend": fig_deadend_pair, "three": fig_three_full, "slammed": fig_slammed,
        "ghosts": fig_ghosts, "size": fig_size_it, "touches": fig_touches, "legible": fig_legible, "ab": fig_ab, "stand": fig_stand}

# ----------------------------------------------------------------------------
# The doors, in the floor's words
# ----------------------------------------------------------------------------

DOORS = [
    dict(
        slug="the-signal-is-already-there", group="On the floor", fig="signal",
        title="The signal is already there.",
        line="Before you buy another system, join two signals your building already gives off.",
        floor="""Walk your outbound wall for a shift and watch the lead. They walk the doors looking
for one thing: a lane backed up with freight and nobody on it. When they find one they get
on the headset and send a body over. They do this for ten hours. Now look above the lane.
There is a light that comes on when the lane is full. There is an RF gun in every hand that
says where that person is and what their rate is. The building already knows both halves of
the lead's job. Nobody has joined them.""",
        why="""Most of what a building needs to run itself already exists as exhaust. Photo-eyes on
the conveyor, scan events on the guns, timestamps on every move, the labor plan on the board.
Each lives in a different system owned by a different vendor, and each reads its own. The gap
is never the sensor. The gap is the join. A join costs a week. Another WMS module costs a
year, and it still needs the join.""",
        monday=[
            "List every signal the floor gives off: lane lights, photo-eyes, RF scans, door sensors, yard sensors, the labor plan. Write down who reads each one today.",
            "Find the human loop. Which signal does a person walk around checking? That is your first join.",
            "Join it to one other signal you already have and send one message to one gun. Measure what the message changed before you build anything else.",
        ],
        rule="Never buy a system to produce a signal you already give off.",
        rule_why="The vendor sells the sensor and the screen. What you need is the join, and only you can do that, because only you own both sides.",
        trap="""The signal you can get is never quite the thing you want to know. A lane-full light
says a beam is blocked, not that the lane is full. A scan says where someone was, not where
they are. Treat every signal as a proxy and measure how far it sits from the truth. See
door three and door five.""",
    ),
    dict(
        slug="a-lane-only-needs-help-when-it-has-no-way-out", group="On the floor", fig="deadend", widget="mirrored",
        title="A lane only needs help when it has no way out.",
        line="Sending a body to a lit lane pays when that lane is the only place the freight can go. Where it can route around, the light is noise.",
        floor="""Two lanes lit. On the first, every piece for that destination has to come down this
one chute. When it blocks, the sorter circles the freight, then kicks it to problem solve,
and most of it misses the truck. Rolled. On the second lane, the same destination is spread
across six chutes. When one blocks, the sorter uses the other five. The light is on. Nothing
is actually wrong.""",
        why="""A full buffer only hurts when it is the only buffer. If a destination maps to one
chute, that chute is a dead end and a person is the only way out. If the destination is
mirrored across many chutes, congestion routes around itself and your move is solving a
problem the machine already solved. The same staffing rule, the same light and the same
test can be decisive on one sorter and inert on the next. The difference is not the people
or the software. It is how many ways out the lane has.""",
        monday=[
            "For every chute, count how many other chutes can take its freight. One is a dead end. Five is a mirror.",
            "Rank your dead ends by volume. That list is where moving a body pays.",
            "Stop chasing lights on mirrored lanes. Chase the set when the whole set is lit.",
        ],
        rule="Spend labor on dead ends. Let mirrors absorb themselves.",
        rule_why="A move costs a person walking the building and leaving the work they had. Pay it only where it buys something.",
        trap="""Mirrored lanes still fail, but they fail together and later. When the whole set fills,
the recirc is worse because the machine kept everything moving right up to the edge.
Watch the set, not the lane.""",
    ),
    dict(
        slug="full-is-three-different-things", group="On the floor", fig="three",
        title="Full is three different things.",
        line="A photo-eye says blocked. The gaylord might be half empty. The trailer cube is a third question.",
        floor="""A big box wedges at the top of the chute and trips the beam. The light goes on.
The gaylord under it is half empty. On the next lane a gaylord really is full to the brim
and the light is off because the beam sits above the pile. Down the row, the stager sees a
light, closes the gaylord early and wheels it to the door. The trailer leaves with air in it.""",
        why="""There are three fullnesses and they pull against each other. Sortation full: will
the sorter keep sending freight here. Container full: is there room left in the box. Trailer
full: did you ship cardboard or air. One photo-eye measures the first and gets used for all
three. A light that means "stop sending" on a palletize lane means "come close me" on a
direct-drop lane, and the count of pieces that trips the beam differs wildly between a shoe
sorter, a crossbelt and a direct-drop chute. Treat the three as separate numbers and decide
which one each action serves. Sometimes the right move on a lit lane is to shift pieces, not
to close.""",
        monday=[
            "For each lane, log how many pieces were on it each time the light came on. The spread tells you how much the light is worth there.",
            "Compare the count at the light with the count at close. The gap is your early-close loss, and it shows up as air in the trailer.",
            "Put trailer cube next to lane lights on the same board. When one goes up and the other goes down, you have found the trade.",
        ],
        rule="Name which fullness you mean before you act on a light.",
        rule_why="Closing on sortation-full to protect the sorter is a linehaul cost paid later, on a truck nobody on the dock will see.",
        trap="""The count that trips the beam depends on who is standing there. A body shifting
pieces lets more pile up before the beam blocks. Your threshold moves with your staffing,
which is the thing you were trying to decide.""",
    ),
    dict(
        slug="reaction-is-late-by-construction", group="On the floor", fig="slammed", widget="headcount",
        title="Reaction is late by construction.",
        line="Lanes don't fill up. They get slammed. Staff to what's inbound, and set relative targets your floor can actually hit.",
        floor="""One body on a lane, handling a piece a minute, nothing recircing. Then the inbound
triples. Half the freight starts circling. By the time two more people get there the lane
is a wall and nine in ten pieces are missing the divert. Pull the data and the lane looked
fine five minutes before. The lanes that end up with the most help had the least work right
before it happened. It is not slow accumulation you can watch coming. It is a sudden arrival
rate against a lane that looked healthy.""",
        why="""Any rule that fires on a full light is already late, because full is the end state.
The information that would have helped was upstream: what got labeled in the last fifteen
minutes and where it is bound. So compute headcount with units on it. Work on the lane
divided by a measured rate, plus what is inbound in the next quarter hour, plus the quarter
after that, weighting the present most because it is the only part you are sure of. Then
set a relative target, not an absolute one. Do not try to staff every zone to its number,
which the floor can rarely do. Make sure no lower-priority zone has more bodies than a
higher-priority one. A target you can always reach beats an optimum you never can.""",
        monday=[
            "Measure the real rate per role off your own floor. Do not use the engineered standard. It varies by building and shift.",
            "Pull inbound by lane for the next 15 and 30 minutes from your label or induct data. If you have no forecast, what has been labeled and not yet sorted is one.",
            "Rank zones by heads needed against heads present. Move one body from the lowest-ranked zone with the most people. Repeat.",
        ],
        rule="Weight the present most, forecast the near future, and balance relatively.",
        rule_why="The present is certain, the forecast is not, and an absolute plan the floor cannot execute trains people to ignore the plan.",
        trap="""Labor is one pool. Every body you move toward one crew is a body you moved away from
another, and the far side of a move is where the next miss comes from. Measure the crew you
pulled from as carefully as the one you fed.""",
    ),
    dict(
        slug="measure-the-constant-before-you-build-the-model", group="On the floor", fig="ghosts",
        title="Measure the constant before you build the model.",
        line="Somewhere in your WMS a round number nobody measured is deciding what is real.",
        floor="""Someone pulls a piece off a lane without scanning it. The piece leaves the building.
In the system it stays on the lane. Do that a few hundred times a day and your system
believes a lane is full of work when it is empty, and it will confidently send someone
there. The defense was a cutoff: anything sitting too long is assumed gone. The cutoff was
a round number in a config file. Nobody had measured it. It was just round.""",
        why="""Ghosts are not a volume problem or an equipment problem. Two buildings with the same
layout and the same conveyor differ by how often their people scan, and a small difference in
scan compliance turns into a large error in what the system thinks is on the floor. Every
model you build on top inherits the error. The fix is not a better model. Go measure the
actual distribution of how long real work sits, find the tail, and set the cutoff there.
You will give up a small slice of real work to evict every ghost, and that trade is
obviously right once you can see both sides.""",
        monday=[
            "Measure scan compliance per lane: pieces that left with a scan over pieces that left at all.",
            "Measure how long real work actually sits before it is handled, and find the 99th percentile. That is your cutoff, not a round number.",
            "Open every config file your decisions depend on and list the constants. Ask of each: who measured this, and when?",
        ],
        rule="No constant ships unmeasured. Every threshold carries the date and the data that set it.",
        rule_why="A round number looks like a decision. It is usually a guess that survived because nothing downstream could audit it.",
        trap="""Compliance is a habit, not a property of the building, so it drifts. A cutoff measured
once is a cutoff that will be wrong again. Re-measure on a schedule, or make the cutoff
compute itself from the current distribution.""",
    ),
    dict(
        slug="size-it-before-you-build-it", group="Between buildings", fig="size", widget="deadhead",
        title="Size it before you build it.",
        line="Put a price on an empty mile first. Let the size of the answer decide whether there is a project.",
        floor="""Someone wants to build a system to cut deadhead. Before anyone draws a box, pull
every tour for six weeks. Split the miles into loaded and empty. Put a price on an empty
mile. Then split the empty miles by why they happened: repositioning a trailer, returning
an empty, a driver running bobtail, a pool swap. For each cause, compare the cost of tours
that had it against tours that did not. Some causes cost money. Some, it turns out, come
with cheaper tours. Now you know where the money is, how much there is, and whether a
dispatcher or a planning system put it there.""",
        why="""Sizing before designing sounds obvious and almost nobody does it, because the design
is the fun part and the sizing might say no. But the sizing is also where the real finding
hides. In a one-way network, where freight flows out but rarely back, deadhead is the base
case, not a mistake. The trade associations put industry deadhead around one mile in six.
When the empty legs are planned by several systems that each solve their own piece and never
see each other, the long ones are not a driver problem. They are a seam between planners.
Half of doing this well is being willing to come back and say the number is small.""",
        monday=[
            "For six weeks of tours, compute loaded miles, empty miles and invoiced linehaul. Divide. That is your price per empty mile.",
            "Bucket empty miles by cause and by which planner or dispatcher created them. Compare tour cost with and without each cause.",
            "Pull the long tail back to your own average, not to zero. Price that. If it is small, say so and stop.",
        ],
        rule="No design doc before a sizing doc. The sizing doc may kill the project, and that is the point.",
        rule_why="A project that cannot survive its own arithmetic should die on paper, where it costs a week, not in production, where it costs a year.",
        trap="""The finding will usually indict the planning systems, not the people running them.
Say that plainly. It is neither an accusation nor an excuse, and the moment it lands as
either, nobody will fix the seam.""",
    ),
    dict(
        slug="fewer-touches-not-faster-touches", group="Between buildings", fig="touches",
        title="Fewer touches, not faster touches.",
        line="Every handoff is a place to roll the freight and lose a day. Keep supply and demand in the same ring.",
        floor="""A customer three towns over orders a thing you have in stock. It ships from a DC
four states away because that is where the system found it, rides to a hub, gets sorted,
rides to another hub, gets sorted again, and makes the promise by the skin of its teeth
with five sets of hands on it. The same thing stocked nearby would have been one truck and
two touches. Nobody made a bad call. The network just fills from wherever it still has
capacity.""",
        why="""A national network fills orders from the nearest building until it cannot, and
then from wherever. Each extra hub is a sort, a dwell, a trailer and a chance to miss.
Carving the network into regions that each hold the selection their customers actually buy,
and letting each region serve itself first, cuts touches and miles together, because they
are the same thing seen from two sides. It also fills trucks: when most of a region's volume
comes from a few buildings, the lanes from those buildings to the delivery stations run
thick and direct. Thick lanes let you put the cutoff on the pallet instead of on the lane,
which lets cutoffs move later. Speed and cost stop being a trade and start moving together.""",
        monday=[
            "Count touches per piece from pick to door. Draw the distribution. The long tail is your cost.",
            "Measure the share of orders filled from inside the customer's region. Every point you add is miles and hands removed.",
            "Find the lanes that would run full if demand were served locally. Those are the lanes to make direct.",
        ],
        rule="Place inventory where it will be bought, and let the region serve itself first.",
        rule_why="Touches are the one cost that compounds through every downstream stage, and placement is the one lever upstream of all of them.",
        trap="""Regionalizing is mostly a software setting, which means it is mostly an inventory
problem. A region that does not hold the right selection serves itself badly and ships
nationally anyway. The hard work is forecasting demand by place, not drawing the map.""",
    ),
    dict(
        slug="legibility-beats-intelligence", group="How to work", fig="legible",
        title="Legibility beats intelligence.",
        line="The best algorithm you will ever ship loses to a plan your floor can actually follow.",
        floor="""A system sends a body a message: go to station A01-10108. They look at the gun,
look at the floor and keep working. The floor is painted with door numbers. The message used
the controller's address. Over one weekend the names in the messages were changed to match
the paint. The share of messages people followed nearly doubled the next day. Three
algorithms, a forecast integration and a year of tuning had not moved that number as much.""",
        why="""A recommendation nobody acts on has an effect of exactly zero, no matter how right it
was. Adherence multiplies everything else. The person reading the gun is mid-shift, mid-task,
with a case in the other hand. They will follow an instruction that costs nothing to decode
and ignore one that costs a minute. Name things the way the floor names them. Say where to
go in the words painted on the wall. Then measure adherence before you measure accuracy,
because accuracy you cannot cash is not accuracy.""",
        monday=[
            "Pull ten messages your systems sent to the floor this week. Walk to each place named. Could you find it from the message alone?",
            "Measure adherence: messages followed over messages sent, by shift and by crew.",
            "Rename before you retune. If adherence is under half, the algorithm is not your problem yet.",
        ],
        rule="Every instruction to a person uses the floor's own names and fits on one screen.",
        rule_why="The reader has a case in one hand and the system does not. Spend the system's effort translating, never the reader's.",
        trap="""A jump in adherence over one day is one day. Keep the caveat attached. A rename that
doubled adherence may also have arrived with a leadership visit, a slower shift and a new
manager. Measure it again next week.""",
    ),
    dict(
        slug="test-it-like-a-drug", group="How to work", fig="ab",
        title="Test it like a drug.",
        line="Randomize on and off by the hour. Measure the neighbors. Keep the nulls.",
        floor="""A new staffing rule goes live at one building. Every hour a coin is flipped: rule
on, rule off. After four weeks the on hours and off hours are compared on the one metric
that counts, trailers out by cutoff, and on everything next to it. The rule works. It goes
to two more buildings and holds. Then it goes everywhere. Later the same rule is tried on a
different kind of floor, with the same design, and after forty-odd tests across five
buildings it does nothing. That result is written down and kept.""",
        why="""Labor is a shared resource, so a staffing change has side effects by construction.
Feeding one crew starves another, and the starved crew is where the next miss comes from. A
before-and-after cannot separate your change from the weather, the volume and the manager.
Randomizing by the hour at the same building can. Measure the output metric and its
neighbors, read the result by root cause, and when the number does not move, publish that
too. A null result, correctly explained, is often the better piece of knowledge. It told us
where the rule works and where it cannot.""",
        monday=[
            "Pick one change. Flip it on and off by the hour at one building for four weeks. Do not pick the hours.",
            "Measure the metric you care about, the metrics one step upstream and downstream, and the crew you pulled bodies from.",
            "Write the result down whether or not it moved, with the design, the dates and the caveats attached.",
        ],
        rule="No rollout without a randomized on/off at the building that proved it, and every null gets a write-up.",
        rule_why="A change that only ever gets a before-and-after will always look like it worked, and the company will scale the ones that did not.",
        trap="""Any metric conditioned on whether someone responded is confounded. Messages go out
when a lane is already in trouble, so the hours with responses are pre-selected for being
bad hours. Do not report "the hours people followed the system went worse" as a finding
about the people.""",
    ),
    dict(
        slug="go-stand-there", group="How to work", fig="stand",
        title="Go stand there.",
        line="The organization is a bigger variable than the algorithm. Every correction worth making was found by walking the dock.",
        floor="""Two buildings with the same blueprint and the same conveyor. One scans every piece
off the lane; the other switched scanning off because the rate is four times higher without
it, and now that building is invisible to the system meant to staff it. A third trains its
stagers to load straight into the trailer, so the system sees one in six. A fourth has
shuttles with holes cut in the side because that is what they had. None of this is in any
query. All of it was found by standing next to the lane.""",
        why="""Every building does it differently, for reasons that are locally rational every time.
Two groups want opposite things from the same switch, one for quality and one for cost. The
integrator's equipment changes how fast a mode can be flipped. A drop of a few feet breaks
big boxes, so a building stops using a mode the model assumes. The model you built is a
model of one building. The scaling problem is never compute. It is that the world is not a
data-quality issue to be cleaned up. You learn the difference by going.""",
        monday=[
            "Pick the building where your numbers look strangest. Go there. Stand at the lane the system says is in trouble and count.",
            "Ask the shift lead what they do when the light comes on. Write down every answer that is not in your model.",
            "Bring one photo back per thing the model got wrong, and change the model before you change the building.",
        ],
        rule="No network rollout without a site visit, and no site visit without a list of what the model believes.",
        rule_why="A model is a set of claims about a floor. The only way to test a claim about a floor is to look at the floor.",
        trap="""A site visit is one building. The temptation after a visit is to encode what you saw as
the rule. Write it down as a hypothesis, then check it against the next building, which
will have done it differently.""",
    ),
]

# ----------------------------------------------------------------------------
# Widgets
# ----------------------------------------------------------------------------

WIDGETS = {
    "mirrored": """
<section class="widget" aria-label="Block a lane">
  <div class="wg-head"><span class="mono">try it</span> One destination, one lane or six. Tap a lane to block it.</div>
  <div class="wg-row"><button class="wg-tab on" data-mode="one">one lane</button><button class="wg-tab" data-mode="six">six lanes</button></div>
  <div id="lanes" class="lanes"></div>
  <p id="lanes-out" class="wg-out"></p>
</section>
<script>
(function(){
  var mode='one', blocked={};
  var box=document.getElementById('lanes'), out=document.getElementById('lanes-out');
  function draw(){
    var n = mode==='one'?1:6; box.innerHTML='';
    for(var i=0;i<n;i++){
      var b=document.createElement('button'); b.className='lane'+(blocked[i]?' blocked':''); b.setAttribute('aria-pressed', blocked[i]?'true':'false');
      b.innerHTML='<span class="light"></span><span class="mono">lane '+(i+1)+'</span>';
      b.onclick=(function(i){return function(){blocked[i]=!blocked[i]; draw();};})(i); box.appendChild(b);
    }
    var nb=0; for(var k in blocked) if(blocked[k] && +k<n) nb++;
    if(n===1){ out.textContent = nb? 'Dead end. Every piece for this destination is circling, then it drops to problem solve. One body here is the only way out.' : 'Open. All freight for this destination comes down this one chute.'; }
    else { out.textContent = nb===0? 'Open. Freight spreads across six chutes.' : nb<n? nb+' of 6 lit. The sorter routes around them and nothing is lost yet. A body sent here is solving a solved problem.' : 'All six lit at once. Now it fails, later and harder, because the sorter kept everything moving to the edge. Watch the set, not the lane.'; }
  }
  document.querySelectorAll('.wg-tab').forEach(function(t){ t.onclick=function(){ mode=t.dataset.mode; blocked={}; document.querySelectorAll('.wg-tab').forEach(function(x){x.classList.toggle('on',x===t);}); draw(); }; });
  draw();
})();
</script>""",
    "headcount": """
<section class="widget" aria-label="Headcount with units">
  <div class="wg-head"><span class="mono">try it</span> How many bodies does this zone need for the next half hour?</div>
  <div class="wg-grid">
    <label>Pieces on the lane now<input id="hc-wip" type="number" inputmode="numeric" value="40" min="0"></label>
    <label>Inbound in the next 15 min<input id="hc-f15" type="number" inputmode="numeric" value="30" min="0"></label>
    <label>Inbound 15–30 min out<input id="hc-f30" type="number" inputmode="numeric" value="20" min="0"></label>
    <label>Measured pieces per hour, per body<input id="hc-rate" type="number" inputmode="numeric" value="60" min="1"></label>
  </div>
  <p id="hc-out" class="wg-out"></p>
  <p class="wg-note">The present counts double, the near future more than the far. The weights are the shape of the idea, not a setting to copy. Measure your own rate.</p>
</section>
<script>
(function(){
  var ids=['hc-wip','hc-f15','hc-f30','hc-rate'], out=document.getElementById('hc-out');
  function v(id){ return Math.max(0, parseFloat(document.getElementById(id).value)||0); }
  function calc(){ var r=Math.max(1,v('hc-rate')), q=r/4; var hc = v('hc-wip')/(q*0.5) + v('hc-f15')/(q*0.75) + v('hc-f30')/(q*1.0);
    out.textContent = 'About '+Math.ceil(hc)+' bodies on this zone for the next half hour. Compare that to how many are standing there, rank your zones, and move from the bottom.'; }
  ids.forEach(function(id){ document.getElementById(id).addEventListener('input',calc); }); calc();
})();
</script>""",
    "deadhead": """
<section class="widget" aria-label="Price of an empty mile">
  <div class="wg-head"><span class="mono">try it</span> What does your deadhead cost?</div>
  <div class="wg-grid">
    <label>Loaded miles, six weeks<input id="dh-loaded" type="number" inputmode="numeric" value="900000" min="1"></label>
    <label>Empty miles, six weeks<input id="dh-empty" type="number" inputmode="numeric" value="90000" min="0"></label>
    <label>Invoiced linehaul, $<input id="dh-cost" type="number" inputmode="numeric" value="2400000" min="0"></label>
  </div>
  <p id="dh-out" class="wg-out"></p>
  <p class="wg-note">Industry deadhead runs around one mile in six. If yours is already well under that, what is left is probably a seam between planners, not a driver problem.</p>
</section>
<script>
(function(){
  var out=document.getElementById('dh-out');
  function v(id){ return Math.max(0, parseFloat(document.getElementById(id).value)||0); }
  function fmt(n){ return '$'+Math.round(n).toLocaleString(); }
  function calc(){ var L=Math.max(1,v('dh-loaded')), E=v('dh-empty'), C=v('dh-cost'), T=L+E; var perMile=C/T, emptyCost=perMile*E, pct=100*E/T, perYear=emptyCost*52/6;
    out.textContent = 'Deadhead is '+pct.toFixed(1)+'% of your miles. At '+fmt(perMile)+' a mile all-in, it cost '+fmt(emptyCost)+' over six weeks, about '+fmt(perYear)+' a year. Now split that by cause and by planner before you decide anything.'; }
  ['dh-loaded','dh-empty','dh-cost'].forEach(function(id){ document.getElementById(id).addEventListener('input',calc); }); calc();
})();
</script>""",
}

# ----------------------------------------------------------------------------
# Rendering
# ----------------------------------------------------------------------------

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">'

CSS = """
/* Plan View: blueprint ground, white linework, one amber. Door pages are paper sheets on the blueprint. */
:root{--bg:#0f2f63;--bg2:#0b2550;--ink:#e9f1ff;--line:#8fb3e8;--dim:#5d84c2;--amber:#ffb627;--paper:#eaf2ff;--paper-ink:#0f2f63;--paper-mute:#4a6a9f;--paper-line:#b9cdef;--red:#c0392b}
*{box-sizing:border-box}
html{color-scheme:dark;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.55 "Archivo",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:26px 18px 60px}
a{color:var(--amber)}
.mono{font:500 12px/1 "IBM Plex Mono",ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--line)}
h1{font-size:clamp(34px,6vw,60px);line-height:1;margin:10px 0 8px;font-weight:700;letter-spacing:-.02em;text-wrap:balance}
.lede{max-width:62ch;color:#c7d8f5;font-size:17px;margin:.4em 0}
.aud{max-width:62ch;color:#9fb8e2;font-size:14px;margin:.6em 0 0}
.plan{margin:22px 0 0;border:1px solid var(--dim);border-radius:6px;background:var(--bg2);padding:10px;overflow-x:auto}
.plan svg{min-width:720px;display:block;max-width:100%;height:auto}
.door-g rect.d{fill:var(--bg2);stroke:var(--line);stroke-width:1.5;transition:fill .15s}
.door-g:hover rect.d,.door-g:focus rect.d,.door-g:focus-within rect.d{fill:var(--amber)}
.door-g:hover text,.door-g:focus text,.door-g:focus-within text{fill:#0f2f63}
.door-g text{fill:var(--ink);font:600 13px "IBM Plex Mono",monospace}
.legend{display:flex;gap:18px;flex-wrap:wrap;margin:12px 0 0;font:500 12px "IBM Plex Mono",monospace;color:var(--line)}
.legend span::before{content:"";display:inline-block;width:14px;height:14px;border:1.5px solid var(--line);vertical-align:-2px;margin-right:6px}
.legend .lit::before{background:var(--amber);border-color:var(--amber)}
.swipe{display:none;font:500 12px "IBM Plex Mono",monospace;color:var(--amber);letter-spacing:.08em;margin:0 0 6px}
@media (max-width:760px){.swipe{display:block}}
.group{margin-top:26px}
.group .mono{display:block;margin-bottom:10px}
.list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.card{display:block;border:1px solid var(--dim);padding:14px 16px;border-radius:4px;color:inherit;text-decoration:none;background:rgba(255,255,255,.02)}
.card:hover{border-color:var(--amber)}
.card .n{font:500 12px "IBM Plex Mono",monospace;color:var(--amber);letter-spacing:.08em}
.card .t{font-weight:600;font-size:17px;margin:4px 0 2px;line-height:1.25}
.card .l{color:#b7cbee;font-size:14px;line-height:1.4}
.back{display:inline-block;padding:10px 0;color:var(--amber);text-decoration:none;font:500 13px "IBM Plex Mono",monospace;letter-spacing:.06em}
.sheet{background:var(--paper);color:var(--paper-ink);border-radius:6px;padding:22px 20px 26px;margin-top:18px}
.sheet .mono{color:var(--paper-mute)}
.sheet h2{font-size:clamp(26px,4.4vw,40px);line-height:1.1;margin:8px 0 8px;letter-spacing:-.01em;text-wrap:balance}
.sheet .one{font-size:18px;color:#24467f;border-left:4px solid var(--amber);padding-left:12px;margin:12px 0 18px;max-width:62ch}
.sheet h3{font:500 12px "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--paper-mute);margin:24px 0 8px}
.sheet p{max-width:66ch;margin:.5em 0}
.fig{border:1px solid var(--paper-line);border-radius:4px;padding:12px;background:#f4f8ff;margin:14px 0}
.fig svg{display:block;max-width:100%;height:auto}
.fig figcaption{color:#36568f;font-size:13.5px;margin-top:8px;line-height:1.4}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
.two .fig{margin:0}
.rule{border:1.5px solid var(--paper-ink);padding:12px 14px;border-radius:4px;max-width:66ch}
.rule b{display:block;margin-bottom:.3em}
.rule .why{margin:0;color:#24467f}
.monday{padding-left:1.2em;max-width:66ch}
.monday li{margin:.5em 0}
.trap{border-top:1px dashed var(--paper-line);padding-top:.8em}
.next{margin-top:28px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.next a{display:inline-block;padding:10px 0;color:var(--amber);text-decoration:none;font-size:15px;line-height:1.3}
footer{margin-top:40px;color:var(--line);font-size:13px;border-top:1px solid var(--dim);padding-top:1em}
.widget{margin:18px 0;border:1px solid var(--paper-line);border-radius:4px;padding:14px 16px;background:#f4f8ff}
.wg-head{margin-bottom:.8em}
.wg-head .mono{margin-right:.6em;color:#b07a0a}
.wg-row{display:flex;gap:8px;margin-bottom:12px}
.wg-tab{font:inherit;font-size:.95rem;padding:8px 14px;border:1.5px solid var(--paper-ink);background:#fff;color:var(--paper-ink);border-radius:999px;cursor:pointer}
.wg-tab.on{background:var(--paper-ink);color:#fff}
.lanes{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;margin-bottom:10px}
.lane{font:inherit;display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 6px;border:1.5px solid var(--paper-line);border-radius:4px;background:#fff;cursor:pointer;min-height:72px;color:var(--paper-ink)}
.lane .mono{color:var(--paper-mute)}
.lane .light{width:14px;height:14px;border-radius:50%;background:#cfdcf2;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.lane.blocked .light{background:var(--amber);box-shadow:0 0 0 5px rgba(255,182,39,.3)}
.wg-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.wg-grid label{display:flex;flex-direction:column;font-size:.9rem;color:var(--paper-mute);gap:4px}
.wg-grid input{font:inherit;font-size:16px;padding:9px 10px;border:1.5px solid var(--paper-line);border-radius:4px;background:#fff;color:var(--paper-ink);width:100%}
.wg-out{font-weight:600;margin:.9em 0 .2em;max-width:66ch}
.wg-note{color:var(--paper-mute);font-size:.9rem;margin:0;max-width:66ch}
a:focus-visible,button:focus-visible,.door-g:focus{outline:2px solid var(--amber);outline-offset:2px}
/* Run Sheet: each day plays twice, the usual way and the rule, then the sheet says what to do */
.hero{padding-block:28px 10px}
.hero h1{font-size:clamp(42px,11vw,80px)}
.key{display:flex;gap:18px;font:500 13px "IBM Plex Mono",monospace;margin:16px 0 0;color:var(--ink)}
.k-u::before,.k-p::before{content:"";display:inline-block;width:22px;height:3px;vertical-align:4px;margin-right:7px;border-radius:2px}
.k-u::before{background:#ff7aa8}.k-p::before{background:var(--amber)}
.story{padding:40px 0 10px;border-top:1px solid var(--dim);max-width:620px;margin-top:28px}
.story h2{font-size:clamp(28px,7vw,42px)!important;line-height:1.08;margin:8px 0 8px!important;text-wrap:balance}
.story .fix{color:var(--amber);font-size:17px;margin:0 0 14px;max-width:56ch}
.m-usual{color:#ff7aa8!important}.m-rule{color:var(--amber)!important}
.clockbig{display:flex;align-items:baseline;gap:12px;margin:0 0 10px;flex-wrap:wrap}
.clockbig span:first-child{font:600 40px/1 "IBM Plex Mono",monospace;color:var(--ink);font-variant-numeric:tabular-nums;min-width:4.2ch}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pane{min-width:0}
.pane>.mono{margin:0 0 6px}
.pmap{display:block;width:100%;height:auto;border:1px solid var(--dim);border-radius:5px}
.pmap .o{fill:var(--bg2);stroke:var(--ink);stroke-width:1.2}
.pmap .o.win{stroke-dasharray:2 1.4;stroke-width:1.4}
.pmap .yard{fill:var(--bg);stroke:var(--ink);stroke-width:1.5}
.pmap .city{fill:var(--dim)}.pmap .city.home{fill:var(--ink)}
.pmap .cl{font:500 7.5px "IBM Plex Mono",monospace;fill:#c7d8f5;paint-order:stroke;stroke:#0b2550;stroke-width:2.5px;stroke-linejoin:round}
.meter{display:flex;flex-direction:column;margin-top:8px}
.meter b{font:700 26px/1 "Archivo",sans-serif;font-variant-numeric:tabular-nums}
.p-usual .meter b{color:#ff7aa8}.p-rule .meter b{color:var(--amber)}
.meter span,.odo{font:500 11px "IBM Plex Mono",monospace;color:var(--line);letter-spacing:.04em}
.odo{display:flex;flex-direction:column;gap:2px;margin-top:6px;font-variant-numeric:tabular-nums}
.odo b{color:var(--ink)}.odo .em b{color:#ff7aa8}
.vans{list-style:none;padding:0;margin:8px 0 0;font:500 11.5px/1.35 "IBM Plex Mono",monospace}
.vans li{display:flex;gap:6px;align-items:baseline;min-height:2.8em}
.vans li i{flex:none;width:8px;height:8px;border-radius:50%;display:inline-block}
.vans li span{color:var(--line)}.vans li span::before{content:" "}
.vans li span.bad{color:#ff7aa8;font-weight:600}.vans li span.home{color:var(--amber)}
.status{font:500 11.5px "IBM Plex Mono",monospace;color:var(--line);min-height:2.8em;margin:6px 0 0}
.status.bad{color:#ff7aa8;font-weight:600}
.lg{display:flex;flex-wrap:wrap;gap:14px;font:500 11.5px "IBM Plex Mono",monospace;color:var(--line);margin:10px 0 0}
.lg i{display:inline-block;vertical-align:-1px;margin-right:6px}
.lg .dot{width:9px;height:9px;border-radius:50%;border:1.3px solid var(--ink)}
.lg .dot.win{border-style:dashed}
.lg .ring{width:12px;height:12px;border-radius:50%;border:2px solid #ff7aa8}
.lg .ln{width:18px;height:0;border-top:2.4px solid var(--ink);vertical-align:3px}
.lg .ln.dash{border-top-style:dashed}
.story .sheet{margin-top:18px;transition:box-shadow .6s}
.story .sheet.lit{box-shadow:0 0 0 3px var(--amber)}
.story .sheet ol{margin:8px 0 0;padding-left:1.3em;max-width:62ch}
.story .sheet li{margin:.6em 0;line-height:1.45}
.story .sheet .score{border-top:1px dashed var(--paper-line);padding-top:.7em;margin:.9em 0 0;color:#24467f}
.end{display:flex;flex-direction:column;gap:12px;margin-top:40px}
.end a{font-size:16px}
#app h2{font-size:clamp(28px,5vw,44px);line-height:1.05;margin:8px 0 12px;letter-spacing:-.01em;text-wrap:balance}
.tw{overflow-x:auto}
.src{border-collapse:collapse;font-size:13.5px;width:100%;min-width:560px}
.src td{border-top:1px solid var(--dim);padding:8px 6px;vertical-align:top}
.src .sc{display:block;font:500 11px "IBM Plex Mono",monospace;color:var(--line)}
@media (max-width:620px){.two{grid-template-columns:1fr}.wg-grid{grid-template-columns:1fr}.sheet{padding:18px 14px 22px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def para(s: str) -> str:
    return "".join(f"<p>{esc(' '.join(block.split()))}</p>" for block in s.strip().split("\n\n"))


# The shared PostHog block (?me=1 opt-out, no headless capture): ~/.claude/skills/site-analytics/posthog_inject.py --print.
POSTHOG = (Path(__file__).resolve().parent / "scripts" / "posthog.html").read_text()


def shell(title: str, body: str, desc: str, root: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
{FONTS}
<link rel="stylesheet" href="{root}style.css">
<script>window.va=window.va||function(){{(window.vaq=window.vaq||[]).push(arguments)}};</script><script defer src="/_vercel/insights/script.js"></script>
{POSTHOG}</head>
<body>
<div class="wrap">
{body}
<footer><a href="{root}">{esc(TITLE)}</a> · the same day run two ways, for seven kinds of small fleet, priced with published numbers. Free.</footer>
</div>
</body>
</html>
"""


def plan_svg() -> str:
    n = len(DOORS)
    x0, step = 100, 84
    s = ['<svg viewBox="0 0 960 420" role="img" aria-label="Plan view of an outbound dock: sorter loop, ten chutes, staging, ten dock doors with trailers. Each door opens one idea.">',
         '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#8fb3e8" stroke-width=".8" opacity=".5"/></pattern>'
         '<marker id="arP" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8fb3e8"/></marker></defs>',
         '<g stroke="#1e4a8f" stroke-width=".6"><path d="M0 60H960M0 120H960M0 180H960M0 240H960M0 300H960M0 360H960"/><path d="M80 0V420M160 0V420M240 0V420M320 0V420M400 0V420M480 0V420M560 0V420M640 0V420M720 0V420M800 0V420M880 0V420"/></g>',
         '<rect x="60" y="40" width="840" height="90" rx="45" fill="none" stroke="#8fb3e8" stroke-width="2"/>',
         t(480, 70, "SORTER LOOP", 12, "middle", "#8fb3e8"),
         '<path d="M400 100 L460 100" stroke="#8fb3e8" stroke-width="1.5" marker-end="url(#arP)"/>', t(430, 118, "flow", 12, "middle", "#8fb3e8"),
         t(120, 118, "induct", 12, "start", "#8fb3e8"), t(820, 118, "recirc → problem solve", 12, "end", "#ffb627"),
         '<g fill="none" stroke="#8fb3e8" stroke-width="1.5">']
    for i in range(n):
        x = x0 + i * step
        s.append(f'<path d="M{x} 130 L{x} 200 L{x-10} 236 M{x} 130 L{x} 200 L{x+10} 236"/><rect x="{x-14}" y="196" width="28" height="40" fill="{"#ffb627" if i == 1 else "none"}" stroke="#8fb3e8"/>')
    s.append('</g>')
    s.append('<rect x="60" y="238" width="840" height="60" fill="url(#hatch)" stroke="#8fb3e8" stroke-width="1" stroke-dasharray="4 4"/>')
    s.append(t(70, 256, "STAGING", 12, "start", "#c7d8f5"))
    s.append('<line x1="40" y1="330" x2="920" y2="330" stroke="#e9f1ff" stroke-width="3"/>')
    s.append(t(920, 310, "DOCK WALL", 12, "end", "#c7d8f5"))
    for i, d in enumerate(DOORS):
        x = x0 + i * step
        s.append(f'<a class="door-g" href="{d["slug"]}/" aria-label="Door {i+1}: {esc(d["title"])}">'
                 f'<rect class="d" x="{x-30}" y="316" width="60" height="28" rx="2"/><text x="{x}" y="335" text-anchor="middle">D{i+1:02d}</text>'
                 f'<rect x="{x-26}" y="350" width="52" height="60" rx="3" fill="none" stroke="#5d84c2" stroke-width="1.2"/><line x1="{x-26}" y1="380" x2="{x+26}" y2="380" stroke="#5d84c2" stroke-width="1"/></a>')
    s.append('</svg>')
    return "".join(s)


def render_index() -> str:
    groups: dict[str, list[tuple[int, dict]]] = {}
    for i, d in enumerate(DOORS, 1):
        groups.setdefault(d["group"], []).append((i, d))
    parts = ['<a class="back" href="../">← back to the practice yard</a>', f'<p class="mono">{esc(TITLE)} · the ten doors</p>', "<h1>Pick a door.</h1>",
             f'<p class="lede">{esc(TAGLINE)}</p>', f'<p class="aud">{esc(AUDIENCE)}</p>',
             f'<figure class="plan"><div class="swipe">swipe the plan → · tap a door</div>{plan_svg()}<div class="legend"><span>chute / lane</span><span class="lit">door, lit = open it</span><span>trailer at door</span></div></figure>']
    for g in ("On the floor", "Between buildings", "How to work"):
        parts.append(f'<div class="group"><span class="mono">{esc(g)}</span><div class="list">')
        for i, d in groups[g]:
            parts.append(f'<a class="card" href="{d["slug"]}/"><div class="n">D{i:02d}</div><div class="t">{esc(d["title"])}</div><div class="l">{esc(d["line"])}</div></a>')
        parts.append("</div></div>")
    return shell(f"The ten doors · {TITLE}", "\n".join(parts), TAGLINE, "../")


def render_door(i: int, d: dict) -> str:
    nxt = DOORS[i % len(DOORS)]
    prv = DOORS[(i - 2) % len(DOORS)]
    monday = "".join(f"<li>{esc(m)}</li>" for m in d["monday"])
    widget = WIDGETS.get(d.get("widget", ""), "")
    figure = FIGS[d["fig"]]()
    body = f"""<a class="back" href="../">← all ten doors</a>
<div class="sheet">
<p class="mono">Door {i:02d} · {esc(d["group"])} · sheet {i+1}</p>
<h2>{esc(d["title"])}</h2>
<div class="one">{esc(d["line"])}</div>
{figure}
<h3>On your dock</h3>
{para(d["floor"])}
<h3>Why it is true</h3>
{para(d["why"])}
{widget}
<h3>Monday</h3>
<ol class="monday">{monday}</ol>
<h3>The rule, and why</h3>
<div class="rule"><b>{esc(d["rule"])}</b><p class="why">{esc(d["rule_why"])}</p></div>
<h3>The trap</h3>
<div class="trap">{para(d["trap"])}</div>
</div>
<div class="next"><a href="../{prv["slug"]}/">← D{(i-2) % len(DOORS) + 1:02d} {esc(prv["title"])}</a><a href="../{nxt["slug"]}/">D{i % len(DOORS) + 1:02d} {esc(nxt["title"])} →</a></div>"""
    return shell(f"{d['title']} · {TITLE}", body, d["line"], "../../")


TRAINER_DESC = "Same day, run two ways: seven kinds of small fleet, each day priced with published wages, diesel and rates, run the usual way and then by a rule a dispatcher can follow tomorrow."


def render_trainer() -> str:
    body = '<main id="app"><p class="mono">loading…</p></main><script src="page.js"></script>'
    return shell(TITLE, body, TRAINER_DESC, "")


def main() -> None:
    import subprocess, sys
    if subprocess.run([sys.executable, str(Path(__file__).resolve().parent / "model" / "compile.py")]).returncode:
        sys.exit("model/compile.py failed: a required number has no sourced row")
    (SITE / "doors").mkdir(parents=True, exist_ok=True)
    keep = {d["slug"] for d in DOORS}
    for stale in (SITE / "doors").iterdir():
        if stale.is_dir() and stale.name not in keep:
            for f in stale.iterdir():
                f.unlink()
            stale.rmdir()
    (SITE / "style.css").write_text(CSS.strip() + "\n")
    (SITE / "doors" / "index.html").write_text(render_index())
    (SITE / "index.html").write_text(render_trainer())
    if subprocess.run(["node", str(Path(__file__).resolve().parent / "scripts" / "stories.js")]).returncode:
        sys.exit("scripts/stories.js failed")
    for stale in ("engine.js", "ui.js"):
        (SITE / stale).unlink(missing_ok=True)
    (SITE / "page.js").write_text((Path(__file__).resolve().parent / "trainer" / "page.js").read_text())
    for i, d in enumerate(DOORS, 1):
        out = SITE / "doors" / d["slug"]
        out.mkdir(parents=True, exist_ok=True)
        (out / "index.html").write_text(render_door(i, d))
    banned = ["amazon", "msp1", "kiva", "directed staffing", "bps", "dea", "awcs", "watt", "jackpot", "scot", "relay", "prime",
              "gen 11", "mezz", "associate", "associates", "facility", "visibility", "dashboard", "optimize", "optimise"]
    for p in SITE.rglob("*.html"):
        low = p.read_text().lower()
        hits = [b for b in banned if re.search(r"\b" + re.escape(b) + r"\b", low)]
        assert not hits, f"{p}: banned terms {hits}"
    print(f"built {len(DOORS)} doors + index into {SITE}")


if __name__ == "__main__":
    main()
