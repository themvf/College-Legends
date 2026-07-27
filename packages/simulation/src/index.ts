import type { AwardCandidate, DepthChart, GamePlan, MatchupOutcome, TeamUnit, TeamUnitRatings, DevelopmentFocus, DivisionId, FacilityType, GameCommand, GameEvent, GameState, Player, PlayerGameStatLine, PlayerMediaAction, PlayerRating, PlayerRatings, PlayoffSeed, Position, PostseasonGame, PostseasonRound, Program, Prospect, ProspectScoutingState, RecruitPriority, RecruitingEvaluation, RecruitingProgramState, RecruitingSearchType, SeasonAward, SeasonAwardType, SeasonHistory, SimulationResult, StaffAssignment, StaffMember, StaffRole } from "@college-legends/model";
import { FICTIONAL_PROGRAMS, fictionalPersonName } from "@college-legends/content";
import { AddressableRng } from "./rng.js";
import { DEFAULT_GAME_PLAN, overallStrength, projectUnitEdges, resolveGame, unitRatingsFromLineup, type GameResult, type TeamSide, type UnitEdge } from "./game.js";

export { DEFAULT_GAME_PLAN, GAME_PLAN_OPTIONS, plannedUnitRatings, projectUnitEdges, unitLabel, unitRatingsFromLineup } from "./game.js";
export type { GamePlanOption, UnitEdge } from "./game.js";

export { AddressableRng } from "./rng.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const clone = <T>(value: T): T => structuredClone(value);

export const ROSTER_COMPOSITION: Readonly<Record<Position, number>> = {
  QB: 4,
  RB: 7,
  WR: 12,
  TE: 6,
  OL: 17,
  DL: 14,
  LB: 10,
  DB: 11,
  K: 2,
  P: 2
};

export const STARTING_ROSTER_SIZE = Object.values(ROSTER_COMPOSITION).reduce((total, count) => total + count, 0);
export const FACILITY_UPGRADE_COST: Readonly<Record<number, number>> = {
  1: 350_000,
  2: 750_000,
  3: 1_500_000,
  4: 3_000_000
};

const STAFF_ROLES: readonly StaffRole[] = ["HEAD_COACH", "OFFENSIVE_COORDINATOR", "DEFENSIVE_COORDINATOR", "STRENGTH_COACH"];
const REGULAR_SEASON_WEEKS = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14] as const;
const DIVISION_GAME_COUNT = 8;
const STADIUM_CAPACITY_BY_LEVEL: Readonly<Record<number, number>> = { 1: 25_000, 2: 36_000, 3: 50_000, 4: 68_000, 5: 88_000 };
const STARTER_COUNTS: Readonly<Record<Position, number>> = { QB: 1, RB: 2, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, DB: 4, K: 1, P: 1 };
const OFFENSIVE_POSITIONS = new Set<Position>(["QB", "RB", "WR", "TE", "OL"]);
const DEFENSIVE_POSITIONS = new Set<Position>(["DL", "LB", "DB"]);
export const SEASON_AWARD_LABELS: Readonly<Record<SeasonAwardType, string>> = {
  PLAYER_OF_THE_YEAR: "Legends Player of the Year",
  OFFENSIVE_PLAYER_OF_THE_YEAR: "Offensive Player of the Year",
  DEFENSIVE_PLAYER_OF_THE_YEAR: "Defensive Player of the Year",
  FRESHMAN_OF_THE_YEAR: "Freshman of the Year",
  COACH_OF_THE_YEAR: "Coach of the Year"
};
export const SEASON_AWARD_TYPES = Object.keys(SEASON_AWARD_LABELS) as SeasonAwardType[];

const RECRUITING_POINT_CAP = 120;
const RECRUITING_SEARCH_COSTS: Readonly<Record<RecruitingSearchType, number>> = {
  LOCAL_REGION: 15,
  POSITION: 12,
  SLEEPERS: 10,
  NATIONAL_SHOWCASE: 25
};
const RECRUITING_SEARCH_YIELDS: Readonly<Record<RecruitingSearchType, number>> = {
  LOCAL_REGION: 8,
  POSITION: 6,
  SLEEPERS: 6,
  NATIONAL_SHOWCASE: 10
};
const RECRUITING_EVALUATION_COSTS: Readonly<Record<RecruitingEvaluation, number>> = {
  BASIC: 5,
  ATHLETIC: 8,
  POSITION: 10,
  CHARACTER: 8,
  MEDICAL: 6,
  PROJECTION: 12
};
const RECRUIT_PRIORITIES: readonly RecruitPriority[] = [
  "EARLY_PLAYING_TIME",
  "WINNING",
  "PLAYER_DEVELOPMENT",
  "NATIONAL_EXPOSURE",
  "ACADEMICS",
  "FACILITIES",
  "CLOSE_TO_HOME",
  "PERSONAL_STARDOM"
];

export function recruitingSearchCost(searchType: RecruitingSearchType): number {
  return RECRUITING_SEARCH_COSTS[searchType];
}

export function recruitingEvaluationCost(evaluation: RecruitingEvaluation): number {
  return RECRUITING_EVALUATION_COSTS[evaluation];
}

export function recruitingWeeklyPoints(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const staffPoints = Object.values(state.staff)
    .filter((staff) => staff.programId === programId && staff.assignment === "RECRUITING")
    .reduce((sum, staff) => sum + staff.rating / 20, 0);
  return Math.round(32 + program.facilities.RECRUITING * 4 + staffPoints);
}

export function projectedRecruitingOpenings(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const currentScholarships = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP"
  ).length;
  const certainDepartures = Object.values(state.players).filter((player) =>
    player.programId === programId
    && player.eligibility.rosterStatus === "SCHOLARSHIP"
    && player.eligibility.seasonsRemaining <= 1
  ).length;
  const commitments = Object.values(state.prospects).filter((prospect) =>
    prospect.status === "COMMITTED" && prospect.signedProgramId === programId
  ).length;
  return Math.max(0, program.scholarshipLimit - currentScholarships + certainDepartures - commitments);
}

export interface ProspectScoutingReport {
  scoutingPercent: number;
  overall: string;
  potential: string;
  athletic: string;
  positionSkill: string;
  character: string;
  medical: string;
  priorities: RecruitPriority[];
  fitScore: number | null;
  pursuitPoints: number;
  competition: { programId: string; points: number }[];
}

export function prospectScoutingReport(state: Readonly<GameState>, programId: string, prospect: Readonly<Prospect>): ProspectScoutingReport {
  const scouting = state.recruiting[programId]?.scoutingByProspect[prospect.id];
  const evaluations = new Set(scouting?.evaluations ?? []);
  const quality = scoutingQuality(state, programId);
  const estimate = (value: number, field: string): string => {
    const rng = new AddressableRng(state.identity.rootSeed).fork("scouting-estimate", programId, prospect.id);
    const width = Math.max(2, Math.round(15 - quality * 0.12));
    const bias = Math.round(rng.between(field, -width * 0.45, width * 0.45));
    const center = clamp(Math.round(value) + bias, 40, 99);
    return `${clamp(center - Math.ceil(width / 2), 40, 99)}–${clamp(center + Math.floor(width / 2), 40, 99)}`;
  };
  const grade = (value: number): string => value >= 0.82 ? "A" : value >= 0.68 ? "B" : value >= 0.5 ? "C" : value >= 0.34 ? "D" : "F";
  const athletic = evaluations.has("ATHLETIC")
    ? `STR ${estimate(prospect.ratings.strength, "strength")} · CON ${estimate(prospect.ratings.conditioning, "conditioning")}`
    : "Unknown";
  const positionSkill = evaluations.has("POSITION")
    ? `TEC ${estimate(prospect.ratings.technique, "technique")}${prospect.position === "QB" ? ` · ARM ${estimate(prospect.ratings.armStrength, "arm")}` : ""}`
    : "Unknown";
  const competition = Object.entries(state.recruiting)
    .map(([candidateProgramId, recruiting]) => ({
      programId: candidateProgramId,
      points: recruiting.scoutingByProspect[prospect.id]?.pursuitPoints ?? 0
    }))
    .filter((entry) => entry.points > 0)
    .sort((left, right) => right.points - left.points || left.programId.localeCompare(right.programId))
    .slice(0, 3);
  return {
    scoutingPercent: Math.round(evaluations.size / 6 * 100),
    overall: evaluations.has("BASIC") ? estimate(prospect.overall, "overall") : "Unknown",
    potential: evaluations.has("PROJECTION") ? estimate(prospect.potential, "potential") : "Unknown",
    athletic,
    positionSkill,
    character: evaluations.has("CHARACTER") ? `Work ethic ${grade(prospect.workEthic)}` : "Unknown",
    medical: evaluations.has("MEDICAL")
      ? prospect.ratings.injuryPrevention >= 78 ? "Low injury concern" : prospect.ratings.injuryPrevention >= 62 ? "Average medical profile" : "Elevated injury concern"
      : "Unknown",
    priorities: evaluations.has("CHARACTER") ? prospect.priorities : [],
    fitScore: evaluations.has("CHARACTER") ? Math.round(prospectProgramFit(state, prospect, programId)) : null,
    pursuitPoints: scouting?.pursuitPoints ?? 0,
    competition
  };
}

export interface DevelopmentPayoff {
  ratingChanges: Partial<Record<PlayerRating, number>>;
  fatigueChange: number;
  gameEffect: string;
  tradeoff: string;
}

const DEVELOPMENT_PAYOFFS: Readonly<Record<DevelopmentFocus, DevelopmentPayoff>> = {
  BALANCED: {
    ratingChanges: { technique: 0.2, strength: 0.2, conditioning: 0.2, injuryPrevention: 0.1 },
    fatigueChange: 1,
    gameEffect: "Broad growth across execution, power, and endurance",
    tradeoff: "No single attribute develops quickly"
  },
  TECHNIQUE: {
    ratingChanges: { technique: 0.5, conditioning: 0.1, injuryPrevention: 0.05 },
    fatigueChange: 1.5,
    gameEffect: "Technique directly raises weekly game execution",
    tradeoff: "Minimal power and durability growth"
  },
  STRENGTH: {
    ratingChanges: { technique: 0.1, strength: 0.5, conditioning: 0.1, armStrength: 0.4 },
    fatigueChange: 2.5,
    gameEffect: "Strength raises physical play; QB arm strength raises passing power",
    tradeoff: "Highest fatigue and injury exposure"
  },
  CONDITIONING: {
    ratingChanges: { technique: 0.05, strength: 0.05, conditioning: 0.5, injuryPrevention: 0.35 },
    fatigueChange: -2,
    gameEffect: "Endurance sustains game performance and injury prevention lowers risk",
    tradeoff: "Slowest direct overall-rating growth"
  }
};

export function developmentPayoff(focus: DevelopmentFocus, position: Position): DevelopmentPayoff {
  const payoff = DEVELOPMENT_PAYOFFS[focus];
  if (focus !== "STRENGTH" || position === "QB") return payoff;
  const { armStrength: _unused, ...ratingChanges } = payoff.ratingChanges;
  return { ...payoff, ratingChanges };
}

export function projectedDevelopmentPayoff(
  state: Readonly<GameState>,
  player: Readonly<Player>,
  focus: DevelopmentFocus = player.developmentFocus,
  intensity = 1
): DevelopmentPayoff {
  if (!player.programId) return developmentPayoff(focus, player.position);
  const rules = state.identity.balanceConfiguration.weeklyDevelopment;
  const program = state.programs[player.programId]!;
  const fatigueModifier = clamp(1 - player.fatigue / 180, rules.fatigueFloor, 1);
  const trainingModifier = 1 + Math.max(0, program.facilities.TRAINING - 1) * 0.04;
  const coachingModifier = 1 + Object.values(state.staff)
    .filter((staff) => staff.programId === program.id && staff.assignment === "PLAYER_DEVELOPMENT")
    .reduce((sum, staff) => sum + staff.rating / 500, 0);
  const scale = clamp((0.72 + player.workEthic * 0.45) * fatigueModifier * trainingModifier * coachingModifier, 0.5, 1.8);
  const payoff = developmentPayoff(focus, player.position);
  return {
    ...payoff,
    ratingChanges: Object.fromEntries(
      (Object.entries(payoff.ratingChanges) as [PlayerRating, number][]).map(([rating, change]) => [rating, Number((change * scale * intensity).toFixed(2))])
    ),
    fatigueChange: Number((payoff.fatigueChange * intensity).toFixed(1))
  };
}

export function staffAssignmentPayoff(member: Pick<StaffMember, "rating" | "role">, assignment: StaffAssignment): string {
  if (assignment === "GAME_PREP") return `+${gamePrepContribution(member).toFixed(1)} team rating in the next game`;
  if (assignment === "PLAYER_DEVELOPMENT") return `+${Math.round(member.rating / 5)}% weekly player growth`;
  if (assignment === "RECRUITING") return `+${(member.rating / 25).toFixed(1)} pursuit score and +${Math.round(member.rating / 20)} Recruiting Points each week`;
  return `-${(member.rating / 30).toFixed(1)} roster fatigue; ${Math.round(member.rating / 2)}% chance to shorten injuries`;
}

export function facilityPayoff(facility: FacilityType, level: number): string {
  if (facility === "TRAINING") return `+${Math.max(0, level - 1) * 4}% weekly player growth`;
  if (facility === "STADIUM") return `+${Math.max(0, level - 1) * 8}% home-game revenue`;
  if (facility === "ACADEMICS") return `-${Math.max(0, level - 1) * 1.5}% offseason transfer risk`;
  return `+${Math.max(0, level - 1) * 2} pursuit score and +${level * 4} Recruiting Points each week`;
}

