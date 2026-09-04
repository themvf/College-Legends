import type { BoosterKind, DecisionKnowledgeSnapshot, DevelopmentFocus, FacilityType, GameState, GameCommand, Player, Position, ProgramCharacter, Prospect, SponsorshipStrategy, TeamUnitRatings, WeekFocus } from "@college-legends/model";
import {
  FACILITY_UPGRADE_COST,
  mediaRights,
  operatingCost,
  stadiumCapacity,
  focusCapacity,
  freeNilCapacity,
  MAX_VISITS_PER_SEASON,
  nilAskingPrice,
  nilState,
  pendingBoosterOffer,
  programUnitRatings,
  recruitingSearchCost,
  ROSTER_COMPOSITION,
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
 * What a rival chases this week, from the same five priorities the player picks
 * and against the same capacity his staff buys him.
 *
 * Rivals used to move hours by hand and allocate scouting points one fixture at
 * a time, which is a control the player no longer has. Planning on priorities
 * keeps both sides of the league on one system: a rival with a thin staff also
 * only gets to chase one thing, and also has to decide whether the game in three
 * weeks is worth more than this Saturday.
 */
export type WeeklyPlanningSelectionCommand = Extract<
  GameCommand,
  { type: "SET_WEEK_FOCUS" | "SET_SCOUTING_TARGET" }
>;

/**
 * Everything the weekly focus/scouting selector is allowed to know. The adapter
 * may inspect GameState, but selection cannot: no opponent player ratings,
 * prospect potential, or another program's private recruiting interest fits in
 * this view.
 */
export interface WeeklyPlanningKnowledgeView {
  readonly kind: "WEEKLY_PLANNING_KNOWLEDGE_V1";
  programId: string;
  week: number;
  staffFocusCapacity: number;
  ownUnitRatings: TeamUnitRatings;
  currentScoutingTarget: string | null;
  scoutingOptions: readonly {
    opponentProgramId: string;
    week: number;
    value: number;
  }[];
}

/** The complete program-scoped input used to consider one offseason staff change. */
export interface CoachingPlanningKnowledgeView {
  readonly kind: "COACHING_PLANNING_KNOWLEDGE_V1";
  readonly programId: string;
  readonly availableBudget: number;
  readonly weeklyExpenses: number;
  readonly posts: readonly {
    readonly staffId: string;
    readonly incumbentRating: number;
    readonly buyout: number;
    readonly incumbentSchemeFit: number;
    readonly candidates: readonly {
      readonly candidateId: string;
      readonly rating: number;
      readonly signingCost: number;
      readonly schemeFit: number;
      readonly available: boolean;
    }[];
  }[];
}

/** The complete program-scoped input used to choose an offseason camp focus. */
export interface TrainingCampPlanningKnowledgeView {
  readonly kind: "TRAINING_CAMP_PLANNING_KNOWLEDGE_V1";
  readonly programId: string;
  readonly scholarshipRosterSize: number;
  readonly scholarshipLimit: number;
}

export type PortalPlanningSelectionCommand = Extract<GameCommand, { type: "BID_PORTAL_PLAYER" }>;

/**
 * The complete, program-scoped input used to select V1 portal bids. Target
 * values are staff projections made at the state boundary: the selector never
 * receives a player, listing, rival bid, or raw private-interest map.
 */
export interface PortalPlanningKnowledgeView {
  readonly kind: "PORTAL_PLANNING_KNOWLEDGE_V1";
  readonly programId: string;
  readonly season: number;
  readonly week: number;
  readonly phase: "OFFSEASON";
  readonly offseasonStep: "PORTAL";
  readonly projectedOpenings: number;
  readonly recruitingPoints: number;
  readonly freeWeeklyNilCapacity: number;
  readonly targets: readonly {
    readonly playerId: string;
    readonly targetValue: number;
    readonly askingPrice: number;
    readonly maximumBidPoints: number;
  }[];
}

export type PortalPlanningKnowledgeViews = Readonly<Record<string, PortalPlanningKnowledgeView>>;

export type WeeklyBusinessSelectionCommand = Extract<
  GameCommand,
  { type: "CHOOSE_BOOSTER" | "ACCEPT_SPONSORSHIP" | "UPGRADE_FACILITY" }
>;

/** Exact program and boundary facts used by the three existing V1 business policies. */
export interface WeeklyBusinessPlanningKnowledgeView {
  readonly kind: "WEEKLY_BUSINESS_PLANNING_KNOWLEDGE_V1";
  readonly programId: string;
  readonly season: number;
  readonly week: number;
  readonly phase: "REGULAR_SEASON";
  readonly budget: number;
  readonly weeklyExpenses: number;
  readonly character: ProgramCharacter;
  readonly playingThisWeek: boolean;
  readonly atHome: boolean;
  readonly boosterOptions: readonly {
    readonly id: string;
    readonly kind: BoosterKind;
    readonly chance: number;
  }[];
  readonly sponsorshipActive: boolean;
  readonly sponsorshipOffers: readonly {
    readonly id: string;
    readonly strategy: SponsorshipStrategy;
  }[];
  readonly facilities: readonly {
    readonly facility: FacilityType;
    readonly level: number;
  }[];
}

export type WeeklyBusinessPlanningKnowledgeViews = Readonly<Record<string, WeeklyBusinessPlanningKnowledgeView>>;

/** Build the redacted view at the state boundary; never pass state to selection. */
export function weeklyPlanningKnowledgeView(
  state: Readonly<GameState>,
  programId: string
): WeeklyPlanningKnowledgeView {
  const ownUnitRatings = Object.freeze({ ...programUnitRatings(state, programId) });
  const scoutingOptions = Object.freeze(scoutingBoard(state, programId).map((dossier) => Object.freeze({
    opponentProgramId: dossier.opponentProgramId,
    week: dossier.week,
    value: dossier.value
  })));
  return Object.freeze({
    kind: "WEEKLY_PLANNING_KNOWLEDGE_V1" as const,
    programId,
    week: state.week,
    staffFocusCapacity: focusCapacity(state, programId).capacity,
    ownUnitRatings,
    currentScoutingTarget: state.scoutingTarget?.[programId] ?? null,
    scoutingOptions
  });
}

/** The exact redacted selector input persisted with an attributed AI choice. */
export function weeklyPlanningKnowledgeSnapshot(
  state: Readonly<GameState>,
  programId: string
): DecisionKnowledgeSnapshot {
  const view = weeklyPlanningKnowledgeView(state, programId);
  return Object.freeze({
    programId,
    season: state.season,
    week: state.week,
    phase: state.phase,
    facts: Object.freeze([Object.freeze({
      key: "weeklyPlanning.view.v1",
      value: JSON.stringify(view),
      source: "STAFF_ESTIMATE" as const,
      entityId: programId,
      observedSeason: state.season,
      observedWeek: state.week
    })])
  });
}

/**
 * Build the redacted coaching view at the state boundary. Candidate generation
 * remains an engine projection; selection cannot inspect the league state,
 * players, prospects, rival finances, or any undisclosed candidate fields.
 */
export function coachingPlanningKnowledgeView(
  state: Readonly<GameState>,
  programId: string
): CoachingPlanningKnowledgeView {
  const program = state.programs[programId];
  if (!program) throw new Error("A coaching knowledge view needs an existing program.");
  const posts = Object.freeze(Object.values(state.staff)
    .filter((member) => member.programId === programId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((member) => Object.freeze({
      staffId: member.id,
      incumbentRating: member.rating,
      buyout: staffBuyout(member),
      incumbentSchemeFit: coachSchemeFit(member, program.schemeIdentity),
      candidates: Object.freeze(staffCandidatesFor(state, programId, member.id).map((candidate) => Object.freeze({
        candidateId: candidate.id,
        rating: candidate.rating,
        signingCost: candidate.signingCost,
        schemeFit: candidate.schemeFit,
        available: !candidate.unavailableReason
      })))
    })));
  return Object.freeze({
    kind: "COACHING_PLANNING_KNOWLEDGE_V1" as const,
    programId,
    availableBudget: program.budget,
    weeklyExpenses: operatingCost(program, stadiumCapacity(program.facilities.STADIUM), mediaRights(program).total).total,
    posts
  });
}

/** The exact redacted coaching selector input persisted with an attributed AI choice. */
export function coachingPlanningKnowledgeSnapshot(
  state: Readonly<GameState>,
  programId: string
): DecisionKnowledgeSnapshot {
  const view = coachingPlanningKnowledgeView(state, programId);
  return Object.freeze({
    programId,
    season: state.season,
    week: state.week,
    phase: state.phase,
    facts: Object.freeze([Object.freeze({
      key: "coachingPlanning.view.v1",
      value: JSON.stringify(view),
      source: "STAFF_ESTIMATE" as const,
      entityId: programId,
      observedSeason: state.season,
      observedWeek: state.week
    })])
  });
}

/** Build the redacted camp view at the state boundary; selection never receives GameState. */
export function trainingCampPlanningKnowledgeView(
  state: Readonly<GameState>,
  programId: string
): TrainingCampPlanningKnowledgeView {
  const program = state.programs[programId];
  if (!program) throw new Error("A training-camp knowledge view needs an existing program.");
  const scholarshipRosterSize = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
  return Object.freeze({
    kind: "TRAINING_CAMP_PLANNING_KNOWLEDGE_V1" as const,
    programId,
    scholarshipRosterSize,
    scholarshipLimit: program.scholarshipLimit
  });
}

/** The exact redacted camp selector input persisted with an attributed AI choice. */
export function trainingCampPlanningKnowledgeSnapshot(
  state: Readonly<GameState>,
  programId: string
): DecisionKnowledgeSnapshot {
  const view = trainingCampPlanningKnowledgeView(state, programId);
  return Object.freeze({
    programId,
    season: state.season,
    week: state.week,
    phase: state.phase,
    facts: Object.freeze([Object.freeze({
      key: "trainingCampPlanning.view.v1",
      value: JSON.stringify(view),
      source: "PROGRAM_INTERNAL" as const,
      entityId: programId,
      observedSeason: state.season,
      observedWeek: state.week
    })])
  });
}

/** Build all weekly business views with one schedule pass and no league-state selector access. */
export function weeklyBusinessPlanningKnowledgeViews(
  state: Readonly<GameState>
): WeeklyBusinessPlanningKnowledgeViews {
  if (state.phase !== "REGULAR_SEASON" || state.week > 14) {
    throw new Error("Weekly business planning requires an active regular-season boundary.");
  }
  const playing = new Set<string>();
  const home = new Set<string>();
  for (const game of state.schedule) {
    if (game.week !== state.week || game.played) continue;
    playing.add(game.homeProgramId);
    playing.add(game.awayProgramId);
    home.add(game.homeProgramId);
  }
  return Object.freeze(Object.fromEntries(Object.values(state.programs).map((program) => {
    const booster = pendingBoosterOffer(state, program.id);
    const sponsorship = state.sponsorships?.[program.id];
    const view = Object.freeze({
      kind: "WEEKLY_BUSINESS_PLANNING_KNOWLEDGE_V1" as const,
      programId: program.id,
      season: state.season,
      week: state.week,
      phase: "REGULAR_SEASON" as const,
      budget: program.budget,
      weeklyExpenses: operatingCost(program, stadiumCapacity(program.facilities.STADIUM), mediaRights(program).total).total,
      character: program.character,
      playingThisWeek: playing.has(program.id),
      atHome: home.has(program.id),
      boosterOptions: Object.freeze((booster?.options ?? []).map((option) => Object.freeze({
        id: option.id,
        kind: option.kind,
        chance: option.chance
      }))),
      sponsorshipActive: Boolean(sponsorship?.activeContractId),
      sponsorshipOffers: Object.freeze((sponsorship?.offers ?? []).map((offer) => Object.freeze({
        id: offer.id,
        strategy: offer.strategy
      }))),
      facilities: Object.freeze((Object.entries(program.facilities) as [FacilityType, number][])
        .map(([facility, level]) => Object.freeze({ facility, level })))
    });
    return [program.id, view];
  })));
}

function validateWeeklyBusinessPlanningKnowledgeView(
  state: Readonly<GameState>,
  programId: string,
  view: Readonly<WeeklyBusinessPlanningKnowledgeView>
): void {
  if (view.programId !== programId) throw new Error("Weekly business knowledge must belong to the command program.");
  if (state.phase !== "REGULAR_SEASON"
    || state.week > 14
    || view.season !== state.season
    || view.week !== state.week
    || view.phase !== state.phase) {
    throw new Error("Weekly business knowledge is stale for the current simulation boundary.");
  }
}

export function weeklyBusinessPlanningKnowledgeView(
  state: Readonly<GameState>,
  programId: string,
  cachedViews: WeeklyBusinessPlanningKnowledgeViews = weeklyBusinessPlanningKnowledgeViews(state)
): WeeklyBusinessPlanningKnowledgeView {
  const view = cachedViews[programId];
  if (!view) throw new Error("A weekly business knowledge view needs an existing program.");
  validateWeeklyBusinessPlanningKnowledgeView(state, programId, view);
  return view;
}

export function weeklyBusinessPlanningKnowledgeSnapshot(
  state: Readonly<GameState>,
  programId: string,
  view: WeeklyBusinessPlanningKnowledgeView = weeklyBusinessPlanningKnowledgeView(state, programId)
): DecisionKnowledgeSnapshot {
  validateWeeklyBusinessPlanningKnowledgeView(state, programId, view);
  return Object.freeze({
    programId,
    season: state.season,
    week: state.week,
    phase: state.phase,
    facts: Object.freeze([Object.freeze({
      key: "weeklyBusinessPlanning.view.v1",
      value: JSON.stringify(view),
      source: "PROGRAM_INTERNAL" as const,
      entityId: programId,
      observedSeason: state.season,
      observedWeek: state.week
    })])
  });
}

/** Build every program's portal view in one league pass. */
export function portalPlanningKnowledgeViews(
  state: Readonly<GameState>
): PortalPlanningKnowledgeViews {
  if (state.phase !== "OFFSEASON" || state.offseasonStep !== "PORTAL") {
    throw new Error("Portal planning knowledge requires the open portal boundary.");
  }
  const programIds = Object.keys(state.programs);
  const rosterSizes = new Map<string, number>();
  const departures = new Map<string, number>();
  const commitments = new Map<string, number>();
  const returningDepth = new Map<string, Map<Position, number>>();
  for (const programId of programIds) {
    rosterSizes.set(programId, 0);
    departures.set(programId, 0);
    returningDepth.set(programId, new Map());
  }
  for (const player of Object.values(state.players)) {
    if (!player.programId || player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    rosterSizes.set(player.programId, (rosterSizes.get(player.programId) ?? 0) + 1);
    if (player.eligibility.seasonsRemaining <= 1) {
      departures.set(player.programId, (departures.get(player.programId) ?? 0) + 1);
      continue;
    }
    const depth = returningDepth.get(player.programId);
    if (depth) depth.set(player.position, (depth.get(player.position) ?? 0) + 1);
  }
  for (const prospect of Object.values(state.prospects)) {
    if (prospect.status === "COMMITTED" && prospect.signedProgramId) {
      commitments.set(prospect.signedProgramId, (commitments.get(prospect.signedProgramId) ?? 0) + 1);
    }
  }

  const listings = Object.entries(state.portal ?? {})
    .flatMap(([playerId, listing]) => {
      const player = state.players[playerId];
      return player ? [{ playerId, player, listing }] : [];
    })
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
  const views = Object.fromEntries(programIds.map((programId) => {
    const program = state.programs[programId]!;
    const depth = returningDepth.get(programId)!;
    const targets = Object.freeze(listings.map(({ playerId, player, listing }) => Object.freeze({
      playerId,
      targetValue: player.overall * 0.7
        + (listing.interestByProgram[programId] ?? 0) * 0.2
        + (listing.previousProgramId === programId ? 10 : 0)
        + ((depth.get(player.position) ?? 0) <= 2 ? 8 : 0),
      askingPrice: portalAskingPrice(player),
      maximumBidPoints: listing.previousProgramId === programId ? 30 : 20
    })));
    return [programId, Object.freeze({
      kind: "PORTAL_PLANNING_KNOWLEDGE_V1" as const,
      programId,
      season: state.season,
      week: state.week,
      phase: "OFFSEASON" as const,
      offseasonStep: "PORTAL" as const,
      projectedOpenings: Math.max(0,
        program.scholarshipLimit
          - (rosterSizes.get(programId) ?? 0)
          + (departures.get(programId) ?? 0)
          - (commitments.get(programId) ?? 0)),
      recruitingPoints: state.recruiting[programId]?.points ?? 0,
      freeWeeklyNilCapacity: freeNilCapacity(state, programId),
      targets
    })];
  }));
  return Object.freeze(views);
}

export function portalPlanningKnowledgeView(
  state: Readonly<GameState>,
  programId: string,
  cachedViews: PortalPlanningKnowledgeViews = portalPlanningKnowledgeViews(state)
): PortalPlanningKnowledgeView {
  const view = cachedViews[programId];
  if (!view) throw new Error("A portal knowledge view needs an existing program.");
  validatePortalPlanningKnowledgeView(state, programId, view);
  return view;
}

function validatePortalPlanningKnowledgeView(
  state: Readonly<GameState>,
  programId: string,
  view: Readonly<PortalPlanningKnowledgeView>
): void {
  if (view.programId !== programId) throw new Error("Portal knowledge must belong to the command program.");
  if (state.phase !== "OFFSEASON"
    || state.offseasonStep !== "PORTAL"
    || view.season !== state.season
    || view.week !== state.week
    || view.phase !== state.phase
    || view.offseasonStep !== state.offseasonStep) {
    throw new Error("Portal knowledge is stale for the current offseason boundary.");
  }
}

/** The exact redacted portal selector input persisted with an attributed AI bid. */
export function portalPlanningKnowledgeSnapshot(
  state: Readonly<GameState>,
  programId: string,
  view: PortalPlanningKnowledgeView = portalPlanningKnowledgeView(state, programId)
): DecisionKnowledgeSnapshot {
  validatePortalPlanningKnowledgeView(state, programId, view);
  return Object.freeze({
    programId,
    season: state.season,
    week: state.week,
    phase: state.phase,
    facts: Object.freeze([Object.freeze({
      key: "portalPlanning.view.v1",
      value: JSON.stringify(view),
      source: "STAFF_ESTIMATE" as const,
      entityId: programId,
      observedSeason: state.season,
      observedWeek: state.week
    })])
  });
}

/** Pure selection from explicit public, scouted, and program-internal facts. */
export function selectWeeklyFocusAndScouting(
  view: Readonly<WeeklyPlanningKnowledgeView>
): WeeklyPlanningSelectionCommand[] {
  const capacity = view.staffFocusCapacity;
  const board = view.scoutingOptions;
  const prize = board
    .filter((dossier) => dossier.week <= view.week + 3 && dossier.value >= WORTH_SCOUTING)
    .sort((left, right) => right.value - left.value || left.week - right.week)[0];
  const units = view.ownUnitRatings;
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
    { focus: "RECRUIT", weight: 22 + view.week * 5.5 },
    { focus: "DEVELOP", weight: 62 - view.week * 3.2 }
  ];
  const focuses = ranked
    .sort((left, right) => right.weight - left.weight)
    .slice(0, capacity)
    .map((entry) => entry.focus);

  const commands: WeeklyPlanningSelectionCommand[] = [
    { type: "SET_WEEK_FOCUS", programId: view.programId, focuses }
  ];
  const target = prize ?? board.find((dossier) => dossier.week === view.week) ?? board[0];
  if (target && view.currentScoutingTarget !== target.opponentProgramId) {
    commands.push({ type: "SET_SCOUTING_TARGET", programId: view.programId, opponentProgramId: target.opponentProgramId });
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
export function selectBoosterChoice(
  view: Readonly<WeeklyBusinessPlanningKnowledgeView>
): Extract<WeeklyBusinessSelectionCommand, { type: "CHOOSE_BOOSTER" }>[] {
  const worth = (option: WeeklyBusinessPlanningKnowledgeView["boosterOptions"][number]): number => {
    const odds = option.chance / 100;
    if (option.kind === "DONOR") {
      // A cheque matters most to a program that is short of money.
      return odds * (60 + Math.max(0, 40 - view.budget / 500_000));
    }
    if (option.kind === "POSITION_LEGEND") return odds * 70;
    if (option.kind === "LOCAL_BUSINESS") return view.atHome ? odds * 55 : 0;
    return view.playingThisWeek ? odds * 62 : 0;
  };

  const best = [...view.boosterOptions]
    .sort((left, right) => worth(right) - worth(left) || left.id.localeCompare(right.id))[0];
  return best ? [{ type: "CHOOSE_BOOSTER", programId: view.programId, optionId: best.id }] : [];
}

/**
 * Rival business choices follow program character. A front-running brand backs
 * itself to fill the stadium, bluebloods and talent magnets sell winning, while
 * rebuilders and diehards protect the guaranteed floor.
 */
export function selectSponsorship(
  view: Readonly<WeeklyBusinessPlanningKnowledgeView>
): Extract<WeeklyBusinessSelectionCommand, { type: "ACCEPT_SPONSORSHIP" }>[] {
  if (view.sponsorshipActive) return [];
  const strategy = view.character === "FRONTRUNNER"
    ? "HOME_CROWD"
    : view.character === "BLUEBLOOD" || view.character === "TALENT_MAGNET"
      ? "WINNING"
      : "GUARANTEED";
  const offer = view.sponsorshipOffers.find((candidate) => candidate.strategy === strategy);
  return offer ? [{ type: "ACCEPT_SPONSORSHIP", programId: view.programId, offerId: offer.id }] : [];
}

/** Select the same cheapest weak facility as the legacy weekly planner. */
export function selectFacilityUpgrade(
  view: Readonly<WeeklyBusinessPlanningKnowledgeView>
): Extract<WeeklyBusinessSelectionCommand, { type: "UPGRADE_FACILITY" }>[] {
  if (view.week !== 1) return [];
  const facility = [...view.facilities]
    .filter(({ level }) => level < 5)
    .sort((left, right) => left.level - right.level || left.facility.localeCompare(right.facility))[0];
  if (!facility) return [];
  const cost = FACILITY_UPGRADE_COST[facility.level];
  return cost !== undefined && view.budget >= cost + view.weeklyExpenses * 2
    ? [{ type: "UPGRADE_FACILITY", programId: view.programId, facility: facility.facility }]
    : [];
}

/** AI programs use the same limited development, media, and recruiting decisions as the human player. */
export function planWeeklyCommands(
  state: Readonly<GameState>,
  excludedProgramId?: string,
  cachedBusinessViews?: WeeklyBusinessPlanningKnowledgeViews
): GameCommand[] {
  if (state.phase !== "REGULAR_SEASON" || state.week > 14) return [];
  const businessViews = cachedBusinessViews ?? weeklyBusinessPlanningKnowledgeViews(state);
  // These indexes turn the weekly planner from dozens of full-league scans per
  // program into one pass. At 72 teams this is the difference between seconds
  // and minutes over a dynasty season.
  const positions = Object.keys(ROSTER_COMPOSITION) as Position[];
  const rostersByProgram = new Map<string, Player[]>();
  const returningByProgram = new Map<string, Record<Position, number>>();
  const commitmentsByProgram = new Map<string, number>();
  for (const programId of Object.keys(state.programs)) {
    rostersByProgram.set(programId, []);
    returningByProgram.set(programId, Object.fromEntries(positions.map((position) => [position, 0])) as Record<Position, number>);
  }
  for (const player of Object.values(state.players)) {
    if (!player.programId || player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    rostersByProgram.get(player.programId)?.push(player);
    if (player.eligibility.seasonsRemaining > 1) {
      const rooms = returningByProgram.get(player.programId);
      if (rooms) rooms[player.position] += 1;
    }
  }
  for (const prospect of Object.values(state.prospects)) {
    if (prospect.status === "COMMITTED" && prospect.signedProgramId) {
      commitmentsByProgram.set(prospect.signedProgramId, (commitmentsByProgram.get(prospect.signedProgramId) ?? 0) + 1);
    }
  }
  return Object.values(state.programs).flatMap((program) => {
    if (program.id === excludedProgramId) return [];
    const commands: GameCommand[] = [];
    const businessView = weeklyBusinessPlanningKnowledgeView(state, program.id, businessViews);

    commands.push(...selectWeeklyFocusAndScouting(weeklyPlanningKnowledgeView(state, program.id)));
    commands.push(...selectBoosterChoice(businessView));
    commands.push(...selectSponsorship(businessView));

    // The scheme is the game plan. The retired weekly command is intentionally
    // never emitted; doing so only produced a rejection for every rival.
    commands.push(...selectFacilityUpgrade(businessView));

    const roster = rostersByProgram.get(program.id) ?? [];
    const returningRooms = returningByProgram.get(program.id)!;
    const position = weakestPosition(roster, returningRooms);
    const developmentFocus: Exclude<DevelopmentFocus, "BALANCED"> = state.week % 3 === 1 ? "TECHNIQUE" : state.week % 3 === 2 ? "STRENGTH" : "CONDITIONING";
    commands.push({ type: "SET_DEVELOPMENT_SPOTLIGHT", programId: program.id, target: { type: "POSITION", position }, focus: developmentFocus });

    const featuredPlayer = roster
      .filter((player) => player.eligibility.redshirtStatus !== "REDSHIRTING")
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

    const openings = projectedOpenings(state, program.id, roster, commitmentsByProgram.get(program.id) ?? 0);
    if (openings <= 0) return commands;
    const recruiting = state.recruiting[program.id];
    if (!recruiting || recruiting.points <= 0) return commands;
    let points = recruiting.points;
    const discovered = recruiting.discoveredProspectIds
      .map((prospectId) => state.prospects[prospectId])
      .filter((prospect): prospect is Prospect => Boolean(prospect && prospect.status === "AVAILABLE"))
      .sort((left, right) => prospectValue(state, right, program.id, returningRooms) - prospectValue(state, left, program.id, returningRooms) || left.id.localeCompare(right.id));

    const discoveredAtNeed = discovered.filter((prospect) => prospect.position === position).length;
    if (discovered.length < 5 || discoveredAtNeed < 2) {
      const searchType = discoveredAtNeed < 2 ? "POSITION" : program.tier === "POWER" ? "NATIONAL_SHOWCASE" : program.tier === "LOW" ? "SLEEPERS" : "LOCAL_REGION";
      const cost = recruitingSearchCost(searchType);
      if (points >= cost) {
        commands.push({ type: "SEARCH_PROSPECTS", programId: program.id, searchType, ...(searchType === "POSITION" ? { position } : {}) });
        points -= cost;
      }
    }

    // NIL: rivals bid from the same donor ceiling the player has, priced off
    // hype (the ask *is* hype — nobody reads the truth), spread across the
    // openings they still have to fill. Offers only ever rise, so a rival never
    // eats the withdrawal penalty. A system only the player pays for is a
    // system the player should not pay for either.
    let uncommittedCapacity = freeNilCapacity(state, program.id);
    const nilOpenings = Math.max(1, openings);
    const nilOffers = nilState(state, program.id).offersByProspect;
    for (const prospect of discovered.slice(0, 2)) {
      const scouting = recruiting.scoutingByProspect[prospect.id]!;
      if (scouting.evaluations.length === 0) continue;
      const ask = nilAskingPrice(prospect, program);
      const desired = Math.min(Math.round(uncommittedCapacity / nilOpenings / 50) * 50, ask);
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

function weakestPosition(roster: readonly Player[], returningRooms?: Readonly<Record<Position, number>>): Position {
  const positions: Position[] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
  return positions.map((position) => {
    const players = roster.filter((player) => player.position === position);
    const returning = returningRooms?.[position] ?? players.filter((player) => player.eligibility.seasonsRemaining > 1).length;
    return {
      position,
      coverage: returning / ROSTER_COMPOSITION[position],
      average: players.reduce((sum, player) => sum + player.overall, 0) / Math.max(1, players.length)
    };
  }).sort((left, right) => left.coverage - right.coverage || left.average - right.average || left.position.localeCompare(right.position))[0]!.position;
}

function projectedOpenings(state: Readonly<GameState>, programId: string, indexedRoster?: readonly Player[], indexedCommitments?: number): number {
  const program = state.programs[programId]!;
  const roster = indexedRoster ?? Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP"
  );
  const departures = roster.filter((player) => player.eligibility.seasonsRemaining <= 1).length;
  const commitments = indexedCommitments ?? Object.values(state.prospects).filter((prospect) =>
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
function prospectValue(state: Readonly<GameState>, prospect: Prospect, programId: string, returningRooms?: Readonly<Record<Position, number>>): number {
  const localBonus = prospect.homeDivisionId === state.programs[programId]!.divisionId ? 8 : 0;
  const returning = returningRooms?.[prospect.position] ?? Object.values(state.players).filter((player) =>
    player.programId === programId
    && player.position === prospect.position
    && player.eligibility.rosterStatus === "SCHOLARSHIP"
    && player.eligibility.seasonsRemaining > 1
  ).length;
  const needBonus = Math.max(0, 1 - returning / ROSTER_COMPOSITION[prospect.position]) * 40;
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
export function planOffseasonCommands(
  state: Readonly<GameState>,
  excludedProgramId?: string,
  cachedPortalViews?: PortalPlanningKnowledgeViews
): GameCommand[] {
  if (state.phase !== "OFFSEASON" || !state.offseasonStep) return [];
  const step = state.offseasonStep;
  const portalViews = step === "PORTAL" ? cachedPortalViews ?? portalPlanningKnowledgeViews(state) : undefined;
  return Object.values(state.programs).flatMap((program) => {
    if (program.id === excludedProgramId) return [];
    if (step === "PORTAL") {
      const view = portalViews![program.id]!;
      validatePortalPlanningKnowledgeView(state, program.id, view);
      return selectPortalBids(view);
    }
    if (step === "COACHING") return selectCoachingChange(coachingPlanningKnowledgeView(state, program.id));
    if (step === "TRAINING_CAMP") return [selectTrainingCampFocus(trainingCampPlanningKnowledgeView(state, program.id))];
    return [];
  });
}

/**
 * A rival's portal window. Two things it must get right: keeping a man it is
 * about to lose is worth more than a stranger of the same quality, and the
 * points it bids have to fit inside the pool it actually has.
 */
export function selectPortalBids(view: Readonly<PortalPlanningKnowledgeView>): PortalPlanningSelectionCommand[] {
  const openings = view.projectedOpenings;
  if (openings <= 0) return [];
  const listings = [...view.targets]
    .sort((left, right) => right.targetValue - left.targetValue || left.playerId.localeCompare(right.playerId));

  const commands: PortalPlanningSelectionCommand[] = [];
  let points = view.recruitingPoints;
  let capacity = view.freeWeeklyNilCapacity;
  // Chase as many as the class has room for, best first, and stop when the
  // pool runs out — the same shape as the in-season recruiting planner.
  for (const { playerId, targetValue, askingPrice, maximumBidPoints } of listings.slice(0, Math.min(openings, 3))) {
    if (points < PORTAL_MINIMUM_POINTS) break;
    // Bidding on everybody is not a strategy. Only chase somebody who is
    // actually better than what walks in as a freshman.
    if (targetValue < 60) continue;
    const bidPoints = Math.min(points, maximumBidPoints);
    const weeklyNil = Math.min(capacity, askingPrice);
    commands.push({
      type: "BID_PORTAL_PLAYER",
      programId: view.programId,
      playerId,
      points: bidPoints,
      weeklyNil: weeklyNil >= askingPrice * 0.3 ? Math.round(weeklyNil / 50) * 50 : 0
    });
    points -= bidPoints;
    if (weeklyNil >= askingPrice * 0.3) capacity -= weeklyNil;
  }
  return commands;
}

/**
 * How much better a candidate has to be before a rival will pay a buyout to
 * make the change. Set by measurement, not by feel: the market re-rolls every
 * season and is generous, so at +8 a 24-program league changed 41 coaches in
 * two seasons — nearly one per program per year, which is exactly the
 * "decline caused by drift" PROGRAM_IDENTITY_AND_ECONOMY.md rules out. At +15
 * only about half a post per program is even eligible in a given year.
 */
const AI_COACHING_UPGRADE_THRESHOLD = 12;

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
export function selectCoachingChange(view: Readonly<CoachingPlanningKnowledgeView>): GameCommand[] {
  for (const post of view.posts) {
    const candidate = [...post.candidates]
      .filter((option) => option.available && option.schemeFit >= post.incumbentSchemeFit)
      .sort((left, right) => right.rating - left.rating)[0];
    if (!candidate) continue;
    if (candidate.rating - post.incumbentRating < AI_COACHING_UPGRADE_THRESHOLD) continue;
    if (view.availableBudget < candidate.signingCost + post.buyout + view.weeklyExpenses * 2) continue;
    return [{ type: "REPLACE_STAFF", programId: view.programId, staffId: post.staffId, candidateId: candidate.candidateId }];
  }
  return [];
}

/**
 * Camp follows roster capacity. A thin squad protects itself; a program with
 * depth to spare spends the week on the playbook instead.
 */
export function selectTrainingCampFocus(view: Readonly<TrainingCampPlanningKnowledgeView>): GameCommand {
  const thin = view.scholarshipRosterSize < view.scholarshipLimit * 0.85;
  return { type: "SET_TRAINING_CAMP_FOCUS", programId: view.programId, focus: thin ? "CONDITIONING" : "INSTALL" };
}
