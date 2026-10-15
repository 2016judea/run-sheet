/* The fix a dispatcher can run by hand. Par is what a solver finds; nobody runs a
 * solver at 5 am. These are the rules a person with a map and a pen can follow,
 * scored by the same simulator so the page can say how much of par each recovers.
 *
 * ROUTES (courier, route delivery, LTL P&D, final mile, building supply)
 *   1. Fewest trucks first: start with the fewest the freight fits on; add one only
 *      if the day can't be run on time without it.
 *   2. Cut the map into slices around the yard, one slice per truck.
 *   3. In each slice, loop the anytime stops nearest-next, then drop each window
 *      stop into the loop where you'd pass it while its window is open.
 *
 * LOADS (regional truckload, drayage)
 *   Price every load by what it pays per hour after the empty miles to reach it,
 *   and take the best one you can still make. Nothing positive left: go home.
 */
(function (root) {
  "use strict";
  const E = typeof module !== "undefined" ? require("./engine.js") : root.RunSheet;

  // lenient: on a day where no truck count runs clean (an uploaded day the model prices
  // past the 14-hour clock), still return the plan with the fewest late stops
  function routesRule(M, day, lenient) {
    const veh = M.vehicles[day.veh];
    const byId = Object.fromEntries(day.orders.map(o => [o.id, o]));
    const ang = o => Math.atan2(o.y - day.yard.y, o.x - day.yard.x);
    const sorted = day.orders.slice().sort((a, b) => ang(a) - ang(b));
    // start the sweep at the widest gap so no slice straddles two sides of town
    let cut = 0, gap = -1;
    for (let i = 0; i < sorted.length; i++) {
      const g = (ang(sorted[(i + 1) % sorted.length]) - ang(sorted[i]) + 2 * Math.PI) % (2 * Math.PI);
      if (g > gap) { gap = g; cut = (i + 1) % sorted.length; }
    }
    const ring = sorted.slice(cut).concat(sorted.slice(0, cut));
    const capLb = veh.payload_lb, capPal = veh.pallet_positions || 0;
    const totLb = ring.reduce((a, o) => a + o.lb, 0), totPal = ring.reduce((a, o) => a + o.pallets, 0);
    const kMin = Math.max(1, Math.ceil(totLb / capLb), capPal ? Math.ceil(totPal / capPal) : 1);

    function slices(k) {
      // equal shares of on-site minutes, never over the truck
      const work = ring.reduce((a, o) => a + o.service, 0), out = [[]];
      let acc = 0, lb = 0, pal = 0;
      for (const o of ring) {
        const full = lb + o.lb > capLb || (capPal && pal + o.pallets > capPal);
        if (out.length < k && (acc >= work / k * out.length || full)) { out.push([]); lb = 0; pal = 0; }
        out[out.length - 1].push(o); acc += o.service; lb += o.lb; pal += o.pallets;
      }
      return out;
    }
    function sequence(stops) {
      const anytime = stops.filter(o => !o.tight), win = stops.filter(o => o.tight).sort((a, b) => a.open - b.open);
      const seq = []; let at = day.yard; const left = anytime.slice();
      while (left.length) {
        left.sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y));
        at = left.shift(); seq.push(at.id);
      }
      for (const w of win) {
        let best = null, bestS = Infinity;
        for (let j = 0; j <= seq.length; j++) {
          const c = seq.slice(); c.splice(j, 0, w.id);
          const r = E.simulate(M, day, [c]).routes[0];
          const wait = r.stops.reduce((a, st) => a + Math.max(0, byId[st.id].open - st.arrive), 0);
          const s = r.late * 100 + wait * 2 + r.hours;
          if (s < bestS) { bestS = s; best = c; }
        }
        seq.splice(0, seq.length, ...best);
      }
      return seq;
    }
    let best = null;
    for (let k = kMin; k <= day.trucks; k++) {
      const plan = slices(k).map(sequence);
      while (plan.length < day.trucks) plan.push([]);
      const s = E.simulate(M, day, plan);
      if (s.invalid && !lenient) continue;
      const bad = s.invalid ? 1 : 0;
      if (!best || bad < best.bad || (bad === best.bad && (s.late < best.s.late || (s.late === best.s.late && s.hours < best.s.hours - 1e-6 && bad)))) best = { plan, s, k, bad };
      if (s.late === 0 && !s.invalid) break;   // fewest trucks that runs the day on time
    }
    return best ? best.plan : null;
  }

  function loadsRule(M, day) {
    const veh = M.vehicles[{ regional_tl: "tractor_53dry", drayage: "day_cab_chassis" }[day.seg]];
    const perMile = E.has(M, "driver_pay_per_mile", [day.seg])
      ? E.row(M, "driver_pay_per_mile", [day.seg]).value * (1 + E.row(M, "driver_benefit_load_pct", [day.seg]).value / 100) : 0;
    const cpm = veh.cost_per_mile_ex_driver + perMile;
    const chain = [];
    for (;;) {
      const s0 = E.simulate(M, day, chain);
      const t0 = s0.legs.length ? s0.legs[s0.legs.length - 1].at : 6;
      let best = null, bestV = 0;
      for (const l of day.loads) {
        if (chain.includes(l.id)) continue;
        const s = E.simulate(M, day, chain.concat([l.id]));
        if (s.invalid) continue;
        const leg = s.legs[s.legs.length - 1];
        // the empty miles to reach it, and the clock until it's dropped
        const hours = Math.max(0.5, leg.at - t0);
        const net = l.rate - (l.miles + leg.deadhead) * cpm;
        const v = net / hours;
        if (v > bestV) { bestV = v; best = l.id; }
      }
      if (best == null) break;
      chain.push(best);
    }
    return chain;
  }

  const api = { rule: (M, day, opts) => day.mode === "loads" ? loadsRule(M, day) : routesRule(M, day, opts && opts.lenient) };
  if (typeof module !== "undefined") module.exports = api; else root.RunSheetRules = api;
})(this);
