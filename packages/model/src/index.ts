export type ProgramId = string;
export type PlayerId = string;
export type ProspectId = string;
export type Season = number;

export type CareerPath = "DYNASTY_BUILDER" | "PROGRAM_RISER" | "CHAMPIONSHIP_MANDATE";
export type RosterStatus = "SCHOLARSHIP" | "WALK_ON" | "PORTAL" | "DEPARTED" | "GRADUATED";
export type GamePhase = "ROSTER_REVIEW" | "REGULAR_SEASON" | "OFFSEASON";
/**
 * The offseason resolves in fixed order, in lockstep across the whole league —
 * the same model a week already uses. Every step is skippable with
 * `CONTINUE_OFFSEASON`, so a program that engages with none of it experiences
 * what the engine did before the phase existed.
 */
export type OffseasonStep = "PORTAL" | "SIGNING_DAY" | "COACHING" | "TRAINING_CAMP";
/**
 * What a program spends camp on. `BALANCED` is the default and the
 * do-nothing outcome; the other two trade against each other rather than
 * being upgrades — a head start on the playbook is bought with the health
 * margin conditioning would have banked.
 */
export type TrainingCampFocus = "CONDITIONING" | "BALANCED" | "INSTALL";
export type Position = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "K" | "P";
export type DevelopmentFocus = "BALANCED" | "TECHNIQUE" | "STRENGTH" | "CONDITIONING";
export type DevelopmentSpotlightTarget =
  | { type: "PLAYER"; playerId: PlayerId }
  | { type: "POSITION"; position: Position };
export type StaffRole = "HEAD_COACH" | "OFFENSIVE_COORDINATOR" | "DEFENSIVE_COORDINATOR" | "STRENGTH_COACH";
/**
 * What a coach spends his week on. Attention is split rather than assigned
 * wholesale: a coordinator prepares the team, helps scout opponents, and helps
 * recruit, and how he divides those is the decision.
 */
export type StaffFocus = "PREPARE" | "SCOUT" | "RECRUIT" | "DEVELOP" | "RECOVER";

/**
 * The five things a staff can chase in a week.
 *
 * Hours are what the engine spends, but hours are not a decision a player can
 * hold: four sliders over a 24-hour pool is roughly two thousand valid weeks,
 * and nobody explores two thousand of anything fourteen times a season. So the
 * player names a small number of *priorities* instead and the hours follow.
 *
 * Every one of these runs at a baseline whether it is picked or not — there is
 * no maintenance chore and no punishment for not reading a screen. Picking one
 * is what buys the surge.
 */
export type WeekFocus = "INSTALL_OFFENSE" | "INSTALL_DEFENSE" | "SCOUT" | "DEVELOP" | "RECRUIT";

/**
 * Somebody outside the building offering to help. Four of them turn up every
 * third week; you get to say yes to exactly one, and it does not always come
 * off.
 */
export type BoosterKind =
  /** A wealthy donor writing a cheque. */
  | "DONOR"
  /** A former player who comes back and works with one offensive room. */
  | "POSITION_LEGEND"
  /** A local business papering the town for the next home game. */
  | "LOCAL_BUSINESS"
  /** A former defensive great who teaches this week's team to take the ball away. */
  | "TURNOVER_LEGEND";

/**
 * What a coach is known for. Rating says how good he is; the trait says what he
 * is good *at*, which is what makes two coaches of the same calibre a genuine
 * choice rather than a sort.
 */
export type StaffTrait =
  | "TACTICIAN"
  | "FILM_RAT"
  | "CLOSER"
  | "TEACHER"
  | "PLAYERS_COACH"
  | "GRINDER";
export type FacilityType = "TRAINING" | "STADIUM" | "ACADEMICS" | "RECRUITING" | "SCOUTING";
/**
 * A program's lasting character, authored rather than generated so the league
 * has the same landmarks across every save. Character changes *strategy*, not
 * difficulty — a front-running base and a diehard base are two different games
 * at the same tier.
 */
export type ProgramCharacter = "BLUEBLOOD" | "DIEHARD" | "FRONTRUNNER" | "TALENT_MAGNET" | "DEVELOPER";
export type DivisionId = "ATLANTIC" | "GREAT_LAKES" | "HEARTLAND" | "GULF" | "MOUNTAIN" | "PACIFIC";
/** An attribute key. Which keys a player has depends on his position. */
export type PlayerRating = string;
export type PlayerMediaAction = "FOOTBALL_FOCUS" | "MEDIA_DAY" | "SOCIAL_MEDIA" | "COMMUNITY_APPEARANCE";
export type InjurySeverity = "MINOR" | "MODERATE" | "MAJOR";
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
export type OffensiveIdentity = "POWER_RUN" | "TRIPLE_OPTION" | "PRO_BALANCED" | "SPREAD_TEMPO" | "AIR_RAID";
export type DefensiveIdentity = "BEND_DONT_BREAK" | "FOUR_THREE_BASE" | "ZONE_BLITZ" | "NICKEL_PRESSURE";
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

/**
 * Five attributes, named for the position that has them — a quarterback carries
 * Accuracy and Arm talent, a lineman carries Pass blocking and Run blocking.
 * Storage is still five numbers; only the meaning is positional, which is what
 * keeps this free against a save file that is already an iOS blocker.
 *
 * Keyed rather than fixed-field because the keys differ by position. The set for
 * any position is `POSITION_ATTRIBUTES` in the simulation package, and `overall`
 * is derived from these rather than stored.
 */
