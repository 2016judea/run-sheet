/* Run Sheet engine: generate a day, simulate a plan, solve for par.
 *
 * Pure functions over M (site/model.json, compiled from model/data/*.csv by
 * model/compile.py). No number in this file is a business fact: every cost, rate,
 * time and probability is read through P(), which throws if the research row is
 * missing. The only constants here are game shape (how many stops on a board, map
 * size) and they are labelled as such.
 *
 * Two kinds of day:
 *   ROUTES  courier, route_dist, final_mile_bulky, building_supply, ltl_pd
 *           one yard, a fleet, a board of stops with windows -> build routes
 *   LOADS   regional_tl, drayage
 *           one truck, a board of loads -> pick the chain that pays after deadhead
 */
(function (root) {
  "use strict";

  // ---- game shape (not business facts) -----------------------------------
  const BHH = 0.7124;           // Beardwood–Halton–Hammersley: tour ≈ 0.7124·√(n·area)
  const DAY_START_HR = 7;       // trucks roll at 07:00 on a routes day
  const TRUCKS = {              // trucks in the yard on a practice day
    courier: 3, route_dist: 3, final_mile_bulky: 2, building_supply: 3, ltl_pd: 3,
  };
  const MAX_BOARD = 24;         // most stops a phone map stays tappable with
  const SHIFT_HR = 10;          // a full routes day, for windows and the wave cut
  // private fleets and terminal P&D: delivery is paid for inside the product or the
  // linehaul, so the day is scored on what it cost, not on what it billed
  const COST_ONLY = new Set(["route_dist", "building_supply", "ltl_pd"]);
  // people on the truck (segments.csv: final mile is "two-man")
  const CREW = { final_mile_bulky: 2 };
  const SUBURBAN = new Set(["final_mile_bulky", "building_supply"]);
  const LOADS_MODE = new Set(["regional_tl", "drayage"]);

  // ---- seeded random -----------------------------------------------------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const between = (r, lo, hi) => lo + (hi - lo) * r();
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  // ---- parameters --------------------------------------------------------
  // P(M, id, scopes...) resolves the first scope that has the id, then "all".
  function row(M, id, scopes) {
    const p = M.params[id];
    if (!p) throw new Error("missing parameter " + id);
    for (const s of scopes.concat(["all"])) if (s && p[s]) return p[s];
    throw new Error("parameter " + id + " has no row for " + scopes.join("/"));
  }
  function has(M, id, scopes) {
    try { row(M, id, scopes); return true; } catch (e) { return false; }
  }
  const val = (M, id, scopes) => row(M, id, scopes).value;
  function draw(M, r, id, scopes) {
    const x = row(M, id, scopes);
    if (x.low == null || x.high == null) return x.value;
    return between(r, x.low, x.high);
  }

  // ---- shared costing ----------------------------------------------------
  function driverCostPerHr(M, seg, veh) {
    const w = val(M, "driver_wage_hr", [seg, veh]);
    const load = val(M, "driver_benefit_load_pct", [seg, veh]) / 100;
    return w * (1 + load);
  }

  // =======================================================================
  // ROUTES
  // =======================================================================
  // the truck each practice day puts in the yard (game shape; the truck's numbers
  // all come from vehicles.csv, and it must list the segment there)
  const FLEET = { courier: "cargo_van", route_dist: "box_26", final_mile_bulky: "box_26",
                  building_supply: "straight_flatbed", ltl_pd: "box_26",
                  regional_tl: "tractor_53dry", drayage: "day_cab_chassis" };
  function vehicleFor(M, seg) {
    const v = M.vehicles[FLEET[seg]];
    if (!v || !(v.segments || []).includes(seg)) throw new Error("no vehicle for " + seg);
    return v;
  }

  function serviceId(seg) {
    return { courier: "service_min_commercial", route_dist: "service_min_commercial",
             final_mile_bulky: "service_min_two_person_install",
             building_supply: "service_min_liftgate_pallet",
             ltl_pd: "service_min_liftgate_pallet" }[seg];
  }

  function stopRevenue(M, seg, o) {
    if (seg === "ltl_pd") {
      // net linehaul by the hundredweight, the tariff minimum, then fuel on top
      const cwt = val(M, "ltl_rate_per_cwt", [seg]);
      const min = val(M, "minimum_charge", [seg]);
      const fsc = has(M, "fuel_surcharge_basis", [seg]) ? val(M, "fuel_surcharge_basis", [seg]) / 100 : 0;
      return Math.max(min, cwt * o.lb / 100) * (1 + fsc);
    }
    return val(M, "rate_per_stop", [seg]);
  }

  function genRoutes(M, seg, seed) {
    const r = rng(seed);
    const veh = vehicleFor(M, seg);
    // stops per truck come from the segment's researched typical route. When a
    // full day will not fit on a phone map, the board is the morning wave: the
    // same density, a shorter clock, the yard's fixed cost prorated to match.
    const S_ = M.segments[seg];
    // no published typical? the midpoint of the published range
    const typ = Number(S_.stops_per_route_typ) || (Number(S_.stops_per_route_low) + Number(S_.stops_per_route_high)) / 2;
    if (!typ) throw new Error("segment " + seg + " has no stops_per_route_typ");
    const trucksN = TRUCKS[seg];
    const per = Math.min(Math.round(typ), Math.floor(MAX_BOARD / trucksN));
    const wave = per / typ;
    const shape = { stops: per * trucksN, trucks: trucksN };
    // map size from the segment's researched miles per day: a truck's zone is
    // the square whose stop tour (BHH) is a day's miles at a full day's stops
    const zone = val(M, "loaded_miles_per_day", [seg]) / (BHH * Math.sqrt(typ));
    const side = zone * Math.sqrt(trucksN * wave);
    const yard = { x: side * 0.5, y: side * 0.5 };
    // a "tight" stop gets a window from the bottom quarter of the published range
    const W = row(M, "time_window_hr", [seg]);
    const winHr = W.low != null ? W.low + (W.value - W.low) * 0.25 * r() : W.value;
    const svcId = serviceId(seg);
    const orders = [];
    // capacity is the binding resource on a board sized to ~85% of the yard
    const capLb = veh.payload_lb, capPal = veh.pallet_positions || 0;
    // freight moves on pallets only where the segment has a researched per-pallet load time
    const palletized = has(M, "load_min_per_pallet", [seg]);
    const totalLb = capLb * shape.trucks * 0.85 * Math.min(1, wave * 1.6);
    // stops keep a thumb's width apart on a 390px map (game shape, not geography)
    const gap = side * 0.085, placed = [yard];
    const spot = () => {
      let q;
      for (let k = 0; k < 80; k++) {
        q = { x: between(r, 0.04, 0.96) * side, y: between(r, 0.04, 0.96) * side };
        if (placed.every(o => Math.hypot(o.x - q.x, o.y - q.y) >= gap)) break;
      }
      placed.push(q);
      return q;
    };
    for (let i = 0; i < shape.stops; i++) {
      const lb = Math.round(totalLb / shape.stops * between(r, 0.5, 1.5));
      const pallets = capPal && palletized ? Math.max(1, Math.round(capPal * shape.trucks * 0.85 * Math.min(1, wave * 1.6) / shape.stops * between(r, 0.5, 1.5))) : 0;
      // a third of stops carry a tight window; the rest are "by end of day"
      const tight = r() < 0.34;
      const open = tight ? DAY_START_HR + between(r, 0.5, SHIFT_HR - winHr - 1) : DAY_START_HR;
      const close = tight ? open + winHr : DAY_START_HR + SHIFT_HR;
      const o = {
        id: i + 1, ...spot(),
        lb, pallets, open, close, tight,
        service: draw(M, r, svcId, [seg]),
      };
      o.revenue = stopRevenue(M, seg, o);
      orders.push(o);
    }
    const events = [];
    const pCall = val(M, "driver_callout", ["events", seg]);
    let trucks = shape.trucks;
    if (r() < pCall * shape.trucks * 4) { trucks -= 1; events.push({ kind: "driver_callout" }); }
    return {
      mode: "routes", seg, seed, veh: veh.id, yard, orders, trucks, events, wave, typ, side,
      costOnly: COST_ONLY.has(seg), crew: CREW[seg] || 1,
      // every booked stop goes out; only a call-off lets stops roll to tomorrow
      mayRoll: events.some(e => e.kind === "driver_callout"),
      // jobsite and home deliveries spread across the suburbs; the rest run in town
      speed: val(M, SUBURBAN.has(seg) ? "suburban_speed_mph" : "urban_speed_mph", [seg]),
    };
  }

  const roadMi = (M, a, b) =>
    Math.hypot(a.x - b.x, a.y - b.y) * val(M, "road_circuity", ["all"]);

  // simulate one route: list of order ids
  function simRoute(M, day, ids) {
    const veh = M.vehicles[day.veh];
    const byId = Object.fromEntries(day.orders.map(o => [o.id, o]));
    let t = DAY_START_HR + val(M, "pretrip_min", [day.seg]) / 60;
    const pal = ids.reduce((s, i) => s + byId[i].pallets, 0);
    if (has(M, "load_min_per_pallet", [day.seg])) t += pal * val(M, "load_min_per_pallet", [day.seg]) / 60;
    let at = day.yard, miles = 0, late = 0, lb = 0, revenue = 0;
    const stops = [];
    for (const i of ids) {
      const o = byId[i];
      const d = roadMi(M, at, o);
      miles += d; t += d / day.speed;
      const arrive = t;
      if (t < o.open) t = o.open;
      const isLate = arrive > o.close;
      if (isLate) late++; else revenue += o.revenue;
      t += o.service / 60;
      lb += o.lb;
      stops.push({ id: i, arrive, late: isLate });
      at = o;
    }
    if (ids.length) { const d = roadMi(M, at, day.yard); miles += d; t += d / day.speed; }
    const hours = ids.length ? t - DAY_START_HR : 0;
    return {
      ids, stops, miles, hours, late, revenue, lb, pal,
      overLb: lb > veh.payload_lb, overPal: veh.pallet_positions ? pal > veh.pallet_positions : false,
      overHos: hours > val(M, "hos_14hr_window", ["rules"]),
      back: t,
    };
  }

  function simRoutes(M, day, plan) {
    const veh = M.vehicles[day.veh];
    const drvHr = driverCostPerHr(M, day.seg, day.veh) * day.crew;
    const routes = plan.map(ids => simRoute(M, day, ids));
    const served = new Set(plan.flat());
    const missed = day.orders.filter(o => !served.has(o.id));
    const late = routes.reduce((s, x) => s + x.late, 0);
    const used = routes.filter(x => x.ids.length).length;
    const miles = routes.reduce((s, x) => s + x.miles, 0);
    const hours = routes.reduce((s, x) => s + x.hours, 0);
    // late or left on the dock: the stop pays nothing today, and where the
    // segment publishes a redelivery fee, that is what tomorrow's attempt costs
    const refee = has(M, "redelivery_fee", [day.seg]) ? val(M, "redelivery_fee", [day.seg]) : 0;
    const byId = Object.fromEntries(day.orders.map(o => [o.id, o]));
    const cost = {
      driver: hours * drvHr,
      truck_miles: miles * veh.cost_per_mile_ex_driver,
      fixed: day.trucks * veh.fixed_cost_per_day * day.wave,
      redelivery: (late + missed.length) * refee,
    };
    const revenue = routes.reduce((s, x) => s + x.revenue, 0);
    const totalCost = Object.values(cost).reduce((a, b) => a + b, 0);
    const done = day.orders.length - missed.length - late;
    const lbOut = routes.reduce((s, x) => s + x.lb, 0);
    const hosK = routes.findIndex(x => x.overHos);
    const invalid = routes.some(x => x.overLb || x.overPal) ? "A truck is over capacity"
      : hosK >= 0 ? `Truck ${hosK + 1} runs past the ${val(M, "hos_14hr_window", ["rules"])}-hour day`
      : used > day.trucks ? "More trucks than drivers"
      : (!day.mayRoll && missed.length) ? `${missed.length} stop${missed.length > 1 ? "s" : ""} still on the dock` : null;
    // what the day cost the business: spend, redeliveries, and the billing lost on late or rolled stops
    const lost = day.orders.filter(o => !served.has(o.id) || routes.some(x => x.stops.some(st => st.id === o.id && st.late))).reduce((a, o) => a + o.revenue, 0);
    return {
      routes, missed: missed.map(o => o.id), late, used, miles, hours, revenue, cost, totalCost,
      profit: revenue - totalCost, dayCost: totalCost + lost, invalid,
      kpi: {
        profit: revenue - totalCost,
        cost_per_stop: done ? totalCost / done : null,
        stops_per_hour: hours ? (day.orders.length - missed.length) / hours : 0,
        on_time_pct: 100 * done / day.orders.length,
        revenue_per_truck_day: used ? revenue / used : 0,
        weight_util_pct: used ? 100 * lbOut / (used * veh.payload_lb) : 0,
        miles, trucks: used, overtime_hours: routes.reduce((s, x) => s + Math.max(0, x.hours - 8), 0),
      },
    };
  }

  // par: savings merge under capacity, then relocate/2-opt on profit.
  // init (optional): start the local search from this plan instead of the savings merge
  // (a full uploaded day, where the merge strands stops); passes caps the local search.
  function solveRoutes(M, day, init, passes) {
    const veh = M.vehicles[day.veh];
    const score = plan => {
      const s = simRoutes(M, day, plan);
      if (s.invalid && !(s.invalid.includes("on the dock"))) return -1e12 - 1e6 * s.hours;
      return s.profit - 1e-3 * s.miles - (day.mayRoll ? 0 : 1e6 * s.missed.length);
    };
    let routes = init ? init.map(r => r.slice()).filter(r => r.length) : day.orders.map(o => [o.id]);
    const byId = Object.fromEntries(day.orders.map(o => [o.id, o]));
    const fits = ids => ids.reduce((s, i) => s + byId[i].lb, 0) <= veh.payload_lb &&
      (!veh.pallet_positions || ids.reduce((s, i) => s + byId[i].pallets, 0) <= veh.pallet_positions);
    // savings, ordered by Clarke-Wright saving
    const sav = [];
    if (!init) for (const a of day.orders) for (const b of day.orders) if (a.id < b.id)
      sav.push([roadMi(M, day.yard, a) + roadMi(M, day.yard, b) - roadMi(M, a, b), a.id, b.id]);
    sav.sort((p, q) => q[0] - p[0]);
    for (const [, a, b] of sav) {
      const ra = routes.find(x => x.includes(a)), rb = routes.find(x => x.includes(b));
      if (ra === rb) continue;
      const cands = [ra.concat(rb), rb.concat(ra), ra.concat(rb.slice().reverse()), ra.slice().reverse().concat(rb)];
      let best = null, bestS = -Infinity;
      const others = routes.filter(x => x !== ra && x !== rb);
      for (const c of cands) if (fits(c)) {
        const s = score(others.concat([c]));
        if (s > bestS) { bestS = s; best = c; }
      }
      if (best && (bestS >= score(routes) || routes.length > day.trucks)) routes = others.concat([best]);
    }
    // more routes than drivers: drop the cheapest stops off the shortest routes
    while (routes.length > day.trucks) {
      routes.sort((p, q) => p.length - q.length);
      const orphan = routes.shift();
      for (const id of orphan) {
        let placed = false, bs = -Infinity, bp = null;
        for (let k = 0; k < routes.length; k++) for (let j = 0; j <= routes[k].length; j++) {
          const c = routes[k].slice(); c.splice(j, 0, id);
          if (!fits(c)) continue;
          const p = routes.slice(); p[k] = c;
          const s = score(p);
          if (s > bs) { bs = s; bp = p; placed = true; }
        }
        if (placed) routes = bp;
      }
    }
    // local search: relocate any stop anywhere (including off the board), keep if better
    if (init) while (routes.length < day.trucks) routes.push([]);
    let cur = score(routes), improved = true, guard = 0;
    while (improved && guard++ < (passes || 60)) {
      improved = false;
      const all = routes.flat();
      for (const id of all.concat(day.orders.map(o => o.id).filter(i => !all.includes(i)))) {
        const base = routes.map(x => x.filter(i => i !== id));
        let best = null, bs = score(base);
        for (let k = 0; k < base.length; k++) for (let j = 0; j <= base[k].length; j++) {
          const c = base[k].slice(); c.splice(j, 0, id);
          if (!fits(c)) continue;
          const p = base.slice(); p[k] = c;
          const s = score(p);
          if (s > bs + 1e-6) { bs = s; best = p; }
        }
        if (!best) best = base;
        if (bs > cur + 1e-6) { routes = best; cur = bs; improved = true; }
      }
    }
    while (routes.length < day.trucks) routes.push([]);
    return routes.slice(0, day.trucks);
  }

  // =======================================================================
  // LOADS
  // =======================================================================
  function hav(a, b) {
    const R = 3958.8, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const cityMi = (M, a, b) => a === b ? 0 : hav(a, b) * val(M, "road_circuity", ["all"]);

  // Upper Midwest lanes for regional TL; a port-and-warehouses day for drayage.
  const CITIES = [
    { id: "MSP", name: "Minneapolis", lat: 44.98, lon: -93.27 },
    { id: "CHI", name: "Chicago", lat: 41.88, lon: -87.63 },
    { id: "MKE", name: "Milwaukee", lat: 43.04, lon: -87.91 },
    { id: "MSN", name: "Madison", lat: 43.07, lon: -89.40 },
    { id: "DSM", name: "Des Moines", lat: 41.59, lon: -93.62 },
    { id: "OMA", name: "Omaha", lat: 41.26, lon: -95.93 },
    { id: "FSD", name: "Sioux Falls", lat: 43.55, lon: -96.73 },
    { id: "FAR", name: "Fargo", lat: 46.88, lon: -96.79 },
    { id: "DLH", name: "Duluth", lat: 46.79, lon: -92.10 },
    { id: "KC",  name: "Kansas City", lat: 39.10, lon: -94.58 },
    { id: "STL", name: "St. Louis", lat: 38.63, lon: -90.20 },
    { id: "GRB", name: "Green Bay", lat: 44.51, lon: -88.01 },
  ];
  // drayage: the Chicago rail ramps and the warehouse belt around them
  const DRAY = [
    { id: "RMP1", name: "Ramp — Joliet", lat: 41.46, lon: -88.13, ramp: true },
    { id: "RMP2", name: "Ramp — Cicero", lat: 41.85, lon: -87.75, ramp: true },
    { id: "ELW", name: "Elwood", lat: 41.40, lon: -88.11 },
    { id: "BBK", name: "Bolingbrook", lat: 41.70, lon: -88.07 },
    { id: "ROM", name: "Romeoville", lat: 41.65, lon: -88.09 },
    { id: "AUR", name: "Aurora", lat: 41.76, lon: -88.32 },
    { id: "ELK", name: "Elk Grove", lat: 42.00, lon: -87.97 },
    { id: "UNV", name: "University Park", lat: 41.44, lon: -87.68 },
    { id: "MNH", name: "Minooka", lat: 41.45, lon: -88.26 },
  ];

  function genLoads(M, seg, seed) {
    const r = rng(seed);
    const dray = seg === "drayage";
    const places = dray ? DRAY : CITIES;
    const home = places[0];
    const days = dray ? 1 : 5;
    const n = dray ? 9 : 14;
    const loads = [];
    const mk = (o, d, dayN, ready) => {
      const miles = cityMi(M, o, d);
      // linehaul plus the fuel surcharge the segment publishes
      const fsc = val(M, "fuel_surcharge_basis", [seg]);
      const rate = dray ? draw(M, r, "rate_per_load", [seg]) * (1 + fsc / 100)
                        : miles * (draw(M, r, "rate_per_mile_spot", [seg]) + fsc);
      return { id: 0, o: o.id, d: d.id, miles, day: dayN, ready, close: ready + 4, rate, dwell: draw(M, r, "dock_dwell_hr", [seg]) };
    };
    // a hidden chain that runs: each load picks up where the last one delivered,
    // at a time the truck can actually make under the hours rules (checked with
    // simLoads itself). The rest of the board is the noise around it.
    const ramps = places.filter(p => p.ramp), yards = places.filter(p => !p.ramp);
    const probe = { mode: "loads", seg, home: home.id, places, days, loads, speed: val(M, dray ? "urban_speed_mph" : "highway_speed_mph", [seg]) };
    const chain = [];
    let at = home, abs = 7;
    for (let k = 0; k < 12 && loads.length < n - 4; k++) {
      let d;
      if (dray) d = at.ramp ? pick(r, yards) : pick(r, ramps);
      else do { d = pick(r, places); } while (d === at);
      let h = abs % 24, dd = Math.floor(abs / 24);
      if (h < 6) h = 6; else if (h > 16) { dd += 1; h = 7; }
      if (dd >= days) break;
      const L = mk(at, d, dd, h);
      L.id = 1000 + k; loads.push(L);
      const sim = simLoads(M, probe, chain.concat([L.id]));
      if (sim.invalid) { loads.pop(); break; }
      chain.push(L.id);
      abs = sim.legs[sim.legs.length - 1].at + between(r, 0.3, 1.5);
      at = dray && !d.ramp ? pick(r, yards) : d;
    }
    while (loads.length < n) {
      let o, d;
      if (dray) {
        const ramp = pick(r, ramps), wh = pick(r, yards);
        [o, d] = r() < 0.6 ? [ramp, wh] : [wh, ramp];
      } else { o = pick(r, places); do { d = pick(r, places); } while (d === o); }
      loads.push(mk(o, d, Math.floor(r() * days), 6 + between(r, 0, 8)));
    }
    loads.sort((a, b) => a.day - b.day || a.ready - b.ready);
    loads.forEach((l, i) => l.id = i + 1);
    return { mode: "loads", seg, seed, home: home.id, places, days, loads, events: [],
             speed: val(M, dray ? "urban_speed_mph" : "highway_speed_mph", [seg]) };
  }

  function simLoads(M, day, chain) {
    const veh = vehicleFor(M, day.seg);
    const P = Object.fromEntries(day.places.map(p => [p.id, p]));
    const byId = Object.fromEntries(day.loads.map(l => [l.id, l]));
    const drive11 = val(M, "hos_11hr_drive", ["rules"]);
    const win14 = val(M, "hos_14hr_window", ["rules"]);
    const freeHr = val(M, "detention_free_hr", [day.seg]);
    const detRate = val(M, "detention_rate_hr", [day.seg]);
    // clock in absolute hours from Monday 00:00; a duty day starts at 06:00
    let t = 6, dayStart = 6, driven = 0, at = day.home;
    let loaded = 0, empty = 0, revenue = 0, detention = 0, bad = null;
    const legs = [];
    function drive(mi) {
      let left = mi / day.speed;
      while (left > 1e-9) {
        const can = Math.min(drive11 - driven, dayStart + win14 - t);
        if (can <= 1e-9) { t = Math.max(t, dayStart + win14) + 10; dayStart = t; driven = 0; continue; }
        const step = Math.min(can, left);
        t += step; driven += step; left -= step;
      }
    }
    function work(hr) {
      if (t + hr > dayStart + win14) { t = Math.max(t, dayStart + win14) + 10; dayStart = t; driven = 0; }
      t += hr;
    }
    for (const id of chain) {
      const l = byId[id];
      const dh = cityMi(M, P[at], P[l.o]);
      empty += dh; drive(dh);
      const open = l.day * 24 + l.ready, close = l.day * 24 + l.close;
      if (t > close) { bad = `missed the pickup window on load ${id}`; break; }
      if (t < open) { t = open; if (t - dayStart > win14) { dayStart = t; driven = 0; } }
      work(l.dwell);
      detention += Math.max(0, l.dwell - freeHr) * detRate;
      drive(l.miles); loaded += l.miles;
      work(l.dwell);
      detention += Math.max(0, l.dwell - freeHr) * detRate;
      revenue += l.rate;
      legs.push({ id, deadhead: dh, at: t });
      at = l.d;
    }
    const home = cityMi(M, P[at], P[day.home]);
    empty += home; drive(home);
    const endBy = (day.days - 1) * 24 + 6 + win14;
    if (!bad && t > endBy + (day.days > 1 ? 24 : 0)) bad = "not home by the end of the week";
    const miles = loaded + empty;
    const perMile = has(M, "driver_pay_per_mile", [day.seg]);
    const cpm = veh.cost_per_mile_ex_driver + (perMile ? val(M, "driver_pay_per_mile", [day.seg]) * (1 + val(M, "driver_benefit_load_pct", [day.seg]) / 100) : 0);
    const driverHr = perMile ? 0 : driverCostPerHr(M, day.seg, veh.id) * (t - 6);
    const cost = { truck_and_driver_miles: miles * cpm, driver_hours: driverHr, fixed: day.days * veh.fixed_cost_per_day };
    const totalCost = Object.values(cost).reduce((a, b) => a + b, 0);
    revenue += detention;
    return {
      chain, legs, loaded, empty, miles, revenue, detention, cost, totalCost, profit: revenue - totalCost,
      invalid: bad, end: t,
      kpi: {
        profit: revenue - totalCost,
        rate_per_mile_all_in: miles ? (revenue - detention) / miles : 0,
        empty_mile_pct: miles ? 100 * empty / miles : 0,
        loads: chain.length, miles,
      },
    };
  }

  function solveLoads(M, day) {
    let best = [], bestP = simLoads(M, day, []).profit;
    const ids = day.loads.map(l => l.id);
    const maxLen = day.seg === "drayage" ? 6 : 7;
    let budget = 200000;
    (function dfs(chain) {
      if (budget-- < 0) return;
      for (const id of ids) {
        if (chain.includes(id)) continue;
        const c = chain.concat([id]);
        const s = simLoads(M, day, c);
        if (s.invalid && !s.invalid.startsWith("not home")) continue;
        if (!s.invalid && s.profit > bestP) { bestP = s.profit; best = c; }
        if (c.length < maxLen) dfs(c);
      }
    })([]);
    return best;
  }

  // a must-serve board has to be doable: whatever par cannot place, the yard
  // never booked. Par is kept on the day so the debrief does not solve twice.
  function feasible(M, day) {
    for (let k = 0; k < 4; k++) {
      const par = solveRoutes(M, day);
      const s = simRoutes(M, day, par);
      if (day.mayRoll || !s.missed.length) { day.par = par; return day; }
      const drop = new Set(s.missed);
      const keep = day.orders.filter(o => !drop.has(o.id));
      const remap = Object.fromEntries(keep.map((o, i) => [o.id, i + 1]));
      keep.forEach(o => o.id = remap[o.id]);
      day.orders = keep;
    }
    day.par = solveRoutes(M, day);
    return day;
  }

  // =======================================================================
  const api = {
    LOADS_MODE, DAY_START_HR,
    generate: (M, seg, seed) => LOADS_MODE.has(seg) ? genLoads(M, seg, seed) : feasible(M, genRoutes(M, seg, seed)),
    simulate: (M, day, plan) => day.mode === "loads" ? simLoads(M, day, plan) : simRoutes(M, day, plan),
    solve: (M, day, init, passes) => day.mode === "loads" ? solveLoads(M, day) : solveRoutes(M, day, init, passes),
    row, has,
  };
  if (typeof module !== "undefined") module.exports = api; else root.RunSheet = api;
})(this);
