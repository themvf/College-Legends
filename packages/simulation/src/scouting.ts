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
import { DOSSIER_THRESHOLDS, dossierTiers, staffContribution } from "./department.js";
import {
  DEFENSIVE_IDENTITY_LABELS,
  GAME_PLAN_OPTIONS,
  OFFENSIVE_IDENTITY_LABELS,
  intendedGamePlan,
  unitLabel
} from "./game.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

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

export function scoutingTierLabel(tier: ScoutingTier): string {
  return SCOUTING_TIER_LABELS[tier];
}

/**
 * A program's weekly preparation pool: coaching attention plus facilities.
 * Buys practice reps only — scouting is paid for out of the department's own
 * output, so the two compete for coaches rather than for points.
 */
export function preparationWeeklyPoints(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  // Literally the hours the staff put into preparing the team, lightly scaled by
  // the weight room. This used to be `12 + facility + contribution/22`, a second
  // currency derived from hours and then spent again — two pools for one
  // decision. It also produced 26 a week against a 24-hour cost to max both
  // sides, so practice was free and there was no decision on the screen at all.
  const hours = Object.values(state.staff)
    .filter((member) => member.programId === programId)
    .reduce((total, member) => total + Math.max(0, member.allocation?.PREPARE ?? 0), 0);
  // Ceiling on purpose. There are only so many hours you can put pads on in a
  // week — real football caps this too — and it is what guarantees a full install
  // on both sides is always out of reach, however good the staff is. A strong
  // staff is rewarded through the *quality* of each rep in `planInstaller`, not
  // by escaping the choice.
  return Math.round(clampValue(hours * (0.85 + program.facilities.TRAINING * 0.05), 2, MAXIMUM_PRACTICE_HOURS));
}

/** A week only holds so much practice, whoever is running it. */
export const MAXIMUM_PRACTICE_HOURS = 15;

const clampValue = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

/**
 * How reliable a file is: the department behind it, the film available, and how
 * much work has actually gone into it. Week one has no film at all, which is
 * what makes the opening game a genuine unknown rather than a lookup.
 */
export function scoutingConfidence(
  state: Readonly<GameState>,
  programId: string,
  filmGames: number,
  dossierPoints = 0
): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const department = (program.facilities.SCOUTING ?? 1) * 6;
  // Film dominates. With none, even a strong department is projecting rather
  // than reporting — which is what makes the opening week a real unknown.
  const film = Math.min(filmGames, 5) * 6;
  // Work put into this specific file. Diminishing, so a deep file is never
  // certainty and points are better spread across games that matter.
  const work = Math.sqrt(Math.max(0, dossierPoints)) * 4.2;
  return Math.round(clamp(10 + department + film + work, 10, 92));
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
 *
 * A program only plans against what its own file says. Rivals used to read the
 * opponent's exact ratings for free, which made scouting a system only the
 * player paid for — an unscouted opponent now gets a plan built from identity
 * and personnel alone.
 */
export function projectedGamePlan(
  state: Readonly<GameState>,
  programId: string,
  opponentId: string | null,
  unitRatings: (programId: string) => TeamUnitRatings
): GamePlan {
  const program = state.programs[programId]!;
  const opponent = opponentId ? state.programs[opponentId] : null;
  const known = opponentId ? dossierTiers(state.dossiers?.[programId]?.[opponentId] ?? 0) : [];
  return intendedGamePlan(
    program.schemeIdentity,
    unitRatings(programId),
    opponentId && known.includes("PERSONNEL") ? unitRatings(opponentId) : null,
    rosterFatigue(state, programId),
    program.losses > program.wins,
    known.includes("TENDENCIES") ? opponent?.schemeIdentity ?? null : null
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
  const dossierPoints = state.dossiers?.[programId]?.[opponentId] ?? 0;
  const filmGames = filmGamesAvailable(state, opponentId);
  // Nothing is readable off tape that does not exist. The department produces at
  // a baseline every week now and files it automatically, so without this the
  // opening Saturday would arrive with every program's tendencies already known
  // — and week one is supposed to be the one genuine unknown of the season.
  const tiers = filmGames === 0 ? [] : dossierTiers(dossierPoints);
  const confidence = scoutingConfidence(state, programId, filmGames, dossierPoints);
  const rng = new AddressableRng(state.identity.rootSeed).fork("scouting", String(state.season), String(state.week), programId, opponentId);

  const notes: string[] = [];
  if (filmGames === 0) {
    notes.push("No film exists on this opponent yet, so every read is a projection rather than a record.");
  } else {
    notes.push(`${filmGames} game${filmGames === 1 ? "" : "s"} of film available.`);
  }
  const nextTier = SCOUTING_TIERS.find((tier) => !tiers.includes(tier));
  if (nextTier) {
    notes.push(`${DOSSIER_THRESHOLDS[nextTier] - dossierPoints} more points on this file opens ${SCOUTING_TIER_LABELS[nextTier].toLowerCase()}.`);
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
