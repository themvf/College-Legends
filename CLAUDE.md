# CLAUDE.md

Working notes for College Legends. Read this before changing simulation code.

## What the game is

A college-football *business* simulation, not a dynasty mode. The player runs a
fictional program across weeks, seasons, and decades. Winning championships is
one outcome among several — the goal is to make money, grow fame and
recognition, and build an institution that outlasts any single roster.

Ultimate target is iOS. GitHub Pages hosts a web prototype for testing.

## Repository layout

```
packages/model        types only — GameState, commands, events, no logic
packages/simulation   the engine (advanceWeek, beginSeason, createFictionalLeague)
packages/ai           rival-program command planner (same commands as the human)
packages/content      72 fictional programs, name pools, career paths, balance defaults
packages/analytics    summarize() for balance runs
apps/web              React prototype; simulation runs in a web worker
apps/simulator-cli    headless multi-season balance runner
tests/                node:test suite over the built dist output
docs/                 product vision, game design, technical architecture, ADRs
```

## Commands

```
pnpm install
pnpm build                     # tsc -b across the workspace
pnpm test                      # builds, then runs node --test
pnpm sim --seasons 5           # headless balance run, writes reports/
pnpm web                       # vite dev server
```

Tests import from `dist/`, so a build must succeed before they mean anything.

## Engine invariants

These are load-bearing. Breaking one is a design change, not a refactor.

- **Determinism.** Same seed plus same commands must produce byte-identical
  state and events. `AddressableRng` draws depend only on an immutable path, so
  adding a draw in one system must never shift results in another.
- **Order-independent markets.** Recruiting and any future contested market
  (coaching, portal) resolve all valid commands together. Command order and
  program iteration order must never decide a winner.
- **Events are structured, not prose.** Processors emit typed events with stable
  fields; the UI writes the sentences. `eventHistory` is capped at 10,000.
- **Payoffs are visible.** Every decision the player can make exposes a
  projection function (`projectedDevelopmentPayoff`, `facilityPayoff`,
  `staffFocusPayoff`, `playerMediaPayoff`) so the UI can explain the
  tradeoff before the week is advanced. Keep new decisions to this standard.
- **Balance values are hypotheses.** Correctness belongs in unit tests;
  statistical behavior belongs in committed distribution tests with tolerances.

## The weekly pipeline

`advanceWeek` resolves in a fixed order:

```
commands → recruiting market → fatigue recovery → development → games
  → player brands → injury recovery → new injuries
  → recaps/finances → rankings → recruiting points
```

Season rollover fires when week passes 14: awards → division titles →
12-team playoff → champion → eligibility/portal churn → new recruiting class.

## Review findings — 2026-07 (audit of the "realistic stats" work)

Measured by running the engine at real league size (72 programs, 5 seasons,
2,160 games) rather than by reading the code. Ordered by leverage.

### 1. RNG has no avalanche finalizer — FIXED

`AddressableRng.at()` was FNV-1a whose final step is a multiply, so keys
differing in the last character produced outputs differing by a fixed constant.
Consecutive draws formed an arithmetic sequence stepping by 0.0039:

```
at("home:result:0..9") → 0.291283 0.287376 0.283470 0.279564 ...
```

All 24 possessions in a game drew from a ~0.09-wide window, so a game either
scored on nearly every possession or almost none. `boundedNormal` was worse: its
Box-Muller inputs (`:normal-a` / `:normal-b`) differ only in the last character,
so the pair was never independent and the output was not normal — a bi-peaked
histogram with empty tails.

Measured before / after the murmur3 finalizer:

| | before | after | real CFB |
|---|---|---|---|
| shutouts | 33.3% | ~0.2% | ~1% |
| median team score | 14 | ~23 | ~27 |
| average margin | 39.6 | ~15 | ~17 |
| max team score | 168 | ~83 | 70s |
| normal draw within 1σ | 66.4% (bi-peaked) | 68.3% | 68.3% |

Marginal uniformity of `at()` was always fine; the defect was correlation
between *nearby* keys, which is exactly how the engine uses it — loop indices,
adjacent suffixes, sequential player IDs. Any hash used here needs a finalizer.
`tests/rng-distribution.test.mjs` guards this.

### 2. Stats were back-derived from the score — FIXED

`simulateGameScore` produced a score from team strength, then
`recordPlayerGameStats` back-filled box scores via `totalTouchdowns =
floor(scoreFor / 7)`. Field goals double-counted as touchdowns, pass TDs ran
~2x real rates, RB1 absorbed every non-passing TD, and nothing reconciled
between the two teams.

`simulateGameScore` now returns a `Scoreline` — points, touchdowns, and field
goals — and `recordGameStats` builds both box scores together, defenses first,
so sacks and interceptions charge against the opposing passer. Kicker makes are
the field goals that actually scored; only misses are drawn. Receiving yards,
receptions, and receiving touchdowns are allocated by largest remainder so they
sum exactly to the passing totals. `STARTER_COUNTS.RB` went to 2 and rushing
touchdowns are shared across the backfield and a scrambling quarterback.

Measured per team-game after the change (24 programs, full season):

| | sim | real FBS |
|---|---|---|
| pass attempts / completion % | 30.8 / 62.7% | 31 / 63% |
| passing yards / TD | 233 / 2.1 | 235 / 1.9 |
| rushing attempts / yards / TD | 35.9 / 154 / 1.6 | 36 / 155 / 1.6 |
| total yards | 387 | 390 |
| interceptions / sacks | 0.7 / 2.5 | 0.8 / 2.2 |
| field goals made | 1.3 | 1.2 |
| starting QB season | 2,791 yd / 24.8 TD / 8.2 INT | 2,800 / 21 / 8 |

Reconciliation is asserted, not assumed: `tests/rng-distribution.test.mjs`
checks over 288 team box scores that touchdowns and field goals add up to the
final score, that interceptions thrown equal the opposing defense's picks, and
that sacks taken equal the opposing defense's sacks.

`homeFieldAdvantage` also moved from 1.8 to 2.8, which lifted the home win rate
from 53.5% to 59.7% against a real 57-60%, measured pooled over 1,440 games.
Rates vary by several points between generated leagues, so the distribution
suite pools four independent leagues rather than trusting one season.

Both of the questions left open here were settled by the unit-resolution work
below: box scores are now emitted by drive simulation rather than reconciled
against it, and individual quality decides games. `simulateGameScore`,
`recordGameStats`, and the stat bands described above no longer exist — the
numbers in this section are the targets that work was calibrated against, kept
because they document where the rates came from.

### 3. Money and fame loops do not exist — FIXED

Highest-value remaining work, and the one that most directly serves the stated
goal. Measured over 5 seasons, no program ever went negative:

```
S2028  LOW $12.0M   MID $26.3M   POWER $54.3M
S2032  LOW $68.5M   MID $115.7M  POWER $192.2M
```

- `weeklyRevenue` / `weeklyExpenses` are constants set at league creation and
  never mutated. No media rights, sponsorship, merch, donors, or licensing.
- Total lifetime money sinks are about $23M (4 facilities x 4 upgrades) plus
  marquee guarantees. Programs earn that per month by season 3.
- Fame is economically inert. `nationalPress` feeds recruiting exposure and
  award visibility and nothing else; `prestige` feeds rankings; `championships`
  is a counter. None touch revenue.
- Fans overflow the only thing that converts them — POWER programs reach 748k
  fans against a max 88k stadium, and attendance clamps at capacity, so most of
  the fan base is inert.
- No failure condition. The README promises an eight-year insolvency window;
  nothing checks the budget.

Highest-leverage single change: make `weeklyRevenue` a function of fanBase,
nationalPress, prestige, and championships instead of a stored constant, and
give facilities and staff recurring costs.

### 4. Career paths and job security are UI-only — FIXED

`championshipDeadline` was displayed but never read by the simulation, and
`coachSecurity` was set at start and only ever increased (+10 coach award, +20
title). Measured over five seasons across all 72 programs, the league minimum
never left its starting 45 and the average rose by two — nobody could be fired,
so no decision anywhere in the game carried a consequence.

`BOARD_REVIEW` is now the first offseason step, ahead of the portal, because
whether you still have the job has to precede every decision that assumes you
do. See "The board meets every February" below.

### 5. No offseason, so systems run once

`rolloverSeason` goes from week 14 to week 1 with `phase` still
`REGULAR_SEASON`. Because `marqueeGameOptions` requires `ROSTER_REVIEW`, the
marquee-game business decision is playable exactly once, in the first preseason.
Also absent: signing day, portal *acquisition* (players leave to `PORTAL` and
are gone forever), coach hiring/firing, training camp, scheme. Uncommitted
prospects are silently set to `WITHDRAWN` at rollover.

A redshirting player is excluded from `activeDepthChart` entirely, so the
4-game redshirt rule the code carefully models can never be exercised.

### 6. iOS blockers

| programs | AI plan | sim | state size |
|---|---|---|---|
| 12 | 15ms | 50ms | 4 MB |
| 24 | 450ms | 300ms | 7 MB |
| 72 (real size) | 6.4s | 3.7s | 17 MB at week 6 |

About 10 seconds per "Advance week" tap at real league size, growing
super-linearly. Cause is repeated full scans: `resolveRecruitingMarket` calls
`projectedRecruitingOpenings` — a full ~6,100-player scan — once per prospect
per program, roughly 950M operations per week. `teamStrength` is called inside
sort comparators, rebuilding depth charts on every comparison.

Save size is the other blocker: `playerGameStats` is never pruned — 94 MB and
103k rows after 5 seasons. A 20-year dynasty would be hundreds of MB of JSON on
a phone. Needs per-season aggregation and lookup indices (players-by-program,
prospects-by-status) instead of `Object.values().filter()`.

### 7. Smaller items

- Position-group spotlight (0.55 intensity x 12 players = 6.6x total output)
  strictly dominates the single-player spotlight (1.0x). The individual option
  is never worth taking.
- `developmentFocus` and `mediaAction` reset to defaults at the top of every
  `advanceWeek`, so there are no multi-week training plans and the projected
  payoff UI is only valid for one week.
- ~~Injuries land at roughly 0.06 per team-game — far too few to make depth
  matter.~~ Fixed by the player-health slice described below.
- Home win rate is 53.6% against ~57-60% real; `homeFieldAdvantage: 1.8` is
  light.
- The AI never uses the individual spotlight, never redshirts, never sets a
  depth chart, and never upgrades facilities, so rivals do not compete on the
  systems the game is actually about.

## Generation: tails, not bands

The whole generator was `rng.between(low, high)` — uniform, no tail — and that one
pattern produced three separate defects. Fixed as one piece of work.

| symptom | before | after |
|---|---|---|
| rerolling bought nothing | six leagues, best low-tier ceiling **86 every time**, roster potential 75.0–76.5 | future stars inherited range **3–7** across seeds, best ceiling 91–99 |
| every program in a tier was identical | one `facilityLevel` applied to all five facilities | TRAINING spreads 1–4, RECRUITING 1–3, elasticity 0.35–1.6 |
| no diamonds in the rough | upside **flat at ~12** across every reputation tier | UNRANKED carries 11.4 hidden points against ELITE's 6.6 |

**Programs have character**, authored permanently onto all 72 so the league has
the same landmarks every save. `BLUEBLOOD`, `DIEHARD`, `FRONTRUNNER`,
`TALENT_MAGNET`, `DEVELOPER` set per-facility levels, `fanElasticity`,
`recruitAppeal`, `donorCulture`, and `homeRegionBias`. Character changes
*strategy*, not difficulty: a developer has a weight room and no recruiting
office, a talent magnet the reverse, and a front-runner's gate collapses when it
loses where a diehard's does not.

**Upside is deliberately asymmetric by tier** — low-tier rosters average 10.0
points of headroom against a power program's 6.2. With equal upside a low-tier
roster can never close the measured 15.3-point gap, so development was a
treadmill it could not win.

**Hype is split from truth.** `prospect.hype` is the public consensus every
program sees free; `potential` is revealed only by investment. `hype` is weighted
0.78 toward *current* ability, because rankings measure what a scout can see —
which is why a raw prospect with a real ceiling is systematically under-ranked.
A 12% minority are badly under-rated and 9% over-rated. 15% of prospects with an
88+ ceiling now look unremarkable; before, reputation was a near-perfect proxy
for potential and scouting could only confirm what a power program already knew.

**Rivals recruit the rankings, not the truth.** `prospectValue` read real
`potential`, so every overlooked gem was gone before the player could find one —
the same class of leak as the AI reading opposing unit ratings for free. It reads
`hype` now, and a distribution test asserts rivals sign over-hyped busts at least
as often as hidden gems.

**Choosing a job is a decision.** `programPreviews(state, tier)` returns the jobs
at a tier with facilities, fan character, and the roster you would inherit;
`CREATE_GAME` now generates a league and offers it rather than assigning one.
Characters are interleaved in the list — grouped, the top of the screen was three
cards with the same headline, which is the exact impression the screen exists to
correct.

