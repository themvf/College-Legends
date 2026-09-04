import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  expectedWins,
  jobReview,
  jobVerdict,
  seasonExpectation,
  startingSecurity,
  CHAMPIONSHIP_BONUS,
  DISMISSAL_THRESHOLD,
  INSOLVENCY_PENALTY,
  MANDATE_FAILURE_PENALTY,
  WIN_WEIGHT
} from "../packages/simulation/dist/index.js";
import { planOffseasonCommands, planWeeklyCommands } from "../packages/ai/dist/index.js";

const activeLeague = (seed, count = 12) => beginSeason(createFictionalLeague(seed, count));

/** Plays a season out and stops with the board review open. */
function toBoardReview(seed, count = 12) {
  let state = activeLeague(seed, count);
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;
  assert.equal(state.offseasonStep, "BOARD_REVIEW", "the offseason opens on the review");
  return state;
}

const reviewOf = (events, programId) =>
  events.find((event) => event.type === "BOARD_REVIEW_COMPLETED" && event.programId === programId);

/**
 * Writes a coherent season onto one program. Overriding the record alone leaves
 * a team that went 0-12 still sitting in the recorded playoff field, which is
 * not a state the engine can reach and not one worth asserting against — so the
 * postseason record is rewritten to match the record being claimed.
 */
function scenario(state, programId, { wins, security, tenure, budget = 5_000_000, mandate = null }) {
  const program = state.programs[programId];
  program.wins = wins;
  program.losses = 12 - wins;
  program.coachSecurity = security;
  program.coachTenure = tenure;
  program.budget = budget;
  program.championshipDeadline = mandate;
  const history = state.seasonHistory.at(-1);
  if (history?.season === state.season) {
    history.playoffSeeds = history.playoffSeeds.filter((seed) => seed.programId !== programId);
    if (history.nationalChampionProgramId === programId) history.nationalChampionProgramId = "";
  }
  return program;
}

test("the board grades the target the dashboard has been stating all season", () => {
  const state = toBoardReview("tenure-same-target");
  for (const programId of Object.keys(state.programs)) {
    const stated = seasonExpectation(state, programId);
    const graded = jobReview(state, programId);
    assert.equal(
      graded.target,
      stated.target,
      `${programId} must be judged against the number it was shown, not a private one`
    );
    assert.equal(graded.target, expectedWins(state.programs[programId].tier));
  }
});

test("every reason the board gives sums to the movement it made", () => {
  const state = toBoardReview("tenure-arithmetic");
  const result = advanceOffseasonStep(state);
  const reviews = result.events.filter((event) => event.type === "BOARD_REVIEW_COMPLETED");
  assert.equal(reviews.length, Object.keys(state.programs).length, "every program is reviewed, every year");
  for (const review of reviews) {
    const summed = review.reasons.reduce((total, reason) => total + reason.delta, 0);
    const expected = Math.min(100, Math.max(0, review.securityBefore + summed));
    assert.equal(
      review.securityAfter,
      expected,
      `${review.programId}: the printed reasons must add up to what actually happened`
    );
    assert.ok(review.reasons.length > 0, "a verdict with no stated reason is a hidden roll");
  }
});

test("a mid-season projection is the same verdict the board will reach", () => {
  // The whole point of the review being pure arithmetic: the player can read the
  // outcome off the dashboard in week 9 rather than being ambushed in the
  // offseason. Same function, so it cannot drift.
  const state = toBoardReview("tenure-projection");
  const programId = Object.keys(state.programs)[0];
  const projected = jobReview(state, programId);
  const result = advanceOffseasonStep(state);
  const actual = reviewOf(result.events, programId);
  assert.equal(actual.securityAfter, projected.securityAfter);
  assert.equal(actual.verdict, projected.verdict);
});

