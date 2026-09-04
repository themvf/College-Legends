import type { OffseasonStep, PortalListingState, Recruitable, WeekFocus, AwardCandidate, DecisionAlert, DefensiveIdentity, DepthChart, GamePlan, InjurySeverity, MatchupOutcome, OffensiveIdentity, OpponentScoutingReport, PlayerInjury, SchemeIdentity, ScoutingTier, TeamUnit, TeamUnitRatings, DevelopmentFocus, DivisionId, FacilityType, GameCommand, GameEvent, GameState, Player, PlayerGameStatLine, PlayerMediaAction, PlayerRating, PlayerRatings, PlayoffSeed, Position, PostseasonGame, PostseasonRound, Program, Prospect, ProspectScoutingState, RecruitPriority, RecruitingEvaluation, RecruitingProgramState, RecruitingSearchType, SeasonAward, SeasonAwardType, SeasonHistory, SimulationResult, StaffFocus, StaffMember, StaffRole, OpponentDossier } from "@college-legends/model";
import type { DecisionActor, DecisionAuditRecord, DecisionItem, DecisionKnowledgeSnapshot, DecisionRecord, StandingDecisionResult } from "@college-legends/model";
import { DEFAULT_BALANCE, FICTIONAL_PROGRAMS, fictionalPersonName, PROGRAM_CHARACTERS } from "@college-legends/content";
import { AddressableRng } from "./rng.js";
import { createDecisionAudit, createDecisionProjection, decisionCommandKey, internDecisionKnowledge, retainedDecisionAudits, retainedDecisionEventHistory, retainedDecisionKnowledge, submitDecisionProjection } from "./decisions.js";
import { attributeByRole, attributesFor, computeOverall, ratingByRole, type AttributeDefinition } from "./attributes.js";
import { weeklyBriefing as buildBriefing, type BriefingItem, type BriefingOptions } from "./briefing.js";
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
import { activeSponsorship, advertisingReach, createSponsorshipProgramState, DEFENSIVE_PRESETS, developmentCandidates, fairTicketPrice, matchingPreset, MAXIMUM_TICKET_PRICE, MAXIMUM_WEEKLY_ADVERTISING, MINIMUM_TICKET_PRICE, OFFENSIVE_PRESETS, pricingGoodwill, projectGate, projectSponsorshipOffer, sponsorshipMarketValue, sponsorshipPayment } from "./business.js";
import { MAXIMUM_REPS_PER_SIDE, TRAINING_CAMP_CONDITIONING_RISK, TRAINING_CAMP_INSTALL_BONUS, TRAINING_CAMP_INSTALL_RISK, TRAINING_CAMP_WEEKS, planExecution, repsFatigue, staffBuyout, staffCandidates, staffModifiers, staffSalary } from "./installation.js";
import { foldSeasonStats } from "./persistence.js";
import { jobReview, startingSecurity } from "./tenure.js";
import { mediaRights, operatingCost } from "./economy.js";
import { advertisingCredit, applyBooster, boosterDueThisWeek, buildBoosterOffer, takeawayMultiplier } from "./boosters.js";
import { committedNilTotal, emptyNilState, freeNilCapacity, nilAskingPrice, nilScore, reservedNilTotal, weeklyDonorCapacity, NIL_WITHDRAWAL_INTEREST_PENALTY } from "./nil.js";
import {
  portalAskingPrice,
  portalNilScore,
  portalPriorityWeight,
  portalRecruitable,
  reservedPortalNil,
  PORTAL_COMMITMENT_THRESHOLD,
  PORTAL_INCUMBENT_BONUS,
  PORTAL_MINIMUM_POINTS
} from "./portal.js";

export {
  committedNilTotal,
  emptyNilState,
  freeNilCapacity,
  NIL_BASE_PRICE,
  NIL_DOLLARS_PER_THOUSAND_FANS,
  NIL_SCORE_CEILING,
  NIL_TITLE_ANNUITY,
  NIL_WITHDRAWAL_INTEREST_PENALTY,
  nilAskingPrice,
  nilAskingPriceRange,
  nilPriorityWeight,
  nilScore,
  nilState,
  reservedNilTotal,
  weeklyDonorCapacity
} from "./nil.js";

export {
  portalAskingPrice,
  portalListings,
  portalNilScore,
  portalPriorityWeight,
  portalRecruitable,
  reservedPortalNil,
  PORTAL_COMMITMENT_THRESHOLD,
  PORTAL_INCUMBENT_BONUS,
  PORTAL_MINIMUM_POINTS
} from "./portal.js";
export {
  expectedWins,
  jobReview,
  jobVerdict,
  jobVerdictLabel,
  startingSecurity,
  CHAMPIONSHIP_BONUS,
  DISMISSAL_THRESHOLD,
  FIRST_YEAR_DISCOUNT,
  INSOLVENCY_PENALTY,
  MANDATE_FAILURE_PENALTY,
  PLAYOFF_BONUS,
  WIN_WEIGHT
} from "./tenure.js";
export type { JobReview } from "./tenure.js";
export {
  facilityUpkeep,
  facilityUpkeepIncrease,
  mediaRights,
  operatingCost,
  CONFERENCE_FLOOR,
  OPERATING_SHARE,
  FACILITY_UPKEEP_EXPONENT,
  FACILITY_UPKEEP_UNIT,
  MEDIA_PER_CHAMPIONSHIP,
  MEDIA_PER_PRESS_POINT,
  MEDIA_PER_PRESTIGE_POINT,
  SQUAD_COST_PER_SCHOLARSHIP,
  STADIUM_COST_PER_SEAT
} from "./economy.js";
export type { MediaRights, OperatingCost } from "./economy.js";

export {
  advertisingCredit,
  boosterDueThisWeek,
  BOOSTER_INTERVAL,
  BOOSTER_KIND_LABELS,
  buildBoosterOffer,
  latestBoosterOffer,
  LEGEND_OVERALL_GAIN,
  LEGEND_POSITIONS,
  pendingBoosterOffer,
  POSITION_ROOM_LABELS,
  takeawayMultiplier,
  TAKEAWAY_BOOST
} from "./boosters.js";

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
export { weeklyStories } from "./stories.js";
export type { WeeklyStory } from "./stories.js";

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
  projectSponsorshipOffer,
  sponsorshipMarketValue,
  sponsorshipPayment,
  activeSponsorship,
  ticketDemandMultiplier
} from "./business.js";
export type { GateProjection, SponsorshipPayment, SponsorshipProjection, StrategyPreset } from "./business.js";
export { BUYOUT_SALARY_FRACTION, MAXIMUM_REPS_PER_SIDE, TRAINING_CAMP_CONDITIONING_RISK, TRAINING_CAMP_INSTALL_BONUS, TRAINING_CAMP_INSTALL_RISK, TRAINING_CAMP_WEEKS, planExecution, planInstaller, repsFatigue, staffBuyout, staffCard, staffModifiers, staffSalary } from "./installation.js";
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
export {
  canTransitionDecisionStatus,
  createDecisionAudit,
  createDecisionProjection,
  DECISION_AUDIT_LIMIT,
  decisionCommandKey,
  decisionKnowledgeFor,
  decisionKnowledgeId,
  internDecisionKnowledge,
  retainedDecisionKnowledge,
  submitDecisionProjection
} from "./decisions.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const clone = <T>(value: T): T => structuredClone(value);

/**
 * State transitions are immutable, but completed stat rows and historical
 * events are append-only values. Deep-cloning tens of thousands of those rows
 * every week made a 72-team season progressively slower. Clone the live,
 * mutable graph and copy the append-only arrays instead.
 */
function cloneGameState(value: Readonly<GameState>): GameState {
  const { playerGameStats, playerSeasonStats, decisionAudits = [], eventHistory, ...mutable } = value;
  const state = structuredClone({
    ...mutable,
    playerGameStats: [],
    playerSeasonStats: [],
    decisionAudits: [],
    eventHistory: []
  }) as GameState;
  state.playerGameStats = [...playerGameStats];
  state.playerSeasonStats = [...(playerSeasonStats ?? [])];
  state.decisionAudits = [...decisionAudits];
  state.eventHistory = [...eventHistory];
  return state;
}

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

/** The minimum viable room carried into a season after late signing. */
export const ROSTER_MINIMUMS: Readonly<Record<Position, number>> = Object.fromEntries(
  (Object.entries(ROSTER_COMPOSITION) as [Position, number][]).map(([position, target]) => [position, Math.ceil(target * 0.75)])
) as Record<Position, number>;

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
/**
 * What a bare scholarship offer is worth in `recruitingScore` — small on
 * purpose. It is a signal that you want him, not a substitute for pursuit
 * points, a visit, or NIL money: pursuit points alone contribute up to
 * ~18.75 at the cap, NIL up to 14, fit up to 35.
 */
export const OFFER_SCORE_BONUS = 3;
/** A handful of visit weekends a year, shared across the whole board. */
export const MAX_VISITS_PER_SEASON = 6;
/** Priced above a single evaluation, below a full pursuit-points push. */
export const VISIT_COST = 20;
/**
 * What a visit is worth at the low end (poor fit) rising toward the high end
 * (excellent fit) — see `visitScore`. Never dominates just buying more
 * pursuit points, never worthless either.
 */
export const VISIT_BASE_BONUS = 6;
/**
 * A verbal commitment is contestable before this week, echoing the real
 * early-signing window landing before the season's back half. At this week,
 * every still-`COMMITTED` prospect locks to `SIGNED` and a first commitment
 * made at or after this week signs immediately — there is no more time left
 * to flip him anyway.
 */
export const SIGNING_WEEK = 12;
/**
 * The real social and emotional cost of backing out on a program, added only
 * to the incumbent's own score in a contest for a man already `COMMITTED` to
 * them. A rival needs a real, stated edge to flip him, not a marginal one.
 */
export const COMMITMENT_INERTIA_BONUS = 6;
/**
 * A season's worth of a division's earned standing decays by this fraction
 * before that season's new contributors are added — slow, so a couple of
 * quiet years does not erase what a program built.
 */
export const PIPELINE_DECAY_RATE = 0.85;
/** What one qualifying contributor is worth, added at rollover. */
export const PIPELINE_GAIN_PER_CONTRIBUTOR = 1;
/**
 * The ceiling on the pipeline bonus folded into `CLOSE_TO_HOME` — small on
 * purpose, since the flat home-division bias is already 95 of a possible 100.
 */
export const PIPELINE_MAX_BONUS = 5;
/** Games played this season at which a signed player counts as a real contributor. */
export const PIPELINE_CONTRIBUTOR_GAMES = 6;
/** Or a brand milestone reached without necessarily starting every week. */
export const PIPELINE_CONTRIBUTOR_STARDOM = 30;

/**
 * A visit pays more where the program actually fits what the recruit is
 * looking for, and each repeat visit to the same man is worth half the last —
 * nobody should spend the whole season's cap chasing one recruit.
 */
export function visitScore(fit: number, visitsAlreadyUsed: number): number {
  const perVisit = VISIT_BASE_BONUS * (0.5 + clamp(fit, 0, 100) / 200);
  return Number((perVisit * 0.5 ** visitsAlreadyUsed).toFixed(3));
}

/** Every visit paid for so far, summed — what `recruitingScore` actually reads. */
export function totalVisitScore(fit: number, visitsUsed: number): number {
  let total = 0;
  for (let visit = 0; visit < visitsUsed; visit += 1) total += visitScore(fit, visit);
  return Number(total.toFixed(3));
}

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
  athleticAttributes: { label: string; range: string }[];
  positionSkill: string;
  positionAttributes: { label: string; range: string }[];
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
  const structuredBand = (role: Parameters<typeof attributeByRole>[1]): { label: string; range: string } => {
    const definition = attribute(role);
    return { label: definition.label, range: estimate(prospect.ratings[definition.key] ?? 50, definition.key) };
  };
  const athleticAttributes = evaluations.has("ATHLETIC") ? [structuredBand("POWER"), structuredBand("SPEED")] : [];
  const positionAttributes = evaluations.has("POSITION") ? [structuredBand("PRIMARY"), structuredBand("SECONDARY")] : [];
  const athletic = athleticAttributes.length ? athleticAttributes.map((entry) => `${entry.label} ${entry.range}`).join(" · ") : "Unknown";
  const positionSkill = positionAttributes.length ? positionAttributes.map((entry) => `${entry.label} ${entry.range}`).join(" · ") : "Unknown";
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
    athleticAttributes,
    positionSkill,
    positionAttributes,
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
    ratingChanges: { technique: 0.05, strength: 0.05, conditioning: 0.5 },
    fatigueChange: -2,
    gameEffect: "Endurance sustains game performance and lowers this week's injury risk by 15%",
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
    season: 2027, week: 0, phase: "ROSTER_REVIEW", programs: {}, players: {}, prospects: {}, recruiting: {}, sponsorships: {}, developmentSpotlights: {}, gamePlans: {}, preparation: {}, weekFocus: {}, scoutingTarget: {}, dossiers: {}, boosters: {}, nil: {}, staff: {}, depthCharts: {}, playerGameStats: [], playerSeasonStats: [], schedule: [], seasonHistory: [], decisionAudits: [], decisionKnowledge: {}, eventHistory: []
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
      coachSecurity: startingSecurity(tier),
      coachTenure: 0,
      championshipDeadline: null,
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
      pipelineStrength: {},
      ticketPrice: tier === "POWER" ? 58 : tier === "MID" ? 42 : 28,
      advertisingSpend: 0,

      // Includes the full cost of operating an 85-man football program, not
      // only game-day bills. At these levels, a losing season is near break-even
      // and sustained winning, sponsorships and smart pricing create the margin.

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
      scoutingByProspect: {},
      offeredProspectIds: [],
      visitsUsedThisSeason: 0
    };
    state.developmentSpotlights[id] = null;
    state.gamePlans[id] = { ...DEFAULT_GAME_PLAN };
    state.preparation[id] = { points: 0, weeklyPoints: 0, scoutingPoints: 0, weeklyScoutingPoints: 0, offensiveReps: 0, defensiveReps: 0 };
    state.dossiers[id] = {};
    state.boosters[id] = { offer: null, advertisingCredit: 0, takeawayBoostWeek: null };
    state.nil![id] = emptyNilState();
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
        // An opening roster is mostly local by simplifying assumption — there
        // is no recruiting history to draw a real origin from.
        homeDivisionId: state.programs[id]!.divisionId,
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
        injury: null,
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
  ensureEmergencyQuarterbacks(state);
  updateNationalRankings(state);
  const actualProgramCount = selectedPrograms.length;
  generateProspects(state, rng.fork("prospects"), actualProgramCount * 30, "initial", actualProgramCount * (STARTING_ROSTER_SIZE + STAFF_ROLES.length), firstNameOffset, lastNameOffset);
  initializeRecruitingBoards(state, rng.fork("initial-recruiting-boards"));
  buildSeasonSchedule(state);
  refreshSponsorshipOffers(state);
  return state;
}

function refreshSponsorshipOffers(state: GameState): void {
  state.sponsorships ??= {};
  for (const program of Object.values(state.programs)) {
    state.sponsorships[program.id] = createSponsorshipProgramState(program, state.season);
  }
}

