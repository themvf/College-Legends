import test from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, AddressableRng, beginSeason, createFictionalLeague, marqueeGameOptions, PLAYER_STAT_BANDS, projectedRecruitingOpenings, prospectScoutingReport, recruitingWeeklyPoints, ROSTER_COMPOSITION, seasonAwardRace, STARTING_ROSTER_SIZE } from "../packages/simulation/dist/index.js";
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
  const prospectId = state.recruiting["program-1"].discoveredProspectIds[0];
  assert.ok(prospectId);
  state.recruiting["program-4"].discoveredProspectIds.push(prospectId);
  state.recruiting["program-4"].scoutingByProspect[prospectId] = { evaluations: [], pursuitPoints: 0 };
  const commands = [
    { type: "INVEST_RECRUITING_POINTS", programId: "program-1", prospectId, points: 20 },
    { type: "INVEST_RECRUITING_POINTS", programId: "program-4", prospectId, points: 20 },
  ];
  const forward = advanceWeek(state, commands);
  const reversed = advanceWeek(state, [...commands].reverse());
  assert.deepEqual(forward, reversed);
  assert.equal(forward.events.filter((event) => event.type === "RECRUITING_INVESTMENT").length, 2);
});

test("a commitment waits until offseason departures before the freshman enrolls", () => {
  let state = activeLeague("recruiting-sign", 4);
  const programId = "program-2";
  const prospectId = state.recruiting[programId].discoveredProspectIds[0];
  assert.ok(prospectId);
  state.recruiting[programId].scoutingByProspect[prospectId].pursuitPoints = 100;
  const openingSeason = state.season;
  let result = advanceWeek(state);
  state = result.state;
  const commitment = result.events.find((event) => event.type === "PROSPECT_COMMITTED" && event.prospectId === prospectId);
  assert.ok(commitment);
  assert.equal(state.prospects[prospectId].status, "COMMITTED");
  assert.equal(state.players[`player:${prospectId}`], undefined);
  while (state.season === openingSeason) {
    result = advanceWeek(state);
    state = result.state;
  }
  assert.equal(state.prospects[prospectId].status, "ENROLLED");
  assert.equal(state.players[`player:${prospectId}`].programId, programId);
  assert.ok(result.events.some((event) => event.type === "PROSPECT_ENROLLED" && event.prospectId === prospectId));
});

test("one Recruiting Point budget pays for both information and pursuit", () => {
  const state = activeLeague("recruiting-shared-budget", 4);
  const programId = "program-1";
  const prospectId = state.recruiting[programId].discoveredProspectIds[0];
  const prospect = state.prospects[prospectId];
  assert.ok(prospect);
  const before = prospectScoutingReport(state, programId, prospect);
  assert.equal(before.overall, "Unknown");
  assert.equal(before.potential, "Unknown");
  const openingPoints = state.recruiting[programId].points;
  const result = advanceWeek(state, [
    { type: "EVALUATE_PROSPECT", programId, prospectId, evaluation: "BASIC" },
    { type: "INVEST_RECRUITING_POINTS", programId, prospectId, points: 10 }
  ]);
  const report = prospectScoutingReport(result.state, programId, result.state.prospects[prospectId]);
  const replenishment = result.events.find((event) => event.type === "RECRUITING_POINTS_ADDED" && event.programId === programId);
  assert.ok(replenishment);
  assert.match(report.overall, /^\d+–\d+$/);
  assert.equal(report.potential, "Unknown");
  assert.equal(report.pursuitPoints, 10);
  assert.equal(result.state.recruiting[programId].points, Math.min(120, openingPoints - 15 + replenishment.pointsAdded));
});

test("scouting searches unlock a limited set of new prospects", () => {
  const state = activeLeague("recruiting-search", 12);
  const programId = "program-1";
  const before = new Set(state.recruiting[programId].discoveredProspectIds);
  const result = advanceWeek(state, [{ type: "SEARCH_PROSPECTS", programId, searchType: "SLEEPERS" }]);
  const discovery = result.events.find((event) => event.type === "PROSPECTS_DISCOVERED" && event.programId === programId);
  assert.ok(discovery);
  assert.ok(discovery.prospectIds.length > 0 && discovery.prospectIds.length <= 6);
  assert.ok(discovery.prospectIds.every((prospectId) => !before.has(prospectId)));
  assert.ok(discovery.prospectIds.every((prospectId) => result.state.recruiting[programId].scoutingByProspect[prospectId]));
});

