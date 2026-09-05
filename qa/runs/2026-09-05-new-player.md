# Cold-read comprehension run — 2026-09-05

**Agent:** new player tester (cycle 2 comprehension run)
**Method:** app driven with Playwright from a cold start. `CLAUDE.md`, `docs/`,
`agents/docs/game-design/` and the previous cold-read log were **not** opened before or
during play. Narration was written *before* each click and the result recorded after.
**Career:** Program Riser (MID tier) → Everglades State Pythons (Developer character).
**Screenshots:** `qa/runs/2026-09-05-new-player/`

*(This log is written incrementally. Sections appear in the order I played them.)*

---

## Part 1 — Run log (raw narration)

### Screen 1 — career select

> "Choose the job that defines your career."

Three cards. Each posts `Opening budget`, `Opening roster`, `Mandate`. I read *Mandate*
as "the thing I get fired for missing", which turned out right, but nothing on the
screen says what happens if you miss one.

- `Opening budget $1.5M / $6.0M / $20.0M` — I can rank these against each other and
  against nothing else. I had no idea what a budget *buys* until week 2.
- `Opening roster 85 players` is **identical on all three cards**. It is the second
  line on every card and differentiates nothing.

Picked **Program Riser** to get both money pressure and win pressure.

### Screen 2 — "Which job do you take?" (30 program cards)

> "These are all the same level of program. None is better than the others — they're
> good at different things, and what's sitting in the locker room is different at every
> one of them."

Then every card posts, in the largest type on the card:

```
Roster today 65.9  …  61.4
If they all hit 74.5  …  69.8
Potential stars 11  …  3
Best of them 99
```

**The screen tells me none is better and then ranks them numerically.** I disbelieved
the prose and picked on the numbers, which is presumably not what the screen wants.

- `Roster today 65.5` — no unit, no scale, no anchor. I assumed 0–100 and assumed 65
  was mediocre. Nothing on screen said so.
- `Best of them 99` appears on eleven of the thirty cards, so the scale is clearly
  saturating somewhere I can't see.
- **All 30 cards print "The scouting department is an embarrassment."** Every program is
  Scouting 2/5. A warning printed on every option carries no information, and it was the
  line I remembered longest.

Picked **Everglades State Pythons** (Developer, roster 65.5, weight room 5/5) because
"Coach them up and keep them. You will never out-recruit anybody, so quit trying" was
the only card that told me a *strategy* rather than a mood.

Screenshot: `02-after-career-pick.png`

### Screen 3 — takeover (scheme + staff)

The best-explained screen in the game. Each scheme card posts a personnel grouping
(`1 QB · 1 RB · 3 WR · 1 TE · 5 OL`), a fit band with a word attached (`Good fit` /
`Workable`), an install %, and a plain "you need X" line. This sentence taught me the
whole tradeoff in one read:

> "A great fit nobody can install is worse than a good one your coordinator knows."

What I could not work out:

1. **The defense opened on a strictly dominated option.** Default `Bend don't break`
   = `63–74% fit · installs to 47%`. `Zone blitz` = `71–82% fit · installs to 52%`.
   Better on both axes, and the screen's own sentence read *"These guys are built to run
   Zone blitz."* I spent real time hunting for the hidden cost of switching before
   concluding there wasn't one. Screenshot `03-after-sign.png`.
2. **Why is fit a range?** `Roster fit 66–76% fit`. Uncertainty? Best/worst case?
   Spread across the position groups? Never stated on this screen or any other I found.
3. `Game prep +0.5 to your run game, pass game, run defense and pass defense`. Plus 0.5
   of what, out of what? And the **81-rated head coach posts +0.5 while the 72-rated
   defensive coordinator posts +0.8**, which reads backwards from every other number on
   the card.
4. `9-hour week` / `10-hour week` / `8-hour week`. Hours of what? Not answered here.
   (Answered two screens later, on the priorities screen. See discoverability findings.)
5. `Hiring · $6.0M to work with`, with salaries quoted "a year". **Bank or income?**
   I could not tell. It decremented as I hired, so it's a bank — but nothing said
   whether or when the $735K/yr salary would be drawn from it.

**The hiring market itself is very good.** Rating, a one-sentence tendency, five per-job
bars, hours, scheme match, salary, signing fee, buyout — and unreachable candidates say
*why*:

> "Won't return your calls — Everglades State Pythons isn't a big enough job yet."

That is the single clearest line in the game.

But two things about it broke for me:

- **The headline delta is on the wrong number.** Cameron Garcia is posted as
  `+3 on James Ramirez`. The bar that decides an offensive coordinator's job is Game
  plan, and there it is `76 → 99`. A player skimming "+3" passes on the biggest upgrade
  on the board.
- **Candidates do not post the post's own headline metric.** The chair says "Gets your
  offense installed to 54% before practice reps". No candidate card says what *he* would
  install to. I had to pay $187K + $271K buyout to discover it went **54% → 62%** and the
  weekly swing went **±11% → ±9%**. Same for the DC: I could not compare Bryce Scott (85,
  right scheme, Game plan 81) against Jordan Thomas (83, wrong scheme, Game plan 99)
  because neither posts an install number. I guessed.

- **After hiring, the market offers me the man I just hired.**
  `Bryce Scott … $257K to sign him + $441K buyout · +0 on Bryce Scott` — $698K to
  re-sign the incumbent for nothing. Screenshot `07b-rehire-self-bug.png`.

Hired Garcia (OC) and Scott (DC), switched defense to Zone blitz. Budget
$6.0M → $5.5M → $5.1M. That part was clear.

### Landing screen — Roster, not Dashboard

Clicking "This is my football team. Let's go to work." landed me on the **Roster**, with
a banner:

> "A marquee-game offer is open on the Schedule tab — it expires when you accept"

There is **no Schedule tab in the visible nav**. Visible: `Dashboard · This Week ·
Roster · Depth Chart · Recruiting · Locked · More ▾`. Schedule is the 6th of ten items
hidden behind `More ▾`. The game pointed me at a tab it did not show me.

`Recruiting · Locked` — locked, with no stated reason and no stated unlock condition.

The roster table itself is good: `OVR · POT · Durability · Injury risk this game ·
Health · Fame 0–100 · Personal fans · Year / status`, with risk stated twice
("1.1% / 1.34% before coach · 0% fatigue"). `Fame 0–100` labels its own scale, which
almost nothing else does. I still don't know what `Personal fans` does.

### Schedule → the marquee offer

Genuinely well built. States the price as a fraction of the bank, the payoff, the
downside, and the fact that this is the only window:

> "A Top-25 visitor is a harder game than the one it replaces, so it works against the
> 7 wins the board is asking for. What you are buying is the crowd it brings and the
> story a win makes."
> "These offers expire the moment you accept the roster — this is the only window."

**But I could not evaluate it.** The payoff is
`around 3,245 fans and 24 points of national buzz` for `$1.5M guarantee, 30% of your
budget`. At that moment I had never seen "national buzz" anywhere — it is not in the
header stat bar, not on the roster, not on the dashboard. So I was asked to pay 30% of
my bank for 24 units of a currency I had never met.

