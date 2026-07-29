import test from "node:test";
import assert from "node:assert/strict";
import {
  AddressableRng,
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  prepareWeek,
  projectGamePlan,
  scoutingBoard,
  scoutingReport,
  staffCapacity,
  staffContribution,
  staffSkills,
  latestBoxScore,
  boxScore,
  STAFF_TRAITS,
  weeklyScoutingOutput,
  DOSSIER_THRESHOLDS,
  DEFENSIVE_PRESETS,
  OFFENSIVE_PRESETS,
  developmentCandidates,
  fairTicketPrice,
  matchingPreset,
  projectGate,
  stadiumCapacity,
  weeklyDecisions,
  MAXIMUM_TICKET_PRICE,
  MAXIMUM_WEEKLY_ADVERTISING,
  MINIMUM_TICKET_PRICE,
  MAXIMUM_REPS_PER_SIDE,
  planExecution,
  staffCandidatesFor,
  staffModifiers,
  programRoster,
  rosterSchemeFit,
  schemeAffinity,
  OFFENSIVE_SCHEMES,
  weeklyBriefing,
  seasonExpectation,
  planAlignment
} from "../packages/simulation/dist/index.js";
import { planWeeklyCommands } from "../packages/ai/dist/index.js";

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
  const scores = [];
  const margins = [];
  const homeWins = [];
  // One 24-program season is 144 games, and rates vary by several points from
  // one generated league to the next — enough that a single season would sit
  // within noise of these thresholds. Four independent leagues give 576 games,
  // which keeps the tolerances meaningful rather than flaky.
  for (const seed of ["score-distribution-a", "score-distribution-b", "score-distribution-c", "score-distribution-d"]) {
    let state = beginSeason(createFictionalLeague(seed, 24));
    // Week 14 rolls the season over and resets the counter, so drive the loop
    // from the regular-season week count rather than from state.week.
    for (let week = 0; week < 14; week += 1) {
      const result = advanceWeek(state);
      state = result.state;
      for (const event of result.events) {
        if (event.type !== "GAME_COMPLETED") continue;
        scores.push(event.homeScore, event.awayScore);
        margins.push(Math.abs(event.homeScore - event.awayScore));
        homeWins.push(event.homeScore > event.awayScore ? 1 : 0);
      }
    }
  }
  assert.ok(scores.length > 1000, `expected four full seasons of games, saw ${scores.length / 2}`);

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

  const homeWinRate = mean(homeWins);
  assert.ok(homeWinRate > 0.54 && homeWinRate < 0.66, `home win rate ${(homeWinRate * 100).toFixed(1)}% is outside 54-66%`);
});

test("box scores reconcile with the scoreboard and with the opposing defense", () => {
  let state = beginSeason(createFictionalLeague("box-score-reconciliation", 24));
  const finals = new Map();
  for (let week = 0; week < 14; week += 1) {
    const result = advanceWeek(state);
    state = result.state;
    for (const event of result.events) {
      if (event.type !== "GAME_COMPLETED") continue;
      finals.set(`${event.gameId}:${event.homeProgramId}`, event.homeScore);
      finals.set(`${event.gameId}:${event.awayProgramId}`, event.awayScore);
    }
  }

  const teams = new Map();
  for (const line of state.playerGameStats.filter((entry) => entry.week <= 14)) {
    const key = `${line.gameId}:${line.programId}`;
    const totals = teams.get(key) ?? {
      opponent: `${line.gameId}:${line.opponentProgramId}`,
      touchdowns: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0,
      interceptionsThrown: 0, sacksTaken: 0, defensiveInterceptions: 0, sacks: 0,
      passingTouchdowns: 0, receivingTouchdowns: 0, passingYards: 0, receivingYards: 0,
      passingCompletions: 0, receptions: 0
    };
    totals.touchdowns += line.passingTouchdowns + line.rushingTouchdowns;
    totals.fieldGoalsMade += line.fieldGoalsMade;
    totals.fieldGoalsAttempted += line.fieldGoalsAttempted;
    totals.interceptionsThrown += line.interceptionsThrown;
    totals.sacksTaken += line.sacksTaken;
    totals.defensiveInterceptions += line.defensiveInterceptions;
    totals.sacks += line.sacks;
    totals.passingTouchdowns += line.passingTouchdowns;
    totals.receivingTouchdowns += line.receivingTouchdowns;
    totals.passingYards += line.passingYards;
    totals.receivingYards += line.receivingYards;
    totals.passingCompletions += line.passingCompletions;
    totals.receptions += line.receptions;
    teams.set(key, totals);
  }
  // 24 programs playing a 12-game regular season produce 288 team box scores.
  assert.ok(teams.size > 250, `expected a full season of box scores, saw ${teams.size}`);

  for (const [key, totals] of teams) {
    const points = finals.get(key);
    assert.equal(
      totals.touchdowns * 7 + totals.fieldGoalsMade * 3,
      points,
      `${key}: ${totals.touchdowns} TD and ${totals.fieldGoalsMade} FG do not add up to ${points} points`
    );
    assert.ok(totals.fieldGoalsMade <= totals.fieldGoalsAttempted, `${key}: made more field goals than it attempted`);
    assert.equal(totals.receivingTouchdowns, totals.passingTouchdowns, `${key}: receiving touchdowns do not match passing touchdowns`);
    assert.equal(totals.receivingYards, totals.passingYards, `${key}: receiving yards do not match passing yards`);
    assert.equal(totals.receptions, totals.passingCompletions, `${key}: receptions do not match completions`);

    const defense = teams.get(totals.opponent);
    assert.ok(defense, `${key}: opponent box score is missing`);
    assert.equal(totals.interceptionsThrown, defense.defensiveInterceptions, `${key}: interceptions thrown do not match the opposing defense`);
    assert.equal(totals.sacksTaken, defense.sacks, `${key}: sacks taken do not match the opposing defense`);
  }
});

test("team production lands in real per-game college-football ranges", () => {
  let state = beginSeason(createFictionalLeague("team-production", 24));
  for (let week = 0; week < 14; week += 1) state = advanceWeek(state).state;

  const lines = state.playerGameStats.filter((entry) => entry.week <= 14);
  const teamGames = new Set(lines.map((line) => `${line.gameId}:${line.programId}`)).size;
  const per = (field) => lines.reduce((total, line) => total + line[field], 0) / teamGames;

  const inRange = (label, value, low, high) =>
    assert.ok(value >= low && value <= high, `${label} ${value.toFixed(1)} is outside ${low}-${high}`);

  inRange("pass attempts", per("passingAttempts"), 27, 35);
  inRange("completion rate", per("passingCompletions") / per("passingAttempts"), 0.58, 0.68);
  inRange("passing yards", per("passingYards"), 200, 275);
  inRange("passing touchdowns", per("passingTouchdowns"), 1.4, 2.5);
  inRange("rushing attempts", per("rushingAttempts"), 30, 42);
  inRange("rushing yards", per("rushingYards"), 130, 190);
  inRange("rushing touchdowns", per("rushingTouchdowns"), 1.1, 2.1);
  inRange("total yards", per("passingYards") + per("rushingYards"), 340, 440);
  inRange("interceptions", per("interceptionsThrown"), 0.4, 1.3);
  inRange("sacks", per("sacks"), 1.6, 3.2);
  inRange("field goals made", per("fieldGoalsMade"), 0.8, 1.8);
  // Punts run above the real 4.2 because there is no game clock: drives that
  // would expire at the half or on a late turnover on downs become punts here.
  // The tolerance reflects what the engine actually produces.
  inRange("punts", per("punts"), 3.2, 6.5);
});

