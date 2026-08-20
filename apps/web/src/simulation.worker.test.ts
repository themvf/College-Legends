import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";

const storage = vi.hoisted(() => ({
  bytes: null as Uint8Array<ArrayBuffer> | null,
  writeSave: vi.fn(async (bytes: Uint8Array<ArrayBuffer>) => {
    storage.bytes = bytes;
    return true;
  })
}));

vi.mock("./storage.js", () => ({
  storageAvailable: () => true,
  writeSave: storage.writeSave,
  readSave: async () => storage.bytes,
  savedBytes: async () => storage.bytes?.length ?? 0,
  deleteSave: async () => { storage.bytes = null; }
}));

interface TestWorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
}

describe("simulation worker decision routing", () => {
  let scope: TestWorkerScope;

  beforeEach(async () => {
    vi.resetModules();
    storage.bytes = null;
    storage.writeSave.mockClear();
    scope = { onmessage: null, postMessage: vi.fn() };
    vi.stubGlobal("self", scope);
    await import("./simulation.worker.js");
  });

  function dispatch(request: WorkerRequest): void {
    if (!scope.onmessage) throw new Error("Worker did not register its message handler.");
    scope.onmessage({ data: request } as MessageEvent<WorkerRequest>);
  }

  function response(requestId: string, type?: WorkerResponse["type"]): WorkerResponse {
    const messages = scope.postMessage.mock.calls.map(([message]) => message as WorkerResponse);
    const match = [...messages].reverse().find((message) =>
      "requestId" in message && message.requestId === requestId && (!type || message.type === type));
    if (!match) throw new Error(`No ${type ?? "worker"} response for ${requestId}.`);
    return match;
  }

  it("commits, autosaves, reloads, and reports blocked attributed decisions", async () => {
    dispatch({ type: "CREATE_GAME", requestId: "create", careerPath: "DYNASTY_BUILDER", seed: "worker-decision-contract" });
    const candidates = response("create", "CANDIDATES");
    if (candidates.type !== "CANDIDATES") throw new Error("Expected candidates.");
    const programId = Object.keys(candidates.state.programs)[0]!;
    const otherProgramId = Object.keys(candidates.state.programs)[1]!;
    const manualActor = { mode: "MANUAL" as const, actorId: `player:${programId}`, displayName: "Test player" };

    dispatch({ type: "CHOOSE_PROGRAM", requestId: "choose", careerPath: "DYNASTY_BUILDER", programId });
    dispatch({ type: "BEGIN_SEASON", requestId: "begin", playerProgramId: programId, commands: [] });
    await vi.waitFor(() => expect(storage.writeSave).toHaveBeenCalled());
    storage.writeSave.mockClear();
    storage.bytes = null;

    dispatch({
      type: "PREPARE_DECISION",
      requestId: "focus",
      playerProgramId: programId,
      actor: manualActor,
      command: { type: "SET_WEEK_FOCUS", programId, focuses: ["DEVELOP"] }
    });
    const focused = response("focus", "COMPLETE");
    if (focused.type !== "COMPLETE") throw new Error("Expected completed focus decision.");
    expect(focused.state.weekFocus[programId]).toEqual(["DEVELOP"]);
    expect(focused.state.decisionAudits?.at(-1)).toMatchObject({
      actor: manualActor,
      commandType: "SET_WEEK_FOCUS",
      status: "DONE"
    });
    expect(focused.events.at(-1)).toMatchObject({
      type: "DECISION_AUDITED",
      submissionId: focused.state.decisionAudits?.at(-1)?.submissionId
    });

    await vi.waitFor(() => expect(storage.writeSave).toHaveBeenCalled());
    dispatch({ type: "LOAD_SAVE", requestId: "load" });
    await vi.waitFor(() => expect(response("load", "READY").type).toBe("READY"));
    const loaded = response("load", "READY");
    if (loaded.type !== "READY") throw new Error("Expected loaded save.");
    expect(loaded.state.decisionAudits?.at(-1)).toMatchObject({ commandType: "SET_WEEK_FOCUS", status: "DONE" });

    const programStaff = Object.values(loaded.state.staff).filter((member) => member.programId === programId);
    const headCoach = programStaff.find((member) => member.role === "HEAD_COACH");
    const coordinator = programStaff.find((member) => member.role === "OFFENSIVE_COORDINATOR");
    expect(headCoach).toBeDefined();
    expect(coordinator).toBeDefined();
    const writesBeforeDelegation = storage.writeSave.mock.calls.length;
    dispatch({
      type: "PREPARE_DELEGATED",
      requestId: "delegate",
      playerProgramId: programId,
      staffId: headCoach!.id,
      policyId: "WEEKLY_PLANNING",
      domain: "WEEK_FOCUS"
    });
    const delegated = response("delegate", "COMPLETE");
    if (delegated.type !== "COMPLETE") throw new Error("Expected delegated planning to complete.");
    expect(delegated.state.decisionAudits?.at(-1)).toMatchObject({
      actor: {
        mode: "DELEGATED",
        staffId: headCoach!.id,
        delegatedByActorId: `player:${programId}`,
        policyId: "WEEKLY_PLANNING"
      },
      commandType: "SET_WEEK_FOCUS",
      status: "DONE"
    });
    await vi.waitFor(() => expect(storage.writeSave.mock.calls.length).toBeGreaterThan(writesBeforeDelegation));
    const writesBeforeUnauthorizedDelegation = storage.writeSave.mock.calls.length;
    const writesBeforeRejectedDecision = storage.writeSave.mock.calls.length;
    dispatch({
      type: "PREPARE_DELEGATED",
      requestId: "delegate-unauthorized",
      playerProgramId: programId,
      staffId: coordinator!.id,
      policyId: "WEEKLY_PLANNING",
      domain: "WEEK_FOCUS"
    });
    expect(response("delegate-unauthorized", "ERROR")).toMatchObject({
      type: "ERROR",
      message: "That staff member is not authorized for the weekly planning policy."
    });
    expect(storage.writeSave).toHaveBeenCalledTimes(writesBeforeUnauthorizedDelegation);

    dispatch({
      type: "PREPARE_DECISION",
      requestId: "reject",
      playerProgramId: programId,
      actor: manualActor,
      command: { type: "SET_SCOUTING_TARGET", programId, opponentProgramId: "not-on-schedule" }
    });
    const rejected = response("reject", "COMPLETE");
    if (rejected.type !== "COMPLETE") throw new Error("Expected rejected decision to settle as a complete worker response.");
    const audit = rejected.state.decisionAudits?.at(-1);
    expect(audit).toMatchObject({
      actor: manualActor,
      commandType: "SET_SCOUTING_TARGET",
      status: "BLOCKED",
      rejectionReason: "That opponent is not on the remaining schedule."
    });
    expect(rejected.events.at(-1)).toMatchObject({ type: "DECISION_AUDITED", submissionId: audit?.submissionId });
    expect(scope.postMessage.mock.calls.map(([message]) => message as WorkerResponse))
      .not.toContainEqual(expect.objectContaining({ type: "ERROR", requestId: "reject" }));
    await vi.waitFor(() => expect(storage.writeSave.mock.calls.length).toBeGreaterThan(writesBeforeRejectedDecision));

    const writesBeforeAdvance = storage.writeSave.mock.calls.length;
    dispatch({ type: "ADVANCE_WEEK", requestId: "advance", playerProgramId: programId, commands: [] });
    const advanced = response("advance", "COMPLETE");
    if (advanced.type !== "COMPLETE") throw new Error("Expected completed week.");
    const aiAudit = advanced.state.decisionAudits?.find((candidate) =>
      candidate.actor.mode === "AI"
      && candidate.knowledge.facts.some((fact) => fact.key === "weeklyPlanning.view.v1"));
    expect(aiAudit).toBeDefined();
    const recordedView = JSON.parse(String(aiAudit?.knowledge.facts[0]?.value));
    expect(recordedView).toMatchObject({ kind: "WEEKLY_PLANNING_KNOWLEDGE_V1", programId: aiAudit?.programId });
    await vi.waitFor(() => expect(storage.writeSave.mock.calls.length).toBeGreaterThan(writesBeforeAdvance));

    const writesBeforeSpoof = storage.writeSave.mock.calls.length;
    dispatch({
      type: "PREPARE_DECISION",
      requestId: "spoof",
      playerProgramId: programId,
      actor: manualActor,
      command: { type: "SET_WEEK_FOCUS", programId: otherProgramId, focuses: ["RECRUIT"] }
    });
    expect(response("spoof", "ERROR")).toMatchObject({
      type: "ERROR",
      message: "A player command can only control the active program."
    });
    expect(storage.writeSave).toHaveBeenCalledTimes(writesBeforeSpoof);

    dispatch({
      type: "ADVANCE_WEEK",
      requestId: "advance-spoof",
      playerProgramId: otherProgramId,
      commands: [{ type: "SET_WEEK_FOCUS", programId: otherProgramId, focuses: ["RECRUIT"] }]
    });
    expect(response("advance-spoof", "ERROR")).toMatchObject({
      type: "ERROR",
      message: "A player request can only control the active program."
    });
    expect(storage.writeSave).toHaveBeenCalledTimes(writesBeforeSpoof);

    dispatch({
      type: "ADVANCE_WEEK",
      requestId: "attribution-bypass",
      playerProgramId: programId,
      commands: [{ type: "SET_WEEK_FOCUS", programId, focuses: ["RECRUIT"] }]
    });
    expect(response("attribution-bypass", "ERROR")).toMatchObject({
      type: "ERROR",
      message: "Weekly planning commands must use the attributed decision route."
    });
    expect(storage.writeSave).toHaveBeenCalledTimes(writesBeforeSpoof);

    dispatch({
      type: "PREPARE",
      requestId: "prepare-attribution-bypass",
      playerProgramId: programId,
      commands: [{ type: "SET_SCOUTING_TARGET", programId, opponentProgramId: otherProgramId }]
    });
    expect(response("prepare-attribution-bypass", "ERROR")).toMatchObject({
      type: "ERROR",
      message: "Weekly planning commands must use the attributed decision route."
    });
    expect(storage.writeSave).toHaveBeenCalledTimes(writesBeforeSpoof);

    dispatch({ type: "CHOOSE_PROGRAM", requestId: "rechoose", careerPath: "DYNASTY_BUILDER", programId: otherProgramId });
    expect(response("rechoose", "ERROR")).toMatchObject({
      type: "ERROR",
      message: "This career already has an active program."
    });
  }, 30_000);

  it("continues preparation slot sequences after save and resume", async () => {
    dispatch({ type: "CREATE_GAME", requestId: "create-scheme", careerPath: "DYNASTY_BUILDER", seed: "worker-prepare-sequence" });
    const candidates = response("create-scheme", "CANDIDATES");
    if (candidates.type !== "CANDIDATES") throw new Error("Expected candidates.");
    const programId = Object.keys(candidates.state.programs)[0]!;
    dispatch({ type: "CHOOSE_PROGRAM", requestId: "choose-scheme", careerPath: "DYNASTY_BUILDER", programId });
    dispatch({
      type: "PREPARE",
      requestId: "scheme-one",
      playerProgramId: programId,
      commands: [{ type: "SET_SCHEME", programId, scheme: { offense: "AIR_RAID" } }]
    });
    const first = response("scheme-one", "COMPLETE");
    if (first.type !== "COMPLETE") throw new Error("Expected first scheme choice.");
    const firstAudit = first.state.decisionAudits?.at(-1);
    expect(firstAudit?.submissionId).toMatch(/:submission:0$/);
    await vi.waitFor(() => expect(storage.writeSave).toHaveBeenCalled());
    dispatch({ type: "LOAD_SAVE", requestId: "load-scheme" });
    await vi.waitFor(() => expect(response("load-scheme", "READY").type).toBe("READY"));
    dispatch({
      type: "PREPARE",
      requestId: "scheme-two",
      playerProgramId: programId,
      commands: [{ type: "SET_SCHEME", programId, scheme: { offense: "POWER_RUN" } }]
    });
    const second = response("scheme-two", "COMPLETE");
    if (second.type !== "COMPLETE") throw new Error("Expected second scheme choice.");
    const secondAudit = second.state.decisionAudits?.at(-1);
    expect(secondAudit?.decisionId).toBe(firstAudit?.decisionId);
    expect(secondAudit?.submissionId).toMatch(/:submission:1$/);
    expect(secondAudit?.causes.map((cause) => cause.eventType)).toEqual(["SCHEME_SET"]);
  }, 30_000);
});
