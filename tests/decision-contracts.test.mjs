import test from "node:test";
import assert from "node:assert/strict";
import { DECISION_STATUSES } from "../packages/model/dist/index.js";
import {
  beginSeason,
  advanceWeek,
  advanceWeekWithDecisions,
  advanceOffseasonStepWithDecisions,
  canTransitionDecisionStatus,
  commitWeeklyDecision,
  commitWeeklyDecisions,
  createDecisionProjection,
  createDelegatedWeeklyPlanningDecision,
  createFictionalLeague,
  createGameDecision,
  createWeeklyPlanningDecision,
  decodeSave,
  decisionCommandKey,
  decisionKnowledgeFor,
  encodeSave,
  prepareWeekWithDecisions,
  submitDecisionProjection
} from "../packages/simulation/dist/index.js";
import { planWeeklyCommands, weeklyPlanningKnowledgeSnapshot } from "../packages/ai/dist/index.js";

const activeLeague = (seed) => beginSeason(createFictionalLeague(seed, 4));

const portalWindow = (seed) => {
  let state = beginSeason(createFictionalLeague(seed, 12));
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;
  assert.equal(state.offseasonStep, "PORTAL");
  return state;
};

const knowledgeFor = (state, programId) => ({
  programId,
  season: state.season,
  week: state.week,
  phase: state.phase,
  facts: [{
    key: "staff.scoutingCapacity",
    value: 4,
    source: "PROGRAM_INTERNAL",
    entityId: programId,
    observedSeason: state.season,
    observedWeek: state.week
  }]
});

const previewFor = (state, actor, status = "REQUIRED", focuses = ["SCOUT"]) => {
  const programId = "program-1";
  const knowledge = knowledgeFor(state, programId);
  return createDecisionProjection({
    id: `week-focus:${state.season}:${state.week}:${programId}`,
    status,
    actor,
    programId
  }, { type: "SET_WEEK_FOCUS", programId, focuses }, knowledge, (visible) => [{
      key: "scouting-output",
      domain: "FOOTBALL",
      unit: "SCOUTING_POINTS",
      low: 1,
      high: Number(visible.facts.find((fact) => fact.key === "staff.scoutingCapacity")?.value ?? 1),
      confidence: 1,
      source: "planWeekHours"
    }]);
};

const recordFor = (state, actor, status = "REQUIRED", focuses = ["SCOUT"]) =>
  submitDecisionProjection(previewFor(state, actor, status, focuses), {
    season: state.season,
    week: state.week,
    phase: state.phase,
    sequence: 0
  });

const withoutDecisionAudit = (state) => ({
  ...state,
  decisionAudits: [],
  decisionKnowledge: {},
  eventHistory: withoutPayoffAttribution(state.eventHistory.map((event) => {
    const { decisionCauseId: _decisionCauseId, ...domainEvent } = event;
    return domainEvent;
  }))
});

test("the shared status vocabulary has one explicit lifecycle", () => {
  assert.deepEqual(DECISION_STATUSES, [
    "REQUIRED", "OPTIONAL", "DELEGATED", "PENDING", "DONE", "BLOCKED"
  ]);
  assert.equal(canTransitionDecisionStatus("REQUIRED", "PENDING"), true);
  assert.equal(canTransitionDecisionStatus("DELEGATED", "PENDING"), true);
  assert.equal(canTransitionDecisionStatus("PENDING", "BLOCKED"), true);
  assert.equal(canTransitionDecisionStatus("PENDING", "DONE"), true);
  assert.equal(canTransitionDecisionStatus("DELEGATED", "DONE"), false);
  assert.equal(canTransitionDecisionStatus("DONE", "REQUIRED"), false);
  assert.equal(canTransitionDecisionStatus("BLOCKED", "DONE"), false);
});

test("decision projections are immutable, knowledge-bounded, and canonically identified", () => {
  const state = activeLeague("decision-projection-contract");
  const actor = { mode: "MANUAL", actorId: "user-1", displayName: "Head Coach" };
  const projection = previewFor(state, actor, "REQUIRED");

  assert.ok(Object.isFrozen(projection));
  assert.ok(Object.isFrozen(projection.item));
  assert.ok(Object.isFrozen(projection.command));
  assert.equal("command" in projection.item, false, "an unresolved item must not fabricate a command");
  assert.throws(() => projection.command.focuses.push("RECRUIT"), TypeError);
  const submitted = submitDecisionProjection(projection, {
    season: state.season,
    week: state.week,
    phase: state.phase,
    sequence: 0
  });
  assert.equal(submitted.status, "PENDING");
  assert.match(submitted.submissionId, /:submission:0$/);
  assert.equal(
    decisionCommandKey({ focuses: ["SCOUT"], programId: "program-1", type: "SET_WEEK_FOCUS" }),
    decisionCommandKey({ type: "SET_WEEK_FOCUS", programId: "program-1", focuses: ["SCOUT"] })
  );

  const wrongKnowledge = structuredClone(projection.knowledge);
  wrongKnowledge.programId = "program-2";
  assert.throws(
    () => createDecisionProjection(projection.item, projection.command, wrongKnowledge, () => projection.effects),
    /knowledge from the command's program/i
  );
});

