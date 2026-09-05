# The scouting priority card posts a readiness the week cannot deliver

| | |
|---|---|
| **ID** | 2026-09-05-02 |
| **Severity** | P1 |
| **Status** | open |
| **Area** | Weekly priorities / Scouting department |
| **Found by** | new-player-tester (cycle 2 cold read), reproduced by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F3, scouting half) |

## What happens

The `Scout <opponent>` priority card posts a flat number — `+2.1 to every unit
that game` — and the postgame payoff panel then reports a smaller number for
the same week, every week, by the same proportion. The reporter measured
`+2.9 → +2.5` and `+2.1 → +1.5` and saw the second figure repeat unchanged from
week 3 to week 8.

This is the half of cycle-2 finding F3 that `ad06e2f` did not address. The
recruiting half of the same finding **is** fixed and verified (below).

## Reproduction

Headless, 24 programs, deterministic:

```
seed:        qa-cycle2-readiness
league size: 24
program:     program-4 (index 3)
commands:    prepareWeek(SET_WEEK_FOCUS focuses=["SCOUT"])
             advanceWeek(rival commands only)
read:        weekPriorities(state, me).find(c => c.focus === "SCOUT").focused
             vs the WEEK_FOCUS_PAYOFF event's scoutingReadiness
```

| week | card shows | week delivers |
|---|---|---|
| 1 | `+2.1 to every unit that game` | `+1.5` |
| 2 | `+2.1` | `+1.5` |
| 3 | `+2.1` | `+1.5` |
| 4 | `+2.1` | `+1.5` |
| 6 | `+2.5` | `+2.1` |
| 7 | `+2.1` | `+1.5` |
| 8 | `+2.1` | `+1.5` |

Consistent −29%. Reproduces on a second seed (`qa-cycle2-b`) at the same ratio.

## Expected

`expected-behavior.md` §3: *"Every decision the player can make exposes a
projection function, and the posted number must be the number the engine uses…
A card that disagrees with the engine is a defect even if both numbers are
individually reasonable."*

## Actual

Traced with the dossier printed at both points:

```
week 1  target=program-9  this week's opponent=program-9  file={"program-9":13}
        readiness(file) = 1.46
        card: leave +1.9 | priority +2.1
        delivered readiness 1.46
```

The file already stands at 13 points **when the card is drawn**. The card posts
`scoutingReadiness(filePoints + projectedScouting(thisWeeksPlan))`; the engine
delivers `scoutingReadiness(filePoints)`.

Two consequences, both worse than the size of the gap:

1. The posted figure is unreachable in every week, not occasionally.
2. `leave it alone +1.9` and `make it a priority +2.1` both deliver **1.46**.
   The marginal value the card exists to price has no effect at all on the game
   the card names.

## Why it matters

Breach of a load-bearing invariant, on the card that justifies one of a
program's one-to-three weekly slots. A player choosing between scouting and
installing a side of the ball is comparing a real number against an unreachable
one.

## Diagnosis

*Hypothesis.* `refreshPreparation` runs at the end of `advanceWeek` and files
the department's weekly output onto the dossier for the week about to be
played, so by the time `weekPriorities` renders, this week's hours are already
in `filePoints`. The card then adds a projection of the same hours on top —
a double count — while `captureFocusInputs` reads the dossier as it stands.
The hours the card is selling land on the *next* fixture, not the one it names.

If that is right, the fix is either to post `scoutingReadiness(filePoints)` for
this Saturday and state the increment against the game it actually helps, or to
move the filing so the projection and the capture see the same file.

## Fix

<!-- filled in when fixed -->

## Verified fixed

<!-- filled in by regression-tester -->

---

### The other half of F3, for the record

The recruiting half was fixed in `ad06e2f` (the card carried a stale copy of
`14 + facilities × 3 + contribution / 4.2`). Verified by measurement at
`02c3c52`, seed `qa-c2-trail`, four programs, with and without the focus:

| program | focus | card posts | engine adds |
|---|---|---|---|
| program-1 | none / RECRUIT | 36 / 42 | 36 / 42 |
| program-2 | none / RECRUIT | 41 / 52 | 41 / 52 |
| program-3 | none / RECRUIT | 49 / 57 | 49 / 57 |
| program-4 | none / RECRUIT | 40 / 52 | 40 / 52 |

Eight of eight exact. That fix matches its finding.