I declined, on the reasoning "30% of the bank for a harder game against a 7-win target".

**Two screens later I found the number it maps to.** The Finances page prints
`38 national press points × $900 = $34K`. If "national buzz" is national press — and the
dashboard's `They're talking about you 38 /100` matches the 38 exactly — then 24 points
was **+63% of my program's recognition and about +$21.6K a week of sponsor value**,
which would have changed my answer. Three screens use three different names for what
looks like one quantity: *national buzz*, *national press points*, *They're talking
about you*. Screenshots `10b-marquee-offers.png`, `16b-sponsor-formula.png`.

Also: **all eight marquee offers end with the sentence "This is the one."** A
recommendation printed on every option is not a recommendation.

### Dashboard — the best screen in the game

> "Nobody's played a game yet. 7 wins keeps everybody happy."
> "What needs you this week — 5 things need you — 2 are costing you right now"

Six briefing items, each `REQUIRED`/`OPTIONAL` + headline + reason + a verb button.
This is the only place I ever felt directed. One item answered a question I had not yet
thought to ask:

> "Next year's roster is 21 short — 21 of your 85 are out of eligibility after this year
> and nobody is coming in yet, which lands you at 64 of 85. The class closes with the
> season — 14 weeks left."

Program panel: `55K fans · #23 · In the bank $5.1M · Prestige 72/100 · They're talking
about you 38/100 · Starters average 71.0`. `Prestige 72/100` — what does prestige *do*?
Nothing on the dashboard says. (I later found it on the sponsor page: $400/week each,
and on the hiring page as the reason coaches won't take my calls. Neither is linked
from here.) `Starters average 71.0` here vs `Average rating 65.5` on the Roster — two
different averages of the same roster on two screens, neither explaining the other.

### Weekly priorities — good design, numbers I could not model

> "Everything below happens anyway — your coaches turn up and do their jobs. What you
> choose here is what they put the week into. Staff rating 81. You can chase 3 things a
> week — as many as anybody in the country."

Each card names who runs it, what happens if you leave it alone, what happens if you
pick it, and a `matters N/100` with a reason. `71% of it holds up (2 reps)` vs
`83% of it holds up (5 reps)` is the best-phrased number in the game.

**But the numbers on the cards move in directions I cannot explain.** Watched live,
same week, only changing which cards were selected:

| priorities held | Scout card | Coach-up card ("leave alone" / "priority") | Trail card |
|---|---|---|---|
| 0 selected | `+1.7 / +2.0`, matters 43 | `+29% / +64%` | `+45 / +47` |
| 1 (coach-up) | `+2.2 / +2.5`, matters 20 | `+29% / +64%` | — |
| 3 (all) | `+2.4 / +2.5`, matters 17 | `+17% / +34%` | `+42 / +44` |
| 2 (dropped trail) | — | `+14% / +36%` | `+42 / +45` |

Two things I could not model:

- Taking a priority **away from** scouting made the scout card's payoff go **up**
  (`+1.7` → `+2.4`) while its stakes fell (43 → 17).
- Dropping a priority made the coach-up card's *leave it alone* value go **down**
  (`+17%` → `+14%`) while its *priority* value went **up** (`+34%` → `+36%`).

Screenshots `13b-scout-card-went-up.png`, `14b-priority-numbers-move-oddly.png`.

**The recruiting card never justifies a slot.** `Leave it alone +42 recruiting points
this week` vs `Make it a priority +44`. Two points out of forty-four for one of my three
slots. I read that card once and never took it again.

`the whole roster grows +29% faster` — faster than *what*? There is no baseline anywhere.

### Sponsorship — the clearest business screen in the game

```
Sponsor market · $130K of weekly reach
55K fans × $1.25            $69K
38 national press points × $900   $34K
72 prestige points × $400   $29K
0 titles × $15,000          $0
```

**This is the only screen that tells you what any of the program's abstract numbers are
worth.** It made fans, press and prestige into money in one glance, and I could actually
choose between the three contracts:

- Guaranteed $1.8M max
- Game-day $1.2M + $1.1M bonus (`$175K whenever a home crowd fills at least 90% of the
  stadium`)
- Performance $840K + $2.6M bonus (`$100K per win + $115K vs top-25`)

I ran the arithmetic: a 7-win season on the Performance deal is
`840 + 700 + 115 = $1.66M` < `$1.8M` guaranteed, so I need ~10 wins for Performance to
win. Board asks for 7. Signed **Guaranteed**.

The one thing I could not evaluate was Game-day, because **the stadium capacity is not
on this screen** — I had no idea how far 55K fans is from 90% of capacity. (Capacity
appears on the Finances page: `Stadium overheads — 50K seats`. So my fan base exceeds
capacity and Game-day was probably the right pick. I got that wrong for want of one
number.)

### War Room (Recruiting)

The nav still read `Recruiting · Locked` while I was standing on the recruiting screen,
reached from the dashboard's own "Work the phones →" button. Screenshot
`18b-recruiting-nav-says-locked.png`.

The header panel is very good and answers the churn question directly:

```
Recruiting Points 0  +0 next week
Roster next season 64 of 85   21 leaving · 0 coming in
Visit weekends 6/6 remaining this season
Scholarship offers 0   10 prospects on board
Player pay (NIL) available $48K   $48K a week still free
Roster warning: TE, DL, DB, P won't have enough bodies to field and rotate next season.
```

And per-prospect it repeats it at position level, which is excellent:

```
TE roster plan  Thin
Current scholarships 6 · Expected returners 4 · Incoming 0 · Projected/target 4/6
Best returning OVR 71
```

Things I could not work out here:

- `Recruiting Points 0  +0 next week` on the same day the priorities screen said
  `+44 recruiting points this week`. Two screens, two answers.
- `Player pay (NIL) available $48K` — where does $48K come from? Is it weekly? Per
  recruit? It is never derived, and it is the only budget in the game with no source.
- `Visit weekends 6/6 remaining this season` — never explained what a visit weekend is
  or does, on this screen or the prospect card.
- **The evaluation budget does not add up and nothing warns you.** A full read on one
  prospect is `5 + 8 + 10 + 8 + 6 + 12 = 49 RP`. Ten prospects on the board = 490 RP.
  My weekly income is ~44 and I had 39 in the bank. There is no total, no burn rate, and
  no "you can afford ~1.2 full reads a season" anywhere.
- **Pursuit has no posted payoff.** `[Invest 5 RP] [Invest 10 RP] [Invest 20 RP]` with
  the caption "Pursuit is persistent and known to competing programs." Nothing states
  what 10 RP buys. `Chance` stays `Unknown`. I clicked `Invest 10 RP` blind, and the
  card afterwards still read `No pursuit points invested yet`, with a counter reading
  `3 decisions queued for Anthony Miller`. I have no idea whether that was 10 RP well
  spent, and the game did not offer me any way to find out.

### Week 1 — the postgame

Won 49–0 at home. Rank #23 → #15, fans 55K → 55.6K, bank $5.1M → $5.7M.

The postgame is excellent and I want that on the record. Full box score with every
column's unit spelled out, plus:

> "49–0. Julian Martinez led the story: 11 carries, 98 rush yds · 3 TD · 94 rating in
> win. The result moved +552 school fans, +6 local press points, and left +$584K after
> expenses."

> "Malachi Collins suffered a shoulder contusion and is expected to miss 1 game. Malcolm
> Hill moves into the rotation, affecting pass offense. **Pass offense falls from 76.1 to
> 75.4, a 0.8% drop in the unit rating.**"

That injury line is the best-written consequence in the game: it names the injury, the
replacement, the affected unit, and the exact size of the damage.

And a payoff panel:

```
What you chased last week
Coach a player up · Install the offense · Install the defense
Offense on Saturday   83 % of the plan held up
Defense on Saturday   77 % of the plan held up
Film on ICU           +2.5 to every unit
Tariq Cruz            + 0.18 Overall
Recruiting            + 25 points on the trail
These are the numbers your week actually bought.
```

**Two of those five numbers disagree with what the card promised before I advanced.**
The last thing the priorities screen said, immediately before I pressed Advance week:

| | card said (unselected) | payoff panel delivered |
|---|---|---|
| Film on Iron City | `Leave it alone +2.9 to every unit that game` | `+2.5 to every unit` |
| Work the trail | `Leave it alone +41 recruiting points this week` | `+25 points on the trail` |

`+41 → +25` is a 39% miss on a projection the screen posts as a flat number with no band.

`Tariq Cruz + 0.18 Overall` for the priority the game itself rated `matters 75/100` —
the highest stakes on the board. 0.18 reads as nothing. I could not tell whether I had
been rewarded or ignored.

### Finances — a clean answer

`More ▾ → Finances`.

```
Where last week went · $2.5M of costs
Scholarships — 85 at $1,500 a week      $128K
Facilities upkeep                       $467K
Stadium overheads — 50K seats           $150K
Running the department — 55% of revenue $1.7M
Coaching salaries                       $57K
NIL commitments                         $0
Against $3.1M of revenue                +$584K
```

**This completely answers "what was last week's money spent on."** Every line is named,
every line has its basis stated, and it reconciles. Screenshot `28b-where-last-week-went.png`.

Facility cards are the same standard:

```
Recruiting · Level 2/5
Current payoff  +2 on every recruiting battle and +8 Recruiting Points a week
After upgrade   +4 on every recruiting battle and +12 Recruiting Points a week
Decision cost   $750K now
Adds to every week $39K forever
```

Queued the Recruiting upgrade — the first decision in the game where I knew the price,
the recurring price, and the exact payoff before pressing.


### Weeks 2–10 — the season settles into one repeated button

Standing priorities never changed after week 1: `Coach a player up · Install the offense ·
Install the defense`. From week 2 onward I pressed **Advance week** and read the recap.

The reason the priority screen stopped being a decision is arithmetic on its own cards:

| card | leave it alone | make it a priority | marginal value of a slot |
|---|---|---|---|
| Install the offense | `71% of it holds up` | `83% of it holds up` | **+12 points** |
| Install the defense | `66% of it holds up` | `77% of it holds up` | **+11 points** |
| Scout Acadiana State | `+2.1 to every unit` | `+2.2 to every unit` | **+0.1** |
| Work the trail | `+41 recruiting points` | `+43 recruiting points` | **+2 of 43** |
| Coach up Tariq Cruz | `+10% faster, no spotlight` | `full spotlight, +24% faster` | — |

Three slots, three cards worth taking, two cards that are never worth a slot. **The
decision solves itself in week 1 and never comes back.** The film room retargets itself
to the next opponent automatically, which I discovered by noticing the header had
changed, not because anything said so — so the Scout card has no job left either.

The stakes score compounds this: the game rated `Scout Acadiana State Gators` at
`matters 35/100` in the same week the dashboard called that game *"the game of your
season"*, and the card's own delta for taking it was 0.1.

**The payoff panel keeps under-delivering against the card.** Every week:

| week | card said (leave alone) | panel delivered |
|---|---|---|
| 1 | Film `+2.9` / Trail `+41` | `+2.5` / `+25` |
| 2 | Film `+2.1` | `+1.5` |
| 3–8 | Film `~+2.1` | `+1.5` each week |

`Tariq Cruz + 0.18 Overall` a week, on the card the game rated `matters 75/100` — the
highest stakes on the board all season. After eight weeks he had gained about 1.4
Overall. I could not tell whether that was a good return, and nothing anywhere states
what a "normal" season of development looks like.

Two injury lines that undercut their own system:

> "Mario White suffered a broken collarbone and is out for the remainder of the season.
> Mason Black moves into the rotation, affecting pass offense. **Pass offense falls from
> 76.1 to 76.1, a 0.0% drop in the unit rating.**"

A season-ending injury reported as costing 0.0%. The template is honest and the
conclusion a player draws from it is "depth does not matter".

### The door event — a clean decision, twice

Weeks 3, 6, 9. Four offers, each with an outcome and a **posted probability**:

```
WEALTHY DONOR Andre Kennedy   $1.0M straight into the budget          43% chance
FORMER LEGEND Lamar Dawson    +1.2 Overall for every running back     54% chance
LOCAL BUSINESS Bryant's       $240K of advertising, next home game    82% chance
FORMER LEGEND David Green     +25% takeaways in your next game        65% chance
```

I could compute expected value on all four without help. Took the legend (permanent),
then the donor. Both failed their roll and the game said so plainly: *"Lamar Dawson
could not make it work. Nothing changes this week."* The heading above that is
**"Try again next time!"**, which is a chirpy tone for a $1.2M miss, but the mechanics
are the clearest in the game. Screenshot `30-door-event.png`.

### Job security — a clean answer

From week 5 the dashboard carries:

> "3–1, on pace for about 9. You need 4 more from 8."
> "**Secure.** The board has no questions about the job. Finish on this pace, 9–3, and
> the board has you at **79 from 65**."

That answers *is the job safe* and *what is the board measuring* directly, projects
forward from the pace rather than the raw record, and names the band. The one gap:
`79 from 65` — 65 out of what? The security scale is never given, and I had never seen
the number 65 before week 5, so I could not tell whether 65 was good.

### The Inbox is broken

`More ▾ → Inbox`, week 6. Twelve entries. Every single one:

```
✓
Booster Offered
Weekly development report completed.
```

Twelve identical rows whose **title and body describe two different things**. Nothing
about the sponsor I signed, the two coaches I hired, the four injuries, the eight
results, the ranked win over #2, or the recruit who committed. Screenshot
`36b-inbox-broken.png`.

### P1 — the recruiting board white-screens the app

Week 10, dashboard item now `REQUIRED`:

> "Next year's roster is 20 short. 21 of your 85 are out of eligibility after this year
> and 1 is coming in, which lands you at 65 of 85. The class closes with the season —
> 4 weeks left, and you're holding 120 recruiting points."

So I went to the War Room to build a class, and **clicking any prospect other than the
one already selected destroys the page**. Whole app to a blank white screen, no error
boundary, no way back except a browser reload.

Reproduced three times from a clean reload:

```
Jared Diaz     -> body length 0   (white screen)
Theo Wright    -> body length 0   (white screen)
Anthony Miller -> body length 9764 (works — he is the auto-selected prospect)
```

Console:

```
Uncaught Error: Rendered fewer hooks than expected.
This may be caused by an accidental early return statement.
```

Selector: `button.prospect-summary`. Screenshot `45-white-screen-crash.png`.

**This is the reason my class was one player.** The game's most-flagged briefing item
points at a screen where the board is unusable past the first row. Autosave recovered
the career on reload, so no data was lost — but a cold player who hits this has no
reason to believe the game is not simply broken.

Because of it, the honest answer to "does any recruiting action visibly change
anything" is:

- `Basic · 5 RP` on the one prospect I could reach **did** work and was legible:
  `Overall Unknown → Overall 51–58`, `Ask / week Unknown → $350–$550`, and a line reading
  *"0%. Nobody has done enough to make him commit yet — he needs 6 more from somebody."*
  That sentence is excellent.
- `Invest 20 RP` charged the points immediately and changed **nothing** on screen —
  the card still read `Active pursuit · 10 pts`, `He commits 0%` — until I advanced the
  week, at which point he silently appeared as `Committed to you · Stays yours 100%`.
  **No event, no inbox item, no story, no dashboard line announced the commitment.** I
  found it because the header counter moved from `21 leaving · 0 coming in` to
  `· 1 coming in`.
- `Offer visible targets (19)` put out 19 free scholarship offers and produced no
  feedback of any kind, ever.
- Two searches (`National showcase · 25 RP`, `Find sleepers · 10 RP`) and a position
  search (`12 RP`) grew the board from 10 to 32 prospects with **no report of what they
  found**. I never learned which prospects came from which search, and the position
  search I paid 12 RP for returned eight quarterbacks at a program whose own warning
  reads *"DL, DB, P won't have enough bodies"*.


### Weeks 11–14 and the playoff

Finished the regular season 10–2, then `Advance week` at week 14 dropped me straight
into the offseason. **The first I heard about a playoff was the board review line
"Reached the playoff +10"** and the record reading `10–3` when I had been 10–2. No
bracket, no result screen, no story. A 13th game was played and reported nowhere.

### The board review — the best screen in the offseason

```
Everglades State Pythons · 2027
10 – 3 , against 7 asked for
Extension on the table    96   +31 from 65
10–3, 3 clear of the 7 they asked for   +21
Reached the playoff                     +10
You keep the job.
```

> "They grade you against the wins they asked for at the start of the year, and against
> what the department spent getting them. Nothing here is a roll — every line below
> moved your number by the amount it says."

Every delta named, the reasons sum to the movement, and the target it grades is the same
target the header stated in week 1. The only gap is the scale: `96` and `65` are on a
range that is never given anywhere, so I could not tell whether 65 had been comfortable.
Screenshot `49-board-review.png`.

The offseason then presents a numbered stepper — `1 Review · 2 Portal · 3 Signing day ·
4 Staff · 5 Camp` — which is the clearest structural signposting in the game.

### The portal is the strongest screen in the product

```
Leaving you 3 · In the portal 267 · Roster openings 24 · Bids placed 0 · Points left 120
Donor room left $55K a week
```

> "Everybody bids at once and nobody sees anybody else's offer. Bidding on a man who is
> leaving you is how you keep him — you already know him, and that counts for something."
> "A transfer arrives finished rather than at eighteen, and keeps whatever eligibility he
> had left. That is what makes the portal the fast way up."

Each player states what he is looking for, `How well you offer it 73/100`, `Wants about
$2K a week`, and two sliders. I bid on five and the resolution screen reported
per-player:

```
What just happened
Signed Isaiah Alvarez out of the portal (LB, 88 overall).
Signed Theo Richardson out of the portal (OL, 87 overall).
Mateo Grant left the program and did not land anywhere.
Theo Rivera left the program and did not land anywhere.
You kept Thomas Hardy (OL, 64 overall).
Signed Amari Matthews out of the portal (OL, 87 overall).
```

**This is the first time in the whole game I felt I had done something that mattered.**
My roster average was 65.5 and I added an 88 and two 87s in one screen.

Three problems with it anyway:

- **No odds on a bid.** `How well you offer it 73/100` is fit, not probability. I moved
  a slider from 0 to 15 points and $2,000/week with no statement of what that bought.
  On the in-season recruiting board the equivalent line exists and is excellent ("he
  needs 6 more from somebody"); the portal has nothing.
- `In the portal 267` and **24 shown**, with no search, no filter, no "show more". I
  never learned what happened to the other 243.
- **There is no navigation at all during the offseason.** No Roster, no Depth Chart, no
  Finances. I bid $2,000 a week on a 94-rated offensive lineman with no way to look at
  the offensive line I already had.

### Signing day — and the recruiting I could not see finally arrives

```
Incoming class · 5 signed for 2028
ELITE · FL   Ethan Nelson   K   79
ELITE · NC   Kendrick Ward  WR  78
REGIONAL·GA  Jared Diaz     TE  73
ELITE · AL   Ian Gray       K   69
UNRANKED·LA  Anthony Miller TE  54
```

Four of these five came from the free `Offer visible targets (19)` button I pressed once
in week 7 and never thought about again. **The one I actually scouted and pursued (30 RP,
the whole legible mechanism) was the worst player in the class.** The four that mattered
cost nothing, took one click, and gave zero feedback for seven weeks.

I do not know whether that is the intended shape. What I know is that after a full season
I could not have told you which of my recruiting actions produced my class.

### Camp — a clean three-way trade

```
Get them fit         15% less chance of an injury, every man, every game / no head start
Split it             Nothing either way / nothing either way
Get the playbook in  +5 points of execution on both sides / 15% more injury chance
Whatever you pick covers the first 4 weeks
```

Cost named, payoff named, duration named. Nothing to add.

### Season 2 opens on the scheme screen — and my roster fit had collapsed

`Open the season` does **not** open the season. It reopens the takeover screen, which is
a sixth step the `1..5` stepper does not list. That is where scheme change lives, and it
is the only place it lives.

| | preseason 2027 | preseason 2028 |
|---|---|---|
| Spread tempo (what I ran) | `66–76% fit · Good fit` | **`47–57% fit · Workable`** |
| best offensive option | Spread tempo | **Power run `74–84% · Built for it`** |
| Zone blitz (what I ran) | `71–82% fit · Good fit` | **`44–54% fit · Workable`** |
| best defensive option | Zone blitz | **Four-three base `69–79% · Good fit`** |

**Both of my schemes went from the best fit on the board to the worst in one offseason,
and nothing on any screen explains why or attributes it to anything I did.** I graduated
21, signed 5, and added 3 transfers. Which of those moved it 25 points? Unknowable.
Screenshot `59-scheme-fit-collapsed.png`.

**And the cost of changing is never a number.** The only statement is:

> "Going another direction isn't a mistake — it's a rebuild, and it'll cost you until you
> recruit the right kids."

That is a mood, not a price. The screen asks me to trade 27 points of "roster fit" against
11 points of "install" and never says what a point of either is worth in wins, points, or
anything. I switched to Power run and Four-three base purely because the word "Workable"
sounds worse than "Built for it".

Switching then put both coordinators on schemes that are not theirs, dropping the
offensive install from 64% to 53%. I hired a Power-run coordinator — and **once again no
candidate card posts the install number**, so the choice between "99 game plan, wrong
scheme" and "83 game plan, right scheme" had to be made blind. After paying $187K + $320K
buyout + $82K/yr I learned the answer was **53% → 58%**.

### Season 2, weeks 1–4 — what I had to relearn

- **Priorities carried over.** `Done ✓ · Coach a player up · Install the offense · Install
  the defense`. Correct and appreciated.
- **The sponsor contract had to be re-signed** and the offers had grown ($130K → $150K
  guaranteed). This time I could evaluate it: 10–3 last year makes the Performance deal
  (`$70K/wk + $115K per win + $135K per top-25 win`, max $4.0M) beat the Guaranteed
  ($2.1M). That was the first decision in the game I made confidently, and only because
  the sponsor screen had taught me the arithmetic in season 1.
- **The board still asks for 7 wins** after a 10–3 playoff season. Nothing says whether
  the target ever moves, so I could not tell whether over-achieving had bought me
  anything except the security number.
- **`Next year's roster is 33 short`** — the churn compounds. I was 12 players under the
  limit and 21 more leave. Because the recruiting board crashes, I have no way to fix it.
