# Recruiting: a real offer, a visit, and a signing period — spec

## Status (2026-08, shipped)

The bug fix and slices A–D below are all built and committed test-first.

Deviations from the plan, found while building it:

- **`recruitingScore`'s NIL term had a latent gap the plan didn't anticipate.**
  Once a prospect commits, his weekly dollars move from `offersByProspect` to
  `commitmentsByPlayer` (settled behavior from `NIL_RECRUITING.md`). Making
  `COMMITTED` contestable again meant that gap became live: the incumbent's
  own NIL score would have silently dropped to zero the week after commitment,
  even though he is still being paid. Fixed by having `recruitingScore` read
  `commitmentsByPlayer` as a fallback when there is no live offer.
- **The eligibility gate broadened on all five recruiting commands, not just
  three.** `EVALUATE_PROSPECT` and `SET_NIL_OFFER` needed the same
  `AVAILABLE`-or-`COMMITTED` broadening as `OFFER_PROSPECT`,
  `INVEST_RECRUITING_POINTS`, and `SCHEDULE_VISIT` — a rival scouting or
  bidding on a flip target needs the same access a first-time pursuit does.
- **The rollover enrollment filter reads `SIGNED` and, defensively,
  `COMMITTED`.** Everyone should be `SIGNED` by rollover; the fallback is a
  safety net against an ordering surprise, not a sign the sweep is expected to
  miss anyone.
- **The AI does not yet attempt a flip.** It still only pursues `AVAILABLE`
  prospects. Its own commitments are still defended automatically —
  `COMMITMENT_INERTIA_BONUS` requires no action — but a human player can
  currently flip a rival's recruit in a way no rival will attempt back. Known
  and deliberately deferred rather than rushed into the riskiest slice of this
  spec; worth a follow-up once the flip mechanic itself has been played.
- **Slice D needed a field the model didn't have.** "A signed prospect from
  that division becomes a real contributor" requires knowing a *player's*
  home division, and `Player` never carried one — only `Prospect` did, and
  that information was dropped at enrollment. Added `Player.homeDivisionId`,
  carried over from the prospect (or, for an opening roster with no
  recruiting history, the player's own program's division as a simplifying
  assumption). One small enum field per player; negligible against the
  already-solved save-size budget.
- **The pipeline counter is tracked per division generally, but only ever
  read for a program's own division.** `prospectProgramFit`'s `CLOSE_TO_HOME`
  branch returns flat 30 for any prospect outside `program.divisionId` before
  it ever looks at `pipelineStrength` — so a program that happens to develop
  an out-of-division signee banks a number nothing will ever read. Matches
  the spec's own framing (`homeRegionBias` is a program's *own* territory);
  left as-is rather than adding a guard that only ever prevents dead writes.

---

Follows the 2026-08 audit recorded in `NIL_RECRUITING.md`'s "Status against
the full redesign" section, which measured the current recruiting market
against the real NCAA process and EA Sports College Football's Dynasty mode.
NIL closed the money gap. This closes four gameplay gaps and one bug, in that
order of leverage:

1. `OFFER_PROSPECT` is a disguised points investment, not a real offer.
2. There is no visit — the highest-leverage action in both the real process
   and EA's abstraction has no equivalent here.
3. Commitment is instant and permanent, so there is no flip risk and no
   signing period — the model's `PROSPECT_SIGNED` event is dead code because
   nothing in the simulation ever emits it.
4. Pipelines don't accumulate; `homeRegionBias` is one static number.
5. A prospect who commits past `scholarshipLimit` is stuck in `COMMITTED`
   forever at rollover instead of resolving.

## Settled decisions this spec inherits

These are already load-bearing elsewhere in the codebase and this spec does
not reopen them:

- **Order-independent market.** Every new action resolves inside the existing
  simultaneous `resolveRecruitingMarket` pass. Nobody wins by clicking first,
  including a flip attempt.
- **One currency.** Recruiting Points stay the only spend for search,
  evaluation, and now visits. No second "hours" pool — the attention-economy
  work already tried and rejected a shape like that for the staff screen.
- **Criteria are eligibility; the score is odds.** A visit or an offer changes
  a term inside `recruitingScore`, same as pursuit points and NIL do today. No
  new gate that gives anyone a guaranteed sign.
- **No hidden roll.** Every new term is a stated formula, printed on the
  prospect's row, same standard `NIL_RECRUITING.md` held itself to.
- **Money is a tiebreaker, never a substitute for fit.** Visits and offers
  must not let a program with nothing a recruit wants out-visit its way to a
  commitment the fit score says it shouldn't win.

## Slice A — the offer becomes a real, durable state

`OFFER_PROSPECT` stops being an alias for `INVEST_RECRUITING_POINTS { points:
10 }` and becomes its own toggle.

```
RecruitingProgramState.offeredProspectIds: ProspectId[]   // new
OFFER_PROSPECT { programId, prospectId, extend: boolean }  // extend=false rescinds
```