export type PlayerRatings = Record<string, number>;

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
 * A finished season's production for one player, folded down from his game logs.
 *
 * Per-game rows are the growth term in the save file: about 2,300 a week at full
 * league size, which is 730 MB of raw JSON over a twenty-year dynasty. A season
 * line is one row per player per season and carries everything the record book,
 * the award race, and a career page actually read.
 */
export interface PlayerSeasonStatLine {
  playerId: PlayerId;
  season: Season;
  programId: ProgramId;
  position: Position;
  games: number;
  starts: number;
  wins: number;
  /** Sum of the 0–99 per-game ratings; divide by games for the average. */
  gameRatingTotal: number;
  blockingGradeTotal: number;
  snaps: number;
  passingAttempts: number;
  passingCompletions: number;
  passingYards: number;
  passingTouchdowns: number;
  interceptionsThrown: number;
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
  /**
   * The scouting department's own weekly output. Kept separate from preparation
   * because the two are produced by different people: a coordinator who spends
   * his week scouting is not preparing the team, and that is the trade.
   */
  scoutingPoints: number;
  weeklyScoutingPoints: number;
  /** Reps spent installing each side of the plan. Cleared at every new week. */
  offensiveReps: number;
  defensiveReps: number;
  /**
   * Where this week's department output was automatically filed, and how much.
   * The player picks the opponent, not the points — allocating a number by hand
   * every week is bookkeeping, not a decision. Recorded so that changing the
   * target mid-week moves the work rather than duplicating it.
   */
  autoScoutedOpponentId?: ProgramId | null;
  autoScoutedPoints?: number;
}

/**
 * How well a side of the game plan will actually be run. A plan is built during
 * the week, not merely chosen: who installs it and how many reps it gets decide
 * how much of the chosen emphasis survives to Saturday.
 */
export interface PlanExecution {
  side: "OFFENSE" | "DEFENSE";
  installerStaffId: string | null;
  installerName: string;
  installerRating: number;
  reps: number;
  /** Execution lands somewhere in this band; better coaching narrows it. */
  low: number;
  high: number;
  expected: number;
  summary: string;
  limits: string[];
}

/** How a coach divides his week. The parts sum to his capacity. */
export type StaffAllocation = Record<StaffFocus, number>;

/**
 * A file being built on a future opponent. Scouting accumulates against a
 * specific team rather than being bought fresh each week, so a program can start
 * work on a ranked opponent several weeks out.
 */
export interface OpponentDossier {
  opponentProgramId: ProgramId;
  week: number;
  points: number;
  tiers: ScoutingTier[];
  confidence: number;
  /** What beating them is worth, which is what justifies spending early. */
  value: number;
  valueNote: string;
}

/**
 * One of the five cards on the week screen. Everything the player needs to
 * choose is on it: who runs it, what happens if you leave it alone, what happens
 * if you pick it, and why it might matter this particular week.
 */
export interface WeekPriority {
  focus: WeekFocus;
  label: string;
  /** What this is, in one line, for somebody who has never played one of these. */
  blurb: string;
  /** The coach whose week this actually is. An empty chair is a real answer. */
  ownerStaffId: string | null;
  ownerName: string;
  ownerRole: StaffRole | null;
  /** Why this coach makes this card better or worse than the next program's. */
  ownerNote: string;
  /** What you get if you never pick it. Never nothing. */
  baseline: string;
  /** What you get if you do. */
  focused: string;
  chosen: boolean;
  /** 0–100, how much picking this is worth *this week*. */
  stakes: number;
  /** The reason, in plain language, that the stakes are where they are. */
  stakesNote: string;
  /** Set when the card cannot deliver — no opponent to scout, nobody to develop. */
  blocked: string | null;
}

/**
 * How many priorities a staff can chase in a week, and what it would take to
 * chase one more. This is the progression bar: a thin staff can only chase one
 * thing, which is what being a bad program feels like, and hiring is what buys
 * the second and third.
 */
export interface FocusCapacity {
  capacity: number;
  /** Weighted staff rating behind the capacity, 0–99. */
  power: number;
  /** Power needed for one more focus, or null at the ceiling. */
  nextAt: number | null;
  note: string;
}

/**
 * One of the four people on the table this week.
 *
 * The odds are stated on the card and are a property of the *program* rather
 * than a hidden roll — a donor is likelier to come through where donor culture
 * is strong, a legend where the program has standing. That is what keeps this a
 * decision rather than a slot machine.
 */
export interface BoosterOption {
  id: string;
  kind: BoosterKind;
  /** Who is offering. A person, or a business. */
  name: string;
  /** The pitch, in one line. */
  headline: string;
  /** Exactly what lands if it comes off. */
  reward: string;
  /** Why the odds are what they are. */
  note: string;
  /** 0–100, stated before the player chooses. */
  chance: number;
  /** The offensive room a POSITION_LEGEND would work with. */
  position?: Position;
  /** Money a DONOR would give, in dollars. */
  amount?: number;
}

/** The four on the table, and what happened once one was taken. */
export interface BoosterOffer {
  season: Season;
  week: number;
  options: BoosterOption[];
  /** Set the moment the player chooses; the offer stays for the record. */
  chosenOptionId: string | null;
  /** Null until chosen. "Success!" or "Try again next time!" */
  succeeded: boolean | null;
}

/** A program's standing booster state: the open offer and anything still running. */
export interface BoosterProgramState {
  offer: BoosterOffer | null;
  /** Advertising a local business has already paid for, spent at the next home game. */
  advertisingCredit: number;
  /** The week a takeaway boost applies to, or null. One game only. */
  takeawayBoostWeek: number | null;
}

