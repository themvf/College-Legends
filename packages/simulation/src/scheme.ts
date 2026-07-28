import type {
  DefensiveIdentity,
  GameState,
  OffensiveIdentity,
  Player,
  PlayerRating,
  Position,
  SchemeIdentity,
  StaffMember,
  StaffRole
} from "@college-legends/model";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

export const OFFENSIVE_SCHEMES: readonly OffensiveIdentity[] =
  ["POWER_RUN", "TRIPLE_OPTION", "PRO_BALANCED", "SPREAD_TEMPO", "AIR_RAID"];
export const DEFENSIVE_SCHEMES: readonly DefensiveIdentity[] =
  ["BEND_DONT_BREAK", "FOUR_THREE_BASE", "ZONE_BLITZ", "NICKEL_PRESSURE"];

export const OFFENSIVE_IDENTITY_LABELS: Readonly<Record<OffensiveIdentity, string>> = {
  POWER_RUN: "Power run",
  TRIPLE_OPTION: "Triple option",
  PRO_BALANCED: "Pro balanced",
  SPREAD_TEMPO: "Spread tempo",
  AIR_RAID: "Air raid"
};

export const DEFENSIVE_IDENTITY_LABELS: Readonly<Record<DefensiveIdentity, string>> = {
  BEND_DONT_BREAK: "Bend don't break",
  FOUR_THREE_BASE: "Four-three base",
  ZONE_BLITZ: "Zone blitz",
  NICKEL_PRESSURE: "Nickel pressure"
};

export const OFFENSIVE_SCHEME_BLURBS: Readonly<Record<OffensiveIdentity, string>> = {
  POWER_RUN: "Line up and move people. Wants a heavy offensive line and a featured back.",
  TRIPLE_OPTION: "Punishing and strange. Wants a mobile quarterback and disciplined blocking, and nothing else.",
  PRO_BALANCED: "No weakness and no edge. Asks least of the roster you have.",
  SPREAD_TEMPO: "Space and speed. Wants receivers who can run and a quarterback who decides fast.",
  AIR_RAID: "Throw it. Wants an arm, four receivers, and a line that can hold up."
};

export const DEFENSIVE_SCHEME_BLURBS: Readonly<Record<DefensiveIdentity, string>> = {
  BEND_DONT_BREAK: "Concede the field, defend the end zone. Wants safeties and tacklers.",
  FOUR_THREE_BASE: "Sound and unspectacular. Wants a front four that holds up alone.",
  ZONE_BLITZ: "Pressure from disguise. Wants linebackers who can cover and rush.",
  NICKEL_PRESSURE: "Come after the quarterback. Wants corners who can survive alone."
};

/**
 * Where each scheme sits on a run–pass axis. Used to score how close two schemes
 * are, which is cheaper and more consistent than authoring a 25-cell fit table —
 * and it means a coach hired for the wrong scheme is wrong by a *degree*.
 */
const OFFENSIVE_AXIS: Readonly<Record<OffensiveIdentity, number>> = {
  POWER_RUN: 0,
  TRIPLE_OPTION: 0.12,
  PRO_BALANCED: 0.5,
  SPREAD_TEMPO: 0.8,
  AIR_RAID: 1
};

const DEFENSIVE_AXIS: Readonly<Record<DefensiveIdentity, number>> = {
  BEND_DONT_BREAK: 0,
  FOUR_THREE_BASE: 0.4,
  ZONE_BLITZ: 0.72,
  NICKEL_PRESSURE: 1
};

/** 1.0 for the same scheme, falling with distance. Never below 0.55. */
export function schemeAffinity(left: OffensiveIdentity | DefensiveIdentity, right: OffensiveIdentity | DefensiveIdentity): number {
  const axis = (value: OffensiveIdentity | DefensiveIdentity): number =>
    value in OFFENSIVE_AXIS
      ? OFFENSIVE_AXIS[value as OffensiveIdentity]
      : DEFENSIVE_AXIS[value as DefensiveIdentity];
  return Number(clamp(1 - Math.abs(axis(left) - axis(right)) * 0.45, 0.55, 1).toFixed(3));
}