Rules: extending requires `status === "AVAILABLE"` and
`projectedRecruitingOpenings(state, programId) > 0`, same gates as today.
Extending is free — offering is a signal, not a spend — and applies a flat,
one-time interest bump the first time it happens (idempotent via
`offeredProspectIds`, same pattern the NIL withdrawal penalty already uses on
`interestByProgram`). Rescinding is legal, costs the same flat penalty NIL
withdrawal already charges, and is remembered the same deterministic way.

`recruitingScore` gains one small additive term for having an offer out — not
the 10-point pursuit bump it silently gets today. A program that has not
offered cannot invest pursuit points or schedule a visit (see Slice B): you
cannot pitch a recruit you have not offered, which is the real relationship
this was missing.

## Slice B — visits

The single highest-fidelity gap. One command, capped hard enough that it
stays a decision rather than a fifth thing to max:

```
SCHEDULE_VISIT { programId, prospectId }
```

- Requires an active offer (Slice A), `AVAILABLE` status, a projected
  opening, and a season-wide cap (`MAX_VISITS_PER_SEASON`, hypothesis: **6**)
  shared across every prospect on the board — a program has a handful of
  visit weekends a year, not one per recruit.
- Costs Recruiting Points, priced above a single evaluation and below a full
  pursuit-points push (hypothesis: **20**), because it is the most effective
  single action available.
- Effect reuses `prospectProgramFit` rather than inventing a second fit
  system — a visit is worth more to a program that actually has what the
  recruit is looking for:

  ```
  visitBonus = VISIT_BASE_BONUS × (0.5 + prospectProgramFit(state, prospect, programId) / 200)
  ```

  `VISIT_BASE_BONUS` hypothesis: **6** — roughly what four pursuit points buy
  today at the low end (poor fit) up to what ten buy at a strong fit, so a
  visit is never strictly dominated by just buying more pursuit points, but
  it is not a free win either.
- **Diminishing on the second visit to the same recruit** — same shape as
  NIL's exponential, simpler curve: the second visit is worth half the first,
  a third worth a quarter. Nobody should spend their whole season's cap on
  one recruit.
- A visit is a stated line on the recruit's row: `Home visit scheduled —
  worth +4.1 today`, computed live from the formula above so the number never
  disagrees with what the market actually pays out.

## Slice C — commitment becomes verbal, with a real signing period

The largest architectural change, and the one that finally gives the dead
`PROSPECT_SIGNED` event a job.

**Today:** `resolveRecruitingMarket` only contests `AVAILABLE` prospects.
Hitting `COMMITTED` removes a prospect from the market forever; nothing can
flip him, and the only remaining event is a quiet `PROSPECT_ENROLLED` at
rollover.

**Change:** `COMMITTED` becomes a real, contestable state, not a resolved
one:

- The contest pool in `resolveRecruitingMarket` includes `COMMITTED`
  prospects, not just `AVAILABLE` ones, until a **signing week**
  (hypothesis: **week 12**, echoing the real early-signing window landing
  before the season's back half).
- The incumbent — whoever he is currently committed to — gets a
  `commitmentInertia` term added to his own score inside that contest,
  representing the real social and emotional cost of backing out. Hypothesis:
  **+6**, on top of the existing required-lead-to-win logic, so a rival needs
  a real, stated advantage to flip him rather than a marginal one.
- A rival can still out-visit, out-offer, or out-NIL the incumbent and win the
  flip — the point is that it is now possible and costly, not impossible.
- **At the signing week**, every prospect still `COMMITTED` resolves: emit
  the (currently dead) `PROSPECT_SIGNED` event and lock his status so he can
  no longer be contested. `PROSPECT_ENROLLED` still fires separately at
  rollover when he actually joins the roster — signing and enrolling stay two
  events, matching the real December-signing/August-enrollment gap, and
  matching the "structured, not prose" invariant: a flip has a name, a sign
  has a name, an enrollment has a name.
- A prospect who is still `AVAILABLE` (never committed to anyone) at the
  signing week is unaffected by this slice — he keeps recruiting normally
  until rollover's existing `WITHDRAWN` sweep, same as today.

This is the change most likely to move the calibrated numbers elsewhere in
recruiting, because pursuit-point and NIL investment made *after* a
commitment currently do nothing (the recruit is gone from the market) and
will now matter again as flip defense. Budget a measurement pass, not a
guess, the same way the box-score and RNG work did.

## Slice D — pipelines accumulate

`homeRegionBias` stays exactly what it was: the immediate, flat discount every
program gets in its own division from the moment the save begins. Alongside
it, `Program.pipelineStrength: Partial<Record<DivisionId, number>>` is earned
standing in that same division, built up one season at a time.

**Once a season, at rollover, never weekly** — this is a slow-moving number,
not something a single good week should move:

```
updatePipelineStrength(state):
  for every program:
    decay every division's stored value by PIPELINE_DECAY_RATE (0.85)
    drop any value that decays below 0.05 — a spent pipeline reaches zero
  for every scholarship player:
    if gamesPlayedThisSeason >= PIPELINE_CONTRIBUTOR_GAMES (6)
       or stardom >= PIPELINE_CONTRIBUTOR_STARDOM (30):
      pipelineStrength[player.homeDivisionId] += PIPELINE_GAIN_PER_CONTRIBUTOR (1)
