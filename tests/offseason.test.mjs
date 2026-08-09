import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  OFFSEASON_STEPS
} from "../packages/simulation/dist/index.js";

const activeLeague = (seed, programCount = 12) => beginSeason(createFictionalLeague(seed, programCount));

/** Plays a full regular season and stops the moment the offseason opens. */
function toOffseason(seed, programCount = 4) {
  let state = activeLeague(seed, programCount);
  let events = [];
  while (state.phase !== "OFFSEASON") {
    const result = advanceWeek(state);
    state = result.state;
    events = result.events;
  }
  return { state, events };
}

test("the season ends in a real offseason instead of snapping back to week one", () => {
  const { state, events } = toOffseason("offseason-opens");
  assert.equal(state.phase, "OFFSEASON");
  assert.equal(state.offseasonStep, OFFSEASON_STEPS[0]);
  const began = events.find((event) => event.type === "OFFSEASON_BEGAN");
  assert.ok(began, "entering the offseason must be reported");
  assert.equal(began.step, OFFSEASON_STEPS[0]);
  assert.throws(() => advanceWeek(state), /begin the season|offseason/i);
});

test("the steps resolve in their fixed order and hand back a playable season", () => {
  let { state } = toOffseason("offseason-order");
  const seasonEnding = state.season;
  const seen = [];
  while (state.phase === "OFFSEASON") {
    seen.push(state.offseasonStep);
    state = advanceOffseasonStep(state).state;
  }
  assert.deepEqual(seen, [...OFFSEASON_STEPS], "every step runs, once, in order");
  assert.equal(state.phase, "REGULAR_SEASON");
  assert.equal(state.offseasonStep, null);
  assert.equal(state.week, 1);
  assert.equal(state.season, seasonEnding + 1, "the new season only begins when the offseason closes");
  assert.ok(state.schedule.length > 0, "a schedule must exist for the season about to be played");
  assert.throws(() => advanceOffseasonStep(state), /no offseason step/i);
});

test("the incoming class enrolls when the offseason closes, not when week 14 ends", () => {
  // Drive one real commitment rather than relying on the rival planner, so the
  // assertion is about *when* enrollment happens, not about AI behaviour.
  let state = activeLeague("offseason-enrollment", 4);
  const programId = "program-1";
  const prospectId = state.recruiting[programId].discoveredProspectIds[0];
  assert.ok(prospectId);
  state.recruiting[programId].scoutingByProspect[prospectId].pursuitPoints = 100;
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;

  const signed = Object.values(state.prospects).filter((prospect) =>
    prospect.status === "SIGNED" || prospect.status === "COMMITTED");
  assert.ok(signed.length > 0, "the season must have produced a signed class to enroll");
  const example = signed[0];
  assert.equal(
    state.players[`player:${example.id}`],
    undefined,
    "a signee is not on the roster while the portal step is still open"
  );

  let enrolled = null;
  while (state.phase === "OFFSEASON") {
    const result = advanceOffseasonStep(state);
    state = result.state;
    enrolled ??= result.events.find((event) => event.type === "PROSPECT_ENROLLED") ?? null;
  }
  assert.ok(enrolled, "enrollment must be reported at the end of the offseason");
  assert.equal(state.prospects[example.id].status, "ENROLLED");
  assert.ok(state.players[`player:${example.id}`], "and he must actually be on the roster");
});

test("skipping every step is legal and reports each one closing", () => {
  let { state } = toOffseason("offseason-skip");
  const programId = Object.keys(state.programs)[0];
  const completed = [];
  while (state.phase === "OFFSEASON") {
    const result = advanceOffseasonStep(state, [{ type: "CONTINUE_OFFSEASON", programId }]);
    state = result.state;
    completed.push(...result.events.filter((event) => event.type === "OFFSEASON_STEP_COMPLETED"));
    assert.ok(
      !result.events.some((event) => event.type === "COMMAND_REJECTED"),
      "declining to act is never an error"
    );
  }
  assert.deepEqual(completed.map((event) => event.step), [...OFFSEASON_STEPS]);
  assert.equal(completed.at(-1).nextStep, null, "the last step closes the offseason itself");
});

test("a command belonging to another step is refused with the step that owns it", () => {
  const { state } = toOffseason("offseason-wrong-step");
  const programId = Object.keys(state.programs)[0];
  assert.equal(state.offseasonStep, "PORTAL");
  const result = advanceOffseasonStep(state, [
    { type: "SET_TICKET_PRICE", programId, price: 40 }
  ]);
  const rejection = result.events.find((event) => event.type === "COMMAND_REJECTED");
  assert.ok(rejection, "a command that does not belong to the open step must be refused");
  assert.match(rejection.reason, /transfer portal/i);
});

test("an offseason replays byte-identically", () => {
  const run = () => {
    let { state } = toOffseason("offseason-replay");
    while (state.phase === "OFFSEASON") state = advanceOffseasonStep(state).state;
    return state;
  };
  assert.deepEqual(run(), run());
});