interface SchemeDemand {
  position: Position;
  /** How many of that room the scheme actually leans on. */
  count: number;
  rating: PlayerRating | "overall";
  weight: number;
}

/**
 * What each scheme asks of a roster. Fit is scored against the program's own
 * average, so it answers "which scheme suits these players" rather than "how
 * good are these players" — the same roster should not score 90 for everything
 * simply because it is a power program.
 */
const OFFENSIVE_DEMANDS: Readonly<Record<OffensiveIdentity, readonly SchemeDemand[]>> = {
  POWER_RUN: [
    { position: "OL", count: 5, rating: "strength", weight: 3 },
    { position: "RB", count: 2, rating: "overall", weight: 2.5 },
    { position: "TE", count: 1, rating: "strength", weight: 1.5 }
  ],
  TRIPLE_OPTION: [
    { position: "QB", count: 1, rating: "conditioning", weight: 3 },
    { position: "OL", count: 5, rating: "technique", weight: 2.5 },
    { position: "RB", count: 2, rating: "overall", weight: 2 }
  ],
  PRO_BALANCED: [
    { position: "QB", count: 1, rating: "overall", weight: 2 },
    { position: "OL", count: 5, rating: "overall", weight: 2 },
    { position: "RB", count: 2, rating: "overall", weight: 1.5 },
    { position: "WR", count: 3, rating: "overall", weight: 1.5 }
  ],
  SPREAD_TEMPO: [
    { position: "QB", count: 1, rating: "technique", weight: 2.5 },
    { position: "WR", count: 3, rating: "conditioning", weight: 2.5 },
    { position: "RB", count: 1, rating: "overall", weight: 1.5 },
    { position: "OL", count: 5, rating: "conditioning", weight: 1.5 }
  ],
  AIR_RAID: [
    { position: "QB", count: 1, rating: "armStrength", weight: 3 },
    { position: "WR", count: 4, rating: "overall", weight: 3 },
    { position: "OL", count: 5, rating: "technique", weight: 1.5 }
  ]
};

// Each defense leans hard on one room. Spread the weights evenly across all
// three and every scheme scores the same, because every roster has some of each —
// which makes the choice cosmetic.
const DEFENSIVE_DEMANDS: Readonly<Record<DefensiveIdentity, readonly SchemeDemand[]>> = {
  BEND_DONT_BREAK: [
    { position: "DB", count: 4, rating: "overall", weight: 5 },
    { position: "LB", count: 3, rating: "technique", weight: 1 }
  ],
  FOUR_THREE_BASE: [
    { position: "DL", count: 4, rating: "strength", weight: 5 },
    { position: "LB", count: 3, rating: "overall", weight: 1 }
  ],
  ZONE_BLITZ: [
    { position: "LB", count: 3, rating: "technique", weight: 5 },
    { position: "DL", count: 4, rating: "technique", weight: 1 }
  ],
  NICKEL_PRESSURE: [
    { position: "DB", count: 4, rating: "technique", weight: 3 },
    { position: "DL", count: 4, rating: "strength", weight: 3 }
  ]
};

function groupStrength(roster: readonly Player[], demand: SchemeDemand): number | null {
  const room = roster
    .filter((player) => player.position === demand.position)
    .map((player) => demand.rating === "overall" ? player.overall : player.ratings[demand.rating])
    .sort((left, right) => right - left)
    .slice(0, demand.count);
  if (room.length === 0) return null;
  return room.reduce((total, value) => total + value, 0) / room.length;
}

function scoreDemands(roster: readonly Player[], demands: readonly SchemeDemand[]): number {
  if (roster.length === 0) return 50;
  const baseline = roster.reduce((total, player) => total + player.overall, 0) / roster.length;
  let weighted = 0;
  let weight = 0;
  for (const demand of demands) {
    const strength = groupStrength(roster, demand);
    if (strength === null) continue;
    weighted += (strength - baseline) * demand.weight;
    weight += demand.weight;
  }
  if (weight === 0) return 50;
  // Scaled so a roster genuinely built for a scheme lands in the seventies and
  // one built against it in the thirties, without ever reaching a certainty.
  return clamp(50 + (weighted / weight) * 3.4, 12, 94);
}

