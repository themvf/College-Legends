# The scouting priority card posts a readiness the week cannot deliver

| | |
|---|---|
| **ID** | 2026-09-05-02 |
| **Severity** | P1 |
| **Status** | fixed |
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

**The filed diagnosis was wrong, and the measurement that found the real cause
is worth more than the fix.**

The hypothesis was that `refreshPreparation` files this week's output at the end
of `advanceWeek`, so the hours the card sells land on the next fixture. Measured
instead: `prepareWeek` files them, before the game, on the fixture the card
names. The film does arrive in time.

The actual cause is that a week **replaces** its own contribution rather than
adding to it. `commitScoutingOutput` refunds whatever the department filed
automatically, then re-files the week's output — that is what makes moving the
film room move the work instead of duplicating it. The card added
`projectedScouting` on top of a file that already contained exactly that, so it
double-counted one week every week.

The card now subtracts what this week has already filed against the named
opponent before projecting, mirroring the engine's own arithmetic:

```ts
const alreadyFiled = preparation?.autoScoutedOpponentId === opponentId
  ? preparation.autoScoutedPoints ?? 0 : 0;
const filePoints = Math.max(0, rawFilePoints - alreadyFiled);
```

### A second defect I reported and that did not exist

**Corrected after the fact, and left here rather than deleted.**

This section originally claimed the refund marker was "written once and never
cleared at a week boundary", and reported an A/B measurement showing one week in
eight moving from 1.46 to 2.06.

That was wrong. `refreshPreparation` has always rebuilt every program's
preparation with `autoScoutedOpponentId: null` and `autoScoutedPoints: 0` — the
clearing was already there, and `git show 941d42f^` confirms it. The "before"
arm of that A/B was a version in which **I had added the preservation myself**
in order to test the fix, so what the measurement showed was a defect I had
introduced thirty seconds earlier, not one that shipped.

The only surviving change from that half is a comment on the clearing explaining
why it matters. No behaviour changed.

Found while re-establishing the determinism baseline: nineteen commits produced
an identical hash, which prompted checking whether the scouting path was
exercised at all. It is — all 24 programs build files and set the marker — so an
unchanged hash meant the engine change had been inert, which it was.

The card fix above is unaffected and stands: it was measured against the engine
and its test is red on the pre-fix build.

### What is *not* a defect, and was the bulk of the symptom

The reporter saw `+1.5` unchanged from week 3 to week 8. With both fixes in,
they still would. The film room re-targets to each week's opponent by default,
so every game gets exactly one week of film — 13 points, readiness 1.46 — and
holding the target on a future fixture is what accumulates it (measured: 13, 26,
39, 52, 65 over five weeks). That is the department working as designed, and the
decision it exists to pose.

What made it *read* as broken is a separate, already-known finding: the target
silently follows the schedule, so a player who never opens the scouting board
never sees it accumulate. That is cycle-1 F15(b), still open.

## Verified fixed

| | card posts | week delivers |
|---|---|---|
| before | `+2.1` | `1.46` |
| after | `+1.5` | `1.46` |
| after, accumulated file | `+2.1` | `2.06` |

And the branches now differ: `leave it alone +1.2` against `make it a priority
+1.5`, where both previously delivered 1.46 whatever was chosen.

Guarded by a test in `tests/rng-distribution.test.mjs` that walks eight weeks
asserting the posted figure is within 0.05 of the delivered one, and that the
two branches differ in at least three of them — a card whose branches always
agree is not pricing a decision. Confirmed red against the pre-fix build at
"the card posted 2 and the week delivered 1.46".

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
