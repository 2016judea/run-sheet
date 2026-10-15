# Run Sheet

**Live:** https://run-sheet-yard.vercel.app

**Tools and methodologies for optimizing transportation and D2D delivery fleets.**

— Aidan, [*Business Prototypes*](https://randomaidan.substack.com/p/business-prototypes), 2026-10-12. (Was Dock Doors.)

## Your own day (paid, 2026-10-15)

`/day/` plans an operator's own stop list three ways: as they ran it (their file's route
column, else the usual way), the hand rule (`trainer/rules.js`), and the best plan
(`trainer/engine.js`, warm-started from the rule). It opens already run on a made-up
courier morning. `/for/<token>/` opens on a day shaped like one recipient's FMCSA filing:
their yard, their trucks (power units capped by drivers), their segment's stops per truck.
Spec: `DATA_MODEL.md`. Engine for uploads: `trainer/upload.js`; days: `scripts/days.js`.

**Free:** the seven played days at `/`, and the three plans' totals (trucks, miles, hours,
late stops, day cost) on any day you put in. **Paid:** every truck's run sheet, stop by
stop with arrival times, plus a CSV, on every day you put in.

## The paywall

Copied from msp-house-index. Nothing paid ships statically: the run sheets are computed
per request by `/api/plan` and only returned with a password.

| route | does |
|---|---|
| `POST /api/plan` | geocodes address rows (US Census, free), plans the day; totals for everyone, `full` run sheets only with a paid or comp password in `x-password` |
| `POST /api/checkout` | Stripe embedded Checkout, one price, Customer + Invoice; mints the password (nonce + HMAC under `ACCESS_SECRET`) |
| `POST /api/stripe-webhook` | `checkout.session.completed`: emails the password and a `/day/?pw=` link (Mailgun), and Aidan a sale notice |
| `GET /api/session-status` | the return page: paid or not; sends the email if the webhook has not |

Vercel env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (endpoint `we_1UQsICBzD4mN8eODq6D3KOxo`),
`ACCESS_SECRET` (also in `./.env`, gitignored), `MAILGUN_*`. Lost password:
`python3 scripts/fulfil.py <session_id>`; every sale: `--recent`; a comp:
`python3 scripts/issue_password.py "comp:<who>"`. Funnel events (Vercel + PostHog):
`preview_open`, `plan_run`, `checkout_open`, `paid`, `unlock`, `csv_download`, each with the
`/for/` token when there is one.

## Price

**$50, once** (`PRICE_USD` in `site/api/_lib.js`; the pages read it from there). A
hypothesis, set 2026-10-15, not a finding. One use = one day replanned. On the 54 days
shaped like the round-1 recipients' filings the best plan beats the usual way by a
median $616 a day ($531 by the hand rule); the seven front-page days, a 3-truck morning
each, run $300 to $540. A tenth of roughly $500 is $50. msp-house-index at $100 drew 10
checkouts and 0 payments 10/11-10/12, so this is the number under test.

## Round 1 (drafts, unsent)

`outreach/round1/`: `pick.py` names 54 Twin Cities fleets that run stops from their own
FMCSA filing (email as filed, never guessed; MX checked), `make_drafts.py` writes
`drafts/<token>.md` and `ledger.csv`. Segments: courier 16, route delivery 18, building
supply 9, furniture/appliance/rental 11.

## What is live

Same day, planned twice. Seven kinds of small fleet — couriers, route trucks, furniture and
building-supply delivery, LTL pickup and delivery, regional truckload, drayage. For each,
one real-shaped day, priced with published wages, diesel, rates and the hours-of-service
rules, is planned the usual way (what decisions.csv says operators do) and then by a
solver. The page draws both as you scroll; nothing to press. Each story links its door.

    python3 build.py              # model/data/*.csv -> site/model.json, trainer + doors -> site/
    python3 scripts/deploy.py     # Vercel REST deploy (needs VERCEL_TOKEN)

- `model/SCHEMA.md` — the data model. Read first.
- `model/data/*.csv` — every number, each row with a source URL and a confidence.
- `model/compile.py` — drops unsourced rows; fails the build if the engine needs a number
  that has no surviving row.
- `trainer/engine.js` — generate a day, simulate a plan, solve for par. Build-time only. No business
  numbers live in it.
- `scripts/stories.js` — picks one day per business, plans it the usual way and as par,
  writes `site/stories.json`. Runs inside `build.py`.
- `trainer/page.js` — the page: seven self-playing stories and the sources table.
- `build.py` — the ten doors (now the lessons, at `/doors/`) and the page shell.

The build asserts a banned-word list (no Amazon, no "optimize", no "dashboard"): the
operators this is for hate those words — see `research/vernacular.md`. That is why the vision line above lives in this README
and not on the page.
