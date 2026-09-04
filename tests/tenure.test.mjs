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

test("mid-season the board is projected on pace, not on a half-finished record", () => {
  // Found in the browser: an undefeated 4-0 power program was told it was on
  // the hot seat, because four wins is six short of ten. True of the record and
  // false of the season. Grading the pace fixes it without weakening the review,
  // since once every game is played the pace is the record.
  let state = activeLeague("tenure-pace", 12);
  const programId = Object.keys(state.programs)[0];
  for (let week = 0; week < 4; week += 1) state = advanceWeek(state).state;
  const program = state.programs[programId];
  const played = program.wins + program.losses;
  assert.ok(played > 0 && state.phase === "REGULAR_SEASON", "still mid-season with games played");

  const review = jobReview(state, programId);
  const scheduled = state.schedule.filter(
    (game) => game.homeProgramId === programId || game.awayProgramId === programId
  ).length;
  assert.equal(review.wins + review.losses, scheduled, "the projection covers a whole season");
  assert.ok(review.wins >= program.wins, "and never projects fewer wins than are already banked");
  assert.match(review.reasons[0].label, /on pace/i, "and says plainly that it is a projection");
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
  assert.equal(fired.tenure, 5, "the season just played counts toward the tenure being ended");
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

test("an expired mandate ends the job even for a coach who is winning big", () => {
  // Found by playing three seasons of a Championship Mandate career in the
  // browser rather than by a unit test: the mandate began life as a large
  // penalty, and a coach going 12-2, 13-1, 14-1 banked about +31 a season and
  // simply absorbed it. A mandate a winning coach survives is not a mandate.
  const state = toBoardReview("tenure-mandate-winner");
  const programId = Object.keys(state.programs)[0];
  const target = expectedWins(state.programs[programId].tier);
  scenario(state, programId, { wins: target + 4, security: 90, tenure: 3, mandate: 1 });

  const result = advanceOffseasonStep(state);
  const fired = result.events.find((event) => event.type === "COACH_FIRED" && event.programId === programId);
  assert.ok(fired, "winning does not buy your way out of the job you were actually hired to do");
  assert.equal(fired.cause, "MANDATE");
  assert.equal(reviewOf(result.events, programId).verdict, "FIRED");
});

test("the mandate penalty is charged once, not every season afterwards", () => {
  // The same browser run showed the clock counting to "-1 seasons left" and
  // charging the penalty again each year. An expired mandate ends the tenure,
  // so it can never be charged twice; the successor inherits no deadline.
  const state = toBoardReview("tenure-mandate-once");
  const programId = Object.keys(state.programs)[0];
  const target = expectedWins(state.programs[programId].tier);
  scenario(state, programId, { wins: target + 4, security: 90, tenure: 3, mandate: 1 });

  const after = advanceOffseasonStep(state).state;
  assert.equal(after.programs[programId].championshipDeadline, null, "the mandate does not outlive the coach it ended");
  assert.ok(
    (after.programs[programId].coachSecurity ?? 0) > DISMISSAL_THRESHOLD,
    "and the next man is not already condemned by it"
  );
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
