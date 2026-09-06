# Two of the five priority cards post a value a slot can never justify

| | |
|---|---|
| **ID** | 2026-09-05-12 |
| **Severity** | P3 |
| **Status** | open |
| **Area** | Weekly priorities |
| **Found by** | new-player-tester (cycle 2 cold read), measured by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F13) |

## What happens

The weekly priority screen offers five cards for one to three slots. On the
cards' own posted numbers, two of them can never win a slot, so the screen
resolves itself in week 1 and is never a decision again. The reporter set
priorities in week 1 of season 1 and did not open the screen again for the rest
of that season or the first four weeks of the next.

## Reproduction

Headless, deterministic:

```
seed:        qa-c2-f12
league size: 24
program:     program-4, focusCapacity 2
method:      prepareWeek(SET_WEEK_FOCUS focuses=[]) vs focuses=[f], week 1,
             read weekPriorities() either side
```

| card | leave it alone | make it a priority | marginal value of one slot |
|---|---|---|---|
| Install the offense | `63% of it holds up (2 reps)` | `73% (4 reps)` | **+10 points of execution** |
| Install the defense | `54% of it holds up (1 rep)` | `66% (4 reps)` | **+12 points** |
| Coach a player up | roster +27% faster | full spotlight, roster +54% | a permanent gain |
| Scout the opponent | `+1.8 to every unit` | `+2.1` | **+0.3 readiness** |
| Work the trail | `+38 recruiting points` | `+44` | **+6 of 44** |

Two slots, three cards worth taking. The reporter measured the same shape on a
different program and a different seed.

## Expected

`CLAUDE.md`, "Standing, not weekly": priorities are *designed* to carry over,
and a player with nothing to change advancing on one button is the intended
experience. What makes that safe is the stated re-prompt — *"the dashboard
briefing… flags when a card worth ≥65 is not being chased while every slot is
full"*. For that to mean anything the cards have to trade against each other.

## Actual

They do not, on the posted numbers. Two further observations that make it
worse in play rather than on paper:

- The scout card's numbers are wrong as well as small — see
  [2026-09-05-02](2026-09-05-02-scouting-card-posts-a-readiness-the-week-cannot-deliver.md).
  The delivered readiness is identical whether or not the slot is spent.
- The film room retargets itself to the next opponent automatically, which the
  reporter discovered by noticing the header change. So the scout card has no
  standing job either.

The `matters N/100` stakes number does not rescue it. In the same week the
dashboard called a fixture *"the game of your season"*, the scout card for that
fixture read `matters 35/100` with a delta of `+0.1`.

**Partly stale.** The trail card's marginal value was `+2 of 43` when the
reporter measured it and is `+6 of 44` now, because `ad06e2f` corrected the
formula it was posting. The finding survives that fix; the specific figure in
the run log does not.

## Why it matters

The weekly screen is the game's answer to "what am I spending this week". It
answers it once.

Filed P3, not P2: nothing computes wrongly, the system still functions, and
`CLAUDE.md` already records the open item — *"The stakes numbers are
hypotheses… the coefficients that turn '27 points of headroom' into '83' have
not been tuned against play."* This is that item, now with a measurement
against it.

## Diagnosis

*Hypothesis.* The two cheap cards are cheap because their payoffs are capped by
design — readiness saturates at `READINESS_CAP = 55` and recruiting points are
a small weekly trickle — while the install cards pay in execution, which is
worth ~5.7 margin a game at the top of its band. Either the weak cards need a
payoff on the same axis, or the screen needs to stop offering five options for
two slots when two of them are dominated at every state.

Balance work, not a one-line fix. Recommend the `balance-tester` measure the
marginal value of each slot across tiers and capacities before anything is
tuned — one program at one capacity is not a sample.

---

## Cycle 3 measurement — the sample this issue asked for

Run 2026-09-06 by `balance-tester` at `f164d12`
([`qa/runs/2026-09-05-balance.md`](../runs/2026-09-05-balance.md), D2), folded in
by qa-lead. **Grid: 4 leagues × 72 programs × 3 tiers × 3 focus capacities ×
5 cards × weeks 1/7/13. 864 marginal rows, 15 non-empty cells.** Plus a direct
margin A/B over 96 programs and 1,152 team-games per arm.

**The issue stays open, and it is now half the issue it was filed as.** Neither
"confirmed" nor "closed" is the honest verdict.

### Upheld, and much better evidenced: SCOUT

| | |
|---|---|
| marginal value of a slot | **+0.17 readiness** (sd 0.10), pooled over 864 rows |
| dominated in | **15 of 15** tier × capacity × week cells; never outside 0.10–0.26 |
| against the install cards | +10.58 and +13.15 points of execution, 10.0–13.7 in every cell |
| in a common currency | ≈ **0.15 margin** against install's ≈ **2.6**, on the project's own published anchors |
| direct A/B, one standing priority per program, strength-balanced within tier | **INSTALL_OFFENSE − SCOUT = +1.78 ± 0.76 margin a game** (t 2.35); INSTALL_DEFENSE − SCOUT = +1.64 ± 0.78 |
| SCOUT was the worst arm in | **4 of 4 seeds** and 3 of 3 tiers |
| named by the ≥65 re-prompt | **0 times in 780 program-weeks** |

The original figure for this row (`+0.3`) was measured before `941d42f` and is
stale. The corrected figure is **smaller, not larger**.

### Struck: RECRUIT

The issue's claim for the trail card **is not supported by this data and cannot
be by a one-season harness.** Its marginal value is +8.60 of 54.08 posted points
— **16%**, comparable in relative terms to INSTALL_OFFENSE's 10.58 of 73.37
(14%). Its payoff arrives in next season's class, so a harness that scores only
this season's margin reports it as worthless by construction.

Reopen this half only against a multi-season arm that scores the signed class.

### Confirmed fixed: the strongest supporting bullet

*"The delivered readiness is identical whether or not the slot is spent"* is no
longer true. `941d42f` made the branches differ; they differ by very little,
which is the surviving finding. The film-room retargeting observation stands and
is tracked separately as [`2026-09-06-05`](2026-09-06-05-the-scouting-card-and-the-payoff-event-describe-different-saturdays.md).

### The opposite of dominated: DEVELOP

Worth recording because the issue implies the screen is broadly broken and it is
not. DEVELOP has the **largest marginal value of the five** (+30.90), the
**highest stakes** (mean 66.4, 54.7% of rows ≥65), is the card the re-prompt
names **253 of 352 times**, and its roster-growth claim was verified against the
engine rather than trusted: card 1.252, measured 1.247, agreement to **0.4%**.

### And the re-prompt works

Cycle 2 called it "never fired usefully" on an eighteen-week anecdote. Over
**780 program-weeks**, across both an AI population that re-plans weekly and a
STANDING population whose priorities are stripped after week 1, it fired
**352 of 352 times its stated condition was met — no false positives, no false
negatives**. The safety net exists and works. It simply never names the two cards
nobody picks, which is a restatement of this issue rather than a separate one.

### What the fix has to be

Narrowed by the measurement. This is now **one card**, not two, and the target is
concrete: SCOUT needs to be worth something on the order of a point of margin a
slot rather than 0.15, or it should stop competing for a slot at all. The
`READINESS_CAP = 55` saturation named in the diagnosis above is the obvious lever
and remains untested.
