import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  portalAskingPrice,
  PORTAL_MINIMUM_POINTS
} from "../packages/simulation/dist/index.js";

const activeLeague = (seed, programCount = 12) => beginSeason(createFictionalLeague(seed, programCount));

/** Plays a season out and stops with the portal window open. */
function toPortalWindow(seed, programCount = 12) {
  let state = activeLeague(seed, programCount);
  let events = [];
  while (state.phase !== "OFFSEASON") {
    const result = advanceWeek(state);
    state = result.state;
    events = result.events;
  }
  assert.equal(state.offseasonStep, "PORTAL");
  return { state, events };
}

/** The listings, oldest program first, so a test can name one deterministically. */
function listed(state) {
  return Object.entries(state.portal ?? {}).sort(([left], [right]) => left.localeCompare(right));
}

function scholarshipCount(state, programId) {
  return Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP"
  ).length;
}

test("everyone who leaves is listed, and the listing names his old program", () => {
  const { state, events } = toPortalWindow("portal-listing");
  const entries = listed(state);
  assert.ok(entries.length > 0, "a full season must send somebody to the portal");
  for (const [playerId, listing] of entries) {
    const player = state.players[playerId];
    assert.equal(player.eligibility.rosterStatus, "PORTAL");
    assert.equal(listing.previousProgramId, player.programId);
    assert.equal(listing.priorities.length, 3, "he wants the same kinds of things a recruit does");
    assert.ok(Object.keys(listing.interestByProgram).length === Object.keys(state.programs).length);
  }
  const announced = events.filter((event) => event.type === "PORTAL_PLAYER_LISTED");
  assert.equal(announced.length, entries.length, "every listing is reported");
  assert.ok(announced.every((event) => event.askingPrice > 0));
});

test("a portal price is read off production, and a better player costs more", () => {
  const { state } = toPortalWindow("portal-pricing");
  const [playerId] = listed(state)[0];
  const player = state.players[playerId];
  const cheaper = portalAskingPrice({ ...player, overall: 60 });
  const dearer = portalAskingPrice({ ...player, overall: 85 });
  assert.ok(dearer > cheaper * 2, `production must dominate the price, saw ${cheaper} then ${dearer}`);
  // Same player, same price: nothing about who is asking changes what he wants.
  assert.equal(portalAskingPrice(player), portalAskingPrice(player));
});

test("nobody is left stranded in the portal — every listing resolves", () => {
  let { state } = toPortalWindow("portal-resolves");
  const listedIds = listed(state).map(([playerId]) => playerId);
  assert.ok(listedIds.length > 0);
  const result = advanceOffseasonStep(state);
  state = result.state;
  assert.deepEqual(state.portal, {}, "the window closes empty");
  for (const playerId of listedIds) {
    const status = state.players[playerId].eligibility.rosterStatus;
    assert.ok(
      status === "SCHOLARSHIP" || status === "DEPARTED",
      `${playerId} must land somewhere or leave the level, saw ${status}`
    );
  }
  const unclaimed = result.events.filter((event) => event.type === "PORTAL_PLAYER_UNCLAIMED");
  const signed = result.events.filter((event) => event.type === "PORTAL_PLAYER_SIGNED");
  assert.equal(signed.length + unclaimed.length, listedIds.length, "each listing is reported exactly once");
});

test("a real bid signs him, and he keeps the eligibility he had left", () => {
  let { state } = toPortalWindow("portal-signing");
  const [playerId, listing] = listed(state)[0];
  const player = state.players[playerId];
  const suitorId = Object.keys(state.programs).find((programId) => programId !== listing.previousProgramId);
  const eligibilityBefore = player.eligibility.seasonsRemaining;
  state.recruiting[suitorId].points = 400;
  listing.interestByProgram[suitorId] = 88;

  const result = advanceOffseasonStep(state, [
    { type: "BID_PORTAL_PLAYER", programId: suitorId, playerId, points: 60, weeklyNil: 0 }
  ]);
  state = result.state;
  const signed = result.events.find((event) => event.type === "PORTAL_PLAYER_SIGNED" && event.playerId === playerId);
  assert.ok(signed, "a heavy bid on a willing player must land");
  assert.equal(signed.programId, suitorId);
  assert.equal(signed.retained, false);
  assert.equal(state.players[playerId].programId, suitorId);
  assert.equal(state.players[playerId].eligibility.rosterStatus, "SCHOLARSHIP");
  assert.equal(
    state.players[playerId].eligibility.seasonsRemaining,
    eligibilityBefore,
    "a transfer keeps his clock — that is what makes the portal the fast climb"
  );
  assert.equal(state.recruiting[suitorId].points, 340, "the completed signing spends its bid");
});

