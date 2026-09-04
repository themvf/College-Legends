import test from "node:test";
import assert from "node:assert/strict";
import {
  coachingPlanningKnowledgeSnapshot,
  coachingPlanningKnowledgeView,
  planOffseasonCommands,
  planWeeklyCommands,
  portalPlanningKnowledgeSnapshot,
  portalPlanningKnowledgeView,
  portalPlanningKnowledgeViews,
  selectCoachingChange,
  selectPortalBids,
  selectTrainingCampFocus,
  selectBoosterChoice,
  selectFacilityUpgrade,
  selectSponsorship,
  selectWeeklyFocusAndScouting,
  trainingCampPlanningKnowledgeSnapshot,
  trainingCampPlanningKnowledgeView,
  weeklyBusinessPlanningKnowledgeSnapshot,
  weeklyBusinessPlanningKnowledgeView,
  weeklyBusinessPlanningKnowledgeViews,
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

const trainingCampWindow = (seed) => {
  let state = coachingWindow(seed);
  while (state.offseasonStep !== "TRAINING_CAMP") {
    state = advanceOffseasonStep(state, planOffseasonCommands(state)).state;
  }
  return state;
};

const portalWindow = (seed, count = 4) => {
  let state = activeLeague(seed, count);
  while (state.phase !== "OFFSEASON") state = advanceWeek(state, planWeeklyCommands(state)).state;
  // The board review opens the offseason; the portal boundary is the step after it.
  while (state.offseasonStep !== "PORTAL") state = advanceOffseasonStep(state).state;
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

test("training-camp AI preserves the established deterministic focuses", () => {
  const state = trainingCampWindow("training-camp-view-0");
  assert.deepEqual(planOffseasonCommands(state), [
    { type: "SET_TRAINING_CAMP_FOCUS", programId: "program-1", focus: "CONDITIONING" },
    { type: "SET_TRAINING_CAMP_FOCUS", programId: "program-2", focus: "CONDITIONING" },
    { type: "SET_TRAINING_CAMP_FOCUS", programId: "program-3", focus: "CONDITIONING" },
    { type: "SET_TRAINING_CAMP_FOCUS", programId: "program-4", focus: "CONDITIONING" }
  ]);
  for (const programId of Object.keys(state.programs)) {
    const view = trainingCampPlanningKnowledgeView(state, programId);
    assert.deepEqual(selectTrainingCampFocus(view), planOffseasonCommands(state).find((command) => command.programId === programId));
    assert.deepEqual(selectTrainingCampFocus(view), selectTrainingCampFocus(view));
  }
});

test("the training-camp selector receives only its exact frozen program view", () => {
  const state = trainingCampWindow("training-camp-view-0");
  const view = trainingCampPlanningKnowledgeView(state, "program-1");
  assert.deepEqual(Object.keys(view).sort(), [
    "kind", "programId", "scholarshipLimit", "scholarshipRosterSize"
  ]);
  assert.equal(view.kind, "TRAINING_CAMP_PLANNING_KNOWLEDGE_V1");
  assert.equal(Object.isFrozen(view), true);
  assert.ok(!JSON.stringify(view).match(/rating|potential|injury|player|rival/i));
  assert.throws(() => { view.scholarshipRosterSize = 85; }, TypeError);

  const snapshot = trainingCampPlanningKnowledgeSnapshot(state, "program-1");
  assert.equal(snapshot.facts.length, 1);
  assert.equal(snapshot.facts[0].key, "trainingCampPlanning.view.v1");
  assert.deepEqual(JSON.parse(snapshot.facts[0].value), view);
});

test("hidden player data cannot affect camp selection, while the declared 85 percent threshold can", () => {
  const state = trainingCampWindow("training-camp-view-0");
  const expected = trainingCampPlanningKnowledgeView(state, "program-1");
  const changed = structuredClone(state);
  for (const player of Object.values(changed.players)) {
    player.overall = player.overall > 65 ? 32 : 99;
    player.potential = player.potential > 80 ? 40 : 99;
    player.injury = player.injury ? null : { severity: "MAJOR", bodyPart: "Knee" };
    player.injuryWeeksRemaining = player.injury ? 8 : 0;
  }
  for (const program of Object.values(changed.programs)) {
    if (program.id !== "program-1") program.scholarshipLimit += 50;
  }
  assert.deepEqual(trainingCampPlanningKnowledgeView(changed, "program-1"), expected);
  assert.deepEqual(selectTrainingCampFocus(trainingCampPlanningKnowledgeView(changed, "program-1")), selectTrainingCampFocus(expected));

  assert.deepEqual(selectTrainingCampFocus({
    kind: "TRAINING_CAMP_PLANNING_KNOWLEDGE_V1",
    programId: "program-1",
    scholarshipRosterSize: 84,
    scholarshipLimit: 100
  }), { type: "SET_TRAINING_CAMP_FOCUS", programId: "program-1", focus: "CONDITIONING" });
  assert.deepEqual(selectTrainingCampFocus({
    kind: "TRAINING_CAMP_PLANNING_KNOWLEDGE_V1",
    programId: "program-1",
    scholarshipRosterSize: 85,
    scholarshipLimit: 100
  }), { type: "SET_TRAINING_CAMP_FOCUS", programId: "program-1", focus: "INSTALL" });
});

const businessCommands = (commands) => commands.filter((command) =>
  command.type === "CHOOSE_BOOSTER"
  || command.type === "ACCEPT_SPONSORSHIP"
  || command.type === "UPGRADE_FACILITY");

test("weekly business AI preserves the established deterministic V1 choices", () => {
  // Re-baselined when weeklyExpenses stopped being a frozen constant and became
  // the derived operating cost. The AI reads it to judge what a program can
  // afford, so the affordability line moved and program-4 can now carry an
  // academics upgrade. The choices are otherwise unchanged.
  let state = activeLeague("weekly-business-view-0");
  assert.deepEqual(businessCommands(planWeeklyCommands(state)), [
    { type: "ACCEPT_SPONSORSHIP", programId: "program-1", offerId: "program-1:2027:guaranteed" },
    { type: "ACCEPT_SPONSORSHIP", programId: "program-2", offerId: "program-2:2027:guaranteed" },
    { type: "UPGRADE_FACILITY", programId: "program-2", facility: "ACADEMICS" },
    { type: "ACCEPT_SPONSORSHIP", programId: "program-3", offerId: "program-3:2027:winning" },
    { type: "UPGRADE_FACILITY", programId: "program-3", facility: "SCOUTING" },
    { type: "ACCEPT_SPONSORSHIP", programId: "program-4", offerId: "program-4:2027:home-crowd" },
    { type: "UPGRADE_FACILITY", programId: "program-4", facility: "ACADEMICS" }
  ]);
  state = advanceWeek(state, planWeeklyCommands(state)).state;
  state = advanceWeek(state, planWeeklyCommands(state)).state;
  assert.deepEqual(businessCommands(planWeeklyCommands(state)), [
    { type: "CHOOSE_BOOSTER", programId: "program-1", optionId: "2027:3:program-1:donor" },
    { type: "CHOOSE_BOOSTER", programId: "program-2", optionId: "2027:3:program-2:donor" },
    { type: "CHOOSE_BOOSTER", programId: "program-3", optionId: "2027:3:program-3:business" },
    { type: "CHOOSE_BOOSTER", programId: "program-4", optionId: "2027:3:program-4:legend-defense" }
  ]);
});

test("weekly business selection uses only one exact deeply frozen program view", () => {
  const state = activeLeague("weekly-business-shape");
  const views = weeklyBusinessPlanningKnowledgeViews(state);
  const view = weeklyBusinessPlanningKnowledgeView(state, "program-1", views);
  assert.deepEqual(Object.keys(view).sort(), [
    "atHome", "boosterOptions", "budget", "character", "facilities", "kind", "phase", "playingThisWeek",
    "programId", "season", "sponsorshipActive", "sponsorshipOffers", "week", "weeklyExpenses"
  ]);
  assert.equal(Object.isFrozen(views), true);
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.boosterOptions), true);
  assert.equal(Object.isFrozen(view.sponsorshipOffers), true);
  assert.equal(Object.isFrozen(view.facilities), true);
  assert.ok([...view.boosterOptions, ...view.sponsorshipOffers, ...view.facilities].every(Object.isFrozen));
  assert.ok(!JSON.stringify(view).match(/name|reward|amount|note|schedule|player|prospect|interest|rootSeed/i));
  assert.throws(() => { view.budget = 0; }, TypeError);

  const snapshot = weeklyBusinessPlanningKnowledgeSnapshot(state, "program-1", view);
  assert.equal(snapshot.facts[0].key, "weeklyBusinessPlanning.view.v1");
  assert.equal(snapshot.facts[0].source, "PROGRAM_INTERNAL");
  assert.deepEqual(JSON.parse(snapshot.facts[0].value), view);

  const stale = structuredClone(state);
  stale.week += 1;
  assert.throws(() => planWeeklyCommands(stale, undefined, views), /stale for the current simulation boundary/);
  assert.throws(() => weeklyBusinessPlanningKnowledgeSnapshot(state, "program-2", view), /belong to the command program/);
});

