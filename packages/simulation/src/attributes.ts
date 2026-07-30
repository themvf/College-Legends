import type { Position } from "@college-legends/model";

/**
 * Five attributes per position, named in football, and Overall derived from them.
 *
 * The defect this replaces: `developPlayers` moved five sub-ratings by ~0.2 each
 * *and separately* grew `overall` from its own formula. The only link was one
 * fudge factor, so what a player chose to develop barely moved the number he
 * cared about — which is exactly why the development screen felt inert.
 *
 * Storage is unchanged at five numbers per player. Only the meaning is
 * position-specific, which matters against a save file that is already an iOS
 * blocker at 17 MB of state.
 *
 * Each of the five carries a **role**, so the engine can ask for "this position's
 * primary skill" generically while the UI shows the football name. Without that
 * every unit formula would need a switch on position.
 */
export type AttributeRole = "PRIMARY" | "SECONDARY" | "POWER" | "SPEED" | "DURABILITY";

export interface AttributeDefinition {
  /** Stable key, used in state and in development commands. */
  key: string;
  /** What a football fan calls it. */
  label: string;
  role: AttributeRole;
  /** Share of Overall. Sums to 1 within a position. */
  weight: number;
  /** One line for the development popup. */
  effect: string;
}

const define = (
  key: string,
  label: string,
  role: AttributeRole,
  weight: number,
  effect: string
): AttributeDefinition => ({ key, label, role, weight, effect });

/**
 * The weights are what make a position's Overall mean something. A quarterback's
 * accuracy is worth nearly twice his arm; a lineman's durability barely moves his
 * number because a hurt lineman is simply replaced.
 */
export const POSITION_ATTRIBUTES: Readonly<Record<Position, readonly AttributeDefinition[]>> = {
  QB: [
    define("accuracy", "Accuracy", "PRIMARY", 0.3, "Completions, and fewer balls put in harm's way"),
    define("decisions", "Decision making", "SECONDARY", 0.28, "Fewer interceptions and fewer sacks taken"),
    define("armTalent", "Arm talent", "POWER", 0.18, "Yards per completion and the deep throw"),
    define("mobility", "Mobility", "SPEED", 0.14, "Escapes pressure and carries the option game"),
    define("durability", "Durability", "DURABILITY", 0.1, "Stays upright through November")
  ],
  RB: [
    define("vision", "Vision", "PRIMARY", 0.3, "Finds the hole; yards before contact"),
    define("elusiveness", "Elusiveness", "SECONDARY", 0.24, "Breaks tackles into explosive runs"),
    define("power", "Power", "POWER", 0.22, "Short yardage and yards after contact"),
    define("speed", "Speed", "SPEED", 0.14, "Turns a crease into a long run"),
    define("durability", "Durability", "DURABILITY", 0.1, "Carries a full workload without breaking down")
  ],
  WR: [
    define("routeRunning", "Route running", "PRIMARY", 0.32, "Gets open; completion rate on his targets"),
    define("hands", "Hands", "SECONDARY", 0.26, "Catches what reaches him"),
    define("release", "Release", "POWER", 0.16, "Beats press coverage off the line"),
    define("speed", "Speed", "SPEED", 0.18, "Separation and explosive plays"),
    define("durability", "Durability", "DURABILITY", 0.08, "Available in week twelve")
  ],
  TE: [
    define("blocking", "Blocking", "PRIMARY", 0.3, "Seals the edge in the run game"),
    define("hands", "Hands", "SECONDARY", 0.26, "A reliable target over the middle"),
    define("strength", "Strength", "POWER", 0.2, "Holds up against a defensive end"),
    define("speed", "Speed", "SPEED", 0.14, "A threat down the seam"),
    define("durability", "Durability", "DURABILITY", 0.1, "Takes contact every snap and keeps playing")
  ],
  OL: [
    define("passBlock", "Pass blocking", "PRIMARY", 0.32, "Keeps the quarterback clean; fewer sacks"),
    define("runBlock", "Run blocking", "SECONDARY", 0.28, "Yards per carry and short yardage"),
    define("strength", "Strength", "POWER", 0.22, "Anchors against a bull rush"),
    define("agility", "Agility", "SPEED", 0.12, "Pulls and reaches on zone blocks"),
    define("durability", "Durability", "DURABILITY", 0.06, "Never comes off the field")
  ],
  DL: [
    define("passRush", "Pass rush", "PRIMARY", 0.32, "Sacks and pressure on the quarterback"),
    define("runStuff", "Run stuffing", "SECONDARY", 0.26, "Holds the point; yards allowed on the ground"),
    define("strength", "Strength", "POWER", 0.22, "Occupies blockers and collapses the pocket"),
    define("quickness", "Quickness", "SPEED", 0.14, "Wins off the snap"),
    define("durability", "Durability", "DURABILITY", 0.06, "Plays a heavy rotation all season")
  ],
  LB: [
    define("tackling", "Tackling", "PRIMARY", 0.3, "Stops the play where it started"),
    define("coverage", "Coverage", "SECONDARY", 0.24, "Takes away the middle of the field"),
    define("strength", "Strength", "POWER", 0.2, "Sheds blocks and fills the gap"),
    define("range", "Range", "SPEED", 0.18, "Chases plays down sideline to sideline"),
    define("durability", "Durability", "DURABILITY", 0.08, "Available every Saturday")
  ],
  DB: [
    define("coverage", "Coverage", "PRIMARY", 0.34, "Completions allowed against him"),
    define("ballSkills", "Ball skills", "SECONDARY", 0.24, "Interceptions and pass breakups"),
    define("press", "Press", "POWER", 0.14, "Disrupts a receiver at the line"),
    define("speed", "Speed", "SPEED", 0.2, "Stays with a burner; prevents explosive plays"),
    define("durability", "Durability", "DURABILITY", 0.08, "Holds up over a full season")
  ],
  K: [
    define("legPower", "Leg power", "PRIMARY", 0.34, "Range on the long field goal"),
    define("kickAccuracy", "Accuracy", "SECONDARY", 0.34, "Makes what he should make"),
    define("strength", "Strength", "POWER", 0.12, "Drives the ball through wind"),
    define("composure", "Composure", "SPEED", 0.14, "Holds up with the game on his foot"),
    define("durability", "Durability", "DURABILITY", 0.06, "Kicks all season without a tired leg")
  ],
  P: [
    define("legPower", "Leg power", "PRIMARY", 0.36, "Net yards per punt"),
    define("placement", "Placement", "SECONDARY", 0.32, "Pins the opponent deep"),
    define("strength", "Strength", "POWER", 0.12, "Punts into a wind"),
    define("composure", "Composure", "SPEED", 0.14, "Handles a rush without a shank"),
    define("durability", "Durability", "DURABILITY", 0.06, "Never misses a game")
  ]
};

