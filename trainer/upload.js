/* Your own day: an operator's stop list becomes an engine day, planned three ways.
 *
 *   as run     their own routes, if the file says which truck took which stop
 *              (else "the usual way": dealt in file order, each truck nearest-next)
 *   the rule   trainer/rules.js, the fix a dispatcher can run by hand
 *   par        trainer/engine.js solve(), never worse than the rule
 *
 * Input is already parsed and geocoded: { seg, trucks, yard:{lat,lon}, stops:[{lat,lon,
 * label, lb, pallets, open, close, service, route, seq}] }. Hours are decimal (13.5 = 1:30 pm).
 * DATA_MODEL.md is the spec.
 */
(function (root) {
  "use strict";
  const E = typeof module !== "undefined" ? require("./engine.js") : root.RunSheet;
  const R = typeof module !== "undefined" ? require("./rules.js") : root.RunSheetRules;

  const SEGS = ["courier", "route_dist", "final_mile_bulky", "building_supply", "ltl_pd"];
  const VEH = { courier: "cargo_van", route_dist: "box_26", final_mile_bulky: "box_26", building_supply: "straight_flatbed", ltl_pd: "box_26" };
  const SVC = { courier: "service_min_commercial", route_dist: "service_min_commercial",
                final_mile_bulky: "service_min_two_person_install", building_supply: "service_min_liftgate_pallet",
                ltl_pd: "service_min_liftgate_pallet" };
  const COST_ONLY = new Set(["route_dist", "building_supply", "ltl_pd"]);
  const SUBURBAN = new Set(["final_mile_bulky", "building_supply"]);
  const MAX_STOPS = 120, MAX_TRUCKS = 12;
  const DAY0 = 7, DAY1 = 17;

  function revenue(M, seg, o) {
    if (seg === "ltl_pd") {
      const v = (id) => E.row(M, id, [seg]).value;
      const fsc = E.has(M, "fuel_surcharge_basis", [seg]) ? v("fuel_surcharge_basis") / 100 : 0;
      return Math.max(v("minimum_charge"), v("ltl_rate_per_cwt") * (o.lb || 0) / 100) * (1 + fsc);
    }
    return E.row(M, "rate_per_stop", [seg]).value;
  }

  // a finite number, or NaN. Number() alone turns null and "" into 0, and the global isFinite
  // then passes them: a {lat:null} stop landed 4,500 miles from the yard and open:null became
  // a midnight window (2026-10-18).
  const num = v => (v == null || v === "" || typeof v === "boolean") ? NaN : Number(v);
  const fin = v => Number.isFinite(num(v));
  const hasLoc = s => !!s && fin(s.lat) && fin(s.lon);

  // lat/lon -> miles east/north of the yard (fine at city scale)
  function project(yard, p) {
    const k = Math.cos(yard.lat * Math.PI / 180);
    return { x: (p.lon - yard.lon) * 69.17 * k, y: (p.lat - yard.lat) * 69.05 };
  }

  function buildDay(M, inp) {
    const seg = SEGS.includes(inp.seg) ? inp.seg : "courier";
    const stops = (inp.stops || []).filter(hasLoc).map(s => ({ ...s, lat: num(s.lat), lon: num(s.lon) }));
    if (!stops.length) throw new Error("No stops with a location.");
    if (stops.length > MAX_STOPS) throw new Error(`One day at a time: ${MAX_STOPS} stops at most (this file has ${stops.length}).`);
    const yard = hasLoc(inp.yard) ? { lat: num(inp.yard.lat), lon: num(inp.yard.lon) }
      : { lat: stops.reduce((a, s) => a + s.lat, 0) / stops.length, lon: stops.reduce((a, s) => a + s.lon, 0) / stops.length };
    const veh = M.vehicles[VEH[seg]];
    const svc = E.row(M, SVC[seg], [seg]).value;
    const routesIn = [...new Set(stops.map(s => s.route).filter(Boolean))];
    const typ = Number(M.segments[seg].stops_per_route_typ) || 20;
    let trucks = Math.round(Number(inp.trucks)) || routesIn.length || Math.ceil(stops.length / typ);
    trucks = Math.max(1, Math.min(MAX_TRUCKS, trucks, stops.length));
    const orders = stops.map((s, i) => {
      const open = fin(s.open) ? num(s.open) : DAY0, close = fin(s.close) ? num(s.close) : DAY1 + 2;
      const o = {
        id: i + 1, ...project(yard, s), label: String(s.label || "").slice(0, 80),
        lb: Math.max(0, Number(s.lb) || 0), pallets: Math.max(0, Math.round(Number(s.pallets) || 0)),
        open, close, tight: fin(s.open) || fin(s.close),
        service: Number(s.service) > 0 ? Number(s.service) : svc,
        route: s.route || "", seq: Number(s.seq) || i,
      };
      o.revenue = revenue(M, seg, o);
      return o;
    });
    const day = {
      mode: "routes", seg, veh: veh.id, yard: { x: 0, y: 0 }, orders, trucks, events: [], wave: 1,
      costOnly: COST_ONLY.has(seg), crew: seg === "final_mile_bulky" ? 2 : 1, mayRoll: false,
      speed: E.row(M, SUBURBAN.has(seg) ? "suburban_speed_mph" : "urban_speed_mph", [seg]).value,
      yardLatLon: yard, weights: orders.some(o => o.lb > 0),
    };
    day.asRun = routesIn.length ? routesIn.map(r => orders.filter(o => o.route === r).sort((a, b) => a.seq - b.seq).map(o => o.id)) : null;
    if (day.asRun && day.asRun.length > trucks) day.trucks = Math.min(MAX_TRUCKS, day.asRun.length);
    // A row with an empty route cell in a file that has routes still went out on some truck. Before
    // 2026-10-18 it was left off every as-run route, charged to 'as run' as a stop on the dock, and
    // the gap to par was invented. It is dealt, in file order, onto the end of the route that ends nearest it.
    day.unrouted = 0;
    if (day.asRun) {
      const byId = Object.fromEntries(orders.map(o => [o.id, o]));
      for (const o of orders.filter(o => !o.route)) {
        const end = ids => ids.length ? byId[ids[ids.length - 1]] : day.yard;
        let best = 0, bd = Infinity;
        day.asRun.forEach((ids, k) => { const e = end(ids), d = Math.hypot(e.x - o.x, e.y - o.y); if (d < bd) { bd = d; best = k; } });
        day.asRun[best].push(o.id); day.unrouted++;
      }
    }
    return day;
  }

  // the usual way when the file carries no routes: deal in file order, nearest-next
  function usual(M, day) {
    const veh = M.vehicles[day.veh];
    const plan = Array.from({ length: day.trucks }, () => []), load = plan.map(() => ({ lb: 0, pal: 0 }));
    day.orders.forEach((o, i) => {
      for (let j = 0; j < day.trucks; j++) {
        const k = (i + j) % day.trucks;
        if (load[k].lb + o.lb <= veh.payload_lb && (!veh.pallet_positions || load[k].pal + o.pallets <= veh.pallet_positions)) {
          plan[k].push(o.id); load[k].lb += o.lb; load[k].pal += o.pallets; return;
        }
      }
      plan[i % day.trucks].push(o.id);
    });
    const byId = Object.fromEntries(day.orders.map(o => [o.id, o]));
    return plan.map(ids => {
      const left = ids.slice(), out = []; let at = day.yard;
      while (left.length) {
        left.sort((a, b) => Math.hypot(byId[a].x - at.x, byId[a].y - at.y) - Math.hypot(byId[b].x - at.x, byId[b].y - at.y));
        const n = left.shift(); out.push(n); at = byId[n];
      }
      return out;
    });
  }

  const value = (day, s) => day.costOnly ? -s.dayCost : s.profit;
  const hhmm = h => { const m = Math.round(h * 60); const H = Math.floor(m / 60) % 24, Mi = m % 60; return `${(H + 11) % 12 + 1}:${String(Mi).padStart(2, "0")} ${H < 12 ? "am" : "pm"}`; };

  function summary(day, s) {
    return {
      trucks: s.used, miles: Math.round(s.miles), hours: +s.hours.toFixed(1), late: s.late,
      overtime: +s.kpi.overtime_hours.toFixed(1), cost: Math.round(s.totalCost), dayCost: Math.round(s.dayCost),
      profit: Math.round(s.profit), invalid: s.invalid || null,
    };
  }

  function sheets(day, s) {
    const byId = Object.fromEntries(day.orders.map(o => [o.id, o]));
    return s.routes.filter(r => r.ids.length).map((r, k) => ({
      truck: k + 1, miles: Math.round(r.miles), back: hhmm(r.back), late: r.late,
      stops: r.stops.map((st, j) => {
        const o = byId[st.id];
        return { n: j + 1, row: st.id, label: o.label, eta: hhmm(Math.max(st.arrive, o.open)), window: o.tight ? `${hhmm(o.open)}–${hhmm(o.close)}` : "", late: st.late };
      }),
    }));
  }

  // everything; the API decides what the free tier sees
  function run(M, inp) {
    const day = buildDay(M, inp);
    const asRun = day.asRun || usual(M, day);
    const A = E.simulate(M, day, asRun);
    // the hand rule; lenient, so a day the model prices past the 14-hour clock still gets one
    let rule = R.rule(M, day, { lenient: true }), Ru = rule ? E.simulate(M, day, rule) : null;
    if (!Ru) { rule = asRun; Ru = A; }
    // par: the best of the solver from scratch (small boards) and the solver warm-started
    // from the rule (a full day, where the savings merge strands stops on the dock)
    const better = (x, y) => !y || (!!y.s.invalid > !!x.s.invalid) || (!!y.s.invalid === !!x.s.invalid && value(day, x.s) > value(day, y.s));
    let best = { plan: rule, s: Ru };
    const tries = [() => E.solve(M, day, rule, day.orders.length > 60 ? 4 : 10)];
    if (day.orders.length <= 40) tries.push(() => E.solve(M, day));
    for (const t of tries) { const p = t(), s = E.simulate(M, day, p); if (better({ plan: p, s }, best)) best = { plan: p, s }; }
    const par = best.plan, P = best.s;
    const gap = Math.round(value(day, P) - value(day, A)), ruleGap = Math.round(value(day, Ru) - value(day, A));
    return {
      seg: day.seg, stops: day.orders.length, trucksAvail: day.trucks, weights: day.weights,
      fromFile: !!day.asRun, unrouted: day.unrouted, yard: day.yardLatLon,
      points: day.orders.map(o => [+o.x.toFixed(3), +o.y.toFixed(3)]),
      asRun: summary(day, A), rule: summary(day, Ru), par: summary(day, P), gap, ruleGap,
      full: { asRun: sheets(day, A), rule: sheets(day, Ru), par: sheets(day, P) },
    };
  }

  // is the day as run (or the usual way) inside the 14-hour clock? cheap: no solver
  function asRunValid(M, inp) {
    const day = buildDay(M, inp);
    return !E.simulate(M, day, day.asRun || usual(M, day)).invalid;
  }

  const api = { run, buildDay, asRunValid, hasLoc, SEGS, MAX_STOPS };
  if (typeof module !== "undefined") module.exports = api; else root.RunSheetUpload = api;
})(this);
