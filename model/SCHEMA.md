# The data model

grounded: 2026-10-06 — Aidan: "change the dock doors product to an optimization training
tool for small local delivery companies and B2B transportation freight businesses ... data
model first. Then research to fill it."

The tool is a flight simulator for a dispatcher. A **scenario** is one operating day for one
kind of business. The player makes the **decisions** that business makes every day; a
simulator prices every choice with the **parameters**; the debrief compares the player to
**par** (what a solver found) on the **KPIs** that business is actually graded on, and names
the **door** (one of the ten ideas) the gap teaches.

Everything a scenario is built from is a researched row with a source. Scenarios themselves
are generated, never researched — same seed, same day.

```
segment ──< vehicle_fit >── vehicle
   │                           │
   ├──< parameter (cost · revenue · norm · market)   every number, sourced
   ├──< kpi                    what the segment is graded on
   ├──< decision ──> door      what it chooses daily, and the lesson behind it
   └──< event                  what goes wrong, and how often
rule                           law that bounds every scenario (HOS, CDL, weight)

scenario = generate(segment, seed, difficulty)
         → depot + fleet (vehicles × drivers) + orders (stops) + events
player plan → simulate(parameters, rules) → KPIs  vs  par = solve(scenario) → debrief(door)
```

## Researched tables (`model/data/*.csv`)

Every researched row carries `source_name, source_url, as_of, confidence`.
`confidence` is one of `published` (the number is printed at the URL), `derived` (computed
from published numbers — say how in `note`), `estimate` (practitioner range, e.g. a forum or
trade-press quote; never used as par, only as a range). A row with no URL does not ship.

### segments.csv — the kinds of business
| column | meaning |
|---|---|
| id | `courier`, `route_dist`, `final_mile_bulky`, `building_supply`, `ltl_pd`, `regional_tl`, `drayage` |
| name | what they call themselves ("courier", "we run routes", "P&D") |
| who_dispatches | the person who plans the day, in their words |
| revenue_basis | `per_stop` · `per_route_day` · `per_mile` · `per_cwt` · `per_load` · `per_hour` |
| fleet_size_low / fleet_size_typ / fleet_size_high | power units or vehicles |
| day_shape | one line: when freight arrives, when trucks leave, cutoffs |
| stops_per_route_low / _typ / _high | per vehicle per day |
| graded_on | the two or three numbers that decide whether they make money |
| hardest_daily_decision | in their words |
| note, source_* | |

### vehicles.csv — what they drive
| column | meaning |
|---|---|
| id | `cargo_van`, `box_16`, `box_26`, `straight_flatbed`, `tractor_53dry`, `tractor_reefer`, `tractor_flatbed`, `day_cab_chassis` |
| name, fhwa_class, gvwr_lb | |
| cdl_required | yes/no (and why: >26,000 lb) |
| payload_lb, cube_ft3, pallet_positions | |
| mpg | loaded, real-world |
| cost_per_mile_ex_driver | fuel + maintenance + tires, with the fuel price assumed in `note` |
| fixed_cost_per_day | lease/payment + insurance + permits, per operating day |
| liftgate_common | yes/no |
| note, source_* | |

`vehicle_fit` is a column-free join implied by `segments.csv` listing nothing — instead
each vehicle row lists `segments` (pipe-separated ids it is used in).

### parameters.csv — every other number, long format
| column | meaning |
|---|---|
| id | snake_case, unique |
| kind | `cost` · `revenue` · `norm` (time and motion) · `market` (spot rates, fuel, wages) |
| scope | a segment id, a vehicle id, or `all` |
| name | plain English |
| value, low, high, unit | `value` is what a scenario uses; `low/high` bound the random draw |
| note, source_name, source_url, as_of, confidence | |

The ids the simulator reads (research must fill each one per relevant scope):

- **cost** — `driver_wage_hr` (by vehicle class), `driver_benefit_load_pct`, `driver_pay_per_mile`
  (TL), `overtime_multiplier`, `fuel_price_gal` (diesel, gas), `maintenance_per_mile`,
  `tire_per_mile`, `insurance_per_unit_yr`, `truck_payment_mo`, `trailer_payment_mo`,
  `dispatcher_wage_hr`, `overhead_pct_revenue`, `cost_per_mile_all_in` (benchmark)
