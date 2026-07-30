import type { GameState, OpponentDossier } from "@college-legends/model";
import { fairTicketPrice } from "./business.js";
import { MARQUEE_VALUE, WORTH_SCOUTING } from "./department.js";
import { coachSchemeFit } from "./scheme.js";
import { planExecution } from "./installation.js";

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
  /** DO_THIS is costing you something now. WORTH_A_LOOK is upside left on the table. */
  urgency: "DO_THIS" | "WORTH_A_LOOK";
  headline: string;
  detail: string;
  action: string;
  destination: BriefingDestination;
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
  board: readonly OpponentDossier[]
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
      urgency: "DO_THIS",
      headline: "The program has no primary sponsor",
      detail: `${safest.sponsorName} is offering $${safest.weeklyPayment.toLocaleString()} guaranteed every week. A week without a contract is money you cannot recover later.`,
      action: "Choose a sponsor",
      destination: "FINANCES"
    });
  }

  // Practice reps. The single biggest thing a coach can waste in a week.
  const reps = (preparation?.offensiveReps ?? 0) + (preparation?.defensiveReps ?? 0);
  if (opponent && reps === 0 && (preparation?.points ?? 0) > 0) {
    const offense = planExecution(state, programId, "OFFENSE");
    items.push({
      id: "PRACTICE",
      urgency: "DO_THIS",
      headline: "Your team hasn't practised the game plan",
      detail: `${preparation?.points ?? 0} prep points are sitting unused and only ${Math.round(offense.low * 100)}–${Math.round(offense.high * 100)}% of your offense will hold up Saturday. Reps are the cheapest win available.`,
      action: "Run practice",
      destination: "WEEK_PRACTICE"
    });
  }

  // A file on this week's opponent, or on the game that actually matters.
  if (thisWeek && thisWeek.tiers.length === 0 && (preparation?.scoutingPoints ?? 0) > 0) {
    items.push({
      id: "SCOUT_THIS_WEEK",
      urgency: "DO_THIS",
      headline: `You know nothing about ${opponent?.name ?? "Saturday's opponent"}`,
      detail: `You have ${preparation?.scoutingPoints} scouting points and an empty file. Six of them tells you what they run.`,
      action: "Open a file",
      destination: "WEEK_SCOUTING"
    });
  }
  const bigGame = board.find((dossier) =>
    dossier.week > state.week && dossier.value >= MARQUEE_VALUE && dossier.points < 18);
  if (bigGame && (preparation?.scoutingPoints ?? 0) > 0) {
    const them = state.programs[bigGame.opponentProgramId];
    items.push({
      id: "SCOUT_AHEAD",
      urgency: "WORTH_A_LOOK",
      headline: `${them?.name ?? "A ranked opponent"} in week ${bigGame.week} is the game of your season`,
      detail: `${bigGame.valueNote} You can start the file now — a week's points won't cover it on their own.`,
      action: "Start the file",
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
      urgency: "DO_THIS",
      headline: `${member.name} doesn't coach what you're running`,
      detail: `He installs about ${Math.round((1 - fit) * 100)}% less of it than a coach who knows the scheme. Replace him, or change what you run.`,
      action: "Look at the staff",
      destination: "STAFF"
    });
  }

  // Recruiting points expire every week.
  const recruitingPoints = state.recruiting[programId]?.points ?? 0;
  if (recruitingPoints >= 25) {
    items.push({
      id: "RECRUITING",
      urgency: "WORTH_A_LOOK",
      headline: `${recruitingPoints} recruiting points are going to waste`,
      detail: "They reset every week. Spend them finding players or chasing the ones you've found.",
      action: "Work the phones",
      destination: "RECRUITING"
    });
  }

  // Nobody being coached up.
  if (!state.developmentSpotlights?.[programId]) {
    items.push({
      id: "DEVELOPMENT",
      urgency: "WORTH_A_LOOK",
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
      urgency: "WORTH_A_LOOK",
      headline: "You're charging well under what this program can get",
      detail: `Tickets are $${program.ticketPrice} and comparable programs get about $${fair}. You're leaving money on the table every home date.`,
      action: "Set the price",
      destination: "WEEK_DECISIONS"
    });
  } else if (program.ticketPrice > fair * 1.25) {
    items.push({
      id: "TICKET_PRICE",
      urgency: "DO_THIS",
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
      urgency: "DO_THIS",
      headline: "The program is in the red",
      detail: `You're at ${program.budget < -1_000_000 ? `-$${(Math.abs(program.budget) / 1_000_000).toFixed(1)}M` : `-$${Math.round(Math.abs(program.budget) / 1000)}K`}. Athletic directors notice this before they notice your record.`,
      action: "Check the books",
      destination: "FINANCES"
    });
  }

  const order = { DO_THIS: 0, WORTH_A_LOOK: 1 };
  return items.sort((left, right) => order[left.urgency] - order[right.urgency]).slice(0, 6);
}

/** Fixtures worth knowing about, for the "what's coming" strip. */
export function scheduleAhead(board: readonly OpponentDossier[]): OpponentDossier[] {
  return board.filter((dossier) => dossier.value >= WORTH_SCOUTING).slice(0, 4);
}