test("simultaneous portal wins share scholarship capacity and only the accepted bid is charged", () => {
  const { state } = toPortalWindow("portal-capacity-spend");
  const entries = listed(state).slice(0, 2);
  assert.equal(entries.length, 2, "the fixture needs two players competing for one opening");
  const previousPrograms = new Set(entries.map(([, listing]) => listing.previousProgramId));
  const suitorId = Object.keys(state.programs).find((programId) => !previousPrograms.has(programId));
  const rosterBefore = scholarshipCount(state, suitorId);
  state.programs[suitorId].scholarshipLimit = rosterBefore + 1;
  state.recruiting[suitorId].points = 300;
  const bids = new Map();
  const commands = entries.map(([playerId, listing], index) => {
    listing.interestByProgram[suitorId] = 88;
    const points = index === 0 ? 90 : 70;
    bids.set(playerId, points);
    return { type: "BID_PORTAL_PLAYER", programId: suitorId, playerId, points, weeklyNil: 0 };
  });

  const result = advanceOffseasonStep(state, commands);
  const signings = result.events.filter((event) =>
    event.type === "PORTAL_PLAYER_SIGNED" && event.programId === suitorId);
  assert.equal(signings.length, 1, "one open scholarship can produce only one signing");
  assert.equal(scholarshipCount(result.state, suitorId), rosterBefore + 1);
  assert.ok(scholarshipCount(result.state, suitorId) <= result.state.programs[suitorId].scholarshipLimit);
  assert.equal(
    result.state.recruiting[suitorId].points,
    300 - bids.get(signings[0].playerId),
    "the capacity-displaced bid remains uncharged"
  );
});

test("a weaker portal win is displaced to an eligible runner-up deterministically", () => {
  const run = (reverse) => {
    const { state } = toPortalWindow("portal-capacity-runner-up");
    const entries = listed(state).slice(0, 2);
    assert.equal(entries.length, 2);
    const previousPrograms = new Set(entries.map(([, listing]) => listing.previousProgramId));
    const [primaryId, secondaryId] = Object.keys(state.programs).filter((programId) => !previousPrograms.has(programId)).slice(0, 2);
    const primaryRoster = scholarshipCount(state, primaryId);
    state.programs[primaryId].scholarshipLimit = primaryRoster + 1;
    state.recruiting[primaryId].points = 400;
    state.recruiting[secondaryId].points = 400;
    for (const [, listing] of entries) {
      listing.interestByProgram[primaryId] = 88;
      listing.interestByProgram[secondaryId] = 88;
    }
    const [stronger, displaced] = entries;
    const commands = [
      { type: "BID_PORTAL_PLAYER", programId: primaryId, playerId: stronger[0], points: 200, weeklyNil: 0 },
      { type: "BID_PORTAL_PLAYER", programId: primaryId, playerId: displaced[0], points: 130, weeklyNil: 0 },
      { type: "BID_PORTAL_PLAYER", programId: secondaryId, playerId: displaced[0], points: 70, weeklyNil: 0 }
    ];
    return {
      primaryId,
      secondaryId,
      strongerId: stronger[0],
      displacedId: displaced[0],
      result: advanceOffseasonStep(state, reverse ? [...commands].reverse() : commands)
    };
  };

  const forward = run(false);
  const reversed = run(true);
  assert.deepEqual(forward.result, reversed.result, "command order cannot change allocation");
  assert.equal(forward.result.state.players[forward.strongerId].programId, forward.primaryId);
  assert.equal(
    forward.result.state.players[forward.displacedId].programId,
    forward.secondaryId,
    "the player displaced from a full first choice must fall through to the runner-up"
  );
  assert.equal(forward.result.state.recruiting[forward.primaryId].points, 200);
  assert.equal(forward.result.state.recruiting[forward.secondaryId].points, 330);
});

