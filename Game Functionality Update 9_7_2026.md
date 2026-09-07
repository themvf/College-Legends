# Game Functionality Update — 7 September 2026

**Status: every P1 is fixed. 23 of 30 issues are closed. Beta testers can play.**

Remaining: one P2, five P3s, one P4. Nothing open blocks a career.

---

## Can beta testers play?

Yes. This was the QA lead's finding after the first real measurement the game
has had, and the engine's load-bearing guarantees all hold:

- determinism passes all three checks
- contested markets resolve byte-identically across five command orderings and
  three program-iteration orders, at 72 programs
- the scholarship cap holds at the boundary and one past it, with zero orphans
- all 36 phase and offseason-step refusals name the rule that owns them
- `prospectOdds` — the newest number in the game, never previously checked — is
  calibrated at all ten deciles
- four of the five priority cards post exactly what the week delivers, including
  three nobody had ever checked

The lead's verdict: **"more playable in the loop, less trustworthy in the
ledger."** Its recommendation was *fix first, then ship*, gated on three items.
Two are fixed. The third turned out not to be a fix at all — see below.

---

## Fixed this cycle

Each confirmed red against its own defect before being made green.

**The priority card priced a week the button could not produce.** One rule —
which standing priority a new one displaces — was implemented twice and the two
disagreed. With a free priority slot the card posted a recruiting number 13%
above what the week delivered, on 237 of 237 rows across four leagues, always in
the same direction. A free slot is not obscure: the dashboard raises it as a
REQUIRED item, so it is the exact state the game pushes players into. Now a
single shared function, called by both the projection and the button.

*Filed P2 by the implementer and raised to P1 by the QA lead*, which is the
review process working — the person who wrote the code was grading their own
work.

**Unvalidated recruiting inputs poisoned the pool permanently.** `Math.trunc(NaN)`
is `NaN` and every comparison against it is false, so a malformed value walked
past guards that correctly refuse 0, −10 and Infinity. `recruiting.points` never
healed, because the weekly refill is `+=`. A `NaN` bidder then cleared both gates
in the contested market and in one measured case decided a contest between two
*other* programs. Not reachable from the shipped UI and never emitted by the
rival planner in 7,196 commands, so no career was ever at risk — but every QA
harness drives the engine directly, where one bad value yields a silently
corrupted league that reads as a balance finding rather than an error.

**The inbox reported other programs' NIL offers as the player's own** — *"Nicholas
Reed took your $850 a week offer"* for offers never made. This was the same
defect fixed five weeks earlier for booster events by adding a type to a list, so
we did not add another type: event classification is now total and asserted, and
the test enumerates event types **by playing two seasons**, not by reading the
type definitions — a search over those definitions missed the very type the test
exists for.

**A committed recruit's NIL money was invisible, then bookable twice.** His card
read "No NIL offer is active" while the HUD showed the program paying him, and
re-entering the offer reserved the same money a second time against donor
capacity — $4K of a $49K ceiling for one recruit. The engine was correct
throughout; only the screen was wrong.

**Earlier in the cycle:** save/load divergence via the trimmed event log, a
white-screen crash on the recruiting board, a scouting card posting an
unreachable readiness, the offseason having no navigation, the last game of the
season getting no postgame, and the coaching market offering the coach it had
just hired.

---

## The one P2 left needs a decision, not code

**Insolvency runs 7–9 of 72 programs by season five, against a stated ~3.**

Both originally suspected causes are ruled out. Within LOW tier — where all 21
measured insolvencies occur — the failing and surviving programs build the same
number of facilities (1.48 vs 1.59), open on an identical $6.50M reserve, carry
identical prestige, and **the insolvent carry less payroll, not more.**

What separates them is program character, by a factor of thirteen:

| character (within LOW) | insolvent | rate |
|---|---|---|
| DEVELOPER | 11/21 | **52%** |
| FRONTRUNNER | 8/24 | **33%** |
| TALENT_MAGNET | 1/21 | 5% |
| DIEHARD | 1/24 | 4% |

The two failing characters fail for opposite reasons. A developer's weight room
is *authored* at level 4, and upkeep scales as `level^1.7`, so it carries **49%
more upkeep than a diehard from the first week, having chosen nothing** — which
is why "facilities built" showed nothing, since the cost was never a decision. A
front-runner has the lowest upkeep of the four and so cannot be failing for that
reason; the likeliest explanation is its pricing posture, the lowest of the five
cohorts, combined with a gate authored to collapse when the team loses. That
second half is explicitly a hypothesis, not a measurement.

**Why no fix was made.** The design documentation states that character changes
*strategy, not difficulty*. Measured, at LOW tier it changes difficulty from 4%
to 52%. The question is therefore whether a LOW developer is meant to be a
substantially harder game than a LOW diehard:

- **If yes** — the ~3 band is wrong and should be restated per character.
- **If no** — a program should not pay upkeep on facility levels it was
  generated with rather than built.

Both change what the game *is*, rather than repairing a defect, so this is a
design call rather than a tuning task.

**Impact on the beta is minimal.** It is a rival-league effect over five seasons.
A tester playing one or two seasons will not see it, and their own program is the
one they control.

---

## What actually stands between us and a useful beta

Not the remaining issue list. The QA lead was direct: **the clarity and
onboarding work identified in the previous cycle remains a bigger obstacle to a
useful beta than anything in this report.** Two cold-read testers have now
stopped at the same place. That work is unstarted.

The five remaining P3s are, by comparison, minor: a scouting card whose figure is
wrong in week one, a card and its payoff event describing different Saturdays, an
inconsistent phase guard, two priority cards posting a value a slot cannot
justify, and nine earlier fixes that shipped without tests.

---

## Confidence in this report

The full suite is green — 261 engine tests and 23 web tests.

Two caveats worth stating plainly:

**One issue was recorded as open when it had been fixed**, and the tracker was
only corrected because the code was checked rather than the file trusted. The
status list is only as reliable as its last edit.

**The first attempt at the insolvency analysis produced a false confirmation.**
Splitting the whole league on solvency appeared to convict facility spending and
payroll exactly as predicted — until it became clear that every insolvency is LOW
tier, and LOW builds less and pays less regardless. The comparison was measuring
tier, not cause. It is recorded in the issue as a caution, because the numbers
looked like proof.
