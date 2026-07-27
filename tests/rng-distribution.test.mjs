import test from "node:test";
import assert from "node:assert/strict";
import { AddressableRng, advanceWeek, beginSeason, createFictionalLeague } from "../packages/simulation/dist/index.js";

/**
 * Correctness of a single draw belongs in the determinism tests. These are the
 * statistical guarantees: nearby addresses must decorrelate, and the resulting
 * game scores must land in committed college-football tolerance bands.
 *
 * The engine addresses draws with keys that differ by one trailing character,
 * so a hash without an avalanche step produces an arithmetic sequence instead
 * of independent samples. That defect is invisible to a determinism test and
 * silently destroys every calibrated statistical band, so it is guarded here.
 */

const SAMPLE_SIZE = 20_000;
const rng = () => new AddressableRng("distribution-fixture").fork("2027", "3", "games", "game:2027:17");

const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const standardDeviation = (values) => {
  const center = mean(values);
  return Math.sqrt(values.reduce((total, value) => total + (value - center) ** 2, 0) / values.length);
};
const correlation = (left, right) => {
  const leftMean = mean(left);
  const rightMean = mean(right);
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  return covariance / Math.sqrt(leftVariance * rightVariance);
};

test("uniform draws are spread evenly across the unit interval", () => {
  const draws = Array.from({ length: SAMPLE_SIZE }, (_unused, index) => rng().at(`sample:${index}`));
  assert.ok(draws.every((draw) => draw > 0 && draw < 1), "draws must stay inside the unit interval");
  const deciles = new Array(10).fill(0);
  for (const draw of draws) deciles[Math.min(9, Math.floor(draw * 10))] += 1;
  for (const [index, count] of deciles.entries()) {
    const share = count / SAMPLE_SIZE;
    assert.ok(share > 0.085 && share < 0.115, `decile ${index} held ${(share * 100).toFixed(1)}% of draws`);
  }
});

test("keys differing by one trailing character produce uncorrelated draws", () => {
  const consecutive = Array.from({ length: SAMPLE_SIZE }, (_unused, index) => rng().at(`possession:${index}`));
  const successors = consecutive.slice(1);
  const predecessors = consecutive.slice(0, -1);
  assert.ok(
    Math.abs(correlation(predecessors, successors)) < 0.05,
    "consecutive indexed draws must not form an arithmetic sequence"
  );

  const gaps = predecessors.map((draw, index) => successors[index] - draw);
  assert.ok(
    standardDeviation(gaps) > 0.2,
    "a near-constant gap between neighbouring draws means the hash lacks an avalanche step"
  );

  const suffixA = Array.from({ length: SAMPLE_SIZE }, (_unused, index) => rng().at(`pair:${index}:normal-a`));
  const suffixB = Array.from({ length: SAMPLE_SIZE }, (_unused, index) => rng().at(`pair:${index}:normal-b`));
  assert.ok(
    Math.abs(correlation(suffixA, suffixB)) < 0.05,
    "Box-Muller inputs drawn from adjacent suffixes must stay independent"
  );
});

test("normal draws follow a bell curve rather than clustering", () => {
  const draws = Array.from({ length: SAMPLE_SIZE }, (_unused, index) => rng().normal(`sample:${index}`));
  const center = mean(draws);
  const spread = standardDeviation(draws);
  assert.ok(Math.abs(center) < 0.05, `expected a centered distribution, saw mean ${center.toFixed(3)}`);
  assert.ok(spread > 0.95 && spread < 1.05, `expected unit spread, saw ${spread.toFixed(3)}`);

  const within = (multiple) => draws.filter((draw) => Math.abs(draw - center) < spread * multiple).length / SAMPLE_SIZE;
  assert.ok(Math.abs(within(1) - 0.683) < 0.02, `expected ~68.3% within one deviation, saw ${(within(1) * 100).toFixed(1)}%`);
  assert.ok(Math.abs(within(2) - 0.954) < 0.02, `expected ~95.4% within two deviations, saw ${(within(2) * 100).toFixed(1)}%`);

  // A hash without avalanche produces a bi-peaked shape with empty tails, so
  // assert the centre outweighs its neighbours and the tails stay populated.
  const buckets = new Array(12).fill(0);
  for (const draw of draws) buckets[Math.min(11, Math.max(0, Math.floor((draw + 3) / 6 * 12)))] += 1;
  const peak = Math.max(...buckets);
  assert.equal(Math.max(buckets[5], buckets[6]), peak, "the mode must sit at the centre of the distribution");
  assert.ok(buckets[0] > 0 && buckets[11] > 0, "both tails must be populated");
});

test("simulated scores land in college-football tolerance bands", () => {
  let state = beginSeason(createFictionalLeague("score-distribution", 24));
  const scores = [];
  const margins = [];
  // Week 14 rolls the season over and resets the counter, so drive the loop
  // from the regular-season week count rather than from state.week.
  for (let week = 0; week < 14; week += 1) {
    const result = advanceWeek(state);
    state = result.state;
    for (const event of result.events) {
      if (event.type !== "GAME_COMPLETED") continue;
      scores.push(event.homeScore, event.awayScore);
      margins.push(Math.abs(event.homeScore - event.awayScore));
    }
  }
  assert.ok(scores.length > 200, `expected a full season of games, saw ${scores.length / 2}`);

  const averageScore = mean(scores);
  assert.ok(averageScore > 20 && averageScore < 40, `average team score ${averageScore.toFixed(1)} is outside 20-40`);

  const sorted = [...scores].sort((left, right) => left - right);
  const median = sorted[Math.floor(sorted.length / 2)];
  assert.ok(median > 15 && median < 40, `median team score ${median} is outside 15-40`);
  assert.ok(
    Math.abs(averageScore - median) < 8,
    "a large gap between mean and median means the score distribution is bimodal"
  );

  const shutoutRate = scores.filter((score) => score === 0).length / scores.length;
  assert.ok(shutoutRate < 0.05, `shutout rate ${(shutoutRate * 100).toFixed(1)}% exceeds 5%`);
  assert.ok(sorted.at(-1) < 100, `top score ${sorted.at(-1)} exceeds a credible ceiling`);

  const averageMargin = mean(margins);
  assert.ok(averageMargin > 8 && averageMargin < 25, `average margin ${averageMargin.toFixed(1)} is outside 8-25`);

  // Real FBS runs about 35% one-score games; the engine sits near 27% because
  // possessions are independent Bernoulli trials with no game script — real
  // games converge as trailing teams gain possessions and leaders drain clock.
  // The tolerance guards against a collapse back toward the bimodal scores the
  // unfinalized hash produced, not against that known modelling gap.
  const oneScoreRate = margins.filter((margin) => margin <= 8).length / margins.length;
  assert.ok(oneScoreRate > 0.2, `one-score games at ${(oneScoreRate * 100).toFixed(1)}% is too competitive-thin`);
});
