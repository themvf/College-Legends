export type ProgramId = string;
export type PlayerId = string;
export type ProspectId = string;
export type Season = number;

export type CareerPath = "DYNASTY_BUILDER" | "PROGRAM_RISER" | "CHAMPIONSHIP_MANDATE";
export type RosterStatus = "SCHOLARSHIP" | "WALK_ON" | "PORTAL" | "DEPARTED" | "GRADUATED";
export type GamePhase = "ROSTER_REVIEW" | "REGULAR_SEASON";
export type Position = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "K" | "P";
export type DevelopmentFocus = "BALANCED" | "TECHNIQUE" | "STRENGTH" | "CONDITIONING";
export type DevelopmentSpotlightTarget =
  | { type: "PLAYER"; playerId: PlayerId }
  | { type: "POSITION"; position: Position };
export type StaffRole = "HEAD_COACH" | "OFFENSIVE_COORDINATOR" | "DEFENSIVE_COORDINATOR" | "STRENGTH_COACH";
export type StaffAssignment = "GAME_PREP" | "PLAYER_DEVELOPMENT" | "RECRUITING" | "RECOVERY";
export type FacilityType = "TRAINING" | "STADIUM" | "ACADEMICS" | "RECRUITING";
export type DivisionId = "ATLANTIC" | "GREAT_LAKES" | "HEARTLAND" | "GULF" | "MOUNTAIN" | "PACIFIC";
export type PlayerRating = "technique" | "strength" | "conditioning" | "injuryPrevention" | "armStrength";
export type PlayerMediaAction = "FOOTBALL_FOCUS" | "MEDIA_DAY" | "SOCIAL_MEDIA" | "COMMUNITY_APPEARANCE";
export type RecruitingEvaluation = "BASIC" | "ATHLETIC" | "POSITION" | "CHARACTER" | "MEDICAL" | "PROJECTION";
export type RecruitingSearchType = "LOCAL_REGION" | "POSITION" | "SLEEPERS" | "NATIONAL_SHOWCASE";
export type RedshirtStatus = "AVAILABLE" | "REDSHIRTING" | "USED" | "INELIGIBLE";
export type TeamUnit = "rushOffense" | "passOffense" | "rushDefense" | "passDefense";
export type RunPassBalance = "RUN_HEAVY" | "BALANCED" | "PASS_HEAVY";
export type BackfieldUsage = "FEATURE_BACK" | "COMMITTEE";
export type TargetDistribution = "SPREAD_IT" | "FEED_THE_STAR";
export type OffensiveTempo = "HURRY_UP" | "NORMAL" | "CONTROL_CLOCK";
export type DefensivePriority = "STOP_THE_RUN" | "BALANCED" | "STOP_THE_PASS";
export type DefensivePosture = "TAKEAWAY_HUNT" | "CONTAIN" | "BEND_DONT_BREAK";
export type PassRushPressure = "HEAVY_BLITZ" | "SITUATIONAL" | "COVERAGE_FIRST";
export type PlayType = "RUN" | "PASS";
/** A program's lasting football identity. Rivals are recognisable because of it,
 *  and it is what an opponent scouting report has to reveal. */
export type OffensiveIdentity = "POWER_RUN" | "PRO_BALANCED" | "SPREAD_PASS";
export type DefensiveIdentity = "AGGRESSIVE" | "DISCIPLINED" | "CONSERVATIVE";
export type ScoutingTier = "TENDENCIES" | "PERSONNEL" | "GAME_PLAN";
export type SeasonAwardType =
  | "PLAYER_OF_THE_YEAR"
  | "OFFENSIVE_PLAYER_OF_THE_YEAR"
  | "DEFENSIVE_PLAYER_OF_THE_YEAR"
  | "FRESHMAN_OF_THE_YEAR"
  | "COACH_OF_THE_YEAR";
export type PostseasonRound = "FIRST_ROUND" | "QUARTERFINAL" | "SEMIFINAL" | "NATIONAL_CHAMPIONSHIP";
export type RecruitPriority =
  | "EARLY_PLAYING_TIME"
  | "WINNING"
  | "PLAYER_DEVELOPMENT"
  | "NATIONAL_EXPOSURE"
  | "ACADEMICS"
  | "FACILITIES"
  | "CLOSE_TO_HOME"
  | "PERSONAL_STARDOM";

