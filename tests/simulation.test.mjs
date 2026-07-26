import test from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, AddressableRng, createFictionalLeague } from "../packages/simulation/dist/index.js";
import { planWeeklyCommands } from "../packages/ai/dist/index.js";

test("addressable RNG draw is unaffected by unrelated draws", () => {
  const rng = new AddressableRng("fixed");
  const expected = rng.fork("recruiting", "prospect-1").at("decision");
  rng.fork("games", "game-9").at("turnover");
  assert.equal(rng.fork("recruiting", "prospect-1").at("decision"), expected);
});

test("a fixed seed produces identical weekly state and events", () => {
  assert.deepEqual(advanceWeek(createFictionalLeague("repeatable")), advanceWeek(createFictionalLeague("repeatable")));
});

test("eligibility produces departures after four season rollovers", () => {
  let state = createFictionalLeague("eligibility", 4);
  let departures = 0;
  const firstSeason = state.season;
  while (state.season < firstSeason + 4) { const result = advanceWeek(state); state = result.state; departures += result.events.filter((event) => event.type === "PLAYER_DEPARTED").length; }
  assert.ok(departures > 0);
});

test("contested recruiting is independent of command order", () => {
  const state = createFictionalLeague("recruiting-order", 4);
  const commands = [
    { type: "OFFER_PROSPECT", programId: "program-1", prospectId: "prospect-initial-1" },
    { type: "OFFER_PROSPECT", programId: "program-4", prospectId: "prospect-initial-1" },
  ];
  const forward = advanceWeek(state, commands);
  const reversed = advanceWeek(state, [...commands].reverse());
  assert.deepEqual(forward, reversed);
  assert.equal(forward.events.filter((event) => event.type === "PROSPECT_SIGNED").length, 1);
});

test("a signed prospect becomes a rostered scholarship player", () => {
  const state = createFictionalLeague("recruiting-sign", 4);
  const result = advanceWeek(state, [{ type: "OFFER_PROSPECT", programId: "program-2", prospectId: "prospect-initial-2" }]);
  const signed = result.events.find((event) => event.type === "PROSPECT_SIGNED");
  assert.ok(signed && result.state.players[signed.playerId]);
  assert.equal(result.state.prospects["prospect-initial-2"].status, "SIGNED");
});

test("AI recruiting respects scholarship limits and receives a new annual cohort", () => {
  let state = createFictionalLeague("recruiting-cycle", 4);
  const startingProspectCount = Object.keys(state.prospects).length;
  const firstSeason = state.season;
  while (state.season < firstSeason + 2) {
    const result = advanceWeek(state, planWeeklyCommands(state));
    state = result.state;
  }
  for (const program of Object.values(state.programs)) {
    const scholarships = Object.values(state.players).filter((player) => player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
    assert.ok(scholarships <= program.scholarshipLimit);
  }
  assert.ok(Object.keys(state.prospects).length > startingProspectCount);
});
