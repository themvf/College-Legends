import test from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, beginSeason, createFictionalLeague, NIL_WITHDRAWAL_INTEREST_PENALTY } from "../packages/simulation/dist/index.js";

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