- **revenue** — `rate_per_stop`, `rate_per_route_day`, `rate_per_mile_spot`,
  `rate_per_mile_contract`, `fuel_surcharge_basis`, `ltl_rate_per_cwt` (by class band),
  `minimum_charge`, `detention_rate_hr`, `detention_free_hr`, `liftgate_fee`,
  `residential_fee`, `inside_delivery_fee`, `redelivery_fee`, `layover_fee`, `tonu_fee`,
  `failed_delivery_chargeback`
- **norm** — `service_min_residential`, `service_min_commercial`, `service_min_liftgate_pallet`,
  `service_min_two_person_install`, `load_min_per_pallet`, `dock_dwell_hr` (pickup and
  delivery), `urban_speed_mph`, `suburban_speed_mph`, `highway_speed_mph`, `pretrip_min`,
  `time_window_hr` (typical customer window), `on_time_tolerance_min`, `failed_attempt_pct`,
  `deadhead_pct`, `loaded_miles_per_day`
- **market** — `driver_turnover_pct`, `diesel_price_trend`, `spot_vs_contract_spread`,
  `small_carrier_count_by_size` (FMCSA), `small_carrier_margin` (operating ratio)

### kpis.csv — what each segment is graded on
| column | meaning |
|---|---|
| id | `cost_per_stop`, `stops_per_hour`, `revenue_per_truck_day`, `on_time_pct`, `cube_util_pct`, `weight_util_pct`, `empty_mile_pct`, `rate_per_mile_all_in`, `operating_ratio`, `detention_collected_pct`, `first_attempt_pct`, `driver_ot_hours`, `cost_per_cwt` |
| name, formula | formula over simulator outputs, e.g. `(cost_driver + cost_vehicle) / stops_completed` |
| unit, better | `higher` / `lower` |
| segments | pipe-separated |
| bench_low, bench_typ, bench_high | published benchmark where one exists |
| note, source_* | |

### decisions.csv — what the player practises
| column | meaning |
|---|---|
| id | `route_build`, `stop_sequence`, `load_build`, `fleet_size_today`, `accept_load`, `price_quote`, `shift_start`, `reassign_after_callout`, `add_on_order`, `consolidate_vs_direct`, `drop_vs_live`, `backhaul` |
| segments | where it applies |
| when | time of day it is made |
| tradeoff | the thing it costs either way, in one line |
| common_mistake | what people actually do wrong, sourced if possible |
| kpis | which KPIs it moves |
| door | slug of the door that teaches it (`build.py` DOORS) |
| note, source_* | |

### events.csv — what goes wrong
| column | meaning |
|---|---|
| id | `driver_callout`, `breakdown`, `add_on_order`, `receiver_detention`, `customer_not_home`, `traffic_incident`, `weather`, `load_cancel_tonu`, `shipper_not_ready`, `wrong_freight` |
| segments, probability_per_day, probability_basis | per driver, per stop or per load — say which |
| impact | minutes, dollars, or a stop dropped |
| note, source_* | |

### rules.csv — law that bounds every scenario
| column | meaning |
|---|---|
| id | `hos_11hr_drive`, `hos_14hr_window`, `hos_30min_break`, `hos_60_70`, `short_haul_150mi`, `cdl_threshold`, `usdot_threshold`, `gross_weight_80k`, `axle_limits`, `medical_card`, `eld_exemption`, `cdl_drug_clearinghouse` |
| applies_to | vehicle ids / segments |
| statement | plain English, exact numbers |
| cfr | citation, e.g. `49 CFR 395.3(a)(3)` |
| source_* | |

## Generated, never researched

- **scenario** — `{id, segment, seed, difficulty, depot{x,y,open,close}, fleet[{vehicle,
  driver{wage, hos_left}}], orders[{id, x, y, lb, ft3, pallets, window_open,
  window_close, service_min, revenue, accessorials[]}], events[{t, kind, target}]}` drawn
  from the researched ranges.
- **plan** — the player's answer: `routes[{vehicle, stops[]}]`, plus any accept/decline,
  quote or start-time choices the scenario asks for.
- **result** — `simulate(scenario, plan)` → the KPI vector, cost lines, and every rule
  violation.
- **par** — `simulate(scenario, solve(scenario))`. The gap between result and par, on the
  segment's `graded_on` KPIs, is the score.
