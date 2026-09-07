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

qa-lead, two fresh seeds, 72 programs, five seasons each:

| season | insolvent (a) | min (a) | insolvent (b) | min (b) |
|---|---|---|---|---|
| 1 | 0/72 | $4.3M | 0/72 | $4.4M |
| 2 | 0/72 | $1.2M | 0/72 | $2.3M |
| 3 | 1/72 | −$0.7M | 3/72 | −$1.0M |
| 4 | 3/72 | −$1.2M | 5/72 | −$3.8M |
| **5** | **7/72** | **−$2.7M** | **7/72** | **−$6.8M** |

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
- whether it is concentrated in LOW programs, which are designed to bleed.

The count itself is reproduced and is the finding. Do not treat the reporter's
C6/C7/C8 lines as attributions for it — they are separate observations awaiting
their own evidence.

## One measured thread worth pulling first

While adjudicating C5 (see `2026-09-06-09`) I measured budget change by win
count over 384 program-seasons, 24 programs, eight seasons:

```
 0W  n=  5  mean +$0.93M      8W  n= 32  mean  +$6.83M
 1W  n= 14  mean +$0.46M      9W  n= 35  mean  +$6.82M
 2W  n= 20  mean +$1.85M     11W  n= 16  mean +$12.01M
 4W  n= 43  mean +$2.81M     14W  n=  7  mean +$17.62M
```

**Every losing band is profitable**, against §3's stated *"a losing season (≥9
losses) −$0.6M to −$1.8M"*. Part of that is horizon — §3 measured one season at
league start and this pools eight — but it sits oddly beside 7 of 72 going
insolvent, which means the programs that fail are failing for a reason other
than losing football games. That is the thread: **what distinguishes the seven
from the sixty-five?** Facility upkeep and payroll are the obvious candidates and
neither has been measured against the insolvent set.

## Attribution — 2026-09-07, by the implementer

The thread above was pulled and **it does not lead where it was pointed**.
Harnesses: `qa/scratch/c3-econ/who-fails.mjs` and `why-low-fails.mjs`.
Three 72-program seeds, five seasons, 216 programs, 21 insolvent.

**First, a confound I introduced and had to correct.** Splitting the whole
league on solvency appeared to indict facilities and payroll exactly as
predicted — insolvent programs had built 1.48 levels against 2.51 and carried
$0.91M of payroll against $2.90M. That comparison is worthless. **Every one of
the 21 insolvencies is LOW**, and LOW builds less and pays less whatever
happens to it, so the split was measuring tier. Recorded because it is the same
mistake the run log's own process note warns about, and because the numbers
looked like a confirmation.

**Within LOW — 21 insolvent against 69 solvent — not one candidate separates
them:**

| | insolvent | solvent |
|---|---|---|
| facility levels built | 1.48 | 1.59 |
| total facility levels | 11.14 | 10.65 |
| staff payroll, weekly | **$0.91M** | **$1.33M** |
| opening budget | $6.50M | $6.50M |
| prestige | 55.00 | 55.16 |
| fan base | 29,408 | 32,924 |

The insolvent build the same, open on the identical reserve, and carry *less*
payroll. **Facility upkeep and payroll are both ruled out as written.**

**What does separate them is program character**, and by a factor of thirteen:

| character (within LOW) | insolvent | rate |
|---|---|---|
| DEVELOPER | 11/21 | **52%** |
| FRONTRUNNER | 8/24 | **33%** |
| TALENT_MAGNET | 1/21 | 5% |
| DIEHARD | 1/24 | 4% |

**The two failing characters fail for opposite reasons, and both are authored.**

*DEVELOPER is the cost side, and here upkeep is implicated after all — through
the levels a program is **born with**, not anything it builds.* Measured at
creation, before a week is played:

| character | facility levels | upkeep index (`Σ level^1.7`) | TRAIN | STADI | ACADE | RECRU | SCOUT |
|---|---|---|---|---|---|---|---|
| **DEVELOPER** | **11.0** | **22.3** | **4.0** | 2.0 | 3.0 | 1.0 | 1.0 |
| DIEHARD | 9.0 | 15.0 | 2.0 | 3.0 | 1.0 | 2.0 | 1.0 |
| TALENT_MAGNET | 9.0 | 15.0 | 1.0 | 2.0 | 2.0 | 3.0 | 1.0 |
| FRONTRUNNER | 8.0 | 12.7 | 1.0 | 3.0 | 1.0 | 2.0 | 1.0 |

A developer's weight room is authored at level 4, and upkeep is `level^1.7`, so
it carries **49% more upkeep than a diehard and 76% more than a front-runner
from the first week** — permanently, having chosen nothing. That is why "levels
built" showed nothing: the cost was never a decision.

*FRONTRUNNER is the revenue side, and this half is a hypothesis rather than a
measurement.* It has the **lowest** upkeep of the four, so cost cannot be its
cause. Ranking the four by the pricing posture recorded in `CLAUDE.md` orders
them the way the failures fall — front-runner prices at **0.900** of fair, the
lowest of the five cohorts, against diehard's 1.180, the highest — and a
front-runner's gate is authored to collapse when it loses, which a LOW program
does constantly. **Not verified.** It needs ticket price as a multiple of fair,
and gate revenue, per character within LOW across the five seasons.

## What this means for the band, which is the lead's call

`CLAUDE.md` states the design intent for character plainly: *"Character changes
**strategy**, not difficulty: a developer has a weight room and no recruiting
office, a talent magnet the reverse."*

Measured, at LOW tier, character changes difficulty by 52% against 4%. So the
question this issue actually raises is not "which number is mistuned" but
whether a LOW developer is meant to be a substantially harder game than a LOW
diehard. If it is, the ~3 band is wrong and should be restated per character. If
it is not, the authored facility spread needs a cost the character does not pay
for having been generated.

Both are design decisions rather than defects, which is why they are recorded
here rather than fixed. **No engine change made.**

## Fix

<pending — the attribution above needs a design ruling before there is
anything to fix>