- **`Recruiting · Locked`** in the nav again during roster review, with no explanation of
  the lock or the unlock, exactly as in season 1.

### Two contradictions I found in season 2

**Ticket price.** I set the slider to `$48` in the 2027 preseason and to `$54` in the
2028 preseason. Both times the slider moved, displayed the new value, and gave no error.
Both times **the change was silently discarded**:

```
week 10, 2027:  Stadium attendance 50K people / 50K seats · Ticket revenue $2.1M
                $2.1M / 50,000 = exactly $42, the untouched default
2028 preseason: dashboard — "Tickets are $42 and comparable programs get about $54."
```

Setting it **in-season** works: I set `$50` in week 4 of 2028 and it survived the week.
So the roster-review screen leaves a live control on a screen whose own banner says
*"Only sponsorship, depth-chart, redshirt, and preseason scheduling decisions can be made
before the season begins"* — and then throws the input away with no message. I priced my
entire first season 22% below the benchmark the game itself posts, and never knew.

**Personnel grouping.** Three screens disagree about who is on the field:

| screen | says |
|---|---|
| Scheme card | `Power run · 1 QB · 1 RB · 2 WR · 2 TE · 5 OL` |
| This Week → "What you run" | "Your offense puts **2 WR, 2 TE**, 1 back on the field." |
| Depth Chart | **`WR — 3 starters`** / **`TE — 1 starter`** |

