import type { DevelopmentFocus, GamePlan, GameState, GameCommand, Player, PortalListingState, Position, Prospect, WeekFocus } from "@college-legends/model";
import {
  focusCapacity,
  freeNilCapacity,
  MAX_VISITS_PER_SEASON,
  nilAskingPrice,
  nilState,
  pendingBoosterOffer,
  programUnitRatings,
  projectedGamePlan,
  coachSchemeFit,
  portalAskingPrice,
  scoutingBoard,
  staffBuyout,
  staffCandidatesFor,
  PORTAL_MINIMUM_POINTS,
  VISIT_COST,
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
      // A real offer is free and a prerequisite for pursuing him further —
      // extend it before spending anything on him.
      const offered = recruiting.offeredProspectIds.includes(prospect.id);
      if (!offered) {
        commands.push({ type: "OFFER_PROSPECT", programId: program.id, prospectId: prospect.id, extend: true });
      }
      // The highest-leverage single action, spent on the board's top target
      // only, and only once he is actually offered. A system only the player
      // pays for is a system the player should not pay for either.
      if (offered && prospect === discovered[0] && recruiting.visitsUsedThisSeason < MAX_VISITS_PER_SEASON && points >= VISIT_COST) {
        commands.push({ type: "SCHEDULE_VISIT", programId: program.id, prospectId: prospect.id });
        points -= VISIT_COST;
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

/**
 * What rivals do between seasons. Without this, seventy-one of seventy-two
 * programs stand still every year — nobody bids on the portal, nobody keeps
 * the player they are about to lose, nobody ever changes a coach — and the
 * one active program collects every transfer in the league unopposed. A
 * system only the player pays for is a system the player should not pay for
 * either, which is the same standard every recruiting slice was held to.
 *
 * Returns commands for the step that is actually open, so the caller can hand
 * this straight to `advanceOffseasonStep` the way it hands `planWeeklyCommands`
 * to `advanceWeek`.
 */
export function planOffseasonCommands(state: Readonly<GameState>, excludedProgramId?: string): GameCommand[] {
  if (state.phase !== "OFFSEASON" || !state.offseasonStep) return [];
  const step = state.offseasonStep;
  return Object.values(state.programs).flatMap((program) => {
    if (program.id === excludedProgramId) return [];
    if (step === "PORTAL") return planPortalBids(state, program.id);
    if (step === "COACHING") return planCoachingChange(state, program.id);
    if (step === "TRAINING_CAMP") return [planTrainingCamp(state, program.id)];
    return [];
  });
}

/**
 * A rival's portal window. Two things it must get right: keeping a man it is
 * about to lose is worth more than a stranger of the same quality, and the
 * points it bids have to fit inside the pool it actually has.
 */
function planPortalBids(state: Readonly<GameState>, programId: string): GameCommand[] {
  const openings = projectedOpenings(state, programId);
  if (openings <= 0) return [];
  const recruiting = state.recruiting[programId];
  const program = state.programs[programId];
  if (!recruiting || !program) return [];

  // Depth counted once, not once per candidate: this used to call
  // portalTargetValue from inside a sort comparator, and that function scans
  // every player in the league. At 72 programs and ~280 listings that is the
  // exact defect CLAUDE.md measures at 45% of a week's runtime, and it made
  // closing the portal window take longer than a browser would wait.
  const depthByPosition = new Map<string, number>();
  for (const other of Object.values(state.players)) {
    if (other.programId !== programId) continue;
    if (other.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    if (other.eligibility.seasonsRemaining <= 1) continue;
    depthByPosition.set(other.position, (depthByPosition.get(other.position) ?? 0) + 1);
  }
  const listings = Object.entries(state.portal ?? {})
    .map(([playerId, listing]) => ({ playerId, listing, player: state.players[playerId] }))
    .filter((entry) => Boolean(entry.player))
    .map((entry) => ({
      ...entry,
      value: portalTargetValue(programId, entry.player!, entry.listing, depthByPosition)
    }))
    .sort((left, right) => right.value - left.value || left.playerId.localeCompare(right.playerId));

  const commands: GameCommand[] = [];
  let points = recruiting.points;
  let capacity = freeNilCapacity(state, programId);
  // Chase as many as the class has room for, best first, and stop when the
  // pool runs out — the same shape as the in-season recruiting planner.
  for (const { playerId, player, listing, value } of listings.slice(0, Math.min(openings, 3))) {
    if (points < PORTAL_MINIMUM_POINTS) break;
    // Bidding on everybody is not a strategy. Only chase somebody who is
    // actually better than what walks in as a freshman.
    if (value < 60) continue;
    const bidPoints = Math.min(points, listing.previousProgramId === programId ? 30 : 20);
    const ask = portalAskingPrice(player!);
    const weeklyNil = Math.min(capacity, ask);
    commands.push({
      type: "BID_PORTAL_PLAYER",
      programId,
      playerId,
      points: bidPoints,
      weeklyNil: weeklyNil >= ask * 0.3 ? Math.round(weeklyNil / 50) * 50 : 0
    });
    points -= bidPoints;
    if (weeklyNil >= ask * 0.3) capacity -= weeklyNil;
  }
  return commands;
}

/**
 * How badly a rival wants a transfer. Reads his real `overall` rather than a
 * consensus number, and that is correct rather than a leak: a portal player
 * has played real games on television, so there is nothing hidden to scout.
 * Keeping your own man is worth more than signing a stranger of equal quality.
 */
function portalTargetValue(
  programId: string,
  player: Player,
  listing: PortalListingState,
  /** Returning scholarship players per position, counted once by the caller. */
  depthByPosition: ReadonlyMap<string, number>
): number {
  const retentionBonus = listing.previousProgramId === programId ? 10 : 0;
  const needBonus = (depthByPosition.get(player.position) ?? 0) <= 2 ? 8 : 0;
  return player.overall * 0.7 + (listing.interestByProgram[programId] ?? 0) * 0.2 + retentionBonus + needBonus;
}

/**
 * How much better a candidate has to be before a rival will pay a buyout to
 * make the change. Set by measurement, not by feel: the market re-rolls every
 * season and is generous, so at +8 a 24-program league changed 41 coaches in
 * two seasons — nearly one per program per year, which is exactly the
 * "decline caused by drift" PROGRAM_IDENTITY_AND_ECONOMY.md rules out. At +15
 * only about half a post per program is even eligible in a given year.
 */
const AI_COACHING_UPGRADE_THRESHOLD = 15;

/**
 * A rival changes a coach only when the upgrade clearly justifies the buyout
 * plus the signing fee, and never trades a coordinator who coaches the
 * program's scheme for a better-rated one who does not — a higher rating that
 * installs someone else's playbook is not an upgrade.
 *
 * At most one post a year. The budget test is deliberately weak because the
 * economy has no real drain yet (finding 3); the rating gap and the scheme-fit
 * rule are what actually hold churn down.
 */
function planCoachingChange(state: Readonly<GameState>, programId: string): GameCommand[] {
  const program = state.programs[programId];
  if (!program) return [];
  const posts = Object.values(state.staff)
    .filter((member) => member.programId === programId)
    .sort((left, right) => left.id.localeCompare(right.id));
  for (const member of posts) {
    const buyout = staffBuyout(member);
    const incumbentFit = coachSchemeFit(member, program.schemeIdentity);
    const candidate = staffCandidatesFor(state, programId, member.id)
      .filter((option) => !option.unavailableReason && option.schemeFit >= incumbentFit)
      .sort((left, right) => right.rating - left.rating)[0];
    if (!candidate) continue;
    if (candidate.rating - member.rating < AI_COACHING_UPGRADE_THRESHOLD) continue;
    if (program.budget < (candidate.signingCost + buyout) * 3) continue;
    return [{ type: "REPLACE_STAFF", programId, staffId: member.id, candidateId: candidate.id }];
  }
  return [];
}

/**
 * Camp follows the roster. A thin, banged-up squad protects itself; a program
 * with depth to spare spends the week on the playbook instead.
 */
function planTrainingCamp(state: Readonly<GameState>, programId: string): GameCommand {
  const roster = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP");
  const thin = roster.length < state.programs[programId]!.scholarshipLimit * 0.85;
  return { type: "SET_TRAINING_CAMP_FOCUS", programId, focus: thin ? "CONDITIONING" : "INSTALL" };
}
