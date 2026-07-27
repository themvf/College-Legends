import type {
  GamePlan,
  GameState,
  OpponentScoutingReport,
  Player,
  Program,
  ScoutedTendency,
  ScoutedUnit,
  ScoutingTier,
  SchemeIdentity,
  TeamUnit,
  TeamUnitRatings
} from "@college-legends/model";
import { AddressableRng } from "./rng.js";
import {
  DEFENSIVE_IDENTITY_LABELS,
  GAME_PLAN_OPTIONS,
  OFFENSIVE_IDENTITY_LABELS,
  intendedGamePlan,
  unitLabel
} from "./game.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

/**
 * Preparation is attention, not money. The pool refreshes weekly and cannot be
 * banked, and the three tiers together cost more than a week provides — so
 * scouting is always chosen at the expense of something else.
 */
export const SCOUTING_COSTS: Readonly<Record<ScoutingTier, number>> = {
  TENDENCIES: 8,
  PERSONNEL: 14,
  GAME_PLAN: 22
};

export const SCOUTING_TIERS: readonly ScoutingTier[] = ["TENDENCIES", "PERSONNEL", "GAME_PLAN"];

export const SCOUTING_TIER_LABELS: Readonly<Record<ScoutingTier, string>> = {
  TENDENCIES: "Tendencies",
  PERSONNEL: "Personnel",
  GAME_PLAN: "Game plan"
};

export const SCOUTING_TIER_DESCRIPTIONS: Readonly<Record<ScoutingTier, string>> = {
  TENDENCIES: "Their scheme identity and how they have played this season",
  PERSONNEL: "Their four unit ratings as ranges, plus the players who drive them",
  GAME_PLAN: "How likely each of their calls is this week — never a certainty"
};

export function scoutingCost(tier: ScoutingTier): number {
  return SCOUTING_COSTS[tier];
}

/** A program's weekly preparation pool: coaching attention plus facilities. */
export function preparationWeeklyPoints(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const staff = Object.values(state.staff)
    .filter((member) => member.programId === programId && member.assignment === "GAME_PREP")
    .reduce((total, member) => total + member.rating / 22, 0);
  return Math.round(12 + program.facilities.TRAINING * 2 + staff);
}

/**
 * How reliable a report is, from the people producing it and the film they have
 * to work from. Week one has no film at all, which is what makes the opening
 * game a genuine unknown rather than a lookup.
 */
export function scoutingConfidence(state: Readonly<GameState>, programId: string, filmGames: number): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const staff = Object.values(state.staff)
    .filter((member) => member.programId === programId && member.assignment === "GAME_PREP")
    .reduce((total, member) => total + member.rating / 8, 0);
  // Film dominates. With none, even a strong staff is projecting rather than
  // reporting — which is what makes the opening week a real unknown.
  const film = Math.min(filmGames, 5) * 7;
  return Math.round(clamp(14 + program.facilities.TRAINING * 4 + staff + film, 18, 90));
}

export function filmGamesAvailable(state: Readonly<GameState>, opponentProgramId: string): number {
  return state.schedule.filter((game) =>
    game.played
    && (game.homeProgramId === opponentProgramId || game.awayProgramId === opponentProgramId)
  ).length;
}

export function scheduledOpponent(state: Readonly<GameState>, programId: string): string | null {
  const game = state.schedule.find((item) =>
    item.week === state.week && !item.played && (item.homeProgramId === programId || item.awayProgramId === programId)
  );
  if (!game) return null;
  return game.homeProgramId === programId ? game.awayProgramId : game.homeProgramId;
}

function rosterFatigue(state: Readonly<GameState>, programId: string): number {
  const roster = Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP"
  );
  if (roster.length === 0) return 0;
  return roster.reduce((total, player) => total + player.fatigue, 0) / roster.length;
}

/**
 * The plan a program will actually run this week. Both the rival planner and
 * the scouting report call this, so a bought report describes the real plan
 * rather than a parallel guess that could drift away from it.
 */
export function projectedGamePlan(
  state: Readonly<GameState>,
  programId: string,
  opponentId: string | null,
  unitRatings: (programId: string) => TeamUnitRatings
): GamePlan {
  const program = state.programs[programId]!;
  const opponent = opponentId ? state.programs[opponentId] : null;
  return intendedGamePlan(
    program.schemeIdentity,
    unitRatings(programId),
    opponentId ? unitRatings(opponentId) : null,
    rosterFatigue(state, programId),
    program.losses > program.wins,
    opponent?.schemeIdentity ?? null
  );
}

/**
 * Spreads probability over an axis: the true call holds most of the mass, the
 * rest is distributed across the alternatives. Confidence narrows the spread
 * but never reaches certainty, so the top tier stays a read rather than a
 * lookup table.
 */