export function stadiumCapacity(level: number): number {
  return STADIUM_CAPACITY_BY_LEVEL[clamp(Math.round(level), 1, 5)]!;
}

export interface PlayerMediaPayoff {
  personalFans: string;
  stardom: string;
  schoolConversion: string;
  tradeoff: string;
}

const PLAYER_MEDIA_PAYOFFS: Readonly<Record<PlayerMediaAction, PlayerMediaPayoff>> = {
  FOOTBALL_FOCUS: {
    personalFans: "No guaranteed audience growth",
    stardom: "+2 game-rating boost",
    schoolConversion: "Performance gains convert 20% to school fans",
    tradeoff: "-1 fatigue; safest football choice"
  },
  MEDIA_DAY: {
    personalFans: "+900 personal fans",
    stardom: "+2 stardom",
    schoolConversion: "30% of new fans join the school fan base",
    tradeoff: "+1 fatigue; uses the program's one featured-player slot"
  },
  SOCIAL_MEDIA: {
    personalFans: "+1,400 plus 2% of current personal fans",
    stardom: "+3 stardom",
    schoolConversion: "15% of new fans join the school fan base",
    tradeoff: "+2 fatigue; uses the featured-player slot and builds the player more than the school"
  },
  COMMUNITY_APPEARANCE: {
    personalFans: "+650 personal fans",
    stardom: "+1 stardom",
    schoolConversion: "45% of new fans join the school fan base",
    tradeoff: "+1 fatigue; uses the featured-player slot and gives the strongest school conversion"
  }
};

export function playerMediaPayoff(action: PlayerMediaAction): PlayerMediaPayoff {
  return PLAYER_MEDIA_PAYOFFS[action];
}

export function marqueeGuarantee(rank: number): number {
  return Math.round(500_000 + (25 - clamp(rank, 1, 25)) * (1_000_000 / 24));
}

export function createFictionalLeague(rootSeed: string, programCount = FICTIONAL_PROGRAMS.length): GameState {
  const selectedPrograms = FICTIONAL_PROGRAMS.slice(0, clamp(Math.trunc(programCount), 2, FICTIONAL_PROGRAMS.length));
  const rng = new AddressableRng(rootSeed).fork("league-generation");
  const nameRng = rng.fork("fictional-names");
  const firstNameOffset = Math.floor(nameRng.between("first-offset", 0, 96));
  const lastNameOffset = Math.floor(nameRng.between("last-offset", 0, 160));
  const nameFor = (ordinal: number): string => fictionalPersonName(ordinal, firstNameOffset, lastNameOffset);
  const state: GameState = {
    identity: { rootSeed, balanceConfiguration: { version: "0.1.0", weeklyDevelopment: { base: 0.012, workEthicWeight: 0.022, fatigueFloor: 0.62, maximum: 0.09 }, game: { homeFieldAdvantage: 2.8 } }, simulationVersion: "0.1.0" },
    season: 2027, week: 0, phase: "ROSTER_REVIEW", programs: {}, players: {}, prospects: {}, recruiting: {}, developmentSpotlights: {}, gamePlans: {}, staff: {}, depthCharts: {}, playerGameStats: [], schedule: [], seasonHistory: [], eventHistory: []
  };
  const rosterPositions = Object.entries(ROSTER_COMPOSITION).flatMap(([position, count]) =>
    Array.from({ length: count }, () => position as Position)
  );
  for (let index = 0; index < selectedPrograms.length; index += 1) {
    const definition = selectedPrograms[index]!;
    const id = `program-${index + 1}`;
    const tier = definition.tier;
    const facilityLevel = tier === "POWER" ? 4 : tier === "MID" ? 3 : 2;
    const baseline = tier === "POWER" ? 83 : tier === "MID" ? 75 : 68;
    state.programs[id] = {
      id,
      name: `${definition.name} ${definition.nickname}`,
      nickname: definition.nickname,
      abbreviation: definition.abbreviation,
      city: definition.city,
      state: definition.state,
      stateCode: definition.stateCode,
      divisionId: definition.divisionId,
      tier,
      budget: tier === "POWER" ? 20_000_000 : tier === "MID" ? 6_000_000 : 1_500_000,
      scholarshipLimit: 85,
      wins: 0,
      losses: 0,
      championships: 0,
      coachSecurity: tier === "POWER" ? 45 : tier === "MID" ? 65 : 92,
      prestige: tier === "POWER" ? 88 : tier === "MID" ? 72 : 55,
      fanSupport: tier === "POWER" ? 91 : tier === "MID" ? 70 : 48,
      fanBase: tier === "POWER" ? 92_000 : tier === "MID" ? 55_000 : 27_000,
      localPress: tier === "POWER" ? 82 : tier === "MID" ? 55 : 32,
      nationalPress: tier === "POWER" ? 80 : tier === "MID" ? 38 : 12,
      nationalRank: index + 1,
      weeklyRevenue: tier === "POWER" ? 1_200_000 : tier === "MID" ? 520_000 : 210_000,
      weeklyExpenses: tier === "POWER" ? 940_000 : tier === "MID" ? 430_000 : 185_000,
      facilities: { TRAINING: facilityLevel, STADIUM: facilityLevel, ACADEMICS: facilityLevel, RECRUITING: facilityLevel }
    };
    state.recruiting[id] = {
      points: 0,
      weeklyPoints: 0,
      discoveredProspectIds: [],
      scoutingByProspect: {}
    };
    state.developmentSpotlights[id] = null;
    state.gamePlans[id] = { ...DEFAULT_GAME_PLAN };
    for (const [staffIndex, role] of STAFF_ROLES.entries()) {
      const staffId = `${id}-staff-${staffIndex + 1}`;
      const personOrdinal = index * (STARTING_ROSTER_SIZE + STAFF_ROLES.length) + staffIndex;
      state.staff[staffId] = {
        id: staffId,
        programId: id,
        name: nameFor(personOrdinal),
        role,
        rating: Math.round(rng.between(`${staffId}:rating`, baseline - 4, baseline + 7)),
        salary: Math.round(rng.between(`${staffId}:salary`, 140_000, tier === "POWER" ? 1_400_000 : 650_000)),
        assignment: role === "STRENGTH_COACH" ? "PLAYER_DEVELOPMENT" : "GAME_PREP"
      };
    }
    for (let rosterIndex = 0; rosterIndex < rosterPositions.length; rosterIndex += 1) {
      const playerId = `${id}-player-${rosterIndex + 1}`;
      const personOrdinal = index * (STARTING_ROSTER_SIZE + STAFF_ROLES.length) + STAFF_ROLES.length + rosterIndex;
      const overall = Math.round(rng.between(`${playerId}:overall`, baseline - 5, baseline + 5));
      const position = rosterPositions[rosterIndex]!;
      state.players[playerId] = {
        id: playerId,
        name: nameFor(personOrdinal),
        programId: id,
        position,
        overall,
        potential: clamp(Math.round(overall + rng.between(`${playerId}:potential`, 2, 13)), overall, 99),
        workEthic: rng.between(`${playerId}:work-ethic`, 0.2, 1),
        fatigue: 0,
        ratings: createPlayerRatings(overall, position, rng, playerId),
        injuryWeeksRemaining: 0,
        stardom: clamp(Math.round((overall - 55) * 1.15 + rng.between(`${playerId}:stardom`, -4, 4)), 5, 75),
        personalFans: Math.max(100, Math.round((overall - 50) ** 2 * (tier === "POWER" ? 12 : tier === "MID" ? 7 : 4) + rng.between(`${playerId}:fans`, 0, 750))),
        mediaAction: "FOOTBALL_FOCUS",
        lastGameRating: null,
        lastGameSummary: null,
        developmentFocus: "BALANCED",
        eligibility: { cohortYear: 2027 - (rosterIndex % 4), seasonsEnrolled: rosterIndex % 4, seasonsParticipated: rosterIndex % 4, seasonsRemaining: 4 - (rosterIndex % 4), redshirtStatus: "AVAILABLE", gamesPlayedThisSeason: 0, rosterStatus: "SCHOLARSHIP" }
      };
    }
    state.depthCharts[id] = buildDefaultDepthChart(state, id);
  }
  updateNationalRankings(state);
  const actualProgramCount = selectedPrograms.length;
  generateProspects(state, rng.fork("prospects"), actualProgramCount * 30, "initial", actualProgramCount * (STARTING_ROSTER_SIZE + STAFF_ROLES.length), firstNameOffset, lastNameOffset);
  initializeRecruitingBoards(state, rng.fork("initial-recruiting-boards"));
  buildSeasonSchedule(state);
  return state;
}

function createPlayerRatings(overall: number, position: Position, rng: AddressableRng, path: string): PlayerRatings {
  const rating = (name: PlayerRating, offset = 0): number =>
    clamp(Number((overall + offset + rng.between(`${path}:${name}`, -4, 4)).toFixed(1)), 40, 99);
  return {
    technique: rating("technique"),
    strength: rating("strength", ["OL", "DL", "LB", "RB"].includes(position) ? 2 : 0),
    conditioning: rating("conditioning"),
    injuryPrevention: rating("injuryPrevention"),
    armStrength: rating("armStrength", position === "QB" ? 3 : -3)
  };
}

export function beginSeason(input: Readonly<GameState>, commands: readonly GameCommand[] = []): GameState {
  const state = clone<GameState>(input);
  if (state.phase === "ROSTER_REVIEW") {
    const events: GameEvent[] = [];
    for (const command of commands) {
      if (command.type === "SCHEDULE_MARQUEE_HOME_GAME") {
        scheduleMarqueeHomeGame(state, command.programId, command.opponentProgramId, events);
      } else if (command.type === "SET_DEPTH_CHART") {
        applyDepthChartCommand(state, command, events);
      } else if (command.type === "SET_REDSHIRT" || command.type === "RED_SHIRT") {
        applyRedshirtCommand(state, command, events);
      } else {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Only depth-chart, redshirt, and preseason scheduling decisions can be made before the season begins." });
      }
    }
    state.eventHistory.push(...events);
    state.phase = "REGULAR_SEASON";
    state.week = 1;
    for (const program of Object.values(state.programs)) {
      const recruiting = state.recruiting[program.id]!;
      recruiting.weeklyPoints = recruitingWeeklyPoints(state, program.id);
      recruiting.points = recruiting.weeklyPoints;
    }
  }
  return state;
}

export interface MarqueeGameOption {
  opponentProgramId: string;
  rank: number;
  guarantee: number;
  week: number;
}

export function marqueeGameOptions(state: Readonly<GameState>, hostProgramId: string): MarqueeGameOption[] {
  if (state.phase !== "ROSTER_REVIEW") return [];
  const host = state.programs[hostProgramId];
  if (!host) return [];
  return Object.values(state.programs)
    .filter((program) => program.id !== hostProgramId && program.tier === "POWER" && program.nationalRank <= 25)
    .map((program) => {
      const swap = findMarqueeSwap(state, hostProgramId, program.id);
      return swap ? { opponentProgramId: program.id, rank: program.nationalRank, guarantee: marqueeGuarantee(program.nationalRank), week: state.schedule[swap.hostGameIndex]!.week } : null;
    })
    .filter((option): option is MarqueeGameOption => option !== null && option.guarantee <= host.budget)
    .sort((left, right) => left.rank - right.rank);
}

function scheduleMarqueeHomeGame(state: GameState, hostProgramId: string, opponentProgramId: string, events: GameEvent[]): void {
  const host = state.programs[hostProgramId];
  const opponent = state.programs[opponentProgramId];
  const command: GameCommand = { type: "SCHEDULE_MARQUEE_HOME_GAME", programId: hostProgramId, opponentProgramId };
  if (!host || !opponent || opponent.tier !== "POWER" || opponent.nationalRank > 25) {
    events.push({ type: "COMMAND_REJECTED", programId: hostProgramId, command, reason: "Choose an available Top-25 power program." });
    return;
  }
  const guarantee = marqueeGuarantee(opponent.nationalRank);
  if (host.budget < guarantee) {
    events.push({ type: "COMMAND_REJECTED", programId: hostProgramId, command, reason: "The program cannot afford this appearance guarantee." });
    return;
  }
  const swap = findMarqueeSwap(state, hostProgramId, opponentProgramId);
  if (!swap) {
    events.push({ type: "COMMAND_REJECTED", programId: hostProgramId, command, reason: "No compatible cross-division date is available for this matchup." });
    return;
  }
  const hostGame = state.schedule[swap.hostGameIndex]!;
  const opponentGame = state.schedule[swap.opponentGameIndex]!;
  const displacedVisitor = hostGame.awayProgramId;
  const displacedOpponent = opponentGame.homeProgramId === opponentProgramId ? opponentGame.awayProgramId : opponentGame.homeProgramId;
  hostGame.awayProgramId = opponentProgramId;
  hostGame.matchupType = "MARQUEE";
  hostGame.guaranteePaid = guarantee;
  hostGame.marqueeOpponentRank = opponent.nationalRank;
  opponentGame.homeProgramId = displacedOpponent;
  opponentGame.awayProgramId = displacedVisitor;
  host.budget -= guarantee;
  events.push({
    type: "MARQUEE_GAME_SCHEDULED",
    season: state.season,
    programId: host.id,
    opponentProgramId: opponent.id,
    week: hostGame.week,
    guarantee,
    opponentRank: opponent.nationalRank
  });
}

