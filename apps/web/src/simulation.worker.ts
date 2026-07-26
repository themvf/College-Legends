/// <reference lib="webworker" />
import type { CareerPath, GameCommand, GameState, ProgramId } from "@college-legends/model";
import { CAREER_PATHS } from "@college-legends/content";
import { planWeeklyCommands } from "@college-legends/ai";
import { advanceWeek, beginSeason, createFictionalLeague } from "@college-legends/simulation";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";

let activeState: GameState | undefined;

function playerProgramForPath(state: GameState, careerPath: CareerPath): ProgramId {
  const tier = CAREER_PATHS[careerPath].tier;
  return Object.values(state.programs).find((program) => program.tier === tier)?.id ?? Object.keys(state.programs)[0]!;
}

function reply(message: WorkerResponse): void { self.postMessage(message); }

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === "CREATE_GAME") {
      activeState = createFictionalLeague(request.seed);
      const playerProgramId = playerProgramForPath(activeState, request.careerPath);
      const profile = CAREER_PATHS[request.careerPath];
      const program = activeState.programs[playerProgramId]!;
      program.budget = profile.budget;
      program.coachSecurity = profile.initialSecurity;
      reply({ type: "READY", requestId: request.requestId, state: activeState, playerProgramId, events: [] });
      return;
    }
    if (!activeState) throw new Error("Create a game before advancing the simulation.");
    if (request.type === "BEGIN_SEASON") {
      const historyLength = activeState.eventHistory.length;
      activeState = beginSeason(activeState, request.commands);
      reply({ type: "COMPLETE", requestId: request.requestId, state: activeState, events: activeState.eventHistory.slice(historyLength) });
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
