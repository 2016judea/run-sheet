// POST /api/plan driven with a fake req/res (no Vercel CLI here). Every stop carries lat/lon
// or no address, so the Census geocoder is never called and no password is sent.
const test = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../site/api/plan.js");

function call(body) {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(j) { resolve({ code: this.code, body: j }); } };
    handler({ method: "POST", headers: {}, body }, res);
  });
}
const yard = { lat: 44.9706, lon: -93.2466 };
const st = (i) => ({ lat: 44.9706 + 0.01 * i, lon: -93.2466 + 0.01 * (i % 3), label: "s" + i });

test("a stop with null coordinates and no address is counted as missed, not planned at null", async () => {
  const r = await call({ seg: "courier", trucks: 1, yard, stops: [st(1), st(2), { lat: null, lon: null, label: "nul" }] });
  assert.equal(r.code, 200);
  assert.equal(r.body.stops, 2);
  assert.equal(r.body.missed, 1);
  assert.equal(r.body.paid, false);
  assert.equal(r.body.full, undefined);
});

test("no stops is a 400, not a crash", async () => {
  const r = await call({ seg: "courier", stops: [] });
  assert.equal(r.code, 400);
});
