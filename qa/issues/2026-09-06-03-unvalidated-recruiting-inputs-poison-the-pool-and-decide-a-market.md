# Unvalidated recruiting inputs poison the points pool and can decide a contested market

| | |
|---|---|
| **ID** | 2026-09-06-03 |
| **Severity** | P2 — argued down from the P1 the reporter suggested; see "Severity" |
| **Status** | open |
| **Area** | Recruiting / command validation |
| **Found by** | edge-case-tester (cycle 3, Brief B, F1–F4 and F6) |
| **Found in** | `7963c0e` (engine identical to `f164d12`) |
| **Run log** | `qa/runs/2026-09-05-edge.md` |

## What happens

Four recruiting command handlers use a numeric or enum field in a comparison or
a table lookup without validating it first. A non-finite number or an unknown
enum value is therefore **accepted**, sets `recruiting.points` to `NaN`, and the
pool never recovers — a weekly refill is `+=`, so no week boundary heals it.
Every costed recruiting action then gates on `recruiting.points < cost`, which is
`false` against `NaN`, so the program recruits for free for the rest of the
career. The poisoned value also reaches the contested market, where it wins
prospects it should lose and, in one measured case, **changed the winner of a
contest between two other programs**.

Filed as one issue rather than five: one root cause, one fix pattern, five sites.

## Reproduction

```
seed:        qa-c3-market-1, -2, -3
league size: 72
commands:    advanceWeek(state, [{ type: "INVEST_RECRUITING_POINTS",
                                   programId, prospectId, points: NaN }])
```

Harnesses: `qa/scratch/c3-edge/t3-invalid.mjs`, `t3b-nan.mjs`,
`t3c2-nan-market.mjs`, `t3d-nan-control.mjs`, `t3f-enum.mjs`, `t4-odds.mjs`.

1. Take a real 72-program state at week 3 with the rival planner driving.
2. Issue the command above through `advanceWeek`. It is accepted; a
   `RECRUITING_INVESTMENT` event is emitted with `pointsSpent: NaN`.
3. Read `state.recruiting[programId].points` at weeks 4–8: `NaN` throughout.
4. Issue `SEARCH_PROSPECTS`, `EVALUATE_PROSPECT` and `SCHEDULE_VISIT`: all
   accepted, none charged.

## Expected

`expected-behavior.md` §2 — a contested market resolves all valid commands
together and no single program's input may decide another pair's contest.
`game-rules.md` §7 — every recruiting action has a stated price, charged from a
stated pool. The engine already refuses `0`, `-10`, `26` and `Infinity` on this
exact field with *"Choose an investment of 1–25 available Recruiting Points."*,
so the intent is not in doubt.

## Actual

The five sites, all measured through the command path against real fixtures —
nothing was written into `state`:

| # | input | result |
|---|---|---|
| F1 | `INVEST_RECRUITING_POINTS points: NaN` / `undefined` | accepted; pool `NaN` forever; all costed actions free |
| F2 | `SET_NIL_OFFER weeklyAmount: NaN` / `undefined` | accepted; `NIL_OFFER_SET` emitted with a `NaN` amount; every `amount > 0` guard skipped; `NaN` stored in `offersByProspect` |
| F3 | `DISCOVER_PROSPECTS searchType: "OUIJA_BOARD"`, `""`, `null`, `7` | accepted; **747 of 2,160 prospects revealed in one command**, charged nothing, pool `NaN` |
| F4 | `EVALUATE_PROSPECT evaluation: "TELEPATHY"`, `null`, `3` | accepted; junk persisted onto the prospect's evaluation list, which the NIL guard and the odds screen both read |
| F6 | `prospectOdds(..., { nilOffer: NaN })` | returns `percent: NaN`, note reads *"NaN%. You're NaN behind the leader of 3."* |

**The market consequence is the serious half.** `t3d.log`, three seeds, with two
valid controls that rule out "any accepted command shifts an RNG draw":

```
=== qa-c3-market-2  prospect-initial-1100  4 suitors  intruder=program-15 ===
  control: no extra command      winner=program-54  intruderScore=40.684
  valid NIL offer 5000           winner=program-54  intruderScore=49.782
  valid NIL offer 1              winner=program-54  intruderScore=40.699
  NIL offer = NaN                winner=program-15  intruderScore=NaN
  points = NaN                   winner=program-15  intruderScore=NaN
  points = 5 (control)           winner=program-54  intruderScore=44.434
```

