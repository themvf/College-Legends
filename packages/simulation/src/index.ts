import type { DepthChart, DevelopmentFocus, DivisionId, FacilityType, GameCommand, GameEvent, GameState, Player, PlayerGameStatLine, PlayerMediaAction, PlayerRating, PlayerRatings, Position, Program, Prospect, ProspectScoutingState, RecruitPriority, RecruitingEvaluation, RecruitingProgramState, RecruitingSearchType, SimulationResult, StaffAssignment, StaffMember, StaffRole } from "@college-legends/model";
import { FICTIONAL_PROGRAMS, fictionalPersonName } from "@college-legends/content";
import { AddressableRng } from "./rng.js";

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
const STARTER_COUNTS: Readonly<Record<Position, number>> = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, DB: 4, K: 1, P: 1 };

export interface StatisticalBand {
  mean: number;
  standardDeviation: number;
  minimum: number;
  maximum: number;
}

/**
 * Calibrated against qualifying FBS player leader samples from 2021-25.
 * Bounded normal draws create recognizable college-football stat lines while
 * ratings, depth-chart role, opponent strength, and score shift the center.
 */
export const PLAYER_STAT_BANDS = {
  qbAttempts: { mean: 31, standardDeviation: 7, minimum: 12, maximum: 52 },
  qbCompletionRate: { mean: 0.64, standardDeviation: 0.055, minimum: 0.42, maximum: 0.82 },
  qbYardsPerAttempt: { mean: 7.5, standardDeviation: 1.35, minimum: 3.8, maximum: 12.5 },
  rbCarries: { mean: 15, standardDeviation: 5.5, minimum: 4, maximum: 30 },
  rbYardsPerCarry: { mean: 4.8, standardDeviation: 1.25, minimum: 1.5, maximum: 9.5 },
  wrTargets: { mean: 7, standardDeviation: 2.8, minimum: 1, maximum: 15 },
  teTargets: { mean: 5, standardDeviation: 2.2, minimum: 1, maximum: 12 },
  catchRate: { mean: 0.64, standardDeviation: 0.09, minimum: 0.35, maximum: 0.9 },
  yardsPerReception: { mean: 12.6, standardDeviation: 3.2, minimum: 5, maximum: 24 },
  dlTackles: { mean: 4.2, standardDeviation: 2, minimum: 0, maximum: 12 },
  lbTackles: { mean: 7.1, standardDeviation: 2.7, minimum: 1, maximum: 16 },
  dbTackles: { mean: 5.2, standardDeviation: 2.4, minimum: 0, maximum: 14 },
  punts: { mean: 4.2, standardDeviation: 1.6, minimum: 1, maximum: 9 },
  puntAverage: { mean: 42.5, standardDeviation: 3.8, minimum: 31, maximum: 55 }
} as const satisfies Record<string, StatisticalBand>;
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

