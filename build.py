#!/usr/bin/env python3
"""Build site/ from DOORS. One source of truth for every page.

    python3 build.py && python3 scripts/deploy.py

Every door passes one test before it ships: the sentence is equally true at any
large parcel network. Nothing here names a company, a building, a system, a
tuned constant, a dollar figure or a colleague.
"""
from __future__ import annotations

import html
from pathlib import Path

SITE = Path(__file__).resolve().parent / "site"
TITLE = "Dock Doors"
TAGLINE = "Ten ideas for running a dock, a warehouse or a fleet. Each one: the line, your floor, why it is true, what to measure Monday, the rule. No tool, no data, no pitch."

# ----------------------------------------------------------------------------
# The doors
# ----------------------------------------------------------------------------

DOORS = [
    dict(
        slug="the-signal-is-already-there",
        group="On the floor",
        title="The signal is already there.",
        line="Before you buy a system, join two signals your building already gives off.",
        floor="""Walk your outbound dock for one shift and watch the lead. They walk the lanes
looking for one thing: a lane full of work with nobody on it. When they find one they
radio someone over. They do this for eight hours. That is a person polling a signal.
Now look above the lane. There is a light that turns on when the lane is full. There is
a scanner in every associate's hand that says where they are and how fast they are
working. The building already knows both halves of the lead's job. Nobody has joined
them.""",
        why="""Most of the data a building needs to run itself already exists as exhaust.
Sensors on the equipment, scan events on the handhelds, timestamps on every move, the
schedule on the wall. Each lives in a different system owned by a different team, and
each team reads its own. The gap is never the sensor. The gap is the join.
A join costs a week. A new system costs a year, and it still needs the join.""",
        monday=[
            "List every signal the floor emits: lights, photo-eyes, scan events, door sensors, trailer sensors, the shift plan. Write down who reads each one today.",
            "Find the human loop. Which signal does a person walk around checking? That is your first join.",
            "Join it to one other signal you already have and send one message. Measure what the message changed before you build anything else.",
        ],
        rule="Never buy a system to produce a signal you already emit.",
        rule_why="A vendor sells the sensor and the dashboard. What you need is the join, and only you can do that, because only you own both sides.",
        trap="""The signal you can get is never quite the thing you want to know. A full-lane
light says a beam is blocked, not that the lane is full. A scan says where someone was,
not where they are. Treat every signal as a proxy and measure how far it sits from the
truth. See door three and door five.""",
    ),
    dict(
        slug="a-queue-only-needs-help-when-it-has-no-way-out",
        group="On the floor",
        title="A queue only needs help when it has no way out.",
        line="Sending people to a full lane pays where the work has nowhere else to go. Where the work can route around, it measures as nothing.",
        floor="""Two lanes, both full, both lit. On the first, every package for that
destination has to come down this one lane. When it blocks, the sorter has nowhere to
send that work. It circles, then it goes to the problem pile, and most of it misses its
truck. On the second lane, the same destination is spread across six lanes. When one
blocks, the sorter uses the other five. The light is on. Nothing is actually wrong.""",
        why="""A full buffer only hurts when it is the only buffer. If a destination maps to
one lane, that lane is a dead end and a person is the only way out. If the destination
is mirrored across many lanes, congestion routes around itself and your intervention
is solving a problem the machine already solved. The same algorithm, the same signal
and the same experiment can be decisive on one sorter and inert on the next. The
difference is not the people or the software. It is how many ways out the queue has.""",
        widget="mirrored",
        monday=[
            "For every lane, count how many other lanes can take its work. One means a dead end. Five means a mirror.",
            "Rank your dead ends by volume. That is the list where staffing moves pay.",
            "Stop sending people to mirrored lanes on a light alone. Send them when the whole mirror set is full.",
        ],
        rule="Spend labor on dead ends. Let mirrors absorb themselves.",
        rule_why="The cost of a move is a person walking across the building and leaving the work they had. Pay it only where it buys something.",
        trap="""Mirrored lanes still fail, but they fail together and later. When the whole set
fills, the recirculation is worse because the machine kept everything moving right up
to the edge. Watch the set, not the lane.""",
    ),
    dict(
        slug="full-is-three-different-things",
        group="On the floor",
        title="Full is three different things.",
        line="A sensor reports blocked. The container might be half empty. The trailer is a third question.",
        floor="""A big box wedges at the top of a chute and trips the beam. The light goes on.
The container under it is half empty. On the next lane a container really is full to
the brim and the light is off because the beam sits above the pile. Down the row, a
worker sees a light, closes the container early and wheels it to the door. The trailer
leaves with air in it.""",
        why="""There are three fullnesses and they pull against each other.
Sortation full: will the machine keep sending work here. Container full: is there
room left in the box. Trailer full: did we ship cardboard or air. One sensor measures
the first and gets used for all three. A light that means "stop sending" on one lane
means "come close me" on another, and the same count of packages trips the beam at
very different levels on different equipment. Treat the three as separate numbers and
decide which one each action serves. Sometimes the right move on a lit lane is to shift
packages, not to close.""",
        monday=[
            "For each lane, record how many packages were on it each time the light came on. The spread tells you how much the light is worth there.",
            "Compare the count at the light with the count at close. The gap is your early-close loss.",
            "Put trailer fill next to lane lights on the same screen. When one goes up and the other goes down, you have found the trade.",
        ],
        rule="Name which fullness you mean before you act on a light.",
        rule_why="Closing on sortation-full to protect the sorter is a transportation cost paid later, on a truck nobody on the dock will see.",
        trap="""The count that trips the beam depends on who is standing there. A person
shifting packages lets more pile up before the beam blocks. Your threshold moves with
your staffing, which is the thing you were trying to decide.""",
    ),
    dict(
        slug="reaction-is-late-by-construction",
        group="On the floor",
        title="Reaction is late by construction.",
        line="Stations do not fill up. They get slammed. Staff to what is arriving, and set relative targets you can always hit.",
        floor="""One person on a lane, handling a package a minute, nothing backing up. Then
the arrivals triple. Half the work starts circling. By the time two more people arrive
the lane is a wall and nine in ten packages are missing it. Look back at the data and
the lane looked fine five minutes before. The stations that end up with the most help
had the least work right before it happened. The failure is not slow accumulation you
can watch coming. It is a sudden arrival rate against a station that looked healthy.""",
        why="""Any rule that fires on a full signal is already late, because full is the end
state. The information that would have helped was upstream: what was labeled in the
last fifteen minutes and where it is bound. So compute headcount with units on it.
Work on hand divided by a measured rate, plus work arriving in the next quarter hour,
plus the quarter hour after that, weighting the present most because it is the only
part you are sure of. Then set a relative target, not an absolute one. Do not try to
staff every zone to its number, which the building can rarely do. Make sure no
lower-priority zone holds more people than a higher-priority one. A target you can
always reach beats an optimum you never can.""",
        widget="headcount",
        monday=[
            "Measure your real rate per role off the floor. Do not assume it. It varies by site and shift.",
            "Pull arrivals by lane for the next 15 and 30 minutes from your label or induct data. If you have no forecast, what has been labeled and not yet sorted is one.",
            "Rank zones by headcount needed and compare to headcount present. Move one person from the lowest-ranked zone with the most people. Repeat.",
        ],
        rule="Weight the present most, forecast the near future, and balance relatively.",
        rule_why="The present is certain, the forecast is not, and an absolute plan the floor cannot execute trains people to ignore the plan.",
        trap="""Labor is one pool. Every person you move toward one role is a person you moved
away from another. The far side of a move is where the next failure comes from.
Measure the role you pulled from as carefully as the one you fed.""",
    ),
    dict(
        slug="measure-the-constant-before-you-build-the-model",
        group="On the floor",
        title="Measure the constant before you build the model.",
        line="Somewhere in your system a round number nobody measured is deciding what is real.",
        floor="""A worker moves a package off a lane without scanning it. The package leaves
the building. In the database it stays on the lane. Do that a few hundred times a day
and your system believes a lane is full of work when it is empty, and it will
confidently send someone there. The defense was a cutoff: anything sitting too long is
assumed gone. The cutoff was a round number in a config file. Nobody had measured it.
It was just round.""",
        why="""Ghosts are not a volume problem or an equipment problem. Two buildings with the
same layout and the same equipment differ by how often their people scan, and a tiny
difference in scan discipline turns into a large error in what the system thinks is
there. Every model you build on top inherits the error. The fix is not a better model.
Go measure the actual distribution of how long real work sits, find the tail, and set
the cutoff there. You will give up a small slice of real work to evict every ghost,
and that trade is obviously right once you can see both sides.""",
        monday=[
            "Measure scan compliance per lane: packages that left with a scan over packages that left at all.",
            "Measure how long real work actually sits before it is handled, and find the 99th percentile. That is your cutoff, not a round number.",
            "Open every config file your decisions depend on and list the constants. Ask of each one: who measured this, and when?",
        ],
        rule="No constant ships unmeasured. Every threshold carries the date and the data that set it.",
        rule_why="A round number looks like a decision. It is usually a guess that survived because nothing downstream could audit it.",
        trap="""Compliance is a habit, not a property of the building, so it drifts. A cutoff
measured once is a cutoff that will be wrong again. Re-measure on a schedule, or make
the cutoff compute itself from the current distribution.""",
    ),
    dict(
        slug="legibility-beats-intelligence",
        group="How to work",
        title="Legibility beats intelligence.",
        line="The best algorithm you will ever ship is beaten by a plan people can actually follow.",
        floor="""A system sends a worker a message: go to station A01-10108. They look at the
message, look at the floor and keep working. The floor is painted with lane numbers.
The message used the controller's address. Over one weekend the names in the messages
were changed to match the paint on the floor. The share of messages people followed
nearly doubled the next day. Three algorithms, a forecast integration and a year of
tuning had not moved that number as much.""",
        why="""A recommendation nobody acts on has an effect of exactly zero, no matter how
right it was. Adherence multiplies everything else. The person reading the message is
mid-shift, mid-task, with a scanner in one hand. They will follow an instruction that
costs them nothing to decode and ignore one that costs them a minute. Name things the
way the floor names them. Say where to go in the words painted on the wall. Then
measure adherence before you measure accuracy, because accuracy you cannot cash is
not accuracy.""",
        monday=[
            "Pull ten messages your systems sent to the floor this week. Walk to each place named. Could you find it from the message alone?",
            "Measure adherence: messages followed over messages sent, by shift and by role.",
            "Rename before you retune. If adherence is under half, the algorithm is not your problem yet.",
        ],
        rule="Every instruction to a person uses the floor's own names and fits on one screen.",
        rule_why="The reader is attention-poor and the system is not. Spend the system's effort translating, never the reader's.",
        trap="""A jump in adherence over one day is one day. Keep the caveat attached. A rename
that doubled adherence may also have arrived with a leadership visit, a slower shift
and a new manager. Measure it again next week.""",
    ),
    dict(
        slug="size-it-before-you-build-it",
        group="Between buildings",
        title="Size it before you build it.",
        line="Find the number first. Let the size of the answer decide whether there is a project.",
        floor="""Someone wants to build a system to cut empty miles. Before anyone draws a box,
pull every truck tour for six weeks. Split the miles into loaded and empty. Put a price
on an empty mile. Then split the empty miles by why they happened: repositioning a
trailer, returning an empty, a driver running bobtail, a pool adjustment. For each
kind, compare the cost of tours that had it against tours that did not. Some kinds
cost more. Some kinds, it turns out, come with cheaper tours. Now you know where the
money is, how much there is, and whether a human or a planning system put it there.""",
        why="""Sizing before designing sounds obvious and almost nobody does it, because the
design is the fun part and the sizing might say no. But the sizing is also where the
real finding hides. In a one-way network, where freight flows in and out but rarely
back, empty miles are the base case, not a mistake. Trade associations put industry
deadhead around one mile in six. When the empty legs are planned by several systems
that each optimize their own piece and never see each other, the long ones are not an
operator problem. They are a seam between planners. Half of doing this well is being
willing to come back and say the number is small.""",
        widget="deadhead",
        monday=[
            "For six weeks of tours, compute loaded miles, empty miles and invoiced cost. Divide. That is your price per empty mile.",
            "Bucket empty miles by cause and by which planner or person created them. Compare tour cost with and without each cause.",
            "Pull the long tail back to your own average, not to zero. Price that. If it is small, say so and stop.",
        ],
        rule="No design doc before a sizing doc. The sizing doc may kill the project, and that is the point.",
        rule_why="A project that cannot survive its own arithmetic should die on paper, where it costs a week, not in production, where it costs a year.",
        trap="""The finding will usually indict the planning systems, not the people running
them. Tell the organization that plainly. It is neither an accusation nor an excuse,
and the moment it lands as either, nobody will fix the seam.""",
    ),
    dict(
        slug="fewer-touches-not-faster-touches",
        group="Between buildings",
        title="Fewer touches, not faster touches.",
        line="Every handoff is a place to lose a package and a day. Keep supply and demand in the same ring.",
        floor="""A customer three towns over orders a thing you have in stock. It ships from
a building four states away because that is where the system found it, rides to a hub,
gets sorted, rides to another hub, gets sorted again, and arrives on time by the skin
of its teeth with five sets of hands on it. The same thing stocked nearby would have
been one truck and two touches. Nobody made a bad decision. The network just fills
from wherever it still has capacity.""",
        why="""A national network fills orders from the nearest building until it cannot, and
then from wherever. Each extra hub is a sort, a dwell, a trailer and a chance to miss.
Carving the network into regions that each hold the selection their customers actually
buy, and letting each region serve itself first, cuts touches and miles together,
because they are the same thing seen from two sides. It also fills trucks: when most
of a region's volume comes from a few buildings, the lanes from those buildings to the
delivery stations run thick and direct. Thick lanes let you set deadlines on
containers instead of on lanes, which lets cutoffs move later. Speed and cost stop
being a trade and start moving together.""",
        monday=[
            "Count touches per package from pick to door. Draw the distribution. The long tail is your cost.",
            "Measure the share of orders filled from inside the customer's region. Every point you add is miles and hands removed.",
            "Find the lanes that would run full if demand were served locally. Those are the lanes to make direct.",
        ],
        rule="Place inventory where it will be bought, and let the region serve itself first.",
        rule_why="Touches are the one cost that compounds through every downstream stage, and placement is the one lever upstream of all of them.",
        trap="""Regionalizing is mostly a software setting, which means it is mostly an inventory
problem. A region that does not hold the right selection serves itself badly and
ships nationally anyway. The hard work is forecasting demand by place, not drawing the
map.""",
    ),
    dict(
        slug="test-it-like-a-drug",
        group="How to work",
        title="Test it like a drug.",
        line="Randomize on and off by the hour. Measure the neighbors. Keep the nulls.",
        floor="""A new staffing rule goes live at one building. Every hour a coin is flipped:
rule on, rule off. After four weeks the on hours and off hours are compared on the one
metric that counts, packages out the door on time, and on everything next to it. The
rule works. It goes to two more buildings and the result holds. Then it goes
everywhere. Later the same rule is tried on a different kind of floor, with the same
design, and after forty-odd tests across five buildings it does nothing. That result
is written down and kept.""",
        why="""Labor is a shared resource, so a staffing change has side effects by
construction. Feeding one role starves another, and the starved role is where the
next miss comes from. A before-and-after comparison cannot separate your change from
the weather, the volume and the manager. Randomizing by the hour at the same site
can. Measure the output metric and its neighbors, read the result by root cause, and
when the number does not move, publish that too. A null result, correctly explained,
is often the better piece of knowledge. It told us where the rule works and where it
cannot.""",
        monday=[
            "Pick one change. Flip it on and off by the hour at one site for four weeks. Do not pick the hours.",
            "Measure the metric you care about, the metrics one step upstream and downstream, and the role you pulled labor from.",
            "Write the result down whether or not it moved, with the design, the dates and the caveats attached.",
        ],
        rule="No rollout without a randomized on/off at the site that proved it, and every null gets a write-up.",
        rule_why="A change that only ever gets a before-and-after will always look like it worked, and the organization will scale the ones that did not.",
        trap="""Any metric conditioned on whether someone responded is confounded. Messages go
out when a station is already in trouble, so the hours with responses are pre-selected
for being bad hours. Do not report "the hours people followed the system went worse"
as a finding about the people.""",
    ),
    dict(
        slug="go-stand-there",
        group="How to work",
        title="Go stand there.",
        line="The organization is a bigger variable than the algorithm. Every correction worth making was found by walking the dock.",
        floor="""Two buildings with the same blueprint and the same equipment. One scans every
package off the lane; the other switched scanning off because the rate is four times
higher without it, and now that building is invisible to the system meant to staff it.
A third trains its stagers to load straight into the trailer, so the system sees one
stager in six. A fourth has containers with holes cut in the side because that is what
they had. None of this is in any query. All of it was found by standing next to the
lane.""",
        why="""Every site does it differently, for reasons that are locally rational every
time. Two internal groups want opposite things from the same switch, one for quality
and one for cost. A vendor's equipment changes how fast a mode can be flipped. A drop
of a few feet breaks big boxes, so a site stops using a mode the model assumes. The
model you built is a model of one building. The scaling problem is never compute.
It is that the world is not a data-quality issue to be cleaned up. You learn the
difference by going.""",
        monday=[
            "Pick the site where your numbers look strangest. Go there. Stand at the lane the system says is in trouble and count.",
            "Ask the floor lead what they do when the light comes on. Write down every answer that is not in your model.",
            "Bring one photo back per thing the model got wrong, and change the model before you change the site.",
        ],
        rule="No network rollout without a site visit, and no site visit without a list of what the model believes.",
        rule_why="A model is a set of claims about a floor. The only way to test a claim about a floor is to look at the floor.",
        trap="""A site visit is one site. The temptation after a visit is to encode what you saw
as the rule. Write it down as a hypothesis, then check it against the next building,
which will have done it differently.""",
    ),
]

