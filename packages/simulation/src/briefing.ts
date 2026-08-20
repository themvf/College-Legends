import type { DecisionStatus, GameState, OpponentDossier } from "@college-legends/model";
import { fairTicketPrice } from "./business.js";
import { DOSSIER_THRESHOLDS, MARQUEE_VALUE, WORTH_SCOUTING } from "./department.js";
import { activeFocuses, focusCapacity, scoutingTargetFor, weekPriorities } from "./priorities.js";
import { coachSchemeFit } from "./scheme.js";

/**
 * Where a briefing item sends the player. The UI maps these to screens; keeping
 * them as data means the engine decides what matters and the UI only decides
 * how it looks.
 */
export type BriefingDestination =
  | "WEEK_DECISIONS"
  | "WEEK_SCOUTING"
  | "WEEK_PRACTICE"
  | "WEEK_GAMEPLAN"
  | "STAFF"
  | "RECRUITING"
  | "FINANCES"
  | "DEVELOPMENT";

export interface BriefingItem {
  id: string;
  /** Canonical unresolved lifecycle state shared with every decision surface. */
  status: Extract<DecisionStatus, "REQUIRED" | "OPTIONAL">;
  headline: string;
  detail: string;
  action: string;
  destination: BriefingDestination;
}

export interface BriefingOptions {
  /** A migrated lifecycle surface owns weekly priorities and must be removed before the display cap. */
  excludeWeeklyPriorities?: boolean;
}

export interface SeasonExpectation {
  /** Wins the athletic director is looking for. */
  target: number;
  wins: number;
  losses: number;
  gamesLeft: number;
  /** Plain sentence about where the program stands against that. */
  standing: string;
  onTrack: boolean;
  /** 0–100. Falls when the program misses expectations. */
  jobSecurity: number;
}

/**
 * What the athletic director is expecting this year.
 *
 * The engine has carried `coachSecurity` and `championshipDeadline` since the
 * beginning and never once showed them to the player, so a season had no stated
 * point. A number nobody states is a number nobody plays toward.
 */
export function seasonExpectation(state: Readonly<GameState>, programId: string): SeasonExpectation | null {
  const program = state.programs[programId];
  if (!program) return null;
  const played = program.wins + program.losses;
  const total = state.schedule.filter((game) =>
    game.homeProgramId === programId || game.awayProgramId === programId).length;
  const gamesLeft = Math.max(0, total - played);
  // What a job of this standing is expected to do. A blueblood that goes 7-5
  // is in trouble; a bottom-tier program that does it gets an extension.
  const target = program.tier === "POWER" ? 10 : program.tier === "MID" ? 7 : 5;
  const pace = played > 0 ? program.wins / played : 0;
  const projected = Math.round(pace * total);
  const onTrack = program.wins + gamesLeft >= target;

  const standing = played === 0
    ? `Nobody's played a game yet. ${target} wins keeps everybody happy.`
    : program.wins >= target
      ? `You're there. ${program.wins}–${program.losses} with ${gamesLeft} to play — everything from here is gravy.`
      : !onTrack
        ? `${program.wins}–${program.losses}. You can't get to ${target} anymore. Start building the case for next year.`
        : played < 3
          ? `${program.wins}–${program.losses}. You need ${target - program.wins} more wins from ${gamesLeft} games.`
          : `${program.wins}–${program.losses}, on pace for about ${projected}. You need ${target - program.wins} more from ${gamesLeft}.`;

  return { target, wins: program.wins, losses: program.losses, gamesLeft, standing, onTrack, jobSecurity: program.coachSecurity };
}

/**
 * What actually needs the coach this week, in priority order.
 *
 * The dashboard used to be six panels of status and no direction — the player
 * had to hold the whole system in their head to work out what was being wasted.
 * This is the answer to "what do I do now", which is the only question a
 * management game has to answer on its first screen.
 */
