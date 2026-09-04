import type {
  GamePlan,
  GameState,
  Player,
  Program,
  SponsorshipOffer,
  SponsorshipProgramState
} from "@college-legends/model";
import { ratingByRole } from "./attributes.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

export const MINIMUM_TICKET_PRICE = 10;
export const MAXIMUM_TICKET_PRICE = 200;
export const MAXIMUM_WEEKLY_ADVERTISING = 400_000;
export const SPONSOR_HOME_ATTENDANCE_TARGET = 0.9;

const GUARANTEED_SPONSORS = ["Foundry Community Bank", "Crown Hardware", "Oakline Grocers", "Summit Family Markets"] as const;
const CROWD_SPONSORS = ["Heartland Wireless", "IronTrail Motors", "BluePeak Energy", "Pioneer Outfitters"] as const;
const WINNING_SPONSORS = ["VictoryGrid Sports", "Northstar Athletic", "Pulse Hydration", "Apex Mobile"] as const;

const roundTo = (value: number, increment: number): number => Math.round(value / increment) * increment;

function stableIndex(path: string, length: number): number {
  let hash = 2166136261;
  for (let index = 0; index < path.length; index += 1) {
    hash ^= path.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

/**
 * The weekly value of putting this program in front of a sponsor. This is the
 * missing conversion from fame to money: fans, national recognition, prestige,
 * and titles all raise the offers without directly improving a football rating.
 */
export function sponsorshipMarketValue(program: Readonly<Program>): number {
  const audience = program.fanBase * 1.25;
  const nationalRecognition = program.nationalPress * 900;
  const institutionalStanding = program.prestige * 400;
  const championshipLegacy = program.championships * 15_000;
  return Math.max(35_000, roundTo(audience + nationalRecognition + institutionalStanding + championshipLegacy, 5_000));
}

/**
 * Creates three offers against one market value. The safe contract pays all of
 * it every week; the other two put part of it at risk in return for a higher
 * ceiling. Values are frozen when the season opens, so an offer never moves
 * while the player is deciding.
 */
export function createSponsorshipOffers(program: Readonly<Program>, season: number): SponsorshipOffer[] {
  const market = sponsorshipMarketValue(program);
  const name = (pool: readonly string[], strategy: string): string =>
    pool[stableIndex(`${program.id}:${season}:${strategy}`, pool.length)]!;
  return [
    {
      id: `${program.id}:${season}:guaranteed`,
      sponsorName: name(GUARANTEED_SPONSORS, "guaranteed"),
      strategy: "GUARANTEED",
      weeklyPayment: roundTo(market, 5_000),
      homeAttendanceTarget: null,
      homeAttendanceBonus: 0,
      winBonus: 0,
      rankedWinBonus: 0
    },
    {
      id: `${program.id}:${season}:home-crowd`,
      sponsorName: name(CROWD_SPONSORS, "home-crowd"),
      strategy: "HOME_CROWD",
      weeklyPayment: roundTo(market * 0.65, 5_000),
      homeAttendanceTarget: SPONSOR_HOME_ATTENDANCE_TARGET,
      homeAttendanceBonus: roundTo(market * 1.35, 5_000),
      winBonus: 0,
      rankedWinBonus: 0
    },
    {
      id: `${program.id}:${season}:winning`,
      sponsorName: name(WINNING_SPONSORS, "winning"),
      strategy: "WINNING",
      weeklyPayment: roundTo(market * 0.45, 5_000),
      homeAttendanceTarget: null,
      homeAttendanceBonus: 0,
      winBonus: roundTo(market * 0.75, 5_000),
      rankedWinBonus: roundTo(market * 0.9, 5_000)
    }
  ];
}

export function activeSponsorship(
  state: Readonly<GameState>,
  programId: string
): SponsorshipOffer | null {
  const sponsorship = state.sponsorships?.[programId];
  if (!sponsorship?.activeContractId) return null;
  return sponsorship.offers.find((offer) => offer.id === sponsorship.activeContractId) ?? null;
}

export interface SponsorshipProjection {
  remainingWeeks: number;
  remainingGames: number;
  remainingHomeGames: number;
  remainingRankedGames: number;
  guaranteedRemaining: number;
  maximumBonusRemaining: number;
  maximumRemaining: number;
}

/**
 * Posts the entire remaining contract range before it is signed. "Maximum"
 * assumes every still-available trigger is hit; the guarantee is money the
 * program receives even on a bye.
 */
export function projectSponsorshipOffer(
  state: Readonly<GameState>,
  programId: string,
  offer: Readonly<SponsorshipOffer>
): SponsorshipProjection {
  const firstPayingWeek = Math.max(1, state.week);
  const remainingWeeks = Math.max(0, 15 - firstPayingWeek);
  const remaining = state.schedule.filter((game) =>
    !game.played
    && game.week >= firstPayingWeek
    && (game.homeProgramId === programId || game.awayProgramId === programId)
  );
  const remainingHomeGames = remaining.filter((game) => game.homeProgramId === programId).length;
  const remainingRankedGames = remaining.filter((game) => {
    const opponentId = game.homeProgramId === programId ? game.awayProgramId : game.homeProgramId;
    return (state.programs[opponentId]?.nationalRank ?? 999) <= 25;
  }).length;
  const guaranteedRemaining = offer.weeklyPayment * remainingWeeks;
  const maximumBonusRemaining = offer.homeAttendanceBonus * remainingHomeGames
    + offer.winBonus * remaining.length
    // Rankings move. Any remaining opponent can still enter the top 25 before
    // kickoff, so the mathematical maximum has to count every remaining game.
    + offer.rankedWinBonus * remaining.length;
  return {
    remainingWeeks,
    remainingGames: remaining.length,
    remainingHomeGames,
    remainingRankedGames,
    guaranteedRemaining,
    maximumBonusRemaining,
    maximumRemaining: guaranteedRemaining + maximumBonusRemaining
  };
}

export interface SponsorshipPayment {
  basePayment: number;
  homeAttendanceBonus: number;
  winBonus: number;
  rankedWinBonus: number;
  total: number;
}

/** Resolves only the triggers stated on the contract card. */
export function sponsorshipPayment(
  offer: Readonly<SponsorshipOffer> | null,
  result: "WIN" | "LOSS" | "BYE",
  homeGame: boolean,
  attendance: number,
  capacity: number,
  opponentRank: number | null
): SponsorshipPayment {
  if (!offer) {
    return { basePayment: 0, homeAttendanceBonus: 0, winBonus: 0, rankedWinBonus: 0, total: 0 };
  }
  const homeAttendanceBonus = homeGame
    && offer.homeAttendanceTarget !== null
    && capacity > 0
    && attendance / capacity >= offer.homeAttendanceTarget
    ? offer.homeAttendanceBonus
    : 0;
  const winBonus = result === "WIN" ? offer.winBonus : 0;
  const rankedWinBonus = result === "WIN" && opponentRank !== null && opponentRank <= 25
    ? offer.rankedWinBonus
    : 0;
  const total = offer.weeklyPayment + homeAttendanceBonus + winBonus + rankedWinBonus;
  return {
    basePayment: offer.weeklyPayment,
    homeAttendanceBonus,
    winBonus,
    rankedWinBonus,
    total
  };
}

export function createSponsorshipProgramState(
  program: Readonly<Program>,
  season: number
): SponsorshipProgramState {
  return { season, offers: createSponsorshipOffers(program, season), activeContractId: null };
}

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
 * Where a rival prices its tickets, as a multiple of the fair price, from how
 * elastic its following is.
 *
 * The defect this closes: the rival planner issued sponsorship, booster and
 * facility commands and nothing else on the business side, so every one of the
 * seventy-one programs the player does not run priced at whatever it was
 * created with, for its entire existence — while pricing is measured elsewhere
 * in this file as worth about $5M a season. Rivals were leaving that on the
 * table and drifting insolvent for it.
 *
 * **A posture per cohort rather than a decision per week.** Fan elasticity takes
 * exactly five values, one per program character, so this is five postures
 * across seventy-two programs: one lookup a season instead of a weekly
 * optimisation, which is the whole reason it is affordable at league size.
 *
 * Deliberately narrower than the 0.86x-1.24x band the optimum actually spans.
 * A rival that prices perfectly makes the player's own pricing worth nothing
 * relative to the league, so rivals are competent rather than optimal and there
 * is room to beat them at both ends.
 */
export const RIVAL_PRICING_FLOOR = 0.90;
export const RIVAL_PRICING_CEILING = 1.18;
const ELASTICITY_RANGE = { low: 0.35, high: 1.6 } as const;

export function pricingPosture(fanElasticity: number): number {
  const span = ELASTICITY_RANGE.high - ELASTICITY_RANGE.low;
  const position = clamp((fanElasticity - ELASTICITY_RANGE.low) / span, 0, 1);
  return RIVAL_PRICING_CEILING - position * (RIVAL_PRICING_CEILING - RIVAL_PRICING_FLOOR);
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
    (right.fatigue - ratingByRole(right.position, right.ratings, "DURABILITY") * 0.4) - (left.fatigue - ratingByRole(left.position, left.ratings, "DURABILITY") * 0.4)
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
      (player) => `${Math.round(player.fatigue)} fatigue against ${Math.round(ratingByRole(player.position, player.ratings, "DURABILITY"))} durability. Conditioning work protects him.`)
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
