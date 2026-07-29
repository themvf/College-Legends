import type { GamePlan, GameState, Player, Program } from "@college-legends/model";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

export const MINIMUM_TICKET_PRICE = 10;
export const MAXIMUM_TICKET_PRICE = 200;
export const MAXIMUM_WEEKLY_ADVERTISING = 400_000;

/**
 * What a ticket is worth given who the program is. Winning, recognition, and a
 * ranked opponent all raise what an audience will pay; a struggling programme
 * cannot charge like a contender. Pricing above this is possible and sometimes
 * correct, but it costs attendance and goodwill.
 */
export function fairTicketPrice(
  program: Readonly<Program>,
  opponent: Readonly<Program> | null,
  marqueeGame: boolean
): number {
  const standing = program.prestige * 0.28 + program.fanSupport * 0.12 + Math.max(0, 26 - program.nationalRank) * 0.5;
  const draw = opponent ? Math.max(0, 26 - opponent.nationalRank) * 0.45 : 0;
  return Math.round(clamp(18 + standing + draw + (marqueeGame ? 8 : 0), MINIMUM_TICKET_PRICE, 140));
}

/**
 * How demand responds to price. Charging under the fair price fills seats but
 * leaves money on the table; charging over it empties them. The curve is
 * deliberately gentle near the fair price so small adjustments are a nudge
 * rather than a cliff.
 *
 * Above the fair price it decays exponentially rather than linearly to a floor.
 * The floor was the bug: once a program's multiplier bottomed out, attendance
 * stopped falling, revenue became `constant x price`, and the maximum ticket
 * price was strictly optimal for any program loyal enough to reach it. Measured
 * across a 24-program league, gouging beat fair pricing at 3 programs and by 26%
 * at one. Exponential decay keeps revenue single-peaked at every elasticity, so
 * there is always a real optimum to find.
 */
const PRICE_DECAY = 1.35;
/**
 * Even the most loyal audience has a limit. Without this floor a diehard base
 * (elasticity 0.35) put its revenue peak past the $200 cap, so the cap was
 * optimal again by a different route. With it, measured over 72 programs, the
 * weekly optimum sits between 0.86x and 1.24x of fair: a front-runner should
 * price under, a diehard can price over, and nobody should ever max it out.
 */
const ELASTICITY_FLOOR = 0.6;

export function ticketDemandMultiplier(price: number, fairPrice: number, elasticity = 1): number {
  const overage = (price - fairPrice) / Math.max(1, fairPrice);
  // A diehard base barely notices the price; a front-running one leaves.
  if (overage <= 0) return clamp(1 - overage * 0.85 * elasticity, 0, 1.4);
  return Math.exp(-PRICE_DECAY * Math.max(ELASTICITY_FLOOR, elasticity) * overage);
}

/**
 * Advertising reach, with diminishing returns. A first ten thousand does far
 * more than a fifth. Reach both fills the stadium this week and adds followers
 * who persist, which is where the real return sits.
 */
export function advertisingReach(spend: number): { attendance: number; newFans: number } {
  const scaled = Math.sqrt(Math.max(0, spend));
  return {
    attendance: Math.round(scaled * 7),
    newFans: Math.round(scaled * 4.5)
  };
}

export interface GateProjection {
  fairPrice: number;
  price: number;
  demand: number;
  capacity: number;
  attendance: number;
  ticketRevenue: number;
  concessionRevenue: number;
  advertisingSpend: number;
  advertisingFans: number;
  net: number;
  soldOut: boolean;
}

/**
 * Projects a home gate before the week is played, so the price and advertising
 * decisions can post their payoff rather than being a guess.
 */
