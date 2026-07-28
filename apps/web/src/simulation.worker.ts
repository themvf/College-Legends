/// <reference lib="webworker" />
import type { CareerPath, GameCommand, GameState, ProgramId } from "@college-legends/model";
import { CAREER_PATHS } from "@college-legends/content";
import { planWeeklyCommands } from "@college-legends/ai";
import { advanceWeek, beginSeason, createFictionalLeague, prepareWeek, programPreviews } from "@college-legends/simulation";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";

let activeState: GameState | undefined;



function reply(message: WorkerResponse): void { self.postMessage(message); }

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
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
      reply({ type: "READY", requestId: request.requestId, state: activeState, playerProgramId: program.id, events: [] });
      return;
    }
    if (!activeState) throw new Error("Create a game before advancing the simulation.");
    if (request.type === "BEGIN_SEASON") {
      const historyLength = activeState.eventHistory.length;
      activeState = beginSeason(activeState, request.commands);
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
    reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: result.events });
  } catch (error) {
    reply({ type: "ERROR", requestId: request.requestId, message: error instanceof Error ? error.message : "Simulation failed." });
  }
};
