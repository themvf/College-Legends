import type { DecisionStatus, GameState, OpponentDossier } from "@college-legends/model";
import { fairTicketPrice } from "./business.js";
import { DOSSIER_THRESHOLDS, MARQUEE_VALUE, WORTH_SCOUTING } from "./department.js";
import { activeFocuses, focusCapacity, scoutingTargetFor, weekPriorities } from "./priorities.js";
import { coachSchemeFit } from "./scheme.js";
import { expectedWins } from "./tenure.js";

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
  // is in trouble; a bottom-tier program that does it gets an extension. Shared
  // with the board review, so the target stated here is the target graded there.
  const target = expectedWins(program.tier);
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
 * The last week a commitment can still join this class. The rollover fires once
 * the week passes 14 and takes everyone committed or signed up to that point,
 * so this is that boundary — not `SIGNING_WEEK`, which only decides when a
 * verbal stops being contestable.
 */
export const RECRUITING_CLASS_CLOSES = 14;

/**
 * Commitments a week a program can still land when it is genuinely chasing.
 *
 * Deliberately well above the rate a healthy class actually runs at — measured
 * on a competently recruited season, the shortfall goes 21 → 14 → 8 → 6 and
 * lands at 3, which is about 1.4 a week and 1.7 down the stretch. The number
 * here is the *ceiling*, not the norm, because it decides when the briefing
 * stops calling a class slow and starts calling it broken, and a warning that
 * fires on a program doing fine is a warning players learn to scroll past.
 */
export const CLASS_RECOVERY_RATE = 3;

/**
 * Below this, an unfilled roster is just a roster. Nobody runs at exactly the
 * limit — a competently recruited class lands 3 short — so escalating on the
 * rate alone turned the last two weeks of a perfectly good season into a
 * REQUIRED item about five empty scholarships nobody needed to care about.
 */
export const MATERIAL_SHORTFALL = 8;

export interface RosterOutlook {
  /** Scholarship players on the roster today. */
  onRoster: number;
  scholarshipLimit: number;
  /** Out of eligibility when this season ends. They are gone whatever you do. */
  leaving: number;
  /** Prospects committed or signed, both of which the rollover takes. */
  incoming: number;
  /** What the roster projects to be on the first day of next season. */
  projected: number;
  /** How far under the limit that lands. Zero when the class covers the losses. */
  shortfall: number;
  /** Playing weeks left to add to the class before it closes. */
  weeksLeft: number;
  /** Commitments a week needed from here to close the gap. */
  paceNeeded: number;
}

/**
 * What the roster looks like next August, stated in players.
 *
 * A cold player finished a season with 85 men, went through the offseason, and
 * came out with 71 — and nothing had warned them. The one recruiting item the
 * briefing carried all year said "120 recruiting points are sitting unspent",
 * which is a complaint about a resource; the consequence is that a quarter of
 * the roster leaves every season and has to be replaced. That is the single
 * thing this game never told anybody, and it is the difference between the week
 * and the program.
 *
 * Shared by the briefing and the recruiting screen so the warning and the board
 * cannot state different numbers.
 */
export function rosterOutlook(state: Readonly<GameState>, programId: string): RosterOutlook | null {
  const program = state.programs[programId];
  if (!program) return null;
  let onRoster = 0;
  let leaving = 0;
  for (const player of Object.values(state.players)) {
    if (player.programId !== programId) continue;
    if (player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    onRoster += 1;
    if (player.eligibility.seasonsRemaining <= 1) leaving += 1;
  }
  let incoming = 0;
  for (const prospect of Object.values(state.prospects)) {
    if (prospect.signedProgramId !== programId) continue;
    // Both, because the rollover takes both — a commitment turns into a
    // signature in the signing week and must not drop out of the projection
    // the moment it becomes more certain rather than less.
    if (prospect.status === "COMMITTED" || prospect.status === "SIGNED") incoming += 1;
  }
  const projected = onRoster - leaving + incoming;
  const shortfall = Math.max(0, program.scholarshipLimit - projected);
  const weeksLeft = Math.max(0, RECRUITING_CLASS_CLOSES - state.week);
  return {
    onRoster,
    scholarshipLimit: program.scholarshipLimit,
    leaving,
    incoming,
    projected,
    shortfall,
    weeksLeft,
    paceNeeded: weeksLeft > 0 ? shortfall / weeksLeft : shortfall
  };
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

  // The roster next August, not the points in the drawer.
  //
  // This item used to read "120 recruiting points are sitting unspent", which
  // is a complaint about a resource. A cold player read it all season, spent
  // nothing, and arrived at signing day with 64 players and no idea it had been
  // coming — the one place in a season where they were genuinely ambushed. What
  // the briefing has to say is the consequence: this many leave, this many are
  // coming, and here is where that lands you against the limit.
  const recruitingPoints = state.recruiting[programId]?.points ?? 0;
  const outlook = rosterOutlook(state, programId);
  if (outlook && outlook.shortfall > 0) {
    // Required once the weeks left can no longer close the gap at any rate a
    // program actually recruits at. A 21-man hole in week one is what every
    // season looks like — nobody has committed to anybody yet — so the row
    // starts as information and becomes an instruction only when it is too
    // late to fix by drifting.
    //
    // Measured either side: a competently recruited class never trips it, and a
    // program that has signed nobody trips it in week eight, with six weeks
    // still left to do something about it. An earlier rule fired only in week
    // thirteen, which is a warning that arrives after the decision.
    const behind = outlook.shortfall >= MATERIAL_SHORTFALL
      && outlook.shortfall > outlook.weeksLeft * CLASS_RECOVERY_RATE;
    items.push({
      id: "RECRUITING",
      status: behind ? "REQUIRED" : "OPTIONAL",
      headline: outlook.weeksLeft > 0
        ? `Next year's roster is ${outlook.shortfall} short`
        : `You're going into next season ${outlook.shortfall} players short`,
      detail: [
        `${outlook.leaving} of your ${outlook.onRoster} are out of eligibility after this year`,
        outlook.incoming > 0
          ? `and ${outlook.incoming} ${outlook.incoming === 1 ? "is" : "are"} coming in, which lands you at ${outlook.projected} of ${outlook.scholarshipLimit}.`
          : `and nobody is coming in yet, which lands you at ${outlook.projected} of ${outlook.scholarshipLimit}.`,
        outlook.weeksLeft > 0
          ? `The class closes with the season — ${outlook.weeksLeft} ${outlook.weeksLeft === 1 ? "week" : "weeks"} left${recruitingPoints > 0 ? `, and you're holding ${recruitingPoints} recruiting points` : ""}.`
          : "The class is closed. These slots stay empty until next year."
      ].join(" "),
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
