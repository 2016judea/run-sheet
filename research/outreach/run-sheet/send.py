#!/usr/bin/env python3
"""Send the Run Sheet gift drafts through bricks' Mailgun sender (tracking off, replies to Zoho).
    python3 send.py [--dry]
Aidan said "send" 2026-10-07. Apex Capital rows are held: Apex runs its own load
board (NextLOAD), which the list's competitor rule excludes."""
import csv, sys, time, datetime
from pathlib import Path
sys.path.insert(0, str(Path.home()/"Desktop/workspace/bricks/scripts/outreach"))
from send_mailgun import send
H = Path(__file__).resolve().parent
HOLD = {"mario-tarradell", "dax-johnson"}
dry = "--dry" in sys.argv
rows = list(csv.DictReader(open(H/"tokens.csv")))
for r in rows:
    if r["sent_at"] or r["reply_kind"]: continue
    if r["slug"] in HOLD:
        r["reply_kind"] = "held:apex-runs-a-load-board"; print("HOLD", r["name"]); continue
    t = [l for l in (H/"drafts"/f'{r["slug"]}.md').read_text().splitlines() if not l.startswith("<!--")]
    i = next(k for k, l in enumerate(t) if l.startswith("Subject: "))
    subj, body = t[i][9:], "\n".join(t[i+1:]).strip() + "\n"
    for attempt in range(4):
        try:
            out = send(r["email"], subj, body, dry=dry)
            print("OK ", r["name"], r["email"], str(out)[:60], flush=True)
            if not dry: r["sent_at"] = datetime.datetime.now().isoformat(timespec="minutes")
            break
        except Exception as e:
            print("ERR", r["name"], r["email"], str(e)[:160], flush=True)
            if "429" in str(e) and "daily" not in str(e): time.sleep(20); continue
            break
    time.sleep(0 if dry else 4)
if not dry:
    with open(H/"tokens.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys()); w.writeheader(); w.writerows(rows)
