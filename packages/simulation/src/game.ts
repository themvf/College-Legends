import type {
  BackfieldUsage,
  DefensivePosture,
  DefensivePriority,
  GamePlan,
  MatchupOutcome,
  OffensiveTempo,
  PassRushPressure,
  Player,
  PlayerGameStatLine,
  PlayType,
  Position,
  RunPassBalance,
  TargetDistribution,
  TeamUnit,
  TeamUnitRatings
} from "@college-legends/model";
import { AddressableRng } from "./rng.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

export const DEFAULT_GAME_PLAN: Readonly<GamePlan> = {
  runPassBalance: "BALANCED",
  backfieldUsage: "FEATURE_BACK",
  targetDistribution: "SPREAD_IT",
  tempo: "NORMAL",
  defensivePriority: "BALANCED",
  defensivePosture: "CONTAIN",
  pressure: "SITUATIONAL"
};

/**
 * Every emphasis is a trade, never a strict upgrade. Committing to one axis
 * concedes the other, so a call is only good against what the opponent chose.
 */
const RUN_PASS_BALANCE: Readonly<Record<RunPassBalance, { passRate: number; rushOffense: number; passOffense: number }>> = {
  RUN_HEAVY: { passRate: 0.38, rushOffense: 4.5, passOffense: -1.5 },
  BALANCED: { passRate: 0.5, rushOffense: 0, passOffense: 0 },
  PASS_HEAVY: { passRate: 0.62, rushOffense: -2.5, passOffense: 1 }
};

const DEFENSIVE_PRIORITY: Readonly<Record<DefensivePriority, { rushDefense: number; passDefense: number }>> = {
  STOP_THE_RUN: { rushDefense: 6.5, passDefense: -2.5 },
  BALANCED: { rushDefense: 0, passDefense: 0 },
  STOP_THE_PASS: { rushDefense: -4.5, passDefense: 3.5 }
};

/** Hunting takeaways wins the ball more often and surrenders more when it fails. */
const DEFENSIVE_POSTURE: Readonly<Record<DefensivePosture, {
  interception: number; fumble: number; rushDefense: number; passDefense: number; explosiveAllowed: number;
}>> = {
  TAKEAWAY_HUNT: { interception: 1.75, fumble: 1.55, rushDefense: -2, passDefense: -2.5, explosiveAllowed: 1.2 },
  CONTAIN: { interception: 1, fumble: 1, rushDefense: 0, passDefense: 0, explosiveAllowed: 1 },
  BEND_DONT_BREAK: { interception: 0.65, fumble: 0.8, rushDefense: 0.5, passDefense: 1, explosiveAllowed: 0.5 }
};

/** Pressure trades coverage for sacks. */
const PASS_RUSH_PRESSURE: Readonly<Record<PassRushPressure, { sack: number; passDefense: number; explosiveAllowed: number }>> = {
  HEAVY_BLITZ: { sack: 1.8, passDefense: -2.5, explosiveAllowed: 1.4 },
  SITUATIONAL: { sack: 1, passDefense: 0, explosiveAllowed: 1 },
  COVERAGE_FIRST: { sack: 0.55, passDefense: 2, explosiveAllowed: 0.8 }
};

/** A featured back carries the offense and the fatigue; a committee spreads both. */
const BACKFIELD_USAGE: Readonly<Record<BackfieldUsage, { leadBack: number; secondBack: number; quarterback: number; leadBackFatigue: number }>> = {
  FEATURE_BACK: { leadBack: 0.72, secondBack: 0.18, quarterback: 0.1, leadBackFatigue: 2.5 },
  COMMITTEE: { leadBack: 0.46, secondBack: 0.39, quarterback: 0.15, leadBackFatigue: 0.8 }
};

const TARGET_DISTRIBUTION: Readonly<Record<TargetDistribution, { topReceiverWeight: number; takeawayRisk: number }>> = {
  SPREAD_IT: { topReceiverWeight: 1, takeawayRisk: 0 },
  FEED_THE_STAR: { topReceiverWeight: 2.2, takeawayRisk: 0.02 }
};

const TEMPO: Readonly<Record<OffensiveTempo, { drives: number; fatigue: number }>> = {
  HURRY_UP: { drives: 13, fatigue: 1.5 },
  NORMAL: { drives: 12, fatigue: 0 },
  CONTROL_CLOCK: { drives: 11, fatigue: -0.8 }
};

const STARTER_COUNTS: Readonly<Record<Position, number>> = { QB: 1, RB: 2, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, DB: 4, K: 1, P: 1 };

const YARDS_LOST_PER_SACK = 6.5;
const FIELD_GOAL_MINIMUM_POSITION = 65;

export interface TeamSide {
  programId: string;
  lineup: readonly Player[];
  plan: GamePlan;
  /** Contribution from staff assigned to game preparation. */
  prepBonus: number;
}

export interface PlayResult {
  type: PlayType;
  yards: number;
  touchdown: boolean;
  turnover: boolean;
  sack: boolean;
  ballCarrierId: string | null;
  receiverId: string | null;
  completed: boolean;
  tacklerId: string | null;
  interceptorId: string | null;
}

export interface Scoreline {
  points: number;
  touchdowns: number;
  fieldGoals: number;
}

