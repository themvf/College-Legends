import type { GameCommand, GameState, Prospect } from "@college-legends/model";

/** AI emits the same command objects as a human controller; resolution remains in simulation. */
export function planWeeklyCommands(state: Readonly<GameState>, excludedProgramId?: string): GameCommand[] {
  if (state.phase !== "REGULAR_SEASON" || state.week > 12) return [];
  const available = Object.values(state.prospects).filter((prospect) => prospect.status === "AVAILABLE");
  return Object.values(state.programs).flatMap((program) => {
    if (program.id === excludedProgramId) return [];
    const openScholarships = program.scholarshipLimit - scholarshipCount(state, program.id);
    if (openScholarships <= 0) return [];
    return [...available]
      .sort((left, right) => prospectValue(right, program.id) - prospectValue(left, program.id) || left.id.localeCompare(right.id))
      .slice(0, Math.min(2, openScholarships))
      .map((prospect) => ({ type: "OFFER_PROSPECT" as const, programId: program.id, prospectId: prospect.id }));
  });
}

function scholarshipCount(state: Readonly<GameState>, programId: string): number {
  return Object.values(state.players).filter((player) => player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
}

function prospectValue(prospect: Prospect, programId: string): number {
  return prospect.overall * 0.55 + prospect.potential * 0.2 + prospect.interestByProgram[programId]! * 0.25;
}
