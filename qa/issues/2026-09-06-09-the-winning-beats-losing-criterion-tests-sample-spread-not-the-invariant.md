# The winning-beats-losing criterion tests sample spread, not the invariant

| | |
|---|---|
| **ID** | 2026-09-06-09 |
| **Severity** | P4 — documentation correction |
| **Status** | open |
| **Area** | Economy / QA ground truth |
| **Raised as** | economy-tester C5, suggested P2 with a stated qualification |
| **Verdict** | **Not a defect in the engine.** The criterion is wrong |
| **Adjudicated by** | qa-lead, from an independent measurement |
| **Run log** | `qa/runs/2026-09-05-economy.md` |

## The claim

`game-balance.md` §3 states the economy's most important invariant and then
gives a test for it:

> **The direction is an invariant.** Winning must always be worth more than
> losing. … **If the worst winning season is beaten by the best losing one, that
> is a P1 regardless of sample size.**

The reporter ran exactly that test and it failed in 17 of 20 seasons, and in 10
of 11 tier-eras after controlling for size and calendar. Correctly, they did not
file it as a P1 and flagged it as needing a qualification.

## The measurement

qa-lead, `qa/scratch/lead-c5-winning.mjs`, fresh seeds `lead-c5-a` / `-b`,
24 programs, **eight seasons, 384 program-seasons**, budget change measured
across the regular season only so the record on the books is the record that
earned the money.

**The literal test fails, and fails in every tier:**

| | worst winning season | best losing season | verdict |
|---|---|---|---|
| pooled | +$1.05M (MID, 9-5) | +$14.14M (POWER, 3-9) | FAIL |
| LOW | +$2.29M (n=2) | +$5.70M (n=66) | FAIL |
| MID | +$1.05M (n=56) | +$5.62M (n=8) | FAIL |
| POWER | +$9.24M (n=47) | +$14.14M (n=1) | FAIL |

**The invariant itself holds, and holds strongly.** Mean budget change by win
count, pooled over all 384 program-seasons:

```
 0W  n=  5  +$0.93M      8W  n= 32   +$6.83M
 1W  n= 14  +$0.46M      9W  n= 35   +$6.82M
 2W  n= 20  +$1.85M     10W  n= 21   +$8.41M
 3W  n= 36  +$2.31M     11W  n= 16  +$12.01M
 4W  n= 43  +$2.81M     12W  n= 15  +$13.67M
 5W  n= 43  +$3.53M     13W  n=  8  +$15.82M
 6W  n= 55  +$4.02M     14W  n=  7  +$17.62M
 7W  n= 31  +$5.94M     15W  n=  3  +$18.33M
```

Monotone across sixteen bands with one flat step (8W → 9W, a $10K difference on
n=32 and n=35). Winning a game is worth roughly **$1.2M** on this curve. And the
means are correct *within* every tier too: LOW +$2.74M winning against +$1.32M
losing, MID +$6.22M against +$3.74M, POWER +$16.24M against +$14.14M.

## Why the criterion is wrong

Two separate defects in one sentence.

**1. It does not control for tier.** A POWER program going 3-9 out-earns a MID
program going 9-5 because POWER opens on roughly $20M of revenue against MID's
$6M. That is not "losing pays better than winning" — it is "a big program earns
more than a small one", which is the premise of the game and the reason career
paths exist. The reporter saw this and controlled for it; the document does not.

**2. Min-versus-max is a comparison of order statistics, not of central
tendency.** The minimum of 56 winning seasons and the maximum of 66 losing
seasons will cross for *any* pair of overlapping distributions once the samples
are large enough, however far apart their means are. The criterion therefore
gets **more** likely to fail the more evidence you gather — which is the exact
inverse of what a statistical test should do, and it is why the document's own
"regardless of sample size" clause makes it worse rather than more rigorous.

The engine defect this criterion was written after was real and was not subtle:
`CLAUDE.md` records mid-tier programs going 11-2 and 9-5 **losing $7.4M and
$5.7M** while nobody who went 3-9 lost more than $3.7M. That is a sign flip
across the means. The criterion caught it, and then was written down in a form
that only worked because the defect was that large.

## The correction

`game-balance.md` §3's test should be replaced with one that tests the invariant:

> **Within a tier**, mean budget change must rise with wins, and the relationship
> across win counts must be monotone within noise. Pool at least four leagues.
> A sign flip — any losing band out-earning any winning band **on means** — is a
> P1 at any sample size. Extremes crossing is not.

The current engine passes that test cleanly and would have failed it flat at the
build the invariant was written against.

## What this does not excuse

Two things stay open and neither is fixed by rewriting the criterion:

- **Losing is profitable in absolute terms.** Every losing band above is
  positive, against §3's own *"a losing season (≥9 losses) −$0.6M to −$1.8M"*.
  Some of that is horizon — §3 measured one season at league start, this pools
  eight — but it needs measuring at matched horizon before §3's row is trusted
  either. Carried on `2026-09-06-08`.
- **7 of 72 programs still go insolvent by season five.** See `2026-09-06-08`.
  The two facts together say the programs that fail are not failing at football,
  which is the more interesting question and nobody has answered it.

## Calibration note

The reporter suggested P2 and wrote *"with an important qualification"*. That
hedge is the correct behaviour and is why this was caught rather than filed as a
P1 against a working engine. A tester who had simply applied the stated criterion
would have produced the most serious finding in three cycles, and it would have
been wrong.

## Fix

<pending — a documentation change to `agents/docs/game-design/game-balance.md` §3>
