import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  decodeSave,
  decisionKnowledgeFor,
  decisionKnowledgeId,
  encodeSave,
  internDecisionKnowledge,
  retainedDecisionKnowledge,
  saveablePayload,
  SAVE_FORMAT_VERSION
} from "../packages/simulation/dist/index.js";
import { planOffseasonCommands, planWeeklyCommands, portalPlanningKnowledgeViews } from "../packages/ai/dist/index.js";
import { advanceHeadlessCareerStep } from "../apps/simulator-cli/dist/orchestration.js";

function inlineV1State(state) {
  const legacy = structuredClone(state);
  legacy.decisionAudits = (legacy.decisionAudits ?? []).map((audit) => {
    const knowledge = structuredClone(decisionKnowledgeFor(state, audit));
    const { knowledgeId: _knowledgeId, ...record } = audit;
    return { ...record, knowledge };
  });
  delete legacy.decisionKnowledge;
  return legacy;
}

function rawEnvelope(state, version = SAVE_FORMAT_VERSION) {
  return {
    version,
    simulationVersion: state.identity.simulationVersion,
    season: state.season,
    week: state.week,
    savedAt: "2027-01-01T00:00:00.000Z",
    playerProgramId: "program-1",
    state
  };
}

function bytesFor(envelope) {
  return new TextEncoder().encode(JSON.stringify(envelope));
}

function portalWindow(seed, count) {
  let state = beginSeason(createFictionalLeague(seed, count));
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;
  return state;
}

test("completed audits intern one canonical snapshot and resolve through strict references", () => {
  const state = beginSeason(createFictionalLeague("knowledge-pool-runtime", 4));
  const result = advanceHeadlessCareerStep(state);
  const audits = result.state.decisionAudits ?? [];
  assert.ok(audits.length > 0);
  assert.ok(audits.every((audit) => typeof audit.knowledgeId === "string" && !("knowledge" in audit)));
  assert.deepEqual(Object.keys(result.state.decisionKnowledge), [...new Set(audits.map((audit) => audit.knowledgeId))]);
  for (const audit of audits) {
    const knowledge = decisionKnowledgeFor(result.state, audit);
    assert.equal(decisionKnowledgeId(knowledge), audit.knowledgeId);
    assert.equal(knowledge.programId, audit.programId);
    assert.deepEqual(
      [knowledge.season, knowledge.week, knowledge.phase],
      [audit.submittedAt.season, audit.submittedAt.week, audit.submittedAt.phase]
    );
  }

  const duplicatePool = {};
  const first = decisionKnowledgeFor(result.state, audits[0]);
  const firstId = internDecisionKnowledge(duplicatePool, first);
  assert.equal(internDecisionKnowledge(duplicatePool, structuredClone(first)), firstId);
  assert.equal(Object.keys(duplicatePool).length, 1);
});

test("knowledge references reject missing, altered, cross-program, and stale content", () => {
  const result = advanceHeadlessCareerStep(beginSeason(createFictionalLeague("knowledge-pool-strict", 4)));
  const audit = result.state.decisionAudits[0];
  assert.throws(() => decisionKnowledgeFor({ decisionKnowledge: {} }, audit), /Missing decision knowledge reference/);

  const altered = structuredClone(result.state);
  altered.decisionKnowledge[audit.knowledgeId].facts[0].value = "altered";
  assert.throws(() => decisionKnowledgeFor(altered, audit), /content does not match reference/);

  const wrongProgram = { ...audit, programId: audit.programId === "program-1" ? "program-2" : "program-1" };
  assert.throws(() => decisionKnowledgeFor(result.state, wrongProgram), /same program/);
  const stale = { ...audit, submittedAt: { ...audit.submittedAt, week: audit.submittedAt.week + 1 } };
  assert.throws(() => decisionKnowledgeFor(result.state, stale), /same simulation boundary/);

  const collisionPool = { [audit.knowledgeId]: structuredClone(decisionKnowledgeFor(result.state, audit)) };
  collisionPool[audit.knowledgeId].facts[0].value = "collision";
  assert.throws(() => internDecisionKnowledge(collisionPool, decisionKnowledgeFor(result.state, audit)), /id collision/);
});

test("save format v2 round-trips the runtime pool and v1 inline audits migrate deterministically", async () => {
  assert.equal(SAVE_FORMAT_VERSION, 2);
  const state = advanceHeadlessCareerStep(beginSeason(createFictionalLeague("knowledge-pool-save", 4))).state;
  const loaded = (await decodeSave(await encodeSave(state, "program-1"))).state;
  assert.deepEqual(loaded.decisionAudits, state.decisionAudits);
  assert.deepEqual(loaded.decisionKnowledge, state.decisionKnowledge);
  for (const audit of loaded.decisionAudits) {
    const knowledge = decisionKnowledgeFor(loaded, audit);
    assert.deepEqual(knowledge, decisionKnowledgeFor(state, audit));
    assert.equal(Object.isFrozen(knowledge), true);
    assert.equal(Object.isFrozen(knowledge.facts), true);
    assert.equal(Object.isFrozen(knowledge.facts[0]), true);
  }

  const legacyState = inlineV1State(saveablePayload(state));
  const first = (await decodeSave(bytesFor(rawEnvelope(legacyState, 1)))).state;
  const second = (await decodeSave(bytesFor(rawEnvelope(legacyState, 1)))).state;
  assert.deepEqual(first.decisionAudits, second.decisionAudits);
  assert.deepEqual(first.decisionKnowledge, second.decisionKnowledge);
  assert.deepEqual(first.decisionAudits.map((audit) => audit.knowledgeId), state.decisionAudits.map((audit) => audit.knowledgeId));

  const noAuditLegacy = inlineV1State(createFictionalLeague("knowledge-pool-no-audit", 4));
  const noAuditLoaded = (await decodeSave(bytesFor(rawEnvelope(noAuditLegacy, 1)))).state;
  assert.deepEqual(noAuditLoaded.decisionAudits, []);
  assert.deepEqual(noAuditLoaded.decisionKnowledge, {});
});