test("AI recruiting respects scholarship limits and receives a new annual cohort", () => {
  let state = activeLeague("recruiting-cycle", 4);
  const startingProspectCount = Object.keys(state.prospects).length;
  const firstSeason = state.season;
  const openingPlan = planWeeklyCommands(state);
  for (const program of Object.values(state.programs)) {
    assert.equal(openingPlan.filter((command) => command.programId === program.id && command.type === "SET_DEVELOPMENT_SPOTLIGHT").length, 1);
    assert.equal(openingPlan.filter((command) => command.programId === program.id && command.type === "SET_PLAYER_MEDIA_ACTION").length, 1);
  }
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
    { type: "SET_DEVELOPMENT_SPOTLIGHT", programId: "program-1", target: { type: "PLAYER", playerId: player.id }, focus: "STRENGTH" },
    { type: "ASSIGN_STAFF", programId: "program-1", staffId: staff.id, assignment: "PLAYER_DEVELOPMENT" }
  ]);
  assert.equal(result.state.players[player.id].developmentFocus, "STRENGTH");
  assert.equal(result.state.staff[staff.id].assignment, "PLAYER_DEVELOPMENT");
  assert.ok(result.events.some((event) => event.type === "DEVELOPMENT_SPOTLIGHT_SET"));
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

test("the selected depth chart determines starters and injured players promote backups", () => {
  const state = activeLeague("functional-depth-chart", 4);
  const programId = "program-1";
  const quarterbacks = state.depthCharts[programId].QB;
  assert.equal(quarterbacks.length, 4);
  const selectedStarter = quarterbacks.at(-1);
  assert.ok(selectedStarter);
  const reordered = [selectedStarter, ...quarterbacks.filter((playerId) => playerId !== selectedStarter)];
  let result = advanceWeek(state, [{ type: "SET_DEPTH_CHART", programId, position: "QB", playerIds: reordered }]);
  const selectedLine = result.state.playerGameStats.find((line) => line.season === state.season && line.week === 1 && line.playerId === selectedStarter);
  assert.ok(selectedLine?.started);
  assert.equal(result.state.playerGameStats.some((line) => line.season === state.season && line.week === 1 && line.playerId === quarterbacks[0]), false);

  const injuredState = activeLeague("depth-chart-injury", 4);
  const injuredStarter = injuredState.depthCharts[programId].QB[0];
  const promotedBackup = injuredState.depthCharts[programId].QB[1];
  injuredState.players[injuredStarter].injuryWeeksRemaining = 3;
  result = advanceWeek(injuredState);
  assert.equal(result.state.playerGameStats.some((line) => line.week === 1 && line.playerId === injuredStarter), false);
  assert.ok(result.state.playerGameStats.some((line) => line.week === 1 && line.playerId === promotedBackup));
});

test("a redshirted player does not play and preserves a season of eligibility", () => {
  let state = activeLeague("real-redshirt-season", 4);
  const player = Object.values(state.players).find((candidate) => candidate.programId === "program-1" && candidate.eligibility.redshirtStatus === "AVAILABLE");
  assert.ok(player);
  const openingSeason = state.season;
  const openingEligibility = player.eligibility.seasonsRemaining;
  let result = advanceWeek(state, [{ type: "SET_REDSHIRT", programId: "program-1", playerId: player.id, enabled: true }]);
  state = result.state;
  while (state.season === openingSeason) {
    result = advanceWeek(state);
    state = result.state;
  }
  assert.equal(state.players[player.id].eligibility.seasonsRemaining, openingEligibility);
  assert.equal(state.players[player.id].eligibility.redshirtStatus, "USED");
  assert.equal(state.playerGameStats.some((line) => line.season === openingSeason && line.playerId === player.id), false);
});

