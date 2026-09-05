# The last game of the season, and the playoff, get no postgame

| | |
|---|---|
| **ID** | 2026-09-05-08 |
| **Severity** | P2 |
| **Status** | fixed |
| **Area** | Career loop / box scores |
| **Found by** | new-player-tester (cycle 2 cold read), reproduced by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F21) |

## What happens

Pressing `Advance week` at week 14 goes straight to the board review. The
week-14 game is played and never reported. If the program reached the playoff,
a thirteenth game is also played, lost or won, and reported nowhere — the
reporter finished the regular season 10–2 and next saw `10–3` inside the board
review beside the line `Reached the playoff +10`.

## Reproduction

Lead's run, browser, `web-alpha-program_riser-0`, Everglades State Pythons:

```
advance to week 14 → Advance week
```

The next screen is `EVERGLADES STATE PYTHONS · THE 2027 SEASON IS OVER`, the
offseason stepper, and the board review (`9–3, against 7 asked for`). No
postgame, no box score, no weekly stories for the game just played. The lead's
program did not make the playoff, so the regular-season half reproduces on its
own; the reporter's evidence covers the postseason half.

## Expected

`CLAUDE.md`, "The recap is a box score": *"The postgame flow is now the first
screen after a played game. Completing `Advance week` opens `This Week → Last
Saturday` automatically with the full box score first… `boxScore()` can rebuild
a completed game from its structured `GAME_COMPLETED` event after that fixture
leaves the active schedule, so the Week 14 rollover cannot erase the postgame
screen."*

The rollover does not erase it. It skips it.

## Actual

`apps/web/src/App.tsx` opens the postgame on

```ts
const playedGame = response.events.some((gameEvent) =>
  gameEvent.type === "WEEKLY_RECAP" && gameEvent.programId === playerProgramIdRef.current …
```

The week-14 advance runs `rolloverSeason` instead of a week, so the response is
an offseason transition and the app renders the offseason. Playoff games emit
`PLAYOFF_GAME_COMPLETED`, which no postgame trigger reads.

The results are not lost — `PLAYOFF_GAME_COMPLETED` has an inbox sentence
(`App.tsx:2139`) and the record book renders a `12-team playoff` block per
completed season (`App.tsx:1319`). Both live behind `More ▾`, on screens the
reporter never opened, and the inbox is broken besides
([2026-09-05-05](2026-09-05-05-inbox-is-other-programs-booster-offers-under-an-unrelated-sentence.md)).

## Why it matters

The player's record changes — 10–2 becomes 10–3 — between one screen and the
next, and the board then grades the season that record belongs to. Every other
Saturday in the game gets a box score, a business recap and a weekly story
opened automatically; the two that decide the season get none. A player cannot
tell whether they lost a playoff game or the game miscounted.

Filed P2 rather than P3 because the flow the design treats as mandatory is
skipped for the most consequential fixtures of the year, not because a number
is wrong.

## Diagnosis

*Hypothesis.* The rollover response needs its own postgame: open
`This Week → Last Saturday` for the final regular-season fixture before the
offseason stepper takes over, and give the postseason a screen of its own —
`boxScore()` can already rebuild both from their structured events.
