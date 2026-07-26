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

test("players, coaches, and prospects receive stable unique fictional names", () => {
  const state = createFictionalLeague("fictional-identities", 12);
  const repeated = createFictionalLeague("fictional-identities", 12);
  const people = [...Object.values(state.players), ...Object.values(state.staff), ...Object.values(state.prospects)];
  const names = people.map((person) => person.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((name) => /^[A-Z][A-Za-z]+ [A-Z][A-Za-z]+$/.test(name)));
  assert.ok(names.every((name) => !/^(Player|Coach|Prospect)\b/.test(name)));
  assert.deepEqual(
    names,
    [...Object.values(repeated.players), ...Object.values(repeated.staff), ...Object.values(repeated.prospects)].map((person) => person.name)
  );
});

test("the national league has six divisions, all 50 states, and Division I-style schedules", () => {
  const state = createFictionalLeague("national-football-world");
  const programs = Object.values(state.programs);
  assert.equal(programs.length, 72);
  assert.equal(new Set(programs.map((program) => program.divisionId)).size, 6);
  assert.equal(new Set(programs.map((program) => program.stateCode)).size, 50);
  assert.equal(new Set(programs.map((program) => program.name)).size, programs.length);
  assert.equal(new Set(programs.map((program) => program.abbreviation)).size, programs.length);
  assert.ok(programs.every((program) => program.nickname && program.city && program.state));

  for (const divisionId of new Set(programs.map((program) => program.divisionId))) {
    assert.equal(programs.filter((program) => program.divisionId === divisionId).length, 12);
  }
  for (const program of programs) {
    const schedule = state.schedule.filter((game) => game.homeProgramId === program.id || game.awayProgramId === program.id);
    assert.equal(schedule.length, 12);
    assert.equal(schedule.filter((game) => game.matchupType === "DIVISION").length, 8);
    assert.equal(schedule.filter((game) => game.matchupType === "CROSS_DIVISION").length, 4);
    assert.equal(new Set(schedule.map((game) => game.week)).size, 12);
    assert.equal(new Set(schedule.map((game) => game.homeProgramId === program.id ? game.awayProgramId : game.homeProgramId)).size, 12);
    const homeGames = schedule.filter((game) => game.homeProgramId === program.id).length;
    assert.ok(homeGames >= 5 && homeGames <= 7);
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

test("development and staff decisions resolve through the shared command boundary", () => {
  const state = activeLeague("management-commands", 4);
  const player = Object.values(state.players).find((candidate) => candidate.programId === "program-1");
  const staff = Object.values(state.staff).find((candidate) => candidate.programId === "program-1");
  assert.ok(player && staff);
  const result = advanceWeek(state, [
    { type: "SET_DEVELOPMENT_FOCUS", programId: "program-1", playerId: player.id, focus: "STRENGTH" },
    { type: "ASSIGN_STAFF", programId: "program-1", staffId: staff.id, assignment: "PLAYER_DEVELOPMENT" }
  ]);
  assert.equal(result.state.players[player.id].developmentFocus, "STRENGTH");
  assert.equal(result.state.staff[staff.id].assignment, "PLAYER_DEVELOPMENT");
  assert.ok(result.events.some((event) => event.type === "DEVELOPMENT_FOCUS_SET"));
  assert.ok(result.events.some((event) => event.type === "STAFF_ASSIGNED"));
});

test("facility upgrades spend budget and weekly finances are recorded", () => {
  const state = activeLeague("program-finances", 4);
  const openingBudget = state.programs["program-1"].budget;
  const openingLevel = state.programs["program-1"].facilities.TRAINING;
  const upgradeCost = { 1: 350_000, 2: 750_000, 3: 1_500_000, 4: 3_000_000 }[openingLevel];
  assert.ok(upgradeCost);
  const result = advanceWeek(state, [{ type: "UPGRADE_FACILITY", programId: "program-1", facility: "TRAINING" }]);
  const finance = result.events.find((event) => event.type === "WEEKLY_FINANCES" && event.programId === "program-1");
  assert.ok(finance);
  assert.equal(result.state.programs["program-1"].facilities.TRAINING, openingLevel + 1);
  assert.equal(result.state.programs["program-1"].budget, openingBudget - upgradeCost + finance.net);
  assert.ok(result.state.eventHistory.some((event) => event.type === "FACILITY_UPGRADED"));
});

test("played games retain scores for the schedule and inbox", () => {
  const state = activeLeague("schedule-results", 4);
  const result = advanceWeek(state);
  const played = result.state.schedule.filter((game) => game.week === 1 && game.played);
  assert.ok(played.length > 0);
  assert.ok(played.every((game) => Number.isInteger(game.homeScore) && Number.isInteger(game.awayScore)));
  assert.ok(result.state.eventHistory.some((event) => event.type === "GAME_COMPLETED"));
});
