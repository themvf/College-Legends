import test from "node:test";
import assert from "node:assert/strict";
import { coachingPlanningKnowledgeView, planOffseasonCommands, planWeeklyCommands, portalPlanningKnowledgeViews, trainingCampPlanningKnowledgeView } from "../packages/ai/dist/index.js";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  decisionKnowledgeFor
} from "../packages/simulation/dist/index.js";
import { advanceHeadlessCareerStep } from "../apps/simulator-cli/dist/orchestration.js";

function withoutAttributionEvent(event) {
  const {
    decisionCauseId: _decisionCauseId,
    decisionOutcomeCauseIds: _decisionOutcomeCauseIds,
    weeklyPrioritySubmissionId: _weeklyPrioritySubmissionId,
    scoutingTargetSubmissionId: _scoutingTargetSubmissionId,
    ...domainEvent
  } = event;
  return domainEvent;
}

function withoutAttributionState(value) {
  const state = structuredClone(value);
  state.decisionAudits = [];
  state.decisionKnowledge = {};
  state.eventHistory = state.eventHistory.map(withoutAttributionEvent);
  return state;
}

function domainEvents(events) {
  return events
    .filter((event) => event.type !== "DECISION_AUDITED")
    .map(withoutAttributionEvent);
}

function assertLegacyParity(attributed, legacy) {
  assert.deepEqual(withoutAttributionState(attributed.state), withoutAttributionState(legacy.state));
  assert.deepEqual(domainEvents(attributed.events), legacy.events.map(withoutAttributionEvent));
}

test("the headless roster-review boundary preserves legacy CLI setup semantics", () => {
  const state = createFictionalLeague("cli-roster-review", 4);
  const legacy = { state: beginSeason(state), events: [] };
  const attributed = advanceHeadlessCareerStep(state);

  assertLegacyParity(attributed, legacy);
  assert.deepEqual(attributed.events, []);
});

test("the simulator CLI records every weekly AI command without changing simulation semantics", () => {
  const state = beginSeason(createFictionalLeague("cli-weekly-lifecycle", 4));
  const commands = planWeeklyCommands(state);
  const legacy = advanceWeek(state, commands);
  const attributed = advanceHeadlessCareerStep(state);

  assertLegacyParity(attributed, legacy);
  assert.equal(attributed.state.decisionAudits?.length, commands.length);
  assert.ok(attributed.state.decisionAudits?.every((audit) =>
    audit.actor.mode === "AI"
    && audit.actor.policyId === "weekly-plan-v1"
    && audit.status === "DONE"
    && audit.causes.length === 1));
  const planningAudits = attributed.state.decisionAudits?.filter((audit) =>
    audit.commandType === "SET_WEEK_FOCUS" || audit.commandType === "SET_SCOUTING_TARGET") ?? [];
  assert.ok(planningAudits.length > 0);
  assert.ok(planningAudits.every((audit) => decisionKnowledgeFor(attributed.state, audit).facts.some((fact) =>
    fact.key === "weeklyPlanning.view.v1")));
  assert.deepEqual(advanceHeadlessCareerStep(state), attributed, "the attributed CLI boundary must replay deterministically");
});

test("the simulator CLI uses attributed resolution at every offseason boundary", () => {
  let state = beginSeason(createFictionalLeague("coaching-view-0", 4));
  while (state.phase !== "OFFSEASON") {
    state = advanceWeek(state, planWeeklyCommands(state)).state;
  }

  const visited = [];
  while (state.phase === "OFFSEASON") {
    visited.push(state.offseasonStep);
    const portalViews = state.offseasonStep === "PORTAL" ? portalPlanningKnowledgeViews(state) : undefined;
    const commands = planOffseasonCommands(state);
    const legacy = advanceOffseasonStep(state, commands);
    const attributed = advanceHeadlessCareerStep(state);

    assertLegacyParity(attributed, legacy);
    const expectedAudits = commands.filter((command) => command.type !== "CONTINUE_OFFSEASON").length;
    assert.equal(attributed.state.decisionAudits?.length, expectedAudits);
    const audits = attributed.state.decisionAudits ?? [];
    assert.ok(audits.every((audit) =>
      audit.actor.mode === "AI"
      && audit.actor.policyId === "offseason-plan-v1"
      && audit.status === "DONE"
      && !audit.outcomePending
      && audit.causes.length > 0));
    const immediateCauseIds = new Set(attributed.events
      .map((event) => event.decisionCauseId)
      .filter(Boolean));
    const outcomeCauseIds = new Set(attributed.events
      .flatMap((event) => event.decisionOutcomeCauseIds ?? []));
    assert.ok(audits.every((audit) => audit.causes.every((cause) => immediateCauseIds.has(cause.id))));
    assert.ok(audits.every((audit) => audit.resolution !== "STANDING"
      || (audit.standingOutcome !== null
        && audit.standingOutcome.causes.length > 0
        && audit.standingOutcome.causes.every((cause) => outcomeCauseIds.has(cause.id)))));
    if (state.offseasonStep === "PORTAL") {
      const bidAudits = audits.filter((candidate) => candidate.commandType === "BID_PORTAL_PLAYER");
      assert.equal(bidAudits.length, commands.filter((command) => command.type === "BID_PORTAL_PLAYER").length);
      assert.ok(bidAudits.length > 0, "the fixture must exercise attributed portal bids");
      for (const audit of bidAudits) {
        const fact = decisionKnowledgeFor(attributed.state, audit).facts.find((candidate) => candidate.key === "portalPlanning.view.v1");
        assert.ok(fact);
        assert.deepEqual(JSON.parse(fact.value), portalViews[audit.programId]);
        assert.deepEqual(audit.causes.map((cause) => cause.eventType), ["PORTAL_BID_SET"]);
        assert.ok(["PORTAL_PLAYER_SIGNED", "PORTAL_PLAYER_UNCLAIMED"]
          .includes(audit.standingOutcome.causes[0].eventType));
      }
    }
    if (state.offseasonStep === "COACHING") {
      const audit = audits.find((candidate) => candidate.commandType === "REPLACE_STAFF");
      assert.ok(audit, "the fixture must exercise a real coaching replacement");
      const fact = decisionKnowledgeFor(attributed.state, audit).facts.find((candidate) => candidate.key === "coachingPlanning.view.v1");
      assert.ok(fact);
      assert.deepEqual(JSON.parse(fact.value), coachingPlanningKnowledgeView(state, audit.programId));
      assert.deepEqual(audit.causes.map((cause) => cause.eventType), ["STAFF_REPLACED"]);
    }
    if (state.offseasonStep === "TRAINING_CAMP") {
      const campAudits = audits.filter((candidate) => candidate.commandType === "SET_TRAINING_CAMP_FOCUS");
      assert.equal(campAudits.length, Object.keys(state.programs).length);
      for (const audit of campAudits) {
        const fact = decisionKnowledgeFor(attributed.state, audit).facts.find((candidate) => candidate.key === "trainingCampPlanning.view.v1");
        assert.ok(fact);
        assert.deepEqual(JSON.parse(fact.value), trainingCampPlanningKnowledgeView(state, audit.programId));
        assert.deepEqual(audit.causes.map((cause) => cause.eventType), ["TRAINING_CAMP_SET"]);
      }
    }
    assert.deepEqual(advanceHeadlessCareerStep(state), attributed, `${state.offseasonStep} must replay deterministically`);
    state = legacy.state;
  }

  assert.deepEqual(visited, ["PORTAL", "SIGNING_DAY", "COACHING", "TRAINING_CAMP"]);
});