/** A posted modifier on a staff card, in the spirit of a salaried specialist. */
export interface StaffModifier {
  label: string;
  value: string;
}

/**
 * One job-specific number on a coach, on the same 0–99 scale as his overall
 * rating. It is the engine's own multiplier rendered, not a display-only score:
 * an 88 at recruiting really does put 88 rating-points a week on the trail.
 */
export interface StaffSkill {
  focus: StaffFocus;
  label: string;
  /** 1–99. Rating scaled by what his role and his trait are worth at this job. */
  value: number;
  /** True when this is one of the two jobs he is best at. */
  strength: boolean;
}

/** A hireable replacement, with what they cost and what they change. */
export interface StaffCandidate {
  id: string;
  name: string;
  role: StaffRole;
  rating: number;
  salary: number;
  signingCost: number;
  modifiers: StaffModifier[];
  trait: StaffTrait;
  traitLabel: string;
  traitBlurb: string;
  /** Hours a week he works, before the player splits them up. */
  hours: number;
  skills: StaffSkill[];
  schemePreference: SchemeIdentity;
  /** 0.55–1. How well his scheme matches what this program runs. */
  schemeFit: number;
  schemeFitNote: string;
  /**
   * Set when the program's pull is not enough to attract him. He is shown
   * anyway, greyed out, so the ceiling reads as a goal rather than an absence.
   */
  unavailableReason: string | null;
}

