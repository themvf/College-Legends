import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  committedNilTotal,
  freeNilCapacity,
  nilAskingPrice,
  nilScore,
  reservedNilTotal,
  weeklyDonorCapacity,
  NIL_SCORE_CEILING,
  NIL_WITHDRAWAL_INTEREST_PENALTY
} from "../packages/simulation/dist/index.js";
import { planWeeklyCommands } from "../packages/ai/dist/index.js";

const activeLeague = (seed, programCount = 12) => beginSeason(createFictionalLeague(seed, programCount));

/** One step of a career, whichever phase it is in. Offseason steps take no decisions here. */
function advance(state, commands = []) {
  if (state.phase === "ROSTER_REVIEW") return { state: beginSeason(state, commands), events: [] };
  return state.phase === "OFFSEASON" ? advanceOffseasonStep(state, commands) : advanceWeek(state, commands);
}

/** Puts a prospect on a program's board with one evaluation, the minimum an offer requires. */
function discover(state, programId, prospectId) {
  const recruiting = state.recruiting[programId];
  if (!recruiting.discoveredProspectIds.includes(prospectId)) recruiting.discoveredProspectIds.push(prospectId);
  recruiting.scoutingByProspect[prospectId] ??= { evaluations: [], pursuitPoints: 0 };
  if (recruiting.scoutingByProspect[prospectId].evaluations.length === 0) {
    recruiting.scoutingByProspect[prospectId].evaluations.push("BASIC");
  }
}

function availableProspects(state) {
  return Object.values(state.prospects)
    .filter((prospect) => prospect.status === "AVAILABLE")
    .sort((left, right) => left.id.localeCompare(right.id));
}

test("donor capacity is the ceiling and money cannot raise it", () => {
  const state = activeLeague("nil-capacity");
  const [programA, programB] = Object.values(state.programs);
  // Capacity is derived from earned standing, so a richer budget alone moves nothing.
  const before = weeklyDonorCapacity(programA);
  programA.budget += 50_000_000;
  assert.equal(weeklyDonorCapacity(programA), before);
  // Every input the spec names moves it in the right direction.
  const poorer = { ...programB, fanBase: programB.fanBase / 2 };
  assert.ok(weeklyDonorCapacity(poorer) < weeklyDonorCapacity(programB));
  const loved = { ...programB, donorCulture: 1.5 };
  const unloved = { ...programB, donorCulture: 0.6 };
  assert.ok(weeklyDonorCapacity(loved) > weeklyDonorCapacity(unloved));
  const champion = { ...programB, championships: 1 };
  assert.ok(weeklyDonorCapacity(champion) > weeklyDonorCapacity(programB));
});