**Scheme fit is scored comparatively, not absolutely.** A generated roster is
internally uniform, so raw fit scores landed within six points of each other and
every scheme read "about 60%" — the screen could not say what the roster was
built for. Scores are now spread against the other options on the same screen:
median spread is 22 points, and each band carries a plain verdict (Built for it /
Good fit / Workable / Wrong personnel).

**Programs run one of their two best fits, never always the best.** Assigning
every program its optimum collapsed the league onto a handful of schemes — 83% of
programs shared a pass-rush call — which left opponent reports with nothing to
say and dropped the measured value of scouting to a 50.8% win rate. Picking from
the top two keeps a program credible, keeps the league varied, and leaves the
player a visible reason to change it. Incumbent staff coach the program's scheme
60% of the time; the rest is where the first hiring decision comes from.

**Staff cards report what the engine will actually do.** `staffModifiers` derived
everything from raw rating, so a card reading "installs at 51%" sat above a plan
the engine ran at 47% — the coach was splitting his week and coaching someone
else's scheme and the card knew neither. `staffCard(state, programId, staffId)`
passes scheme fit, the PREPARE hour share, and the weight-room term, so the
posted number is the number. A card that disagrees with the engine breaks
"payoffs are visible", which is an invariant rather than a nicety.

Still open from the spec: economy drains, NIL, portal/offseason, familiarity,
concepts, pipelines. See `docs/PROGRAM_IDENTITY_AND_ECONOMY.md`.

## The dashboard is the game's answer to "what do I do now"

A playtest found the game unreadable, and the cause was not copy. The dashboard
was six panels of *status* — fan base, press, roster average — and no direction,
so a player had to hold fifteen nav items, five sub-tabs, five numbered
decisions and five currencies in their head to work out what was being wasted.

`weeklyBriefing(state, programId)` returns at most six items, worst first, each
with a headline, the reason in plain language, a verb, and a destination the UI
turns into a button. Items fire on: no practice reps, an unscouted opponent this
week, a marquee game ahead with no file, a coordinator running someone else's
scheme, recruiting points about to expire, nobody being developed, a ticket
price well off fair, no primary sponsor, and a negative budget.

`seasonExpectation()` finally states the point of a season. `coachSecurity` and
`championshipDeadline` have existed since the beginning and were never once
shown; a number nobody states is a number nobody plays toward. The header now
reads *"0–1. You need 5 more wins from 11 games."* against a target of 10/7/5
wins by tier.

**Pre-week decisions settle pre-week.** `prepareWeek` now also resolves
`SET_PRACTICE_REPS` and `SET_STAFF_ALLOCATION` alongside scouting. A test caught
the alternative: you set reps, and the dashboard kept telling you the team
hadn't practised until you advanced the week.

**The inbox is news, not bookkeeping.** It was showing nine consecutive "Prep
Points Added" rows — the simulation talking to itself in front of the player.
Sixteen system event types are filtered out, weekly recaps have their own panel,
and a result only appears if it involves a future opponent or a top-15 team
losing to somebody outside the top 40.

## Your scheme anchors the week

A team is not a menu. `planAlignment(call, identity, side)` scales execution by
how far the week's call sits from what the program actually runs, so an Air Raid
roster asked to grind it out is running something it has never repped.

The magnitude is deliberately small — **a full deviation costs about 3 points of
execution** — and that is the whole design. The emphasis matchup matrix is
calibrated over 400 games a cell and a full counter is worth roughly 2.7 points
of scoring, so a bigger penalty would make exploiting a scouted weakness never
pay and kill the matchup game. A first attempt at `ALIGNMENT_COST = 0.3` did
exactly that and broke the counter test.

The larger disincentive was always there and is not a penalty: an Air Raid
roster has a strong `passOffense` and a weak `rushOffense`, so running the ball
is bad because your run game is bad. Alignment is only the extra "they haven't
practised it" cost on top.

## Gate business happens at home

Ticket price and marketing are inert on the road, so both controls lock with a
reason and the spend is neither charged nor delivered. A live control that
cannot do anything is worse than no control.

## Development is a real choice now

`SPOTLIGHT_INTENSITY` is `{ PLAYER: 1.6, POSITION: 0.28 }`. It used to be 1.0
against 0.55, which meant twelve players at 0.55 was 6.6x the output of one at
1.0 — the individual option was never worth taking, and the position spotlight
was not even exposed in the UI. Concentrated work now builds a star, which is
what the gate and the recruiting trail run on; a room lifts everybody a little.

The screen offers three ways in: the three curated suggestions (most improvable,
biggest brand, closest to breaking down), any position room, or a searchable
list of the whole roster sorted by remaining headroom.

## Direction: the game is a decision engine

The reference is a business simulation where nearly every screen is a decision
with a posted price and a posted payoff. Three patterns carry it, and new
systems should be built to match:

- **Salaried specialists with visible modifiers.** An executive costs a stated
  weekly salary and posts exactly what he changes — maintenance −15%, deal boost
  +10%, competitiveness +15 % — with a replace button beside him. A hire is
  never a guess.
- **Multi-week projects with named stages.** A legal case shows its stages at
  100%, 74%, and 0%, an overall percentage, and a settlement price that climbs
  as the deadline nears. Long work is visible, partial, and costly to abandon.
- **Finite staff capacity.** `Employees: 15, Available: 0`. Attention runs out,
  which is what forces a choice instead of a checklist. Built — the staff screen
  reads `Hours: 32 · Available: 0` and every coach's week is split by hand.

The player should always be spending something scarce on a plan, then finding
out whether the plan was right.

`docs/GAMEPLAN_AND_PREPARATION.md` applies this to weekly football preparation:
playbook installation as a staged project, play concepts as incremental
unlocks, tiered opponent scouting, offensive and defensive emphasis calls
(run/pass balance, back-by-committee, feeding the hot receiver, stopping the run
or the pass, hunting turnovers), prep-point capacity, and coordinators who can
be delegated the call.

Stages one and two are **done**: unit-level resolution with the emphasis calls,
then preparation capacity and opponent scouting. See the two sections below.
Playbook installation, play concepts, and coordinator delegation remain.

## Unit resolution and the emphasis layer

`packages/simulation/src/game.ts` resolves games drive by drive against four
ratings — `rushOffense`, `passOffense`, `rushDefense`, `passDefense` — each
built from the position groups that produce it. Scores, box scores, and the
plan report are all outputs of the same play loop, so they cannot disagree.

Calibrated per team-game against real FBS rates:

| | sim | real |
|---|---|---|
| plays / yards | 70 / 404 | 70 / 390 |
| pass attempts, completion %, yards | 33.2 / 64.8% / 238 | 31 / 63% / 235 |
| rush attempts / yards | 36.5 / 165 | 36 / 155 |
| touchdowns / field goals | 3.3 / 1.1 | 3.5 / 1.2 |
| interceptions / sacks | 0.9 / 2.2 | 0.8 / 2.2 |
| drive: plays / yards / TD rate | 5.9 / 34 / 28% | 5.9 / 32.5 / 29% |

Three mechanisms carry that calibration, and none is a fudge factor:

- **Fourth down is a decision.** Offenses kick in range, gamble on short
  yardage, and otherwise punt. Letting them snap all four downs stretched drives
  to eight plays.
- **Drive rhythm.** Each first down makes the next play slightly easier. Real
  punting drives gain about ten yards while scoring drives gain seventy; without
  a compounding term every drive drifts to the same mid-field stall.
- **Individual quality inside the unit.** A ball carrier's or receiver's
  deviation from his own room's baseline shifts the play. Without it a committee
  cost nothing and always beat featuring a star.

Every emphasis is a trade, measured over 400-game samples per cell:

| offense \ defense | STOP_THE_RUN | BALANCED | STOP_THE_PASS |
|---|---|---|---|
| RUN_HEAVY | 25.2 | 26.8 | 26.7 |
| BALANCED | 25.5 | 26.4 | 25.3 |
| PASS_HEAVY | 27.2 | 26.8 | 24.5 |

`TAKEAWAY_HUNT` wins the ball 1.7x as often and concedes yards for it.
`HEAVY_BLITZ` gets 3.6 sacks a game against 1.3 for `COVERAGE_FIRST`, and gives
up more explosive plays. `FEATURE_BACK` gives the lead back 68% of carries and
three times the fatigue of a committee. `FEED_THE_STAR` moves the top receiver
from 31% to 48% of targets and raises interceptions by half. `HURRY_UP` adds
possessions **for both teams**, so it helps the better offense and burns the
thinner roster.

Two deviations are known and deliberate rather than tuned away:

- **Punts run near 5.7 against a real 4.2.** There is no game clock, so drives
  that would expire at the half become punts instead.
- **Margins stay fat-tailed** — roughly 24% one-score games against a real 35%.
  Unit ratings are deliberately sensitive, which is what makes a game plan
  matter, and the league mixes power and low-tier programs inside divisions in a
  way real conferences do not.

## The scouting department

Scouting used to be a tier bought out of the same pool that paid for practice
reps, against this week's opponent only. Two things were wrong with that. A
program could not act on the fact that week six is the game that matters, and
the squeeze was one pool against itself rather than a decision about people.

It is a department now, with three inputs and one output.

- **Funding**, `facilities.SCOUTING`, tiers 1–5. Both a floor and a multiplier:
  a shoestring department produces 6 points a week, a national one 41, before
  any coach has given it an hour.
- **Coaching hours.** `StaffAllocation` replaced `StaffAssignment` entirely. A
  coach has 4–10 hours a week by rating and splits them across `PREPARE`,
  `SCOUT`, `RECRUIT`, `DEVELOP`, `RECOVER`, each with a role fit — a coordinator
  is 1.4 at preparing and 0.35 if he is a strength coach trying to scout.
  `staffContribution(state, programId, focus)` replaced every `assignment ===`
  filter in the engine, so a coach who gives a job a third of his week
  contributes a third of his worth to it.
- **Points allocated forward.** Output goes onto a named future opponent and
  stays there. A file opens `TENDENCIES` at 6, `PERSONNEL` at 18, `GAME_PLAN` at
  36, and is spent the moment its fixture is played.

Measured weekly output and what a season buys:

| tier | department | weekly | season | full files |
|---|---|---|---|---|
| LOW | 1 | 9 | 126 | 3 of 12 |
| MID | 2 | 16 | 224 | 6 of 12 |
| POWER | 3 | 24 | 336 | 9 of 12 |

**The board prices the schedule.** `opponentValue` returns 0–100 from the
opponent's rank normalised to league size, plus a bonus for playing above
yourself. On one generated schedule: the top-ranked opponent scores 100, #5
scores 76, #15 scores 27, #22 scores 6. Scouting everybody is never available,
so the question is always which games are worth knowing about.

**The squeeze is people, not points.** Preparation buys reps; the department
buys files; the two compete for the same coaching hours. Sending the offensive
coordinator's whole week to scouting drops the offensive install band from
40–61% to 34–57% and hands the job to the head coach — measured in the browser,
not asserted.

**Information is worth games.** Half a 24-program league scouting every opponent
completely against the other half scouting nobody, over 960 team-games:

| | margin | win rate | points |
|---|---|---|---|
| complete file | +2.65 | 54.0% | 28.1 |
| no file | −2.65 | 46.0% | 25.9 |

That is roughly what home field is worth, which is the right order of magnitude
for a system the player pays for every week.

**Rivals compete on it.** `projectedGamePlan` now gates the opponent's ratings
and identity behind the *planning* program's own file, so an unscouted rival
plans blind — previously every AI read exact opposing unit ratings for free,
which made scouting a system only the player paid for. Rivals also move
coordinator hours toward scouting when a fixture worth ≥60 is within two weeks,
and bank leftover output onto the largest prize still on their schedule.

**This Week and Game Plan are one screen.** Both dealt with the same seven days,
so half a decision lived on each. `WeekHub` has five tabs — Decisions, Scouting,
Install, Playbook, Last week — and the tab bar is the intermediate step: pick
the part of the week to work on, then see only its controls. The staff screen
reads `Hours: 32 · Available: 0` with a slider per focus per coach.

## Preparation and opponent scouting (superseded by the department above)

Three things had to be true before scouting could sell anything.

**Rivals needed identities.** Measured before the change, the league ran
`BALANCED` 91%, `COMMITTEE` 100%, `SPREAD_IT` 100%, `NORMAL` tempo 100% — every
program played the same way, and the one axis that varied (`pressure`) flipped
58% of weeks. A tendency report on that league says nothing. Programs now carry
a `schemeIdentity` assigned at creation, and `intendedGamePlan` starts from it.
After: run/pass runs 55/24/22, tempo 38/38/25, and `pressure` churns 4% of weeks
instead of 58%. Defensive priority reads the *opponent's identity* first and
personnel second, which is what makes a tendencies report actionable.

