import type { FacilityType, Program } from "@college-legends/model";

/**
 * What a program earns and what it costs to be one.
 *
 * The audit finding this closes: `weeklyRevenue` and `weeklyExpenses` were
 * constants stamped on each program at league creation and never mutated again.
 * Measured across a 24-program league, the frozen expense constant was **96-98%
 * of everything a program spent** — payroll, NIL and advertising together came
 * to 2-4%. So nothing the player built ever cost anything to sustain, while
 * revenue grew with the gate as the program improved. That asymmetry is the
 * whole compounding problem: measured over five seasons, MID budgets grew 2.7x
 * and POWER 2.3x with the gap widening every year against the low-tier program
 * the game asks you to start at.
 *
 * Both sides are now functions of what the program actually is.
 *
 * **The expense side is the half that was broken**, which was not the
 * expectation going in — the finding predicted the revenue side. Facilities in
 * particular cost $350K-$3M once and were then free forever, so an upgrade was
 * a purchase rather than a commitment. Every level now carries weekly upkeep,
 * superlinearly, which is what turns "should I build this" into a real question.
 *
 * Nothing here consumes RNG. Both are pure functions of program state, so the
 * UI can post the exact figure the weekly finances will charge.
 */

/**
 * Per scholarship, per week: kit, meals, travel, academic support.
 *
 * Charged against the program's scholarship *limit* rather than a live roster
 * count. A scholarship is a commitment the department has already made, so it
 * costs whether or not the bed is filled — and it means this figure needs no
 * scan of six thousand players to compute, which matters because both the AI
 * and the UI ask for it every week.
 */
export const SQUAD_COST_PER_SCHOLARSHIP = 1_500;

/**
 * Weekly upkeep for one facility, by its level, as `level^exponent x unit`.
 * Superlinear on purpose: a fifth-level weight room is not five times a
 * first-level one to run, and a program that builds everything to the ceiling
 * should feel it every week rather than only at the moment of purchase.
 */
export const FACILITY_UPKEEP_EXPONENT = 1.7;
export const FACILITY_UPKEEP_UNIT = 12_000;

/** Year-round stadium overheads, per seat of capacity, home game or not. */
export const STADIUM_COST_PER_SEAT = 3;

/**
 * The share of everything a program earns that goes straight back out to run
 * it — matchday staffing, travel, administration, compliance, the department.
 *
 * **A proportion rather than a curve, and that is the whole point.** Two
 * earlier builds drove this cost off prestige and national press instead, and
 * the second one inverted the game: because the cost curve was superlinear in
 * standing while media money is linear in it, improving your program raised
 * costs faster than revenue. Measured over one season, mid-tier programs that
 * went 11-2 and 9-5 lost $7.4M and $5.7M while every program that went 3-9 lost
 * between $1.1M and $3.7M. Winning cost more than losing, which is a worse
 * defect than the runaway this work set out to fix.
 *
 * Scaling the cost with revenue itself cannot punish success: a program that
 * earns more pays proportionally more and keeps the difference.
 */
export const OPERATING_SHARE = 0.55;

/**
 * Media rights, replacing the frozen revenue constant. The conference floor is
 * what the tier's television deal pays whatever happens; the rest is what a
 * program's own recognition adds to it, which is the first time national press
 * and prestige convert to money outside a sponsorship contract.
 */
export const CONFERENCE_FLOOR: Readonly<Record<Program["tier"], number>> = {
  LOW: 120_000,
  MID: 260_000,
  POWER: 520_000
};
export const MEDIA_PER_PRESS_POINT = 3_400;
export const MEDIA_PER_PRESTIGE_POINT = 1_600;
export const MEDIA_PER_CHAMPIONSHIP = 26_000;

