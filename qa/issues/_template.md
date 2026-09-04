# <short imperative title>

| | |
|---|---|
| **ID** | YYYY-MM-DD-NN |
| **Severity** | P1 / P2 / P3 / P4 |
| **Status** | open / fixed / wont-fix / not-a-defect |
| **Area** | <system from the test matrix> |
| **Found by** | <agent> |
| **Found in** | <git sha> |
| **Run log** | <link to qa/runs/…> |

## What happens

<One paragraph. Observation only — no diagnosis here.>

## Reproduction

```
seed:
league size:
commands / click path:
```

<Numbered steps from a fresh start. Someone who has never seen this issue must
be able to follow them.>

## Expected

<What should happen, and the document and section that says so.>

## Actual

<What happens instead, with the evidence — event payload, measured number,
screenshot.>

## Why it matters

<Consequence for a player. If this is an invariant breach, name the invariant.>

## Diagnosis

<Optional, clearly labelled as a hypothesis. May be wrong; still useful.>

## Fix

<Filled in when fixed: what changed, the commit, and the test that now covers
it. A fix without a test is itself a P3 finding.>

## Verified fixed

<Filled in by regression-tester: date, build, and confirmation that the original
reproduction no longer reproduces.>