export interface PlayerRatings {
  technique: number;
  strength: number;
  conditioning: number;
  injuryPrevention: number;
  /** Arm strength affects quarterbacks directly and represents throwing/power skill for other positions. */
  armStrength: number;
}

export interface Eligibility {
  cohortYear: number;
  seasonsEnrolled: number;
  seasonsParticipated: number;
  seasonsRemaining: number;
  redshirtStatus: RedshirtStatus;
  gamesPlayedThisSeason: number;
  rosterStatus: RosterStatus;
}

export type DepthChart = Record<Position, PlayerId[]>;

export interface PlayerGameStatLine {
  id: string;
  season: Season;
  week: number;
  gameId: string;
  playerId: PlayerId;
  programId: ProgramId;
  opponentProgramId: ProgramId;
  position: Position;
  started: boolean;
  result: "WIN" | "LOSS";
  gameRating: number;
  snaps: number;
  passingAttempts: number;
  passingCompletions: number;
  passingYards: number;
  passingTouchdowns: number;
  interceptionsThrown: number;
  /** Sacks surrendered, taken from the opposing front seven's recorded sacks. */
  sacksTaken: number;
  rushingAttempts: number;
  rushingYards: number;
  rushingTouchdowns: number;
  targets: number;
  receptions: number;
  receivingYards: number;
  receivingTouchdowns: number;
  tackles: number;
  tacklesForLoss: number;
  sacks: number;
  defensiveInterceptions: number;
  passBreakups: number;
  fieldGoalsAttempted: number;
  fieldGoalsMade: number;
  punts: number;
  puntYards: number;
  blockingGrade: number;
}

/**
 * The four ratings a game is actually resolved against. Each is produced by the
 * position groups responsible for it, so a call like "stop the run" has a
 * specific number to move rather than a team-wide average.
 */
export type TeamUnitRatings = Record<TeamUnit, number>;

/**
 * A program's standing weekly preparation. Unlike development focus, a game
 * plan persists until the player changes it — it is a standing instruction, not
 * a one-week action.
 */
export interface GamePlan {
  runPassBalance: RunPassBalance;
  backfieldUsage: BackfieldUsage;
  targetDistribution: TargetDistribution;
  tempo: OffensiveTempo;
  defensivePriority: DefensivePriority;
  defensivePosture: DefensivePosture;
  pressure: PassRushPressure;
}

export interface SchemeIdentity {
  offense: OffensiveIdentity;
  defense: DefensiveIdentity;
}

/**
 * Weekly preparation. Points are attention rather than savings: they refresh
 * each week and do not bank, so a week not spent is a week wasted.
 */
export interface PreparationProgramState {
  points: number;
  weeklyPoints: number;
  /** Tiers bought against this week's opponent. Cleared at every new week. */
  scoutedTiers: ScoutingTier[];
  scoutedOpponentId: ProgramId | null;
}

/** Why a weekly decision is worth revisiting. Absent when nothing has changed. */
export interface DecisionAlert {
  id: "TICKET_PRICE" | "ADVERTISING" | "DEVELOPMENT" | "OFFENSE" | "DEFENSE";
  label: string;
  current: string;
  detail: string;
  /** Set when something has changed enough that the current setting deserves a look. */
  attention: string | null;
}

/** A player worth this week's development attention, and what he is for. */
export interface DevelopmentCandidate {
  playerId: PlayerId;
  name: string;
  position: Position;
  overall: number;
  reason: "RISING" | "STAR" | "AT_RISK";
  headline: string;
  detail: string;
}

/** One axis of an opponent's likely calls, as probabilities that never reach certainty. */
export interface ScoutedTendency {
  axis: string;
  label: string;
  options: { value: string; label: string; probability: number }[];
}

export interface ScoutedUnit {
  unit: TeamUnit;
  /** A range, not a number: better scouting narrows it but never removes it. */
  low: number;
  high: number;
}

