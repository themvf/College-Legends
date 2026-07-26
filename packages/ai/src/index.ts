import type { GameCommand, GameState } from "@college-legends/model";

/** AI emits the same command objects as a human controller; resolution remains in simulation. */
export function planWeeklyCommands(_state: Readonly<GameState>): GameCommand[] {
  return [];
}