# ----------------------------------------------------------------------------
# Widgets (small, inline, no dependencies)
# ----------------------------------------------------------------------------

WIDGETS = {
    "mirrored": """
<section class="widget" aria-label="Exclusive lane versus mirrored lane">
  <div class="wg-head"><span class="mono">try it</span> One destination, one lane or six. Block a lane.</div>
  <div class="wg-row">
    <button class="wg-tab on" data-mode="one">one lane</button>
    <button class="wg-tab" data-mode="six">six lanes</button>
  </div>
  <div id="lanes" class="lanes"></div>
  <p id="lanes-out" class="wg-out"></p>
</section>
<script>
(function(){
  var mode='one', blocked={};
  var box=document.getElementById('lanes'), out=document.getElementById('lanes-out');
  function draw(){
    var n = mode==='one'?1:6; box.innerHTML='';
    for(var i=0;i<n;i++){
      var b=document.createElement('button'); b.className='lane'+(blocked[i]?' blocked':'');
      b.setAttribute('aria-pressed', blocked[i]?'true':'false');
      b.innerHTML='<span class="light"></span><span class="mono">lane '+(i+1)+'</span>';
      b.onclick=(function(i){return function(){blocked[i]=!blocked[i]; draw();};})(i);
      box.appendChild(b);
    }
    var nb=0; for(var k in blocked) if(blocked[k] && +k<n) nb++;
    if(n===1){ out.textContent = nb? 'Dead end. Every package for this destination now circles, then goes to the problem pile. One person here is the only way out.' : 'Open. All work for this destination comes down this one lane.'; }
    else { out.textContent = nb===0? 'Open. Work spreads across six lanes.' : nb<n? nb+' of 6 blocked. Lights are on. The machine routes around them and nothing is lost yet. A person sent here is solving a solved problem.' : 'All six blocked at once. Now it fails, later and harder, because the machine kept everything moving to the edge. Watch the set, not the lane.'; }
  }
  document.querySelectorAll('.wg-tab').forEach(function(t){ t.onclick=function(){ mode=t.dataset.mode; blocked={}; document.querySelectorAll('.wg-tab').forEach(function(x){x.classList.toggle('on',x===t);}); draw(); }; });
  draw();
})();
</script>""",
    "headcount": """
<section class="widget" aria-label="Headcount with units">
  <div class="wg-head"><span class="mono">try it</span> How many people does this zone need right now?</div>
  <div class="wg-grid">
    <label>Work on hand<input id="hc-wip" type="number" inputmode="numeric" value="40" min="0"></label>
    <label>Arriving in 15 min<input id="hc-f15" type="number" inputmode="numeric" value="30" min="0"></label>
    <label>Arriving in 15–30 min<input id="hc-f30" type="number" inputmode="numeric" value="20" min="0"></label>
    <label>Units one person handles per hour<input id="hc-rate" type="number" inputmode="numeric" value="60" min="1"></label>
  </div>
  <p id="hc-out" class="wg-out"></p>
  <p class="wg-note">Present work counts double, the near future counts more than the far. Weights are the shape of the idea, not a setting to copy; measure your own rate.</p>
</section>
<script>
(function(){
  var ids=['hc-wip','hc-f15','hc-f30','hc-rate'], out=document.getElementById('hc-out');
  function v(id){ return Math.max(0, parseFloat(document.getElementById(id).value)||0); }
  function calc(){
    var r=Math.max(1,v('hc-rate')), q=r/4; // units per person per quarter hour
    var hc = v('hc-wip')/(q*0.5) + v('hc-f15')/(q*0.75) + v('hc-f30')/(q*1.0);
    out.textContent = 'About '+Math.ceil(hc)+' people on this zone for the next half hour. Compare that to how many are standing there, then rank zones and move from the bottom.';
  }
  ids.forEach(function(id){ document.getElementById(id).addEventListener('input',calc); });
  calc();
})();
</script>""",
    "deadhead": """
<section class="widget" aria-label="Price of an empty mile">
  <div class="wg-head"><span class="mono">try it</span> What does your deadhead cost?</div>
  <div class="wg-grid">
    <label>Loaded miles (six weeks)<input id="dh-loaded" type="number" inputmode="numeric" value="900000" min="1"></label>
    <label>Empty miles (six weeks)<input id="dh-empty" type="number" inputmode="numeric" value="90000" min="0"></label>
    <label>Invoiced cost ($)<input id="dh-cost" type="number" inputmode="numeric" value="2400000" min="0"></label>
  </div>
  <p id="dh-out" class="wg-out"></p>
  <p class="wg-note">Industry deadhead runs around one mile in six. If yours is already well under that, the remaining empty miles are probably a seam between planners, not a driver problem.</p>
</section>
<script>
(function(){
  var out=document.getElementById('dh-out');
  function v(id){ return Math.max(0, parseFloat(document.getElementById(id).value)||0); }
  function fmt(n){ return '$'+Math.round(n).toLocaleString(); }
  function calc(){
    var L=Math.max(1,v('dh-loaded')), E=v('dh-empty'), C=v('dh-cost'), T=L+E;
    var perMile=C/T, emptyCost=perMile*E, pct=100*E/T, perYear=emptyCost*52/6;
    out.textContent = 'Empty miles are '+pct.toFixed(1)+'% of your miles. At '+fmt(perMile).replace('$','$')+' a mile all-in, they cost '+fmt(emptyCost)+' over six weeks, about '+fmt(perYear)+' a year. Now split that by cause and by planner before you decide anything.';
  }
  ['dh-loaded','dh-empty','dh-cost'].forEach(function(id){ document.getElementById(id).addEventListener('input',calc); });
  calc();
})();
</script>""",
}