export function projectedDevelopmentPayoff(state: Readonly<GameState>, player: Readonly<Player>, focus: DevelopmentFocus = player.developmentFocus): DevelopmentPayoff {
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
      (Object.entries(payoff.ratingChanges) as [PlayerRating, number][]).map(([rating, change]) => [rating, Number((change * scale).toFixed(2))])
    )
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
    tradeoff: "+1 fatigue; only one Media Day slot per program"
  },
  SOCIAL_MEDIA: {
    personalFans: "+1,400 plus 2% of current personal fans",
    stardom: "+3 stardom",
    schoolConversion: "15% of new fans join the school fan base",
    tradeoff: "+2 fatigue; builds the player brand more than the school"
  },
  COMMUNITY_APPEARANCE: {
    personalFans: "+650 personal fans",
    stardom: "+1 stardom",
    schoolConversion: "45% of new fans join the school fan base",
    tradeoff: "+1 fatigue; strongest school-fan conversion"
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
    identity: { rootSeed, balanceConfiguration: { version: "0.1.0", weeklyDevelopment: { base: 0.012, coachWeight: 0.018, workEthicWeight: 0.022, fatigueFloor: 0.62, maximum: 0.09 }, game: { possessions: 24, homeFieldAdvantage: 1.8, upsetNoise: 11 } }, simulationVersion: "0.1.0" },
    season: 2027, week: 0, phase: "ROSTER_REVIEW", programs: {}, players: {}, prospects: {}, recruiting: {}, staff: {}, depthCharts: {}, playerGameStats: [], schedule: [], eventHistory: []
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
  const mediaDayWinnerByProgram = new Map<string, string>();
  const orderedCommands = [...commands].sort((left, right) => commandArbitrationKey(left).localeCompare(commandArbitrationKey(right)));
  for (const command of orderedCommands) {
    if (command.type !== "SET_PLAYER_MEDIA_ACTION" || command.action !== "MEDIA_DAY") continue;
    const current = mediaDayWinnerByProgram.get(command.programId);
    if (!current || command.playerId < current) mediaDayWinnerByProgram.set(command.programId, command.playerId);
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
    const player = state.players[command.playerId];
    if (!player || player.programId !== program.id) {
      events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Command is not valid for this roster." });
      continue;
    }
    if (command.type === "SET_DEVELOPMENT_FOCUS") {
      player.developmentFocus = command.focus;
      events.push({ type: "DEVELOPMENT_FOCUS_SET", season: state.season, week: state.week, programId: program.id, playerId: player.id, focus: command.focus });
      continue;
    }
    if (command.type === "SET_PLAYER_MEDIA_ACTION") {
      if (command.action === "MEDIA_DAY" && mediaDayWinnerByProgram.get(program.id) !== player.id) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Each program has only one player Media Day slot per week." });
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

function developPlayers(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  const rules = state.identity.balanceConfiguration.weeklyDevelopment;
  for (const player of Object.values(state.players)) {
    if (player.programId === null || player.eligibility.rosterStatus !== "SCHOLARSHIP" || player.overall >= player.potential || player.injuryWeeksRemaining > 0) continue;
    const fatigueModifier = clamp(1 - player.fatigue / 180, rules.fatigueFloor, 1);
    const program = state.programs[player.programId]!;
    const trainingModifier = 1 + Math.max(0, program.facilities.TRAINING - 1) * 0.04;
    const developmentCoaches = Object.values(state.staff).filter((staff) => staff.programId === program.id && staff.assignment === "PLAYER_DEVELOPMENT");
    const coachingModifier = 1 + developmentCoaches.reduce((sum, staff) => sum + staff.rating / 500, 0);
    const focus = projectedDevelopmentPayoff(state, player);
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

function teamStrength(state: GameState, program: Program): number {
  const lineup = activeLineup(state, program.id);
  if (lineup.length === 0) return 40;
  const playerStrength = lineup.reduce((sum, player) => {
    const armBonus = player.position === "QB" ? (player.ratings.armStrength - player.overall) * 0.1 : 0;
    const attributeBonus = (player.ratings.technique - player.overall) * 0.1
      + (player.ratings.strength - player.overall) * 0.07
      + (player.ratings.conditioning - player.overall) * 0.06;
    return sum + player.overall + armBonus + attributeBonus - player.fatigue * 0.015;
  }, 0) / lineup.length;
  const gamePrepBonus = Object.values(state.staff)
    .filter((staff) => staff.programId === program.id && staff.assignment === "GAME_PREP")
    .reduce((total, staff) => total + gamePrepContribution(staff), 0);
  return playerStrength + gamePrepBonus;
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

function boundedNormal(rng: AddressableRng, path: string, band: StatisticalBand, meanShift = 0): number {
  const first = Math.max(0.000001, rng.at(`${path}:normal-a`));
  const second = rng.at(`${path}:normal-b`);
  const standardNormal = Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  return clamp(band.mean + meanShift + standardNormal * band.standardDeviation, band.minimum, band.maximum);
}

function emptyStatLine(
  state: Readonly<GameState>,
  game: Readonly<GameState["schedule"][number]>,
  player: Readonly<Player>,
  programId: string,
  opponentProgramId: string,
  result: "WIN" | "LOSS"
): PlayerGameStatLine {
  return {
    id: `stats:${game.id}:${player.id}`,
    season: state.season,
    week: state.week,
    gameId: game.id,
    playerId: player.id,
    programId,
    opponentProgramId,
    position: player.position,
    started: true,
    result,
    gameRating: 50,
    snaps: 0,
    passingAttempts: 0,
    passingCompletions: 0,
    passingYards: 0,
    passingTouchdowns: 0,
    interceptionsThrown: 0,
    rushingAttempts: 0,
    rushingYards: 0,
    rushingTouchdowns: 0,
    targets: 0,
    receptions: 0,
    receivingYards: 0,
    receivingTouchdowns: 0,
    tackles: 0,
    tacklesForLoss: 0,
    sacks: 0,
    defensiveInterceptions: 0,
    passBreakups: 0,
    fieldGoalsAttempted: 0,
    fieldGoalsMade: 0,
    punts: 0,
    puntYards: 0,
    blockingGrade: 0
  };
}

function recordPlayerGameStats(
  state: GameState,
  game: Readonly<GameState["schedule"][number]>,
  programId: string,
  opponentProgramId: string,
  scoreFor: number,
  scoreAgainst: number,
  rng: AddressableRng
): void {
  const lineup = activeLineup(state, programId);
  const byPosition = (position: Position): Player[] => lineup.filter((player) => player.position === position);
  const won = scoreFor > scoreAgainst;
  const result = won ? "WIN" : "LOSS";
  const opponentStrength = teamStrength(state, state.programs[opponentProgramId]!);
  const totalTouchdowns = Math.floor(scoreFor / 7);
  const lines = new Map(lineup.map((player) => [player.id, emptyStatLine(state, game, player, programId, opponentProgramId, result)]));
  const baseSnaps = Math.round(clamp(boundedNormal(rng, "team-snaps", { mean: 68, standardDeviation: 8, minimum: 48, maximum: 92 }), 48, 92));

  const quarterback = byPosition("QB")[0];
  if (quarterback) {
    const ratingEdge = (quarterback.ratings.technique + quarterback.ratings.armStrength) / 2 - opponentStrength;
    const attempts = Math.round(boundedNormal(rng, `${quarterback.id}:attempts`, PLAYER_STAT_BANDS.qbAttempts, (scoreAgainst - scoreFor) * 0.12));
    const completionRate = boundedNormal(rng, `${quarterback.id}:completion-rate`, PLAYER_STAT_BANDS.qbCompletionRate, ratingEdge * 0.0022);
    const yardsPerAttempt = boundedNormal(rng, `${quarterback.id}:ypa`, PLAYER_STAT_BANDS.qbYardsPerAttempt, ratingEdge * 0.035);
    const completions = clamp(Math.round(attempts * completionRate), 0, attempts);
    const passingYards = Math.max(0, Math.round(attempts * yardsPerAttempt));
    const passingTouchdowns = clamp(Math.round(totalTouchdowns * boundedNormal(rng, `${quarterback.id}:td-share`, { mean: 0.68, standardDeviation: 0.18, minimum: 0.2, maximum: 1 })), 0, totalTouchdowns);
    const interceptionPressure = clamp(0.9 + (opponentStrength - quarterback.ratings.technique) * 0.045, 0.2, 2.3);
    const interceptionsThrown = Math.round(boundedNormal(rng, `${quarterback.id}:interceptions`, { mean: interceptionPressure, standardDeviation: 0.75, minimum: 0, maximum: 4 }));
    const line = lines.get(quarterback.id)!;
    Object.assign(line, {
      snaps: baseSnaps,
      passingAttempts: attempts,
      passingCompletions: completions,
      passingYards,
      passingTouchdowns,
      interceptionsThrown,
      rushingAttempts: Math.round(boundedNormal(rng, `${quarterback.id}:rush-attempts`, { mean: 5, standardDeviation: 3, minimum: 0, maximum: 16 })),
      rushingYards: Math.round(boundedNormal(rng, `${quarterback.id}:rush-yards`, { mean: 18, standardDeviation: 24, minimum: -20, maximum: 120 }))
    });
    line.gameRating = Math.round(clamp(
      48 + completionRate * 28 + (yardsPerAttempt - 6) * 3 + passingTouchdowns * 3 - interceptionsThrown * 5 + (won ? 4 : -2)
        + (quarterback.mediaAction === "FOOTBALL_FOCUS" ? 2 : 0),
      25,
      99
    ));

    const receivers = [...byPosition("WR"), ...byPosition("TE")];
    const targetWeights = receivers.map((receiver, index) => {
      const base = receiver.position === "TE" ? PLAYER_STAT_BANDS.teTargets.mean : PLAYER_STAT_BANDS.wrTargets.mean;
      return Math.max(0.5, base + (receiver.overall - 70) * 0.08 - index * 0.65 + rng.between(`${receiver.id}:target-weight`, -1.2, 1.2));
    });
    const totalWeight = targetWeights.reduce((sum, weight) => sum + weight, 0);
    let receptionsAssigned = 0;
    let yardsAssigned = 0;
    receivers.forEach((receiver, index) => {
      const share = targetWeights[index]! / Math.max(1, totalWeight);
      const targets = index === receivers.length - 1
        ? Math.max(0, attempts - receivers.slice(0, -1).reduce((sum, item) => sum + (lines.get(item.id)?.targets ?? 0), 0))
        : Math.max(1, Math.round(attempts * share));
      const receptions = index === receivers.length - 1
        ? clamp(completions - receptionsAssigned, 0, targets)
        : clamp(Math.round(completions * share), 0, targets);
      const receivingYards = index === receivers.length - 1
        ? Math.max(0, passingYards - yardsAssigned)
        : Math.max(0, Math.round(passingYards * share));
      const receivingTouchdowns = clamp(Math.round(passingTouchdowns * share), 0, passingTouchdowns);
      receptionsAssigned += receptions;
      yardsAssigned += receivingYards;
      const line = lines.get(receiver.id)!;
      Object.assign(line, { snaps: Math.round(baseSnaps * 0.78), targets, receptions, receivingYards, receivingTouchdowns });
      line.gameRating = Math.round(clamp(
        45 + receptions * 2.2 + receivingYards * 0.2 + receivingTouchdowns * 7 + (won ? 3 : 0)
          + (receiver.overall - opponentStrength) * 0.25 + (receiver.mediaAction === "FOOTBALL_FOCUS" ? 2 : 0),
        25,
        99
      ));
    });
  }

  const runningBack = byPosition("RB")[0];
  if (runningBack) {
    const edge = runningBack.ratings.strength * 0.45 + runningBack.ratings.technique * 0.55 - opponentStrength;
    const attempts = Math.round(boundedNormal(rng, `${runningBack.id}:carries`, PLAYER_STAT_BANDS.rbCarries, (scoreFor - scoreAgainst) * 0.1));
    const yardsPerCarry = boundedNormal(rng, `${runningBack.id}:ypc`, PLAYER_STAT_BANDS.rbYardsPerCarry, edge * 0.035);
    const rushingYards = Math.max(0, Math.round(attempts * yardsPerCarry));
    const quarterbackLine = quarterback ? lines.get(quarterback.id) : undefined;
    const rushingTouchdowns = Math.max(0, totalTouchdowns - (quarterbackLine?.passingTouchdowns ?? 0));
    const line = lines.get(runningBack.id)!;
    Object.assign(line, { snaps: Math.round(baseSnaps * 0.68), rushingAttempts: attempts, rushingYards, rushingTouchdowns });
    line.gameRating = Math.round(clamp(
      45 + rushingYards * 0.24 + rushingTouchdowns * 8 + (won ? 4 : 0) + edge * 0.22
        + (runningBack.mediaAction === "FOOTBALL_FOCUS" ? 2 : 0),
      25,
      99
    ));
  }

  for (const lineman of byPosition("OL")) {
    const line = lines.get(lineman.id)!;
    line.snaps = baseSnaps;
    line.blockingGrade = Math.round(clamp(
      boundedNormal(rng, `${lineman.id}:blocking`, { mean: 68, standardDeviation: 9, minimum: 35, maximum: 95 }, (lineman.ratings.technique + lineman.ratings.strength - opponentStrength * 2) * 0.16 + (won ? 3 : -2)),
      35,
      95
    ));
    line.gameRating = Math.round(clamp(line.blockingGrade + (lineman.mediaAction === "FOOTBALL_FOCUS" ? 2 : 0), 25, 99));
  }

  for (const defender of [...byPosition("DL"), ...byPosition("LB"), ...byPosition("DB")]) {
    const tackleBand = defender.position === "DL" ? PLAYER_STAT_BANDS.dlTackles : defender.position === "LB" ? PLAYER_STAT_BANDS.lbTackles : PLAYER_STAT_BANDS.dbTackles;
    const edge = defender.overall - opponentStrength;
    const tackles = Math.round(boundedNormal(rng, `${defender.id}:tackles`, tackleBand, edge * 0.04));
    const sacks = defender.position === "DB" ? 0 : Math.round(boundedNormal(rng, `${defender.id}:sacks`, { mean: defender.position === "DL" ? 0.45 : 0.25, standardDeviation: 0.55, minimum: 0, maximum: 3 }, edge * 0.012));
    const defensiveInterceptions = defender.position === "DB" && rng.at(`${defender.id}:defensive-int`) < clamp(0.1 + edge * 0.003, 0.03, 0.22) ? 1 : 0;
    const passBreakups = defender.position === "DB" ? Math.round(boundedNormal(rng, `${defender.id}:pbu`, { mean: 0.9, standardDeviation: 0.9, minimum: 0, maximum: 4 }, edge * 0.02)) : 0;
    const tacklesForLoss = Math.min(tackles, sacks + Math.round(boundedNormal(rng, `${defender.id}:tfl`, { mean: defender.position === "DL" ? 0.8 : 0.45, standardDeviation: 0.7, minimum: 0, maximum: 4 })));
    const line = lines.get(defender.id)!;
    Object.assign(line, { snaps: Math.round(baseSnaps * 0.82), tackles, tacklesForLoss, sacks, defensiveInterceptions, passBreakups });
    line.gameRating = Math.round(clamp(
      45 + tackles * 2.6 + tacklesForLoss * 3 + sacks * 7 + defensiveInterceptions * 12 + passBreakups * 3 + (won ? 3 : 0)
        + (defender.mediaAction === "FOOTBALL_FOCUS" ? 2 : 0),
      25,
      99
    ));
  }

  const kicker = byPosition("K")[0];
  if (kicker) {
    const attempts = Math.round(boundedNormal(rng, `${kicker.id}:fg-attempts`, { mean: 1.5, standardDeviation: 1, minimum: 0, maximum: 5 }, scoreFor % 7 === 3 ? 0.5 : 0));
    const accuracy = clamp(0.68 + (kicker.ratings.technique - 60) * 0.006, 0.55, 0.94);
    const made = Array.from({ length: attempts }).filter((_, index) => rng.at(`${kicker.id}:fg:${index}`) < accuracy).length;
    const line = lines.get(kicker.id)!;
    Object.assign(line, { snaps: attempts + totalTouchdowns, fieldGoalsAttempted: attempts, fieldGoalsMade: made });
    line.gameRating = Math.round(clamp(48 + made * 12 - (attempts - made) * 8 + (won ? 4 : 0), 25, 99));
  }

  const punter = byPosition("P")[0];
  if (punter) {
    const punts = Math.round(boundedNormal(rng, `${punter.id}:punts`, PLAYER_STAT_BANDS.punts, Math.max(0, scoreAgainst - scoreFor) * 0.04));
    const average = boundedNormal(rng, `${punter.id}:punt-average`, PLAYER_STAT_BANDS.puntAverage, (punter.ratings.technique - 70) * 0.08);
    const line = lines.get(punter.id)!;
    Object.assign(line, { snaps: punts, punts, puntYards: Math.round(punts * average) });
    line.gameRating = Math.round(clamp(42 + average + (won ? 2 : 0), 25, 99));
  }

  for (const line of lines.values()) {
    state.playerGameStats.push(line);
    const player = state.players[line.playerId]!;
    player.eligibility.gamesPlayedThisSeason += 1;
    player.lastGameRating = line.gameRating;
    player.lastGameSummary = playerPerformanceSummary(line);
  }
}

function resolveScheduledGames(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  for (const game of state.schedule.filter((item) => !item.played && state.week === item.week)) {
    const home = state.programs[game.homeProgramId]; const away = state.programs[game.awayProgramId];
    if (!home || !away) continue;
    const homeStrength = teamStrength(state, home) + state.identity.balanceConfiguration.game.homeFieldAdvantage;
    const awayStrength = teamStrength(state, away);
    const score = (strength: number, opponent: number, side: string): number => {
      let points = 0;
      for (let possession = 0; possession < state.identity.balanceConfiguration.game.possessions; possession += 1) {
        const chance = clamp(0.23 + (strength - opponent) / 150 + rng.between(`${game.id}:${side}:${possession}`, -0.08, 0.08), 0.05, 0.55);
        if (rng.at(`${game.id}:${side}:result:${possession}`) < chance) points += rng.at(`${game.id}:${side}:td:${possession}`) < 0.66 ? 7 : 3;
      }
      return points;
    };
    let homeScore = score(homeStrength, awayStrength, "home"); let awayScore = score(awayStrength, homeStrength, "away");
    if (homeScore === awayScore) homeScore += rng.at(`${game.id}:overtime`) < 0.5 ? 3 : 0, awayScore += homeScore === awayScore ? 3 : 0;
    game.played = true;
    game.homeScore = homeScore;
    game.awayScore = awayScore;
    if (homeScore > awayScore) { home.wins += 1; away.losses += 1; } else { away.wins += 1; home.losses += 1; }
    recordPlayerGameStats(state, game, home.id, away.id, homeScore, awayScore, rng.fork(game.id, "home-stats"));
    recordPlayerGameStats(state, game, away.id, home.id, awayScore, homeScore, rng.fork(game.id, "away-stats"));
    events.push({ type: "GAME_COMPLETED", season: state.season, week: state.week, gameId: game.id, homeProgramId: home.id, awayProgramId: away.id, homeScore, awayScore });
  }
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
  if (line.position === "QB") return `${line.passingCompletions}/${line.passingAttempts}, ${line.passingYards} pass yds · ${line.passingTouchdowns} TD, ${line.interceptionsThrown} INT · ${line.gameRating} rating in ${result}`;
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

function updateNationalRankings(state: GameState): void {
  const ranked = Object.values(state.programs).sort((left, right) => {
    const leftScore = left.wins * 14 - left.losses * 5 + left.prestige * 0.55 + teamStrength(state, left) * 0.35;
    const rightScore = right.wins * 14 - right.losses * 5 + right.prestige * 0.55 + teamStrength(state, right) * 0.35;
    return rightScore - leftScore || left.id.localeCompare(right.id);
  });
  ranked.forEach((program, index) => { program.nationalRank = index + 1; });
}

function rolloverSeason(state: GameState, events: GameEvent[]): void {
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
