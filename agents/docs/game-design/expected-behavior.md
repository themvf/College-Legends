# Expected behavior

The invariants. These are not preferences — breaking one is a defect even when
the resulting numbers look fine, and several of them are the reason the game can
be tested at all.

A finding against an invariant is **P1 by default**.

---

## 1. Determinism

The same seed plus the same commands must produce **byte-identical** state and
events.

`AddressableRng` draws depend only on an immutable path, so adding a draw in one
system must never shift results in another. Any change that moves an RNG draw
changes every downstream system — which is why replay tests exist and why a
"harmless refactor" can be a P1.

Practical consequence, and the single most useful fact in this repository:
**every bug is reproducible from a seed and a command list.** A report without
one is an incomplete report.

Functions that consume no RNG (`jobReview`, `operatingCost`, `mediaRights`,
`facilityUpkeep`) must stay that way, or they can shift draws elsewhere just by
being called.

## 2. Order-independent markets

Recruiting, NIL and the portal resolve **all valid commands together**.

Command order and program iteration order must never decide a winner. A test
that submits the same commands reversed must produce the same outcome. This is
what makes a contested market fair rather than a race.

## 3. Payoffs are visible

Every decision the player can make exposes a projection function, and **the
posted number must be the number the engine uses**.

| decision | projection |
|---|---|
| development | `projectedDevelopmentPayoff` |
| facilities | `facilityPayoff`, `facilityUpkeepIncrease` |
| staff | `staffFocusPayoff`, `staffCard` |
| player media | `playerMediaPayoff` |
| the gate | `projectGate`, `fairTicketPrice` |
| sponsorship | `projectSponsorshipOffer` |
| the job | `jobReview` |

A card that disagrees with the engine is a defect even if both numbers are
individually reasonable. This has been the source of several real bugs:

- `jobReview` once took the completed season as an argument, so a caller that
  omitted it — which the UI did — got a different verdict than the engine.
- The finance panel recomputed operating cost from an approximation of revenue
  and posted a lower figure than was actually charged.
- A staff card read "installs at 51%" above a plan the engine ran at 47%.

**How to test it:** call the projection, advance the week, compare against the
event. They must agree exactly.

## 4. No hidden rolls

A number that moves must be explainable. Where the engine prints reasons, the
reasons must **sum exactly to the movement**.

The board review is the reference implementation: every delta is named and a
test asserts they add to the total. A verdict with an unexplained number in it
is a hidden roll wearing a UI.

Corollary: **job security moves in the board review and nowhere else.** Two
systems moving one number is how a projection drifts away from the engine.

## 5. Events are structured, not prose

Processors emit typed events with stable fields. The UI writes sentences from
them. `eventHistory` is capped at 10,000.

A tester should be able to verify almost any rule from events alone. If a
behavior cannot be observed in an event, that is worth filing — it means the
player cannot see it either.

## 6. Rivals play by the player's rules

Anything contested must apply to all 72 programs identically.

- Rivals plan with `planWeeklyCommands` / `planOffseasonCommands` and issue the
  **same commands a human does**.
- Rivals are judged by the same `jobReview`.
- Rivals see only their **declared knowledge view** — they cannot read opposing
  unit ratings, hidden prospect potential, or rival-private interest.

"A system only the player pays for is a system the player should not pay for
either." The knowledge-boundary tests exist to enforce this; a widening of a
view is caught deliberately by a field-list assertion.

## 7. The player is never ambushed

Consequences must be visible before they land.

- Job security shows a named band from a third of the way into the season.
- A championship mandate counts down in the open.
- Facility upkeep is posted before the purchase.
- An expiring resource is flagged in the weekly briefing.

A coach who has watched "Hot seat" since October was warned. One who finds out
in the offseason was ambushed, and that is a defect.

## 8. Refusals explain themselves

A command that cannot be honoured emits `COMMAND_REJECTED` **with the reason and
where it does belong**. Silently dropping a command is a defect; refusing one is
not.

## 9. Saves are trustworthy

A loaded career must advance to byte-identical state against one that was never
saved. Determinism is what makes that checkable, and it is the assertion that
protects a player's dynasty.

## 10. Bounded growth

Nothing may scale with an unbounded quantity — see `game-balance.md` §3. State
and save size may grow with seasons, but not superlinearly.

---

## What is *not* a defect

Filing these wastes cycles and buries real findings.

- **A rejected command.** Refusal is a feature. Only a wrong or missing reason is
  a bug.
- **A balance number inside its stated band**, or measured on one league.
- **Anything in `game-balance.md` §6.** Those deviations are known.
- **A losing program losing money.** That is the design.
- **A rival making a suboptimal choice.** Rivals are competent, not optimal, on
  purpose.
- **Missing systems.** Playbook installation, coordinator delegation, offseason
  injury carryover and NIL depth are unbuilt, not broken. Check the roadmap in
  `CLAUDE.md` before filing an absence.
