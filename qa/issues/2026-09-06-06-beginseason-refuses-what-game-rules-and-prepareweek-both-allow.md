# `beginSeason` refuses what `game-rules.md` and `prepareWeek` both allow

| | |
|---|---|
| **ID** | 2026-09-06-06 |
| **Severity** | P3 |
| **Status** | open |
| **Area** | Phases and command legality |
| **Found by** | regression-tester (observation, not filed); reproduced and broadened by qa-lead |
| **Found in** | `f164d12` |
| **Run log** | `qa/runs/2026-09-05-regression.md` |

## What happens

`ROSTER_REVIEW` has two engine entry points that disagree about what is legal in
it. `prepareWeek` accepts `REPLACE_STAFF`, `SET_SCHEME` and `SET_WEEK_FOCUS`;
`beginSeason` refuses all three, with a reason that names a set of legal
decisions that does not match `game-rules.md` §1 and does not match its own
sibling.

The reporter found this for `REPLACE_STAFF`. It is wider than that.

## Reproduction

```
seed:        lead-e-phase
league size: 24
program:     program-3
phase:       ROSTER_REVIEW (fresh createFictionalLeague)
```

Harness: `qa/scratch/lead-e-beginseason.mjs`.

```
SET_SCHEME       beginSeason: REJECTED "Only sponsorship, depth-chart, redshirt,
                              and preseason scheduling decisions can be made
                              before the season begins."
                 prepareWeek: ACCEPTED

SET_WEEK_FOCUS   beginSeason: REJECTED  (same reason)
                 prepareWeek: ACCEPTED
```

`REPLACE_STAFF` takes the same `beginSeason` branch — it is not in the
allowlist — and is accepted by `prepareWeek`.

## Expected

`game-rules.md` §1:

> | `ROSTER_REVIEW` | scheme, staff hiring, marquee scheduling, depth chart, and the standing weekly priorities |

and, in the same section, the adjudication recorded from issue
`2026-09-04-02`:

> **Weekly priorities are standing, so they are legal in the preseason.**
> Measured: `SET_WEEK_FOCUS` commits during `ROSTER_REVIEW` with status `DONE`
> and emits `WEEK_FOCUS_SET`.

## Actual

`packages/simulation/src/index.ts:1285-1306`. `beginSeason`'s allowlist is
exactly `SCHEDULE_MARQUEE_HOME_GAME`, `ACCEPT_SPONSORSHIP`, `SET_DEPTH_CHART`,
`SET_REDSHIRT`/`RED_SHIRT`. Everything else falls to:

```ts
reason: "Only sponsorship, depth-chart, redshirt, and preseason scheduling
         decisions can be made before the season begins."
```

Three of the five things `game-rules.md` §1 lists as legal in this phase — scheme,
staff hiring, and the standing weekly priorities — are neither in the allowlist
nor in the sentence.

## Why it matters

Under the standing calibration, **a rejected command is the system working; only
a wrong reason is a bug.** This reason is wrong twice over: it refuses decisions
the design document says are legal in the phase, and it enumerates the phase's
rules incorrectly for anybody reading the event.

No player reaches it — the web worker dispatches `ROSTER_REVIEW` to `prepareWeek`
— which is why it is P3 rather than P2. It is not free, though: it cost the
regression tester a measurement pass this cycle, and it is a second, quieter
copy of the rule the project has already fixed twice for having two homes
(`planWeekHours` for hours; `focusesAfterChoosing` for the focus list, this
cycle's `2026-09-06-01`).

## Diagnosis

Hypothesis. `beginSeason`'s allowlist predates `prepareWeek`, which became the
real preseason entry point when the takeover screen was built, and was never
reconciled with it. The two functions now own the same phase and only one of them
was kept up to date.

## Fix

<pending>