test("a losing portal bidder keeps both Recruiting Points and uncommitted NIL", () => {
  const { state } = toPortalWindow("portal-loser-free");
  const [playerId, listing] = listed(state)[0];
  const [winnerId, loserId] = Object.keys(state.programs).filter((programId) => programId !== listing.previousProgramId).slice(0, 2);
  state.recruiting[winnerId].points = 300;
  state.recruiting[loserId].points = 300;
  listing.interestByProgram[winnerId] = 88;
  listing.interestByProgram[loserId] = 88;

  const result = advanceOffseasonStep(state, [
    { type: "BID_PORTAL_PLAYER", programId: winnerId, playerId, points: 140, weeklyNil: 2 },
    { type: "BID_PORTAL_PLAYER", programId: loserId, playerId, points: 60, weeklyNil: 1 }
  ]);
  const signed = result.events.find((event) => event.type === "PORTAL_PLAYER_SIGNED" && event.playerId === playerId);
  assert.equal(signed.programId, winnerId);
  assert.equal(result.state.recruiting[winnerId].points, 160);
  assert.equal(result.state.recruiting[loserId].points, 300, "losing bids are reservations, not spends");
  assert.equal(result.state.nil?.[winnerId]?.commitmentsByPlayer[playerId], 2);
  assert.equal(result.state.nil?.[loserId]?.commitmentsByPlayer[playerId], undefined);
});

test("portal resolution defensively refuses aggregate wins it cannot afford", () => {
  const { state } = toPortalWindow("portal-defensive-points");
  const entries = listed(state).slice(0, 2);
  assert.equal(entries.length, 2);
  const previousPrograms = new Set(entries.map(([, listing]) => listing.previousProgramId));
  const suitorId = Object.keys(state.programs).find((programId) => !previousPrograms.has(programId));
  const rosterBefore = scholarshipCount(state, suitorId);
  state.programs[suitorId].scholarshipLimit = rosterBefore + 2;
  state.recruiting[suitorId].points = 100;
  // Bypass command validation to represent an imported/hand-edited state whose
  // live bid portfolio is no longer backed by its Recruiting Points balance.
  for (const [, listing] of entries) {
    listing.interestByProgram[suitorId] = 88;
    listing.bidsByProgram[suitorId] = { points: 80, weeklyNil: 0 };
  }

  const result = advanceOffseasonStep(state);
  const signings = result.events.filter((event) =>
    event.type === "PORTAL_PLAYER_SIGNED" && event.programId === suitorId);
  assert.equal(signings.length, 1);
  assert.equal(result.state.recruiting[suitorId].points, 20);
  assert.ok(result.state.recruiting[suitorId].points >= 0);
});

test("the program he is leaving can bid to keep him, and that is a retention", () => {
  let { state } = toPortalWindow("portal-retention");
  const [playerId, listing] = listed(state)[0];
  const incumbentId = listing.previousProgramId;
  state.recruiting[incumbentId].points = 400;
  listing.interestByProgram[incumbentId] = 88;

  const result = advanceOffseasonStep(state, [
    { type: "BID_PORTAL_PLAYER", programId: incumbentId, playerId, points: 60, weeklyNil: 0 }
  ]);
  state = result.state;
  const signed = result.events.find((event) => event.type === "PORTAL_PLAYER_SIGNED" && event.playerId === playerId);
  assert.ok(signed, "his own program bidding is a bid like any other");
  assert.equal(signed.programId, incumbentId);
  assert.equal(signed.retained, true, "keeping your own man is reported as a retention");
  assert.equal(state.players[playerId].programId, incumbentId);
  assert.equal(state.players[playerId].eligibility.rosterStatus, "SCHOLARSHIP");
});

test("the same bid is worth more from the program he is leaving", () => {
  // One bidder, one bid, measured twice — the only thing that changes between
  // the runs is whether he is the man's current program. Comparing two
  // *different* programs would measure their facilities and press instead.
  const bid = (bidderIsIncumbent) => {
    const { state } = toPortalWindow("portal-incumbency");
    const [playerId, listing] = listed(state)[0];
    const bidderId = listing.previousProgramId;
    const someoneElse = Object.keys(state.programs).find((programId) => programId !== bidderId);
    listing.previousProgramId = bidderIsIncumbent ? bidderId : someoneElse;
    state.recruiting[bidderId].points = 400;
    const result = advanceOffseasonStep(state, [
      { type: "BID_PORTAL_PLAYER", programId: bidderId, playerId, points: 30, weeklyNil: 0 }
    ]);
    return result.events.find((event) => event.type === "PORTAL_PLAYER_SIGNED" && event.playerId === playerId);
  };
  const asIncumbent = bid(true);
  const asOutsider = bid(false);
  assert.ok(asIncumbent && asOutsider, "both bids should be strong enough to sign him");
  assert.ok(
    asIncumbent.score > asOutsider.score,
    `the program he already knows must price in that relationship, saw ${asIncumbent.score} vs ${asOutsider.score}`
  );
  assert.equal(asIncumbent.retained, true);
  assert.equal(asOutsider.retained, false);
});