test("manual, delegated, and AI actors resolve the same weekly command through one rules path", () => {
  const state = activeLeague("decision-actor-parity");
  const staff = Object.values(state.staff).find((member) =>
    member.programId === "program-1" && member.role === "HEAD_COACH");
  assert.ok(staff);
  const actors = [
    { mode: "MANUAL", actorId: "user-1", displayName: "Head Coach" },
    { mode: "AI", actorId: "ai:program-1", displayName: "Program AI", policyId: "weekly-plan-v1" }
  ];

  const directResults = actors.map((actor) => commitWeeklyDecision(
    state,
    recordFor(state, actor)
  ));
  const delegated = createDelegatedWeeklyPlanningDecision(state, {
    type: "SET_WEEK_FOCUS", programId: "program-1", focuses: ["SCOUT"]
  }, {
    staffId: staff.id,
    delegatedByActorId: "player:program-1",
    policyId: "WEEKLY_PLANNING"
  });
  const results = [directResults[0], commitWeeklyDecision(state, delegated), directResults[1]];
  assert.deepEqual(withoutDecisionAudit(results[0].state), withoutDecisionAudit(results[1].state));
  assert.deepEqual(withoutDecisionAudit(results[0].state), withoutDecisionAudit(results[2].state));
  assert.deepEqual(
    results.map((result) => result.events.filter((event) => event.type !== "DECISION_AUDITED").map((event) => {
      const { decisionCauseId: _decisionCauseId, ...domainEvent } = event;
      return domainEvent;
    })),
    [results[0].events.filter((event) => event.type !== "DECISION_AUDITED").map((event) => {
      const { decisionCauseId: _decisionCauseId, ...domainEvent } = event;
      return domainEvent;
    })].flatMap((events) => [events, events, events])
  );
  assert.deepEqual(results.map((result) => result.audit.actor.mode), ["MANUAL", "DELEGATED", "AI"]);
  assert.ok(results.every((result) => result.audit.status === "DONE"));
  assert.ok(results.every((result) => result.audit.causes.some((cause) => cause.eventType === "WEEK_FOCUS_SET")));
  assert.equal(new Set(results.map((result) => result.audit.commandKey)).size, 1);
});

test("attribution cannot make an illegal weekly command legal", () => {
  const state = activeLeague("decision-illegal-command");
  const actor = { mode: "AI", actorId: "ai:program-1", displayName: "Program AI", policyId: "weekly-plan-v1" };
  const result = commitWeeklyDecision(state, recordFor(state, actor, "REQUIRED", ["NOT_A_REAL_FOCUS"]));

  const rejection = result.events.find((event) => event.type === "COMMAND_REJECTED");
  assert.ok(rejection);
  assert.equal(result.audit.status, "BLOCKED");
  assert.equal(result.audit.rejectionReason, rejection.reason);
  assert.deepEqual(result.audit.causes, [{
    id: `${result.audit.submissionId}:event:0`,
    eventType: "COMMAND_REJECTED",
    ordinal: 0
  }]);
  assert.ok(!result.state.eventHistory.some((event) => event.type === "DECISION_AUDITED"));
  assert.equal(result.state.eventHistory.at(-1).decisionCauseId, result.audit.causes[0].id);
  assert.deepEqual(result.state.decisionAudits.at(-1), result.audit);
});

test("decision attribution is deterministic and rejects stale projections", () => {
  const state = activeLeague("decision-determinism");
  const actor = { mode: "MANUAL", actorId: "user-1", displayName: "Head Coach" };
  const decision = recordFor(state, actor);
  assert.deepEqual(commitWeeklyDecision(state, decision), commitWeeklyDecision(state, decision));

  const later = { ...state, week: state.week + 1 };
  assert.throws(() => commitWeeklyDecision(later, decision), /stale/i);
});

test("a league batch resolves manual and AI planning through the same attributed path", () => {
  const state = activeLeague("decision-batch-parity");
  const manual = createWeeklyPlanningDecision(state, {
    type: "SET_WEEK_FOCUS",
    programId: "program-1",
    focuses: ["SCOUT"]
  }, { mode: "MANUAL", actorId: "user-1", displayName: "Player" }, 0);
  const fixture = state.schedule.find((game) =>
    game.week >= state.week && (game.homeProgramId === "program-2" || game.awayProgramId === "program-2"));
  assert.ok(fixture);
  const opponentProgramId = fixture.homeProgramId === "program-2"
    ? fixture.awayProgramId
    : fixture.homeProgramId;
  const ai = createWeeklyPlanningDecision(state, {
    type: "SET_SCOUTING_TARGET",
    programId: "program-2",
    opponentProgramId
  }, { mode: "AI", actorId: "ai:program-2", displayName: "Program AI", policyId: "weekly-plan-v1" }, 1);

  const forward = commitWeeklyDecisions(state, [manual, ai]);
  const reverse = commitWeeklyDecisions(state, [ai, manual]);
  assert.deepEqual(forward, reverse, "batch submission order must not change state, events, or attribution");
  assert.deepEqual(forward.audits.map((audit) => audit.actor.mode).sort(), ["AI", "MANUAL"]);
  assert.ok(forward.audits.every((audit) => audit.status === "DONE"));
  const aiAudit = forward.audits.find((audit) => audit.actor.mode === "AI");
  assert.ok(aiAudit);
  assert.ok(decisionKnowledgeFor(forward.state, aiAudit).facts.every((fact) => !/rating|potential|interest/i.test(fact.key)));
});

test("repeated choices keep one decision id and receive unique deterministic submission ids", () => {
  const state = activeLeague("decision-repeated-submission");
  const actor = { mode: "MANUAL", actorId: "user-1", displayName: "Player" };
  const first = createWeeklyPlanningDecision(state, {
    type: "SET_WEEK_FOCUS",
    programId: "program-1",
    focuses: ["SCOUT"]
  }, actor);
  const firstResult = commitWeeklyDecision(state, first);
  const second = createWeeklyPlanningDecision(firstResult.state, {
    type: "SET_WEEK_FOCUS",
    programId: "program-1",
    focuses: ["DEVELOP"]
  }, actor);

  assert.equal(first.id, second.id);
  assert.notEqual(first.submissionId, second.submissionId);
  assert.match(first.submissionId, /:submission:0$/);
  assert.match(second.submissionId, /:submission:1$/);
  assert.deepEqual(
    createWeeklyPlanningDecision(firstResult.state, second.command, actor),
    second,
    "the same state and command must reproduce the same submission identity"
  );
});

