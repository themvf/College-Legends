# Selecting an unevaluated prospect white-screens the entire app

| | |
|---|---|
| **ID** | 2026-09-05-01 |
| **Severity** | P1 |
| **Status** | fixed |
| **Area** | Recruiting |
| **Found by** | new-player-tester (cycle 2 cold read) |
| **Found in** | `084652b` |
| **Fixed in** | `80a6eb5` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F1) |

## What happens

On the recruiting War Room, selecting any prospect other than the one the board
auto-selects unmounts the whole React tree. The page goes white, there is no
error boundary and no in-app recovery; the only way back is a browser reload.
The console carries `Uncaught Error: Rendered fewer hooks than expected. This
may be caused by an accidental early return statement.`

## Reproduction

```
seed:        web-alpha-program_riser-0
league size: 72 (web default)
click path:  new career → Program Riser → sign any contract → complete takeover
             → begin season → Recruiting → buy one evaluation on the selected
             prospect → advance one week → click a different prospect row
selector:    button.prospect-summary
```

The evaluation is load-bearing. On a board where nobody has been evaluated,
every row takes the same branch and the hook count never varies, so the defect
is invisible. It appears only once the board holds a **mix** of evaluated and
unevaluated prospects.

## Expected

Selecting a row changes the detail panel. Nothing in
`expected-behavior.md` permits a screen the player cannot leave.

## Actual

React unmounts the application. Reporter reproduced 3/3 from a clean load
(`Jared Diaz`, `Theo Wright` crash; `Anthony Miller`, the auto-selected row,
works). Screenshot `45-white-screen-crash.png`, body length 0.

## Why it matters

This is the screen the dashboard's most repeated REQUIRED item points at
(`Next year's roster is 20 short … Work the phones →`). A cold player who
follows the game's own instruction meets a white screen and concludes the game
is broken. The reporter's class for the season was one player as a direct
result.

## Fix

`80a6eb5`. A `useMemo` building the NIL odds index sat **below** the NIL
panel's early return for `evaluationCount === 0`, so the hook count differed
between an evaluated and an unevaluated prospect. The hook moved above the
return.

Regression test: `apps/web/src/Recruiting.test.tsx`, "survives selecting every
prospect on the board, evaluated or not". It evaluates one prospect first so
selecting between rows crosses the branch, and was confirmed red against the
broken build with the reporter's exact error.

## Verified fixed

2026-09-05, qa-lead, build `02c3c52`, in a real browser career rather than a
fixture. Program Riser career, season 2027: bought one `Basic · 5 RP`
evaluation, advanced a week so it committed (board then showed a mixed
evaluated/unevaluated state — the selected prospect's `Ask / week` resolved
while the others still read `Unknown`), then clicked all ten
`button.prospect-summary` rows in turn. No unmount, no `pageerror`, no console
error. The fix matches the finding.

**Left open:** the reason this was a white screen rather than a broken panel is
that the app has no error boundary at all. Filed separately as
[2026-09-05-13](2026-09-05-13-a-render-error-white-screens-the-whole-app.md).
