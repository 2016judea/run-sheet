// The engine behind /api/plan (trainer/upload.js, copied to site/api/_rs/ by build.py).
// Offline: the model is site/model.json, every stop carries lat/lon, nothing is geocoded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const U = require("../trainer/upload.js");
const M = require("../site/model.json");

const yard = { lat: 44.9706, lon: -93.2466 };
const st = (i, route) => ({ lat: 44.9706 + 0.01 * i, lon: -93.2466 + 0.01 * (i % 3), label: "s" + i, seq: i, ...(route ? { route } : {}) });

test("a stop with a blank route cell still goes out on a truck in the as-run plan", () => {
  // two routed trucks, two stops with no route: before, those two were left 'on the dock' and their
  // lost billing was charged to 'as run', so the gap to par was invented
  const r = U.run(M, { seg: "courier", trucks: 2, yard, stops: [st(1, "A"), st(2, "A"), st(3, "B"), st(4, "B"), st(5), st(6)] });
  assert.equal(r.unrouted, 2);
  assert.equal(r.asRun.invalid, null);
  assert.equal(r.full.asRun.reduce((n, t) => n + t.stops.length, 0), 6);
  assert.equal(r.fromFile, true);
});

test("a file with no route column at all is still 'the usual way'", () => {
  const r = U.run(M, { seg: "courier", trucks: 2, yard, stops: [st(1), st(2), st(3), st(4)] });
  assert.equal(r.fromFile, false);
  assert.equal(r.unrouted, 0);
  assert.equal(r.full.asRun.reduce((n, t) => n + t.stops.length, 0), 4);
});

test("null is not a coordinate and '' is not a time window", () => {
  // isFinite(null) === true: a {lat:null} stop used to land 4,500 miles from the yard, and
  // open:null used to become a midnight window that made every arrival late
  assert.equal(U.hasLoc({ lat: null, lon: null }), false);
  assert.equal(U.hasLoc({ lat: "", lon: "" }), false);
  assert.equal(U.hasLoc({ lat: "44.97", lon: "-93.24" }), true);
  const day = U.buildDay(M, { seg: "courier", yard, stops: [st(1, "A"), { lat: null, lon: null, address: "x", label: "nul" }] });
  assert.equal(day.orders.length, 1);
  const d3 = U.buildDay(M, { seg: "courier", yard, stops: [{ ...st(1), open: null, close: "" }] });
  assert.equal(d3.orders[0].tight, false);
  assert.equal(d3.orders[0].open, 7);
});

test("the API runs the same engine the repo tests", () => {
  for (const f of ["upload.js", "engine.js", "rules.js"]) {
    assert.equal(fs.readFileSync(path.join(__dirname, "..", "site", "api", "_rs", f), "utf8"),
                 fs.readFileSync(path.join(__dirname, "..", "trainer", f), "utf8"), f + " drifted from trainer/; run build.py");
  }
  assert.equal(fs.readFileSync(path.join(__dirname, "..", "site", "day.js"), "utf8"),
               fs.readFileSync(path.join(__dirname, "..", "trainer", "day.js"), "utf8"), "site/day.js drifted from trainer/day.js");
});