export function projectGate(
  program: Readonly<Program>,
  opponent: Readonly<Program> | null,
  capacity: number,
  marqueeGame: boolean,
  priceOverride?: number,
  spendOverride?: number
): GateProjection {
  const price = priceOverride ?? program.ticketPrice;
  const spend = spendOverride ?? program.advertisingSpend;
  const fairPrice = fairTicketPrice(program, opponent, marqueeGame);
  const reach = advertisingReach(spend);
  const opponentDraw = opponent ? opponent.fanBase * 0.045 + (opponent.nationalRank <= 25 ? 5_000 : 0) + (marqueeGame ? 7_500 : 0) : 0;
  const baseDemand = program.fanBase * 0.62 + opponentDraw + reach.attendance;
  const demand = baseDemand * ticketDemandMultiplier(price, fairPrice, program.fanElasticity ?? 1);
  // Only a small hardcore turns up regardless of price. Kept tight because a
  // generous floor is a flat attendance times a rising price, which is a second
  // route back to gouging being optimal.
  const attendance = Math.round(clamp(demand, capacity * 0.06, capacity));
  const stadiumModifier = 1 + Math.max(0, program.facilities.STADIUM - 1) * 0.08;
  const ticketRevenue = Math.round(attendance * price);
  const concessionRevenue = Math.round(attendance * 17 * stadiumModifier);
  return {
    fairPrice,
    price,
    demand: Math.round(demand),
    capacity,
    attendance,
    ticketRevenue,
    concessionRevenue,
    advertisingSpend: spend,
    advertisingFans: reach.newFans,
    net: ticketRevenue + concessionRevenue - spend,
    soldOut: attendance >= capacity
  };
}

/**
 * Goodwill cost of pricing above what the programme's standing justifies.
 * Gouging a loyal audience works for a week and erodes the fan base that makes
 * the gate worth having.
 */
export function pricingGoodwill(price: number, fairPrice: number, elasticity = 1): number {
  const overage = (price - fairPrice) / Math.max(1, fairPrice);
  if (overage <= 0.05) return 0;
  return -Math.round(clamp(overage * 12 * elasticity, 0, 12));
}

/**
 * The three players worth this week's development attention, and what each one
 * is for. The choice is meant to be a trade rather than a ranking: build the
 * future, feed the brand that pays the bills, or protect an asset you cannot
 * replace.
 */
export function developmentCandidates(state: Readonly<GameState>, programId: string): {
  playerId: string; name: string; position: Player["position"]; overall: number;
  reason: "RISING" | "STAR" | "AT_RISK"; headline: string; detail: string;
}[] {
  const roster = Object.values(state.players).filter((player) =>
    player.programId === programId
    && player.eligibility.rosterStatus === "SCHOLARSHIP"
    && player.injuryWeeksRemaining === 0
  );
  if (roster.length === 0) return [];

  const chosen = new Set<string>();
  const pick = (
    candidates: readonly Player[],
    reason: "RISING" | "STAR" | "AT_RISK",
    headline: (player: Player) => string,
    detail: (player: Player) => string
  ) => {
    const player = candidates.find((candidate) => !chosen.has(candidate.id));
    if (!player) return null;
    chosen.add(player.id);
    return {
      playerId: player.id,
      name: player.name,
      position: player.position,
      overall: Math.round(player.overall),
      reason,
      headline: headline(player),
      detail: detail(player)
    };
  };

  const rising = [...roster]
    .filter((player) => player.eligibility.seasonsRemaining > 1)
    .sort((left, right) =>
      (right.potential - right.overall) - (left.potential - left.overall) || left.id.localeCompare(right.id));
  const stars = [...roster].sort((left, right) => right.stardom - left.stardom || left.id.localeCompare(right.id));
  const atRisk = [...roster].sort((left, right) =>
    (right.fatigue - right.ratings.injuryPrevention * 0.4) - (left.fatigue - left.ratings.injuryPrevention * 0.4)
    || left.id.localeCompare(right.id));

  return [
    pick(rising, "RISING",
      (player) => "Most room to grow",
      (player) => `${Math.round(player.potential - player.overall)} points of unrealised ceiling, with ${player.eligibility.seasonsRemaining} seasons left to use it.`),
    pick(stars, "STAR",
      (player) => "Your biggest name",
      (player) => `${player.stardom} stardom and ${player.personalFans.toLocaleString()} personal followers — the brand the gate is built on.`),
    pick(atRisk, "AT_RISK",
      (player) => "Closest to breaking down",
      (player) => `${Math.round(player.fatigue)} fatigue against ${Math.round(player.ratings.injuryPrevention)} durability. Conditioning work protects him.`)
  ].filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
}

