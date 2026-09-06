# The week card prices a week the button cannot produce

| | |
|---|---|
| **ID** | 2026-09-06-01 |
| **Severity** | **P1** — raised by qa-lead from the P2 the implementer filed; see "Severity" below |
| **Status** | fixed |
| **Area** | Weekly priorities / payoffs-are-visible |
| **Found by** | balance-tester (cycle 3, Brief D, D2(f)) |
| **Found in** | `f164d12` |
| **Run log** | `qa/runs/2026-09-05-balance.md` |

## Severity — qa-lead's ruling

Filed P2 by the implementer, **raised to P1**. Severity is the lead's call, not
the implementer's, and this is the case the front-door rule exists for: the
person who wrote the code was grading their own work.

Three reasons, none of which is about magnitude:

1. `expected-behavior.md` §3 is an invariant, and a finding against an invariant
   is P1 by default. Nothing here argues it down.
2. `qa/qa-process.md`'s own severity examples list *"A posted projection
   disagrees with the engine → **P1**"* verbatim.
3. Cycle 2 filed the structurally identical scouting-card defect
   (`2026-09-05-02`) as P1 on weaker evidence — one program, a few weeks. This
   is 237 of 237 rows across four independent leagues in one direction.
   Downgrading it would quietly re-calibrate the precedent on the stronger case.

The counter-argument, recorded and rejected: the gap is 13% of a currency that
pays out next season and blocks no career. P1 in this project is not
"career-blocking only" — it is "an invariant is broken", and this is the
invariant class that has produced half the serious defects in the repository.

**qa-lead did not independently re-run the reproduction**, against the standing
rule for P1s, because the fix was already in the working tree when triage
started and the code would have moved under the run. Instead both divergent code
sites were read directly and confirmed by the coordinator and by me. Recorded as
an exception, not a precedent.

## What happens

On the week screen, a priority card states what making it a priority will buy.
When the program has a free priority slot, the recruiting card posts a number
about 13% higher than the week actually delivers — a mean 53.81 posted against
46.86 delivered, on **237 of 237 rows across four independent leagues**, in the
same direction every time. The install and scouting cards diverge in the same
state by smaller amounts.

## Reproduction

```
seed:        card-prices-the-button
league size: 24
commands:    SET_WEEK_FOCUS with one fewer focus than focusCapacity,
             RECRUIT not among them
```

1. Begin a season and pick any program whose `focusCapacity` is 2 or more.
2. Set its standing priorities to `capacity - 1` entries, leaving one slot free
   and not choosing `RECRUIT`. This is the state the dashboard raises as a
   REQUIRED briefing item — *"a priority nobody has claimed"*.
3. Read the `RECRUIT` card's `focused` line from `weekPriorities`.
4. Press the card's button — that is, issue `SET_WEEK_FOCUS` with the focus list
   `[...standing, "RECRUIT"]`, which is what `toggle` produces.
5. Advance the week and read the recruiting points actually added.

The posted number and the delivered number differ.

## Expected

The number on a card is the number the engine will produce for the week the
card's own button creates. `CLAUDE.md`: *"a card that disagrees with the engine
breaks payoffs-are-visible, which is an invariant rather than a nicety."*

## Actual

Measured by `qa/scratch/d2d.mjs`, every program put one slot under capacity at
week 7, four leagues, seeds `qa-c3-slot-1` … `-4`:

| card | n | mean posted | mean delivered | mean gap | max abs gap | outside tol |
|---|---|---|---|---|---|---|
| **RECRUIT** | 237 | 53.81 | **46.86** | **−6.95** | 14.00 | **237 / 237** (±0.5) |
| INSTALL_DEFENSE | 237 | 73.60 | 72.44 | −1.16 | 2.80 | 117 / 237 (±0.5) |
| SCOUT | 94 | 2.35 | 2.25 | −0.11 | 0.30 | 67 / 94 (±0.05) |

Per seed the recruiting gap is −6.79 / −6.69 / −6.71 / −7.64. By capacity: at 2
it posts 53.74 and delivers 47.42; at 3 it posts 54.05 and delivers 45.05.

A second arm at *full* capacity (`qa/scratch/d2e.mjs`, n = 859) shows a smaller
divergence in both directions — under one point on average, worst case 4.0 — and
carries the control that makes this a diagnosis rather than a guess: **against
the focus list the card assumed, posted matched delivered on every single row.**
Against the list the button produces, it did not.

## Why it matters

Breaches **payoffs are visible**, one of the engine invariants, on the screen
the player opens every week. It is not an edge case the player has to go looking
for: a free slot is the exact state the dashboard actively directs them into,
and the number shown while they fix it is the wrong week's.

## Diagnosis

One rule — "which standing priority does a new one displace" — was implemented
twice and the two disagreed.

```ts
// packages/simulation/src/priorities.ts, the card's projection
[...chosen.slice(0, Math.max(0, chosen.length - 1)), focus]   // always drops the LAST

// apps/web/src/App.tsx, the button
[...chosen, focus].slice(-capacity.capacity)                  // appends; drops the OLDEST only when over
```

With a free slot the projection dropped a priority the button would have kept,
so the card priced a week with one fewer priority sharing the hours — which is
why it read high, and why the error is systematically one-directional. At full
capacity both drop one, but not the same one.

`planWeekHours` was already the single source of the *hours*. What was missing
was a single source for *the focus list a click produces*.

## Fix

`focusesAfterChoosing(chosen, focus, capacity)` and
`focusesAfterDropping(chosen, focus)` are exported from
`packages/simulation/src/priorities.ts`, and both `weekPriorities`'s projection
and the web app's `toggle` now call them. The button's rule won, because it is
the one the player experiences and the one whose behaviour was documented.

Covered by `tests/rng-distribution.test.mjs` — *"the recruiting card prices the
week the button actually produces"* — which asserts posted equals delivered for
every program with a spare slot in a 24-program league. Confirmed red against
the defect before it was made green.

## Verified fixed

<pending regression-tester>
