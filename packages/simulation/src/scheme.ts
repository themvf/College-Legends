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
import { DEFENSIVE_SPOTS, OFFENSIVE_SPOTS } from "./rotation.js";

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
  POWER_RUN: "Line up and knock people off the ball. You need a big offensive line and a back who wants 25 carries.",
  TRIPLE_OPTION: "Nobody wants a week to prepare for it. You need a quarterback who can run and linemen who never miss an assignment.",
  PRO_BALANCED: "Pro-style. No glaring weakness, no real edge either — it asks the least of whoever you've got.",
  SPREAD_TEMPO: "Spread them out and play fast. You need receivers who can run and a quarterback who gets the ball out.",
  AIR_RAID: "Air it out. You need an arm, four receivers who can go get it, and a line that holds up in protection."
};

export const DEFENSIVE_SCHEME_BLURBS: Readonly<Record<DefensiveIdentity, string>> = {
  BEND_DONT_BREAK: "Give up the field, not the end zone. You need safeties who tackle and nobody who gets beat deep.",
  FOUR_THREE_BASE: "Base 4-3. Nothing fancy — you need a front four that wins without help.",
  ZONE_BLITZ: "Bring pressure out of coverage. You need linebackers who can rush and drop.",
  NICKEL_PRESSURE: "Get after the quarterback. You need corners who can hold up on an island."
};

/**
 * The players a scheme actually puts on the field — read from the rotation
 * model, which is what the engine plays with on Saturday.
 *
 * This used to be a second, older table that predated the eleven-man rotation
 * work and disagreed with it: the scheme-selection screen sold Spread tempo as
 * a four-receiver offense while the drive loop and the depth chart fielded
 * three. A player was promised one offense and given another. One source of
 * truth now; `OFFENSIVE_SPOTS` in rotation.ts is it.
 */
export function schemePersonnel(
  side: "OFFENSE" | "DEFENSE",
  scheme: OffensiveIdentity | DefensiveIdentity
): Readonly<Partial<Record<Position, number>>> {
  return side === "OFFENSE"
    ? OFFENSIVE_SPOTS[scheme as OffensiveIdentity]
    : DEFENSIVE_SPOTS[scheme as DefensiveIdentity];
}

export function personnelSummary(
  side: "OFFENSE" | "DEFENSE",
  scheme: OffensiveIdentity | DefensiveIdentity
): string {
  const grouping = schemePersonnel(side, scheme);
  const order: readonly Position[] = side === "OFFENSE"
    ? ["QB", "RB", "WR", "TE", "OL"]
    : ["DL", "LB", "DB"];
  return order
    .filter((position) => (grouping[position] ?? 0) > 0)
    .map((position) => `${grouping[position]} ${position}`)
    .join(" · ");
}

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
    .map((player) => demand.rating === "overall" ? player.overall : player.ratings[demand.rating] ?? player.overall)
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

/**
 * How far the best and worst scheme on the screen may sit from the middle of
 * it. Sets the widest displayed spread at roughly twice this, which is the
 * ~22–30 points the comparative scale was designed to show.
 */
export const MAXIMUM_FIT_DEVIATION = 15;