export function weeklyBriefing(
  state: Readonly<GameState>,
  programId: string,
  board: readonly OpponentDossier[],
  options: BriefingOptions = {}
): BriefingItem[] {
  const program = state.programs[programId];
  if (!program) return [];
  const items: BriefingItem[] = [];
  const preparation = state.preparation?.[programId];
  const thisWeek = board.find((dossier) => dossier.week === state.week);
  const opponent = thisWeek ? state.programs[thisWeek.opponentProgramId] : null;

  // A week without a sponsor is revenue that cannot be recovered later.
  const sponsorship = state.sponsorships?.[programId];
  if (sponsorship && !sponsorship.activeContractId && sponsorship.offers.length > 0) {
    const safest = sponsorship.offers.reduce((best, offer) =>
      offer.weeklyPayment > best.weeklyPayment ? offer : best);
    items.push({
      id: "SPONSORSHIP",
      status: "REQUIRED",
      headline: "The program has no primary sponsor",
      detail: `${safest.sponsorName} is offering $${safest.weeklyPayment.toLocaleString()} guaranteed every week. A week without a contract is money you cannot recover later.`,
      action: "Choose a sponsor",
      destination: "FINANCES"
    });
  }

  // An unused priority. Hours never bank, so a slot nobody claimed is a week
  // the staff spent on nothing in particular.
  const capacity = focusCapacity(state, programId);
  const chosen = activeFocuses(state, programId);
  if (chosen.length < capacity.capacity) {
    items.push({
      id: "WEEK_FOCUS",
      status: "REQUIRED",
      headline: `Your staff has ${capacity.capacity - chosen.length} priorit${capacity.capacity - chosen.length === 1 ? "y" : "ies"} nobody has claimed`,
      detail: "A week your coaches don't put behind something is a week they spend on nothing in particular. Nothing banks.",
      action: "Set the week",
      destination: "WEEK_PRACTICE"
    });
  }

  // The card that is worth the most this week and is not being chased. This is
  // the whole point of standing priorities: they carry over, and the game tells
  // you when the situation has moved out from under them.
  const priorities = weekPriorities(state, programId);
  const missed = priorities
    .filter((card) => !card.chosen && !card.blocked && card.stakes >= 65)
    .sort((left, right) => right.stakes - left.stakes)[0];
  if (missed && chosen.length >= capacity.capacity) {
    items.push({
      id: `WEEK_FOCUS:${missed.focus}`,
      status: "OPTIONAL",
      headline: `"${missed.label}" looks worth more this week than what you're chasing`,
      detail: `${missed.stakesNote} Left alone: ${missed.baseline}. Chased: ${missed.focused}.`,
      action: "Change the week",
      destination: "WEEK_PRACTICE"
    });
  }

  // A file on the game that actually matters. Points flow onto one opponent
  // automatically now, so the decision is which one — never how many.
  const bigGame = board.find((dossier) =>
    dossier.week > state.week && dossier.value >= MARQUEE_VALUE
    && dossier.points < DOSSIER_THRESHOLDS.PERSONNEL);
  const target = scoutingTargetFor(state, programId);
  if (bigGame && target !== bigGame.opponentProgramId) {
    const them = state.programs[bigGame.opponentProgramId];
    items.push({
      id: "SCOUT_AHEAD",
      status: "OPTIONAL",
      headline: `${them?.name ?? "A ranked opponent"} in week ${bigGame.week} is the game of your season`,
      detail: `${bigGame.valueNote} One week of film won't cover it — point the department at them now or arrive with half a file.`,
      action: "Move the film room",
      destination: "WEEK_SCOUTING"
    });
  }
  if (thisWeek && thisWeek.tiers.length === 0 && !bigGame) {
    items.push({
      id: "SCOUT_THIS_WEEK",
      status: "REQUIRED",
      headline: `You know nothing about ${opponent?.name ?? "Saturday's opponent"}`,
      detail: "Your film room has an empty file on the team you play in five days, and your guys go in cold.",
      action: "Open a file",
      destination: "WEEK_SCOUTING"
    });
  }

  // A coordinator running somebody else's scheme.
  for (const member of Object.values(state.staff)) {
    if (member.programId !== programId) continue;
    if (member.role !== "OFFENSIVE_COORDINATOR" && member.role !== "DEFENSIVE_COORDINATOR") continue;
    const fit = coachSchemeFit(member, program.schemeIdentity);
    if (fit >= 0.78) continue;
    items.push({
      id: `SCHEME_FIT:${member.id}`,
      status: "REQUIRED",
      headline: `${member.name} doesn't coach what you're running`,
      detail: `He installs about ${Math.round((1 - fit) * 100)}% less of it than a coach who knows the scheme. Replace him, or change what you run.`,
      action: "Look at the staff",
      destination: "STAFF"
    });
  }

  // A large idle recruiting balance. Points bank week to week — the old copy
  // said they reset, which the recruiting screen visibly contradicted — but a
  // pile nobody is spending still signs nobody, and the class closes at
  // season's end.
  const recruitingPoints = state.recruiting[programId]?.points ?? 0;
  if (recruitingPoints >= 25) {
    items.push({
      id: "RECRUITING",
      status: "OPTIONAL",
      headline: `${recruitingPoints} recruiting points are sitting unspent`,
      detail: "They bank week to week, but the class signs during the season — points still idle at the end sign nobody. Spend them finding players or chasing the ones you've found.",
      action: "Work the phones",
      destination: "RECRUITING"
    });
  }

  // Nobody being coached up.
  if (!state.developmentSpotlights?.[programId]) {
    items.push({
      id: "DEVELOPMENT",
      status: "OPTIONAL",
      headline: "Nobody is getting extra coaching this week",
      detail: "One player gets your staff's attention every week. Skipping it is a week of growth you don't get back.",
      action: "Pick somebody",
      destination: "WEEK_DECISIONS"
    });
  }

  // Money left on the table at the gate.
  const fair = fairTicketPrice(program, opponent ?? null, false);
  if (program.ticketPrice < fair * 0.8) {
    items.push({
      id: "TICKET_PRICE",
      status: "OPTIONAL",
      headline: "You're charging well under what this program can get",
      detail: `Tickets are $${program.ticketPrice} and comparable programs get about $${fair}. You're leaving money on the table every home date.`,
      action: "Set the price",
      destination: "WEEK_DECISIONS"
    });
  } else if (program.ticketPrice > fair * 1.25) {
    items.push({
      id: "TICKET_PRICE",
      status: "REQUIRED",
      headline: "You're pricing your own fans out",
      detail: `Tickets are $${program.ticketPrice} against a fair price of about $${fair}. Seats go empty and people stop following the program.`,
      action: "Set the price",
      destination: "WEEK_DECISIONS"
    });
  }

  // Cash.
  if (program.budget < 0) {
    items.push({
      id: "BUDGET",
      status: "REQUIRED",
      headline: "The program is in the red",
      detail: `You're at ${program.budget < -1_000_000 ? `-$${(Math.abs(program.budget) / 1_000_000).toFixed(1)}M` : `-$${Math.round(Math.abs(program.budget) / 1000)}K`}. Athletic directors notice this before they notice your record.`,
      action: "Check the books",
      destination: "FINANCES"
    });
  }

  const order: Record<BriefingItem["status"], number> = { REQUIRED: 0, OPTIONAL: 1 };
  const visible = options.excludeWeeklyPriorities
    ? items.filter((item) => item.id !== "WEEK_FOCUS" && !item.id.startsWith("WEEK_FOCUS:"))
    : items;
  return visible.sort((left, right) => order[left.status] - order[right.status]).slice(0, 6);
}

/** Fixtures worth knowing about, for the "what's coming" strip. */
export function scheduleAhead(board: readonly OpponentDossier[]): OpponentDossier[] {
  return board.filter((dossier) => dossier.value >= WORTH_SCOUTING).slice(0, 4);
}
