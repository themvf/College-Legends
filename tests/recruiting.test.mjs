import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  MAX_VISITS_PER_SEASON,
  NIL_WITHDRAWAL_INTEREST_PENALTY,
  PIPELINE_CONTRIBUTOR_GAMES,
  PIPELINE_CONTRIBUTOR_STARDOM,
  PIPELINE_DECAY_RATE,
  PIPELINE_GAIN_PER_CONTRIBUTOR,
  PIPELINE_MAX_BONUS,
  prospectProgramFit,
  SIGNING_WEEK,
  updatePipelineStrength,
  visitScore
} from "../packages/simulation/dist/index.js";

const activeLeague = (seed, programCount = 12) => beginSeason(createFictionalLeague(seed, programCount));

function availableProspects(state) {
  return Object.values(state.prospects)
    .filter((prospect) => prospect.status === "AVAILABLE")
    .sort((left, right) => left.id.localeCompare(right.id));
}

/** Puts a prospect on a program's board, undiscovered otherwise. */
function discover(state, programId, prospectId) {
  const recruiting = state.recruiting[programId];
  if (!recruiting.discoveredProspectIds.includes(prospectId)) recruiting.discoveredProspectIds.push(prospectId);
  recruiting.scoutingByProspect[prospectId] ??= { evaluations: [], pursuitPoints: 0 };
}

test("a prospect committed past the scholarship limit resolves to withdrawn, not stuck", () => {
  let state = activeLeague("recruiting-overflow", 4);
  const programId = "program-1";
  const program = state.programs[programId];
  const prospectId = state.recruiting[programId].discoveredProspectIds[0];
  assert.ok(prospectId);
  const prospect = state.prospects[prospectId];
  prospect.status = "COMMITTED";
  prospect.signedProgramId = programId;
  // Close every opening for good, regardless of how many seniors graduate out
  // over the season — the rollover enrollment loop must never find room.
  program.scholarshipLimit = 0;
  const openingSeason = state.season;
  let result = advanceWeek(state);
  state = result.state;
  while (state.season === openingSeason) {
    result = advanceWeek(state);
    state = result.state;
  }
  assert.equal(
    state.prospects[prospectId].status,
    "WITHDRAWN",
    "a class-full commitment must resolve, not linger as COMMITTED"
  );
  assert.equal(state.players[`player:${prospectId}`], undefined);
  assert.ok(
    result.events.some((event) => event.type === "PROSPECT_COMMITMENT_VOIDED" && event.prospectId === prospectId),
    "the void must be a reported event, not a silent drop"
  );
});

