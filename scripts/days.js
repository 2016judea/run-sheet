#!/usr/bin/env node
/* The days the tool opens on (never a blank form), written into site/days.json:
 *
 *   sample   a made-up courier morning around a Minneapolis yard, with a route
 *            column dealt the usual way, so "as run" reads the file's own routes
 *   <token>  for each round-1 recipient (outreach/round1/recipients.json): a day
 *            shaped like their FMCSA filing — their yard, their power units (up to
 *            what one upload holds), their segment's published stops per truck
 *
 * Stops scatter over the engine's own zone geometry (trainer/engine.js genRoutes:
 * a truck's zone is the square whose stop tour is a day's published miles). Each
 * recipient's day is run once here (trainer/upload.js) and the totals go to
 * outreach/round1/facts.json for the email's second line. Seeded: same file, same day.
 */
const fs = require("fs");
const path = require("path");
const U = require("../trainer/upload.js");
const E = require("../trainer/engine.js");
const ROOT = path.join(__dirname, "..");
const M = JSON.parse(fs.readFileSync(path.join(ROOT, "site/model.json")));
const BHH = 0.7124;
const VEH = { courier: "cargo_van", route_dist: "box_26", final_mile_bulky: "box_26", building_supply: "straight_flatbed", ltl_pd: "box_26" };

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const seedOf = s => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

function makeDay(seg, trucksWant, yard, seed, withRoutes, thin = 1) {
  const r = rng(seed), S = M.segments[seg];
  const typ = Math.round(Number(S.stops_per_route_typ) || (Number(S.stops_per_route_low) + Number(S.stops_per_route_high)) / 2);
  const trucks = Math.max(1, Math.min(trucksWant, Math.floor(U.MAX_STOPS / typ), 12));
  const n = Math.round(trucks * typ * thin);
  const zone = E.row(M, "loaded_miles_per_day", [seg]).value / (BHH * Math.sqrt(typ));
  // 0.6: a day the usual way still gets done inside the 14-hour clock, as theirs did
  const side = zone * Math.sqrt(trucks) * 0.6;
  const veh = M.vehicles[VEH[seg]];
  const k = Math.cos(yard.lat * Math.PI / 180);
  const stops = [];
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * side, y = (r() - 0.5) * side;
    const s = { label: `Stop ${String(i + 1).padStart(2, "0")}`, lat: +(yard.lat + y / 69.05).toFixed(5), lon: +(yard.lon + x / (69.17 * k)).toFixed(5) };
    if (seg !== "courier") s.lb = Math.round(veh.payload_lb * 0.8 * trucks / n * (0.5 + r()));
    if (r() < 0.25) { const o = 8 + Math.floor(r() * 12) / 2; s.open = o; s.close = o + 3; }
    stops.push(s);
  }
  if (withRoutes) {
    // the usual way, written into the file: dealt in booking order, each truck nearest-next
    const day = U.buildDay(M, { seg, trucks, yard, stops });
    stops.forEach((s, i) => { s.route = `Route ${(i % trucks) + 1}`; });
    const byR = {};
    stops.forEach((s, i) => (byR[s.route] ||= []).push(i));
    for (const ids of Object.values(byR)) {
      const left = ids.slice(); let at = { x: 0, y: 0 }, q = 1;
      while (left.length) {
        left.sort((a, b) => Math.hypot(day.orders[a].x - at.x, day.orders[a].y - at.y) - Math.hypot(day.orders[b].x - at.x, day.orders[b].y - at.y));
        const i = left.shift(); stops[i].seq = q++; at = day.orders[i];
      }
    }
  }
  return { seg, trucks, yard, stops };
}

// the usual way must be a day they could have run: inside the 14-hour clock
function runnable(seg, trucks, yard, seed, withRoutes) {
  // fewer stops per truck before giving up: a lighter day, still theirs in shape
  for (const thin of [1, 0.9, 0.8, 0.7]) for (let k = 0; k < 12; k++) {
    const d = makeDay(seg, trucks, yard, seed + k, withRoutes, thin);
    if (U.asRunValid(M, d)) return d;
  }
  return makeDay(seg, trucks, yard, seed, withRoutes);
}
const out = { sample: runnable("courier", 3, { lat: 44.9706, lon: -93.2466 }, 20261015, true) };
const recips = JSON.parse(fs.readFileSync(path.join(ROOT, "outreach/round1/recipients.json")));
const facts = {};
for (const p of recips) {
  // a truck needs a driver: the filing's power units, capped by its drivers
  const day = runnable(p.segment, Math.min(p.power_units, p.drivers || p.power_units), p.yard, seedOf(p.token), false);
  out[p.token] = day;
  const res = U.run(M, day);
  facts[p.token] = { trucks: day.trucks, stops: day.stops.length, asRun: res.asRun, rule: res.rule, par: res.par, gap: res.gap, ruleGap: res.ruleGap };
  console.log(`${p.token} ${p.segment.padEnd(17)} ${String(day.trucks).padStart(2)} trucks ${String(day.stops.length).padStart(3)} stops  usual ${res.asRun.trucks}t ${res.asRun.miles}mi ${res.asRun.late} late  par ${res.par.trucks}t ${res.par.miles}mi ${res.par.late} late  gap $${res.gap} rule $${res.ruleGap}`);
}
const S = U.run(M, out.sample);
console.log(`sample: as run ${S.asRun.trucks}t ${S.asRun.miles}mi, par ${S.par.trucks}t ${S.par.miles}mi, gap $${S.gap}`);
fs.writeFileSync(path.join(ROOT, "site/days.json"), JSON.stringify(out));
fs.writeFileSync(path.join(ROOT, "outreach/round1/facts.json"), JSON.stringify(facts, null, 1));
