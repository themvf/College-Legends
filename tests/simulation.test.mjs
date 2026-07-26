import test from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, AddressableRng, beginSeason, createFictionalLeague, ROSTER_COMPOSITION, STARTING_ROSTER_SIZE } from "../packages/simulation/dist/index.js";
import { planWeeklyCommands } from "../packages/ai/dist/index.js";

const activeLeague = (seed, programCount = 12) => beginSeason(createFictionalLeague(seed, programCount));

function openScholarship(state, programId) {
  const player = Object.values(state.players).find((candidate) => candidate.programId === programId);
  assert.ok(player);
  player.eligibility.rosterStatus = "GRADUATED";
}

test("addressable RNG draw is unaffected by unrelated draws", () => {
  const rng = new AddressableRng("fixed");
  const expected = rng.fork("recruiting", "prospect-1").at("decision");
  rng.fork("games", "game-9").at("turnover");
  assert.equal(rng.fork("recruiting", "prospect-1").at("decision"), expected);
});

test("a fixed seed produces identical weekly state and events", () => {
  assert.deepEqual(advanceWeek(activeLeague("repeatable")), advanceWeek(activeLeague("repeatable")));
});

test("every program starts with a complete position-balanced 85-player roster", () => {
  const state = createFictionalLeague("opening-rosters", 12);
  assert.equal(state.phase, "ROSTER_REVIEW");
  assert.equal(state.week, 0);
  assert.equal(STARTING_ROSTER_SIZE, 85);
  for (const program of Object.values(state.programs)) {
    const roster = Object.values(state.players).filter((player) => player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP");
    assert.equal(roster.length, program.scholarshipLimit);
    for (const [position, expected] of Object.entries(ROSTER_COMPOSITION)) {
      assert.equal(roster.filter((player) => player.position === position).length, expected);
    }
  }
});

test("low-tier programs begin with average players and no recruiting actions", () => {
  const state = createFictionalLeague("low-tier-foundation", 12);
  const lowProgram = Object.values(state.programs).find((program) => program.tier === "LOW");
  assert.ok(lowProgram);
  const roster = Object.values(state.players).filter((player) => player.programId === lowProgram.id);
  const average = roster.reduce((sum, player) => sum + player.overall, 0) / roster.length;
  assert.ok(average >= 67 && average <= 69);
  assert.deepEqual(planWeeklyCommands(state), []);
  assert.throws(() => advanceWeek(state), /begin the season/i);
});

test("eligibility produces departures after four season rollovers", () => {
  let state = activeLeague("eligibility", 4);
  let departures = 0;
  const firstSeason = state.season;
  while (state.season < firstSeason + 4) { const result = advanceWeek(state); state = result.state; departures += result.events.filter((event) => event.type === "PLAYER_DEPARTED").length; }
  assert.ok(departures > 0);
});

test("contested recruiting is independent of command order", () => {
  const state = activeLeague("recruiting-order", 4);
  openScholarship(state, "program-1");
  openScholarship(state, "program-4");
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
  const state = activeLeague("recruiting-sign", 4);
  openScholarship(state, "program-2");
  const result = advanceWeek(state, [{ type: "OFFER_PROSPECT", programId: "program-2", prospectId: "prospect-initial-2" }]);
  const signed = result.events.find((event) => event.type === "PROSPECT_SIGNED");
  assert.ok(signed && result.state.players[signed.playerId]);
  assert.equal(result.state.prospects["prospect-initial-2"].status, "SIGNED");
});

test("AI recruiting respects scholarship limits and receives a new annual cohort", () => {
  let state = activeLeague("recruiting-cycle", 4);
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