test("weekly player statistics use plausible bands with real variance and persist as game logs", () => {
  let state = activeLeague("historical-stat-bands", 12);
  const season = state.season;
  while (state.season === season) state = advanceWeek(state).state;
  const quarterbackLines = state.playerGameStats.filter((line) => line.season === season && line.position === "QB");
  assert.ok(quarterbackLines.length >= 90);
  assert.ok(quarterbackLines.every((line) => line.passingAttempts >= PLAYER_STAT_BANDS.qbAttempts.minimum && line.passingAttempts <= PLAYER_STAT_BANDS.qbAttempts.maximum));
  const attempts = quarterbackLines.map((line) => line.passingAttempts);
  const mean = attempts.reduce((sum, value) => sum + value, 0) / attempts.length;
  const standardDeviation = Math.sqrt(attempts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / attempts.length);
  assert.ok(mean >= 25 && mean <= 37);
  assert.ok(standardDeviation >= 4 && standardDeviation <= 10);
  assert.ok(quarterbackLines.every((line) => line.id && line.gameId && line.opponentProgramId && line.gameRating >= 25 && line.gameRating <= 99));
  assert.ok(state.playerGameStats.every((line) =>
    line.passingCompletions <= line.passingAttempts
    && line.receptions <= line.targets
    && line.fieldGoalsMade <= line.fieldGoalsAttempted
  ));
});

test("live national award races are driven by recorded production and explain their ballot scores", () => {
  let state = activeLeague("live-award-races", 12);
  for (let week = 0; week < 7; week += 1) state = advanceWeek(state).state;
  const playerRace = seasonAwardRace(state, "PLAYER_OF_THE_YEAR");
  const offensiveRace = seasonAwardRace(state, "OFFENSIVE_PLAYER_OF_THE_YEAR");
  const defensiveRace = seasonAwardRace(state, "DEFENSIVE_PLAYER_OF_THE_YEAR");
  const freshmanRace = seasonAwardRace(state, "FRESHMAN_OF_THE_YEAR");
  const coachRace = seasonAwardRace(state, "COACH_OF_THE_YEAR");
  assert.ok(playerRace.length > 0 && offensiveRace.length > 0 && defensiveRace.length > 0 && freshmanRace.length > 0 && coachRace.length > 0);
  assert.ok(playerRace.every((candidate, index) => index === 0 || playerRace[index - 1].score >= candidate.score));
  assert.ok(offensiveRace.every((candidate) => ["QB", "RB", "WR", "TE", "OL"].includes(state.players[candidate.playerId].position)));
  assert.ok(defensiveRace.every((candidate) => ["DL", "LB", "DB"].includes(state.players[candidate.playerId].position)));
  assert.ok(freshmanRace.every((candidate) => state.players[candidate.playerId].eligibility.seasonsParticipated === 0));
  assert.ok(coachRace.every((candidate) => state.staff[candidate.staffId].role === "HEAD_COACH"));
  assert.equal(playerRace[0].evidence.length, 3);
  assert.ok(playerRace[0].productionScore >= 0 && playerRace[0].productionScore <= 100);
});

test("the season crowns six division champions, resolves a 12-team playoff, and preserves every honor", () => {
  let state = activeLeague("complete-honors-postseason", 72);
  const season = state.season;
  let finalEvents = [];
  while (state.season === season) {
    const result = advanceWeek(state);
    state = result.state;
    finalEvents = result.events;
  }
  const history = state.seasonHistory.find((item) => item.season === season);
  assert.ok(history);
  assert.equal(Object.keys(history.divisionChampions).length, 6);
  assert.equal(new Set(Object.values(history.divisionChampions)).size, 6);
  assert.equal(history.playoffSeeds.length, 12);
  assert.equal(history.postseasonGames.length, 11);
  assert.equal(history.postseasonGames.filter((game) => game.round === "FIRST_ROUND").length, 4);
  assert.equal(history.postseasonGames.filter((game) => game.round === "QUARTERFINAL").length, 4);
  assert.equal(history.postseasonGames.filter((game) => game.round === "SEMIFINAL").length, 2);
  assert.equal(history.postseasonGames.filter((game) => game.round === "NATIONAL_CHAMPIONSHIP").length, 1);
  assert.equal(history.awards.length, 5);
  assert.deepEqual(new Set(history.awards.map((award) => award.type)), new Set([
    "PLAYER_OF_THE_YEAR",
    "OFFENSIVE_PLAYER_OF_THE_YEAR",
    "DEFENSIVE_PLAYER_OF_THE_YEAR",
    "FRESHMAN_OF_THE_YEAR",
    "COACH_OF_THE_YEAR"
  ]));
  assert.equal(state.programs[history.nationalChampionProgramId].championships, 1);
  assert.equal(state.programs[history.nationalChampionProgramId].nationalRank, 1);
  assert.ok(history.finalRecords[history.nationalChampionProgramId].wins + history.finalRecords[history.nationalChampionProgramId].losses >= 15);
  assert.ok(finalEvents.some((event) => event.type === "NATIONAL_CHAMPION_CROWNED"));
  assert.equal(finalEvents.filter((event) => event.type === "DIVISION_TITLE_WON").length, 6);
  assert.equal(finalEvents.filter((event) => event.type === "SEASON_AWARD_FINALIZED").length, 5);
  const coachAward = history.awards.find((award) => award.type === "COACH_OF_THE_YEAR");
  assert.equal(state.staff[coachAward.winner.staffId].role, "HEAD_COACH");
});