function findMarqueeSwap(state: Readonly<GameState>, hostProgramId: string, opponentProgramId: string): { hostGameIndex: number; opponentGameIndex: number } | null {
  const existingPair = (left: string, right: string, ignored: ReadonlySet<number>): boolean =>
    state.schedule.some((game, index) => !ignored.has(index) &&
      ((game.homeProgramId === left && game.awayProgramId === right) || (game.homeProgramId === right && game.awayProgramId === left)));
  for (const [hostGameIndex, hostGame] of state.schedule.entries()) {
    if (hostGame.homeProgramId !== hostProgramId || hostGame.matchupType !== "CROSS_DIVISION") continue;
    for (const [opponentGameIndex, opponentGame] of state.schedule.entries()) {
      if (opponentGameIndex === hostGameIndex || opponentGame.week !== hostGame.week || opponentGame.matchupType !== "CROSS_DIVISION") continue;
      if (opponentGame.homeProgramId !== opponentProgramId && opponentGame.awayProgramId !== opponentProgramId) continue;
      const displacedVisitor = hostGame.awayProgramId;
      const displacedOpponent = opponentGame.homeProgramId === opponentProgramId ? opponentGame.awayProgramId : opponentGame.homeProgramId;
      if (new Set([hostProgramId, opponentProgramId, displacedVisitor, displacedOpponent]).size < 4) continue;
      const ignored = new Set([hostGameIndex, opponentGameIndex]);
      if (existingPair(hostProgramId, opponentProgramId, ignored) || existingPair(displacedOpponent, displacedVisitor, ignored)) continue;
      return { hostGameIndex, opponentGameIndex };
    }
  }
  return null;
}

export function buildSeasonSchedule(state: GameState): void {
  state.schedule = [];
  let scheduleIndex = 0;
  const programsByDivision = new Map<DivisionId, string[]>();
  for (const program of Object.values(state.programs)) {
    const ids = programsByDivision.get(program.divisionId) ?? [];
    ids.push(program.id);
    programsByDivision.set(program.divisionId, ids);
  }
  const activeDivisions = [...programsByDivision.keys()];
  const seasonRotation = Math.max(0, state.season - 2027);

  for (const [divisionIndex, divisionId] of activeDivisions.entries()) {
    const rounds = roundRobinRounds(programsByDivision.get(divisionId)!);
    const roundCount = Math.min(DIVISION_GAME_COUNT, rounds.length);
    for (let slot = 0; slot < roundCount; slot += 1) {
      const week = REGULAR_SEASON_WEEKS[slot]!;
      const round = rounds[(slot + seasonRotation * DIVISION_GAME_COUNT) % rounds.length]!;
      for (const [pairIndex, [left, right]] of round.entries()) {
        const flip = (slot + pairIndex + divisionIndex + state.season) % 2 === 0;
        const homeProgramId = flip ? left : right;
        const awayProgramId = flip ? right : left;
        state.schedule.push({ id: `game:${state.season}:${scheduleIndex++}`, week, homeProgramId, awayProgramId, matchupType: "DIVISION", guaranteePaid: 0, marqueeOpponentRank: null, played: false, homeScore: null, awayScore: null });
      }
    }
  }

  if (activeDivisions.length < 2) return;
  const divisionRounds = roundRobinRounds(activeDivisions);
  for (let crossSlot = 0; crossSlot < 4; crossSlot += 1) {
    const week = REGULAR_SEASON_WEEKS[DIVISION_GAME_COUNT + crossSlot]!;
    const divisionPairings = divisionRounds[(crossSlot + seasonRotation * 4) % divisionRounds.length]!;
    for (const [divisionPairIndex, [leftDivision, rightDivision]] of divisionPairings.entries()) {
      const leftPrograms = programsByDivision.get(leftDivision)!;
      const rightPrograms = programsByDivision.get(rightDivision)!;
      const pairCount = Math.min(leftPrograms.length, rightPrograms.length);
      const rotation = (seasonRotation * 4 + crossSlot) % Math.max(1, rightPrograms.length);
      for (let teamIndex = 0; teamIndex < pairCount; teamIndex += 1) {
        const left = leftPrograms[teamIndex]!;
        const right = rightPrograms[(teamIndex + rotation) % rightPrograms.length]!;
        const flip = (crossSlot + teamIndex + divisionPairIndex + state.season) % 2 === 0;
        const homeProgramId = flip ? left : right;
        const awayProgramId = flip ? right : left;
        state.schedule.push({ id: `game:${state.season}:${scheduleIndex++}`, week, homeProgramId, awayProgramId, matchupType: "CROSS_DIVISION", guaranteePaid: 0, marqueeOpponentRank: null, played: false, homeScore: null, awayScore: null });
      }
    }
  }
  balanceHomeAndAway(state.schedule);
}

function roundRobinRounds<T extends string>(values: readonly T[]): [T, T][][] {
  if (values.length < 2) return [];
  const participants: Array<T | null> = [...values];
  if (participants.length % 2 !== 0) participants.push(null);
  const rounds: [T, T][][] = [];
  for (let roundIndex = 0; roundIndex < participants.length - 1; roundIndex += 1) {
    const pairings: [T, T][] = [];
    for (let index = 0; index < participants.length / 2; index += 1) {
      const left = participants[index];
      const right = participants[participants.length - 1 - index];
      if (left != null && right != null) pairings.push([left, right]);
    }
    rounds.push(pairings);
    participants.splice(1, 0, participants.pop()!);
  }
  return rounds;
}

/**
 * A 12-game schedule gives every full-league program an even graph degree.
 * Orienting each Euler circuit produces exactly six home and six away games
 * without changing opponents, weeks, or matchup types.
 */
function balanceHomeAndAway(schedule: GameState["schedule"]): void {
  const adjacency = new Map<string, number[]>();
  for (const [gameIndex, game] of schedule.entries()) {
    for (const programId of [game.homeProgramId, game.awayProgramId]) {
      const edges = adjacency.get(programId) ?? [];
      edges.push(gameIndex);
      adjacency.set(programId, edges);
    }
  }
  if ([...adjacency.values()].some((edges) => edges.length % 2 !== 0)) return;

  const unused = new Set(schedule.map((_, index) => index));
  for (const start of adjacency.keys()) {
    if (!(adjacency.get(start) ?? []).some((edge) => unused.has(edge))) continue;
    const stack: Array<{ programId: string; viaGame: number | null }> = [{ programId: start, viaGame: null }];
    while (stack.length > 0) {
      const current = stack[stack.length - 1]!;
      const edge = (adjacency.get(current.programId) ?? []).find((candidate) => unused.has(candidate));
      if (edge !== undefined) {
        unused.delete(edge);
        const game = schedule[edge]!;
        const opponent = game.homeProgramId === current.programId ? game.awayProgramId : game.homeProgramId;
        stack.push({ programId: opponent, viaGame: edge });
        continue;
      }
      const completed = stack.pop()!;
      if (completed.viaGame === null || stack.length === 0) continue;
      const previous = stack[stack.length - 1]!.programId;
      schedule[completed.viaGame]!.homeProgramId = previous;
      schedule[completed.viaGame]!.awayProgramId = completed.programId;
    }
  }
}

export function advanceWeek(input: Readonly<GameState>, commands: readonly GameCommand[] = []): SimulationResult {
  const state = clone<GameState>(input);
  if (state.phase !== "REGULAR_SEASON") {
    throw new Error("Review the opening roster and begin the season before advancing a week.");
  }
  state.developmentSpotlights ??= {};
  state.gamePlans ??= {};
  for (const programId of Object.keys(state.programs)) {
    state.developmentSpotlights[programId] = null;
    // A game plan is a standing instruction, so it carries week to week.
    state.gamePlans[programId] ??= { ...DEFAULT_GAME_PLAN };
  }
  for (const player of Object.values(state.players)) {
    if (player.eligibility.rosterStatus === "SCHOLARSHIP") {
      player.developmentFocus = "BALANCED";
      player.mediaAction = "FOOTBALL_FOCUS";
    }
  }
  const events: GameEvent[] = [];
  const rng = new AddressableRng(state.identity.rootSeed).fork(String(state.season), String(state.week));
  resolveCommands(state, commands, rng.fork("commands"), events);
  resolveRecruitingMarket(state, rng.fork("recruiting-market"), events);
  recoverPlayers(state, rng.fork("recovery"), events);
  developPlayers(state, rng.fork("development"), events);
  resolveScheduledGames(state, rng.fork("games"), events);
  const playerBrandImpact = processPlayerBrands(state, rng.fork("player-brands"), events);
  processInjuries(state, rng.fork("injuries"), events);
  processWeeklyRecapsAndFinances(state, playerBrandImpact, events);
  updateNationalRankings(state);
  if (state.week < 14) replenishRecruitingPoints(state, events);
  state.week += 1;
  if (state.week > 14) rolloverSeason(state, events);
  state.eventHistory.push(...events);
  if (state.eventHistory.length > 10_000) state.eventHistory = state.eventHistory.slice(-10_000);
  return { state, events };
}

function resolveCommands(state: GameState, commands: readonly GameCommand[], rng: AddressableRng, events: GameEvent[]): void {
  const orderedCommands = [...commands].sort((left, right) => commandArbitrationKey(left).localeCompare(commandArbitrationKey(right)));
  const developmentWinnerByProgram = new Map<string, string>();
  const featuredMediaWinnerByProgram = new Map<string, string>();
  for (const command of orderedCommands) {
    if (command.type === "SET_DEVELOPMENT_SPOTLIGHT" && !developmentWinnerByProgram.has(command.programId)) {
      developmentWinnerByProgram.set(command.programId, commandArbitrationKey(command));
    }
    if (command.type === "SET_PLAYER_MEDIA_ACTION" && command.action !== "FOOTBALL_FOCUS" && !featuredMediaWinnerByProgram.has(command.programId)) {
      featuredMediaWinnerByProgram.set(command.programId, commandArbitrationKey(command));
    }
  }
  for (const command of orderedCommands) {
    const program = state.programs[command.programId];
    if (!program) {
      events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Program does not exist." });
      continue;
    }
    if (command.type === "SCHEDULE_MARQUEE_HOME_GAME") {
      events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Marquee home games must be arranged before the season begins." });
      continue;
    }
    if (command.type === "SET_DEPTH_CHART") {
      applyDepthChartCommand(state, command, events);
      continue;
    }
    if (command.type === "SET_REDSHIRT" || command.type === "RED_SHIRT") {
      applyRedshirtCommand(state, command, events);
      continue;
    }
    if (command.type === "SEARCH_PROSPECTS") {
      resolveProspectSearch(state, command, rng.fork("search", program.id), events);
      continue;
    }
    if (command.type === "EVALUATE_PROSPECT") {
      const prospect = state.prospects[command.prospectId];
      const recruiting = state.recruiting[program.id]!;
      const scouting = recruiting.scoutingByProspect[command.prospectId];
      if (!prospect || prospect.status !== "AVAILABLE" || !scouting) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Discover this available prospect before evaluating him." });
        continue;
      }
      if (scouting.evaluations.includes(command.evaluation)) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "That evaluation is already complete." });
        continue;
      }
      const cost = recruitingEvaluationCost(command.evaluation);
      if (recruiting.points < cost) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Not enough Recruiting Points for this evaluation." });
        continue;
      }
      recruiting.points -= cost;
      scouting.evaluations.push(command.evaluation);
      scouting.evaluations.sort();
      events.push({
        type: "PROSPECT_EVALUATED",
        season: state.season,
        week: state.week,
        programId: program.id,
        prospectId: prospect.id,
        evaluation: command.evaluation,
        pointsSpent: cost
      });
      continue;
    }
    if (command.type === "INVEST_RECRUITING_POINTS" || command.type === "OFFER_PROSPECT") {
      const prospect = state.prospects[command.prospectId];
      const recruiting = state.recruiting[program.id]!;
      const scouting = recruiting.scoutingByProspect[command.prospectId];
      if (!prospect || prospect.status !== "AVAILABLE" || !scouting) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Prospect is unavailable." });
        continue;
      }
      if (projectedRecruitingOpenings(state, program.id) <= 0) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The projected incoming class is full." });
        continue;
      }
      const points = command.type === "OFFER_PROSPECT" ? 10 : Math.trunc(command.points);
      if (points < 1 || points > 25 || recruiting.points < points) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Choose an investment of 1–25 available Recruiting Points." });
        continue;
      }
      recruiting.points -= points;
      scouting.pursuitPoints += points;
      events.push({
        type: "RECRUITING_INVESTMENT",
        season: state.season,
        week: state.week,
        programId: program.id,
        prospectId: prospect.id,
        pointsSpent: points,
        totalInvestment: scouting.pursuitPoints
      });
      continue;
    }
    if (command.type === "ASSIGN_STAFF") {
      const staff = state.staff[command.staffId];
      if (!staff || staff.programId !== program.id) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Staff assignment is not valid for this program." });
        continue;
      }
      staff.assignment = command.assignment;
      events.push({ type: "STAFF_ASSIGNED", season: state.season, week: state.week, programId: program.id, staffId: staff.id, assignment: staff.assignment });
      continue;
    }
    if (command.type === "UPGRADE_FACILITY") {
      const currentLevel = program.facilities[command.facility];
      const cost = FACILITY_UPGRADE_COST[currentLevel];
      if (!cost || currentLevel >= 5) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Facility is already at the maximum level." });
        continue;
      }
      if (program.budget < cost) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The program cannot afford this facility upgrade." });
        continue;
      }
      program.budget -= cost;
      program.facilities[command.facility] = currentLevel + 1;
      events.push({ type: "FACILITY_UPGRADED", season: state.season, week: state.week, programId: program.id, facility: command.facility, newLevel: currentLevel + 1, cost });
      continue;
    }
    if (command.type === "SET_DEVELOPMENT_SPOTLIGHT") {
      if (developmentWinnerByProgram.get(program.id) !== commandArbitrationKey(command)) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Each program receives one development spotlight per week." });
        continue;
      }
      const targetPlayers = Object.values(state.players).filter((player) =>
        player.programId === program.id
        && player.eligibility.rosterStatus === "SCHOLARSHIP"
        && (command.target.type === "PLAYER"
          ? player.id === command.target.playerId
          : player.position === command.target.position)
      );
      if (!targetPlayers.length) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Choose a current scholarship player or position group." });
        continue;
      }
      const intensity = command.target.type === "PLAYER" ? 1 : 0.55;
      state.developmentSpotlights[program.id] = { focus: command.focus, target: clone(command.target) };
      for (const player of targetPlayers) player.developmentFocus = command.focus;
      events.push({
        type: "DEVELOPMENT_SPOTLIGHT_SET",
        season: state.season,
        week: state.week,
        programId: program.id,
        focus: command.focus,
        target: clone(command.target),
        playerIds: targetPlayers.map((player) => player.id).sort(),
        intensity
      });
      continue;
    }
    if (command.type === "SET_GAME_PLAN") {
      const current = state.gamePlans[program.id] ?? { ...DEFAULT_GAME_PLAN };
      const changed = (Object.keys(command.plan) as (keyof GamePlan)[])
        .filter((key) => command.plan[key] !== undefined && command.plan[key] !== current[key])
        .sort();
      if (!changed.length) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The game plan already reads that way." });
        continue;
      }
      const updated: GamePlan = { ...current };
      for (const key of changed) Object.assign(updated, { [key]: command.plan[key] });
      state.gamePlans[program.id] = updated;
      events.push({ type: "GAME_PLAN_SET", season: state.season, week: state.week, programId: program.id, plan: clone(updated), changed });
      continue;
    }
    if (command.type === "SET_PLAYER_MEDIA_ACTION") {
      const player = state.players[command.playerId];
      if (!player || player.programId !== program.id || player.eligibility.rosterStatus !== "SCHOLARSHIP") {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Command is not valid for this roster." });
        continue;
      }
      if (command.action !== "FOOTBALL_FOCUS" && featuredMediaWinnerByProgram.get(program.id) !== commandArbitrationKey(command)) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Each program can feature only one player in the media per week." });
        continue;
      }
      player.mediaAction = command.action;
      events.push({ type: "PLAYER_MEDIA_ACTION_SET", season: state.season, week: state.week, programId: program.id, playerId: player.id, action: command.action });
      continue;
    }
  }
}

