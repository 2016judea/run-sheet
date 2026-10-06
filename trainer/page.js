/* Run Sheet page. Nothing to press. Each business is one scene: the same real day
 * plays out twice side by side — the usual way, and the rule a dispatcher can run by
 * hand (trainer/rules.js) — with a clock, the pay meter and each truck's state. Then
 * a sheet says what to do tomorrow, in that day's own numbers.
 * Data: site/stories.json (scripts/stories.js) and site/model.json (model/compile.py). */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const PINK = "#ff7aa8", AMBER = "#ffb627";
  const usd = x => (x < 0 ? "−$" : "$") + Math.abs(Math.round(x)).toLocaleString("en-US");
  const num = x => Math.round(x).toLocaleString("en-US");
  const hm = h => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
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
  const UNIT = { courier: ["van", "vans"], route_dist: ["truck", "trucks"], ltl_pd: ["truck", "trucks"], final_mile_bulky: ["crew", "crews"], building_supply: ["truck", "trucks"] };

  // ================================================================ copy, from the numbers
  function routesCopy(s) {
    const u = s.usual, r = s.rule, n = s.day.orders.length, [one, many] = UNIT[s.seg];
    let head;
    if (r.used < u.used) head = `${Cap(words(u.used))} ${many} went out. ${Cap(words(r.used))} would have done it.`;
    else if (u.wait - r.wait > 1) head = `${Math.round(u.wait)} hours paid to sit outside a stop.`;
    else if (u.onTime < r.onTime) head = `${Cap(words(n - u.onTime))} stops ran late. ${n - r.onTime ? Cap(words(n - r.onTime)) : "None"} had to.`;
    else head = `Same stops, ${num(u.miles - r.miles)} fewer miles.`;
    const kMin = Math.max(1, Math.ceil(s.lb / s.payload));
    const tight = s.day.orders.filter(o => o.tight).length;
    const steps = [
      `<b>Count the freight before you count drivers.</b> Today is ${num(s.lb)} lb and a ${one} carries ${num(s.payload)}, so it fits on ${words(kMin)}. Send ${words(r.used)}${r.used > kMin ? `: the extra ${one} is what keeps the window stops on time` : ""}.`,
      `<b>Cut the map into ${words(r.used)} slice${r.used > 1 ? "s" : ""} around the yard</b>, one per ${one}. No ${one} crosses into another's slice.`,
      `<b>In each slice, run the anytime stops nearest-next.</b> Then drop each of the ${tight} window stops in where you'll pass it while it's open. Early for a window? Do the next stop first. Never park and wait.`,
    ];
    return { head, fix: `The fix: one slice of the map per ${one}, anytime stops first, window stops dropped in when they open.`, steps };
  }
  function loadsCopy(s) {
    const d = s.day, L = Object.fromEntries(d.loads.map(l => [l.id, l])), P = Object.fromEntries(d.places.map(p => [p.id, p]));
    const nm = id => P[id].name.replace("Ramp — ", "the ramp at ");
    const dray = s.seg === "drayage", word = dray ? "move" : "load";
    const net = (l, dh) => l.rate - (l.miles + dh) * s.cpm;
    // the moment the two plans split: same truck, same place, two different picks
    const u = s.usual, r = s.rule;
    let i = 0;
    while (i < u.chain.length && i < r.chain.length && u.chain[i] === r.chain[i]) i++;
    const pick = (p, j) => {
      if (j >= p.chain.length) return null;
      const l = L[p.chain[j]], dh = p.deadheads[j], hrs = p.ats[j] - (j ? p.ats[j - 1] : 6), n = net(l, dh);
      return { l, dh, hrs, n, ph: n / hrs };
    };
    const U = pick(u, i), Rr = pick(r, i);
    const where = i === 0 ? `${dray ? "First move of the day" : "Monday morning"}, from ${nm(d.home)}` : `After the ${word} to ${nm(L[u.chain[i - 1]].d)}`;
    const head = dray ? "The best-paying move wasn't the best move." : "The best-paying load wasn't the best load.";
    const steps = U && Rr ? [
      `<b>${U.dh ? "Before you book, take off the empty miles to reach it." : "Before you book, count the hours, not just the rate."}</b> ${where}, the top rate is ${nm(U.l.o)} → ${nm(U.l.d)} at ${usd(U.l.rate)}. ${U.dh ? `${num(U.dh)} empty miles to get there, ` : ""}${num(U.l.miles)} loaded, at $${s.cpm.toFixed(2)} a mile: it nets <b>${usd(U.n)}</b> and ties the truck up ${U.hrs.toFixed(1)} hours. That's ${usd(U.ph)} an hour.`,
      `<b>Rank the board by what's left per hour, not by the rate.</b> ${nm(Rr.l.o)} → ${nm(Rr.l.d)} pays ${usd(Rr.l.rate)}${Rr.l.rate < U.l.rate ? " — less" : ""}, but nets ${usd(Rr.n)} in ${Rr.hrs.toFixed(1)} hours: <b>${usd(Rr.ph)} an hour</b>. Book that one.`,
      `<b>Then ask where it leaves you.</b> Take the best ${word} you can still make, do it again from where that ${word} drops, and when nothing pays, head home.`,
    ] : [
      `<b>Rank every ${word} by what it pays per hour after the empty miles to reach it.</b>`,
      `<b>Then ask where it leaves you.</b> Take the best ${word} you can still make, and when nothing pays, head home.`,
    ];
    return { head, fix: `The fix: rank every ${word} by what it pays per hour after the empty miles to reach it.`, steps };
  }

  // ================================================================ scenes
  function routesScene(s, i) {
    const pane = k => `<div class="pane p-${k}"><p class="mono m-${k}">${k === "usual" ? "the usual way" : "the rule"}</p>
      <svg viewBox="0 0 200 200" class="pmap" data-k="${k}"></svg>
      <div class="meter"><b data-m="${k}">$0</b><span>paid to ${s.crew > 1 ? "crews" : "drivers"}</span></div>
      <ul class="vans" data-v="${k}"></ul></div>`;
    return `<div class="clockbig"><span data-clock>7:00</span><span class="mono">same ${s.day.orders.length} stops, same morning</span></div>
      <div class="duo">${pane("usual")}${pane("rule")}</div>
      <p class="lg"><span><i class="dot"></i>stop</span><span><i class="dot win"></i>window stop</span><span><i class="ring"></i>parked, waiting</span></p>`;
  }
  function loadsScene(s) {
    const pane = k => `<div class="pane p-${k}"><p class="mono m-${k}">${k === "usual" ? "books the top rate" : "the rule"}</p>
      <svg viewBox="0 0 200 200" class="pmap" data-k="${k}"></svg>
      <div class="meter"><b data-m="${k}">$0</b><span>${s.seg === "drayage" ? "moves" : "loads"} paid</span></div>
      <div class="odo"><span><b data-ld="${k}">0</b> paid mi</span><span class="em"><b data-em="${k}">0</b> empty mi</span></div>
      <p class="status" data-st="${k}"></p></div>`;
    return `<div class="duo">${pane("usual")}${pane("rule")}</div>
      <p class="lg"><span><i class="ln"></i>loaded</span><span><i class="ln dash"></i>empty</span></p>`;
  }
  function storyHtml(s, i) {
    const c = s.day.mode === "routes" ? routesCopy(s) : loadsCopy(s);
    const [name, kind] = NAME[s.seg];
    const scope = s.day.mode === "routes" ? "on this day" : s.day.days > 1 ? "this week" : "today";
    const score = s.ruleGap >= s.gap - 1
      ? `By hand, this matched the best plan a computer found: <b>${usd(s.ruleGap)} ${s.cost ? "cheaper" : "more"} ${scope}</b>.`
      : `By hand, this gets <b>${usd(s.ruleGap)}</b> of the ${usd(s.gap)} a computer finds ${scope}.`;
    return `<section class="story" data-i="${i}">
      <p class="mono">${esc(name)} · ${esc(kind)}</p>
      <h2>${esc(c.head)}</h2>
      <p class="fix">${esc(c.fix)}</p>
      ${s.day.mode === "routes" ? routesScene(s, i) : loadsScene(s)}
      <div class="sheet"><p class="mono">do this tomorrow</p>
        <ol>${c.steps.map(t => `<li>${t}</li>`).join("")}</ol>
        <p class="score">${score}</p></div>
    </section>`;
  }

  // ================================================================ playback
  function routesPlayer(sec, s) {
    const d = s.day, S = 180 / d.side, X = p => 10 + p.x * S, Y = p => 10 + p.y * S;
    const byId = Object.fromEntries(d.orders.map(o => [o.id, o]));
    const [one] = UNIT[s.seg];
    const panes = {};
    for (const k of ["usual", "rule"]) {
      const col = k === "usual" ? PINK : AMBER, svg = $(`svg[data-k="${k}"]`, sec);
      let h = `<rect width="200" height="200" fill="var(--bg2)"/>`;
      for (const o of d.orders) h += `<circle cx="${X(o).toFixed(1)}" cy="${Y(o).toFixed(1)}" r="3.4" class="o${o.tight ? " win" : ""}" data-o="${o.id}"/>`;
      h += `<rect x="${X(d.yard) - 6}" y="${Y(d.yard) - 6}" width="12" height="12" class="yard"/>`;
      const vans = s[k].routes.map((r, i) => {
        const wp = [d.yard].concat(r.ids.map(id => byId[id])).concat([d.yard]);
        let w = 0;
        const segs = r.t.map(x => {
          const o = { kind: x[0], a: x[1], b: x[2], id: x[3] };
          if (x[0] === "drive") { o.from = wp[w]; o.to = wp[w + 1]; w++; } else o.at = x[0] === "yard" ? d.yard : wp[w];
          return o;
        });
        h += `<path data-tr="${i}" fill="none" stroke="${col}" stroke-width="1.5" opacity=".5"/>`;
        h += `<g data-van="${i}"><circle r="9" fill="none" stroke="${col}" stroke-width="2" class="pulse" opacity="0"/><circle r="5" fill="${col}" stroke="var(--bg2)" stroke-width="1.5"/></g>`;
        return { r, segs, i, end: r.t.length ? r.t[r.t.length - 1][2] : 7, trail: [] };
      });
      svg.innerHTML = h;
      $(`ul[data-v="${k}"]`, sec).innerHTML = vans.map(v => `<li data-row="${v.i}"><i style="background:${col}"></i>${one} ${v.i + 1}<span></span></li>`).join("");
      panes[k] = { svg, vans, col };
    }
    const H0 = 7, H1 = Math.ceil(Math.max(7.5, ...["usual", "rule"].flatMap(k => panes[k].vans.map(v => v.end)))) + 0.15;
    const SEC_PER_HR = 1.8;
    function reset() {
      for (const k in panes) {
        panes[k].vans.forEach(v => { v.trail = []; $(`path[data-tr="${v.i}"]`, panes[k].svg).setAttribute("d", ""); });
        panes[k].svg.querySelectorAll("circle.o").forEach(c => c.removeAttribute("style"));
      }
      sec.querySelector(".sheet").classList.remove("lit");
    }
    function draw(t) {
      const H = Math.min(H1, H0 + t / SEC_PER_HR);
      $("[data-clock]", sec).textContent = hm(H);
      for (const k in panes) {
        const P = panes[k]; let paid = 0;
        for (const v of P.vans) {
          const g = $(`g[data-van="${v.i}"]`, P.svg), row = $(`ul[data-v="${k}"] li[data-row="${v.i}"] span`, sec);
          if (!v.r.ids.length) { g.setAttribute("transform", `translate(${X(d.yard)},${Y(d.yard)})`); g.style.opacity = .3; row.textContent = "stays home · $0"; row.className = "home"; continue; }
          paid += (Math.min(H, v.end) - 7) * s.wage;
          let pos = d.yard, state = "loading at the yard", cls = "", pulse = 0;
          if (H >= v.end) { state = `back at ${hm(v.end)}`; }
          else for (const x of v.segs) {
            if (H < x.a || H > x.b) continue;
            if (x.kind === "drive") { const f = (H - x.a) / ((x.b - x.a) || 1); pos = { x: x.from.x + (x.to.x - x.from.x) * f, y: x.from.y + (x.to.y - x.from.y) * f }; state = "driving"; }
            else if (x.kind === "wait") { pos = x.at; state = `parked, waiting · ${usd((H - x.a) * s.wage)}`; cls = "bad"; pulse = 1; }
            else if (x.kind === "late") { pos = x.at; state = "late to this stop"; cls = "bad"; }
            else if (x.kind === "stop") { pos = x.at; state = "at a stop"; }
            if (x.id && (x.kind === "stop" || x.kind === "late")) { const c = $(`circle[data-o="${x.id}"]`, P.svg); if (c) c.style.fill = P.col; }
            break;
          }
          g.setAttribute("transform", `translate(${X(pos).toFixed(1)},${Y(pos).toFixed(1)})`);
          $(".pulse", g).setAttribute("opacity", pulse ? (0.35 + 0.65 * Math.abs(Math.sin(t * 4))).toFixed(2) : 0);
          row.textContent = state; row.className = cls;
          v.trail.push(`${X(pos).toFixed(1)},${Y(pos).toFixed(1)}`);
          if (v.trail.length > 1) $(`path[data-tr="${v.i}"]`, P.svg).setAttribute("d", "M" + v.trail.join("L"));
        }
        $(`[data-m="${k}"]`, sec).textContent = usd(paid);
      }
      if (H >= H1 - 0.01) sec.querySelector(".sheet").classList.add("lit");
    }
    return { dur: (H1 - H0) * SEC_PER_HR, draw, reset };
  }

  function loadsPlayer(sec, s) {
    const d = s.day, P = Object.fromEntries(d.places.map(p => [p.id, p])), L = Object.fromEntries(d.loads.map(l => [l.id, l]));
    const used = new Set([d.home]);
    for (const k of ["usual", "rule"]) for (const id of s[k].chain) { used.add(L[id].o); used.add(L[id].d); }
    const pl = d.places.filter(p => used.has(p.id));
    const lats = pl.map(p => p.lat), lons = pl.map(p => p.lon), kx = Math.cos(lats[0] * Math.PI / 180);
    const w = (Math.max(...lons) - Math.min(...lons)) * kx || .1, hh = Math.max(...lats) - Math.min(...lats) || .1;
    const sc = 150 / Math.max(w, hh), ox = (200 - w * sc) / 2, oy = (200 - hh * sc) / 2;
    const GX = id => ox + (P[id].lon - Math.min(...lons)) * kx * sc, GY = id => oy + (Math.max(...lats) - P[id].lat) * sc;
    const nm = id => P[id].name.replace("Ramp — ", "ramp · ");
    const panes = {};
    for (const k of ["usual", "rule"]) {
      const col = k === "usual" ? PINK : AMBER, svg = $(`svg[data-k="${k}"]`, sec), p = s[k];
      const legs = []; let at = d.home;
      p.chain.forEach((id, j) => {
        const l = L[id];
        if (p.deadheads[j] > 0) legs.push({ type: "empty", from: at, to: l.o, mi: p.deadheads[j] });
        legs.push({ type: "load", from: l.o, to: l.d, mi: l.miles, rate: l.rate });
        at = l.d;
      });
      if (p.home > 0) legs.push({ type: "empty", from: at, to: d.home, mi: p.home });
      let h = `<rect width="200" height="200" fill="var(--bg2)"/>`;
      const boxes = [];
      for (const q of pl.slice().sort((a, b) => GY(a.id) - GY(b.id))) {
        const label = nm(q.id), wpx = label.length * 4.6, right = GX(q.id) + 6 + wpx < 198;
        const x0 = right ? GX(q.id) + 6 : GX(q.id) - 6 - wpx;
        let y = GY(q.id) + 3;
        while (boxes.some(bx => x0 < bx[0] + bx[2] && bx[0] < x0 + wpx && Math.abs(bx[1] - y) < 9)) y += 9;
        boxes.push([x0, y, wpx]);
        h += `<circle cx="${GX(q.id).toFixed(1)}" cy="${GY(q.id).toFixed(1)}" r="${q.id === d.home ? 4.2 : 2.8}" class="city${q.id === d.home ? " home" : ""}"/>
          <text x="${(right ? GX(q.id) + 6 : GX(q.id) - 6).toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${right ? "start" : "end"}" class="cl">${esc(label)}</text>`;
      }
      h += `<g data-trail></g><circle data-truck r="5" fill="${col}" stroke="var(--bg2)" stroke-width="1.5"/>`;
      svg.innerHTML = h;
      panes[k] = { svg, legs, col, total: legs.reduce((a, l) => a + l.mi, 0) };
    }
    const MI_PER_SEC = d.days > 1 ? 170 : 14;
    const total = Math.max(panes.usual.total, panes.rule.total);
    function reset() { sec.querySelector(".sheet").classList.remove("lit"); }
    function draw(t) {
      const mi = t * MI_PER_SEC;
      for (const k in panes) {
        const Pn = panes[k]; let left = Math.min(mi, Pn.total), paid = 0, ld = 0, em = 0, trail = "", cur = [GX(d.home), GY(d.home)], st = "", bad = false;
        for (const l of Pn.legs) {
          if (left <= 0) break;
          const dd = Math.min(left, l.mi), f = dd / l.mi;
          const x1 = GX(l.from), y1 = GY(l.from), x2 = x1 + (GX(l.to) - x1) * f, y2 = y1 + (GY(l.to) - y1) * f;
          trail += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${Pn.col}" stroke-width="${l.type === "load" ? 2.4 : 1.6}"${l.type === "load" ? "" : ' stroke-dasharray="3 2.5"'} fill="none"/>`;
          if (l.type === "load") { ld += dd; if (f >= 1) paid += l.rate; } else em += dd;
          cur = [x2, y2];
          if (f < 1) { st = l.type === "load" ? `hauling to ${nm(l.to)} · ${usd(l.rate)}` : `driving empty to ${nm(l.to)}`; bad = l.type !== "load"; }
          left -= dd;
        }
        if (mi >= Pn.total) st = `home · ${usd(s[k].profit)} ${d.days > 1 ? "for the week" : "for the day"}`;
        $("[data-trail]", Pn.svg).innerHTML = trail;
        $("[data-truck]", Pn.svg).setAttribute("cx", cur[0].toFixed(1)); $("[data-truck]", Pn.svg).setAttribute("cy", cur[1].toFixed(1));
        $(`[data-m="${k}"]`, sec).textContent = usd(paid);
        $(`[data-ld="${k}"]`, sec).textContent = num(ld); $(`[data-em="${k}"]`, sec).textContent = num(em);
        const e = $(`[data-st="${k}"]`, sec); e.textContent = st; e.className = "status" + (bad ? " bad" : "");
      }
      if (mi >= total) sec.querySelector(".sheet").classList.add("lit");
    }
    return { dur: total / MI_PER_SEC, draw, reset };
  }

  // ================================================================ page
  let RAF = null;
  function render(S) {
    document.title = "Run Sheet";
    app.innerHTML = `
      <header class="hero">
        <p class="mono">Run Sheet</p>
        <h1>Same day.<br>Run two ways.</h1>
        <p class="lede">Seven kinds of small fleet. One real day each, priced with published wages, diesel and rates. Watch it run the usual way, then by a rule you can follow tomorrow morning with a map and a pen.</p>
        <p class="key"><span class="k-u">the usual way</span><span class="k-p">the rule</span></p>
      </header>
      ${S.stories.map((s, i) => storyHtml(s, i)).join("")}
      <footer class="end"><a href="#sources">Where every number comes from</a><a href="doors/">The ten doors</a></footer>`;
    const players = [...app.querySelectorAll(".story")].map(sec => {
      const s = S.stories[+sec.dataset.i];
      return { sec, p: s.day.mode === "routes" ? routesPlayer(sec, s) : loadsPlayer(sec, s), vis: false, t0: null };
    });
    if (still || !("IntersectionObserver" in window)) { players.forEach(x => x.p.draw(x.p.dur)); return; }
    players.forEach(x => x.p.draw(0));
    const io = new IntersectionObserver(es => es.forEach(e => { const x = players.find(y => y.sec === e.target); x.vis = e.isIntersecting; if (!x.vis) x.t0 = null; }), { threshold: 0.25 });
    players.forEach(x => io.observe(x.sec));
    const HOLD = 5;
    function tick(now) {
      for (const x of players) {
        if (!x.vis) continue;
        if (x.t0 == null) x.t0 = now;
        let t = (now - x.t0) / 1000;
        if (t > x.p.dur + HOLD) { x.t0 = now; t = 0; x.p.reset(); }
        x.p.draw(Math.min(t, x.p.dur));
      }
      RAF = requestAnimationFrame(tick);
    }
    RAF = requestAnimationFrame(tick);
  }

  // ================================================================ sources (a read, not a tool)
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
      <p class="lede">Every cost, rate, time and rule behind the scenes, with the page it came from. <i>Published</i> = printed there. <i>Derived</i> = arithmetic on published numbers. <i>Estimate</i> = what operators say, used only as a range.</p>
      <h3 class="mono">trucks</h3><div class="tw"><table class="src">${veh}</table></div>
      <h3 class="mono">everything else</h3><div class="tw"><table class="src">${rows.join("")}</table></div>`;
  }

  let M, S;
  function route() {
    if (RAF) cancelAnimationFrame(RAF);
    window.scrollTo(0, 0);
    if (location.hash === "#sources") sources(M); else render(S);
  }
  Promise.all([fetch("model.json").then(r => r.json()), fetch("stories.json").then(r => r.json())])
    .then(([m, s]) => { M = m; S = s; window.addEventListener("hashchange", route); route(); })
    .catch(e => { app.innerHTML = `<p>Could not load: ${esc(e.message)}</p>`; });
})();
