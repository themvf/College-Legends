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
  BUYOUT_SALARY_FRACTION,
  TRAINING_CAMP_INSTALL_BONUS,
  TRAINING_CAMP_WEEKS
} from "../packages/simulation/dist/index.js";

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
    assert.equal(state.phase, "REGULAR_SEASON");
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
