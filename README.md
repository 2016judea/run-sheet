# Run Sheet (was Dock Doors) — https://run-sheet-yard.vercel.app

A practice yard for small fleets — couriers, route trucks, furniture and building-supply
delivery, LTL pickup and delivery, regional truckload, drayage. You plan a real-shaped
day; a simulator prices it with published wages, diesel, rates and the hours-of-service
rules; a solver plans the same day; the gap is the lesson, and each lesson links to one
of the ten doors.

    python3 build.py              # model/data/*.csv -> site/model.json, trainer + doors -> site/
    python3 scripts/deploy.py     # Vercel REST deploy (needs VERCEL_TOKEN)

- `model/SCHEMA.md` — the data model. Read first.
- `model/data/*.csv` — every number, each row with a source URL and a confidence.
- `model/compile.py` — drops unsourced rows; fails the build if the engine needs a number
  that has no surviving row.
- `trainer/engine.js` — generate a day, simulate a plan, solve for par. No business
  numbers live in it.
- `trainer/ui.js` — the four screens. State is in the URL hash (`#courier/4821`).
- `build.py` — the ten doors (now the lessons, at `/doors/`) and the page shell.

The build asserts a banned-word list (no Amazon, no "optimize", no "dashboard"): the
operators this is for hate those words — see `research/vernacular.md`.