export interface SchemeFit {
  scheme: OffensiveIdentity | DefensiveIdentity;
  label: string;
  blurb: string;
  /** The estimate, as a band. A coach knows his roster well but not perfectly. */
  low: number;
  high: number;
  expected: number;
  summary: string;
  /** Plain-language read on the band, for players who do not want a number. */
  verdict: string;
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
  const raw = schemes.map((scheme) => side === "OFFENSE"
    ? scoreDemands(roster, OFFENSIVE_DEMANDS[scheme as OffensiveIdentity])
    : scoreDemands(roster, DEFENSIVE_DEMANDS[scheme as DefensiveIdentity]));
  // This comparative scale predates the shaped-roster generator. It remains the
  // takeover-screen estimate until slice 2 replaces it with weighted role
  // deficits and derived traits; slice 1 deliberately changes personnel only.
  const average = raw.reduce((total, value) => total + value, 0) / Math.max(1, raw.length);
  // The amplification is capped rather than fixed.
  //
  // A flat ×3.2 was calibrated on a freshly generated roster, which is
  // internally uniform: raw scores land within a few points of each other and
  // need spreading before the screen can say what the roster is built for. One
  // season of development, graduation, the portal and a recruiting class
  // separates the rooms, and the same multiplier then drove every scheme into
  // the clamps. Measured over 48 programs across two leagues: the displayed
  // spread went from 18 points in the opening preseason to 70 a year later, the
  // program's own scheme moved a median of 30 points, and 85% of programs
  // changed verdict — 19 of 48 from "Good fit" or "Built for it" straight to
  // "Wrong personnel", which is what a cold player met at their second takeover
  // screen with no explanation available anywhere.
  //
  // Capping the gain leaves the opening preseason untouched, where the raw
  // scores are tight enough that ×3.2 never binds, and stops a settled roster
  // reading as a disaster. It is a monotone transform, so the ordering — the
  // only part of this that `bestSchemeFor` consumes — is unchanged.
  const deviation = Math.max(...raw.map((value) => Math.abs(value - average)));
  const gain = deviation > 0 ? Math.min(3.2, MAXIMUM_FIT_DEVIATION / deviation) : 0;
  return schemes.map((scheme, index) => {
    const centre = clamp(64 + (raw[index]! - average) * gain, 24, 94);
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
      summary: `${low}–${high}% fit`,
      verdict: centre >= 78 ? "Built for it" : centre >= 62 ? "Good fit" : centre >= 45 ? "Workable" : "Wrong personnel"
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

/**
 * What calling off-scheme costs.
 *
 * Deliberately smaller than the emphasis matchup swing. The matchup matrix is
 * calibrated over 400 games a cell and a full counter is worth about 2.7 points
 * — so if going off-scheme cost more than that, exploiting a scouted weakness
 * would never pay and the matchup game would be dead. Deviating should be right
 * when the matchup is lopsided and wrong when it is not.
 */
const ALIGNMENT_COST = 0.11;
const ALIGNMENT_FLOOR = 0.9;

/** Where a week's call sits on the same run–pass axis the schemes use. */
const BALANCE_AXIS: Readonly<Record<string, number>> = { RUN_HEAVY: 0.05, BALANCED: 0.5, PASS_HEAVY: 0.95 };
const PRIORITY_AXIS: Readonly<Record<string, number>> = { STOP_THE_RUN: 0.1, BALANCED: 0.5, STOP_THE_PASS: 0.9 };

/**
 * How close this week's call is to what the program actually runs.
 *
 * A team is not a menu. An Air Raid program calling ground-and-pound is asking
 * players to execute something they have never practised, so it costs execution
 * — never availability, because the emphasis matchup matrix only holds while
 * every call stays selectable. Deviating is meant to be a real option when the
 * matchup is worth it, not a free one.
 */
export function planAlignment(
  call: { runPassBalance?: string; defensivePriority?: string },
  identity: SchemeIdentity,
  side: "OFFENSE" | "DEFENSE"
): number {
  if (side === "OFFENSE") {
    const called = BALANCE_AXIS[call.runPassBalance ?? "BALANCED"] ?? 0.5;
    const natural = OFFENSIVE_AXIS[identity.offense];
    return Number(clamp(1 - Math.abs(called - natural) * ALIGNMENT_COST, ALIGNMENT_FLOOR, 1).toFixed(3));
  }
  const called = PRIORITY_AXIS[call.defensivePriority ?? "BALANCED"] ?? 0.5;
  // A defense's identity axis is aggression, not run/pass, so the natural
  // priority is the middle unless the scheme is built to take something away.
  const natural = identity.defense === "BEND_DONT_BREAK" ? 0.5
    : identity.defense === "FOUR_THREE_BASE" ? 0.28
      : identity.defense === "ZONE_BLITZ" ? 0.6 : 0.78;
  return Number(clamp(1 - Math.abs(called - natural) * ALIGNMENT_COST, ALIGNMENT_FLOOR, 1).toFixed(3));
}

/** What going off-scheme costs, in plain words. */
export function alignmentNote(alignment: number, schemeLabel: string): string {
  if (alignment >= 0.99) return "This is what you run";
  if (alignment >= 0.96) return `Close to your ${schemeLabel}`;
  return `Off-scheme — your guys don't rep this, so ${Math.round((1 - alignment) * 100)}% less of it holds up`;
}

export function schemeFitLabel(fit: number): string {
  if (fit >= 0.99) return "Runs exactly what you run";
  if (fit >= 0.9) return "Close enough to what he knows";
  if (fit >= 0.78) return "He can run it, but it isn't his";
  return "This isn't what he coaches";
}

/**
 * A scheme the roster can actually run.
 *
 * Deliberately not *the* best fit. Assigning every program its optimum collapsed
 * the league onto two or three schemes — measured at 83% of programs sharing a
 * pass-rush call — which leaves an opponent report with nothing to say and makes
 * scouting worthless. Picking from the top two keeps a program credible while
 * leaving the league varied, and leaves the player a reason to change it.
 */
export function bestSchemeFor(roster: readonly Player[], pick: (side: "OFFENSE" | "DEFENSE") => number = () => 0): SchemeIdentity {
  const offense = rosterSchemeFit(roster, "OFFENSE");
  const defense = rosterSchemeFit(roster, "DEFENSE");
  return {
    offense: offense[Math.min(offense.length - 1, pick("OFFENSE"))]!.scheme as OffensiveIdentity,
    defense: defense[Math.min(defense.length - 1, pick("DEFENSE"))]!.scheme as DefensiveIdentity
  };
}