# ----------------------------------------------------------------------------
# Rendering
# ----------------------------------------------------------------------------

CSS = """
:root{--paper:#f6f1e7;--ink:#1c1b19;--muted:#6b665c;--rule:#d9d1c2;--blue:#1f5fbf;--blue-soft:#dfe8f7;--card:#fbf8f1}
*{box-sizing:border-box}
html{color-scheme:light}
body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%}
.wrap{max-width:720px;margin:0 auto;padding:28px 18px 64px}
a{color:var(--blue);text-decoration:none}
a:hover{text-decoration:underline}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.8rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
h1{font-size:2rem;line-height:1.15;margin:.2em 0 .4em;letter-spacing:-.01em}
h2{font-size:1.05rem;margin:2.2em 0 .5em;letter-spacing:.01em}
p{margin:.6em 0}
.lede{font-size:1.15rem;color:#3a3833}
.doors{list-style:none;padding:0;margin:1.5em 0 0;display:grid;gap:12px}
.door{display:block;background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:16px 18px;color:inherit}
.door:hover{border-color:var(--blue);text-decoration:none}
.door .n{display:inline-block;min-width:1.6em;color:var(--blue);font-weight:600}
.door .t{font-weight:600;font-size:1.08rem}
.door .l{color:var(--muted);margin-top:4px;font-size:.95rem}
.group{margin-top:2.2em}
.group .mono{display:block;margin-bottom:-4px}
.back{display:inline-block;margin-bottom:1.5em}
.oneline{background:var(--blue-soft);border-left:4px solid var(--blue);padding:12px 16px;border-radius:6px;font-size:1.08rem;margin:1.2em 0 0}
.monday{padding-left:1.2em}
.monday li{margin:.5em 0}
.rule{border:1px solid var(--rule);border-radius:10px;padding:14px 16px;background:var(--card)}
.rule b{display:block;margin-bottom:.3em}
.rule .why{color:#3a3833;margin:0}
.trap{border-top:1px dashed var(--rule);padding-top:.8em}
.next{margin-top:3em;padding-top:1.2em;border-top:1px solid var(--rule);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
footer{margin-top:4em;color:var(--muted);font-size:.9rem;border-top:1px solid var(--rule);padding-top:1em}
.widget{margin:1.6em 0;border:1px solid var(--rule);border-radius:10px;padding:14px 16px;background:var(--card)}
.wg-head{margin-bottom:.8em}
.wg-head .mono{margin-right:.6em;color:var(--blue)}
.wg-row{display:flex;gap:8px;margin-bottom:12px}
.wg-tab{font:inherit;font-size:.95rem;padding:8px 14px;border:1px solid var(--rule);background:#fff;border-radius:999px;cursor:pointer}
.wg-tab.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.lanes{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;margin-bottom:10px}
.lane{font:inherit;display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 6px;border:1px solid var(--rule);border-radius:8px;background:#fff;cursor:pointer;min-height:72px}
.lane .light{width:14px;height:14px;border-radius:50%;background:#cfc8b8;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.lane.blocked .light{background:var(--blue);box-shadow:0 0 0 5px var(--blue-soft)}
.wg-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.wg-grid label{display:flex;flex-direction:column;font-size:.9rem;color:var(--muted);gap:4px}
.wg-grid input{font:inherit;font-size:16px;padding:9px 10px;border:1px solid var(--rule);border-radius:8px;background:#fff;color:var(--ink);width:100%}
.wg-out{font-weight:600;margin:.9em 0 .2em}
.wg-note{color:var(--muted);font-size:.9rem;margin:0}
@media (max-width:420px){.wg-grid{grid-template-columns:1fr}h1{font-size:1.7rem}}
"""


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def para(s: str) -> str:
    return "".join(f"<p>{esc(' '.join(block.split()))}</p>" for block in s.strip().split("\n\n"))


