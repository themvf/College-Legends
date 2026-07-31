import type { WeekFocus, AwardCandidate, DecisionAlert, DefensiveIdentity, DepthChart, GamePlan, MatchupOutcome, OffensiveIdentity, OpponentScoutingReport, SchemeIdentity, ScoutingTier, TeamUnit, TeamUnitRatings, DevelopmentFocus, DivisionId, FacilityType, GameCommand, GameEvent, GameState, Player, PlayerGameStatLine, PlayerMediaAction, PlayerRating, PlayerRatings, PlayoffSeed, Position, PostseasonGame, PostseasonRound, Program, Prospect, ProspectScoutingState, RecruitPriority, RecruitingEvaluation, RecruitingProgramState, RecruitingSearchType, SeasonAward, SeasonAwardType, SeasonHistory, SimulationResult, StaffFocus, StaffMember, StaffRole, OpponentDossier } from "@college-legends/model";
import { DEFAULT_BALANCE, FICTIONAL_PROGRAMS, fictionalPersonName, PROGRAM_CHARACTERS } from "@college-legends/content";
import { AddressableRng } from "./rng.js";
import { attributeByRole, attributesFor, computeOverall, ratingByRole, type AttributeDefinition } from "./attributes.js";
import { weeklyBriefing as buildBriefing, type BriefingItem } from "./briefing.js";
import { OFFENSIVE_SCHEMES, DEFENSIVE_SCHEMES, bestSchemeFor, programRoster, coachSchemeFit, schemePersonnel } from "./scheme.js";
import { DEFENSIVE_SPOTS, MINIMUM_SNAP_SHARE, OFFENSIVE_SPOTS, personnelLabel, schemeSpots, snapShares, spotsForRoom } from "./rotation.js";
import { DEFAULT_GAME_PLAN, IDENTITY_BASE_DEFENSE, IDENTITY_BASE_PLAN, OFFENSIVE_IDENTITY_LABELS, overallStrength, projectUnitEdges, resolveGame, unitRatingsFromLineup, type GameResult, type TeamSide, type UnitEdge } from "./game.js";
import { MAXIMUM_PRACTICE_HOURS, opponentScoutingReport, preparationWeeklyPoints, projectedGamePlan, scheduledOpponent, scoutingConfidence, filmGamesAvailable } from "./scouting.js";
import {
  allocatedTotal,
  defaultAllocation,
  dossierTiers,
  emptyAllocation,
  distributeWeekHours,
  focusShare,
  readinessNote,
  focusWeight,
  pickStaffTrait,
  weekAllocation,
  scoutingReadiness,
  READINESS_CAP,
  rebalanceAllocation,
  roleFit,
  scoutingDepartmentSummary,
  staffCapacity,
  staffContribution,
  staffSkills,
  programStrengthCoachBenefits,
  STAFF_FOCUSES,
  upcomingDossiers,
  weeklyScoutingOutput,
  WORTH_SCOUTING
} from "./department.js";
import { advertisingReach, DEFENSIVE_PRESETS, developmentCandidates, fairTicketPrice, matchingPreset, MAXIMUM_TICKET_PRICE, MAXIMUM_WEEKLY_ADVERTISING, MINIMUM_TICKET_PRICE, OFFENSIVE_PRESETS, pricingGoodwill, projectGate } from "./business.js";
import { MAXIMUM_REPS_PER_SIDE, planExecution, repsFatigue, staffCandidates, staffModifiers, staffSalary } from "./installation.js";
import { foldSeasonStats } from "./persistence.js";

export {
  compressionAvailable,
  decodeSave,
  encodeSave,
  foldSeasonStats,
  saveablePayload,
  saveSize,
  SAVED_EVENT_LIMIT,
  SAVE_FORMAT_VERSION
} from "./persistence.js";
export type { LoadedSave } from "./persistence.js";
import {
  activeFocuses,
  defaultFocuses,
  developmentTarget,
  focusCapacity,
  isWeekFocus,
  planWeekHours,
  scoutingTargetFor,
  WEEK_FOCUSES
} from "./priorities.js";

export {
  activeFocuses,
  defaultFocuses,
  developmentTarget,
  focusCapacity,
  focusOwner,
  FOCUS_CAPACITY_THRESHOLDS,
  isWeekFocus,
  MAXIMUM_FOCUSES,
  planWeekHours,
  repsSplit,
  scoutingTargetFor,
  staffPower,
  SURGE_SHARE,
  WEEK_FOCUSES,
  WEEK_FOCUS_BLURBS,
  WEEK_FOCUS_LABELS,
  weekPriorities
} from "./priorities.js";
export type { WeekHourPlan } from "./priorities.js";

export { DEFAULT_GAME_PLAN, DEFENSIVE_IDENTITY_LABELS, GAME_PLAN_OPTIONS, IDENTITY_BASE_DEFENSE, IDENTITY_BASE_PLAN, intendedGamePlan, OFFENSIVE_IDENTITY_LABELS, plannedUnitRatings, projectUnitEdges, unitLabel, unitRatingsFromLineup } from "./game.js";
export {
  advertisingReach,
  DEFENSIVE_PRESETS,
  developmentCandidates,
  fairTicketPrice,
  matchingPreset,
  MAXIMUM_TICKET_PRICE,
  MAXIMUM_WEEKLY_ADVERTISING,
  MINIMUM_TICKET_PRICE,
  OFFENSIVE_PRESETS,
  projectGate,
  ticketDemandMultiplier
} from "./business.js";
export type { GateProjection, StrategyPreset } from "./business.js";
export { MAXIMUM_REPS_PER_SIDE, planExecution, planInstaller, repsFatigue, staffCard, staffModifiers, staffSalary } from "./installation.js";
export {
  filmGamesAvailable,
  preparationWeeklyPoints,
  projectedGamePlan,
  scheduledOpponent,
  scoutingConfidence,
  SCOUTING_TIER_DESCRIPTIONS,
  SCOUTING_TIER_LABELS,
  SCOUTING_TIERS
} from "./scouting.js";
export {
  alignmentNote,
  bestSchemeFor,
  coachSchemeFit,
  planAlignment,
  DEFENSIVE_SCHEME_BLURBS,
  DEFENSIVE_SCHEMES,
  OFFENSIVE_SCHEME_BLURBS,
  OFFENSIVE_SCHEMES,
  OFFENSIVE_PERSONNEL,
  DEFENSIVE_PERSONNEL,
  personnelSummary,
  programRoster,
  rosterSchemeFit,
  schemePersonnel,
  schemeAffinity,
  schemeFitLabel,
  staffSide
} from "./scheme.js";
export type { SchemeFit } from "./scheme.js";
export {
  allocatedTotal,
  defaultAllocation,
  departmentBaseOutput,
  DOSSIER_THRESHOLDS,
  dossierTiers,
  emptyAllocation,
  focusShare,
  focusSkill,
  focusWeight,
  MARQUEE_VALUE,
  opponentValue,
  roleFit,
  allocatableStaff,
  distributeWeekHours,
  weekAllocation,
  scoutingDepartmentSummary,
  scoutingReadiness,
  readinessNote,
  FULL_FILE_READINESS,
  READINESS_CAP,
  SCOUTING_FUNDING_LABELS,
  staffCapacity,
  staffContribution,
  staffSkills,
  programStrengthCoachBenefits,
  strengthCoachBenefits,
  STAFF_FOCUS_LABELS,
  STAFF_FOCUSES,
  STAFF_TRAITS,
  STAFF_TRAIT_LIST,
  weeklyScoutingOutput,
  WORTH_SCOUTING
} from "./department.js";
export type { GamePlanOption, UnitEdge } from "./game.js";

export { MAXIMUM_PRACTICE_HOURS } from "./scouting.js";
export {
  DEFENSIVE_SPOTS,
  MINIMUM_SNAP_SHARE,
  OFFENSIVE_SPOTS,
  personnelLabel,
  schemeSpots,
  snapShares,
  spotsForRoom
} from "./rotation.js";
export {
  ATTRIBUTE_KEYS,
  attributeByRole,
  attributesFor,
  computeOverall,
  overallPerPoint,
  POSITION_ATTRIBUTES,
  ratingByRole
} from "./attributes.js";
export type { AttributeDefinition, AttributeRole } from "./attributes.js";
export { scheduleAhead, seasonExpectation } from "./briefing.js";
export { boxScore, latestBoxScore } from "./boxscore.js";
export type { BoxScore, BoxScoreGroup, BoxScoreRow, BoxScoreTeam, BoxScoreTeamStat } from "./boxscore.js";
export type { BriefingDestination, BriefingItem, SeasonExpectation } from "./briefing.js";
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
const OFFENSIVE_POSITIONS = new Set<Position>(["QB", "RB", "WR", "TE", "OL"]);
const DEFENSIVE_POSITIONS = new Set<Position>(["DL", "LB", "DB"]);

/**
 * How steeply a room falls off, as a multiplier on the tier's decay. Around 1
 * for most rooms; a backup quarterback is a bigger step down than a fourth
 * receiver, and a kicker has no real depth at all.
 *
 * The offensive line is deliberately *not* the flattest room. It was, at 0.9 —
 * the lowest value in the table — which meant the one place a weak link is
 * supposed to be fatal had no weak link: the worst starting lineman measured 71
 * at low tier and 87 at power, barely below the top of the room.
 */
const ROOM_DEPTH_SLOPE: Readonly<Record<Position, number>> = {
  QB: 1.35,
  RB: 1,
  WR: 1,
  TE: 1,
  OL: 1,
  DL: 0.95,
  LB: 1,
  DB: 1,
  K: 1.2,
  P: 1.2
};

/**
 * Rating points a room drops per depth-chart slot through the two-deep. Depth is
 * a tier advantage: a power program's fourth receiver is a future starter, a
 * low-tier program's is a walk-on.
 */
const TIER_DEPTH_DECAY: Readonly<Record<Program["tier"], number>> = {
  POWER: 4,
  MID: 5,
  LOW: 6
};

/**
 * The drop from the top of a room to a given slot. Steep through the two-deep,
 * shallow through the developmental tail.
 *
 * The first version was linear across the whole room, and that is why slice 1
 * under-delivered: a linear gradient across twelve receivers spends its entire
 * budget on the tail, so WR1 to WR4 got only three slots of it. Measured, the
 * gap came out at 5.2 / 4.8 / 3.6 by tier against a 16-22 / 13-17 / 10-14
 * target — the rooms were still effectively flat, and most of what spread did
 * exist was order statistics of the individual noise rather than authored depth.
 */