export interface SchemeFit {
  scheme: OffensiveIdentity | DefensiveIdentity;
  label: string;
  blurb: string;
  /** The estimate, as a band. A coach knows his roster well but not perfectly. */
  low: number;
  high: number;
  expected: number;
  summary: string;
}

/**
 * How well a roster suits each scheme, as a band rather than a number.
 *
 * An exact "70% Air Raid" is a lookup, and a lookup is a spreadsheet. The width
 * narrows as a staff watches its own players, which is why your own roster reads
 * tighter than a prospect ever does.
 */
export function rosterSchemeFit(
  roster: readonly Player[],
  side: "OFFENSE" | "DEFENSE",
  confidence = 0.7
): SchemeFit[] {
  const schemes = side === "OFFENSE" ? OFFENSIVE_SCHEMES : DEFENSIVE_SCHEMES;
  const width = clamp(22 - confidence * 16, 5, 22);
  return schemes.map((scheme) => {
    const centre = side === "OFFENSE"
      ? scoreDemands(roster, OFFENSIVE_DEMANDS[scheme as OffensiveIdentity])
      : scoreDemands(roster, DEFENSIVE_DEMANDS[scheme as DefensiveIdentity]);
    const low = Math.round(clamp(centre - width / 2, 5, 99));
    const high = Math.round(clamp(centre + width / 2, 7, 99));
    return {
      scheme,
      label: side === "OFFENSE"
        ? OFFENSIVE_IDENTITY_LABELS[scheme as OffensiveIdentity]
        : DEFENSIVE_IDENTITY_LABELS[scheme as DefensiveIdentity],
      blurb: side === "OFFENSE"
        ? OFFENSIVE_SCHEME_BLURBS[scheme as OffensiveIdentity]
        : DEFENSIVE_SCHEME_BLURBS[scheme as DefensiveIdentity],
      low,
      high,
      expected: Math.round(centre),
      summary: `${low}–${high}% fit`
    };
  }).sort((left, right) => right.expected - left.expected);
}

export function programRoster(state: Readonly<GameState>, programId: string): Player[] {
  return Object.values(state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP");
}

/** The side of the ball a post is responsible for installing. */
export function staffSide(role: StaffRole): "OFFENSE" | "DEFENSE" | null {
  if (role === "OFFENSIVE_COORDINATOR") return "OFFENSE";
  if (role === "DEFENSIVE_COORDINATOR") return "DEFENSE";
  return null;
}

/**
 * How well a coach's own scheme preference matches what the program runs.
 * Applied to the installer's effective rating, so hiring an Air Raid coordinator
 * to install Power Run costs execution rather than removing options.
 */
export function coachSchemeFit(
  member: Pick<StaffMember, "role" | "schemePreference">,
  identity: SchemeIdentity
): number {
  if (member.role === "STRENGTH_COACH") return 1;
  const side = staffSide(member.role);
  if (side === "OFFENSE") return schemeAffinity(member.schemePreference.offense, identity.offense);
  if (side === "DEFENSE") return schemeAffinity(member.schemePreference.defense, identity.defense);
  // A head coach carries both, at half the consequence of a specialist.
  const offense = schemeAffinity(member.schemePreference.offense, identity.offense);
  const defense = schemeAffinity(member.schemePreference.defense, identity.defense);
  return Number((1 - (1 - (offense + defense) / 2) * 0.5).toFixed(3));
}

export function schemeFitLabel(fit: number): string {
  if (fit >= 0.99) return "His scheme exactly";
  if (fit >= 0.9) return "Close to his scheme";
  if (fit >= 0.78) return "Workable, not his";
  return "Not what he coaches";
}