function ensureSponsorshipOffers(state: GameState): void {
  state.sponsorships ??= {};
  for (const program of Object.values(state.programs)) {
    const current = state.sponsorships[program.id];
    if (!current || current.season !== state.season) {
      state.sponsorships[program.id] = createSponsorshipProgramState(program, state.season);
    }
  }
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
  const state = cloneGameState(input);
  ensureSponsorshipOffers(state);
  if (state.phase === "ROSTER_REVIEW") {
    const events: GameEvent[] = [];
    for (const command of commands) {
      if (command.type === "SCHEDULE_MARQUEE_HOME_GAME") {
        scheduleMarqueeHomeGame(state, command.programId, command.opponentProgramId, events);
      } else if (command.type === "ACCEPT_SPONSORSHIP") {
        resolveCommands(
          state,
          [command],
          new AddressableRng(state.identity.rootSeed).fork("preseason-sponsorship", String(state.season)),
          events
        );
      } else if (command.type === "SET_DEPTH_CHART") {
        applyDepthChartCommand(state, command, events);
      } else if (command.type === "SET_REDSHIRT" || command.type === "RED_SHIRT") {
        applyRedshirtCommand(state, command, events);
      } else {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Only sponsorship, depth-chart, redshirt, and preseason scheduling decisions can be made before the season begins." });
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

export function advanceWeek(
  input: Readonly<GameState>,
  commands: readonly GameCommand[] = [],
  deferStandingClosure = false
): SimulationResult {
  const state = cloneGameState(input);
  if (state.phase !== "REGULAR_SEASON") {
    throw new Error("Review the opening roster and begin the season before advancing a week.");
  }
  state.developmentSpotlights ??= {};
  state.gamePlans ??= {};
  state.preparation ??= {};
  state.nil ??= {};
  normalizePlayerHealthState(state);
  ensureSponsorshipOffers(state);
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
  resolveSigningWeek(state, events);
  recoverPlayers(state);
  developPlayers(state, rng.fork("development"), events);
  applyPracticeFatigue(state);
  // Captured before the whistle, because these are what the week's priorities
  // actually bought. Saturday has to be able to name Monday.
  const focusInputs = captureFocusInputs(state);
  resolveScheduledGames(state, rng.fork("games"), events);
  const playerBrandImpact = processPlayerBrands(state, rng.fork("player-brands"), events);
  recoverInjuries(state, rng.fork("injury-recovery"), events);
  processInjuries(state, rng.fork("injuries"), events);
  processWeeklyRecapsAndFinances(state, playerBrandImpact, events);
  updateNationalRankings(state);
  if (state.week < 14) replenishRecruitingPoints(state, events);
  recordFocusPayoffs(state, focusInputs, events);
  // Camp covers the opening weeks and then stops. Ticked once a week rather
  // than held for the season, so it is a head start and not a standing buff.
  for (const camp of Object.values(state.trainingCamp ?? {})) {
    if (camp.weeksRemaining > 0) camp.weeksRemaining -= 1;
  }
  state.week += 1;
  // Entering the offseason defers preparation to `completeOffseason`: there is
  // no schedule to prepare against until the new one is built.
  if (state.week > 14) rolloverSeason(state, events);
  else refreshPreparation(state, events);
  if (!deferStandingClosure) closeStandingDecisionAudits(state, events);
  state.eventHistory.push(...events);
  if (state.eventHistory.length > 10_000) {
    state.eventHistory = retainedDecisionEventHistory(state.eventHistory, state.decisionAudits ?? [], 10_000);
  }
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
    offerBoosters(state, programId, events);
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
function latestEffectiveDecisionSubmission(
  state: Readonly<GameState>,
  command: Readonly<GameCommand>
): string | null {
  const key = decisionCommandKey(command);
  const latestEffective = [...(state.decisionAudits ?? [])].reverse().find((audit) =>
    audit.programId === command.programId
    && audit.commandType === command.type
    && audit.status === "DONE"
    && audit.commandKey === key);
  return latestEffective?.submissionId ?? null;
}

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
      weeklyPrioritySubmissionId: latestEffectiveDecisionSubmission(
        state,
        { type: "SET_WEEK_FOCUS", programId, focuses }
      ),
      scoutingTargetSubmissionId: latestEffectiveDecisionSubmission(
        state,
        { type: "SET_SCOUTING_TARGET", programId, opponentProgramId: captured.scoutedOpponentId }
      ),
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
 * Puts four people on the table, every third week.
 *
 * Cleared and rebuilt rather than accumulated: an offer is this week's, and a
 * player who ignores one does not find it stacked on top of the next. The RNG
 * path depends only on season, week and program, so the same career always meets
 * the same four people — reloading cannot re-roll them.
 */
function offerBoosters(state: GameState, programId: string, events: GameEvent[]): void {
  state.boosters ??= {};
  state.boosters[programId] ??= { offer: null, advertisingCredit: 0, takeawayBoostWeek: null };
  const boosters = state.boosters[programId]!;
  // A takeaway week is one game only, and the game it was bought for has been
  // played by the time this runs.
  if (boosters.takeawayBoostWeek !== null && boosters.takeawayBoostWeek < state.week) {
    boosters.takeawayBoostWeek = null;
  }
  if (!boosterDueThisWeek(state.week)) {
    if (boosters.offer && boosters.offer.week !== state.week) boosters.offer = null;
    return;
  }
  const rng = new AddressableRng(state.identity.rootSeed).fork("boosters", String(state.season), String(state.week));
  const offer = buildBoosterOffer(state, programId, rng);
  if (!offer) return;
  boosters.offer = offer;
  events.push({
    type: "BOOSTER_OFFERED",
    season: state.season,
    week: state.week,
    programId,
    options: offer.options.map((option) => ({ ...option }))
  });
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
  // Missing means the program has never chosen and receives the standing
  // default. An explicit empty array is a legal "chase nothing" decision; it
  // must remain empty so the UI's lost-capacity warning is simulation truth.
  if (!Array.isArray(stored)) {
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
  const state = cloneGameState(input);
  ensureSponsorshipOffers(state);
  const events: GameEvent[] = [];
  // Everything a coach settles *before* Saturday resolves here. Practice reps
  // belong with scouting: setting them and then being told you haven't
  // practised until you advance the week is exactly the confusion this phase
  // exists to prevent.
  const preparationCommands = commands.filter((command) =>
    command.type === "ALLOCATE_SCOUTING" || command.type === "SET_SCHEME"
    || command.type === "REPLACE_STAFF" || command.type === "SET_PRACTICE_REPS"
    || command.type === "SET_STAFF_ALLOCATION" || command.type === "SET_WEEK_HOURS"
    || command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET"
    || command.type === "CHOOSE_BOOSTER");
  if (preparationCommands.length > 0) {
    resolveCommands(state, preparationCommands, new AddressableRng(state.identity.rootSeed).fork("preparation", String(state.season), String(state.week)), events);
  }
  state.eventHistory.push(...events);
  if (state.eventHistory.length > 10_000) {
    state.eventHistory = retainedDecisionEventHistory(state.eventHistory, state.decisionAudits ?? [], 10_000);
  }
  return { state, events };
}

/**
 * The first shared decision integration: weekly priorities and scouting use the
 * exact GameCommand path they used before, with actor and knowledge attribution
 * added around it. New decision surfaces should expand this command union only
 * after their accepted path emits a causal domain event.
 */
export type WeeklyPlanningCommand = Extract<
  GameCommand,
  { type: "SET_WEEK_FOCUS" | "SET_SCOUTING_TARGET" }
>;

export interface DecisionSimulationResult extends SimulationResult {
  audit: DecisionAuditRecord;
}

export interface DecisionBatchSimulationResult extends SimulationResult {
  audits: DecisionAuditRecord[];
}

export type DelegationPolicyId = "WEEKLY_PLANNING";
export type DelegatedWeeklyPlanningDomain = "WEEK_FOCUS" | "SCOUTING_TARGET";

const RETIRED_COMPATIBILITY_COMMAND_TYPES = new Set<GameCommand["type"]>([
  "RED_SHIRT",
  "SET_GAME_PLAN",
  "SET_WEEK_HOURS",
  "SET_STAFF_ALLOCATION",
  "SET_PRACTICE_REPS",
  "ALLOCATE_SCOUTING",
  "CONTINUE_OFFSEASON"
]);

function commandDecisionSlot(command: Readonly<GameCommand>): string {
  switch (command.type) {
    case "OFFER_PROSPECT":
    case "SCHEDULE_VISIT":
    case "INVEST_RECRUITING_POINTS":
    case "SET_NIL_OFFER":
      return `${command.type}:${command.prospectId}`;
    case "EVALUATE_PROSPECT":
      return `${command.type}:${command.prospectId}:${command.evaluation}`;
    case "SEARCH_PROSPECTS":
      return `${command.type}:${command.searchType}:${command.position ?? "ALL"}`;
    case "RED_SHIRT":
    case "SET_REDSHIRT":
      return `${command.type}:${command.playerId}`;
    case "SET_DEPTH_CHART":
      return `${command.type}:${command.position}`;
    case "SET_DEVELOPMENT_SPOTLIGHT":
    case "SET_PLAYER_MEDIA_ACTION":
      return command.type;
    case "UPGRADE_FACILITY":
      return `${command.type}:${command.facility}`;
    case "SET_STAFF_ALLOCATION":
    case "REPLACE_STAFF":
      return `${command.type}:${command.staffId}`;
    case "SET_WEEK_HOURS":
      return `${command.type}:${command.focus}`;
    case "SET_SCOUTING_TARGET":
    case "SET_WEEK_FOCUS":
    case "SET_GAME_PLAN":
    case "SET_TICKET_PRICE":
    case "SET_ADVERTISING":
    case "ACCEPT_SPONSORSHIP":
    case "SET_PRACTICE_REPS":
    case "CHOOSE_BOOSTER":
    case "SET_SCHEME":
    case "CONTINUE_OFFSEASON":
    case "SET_TRAINING_CAMP_FOCUS":
    case "SCHEDULE_MARQUEE_HOME_GAME":
      return command.type;
    case "ALLOCATE_SCOUTING":
      return `${command.type}:${command.opponentProgramId}`;
    case "BID_PORTAL_PLAYER":
      return `${command.type}:${command.playerId}`;
  }
}

function commandDecisionDomain(command: Readonly<GameCommand>): "FOOTBALL" | "FINANCE" | "ROSTER" | "DEVELOPMENT" | "STAFF" | "RECRUITING" | "RISK" {
  if (command.type === "SET_TICKET_PRICE" || command.type === "SET_ADVERTISING"
    || command.type === "ACCEPT_SPONSORSHIP" || command.type === "UPGRADE_FACILITY") return "FINANCE";
  if (command.type === "SET_DEPTH_CHART" || command.type === "RED_SHIRT"
    || command.type === "SET_REDSHIRT" || command.type === "BID_PORTAL_PLAYER") return "ROSTER";
  if (command.type === "SET_DEVELOPMENT_SPOTLIGHT" || command.type === "SET_TRAINING_CAMP_FOCUS") return "DEVELOPMENT";
  if (command.type === "SET_STAFF_ALLOCATION" || command.type === "SET_WEEK_HOURS"
    || command.type === "SET_WEEK_FOCUS" || command.type === "REPLACE_STAFF") return "STAFF";
  if (command.type === "OFFER_PROSPECT" || command.type === "SCHEDULE_VISIT"
    || command.type === "SEARCH_PROSPECTS" || command.type === "EVALUATE_PROSPECT"
    || command.type === "INVEST_RECRUITING_POINTS" || command.type === "SET_NIL_OFFER") return "RECRUITING";
  return "FOOTBALL";
}

function genericDecisionKnowledge(state: Readonly<GameState>, command: Readonly<GameCommand>): DecisionKnowledgeSnapshot {
  return {
    programId: command.programId,
    season: state.season,
    week: state.week,
    phase: state.phase,
    facts: [
      {
        key: "calendar.week",
        value: state.week,
        source: "PUBLIC",
        entityId: null,
        observedSeason: state.season,
        observedWeek: state.week
      },
      {
        key: "command.type",
        value: command.type,
        source: "PROGRAM_INTERNAL",
        entityId: command.programId,
        observedSeason: state.season,
        observedWeek: state.week
      }
    ]
  };
}

/**
 * Engine-owned attribution envelope for non-delegated commands. The resolver
 * remains GameCommand; this adds no actor-specific legality path.
 */
export function createGameDecision<TCommand extends GameCommand>(
  state: Readonly<GameState>,
  command: TCommand,
  actor: Exclude<DecisionActor, { mode: "DELEGATED" }>,
  sequence?: number,
  knowledgeOverride?: DecisionKnowledgeSnapshot
): DecisionRecord<TCommand> {
  if (RETIRED_COMPATIBILITY_COMMAND_TYPES.has(command.type)) {
    throw new Error(`${command.type} is a retired compatibility command, not a live attributed decision.`);
  }
  if (actor.mode === "AI" && actor.actorId !== `ai:${command.programId}`) {
    throw new Error("An AI decision actor must belong to the command program.");
  }
  const knowledge = knowledgeOverride ?? genericDecisionKnowledge(state, command);
  if (knowledge.programId !== command.programId
    || knowledge.season !== state.season
    || knowledge.week !== state.week
    || knowledge.phase !== state.phase) {
    throw new Error("Decision knowledge must match the command program and current simulation boundary.");
  }
  const item: DecisionItem = {
    id: `command:${state.season}:${state.week}:${command.programId}:${commandDecisionSlot(command)}`,
    status: "REQUIRED",
    programId: command.programId,
    actor
  };
  const submissionSequence = sequence ?? (state.decisionAudits ?? [])
    .filter((audit) => audit.decisionId === item.id).length;
  const projection = createDecisionProjection(item, command, knowledge, () => [{
    key: "command-submission",
    domain: commandDecisionDomain(command),
    unit: "COMMAND",
    low: 1,
    high: 1,
    confidence: 1,
    source: command.type
  }]);
  return submitDecisionProjection(projection, {
    season: state.season,
    week: state.week,
    phase: state.phase,
    sequence: submissionSequence
  });
}

/**
 * Build the redacted submission envelope for the two weekly planning commands.
 * Callers provide an actor, never a second resolver. The projection callback
 * receives only this snapshot, so opponent ratings and other hidden state are
 * not available to the decision projection.
 */
export function createWeeklyPlanningDecision(
  state: Readonly<GameState>,
  command: WeeklyPlanningCommand,
  actor: DecisionActor,
  sequence?: number,
  knowledgeOverride?: DecisionKnowledgeSnapshot
): DecisionRecord<WeeklyPlanningCommand> {
  const item: DecisionItem = {
    id: `${command.type === "SET_WEEK_FOCUS" ? "weekly-priorities" : "scouting-target"}:${state.season}:${state.week}:${command.programId}`,
    status: actor.mode === "DELEGATED" ? "DELEGATED" : "REQUIRED",
    programId: command.programId,
    actor
  };
  const commonFacts: DecisionKnowledgeSnapshot["facts"] = [
    {
      key: "calendar.week",
      value: state.week,
      source: "PUBLIC",
      entityId: null,
      observedSeason: state.season,
      observedWeek: state.week
    }
  ];
  const facts: DecisionKnowledgeSnapshot["facts"] = command.type === "SET_WEEK_FOCUS"
    ? [...commonFacts, {
        key: "staff.focusCapacity",
        value: focusCapacity(state, command.programId).capacity,
        source: "PROGRAM_INTERNAL" as const,
        entityId: command.programId,
        observedSeason: state.season,
        observedWeek: state.week
      }]
    : [...commonFacts, {
        key: "scouting.currentDossierPoints",
        value: command.opponentProgramId === null
          ? 0
          : state.dossiers?.[command.programId]?.[command.opponentProgramId] ?? 0,
        source: "SCOUTED" as const,
        entityId: command.opponentProgramId,
        observedSeason: state.season,
        observedWeek: state.week
      }];
  const defaultKnowledge: DecisionKnowledgeSnapshot = {
    programId: command.programId,
    season: state.season,
    week: state.week,
    phase: state.phase,
    facts
  };
  const knowledge = knowledgeOverride ?? defaultKnowledge;
  if (knowledge.programId !== command.programId
    || knowledge.season !== state.season
    || knowledge.week !== state.week
    || knowledge.phase !== state.phase) {
    throw new Error("Decision knowledge must match the command program and current simulation boundary.");
  }
  const submissionSequence = sequence ?? (state.decisionAudits ?? []).filter((audit) =>
    audit.decisionId === item.id
    && audit.submittedAt.season === state.season
    && audit.submittedAt.week === state.week).length;
  const projection = createDecisionProjection(item, command, knowledge, () => command.type === "SET_WEEK_FOCUS"
    ? [{
        key: "selected-priorities",
        domain: "STAFF",
        unit: "PRIORITIES",
        low: command.focuses.length,
        high: command.focuses.length,
        confidence: 1,
        source: "SET_WEEK_FOCUS"
      }]
    : [{
        key: "scouting-target",
        domain: "FOOTBALL",
        unit: "ASSIGNMENT",
        low: command.opponentProgramId === null ? 0 : 1,
        high: command.opponentProgramId === null ? 0 : 1,
        confidence: 1,
        source: "SET_SCOUTING_TARGET"
      }]);
  return submitDecisionProjection(projection, {
    season: state.season,
    week: state.week,
    phase: state.phase,
    sequence: submissionSequence
  });
}

export interface DelegatedWeeklyPlanningAuthority {
  staffId: string;
  delegatedByActorId: string;
  policyId: DelegationPolicyId;
}

/**
 * Controlled production seam for delegation. V2 W3 may add policies later;
 * ARCH-001 authorizes only the program's head coach to own weekly planning.
 */
export function createDelegatedWeeklyPlanningDecision(
  state: Readonly<GameState>,
  command: WeeklyPlanningCommand,
  authority: DelegatedWeeklyPlanningAuthority,
  sequence?: number,
  selectionKnowledge?: DecisionKnowledgeSnapshot
): DecisionRecord<WeeklyPlanningCommand> {
  const staff = state.staff[authority.staffId];
  if (!staff || staff.programId !== command.programId) {
    throw new Error("Delegated staff must belong to the command program.");
  }
  if (authority.policyId !== "WEEKLY_PLANNING" || staff.role !== "HEAD_COACH") {
    throw new Error("That staff member is not authorized for the weekly planning policy.");
  }
  if (authority.delegatedByActorId !== `player:${command.programId}`) {
    throw new Error("Delegated weekly planning must be granted by the program's player actor.");
  }
  const actor: Extract<DecisionActor, { mode: "DELEGATED" }> = {
    mode: "DELEGATED",
    actorId: staff.id,
    displayName: staff.name,
    staffId: staff.id,
    delegatedByActorId: authority.delegatedByActorId,
    policyId: authority.policyId
  };
  const base = createWeeklyPlanningDecision(state, command, actor, sequence, selectionKnowledge);
  const knowledge: DecisionKnowledgeSnapshot = {
    ...base.knowledge,
    facts: [...base.knowledge.facts, {
      key: "delegation.authorization.v1",
      value: `${staff.id}:${authority.policyId}`,
      source: "PROGRAM_INTERNAL",
      entityId: staff.id,
      observedSeason: state.season,
      observedWeek: state.week
    }]
  };
  return createWeeklyPlanningDecision(state, command, actor, sequence, knowledge);
}

function isWeeklyPlanningDecision(
  decision: Readonly<DecisionRecord<GameCommand>>
): decision is DecisionRecord<WeeklyPlanningCommand> {
  return decision.command.type === "SET_WEEK_FOCUS" || decision.command.type === "SET_SCOUTING_TARGET";
}

function sameOrderedValues<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function eventMatchesAcceptedCommand(event: Readonly<GameEvent>, command: Readonly<GameCommand>): boolean {
  if (!("programId" in event) || event.programId !== command.programId) return false;
  switch (command.type) {
    case "OFFER_PROSPECT":
      return event.type === "PROSPECT_OFFERED" && event.prospectId === command.prospectId && event.extended === command.extend;
    case "SCHEDULE_VISIT":
      return event.type === "RECRUITING_VISIT_SCHEDULED" && event.prospectId === command.prospectId;
    case "SEARCH_PROSPECTS":
      return event.type === "PROSPECTS_DISCOVERED" && event.searchType === command.searchType
        && event.position === command.position;
    case "EVALUATE_PROSPECT":
      return event.type === "PROSPECT_EVALUATED" && event.prospectId === command.prospectId
        && event.evaluation === command.evaluation;
    case "INVEST_RECRUITING_POINTS":
      return event.type === "RECRUITING_INVESTMENT" && event.prospectId === command.prospectId
        && event.pointsSpent === Math.trunc(command.points);
    case "SET_REDSHIRT":
      return event.type === "REDSHIRT_STATUS_CHANGED" && event.playerId === command.playerId
        && (command.enabled ? event.status === "REDSHIRTING" : event.status !== "REDSHIRTING");
    case "SET_DEPTH_CHART":
      return event.type === "DEPTH_CHART_UPDATED" && event.position === command.position
        && sameOrderedValues(event.playerIds, command.playerIds);
    case "SET_DEVELOPMENT_SPOTLIGHT":
      return event.type === "DEVELOPMENT_SPOTLIGHT_SET" && event.focus === command.focus
        && JSON.stringify(event.target) === JSON.stringify(command.target);
    case "UPGRADE_FACILITY":
      return event.type === "FACILITY_UPGRADED" && event.facility === command.facility;
    case "SET_PLAYER_MEDIA_ACTION":
      return event.type === "PLAYER_MEDIA_ACTION_SET" && event.playerId === command.playerId
        && event.action === command.action;
    case "SET_TICKET_PRICE":
      return event.type === "TICKET_PRICE_SET" && event.price === Math.round(command.price);
    case "SET_ADVERTISING":
      return event.type === "ADVERTISING_SET" && event.spend === Math.round(command.spend);
    case "ACCEPT_SPONSORSHIP":
      return event.type === "SPONSORSHIP_ACCEPTED" && event.offerId === command.offerId;
    case "SET_WEEK_FOCUS":
      return event.type === "WEEK_FOCUS_SET" && sameOrderedValues(event.focuses, [...new Set(command.focuses)]);
    case "SET_SCOUTING_TARGET":
      return event.type === "SCOUTING_TARGET_SET" && event.opponentProgramId === command.opponentProgramId;
    case "CHOOSE_BOOSTER":
      return event.type === "BOOSTER_RESOLVED" && event.optionId === command.optionId;
    case "SET_NIL_OFFER":
      return event.type === "NIL_OFFER_SET" && event.prospectId === command.prospectId
        && event.weeklyAmount === Math.max(0, Math.round(command.weeklyAmount));
    case "SET_SCHEME":
      return event.type === "SCHEME_SET" && Object.entries(command.scheme)
        .every(([key, value]) => event.scheme[key as keyof SchemeIdentity] === value);
    case "REPLACE_STAFF":
      return event.type === "STAFF_REPLACED" && event.departingStaffId === command.staffId
        && event.arrivingStaffId === `${command.programId}-staff-${command.candidateId.replace(/[^A-Za-z0-9]/g, "-")}`;
    case "SCHEDULE_MARQUEE_HOME_GAME":
      return event.type === "MARQUEE_GAME_SCHEDULED" && event.opponentProgramId === command.opponentProgramId;
    case "BID_PORTAL_PLAYER":
      return event.type === "PORTAL_BID_SET" && event.playerId === command.playerId
        && event.points === Math.trunc(command.points)
        && event.weeklyNil === Math.max(0, Math.round(command.weeklyNil));
    case "SET_TRAINING_CAMP_FOCUS":
      return event.type === "TRAINING_CAMP_SET" && event.focus === command.focus;
    case "RED_SHIRT":
    case "SET_GAME_PLAN":
    case "SET_PRACTICE_REPS":
    case "SET_STAFF_ALLOCATION":
    case "SET_WEEK_HOURS":
    case "ALLOCATE_SCOUTING":
    case "CONTINUE_OFFSEASON":
      return false;
  }
}

function createTaggedDecisionAudit(
  decision: Readonly<DecisionRecord<GameCommand>>,
  knowledgeId: string,
  events: GameEvent[],
  rejectionReason: string | null,
  resolution: "IMMEDIATE" | "STANDING" = "IMMEDIATE"
): DecisionAuditRecord {
  events.forEach((event, ordinal) => {
    event.decisionCauseId = `${decision.submissionId}:event:${ordinal}`;
  });
  return createDecisionAudit(decision, knowledgeId, events, rejectionReason, resolution);
}

type StandingCommand = Extract<GameCommand, { type: "SET_NIL_OFFER" | "BID_PORTAL_PLAYER" }>;

function standingCommand(audit: Readonly<DecisionAuditRecord>): StandingCommand | null {
  if (audit.commandType !== "SET_NIL_OFFER" && audit.commandType !== "BID_PORTAL_PLAYER") return null;
  try {
    return JSON.parse(audit.commandKey) as StandingCommand;
  } catch {
    return null;
  }
}

function closeStandingAudit(
  audit: Readonly<DecisionAuditRecord>,
  event: GameEvent,
  result: StandingDecisionResult
): DecisionAuditRecord {
  if (!audit.outcomePending) return audit as DecisionAuditRecord;
  const causeId = `${audit.submissionId}:outcome:0`;
  event.decisionOutcomeCauseIds = [...new Set([...(event.decisionOutcomeCauseIds ?? []), causeId])].sort();
  return {
    ...audit,
    outcomePending: false,
    standingOutcome: {
      result,
      causes: [{ id: causeId, eventType: event.type, ordinal: 0 }]
    }
  };
}

/** Close standing submissions against exact market results without rewriting intent. */
function closeStandingDecisionAudits(state: GameState, events: GameEvent[]): void {
  let audits = state.decisionAudits ?? [];
  const close = (event: GameEvent, resultFor: (audit: DecisionAuditRecord, command: StandingCommand) => StandingDecisionResult | null): void => {
    audits = audits.map((audit) => {
      if (!audit.outcomePending) return audit;
      const command = standingCommand(audit);
      const result = command ? resultFor(audit, command) : null;
      return result ? closeStandingAudit(audit, event, result) : audit;
    });
  };

  // A newer absolute offer/bid replaces the old submission for the same slot.
  for (const event of events) {
    if (event.type !== "NIL_OFFER_SET" && event.type !== "PORTAL_BID_SET") continue;
    const matching = audits.filter((audit) => {
      if (!audit.outcomePending) return false;
      const command = standingCommand(audit);
      return event.type === "NIL_OFFER_SET"
        ? command?.type === "SET_NIL_OFFER" && command.programId === event.programId && command.prospectId === event.prospectId
        : command?.type === "BID_PORTAL_PLAYER" && command.programId === event.programId && command.playerId === event.playerId;
    });
    const latestSubmissionId = [...matching].sort((left, right) =>
      left.submittedAt.season - right.submittedAt.season
      || left.submittedAt.week - right.submittedAt.week
      || left.submittedAt.sequence - right.submittedAt.sequence
      || left.submissionId.localeCompare(right.submissionId)).at(-1)?.submissionId;
    const withdrawn = event.type === "NIL_OFFER_SET" ? event.weeklyAmount === 0 : event.withdrawn;
    close(event, (audit, command) => {
      const sameSlot = event.type === "NIL_OFFER_SET"
        ? command.type === "SET_NIL_OFFER" && command.programId === event.programId && command.prospectId === event.prospectId
        : command.type === "BID_PORTAL_PLAYER" && command.programId === event.programId && command.playerId === event.playerId;
      if (!sameSlot) return null;
      if (withdrawn) return "WITHDRAWN";
      return audit.submissionId === latestSubmissionId ? null : "SUPERSEDED";
    });
  }

  for (const event of events) {
    if (event.type === "NIL_OFFER_RESOLVED") {
      close(event, (_audit, command) => command.type === "SET_NIL_OFFER"
        && command.programId === event.programId && command.prospectId === event.prospectId
        ? event.result
        : null);
    }
    if (event.type === "PORTAL_PLAYER_SIGNED") {
      close(event, (_audit, command) => command.type === "BID_PORTAL_PLAYER" && command.playerId === event.playerId
        ? (command.programId === event.programId ? "WON" : "LOST")
        : null);
    }
    if (event.type === "PORTAL_PLAYER_UNCLAIMED") {
      close(event, (_audit, command) => command.type === "BID_PORTAL_PLAYER" && command.playerId === event.playerId
        ? "UNCLAIMED"
        : null);
    }
  }
  state.decisionAudits = audits;
}

function orderedDecisions(
  input: Readonly<GameState>,
  decisions: readonly DecisionRecord<GameCommand>[]
): DecisionRecord<GameCommand>[] {
  const ordered = [...decisions].sort((left, right) =>
    decisionCommandKey(left.command).localeCompare(decisionCommandKey(right.command))
    || left.submissionId.localeCompare(right.submissionId));
  const seenIds = new Set<string>();
  for (const decision of ordered) {
    if (decision.status !== "PENDING") throw new Error("Only a pending decision record can be committed.");
    if (RETIRED_COMPATIBILITY_COMMAND_TYPES.has(decision.command.type)) {
      throw new Error(`${decision.command.type} is a retired compatibility command, not a live attributed decision.`);
    }
    if (seenIds.has(decision.id)) throw new Error(`Duplicate decision id: ${decision.id}`);
    seenIds.add(decision.id);
    if (decision.command.programId !== decision.knowledge.programId) {
      throw new Error("Decision command and knowledge must belong to the same program.");
    }
    if (decision.knowledge.season !== input.season
      || decision.knowledge.week !== input.week
      || decision.knowledge.phase !== input.phase) {
      throw new Error("This decision record is stale for the current simulation boundary.");
    }
    if (decision.actor.mode === "AI" && decision.actor.actorId !== `ai:${decision.command.programId}`) {
      throw new Error("An AI decision actor must belong to the command program.");
    }
    if (decision.actor.mode === "DELEGATED") {
      const staff = input.staff[decision.actor.staffId];
      const authorization = `${decision.actor.staffId}:WEEKLY_PLANNING`;
      if (!isWeeklyPlanningDecision(decision)
        || decision.actor.policyId !== "WEEKLY_PLANNING"
        || !staff
        || staff.id !== decision.actor.actorId
        || staff.name !== decision.actor.displayName
        || staff.programId !== decision.command.programId
        || staff.role !== "HEAD_COACH"
        || decision.actor.delegatedByActorId !== `player:${decision.command.programId}`
        || !decision.knowledge.facts.some((fact) =>
          fact.key === "delegation.authorization.v1"
          && fact.value === authorization
          && fact.entityId === staff.id)) {
        throw new Error("Delegated decision authority is not valid for this command.");
      }
    }
  }
  return ordered;
}

function attachDecisionAudits(
  input: Readonly<GameState>,
  resolved: SimulationResult,
  ordered: readonly DecisionRecord<GameCommand>[]
): DecisionBatchSimulationResult {
  const decisionKnowledge = { ...(resolved.state.decisionKnowledge ?? {}) };
  const audits = ordered.map((decision) => {
    const knowledgeId = internDecisionKnowledge(decisionKnowledge, decision.knowledge);
    const commandKey = decisionCommandKey(decision.command);
    const rejection = resolved.events.find((event): event is Extract<GameEvent, { type: "COMMAND_REJECTED" }> =>
      event.type === "COMMAND_REJECTED"
      && event.programId === decision.command.programId
      && decisionCommandKey(event.command) === commandKey);
    if (rejection) return createTaggedDecisionAudit(decision, knowledgeId, [rejection], rejection.reason);

    const resolution = decision.command.type === "SET_NIL_OFFER" || decision.command.type === "BID_PORTAL_PLAYER"
      ? "STANDING"
      : "IMMEDIATE";
    const domainEvents = resolved.events.filter((event) => eventMatchesAcceptedCommand(event, decision.command));
    if (domainEvents.length !== 1) {
      throw new Error(`Decision ${decision.id} must resolve to exactly one causal domain event; found ${domainEvents.length}.`);
    }
    return createTaggedDecisionAudit(decision, knowledgeId, domainEvents, null, resolution);
  });
  for (const audit of audits) {
    if (audit.status !== "DONE") continue;
    for (const event of resolved.events) {
      if (event.type !== "WEEK_FOCUS_PAYOFF" || event.programId !== audit.programId) continue;
      if (audit.commandType === "SET_WEEK_FOCUS"
        && audit.commandKey === decisionCommandKey({ type: "SET_WEEK_FOCUS", programId: event.programId, focuses: event.focuses })) {
        event.weeklyPrioritySubmissionId = audit.submissionId;
      }
      if (audit.commandType === "SET_SCOUTING_TARGET"
        && audit.commandKey === decisionCommandKey({
          type: "SET_SCOUTING_TARGET",
          programId: event.programId,
          opponentProgramId: event.scoutedOpponentId
        })) {
        event.scoutingTargetSubmissionId = audit.submissionId;
      }
    }
  }
  const auditEvents: GameEvent[] = audits.map((audit) => ({
    type: "DECISION_AUDITED",
    season: input.season,
    week: input.week,
    programId: audit.programId,
    submissionId: audit.submissionId
  }));
  resolved.state.decisionAudits = retainedDecisionAudits([...(resolved.state.decisionAudits ?? []), ...audits]);
  resolved.state.decisionKnowledge = retainedDecisionKnowledge(decisionKnowledge, resolved.state.decisionAudits);
  closeStandingDecisionAudits(resolved.state, resolved.events);
  if (resolved.state.eventHistory.length > 10_000) {
    resolved.state.eventHistory = retainedDecisionEventHistory(
      resolved.state.eventHistory,
      resolved.state.decisionAudits,
      10_000
    );
  }
  const settledAudits = audits.map((audit) => resolved.state.decisionAudits
    ?.find((candidate) => candidate.submissionId === audit.submissionId) ?? audit);
  return { state: resolved.state, events: [...resolved.events, ...auditEvents], audits: settledAudits };
}

/** Resolve preparation immediately while retaining actor attribution. */
export function commitWeeklyDecisions(
  input: Readonly<GameState>,
  decisions: readonly DecisionRecord<WeeklyPlanningCommand>[]
): DecisionBatchSimulationResult {
  const ordered = orderedDecisions(input, decisions);
  const resolved = prepareWeek(input, ordered.map((decision) => decision.command));
  return attachDecisionAudits(input, resolved, ordered);
}

/**
 * Resolve attributed planning and every other weekly command in one engine
 * pass. Worker and CLI orchestration must use this at the Saturday boundary so
 * preparation cannot create defaults before an explicit command is seen.
 */
export function advanceWeekWithDecisions(
  input: Readonly<GameState>,
  decisions: readonly DecisionRecord<GameCommand>[],
  commands: readonly GameCommand[] = []
): DecisionBatchSimulationResult {
  const ordered = orderedDecisions(input, decisions);
  const wrongBoundary = ordered.filter((decision) =>
    decision.command.type === "BID_PORTAL_PLAYER" || decision.command.type === "SET_TRAINING_CAMP_FOCUS");
  const resolved = advanceWeek(input, [
    ...ordered.filter((decision) => !wrongBoundary.includes(decision)).map((decision) => decision.command),
    ...commands
  ], true);
  for (const decision of wrongBoundary) {
    const rejection: GameEvent = {
      type: "COMMAND_REJECTED",
      programId: decision.command.programId,
      command: decision.command,
      reason: "That decision cannot be made at the weekly season boundary."
    };
    resolved.events.push(rejection);
    resolved.state.eventHistory.push(rejection);
  }
  return attachDecisionAudits(input, resolved, ordered);
}

export function commitWeeklyDecision(
  input: Readonly<GameState>,
  decision: Readonly<DecisionRecord<WeeklyPlanningCommand>>
): DecisionSimulationResult {
  const result = commitWeeklyDecisions(input, [decision]);
  return { state: result.state, events: result.events, audit: result.audits[0]! };
}

/** Attributed preseason boundary; raw beginSeason remains API-compatible. */
export function beginSeasonWithDecisions(
  input: Readonly<GameState>,
  decisions: readonly DecisionRecord<GameCommand>[]
): DecisionBatchSimulationResult {
  const ordered = orderedDecisions(input, decisions);
  const state = beginSeason(input, ordered.map((decision) => decision.command));
  const events = state.eventHistory.slice(input.eventHistory.length);
  return attachDecisionAudits(input, { state, events }, ordered);
}

/** Attributed immediate preparation boundary; raw prepareWeek remains available. */
export function prepareWeekWithDecisions(
  input: Readonly<GameState>,
  decisions: readonly DecisionRecord<GameCommand>[]
): DecisionBatchSimulationResult {
  const ordered = orderedDecisions(input, decisions);
  const allowed = new Set<GameCommand["type"]>([
    "SET_SCHEME", "REPLACE_STAFF", "SET_WEEK_FOCUS", "SET_SCOUTING_TARGET", "CHOOSE_BOOSTER"
  ]);
  if (ordered.some((decision) => !allowed.has(decision.command.type))) {
    throw new Error("That command does not resolve at the preparation boundary.");
  }
  const resolved = prepareWeek(input, ordered.map((decision) => decision.command));
  return attachDecisionAudits(input, resolved, ordered);
}

/** Attributed offseason boundary; standing bids remain pending until the market event. */
export function advanceOffseasonStepWithDecisions(
  input: Readonly<GameState>,
  decisions: readonly DecisionRecord<GameCommand>[],
  compatibilityCommands: readonly Extract<GameCommand, { type: "CONTINUE_OFFSEASON" }>[] = []
): DecisionBatchSimulationResult {
  const ordered = orderedDecisions(input, decisions);
  const resolved = advanceOffseasonStep(input, [
    ...ordered.map((decision) => decision.command),
    ...compatibilityCommands
  ], true);
  return attachDecisionAudits(input, resolved, ordered);
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
      // A verbal commitment is still contestable — see SIGNING_WEEK — so a
      // recruit stays reachable up to that point, whoever he is currently
      // committed to.
      if (!prospect || (prospect.status !== "AVAILABLE" && prospect.status !== "COMMITTED") || !scouting) {
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
    if (command.type === "OFFER_PROSPECT") {
      const prospect = state.prospects[command.prospectId];
      const recruiting = state.recruiting[program.id]!;
      const scouting = recruiting.scoutingByProspect[command.prospectId];
      // A verbal commitment is still contestable — see SIGNING_WEEK — so a
      // recruit stays reachable up to that point, whoever he is currently
      // committed to.
      if (!prospect || (prospect.status !== "AVAILABLE" && prospect.status !== "COMMITTED") || !scouting) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Prospect is unavailable." });
        continue;
      }
      const alreadyOffered = recruiting.offeredProspectIds.includes(command.prospectId);
      const changed = command.extend !== alreadyOffered;
      if (command.extend) {
        if (!alreadyOffered && projectedRecruitingOpenings(state, program.id) <= 0) {
          events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The projected incoming class is full." });
          continue;
        }
        if (!alreadyOffered) {
          recruiting.offeredProspectIds.push(command.prospectId);
          recruiting.offeredProspectIds.sort();
        }
      } else {
        if (alreadyOffered) {
          recruiting.offeredProspectIds = recruiting.offeredProspectIds.filter((id) => id !== command.prospectId);
        // Rescinding is remembered, the same flat, deterministic way NIL
        // withdrawal already is. Whatever pursuit points or NIL dollars are
        // already on the table stay — this only closes the door to more.
          prospect.interestByProgram[program.id] = Math.max(
          0,
          Number(((prospect.interestByProgram[program.id] ?? 0) - NIL_WITHDRAWAL_INTEREST_PENALTY).toFixed(3))
          );
        }
      }
      events.push({
        type: "PROSPECT_OFFERED",
        season: state.season,
        week: state.week,
        programId: program.id,
        prospectId: prospect.id,
        extended: command.extend,
        changed
      });
      continue;
    }
    if (command.type === "INVEST_RECRUITING_POINTS") {
      const prospect = state.prospects[command.prospectId];
      const recruiting = state.recruiting[program.id]!;
      const scouting = recruiting.scoutingByProspect[command.prospectId];
      // A verbal commitment is still contestable — see SIGNING_WEEK — so a
      // recruit stays reachable up to that point, whoever he is currently
      // committed to.
      if (!prospect || (prospect.status !== "AVAILABLE" && prospect.status !== "COMMITTED") || !scouting) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Prospect is unavailable." });
        continue;
      }
      if (!recruiting.offeredProspectIds.includes(command.prospectId)) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Offer him a scholarship before you pitch him further." });
        continue;
      }
      if (projectedRecruitingOpenings(state, program.id) <= 0) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The projected incoming class is full." });
        continue;
      }
      const points = Math.trunc(command.points);
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
    if (command.type === "SCHEDULE_VISIT") {
      const prospect = state.prospects[command.prospectId];
      const recruiting = state.recruiting[program.id]!;
      const scouting = recruiting.scoutingByProspect[command.prospectId];
      // A verbal commitment is still contestable — see SIGNING_WEEK — so a
      // recruit stays reachable up to that point, whoever he is currently
      // committed to.
      if (!prospect || (prospect.status !== "AVAILABLE" && prospect.status !== "COMMITTED") || !scouting) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Prospect is unavailable." });
        continue;
      }
      if (!recruiting.offeredProspectIds.includes(command.prospectId)) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Offer him a scholarship before you schedule a visit." });
        continue;
      }
      if (projectedRecruitingOpenings(state, program.id) <= 0) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The projected incoming class is full." });
        continue;
      }
      if (recruiting.visitsUsedThisSeason >= MAX_VISITS_PER_SEASON) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Every visit weekend this season is already spent." });
        continue;
      }
      if (recruiting.points < VISIT_COST) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Not enough Recruiting Points to schedule a visit." });
        continue;
      }
      const visitsAlreadyUsed = scouting.visitsUsed ?? 0;
      const bonus = visitScore(prospectProgramFit(state, prospect, program.id), visitsAlreadyUsed);
      recruiting.points -= VISIT_COST;
      recruiting.visitsUsedThisSeason += 1;
      scouting.visitsUsed = visitsAlreadyUsed + 1;
      events.push({
        type: "RECRUITING_VISIT_SCHEDULED",
        season: state.season,
        week: state.week,
        programId: program.id,
        prospectId: prospect.id,
        visitNumber: scouting.visitsUsed,
        bonus,
        visitsRemainingThisSeason: MAX_VISITS_PER_SEASON - recruiting.visitsUsedThisSeason
      });
      continue;
    }
    if (command.type === "SET_NIL_OFFER") {
      const prospect = state.prospects[command.prospectId];
      const scouting = state.recruiting[program.id]?.scoutingByProspect[command.prospectId];
      const amount = Math.max(0, Math.round(command.weeklyAmount));
      // A verbal commitment is still contestable — see SIGNING_WEEK — so a
      // recruit stays reachable up to that point, whoever he is currently
      // committed to.
      if (!prospect || (prospect.status !== "AVAILABLE" && prospect.status !== "COMMITTED") || !scouting) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Prospect is unavailable." });
        continue;
      }
      // You cannot bid on a name you have never looked at.
      if (amount > 0 && scouting.evaluations.length === 0) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Evaluate him at least once before putting money on the table." });
        continue;
      }
      if (amount > 0 && projectedRecruitingOpenings(state, program.id) <= 0) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The projected incoming class is full." });
        continue;
      }
      state.nil ??= {};
      state.nil[program.id] ??= emptyNilState();
      const nil = state.nil[program.id]!;
      const current = nil.offersByProspect[command.prospectId] ?? 0;
      // Raising is free; capacity is checked on the *increase* only, since the
      // current offer already holds its reservation.
      if (amount > current && amount - current > freeNilCapacity(state, program.id)) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Your donors cannot cover that offer. Capacity comes from fans, support, prestige, and titles — not the budget." });
        continue;
      }
      // Pulling money back is remembered. A flat, deterministic interest cost —
      // no roll — so lowering to a token amount is not a free withdrawal.
      if (amount < current) {
        prospect.interestByProgram[program.id] = Math.max(
          0,
          Number(((prospect.interestByProgram[program.id] ?? 0) - NIL_WITHDRAWAL_INTEREST_PENALTY).toFixed(3))
        );
      }
      if (amount === 0) delete nil.offersByProspect[command.prospectId];
      else nil.offersByProspect[command.prospectId] = amount;
      events.push({
        type: "NIL_OFFER_SET",
        season: state.season,
        week: state.week,
        programId: program.id,
        prospectId: command.prospectId,
        weeklyAmount: amount,
        previousWeeklyAmount: current
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
    if (command.type === "CHOOSE_BOOSTER") {
      const boosters = state.boosters?.[program.id];
      const offer = boosters?.offer;
      if (!offer || offer.week !== state.week) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Nobody is on the table this week." });
        continue;
      }
      if (offer.chosenOptionId !== null) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "You already took one of them this week." });
        continue;
      }
      const option = offer.options.find((entry) => entry.id === command.optionId);
      if (!option) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "That offer is not on the table." });
        continue;
      }
      const outcome = applyBooster(
        state,
        program.id,
        option,
        new AddressableRng(state.identity.rootSeed).fork("boosters", String(state.season), String(state.week))
      );
      offer.chosenOptionId = option.id;
      offer.succeeded = outcome.succeeded;
      events.push({
        type: "BOOSTER_RESOLVED",
        season: state.season,
        week: state.week,
        programId: program.id,
        optionId: option.id,
        kind: option.kind,
        name: option.name,
        succeeded: outcome.succeeded,
        outcome: outcome.outcome,
        playerIds: outcome.playerIds
      });
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
      // Letting a coach go costs money, in every phase — the offseason is
      // where firing becomes convenient, not where it becomes legal.
      const buyoutCost = staffBuyout(outgoing);
      if (program.budget < candidate.signingCost + buyoutCost) {
        events.push({
          type: "COMMAND_REJECTED",
          programId: command.programId,
          command,
          reason: buyoutCost > 0
            ? "The program cannot afford that signing cost on top of the buyout."
            : "The program cannot afford that signing cost."
        });
        continue;
      }
      const arrivingId = `${program.id}-staff-${candidate.id.replace(/[^A-Za-z0-9]/g, "-")}`;
      if (arrivingId === command.staffId) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "He already has the job." });
        continue;
      }
      program.budget -= candidate.signingCost + buyoutCost;
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
        signingCost: candidate.signingCost,
        buyoutCost
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
    if (command.type === "ACCEPT_SPONSORSHIP") {
      const sponsorship = state.sponsorships[program.id];
      const offer = sponsorship?.offers.find((candidate) => candidate.id === command.offerId);
      if (!sponsorship || sponsorship.season !== state.season || !offer) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "That sponsorship offer is no longer available." });
        continue;
      }
      if (sponsorship.activeContractId) {
        const active = sponsorship.offers.find((candidate) => candidate.id === sponsorship.activeContractId);
        events.push({
          type: "COMMAND_REJECTED",
          programId: command.programId,
          command,
          reason: `${active?.sponsorName ?? "The current sponsor"} has the primary partnership through the end of the season.`
        });
        continue;
      }
      sponsorship.activeContractId = offer.id;
      events.push({
        type: "SPONSORSHIP_ACCEPTED",
        season: state.season,
        week: state.week,
        programId: program.id,
        offerId: offer.id,
        sponsorName: offer.sponsorName,
        strategy: offer.strategy,
        weeklyPayment: offer.weeklyPayment
      });
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
  // An offer must resolve before anything that requires one, in the same week.
  if (command.type === "OFFER_PROSPECT") return `${command.programId}:2:${command.prospectId}:${command.extend ? 1 : 0}`;
  if (command.type === "INVEST_RECRUITING_POINTS") return `${command.programId}:3:${command.prospectId}:${String(command.points).padStart(2, "0")}`;
  if (command.type === "SCHEDULE_VISIT") return `${command.programId}:4:${command.prospectId}`;
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
    ...(command.position ? { position: command.position } : {}),
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
  const programIds = Object.keys(state.programs);
  const fitIndex = buildProspectFitIndex(state);
  const commitmentsByProgram = new Map<string, number>();
  for (const prospect of Object.values(state.prospects)) {
    if (prospect.status === "COMMITTED" && prospect.signedProgramId) {
      commitmentsByProgram.set(prospect.signedProgramId, (commitmentsByProgram.get(prospect.signedProgramId) ?? 0) + 1);
    }
  }
  const openingsByProgram = new Map(programIds.map((programId) => {
    const roster = fitIndex.rostersByProgram.get(programId) ?? [];
    const departures = roster.filter((player) => player.eligibility.seasonsRemaining <= 1).length;
    return [programId, Math.max(0, state.programs[programId]!.scholarshipLimit - roster.length + departures - (commitmentsByProgram.get(programId) ?? 0))];
  }));
  const programsByProspect = new Map<string, Set<string>>();
  const addContender = (prospectId: string, programId: string): void => {
    const contenders = programsByProspect.get(prospectId) ?? new Set<string>();
    contenders.add(programId);
    programsByProspect.set(prospectId, contenders);
  };
  for (const programId of programIds) {
    if ((openingsByProgram.get(programId) ?? 0) <= 0) continue;
    const recruiting = state.recruiting[programId];
    for (const prospectId of recruiting?.offeredProspectIds ?? []) addContender(prospectId, programId);
    for (const [prospectId, scouting] of Object.entries(recruiting?.scoutingByProspect ?? {})) {
      if (scouting.pursuitPoints > 0) addContender(prospectId, programId);
    }
    const nil = state.nil?.[programId];
    for (const prospectId of Object.keys(nil?.offersByProspect ?? {})) addContender(prospectId, programId);
    for (const prospectId of Object.keys(nil?.commitmentsByPlayer ?? {})) {
      if (state.prospects[prospectId]) addContender(prospectId, programId);
    }
  }
  // A verbal commitment stays in the market — and therefore contestable —
  // until the signing week. After that, only a fresh (never-committed)
  // prospect can still be in this pool, and he signs immediately: see below.
  const contests = [...programsByProspect.keys()]
    .map((prospectId) => state.prospects[prospectId])
    .filter((prospect): prospect is Prospect => Boolean(prospect))
    .filter((prospect) => prospect.status === "AVAILABLE" || (prospect.status === "COMMITTED" && state.week < SIGNING_WEEK))
    .map((prospect) => {
      const offeredBy = [...(programsByProspect.get(prospect.id) ?? [])]
        .filter((programId) => (openingsByProgram.get(programId) ?? 0) > 0)
        .sort();
      const scores = Object.fromEntries(offeredBy.map((programId) => [programId, recruitingScore(state, prospect, programId, rng, fitIndex)]));
      const ranked = [...offeredBy].sort((left, right) => scores[right]! - scores[left]! || left.localeCompare(right));
      return { prospect, offeredBy, scores, ranked, priority: rng.at(`${prospect.id}:commitment-priority`) };
    })
    .filter((contest) => contest.ranked.length > 0)
    .sort((left, right) => left.priority - right.priority || left.prospect.id.localeCompare(right.prospect.id));

  for (const contest of contests) {
    const winnerProgramId = contest.ranked[0]!;
    if ((openingsByProgram.get(winnerProgramId) ?? 0) <= 0) continue;
    const score = contest.scores[winnerProgramId]!;
    const runnerUpProgramId = contest.ranked[1] ?? null;
    const runnerUpScore = runnerUpProgramId ? contest.scores[runnerUpProgramId]! : null;
    const commitmentThreshold = Math.max(58, 82 - state.week * 2);
    const requiredLead = state.week >= 12 ? 0 : 4;
    if (score < commitmentThreshold || score - (runnerUpScore ?? 0) < requiredLead) continue;

    const previousProgramId = contest.prospect.signedProgramId;
    // Nothing changed: the incumbent simply re-won his own recruit this week.
    if (contest.prospect.status === "COMMITTED" && previousProgramId === winnerProgramId) continue;
    const isFlip = contest.prospect.status === "COMMITTED" && previousProgramId !== null && previousProgramId !== winnerProgramId;
    if (isFlip) {
      // He stops costing the program he left the moment he leaves it.
      const previousNil = state.nil?.[previousProgramId!];
      if (previousNil) delete previousNil.commitmentsByPlayer[contest.prospect.id];
    }

    const signsImmediately = state.week >= SIGNING_WEEK;
    contest.prospect.status = signsImmediately ? "SIGNED" : "COMMITTED";
    contest.prospect.signedProgramId = winnerProgramId;
    openingsByProgram.set(winnerProgramId, Math.max(0, (openingsByProgram.get(winnerProgramId) ?? 0) - 1));
    if (isFlip && previousProgramId) openingsByProgram.set(previousProgramId, (openingsByProgram.get(previousProgramId) ?? 0) + 1);
    // The winner's offer converts to a commitment and starts charging this
    // week — settled decision: the drain begins at commitment, not enrollment.
    // Keyed by prospect id until enrollment re-keys it to the player id.
    // Every loser's offer dies with the contest, releasing its reservation.
    const nilOffers = Object.entries(state.nil ?? {})
      .flatMap(([programId, programNil]) => {
        const weeklyAmount = programNil.offersByProspect[contest.prospect.id] ?? 0;
        return weeklyAmount > 0 ? [{ programId, weeklyAmount }] : [];
      })
      .sort((left, right) => left.programId.localeCompare(right.programId));
    const winningOffer = state.nil?.[winnerProgramId]?.offersByProspect[contest.prospect.id] ?? 0;
    if (winningOffer > 0) {
      const winnerNil = state.nil![winnerProgramId]!;
      winnerNil.commitmentsByPlayer[contest.prospect.id] = winningOffer;
      events.push({
        type: "NIL_DEAL_SIGNED",
        season: state.season,
        week: state.week,
        prospectId: contest.prospect.id,
        programId: winnerProgramId,
        weeklyAmount: winningOffer,
        askingPrice: nilAskingPrice(contest.prospect, state.programs[winnerProgramId])
      });
    }
    for (const offer of nilOffers) {
      const won = offer.programId === winnerProgramId;
      events.push({
        type: "NIL_OFFER_RESOLVED",
        season: state.season,
        week: state.week,
        programId: offer.programId,
        prospectId: contest.prospect.id,
        weeklyAmount: offer.weeklyAmount,
        winnerProgramId,
        result: won ? "WON" : "LOST",
        reason: won ? "PROSPECT_CHOSE_PROGRAM" : "PROSPECT_CHOSE_OTHER_PROGRAM"
      });
    }
    for (const programNil of Object.values(state.nil ?? {})) {
      delete programNil.offersByProspect[contest.prospect.id];
    }
    events.push({
      type: "RECRUITING_CONTEST_RESOLVED",
      season: state.season,
      week: state.week,
      prospectId: contest.prospect.id,
      offeredBy: contest.offeredBy,
      winnerProgramId,
      scores: contest.scores
    });
    if (isFlip) {
      events.push({
        type: "PROSPECT_FLIPPED",
        season: state.season,
        week: state.week,
        prospectId: contest.prospect.id,
        fromProgramId: previousProgramId!,
        toProgramId: winnerProgramId,
        score
      });
    } else {
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
    if (signsImmediately) {
      events.push({ type: "PROSPECT_SIGNED", season: state.season, week: state.week, prospectId: contest.prospect.id, programId: winnerProgramId });
    }
  }
}

