# NIL deals in recruiting — spec

NIL is the money mechanism inside the "offer, price, percentage" recruiting
redesign (CLAUDE.md), and the first real drain on an economy that measured
+$34.9M a season with nothing to spend it on. It is specified here as its own
slice because it can ship *before* the full recruiting overhaul: it adds one
term to the existing market and one screen control, and everything else it
needs — `donorCulture`, prospect `priorities`, `hype`, the order-independent
market — already exists.

The one-sentence version: **you offer a recruit a weekly NIL payment; his
asking price is set by his hype and revealed by scouting; the offer raises your
odds with diminishing returns, weighted by what he actually cares about; and if
he signs, you pay it every week he is on your roster.**

Three decisions were put to the designer and settled (2026-08), so they are
design choices here, not hypotheses: deals **charge from commitment**, not
enrollment; money is a **tiebreaker** (`NIL_SCORE_CEILING` stays under the
priorities/fit gap), never a substitute for being wanted; and the drain is
**moderate** — the capacity anchors below stand, and insolvency should only be
reachable through overreach. Tuning may move constants within those choices,
not across them.

## What NIL must never be

The failure mode is "spend more and win" — richer program clicks harder, wins
every contest, and program character stops mattering. Five constraints from
`PROGRAM_IDENTITY_AND_ECONOMY.md` §11 are load-bearing, restated here as
acceptance criteria:

1. **Capped by donor capacity, not budget.** A rich-but-unloved program cannot
   buy stars. Money cannot raise the cap; only fans, support, prestige, and
   titles can.
2. **Recurring, not a signing bonus.** Signing four stars is four years of
   committed payroll. The drain compounds; the roster *is* the balance sheet.
3. **Diminishing returns per prospect.** Doubling the offer must not double the
   odds.
4. **Weighted by the prospect's own priorities.** Strong on
   `PERSONAL_STARDOM`, weak on `CLOSE_TO_HOME` and `ACADEMICS`. The low-tier
   strategy stays "serve the priorities you can serve", not "outbid".
5. **Resolved in the order-independent market.** Nobody wins by clicking first.

## Donor capacity — the ceiling

A weekly dollar ceiling per program, derived, never stored:

```
weeklyDonorCapacity(program) =
    fanBase / 1000
  × NIL_DOLLARS_PER_THOUSAND_FANS        // starting hypothesis: $700
  × supportMultiplier                     // fanSupport 0→100 maps 0.6→1.3
  × prestigeMultiplier                    // prestige 0→100 maps 0.7→1.25
  × donorCulture                          // authored 0.5–1.5, already on Program
  + championships × NIL_TITLE_ANNUITY     // $4K/week per title, forever
```

Anchors, using real opening states: a LOW program (27K fans, 55 prestige,
support ~60) lands near **$18–25K a week**; a POWER program opens around
**$110–160K**. Season totals (~14 charged weeks): roughly $300K against $1.8M —
the same order as the tier revenue asymmetry the recruiting redesign already
calls correct. A diehard's 1.4 `donorCulture` against a front-runner's 0.6 is a
2.3x gap between programs with identical fan counts, which is `donorCulture`
finally doing a job.

**Committed + offered NIL may never exceed capacity.** Outstanding offers
reserve capacity while live, so a program cannot offer the same dollars to six
quarterbacks and see who bites. That reservation *is* the portfolio decision.

Capacity can fall (fans leave, support collapses). Existing commitments are
honored — the program runs over cap and simply cannot make new offers until it
is back under. No forced releases; the squeeze is the story.

## The asking price

Every prospect has a derived weekly asking price. It prices the **consensus,
not the truth**:

```
askingPrice(prospect) =
    NIL_BASE_PRICE                        // hypothesis: $400/week
  × hypeCurve(hype)                       // convex: an 80-hype recruit asks ~6x a 55
  × positionPremium                       // QB 1.5, WR/DL 1.2, interior 1.0, K/P 0.4
  × priorityModifier                      // PERSONAL_STARDOM +40%; CLOSE_TO_HOME −25%
                                          //   for in-region programs only
```

Pricing off `hype` rather than `potential` is deliberate and is the fun:
over-hyped busts are expensive and hidden gems are cheap, so the scouting
department's hype-versus-truth machinery gets a cash payoff. A program that
scouts well pays less per point of real talent. No new mechanism — this rides
the existing decoupling.

The price is **flat across programs**. What varies by program is the ceiling
(capacity) and the payoff curve (below). Prestige discounts belong to the
future full redesign ("you're 2 prestige short → $4.1M"); folding them in here
would double-count prestige, which already sits inside `recruitingScore` via
the `WINNING` priority.

### Scouting reveals the price