test("hidden and unrelated league data cannot affect weekly business selection", () => {
  const state = activeLeague("weekly-business-hidden");
  const expected = weeklyBusinessPlanningKnowledgeView(state, "program-1");
  const changed = structuredClone(state);
  for (const player of Object.values(changed.players)) {
    player.overall = player.overall > 60 ? 20 : 99;
    player.potential = player.potential > 60 ? 20 : 99;
  }
  for (const prospect of Object.values(changed.prospects)) prospect.potential = 1;
  for (const program of Object.values(changed.programs)) {
    if (program.id !== "program-1") {
      program.budget *= -10;
      program.weeklyExpenses *= 10;
    }
  }
  for (const game of changed.schedule) if (game.week !== changed.week) game.played = !game.played;
  for (const option of changed.boosters?.["program-1"]?.offer?.options ?? []) {
    option.name = "redacted mutation";
    option.reward = "redacted reward";
    option.amount = 999999;
  }
  const redacted = weeklyBusinessPlanningKnowledgeView(changed, "program-1");
  assert.deepEqual(redacted, expected);
  assert.deepEqual([
    ...selectBoosterChoice(redacted), ...selectSponsorship(redacted), ...selectFacilityUpgrade(redacted)
  ], [...selectBoosterChoice(expected), ...selectSponsorship(expected), ...selectFacilityUpgrade(expected)]);
});