test("pursuit points are refused without an active offer", () => {
  const state = activeLeague("recruiting-offer-gate");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  const result = advanceWeek(state, [
    { type: "INVEST_RECRUITING_POINTS", programId, prospectId: prospect.id, points: 10 }
  ]);
  const rejection = result.events.find((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "INVEST_RECRUITING_POINTS");
  assert.ok(rejection, "an investment on a prospect nobody has offered must be refused");
  assert.match(rejection.reason, /offer/i);
  assert.equal(result.state.recruiting[programId].scoutingByProspect[prospect.id].pursuitPoints, 0);
});

test("extending an offer is free; rescinding costs the same flat interest NIL withdrawal does", () => {
  const state = activeLeague("recruiting-offer-cost");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  const interestBefore = prospect.interestByProgram[programId];

  // Points still replenish every week regardless of commands, so compare
  // against an identical week with no commands rather than the pre-week value.
  const baseline = advanceWeek(state);
  const extended = advanceWeek(state, [
    { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true }
  ]);
  assert.equal(
    extended.state.recruiting[programId].points,
    baseline.state.recruiting[programId].points,
    "extending an offer costs nothing beyond the week's ordinary replenishment"
  );
  assert.ok(extended.state.recruiting[programId].offeredProspectIds.includes(prospect.id));
  assert.ok(
    extended.events.some((event) => event.type === "PROSPECT_OFFERED" && event.extended === true),
    "extending must be a reported event"
  );

  const rescinded = advanceWeek(extended.state, [
    { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: false }
  ]);
  assert.ok(!rescinded.state.recruiting[programId].offeredProspectIds.includes(prospect.id));
  assert.equal(
    rescinded.state.prospects[prospect.id].interestByProgram[programId],
    Math.max(0, interestBefore - NIL_WITHDRAWAL_INTEREST_PENALTY),
    "rescinding costs the same flat, deterministic interest NIL withdrawal charges"
  );
});

test("an offer and an investment in the same week resolve regardless of command order", () => {
  const programId = Object.keys(activeLeague("recruiting-offer-order").programs)[0];
  const prospectId = availableProspects(activeLeague("recruiting-offer-order"))[0].id;
  const build = (commandOrder) => {
    const state = activeLeague("recruiting-offer-order");
    discover(state, programId, prospectId);
    const commands = [
      { type: "OFFER_PROSPECT", programId, prospectId, extend: true },
      { type: "INVEST_RECRUITING_POINTS", programId, prospectId, points: 10 }
    ];
    return advanceWeek(state, commandOrder === "forward" ? commands : [...commands].reverse());
  };
  const forward = build("forward");
  const reversed = build("reversed");
  assert.deepEqual(forward, reversed);
  assert.equal(
    forward.state.recruiting[programId].scoutingByProspect[prospectId]?.pursuitPoints,
    10,
    "the investment must land in the same week the offer was extended, whichever order the commands arrived in"
  );
});

test("a career with offer commands replays byte-identically", () => {
  const run = () => {
    const state = activeLeague("recruiting-offer-replay");
    const programId = Object.keys(state.programs)[0];
    const prospect = availableProspects(state)[0];
    discover(state, programId, prospect.id);
    let current = advanceWeek(state, [
      { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true },
      { type: "INVEST_RECRUITING_POINTS", programId, prospectId: prospect.id, points: 10 }
    ]);
    current = advanceWeek(current.state);
    return current;
  };
  assert.deepEqual(run(), run());
});

test("visitScore rewards fit and halves on each repeat", () => {
  const lowFit = visitScore(0, 0);
  const highFit = visitScore(100, 0);
  assert.ok(highFit > lowFit, "a program that actually fits what he wants must get more from the same visit");
  const first = visitScore(70, 0);
  const second = visitScore(70, 1);
  const third = visitScore(70, 2);
  assert.ok(Math.abs(second - first / 2) < 1e-6, "the second visit must be worth exactly half the first");
  assert.ok(Math.abs(third - first / 4) < 1e-6, "the third visit must be worth exactly a quarter of the first");
});

test("a visit is refused without an active offer", () => {
  const state = activeLeague("recruiting-visit-gate");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  state.recruiting[programId].points = 1000;
  const result = advanceWeek(state, [
    { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
  ]);
  const rejection = result.events.find((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "SCHEDULE_VISIT");
  assert.ok(rejection, "a visit on a prospect nobody has offered must be refused");
  assert.match(rejection.reason, /offer/i);
});

test("the season visit cap binds across the whole board", () => {
  const state = activeLeague("recruiting-visit-cap");
  const programId = Object.keys(state.programs)[0];
  const prospects = availableProspects(state).slice(0, MAX_VISITS_PER_SEASON + 1);
  assert.equal(prospects.length, MAX_VISITS_PER_SEASON + 1);
  for (const prospect of prospects) discover(state, programId, prospect.id);
  state.recruiting[programId].points = 1000;
  const commands = prospects.flatMap((prospect) => [
    { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true },
    { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
  ]);
  const result = advanceWeek(state, commands);
  const scheduled = result.events.filter((event) => event.type === "RECRUITING_VISIT_SCHEDULED");
  const rejected = result.events.filter((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "SCHEDULE_VISIT");
  assert.equal(scheduled.length, MAX_VISITS_PER_SEASON, "only the season cap's worth of visits may be scheduled");
  assert.equal(rejected.length, 1, "the visit past the cap must be refused with a reason");
  assert.match(rejected[0].reason, /visit/i);
  assert.equal(result.state.recruiting[programId].visitsUsedThisSeason, MAX_VISITS_PER_SEASON);
});

test("a repeat visit to the same recruit is worth less than the first, in the actual market score", () => {
  const state = activeLeague("recruiting-visit-diminish");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  state.recruiting[programId].points = 1000;
  const first = advanceWeek(state, [
    { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true },
    { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
  ]);
  const firstVisit = first.events.find((event) => event.type === "RECRUITING_VISIT_SCHEDULED");
  assert.ok(firstVisit);
  assert.equal(firstVisit.visitNumber, 1);
  first.state.recruiting[programId].points = 1000;
  const second = advanceWeek(first.state, [
    { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
  ]);
  const secondVisit = second.events.find((event) => event.type === "RECRUITING_VISIT_SCHEDULED");
  assert.ok(secondVisit);
  assert.equal(secondVisit.visitNumber, 2);
  assert.ok(
    secondVisit.bonus < firstVisit.bonus,
    `a second visit to the same recruit (${secondVisit.bonus}) must be worth less than the first (${firstVisit.bonus})`
  );
});

test("an offer and a visit in the same week resolve regardless of command order", () => {
  const programId = Object.keys(activeLeague("recruiting-visit-order").programs)[0];
  const prospectId = availableProspects(activeLeague("recruiting-visit-order"))[0].id;
  const build = (commandOrder) => {
    const state = activeLeague("recruiting-visit-order");
    discover(state, programId, prospectId);
    state.recruiting[programId].points = 1000;
    const commands = [
      { type: "OFFER_PROSPECT", programId, prospectId, extend: true },
      { type: "SCHEDULE_VISIT", programId, prospectId }
    ];
    return advanceWeek(state, commandOrder === "forward" ? commands : [...commands].reverse());
  };
  const forward = build("forward");
  const reversed = build("reversed");
  assert.deepEqual(forward, reversed);
  assert.ok(forward.events.some((event) => event.type === "RECRUITING_VISIT_SCHEDULED"));
});

test("a career with visit commands replays byte-identically", () => {
  const run = () => {
    const state = activeLeague("recruiting-visit-replay");
    const programId = Object.keys(state.programs)[0];
    const prospect = availableProspects(state)[0];
    discover(state, programId, prospect.id);
    state.recruiting[programId].points = 1000;
    let current = advanceWeek(state, [
      { type: "OFFER_PROSPECT", programId, prospectId: prospect.id, extend: true },
      { type: "SCHEDULE_VISIT", programId, prospectId: prospect.id }
    ]);
    current = advanceWeek(current.state);
    return current;
  };
  assert.deepEqual(run(), run());
});

test("a rival with a real edge can flip a verbal commitment before the signing week", () => {
  const state = activeLeague("recruiting-flip");
  const [programA, programB] = Object.keys(state.programs);
  const prospect = availableProspects(state)[0];
  discover(state, programA, prospect.id);
  discover(state, programB, prospect.id);
  prospect.interestByProgram[programA] = 60;
  prospect.interestByProgram[programB] = 60;

  // Program A wins him early with a heavy pursuit-point push.
  state.recruiting[programA].scoutingByProspect[prospect.id].pursuitPoints = 100;
  let current = advanceWeek(state);
  const committed = current.events.find((event) => event.type === "PROSPECT_COMMITTED" && event.prospectId === prospect.id);
  assert.ok(committed, "program A must land the commitment first");
  assert.equal(committed.programId, programA);
  assert.equal(current.state.prospects[prospect.id].status, "COMMITTED");
  assert.ok(current.state.week < SIGNING_WEEK, "the flip window must still be open");

  // Program B builds an overwhelming edge — enough to clear A's score, A's
  // commitment inertia, and the required lead all at once.
  current.state.recruiting[programB].scoutingByProspect[prospect.id].pursuitPoints = 500;
  const flipped = advanceWeek(current.state);
  const flip = flipped.events.find((event) => event.type === "PROSPECT_FLIPPED" && event.prospectId === prospect.id);
  assert.ok(flip, "an overwhelming edge must be able to flip a verbal commitment");
  assert.equal(flip.fromProgramId, programA);
  assert.equal(flip.toProgramId, programB);
  assert.equal(flipped.state.prospects[prospect.id].signedProgramId, programB);
  assert.equal(flipped.state.prospects[prospect.id].status, "COMMITTED");
});

test("an unopposed commitment does not re-fire every week it stands", () => {
  const state = activeLeague("recruiting-no-noop");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  state.recruiting[programId].scoutingByProspect[prospect.id].pursuitPoints = 100;
  let current = advanceWeek(state);
  assert.ok(current.events.some((event) => event.type === "PROSPECT_COMMITTED" && event.prospectId === prospect.id));
  // Two more quiet weeks with nothing changed for anyone.
  for (let i = 0; i < 2; i += 1) {
    current = advanceWeek(current.state);
    assert.ok(
      !current.events.some((event) =>
        (event.type === "PROSPECT_COMMITTED" || event.type === "PROSPECT_FLIPPED") && event.prospectId === prospect.id),
      "a stable commitment must not re-announce itself"
    );
  }
});

test("the signing week locks a verbal commitment for good", () => {
  const state = activeLeague("recruiting-signing-lock");
  const [programA, programB] = Object.keys(state.programs);
  const prospect = availableProspects(state)[0];
  discover(state, programA, prospect.id);
  discover(state, programB, prospect.id);
  state.recruiting[programA].scoutingByProspect[prospect.id].pursuitPoints = 100;

  let current = advanceWeek(state).state;
  assert.equal(current.prospects[prospect.id].status, "COMMITTED");

  let signedEvent = null;
  while (current.week <= 13 && !signedEvent) {
    const result = advanceWeek(current);
    signedEvent = result.events.find((event) => event.type === "PROSPECT_SIGNED" && event.prospectId === prospect.id);
    current = result.state;
  }
  assert.ok(signedEvent, "the signing week must lock him in");
  assert.equal(signedEvent.programId, programA);
  assert.equal(current.prospects[prospect.id].status, "SIGNED");

  // A wildly overwhelming late offer from program B must not be able to touch him.
  current.recruiting[programB].scoutingByProspect[prospect.id].pursuitPoints = 1000;
  const afterSigning = advanceWeek(current);
  assert.ok(
    !afterSigning.events.some((event) => event.type === "PROSPECT_FLIPPED" && event.prospectId === prospect.id),
    "a signed prospect can never be contested again"
  );
  assert.equal(afterSigning.state.prospects[prospect.id].signedProgramId, programA);
  assert.equal(afterSigning.state.prospects[prospect.id].status, "SIGNED");
});

test("a first commitment made at or after the signing week signs immediately", () => {
  let state = activeLeague("recruiting-late-sign");
  const programId = Object.keys(state.programs)[0];
  // Fast-forward to the signing week with nobody committed to anything.
  while (state.week < SIGNING_WEEK) state = advanceWeek(state).state;
  assert.equal(state.week, SIGNING_WEEK);
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  state.recruiting[programId].scoutingByProspect[prospect.id].pursuitPoints = 100;
  const result = advanceWeek(state);
  const committed = result.events.find((event) => event.type === "PROSPECT_COMMITTED" && event.prospectId === prospect.id);
  const signed = result.events.find((event) => event.type === "PROSPECT_SIGNED" && event.prospectId === prospect.id);
  assert.ok(committed, "the news that he committed is still reported");
  assert.ok(signed, "and he signs in the same week — there is no flip window left");
  assert.equal(result.state.prospects[prospect.id].status, "SIGNED");
});

test("a career spanning a flip and a signing-week lock replays byte-identically", () => {
  const run = () => {
    const state = activeLeague("recruiting-flip-replay");
    const [programA, programB] = Object.keys(state.programs);
    const prospect = availableProspects(state)[0];
    discover(state, programA, prospect.id);
    discover(state, programB, prospect.id);
    state.recruiting[programA].scoutingByProspect[prospect.id].pursuitPoints = 100;
    let current = advanceWeek(state).state;
    current.recruiting[programB].scoutingByProspect[prospect.id].pursuitPoints = 500;
    current = advanceWeek(current).state;
    for (let i = 0; i < 3; i += 1) current = advanceWeek(current).state;
    return current;
  };
  assert.deepEqual(run(), run());
});

test("the CLOSE_TO_HOME pipeline bonus is capped and never touches out-of-division fit", () => {
  const state = activeLeague("recruiting-pipeline-fit", 24);
  const programId = Object.keys(state.programs)[0];
  const program = state.programs[programId];
  const divisionId = program.divisionId;
  const otherDivisionId = Object.values(state.programs).find((other) => other.divisionId !== divisionId).divisionId;

  const prospect = availableProspects(state)[0];
  prospect.homeDivisionId = divisionId;
  prospect.priorities = ["CLOSE_TO_HOME"];

  assert.equal(prospectProgramFit(state, prospect, programId), 95, "no pipeline yet, just the flat home-territory bias");

  program.pipelineStrength[divisionId] = PIPELINE_MAX_BONUS + 20;
  assert.equal(
    prospectProgramFit(state, prospect, programId),
    95 + PIPELINE_MAX_BONUS,
    "the bonus must never exceed its cap, however large the stored counter gets"
  );

  prospect.homeDivisionId = otherDivisionId;
  assert.equal(
    prospectProgramFit(state, prospect, programId),
    30,
    "a home pipeline never leaks into a fit score for a prospect from somewhere else"
  );
});

test("updatePipelineStrength grows from a real contributor and decays without one", () => {
  const state = activeLeague("recruiting-pipeline-lifecycle", 4);
  const programId = Object.keys(state.programs)[0];
  const program = state.programs[programId];
  const divisionId = program.divisionId;
  const roster = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP");
  const contributor = roster[0];
  assert.ok(contributor);
  // Isolate him: nobody else on the roster may accidentally also qualify.
  for (const player of roster) {
    player.eligibility.gamesPlayedThisSeason = 0;
    player.stardom = 0;
  }
  contributor.homeDivisionId = divisionId;
  contributor.eligibility.gamesPlayedThisSeason = PIPELINE_CONTRIBUTOR_GAMES;

  updatePipelineStrength(state);
  assert.equal(
    program.pipelineStrength[divisionId],
    PIPELINE_GAIN_PER_CONTRIBUTOR,
    "exactly one contributor's worth, from a standing start"
  );

  // A quiet season: he's no longer on the field, nobody else qualifies either.
  contributor.eligibility.gamesPlayedThisSeason = 0;
  contributor.stardom = 0;
  updatePipelineStrength(state);
  const expected = PIPELINE_GAIN_PER_CONTRIBUTOR * PIPELINE_DECAY_RATE;
  assert.ok(
    Math.abs(program.pipelineStrength[divisionId] - expected) < 1e-6,
    `a quiet season must decay what was already built, saw ${program.pipelineStrength[divisionId]} expected ${expected}`
  );
});

test("a brand milestone counts as a contributor even without a heavy workload", () => {
  const state = activeLeague("recruiting-pipeline-brand", 4);
  const programId = Object.keys(state.programs)[0];
  const program = state.programs[programId];
  const divisionId = program.divisionId;
  const roster = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP");
  for (const player of roster) {
    player.eligibility.gamesPlayedThisSeason = 0;
    player.stardom = 0;
  }
  const star = roster[0];
  star.homeDivisionId = divisionId;
  star.stardom = PIPELINE_CONTRIBUTOR_STARDOM; // no games played this season at all

  updatePipelineStrength(state);
  assert.equal(program.pipelineStrength[divisionId], PIPELINE_GAIN_PER_CONTRIBUTOR);
});

test("pipeline growth persists through save round-trips deterministically", () => {
  const run = () => {
    const state = activeLeague("recruiting-pipeline-replay", 4);
    const programId = Object.keys(state.programs)[0];
    const roster = Object.values(state.players).filter((player) =>
      player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP");
    for (const player of roster) player.eligibility.gamesPlayedThisSeason = 0;
    roster[0].eligibility.gamesPlayedThisSeason = PIPELINE_CONTRIBUTOR_GAMES;
    updatePipelineStrength(state);
    return state;
  };
  assert.deepEqual(run(), run());
});
