# Job security is never shown while the job is safe, so the first verdict is a surprise

| | |
|---|---|
| **ID** | 2026-09-04-03 |
| **Severity** | P2 |
| **Status** | open |
| **Area** | Board review / firing · Onboarding |
| **Found by** | new-player-tester |
| **Found in** | `710251b` |
| **Run log** | [`../runs/2026-09-04-new-player.md`](../runs/2026-09-04-new-player.md) (F2) |

## What happens

A player whose job is not under threat never sees their job-security number or
its band at any point in the season. The first time it appears is the February
board review, announcing that it moved.

## Reproduction

1. Start any career whose program is not under pressure and has no championship
   mandate — Program Riser is the reporter's case.
2. Play to any week past a third of the season.
3. Search the dashboard body text for `secure`, `hot seat`, `watched`,
   `security`, `extension`, `job`.

Reporter measured at S1W11 and S2W6: **none present**. Went 10–3; learned the
number existed when the board reported 65 → 96.

## Expected

`agents/docs/game-design/expected-behavior.md` §7:

> Job security shows a named band from a third of the way into the season. […] A
> coach who has watched "Hot seat" since October was warned. One who finds out in
> the offseason was ambushed, and that is a defect.

## Actual

Confirmed in code by the QA lead. `JobStanding` in `apps/web/src/App.tsx`:

```ts
if (played < MEANINGFUL_RECORD) return null;
const pressured = review.verdict === "HOT_SEAT" || "FINAL_WARNING" || "FIRED";
if (!pressured && mandate === null) return null;
```

The band renders **only** when the job is already in trouble or carries a
mandate. A secure program shows nothing.

## Why it matters

The invariant exists so consequences are visible before they land. Hiding the
number while safe defeats it in a subtler way than showing it late: a player who
has never seen the number cannot build a model of it, so even a *good* verdict
arrives as a surprise — they did not know they were being graded.

It also silently removes the one number that states the point of a season, which
`CLAUDE.md` records as the reason it was surfaced in the first place.

## Severity note

Argued down from the P1 that an invariant breach defaults to. No career is lost
and nothing is corrupted; the damage is comprehension, and the fix is small. It
should be fixed before a beta.

## Diagnosis

*Confirmed, not hypothesis.* This was a deliberate choice when the banner was
built — the code comment reads *"Quiet while the job is safe: a permanent status
line about job security would be noise for the many seasons where nothing is
wrong."*

That optimised for noise at the cost of discoverability, and the invariant
document says the opposite. One of the two has to change. The reporter's evidence
argues the code should: a number nobody has ever seen cannot warn anybody.

The reporter also notes this looks like an over-correction of
`PLAYABILITY_PASS_2026-08` #2, which retired job security from the header
*because firing did not exist yet*. Firing exists now and nothing was restored.
