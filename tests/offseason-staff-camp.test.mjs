import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  planExecution,
  playerInjuryRisk,
  staffBuyout,
  staffCandidatesFor,
  arrivingStaffId,
  staffCard,
  installIfScheme,
  coachSchemeFit,
  BUYOUT_SALARY_FRACTION,
  TRAINING_CAMP_INSTALL_BONUS,
  TRAINING_CAMP_WEEKS
} from "../packages/simulation/dist/index.js";
import { planWeeklyCommands, planOffseasonCommands } from "../packages/ai/dist/index.js";

const activeLeague = (seed, programCount = 12) => beginSeason(createFictionalLeague(seed, programCount));

function toStep(seed, step, programCount = 4) {
  let state = activeLeague(seed, programCount);
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;
  while (state.offseasonStep !== step) state = advanceOffseasonStep(state).state;
  return state;
}

/** A post on this program with a candidate the program can actually hire. */
function hirablePost(state, programId) {
  for (const member of Object.values(state.staff)) {
    if (member.programId !== programId) continue;
    const candidate = staffCandidatesFor(state, programId, member.id).find((option) => !option.unavailableReason);
    if (candidate) return { member, candidate };
  }
  throw new Error("no hirable post found");
}

test("letting a coach go costs a buyout priced off what he was earning", () => {
  const state = activeLeague("buyout-price");
  const programId = Object.keys(state.programs)[0];
  const { member } = hirablePost(state, programId);
  assert.equal(staffBuyout(member), Math.round(member.salary * BUYOUT_SALARY_FRACTION));
  assert.ok(staffBuyout(member) > 0, "a buyout is a real cost, not a formality");
  // Steep at the top, because staffSalary is: an elite coach is expensive to fire.
  assert.ok(staffBuyout({ salary: 4_000_000 }) > staffBuyout({ salary: 400_000 }) * 5);
});

test("replacing a coach charges the buyout as well as the signing cost", () => {
  const state = activeLeague("buyout-charged");
  const programId = Object.keys(state.programs)[0];
  const { member, candidate } = hirablePost(state, programId);
  state.programs[programId].budget = 60_000_000;
  const budgetBefore = state.programs[programId].budget;
  const expectedBuyout = staffBuyout(member);

  const result = advanceWeek(state, [
    { type: "REPLACE_STAFF", programId, staffId: member.id, candidateId: candidate.id }
  ]);
  const replaced = result.events.find((event) => event.type === "STAFF_REPLACED");
  assert.ok(replaced, "the hire must go through");
  assert.equal(replaced.buyoutCost, expectedBuyout, "the event posts what the firing actually cost");

  // Weekly finances move the budget too, so measure against a week with no hire.
  const baseline = advanceWeek(state);
  const spent = baseline.state.programs[programId].budget - result.state.programs[programId].budget;
  assert.equal(
    spent,
    candidate.signingCost + expectedBuyout,
    "both halves of a coaching change are charged, not just the incoming man"
  );
  assert.ok(budgetBefore > 0);
});

