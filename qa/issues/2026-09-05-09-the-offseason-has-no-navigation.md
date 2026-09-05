# The offseason has no navigation, so its decisions are made blind

| | |
|---|---|
| **ID** | 2026-09-05-09 |
| **Severity** | P2 |
| **Status** | open |
| **Area** | Career loop / transfer portal / staff hiring |
| **Found by** | new-player-tester (cycle 2 cold read), reproduced by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F19) |

## What happens

All five offseason steps render with no game navigation at all. There is no
Roster, no Depth Chart, no Finances, no Staff screen — only the step in front
of you and a Continue button.

> "I bid $2,000 a week on a 94-rated offensive lineman with no way to look at
> the offensive line I already had."

## Reproduction

```
seed:        web-alpha-program_riser-0
click path:  play a season to week 14 → Advance week → any offseason step
```

Confirmed by the lead at the board-review step: the rendered page carries the
`1 Review · 2 Portal · 3 Signing day · 4 Staff · 5 Camp` stepper and no
`nav.game-nav` element.

`apps/web/src/App.tsx:442` returns `<Offseason …>` in place of the entire
`<Dashboard …>` tree, and `Dashboard` is what renders the nav row.

## Expected

`expected-behavior.md` §3 — the decision has to be makeable against the
information it depends on. The portal step asks the player to price a transfer
against the room he already has; the coaching step asks him to commit annual
payroll against a budget. Neither number is reachable from the screen asking
for it.

## Actual

Four of the five steps are real decisions and three of them need a screen the
player cannot open:

| step | needs | reachable |
|---|---|---|
| Portal | the room he is bidding into, the scholarship count | no |
| Signing day | the class against the roster plan | no |
| Staff | budget, payroll, what the post is worth | no |
| Camp | roster fatigue and injury exposure | no |

The reporter's judgement of the portal — *"the strongest screen in the
product"* and *"the first time in the whole game I felt I had done something
that mattered"* — is why this is worth fixing rather than tolerating. The
screen is good; it is being asked to carry a decision without the context.

## Why it matters

The offseason is where a roster is actually built, and it is the only part of
the career run with the rest of the game switched off.

## Diagnosis

*Hypothesis.* Render the nav row above the offseason stepper and allow
read-only screens (Roster, Depth Chart, Finances, Staff, Honors) while the
offseason step remains the active decision — the phase guard already refuses
out-of-step commands with a reason, so opening a screen cannot desynchronise
anything.