export interface SideResult {
  scoreline: Scoreline;
  statLines: PlayerGameStatLine[];
  units: TeamUnitRatings;
  runPlays: number;
  passPlays: number;
  giveaways: number;
  takeaways: number;
  sacksFor: number;
  sacksAgainst: number;
  matchups: MatchupOutcome[];
  leadBackShare: number;
  topTargetShare: number;
  fatigueAdded: Record<string, number>;
  driveLog: DriveLogEntry[];
}

export interface GameResult {
  home: SideResult;
  away: SideResult;
}

type DriveResult = "TOUCHDOWN" | "FIELD_GOAL" | "MISSED_FIELD_GOAL" | "PUNT" | "TURNOVER" | "DOWNS";

interface DriveOutcome {
  result: DriveResult;
  endPosition: number;
  puntDistance: number;
}

/** Per-drive telemetry. Returned for balance work; never persisted to state. */
export interface DriveLogEntry {
  startPosition: number;
  result: DriveResult;
  plays: number;
  yards: number;
}

function byPosition(lineup: readonly Player[], position: Position): Player[] {
  return lineup.filter((player) => player.position === position);
}

function average(players: readonly Player[], score: (player: Player) => number, fallback: number): number {
  if (players.length === 0) return fallback;
  return players.reduce((total, player) => total + score(player), 0) / players.length;
}

/**
 * Derives the four ratings a game is resolved against from the position groups
 * that actually produce them. Fatigue erodes every unit, which is what makes
 * tempo and a featured back cost something later in a season.
 */
export function unitRatingsFromLineup(lineup: readonly Player[], prepBonus = 0): TeamUnitRatings {
  const tired = (player: Player): number => player.overall - player.fatigue * 0.05;
  const quarterbacks = byPosition(lineup, "QB");
  const backs = byPosition(lineup, "RB");
  const receivers = byPosition(lineup, "WR");
  const tightEnds = byPosition(lineup, "TE");
  const linemen = byPosition(lineup, "OL");
  const defensiveLine = byPosition(lineup, "DL");
  const linebackers = byPosition(lineup, "LB");
  const backfield = byPosition(lineup, "DB");

  const runBlocking = average(linemen, (player) => tired(player) + (player.ratings.strength - player.overall) * 0.5, 55);
  const passBlocking = average(linemen, (player) => tired(player) + (player.ratings.technique - player.overall) * 0.5, 55);
  const passer = average(quarterbacks, (player) => tired(player) + (player.ratings.armStrength + player.ratings.technique - player.overall * 2) * 0.35, 52);
  const runners = average(backs, (player) => tired(player) + (player.ratings.strength - player.overall) * 0.3, 52);
  const catchers = average([...receivers, ...tightEnds], tired, 52);
  const frontSeven = average(defensiveLine, (player) => tired(player) + (player.ratings.strength - player.overall) * 0.4, 52);
  const passRush = average(defensiveLine, (player) => tired(player) + (player.ratings.technique - player.overall) * 0.4, 52);
  const secondLevel = average(linebackers, tired, 52);
  const coverage = average(backfield, (player) => tired(player) + (player.ratings.technique - player.overall) * 0.35, 52);

  return {
    rushOffense: runBlocking * 0.45 + runners * 0.37 + average(tightEnds, tired, 52) * 0.1 + average(quarterbacks, (player) => player.ratings.conditioning, 52) * 0.08 + prepBonus,
    passOffense: passer * 0.44 + catchers * 0.32 + passBlocking * 0.24 + prepBonus,
    rushDefense: frontSeven * 0.46 + secondLevel * 0.39 + coverage * 0.15 + prepBonus,
    passDefense: coverage * 0.48 + passRush * 0.28 + secondLevel * 0.24 + prepBonus
  };
}

/** Unit ratings after the standing game plan is applied. */
export function plannedUnitRatings(units: TeamUnitRatings, plan: GamePlan): TeamUnitRatings {
  const balance = RUN_PASS_BALANCE[plan.runPassBalance];
  const priority = DEFENSIVE_PRIORITY[plan.defensivePriority];
  const posture = DEFENSIVE_POSTURE[plan.defensivePosture];
  const pressure = PASS_RUSH_PRESSURE[plan.pressure];
  return {
    rushOffense: units.rushOffense + balance.rushOffense,
    passOffense: units.passOffense + balance.passOffense,
    rushDefense: units.rushDefense + priority.rushDefense + posture.rushDefense,
    passDefense: units.passDefense + priority.passDefense + posture.passDefense + pressure.passDefense
  };
}

/** A single number for rankings and comparisons, now that four exist. */
export function overallStrength(units: TeamUnitRatings): number {
  return (units.rushOffense + units.passOffense + units.rushDefense + units.passDefense) / 4;
}

export interface GamePlanOption {
  value: string;
  label: string;
  effect: string;
  tradeoff: string;
}

/**
 * What each call buys and what it costs, stated before the week is advanced.
 * Every option names a real downside — a plan the player cannot lose with is
 * not a decision.
 */
