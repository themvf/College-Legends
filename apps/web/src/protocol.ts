import type { CareerPath, GameCommand, GameEvent, GameState, ProgramId } from "@college-legends/model";
import type { ProgramPreview } from "@college-legends/simulation";

export type WorkerRequest =
  /** Generates a league and offers the jobs available at that career path's tier. */
  | { type: "CREATE_GAME"; requestId: string; careerPath: CareerPath; seed: string }
  | { type: "CHOOSE_PROGRAM"; requestId: string; careerPath: CareerPath; programId: ProgramId }
  | { type: "BEGIN_SEASON"; requestId: string; playerProgramId: ProgramId; commands: GameCommand[] }
  | { type: "ADVANCE_WEEK"; requestId: string; playerProgramId: ProgramId; commands: GameCommand[] }
  /** Scouting resolves before the week is advanced, so the report can inform the plan. */
  | { type: "PREPARE"; requestId: string; playerProgramId: ProgramId; commands: GameCommand[] };

export type WorkerResponse =
  | { type: "CANDIDATES"; requestId: string; state: GameState; previews: ProgramPreview[] }
  | { type: "READY"; requestId: string; state: GameState; playerProgramId: ProgramId; events: GameEvent[] }
  | { type: "COMPLETE"; requestId: string; state: GameState; events: GameEvent[] }
  | { type: "ERROR"; requestId: string; message: string };
