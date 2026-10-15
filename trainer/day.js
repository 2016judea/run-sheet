/* Your own day (site/day/ and site/for/<token>/).
 * Opens already run on a day (window.RS_DAY, written by build.py): never a blank form.
 * Free: the three plans' totals for the day. Paid: each truck's run sheet and a CSV,
 * from /api/plan with the password (site/api/_lib.js). Funnel events go to both Vercel
 * (va) and PostHog: preview_open, plan_run, checkout_open, paid, unlock. */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const D = window.RS_DAY;
  const usd = x => (x < 0 ? "−$" : "$") + Math.abs(Math.round(x)).toLocaleString("en-US");
  const num = x => Math.round(x).toLocaleString("en-US");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const words = n => ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][n] ?? String(n);
  const Cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const UNIT = { courier: ["van", "vans"], route_dist: ["truck", "trucks"], ltl_pd: ["truck", "trucks"], final_mile_bulky: ["crew", "crews"], building_supply: ["truck", "trucks"] };
  const track = (name, props = {}) => {
    const p = { ...props, ...(D.token ? { token: D.token } : {}) };
    try { window.va && window.va("event", { name, ...p }); } catch (e) {}
    try { window.posthog && window.posthog.capture(name, p); } catch (e) {}
  };
  const store = { get: () => { try { return localStorage.getItem("rs_pw"); } catch (e) { return null; } },
                  set: v => { try { v ? localStorage.setItem("rs_pw", v) : localStorage.removeItem("rs_pw"); } catch (e) {} } };

  let PW = null, DAY = D.day, LAST = null, CO = null;

  // ------------------------------------------------------------ CSV in
  function parseCSV(text) {
    const rows = []; let row = [], f = "", q = false;
    const sep = (text.split("\n")[0].match(/\t/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? "\t" : ",";
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  }
  const ALIAS = {
    lat: /^(lat|latitude)$/, lon: /^(lon|lng|long|longitude)$/,
    address: /^(address|street|address ?1|street ?address|delivery ?address|full ?address|location|addr|destination)$/,
    city: /^(city|town)$/, state: /^(state|st|province)$/, zip: /^(zip|zip ?code|postal ?code|postcode)$/,
    route: /^(route|route ?(id|name|#|no)?|driver|driver ?name|vehicle|truck|van|assigned ?to)$/,
    seq: /^(seq|sequence|stop|stop ?(#|no|number|order)|order|position)$/,
    lb: /^(weight|lb|lbs|weight ?\(?lbs?\)?|weight_lb)$/, pallets: /^(pallets?|pallet ?count|plts?)$/,
    open: /^(window ?start|time ?window ?start|tw ?start|earliest|ready|open|from|start ?time)$/,
    close: /^(window ?end|time ?window ?end|tw ?end|latest|close|to|end ?time|deadline|due)$/,
    service: /^(service|service ?time|service ?min(utes)?|duration|dwell|stop ?time)$/,
    label: /^(name|customer|label|company|recipient|account|stop ?name|business)$/,
  };
  function hour(v) {
    v = String(v || "").trim().toLowerCase(); if (!v) return NaN;
    const iso = v.match(/t(\d{1,2}):(\d{2})/); if (iso) return +iso[1] + iso[2] / 60;
    const m = v.match(/(\d{1,2})(?::(\d{2}))?\s*(a|p)?/); if (!m) return NaN;
    let h = +m[1] + (m[2] ? m[2] / 60 : 0);
    if (m[3] === "p" && h < 12) h += 12; if (m[3] === "a" && h >= 12) h -= 12;
    return h <= 24 ? h : NaN;
  }
  function toStops(text) {
    const rows = parseCSV(text); if (rows.length < 2) throw new Error("That file has no rows under its header.");
    const head = rows[0].map(h => h.trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " "));
    const col = {}; for (const [k, re] of Object.entries(ALIAS)) { const i = head.findIndex(h => re.test(h)); if (i >= 0) col[k] = i; }
    if (col.lat == null && col.address == null) throw new Error("No address or lat/lon column. Name one 'address' (or 'lat' and 'lon').");
    const g = (r, k) => col[k] == null ? "" : (r[col[k]] || "").trim();
    return { cols: Object.keys(col), stops: rows.slice(1).map((r, i) => {
      const s = { label: g(r, "label") || g(r, "address") || `row ${i + 2}` };
      const la = parseFloat(g(r, "lat")), lo = parseFloat(g(r, "lon"));
      if (isFinite(la) && isFinite(lo)) { s.lat = la; s.lon = lo; }
      else s.address = [g(r, "address"), g(r, "city"), g(r, "state"), g(r, "zip")].filter(Boolean).join(", ");
      if (col.route != null && g(r, "route")) s.route = g(r, "route");
      if (col.seq != null) s.seq = parseFloat(g(r, "seq"));
      for (const k of ["lb", "pallets", "service"]) if (col[k] != null && g(r, k)) s[k] = parseFloat(g(r, k).replace(/[^\d.]/g, ""));
      const o = hour(g(r, "open")), c = hour(g(r, "close"));
      if (isFinite(o)) s.open = o; if (isFinite(c)) s.close = c;
      return s;
    }) };
  }

  // ------------------------------------------------------------ out
  function headline(r) {
    const [one, many] = UNIT[r.seg] || ["truck", "trucks"];
    const a = r.asRun, p = r.par;
    if (p.trucks < a.trucks) return `${Cap(words(a.trucks))} ${a.trucks === 1 ? one : many} went out. ${Cap(words(p.trucks))} would have done it.`;
    if (a.late > p.late) return `${Cap(words(a.late))} stop${a.late > 1 ? "s" : ""} ran late. ${p.late ? Cap(words(p.late)) : "None"} had to.`;
    if (a.miles - p.miles >= 5) return `Same stops, ${num(a.miles - p.miles)} fewer miles.`;
    return "This day was already run close to as well as it can be.";
  }
  function mapSvg(r) {
    const pts = r.points; if (!pts.length) return "";
    const xs = pts.map(p => p[0]).concat([0]), ys = pts.map(p => p[1]).concat([0]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const span = Math.max(x1 - x0, y1 - y0, 1), S = 180 / span;
    const X = x => 10 + (x - x0) * S, Y = y => 190 - (y - y0) * S;
    return `<svg viewBox="0 0 200 200" class="ymap" role="img" aria-label="${r.stops} stops around the yard">
      ${pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.6"/>`).join("")}
      <rect x="${(X(0) - 5).toFixed(1)}" y="${(Y(0) - 5).toFixed(1)}" width="10" height="10" class="yd"/></svg>`;
  }
  function col(k, title, s, best) {
    return `<div class="pl ${k}${best ? " best" : ""}"><p class="mono">${title}</p>
      <dl><dt>${(UNIT[LAST.seg] || [, "trucks"])[1]}</dt><dd>${s.trucks}</dd><dt>miles</dt><dd>${num(s.miles)}</dd>
      <dt>hours paid</dt><dd>${s.hours}</dd><dt>late</dt><dd>${s.late}</dd><dt>day cost</dt><dd>${usd(s.dayCost)}</dd></dl></div>`;
  }
  function render(r) {
    LAST = r;
    const gapWord = r.gap > 0 ? `<b>${usd(r.gap)}</b> on this one day.` : "No money left on the table this day.";
    const ruleLine = r.gap > 0 ? (r.ruleGap >= r.gap - 1 ? "A dispatcher with a map and a pen gets all of it." : `A dispatcher with a map and a pen gets ${usd(Math.max(0, r.ruleGap))} of it.`) : "";
    const note = [r.fromFile ? "“As run” is your file's own routes." : "No route column, so “as run” is the usual way: stops dealt out in the order they came in, each truck nearest-next.",
      r.weights ? "" : "No weights in the file, so only the clock limits a truck.",
      r.missed ? `${r.missed} address${r.missed > 1 ? "es" : ""} didn't find a map location and ${r.missed > 1 ? "were" : "was"} left out.` : ""].filter(Boolean).join(" ");
    $("#out").innerHTML = `
      <h2 class="hl">${esc(headline(r))}</h2>
      <p class="gap">${gapWord} ${ruleLine}</p>
      <div class="three">${col("a", "as run", r.asRun)}${col("r", "the rule, by hand", r.rule)}${col("p", "best plan", r.par, true)}</div>
      <div class="mapbox">${mapSvg(r)}<p class="mono">${r.stops} stops · ■ yard</p></div>
      <p class="note">${esc(note)}</p>`;
    $("#sheets").innerHTML = r.full ? sheetsHtml(r) : lockedHtml(r);
    if (!r.full) wirePay();
    else $("#csv").onclick = () => download(r);
  }
  function sheetsHtml(r) {
    const pick = r.full.par.length ? r.full.par : r.full.rule;
    return `<p class="mono">run sheets · best plan · ${pick.length} ${(UNIT[r.seg] || [, "trucks"])[1]}</p>
      ${pick.map(t => `<div class="truck"><p><b>${Cap((UNIT[r.seg] || ["truck"])[0])} ${t.truck}</b> · ${t.stops.length} stops · ${num(t.miles)} mi · back ${t.back}${t.late ? ` · <span class="late">${t.late} late</span>` : ""}</p>
        <ol>${t.stops.map(s => `<li${s.late ? ' class="late"' : ""}><span class="eta">${s.eta}</span> ${esc(s.label)}${s.window ? ` <span class="win">${s.window}</span>` : ""}</li>`).join("")}</ol></div>`).join("")}
      <button id="csv" class="btn">Download the CSV</button>`;
  }
  function lockedHtml(r) {
    const n = r.par.trucks, [one, many] = UNIT[r.seg] || ["truck", "trucks"];
    return `<div class="lock"><p class="mono">the run sheets</p>
      <p class="lk">Which stop goes on which ${one}, in what order, and when it gets there. ${Cap(words(n))} ${n === 1 ? one : many}, ${r.stops} stops, and a CSV to drop back into whatever you dispatch from.</p>
      <p class="price">The run sheets for every day you put in are $${D.price}, once.</p>
      <button class="btn" id="buy">Get the run sheets</button>
      <button type="button" class="link" id="havepw" aria-expanded="false">Already paid? Enter your password</button>
      <form class="pwf" id="pwf" hidden><label class="sr" for="pw1">Password</label><input id="pw1" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX"><button class="btn">Unlock</button><p class="pwerr" role="alert"></p></form>
      <div id="checkout"></div></div>`;
  }
  function download(r) {
    const lines = [["plan", "truck", "stop", "eta", "label", "window", "late"].join(",")];
    for (const [k, name] of [["par", "best"], ["rule", "rule"], ["asRun", "as run"]])
      for (const t of r.full[k]) for (const s of t.stops)
        lines.push([name, t.truck, s.n, s.eta, `"${String(s.label).replace(/"/g, '""')}"`, s.window, s.late ? "yes" : ""].join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = "run-sheets.csv"; a.click();
    track("csv_download");
  }

  // ------------------------------------------------------------ run
  async function run(day, why) {
    $("#out").classList.add("busy"); $("#err").textContent = "";
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json", ...(PW ? { "x-password": PW } : {}) }, body: JSON.stringify(day) });
      const j = await r.json();
      if (!r.ok) { if (r.status === 401 || r.status === 402) { PW = null; store.set(null); } throw new Error(j.error || "That didn't run."); }
      DAY = day; render(j);
      if (why === "upload") track("plan_run", { stops: j.stops, seg: j.seg, paid: j.paid });
      return j;
    } catch (e) { $("#err").textContent = e.message; throw e; }
    finally { $("#out").classList.remove("busy"); }
  }

  // ------------------------------------------------------------ pay
  const loadStripe = () => window.Stripe ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://js.stripe.com/dahlia/stripe.js"; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  function wirePay() {
    $("#havepw").onclick = () => { const f = $("#pwf"), on = f.hidden; f.hidden = !on; $("#havepw").setAttribute("aria-expanded", on); if (on) f.querySelector("input").focus(); };
    $("#pwf").onsubmit = async e => {
      e.preventDefault(); const v = $("#pw1").value.trim(); if (!v) return;
      PW = v; try { await run(DAY); store.set(v); track("unlock", { src: "form" }); } catch (x) { PW = null; $("#pwf").hidden = false; $("#pwf .pwerr").textContent = x.message; }
    };
    $("#buy").onclick = async () => {
      track("checkout_open", { price: D.price });
      if (CO) return $("#checkout").scrollIntoView({ behavior: "smooth", block: "start" });
      const b = $("#buy"); b.disabled = true; const t = b.textContent; b.textContent = "Loading secure checkout…";
      try {
        await loadStripe();
        const stripe = window.Stripe(D.stripePk);
        const opts = { fetchClientSecret: () => fetch("/api/checkout", { method: "POST" }).then(r => r.json()).then(j => { if (!j.clientSecret) throw new Error(j.error || "Checkout could not start."); return j.clientSecret; }) };
        CO = await (stripe.createEmbeddedCheckoutPage ? stripe.createEmbeddedCheckoutPage(opts) : stripe.initEmbeddedCheckout(opts));
        CO.mount("#checkout"); setTimeout(() => $("#checkout").scrollIntoView({ behavior: "smooth", block: "start" }), 300);
      } catch (x) { CO = null; $("#err").textContent = "Checkout didn't load. Refresh and try again, or email aidan@brickandmortar.dev."; }
      finally { b.disabled = false; b.textContent = t; }
    };
  }
  async function confirmPaid(id) {
    $("#err").textContent = "Checking your payment…";
    try {
      const j = await (await fetch("/api/session-status?session_id=" + encodeURIComponent(id))).json();
      if (j.paid) { track("paid", { price: D.price }); $("#err").textContent = `Paid. Your password is on its way to ${j.email || "your inbox"}; open the link in that email to unlock the run sheets.`; }
      else $("#err").textContent = "That payment hasn't gone through yet.";
    } catch (e) { $("#err").textContent = "Couldn't check the payment. Refresh in a minute."; }
  }

  // ------------------------------------------------------------ form
  function wireForm() {
    const f = $("#dayform");
    f.seg.value = DAY.seg; f.trucks.value = DAY.trucks || "";
    f.file.onchange = async () => { const file = f.file.files[0]; if (file) f.csv.value = await file.text(); };
    f.onsubmit = async e => {
      e.preventDefault(); $("#err").textContent = "";
      let parsed; try { parsed = toStops(f.csv.value); } catch (x) { $("#err").textContent = x.message; return; }
      const day = { seg: f.seg.value, trucks: +f.trucks.value || undefined, stops: parsed.stops,
                    yard: f.yard.value.trim() ? (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(f.yard.value.trim()) ? { lat: +f.yard.value.split(",")[0], lon: +f.yard.value.split(",")[1] } : { address: f.yard.value.trim() }) : undefined };
      const b = f.querySelector("button[type=submit]"); b.disabled = true; b.textContent = parsed.stops.some(s => s.address) ? "Finding addresses and planning…" : "Planning…";
      try { await run(day, "upload"); $("#out").scrollIntoView({ behavior: "smooth", block: "start" }); } catch (x) {}
      finally { b.disabled = false; b.textContent = "Plan my day"; }
    };
  }

  // ------------------------------------------------------------ boot
  const qs = new URLSearchParams(location.search), pwq = qs.get("pw"), paidq = qs.get("paid");
  if (pwq || paidq) { qs.delete("pw"); qs.delete("paid"); history.replaceState(null, "", location.pathname + (qs.toString() ? "?" + qs : "") + location.hash); }
  PW = pwq || store.get();
  wireForm();
  track("preview_open", { page: D.token ? "for" : "day" });
  run(DAY).then(() => { if (PW) { store.set(PW); if (pwq) track("unlock", { src: "link" }); } }).catch(() => { if (PW) { PW = null; run(DAY).catch(() => {}); } });
  if (paidq) confirmPaid(paidq);
})();
