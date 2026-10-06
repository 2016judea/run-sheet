#!/usr/bin/env python3
"""Send every unsent draft through bricks' Mailgun sender (tracking off, replies to Zoho).
    python3 send.py [--dry]
Aidan said "send the emails" 2026-10-06."""
import csv, sys, time, datetime
from pathlib import Path
sys.path.insert(0, str(Path.home()/"Desktop/bricks/scripts/outreach"))
from send_mailgun import send
H = Path(__file__).resolve().parent
dry = "--dry" in sys.argv
rows = list(csv.DictReader(open(H/"tokens.csv")))
for r in rows:
    if r["date_sent"]: continue
    t = (H/"drafts"/r["draft_file"]).read_text().splitlines()
    subj = next(l[9:] for l in t if l.startswith("Subject: "))
    body = "\n".join(t[t.index(next(l for l in t if l.startswith("Subject: ")))+2:])
    try:
        out = send(r["email"], subj, body, dry=dry)
        print("OK ", r["name"], r["email"], str(out)[:60], flush=True)
        if not dry: r["date_sent"] = datetime.datetime.now().isoformat(timespec="minutes")
    except Exception as e:
        print("ERR", r["name"], r["email"], str(e)[:120], flush=True)
    time.sleep(0 if dry else 4)
if not dry:
    with open(H/"tokens.csv","w",newline="") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys()); w.writeheader(); w.writerows(rows)
