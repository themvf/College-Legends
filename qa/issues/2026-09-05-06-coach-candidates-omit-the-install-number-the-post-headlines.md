# Coach candidates omit the one number the post itself headlines

| | |
|---|---|
| **ID** | 2026-09-05-06 |
| **Severity** | P2 |
| **Status** | fixed |
| **Area** | Staff hiring |
| **Found by** | new-player-tester (cycle 2 cold read), confirmed in code by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F7) |

## What happens

The chair for a coordinator post states its own headline metric:

```
OFFENSIVE COORDINATOR · James Ramirez
Gets your offense installed to     54% before practice reps
Week to week, that swings          ±11%
```

No candidate row posts either number. The reporter paid `$187K + $271K buyout`
to discover the answer was 62% and ±9%, and again in season 2 (`$507K`) to
discover 58% against 53%. Between the two coordinators he was choosing from —
"85, right scheme, Game plan 81" against "83, wrong scheme, Game plan 99" —
he guessed.

Compounding it, the one delta a candidate row *does* post is on the wrong stat:
`Cameron Garcia · +3 on James Ramirez`, when the bar that decides the job read
`Game plan 76 → 99`.

## Reproduction

```
seed:        web-alpha-program_riser-0
click path:  new career → any career → any program → takeover screen →
             OFFENSIVE COORDINATOR → "See who's available"
```

Compare the chair's `snapshot-list` against any candidate row.

## Expected

`expected-behavior.md` §3, and `CLAUDE.md`'s own statement of the rule:
*"Staff cards report what the engine will actually do… A card that disagrees
with the engine breaks 'payoffs are visible', which is an invariant rather than
a nicety."* A card that omits the number is a weaker version of the same
failure: the decision cannot be made against the metric the screen says decides
it.

## Actual

`apps/web/src/App.tsx`, `coachOptions()`:

```ts
outcomes: strengthPost ? staffModifiers(candidate) : []
```

and the identical line for the incumbent. The modifiers are rendered **only for
the strength-coach post**. Everywhere else `outcomes` is empty and the
`snapshot-list` block never renders.

The data exists and is already priced correctly against the post:
`staffCandidates()` builds each candidate's `modifiers` via
`staffModifiers({ rating, role, trait }, { schemeFit, prepareShare, facilityBonus })`,
so `Gets your offense installed to X%` and `Week to week, that swings ±Y%` are
computed for every candidate and then discarded by the view.

## Why it matters

Hiring is the decision `focusCapacity` hangs on — it is what buys a program its
second and third weekly priority — and it is made blind on the axis the screen
itself nominates. The player has to spend a six-figure buyout to read a number
the engine has already computed.

## Diagnosis

*Hypothesis.* Drop the `strengthPost ?` guard so `outcomes` carries
`staffModifiers` for every post, and move the `+N on <incumbent>` note onto the
post's own headline metric rather than raw rating.
