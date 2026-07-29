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
commands → recruiting market → recovery → development → games
  → player brands → injuries → recaps/finances → rankings → recruiting points
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

### 3. Money and fame loops do not exist

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

### 4. Career paths and job security are UI-only

`championshipDeadline` is displayed but never read by the simulation.
`coachSecurity` is set at start and only ever increases (+10 coach award, +20
title). There is no expectation, evaluation, or firing. GAME_DESIGN says firing
risk must never be a hidden roll — currently it is not a roll at all.

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
- Injuries land at roughly 0.06 per team-game — far too few to make depth
  matter.
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
price well off fair, and a negative budget.

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

### Development candidates

`developmentCandidates()` returns three players for three different reasons:
the most improvable (`RISING`), the biggest brand (`STAR`), and the closest to
breaking down (`AT_RISK`). The point is a trade rather than a ranking — build
the future, feed the brand that pays the gate, or protect an asset that cannot
be replaced.

## Suggested order of work

1. ~~RNG finalizer plus a distribution test~~ — done.
2. ~~Re-tune stat bands against the fixed RNG; reconcile score to box score~~ — done.
3. ~~Unit-level ratings, drive resolution, and the emphasis calls~~ — done.
4. ~~Prep capacity and opponent scouting~~ — done.
5. ~~Plan installation, coordinator cards, and an execution band~~ — done.
   Playbook identity as a staged multi-week project, play concepts, and
   coordinator delegation remain — see `docs/GAMEPLAN_AND_PREPARATION.md`.
6. ~~Ticket pricing and advertising~~ — done; see "The weekly decision loop".
   Still open from finding 3: media rights, sponsorship, merchandise, recurring
   facility costs, and an insolvency check. `weeklyRevenue` and `weeklyExpenses`
   are still stored constants.
7. ~~The scouting department, staff hour allocation, and one weekly screen~~ —
   done; see "The scouting department". `facilities.SCOUTING` has an upgrade
   cost but no recurring one, which is the same gap as every other facility.
8. Add an offseason phase — unblocks marquee scheduling every year, signing day,
   the portal as an input, coach hiring, and expectations/firing.
9. Performance and save size before any iOS work. A week advance measures 6.9
   seconds in the browser at the full 72-program league; the cost is the
   recruiting market and the AI planner, not game resolution.