The defense agrees across all three (`4 DL · 3 LB · 4 DB`). Only the offense is wrong.
Screenshots `67-what-you-run.png`, `68-depthchart-3wr-contradiction.png`.

### The system I never found for a whole season

At week 4 of season 2 I clicked `More ▾ → Development` out of completeness and found an
entire screen I did not know existed:

```
One player gets concentrated work at 160% of the normal rate, or a whole position room
shares a session at 28% each.
Balanced      Technique +0.2 · Strength +0.2 · Conditioning +0.2 · Injury protection +0.1
Technique     Technique +0.5 · Conditioning +0.1 · Injury protection +0.05
Strength      Technique +0.1 · Strength +0.5 · Conditioning +0.1 · Arm strength +0.4
Conditioning  Technique +0.05 · Strength +0.05 · Conditioning +0.5
Spotlight target [every room and all 78 players]
Jayden Henry QB · 75/80 · Accuracy 71 · Decision making 76 · Arm talent 74 ·
   Mobility 79 · Durability 80 · Technique +0.2 · Conditioning +0.04 · +0.4 fatigue
```

This is the only screen in the game that shows the five per-position attributes, the only
one that lets me choose *what* a player trains, and the only one that lets me target
anybody outside three curated names. **I played a full season without it.**

Nothing routes there. The dashboard's `Coach up X → Pick somebody →` goes to
`This Week → Business → 3 · Who gets the extra work`, which offers three players and no
training focus. The priority card names one player and no focus. The Development tab is
item 4 of 10 inside a `More ▾` dropdown, and no briefing item, no priority card and no
payoff panel ever mentions it. Screenshot `69-development.png`.


