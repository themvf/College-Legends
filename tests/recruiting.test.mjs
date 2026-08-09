import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  MAX_VISITS_PER_SEASON,
  NIL_WITHDRAWAL_INTEREST_PENALTY,
  visitScore
} from "../packages/simulation/dist/index.js";

const activeLeague = (seed, programCount = 12) => beginSeason(createFictionalLeague(seed, programCount));

function availableProspects(state) {
  return Object.values(state.prospects)
    .filter((prospect) => prospect.status === "AVAILABLE")
    .sort((left, right) => left.id.localeCompare(right.id));
}

/** Puts a prospect on a program's board, undiscovered otherwise. */
function discover(state, programId, prospectId) {
  const recruiting = state.recruiting[programId];
  if (!recruiting.discoveredProspectIds.includes(prospectId)) recruiting.discoveredProspectIds.push(prospectId);
  recruiting.scoutingByProspect[prospectId] ??= { evaluations: [], pursuitPoints: 0 };
}

test("a prospect committed past the scholarship limit resolves to withdrawn, not stuck", () => {
  let state = activeLeague("recruiting-overflow", 4);
  const programId = "program-1";
  const program = state.programs[programId];
  const prospectId = state.recruiting[programId].discoveredProspectIds[0];
  assert.ok(prospectId);
  const prospect = state.prospects[prospectId];
  prospect.status = "COMMITTED";
  prospect.signedProgramId = programId;
  // Close every opening for good, regardless of how many seniors graduate out
  // over the season — the rollover enrollment loop must never find room.
  program.scholarshipLimit = 0;
  const openingSeason = state.season;
  let result = advanceWeek(state);
  state = result.state;
  while (state.season === openingSeason) {
    result = advanceWeek(state);
    state = result.state;
  }
  assert.equal(
    state.prospects[prospectId].status,
    "WITHDRAWN",
    "a class-full commitment must resolve, not linger as COMMITTED"
  );
  assert.equal(state.players[`player:${prospectId}`], undefined);
  assert.ok(
    result.events.some((event) => event.type === "PROSPECT_COMMITMENT_VOIDED" && event.prospectId === prospectId),
    "the void must be a reported event, not a silent drop"
  );
});

