# Scheme change has no posted price, and roster fit is not comparable between seasons

| | |
|---|---|
| **ID** | 2026-09-05-03 |
| **Severity** | P2 |
| **Status** | fixed |
| **Area** | Career loop / Onboarding |
| **Found by** | new-player-tester (cycle 2 cold read) |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F4) |
| **Recurrence of** | cycle 1 F5, second half — see `qa/runs/2026-09-04-new-player.md` |

## What happens

At the second preseason a cold player is asked to decide whether to change
scheme. The screen posts two numbers in two units — `Roster fit 47–57%` against
`installs it to 64%` for staying, `74–84%` against `53%` for switching — and
states the cost of switching only as a mood:

> "Going another direction isn't a mistake — it's a rebuild, and it'll cost you
> until you recruit the right kids."

No number, anywhere, for what a point of either is worth. The reporter switched
"purely because the word *Workable* sounds worse than *Built for it*."

Compounding it: both of their schemes fell from best-on-the-board to worst in
one offseason, with nothing on any screen attributing the move to anything they
did.

| | preseason 2027 | preseason 2028 |
|---|---|---|
| Spread tempo (what they ran) | `66–76% · Good fit` | `47–57% · Workable` |
| Zone blitz (what they ran) | `71–82% · Good fit` | `44–54% · Workable` |

## Reproduction

Headless, two leagues, 48 programs, one full season and offseason each:

```
seeds:       qa-c2-fit-1, qa-c2-fit-2
league size: 24 each
measure:     rosterSchemeFit(roster, side) for the program's OWN scheme, at
             league creation and again at the second ROSTER_REVIEW
```

## Expected

`expected-behavior.md` §3 names the decisions that must expose a projection.
Scheme is not on that list — which is itself the gap, because it is the largest
strategic decision the game offers and the only one made without a posted
price. `game-balance.md` §5 states the guard rails a system advantage is worth
(≤50% of a full tactical counter, i.e. ≤1.35 points of scoring); none of that
reaches the screen.

## Actual

Measured over 96 program-sides:

| | measured |
|---|---|
| median move in a program's own scheme fit over one offseason | **9 points** |
| p90 | 21 |
| max | 30 |
| verdict changed | 53 of 96 |
| verdict jumped two bands | 2 of 96 |
| `Good fit`/`Built for it` → `Wrong personnel` | **0** |
| **own scheme fell from #1 on the board to #4 or #5** | **14 of 96 (15%)** |

Examples of the last row: `program-9 off 75→50`, `program-17 off 74→49`,
`program-2 def 77→49`.

So the cycle-1 fix to the saturating display scale **holds** — the median move
is the 9 points `CLAUDE.md` claims and nobody lands in "Wrong personnel". What
is left is a fat tail: one program-side in seven sees a 15–30 point fall with no
explanation offered, and the reporter drew two of them in one offseason.

Reading the implementation: `rosterSchemeFit` centres every scheme on 64 and
spreads the options **against each other** on the same screen
(`centre = clamp(64 + (raw − average) × gain, 24, 94)`, with `gain` capped so
the widest deviation maps to 15). The displayed percentage is therefore a
ranking of five options rendered as an absolute, and two such numbers from
different seasons are not comparable at all — which is exactly the comparison
the screen invites a player to make.

## Why it matters

The biggest strategic decision in the game is made against a number the game
re-normalises behind the player's back, with no price on either branch. A cold
player made it on a word.

## Diagnosis

*Hypothesis, two parts.* (a) The fit percentage needs either an absolute
anchor or a label that stops it reading as one — "2nd of 5 for this roster"
cannot mislead the way "52%" does. (b) The switching cost that *does* exist is
the coordinator's scheme-fit drop (the reporter measured install 64% → 53%),
and it is computable before the switch — `installIfScheme` already posts it per
option. Stating "switching costs you 11 points of install until you hire or he
learns it" would price the decision with a number the engine already has.

**Not filed:** the `CLAUDE.md` rule "switch systems and keep about half" the
install. There is no stored durable install value — `planExecution` recomputes
from coordinator and reps every week — so that is an unbuilt system, not a
broken one (`expected-behavior.md`, "Missing systems").
