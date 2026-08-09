# The offseason phase — spec

## Status (2026-08, built)

All four slices are built and committed test-first on
`claude/offseason-phase`: the phase with its four ordered steps, the portal
window, buyouts and the coaching checkpoint and training camp, and the AI
offseason planner. 150 tests pass.

**Deviations from the plan, found while building it:**

- **The portal is one bid command, not the recruiting market's four.** The
  spec said to reuse `OFFER_PROSPECT` / `INVEST_RECRUITING_POINTS` /
  `SCHEDULE_VISIT` / a NIL offer. Those four are interesting across fourteen
  weeks *because* they interact over time — an offer opens the door, visits
  compound, money breaks a tie at the end. Compressed into a single-shot
  window they are four sliders with no reason not to max all of them.
  `BID_PORTAL_PLAYER { points, weeklyNil }` is the same decision with the
  ceremony removed, and it keeps the part the spec actually cared about: the
  *scoring* is shared, not duplicated.
- **Retention is a bid on your own player, not a pre-placed offer.** The plan
  had `RETAIN_PLAYER` placed one offseason and applied at the next rollover's
  transfer roll — a season-long standing decision made with no information.
  Instead, a player who enters the portal can be bid on by anyone *including
  the program he is leaving*, which is what really happens, needs no second
  mechanism, and gives the decision full information: you know who left before
  you decide who to fight for. `PORTAL_INCUMBENT_BONUS` (4, against a
  recruit's inertia of 6) prices the existing relationship — deliberately
  smaller, because a man who has already decided to leave is harder to hold
  than one who merely verballed elsewhere.
- **`Recruitable` narrowed one function, not two.** `prospectProgramFit` now
  reads the shared interface and serves both pools unchanged.
  `recruitingScore` did *not* generalize: half its terms (a standing offer,
  accumulated visits, a verbal commitment to defend) have no meaning in a
  one-shot window. `portalBidScore` is a sibling on the same coefficients
  reading the same fit function, which keeps the two honest without forcing
  one function to branch on which pool it is scoring.
- **The web prototype auto-runs the offseason.** No offseason screens exist
  yet, so the worker steps through with the do-nothing defaults rather than
  stranding a player on a phase with no UI. Rivals still plan normally, so the
  league moves around a human who currently cannot act. Marked in the worker
  for replacement — **this is the largest thing still missing**, and until it
  lands the human player is the only program not participating in his own
  offseason.
- **The staff card was posting a number the engine no longer charged.** It
  read "already on staff, no buyout" and priced a hire at the signing cost
  alone. Adding the buyout to the engine without fixing the card would have
  been exactly the "card that disagrees with the engine" failure the
  payoffs-are-visible invariant exists to prevent, so the card posts the
  total and the affordability gate checks it.
- **The AI coaching threshold was set by measurement, not by feel.** At the
  first-guess +8 rating gap a 24-program league changed **41 coaches in two
  seasons** — nearly one per program per year, the "decline caused by drift"
  §15 explicitly rules out. The market re-rolls annually and is generous:
  2.58 posts per program have a +6 upgrade available in any given year. At
  +15, plus a rule that a rival never trades a coordinator who coaches the
  program's scheme for a better-rated one who does not, it measures **0.18
  changes per program per year** — a post turning over about every five
  seasons.

**Measured at 72 programs, one season — this settles Open question 1:**

| | |
|---|---|
| scholarship players | 6,120 |
| portal listings after one season | **281**, or 3.9 per program |
| overall: under 60 / 60–70 / 70–80 / 80+ | 123 / 80 / 56 / **22** |
| asking price: min / median / max | $100 / $300 / $2,550 a week |

So the pool is real — a step's worth of attention, not a trickle — but it is
mostly fringe: **the median transfer is a 61-overall depth piece.** Only 22
players a year across the whole league are the 80+ starters the "portal is
the climb" thesis is about, and at $2,550 a week even those are cheap against
a POWER program's ~$130K donor capacity. Two things follow, both deferred
rather than blind-tuned: the `transferRisk` formula produces too flat a
quality distribution for the portal to be the fast climb §12 describes, and
`portalAskingPrice` is priced far under what scarcity at the top should cost.
Both are balance hypotheses that predate this work; neither is worth moving
until the offseason has screens and the market has a human in it.

**Five seasons, 24 programs, before and after — the defect this phase exists
to fix:**

| | before | after |
|---|---|---|
| players stuck in `PORTAL` forever | **389** | **0** |
| every listing accounted for | — | 389 = 28 signed + 361 unclaimed |
| smallest roster in the league | 18 | 21 |
| coach changes over five seasons | 0 | 21 |

Nobody is stranded any more, and roster minimums moved the right way, since
a transfer can now actually be signed by somebody. But **only 7% of listings
found a home** (28 of 389), which is the quality problem above seen from the
other side: most of what enters the portal is not worth a bid from anyone.
The shrinking-roster problem is *not* caused by this work — it is worse on
the baseline — and traces to rival programs under-recruiting by roughly
seven signees a year against natural attrition. Logged here because the
measurement surfaced it, not because this slice introduced it.

## Why

`rolloverSeason` (`packages/simulation/src/index.ts:4421`) runs entirely
inside the same `advanceWeek` call that finishes week 14: fold the season,
process departures, enroll signees, generate next year's recruiting class,
rebuild the schedule, and reset to week 1 — all synchronous, all before the
player is asked anything. `state.phase` never leaves `REGULAR_SEASON`
(`advanceWeek:1372` throws unless it's exactly that phase; `beginSeason` is
the only place `ROSTER_REVIEW` ever transitions, and it only ever runs once,
at career creation).

Four concrete costs of that, each already on record:

1. **`marqueeGameOptions`** returns `[]` outside `ROSTER_REVIEW`
   (`index.ts:1192`) — the business decision opening night describes is
   playable exactly once in a career.
2. **A redshirted player is excluded from `activeDepthChart` entirely**, so
   the four-game redshirt rule the engine carefully models can only ever be
   exercised in the opening preseason, for the same reason.
3. **The portal is outbound only.** `rolloverSeason:4473` rolls a
   `transferRisk` and moves a player to `PORTAL` — and nothing ever reads
   that status again. `docs/PROGRAM_IDENTITY_AND_ECONOMY.md` §12 measured 160
   players sitting there, unsignable, across two seasons.
4. **`REPLACE_STAFF` has no buyout.** Checked directly: the command
   (`index.ts:2182`) charges `program.budget -= candidate.signingCost` for
   the *incoming* coach and nothing at all for releasing the outgoing one.
   §8's "mid-season firing is expensive in three currencies at once" is
   already a settled decision this command doesn't enforce.

`docs/PROGRAM_IDENTITY_AND_ECONOMY.md` §12/§14/§15 already decided the shape
of the fix — phases of `awards → playoff → portal window → signing day →
coach hiring/firing → NIL renegotiation → concept installation → training
camp → week 1`, portal opening before season 2, mid-season firing costing a
buyout. This spec turns that into a buildable slice.

## Settled decisions this spec inherits

- **Portal opens at the start of the offseason, before season 2** (§15) —
  not gated behind any other system.
- **The buyout fix applies everywhere, not only in the offseason.** §8/§15
  already decided firing is allowed mid-season and costs a buyout; the
  offseason is where it becomes *convenient*, not where it becomes *legal*.
- **No hidden roll, ever.** Every offseason outcome — a bid won or lost, a
  buyout charged, a training-camp result — is a stated formula, matching the
  standard every recruiting slice held itself to.
- **The bad outcome is a new chapter, not a wall.** From the focus-group
  synthesis: an empty coaching chair, a lost bidding war for a portal
  target, a bad training camp all have to be playable outcomes.
- **Order-independent resolution wherever programs contest the same
  target.** The portal market is exactly the recruiting market's own
  invariant applied to a new pool.
- **The concepts/familiarity system (§5–7) is not a prerequisite.** It is a
  parallel, independent track per §14's sequencing diagram. Training camp in
  this slice does not require it to exist.

## Scope

| ships in this slice | why |
|---|---|
| A real `OFFSEASON` phase with four ordered, skippable steps | The gate everything else in this doc sits behind |
| The portal as input — inbound bidding, reusing the recruiting market's own scoring | "The climb" (§12) — the single highest-leverage piece |
| Retention offers on your own at-risk players, in the same step | Cut from `NIL_RECRUITING.md` specifically pending this phase existing |
| A stated buyout cost on `REPLACE_STAFF` | Small, fixes a real gap, finally has a natural home |
| A once-a-season coaching-market checkpoint | Turns an always-on, easy-to-forget command into the moment it's meant to be |
| A minimal training camp: one roster-wide intensity choice | Needs *a* home before concepts exist to make it deep |
| An `AI` offseason planner | Without it, 71 of 72 programs stand still every year |

| deferred, on the record | why |
|---|---|
| Full concept-installation training camp | Needs the concepts system (§14 track [G]), independent work |
| Coach `regionTies` / the full §9 pipeline (program share + coach share) | This engine already shipped the smaller `pipelineStrength` sketch (Slice D of the recruiting redesign); the fuller version is its own initiative |
| Automatic firing tied to `coachSecurity`/`championshipDeadline` | The separate "job security" proposal from the focus group — this spec builds the coaching *market* that proposal needs to exist, not the evaluation logic that pulls the trigger |
| Empty-chair dismissal without an immediate replacement | Real for a takeover (already built); adding it mid-career is a small follow-on, not blocking |
| A multi-week portal saga (players entering over days, news drip) | The engine computes every outbound transfer in one RNG pass today; there's no trickle to dramatize without a bigger change to that step first |

## The phase model

```
GamePhase = "ROSTER_REVIEW" | "REGULAR_SEASON" | "OFFSEASON"
OffseasonStep = "PORTAL" | "SIGNING_DAY" | "COACHING" | "TRAINING_CAMP"
state.offseasonStep: OffseasonStep | null   // null outside OFFSEASON
```

`rolloverSeason` keeps everything through the existing eligibility/portal-out
loop unchanged — awards, playoff, stat archiving, graduation, the outbound
transfer roll, `updatePipelineStrength`. What it stops doing is the tail:
enrolling signees, generating the new class, and rebuilding the schedule no
longer happen there. Instead it seeds the portal listings (below), sets
`state.phase = "OFFSEASON"`, `state.offseasonStep = "PORTAL"`, and returns.

A new entry point, `advanceOffseasonStep(state, commands)`, mirrors
`beginSeason`'s existing shape exactly: it is not `advanceWeek` and does not
try to be. It resolves the commands valid for the *current* step for every
program in one call — same merged human-plus-AI command list `advanceWeek`
already takes — then moves the whole league to the next step together. This
is the same lockstep model weeks already use; no per-program "ready" flag is
needed. `advanceWeek` is untouched and keeps throwing outside
`REGULAR_SEASON`, exactly as it does for `ROSTER_REVIEW` today.

When the last step (`TRAINING_CAMP`) resolves, `advanceOffseasonStep` does
what `rolloverSeason`'s tail used to do — enroll signees, generate the new
class, rebuild the schedule, refresh sponsorships — then sets
`state.phase = "REGULAR_SEASON"`, `state.offseasonStep = null`,
`state.week = 1`.

Every step accepts a command that does nothing but move on:
`{ type: "CONTINUE_OFFSEASON", programId }`. A program that sends only this
at every step experiences exactly today's behavior — one skip per step,
sane defaults underneath, nothing forced. The Casual Commuter's ask from the
focus group ("three decisions, not fifteen") is answered by the step count,
not by making any one step mandatory to engage with.

## Step 1 — Portal

The portal-out roll in `rolloverSeason` is unchanged; every player it moves
to `PORTAL` becomes a listing the instant `OFFSEASON` begins:

```
state.portal: Record<PlayerId, PortalListingState>
PortalListingState {
  priorities: RecruitPriority[]        // same pool prospects draw from
  interestByProgram: Record<ProgramId, number>
}
```

Generated the same deterministic way `generateProspects` seeds a prospect's
`interestByProgram` — `rng.between` keyed by player id and program id, no
new randomness pattern.

**Reuses the recruiting market's own scoring, not a parallel system.**
`prospectProgramFit` and `recruitingScore` both narrow their signature from
`Readonly<Prospect>` to a shared structural interface —

```ts
interface Recruitable {
  id: string; position: Position; homeDivisionId: DivisionId;
  priorities: RecruitPriority[]; interestByProgram: Record<ProgramId, number>;
}
```

— which `Prospect` already satisfies and a portal player (`Player` +
`PortalListingState`) satisfies once the two are read together. One formula,
two pools, no duplicated scoring code to keep in sync.

**A portal player has no hype-versus-truth gap.** He has played real games;
his `overall` and `ratings` are already public. So there is no evaluation
gate here — `OFFER_PROSPECT`, `INVEST_RECRUITING_POINTS`, `SCHEDULE_VISIT`,
and a portal-flavored NIL offer are all live the moment the step opens, and
all four reuse their existing gates, formulas, and constants
(`MAX_VISITS_PER_SEASON`, `VISIT_COST`, `visitScore`) rather than inventing
smaller offseason-specific versions — a single-shot window still spends
from the same season's pool, it just spends it all at once.

**Pricing swaps the hype curve for a production curve.**
`nilAskingPrice`'s convex hype curve becomes a convex overall curve for a
portal target — hypothesis, tuned the same way the original was:

```
portalAskingPrice(player) =
  NIL_BASE_PRICE × portalOverallCurve(player.overall) × positionPremium
```

**Resolution is one shot, not a multi-week contest.** A new
`resolvePortalMarket` mirrors `resolveRecruitingMarket`'s contest-and-commit
logic — same order-independent simultaneous resolution — but with no
signing-week complexity: whoever wins takes him immediately.
`player.programId` changes, his NIL offer converts to a commitment exactly
like a recruit's does, and — the one real difference from a high-school
signee — **his eligibility clock is not reset.** `seasonsRemaining` carries
over unchanged; a transfer keeps whatever years he had left.

**Retention is the same market, played in the other direction.** A
`RETAIN_PLAYER { programId, playerId, weeklyAmount }` command targets your
*own* rostered player and adds a term to the transfer-risk roll that already
exists in `rolloverSeason`:

```
transferRisk = clamp(0.08 + playingTimePressure − academicProtection − retentionEffect, 0.01, 0.12)
retentionEffect = f(weeklyAmount, askingPrice)   // same diminishing shape as nilScore
```

This is the retention arm `NIL_RECRUITING.md` explicitly cut, naming this
exact phase as the gate. Fittingly, it resolves *before* the outbound roll
each year (the offer has to exist before the risk is computed), which means
`rolloverSeason`'s eligibility loop moves to read a per-player retention
offer that was placed the *previous* offseason, applying to the roll at
*this* one — a season-long standing decision, the same shape a sponsorship
contract already is.

**Unclaimed listings resolve, not linger.** At the end of the step, any
portal player who received no winning bid transitions to the existing
`DEPARTED` roster status (`RosterStatus` already has one — no new value
needed) with a `reason` of `"PORTAL_UNCLAIMED"`. This is the direct fix for
the 160-stuck-players finding: a portal player's story ends here, one way or
the other, every single offseason.

## Step 2 — Signing day

Mostly a checkpoint, not a new mechanic — the high-school class was recruited
continuously all season, per the standing recruiting market. This step is
where the player sees the settled incoming class in one place, any
scholarship-limit conflicts have already resolved (the existing bug-fixed
rollover loop, unchanged), and a last, lump-sum `INVEST_RECRUITING_POINTS`
push is possible on anyone still `COMMITTED` but not yet `SIGNED` — every
prospect still open at this point is past `SIGNING_WEEK` in practice, so a
push here is really a bid on next year's board opening early. `CONTINUE_OFFSEASON`
is the only command most programs will ever send here.

## Step 3 — Coaching market

`REPLACE_STAFF` stops being free on the outgoing side, in every phase, not
only here:

```
buyoutCost = round(outgoing.salary × BUYOUT_SALARY_FRACTION)
```

Hypothesis: `BUYOUT_SALARY_FRACTION = 0.6` — a real cost, calibrated against
`staffSalary`'s own steep-at-the-top shape so firing an elite coach costs
what it should, without a multi-year-contract model this engine doesn't
carry. Charged to `program.budget` alongside the existing `signingCost` for
the replacement, and posted on the confirmation before the command is sent —
"payoffs are visible" applies to a firing exactly as much as a hire.

The step itself is the once-a-season *moment* — every program's coaching
staff is surfaced for review, using the takeover screen's own
`staffCandidatesFor` unchanged, so a player who never opens the staff screen
mid-season still gets one guaranteed look a year. This is not a new hiring
system; it is a scheduled appointment with the one that already exists.

## Step 4 — Training camp

Minimal, deliberately, per the cut table. One command:

```
SET_TRAINING_CAMP_FOCUS { programId, focus: "CONDITIONING" | "BALANCED" | "INSTALL" }
```

`CONDITIONING` lowers the injury-risk inputs `playerInjuryRisk` already
reads for the first few games of the new season; `INSTALL` gives both sides'
`install` a flat head start at the cost of some of that same protection;
`BALANCED` is the do-nothing default `CONTINUE_OFFSEASON` resolves to. No new
resolution engine — this reuses the same risk and install machinery the
season already runs on, just applied once, before week 1, rather than
week to week. A deeper, concept-driven camp is explicitly future work once
the concepts system in §14's track [G] exists; this step's job is to have
*a* home for that later, not to be it now.

## The AI needs an offseason planner

`planWeeklyCommands` has no offseason equivalent. Without
`planOffseasonCommands`, 71 of 72 programs stand still every single
offseason — bid nothing on the portal, retain nobody, never fire a coach,
never set a camp focus. Required scope, not a nice-to-have: a
72-program league with one active team and seventy-one frozen ones would
fail the same "rivals compete on it" standard every prior slice in this
codebase held itself to. Shape mirrors the existing recruiting planner:
portal targets ranked by the same `prospectValue`-style formula generalized
to `Recruitable`, a retention offer sized off `freeNilCapacity` the same way
NIL bids already are, and a coaching decision that only fires when a
candidate clearly exceeds the incumbent by more than the buyout costs to
justify it.

## Constants ledger

All hypotheses, committed-test-tuned like every other constant in this
codebase, listed so tuning changes one place:

| constant | value | what it prices |
|---|---|---|
| `BUYOUT_SALARY_FRACTION` | 0.6 | What is owed a coach let go early, off his salary |
| `PORTAL_INCUMBENT_BONUS` | 4 | The relationship a program already has with a man it is losing. Under a recruit's inertia of 6 on purpose |
| `PORTAL_MINIMUM_POINTS` | 5 | A bid has to be real; without a floor everybody blankets every listing |
| `PORTAL_COMMITMENT_THRESHOLD` | 58 | Below this nobody wanted him enough |
| portal price curve | `(overall − 40)/25` ^2.6 | Convex in production, mirroring the hype curve's shape |
| `TRAINING_CAMP_WEEKS` | 4 | How long camp still covers. A head start, not a season buff |
| `TRAINING_CAMP_INSTALL_BONUS` | 0.05 | Against `planExecution`'s ~0.26 maximum from a full week of reps |
| `TRAINING_CAMP_CONDITIONING_RISK` / `_INSTALL_RISK` | 0.85 / 1.15 | Both directions of the same trade, matched to the CONDITIONING focus |
| `AI_COACHING_UPGRADE_THRESHOLD` | 15 | Set by measurement — see the deviations above |

## Tests

- **Order independence and determinism**, same standard as every prior
  slice: permute portal-market commands within the step; byte-identical
  resolution and replay.
- **The step sequence cannot be skipped past or reordered** — a command
  valid only in `COACHING` is refused with a reason if sent during `PORTAL`.
- **Nobody is stuck.** Every portal listing resolves to either a new
  `programId` or `DEPARTED` by the time the step closes — the direct
  regression test for the 160-player finding.
- **A transfer keeps his clock.** `seasonsRemaining` is unchanged across a
  portal move, distinguishing it from a fresh signee's reset eligibility.
- **The buyout actually charges**, in both a mid-season and an offseason
  `REPLACE_STAFF`, and is refused if the program can't cover it.
- **Retention moves the roll**, distribution-tested the same way the NIL
  slice proved its own diminishing-returns curve: a maxed retention offer
  measurably lowers a targeted player's transfer probability without
  reaching zero.
- **The AI participates**, same standard as every prior slice: across a
  full headless season, some AI programs must bid on the portal, retain a
  player, and replace a coach — not just the human.

## Open

Matching `PROGRAM_IDENTITY_AND_ECONOMY.md` §16's own honesty about what
this pass does not settle:

1. ~~How many portal players actually enter a 72-program league in one
   offseason.~~ **Measured — 281 a year, 3.9 per program.** What it opened
   instead: the pool's *quality* is too flat for the portal to be "the
   climb" §12 describes. A median transfer is a 61-overall depth piece and
   only 22 a year are the 80+ starters that thesis is about. Fixing that
   means reweighting `transferRisk` toward players who are actually good,
   which is a balance change to a formula that predates this work.
2. **Whether the portal should share the season's Recruiting Point budget or
   get its own allotment.** Built as sharing, which is simpler and consistent
   with "one pool, not a second currency" — but it means a program that spent
   everything chasing high-schoolers is locked out of the window where it
   could have replaced them, and it never finds that out until the window
   opens. Worth watching once the offseason has screens.
3. **Whether training camp's `INSTALL` option should persist into week 1's
   install band or simply be consumed by it.** Affects whether a strong
   camp is a one-week bump or a lasting head start.
4. **A coach fired in `COACHING` after a portal target already signed to
   play for him.** Resolved in practice by ordering — the portal closes two
   steps before the coaching market opens, and a program rather than a coach
   holds the roster spot and the NIL commitment — so nothing breaks. Whether
   it *should* cost something is a design question this slice does not
   answer.

5. **The offseason has no screens.** The engine is complete and the AI plays
   it; the human currently cannot. This is the next piece of work, not an
   open design question — see the deviation note above.
