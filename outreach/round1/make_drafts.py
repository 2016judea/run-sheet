#!/usr/bin/env python3
"""Round 1 drafts (paid round, 2026-10-15). NOTHING HERE SENDS.

    python3 outreach/round1/make_drafts.py   # recipients.json + facts.json -> drafts/<token>.md, ledger.csv

Shape (brief rule 6): line one = their own FMCSA filing; one fact our model adds about a
day shaped like it (scripts/days.js -> facts.json); then the /for/ link and the price.
Every number is read from those two files. Sends go one-to-one from Zoho after 10/19,
25 a day, only after Aidan has read them.
"""
import csv, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = "https://run-sheet-yard.vercel.app"
PRICE = int(re.search(r"const PRICE_USD = (\d+);", (HERE.parent.parent / "site/api/_lib.js").read_text()).group(1))
UNIT = {"courier": ("van", "vans"), "route_dist": ("truck", "trucks"), "final_mile_bulky": ("truck", "trucks"),
        "building_supply": ("truck", "trucks"), "ltl_pd": ("truck", "trucks")}
WORK = {"courier": "deliveries", "route_dist": "route stops", "final_mile_bulky": "home deliveries",
        "building_supply": "jobsite drops", "ltl_pd": "pickups and drops"}
WORDS = "zero one two three four five six seven eight nine ten eleven twelve".split()
w = lambda n: WORDS[n] if 0 <= n < len(WORDS) else str(n)
usd = lambda x: f"${x:,.0f}"


def short(org):
    return re.sub(r",?\s+(LLC|Inc|Incorporated|LLP)\.?$", "", org).strip()


def fact(p, f):
    one, many = UNIT[p["segment"]]
    a, r = f["asRun"], f["par"]
    n = f["trucks"]
    day = f"{w(n)} {one if n == 1 else many} and {f['stops']} {WORK[p['segment']]} around your yard"
    if r["trucks"] < a["trucks"]:
        what = f"it sends out {w(a['trucks'])} {many}. {w(r['trucks']).capitalize()} would have done it"
    elif a["late"] > r["late"]:
        what = f"it runs {a['late']} stops late. The best plan we found runs {w(r['late']) if r['late'] else 'none'}"
    else:
        what = f"it drives {a['miles']} miles. The best plan we found drives {r['miles']}"
    return day, what, f["gap"]


def draft(p, f):
    day, what, gap = fact(p, f)
    units, drv = p["power_units"], p["drivers"]
    link = f"{SITE}/for/{p['token']}/"
    subject = f"A day shaped like {short(p['org'])}'s"
    body = f"""Hi {p['first']},

Your FMCSA filing lists {units} power unit{'s' if units != 1 else ''} and {drv} driver{'s' if drv != 1 else ''} out of {p['city']}, every driver running inside 100 miles.

So I priced a day shaped like that: {day}, at published wages and diesel. Dealt out the way most yards do it, {what}. That's {usd(gap)} on one day.

Eight days are open to poke at, no login: {link}
One of them is yours. You can drop a real stop list in there too and see the totals. The run sheets for your own days, every truck in order with arrival times, are ${PRICE}, once.

Best,
Aidan
https://randomaidan.substack.com/p/business-prototypes
"""
    return subject, body, link


def main():
    rec = json.loads((HERE / "recipients.json").read_text())
    facts = json.loads((HERE / "facts.json").read_text())
    (HERE / "drafts").mkdir(exist_ok=True)
    rows = []
    for p in rec:
        if not p["mx"] or p["yard"]["lat"] is None:
            continue
        subject, body, link = draft(p, facts[p["token"]])
        (HERE / "drafts" / f"{p['token']}.md").write_text(f"To: {p['name']} <{p['email']}>\nSubject: {subject}\n\n{body}")
        rows.append({"token": p["token"], "segment": p["segment"], "name": p["name"], "org": short(p["org"]), "email": p["email"],
                     "email_source": p["email_source"], "their_record": f"MCS-150 {p['mcs150_date']}: {p['power_units']} power units, {p['drivers']} drivers, {p['city']}, all inside 100 mi",
                     "record_url": p["record_url"], "page_url": link, "subject": subject, "status": "drafted"})
    with (HERE / "ledger.csv").open("w", newline="") as fh:
        wr = csv.DictWriter(fh, fieldnames=list(rows[0]))
        wr.writeheader()
        wr.writerows(rows)
    from collections import Counter
    print(len(rows), "drafts", dict(Counter(r["segment"] for r in rows)))


if __name__ == "__main__":
    main()