---

## Part 2 — The seven questions, answered plainly

### 1. What is the goal? What does this game actually want from me?

**Win enough games each year that the board renews you, and use the money and recognition
that produces to buy better players and better coaches, so the number you have to hit
gets easier.** I worked this out and I am fairly confident it is right.

What told me: the dashboard header (`7 wins keeps everybody happy`), the board review
(`10–3, against 7 asked for`), and above all the **sponsor market panel**, which is the
only screen that converts the abstractions into money —
`fans × $1.25 + national press × $900 + prestige × $400 + titles × $15,000`.

What is *not* clear: whether the goal escalates. I went 10–3 and reached the playoff and
the target for year two was still 7. So the game either does not want more from me, or
wants more and never said so.

Also unclear: whether money is a goal or a tool. I ended year one with $6.4M and nothing
that needed it. The only things that consumed real money were coaches and facilities, and
both were affordable. NIL, the thing the War Room describes as *"what you pay a recruit
every week"*, ran at `$48K a week available · $0 committed` for an entire season.

### 2. What did I do this week, and why?

Week 1: read the five priority cards, compared the `matters N/100` numbers, and took the
three highest — install the offense, install the defense, coach up Tariq Cruz. That was a
real decision made from real numbers and it felt good.

**Weeks 2 through 14: I pressed Advance week.** Nothing changed, because the priority
screen resolves itself:

- two cards are worth 11–12 points of execution each,
- one card is worth a permanent, if tiny, roster gain,
- and the remaining two are worth `+0.1 readiness` and `+2 of 43 recruiting points`.

Three slots, three cards worth taking. The film room retargets itself automatically, so
the Scout card has no job. The set is optimal from week 1 and there is never a reason to
revisit it. In season 2 I did not open the screen at all.

### 3. Which number on the dashboard matters most, and how did you decide?

**`Record` — because it is the only number the board grades, and the board is the only way
to lose.** I decided this the moment the security line appeared in week 5:

> "3–1, on pace for about 9. You need 4 more from 8. **Secure.** … Finish on this pace,
> 9–3, and the board has you at 79 from 65."

Everything else on the dashboard I can trace *to* record. Fans come from winning, press
comes from winning big, prestige barely moves, and money comes from fans and press.

The number I thought would matter and does not: `In the bank $5.9M`. It never bound. The
number I could not place at all: `Prestige 72/100` — the dashboard never says what it
does. I learned on two other screens that it sets sponsor value ($400/wk each) and decides
which coaches take your call, and neither is linked from the dashboard.

### 4. What did you not understand at all?

- **What "roster fit" is measured in, or why it is a range.** `Roster fit 66–76% fit` was
  on the most consequential screen in the game and I never learned what the two numbers
  were.
- **What changing scheme costs.** The one statement is "it's a rebuild, and it'll cost you
  until you recruit the right kids." No number, ever.