**The projection was giving it away.** `projectGamePlan` returned the opponent's
exact unit ratings for free, which is precisely the `PERSONNEL` tier. It also
folded in their *stored* plan — last week's — while the game was played with
this week's, so week 1 showed every opponent as fully balanced while they
actually called something else. The opponent side is now filled in only from a
bought report, from the scouted range rather than the true rating, and never
assumes a specific call.

**Scouting had to resolve before the plan.** A report read after the game cannot
inform the game plan. `prepareWeek` resolves scouting immediately, ahead of
`advanceWeek`; preparation is seeded in `beginSeason` and refreshed at the end of
each `advanceWeek`, so it is already available when the player is asked to plan.

| Tier | File points | Reveals |
|---|---|---|
| (free) | 0 | Record, ranking, reputation |
| `TENDENCIES` | 6 | Their scheme identity |
| `PERSONNEL` | 18 | The four unit ratings as ranges, plus their best players |
| `GAME_PLAN` | 36 | Likelihoods for each of their calls this week |

Precision comes from staff, facilities, and **film**, which is what gives the
opening week its own shape. Week 1 has no film and runs about 49% confidence
with ranges roughly ten points wide; by week 6 that is about 76% and the ranges
tighten. The top tier reports probabilities that never reach certainty, so a
bought report is a read rather than a lookup.

`intendedGamePlan` is deliberately shared by the rival planner and the scouting
report, so a bought report describes the plan that is actually run rather than a
parallel guess that could drift away from it.

## Installing the game plan

The game plan used to be pure selection: pick a preset, and the outcome came
entirely from roster ratings. There was no way to make *this week's* version of
a plan better than last week's. It is now built during the week.

The screen that explains this is written for somebody who has never played a
management game: three numbered sentences, a band with both ends named
("Nothing works" / "average team" / "Flawless"), the before-and-after range on
one line, and the cost of the reps posted beside the slider. A control whose
units are unstated is a control nobody touches.

Two inputs decide **execution** — how much of the plan survives to Saturday:

- **Who installs it.** The coordinator does it, but only while assigned to
  `GAME_PREP`; move him and the head coach covers at 82% of his rating. That is
  what finally makes the staff-assignment decision worth caring about.
- **Practice reps**, 0-12 a side, bought with the same weekly attention that pays
  for scouting. Diminishing returns, and they tire the roster.

Execution is a **band**, not a number, and better coaching narrows it as well as
raising it. Measured against a par opponent over 500 games a cell:

| install | margin | win rate |
|---|---|---|
| none, 40-61% | −0.7 | 47.2% |
| par, 50-60% | +0.4 | 49.4% |
| 6 reps, 58-79% | +3.4 | 52.4% |
| 12 reps, 66-87% | +5.7 | 56.4% |

A *committed* plan gains more from a full install (+6.5) than a balanced one,
because emphasis deltas scale by execution too — committing to a scheme is worse
than balance when you cannot install it and better when you can.

**Execution is competence, not only emphasis.** The first build scaled emphasis
deltas alone, and the neutral plan's deltas are all zero — so installing a
balanced plan was pure fatigue for no gain, and a full-install season finished
*worse* than an unprepared one. `EXECUTION_COMPETENCE_WEIGHT` adds a flat term
against a 0.55 baseline: a drilled team busts fewer assignments whatever it has
called, and an unprepared one is worse than its ratings.

Installing both sides fully costs 24 of a ~25-point pool. Since the scouting
department moved onto its own output, the squeeze is no longer prep-versus-
scouting inside one pool — it is **coaching hours**. A coordinator only installs
his side for the share of his week he actually spends preparing the team, and
below half a week the head coach covers at 82%. Sending him scouting is what
costs the plan.

### Staff cards

