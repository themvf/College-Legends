# Saving and reloading a career changes how it plays out

| | |
|---|---|
| **ID** | 2026-09-04-01 |
| **Severity** | P1 |
| **Status** | fixed |
| **Area** | Save / load · Rival AI · Determinism |
| **Found by** | regression-tester (cycle 1 determinism baseline) |
| **Found in** | `bf977ff` |
| **Run log** | [`../runs/2026-09-04-regression.md`](../runs/2026-09-04-regression.md) |

## What happens

A career that is saved, reloaded and then advanced diverges from the same career
advanced without ever being saved. After one further season the two states
differ in `programs`, `players`, `prospects`, `recruiting`, `nil`, `depthCharts`,
`seasonHistory` and both stat tables.

The schedule is identical, so this is not a re-generation problem — the two
leagues play the same fixtures and reach different outcomes.

## Reproduction

```
seed:         qa-baseline-2026-09
league size:  24 programs
```

1. `beginSeason(createFictionalLeague("qa-baseline-2026-09", 24))`
2. Play one full season, including the offseason, with `planWeeklyCommands` /
   `planOffseasonCommands`.
3. `encodeSave` then `decodeSave` that state.
4. Advance both the in-memory state and the loaded state one further season.
5. Compare. `programs` and `players` differ.

Script used is in the run log.

## Expected

`agents/docs/game-design/expected-behavior.md` §1 and §9:

> The same seed plus the same commands must produce byte-identical state and
> events.

> A loaded career must advance to byte-identical state against one that was
> never saved.

## Actual

Measured immediately after load, before advancing:

| | in-memory | loaded |
|---|---|---|
| `eventHistory` rows | 10,024 | 400 |
| `WEEKLY_FINANCES` events | 96 | **0** |
| programs whose `lastWeeklyNet` differs | — | **24 of 24** |

`lastWeeklyNet` reads 0 for every program after a load, against real values of
−$346K, −$364K, −$551K and so on.

That changes rival decisions immediately. Facility upgrades planned for the
following week:

| | count | programs |
|---|---|---|
| in-memory | 17 | includes program-17, 18, 19, 21, 22, 24 |
| loaded | 11 | those six are missing |

Six programs make a different decision purely because the game was saved.

## Why it matters

This is the invariant the whole QA process rests on. Reproducing any bug from a
seed assumes a save is a faithful snapshot; it currently is not.

For a player it means a career is not the same career after they close the tab.
Rivals that would have built facilities do not, and the divergence compounds
every season.

## Diagnosis

*Hypothesis, but strongly evidenced by the measurements above.*

Two behaviours that are individually correct combine badly:

1. **The save deliberately trims `eventHistory`** — 10,024 rows down to 400.
   This was intentional, part of getting a two-season career to ~3MB.
2. **`selectFacilityUpgrade` reads the event log.** The rival planner derives
   `lastWeeklyNet` from "one backward pass over the capped event log" to decide
   whether a program can carry a new facility's upkeep.

The trim removes every `WEEKLY_FINANCES` event, so after a load the planner sees
0 for every program and refuses upgrades it would otherwise have made.

This was introduced by `0a8ba8a` ("Stop rivals building themselves insolvent"),
which added the `lastWeeklyNet` read. Before that change nothing in the engine
read the event log to make a decision, so trimming it was safe.

**The general rule this breaks:** the event log is a record, not gameplay state.
Anything the engine reads to make a decision must live in state that survives a
save.

## Why the existing test did not catch it

`tests/simulation.test.mjs` asserts a loaded career advances to byte-identical
*programs*, but the save/load point and the advance in that test do not span a
week-1 facility decision with a populated finance history. The assertion is
right; its scenario is too narrow.

## Fix

`Program.lastWeeklyNet` is written by the weekly finance step, on the same line
that moves the budget, and the rival planner reads it from there. The backward
pass over `eventHistory` is gone — so the coupling is gone, and the read is
cheaper than the scan it replaces. `decodeSave` backfills the field to 0 so an
older save still loads.

The diagnosis in this issue was correct.

## Verified fixed

The reporter's own repro, re-run: seed `qa-baseline-2026-09`, 24 programs, one
season, save, then a further season either side.

| | hash of `programs` + `players` |
|---|---|
| never saved | `a94ee420ac469144` |
| saved and reloaded | `a94ee420ac469144` |

Two regression tests, both confirmed red against the pre-fix build and green
after — a test that has not been run against the defect is not a regression
test:

- **The existing round-trip test was widened.** It advanced *one week* and, more
  importantly, copied `loaded.eventHistory` onto the in-memory state before
  comparing — which handed both sides the same trimmed log and made them agree
  about a number that was wrong in both. That is why it passed. It now plays a
  full season on each side, with rivals planning, each reading its own log.
- **A new test states the rule**: `weeklyBusinessPlanningKnowledgeViews` must be
  identical with `eventHistory` emptied. Two weaker versions of this assertion
  were written and thrown away first — comparing planned commands after a real
  save passes vacuously, because at most weeks every rival declines a facility
  regardless and the two empty lists match. The view is corrupted at every seed
  and every week; the commands are not.

Full suite: 249 engine tests pass.
