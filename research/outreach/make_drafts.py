#!/usr/bin/env python3
"""First-pass drafts from research/prospects.csv, one file per sendable row.

Rule 11 (distribution-channel): sentences one and two quote the reader's OWN public
record. Then the door, then nothing asked. Rule 10: the gift is the pitch, no offer.
aidan-voice, explainer register: short sentences, concrete nouns, no hedge, no recap,
`Best, Aidan.` Every draft is reviewed by Aidan before anything sends.

Rows without a record_url or with email_status not VERIFIED/PATTERN-GUESS are skipped
and listed, because a name without a record is not sendable.
"""
import csv, secrets, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
P = HERE.parent / "prospects.csv"
OUT = HERE / "drafts"
DOORS = {
 1:("the-signal-is-already-there","The signal is already there"),
 2:("a-lane-only-needs-help-when-it-has-no-way-out","A lane only needs help when it has no way out"),
 3:("full-is-three-different-things","Full is three different things"),
 4:("reaction-is-late-by-construction","Reaction is late by construction"),
 5:("measure-the-constant-before-you-build-the-model","Measure the constant before you build the model"),
 6:("size-it-before-you-build-it","Size it before you build it"),
 7:("fewer-touches-not-faster-touches","Fewer touches, not faster touches"),
 8:("legibility-beats-intelligence","Legibility beats intelligence"),
 9:("test-it-like-a-drug","Test it like a drug"),
 10:("go-stand-there","Go stand there"),
}
BASE = "https://dock-doors.vercel.app/doors/"

def first(name):
    return name.split()[0] if name else ""

def draft(r):
    d = int(r["door"])
    slug, title = DOORS[d]
    quote = r["record_quote"].strip().rstrip(".")
    venue = "on The New Warehouse" if r["source_type"] == "podcast" else "in Modern Materials Handling"
    body = f"""Hi {first(r['name'])},

You said {venue}: "{quote}." That sentence is door {d} of something I just put up.

{BASE}{slug}/

Ten doors for people who run a dock, a DC or a fleet. Each one is a single idea, drawn to scale, with what to measure on Monday using what you already own. I spent five years building staffing software for the biggest parcel network there is. This is what transfers to everyone who isn't it.

Free. No login, no pitch, nothing to reply to.

Best,
Aidan Jude
https://aidanjude.substack.com
"""
    subj = title
    return subj, body

def main():
    OUT.mkdir(exist_ok=True)
    rows = list(csv.DictReader(open(P)))
    skipped, made = [], []
    for r in rows:
        if not r.get("record_url") or r.get("email_status","").upper() not in ("VERIFIED","PATTERN-GUESS"):
            skipped.append(r.get("name")); continue
        subj, body = draft(r)
        tok = secrets.token_hex(3)
        slug = "".join(c for c in r["name"].lower().replace(" ","-") if c.isalnum() or c=="-")
        f = OUT / f"{slug}.md"
        f.write_text(f"DRAFT, not sent. token {tok}\nTo: {r['email']} ({r['email_status']})\nRecord: {r['record_url']}\nLinkedIn: {r.get('linkedin_url','')}\nSubject: {subj}\n\n{body}")
        made.append((tok, r, f.name))
    print(f"{len(made)} drafts, {len(skipped)} skipped (no record or no email): {skipped[:12]}")
    with open(HERE/"tokens.csv","a") as fh:
        w = csv.writer(fh)
        for tok, r, fn in made:
            w.writerow([tok, "2026-10-05", "", r["name"], r["company"], r["email"], r["email_status"], "email", r["door"], r["record_url"], fn, "", "", ""])

if __name__ == "__main__":
    main()
