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
  const par = day.par || E.solve(M, day);
  const U = E.simulate(M, day, usual), P = E.simulate(M, day, par);
  if (U.invalid || P.invalid) return null;
  const cost = day.mode === "routes" && day.costOnly;
  const gap = cost ? U.dayCost - P.dayCost : P.profit - U.profit;
  return { seg, seed, day, usual, par, U, P, gap, cost };
}

function trim(sim, day) {
  if (day.mode === "routes") return {
    profit: sim.profit, dayCost: sim.dayCost, miles: sim.miles, hours: sim.hours, used: sim.used,
    late: sim.late, onTime: day.orders.length - sim.late - sim.missed.length,
    routes: sim.routes.map(r => ({ ids: r.ids, back: r.back, late: r.late })),
  };
  return {
    profit: sim.profit, miles: sim.miles, loaded: sim.loaded, empty: sim.empty, revenue: sim.revenue,
    detention: sim.detention, chain: sim.chain, rpm: sim.kpi.rate_per_mile_all_in, emptyPct: sim.kpi.empty_mile_pct,
  };
}

const out = { built: M.built, stories: [] };
for (const seg of SEGS) {
  let best = null;
  for (let seed = 1; seed <= 400; seed++) {
    const s = story(seg, seed);
    if (!s || s.gap <= 0) continue;
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
  out.stories.push({ seg, gap: Math.round(best.gap), cost: best.cost, day: keep, usual: trim(best.U, d), par: trim(best.P, d) });
  console.log(`${seg.padEnd(17)} seed ${best.seed}  gap $${Math.round(best.gap)}`);
}
fs.writeFileSync(path.join(__dirname, "../site/stories.json"), JSON.stringify(out));