export interface OpponentScoutingReport {
  opponentProgramId: ProgramId | null;
  tiers: ScoutingTier[];
  /** Games of film available this season. Week 1 has none, which widens everything. */
  filmGames: number;
  confidence: number;
  record: string;
  nationalRank: number | null;
  /** Public reputation, known without paying. */
  reputation: string | null;
  identity: SchemeIdentity | null;
  units: ScoutedUnit[] | null;
  keyPlayers: { playerId: PlayerId; name: string; position: Position; note: string }[] | null;
  tendencies: ScoutedTendency[] | null;
  notes: string[];
}

/** How one team's plan fared against the other's, for the weekly plan report. */
export interface MatchupOutcome {
  unit: TeamUnit;
  rating: number;
  opposingRating: number;
  edge: number;
  plays: number;
  yards: number;
  yardsPerPlay: number;
  touchdowns: number;
}

export interface AwardCandidate {
  programId: ProgramId;
  playerId: PlayerId | null;
  staffId: string | null;
  score: number;
  performanceScore: number;
  productionScore: number;
  teamSuccessScore: number;
  visibilityScore: number;
  evidence: string[];
}

export interface SeasonAward {
  type: SeasonAwardType;
  winner: AwardCandidate;
  finalists: AwardCandidate[];
}

export interface PlayoffSeed {
  seed: number;
  programId: ProgramId;
  qualification: "DIVISION_CHAMPION" | "AT_LARGE";
}

export interface PostseasonGame {
  id: string;
  season: Season;
  round: PostseasonRound;
  homeProgramId: ProgramId;
  awayProgramId: ProgramId;
  homeSeed: number;
  awaySeed: number;
  homeScore: number;
  awayScore: number;
  winnerProgramId: ProgramId;
}

export interface SeasonHistory {
  season: Season;
  awards: SeasonAward[];
  divisionChampions: Partial<Record<DivisionId, ProgramId>>;
  playoffSeeds: PlayoffSeed[];
  postseasonGames: PostseasonGame[];
  nationalChampionProgramId: ProgramId;
  nationalRunnerUpProgramId: ProgramId;
  finalRecords: Record<ProgramId, { wins: number; losses: number; nationalRank: number }>;
}

export interface Player {
  id: PlayerId;
  name: string;
  programId: ProgramId | null;
  position: Position;
  overall: number;
  potential: number;
  workEthic: number;
  fatigue: number;
  ratings: PlayerRatings;
  injuryWeeksRemaining: number;
  /** A persistent 0-100 measure of how recognizable the player is nationally. */
  stardom: number;
  /** Fans who primarily follow this player; weekly gains can convert into program fans. */
  personalFans: number;
  mediaAction: PlayerMediaAction;
  lastGameRating: number | null;
  lastGameSummary: string | null;
  developmentFocus: DevelopmentFocus;
  eligibility: Eligibility;
}

/** A recruit is intentionally not a Player until a program signs them. */
export interface Prospect {
  id: ProspectId;
  name: string;
  position: Player["position"];
  overall: number;
  potential: number;
  workEthic: number;
  ratings: PlayerRatings;
  homeStateCode: string;
  homeDivisionId: DivisionId;
  reputation: "UNRANKED" | "REGIONAL" | "NATIONAL" | "ELITE";
  priorities: RecruitPriority[];
  /** A prospect's private fit with each school, generated from the save seed. */
  interestByProgram: Record<ProgramId, number>;
  status: "AVAILABLE" | "COMMITTED" | "ENROLLED" | "WITHDRAWN";
  signedProgramId: ProgramId | null;
}

export interface ProspectScoutingState {
  evaluations: RecruitingEvaluation[];
  /** Persistent staff investment that remains with the recruit until he commits. */
  pursuitPoints: number;
}

export interface RecruitingProgramState {
  points: number;
  weeklyPoints: number;
  discoveredProspectIds: ProspectId[];
  scoutingByProspect: Record<ProspectId, ProspectScoutingState>;
}

export interface DevelopmentSpotlight {
  focus: Exclude<DevelopmentFocus, "BALANCED">;
  target: DevelopmentSpotlightTarget;
}

