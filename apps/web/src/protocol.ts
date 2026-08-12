import type { CareerPath, GameCommand, GameEvent, GameState, ProgramId } from "@college-legends/model";
import type { ProgramPreview } from "@college-legends/simulation";

export type WorkerRequest =
  /** Generates a league and offers the jobs available at that career path's tier. */
  | { type: "CREATE_GAME"; requestId: string; careerPath: CareerPath; seed: string }
  | { type: "CHOOSE_PROGRAM"; requestId: string; careerPath: CareerPath; programId: ProgramId }
  | { type: "BEGIN_SEASON"; requestId: string; playerProgramId: ProgramId; commands: GameCommand[] }
  | { type: "ADVANCE_WEEK"; requestId: string; playerProgramId: ProgramId; commands: GameCommand[] }
  /** Scouting resolves before the week is advanced, so the report can inform the plan. */
  | { type: "PREPARE"; requestId: string; playerProgramId: ProgramId; commands: GameCommand[] }
  /**
   * Closes the open offseason step for the whole league. One step at a time —
   * the player sees each one, and rivals plan against the same step.
   */
  | { type: "ADVANCE_OFFSEASON"; requestId: string; playerProgramId: ProgramId; commands: GameCommand[] }
  /** Asks whether a career exists on this device, without loading it. */
  | { type: "HAS_SAVE"; requestId: string }
  /** Reads the autosave out of the origin private file system, if there is one. */
  | { type: "LOAD_SAVE"; requestId: string }
  | { type: "DELETE_SAVE"; requestId: string };

export type WorkerResponse =
  | { type: "CANDIDATES"; requestId: string; state: GameState; previews: ProgramPreview[] }
  | { type: "READY"; requestId: string; state: GameState; playerProgramId: ProgramId; events: GameEvent[]; savedBytes?: number }
  | { type: "NO_SAVE"; requestId: string }
  | { type: "SAVE_FOUND"; requestId: string; bytes: number }
  /** Unsolicited: autosave finished, and this is what the career costs on disk. */
  | { type: "SAVED"; bytes: number; savedAt: string }
  | { type: "COMPLETE"; requestId: string; state: GameState; events: GameEvent[] }
  | { type: "ERROR"; requestId: string; message: string };
