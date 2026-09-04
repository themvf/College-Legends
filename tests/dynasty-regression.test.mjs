import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  OFFSEASON_STEPS,
  ROSTER_MINIMUMS
} from "../packages/simulation/dist/index.js";
import { planWeeklyCommands } from "../packages/ai/dist/index.js";

test("league creation initializes NIL state for every program", () => {
  const state = createFictionalLeague("nil-initialized", 24);
  assert.deepEqual(Object.keys(state.nil).sort(), Object.keys(state.programs).sort());
  for (const programId of Object.keys(state.programs)) {
    assert.deepEqual(state.nil[programId], { offersByProspect: {}, commitmentsByPlayer: {} });
  }
});

test("AI uses schemes instead of obsolete game-plan commands and invests in facilities", () => {
  const state = beginSeason(createFictionalLeague("ai-management", 24));
  for (const program of Object.values(state.programs)) program.budget = 100_000_000;
  const commands = planWeeklyCommands(state);
  assert.equal(commands.filter((command) => command.type === "SET_GAME_PLAN").length, 0);
  assert.equal(
    commands.filter((command) => command.type === "UPGRADE_FACILITY").length,
    Object.keys(state.programs).length,
    "every well-funded rival should make one strategic annual facility investment"
  );
});

test("every season enters the full offseason and returns to roster review", () => {
  let state = beginSeason(createFictionalLeague("three-offseasons", 4));
  const firstSeason = state.season;
  for (let expectedSeason = firstSeason; expectedSeason < firstSeason + 3; expectedSeason += 1) {
    while (state.phase === "REGULAR_SEASON") state = advanceWeek(state).state;
    assert.equal(state.phase, "OFFSEASON");
    const steps = [];
    while (state.phase === "OFFSEASON") {
      steps.push(state.offseasonStep);
      state = advanceOffseasonStep(state).state;
    }
    assert.deepEqual(steps, [...OFFSEASON_STEPS]);
    assert.equal(state.phase, "ROSTER_REVIEW");
    assert.equal(state.week, 0);
    state = beginSeason(state);
    assert.equal(state.week, 1);
  }
});

test("late scholarships keep every position room playable after departures", () => {
  let state = beginSeason(createFictionalLeague("late-fill-minimums", 4));
  while (state.phase === "REGULAR_SEASON") state = advanceWeek(state).state;
  let lateFills = 0;
  while (state.phase === "OFFSEASON") {
    const result = advanceOffseasonStep(state);
    lateFills += result.events.filter((event) => event.type === "PROSPECT_ENROLLED" && event.lateFill).length;
    state = result.state;
  }
  assert.ok(lateFills > 0, "a deliberately unmanaged class should receive late scholarships");
  for (const program of Object.values(state.programs)) {
    for (const [position, minimum] of Object.entries(ROSTER_MINIMUMS)) {
      const count = Object.values(state.players).filter((player) =>
        player.programId === program.id
        && player.position === position
        && player.eligibility.rosterStatus === "SCHOLARSHIP"
      ).length;
      assert.ok(count >= minimum, `${program.id} ${position} room fell to ${count}/${minimum}`);
    }
  }
});

test("late signing converts an unsigned athlete when a position pool is exhausted", () => {
  let state = beginSeason(createFictionalLeague("late-fill-conversion", 4));
  while (state.phase === "REGULAR_SEASON") state = advanceWeek(state).state;
  for (const prospect of Object.values(state.prospects)) {
    if (prospect.status === "AVAILABLE" && prospect.position === "DL") prospect.position = "WR";
  }
  for (const player of Object.values(state.players)) {
    if (player.programId === "program-1" && player.position === "DL" && player.eligibility.rosterStatus === "SCHOLARSHIP") {
      player.eligibility.rosterStatus = "DEPARTED";
      player.programId = null;
    }
  }
  while (state.phase === "OFFSEASON") state = advanceOffseasonStep(state).state;
  const defensiveLinemen = Object.values(state.players).filter((player) =>
    player.programId === "program-1" && player.position === "DL" && player.eligibility.rosterStatus === "SCHOLARSHIP"
  );
  assert.ok(defensiveLinemen.length >= ROSTER_MINIMUMS.DL);
  assert.ok(defensiveLinemen.every((player) => Object.keys(player.ratings).length > 0));
});

test("a losing season costs money, a winning one earns it, and losing does not inflate fandom", () => {
  let state = beginSeason(createFictionalLeague("losing-economy", 24));
  const opening = Object.fromEntries(Object.values(state.programs).map((program) => [program.id, {
    budget: program.budget,
    fans: program.fanBase
  }]));
  while (state.phase === "REGULAR_SEASON") state = advanceWeek(state).state;
  const losing = Object.values(state.programs).filter((program) => program.losses >= 9);
  const winning = Object.values(state.programs).filter((program) => program.wins >= 9);
  assert.ok(losing.length > 0 && winning.length > 0);
  const change = (program) => program.budget - opening[program.id].budget;

  // This used to assert a losing season was "near break-even", which was true
  // only because expenses were a frozen constant: a bad year cost nothing. It
  // costs money now, and the bound is that it must not be ruinous in one go.
  for (const program of losing) {
    assert.ok(change(program) < 0, `${program.id} did not lose money going ${program.wins}-${program.losses}`);
    assert.ok(change(program) > -6_000_000, `${program.id} moved ${change(program)} in a losing year`);
    assert.ok(program.fanBase <= opening[program.id].fans * 1.1, `${program.id} fandom grew despite losing`);
  }

  // The direction is the assertion that matters. An earlier build of the
  // economy scaled costs superlinearly with prestige and press while media
  // money rose linearly, so improving the program cost more than it earned:
  // 11-2 and 9-5 mid-tier programs lost $7.4M and $5.7M while nobody who went
  // 3-9 lost more than $3.7M. Winning must always be worth more than losing.
  const worstWinner = Math.min(...winning.map(change));
  const bestLoser = Math.max(...losing.map(change));
  assert.ok(
    worstWinner > bestLoser,
    `the worst winning season (${worstWinner}) must beat the best losing one (${bestLoser})`
  );
});
