import type {
  BoosterKind,
  BoosterOffer,
  BoosterOption,
  GameState,
  Player,
  Position,
  Program
} from "@college-legends/model";
import { fictionalPersonName } from "@college-legends/content";
import type { AddressableRng } from "./rng.js";
import { MAXIMUM_WEEKLY_ADVERTISING } from "./business.js";
import { attributesFor, computeOverall } from "./attributes.js";

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

/**
 * Somebody outside the building turns up every third week with an offer.
 *
 * Three is deliberate: often enough that a season holds four of them and the
 * player learns the shape, rare enough that each one is an occasion rather than
 * another weekly chore. It deliberately does not line up with the week screen —
 * this is something that happens *to* the program rather than something the
 * staff is spending.
 */
export const BOOSTER_INTERVAL = 3;

export function boosterDueThisWeek(week: number): boolean {
  return week > 0 && week <= 14 && week % BOOSTER_INTERVAL === 0;
}

/** The offensive rooms a returning legend might work with. */
export const LEGEND_POSITIONS: readonly Position[] = ["QB", "RB", "WR", "TE"];

export const POSITION_ROOM_LABELS: Readonly<Record<string, string>> = {
  QB: "quarterbacks",
  RB: "running backs",
  WR: "receivers",
  TE: "tight ends"
};

/** What a legend's week is worth to every man in his room, in Overall. */
export const LEGEND_OVERALL_GAIN = 1.2;

/** How much likelier a takeaway becomes in the one game a legend prepares for. */
export const TAKEAWAY_BOOST = 1.25;

const BUSINESS_SUFFIXES = [
  "Motors", "Hardware", "Bank & Trust", "Steakhouse", "Ford", "Insurance",
  "Realty", "Tire & Auto", "Supply Co.", "Bar-B-Q", "Chevrolet", "Feed & Grain"
] as const;

function businessName(program: Readonly<Program>, roll: number, ordinal: number): string {
  // Two independent draws, or every business in a program's career ends up
  // belonging to the same family.
  const surname = fictionalPersonName(ordinal + Math.floor(roll * 9_973)).split(" ")[1] ?? program.city;
  const suffix = BUSINESS_SUFFIXES[
    Math.floor(clamp((roll * 37) % 1, 0, 0.9999) * BUSINESS_SUFFIXES.length)
  ]!;
  return `${surname}'s ${suffix}`;
}

const money = (value: number): string =>
  value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : `$${Math.round(value / 1_000) * 1_000 / 1_000}K`;

/**
 * Builds the four people on the table.
 *
 * Every chance is a function of the program rather than a flat roll, which is
 * what makes this a system the player can move rather than a lottery: donor
 * culture carries the cheque, standing brings the legends back, and a program
 * the town actually follows gets the free advertising. A weak program still
 * sees all four — it just converts fewer of them, which is the right shape for
 * a game that starts you somewhere bad.
 *
 * The four sit on a deliberate risk ladder, because four options at the same
 * odds is a menu rather than a decision. Roughly, at a mid-tier program:
 *
 * | | odds | what it pays |
 * |---|---|---|
 * | local business | 65–80% | small, and only if the next game is at home |
 * | defensive legend | 45–60% | one Saturday |
 * | donor | 35–55% | the biggest single number on the table |
 * | offensive legend | 30–45% | the only permanent one |
 *
 * The permanent reward is the longest odds on purpose: a roster that keeps the
 * points is worth more than a cheque you spend once.
 */
export function buildBoosterOffer(
  state: Readonly<GameState>,
  programId: string,
  rng: AddressableRng
): BoosterOffer | null {
  const program = state.programs[programId];
  if (!program) return null;
  const seed = `${state.season}:${state.week}:${programId}`;
  const ordinal = Math.floor(rng.at(`${seed}:names`) * 100_000);

  // A donor's cheque is priced off what the program earns in a week, so it is
  // meaningful at every tier without being authored per tier.
  const amount = Math.round(
    program.weeklyRevenue * (1.5 + rng.at(`${seed}:donor-size`) * 2.5) * clamp(program.donorCulture, 0.5, 2)
    / 50_000
  ) * 50_000;

  const position = LEGEND_POSITIONS[
    Math.floor(clamp(rng.at(`${seed}:legend-room`), 0, 0.9999) * LEGEND_POSITIONS.length)
  ]!;

  const donor = fictionalPersonName(ordinal);
  const offensiveLegend = fictionalPersonName(ordinal + 1_237);
  const defensiveLegend = fictionalPersonName(ordinal + 4_811);
  const business = businessName(program, rng.at(`${seed}:business`), ordinal);

  const options: BoosterOption[] = [
    {
      id: `${seed}:donor`,
      kind: "DONOR",
      name: donor,
      headline: "A wealthy donor wants to write a cheque.",
      reward: `${money(amount)} straight into the budget`,
      note: program.donorCulture >= 1.15
        ? "This is a program whose people give. He is good for it."
        : program.donorCulture <= 0.85
          ? "Money has never come easily here."
          : "He has given before, in smaller amounts.",
      chance: Math.round(clamp(
        26 + (program.donorCulture - 1) * 55 + program.prestige * 0.2 + program.championships * 2,
        12, 72
      )),
      amount
    },
    {
      id: `${seed}:legend-offense`,
      kind: "POSITION_LEGEND",
      name: offensiveLegend,
      headline: `A former ${POSITION_ROOM_LABELS[position]!.replace(/s$/, "")} wants to work with your room.`,
      reward: `+${LEGEND_OVERALL_GAIN.toFixed(1)} Overall for every one of your ${POSITION_ROOM_LABELS[position]}`,
      note: "He played here. Whether he still picks up the phone is another matter.",
      chance: Math.round(clamp(18 + program.prestige * 0.44 + program.nationalPress * 0.12, 10, 62)),
      position
    },
    {
      id: `${seed}:business`,
      kind: "LOCAL_BUSINESS",
      name: business,
      headline: "A local business will paper the town for you.",
      reward: `${money(MAXIMUM_WEEKLY_ADVERTISING * 0.6)} of advertising on your next home game, free`,
      note: "Small, reliable, and it only pays if the next game is at home.",
      chance: Math.round(clamp(58 + program.localPress * 0.24 + program.fanSupport * 0.14, 40, 94))
    },
    {
      id: `${seed}:legend-defense`,
      kind: "TURNOVER_LEGEND",
      name: defensiveLegend,
      headline: "A defensive great wants a week with your secondary.",
      reward: `+${Math.round((TAKEAWAY_BOOST - 1) * 100)}% takeaways in your next game`,
      note: "One game only, and only if there is a game to play.",
      chance: Math.round(clamp(34 + program.prestige * 0.34 + program.fanSupport * 0.1, 20, 76))
    }
  ];

  return { season: state.season, week: state.week, options, chosenOptionId: null, succeeded: null };
}

