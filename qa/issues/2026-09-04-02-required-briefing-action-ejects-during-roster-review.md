# Following the dashboard's REQUIRED instruction during ROSTER_REVIEW ejects the player

| | |
|---|---|
| **ID** | 2026-09-04-02 |
| **Severity** | P2 |
| **Status** | open |
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

*Hypothesis.* The briefing is generated without a phase guard, so an item whose
destination is only valid in `REGULAR_SEASON` is offered during `ROSTER_REVIEW`.
The re-render to the takeover screen is consistent with `App.tsx` returning
`<SetUpProgram>` whenever `phase === "ROSTER_REVIEW" && !setupDone`.

Note `weeklyBriefing` is already called with `{ excludeWeeklyPriorities: true }`
on the dashboard, and the priority item comes from `weeklyPriorityDecision`
instead — so the guard, if added, belongs there.