export const GAME_PLAN_OPTIONS: Readonly<Record<keyof GamePlan, readonly GamePlanOption[]>> = {
  runPassBalance: [
    { value: "RUN_HEAVY", label: "Run heavy", effect: "+4.5 rush offense and fewer interceptions", tradeoff: "−1.5 pass offense; punished by a run-stopping front" },
    { value: "BALANCED", label: "Balanced", effect: "No unit penalty and no counter to be caught by", tradeoff: "Never the best answer to any specific defense" },
    { value: "PASS_HEAVY", label: "Pass heavy", effect: "+1 pass offense and more scoring against run defenses", tradeoff: "−2.5 rush offense, more sacks and interceptions" }
  ],
  backfieldUsage: [
    { value: "FEATURE_BACK", label: "Feature back", effect: "Lead back takes ~70% of carries and his production carries the run game", tradeoff: "Heavy fatigue on one player, and a thin room if he goes down" },
    { value: "COMMITTEE", label: "Back by committee", effect: "Carries split evenly; the room stays fresh across a season", tradeoff: "Weaker average carry and no back builds the stardom that draws fans" }
  ],
  targetDistribution: [
    { value: "SPREAD_IT", label: "Spread the ball", effect: "Targets distributed across the receiver room", tradeoff: "No receiver develops a national profile" },
    { value: "FEED_THE_STAR", label: "Feed the star", effect: "Top receiver draws ~48% of targets and his yards rise", tradeoff: "+50% interception risk; a good secondary takes him away" }
  ],
  tempo: [
    { value: "HURRY_UP", label: "Hurry up", effect: "About 13 possessions each; favours the better offense", tradeoff: "Heavy fatigue, and the opponent gets the extra drives too" },
    { value: "NORMAL", label: "Normal tempo", effect: "About 12 possessions each", tradeoff: "None" },
    { value: "CONTROL_CLOCK", label: "Control the clock", effect: "About 11 possessions each and the roster recovers", tradeoff: "Fewer chances to come back when trailing" }
  ],
  defensivePriority: [
    { value: "STOP_THE_RUN", label: "Stop the run", effect: "+6.5 rush defense; smothers a run-heavy opponent", tradeoff: "−2.5 pass defense; a passing team will throw over it" },
    { value: "BALANCED", label: "Balanced front", effect: "No weakness to be attacked", tradeoff: "Never shuts down what the opponent does best" },
    { value: "STOP_THE_PASS", label: "Stop the pass", effect: "+3.5 pass defense; blankets a pass-heavy opponent", tradeoff: "−4.5 rush defense; a power running game will grind it" }
  ],
  defensivePosture: [
    { value: "TAKEAWAY_HUNT", label: "Hunt takeaways", effect: "+75% interceptions and +55% forced fumbles", tradeoff: "−2 rush and −2.5 pass defense; big plays get behind you" },
    { value: "CONTAIN", label: "Contain", effect: "No bias either way", tradeoff: "None" },
    { value: "BEND_DONT_BREAK", label: "Bend, don't break", effect: "Halves explosive plays allowed and adds +1 pass defense", tradeoff: "−35% takeaways; opponents sustain long drives" }
  ],
  pressure: [
    { value: "HEAVY_BLITZ", label: "Heavy blitz", effect: "+80% sacks", tradeoff: "−2.5 pass defense and +40% explosive plays allowed" },
    { value: "SITUATIONAL", label: "Situational pressure", effect: "No bias either way", tradeoff: "None" },
    { value: "COVERAGE_FIRST", label: "Coverage first", effect: "+2 pass defense and fewer big plays allowed", tradeoff: "−45% sacks; a quarterback gets time to throw" }
  ]
};

export interface UnitEdge {
  unit: TeamUnit;
  rating: number;
  opposingRating: number | null;
  edge: number | null;
  verdict: string;
}

const UNIT_LABELS: Readonly<Record<TeamUnit, string>> = {
  rushOffense: "Rush offense",
  passOffense: "Pass offense",
  rushDefense: "Rush defense",
  passDefense: "Pass defense"
};

export function unitLabel(unit: TeamUnit): string {
  return UNIT_LABELS[unit];
}

/** The four matchups this week's plan creates, before the game is played. */
export function projectUnitEdges(
  units: TeamUnitRatings,
  plan: GamePlan,
  opponentUnits: TeamUnitRatings | null,
  opponentPlan: GamePlan | null
): UnitEdge[] {
  const planned = plannedUnitRatings(units, plan);
  const opposing = opponentUnits && opponentPlan ? plannedUnitRatings(opponentUnits, opponentPlan) : null;
  const facing: Readonly<Record<TeamUnit, TeamUnit>> = {
    rushOffense: "rushDefense",
    passOffense: "passDefense",
    rushDefense: "rushOffense",
    passDefense: "passOffense"
  };
  return (Object.keys(planned) as TeamUnit[]).map((unit) => {
    const opposingRating = opposing ? opposing[facing[unit]] : null;
    const edge = opposingRating === null ? null : planned[unit] - opposingRating;
    return {
      unit,
      rating: Number(planned[unit].toFixed(1)),
      opposingRating: opposingRating === null ? null : Number(opposingRating.toFixed(1)),
      edge: edge === null ? null : Number(edge.toFixed(1)),
      verdict: edge === null ? "No opponent scheduled"
        : edge >= 6 ? "Decisive advantage"
          : edge >= 2 ? "Advantage"
            : edge > -2 ? "Even"
              : edge > -6 ? "Disadvantage"
                : "Overmatched"
    };
  });
}

export interface StatLineContext {
  season: number;
  week: number;
  gameId: string;
}

