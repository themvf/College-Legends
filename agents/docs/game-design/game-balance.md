# Game balance

The numbers the game is supposed to produce, and the tolerances around them.

**Balance values are hypotheses.** Every figure here was measured against a
running engine, not chosen by feel. When a tester finds a number outside its
band, the finding is the measurement — not an opinion that the number feels
wrong.

Two rules for reading this document:

1. **Always state your sample size.** Per-league variance on most of these is
   several points. A single league is not evidence; the distribution suite pools
   four to six independent leagues for exactly this reason.
2. **Check §6 before filing.** Several deviations are known and deliberate.
   Re-reporting them is noise.

---

## 1. Football, per team-game

Measured against real FBS rates. Tolerance is roughly ±8% unless stated.

| | sim | real FBS |
|---|---|---|
| plays / total yards | 70 / 404 | 70 / 390 |
| pass attempts | 33.2 | 31 |
| completion % | 64.8% | 63% |
| passing yards | 238 | 235 |
| rush attempts / yards | 36.5 / 165 | 36 / 155 |
| touchdowns / field goals | 3.3 / 1.1 | 3.5 / 1.2 |
| interceptions / sacks | 0.9 / 2.2 | 0.8 / 2.2 |
| points | ~27.8 | ~27 |

Per drive: **5.9 plays, 34 yards, 28% touchdown rate** (real: 5.9 / 32.5 / 29%).

Starting quarterback season: ~2,800 yards, 21–25 TD, ~8 INT.

**Reconciliation is an invariant, not a tolerance.** Touchdowns and field goals
must add exactly to the final score; interceptions thrown must equal the
opposing defense's picks; sacks taken must equal the opposing defense's sacks.
A mismatch is a correctness bug at any sample size.

## 2. Competitiveness

| | sim | real | note |
|---|---|---|---|
| home win rate | 57–60% | 57–60% | `homeFieldAdvantage` 2.8 |
| shutouts | ~0.2% | ~1% | |
| one-score games | **21.4%** | ~35% | known deviation, §6 |
| average margin | ~15 | ~17 | |

Pool **at least four leagues** for any of these. Six for one-score games, where
per-league variance is ±3.5 points on 144 games.

## 3. The economy

Weekly net at league start, by tier, with rival cohort pricing live:

| tier | weekly net |
|---|---|
| LOW | −$12K |
| MID | +$220K |
| POWER | +$576K |

Over one season at 24 programs:

| | expected |
|---|---|
| a losing season (≥9 losses) | **−$0.6M to −$1.8M** |
| a winning season (≥9 wins) | **+$1.3M to +$12.0M** |
| insolvent by season 5, of 72 | **~3** |

**The direction is an invariant.** Winning must always be worth more than
losing. An earlier build inverted this — mid-tier programs going 11-2 and 9-5
lost $7.4M and $5.7M while nobody who went 3-9 lost more than $3.7M — and that
is a worse defect than any runaway. If the worst winning season is beaten by the
best losing one, that is a P1 regardless of sample size.

**Nothing may scale with an unbounded quantity.** `fanBase` has no ceiling
(power programs reach 748,000 against an 88,000 stadium). Costs driven off it
compounded without limit and put 55 of 72 programs insolvent in five seasons.
Prestige, press and capacity are bounded; the gate is bounded by capacity.

### Ticket pricing

| | value |
|---|---|
| true weekly optimum, as a multiple of fair | 0.86x – 1.24x |
| rival cohort band | **0.90x – 1.18x** |
| programs where gouging beats fair pricing | **0 of 72** |

Rivals are deliberately competent rather than optimal, so the player can beat
them at both ends. Cohorts, by fan elasticity:

| cohort | elasticity | posture |
|---|---|---|
| Diehard | 0.35 | 1.18x |
| Blueblood | 0.60 | 1.12x |
| Developer | 0.80 | 1.08x |
| Talent magnet | 1.00 | 1.03x |
| Front-runner | 1.60 | 0.90x |

## 4. Job security

Baselines: **POWER 45 · MID 55 · LOW 62**. Career paths override the player's
own number (Dynasty Builder 92, Program Riser 65, Championship Mandate 40).

| | expected |
|---|---|
| dismissals, 24 programs over 6 seasons | ~5 |
| league average security | holds near 70, does not ratchet to 100 |
| league minimum | must be capable of falling below its start |

The pre-fix state — minimum stuck at its starting 45 across five seasons and 72
programs while the average *rose* — is the regression to watch for.

## 5. Tactics and systems

These are guard rails on any future system work:

- A **full emphasis counter** is worth ~2.7 points of scoring, measured over 400
  games a cell.
- A **strong system advantage must stay ≤50%** of that; a perfect one ≤70%.
- A **complete scouting file** is worth ~3.0 readiness, about what home field is
  worth. Information must never outweigh the tactical layer it sits on.
- **Practice**: a full install on both sides must remain impossible within the
  weekly hour ceiling.

Scheme identity should show in the box score: pass rate by identity currently
runs 41–49% against a designed 38–62%. See §6.

## 6. Known deviations — do not file these

Each is understood, deliberate, or already tracked. Report a *change* in them,
not their existence.

| deviation | why |
|---|---|
| punts ~5.7/game vs real 4.2 | there is no game clock, so drives that would expire at the half become punts |
| one-score games 21.4% vs 35% | unit ratings are deliberately sensitive so a game plan matters; the league also mixes tiers inside divisions in a way real conferences do not |
| scheme pass rate compressed to 41–49% | situational logic inside the drive loop pulls every program toward an even split; scheduled for the outcome-modifier work |
| POWER budgets grow ~2.5x over four seasons | now *earned* by winning rather than automatic; depends on rivals spending on NIL, which is open |
| LOW programs drift slowly negative | intended — a program run by nobody in particular should bleed, and it is where the coaching market gets its churn |
| advance-week ~2.1s early, ~3.5s by season 4 | engine time; see performance below |

## 7. Performance and size

| | measured |
|---|---|
| AI planning per week, 72 programs | 30ms |
| simulation per week, 72 programs | 1.63s |
| browser round trip, early career | ~2.1s |
| browser round trip, season 4 | ~3.5s |
| main-thread heap after 4 seasons | 187MB |
| live state at week 6 | ~23MB |
| compressed save, 2 seasons | ~3.0MB |
| compressed save, 20 seasons (extrapolated) | ~8MB |

A regression **above 2x** any of these is a P1. Growth within a career is
expected; growth that is superlinear in seasons is not.