- **Why my fit collapsed 25 points in one offseason.** Nothing attributed it to anything.
- **What a Recruiting Point is worth.** I earned ~28 a week for two seasons and never
  found a statement of what 5 or 20 of them buy, except the one excellent sentence "he
  needs 6 more from somebody".
- **What the `matters N/100` stakes number is comparing.** It ranked a permanent
  development gain (75) above a one-Saturday install gain (40), which are not the same
  kind of thing.
- **What the security scale is.** `96 from 65` on an unnamed range.
- **`Personal fans`**, `Visit weekends 6/6`, `Flip target`, `ELITE/NATIONAL/REGIONAL/
  UNRANKED` — four terms used repeatedly, none defined.
- **Where the $48K a week of NIL comes from.** It is the only budget in the game with no
  stated source, and it never moved.

### 5. What did you ignore because you could not tell if it mattered?

- **The whole Recruiting screen after week 7.** Not by choice at first — the board
  white-screens on any prospect but the first — but even before I found that, the
  evaluation prices (5/8/10/8/6/12 RP per prospect, ~49 for a full read, 31 prospects,
  ~28 RP a week) never resolved into a plan I could afford or even sketch.
- **Marketing.** The slider goes to $400,000 and the panel says up front
  *"Marketing rarely pays for itself on the day."* I never spent a dollar and nothing ever
  suggested I was wrong.
- **The Depth Chart.** It is auto-sorted best-first and every arrow I could press would
  have made it worse. I opened it twice in two seasons, both times looking for something
  else.
- **Redshirting.** A button on every one of 78 depth-chart rows with a two-line
  explanation and no indication of when it is the right call.
- **`Player Media`, `Honors`, `Player Stats`, `Weekly Recaps`, `Divisions`.** Five of the
  ten `More ▾` items. I opened none of them and nothing ever pointed at them.
- **Facilities other than Recruiting.** I bought one upgrade. `Stadium` said
  `$1.5M now · $49K forever · 16% → 24% more money on every home date`, which is the
  clearest card in the game — and I still could not tell whether 8 points of home-date
  revenue beat $49K a week, because the screen does not say what a home date is worth.
  (Two weeks later the postgame told me: `Ticket revenue $2.1M`. Nothing connects them.)

### 6. When did you first feel you knew what you were doing?

**The portal, at the end of season 1.** Everything before that I did on faith. The portal
screen states what a player wants, how well I match it, what he costs, and how much of my
two budgets is left — and then reports, by name, exactly what happened to each bid. It was
the first time in eight hours that I could see a decision, make it, and be told the result
in the same vocabulary.

The second moment was the season-2 sponsor screen, where I could do the arithmetic
unaided because season 1 had taught me the units.

**In the weekly loop I never got there.** Fourteen weeks of `Advance week` did not teach
me anything the first week had not.

### 7. What made you want to play another season?

Three things, honestly:

1. **The board review.** `10–3, 3 clear of the 7 they asked for +21 · Reached the playoff
   +10 · You keep the job.` A year of pressing a button was scored, itemised, and
   resolved. It gave the season a shape retroactively.
2. **The portal.** An 88 and two 87s onto a 65.5 roster in one screen. That is the
   promise of a management game landing.
3. **The scheme screen at the top of season 2** telling me my roster had become something
   else. It was frustrating that it would not say why, but it was the first time the game
   suggested that a *program* changes rather than a record.

What did **not** make me want to play another season: anything in the weekly loop. Weeks 2
to 14 of season 1 and weeks 1 to 4 of season 2 were the same button.

---

## Part 3 — Findings, classified

Classification: **onboarding** (never explained anywhere) · **clarity** (explained badly
or contradicted) · **discoverability** (explained somewhere I did not look) · **defect**
(broken). Checked against `expected-behavior.md` "What is *not* a defect" and
`game-balance.md` §6; none of the below is on those lists.

### P1

**F1 · defect — Selecting any prospect but the first white-screens the entire app.**
`button.prospect-summary` → `Uncaught Error: Rendered fewer hooks than expected. This may
be caused by an accidental early return statement.` React unmounts, no error boundary, the
only recovery is a browser reload. Reproduced 3/3 from a clean load
(`Jared Diaz`, `Theo Wright` crash; `Anthony Miller`, the auto-selected prospect, works).
Screenshot `45-white-screen-crash.png`.
This makes the game's most-flagged briefing item (`REQUIRED · Next year's roster is 20
short`) unactionable, and to a cold player it reads as "the game is broken".

**F2 · defect — Preseason ticket price is accepted and silently discarded.**
During `ROSTER_REVIEW` the ticket slider is live, moves, and displays the new value.
Set `$48` (2027) and `$54` (2028); both reverted to `$42`. Measured, not inferred:
week 10 2027 shows `Stadium attendance 50K / 50K seats · Ticket revenue $2.1M` —
$2.1M ÷ 50,000 = exactly $42. The same command **in-season persists** (set $50 in week 4
2028, survived the week). Violates *expected-behavior* §8 ("silently dropping a command is
a defect"). I priced a whole season 22% under the game's own posted benchmark and was
never told. Screenshot `19-ticket-48.png`, `64-ticket-54.png`.

**F3 · defect — The posted weekly payoff does not match what the week delivers.**
Violates *expected-behavior* §3 ("the posted number must be the number the engine uses").
Last on-screen value immediately before `Advance week`, against the payoff panel after:

| week | card said | panel delivered | miss |
|---|---|---|---|
| 1 | `Leave it alone +2.9 to every unit that game` | `Film on ICU +2.5 to every unit` | −14% |
| 1 | `Leave it alone +41 recruiting points this week` | `Recruiting +25 points on the trail` | **−39%** |
| 2 | `Leave it alone +2.1 to every unit that game` | `Film on ACS +1.5 to every unit` | −29% |
| 3–8 | `~+2.1` | `+1.5` every week | −29% |

Both numbers are posted as flat values with no band.
Screenshots `26-swapped-priorities.png`, `27-after-week1.png`.

**F4 · clarity — Scheme change has no posted price, and it is the biggest decision in the
game.** The only statement is *"Going another direction isn't a mistake — it's a rebuild,
and it'll cost you until you recruit the right kids."* The screen asks the player to trade
`Roster fit 74–84%` against `installs it to 53%` versus `47–57%` against `64%` — two
scales, no exchange rate, no statement of what either is worth on a Saturday. `CLAUDE.md`
describes an intended rule ("switch systems and keep half" of the install) that appears
nowhere in the product. **Onboarding component:** what "fit" is measured in is never
defined anywhere, in any screen, in two seasons.

### P2

**F5 · clarity — Three screens disagree about who is on the field.** Running Power run:
scheme card `2 WR · 2 TE`; This Week `"Your offense puts 2 WR, 2 TE, 1 back on the field"`;
Depth Chart `WR — 3 starters`, `TE — 1 starter`. Defense agrees across all three. This is
the same defect recorded as #5 in `docs/PLAYABILITY_PASS_2026-08.md` (then with Spread
tempo, 4 WR vs 3 WR) — **still present, on a different scheme.**
Screenshot `68-depthchart-3wr-contradiction.png`.

**F6 · defect — The Inbox is twelve identical rows whose title and body contradict each
other.** Every entry: `✓ / Booster Offered / Weekly development report completed.` Tallied
12 of 12 at week 6, season 1. Nothing about the sponsor signed, two coaches hired, four
injuries, eight results, a ranked win over #2, or a recruit committing. Recorded as #6 in
`PLAYABILITY_PASS_2026-08.md`, **still present.** Screenshot `36b-inbox-broken.png`.

**F7 · clarity — Coach candidate cards omit the one number the post itself headlines.**
The chair posts `Gets your offense installed to 54% before practice reps` and
`Week to week, that swings ±11%`. No candidate posts either. I paid a $271K buyout to
learn Garcia was 62%/±9%, and $507K in season 2 to learn Mitchell was 58% vs Garcia's 53%.
Compounding this, the headline delta is on the wrong stat: `Cameron Garcia +3 on James
Ramirez` when the bar that decides the job is `Game plan 76 → 99`.

**F8 · onboarding — Recruiting spends have no posted payoff, and commitments are never
announced.** `[Invest 5 RP] [Invest 10 RP] [Invest 20 RP]` under the caption "Pursuit is
persistent and known to competing programs" — no odds, no effect, and the card afterwards
still reads `No pursuit points invested yet`. Two searches (25 + 10 RP) and a position
search (12 RP) grew the board 10 → 32 with **no report of what they found**.
`Offer visible targets (19)` produced no feedback and four of my five signings. And when
Anthony Miller committed, **no event, inbox row, story or dashboard line said so** — I
found it because a counter moved from `0 coming in` to `1 coming in`.
(Related to #10 in `PLAYABILITY_PASS_2026-08.md`; the *evaluation* half is now much better
— `Overall Unknown → 51–58`, `Ask/week → $350–$550`, and the excellent
`"he needs 6 more from somebody"` — the *investment* half is unchanged.)

**F9 · onboarding — An entire development system is unreachable from anything that points
at development.** `More ▾ → Development` holds the four training focuses with exact
per-attribute rates, a spotlight target list of all 78 players and 10 rooms, and the five
named per-position attributes (`Accuracy · Decision making · Arm talent · Mobility ·
Durability`). **I played a full season without finding it.** The dashboard's
`Pick somebody →`, the priority card and the Business tab all route to a three-candidate
picker with no focus control, and none of them mentions the Development tab.

**F10 · clarity — Three names for one quantity, on the screen that sells it and the
screen that pays for it.** The marquee offer costs `$1.5M, 30% of your budget` and pays
`24 points of national buzz` — a unit that appears nowhere else. The dashboard calls it
`They're talking about you 38/100`. The Finances page calls it
`38 national press points × $900`. The marquee decision is once-ever and irreversible, and
the only screen that makes it evaluable is two clicks away and unmentioned. I declined a
purchase I would probably have made.

