import type { CareerPath, GameCommand, GameEvent, GameState, ProgramId } from "@college-legends/model";

export type WorkerRequest =
  | { type: "CREATE_GAME"; requestId: string; careerPath: CareerPath; seed: string }
  | { type: "BEGIN_SEASON"; requestId: string; playerProgramId: ProgramId }
  | { type: "ADVANCE_WEEK"; requestId: string; playerProgramId: ProgramId; commands: GameCommand[] };

export type WorkerResponse =
  | { type: "READY"; requestId: string; state: GameState; playerProgramId: ProgramId; events: GameEvent[] }
  | { type: "COMPLETE"; requestId: string; state: GameState; events: GameEvent[] }
  | { type: "ERROR"; requestId: string; message: string };