export interface Program {
  id: ProgramId;
  name: string;
  nickname: string;
  abbreviation: string;
  city: string;
  state: string;
  stateCode: string;
  divisionId: DivisionId;
  tier: "LOW" | "MID" | "POWER";
  budget: number;
  scholarshipLimit: number;
  wins: number;
  losses: number;
  championships: number;
  coachSecurity: number;
  prestige: number;
  fanSupport: number;
  /** The addressable audience that can turn into attendance and game-day revenue. */
  fanBase: number;
  localPress: number;
  nationalPress: number;
  nationalRank: number;
  schemeIdentity: SchemeIdentity;
  /** Price of a home-game ticket. Demand falls as it rises above what the
   *  program's standing justifies, and goodwill falls with it. */
  ticketPrice: number;
  /** Weekly marketing spend. Buys attendance now and fan base later. */
  advertisingSpend: number;
  weeklyRevenue: number;
  weeklyExpenses: number;
  facilities: Record<FacilityType, number>;
}

export interface ScheduledGame {
  id: string;
  week: number;
  homeProgramId: ProgramId;
  awayProgramId: ProgramId;
  matchupType: "DIVISION" | "CROSS_DIVISION" | "MARQUEE" | "PLAYOFF";
  /** Paid by the home program during preseason to bring a ranked visitor to campus. */
  guaranteePaid: number;
  marqueeOpponentRank: number | null;
  played: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

export interface StaffMember {
  id: string;
  programId: ProgramId;
  name: string;
  role: StaffRole;
  rating: number;
  salary: number;
  assignment: StaffAssignment;
}

export interface GameState {
  identity: {
    rootSeed: string;
    balanceConfiguration: BalanceConfiguration;
    simulationVersion: string;
  };
  season: Season;
  week: number;
  phase: GamePhase;
  programs: Record<ProgramId, Program>;
  players: Record<PlayerId, Player>;
  prospects: Record<ProspectId, Prospect>;
  recruiting: Record<ProgramId, RecruitingProgramState>;
  /** One optional development investment per program and week. Position groups trade intensity for breadth. */
  developmentSpotlights: Record<ProgramId, DevelopmentSpotlight | null>;
  /** Standing weekly preparation per program; persists until changed. */
  gamePlans: Record<ProgramId, GamePlan>;
  preparation: Record<ProgramId, PreparationProgramState>;
  staff: Record<string, StaffMember>;
  depthCharts: Record<ProgramId, DepthChart>;
  playerGameStats: PlayerGameStatLine[];
  schedule: ScheduledGame[];
  seasonHistory: SeasonHistory[];
  eventHistory: GameEvent[];
}

export interface BalanceConfiguration {
  version: string;
  weeklyDevelopment: {
    base: number;
    workEthicWeight: number;
    fatigueFloor: number;
    maximum: number;
  };
  /** Drives per team come from the chosen tempo, not from a fixed count. */
  game: { homeFieldAdvantage: number };
}

export type GameCommand =
  | { type: "OFFER_PROSPECT"; programId: ProgramId; prospectId: ProspectId }
  | { type: "SEARCH_PROSPECTS"; programId: ProgramId; searchType: RecruitingSearchType; position?: Position }
  | { type: "EVALUATE_PROSPECT"; programId: ProgramId; prospectId: ProspectId; evaluation: RecruitingEvaluation }
  | { type: "INVEST_RECRUITING_POINTS"; programId: ProgramId; prospectId: ProspectId; points: number }
  | { type: "RED_SHIRT"; programId: ProgramId; playerId: PlayerId }
  | { type: "SET_REDSHIRT"; programId: ProgramId; playerId: PlayerId; enabled: boolean }
  | { type: "SET_DEPTH_CHART"; programId: ProgramId; position: Position; playerIds: PlayerId[] }
  | { type: "SET_DEVELOPMENT_SPOTLIGHT"; programId: ProgramId; focus: Exclude<DevelopmentFocus, "BALANCED">; target: DevelopmentSpotlightTarget }
  | { type: "ASSIGN_STAFF"; programId: ProgramId; staffId: string; assignment: StaffAssignment }
  | { type: "UPGRADE_FACILITY"; programId: ProgramId; facility: FacilityType }
  | { type: "SET_PLAYER_MEDIA_ACTION"; programId: ProgramId; playerId: PlayerId; action: PlayerMediaAction }
  | { type: "SET_GAME_PLAN"; programId: ProgramId; plan: Partial<GamePlan> }
  | { type: "SCOUT_OPPONENT"; programId: ProgramId; tier: ScoutingTier }
  | { type: "SET_TICKET_PRICE"; programId: ProgramId; price: number }
  | { type: "SET_ADVERTISING"; programId: ProgramId; spend: number }
  | { type: "SCHEDULE_MARQUEE_HOME_GAME"; programId: ProgramId; opponentProgramId: ProgramId };

export type GameEvent =
  | {
      type: "PLAYER_DEVELOPED";
      season: Season;
      week: number;
      playerId: PlayerId;
      previousOverall: number;
      newOverall: number;
      factors: {
        workEthic: number;
        fatigueModifier: number;
        focus: DevelopmentFocus;
        ratingChanges: Partial<Record<PlayerRating, number>>;
      };
    }
  | { type: "PLAYER_INJURED"; season: Season; week: number; playerId: PlayerId; weeks: number; risk: number }
  | { type: "PLAYER_RECOVERED"; season: Season; week: number; playerId: PlayerId }
  | { type: "GAME_COMPLETED"; season: Season; week: number; gameId: string; homeProgramId: ProgramId; awayProgramId: ProgramId; homeScore: number; awayScore: number }
  | {
      type: "SEASON_AWARD_FINALIZED";
      season: Season;
      awardType: SeasonAwardType;
      programId: ProgramId;
      playerId: PlayerId | null;
      staffId: string | null;
      score: number;
      playerFanGain: number;
      programFanGain: number;
      prestigeGain: number;
      nationalPressGain: number;
    }
  | { type: "DIVISION_TITLE_WON"; season: Season; divisionId: DivisionId; programId: ProgramId }
  | {
      type: "PLAYOFF_GAME_COMPLETED";
      season: Season;
      round: PostseasonRound;
      gameId: string;
      homeProgramId: ProgramId;
      awayProgramId: ProgramId;
      homeScore: number;
      awayScore: number;
      winnerProgramId: ProgramId;
    }
  | {
      type: "NATIONAL_CHAMPION_CROWNED";
      season: Season;
      championProgramId: ProgramId;
      runnerUpProgramId: ProgramId;
      fanGain: number;
      prestigeGain: number;
      nationalPressGain: number;
      revenueGain: number;
    }
  | { type: "PLAYER_DEPARTED"; season: Season; playerId: PlayerId; reason: "GRADUATED" | "ELIGIBILITY_EXHAUSTED" | "TRANSFER_PORTAL" }
  | {
      type: "RECRUITING_CONTEST_RESOLVED";
      season: Season;
      week: number;
      prospectId: ProspectId;
      offeredBy: ProgramId[];
      winnerProgramId: ProgramId;
      scores: Record<ProgramId, number>;
    }
  | { type: "PROSPECT_SIGNED"; season: Season; week: number; prospectId: ProspectId; playerId: PlayerId; programId: ProgramId }
  | {
      type: "PROSPECTS_DISCOVERED";
      season: Season;
      week: number;
      programId: ProgramId;
      searchType: RecruitingSearchType;
      prospectIds: ProspectId[];
      pointsSpent: number;
    }
  | {
      type: "PROSPECT_EVALUATED";
      season: Season;
      week: number;
      programId: ProgramId;
      prospectId: ProspectId;
      evaluation: RecruitingEvaluation;
      pointsSpent: number;
    }
  | {
      type: "RECRUITING_INVESTMENT";
      season: Season;
      week: number;
      programId: ProgramId;
      prospectId: ProspectId;
      pointsSpent: number;
      totalInvestment: number;
    }
  | {
      type: "PROSPECT_COMMITTED";
      season: Season;
      week: number;
      prospectId: ProspectId;
      programId: ProgramId;
      score: number;
      runnerUpProgramId: ProgramId | null;
      runnerUpScore: number | null;
    }
  | { type: "PROSPECT_ENROLLED"; season: Season; prospectId: ProspectId; playerId: PlayerId; programId: ProgramId }
  | {
      type: "RECRUITING_POINTS_ADDED";
      season: Season;
      week: number;
      programId: ProgramId;
      pointsAdded: number;
      pointsAvailable: number;
    }
  | {
      type: "DEVELOPMENT_SPOTLIGHT_SET";
      season: Season;
      week: number;
      programId: ProgramId;
      focus: Exclude<DevelopmentFocus, "BALANCED">;
      target: DevelopmentSpotlightTarget;
      playerIds: PlayerId[];
      intensity: number;
    }
  | { type: "STAFF_ASSIGNED"; season: Season; week: number; programId: ProgramId; staffId: string; assignment: StaffAssignment }
  | { type: "FACILITY_UPGRADED"; season: Season; week: number; programId: ProgramId; facility: FacilityType; newLevel: number; cost: number }
  | { type: "MARQUEE_GAME_SCHEDULED"; season: Season; programId: ProgramId; opponentProgramId: ProgramId; week: number; guarantee: number; opponentRank: number }
  | { type: "PLAYER_MEDIA_ACTION_SET"; season: Season; week: number; programId: ProgramId; playerId: PlayerId; action: PlayerMediaAction }
  | { type: "DEPTH_CHART_UPDATED"; season: Season; week: number; programId: ProgramId; position: Position; playerIds: PlayerId[] }
  | { type: "REDSHIRT_STATUS_CHANGED"; season: Season; week: number; programId: ProgramId; playerId: PlayerId; status: RedshirtStatus }
  | {
      type: "PLAYER_BRAND_UPDATED";
      season: Season;
      week: number;
      programId: ProgramId;
      playerId: PlayerId;
      gameRating: number | null;
      performanceSummary: string;
      mediaAction: PlayerMediaAction;
      stardomBefore: number;
      stardomAfter: number;
      stardomChange: number;
      personalFansBefore: number;
      personalFansAfter: number;
      personalFanChange: number;
      schoolFanLift: number;
    }
  | { type: "OPPONENT_SCOUTED"; season: Season; week: number; programId: ProgramId; opponentProgramId: ProgramId; tier: ScoutingTier; pointsSpent: number; confidence: number }
  | { type: "TICKET_PRICE_SET"; season: Season; week: number; programId: ProgramId; price: number; fairPrice: number }
  | { type: "ADVERTISING_SET"; season: Season; week: number; programId: ProgramId; spend: number }
  | { type: "PREP_POINTS_ADDED"; season: Season; week: number; programId: ProgramId; pointsAdded: number }
  | { type: "GAME_PLAN_SET"; season: Season; week: number; programId: ProgramId; plan: GamePlan; changed: (keyof GamePlan)[] }
  | {
      /** What each side called, and what the calls were worth. */
      type: "GAME_PLAN_REPORT";
      season: Season;
      week: number;
      gameId: string;
      programId: ProgramId;
      opponentProgramId: ProgramId;
      plan: GamePlan;
      opponentPlan: GamePlan;
      units: TeamUnitRatings;
      opponentUnits: TeamUnitRatings;
      matchups: MatchupOutcome[];
      runPlays: number;
      passPlays: number;
      takeaways: number;
      giveaways: number;
      sacksFor: number;
      sacksAgainst: number;
      leadBackShare: number;
      topTargetShare: number;
      notes: string[];
    }
  | { type: "WEEKLY_FINANCES"; season: Season; week: number; programId: ProgramId; revenue: number; expenses: number; net: number }
  | {
      type: "WEEKLY_RECAP";
      season: Season;
      week: number;
      programId: ProgramId;
      result: "WIN" | "LOSS" | "BYE";
      opponentProgramId: ProgramId | null;
      opponentRank: number | null;
      homeGame: boolean;
      marqueeGame: boolean;
      scoreFor: number | null;
      scoreAgainst: number | null;
      fansBefore: number;
      fansAfter: number;
      fanChange: number;
      teamResultFanChange: number;
      playerFanLift: number;
      featuredPlayerId: PlayerId | null;
      featuredPlayerRating: number | null;
      attendance: number;
      capacity: number;
      ticketPrice: number;
      fairTicketPrice: number;
      advertisingSpend: number;
      advertisingFans: number;
      ticketRevenue: number;
      concessionRevenue: number;
      localPressChange: number;
      nationalPressChange: number;
      guaranteePaid: number;
      weeklyNet: number;
    }
  | { type: "COMMAND_REJECTED"; programId: ProgramId; command: GameCommand; reason: string };

export interface SimulationResult { state: GameState; events: GameEvent[]; }