Coordinators used to contribute `rating x 1.4 / 100` — about 1.1 rating points —
and nothing else. Each post now states what it changes ("installs the offensive
plan at 51% before reps", "week-to-week swing ±10%") and offers three
replacements with a rating, a salary, and a signing cost.

`staffSalary()` is shared by league creation and the hiring market. Incumbent
salaries used to be drawn at random and uncorrelated with rating, so the market
routinely offered coaches who were both better *and* cheaper — replacing was a
free lunch. Pricing both from one formula makes an upgrade cost what it is
worth: +12 rating on a head coach runs about +$540k a year plus $395k to sign.

## A coach is a tendency, not a number

Hiring was a sort: the highest rating you could afford was always right. Every
coach now carries a `trait` that says what his hours are *worth*, job by job — a
tactician's PREPARE hour is 1.3, a closer's 0.85, and the closer gets 1.4 on the
recruiting trail. The grinder has no spike at all and works two extra hours a
week. Neither dominates: maxing one job wants a specialist, covering four wants
the grinder. Traits are drawn from role-weighted pools, so a strength coach who
is a film rat never turns up.

`staffContribution` multiplies by the aptitude, so the trait reaches the
scouting department, the recruiting trail, the weight room, and the install band
rather than living on a card. `planInstaller` applies the PREPARE aptitude too:
a 76-rated tactician coordinator installs about 8 points more of the plan than a
76-rated closer, worth roughly 1.5 points of margin a game.

**The takeover screen picks every post.** It used to show the incumbent behind a
"Replace" button. All four posts now list who is in the chair alongside everybody
who would take it — six candidates, four reachable and two held back by the
program's pull — each with his tendency, his salary, his buyout, the scheme he
coaches, and one number per job. The market is keyed on the *post* rather than
the person, so hiring somebody no longer re-rolls the list: a player who works
down it can still go back to the coach he passed on.

**Skill bars are normalised against the post, not the league.** Rendering the raw
`rating x roleFit x aptitude` pegged every coordinator at 99 on game prep — the
role weight there is 1.4, so the one bar that decides the hire carried no
information. `focusWeight` stays raw for anything the engine posts per hour;
`focusSkill` divides by the post's own best weight, which is what makes the six
candidates in a chair actually comparable.

## The recap is a box score

`boxScore(state, gameId)` returns both teams as the tables a newspaper prints —
passing, rushing, receiving, defense, kicking, punting — each sorted best first
and closed with a TEAM line, plus a head-to-head team-stats panel. Columns the
engine does not model (longest play, solo tackles, fumbles) are left out rather
than filled with a plausible-looking zero.

Grouping lives in the engine rather than the UI because the totals are
assertions: a test checks the passing table's team line equals the yardage the
drive loop produced, that receiving reconciles with passing, and that touchdowns
and field goals still add up to the number on the scoreboard.

**The postgame flow is now the first screen after a played game.** Completing
`Advance week` opens `This Week → Last Saturday` automatically with the full
box score first and the game-plan report below it. The dashboard reopens the
latest box score, and every played fixture on the schedule has its own
`View box score` action. `boxScore()` can rebuild a completed game from its
structured `GAME_COMPLETED` event after that fixture leaves the active schedule,
so the Week 14 rollover cannot erase the postgame screen.

There is one authoritative box-score component. The older recap-only player
lines were removed because they duplicated the same statistics with different
totals and unexplained abbreviations. Every table column now states its unit or
count in full: yards, yards per attempt/carry/reception, points, percentages,
touchdowns, interceptions, sacks, tackles, targets, or attempts. The postgame
business recap likewise labels fans, press points, attendance, seat capacity,
money, and the 0–99 player game-rating scale.

## The weekly decision loop

Advancing a week is meant to be a ritual rather than a button. Five decisions
sit in front of it, all reachable from the "This Week" screen:

1. **Ticket price** — the gate
2. **Advertising** — the fan base
3. **Development focus** — one of three curated players
4. **Offensive strategy** — a named preset
5. **Defensive strategy** — a named preset

**All five persist.** Re-entering them every week would be roughly two hundred
identical decisions a career, so each carries over and `weeklyDecisions()`
returns the current value plus an `attention` string only when something has
gone stale — attendance projected down on last time, a stadium bigger than the
following, nobody being developed, an unscouted opponent, a run-first opponent
against a defense not committed to stopping it.

**Presets, not seven toggles.** `OFFENSIVE_PRESETS` and `DEFENSIVE_PRESETS` set
every underlying emphasis axis at once, and `matchingPreset()` names the current
plan or reports "Custom". The individual toggles still live on the Game Plan
screen — a preset is a shortcut through the same decision space, not a
replacement for it. The default plan deliberately matches a named preset on both
sides so a new game never opens on "Custom".

### The gate

Ticket revenue used to be `attendance * 44` with the price hard-coded. It is now
a demand curve around `fairTicketPrice()`, which rises with prestige, fan
support, ranking, and the draw of the opponent. Measured over a season for the
same mid-tier program:

| policy | season gate | fans | fan support | budget |
|---|---|---|---|---|
| 0.55x fair | $8.35M | 75,475 | 80 | +$13.9M |
| fair | **$13.85M** | 75,475 | 80 | **+$19.0M** |
| 1.6x fair | $9.77M | 66,061 | 7 | +$12.5M |

Two things make that a real decision rather than a solved one. The demand floor
is only 6% of capacity — a generous floor let a program gouge past the demand
curve and back into profit, which made maximum price strictly optimal. And
over-pricing costs *followers*, not merely a satisfaction number, which then
lowers what the program can charge later.

The same two decisions land differently by career path, which falls out of the
capacity clamp rather than being authored: Dynasty Builder opens with 27k fans
against a 36k stadium and has a volume problem, while Championship Mandate is
sold out regardless and has only a pricing lever.

Advertising is deliberately **not** weekly arbitrage. Reach scales with the
square root of spend, and a maximum spend costs more in the week than it returns
at the gate — the return is the followers it compounds into.

### Sponsorships turn fame into money

The first sponsorship slice closes one part of the inert-fame finding. Every
program receives three frozen, season-long offers:

| contract | guarantee | upside |
|---|---:|---|
| Guaranteed partner | 100% of sponsor market value every week | none |
| Game-day partner | 65% every week | 135% whenever a home crowd fills at least 90% of the stadium |
| Performance partner | 45% every week | 75% for every win, plus 90% for a top-25 win |

Sponsor market value is a named function of what the program has already built:
`fanBase × $1.25 + nationalPress × $900 + prestige × $400 + championships ×
$15,000`, rounded to $5,000 a week. These are balance hypotheses, but the shape
is load-bearing: fans, recognition, institutional standing, and titles all
become economically useful without buying a football rating.

`projectSponsorshipOffer()` posts the exact remaining guarantee, every bonus
still available, and the mathematical maximum before the player signs.
`sponsorshipPayment()` owns the trigger logic used by the weekly finances, so
the card and the cash cannot drift into parallel implementations.

One primary sponsor may be signed per season and cannot be replaced until the
rollover. Offers refresh after the new schedule is built. Rivals sign from the
same market and choose by program character: front-runners back the crowd,
bluebloods and talent magnets back winning, and diehards/developers protect the
guaranteed floor.

### Weekly stories make the numbers memorable

`weeklyStories()` turns each completed week into a deterministic editorial
package without adding prose to engine events or changing save data. The UI
writes the sentences from structured facts already emitted by the simulation.

Every issue leads with the player's program and changes its angle for a ranked
upset, marquee breakthrough, blowout, one-score finish, close ranked loss, or
bye. It then selects one consequential national result, one real box-score
standout, and—only when earned—one program-business story for a sponsorship
bonus, packed house, fan surge, or unusually profitable week.

The package is deliberately capped at four stories. It is a summary, not a
second inbox, and every claim can be traced to a `WEEKLY_RECAP`,
`GAME_COMPLETED`, `PLAYER_BRAND_UPDATED`, or `SPONSORSHIP_PAYMENT` event.

### Development candidates

`developmentCandidates()` returns three players for three different reasons:
the most improvable (`RISING`), the biggest brand (`STAR`), and the closest to
breaking down (`AT_RISK`). The point is a trade rather than a ranking — build
the future, feed the brand that pays the gate, or protect an asset that cannot
be replaced.

## Where the game goes next — the attention economy and system fit

This is the plan, not a wish list. It comes out of a long design pass, and every
claim below was measured against the engine rather than reasoned about. It
supersedes the open items in "Installing the game plan" and "The scouting
department", both of which it partly demolishes.

The whole thing exists to answer one player question that the game currently
cannot: **what am I spending this week, and what does it buy me?**

### The measured case that three systems are broken

**Practice is free.** The prep pool is 25 a week; maxing both sides costs 24.
A full season at 12/12 reps against a full season at 0/0:

| | avg roster fatigue after 12 weeks | costs |
|---|---|---|
| never practise | 0.5 | −0.02 overall |
| max both sides, every week | 17.5 | −0.88 overall |

Maxing costs 0.88 overall across a whole season and buys +26 points of install,
worth about +5.7 margin a game. There is no decision on that screen. Worse, the
0.88 is invisible — fatigue is never shown, so the game charges a tax nobody can
see.

**Scouting's payoff asks the player to abandon their identity.** The reward is
information, and information only pays if you change your call to counter them.
But a team is not a menu — an Air Raid roster asked to grind it out is running
something it has never repped, which is why `ALIGNMENT_COST` exists. The system's
reward was designed out from under it. No amount of rewriting the card fixes
that.

**Rosters had no shape, so nothing could measure fit — FIXED in slice 1.**
Measured before the fix at league
creation, 24 programs:

| tier | roster avg | QB1 | WR1 / WR2 / WR3 / WR4 | worst starting OL |
|---|---|---|---|---|
| LOW | 68.1 | 71 | 72 / 72 / 71 / 70 | 71 |
| MID | 75.0 | 79 | 79 / 78 / 77 / 76 | 78 |
| POWER | 83.1 | 86 | 87 / 86 / 85 / 84 | 85 |

**A two-point spread from WR1 to WR4 at every tier.** Any personnel-requirement
system built on top of this is measuring noise. This is the same defect papered
over in `rosterSchemeFit` by spreading scores comparatively on screen; that was a
display hack over a generation problem. The centred room generator now produces
a 5.5–5.9 point average WR1-to-WR4 gap while preserving tier roster averages at
68.0 / 75.0 / 83.0. Front-runner rosters are intentionally top-heavy, talent
magnets lean toward premium skill rooms, diehards lean toward the trenches, and
developers inherit more depth and headroom.

**The lineup could not express the schemes — FIXED in slice 1.**
`schemePersonnel()` now controls the active rotation: an Air Raid uses four
receivers, Power Run uses two tight ends, Nickel Pressure uses five defensive
backs, and 4–3 Base uses three linebackers. The setup screen posts each grouping
before the player chooses.

### The architecture

**One faucet: staff hours.** `StaffAllocation` already does this — coaches split
their week across jobs. The mistake was building a *second* layer on top:
hours generate prep points and scouting points, which are spent again. Two
currencies for one decision. Delete the second layer and the architecture is the
game.

```
staff hours ──┬─→ practice        → this Saturday
              ├─→ scouting        → a chosen future Saturday
              ├─→ development     → permanently, slowly
              ├─→ recruiting      → next year
              └─→ training room   → protects the other four
```

Three pay now, two pay later. That is the tension, and it is the one every good
management game runs on. **Departments are multipliers, not new currencies** —
money buys efficiency, attention is spent. Keeping those two economies separate
is what makes either legible.

**Coaches are hours, stated concretely.** Not "68 at game plan" but "delivers 70
prep-hours a week". Hours are self-explanatory and additive: *my staff delivers
190 prep-hours, a full offensive install costs 120*. That is arithmetic a player
can do in their head.

The one rule that makes it a puzzle rather than a sort: **good coaches must be
spiky, not uniformly better.** A $1.4M closer and a $1.4M teacher are different
programs. Cheap coaches are flat and low, which is why they are cheap. The trait
system already does this; the spread needs widening and the unit renaming.

**Strength coach leaves the puzzle.** He is money in, health out — fatigue
recovery and injury weeks, no sliders. That cuts the weekly screen from four
allocation decisions to three, and gives money something to buy that attention
cannot.

**Built in the strength-coach slice.** The strength coach now has no allocation
sliders and contributes nothing to preparation, scouting, recruiting, or
general player development. Salary automatically buys four named outcomes:
percentage faster strength-rating gains, fatigue points recovered per player per
week, percentage lower injury risk per player-game, and a percentage chance to
remove one additional injury week. The engine rejects allocation commands for
the post and ignores stale allocations from older saves.

**Built in the player-health slice.** Every player now carries either no injury
or a named diagnosis with minor, moderate, or major severity and a real recovery
timeline. Only players who took game snaps are exposed. Position, snaps,
durability, fatigue, and a strength-development spotlight determine the
unprotected risk; the strength coach's posted reduction is then applied to that
exact roll. A one-week injury now actually costs one game: existing injuries
recover after Saturday, while new injuries are diagnosed afterward. Recovery
events name the injury, and an extra week removed by the strength coach is its
own visible event. The roster and depth chart show the diagnosis and games
remaining, and the next healthy depth-chart player is promoted automatically.
Every playoff round uses that same sequence: only players who record postseason
snaps can be injured, and a diagnosis carries into the next round. Diagnoses own
their recovery ranges, so a torn ACL, torn labrum, and broken collarbone do not
share an interchangeable generic "major injury" timeline. For the current MVP,
all remaining injuries clear at season rollover; offseason injury carryover is
explicitly deferred.

**The completed health rules.** Minor/moderate/season-ending outcomes target
roughly 78% / 19% / 3% of diagnosed injuries. A season-ending injury is a
first-class flag: it never ticks down, never receives accelerated recovery, and
means unavailable for every remaining game in the current season. It still
clears at rollover — no injury ever enters the next season. Postseason wording
therefore says "out for the remainder of the season", never that a player will
miss next year.

Diagnosis pools are position-aware and include concussions. Conditioning work
lowers this week's risk by 15%; strength work raises it by 15%; Durability,
fatigue, actual snaps, position, and the strength coach remain inputs to the
exact posted percentage. The roster shows Durability and normal-workload risk
before and after the coach. Injury events store the actual promoted player and
the before/after unit rating, so the dashboard and weekly story can state the
football cost rather than merely saying "out".

Every program owns one hidden, replacement-level walk-on quarterback (45 LOW /
50 MID / 55 POWER, before small attribute shape). He enters the real rotation
only when every scholarship quarterback is injured or redshirting, appears in
the depth chart and box score, costs no scholarship/recruiting slot, cannot be
developed or injured, and leaves the active rotation as soon as a scholarship
quarterback returns. This is a simulation safety valve, not roster depth the
player can exploit.

**Only a coordinator's prep hours install his own side.** The head coach's are
general team quality and cover at a discount. That is what keeps "who runs my
offense" a different question from "who works the trail".

### Systems: personnel and install, paying in football outcomes

A system must not add "+4 pass offense". It must change things a player can name
on a box score: completion rate, yards per play, sack rate, interception rate,
fumble rate.

**Personnel fit is the shape of your roster, not its quality.** Each scheme
states what it asks for, attribute by attribute, and fit is how far above or
below you are. Falling short hurts linearly; exceeding gives diminishing returns
— you cannot be more Air Raid than Air Raid. Measured against the roster's own
average, so a 60-overall team whose best players are its QB and receivers is a
high-fit Air Raid team, and a 90-overall team with a great line and a mediocre QB
is not.

That normalisation is load-bearing. Without it, fit is a second overall rating
and good teams fit everything.

**Traits are derived, not stored.** Adding ~25 ratings per player is
unjustifiable against a save file that is already an iOS blocker at 17 MB of
state and 94 MB of stats. "Route running" *is* technique. "Pass blocking" *is*
technique weighted with strength. "Decision making" *is* awareness. Compute the
named traits from the five existing ratings plus a **profile bias drawn
deterministically from the seed and player id** — that bias is what makes two
78-rated quarterbacks different, and it costs one `rng.at()` call and zero bytes.

The accepted loss: accuracy and decision-making cannot vary fully independently,
and extreme archetypes are rarer. Acceptable. Add a stored `speed` only if
testing shows same-overall players still feel interchangeable.

**Install is durable, not a weekly buff.** One number per side, 0–100, filled by
practice hours, and it does **not** decay from neglect — otherwise maintenance
becomes another solved chore. It falls only when the football language changes:
switch systems and keep about half. **A coordinator leaving does not erase the
playbook**; the players, the head coach, and the terminology stay.

### The balance anchors

Points per game is the anchor. The per-outcome percentages are knobs used to
reach it.

| fit state | expected scoring effect |
|---|---|
| functional fit vs average | +0.3 to +0.7 |
| strong fit | +0.7 to +1.2 |
| excellent fit | +1.0 to +1.5 |
| theoretical perfect fit and install | about +1.8 |
| poor fit | −2 to −4 |

The asymmetry is deliberate. A good system makes a team efficient; a bad one
makes it dysfunctional. **Avoiding a serious mistake is worth more than finding
the perfect offense.**

Guard rails, both of which protect work that is already calibrated:

- **Tactics beat scheme.** A full emphasis counter is worth ~2.7 points, measured
  over 400 games a cell. A strong system advantage must stay **≤ 50%** of that,
  and a perfect one ≤ 70%. A well-fitted Air Raid should still be counterable.
- **No system-versus-system matrix.** Systems are unilateral; tactics are
  bilateral. Air Raid against nickel will feel different from Air Raid against
  bend-don't-break, but that difference must *emerge* from shared outcome
  channels rather than a second hidden table. A direct matrix would duplicate the
  emphasis matrix and make it impossible to say which layer caused a result.
- **Modify primitive outcomes only.** Completion, yards, conversions and
  touchdowns are causally connected. Move completion and yards per play; do not
  then also hand out a touchdown bonus. Double-counting is how these systems
  become superpowers.
- **Floor the downside.** Penalties compound with talent, and the premise of the
  game is that you start at a bad program. Cap total downside from all sources.

### The MVP cut

This is a mobile game by a small team. The design above is about three times an
MVP. What ships:

| ships | why |
|---|---|
| Scheme-driven personnel groupings — `STARTER_COUNTS` per scheme | One table, and it does half the work (below) |
| Roster generation with real room spread and character skew | Nothing measures anything without it |
| Derived traits from the five existing ratings + seed profile bias | Zero new stored fields |
| **One** `install: 0–100` per side, durable | Not three stages |
| 16 practice hours a week, 8-hour cap per side | The squeeze, and it is two constants |
| Fit as weighted role deficits, `deficit^1.25 × importance` | With exactly **one** hard cap: the quarterback |
| Fit and install move completion %, yards per play, sack, INT, fumble | Primitives only |
| Injury rate 0.06 → ~0.25 per team-game | Known defect; depth is meaningless without it |
| Fit cached outside the save, invalidated on roster/depth/system change | Mandatory at 72 programs |
| Prospect fit as a three-state range: letter grade → numeric range → exact | The evaluation types already exist |
| Empty coaching chairs at takeover | Below |

| cut or deferred | why |
|---|---|
| Three install stages (base / situations / counters) | Six numbers, a progression UI, and stage-specific outcome ownership. One number does 80% of it. |
| Continuity / returning snaps as a third axis | Needs per-player snap tracking and mostly repeats what fit already says |
| Defensive front-caller and coverage-caller roles | An entire parallel mechanism. MVP: room-weighted like offense, one hard cap on the lead LB or DB. |
| Multi-column install retention tables | Dies with the stages. Switch systems, keep half. |
| A role-reassignment layer (outside / slot / flex) | The depth chart already orders players; an injured one drops out and the next steps in |
| Six-input rival system-choice model | Two inputs — roster fit and coordinator preference — offseason only. That already hits the 15–20% mismatch target. |
| Any new stored player attribute | Ship on the five that exist |

**The idea that cuts the most work: let the scheme decide who is on the field.**

| | WR | TE | RB | | DB | LB | DL |
|---|---|---|---|---|---|---|---|
| Air Raid | **4** | 1 | 1 | Nickel Pressure | **5** | 2 | 4 |
| Power Run | 2 | **2** | 2 | 4–3 Base | 4 | **3** | 4 |

If the Air Raid fields four receivers, WR4's rating already enters `passOffense`
through the existing unit math — **depth starts mattering without a fit formula
at all.** The explicit fit score then only has to carry the attribute-shape part.
It is also the most legible thing on the screen, because a personnel grouping is
how football actually talks about scheme.

### Empty chairs at takeover

The player hires all four posts. No incumbent, no buyout — you are filling
vacancies, so the constraint is **annual payroll against your opening budget**,
which is a far better first decision than "is this man better than the one
already here". Leaving a chair empty must be legal and its cost stated; the
engine already models "Nobody" installing at 38. The prestige ceiling stays —
that is what turns prestige into a goal.

Acquisition is cost + prestige + an **X factor**: a coach with a reason to come
— alma mater, home state, something to prove — who is better than your pull
should allow and cheaper than his market. It is the anti-frustration valve for a
low-tier program and it is where the game's stories come from. It must be
**earned, not rolled**: tie the chance to in-state recruiting, a winning season,
or donor culture, or it reads as a slot machine.

### Two things that will break, and should

**The distribution suite will go red.** Changing starter counts and roster depth
moves every calibrated per-game rate — 238 passing yards, 64.8% completion, 165
rushing. Those failures are correct and need re-baselining. Budget a day of
measurement, not a bug hunt.

**This rides on the performance work.** A tuning matrix at 72 programs is not
runnable at 6.4 seconds a week. Tune at 24 programs, ship, re-verify at 72 once
indexing lands. The fit cache should be built *with* the indexing work item 9
already calls for, not as another consumer of full-state scans.

### The gate had an unbounded gouging regime

`ticketDemandMultiplier` clamped demand at a floor of `0.15`. Once a program
reached that floor attendance stopped falling, revenue became a flat crowd times
a rising price, and the $200 cap was strictly optimal. Measured over 72
programs, **gouging beat fair pricing at 3 of them, by 26% at one.**

The old test sampled one program per tier and happened to miss all three, which
is the more useful lesson: a design invariant that holds "for a LOW, a MID and a
POWER program" is not tested. It asserts every program now.

Fixed by replacing the linear-to-a-floor curve with exponential decay above fair
price, plus an elasticity floor — a diehard base at 0.35 put its revenue peak
past the cap by a different route. Measured after:

| | before | after |
|---|---|---|
| programs where gouging wins | 3 of 72 | **0 of 72** |
| weekly optimum, as a multiple of fair | unbounded | **0.86x–1.24x** |

So a front-runner should price under fair and a diehard can price over it, and
nobody should ever max it out. Per-game rates were unaffected: 69.9 plays, 65.4%
completion, 247 passing, 168 rushing, 27.5 points.

### Slice 1 corrections — the rooms were still flat

The first pass at room shape under-delivered, and the test certified it anyway.
Measured after slice 1 shipped:

| tier | WR1→WR4 | target | starting lineup | should be | worst starting OL | target |
|---|---|---|---|---|---|---|
| LOW | 5.2 | 16–22 | 73.6 | 68.1 | 71 | 52–59 |
| MID | 4.8 | 13–17 | 80.3 | 75.0 | 79 | 62–68 |
| POWER | 3.6 | 10–14 | 87.9 | 83.1 | 87 | 70–75 |

Three compounding causes, all in `initialPlayerOverall`:

1. **The gradient was linear across the whole room.** `centredRank` spanned all
   twelve receivers, so a slope of 1.55 spent its entire budget on the
   developmental tail and WR1→WR4 got only three slots of it — about 4.7 points
   by construction. `roomSlotDrop` is piecewise now: steep through the two-deep,
   shallow after, which is the only way to buy a real starter gap without putting
   the twelfth man at 40.
2. **Noise drowned the signal.** Individual noise was σ≈1.65 against a
   per-slot gradient of 1.55, so adjacent ranks were near-random and most of the
   measured spread was order statistics of the draw rather than authored depth.
   Noise is σ≈1.05 now, clearly under one slot, with enough left that a room is
   not perfectly ordered.
3. **Centring on the room mean inflated every lineup.** Starters are the top of a
   room, so holding the mean while steepening the gradient lifts everyone who
   plays — about five points at every tier, which drags the calibrated per-game
   rates with it. The room's top is anchored to its **starters** instead, via the
   scheme's own personnel grouping.

A fourth, smaller: the offensive line had the *flattest* slope in the table
(0.9, the lowest value), so the one room where a weak link is supposed to be
fatal had no weak link. Every room is near 1.0 now and tier sets the decay.

Measured after the corrections:

| tier | WR1→WR4 | starting lineup | roster mean | worst starting OL |
|---|---|---|---|---|
| LOW | 19.4 | 67.9 | 54.5 | 58 |
| MID | 14.9 | 74.8 | 64.2 | 67 |
| POWER | 10.3 | 83.1 | 75.4 | 79 |

Every band on target, lineup averages back within 0.2 of their pre-slice-1
values, and the per-game rates hold: 70.0 plays, 65.1% completion, 245 passing,
171 rushing, 27.8 points.

**The real mistake was the test.** It asserted `median(gaps) >= 4` — a floor
barely above the two-point defect it existed to catch. It now asserts the design
bands per tier, that shaping rooms does not re-tier the league (the invariant the
lineup inflation broke), that a weak-link lineman exists, and that depth is a
tier advantage. A threshold that only proves something changed is not a test.

**One more under-powered test.** "Information is worth games" pooled three
leagues, where the win rate carries about two points of sampling noise — the same
order as the effect. The same engine measured 50.3% at three leagues and 52.4% at
six. It pools six now. The department itself is healthy: blind programs call
`BALANCED` every week because they cannot read an opponent, while scouted
programs split 328 / 281 / 255 across the three calls.

### The attention economy, phase one — one pool, and scouting that pays

Two complaints from a playtest, both correct: the practice sliders had no stated
purpose, and scouting still cashed out as a prompt to change your call. Both were
untouched work — the plan below was written and only slice 1 had been built.

**Practice is coaching hours, not a second currency.** `preparationWeeklyPoints`
was `12 + facility + staffContribution/22`: a pool derived from hours and then
spent again, two currencies for one decision. It is now literally the hours the
staff put into `PREPARE`, lightly scaled by the weight room, with a hard weekly
ceiling of 15.

| | before | after |
|---|---|---|
| weekly pool | 26 | 15 hours |
| a full install on one side | 12 | 8 |
| cost to max both sides | 24 of 26 — free | **16 of 15 — impossible** |
| fatigue for a maximum week | 5.3 | 8.8, against ~2.4 recovery |

So the screen finally holds a decision: drill one side hard, or split. And the
hours come out of the coaches' week, so **sending a coordinator scouting costs
Saturday** — that is the link that makes the staff screen matter.

The 15-hour ceiling is deliberate rather than a fudge. A week only holds so much
practice, real football caps it too, and it is what keeps a full install on both
sides out of reach *however good the staff is*. A strong staff is rewarded
through the quality of each rep in `planInstaller`, not by escaping the choice.

**A file makes your own team better; it does not ask you to change what you
run.** The department's payoff was information alone, and information only cashes
if you counter them — which is the one thing `planAlignment` exists to
discourage. The reward had been designed out from under the system.

`scoutingReadiness(points)` returns a flat bonus to all four units in that
game, on a square-root curve so the first points matter most and no tier is a
cliff:

| file | readiness |
|---|---|
| none | 0 — your guys go in cold |
| 6 pts (tendencies) | +1.2 |
| 18 pts (personnel) | +2.1 |
| 36 pts (complete) | **+3.0** |

Anchored on the two numbers the engine already lives by: home field is 2.8 and a
full emphasis counter about 2.7 points of scoring. A complete file is worth about
a home game, and never more than the tactical layer it must not replace. The
information still arrives — it is what tells you where to spend practice hours —
but it is no longer the thing you are paying for.

Guarded by three tests: that a full install on both sides always outruns the
hours available, that moving a coordinator to scouting costs practice hours, that
readiness is monotone with diminishing returns and buys nothing past a complete
file, and that a season with a complete file every week beats the same season
with none.

### Eleven on the field, and a rotation behind them

The lineup used to field a flat set of starters totalling **twelve** on offense
(QB 1 + OL 5 + RB 2 + WR 3 + TE 1) against eleven on defense. But the naive fix —
exactly eleven men, each on for every play — is not a football team either. From a
real snap-count sheet (Chiefs, 61 offensive and 65 defensive snaps):

```
OL   5 men at 100%, one backup at 3%
QB   1 man at 100%
WR   93 / 80 / 72 / 10 / 5 / 2      → 2.6 on the field, six men used
TE   84 / 41 / 8                    → 1.3 on the field
RB   51 / 38 / 13                   → 1.0 on the field, a true committee
DL   85 / 78 / 68 / 58 / 46 / 40 / 14 / 5  → 3.9, eight men for four spots
LB   100 / 83 / 35 / 8              → 2.3
DB   100 / 100 / 98 / 98 / 60 / 23  → 4.8
```

Both sides total eleven. Roughly twenty men take snaps. So the model is **spots on
the field plus a snap share per man**, and unit ratings are snap-weighted: a man
on for 40% of plays counts 40% toward the unit he plays in.

`rotation.ts` replaces the starter table. `OFFENSIVE_SPOTS` and `DEFENSIVE_SPOTS`
both sum to eleven, and `snapShares(position, spots, available)` distributes those
spots down the depth chart by an exponential whose spread is position-specific —
read straight off the sheet above. The rooms where fatigue actually bites rotate
hardest.

The **clamp at 100% is what reproduces real football without authoring it**: give
the offensive line five spots and a tight spread and the top five saturate with
the sixth picking up the remainder, exactly as a real sheet reads. Measured
against the reference:

| room | sim | Chiefs |
|---|---|---|
| OL | 100/100/100/100/97/3 | 100/100/100/100/100/3 |
| RB | 44/28/18/11 | 51/38/13 |
| DL | 90/68/51/39/30/22 | 85/78/68/58/46/40/14/5 |
| men taking snaps | 42 | ~46 incl. special teams |

`MINIMUM_SNAP_SHARE` is 2% — the reference bottoms out there, and without a floor
a fringe player picked up a box-score line for a fraction of a snap.

**This is what makes the fit score honest.** An Air Raid now dresses four
receivers and *no tight end*, so the fit requirements can never tell a player to
recruit a tight end for an offense that does not use one. That mistake would have
been baked into recruiting for the rest of the game's life.

Known drift to re-tune: snap-weighting favours the top of each room, so per-game
rates came out slightly hot — 70.6 plays, 65.5% completion, 253 passing, 174
rushing, **28.6 points against a real ~27**. The distribution tolerances accept
it, but it is about 6% high and should be pulled back with the outcome-modifier
work rather than by a blind constant.

### Step 2 shipped — one pool, one screen

`weekAllocation` aggregates the staff into hours per job and `SET_WEEK_HOURS`
puts a target on one job for the whole staff, taking what it needs from the
others. The per-coach split still exists underneath — it is what makes a trait
and a role matter — but the decision is one number per job against one total.

| | before | after |
|---|---|---|
| where hours were set | Staff screen, ~20 sliders | one screen, four sliders |
| what they became | prep points *and* scouting points, spent again elsewhere | the job itself |
| screens for a week | This week / Scouting / Practice / Game plan / Last Saturday | Your week / Scouting board / Business / Last Saturday |

Measured on a 28-hour staff, moving hours between jobs:

```
start          PREPARE 18  SCOUT 5   RECRUIT 5   DEVELOP 0   practice 15
SCOUT   → 12   PREPARE 13  SCOUT 12  RECRUIT 3   DEVELOP 0   practice 12
DEVELOP →  8   PREPARE  9  SCOUT  9  RECRUIT 2   DEVELOP 8   practice  9
RECRUIT → 10   PREPARE  6  SCOUT  6  RECRUIT 10  DEVELOP 6   practice  6
```

The pool stays whole at every step. **An hour that vanishes is an hour the player
believes he spent**, which is why the distribution rebalances the other jobs in
proportion rather than shedding hours, and why a test asserts `spent ===
totalHours` after every move.

Two defects found by building the screen rather than by reading the code:

- **The slider was dead.** Clamping it to spare hours meant it could never grow
  once the week was fully assigned — which is always, since hours never bank.
  Raising a job has to *take* from the others, which is the whole point.
- **The practice budget went stale.** `preparation.points` only refreshed at the
  week boundary, so the pool read ten practice hours while the practice panel
  still said fifteen. It is recomputed when the pool moves now, and reps already
  bought beyond the new budget are trimmed — you cannot keep reps you can no
  longer afford.

**The weekly tactical call is gone.** `schemeGamePlan()` derives every emphasis
axis from the scheme, `SET_SCHEME` writes the plan, and `SET_GAME_PLAN` is
refused with a reason. `weeklyDecisions` no longer offers offensive and defensive
strategy; what replaced them is what the file on this week's opponent is worth.
The emphasis matchup matrix in `game.ts` is left **intact and unused** rather than
deleted, because it is calibrated over 400 games a cell and restoring it — on
defense only, informed by a file — has to stay a config change.

A test that was quietly passing on nothing: the execution-value test passed
`SET_PRACTICE_REPS` to `advanceWeek`, where reps land *after* the game resolves,
so it measured 1.3 against 1.3. It prepares the week first now.

### Still open: scheme identity is only half visible in the box score

Measured over a full season with rooms shaped and personnel groupings live, pass
rate by scheme identity:

| scheme | pass rate | `RUN_PASS_BALANCE` asks for |
|---|---|---|
| POWER_RUN | 41% | 38% |
| TRIPLE_OPTION | 44% | 38% |
| SPREAD_TEMPO | 47% | 62% |
| AIR_RAID | 49% | 62% |

The spread is real but compressed into 41–49% against a designed 38–62%, so a
Power Run program is harder to tell from an Air Raid one than it should be. The
cause is **situational logic inside the drive loop** — third-and-long throws
regardless of identity — which pulls every program back toward an even split.
Realistic in isolation, but it mutes the one signal a player actually reads.

Worth noting what it is *not*: `intendedGamePlan` abandons `RUN_HEAVY` or
`PASS_HEAVY` whenever a unit is more than 6 points behind, which looks like the
culprit and measures as a no-op — raising the threshold to −14 changed the table
above by nothing at all. Fix this in slice 3 alongside the outcome modifiers,
where play selection is already being touched.

### Sequencing — four slices, each playable

1. ~~**Generation and personnel groupings.**~~ **Done.** No fit math was added.
   Rosters have centred room strength and real depth curves; each scheme now
   controls the Saturday personnel grouping. The distribution suite was
   re-baselined by pooling the matchup counter test across independent leagues.
2. **Derived traits, the fit score, prospect fit ranges.** Read-only — it
   diagnoses, it does not change results. Ships the whole recruiting and
   depth-chart payoff on its own.
3. **Fit and install into outcome modifiers, plus the 16-hour attention
   economy.** The only slice that needs the tuning matrix.
4. **Injuries up, rivals participate, caching.**

Slices 1 and 2 deliver most of the engagement without touching game resolution,
which is the right shape for a small team: find out whether the fit screen is fun
before gambling on the balance work.

### The tuning matrix

Balance values are hypotheses, and these especially. Run as a committed
distribution test, not a one-off:

```
personnel fit   45, 55, 65, 75, 85, 95
install         25, 50, 75, 100
weekly alignment 40, 70, 100
opponent        weak, equal, strong
```

Measure completion rate, yards per play, third-down conversion, red-zone TD rate,
explosive plays, sacks, interceptions, fumbles, points, win rate. Accept the band
where a strong fit clearly outperforms a misfit in passing metrics, turnover
swings are meaningful but not chaotic, and **scheme influences close matchups
without overcoming a real talent gap.**

Two assertions that must hold or the whole thing has failed:

- Two equally rated quarterbacks with different profile biases produce visibly
  different Air Raid fit and different production.
- A strong system advantage never exceeds half a full tactical counter.

## The player model: five attributes per position, and Overall is derived

This supersedes the "derived traits" item in the MVP cut. The direction changed
after a playtest: rather than deriving named traits from five *universal*
ratings, each position gets its own five, and **Overall stops being stored**.

### Overall is a weighted average, not a number that grows on its own

The defect this fixes: `developPlayers` moved the five sub-ratings by ~0.2 each
*and separately* grew `overall` from its own formula
(`base + workEthic x weight + noise`, scaled by fatigue and facilities). The only
link between the two was one fudge factor — `directGrowthWeight`, 0.72 for
conditioning, 0.9 for balanced, 1.0 otherwise. So **what you chose to develop had
almost no effect on Overall**, which is exactly why the development screen felt
inert.

`overall` becomes a pure function of the five attributes and the position's
weights. Then "development improves Overall" is true by construction, and the
screen can post an honest number:

```
8 hours on Accuracy → +2.4 Accuracy → +0.7 Overall
```

`potential` becomes a ceiling per attribute rather than a ceiling on one scalar.

### Five per position, named in football

Storage is unchanged — five numbers per player, as today. Only the *meaning* is
position-specific, so this costs nothing against a save file that is already an
iOS blocker.

| QB | weight |
|---|---|
| Accuracy | 0.30 |
| Decision making | 0.28 |
| Arm talent | 0.18 |
| Mobility | 0.14 |
| Durability | 0.10 |

Every position gets its own table: a lineman is Pass Block / Run Block / Strength
/ Agility / Durability, a receiver is Route Running / Hands / Separation / Speed /
Durability.

**Scheme fit falls out of this for free**, which was going to be the most
expensive part of the fit work. Overall is fixed, but *which attributes matter on
Saturday* depends on the scheme: an Air Raid leans on Accuracy and Decision
making, a Triple Option on Mobility, a Power Run barely cares about the
quarterback at all. So a 78 Overall quarterback is a good Air Raid starter and a
poor option quarterback without any separate fit formula.

Attributes are shown on the **depth chart**, because that is the screen where you
decide who plays.

Position changes are not supported. College rosters in a management sim do not
need them, and Option A has no other loose ends.

## The weekly loop: one pool, one screen

The complaint that produced this: "why wouldn't every player just increase reps
to the maximum every game? We need the total pool built."

Correct, and the reason is structural. Practice hours come from `PREPARE`
allocation only, so they can *only* buy practice — and hours do not bank. So
spending all of them is always right, and the only decision left is the split.
Worse, the allocation itself happens on a different screen (Staff, ~20 sliders),
so the four jobs never visibly compete.

**One screen, one pool, four ways to spend it:**

```
Your staff has 34 hours this week · 0 unassigned

Practice — offense        8 hrs → 60–83% installed
Practice — defense        4 hrs → 47–66% installed
Scout Lake Erie (wk 6)   10 hrs → +2.1 to every unit that game
Develop Hernandez (Pass Block)  8 hrs → +2.4 Pass Block, +0.8 Overall
Recruiting                4 hrs → +12 on the trail
```

Now maxing practice *means* not scouting and not developing, and it is visible in
one place. That is the answer to "why not max reps": because those hours were
building your left tackle.

### The weekly tactical call is cut on both sides

`runPassBalance`, `backfieldUsage`, `targetDistribution`, `tempo`,
`defensivePriority`, `defensivePosture` and `pressure` stop being weekly player
choices and become fixed properties of the scheme. An Air Raid program is never
offered "Ground and pound" again.

**On the record, because this deletes an asset:** the emphasis matchup matrix is
calibrated over 400 games a cell and a full counter is worth ~2.7 points of
scoring — currently the single biggest way a weaker team beats a better one
through decisions rather than talent. Allocating scouting hours is the replacement
decision. If the weekly loop ends up feeling thin, the matrix is the thing to
bring back, on defense only, informed by the file. **Keep the matrix code intact
and unused rather than deleting it**, so restoring it is a config change.

## Scouting is a collaboration, not a file

`scoutingReadiness` currently returns one flat number for all four units. It
becomes four, and **you choose the split**. Each part of the opponent you study
improves one specific thing for your own team:

| you study | you get better at |
|---|---|
| their pass defense | passing — completion %, quarterback yardage |
| their run defense | running — yards per carry, short yardage |
| their passing offense | pass defense — completions allowed, sacks |
| their running offense | run defense — yards allowed |

So 60% of your hours on their pass defense reads as *"+8% quarterback yardage
against Lake Erie."*

Three reasons this is better than a flat bonus:

- It is an allocation with a **shape**, not just an amount.
- **It reinforces identity instead of fighting it.** An Air Raid program naturally
  studies the pass defense standing in front of what it already does. The player
  is never asked to become a different offense.
- There is a real judgment call: their pass defense is elite and their run defense
  is soft — do you spend to crack the strength, or not bother because you are
  already winning there?

**Scouting only ever boosts your own team.** Never "we made them worse" — same
arithmetic, much easier to read, and it keeps the payoff on the side the player
controls. Diminishing returns inside each bucket, so dumping everything into one
is not four times as good.

## Recruiting: an offer, a price, and a percentage

Recruiting currently asks the player to hold four search types, six evaluation
types, pursuit points, recruiting points and a hype-versus-potential distinction —
and all of it pays off a year later, so it never lands.

It becomes one row per recruit:

```
Marcus Webb · QB · Overall 71–79
Natural Air Raid arm. Real questions about his decisions.
Wants ~$2.4M · you're 2 prestige short → $4.1M · 34% to sign
```

### Money substitutes for prestige, and that fixes the economy

This is bigger than recruiting. Finding 3 — money has faucets and no drains, and
programs net $34.9M a season by 2032 with nothing to spend it on — is closed by
making recruiting **the** money sink. And it is the right kind of sink: money buys
*access to players*, who still have to be developed and coached. It never buys a
win directly.

It is also the anti-frustration valve. A low-prestige program can outbid a
blueblood for a player the blueblood would have signed cheaply.

His price scales with the gap between what he expects and what you are, as a
**curve rather than authored tiers**, so every program sees a sensible number and
being above his standard earns a discount. Prices are set as a fraction of tier
revenue rather than as authored dollar figures — LOW opens with a $1.5M budget
against POWER's $20M, so a $5M quarterback is a third of a powerhouse's annual
revenue and triple a low-tier program's entire opening budget. That asymmetry is
correct; the numbers only work once anchored to what a program actually earns.

### Criteria are eligibility; the percentage is odds

If matching the criteria guaranteed the signature, recruiting would be a
checklist — *can I afford him, yes or no* — with no tension. Criteria decide
whether you may **bid**; the percentage is your odds **given everyone else
bidding**, or it is a lie. Offers resolve together, so nobody wins by clicking
first — the order-independent market invariant already requires this.

### Money alone would flatten it

If only cash and prestige mattered, recruiting is "who is richer" and program
character stops meaning anything. His asking price also comes down for things the
player controls that are not money, all of which already exist in the engine:

- **playing time** — is the room thin, or is there a returning starter?
- **scheme fit** — an Air Raid arm wants an Air Raid
- **home state** — `homeRegionBias`
- **a Closer head coach** — the trait already exists

### What scouting a recruit buys

Narrowing an attribute range is only information, which is the same defect just
fixed on the game-plan side. So scouting a recruit also **reveals what he wants**
— unscouted, you do not know his asking price or his criteria, so you cannot make
a sensible offer at all. The first points are the ones that matter.

And the range must be able to **move, not merely narrow**. If it always converges
symmetrically on the truth there are no busts and no gems. It is built on the
existing `hype`-versus-`potential` decoupling rather than a fresh mechanism, so
scouting more can reveal that he is worse than the consensus believed.

Screen space: the **Overall range is the headline** on the list, the five
attribute ranges live on the detail card only, and the percentage moves live as
the money slider moves — that is the part that is actually fun.

Settled: offers resolve **immediately** rather than at a signing day, because the
offseason phase does not exist yet. Money is **per year and charged weekly**,
which is what finally creates insolvency pressure.

## The week is five cards, not a pool of hours

The one-pool week screen shipped and was rejected on sight: *"I don't even
understand it and I'm so confused by it."* That was not a copy problem, and it
was not a balance problem.

**Hours are what the engine spends. They are not a decision anybody can hold.**
Four sliders over a 24-hour pool is roughly two thousand valid weeks. Nobody
explores two thousand of anything fourteen times a season, so a player finds one
arrangement that does not look broken and never touches it again. Four things
were wrong at once, and none of them are numbers:

| test a weekly decision has to pass | the pool screen |
|---|---|
| Does the cost have a name? | "8 hours." Hours of what? Nobody's hours. |
| Does the prize have a name? | "60–83% installed." A stat, not a prize. |
| Is there a moment of truth? | No. Saturday never mentioned the choice. |
| Could you tell a friend what you did? | "I moved sliders to 8/4/10/2." No. |

### Everything runs anyway; you name what gets the surge

`WeekFocus` is one of five: `INSTALL_OFFENSE`, `INSTALL_DEFENSE`, `SCOUT`,
`DEVELOP`, `RECRUIT`. Each is a card that states **who runs it**, **what happens
if you leave it alone**, **what happens if you pick it**, and **why it might
matter this week** (0–100 stakes with the reason in words).

Nothing ever goes to zero from neglect — there is no maintenance chore and no
punishment for not reading a screen. A test asserts that across every
combination of priorities, all four underlying jobs still receive hours.

**How many you get to pick is the progression bar.** `focusCapacity` reads a
weighted staff rating (head coach 0.45, coordinators 0.30 / 0.25, an empty chair
zero) against thresholds of 70 and 80:

| tier | staff power | priorities a week |
|---|---|---|
| LOW | 67–72 | 1, and 4 of 10 already reach 2 |
| MID | 74–79 | 2 |
| POWER | 83–87 | 3 |

A low-tier program chasing one thing a week *is* what being a bad program feels
like, and hiring is what buys the second and third. This is the number that
finally makes a hire visible on the screen the player opens most.

### One decision, not four in different units

Hours, practice reps, and scouting points were three places the same decision
lived, in three units, none of which agreed with each other. All three are now
derived, and the commands that set them independently are **refused with a
reason** rather than silently overwritten at the week boundary:

```
SET_WEEK_HOURS         → "Hours follow from the week's priorities."
SET_STAFF_ALLOCATION   → "…set the week's priorities instead."
SET_PRACTICE_REPS      → "Make a side of the ball a priority to drill it."
```

`planWeekHours(state, programId, focuses)` is the whole architecture in one
function. Measured on a 26-hour mid-tier staff:

```
(none)                     PREP 7  SCOUT 6  REC 8  DEV 5   reps 4/3
INSTALL_OFFENSE            PREP 12 SCOUT 4  REC 6  DEV 4   reps 8/3
INSTALL_OFFENSE + SCOUT    PREP 12 SCOUT 9  REC 3  DEV 2   reps 8/3
INSTALL_OFFENSE + DEFENSE  PREP 18 SCOUT 3  REC 3  DEV 2   reps 6/6
SCOUT + RECRUIT            PREP 7  SCOUT 8  REC 8  DEV 3   reps 4/3
```

**Coordinators own Saturday; the head coach owns everything else.** A coordinator
owes his own side of the ball a third of his week whatever the staff is chasing,
and his whole week when you make it a priority. That floor is deliberately just
above `planInstaller`'s handover threshold (dropped from 0.5 to 0.34 for exactly
this reason) — without it, focusing anywhere else dropped a side of the ball onto
a head coach who was not preparing either, which is a cliff rather than a trade.
A test asserts every coordinator in a 24-program league stays above it under
every combination of priorities.