function emptyStatLine(
  context: StatLineContext,
  player: Player,
  programId: string,
  opponentProgramId: string,
  started: boolean
): PlayerGameStatLine {
  return {
    id: `stats:${context.gameId}:${player.id}`,
    season: context.season,
    week: context.week,
    gameId: context.gameId,
    playerId: player.id,
    programId,
    opponentProgramId,
    position: player.position,
    started,
    result: "LOSS",
    gameRating: 50,
    snaps: 0,
    passingAttempts: 0,
    passingCompletions: 0,
    passingYards: 0,
    passingTouchdowns: 0,
    interceptionsThrown: 0,
    sacksTaken: 0,
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

function pickWeighted<T>(items: readonly T[], weights: readonly number[], draw: number): T | undefined {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (items.length === 0 || total <= 0) return items[0];
  let cursor = draw * total;
  for (const [index, item] of items.entries()) {
    cursor -= Math.max(0, weights[index] ?? 0);
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function standardNormal(rng: AddressableRng, key: string): number {
  return rng.normal(key);
}

interface SideState {
  side: TeamSide;
  units: TeamUnitRatings;
  planned: TeamUnitRatings;
  lines: Map<string, PlayerGameStatLine>;
  quarterback: Player | undefined;
  backs: Player[];
  receivers: Player[];
  linemen: Player[];
  defenders: Player[];
  secondary: Player[];
  frontSeven: Player[];
  kicker: Player | undefined;
  punter: Player | undefined;
  /** Baselines already baked into the unit ratings, so an individual's
   *  deviation from his room is what a touch is actually worth. */
  backBaseline: number;
  receiverBaseline: number;
  scoreline: Scoreline;
  runPlays: number;
  passPlays: number;
  giveaways: number;
  sacksAgainst: number;
  unitPlays: Record<TeamUnit, { plays: number; yards: number; touchdowns: number }>;
  fatigueAdded: Record<string, number>;
  driveLog: DriveLogEntry[];
}

function buildSideState(side: TeamSide, opponentProgramId: string, context: StatLineContext): SideState {
  const lines = new Map<string, PlayerGameStatLine>();
  for (const player of side.lineup) {
    const depth = side.lineup.filter((other) => other.position === player.position).indexOf(player);
    lines.set(player.id, emptyStatLine(context, player, side.programId, opponentProgramId, depth === 0));
  }
  const units = unitRatingsFromLineup(side.lineup, side.prepBonus);
  return {
    side,
    units,
    planned: plannedUnitRatings(units, side.plan),
    lines,
    quarterback: byPosition(side.lineup, "QB")[0],
    backs: byPosition(side.lineup, "RB"),
    receivers: [...byPosition(side.lineup, "WR"), ...byPosition(side.lineup, "TE")],
    linemen: byPosition(side.lineup, "OL"),
    defenders: [...byPosition(side.lineup, "DL"), ...byPosition(side.lineup, "LB"), ...byPosition(side.lineup, "DB")],
    secondary: byPosition(side.lineup, "DB"),
    frontSeven: [...byPosition(side.lineup, "DL"), ...byPosition(side.lineup, "LB")],
    kicker: byPosition(side.lineup, "K")[0],
    punter: byPosition(side.lineup, "P")[0],
    backBaseline: average(byPosition(side.lineup, "RB"), (player) => player.overall, 60),
    receiverBaseline: average(
      [...byPosition(side.lineup, "WR"), ...byPosition(side.lineup, "TE")],
      (player) => player.overall,
      60
    ),
    scoreline: { points: 0, touchdowns: 0, fieldGoals: 0 },
    runPlays: 0,
    passPlays: 0,
    giveaways: 0,
    sacksAgainst: 0,
    driveLog: [],
    unitPlays: {
      rushOffense: { plays: 0, yards: 0, touchdowns: 0 },
      passOffense: { plays: 0, yards: 0, touchdowns: 0 },
      rushDefense: { plays: 0, yards: 0, touchdowns: 0 },
      passDefense: { plays: 0, yards: 0, touchdowns: 0 }
    },
    fatigueAdded: {}
  };
}

function creditTackle(defense: SideState, play: PlayResult, rng: AddressableRng, key: string): void {
  const pool = play.type === "RUN"
    ? [...defense.frontSeven, ...defense.secondary]
    : [...defense.secondary, ...defense.frontSeven];
  if (pool.length === 0) return;
  const weights = pool.map((player) => play.type === "RUN"
    ? (player.position === "LB" ? 3 : player.position === "DL" ? 2.4 : 1.2)
    : (player.position === "DB" ? 2.6 : player.position === "LB" ? 2 : 1));
  const tackler = pickWeighted(pool, weights, rng.at(`${key}:tackler`));
  if (!tackler) return;
  const line = defense.lines.get(tackler.id)!;
  line.tackles += 1;
  if (play.yards < 0 && !play.sack) line.tacklesForLoss += 1;
}

/** Resolves one play, updating both teams' box scores. */
function resolvePlay(
  offense: SideState,
  defense: SideState,
  scoreDifferential: number,
  rhythm: number,
  rng: AddressableRng,
  key: string
): PlayResult {
  const balance = RUN_PASS_BALANCE[offense.side.plan.runPassBalance];
  const posture = DEFENSIVE_POSTURE[defense.side.plan.defensivePosture];
  const pressure = PASS_RUSH_PRESSURE[defense.side.plan.pressure];
  const targets = TARGET_DISTRIBUTION[offense.side.plan.targetDistribution];

  // Trailing teams throw; leading teams run the clock.
  const scriptShift = clamp(-scoreDifferential * 0.008, -0.16, 0.2);
  const passRate = clamp(balance.passRate + scriptShift, 0.2, 0.82);
  const isPass = rng.at(`${key}:play-type`) < passRate;

  const play: PlayResult = {
    type: isPass ? "PASS" : "RUN",
    yards: 0,
    touchdown: false,
    turnover: false,
    sack: false,
    ballCarrierId: null,
    receiverId: null,
    completed: false,
    tacklerId: null,
    interceptorId: null
  };

  if (!isPass) {
    const edge = offense.planned.rushOffense - defense.planned.rushDefense;
    const usage = BACKFIELD_USAGE[offense.side.plan.backfieldUsage];
    const carriers = [offense.backs[0], offense.backs[1], offense.quarterback].filter((player): player is Player => Boolean(player));
    const weights = carriers.map((player) => player.position === "QB"
      ? usage.quarterback
      : player.id === offense.backs[0]?.id ? usage.leadBack : usage.secondBack);
    const carrier = pickWeighted(carriers, weights, rng.at(`${key}:carrier`));
    // The lead back is better than his backup, so who carries changes the play.
    // Without this a committee costs nothing and always beats featuring a star.
    const carrierEdge = carrier && carrier.position !== "QB" ? (carrier.overall - offense.backBaseline) * 0.35 : 0;
    let yards = 3.1 + rhythm + (edge + carrierEdge) * 0.06 + standardNormal(rng, `${key}:run-yards`) * 3.1;
    const explosiveChance = clamp(0.05 * posture.explosiveAllowed, 0.015, 0.16);
    if (rng.at(`${key}:run-explosive`) < explosiveChance) yards += 10 + rng.at(`${key}:run-burst`) * 26;
    play.yards = Math.round(clamp(yards, -8, 99));
    play.ballCarrierId = carrier?.id ?? null;
    const fumbleChance = clamp(0.014 * posture.fumble, 0.003, 0.06);
    play.turnover = rng.at(`${key}:fumble`) < fumbleChance;
    if (carrier) {
      const line = offense.lines.get(carrier.id)!;
      line.rushingAttempts += 1;
      line.rushingYards += play.yards;
      offense.fatigueAdded[carrier.id] = (offense.fatigueAdded[carrier.id] ?? 0)
        + (carrier.id === offense.backs[0]?.id ? usage.leadBackFatigue * 0.12 : 0.05);
    }
    return play;
  }

  const edge = offense.planned.passOffense - defense.planned.passDefense;
  const sackChance = clamp(0.062 * pressure.sack - edge * 0.0016, 0.012, 0.2);
  if (rng.at(`${key}:sack`) < sackChance) {
    play.sack = true;
    play.yards = -Math.round(YARDS_LOST_PER_SACK + standardNormal(rng, `${key}:sack-yards`) * 2);
    offense.sacksAgainst += 1;
    if (offense.quarterback) {
      const line = offense.lines.get(offense.quarterback.id)!;
      line.sacksTaken += 1;
      line.rushingAttempts += 1;
      line.rushingYards += play.yards;
    }
    const rusher = pickWeighted(
      defense.frontSeven,
      defense.frontSeven.map((player) => player.position === "DL" ? 3 : 1),
      rng.at(`${key}:rusher`)
    );
    if (rusher) {
      const line = defense.lines.get(rusher.id)!;
      line.sacks += 1;
      line.tackles += 1;
      line.tacklesForLoss += 1;
    }
    return play;
  }

  const receiverWeights = offense.receivers.map((receiver, index) => {
    const base = receiver.position === "TE" ? 2.4 : 4 - index * 0.5;
    return Math.max(0.4, base * (index === 0 ? targets.topReceiverWeight : 1) + (receiver.overall - 70) * 0.05);
  });
  const receiver = pickWeighted(offense.receivers, receiverWeights, rng.at(`${key}:receiver`));
  play.receiverId = receiver?.id ?? null;

  const interceptionChance = clamp(
    (0.026 + targets.takeawayRisk) * posture.interception - edge * 0.0007,
    0.005,
    0.09
  );
  if (rng.at(`${key}:interception`) < interceptionChance) {
    play.turnover = true;
    if (offense.quarterback) {
      const line = offense.lines.get(offense.quarterback.id)!;
      line.passingAttempts += 1;
      line.interceptionsThrown += 1;
    }
    if (receiver) offense.lines.get(receiver.id)!.targets += 1;
    const defender = pickWeighted(
      defense.secondary,
      defense.secondary.map((player) => Math.max(1, player.ratings.technique - 50)),
      rng.at(`${key}:interceptor`)
    );
    if (defender) {
      defense.lines.get(defender.id)!.defensiveInterceptions += 1;
      play.interceptorId = defender.id;
    }
    return play;
  }

  const completionChance = clamp(0.668 + edge * 0.0065, 0.34, 0.87);
  const completed = rng.at(`${key}:completion`) < completionChance;
  play.completed = completed;
  if (offense.quarterback) offense.lines.get(offense.quarterback.id)!.passingAttempts += 1;
  if (receiver) offense.lines.get(receiver.id)!.targets += 1;

  if (!completed) {
    const defender = pickWeighted(defense.secondary, defense.secondary.map(() => 1), rng.at(`${key}:breakup`));
    if (defender && rng.at(`${key}:breakup-chance`) < 0.28) defense.lines.get(defender.id)!.passBreakups += 1;
    return play;
  }

  const receiverEdge = receiver ? (receiver.overall - offense.receiverBaseline) * 0.4 : 0;
  let yards = 8.1 + rhythm * 1.4 + (edge + receiverEdge) * 0.1 + standardNormal(rng, `${key}:pass-yards`) * 4.4;
  const explosiveChance = clamp(0.075 * posture.explosiveAllowed * pressure.explosiveAllowed, 0.02, 0.24);
  if (rng.at(`${key}:pass-explosive`) < explosiveChance) yards += 13 + rng.at(`${key}:pass-burst`) * 27;
  play.yards = Math.round(clamp(yards, -4, 99));
  play.ballCarrierId = receiver?.id ?? null;
  if (offense.quarterback) {
    const line = offense.lines.get(offense.quarterback.id)!;
    line.passingCompletions += 1;
    line.passingYards += play.yards;
  }
  if (receiver) {
    const line = offense.lines.get(receiver.id)!;
    line.receptions += 1;
    line.receivingYards += play.yards;
  }
  return play;
}

function creditTouchdown(offense: SideState, play: PlayResult): void {
  offense.scoreline.touchdowns += 1;
  offense.scoreline.points += 7;
  if (play.type === "RUN") {
    if (play.ballCarrierId) offense.lines.get(play.ballCarrierId)!.rushingTouchdowns += 1;
    return;
  }
  if (play.receiverId) offense.lines.get(play.receiverId)!.receivingTouchdowns += 1;
  if (offense.quarterback) offense.lines.get(offense.quarterback.id)!.passingTouchdowns += 1;
}

function attemptFieldGoal(offense: SideState, fieldPosition: number, rng: AddressableRng, key: string): boolean {
  const kicker = offense.kicker;
  const distance = 117 - fieldPosition;
  const accuracy = clamp(0.97 - (distance - 20) * 0.014 + ((kicker?.ratings.technique ?? 60) - 62) * 0.005, 0.35, 0.97);
  const made = rng.at(`${key}:field-goal`) < accuracy;
  if (kicker) {
    const line = offense.lines.get(kicker.id)!;
    line.fieldGoalsAttempted += 1;
    if (made) line.fieldGoalsMade += 1;
  }
  if (made) {
    offense.scoreline.fieldGoals += 1;
    offense.scoreline.points += 3;
  }
  return made;
}

function punt(offense: SideState, rng: AddressableRng, key: string): number {
  const punter = offense.punter;
  const distance = clamp(
    42.5 + (((punter?.ratings.technique ?? 68) - 70) * 0.08) + standardNormal(rng, `${key}:punt`) * 4.5,
    25,
    62
  );
  if (punter) {
    const line = offense.lines.get(punter.id)!;
    line.punts += 1;
    line.puntYards += Math.round(distance);
  }
  return distance;
}

/**
 * Plays one drive as a sequence of downs. Down-and-distance is what makes a
 * called play matter: converting keeps the offense on the field, and failing
 * hands the ball back.
 */
function resolveDrive(
  offense: SideState,
  defense: SideState,
  startingPosition: number,
  scoreDifferential: number,
  rng: AddressableRng,
  key: string
): DriveOutcome {
  let fieldPosition = startingPosition;
  let down = 1;
  let toGo = 10;
  let drivePlays = 0;
  let firstDowns = 0;
  const record = (outcome: DriveOutcome): DriveOutcome => {
    offense.driveLog.push({ startPosition: startingPosition, result: outcome.result, plays: drivePlays, yards: fieldPosition - startingPosition });
    return outcome;
  };
  for (let playIndex = 0; playIndex < 24; playIndex += 1) {
    drivePlays += 1;
    // A drive that keeps converting moves the ball more easily than one starting
    // cold: defenses tire and the offense works from ahead of the chains. This is
    // what separates a three-and-out from a scoring drive, and it is why real
    // punting drives gain about ten yards while scoring drives gain seventy.
    const rhythm = Math.min(firstDowns, 5) * 0.62;
    const play = resolvePlay(offense, defense, scoreDifferential, rhythm, rng, `${key}:${playIndex}`);
    const unit: TeamUnit = play.type === "RUN" ? "rushOffense" : "passOffense";
    const opposingUnit: TeamUnit = play.type === "RUN" ? "rushDefense" : "passDefense";
    offense.unitPlays[unit].plays += 1;
    offense.unitPlays[unit].yards += play.yards;
    defense.unitPlays[opposingUnit].plays += 1;
    defense.unitPlays[opposingUnit].yards += play.yards;
    if (play.type === "RUN") offense.runPlays += 1;
    else offense.passPlays += 1;

    if (play.completed || play.type === "RUN") creditTackle(defense, play, rng, `${key}:${playIndex}`);

    if (play.turnover) {
      offense.giveaways += 1;
      return record({ result: "TURNOVER", endPosition: clamp(fieldPosition + play.yards, 1, 99), puntDistance: 0 });
    }

    fieldPosition += play.yards;
    if (fieldPosition >= 100) {
      creditTouchdown(offense, play);
      offense.unitPlays[unit].touchdowns += 1;
      defense.unitPlays[opposingUnit].touchdowns += 1;
      return record({ result: "TOUCHDOWN", endPosition: 100, puntDistance: 0 });
    }
    if (fieldPosition <= 1) fieldPosition = 1;

    toGo -= play.yards;
    if (toGo <= 0) {
      down = 1;
      toGo = 10;
      firstDowns += 1;
      continue;
    }
    down += 1;
    // A failed fourth down is a turnover on downs.
    if (down > 4) return record({ result: "DOWNS", endPosition: fieldPosition, puntDistance: 0 });
    if (down < 4) continue;
    // Fourth down is a decision, not just another snap. Offenses kick when they
    // are in range, gamble on short yardage past midfield, and otherwise punt —
    // which is what keeps drives near six plays instead of eight.
    const inFieldGoalRange = fieldPosition >= FIELD_GOAL_MINIMUM_POSITION;
    // Being in range is not a reason to kick: fourth and goal from the one is
    // a play, not a chip shot. Without this an offense that reaches the red
    // zone settles for three far more often than a real one does.
    const goForItChance = toGo <= 2 && fieldPosition >= 88 ? 0.8
      : toGo <= 4 && fieldPosition >= 93 ? 0.6
        : toGo <= 2 && fieldPosition >= 40 && !inFieldGoalRange ? 0.6
          : toGo <= 4 && fieldPosition >= 52 && !inFieldGoalRange ? 0.45
            : toGo <= 7 && fieldPosition >= 60 && !inFieldGoalRange ? 0.25
              : 0;
    if (rng.at(`${key}:${playIndex}:fourth-down`) < goForItChance) continue;
    if (inFieldGoalRange) {
      const made = attemptFieldGoal(offense, fieldPosition, rng, `${key}:${playIndex}`);
      return record({ result: made ? "FIELD_GOAL" : "MISSED_FIELD_GOAL", endPosition: fieldPosition, puntDistance: 0 });
    }
    return record({ result: "PUNT", endPosition: fieldPosition, puntDistance: punt(offense, rng, `${key}:${playIndex}`) });
  }
  return record({ result: "DOWNS", endPosition: fieldPosition, puntDistance: 0 });
}

/**
 * Where the next offense takes over. Turnovers and missed kicks hand over short
 * fields, which is what turns a takeaway into points rather than just a
 * possession — and what makes hunting them worth the yards it concedes.
 */
function nextStartingPosition(outcome: DriveOutcome, rng: AddressableRng, key: string): number {
  const jitter = standardNormal(rng, `${key}:next-start`) * 4;
  if (outcome.result === "TOUCHDOWN" || outcome.result === "FIELD_GOAL") return Math.round(clamp(26 + jitter, 12, 45));
  if (outcome.result === "PUNT") {
    const landing = outcome.endPosition + outcome.puntDistance;
    // A punt into the end zone is a touchback out to the 20.
    if (landing >= 100) return 20;
    return Math.round(clamp(100 - landing + jitter * 0.5, 5, 60));
  }
  // Turnovers, downs, and missed kicks are taken over at the spot.
  const spot = Math.round(clamp(100 - outcome.endPosition, 1, 80));
  return outcome.result === "MISSED_FIELD_GOAL" ? Math.max(20, spot) : spot;
}

function finalizeSide(
  state: SideState,
  opponent: SideState,
  won: boolean,
  totalDrives: number
): SideResult {
  const result: "WIN" | "LOSS" = won ? "WIN" : "LOSS";
  const snaps = state.runPlays + state.passPlays;
  for (const line of state.lines.values()) {
    line.result = result;
    if (line.position === "OL") {
      line.snaps = snaps;
      line.blockingGrade = Math.round(clamp(
        68 + (state.planned.rushOffense + state.planned.passOffense - opponent.planned.rushDefense - opponent.planned.passDefense) * 0.4
          - state.sacksAgainst * 1.8 + (won ? 3 : -2),
        35,
        95
      ));
    } else if (line.position === "K") {
      line.snaps = line.fieldGoalsAttempted + state.scoreline.touchdowns;
    } else if (line.position === "P") {
      line.snaps = line.punts;
    } else if (line.position === "QB") {
      line.snaps = snaps;
    } else if (["RB", "WR", "TE"].includes(line.position)) {
      const touches = line.rushingAttempts + line.targets;
      line.snaps = Math.min(snaps, Math.round(snaps * 0.5 + touches * 1.5));
    } else {
      line.snaps = opponent.runPlays + opponent.passPlays;
    }
    line.gameRating = gradePerformance(line, won);
  }

  const matchups: MatchupOutcome[] = (Object.keys(state.unitPlays) as TeamUnit[]).map((unit) => {
    const opposing: TeamUnit = unit === "rushOffense" ? "rushDefense"
      : unit === "passOffense" ? "passDefense"
        : unit === "rushDefense" ? "rushOffense" : "passOffense";
    const tally = state.unitPlays[unit];
    return {
      unit,
      rating: Number(state.planned[unit].toFixed(1)),
      opposingRating: Number(opponent.planned[opposing].toFixed(1)),
      edge: Number((state.planned[unit] - opponent.planned[opposing]).toFixed(1)),
      plays: tally.plays,
      yards: tally.yards,
      yardsPerPlay: Number((tally.yards / Math.max(1, tally.plays)).toFixed(2)),
      touchdowns: tally.touchdowns
    };
  });

  const carries = [...state.lines.values()].reduce((sum, line) => sum + line.rushingAttempts, 0);
  const leadBackCarries = state.backs[0] ? state.lines.get(state.backs[0].id)!.rushingAttempts : 0;
  const allTargets = [...state.lines.values()].reduce((sum, line) => sum + line.targets, 0);
  const topTargets = state.receivers[0] ? state.lines.get(state.receivers[0].id)!.targets : 0;

  const tempoFatigue = TEMPO[state.side.plan.tempo].fatigue;
  for (const player of state.side.lineup) {
    state.fatigueAdded[player.id] = (state.fatigueAdded[player.id] ?? 0) + tempoFatigue * (totalDrives / 12);
  }

  return {
    scoreline: state.scoreline,
    statLines: [...state.lines.values()],
    units: state.units,
    runPlays: state.runPlays,
    passPlays: state.passPlays,
    giveaways: state.giveaways,
    takeaways: opponent.giveaways,
    sacksFor: [...state.lines.values()].reduce((sum, line) => sum + line.sacks, 0),
    sacksAgainst: state.sacksAgainst,
    matchups,
    leadBackShare: Number((leadBackCarries / Math.max(1, carries)).toFixed(3)),
    topTargetShare: Number((topTargets / Math.max(1, allTargets)).toFixed(3)),
    fatigueAdded: state.fatigueAdded,
    driveLog: state.driveLog
  };
}

function gradePerformance(line: PlayerGameStatLine, won: boolean): number {
  const winBonus = won ? 3 : -1;
  if (line.position === "QB") {
    const completionRate = line.passingAttempts > 0 ? line.passingCompletions / line.passingAttempts : 0;
    const yardsPerAttempt = line.passingAttempts > 0 ? line.passingYards / line.passingAttempts : 0;
    return Math.round(clamp(
      44 + completionRate * 26 + (yardsPerAttempt - 6) * 3 + line.passingTouchdowns * 3.5
        - line.interceptionsThrown * 5 - line.sacksTaken * 0.8 + winBonus,
      25,
      99
    ));
  }
  if (line.position === "RB") {
    return Math.round(clamp(45 + line.rushingYards * 0.22 + line.rushingTouchdowns * 8 + winBonus, 25, 99));
  }
  if (line.position === "WR" || line.position === "TE") {
    return Math.round(clamp(45 + line.receptions * 2 + line.receivingYards * 0.2 + line.receivingTouchdowns * 7 + winBonus, 25, 99));
  }
  if (line.position === "OL") return Math.round(clamp(line.blockingGrade, 25, 99));
  if (line.position === "K") {
    const missed = line.fieldGoalsAttempted - line.fieldGoalsMade;
    return Math.round(clamp(50 + line.fieldGoalsMade * 11 - missed * 8 + winBonus, 25, 99));
  }
  if (line.position === "P") {
    const average = line.punts > 0 ? line.puntYards / line.punts : 40;
    return Math.round(clamp(44 + (average - 42) * 2.2 + winBonus, 25, 99));
  }
  return Math.round(clamp(
    45 + line.tackles * 2.6 + line.tacklesForLoss * 3 + line.sacks * 7
      + line.defensiveInterceptions * 12 + line.passBreakups * 3 + winBonus,
    25,
    99
  ));
}

/**
 * Plays a full game drive by drive. Both teams receive the same number of
 * drives, set by the tempo both sides chose, so hurrying up hands possessions
 * to the opponent as well.
 */
export function resolveGame(
  home: TeamSide,
  away: TeamSide,
  context: StatLineContext,
  homeFieldAdvantage: number,
  rng: AddressableRng
): GameResult {
  const homeState = buildSideState(home, away.programId, context);
  const awayState = buildSideState(away, home.programId, context);
  for (const unit of Object.keys(homeState.planned) as TeamUnit[]) {
    homeState.planned[unit] += homeFieldAdvantage;
  }

  const drives = Math.max(8, Math.round((TEMPO[home.plan.tempo].drives + TEMPO[away.plan.tempo].drives) / 2));
  // Possessions alternate and hand field position across, so a takeaway is
  // worth the short field it creates rather than merely ending a drive.
  let startingPosition = 25;
  for (let index = 0; index < drives * 2; index += 1) {
    const homeHasBall = index % 2 === 0;
    const offense = homeHasBall ? homeState : awayState;
    const defense = homeHasBall ? awayState : homeState;
    const key = `${homeHasBall ? "home" : "away"}:${Math.floor(index / 2)}`;
    const differential = offense.scoreline.points - defense.scoreline.points;
    const outcome = resolveDrive(offense, defense, startingPosition, differential, rng, key);
    startingPosition = nextStartingPosition(outcome, rng, key);
  }

  if (homeState.scoreline.points === awayState.scoreline.points) {
    const winner = rng.at("overtime") < 0.5 ? homeState : awayState;
    const loser = winner === homeState ? awayState : homeState;
    resolveDrive(winner, loser, 75, 0, rng.fork("overtime-drive"), "overtime");
    if (winner.scoreline.points === loser.scoreline.points) {
      winner.scoreline.fieldGoals += 1;
      winner.scoreline.points += 3;
      if (winner.kicker) {
        const line = winner.lines.get(winner.kicker.id)!;
        line.fieldGoalsAttempted += 1;
        line.fieldGoalsMade += 1;
      }
    }
  }

  const homeWon = homeState.scoreline.points > awayState.scoreline.points;
  return {
    home: finalizeSide(homeState, awayState, homeWon, drives),
    away: finalizeSide(awayState, homeState, !homeWon, drives)
  };
}
