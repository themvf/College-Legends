import test from "node:test";
import assert from "node:assert/strict";
import {
  coachingPlanningKnowledgeSnapshot,
  coachingPlanningKnowledgeView,
  planOffseasonCommands,
  planWeeklyCommands,
  selectCoachingChange,
  selectWeeklyFocusAndScouting,
  weeklyPlanningKnowledgeView
} from "../packages/ai/dist/index.js";
import { advanceOffseasonStep, advanceWeek, beginSeason, createFictionalLeague } from "../packages/simulation/dist/index.js";

const activeLeague = (seed, count = 4) => beginSeason(createFictionalLeague(seed, count));
const planningFor = (state, programId) => planWeeklyCommands(state)
  .filter((command) => command.programId === programId
    && (command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET"));

const coachingWindow = (seed) => {
  let state = activeLeague(seed);
  while (state.phase !== "OFFSEASON") state = advanceWeek(state, planWeeklyCommands(state)).state;
  while (state.offseasonStep !== "COACHING") {
    state = advanceOffseasonStep(state, planOffseasonCommands(state)).state;
  }
  return state;
};

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

test("coaching AI preserves the established deterministic replacement", () => {
  const state = coachingWindow("coaching-view-0");
  assert.deepEqual(planOffseasonCommands(state), [{
    type: "REPLACE_STAFF",
    programId: "program-2",
    staffId: "program-2-staff-2",
    candidateId: "program-2:OFFENSIVE_COORDINATOR:candidate:1"
  }]);
  const view = coachingPlanningKnowledgeView(state, "program-2");
  assert.deepEqual(selectCoachingChange(view), planOffseasonCommands(state, "program-1"));
  assert.deepEqual(selectCoachingChange(view), selectCoachingChange(view));
});

test("the coaching selector receives only its complete frozen program view", () => {
  const state = coachingWindow("coaching-view-0");
  const view = coachingPlanningKnowledgeView(state, "program-2");
  assert.deepEqual(Object.keys(view).sort(), [
    "availableBudget", "kind", "posts", "programId", "weeklyExpenses"
  ]);
  assert.equal(view.kind, "COACHING_PLANNING_KNOWLEDGE_V1");
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.posts), true);
  assert.ok(view.posts.every((post) => Object.isFrozen(post)
    && Object.isFrozen(post.candidates)
    && post.candidates.every(Object.isFrozen)));
  assert.ok(!JSON.stringify(view).match(/player|prospect|potential|rootSeed|rival/i));
  assert.throws(() => { view.availableBudget = 0; }, TypeError);
  assert.throws(() => { view.posts[0].candidates[0].rating = 0; }, TypeError);

  const snapshot = coachingPlanningKnowledgeSnapshot(state, "program-2");
  assert.equal(snapshot.facts.length, 1);
  assert.equal(snapshot.facts[0].key, "coachingPlanning.view.v1");
  assert.deepEqual(JSON.parse(snapshot.facts[0].value), view);
});

test("hidden league data cannot affect coaching selection, while declared inputs can", () => {
  const state = coachingWindow("coaching-view-0");
  const expected = coachingPlanningKnowledgeView(state, "program-2");
  const changed = structuredClone(state);
  for (const player of Object.values(changed.players)) {
    player.overall = player.overall > 65 ? 32 : 99;
    player.potential = player.potential > 80 ? 40 : 99;
  }
  for (const prospect of Object.values(changed.prospects)) {
    prospect.potential = prospect.potential > 80 ? 40 : 99;
  }
  for (const program of Object.values(changed.programs)) {
    if (program.id !== "program-2") {
      program.budget *= -10;
      program.weeklyExpenses *= 10;
    }
  }
  for (const member of Object.values(changed.staff)) {
    if (member.programId !== "program-2") member.rating = member.rating > 70 ? 20 : 99;
  }
  assert.deepEqual(coachingPlanningKnowledgeView(changed, "program-2"), expected);
  assert.deepEqual(selectCoachingChange(coachingPlanningKnowledgeView(changed, "program-2")), selectCoachingChange(expected));

  const unaffordable = structuredClone(expected);
  unaffordable.availableBudget = 0;
  assert.deepEqual(selectCoachingChange(unaffordable), []);
  const noUpgrade = structuredClone(expected);
  for (const post of noUpgrade.posts) {
    for (const candidate of post.candidates) candidate.rating = post.incumbentRating;
  }
  assert.deepEqual(selectCoachingChange(noUpgrade), []);
});
