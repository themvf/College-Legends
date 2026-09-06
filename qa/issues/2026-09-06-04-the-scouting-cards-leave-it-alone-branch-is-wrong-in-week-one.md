# The scouting card's "leave it alone" branch is wrong in week one

| | |
|---|---|
| **ID** | 2026-09-06-04 |
| **Severity** | P3 — argued down from P1-by-default; see "Severity" |
| **Status** | open |
| **Area** | Weekly priorities / scouting department |
| **Found by** | regression-tester (cycle 3, Brief E, F2) |
| **Found in** | `083127c`; reproduced by qa-lead at `f164d12` |
| **Run log** | `qa/runs/2026-09-05-regression.md` |
| **Residual of** | `2026-09-05-02` (P1, closed) |

## What happens

The scouting priority card states two numbers: what the week delivers if you
leave the film room alone, and what it delivers if you make it a priority. The
"make it a priority" branch was fixed in `941d42f` and is correct in every week
measured. The **"leave it alone" branch is 14% low in week 1** and correct from
week 2 onward.

## Reproduction

```
seed:        qa-cycle2-readiness (the closed issue's own seed), lead-f2-a, lead-f2-b
league size: 24
program:     program-4
commands:    prepareWeek with SET_WEEK_FOCUS focuses=["INSTALL_OFFENSE"],
             then advanceWeek with the rival planner's commands for everyone else
```

Harness: `qa/scratch/lead-e-f2.mjs`. The program holds exactly one priority so a
`WEEK_FOCUS_PAYOFF` event is emitted — none is emitted when the focus list is
empty — and the SCOUT card's `baseline` is then literally "what happens if you
leave the film room alone".

1. Begin a season and set one priority that is not `SCOUT`.
2. Read the `SCOUT` card's `baseline` line from `weekPriorities`.
3. Advance the week and read `WEEK_FOCUS_PAYOFF.scoutingReadiness`.

## Expected

`expected-behavior.md` §3: the posted number must be the number the engine uses.
Both branches of a card are posted numbers.

## Actual

Reproduced by qa-lead on the closed issue's own seed and two fresh ones,
3 of 3:

| week | card baseline | card focused | delivered |
|---|---|---|---|
| **1** | **1.10** | 1.50 | **1.28** |
| 2 | 1.10 | 1.50 | 1.14 |
| 3 | 1.10 | 1.50 | 1.14 |
| 4 | 1.10 | 1.50 | 1.14 |
| 6 | 1.60 | 1.90 | 1.62 |
| 7 | 1.10 | 1.50 | 1.14 |

Fresh seeds `lead-f2-a` / `-b`: 1.20 posted against 1.34 delivered in week 1,
1.20 against 1.21 in weeks 2–8. Week 5 is a bye and is issue `2026-09-06-05`.

It is a **residual, not a regression**: the pre-fix figures were 1.7 posted
against 1.28 delivered, and the direction has flipped from over-posting to
under-posting.

## Why it matters

The decision the card exists to support is the *difference* between the two
branches, and in week 1 the card states that difference as 0.40 when the engine
delivers 0.18 — a 2.2× overstatement of the marginal value of the slot. Week 1
is also the first time a new player ever reads this card.

## Severity — qa-lead's ruling

A §3 breach, therefore **P1 by default**, and argued down to **P3** on
consequence rather than on principle.

`0.18` readiness is worth about **0.16 points of margin** at the project's own
published anchor (a complete file ≈ 3.0 readiness ≈ +2.65 margin). Brief D
measured the whole SCOUT slot at **+0.17 readiness marginal value, worth about
0.15 margin against install's 2.6**, and the re-prompt names SCOUT in **0 of 780
program-weeks**. So this is a wrong number on the least consequential decision in
the game, in one week of fourteen, at a magnitude no player could act on
differently. It is wrong and it is survivable, which is the P3 definition.

It is filed rather than waived because it is the second time this exact card has
posted a number the week did not deliver, and because the committed guard test
still cannot see it — see below.

## Diagnosis

Hypothesis, the reporter's: the department files 10 points in week 1 against 8 in
later weeks, and the card projects the later-week figure regardless. Consistent
with the residual being week-1-only and with the sign, but not confirmed by
reading the code.

## Why the guard test does not see it

`tests/rng-distribution.test.mjs`' scouting-card assertion reads `card.focused`
against delivery, and reads `card.baseline` **only to check the two branches
differ from each other** — never against a week actually run without the focus.
The branch that is still wrong is the branch nothing asserts. See
`2026-09-06-07`.

## Fix

<pending>
