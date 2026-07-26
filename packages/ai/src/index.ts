import type { GameCommand, GameState, Prospect } from "@college-legends/model";

/** AI uses the same scouting, evaluation, and pursuit commands as the human player. */
export function planWeeklyCommands(state: Readonly<GameState>, excludedProgramId?: string): GameCommand[] {
  if (state.phase !== "REGULAR_SEASON" || state.week > 14) return [];
  return Object.values(state.programs).flatMap((program) => {
    if (program.id === excludedProgramId || projectedOpenings(state, program.id) <= 0) return [];
    const recruiting = state.recruiting[program.id];
    if (!recruiting || recruiting.points <= 0) return [];
    let points = recruiting.points;
    const commands: GameCommand[] = [];
    const discovered = recruiting.discoveredProspectIds
      .map((prospectId) => state.prospects[prospectId])
      .filter((prospect): prospect is Prospect => Boolean(prospect && prospect.status === "AVAILABLE"))
      .sort((left, right) => prospectValue(state, right, program.id) - prospectValue(state, left, program.id) || left.id.localeCompare(right.id));

    if (discovered.length < 5) {
      const searchType = program.tier === "POWER" ? "NATIONAL_SHOWCASE" : program.tier === "LOW" ? "SLEEPERS" : "LOCAL_REGION";
      const cost = searchType === "NATIONAL_SHOWCASE" ? 25 : searchType === "SLEEPERS" ? 10 : 15;
      if (points >= cost) {
        commands.push({ type: "SEARCH_PROSPECTS", programId: program.id, searchType });
        points -= cost;
      }
    }

    for (const prospect of discovered.slice(0, 3)) {
      const scouting = recruiting.scoutingByProspect[prospect.id]!;
      if (!scouting.evaluations.includes("BASIC") && points >= 5) {
        commands.push({ type: "EVALUATE_PROSPECT", programId: program.id, prospectId: prospect.id, evaluation: "BASIC" });
        points -= 5;
      }
      if (!scouting.evaluations.includes("PROJECTION") && points >= 12 && (state.week + prospect.id.length) % 2 === 0) {
        commands.push({ type: "EVALUATE_PROSPECT", programId: program.id, prospectId: prospect.id, evaluation: "PROJECTION" });
        points -= 12;
      }
      const investment = Math.min(points, scouting.pursuitPoints > 0 ? 10 : 15);
      if (investment >= 5) {
        commands.push({ type: "INVEST_RECRUITING_POINTS", programId: program.id, prospectId: prospect.id, points: investment });
        points -= investment;
      }
      if (points < 5) break;
    }
    return commands;
  });
}

function projectedOpenings(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId]!;
  const roster = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP"
  );
  const departures = roster.filter((player) => player.eligibility.seasonsRemaining <= 1).length;
  const commitments = Object.values(state.prospects).filter((prospect) =>
    prospect.status === "COMMITTED" && prospect.signedProgramId === programId
  ).length;
  return Math.max(0, program.scholarshipLimit - roster.length + departures - commitments);
}

function prospectValue(state: Readonly<GameState>, prospect: Prospect, programId: string): number {
  const localBonus = prospect.homeDivisionId === state.programs[programId]!.divisionId ? 8 : 0;
  const needBonus = Object.values(state.players).filter((player) =>
    player.programId === programId
    && player.position === prospect.position
    && player.eligibility.rosterStatus === "SCHOLARSHIP"
    && player.eligibility.seasonsRemaining > 1
  ).length <= 2 ? 7 : 0;
  return prospect.overall * 0.4 + prospect.potential * 0.25 + prospect.interestByProgram[programId]! * 0.25 + localBonus + needBonus;
}