/**
 * The cash a program is created holding, as a reserve against its own running
 * costs rather than as a difficulty setting.
 *
 * These two ideas were the same three constants — $1.5M / $6M / $20M appeared
 * both here and in `CAREER_PATHS` — so neither could be tuned without moving
 * the other. Separating them is the fix; the career path still overrides the
 * player's own balance, and is untouched.
 *
 * The old figures left a low-tier program holding about **a week and a half of
 * operating cash** against a $1.1M weekly turnover, which no organisation
 * runs on. Measured, that meant a drift of roughly $320K a season sank 19 of 72
 * programs inside five years — fast enough to hollow out the league inside one
 * career. At roughly six weeks of turnover the same drift takes about twenty
 * seasons, so a program failing is a story that happens once in a dynasty
 * rather than a third of the league quietly dying.
 *
 * The drift itself is deliberately left alone: a badly run program *should*
 * slowly bleed, and that is where the coaching market gets its churn.
 *
 * Measured over five seasons at 72 programs, this is the smaller half of the
 * fix. Disciplining the rival planner's facility spending took insolvencies
 * from 22 to 15 on the old balances; the reserve then took them to 2. Neither
 * alone is enough — with the old float a low-tier program sits at exactly zero
 * for three straight seasons, where any bad week tips it under.
 */
export const OPENING_RESERVE: Readonly<Record<Program["tier"], number>> = {
  LOW: 6_500_000,
  MID: 12_000_000,
  POWER: 20_000_000
};

const FACILITY_KEYS: readonly FacilityType[] = ["STADIUM", "TRAINING", "ACADEMICS", "RECRUITING", "SCOUTING"];

/** Weekly upkeep for one facility at one level. Exposed so a UI can price an upgrade. */
export function facilityUpkeep(level: number): number {
  if (level <= 0) return 0;
  return Math.round(level ** FACILITY_UPKEEP_EXPONENT * FACILITY_UPKEEP_UNIT);
}

/**
 * What upgrading this facility adds to the weekly bill, forever. The purchase
 * price is one number the player already sees; this is the one they did not.
 */
export function facilityUpkeepIncrease(currentLevel: number): number {
  return facilityUpkeep(currentLevel + 1) - facilityUpkeep(currentLevel);
}

export interface OperatingCost {
  /** Scholarships the department has committed to. */
  squad: number;
  /** Upkeep on everything the program has built. */
  facilities: number;
  /** Year-round stadium overheads. */
  stadium: number;
  /** The share of this week's earnings that running the program consumes. */
  operations: number;
  total: number;
}

/**
 * Everything the program spends before payroll, NIL and advertising — the three
 * the player already sees on their own lines.
 */
export function operatingCost(program: Readonly<Program>, capacity: number, weeklyRevenue: number): OperatingCost {
  const squad = Math.round(Math.max(0, program.scholarshipLimit) * SQUAD_COST_PER_SCHOLARSHIP);
  const facilities = FACILITY_KEYS.reduce(
    (total, facility) => total + facilityUpkeep(program.facilities[facility] ?? 0),
    0
  );
  const stadium = Math.round(capacity * STADIUM_COST_PER_SEAT);
  const operations = Math.round(Math.max(0, weeklyRevenue) * OPERATING_SHARE);
  return { squad, facilities, stadium, operations, total: squad + facilities + stadium + operations };
}

export interface MediaRights {
  conference: number;
  recognition: number;
  legacy: number;
  total: number;
}

/**
 * The television money, which is the first thing in the game to turn fame
 * directly into cash outside a sponsorship contract. A program that becomes a
 * national name earns more from the same schedule.
 */
export function mediaRights(program: Readonly<Program>): MediaRights {
  const conference = CONFERENCE_FLOOR[program.tier];
  const recognition = Math.round(
    program.nationalPress * MEDIA_PER_PRESS_POINT + program.prestige * MEDIA_PER_PRESTIGE_POINT
  );
  const legacy = Math.round(program.championships * MEDIA_PER_CHAMPIONSHIP);
  return { conference, recognition, legacy, total: conference + recognition + legacy };
}