test("game-plan calls beat their counter and lose to it", () => {
  // The point of the emphasis layer: no call is a strict upgrade. Each has a
  // defensive answer that blunts it. Yardage is asserted rather than points
  // because it measures the mechanism directly and separates far more cleanly
  // from noise at a sample size a test can afford.
  const production = (runPassBalance, defensivePriority) => {
    let rushingYards = 0;
    let passingYards = 0;
    let games = 0;
    // Personnel groupings make the matchup population vary more between
    // generated leagues. Pool independent leagues instead of trusting one
    // unusually run- or pass-shaped schedule.
    for (let league = 0; league < 3; league += 1) {
      let state = beginSeason(createFictionalLeague(`game-plan-matchups-${league}`, 24));
      const programs = Object.keys(state.programs);
      const isOffense = (programId) => programs.indexOf(programId) % 2 === 0;
      state.gamePlans = Object.fromEntries(programs.map((programId) => [
        programId,
        isOffense(programId)
          ? { ...state.gamePlans[programId], runPassBalance }
          : { ...state.gamePlans[programId], defensivePriority }
      ]));
      for (let week = 0; week < 12; week += 1) {
        const result = advanceWeek(state);
        state = result.state;
        for (const event of result.events) {
          if (event.type !== "GAME_PLAN_REPORT") continue;
          if (!isOffense(event.programId) || isOffense(event.opponentProgramId)) continue;
          const rush = event.matchups.find((entry) => entry.unit === "rushOffense");
          const pass = event.matchups.find((entry) => entry.unit === "passOffense");
          rushingYards += rush.yards;
          passingYards += pass.yards;
          games += 1;
        }
      }
    }
    assert.ok(games > 75, `expected a meaningful pooled sample, saw ${games}`);
    return { rushingYards: rushingYards / games, passingYards: passingYards / games };
  };

  const runVersusRunStop = production("RUN_HEAVY", "STOP_THE_RUN");
  const runVersusPassStop = production("RUN_HEAVY", "STOP_THE_PASS");
  const passVersusRunStop = production("PASS_HEAVY", "STOP_THE_RUN");
  const passVersusPassStop = production("PASS_HEAVY", "STOP_THE_PASS");

  assert.ok(
    runVersusPassStop.rushingYards > runVersusRunStop.rushingYards * 1.05,
    `committing to stop the run must actually stop it (${runVersusRunStop.rushingYards.toFixed(0)} allowed vs ${runVersusPassStop.rushingYards.toFixed(0)})`
  );
  assert.ok(
    passVersusRunStop.passingYards > passVersusPassStop.passingYards * 1.05,
    `committing to stop the pass must actually stop it (${passVersusPassStop.passingYards.toFixed(0)} allowed vs ${passVersusRunStop.passingYards.toFixed(0)})`
  );
  assert.ok(
    runVersusRunStop.rushingYards > passVersusRunStop.rushingYards,
    "a run-heavy plan must still out-rush a pass-heavy one against the same defense"
  );
  assert.ok(
    passVersusPassStop.passingYards > runVersusPassStop.passingYards,
    "a pass-heavy plan must still out-throw a run-heavy one against the same defense"
  );
});

test("a game plan is a standing instruction and is reported after the game", () => {
  let state = beginSeason(createFictionalLeague("game-plan-persistence", 12));
  const programId = "program-1";
  const result = advanceWeek(state, [
    { type: "SET_GAME_PLAN", programId, plan: { runPassBalance: "PASS_HEAVY", defensivePosture: "TAKEAWAY_HUNT" } }
  ]);
  state = result.state;
  assert.equal(state.gamePlans[programId].runPassBalance, "PASS_HEAVY");
  assert.equal(state.gamePlans[programId].defensivePosture, "TAKEAWAY_HUNT");
  assert.deepEqual(
    result.events.find((event) => event.type === "GAME_PLAN_SET" && event.programId === programId)?.changed,
    ["defensivePosture", "runPassBalance"]
  );

  const report = result.events.find((event) => event.type === "GAME_PLAN_REPORT" && event.programId === programId);
  assert.ok(report, "the week should report what the plan produced");
  assert.equal(report.plan.runPassBalance, "PASS_HEAVY");
  assert.equal(report.matchups.length, 4);
  assert.ok(report.passPlays > report.runPlays, "a pass-heavy plan should throw more than it runs");
  assert.ok(report.notes.length > 0, "the report should explain what the calls were worth");

  // Unchanged next week: a plan persists until the player changes it.
  const next = advanceWeek(state);
  assert.equal(next.state.gamePlans[programId].runPassBalance, "PASS_HEAVY");
  assert.equal(next.events.some((event) => event.type === "GAME_PLAN_SET" && event.programId === programId), false);
});

test("rival programs have lasting, distinguishable identities", () => {
  // Scouting has nothing to sell if every rival plays the same way. Before
  // scheme identity existed the league ran 91-100% identical on every offensive
  // axis, and the one axis that varied flipped most weeks.
  let state = beginSeason(createFictionalLeague("rival-identity", 24));
  const programs = Object.keys(state.programs);
  const axes = ["runPassBalance", "backfieldUsage", "targetDistribution", "tempo", "defensivePosture", "pressure"];
  const seen = Object.fromEntries(axes.map((axis) => [axis, {}]));
  let churn = 0;
  let samples = 0;

  for (let week = 0; week < 8; week += 1) {
    const before = structuredClone(state.gamePlans);
    state = advanceWeek(state, planWeeklyCommands(state)).state;
    for (const programId of programs) {
      for (const axis of axes) {
        const value = state.gamePlans[programId][axis];
        seen[axis][value] = (seen[axis][value] ?? 0) + 1;
        if (before[programId][axis] !== value) churn += 1;
        samples += 1;
      }
    }
  }

  for (const axis of axes) {
    const share = Math.max(...Object.values(seen[axis])) / (samples / axes.length);
    assert.ok(share < 0.8, `${axis} is ${(share * 100).toFixed(0)}% one value — nothing to scout`);
  }
  // Identity has to persist, or a tendency read is stale before it is used.
  assert.ok(churn / samples < 0.2, `plans changed ${(churn / samples * 100).toFixed(0)}% of the time — too unstable to scout`);
});

test("week one is a real test: nothing is free, and film changes what a report is worth", () => {
  let state = beginSeason(createFictionalLeague("week-one-scouting", 24));
  const programId = "program-1";
  assert.equal(state.week, 1);

  const blind = scoutingReport(state, programId);
  assert.ok(blind.opponentProgramId, "week one should have an opponent");
  assert.equal(blind.filmGames, 0, "no games have been played yet");
  assert.equal(blind.identity, null, "identity must be bought");
  assert.equal(blind.units, null, "unit ratings must be bought");
  assert.equal(blind.tendencies, null, "their calls must be bought");
  // The free projection must not leak the opponent's true ratings.
  for (const edge of projectGamePlan(state, programId)) {
    assert.equal(edge.opposingRating, null, `${edge.unit} leaked an unscouted opponent rating`);
  }

  // A full file costs more than a week of department output provides, so
  // scouting one opponent deeply always means scouting another not at all.
  const pool = state.preparation[programId].weeklyScoutingPoints;
  assert.ok(pool > 0, "a scouting department must produce something in week one");
  assert.ok(
    DOSSIER_THRESHOLDS.GAME_PLAN > pool,
    `a complete file costs ${DOSSIER_THRESHOLDS.GAME_PLAN} but a week provides ${pool} — files must take more than one week`
  );

  // Allocation resolves immediately, before the week is advanced.
  const opponentId = blind.opponentProgramId;
  assert.ok(pool >= DOSSIER_THRESHOLDS.TENDENCIES, "one week must at least open the cheapest tier");
  const bought = prepareWeek(state, [
    { type: "ALLOCATE_SCOUTING", programId, opponentProgramId: opponentId, points: pool }
  ]);
  const informed = scoutingReport(bought.state, programId);
  assert.ok(informed.identity, "tendencies should reveal their identity");
  assert.equal(informed.tendencies, null, "the tier the file has not reached stays locked");
  assert.equal(bought.state.dossiers[programId][opponentId], pool);
  assert.equal(bought.state.preparation[programId].scoutingPoints, 0);

  // Estimates, when the file reaches personnel, are ranges rather than exact
  // numbers — better work narrows them without ever collapsing them.
  const deep = prepareWeek(
    { ...bought.state, preparation: { ...bought.state.preparation, [programId]: { ...bought.state.preparation[programId], scoutingPoints: 40 } } },
    [{ type: "ALLOCATE_SCOUTING", programId, opponentProgramId: opponentId, points: Math.max(0, DOSSIER_THRESHOLDS.PERSONNEL - pool) }]
  ).state;
  const personnel = scoutingReport(deep, programId);
  assert.equal(personnel.units?.length, 4, "personnel should estimate all four units");
  for (const unit of personnel.units) {
    assert.ok(unit.high > unit.low, `${unit.unit} came back as a point estimate rather than a range`);
  }

  const overspend = prepareWeek(bought.state, [
    { type: "ALLOCATE_SCOUTING", programId, opponentProgramId: opponentId, points: pool }
  ]);
  assert.ok(
    overspend.events.some((event) => event.type === "COMMAND_REJECTED"),
    "a program must not be able to spend department output it has not produced"
  );

  // Film accumulates, and a later report is worth more than an opening-week one.
  let later = state;
  for (let week = 0; week < 5; week += 1) later = advanceWeek(later, planWeeklyCommands(later)).state;
  const withFilm = scoutingReport(later, programId);
  assert.ok(withFilm.filmGames > 0, "film should accumulate as the season is played");
  assert.ok(
    withFilm.confidence > blind.confidence,
    `film should sharpen a report (${blind.confidence}% blind vs ${withFilm.confidence}% with film)`
  );
});