/** Why a weekly decision is worth revisiting. Absent when nothing has changed. */
export interface DecisionAlert {
  id: "TICKET_PRICE" | "ADVERTISING" | "DEVELOPMENT" | "SCOUTING";
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
  /**
   * Where he's from, carried over from the prospect he was (or, for an
   * opening roster with no recruiting history, his own program's division).
   * What `pipelineStrength` reads to credit a program for developing him.
   */
  homeDivisionId: DivisionId;
  position: Position;
  overall: number;
  potential: number;
  workEthic: number;
  fatigue: number;
  ratings: PlayerRatings;
  /** The player's current diagnosed injury. Null means fully available. */
  injury: PlayerInjury | null;
  /**
   * Compatibility mirror for early prototype saves. New code reads `injury`;
   * this stays synchronized until save migration exists.
   */
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

export interface PlayerInjury {
  name: string;
  severity: InjurySeverity;
  /** Games the player is still expected to miss. */
  weeksRemaining: number;
  originalWeeks: number;
  /**
   * Unavailable for every remaining game this season. The player still returns
   * healthy at season rollover; this is not a real-world rehab calendar.
   */
  seasonEnding: boolean;
  occurredSeason: Season;
  occurredWeek: number;
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
  /**
   * What the recruiting world thinks he is worth — free to every program, and
   * usually close to the truth. Occasionally badly wrong in either direction,
   * which is the only reason digging pays: a diamond in the rough is a prospect
   * whose `potential` far exceeds his `hype`.
   */
  hype: number;
  /** Derived from `hype`, not from the truth. */
  reputation: "UNRANKED" | "REGIONAL" | "NATIONAL" | "ELITE";
  priorities: RecruitPriority[];
  /** A prospect's private fit with each school, generated from the save seed. */
  interestByProgram: Record<ProgramId, number>;
  /**
   * `COMMITTED` is verbal and contestable — a rival can still flip him — until
   * the signing week, when he becomes `SIGNED` and can never be contested
   * again. `ENROLLED` is a season later, once he actually joins the roster.
   */
  status: "AVAILABLE" | "COMMITTED" | "SIGNED" | "ENROLLED" | "WITHDRAWN";
  signedProgramId: ProgramId | null;
}

export interface ProspectScoutingState {
  evaluations: RecruitingEvaluation[];
  /** Persistent staff investment that remains with the recruit until he commits. */
  pursuitPoints: number;
  /** Home visits this program has spent on him this season. Diminishing per repeat. */
  visitsUsed?: number;
}

/**
 * What every contested recruit has in common, whether he is a high-school
 * prospect or a player in the transfer portal. `prospectProgramFit` and the
 * market's scoring read this rather than `Prospect`, so one formula serves
 * both pools and the two can never drift apart.
 */
export interface Recruitable {
  id: string;
  position: Position;
  overall: number;
  homeDivisionId: DivisionId;
  priorities: RecruitPriority[];
  interestByProgram: Record<ProgramId, number>;
}

/**
 * A player who entered the portal and is open to bids — including from the
 * program he just left, which is what makes retention the same market played
 * in the other direction rather than a second system.
 */
export interface PortalListingState {
  /** The program he is leaving. Gets an incumbency term when it bids to keep him. */
  previousProgramId: ProgramId;
  /** Drawn the same way a prospect's are; what he is looking for in a new home. */
  priorities: RecruitPriority[];
  interestByProgram: Record<ProgramId, number>;
  /** Weekly dollars bid, by program. Cleared when the window resolves. */
  bidsByProgram: Record<ProgramId, { points: number; weeklyNil: number }>;
}

export interface RecruitingProgramState {
  points: number;
  weeklyPoints: number;
  discoveredProspectIds: ProspectId[];
  scoutingByProspect: Record<ProspectId, ProspectScoutingState>;
  /**
   * Prospects this program has extended a scholarship offer to. Durable and
   * free to give — it is a signal, not a spend — and a prerequisite for
   * pursuing him further. Persists until he resolves off the board.
   */
  offeredProspectIds: ProspectId[];
  /** Home visits used this season, shared across every prospect on the board. */
  visitsUsedThisSeason: number;
}

/**
 * NIL money per program. Offers are weekly dollars promised to an AVAILABLE
 * prospect and reserve donor capacity while live; on commitment an offer
 * converts to a commitment that charges every week the player is rostered.
 * The ceiling — donor capacity — is derived from fans, support, prestige,
 * titles, and donorCulture, never stored: money cannot raise it.
 */
export interface NilProgramState {
  /** Weekly dollars offered, keyed by prospect. Cleared when the contest resolves. */
  offersByProspect: Record<ProspectId, number>;
  /**
   * Weekly dollars committed. Keyed by prospect id from commitment until
   * enrollment re-keys it to the player id; deleted when he leaves.
   */
  commitmentsByPlayer: Record<PlayerId, number>;
}

export interface DevelopmentSpotlight {
  focus: Exclude<DevelopmentFocus, "BALANCED">;
  target: DevelopmentSpotlightTarget;
}

/**
 * A sponsor is a season-long business choice. All three contracts convert the
 * same program reach into money, but put a different share of the value at
 * risk: none, a home-crowd trigger, or results on the field.
 */
export type SponsorshipStrategy = "GUARANTEED" | "HOME_CROWD" | "WINNING";

export interface SponsorshipOffer {
  id: string;
  sponsorName: string;
  strategy: SponsorshipStrategy;
  weeklyPayment: number;
  homeAttendanceTarget: number | null;
  homeAttendanceBonus: number;
  winBonus: number;
  rankedWinBonus: number;
}

export interface SponsorshipProgramState {
  season: Season;
  offers: SponsorshipOffer[];
  activeContractId: string | null;
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
  /**
   * What kind of program this is, beyond how good it is. Two programs in the
   * same tier should play differently, not merely at different difficulty —
   * that is what makes choosing a job, and restarting, a real decision.
   */
  character: ProgramCharacter;
  /**
   * How hard the fan base swings with results and with price. Below 1 is a
   * diehard base that turns up through bad years; above 1 is a front-running
   * base that collapses when losing and floods back when winning.
   */
  fanElasticity: number;
  /** Flat standing in every contested commitment, before anything is spent. */
  recruitAppeal: number;
  /** Multiplier on what supporters will fund beyond the gate. */
  donorCulture: number;
  /** Standing in this program's own division before any relationship is built. */
  homeRegionBias: number;
  /**
   * Earned standing in a division, division by division — rises slowly when a
   * signed prospect from that division becomes a real contributor, decays
   * slowly otherwise. `homeRegionBias` is the flat discount every program
   * gets in its own territory; this is what a program has actually built
   * there over time.
   */
  pipelineStrength: Partial<Record<DivisionId, number>>;
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
  /** How this coach divides his week across the things a staff does. */
  allocation: StaffAllocation;
  /** What he is known for. Scales what his hours are worth, job by job. */
  trait: StaffTrait;
  /**
   * The scheme this coach actually knows. Installing something else costs
   * execution — which is what makes hiring a coach who fits the plan a decision
   * rather than a search for the highest rating.
   */
  schemePreference: SchemeIdentity;
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
  /** Which offseason step is open. Null in every other phase. */
  offseasonStep?: OffseasonStep | null;
  programs: Record<ProgramId, Program>;
  players: Record<PlayerId, Player>;
  prospects: Record<ProspectId, Prospect>;
  recruiting: Record<ProgramId, RecruitingProgramState>;
  /** One sponsor contract per program and season. */
  sponsorships: Record<ProgramId, SponsorshipProgramState>;
  /** One optional development investment per program and week. Position groups trade intensity for breadth. */
  developmentSpotlights: Record<ProgramId, DevelopmentSpotlight | null>;
  /** Standing weekly preparation per program; persists until changed. */
  gamePlans: Record<ProgramId, GamePlan>;
  preparation: Record<ProgramId, PreparationProgramState>;
  /**
   * This week's priorities per program. Standing: they carry over, so a player
   * who has nothing to change advances the week with one button. The engine
   * derives every coach's hours from these.
   */
  weekFocus: Record<ProgramId, WeekFocus[]>;
  /**
   * The opponent the scouting department is working on. Held separately from the
   * focus so choosing *who* to study survives weeks when scouting is not a
   * priority — the department still produces at baseline and the points need
   * somewhere to go.
   */
  scoutingTarget: Record<ProgramId, ProgramId | null>;
  /** Accumulated scouting points per program, per opponent. Files persist. */
  dossiers: Record<ProgramId, Record<ProgramId, number>>;
  /** Booster offers and anything a successful one left running. */
  boosters: Record<ProgramId, BoosterProgramState>;
  /** NIL offers and commitments per program. The capacity ceiling is derived, never stored. */
  nil: Record<ProgramId, NilProgramState>;
  /** Players open to bids in the offseason portal window. Empty outside it. */
  portal?: Record<PlayerId, PortalListingState>;
  /**
   * What camp bought, and how much of the new season it still covers. Ticks
   * down weekly; a program that took the default carries nothing.
   */
  trainingCamp?: Record<ProgramId, { focus: TrainingCampFocus; weeksRemaining: number }>;
  staff: Record<string, StaffMember>;
  depthCharts: Record<ProgramId, DepthChart>;
  playerGameStats: PlayerGameStatLine[];
  /** Completed seasons, folded down. Per-game rows are kept for the live season only. */
  playerSeasonStats: PlayerSeasonStatLine[];
  schedule: ScheduledGame[];
  seasonHistory: SeasonHistory[];
  /** Bounded, save-safe attribution records. Domain events own resolved values. */
  decisionAudits?: DecisionAuditRecord[];
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
  /**
   * A real, durable scholarship offer — not a disguised pursuit-point spend.
   * Free to extend; a prerequisite for investing pursuit points or scheduling
   * a visit. `extend: false` rescinds it, which the prospect remembers.
   */
  | { type: "OFFER_PROSPECT"; programId: ProgramId; prospectId: ProspectId; extend: boolean }
  /**
   * A home visit — the highest-leverage single recruiting action. Requires an
   * active offer, costs Recruiting Points, and pays more where the program
   * actually fits what he's looking for. Capped per season across the whole
   * board and diminishing per repeat visit to the same recruit.
   */
  | { type: "SCHEDULE_VISIT"; programId: ProgramId; prospectId: ProspectId }
  | { type: "SEARCH_PROSPECTS"; programId: ProgramId; searchType: RecruitingSearchType; position?: Position }
  | { type: "EVALUATE_PROSPECT"; programId: ProgramId; prospectId: ProspectId; evaluation: RecruitingEvaluation }
  | { type: "INVEST_RECRUITING_POINTS"; programId: ProgramId; prospectId: ProspectId; points: number }
  | { type: "RED_SHIRT"; programId: ProgramId; playerId: PlayerId }
  | { type: "SET_REDSHIRT"; programId: ProgramId; playerId: PlayerId; enabled: boolean }
  | { type: "SET_DEPTH_CHART"; programId: ProgramId; position: Position; playerIds: PlayerId[] }
  | { type: "SET_DEVELOPMENT_SPOTLIGHT"; programId: ProgramId; focus: Exclude<DevelopmentFocus, "BALANCED">; target: DevelopmentSpotlightTarget }
  | { type: "UPGRADE_FACILITY"; programId: ProgramId; facility: FacilityType }
  | { type: "SET_PLAYER_MEDIA_ACTION"; programId: ProgramId; playerId: PlayerId; action: PlayerMediaAction }
  | { type: "SET_GAME_PLAN"; programId: ProgramId; plan: Partial<GamePlan> }
  | { type: "SET_TICKET_PRICE"; programId: ProgramId; price: number }
  | { type: "SET_ADVERTISING"; programId: ProgramId; spend: number }
  | { type: "ACCEPT_SPONSORSHIP"; programId: ProgramId; offerId: string }
  | { type: "SET_PRACTICE_REPS"; programId: ProgramId; side: "OFFENSE" | "DEFENSE"; reps: number }
  | { type: "SET_STAFF_ALLOCATION"; programId: ProgramId; staffId: string; allocation: Partial<StaffAllocation> }
  /**
   * Puts a number of hours on one job for the whole staff at once. This is the
   * control the player actually uses: one pool, one number per job, so the four
   * jobs visibly compete instead of each looking free on its own screen.
   */
  | { type: "SET_WEEK_HOURS"; programId: ProgramId; focus: StaffFocus; hours: number }
  /**
   * Names this week's priorities. The control the player actually uses: pick two
   * of five, and the staff's hours, practice reps, and scouting all follow from
   * it. Replaces reaching into hours, reps, and points on three separate screens.
   */
  | { type: "SET_WEEK_FOCUS"; programId: ProgramId; focuses: WeekFocus[] }
  /** Which opponent the scouting department is working on. */
  | { type: "SET_SCOUTING_TARGET"; programId: ProgramId; opponentProgramId: ProgramId | null }
  /** Takes one of the four people on the table this week. Resolves immediately. */
  | { type: "CHOOSE_BOOSTER"; programId: ProgramId; optionId: string }
  /**
   * A weekly NIL offer to an AVAILABLE prospect; 0 withdraws it. Requires at
   * least one evaluation and a projected opening, reserves donor capacity while
   * live, and resolves with everything else in the order-independent market —
   * the amount is absolute, never "outbid by X", so command order cannot matter.
   */
  | { type: "SET_NIL_OFFER"; programId: ProgramId; prospectId: ProspectId; weeklyAmount: number }
  /** The program's scheme. A takeover and offseason decision, not a weekly one. */
  | { type: "SET_SCHEME"; programId: ProgramId; scheme: Partial<SchemeIdentity> }
  | { type: "ALLOCATE_SCOUTING"; programId: ProgramId; opponentProgramId: ProgramId; points: number }
  | { type: "REPLACE_STAFF"; programId: ProgramId; staffId: string; candidateId: string }
  | { type: "SCHEDULE_MARQUEE_HOME_GAME"; programId: ProgramId; opponentProgramId: ProgramId }
  /**
   * Take no action in the open offseason step. Every step is skippable, so a
   * program that sends only this all offseason gets the engine's own sane
   * defaults — there is no maintenance chore and no punishment for not
   * reading a screen.
   */
  | { type: "CONTINUE_OFFSEASON"; programId: ProgramId }
  /**
   * A bid on a player in the portal, valid only during the portal step. One
   * bid per program per player — re-bidding replaces rather than stacks, so
   * the amount is always absolute and command order cannot decide a winner.
   * A program bidding on a player it is losing is a retention offer; the
   * engine treats it as the same market, played in the other direction.
   * `points: 0, weeklyNil: 0` withdraws.
   */
  | { type: "BID_PORTAL_PLAYER"; programId: ProgramId; playerId: PlayerId; points: number; weeklyNil: number }
  /**
   * How the program spends camp, set once in the training-camp step and
   * applied to the season about to start. A trade rather than an upgrade:
   * conditioning buys health at the cost of a head start on the playbook.
   */
  | { type: "SET_TRAINING_CAMP_FOCUS"; programId: ProgramId; focus: TrainingCampFocus };

/**
 * The shared vocabulary every decision surface uses.
 *
 * `REQUIRED` and `OPTIONAL` describe an unresolved choice, `DELEGATED` names
 * who owns it, `PENDING` means it has been queued for the engine, and the two
 * terminal presentation states are `DONE` and `BLOCKED`. The simulation owns
 * the legal transition rules; features must not introduce local synonyms.
 */
export const DECISION_STATUSES = [
  "REQUIRED",
  "OPTIONAL",
  "DELEGATED",
  "PENDING",
  "DONE",
  "BLOCKED"
] as const;
export type DecisionStatus = typeof DECISION_STATUSES[number];

/** Manual users, delegated staff, and autonomous programs share GameCommand. */
export type DecisionActor =
  | {
      mode: "MANUAL";
      actorId: string;
      displayName: string;
    }
  | {
      mode: "DELEGATED";
      actorId: string;
      displayName: string;
      staffId: string;
      delegatedByActorId: string;
      policyId: string | null;
    }
  | {
      mode: "AI";
      actorId: string;
      displayName: string;
      policyId: string;
    };

export type DecisionKnowledgeSource =
  | "PUBLIC"
  | "PROGRAM_INTERNAL"
  | "SCOUTED"
  | "STAFF_ESTIMATE";

/**
 * The complete information boundary used to calculate a projection. Keeping
 * this explicit prevents a delegated or AI actor from quietly reading hidden
 * ratings that the manual player could not see.
 */
export type DecisionKnownValue = string | number | boolean | null;

export interface DecisionKnownFact {
  key: string;
  value: DecisionKnownValue;
  source: DecisionKnowledgeSource;
  entityId: string | null;
  observedSeason: Season;
  observedWeek: number;
}

export interface DecisionKnowledgeSnapshot {
  programId: ProgramId;
  season: Season;
  week: number;
  phase: GamePhase;
  /** The complete redacted input given to the projection function. */
  facts: readonly DecisionKnownFact[];
}

export type DecisionEffectDomain =
  | "FOOTBALL"
  | "FINANCE"
  | "ROSTER"
  | "DEVELOPMENT"
  | "STAFF"
  | "RECRUITING"
  | "RISK";

/** A real-unit projection; ranges express uncertainty rather than false precision. */
export interface DecisionProjectedEffect {
  key: string;
  domain: DecisionEffectDomain;
  unit: string;
  low: number;
  high: number;
  confidence: number;
  source: string;
}

export interface DecisionClock {
  season: Season;
  week: number;
  phase: GamePhase;
  /** Stable within one caller's batch; never wall-clock time. */
  sequence: number;
}

/** An unresolved card has ownership and urgency, but no fabricated command. */
export interface DecisionItem {
  id: string;
  status: Extract<DecisionStatus, "REQUIRED" | "OPTIONAL" | "DELEGATED">;
  programId: ProgramId;
  actor: DecisionActor;
}

/**
 * The exact command only becomes a record when it is submitted. This is an
 * attribution envelope around GameCommand, not a parallel actor-specific
 * command hierarchy.
 */
export interface DecisionRecord<TCommand extends GameCommand = GameCommand> {
  id: string;
  /** Unique deterministic attempt within the stable decision id. */
  submissionId: string;
  status: Extract<DecisionStatus, "PENDING">;
  command: TCommand;
  actor: DecisionActor;
  knowledge: DecisionKnowledgeSnapshot;
  submittedAt: DecisionClock;
}

/** Pure preview of one option for an unresolved item, using only redacted facts. */
export interface DecisionProjection<TCommand extends GameCommand = GameCommand> {
  item: DecisionItem;
  command: TCommand;
  knowledge: DecisionKnowledgeSnapshot;
  effects: readonly DecisionProjectedEffect[];
}

/** A reference to a domain event caused by a committed decision. */
export interface DecisionCause {
  /** Stable within the submission so flattened event lists remain traceable. */
  id: string;
  eventType: string;
  /** Index within the command's result event list. */
  ordinal: number;
}

export type StandingDecisionResult = "WON" | "LOST" | "WITHDRAWN" | "UNCLAIMED" | "SUPERSEDED";

export interface StandingDecisionOutcome {
  result: StandingDecisionResult;
  causes: readonly DecisionCause[];
}

/**
 * Durable attribution without duplicating resolved state. `commandKey` points
 * back to the exact canonical GameCommand while domain events remain the source
 * of truth for money, ratings, roster changes, and every other consequence.
 */
export interface DecisionAuditRecord {
  decisionId: string;
  submissionId: string;
  commandType: GameCommand["type"];
  commandKey: string;
  programId: ProgramId;
  actor: DecisionActor;
  knowledge: DecisionKnowledgeSnapshot;
  submittedAt: DecisionClock;
  status: Extract<DecisionStatus, "DONE" | "BLOCKED">;
  /** Immediate command-boundary result; standing market outcomes arrive later. */
  resolution: "IMMEDIATE" | "STANDING" | "REJECTED";
  outcomePending: boolean;
  /** Separate from accepted intent; populated when the standing market closes. */
  standingOutcome: StandingDecisionOutcome | null;
  causes: readonly DecisionCause[];
  rejectionReason: string | null;
}

export type GameEvent = (
  | {
      type: "DECISION_AUDITED";
      season: Season;
      week: number;
      programId: ProgramId;
      /** Reference into GameState.decisionAudits, the sole persisted audit record. */
      submissionId: string;
    }
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
  | {
      type: "PLAYER_INJURED";
      season: Season;
      week: number;
      playerId: PlayerId;
      injuryName: string;
      severity: InjurySeverity;
      weeks: number;
      /** Final percentage risk after player health, workload, fatigue, and staff. */
      risk: number;
      /** Percentage risk before the strength coach's reduction. */
      riskWithoutCoach: number;
      coachReductionPercent: number;
      seasonEnding: boolean;
      wasStarter: boolean;
      replacementPlayerId: PlayerId | null;
      emergencyQuarterback: boolean;
      affectedUnit: TeamUnit | null;
      unitRatingBefore: number | null;
      unitRatingAfter: number | null;
      unitRatingChangePercent: number | null;
    }
  | {
      type: "INJURY_RECOVERY_ACCELERATED";
      season: Season;
      week: number;
      playerId: PlayerId;
      injuryName: string;
      weeksRemaining: number;
      coachId: string;
    }
  | {
      type: "PLAYER_RECOVERED";
      season: Season;
      week: number;
      playerId: PlayerId;
      injuryName: string;
      severity: InjurySeverity;
      returnedToStartingLineup: boolean;
    }
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
  /**
   * He can never be contested again after this — the signing week lock, or an
   * immediate sign for a first commitment made after that week. Enrollment is
   * a season later and has its own event; there is no player yet here.
   */
  | { type: "PROSPECT_SIGNED"; season: Season; week: number; prospectId: ProspectId; programId: ProgramId }
  | {
      type: "PROSPECTS_DISCOVERED";
      season: Season;
      week: number;
      programId: ProgramId;
      searchType: RecruitingSearchType;
      position?: Position;
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
      type: "PROSPECT_OFFERED";
      season: Season;
      week: number;
      programId: ProgramId;
      prospectId: ProspectId;
      extended: boolean;
      /** False when the requested offer state was already in effect. */
      changed: boolean;
    }
  | {
      /** Accepted standing-market intent; recruitment resolves later. */
      type: "NIL_OFFER_SET";
      season: Season;
      week: number;
      programId: ProgramId;
      prospectId: ProspectId;
      weeklyAmount: number;
      previousWeeklyAmount: number;
    }
  | {
      /** Correlation receipt for one program's offer in a resolved recruiting contest. */
      type: "NIL_OFFER_RESOLVED";
      season: Season;
      week: number;
      programId: ProgramId;
      prospectId: ProspectId;
      weeklyAmount: number;
      winnerProgramId: ProgramId | null;
      result: "WON" | "LOST" | "WITHDRAWN";
      reason: "PROSPECT_CHOSE_PROGRAM" | "PROSPECT_CHOSE_OTHER_PROGRAM" | "BOARD_CLOSED";
    }
  | {
      /** Accepted standing-market intent; the portal winner resolves later. */
      type: "PORTAL_BID_SET";
      season: Season;
      week: number;
      programId: ProgramId;
      playerId: PlayerId;
      points: number;
      weeklyNil: number;
      withdrawn: boolean;
    }
  | {
      type: "RECRUITING_VISIT_SCHEDULED";
      season: Season;
      week: number;
      programId: ProgramId;
      prospectId: ProspectId;
      visitNumber: number;
      bonus: number;
      visitsRemainingThisSeason: number;
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
  /** A rival won a verbal commitment away from its incumbent before the signing week. */
  | {
      type: "PROSPECT_FLIPPED";
      season: Season;
      week: number;
      prospectId: ProspectId;
      fromProgramId: ProgramId;
      toProgramId: ProgramId;
      score: number;
    }
  | { type: "PROSPECT_ENROLLED"; season: Season; prospectId: ProspectId; playerId: PlayerId; programId: ProgramId; lateFill?: boolean }
  | { type: "ROSTER_POSITION_CONVERTED"; season: Season; playerId: PlayerId; programId: ProgramId; from: Position; to: Position }
  /**
   * A verbal commitment that never became a roster spot because the class
   * filled before he got there. He is not signed anywhere else — the
   * commitment is simply void, resolved rather than left dangling.
   */
  | { type: "PROSPECT_COMMITMENT_VOIDED"; season: Season; prospectId: ProspectId; programId: ProgramId; reason: "CLASS_FULL" }
  | {
      type: "NIL_DEAL_SIGNED";
      season: Season;
      week: number;
      prospectId: ProspectId;
      programId: ProgramId;
      weeklyAmount: number;
      askingPrice: number;
    }
  | {
      type: "NIL_COMMITMENT_ENDED";
      season: Season;
      playerId: PlayerId;
      programId: ProgramId;
      weeklyAmount: number;
      reason: "GRADUATED" | "ELIGIBILITY_EXHAUSTED" | "TRANSFER_PORTAL";
    }
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
  | { type: "STAFF_ALLOCATION_SET"; season: Season; week: number; programId: ProgramId; staffId: string; allocation: StaffAllocation }
  | { type: "SCHEME_SET"; season: Season; week: number; programId: ProgramId; scheme: SchemeIdentity }
  | { type: "SCOUTING_ALLOCATED"; season: Season; week: number; programId: ProgramId; opponentProgramId: ProgramId; points: number; totalPoints: number; tiers: ScoutingTier[] }
  | { type: "PRACTICE_REPS_SET"; season: Season; week: number; programId: ProgramId; side: "OFFENSE" | "DEFENSE"; reps: number; pointsSpent: number; expectedExecution: number }
  | { type: "STAFF_REPLACED"; season: Season; week: number; programId: ProgramId; departingStaffId: string; arrivingStaffId: string; name: string; role: StaffRole; rating: number; salary: number; signingCost: number; buyoutCost: number }
  | { type: "TICKET_PRICE_SET"; season: Season; week: number; programId: ProgramId; price: number; fairPrice: number }
  | { type: "ADVERTISING_SET"; season: Season; week: number; programId: ProgramId; spend: number }
  | {
      type: "SPONSORSHIP_ACCEPTED";
      season: Season;
      week: number;
      programId: ProgramId;
      offerId: string;
      sponsorName: string;
      strategy: SponsorshipStrategy;
      weeklyPayment: number;
    }
  | {
      type: "SPONSORSHIP_PAYMENT";
      season: Season;
      week: number;
      programId: ProgramId;
      sponsorName: string;
      basePayment: number;
      homeAttendanceBonus: number;
      winBonus: number;
      rankedWinBonus: number;
      total: number;
    }
  | { type: "PREP_POINTS_ADDED"; season: Season; week: number; programId: ProgramId; pointsAdded: number }
  | { type: "SEASON_STATS_ARCHIVED"; season: Season; week: number; players: number; rowsFolded: number }
  /** The season is over and the offseason has opened on its first step. */
  | { type: "OFFSEASON_BEGAN"; season: Season; step: OffseasonStep }
  /** Somebody entered the portal and can be bid on, by anybody. */
  | { type: "PORTAL_PLAYER_LISTED"; season: Season; playerId: PlayerId; previousProgramId: ProgramId; askingPrice: number }
  /**
   * The window closed and he chose. `retained` marks the case where the
   * program he was leaving won him back.
   */
  | {
      type: "PORTAL_PLAYER_SIGNED";
      season: Season;
      playerId: PlayerId;
      programId: ProgramId;
      previousProgramId: ProgramId;
      retained: boolean;
      score: number;
      runnerUpProgramId: ProgramId | null;
      runnerUpScore: number | null;
      weeklyNil: number;
    }
  /** Nobody bid enough. His career at this level is over rather than left hanging. */
  | { type: "PORTAL_PLAYER_UNCLAIMED"; season: Season; playerId: PlayerId; previousProgramId: ProgramId }
  | { type: "TRAINING_CAMP_SET"; season: Season; programId: ProgramId; focus: TrainingCampFocus; weeks: number }
  /** One offseason step closed. `nextStep` is null when the offseason itself ends. */
  | { type: "OFFSEASON_STEP_COMPLETED"; season: Season; step: OffseasonStep; nextStep: OffseasonStep | null }
  | { type: "BOOSTER_OFFERED"; season: Season; week: number; programId: ProgramId; options: BoosterOption[] }
  | {
      type: "BOOSTER_RESOLVED";
      season: Season;
      week: number;
      programId: ProgramId;
      optionId: string;
      kind: BoosterKind;
      name: string;
      succeeded: boolean;
      /** What actually landed, for the UI to read back. Empty on a miss. */
      outcome: string;
      /** Players improved by a POSITION_LEGEND, when one came off. */
      playerIds: PlayerId[];
    }
  | { type: "WEEK_FOCUS_SET"; season: Season; week: number; programId: ProgramId; focuses: WeekFocus[]; capacity: number }
  | { type: "SCOUTING_TARGET_SET"; season: Season; week: number; programId: ProgramId; opponentProgramId: ProgramId | null }
  | {
      /**
       * What each priority actually produced, captured after the week resolved.
       * Saturday has to name Monday or the choice reads as optional — a player
       * repeats what they were thanked for. Structured, as always: the UI writes
       * the sentence.
       */
      type: "WEEK_FOCUS_PAYOFF";
      season: Season;
      week: number;
      programId: ProgramId;
      focuses: WeekFocus[];
      /** The committed weekly-priority decision that produced this result. */
      weeklyPrioritySubmissionId: string | null;
      /** The committed film-room assignment used for the readiness result. */
      scoutingTargetSubmissionId: string | null;
      offensiveExecution: number;
      defensiveExecution: number;
      scoutingReadiness: number;
      scoutedOpponentId: ProgramId | null;
      developedPlayerId: PlayerId | null;
      developedOverallGain: number;
      recruitingPointsAdded: number;
    }
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
      offensiveExecution: number;
      defensiveExecution: number;
      notes: string[];
    }
  | { type: "WEEKLY_FINANCES"; season: Season; week: number; programId: ProgramId; revenue: number; sponsorshipRevenue: number; nilSpend: number; expenses: number; net: number }
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
      sponsorshipRevenue: number;
      localPressChange: number;
      nationalPressChange: number;
      guaranteePaid: number;
      weeklyNet: number;
    }
  | { type: "COMMAND_REJECTED"; programId: ProgramId; command: GameCommand; reason: string }
) & {
  /** Stable audit reference; the event remains the sole domain fact. */
  decisionCauseId?: string;
  /** A shared market result may close multiple standing submissions. */
  decisionOutcomeCauseIds?: string[];
};

export interface SimulationResult { state: GameState; events: GameEvent[]; }