Unscouted, the row shows a band: `Wants $500–2,000 a week`. The first
evaluation (`Basic · 5`) narrows it; any second evaluation reveals it exactly.
This follows the redesign rule that scouting reveals *what he wants*, not just
what he is — and it makes the first 5-point spend on a recruit finally answer a
question a player actually has.

## The offer, and what it buys

New command, one per program per prospect, replacing nothing:

```
SET_NIL_OFFER { programId, prospectId, weeklyAmount }   // 0 clears it
```

Rules: an offer requires at least one evaluation on the prospect (you cannot
bid on a name you have never looked at), requires a projected roster opening,
and reserves capacity while the prospect is `AVAILABLE`. Offers may be raised
or withdrawn freely before commitment; a withdrawn offer permanently subtracts
a small fixed amount from that prospect's `interestByProgram` for the program
(deterministic, no roll) — he remembers.

In `recruitingScore`, one new term:

```
nilScore = NIL_SCORE_CEILING × (1 − exp(−offer / askingPrice))
         × priorityWeight(prospect)
```

- `NIL_SCORE_CEILING` starting hypothesis: **14 points** — deliberately placed
  against the terms that exist today: pursuit points contribute up to ~0.75/pt
  with no hard cap, interest contributes ~10–26, fit ~0–35. NIL at full
  saturation should be about what a deep pursuit-point investment is worth:
  able to decide a close contest, unable to overcome a prospect who does not
  want you. Guard rail, same shape as the scheme-versus-tactics rule: **a
  maxed NIL offer must be worth less than the fit gap between a program that
  serves the prospect's priorities and one that does not.**
- The exponential gives constraint 3 for free: paying his exact ask buys ~63%
  of the ceiling, double buys ~86%, quadruple ~98%. The fourth multiple of his
  price buys 2 points. Posted on screen as the live percentage, so the
  diminishing curve is *felt* at the slider, not discovered in a wiki.
- `priorityWeight`: 1.0 baseline; **1.35** if `PERSONAL_STARDOM` is among his
  priorities; **0.65** if `CLOSE_TO_HOME` or `ACADEMICS` is. A money-motivated
  five-star is exactly the recruit a low-tier program should not fight for.

`resolveRecruitingMarket` changes in one place: `offeredBy` becomes programs
with pursuit points **or** a live NIL offer. Resolution stays simultaneous,
scores stay absolute (an offer is an amount, never "outbid by X"), and the
existing commitment threshold and required-lead logic are untouched.

## The drain

On commitment, the offer converts to a commitment at the offered amount. It
begins charging **immediately** (insolvency pressure now, per the settled
decision in CLAUDE.md — not on enrollment), and charges every week the player
is on the roster until his eligibility ends or he leaves. It travels with the
weekly finance resolution next to staff payroll, inside the existing
`WEEKLY_RECAP` money totals — **no weekly event of its own**; the inbox lesson
about the simulation talking to itself applies in advance.

State, all small against the save budget:

```
interface NilProgramState {
  offersByProspect: Record<ProspectId, number>;      // weekly $, cleared on resolution
  commitmentsByPlayer: Record<PlayerId, number>;     // weekly $, deleted on departure
}
state.nil: Record<ProgramId, NilProgramState>
```

Events, structured per the invariant: `NIL_DEAL_SIGNED { prospectId, programId,
weeklyAmount, askingPrice, season, week }` emitted alongside
`PROSPECT_COMMITTED`, and `NIL_COMMITMENT_ENDED { playerId, programId,
weeklyAmount, reason }` at departure. Both are player-facing news (a signing
with a price is a story; the stories system can pick it up unchanged).

## Rivals bid

Non-negotiable, per the twice-learned lesson (projection giveaway, prospect
value reading truth): **a system only the player pays for is a system the
player should not pay for either.** The AI planner extends `planProspects`:
each rival offers on its top pursuit targets, sized at `askingPrice × k` where
k comes from its remaining capacity spread across its open needs, evaluated
against `hype`. Rivals respect the same capacity cap and the same reveal rule.
A distribution test must show rivals overpaying for over-hyped busts at the
same rate the hype system already guarantees on signings.

## The screen

NIL is the chance to *reduce* the recruiting screen's control count, not grow
it (playability pass, finding 10). The prospect card gains one control and
retires none yet:

```
Marcus Webb · QB · REGIONAL · MO
Wants $850 a week            [scouted — exact]
Your offer  [====|——————]  $600 a week          34% of what money can buy
Donors: $23K a week · $9.2K committed · $1.1K reserved · $12.7K free
```

Requirements carried over from the pass: every number carries its unit and
period ("a week", "a season" on hover), the percentage is **labeled as the
share of the NIL ceiling, not his commitment odds** (the odds live in the full
redesign; conflating them here would make the slider a lie), and the capacity
meter appears on the market header once, not per card. The three bare
`+5/+10/+20` entice buttons remain the redesign's problem — this spec does not
touch pursuit points.

