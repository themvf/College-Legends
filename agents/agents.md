# AI beta-testing agents

Eight agents that play College Legends the way beta testers would, and report
what they find. This file is the roster and the rules every one of them follows.

**These agents do not change gameplay.** They read, run, measure and write. A
fix is a separate piece of work by a separate agent, opened from an issue one of
these filed.

---

## Why this works on this game

The engine is **deterministic**: the same seed plus the same commands produces
byte-identical state. That single property turns AI testing from a fuzzing
exercise into something rigorous:

- Every finding is reproducible from a seed and a command list.
- A fix can be proven against the exact run that found the bug.
- Two agents can compare runs and know that any difference is real.

Any report without a seed is an incomplete report.

## The roster

| agent | owns | asks |
|---|---|---|
| [`qa-lead`](qa-lead.md) | the process | what should we test, and is this finding real? |
| [`gameplay-tester`](gameplay-tester.md) | the loop | can you play a career end to end? |
| [`balance-tester`](balance-tester.md) | the numbers | are the outcomes in their bands? |
| [`economy-tester`](economy-tester.md) | money | does the ledger hold up over a dynasty? |
| [`edge-case-tester`](edge-case-tester.md) | the boundaries | what happens at zero, at the cap, at the limit? |
| [`new-player-tester`](new-player-tester.md) | comprehension | can someone who has never played work out what to do? |
| [`regression-tester`](regression-tester.md) | history | did a fixed bug come back? |
| [`simulation-accuracy-tester`](simulation-accuracy-tester.md) | football | does it behave like the sport? |

## Shared ground truth

Every agent reads these before testing. They are the specification; the agents
are the measurement.

- [`docs/game-design/game-rules.md`](docs/game-design/game-rules.md) — what the
  engine does
- [`docs/game-design/game-balance.md`](docs/game-design/game-balance.md) — the
  numbers and their tolerances
- [`docs/game-design/expected-behavior.md`](docs/game-design/expected-behavior.md)
  — the invariants, and **what is not a defect**

Plus `CLAUDE.md` at the repository root, which carries the design history and
the roadmap. An unbuilt system is not a bug.

## Rules every agent follows

**1. Measure, do not assert.** This codebase has a long history of claims that
were disproved the moment somebody ran the engine — including "rivals not
pricing tickets is why the league goes insolvent," which turned out to move the
count by three. Run it. Report the number.

**2. State the sample size.** Per-league variance on most balance figures is
several points. One league is an anecdote. Pool four to six.

**3. Reproduce before filing.** Re-run the seed. If it does not reproduce, it is
not a finding yet — say so and keep the run log.

**4. Check the not-a-defect list.** `expected-behavior.md` ends with one, and
`game-balance.md` §6 lists known deviations. Re-filing these buries real work.

**5. Separate what you saw from what you think it means.** Report the
observation with evidence, then your reading of it, clearly labelled. A wrong
diagnosis attached to a real observation still helps; a confident diagnosis
presented as fact does not.

**6. Do not fix anything.** File it. A tester who fixes as they go destroys the
reproduction and the regression case.

**7. Write the run log even when nothing breaks.** A clean run at a new scale or
a new seed is evidence, and `qa/runs/` is where coverage is demonstrated.

## How to run one

The agent files are written to work three ways:

**As a Claude Code subagent** — each carries frontmatter, so copying or
symlinking `agents/*.md` into `.claude/agents/` makes them invocable:

```bash
ln -s ../../agents/qa-lead.md .claude/agents/qa-lead.md
```

**As a prompt** — paste the file's body into any capable model along with the
three design documents.

**As a checklist** — a human can work through the same procedures by hand.

## The workflow

```
qa-lead picks a target from qa/test-matrix.md
        │
        ├─► tester runs its procedure, writes qa/runs/<date>-<agent>.md
        │
        ├─► candidate findings → qa-lead triage
        │
        ├─► confirmed → qa/issues/<id>.md   (severity, seed, repro)
        │
        └─► cycle summary → qa/reports/<date>-<cycle>.md
```

Process detail, severities and templates: [`../qa/qa-process.md`](../qa/qa-process.md).

## Commands an agent will need

```bash
pnpm build                      # required before tests — they run against dist/
pnpm test                       # 248 engine tests + 15 web tests
node --test tests/<file>.mjs    # one suite
pnpm sim --seasons 5            # headless multi-season run, writes reports/
pnpm web                        # dev server for browser-driven testing
```

Browser driving uses Playwright with the pre-installed Chromium:

```js
chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
```

Never run `playwright install` — the browser is already there.

## A note on what browser testing is for

Four of the highest-value defects found in this codebase were invisible to a
passing unit suite and only appeared when the real app was driven at real scale:
a sort-comparator performance bug, an invisible error state, a mandate that a
winning coach could absorb, and a hot-seat warning that fired at 0–0.

**Unit tests prove the engine is right. Driving the app proves the game is.**
Both are required.