The `NaN` bidder wins against a field whose real top score is 74.958 while his
own is 40.684. On `qa-c3-market-1` the `NaN` bidder does **not** win but a third
party does — the winner moves from `program-28` (113.658) to `program-14`
(113.342) — so a malformed command by a program that loses either way decided a
contest between two others.

## Why it matters

Not because a player can do it — they cannot, see below — but because the
engine's public API is a real contract with real consumers today. Every QA
harness in this cycle drives `advanceWeek` directly, and a harness that passes
`undefined` for a field gets a silently corrupted league that looks like a
balance finding rather than an error. That has a cost this project has already
paid twice, in a different form, for measurements taken against a state nobody
had validated.

## Severity — qa-lead's ruling

The reporter suggested **P1** and wrote *"the lead may reasonably downgrade it on
reachability; I would rather flag it and be overruled."* That is the right way to
report it, and I am overruling it to **P2**.

P1 in this project means an invariant broken, data lost, or a career that cannot
continue **by a route the game can produce**. Every route into this is a
hand-crafted command at the `advanceWeek` boundary, and the reporter verified
both ends rather than assuming:

- the shipped UI cannot emit it — the NIL control is `<input type="range">` read
  through `Number(event.target.value)`, and pursuit points come from fixed
  `[5, 10, 20]` buttons;
- the rival planner does not emit it — a sweep of **7,196 AI-planned commands
  over 12 weeks at 72 programs found 0 with a non-finite numeric field**;
- a save round-trip actually *heals* the poisoned state, because `NaN`
  serialises to `null` and `Math.trunc(null) === 0`, which is then correctly
  refused.

So no player-reachable invariant is broken and no career is at risk. It stays a
P2 rather than falling to P3 because the consequence is unbounded and
unrecoverable in memory, it corrupts a market between programs that did nothing
wrong, and the fix is small and entirely known.

## Diagnosis

Confirmed by reading, three variants of one mistake.

```ts
// index.ts:2733 — F1. Math.trunc(NaN) is NaN; all three comparisons are false.
const points = Math.trunc(command.points);
if (points < 1 || points > 25 || recruiting.points < points) { ...reject... }

// F2. Math.max(0, NaN) is NaN, so every subsequent amount guard is skipped.
const amount = Math.max(0, Math.round(command.weeklyAmount));

// F3/F4. An unknown key misses three tables at once: the cost lookup is
// undefined so the affordability gate is skipped and `points -= undefined`
// poisons the pool; the candidate filter falls through to the NATIONAL/ELITE
// default; and `candidates.slice(0, undefined)` returns the whole array.
RECRUITING_SEARCH_COSTS[unknown]   // undefined
RECRUITING_SEARCH_YIELDS[unknown]  // undefined
```

The market half, `index.ts:3636` and `:3650`: a `NaN` comparator return is
treated as `0` by `Array.sort`, so the ranking becomes arbitrary; and both gates
on the winner are `<` comparisons, which are `false` against `NaN`, so a `NaN`
leader clears the commitment threshold *and* the required-lead check
unconditionally.

## Also recorded, not filed

- **A command carrying another program's `programId` executes for that
  program.** Correctly not filed by the reporter and I agree: `advanceWeek` takes
  one flat list containing all 72 programs' commands, `programId` is the
  addressing field rather than a claim of authority, and there is nothing to
  check it against. It becomes a real defect the day a multiplayer or
  replay-from-untrusted-input path exists.
- **`prospectOdds` never re-checks `projectedRecruitingOpenings` in its
  `considering` branch**, while `resolveRecruitingMarket` refuses to award to a
  program at zero openings. Constructed, that posts `SIGN percent=100` to a
  program that cannot sign anybody — a §3 breach if a player could see it. The
  reporter **could not reach it and checked rather than assumed**: over three
  seeds × three weeks, every program at zero openings held zero live NIL offers,
  because a resolved contest deletes every program's offer on that prospect.
  Recorded so that a future change to offer expiry is flagged, not filed.

## Fix

<pending>
