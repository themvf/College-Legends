import type { DevelopmentFocus, GamePlan, GameState, GameCommand, Position, Prospect, WeekFocus } from "@college-legends/model";
import {
  focusCapacity,
  freeNilCapacity,
  nilAskingPrice,
  nilState,
  pendingBoosterOffer,
  programUnitRatings,
  projectedGamePlan,
  scoutingBoard,
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
 * What a rival chases this week, from the same five priorities the player picks
 * and against the same capacity his staff buys him.
 *
 * Rivals used to move hours by hand and allocate scouting points one fixture at
 * a time, which is a control the player no longer has. Planning on priorities
 * keeps both sides of the league on one system: a rival with a thin staff also
 * only gets to chase one thing, and also has to decide whether the game in three
 * weeks is worth more than this Saturday.
 */
function planFocus(state: Readonly<GameState>, programId: string): GameCommand[] {
  const capacity = focusCapacity(state, programId).capacity;
  const board = scoutingBoard(state, programId);
  const prize = board
    .filter((dossier) => dossier.week <= state.week + 3 && dossier.value >= WORTH_SCOUTING)
    .sort((left, right) => right.value - left.value || left.week - right.week)[0];
  const units = programUnitRatings(state, programId);
  const offenseFirst = units.passOffense + units.rushOffense >= units.passDefense + units.rushDefense;

  // Weighted so the season has a shape rather than a fixed ordering. Drilling the
  // stronger side is the default, a prize fixture outranks drilling the second
  // side, work with the roster pays early, and the trail takes over late as the
  // class closes. Flat weights left rivals installing both sides every week from
  // September to December and never once competing on the systems the game is
  // actually about.
  const ranked: { focus: WeekFocus; weight: number }[] = [
    { focus: offenseFirst ? "INSTALL_OFFENSE" : "INSTALL_DEFENSE", weight: 85 },
    { focus: "SCOUT", weight: prize ? 35 + prize.value * 0.75 : 18 },
    { focus: offenseFirst ? "INSTALL_DEFENSE" : "INSTALL_OFFENSE", weight: 52 },
    { focus: "RECRUIT", weight: 22 + state.week * 5.5 },
    { focus: "DEVELOP", weight: 62 - state.week * 3.2 }
  ];
  const focuses = ranked
    .sort((left, right) => right.weight - left.weight)
    .slice(0, capacity)
    .map((entry) => entry.focus);

  const commands: GameCommand[] = [
    { type: "SET_WEEK_FOCUS", programId, focuses }
  ];
  const target = prize ?? board.find((dossier) => dossier.week === state.week) ?? board[0];
  if (target && state.scoutingTarget?.[programId] !== target.opponentProgramId) {
    commands.push({ type: "SET_SCOUTING_TARGET", programId, opponentProgramId: target.opponentProgramId });
  }
  return commands;
}

/**
 * Rivals answer the same knock at the door. Without this the four offers are a
 * standing buff only the human collects, and the league drifts apart by roughly
 * a donation and a legend every three weeks.
 *
 * They take expected value — chance times what it is worth to *this* program —
 * so a program with nothing in the bank chases the cheque and a good one with a
 * game to win takes the defensive week.
 */
function planBooster(state: Readonly<GameState>, programId: string): GameCommand[] {
  const offer = pendingBoosterOffer(state, programId);
  if (!offer) return [];
  const program = state.programs[programId];
  if (!program) return [];
  const playingThisWeek = state.schedule.some((game) =>
    game.week === state.week && !game.played
    && (game.homeProgramId === programId || game.awayProgramId === programId));
  const atHome = state.schedule.some((game) =>
    game.week === state.week && !game.played && game.homeProgramId === programId);

  const worth = (option: (typeof offer.options)[number]): number => {
    const odds = option.chance / 100;
    if (option.kind === "DONOR") {
      // A cheque matters most to a program that is short of money.
      return odds * (60 + Math.max(0, 40 - program.budget / 500_000));
    }
    if (option.kind === "POSITION_LEGEND") return odds * 70;
    if (option.kind === "LOCAL_BUSINESS") return atHome ? odds * 55 : 0;
    return playingThisWeek ? odds * 62 : 0;
  };

  const best = [...offer.options]
    .sort((left, right) => worth(right) - worth(left) || left.id.localeCompare(right.id))[0];
  return best ? [{ type: "CHOOSE_BOOSTER", programId, optionId: best.id }] : [];
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

    commands.push(...planFocus(state, program.id));
    commands.push(...planBooster(state, program.id));
    commands.push(...planSponsorship(state, program.id));

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

    // NIL: rivals bid from the same donor ceiling the player has, priced off
    // hype (the ask *is* hype — nobody reads the truth), spread across the
    // openings they still have to fill. Offers only ever rise, so a rival never
    // eats the withdrawal penalty. A system only the player pays for is a
    // system the player should not pay for either.
    let uncommittedCapacity = freeNilCapacity(state, program.id);
    const openings = Math.max(1, projectedOpenings(state, program.id));
    const nilOffers = nilState(state, program.id).offersByProspect;
    for (const prospect of discovered.slice(0, 2)) {
      const scouting = recruiting.scoutingByProspect[prospect.id]!;
      if (scouting.evaluations.length === 0) continue;
      const ask = nilAskingPrice(prospect, program);
      const desired = Math.min(Math.round(uncommittedCapacity / openings / 50) * 50, ask);
      const current = nilOffers[prospect.id] ?? 0;
      if (desired >= ask * 0.3 && desired > current) {
        commands.push({ type: "SET_NIL_OFFER", programId: program.id, prospectId: prospect.id, weeklyAmount: desired });
        uncommittedCapacity -= desired - current;
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