test("weekly business selectors preserve V1 thresholds, tie breaks, and declared sensitivities", () => {
  const base = {
    kind: "WEEKLY_BUSINESS_PLANNING_KNOWLEDGE_V1", programId: "program-1", season: 2027, week: 1,
    phase: "REGULAR_SEASON", budget: 2_000_000, weeklyExpenses: 100_000, character: "DIEHARD",
    playingThisWeek: false, atHome: false,
    boosterOptions: [
      { id: "b", kind: "LOCAL_BUSINESS", chance: 100 },
      { id: "a", kind: "TURNOVER_LEGEND", chance: 100 },
      { id: "donor", kind: "DONOR", chance: 60 }
    ],
    sponsorshipActive: false,
    sponsorshipOffers: [
      { id: "guaranteed", strategy: "GUARANTEED" }, { id: "winning", strategy: "WINNING" },
      { id: "crowd", strategy: "HOME_CROWD" }
    ],
    facilities: [{ facility: "TRAINING", level: 2 }, { facility: "ACADEMICS", level: 2 }]
  };
  assert.equal(selectBoosterChoice(base)[0].optionId, "donor");
  const lowerDonorOdds = base.boosterOptions.map((option) => option.id === "donor" ? { ...option, chance: 50 } : option);
  assert.equal(selectBoosterChoice({ ...base, atHome: true, boosterOptions: lowerDonorOdds })[0].optionId, "b");
  assert.equal(selectBoosterChoice({ ...base, playingThisWeek: true, boosterOptions: lowerDonorOdds })[0].optionId, "a");
  assert.equal(selectBoosterChoice({ ...base, budget: 0 })[0].optionId, "donor");
  assert.equal(selectBoosterChoice({ ...base, boosterOptions: [
    { id: "b", kind: "POSITION_LEGEND", chance: 50 },
    { id: "a", kind: "POSITION_LEGEND", chance: 50 }
  ] })[0].optionId, "a", "equal expected values break by stable option id");
  assert.deepEqual(selectBoosterChoice({ ...base, boosterOptions: [] }), []);
  assert.equal(selectSponsorship(base)[0].offerId, "guaranteed");
  assert.equal(selectSponsorship({ ...base, character: "BLUEBLOOD" })[0].offerId, "winning");
  assert.equal(selectSponsorship({ ...base, character: "FRONTRUNNER" })[0].offerId, "crowd");
  assert.deepEqual(selectSponsorship({ ...base, sponsorshipActive: true }), []);
  assert.deepEqual(selectSponsorship({ ...base, sponsorshipOffers: [] }), []);
  assert.equal(selectFacilityUpgrade(base)[0].facility, "ACADEMICS");
  assert.deepEqual(selectFacilityUpgrade({ ...base, budget: 949_999 }), []);
  assert.equal(selectFacilityUpgrade({ ...base, budget: 950_000 })[0].facility, "ACADEMICS");
  assert.deepEqual(selectFacilityUpgrade({ ...base, week: 2 }), []);
  assert.deepEqual(selectFacilityUpgrade({ ...base, facilities: [{ facility: "ACADEMICS", level: 5 }] }), []);
});

