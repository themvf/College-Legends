import test from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, AddressableRng, createFictionalLeague } from "../packages/simulation/dist/index.js";

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