test("training choices create distinct permanent attributes and injury-prevention payoffs", () => {
  const strengthState = activeLeague("training-payoffs", 4);
  const conditioningState = structuredClone(strengthState);
  const player = Object.values(strengthState.players).find((candidate) => candidate.programId === "program-1" && candidate.position === "QB");
  assert.ok(player);
  const before = structuredClone(player.ratings);
  const strength = advanceWeek(strengthState, [{ type: "SET_DEVELOPMENT_SPOTLIGHT", programId: "program-1", target: { type: "PLAYER", playerId: player.id }, focus: "STRENGTH" }]);
  const conditioning = advanceWeek(conditioningState, [{ type: "SET_DEVELOPMENT_SPOTLIGHT", programId: "program-1", target: { type: "PLAYER", playerId: player.id }, focus: "CONDITIONING" }]);
  assert.ok(strength.state.players[player.id].ratings.armStrength > before.armStrength);
  assert.ok(strength.state.players[player.id].ratings.strength > conditioning.state.players[player.id].ratings.strength);
  assert.ok(conditioning.state.players[player.id].ratings.injuryPrevention > strength.state.players[player.id].ratings.injuryPrevention);
  assert.ok(conditioning.state.players[player.id].fatigue < strength.state.players[player.id].fatigue);
});

test("one weekly development spotlight supports a full-intensity player or diluted position room", () => {
  const individualState = activeLeague("development-spotlight-scope", 4);
  const groupState = structuredClone(individualState);
  const quarterbacks = Object.values(individualState.players).filter((player) => player.programId === "program-1" && player.position === "QB");
  const target = quarterbacks[0];
  assert.ok(target && quarterbacks.length > 1);
  const before = target.ratings.technique;
  const individual = advanceWeek(individualState, [{
    type: "SET_DEVELOPMENT_SPOTLIGHT",
    programId: "program-1",
    target: { type: "PLAYER", playerId: target.id },
    focus: "TECHNIQUE"
  }]);
  const group = advanceWeek(groupState, [{
    type: "SET_DEVELOPMENT_SPOTLIGHT",
    programId: "program-1",
    target: { type: "POSITION", position: "QB" },
    focus: "TECHNIQUE"
  }]);
  const individualGain = individual.state.players[target.id].ratings.technique - before;
  const groupGain = group.state.players[target.id].ratings.technique - before;
  assert.ok(individualGain > groupGain);
  assert.ok(group.state.players[quarterbacks[1].id].ratings.technique > quarterbacks[1].ratings.technique);
  const spotlight = group.events.find((event) => event.type === "DEVELOPMENT_SPOTLIGHT_SET");
  assert.ok(spotlight);
  assert.equal(spotlight.intensity, 0.55);
  assert.equal(spotlight.playerIds.length, quarterbacks.length);
});

test("recovery assignments lower fatigue and recruiting staff and facilities generate more points", () => {
  const base = activeLeague("staff-facility-payoffs", 4);
  const player = Object.values(base.players).find((candidate) => candidate.programId === "program-1");
  const coach = Object.values(base.staff).find((candidate) => candidate.programId === "program-1");
  assert.ok(player && coach);
  player.fatigue = 20;
  const noRecovery = advanceWeek(base);
  const recovery = advanceWeek(base, [{ type: "ASSIGN_STAFF", programId: "program-1", staffId: coach.id, assignment: "RECOVERY" }]);
  assert.ok(recovery.state.players[player.id].fatigue < noRecovery.state.players[player.id].fatigue);

  const basicRecruiting = activeLeague("recruiting-investment", 4);
  const investedRecruiting = structuredClone(basicRecruiting);
  basicRecruiting.programs["program-1"].facilities.RECRUITING = 1;
  investedRecruiting.programs["program-1"].facilities.RECRUITING = 5;
  const basicPoints = recruitingWeeklyPoints(basicRecruiting, "program-1");
  const investedPoints = recruitingWeeklyPoints(investedRecruiting, "program-1");
  assert.equal(investedPoints - basicPoints, 16);
  const recruiter = Object.values(investedRecruiting.staff).find((candidate) => candidate.programId === "program-1");
  assert.ok(recruiter);
  recruiter.assignment = "RECRUITING";
  assert.ok(recruitingWeeklyPoints(investedRecruiting, "program-1") > investedPoints);
  assert.ok(projectedRecruitingOpenings(investedRecruiting, "program-1") > 0);
});