/** Every attribute key the game knows about, for validating a development command. */
export const ATTRIBUTE_KEYS: readonly string[] = [
  ...new Set(Object.values(POSITION_ATTRIBUTES).flatMap((group) => group.map((entry) => entry.key)))
];

export function attributesFor(position: Position): readonly AttributeDefinition[] {
  return POSITION_ATTRIBUTES[position];
}

/** The attribute filling a role at this position. Lets the engine stay generic. */
export function attributeByRole(position: Position, role: AttributeRole): AttributeDefinition {
  const found = POSITION_ATTRIBUTES[position].find((entry) => entry.role === role);
  // Every position defines all five roles; the fallback keeps callers total.
  return found ?? POSITION_ATTRIBUTES[position][0]!;
}

/** A player's value in a role, whatever that role is called at his position. */
export function ratingByRole(
  position: Position,
  ratings: Readonly<Record<string, number>>,
  role: AttributeRole
): number {
  return ratings[attributeByRole(position, role).key] ?? 50;
}

/**
 * Overall, computed. This is the whole point: developing any attribute raises
 * Overall by a stated amount, because Overall *is* the attributes. There is no
 * separate growth formula to drift away from the player's choice.
 */
export function computeOverall(position: Position, ratings: Readonly<Record<string, number>>): number {
  const group = POSITION_ATTRIBUTES[position];
  const total = group.reduce((sum, entry) => sum + (ratings[entry.key] ?? 50) * entry.weight, 0);
  const weight = group.reduce((sum, entry) => sum + entry.weight, 0);
  return Number((total / (weight || 1)).toFixed(2));
}

/** How much Overall one point of this attribute is worth. Posted on the popup. */
export function overallPerPoint(position: Position, key: string): number {
  const entry = POSITION_ATTRIBUTES[position].find((candidate) => candidate.key === key);
  return entry ? entry.weight : 0;
}