test("save loading rejects malformed and missing v2 knowledge references", async () => {
  const state = advanceHeadlessCareerStep(beginSeason(createFictionalLeague("knowledge-pool-corrupt", 4))).state;
  const missing = structuredClone(saveablePayload(state));
  delete missing.decisionKnowledge[missing.decisionAudits[0].knowledgeId];
  await assert.rejects(() => decodeSave(bytesFor(rawEnvelope(missing))), /Missing decision knowledge reference/);

  const malformed = structuredClone(saveablePayload(state));
  delete malformed.decisionAudits[0].knowledgeId;
  await assert.rejects(() => decodeSave(bytesFor(rawEnvelope(malformed))), /Malformed decision audit knowledge reference/);
});

test("runtime and save retention prune the pool to exactly the live audit references", () => {
  let state = beginSeason(createFictionalLeague("knowledge-pool-prune", 4));
  state = advanceHeadlessCareerStep(state).state;
  state.decisionKnowledge.orphan = structuredClone(Object.values(state.decisionKnowledge)[0]);
  const audits = state.decisionAudits;
  const retained = retainedDecisionKnowledge(state.decisionKnowledge, audits);
  assert.deepEqual(Object.keys(retained), [...new Set(audits.map((audit) => audit.knowledgeId))]);
  assert.deepEqual(Object.keys(saveablePayload(state).decisionKnowledge), Object.keys(retained));
  const advanced = advanceHeadlessCareerStep(state).state;
  assert.deepEqual(Object.keys(advanced.decisionKnowledge),
    [...new Set(advanced.decisionAudits.map((audit) => audit.knowledgeId))],
    "the live pool is pruned whenever a new attributed batch is retained");
  for (const audit of advanced.decisionAudits) {
    const knowledge = decisionKnowledgeFor(advanced, audit);
    assert.equal(Object.isFrozen(knowledge), true);
    assert.equal(Object.isFrozen(knowledge.facts), true);
    assert.equal(Object.isFrozen(knowledge.facts[0]), true);
  }
});

test("72-team portal knowledge remains shared and below the compressed overhead gate", { timeout: 120_000 }, async () => {
  const state = portalWindow("portal-payload-72", 72);
  const views = portalPlanningKnowledgeViews(state);
  const commands = planOffseasonCommands(state, undefined, views);
  const attributed = advanceHeadlessCareerStep(state).state;
  const bidAudits = attributed.decisionAudits.filter((audit) => audit.commandType === "BID_PORTAL_PLAYER");
  assert.equal(bidAudits.length, commands.length);
  assert.equal(Object.keys(attributed.decisionKnowledge).length, Object.keys(state.programs).length,
    "one exact portal snapshot is interned per program, not per bid");
  for (const programId of Object.keys(state.programs)) {
    const programAudits = bidAudits.filter((audit) => audit.programId === programId);
    assert.equal(new Set(programAudits.map((audit) => audit.knowledgeId)).size, 1,
      `${programId} must share one exact knowledge id across all bids`);
  }

  const stripped = structuredClone(attributed);
  stripped.decisionKnowledge = {};
  for (const audit of stripped.decisionAudits) {
    const knowledge = structuredClone(decisionKnowledgeFor(attributed, audit));
    for (const fact of knowledge.facts) {
      if (fact.key === "portalPlanning.view.v1") fact.value = "{}";
    }
    audit.knowledgeId = internDecisionKnowledge(stripped.decisionKnowledge, knowledge);
  }
  const [fullBytes, strippedBytes] = await Promise.all([
    encodeSave(attributed, "program-1"),
    encodeSave(stripped, "program-1")
  ]);
  const overhead = (fullBytes.length - strippedBytes.length) / strippedBytes.length;
  assert.ok(overhead <= 0.25,
    `exact 72-team portal knowledge must add at most 25% compressed save overhead, saw ${(overhead * 100).toFixed(2)}%`);

  const result = advanceOffseasonStep(state, commands);
  assert.ok(!result.events.some((event) => event.type === "COMMAND_REJECTED" && event.command.type === "BID_PORTAL_PLAYER"));
});

test("non-portal weekly audit knowledge and causal records survive pool save and resume", async () => {
  const state = beginSeason(createFictionalLeague("knowledge-pool-non-portal", 4));
  const commands = planWeeklyCommands(state);
  assert.ok(commands.length > 0);
  const resolved = advanceHeadlessCareerStep(state).state;
  const loaded = (await decodeSave(await encodeSave(resolved, "program-1"))).state;
  assert.deepEqual(loaded.decisionAudits, resolved.decisionAudits);
  for (const audit of loaded.decisionAudits) {
    assert.deepEqual(decisionKnowledgeFor(loaded, audit), decisionKnowledgeFor(resolved, audit));
    assert.deepEqual(audit.causes, resolved.decisionAudits.find((candidate) => candidate.submissionId === audit.submissionId).causes);
  }
});