### Two constants set by measurement, not by feel

**`PRACTICE_PER_COACHING_HOUR = 0.55`.** Passing raw PREPARE hours into the
practice budget put the whole league at ~0.78 expected execution — the top of the
band the install table was calibrated against ("12 reps, 66–87%") — and a league
where every plan holds up amplifies unit-rating gaps. One-score games fell from
27% to 19.4%. At 0.55 the league sits mid-band:

| | raw hours | at 0.55 |
|---|---|---|
| league average offensive execution | 0.784 | 0.729 |
| one-score games (pooled, 576 games) | 19.4% | 21.4% |

That is still below the ~24% this engine used to measure, and honestly so: before
this work nobody in a headless run set reps at all, so every program was equally
unprepared. Execution now varies *between* programs, which is correct — a better
staff should win more — and it compounds the existing tier gap. Worth watching.

**`UNFOCUSED_REPS_CAP = 3`.** A side nobody made a priority gets a walkthrough,
not half a week. Without the cap a focused offense still left four reps for the
defense and committing bought almost nothing.

### The film room is a target, not an allocation

`ALLOCATE_SCOUTING` asked the player to type a number every week — bookkeeping,
not a decision. The decision is **which game**. `SET_SCOUTING_TARGET` names an
opponent and the department's whole weekly output files itself there, refunding
what it filed before so moving the target moves the work rather than duplicating
it. A test re-chooses the same target five times and asserts the file does not
grow.