**F11 · clarity — The sponsor screen omits the number one of its three options turns on.**
`Game-day partner · $175K whenever a home crowd fills at least 90% of the stadium` with no
stadium capacity anywhere on the screen. Capacity is on Finances
(`Stadium overheads — 50K seats`). My program sold out (`50K people / 50K seats`) and I
took the guaranteed deal.

### P3

**F12 · clarity — The priority cards' numbers move in directions a player cannot model.**
Same week, only the selection changing:
taking a slot *away from* scouting raised its payoff `+1.7 → +2.4` while its stakes fell
`43 → 17`; dropping a priority lowered the develop card's *leave-alone* value `+17% → +14%`
while raising its *priority* value `+34% → +36%`. And every card labelled "Make it a
priority" keeps showing that value while already selected.
Screenshots `13b-scout-card-went-up.png`, `14b-priority-numbers-move-oddly.png`.

**F13 · clarity — Two of the five priority cards can never justify a slot.**
`Scout: +2.1 → +2.2` and `Work the trail: +41 → +43` against `Install: 71% → 83%`. Three
slots, three worthwhile cards. The screen solves itself in week 1 and is never a decision
again. (Filed as legibility, not balance: the *cards themselves* tell the player the
system is not worth engaging with.)

**F14 · clarity — The job-selection screen denies the ranking it prints.**
> "These are all the same level of program. None is better than the others."

above `Roster today 65.9 … 61.4` and `Potential stars 11 … 3` in the largest type on the
card. Also: **all 30 cards print "The scouting department is an embarrassment"** (every
program is Scouting 2/5), and **all 8 marquee offers end "This is the one."** A judgement
printed on every option is noise.

**F15 · onboarding — A season-ending injury reported as costing 0.0%.**
> "Mario White suffered a broken collarbone and is out for the remainder of the season.
> Mason Black moves into the rotation, affecting pass offense. Pass offense falls from
> 76.1 to 76.1, a 0.0% drop in the unit rating."

Happened twice. The template is honest and the lesson a player takes from it is that depth
does not matter. Contrast the same template working perfectly earlier:
`"Pass offense falls from 76.1 to 75.4, a 0.8% drop"`.

**F16 · clarity — The security scale is never given.** `Extension on the table 96 +31 from
65`, `the board has you at 79 from 65`. `game-rules.md` defines bands (EXTENDED ≥85 …
FIRED ≤0) that never reach the screen. I met the number 65 for the first time in week 5
of season 1 with no way to know whether it was comfortable.

**F17 · clarity — The board target never moves and never says so.** 10–3 and a playoff
berth in 2027; the 2028 header still reads `7 wins keeps everybody happy`. Per
`game-rules.md` the tier target is fixed at MID 7. That is intended, but nothing on screen
says the number is permanent, so over-achieving reads as having bought nothing.

**F18 · defect — The coach market offers the coach it has just hired.**
`Bryce Scott … $257K to sign him + $441K buyout · +0 on Bryce Scott`. $698K to re-sign the
incumbent for zero gain. Screenshot `07b-rehire-self-bug.png`.

**F19 · discoverability — The offseason has no navigation.** Review / Portal / Signing day
/ Staff / Camp render with no header nav at all. I bid on a 94-rated offensive lineman
without being able to look at my offensive line, and evaluated staff without being able to
open Finances. Screenshot `57-camp-picked.png`.

**F20 · clarity — The offseason stepper undercounts itself.** `1 Review · 2 Portal ·
3 Signing day · 4 Staff · 5 Camp`, then `Open the season` opens a sixth screen (scheme +
staff) which is the *only* place scheme can be changed. A player who reads "5 Camp" as the
last step is surprised by the most important decision of the year.

**F21 · clarity — The playoff happens off-screen.** Regular season ended 10–2; the next
thing I saw was `10–3` in the board review with `Reached the playoff +10`. A thirteenth
game was played, lost, and reported nowhere — no bracket, no result, no story, no box
score.

**F22 · clarity — Portal bids have no odds.** `How well you offer it 73/100` is fit, not
probability, and the sliders post nothing. `In the portal 267` with 24 shown and no
search or filter.

### P4

**F23 · clarity — `Recruiting · Locked` in the nav while standing on the Recruiting
screen**, reached from the dashboard's own `Work the phones →`. No reason for the lock and
no unlock condition stated. Recurs every preseason.
Screenshot `18b-recruiting-nav-says-locked.png`.