/**
 * Every prospect still verbally `COMMITTED` at the signing week locks to
 * `SIGNED` — no more flips, whoever ranks where. A prospect who commits for
 * the first time at or after this week never passes through `COMMITTED` at
 * all; see the `signsImmediately` branch in `resolveRecruitingMarket`.
 */
function resolveSigningWeek(state: GameState, events: GameEvent[]): void {
  if (state.week !== SIGNING_WEEK) return;
  for (const prospect of Object.values(state.prospects)) {
    if (prospect.status !== "COMMITTED") continue;
    prospect.status = "SIGNED";
    events.push({ type: "PROSPECT_SIGNED", season: state.season, week: state.week, prospectId: prospect.id, programId: prospect.signedProgramId! });
  }
}

function recruitingScore(state: GameState, prospect: Prospect, programId: string, rng: AddressableRng, fitIndex?: ProspectFitIndex): number {
  const program = state.programs[programId]!;
  const scouting = state.recruiting[programId]?.scoutingByProspect[prospect.id];
  const pursuitPoints = scouting?.pursuitPoints ?? 0;
  const fit = prospectProgramFit(state, prospect, programId, fitIndex);
  const facilityBonus = Math.max(0, program.facilities.RECRUITING - 1) * 2;
  const staffBonus = (fitIndex?.recruitingStaffByProgram.get(programId) ?? staffContribution(state, programId, "RECRUIT")) / 25;
  const exposureBonus = program.localPress / 50 + program.nationalPress / 20;
  const appealBonus = program.recruitAppeal + (prospect.homeDivisionId === program.divisionId ? program.homeRegionBias / 8 : 0);
  // Money is a tiebreaker by design: nilScore saturates at NIL_SCORE_CEILING,
  // under the fit and interest terms, so an offer decides close contests and
  // never overcomes a prospect who does not want the program. A live offer is
  // read first; once he is committed here the same dollars live in
  // `commitmentsByPlayer` instead, and must still count toward keeping him.
  const nilOffer = state.nil?.[programId]?.offersByProspect[prospect.id]
    ?? state.nil?.[programId]?.commitmentsByPlayer[prospect.id]
    ?? 0;
  const nilBonus = nilScore(nilOffer, nilAskingPrice(prospect, program), prospect);
  // A bare offer is a small, flat signal — not a substitute for actually
  // pursuing him. See OFFER_SCORE_BONUS for how it is sized against the rest.
  const offerBonus = state.recruiting[programId]?.offeredProspectIds.includes(prospect.id) ? OFFER_SCORE_BONUS : 0;
  // Reuses the same fit the roster requirement reads: a visit pays more where
  // the program actually has what he's looking for.
  const visitBonus = totalVisitScore(fit, scouting?.visitsUsed ?? 0);
  // The real cost of backing out on a program, added only for whoever he is
  // currently verbally committed to. A rival needs a real, stated edge to
  // flip him — not a marginal one.
  const commitmentInertia = prospect.status === "COMMITTED" && prospect.signedProgramId === programId
    ? COMMITMENT_INERTIA_BONUS
    : 0;
  return Number((
    prospect.interestByProgram[programId]! * 0.3
    + fit * 0.35
    + pursuitPoints * 0.75
    + facilityBonus
    + staffBonus
    + exposureBonus
    + appealBonus
    + nilBonus
    + offerBonus
    + visitBonus
    + commitmentInertia
    + rng.between(`${prospect.id}:${programId}:decision-noise`, -2, 2)
  ).toFixed(3));
}

