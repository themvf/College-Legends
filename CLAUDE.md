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
  `staffAssignmentPayoff`, `playerMediaPayoff`) so the UI can explain the
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
between the two teams. Scoring is now decomposed into actual touchdowns and
field goals, and cross-team totals agree.

Still true and still worth deciding on: **individual stats do not affect who
wins.** The score comes from a team-strength average in which the QB is 1/24
plus a small arm bonus; real football puts the QB at 30-40% of team quality. The
larger fix is to drive the score *from* the box score — allocate possessions to
positional units and sum to a score — which makes developing a star QB matter
competitively and turns the stat bands into a validated output instead of an
input. Not attempted yet.

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

- `balanceConfiguration.game.upsetNoise` and `weeklyDevelopment.coachWeight` are
  declared and shipped but never read.
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

## Suggested order of work

1. ~~RNG finalizer plus a distribution test~~ — done.
2. ~~Re-tune stat bands against the fixed RNG; reconcile score to box score~~ — done.
3. Make revenue a function of fame; add recurring costs and an insolvency check.
4. Add an offseason phase — unblocks marquee scheduling every year, signing day,
   the portal as an input, coach hiring, and expectations/firing.
5. Performance and save size before any iOS work.