That concentration broke the old thresholds — a whole week landing on one file
completed it — so the tiers were re-priced, and **readiness was split from
intel**, which should never have shared a number:

| | before | after |
|---|---|---|
| `TENDENCIES` / `PERSONNEL` / `GAME_PLAN` | 6 / 18 / 36 | 20 / 45 / 75 |
| readiness saturates at | `GAME_PLAN` | `READINESS_CAP = 55` |

Readiness is what a file is worth to your own team and it saturates fast; the
intel tiers are what it tells you and they keep paying. Tying them together meant
re-pricing one to fix the other, which is how tendencies ended up free for all 72
programs the moment the department started filing automatically.

**Nothing is readable off tape that does not exist.** Tiers are gated on
`filmGames > 0`, so week one is unreadable at any price — while the file still
pays in readiness from the first point. Without this the opening Saturday arrived
with every program's tendencies already known, which is precisely what week one
is supposed not to be.

### Recruiting hours had to start mattering

`recruitingWeeklyPoints` was `32 + facilities × 4 + contribution / 20`. The base
dominated so completely that quadrupling the staff on the trail moved the week by
five points, so the recruiting card could not state a real trade. Re-weighted to
`14 + facilities × 3 + contribution / 4.2`: the league-wide weekly average is
unchanged, but it now responds to whether anybody is actually on the road.

