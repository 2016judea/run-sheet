# Run Sheet (was Dock Doors) — https://run-sheet-yard.vercel.app

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
operators this is for hate those words — see `research/vernacular.md`.