test("a token bid is refused, and so is one the program cannot cover", () => {
  const { state } = toPortalWindow("portal-limits");
  const [playerId, listing] = listed(state)[0];
  const suitorId = Object.keys(state.programs).find((programId) => programId !== listing.previousProgramId);
  state.recruiting[suitorId].points = 20;

  const tokenBid = advanceOffseasonStep(state, [
    { type: "BID_PORTAL_PLAYER", programId: suitorId, playerId, points: PORTAL_MINIMUM_POINTS - 1, weeklyNil: 0 }
  ]);
  const tokenRejection = tokenBid.events.find((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "BID_PORTAL_PLAYER");
  assert.ok(tokenRejection, "a nominal bid on everybody is not a decision");
  assert.match(tokenRejection.reason, /Recruiting Points/i);

  const overspend = advanceOffseasonStep(state, [
    { type: "BID_PORTAL_PLAYER", programId: suitorId, playerId, points: 200, weeklyNil: 0 }
  ]);
  const overspendRejection = overspend.events.find((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "BID_PORTAL_PLAYER");
  assert.ok(overspendRejection, "a program cannot bid points it does not have");
  assert.match(overspendRejection.reason, /Recruiting Points/i);
});

test("bids are absolute, so re-bidding replaces rather than stacks", () => {
  const { state } = toPortalWindow("portal-absolute");
  const [playerId, listing] = listed(state)[0];
  const suitorId = Object.keys(state.programs).find((programId) => programId !== listing.previousProgramId);
  state.recruiting[suitorId].points = 400;

  const once = advanceOffseasonStep(state, [
    { type: "BID_PORTAL_PLAYER", programId: suitorId, playerId, points: 40, weeklyNil: 0 }
  ]);
  const twice = advanceOffseasonStep(state, [
    { type: "BID_PORTAL_PLAYER", programId: suitorId, playerId, points: 10, weeklyNil: 0 },
    { type: "BID_PORTAL_PLAYER", programId: suitorId, playerId, points: 40, weeklyNil: 0 }
  ]);
  const first = once.events.find((event) => event.type === "PORTAL_PLAYER_SIGNED" && event.playerId === playerId);
  const second = twice.events.find((event) => event.type === "PORTAL_PLAYER_SIGNED" && event.playerId === playerId);
  assert.deepEqual(first, second, "the last bid stands alone; earlier ones are not added to it");
});

test("bid order cannot decide who wins", () => {
  const build = (order) => {
    const { state } = toPortalWindow("portal-order");
    const [playerId, listing] = listed(state)[0];
    const others = Object.keys(state.programs).filter((programId) => programId !== listing.previousProgramId);
    const [firstId, secondId] = others;
    state.recruiting[firstId].points = 400;
    state.recruiting[secondId].points = 400;
    const commands = [
      { type: "BID_PORTAL_PLAYER", programId: firstId, playerId, points: 40, weeklyNil: 0 },
      { type: "BID_PORTAL_PLAYER", programId: secondId, playerId, points: 38, weeklyNil: 0 }
    ];
    return advanceOffseasonStep(state, order === "forward" ? commands : [...commands].reverse());
  };
  assert.deepEqual(build("forward"), build("reversed"));
});

test("a portal window replays byte-identically", () => {
  const run = () => {
    const { state } = toPortalWindow("portal-replay");
    const [playerId, listing] = listed(state)[0];
    const suitorId = Object.keys(state.programs).find((programId) => programId !== listing.previousProgramId);
    let current = advanceOffseasonStep(state, [
      { type: "BID_PORTAL_PLAYER", programId: suitorId, playerId, points: 30, weeklyNil: 500 }
    ]).state;
    while (current.phase === "OFFSEASON") current = advanceOffseasonStep(current).state;
    return current;
  };
  assert.deepEqual(run(), run());
});