function roomSlotDrop(slot: number, decay: number): number {
  if (slot <= 3) return decay * slot;
  return decay * 3 + decay * 0.3 * (slot - 3);
}

/**
 * Where a room's top sits so its *starters* average the tier baseline.
 *
 * Centring on the room's mean, as the first version did, necessarily inflates
 * the lineup: starters are the top of the room, so holding the mean while
 * steepening the gradient lifts everyone who actually plays. Measured, every
 * starting lineup came out about five points hot (LOW 68.1 to 73.6, POWER 83.1
 * to 87.9), which drags the calibrated per-game rates with it.
 */
function roomTopOffset(starters: number, decay: number): number {
  const counted = Math.max(1, starters);
  let total = 0;
  for (let slot = 0; slot < counted; slot += 1) total += roomSlotDrop(slot, decay);
  return total / counted;
}

const CHARACTER_DEPTH_SCALE: Readonly<Record<Program["character"], number>> = {
  BLUEBLOOD: 0.9,
  DIEHARD: 1,
  FRONTRUNNER: 1.25,
  TALENT_MAGNET: 1.15,
  DEVELOPER: 0.9
};

/**
 * Small football fingerprints layered on top of the much larger business
 * characters. They are centred before use, so character changes where a roster
 * is strong without silently making one character a higher difficulty tier.
 */
const CHARACTER_ROOM_BIAS: Readonly<Record<Program["character"], Readonly<Partial<Record<Position, number>>>>> = {
  BLUEBLOOD: { QB: 0.5, OL: 0.5, DL: 0.5, K: -1, P: -1 },
  DIEHARD: { OL: 1.5, DL: 1.5, LB: 1, WR: -1, DB: -0.5 },
  FRONTRUNNER: { QB: 1.5, WR: 1.5, DB: 1, OL: -1, DL: -1 },
  TALENT_MAGNET: { QB: 2, WR: 2, DB: 1.5, OL: -1.5, DL: -1 },
  DEVELOPER: { RB: 0.75, TE: 0.75, OL: 0.75, LB: 0.75, QB: -0.75, WR: -0.5, DB: -0.5 }
};
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
  // Re-weighted toward the hours. At `32 + facilities * 4 + contribution / 20`
  // the base dominated so completely that quadrupling the staff on the trail
  // moved the week by five points — so the recruiting card could not state a
  // real trade. The weekly average across the league is unchanged; what changed
  // is that it now responds to whether anybody is actually on the road.
  return Math.round(14 + program.facilities.RECRUITING * 3 + staffContribution(state, programId, "RECRUIT") / 4.2);
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
  // Named for the position, so a quarterback's card talks about accuracy and a
  // lineman's about pass blocking.
  const attribute = (role: Parameters<typeof attributeByRole>[1]): AttributeDefinition =>
    attributeByRole(prospect.position, role);
  const band = (role: Parameters<typeof attributeByRole>[1]): string => {
    const definition = attribute(role);
    return `${definition.label} ${estimate(prospect.ratings[definition.key] ?? 50, definition.key)}`;
  };
  const athletic = evaluations.has("ATHLETIC") ? `${band("POWER")} · ${band("SPEED")}` : "Unknown";
  const positionSkill = evaluations.has("POSITION") ? `${band("PRIMARY")} · ${band("SECONDARY")}` : "Unknown";
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
      ? ratingByRole(prospect.position, prospect.ratings, "DURABILITY") >= 78 ? "Low injury concern" : ratingByRole(prospect.position, prospect.ratings, "DURABILITY") >= 62 ? "Average medical profile" : "Elevated injury concern"
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
  const coachingModifier = 1 + staffContribution(state, program.id, "DEVELOP") / 150;
  const scale = clamp((0.72 + player.workEthic * 0.45) * fatigueModifier * trainingModifier * coachingModifier, 0.5, 1.8);
  const payoff = developmentPayoff(focus, player.position);
  const strengthCoach = programStrengthCoachBenefits(state, program.id);
  return {
    ...payoff,
    ratingChanges: Object.fromEntries(
      (Object.entries(payoff.ratingChanges) as [PlayerRating, number][]).map(([rating, change]) => [
        rating,
        Number((change * scale * intensity
          * (rating === "strength" ? 1 + strengthCoach.strengthGrowthPercent / 100 : 1)).toFixed(2))
      ])
    ),
    fatigueChange: Number((payoff.fatigueChange * intensity).toFixed(1))
  };
}

/**
 * What one hour of a coach's week buys on a given job. Posted per hour rather
 * than per coach, because the decision the player makes is how many of his hours
 * go where — not whether he is "on" a job at all.
 */
export function staffFocusPayoff(member: Pick<StaffMember, "rating" | "role" | "trait">, focus: StaffFocus): string {
  const perHour = (multiplier: number): number =>
    focusWeight(member, focus) * multiplier / staffCapacity(member.rating, member.trait);
  if (focus === "PREPARE") return `Every hour sharpens all four phases — run game, pass game, run defense, pass defense — by ${perHour(0.01).toFixed(2)} on Saturday`;
  if (focus === "SCOUT") return `Every hour here is +${perHour(1 / 12).toFixed(1)} scouting points a week`;
  if (focus === "RECRUIT") return `Every hour here is +${perHour(0.05).toFixed(1)} on the recruiting trail`;
  if (focus === "DEVELOP") return `Every hour here is +${perHour(0.2).toFixed(1)}% player growth a week`;
  return `Every hour here knocks ${perHour(1 / 30).toFixed(2)} off the roster's fatigue`;
}