test("generic live commands keep stable slots while retired compatibility aliases stay outside the live surface", () => {
  const state = activeLeague("decision-generic-slots");
  const actor = { mode: "MANUAL", actorId: "player:program-1", displayName: "Player" };
  const first = createGameDecision(state, {
    type: "SET_TICKET_PRICE", programId: "program-1", price: 28
  }, actor, 0);
  const changed = createGameDecision(state, {
    type: "SET_TICKET_PRICE", programId: "program-1", price: 40
  }, actor, 1);
  assert.equal(first.id, changed.id, "a decision slot must not include the submitted value or whole command JSON");
  assert.notEqual(first.submissionId, changed.submissionId);
  assert.notEqual(first.command.price, changed.command.price);

  const mediaFirst = createGameDecision(state, {
    type: "SET_PLAYER_MEDIA_ACTION", programId: "program-1", playerId: "player-a", action: "SOCIAL_MEDIA"
  }, actor, 0);
  const mediaReplacement = createGameDecision(state, {
    type: "SET_PLAYER_MEDIA_ACTION", programId: "program-1", playerId: "player-b", action: "MEDIA_DAY"
  }, actor, 1);
  assert.equal(mediaFirst.id, mediaReplacement.id, "the featured player revises one program-wide media slot");

  const marqueeFirst = createGameDecision(state, {
    type: "SCHEDULE_MARQUEE_HOME_GAME", programId: "program-1", opponentProgramId: "program-2"
  }, actor, 0);
  const marqueeReplacement = createGameDecision(state, {
    type: "SCHEDULE_MARQUEE_HOME_GAME", programId: "program-1", opponentProgramId: "program-3"
  }, actor, 1);
  assert.equal(marqueeFirst.id, marqueeReplacement.id, "the marquee opponent revises one preseason slot");

  for (const command of [
    { type: "RED_SHIRT", programId: "program-1", playerId: "player-1" },
    { type: "SET_GAME_PLAN", programId: "program-1", plan: {} },
    { type: "SET_WEEK_HOURS", programId: "program-1", focus: "SCOUTING", hours: 1 },
    { type: "SET_STAFF_ALLOCATION", programId: "program-1", staffId: "staff-1", allocation: {} },
    { type: "SET_PRACTICE_REPS", programId: "program-1", side: "OFFENSE", reps: 1 },
    { type: "ALLOCATE_SCOUTING", programId: "program-1", opponentProgramId: "program-2", points: 1 },
    { type: "CONTINUE_OFFSEASON", programId: "program-1" }
  ]) {
    assert.throws(() => createGameDecision(state, command, actor), /retired compatibility command/i);
  }
});

test("generic manual commands preserve raw command legality and simulation semantics", () => {
  const state = activeLeague("decision-generic-parity");
  const command = { type: "SET_TICKET_PRICE", programId: "program-1", price: 37 };
  const raw = advanceWeek(state, [command]);
  const decision = createGameDecision(state, command, {
    mode: "MANUAL", actorId: "player:program-1", displayName: "Player"
  });
  const attributed = advanceWeekWithDecisions(state, [decision]);
  assert.deepEqual(withoutDecisionAudit(attributed.state), withoutDecisionAudit(raw.state));
  assert.deepEqual(
    attributed.events.filter((event) => event.type !== "DECISION_AUDITED").map((event) => {
      const { decisionCauseId: _decisionCauseId, ...domainEvent } = event;
      return domainEvent;
    }),
    raw.events
  );
  assert.equal(attributed.audit, undefined);
  assert.equal(attributed.audits[0].status, "DONE");
  assert.deepEqual(attributed.audits[0].causes.map((cause) => cause.eventType), ["TICKET_PRICE_SET"]);
});

test("phase-invalid training camp focus is blocked instead of receiving fabricated success", () => {
  const state = activeLeague("decision-camp-boundary");
  const decision = createGameDecision(state, {
    type: "SET_TRAINING_CAMP_FOCUS", programId: "program-1", focus: "INSTALL"
  }, { mode: "MANUAL", actorId: "player:program-1", displayName: "Player" });
  const result = advanceWeekWithDecisions(state, [decision]);
  assert.equal(result.audits[0].status, "BLOCKED");
  assert.equal(result.audits[0].resolution, "REJECTED");
  assert.deepEqual(result.audits[0].causes.map((cause) => cause.eventType), ["COMMAND_REJECTED"]);
  assert.equal(result.state.trainingCamp?.["program-1"], undefined);
});

