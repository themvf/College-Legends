export type ProgramId = string;
export type PlayerId = string;
export type ProspectId = string;
export type Season = number;

export type CareerPath = "DYNASTY_BUILDER" | "PROGRAM_RISER" | "CHAMPIONSHIP_MANDATE";
export type RosterStatus = "SCHOLARSHIP" | "WALK_ON" | "PORTAL" | "DEPARTED" | "GRADUATED";
export type GamePhase = "ROSTER_REVIEW" | "REGULAR_SEASON";
export type Position = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "K" | "P";
export type DevelopmentFocus = "BALANCED" | "TECHNIQUE" | "STRENGTH" | "CONDITIONING";
export type StaffRole = "HEAD_COACH" | "OFFENSIVE_COORDINATOR" | "DEFENSIVE_COORDINATOR" | "STRENGTH_COACH";
export type StaffAssignment = "GAME_PREP" | "PLAYER_DEVELOPMENT" | "RECRUITING" | "RECOVERY";
export type FacilityType = "TRAINING" | "STADIUM" | "ACADEMICS" | "RECRUITING";
export type DivisionId = "ATLANTIC" | "GREAT_LAKES" | "HEARTLAND" | "GULF" | "MOUNTAIN" | "PACIFIC";
export type PlayerRating = "technique" | "strength" | "conditioning" | "injuryPrevention" | "armStrength";
export type PlayerMediaAction = "FOOTBALL_FOCUS" | "MEDIA_DAY" | "SOCIAL_MEDIA" | "COMMUNITY_APPEARANCE";

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
  redshirtStatus: "AVAILABLE" | "USED" | "INELIGIBLE";
  gamesPlayedThisSeason: number;
  rosterStatus: RosterStatus;
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
  /** A prospect's private fit with each school, generated from the save seed. */
  interestByProgram: Record<ProgramId, number>;
  status: "AVAILABLE" | "SIGNED";
  signedProgramId: ProgramId | null;
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
  weeklyRevenue: number;
  weeklyExpenses: number;
  facilities: Record<FacilityType, number>;
}

export interface ScheduledGame {
  id: string;
  week: number;
  homeProgramId: ProgramId;
  awayProgramId: ProgramId;
  matchupType: "DIVISION" | "CROSS_DIVISION" | "MARQUEE";
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
  staff: Record<string, StaffMember>;
  schedule: ScheduledGame[];
  eventHistory: GameEvent[];
}

export interface BalanceConfiguration {
  version: string;
  weeklyDevelopment: {
    base: number;
    coachWeight: number;
    workEthicWeight: number;
    fatigueFloor: number;
    maximum: number;
  };
  game: { possessions: number; homeFieldAdvantage: number; upsetNoise: number };
}

export type GameCommand =
  | { type: "OFFER_PROSPECT"; programId: ProgramId; prospectId: ProspectId }
  | { type: "RED_SHIRT"; programId: ProgramId; playerId: PlayerId }
  | { type: "SET_DEVELOPMENT_FOCUS"; programId: ProgramId; playerId: PlayerId; focus: DevelopmentFocus }
  | { type: "ASSIGN_STAFF"; programId: ProgramId; staffId: string; assignment: StaffAssignment }
  | { type: "UPGRADE_FACILITY"; programId: ProgramId; facility: FacilityType }
  | { type: "SET_PLAYER_MEDIA_ACTION"; programId: ProgramId; playerId: PlayerId; action: PlayerMediaAction }
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
  | { type: "DEVELOPMENT_FOCUS_SET"; season: Season; week: number; programId: ProgramId; playerId: PlayerId; focus: DevelopmentFocus }
  | { type: "STAFF_ASSIGNED"; season: Season; week: number; programId: ProgramId; staffId: string; assignment: StaffAssignment }
  | { type: "FACILITY_UPGRADED"; season: Season; week: number; programId: ProgramId; facility: FacilityType; newLevel: number; cost: number }
  | { type: "MARQUEE_GAME_SCHEDULED"; season: Season; programId: ProgramId; opponentProgramId: ProgramId; week: number; guarantee: number; opponentRank: number }
  | { type: "PLAYER_MEDIA_ACTION_SET"; season: Season; week: number; programId: ProgramId; playerId: PlayerId; action: PlayerMediaAction }
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
      ticketRevenue: number;
      concessionRevenue: number;
      localPressChange: number;
      nationalPressChange: number;
      guaranteePaid: number;
      weeklyNet: number;
    }
  | { type: "COMMAND_REJECTED"; programId: ProgramId; command: GameCommand; reason: string };

export interface SimulationResult { state: GameState; events: GameEvent[]; }
