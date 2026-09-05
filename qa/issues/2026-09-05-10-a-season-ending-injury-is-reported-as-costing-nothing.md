# A season-ending injury is reported as costing 0.0%

| | |
|---|---|
| **ID** | 2026-09-05-10 |
| **Severity** | P3 |
| **Status** | open |
| **Area** | Injuries / health |
| **Found by** | new-player-tester (cycle 2 cold read), measured by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F15) |

## What happens

> "Mario White suffered a broken collarbone and is out for the remainder of the
> season. Mason Black moves into the rotation, affecting pass offense.
> **Pass offense falls from 76.1 to 76.1, a 0.0% drop in the unit rating.**"

The same template works perfectly elsewhere — *"falls from 76.1 to 75.4, a 0.8%
drop"* — and the reporter singles that version out as the best-written
consequence in the game. The failure is the case where the number is zero: the
sentence says a unit was affected and then reports no effect, and the lesson a
player draws is that depth does not matter.

## Reproduction

Headless, three leagues, one season each, 24 programs:

```
seeds:       qa-c2-inj-1, qa-c2-inj-2, qa-c2-inj-3
measure:     every PLAYER_INJURED event's unitRatingChangePercent
```

| | measured |
|---|---|
| injuries | 470 |
| reported change rounds to 0.0% | **85 (18.1%)** |
| of those, the man was a starter | 3 |
| of those, season-ending or MAJOR | 3 |

So roughly one injury in five is announced with a consequence sentence and a
zero.

## Expected

`expected-behavior.md` §5 — the UI writes sentences from structured events, and
the sentence has to be true of the event. `CLAUDE.md` records the intent
explicitly: *"Injury events store the actual promoted player and the
before/after unit rating, so the dashboard and weekly story can state the
football cost rather than merely saying 'out'."*

## Actual

The **number is honest**. `processInjuries` computes `unitRatingBefore` and
`unitRatingAfter` from the snap-weighted unit ratings either side of the
injury, so a man carrying a 2–5% snap share genuinely costs his unit nothing
measurable, and in 82 of the 85 cases he was not in the starting rotation at
all. `unitRatingChangePercent` also serialises as `-0` in these cases.

What is wrong is the sentence built on top of it, which asserts an effect
("moves into the rotation, affecting pass offense") and then contradicts
itself.

## Why it matters

`CLAUDE.md` raised the injury rate specifically so that depth would matter, and
almost a fifth of the resulting events teach the opposite. It is survivable —
nothing is miscomputed — which is why this is P3 and not P2.

## Diagnosis

*Hypothesis.* Branch the copy on the magnitude rather than templating one
sentence: below a threshold say that the depth absorbed it and name the man who
stepped in, above it keep the current wording. And guard the `-0` so no
sentence can ever print a negative zero.