export interface BoosterResolution {
  succeeded: boolean;
  outcome: string;
  playerIds: string[];
}

/**
 * Applies a taken offer. The roll is drawn from the addressable RNG on a path
 * that depends only on the season, week, program and option, so the same career
 * replayed makes the same offer and gets the same answer — a booster can never
 * be re-rolled by reloading.
 */
export function applyBooster(
  state: GameState,
  programId: string,
  option: BoosterOption,
  rng: AddressableRng
): BoosterResolution {
  const program = state.programs[programId];
  if (!program) return { succeeded: false, outcome: "", playerIds: [] };

  const roll = rng.at(`${option.id}:outcome`);
  if (roll * 100 >= option.chance) return { succeeded: false, outcome: "", playerIds: [] };

  state.boosters[programId] ??= { offer: null, advertisingCredit: 0, takeawayBoostWeek: null };
  const boosters = state.boosters[programId]!;

  if (option.kind === "DONOR") {
    const amount = option.amount ?? 0;
    program.budget += amount;
    return {
      succeeded: true,
      outcome: `${option.name} gave ${money(amount)}.`,
      playerIds: []
    };
  }

  if (option.kind === "POSITION_LEGEND") {
    const room = Object.values(state.players)
      .filter((player): player is Player =>
        player.programId === programId
        && player.position === option.position
        && player.eligibility.rosterStatus === "SCHOLARSHIP")
      .sort((left, right) => left.id.localeCompare(right.id));
    for (const player of room) {
      // Overall is derived from the attributes, so the gain has to land on them.
      // Adding the same amount to every attribute moves Overall by exactly that
      // amount, because the position's weights sum to one.
      const headroom = Math.max(0, player.potential - player.overall);
      const gain = Math.min(LEGEND_OVERALL_GAIN, headroom);
      if (gain <= 0) continue;
      for (const attribute of attributesFor(player.position)) {
        player.ratings[attribute.key] = clamp(
          Number(((player.ratings[attribute.key] ?? 50) + gain).toFixed(3)), 32, 99
        );
      }
      player.overall = clamp(computeOverall(player.position, player.ratings), 32, player.potential);
    }
    return {
      succeeded: true,
      outcome: `${option.name} spent the week with the ${POSITION_ROOM_LABELS[option.position ?? "QB"]}.`,
      playerIds: room.map((player) => player.id)
    };
  }

  if (option.kind === "LOCAL_BUSINESS") {
    const credit = Math.round(MAXIMUM_WEEKLY_ADVERTISING * 0.6);
    boosters.advertisingCredit += credit;
    return {
      succeeded: true,
      outcome: `${option.name} is running your next home game's advertising.`,
      playerIds: []
    };
  }

  boosters.takeawayBoostWeek = state.week;
  return {
    succeeded: true,
    outcome: `${option.name} has your defense hunting the ball this week.`,
    playerIds: []
  };
}

/** The takeaway multiplier in force for this program's game this week. */
export function takeawayMultiplier(state: Readonly<GameState>, programId: string): number {
  return state.boosters?.[programId]?.takeawayBoostWeek === state.week ? TAKEAWAY_BOOST : 1;
}

/** Advertising a business has already paid for, spent at the next home game. */
export function advertisingCredit(state: Readonly<GameState>, programId: string): number {
  return state.boosters?.[programId]?.advertisingCredit ?? 0;
}

/** The offer waiting on the player, if there is one they have not answered. */
export function pendingBoosterOffer(state: Readonly<GameState>, programId: string): BoosterOffer | null {
  const offer = state.boosters?.[programId]?.offer ?? null;
  return offer && offer.chosenOptionId === null ? offer : null;
}

/** The most recent offer, answered or not, for the screen that reports it. */
export function latestBoosterOffer(state: Readonly<GameState>, programId: string): BoosterOffer | null {
  return state.boosters?.[programId]?.offer ?? null;
}

export const BOOSTER_KIND_LABELS: Readonly<Record<BoosterKind, string>> = {
  DONOR: "Wealthy donor",
  POSITION_LEGEND: "Former legend",
  LOCAL_BUSINESS: "Local business",
  TURNOVER_LEGEND: "Former legend"
};