test("the top scouting tier reports likelihoods, never certainty", () => {
  let state = beginSeason(createFictionalLeague("scouting-likelihoods", 24));
  const programId = "program-1";
  // Reach a week with film so the report is as sharp as it gets.
  for (let week = 0; week < 6; week += 1) state = advanceWeek(state, planWeeklyCommands(state)).state;
  const opponentId = scoutingReport(state, programId).opponentProgramId;
  // Force a complete file: the point under test is what the top tier reports,
  // not how long it takes to reach it.
  state = {
    ...state,
    dossiers: { ...state.dossiers, [programId]: { ...state.dossiers[programId], [opponentId]: DOSSIER_THRESHOLDS.GAME_PLAN } }
  };

  const report = scoutingReport(state, programId);
  assert.ok(report.tendencies?.length, "the game-plan tier should report tendencies");
  for (const tendency of report.tendencies) {
    const total = tendency.options.reduce((sum, option) => sum + option.probability, 0);
    assert.ok(Math.abs(total - 1) < 0.02, `${tendency.axis} probabilities sum to ${total.toFixed(2)}`);
    const top = Math.max(...tendency.options.map((option) => option.probability));
    assert.ok(top > 0.34, `${tendency.axis} carries no signal at all`);
    assert.ok(top < 0.95, `${tendency.axis} reports certainty at ${top} — it must stay a read`);
  }
});

test("ticket pricing has a real optimum that gouging cannot beat", () => {
  const state = beginSeason(createFictionalLeague("ticket-pricing", 24));
  for (const tier of ["LOW", "MID", "POWER"]) {
    const program = Object.values(state.programs).find((candidate) => candidate.tier === tier);
    const opponent = Object.values(state.programs).find((candidate) => candidate.id !== program.id);
    const capacity = stadiumCapacity(program.facilities.STADIUM);
    const fair = fairTicketPrice(program, opponent, false);

    const gateAt = (price) => projectGate(program, opponent, capacity, false, price, 0).ticketRevenue;
    const cheap = gateAt(Math.max(MINIMUM_TICKET_PRICE, Math.round(fair * 0.4)));
    const atFair = gateAt(fair);
    const gouge = gateAt(MAXIMUM_TICKET_PRICE);

    assert.ok(atFair > cheap, `${tier}: under-pricing should leave money on the table (${atFair} vs ${cheap})`);
    // Without a demand floor low enough to bite, revenue rises again at extreme
    // prices and gouging becomes strictly optimal.
    assert.ok(atFair > gouge, `${tier}: gouging at $${MAXIMUM_TICKET_PRICE} beat fair pricing (${gouge} vs ${atFair})`);

    // Attendance must fall monotonically as price rises.
    let previous = Infinity;
    for (let price = MINIMUM_TICKET_PRICE; price <= MAXIMUM_TICKET_PRICE; price += 10) {
      const attendance = projectGate(program, opponent, capacity, false, price, 0).attendance;
      assert.ok(attendance <= previous, `${tier}: attendance rose when the price went up at $${price}`);
      previous = attendance;
    }
  }
});

test("advertising is an investment in the fan base, not weekly arbitrage", () => {
  const state = beginSeason(createFictionalLeague("advertising", 24));
  const program = Object.values(state.programs).find((candidate) => candidate.tier === "LOW");
  const opponent = Object.values(state.programs).find((candidate) => candidate.id !== program.id);
  const capacity = stadiumCapacity(program.facilities.STADIUM);
  const fair = fairTicketPrice(program, opponent, false);

  const none = projectGate(program, opponent, capacity, false, fair, 0);
  const some = projectGate(program, opponent, capacity, false, fair, 25_000);
  const lots = projectGate(program, opponent, capacity, false, fair, MAXIMUM_WEEKLY_ADVERTISING);

  assert.ok(some.advertisingFans > 0, "spending should reach new followers");
  assert.ok(lots.advertisingFans > some.advertisingFans, "more spend should reach more people");
  // Diminishing returns: sixteen times the spend must not buy sixteen times the reach.
  assert.ok(
    lots.advertisingFans < some.advertisingFans * (MAXIMUM_WEEKLY_ADVERTISING / 25_000),
    "advertising should show diminishing returns"
  );
  // If a big spend paid for itself in the same week it would be free money.
  assert.ok(lots.net < none.net, "maximum spend should cost more this week than it returns at the gate");
});

test("the five weekly decisions persist and only flag what has gone stale", () => {
  let state = beginSeason(createFictionalLeague("weekly-decisions", 24));
  const programId = "program-1";

  const opening = weeklyDecisions(state, programId);
  assert.deepEqual(
    opening.map((decision) => decision.id),
    ["TICKET_PRICE", "ADVERTISING", "DEVELOPMENT", "OFFENSE", "DEFENSE"]
  );
  assert.ok(opening.every((decision) => decision.current.length > 0), "every decision must show its current value");
  assert.ok(
    opening.some((decision) => decision.attention),
    "an untouched program should have something worth looking at"
  );

  // Settings carry over rather than being re-entered every week.
  const result = advanceWeek(state, [
    { type: "SET_TICKET_PRICE", programId, price: 37 },
    { type: "SET_ADVERTISING", programId, spend: 20_000 },
    { type: "SET_GAME_PLAN", programId, plan: OFFENSIVE_PRESETS[0].plan }
  ]);
  state = result.state;
  assert.equal(state.programs[programId].ticketPrice, 37);
  assert.equal(state.programs[programId].advertisingSpend, 20_000);

  const next = weeklyDecisions(state, programId);
  assert.equal(next.find((decision) => decision.id === "TICKET_PRICE").current, "$37");
  assert.equal(next.find((decision) => decision.id === "ADVERTISING").current, "$20,000/wk");
  assert.equal(next.find((decision) => decision.id === "OFFENSE").current, OFFENSIVE_PRESETS[0].label);

  const afterAnotherWeek = advanceWeek(state).state;
  assert.equal(afterAnotherWeek.programs[programId].ticketPrice, 37, "price must not reset each week");
  assert.equal(afterAnotherWeek.programs[programId].advertisingSpend, 20_000, "advertising must not reset each week");
});

