/* Run Sheet UI. One screen at a time: pick your business → the morning brief →
 * plan the day on the map → you vs par, and the door that explains the gap.
 * State lives in the URL hash (#courier/4821) so a day can be replayed or shared. */
(function () {
  "use strict";
  const E = window.RunSheet;
  const $ = s => document.querySelector(s);
  const app = $("#app");
  let M = null;

  const COLORS = ["#ffb627", "#6fe3ff", "#ff7aa8", "#9dff8a", "#ffffff"];
  const usd = x => (x < 0 ? "−$" : "$") + Math.abs(Math.round(x)).toLocaleString("en-US");
  const hm = h => { const m = Math.round(h * 60); const hh = Math.floor(m / 60) % 24, mm = m % 60; return `${hh}:${String(mm).padStart(2, "0")}`; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // segment order and the plain-English pitch for each, in their words
  const SEGS = [
    ["courier", "Courier / same-day", "Vans, a stack of stops, some with a deadline."],
    ["route_dist", "Route delivery", "Box trucks out to the same kind of accounts every day."],
    ["final_mile_bulky", "Furniture & appliance", "Two-person crews, few stops, long ones."],
    ["building_supply", "Lumber & building supply", "Jobsite drops off a flatbed or a boom."],
    ["ltl_pd", "LTL pickup & delivery", "City routes out of the terminal, paid by the hundredweight."],
    ["regional_tl", "Regional truckload", "One truck, one week, a board full of loads."],
    ["drayage", "Drayage", "Containers off the rail ramp, one day of turns."],
  ];
  const segName = id => (SEGS.find(s => s[0] === id) || [id, id])[1];

  function go(h) { location.hash = h; }

  // ---------------------------------------------------------------- home
  function home() {
    document.title = "Run Sheet";
    app.innerHTML = `
      <p class="mono">Run Sheet · a dispatcher's practice yard</p>
      <h1>Plan the day.<br>See what it cost.<br>See par.</h1>
      <p class="lede">A real day for a small fleet, priced with real numbers. You build the routes. A solver builds its own. The gap is the lesson.</p>
      <p class="mono pickhead">What do you run?</p>
      <div class="segs">${SEGS.map(([id, n, l]) => `
        <a class="seg" href="#${id}/${seedNow()}"><span class="t">${esc(n)}</span><span class="l">${esc(l)}</span><span class="go">→</span></a>`).join("")}
      </div>
      <p class="aside">Every number is a cost or rate someone published — wages, diesel, accessorials, the hours-of-service rules. <a href="#sources">See them all</a>. The lessons behind each debrief are <a href="doors/">the ten doors</a>.</p>`;
  }
  const seedNow = () => Math.floor(Math.random() * 1e6);

  // ---------------------------------------------------------------- play
  let day, plan, par, parSim, active = 0;

  function play(seg, seed) {
    day = E.generate(M, seg, seed);
    plan = day.mode === "routes" ? Array.from({ length: day.trucks }, () => []) : [];
    par = null; active = 0;
    brief();
  }

  function graded(seg) {
    const s = M.segments[seg];
    return s && s.graded_on ? s.graded_on : "";
  }

  function brief() {
    const v = M.vehicles[day.veh] || {};
    const ev = day.events.map(e => e.kind === "driver_callout" ? `<li class="ev">A driver called off. You have <b>${day.trucks}</b> trucks, not ${day.trucks + 1}.</li>` : "").join("");
    const body = day.mode === "routes"
      ? `<ul class="brief">
           <li><b>${day.orders.length}</b> stops on the board, <b>${day.orders.filter(o => o.tight).length}</b> with a tight window.${day.wave < 0.99 ? ` That's the first wave — a full day here runs about ${Math.round(day.typ)} stops a truck.` : ""}</li>
           <li><b>${day.trucks}</b> × ${esc(v.name || day.veh)} in the yard, rolling at 7:00.</li>
           ${ev}
           <li>${day.mayRoll ? "Whatever doesn't fit can roll to tomorrow." : "Every stop goes out today."} ${day.costOnly ? "You're graded on what the day costs." : ""}</li>
           <li>Late or left on the dock pays nothing today${E.has(M, "redelivery_fee", [day.seg]) ? `, and the redelivery costs <b>${usd(E.row(M, "redelivery_fee", [day.seg]).value)}</b>` : ""}.</li>
         </ul>`
      : `<ul class="brief">
           <li><b>${day.loads.length}</b> loads on the board${day.days > 1 ? " this week" : " today"}.</li>
           <li>One truck, starting in <b>${esc(day.places[0].name)}</b>, home by ${day.days > 1 ? "Friday night" : "the end of the shift"}.</li>
           <li>${E.row(M, "hos_11hr_drive", ["rules"]).value} hours driving inside a ${E.row(M, "hos_14hr_window", ["rules"]).value}-hour day, then 10 off. Deadhead is on you.</li>
         </ul>`;
    app.innerHTML = `
      <a class="back" href="#">← pick another business</a>
      <p class="mono">${esc(segName(day.seg))} · day ${day.seed}</p>
      <h2>${day.mode === "routes" ? "This morning" : day.days > 1 ? "This week" : "Today at the ramp"}</h2>
      ${body}
      ${graded(day.seg) ? `<p class="aside">Graded on: ${esc(graded(day.seg))}</p>` : ""}
      <button class="big" id="start">Plan it</button>`;
    $("#start").onclick = day.mode === "routes" ? board : loadBoard;
  }

  // ---------------------------------------------------------------- routes board
  function mapSvg(d, routes, interactive) {
    const S = 400 / d.side; // svg units per mile
    const parts = [`<svg viewBox="0 0 400 400" class="map" role="img" aria-label="Map of today's stops">`];
    for (let i = 1; i < 12; i++) parts.push(`<path d="M${i * 400 / 12} 0V400M0 ${i * 400 / 12}H400" class="grid"/>`);
    routes.forEach((ids, k) => {
      if (!ids.length) return;
      const pts = [d.yard].concat(ids.map(i => d.orders[i - 1])).concat([d.yard]);
      parts.push(`<polyline points="${pts.map(p => `${p.x * S},${p.y * S}`).join(" ")}" fill="none" stroke="${COLORS[k]}" stroke-width="2.5" stroke-linejoin="round" opacity=".9"/>`);
    });
    parts.push(`<rect x="${d.yard.x * S - 13}" y="${d.yard.y * S - 13}" width="26" height="26" class="yard"/><text x="${d.yard.x * S}" y="${d.yard.y * S + 4}" class="yl">YARD</text>`);
    const owner = {};
    routes.forEach((ids, k) => ids.forEach((i, j) => owner[i] = [k, j + 1]));
    for (const o of d.orders) {
      const own = owner[o.id];
      const fill = own ? COLORS[own[0]] : "none";
      parts.push(`<g class="stop${interactive ? " tap" : ""}" data-id="${o.id}">
        <circle cx="${o.x * S}" cy="${o.y * S}" r="20" fill="transparent"/>
        <circle cx="${o.x * S}" cy="${o.y * S}" r="11" fill="${fill}" class="${o.tight ? "tight" : "open"}"/>
        <text x="${o.x * S}" y="${o.y * S + 4}" class="${own ? "on" : ""}">${own ? own[1] : o.id}</text></g>`);
    }
    parts.push("</svg>");
    return parts.join("");
  }

  function board() {
    const sim = E.simulate(M, day, plan);
    const v = M.vehicles[day.veh];
    const tabs = plan.map((ids, k) => {
      const r = sim.routes[k];
      const full = Math.round(100 * r.lb / v.payload_lb);
      const warn = r.overLb || r.overPal ? "over" : r.late ? "late" : "";
      return `<button class="truck ${k === active ? "on" : ""} ${warn}" data-k="${k}" style="--c:${COLORS[k]}">
        <span class="tn">Truck ${k + 1}</span>
        <span class="tm">${ids.length} stops · ${full}% weight</span>
        <span class="tm">${ids.length ? "back " + hm(r.back) : "in the yard"}${r.late ? ` · ${r.late} late` : ""}</span></button>`;
    }).join("");
    const left = day.orders.length - plan.flat().length;
    app.innerHTML = `
      <div class="bar"><a class="back" href="#${day.seg}/${day.seed}">← brief</a><span class="mono">${left} stops left on the dock</span></div>
      <div class="trucks">${tabs}</div>
      <p class="hint">Pick a truck, then tap stops in the order it runs them. Tap again to pull one off. <span class="key"><i class="k-t"></i>tight window</span></p>
      <div class="mapwrap">${mapSvg(day, plan, true)}</div>
      <div class="live">
        <div><span class="mono">miles</span><b>${Math.round(sim.miles)}</b></div>
        <div><span class="mono">late</span><b>${sim.late}</b></div>
        <div><span class="mono">${day.costOnly ? "day's cost" : "day so far"}</span><b>${usd(day.costOnly ? sim.dayCost : sim.profit)}</b></div>
      </div>
      <button class="big" id="send" ${sim.invalid ? "disabled" : ""}>${sim.invalid ? esc(sim.invalid) : "Send the trucks"}</button>
      <div id="tip" class="tip"></div>`;
    app.querySelectorAll(".truck").forEach(b => b.onclick = () => { active = +b.dataset.k; board(); });
    app.querySelectorAll(".stop.tap").forEach(g => g.onclick = () => {
      const id = +g.dataset.id;
      const k = plan.findIndex(r => r.includes(id));
      if (k >= 0) plan[k] = plan[k].filter(i => i !== id); else plan[active].push(id);
      board();
      const o = day.orders[id - 1];
      $("#tip").textContent = `Stop ${id}: ${o.lb.toLocaleString()} lb${o.pallets ? `, ${o.pallets} pallets` : ""}, window ${hm(o.open)}–${hm(o.close)}, ${Math.round(o.service)} min on site, pays ${usd(o.revenue)}.`;
    });
    $("#send").onclick = finish;
  }

  // ---------------------------------------------------------------- loads board
  function loadBoard() {
    const P = Object.fromEntries(day.places.map(p => [p.id, p]));
    const sim = E.simulate(M, day, plan);
    const rows = day.loads.map(l => {
      const k = plan.indexOf(l.id);
      // grey out what the truck can no longer make from where the plan leaves it
      const cant = k < 0 && /missed/.test(E.simulate(M, day, plan.concat([l.id])).invalid || "");
      return `<button class="load ${k >= 0 ? "on" : ""} ${cant ? "cant" : ""}" data-id="${l.id}" ${cant ? 'aria-disabled="true"' : ""}>
        <span class="seq">${k >= 0 ? k + 1 : ""}</span>
        <span class="ln">${esc(P[l.o].name)} → ${esc(P[l.d].name)}</span>
        <span class="meta">${cant ? "can't make it · " : ""}${day.days > 1 ? DAYS[l.day] + " " : ""}${hm(l.ready)}–${hm(l.close)} · ${Math.round(l.miles)} mi</span>
        <span class="pay">${usd(l.rate)}${day.seg === "regional_tl" ? ` · $${(l.rate / l.miles).toFixed(2)}/mi` : ""}</span></button>`;
    }).join("");
    app.innerHTML = `
      <div class="bar"><a class="back" href="#${day.seg}/${day.seed}">← brief</a><span class="mono">${plan.length} booked</span></div>
      <p class="hint">Book loads in the order the truck runs them. Deadhead between them is on you.</p>
      <div class="loads">${rows}</div>
      <div class="live">
        <div><span class="mono">empty mi</span><b>${Math.round(sim.empty)}</b></div>
        ${day.seg === "drayage" ? `<div><span class="mono">moves</span><b>${plan.length}</b></div>` : `<div><span class="mono">all-in /mi</span><b>${sim.miles ? "$" + sim.kpi.rate_per_mile_all_in.toFixed(2) : "—"}</b></div>`}
        <div><span class="mono">${day.days > 1 ? "week" : "day"}</span><b>${usd(sim.profit)}</b></div>
      </div>
      <button class="big" id="send" ${sim.invalid ? "disabled" : ""}>${sim.invalid ? esc(sim.invalid) : "Lock the plan"}</button>`;
    app.querySelectorAll(".load").forEach(b => b.onclick = () => {
      if (b.classList.contains("cant")) return;
      const id = +b.dataset.id;
      plan = plan.includes(id) ? plan.filter(i => i !== id) : plan.concat([id]);
      loadBoard();
    });
    $("#send").onclick = finish;
  }

  // ---------------------------------------------------------------- debrief
  function door(decisionId) {
    const d = M.decisions[decisionId];
    return d && d.door ? d : null;
  }

  function finish() {
    const you = E.simulate(M, day, plan);
    if (!par) { par = day.par || E.solve(M, day); parSim = E.simulate(M, day, par); }
    const p = parSim;
    const gap = day.mode === "routes" && day.costOnly ? you.dayCost - p.dayCost : p.profit - you.profit;
    let lesson;
    if (day.mode === "routes") {
      if (you.late + you.missed.length > p.late + p.missed.length) lesson = "route_build";
      else if (you.used > p.used) lesson = "fleet_size_today";
      else if (you.miles > p.miles * 1.08) lesson = "stop_sequence";
      else lesson = "load_build";
    } else {
      lesson = you.kpi.empty_mile_pct > p.kpi.empty_mile_pct + 3 ? "backhaul" : "accept_load";
    }
    const D = door(lesson);
    const rowsR = day.mode === "routes" ? [
      day.costOnly ? ["Day's cost", usd(you.dayCost), usd(p.dayCost)] : ["Day's take", usd(you.profit), usd(p.profit)],
      ["Stops on time", `${day.orders.length - you.late - you.missed.length} / ${day.orders.length}`, `${day.orders.length - p.late - p.missed.length} / ${day.orders.length}`],
      ["Trucks out", you.used, p.used],
      ["Miles", Math.round(you.miles), Math.round(p.miles)],
      ["Driver hours", you.hours.toFixed(1), p.hours.toFixed(1)],
      ["Cost per stop", usd(you.dayCost / day.orders.length), usd(p.dayCost / day.orders.length)],
    ] : [
      [day.days > 1 ? "Week's take" : "Day's take", usd(you.profit), usd(p.profit)],
      ...(day.seg === "drayage" ? [] : [["Loads", you.chain.length, p.chain.length]]),
      ["Empty miles", `${Math.round(you.empty)} (${Math.round(you.kpi.empty_mile_pct)}%)`, `${Math.round(p.empty)} (${Math.round(p.kpi.empty_mile_pct)}%)`],
      day.seg === "drayage" ? ["Moves", you.chain.length, p.chain.length] : ["All-in rate per mile", "$" + you.kpi.rate_per_mile_all_in.toFixed(2), "$" + p.kpi.rate_per_mile_all_in.toFixed(2)],
      ["Detention collected", usd(you.detention), usd(p.detention)],
    ];
    const verdict = gap <= 1 ? (gap < -1 ? `You beat par by ${usd(-gap)}.` : "You matched par.")
      : day.costOnly && day.mode === "routes" ? `Par ran it for ${usd(gap)} less.` : `Par made ${usd(gap)} more.`;
    app.innerHTML = `
      <a class="back" href="#${day.seg}/${day.seed}">← same day again</a>
      <p class="mono">${esc(segName(day.seg))} · day ${day.seed} · debrief</p>
      <h2>${verdict}</h2>
      <table class="vs"><thead><tr><th></th><th>You</th><th>Par</th></tr></thead>
        <tbody>${rowsR.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table>
      ${day.mode === "routes" ? `<div class="twin"><figure>${mapSvg(day, plan, false)}<figcaption>You</figcaption></figure><figure>${mapSvg(day, par, false)}<figcaption>Par</figcaption></figure></div>` :
        `<p class="aside">Par booked: ${p.chain.map(id => "#" + id).join(" → ") || "nothing"}.</p>`}
      ${D ? `<div class="lesson"><p class="mono">the lesson</p><p class="lt">${esc(D.tradeoff || "")}</p>
        ${D.common_mistake ? `<p class="lm">${esc(D.common_mistake)}</p>` : ""}
        <a href="doors/${esc(D.door)}/">Read the door →</a></div>` : ""}
      <div class="cost"><p class="mono">where your money went</p>
        ${Object.entries(you.cost).map(([k, v]) => `<div><span>${k.replace(/_/g, " ")}</span><b>${usd(v)}</b></div>`).join("")}
        ${day.costOnly && day.mode === "routes" ? "" : `<div><span>revenue</span><b>${usd(you.revenue)}</b></div>`}</div>
      <div class="again"><a class="big" href="#${day.seg}/${seedNow()}">A new day</a><a class="ghost" href="#sources">Where the numbers come from</a></div>
      <p class="aside">Par is the best plan our solver found for this exact day, not a proof of the best possible.</p>`;
  }

  // ---------------------------------------------------------------- sources
  function sources() {
    const rows = [];
    for (const [id, scopes] of Object.entries(M.params)) for (const [scope, r] of Object.entries(scopes)) {
      if (scope === "events") continue;
      rows.push(`<tr><td>${esc(r.name || id)}<span class="sc">${esc(scope)}</span></td><td>${r.value}${r.unit ? " " + esc(r.unit) : ""}${r.low != null && r.high != null ? `<span class="sc">${r.low}–${r.high}</span>` : ""}</td>
        <td><a href="${esc(r.source_url.split("|")[0].trim())}" rel="noopener" target="_blank">${esc(r.source_name || "source")}</a><span class="sc">${esc(r.confidence)}${r.as_of ? " · " + esc(r.as_of) : ""}</span></td></tr>`);
    }
    const veh = Object.values(M.vehicles).map(v => `<tr><td>${esc(v.name)}</td><td>${(+v.payload_lb).toLocaleString()} lb · ${v.pallet_positions || 0} pallets · $${(+v.cost_per_mile_ex_driver).toFixed(2)}/mi · $${Math.round(v.fixed_cost_per_day)}/day</td><td><a href="${esc(v.source_url.split("|")[0].trim())}" target="_blank" rel="noopener">${esc(v.source_name || "source")}</a></td></tr>`).join("");
    app.innerHTML = `<a class="back" href="#">← back</a>
      <p class="mono">model built ${esc(M.built)}</p><h2>Where the numbers come from</h2>
      <p class="lede">Every cost, rate, time and rule the practice yard uses, with the page it came from. <i>Published</i> = printed there. <i>Derived</i> = arithmetic on published numbers. <i>Estimate</i> = what operators say, used only as a range.</p>
      <h3 class="mono">trucks</h3><div class="tw"><table class="src">${veh}</table></div>
      <h3 class="mono">everything else</h3><div class="tw"><table class="src">${rows.join("")}</table></div>`;
  }

  // ---------------------------------------------------------------- router
  function route() {
    window.scrollTo(0, 0);
    const h = location.hash.replace(/^#/, "");
    if (h === "sources") return sources();
    const [seg, seed] = h.split("/");
    if (SEGS.some(s => s[0] === seg)) {
      const n = +seed || seedNow();
      if (!day || day.seg !== seg || day.seed !== n) return play(seg, n);
      return brief();
    }
    home();
  }

  fetch("model.json").then(r => r.json()).then(m => { M = m; window.addEventListener("hashchange", route); route(); })
    .catch(e => { app.innerHTML = `<p>Could not load the model: ${esc(e.message)}</p>`; });
})();
