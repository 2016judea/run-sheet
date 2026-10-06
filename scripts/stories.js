#!/usr/bin/env node
/* Build site/stories.json: for each business, one real-shaped day planned two ways.
 *
 *   the usual way  what decisions.csv says operators actually do
 *                  routes: every truck goes out, stops dealt to trucks in the order
 *                          they were booked, each driver runs nearest-next
 *                  loads:  book the best-paying load you can still make, every time
 *   par            the solver's plan for the same day (trainer/engine.js)
 *
 * Nobody plays anything. The page draws the usual way, then par over it, and says
 * what the difference was worth. Seeds are searched so each story's gap is real
 * and the usual way is a plan a dispatcher could actually send.
 */
const fs = require("fs");
const path = require("path");
const E = require("../trainer/engine.js");
const R = require("../trainer/rules.js");
const M = JSON.parse(fs.readFileSync(path.join(__dirname, "../site/model.json")));

const SEGS = ["courier", "route_dist", "ltl_pd", "final_mile_bulky", "building_supply", "regional_tl", "drayage"];

function usualRoutes(day) {
  const veh = M.vehicles[day.veh];
  const plan = Array.from({ length: day.trucks }, () => []);
  const load = plan.map(() => ({ lb: 0, pal: 0 }));
  day.orders.forEach((o, i) => {
    // deal in booking order; skip a truck that is full
    for (let j = 0; j < day.trucks; j++) {
      const k = (i + j) % day.trucks;
      if (load[k].lb + o.lb <= veh.payload_lb && (!veh.pallet_positions || load[k].pal + o.pallets <= veh.pallet_positions)) {
        plan[k].push(o.id); load[k].lb += o.lb; load[k].pal += o.pallets; return;
      }
    }
  });
  // each driver runs nearest-next from the yard
  const byId = Object.fromEntries(day.orders.map(o => [o.id, o]));
  return plan.map(ids => {
    const left = ids.slice(), out = [];
    let at = day.yard;
    while (left.length) {
      left.sort((a, b) => Math.hypot(byId[a].x - at.x, byId[a].y - at.y) - Math.hypot(byId[b].x - at.x, byId[b].y - at.y));
      const n = left.shift(); out.push(n); at = byId[n];
    }
    return out;
  });
}

function usualLoads(day) {
  const chain = [];
  for (;;) {
    let best = null, bestRate = -1;
    for (const l of day.loads) {
      if (chain.includes(l.id)) continue;
      const s = E.simulate(M, day, chain.concat([l.id]));
      if (s.invalid) continue;
      if (l.rate > bestRate) { bestRate = l.rate; best = l.id; }
    }
    if (best == null) break;
    chain.push(best);
  }
  return chain;
}

function story(seg, seed) {
  const day = E.generate(M, seg, seed);
  if (day.events.length) return null;                  // keep the story about the plan
  const usual = day.mode === "routes" ? usualRoutes(day) : usualLoads(day);
  const rule = R.rule(M, day);
  if (!rule) return null;
  const U = E.simulate(M, day, usual), Ru = E.simulate(M, day, rule);
  let par = day.par || E.solve(M, day), P = E.simulate(M, day, par);
  const cost = day.mode === "routes" && day.costOnly;
  const val = x => cost ? -x.dayCost : x.profit;
  if (P.invalid || val(Ru) > val(P)) { par = rule; P = Ru; }     // par is never worse than the hand rule
  if (U.invalid || Ru.invalid) return null;
  const gap = val(P) - val(U), ruleGap = val(Ru) - val(U);
  if (ruleGap < gap * 0.5) return null;                           // the story is the rule; it has to carry most of it
  return { seg, seed, day, usual, rule, par, U, Ru, P, gap, ruleGap, cost };
}

// each truck's day as segments [kind, from-hour, to-hour, stop id], replayed with the
// engine's own numbers so the page can play it back
function timeline(day, ids) {
  if (!ids.length) return [];
  const v = (id, sc) => E.row(M, id, sc).value;
  const circ = v("road_circuity", ["all"]), byId = Object.fromEntries(day.orders.map(o => [o.id, o]));
  let t = 7 + v("pretrip_min", [day.seg]) / 60;
  const pal = ids.reduce((a, i) => a + byId[i].pallets, 0);
  if (E.has(M, "load_min_per_pallet", [day.seg])) t += pal * v("load_min_per_pallet", [day.seg]) / 60;
  const seg = [["yard", 7, t]];
  let at = day.yard;
  for (const id of ids) {
    const o = byId[id], dt = Math.hypot(o.x - at.x, o.y - at.y) * circ / day.speed;
    seg.push(["drive", t, t + dt]); t += dt;
    if (t < o.open) { seg.push(["wait", t, o.open, id]); t = o.open; }
    const late = t > o.close;
    seg.push([late ? "late" : "stop", t, t + o.service / 60, id]); t += o.service / 60; at = o;
  }
  const dt = Math.hypot(at.x - day.yard.x, at.y - day.yard.y) * circ / day.speed;
  seg.push(["drive", t, t + dt]);
  return seg.map(x => [x[0], +x[1].toFixed(3), +x[2].toFixed(3), x[3]]);
}

