/// <reference lib="webworker" />
import type { CareerPath, DecisionActor, GameCommand, GameState, ProgramId } from "@college-legends/model";
import { CAREER_PATHS } from "@college-legends/content";
import { coachingPlanningKnowledgeSnapshot, planOffseasonCommands, planWeeklyCommands, portalPlanningKnowledgeSnapshot, portalPlanningKnowledgeViews, selectWeeklyFocusAndScouting, trainingCampPlanningKnowledgeSnapshot, weeklyBusinessPlanningKnowledgeSnapshot, weeklyBusinessPlanningKnowledgeViews, weeklyPlanningKnowledgeSnapshot, weeklyPlanningKnowledgeView } from "@college-legends/ai";
import { advanceOffseasonStepWithDecisions, advanceWeekWithDecisions, beginSeasonWithDecisions, commitWeeklyDecision, createDelegatedWeeklyPlanningDecision, createFictionalLeague, createGameDecision, createWeeklyPlanningDecision, decodeSave, encodeSave, prepareWeekWithDecisions, programPreviews, type WeeklyPlanningCommand } from "@college-legends/simulation";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";
import { deleteSave, readSave, savedBytes, storageAvailable, writeSave } from "./storage.js";

let activeState: GameState | undefined;
let activeProgramId: ProgramId | undefined;
let autosaveTail: Promise<void> = Promise.resolve();
let saveGeneration = 0;

/**
 * Autosave runs after every completed week, inside the worker, so neither the
 * encode nor the disk write ever touches the render thread. Fire-and-forget: a
 * failed save must never break the turn the player just took.
 */
function autosave(state: GameState, playerProgramId: ProgramId | undefined): void {
  if (!playerProgramId || !storageAvailable()) return;
  const generation = saveGeneration;
  autosaveTail = autosaveTail.then(async () => {
    try {
      if (generation !== saveGeneration) return;
      const bytes = await encodeSave(state, playerProgramId);
      if (generation !== saveGeneration) return;
      const written = await writeSave(bytes as Uint8Array<ArrayBuffer>);
      if (written) reply({ type: "SAVED", bytes: bytes.length, savedAt: new Date().toISOString() });
    } catch {
      // Saving is best effort. The week already resolved.
    }
  });
}



function reply(message: WorkerResponse): void { self.postMessage(message); }

function manualActor(programId: ProgramId): Extract<DecisionActor, { mode: "MANUAL" }> {
  return { mode: "MANUAL", actorId: `player:${programId}`, displayName: "Player" };
}

function aiActor(
  state: Readonly<GameState>,
  programId: ProgramId,
  policyId: "weekly-plan-v1" | "offseason-plan-v1"
): Extract<DecisionActor, { mode: "AI" }> {
  const program = state.programs[programId];
  return {
    mode: "AI",
    actorId: `ai:${programId}`,
    displayName: program ? `${program.abbreviation} staff` : "Program AI",
    policyId
  };
}

