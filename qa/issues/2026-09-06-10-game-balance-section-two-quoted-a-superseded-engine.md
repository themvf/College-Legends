# `game-balance.md` §2 quoted a superseded engine

| | |
|---|---|
| **ID** | 2026-09-06-10 |
| **Severity** | P4 — documentation correction, applied |
| **Status** | fixed (documentation only) |
| **Area** | QA ground truth |
| **Raised as** | balance-tester D1, reported as a measurement outside band |
| **Verdict** | **Not a defect in the engine.** The document was stale |
| **Adjudicated by** | qa-lead, from an independent measurement |
| **Run log** | `qa/runs/2026-09-05-balance.md` |

## The claim

`game-balance.md` §2 stated **average margin ~15** and **shutouts ~0.2%**. Brief
D measured 21.5 and 2.62% at 72 programs and 22.4 and 2.55% at 24, over twelve
independent leagues and 3,456 games, per-league sd 0.55 and 0.42. The reporter's
hypothesis was that §2's rows were stale rather than breached, and asked for that
to be established rather than assumed — correctly, because a stale-band verdict
is convenient for everybody.

## The verdict: stale, and provably so

**Reproduced first.** qa-lead re-measured on **fresh seeds of my own**, not the
reporter's, so this is an independent draw rather than a re-run:

| | leagues | games | margin | shutouts | one-score | home | pts/team-game |
|---|---|---|---|---|---|---|---|
| 24 programs | 6 | 864 | **22.42** | **2.26%** | 22.9% | 60.2% | 26.6 |
| 72 programs | 3 | 1,296 | **21.71** | **2.58%** | 24.8% | 61.0% | 26.3 |

Combined with D's twelve leagues: **15 leagues, 4,752 games**, all agreeing.

**Then the provenance, which is what settles it.** Four independent facts:

1. `~15` and `~0.2%` appear verbatim and *only* in `CLAUDE.md`'s 2026-07
   RNG-finalizer table (lines 97 and 99), which measured `simulateGameScore` —
   a function that no longer exists.
2. `CLAUDE.md` says so itself, in that section: *"`simulateGameScore`,
   `recordGameStats`, and the stat bands described above no longer exist — the
   numbers in this section are the targets that work was calibrated against,
   kept because they document where the rates came from."*
3. The unit-resolution work that replaced it re-baselined ten per-team-game rates
   and **did not re-measure margin or shutouts**. Its only statement about the
   margin distribution is *"margins stay fat-tailed"* — the deviation now in §6.
4. `git log --follow` shows `game-balance.md` was created in a single commit
   (`9c77444`, the QA framework), transcribing those tables. The stale pair came
   across with everything else.

**And the committed suite agrees with the engine, not the document.**
`tests/rng-distribution.test.mjs` has asserted `averageMargin` in **8–25** and
`shutoutRate < 5%` since `f1a5f69` on 2026-07-27, and those tolerances have
**never been tightened** toward the ~15 / ~0.2% the prose claimed. Verified by
reading the assertion at all three commits that touched it. The document
contradicted the project's own committed statistical contract.

## What was changed

`agents/docs/game-design/game-balance.md`:

- §2's `sim` column re-baselined to the measured figures, dated **2026-09-06**,
  with the sample stated (15 leagues, 4,752 games, both league sizes) and a
  "Provenance" subsection recording what it replaced and why.
- §2's per-league variance note corrected from ±3.5 to the **measured ±4.2** on
  144 games. A single 24-program league in a six-league set reported anywhere
  from 16.0% to 28.5%, which vindicates the document's own six-league
  instruction.
- §6's one-score row widened to own **all three** views of the same
  distribution — one-score rate, average margin and shutout rate — so a future
  tester cannot file two thirds of a known deviation as new.

## Why this mattered enough to chase

**A band nobody can meet is worse than no band.** A stale `~15` sitting in the
ground-truth document guarantees that every future `balance-tester` reports the
same non-finding, and each time somebody has to spend a cycle establishing that
it is not a regression. That is precisely the noise the triage step exists to
stop, and it was costing a cycle to re-derive.

## Still worth attention, and not as a defect

The engine is now **further from real football on these two figures than the
stale prose claimed**: +26% on average margin (21.5 against a real 17) and
roughly 2.6× on shutouts (2.6% against a real ~1%). Together with the known
one-score deviation, that is one fat-tailed distribution, and §6 now says so.

Two figures to hand to cycle 4's `simulation-accuracy-tester` rather than a
tuning task opened blind:

- **Home win rate at 72 programs runs 60–61%**, at or just over the top of the
  57–60% band, on nine leagues (D's six plus my three). At 24 programs it is
  inside. Recorded, not filed — it is 0.4 points over a band whose real-world
  reference tops out at the same number.
- **Points per team-game is 26.5**, inside ±8%, so the fat tail is a spread
  problem rather than a scoring one.

## Harness gap inherited by cycle 4

D's D1 harness tried to read per-team-game football rates off
`state.playerGameStats` and retained only 22 team-game rows per league, because
season aggregation folds the game log at rollover. **No §1 figure came out of
this run.** Rates have to be accumulated week by week from `advanceWeek`'s
events. Recorded here so cycle 4 does not rediscover it.
