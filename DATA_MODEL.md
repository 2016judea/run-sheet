# Data model: your own day

grounded: 2026-10-15 — Aidan: "move away from the gifting methodology ... they get _some_
features/data/learnings for free. But they must pay for the full thing." The paid unit for
Run Sheet is the method run on the operator's OWN day. Written from the need alone, before
looking at what route exports carry; the check against reality is at the bottom.

The game model (`model/SCHEMA.md`) prices a made-up day. This one prices theirs.

```
upload ──< stop >── route (as they ran it)
   │
   └── yard, fleet, segment  →  plan × 3 (as run · the hand rule · par) → run sheet per truck
```

## Entities

### day (one upload)
| field | answers |
|---|---|
| segment | which published wages, rates, service times and redelivery fees price it |
| yard (lat, lon) | where every truck starts and ends |
| trucks | how many drivers they had that morning: the most the plan may use |
| vehicle | payload and pallet positions: what fits on one truck |
| date | which day it was (labels only) |

### stop
| field | answers |
|---|---|
| address or lat/lon | where it is: every mile on the sheet comes from here |
| weight lb, pallets | whether it fits on the truck it was given |
| window open / close | whether a plan gets there on time, and what waiting costs |
| service minutes | how long the truck sits there |
| route (as run) | which truck took it, so "as you ran it" is THEIR plan, not ours |
| sequence (as run) | the order that truck ran it |

### plan (computed, three per day)
| field | answers |
|---|---|
| trucks used | the headline: did the day need every truck that went out |
| miles, hours, overtime | what the day cost in driving and on the clock |
| late stops | what each plan broke |
| cost (driver, miles, fixed, redelivery) | the dollar gap between plans |

### run sheet (paid)
| field | answers |
|---|---|
| truck → ordered stops, ETA, window, late flag | what to hand each driver tomorrow |
| CSV | drop it back into whatever they dispatch from |

## Reality check (2026-10-15)

| field | source | fills? |
|---|---|---|
| address | every route export (Circuit, Route4Me, OptimoRoute, Onfleet, a spreadsheet) | yes |
| lat/lon | in most exports; otherwise the free Census geocoder (`/api/plan`) | yes, US addresses |
| route, sequence | in every export that came out of a planner; absent from a raw order list | yes, or "the usual way" stands in, labelled |
| window | in planner exports; often absent | yes, or open all day |
| weight / pallets | rarely in a courier export; present in distribution and LTL | partial: no weight means the clock is the only limit, and the page says so |
| service minutes | rarely | default to the segment's published dwell (`model/data`) |
| wages, $/mile, fees | `model/data/*.csv`, sourced per segment | yes |
| road miles | straight line × published circuity, not a road network | approximate, stated |

Nothing the headline needs is unfillable. Truckload and drayage (a load board, not a stop
list) are out of this slice: their upload is a different file.