```

Read before the eligibility loop resets `gamesPlayedThisSeason`, same
ordering constraint as the rest of rollover's season-boundary bookkeeping.
Decay first, then add — a division that stops producing contributors erodes
even in a season where an old contributor briefly still counts.

Folds into `prospectProgramFit`'s `CLOSE_TO_HOME` branch as a bonus on top of
the flat bias, capped low (`PIPELINE_MAX_BONUS`, 5) since the flat bias is
already 95 of a possible 100:

```
CLOSE_TO_HOME fit =
    30                                              if out of division
    min(100, 95 + min(PIPELINE_MAX_BONUS, pipelineStrength[division]))  otherwise
```

No new UI, per the original sketch — it shows up as a better `CLOSE_TO_HOME`
number on recruits from a division a program has actually developed talent
from, on the same fit display three other slices already write to.

## Bug fix — the scholarship-limit orphan

`index.ts:4200-4204` `break`s out of the rollover enrollment loop once
`scholarshipLimit` is hit, leaving every prospect still `COMMITTED` past the
cap stuck in that status permanently — never `ENROLLED`, never reset. Fix:
after the loop, resolve every remaining `COMMITTED` prospect at that program
to `WITHDRAWN` (he verbally committed, the class filled before he could
enroll — a real, if unhappy, outcome) and release his reserved NIL
commitment, which the existing cleanup below the loop already does for any
non-`ENROLLED` prospect. Ship this regardless of the rest of this spec; it is
a one-line change with its own regression test.

## Order of operations inside `resolveRecruitingMarket`, updated

```
contest pool = AVAILABLE prospects (as today)
             + COMMITTED prospects, only in weeks before the signing week (Slice C)

score = interest × 0.3
      + fit × 0.35
      + pursuitPoints × 0.75
      + facilityBonus + staffBonus + exposureBonus + appealBonus
      + nilBonus
      + offerBonus          (Slice A — new, small, requires an active offer)
      + visitBonus          (Slice B — new, diminishing per repeat visit)
      + commitmentInertia   (Slice C — new, incumbent only, zero for a challenger)
      + noise
```

Every new term is additive into the same score the market already resolves
on — no second scoring pass, no new market.

## Cut from this pass, on the record

| cut | why |
|---|---|
| EA-style hours pool with named actions (soft sell / hard sell / social media) | Same shape as the staff-hours pool already rejected on sight; translate the *behavior* (visits, offers, flips), not the currency |
| Real recruiting calendar (contact/evaluation/quiet/dead periods) | No in-game clock finer than a week; the signing-week gate in Slice C is the abstraction of "there is a date this stops moving" |
| NCAA academic eligibility risk | `ACADEMICS` priority already exists as a recruit preference; a real qualify/not-qualify risk is a new failure mode with no home yet |
| Multiple visits per prospect as a strategy (visit stacking) | Deliberately suppressed by the diminishing curve in Slice B |
| Portal-player pipelines | Gated on the offseason phase existing, same as NIL's portal cut |

## Tests

- **Order independence:** permute `OFFER_PROSPECT`, `SCHEDULE_VISIT`, and a
  flip attempt's command order across programs in one week; byte-identical
  resolution.
- **Determinism:** replay with all three new command types; byte-identical
  state and events.
- **An offer is a prerequisite:** `SCHEDULE_VISIT` and
  `INVEST_RECRUITING_POINTS` are refused with a reason absent an active offer.
- **Diminishing visits:** the second visit's score contribution is strictly
  less than the first's, across the fit range.
- **Flips are possible but costly (distribution):** pooled across six
  leagues, measure the flip rate at `commitmentInertia = 6` against `0` —
  flips must be rare but nonzero, and a rival must need a stated, visible
  edge (more visits, a bigger offer, better fit) to pull one off, never a
  marginal one.
- **Signing locks:** any prospect `COMMITTED` at the signing week emits
  `PROSPECT_SIGNED` and can never appear in a contest pool again.
- **The orphan bug is fixed:** a program that over-commits past
  `scholarshipLimit` resolves every excess prospect to `WITHDRAWN` at
  rollover, never leaves one dangling in `COMMITTED`.
- **Character survives, again:** re-run the NIL slice's "poorer program wins
  a measured majority of prospects whose priorities it serves" distribution
  test with visits and flips live, to confirm the new terms don't quietly
  hand the market back to whoever has the most points to spend.

## Build order — all shipped, in this order

1. ~~The orphan bug fix.~~ Isolated, no design risk.
2. ~~Slice A — the real offer.~~ Small, and Slice B depended on it existing.
3. ~~Slice B — visits.~~ The highest-fidelity, highest-payoff piece.
4. ~~Slice C — verbal commitment and the signing week.~~ The largest change;
   reopened scoring on prospects the market previously treated as settled,
   which is what surfaced the NIL-fallback gap noted above.
5. ~~Slice D — pipelines.~~ Built last, after A–C were live, per the plan.

The "one row: a range, a price, a percentage" presentation redesign discussed
alongside this sits on top of all four slices — it is the legibility layer
for a system that, once this ships, will have real state worth showing
honestly instead of a hidden score and a fixed threshold.
