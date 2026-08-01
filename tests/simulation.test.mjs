import test from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, activeEmergencyQuarterback, activeSponsorship, AddressableRng, beginSeason, createFictionalLeague, currentInjury, marqueeGameOptions, playerInjuryRisk, prepareWeek, projectSponsorshipOffer, projectedRecruitingOpenings, prospectScoutingReport, recruitingWeeklyPoints, sponsorshipMarketValue, sponsorshipPayment, staffCapacity, computeOverall, schemePersonnel, schemeSpots, ROSTER_COMPOSITION, seasonAwardRace, planWeekHours, encodeSave, decodeSave, foldSeasonStats, boosterDueThisWeek, pendingBoosterOffer, advertisingCredit, takeawayMultiplier, TAKEAWAY_BOOST, STARTING_ROSTER_SIZE, weeklyStories } from "../packages/simulation/dist/index.js";
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

test("the chosen scheme decides which players enter the Saturday rotation", () => {
  const programId = "program-1";
  let state = createFictionalLeague("scheme-personnel", 24);
  state = prepareWeek(state, [{
    type: "SET_SCHEME",
    programId,
    scheme: { offense: "AIR_RAID", defense: "NICKEL_PRESSURE" }
  }]).state;
  state = beginSeason(state);

  let gameEvent;
  for (let week = 0; week < 3 && !gameEvent; week += 1) {
    const result = advanceWeek(state);
    state = result.state;
    gameEvent = result.events.find((event) =>
      event.type === "GAME_COMPLETED"
      && (event.homeProgramId === programId || event.awayProgramId === programId));
  }
  assert.ok(gameEvent, "the program needs a game to expose its active personnel");
  const lines = state.playerGameStats.filter((line) =>
    line.gameId === gameEvent.gameId && line.programId === programId);
  const count = (position) => lines.filter((line) => line.position === position).length;

  // Eleven on the field, and a rotation behind them. A real snap sheet shows six
  // receivers and eight defensive linemen taking snaps for four spots, so the
  // claim is about *spots* — how many of a room are out there on an average play
  // — not about a fixed set of starters.
  const program = state.programs[programId];
  const spots = schemeSpots(program.schemeIdentity);
  const onField = (positions) => positions.reduce((total, position) => total + (spots[position] ?? 0), 0);
  assert.equal(onField(["QB", "OL", "WR", "TE", "RB"]), 11, "the offense must field eleven");
  assert.equal(onField(["DL", "LB", "DB"]), 11, "the defense must field eleven");

  // An Air Raid asks for four receivers and no tight end at all; nickel asks for
  // a fifth defensive back. Those are the numbers the scheme exists to change.
  assert.equal(spots.WR, 4, "Air Raid puts four receivers on the field");
  assert.equal(spots.TE, 0, "a real Air Raid does not dress a tight end");
  assert.equal(spots.DB, 5, "nickel puts a fifth defensive back on the field");

  // And more men than that take snaps, because football has substitutions.
  assert.ok(count("WR") > spots.WR, `the receiver room must rotate, saw ${count("WR")} used for ${spots.WR} spots`);
  assert.ok(count("DL") > spots.DL, `the defensive line must rotate, saw ${count("DL")} used for ${spots.DL} spots`);
  assert.equal(count("TE"), 0, "a scheme that dresses no tight end must not give one snaps");
  assert.ok(count("QB") === 1, "the quarterback does not come off");
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
  // Rooms are shaped now, so the roster mean includes a long developmental tail
  // and sits well under the tier baseline by design. What has to hold is that the
  // guys who actually play are ordinary rather than terrible, and that the room
  // behind them has a real shape.
  const top = (position, count) => roster
    .filter((player) => player.position === position)
    .sort((left, right) => right.overall - left.overall)
    .slice(0, count);
  const grouping = {
    ...schemePersonnel("OFFENSE", lowProgram.schemeIdentity.offense),
    ...schemePersonnel("DEFENSE", lowProgram.schemeIdentity.defense)
  };
  const starters = Object.entries(grouping).flatMap(([position, count]) => top(position, count));
  const lineup = starters.reduce((sum, player) => sum + player.overall, 0) / starters.length;
  assert.ok(
    lineup >= 64 && lineup <= 72,
    `a low-tier starting lineup should be ordinary, saw ${lineup.toFixed(1)}`
  );
  const receivers = top("WR", 4).map((player) => player.overall);
  assert.ok(
    receivers[0] - receivers[3] >= 10,
    `WR1 to WR4 must be a real gap, saw ${(receivers[0] - receivers[3]).toFixed(1)}`
  );
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
  const capacity = staffCapacity(staff.rating, staff.trait);
  const result = advanceWeek(state, [
    { type: "SET_DEVELOPMENT_SPOTLIGHT", programId: "program-1", target: { type: "PLAYER", playerId: player.id }, focus: "STRENGTH" },
    { type: "SET_WEEK_FOCUS", programId: "program-1", focuses: ["DEVELOP"] }
  ]);
  assert.equal(result.state.players[player.id].developmentFocus, "STRENGTH");
  assert.ok(result.events.some((event) => event.type === "DEVELOPMENT_SPOTLIGHT_SET"));
  assert.ok(result.events.some((event) => event.type === "WEEK_FOCUS_SET"));
  assert.deepEqual(result.state.weekFocus["program-1"], ["DEVELOP"]);

  // A coach's hours are derived from the week's priorities, so reaching in to set
  // one man's week by hand is refused rather than silently overwritten. Two ways
  // to set the same number is how a posted payoff starts disagreeing with the
  // engine.
  const byHand = advanceWeek(state, [
    { type: "SET_STAFF_ALLOCATION", programId: "program-1", staffId: staff.id, allocation: { PREPARE: 0, SCOUT: 0, RECRUIT: 0, DEVELOP: capacity, RECOVER: 0 } }
  ]);
  assert.ok(byHand.events.some((event) => event.type === "COMMAND_REJECTED"));
  const byPool = advanceWeek(state, [{ type: "SET_WEEK_HOURS", programId: "program-1", focus: "SCOUT", hours: 10 }]);
  assert.ok(byPool.events.some((event) => event.type === "COMMAND_REJECTED"));
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

test("sponsorship offers turn reach into three exact risk-reward contracts", () => {
  const state = createFictionalLeague("sponsorship-market", 12);
  const programId = "program-1";
  const program = state.programs[programId];
  const sponsorship = state.sponsorships[programId];
  assert.ok(program && sponsorship);
  assert.deepEqual(
    sponsorship.offers.map((offer) => offer.strategy).sort(),
    ["GUARANTEED", "HOME_CROWD", "WINNING"]
  );
  const guaranteed = sponsorship.offers.find((offer) => offer.strategy === "GUARANTEED");
  const crowd = sponsorship.offers.find((offer) => offer.strategy === "HOME_CROWD");
  const winning = sponsorship.offers.find((offer) => offer.strategy === "WINNING");
  assert.ok(guaranteed && crowd && winning);
  assert.equal(guaranteed.weeklyPayment, sponsorshipMarketValue(program));
  assert.equal(guaranteed.homeAttendanceBonus + guaranteed.winBonus + guaranteed.rankedWinBonus, 0);
  assert.ok(crowd.weeklyPayment < guaranteed.weeklyPayment && crowd.homeAttendanceBonus > 0);
  assert.ok(winning.weeklyPayment < guaranteed.weeklyPayment && winning.winBonus > 0 && winning.rankedWinBonus > 0);

  const projection = projectSponsorshipOffer(state, programId, crowd);
  const remainingGames = state.schedule.filter((game) =>
    !game.played && (game.homeProgramId === programId || game.awayProgramId === programId));
  const remainingHomeGames = remainingGames.filter((game) => game.homeProgramId === programId);
  assert.equal(projection.remainingWeeks, 14);
  assert.equal(projection.remainingGames, remainingGames.length);
  assert.equal(projection.remainingHomeGames, remainingHomeGames.length);
  assert.equal(projection.guaranteedRemaining, crowd.weeklyPayment * 14);
  assert.equal(projection.maximumBonusRemaining, crowd.homeAttendanceBonus * projection.remainingHomeGames);
  assert.equal(projection.maximumRemaining, projection.guaranteedRemaining + projection.maximumBonusRemaining);
});

test("sponsorship bonuses pay only when their stated trigger happens", () => {
  const state = createFictionalLeague("sponsorship-triggers", 4);
  const offers = state.sponsorships["program-1"].offers;
  const crowd = offers.find((offer) => offer.strategy === "HOME_CROWD");
  const winning = offers.find((offer) => offer.strategy === "WINNING");
  assert.ok(crowd && winning);

  const almostFull = sponsorshipPayment(crowd, "WIN", true, 89_999, 100_000, 5);
  assert.equal(almostFull.total, crowd.weeklyPayment);
  const full = sponsorshipPayment(crowd, "LOSS", true, 90_000, 100_000, null);
  assert.equal(full.homeAttendanceBonus, crowd.homeAttendanceBonus);
  assert.equal(full.total, crowd.weeklyPayment + crowd.homeAttendanceBonus);

  const rankedWin = sponsorshipPayment(winning, "WIN", false, 0, 100_000, 12);
  assert.equal(rankedWin.winBonus, winning.winBonus);
  assert.equal(rankedWin.rankedWinBonus, winning.rankedWinBonus);
  assert.equal(rankedWin.total, winning.weeklyPayment + winning.winBonus + winning.rankedWinBonus);
  const loss = sponsorshipPayment(winning, "LOSS", false, 0, 100_000, 12);
  assert.equal(loss.total, winning.weeklyPayment);
});

test("a signed sponsor pays into the budget and cannot be replaced mid-season", () => {
  const preseason = createFictionalLeague("preseason-sponsorship", 4);
  const preseasonOffer = preseason.sponsorships["program-1"].offers[0];
  const started = beginSeason(preseason, [{ type: "ACCEPT_SPONSORSHIP", programId: "program-1", offerId: preseasonOffer.id }]);
  assert.equal(activeSponsorship(started, "program-1")?.id, preseasonOffer.id);
  assert.ok(started.eventHistory.some((event) => event.type === "SPONSORSHIP_ACCEPTED" && event.programId === "program-1"));

  const state = activeLeague("sponsorship-finances", 4);
  const programId = "program-1";
  const offer = state.sponsorships[programId].offers.find((candidate) => candidate.strategy === "GUARANTEED");
  assert.ok(offer);
  const openingBudget = state.programs[programId].budget;
  let result = advanceWeek(state, [{ type: "ACCEPT_SPONSORSHIP", programId, offerId: offer.id }]);
  const payment = result.events.find((event) => event.type === "SPONSORSHIP_PAYMENT" && event.programId === programId);
  const finance = result.events.find((event) => event.type === "WEEKLY_FINANCES" && event.programId === programId);
  const recap = result.events.find((event) => event.type === "WEEKLY_RECAP" && event.programId === programId);
  assert.ok(payment && finance && recap);
  assert.equal(activeSponsorship(result.state, programId)?.id, offer.id);
  assert.equal(payment.total, offer.weeklyPayment);
  assert.equal(finance.sponsorshipRevenue, offer.weeklyPayment);
  assert.equal(recap.sponsorshipRevenue, offer.weeklyPayment);
  assert.equal(result.state.programs[programId].budget, openingBudget + finance.net);

  const other = result.state.sponsorships[programId].offers.find((candidate) => candidate.id !== offer.id);
  assert.ok(other);
  result = advanceWeek(result.state, [{ type: "ACCEPT_SPONSORSHIP", programId, offerId: other.id }]);
  assert.equal(activeSponsorship(result.state, programId)?.id, offer.id);
  assert.ok(result.events.some((event) => event.type === "COMMAND_REJECTED" && /through the end of the season/i.test(event.reason)));
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

test("a one-week injury actually costs one game before the player recovers", () => {
  let state = activeLeague("one-week-injury", 4);
  const weekOneGame = state.schedule.find((game) => game.week === 1);
  assert.ok(weekOneGame);
  const programId = weekOneGame.homeProgramId;
  const starterId = state.depthCharts[programId].QB[0];
  const backupId = state.depthCharts[programId].QB[1];
  const starter = state.players[starterId];
  starter.injury = {
    name: "Ankle sprain",
    severity: "MINOR",
    weeksRemaining: 1,
    originalWeeks: 1,
    seasonEnding: false,
    occurredSeason: state.season,
    occurredWeek: 0
  };
  starter.injuryWeeksRemaining = 1;

  const result = advanceWeek(state);
  state = result.state;
  assert.equal(state.playerGameStats.some((line) => line.week === 1 && line.playerId === starterId), false);
  assert.ok(state.playerGameStats.some((line) => line.week === 1 && line.playerId === backupId));
  assert.equal(currentInjury(state.players[starterId]), null);
  assert.ok(result.events.some((event) =>
    event.type === "PLAYER_RECOVERED"
    && event.playerId === starterId
    && event.injuryName === "Ankle sprain"));
});

test("the strength coach lowers the exact injury roll used by the engine", () => {
  const state = activeLeague("visible-injury-prevention", 12);
  const programId = "program-1";
  const player = state.players[state.depthCharts[programId].RB[0]];
  player.fatigue = 30;
  const protectedRisk = playerInjuryRisk(state, player, 55);
  const unprotected = structuredClone(state);
  for (const [staffId, member] of Object.entries(unprotected.staff)) {
    if (member.programId === programId && member.role === "STRENGTH_COACH") delete unprotected.staff[staffId];
  }
  const unprotectedRisk = playerInjuryRisk(unprotected, unprotected.players[player.id], 55);

  assert.ok(protectedRisk.coachReductionPercent > 0);
  assert.equal(unprotectedRisk.coachReductionPercent, 0);
  assert.equal(unprotectedRisk.riskPercent, protectedRisk.riskWithoutCoachPercent);
  assert.ok(protectedRisk.riskPercent < unprotectedRisk.riskPercent);
});

test("durability and the chosen training focus change the exact posted injury risk", () => {
  const state = activeLeague("conditioning-injury-risk", 12);
  const programId = "program-1";
  const player = state.players[state.depthCharts[programId].RB[0]];
  player.fatigue = 25;
  const durabilityKey = Object.keys(player.ratings).find((key) => key === "durability");
  assert.ok(durabilityKey);

  const balanced = playerInjuryRisk(state, player, 55, "BALANCED");
  const conditioned = playerInjuryRisk(state, player, 55, "CONDITIONING");
  const strength = playerInjuryRisk(state, player, 55, "STRENGTH");
  assert.ok(conditioned.riskPercent < balanced.riskPercent);
  assert.ok(strength.riskPercent > balanced.riskPercent);

  const fragile = structuredClone(player);
  fragile.ratings[durabilityKey] = 35;
  const durable = structuredClone(player);
  durable.ratings[durabilityKey] = 95;
  assert.ok(
    playerInjuryRisk(state, durable, 55, "BALANCED").riskPercent
      < playerInjuryRisk(state, fragile, 55, "BALANCED").riskPercent,
    "the Durability attribute shown to the player must affect the engine roll"
  );
});

test("an emergency walk-on quarterback starts only while every scholarship QB is unavailable", () => {
  const state = activeLeague("emergency-quarterback", 4);
  const programId = "program-1";
  const quarterbacks = state.depthCharts[programId].QB.map((playerId) => state.players[playerId]);
  assert.ok(quarterbacks.length >= 3);
  for (const quarterback of quarterbacks) {
    quarterback.injury = {
      name: "Torn ACL",
      severity: "MAJOR",
      weeksRemaining: 14,
      originalWeeks: 14,
      seasonEnding: true,
      occurredSeason: state.season,
      occurredWeek: 0
    };
    quarterback.injuryWeeksRemaining = 14;
  }

  const emergency = activeEmergencyQuarterback(state, programId);
  assert.ok(emergency);
  assert.equal(emergency.eligibility.rosterStatus, "WALK_ON");
  assert.ok(emergency.overall >= 45 && emergency.overall <= 55);

  const result = advanceWeek(state);
  const line = result.state.playerGameStats.find((candidate) =>
    candidate.week === 1 && candidate.programId === programId && candidate.playerId === emergency.id);
  assert.ok(line?.started, "the walk-on must enter the real rotation and box score");
  assert.ok(line.snaps > 0);
  assert.ok(quarterbacks.every((quarterback) => currentInjury(result.state.players[quarterback.id])?.seasonEnding),
    "season-ending injuries must not tick down or recover during the same season");
  assert.equal(result.events.some((event) =>
    event.type === "PLAYER_INJURED" && event.playerId === emergency.id), false);

  const returned = result.state.players[quarterbacks[0].id];
  returned.injury = null;
  returned.injuryWeeksRemaining = 0;
  assert.equal(activeEmergencyQuarterback(result.state, programId), null);
});

test("injuries are diagnosed, persist on players, and occur often enough for depth to matter", () => {
  let state = activeLeague("injury-rate-check", 24);
  const season = state.season;
  const injuries = [];
  const acceleratedRecoveries = [];
  while (state.season === season) {
    const result = advanceWeek(state);
    injuries.push(...result.events.filter((event) => event.type === "PLAYER_INJURED"));
    acceleratedRecoveries.push(...result.events.filter((event) => event.type === "INJURY_RECOVERY_ACCELERATED"));
    state = result.state;
  }

  assert.ok(injuries.length >= 90 && injuries.length <= 190, `expected a playable injury load, saw ${injuries.length}`);
  assert.ok(injuries.every((event) => event.injuryName && ["MINOR", "MODERATE", "MAJOR"].includes(event.severity)));
  assert.ok(injuries.some((event) => event.severity === "MODERATE"));
  assert.ok(injuries.some((event) => event.severity === "MAJOR"));
  const seasonEnding = injuries.filter((event) => event.seasonEnding);
  assert.ok(seasonEnding.length / injuries.length >= 0.01 && seasonEnding.length / injuries.length <= 0.06,
    `season-ending injuries should remain rare, saw ${seasonEnding.length}/${injuries.length}`);
  assert.ok(seasonEnding.every((event) => event.severity === "MAJOR"));
  assert.ok(injuries.filter((event) => event.injuryName === "Torn labrum")
    .every((event) => !["DB", "K", "P"].includes(state.players[event.playerId].position)));
  assert.ok(injuries.filter((event) => event.injuryName === "Concussion")
    .every((event) => !["K", "P"].includes(state.players[event.playerId].position)));
  assert.ok(injuries.every((event) => event.risk < event.riskWithoutCoach));
  assert.ok(acceleratedRecoveries.length > 0, "strength coaches should visibly shorten some recoveries");
});

test("multi-seed health balance keeps catastrophic injuries rare and makes coach quality matter", () => {
  const simulateHealthSeason = (seed, strengthCoachRating = null) => {
    let state = activeLeague(seed, 12);
    if (strengthCoachRating !== null) {
      for (const member of Object.values(state.staff)) {
        if (member.role === "STRENGTH_COACH") member.rating = strengthCoachRating;
      }
    }
    const season = state.season;
    const injuries = [];
    let missedPlayerGames = 0;
    while (state.season === season) {
      missedPlayerGames += Object.values(state.players).filter((player) =>
        player.eligibility.rosterStatus === "SCHOLARSHIP" && currentInjury(player)).length;
      const result = advanceWeek(state);
      injuries.push(...result.events.filter((event) => event.type === "PLAYER_INJURED"));
      state = result.state;
    }
    return { injuries, missedPlayerGames };
  };

  const pooled = ["health-a", "health-b", "health-c"]
    .map((seed) => simulateHealthSeason(seed))
    .flatMap((result) => result.injuries);
  const catastrophicShare = pooled.filter((event) => event.seasonEnding).length / pooled.length;
  const starterShare = pooled.filter((event) => event.wasStarter).length / pooled.length;
  assert.ok(pooled.length >= 150 && pooled.length <= 240, `expected 150–240 injuries across three leagues, saw ${pooled.length}`);
  assert.ok(catastrophicShare >= 0.01 && catastrophicShare <= 0.06,
    `season-ending share should remain exceptional, saw ${(catastrophicShare * 100).toFixed(1)}%`);
  assert.ok(starterShare >= 0.35 && starterShare <= 0.75,
    `rotation injuries should make depth matter without targeting only starters, saw ${(starterShare * 100).toFixed(1)}%`);

  const weakCoach = simulateHealthSeason("coach-health-pair", 40);
  const eliteCoach = simulateHealthSeason("coach-health-pair", 95);
  assert.ok(eliteCoach.injuries.length < weakCoach.injuries.length,
    `elite coach should prevent injuries on paired rolls: ${eliteCoach.injuries.length} vs ${weakCoach.injuries.length}`);
  assert.ok(eliteCoach.missedPlayerGames < weakCoach.missedPlayerGames,
    `elite coach should reduce missed player-games: ${eliteCoach.missedPlayerGames} vs ${weakCoach.missedPlayerGames}`);
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
  // Stopping short of the rollover on purpose: these are per-game bands, and the
  // rollover folds a finished season's game logs into one line per player. Read
  // them while the season is live.
  for (let week = 0; week < 13; week += 1) state = advanceWeek(state).state;
  assert.equal(state.season, season, "the sample must stay inside one season");
  const quarterbackLines = state.playerGameStats.filter((line) => line.season === season && line.position === "QB");
  assert.ok(quarterbackLines.length >= 90);
  assert.ok(quarterbackLines.every((line) => line.passingAttempts >= 8 && line.passingAttempts <= 60));
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
  const playoffStatLines = state.playerGameStats.filter((line) =>
    line.season === season && line.gameId.startsWith(`playoff:${season}:`));
  assert.deepEqual(
    [...new Set(playoffStatLines.map((line) => line.week))].sort((left, right) => left - right),
    [15, 16, 17, 18],
    "postseason game logs must retain the round in which the player took snaps"
  );
  const playoffInjuries = finalEvents.filter((event) =>
    event.type === "PLAYER_INJURED" && event.week >= 15 && event.week <= 18);
  assert.ok(playoffInjuries.length > 0, "players who take playoff snaps must remain exposed to injury");
  assert.ok(playoffInjuries.every((injury) => playoffStatLines.some((line) =>
    line.playerId === injury.playerId && line.week === injury.week && line.snaps > 0
  )), "every playoff injury must trace to actual snaps in that round");
  const advancingInjury = playoffInjuries.find((injury) => {
    if (injury.week >= 18) return false;
    const line = playoffStatLines.find((candidate) =>
      candidate.playerId === injury.playerId && candidate.week === injury.week);
    const game = history.postseasonGames.find((candidate) => candidate.id === line?.gameId);
    return Boolean(line && game && game.winnerProgramId === line.programId);
  });
  assert.ok(advancingInjury, "the fixture seed must include an injured player whose team advances");
  assert.equal(
    playoffStatLines.some((line) =>
      line.playerId === advancingInjury.playerId && line.week === advancingInjury.week + 1),
    false,
    "a new playoff injury must remove the player from the following round"
  );
  assert.equal(
    Object.values(state.players).some((player) => currentInjury(player)),
    false,
    "the current MVP intentionally clears every remaining injury at season rollover"
  );
  const coachAward = history.awards.find((award) => award.type === "COACH_OF_THE_YEAR");
  assert.equal(state.staff[coachAward.winner.staffId].role, "HEAD_COACH");
});

test("a development week permanently raises the position's attributes and Overall", () => {
  const strengthState = activeLeague("training-payoffs", 4);
  const conditioningState = structuredClone(strengthState);
  const player = Object.values(strengthState.players).find((candidate) => candidate.programId === "program-1" && candidate.position === "QB");
  assert.ok(player);
  const before = structuredClone(player.ratings);
  const strength = advanceWeek(strengthState, [{ type: "SET_DEVELOPMENT_SPOTLIGHT", programId: "program-1", target: { type: "PLAYER", playerId: player.id }, focus: "STRENGTH" }]);
  const conditioning = advanceWeek(conditioningState, [{ type: "SET_DEVELOPMENT_SPOTLIGHT", programId: "program-1", target: { type: "PLAYER", playerId: player.id }, focus: "CONDITIONING" }]);
  assert.ok(
    computeOverall(player.position, strength.state.players[player.id].ratings)
      >= computeOverall(player.position, before)
  );
  // Overall is derived now, so growth has to land on the attributes and Overall
  // has to follow. This is the invariant the old model broke: it moved five
  // sub-ratings and grew `overall` from a separate formula, linked only by a
  // fudge factor, so the choice barely touched the number the player watches.
  const grown = strength.state.players[player.id];
  assert.equal(
    Number(grown.overall.toFixed(2)),
    Number(computeOverall(grown.position, grown.ratings).toFixed(2)),
    "stored Overall must equal the Overall its own attributes imply"
  );
  assert.ok(grown.overall > player.overall, "a development week must move Overall");
  for (const key of Object.keys(before)) {
    assert.ok(grown.ratings[key] >= before[key], `${key} must never fall from a development week`);
  }
  assert.ok(grown.overall <= grown.potential, "Overall may never pass potential");
  // Choosing *which* attribute to develop is the next slice; today the week's
  // work spreads across the position's five, so the focus value is inert.
  assert.ok(conditioning.state.players[player.id].fatigue <= strength.state.players[player.id].fatigue);
});

test("one weekly development spotlight supports a full-intensity player or diluted position room", () => {
  const individualState = activeLeague("development-spotlight-scope", 4);
  const groupState = structuredClone(individualState);
  const quarterbacks = Object.values(individualState.players).filter((player) =>
    player.programId === "program-1"
    && player.position === "QB"
    && player.eligibility.rosterStatus === "SCHOLARSHIP");
  const target = quarterbacks[0];
  assert.ok(target && quarterbacks.length > 1);
  const before = target.overall;
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
  // Overall is what the spotlight has to move, because Overall is the number the
  // player watches. It used to grow on its own formula while the spotlight moved
  // only sub-ratings, so concentrating a week on one man changed nothing visible.
  const individualGain = individual.state.players[target.id].overall - before;
  const groupGain = group.state.players[target.id].overall - before;
  assert.ok(
    individualGain > groupGain,
    `a full-intensity spotlight must beat a diluted room (${individualGain.toFixed(3)} vs ${groupGain.toFixed(3)})`
  );
  // And the room option still lifts everybody in it, just by less each.
  assert.ok(group.state.players[quarterbacks[1].id].overall > quarterbacks[1].overall);
  const spotlight = group.events.find((event) => event.type === "DEVELOPMENT_SPOTLIGHT_SET");
  assert.ok(spotlight);
  assert.equal(spotlight.intensity, 0.28);
  assert.equal(spotlight.playerIds.length, quarterbacks.length);
});

test("recovery assignments lower fatigue and recruiting staff and facilities generate more points", () => {
  const base = activeLeague("staff-facility-payoffs", 4);
  const player = Object.values(base.players).find((candidate) => candidate.programId === "program-1");
  const coach = Object.values(base.staff).find((candidate) => candidate.programId === "program-1");
  assert.ok(player && coach);
  player.fatigue = 20;
  // The strength coach is money in, health out — he has no sliders at all, so a
  // better one is the only way to recover faster.
  const weakStaff = structuredClone(base);
  const strongStaff = structuredClone(base);
  for (const state of [weakStaff, strongStaff]) {
    for (const member of Object.values(state.staff)) {
      if (member.programId !== "program-1" || member.role !== "STRENGTH_COACH") continue;
      member.rating = state === strongStaff ? 92 : 40;
    }
  }
  assert.ok(
    advanceWeek(strongStaff).state.players[player.id].fatigue
      < advanceWeek(weakStaff).state.players[player.id].fatigue,
    "a better strength coach must leave the roster fresher"
  );

  const basicRecruiting = activeLeague("recruiting-investment", 4);
  const investedRecruiting = structuredClone(basicRecruiting);
  basicRecruiting.programs["program-1"].facilities.RECRUITING = 1;
  investedRecruiting.programs["program-1"].facilities.RECRUITING = 5;
  const basicPoints = recruitingWeeklyPoints(basicRecruiting, "program-1");
  const investedPoints = recruitingWeeklyPoints(investedRecruiting, "program-1");
  assert.equal(investedPoints - basicPoints, 12);
  // And putting the week behind the trail has to matter at least as much as the
  // building does, or the recruiting card cannot state a real trade.
  const focused = structuredClone(investedRecruiting);
  const plan = planWeekHours(focused, "program-1", ["RECRUIT"]);
  for (const [staffId, allocation] of Object.entries(plan.byStaff)) focused.staff[staffId].allocation = allocation;
  const idle = structuredClone(investedRecruiting);
  const idlePlan = planWeekHours(idle, "program-1", ["INSTALL_OFFENSE"]);
  for (const [staffId, allocation] of Object.entries(idlePlan.byStaff)) idle.staff[staffId].allocation = allocation;
  const focusedPoints = recruitingWeeklyPoints(focused, "program-1");
  const idlePoints = recruitingWeeklyPoints(idle, "program-1");
  assert.ok(focusedPoints - idlePoints >= 12,
    `making recruiting a priority must be worth real points (${idlePoints} to ${focusedPoints})`);
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

test("weekly stories turn the recap into a small factual editorial package", () => {
  const state = activeLeague("weekly-story-package", 12);
  const programId = "program-1";
  const result = advanceWeek(state);
  const recap = result.events.find((event) => event.type === "WEEKLY_RECAP" && event.programId === programId);
  assert.ok(recap);
  const stories = weeklyStories(result.state, programId, recap.season, recap.week);
  assert.ok(stories.length >= 2 && stories.length <= 4);
  assert.equal(stories[0].kind, "PROGRAM_RESULT");
  assert.equal(new Set(stories.map((story) => story.id)).size, stories.length);
  assert.ok(stories.every((story) => story.season === recap.season && story.week === recap.week));

  const lead = stories[0];
  assert.equal(lead.programId, programId);
  assert.equal(lead.result, recap.result);
  assert.equal(lead.scoreFor, recap.scoreFor);
  assert.equal(lead.fanChange, recap.fanChange);
  assert.equal(lead.weeklyNet, recap.weeklyNet);

  const national = stories.find((story) => story.kind === "NATIONAL_RESULT");
  assert.ok(national);
  const sourceGame = result.events.find((event) =>
    event.type === "GAME_COMPLETED"
    && [event.homeProgramId, event.awayProgramId].includes(national.winnerProgramId)
    && [event.homeProgramId, event.awayProgramId].includes(national.loserProgramId));
  assert.ok(sourceGame);
  assert.equal(national.winnerScore, Math.max(sourceGame.homeScore, sourceGame.awayScore));
  assert.equal(national.loserScore, Math.min(sourceGame.homeScore, sourceGame.awayScore));

  const playerStory = stories.find((story) => story.kind === "PLAYER_SPOTLIGHT");
  if (playerStory) {
    const sourcePerformance = result.events.find((event) =>
      event.type === "PLAYER_BRAND_UPDATED" && event.playerId === playerStory.playerId);
    assert.ok(sourcePerformance);
    assert.equal(playerStory.gameRating, sourcePerformance.gameRating);
    assert.equal(playerStory.performanceSummary, sourcePerformance.performanceSummary);
  }
});

test("weekly stories call out an earned sponsorship bonus", () => {
  const state = activeLeague("weekly-story-sponsor", 12);
  const homeFixture = state.schedule.find((game) => game.week === state.week);
  assert.ok(homeFixture);
  const programId = homeFixture.homeProgramId;
  const program = state.programs[programId];
  program.fanBase = 1_000_000;
  program.fanSupport = 100;
  program.ticketPrice = 10;
  const offer = state.sponsorships[programId].offers.find((candidate) => candidate.strategy === "HOME_CROWD");
  assert.ok(offer);

  const result = advanceWeek(state, [{ type: "ACCEPT_SPONSORSHIP", programId, offerId: offer.id }]);
  const recap = result.events.find((event) => event.type === "WEEKLY_RECAP" && event.programId === programId);
  const payment = result.events.find((event) => event.type === "SPONSORSHIP_PAYMENT" && event.programId === programId);
  assert.ok(recap && payment);
  assert.ok(payment.homeAttendanceBonus > 0);
  // Isolate the business trigger. A consequential injury intentionally owns
  // this fourth story slot when both happen in the same week.
  result.state.eventHistory = result.state.eventHistory.filter((event) =>
    event.type !== "PLAYER_INJURED" || result.state.players[event.playerId]?.programId !== programId);
  const story = weeklyStories(result.state, programId, recap.season, recap.week)
    .find((candidate) => candidate.kind === "PROGRAM_MOMENTUM");
  assert.ok(story);
  assert.equal(story.angle, "SPONSOR_BONUS");
  assert.equal(story.sponsorName, offer.sponsorName);
  assert.equal(story.sponsorBonus, payment.total - payment.basePayment);
});

test("a consequential injury replaces the routine business story", () => {
  const state = activeLeague("weekly-story-injury", 12);
  const programId = "program-1";
  const result = advanceWeek(state);
  const recap = result.events.find((event) => event.type === "WEEKLY_RECAP" && event.programId === programId);
  const playerId = result.state.depthCharts[programId].QB[0];
  const replacementPlayerId = result.state.depthCharts[programId].QB[1];
  assert.ok(recap && playerId && replacementPlayerId);
  result.state.eventHistory.push({
    type: "PLAYER_INJURED",
    season: recap.season,
    week: recap.week,
    playerId,
    injuryName: "Torn ACL",
    severity: "MAJOR",
    weeks: 14,
    risk: 1.2,
    riskWithoutCoach: 1.6,
    coachReductionPercent: 25,
    seasonEnding: true,
    wasStarter: true,
    replacementPlayerId,
    emergencyQuarterback: false,
    affectedUnit: "passOffense",
    unitRatingBefore: 74,
    unitRatingAfter: 68,
    unitRatingChangePercent: -8.1
  });

  const stories = weeklyStories(result.state, programId, recap.season, recap.week);
  const health = stories.find((story) => story.kind === "PROGRAM_HEALTH");
  assert.ok(health);
  assert.equal(health.angle, "MAJOR_INJURY");
  assert.equal(health.seasonEnding, true);
  assert.equal(stories.some((story) => story.kind === "PROGRAM_MOMENTUM"), false);
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

test("a dynasty saves small, folds finished seasons, and round-trips exactly", async () => {
  // Measured on a real two-season league at 72 programs before any of this
  // existed: 73.38 MB of raw JSON, and no persistence at all. gzip alone took
  // that to 4.19 MB; folding finished seasons and trimming the event log took it
  // to 2.94 MB. Columnar typed arrays on top were measured at 3.00 vs 3.06 — a
  // 2% win for a hand-rolled binary format — and are deliberately not built.
  let state = beginSeason(createFictionalLeague("save-format", 24));
  for (let week = 0; week < 15; week += 1) state = advanceWeek(state).state;

  // Rolling past week 14 must fold the finished season out of the game log.
  assert.ok(state.season > 2027, "the season must have rolled over");
  assert.ok(state.playerSeasonStats.length > 0, "a finished season must be archived");
  assert.ok(
    state.playerGameStats.every((row) => row.season === state.season || row.gameId.startsWith("playoff:")),
    "regular-season rows for finished seasons must not survive the rollover; postseason rows are the permanent record"
  );

  // Folding is lossless for the totals a record book reads.
  const archived = state.playerSeasonStats[0];
  assert.ok(archived.games > 0 && archived.gameRatingTotal > 0);
  assert.ok(archived.starts <= archived.games && archived.wins <= archived.games);

  const bytes = await encodeSave(state);
  const raw = new TextEncoder().encode(JSON.stringify(state)).length;
  assert.ok(bytes.length * 8 < raw, `a save must be far smaller than the state (${bytes.length} vs ${raw})`);

  // Round-trip has to be exact on everything the engine reads, or a loaded
  // career diverges from the one that was saved — which the determinism
  // invariant makes immediately visible.
  const { state: loaded } = await decodeSave(bytes);
  for (const field of ["season", "week", "phase"]) assert.equal(loaded[field], state[field]);
  assert.deepEqual(loaded.programs, state.programs);
  assert.deepEqual(loaded.players, state.players);
  assert.deepEqual(loaded.staff, state.staff);
  assert.deepEqual(loaded.schedule, state.schedule);
  assert.deepEqual(loaded.weekFocus, state.weekFocus);
  assert.deepEqual(loaded.playerSeasonStats, state.playerSeasonStats);

  // And a loaded career must advance identically to one that was never saved.
  const fromSave = advanceWeek(loaded);
  const fromMemory = advanceWeek({ ...state, eventHistory: loaded.eventHistory });
  assert.equal(
    JSON.stringify(fromSave.state.programs),
    JSON.stringify(fromMemory.state.programs),
    "a save must reload into a byte-identical simulation"
  );
});

test("four people turn up every third week, you take one, and it is not always successful", () => {
  let state = beginSeason(createFictionalLeague("boosters", 24));
  const programId = "program-1";

  assert.deepEqual([...Array(15).keys()].filter(boosterDueThisWeek), [3, 6, 9, 12]);
  assert.equal(pendingBoosterOffer(state, programId), null, "week one has nobody at the door");

  for (let week = 0; week < 2; week += 1) state = advanceWeek(state).state;
  const offer = pendingBoosterOffer(state, programId);
  assert.ok(offer, "week three must put somebody on the table");
  assert.equal(offer.options.length, 4);
  assert.deepEqual(
    offer.options.map((option) => option.kind).sort(),
    ["DONOR", "LOCAL_BUSINESS", "POSITION_LEGEND", "TURNOVER_LEGEND"]
  );
  for (const option of offer.options) {
    // Odds are stated before the choice. A gamble with hidden odds is a slot
    // machine, which is the one thing this must not be.
    assert.ok(option.chance > 0 && option.chance < 100, `${option.kind} must state a real chance`);
    assert.ok(option.reward.length > 0 && option.name.length > 0);
  }
  // The offensive legend works with a room the offense actually has.
  const legend = offer.options.find((option) => option.kind === "POSITION_LEGEND");
  assert.ok(["QB", "RB", "WR", "TE"].includes(legend.position));

  // Taking one resolves immediately and closes the door on the rest.
  const taken = prepareWeek(state, [{ type: "CHOOSE_BOOSTER", programId, optionId: offer.options[0].id }]);
  const resolved = taken.events.find((event) => event.type === "BOOSTER_RESOLVED");
  assert.ok(resolved, "a choice must resolve there and then");
  assert.equal(typeof resolved.succeeded, "boolean");
  const second = prepareWeek(taken.state, [{ type: "CHOOSE_BOOSTER", programId, optionId: offer.options[1].id }]);
  assert.ok(second.events.some((event) => event.type === "COMMAND_REJECTED"), "only one of the four");

  // Determinism: the same career always meets the same four people and gets the
  // same answer, so a booster can never be re-rolled by reloading.
  const replay = prepareWeek(state, [{ type: "CHOOSE_BOOSTER", programId, optionId: offer.options[0].id }]);
  assert.equal(
    replay.events.find((event) => event.type === "BOOSTER_RESOLVED").succeeded,
    resolved.succeeded
  );
});

test("each of the four rewards actually lands when it comes off", () => {
  const forced = (kind) => {
    let state = beginSeason(createFictionalLeague(`booster-effect-${kind}`, 24));
    const programId = "program-1";
    for (let week = 0; week < 2; week += 1) state = advanceWeek(state).state;
    const offer = pendingBoosterOffer(state, programId);
    const option = offer.options.find((entry) => entry.kind === kind);
    // Certainty only so the effect can be asserted; the odds are tested above.
    state.boosters[programId].offer.options = offer.options.map((entry) =>
      entry.id === option.id ? { ...entry, chance: 100 } : entry);
    const room = () => Object.values(state.players).filter((player) =>
      player.programId === programId && player.position === option.position
      && player.eligibility.rosterStatus === "SCHOLARSHIP");
    const before = { budget: state.programs[programId].budget, room: room().map((player) => player.overall) };
    const result = prepareWeek(state, [{ type: "CHOOSE_BOOSTER", programId, optionId: option.id }]);
    return { option, before, state: result.state, events: result.events, programId };
  };

  const donor = forced("DONOR");
  assert.equal(
    donor.state.programs[donor.programId].budget - donor.before.budget,
    donor.option.amount,
    "a donor's cheque must be exactly what the card promised"
  );

  const legend = forced("POSITION_LEGEND");
  const after = Object.values(legend.state.players).filter((player) =>
    player.programId === legend.programId && player.position === legend.option.position
    && player.eligibility.rosterStatus === "SCHOLARSHIP");
  assert.ok(after.length > 0);
  const gained = after.filter((player, index) => player.overall > legend.before.room[index]).length;
  assert.ok(gained > 0, "a returning legend must actually improve his room");
  // Overall is derived, so the gain has to have landed on the attributes.
  assert.ok(after.every((player) => player.overall <= player.potential), "and never past a man's ceiling");

  const business = forced("LOCAL_BUSINESS");
  assert.ok(advertisingCredit(business.state, business.programId) > 0, "free advertising must be banked");

  const defense = forced("TURNOVER_LEGEND");
  assert.equal(takeawayMultiplier(defense.state, defense.programId), TAKEAWAY_BOOST);
  // And it is one game only.
  assert.equal(takeawayMultiplier(advanceWeek(defense.state).state, defense.programId), 1);
});
