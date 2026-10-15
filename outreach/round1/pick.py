#!/usr/bin/env python3
"""Round 1 recipients: Twin Cities fleets that run stops, named from their own FMCSA filing.

    python3 outreach/round1/pick.py      # fmcsa_mn.json -> recipients.json

Source: FMCSA Company Census (data.transportation.gov az4n-8mr2), the carrier's own
MCS-150. The email is the one the carrier filed with FMCSA, never a pattern guess; the
name is the officer on the filing, or the person the address belongs to when the
local part says so (NAME_FROM_EMAIL). Each yard is geocoded from the filed street address
(US Census geocoder) and each email domain must have an MX record. Picked by hand from a
name filter over metro carriers that run only inside 100 miles; see SEG.
"""
import hashlib, json, subprocess, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SEG = {
    "courier": [2987505, 3308868, 4404753, 4411776, 4435341, 2321878, 2521428, 2561120, 527471, 4990602, 2944598, 4018830, 4223081, 4511741, 3365848, 4367805],
    "route_dist": [449739, 2486313, 3290178, 363346, 3283509, 928918, 2878279, 1096986, 4496663, 3432927, 3440942, 4316478, 3643692, 1421922, 1625899, 1084432, 1094250, 4199159],
    "building_supply": [361038, 243126, 1088059, 1112743, 2385214, 1452584, 596346, 1733266, 2908851],
    "final_mile_bulky": [1035756, 1273916, 900973, 1102265, 1103117, 3496573, 1254280, 1437729, 2510486, 4579518, 2997944],
}
NAME_FROM_EMAIL = {1437729: "Jason Opsahl", 1094250: "Rob Commers"}
# display names: the filing's officer, shortened to how the email addresses them
NAME = {928918: "Mike Maher", 2385214: "Scott Buttermore", 1084432: "Bob Milbert", 4316478: "Phil Johnson",
        1733266: "Greg Worm", 3283509: "Kevin VanOverbeke", 3365848: "Bernard Booher", 2321878: "Jose Pliego",
        4367805: "Jorge Toapante", 2561120: "Paul McCallum", 3290178: "Paul Haskins", 449739: "Jeff Bergin",
        2997944: "Tyler DeWolf"}
ORG = {1437729: "Allegro Home Delivery", 2486313: "Juice So Good", 3290178: "St. Croix Specialty Foods",
       4404753: "JTC Logistics", 3440942: "CKC Good Food", 3643692: "NBBC Distribution", 2878279: "JPR Distributing",
       1084432: "Culligan Water of Inver Grove Heights", 1102265: "Steve's Appliances", 1254280: "Podany's",
       4435341: "TopTier Deliverys", 2521428: "5 Star Delivery", 4496663: "Van Pelt Vending", 1421922: "Breadsmith"}


def title(s):
    out = " ".join(w.capitalize() if len(w) > 2 or not w.isalpha() else w.upper() for w in (s or "").split())
    for a, b in [(" Llc", " LLC"), (" Inc", " Inc"), ("'S ", "'s "), (" Of ", " of "), (" And ", " and "), (" Mn", " MN"), (" Tv ", " TV ")]:
        out = out.replace(a, b)
    return out.strip()


def geocode(addr):
    u = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=" + urllib.parse.quote(addr)
    try:
        j = json.load(urllib.request.urlopen(u, timeout=20))
        m = j["result"]["addressMatches"]
        return (m[0]["coordinates"]["y"], m[0]["coordinates"]["x"]) if m else (None, None)
    except Exception:
        return (None, None)


def mx(domain):
    return bool(subprocess.run(["dig", "+short", "MX", domain], capture_output=True, text=True).stdout.strip())


rows = {int(r["dot_number"]): r for r in json.load(open(HERE / "fmcsa_mn.json"))}
out = []
for seg, dots in SEG.items():
    for dot in dots:
        r = rows[dot]
        officer = title(r["company_officer_1"])
        name = NAME.get(dot) or NAME_FROM_EMAIL.get(dot, officer)
        org = ORG.get(dot) or title(r.get("dba_name") or r["legal_name"])
        email = r["email_address"].strip().lower()
        city = title(r["phy_city"])
        lat, lon = geocode(f'{r["phy_street"]}, {r["phy_city"]}, MN {r["phy_zip"][:5]}')
        if lat is None:  # Census needs a street it knows; fall back to the town (OSM Nominatim)
            q = urllib.parse.urlencode({"postalcode": r["phy_zip"][:5], "country": "us", "format": "json", "limit": 1})
            req = urllib.request.Request("https://nominatim.openstreetmap.org/search?" + q, headers={"User-Agent": "run-sheet/1 (aidan@brickandmortar.dev)"})
            j = json.load(urllib.request.urlopen(req, timeout=20))
            lat, lon = (float(j[0]["lat"]), float(j[0]["lon"])) if j else (None, None)
        d = r["mcs150_date"]
        out.append({
            "token": hashlib.sha256(f"run-sheet-r1:{dot}".encode()).hexdigest()[:8],
            "segment": seg, "name": name, "first": name.split()[0], "org": org, "legal_name": r["legal_name"],
            "email": email, "email_source": f"FMCSA MCS-150 filing, USDOT {dot}", "mx": mx(email.split("@")[1]),
            "dot": dot, "city": city, "street": title(r["phy_street"]), "zip": r["phy_zip"][:5],
            "power_units": int(r["power_units"]), "drivers": int(r.get("total_drivers") or 0),
            "mcs150_date": f"{d[:4]}-{d[4:6]}-{d[6:]}", "mileage": int(r.get("mcs150_mileage") or 0), "mileage_year": r.get("mcs150_mileage_year"),
            "classdef": r.get("classdef"), "yard": {"lat": lat, "lon": lon},
            "record_url": f"https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string={dot}",
        })
        print(f'{seg:17} {dot:>8} {org[:34]:34} {name:22} {email:40} mx={out[-1]["mx"]} yard={lat is not None}')
json.dump(out, open(HERE / "recipients.json", "w"), indent=1)
print(len(out), "recipients")