def shell(title: str, body: str, desc: str, path: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="stylesheet" href="{path}style.css">
</head>
<body>
<div class="wrap">
{body}
<footer>{esc(TITLE)} · a paradigms framework for fulfillment and transportation, not a tool and not a product · free to use, cite the door</footer>
</div>
</body>
</html>
"""


def render_index() -> str:
    groups: dict[str, list[tuple[int, dict]]] = {}
    for i, d in enumerate(DOORS, 1):
        groups.setdefault(d["group"], []).append((i, d))
    parts = [f'<p class="mono">{esc(TITLE)}</p>', f"<h1>Pick a door.</h1>", f'<p class="lede">{esc(TAGLINE)}</p>',
             ]
    for g in ("On the floor", "Between buildings", "How to work"):
        parts.append(f'<div class="group"><span class="mono">{esc(g)}</span><ul class="doors">')
        for i, d in groups[g]:
            parts.append(
                f'<li><a class="door" href="doors/{d["slug"]}/"><span class="n">{i}</span> '
                f'<span class="t">{esc(d["title"])}</span><div class="l">{esc(d["line"])}</div></a></li>')
        parts.append("</ul></div>")
    return shell(TITLE, "\n".join(parts), TAGLINE, "")


def render_door(i: int, d: dict) -> str:
    nxt = DOORS[i % len(DOORS)]
    prv = DOORS[(i - 2) % len(DOORS)]
    monday = "".join(f"<li>{esc(m)}</li>" for m in d["monday"])
    widget = WIDGETS.get(d.get("widget", ""), "")
    body = f"""<a class="back" href="../../">← all doors</a>
<p class="mono">Door {i} · {esc(d["group"])}</p>
<h1>{esc(d["title"])}</h1>
<div class="oneline">{esc(d["line"])}</div>
<h2>What it looks like on your floor</h2>
{para(d["floor"])}
<h2>Why it is true</h2>
{para(d["why"])}
{widget}
<h2>Monday</h2>
<ol class="monday">{monday}</ol>
<h2>The rule, and why</h2>
<div class="rule"><b>{esc(d["rule"])}</b><p class="why">{esc(d["rule_why"])}</p></div>
<h2>The trap</h2>
<div class="trap">{para(d["trap"])}</div>
<div class="next"><a href="../{prv["slug"]}/">← {esc(prv["title"])}</a><a href="../{nxt["slug"]}/">{esc(nxt["title"])} →</a></div>"""
    return shell(f"{d['title']} · {TITLE}", body, d["line"], "../../")


def main() -> None:
    (SITE / "doors").mkdir(parents=True, exist_ok=True)
    (SITE / "style.css").write_text(CSS.strip() + "\n")
    (SITE / "index.html").write_text(render_index())
    for i, d in enumerate(DOORS, 1):
        out = SITE / "doors" / d["slug"]
        out.mkdir(parents=True, exist_ok=True)
        (out / "index.html").write_text(render_door(i, d))
    import re
    banned = ["amazon", "msp1", "kiva", "directed staffing", "bps", "dea", "awcs", "watt", "jackpot", "scot", "relay", "prime"]
    for p in SITE.rglob("*.html"):
        low = p.read_text().lower()
        hits = [b for b in banned if re.search(r"\b" + re.escape(b) + r"\b", low)]
        assert not hits, f"{p}: banned terms {hits}"
    print(f"built {len(DOORS)} doors + index into {SITE}")


if __name__ == "__main__":
    main()
