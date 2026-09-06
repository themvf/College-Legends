# The incumbent filter deleted the scheme-coverage guarantee

| | |
|---|---|
| **ID** | 2026-09-06-02 |
| **Severity** | P2 |
| **Status** | fixed in `f164d12` |
| **Area** | Coaching market / offseason |
| **Found by** | regression-tester (cycle 3, Brief E, F1 and F4) |
| **Found in** | `083127c` |
| **Run log** | `qa/runs/2026-09-05-regression.md` |
| **Regression of** | `2026-09-04-04`, reopened by the fix for `2026-09-05-11` |

## What happens

After a program has hired anybody for a post, that post's coaching market
permanently returns five candidates instead of six in every later season, and
the man removed is a stranger rather than the incumbent. Because the removed
slot is index 0, and index 0 is the slot that guarantees every market holds
somebody who runs the program's own scheme, coordinator posts start appearing
with **no reachable candidate who runs the scheme** — which is the exact state
issue `2026-09-04-04` was filed and fixed to prevent.

## Reproduction

```
seed:        qa-baseline-2026-09  (also qa-c3-guarantee-1..4)
league size: 24 and 72
commands:    play three full seasons with the rival planner driving both phases,
             then inspect every coordinator market at the offseason COACHING
             step and at ROSTER_REVIEW
```

1. Play at least two seasons so at least one hire has happened per post.
2. At the next `COACHING` step, read `staffCandidatesFor(state, programId, role)`
   for every coordinator post.
3. Count markets returning five candidates rather than six, and count posts where
   the incumbent's scheme fit is below the briefing item's own 0.78 threshold and
   no reachable candidate clears it either.

## Expected

`2026-09-04-04`'s fix installed one guarantee: candidate index 0 of every market
is always reachable and always runs the program's own scheme, so the REQUIRED
briefing item *"replace him, or change what you run"* always has at least one
branch available. `game-rules.md` §1 lists staff hiring as legal in
`ROSTER_REVIEW`; the briefing must not direct a player at a decision with no
legal move.

## Actual

Both scales, both builds, from `qa/runs/2026-09-05-regression.md`:

| | `083127c` | `02c3c52` |
|---|---|---|
| coordinator posts with no reachable candidate at fit ≥ 0.78 (4 leagues × 24 programs × 4 seasons, 768 posts) | **10** | **0** |
| posts flagged with no on-scheme candidate, over 1,824 preseason scheme switches | **22** | **0** |
| the removed candidate was `:candidate:0` | **22 of 22** | — |
| that candidate's scheme fit | **1.00** | — |

The underlying slot deletion, measured on `qa-baseline-2026-09` over four
seasons at 72 programs — this is E's F4 and it is the same defect, not a second
one:

| | |
|---|---|
| markets returning 6 candidates | 1,023 |
| markets returning 5 | **114 (10.0%)** |
| removals by season | 18 → 38 → 58, accumulating |
| removed man shares the incumbent's name | **0 of 114** |
| removed man was the best available in that market | **25 of 114** |
| rating(removed) − rating(incumbent) | min −21, median −8, max +9 |

## Why it matters

An unresolvable REQUIRED item does not cost the player the item — it costs them
the briefing, which is the game's whole answer to "what do I do now". That is
the finding `2026-09-04-04` recorded, and it came back.

The rival planner is unaffected (E3/E4: zero selection changes, churn identical
at 0.531 either side), which is why nothing in the suite or the determinism
baseline moved. **Player-facing only, and therefore invisible to every automated
check the project had.**

## Diagnosis

Confirmed, not hypothesised, by the fix. `staffCandidates` forks its RNG on
`("staff-market", season, programId, role)`, so rating, name, trait and scheme
are re-drawn every season — but the candidate id was
`${programId}:${role}:candidate:${index}`, with no season in it. A coach hired
from slot *k* therefore carried a staff id that matched slot *k* of that market
forever, so the new "filter whoever already holds the post" removed a different
man from every later season's market.

## Why the guard test could not see it

`tests/offseason-staff-camp.test.mjs` asserted the coverage guarantee on
`createFictionalLeague(seed, 24)` — season zero, nobody has hired, the filter has
nothing to remove. The issue-11 test in the same file went further and asserted
*the shrink* (`reopened.length === offered.length - 1`) without checking what had
been removed, so it certified the defect.

This is the third instance in this repository of "the test passed because it
tested the code rather than the outcome", and the second this cycle. See
`2026-09-06-07`.

## Fix

`f164d12`. The candidate id carries the season:
`${programId}:${outgoing.role}:${state.season}:candidate:${index}`. New test
plays seasons so the market has a history, and asserts both the coverage
guarantee and that the id is season-scoped; both were confirmed red against the
regression.

The determinism baseline moves `55e8ac644f4875c2` → `1dcc43de273f95ad` as a
result. Nothing about the simulation changed and that was established rather
than assumed — 58 hires planned across the scenario, identical programs and
posts in the same order on both builds, identical league fingerprint at 24
programs, and the entire delta is one stored string in `seasonHistory`
(`program-62-staff-program-62-HEAD-COACH-2027-candidate-0`), because a coach
hired out of the market later won an award and the award record keeps his staff
id.

## Verified fixed

<pending regression-tester, cycle 4>
