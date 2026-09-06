# Insolvency runs two to three times the stated band by season five

| | |
|---|---|
| **ID** | 2026-09-06-08 |
| **Severity** | P2 — argued down from the P1 the reporter suggested; see "Severity" |
| **Status** | open |
| **Area** | Economy |
| **Found by** | economy-tester (cycle 3, Brief C, C1) |
| **Found in** | `7963c0e` (engine identical to `f164d12`) |
| **Reproduced by** | qa-lead, fresh seeds, `f164d12` |
| **Run log** | `qa/runs/2026-09-05-economy.md` |

## What happens

`game-balance.md` §3 states **~3 of 72 programs insolvent by season five**.
The measured figure is **7 to 9**, and the count is accelerating rather than
settling.

## Reproduction

```
seed:        lead-c1-a, lead-c1-b (qa-lead); qa-c3-econ-72, qa-c3-econ-72b (reporter)
league size: 72
seasons:     5, rival planner driving both phases
```

Harness: `qa/scratch/lead-c1-insolvency.mjs`. Count programs with
`budget < 0` at the end of each offseason.

## Expected

`game-balance.md` §3: *insolvent by season 5, of 72 — **~3***.

`CLAUDE.md` states the design intent behind that number explicitly: *"The slow
drift itself is deliberately left in… it now takes about twenty seasons rather
than five, so a program failing is a story that happens once in a dynasty
instead of a third of the league quietly dying inside one career."*

## Actual

qa-lead, two fresh seeds, 72 programs:

| season | `lead-c1-a` | `lead-c1-b` | min budget (a) |
|---|---|---|---|
| 1 | 0/72 | 0/72 | $4.3M |
| 2 | 0/72 | 0/72 | $1.2M |
| 3 | 1/72 | 3/72 | −$0.7M |
| 4 | 3/72 | — | −$1.2M |
| **5** | **7/72** | — | **−$2.7M** |

The reporter measured **9 of 72** on `qa-c3-econ-a` with the same accelerating
shape (0, 0, 1, 4, 7 by season) and re-ran on a second wide seed specifically to
test whether the figure was seed-specific. It is not: four independent 72-program
leagues all land above the band.

Median budget rises across the same five seasons ($12.7M → $18.2M) and the
maximum rises far faster ($33.1M → $82.8M), so this is the spread widening at
both ends rather than the league as a whole failing.

## Why it matters

The band is not decoration. It was set by the work recorded in `CLAUDE.md` under
"What was actually bankrupting the league", which took insolvencies from 22 of 72
to 3 and identified two distinct causes to get there. A drift back to 7–9 is
between a fifth and a third of the way back to the state that work fixed, and the
acceleration means the season-5 number understates where it goes.

## Severity — qa-lead's ruling

The reporter suggested **P1**. Ruled **P2**, and this one is settled by the
process document rather than by argument: `qa/qa-process.md`'s severity examples
list *"Insolvency at 20 of 72 instead of ~3 → **P2**"* verbatim. 7–9 of 72 is a
long way inside that example.

No invariant is breached, no career is blocked, and a program going under is a
designed outcome — what is wrong is the *rate*. That is the definition of a
system producing wrong results, which is P2.

## What this does not yet say

The reporter's run log carries only its summary table at the time of triage; the
per-finding detail sections were not written. So the **cause** is unattributed
and everything below is open:

- whether the accelerating shape continues or plateaus after season five;
- whether it is concentrated in LOW programs, which are designed to bleed;
- whether it interacts with `2026-09-06-09` (winning versus losing).

The count itself is reproduced and is the finding. Do not treat the reporter's
C6/C7/C8 lines as attributions for it — they are separate observations awaiting
their own evidence.

## Fix

<pending>