test("pursuit points are refused without an active offer", () => {
  const state = activeLeague("recruiting-offer-gate");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  const result = advanceWeek(state, [
    { type: "INVEST_RECRUITING_POINTS", programId, prospectId: prospect.id, points: 10 }
  ]);
  const rejection = result.events.find((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "INVEST_RECRUITING_POINTS");
  assert.ok(rejection, "an investment on a prospect nobody has offered must be refused");
  assert.match(rejection.reason, /offer/i);
  assert.equal(result.state.recruiting[programId].scoutingByProspect[prospect.id].pursuitPoints, 0);
});

test("extending an offer is free; rescinding costs the same flat interest NIL withdrawal does", () => {
  const state = activeLeague("recruiting-offer-cost");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  const interestBefore = prospect.interestByProgram[programId];

  // Points still replenish every week regardless of commands, so compare
  // against an identical week with no commands rather than the pre-week value.
  const baseline = advanceWeek(state);
  const extended = advanceWeek(state, [
    { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true }
  ]);
  assert.equal(
    extended.state.recruiting[programId].points,
    baseline.state.recruiting[programId].points,
    "extending an offer costs nothing beyond the week's ordinary replenishment"
  );
  assert.ok(extended.state.recruiting[programId].offeredProspectIds.includes(prospect.id));
  assert.ok(
    extended.events.some((event) => event.type === "PROSPECT_OFFERED" && event.extended === true),
    "extending must be a reported event"
  );

  const rescinded = advanceWeek(extended.state, [
    { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: false }
  ]);
  assert.ok(!rescinded.state.recruiting[programId].offeredProspectIds.includes(prospect.id));
  assert.equal(
    rescinded.state.prospects[prospect.id].interestByProgram[programId],
    Math.max(0, interestBefore - NIL_WITHDRAWAL_INTEREST_PENALTY),
    "rescinding costs the same flat, deterministic interest NIL withdrawal charges"
  );
});

test("an offer and an investment in the same week resolve regardless of command order", () => {
  const programId = Object.keys(activeLeague("recruiting-offer-order").programs)[0];
  const prospectId = availableProspects(activeLeague("recruiting-offer-order"))[0].id;
  const build = (commandOrder) => {
    const state = activeLeague("recruiting-offer-order");
    discover(state, programId, prospectId);
    const commands = [
      { type: "OFFER_PROSPECT", programId, prospectId, extend: true },
      { type: "INVEST_RECRUITING_POINTS", programId, prospectId, points: 10 }
    ];
    return advanceWeek(state, commandOrder === "forward" ? commands : [...commands].reverse());
  };
  const forward = build("forward");
  const reversed = build("reversed");
  assert.deepEqual(forward, reversed);
  assert.equal(
    forward.state.recruiting[programId].scoutingByProspect[prospectId]?.pursuitPoints,
    10,
    "the investment must land in the same week the offer was extended, whichever order the commands arrived in"
  );
});

test("a career with offer commands replays byte-identically", () => {
  const run = () => {
    const state = activeLeague("recruiting-offer-replay");
    const programId = Object.keys(state.programs)[0];
    const prospect = availableProspects(state)[0];
    discover(state, programId, prospect.id);
    let current = advanceWeek(state, [
      { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true },
      { type: "INVEST_RECRUITING_POINTS", programId, prospectId: prospect.id, points: 10 }
    ]);
    current = advanceWeek(current.state);
    return current;
  };
  assert.deepEqual(run(), run());
});

test("visitScore rewards fit and halves on each repeat", () => {
  const lowFit = visitScore(0, 0);
  const highFit = visitScore(100, 0);
  assert.ok(highFit > lowFit, "a program that actually fits what he wants must get more from the same visit");
  const first = visitScore(70, 0);
  const second = visitScore(70, 1);
  const third = visitScore(70, 2);
  assert.ok(Math.abs(second - first / 2) < 1e-6, "the second visit must be worth exactly half the first");
  assert.ok(Math.abs(third - first / 4) < 1e-6, "the third visit must be worth exactly a quarter of the first");
});

test("a visit is refused without an active offer", () => {
  const state = activeLeague("recruiting-visit-gate");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  state.recruiting[programId].points = 1000;
  const result = advanceWeek(state, [
    { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
  ]);
  const rejection = result.events.find((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "SCHEDULE_VISIT");
  assert.ok(rejection, "a visit on a prospect nobody has offered must be refused");
  assert.match(rejection.reason, /offer/i);
});

test("the season visit cap binds across the whole board", () => {
  const state = activeLeague("recruiting-visit-cap");
  const programId = Object.keys(state.programs)[0];
  const prospects = availableProspects(state).slice(0, MAX_VISITS_PER_SEASON + 1);
  assert.equal(prospects.length, MAX_VISITS_PER_SEASON + 1);
  for (const prospect of prospects) discover(state, programId, prospect.id);
  state.recruiting[programId].points = 1000;
  const commands = prospects.flatMap((prospect) => [
    { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true },
    { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
  ]);
  const result = advanceWeek(state, commands);
  const scheduled = result.events.filter((event) => event.type === "RECRUITING_VISIT_SCHEDULED");
  const rejected = result.events.filter((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "SCHEDULE_VISIT");
  assert.equal(scheduled.length, MAX_VISITS_PER_SEASON, "only the season cap's worth of visits may be scheduled");
  assert.equal(rejected.length, 1, "the visit past the cap must be refused with a reason");
  assert.match(rejected[0].reason, /visit/i);
  assert.equal(result.state.recruiting[programId].visitsUsedThisSeason, MAX_VISITS_PER_SEASON);
});

test("a repeat visit to the same recruit is worth less than the first, in the actual market score", () => {
  const state = activeLeague("recruiting-visit-diminish");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  state.recruiting[programId].points = 1000;
  const first = advanceWeek(state, [
    { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true },
    { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
  ]);
  const firstVisit = first.events.find((event) => event.type === "RECRUITING_VISIT_SCHEDULED");
  assert.ok(firstVisit);
  assert.equal(firstVisit.visitNumber, 1);
  first.state.recruiting[programId].points = 1000;
  const second = advanceWeek(first.state, [
    { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
  ]);
  const secondVisit = second.events.find((event) => event.type === "RECRUITING_VISIT_SCHEDULED");
  assert.ok(secondVisit);
  assert.equal(secondVisit.visitNumber, 2);
  assert.ok(
    secondVisit.bonus < firstVisit.bonus,
    `a second visit to the same recruit (${secondVisit.bonus}) must be worth less than the first (${firstVisit.bonus})`
  );
});

test("an offer and a visit in the same week resolve regardless of command order", () => {
  const programId = Object.keys(activeLeague("recruiting-visit-order").programs)[0];
  const prospectId = availableProspects(activeLeague("recruiting-visit-order"))[0].id;
  const build = (commandOrder) => {
    const state = activeLeague("recruiting-visit-order");
    discover(state, programId, prospectId);
    state.recruiting[programId].points = 1000;
    const commands = [
      { type: "OFFER_PROSPECT", programId, prospectId, extend: true },
      { type: "SCHEDULE_VISIT", programId, prospectId }
    ];
    return advanceWeek(state, commandOrder === "forward" ? commands : [...commands].reverse());
  };
  const forward = build("forward");
  const reversed = build("reversed");
  assert.deepEqual(forward, reversed);
  assert.ok(forward.events.some((event) => event.type === "RECRUITING_VISIT_SCHEDULED"));
});

test("a career with visit commands replays byte-identically", () => {
  const run = () => {
    const state = activeLeague("recruiting-visit-replay");
    const programId = Object.keys(state.programs)[0];
    const prospect = availableProspects(state)[0];
    discover(state, programId, prospect.id);
    state.recruiting[programId].points = 1000;
    let current = advanceWeek(state, [
      { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true },
      { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
    ]);
    current = advanceWeek(current.state);
    return current;
  };
  assert.deepEqual(run(), run());
});
