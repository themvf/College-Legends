# A render error white-screens the whole app, with no way back but a reload

| | |
|---|---|
| **ID** | 2026-09-05-13 |
| **Severity** | P3 |
| **Status** | open |
| **Area** | Career loop / performance |
| **Found by** | qa-lead, while triaging [2026-09-05-01](2026-09-05-01-recruiting-board-white-screens-on-any-unevaluated-prospect.md) |
| **Found in** | `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (context: F1) |

## What happens

There is no React error boundary anywhere in `apps/web/src`. Any error thrown
during render unmounts the entire application: the page goes white, the nav
goes with it, and the only recovery is a browser reload.

## Reproduction

Any render throw. The one that occurred in the wild is
[2026-09-05-01](2026-09-05-01-recruiting-board-white-screens-on-any-unevaluated-prospect.md);
that instance is fixed, this is the class.

```
grep -rn "componentDidCatch\|getDerivedStateFromError\|ErrorBoundary" apps/web/src
→ no matches
```

## Expected

A failure in one panel should cost that panel. `expected-behavior.md` §9 makes
the save trustworthy, and autosave did in fact recover the reporter's career —
but only after they worked out that a reload was possible at all.

## Actual

The reporter's account is the whole argument:

> "Autosave recovered the career on reload, so no data was lost — but a cold
> player who hits this has no reason to believe the game is not simply broken."

They stopped playing the recruiting system for the rest of the season.

## Why it matters

The severity of every future render bug is decided here. With a boundary, the
cycle-2 P1 would have been a broken panel with a message; without one it was
a career that appeared to have been destroyed. This is cheap insurance on a
codebase that is about to grow four more screens.

Filed P3 because nothing is currently broken by it and the underlying instance
is fixed — it is the blast radius that is wrong, not a behaviour.

## Diagnosis

*Hypothesis.* One boundary around the routed screen and a second around the
whole shell, each rendering the error text and a "reload" action rather than a
blank document. Worth pairing with a check that the autosave is offered by
name on the recovery screen, since it is what makes the recovery safe.