## Tests

- **Order independence:** permute `SET_NIL_OFFER` command order across
  programs; byte-identical resolution. Permute offer/withdraw/re-offer within
  one week; same.
- **Determinism:** replay with NIL commands; byte-identical state and events.
- **Diminishing returns:** assert odds-at-2x-ask minus odds-at-1x-ask is
  strictly less than odds-at-1x-ask minus odds-at-0 across the hype range.
- **Character survives money (distribution):** two same-tier programs, one
  with 2x the capacity, contesting prospects whose priorities the poorer
  program serves — the poorer program must still win a measured majority of
  those. Pooled across six leagues, per the sample-size lesson.
- **The cap binds:** a program at capacity is refused further offers with a
  reason, and total committed dollars never exceed capacity at signing time.
- **The drain drains (distribution):** 5-season headless run at real size with
  AI bidding; POWER cumulative surplus must come down measurably from the
  $34.9M/season baseline, and at least some AI programs must run a season in
  deficit without any cascading failure (insolvency *consequences* are a
  separate work item and explicitly out of scope here).
- **Busts cost money:** across a generated class, dollars-per-point-of-realized
  `potential` must be measurably worse for over-hyped prospects than for
  under-hyped ones — the assertion that NIL pays the scouting department.

## Cut from this slice, on the record

| cut | why |
|---|---|
| Retention / renegotiation offers | Gated on the offseason phase existing; §11's retention arm is the portal-defense mechanism and the portal has no inbound side yet |
| Portal-player NIL | Same gate; §12 says NIL's *primary* job is portal buying — that job starts when the portal opens |
| Prestige discount on asking price ("you're 2 prestige short") | Belongs to the full offer/price/percentage redesign; double-counts prestige if added inside today's `recruitingScore` |
| Collectives, sponsor tie-ins, per-player NIL satisfaction | New systems with new meters; nothing above needs them |
| Insolvency consequences | The drain creates the pressure; what a negative budget *does* is its own design item (README's eight-year window) |

## Constants ledger

All hypotheses, tuned by the committed tests, listed so tuning changes one
file: `NIL_DOLLARS_PER_THOUSAND_FANS` $700 · `NIL_TITLE_ANNUITY` $4K ·
`NIL_BASE_PRICE` $400 · position premiums QB 1.5 / WR·DL 1.2 / K·P 0.4 ·
`NIL_SCORE_CEILING` 14 · priority weights 1.35 / 0.65 · withdrawal interest
penalty 6 (flat, deterministic).

## Status against the full redesign (2026-08 audit)

NIL shipped as its own slice, as planned above. Measured against the real
NCAA process and EA Sports College Football's Dynasty mode before scoping the
next slice, four things already have real parity and four do not.

**Already solid, no work needed:** `SEARCH_PROSPECTS`'s four types map
directly to real recruiting-service board-building; `EVALUATE_PROSPECT`'s six
types map to EA's scouting reveal (attributes, ceiling, motivations); prospect
`priorities` already *are* motivations/deal-breakers, read by
`prospectProgramFit`; and the coach trait system already prices a recruiting
specialist (the Closer) the way EA prices staff efficiency.

**Not built, and this is where the next slice goes — see
`RECRUITING_REDESIGN.md`:**

1. **`OFFER_PROSPECT` isn't a real offer.** It's a hardcoded alias for
   `INVEST_RECRUITING_POINTS { points: 10 }` (`index.ts:1715-1727`) — the same
   code path, the same command-arbitration bucket. Extending a scholarship
   offer carries no meaning of its own, which it does in both the real process
   and EA.
2. **No visits.** The only levers on a prospect are a flat points number and
   an NIL dollar amount. Real recruiting's official visit — and EA's
   visit-mapped-to-motivations mechanic — has no equivalent action here at
   all.
3. **Commitment is instant and permanent.** `resolveRecruitingMarket` drops a
   prospect from every future week's contest the moment he hits `COMMITTED`
   (`index.ts:2295`) — no flip risk, no signing period. The model even defines
   a `PROSPECT_SIGNED` event with a live UI render branch
   (`App.tsx:1857,1927`) that the simulation never emits; the real transition
   is the quieter `PROSPECT_ENROLLED`, fired once at rollover.
4. **Pipelines are one static number.** `homeRegionBias` doesn't accumulate —
   there's no memory of a program's recruiting relationship with a school or
   region strengthening over time.

A fifth item is a plain bug, not a design gap: the rollover enrollment loop
(`index.ts:4200-4204`) `break`s once `scholarshipLimit` is hit, leaving any
prospect still `COMMITTED` past the cap stuck in that status forever instead
of resolving to a terminal state.
