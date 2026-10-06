/* Run Sheet page. Nothing to press. Each business is one screen: the same real day
 * planned the usual way, then par drawn over it, and one line that says what the
 * difference was worth. It plays itself when it scrolls into view and rests on the
 * final frame, so a glance at the still tells the whole story.
 * Data: site/stories.json (scripts/stories.js) and site/model.json (model/compile.py). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const app = $("#app");
  const usd = x => (x < 0 ? "−$" : "$") + Math.abs(Math.round(x)).toLocaleString("en-US");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const words = n => ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
  const Cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const NAME = {
    courier: ["Courier", "same-day vans"], route_dist: ["Route delivery", "box trucks to regular accounts"],
    ltl_pd: ["LTL pickup & delivery", "city routes out of the terminal"], final_mile_bulky: ["Furniture & appliance", "two-person crews"],
    building_supply: ["Lumber & building supply", "flatbeds to jobsites"], regional_tl: ["Regional truckload", "one truck, one week"],
    drayage: ["Drayage", "containers off the rail ramp"],
  };
  const UNIT = { courier: "vans", route_dist: "trucks", ltl_pd: "trucks", final_mile_bulky: "crews", building_supply: "trucks" };

  // ---------------------------------------------------------------- copy, from the numbers
  function routesCopy(s) {
    const u = s.usual, p = s.par, n = s.day.orders.length, unit = UNIT[s.seg];
    const money = s.cost ? `${usd(s.gap)} cheaper` : `${usd(s.gap)} more kept`;
    let head, lesson;
    if (p.used < u.used) { head = `${Cap(words(u.used))} ${unit} went out. ${Cap(words(p.used))} would have done it.`; lesson = "fleet_size_today"; }
    else if (p.onTime > u.onTime) { const lu = n - u.onTime, lp = n - p.onTime; head = `${Cap(words(lu))} late. ${lp ? Cap(words(lp)) : "None"} had to be.`; lesson = "route_build"; }
    else { head = `Same stops. ${Math.round(u.miles - p.miles)} fewer miles.`; lesson = "stop_sequence"; }
    return { head, sub: `Same ${n} stops, same morning. Par: ${money}.`, lesson };
  }
  function loadsCopy(s) {
    const u = s.usual, p = s.par;
    const head = s.seg === "drayage" ? "The best-paying move wasn't the best move." : "The best-paying load wasn't the best load.";
    const sub = `Same board. The usual way books the top rate every time. Par: ${usd(s.gap)} more ${s.day.days > 1 ? "this week" : "today"}.`;
    return { head, sub, lesson: p.emptyPct < u.emptyPct - 2 ? "backhaul" : "accept_load" };
  }

  // ---------------------------------------------------------------- drawing
  function routesSvg(s) {
    const d = s.day, S = 360 / d.side, pad = 20;
    const X = p => pad + p.x * S, Y = p => pad + p.y * S;
    const byId = Object.fromEntries(d.orders.map(o => [o.id, o]));
    const path = ids => [d.yard].concat(ids.map(i => byId[i])).concat([d.yard]).map((p, i) => `${i ? "L" : "M"}${X(p).toFixed(1)} ${Y(p).toFixed(1)}`).join("");
    const g = [];
    for (let i = 1; i < 10; i++) g.push(`<path d="M${i * 40} 0V400M0 ${i * 40}H400" class="grid"/>`);
    const lines = (plan, cls) => plan.routes.filter(r => r.ids.length).map(r => `<path class="rt ${cls}" pathLength="1" d="${path(r.ids)}"/>`).join("");
    const stops = d.orders.map(o => `<circle cx="${X(o).toFixed(1)}" cy="${Y(o).toFixed(1)}" r="5.5" class="st${o.tight ? " tight" : ""}"/>`).join("");
    return `<svg viewBox="0 0 400 400" class="plot" role="img" aria-label="Map of the day: the usual routes in pink, par's routes in amber">
      ${g.join("")}<g class="L-usual">${lines(s.usual, "usual")}</g><g class="L-par">${lines(s.par, "par")}</g>${stops}
      <rect x="${X(d.yard) - 11}" y="${Y(d.yard) - 11}" width="22" height="22" class="yard"/><text x="${X(d.yard)}" y="${Y(d.yard) + 3.5}" class="yl">YARD</text></svg>`;
  }

  function loadsSvg(s) {
    const d = s.day, P = Object.fromEntries(d.places.map(p => [p.id, p]));
    const L = Object.fromEntries(d.loads.map(l => [l.id, l]));
    const used = new Set([d.home]);
    for (const id of s.usual.chain.concat(s.par.chain)) { used.add(L[id].o); used.add(L[id].d); }
    const pl = d.places.filter(p => used.has(p.id));
    const lats = pl.map(p => p.lat), lons = pl.map(p => p.lon);
    const k = Math.cos((Math.min(...lats) + Math.max(...lats)) / 2 * Math.PI / 180);
    const w = (Math.max(...lons) - Math.min(...lons)) * k || 1, h = Math.max(...lats) - Math.min(...lats) || 1;
    const sc = 300 / Math.max(w, h), ox = (400 - w * sc) / 2, oy = (400 - h * sc) / 2;
    const X = p => ox + (p.lon - Math.min(...lons)) * k * sc, Y = p => oy + (Math.max(...lats) - p.lat) * sc;
    function legs(chain, cls) {
      let at = d.home; const out = [];
      const seg = (a, b, dh) => `<path class="rt ${cls}${dh ? " dh" : ""}" pathLength="1" d="M${X(P[a]).toFixed(1)} ${Y(P[a]).toFixed(1)}L${X(P[b]).toFixed(1)} ${Y(P[b]).toFixed(1)}"/>`;
      for (const id of chain) {
        const l = L[id];
        if (at !== l.o) out.push(seg(at, l.o, true));
        out.push(seg(l.o, l.d, false));
        at = l.d;
      }
      if (at !== d.home) out.push(seg(at, d.home, true));
      return out.join("");
    }
    // labels step down out of each other's way (approximate mono width, 6.6px a char)
    const boxes = [];
    const pts = pl.slice().sort((a, b) => Y(a) - Y(b)).map(p => {
      const label = p.name.replace("Ramp — ", "ramp · ") + (p.id === d.home ? " (home)" : "");
      const wpx = label.length * 6.6, right = X(p) + 10 + wpx < 396;
      const x0 = right ? X(p) + 10 : X(p) - 10 - wpx;
      let y = Y(p) + 4;
      while (boxes.some(bx => x0 < bx[0] + bx[2] && bx[0] < x0 + wpx && Math.abs(bx[1] - y) < 13)) y += 13;
      boxes.push([x0, y, wpx]);
      return `<circle cx="${X(p).toFixed(1)}" cy="${Y(p).toFixed(1)}" r="${p.id === d.home ? 7 : 4.5}" class="city${p.id === d.home ? " home" : ""}"/>
        <text x="${(right ? X(p) + 10 : X(p) - 10).toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${right ? "start" : "end"}" class="cl">${esc(label)}</text>`;
    }).join("");
    return `<svg viewBox="0 0 400 400" class="plot" role="img" aria-label="Map of the ${d.days > 1 ? "week" : "day"}: loaded miles solid, empty miles dashed; the usual way in pink, par in amber">
      <g class="L-usual">${legs(s.usual.chain, "usual")}</g><g class="L-par">${legs(s.par.chain, "par")}</g>${pts}</svg>`;
  }

  // ---------------------------------------------------------------- one story
  function rowsFor(s) {
    const u = s.usual, p = s.par;
    if (s.day.mode === "routes") {
      const n = s.day.orders.length;
      return [
        [s.cost ? "the day cost" : "the day made", usd(s.cost ? u.dayCost : u.profit), usd(s.cost ? p.dayCost : p.profit)],
        [UNIT[s.seg] + " out", u.used, p.used],
        ["miles", Math.round(u.miles), Math.round(p.miles)],
        ["on time", `${u.onTime}/${n}`, `${p.onTime}/${n}`],
      ];
    }
    return [
      [s.day.days > 1 ? "the week made" : "the day made", usd(u.profit), usd(p.profit)],
      [s.seg === "drayage" ? "moves" : "loads", u.chain.length, p.chain.length],
      ["empty miles", Math.round(u.empty), Math.round(p.empty)],
    ];
  }

  function storyHtml(s, i, M) {
    const c = s.day.mode === "routes" ? routesCopy(s) : loadsCopy(s);
    const D = M.decisions[c.lesson];
    const [name, kind] = NAME[s.seg];
    return `<section class="story">
      <p class="mono">${String(i + 1).padStart(2, "0")} · ${esc(name)} · ${esc(kind)}</p>
      <h2>${esc(c.head)}</h2>
      <p class="sub">${esc(c.sub)}</p>
      <div class="stage">${s.day.mode === "routes" ? routesSvg(s) : loadsSvg(s)}</div>
      <table class="vs"><thead><tr><th></th><th class="u">usual</th><th class="p">par</th></tr></thead>
        <tbody>${rowsFor(s).map(r => `<tr><td>${esc(r[0])}</td><td class="u">${r[1]}</td><td class="p">${r[2]}</td></tr>`).join("")}</tbody></table>
      ${D ? `<p class="why">${esc(D.tradeoff.replace(/\.$/, ""))}. <a href="doors/${esc(D.door)}/">The door →</a></p>` : ""}
    </section>`;
  }

  function render(M, S) {
    document.title = "Run Sheet";
    app.innerHTML = `
      <header class="hero">
        <p class="mono">Run Sheet</p>
        <h1>Same day.<br>Planned twice.</h1>
        <p class="lede">Seven kinds of small fleet. One real-shaped day each, priced with published wages, diesel and rates — planned the way most dispatchers do it, then by a solver.</p>
        <p class="key"><span class="k-u">the usual way</span><span class="k-p">par</span></p>
        <p class="down">↓</p>
      </header>
      ${S.stories.map((s, i) => storyHtml(s, i, M)).join("")}
      <footer class="end"><a href="#sources">Where every number comes from</a><a href="doors/">The ten doors</a></footer>`;
    const stories = app.querySelectorAll(".story");
    if (still || !("IntersectionObserver" in window)) stories.forEach(el => el.classList.add("go"));
    else {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("go"); io.unobserve(e.target); } }), { threshold: 0.35 });
      stories.forEach(el => io.observe(el));
    }
  }

  // ---------------------------------------------------------------- sources (a read, not a tool)
  function sources(M) {
    const link = r => `<a href="${esc((r.source_url || "").split("|")[0].trim())}" rel="noopener" target="_blank">${esc(r.source_name || "source")}</a>`;
    const rows = [];
    for (const [id, scopes] of Object.entries(M.params)) for (const [scope, r] of Object.entries(scopes)) {
      if (scope === "events") continue;
      rows.push(`<tr><td>${esc(r.name || id)}<span class="sc">${esc(scope)}</span></td><td>${r.value}${r.unit ? " " + esc(r.unit) : ""}${r.low != null && r.high != null ? `<span class="sc">${r.low}–${r.high}</span>` : ""}</td><td>${link(r)}<span class="sc">${esc(r.confidence)}${r.as_of ? " · " + esc(r.as_of) : ""}</span></td></tr>`);
    }
    const veh = Object.values(M.vehicles).map(v => `<tr><td>${esc(v.name)}</td><td>${(+v.payload_lb).toLocaleString()} lb · $${(+v.cost_per_mile_ex_driver).toFixed(2)}/mi · $${Math.round(v.fixed_cost_per_day)}/day</td><td>${link(v)}</td></tr>`).join("");
    app.innerHTML = `<a class="back" href="#">← back</a>
      <p class="mono">model built ${esc(M.built)}</p><h2>Where the numbers come from</h2>
      <p class="lede">Every cost, rate, time and rule behind the stories, with the page it came from. <i>Published</i> = printed there. <i>Derived</i> = arithmetic on published numbers. <i>Estimate</i> = what operators say, used only as a range.</p>
      <h3 class="mono">trucks</h3><div class="tw"><table class="src">${veh}</table></div>
      <h3 class="mono">everything else</h3><div class="tw"><table class="src">${rows.join("")}</table></div>`;
  }

  let M, S;
  function route() {
    window.scrollTo(0, 0);
    if (location.hash === "#sources") sources(M); else render(M, S);
  }
  Promise.all([fetch("model.json").then(r => r.json()), fetch("stories.json").then(r => r.json())])
    .then(([m, s]) => { M = m; S = s; window.addEventListener("hashchange", route); route(); })
    .catch(e => { app.innerHTML = `<p>Could not load: ${esc(e.message)}</p>`; });
})();