test("repeated preparation choices use the next slot sequence after save and resume", async () => {
  const state = createFictionalLeague("decision-prepare-save-sequence", 4);
  const programId = "program-1";
  const actor = { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" };
  const first = createGameDecision(state, {
    type: "SET_SCHEME", programId, scheme: { offense: "AIR_RAID" }
  }, actor);
  const firstResult = prepareWeekWithDecisions(state, [first]);
  const resumed = (await decodeSave(await encodeSave(firstResult.state, programId))).state;
  const second = createGameDecision(resumed, {
    type: "SET_SCHEME", programId, scheme: { offense: "POWER_RUN" }
  }, actor);
  const secondResult = prepareWeekWithDecisions(resumed, [second]);
  assert.equal(first.id, second.id);
  assert.match(first.submissionId, /:submission:0$/);
  assert.match(second.submissionId, /:submission:1$/);
  assert.equal(secondResult.audits[0].status, "DONE");
  assert.deepEqual(secondResult.audits[0].causes.map((cause) => cause.eventType), ["SCHEME_SET"]);
});

test("standing recruiting intent has an exact cause and idempotent scholarship offers remain auditable", () => {
  const state = activeLeague("decision-standing-intent");
  const programId = "program-1";
  const prospectId = Object.keys(state.recruiting[programId].scoutingByProspect).sort()[0];
  state.recruiting[programId].scoutingByProspect[prospectId].evaluations = ["FILM"];
  const actor = { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" };
  const nilDecision = createGameDecision(state, {
    type: "SET_NIL_OFFER", programId, prospectId, weeklyAmount: 1
  }, actor);
  const nilResult = advanceWeekWithDecisions(state, [nilDecision]);
  const nilEvent = nilResult.events.find((event) => event.type === "NIL_OFFER_SET"
    && event.programId === programId && event.prospectId === prospectId);
  assert.ok(nilEvent);
  assert.equal(nilEvent.weeklyAmount, 1);
  assert.equal(nilResult.audits[0].resolution, "STANDING");
  assert.equal(nilResult.audits[0].outcomePending, true);
  assert.deepEqual(nilResult.audits[0].causes.map((cause) => cause.eventType), ["NIL_OFFER_SET"]);

  const offeredState = activeLeague("decision-idempotent-offer");
  const offeredProspectId = Object.keys(offeredState.recruiting[programId].scoutingByProspect).sort()[0];
  offeredState.recruiting[programId].offeredProspectIds.push(offeredProspectId);
  const offerDecision = createGameDecision(offeredState, {
    type: "OFFER_PROSPECT", programId, prospectId: offeredProspectId, extend: true
  }, actor);
  const offerResult = advanceWeekWithDecisions(offeredState, [offerDecision]);
  const offerEvent = offerResult.events.find((event) => event.type === "PROSPECT_OFFERED"
    && event.programId === programId && event.prospectId === offeredProspectId);
  assert.ok(offerEvent);
  assert.equal(offerEvent.changed, false);
  assert.deepEqual(offerResult.audits[0].causes.map((cause) => cause.eventType), ["PROSPECT_OFFERED"]);
});

test("NIL standing audits close as winner and loser with durable program-specific receipts", async () => {
  const state = activeLeague("decision-nil-market-outcomes");
  state.week = 14;
  const prospectId = Object.keys(state.recruiting["program-1"].scoutingByProspect).sort()[0];
  const prospect = state.prospects[prospectId];
  prospect.status = "AVAILABLE";
  prospect.signedProgramId = null;
  for (const programId of ["program-1", "program-2"]) {
    state.recruiting[programId].scoutingByProspect[prospectId] = {
      evaluations: ["BASIC"],
      pursuitPoints: programId === "program-1" ? 25 : 1
    };
    state.programs[programId].scholarshipLimit = 100;
    prospect.interestByProgram[programId] = programId === "program-1" ? 100 : 0;
  }
  const decisions = ["program-1", "program-2"].map((programId) => createGameDecision(state, {
    type: "SET_NIL_OFFER", programId, prospectId, weeklyAmount: 1
  }, { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" }));
  const result = advanceWeekWithDecisions(state, decisions);
  const winner = result.audits.find((audit) => audit.programId === "program-1");
  const loser = result.audits.find((audit) => audit.programId === "program-2");
  assert.equal(winner?.outcomePending, false);
  assert.equal(winner?.standingOutcome?.result, "WON");
  assert.equal(loser?.outcomePending, false);
  assert.equal(loser?.standingOutcome?.result, "LOST");
  assert.deepEqual(winner?.causes.map((cause) => cause.eventType), ["NIL_OFFER_SET"]);
  assert.deepEqual(loser?.causes.map((cause) => cause.eventType), ["NIL_OFFER_SET"]);
  assert.deepEqual(winner?.standingOutcome?.causes.map((cause) => cause.eventType), ["NIL_OFFER_RESOLVED"]);
  assert.deepEqual(loser?.standingOutcome?.causes.map((cause) => cause.eventType), ["NIL_OFFER_RESOLVED"]);
  const loaded = (await decodeSave(await encodeSave(result.state, "program-1"))).state;
  const outcomeCauseIds = new Set(loaded.eventHistory.flatMap((event) => event.decisionOutcomeCauseIds ?? []));
  assert.ok([winner, loser].every((audit) => audit?.standingOutcome?.causes.every((cause) => outcomeCauseIds.has(cause.id))));
  const legacy = structuredClone(result.state);
  delete legacy.decisionAudits[0].standingOutcome;
  const migrated = (await decodeSave(await encodeSave(legacy, "program-1"))).state;
  assert.equal(migrated.decisionAudits[0].standingOutcome, null);

  const retentionState = structuredClone(result.state);
  const staleAi = {
    ...structuredClone(winner),
    submissionId: "stale-closed-ai-standing",
    actor: { mode: "AI", actorId: "ai:program-1", displayName: "Program AI", policyId: "weekly-plan-v1" }
  };
  const fillers = Array.from({ length: 4_096 }, (_, index) => ({
    ...structuredClone(loser),
    decisionId: `recent-ai:${index}`,
    submissionId: `recent-ai:${index}:submission:0`,
    actor: { mode: "AI", actorId: "ai:program-2", displayName: "Program AI", policyId: "weekly-plan-v1" },
    outcomePending: false,
    standingOutcome: null,
    causes: []
  }));
  retentionState.decisionAudits = [staleAi, ...fillers];
  const retainedNoise = (await decodeSave(await encodeSave(retentionState, "program-1"))).state;
  assert.ok(!retainedNoise.decisionAudits.some((audit) => audit.submissionId === staleAi.submissionId),
    "a completed AI standing audit must not remain protected forever");
  assert.ok(retainedNoise.decisionAudits.some((audit) => audit.submissionId === fillers.at(-1).submissionId));
});

test("withdrawing NIL closes both the prior standing offer and the withdrawal submission", async () => {
  let state = activeLeague("decision-nil-withdrawal");
  const programId = "program-1";
  const prospectId = Object.keys(state.recruiting[programId].scoutingByProspect).sort()[0];
  state.recruiting[programId].scoutingByProspect[prospectId].evaluations = ["BASIC"];
  const actor = { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" };
  const offered = advanceWeekWithDecisions(state, [createGameDecision(state, {
    type: "SET_NIL_OFFER", programId, prospectId, weeklyAmount: 1
  }, actor)]);
  assert.equal(offered.audits[0].outcomePending, true, "the fixture needs an unresolved standing offer");
  state = offered.state;
  const withdrawn = advanceWeekWithDecisions(state, [createGameDecision(state, {
    type: "SET_NIL_OFFER", programId, prospectId, weeklyAmount: 0
  }, actor)]);
  const related = withdrawn.state.decisionAudits?.filter((audit) =>
    audit.commandType === "SET_NIL_OFFER" && audit.programId === programId) ?? [];
  assert.equal(related.length, 2);
  assert.ok(related.every((audit) => !audit.outcomePending && audit.standingOutcome?.result === "WITHDRAWN"));
  assert.ok(related.every((audit) => audit.causes[0]?.eventType === "NIL_OFFER_SET"));
  const withdrawalEvent = withdrawn.events.find((event) => event.type === "NIL_OFFER_SET"
    && event.programId === programId && event.prospectId === prospectId && event.weeklyAmount === 0);
  assert.equal(withdrawalEvent?.decisionOutcomeCauseIds?.length, 2);
  const loaded = (await decodeSave(await encodeSave(withdrawn.state, programId))).state;
  assert.ok(loaded.decisionAudits?.filter((audit) => audit.commandType === "SET_NIL_OFFER" && audit.programId === programId)
    .every((audit) => audit.standingOutcome?.result === "WITHDRAWN"));
});

test("offseason board close withdraws a NIL offer that never entered a contest", () => {
  let state = activeLeague("decision-nil-board-close");
  const programId = "program-1";
  const prospectId = Object.keys(state.recruiting[programId].scoutingByProspect).sort()[0];
  state.recruiting[programId].scoutingByProspect[prospectId].evaluations = ["BASIC"];
  const actor = { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" };
  const offered = advanceWeekWithDecisions(state, [createGameDecision(state, {
    type: "SET_NIL_OFFER", programId, prospectId, weeklyAmount: 1
  }, actor)]);
  state = offered.state;
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;
  while (state.phase === "OFFSEASON") state = advanceOffseasonStepWithDecisions(state, []).state;
  const audit = state.decisionAudits?.find((candidate) => candidate.submissionId === offered.audits[0].submissionId);
  assert.equal(audit?.outcomePending, false);
  assert.equal(audit?.standingOutcome?.result, "WITHDRAWN");
  assert.deepEqual(audit?.standingOutcome?.causes.map((cause) => cause.eventType), ["NIL_OFFER_RESOLVED"]);
});

test("delegated weekly planning accepts only the program head coach and exact player grantor", () => {
  const state = activeLeague("decision-delegated-authority");
  const programId = "program-1";
  const staff = Object.values(state.staff).filter((member) => member.programId === programId);
  const headCoach = staff.find((member) => member.role === "HEAD_COACH");
  const coordinator = staff.find((member) => member.role === "OFFENSIVE_COORDINATOR");
  assert.ok(headCoach && coordinator);
  const command = { type: "SET_WEEK_FOCUS", programId, focuses: ["SCOUT"] };
  const delegated = createDelegatedWeeklyPlanningDecision(state, command, {
    staffId: headCoach.id,
    delegatedByActorId: `player:${programId}`,
    policyId: "WEEKLY_PLANNING"
  });
  const result = commitWeeklyDecision(state, delegated);
  assert.equal(result.audit.actor.mode, "DELEGATED");
  assert.equal(result.audit.status, "DONE");
  assert.throws(() => createDelegatedWeeklyPlanningDecision(state, command, {
    staffId: coordinator.id,
    delegatedByActorId: `player:${programId}`,
    policyId: "WEEKLY_PLANNING"
  }), /not authorized/i);
  assert.throws(() => createDelegatedWeeklyPlanningDecision(state, command, {
    staffId: headCoach.id,
    delegatedByActorId: "player:program-2",
    policyId: "WEEKLY_PLANNING"
  }), /granted by the program's player actor/i);
  const forged = {
    ...delegated,
    actor: { ...delegated.actor, delegatedByActorId: "player:program-2" }
  };
  assert.throws(() => commitWeeklyDecision(state, forged), /authority is not valid/i);
});

test("a portal bid audit records accepted standing intent, not the later market winner", () => {
  let state = activeLeague("decision-portal-intent");
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;
  assert.equal(state.offseasonStep, "PORTAL");
  const [playerId, listing] = Object.entries(state.portal ?? {}).sort(([left], [right]) => left.localeCompare(right))[0] ?? [];
  assert.ok(playerId && listing);
  const programId = listing.previousProgramId;
  const rosterSize = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
  state.programs[programId].scholarshipLimit = rosterSize + 1;
  state.recruiting[programId].points = 400;
  const command = { type: "BID_PORTAL_PLAYER", programId, playerId, points: 60, weeklyNil: 0 };
  const decision = createGameDecision(state, command, {
    mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player"
  });
  const result = advanceOffseasonStepWithDecisions(state, [decision]);
  const intent = result.events.find((event) => event.type === "PORTAL_BID_SET"
    && event.programId === programId && event.playerId === playerId);
  assert.ok(intent);
  assert.equal(intent.points, 60);
  assert.equal(result.audits[0].resolution, "STANDING");
  assert.equal(result.audits[0].outcomePending, false);
  assert.deepEqual(result.audits[0].causes.map((cause) => cause.eventType), ["PORTAL_BID_SET"]);
  assert.ok(["WON", "UNCLAIMED"].includes(result.audits[0].standingOutcome?.result));
  assert.ok(result.audits[0].standingOutcome?.causes.every((cause) =>
    result.events.some((event) => event.decisionOutcomeCauseIds?.includes(cause.id))));
  assert.ok(result.events.some((event) =>
    (event.type === "PORTAL_PLAYER_SIGNED" || event.type === "PORTAL_PLAYER_UNCLAIMED")
    && event.playerId === playerId), "the market may resolve in the same batch without being fabricated as the accepted-intent cause");
});

test("one shared portal signing closes winner and loser bids without exclusive attribution", async () => {
  const state = portalWindow("decision-portal-shared-outcome");
  const [playerId, listing] = Object.entries(state.portal ?? {}).sort(([left], [right]) => left.localeCompare(right))[0];
  const [firstId, secondId] = Object.keys(state.programs)
    .filter((programId) => programId !== listing.previousProgramId).slice(0, 2);
  for (const programId of [firstId, secondId]) {
    const rosterSize = Object.values(state.players).filter((player) =>
      player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
    state.programs[programId].scholarshipLimit = rosterSize + 1;
    state.recruiting[programId].points = 400;
    listing.interestByProgram[programId] = 88;
  }
  const decisions = [
    { programId: firstId, points: 140 },
    { programId: secondId, points: 60 }
  ].map(({ programId, points }) => createGameDecision(state, {
    type: "BID_PORTAL_PLAYER", programId, playerId, points, weeklyNil: 0
  }, { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" }));
  const result = advanceOffseasonStepWithDecisions(state, decisions);
  const signed = result.events.find((event) => event.type === "PORTAL_PLAYER_SIGNED" && event.playerId === playerId);
  assert.ok(signed);
  const winner = result.audits.find((audit) => audit.programId === signed.programId);
  const loser = result.audits.find((audit) => audit.programId !== signed.programId);
  assert.equal(winner?.standingOutcome?.result, "WON");
  assert.equal(loser?.standingOutcome?.result, "LOST");
  assert.ok(result.audits.every((audit) => !audit.outcomePending));
  assert.ok(result.audits.every((audit) => audit.causes[0]?.eventType === "PORTAL_BID_SET"));
  const sharedIds = new Set(signed.decisionOutcomeCauseIds);
  assert.equal(sharedIds.size, 2);
  assert.ok(result.audits.every((audit) => audit.standingOutcome?.causes.every((cause) => sharedIds.has(cause.id))));

  const loaded = (await decodeSave(await encodeSave(result.state, firstId))).state;
  const loadedEvent = loaded.eventHistory.find((event) => event.type === "PORTAL_PLAYER_SIGNED" && event.playerId === playerId);
  assert.ok(loadedEvent);
  assert.ok(result.audits.every((audit) => loaded.decisionAudits
    ?.find((candidate) => candidate.submissionId === audit.submissionId)?.standingOutcome !== null));
  assert.equal(new Set(loadedEvent.decisionOutcomeCauseIds).size, 2);
});

test("an accepted portal bid that clears no threshold closes as unclaimed", async () => {
  const state = portalWindow("decision-portal-unclaimed-outcome");
  const [playerId, listing] = Object.entries(state.portal ?? {}).sort(([left], [right]) => left.localeCompare(right))[0];
  const programId = Object.keys(state.programs).find((candidate) => candidate !== listing.previousProgramId);
  const program = state.programs[programId];
  const rosterSize = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
  program.scholarshipLimit = rosterSize + 1;
  program.prestige = 0;
  program.wins = 0;
  program.losses = 100;
  program.localPress = 0;
  program.nationalPress = 0;
  program.recruitAppeal = 0;
  program.facilities.RECRUITING = 1;
  state.recruiting[programId].points = 50;
  listing.interestByProgram[programId] = 0;
  listing.priorities = ["WINNING", "WINNING", "WINNING"];
  const decision = createGameDecision(state, {
    type: "BID_PORTAL_PLAYER", programId, playerId, points: 5, weeklyNil: 0
  }, { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" });
  const result = advanceOffseasonStepWithDecisions(state, [decision]);
  assert.ok(result.events.some((event) => event.type === "PORTAL_PLAYER_UNCLAIMED" && event.playerId === playerId));
  assert.equal(result.audits[0].outcomePending, false);
  assert.equal(result.audits[0].standingOutcome?.result, "UNCLAIMED");
  assert.deepEqual(result.audits[0].standingOutcome?.causes.map((cause) => cause.eventType), ["PORTAL_PLAYER_UNCLAIMED"]);
  const loaded = (await decodeSave(await encodeSave(result.state, programId))).state;
  const retained = loaded.decisionAudits?.find((audit) => audit.submissionId === decision.submissionId);
  assert.equal(retained?.standingOutcome?.result, "UNCLAIMED");
  assert.ok(retained?.standingOutcome?.causes.every((cause) => loaded.eventHistory
    .some((event) => event.decisionOutcomeCauseIds?.includes(cause.id))));
});

test("an explicit empty priority plan remains empty and is not audited as a default plan", () => {
  const state = activeLeague("decision-empty-focus");
  const programId = "program-1";
  const decision = createWeeklyPlanningDecision(state, {
    type: "SET_WEEK_FOCUS",
    programId,
    focuses: []
  }, { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" });
  const committed = commitWeeklyDecision(state, decision);
  assert.deepEqual(committed.state.weekFocus[programId], []);
  assert.equal(committed.audit.status, "DONE");
  const setEvent = committed.events.find((event) => event.type === "WEEK_FOCUS_SET" && event.programId === programId);
  assert.deepEqual(setEvent?.focuses, []);

  const advanced = advanceWeek(committed.state);
  assert.deepEqual(advanced.state.weekFocus[programId], []);
  assert.ok(!advanced.events.some((event) => event.type === "WEEK_FOCUS_PAYOFF" && event.programId === programId));
});

function attributedAiWeek(state) {
  const commands = planWeeklyCommands(state);
  const planning = commands.filter((command) =>
    command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET");
  const remaining = commands.filter((command) =>
    command.type !== "SET_WEEK_FOCUS" && command.type !== "SET_SCOUTING_TARGET");
  const decisions = planning.map((command, sequence) => createWeeklyPlanningDecision(state, command, {
    mode: "AI",
    actorId: `ai:${command.programId}`,
    displayName: "Program AI",
    policyId: "weekly-plan-v1"
  }, sequence));
  return { commands, decisions, remaining };
}

function fullyAttributedAiWeek(state, playerProgramId) {
  return planWeeklyCommands(state, playerProgramId).map((command) =>
    command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET"
      ? createWeeklyPlanningDecision(state, command, {
          mode: "AI",
          actorId: `ai:${command.programId}`,
          displayName: "Program AI",
          policyId: "weekly-plan-v1"
        }, undefined, weeklyPlanningKnowledgeSnapshot(state, command.programId))
      : createGameDecision(state, command, {
          mode: "AI",
          actorId: `ai:${command.programId}`,
          displayName: "Program AI",
          policyId: "weekly-plan-v1"
        }));
}

function withoutPayoffAttribution(events) {
  return structuredClone(events).map((event) => event.type === "WEEK_FOCUS_PAYOFF"
    ? { ...event, weeklyPrioritySubmissionId: null, scoutingTargetSubmissionId: null }
    : event);
}

test("attributed worker orchestration preserves legacy single-batch weekly semantics", () => {
  const state = activeLeague("decision-worker-equivalence");
  const { commands, decisions, remaining } = attributedAiWeek(state);
  assert.ok(decisions.some((decision) =>
    decision.command.type === "SET_WEEK_FOCUS" && decision.command.focuses.includes("DEVELOP")));
  assert.ok(remaining.some((command) => command.type === "SET_DEVELOPMENT_SPOTLIGHT"));

  const legacy = advanceWeek(state, commands);
  const attributed = advanceWeekWithDecisions(state, decisions, remaining);
  assert.deepEqual(withoutDecisionAudit(attributed.state), withoutDecisionAudit(legacy.state));
  assert.deepEqual(
    withoutPayoffAttribution(attributed.events.filter((event) => event.type !== "DECISION_AUDITED").map((event) => {
      const { decisionCauseId: _decisionCauseId, ...domainEvent } = event;
      return domainEvent;
    })),
    withoutPayoffAttribution(legacy.events)
  );
  assert.ok(!attributed.events.some((event) =>
    event.type === "COMMAND_REJECTED" && event.command.type === "SET_DEVELOPMENT_SPOTLIGHT"));
  assert.equal(attributed.audits.length, decisions.length);
  for (const audit of attributed.audits.filter((candidate) => candidate.commandType === "SET_WEEK_FOCUS" && candidate.status === "DONE")) {
    const payoff = attributed.events.find((event) => event.type === "WEEK_FOCUS_PAYOFF" && event.programId === audit.programId);
    assert.equal(payoff?.weeklyPrioritySubmissionId, audit.submissionId);
  }
});

test("weekly payoff attribution survives a save between planning and advance", async () => {
  const state = activeLeague("decision-payoff-save-link");
  const programId = "program-1";
  const actor = { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" };
  const focus = createWeeklyPlanningDecision(state, {
    type: "SET_WEEK_FOCUS",
    programId,
    focuses: ["SCOUT"]
  }, actor);
  const focused = commitWeeklyDecision(state, focus);
  const fixture = focused.state.schedule.find((game) =>
    !game.played && game.week >= focused.state.week
    && (game.homeProgramId === programId || game.awayProgramId === programId));
  assert.ok(fixture);
  const opponentProgramId = fixture.homeProgramId === programId ? fixture.awayProgramId : fixture.homeProgramId;
  const scouting = createWeeklyPlanningDecision(focused.state, {
    type: "SET_SCOUTING_TARGET",
    programId,
    opponentProgramId
  }, actor);
  const planned = commitWeeklyDecision(focused.state, scouting);
  const resumed = (await decodeSave(await encodeSave(planned.state, programId))).state;
  const advanced = advanceWeek(resumed);
  const payoff = advanced.events.find((event) => event.type === "WEEK_FOCUS_PAYOFF" && event.programId === programId);
  assert.ok(payoff);
  assert.equal(payoff.weeklyPrioritySubmissionId, focus.submissionId);
  assert.equal(payoff.scoutingTargetSubmissionId, scouting.submissionId);
});

test("payoff attribution follows the effective opponent and carried standing plan", () => {
  const state = activeLeague("decision-payoff-effective-target");
  const programId = "program-1";
  const actor = { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" };
  const focus = createWeeklyPlanningDecision(state, {
    type: "SET_WEEK_FOCUS",
    programId,
    focuses: ["SCOUT"]
  }, actor);
  const focused = commitWeeklyDecision(state, focus);
  const future = focused.state.schedule.find((game) =>
    !game.played && game.week > focused.state.week
    && (game.homeProgramId === programId || game.awayProgramId === programId));
  assert.ok(future);
  const futureOpponentId = future.homeProgramId === programId ? future.awayProgramId : future.homeProgramId;
  const scouting = createWeeklyPlanningDecision(focused.state, {
    type: "SET_SCOUTING_TARGET",
    programId,
    opponentProgramId: futureOpponentId
  }, actor);
  const planned = commitWeeklyDecision(focused.state, scouting);
  const first = advanceWeek(planned.state);
  const firstPayoff = first.events.find((event) => event.type === "WEEK_FOCUS_PAYOFF" && event.programId === programId);
  assert.ok(firstPayoff);
  assert.equal(firstPayoff.weeklyPrioritySubmissionId, focus.submissionId);
  assert.notEqual(firstPayoff.scoutedOpponentId, futureOpponentId);
  assert.equal(firstPayoff.scoutingTargetSubmissionId, null, "a future target cannot receive credit for the current opponent");

  const second = advanceWeek(first.state);
  const secondPayoff = second.events.find((event) => event.type === "WEEK_FOCUS_PAYOFF" && event.programId === programId);
  assert.ok(secondPayoff);
  assert.equal(secondPayoff.weeklyPrioritySubmissionId, focus.submissionId, "a carried standing plan keeps its originating submission");
});

test("a blocked replacement does not erase the effective plan's payoff attribution", () => {
  const state = activeLeague("decision-payoff-blocked-replacement");
  const programId = "program-1";
  const actor = { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" };
  const focus = createWeeklyPlanningDecision(state, {
    type: "SET_WEEK_FOCUS",
    programId,
    focuses: ["DEVELOP"]
  }, actor);
  const focused = commitWeeklyDecision(state, focus);
  const invalid = createWeeklyPlanningDecision(focused.state, {
    type: "SET_WEEK_FOCUS",
    programId,
    focuses: ["NOT_A_FOCUS"]
  }, actor);
  const blocked = commitWeeklyDecision(focused.state, invalid);
  assert.equal(blocked.audit.status, "BLOCKED");
  assert.deepEqual(blocked.state.weekFocus[programId], ["DEVELOP"]);

  const advanced = advanceWeek(blocked.state);
  const payoff = advanced.events.find((event) => event.type === "WEEK_FOCUS_PAYOFF" && event.programId === programId);
  assert.ok(payoff);
  assert.equal(payoff.weeklyPrioritySubmissionId, focus.submissionId);
});

test("a noisy 72-program save retains current decision attribution outside the rolling event feed", async () => {
  const state = beginSeason(createFictionalLeague("decision-audit-save", 72));
  const { decisions, remaining } = attributedAiWeek(state);
  const result = advanceWeekWithDecisions(state, decisions, remaining);
  assert.ok(result.audits.length >= 72, "the test must exceed a small event-feed sample");
  assert.ok(result.state.eventHistory.length > 400, "the save must trim the noisy weekly event feed");

  const loaded = await decodeSave(await encodeSave(result.state, "program-1"));
  const retained = new Set(loaded.state.decisionAudits?.map((audit) => audit.submissionId));
  assert.ok(result.audits.every((audit) => retained.has(audit.submissionId)));
  assert.equal(loaded.state.decisionAudits?.length, result.state.decisionAudits?.length);
  assert.ok(loaded.state.eventHistory.length >= 400);
  const causalIds = new Set(loaded.state.eventHistory.flatMap((event) =>
    event.decisionCauseId ? [event.decisionCauseId] : []));
  assert.ok(loaded.state.decisionAudits?.flatMap((audit) => audit.causes)
    .every((cause) => causalIds.has(cause.id)), "every retained audit cause must resolve to the sole persisted domain event");
  assert.ok(!loaded.state.eventHistory.some((event) => event.type === "DECISION_AUDITED"));

  const legacy = structuredClone(state);
  delete legacy.decisionAudits;
  const loadedLegacy = await decodeSave(await encodeSave(legacy));
  assert.deepEqual(loadedLegacy.state.decisionAudits, []);
});

test("a full 72-program season cannot evict effective manual and standing origins", async () => {
  let state = beginSeason(createFictionalLeague("decision-full-season-retention", 72));
  const programId = "program-1";
  const actor = { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" };
  const focus = createWeeklyPlanningDecision(state, {
    type: "SET_WEEK_FOCUS", programId, focuses: ["SCOUT"]
  }, actor);
  const focused = commitWeeklyDecision(state, focus);
  state = focused.state;

  const prospectId = Object.keys(state.recruiting[programId].scoutingByProspect).sort()[0];
  state.recruiting[programId].scoutingByProspect[prospectId].evaluations = ["FILM"];
  const standing = createGameDecision(state, {
    type: "SET_NIL_OFFER", programId, prospectId, weeklyAmount: 1
  }, actor);
  let standingSubmissionId = "";
  let generatedAudits = 1;
  while (state.phase !== "OFFSEASON") {
    const decisions = fullyAttributedAiWeek(state, programId);
    if (!standingSubmissionId) decisions.push(standing);
    const result = advanceWeekWithDecisions(state, decisions);
    generatedAudits += result.audits.length;
    if (!standingSubmissionId) {
      standingSubmissionId = result.audits.find((audit) => audit.commandType === "SET_NIL_OFFER")?.submissionId ?? "";
    }
    const payoff = result.events.find((event) => event.type === "WEEK_FOCUS_PAYOFF" && event.programId === programId);
    if (payoff) assert.equal(payoff.weeklyPrioritySubmissionId, focus.submissionId);
    state = result.state;
  }
  assert.ok(generatedAudits > 4_096, "the season must exceed the bounded audit capacity");
  assert.ok(standingSubmissionId);

  const loaded = (await decodeSave(await encodeSave(state, programId))).state;
  const retained = new Set(loaded.decisionAudits?.map((audit) => audit.submissionId));
  assert.ok(retained.has(focus.submissionId), "the effective manual weekly origin must survive autonomous audit noise");
  assert.ok(retained.has(standingSubmissionId), "the manual standing-market origin must survive autonomous audit noise");
  const causalIds = new Set(loaded.eventHistory.flatMap((event) => event.decisionCauseId ? [event.decisionCauseId] : []));
  for (const submissionId of [focus.submissionId, standingSubmissionId]) {
    const audit = loaded.decisionAudits?.find((candidate) => candidate.submissionId === submissionId);
    assert.ok(audit);
    assert.ok(audit.causes.every((cause) => causalIds.has(cause.id)));
  }
  assert.ok(!loaded.eventHistory.some((event) => event.type === "DECISION_AUDITED"));
});