function scoutingQuality(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  return clamp(25 + program.facilities.RECRUITING * 12 + staffContribution(state, programId, "RECRUIT") / 6, 25, 100);
}

export interface ProspectFitIndex {
  rostersByProgram: ReadonlyMap<string, readonly Player[]>;
  averageStardomByProgram: ReadonlyMap<string, number>;
  recruitingStaffByProgram: ReadonlyMap<string, number>;
  developmentStaffByProgram: ReadonlyMap<string, number>;
}

function buildProspectFitIndex(state: Readonly<GameState>): ProspectFitIndex {
  const rostersByProgram = new Map<string, Player[]>();
  for (const player of Object.values(state.players)) {
    if (!player.programId || player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    const roster = rostersByProgram.get(player.programId) ?? [];
    roster.push(player);
    rostersByProgram.set(player.programId, roster);
  }
  const averageStardomByProgram = new Map<string, number>();
  const recruitingStaffByProgram = new Map<string, number>();
  const developmentStaffByProgram = new Map<string, number>();
  for (const programId of Object.keys(state.programs)) {
    const roster = rostersByProgram.get(programId) ?? [];
    averageStardomByProgram.set(programId, roster.reduce((sum, player) => sum + player.stardom, 0) / Math.max(1, roster.length));
    recruitingStaffByProgram.set(programId, staffContribution(state, programId, "RECRUIT"));
    developmentStaffByProgram.set(programId, staffContribution(state, programId, "DEVELOP"));
  }
  return { rostersByProgram, averageStardomByProgram, recruitingStaffByProgram, developmentStaffByProgram };
}

/**
 * How well a program serves what this recruit is actually looking for. Reads
 * `Recruitable`, not `Prospect`, so a portal player is scored by exactly the
 * same formula as a high-school signee — one implementation, two pools.
 */
export function prospectProgramFit(state: Readonly<GameState>, prospect: Readonly<Recruitable>, programId: string, fitIndex?: ProspectFitIndex): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const roster = fitIndex?.rostersByProgram.get(programId)
    ?? Object.values(state.players).filter((player) => player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP");
  const rosterAtPosition = roster.filter((player) => player.position === prospect.position);
  const averageStardom = fitIndex?.averageStardomByProgram.get(programId)
    ?? roster.reduce((sum, player) => sum + player.stardom, 0) / Math.max(1, roster.length);
  const priorityScore = (priority: RecruitPriority): number => {
    if (priority === "EARLY_PLAYING_TIME") {
      const returning = rosterAtPosition.filter((player) => player.eligibility.seasonsRemaining > 1);
      const bestReturning = Math.max(40, ...returning.map((player) => player.overall));
      return clamp(95 - returning.length * 5 - Math.max(0, bestReturning - prospect.overall), 15, 95);
    }
    if (priority === "WINNING") return clamp(program.prestige * 0.55 + program.wins * 5 - program.losses * 2, 5, 100);
    if (priority === "PLAYER_DEVELOPMENT") return clamp(program.facilities.TRAINING * 16 + (fitIndex?.developmentStaffByProgram.get(programId) ?? staffContribution(state, programId, "DEVELOP")) / 6, 10, 100);
    if (priority === "NATIONAL_EXPOSURE") return clamp(program.nationalPress + Math.max(0, 26 - program.nationalRank), 5, 100);
    if (priority === "ACADEMICS") return program.facilities.ACADEMICS * 20;
    if (priority === "FACILITIES") return (program.facilities.TRAINING + program.facilities.RECRUITING) * 10;
    if (priority === "CLOSE_TO_HOME") {
      if (prospect.homeDivisionId !== program.divisionId) return 30;
      // A program that has actually developed players from this division
      // earns a little more than the flat home-territory discount everyone
      // gets — see `pipelineStrength` and `updatePipelineStrength`.
      const pipelineBonus = Math.min(PIPELINE_MAX_BONUS, program.pipelineStrength[prospect.homeDivisionId] ?? 0);
      return Math.min(100, 95 + pipelineBonus);
    }
    return clamp(averageStardom + program.nationalPress * 0.45, 5, 100);
  };
  return prospect.priorities.reduce((sum, priority) => sum + priorityScore(priority), 0) / prospect.priorities.length;
}

/**
 * Once a season, at rollover — not weekly, this is a slow-moving number.
 * Every division a program has ever touched decays a little first, so a
 * program that stops developing a territory slowly loses its edge there;
 * then whoever became a real contributor this season adds to it. Must run
 * before the eligibility loop resets `gamesPlayedThisSeason`.
 */
export function updatePipelineStrength(state: GameState): void {
  for (const program of Object.values(state.programs)) {
    const decayed: Partial<Record<DivisionId, number>> = {};
    for (const [divisionId, strength] of Object.entries(program.pipelineStrength) as [DivisionId, number][]) {
      const next = strength * PIPELINE_DECAY_RATE;
      // Let a spent pipeline actually reach zero rather than lingering forever.
      if (next > 0.05) decayed[divisionId] = next;
    }
    program.pipelineStrength = decayed;
  }
  for (const player of Object.values(state.players)) {
    if (player.programId === null || player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    const contributed = player.eligibility.gamesPlayedThisSeason >= PIPELINE_CONTRIBUTOR_GAMES
      || player.stardom >= PIPELINE_CONTRIBUTOR_STARDOM;
    if (!contributed) continue;
    const program = state.programs[player.programId];
    if (!program) continue;
    const divisionId = player.homeDivisionId;
    program.pipelineStrength[divisionId] = (program.pipelineStrength[divisionId] ?? 0) + PIPELINE_GAIN_PER_CONTRIBUTOR;
  }
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
    homeDivisionId: prospect.homeDivisionId,
    position: prospect.position,
    overall: prospect.overall,
    potential: prospect.potential,
    workEthic: prospect.workEthic,
    fatigue: 0,
    ratings: clone(prospect.ratings),
    injury: null,
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
      scoutingByProspect: {},
      offeredProspectIds: [],
      visitsUsedThisSeason: 0
    };
    recruiting.discoveredProspectIds = [];
    recruiting.scoutingByProspect = {};
    // A new class every season; last season's offers named prospects who are
    // already resolved one way or another, and this year's visit weekends
    // haven't been spent yet.
    recruiting.offeredProspectIds = [];
    recruiting.visitsUsedThisSeason = 0;
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
    if (player.programId === null || player.eligibility.rosterStatus !== "SCHOLARSHIP" || player.overall >= player.potential || currentInjury(player)) continue;
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
export function weeklyBriefing(
  state: Readonly<GameState>,
  programId: string,
  options: BriefingOptions = {}
): BriefingItem[] {
  return buildBriefing(state, programId, scoutingBoard(state, programId), options);
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

function recoverPlayers(state: GameState): void {
  for (const program of Object.values(state.programs)) {
    const strengthCoach = programStrengthCoachBenefits(state, program.id);
    const allocatedRecovery = staffContribution(state, program.id, "RECOVER") / 30;
    const fatigueRecovery = allocatedRecovery + strengthCoach.fatigueRecoveryPoints;
    for (const player of Object.values(state.players).filter((candidate) => candidate.programId === program.id && candidate.eligibility.rosterStatus === "SCHOLARSHIP")) {
      player.fatigue = clamp(Number((player.fatigue - fatigueRecovery).toFixed(1)), 0, 100);
    }
  }
}

interface InjuryDiagnosis {
  name: string;
  minimumWeeks: number;
  maximumWeeks: number;
  /** Empty means the diagnosis is plausible for every position. */
  positions?: readonly Position[];
  seasonEnding?: boolean;
}

/**
 * Diagnoses own their recovery ranges. A specific injury should never inherit
 * an implausible timeline merely because it shares a broad severity label.
 */
const INJURY_DIAGNOSES: Readonly<Record<InjurySeverity, readonly InjuryDiagnosis[]>> = {
  MINOR: [
    { name: "Grade 1 ankle sprain", minimumWeeks: 1, maximumWeeks: 2 },
    { name: "Shoulder contusion", minimumWeeks: 1, maximumWeeks: 2, positions: ["QB", "RB", "WR", "TE", "OL", "DL", "LB"] },
    { name: "Grade 1 hamstring strain", minimumWeeks: 1, maximumWeeks: 2, positions: ["QB", "RB", "WR", "TE", "LB", "DB", "K", "P"] },
    { name: "Sprained wrist", minimumWeeks: 1, maximumWeeks: 2 }
  ],
  MODERATE: [
    { name: "High ankle sprain", minimumWeeks: 3, maximumWeeks: 5 },
    { name: "MCL sprain", minimumWeeks: 3, maximumWeeks: 6 },
    { name: "Separated shoulder", minimumWeeks: 3, maximumWeeks: 6, positions: ["QB", "RB", "WR", "TE", "OL", "DL", "LB"] },
    { name: "Grade 2 hamstring strain", minimumWeeks: 3, maximumWeeks: 5, positions: ["QB", "RB", "WR", "TE", "LB", "DB", "K", "P"] },
    { name: "Torn meniscus", minimumWeeks: 4, maximumWeeks: 7 },
    { name: "Concussion", minimumWeeks: 1, maximumWeeks: 3, positions: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"] }
  ],
  MAJOR: [
    { name: "Torn ACL", minimumWeeks: 10, maximumWeeks: 14, positions: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"], seasonEnding: true },
    { name: "Torn Achilles tendon", minimumWeeks: 12, maximumWeeks: 14, positions: ["RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"], seasonEnding: true },
    { name: "Torn labrum", minimumWeeks: 7, maximumWeeks: 11, positions: ["QB", "RB", "WR", "TE", "OL", "DL", "LB"], seasonEnding: true },
    { name: "Broken collarbone", minimumWeeks: 6, maximumWeeks: 10, positions: ["QB", "RB", "WR", "TE", "LB", "DB"], seasonEnding: true },
    { name: "Lisfranc foot injury", minimumWeeks: 8, maximumWeeks: 12, positions: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"], seasonEnding: true },
    { name: "Torn pectoral tendon", minimumWeeks: 8, maximumWeeks: 12, positions: ["TE", "OL", "DL", "LB"], seasonEnding: true },
    { name: "Spinal fracture", minimumWeeks: 12, maximumWeeks: 14, positions: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"], seasonEnding: true },
    { name: "Major leg fracture", minimumWeeks: 10, maximumWeeks: 14, seasonEnding: true }
  ]
};

const POSITION_INJURY_MULTIPLIER: Readonly<Record<Position, number>> = {
  QB: 0.9,
  RB: 1.25,
  WR: 1,
  TE: 1.08,
  OL: 1.08,
  DL: 1.15,
  LB: 1.12,
  DB: 1,
  K: 0.4,
  P: 0.35
};

export interface InjuryRiskProjection {
  riskPercent: number;
  riskWithoutCoachPercent: number;
  coachReductionPercent: number;
}

/**
 * The injury attached to a player, including a generic bridge for prototype
 * saves that only stored a week counter.
 */
export function currentInjury(player: Readonly<Player>): PlayerInjury | null {
  if (player.injury && (player.injury.seasonEnding || player.injury.weeksRemaining > 0)) {
    return { ...player.injury, seasonEnding: player.injury.seasonEnding === true };
  }
  if (player.injuryWeeksRemaining <= 0) return null;
  return {
    name: "Undisclosed injury",
    severity: player.injuryWeeksRemaining >= 6 ? "MAJOR" : player.injuryWeeksRemaining >= 3 ? "MODERATE" : "MINOR",
    weeksRemaining: player.injuryWeeksRemaining,
    originalWeeks: player.injuryWeeksRemaining,
    seasonEnding: false,
    occurredSeason: 0,
    occurredWeek: 0
  };
}

function normalizePlayerHealthState(state: GameState): void {
  ensureEmergencyQuarterbacks(state);
  for (const player of Object.values(state.players)) {
    const injury = currentInjury(player);
    player.injury = injury;
    player.injuryWeeksRemaining = injury?.weeksRemaining ?? 0;
  }
}

const emergencyQuarterbackId = (programId: string): string => `${programId}-emergency-qb`;

/**
 * Every program owns one hidden replacement-level walk-on. He enters the active
 * depth chart only when no scholarship quarterback is available, cannot be
 * developed or injured, and costs no scholarship or recruiting slot.
 */
function ensureEmergencyQuarterbacks(state: GameState): void {
  const rng = new AddressableRng(state.identity.rootSeed).fork("emergency-quarterbacks");
  const orderedPrograms = Object.values(state.programs).sort((left, right) => left.id.localeCompare(right.id));
  for (const [index, program] of orderedPrograms.entries()) {
    const id = emergencyQuarterbackId(program.id);
    if (state.players[id]) continue;
    const overall = program.tier === "POWER" ? 55 : program.tier === "MID" ? 50 : 45;
    const shaped = attributesFor("QB").map((attribute) =>
      clamp(overall + Math.round(rng.between(`${id}:${attribute.key}`, -2, 2)), 32, 99));
    const shapedOverall = computeOverall("QB", Object.fromEntries(attributesFor("QB").map((attribute, attributeIndex) => [
      attribute.key, shaped[attributeIndex]!
    ])));
    const ratings = Object.fromEntries(attributesFor("QB").map((attribute, attributeIndex) => [
      attribute.key,
      clamp(shaped[attributeIndex]! + overall - shapedOverall, 32, 99)
    ]));
    state.players[id] = {
      id,
      name: fictionalPersonName(12_000 + index),
      programId: program.id,
      homeDivisionId: program.divisionId,
      position: "QB",
      overall: computeOverall("QB", ratings),
      potential: computeOverall("QB", ratings),
      workEthic: 0,
      fatigue: 0,
      ratings,
      injury: null,
      injuryWeeksRemaining: 0,
      stardom: 0,
      personalFans: 0,
      mediaAction: "FOOTBALL_FOCUS",
      lastGameRating: null,
      lastGameSummary: null,
      developmentFocus: "BALANCED",
      eligibility: {
        cohortYear: state.season,
        seasonsEnrolled: 0,
        seasonsParticipated: 0,
        seasonsRemaining: 4,
        redshirtStatus: "AVAILABLE",
        gamesPlayedThisSeason: 0,
        rosterStatus: "WALK_ON"
      }
    };
  }
}

function setPlayerInjury(player: Player, injury: PlayerInjury | null): void {
  player.injury = injury;
  player.injuryWeeksRemaining = injury?.weeksRemaining ?? 0;
}

/**
 * Exact per-game risk used by the engine. The UI can compare the two posted
 * percentages without having to reverse-engineer the coach's effect.
 */
export function playerInjuryRisk(
  state: Readonly<GameState>,
  player: Readonly<Player>,
  snaps = 55,
  developmentFocus: DevelopmentFocus = player.developmentFocus
): InjuryRiskProjection {
  const durabilityModifier = clamp(1 - (ratingByRole(player.position, player.ratings, "DURABILITY") - 50) / 160, 0.55, 1.15);
  const fatigueModifier = 1 + player.fatigue / 80;
  const workloadModifier = clamp(snaps / 55, 0.35, 1.15);
  const trainingModifier = developmentFocus === "STRENGTH" ? 1.15
    : developmentFocus === "CONDITIONING" ? 0.85
      : 1;
  const riskWithoutCoach = clamp(
    0.018 * POSITION_INJURY_MULTIPLIER[player.position] * durabilityModifier * fatigueModifier * workloadModifier
      * trainingModifier * trainingCampRiskMultiplier(state, player.programId),
    0.002,
    0.055
  );
  const strengthCoach = player.programId
    ? programStrengthCoachBenefits(state, player.programId)
    : { injuryRiskReductionPercent: 0 };
  const risk = riskWithoutCoach * (1 - strengthCoach.injuryRiskReductionPercent / 100);
  return {
    riskPercent: Number((risk * 100).toFixed(2)),
    riskWithoutCoachPercent: Number((riskWithoutCoach * 100).toFixed(2)),
    coachReductionPercent: strengthCoach.injuryRiskReductionPercent
  };
}

/**
 * Injured players first miss this week's game, then one recovery week comes off
 * the diagnosis. This fixes the old counter, where a one-week injury cleared
 * before the player missed a game.
 */
function recoverInjuries(
  state: GameState,
  rng: AddressableRng,
  events: GameEvent[],
  eventWeek = state.week
): void {
  for (const player of Object.values(state.players)) {
    const injury = currentInjury(player);
    if (!injury || !player.programId || player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    // "Season-ending" means unavailable for the rest of this season. It is not
    // a long counter the strength coach can erase, and rollover still clears it.
    if (injury.seasonEnding) continue;
    const coach = Object.values(state.staff)
      .find((member) => member.programId === player.programId && member.role === "STRENGTH_COACH");
    const benefits = programStrengthCoachBenefits(state, player.programId);
    const extraRecovery = injury.weeksRemaining > 1
      && rng.at(`${player.id}:strength-coach:extra-recovery`) < benefits.extraRecoveryChancePercent / 100;
    const weeksRemaining = Math.max(0, injury.weeksRemaining - 1 - (extraRecovery ? 1 : 0));
    if (extraRecovery && coach) {
      events.push({
        type: "INJURY_RECOVERY_ACCELERATED",
        season: state.season,
        week: eventWeek,
        playerId: player.id,
        injuryName: injury.name,
        weeksRemaining,
        coachId: coach.id
      });
    }
    if (weeksRemaining === 0) {
      setPlayerInjury(player, null);
      events.push({
        type: "PLAYER_RECOVERED",
        season: state.season,
        week: eventWeek,
        playerId: player.id,
        injuryName: injury.name,
        severity: injury.severity,
        returnedToStartingLineup: startingLineup(state, player.programId).some((candidate) => candidate.id === player.id)
      });
    } else {
      setPlayerInjury(player, { ...injury, weeksRemaining });
    }
  }
}

function processInjuries(
  state: GameState,
  rng: AddressableRng,
  events: GameEvent[],
  statLines: readonly PlayerGameStatLine[] = state.playerGameStats
    .filter((line) => line.season === state.season && line.week === state.week),
  injuryWeek = state.week
): void {
  const snapsByPlayer = new Map(statLines
    .filter((line) => line.snaps > 0)
    .map((line) => [line.playerId, line.snaps]));
  for (const [playerId, snaps] of snapsByPlayer) {
    const player = state.players[playerId];
    if (!player?.programId || player.eligibility.rosterStatus !== "SCHOLARSHIP" || currentInjury(player)) continue;
    const projection = playerInjuryRisk(state, player, snaps);
    if (rng.at(`${player.id}:injury`) >= projection.riskPercent / 100) continue;
    const severityRoll = rng.at(`${player.id}:injury-severity`);
    // Most injuries cost a game or two; a true season-ending loss should be a
    // headline, not routine roster churn.
    const severity: InjurySeverity = severityRoll < 0.78 ? "MINOR" : severityRoll < 0.97 ? "MODERATE" : "MAJOR";
    const positionDiagnoses = INJURY_DIAGNOSES[severity]
      .filter((candidate) => !candidate.positions || candidate.positions.includes(player.position));
    const diagnoses = positionDiagnoses.length > 0 ? positionDiagnoses : INJURY_DIAGNOSES[severity];
    const diagnosis = diagnoses[Math.floor(rng.at(`${player.id}:injury-name`) * diagnoses.length)]!;
    const weeks = diagnosis.minimumWeeks + Math.floor(rng.between(
      `${player.id}:injury-length`,
      0,
      diagnosis.maximumWeeks - diagnosis.minimumWeeks + 1
    ));
    const injury: PlayerInjury = {
      name: diagnosis.name,
      severity,
      weeksRemaining: weeks,
      originalWeeks: weeks,
      seasonEnding: diagnosis.seasonEnding === true,
      occurredSeason: state.season,
      occurredWeek: injuryWeek
    };
    const impact = projectedInjuryImpact(state, player.id);
    setPlayerInjury(player, injury);
    const replacement = replacementAfterInjury(state, player.id, impact.activeDepthIndex);
    const afterUnits = programUnitRatings(state, player.programId);
    const affectedUnit = mostAffectedUnit(player.position, impact.unitsBefore, afterUnits);
    const unitRatingBefore = affectedUnit ? impact.unitsBefore[affectedUnit] : null;
    const unitRatingAfter = affectedUnit ? afterUnits[affectedUnit] : null;
    const unitRatingChangePercent = unitRatingBefore && unitRatingAfter !== null
      ? Number(((unitRatingAfter - unitRatingBefore) / Math.max(1, unitRatingBefore) * 100).toFixed(1))
      : null;
    events.push({
      type: "PLAYER_INJURED",
      season: state.season,
      week: injuryWeek,
      playerId: player.id,
      injuryName: diagnosis.name,
      severity,
      weeks,
      risk: projection.riskPercent,
      riskWithoutCoach: projection.riskWithoutCoachPercent,
      coachReductionPercent: projection.coachReductionPercent,
      seasonEnding: injury.seasonEnding,
      wasStarter: impact.wasStarter,
      replacementPlayerId: replacement?.id ?? null,
      emergencyQuarterback: replacement?.eligibility.rosterStatus === "WALK_ON",
      affectedUnit,
      unitRatingBefore: unitRatingBefore === null ? null : Number(unitRatingBefore.toFixed(1)),
      unitRatingAfter: unitRatingAfter === null ? null : Number(unitRatingAfter.toFixed(1)),
      unitRatingChangePercent
    });
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
    },
    takeawayMultiplier: takeawayMultiplier(state, programId)
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
    { season: state.season, week: game.week, gameId: game.id },
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
      week: game.week,
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
  const gamesByProgram = new Map<string, GameState["schedule"][number]>();
  for (const game of state.schedule) {
    if (game.week !== state.week || !game.played) continue;
    gamesByProgram.set(game.homeProgramId, game);
    gamesByProgram.set(game.awayProgramId, game);
  }
  const rostersByProgram = new Map<string, Player[]>();
  for (const player of Object.values(state.players)) {
    if (!player.programId || player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    const roster = rostersByProgram.get(player.programId) ?? [];
    roster.push(player);
    rostersByProgram.set(player.programId, roster);
  }
  const statByPlayer = new Map<string, PlayerGameStatLine>();
  for (const line of state.playerGameStats) {
    if (line.season === state.season && line.week === state.week) statByPlayer.set(line.playerId, line);
  }
  for (const program of Object.values(state.programs)) {
    const game = gamesByProgram.get(program.id);
    const home = game?.homeProgramId === program.id;
    const scoreFor = game ? (home ? game.homeScore! : game.awayScore!) : null;
    const scoreAgainst = game ? (home ? game.awayScore! : game.homeScore!) : null;
    const won = scoreFor !== null && scoreAgainst !== null && scoreFor > scoreAgainst;
    const margin = scoreFor !== null && scoreAgainst !== null ? scoreFor - scoreAgainst : 0;
    const roster = rostersByProgram.get(program.id) ?? [];
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
    position, (() => {
      const active = chart[position].filter((playerId) => {
      const player = state.players[playerId];
      return Boolean(
        player
        && player.programId === programId
        && player.position === position
        && player.eligibility.rosterStatus === "SCHOLARSHIP"
        && player.eligibility.redshirtStatus !== "REDSHIRTING"
        && !currentInjury(player)
      );
      });
      if (position !== "QB" || active.length > 0) return active;
      const emergency = state.players[emergencyQuarterbackId(programId)];
      return emergency?.programId === programId && emergency.eligibility.rosterStatus === "WALK_ON"
        ? [emergency.id]
        : active;
    })()
  ])) as DepthChart;
}

/** The emergency walk-on currently active because every scholarship QB is out. */
export function activeEmergencyQuarterback(
  state: Readonly<GameState>,
  programId: string
): Player | null {
  const scholarshipAvailable = Object.values(state.players).some((player) =>
    player.programId === programId
    && player.position === "QB"
    && player.eligibility.rosterStatus === "SCHOLARSHIP"
    && player.eligibility.redshirtStatus !== "REDSHIRTING"
    && !currentInjury(player));
  if (scholarshipAvailable) return null;
  const emergency = state.players[emergencyQuarterbackId(programId)];
  return emergency?.eligibility.rosterStatus === "WALK_ON" ? emergency : null;
}

function projectedInjuryImpact(
  state: Readonly<GameState>,
  playerId: string
): { unitsBefore: TeamUnitRatings; activeDepthIndex: number; wasStarter: boolean } {
  const player = state.players[playerId];
  if (!player?.programId) {
    return {
      unitsBefore: { rushOffense: 0, passOffense: 0, rushDefense: 0, passDefense: 0 },
      activeDepthIndex: -1,
      wasStarter: false
    };
  }
  const chart = state.depthCharts[player.programId] ?? buildDefaultDepthChart(state, player.programId);
  const activeIds = chart[player.position].filter((candidateId) => {
    const candidate = state.players[candidateId];
    return Boolean(
      candidate
      && candidate.programId === player.programId
      && candidate.eligibility.rosterStatus === "SCHOLARSHIP"
      && candidate.eligibility.redshirtStatus !== "REDSHIRTING"
      && !currentInjury(candidate)
    );
  });
  const activeDepthIndex = activeIds.indexOf(playerId);
  return {
    unitsBefore: programUnitRatings(state, player.programId),
    activeDepthIndex,
    wasStarter: activeDepthIndex >= 0
      && activeDepthIndex < startersForRoom(state.programs[player.programId]?.schemeIdentity, player.position)
  };
}

function replacementAfterInjury(
  state: Readonly<GameState>,
  playerId: string,
  activeDepthIndex: number
): Player | null {
  const player = state.players[playerId];
  if (!player?.programId || activeDepthIndex < 0) return null;
  const replacementId = activeDepthChart(state, player.programId)[player.position][activeDepthIndex];
  return replacementId ? state.players[replacementId] ?? null : null;
}

function mostAffectedUnit(
  position: Position,
  before: Readonly<TeamUnitRatings>,
  after: Readonly<TeamUnitRatings>
): TeamUnit | null {
  const candidates: readonly TeamUnit[] = position === "QB" ? ["passOffense", "rushOffense"]
    : position === "RB" ? ["rushOffense"]
      : position === "WR" ? ["passOffense"]
        : position === "TE" || position === "OL" ? ["passOffense", "rushOffense"]
          : position === "DL" || position === "LB" ? ["rushDefense", "passDefense"]
            : position === "DB" ? ["passDefense", "rushDefense"]
              : [];
  return [...candidates].sort((left, right) =>
    Math.abs(before[right] - after[right]) - Math.abs(before[left] - after[left]))[0] ?? null;
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
  const gamesByProgram = new Map<string, GameState["schedule"][number]>();
  for (const game of state.schedule) {
    if (game.week !== state.week) continue;
    gamesByProgram.set(game.homeProgramId, game);
    gamesByProgram.set(game.awayProgramId, game);
  }
  const staffPayrollByProgram = new Map<string, number>();
  for (const staff of Object.values(state.staff)) {
    if (!staff.programId) continue;
    staffPayrollByProgram.set(staff.programId, (staffPayrollByProgram.get(staff.programId) ?? 0) + staff.salary / 52);
  }
  for (const program of Object.values(state.programs)) {
    const game = gamesByProgram.get(program.id);
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
      teamResultFanChange = Math.round(Math.max(250, fansBefore * 0.008));
      localPressChange += 6;
      if (rankedOpponent) {
        teamResultFanChange += Math.round(fansBefore * 0.012);
        nationalPressChange += 12;
      }
      if (marqueeGame) {
        teamResultFanChange += Math.round(fansBefore * 0.06);
        nationalPressChange += 10;
      }
    } else if (result === "LOSS") {
      teamResultFanChange = -Math.round(Math.max(300, fansBefore * (marqueeGame ? 0.004 : 0.0125)));
      localPressChange += -2;
      nationalPressChange += marqueeGame ? -2 : rankedOpponent ? -1 : 0;
    }
    const capacity = stadiumCapacity(program.facilities.STADIUM);
    // Price and marketing decide the gate. Advertising still buys followers on a
    // bye or on the road, but there is no ticket revenue without a home game.
    const playedAtHome = Boolean(homeGame && game?.played);
    // A local business that came through has already paid for this week's
    // advertising, so the program gets the reach without the cost. Spent on the
    // next home game and only there — advertising is inert on the road.
    const boosterCredit = playedAtHome ? state.boosters?.[program.id]?.advertisingCredit ?? 0 : 0;
    const gate = projectGate(
      program, opponent, capacity, marqueeGame, undefined,
      program.advertisingSpend + boosterCredit
    );
    if (boosterCredit > 0 && state.boosters?.[program.id]) {
      state.boosters[program.id]!.advertisingCredit = 0;
    }
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
    // Individual stars can amplify winning, but a roster full of box-score
    // events cannot turn a losing season into automatic fan growth.
    const brandFanLift = Math.round(brandImpact.schoolFanLift * (result === "WIN" ? 0.2 : result === "LOSS" ? 0.02 : 0.05));
    const fanChange = elasticResultChange + brandFanLift + advertisingFans + goodwillFanLoss;
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
    const sponsor = activeSponsorship(state, program.id);
    const sponsorPayment = sponsorshipPayment(
      sponsor,
      result,
      playedAtHome,
      attendance,
      capacity,
      opponentRank
    );
    if (sponsor && sponsorPayment.total > 0) {
      events.push({
        type: "SPONSORSHIP_PAYMENT",
        season: state.season,
        week: state.week,
        programId: program.id,
        sponsorName: sponsor.sponsorName,
        ...sponsorPayment
      });
    }
    // Media money is a function of the program's own recognition now, not a
    // constant stamped on it at creation, so becoming a national name pays.
    const media = mediaRights(program);
    const revenue = media.total + ticketRevenue + concessionRevenue + sponsorPayment.total;
    const staffPayroll = staffPayrollByProgram.get(program.id) ?? 0;
    // NIL commitments charge every week from the moment a recruit commits.
    // They ride the finance line rather than emitting their own weekly event —
    // the inbox lesson about the simulation talking to itself.
    const nilSpend = committedNilTotal(state, program.id);
    // Everything the program has built costs something to keep running. This is
    // the drain the economy never had: facilities were bought once and then were
    // free, so a program's costs could not grow with its ambitions.
    const operating = operatingCost(program, capacity, revenue);
    const expenses = Math.round(
      operating.total + staffPayroll + nilSpend + (playedAtHome ? program.advertisingSpend : 0)
    );
    const net = Math.round(revenue - expenses);
    program.budget += net;
    events.push({
      type: "WEEKLY_FINANCES",
      season: state.season,
      week: state.week,
      programId: program.id,
      revenue: Math.round(revenue),
      sponsorshipRevenue: sponsorPayment.total,
      nilSpend,
      expenses,
      net
    });
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
      playerFanLift: brandFanLift,
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
      sponsorshipRevenue: sponsorPayment.total,
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

function playerAwardCandidate(state: Readonly<GameState>, player: Readonly<Player>, indexedLines?: readonly PlayerGameStatLine[]): AwardCandidate | null {
  const lines = indexedLines ?? state.playerGameStats.filter((line) =>
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
  const linesByPlayer = new Map<string, PlayerGameStatLine[]>();
  if (awardType !== "COACH_OF_THE_YEAR") {
    for (const line of state.playerGameStats) {
      if (line.season !== state.season || line.week > 14) continue;
      const lines = linesByPlayer.get(line.playerId) ?? [];
      lines.push(line);
      linesByPlayer.set(line.playerId, lines);
    }
  }
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
      .map((player) => playerAwardCandidate(state, player, linesByPlayer.get(player.id) ?? []))
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
    // A coach-of-the-year award used to add 10 security here. Job security now
    // moves only in the board review, so the award's standing shows up there —
    // as the wins that earned it — rather than in a second place the projection
    // on the dashboard would not know about.
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
    const roundWeek = round === "FIRST_ROUND" ? 15 : round === "QUARTERFINAL" ? 16 : round === "SEMIFINAL" ? 17 : 18;
    const byeCount = participants.length > 8 ? Math.max(0, 16 - participants.length) : participants.length % 2;
    const advancing = participants.slice(0, byeCount);
    const playing = participants.slice(byeCount);
    const paired: Array<{ seed: number; programId: string }> = [];
    const roundStatLines: PlayerGameStatLine[] = [];
    for (let index = 0; index < Math.floor(playing.length / 2); index += 1) {
      const home = playing[index]!;
      const away = playing[playing.length - 1 - index]!;
      const gameId = `playoff:${state.season}:${gameIndex++}`;
      const homeField = round === "FIRST_ROUND";
      const gameRng = rng.fork(gameId);
      const scheduledGame = {
        id: gameId,
        week: roundWeek,
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
      roundStatLines.push(...result.home.statLines, ...result.away.statLines);
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
    // Postseason rounds are real weeks for player health. An injury already on
    // the roster costs this round before recovery advances, and only players
    // with actual snaps in these games are exposed to a new diagnosis.
    const healthRng = rng.fork("health", String(roundWeek));
    recoverInjuries(state, healthRng.fork("recovery"), events, roundWeek);
    processInjuries(state, healthRng.fork("injuries"), events, roundStatLines, roundWeek);
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
  // The title's effect on job security is applied by the board review as a
  // named reason (`CHAMPIONSHIP_BONUS`), not here — one number, one owner.
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

/** Deletes a departing player's NIL commitment and reports where the money went. */
function endNilCommitment(
  state: GameState,
  programId: string | null,
  playerId: string,
  reason: "GRADUATED" | "ELIGIBILITY_EXHAUSTED" | "TRANSFER_PORTAL",
  events: GameEvent[]
): void {
  if (!programId) return;
  const nil = state.nil?.[programId];
  const weeklyAmount = nil?.commitmentsByPlayer[playerId];
  if (!nil || weeklyAmount === undefined) return;
  delete nil.commitmentsByPlayer[playerId];
  events.push({ type: "NIL_COMMITMENT_ENDED", season: state.season, playerId, programId, weeklyAmount, reason });
}

function rolloverSeason(state: GameState, events: GameEvent[]): void {
  finalizeSeason(state, events);
  // Read before the eligibility loop below zeroes gamesPlayedThisSeason.
  updatePipelineStrength(state);
  // Fold the season that just finished. Per-game rows are the growth term in
  // both memory and the save file — about 2,300 a week at full league size —
  // and nothing after the season is over reads them individually. Done before
  // the season counter moves, so `state.season` is still the season being folded.
  // Postseason rows are spared: they are bounded (eleven games a season), they
  // are the permanent record a championship box score is rebuilt from, and the
  // playoff injury trail must trace to actual snaps after the season is over.
  state.playerSeasonStats ??= [];
  const isPostseasonRow = (row: PlayerGameStatLine): boolean => row.gameId.startsWith("playoff:");
  const folded = foldSeasonStats(state.playerGameStats.filter((row) => !isPostseasonRow(row)), state.season);
  if (folded.length > 0) {
    state.playerSeasonStats.push(...folded);
    state.playerGameStats = state.playerGameStats.filter((row) => row.season !== state.season || isPostseasonRow(row));
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
    player.injury = null;
    player.injuryWeeksRemaining = 0;
    if (player.eligibility.seasonsRemaining <= 0) {
      player.eligibility.rosterStatus = "GRADUATED";
      events.push({ type: "PLAYER_DEPARTED", season: state.season, playerId: player.id, reason: "ELIGIBILITY_EXHAUSTED" });
      endNilCommitment(state, player.programId, player.id, "ELIGIBILITY_EXHAUSTED", events);
      continue;
    }
    const program = state.programs[player.programId]!;
    const academicProtection = Math.max(0, program.facilities.ACADEMICS - 1) * 0.015;
    const playingTimePressure = player.overall > teamStrength(state, program) + 4 ? 0.02 : 0;
    const transferRisk = clamp(0.08 + playingTimePressure - academicProtection, 0.01, 0.12);
    if (portalRng.at(`${player.id}:transfer`) < transferRisk) {
      player.eligibility.rosterStatus = "PORTAL";
      events.push({ type: "PLAYER_DEPARTED", season: state.season, playerId: player.id, reason: "TRANSFER_PORTAL" });
      endNilCommitment(state, player.programId, player.id, "TRANSFER_PORTAL", events);
    }
  }
  openPortalWindow(state, new AddressableRng(state.identity.rootSeed).fork("portal-listings", String(state.season)), events);
  // The season is finished and every departure is settled. The rest of what
  // used to happen here — enrolling the incoming class, generating next
  // year's board, rebuilding the schedule — now waits until the offseason's
  // last step, because the portal can still change who is on this roster.
  state.phase = "OFFSEASON";
  state.offseasonStep = OFFSEASON_STEPS[0];
  events.push({ type: "OFFSEASON_BEGAN", season: state.season, step: OFFSEASON_STEPS[0] });
}

/**
 * The board meets on every program in the league, in one pass.
 *
 * Rivals are judged by the identical rule rather than by a separate AI policy,
 * which is what this codebase has required of every contested system since the
 * scouting department: a rule only the player is subject to is a rule the
 * player should not be subject to either. It is also where the coaching market
 * gets its churn from — a fired rival leaves a real vacancy that the COACHING
 * step then has to fill.
 *
 * Programs are walked in sorted id order and the review consumes no RNG, so
 * neither the order nor the presence of this step can shift a draw anywhere
 * else in the engine.
 */
function resolveBoardReview(state: GameState, events: GameEvent[]): void {
  for (const programId of Object.keys(state.programs).sort()) {
    const program = state.programs[programId]!;
    // `jobReview` finds the completed season itself, so the UI's projection and
    // this verdict are the same call with the same inputs.
    const review = jobReview(state, programId);
    if (!review) continue;
    events.push({
      type: "BOARD_REVIEW_COMPLETED",
      season: state.season,
      programId,
      verdict: review.verdict,
      wins: review.wins,
      losses: review.losses,
      target: review.target,
      securityBefore: review.securityBefore,
      securityAfter: review.securityAfter,
      reasons: review.reasons
    });
    if (review.survives) {
      program.coachSecurity = review.securityAfter;
      program.coachTenure += 1;
      program.championshipDeadline = review.mandateSeasonsLeft;
      continue;
    }
    // Dismissed. The chair empties, and the engine is deliberately silent about
    // what that means for the human — it emits the same event for all
    // seventy-two programs and lets the career layer decide that one of them
    // ends a playthrough.
    const headCoach = Object.values(state.staff).find(
      (member) => member.programId === programId && member.role === "HEAD_COACH"
    );
    const cause = review.mandateExpired
      ? "MANDATE"
      : program.budget < 0 ? "INSOLVENCY" : "EXPECTATIONS";
    events.push({
      type: "COACH_FIRED",
      season: state.season,
      programId,
      staffId: headCoach?.id ?? null,
      staffName: headCoach?.name ?? "Nobody",
      // The season just played counts. `coachTenure` is only incremented on
      // survival, so at the moment of a dismissal it still holds the seasons
      // *before* this one — reporting it raw put "1 season in the chair" beside
      // a two-year 25-3 record on the career screen.
      tenure: program.coachTenure + 1,
      cause
    });
    if (headCoach) delete state.staff[headCoach.id];
    program.coachSecurity = startingSecurity(program.tier);
    program.coachTenure = 0;
    program.championshipDeadline = null;
  }
}

/**
 * Everyone who just entered the portal becomes a listing anybody can bid on,
 * including the program he is leaving. Interest is drawn the same
 * addressable way a prospect's is, so the same seed always meets the same
 * market.
 */
function openPortalWindow(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  state.portal = {};
  const programIds = Object.keys(state.programs).sort();
  for (const player of Object.values(state.players).sort((left, right) => left.id.localeCompare(right.id))) {
    if (player.eligibility.rosterStatus !== "PORTAL" || player.programId === null) continue;
    const priorities = [...RECRUIT_PRIORITIES]
      .sort((left, right) => rng.at(`${player.id}:priority:${left}`) - rng.at(`${player.id}:priority:${right}`))
      .slice(0, 3);
    state.portal[player.id] = {
      previousProgramId: player.programId,
      priorities,
      interestByProgram: Object.fromEntries(programIds.map((programId) => [
        programId,
        Number(rng.between(`${player.id}:${programId}:interest`, 35, 88).toFixed(3))
      ])),
      bidsByProgram: {}
    };
    events.push({
      type: "PORTAL_PLAYER_LISTED",
      season: state.season,
      playerId: player.id,
      previousProgramId: player.programId,
      askingPrice: portalAskingPrice(player)
    });
  }
}

interface PortalContest {
  playerId: string;
  listing: PortalListingState;
  scores: Record<string, number>;
  ranked: string[];
  nextChoice: number;
}

interface PortalProposal {
  contest: PortalContest;
  programId: string;
  score: number;
  points: number;
}

/** Open scholarships that can actually be occupied during this portal window. */
export function portalScholarshipOpenings(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const scholarships = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP"
  ).length;
  return Math.max(0, program.scholarshipLimit - scholarships);
}

/**
 * Returns the proposals a program can tentatively hold. Score is its fixed
 * preference: a later proposal can displace a weaker one, while scholarship
 * and point limits are applied to the whole set rather than to each listing.
 */
function portalProposalsToHold(
  proposals: readonly PortalProposal[],
  scholarshipOpenings: number,
  recruitingPoints: number
): PortalProposal[] {
  const ranked = [...proposals].sort((left, right) =>
    right.score - left.score || left.contest.playerId.localeCompare(right.contest.playerId)
  );
  const held: PortalProposal[] = [];
  let pointsHeld = 0;
  for (const proposal of ranked) {
    if (held.length >= scholarshipOpenings) break;
    // Normal command validation reserves the complete bid portfolio, so this
    // guard is defensive for imported or hand-edited states. Never allow the
    // market to create a negative Recruiting Points balance.
    if (pointsHeld + proposal.points > recruitingPoints) continue;
    held.push(proposal);
    pointsHeld += proposal.points;
  }
  return held;
}

/**
 * One shot, all bids together. Players propose down their fixed score ranking;
 * programs tentatively hold their strongest affordable proposals up to their
 * real scholarship capacity. A player displaced by a stronger portal win then
 * falls through to his next eligible bidder. This deferred acceptance keeps
 * command/listing order out of the result and resolves the market as a whole.
 */
function resolvePortalMarket(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  const contests: PortalContest[] = Object.entries(state.portal ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([playerId, listing]) => {
      const player = state.players[playerId];
      if (!player) return [];
      const bidders = Object.keys(listing.bidsByProgram).filter((programId) =>
        state.programs[programId] !== undefined && state.recruiting[programId] !== undefined
      ).sort();
      const scores = Object.fromEntries(bidders.map((programId) => [
        programId,
        portalBidScore(state, player, listing, programId, rng)
      ]));
      const ranked = bidders
        .filter((programId) => scores[programId]! >= PORTAL_COMMITMENT_THRESHOLD)
        .sort((left, right) => scores[right]! - scores[left]! || left.localeCompare(right));
      return [{ playerId, listing, scores, ranked, nextChoice: 0 }];
    });

  const openings = Object.fromEntries(Object.keys(state.programs).map((programId) => [
    programId,
    portalScholarshipOpenings(state, programId)
  ]));
  const pointBudgets = Object.fromEntries(Object.keys(state.programs).map((programId) => [
    programId,
    Math.max(0, Math.trunc(state.recruiting[programId]?.points ?? 0))
  ]));
  const heldByProgram = new Map<string, PortalProposal[]>();
  const pending = contests.filter((contest) => contest.ranked.length > 0);

  while (pending.length > 0) {
    pending.sort((left, right) => left.playerId.localeCompare(right.playerId));
    const contest = pending.shift()!;
    const programId = contest.ranked[contest.nextChoice++];
    if (!programId) continue;
    const bid = contest.listing.bidsByProgram[programId]!;
    const proposal: PortalProposal = { contest, programId, score: contest.scores[programId]!, points: bid.points };
    const considered = [...(heldByProgram.get(programId) ?? []), proposal];
    const held = portalProposalsToHold(considered, openings[programId] ?? 0, pointBudgets[programId] ?? 0);
    heldByProgram.set(programId, held);
    const heldPlayers = new Set(held.map((candidate) => candidate.contest.playerId));
    for (const rejected of considered) {
      if (!heldPlayers.has(rejected.contest.playerId) && rejected.contest.nextChoice < rejected.contest.ranked.length) {
        pending.push(rejected.contest);
      }
    }
  }

  const winnerByPlayer = new Map<string, PortalProposal>();
  for (const proposals of heldByProgram.values()) {
    for (const proposal of proposals) winnerByPlayer.set(proposal.contest.playerId, proposal);
  }

  for (const contest of contests) {
    const { playerId, listing } = contest;
    const player = state.players[playerId]!;
    const winner = winnerByPlayer.get(playerId);
    if (!winner) {
      player.eligibility.rosterStatus = "DEPARTED";
      events.push({
        type: "PORTAL_PLAYER_UNCLAIMED",
        season: state.season,
        playerId,
        previousProgramId: listing.previousProgramId
      });
      continue;
    }
    const { programId: winnerProgramId, score, points } = winner;
    const rankedAlternatives = contest.ranked.filter((programId) => programId !== winnerProgramId);
    const runnerUpProgramId = rankedAlternatives[0] ?? null;
    const weeklyNil = listing.bidsByProgram[winnerProgramId]?.weeklyNil ?? 0;
    const retained = winnerProgramId === listing.previousProgramId;
    // The point portfolio was reserved when bids were entered and checked
    // again during matching. Only a completed signing converts that reservation
    // into a spend; losing and capacity-displaced bids remain free.
    state.recruiting[winnerProgramId]!.points -= points;
    // A transfer keeps whatever eligibility he had left — the one real way he
    // differs from a freshman, and the reason the portal is the fast climb.
    player.programId = winnerProgramId;
    player.eligibility.rosterStatus = "SCHOLARSHIP";
    if (weeklyNil > 0) {
      state.nil ??= {};
      state.nil[winnerProgramId] ??= emptyNilState();
      state.nil[winnerProgramId]!.commitmentsByPlayer[playerId] = weeklyNil;
    }
    events.push({
      type: "PORTAL_PLAYER_SIGNED",
      season: state.season,
      playerId,
      programId: winnerProgramId,
      previousProgramId: listing.previousProgramId,
      retained,
      score,
      runnerUpProgramId,
      runnerUpScore: runnerUpProgramId ? contest.scores[runnerUpProgramId]! : null,
      weeklyNil
    });
  }
  state.portal = {};
  for (const programId of Object.keys(state.programs)) repairDepthChart(state, programId);
}

/**
 * The same shape as `recruitingScore`, on the same coefficients, reading the
 * same `prospectProgramFit`. What it drops are the terms a one-shot window
 * has no room for — a standing offer, accumulated visits, a verbal commitment
 * to defend — and what it adds is the incumbent's existing relationship.
 */
function portalBidScore(
  state: GameState,
  player: Readonly<Player>,
  listing: Readonly<PortalListingState>,
  programId: string,
  rng: AddressableRng
): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const bid = listing.bidsByProgram[programId] ?? { points: 0, weeklyNil: 0 };
  const recruitable = portalRecruitable(player, listing);
  const facilityBonus = Math.max(0, program.facilities.RECRUITING - 1) * 2;
  const staffBonus = staffContribution(state, programId, "RECRUIT") / 25;
  const exposureBonus = program.localPress / 50 + program.nationalPress / 20;
  const appealBonus = program.recruitAppeal + (player.homeDivisionId === program.divisionId ? program.homeRegionBias / 8 : 0);
  const nilBonus = portalNilScore(bid.weeklyNil, portalAskingPrice(player), portalPriorityWeight(listing));
  const incumbentBonus = programId === listing.previousProgramId ? PORTAL_INCUMBENT_BONUS : 0;
  return Number((
    listing.interestByProgram[programId]! * 0.3
    + prospectProgramFit(state, recruitable, programId) * 0.35
    + bid.points * 0.75
    + facilityBonus
    + staffBonus
    + exposureBonus
    + appealBonus
    + nilBonus
    + incumbentBonus
    + rng.between(`${player.id}:${programId}:decision-noise`, -2, 2)
  ).toFixed(3));
}

/**
 * The offseason's closing act: what `rolloverSeason` used to do inline. Runs
 * once, after the final step, when the roster is settled and it is finally
 * safe to enroll a class against a known scholarship count.
 */
function completeOffseason(state: GameState, events: GameEvent[]): void {
  // Resolved prospect records from earlier classes are no longer gameplay
  // state—the enrolled player carries forward independently. Pruning them here
  // keeps larger, position-safe annual cohorts from growing saves forever.
  for (const [prospectId, prospect] of Object.entries(state.prospects)) {
    if (prospect.status === "ENROLLED" || prospect.status === "WITHDRAWN") delete state.prospects[prospectId];
  }
  const positions = Object.keys(ROSTER_COMPOSITION) as Position[];
  const scholarshipCounts = new Map<string, number>();
  const positionCounts = new Map<string, Record<Position, number>>();
  const availableByPosition = Object.fromEntries(positions.map((position) => [position, [] as Prospect[]])) as Record<Position, Prospect[]>;
  for (const programId of Object.keys(state.programs)) {
    scholarshipCounts.set(programId, 0);
    positionCounts.set(programId, Object.fromEntries(positions.map((position) => [position, 0])) as Record<Position, number>);
  }
  for (const player of Object.values(state.players)) {
    if (player.eligibility.rosterStatus !== "SCHOLARSHIP" || !player.programId) continue;
    scholarshipCounts.set(player.programId, (scholarshipCounts.get(player.programId) ?? 0) + 1);
    const rooms = positionCounts.get(player.programId);
    if (rooms) rooms[player.position] += 1;
  }
  for (const prospect of Object.values(state.prospects)) {
    if (prospect.status === "AVAILABLE") availableByPosition[prospect.position].push(prospect);
  }

  const enroll = (prospect: Prospect, programId: string, lateFill = false): void => {
    const playerId = `player:${prospect.id}`;
    state.players[playerId] = prospectToPlayer(prospect, playerId, programId, state.season + 1);
    prospect.signedProgramId = programId;
    prospect.status = "ENROLLED";
    scholarshipCounts.set(programId, (scholarshipCounts.get(programId) ?? 0) + 1);
    const rooms = positionCounts.get(programId);
    if (rooms) rooms[prospect.position] += 1;
    // The NIL deal followed a recruited player to campus. Late-fill players
    // arrive after the market closes and never inherit an unaccepted offer.
    if (!lateFill) {
      const nil = state.nil?.[programId];
      const committedNil = nil?.commitmentsByPlayer[prospect.id];
      if (nil && committedNil !== undefined) {
        delete nil.commitmentsByPlayer[prospect.id];
        nil.commitmentsByPlayer[playerId] = committedNil;
      }
    }
    events.push({ type: "PROSPECT_ENROLLED", season: state.season + 1, prospectId: prospect.id, playerId, programId, lateFill });
  };

  for (const program of Object.values(state.programs)) {
    const commitments = Object.values(state.prospects)
      // Everyone still COMMITTED should already be SIGNED by the signing
      // week; SIGNED is the real gate and COMMITTED stays only as a safety
      // net so nobody is ever lost to an ordering surprise.
      .filter((prospect) => (prospect.status === "SIGNED" || prospect.status === "COMMITTED") && prospect.signedProgramId === program.id)
      .sort((left, right) => {
        const leftPoints = state.recruiting[program.id]?.scoutingByProspect[left.id]?.pursuitPoints ?? 0;
        const rightPoints = state.recruiting[program.id]?.scoutingByProspect[right.id]?.pursuitPoints ?? 0;
        return rightPoints - leftPoints || right.potential - left.potential || left.id.localeCompare(right.id);
      });
    for (const prospect of commitments) {
      const scholarships = scholarshipCounts.get(program.id) ?? 0;
      if (scholarships >= program.scholarshipLimit) {
        // The class filled before he got here. Resolve him rather than leave
        // him stuck in COMMITTED forever — a real, if unhappy, outcome.
        prospect.status = "WITHDRAWN";
        events.push({ type: "PROSPECT_COMMITMENT_VOIDED", season: state.season, prospectId: prospect.id, programId: program.id, reason: "CLASS_FULL" });
        continue;
      }
      enroll(prospect, program.id);
    }

    // A recruiting miss should hurt quality and depth, not make a dynasty
    // mechanically unplayable. After signing day, assign the best interested
    // unsigned players at each dangerously thin position until the minimum
    // viable room is restored. These are deliberately late fills: no NIL deal,
    // no recruiting-point refund, and no guarantee of reaching the ideal 85.
    const rooms = positionCounts.get(program.id)!;
    for (const position of positions) {
      while (rooms[position] < ROSTER_MINIMUMS[position]) {
        if ((scholarshipCounts.get(program.id) ?? 0) >= program.scholarshipLimit) {
          const conversion = Object.values(state.players)
            .filter((player) => player.programId === program.id
              && player.eligibility.rosterStatus === "SCHOLARSHIP"
              && rooms[player.position] > ROSTER_MINIMUMS[player.position])
            .sort((left, right) => left.overall - right.overall || left.id.localeCompare(right.id))[0];
          if (!conversion) break;
          const from = conversion.position;
          rooms[from] -= 1;
          rooms[position] += 1;
          conversion.position = position;
          conversion.ratings = createPlayerRatings(
            conversion.overall,
            position,
            new AddressableRng(state.identity.rootSeed).fork("roster-position-conversion", String(state.season)),
            `${program.id}:${conversion.id}:${position}`
          );
          events.push({ type: "ROSTER_POSITION_CONVERTED", season: state.season + 1, playerId: conversion.id, programId: program.id, from, to: position });
          continue;
        }
        const pool = availableByPosition[position];
        let candidateIndex = -1;
        for (let index = 0; index < pool.length; index += 1) {
          const prospect = pool[index]!;
          if (prospect.status !== "AVAILABLE") continue;
          if (candidateIndex < 0) { candidateIndex = index; continue; }
          const incumbent = pool[candidateIndex]!;
          const prospectFit = prospect.interestByProgram[program.id] ?? 0;
          const incumbentFit = incumbent.interestByProgram[program.id] ?? 0;
          if (prospectFit > incumbentFit
            || (prospectFit === incumbentFit && prospect.potential > incumbent.potential)
            || (prospectFit === incumbentFit && prospect.potential === incumbent.potential && prospect.overall > incumbent.overall)
            || (prospectFit === incumbentFit && prospect.potential === incumbent.potential && prospect.overall === incumbent.overall && prospect.id < incumbent.id)) {
            candidateIndex = index;
          }
        }
        let candidate = candidateIndex >= 0 ? pool.splice(candidateIndex, 1)[0] : undefined;
        if (!candidate) {
          // If the national class runs out at one scarce position, convert an
          // unsigned athlete instead of allowing an unplayable room. The new
          // ratings are regenerated for the new position from the save seed,
          // so an emergency DL is not secretly carrying kicker attributes.
          const alternatives = positions.flatMap((sourcePosition) =>
            availableByPosition[sourcePosition]
              .map((prospect, index) => ({ prospect, index, sourcePosition }))
              .filter(({ prospect }) => prospect.status === "AVAILABLE")
          ).sort((left, right) => {
            const leftFit = left.prospect.interestByProgram[program.id] ?? 0;
            const rightFit = right.prospect.interestByProgram[program.id] ?? 0;
            return rightFit - leftFit || right.prospect.potential - left.prospect.potential
              || right.prospect.overall - left.prospect.overall || left.prospect.id.localeCompare(right.prospect.id);
          });
          const alternative = alternatives[0];
          if (alternative) {
            candidate = availableByPosition[alternative.sourcePosition].splice(alternative.index, 1)[0];
            if (candidate) {
              candidate.position = position;
              candidate.ratings = createPlayerRatings(
                candidate.overall,
                position,
                new AddressableRng(state.identity.rootSeed).fork("late-position-conversion", String(state.season)),
                `${program.id}:${candidate.id}:${position}`
              );
            }
          }
        }
        if (!candidate) break;
        enroll(candidate, program.id, true);
      }
    }
    repairDepthChart(state, program.id);
  }
  for (const prospect of Object.values(state.prospects)) {
    if (prospect.status === "AVAILABLE") prospect.status = "WITHDRAWN";
  }
  // The class is settled. Offers on prospects nobody signed die with the board,
  // and a commitment to a recruit who never made it to campus (class full) is
  // void — the money only ever follows a man who actually enrolls.
  for (const [programId, nil] of Object.entries(state.nil ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
    for (const [prospectId, weeklyAmount] of Object.entries(nil.offersByProspect).sort(([left], [right]) => left.localeCompare(right))) {
      events.push({
        type: "NIL_OFFER_RESOLVED",
        season: state.season,
        week: state.week,
        programId,
        prospectId,
        weeklyAmount,
        winnerProgramId: null,
        result: "WITHDRAWN",
        reason: "BOARD_CLOSED"
      });
    }
    nil.offersByProspect = {};
    for (const id of Object.keys(nil.commitmentsByPlayer)) {
      const prospect = state.prospects[id];
      if (prospect && prospect.status !== "ENROLLED") delete nil.commitmentsByPlayer[id];
    }
  }
  state.season += 1; state.week = 0;
  for (const program of Object.values(state.programs)) { program.wins = 0; program.losses = 0; }
  const programCount = Object.keys(state.programs).length;
  const nameRng = new AddressableRng(state.identity.rootSeed).fork("league-generation", "fictional-names");
  const firstNameOffset = Math.floor(nameRng.between("first-offset", 0, 96));
  const lastNameOffset = Math.floor(nameRng.between("last-offset", 0, 160));
  const initialPeople = programCount * (STARTING_ROSTER_SIZE + STAFF_ROLES.length + 30);
  const annualCohortSize = programCount * 35;
  const seasonOffset = Math.max(0, state.season - 2028) * annualCohortSize;
  generateProspects(state, new AddressableRng(state.identity.rootSeed).fork("recruiting-cohort", String(state.season)), annualCohortSize, String(state.season), initialPeople + seasonOffset, firstNameOffset, lastNameOffset);
  initializeRecruitingBoards(state, new AddressableRng(state.identity.rootSeed).fork("recruiting-boards", String(state.season)));
  for (const program of Object.values(state.programs)) {
    const recruiting = state.recruiting[program.id]!;
    recruiting.weeklyPoints = recruitingWeeklyPoints(state, program.id);
    recruiting.points = recruiting.weeklyPoints;
  }
  buildSeasonSchedule(state);
  refreshSponsorshipOffers(state);
  // The offseason has settled the class, but the new year does not silently
  // start. Give every program the same explicit preseason checkpoint the first
  // season has: schemes/staff, roster review, depth chart, redshirts,
  // sponsorship and marquee scheduling all happen before BEGIN_SEASON.
  state.phase = "ROSTER_REVIEW";
  state.offseasonStep = null;
}

/** Fixed order. The offseason ends when the last one resolves. */
/**
 * `BOARD_REVIEW` runs first because being told whether you still have the job
 * has to precede every decision that assumes you do. A coach cannot sensibly
 * bid on the portal before he knows he will be there to coach the player.
 */
export const OFFSEASON_STEPS = ["BOARD_REVIEW", "PORTAL", "SIGNING_DAY", "COACHING", "TRAINING_CAMP"] as const satisfies readonly OffseasonStep[];

/**
 * Resolves the open offseason step for the whole league and moves everyone to
 * the next one together — the same lockstep model a week already uses. This
 * is deliberately not `advanceWeek`: no games are played, and the commands
 * that are valid differ step by step.
 */
export function advanceOffseasonStep(
  input: Readonly<GameState>,
  commands: readonly GameCommand[] = [],
  deferStandingClosure = false
): SimulationResult {
  const state = cloneGameState(input);
  if (state.phase !== "OFFSEASON" || !state.offseasonStep) {
    throw new Error("There is no offseason step open.");
  }
  const step = state.offseasonStep;
  const events: GameEvent[] = [];
  const rng = new AddressableRng(state.identity.rootSeed).fork("offseason", String(state.season), step);
  resolveOffseasonCommands(state, step, commands, rng.fork("commands"), events);
  if (step === "BOARD_REVIEW") resolveBoardReview(state, events);
  if (step === "PORTAL") resolvePortalMarket(state, rng.fork("portal-market"), events);
  if (!deferStandingClosure) closeStandingDecisionAudits(state, events);
  const nextIndex = OFFSEASON_STEPS.indexOf(step) + 1;
  const nextStep = OFFSEASON_STEPS[nextIndex] ?? null;
  events.push({ type: "OFFSEASON_STEP_COMPLETED", season: state.season, step, nextStep });
  if (nextStep) {
    state.offseasonStep = nextStep;
  } else {
    completeOffseason(state, events);
  }
  if (!deferStandingClosure) closeStandingDecisionAudits(state, events);
  state.eventHistory.push(...events);
  if (state.eventHistory.length > 10_000) {
    state.eventHistory = retainedDecisionEventHistory(state.eventHistory, state.decisionAudits ?? [], 10_000);
  }
  return { state, events };
}

/**
 * Every step is skippable, so the only universally valid command is the one
 * that declines to act. Anything else is refused with the reason and the step
 * it does belong to — a command sent to the wrong step is a mistake worth
 * naming rather than silently dropping.
 */
function resolveOffseasonCommands(
  state: GameState,
  step: OffseasonStep,
  commands: readonly GameCommand[],
  _rng: AddressableRng,
  events: GameEvent[]
): void {
  // Sorted so a program cannot change the outcome by ordering its own bids.
  const ordered = [...commands].sort((left, right) => offseasonArbitrationKey(left).localeCompare(offseasonArbitrationKey(right)));
  for (const command of ordered) {
    if (command.type === "CONTINUE_OFFSEASON") continue;
    if (command.type === "BID_PORTAL_PLAYER" && step === "PORTAL") {
      applyPortalBid(state, command, events);
      continue;
    }
    // The coaching market is the one already built. This step is the
    // scheduled appointment with it, so a player who never opens the staff
    // screen mid-season still gets one guaranteed look a year.
    if (command.type === "REPLACE_STAFF" && step === "COACHING") {
      resolveCommands(state, [command], _rng.fork("coaching"), events);
      continue;
    }
    if (command.type === "SET_TRAINING_CAMP_FOCUS" && step === "TRAINING_CAMP") {
      state.trainingCamp ??= {};
      state.trainingCamp[command.programId] = { focus: command.focus, weeksRemaining: TRAINING_CAMP_WEEKS };
      events.push({
        type: "TRAINING_CAMP_SET",
        season: state.season,
        programId: command.programId,
        focus: command.focus,
        weeks: TRAINING_CAMP_WEEKS
      });
      continue;
    }
    events.push({
      type: "COMMAND_REJECTED",
      programId: command.programId,
      command,
      reason: `That decision cannot be made during ${OFFSEASON_STEP_LABELS[step]}.`
    });
  }
}

function offseasonArbitrationKey(command: GameCommand): string {
  if (command.type === "BID_PORTAL_PLAYER") return `${command.programId}:0:${command.playerId}`;
  return `${command.programId}:9:${command.type}`;
}

/**
 * Records one program's bid on one portal player. Absolute, not additive: a
 * second bid replaces the first, so no amount of re-sending changes what the
 * market sees. Nothing is charged here — the window resolves together, and
 * only the winner pays.
 */
function applyPortalBid(
  state: GameState,
  command: Extract<GameCommand, { type: "BID_PORTAL_PLAYER" }>,
  events: GameEvent[]
): void {
  const reject = (reason: string): void => {
    events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason });
  };
  const listing = state.portal?.[command.playerId];
  const player = state.players[command.playerId];
  if (!listing || !player) { reject("That player is not in the portal."); return; }
  const recruiting = state.recruiting[command.programId];
  const program = state.programs[command.programId];
  if (!recruiting || !program) { reject("Program does not exist."); return; }

  const points = Math.trunc(command.points);
  const weeklyNil = Math.max(0, Math.round(command.weeklyNil));
  if (points === 0 && weeklyNil === 0) {
    delete listing.bidsByProgram[command.programId];
    events.push({
      type: "PORTAL_BID_SET",
      season: state.season,
      week: state.week,
      programId: command.programId,
      playerId: command.playerId,
      points: 0,
      weeklyNil: 0,
      withdrawn: true
    });
    return;
  }
  if (points < PORTAL_MINIMUM_POINTS) {
    reject(`A serious bid starts at ${PORTAL_MINIMUM_POINTS} Recruiting Points.`);
    return;
  }
  // A program can only take him if it will have room for him.
  if (portalScholarshipOpenings(state, command.programId) <= 0) {
    reject("The projected roster is full.");
    return;
  }
  const existing = listing.bidsByProgram[command.programId];
  const otherPoints = Object.values(state.portal ?? {})
    .reduce((sum, other) => sum + (other === listing ? 0 : other.bidsByProgram[command.programId]?.points ?? 0), 0);
  if (points + otherPoints > recruiting.points) {
    reject("Not enough Recruiting Points to cover every bid you have out.");
    return;
  }
  // Committed dollars plus every live bid must stay inside the donor ceiling,
  // exactly as a recruiting offer must — the same portfolio decision.
  const reservedElsewhere = reservedPortalNil(state, command.programId) - (existing?.weeklyNil ?? 0);
  const available = weeklyDonorCapacity(program)
    - committedNilTotal(state, command.programId)
    - reservedNilTotal(state, command.programId)
    - reservedElsewhere;
  if (weeklyNil > available) {
    reject("Your donors cannot cover that offer alongside the money already promised.");
    return;
  }
  listing.bidsByProgram[command.programId] = { points, weeklyNil };
  events.push({
    type: "PORTAL_BID_SET",
    season: state.season,
    week: state.week,
    programId: command.programId,
    playerId: command.playerId,
    points,
    weeklyNil,
    withdrawn: false
  });
}

/** The execution head start camp is still paying, if any. */
export function trainingCampExecutionBonus(state: Readonly<GameState>, programId: string): number {
  const camp = state.trainingCamp?.[programId];
  if (!camp || camp.weeksRemaining <= 0 || camp.focus !== "INSTALL") return 0;
  return TRAINING_CAMP_INSTALL_BONUS;
}

/** The injury-risk multiplier camp is still applying, if any. */
export function trainingCampRiskMultiplier(state: Readonly<GameState>, programId: string | null): number {
  if (!programId) return 1;
  const camp = state.trainingCamp?.[programId];
  if (!camp || camp.weeksRemaining <= 0) return 1;
  if (camp.focus === "CONDITIONING") return TRAINING_CAMP_CONDITIONING_RISK;
  if (camp.focus === "INSTALL") return TRAINING_CAMP_INSTALL_RISK;
  return 1;
}

export const OFFSEASON_STEP_LABELS: Record<OffseasonStep, string> = {
  BOARD_REVIEW: "the board's review",
  PORTAL: "the transfer portal",
  SIGNING_DAY: "signing day",
  COACHING: "the coaching market",
  TRAINING_CAMP: "training camp"
};
