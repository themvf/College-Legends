import type { DevelopmentFocus, GamePlan, GameState, GameCommand, Position, Prospect, TeamUnitRatings } from "@college-legends/model";
import { programUnitRatings } from "@college-legends/simulation";

/**
 * Rivals answer the same game-plan questions the player does, using what a
 * coaching staff could reasonably know: their own personnel and the opponent's
 * film. They do not read the player's chosen plan — countering a call the
 * opponent has not revealed is what scouting will buy in a later stage.
 */
function planGamePlan(state: Readonly<GameState>, programId: string, opponentId: string | null): GamePlan {
  const units = programUnitRatings(state, programId);
  const opponent: TeamUnitRatings | null = opponentId ? programUnitRatings(state, opponentId) : null;
  const roster = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP"
  );
  const best = (position: Position): number[] => roster
    .filter((player) => player.position === position)
    .map((player) => player.overall)
    .sort((left, right) => right - left);
  const backs = best("RB");
  const receivers = best("WR");

  // Attack with whichever unit is stronger, and defend whichever one the
  // opponent leans on.
  const offensiveTilt = units.passOffense - units.rushOffense;
  const opponentTilt = opponent ? opponent.passOffense - opponent.rushOffense : 0;
  const tired = roster.reduce((total, player) => total + player.fatigue, 0) / Math.max(1, roster.length);

  return {
    runPassBalance: offensiveTilt > 1.5 ? "PASS_HEAVY" : offensiveTilt < -1.5 ? "RUN_HEAVY" : "BALANCED",
    // A clear lead back is worth featuring; an even room is worth resting.
    backfieldUsage: backs.length >= 2 && backs[0]! - backs[1]! >= 4 && tired < 45 ? "FEATURE_BACK" : "COMMITTEE",
    targetDistribution: receivers.length >= 2 && receivers[0]! - receivers[1]! >= 5 ? "FEED_THE_STAR" : "SPREAD_IT",
    tempo: tired > 55 ? "CONTROL_CLOCK" : offensiveTilt > 3 ? "HURRY_UP" : "NORMAL",
    defensivePriority: opponentTilt > 1.5 ? "STOP_THE_PASS" : opponentTilt < -1.5 ? "STOP_THE_RUN" : "BALANCED",
    // Trailing programs gamble for the ball; comfortable ones protect a lead.
    defensivePosture: state.programs[programId]!.losses > state.programs[programId]!.wins ? "TAKEAWAY_HUNT" : "CONTAIN",
    pressure: opponent && units.passDefense - opponent.passOffense < -2 ? "COVERAGE_FIRST"
      : opponent && units.passDefense - opponent.passOffense > 3 ? "HEAVY_BLITZ"
        : "SITUATIONAL"
  };
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
