import test from "node:test";
import assert from "node:assert/strict";
import { planWeeklyCommands, selectWeeklyFocusAndScouting, weeklyPlanningKnowledgeView } from "../packages/ai/dist/index.js";
import { beginSeason, createFictionalLeague } from "../packages/simulation/dist/index.js";

const activeLeague = (seed, count = 4) => beginSeason(createFictionalLeague(seed, count));
const planningFor = (state, programId) => planWeeklyCommands(state)
  .filter((command) => command.programId === programId
    && (command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET"));

test("weekly AI focus and scouting preserve the established deterministic choices", () => {
  const state = activeLeague("ai-redacted-baseline");
  const planning = planWeeklyCommands(state)
    .filter((command) => command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET");
  assert.deepEqual(planning, [
    { type: "SET_WEEK_FOCUS", programId: "program-1", focuses: ["SCOUT"] },
    { type: "SET_SCOUTING_TARGET", programId: "program-1", opponentProgramId: "program-3" },
    { type: "SET_WEEK_FOCUS", programId: "program-2", focuses: ["SCOUT", "INSTALL_DEFENSE"] },
    { type: "SET_WEEK_FOCUS", programId: "program-3", focuses: ["INSTALL_OFFENSE", "SCOUT", "DEVELOP"] },
    { type: "SET_WEEK_FOCUS", programId: "program-4", focuses: ["SCOUT"] },
    { type: "SET_SCOUTING_TARGET", programId: "program-4", opponentProgramId: "program-3" }
  ]);
  assert.deepEqual(planning, planWeeklyCommands(state)
    .filter((command) => command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET"));
});

test("hidden opponent player ratings cannot affect weekly focus or scouting selection", () => {
  const state = activeLeague("ai-hidden-opponent-ratings");
  const programId = "program-1";
  const expected = planningFor(state, programId);
  const changed = structuredClone(state);
  for (const player of Object.values(changed.players)) {
    if (player.programId === programId) continue;
    player.overall = player.overall > 65 ? 32 : 99;
    for (const key of Object.keys(player.ratings)) player.ratings[key] = player.overall;
  }
  assert.deepEqual(planningFor(changed, programId), expected);
});

test("unrevealed prospect potential cannot affect weekly focus or scouting selection", () => {
  const state = activeLeague("ai-hidden-prospect-potential");
  const programId = "program-1";
  const expected = planningFor(state, programId);
  const changed = structuredClone(state);
  for (const prospect of Object.values(changed.prospects)) {
    prospect.potential = prospect.potential > 80 ? 40 : 99;
  }
  assert.deepEqual(planningFor(changed, programId), expected);
});

test("rival-private recruiting interest cannot affect weekly focus or scouting selection", () => {
  const state = activeLeague("ai-hidden-rival-interest");
  const programId = "program-1";
  const expected = planningFor(state, programId);
  const changed = structuredClone(state);
  for (const prospect of Object.values(changed.prospects)) {
    for (const rivalId of Object.keys(prospect.interestByProgram)) {
      if (rivalId !== programId) {
        prospect.interestByProgram[rivalId] = prospect.interestByProgram[rivalId] > 50 ? 0 : 100;
      }
    }
  }
  assert.deepEqual(planningFor(changed, programId), expected);
});

test("permitted public and internal facts can change weekly selection", () => {
  const base = {
    kind: "WEEKLY_PLANNING_KNOWLEDGE_V1",
    programId: "program-1",
    week: 1,
    staffFocusCapacity: 2,
    ownUnitRatings: {
      passOffense: 82,
      rushOffense: 78,
      passDefense: 62,
      rushDefense: 60
    },
    currentScoutingTarget: null,
    scoutingOptions: [
      { opponentProgramId: "program-2", week: 1, value: 60 },
      { opponentProgramId: "program-3", week: 2, value: 45 }
    ]
  };
  const original = selectWeeklyFocusAndScouting(base);
  const strongerDefense = selectWeeklyFocusAndScouting({
    ...base,
    ownUnitRatings: { passOffense: 55, rushOffense: 55, passDefense: 85, rushDefense: 84 }
  });
  assert.notDeepEqual(strongerDefense, original, "internal unit strength may change which side is drilled");
  assert.ok(strongerDefense[0].focuses.includes("INSTALL_DEFENSE"));

  const higherPublicValue = selectWeeklyFocusAndScouting({
    ...base,
    scoutingOptions: [
      { opponentProgramId: "program-2", week: 1, value: 60 },
      { opponentProgramId: "program-3", week: 2, value: 120 }
    ]
  });
  assert.equal(higherPublicValue.find((command) => command.type === "SET_SCOUTING_TARGET")?.opponentProgramId, "program-3");

  const widerStaff = selectWeeklyFocusAndScouting({ ...base, staffFocusCapacity: 3 });
  assert.equal(widerStaff[0].focuses.length, 3);
  assert.notDeepEqual(widerStaff, original, "internal staff capacity may add a legal priority");
});

test("the state adapter exposes only the declared weekly knowledge fields", () => {
  const view = weeklyPlanningKnowledgeView(activeLeague("ai-view-shape"), "program-1");
  assert.deepEqual(Object.keys(view).sort(), [
    "currentScoutingTarget",
    "kind",
    "ownUnitRatings",
    "programId",
    "scoutingOptions",
    "staffFocusCapacity",
    "week"
  ]);
  assert.ok(!JSON.stringify(view).match(/potential|interestByProgram|opponent.*rating/i));
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.ownUnitRatings), true);
  assert.equal(Object.isFrozen(view.scoutingOptions), true);
  assert.ok(view.scoutingOptions.every(Object.isFrozen));
  assert.throws(() => { view.ownUnitRatings.passOffense = 0; }, TypeError);
});