function likelihood(axis: keyof GamePlan, actual: string, confidence: number): ScoutedTendency {
  const options = GAME_PLAN_OPTIONS[axis];
  const truth = clamp(0.35 + confidence / 100 * 0.5, 0.35, 0.85);
  const remainder = options.length > 1 ? (1 - truth) / (options.length - 1) : 0;
  return {
    axis,
    label: axis,
    options: options.map((option) => ({
      value: option.value,
      label: option.label,
      probability: Number((option.value === actual ? truth : remainder).toFixed(2))
    }))
  };
}

function unitRange(rating: number, confidence: number, rng: AddressableRng, key: string): { low: number; high: number } {
  // A poor report is both wider and off-centre; a good one narrows on the truth.
  const width = clamp(16 - confidence * 0.13, 1.5, 14);
  const bias = rng.between(key, -width * 0.4, width * 0.4);
  const centre = rating + bias;
  return { low: Number((centre - width / 2).toFixed(1)), high: Number((centre + width / 2).toFixed(1)) };
}

function reputationOf(program: Readonly<Program>): string {
  if (program.nationalRank <= 10) return "National contender";
  if (program.nationalRank <= 25) return "Ranked";
  if (program.tier === "POWER") return "Power program";
  return program.tier === "MID" ? "Established program" : "Building program";
}

function identityNote(identity: SchemeIdentity): string {
  return `${OFFENSIVE_IDENTITY_LABELS[identity.offense]} offense · ${DEFENSIVE_IDENTITY_LABELS[identity.defense]} defense`;
}

export interface ScoutingInputs {
  unitRatings: (programId: string) => TeamUnitRatings;
}

/**
 * What a program knows about this week's opponent. Everything above the free
 * tier has to be bought, and nothing is ever exact — better staff and more film
 * narrow the ranges without collapsing them.
 */
export function opponentScoutingReport(
  state: Readonly<GameState>,
  programId: string,
  inputs: ScoutingInputs
): OpponentScoutingReport {
  const preparation = state.preparation?.[programId];
  const opponentId = scheduledOpponent(state, programId);
  if (!opponentId) {
    return {
      opponentProgramId: null,
      tiers: [],
      filmGames: 0,
      confidence: 0,
      record: "—",
      nationalRank: null,
      reputation: null,
      identity: null,
      units: null,
      keyPlayers: null,
      tendencies: null,
      notes: ["No opponent is scheduled this week."]
    };
  }

  const opponent = state.programs[opponentId]!;
  const tiers = preparation?.scoutedOpponentId === opponentId ? [...(preparation.scoutedTiers ?? [])] : [];
  const filmGames = filmGamesAvailable(state, opponentId);
  const confidence = scoutingConfidence(state, programId, filmGames);
  const rng = new AddressableRng(state.identity.rootSeed).fork("scouting", String(state.season), String(state.week), programId, opponentId);

  const notes: string[] = [];
  if (filmGames === 0) {
    notes.push("No film exists on this opponent yet, so every read is a projection rather than a record.");
  } else {
    notes.push(`${filmGames} game${filmGames === 1 ? "" : "s"} of film available.`);
  }

  const identity = tiers.includes("TENDENCIES") ? opponent.schemeIdentity : null;
  if (identity) notes.push(`They are a ${identityNote(identity).toLowerCase()} program.`);

  let units: ScoutedUnit[] | null = null;
  let keyPlayers: OpponentScoutingReport["keyPlayers"] = null;
  if (tiers.includes("PERSONNEL")) {
    const ratings = inputs.unitRatings(opponentId);
    units = (Object.keys(ratings) as TeamUnit[]).map((unit) => ({
      unit,
      ...unitRange(ratings[unit], confidence, rng, `${unit}:range`)
    }));
    keyPlayers = Object.values(state.players)
      .filter((player): player is Player =>
        player.programId === opponentId && player.eligibility.rosterStatus === "SCHOLARSHIP"
      )
      .sort((left, right) => right.overall - left.overall || left.id.localeCompare(right.id))
      .slice(0, 3)
      .map((player) => ({
        playerId: player.id,
        name: player.name,
        position: player.position,
        note: `${unitLabel(player.position === "QB" || player.position === "WR" || player.position === "TE" ? "passOffense" : "rushOffense")} · ${Math.round(player.overall)} overall`
      }));
  }

  let tendencies: ScoutedTendency[] | null = null;
  if (tiers.includes("GAME_PLAN")) {
    const actual = projectedGamePlan(state, opponentId, programId, inputs.unitRatings);
    tendencies = (["runPassBalance", "defensivePriority", "defensivePosture", "pressure"] as (keyof GamePlan)[])
      .map((axis) => likelihood(axis, actual[axis], confidence));
    notes.push(`Read is ${confidence}% reliable; the rest is guesswork.`);
  }

  return {
    opponentProgramId: opponentId,
    tiers,
    filmGames,
    confidence,
    record: `${opponent.wins}–${opponent.losses}`,
    nationalRank: opponent.nationalRank,
    reputation: reputationOf(opponent),
    identity,
    units,
    keyPlayers,
    tendencies,
    notes
  };
}
