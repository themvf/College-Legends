# The scouting card and the week's payoff event describe different Saturdays

| | |
|---|---|
| **ID** | 2026-09-06-05 |
| **Severity** | P3 |
| **Status** | open |
| **Area** | Weekly priorities / scouting department |
| **Found by** | regression-tester (observation, not filed) and balance-tester (D2(b) measurement), merged by qa-lead |
| **Found in** | `f164d12` |
| **Run logs** | `qa/runs/2026-09-05-regression.md`, `qa/runs/2026-09-05-balance.md` |

## What happens

The scouting priority card posts readiness for **the game the film room is aimed
at**, which may be weeks away. `WEEK_FOCUS_PAYOFF` reports the readiness **this
Saturday actually received**. Neither number is wrong on its own terms, and the
two are shown to the player one after the other — the card before the week, the
payoff event on the postgame screen the design describes as "Saturday names
Monday".

On a bye week the card reads +1.1 to +1.2 and the payoff event reads 0.00. On a
played week where the film is aimed elsewhere, the card can read +3.0 while the
week delivers exactly nothing to the game just played.

## Reproduction

```
seed:        qa-cycle2-readiness, lead-f2-a, lead-f2-b
league size: 24
program:     program-4
week:        5 (bye)
commands:    prepareWeek with SET_WEEK_FOCUS focuses=["INSTALL_OFFENSE"],
             then advanceWeek
```

Harness: `qa/scratch/lead-e-f2.mjs`. Reproduced by qa-lead, 3 of 3 seeds.

| seed | week | card | `WEEK_FOCUS_PAYOFF.scoutingReadiness` |
|---|---|---|---|
| `qa-cycle2-readiness` | 5 (bye) | +1.10 | **0.00** |
| `lead-f2-a` | 5 (bye) | +1.20 | **0.00** |
| `lead-f2-b` | 5 (bye) | +1.20 | **0.00** |

## Scale

Byes are the loudest case but not the common one. Brief D measured the general
case over 864 program-weeks across four leagues at 72 programs, weeks 1/7/13:

| | |
|---|---|
| rows where the film room is aimed at a **future** opponent | **217 of 864 (25%)** |
| mean card figure on those rows | **+2.73** |
| mean readiness delivered to that week's game | **+0.36** |
| rows delivering exactly **+0.00** while the card read +2.7 to +3.0 | **88** |

## Expected

`expected-behavior.md` §5 — the player must be able to observe what a decision
did. `CLAUDE.md`, on the payoff event: *"`WEEK_FOCUS_PAYOFF` is emitted after
every week with what the priorities actually bought… A player repeats behaviour
they were thanked for."*

## Actual

On a bye, the payoff event says the film room bought nothing. It banked 1.1–1.2
readiness onto a named future opponent, which is exactly what the department is
designed to do and exactly what the card said it would do.

## Why it matters

This is **not** a §3 posted-versus-delivered breach and should not be filed as
one — the two numbers measure different quantities, and both are individually
correct. It is a legibility defect: the one event whose stated job is "what your
priorities bought this week" under-reports the one priority whose whole design is
to pay on a Saturday other than this one. A quarter of all weeks are affected and
the affected weeks are, by construction, the ones where the player deliberately
aimed the film room at the game that matters.

P3 rather than P2 because the decision remains usable — the card names the
program it is scouting in its own title (`Scout {opponent.name}`) — and because
Brief D measured the SCOUT slot as the least consequential of the five.

## Diagnosis

Hypothesis. `WEEK_FOCUS_PAYOFF` carries one `scoutingReadiness` field, scoped to
the game just played. A payoff event that reported *which* opponent the week's
film went to, and how much, would describe the same thing the card describes.
Nothing in the engine is wrong; the event is one field short of being able to
tell the truth.

## Why the guard test does not see it

`tests/rng-distribution.test.mjs` skips these weeks with
`payoff.scoutingReadiness === 0`. That is the second skip in that test, and both
skips hide something — the reporter's own note. See `2026-09-06-07`.

## Fix

<pending>
