import type { DevelopmentFocus, GamePlan, GameState, GameCommand, Position, Prospect } from "@college-legends/model";
import { intendedGamePlan, MAXIMUM_REPS_PER_SIDE, programUnitRatings, scheduledOpponent, scoutingCost, SCOUTING_TIERS } from "@college-legends/simulation";

/**
 * Rivals answer the same game-plan questions the player does, from what a
 * coaching staff could know: their own identity and personnel, and the
 * opponent's film. They call `intendedGamePlan` — the same function the
 * player's scouting report reads — so a bought report describes the plan that
 * is actually run rather than a parallel guess.
 */
function planGamePlan(state: Readonly<GameState>, programId: string, opponentId: string | null): GamePlan {
  const program = state.programs[programId]!;
  const roster = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP"
  );
  const fatigue = roster.reduce((total, player) => total + player.fatigue, 0) / Math.max(1, roster.length);
  const opponent = opponentId ? state.programs[opponentId] : null;
  return intendedGamePlan(
    program.schemeIdentity,
    programUnitRatings(state, programId),
    opponentId ? programUnitRatings(state, opponentId) : null,
    fatigue,
    program.losses > program.wins,
    opponent?.schemeIdentity ?? null
  );
}

/**
 * Rivals face the same squeeze the player does: a week of attention buys either
 * information about the opponent or reps installing their own plan. They keep
 * most of it for installation and buy the cheapest useful report with the rest.
 */
function planPreparation(state: Readonly<GameState>, programId: string): GameCommand[] {
  const preparation = state.preparation?.[programId];
  if (!preparation || !scheduledOpponent(state, programId)) return [];
  let points = preparation.points;
  const commands: GameCommand[] = [];

  // Install first — a plan that is not practised is worth less than knowing
  // what the opponent will do with theirs.
  for (const side of ["OFFENSE", "DEFENSE"] as const) {
    const current = side === "OFFENSE" ? preparation.offensiveReps : preparation.defensiveReps;
    const target = Math.min(MAXIMUM_REPS_PER_SIDE, current + Math.floor(points * 0.35));
    if (target <= current) continue;
    commands.push({ type: "SET_PRACTICE_REPS", programId, side, reps: target });
    points -= target - current;
  }

  for (const tier of SCOUTING_TIERS) {
    if (preparation.scoutedTiers.includes(tier)) continue;
    const cost = scoutingCost(tier);
    if (points < cost) continue;
    commands.push({ type: "SCOUT_OPPONENT", programId, tier });
    points -= cost;
  }
  return commands;
}

function upcomingOpponent(state: Readonly<GameState>, programId: string): string | null {
  const game = state.schedule.find((item) =>
    item.week === state.week && !item.played && (item.homeProgramId === programId || item.awayProgramId === programId)
  );
  if (!game) return null;
  return game.homeProgramId === programId ? game.awayProgramId : game.homeProgramId;
}

/** AI programs use the same limited development, media, and recruiting decisions as the human player. */
export function planWeeklyCommands(state: Readonly<GameState>, excludedProgramId?: string): GameCommand[] {
  if (state.phase !== "REGULAR_SEASON" || state.week > 14) return [];
  return Object.values(state.programs).flatMap((program) => {
    if (program.id === excludedProgramId) return [];
    const commands: GameCommand[] = [];

    commands.push(...planPreparation(state, program.id));

    const desired = planGamePlan(state, program.id, upcomingOpponent(state, program.id));
    const current = state.gamePlans?.[program.id];
    const changes = Object.fromEntries(
      (Object.keys(desired) as (keyof GamePlan)[])
        .filter((key) => !current || current[key] !== desired[key])
        .map((key) => [key, desired[key]])
    );
    if (Object.keys(changes).length > 0) commands.push({ type: "SET_GAME_PLAN", programId: program.id, plan: changes });

    const position = weakestPosition(state, program.id);
    const developmentFocus: Exclude<DevelopmentFocus, "BALANCED"> = state.week % 3 === 1 ? "TECHNIQUE" : state.week % 3 === 2 ? "STRENGTH" : "CONDITIONING";
    commands.push({ type: "SET_DEVELOPMENT_SPOTLIGHT", programId: program.id, target: { type: "POSITION", position }, focus: developmentFocus });

    const featuredPlayer = Object.values(state.players)
      .filter((player) =>
        player.programId === program.id
        && player.eligibility.rosterStatus === "SCHOLARSHIP"
        && player.eligibility.redshirtStatus !== "REDSHIRTING"
      )
      .sort((left, right) =>
        (right.lastGameRating ?? 0) - (left.lastGameRating ?? 0)
        || right.stardom - left.stardom
        || right.overall - left.overall
        || left.id.localeCompare(right.id)
      )[0];
    if (featuredPlayer) {
      const action = state.week % 3 === 1 ? "MEDIA_DAY" : state.week % 3 === 2 ? "SOCIAL_MEDIA" : "COMMUNITY_APPEARANCE";
      commands.push({ type: "SET_PLAYER_MEDIA_ACTION", programId: program.id, playerId: featuredPlayer.id, action });
    }

    if (projectedOpenings(state, program.id) <= 0) return commands;
    const recruiting = state.recruiting[program.id];
    if (!recruiting || recruiting.points <= 0) return commands;
    let points = recruiting.points;
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

function weakestPosition(state: Readonly<GameState>, programId: string): Position {
  const positions: Position[] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
  return positions.map((position) => {
    const players = Object.values(state.players).filter((player) =>
      player.programId === programId
      && player.position === position
      && player.eligibility.rosterStatus === "SCHOLARSHIP"
    );
    return { position, average: players.reduce((sum, player) => sum + player.overall, 0) / Math.max(1, players.length) };
  }).sort((left, right) => left.average - right.average || left.position.localeCompare(right.position))[0]!.position;
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
