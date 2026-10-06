#!/usr/bin/env python3
"""Compile model/data/*.csv into site/model.json — the only numbers the trainer has.

A row ships only with a source_url and a confidence of published / derived / estimate
(see SCHEMA.md). Rows that fail are reported and dropped, never patched. The build
fails if any parameter the engine reads (REQUIRED) has no surviving row, so a
missing number is a red build, not a silent default.
"""
from __future__ import annotations

import csv
import json
import sys
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
OUT = Path(__file__).resolve().parent.parent / "site" / "model.json"
CONF = {"published", "derived", "estimate"}

ROUTES = ["courier", "route_dist", "final_mile_bulky", "building_supply", "ltl_pd"]
# (id, scopes the engine asks for) — kept in step with trainer/engine.js
REQUIRED = [
    ("driver_wage_hr", None), ("driver_benefit_load_pct", None), ("road_circuity", None),
    ("urban_speed_mph", ROUTES + ["drayage"]), ("suburban_speed_mph", ["final_mile_bulky", "building_supply"]), ("loaded_miles_per_day", ROUTES), ("highway_speed_mph", ["regional_tl"]),
    ("pretrip_min", ROUTES), ("time_window_hr", ROUTES),
    ("service_min_commercial", ["courier", "route_dist"]),
    ("service_min_two_person_install", ["final_mile_bulky"]),
    ("service_min_liftgate_pallet", ["building_supply", "ltl_pd"]),
    ("rate_per_stop", ["courier", "route_dist", "final_mile_bulky", "building_supply"]),
    ("ltl_rate_per_cwt", ["ltl_pd"]), ("minimum_charge", ["ltl_pd"]),
    ("rate_per_mile_spot", ["regional_tl"]), ("rate_per_load", ["drayage"]),
    ("fuel_surcharge_basis", ["ltl_pd", "regional_tl", "drayage"]),
    ("dock_dwell_hr", ["regional_tl", "drayage"]),
    ("detention_free_hr", ["regional_tl", "drayage"]), ("detention_rate_hr", ["regional_tl", "drayage"]),
    ("hos_11hr_drive", ["rules"]), ("hos_14hr_window", ["rules"]),
    ("driver_callout", ROUTES),
]
NUM_VEH = ["gvwr_lb", "payload_lb", "cube_ft3", "pallet_positions", "mpg", "cost_per_mile_ex_driver", "fixed_cost_per_day"]


def num(x):
    if x is None:
        return None
    s = str(x).strip().replace(",", "").replace("$", "").replace("%", "")
    if s == "":
        return None
    try:
        return float(s)
    except ValueError:
        return None


def rows(name):
    p = DATA / name
    if not p.exists():
        return []
    with p.open(newline="") as f:
        return list(csv.DictReader(f))


def sourced(r, dropped, where):
    url = (r.get("source_url") or "").strip()
    conf = (r.get("confidence") or "").strip().lower()
    if not url.startswith("http") or conf not in CONF:
        dropped.append(f"{where}:{r.get('id')} (url={url[:30]!r}, confidence={conf!r})")
        return False
    return True


def src(r):
    return {k: (r.get(k) or "").strip() for k in ("source_name", "source_url", "as_of", "confidence", "note")}


def main() -> int:
    dropped: list[str] = []
    M = {"built": date.today().isoformat(), "params": {}, "vehicles": {}, "segments": {}, "kpis": {},
         "decisions": {}, "events": {}, "rules": {}}

    for f in sorted(DATA.glob("parameters*.csv")):
        for r in rows(f.name):
            if not r.get("id") or not sourced(r, dropped, f.name):
                continue
            v = num(r.get("value"))
            if v is None:
                dropped.append(f"{f.name}:{r['id']} (no numeric value: {r.get('value')!r})")
                continue
            for scope in (r.get("scope") or "all").replace(";", "|").split("|"):
                M["params"].setdefault(r["id"].strip(), {})[scope.strip() or "all"] = {
                    "value": v, "low": num(r.get("low")), "high": num(r.get("high")),
                    "unit": (r.get("unit") or "").strip(), "name": (r.get("name") or "").strip(), **src(r)}

    for r in rows("vehicles.csv"):
        if not r.get("id") or not sourced(r, dropped, "vehicles.csv"):
            continue
        v = {k: (r.get(k) or "").strip() for k in r}
        for k in NUM_VEH:
            v[k] = num(r.get(k)) or 0
        v["segments"] = [s.strip() for s in (r.get("segments") or "").replace(";", "|").split("|") if s.strip()]
        M["vehicles"][r["id"]] = v

    for name, key in (("segments.csv", "segments"), ("kpis.csv", "kpis"), ("decisions.csv", "decisions")):
        for r in rows(name):
            if r.get("id") and sourced(r, dropped, name):
                M[key][r["id"]] = {k: (r.get(k) or "").strip() for k in r}

    for r in rows("events.csv"):
        if not r.get("id") or not sourced(r, dropped, "events.csv"):
            continue
        M["events"][r["id"]] = {k: (r.get(k) or "").strip() for k in r}
        p = num(r.get("probability_per_day"))
        if p is not None:
            for seg in (r.get("segments") or "all").replace(";", "|").split("|"):
                M["params"].setdefault(r["id"], {})[seg.strip() or "all"] = {
                    "value": p, "low": None, "high": None, "unit": "per " + (r.get("probability_basis") or "day"),
                    "name": r["id"].replace("_", " "), **src(r)}
            M["params"][r["id"]]["events"] = M["params"][r["id"]].get("all") or next(iter(M["params"][r["id"]].values()))

    for r in rows("rules.csv"):
        if not r.get("id") or not sourced(r, dropped, "rules.csv"):
            continue
        M["rules"][r["id"]] = {k: (r.get(k) or "").strip() for k in r}
        v = num(r.get("value"))
        if v is not None:
            M["params"].setdefault(r["id"], {})["rules"] = {
                "value": v, "low": None, "high": None, "unit": (r.get("unit") or "").strip(),
                "name": (r.get("statement") or "")[:80], **src(r), "source_name": r.get("cfr") or r.get("source_name", "")}

    missing = []
    for pid, scopes in REQUIRED:
        have = M["params"].get(pid, {})
        if scopes is None:
            if not have:
                missing.append(pid)
            continue
        for s in scopes:
            if s not in have and "all" not in have:
                missing.append(f"{pid}@{s}")
    seg_routes = set(ROUTES + ["regional_tl", "drayage"])
    no_vehicle = [s for s in seg_routes if not any(s in v["segments"] for v in M["vehicles"].values())]
    wage_missing = [v for v in M["vehicles"] if v not in M["params"].get("driver_wage_hr", {}) and "all" not in M["params"].get("driver_wage_hr", {})]

    for d in dropped:
        print("dropped", d, file=sys.stderr)
    problems = missing + [f"no vehicle for {s}" for s in no_vehicle] + [f"driver_wage_hr@{v}" for v in wage_missing]
    if problems:
        print("MISSING:", ", ".join(problems), file=sys.stderr)
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(M, separators=(",", ":")))
    n = sum(len(v) for v in M["params"].values())
    print(f"model.json: {n} parameter rows, {len(M['vehicles'])} vehicles, {len(M['segments'])} segments, "
          f"{len(M['decisions'])} decisions, {len(M['events'])} events, {len(M['rules'])} rules, {len(dropped)} dropped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