test("weekly business plans are canonical commands and are never rejected", () => {
  for (const count of [24, 72]) {
    const state = activeLeague(`weekly-business-canonical-${count}`, count);
    const result = advanceWeek(state, planWeeklyCommands(state));
    assert.ok(!result.events.some((event) => event.type === "COMMAND_REJECTED" && businessCommands([event.command]).length));
  }
});

test("portal AI preserves the established deterministic V1 bids", () => {
  // Re-baselined with the derived economy. Programs now reach the portal
  // holding different budgets than the frozen constants left them with, which
  // moves the donor capacity a rival can commit and therefore which players it
  // chases. The selector itself is unchanged.
  const state = portalWindow("portal-view-0");
  const expected = [
    { type: "BID_PORTAL_PLAYER", programId: "program-1", playerId: "program-1-player-14", points: 12, weeklyNil: 500 },
    { type: "BID_PORTAL_PLAYER", programId: "program-2", playerId: "program-2-player-30", points: 12, weeklyNil: 1950 },
    { type: "BID_PORTAL_PLAYER", programId: "program-3", playerId: "program-2-player-30", points: 13, weeklyNil: 1950 },
    { type: "BID_PORTAL_PLAYER", programId: "program-4", playerId: "program-2-player-30", points: 20, weeklyNil: 1950 },
    { type: "BID_PORTAL_PLAYER", programId: "program-4", playerId: "program-1-player-14", points: 20, weeklyNil: 500 },
    { type: "BID_PORTAL_PLAYER", programId: "program-4", playerId: "program-1-player-34", points: 20, weeklyNil: 350 }
  ];
  const views = portalPlanningKnowledgeViews(state);
  assert.deepEqual(planOffseasonCommands(state, undefined, views), expected);
  assert.deepEqual(Object.values(views).flatMap(selectPortalBids), expected);
});

test("the portal selector receives only an exact deeply frozen program view", () => {
  const state = portalWindow("portal-view-0");
  const views = portalPlanningKnowledgeViews(state);
  const view = portalPlanningKnowledgeView(state, "program-1", views);
  assert.deepEqual(Object.keys(view).sort(), [
    "freeWeeklyNilCapacity", "kind", "offseasonStep", "phase", "programId", "projectedOpenings",
    "recruitingPoints", "season", "targets", "week"
  ]);
  assert.equal(view.kind, "PORTAL_PLANNING_KNOWLEDGE_V1");
  assert.equal(Object.isFrozen(views), true);
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.targets), true);
  assert.ok(view.targets.every(Object.isFrozen));
  assert.deepEqual(Object.keys(view.targets[0]).sort(), [
    "askingPrice", "maximumBidPoints", "playerId", "targetValue"
  ]);
  assert.ok(!JSON.stringify(view).match(/interestByProgram|bidsByProgram|potential|ratings|priorities|rootSeed/i));
  assert.throws(() => { view.recruitingPoints = 0; }, TypeError);
  assert.throws(() => { view.targets[0].targetValue = 0; }, TypeError);

  const snapshot = portalPlanningKnowledgeSnapshot(state, "program-1", view);
  assert.equal(snapshot.facts.length, 1);
  assert.equal(snapshot.facts[0].key, "portalPlanning.view.v1");
  assert.equal(snapshot.facts[0].source, "STAFF_ESTIMATE");
  assert.deepEqual(JSON.parse(snapshot.facts[0].value), view);

  const staleState = structuredClone(state);
  staleState.week += 1;
  assert.throws(() => planOffseasonCommands(staleState, undefined, views), /stale for the current offseason boundary/);
  assert.throws(() => portalPlanningKnowledgeSnapshot(staleState, "program-1", view), /stale for the current offseason boundary/);
  assert.throws(() => portalPlanningKnowledgeSnapshot(state, "program-2", view), /belong to the command program/);
});