test("security falls for missing the target and rises for beating it", () => {
  const state = toBoardReview("tenure-both-directions");
  const [missId, beatId] = Object.keys(state.programs);
  const target = expectedWins(state.programs[missId].tier);
  const beatTarget = expectedWins(state.programs[beatId].tier);
  scenario(state, missId, { wins: target - 3, security: 60, tenure: 3 });
  scenario(state, beatId, { wins: beatTarget + 2, security: 60, tenure: 3 });

  const result = advanceOffseasonStep(state);
  assert.equal(reviewOf(result.events, missId).securityAfter, 60 - 3 * WIN_WEIGHT);
  assert.equal(reviewOf(result.events, beatId).securityAfter, 60 + 2 * WIN_WEIGHT);
});

test("a coach who runs out of security is dismissed and the chair empties", () => {
  const state = toBoardReview("tenure-dismissal");
  const programId = Object.keys(state.programs)[0];
  scenario(state, programId, { wins: 0, security: 5, tenure: 4 });
  const headCoachBefore = Object.values(state.staff).find(
    (member) => member.programId === programId && member.role === "HEAD_COACH"
  );
  assert.ok(headCoachBefore, "the program had a head coach to lose");

  const result = advanceOffseasonStep(state);
  const fired = result.events.find((event) => event.type === "COACH_FIRED" && event.programId === programId);
  assert.ok(fired, "a coach this far under water must actually lose the job");
  assert.equal(fired.cause, "EXPECTATIONS");
  assert.equal(fired.staffId, headCoachBefore.id);
  assert.equal(reviewOf(result.events, programId).verdict, "FIRED");
  assert.equal(result.state.staff[headCoachBefore.id], undefined, "the chair is vacant");
});

test("the chair resets for its next occupant rather than firing him for inheriting a zero", () => {
  const state = toBoardReview("tenure-successor");
  const programId = Object.keys(state.programs)[0];
  scenario(state, programId, { wins: 0, security: 1, tenure: 6 });

  const result = advanceOffseasonStep(state);
  const after = result.state.programs[programId];
  assert.equal(after.coachSecurity, startingSecurity(after.tier));
  assert.equal(after.coachTenure, 0, "the new man starts his own clock");
  assert.ok(after.coachSecurity > DISMISSAL_THRESHOLD, "and does not begin already sacked");
});

test("insolvency is a second road to the same pressure", () => {
  const state = toBoardReview("tenure-insolvency");
  const programId = Object.keys(state.programs)[0];
  const target = expectedWins(state.programs[programId].tier);
  scenario(state, programId, { wins: target, security: 50, tenure: 2, budget: -1 });

  const result = advanceOffseasonStep(state);
  const review = reviewOf(result.events, programId);
  assert.equal(review.securityAfter, 50 - INSOLVENCY_PENALTY, "hitting the wins target does not excuse the books");
  assert.ok(
    review.reasons.some((reason) => reason.delta === -INSOLVENCY_PENALTY && /underwater/i.test(reason.label)),
    "and the board says so in as many words"
  );
});

test("a championship mandate that expires ends the job", () => {
  const state = toBoardReview("tenure-mandate");
  const programId = Object.keys(state.programs)[0];
  const target = expectedWins(state.programs[programId].tier);
  scenario(state, programId, { wins: target, security: 55, tenure: 1, mandate: 1 });

  const result = advanceOffseasonStep(state);
  const fired = result.events.find((event) => event.type === "COACH_FIRED" && event.programId === programId);
  assert.ok(fired, `hitting ${target} wins does not satisfy a job hired to win a title`);
  assert.equal(fired.cause, "MANDATE");
  assert.ok(MANDATE_FAILURE_PENALTY > 55 - target * 0, "the penalty is meant to be terminal from a normal number");
});

test("a mandate with seasons left only counts down", () => {
  const state = toBoardReview("tenure-mandate-countdown");
  const programId = Object.keys(state.programs)[0];
  const target = expectedWins(state.programs[programId].tier);
  scenario(state, programId, { wins: target, security: 55, tenure: 2, mandate: 3 });

  const result = advanceOffseasonStep(state);
  assert.equal(result.state.programs[programId].championshipDeadline, 2, "the clock runs");
  assert.equal(result.state.programs[programId].coachSecurity, 55, "but costs nothing while it is still running");
  assert.equal(
    result.events.find((event) => event.type === "COACH_FIRED" && event.programId === programId),
    undefined
  );
});

