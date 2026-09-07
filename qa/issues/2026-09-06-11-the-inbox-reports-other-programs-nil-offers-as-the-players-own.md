# The inbox reports other programs' NIL offers as the player's own

| | |
|---|---|
| **ID** | 2026-09-06-11 |
| **Severity** | P2 |
| **Status** | fixed |
| **Area** | Web UI / inbox scoping |
| **Found by** | gameplay-tester (cycle 3, Brief A, Finding B) |
| **Found in** | `695bcbe` |
| **Run log** | `qa/runs/2026-09-05-gameplay.md` |

Filed after the cycle report was written — Brief A was still running when the
lead closed the cycle, so neither of its two findings was triaged. Severity
proposed by the implementer; the lead should confirm or move it.

## What happens

The dashboard inbox shows `NIL Offer Resolved` rows for offers made by other
programs, phrased in the second person as though the player had made them.

## Reproduction

```
seed:        web-alpha-program_riser-0
league size: 72 (web default)
path:        Program Riser -> Everglades State Pythons -> accept roster
             -> advance to week 4 -> Dashboard -> "What happened"
```

## Expected

The inbox is the player's own news. `2026-09-05-05` established this for
booster events and its fix added `BOOSTER_OFFERED` / `BOOSTER_RESOLVED` to the
scoping list with a comment explaining why.

## Actual

Three rows, verbatim, in a career whose only NIL offer all season was $2K to one
recruit:

```
Nil Offer Resolved   Nicholas Reed took your $850 a week offer.
Nil Offer Resolved   Justin Adams took your $850 a week offer.
Nil Offer Resolved   Nico Matthews took your $850 a week offer.
```

None of the three was on the player's 30-row board.

## Why it matters

This is worse than the booster case it recurs from, because the sentence says
**your**. The player is not merely shown noise, they are told they spent money
they did not spend, on a screen whose whole purpose is to report what happened
to them.

## Diagnosis

`eventRelevantToProgram` scoped a hand-maintained list of event types and fell
through to `return true`. `NIL_OFFER_RESOLVED` carries `programId` — the engine
sets it on every emit — and the UI simply did not read it.

The list is the defect, not the missing entry. Adding one more type would have
set up the third recurrence.

## Fix

`3397569`. The classification is now total: every event type the engine emits
carrying a `programId` must be in `INBOX_NOISE`, `INBOX_OWN_PROGRAM`,
`INBOX_SCOPED_BY_RULE`, or `INBOX_LEAGUE_NEWS`.
`apps/web/src/inbox-scope.test.ts` enumerates them **by playing two seasons and
inspecting emitted events**, not by reading the type union — a grep over that
union missed `NIL_OFFER_RESOLVED`, which is precisely the type the test exists
for. `NIL_OFFER_SET` and `PORTAL_BID_SET` were unscoped by the same omission and
are now scoped too.

Confirmed red against the defect: the test named `NIL_OFFER_SET` and
`NIL_OFFER_RESOLVED` as unclassified. Writing it also caught a category the
first draft had not modelled — the prospects scoped by a discovery rule rather
than a plain id match — which is recorded because the test was wrong before the
code was.

## Verified fixed

<pending regression-tester>