export function facilityPayoff(facility: FacilityType, level: number): string {
  if (facility === "TRAINING") return `Guys develop ${Math.max(0, level - 1) * 4}% faster in here`;
  if (facility === "STADIUM") return `${Math.max(0, level - 1) * 8}% more money on every home date`;
  if (facility === "ACADEMICS") return `${Math.max(0, level - 1) * 1.5}% fewer players hit the portal in the offseason`;
  if (facility === "SCOUTING") return `${scoutingDepartmentSummary(level)}`;
  return `+${Math.max(0, level - 1) * 2} on every recruiting battle and +${level * 4} Recruiting Points a week`;
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

/**
 * A right-tailed draw: mostly ordinary, occasionally exceptional.
 *
 * Every generator in this engine used to be `rng.between(low, high)`, which is
 * uniform and has no tail — so six independent leagues produced the same best
 * available player to within a point and a half, and restarting a career bought
 * nothing. A tail is what makes a roster worth looking through and a save worth
 * rerolling.
 */
function tailedDraw(rng: AddressableRng, key: string, typical: number, tail: number, tailChance = 0.08): number {
  const body = rng.between(`${key}:body`, 0, typical);
  if (rng.at(`${key}:tail-roll`) >= tailChance) return body;
  return typical + rng.between(`${key}:tail`, 0, tail);
}

interface InitialRosterShape {
  roomBias: Readonly<Record<Position, number>>;
  depthScale: number;
}

/**
 * Gives each roster strong and weak rooms without moving its tier average.
 * Position draws are centred by scholarship count, so a lucky quarterback room
 * has to be paid for somewhere else on the same 85-player roster.
 */
function initialRosterShape(
  rng: AddressableRng,
  programId: string,
  character: Program["character"]
): InitialRosterShape {
  const positions = Object.keys(ROSTER_COMPOSITION) as Position[];
  const authored = CHARACTER_ROOM_BIAS[character];
  const raw = Object.fromEntries(positions.map((position) => [
    position,
    (authored[position] ?? 0) + rng.normal(`${programId}:room:${position}`, 2.5) * 1.7
  ])) as Record<Position, number>;
  const rosterSize = Math.max(1, STARTING_ROSTER_SIZE);
  const weightedAverage = positions.reduce(
    (total, position) => total + raw[position] * ROSTER_COMPOSITION[position],
    0
  ) / rosterSize;
  return {
    roomBias: Object.fromEntries(positions.map((position) => [
      position,
      Number((raw[position] - weightedAverage).toFixed(2))
    ])) as Record<Position, number>,
    depthScale: CHARACTER_DEPTH_SCALE[character]
  };
}

function initialPlayerOverall(
  baseline: number,
  tier: Program["tier"],
  position: Position,
  roomOrdinal: number,
  starters: number,
  shape: InitialRosterShape,
  rng: AddressableRng,
  playerId: string
): number {
  const decay = TIER_DEPTH_DECAY[tier] * ROOM_DEPTH_SLOPE[position] * shape.depthScale;
  const top = baseline + shape.roomBias[position] + roomTopOffset(starters, decay);
  // Noise has to stay clearly under one slot of gradient, or the authored depth
  // chart is scrambled and the room's shape becomes an accident of the draw. It
  // was 1.65 against a 1.55-point slot, which is why the measured spread was
  // mostly noise. Enough is kept that a room is not perfectly ordered, so an
  // occasional surprise still exists behind a starter.
  const individualNoise = rng.normal(`${playerId}:overall`, 2.2) * 1.05;
  return clamp(Math.round(top - roomSlotDrop(roomOrdinal, decay) + individualNoise), 32, 99);
}

/**
 * How hard one week of coaching attention lands. One player gets more than he
 * would in a group; a whole room gets less each but more in total.
 */
export const SPOTLIGHT_INTENSITY = { PLAYER: 1.6, POSITION: 0.28 } as const;

export function marqueeGuarantee(rank: number): number {
  return Math.round(500_000 + (25 - clamp(rank, 1, 25)) * (1_000_000 / 24));
}

export interface ProgramPreview {
  programId: string;
  name: string;
  abbreviation: string;
  location: string;
  tier: Program["tier"];
  character: Program["character"];
  characterLabel: string;
  blurb: string;
  strategy: string;
  facilities: Record<FacilityType, number>;
  fanBase: number;
  fanElasticity: number;
  recruitAppeal: number;
  prestige: number;
  /** The roster you would inherit. */
  rosterOverall: number;
  rosterCeiling: number;
  futureStars: number;
  bestCeiling: number;
  /** Plain sentences a player can compare across jobs. */
  notes: string[];
}

export const FACILITY_LABELS: Readonly<Record<FacilityType, string>> = {
  TRAINING: "Weight room",
  STADIUM: "Stadium",
  ACADEMICS: "Academic support",
  RECRUITING: "Recruiting operation",
  SCOUTING: "Scouting department"
};

/**
 * The jobs available at a tier, with what each one actually offers.
 *
 * Programs used to be tier-clones — one facility level applied to everything and
 * rosters drawn from the same narrow band — so choosing between them was a
 * cosmetic decision. Character has to be legible at the moment of choosing or it
 * may as well not exist.
 */
export function programPreviews(state: Readonly<GameState>, tier: Program["tier"]): ProgramPreview[] {
  return Object.values(state.programs)
    .filter((program) => program.tier === tier)
    .map((program) => {
      const roster = Object.values(state.players).filter((player) =>
        player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP");
      const size = Math.max(1, roster.length);
      const profile = PROGRAM_CHARACTERS[program.character];
      const notes: string[] = [];

      if (program.fanElasticity <= 0.5) notes.push("This crowd shows up no matter what the record says.");
      else if (program.fanElasticity >= 1.4) notes.push("Lose and the stadium empties. Win and it's a madhouse.");
      if (program.recruitAppeal >= 6) notes.push(`Recruits take your call — worth +${program.recruitAppeal} on every kid you go after.`);
      else if (program.recruitAppeal <= -3) notes.push(`It's a hard sell here — ${program.recruitAppeal} on every kid you go after.`);

      const best = (Object.keys(FACILITY_LABELS) as FacilityType[])
        .sort((left, right) => program.facilities[right] - program.facilities[left]);
      const strongest = best[0]!;
      const weakest = best[best.length - 1]!;
      if (program.facilities[strongest] - program.facilities[weakest] >= 2) {
        notes.push(`The ${FACILITY_LABELS[strongest].toLowerCase()} is the best thing about this place. The ${FACILITY_LABELS[weakest].toLowerCase()} is an embarrassment.`);
      }

      const futureStars = roster.filter((player) => player.potential >= 88).length;
      if (futureStars >= 6) notes.push(`There are ${futureStars} kids on this roster who could be all-conference. Somebody has to find them first.`);
      else if (futureStars <= 2) notes.push("Not much on this roster is going to turn into a star. You'll have to go get some.");

      return {
        programId: program.id,
        name: program.name,
        abbreviation: program.abbreviation,
        location: `${program.city}, ${program.stateCode}`,
        tier: program.tier,
        character: program.character,
        characterLabel: profile.label,
        blurb: profile.blurb,
        strategy: profile.strategy,
        facilities: { ...program.facilities },
        fanBase: program.fanBase,
        fanElasticity: program.fanElasticity,
        recruitAppeal: program.recruitAppeal,
        prestige: program.prestige,
        rosterOverall: Number((roster.reduce((total, player) => total + player.overall, 0) / size).toFixed(1)),
        rosterCeiling: Number((roster.reduce((total, player) => total + player.potential, 0) / size).toFixed(1)),
        futureStars,
        bestCeiling: roster.length ? Math.max(...roster.map((player) => player.potential)) : 0,
        notes
      };
    })
    .sort((left, right) => left.character.localeCompare(right.character) || left.name.localeCompare(right.name))
    // Interleave the characters. Grouped, the top of the list is three cards
    // with the same headline and the player concludes the jobs are identical —
    // which is the exact impression this screen exists to correct.
    .reduce<ProgramPreview[][]>((buckets, preview) => {
      const bucket = buckets.find((entry) => entry[0]!.character === preview.character);
      if (bucket) bucket.push(preview);
      else buckets.push([preview]);
      return buckets;
    }, [])
    .reduce<ProgramPreview[]>((ordered, _bucket, _index, buckets) => {
      const depth = Math.max(...buckets.map((bucket) => bucket.length));
      if (ordered.length > 0) return ordered;
      for (let row = 0; row < depth; row += 1) {
        for (const bucket of buckets) if (bucket[row]) ordered.push(bucket[row]!);
      }
      return ordered;
    }, []);
}

export function createFictionalLeague(rootSeed: string, programCount = FICTIONAL_PROGRAMS.length): GameState {
  const selectedPrograms = FICTIONAL_PROGRAMS.slice(0, clamp(Math.trunc(programCount), 2, FICTIONAL_PROGRAMS.length));
  const rng = new AddressableRng(rootSeed).fork("league-generation");
  const nameRng = rng.fork("fictional-names");
  const firstNameOffset = Math.floor(nameRng.between("first-offset", 0, 96));
  const lastNameOffset = Math.floor(nameRng.between("last-offset", 0, 160));
  const nameFor = (ordinal: number): string => fictionalPersonName(ordinal, firstNameOffset, lastNameOffset);
  const state: GameState = {
    // Read from content rather than inlined. The two copies had already drifted:
    // content carried one set of development rates and every league ever created
    // carried another, so tuning the balance file changed nothing at all.
    identity: { rootSeed, balanceConfiguration: clone(DEFAULT_BALANCE), simulationVersion: "0.1.0" },
    season: 2027, week: 0, phase: "ROSTER_REVIEW", programs: {}, players: {}, prospects: {}, recruiting: {}, developmentSpotlights: {}, gamePlans: {}, preparation: {}, weekFocus: {}, scoutingTarget: {}, dossiers: {}, staff: {}, depthCharts: {}, playerGameStats: [], playerSeasonStats: [], schedule: [], seasonHistory: [], eventHistory: []
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
    const character = PROGRAM_CHARACTERS[definition.character];
    // Headroom is deliberately asymmetric by tier. With equal upside a low-tier
    // roster can never close the 15-point gap to a power program, so development
    // is a treadmill it cannot win.
    const upsideFloor = tier === "POWER" ? 1 : tier === "MID" ? 3 : 5;
    // Facilities are no longer one level applied to everything. A developer has
    // a weight room and no recruiting office; a talent magnet has the reverse.
    const facility = (type: FacilityType): number =>
      clamp(Math.round(facilityLevel + (character.facilitySkew[type] ?? 0)), 1, 5);
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
      // Replaced after the roster is generated with whatever it is built for.
      schemeIdentity: assignSchemeIdentity(rng, id),
      character: definition.character,
      fanElasticity: character.fanElasticity,
      recruitAppeal: character.recruitAppeal,
      donorCulture: character.donorCulture,
      homeRegionBias: character.homeRegionBias,
      ticketPrice: tier === "POWER" ? 58 : tier === "MID" ? 42 : 28,
      advertisingSpend: 0,
      weeklyRevenue: tier === "POWER" ? 1_200_000 : tier === "MID" ? 520_000 : 210_000,
      weeklyExpenses: tier === "POWER" ? 940_000 : tier === "MID" ? 430_000 : 185_000,
      // A scouting department starts a tier behind the rest: information is the
      // thing a program has to decide to invest in rather than inherit.
      facilities: {
        TRAINING: facility("TRAINING"),
        STADIUM: facility("STADIUM"),
        ACADEMICS: facility("ACADEMICS"),
        RECRUITING: facility("RECRUITING"),
        SCOUTING: clamp(facility("SCOUTING") - 1, 1, 5)
      }
    };
    state.recruiting[id] = {
      points: 0,
      weeklyPoints: 0,
      discoveredProspectIds: [],
      scoutingByProspect: {}
    };
    state.developmentSpotlights[id] = null;
    state.gamePlans[id] = { ...DEFAULT_GAME_PLAN };
    state.preparation[id] = { points: 0, weeklyPoints: 0, scoutingPoints: 0, weeklyScoutingPoints: 0, offensiveReps: 0, defensiveReps: 0 };
    state.dossiers[id] = {};
    state.weekFocus[id] = [];
    state.scoutingTarget[id] = null;
    for (const [staffIndex, role] of STAFF_ROLES.entries()) {
      const staffId = `${id}-staff-${staffIndex + 1}`;
      const personOrdinal = index * (STARTING_ROSTER_SIZE + STAFF_ROLES.length) + staffIndex;
      const rating = Math.round(rng.between(`${staffId}:rating`, baseline - 4, baseline + 7));
      const trait = pickStaffTrait(role, rng.at(`${staffId}:trait`));
      state.staff[staffId] = {
        id: staffId,
        programId: id,
        name: nameFor(personOrdinal),
        role,
        rating,
        // Priced by the same formula the hiring market uses, so a replacement is
        // never both better and cheaper by accident.
        salary: staffSalary(rating, role),
        allocation: defaultAllocation(role, rating, trait),
        trait,
        schemePreference: assignSchemeIdentity(rng, `${staffId}:scheme`)
      };
    }
    const rosterShape = initialRosterShape(rng, id, definition.character);
    const roomOrdinals = Object.fromEntries(
      (Object.keys(ROSTER_COMPOSITION) as Position[]).map((position) => [position, 0])
    ) as Record<Position, number>;
    for (let rosterIndex = 0; rosterIndex < rosterPositions.length; rosterIndex += 1) {
      const playerId = `${id}-player-${rosterIndex + 1}`;
      const personOrdinal = index * (STARTING_ROSTER_SIZE + STAFF_ROLES.length) + STAFF_ROLES.length + rosterIndex;
      const position = rosterPositions[rosterIndex]!;
      const roomOrdinal = roomOrdinals[position]++;
      // Anchored to how many of this room the program's scheme actually starts,
      // so an Air Raid builds its receiver room four deep and a Power Run
      // program builds two receivers plus tight ends.
      const starters = startersForRoom(state.programs[id]!.schemeIdentity, position);
      const overall = initialPlayerOverall(baseline, tier, position, roomOrdinal, starters, rosterShape, rng, playerId);
      const playerRatings = createPlayerRatings(overall, position, rng, playerId);
      const derivedOverall = computeOverall(position, playerRatings);
      state.players[playerId] = {
        id: playerId,
        name: nameFor(personOrdinal),
        programId: id,
        position,
        overall: derivedOverall,
        // A struggling program has to be able to out-develop a rich one, so its
        // rosters carry more headroom — and a tail, so a rebuild can inherit a
        // genuine star nobody knew was there.
        potential: clamp(
          Math.round(
            overall
            + upsideFloor
            + tailedDraw(rng, `${playerId}:potential`, 9, 16)
            // Developer programs inherit raw depth that has more room to grow.
            + (definition.character === "DEVELOPER"
              ? Math.max(0, roomOrdinal - ROSTER_COMPOSITION[position] / 2) * 0.35
              : 0)
          ),
          overall,
          99
        ),
        workEthic: rng.between(`${playerId}:work-ethic`, 0.2, 1),
        fatigue: 0,
        // Overall is derived, so it is set from the attributes rather than being
        // the number they were drawn around. The clamp at either end of an
        // attribute can move the weighted average, and a stored Overall that
        // disagrees with its own attributes is the exact defect this replaces.
        ratings: playerRatings,
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
    // A program runs something its personnel can actually run — one of the two
    // best fits, not always the best. Always-optimal collapsed the league onto a
    // handful of schemes and left opponent scouting nothing to report.
    const roster = programRoster(state, id);
    state.programs[id]!.schemeIdentity = bestSchemeFor(roster, (side) =>
      rng.at(`${id}:scheme-pick:${side}`) < 0.55 ? 0 : 1);
    state.gamePlans[id] = schemeGamePlan(state.programs[id]!.schemeIdentity);
    // The staff a program already employs usually coaches what the program runs.
    // A minority do not, which is where the first real hiring decision comes from.
    for (const member of Object.values(state.staff)) {
      if (member.programId !== id) continue;
      if (rng.at(`${member.id}:inherits-scheme`) < 0.6) {
        member.schemePreference = { ...state.programs[id]!.schemeIdentity };
      }
    }
    state.depthCharts[id] = buildDefaultDepthChart(state, id);
    // The department produces a preseason allocation, so opening a file on the
    // week-six opponent is something a coach can do the day he is hired.
    const preseasonScouting = weeklyScoutingOutput(state, id);
    state.preparation[id] = {
      points: preparationWeeklyPoints(state, id),
      weeklyPoints: preparationWeeklyPoints(state, id),
      scoutingPoints: preseasonScouting,
      weeklyScoutingPoints: preseasonScouting,
      offensiveReps: 0,
      defensiveReps: 0
    };
  }
  updateNationalRankings(state);
  const actualProgramCount = selectedPrograms.length;
  generateProspects(state, rng.fork("prospects"), actualProgramCount * 30, "initial", actualProgramCount * (STARTING_ROSTER_SIZE + STAFF_ROLES.length), firstNameOffset, lastNameOffset);
  initializeRecruitingBoards(state, rng.fork("initial-recruiting-boards"));
  buildSeasonSchedule(state);
  return state;
}

const OFFENSIVE_IDENTITIES = OFFENSIVE_SCHEMES;
const DEFENSIVE_IDENTITIES = DEFENSIVE_SCHEMES;

/**
 * Programs are given a lasting football identity at creation. It is what makes
 * a rival recognisable from season to season, and it is what an opponent
 * scouting report has to sell — a league where everyone plays the same way has
 * nothing worth scouting.
 */
/**
 * The plan a scheme runs. Every emphasis axis is a property of the scheme rather
 * than a weekly choice, so an Air Raid is permanently pass-heavy at tempo and is
 * never offered a power-running week.
 */
export function schemeGamePlan(identity: Readonly<SchemeIdentity>): GamePlan {
  return {
    ...DEFAULT_GAME_PLAN,
    ...IDENTITY_BASE_PLAN[identity.offense],
    ...IDENTITY_BASE_DEFENSE[identity.defense]
  };
}

function assignSchemeIdentity(rng: AddressableRng, programId: string): SchemeIdentity {
  return {
    offense: OFFENSIVE_IDENTITIES[Math.floor(rng.between(`${programId}:offensive-identity`, 0, OFFENSIVE_IDENTITIES.length - 0.0001))]!,
    defense: DEFENSIVE_IDENTITIES[Math.floor(rng.between(`${programId}:defensive-identity`, 0, DEFENSIVE_IDENTITIES.length - 0.0001))]!
  };
}

/**
 * The five attributes this position actually has, spread around the target
 * overall. The spread is what makes two players of the same calibre different
 * footballers — one quarterback is accurate with a modest arm, another has the
 * arm and forces throws.
 *
 * The draw is centred so `computeOverall` lands back on the target: the weighted
 * offsets are subtracted out. Without that, generation and the derived Overall
 * would disagree and every tier baseline would drift.
 */
function createPlayerRatings(overall: number, position: Position, rng: AddressableRng, path: string): PlayerRatings {
  const group = attributesFor(position);
  const offsets = group.map((attribute) => rng.between(`${path}:${attribute.key}`, -7, 7));
  const centre = group.reduce((total, attribute, index) => total + offsets[index]! * attribute.weight, 0);
  const ratings: PlayerRatings = {};
  for (const [index, attribute] of group.entries()) {
    ratings[attribute.key] = clamp(Number((overall + offsets[index]! - centre).toFixed(1)), 32, 99);
  }
  return ratings;
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
    refreshPreparation(state, events);
    state.eventHistory.push(...events.filter((event) => event.type === "PREP_POINTS_ADDED"));
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
  state.preparation ??= {};
  const events: GameEvent[] = [];
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
  // Standing priorities survive the reset above. A program chasing development
  // is chasing it every week until the player says otherwise — clearing the
  // spotlight here would mean the card named a player the engine then ignored.
  // An explicit spotlight command still wins, because commands resolve after.
  for (const programId of Object.keys(state.programs)) applyWeekFocus(state, programId);
  const rng = new AddressableRng(state.identity.rootSeed).fork(String(state.season), String(state.week));
  resolveCommands(state, commands, rng.fork("commands"), events);
  resolveRecruitingMarket(state, rng.fork("recruiting-market"), events);
  recoverPlayers(state, rng.fork("recovery"), events);
  developPlayers(state, rng.fork("development"), events);
  applyPracticeFatigue(state);
  // Captured before the whistle, because these are what the week's priorities
  // actually bought. Saturday has to be able to name Monday.
  const focusInputs = captureFocusInputs(state);
  resolveScheduledGames(state, rng.fork("games"), events);
  const playerBrandImpact = processPlayerBrands(state, rng.fork("player-brands"), events);
  processInjuries(state, rng.fork("injuries"), events);
  processWeeklyRecapsAndFinances(state, playerBrandImpact, events);
  updateNationalRankings(state);
  if (state.week < 14) replenishRecruitingPoints(state, events);
  recordFocusPayoffs(state, focusInputs, events);
  state.week += 1;
  if (state.week > 14) rolloverSeason(state, events);
  refreshPreparation(state, events);
  state.eventHistory.push(...events);
  if (state.eventHistory.length > 10_000) state.eventHistory = state.eventHistory.slice(-10_000);
  return { state, events };
}

/**
 * Refreshes every program's preparation for the week about to be played.
 *
 * Preparation is attention: reps and department output both refresh weekly and
 * never bank. Dossiers are the exception — they are the work product, and they
 * persist against the fixture they were opened for until it is played.
 */
function refreshPreparation(state: GameState, events: GameEvent[]): void {
  state.preparation ??= {};
  state.dossiers ??= {};
  state.weekFocus ??= {};
  state.scoutingTarget ??= {};
  for (const programId of Object.keys(state.programs)) {
    state.preparation[programId] = {
      points: 0,
      weeklyPoints: 0,
      scoutingPoints: 0,
      weeklyScoutingPoints: 0,
      offensiveReps: 0,
      defensiveReps: 0,
      autoScoutedOpponentId: null,
      autoScoutedPoints: 0
    };
    // Priorities are standing: they carry over, so a player with nothing to
    // change advances the week with one button. The hours, the reps, and the
    // department's target are all derived from them rather than re-entered.
    applyWeekFocus(state, programId);
    commitScoutingOutput(state, programId, events);
    events.push({
      type: "PREP_POINTS_ADDED",
      season: state.season,
      week: state.week,
      programId,
      pointsAdded: state.preparation[programId]!.weeklyPoints
    });
  }
  // A file was work done for one fixture. Once that game is played it is spent,
  // which is what stops a program banking scouting into a single blowout.
  for (const [programId, files] of Object.entries(state.dossiers)) {
    for (const opponentProgramId of Object.keys(files)) {
      const pending = state.schedule.some((game) =>
        !game.played
        && ((game.homeProgramId === programId && game.awayProgramId === opponentProgramId)
          || (game.awayProgramId === programId && game.homeProgramId === opponentProgramId)));
      if (!pending) delete files[opponentProgramId];
    }
  }
}

interface FocusInputs {
  offensiveExecution: number;
  defensiveExecution: number;
  scoutingReadiness: number;
  scoutedOpponentId: string | null;
  spotlightPlayerId: string | null;
}

/** What the week's priorities had bought by the time the game kicked off. */
function captureFocusInputs(state: Readonly<GameState>): Map<string, FocusInputs> {
  const captured = new Map<string, FocusInputs>();
  for (const programId of Object.keys(state.programs)) {
    const opponentId = scheduledOpponent(state, programId);
    const points = opponentId ? state.dossiers?.[programId]?.[opponentId] ?? 0 : 0;
    const spotlight = state.developmentSpotlights?.[programId];
    captured.set(programId, {
      offensiveExecution: planExecution(state, programId, "OFFENSE").expected,
      defensiveExecution: planExecution(state, programId, "DEFENSE").expected,
      scoutingReadiness: opponentId ? scoutingReadiness(points) : 0,
      scoutedOpponentId: opponentId,
      spotlightPlayerId: spotlight?.target.type === "PLAYER" ? spotlight.target.playerId : null
    });
  }
  return captured;
}

/**
 * Says what each priority produced, so the postgame can name the choice.
 *
 * A player repeats behaviour they were thanked for. The week screen was
 * previously never mentioned again after it was used, which is a large part of
 * why it read as optional homework rather than as the decision it is.
 */
function recordFocusPayoffs(state: GameState, inputs: Map<string, FocusInputs>, events: GameEvent[]): void {
  const developedByPlayer = new Map<string, number>();
  const recruitingByProgram = new Map<string, number>();
  for (const event of events) {
    if (event.type === "PLAYER_DEVELOPED") {
      developedByPlayer.set(event.playerId, Number((event.newOverall - event.previousOverall).toFixed(2)));
    }
    if (event.type === "RECRUITING_POINTS_ADDED") {
      recruitingByProgram.set(event.programId, event.pointsAdded);
    }
  }
  for (const [programId, captured] of inputs) {
    const focuses = state.weekFocus?.[programId] ?? [];
    if (focuses.length === 0) continue;
    // The player whose extra work actually landed, when one was spotlighted.
    let developedPlayerId: string | null = null;
    let developedOverallGain = 0;
    if (captured.spotlightPlayerId && developedByPlayer.has(captured.spotlightPlayerId)) {
      developedPlayerId = captured.spotlightPlayerId;
      developedOverallGain = developedByPlayer.get(captured.spotlightPlayerId) ?? 0;
    }
    events.push({
      type: "WEEK_FOCUS_PAYOFF",
      season: state.season,
      week: state.week,
      programId,
      focuses: [...focuses],
      offensiveExecution: captured.offensiveExecution,
      defensiveExecution: captured.defensiveExecution,
      scoutingReadiness: captured.scoutingReadiness,
      scoutedOpponentId: captured.scoutedOpponentId,
      developedPlayerId,
      developedOverallGain,
      recruitingPointsAdded: recruitingByProgram.get(programId) ?? 0
    });
  }
}

/**
 * Turns a program's standing priorities into every coach's week.
 *
 * This is the whole architecture in one function. The player names what the
 * staff is chasing; the engine works out the hours, the practice budget, and
 * how the reps are split. Nothing here can be set independently of the
 * priorities, which is what stops the same decision appearing on four screens in
 * three different units — the defect that made the week unreadable.
 */
function applyWeekFocus(state: GameState, programId: string, events?: GameEvent[]): void {
  if (!state.programs[programId]) return;
  state.weekFocus ??= {};
  state.scoutingTarget ??= {};
  const stored = state.weekFocus[programId];
  if (!Array.isArray(stored) || stored.length === 0) {
    state.weekFocus[programId] = defaultFocuses(state, programId);
  }
  const focuses = activeFocuses(state, programId);
  state.weekFocus[programId] = focuses;

  const plan = planWeekHours(state, programId, focuses);
  for (const [staffId, allocation] of Object.entries(plan.byStaff)) {
    const member = state.staff[staffId];
    if (member) member.allocation = allocation;
  }

  // A card that names a player has to actually coach that player. Making
  // development a priority buys the hours; without this it bought hours for
  // nobody, and the card promised work the engine was never going to do.
  if (focuses.includes("DEVELOP") && !state.developmentSpotlights[programId]) {
    const target = developmentTarget(state, programId);
    if (target) {
      state.developmentSpotlights[programId] = { focus: "TECHNIQUE", target: { type: "PLAYER", playerId: target.id } };
      target.developmentFocus = "TECHNIQUE";
    }
  }

  const preparation = state.preparation[programId];
  if (preparation) {
    preparation.weeklyPoints = plan.practiceHours;
    preparation.offensiveReps = plan.offensiveReps;
    preparation.defensiveReps = plan.defensiveReps;
    preparation.points = Math.max(0, plan.practiceHours - plan.offensiveReps - plan.defensiveReps);
    // The department's output moves with the hours behind it. What has already
    // been spent by hand stays spent, so changing priorities mid-week can never
    // refill a pool the program has drawn down.
    const output = weeklyScoutingOutput(state, programId);
    const spent = Math.max(0, (preparation.weeklyScoutingPoints ?? 0) - (preparation.scoutingPoints ?? 0)
      - (preparation.autoScoutedPoints ?? 0));
    preparation.weeklyScoutingPoints = output;
    preparation.scoutingPoints = Math.max(0, output - spent - (preparation.autoScoutedPoints ?? 0));
  }
  if (events) {
    events.push({
      type: "WEEK_FOCUS_SET",
      season: state.season,
      week: state.week,
      programId,
      focuses: [...focuses],
      capacity: focusCapacity(state, programId).capacity
    });
  }
}

/**
 * Files this week's department output against the opponent the program is
 * studying.
 *
 * Allocating a number of points by hand every week was bookkeeping rather than a
 * decision — the decision is *which game is worth knowing about*, and that is
 * the target. Work already filed this week is refunded first, so moving the
 * target moves the work instead of duplicating it.
 */
function commitScoutingOutput(state: GameState, programId: string, events?: GameEvent[]): void {
  const preparation = state.preparation[programId];
  if (!preparation) return;
  state.dossiers ??= {};
  state.dossiers[programId] ??= {};
  const files = state.dossiers[programId]!;

  const previousId = preparation.autoScoutedOpponentId ?? null;
  const previousPoints = preparation.autoScoutedPoints ?? 0;
  if (previousId && previousPoints > 0) {
    const left = Math.max(0, (files[previousId] ?? 0) - previousPoints);
    if (left > 0) files[previousId] = left;
    else delete files[previousId];
    preparation.scoutingPoints += previousPoints;
  }
  preparation.autoScoutedOpponentId = null;
  preparation.autoScoutedPoints = 0;

  const targetId = scoutingTargetFor(state, programId);
  const points = preparation.scoutingPoints;
  if (!targetId || points <= 0) return;
  const totalPoints = (files[targetId] ?? 0) + points;
  files[targetId] = totalPoints;
  preparation.scoutingPoints = 0;
  preparation.autoScoutedOpponentId = targetId;
  preparation.autoScoutedPoints = points;
  state.scoutingTarget[programId] = targetId;
  events?.push({
    type: "SCOUTING_ALLOCATED",
    season: state.season,
    week: state.week,
    programId,
    opponentProgramId: targetId,
    points,
    totalPoints,
    tiers: dossierTiers(totalPoints)
  });
}

/**
 * The preparation phase, which resolves before the week is advanced.
 *
 * Scouting has to settle immediately: a report the player only reads after the
 * game has been played cannot inform the game plan, which is the entire point
 * of buying it. Everything else still waits for `advanceWeek`.
 */
export function prepareWeek(input: Readonly<GameState>, commands: readonly GameCommand[] = []): SimulationResult {
  const state = clone<GameState>(input);
  const events: GameEvent[] = [];
  // Everything a coach settles *before* Saturday resolves here. Practice reps
  // belong with scouting: setting them and then being told you haven't
  // practised until you advance the week is exactly the confusion this phase
  // exists to prevent.
  const preparationCommands = commands.filter((command) =>
    command.type === "ALLOCATE_SCOUTING" || command.type === "SET_SCHEME"
    || command.type === "REPLACE_STAFF" || command.type === "SET_PRACTICE_REPS"
    || command.type === "SET_STAFF_ALLOCATION" || command.type === "SET_WEEK_HOURS"
    || command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET");
  if (preparationCommands.length > 0) {
    resolveCommands(state, preparationCommands, new AddressableRng(state.identity.rootSeed).fork("preparation", String(state.season), String(state.week)), events);
  }
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
    if (command.type === "SET_SCHEME") {
      // Scheme is what the program *is*, so it only moves when the roster is
      // being reviewed — never mid-season, where it would be a free reset.
      if (state.phase !== "ROSTER_REVIEW") {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "A program's scheme can only change between seasons." });
        continue;
      }
      program.schemeIdentity = { ...program.schemeIdentity, ...command.scheme };
      // The scheme *is* the game plan now, so setting one writes the other. A
      // program never plays something it does not run.
      state.gamePlans[program.id] = schemeGamePlan(program.schemeIdentity);
      events.push({ type: "SCHEME_SET", season: state.season, week: state.week, programId: program.id, scheme: { ...program.schemeIdentity } });
      continue;
    }
    if (command.type === "SET_WEEK_FOCUS") {
      const requested = Array.isArray(command.focuses) ? command.focuses : [];
      if (requested.some((focus) => !isWeekFocus(focus))) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "That is not something a staff can work on." });
        continue;
      }
      const capacity = focusCapacity(state, program.id).capacity;
      const unique = [...new Set(requested)];
      if (unique.length > capacity) {
        events.push({
          type: "COMMAND_REJECTED",
          programId: command.programId,
          command,
          reason: `This staff can only chase ${capacity} thing${capacity === 1 ? "" : "s"} a week. Hire better coaches to chase more.`
        });
        continue;
      }
      state.weekFocus[program.id] = unique;
      applyWeekFocus(state, program.id, events);
      // Hours moved, so the department's output moved with them.
      commitScoutingOutput(state, program.id);
      continue;
    }
    if (command.type === "SET_SCOUTING_TARGET") {
      const targetId = command.opponentProgramId;
      if (targetId !== null) {
        const fixture = state.schedule.find((game) =>
          !game.played && game.week >= state.week
          && ((game.homeProgramId === program.id && game.awayProgramId === targetId)
            || (game.awayProgramId === program.id && game.homeProgramId === targetId)));
        if (!fixture) {
          events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "That opponent is not on the remaining schedule." });
          continue;
        }
      }
      state.scoutingTarget[program.id] = targetId;
      commitScoutingOutput(state, program.id);
      events.push({
        type: "SCOUTING_TARGET_SET",
        season: state.season,
        week: state.week,
        programId: program.id,
        opponentProgramId: state.scoutingTarget[program.id] ?? null
      });
      continue;
    }
    if (command.type === "SET_WEEK_HOURS") {
      // Hours are derived from the week's priorities now. Leaving a second way to
      // set them would let the two disagree, which is exactly the defect the
      // priorities replaced: the same decision on several screens in different
      // units, none of which agreed with the engine.
      events.push({
        type: "COMMAND_REJECTED",
        programId: command.programId,
        command,
        reason: "Hours follow from the week's priorities. Choose what your staff is chasing instead."
      });
      continue;
    }
    if (command.type === "SET_STAFF_ALLOCATION") {
      const staff = state.staff[command.staffId];
      if (!staff || staff.programId !== program.id) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "That coach does not work for this program." });
        continue;
      }
      events.push({
        type: "COMMAND_REJECTED",
        programId: command.programId,
        command,
        reason: staff.role === "STRENGTH_COACH"
          ? `${staff.name} works automatically on strength and player health; the strength coach has no weekly hours to allocate.`
          : `${staff.name}'s week follows from what the staff is chasing. Set the week's priorities instead of moving one coach's hours.`
      });
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
      // A group used to be strictly better — twelve players at 0.55 is 6.6x the
      // output of one at 1.0, so the individual option was never worth taking.
      // Concentrated work is now worth more per player, which is what builds a
      // star, and a star is what the gate and the recruiting trail run on.
      const intensity = command.target.type === "PLAYER" ? SPOTLIGHT_INTENSITY.PLAYER : SPOTLIGHT_INTENSITY.POSITION;
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
    if (command.type === "ALLOCATE_SCOUTING") {
      const preparation = state.preparation[program.id];
      const points = Math.trunc(command.points);
      if (!preparation || !Number.isFinite(points) || points < 1) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Allocate at least one scouting point." });
        continue;
      }
      // A file can only be opened on a game still to be played — scouting is
      // work done ahead of a fixture, not a permanent record of the league.
      const fixture = state.schedule.find((game) =>
        !game.played
        && game.week >= state.week
        && ((game.homeProgramId === program.id && game.awayProgramId === command.opponentProgramId)
          || (game.awayProgramId === program.id && game.homeProgramId === command.opponentProgramId)));
      if (!fixture) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "That opponent is not on the remaining schedule." });
        continue;
      }
      if (preparation.scoutingPoints < points) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The scouting department has not produced that many points this week." });
        continue;
      }
      preparation.scoutingPoints -= points;
      state.dossiers[program.id] ??= {};
      const totalPoints = (state.dossiers[program.id]![command.opponentProgramId] ?? 0) + points;
      state.dossiers[program.id]![command.opponentProgramId] = totalPoints;
      events.push({
        type: "SCOUTING_ALLOCATED",
        season: state.season,
        week: state.week,
        programId: program.id,
        opponentProgramId: command.opponentProgramId,
        points,
        totalPoints,
        tiers: dossierTiers(totalPoints)
      });
      continue;
    }
    if (command.type === "SET_PRACTICE_REPS") {
      // Reps follow from whether a side of the ball is a priority this week. The
      // slider that used to set them was the third place the same decision
      // lived, in a third unit, and none of the three agreed.
      events.push({
        type: "COMMAND_REJECTED",
        programId: command.programId,
        command,
        reason: "Practice reps follow from the week's priorities. Make a side of the ball a priority to drill it."
      });
      continue;
    }
    if (command.type === "REPLACE_STAFF") {
      const outgoing = state.staff[command.staffId];
      if (!outgoing || outgoing.programId !== program.id) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "That post does not belong to this program." });
        continue;
      }
      const candidate = staffCandidatesFor(state, program.id, command.staffId)
        .find((option) => option.id === command.candidateId);
      if (!candidate) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "That candidate is no longer available." });
        continue;
      }
      if (candidate.unavailableReason) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: candidate.unavailableReason });
        continue;
      }
      if (program.budget < candidate.signingCost) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The program cannot afford that signing cost." });
        continue;
      }
      const arrivingId = `${program.id}-staff-${candidate.id.replace(/[^A-Za-z0-9]/g, "-")}`;
      if (arrivingId === command.staffId) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "He already has the job." });
        continue;
      }
      program.budget -= candidate.signingCost;
      delete state.staff[command.staffId];
      state.staff[arrivingId] = {
        id: arrivingId,
        programId: program.id,
        name: candidate.name,
        role: candidate.role,
        rating: candidate.rating,
        salary: candidate.salary,
        // The post keeps its shape; the person filling it changes. A coach who
        // works a longer week gets his extra hours where the post was heaviest.
        allocation: rebalanceAllocation(outgoing, candidate.rating, candidate.trait),
        trait: candidate.trait,
        schemePreference: { ...candidate.schemePreference }
      };
      events.push({
        type: "STAFF_REPLACED",
        season: state.season,
        week: state.week,
        programId: program.id,
        departingStaffId: command.staffId,
        arrivingStaffId: arrivingId,
        name: candidate.name,
        role: candidate.role,
        rating: candidate.rating,
        salary: candidate.salary,
        signingCost: candidate.signingCost
      });
      continue;
    }
    if (command.type === "SET_TICKET_PRICE") {
      const price = Math.round(command.price);
      if (!Number.isFinite(price) || price < MINIMUM_TICKET_PRICE || price > MAXIMUM_TICKET_PRICE) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: `Set a ticket price between $${MINIMUM_TICKET_PRICE} and $${MAXIMUM_TICKET_PRICE}.` });
        continue;
      }
      program.ticketPrice = price;
      const game = state.schedule.find((item) => item.week === state.week && !item.played && item.homeProgramId === program.id);
      const opponent = game ? state.programs[game.awayProgramId] ?? null : null;
      events.push({
        type: "TICKET_PRICE_SET",
        season: state.season,
        week: state.week,
        programId: program.id,
        price,
        fairPrice: fairTicketPrice(program, opponent, game?.matchupType === "MARQUEE")
      });
      continue;
    }
    if (command.type === "SET_ADVERTISING") {
      const spend = Math.round(command.spend);
      if (!Number.isFinite(spend) || spend < 0 || spend > MAXIMUM_WEEKLY_ADVERTISING) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: `Advertising must be between $0 and $${MAXIMUM_WEEKLY_ADVERTISING.toLocaleString()} a week.` });
        continue;
      }
      if (spend > program.budget) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The program cannot afford that advertising spend." });
        continue;
      }
      program.advertisingSpend = spend;
      events.push({ type: "ADVERTISING_SET", season: state.season, week: state.week, programId: program.id, spend });
      continue;
    }
    if (command.type === "SET_GAME_PLAN") {
      // The weekly tactical call is gone. A program runs what it runs: an Air
      // Raid was being offered "Ground and pound" every week, which is the one
      // thing `planAlignment` exists to discourage. The axes are properties of
      // the scheme now, so changing them means changing your scheme.
      //
      // The emphasis matchup matrix in game.ts is deliberately left intact and
      // unused rather than deleted — it is calibrated over 400 games a cell and a
      // full counter is worth about 2.7 points, so restoring it (on defense only,
      // informed by a scouting file) has to stay a config change.
      events.push({
        type: "COMMAND_REJECTED",
        programId: command.programId,
        command,
        reason: "Your game plan comes from your scheme. Change the scheme to change how you play."
      });
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
  const staffBonus = staffContribution(state, programId, "RECRUIT") / 25;
  const exposureBonus = program.localPress / 50 + program.nationalPress / 20;
  const appealBonus = program.recruitAppeal + (prospect.homeDivisionId === program.divisionId ? program.homeRegionBias / 8 : 0);
  return Number((
    prospect.interestByProgram[programId]! * 0.3
    + prospectProgramFit(state, prospect, programId) * 0.35
    + pursuitPoints * 0.75
    + facilityBonus
    + staffBonus
    + exposureBonus
    + appealBonus
    + rng.between(`${prospect.id}:${programId}:decision-noise`, -2, 2)
  ).toFixed(3));
}