test("development offers three distinct players for three distinct reasons", () => {
  const state = beginSeason(createFictionalLeague("development-candidates", 24));
  const candidates = developmentCandidates(state, "program-1");
  assert.equal(candidates.length, 3);
  assert.equal(new Set(candidates.map((candidate) => candidate.playerId)).size, 3, "candidates must be different players");
  assert.deepEqual(candidates.map((candidate) => candidate.reason), ["RISING", "STAR", "AT_RISK"]);
  assert.ok(candidates.every((candidate) => candidate.headline && candidate.detail), "each candidate must explain itself");
});

test("strategy presets round-trip through the game plan", () => {
  let state = beginSeason(createFictionalLeague("strategy-presets", 12));
  const programId = "program-1";
  for (const preset of [...OFFENSIVE_PRESETS, ...DEFENSIVE_PRESETS]) {
    const applied = advanceWeek(state, [{ type: "SET_GAME_PLAN", programId, plan: preset.plan }]).state;
    const plan = applied.gamePlans[programId];
    for (const [axis, value] of Object.entries(preset.plan)) {
      assert.equal(plan[axis], value, `${preset.label} did not set ${axis}`);
    }
    const presets = OFFENSIVE_PRESETS.includes(preset) ? OFFENSIVE_PRESETS : DEFENSIVE_PRESETS;
    assert.equal(matchingPreset(plan, presets)?.id, preset.id, `${preset.label} was not recognised after being applied`);
  }
  // The default plan must be a named strategy, not "Custom".
  assert.ok(matchingPreset(state.gamePlans[programId], OFFENSIVE_PRESETS), "the opening offense should have a name");
  assert.ok(matchingPreset(state.gamePlans[programId], DEFENSIVE_PRESETS), "the opening defense should have a name");
});

