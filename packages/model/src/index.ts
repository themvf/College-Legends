export type ProgramId = string;
export type PlayerId = string;
export type Season = number;

export type CareerPath = "DYNASTY_BUILDER" | "PROGRAM_RISER" | "CHAMPIONSHIP_MANDATE";
export type RosterStatus = "SCHOLARSHIP" | "WALK_ON" | "PORTAL" | "DEPARTED" | "GRADUATED";

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
  position: "QB" | "RB" | "WR" | "OL" | "DL" | "LB" | "DB";
  overall: number;
  potential: number;
  workEthic: number;
  fatigue: number;
  eligibility: Eligibility;
}

export interface Program {
  id: ProgramId;
  name: string;
  tier: "LOW" | "MID" | "POWER";
  budget: number;
  scholarshipLimit: number;
  wins: number;
  losses: number;
  championships: number;
  coachSecurity: number;
}

export interface ScheduledGame {
  id: string;
  homeProgramId: ProgramId;
  awayProgramId: ProgramId;
  played: boolean;
}

export interface GameState {
  identity: {
    rootSeed: string;
    balanceConfiguration: BalanceConfiguration;
    simulationVersion: string;
  };
  season: Season;
  week: number;
  programs: Record<ProgramId, Program>;
  players: Record<PlayerId, Player>;
  schedule: ScheduledGame[];
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
  | { type: "OFFER_PROSPECT"; programId: ProgramId; prospectId: PlayerId }
  | { type: "RED_SHIRT"; programId: ProgramId; playerId: PlayerId };

export type GameEvent =
  | { type: "PLAYER_DEVELOPED"; season: Season; week: number; playerId: PlayerId; previousOverall: number; newOverall: number; factors: { workEthic: number; fatigueModifier: number } }
  | { type: "GAME_COMPLETED"; season: Season; week: number; gameId: string; homeProgramId: ProgramId; awayProgramId: ProgramId; homeScore: number; awayScore: number }
  | { type: "PLAYER_DEPARTED"; season: Season; playerId: PlayerId; reason: "GRADUATED" | "ELIGIBILITY_EXHAUSTED" }
  | { type: "PROSPECT_SIGNED"; season: Season; playerId: PlayerId; programId: ProgramId }
  | { type: "COMMAND_REJECTED"; programId: ProgramId; command: GameCommand; reason: string };

export interface SimulationResult { state: GameState; events: GameEvent[]; }
