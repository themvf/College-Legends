# New player tester run — 2026-09-04

**Agent:** new-player tester (cold read)
**Target:** Can somebody who has never seen this game work out what to do? Comprehension and legibility, not systems quality.
**Build:** `710251b`

## Setup

| | |
|---|---|
| Seeds | whatever a cold `CREATE_GAME` generated (no seed exposed in the UI) |
| League size | 72 programs (inferred — ranks go to #72) |
| Seasons played | Season 2027 complete (10–3, playoff), full offseason, plus weeks 1–6 of 2028 |
| Career path | Program Riser (MID) → Everglades State Pythons (DEVELOPER, Fort Lauderdale) |
| Environment | browser, Playwright/Chromium, 1440×1100, `http://localhost:5199/College-Legends/` |

## What I did

Started the app cold. Did not read `CLAUDE.md`, `docs/`, `agents/docs/game-design/`, or any
source until after play finished. Narrated before every click — what I thought the screen was
for, what a number meant, what I expected to happen — then pressed it and recorded whether I
was right. Played every screen the briefing pointed me at, plus the ones I found on my own.
Design docs were read only at the classification step at the bottom of this file.

Driver harness (a long-lived Playwright process fed a command DSL) is in
`/tmp/.../scratchpad/np/runner.mjs`; raw transcript in `np/session.log`.

Screenshots captured at the moment of confusion are in
`qa/runs/2026-09-04-new-player/`:

| file | what it shows |
|---|---|
| `s02.png` | job selection — 30 cards, "55K fans · 72 prestige" identical on every one |
| `s05-dash.png` | the dashboard briefing, the screen that carries the whole onboarding |
| `s08-bounce.png` | F1 — thrown back to the hiring screen after following a REQUIRED item |
| `s13-recruiting.png` | the recruiting board, six "Unknown" rows per prospect |
| `s19-s2.png` | season 2 — my offense reclassified "Wrong personnel, 19–29% fit" |

---

# RUN LOG — narration, unedited

## Screen 1 — Career select (the first screen; no preamble, no tutorial offer)

*What is this for?* Pick a difficulty. *What do I do?* Click one of three.

- "Opening budget $1.5M / $6.0M / $20.0M" — I have no idea what money is spent on yet.
- "Opening roster 85 players" is **identical on all three cards**, so it carries zero
  information and takes a third of the card.
- "Mandate: Build at your pace" vs "Win title in 2 years" — first hint there is a fail state.
- "the longest leash" implies I can be fired. By whom, on what, is not said.

Chose **Program Riser** the way anybody picks the middle difficulty: no information-based
reason. *This is a decision I could not evaluate.*

## Screen 2 — "Which job do you take?" (30 cards)

Best writing in the game. "Nine wins gets you fired here." "You will never out-recruit
anybody, so quit trying." I understood the five program characters immediately.

Problems:
- **30 cards, five archetypes × six.** The archetype paragraph repeats *verbatim* six times.
  By card 8 I was scanning only for numbers.
- **"55K fans · 72 prestige" is identical on all 30 cards.** Two numbers with no variance,
  printed thirty times. I could not tell whether 72 prestige is good.
- No scale on any headline number: "Roster today 65.4 / If they all hit 73.9 / Potential
  stars 9 / Best of them 94." I assumed /100. "Potential stars 9" — out of 85?
- **A contradiction I could not resolve.** I had just picked *Program Riser — Mandate: Build
  at your pace*, and then several cards said *"Nine wins gets you fired here."* Which
  governs me — the career path or the program? Nothing says.

Chose **Everglades State Pythons** (DEVELOPER, roster 65.5, weight room 5/5) because "coach
them up" sounded like what a management game is about. I could not price the "-5 on every
kid you go after."

## Screen 3 — "What are you going to run?" + staff hiring

Dense but mostly excellent: personnel groupings posted per scheme, "Built for it / Good fit /
Workable / Wrong personnel" verdicts, staff cards with a tendency, a salary and a buyout.

**The default is wrong and the screen says so.** The body copy reads *"These guys are built to
run Zone blitz (71–82% fit)"* and the pre-selected option was **Bend don't break (63–74%)**.
Verified in the DOM: `plan-option active` is on Bend don't break at first paint. A new player
who trusts the default ships a defense the game had just told him was second best.

Terms used here and never defined anywhere:
- **"+0.5 to all four phases"** — four phases of *what*? Never named on this screen.
- **"Fills in for a missing coordinator at 66 effective."** 66 effective *what*?
- **"Running a scheme that isn't his costs 45% of what he'd do."** Is 45% the penalty or the
  remainder? I only learned it is the *penalty* by switching schemes and watching it drop
  to 13%.
- The five skill bars (Recruiting 85 / Game plan 78 / Scouting 55 / …) have no scale.
- **"HIRING · $6.0M TO WORK WITH."** Bank or annual budget? Answered only by experiment:
  hiring a coach took it 6.0 → 5.5, so it charges the one-off. The screen never shows my
  committed **annual payroll**, which is the number that will actually bill me every week.

*The decision I could not evaluate:* my DC was a "Nickel pressure guy." Do I pick the scheme
my **roster** fits (Zone blitz, 71–82%) or the one my **coordinator** runs (Nickel pressure,
51–62%)? Two fit numbers in the same unit that mean completely different things, and no
guidance. I picked roster fit because it was the bigger, bolder number, then hired Bryce
Scott (85, "Zone blitz guy") which resolved it by accident. Install went 47% → 52% (scheme
switch) → 56% (new coach). **"Installed to 56%" — 56% of what?** Still not sure.

## Screen 4 — after signing I was dropped on the ROSTER page

I expected a dashboard. I got an 85-row table with OVR / POT / DURABILITY / GAME RISK /
HEALTH / STARDOM / FANS. The table overflows 1440px — YEAR/STATUS is clipped off-screen.

- "GAME RISK 1.1% · 1.34% before coach · 0% fatigue" — risk of *what*? (Injury, inferred.)
- "STARDOM 19/100" — never defined anywhere in the game.
- Banner: "A marquee-game offer is open on the Schedule tab — it expires when you accept."
  I did not know what a marquee game was, and Schedule is buried under "More".

## Screen 5 — Dashboard. The best screen in the game.

"7 wins keeps everybody happy" — finally, a stated goal. "Prestige 72/100", "They're talking
about you 38/100" — scale given, plain English. "**2 things are costing you right now**" with
REQUIRED / OPTIONAL rows, each with a reason and a verb button. *This is the onboarding, and
it works.* Every time I was lost, the fix was to come back here.

Defects on it:
- **"You haven't scouted them at all. They're #41 at 0–0."** *Them who?* There is no
  antecedent anywhere in the panel. I had to open the Schedule to learn it meant my week-1
  opponent.
- Header says "**Budget** $5.5M"; the panel 300px below says "**In the bank** $5.5M". Same
  number, two names, one screen.
- "2 things are costing you right now" heads a list of **four** items.

## Screen 6 — This Week → Your week. Five priority cards.

Structurally the clearest decision screen in the game: each card names *who runs it*, then
"Leave it alone → X" against "Make it a priority → Y". I understood the shape instantly.

**But I could not compare the cards.** The three live options in week 0 were, in their own units:

| card | leave it alone | make it a priority |
|---|---|---|
| Scout Iron City | +1.7 to every unit that game | +1.9 to every unit that game |
| Coach up Tariq Cruz | roster grows +23% faster | roster grows +64% faster, spotlight on one man |
| Work the trail | +45 recruiting points | +47 recruiting points |

Three prizes, three units, no exchange rate. The `MATTERS 43/100` badge is presumably the
exchange rate, but nothing says so, nothing says what 100 would mean, and nothing says who
computed it. And "+45 → +47 recruiting points" for a whole priority slot reads as *nothing* —
I could not tell whether that card is a trap or whether 2 recruiting points is a lot.

**The default film-room target was the game the game tells you not to scout.** It was pointed
at Iron City Vulcans — *"worth 29. Nobody's going to remember this one — save your points."*
Meanwhile the dashboard was telling me to point it at Acadiana State (worth 61). After every
game it silently re-targets to the next fixture, which is again usually the cheap one.

## BUG — the game threw me back to the hiring screen, twice

During "Opening roster review", the first successful state-changing click on **This Week** or
the **Scouting board** returned the entire app to the pre-season *"What are you going to
run?"* takeover screen. Reproduced twice:

1. clicking "Put the film room on Acadiana State Gators" on the Scouting board;
2. clicking "Make it a priority" on Your week.

The state I had set was kept, but I was staring at the hiring screen again with no
explanation. I assumed I had broken the game. **I got there by following the dashboard's own
REQUIRED instruction — "Weekly priorities · 3 priority slots open · Set priority →" — and the
game ejected me for doing it.** Screenshot: `s08-bounce.png`.

## The marquee game (Schedule tab)

*"Pay an appearance guarantee now to replace one cross-division opponent … $1.5M guarantee.
An upset creates a major national story; a loss causes only a small recognition dip."*

This is the only decision in the whole game with a posted **price** and no posted **payoff**.
Everything else posts both. Five minutes earlier the dashboard had told me beating #19
Acadiana is worth *"2,618 fans and 19 points of national buzz"* — a real number. The marquee
card gives no such number, and it does not say that swapping in a Top-25 team makes my stated
7-win target harder. **Declined, because I could not price it.** $1.5M was 27% of my bank.

## Sponsorship — the single most evaluable decision in the game

Three contracts, each with "Guaranteed remaining / Bonuses still available / Maximum remaining
value", plus the sponsor market value shown as arithmetic (`55K fans × $1.25 = $69K` …).
I did the sum in my head: my target is 7 wins; Apex Mobile pays $840K guaranteed + $100K/win
= ~$1.54M at 7 wins, against Summit's flat $1.8M. **Signed Summit.** This is exactly what a
decision should look like and it took me forty seconds.

## Business tab

Ticket slider live-updates the projection: $42 → crowd 39,684, gate $1.7M; $48 → 36,575,
$1.8M; $60 → 27,921, $1.7M. I found the peak by dragging. Good.

Two problems:
- **"Net this week" reads $2.5M whether marketing is $0 or $150,000.** The one number that
  tells me whether marketing pays is rounded to a precision that cannot see the spend. I
  spent the $150K on faith because the copy said to.
- During preseason it says *"You're on the road this week"* and *"you're playing somewhere
  else this week"* — there is no game at all that week, and week 1 is at home.
- Section "3 · WHO GETS THE EXTRA WORK" said **"Nobody yet"** at the same moment the Your-week
  priority card said **"Tariq Cruz gets the full spotlight."** Two screens disagreeing about
  one piece of state.

## Weeks 1–14

Kept one standing set of priorities — Install offense · Install defense · Coach a player up —
for the entire season and never changed it. Nothing ever told me to.

- **W1** home vs Iron City (#41). Won 42–10. Rank #23 → #18, fans +2,239, +$531K.
- **W2** at #19 Acadiana. Won 38–26. **−$497K** — I make money at home and lose it away, which
  I worked out only from the finance panel, never from a screen that said so.
- **W3** booster modal (below). Won.
- **W6** at #4 Crescent City — the "game of your season" I had pointed the film room at for
  four straight weeks. **Lost 20–42.** The payoff panel said the file delivered *"+2.9 to
  every unit"*. I have no way to know whether four weeks of film was worth it; the
  counterfactual is invisible and the game never mentions the choice again.
- Finished **9–2**, then 10–3 with the playoff.

**The saturated-file trap.** In week 1 my scouting priority read `MATTERS 7/100` with "Leave
it alone +3.0" and "Make it a priority +3.0" — identical. The file was already complete, so
that priority slot was doing literally nothing, and the only signal was a badge I did not yet
understand. The dashboard did not flag it. I caught it by reading the two numbers side by
side; a player who trusts the "Chasing this" state loses a third of his week for free.

## "What your week bought" (postgame)

```
Offense on Saturday   78% of the plan held up
Defense on Saturday   77% of the plan held up
Film on ICU           your guys went in cold
Tariq Cruz            +0.18 Overall
Recruiting            +25 points on the trail
```

I liked this panel a lot — it is the only thing that closes the loop. But **"Tariq Cruz +0.18
Overall" for a whole priority slot reads as a rounding error.** Nothing says that +0.18/week
compounds into ~+2.5 a season, or that 2.5 Overall is a lot. And "Film on ICU: your guys went
in cold" is reported as a failure when it was a deliberate trade I had made on purpose.

## Somebody at the door (weeks 3, 6, 9, 12)

The clearest gamble UI in the game: four named people, a named reward, a stated percentage.
"$1.1M straight into the budget · 43% chance." I could do expected value in my head.

Two problems:
- **Nothing on the modal says how to accept.** There is no button on the cards. "You can say
  yes to one" — by doing what? I guessed *click the card*, and I was right, but on the week-6
  offer I clicked the coach's *name*, could not tell whether it had registered, and nearly
  turned all four away by accident.
- The result appears on the **Dashboard**, not where I made the choice. My first one failed
  and I only found out by wandering back to the dashboard some minutes later. The feed row
  reads **"Booster Resolved — Weekly development report completed."** — a title and a sentence
  about two different things.

## Recruiting — the system I never understood

Six headline numbers, three of which I could not read:

```
RECRUITING POINTS 84 (+25 next week)   PROJECTED OPENINGS 21 (0 committed)
VISIT WEEKENDS 6/6                     SCHOLARSHIP OFFERS 0 (10 prospects on board)
NIL CAPACITY / WEEK $52K               NIL COMMITTED / WEEK $0
```

- **"NIL"** is used as a headline with no expansion and no explanation, ever.
- **"PROJECTED OPENINGS 21"** — openings for what, when?
- *"Roster warning: TE, DL, DB, P project below the room plan."* **"Room plan"** is never
  defined.
- Every prospect row reads `SCOUTED · Overall Unknown · Program fit Unknown · Ask/week
  Unknown`. **"SCOUTED" is a button meaning "scout him", but it reads as a state meaning "he
  has been scouted"** — directly contradicted by the three Unknowns underneath it.
- The detail panel offers **six evaluations — Basic 5 RP, Athletic 8, Position 10, Character
  8, Medical 6, Projection 12 — under the sentence "Each report unlocks only the information
  named on the button."** The information named on the button is the word "Basic". I bought
  Basic to find out what Basic was.
- **Pursuit is "+5 / +10 / +20 RP" with no stated effect on anything.** No odds, no price, no
  percentage. I invested 20 points into a prospect showing "0%" and nothing visibly moved.
- Later, three prospects read **"Committed to you · 0%"**, which is a sentence and a number
  that cannot both be true.
- Nothing tells me the round-trip cost of one signing (offer + evaluation + pursuit + visit is
  ~45 RP against ~25 RP a week), so I could not budget a class.

I clicked "Offer visible targets (10)" because it was free, and later "Offer visible targets
(16)". That was the whole of my recruiting strategy for a season.

## Season rollover — the board review

```
10–3, against 7 asked for            EXTENSION ON THE TABLE   96   +31 from 65
10–3, 3 clear of the 7 they asked for   +21
Reached the playoff                     +10
You keep the job.
```

Excellent. Named reasons, signed deltas, arithmetic that adds up. **But this is the first time
in the entire season I learned that a job-security number existed.** I had never seen "65"
anywhere. I searched the dashboard mid-season for it (weeks 11 in season 1; week 6 in season
2, i.e. well past a third of the year) — the strings `secure`, `hot seat`, `watched`,
`security`, `extension`, `the job` are all absent from the dashboard text.

## Offseason: Portal → Signing day → Staff → Camp

- **Portal** is well written: what he wants ("Player Development · National Exposure ·
  Facilities"), **"HOW WELL YOU OFFER IT 78/100"**, what he costs. I kept all three of my own
  leavers. But **a portal bid has no posted odds** — the booster modal gives me a percentage
  for a $240K advert and the portal gives me none for a starter. And the RP slider on *every*
  one of 267 listings is scaled 0–my entire budget, so nothing suggests what a bid should be
  beyond "a serious bid starts at 5 points."
- **Signing day** — 7 signed. And then: **"ON THE ROSTER NOW 64. SCHOLARSHIPS FREE 21."**
  I went into the offseason with 85 players and came out with 71. **Nobody ever warned me
  I was going to be fourteen players short.** The dashboard nagged "120 recruiting points are
  sitting unspent" all season, which is a resource complaint; it never once said "you are on
  track to lose a quarter of your roster and replace a third of it." That is the one place in
  the season where I was genuinely ambushed.
- **Camp** — three options, each with a named gain and a named cost. Clear and evaluable.
  ("Split it — You get: Nothing either way. It costs: Nothing either way" reads like a bug
  until you realise it means "neutral".)

## Season 2 — what I had to relearn, and the worst decision in the game

After "Open the season" the app went back to the **"What are you going to run?" takeover
screen**, which is not one of the five numbered offseason steps and which I did not expect.
On it:

```
OFFENSIVE SCHEME: Spread tempo
These guys are built to run Power run (89–99% fit).
   Power run     · Built for it     89–99% fit
   Pro balanced  · Built for it     89–99% fit
   Air raid      · Workable         50–60% fit
   Triple option · Wrong personnel  19–29% fit
   Spread tempo  · Wrong personnel  19–29% fit   ← what I actually run
```

My offense went from **66–76% fit ("Good fit")** to **19–29% ("Wrong personnel")** in one
offseason, and my defense did the same thing. Nothing explains why. I lost 21 seniors and
signed 7 freshmen; that apparently inverted the identity of the program.

Then the trap. Measured on the screen itself:

| | roster fit | coordinator install |
|---|---|---|
| stay on Spread tempo | 19–29% "Wrong personnel" | **56%** |
| switch to Power run | 89–99% "Built for it" | **48%** |

Two numbers moving in opposite directions, in different units, with no exchange rate — and
the screen's only guidance is *"Going another direction isn't a mistake — it's a rebuild, and
it'll cost you until you recruit the right kids"*, which quantifies nothing. **This is the
single worst decision-you-cannot-evaluate in the game, and it is the first thing season two
asks you.**

I switched to Power run. Then I opened the coordinator market to hire someone who coaches it
and **there was not a single Power run coach in it** — every candidate read "This isn't what
he coaches" or "Close enough to what he knows". So the season-2 dashboard now shows two
permanent REQUIRED items:

```
REQUIRED  James Ramirez doesn't coach what you're running
          He installs about 36% less of it than a coach who knows the scheme.
          Replace him, or change what you run.
REQUIRED  Bryce Scott doesn't coach what you're running   (32% less)
```

…telling me to fix something the market cannot fix. As a player this is where I stopped
trying to reason and started clicking Advance week.

Also relearned/re-noted in season 2:
- The sponsor decision resets (fine, and stated), but the REQUIRED flag for it sat unresolved
  for six weeks without escalating.
- **"7 wins keeps everybody happy" is unchanged after a 10–3 playoff season** and a board
  extension. The one line that states the point of the season did not notice what I did.
- Roster still reads 74/85 with no on-screen route to fixing it.

Went 3–1 through week 6 of 2028 and stopped there.

---

# The seven questions

### 1. What is the goal? What does this game actually want from me?

**By week 3 I could state it: hit the win number the board asks for, and grow fans, press and
prestige, because those are what turn into money.** The dashboard's "7 wins keeps everybody
happy" plus the sponsor market's arithmetic (`fans × $1.25 + press × $900 + prestige × $400 +
titles × $15,000`) together taught me the whole thesis without a tutorial. That is a real
achievement and it is the game's biggest onboarding win.

What I could **not** work out: the long game. Nothing told me what I am building *toward*
across seasons, what a good budget looks like, or that a quarter of my roster leaves every
year. I understood the week and the season; I did not understand the decade.

### 2. What did I do this week, and why?

Weeks 1–14: **I set three priorities in week 1 and never touched them again.** Install
offense, install defense, coach a player up. I picked them by sorting on `MATTERS n/100`
because it was the only number that let me compare cards, and then the game never gave me a
reason to revisit. Beyond that I clicked ticket price once, signed a sponsor once, moved the
film room twice, answered four boosters, and pressed Advance week.

Honest version: **most weeks I did nothing and the game did not object.** The standing-plan
design is deliberate and I appreciated it, but it means the answer to "what did I do this
week" is usually "nothing".

### 3. Which number on the dashboard matters most? How did I decide?

**"6–2, on pace for about 9. You need 1 more from 4."** I decided by elimination: it is the
only number on the dashboard that is stated as a *target with a gap to it*. Prestige 72/100,
"They're talking about you 61/100" and "Starters average 72.2" all have scales but no target,
so I could not tell if they were good, and I ignored them all season.

Runner-up, and I got this wrong: **"In the bank $5.5M"**. I watched it slide from $6.2M to
$4.8M over five weeks and could not find out why. The Finances page gives "Last week's costs
$1.2M" as one undifferentiated number — it itemises the *revenue* side beautifully and gives
the cost side no breakdown at all.

### 4. What did I not understand at all?

- **Recruiting.** Every part of it. See the section above.
- **What "install" is a percentage of.** "78% of the plan held up" — 78% of what, and what
  does 100% look like on a Saturday?
- **"All four phases."** Used on every staff card, never named.
- **Why my scheme fit inverted between seasons.**
- **What a game costs to lose.** Fans went −599 for losing to #4 and +2,239 for beating #41.
  I never built a model of it.
- **NIL, stardom, "room plan", "national buzz" vs "national press points" vs "local press
  points"** — four adjacent currencies, three of which I could not distinguish.

### 5. What did I ignore because I could not tell if it mattered?

- **Depth Chart** — opened once, never used. The dashboard kept saying "Sean Stewart: out 2
  games. Shane Fields takes his place. Pass offense 75.1 → 74.8 · 0.3% lower unit rating" and
  since it fixed itself for a 0.3% cost I concluded the screen was optional.
- **Facilities.** I read the upgrade cards (which are excellent — "$1.5M now · Adds to every
  week $49K forever") and then never bought one, because I had no model of what my weekly net
  should be and $49K/week forever sounded frightening.
- **Player Media, Honors, Divisions, Player Stats, Weekly Recaps, Inbox** — six of the fifteen
  nav destinations. I never opened them in a full season and nothing suffered.
- **The whole "MATTERS" score** for two weeks, until I worked out it was a ranking.
- **Recruiting points**, right up until they cost me fourteen players.

### 6. When did I first feel I knew what I was doing?

**Week 2, and only about the week.** The moment was reading the sponsor screen and being able
to do the arithmetic myself — 7 wins × $100K + $840K vs a flat $1.8M. That was the first time
the game handed me a decision I could actually solve, and it made me trust the rest of the UI.

**I never felt I knew what I was doing about the season or the program.** Season 2 week 1 —
the scheme-fit inversion plus two unfixable REQUIRED coordinator warnings — moved me
backwards: I understood *less* at the start of season 2 than at the end of season 1.

### 7. What made me want to play another season?

Two things, and both are narrow.

1. **The board review.** "10–3, against 7 asked for. +21. Reached the playoff. +10. 96, +31
   from 65. **You keep the job.**" It was the first time the game told me my season had a
   verdict, and I immediately wanted to see 96 become 100.
2. **The postgame "The week in stories" package** — a lead, a national upset, a Saturday star,
   an injury with its unit cost. It is the only place the simulation reads like a sport
   instead of a spreadsheet.

What did **not** make me want to play on: the football. I went 10–3 and I could not tell you
which of my decisions caused a single win. Install held at 77–78% every single week whatever
I did, the one game I prepared hardest for was the one I lost 20–42, and the priorities I set
in week 1 were still set in week 14. **The season had a verdict but not a story I authored.**

---

# Findings, classified

Classification: **onboarding** = the game never explains it; **clarity** = the game explains it
badly or contradicts itself; **discoverability** = it is explained somewhere I did not look;
**defect** = it behaves wrongly.

## P1 — blocking comprehension or contradicting a stated invariant

**F1. Following the dashboard's own REQUIRED instruction during ROSTER_REVIEW ejects you to
the hiring screen.** — *defect*
Repro (2/2): new career → sign a contract → complete the takeover → Dashboard → either
"Set priority →" then "Make it a priority", or "Move the film room →" then "Put the film room
on X". The whole app re-renders as *"What are you going to run?"*.
`game-rules.md` §1 says `ROSTER_REVIEW` only permits scheme, staff, marquee and depth chart —
so `SET_WEEK_FOCUS` / `SET_SCOUTING_TARGET` are legitimately out of phase. But
`expected-behavior.md` §8 requires a refusal *with a reason*; instead the UI offers the action
as REQUIRED, accepts it, and silently drops the player on a completed screen. Evidence:
`s08-bounce.png`.

**F2. Job security is invisible for the entire season and lands as a surprise in February.** —
*defect against `expected-behavior.md` §7*
The doc: *"Job security shows a named band from a third of the way into the season… one who
finds out in the offseason was ambushed, and that is a defect."* Measured: at season 1 week 11
and season 2 week 6, the dashboard body text contains none of `secure`, `hot seat`, `watched`,
`security`, `extension`, `job`. The first time I saw the number was the board review telling
me it had moved 65 → 96. This looks like an over-correction of PLAYABILITY_PASS #2 ("retire
job security from the header until firing exists") — firing now exists, and nothing was put
back.

**F3. Losing a quarter of the roster is never warned about.** — *onboarding*
85 players at the end of the season → "ON THE ROSTER NOW 64 · SCHOLARSHIPS FREE 21" at signing
day, with 7 signed. The season-long briefing item is *"120 recruiting points are sitting
unspent"* — a resource complaint, never a roster-consequence warning. `expected-behavior.md`
§7 ("the player is never ambushed") applies: the briefing should say how many scholarships are
projected open and how far behind the class is, not how many points are idle.

**F4. Recruiting is nine unlabeled spends per prospect with no odds anywhere.** —
*onboarding, already specced*
Six evaluations priced in points whose only description is their own name; three pursuit
buttons ("Invest 5 / 10 / 20 RP") with no stated effect; "SCOUTED" used as a verb on a row
whose next three fields all say "Unknown"; "Committed to you · 0%". This is PLAYABILITY_PASS
#10 verbatim, and `RECRUITING_REDESIGN.md` line 304 confirms the "one row: a range, a price, a
percentage" legibility layer is **the last unbuilt piece**. So this is a *known* onboarding
gap — but it is the single biggest one, it is where the roster shortfall in F3 comes from, and
a season of play went by without me making one informed recruiting decision.

**F5. The season-2 scheme decision cannot be evaluated, and the market cannot resolve it.** —
*clarity + onboarding*
Between seasons my offense went 66–76% "Good fit" → 19–29% "Wrong personnel" with no
explanation. Staying keeps a 56% install and a wrong-personnel roster; switching gives a
89–99% roster fit and a 48% install. Two numbers, opposite directions, different units, no
exchange rate and no stated cost of switching beyond "it's a rebuild". Then the coordinator
market offered **zero** coaches who run the scheme the game had just told me to run, so the
resulting two REQUIRED dashboard items ("Replace him, or change what you run") are unfixable.

## P2 — a decision with a price and no payoff

**F6. The marquee game posts a cost and no benefit.** — *clarity*
"$1.5M guarantee … An upset creates a major national story." Every comparable decision in the
game posts a number (the scouting board literally prints "you pick up around 2,618 fans and 19
points of national buzz"). This one prints none, does not say it makes the stated win target
harder, and does not say $1.5M is ~27% of the opening bank. PLAYABILITY_PASS #14 flagged the
forfeit-on-accept half of this; the missing-payoff half is still open. The roster-review banner
now *does* warn about expiry, so that half was fixed.

**F7. "Net this week" cannot see a $150,000 decision.** — *clarity*
On the Business tab, "Net this week" reads **$2.5M** with marketing at $0 and **$2.5M** with
marketing at $150,000. The number that exists to price the decision is rounded past it. Show
the marginal effect ("+2,711 seats ≈ +$130K gate against $150K spend"), not the week total.

**F8. Portal bids have no odds.** — *clarity*
"Bidding 15 points and $600 a week, and he already knows you." The booster modal gives a
percentage for a $240K advert; a starting offensive lineman gets none. Sliders on all 267
listings are scaled 0 → my entire budget, so there is no anchor for what a bid should be.

## P3 — terms used and never defined

**F9. "All four phases."** — *onboarding.* On every staff card, at takeover and in the
offseason ("Game prep +0.5 to all four phases"). The four units are never named on that screen.
Also inconsistent: the same head coach read `+0.5` at takeover and `+0.0` in the offseason.

**F10. "Installed to 56%" / "78% of the plan held up."** — *onboarding.* Percent of what, and
what does the top of the range look like? The takeover screen names neither end of the band.

**F11. "Running a scheme that isn't his costs 45% of what he'd do."** — *clarity.* Reads as
"he delivers 45%"; it means "he loses 45%". Confirmed only by switching schemes and watching
it fall to 13%.

**F12. "MATTERS 43/100."** — *clarity.* PLAYABILITY_PASS #8 asked for this number to be
labelled and it now is, but it still has no denominator in words and no statement of what 100
means. It is the only cross-card comparator on the screen — it is doing more work than its
label admits.

**F13. Undefined nouns.** — *onboarding.* `NIL` (headline stat, never expanded), `STARDOM`
(0–100 column on the roster), `room plan` ("TE, DL, DB, P project below the room plan"),
`GAME RISK` (risk of what), and three press currencies — "national buzz", "national press
points", "local press points" — used interchangeably-ish across screens.

**F14. "what it reports is about 22% dependable."** — *clarity.* PLAYABILITY_PASS #11 asked
for one clause defining reliability; the wording changed but the definition still is not there.
Dependable *about what*?

## P3 — contradictions between screens

**F15. The default is worse than the recommendation, twice.** — *defect (UX)*
(a) Defensive scheme at takeover: copy says "built to run Zone blitz (71–82%)", the
pre-selected option is Bend don't break (63–74%). (b) Film room defaults to, and after every
game silently re-targets to, the next fixture, which the board itself usually labels "worth 29
… save your points." A default the game's own copy argues against is a trap for exactly the
player who most needs a default.

**F16. Development state is reported two ways at once.** — *clarity.* Your week: "Tariq Cruz
gets the full spotlight." Business §3, same moment: "Nobody is being developed this week ·
Nobody yet." (Related to PLAYABILITY_PASS #15, which is about three vocabularies; this is a
straight state disagreement.)

**F17. "2 things are costing you right now" over a list of four.** — *clarity.*

**F18. "Budget" in the header, "In the bank" in the panel below.** — *clarity.* Same value,
two names, one screen.

**F19. "You haven't scouted them at all. They're #41 at 0–0."** — *clarity.* No antecedent for
"them" anywhere in the panel.

**F20. Booster feed row: "Booster Resolved — Weekly development report completed."** —
*defect (copy).* A title and a body about different events. This is the same fallback-renderer
class as PLAYABILITY_PASS #6.

**F21. Business tab during preseason says "You're on the road this week."** — *clarity.*
There is no game that week and week 1 is at home.

## P4 — screens I did not know why I was on, and layout

**F22. Signing a contract drops you on the 85-row roster table, not the dashboard.** —
*discoverability.* PLAYABILITY_PASS #16 called this "an actuarial table" and it is unchanged:
85 rows × 9 columns including per-player injury odds, with one real action (accept). The
YEAR/STATUS column is also clipped off the right edge at 1440px.

**F23. The season-2 takeover screen is an unnumbered sixth offseason step.** —
*clarity.* The offseason presents "1 Review · 2 Portal · 3 Signing day · 4 Staff · 5 Camp",
then "Open the season" leads to a scheme-and-staff screen that is not in the list and looks
identical to the first-ever screen.

**F24. Two numbers repeated 30 times with no variance on the job-selection screen.** —
*clarity.* "55K fans · 72 prestige" is identical on all thirty cards, and the archetype
paragraph repeats verbatim six times.

**F25. The booster modal has no accept affordance.** — *clarity.* "You can say yes to one" and
the only button is "Turn them all away". The cards are `button.booster-option` but do not read
as buttons; I nearly discarded a week-6 offer because I could not tell whether my click had
taken.

**F26. Fifteen nav destinations, six of which I never opened in a season.** —
*discoverability.* Weekly Recaps, Player Stats, Honors, Player Media, Divisions, Inbox. Nothing
suffered. If a whole tab can go unopened for a season with no consequence, either it should
surface itself through the briefing or it should not be top-level.

## Not filed

- **Advance-week latency (~2–4s).** Covered by `game-balance.md` §6/§7.
- **LOW/away weeks losing money.** Covered by §6 and by `expected-behavior.md` ("a losing
  program losing money is the design"). I only file the *unexplained single-number cost line*
  (F27).
- **Losing 20–42 to a #4 team with a full file.** Balance, not comprehension; a complete file
  is documented as worth ~+3.0, about one home field, and it was.
- **The offensive/defensive preset pickers (PLAYABILITY_PASS #1).** Gone — I never saw them.
- **Facility abbreviations, team abbreviations (PLAYABILITY_PASS #12, #13).** Fixed — every
  facility and program is named in full now.
- **Depth-chart / scheme WR-count mismatch (PLAYABILITY_PASS #5).** I did not look hard enough
  at the depth chart to confirm or clear it.

## One more, filed separately because it is a money-legibility gap

**F27. The cost side of the ledger is a single unexplained number.** — *onboarding.*
Finances shows "Last week's revenue $675K / Last week's costs $1.2M" and itemises revenue
beautifully (the sponsor-market arithmetic is the best explanatory panel in the game). Costs
get no breakdown at all. `game-rules.md` §6 says expenses are operating + payroll + NIL +
advertising, and operating is itself squad + facility upkeep + stadium + a share of revenue —
five components the player can act on, shown as one number he cannot. This is why I never
bought a facility: I had no model of my weekly net and "$49K forever" had nothing to sit
against. Also, "Sponsorship earned this season $260K" at week 6 of a $130K/week guaranteed
contract did not reconcile for me and I could not tell whether it was a bug or my
misunderstanding.

---

# Clean results — what worked, verbatim

These are the screens where I never once had to guess, and they should be the register
everything else is rewritten into:

- **The dashboard briefing.** REQUIRED/OPTIONAL, a headline, a reason in plain words, a verb
  and a destination. Every time I was lost the answer was here. Do not touch it.
- **`seasonExpectation`.** "6–2, on pace for about 9. You need 1 more from 4." One sentence
  that carries the entire point of the season.
- **The sponsor market.** The pricing shown as arithmetic, then three contracts with
  guaranteed / bonus / maximum. I solved it in forty seconds.
- **The board review.** Named reasons, signed deltas that visibly sum, one verdict sentence.
- **Facility cards.** "Decision cost $1.5M now · Adds to every week $49K forever."
- **The scheme cards.** Personnel groupings posted; "Built for it / Workable / Wrong
  personnel" is the right amount of verdict.
- **The staff market.** "+11 on Jared Cannon · $735K a year · $257K to sign him + $217K
  buyout · Runs exactly what you run."
- **The box score.** Every column names its unit. Nothing is abbreviated without cause.
- **The ticket slider.** Live projection of crowd and gate; I found the optimum by dragging.
- **The gate lock.** "You're on the road this week. Gate business happens at home."
- **Training camp.** Three options, each with a named gain and a named cost.
- **The five priority cards' *structure*** — who runs it, leave-alone vs priority, both
  priced. The structure is right; only the cross-card comparison is missing.
- **"The week in stories."** The only place the game reads like a sport.

# The one-line summary

**The game taught me the week and never taught me the program.** A new player can be running a
competent Saturday within ten minutes because the dashboard briefing and the priority cards
are genuinely good. What is still missing is everything that spans more than seven days:
recruiting is unreadable, the roster cliff is unannounced, job security is invisible until it
is a verdict, the cost side of the ledger is one number, and season two opens by asking the
hardest unevaluable question in the game.
