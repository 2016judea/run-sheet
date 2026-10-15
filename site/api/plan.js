// POST /api/plan  { seg, trucks, yard:{lat,lon}|{address}, stops:[{lat,lon}|{address}, label, lb, pallets, open, close, service, route, seq] }
// Plans the operator's own day three ways (trainer/upload.js): as run, the hand rule, par.
// Free: the three plans' totals, so the gap lands on their own day.
// Paid (password in x-password, see _lib.js): every truck's run sheet, stop by stop.
// Stops without coordinates are geocoded with the free US Census geocoder. Nothing is stored.
const path = require("path");
const { checkPassword, nonceIsPaid } = require("./_lib");
const U = require("./_rs/upload.js");
const M = require(path.join(__dirname, "_rs", "model.json"));

const readBody = (req) => new Promise((ok, no) => {
  if (req.body && typeof req.body === "object") return ok(req.body);
  const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => { try { ok(JSON.parse(Buffer.concat(c).toString("utf8") || "{}")); } catch (e) { no(e); } }); req.on("error", no);
});

async function geocode(address) {
  const u = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=" + encodeURIComponent(address);
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    const m = j?.result?.addressMatches?.[0]?.coordinates;
    return m ? { lat: m.y, lon: m.x } : null;
  } catch { return null; }
}

async function locate(list) {
  const todo = list.filter((s) => !(isFinite(s.lat) && isFinite(s.lon)) && s.address);
  let i = 0;
  const worker = async () => { while (i < todo.length) { const s = todo[i++]; const g = await geocode(String(s.address).slice(0, 200)); if (g) Object.assign(s, g); } };
  await Promise.all(Array.from({ length: 10 }, worker));
  return todo.length;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  let inp;
  try { inp = await readBody(req); } catch { return res.status(400).json({ error: "That didn't read as a day. Try the CSV again." }); }
  const stops = Array.isArray(inp.stops) ? inp.stops.slice(0, U.MAX_STOPS + 1) : [];
  if (!stops.length) return res.status(400).json({ error: "No stops in that file." });
  if (stops.length > U.MAX_STOPS) return res.status(400).json({ error: `One day at a time: ${U.MAX_STOPS} stops at most.` });
  // access first, so a paid run never waits on the geocoder twice
  let paid = false;
  const pw = req.headers["x-password"];
  if (pw) {
    const ok = checkPassword(pw);
    if (!ok) return res.status(401).json({ error: "That password didn't match. Check the email from Brick & Mortar, or reply to it for help." });
    try { paid = ok.kind === "comp" || (await nonceIsPaid(ok.nonce)); } catch (e) { console.error("[plan] paid check:", e.message); return res.status(502).json({ error: "Couldn't check the password right now. Try again in a minute." }); }
    if (!paid) return res.status(402).json({ error: "That password's payment hasn't gone through. If you just paid, wait a minute and try again." });
    console.log(`[unlock] ${ok.kind} ${ok.nonce}`);
  }
  const yard = inp.yard || {};
  const list = stops.map((s) => ({ ...s }));
  const geocoded = await locate(list.concat(yard.address && !isFinite(yard.lat) ? [yard] : []));
  const missed = list.filter((s) => !(isFinite(s.lat) && isFinite(s.lon))).length;
  try {
    const out = U.run(M, { seg: inp.seg, trucks: inp.trucks, yard: isFinite(yard.lat) ? yard : null, stops: list });
    const full = out.full; delete out.full;
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ ...out, geocoded, missed, paid, ...(paid ? { full } : {}) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: "1mb" } } };