### Saturday names Monday

`WEEK_FOCUS_PAYOFF` is emitted after every week with what the priorities actually
bought — execution on both sides, the readiness the file delivered, the Overall
the developed player gained, the points added on the trail. The postgame screen
opens with it.

A player repeats behaviour they were thanked for. The week screen was previously
never mentioned again after it was used, which is a large part of why it read as
optional homework rather than as the decision it is.

### Standing, not weekly

Priorities carry over. A player with nothing to change advances the week with one
button — nobody plays season twelve if the week costs real attention every time.
The dashboard briefing is what makes that safe: it flags an unclaimed priority,
and it flags when a card worth ≥65 is not being chased while every slot is full,
with the reason and both outcomes in the detail line.

Rivals plan on the same five priorities against the same capacity, so a thin
rival staff also only chases one thing.

### Still open here

- **Competitiveness.** 21.4% one-score games against a real 35%, down from ~24%.
  The distribution test's floor of 20% now has only 1.4 points of headroom and
  per-league variance is ±3.5 points on 144 games — it is under-powered and should
  pool six leagues rather than four.
- **The stakes numbers are hypotheses.** They are read off the same projections
  the cards post, so they cannot disagree with the engine, but the coefficients
  that turn "27 points of headroom" into "83" have not been tuned against play.
- **Development still needs its popup** (build order step 4). Making it a
  priority now sets the spotlight on the man with the most headroom so the card
  is honest, but *which attribute* to grow is still not a choice the player makes.

### Two dead systems the cards exposed

Building the develop card meant asking what it would actually buy, and the answer
was nothing. Both defects had been shipped for a while and neither was visible
without measuring the payoff a screen claims.

**The individual development spotlight had never once applied.**

```ts
if (spotlight.target.type === "PLAYER") return 1;   // compared nothing
```

Any individual spotlight returned intensity 1 — for the spotlighted player and
for everybody else alike. `SPOTLIGHT_INTENSITY.PLAYER` was deliberately raised
from 1.0 to 1.6 to make concentrated work worth taking, and that constant had
been dead the whole time.

**The balance file was not connected to the game.** `createFictionalLeague`
inlined its own `balanceConfiguration` instead of reading `DEFAULT_BALANCE` from
content, and the two had drifted:

| | content | what every league actually ran |
|---|---|---|
| `weeklyDevelopment.base` | 0.012 | 0.012 |
| after re-tuning content | 0.034 | **still 0.012** |

So tuning the balance file changed nothing at all. It reads from content now.

Together those two put development at *0.05 Overall of difference across a full
season* between a program that spent every week on it and one that never touched
it. Measured over 12 weeks on a player with 28 points of headroom:

| | target's Overall gain | whole roster |
|---|---|---|
| before | 0.49 vs 0.44 | 0.77 vs 0.70 |
| after | **2.74 vs 1.29** | **1.81 vs 1.37** |

Rates were re-scaled to land an ordinary player near 1.5 Overall a season and a
concentrated one near 3–4, which is roughly the 70-to-85 arc a real developing
college player follows over four years. `coachingModifier` went from
`1 + contribution/500` to `/150` so the priority itself is worth something.

## Saving a dynasty: measured, not assumed

There was no persistence at all — state lived in the worker and died on refresh —
so the save format was designed from scratch. Measured on a real two-season
league at the full 72 programs, 81,297 stat rows:

| | size |
|---|---|
| raw JSON, which is what the engine holds | 73.38 MB |
| gzip alone | 4.19 MB |
| season aggregation, then gzip | 3.06 MB |
| columnar typed arrays on top, then gzip | 3.00 MB |
| trimming the event log too | **2.94 MB** |

**Two findings, both against the intuition.**

**Compression does nearly all the work, and it is free.** `CompressionStream` is
a web platform API: no dependency, no bundle cost, and it streams so the payload
never exists twice. One call, seventeen times smaller.

**Columnar encoding is not worth building.** Packing the stat table into typed
arrays with dictionary-encoded string columns took the *uncompressed* payload
from 25.3 MB to 22.0 MB — and after gzip that was 3.06 against 3.00. **A 2% win
for a hand-rolled binary format, a manifest, and a decoder that can silently
corrupt a career.** gzip already removes exactly the repetition columnar layout
targets. Prototyped, measured, deliberately not shipped.

Brotli reaches 2.27 MB and zstd 2.37 MB, but browsers expose only gzip and
deflate for *compression* — either would mean shipping a WASM codec to save half
a megabyte.

Compression level was picked by measurement too, because it is a pause the
player feels on every week:

| level | size | compress | decompress |
|---|---|---|---|
| 1 | 3.67 MB | 109 ms | 119 ms |
| 6 (default) | 2.94 MB | 402 ms | 49 ms |
| 9 | 2.82 MB | 1,569 ms | 44 ms |

### Aggregation earns its place on memory, not on size

Folding a finished season's game logs into one `PlayerSeasonStatLine` per player
is worth only 27% of the compressed save. It is worth far more than that
everywhere else: it is the difference between a bounded save and an unbounded
one, and it takes tens of thousands of rows out of the working set that every
league-wide scan walks past. Measured across two seasons at 72 programs:

```
week  season  gameRows  seasonLines  live state    save
   1    2027      3084            0    13.49 MB   1.58 MB
  11    2027     27756            0    31.19 MB   2.08 MB
  16    2028      6100         3123    21.03 MB   2.30 MB   <- rollover folds
  26    2028     30497         3123    37.83 MB   2.80 MB
  31    2029      8712         6203    27.37 MB   3.00 MB   <- and again
```

Extrapolated, a twenty-season dynasty lands near 8 MB rather than the 440 MB the
unfolded game log was heading for. Still linear in seasons; if that ever matters,
the next step is paging completed seasons into a cold archive the record book
loads on demand, so the hot save stops growing at all.

### Storage is OPFS, because `localStorage` cannot hold this

`localStorage` caps around 5 MB, stores *strings* — so a 2.9 MB gzipped save has
to be base64'd to 3.9 MB before it even arrives — and is synchronous on the main
thread. The Origin Private File System stores bytes, negotiates against real disk
quota, and `createSyncAccessHandle()` is synchronous **inside a worker**, which is
exactly where the simulation already runs. Autosave therefore never touches the
render thread.

Verified in a real browser rather than asserted: OPFS available, autosave written
at 1.58 MB after week one, page reloaded, career resumed into the same program,
no page errors.

The engine's determinism invariant is what makes a save trustworthy, and the test
uses it: a loaded career must advance to byte-identical programs against one that
was never saved.

## Somebody at the door, every third week

Four people turn up on weeks 3, 6, 9 and 12; you say yes to exactly one, and it
does not always come off. A wealthy donor with a cheque, a former offensive
player who will work with one room, a local business offering to paper the town
for the next home game, and a defensive great who will spend the week teaching
your secondary to take the ball away.

Three weeks is deliberate. Often enough that a season holds four of them and the
player learns the shape, rare enough that each one is an occasion. It does not
line up with the week screen on purpose — this is something that happens **to**
the program rather than something the staff is spending, which is why it is a
modal rather than another panel.

### The odds are on the card, and they belong to the program

A gamble with hidden odds is a slot machine. Every chance is printed before the
choice and every one is a function of the program rather than a flat roll:
donor culture carries the cheque, prestige and national press bring the legends
back, local press and fan support get the free advertising. A bad program still
meets all four — it just converts fewer, which is the right shape for a game
that starts you somewhere bad.

The four sit on a deliberate risk ladder, because four options at the same odds
are a menu rather than a decision. Measured on a mid-tier program:

| | odds | what it pays |
|---|---|---|
| local business | 74% | $240K of advertising, and only if the next game is home |
| defensive legend | 58% | one Saturday |
| donor | 40–54% | the biggest single number on the table |
| offensive legend | 44% | **the only permanent one** |

The permanent reward carries the longest odds on purpose: a roster that keeps
the points is worth more than a cheque you spend once.

### Every reward is a real engine effect, verified

Nothing here is a number on a card that the simulation ignores — the failure
mode this codebase keeps finding. Measured by forcing each outcome and then
reading what changed:

| | measured |
|---|---|
| donor | budget rises by exactly the amount the card printed |
| offensive legend | +1.2 Overall across a 7-man room, never past a man's ceiling |
| local business | $240K credit banked, spent at the next **home** game and only there |
| defensive legend | takeaways per team-game **1.590 → 1.986** |

That last one is the check worth keeping: the card promises +25% and the drive
loop delivers +24.9%. The multiplier hangs on `TeamSide`, so it belongs to the
side actually taking the ball away rather than to the offense being played.

**Rivals answer the same door.** Without that the four offers are a standing buff
only the human collects and the league drifts apart by a donation and a legend
every three weeks. They take expected value against their own situation, so a
program short of money chases the cheque and a good one with a game to win takes
the defensive week.

**The roll is addressable, so reloading cannot re-roll it.** The path depends
only on season, week, program and option — a replayed career meets the same four
people and gets the same answer, which a test asserts.

## Build order

Each step is playable and each depends on the one before it.

1. **Five position attributes, Overall derived.** Everything else needs it.
2. ~~**The one combined week screen.**~~ **Done, twice.** The shared-hours pool
   shipped and was rejected as unreadable; it is now five priority cards. See
   "The week is five cards, not a pool of hours".
3. **Scouting as a four-way split** paying in named football outcomes. Partly
   superseded: scouting is a *target* now rather than an allocation, and it pays
   in flat readiness. The four-way split would make that allocation a shape as
   well as an amount — still worth doing, but it is no longer the thing standing
   between the player and understanding the week.
4. **Development popup**, wired so the box score reflects the attribute that grew.
5. **Recruiting** — offer, price, percentage, ranges.

## Suggested order of work