export interface StrategyPreset {
  id: string;
  label: string;
  effect: string;
  tradeoff: string;
  plan: Partial<GamePlan>;
}

/**
 * Named strategies that set every underlying axis at once. The individual
 * emphasis toggles still exist for players who want them — a preset is a
 * shortcut through the same decision space, not a replacement for it.
 */
export const OFFENSIVE_PRESETS: readonly StrategyPreset[] = [
  {
    id: "GROUND_AND_POUND",
    label: "Ground and pound",
    effect: "Run behind a featured back and shorten the game",
    tradeoff: "Little passing threat, and a run-stopping front smothers it",
    plan: { runPassBalance: "RUN_HEAVY", backfieldUsage: "FEATURE_BACK", targetDistribution: "SPREAD_IT", tempo: "CONTROL_CLOCK" }
  },
  {
    id: "BALANCED_ATTACK",
    label: "Balanced attack",
    effect: "No weakness for a defense to sit on",
    tradeoff: "Never the best answer to any particular defense",
    plan: { runPassBalance: "BALANCED", backfieldUsage: "FEATURE_BACK", targetDistribution: "SPREAD_IT", tempo: "NORMAL" }
  },
  {
    id: "AIR_IT_OUT",
    label: "Air it out",
    effect: "Throw early and often at tempo, feeding your best receiver",
    tradeoff: "More sacks and interceptions, and a tired defense from short drives",
    plan: { runPassBalance: "PASS_HEAVY", backfieldUsage: "COMMITTEE", targetDistribution: "FEED_THE_STAR", tempo: "HURRY_UP" }
  },
  {
    id: "BALL_CONTROL",
    label: "Ball control",
    effect: "Spread the carries, drain the clock, protect a lead or a thin roster",
    tradeoff: "Fewer possessions to come back with when you fall behind",
    plan: { runPassBalance: "BALANCED", backfieldUsage: "COMMITTEE", targetDistribution: "SPREAD_IT", tempo: "CONTROL_CLOCK" }
  }
];

export const DEFENSIVE_PRESETS: readonly StrategyPreset[] = [
  {
    id: "BALANCED_FRONT",
    label: "Balanced front",
    effect: "No weakness for an offense to attack",
    tradeoff: "Never shuts down what the opponent does best",
    plan: { defensivePriority: "BALANCED", defensivePosture: "CONTAIN", pressure: "SITUATIONAL" }
  },
  {
    id: "STUFF_THE_RUN",
    label: "Stuff the run",
    effect: "Commit the front to taking the running game away",
    tradeoff: "A passing team will throw over the top of it",
    plan: { defensivePriority: "STOP_THE_RUN", defensivePosture: "CONTAIN", pressure: "SITUATIONAL" }
  },
  {
    id: "LOCK_THE_PASS",
    label: "Lock down the pass",
    effect: "Blanket the receivers and make them earn it on the ground",
    tradeoff: "A power running game will grind you down",
    plan: { defensivePriority: "STOP_THE_PASS", defensivePosture: "CONTAIN", pressure: "COVERAGE_FIRST" }
  },
  {
    id: "ATTACK",
    label: "Attack the ball",
    effect: "Blitz and hunt takeaways; the fastest way to swing a game",
    tradeoff: "Yards and explosive plays when it does not come off",
    plan: { defensivePriority: "BALANCED", defensivePosture: "TAKEAWAY_HUNT", pressure: "HEAVY_BLITZ" }
  },
  {
    id: "BEND_DONT_BREAK",
    label: "Bend, don't break",
    effect: "Concede the short stuff and refuse the big play",
    tradeoff: "Few takeaways, and good offenses sustain long drives",
    plan: { defensivePriority: "BALANCED", defensivePosture: "BEND_DONT_BREAK", pressure: "COVERAGE_FIRST" }
  }
];

/** Which preset the current plan matches, or null when it has been fine-tuned. */
export function matchingPreset(plan: Readonly<GamePlan>, presets: readonly StrategyPreset[]): StrategyPreset | null {
  return presets.find((preset) =>
    (Object.entries(preset.plan) as [keyof GamePlan, string][]).every(([key, value]) => plan[key] === value)
  ) ?? null;
}