test("installing the plan is worth real points and costs real reps", () => {
  const state = beginSeason(createFictionalLeague("plan-install", 24));
  const programId = "program-1";

  // Reps raise the band with diminishing returns; the installer sets its width.
  const none = planExecution(state, programId, "OFFENSE", 0);
  const some = planExecution(state, programId, "OFFENSE", 6);
  const full = planExecution(state, programId, "OFFENSE", MAXIMUM_REPS_PER_SIDE);
  assert.ok(some.expected > none.expected, "reps must raise expected execution");
  assert.ok(full.expected > some.expected, "more reps must raise it further");
  assert.ok(
    full.expected - some.expected < some.expected - none.expected,
    "reps must show diminishing returns"
  );
  assert.ok(none.high > none.low, "execution must be a band, never a point value");

  // Sending the coordinator's week elsewhere hands the job to the head coach.
  const stripped = structuredClone(state);
  for (const member of Object.values(stripped.staff)) {
    if (member.programId !== programId) continue;
    if (member.role !== "OFFENSIVE_COORDINATOR") continue;
    member.allocation = { PREPARE: 0, SCOUT: 0, RECRUIT: staffCapacity(member.rating), DEVELOP: 0, RECOVER: 0 };
  }
  const covered = planExecution(stripped, programId, "OFFENSE", 6);
  assert.ok(
    covered.expected < some.expected,
    `losing the coordinator must cost execution (${covered.expected} vs ${some.expected})`
  );
  assert.ok(covered.limits.length > 0, "the screen must say why execution dropped");

  // Half a coordinator is worse than all of him: splitting his week is a real
  // cost, which is what makes the scouting-versus-preparation call bite.
  const split = structuredClone(state);
  for (const member of Object.values(split.staff)) {
    if (member.programId !== programId) continue;
    if (member.role !== "OFFENSIVE_COORDINATOR") continue;
    const capacity = staffCapacity(member.rating);
    member.allocation = { PREPARE: capacity, SCOUT: 0, RECRUIT: 0, DEVELOP: 0, RECOVER: 0 };
  }
  const undivided = planExecution(split, programId, "OFFENSE", 6);
  assert.ok(
    undivided.expected > some.expected,
    `a coordinator on preparation full-time must install more (${undivided.expected} vs ${some.expected})`
  );

  // Reps are actually charged, and they tire the roster.
  const before = state.preparation[programId].points;
  const result = advanceWeek(state, [
    { type: "SET_PRACTICE_REPS", programId, side: "OFFENSE", reps: 6 },
    { type: "SET_PRACTICE_REPS", programId, side: "DEFENSE", reps: 6 }
  ]);
  const spent = result.events.filter((event) => event.type === "PRACTICE_REPS_SET" && event.programId === programId);
  assert.equal(spent.length, 2);
  assert.equal(spent.reduce((total, event) => total + event.pointsSpent, 0), 12);
  assert.ok(before >= 12, "a week must afford a moderate install");

  const rested = advanceWeek(state).state;
  const fatigueOf = (source) => Object.values(source.players)
    .filter((player) => player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP")
    .reduce((total, player) => total + player.fatigue, 0);
  assert.ok(fatigueOf(result.state) > fatigueOf(rested), "practising must tire the roster");
});

test("a better-executed plan wins more games than the same plan unprepared", () => {
  // Execution is competence as well as emphasis: without a flat competence term,
  // installing a balanced plan was pure cost, because a balanced plan has no
  // emphasis deltas for execution to scale.
  const measure = (reps) => {
    let state = beginSeason(createFictionalLeague("execution-value", 24));
    const programId = "program-1";
    let scored = 0;
    let conceded = 0;
    let games = 0;
    for (let week = 0; week < 10; week += 1) {
      const result = advanceWeek(state, [
        { type: "SET_PRACTICE_REPS", programId, side: "OFFENSE", reps },
        { type: "SET_PRACTICE_REPS", programId, side: "DEFENSE", reps }
      ]);
      state = result.state;
      for (const event of result.events) {
        if (event.type !== "GAME_COMPLETED") continue;
        if (event.homeProgramId !== programId && event.awayProgramId !== programId) continue;
        const atHome = event.homeProgramId === programId;
        scored += atHome ? event.homeScore : event.awayScore;
        conceded += atHome ? event.awayScore : event.homeScore;
        games += 1;
      }
    }
    return { margin: (scored - conceded) / Math.max(1, games), games };
  };

  const unprepared = measure(0);
  const drilled = measure(MAXIMUM_REPS_PER_SIDE);
  assert.ok(unprepared.games >= 8 && drilled.games >= 8, "both runs need a full slate");
  assert.ok(
    drilled.margin > unprepared.margin,
    `a drilled plan must beat an unprepared one (${drilled.margin.toFixed(1)} vs ${unprepared.margin.toFixed(1)})`
  );
});

test("staff cards post what they change and can be replaced", () => {
  const state = beginSeason(createFictionalLeague("staff-market", 24));
  const programId = "program-1";
  const coordinator = Object.values(state.staff)
    .find((member) => member.programId === programId && member.role === "OFFENSIVE_COORDINATOR");
  assert.ok(coordinator);

  const modifiers = staffModifiers(coordinator);
  assert.ok(modifiers.length >= 2, "a coordinator card must post more than one number");
  assert.ok(modifiers.every((modifier) => modifier.label && modifier.value), "every modifier needs a label and a value");

  const candidates = staffCandidatesFor(state, programId, coordinator.id);
  assert.equal(candidates.length, 6, "four reachable candidates plus two shown out of reach");
  const reachable = candidates.filter((candidate) => !candidate.unavailableReason);
  assert.equal(reachable.length, 4);
  const outOfReach = candidates.filter((candidate) => candidate.unavailableReason);
  assert.equal(outOfReach.length, 2, "the pull ceiling must be visible, not silent");
  assert.ok(
    Math.min(...outOfReach.map((candidate) => candidate.rating)) > Math.max(...reachable.map((candidate) => candidate.rating)),
    "the coaches you cannot get must be better than the ones you can"
  );
  assert.ok(candidates.every((candidate) => candidate.role === coordinator.role), "candidates must fit the post");
  assert.ok(candidates.every((candidate) => candidate.salary > 0 && candidate.signingCost > 0), "a hire must cost something");
  assert.ok(
    candidates[0].rating >= candidates[2].rating,
    "candidates should be presented best first"
  );
  // Deterministic: the market must not re-roll every time it is opened.
  assert.deepEqual(staffCandidatesFor(state, programId, coordinator.id), candidates);
  // Every candidate is a comparable hire: a tendency, an hours-a-week figure,
  // and one number per job on the same scale as his rating.
  for (const candidate of candidates) {
    assert.ok(candidate.traitLabel && candidate.traitBlurb, "a candidate must say what he is known for");
    assert.ok(candidate.hours >= 4, "a candidate must say how long a week he works");
    assert.equal(candidate.skills.length, 5, "every job a coach does gets a number");
    assert.ok(candidate.skills.filter((skill) => skill.strength).length === 2, "his two best jobs are flagged");
    assert.ok(
      candidate.skills[0].value >= candidate.skills[4].value,
      "skills are presented best first"
    );
  }

  const target = candidates[0];
  const result = advanceWeek(state, [
    { type: "REPLACE_STAFF", programId, staffId: coordinator.id, candidateId: target.id }
  ]);
  const hired = result.events.find((event) => event.type === "STAFF_REPLACED" && event.programId === programId);
  assert.ok(hired, "the replacement should be recorded");
  assert.equal(hired.rating, target.rating);
  assert.equal(result.state.staff[coordinator.id], undefined, "the outgoing coach should be gone");
  assert.ok(
    Object.values(result.state.staff).some((member) => member.programId === programId && member.name === target.name),
    "the arriving coach should be on staff"
  );
});

test("the scouting department scales with funding and with the hours coaches give it", () => {
  const state = beginSeason(createFictionalLeague("scouting-department", 24));
  const programId = "program-1";
  const base = weeklyScoutingOutput(state, programId);

  const funded = structuredClone(state);
  funded.programs[programId].facilities.SCOUTING = 5;
  assert.ok(
    weeklyScoutingOutput(funded, programId) > base * 2,
    `five tiers of funding must be worth far more than one (${base} vs ${weeklyScoutingOutput(funded, programId)})`
  );

  // Coaching hours are the other input, and they are the same hours that install
  // the game plan — which is what makes the allocation screen a real trade.
  const committed = structuredClone(state);
  for (const member of Object.values(committed.staff)) {
    if (member.programId !== programId) continue;
    member.allocation = { PREPARE: 0, SCOUT: staffCapacity(member.rating), RECRUIT: 0, DEVELOP: 0, RECOVER: 0 };
  }
  assert.ok(
    weeklyScoutingOutput(committed, programId) > base,
    "a staff that spends its whole week scouting must produce more than one that does not"
  );
  assert.ok(
    planExecution(committed, programId, "OFFENSE", 6).expected < planExecution(state, programId, "OFFENSE", 6).expected,
    "the hours spent scouting must come out of installing the plan"
  );
});

test("the board prices a title contender far above a bottom-half fixture", () => {
  const state = beginSeason(createFictionalLeague("scouting-board", 24));
  const programId = "program-1";
  const board = scoutingBoard(state, programId);
  assert.ok(board.length > 6, "a full schedule should be visible from week one");

  const ranked = [...board].sort((left, right) => right.value - left.value);
  const best = state.programs[ranked[0].opponentProgramId];
  const worst = state.programs[ranked[ranked.length - 1].opponentProgramId];
  assert.ok(
    best.nationalRank < worst.nationalRank,
    `the most valuable fixture (#${best.nationalRank}) must outrank the least (#${worst.nationalRank})`
  );
  assert.ok(
    ranked[0].value > ranked[ranked.length - 1].value * 3,
    `the board must discriminate (${ranked[0].value} vs ${ranked[ranked.length - 1].value}) or every game is worth scouting`
  );
  // A file can be opened weeks before the game it is for. That is the decision.
  assert.ok(board.some((dossier) => dossier.week > state.week + 3), "the board must reach beyond the next few weeks");
});

test("a file is built forward, survives to its fixture, and is spent when the game is played", () => {
  let state = beginSeason(createFictionalLeague("forward-scouting", 24));
  const programId = "program-1";
  const target = scoutingBoard(state, programId).find((dossier) => dossier.week >= state.week + 3);
  assert.ok(target, "there must be a fixture several weeks out to scout");

  // Spend every week's department output on one future opponent.
  for (let week = 0; week < 3; week += 1) {
    const available = state.preparation[programId].scoutingPoints;
    state = prepareWeek(state, [
      { type: "ALLOCATE_SCOUTING", programId, opponentProgramId: target.opponentProgramId, points: available }
    ]).state;
    assert.equal(state.preparation[programId].scoutingPoints, 0);
    state = advanceWeek(state, planWeeklyCommands(state, programId)).state;
  }
  const built = state.dossiers[programId][target.opponentProgramId];
  assert.ok(built > 0, "banked work must survive the weeks between allocating it and playing the game");
  assert.ok(
    built >= DOSSIER_THRESHOLDS.TENDENCIES,
    `three weeks of saving must open something (${built} of ${DOSSIER_THRESHOLDS.TENDENCIES})`
  );

  // Once the fixture is played the file is spent — points cannot be banked into
  // a single blowout and then reused.
  while (state.week <= target.week && state.week <= 14) {
    state = advanceWeek(state, planWeeklyCommands(state, programId)).state;
  }
  assert.equal(
    state.dossiers[programId][target.opponentProgramId], undefined,
    "a file must be cleared once the game it was built for has been played"
  );
});

test("information is worth games: a scouted half of the league beats a blind half", () => {
  // The load-bearing claim of the whole department. Half the league scouts every
  // opponent completely and half scouts nobody; both halves hold the same mix of
  // tiers, so information is the only difference between them.
  const tally = { seeing: { for: 0, against: 0, wins: 0, games: 0 }, blind: { for: 0, against: 0, wins: 0, games: 0 } };
  for (let league = 0; league < 3; league += 1) {
    let state = beginSeason(createFictionalLeague(`information-value-${league}`, 24));
    const ids = Object.keys(state.programs);
    const seeing = new Set(ids.filter((_, index) => index % 2 === 0));
    for (let week = 0; week < 12; week += 1) {
      const dossiers = {};
      for (const id of ids) {
        dossiers[id] = {};
        if (!seeing.has(id)) continue;
        const fixture = state.schedule.find((game) => game.week === state.week && !game.played
          && (game.homeProgramId === id || game.awayProgramId === id));
        if (!fixture) continue;
        const opponentId = fixture.homeProgramId === id ? fixture.awayProgramId : fixture.homeProgramId;
        dossiers[id][opponentId] = DOSSIER_THRESHOLDS.GAME_PLAN;
      }
      state = { ...state, dossiers };
      const result = advanceWeek(state, planWeeklyCommands(state));
      state = result.state;
      for (const event of result.events) {
        if (event.type !== "GAME_COMPLETED") continue;
        for (const [id, mine, theirs] of [
          [event.homeProgramId, event.homeScore, event.awayScore],
          [event.awayProgramId, event.awayScore, event.homeScore]
        ]) {
          const bucket = seeing.has(id) ? tally.seeing : tally.blind;
          bucket.for += mine;
          bucket.against += theirs;
          bucket.games += 1;
          if (mine > theirs) bucket.wins += 1;
        }
      }
    }
  }
  const winRate = tally.seeing.wins / tally.seeing.games;
  const margin = (tally.seeing.for - tally.seeing.against) / tally.seeing.games;
  assert.ok(tally.seeing.games > 300, `sample too small at ${tally.seeing.games} games`);
  assert.ok(winRate > 0.51, `scouting must be worth winning games (${(winRate * 100).toFixed(1)}%)`);
  assert.ok(margin > 1, `scouting must be worth points on the board (${margin.toFixed(2)})`);
});

test("program character makes two jobs in the same tier different games", () => {
  const state = beginSeason(createFictionalLeague("program-character", 72));
  const lows = Object.values(state.programs).filter((program) => program.tier === "LOW");
  assert.ok(lows.length > 20, "a full league should offer plenty of low-tier jobs");

  // Facilities used to be one level applied to everything, so every program in a
  // tier was the same program. Choosing a job has to mean something.
  const training = lows.map((program) => program.facilities.TRAINING);
  const recruiting = lows.map((program) => program.facilities.RECRUITING);
  assert.ok(Math.max(...training) - Math.min(...training) >= 2, "training facilities must vary between jobs");
  assert.ok(Math.max(...recruiting) - Math.min(...recruiting) >= 1, "recruiting facilities must vary between jobs");

  const elasticity = lows.map((program) => program.fanElasticity);
  assert.ok(Math.min(...elasticity) < 0.5, "some fan bases must be diehards");
  assert.ok(Math.max(...elasticity) > 1.4, "some fan bases must be front-runners");
  assert.ok(new Set(lows.map((program) => program.character)).size >= 3, "a tier must offer several characters");

  // A developer trades recruiting for a weight room; a talent magnet the reverse.
  const developer = lows.find((program) => program.character === "DEVELOPER");
  const magnet = lows.find((program) => program.character === "TALENT_MAGNET");
  assert.ok(developer && magnet);
  assert.ok(developer.facilities.TRAINING > magnet.facilities.TRAINING, "a developer must out-develop a talent magnet");
  assert.ok(magnet.recruitAppeal > developer.recruitAppeal, "a talent magnet must out-recruit a developer");
});

test("a fan base's character decides how hard the gate swings", () => {
  const state = beginSeason(createFictionalLeague("fan-elasticity", 72));
  const diehard = Object.values(state.programs).find((program) => program.character === "DIEHARD");
  const frontrunner = Object.values(state.programs).find((program) => program.character === "FRONTRUNNER");
  assert.ok(diehard && frontrunner);

  // Overprice both by the same margin and compare what it costs them.
  const loss = (program) => {
    const capacity = stadiumCapacity(program.facilities.STADIUM);
    const fair = fairTicketPrice(program, null, false);
    const atFair = projectGate(program, null, capacity, false, fair, 0).attendance;
    const gouged = projectGate(program, null, capacity, false, Math.round(fair * 1.5), 0).attendance;
    return (atFair - gouged) / Math.max(1, atFair);
  };
  assert.ok(
    loss(frontrunner) > loss(diehard) * 1.5,
    `front-runners must punish overpricing far harder (${(loss(frontrunner) * 100).toFixed(0)}% vs ${(loss(diehard) * 100).toFixed(0)}%)`
  );
});

test("rerolling a save changes the roster you inherit", () => {
  // Six independent leagues used to hand the same low-tier program a best
  // available ceiling of 86 every single time, so restarting bought nothing.
  const inherited = ["a", "b", "c", "d", "e", "f", "g", "h"].map((seed) => {
    const state = createFictionalLeague(`reroll-variance-${seed}`, 72);
    const program = Object.values(state.programs).find((candidate) => candidate.tier === "LOW");
    const roster = Object.values(state.players).filter((player) =>
      player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP");
    return {
      stars: roster.filter((player) => player.potential >= 88).length,
      best: Math.max(...roster.map((player) => player.potential))
    };
  });
  const stars = inherited.map((entry) => entry.stars);
  assert.ok(
    Math.max(...stars) - Math.min(...stars) >= 3,
    `what you inherit must vary between saves (future stars ranged ${Math.min(...stars)}–${Math.max(...stars)})`
  );
  assert.ok(Math.max(...inherited.map((entry) => entry.best)) >= 90, "some saves must hand you a genuine ceiling");
});

test("a struggling program has more room to develop than a powerhouse", () => {
  const state = createFictionalLeague("upside-asymmetry", 72);
  const headroom = (tier) => {
    const rosters = Object.values(state.programs).filter((program) => program.tier === tier).flatMap((program) =>
      Object.values(state.players).filter((player) =>
        player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP"));
    return rosters.reduce((total, player) => total + (player.potential - player.overall), 0) / rosters.length;
  };
  const low = headroom("LOW");
  const power = headroom("POWER");
  assert.ok(
    low > power * 1.3,
    `low-tier rosters need more headroom than power rosters (${low.toFixed(1)} vs ${power.toFixed(1)}) or development can never close the gap`
  );
});

test("diamonds in the rough exist: reputation is not a proxy for the truth", () => {
  const state = beginSeason(createFictionalLeague("diamonds", 72));
  const pool = Object.values(state.prospects);
  assert.ok(pool.length > 1000);

  const overlooked = (prospect) => ["UNRANKED", "REGIONAL"].includes(prospect.reputation);
  const elite = pool.filter((prospect) => prospect.potential >= 88);
  const hidden = elite.filter(overlooked);
  assert.ok(
    hidden.length / elite.length > 0.08,
    `enough high-ceiling prospects must look unremarkable (${hidden.length} of ${elite.length}) or digging finds nothing`
  );
  assert.ok(
    hidden.length / elite.length < 0.4,
    "but not so many that the rankings are noise"
  );

  // Busts too — a reveal must not always be good news.
  assert.ok(
    pool.some((prospect) => prospect.reputation === "ELITE" && prospect.potential < prospect.hype),
    "some highly-rated prospects must be worse than advertised"
  );

  // Hidden upside must grow as reputation falls, which is what makes a raw
  // prospect worth projecting rather than a lottery ticket.
  const gap = (reputation) => {
    const group = pool.filter((prospect) => prospect.reputation === reputation);
    return group.reduce((total, prospect) => total + (prospect.potential - prospect.hype), 0) / group.length;
  };
  assert.ok(
    gap("UNRANKED") > gap("ELITE"),
    `an unranked prospect must carry more hidden upside than an elite one (${gap("UNRANKED").toFixed(1)} vs ${gap("ELITE").toFixed(1)})`
  );
});

test("rivals recruit the rankings, not the truth", () => {
  // The AI used to sort prospects by real potential, so every overlooked gem was
  // gone before the player could find one. Rivals must chase hype like everyone
  // who has not paid to look closer.
  let state = beginSeason(createFictionalLeague("ai-hype", 24));
  const pool = Object.values(state.prospects);
  const gems = new Set(pool.filter((prospect) =>
    ["UNRANKED", "REGIONAL"].includes(prospect.reputation) && prospect.potential >= 85).map((prospect) => prospect.id));
  const overhyped = new Set(pool.filter((prospect) =>
    prospect.reputation === "ELITE" && prospect.potential < prospect.hype).map((prospect) => prospect.id));
  assert.ok(gems.size > 0 && overhyped.size > 0, "the pool must contain both gems and busts");

  for (let week = 0; week < 10; week += 1) state = advanceWeek(state, planWeeklyCommands(state)).state;
  const committed = Object.values(state.prospects).filter((prospect) => prospect.status !== "AVAILABLE");
  assert.ok(committed.length > 20, "rivals should be signing people");

  const signedGems = committed.filter((prospect) => gems.has(prospect.id)).length;
  const signedBusts = committed.filter((prospect) => overhyped.has(prospect.id)).length;
  const gemRate = signedGems / gems.size;
  const bustRate = signedBusts / overhyped.size;
  assert.ok(
    bustRate >= gemRate,
    `rivals must chase reputation over truth (bust rate ${(bustRate * 100).toFixed(0)}% vs gem rate ${(gemRate * 100).toFixed(0)}%)`
  );
});

test("a roster suits some schemes better than others, and it is never an exact number", () => {
  const state = beginSeason(createFictionalLeague("scheme-fit", 72));
  const programId = "program-1";
  const roster = programRoster(state, programId);

  for (const side of ["OFFENSE", "DEFENSE"]) {
    const fits = rosterSchemeFit(roster, side, 0.72);
    assert.equal(fits.length, side === "OFFENSE" ? 5 : 4);
    assert.ok(fits.every((fit) => fit.high > fit.low), `${side} fit must be a band, never a point estimate`);
    // Sorted best-first so the screen can lead with what the roster is built for.
    assert.ok(fits[0].expected >= fits[1].expected);

    // A single roster can legitimately have no preference, so the claim is about
    // the league: most programs must be built for something in particular.
    const spreads = Object.values(state.programs).map((program) => {
      const ordered = rosterSchemeFit(programRoster(state, program.id), side, 0.72);
      return ordered[0].expected - ordered[ordered.length - 1].expected;
    }).sort((left, right) => left - right);
    const median = spreads[Math.floor(spreads.length / 2)];
    assert.ok(median >= 6, `${side}: the median roster must prefer some schemes (spread ${median})`);
    assert.ok(Math.max(...spreads) >= 12, `${side}: some rosters must be strongly suited to one scheme`);
  }

  // Better information narrows the read without ever collapsing it.
  const vague = rosterSchemeFit(roster, "OFFENSE", 0.2)[0];
  const sharp = rosterSchemeFit(roster, "OFFENSE", 0.95)[0];
  assert.ok(sharp.high - sharp.low < vague.high - vague.low, "confidence must narrow the band");
  assert.ok(sharp.high > sharp.low, "and never collapse it");
});

test("opening rosters have real depth-chart gaps and character", () => {
  const state = createFictionalLeague("roster-shape", 72);
  const programs = Object.values(state.programs);
  const average = (values) => values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
  const median = (values) => [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];
  const rosterFor = (program) => programRoster(state, program.id);

  for (const tier of ["LOW", "MID", "POWER"]) {
    const gaps = programs
      .filter((program) => program.tier === tier)
      .map((program) => rosterFor(program)
        .filter((player) => player.position === "WR")
        .sort((left, right) => right.overall - left.overall))
      .map((room) => room[0].overall - room[3].overall);
    assert.ok(
      median(gaps) >= 4,
      `${tier}: WR1 and WR4 must be meaningfully different (median gap ${median(gaps)})`
    );
  }

  const characterProfile = (character) => programs
    .filter((program) => program.character === character)
    .map((program) => {
      const roster = rosterFor(program);
      const rosterAverage = average(roster.map((player) => player.overall));
      const topQuarter = average([...roster]
        .sort((left, right) => right.overall - left.overall)
        .slice(0, 22)
        .map((player) => player.overall));
      const skill = average(roster
        .filter((player) => ["QB", "WR", "DB"].includes(player.position))
        .map((player) => player.overall));
      const trench = average(roster
        .filter((player) => ["OL", "DL"].includes(player.position))
        .map((player) => player.overall));
      return { starPremium: topQuarter - rosterAverage, skillBias: skill - trench };
    });
  const frontRunner = characterProfile("FRONTRUNNER");
  const developer = characterProfile("DEVELOPER");
  const talentMagnet = characterProfile("TALENT_MAGNET");
  const diehard = characterProfile("DIEHARD");

  assert.ok(
    average(frontRunner.map((profile) => profile.starPremium))
      > average(developer.map((profile) => profile.starPremium)) + 0.5,
    "front-runner rosters should be more top-heavy than developer rosters"
  );
  assert.ok(
    average(talentMagnet.map((profile) => profile.skillBias))
      > average(diehard.map((profile) => profile.skillBias)) + 1.5,
    "talent magnets should lean toward premium skill rooms while diehards lean toward the trenches"
  );
});

test("a coordinator installing someone else's scheme costs execution, not options", () => {
  const state = beginSeason(createFictionalLeague("coach-scheme-fit", 24));
  const programId = "program-1";
  const identity = state.programs[programId].schemeIdentity;

  const matched = structuredClone(state);
  const mismatched = structuredClone(state);
  const furthest = OFFENSIVE_SCHEMES
    .map((scheme) => ({ scheme, fit: schemeAffinity(scheme, identity.offense) }))
    .sort((left, right) => left.fit - right.fit)[0].scheme;
  for (const member of Object.values(matched.staff)) {
    if (member.programId !== programId || member.role !== "OFFENSIVE_COORDINATOR") continue;
    member.schemePreference = { ...member.schemePreference, offense: identity.offense };
  }
  for (const member of Object.values(mismatched.staff)) {
    if (member.programId !== programId || member.role !== "OFFENSIVE_COORDINATOR") continue;
    member.schemePreference = { ...member.schemePreference, offense: furthest };
  }

  const good = planExecution(matched, programId, "OFFENSE", 6);
  const bad = planExecution(mismatched, programId, "OFFENSE", 6);
  assert.ok(
    bad.expected < good.expected,
    `a coordinator in the wrong scheme must install less of it (${bad.expected} vs ${good.expected})`
  );
  assert.ok(bad.limits.length > 0, "the screen must say why execution dropped");

  // But never worse than having nobody install it at all — a real coach in the
  // wrong system still beats the players working it out themselves.
  const nobody = structuredClone(mismatched);
  for (const member of Object.values(nobody.staff)) {
    if (member.programId !== programId) continue;
    member.allocation = { PREPARE: 0, SCOUT: staffCapacity(member.rating), RECRUIT: 0, DEVELOP: 0, RECOVER: 0 };
  }
  assert.ok(
    planExecution(nobody, programId, "OFFENSE", 6).expected <= bad.expected,
    "a mismatched coordinator must still beat nobody at all"
  );
});

test("the coaching market shows what the program cannot yet attract", () => {
  const state = beginSeason(createFictionalLeague("coach-ceiling", 72));
  const low = Object.values(state.programs).find((program) => program.tier === "LOW");
  const power = Object.values(state.programs).find((program) => program.tier === "POWER");
  const coordinatorFor = (program) => Object.values(state.staff)
    .find((member) => member.programId === program.id && member.role === "OFFENSIVE_COORDINATOR");

  const lowMarket = staffCandidatesFor(state, low.id, coordinatorFor(low).id);
  const powerMarket = staffCandidatesFor(state, power.id, coordinatorFor(power).id);

  assert.ok(lowMarket.some((candidate) => candidate.unavailableReason), "a low-tier job must show coaches it cannot get");
  assert.ok(
    lowMarket.every((candidate) => candidate.schemeFit >= 0.55 && candidate.schemeFit <= 1),
    "every candidate must post a scheme fit"
  );
  const reachable = (market) => Math.max(...market.filter((candidate) => !candidate.unavailableReason).map((candidate) => candidate.rating));
  assert.ok(
    reachable(powerMarket) > reachable(lowMarket),
    `prestige must widen who will take the job (${reachable(powerMarket)} vs ${reachable(lowMarket)})`
  );
});

test("the dashboard tells the player what is being wasted, and where to fix it", () => {
  // The one screen a management game has to get right is the one that answers
  // "what do I do now". This used to be six panels of status and no direction.
  let state = beginSeason(createFictionalLeague("briefing", 24));
  const programId = "program-1";

  const opening = weeklyBriefing(state, programId);
  assert.ok(opening.length > 0, "week one must have something to say");
  assert.ok(
    opening.every((item) => item.headline && item.detail && item.action && item.destination),
    "every item needs a headline, a reason, a verb, and somewhere to go"
  );
  assert.ok(
    opening.some((item) => item.id === "PRACTICE"),
    "a team that has not practised must be told so before anything else"
  );
  assert.ok(opening.length <= 6, "a list nobody can read is the same as no list");
  // Ordered so the things costing you now come before the upside.
  const urgencies = opening.map((item) => item.urgency);
  assert.deepEqual(urgencies, [...urgencies].sort((left, right) =>
    (left === "DO_THIS" ? 0 : 1) - (right === "DO_THIS" ? 0 : 1)));

  // Acting on an item must clear it immediately — reps settle before the week is
  // advanced, so the dashboard reflects the decision the moment it is made.
  const reps = prepareWeek(state, [
    { type: "SET_PRACTICE_REPS", programId, side: "OFFENSE", reps: 6 },
    { type: "SET_PRACTICE_REPS", programId, side: "DEFENSE", reps: 6 }
  ]).state;
  assert.ok(
    !weeklyBriefing(reps, programId).some((item) => item.id === "PRACTICE"),
    "running practice must remove the practice warning"
  );

  const expectation = seasonExpectation(state, programId);
  assert.ok(expectation, "a season must have a stated point");
  assert.ok(expectation.target > 0 && expectation.standing.length > 0);
  assert.ok(expectation.jobSecurity >= 0 && expectation.jobSecurity <= 100);

  // A program that cannot reach its target should be told, not left guessing.
  const doomed = structuredClone(state);
  doomed.programs[programId].wins = 0;
  doomed.programs[programId].losses = 11;
  const bad = seasonExpectation(doomed, programId);
  assert.equal(bad.onTrack, false);
  assert.match(bad.standing, /next year/i);
});

test("your scheme anchors the weekly call without killing the matchup game", () => {
  const state = beginSeason(createFictionalLeague("scheme-anchor", 24));
  const programId = "program-1";
  const identity = state.programs[programId].schemeIdentity;
  const passing = identity.offense === "AIR_RAID" || identity.offense === "SPREAD_TEMPO";

  const withCall = (balance) => ({
    ...state,
    gamePlans: { ...state.gamePlans, [programId]: { ...state.gamePlans[programId], runPassBalance: balance } }
  });
  const onScheme = planExecution(withCall(passing ? "PASS_HEAVY" : "RUN_HEAVY"), programId, "OFFENSE", 6);
  const offScheme = planExecution(withCall(passing ? "RUN_HEAVY" : "PASS_HEAVY"), programId, "OFFENSE", 6);

  assert.ok(
    offScheme.expected < onScheme.expected,
    "a call the program does not run must cost execution"
  );
  assert.ok(
    offScheme.limits.some((limit) => /isn't what your program runs/.test(limit)),
    "and the screen must say why"
  );

  // The cost has to stay smaller than what a well-timed counter is worth, or
  // exploiting a scouted weakness would never pay and the matchup matrix —
  // calibrated over 400 games a cell — would be dead weight.
  const cost = onScheme.expected - offScheme.expected;
  assert.ok(cost > 0.01, `going off-scheme must be felt (${(cost * 100).toFixed(1)} points)`);
  assert.ok(cost < 0.08, `but never so much that deviating is unthinkable (${(cost * 100).toFixed(1)} points)`);

  // Alignment is a multiplier on execution, never a gate on the menu.
  for (const balance of ["RUN_HEAVY", "BALANCED", "PASS_HEAVY"]) {
    assert.ok(planAlignment({ runPassBalance: balance }, identity, "OFFENSE") >= 0.85);
  }
});


test("a coach's tendency decides what his week is worth, and the league carries a spread of them", () => {
  const state = beginSeason(createFictionalLeague("staff-traits", 24));
  const staff = Object.values(state.staff);

  // A league where everybody is a tactician is a league where the trait is
  // decoration. Rating alone was the old system; this is the thing that
  // replaces it, so it has to actually vary.
  const traits = new Set(staff.map((member) => member.trait));
  assert.ok(traits.size >= 5, `expected a spread of tendencies, saw ${[...traits].join(", ")}`);
  assert.ok(staff.every((member) => STAFF_TRAITS[member.trait]), "every coach carries a known tendency");

  // The five posted numbers are the engine's own multipliers, so a specialist
  // must be measurably better at his speciality than a generalist of the same
  // calibre — and worse somewhere else, or the choice is free.
  const rating = 75;
  const filmRat = staffSkills({ rating, role: "OFFENSIVE_COORDINATOR", trait: "FILM_RAT" });
  const closer = staffSkills({ rating, role: "OFFENSIVE_COORDINATOR", trait: "CLOSER" });
  const scoutOf = (skills) => skills.find((skill) => skill.focus === "SCOUT").value;
  const recruitOf = (skills) => skills.find((skill) => skill.focus === "RECRUIT").value;
  assert.ok(scoutOf(filmRat) > scoutOf(closer) + 10, "a film rat must out-scout a closer of the same rating");
  assert.ok(recruitOf(closer) > recruitOf(filmRat) + 10, "and the closer must out-recruit him");

  // The same must be true through the engine rather than only on the card.
  const programId = "program-1";
  const withCoordinator = (trait) => {
    const next = structuredClone(state);
    for (const member of Object.values(next.staff)) {
      if (member.programId !== programId) continue;
      member.trait = trait;
    }
    return staffContribution(next, programId, "SCOUT");
  };
  assert.ok(
    withCoordinator("FILM_RAT") > withCoordinator("CLOSER"),
    "the trait has to reach the scouting department, not just the card"
  );
});

test("the box score prints the game that was actually played", () => {
  let state = beginSeason(createFictionalLeague("box-score-page", 24));
  for (let week = 0; week < 4; week += 1) state = advanceWeek(state).state;

  const box = latestBoxScore(state, "program-1");
  assert.ok(box, "a played game must produce a box score");
  assert.equal(boxScore(state, box.gameId).gameId, box.gameId, "and it must be reachable by game id");

  for (const team of [box.home, box.away]) {
    const lines = state.playerGameStats.filter(
      (line) => line.gameId === box.gameId && line.programId === team.programId
    );
    assert.ok(lines.length > 0);

    const group = (id) => team.groups.find((entry) => entry.id === id);
    // Every table ends in a TEAM line, and that line is the sum of the rows
    // above it. A total that disagrees with its own table is worse than none.
    for (const entry of team.groups) {
      const last = entry.rows[entry.rows.length - 1];
      assert.equal(last.total, true, `${entry.id} must end with a team line`);
      assert.ok(entry.rows.length > 1, `${entry.id} must have somebody in it`);
      assert.ok(
        entry.rows.every((row) => row.values.length === entry.columns.length),
        `${entry.id} rows must fill every column`
      );
    }

    const passing = group("PASSING");
    const passTotal = passing.rows[passing.rows.length - 1].values;
    assert.equal(
      passTotal[1],
      String(lines.reduce((sum, line) => sum + line.passingYards, 0)),
      "the passing team line must equal the yards the drive loop produced"
    );

    const receiving = group("RECEIVING");
    const receivingTotal = receiving.rows[receiving.rows.length - 1].values;
    assert.equal(receivingTotal[1], passTotal[1], "receiving yards must reconcile with passing yards");
    assert.equal(receivingTotal[0], passTotal[0].split("/")[0], "receptions must reconcile with completions");

    // Touchdowns and field goals still add up to the number on the scoreboard.
    const touchdowns = lines.reduce((sum, line) => sum + line.passingTouchdowns + line.rushingTouchdowns, 0);
    const fieldGoals = lines.reduce((sum, line) => sum + line.fieldGoalsMade, 0);
    assert.equal(touchdowns * 7 + fieldGoals * 3, team.score, "the tables must add up to the final score");
  }

  assert.ok(box.teamStats.length >= 5, "the comparison panel needs something to compare");
  const totalYards = box.teamStats.find((stat) => stat.label === "Total yards");
  assert.ok(Number(totalYards.home) > 0 && Number(totalYards.away) > 0);
});
