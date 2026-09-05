# QA process

How a testing cycle runs, what a finding has to contain, and how severity is
decided.

---

## The cycle

```
1. PLAN      qa-lead picks targets from test-matrix.md and writes the plan
             into the cycle report before any testing starts.

2. RUN       each tester follows its own procedure and writes a run log to
             qa/runs/, whether or not it found anything.

3. TRIAGE    qa-lead gives every candidate finding one of four verdicts and
             reproduces anything heading for P1 or P2.

4. FILE      confirmed findings become issues in qa/issues/.

5. REPORT    qa-lead writes the cycle report to qa/reports/.
```

A cycle is a small number of areas tested properly. Testing everything shallowly
produces a report nobody can act on.

## The lead is the front door

**Raw tester output does not go to whoever is doing the fixing.** It goes to the
`qa-lead`, and what reaches the implementer is a triaged, de-duplicated issue
list with severities already decided.

This is not ceremony. Cycle 2 is the argument for it:

- The implementer had **introduced one of the P1s** in the report. Deciding the
  severity of a finding against your own work, on the same day you wrote it, is
  not a judgement anybody should be asked to make about themselves.
- The implementer had spent two passes asserting a claim the report partly
  contradicted, and was therefore the worst-placed reader of it.
- The cold reader is kept cold on purpose, so it **cannot** check its findings
  against the previous cycle's. Somebody has to, and it is not the tester and
  not the implementer.

### Who dispatches

The lead plans the cycle and owns every verdict in it, but it cannot launch the
tester agents itself — only the top-level session can spawn agents, and the lead
deliberately reads all three design documents, which disqualifies it from ever
being the cold reader.

So the split is:

| step | who |
|---|---|
| plan the cycle | **lead** — written before any testing starts |
| launch the testers the plan names | top-level session, acting on the plan |
| receive run logs | **lead** |
| decide every verdict and severity | **lead** |
| file issues, write the report | **lead** |
| receive the triaged issue list and fix | implementer |

The implementer may read a run log, and should when fixing something. What they
must not do is decide from it what is real and what it is worth — that verdict
is already made, by somebody who did not write the code.

## What a finding must contain

The engine is deterministic, so there is no excuse for an unreproducible report.

**Required:**

| | |
|---|---|
| **Seed** | the exact string passed to `createFictionalLeague`, or the web app's `web-alpha-<path>-<reroll>` |
| **Reproduction** | commands or click path, from a fresh start |
| **Expected** | what should have happened, and which document says so |
| **Actual** | what did happen |
| **Evidence** | the event, the number, the screenshot |

**Also required where relevant:**

- **Sample size** for anything statistical. A rate without an *n* is not a
  measurement.
- **League size and season count** — several defects only appear at 72 programs
  or from season two.
- Whether you reached the state legitimately or constructed it.

**Separate observation from diagnosis.** Report what you saw with evidence, then
label your reading of it as a hypothesis. A wrong diagnosis on a real
observation is still useful; a confident diagnosis presented as fact is not.

## Severity

| | means | response |
|---|---|---|
| **P1** | an invariant is broken, data is lost, or a career cannot continue | fix before any beta |
| **P2** | a system produces wrong results, or a decision is unusable | fix before a wide beta |
| **P3** | wrong but survivable | fix when the area is next touched |
| **P4** | polish or suggestion | backlog |

Any breach of `agents/docs/game-design/expected-behavior.md` is **P1 by
default**. Argue it down explicitly if you disagree.

Examples, so the line is concrete:

- Determinism fails → **P1**
- A save fails to round-trip → **P1**
- Winning a season costs more than losing → **P1**
- A posted projection disagrees with the engine → **P1**
- A screen cannot be reached or left → **P1**
- Insolvency at 20 of 72 instead of ~3 → **P2**
- A per-game rate 30% outside band → **P2**
- Copy that misstates a rule → **P3**
- A number without a unit → **P3**
- Layout awkward on a narrow window → **P4**

## Triage verdicts

| verdict | meaning |
|---|---|
| **Confirmed** | reproduced from the stated seed; becomes an issue |
| **Not a defect** | known, in tolerance, or by design — say which |
| **Needs evidence** | plausible but under-measured; name the sample required |
| **Duplicate** | already filed; link it |

Rejecting findings is part of the job. A tester that files everything produces
noise, and rejections are the calibration that fixes it.

## Before filing, check these

1. `agents/docs/game-balance.md` §6 — known deviations.
2. The end of `agents/docs/game-design/expected-behavior.md` — what is not a
   defect.
3. `CLAUDE.md` roadmap — an unbuilt system is not a broken one.
4. `qa/issues/` — is it already filed?

## Standing decisions

Recorded so they are settled once:

- **A rejected command is working as designed.** Only a wrong or missing reason
  is a bug.
- **Rivals are competent, not optimal**, deliberately.
- **A losing program losing money** is the design.
- **Latency** is a known state (~2.1s early, ~3.5s by season four). File a
  regression against those numbers, not their existence.
- **Comprehension findings are real findings.** The game has no onboarding and a
  prior playtest failed on understanding rather than on bugs.

## File naming

```
qa/runs/2026-09-04-gameplay.md          one agent, one session
qa/issues/2026-09-04-01-save-corrupt.md date, sequence, slug
qa/reports/2026-09-04-cycle-01.md       one per cycle
```

## Definition of done for a cycle

- Every planned target was tested, or the report says why it was not.
- Every finding has a seed and reproduces.
- Every issue has a severity assigned by the lead, not by the reporter.
- The report states plainly whether the game is more or less playable than at
  the last cycle, and gives a ship / hold / fix-first recommendation.

## What the framework does not do

These agents **do not modify gameplay**. They read, run, measure and write. A
fix is separate work, opened from a filed issue, so that the reproduction and
the regression case survive.
