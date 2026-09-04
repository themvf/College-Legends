# Following the dashboard's REQUIRED instruction during ROSTER_REVIEW ejects the player

| | |
|---|---|
| **ID** | 2026-09-04-02 |
| **Severity** | P2 |
| **Status** | fixed |
| **Area** | Weekly priorities · Career loop / phases |
| **Found by** | new-player-tester |
| **Found in** | `710251b` |
| **Run log** | [`../runs/2026-09-04-new-player.md`](../runs/2026-09-04-new-player.md) (F1) |

## What happens

During `ROSTER_REVIEW` the dashboard briefing shows a **REQUIRED** item —
"Weekly priorities · 3 slots open · Set priority →". Following it and pressing
"Make it a priority" re-renders the entire app as the takeover screen, *"What are
you going to run?"*. No message is shown. State is preserved, but the player has
no way to know that.

## Reproduction

Reproduced 2/2 by the reporter and **independently confirmed by the QA lead**.

1. New career → Program Riser → sign the contract.
2. Complete the takeover screen ("This is my football team. Let's go to work.").
3. Navigate to **Dashboard** (the app opens on the week hub; the dashboard is a
   separate nav destination).
4. Press "Set priority →", then "Make it a priority".

Result: `h1` becomes `"What are you going to run?"`. No visible rejection reason.
No page or console errors.

The Scouting board's "Put the film room on X" reproduces the same way.

## Expected

`agents/docs/game-design/game-rules.md` §1 — `ROSTER_REVIEW` permits scheme,
staff hiring, marquee scheduling and depth chart only. `SET_WEEK_FOCUS` and
`SET_SCOUTING_TARGET` are legitimately out of phase there.

`agents/docs/game-design/expected-behavior.md` §8 — *"A command that cannot be
honoured emits `COMMAND_REJECTED` with the reason and where it does belong.
Silently dropping a command is a defect."*

So the correct behaviour is either to **not offer the action in this phase**, or
to refuse it with a stated reason.

## Actual

The UI offers a phase-invalid action, marks it **REQUIRED**, accepts the click,
and drops the player on a screen they had already completed.

## Why it matters

This is inside a new player's first ten minutes, and it is the game instructing
them to do it. The reporter's words: *"I assumed I had broken the game."*

## Severity note

P2 rather than P1: no state is lost and the career continues. It is at the top of
the P2 list because it is early, it is the game's own instruction, and it presents
as a crash to someone who cannot tell the difference.

## Diagnosis

*Half right.* The re-render was correctly identified: `App.tsx` returns
`<SetUpProgram>` whenever `phase === "ROSTER_REVIEW" && !setupDone`.

The missing phase guard was not the cause, and the fix is not where the issue
suggested. Measured: `SET_WEEK_FOCUS` commits during `ROSTER_REVIEW` with status
`DONE` and emits `WEEK_FOCUS_SET`. The engine accepts it, and correctly so —
priorities are standing rather than re-entered every week, so choosing them
before the opener is a real decision. The action was never out of phase.

`game-rules.md` said it was, which is why the issue was framed that way. That
row has been corrected; a document the testers treat as ground truth was wrong.

## Fix

The setup flow reopened on *every* worker reply whose state was in
`ROSTER_REVIEW`, rather than on the transition into it. The reset exists so
completing training camp reopens the preseason flow in later seasons; testing
the phase instead of the change meant any command answered while the preseason
was still open threw the player back to the start of it.

`App.tsx` now tracks the previous phase and reopens setup only on the way in.

## Verified fixed

The reporter's exact repro, re-run in the browser against the dev server:

| | before | after |
|---|---|---|
| `h1` after "Make it a priority" | `"What are you going to run?"` | `"Blue Ridge Commonwealth Foxhounds"` |
| ejected to takeover | yes | **no** |
| priority actually committed | — | yes, briefing panel updates |
| page errors | none | none |