test("a first year is graded gently, because the roster was somebody else's", () => {
  const build = (tenure) => {
    const state = toBoardReview("tenure-rookie");
    const programId = Object.keys(state.programs)[0];
    scenario(state, programId, { wins: 0, security: 80, tenure });
    return { drop: 80 - reviewOf(advanceOffseasonStep(state).events, programId).securityAfter };
  };
  const rookie = build(0);
  const veteran = build(3);
  assert.ok(rookie.drop > 0, "a rookie is still judged");
  assert.ok(
    rookie.drop === Math.floor(veteran.drop / 2) || rookie.drop === Math.ceil(veteran.drop / 2),
    `but at half the damage of a coach who built it: ${rookie.drop} against ${veteran.drop}`
  );
});

test("the league actually churns — the defect this closes was that it never did", () => {
  // Measured before this system existed: across five seasons and seventy-two
  // programs, the minimum security in the league never left its starting 45 and
  // the average rose. Nobody could be fired. This asserts the inverse.
  let state = activeLeague("tenure-churn", 24);
  const firstSeason = state.season;
  const startingMinimum = Math.min(...Object.values(state.programs).map((program) => program.coachSecurity));
  let firings = 0;
  let seenBelowStart = false;
  while (state.season < firstSeason + 4) {
    // A career cycles through three phases: the offseason steps, the roster
    // review that opens a year, and the weeks themselves.
    if (state.phase === "ROSTER_REVIEW") {
      state = beginSeason(state);
      continue;
    }
    const result = state.phase === "OFFSEASON"
      ? advanceOffseasonStep(state, planOffseasonCommands(state))
      : advanceWeek(state, planWeeklyCommands(state));
    firings += result.events.filter((event) => event.type === "COACH_FIRED").length;
    state = result.state;
    const minimum = Math.min(...Object.values(state.programs).map((program) => program.coachSecurity));
    if (minimum < startingMinimum) seenBelowStart = true;
  }
  assert.ok(firings > 0, `somebody must lose a job over four seasons, saw ${firings}`);
  assert.ok(seenBelowStart, "and security must be capable of falling below where the league started");
});

test("job security moves in the board review and nowhere else", () => {
  // A title used to add 20 security at the moment the champion was crowned and
  // a coaching award another 10, which meant the dashboard's projection was
  // quietly wrong twice a season. Both were folded into the review as named
  // reasons; this asserts nothing moves the number outside it.
  let state = activeLeague("tenure-single-owner", 12);
  const before = Object.fromEntries(
    Object.entries(state.programs).map(([id, program]) => [id, program.coachSecurity])
  );
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;
  for (const [programId, program] of Object.entries(state.programs)) {
    assert.equal(
      program.coachSecurity,
      before[programId],
      `${programId} security moved during the season — a title or an award is moving it behind the review's back`
    );
  }
  const result = advanceOffseasonStep(state);
  const champion = state.seasonHistory.at(-1)?.nationalChampionProgramId;
  const championReview = reviewOf(result.events, champion);
  assert.ok(
    championReview.reasons.some((reason) => reason.delta === CHAMPIONSHIP_BONUS),
    "the champion is still rewarded — but here, where the projection can see it"
  );
});

test("the review consumes no randomness, so an offseason still replays byte-identically", () => {
  const run = () => {
    let state = toBoardReview("tenure-replay");
    while (state.phase === "OFFSEASON") state = advanceOffseasonStep(state).state;
    return JSON.stringify(state.programs);
  };
  assert.equal(run(), run());
});

test("the named bands are ordered and only the bottom one ends a tenure", () => {
  assert.equal(jobVerdict(DISMISSAL_THRESHOLD), "FIRED");
  assert.equal(jobVerdict(1), "FINAL_WARNING");
  assert.equal(jobVerdict(20), "HOT_SEAT");
  assert.equal(jobVerdict(50), "WATCHED");
  assert.equal(jobVerdict(70), "SECURE");
  assert.equal(jobVerdict(95), "EXTENDED");
  for (let security = 1; security <= 100; security += 1) {
    assert.notEqual(jobVerdict(security), "FIRED", `${security} is survivable and must not read as dismissed`);
  }
});