1. ~~RNG finalizer plus a distribution test~~ — done.
2. ~~Re-tune stat bands against the fixed RNG; reconcile score to box score~~ — done.
3. ~~Unit-level ratings, drive resolution, and the emphasis calls~~ — done.
4. ~~Prep capacity and opponent scouting~~ — done.
5. ~~Plan installation, coordinator cards, and an execution band~~ — done.
   Playbook identity as a staged multi-week project, play concepts, and
   coordinator delegation remain — see `docs/GAMEPLAN_AND_PREPARATION.md`.
6. ~~Ticket pricing and advertising~~ — done; see "The weekly decision loop".
   Sponsorship is done. Still open from finding 3: media rights, merchandise, recurring
   facility costs, and an insolvency check. `weeklyRevenue` and `weeklyExpenses`
   are still stored constants.
7. ~~The scouting department, staff hour allocation, and one weekly screen~~ —
   done; see "The scouting department". `facilities.SCOUTING` has an upgrade
   cost but no recurring one, which is the same gap as every other facility.
8. **The attention economy and system fit** — see the section above. Slice 1,
   generation and personnel groupings, is done. Next is slice 2: derived traits,
   the read-only fit score, and prospect fit ranges. Outcome modifiers and the
   16-hour week remain slice 3; rivals and caching remain slice 4. Player
   injuries and the strength-coach hedge are done.
9. Add an offseason phase — unblocks marquee scheduling every year, signing day,
   the portal as an input, coach hiring, and expectations/firing.
10. Performance and save size before any iOS work. **Save size is done** — see
    "Saving a dynasty" above; a two-season career is 3.0 MB and a twenty-season
    one extrapolates to about 8 MB. **Speed is not.** Profiled at 72 programs,
    a week costs 6.2 s of AI planning plus 3.2 s of simulation, and roughly 75%
    of that is three functions doing full 6,120-player scans inside loops:

    | | |
    |---|---|
    | 45.0% | `prospectValue` — called *inside a sort comparator* |
    | 15.5% | `projectedRecruitingOpenings` — per prospect, per program |
    | 10.5% | the filter inside the AI's `projectedOpenings` |

    None of it is algorithmic; they are missing indices. The fix is a
    players-by-program index built once and threaded through, plus precomputed
    sort keys so a comparator never scans. Every change there is caching or
    ordering and must not move a single RNG draw — the guard is a byte-identical
    replay test.

## The board meets every February

Job security is the only way to lose, and it is arithmetic rather than a roll.
`jobReview(state, programId)` grades one program and is the same call in both
places it matters: the engine runs it at the `BOARD_REVIEW` step, and the
dashboard runs it mid-season, where it reads as "finish on this pace and here is
where you stand". It consumes no RNG, so it can never shift a draw elsewhere.

Three rules, and each one closed a defect found while building:

- **The board grades the target the dashboard already stated.** `expectedWins`
  is shared with `seasonExpectation`, so the number on the header from week one
  is the number graded in February.
- **Security moves in the review and nowhere else.** The +20 for a title and
  +10 for a coach award were deleted from the rollover and folded in as named
  reasons. Two systems moving one number is how a posted projection drifts away
  from what the engine does.
- **Every movement is printed with its own signed delta**, and a test asserts
  the reasons sum exactly to the movement. A verdict with an unexplained number
  in it is a hidden roll wearing a UI.

| reason | delta |
|---|---|
| each win above or below the target | ±7 |
| national championship | +25 |
| reaching the playoff | +10 |
| finishing the year with a negative budget | −20 |
| first season in the job | half of any damage, forgiven |
| a championship mandate running out | **ends the tenure outright** |

Bands are named so they can be shown early: `EXTENDED`, `SECURE`, `WATCHED`,
`HOT_SEAT`, `FINAL_WARNING`, `FIRED`. A coach who has watched "Hot seat" on his
dashboard since October was warned; one who finds out in the offseason was
ambushed, and GAME_DESIGN forbids the second.

**Rivals are judged by the identical rule**, in one pass over all 72 programs,
which is where the coaching market finally gets its churn — a dismissed rival
leaves a real vacancy. Measured at 24 programs over six seasons: dismissals went
from 0 to 5, and the league average holds near 70 instead of ratcheting to 100.

### Four defects the build found, three of them only by playing

The unit tests passed on all four. These came from driving the actual app.

**Patience belongs in the target, not the leash.** Starting LOW security at 92
meant the bottom of the table never churned once in six seasons — a low program
is already forgiven by being asked for only five wins, and starting it near the
ceiling double-counted the same mercy. Baselines are 45 / 55 / 62 now. The
career path still overrides the player's own number, so Dynasty Builder keeps
its long leash without freezing the league.

**A mandate a winning coach survives is not a mandate.** Built first as a −60
penalty, it was measured in the browser against a coach going 12-2, 13-1, 14-1:
he banked about +31 a season and simply absorbed it, and because the clock kept
counting past zero the penalty was charged *again* every following year against
a "−1 seasons left" that means nothing. An expired mandate is a condition now —
it ends the tenure directly and carries no delta, so the printed arithmetic
still sums while the verdict is decided by the condition. The resulting screen
is the best thing in the feature: 25-3, #3 in the country, prestige 92, fired.

**A half-finished season is not a season.** Grading the raw record told an
undefeated 4-0 power program it was on the hot seat, because four wins is six
short of ten — true of the record and false of the season. The review grades the
*pace* while games remain; once they are all played the pace is the record, so
the verdict is unchanged and the projection still cannot drift from it.

**`jobReview` used to take the completed season as an argument.** A caller who
omitted it — which the UI did — got a review missing the playoff and
championship reasons and disagreed with the engine. It looks the season up
itself now, so the footgun does not exist.


## Both sides of the ledger are derived now

`weeklyRevenue` and `weeklyExpenses` were constants stamped on each program at
league creation and never mutated. Measured across 24 programs, the frozen
expense constant was **96–98% of everything a program spent** — payroll, NIL and
advertising together came to 2–4%. So nothing the player built ever cost
anything to sustain while revenue grew with the gate, and that asymmetry is the
whole compounding problem.

`mediaRights(program)` and `operatingCost(program, capacity, revenue)` replace
them. Neither consumes RNG, so the UI can post exactly what the week will
charge.

| | what it is |
|---|---|
| media rights | a conference floor per tier, plus national press, prestige and titles — the first thing outside a sponsorship to turn fame into money |
| squad | scholarships × a weekly figure, charged against the *limit* because a scholarship is a commitment already made |
| facilities | `level^1.7` per facility, so building is a commitment rather than a purchase |
| stadium | year-round overheads per seat |
| operations | **a share of revenue**, not a curve |

**Facilities cost money forever now**, which is the new decision: the upgrade
card posts `Decision cost $3.0M now · Adds to every week $58K forever`.

### Three defects, each found by measuring rather than reading

**The expense side was the broken half.** The finding predicted revenue. It was
wrong: the gate already responded to winning, and the frozen constant was only
23–30% of revenue against 96–98% of costs.

**Nothing may scale with an unbounded quantity.** The first build drove the
department cost off `fanBase`, which has no ceiling — power programs reach
748,000 against an 88,000 stadium. Costs compounded without limit and **55 of 72
programs were insolvent within five seasons**, the runaway running backwards.
Prestige, press and capacity are all bounded; the gate is bounded by capacity.

**Costs must never outrun the revenue the same attributes earn.** The second
build scaled the department superlinearly with prestige and press while media
money rose linearly, so improving the program cost more than it earned. Measured
over one season, mid-tier programs going 11–2 and 9–5 lost **$7.4M and $5.7M**
while nobody who went 3–9 lost more than $3.7M. Winning cost more than losing,
which is worse than the runaway. Scaling operations as a *share of revenue*
cannot punish success by construction, and a test now asserts the margin rises
monotonically with revenue.

Measured after, over one season at 24 programs:

| | before | after |
|---|---|---|
| a losing season (≥9 losses) | roughly break-even | **−$0.6M to −$1.8M** |
| a winning season (≥9 wins) | −$8.5M to +$3.2M | **+$1.3M to +$12.0M** |
| weekly net, LOW / MID / POWER | +$62K / +$299K / +$47K | −$55K / +$213K / +$463K |

### Still open here

**Rivals price by cohort now.** ~~The AI issues sponsorship, booster and
facility commands and nothing else on the business side.~~ Fixed — see "Rivals
price by cohort" below. The claim that this was why 22 of 72 programs drifted
insolvent was **wrong**, and measuring it is what showed that: fixing pricing
moved the count from 22 to 19.

**The top still accumulates.** POWER budgets grow about 2.5x over four seasons.
It is *earned* now rather than automatic — winning pays and losing costs — but
whether that is a problem depends on rivals spending it on NIL, which is the
same open item.


## Rivals price by cohort

Seventy-one programs ran on their creation ticket price for their entire
existence, because the rival planner issued sponsorship, booster and facility
commands and nothing else on the business side — while pricing is measured
above as worth about $5M a season.

**A posture per cohort, not a decision per week.** `fanElasticity` takes exactly
five values, one per program character, so this is five postures across
seventy-two programs: `pricingPosture(elasticity)` returns a standing multiple
of fair value, `selectTicketPrice` issues it in week one only, and no week after
that pays to think about pricing again. One comparison a season per program
instead of a weekly optimisation, which is what makes it affordable at league
size. A test asserts week two produces no pricing commands at all.

| cohort | elasticity | posture | price | as × fair |
|---|---|---|---|---|
| Diehard | 0.35 | 1.180 | $38 → $60 | 1.17× |
| Blueblood | 0.60 | 1.124 | $52 → $69 | 1.13× |
| Developer | 0.80 | 1.079 | $35 → $53 | 1.07× |
| Talent magnet | 1.00 | 1.034 | $35 → $51 | 1.06× |
| Front-runner | 1.60 | 0.900 | $34 → $42 | 0.91× |

**Competent, not optimal.** The band is `0.90–1.18`, deliberately inside the
`0.86x–1.24x` the real optimum spans. A rival that prices perfectly makes the
player's own pricing worth nothing relative to the league, so there is room to
beat them at both ends.

### The insolvency claim was wrong, and measuring it is what showed that

This work was justified on the grounds that unpriced rivals were why 22 of 72
programs drifted insolvent. They were not. Measured after:

| | before pricing | after |
|---|---|---|
| programs insolvent by season 5 | 22 of 72 | **19 of 72** |
| LOW weekly net | −$55K | **−$12K** |
| MID / POWER weekly net | +$213K / +$463K | +$220K / +$576K |

Pricing helps every tier proportionally, which means it helps the biggest gates
most in absolute terms — POWER budgets grew *faster* after the fix, not slower.

The real cause was two things, neither of them pricing — see "What was actually
bankrupting the league" below.


## What was actually bankrupting the league

Two defects, found only by chasing the insolvency count after the pricing fix
failed to move it. Insolvencies over five seasons at 72 programs went **22 → 3**.

**A rival built whatever it could buy.** `selectFacilityUpgrade` asked
`budget >= cost + weeklyExpenses * 2` — the purchase price and nothing else.
That rule was correct until facilities gained upkeep, and then it was a trap:
every upgrade added permanent weekly cost the planner could not see. Proof came
from the fix that failed — raising opening balances **doubled** low-tier facility
spending, from $175K to $350K a season, and brought the collapse forward rather
than pushing it back. Reserves were being converted straight into cost.

A rival now needs one of two things, which is how the decision actually works:
the week pays for it (`lastWeeklyNet - upkeep >= 20K`), or the bank does
(`budget >= cost + upkeep × 400` weeks, about thirty seasons). Requiring income
alone stopped a program holding $100M and no trading history from building
anything at all — an existing test caught exactly that. `lastWeeklyNet` comes
from one backward pass over the capped event log, not a scan per program.

**One constant was doing two jobs.** `$1.5M / $6M / $20M` appeared both in
`createFictionalLeague`, as every program's operating reserve, and in
`CAREER_PATHS`, as the player's difficulty. Neither could be tuned without
moving the other. `OPENING_RESERVE` splits them; the career path still overrides
the player's own balance and is untouched, so a Dynasty Builder still starts on
$1.5M — it is simply now a stated disadvantage against the league rather than
the league-wide default.

The old figure left a low-tier program holding about **a week and a half of
operating cash** against a $1.1M weekly turnover.

| | insolvent by season 5 |
|---|---|
| before | 22 of 72 |
| cohort pricing only | 19 |
| build discipline only | 15 |
| build discipline + reserve | **3** |

Neither half is sufficient alone: on the old float a low-tier program sits at
exactly zero for three straight seasons, where any bad week tips it under.

The slow drift itself is deliberately left in. A program run by nobody in
particular *should* bleed, and that is where the coaching market gets its churn
— it now takes about twenty seasons rather than five, so a program failing is a
story that happens once in a dynasty instead of a third of the league quietly
dying inside one career.