test("an offer beyond capacity is refused with the reason, and reservations bind", () => {
  const state = activeLeague("nil-cap-binds");
  const programId = Object.keys(state.programs)[0];
  const [first, second] = availableProspects(state);
  discover(state, programId, first.id);
  discover(state, programId, second.id);
  const capacity = weeklyDonorCapacity(state.programs[programId]);

  const over = advanceWeek(state, [
    { type: "SET_NIL_OFFER", programId, prospectId: first.id, weeklyAmount: capacity + 1_000 }
  ]);
  const rejection = over.events.find((event) => event.type === "COMMAND_REJECTED" && event.command.type === "SET_NIL_OFFER");
  assert.ok(rejection, "an offer the donors cannot cover must be refused");
  assert.match(rejection.reason, /donors|capacity/i);

  // A live offer reserves capacity, so the same dollars cannot chase two recruits.
  const reserved = advanceWeek(state, [
    { type: "SET_NIL_OFFER", programId, prospectId: first.id, weeklyAmount: Math.floor(capacity * 0.8) },
    { type: "SET_NIL_OFFER", programId, prospectId: second.id, weeklyAmount: Math.floor(capacity * 0.8) }
  ]);
  const secondRejected = reserved.events.some((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "SET_NIL_OFFER");
  assert.ok(secondRejected, "reserved capacity must count against the ceiling");
  assert.ok(
    committedNilTotal(reserved.state, programId) + reservedNilTotal(reserved.state, programId)
      <= weeklyDonorCapacity(reserved.state.programs[programId]),
    "committed plus reserved dollars can never exceed the ceiling"
  );
});

test("doubling the offer never doubles the return", () => {
  const state = activeLeague("nil-curve");
  const prospect = availableProspects(state)[0];
  const ask = nilAskingPrice(prospect);
  const atAsk = nilScore(ask, ask, prospect);
  const atDouble = nilScore(ask * 2, ask, prospect);
  const atQuad = nilScore(ask * 4, ask, prospect);
  assert.ok(atDouble - atAsk < atAsk, "the second multiple buys less than the first");
  assert.ok(atQuad - atDouble < atDouble - atAsk, "and the curve keeps flattening");
  assert.ok(atQuad <= NIL_SCORE_CEILING * 1.35, "nothing escapes the ceiling");
});

test("money is a tiebreaker: a maxed offer loses to a program the prospect actually wants", () => {
  const state = activeLeague("nil-character");
  const [richId, wantedId] = Object.keys(state.programs);
  // A prospect who wants home or the classroom, courted by a rich outsider.
  const targets = availableProspects(state).filter((prospect) =>
    prospect.priorities.includes("CLOSE_TO_HOME") || prospect.priorities.includes("ACADEMICS"));
  assert.ok(targets.length >= 3, "the class must generate such prospects");
  let wantedWins = 0;
  for (const prospect of targets.slice(0, 6)) {
    prospect.interestByProgram[wantedId] = 78;
    prospect.interestByProgram[richId] = 48;
    discover(state, richId, prospect.id);
    discover(state, wantedId, prospect.id);
    state.recruiting[wantedId].scoutingByProspect[prospect.id].pursuitPoints = 10;
  }
  // The rich program maxes NIL on all of them; the wanted program spends nothing.
  state.programs[richId].fanBase = 400_000;
  state.programs[richId].donorCulture = 1.5;
  const offers = targets.slice(0, 6).map((prospect) => ({
    type: "SET_NIL_OFFER", programId: richId, prospectId: prospect.id,
    weeklyAmount: nilAskingPrice(prospect, state.programs[richId]) * 4
  }));
  let current = advanceWeek(state, offers).state;
  for (let week = 0; week < 13 && current.week <= 14; week += 1) current = advanceWeek(current).state;
  for (const prospect of targets.slice(0, 6)) {
    const settled = current.prospects[prospect.id];
    if (settled.signedProgramId === wantedId) wantedWins += 1;
  }
  assert.ok(wantedWins >= 4, `the wanted program must win most of these (won ${wantedWins} of 6)`);
});

test("a winning offer converts to a commitment, charges weekly, and losers' reservations die", () => {
  const state = activeLeague("nil-commitment");
  const [aId, bId] = Object.keys(state.programs);
  const prospect = availableProspects(state)[0];
  // Make program A overwhelmingly attractive so the contest resolves fast.
  prospect.interestByProgram[aId] = 88;
  prospect.interestByProgram[bId] = 60;
  discover(state, aId, prospect.id);
  discover(state, bId, prospect.id);
  state.recruiting[aId].scoutingByProspect[prospect.id].pursuitPoints = 100;
  const offer = 2_000;
  let current = advanceWeek(state, [
    { type: "SET_NIL_OFFER", programId: aId, prospectId: prospect.id, weeklyAmount: offer },
    { type: "SET_NIL_OFFER", programId: bId, prospectId: prospect.id, weeklyAmount: 1_000 }
  ]);
  let signedEvent = null;
  for (let week = 0; week < 13 && !signedEvent; week += 1) {
    signedEvent = current.events.find((event) => event.type === "NIL_DEAL_SIGNED" && event.prospectId === prospect.id);
    if (!signedEvent) current = advanceWeek(current.state);
  }
  assert.ok(signedEvent, "the deal must be reported when the contest resolves");
  assert.equal(signedEvent.programId, aId);
  assert.equal(signedEvent.weeklyAmount, offer);
  assert.ok(signedEvent.askingPrice > 0);
  const after = current.state;
  assert.equal(after.nil[aId].commitmentsByPlayer[prospect.id], offer, "the offer becomes a commitment");
  assert.equal(after.nil[aId].offersByProspect[prospect.id], undefined, "the winner's offer is spent");
  assert.equal(after.nil[bId]?.offersByProspect[prospect.id], undefined, "the loser's reservation is released");

  // And it charges: the finance line reports it and the budget feels it.
  const next = advanceWeek(after);
  const finances = next.events.find((event) => event.type === "WEEKLY_FINANCES" && event.programId === aId);
  assert.equal(finances.nilSpend, offer, "the weekly finance line must carry the NIL spend");
});

test("withdrawing an offer is remembered as lost interest, deterministically", () => {
  const state = activeLeague("nil-withdrawal");
  const programId = Object.keys(state.programs)[0];
  const prospect = availableProspects(state)[0];
  discover(state, programId, prospect.id);
  const interestBefore = prospect.interestByProgram[programId];
  const offered = advanceWeek(state, [
    { type: "SET_NIL_OFFER", programId, prospectId: prospect.id, weeklyAmount: 1_500 }
  ]);
  assert.equal(offered.state.prospects[prospect.id].interestByProgram[programId], interestBefore, "raising costs nothing");
  const withdrawn = advanceWeek(offered.state, [
    { type: "SET_NIL_OFFER", programId, prospectId: prospect.id, weeklyAmount: 0 }
  ]);
  assert.equal(
    withdrawn.state.prospects[prospect.id].interestByProgram[programId],
    Math.max(0, interestBefore - NIL_WITHDRAWAL_INTEREST_PENALTY),
    "withdrawal costs a flat, deterministic amount of interest"
  );
  assert.equal(withdrawn.state.nil[programId].offersByProspect[prospect.id], undefined);
  assert.equal(freeNilCapacity(withdrawn.state, programId), weeklyDonorCapacity(withdrawn.state.programs[programId]));
});

test("NIL command order cannot decide a contest", () => {
  const build = (commandOrder) => {
    const state = activeLeague("nil-order");
    const [aId, bId] = Object.keys(state.programs);
    const prospect = availableProspects(state)[0];
    discover(state, aId, prospect.id);
    discover(state, bId, prospect.id);
    const commands = [
      { type: "SET_NIL_OFFER", programId: aId, prospectId: prospect.id, weeklyAmount: 1_200 },
      { type: "SET_NIL_OFFER", programId: bId, prospectId: prospect.id, weeklyAmount: 1_150 }
    ];
    return advanceWeek(state, commandOrder === "forward" ? commands : [...commands].reverse());
  };
  assert.deepEqual(build("forward"), build("reversed"));
});

test("a career with NIL commands replays byte-identically", () => {
  const run = () => {
    const state = activeLeague("nil-replay");
    const programId = Object.keys(state.programs)[0];
    const prospect = availableProspects(state)[0];
    discover(state, programId, prospect.id);
    let current = advanceWeek(state, [
      { type: "SET_NIL_OFFER", programId, prospectId: prospect.id, weeklyAmount: 900 }
    ]);
    current = advanceWeek(current.state);
    return current;
  };
  assert.deepEqual(run(), run());
});

test("rivals bid from the same rules, and deals go through the market", () => {
  let state = activeLeague("nil-rivals");
  let nilOfferSeen = false;
  let dealSigned = false;
  for (let week = 0; week < 14 && state.week <= 14; week += 1) {
    const commands = planWeeklyCommands(state);
    if (commands.some((command) => command.type === "SET_NIL_OFFER")) nilOfferSeen = true;
    const result = advanceWeek(state, commands);
    if (result.events.some((event) => event.type === "NIL_DEAL_SIGNED")) dealSigned = true;
    state = result.state;
    for (const programId of Object.keys(state.programs)) {
      assert.ok(
        committedNilTotal(state, programId) + reservedNilTotal(state, programId)
          <= weeklyDonorCapacity(state.programs[programId]) + 1,
        `${programId} must respect its own ceiling`
      );
    }
  }
  assert.ok(nilOfferSeen, "rivals must actually put money on recruits");
  assert.ok(dealSigned, "and some of those offers must become deals");
});

test("the deal follows him to campus and ends when he leaves", () => {
  let state = activeLeague("nil-lifecycle");
  const programId = Object.keys(state.programs)[0];
  // A commitment already keyed to a rostered senior ends at rollover with the reason.
  const senior = Object.values(state.players).find((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP"
    && player.eligibility.seasonsRemaining === 1);
  assert.ok(senior);
  state.nil[programId] = { offersByProspect: {}, commitmentsByPlayer: { [senior.id]: 700 } };
  const seasonStart = state.season;
  let ended = null;
  while (state.season === seasonStart) {
    const result = advance(state);
    state = result.state;
    ended ??= result.events.find((event) => event.type === "NIL_COMMITMENT_ENDED" && event.playerId === senior.id) ?? null;
  }
  assert.ok(ended, "a departing player's deal must be reported as ended");
  assert.equal(ended.weeklyAmount, 700);
  assert.equal(state.nil[programId].commitmentsByPlayer[senior.id], undefined);
  // Rollover clears the board: no offers survive into the next class.
  for (const nil of Object.values(state.nil)) {
    assert.deepEqual(nil.offersByProspect, {});
    // Any surviving commitment key must belong to an enrolled or rostered man.
    for (const id of Object.keys(nil.commitmentsByPlayer)) {
      const prospect = state.prospects[id];
      assert.ok(!prospect || prospect.status === "ENROLLED", "no money follows a recruit who never enrolled");
    }
  }
});
