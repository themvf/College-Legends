# Nine cycle-2 fixes shipped with no test, and two of the guards that exist cannot see their defect

| | |
|---|---|
| **ID** | 2026-09-06-07 |
| **Severity** | P3 |
| **Status** | open |
| **Area** | Test coverage / process |
| **Found by** | regression-tester (cycle 3, Brief E, E6 and F3); second half added by qa-lead |
| **Found in** | `083127c` |
| **Run log** | `qa/runs/2026-09-05-regression.md` |

## What happens

Thirteen cycle-2 issues were closed across ten commits. **Nine of the thirteen
carry no committed test.** All nine live in five `apps/web/src/App.tsx`-only
commits.

The more useful half, which the lead is adding: **two of the four fixes that
*do* carry a test carry a test that provably cannot see the defect it guards.**
Both were demonstrated this cycle, by regressions the suite stayed green
through.

## The nine without a test

| commit | issues left untested |
|---|---|
| `94c626f` | `-04` depth chart, `-07` development screen |
| `050d1f5` | `-05` inbox, `-06` coach install number |
| `02288a2` | `-09` offseason navigation |
| `86fd504` | `-03` scheme change price / fit |
| `3006a35` | `-08` last Saturday postgame |
| `0e30ec5` (App.tsx half) | `-14` national press naming |
| `d022c4b` (App.tsx half) | `-10` injury sentence |

Four do carry one: `-01` (`Recruiting.test.tsx`), `-02`
(`rng-distribution.test.mjs`), `-11` (`offseason-staff-camp.test.mjs`),
`-13` (`ErrorBoundary.test.tsx`).

## The two guards that cannot fire

**`-11`, `tests/offseason-staff-camp.test.mjs`.** It asserts the scheme-coverage
guarantee on `createFictionalLeague(seed, 24)` — season zero, nobody has hired,
so the filter it exists to check has nothing to remove. The same file's issue-11
assertion goes further and asserts *the shrink*
(`reopened.length === offered.length - 1`) without checking **what** was removed,
so it actively certified the regression. Measured consequence:
`2026-09-06-02`, 22 of 1,824 scheme switches with no legal move, suite green
throughout.

**`-02`, `tests/rng-distribution.test.mjs`.** It asserts `card.focused` against
delivery and reads `card.baseline` only to check the two branches differ from
each other, never against a week actually run without the focus. Measured
consequence: `2026-09-06-04`, the baseline branch still 14% wrong in week 1, on
the issue's own seed. The same test skips bye weeks with
`payoff.scoutingReadiness === 0`, which hides `2026-09-06-05`. Both skips hide
something.

## Expected

`CLAUDE.md`: *"Correctness belongs in unit tests; statistical behavior belongs in
committed distribution tests with tolerances."* `qa/issues/_template.md`: *"A fix
without a test is itself a P3 finding."*

## Why it matters

The pattern in every subtle defect this repository has had is that **the test
passed because it tested the code rather than the outcome**. This cycle produced
two more instances of it, both against tests written specifically to guard the
issues that regressed. A test that has not been run red against the defect it
guards is not a regression test — a rule this project already wrote down after
cycle 1's save/load work, and then did not apply twice.

Filed as one issue rather than nine, per the brief.

## Not a defect in the product

This is a process finding and no player is affected. P3 rather than P4 because
two of the three P1/P2 findings in cycle 3 are regressions of cycle-2 fixes that
a correctly scoped test would have caught before they shipped.

## Fix

<pending>