test("stadium levels directly increase home-game revenue", () => {
  const levelOne = activeLeague("stadium-payoff", 4);
  const homeProgramId = levelOne.schedule.find((game) => game.week === 1).homeProgramId;
  const levelFive = structuredClone(levelOne);
  levelOne.programs[homeProgramId].facilities.STADIUM = 1;
  levelFive.programs[homeProgramId].facilities.STADIUM = 5;
  const lowFinance = advanceWeek(levelOne).events.find((event) => event.type === "WEEKLY_FINANCES" && event.programId === homeProgramId);
  const highFinance = advanceWeek(levelFive).events.find((event) => event.type === "WEEKLY_FINANCES" && event.programId === homeProgramId);
  assert.ok(lowFinance && highFinance);
  assert.ok(highFinance.revenue > lowFinance.revenue);
});

test("weekly recaps connect results to fans, attendance, press, and game-day revenue", () => {
  const state = activeLeague("weekly-recap-loop", 12);
  const result = advanceWeek(state);
  const recaps = result.events.filter((event) => event.type === "WEEKLY_RECAP");
  assert.equal(recaps.length, Object.keys(state.programs).length);
  const homeRecap = recaps.find((recap) => recap.homeGame);
  assert.ok(homeRecap);
  assert.ok(homeRecap.attendance > 0 && homeRecap.attendance <= homeRecap.capacity);
  assert.ok(homeRecap.ticketRevenue > 0);
  assert.ok(homeRecap.concessionRevenue > 0);
  const matchupPlayerStats = result.state.playerGameStats.filter((line) =>
    line.season === homeRecap.season
    && line.week === homeRecap.week
    && [homeRecap.programId, homeRecap.opponentProgramId].includes(line.programId)
  );
  assert.ok(matchupPlayerStats.some((line) => line.programId === homeRecap.programId));
  assert.ok(matchupPlayerStats.some((line) => line.programId === homeRecap.opponentProgramId));
  for (const recap of recaps.filter((item) => item.result !== "BYE")) {
    assert.equal(Math.sign(recap.teamResultFanChange), recap.result === "WIN" ? 1 : -1);
    assert.equal(Math.sign(recap.localPressChange), recap.result === "WIN" ? 1 : -1);
  }
});

test("individual game performances grow player stardom and feed school fans", () => {
  const state = activeLeague("player-stardom-loop", 12);
  const programId = "program-1";
  const game = state.schedule.find((item) => item.week === 1 && (item.homeProgramId === programId || item.awayProgramId === programId));
  assert.ok(game);
  const opponentId = game.homeProgramId === programId ? game.awayProgramId : game.homeProgramId;
  for (const player of Object.values(state.players)) {
    if (player.programId === programId) {
      player.overall = 99;
      for (const rating of Object.keys(player.ratings)) player.ratings[rating] = 99;
    } else if (player.programId === opponentId) {
      player.overall = 40;
      for (const rating of Object.keys(player.ratings)) player.ratings[rating] = 40;
    }
  }
  const result = advanceWeek(state);
  const breakout = result.events.find((event) => event.type === "PLAYER_BRAND_UPDATED" && event.programId === programId);
  const recap = result.events.find((event) => event.type === "WEEKLY_RECAP" && event.programId === programId);
  assert.ok(breakout && recap);
  assert.ok(breakout.gameRating >= 74);
  assert.ok(breakout.personalFanChange > 0);
  assert.ok(breakout.stardomAfter > breakout.stardomBefore);
  assert.ok(breakout.schoolFanLift > 0);
  assert.ok(recap.playerFanLift > 0);
  assert.equal(recap.fanChange, recap.teamResultFanChange + recap.playerFanLift);
  assert.equal(recap.featuredPlayerId, breakout.playerId);
});