function assertPlayerAuthority(
  playerProgramId: ProgramId,
  commands: readonly GameCommand[],
  allowAttributedPlanning = false
): void {
  if (playerProgramId !== activeProgramId) {
    throw new Error("A player request can only control the active program.");
  }
  if (commands.some((command) => command.programId !== playerProgramId)) {
    throw new Error("A player command can only control the active program.");
  }
  if (!allowAttributedPlanning && commands.some((command) =>
    command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET")) {
    throw new Error("Weekly planning commands must use the attributed decision route.");
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === "HAS_SAVE") {
      void (async () => {
        const bytes = await savedBytes();
        reply(bytes > 0
          ? { type: "SAVE_FOUND", requestId: request.requestId, bytes }
          : { type: "NO_SAVE", requestId: request.requestId });
      })();
      return;
    }
    if (request.type === "LOAD_SAVE") {
      saveGeneration += 1;
      void (async () => {
        try {
          const bytes = await readSave();
          if (!bytes) { reply({ type: "NO_SAVE", requestId: request.requestId }); return; }
          const loaded = await decodeSave(bytes);
          const playerProgramId = loaded.playerProgramId;
          if (!playerProgramId) { reply({ type: "NO_SAVE", requestId: request.requestId }); return; }
          activeState = loaded.state;
          activeProgramId = playerProgramId;
          reply({
            type: "READY",
            requestId: request.requestId,
            state: activeState,
            playerProgramId,
            events: [],
            savedBytes: await savedBytes()
          });
        } catch (error) {
          reply({ type: "ERROR", requestId: request.requestId, message: error instanceof Error ? error.message : "That save could not be read." });
        }
      })();
      return;
    }
    if (request.type === "DELETE_SAVE") {
      saveGeneration += 1;
      void (async () => {
        await deleteSave();
        reply({ type: "NO_SAVE", requestId: request.requestId });
      })();
      return;
    }
    if (request.type === "CREATE_GAME") {
      saveGeneration += 1;
      // The league is generated first so the player can see the jobs it offers.
      // Nothing is committed until a program is chosen.
      activeState = createFictionalLeague(request.seed);
      activeProgramId = undefined;
      reply({
        type: "CANDIDATES",
        requestId: request.requestId,
        state: activeState,
        previews: programPreviews(activeState, CAREER_PATHS[request.careerPath].tier)
      });
      return;
    }
    if (request.type === "CHOOSE_PROGRAM") {
      if (!activeState) throw new Error("Generate a league before choosing a program.");
      if (activeProgramId) throw new Error("This career already has an active program.");
      const profile = CAREER_PATHS[request.careerPath];
      const program = activeState.programs[request.programId];
      if (!program) throw new Error("That program is not in this league.");
      program.budget = profile.budget;
      program.coachSecurity = profile.initialSecurity;
      // The mandate is a property of the career the player chose, not a rule the
      // league plays under — every rival keeps a null deadline. Without this the
      // board had nothing to count down and "win a title in two years" was a
      // sentence on the job card that nothing ever enforced.
      program.championshipDeadline = profile.championshipDeadline;
      activeProgramId = program.id;
      reply({ type: "READY", requestId: request.requestId, state: activeState, playerProgramId: program.id, events: [] });
      return;
    }
    if (!activeState) throw new Error("Create a game before advancing the simulation.");
    if (request.type === "BEGIN_SEASON") {
      assertPlayerAuthority(request.playerProgramId, request.commands);
      const decisions = request.commands.map((command) =>
        createGameDecision(activeState!, command, manualActor(request.playerProgramId)));
      const result = beginSeasonWithDecisions(activeState, decisions);
      activeState = result.state;
      activeProgramId = request.playerProgramId;
      autosave(activeState, activeProgramId);
      reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: result.events });
      return;
    }
    if (request.type === "PREPARE") {
      assertPlayerAuthority(request.playerProgramId, request.commands);
      const decisions = request.commands.map((command) =>
        createGameDecision(activeState!, command, manualActor(request.playerProgramId)));
      const result = prepareWeekWithDecisions(activeState, decisions);
      activeState = result.state;
      activeProgramId = request.playerProgramId;
      autosave(activeState, activeProgramId);
      reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: result.events });
      return;
    }
    if (request.type === "PREPARE_DECISION") {
      assertPlayerAuthority(request.playerProgramId, [request.command], true);
      if (request.actor.mode !== "MANUAL" || request.actor.actorId !== `player:${request.playerProgramId}`) {
        throw new Error("Player requests must use the active manual decision actor.");
      }
      const decision = createWeeklyPlanningDecision(activeState, request.command, request.actor);
      const result = commitWeeklyDecision(activeState, decision);
      activeState = result.state;
      activeProgramId = request.playerProgramId;
      autosave(activeState, activeProgramId);
      reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: result.events });
      return;
    }
    if (request.type === "PREPARE_DELEGATED") {
      assertPlayerAuthority(request.playerProgramId, [], true);
      const view = weeklyPlanningKnowledgeView(activeState, request.playerProgramId);
      const selected = selectWeeklyFocusAndScouting(view);
      const commandType = request.domain === "WEEK_FOCUS" ? "SET_WEEK_FOCUS" : "SET_SCOUTING_TARGET";
      const command = selected.find((candidate) => candidate.type === commandType);
      if (!command) throw new Error("The delegated staff found no change to make in that planning domain.");
      const decision = createDelegatedWeeklyPlanningDecision(activeState, command, {
        staffId: request.staffId,
        delegatedByActorId: `player:${request.playerProgramId}`,
        policyId: request.policyId
      }, undefined, weeklyPlanningKnowledgeSnapshot(activeState, request.playerProgramId));
      const result = commitWeeklyDecision(activeState, decision);
      activeState = result.state;
      activeProgramId = request.playerProgramId;
      autosave(activeState, activeProgramId);
      reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: result.events });
      return;
    }
    if (request.type === "ADVANCE_OFFSEASON") {
      assertPlayerAuthority(request.playerProgramId, request.commands);
      if (activeState.phase !== "OFFSEASON") throw new Error("There is no offseason step open.");
      // Rivals plan against the same step the player just decided, so the
      // league moves around him rather than waiting for him.
      const portalViews = activeState.offseasonStep === "PORTAL"
        ? portalPlanningKnowledgeViews(activeState)
        : undefined;
      const rivals = planOffseasonCommands(activeState, request.playerProgramId, portalViews);
      const continuations = [...rivals, ...request.commands].filter((command): command is Extract<GameCommand, { type: "CONTINUE_OFFSEASON" }> =>
        command.type === "CONTINUE_OFFSEASON");
      const decisions = [
        ...rivals.filter((command) => command.type !== "CONTINUE_OFFSEASON").map((command, sequence) =>
          createGameDecision(
            activeState!,
            command,
            aiActor(activeState!, command.programId, "offseason-plan-v1"),
            sequence,
            command.type === "BID_PORTAL_PLAYER"
              ? portalPlanningKnowledgeSnapshot(activeState!, command.programId, portalViews![command.programId]!)
              : command.type === "REPLACE_STAFF"
                ? coachingPlanningKnowledgeSnapshot(activeState!, command.programId)
                : command.type === "SET_TRAINING_CAMP_FOCUS"
                  ? trainingCampPlanningKnowledgeSnapshot(activeState!, command.programId)
                  : undefined
          )),
        ...request.commands.filter((command) => command.type !== "CONTINUE_OFFSEASON").map((command, sequence) =>
          createGameDecision(activeState!, command, manualActor(request.playerProgramId), rivals.length + sequence))
      ];
      const result = advanceOffseasonStepWithDecisions(activeState, decisions, continuations);
      activeState = result.state;
      activeProgramId = request.playerProgramId;
      autosave(activeState, activeProgramId);
      reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: result.events });
      return;
    }
    if (activeState.phase === "OFFSEASON") {
      throw new Error("The season is over. Work through the offseason before the next one starts.");
    }
    assertPlayerAuthority(request.playerProgramId, request.commands);
    const businessViews = weeklyBusinessPlanningKnowledgeViews(activeState);
    const aiCommands = planWeeklyCommands(activeState, request.playerProgramId, businessViews);
    const aiPlanningCommands = aiCommands.filter((command): command is WeeklyPlanningCommand =>
      command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET");
    const aiDecisions = aiPlanningCommands.map((command, sequence) => {
      return createWeeklyPlanningDecision(
        activeState!,
        command,
        aiActor(activeState!, command.programId, "weekly-plan-v1"),
        sequence,
        weeklyPlanningKnowledgeSnapshot(activeState!, command.programId)
      );
    });
    const otherAiDecisions = aiCommands
      .filter((command) => command.type !== "SET_WEEK_FOCUS" && command.type !== "SET_SCOUTING_TARGET")
      .map((command, sequence) => createGameDecision(
        activeState!,
        command,
        aiActor(activeState!, command.programId, "weekly-plan-v1"),
        aiDecisions.length + sequence,
        command.type === "CHOOSE_BOOSTER"
          || command.type === "ACCEPT_SPONSORSHIP"
          || command.type === "UPGRADE_FACILITY"
          || command.type === "SET_TICKET_PRICE"
          ? weeklyBusinessPlanningKnowledgeSnapshot(activeState!, command.programId, businessViews[command.programId]!)
          : undefined
      ));
    const playerDecisions = request.commands.map((command, sequence) => createGameDecision(
      activeState!,
      command,
      manualActor(request.playerProgramId),
      aiDecisions.length + otherAiDecisions.length + sequence
    ));
    const result = advanceWeekWithDecisions(
      activeState,
      [...aiDecisions, ...otherAiDecisions, ...playerDecisions]
    );
    activeState = result.state;
    activeProgramId = request.playerProgramId;
    autosave(activeState, activeProgramId);
    reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: result.events });
  } catch (error) {
    reply({ type: "ERROR", requestId: request.requestId, message: error instanceof Error ? error.message : "Simulation failed." });
  }
};
