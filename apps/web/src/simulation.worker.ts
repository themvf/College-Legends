/// <reference lib="webworker" />
import type { CareerPath, GameCommand, GameState, ProgramId } from "@college-legends/model";
import { CAREER_PATHS } from "@college-legends/content";
import { planWeeklyCommands } from "@college-legends/ai";
import { advanceWeek, beginSeason, createFictionalLeague, decodeSave, encodeSave, prepareWeek, programPreviews } from "@college-legends/simulation";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";
import { deleteSave, readSave, savedBytes, storageAvailable, writeSave } from "./storage.js";

let activeState: GameState | undefined;
let activeProgramId: ProgramId | undefined;

/**
 * Autosave runs after every completed week, inside the worker, so neither the
 * encode nor the disk write ever touches the render thread. Fire-and-forget: a
 * failed save must never break the turn the player just took.
 */
function autosave(state: GameState, playerProgramId: ProgramId | undefined): void {
  if (!playerProgramId || !storageAvailable()) return;
  void (async () => {
    try {
      const bytes = await encodeSave(state, playerProgramId);
      const written = await writeSave(bytes as Uint8Array<ArrayBuffer>);
      if (written) reply({ type: "SAVED", bytes: bytes.length, savedAt: new Date().toISOString() });
    } catch {
      // Saving is best effort. The week already resolved.
    }
  })();
}



function reply(message: WorkerResponse): void { self.postMessage(message); }

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
      void (async () => {
        await deleteSave();
        reply({ type: "NO_SAVE", requestId: request.requestId });
      })();
      return;
    }
    if (request.type === "CREATE_GAME") {
      // The league is generated first so the player can see the jobs it offers.
      // Nothing is committed until a program is chosen.
      activeState = createFictionalLeague(request.seed);
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
      const profile = CAREER_PATHS[request.careerPath];
      const program = activeState.programs[request.programId];
      if (!program) throw new Error("That program is not in this league.");
      program.budget = profile.budget;
      program.coachSecurity = profile.initialSecurity;
      activeProgramId = program.id;
      reply({ type: "READY", requestId: request.requestId, state: activeState, playerProgramId: program.id, events: [] });
      return;
    }
    if (!activeState) throw new Error("Create a game before advancing the simulation.");
    if (request.type === "BEGIN_SEASON") {
      const historyLength = activeState.eventHistory.length;
      activeState = beginSeason(activeState, request.commands);
      activeProgramId = request.playerProgramId;
      autosave(activeState, activeProgramId);
      reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: activeState.eventHistory.slice(historyLength) });
      return;
    }
    if (request.type === "PREPARE") {
      const result = prepareWeek(activeState, request.commands);
      activeState = result.state;
      reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: result.events });
      return;
    }
    const aiCommands = planWeeklyCommands(activeState, request.playerProgramId);
    const result = advanceWeek(activeState, [...aiCommands, ...request.commands] as GameCommand[]);
    activeState = result.state;
    activeProgramId = request.playerProgramId;
    autosave(activeState, activeProgramId);
    reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: result.events });
  } catch (error) {
    reply({ type: "ERROR", requestId: request.requestId, message: error instanceof Error ? error.message : "Simulation failed." });
  }
};