function trim(sim, day) {
  if (day.mode === "routes") return {
    profit: sim.profit, dayCost: sim.dayCost, miles: sim.miles, hours: sim.hours, used: sim.used,
    late: sim.late, onTime: day.orders.length - sim.late - sim.missed.length,
    wait: sim.routes.reduce((a, r) => a + timeline(day, r.ids).filter(x => x[0] === "wait").reduce((b, x) => b + x[2] - x[1], 0), 0),
    routes: sim.routes.map(r => ({ ids: r.ids, back: r.back, late: r.late, t: timeline(day, r.ids) })),
  };
  return {
    profit: sim.profit, miles: sim.miles, loaded: sim.loaded, empty: sim.empty, revenue: sim.revenue,
    detention: sim.detention, chain: sim.chain, rpm: sim.kpi.rate_per_mile_all_in, emptyPct: sim.kpi.empty_mile_pct,
    deadheads: sim.legs.map(l => Math.round(l.deadhead)), ats: sim.legs.map(l => +l.at.toFixed(2)), home: Math.round(sim.empty - sim.legs.reduce((a, l) => a + l.deadhead, 0)),
  };
}

const out = { built: M.built, stories: [] };
for (const seg of SEGS) {
  let best = null;
  for (let seed = 1; seed <= 400; seed++) {
    const s = story(seg, seed);
    if (!s || s.gap <= 0 || s.ruleGap <= 0) continue;
    // a clear story: a real gap, not the biggest outlier
    if (!best || Math.abs(s.gap - 300) < Math.abs(best.gap - 300) || (best.gap < 120 && s.gap > best.gap)) best = s;
    if (best.gap >= 150 && best.gap <= 700 && seed > 60) break;
  }
  if (!best) throw new Error("no story for " + seg);
  const d = best.day;
  const keep = d.mode === "routes"
    ? { mode: d.mode, seg, seed: best.seed, side: d.side, yard: d.yard, trucks: d.trucks, veh: d.veh, wave: d.wave, typ: d.typ, costOnly: d.costOnly,
        orders: d.orders.map(o => ({ id: o.id, x: +o.x.toFixed(3), y: +o.y.toFixed(3), tight: o.tight, open: o.open, close: o.close })) }
    : { mode: d.mode, seg, seed: best.seed, days: d.days, home: d.home, places: d.places,
        loads: d.loads.map(l => ({ id: l.id, o: l.o, d: l.d, day: l.day, ready: l.ready, rate: Math.round(l.rate), miles: Math.round(l.miles) })) };
  // what the page needs to explain the rule in this day's own numbers
  const veh = M.vehicles[d.veh || { regional_tl: "tractor_53dry", drayage: "day_cab_chassis" }[seg]];
  const extra = d.mode === "routes"
    ? { payload: veh.payload_lb, pallets: veh.pallet_positions, lb: Math.round(d.orders.reduce((a, o) => a + o.lb, 0)),
        wage: E.row(M, "driver_wage_hr", [seg, d.veh]).value * (1 + E.row(M, "driver_benefit_load_pct", [seg]).value / 100) * d.crew, crew: d.crew }
    : { cpm: veh.cost_per_mile_ex_driver + (E.has(M, "driver_pay_per_mile", [seg]) ? E.row(M, "driver_pay_per_mile", [seg]).value * (1 + E.row(M, "driver_benefit_load_pct", [seg]).value / 100) : 0),
        speed: d.speed };
  out.stories.push({ seg, gap: Math.round(best.gap), ruleGap: Math.round(best.ruleGap), cost: best.cost, day: keep, ...extra,
    usual: trim(best.U, d), rule: trim(best.Ru, d), par: trim(best.P, d) });
  console.log(`${seg.padEnd(17)} seed ${best.seed}  par $${Math.round(best.gap)}  rule $${Math.round(best.ruleGap)}`);
}
fs.writeFileSync(path.join(__dirname, "../site/stories.json"), JSON.stringify(out));
