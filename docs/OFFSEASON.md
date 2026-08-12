# The offseason phase — spec

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
codebase: `BUYOUT_SALARY_FRACTION` 0.6 · portal overall curve shape TBD by
measurement, same method `prospectHype`'s curve was calibrated with ·
retention effect curve shares `nilScore`'s diminishing-returns shape.

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

1. **How many portal players actually enter a 72-program league in one
   offseason**, and whether the current `transferRisk` formula produces a
   pool worth a whole step of attention or a scarce trickle. Needs
   measurement before `portalAskingPrice` can be tuned at all.
2. **Whether retention and portal bidding should share one Recruiting Point
   budget or a separate offseason allotment.** Sharing is simpler and
   consistent with "one pool, not a second currency"; separate would stop a
   program that spent its whole season pool from being locked out of the
   one moment it might matter most.
3. **Whether training camp's `INSTALL` option should persist into week 1's
   install band or simply be consumed by it.** Affects whether a strong
   camp is a one-week bump or a lasting head start.
4. **How this interacts with career-ending departures mid-list** — a coach
   fired in `COACHING` after a portal target already committed to play for
   him. Likely resolved by the fact that a program, not a coach, holds the
   NIL commitment and the roster spot, but worth a dedicated test once both
   systems are live together.