test("a program that cannot cover the buyout is refused with the reason", () => {
  const state = activeLeague("buyout-unaffordable");
  const programId = Object.keys(state.programs)[0];
  const { member, candidate } = hirablePost(state, programId);
  // Enough for the incoming man alone, not for the man being let go as well.
  state.programs[programId].budget = candidate.signingCost + staffBuyout(member) - 1;
  const result = advanceWeek(state, [
    { type: "REPLACE_STAFF", programId, staffId: member.id, candidateId: candidate.id }
  ]);
  const rejection = result.events.find((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "REPLACE_STAFF");
  assert.ok(rejection, "a hire the program cannot fully afford must be refused");
  assert.match(rejection.reason, /buyout/i);
  assert.ok(result.events.every((event) => event.type !== "STAFF_REPLACED"));
});

test("the coaching step is when the market is open, and only then", () => {
  const portalStep = toStep("coaching-step-gate", "PORTAL");
  const programId = Object.keys(portalStep.programs)[0];
  const { member, candidate } = hirablePost(portalStep, programId);
  portalStep.programs[programId].budget = 60_000_000;

  const tooEarly = advanceOffseasonStep(portalStep, [
    { type: "REPLACE_STAFF", programId, staffId: member.id, candidateId: candidate.id }
  ]);
  const rejection = tooEarly.events.find((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "REPLACE_STAFF");
  assert.ok(rejection, "the coaching market is not open during the portal window");
  assert.match(rejection.reason, /transfer portal/i);

  const coachingStep = toStep("coaching-step-gate", "COACHING");
  const post = hirablePost(coachingStep, programId);
  coachingStep.programs[programId].budget = 60_000_000;
  const onTime = advanceOffseasonStep(coachingStep, [
    { type: "REPLACE_STAFF", programId, staffId: post.member.id, candidateId: post.candidate.id }
  ]);
  assert.ok(
    onTime.events.some((event) => event.type === "STAFF_REPLACED"),
    "and it is open at the step that exists for it"
  );
});

test("camp on the playbook buys execution and camp on conditioning buys health", () => {
  const programId = "program-1";
  const run = (focus) => {
    let state = toStep("camp-effects", "TRAINING_CAMP");
    state = advanceOffseasonStep(state, focus
      ? [{ type: "SET_TRAINING_CAMP_FOCUS", programId, focus }]
      : []).state;
    assert.equal(state.phase, "ROSTER_REVIEW");
    state = beginSeason(state);
    const player = Object.values(state.players).find((candidate) =>
      candidate.programId === programId && candidate.eligibility.rosterStatus === "SCHOLARSHIP");
    return {
      execution: planExecution(state, programId, "OFFENSE").expected,
      risk: playerInjuryRisk(state, player).riskWithoutCoachPercent,
      camp: state.trainingCamp?.[programId]
    };
  };
  const balanced = run("BALANCED");
  const install = run("INSTALL");
  const conditioning = run("CONDITIONING");
  const skipped = run(null);

  assert.ok(
    Math.abs(install.execution - (balanced.execution + TRAINING_CAMP_INSTALL_BONUS)) < 1e-6,
    `installing must buy exactly the posted head start, saw ${balanced.execution} then ${install.execution}`
  );
  assert.ok(install.risk > balanced.risk, "and it is paid for in health");
  assert.equal(conditioning.execution, balanced.execution, "conditioning buys no head start");
  assert.ok(conditioning.risk < balanced.risk, "it buys the health instead");
  // Skipping the step and choosing BALANCED must be indistinguishable on the
  // field. They differ only in whether a record was stored, which nothing reads.
  assert.equal(skipped.execution, balanced.execution, "taking no decision is the balanced default");
  assert.equal(skipped.risk, balanced.risk, "taking no decision is the balanced default");
  assert.equal(install.camp.weeksRemaining, TRAINING_CAMP_WEEKS);
});

test("camp is a head start, not a season-long buff", () => {
  const programId = "program-1";
  let state = toStep("camp-expiry", "TRAINING_CAMP");
  state = advanceOffseasonStep(state, [
    { type: "SET_TRAINING_CAMP_FOCUS", programId, focus: "INSTALL" }
  ]).state;
  state = beginSeason(state);
  const opening = planExecution(state, programId, "OFFENSE").expected;
  for (let week = 0; week < TRAINING_CAMP_WEEKS; week += 1) state = advanceWeek(state).state;
  assert.equal(state.trainingCamp[programId].weeksRemaining, 0, "camp runs out");
  const later = planExecution(state, programId, "OFFENSE").expected;
  assert.ok(
    later < opening,
    `the head start must expire, saw ${opening} at the opener and ${later} after ${TRAINING_CAMP_WEEKS} weeks`
  );
});

test("a camp focus sent to the wrong step is refused", () => {
  const state = toStep("camp-wrong-step", "SIGNING_DAY");
  const programId = Object.keys(state.programs)[0];
  const result = advanceOffseasonStep(state, [
    { type: "SET_TRAINING_CAMP_FOCUS", programId, focus: "INSTALL" }
  ]);
  const rejection = result.events.find((event) => event.type === "COMMAND_REJECTED");
  assert.ok(rejection);
  assert.match(rejection.reason, /signing day/i);
});

test("every coaching market holds somebody who runs what the program runs", () => {
  // The dashboard raises a REQUIRED item on a coordinator whose scheme fit is
  // under 0.78 — "replace him, or change what you run" — and scheme is only
  // changeable in the preseason. So if the market cannot beat that same
  // threshold, neither branch of the instruction can be taken and the item
  // stands for the rest of the career, which is what a cold player hit.
  //
  // Measured across these six leagues before the fix: 5 of 50 flagged posts
  // (10%) had no reachable candidate clearing 0.78, and 3 (6%) had nobody
  // better than the incumbent at all. Systematic, not a property of one seed —
  // each candidate drew his schemes independently and uniformly, so with six
  // candidates a program could simply come up empty.
  let flagged = 0;
  for (const seed of ["m1", "m2", "m3", "m4", "m5", "m6"]) {
    const state = createFictionalLeague(seed, 24);
    for (const member of Object.values(state.staff)) {
      if (member.role !== "OFFENSIVE_COORDINATOR" && member.role !== "DEFENSIVE_COORDINATOR") continue;
      const program = state.programs[member.programId];
      const reachable = staffCandidatesFor(state, program.id, member.id)
        .filter((candidate) => !candidate.unavailableReason);
      assert.ok(
        reachable.some((candidate) => candidate.schemeFit >= 0.78),
        `${program.name} can never resolve its ${member.role} — no reachable candidate coaches the scheme`
      );
      const incumbentFit = coachSchemeFit(member, program.schemeIdentity);
      if (incumbentFit >= 0.78) continue;
      flagged += 1;
      assert.ok(
        Math.max(...reachable.map((candidate) => candidate.schemeFit)) > incumbentFit,
        `${program.name}'s ${member.role} is flagged with nobody better available`
      );
    }
  }
  // If nothing is ever flagged the assertions above are vacuous.
  assert.ok(flagged > 0, "these seeds must actually raise the item this test is about");
});

test("the scheme picker's install number is the same number the staff card posts", () => {
  // A card that disagrees with the engine breaks "payoffs are visible", which
  // is an invariant rather than a nicety — and the scheme picker now posts an
  // install percentage per option, which is a second place for the same
  // arithmetic to live. Both read one shared function; this is what keeps them
  // honest if somebody edits one of them.
  const state = createFictionalLeague("install-per-scheme", 12);
  for (const programId of ["program-1", "program-5", "program-9"]) {
    const program = state.programs[programId];
    for (const [side, scheme, role] of [
      ["OFFENSE", program.schemeIdentity.offense, "OFFENSIVE_COORDINATOR"],
      ["DEFENSE", program.schemeIdentity.defense, "DEFENSIVE_COORDINATOR"]
    ]) {
      const coordinator = Object.values(state.staff)
        .find((member) => member.programId === programId && member.role === role);
      assert.ok(coordinator);
      const card = staffCard(state, programId, coordinator.id)
        .find((modifier) => modifier.label.startsWith("Gets your"));
      assert.ok(card, "a coordinator card must post an install percentage");
      assert.equal(
        `${installIfScheme(state, programId, side, scheme)}% before practice reps`,
        card.value,
        `${programId} ${side}: the picker and the card must agree about the scheme actually being run`
      );
    }
  }

  // And it has to actually discriminate, or the line it prints says nothing.
  const spreads = Object.values(state.programs).map((program) => {
    const installs = ["POWER_RUN", "TRIPLE_OPTION", "SPREAD_TEMPO", "PRO_BALANCED", "AIR_RAID"]
      .map((scheme) => installIfScheme(state, program.id, "OFFENSE", scheme))
      .filter((value) => value !== null);
    return Math.max(...installs) - Math.min(...installs);
  });
  const median = [...spreads].sort((left, right) => left - right)[Math.floor(spreads.length / 2)];
  assert.ok(median >= 4, `which scheme a coordinator knows must be worth something (median spread ${median})`);
});

test("the coaching market does not offer the coach who already holds the post", () => {
  // A hire keeps the market's candidate id inside the staff id it derives, so
  // the man just appointed reappeared in his own replacement list the next time
  // it was opened — with a signing cost beside him. The engine refuses it
  // ("He already has the job."), but a market that offers somebody the engine
  // would refuse is a screen contradicting itself before anybody clicks.
  const state = createFictionalLeague("market-incumbent", 12);
  const programId = "program-1";
  const post = Object.values(state.staff)
    .find((member) => member.programId === programId && member.role === "OFFENSIVE_COORDINATOR");
  assert.ok(post);

  const offered = staffCandidatesFor(state, programId, post.id);
  assert.ok(offered.length > 1, "the market must offer somebody to begin with");

  // Put the first candidate in the chair exactly as a hire does, then reopen
  // the market for the post he now holds.
  const target = offered[0];
  const arriving = arrivingStaffId(programId, target.id);
  const hired = { ...state, staff: { ...state.staff } };
  delete hired.staff[post.id];
  hired.staff[arriving] = { ...post, id: arriving, name: target.name, rating: target.rating };

  const reopened = staffCandidatesFor(hired, programId, arriving);
  assert.ok(
    !reopened.some((candidate) => candidate.id === target.id),
    "the man in the chair must not be offered his own job"
  );
  assert.equal(reopened.length, offered.length - 1, "and only he should be missing");

  // The rest of the market is unchanged: it is keyed on the post so a player
  // can go back to a coach they passed over, and filtering must not re-roll it.
  assert.deepEqual(
    reopened.map((candidate) => candidate.id).sort(),
    offered.filter((candidate) => candidate.id !== target.id).map((candidate) => candidate.id).sort()
  );

  // And it must remove the man himself, not a slot number. The candidate id
  // must carry the season, because the draw behind it already does: slot 0 in
  // 2029 is a different person from slot 0 in 2027.
  assert.ok(
    target.id.includes(String(state.season)),
    `a candidate id must be season-scoped, saw ${target.id}`
  );
});

test("hiring a coach does not close later seasons' markets against a stranger", () => {
  // The incumbent filter matched on a staff id derived from the candidate id,
  // and that id carried no season while the draw behind it did — so a coach
  // hired from slot k filtered slot k out of that post's market in every later
  // season, against a different man entirely. Slot 0 is the coverage guarantee
  // from issue 2026-09-04-04, so this silently reinstated that defect in exactly
  // the posts it was written to protect: 10 of 768 coordinator posts had nobody
  // on-scheme to hire, and 22 of 1,824 preseason scheme switches left both
  // branches of a REQUIRED item unavailable.
  //
  // The test that was supposed to guard issue 04 ran at `createFictionalLeague`
  // — season zero, nobody has hired, the filter has nothing to remove. Wrong
  // scale. This one plays seasons so the market has a history.
  let checked = 0;
  for (const seed of ["r1", "r2"]) {
    let state = beginSeason(createFictionalLeague(seed, 24));
    for (let season = 0; season < 3; season += 1) {
      for (const member of Object.values(state.staff)) {
        if (member.role !== "OFFENSIVE_COORDINATOR" && member.role !== "DEFENSIVE_COORDINATOR") continue;
        const reachable = staffCandidatesFor(state, member.programId, member.id)
          .filter((candidate) => !candidate.unavailableReason);
        checked += 1;
        assert.ok(
          reachable.some((candidate) => candidate.schemeFit >= 0.78),
          `${member.programId} ${member.role} in season ${state.season} has nobody on-scheme to hire`
        );
      }
      while (state.phase === "REGULAR_SEASON") state = advanceWeek(state, planWeeklyCommands(state)).state;
      while (state.phase === "OFFSEASON") state = advanceOffseasonStep(state, planOffseasonCommands(state)).state;
      if (state.phase === "ROSTER_REVIEW") state = beginSeason(state);
    }
  }
  assert.ok(checked > 200, `the sweep must cover real seasons, saw ${checked} posts`);
});