function scoutingQuality(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  return clamp(25 + program.facilities.RECRUITING * 12 + staffContribution(state, programId, "RECRUIT") / 6, 25, 100);
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
    if (priority === "PLAYER_DEVELOPMENT") return clamp(program.facilities.TRAINING * 16 + staffContribution(state, programId, "DEVELOP") / 6, 10, 100);
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

/** How badly the recruiting world can be wrong about a prospect, either way. */
export const HYPE_MISREAD = { bustChance: 0.09, gemChance: 0.12, bustSwing: 13, gemSwing: 20 };

/**
 * What the recruiting world thinks a prospect is worth. Usually close to a fair
 * read of his current ability and ceiling — but a minority are badly misjudged,
 * and that minority is the only reason paying to dig pays anything.
 *
 * Measured before this existed: upside was flat at ~12 points across every
 * reputation tier, so reputation was a near-perfect proxy for potential and
 * scouting could only ever confirm what a power program already saw for free.
 */
function prospectHype(rng: AddressableRng, id: string, overall: number, potential: number): number {
  // Weighted toward what a scout can actually see today. Rankings measure
  // present ability far more than projection, which is why a raw prospect with a
  // real ceiling is systematically under-ranked — and why he is findable.
  const fairRead = overall * 0.78 + potential * 0.22;
  const roll = rng.at(`${id}:hype-roll`);
  if (roll < HYPE_MISREAD.gemChance) {
    // Overlooked. Low reputation hides a real ceiling.
    return clamp(Math.round(fairRead - rng.between(`${id}:hype-gem`, 6, HYPE_MISREAD.gemSwing)), 40, 99);
  }
  if (roll > 1 - HYPE_MISREAD.bustChance) {
    // Over-ranked. The rankings love him and the tape does not.
    return clamp(Math.round(fairRead + rng.between(`${id}:hype-bust`, 5, HYPE_MISREAD.bustSwing)), 40, 99);
  }
  return clamp(Math.round(fairRead + rng.between(`${id}:hype-noise`, -2.5, 2.5)), 40, 99);
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
    const potential = clamp(overall + 3 + tailedDraw(rng, `${id}:potential`, 12, 18, 0.1), overall, 99);
    const hype = prospectHype(rng, id, overall, potential);
    state.prospects[id] = {
      id,
      name: fictionalPersonName(nameStart + index, firstNameOffset, lastNameOffset),
      position,
      overall,
      potential,
      hype,
      workEthic: rng.between(`${id}:work-ethic`, 0.2, 1),
      ratings: createPlayerRatings(overall, position, rng, id),
      homeStateCode: homeProgram.stateCode,
      homeDivisionId: homeProgram.divisionId,
      reputation: hype >= 77 ? "ELITE" : hype >= 72 ? "NATIONAL" : hype >= 63 ? "REGIONAL" : "UNRANKED",
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
  // This compared nothing: any individual spotlight returned 1, for the
  // spotlighted player and everyone else alike. `SPOTLIGHT_INTENSITY.PLAYER` was
  // raised to 1.6 specifically to make concentrated work worth taking and had
  // never once been applied, which is why a season of dedicated development
  // measured 0.05 Overall against doing nothing at all.
  if (spotlight.target.type === "PLAYER") {
    return spotlight.target.playerId === player.id ? SPOTLIGHT_INTENSITY.PLAYER : 1;
  }
  return spotlight.target.position === player.position ? SPOTLIGHT_INTENSITY.POSITION : 1;
}

/**
 * Practice reps tire the roster. Without a cost, a maximum install every week
 * would be free and the reps dial would not be a decision.
 */
function applyPracticeFatigue(state: GameState): void {
  for (const programId of Object.keys(state.programs)) {
    const preparation = state.preparation?.[programId];
    if (!preparation) continue;
    const added = repsFatigue(preparation.offensiveReps + preparation.defensiveReps) / 2;
    if (added <= 0) continue;
    for (const player of Object.values(state.players)) {
      if (player.programId !== programId || player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
      player.fatigue = clamp(Number((player.fatigue + added).toFixed(1)), 0, 100);
    }
  }
}

function developPlayers(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  const rules = state.identity.balanceConfiguration.weeklyDevelopment;
  for (const player of Object.values(state.players)) {
    if (player.programId === null || player.eligibility.rosterStatus !== "SCHOLARSHIP" || player.overall >= player.potential || player.injuryWeeksRemaining > 0) continue;
    const fatigueModifier = clamp(1 - player.fatigue / 180, rules.fatigueFloor, 1);
    const program = state.programs[player.programId]!;
    const trainingModifier = 1 + Math.max(0, program.facilities.TRAINING - 1) * 0.04;
    const coachingModifier = 1 + staffContribution(state, program.id, "DEVELOP") / 150;
    const intensity = playerDevelopmentIntensity(state, player);
    const focus = projectedDevelopmentPayoff(state, player, player.developmentFocus, intensity);
    const ratingChanges: Partial<Record<PlayerRating, number>> = {};
    for (const [rating, actualChange] of Object.entries(focus.ratingChanges) as [PlayerRating, number][]) {
      player.ratings[rating] = clamp(Number(((player.ratings[rating] ?? 50) + actualChange).toFixed(2)), 32, 99);
      ratingChanges[rating] = actualChange;
    }
    // Overall is not grown by its own formula any more — it *is* the attributes.
    // The old code moved five sub-ratings and separately grew `overall`, linked
    // only by a fudge factor, so what a player chose to develop barely moved the
    // number he cared about. Now the week's work lands on attributes and Overall
    // follows by definition.
    // Intensity is what the development spotlight buys, so it has to reach the
    // number the player watches. Before, it moved only the sub-ratings while
    // `overall` grew on its own — so concentrating a week on one man did nothing
    // visible. Now that Overall *is* the attributes, intensity scales the growth.
    const gain = clamp(
      (rules.base + player.workEthic * rules.workEthicWeight + rng.between(player.id, -0.01, 0.01))
        * fatigueModifier * trainingModifier * coachingModifier * Math.max(0.25, intensity),
      0,
      rules.maximum * 2.5
    );
    const previousOverall = player.overall;
    const headroom = Math.max(0, player.potential - previousOverall);
    if (headroom > 0) {
      // Spread the week's growth across the position's attributes in proportion
      // to what the focus asked for, then let Overall fall out of them.
      const group = attributesFor(player.position);
      // Weights sum to one, so adding the same amount to every attribute moves
      // Overall by exactly that amount. Dividing by the group size would make
      // Overall grow five times slower than the gain says it does.
      const share = Math.min(gain, headroom);
      for (const attribute of group) {
        player.ratings[attribute.key] = clamp(
          Number(((player.ratings[attribute.key] ?? 50) + share).toFixed(3)), 32, 99
        );
      }
    }
    player.overall = clamp(computeOverall(player.position, player.ratings), 32, player.potential);
    player.fatigue = clamp(Number((player.fatigue + focus.fatigueChange).toFixed(1)), 0, 100);
    if (player.overall !== previousOverall) events.push({ type: "PLAYER_DEVELOPED", season: state.season, week: state.week, playerId: player.id, previousOverall, newOverall: player.overall, factors: { workEthic: player.workEthic, fatigueModifier, focus: player.developmentFocus, ratingChanges } });
  }
}

/**
 * The four ratings a game is resolved against, before the game plan is applied.
 * Exposed so the roster and game-plan screens can show what a decision moves.
 */
export function programUnitRatings(state: Readonly<GameState>, programId: string): TeamUnitRatings {
  const rotation = activeRotation(state, programId);
  return unitRatingsFromLineup(rotation.players, gamePrepBonus(state, programId), rotation.shares);
}

/**
 * The five decisions the player settles before advancing, each with its current
 * value and a flag when something has changed enough to deserve a fresh look.
 *
 * Everything persists week to week deliberately. Forcing all five to be re-entered
 * every week would be two hundred identical decisions a career; the value is in
 * knowing *which* one has gone stale.
 */
export function weeklyDecisions(state: Readonly<GameState>, programId: string): DecisionAlert[] {
  const program = state.programs[programId];
  if (!program) return [];
  const game = state.schedule.find((item) =>
    item.week === state.week && !item.played && (item.homeProgramId === programId || item.awayProgramId === programId)
  );
  const atHome = game?.homeProgramId === programId;
  const opponentId = game ? (atHome ? game.awayProgramId : game.homeProgramId) : null;
  const opponent = opponentId ? state.programs[opponentId] ?? null : null;
  const capacity = stadiumCapacity(program.facilities.STADIUM);
  const gate = projectGate(program, opponent, capacity, game?.matchupType === "MARQUEE");
  const plan = state.gamePlans?.[programId] ?? { ...DEFAULT_GAME_PLAN };
  const report = scoutingReport(state, programId);
  const spotlight = state.developmentSpotlights?.[programId] ?? null;

  const lastHomeRecap = [...state.eventHistory]
    .reverse()
    .find((event): event is Extract<GameEvent, { type: "WEEKLY_RECAP" }> =>
      event.type === "WEEKLY_RECAP" && event.programId === programId && event.homeGame && event.attendance > 0);

  const money = (value: number): string => `$${Math.round(value).toLocaleString()}`;
  const decisions: DecisionAlert[] = [];

  decisions.push({
    id: "TICKET_PRICE",
    label: "Ticket price",
    current: money(program.ticketPrice),
    detail: atHome
      ? `${gate.attendance.toLocaleString()} of ${capacity.toLocaleString()} seats at ${money(program.ticketPrice)} — ${money(gate.ticketRevenue)} gate. A comparable programme charges ${money(gate.fairPrice)}.`
      : `Away this week, so no gate. A comparable programme charges ${money(gate.fairPrice)}.`,
    attention: !atHome ? null
      : gate.soldOut && program.ticketPrice < gate.fairPrice
        ? `Sold out and under-priced — ${money(gate.fairPrice)} is what this matchup will bear.`
        : program.ticketPrice > gate.fairPrice * 1.15
          ? "Priced well above what this programme's standing supports; the stands and the goodwill are both thinning."
          : lastHomeRecap && gate.attendance < lastHomeRecap.attendance * 0.9
            ? `Projected attendance is down on the ${lastHomeRecap.attendance.toLocaleString()} who came last time.`
            : null
  });

  decisions.push({
    id: "ADVERTISING",
    label: "Advertising",
    current: program.advertisingSpend > 0 ? `${money(program.advertisingSpend)}/wk` : "None",
    detail: `Reaching ${gate.advertisingFans.toLocaleString()} new followers a week${atHome ? ` and ${advertisingReach(program.advertisingSpend).attendance.toLocaleString()} extra through the gate` : ""}.`,
    attention: program.advertisingSpend === 0 && program.fanBase < capacity * 1.4
      ? "The stadium is bigger than the following. Marketing is the cheapest way to fill it."
      : program.advertisingSpend > program.budget * 0.25
        ? "Marketing is eating a quarter of the budget."
        : null
  });

  const candidates = developmentCandidates(state, programId);
  const spotlightName = spotlight?.target.type === "PLAYER"
    ? state.players[spotlight.target.playerId]?.name ?? "a player"
    : spotlight?.target.type === "POSITION" ? `the ${spotlight.target.position} room` : null;
  decisions.push({
    id: "DEVELOPMENT",
    label: "Development focus",
    current: spotlightName ?? "Nobody",
    detail: candidates.length
      ? `${candidates.map((candidate) => `${candidate.name} (${candidate.headline.toLowerCase()})`).join(", ")}.`
      : "No eligible players this week.",
    attention: spotlight ? null : "Nobody is being developed this week."
  });

  // The weekly offensive and defensive calls are gone: every emphasis axis is a
  // property of the scheme, so a program never chooses to stop being itself. What
  // remains a weekly decision is where the coaching hours go and what the file on
  // this opponent is worth, which is the scouting board's job rather than a
  // strategy dropdown.
  const filePoints = opponent ? state.dossiers?.[programId]?.[opponent.id] ?? 0 : 0;
  decisions.push({
    id: "SCOUTING",
    label: "Scouting this opponent",
    current: readinessNote(filePoints),
    detail: opponent
      ? `${opponent.name}${report.identity ? ` — a ${OFFENSIVE_IDENTITY_LABELS[report.identity.offense].toLowerCase()} programme` : ", unscouted"}.`
      : "No opponent scheduled.",
    attention: !opponent ? null
      : filePoints <= 0 ? "Your guys go into this one cold. A file is worth about a home game."
        : null
  });

  return decisions;
}

/** Replacements available for a post, with what each costs and changes. */
export function staffCandidatesFor(state: Readonly<GameState>, programId: string, staffId: string) {
  const nameRng = new AddressableRng(state.identity.rootSeed).fork("league-generation", "fictional-names");
  const firstNameOffset = Math.floor(nameRng.between("first-offset", 0, 96));
  const lastNameOffset = Math.floor(nameRng.between("last-offset", 0, 160));
  return staffCandidates(state, programId, staffId, (ordinal) =>
    fictionalPersonName(200_000 + ordinal, firstNameOffset, lastNameOffset));
}

/** The posted modifiers on a staff card. */
export function staffCardModifiers(member: Pick<StaffMember, "rating" | "role">) {
  return staffModifiers(member);
}

/** What this program currently knows about the week's opponent. */
export function scoutingReport(state: Readonly<GameState>, programId: string): OpponentScoutingReport {
  return opponentScoutingReport(state, programId, { unitRatings: (id) => programUnitRatings(state, id) });
}

/**
 * The scouting board: every opponent left on the schedule, the file built so
 * far, and what beating them is worth. This is the screen that makes forward
 * allocation a decision — a file on a top-ten side in six weeks can be started
 * now, and a file on the hundredth-ranked team probably should not be started
 * at all.
 */
export function scoutingBoard(state: Readonly<GameState>, programId: string): OpponentDossier[] {
  return upcomingDossiers(state, programId, (opponentId, points) =>
    scoutingConfidence(state, programId, filmGamesAvailable(state, opponentId), points));
}

/**
 * What needs the coach this week, worst first. The one screen a management game
 * has to get right is the one that answers "what do I do now".
 */
export function weeklyBriefing(state: Readonly<GameState>, programId: string): BriefingItem[] {
  return buildBriefing(state, programId, scoutingBoard(state, programId));
}

/**
 * This week's four matchups for a program.
 *
 * The opponent's side is only filled in once the personnel report has been
 * bought, and then from the scouted range rather than the true rating. Handing
 * over exact opposing ratings for free would give away the very thing scouting
 * exists to sell.
 */
export function projectGamePlan(state: Readonly<GameState>, programId: string): UnitEdge[] {
  const report = scoutingReport(state, programId);
  const opponentId = report.opponentProgramId;
  const scoutedUnits = report.units;
  let opponentUnits: TeamUnitRatings | null = null;
  if (opponentId && scoutedUnits) {
    opponentUnits = Object.fromEntries(scoutedUnits.map((unit) => [unit.unit, (unit.low + unit.high) / 2])) as TeamUnitRatings;
  }
  return projectUnitEdges(
    programUnitRatings(state, programId),
    state.gamePlans?.[programId] ?? { ...DEFAULT_GAME_PLAN },
    opponentUnits,
    // Their plan is only knowable through the game-plan report, and even then as
    // likelihoods — so the matchup projection never assumes a specific call.
    opponentUnits && opponentId ? { ...DEFAULT_GAME_PLAN } : null
  );
}

/** A single comparable number, kept for rankings and roster pressure checks. */
function teamStrength(state: Readonly<GameState>, program: Program): number {
  const lineup = activeLineup(state, program.id);
  if (lineup.length === 0) return 40;
  return overallStrength(programUnitRatings(state, program.id));
}

/**
 * What the staff's preparation hours are worth on the field, applied to every
 * unit. A coach who gives half his week to preparing the team delivers half of
 * what he would if that were all he did — which is the cost of asking him to
 * scout or recruit as well.
 */
function gamePrepBonus(state: Readonly<GameState>, programId: string): number {
  return staffContribution(state, programId, "PREPARE") / 100;
}

/** What one coach would add to every unit if preparation were his whole week. */
export function gamePrepContribution(member: Pick<StaffMember, "rating" | "role">): number {
  return member.rating * roleFit(member.role, "PREPARE") / 100;
}

function recoverPlayers(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  for (const program of Object.values(state.programs)) {
    const strengthCoach = programStrengthCoachBenefits(state, program.id);
    const allocatedRecovery = staffContribution(state, program.id, "RECOVER") / 30;
    const fatigueRecovery = allocatedRecovery + strengthCoach.fatigueRecoveryPoints;
    for (const player of Object.values(state.players).filter((candidate) => candidate.programId === program.id && candidate.eligibility.rosterStatus === "SCHOLARSHIP")) {
      player.fatigue = clamp(Number((player.fatigue - fatigueRecovery).toFixed(1)), 0, 100);
      if (player.injuryWeeksRemaining <= 0) continue;
      const extraRecovery = rng.at(`${player.id}:strength-coach:extra-recovery`)
        < strengthCoach.extraRecoveryChancePercent / 100 ? 1 : 0;
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
    const preventionModifier = clamp(1 - (ratingByRole(player.position, player.ratings, "DURABILITY") - 50) / 160, 0.55, 1.15);
    const fatigueModifier = 1 + player.fatigue / 80;
    const strengthTrainingModifier = player.developmentFocus === "STRENGTH" ? 1.2 : 1;
    const strengthCoach = programStrengthCoachBenefits(state, player.programId);
    const coachPreventionModifier = 1 - strengthCoach.injuryRiskReductionPercent / 100;
    const risk = clamp(0.0035 * preventionModifier * fatigueModifier * strengthTrainingModifier * coachPreventionModifier, 0.001, 0.02);
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

function teamSide(state: Readonly<GameState>, programId: string, opponentProgramId?: string): TeamSide {
  // A file on *this* opponent is worth points on the board. That is the whole
  // payoff of the department now: readiness, not a prompt to change your call.
  const filePoints = opponentProgramId ? state.dossiers?.[programId]?.[opponentProgramId] ?? 0 : 0;
  const rotation = activeRotation(state, programId);
  return {
    programId,
    lineup: rotation.players,
    snapShares: rotation.shares,
    plan: state.gamePlans?.[programId] ?? { ...DEFAULT_GAME_PLAN },
    prepBonus: gamePrepBonus(state, programId) + scoutingReadiness(filePoints),
    execution: {
      offense: planExecution(state, programId, "OFFENSE"),
      defense: planExecution(state, programId, "DEFENSE")
    }
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
    teamSide(state, homeProgramId, awayProgramId),
    teamSide(state, awayProgramId, homeProgramId),
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
      offensiveExecution: side.executed.offense,
      defensiveExecution: side.executed.defense,
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

/**
 * How many of one room a program's scheme puts on the field. Shared by roster
 * generation and the lineup so the two cannot disagree about what a room is for.
 */
function startersForRoom(identity: Readonly<SchemeIdentity> | undefined, position: Position): number {
  return Math.max(1, Math.ceil(spotsForRoom(identity, position)));
}

/**
 * The players a program actually starts, for anything that wants to describe the
 * team rather than the depth chart. Rooms carry a real developmental tail now, so
 * a roster-wide average is mostly walk-ons: measured, a low-tier roster means
 * 54.5 while the eleven who play mean 67.9. The second number is the one the
 * engine resolves games with and the only one worth showing a player.
 */
export function startingLineup(state: Readonly<GameState>, programId: string): Player[] {
  return activeLineup(state, programId);
}

/**
 * Who takes snaps, and for what fraction of the game. Both sides put eleven on
 * the field on an average play, but roughly twenty men are used getting there —
 * the defensive line and the backfield rotate hard, the offensive line and the
 * quarterback never come off.
 */
export function activeRotation(
  state: Readonly<GameState>,
  programId: string
): { players: Player[]; shares: Record<string, number> } {
  const chart = activeDepthChart(state, programId);
  const identity = state.programs[programId]?.schemeIdentity;
  const players: Player[] = [];
  const shares: Record<string, number> = {};
  for (const position of Object.keys(chart) as Position[]) {
    const spots = spotsForRoom(identity, position);
    if (spots <= 0) continue;
    const room = chart[position]
      .map((playerId) => state.players[playerId])
      .filter((player): player is Player => Boolean(player));
    const allocation = snapShares(position, spots, room.length);
    for (let index = 0; index < allocation.length; index += 1) {
      const player = room[index];
      const share = allocation[index] ?? 0;
      if (!player || share < MINIMUM_SNAP_SHARE) continue;
      players.push(player);
      shares[player.id] = share;
    }
  }
  return { players, shares };
}

function activeLineup(state: Readonly<GameState>, programId: string): Player[] {
  return activeRotation(state, programId).players;
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
    const capacity = stadiumCapacity(program.facilities.STADIUM);
    // Price and marketing decide the gate. Advertising still buys followers on a
    // bye or on the road, but there is no ticket revenue without a home game.
    const playedAtHome = Boolean(homeGame && game?.played);
    const gate = projectGate(program, opponent, capacity, marqueeGame);
    // Marketing sells tickets to a home game. On the road there is no gate to
    // fill, so the spend does not happen and is not charged.
    const advertisingFans = playedAtHome ? gate.advertisingFans : 0;
    const goodwill = pricingGoodwill(program.ticketPrice, fairTicketPrice(program, opponent, marqueeGame), program.fanElasticity ?? 1);
    // Over-pricing costs followers, not merely a satisfaction score — otherwise
    // gouging is free and the price decision has only an upside.
    const goodwillFanLoss = goodwill < 0 ? Math.round(fansBefore * goodwill * 0.002) : 0;
    // Character decides how hard the base swings on a result. A diehard support
    // barely moves either way; a front-running one empties out and floods back.
    const elasticResultChange = Math.round(teamResultFanChange * (program.fanElasticity ?? 1));
    const fanChange = elasticResultChange + brandImpact.schoolFanLift + advertisingFans + goodwillFanLoss;
    program.fanBase = Math.max(5_000, program.fanBase + fanChange);
    program.fanSupport = clamp(
      Math.round(program.fanSupport + fanChange / Math.max(1, fansBefore) * 35 + goodwill),
      1,
      100
    );
    program.localPress = clamp(program.localPress + localPressChange, 0, 100);
    program.nationalPress = clamp(program.nationalPress + nationalPressChange, 0, 100);

    const attendance = playedAtHome ? gate.attendance : 0;
    const ticketRevenue = playedAtHome ? gate.ticketRevenue : 0;
    const concessionRevenue = playedAtHome ? gate.concessionRevenue : 0;
    const revenue = program.weeklyRevenue + ticketRevenue + concessionRevenue;
    const staffPayroll = Object.values(state.staff).filter((staff) => staff.programId === program.id).reduce((sum, staff) => sum + staff.salary / 52, 0);
    const expenses = Math.round(program.weeklyExpenses + staffPayroll + (playedAtHome ? program.advertisingSpend : 0));
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
      teamResultFanChange: elasticResultChange,
      playerFanLift: brandImpact.schoolFanLift,
      featuredPlayerId: brandImpact.featuredPlayerId,
      featuredPlayerRating: brandImpact.featuredPlayerRating,
      attendance,
      capacity,
      ticketPrice: program.ticketPrice,
      fairTicketPrice: gate.fairPrice,
      advertisingSpend: program.advertisingSpend,
      advertisingFans,
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
  // Fold the season that just finished. Per-game rows are the growth term in
  // both memory and the save file — about 2,300 a week at full league size —
  // and nothing after the season is over reads them individually. Done before
  // the season counter moves, so `state.season` is still the season being folded.
  state.playerSeasonStats ??= [];
  const folded = foldSeasonStats(state.playerGameStats, state.season);
  if (folded.length > 0) {
    state.playerSeasonStats.push(...folded);
    state.playerGameStats = state.playerGameStats.filter((row) => row.season !== state.season);
    events.push({
      type: "SEASON_STATS_ARCHIVED",
      season: state.season,
      week: state.week,
      players: folded.length,
      rowsFolded: folded.reduce((total, line) => total + line.games, 0)
    });
  }
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