function applyDepthChartCommand(
  state: GameState,
  command: Extract<GameCommand, { type: "SET_DEPTH_CHART" }>,
  events: GameEvent[]
): void {
  const rosterIds = Object.values(state.players)
    .filter((player) =>
      player.programId === command.programId
      && player.position === command.position
      && player.eligibility.rosterStatus === "SCHOLARSHIP"
    )
    .map((player) => player.id)
    .sort();
  const suppliedIds = [...command.playerIds];
  if (
    suppliedIds.length !== rosterIds.length
    || new Set(suppliedIds).size !== suppliedIds.length
    || [...suppliedIds].sort().some((playerId, index) => playerId !== rosterIds[index])
  ) {
    events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: `Depth chart must contain every ${command.position} on this roster exactly once.` });
    return;
  }
  state.depthCharts[command.programId] ??= buildDefaultDepthChart(state, command.programId);
  state.depthCharts[command.programId]![command.position] = suppliedIds;
  events.push({
    type: "DEPTH_CHART_UPDATED",
    season: state.season,
    week: state.week,
    programId: command.programId,
    position: command.position,
    playerIds: suppliedIds
  });
}

function applyRedshirtCommand(
  state: GameState,
  command: Extract<GameCommand, { type: "SET_REDSHIRT" | "RED_SHIRT" }>,
  events: GameEvent[]
): void {
  const player = state.players[command.playerId];
  if (!player || player.programId !== command.programId || player.eligibility.rosterStatus !== "SCHOLARSHIP") {
    events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Redshirt decision is not valid for this roster." });
    return;
  }
  const enabled = command.type === "RED_SHIRT" ? true : command.enabled;
  if (enabled) {
    if (player.eligibility.redshirtStatus !== "AVAILABLE" || player.eligibility.gamesPlayedThisSeason > 4) {
      events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "This player no longer has an available redshirt season." });
      return;
    }
    player.eligibility.redshirtStatus = "REDSHIRTING";
  } else {
    if (player.eligibility.redshirtStatus !== "REDSHIRTING") {
      events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "This player is not currently redshirting." });
      return;
    }
    player.eligibility.redshirtStatus = player.eligibility.gamesPlayedThisSeason === 0 ? "AVAILABLE" : "USED";
  }
  events.push({
    type: "REDSHIRT_STATUS_CHANGED",
    season: state.season,
    week: state.week,
    programId: command.programId,
    playerId: player.id,
    status: player.eligibility.redshirtStatus
  });
}

function commandArbitrationKey(command: GameCommand): string {
  if (command.type === "SEARCH_PROSPECTS") return `${command.programId}:0:${command.searchType}:${command.position ?? ""}`;
  if (command.type === "EVALUATE_PROSPECT") return `${command.programId}:1:${command.prospectId}:${command.evaluation}`;
  if (command.type === "INVEST_RECRUITING_POINTS") return `${command.programId}:2:${command.prospectId}:${String(command.points).padStart(2, "0")}`;
  if (command.type === "OFFER_PROSPECT") return `${command.programId}:2:${command.prospectId}:10`;
  return `${command.programId}:9:${command.type}:${JSON.stringify(command)}`;
}

function resolveProspectSearch(
  state: GameState,
  command: Extract<GameCommand, { type: "SEARCH_PROSPECTS" }>,
  rng: AddressableRng,
  events: GameEvent[]
): void {
  const program = state.programs[command.programId]!;
  const recruiting = state.recruiting[program.id]!;
  const cost = recruitingSearchCost(command.searchType);
  if (command.searchType === "POSITION" && !command.position) {
    events.push({ type: "COMMAND_REJECTED", programId: program.id, command, reason: "Choose a position for the position search." });
    return;
  }
  if (recruiting.points < cost) {
    events.push({ type: "COMMAND_REJECTED", programId: program.id, command, reason: "Not enough Recruiting Points for this search." });
    return;
  }
  const discovered = new Set(recruiting.discoveredProspectIds);
  const candidates = Object.values(state.prospects).filter((prospect) => {
    if (prospect.status !== "AVAILABLE" || discovered.has(prospect.id)) return false;
    if (command.searchType === "LOCAL_REGION") return prospect.homeDivisionId === program.divisionId;
    if (command.searchType === "POSITION") return prospect.position === command.position;
    if (command.searchType === "SLEEPERS") return ["UNRANKED", "REGIONAL"].includes(prospect.reputation) && prospect.potential - prospect.overall >= 10;
    return ["NATIONAL", "ELITE"].includes(prospect.reputation);
  }).sort((left, right) =>
    rng.at(`${command.searchType}:${command.position ?? "ALL"}:${left.id}`)
      - rng.at(`${command.searchType}:${command.position ?? "ALL"}:${right.id}`)
    || left.id.localeCompare(right.id)
  );
  const prospectIds = candidates.slice(0, RECRUITING_SEARCH_YIELDS[command.searchType]).map((prospect) => prospect.id);
  if (!prospectIds.length) {
    events.push({ type: "COMMAND_REJECTED", programId: program.id, command, reason: "The scouting department found no new matches for that search." });
    return;
  }
  recruiting.points -= cost;
  for (const prospectId of prospectIds) addProspectToBoard(recruiting, prospectId);
  events.push({
    type: "PROSPECTS_DISCOVERED",
    season: state.season,
    week: state.week,
    programId: program.id,
    searchType: command.searchType,
    prospectIds,
    pointsSpent: cost
  });
}

/**
 * All investments are applied before the market is resolved. Commitments are
 * sorted by a prospect-specific seeded priority so command and program order
 * never become hidden recruiting rules.
 */
function resolveRecruitingMarket(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  const contests = Object.values(state.prospects)
    .filter((prospect) => prospect.status === "AVAILABLE")
    .map((prospect) => {
      const offeredBy = Object.keys(state.programs).filter((programId) =>
        (state.recruiting[programId]?.scoutingByProspect[prospect.id]?.pursuitPoints ?? 0) > 0
        && projectedRecruitingOpenings(state, programId) > 0
      ).sort();
      const scores = Object.fromEntries(offeredBy.map((programId) => [programId, recruitingScore(state, prospect, programId, rng)]));
      const ranked = [...offeredBy].sort((left, right) => scores[right]! - scores[left]! || left.localeCompare(right));
      return { prospect, offeredBy, scores, ranked, priority: rng.at(`${prospect.id}:commitment-priority`) };
    })
    .filter((contest) => contest.ranked.length > 0)
    .sort((left, right) => left.priority - right.priority || left.prospect.id.localeCompare(right.prospect.id));

  for (const contest of contests) {
    const winnerProgramId = contest.ranked[0]!;
    if (projectedRecruitingOpenings(state, winnerProgramId) <= 0) continue;
    const score = contest.scores[winnerProgramId]!;
    const runnerUpProgramId = contest.ranked[1] ?? null;
    const runnerUpScore = runnerUpProgramId ? contest.scores[runnerUpProgramId]! : null;
    const commitmentThreshold = Math.max(58, 82 - state.week * 2);
    const requiredLead = state.week >= 12 ? 0 : 4;
    if (score < commitmentThreshold || score - (runnerUpScore ?? 0) < requiredLead) continue;
    contest.prospect.status = "COMMITTED";
    contest.prospect.signedProgramId = winnerProgramId;
    events.push({
      type: "RECRUITING_CONTEST_RESOLVED",
      season: state.season,
      week: state.week,
      prospectId: contest.prospect.id,
      offeredBy: contest.offeredBy,
      winnerProgramId,
      scores: contest.scores
    });
    events.push({
      type: "PROSPECT_COMMITTED",
      season: state.season,
      week: state.week,
      prospectId: contest.prospect.id,
      programId: winnerProgramId,
      score,
      runnerUpProgramId,
      runnerUpScore
    });
  }
}

function recruitingScore(state: GameState, prospect: Prospect, programId: string, rng: AddressableRng): number {
  const program = state.programs[programId]!;
  const pursuitPoints = state.recruiting[programId]?.scoutingByProspect[prospect.id]?.pursuitPoints ?? 0;
  const facilityBonus = Math.max(0, program.facilities.RECRUITING - 1) * 2;
  const staffBonus = Object.values(state.staff)
    .filter((staff) => staff.programId === programId && staff.assignment === "RECRUITING")
    .reduce((total, staff) => total + staff.rating / 25, 0);
  const exposureBonus = program.localPress / 50 + program.nationalPress / 20;
  return Number((
    prospect.interestByProgram[programId]! * 0.3
    + prospectProgramFit(state, prospect, programId) * 0.35
    + pursuitPoints * 0.75
    + facilityBonus
    + staffBonus
    + exposureBonus
    + rng.between(`${prospect.id}:${programId}:decision-noise`, -2, 2)
  ).toFixed(3));
}

function scoutingQuality(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const staff = Object.values(state.staff)
    .filter((member) => member.programId === programId && member.assignment === "RECRUITING")
    .reduce((sum, member) => sum + member.rating / 4, 0);
  return clamp(25 + program.facilities.RECRUITING * 12 + staff, 25, 100);
}

