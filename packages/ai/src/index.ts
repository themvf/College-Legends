import type { DevelopmentFocus, GamePlan, GameState, GameCommand, Position, Prospect } from "@college-legends/model";
import {
  DOSSIER_THRESHOLDS,
  MARQUEE_VALUE,
  MAXIMUM_REPS_PER_SIDE,
  programUnitRatings,
  projectedGamePlan,
  scheduledOpponent,
  scoutingBoard,
  staffCapacity,
  WORTH_SCOUTING
} from "@college-legends/simulation";

/**
 * Rivals answer the same game-plan question the player does, from what their own
 * scouting file actually says. They call `projectedGamePlan` — the same function
 * the player's scouting report reads — so a bought report describes the plan
 * that is really run rather than a parallel guess, and a rival who has not
 * scouted plans blind.
 */
function planGamePlan(state: Readonly<GameState>, programId: string, opponentId: string | null): GamePlan {
  return projectedGamePlan(state, programId, opponentId, (id) => programUnitRatings(state, id));
}

/**
 * Rivals install their plan with the week's preparation, exactly as the player
 * does. Preparation buys reps and nothing else, so this is a single call on how
 * hard to practise.
 */
function planPractice(state: Readonly<GameState>, programId: string): GameCommand[] {
  const preparation = state.preparation?.[programId];
  if (!preparation || !scheduledOpponent(state, programId)) return [];
  let points = preparation.points;
  const commands: GameCommand[] = [];
  for (const side of ["OFFENSE", "DEFENSE"] as const) {
    const current = side === "OFFENSE" ? preparation.offensiveReps : preparation.defensiveReps;
    const target = Math.min(MAXIMUM_REPS_PER_SIDE, current + Math.floor(points * 0.45));
    if (target <= current) continue;
    commands.push({ type: "SET_PRACTICE_REPS", programId, side, reps: target });
    points -= target - current;
  }
  return commands;
}

/**
 * How a rival spends its scouting department. Files are opened weeks ahead and
 * the week's output goes where it is worth most: this week's game first, since
 * an unread file is wasted, then the largest prize still on the schedule.
 *
 * Rivals therefore skip the bottom of the league and stack points on the games
 * that pay, which is the same judgement the player is being asked to make.
 */
function planScouting(state: Readonly<GameState>, programId: string): GameCommand[] {
  const preparation = state.preparation?.[programId];
  if (!preparation || preparation.scoutingPoints < 1) return [];
  const board = scoutingBoard(state, programId);
  if (board.length === 0) return [];

  let points = preparation.scoutingPoints;
  const commands: GameCommand[] = [];
  const thisWeek = board.find((dossier) => dossier.week === state.week);
  if (thisWeek) {
    // Whatever is left unspent when the whistle blows is lost, so the imminent
    // game always gets enough to open the next tier if that is reachable.
    const next = DOSSIER_THRESHOLDS.GAME_PLAN > thisWeek.points
      ? [DOSSIER_THRESHOLDS.TENDENCIES, DOSSIER_THRESHOLDS.PERSONNEL, DOSSIER_THRESHOLDS.GAME_PLAN]
        .find((threshold) => threshold > thisWeek.points) ?? 0
      : 0;
    const spend = Math.min(points, Math.max(0, next - thisWeek.points));
    if (spend > 0) {
      commands.push({ type: "ALLOCATE_SCOUTING", programId, opponentProgramId: thisWeek.opponentProgramId, points: spend });
      points -= spend;
    }
  }

  // The rest goes forward, onto the biggest prize still to come — and only if
  // it is worth more than a routine fixture.
  const ahead = board
    .filter((dossier) => dossier.week > state.week && dossier.value >= WORTH_SCOUTING)
    .sort((left, right) => right.value - left.value || left.week - right.week)[0];
  if (ahead && points > 0) {
    commands.push({ type: "ALLOCATE_SCOUTING", programId, opponentProgramId: ahead.opponentProgramId, points });
  }
  return commands;
}

/**
 * Rivals move coordinator hours toward scouting when a game worth scouting is
 * coming, and back to preparation when it is not. Without this the allocation
 * screen is a lever only the player pulls, and a big week costs a rival nothing.
 */
function planStaffAllocation(state: Readonly<GameState>, programId: string): GameCommand[] {
  const bigGameComing = scoutingBoard(state, programId)
    .some((dossier) => dossier.week <= state.week + 2 && dossier.value >= MARQUEE_VALUE);
  const commands: GameCommand[] = [];
  for (const member of Object.values(state.staff)) {
    if (member.programId !== programId) continue;
    if (member.role !== "OFFENSIVE_COORDINATOR" && member.role !== "DEFENSIVE_COORDINATOR") continue;
    const capacity = staffCapacity(member.rating);
    const scout = bigGameComing ? Math.round(capacity * 0.4) : Math.round(capacity * 0.15);
    if (member.allocation.SCOUT === scout) continue;
    commands.push({
      type: "SET_STAFF_ALLOCATION",
      programId,
      staffId: member.id,
      allocation: { PREPARE: capacity - scout, SCOUT: scout, RECRUIT: 0, DEVELOP: 0, RECOVER: 0 }
    });
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

/**
 * Rival business choices follow program character. A front-running brand backs
 * itself to fill the stadium, bluebloods and talent magnets sell winning, while
 * rebuilders and diehards protect the guaranteed floor.
 */
function planSponsorship(state: Readonly<GameState>, programId: string): GameCommand[] {
  const sponsorship = state.sponsorships?.[programId];
  if (!sponsorship || sponsorship.activeContractId) return [];
  const character = state.programs[programId]?.character;
  const strategy = character === "FRONTRUNNER"
    ? "HOME_CROWD"
    : character === "BLUEBLOOD" || character === "TALENT_MAGNET"
      ? "WINNING"
      : "GUARANTEED";
  const offer = sponsorship.offers.find((candidate) => candidate.strategy === strategy);
  return offer ? [{ type: "ACCEPT_SPONSORSHIP", programId, offerId: offer.id }] : [];
}

/** AI programs use the same limited development, media, and recruiting decisions as the human player. */
export function planWeeklyCommands(state: Readonly<GameState>, excludedProgramId?: string): GameCommand[] {
  if (state.phase !== "REGULAR_SEASON" || state.week > 14) return [];
  return Object.values(state.programs).flatMap((program) => {
    if (program.id === excludedProgramId) return [];
    const commands: GameCommand[] = [];

    commands.push(...planSponsorship(state, program.id));
    commands.push(...planStaffAllocation(state, program.id));
    commands.push(...planPractice(state, program.id));
    commands.push(...planScouting(state, program.id));

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

/**
 * What a rival thinks a prospect is worth. Reads `hype` — the public consensus —
 * and never the true `potential`, which is information nobody has bought.
 *
 * Rivals used to sort by real potential, which meant every overlooked gem was
 * taken before the player could find one and the whole point of scouting was
 * lost. Same class of leak as the AI reading opposing unit ratings for free.
 */
function prospectValue(state: Readonly<GameState>, prospect: Prospect, programId: string): number {
  const localBonus = prospect.homeDivisionId === state.programs[programId]!.divisionId ? 8 : 0;
  const needBonus = Object.values(state.players).filter((player) =>
    player.programId === programId
    && player.position === prospect.position
    && player.eligibility.rosterStatus === "SCHOLARSHIP"
    && player.eligibility.seasonsRemaining > 1
  ).length <= 2 ? 7 : 0;
  return prospect.hype * 0.65 + prospect.interestByProgram[programId]! * 0.25 + localBonus + needBonus;
}