test("social media builds a reserve player's brand and converts some fans to the school", () => {
  const state = activeLeague("player-media-payoff", 12);
  const programId = "program-1";
  const reserve = Object.values(state.players)
    .filter((player) => player.programId === programId && player.position === "QB")
    .sort((left, right) => left.overall - right.overall)[0];
  assert.ok(reserve);
  const fansBefore = reserve.personalFans;
  const stardomBefore = reserve.stardom;
  const expectedPersonalFans = Math.round(1_400 + fansBefore * 0.02);
  const result = advanceWeek(state, [{ type: "SET_PLAYER_MEDIA_ACTION", programId, playerId: reserve.id, action: "SOCIAL_MEDIA" }]);
  const brand = result.events.find((event) => event.type === "PLAYER_BRAND_UPDATED" && event.playerId === reserve.id);
  const recap = result.events.find((event) => event.type === "WEEKLY_RECAP" && event.programId === programId);
  assert.ok(brand && recap);
  assert.equal(brand.gameRating, null);
  assert.equal(brand.mediaAction, "SOCIAL_MEDIA");
  assert.equal(brand.personalFanChange, expectedPersonalFans);
  assert.equal(brand.stardomAfter, stardomBefore + 3);
  assert.equal(brand.schoolFanLift, Math.round(expectedPersonalFans * 0.15));
  assert.ok(recap.playerFanLift >= brand.schoolFanLift);
  assert.equal(result.state.players[reserve.id].mediaAction, "FOOTBALL_FOCUS");
});

test("a program can feature only one player in the media each week", () => {
  const state = activeLeague("single-featured-player", 12);
  const players = Object.values(state.players).filter((player) => player.programId === "program-1").slice(0, 2);
  assert.equal(players.length, 2);
  const result = advanceWeek(state, [
    { type: "SET_PLAYER_MEDIA_ACTION", programId: "program-1", playerId: players[0].id, action: "SOCIAL_MEDIA" },
    { type: "SET_PLAYER_MEDIA_ACTION", programId: "program-1", playerId: players[1].id, action: "COMMUNITY_APPEARANCE" }
  ]);
  const campaigns = result.events.filter((event) =>
    event.type === "PLAYER_BRAND_UPDATED"
    && event.programId === "program-1"
    && event.mediaAction !== "FOOTBALL_FOCUS"
  );
  assert.equal(campaigns.length, 1);
  assert.ok(result.events.some((event) => event.type === "COMMAND_REJECTED" && /only one player/i.test(event.reason)));
});

test("a preseason guarantee buys a Top-25 home game with asymmetric recognition payoff", () => {
  const preseason = createFictionalLeague("marquee-upset");
  const host = Object.values(preseason.programs).find((program) => program.tier === "LOW");
  assert.ok(host);
  const option = marqueeGameOptions(preseason, host.id)[0];
  assert.ok(option);
  const openingBudget = host.budget;
  let state = beginSeason(preseason, [{ type: "SCHEDULE_MARQUEE_HOME_GAME", programId: host.id, opponentProgramId: option.opponentProgramId }]);
  const scheduled = state.eventHistory.find((event) => event.type === "MARQUEE_GAME_SCHEDULED" && event.programId === host.id);
  assert.ok(scheduled);
  assert.equal(state.programs[host.id].budget, openingBudget - option.guarantee);
  const marquee = state.schedule.find((game) => game.matchupType === "MARQUEE" && game.homeProgramId === host.id);
  assert.ok(marquee && marquee.awayProgramId === option.opponentProgramId);

  for (const player of Object.values(state.players)) {
    if (player.programId === host.id) {
      player.overall = 99;
      for (const rating of Object.keys(player.ratings)) player.ratings[rating] = 99;
    } else if (player.programId === option.opponentProgramId) {
      player.overall = 40;
      for (const rating of Object.keys(player.ratings)) player.ratings[rating] = 40;
    }
  }
  while (state.week <= marquee.week) {
    const result = advanceWeek(state);
    state = result.state;
    const recap = result.events.find((event) => event.type === "WEEKLY_RECAP" && event.programId === host.id && event.marqueeGame);
    if (!recap) continue;
    assert.equal(recap.result, "WIN");
    assert.ok(recap.nationalPressChange >= 20);
    assert.ok(recap.fanChange > Math.round(recap.fansBefore * 0.05));
    return;
  }
  assert.fail("Marquee game recap was not generated.");
});