function prospectProgramFit(state: Readonly<GameState>, prospect: Readonly<Prospect>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const rosterAtPosition = Object.values(state.players).filter((player) =>
    player.programId === programId && player.position === prospect.position && player.eligibility.rosterStatus === "SCHOLARSHIP"
  );
  const averageStardom = Object.values(state.players)
    .filter((player) => player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP")
    .reduce((sum, player, _index, roster) => sum + player.stardom / Math.max(1, roster.length), 0);
  const priorityScore = (priority: RecruitPriority): number => {
    if (priority === "EARLY_PLAYING_TIME") {
      const returning = rosterAtPosition.filter((player) => player.eligibility.seasonsRemaining > 1);
      const bestReturning = Math.max(40, ...returning.map((player) => player.overall));
      return clamp(95 - returning.length * 5 - Math.max(0, bestReturning - prospect.overall), 15, 95);
    }
    if (priority === "WINNING") return clamp(program.prestige * 0.55 + program.wins * 5 - program.losses * 2, 5, 100);
    if (priority === "PLAYER_DEVELOPMENT") return clamp(program.facilities.TRAINING * 16 + Object.values(state.staff).filter((staff) => staff.programId === programId && staff.assignment === "PLAYER_DEVELOPMENT").reduce((sum, staff) => sum + staff.rating / 6, 0), 10, 100);
    if (priority === "NATIONAL_EXPOSURE") return clamp(program.nationalPress + Math.max(0, 26 - program.nationalRank), 5, 100);
    if (priority === "ACADEMICS") return program.facilities.ACADEMICS * 20;
    if (priority === "FACILITIES") return (program.facilities.TRAINING + program.facilities.RECRUITING) * 10;
    if (priority === "CLOSE_TO_HOME") return prospect.homeDivisionId === program.divisionId ? 95 : 30;
    return clamp(averageStardom + program.nationalPress * 0.45, 5, 100);
  };
  return prospect.priorities.reduce((sum, priority) => sum + priorityScore(priority), 0) / prospect.priorities.length;
}

function replenishRecruitingPoints(state: GameState, events: GameEvent[]): void {
  for (const program of Object.values(state.programs)) {
    const recruiting = state.recruiting[program.id]!;
    const pointsAdded = recruitingWeeklyPoints(state, program.id);
    recruiting.weeklyPoints = pointsAdded;
    recruiting.points = Math.min(RECRUITING_POINT_CAP, recruiting.points + pointsAdded);
    events.push({
      type: "RECRUITING_POINTS_ADDED",
      season: state.season,
      week: state.week,
      programId: program.id,
      pointsAdded,
      pointsAvailable: recruiting.points
    });
  }
}

function prospectToPlayer(prospect: Prospect, id: string, programId: string, season: number): Player {
  return {
    id,
    name: prospect.name,
    programId,
    position: prospect.position,
    overall: prospect.overall,
    potential: prospect.potential,
    workEthic: prospect.workEthic,
    fatigue: 0,
    ratings: clone(prospect.ratings),
    injuryWeeksRemaining: 0,
    stardom: clamp(Math.round((prospect.overall - 55) * 0.9), 3, 45),
    personalFans: Math.max(100, Math.round((prospect.overall - 48) ** 2 * 2)),
    mediaAction: "FOOTBALL_FOCUS",
    lastGameRating: null,
    lastGameSummary: null,
    developmentFocus: "BALANCED",
    eligibility: { cohortYear: season, seasonsEnrolled: 0, seasonsParticipated: 0, seasonsRemaining: 4, redshirtStatus: "AVAILABLE", gamesPlayedThisSeason: 0, rosterStatus: "SCHOLARSHIP" }
  };
}

function generateProspects(state: GameState, rng: AddressableRng, count: number, cohort: string, nameStart = 0, firstNameOffset = 0, lastNameOffset = 0): void {
  const positions: Player["position"][] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
  const programs = Object.values(state.programs);
  for (let index = 0; index < count; index += 1) {
    const id = `prospect-${cohort}-${index + 1}`;
    const overall = Math.round(rng.between(`${id}:overall`, 52, 79));
    const position = positions[index % positions.length]!;
    const homeProgram = programs[Math.floor(rng.between(`${id}:home`, 0, programs.length - 0.0001))]!;
    const priorities = [...RECRUIT_PRIORITIES]
      .sort((left, right) => rng.at(`${id}:priority:${left}`) - rng.at(`${id}:priority:${right}`))
      .slice(0, 3);
    const interestByProgram = Object.fromEntries(Object.keys(state.programs).map((programId) => [programId, Number(rng.between(`${id}:${programId}:interest`, 35, 88).toFixed(3))]));
    state.prospects[id] = {
      id,
      name: fictionalPersonName(nameStart + index, firstNameOffset, lastNameOffset),
      position,
      overall,
      potential: clamp(overall + rng.between(`${id}:potential`, 4, 20), overall, 99),
      workEthic: rng.between(`${id}:work-ethic`, 0.2, 1),
      ratings: createPlayerRatings(overall, position, rng, id),
      homeStateCode: homeProgram.stateCode,
      homeDivisionId: homeProgram.divisionId,
      reputation: overall >= 77 ? "ELITE" : overall >= 72 ? "NATIONAL" : overall >= 63 ? "REGIONAL" : "UNRANKED",
      priorities,
      interestByProgram,
      status: "AVAILABLE",
      signedProgramId: null
    };
  }
}

function addProspectToBoard(recruiting: RecruitingProgramState, prospectId: string): ProspectScoutingState {
  if (!recruiting.discoveredProspectIds.includes(prospectId)) {
    recruiting.discoveredProspectIds.push(prospectId);
    recruiting.discoveredProspectIds.sort();
  }
  recruiting.scoutingByProspect[prospectId] ??= { evaluations: [], pursuitPoints: 0 };
  return recruiting.scoutingByProspect[prospectId]!;
}

function initializeRecruitingBoards(state: GameState, rng: AddressableRng): void {
  const available = Object.values(state.prospects).filter((prospect) => prospect.status === "AVAILABLE");
  for (const program of Object.values(state.programs)) {
    const recruiting = state.recruiting[program.id] ?? {
      points: 0,
      weeklyPoints: 0,
      discoveredProspectIds: [],
      scoutingByProspect: {}
    };
    recruiting.discoveredProspectIds = [];
    recruiting.scoutingByProspect = {};
    state.recruiting[program.id] = recruiting;
    const initialBoard = [...available]
      .sort((left, right) => {
        const leftScore = left.interestByProgram[program.id]! + (left.homeDivisionId === program.divisionId ? 8 : 0) + rng.between(`${program.id}:${left.id}`, -10, 10);
        const rightScore = right.interestByProgram[program.id]! + (right.homeDivisionId === program.divisionId ? 8 : 0) + rng.between(`${program.id}:${right.id}`, -10, 10);
        return rightScore - leftScore || left.id.localeCompare(right.id);
      })
      .slice(0, 10);
    for (const prospect of initialBoard) addProspectToBoard(recruiting, prospect.id);
  }
}

function playerDevelopmentIntensity(state: Readonly<GameState>, player: Readonly<Player>): number {
  if (!player.programId) return 1;
  const spotlight = state.developmentSpotlights?.[player.programId];
  if (!spotlight) return 1;
  if (spotlight.target.type === "PLAYER") return 1;
  return spotlight.target.position === player.position ? 0.55 : 1;
}

function developPlayers(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  const rules = state.identity.balanceConfiguration.weeklyDevelopment;
  for (const player of Object.values(state.players)) {
    if (player.programId === null || player.eligibility.rosterStatus !== "SCHOLARSHIP" || player.overall >= player.potential || player.injuryWeeksRemaining > 0) continue;
    const fatigueModifier = clamp(1 - player.fatigue / 180, rules.fatigueFloor, 1);
    const program = state.programs[player.programId]!;
    const trainingModifier = 1 + Math.max(0, program.facilities.TRAINING - 1) * 0.04;
    const developmentCoaches = Object.values(state.staff).filter((staff) => staff.programId === program.id && staff.assignment === "PLAYER_DEVELOPMENT");
    const coachingModifier = 1 + developmentCoaches.reduce((sum, staff) => sum + staff.rating / 500, 0);
    const intensity = playerDevelopmentIntensity(state, player);
    const focus = projectedDevelopmentPayoff(state, player, player.developmentFocus, intensity);
    const ratingChanges: Partial<Record<PlayerRating, number>> = {};
    for (const [rating, actualChange] of Object.entries(focus.ratingChanges) as [PlayerRating, number][]) {
      player.ratings[rating] = clamp(Number((player.ratings[rating] + actualChange).toFixed(2)), 40, 99);
      ratingChanges[rating] = actualChange;
    }
    const directGrowthWeight = player.developmentFocus === "CONDITIONING" ? 0.72 : player.developmentFocus === "BALANCED" ? 0.9 : 1;
    const gain = clamp((rules.base + player.workEthic * rules.workEthicWeight + rng.between(player.id, -0.01, 0.01)) * fatigueModifier * trainingModifier * coachingModifier * directGrowthWeight, 0, rules.maximum);
    const previousOverall = player.overall;
    player.overall = clamp(Number((player.overall + gain).toFixed(3)), 40, player.potential);
    player.fatigue = clamp(Number((player.fatigue + focus.fatigueChange).toFixed(1)), 0, 100);
    if (player.overall !== previousOverall) events.push({ type: "PLAYER_DEVELOPED", season: state.season, week: state.week, playerId: player.id, previousOverall, newOverall: player.overall, factors: { workEthic: player.workEthic, fatigueModifier, focus: player.developmentFocus, ratingChanges } });
  }
}

/**
 * The four ratings a game is resolved against, before the game plan is applied.
 * Exposed so the roster and game-plan screens can show what a decision moves.
 */
export function programUnitRatings(state: Readonly<GameState>, programId: string): TeamUnitRatings {
  const lineup = activeLineup(state, programId);
  const prepBonus = Object.values(state.staff)
    .filter((staff) => staff.programId === programId && staff.assignment === "GAME_PREP")
    .reduce((total, staff) => total + gamePrepContribution(staff), 0);
  return unitRatingsFromLineup(lineup, prepBonus);
}

/**
 * This week's four matchups for a program, with the opponent's plan folded in
 * when one is scheduled. Lets the game-plan screen show what a call is worth
 * before the week is advanced.
 */
export function projectGamePlan(state: Readonly<GameState>, programId: string): UnitEdge[] {
  const game = state.schedule.find((item) =>
    item.week === state.week && !item.played && (item.homeProgramId === programId || item.awayProgramId === programId)
  );
  const opponentId = game ? (game.homeProgramId === programId ? game.awayProgramId : game.homeProgramId) : null;
  return projectUnitEdges(
    programUnitRatings(state, programId),
    state.gamePlans?.[programId] ?? { ...DEFAULT_GAME_PLAN },
    opponentId ? programUnitRatings(state, opponentId) : null,
    opponentId ? state.gamePlans?.[opponentId] ?? { ...DEFAULT_GAME_PLAN } : null
  );
}

/** A single comparable number, kept for rankings and roster pressure checks. */
function teamStrength(state: Readonly<GameState>, program: Program): number {
  const lineup = activeLineup(state, program.id);
  if (lineup.length === 0) return 40;
  return overallStrength(programUnitRatings(state, program.id));
}

function gamePrepContribution(member: Pick<StaffMember, "rating" | "role">): number {
  const roleFit: Record<StaffRole, number> = { HEAD_COACH: 1.2, OFFENSIVE_COORDINATOR: 1.4, DEFENSIVE_COORDINATOR: 1.4, STRENGTH_COACH: 0.6 };
  return member.rating * roleFit[member.role] / 100;
}

function recoverPlayers(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  for (const program of Object.values(state.programs)) {
    const recoveryStaff = Object.values(state.staff).filter((staff) => staff.programId === program.id && staff.assignment === "RECOVERY");
    const fatigueRecovery = recoveryStaff.reduce((total, staff) => total + staff.rating / 30, 0);
    for (const player of Object.values(state.players).filter((candidate) => candidate.programId === program.id && candidate.eligibility.rosterStatus === "SCHOLARSHIP")) {
      player.fatigue = clamp(Number((player.fatigue - fatigueRecovery).toFixed(1)), 0, 100);
      if (player.injuryWeeksRemaining <= 0) continue;
      const extraRecovery = recoveryStaff.some((staff) => rng.at(`${player.id}:${staff.id}:extra-recovery`) < staff.rating / 200) ? 1 : 0;
      player.injuryWeeksRemaining = Math.max(0, player.injuryWeeksRemaining - 1 - extraRecovery);
      if (player.injuryWeeksRemaining === 0) events.push({ type: "PLAYER_RECOVERED", season: state.season, week: state.week, playerId: player.id });
    }
  }
}

function processInjuries(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  const activePrograms = new Set(state.schedule
    .filter((game) => game.week === state.week && game.played)
    .flatMap((game) => [game.homeProgramId, game.awayProgramId]));
  const activePlayerIds = new Set([...activePrograms].flatMap((programId) => activeLineup(state, programId).map((player) => player.id)));
  for (const player of Object.values(state.players)) {
    if (!player.programId || !activePlayerIds.has(player.id) || player.eligibility.rosterStatus !== "SCHOLARSHIP" || player.injuryWeeksRemaining > 0) continue;
    const preventionModifier = clamp(1 - (player.ratings.injuryPrevention - 50) / 160, 0.55, 1.15);
    const fatigueModifier = 1 + player.fatigue / 80;
    const strengthTrainingModifier = player.developmentFocus === "STRENGTH" ? 1.2 : 1;
    const risk = clamp(0.0035 * preventionModifier * fatigueModifier * strengthTrainingModifier, 0.001, 0.02);
    if (rng.at(`${player.id}:injury`) >= risk) continue;
    const weeks = 1 + Math.floor(rng.between(`${player.id}:injury-length`, 0, 3));
    player.injuryWeeksRemaining = weeks;
    events.push({ type: "PLAYER_INJURED", season: state.season, week: state.week, playerId: player.id, weeks, risk: Number((risk * 100).toFixed(2)) });
  }
}

/**
 * Plays every scheduled game for the current week. Scores, box scores, and the
 * plan report all come out of the same drive simulation, so they cannot
 * disagree with one another.
 */
function resolveScheduledGames(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  for (const game of state.schedule.filter((item) => !item.played && state.week === item.week)) {
    const home = state.programs[game.homeProgramId];
    const away = state.programs[game.awayProgramId];
    if (!home || !away) continue;
    const result = playGame(state, game, home.id, away.id, rng.fork(game.id), true);
    game.played = true;
    game.homeScore = result.home.scoreline.points;
    game.awayScore = result.away.scoreline.points;
    if (game.homeScore > game.awayScore) { home.wins += 1; away.losses += 1; }
    else { away.wins += 1; home.losses += 1; }
    commitGameResult(state, game, home.id, away.id, result, events);
    events.push({
      type: "GAME_COMPLETED",
      season: state.season,
      week: state.week,
      gameId: game.id,
      homeProgramId: home.id,
      awayProgramId: away.id,
      homeScore: game.homeScore,
      awayScore: game.awayScore
    });
  }
}

function teamSide(state: Readonly<GameState>, programId: string): TeamSide {
  return {
    programId,
    lineup: activeLineup(state, programId),
    plan: state.gamePlans?.[programId] ?? { ...DEFAULT_GAME_PLAN },
    prepBonus: Object.values(state.staff)
      .filter((staff) => staff.programId === programId && staff.assignment === "GAME_PREP")
      .reduce((total, staff) => total + gamePrepContribution(staff), 0)
  };
}

function playGame(
  state: Readonly<GameState>,
  game: Readonly<GameState["schedule"][number]>,
  homeProgramId: string,
  awayProgramId: string,
  rng: AddressableRng,
  homeField: boolean
): GameResult {
  return resolveGame(
    teamSide(state, homeProgramId),
    teamSide(state, awayProgramId),
    { season: state.season, week: state.week, gameId: game.id },
    homeField ? state.identity.balanceConfiguration.game.homeFieldAdvantage : 0,
    rng
  );
}

/** Persists a played game: box scores, fatigue, and the plan report for each side. */
function commitGameResult(
  state: GameState,
  game: Readonly<GameState["schedule"][number]>,
  homeProgramId: string,
  awayProgramId: string,
  result: GameResult,
  events: GameEvent[]
): void {
  for (const [programId, opponentProgramId, side, opposingSide] of [
    [homeProgramId, awayProgramId, result.home, result.away] as const,
    [awayProgramId, homeProgramId, result.away, result.home] as const
  ]) {
    for (const line of side.statLines) {
      state.playerGameStats.push(line);
      const player = state.players[line.playerId];
      if (!player) continue;
      player.eligibility.gamesPlayedThisSeason += 1;
      player.lastGameRating = line.gameRating;
      player.lastGameSummary = playerPerformanceSummary(line);
    }
    for (const [playerId, fatigue] of Object.entries(side.fatigueAdded)) {
      const player = state.players[playerId];
      if (player) player.fatigue = clamp(Number((player.fatigue + fatigue).toFixed(1)), 0, 100);
    }
    events.push({
      type: "GAME_PLAN_REPORT",
      season: state.season,
      week: state.week,
      gameId: game.id,
      programId,
      opponentProgramId,
      plan: clone(state.gamePlans?.[programId] ?? { ...DEFAULT_GAME_PLAN }),
      opponentPlan: clone(state.gamePlans?.[opponentProgramId] ?? { ...DEFAULT_GAME_PLAN }),
      units: side.units,
      opponentUnits: opposingSide.units,
      matchups: side.matchups,
      runPlays: side.runPlays,
      passPlays: side.passPlays,
      takeaways: side.takeaways,
      giveaways: side.giveaways,
      sacksFor: side.sacksFor,
      sacksAgainst: side.sacksAgainst,
      leadBackShare: side.leadBackShare,
      topTargetShare: side.topTargetShare,
      notes: gamePlanNotes(side, opposingSide)
    });
  }
}

/** Plain-language reads on which calls worked, assembled from the matchup tallies. */
function gamePlanNotes(side: GameResult["home"], opposingSide: GameResult["home"]): string[] {
  const notes: string[] = [];
  const find = (unit: TeamUnit): MatchupOutcome | undefined => side.matchups.find((entry) => entry.unit === unit);
  const rushOffense = find("rushOffense");
  const passOffense = find("passOffense");
  const rushDefense = find("rushDefense");
  const passDefense = find("passDefense");
  if (rushOffense && passOffense) {
    const better = rushOffense.yardsPerPlay >= passOffense.yardsPerPlay ? rushOffense : passOffense;
    const worse = better === rushOffense ? passOffense : rushOffense;
    notes.push(`${better.unit === "rushOffense" ? "Running" : "Throwing"} produced ${better.yardsPerPlay} yards per play against ${worse.yardsPerPlay} the other way.`);
  }
  if (rushDefense && passDefense) {
    const leak = rushDefense.yardsPerPlay >= passDefense.yardsPerPlay ? rushDefense : passDefense;
    notes.push(`Opponents gained ${leak.yardsPerPlay} per play attacking the ${leak.unit === "rushDefense" ? "run" : "pass"} defense.`);
  }
  if (side.takeaways !== side.giveaways) {
    notes.push(side.takeaways > side.giveaways
      ? `Won the turnover margin ${side.takeaways}-${side.giveaways}.`
      : `Lost the turnover margin ${side.takeaways}-${side.giveaways}.`);
  }
  if (side.sacksAgainst >= 4) notes.push(`Surrendered ${side.sacksAgainst} sacks; the pass protection was overmatched.`);
  if (side.leadBackShare >= 0.6) notes.push(`The lead back took ${Math.round(side.leadBackShare * 100)}% of the carries.`);
  if (side.topTargetShare >= 0.35) notes.push(`The top receiver drew ${Math.round(side.topTargetShare * 100)}% of the targets.`);
  void opposingSide;
  return notes;
}


interface ProgramBrandImpact {
  schoolFanLift: number;
  localPressLift: number;
  nationalPressLift: number;
  featuredPlayerId: string | null;
  featuredPlayerRating: number | null;
}

function processPlayerBrands(state: GameState, rng: AddressableRng, events: GameEvent[]): ReadonlyMap<string, ProgramBrandImpact> {
  const impactByProgram = new Map<string, ProgramBrandImpact>();
  for (const program of Object.values(state.programs)) {
    const game = state.schedule.find((item) => item.week === state.week && item.played && (item.homeProgramId === program.id || item.awayProgramId === program.id));
    const home = game?.homeProgramId === program.id;
    const scoreFor = game ? (home ? game.homeScore! : game.awayScore!) : null;
    const scoreAgainst = game ? (home ? game.awayScore! : game.homeScore!) : null;
    const won = scoreFor !== null && scoreAgainst !== null && scoreFor > scoreAgainst;
    const margin = scoreFor !== null && scoreAgainst !== null ? scoreFor - scoreAgainst : 0;
    const roster = Object.values(state.players).filter((player) =>
      player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP"
    );
    const statByPlayer = new Map(state.playerGameStats
      .filter((line) => line.season === state.season && line.week === state.week && line.programId === program.id)
      .map((line) => [line.playerId, line]));
    const brandEvents: Extract<GameEvent, { type: "PLAYER_BRAND_UPDATED" }>[] = [];
    let schoolFanLift = 0;
    let localPressLift = 0;
    let nationalPressLift = 0;

    for (const player of roster) {
      const action = player.mediaAction;
      const statLine = statByPlayer.get(player.id);
      const gameRating = statLine?.gameRating ?? null;
      const performanceSummary = gameRating === null
        ? (game ? "Did not record a featured role" : "Bye week")
        : playerPerformanceSummary(statLine!);
      const stardomBefore = player.stardom;
      const personalFansBefore = player.personalFans;
      const performanceStardom = gameRating === null ? 0 : gameRating >= 92 ? 5 : gameRating >= 84 ? 3 : gameRating >= 74 ? 1 : gameRating < 40 ? -1 : 0;
      const performanceFans = gameRating === null ? 0
        : gameRating >= 92 ? Math.round(1_800 + personalFansBefore * 0.08)
          : gameRating >= 84 ? Math.round(800 + personalFansBefore * 0.04)
            : gameRating >= 74 ? Math.round(250 + personalFansBefore * 0.015)
              : gameRating < 40 ? -Math.round(Math.max(50, personalFansBefore * 0.01))
                : 0;
      const mediaFans = action === "MEDIA_DAY" ? 900
        : action === "SOCIAL_MEDIA" ? Math.round(1_400 + personalFansBefore * 0.02)
          : action === "COMMUNITY_APPEARANCE" ? 650
            : 0;
      const mediaStardom = action === "MEDIA_DAY" ? 2 : action === "SOCIAL_MEDIA" ? 3 : action === "COMMUNITY_APPEARANCE" ? 1 : 0;
      const mediaConversion = action === "MEDIA_DAY" ? 0.3 : action === "SOCIAL_MEDIA" ? 0.15 : action === "COMMUNITY_APPEARANCE" ? 0.45 : 0.2;
      const performanceSchoolLift = Math.max(0, Math.round(performanceFans * 0.2));
      const mediaSchoolLift = Math.round(mediaFans * mediaConversion);
      const playerSchoolLift = performanceSchoolLift + mediaSchoolLift;
      const personalFanChange = Math.max(50, personalFansBefore + performanceFans + mediaFans) - personalFansBefore;

      player.stardom = clamp(stardomBefore + performanceStardom + mediaStardom, 0, 100);
      player.personalFans = personalFansBefore + personalFanChange;
      player.lastGameRating = gameRating;
      player.lastGameSummary = performanceSummary;
      player.fatigue = clamp(Number((player.fatigue + (action === "FOOTBALL_FOCUS" ? -1 : action === "SOCIAL_MEDIA" ? 2 : 1)).toFixed(1)), 0, 100);
      player.mediaAction = "FOOTBALL_FOCUS";
      schoolFanLift += playerSchoolLift;
      if (action === "MEDIA_DAY" || action === "COMMUNITY_APPEARANCE") localPressLift += 1;
      if (gameRating !== null && gameRating >= 95 && player.stardom >= 70) nationalPressLift += 2;

      if (gameRating !== null || action !== "FOOTBALL_FOCUS") {
        brandEvents.push({
          type: "PLAYER_BRAND_UPDATED",
          season: state.season,
          week: state.week,
          programId: program.id,
          playerId: player.id,
          gameRating,
          performanceSummary,
          mediaAction: action,
          stardomBefore,
          stardomAfter: player.stardom,
          stardomChange: player.stardom - stardomBefore,
          personalFansBefore,
          personalFansAfter: player.personalFans,
          personalFanChange,
          schoolFanLift: playerSchoolLift
        });
      }
    }

    const featured = [...brandEvents].sort((left, right) =>
      (right.gameRating ?? 0) - (left.gameRating ?? 0)
      || right.personalFanChange - left.personalFanChange
      || left.playerId.localeCompare(right.playerId)
    )[0];
    events.push(...brandEvents
      .filter((event) => event.mediaAction !== "FOOTBALL_FOCUS" || event.playerId === featured?.playerId)
      .sort((left, right) => right.personalFanChange - left.personalFanChange || left.playerId.localeCompare(right.playerId)));
    impactByProgram.set(program.id, {
      schoolFanLift,
      localPressLift,
      nationalPressLift,
      featuredPlayerId: featured?.playerId ?? null,
      featuredPlayerRating: featured?.gameRating ?? null
    });
  }
  return impactByProgram;
}

function buildDefaultDepthChart(state: Readonly<GameState>, programId: string): DepthChart {
  const positions: Position[] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
  return Object.fromEntries(positions.map((position) => [
    position,
    Object.values(state.players)
      .filter((player) =>
        player.programId === programId
        && player.position === position
        && player.eligibility.rosterStatus === "SCHOLARSHIP"
      )
      .sort((left, right) => right.overall - left.overall || left.id.localeCompare(right.id))
      .map((player) => player.id)
  ])) as DepthChart;
}

function repairDepthChart(state: GameState, programId: string): void {
  const fallback = buildDefaultDepthChart(state, programId);
  const current = state.depthCharts[programId] ?? fallback;
  for (const position of Object.keys(fallback) as Position[]) {
    const valid = new Set(fallback[position]);
    const retained = (current[position] ?? []).filter((playerId) => valid.has(playerId));
    const missing = fallback[position].filter((playerId) => !retained.includes(playerId));
    current[position] = [...retained, ...missing];
  }
  state.depthCharts[programId] = current;
}

export function activeDepthChart(state: Readonly<GameState>, programId: string): DepthChart {
  const chart = state.depthCharts[programId] ?? buildDefaultDepthChart(state, programId);
  return Object.fromEntries((Object.keys(chart) as Position[]).map((position) => [
    position,
    chart[position].filter((playerId) => {
      const player = state.players[playerId];
      return Boolean(
        player
        && player.programId === programId
        && player.position === position
        && player.eligibility.rosterStatus === "SCHOLARSHIP"
        && player.eligibility.redshirtStatus !== "REDSHIRTING"
        && player.injuryWeeksRemaining === 0
      );
    })
  ])) as DepthChart;
}

function activeLineup(state: Readonly<GameState>, programId: string): Player[] {
  const chart = activeDepthChart(state, programId);
  return (Object.keys(chart) as Position[]).flatMap((position) =>
    chart[position]
      .slice(0, STARTER_COUNTS[position])
      .map((playerId) => state.players[playerId])
      .filter((player): player is Player => Boolean(player))
  );
}

export function playerPerformanceSummary(line: Readonly<PlayerGameStatLine>): string {
  const result = line.result.toLowerCase();
  if (line.position === "QB") return `${line.passingCompletions}/${line.passingAttempts}, ${line.passingYards} pass yds · ${line.passingTouchdowns} TD, ${line.interceptionsThrown} INT · ${line.sacksTaken} sacked · ${line.gameRating} rating in ${result}`;
  if (line.position === "RB") return `${line.rushingAttempts} carries, ${line.rushingYards} rush yds · ${line.rushingTouchdowns} TD · ${line.gameRating} rating in ${result}`;
  if (line.position === "WR" || line.position === "TE") return `${line.receptions} rec, ${line.receivingYards} yds · ${line.receivingTouchdowns} TD · ${line.gameRating} rating in ${result}`;
  if (line.position === "OL") return `${line.snaps} snaps · ${line.blockingGrade} blocking grade · ${line.gameRating} rating in ${result}`;
  if (line.position === "DL" || line.position === "LB") return `${line.tackles} tackles · ${line.sacks} sacks · ${line.tacklesForLoss} TFL · ${line.gameRating} rating in ${result}`;
  if (line.position === "DB") return `${line.tackles} tackles · ${line.defensiveInterceptions} INT · ${line.passBreakups} PBU · ${line.gameRating} rating in ${result}`;
  if (line.position === "K") return `${line.fieldGoalsMade}/${line.fieldGoalsAttempted} field goals · ${line.gameRating} rating in ${result}`;
  return `${line.punts} punts · ${line.punts ? (line.puntYards / line.punts).toFixed(1) : "0.0"} avg · ${line.gameRating} rating in ${result}`;
}

function processWeeklyRecapsAndFinances(state: GameState, playerBrandImpact: ReadonlyMap<string, ProgramBrandImpact>, events: GameEvent[]): void {
  for (const program of Object.values(state.programs)) {
    const game = state.schedule.find((item) => item.week === state.week && (item.homeProgramId === program.id || item.awayProgramId === program.id));
    const homeGame = game?.homeProgramId === program.id;
    const opponentId = game ? (homeGame ? game.awayProgramId : game.homeProgramId) : null;
    const opponent = opponentId ? state.programs[opponentId]! : null;
    const opponentRank = game?.matchupType === "MARQUEE" && game.marqueeOpponentRank
      ? game.marqueeOpponentRank
      : opponent?.nationalRank ?? null;
    const scoreFor = game?.played ? (homeGame ? game.homeScore : game.awayScore) : null;
    const scoreAgainst = game?.played ? (homeGame ? game.awayScore : game.homeScore) : null;
    const result = scoreFor == null || scoreAgainst == null ? "BYE" : scoreFor > scoreAgainst ? "WIN" : "LOSS";
    const marqueeGame = game?.matchupType === "MARQUEE";
    const rankedOpponent = opponentRank !== null && opponentRank <= 25;
    const fansBefore = program.fanBase;
    const brandImpact = playerBrandImpact.get(program.id) ?? { schoolFanLift: 0, localPressLift: 0, nationalPressLift: 0, featuredPlayerId: null, featuredPlayerRating: null };
    let teamResultFanChange = 0;
    let localPressChange = brandImpact.localPressLift;
    let nationalPressChange = brandImpact.nationalPressLift;
    if (result === "WIN") {
      teamResultFanChange = Math.round(Math.max(450, fansBefore * 0.018));
      localPressChange += 6;
      if (rankedOpponent) {
        teamResultFanChange += Math.round(fansBefore * 0.025);
        nationalPressChange += 12;
      }
      if (marqueeGame) {
        teamResultFanChange += Math.round(fansBefore * 0.03);
        nationalPressChange += 10;
      }
    } else if (result === "LOSS") {
      teamResultFanChange = -Math.round(Math.max(125, fansBefore * (marqueeGame ? 0.003 : 0.006)));
      localPressChange += -2;
      nationalPressChange += marqueeGame ? -2 : rankedOpponent ? -1 : 0;
    }
    const fanChange = teamResultFanChange + brandImpact.schoolFanLift;
    program.fanBase = Math.max(5_000, program.fanBase + fanChange);
    program.fanSupport = clamp(Math.round(program.fanSupport + fanChange / Math.max(1, fansBefore) * 35), 1, 100);
    program.localPress = clamp(program.localPress + localPressChange, 0, 100);
    program.nationalPress = clamp(program.nationalPress + nationalPressChange, 0, 100);

    const capacity = stadiumCapacity(program.facilities.STADIUM);
    const opponentDraw = opponent ? opponent.fanBase * 0.045 + (rankedOpponent ? 5_000 : 0) + (marqueeGame ? 7_500 : 0) : 0;
    const attendance = homeGame && game?.played
      ? Math.round(clamp(fansBefore * 0.62 + opponentDraw, capacity * 0.35, capacity))
      : 0;
    const stadiumModifier = 1 + Math.max(0, program.facilities.STADIUM - 1) * 0.08;
    const ticketRevenue = Math.round(attendance * 44 * stadiumModifier);
    const concessionRevenue = Math.round(attendance * 17 * stadiumModifier);
    const revenue = program.weeklyRevenue + ticketRevenue + concessionRevenue;
    const staffPayroll = Object.values(state.staff).filter((staff) => staff.programId === program.id).reduce((sum, staff) => sum + staff.salary / 52, 0);
    const expenses = Math.round(program.weeklyExpenses + staffPayroll);
    const net = Math.round(revenue - expenses);
    program.budget += net;
    events.push({ type: "WEEKLY_FINANCES", season: state.season, week: state.week, programId: program.id, revenue: Math.round(revenue), expenses, net });
    events.push({
      type: "WEEKLY_RECAP",
      season: state.season,
      week: state.week,
      programId: program.id,
      result,
      opponentProgramId: opponentId,
      opponentRank,
      homeGame: Boolean(homeGame),
      marqueeGame,
      scoreFor,
      scoreAgainst,
      fansBefore,
      fansAfter: program.fanBase,
      fanChange,
      teamResultFanChange,
      playerFanLift: brandImpact.schoolFanLift,
      featuredPlayerId: brandImpact.featuredPlayerId,
      featuredPlayerRating: brandImpact.featuredPlayerRating,
      attendance,
      capacity,
      ticketRevenue,
      concessionRevenue,
      localPressChange,
      nationalPressChange,
      guaranteePaid: game?.guaranteePaid ?? 0,
      weeklyNet: net
    });
  }
}

function statTotal(lines: readonly PlayerGameStatLine[], field: keyof PlayerGameStatLine): number {
  return lines.reduce((total, line) => total + (typeof line[field] === "number" ? Number(line[field]) : 0), 0);
}

function playerProductionScore(position: Position, lines: readonly PlayerGameStatLine[]): number {
  if (position === "QB") {
    return clamp(statTotal(lines, "passingYards") / 38 + statTotal(lines, "passingTouchdowns") * 1.8 - statTotal(lines, "interceptionsThrown") * 1.8, 0, 100);
  }
  if (position === "RB") {
    return clamp(statTotal(lines, "rushingYards") / 18 + statTotal(lines, "rushingTouchdowns") * 3.2, 0, 100);
  }
  if (position === "WR" || position === "TE") {
    const yardDivisor = position === "TE" ? 12 : 16;
    return clamp(statTotal(lines, "receivingYards") / yardDivisor + statTotal(lines, "receivingTouchdowns") * 4, 0, 100);
  }
  if (position === "OL") {
    return clamp(statTotal(lines, "blockingGrade") / Math.max(1, lines.length), 0, 100);
  }
  if (position === "DL" || position === "LB" || position === "DB") {
    return clamp(
      statTotal(lines, "tackles") * 0.45
        + statTotal(lines, "tacklesForLoss") * 1.3
        + statTotal(lines, "sacks") * 4
        + statTotal(lines, "defensiveInterceptions") * 8
        + statTotal(lines, "passBreakups") * 1.2,
      0,
      100
    );
  }
  return 0;
}

function playerAwardEvidence(player: Readonly<Player>, lines: readonly PlayerGameStatLine[], averageRating: number, program: Readonly<Program>): string[] {
  let production: string;
  if (player.position === "QB") {
    production = `${statTotal(lines, "passingYards").toLocaleString()} pass YD · ${statTotal(lines, "passingTouchdowns")} TD · ${statTotal(lines, "interceptionsThrown")} INT`;
  } else if (player.position === "RB") {
    production = `${statTotal(lines, "rushingYards").toLocaleString()} rush YD · ${statTotal(lines, "rushingTouchdowns")} TD`;
  } else if (player.position === "WR" || player.position === "TE") {
    production = `${statTotal(lines, "receptions")} REC · ${statTotal(lines, "receivingYards").toLocaleString()} YD · ${statTotal(lines, "receivingTouchdowns")} TD`;
  } else if (player.position === "OL") {
    production = `${Math.round(statTotal(lines, "blockingGrade") / Math.max(1, lines.length))} average blocking grade`;
  } else {
    production = `${statTotal(lines, "tackles")} TKL · ${statTotal(lines, "tacklesForLoss")} TFL · ${statTotal(lines, "sacks")} SACK · ${statTotal(lines, "defensiveInterceptions")} INT`;
  }
  return [
    production,
    `${averageRating.toFixed(1)} average game rating across ${lines.length} games`,
    `${program.wins}–${program.losses} team record · #${program.nationalRank} nationally`
  ];
}

function playerAwardCandidate(state: Readonly<GameState>, player: Readonly<Player>): AwardCandidate | null {
  const lines = state.playerGameStats.filter((line) =>
    line.season === state.season && line.week <= 14 && line.playerId === player.id
  );
  const minimumGames = Math.min(6, Math.max(1, state.week - 1));
  if (lines.length < minimumGames || !player.programId) return null;
  const program = state.programs[player.programId];
  if (!program) return null;
  const performanceScore = lines.reduce((total, line) => total + line.gameRating, 0) / lines.length;
  const productionScore = playerProductionScore(player.position, lines);
  const teamSuccessScore = clamp(program.wins / 12 * 100, 0, 100);
  const visibilityScore = clamp(player.stardom * 0.65 + program.nationalPress * 0.35, 0, 100);
  const score = performanceScore * 0.38 + productionScore * 0.37 + teamSuccessScore * 0.17 + visibilityScore * 0.08;
  return {
    programId: program.id,
    playerId: player.id,
    staffId: null,
    score: Number(score.toFixed(1)),
    performanceScore: Number(performanceScore.toFixed(1)),
    productionScore: Number(productionScore.toFixed(1)),
    teamSuccessScore: Number(teamSuccessScore.toFixed(1)),
    visibilityScore: Number(visibilityScore.toFixed(1)),
    evidence: playerAwardEvidence(player, lines, performanceScore, program)
  };
}

function coachAwardCandidate(state: Readonly<GameState>, coach: Readonly<StaffMember>): AwardCandidate | null {
  const program = state.programs[coach.programId];
  if (!program || coach.role !== "HEAD_COACH") return null;
  const expectedWins = 3.5 + program.prestige * 0.07;
  const overachievement = program.wins - expectedWins;
  const performanceScore = clamp(program.wins / 12 * 100, 0, 100);
  const productionScore = clamp(50 + overachievement * 12, 0, 100);
  const teamSuccessScore = clamp(103 - program.nationalRank * 3, 0, 100);
  const visibilityScore = clamp(coach.rating * 0.65 + program.nationalPress * 0.35, 0, 100);
  const score = performanceScore * 0.4 + productionScore * 0.3 + teamSuccessScore * 0.2 + visibilityScore * 0.1;
  return {
    programId: program.id,
    playerId: null,
    staffId: coach.id,
    score: Number(score.toFixed(1)),
    performanceScore: Number(performanceScore.toFixed(1)),
    productionScore: Number(productionScore.toFixed(1)),
    teamSuccessScore: Number(teamSuccessScore.toFixed(1)),
    visibilityScore: Number(visibilityScore.toFixed(1)),
    evidence: [
      `${program.wins}–${program.losses} regular-season record`,
      `${overachievement >= 0 ? "+" : ""}${overachievement.toFixed(1)} wins versus program expectation`,
      `#${program.nationalRank} final regular-season ranking`
    ]
  };
}

export function seasonAwardRace(state: Readonly<GameState>, awardType: SeasonAwardType): AwardCandidate[] {
  const candidates = awardType === "COACH_OF_THE_YEAR"
    ? Object.values(state.staff).map((coach) => coachAwardCandidate(state, coach)).filter((candidate): candidate is AwardCandidate => candidate !== null)
    : Object.values(state.players)
      .filter((player) => {
        if (!player.programId || player.eligibility.rosterStatus !== "SCHOLARSHIP") return false;
        if (awardType === "OFFENSIVE_PLAYER_OF_THE_YEAR") return OFFENSIVE_POSITIONS.has(player.position);
        if (awardType === "DEFENSIVE_PLAYER_OF_THE_YEAR") return DEFENSIVE_POSITIONS.has(player.position);
        if (awardType === "FRESHMAN_OF_THE_YEAR") {
          return player.eligibility.seasonsParticipated === 0 && (OFFENSIVE_POSITIONS.has(player.position) || DEFENSIVE_POSITIONS.has(player.position));
        }
        return OFFENSIVE_POSITIONS.has(player.position) || DEFENSIVE_POSITIONS.has(player.position);
      })
      .map((player) => playerAwardCandidate(state, player))
      .filter((candidate): candidate is AwardCandidate => candidate !== null);
  return candidates.sort((left, right) => right.score - left.score || left.programId.localeCompare(right.programId));
}

function finalizeSeasonAwards(state: GameState, events: GameEvent[]): SeasonAward[] {
  const awards: SeasonAward[] = [];
  const finalistBoard = new Map(SEASON_AWARD_TYPES.map((awardType) => [
    awardType,
    seasonAwardRace(state, awardType).slice(0, 5)
  ]));
  for (const awardType of SEASON_AWARD_TYPES) {
    const finalists = finalistBoard.get(awardType) ?? [];
    const winner = finalists[0];
    if (!winner) continue;
    const effects = awardType === "PLAYER_OF_THE_YEAR"
      ? { playerFans: 40_000, playerStardom: 12, programFans: 12_000, prestige: 3, nationalPress: 9 }
      : awardType === "COACH_OF_THE_YEAR"
        ? { playerFans: 0, playerStardom: 0, programFans: 8_000, prestige: 3, nationalPress: 6 }
        : awardType === "FRESHMAN_OF_THE_YEAR"
          ? { playerFans: 12_000, playerStardom: 6, programFans: 4_000, prestige: 1, nationalPress: 3 }
          : { playerFans: 22_000, playerStardom: 8, programFans: 6_000, prestige: 2, nationalPress: 5 };
    const program = state.programs[winner.programId]!;
    if (winner.playerId) {
      const player = state.players[winner.playerId]!;
      player.personalFans += effects.playerFans;
      player.stardom = clamp(player.stardom + effects.playerStardom, 0, 100);
    }
    if (winner.staffId) program.coachSecurity = clamp(program.coachSecurity + 10, 0, 100);
    program.fanBase += effects.programFans;
    program.prestige = clamp(program.prestige + effects.prestige, 0, 100);
    program.nationalPress = clamp(program.nationalPress + effects.nationalPress, 0, 100);
    awards.push({ type: awardType, winner, finalists });
    events.push({
      type: "SEASON_AWARD_FINALIZED",
      season: state.season,
      awardType,
      programId: program.id,
      playerId: winner.playerId,
      staffId: winner.staffId,
      score: winner.score,
      playerFanGain: effects.playerFans,
      programFanGain: effects.programFans,
      prestigeGain: effects.prestige,
      nationalPressGain: effects.nationalPress
    });
  }
  return awards;
}

function divisionChampions(state: Readonly<GameState>): Partial<Record<DivisionId, string>> {
  const result: Partial<Record<DivisionId, string>> = {};
  const divisionIds = [...new Set(Object.values(state.programs).map((program) => program.divisionId))];
  for (const divisionId of divisionIds) {
    const contenders = Object.values(state.programs).filter((program) => program.divisionId === divisionId);
    const divisionRecord = (programId: string): { wins: number; losses: number } => {
      let wins = 0;
      let losses = 0;
      for (const game of state.schedule.filter((item) => item.played && item.matchupType === "DIVISION" && (item.homeProgramId === programId || item.awayProgramId === programId))) {
        const homeWon = game.homeScore! > game.awayScore!;
        const won = homeWon ? game.homeProgramId === programId : game.awayProgramId === programId;
        if (won) wins += 1;
        else losses += 1;
      }
      return { wins, losses };
    };
    contenders.sort((left, right) => {
      const leftDivision = divisionRecord(left.id);
      const rightDivision = divisionRecord(right.id);
      return rightDivision.wins - leftDivision.wins
        || leftDivision.losses - rightDivision.losses
        || right.wins - left.wins
        || left.losses - right.losses
        || left.nationalRank - right.nationalRank
        || left.id.localeCompare(right.id);
    });
    if (contenders[0]) result[divisionId] = contenders[0].id;
  }
  return result;
}

function buildPlayoffSeeds(state: Readonly<GameState>, champions: Readonly<Partial<Record<DivisionId, string>>>): PlayoffSeed[] {
  const championIds = new Set(Object.values(champions).filter((programId): programId is string => Boolean(programId)));
  const participantCount = Math.min(12, Object.keys(state.programs).length);
  const participants = [
    ...championIds,
    ...Object.values(state.programs)
      .sort((left, right) => left.nationalRank - right.nationalRank)
      .map((program) => program.id)
      .filter((programId) => !championIds.has(programId))
  ].slice(0, participantCount);
  return participants
    .sort((left, right) => state.programs[left]!.nationalRank - state.programs[right]!.nationalRank)
    .map((programId, index) => ({
      seed: index + 1,
      programId,
      qualification: championIds.has(programId) ? "DIVISION_CHAMPION" : "AT_LARGE"
    }));
}

function postseasonRound(participantCount: number): PostseasonRound {
  if (participantCount > 8) return "FIRST_ROUND";
  if (participantCount > 4) return "QUARTERFINAL";
  if (participantCount > 2) return "SEMIFINAL";
  return "NATIONAL_CHAMPIONSHIP";
}

function resolvePostseason(
  state: GameState,
  seeds: readonly PlayoffSeed[],
  events: GameEvent[]
): { games: PostseasonGame[]; championProgramId: string; runnerUpProgramId: string } {
  const rng = new AddressableRng(state.identity.rootSeed).fork("postseason", String(state.season));
  const games: PostseasonGame[] = [];
  let participants = seeds.map((seed) => ({ seed: seed.seed, programId: seed.programId }));
  let runnerUpProgramId = participants[1]?.programId ?? participants[0]!.programId;
  let gameIndex = 0;
  while (participants.length > 1) {
    const round = postseasonRound(participants.length);
    const byeCount = participants.length > 8 ? Math.max(0, 16 - participants.length) : participants.length % 2;
    const advancing = participants.slice(0, byeCount);
    const playing = participants.slice(byeCount);
    const paired: Array<{ seed: number; programId: string }> = [];
    for (let index = 0; index < Math.floor(playing.length / 2); index += 1) {
      const home = playing[index]!;
      const away = playing[playing.length - 1 - index]!;
      const gameId = `playoff:${state.season}:${gameIndex++}`;
      const homeField = round === "FIRST_ROUND";
      const gameRng = rng.fork(gameId);
      const scheduledGame = {
        id: gameId,
        week: round === "FIRST_ROUND" ? 15 : round === "QUARTERFINAL" ? 16 : round === "SEMIFINAL" ? 17 : 18,
        homeProgramId: home.programId,
        awayProgramId: away.programId,
        matchupType: "PLAYOFF" as const,
        guaranteePaid: 0,
        marqueeOpponentRank: null,
        played: true,
        homeScore: 0,
        awayScore: 0
      };
      const result = playGame(state, scheduledGame, home.programId, away.programId, gameRng, homeField);
      const homeScore = result.home.scoreline.points;
      const awayScore = result.away.scoreline.points;
      scheduledGame.homeScore = homeScore;
      scheduledGame.awayScore = awayScore;
      const winner = homeScore > awayScore ? home : away;
      const loser = homeScore > awayScore ? away : home;
      state.programs[winner.programId]!.wins += 1;
      state.programs[loser.programId]!.losses += 1;
      commitGameResult(state, scheduledGame, home.programId, away.programId, result, events);
      games.push({
        id: gameId,
        season: state.season,
        round,
        homeProgramId: home.programId,
        awayProgramId: away.programId,
        homeSeed: home.seed,
        awaySeed: away.seed,
        homeScore,
        awayScore,
        winnerProgramId: winner.programId
      });
      events.push({
        type: "PLAYOFF_GAME_COMPLETED",
        season: state.season,
        round,
        gameId,
        homeProgramId: home.programId,
        awayProgramId: away.programId,
        homeScore,
        awayScore,
        winnerProgramId: winner.programId
      });
      if (round === "NATIONAL_CHAMPIONSHIP") runnerUpProgramId = loser.programId;
      paired.push(winner);
    }
    participants = [...advancing, ...paired].sort((left, right) => left.seed - right.seed);
  }
  return { games, championProgramId: participants[0]!.programId, runnerUpProgramId };
}

function finalizeSeason(state: GameState, events: GameEvent[]): SeasonHistory {
  const awards = finalizeSeasonAwards(state, events);
  const champions = divisionChampions(state);
  for (const [divisionId, programId] of Object.entries(champions) as [DivisionId, string][]) {
    const program = state.programs[programId]!;
    program.fanBase += Math.round(program.fanBase * 0.03);
    program.prestige = clamp(program.prestige + 1, 0, 100);
    program.localPress = clamp(program.localPress + 6, 0, 100);
    program.nationalPress = clamp(program.nationalPress + 3, 0, 100);
    program.budget += 350_000;
    events.push({ type: "DIVISION_TITLE_WON", season: state.season, divisionId, programId });
  }
  const playoffSeeds = buildPlayoffSeeds(state, champions);
  for (const seed of playoffSeeds) {
    const program = state.programs[seed.programId]!;
    program.fanBase += Math.round(program.fanBase * 0.02);
    program.prestige = clamp(program.prestige + 1, 0, 100);
    program.nationalPress = clamp(program.nationalPress + 3, 0, 100);
    program.budget += 750_000;
  }
  const postseason = resolvePostseason(state, playoffSeeds, events);
  const champion = state.programs[postseason.championProgramId]!;
  const runnerUp = state.programs[postseason.runnerUpProgramId]!;
  const fanGain = Math.round(champion.fanBase * 0.18);
  champion.fanBase += fanGain;
  champion.championships += 1;
  champion.prestige = clamp(champion.prestige + 10, 0, 100);
  champion.localPress = clamp(champion.localPress + 15, 0, 100);
  champion.nationalPress = clamp(champion.nationalPress + 20, 0, 100);
  champion.coachSecurity = clamp(champion.coachSecurity + 20, 0, 100);
  champion.budget += 6_000_000;
  runnerUp.fanBase += Math.round(runnerUp.fanBase * 0.08);
  runnerUp.prestige = clamp(runnerUp.prestige + 4, 0, 100);
  runnerUp.nationalPress = clamp(runnerUp.nationalPress + 10, 0, 100);
  runnerUp.budget += 2_000_000;
  const priorRankings = Object.values(state.programs).sort((left, right) => left.nationalRank - right.nationalRank);
  const finalRanking = [champion, runnerUp, ...priorRankings.filter((program) => program.id !== champion.id && program.id !== runnerUp.id)];
  finalRanking.forEach((program, index) => { program.nationalRank = index + 1; });
  events.push({
    type: "NATIONAL_CHAMPION_CROWNED",
    season: state.season,
    championProgramId: champion.id,
    runnerUpProgramId: runnerUp.id,
    fanGain,
    prestigeGain: 10,
    nationalPressGain: 20,
    revenueGain: 6_000_000
  });
  const history: SeasonHistory = {
    season: state.season,
    awards,
    divisionChampions: champions,
    playoffSeeds,
    postseasonGames: postseason.games,
    nationalChampionProgramId: champion.id,
    nationalRunnerUpProgramId: runnerUp.id,
    finalRecords: Object.fromEntries(Object.values(state.programs).map((program) => [
      program.id,
      { wins: program.wins, losses: program.losses, nationalRank: program.nationalRank }
    ]))
  };
  state.seasonHistory ??= [];
  state.seasonHistory.push(history);
  return history;
}

function updateNationalRankings(state: GameState): void {
  const ranked = Object.values(state.programs).sort((left, right) => {
    const leftScore = left.wins * 14 - left.losses * 5 + left.prestige * 0.55 + teamStrength(state, left) * 0.35;
    const rightScore = right.wins * 14 - right.losses * 5 + right.prestige * 0.55 + teamStrength(state, right) * 0.35;
    return rightScore - leftScore || left.id.localeCompare(right.id);
  });
  ranked.forEach((program, index) => { program.nationalRank = index + 1; });
}

function rolloverSeason(state: GameState, events: GameEvent[]): void {
  finalizeSeason(state, events);
  const portalRng = new AddressableRng(state.identity.rootSeed).fork("portal", String(state.season));
  for (const player of Object.values(state.players)) {
    if (player.programId === null || player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    const preservedRedshirt = player.eligibility.redshirtStatus === "REDSHIRTING"
      && player.eligibility.gamesPlayedThisSeason <= 4;
    player.eligibility.seasonsEnrolled += 1;
    if (preservedRedshirt) {
      player.eligibility.redshirtStatus = "USED";
    } else {
      player.eligibility.seasonsParticipated += 1;
      player.eligibility.seasonsRemaining -= 1;
      if (player.eligibility.redshirtStatus === "REDSHIRTING") player.eligibility.redshirtStatus = "USED";
    }
    player.eligibility.gamesPlayedThisSeason = 0;
    player.fatigue = 0;
    player.injuryWeeksRemaining = 0;
    if (player.eligibility.seasonsRemaining <= 0) {
      player.eligibility.rosterStatus = "GRADUATED";
      events.push({ type: "PLAYER_DEPARTED", season: state.season, playerId: player.id, reason: "ELIGIBILITY_EXHAUSTED" });
      continue;
    }
    const program = state.programs[player.programId]!;
    const academicProtection = Math.max(0, program.facilities.ACADEMICS - 1) * 0.015;
    const playingTimePressure = player.overall > teamStrength(state, program) + 4 ? 0.02 : 0;
    const transferRisk = clamp(0.08 + playingTimePressure - academicProtection, 0.01, 0.12);
    if (portalRng.at(`${player.id}:transfer`) < transferRisk) {
      player.eligibility.rosterStatus = "PORTAL";
      events.push({ type: "PLAYER_DEPARTED", season: state.season, playerId: player.id, reason: "TRANSFER_PORTAL" });
    }
  }
  for (const program of Object.values(state.programs)) {
    const commitments = Object.values(state.prospects)
      .filter((prospect) => prospect.status === "COMMITTED" && prospect.signedProgramId === program.id)
      .sort((left, right) => {
        const leftPoints = state.recruiting[program.id]?.scoutingByProspect[left.id]?.pursuitPoints ?? 0;
        const rightPoints = state.recruiting[program.id]?.scoutingByProspect[right.id]?.pursuitPoints ?? 0;
        return rightPoints - leftPoints || right.potential - left.potential || left.id.localeCompare(right.id);
      });
    for (const prospect of commitments) {
      const scholarships = Object.values(state.players).filter((player) =>
        player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP"
      ).length;
      if (scholarships >= program.scholarshipLimit) break;
      const playerId = `player:${prospect.id}`;
      state.players[playerId] = prospectToPlayer(prospect, playerId, program.id, state.season + 1);
      prospect.status = "ENROLLED";
      events.push({ type: "PROSPECT_ENROLLED", season: state.season + 1, prospectId: prospect.id, playerId, programId: program.id });
    }
    repairDepthChart(state, program.id);
  }
  for (const prospect of Object.values(state.prospects)) {
    if (prospect.status === "AVAILABLE") prospect.status = "WITHDRAWN";
  }
  state.season += 1; state.week = 1;
  for (const program of Object.values(state.programs)) { program.wins = 0; program.losses = 0; }
  const programCount = Object.keys(state.programs).length;
  const nameRng = new AddressableRng(state.identity.rootSeed).fork("league-generation", "fictional-names");
  const firstNameOffset = Math.floor(nameRng.between("first-offset", 0, 96));
  const lastNameOffset = Math.floor(nameRng.between("last-offset", 0, 160));
  const initialPeople = programCount * (STARTING_ROSTER_SIZE + STAFF_ROLES.length + 30);
  const seasonOffset = Math.max(0, state.season - 2028) * programCount * 15;
  generateProspects(state, new AddressableRng(state.identity.rootSeed).fork("recruiting-cohort", String(state.season)), programCount * 15, String(state.season), initialPeople + seasonOffset, firstNameOffset, lastNameOffset);
  initializeRecruitingBoards(state, new AddressableRng(state.identity.rootSeed).fork("recruiting-boards", String(state.season)));
  for (const program of Object.values(state.programs)) {
    const recruiting = state.recruiting[program.id]!;
    recruiting.weeklyPoints = recruitingWeeklyPoints(state, program.id);
    recruiting.points = recruiting.weeklyPoints;
  }
  buildSeasonSchedule(state);
}
