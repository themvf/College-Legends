# regression-tester run — 2026-09-04

**Agent:** regression-tester
**Target:** cycle 1 determinism baseline — establish the reference hash and run
the three determinism checks
**Build:** `bf977ff`

## Setup

| | |
|---|---|
| Seeds | `qa-baseline-2026-09` |
| League size | 24 for the determinism checks, 72 for the baseline hash |
| Seasons played | 1 for the checks, 3 for the baseline |
| Environment | headless, against `dist/` |

## What I did

The three determinism checks the charter requires, then recorded the cycle
baseline hash for future cycles to compare against.

```js
const playSeason = (state) => {
  while (state.phase === "REGULAR_SEASON") state = advanceWeek(state, planWeeklyCommands(state)).state;
  while (state.phase === "OFFSEASON") state = advanceOffseasonStep(state, planOffseasonCommands(state)).state;
  if (state.phase === "ROSTER_REVIEW") state = beginSeason(state);
  return state;
};
```

## Measurements

| check | result |
|---|---|
| 1. same-process replay | **PASS** — `5ddc857c0fda8d25` both runs |
| 2. save round trip | **FAIL** — `f5fb231e36deb7c8` vs `539784bcbbeb24b6` |
| 3. cycle baseline hash | `2fc3d90611ca97fb` |

**Cycle baseline:** seed `qa-baseline-2026-09`, 72 programs, 3 seasons →
`2fc3d90611ca97fb`. Future cycles compare against this.

| | |
|---|---|
| live state, 72 programs after 3 seasons | 28.7 MB |
| compressed save, 24 programs after 1 season | 0.58 MB |

Test suite: **248 engine + 15 web, all passing.**

## Candidate findings

1. **A saved career advances differently from one never saved** — filed as
   [`2026-09-04-01`](../issues/2026-09-04-01-save-load-diverges-via-trimmed-event-log.md),
   **P1**.

   Localised rather than reported raw. First diff after load was `eventHistory`
   alone (10,024 rows → 400), which is a deliberate save-size trim and not by
   itself a defect. The defect is that something *reads* it:

   | | in-memory | loaded |
   |---|---|---|
   | `WEEKLY_FINANCES` events | 96 | 0 |
   | programs with differing `lastWeeklyNet` | — | 24 of 24 |
   | facility upgrades planned next week | 17 | 11 |

   Observation is the table above. Diagnosis — that `selectFacilityUpgrade`'s
   `lastWeeklyNet` read is the coupling — is a hypothesis, though the six missing
   upgrades match it exactly.

## Clean results

- **Same-process replay is byte-identical.** The core RNG guarantee holds; this
  is not a general determinism failure.
- **The schedule survives the round trip identically**, so league generation and
  fixture building are unaffected.
- The full test suite passes, including the existing save round-trip assertion —
  see the issue for why its scenario is too narrow.

## Not filed, and why

- **`eventHistory` trimming on save.** Deliberate, documented in `CLAUDE.md` as
  part of getting a two-season career to ~3MB. It is the *reader* that is wrong,
  not the trim.
- **Live state at 28.7 MB** for 72 programs over 3 seasons. Above the ~23 MB
  noted at week 6 in `game-balance.md` §7, but that figure is a different point
  in a career, so this is not a like-for-like regression. Worth establishing a
  proper series in a later cycle.