test("private rival and hidden player data cannot affect portal selection", () => {
  const state = portalWindow("portal-view-0");
  const programId = "program-1";
  const expected = portalPlanningKnowledgeView(state, programId);
  const changed = structuredClone(state);
  for (const listing of Object.values(changed.portal ?? {})) {
    for (const rivalId of Object.keys(listing.interestByProgram)) {
      if (rivalId !== programId) listing.interestByProgram[rivalId] = listing.interestByProgram[rivalId] > 50 ? 0 : 100;
    }
    listing.priorities.reverse();
    listing.bidsByProgram = Object.fromEntries(Object.keys(changed.programs)
      .filter((id) => id !== programId)
      .map((id) => [id, { points: 99, weeklyNil: 999_999 }]));
  }
  for (const player of Object.values(changed.players)) {
    player.potential = player.potential > 80 ? 40 : 99;
    player.workEthic = player.workEthic > 50 ? 0 : 100;
    player.stardom = player.stardom > 50 ? 0 : 100;
    for (const key of Object.keys(player.ratings)) player.ratings[key] = player.ratings[key] > 50 ? 0 : 100;
  }
  for (const program of Object.values(changed.programs)) {
    if (program.id !== programId) {
      program.budget *= -10;
      program.fanBase *= 10;
      program.prestige = 0;
    }
  }
  const redacted = portalPlanningKnowledgeView(changed, programId);
  assert.deepEqual(redacted, expected);
  assert.deepEqual(selectPortalBids(redacted), selectPortalBids(expected));

  const ownInterest = structuredClone(state);
  const firstListing = Object.values(ownInterest.portal ?? {})[0];
  firstListing.interestByProgram[programId] += 10;
  assert.notDeepEqual(portalPlanningKnowledgeView(ownInterest, programId), expected,
    "the program's own projected target value remains a permitted V1 staff estimate");
});

test("portal selection preserves all V1 thresholds, ordering, and local budgets", () => {
  const base = {
    kind: "PORTAL_PLANNING_KNOWLEDGE_V1",
    programId: "program-1",
    season: 2027,
    week: 0,
    phase: "OFFSEASON",
    offseasonStep: "PORTAL",
    projectedOpenings: 3,
    recruitingPoints: 55,
    freeWeeklyNilCapacity: 1300,
    targets: [
      { playerId: "player-b", targetValue: 80, askingPrice: 1000, maximumBidPoints: 20 },
      { playerId: "player-a", targetValue: 80, askingPrice: 1000, maximumBidPoints: 30 },
      { playerId: "player-c", targetValue: 60, askingPrice: 1000, maximumBidPoints: 20 },
      { playerId: "player-d", targetValue: 59.999, askingPrice: 100, maximumBidPoints: 20 }
    ]
  };
  assert.deepEqual(selectPortalBids(base), [
    { type: "BID_PORTAL_PLAYER", programId: "program-1", playerId: "player-a", points: 30, weeklyNil: 1000 },
    { type: "BID_PORTAL_PLAYER", programId: "program-1", playerId: "player-b", points: 20, weeklyNil: 300 },
    { type: "BID_PORTAL_PLAYER", programId: "program-1", playerId: "player-c", points: 5, weeklyNil: 0 }
  ]);
  assert.deepEqual(selectPortalBids({ ...base, projectedOpenings: 0 }), []);
  assert.deepEqual(selectPortalBids({ ...base, recruitingPoints: 4 }), []);
  assert.equal(selectPortalBids({ ...base, freeWeeklyNilCapacity: 299 }).at(0).weeklyNil, 0,
    "less than 30 percent of ask emits no NIL");
  assert.equal(selectPortalBids({ ...base, freeWeeklyNilCapacity: 326 }).at(0).weeklyNil, 350,
    "the accepted raw capacity is rounded to the nearest fifty exactly as V1 did");
  assert.equal(selectPortalBids({ ...base, projectedOpenings: 20 }).length, 3, "V1 never chases more than three targets");
});