**F24 · discoverability — The game points at a tab it does not show.**
`"A marquee-game offer is open on the Schedule tab"` while the visible nav is
`Dashboard · This Week · Roster · Depth Chart · Recruiting · More ▾`. Schedule is item 6
of 10 inside `More ▾`.

**F25 · clarity — The defensive scheme opens on a strictly dominated option.**
Default `Bend don't break 63–74% · installs to 47%` against `Zone blitz 71–82% · installs
to 52%`, on a screen whose own sentence reads *"These guys are built to run Zone blitz."*

**F26 · onboarding — Terms used repeatedly and never defined:** `Personal fans`,
`Visit weekends 6/6 remaining`, `Flip target`, `ELITE / NATIONAL / REGIONAL / UNRANKED`,
`Prestige` (what it does), the source of `Player pay (NIL) available $48K`, and why
`Roster fit` is a range.

**F27 · clarity — Head-coach card reads `Game prep +0.0`** in the season-2 offseason
(it was `+0.5` at the first takeover). A posted +0.0 with no explanation says "this man
does nothing".

**F28 · clarity — Two roster averages, two screens, neither explained.**
Dashboard `Starters average 71.0`; Roster `Average rating 65.5`. Nothing says which is
which or which matters.

**F29 · clarity — `Opening roster 85 players` is identical on all three career cards**,
presented as the second line on every card, differentiating nothing.

**F30 · clarity — `Try again next time!` is the heading over a failed $1.2M donation.**
The mechanics of the door event are the best in the game; the tone of the miss screen is
not.

---

## Part 4 — Answers to the five "does it span more than a week" questions

Asked without being told which screens changed. Verdicts are from play, not from code.

| question | verdict | evidence |
|---|---|---|
| **How many players leave each year and what replaces them** | **Legible. Best-in-class.** | Dashboard: *"21 of your 85 are out of eligibility after this year and nobody is coming in yet, which lands you at 64 of 85. The class closes with the season — 14 weeks left."* War Room repeats it at position level: `TE roster plan Thin · Current scholarships 6 · Expected returners 4 · Incoming 0 · Projected/target 4/6 · Best returning OVR 71`, plus a named warning `"TE, DL, DB, P won't have enough bodies to field and rotate next season"`. The portal adds `Roster openings 24`. I understood this in week 0 and it stayed true all year. |
| **What last week's money was actually spent on** | **Legible. Completely solved.** | Finances → *Where last week went · $2.5M of costs*: `Scholarships — 85 at $1,500 a week $128K · Facilities upkeep $467K · Stadium overheads — 50K seats $150K · Running the department — 55% of revenue $1.7M · Coaching salaries $57K · NIL commitments $0 · Against $3.1M of revenue +$584K`. Every line names its own basis and it reconciles. The one gap is discoverability — it is inside `More ▾` and no briefing item ever pointed me there. |
| **Whether the job is safe, and what the board is measuring** | **Legible, with one gap.** | From week 5: *"3–1, on pace for about 9. You need 4 more from 8. **Secure.** The board has no questions about the job. Finish on this pace, 9–3, and the board has you at 79 from 65."* Graded on pace, not partial record; band named; same target as week 1; February review itemises every delta and they sum. **Gap:** the 0–100 scale and its bands are never shown (F16), and I first met my own number in week 5 (F16). |
| **What changing scheme between seasons costs** | **Opaque. Not fixed.** | The only statement is *"it's a rebuild, and it'll cost you until you recruit the right kids."* No number. The screen posts `Roster fit 74–84%` against `installs it to 53%` and never says what either is worth. Worse: **my fit fell 25 points on both sides of the ball in one offseason with no attribution to anything I did** (F4). I made the biggest strategic decision of my career on the word "Workable". |
| **Whether recruiting is working — does any action visibly change anything** | **Mostly opaque, and partly impossible.** | The *evaluation* half works and is well written (`Overall Unknown → 51–58`, `Ask/week → $350–$550`, `"he needs 6 more from somebody"`). Everything else is invisible: pursuit posts no payoff and no change; searches report nothing; free scholarship offers report nothing and produced **4 of my 5 signings**; and the one commitment I earned was never announced (F8). And the board itself **crashes the app** on any prospect but the first (F1), so the loop cannot be run at all. After a full season I could not tell you which of my recruiting actions produced my class. |

---

## Part 5 — Clean results

Verbatim, things that worked and should not be touched:

- **The staff market's refusal line.** *"Won't return your calls — Everglades State
  Pythons isn't a big enough job yet."* The single clearest sentence in the game.
- **The scheme screen's thesis.** *"A great fit nobody can install is worse than a good
  one your coordinator knows."*
- **Personnel groupings on the scheme cards.** `1 QB · 1 RB · 2 WR · 2 TE · 5 OL` beside a
  named verdict (`Built for it` / `Good fit` / `Workable`).
- **The install phrasing.** *"Leave it alone — 71% of it holds up (2 reps) · Make it a
  priority — 83% of it holds up (5 reps)."* Best-worded number in the product.
- **The sponsor market arithmetic.** `55K fans × $1.25 · 38 national press points × $900 ·
  72 prestige points × $400 · 0 titles × $15,000`. The only screen that makes the
  program's abstractions mean anything.
- **`Where last week went`** on Finances — see the table above. Complete.
- **Facility cards.** `Decision cost $1.5M now · Adds to every week $49K forever · Current
  payoff 16% more money on every home date · After upgrade 24%`.
- **The injury story when it has a number.** *"Malachi Collins suffered a shoulder
  contusion and is expected to miss 1 game. Malcolm Hill moves into the rotation,
  affecting pass offense. Pass offense falls from 76.1 to 75.4, a 0.8% drop in the unit
  rating."*
- **The door event.** Four options, four posted probabilities, four named payoffs,
  and an honest miss: *"Lamar Dawson could not make it work. Nothing changes this week."*
- **The board review.** *"Nothing here is a roll — every line below moved your number by
  the amount it says."* And it does.
- **The portal.** *"A transfer arrives finished rather than at eighteen, and keeps
  whatever eligibility he had left. That is what makes the portal the fast way up."*
  Plus the per-player `What just happened` report.
- **Training camp.** Three options, each with `You get:` and `It costs:` and a stated
  duration.
- **The box score.** Every column's unit spelled out in full.
- **The dashboard briefing.** `5 things need you — 2 are costing you right now`, each with
  a headline, a reason in plain language, and a verb button. It is the reason I ever knew
  where to go.
- **Autosave.** Recovered a mid-season career byte-for-byte after a hard crash.
- **`matters N/100`** is now labelled, the facility names are spelled out, the marquee
  opponents are named in full, job security is wired and shown, and the dead offensive/
  defensive preset pickers are gone — all of which were open findings in
  `docs/PLAYABILITY_PASS_2026-08.md`.

---

## Summary

**A cold player can now work out what the game wants — the briefing, the board review, the
sponsor arithmetic and the portal are genuinely legible — but the weekly loop solves
itself in week 1 and never asks again, the two systems that span seasons (recruiting and
scheme) are respectively crashed and unpriced, and a live control on the roster-review
screen threw away my ticket price for an entire season without saying so.**
