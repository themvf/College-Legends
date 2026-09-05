# The depth chart ignores the scheme when it names starters

| | |
|---|---|
| **ID** | 2026-09-05-04 |
| **Severity** | P2 |
| **Status** | open |
| **Area** | Depth chart / rotation |
| **Found by** | new-player-tester (cycle 2 cold read), reproduced by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F5) |
| **Recurrence of** | `docs/PLAYABILITY_PASS_2026-08.md` #5 — recorded twice before and never confirmed |

## What happens

Three screens disagree about who is on the field. The scheme card and the
"what you run" line agree with each other and with the engine; the Depth Chart
does not.

## Reproduction

**Cleaner than the reporter's** — no scheme change required, and it is the
defence rather than the offence:

```
seed:        web-alpha-program_riser-0
league size: 72 (web default)
click path:  new career → Program Riser → Everglades State Pythons →
             change nothing → begin season → Depth Chart
```

Everglades runs `Bend don't break` by default.

| screen | says |
|---|---|
| Scheme card | `Bend don't break · 3 DL · 3 LB · 5 DB` |
| Depth Chart | `DL — 4 starters` · `LB — 3 starters` · `DB — 4 starters` |

The reporter found the same defect on the offence a season later under
`Power run`: scheme card `2 WR · 2 TE`, depth chart `WR — 3 starters`,
`TE — 1 starter`.

## Expected

`CLAUDE.md`, "Eleven on the field, and a rotation behind them": the scheme
decides the personnel grouping, `OFFENSIVE_SPOTS` / `DEFENSIVE_SPOTS` each sum
to eleven, and `snapShares` distributes them down the depth chart. The depth
chart is the screen where the player decides who plays; it has to describe the
rotation the engine will field.

## Actual

`apps/web/src/App.tsx:184`:

```ts
const starterCounts: Record<Player["position"], number> =
  { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, DB: 4, K: 1, P: 1 };
```

A hard-coded table, used both for the `N starters` heading and for the
`START` / `#2` badge on every player row (`App.tsx:1246`, `:1253`). It matches
`PRO_BALANCED` / `SPREAD_TEMPO` on offence and `FOUR_THREE_BASE` on defence and
is wrong for every other scheme. The engine's own `schemeSpots()` is imported
elsewhere in the same file and is not used here.

Concretely, a player running Power Run sees his WR3 badged `START` when the
engine does not field him, and his TE2 badged `#2` when it does.

## Why it matters

The depth chart is a decision screen — ordering, redshirts, who to develop —
and it misreports the one fact it exists to state, for most of the ten
scheme combinations in the game. It is also the third time this has been
recorded: `PLAYABILITY_PASS_2026-08.md` #5 raised it, cycle 1's cold reader
explicitly could not confirm it ("I did not look hard enough at the depth
chart"), and cycle 2 found it on a different scheme.

## Diagnosis

*Hypothesis.* Replace the constant with `schemeSpots(program.schemeIdentity)`.
The engine already exports it and `rotation.ts` already guarantees the spots
sum to eleven per side, so there is no new arithmetic — only a lookup that is
currently frozen.
