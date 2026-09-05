import type {
  FocusCapacity,
  GameState,
  Player,
  StaffAllocation,
  StaffFocus,
  StaffMember,
  StaffRole,
  WeekFocus,
  WeekPriority
} from "@college-legends/model";
import {
  RECRUITING_BASE_POINTS,
  RECRUITING_PER_CONTRIBUTION,
  RECRUITING_PER_FACILITY,
  MARQUEE_VALUE,
  WORTH_SCOUTING,
  emptyAllocation,
  FULL_FILE_READINESS,
  focusWeight,
  opponentValue,
  scoutingReadiness,
  staffCapacity,
  weeklyScoutingOutput
} from "./department.js";
import { MAXIMUM_REPS_PER_SIDE, planExecution } from "./installation.js";
import { MAXIMUM_PRACTICE_HOURS } from "./scouting.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

export const WEEK_FOCUSES: readonly WeekFocus[] =
  ["INSTALL_OFFENSE", "INSTALL_DEFENSE", "SCOUT", "DEVELOP", "RECRUIT"];

export const WEEK_FOCUS_LABELS: Readonly<Record<WeekFocus, string>> = {
  INSTALL_OFFENSE: "Install the offense",
  INSTALL_DEFENSE: "Install the defense",
  SCOUT: "Scout the opponent",
  DEVELOP: "Coach a player up",
  RECRUIT: "Work the trail"
};

export const WEEK_FOCUS_BLURBS: Readonly<Record<WeekFocus, string>> = {
  INSTALL_OFFENSE: "A full week of offensive reps. Pays this Saturday and nowhere else.",
  INSTALL_DEFENSE: "A full week of defensive reps. Pays this Saturday and nowhere else.",
  SCOUT: "Film on a team you have to play. Pays on the Saturday you point it at.",
  DEVELOP: "Extra work with one man. Pays a little every week from here on.",
  RECRUIT: "Living rooms and phone calls. Pays next year."
};

/** Which post's week each priority mostly comes out of. */
const FOCUS_ROLE: Readonly<Record<WeekFocus, StaffRole | null>> = {
  INSTALL_OFFENSE: "OFFENSIVE_COORDINATOR",
  INSTALL_DEFENSE: "DEFENSIVE_COORDINATOR",
  SCOUT: null,
  DEVELOP: null,
  RECRUIT: null
};

/** The underlying job each priority spends hours on. */
const FOCUS_JOB: Readonly<Record<WeekFocus, StaffFocus>> = {
  INSTALL_OFFENSE: "PREPARE",
  INSTALL_DEFENSE: "PREPARE",
  SCOUT: "SCOUT",
  DEVELOP: "DEVELOP",
  RECRUIT: "RECRUIT"
};

export function isWeekFocus(value: unknown): value is WeekFocus {
  return typeof value === "string" && (WEEK_FOCUSES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* How many things a staff can chase                                          */
/* -------------------------------------------------------------------------- */

/**
 * How much staff a program actually has, on a rating scale.
 *
 * Weighted toward the head coach because he is the one whose week is
 * discretionary — the coordinators are largely committed to their own side of
 * the ball. An empty chair contributes nothing, which is what makes leaving one
 * empty a real and visible cost rather than a saving.
 */
const POWER_WEIGHT: Readonly<Record<StaffRole, number>> = {
  HEAD_COACH: 0.45,
  OFFENSIVE_COORDINATOR: 0.3,
  DEFENSIVE_COORDINATOR: 0.25,
  STRENGTH_COACH: 0
};

export function staffPower(state: Readonly<GameState>, programId: string): number {
  let power = 0;
  for (const member of Object.values(state.staff)) {
    if (member.programId !== programId) continue;
    power += member.rating * POWER_WEIGHT[member.role];
  }
  return Math.round(power);
}

/**
 * Staff power needed for a second and a third priority.
 *
 * Set against generated staff ratings, which run 64–75 at a low-tier program,
 * 71–82 at a mid, and 79–90 at a power. So a low-tier program opens chasing one
 * thing a week — that *is* what being a bad program feels like — a mid chases
 * two, and a power chases three. Every threshold is reachable by hiring, which
 * is the point: this is the bar that makes a hire visible on the screen the
 * player uses most.
 */
export const FOCUS_CAPACITY_THRESHOLDS: readonly number[] = [70, 80];
export const MAXIMUM_FOCUSES = FOCUS_CAPACITY_THRESHOLDS.length + 1;

export function focusCapacity(state: Readonly<GameState>, programId: string): FocusCapacity {
  const power = staffPower(state, programId);
  const capacity = 1 + FOCUS_CAPACITY_THRESHOLDS.filter((threshold) => power >= threshold).length;
  const nextAt = FOCUS_CAPACITY_THRESHOLDS.find((threshold) => power < threshold) ?? null;
  const note = nextAt === null
    ? `Staff rating ${power}. You can chase ${capacity} things a week — as many as anybody in the country.`
    : `Staff rating ${power}. You can chase ${capacity} thing${capacity === 1 ? "" : "s"} a week. Get to ${nextAt} and you can chase ${capacity + 1}.`;
  return { capacity, power, nextAt, note };
}

/** The focuses actually in force, trimmed to what the staff can carry. */
export function activeFocuses(state: Readonly<GameState>, programId: string): WeekFocus[] {
  const capacity = focusCapacity(state, programId).capacity;
  const stored = state.weekFocus?.[programId] ?? [];
  const seen = new Set<WeekFocus>();
  const kept: WeekFocus[] = [];
  for (const focus of stored) {
    if (!isWeekFocus(focus) || seen.has(focus)) continue;
    seen.add(focus);
    kept.push(focus);
    if (kept.length >= capacity) break;
  }
  return kept;
}

/** What a program chases when the player has never touched the screen. */
export function defaultFocuses(state: Readonly<GameState>, programId: string): WeekFocus[] {
  const capacity = focusCapacity(state, programId).capacity;
  return (["INSTALL_OFFENSE", "SCOUT", "INSTALL_DEFENSE"] as const).slice(0, capacity);
}

/* -------------------------------------------------------------------------- */
/* Hours follow from the priorities                                           */
/* -------------------------------------------------------------------------- */

/**
 * Share of the discretionary pool a focused job takes on top of its baseline.
 * The rest stays spread across everything else, because no bucket ever goes to
 * zero from neglect — that would make the week a maintenance chore, which is the
 * one thing a weekly screen must never be.
 */
export const SURGE_SHARE = 0.45;

const DISCRETIONARY_JOBS: readonly StaffFocus[] = ["SCOUT", "RECRUIT", "DEVELOP"];

const BASELINE_WEIGHT: Readonly<Record<string, number>> = { SCOUT: 0.3, RECRUIT: 0.42, DEVELOP: 0.28 };

function programStaff(state: Readonly<GameState>, programId: string): StaffMember[] {
  return Object.values(state.staff)
    .filter((member) => member.programId === programId && member.role !== "STRENGTH_COACH")
    .sort((left, right) => left.id.localeCompare(right.id));
}

function capacityOf(member: StaffMember): number {
  return staffCapacity(member.rating, member.trait);
}

/**
 * The hours a coordinator owes his own side of the ball no matter what else is
 * going on. A third of his week, which is what stops a focus somewhere else
 * leaving a side of the ball with nobody installing it. Deliberately just above
 * `planInstaller`'s handover threshold, so the head coach only ever covers a
 * genuinely empty chair rather than a busy week.
 */
function coordinatorFloor(member: StaffMember): number {
  return Math.max(1, Math.ceil(capacityOf(member) * 0.35));
}

export interface WeekHourPlan {
  totalHours: number;
  byFocus: Record<StaffFocus, number>;
  byStaff: Record<string, StaffAllocation>;
  /** Practice budget the PREPARE hours buy, after the weight room and the cap. */
  practiceHours: number;
  offensiveReps: number;
  defensiveReps: number;
}

/**
 * Turns "these are my priorities" into every coach's week.
 *
 * Coordinators own Saturday and the head coach owns everything else — that split
 * is what keeps "who runs my offense" a different question from "who works the
 * trail", and it is why a head coach who sits in no chair is still worth paying
 * for. A coordinator's own side runs at half his week by default and his whole
 * week when you make it a priority; what he does not spend there joins the head
 * coach's hours in the discretionary pool.
 */
export function planWeekHours(
  state: Readonly<GameState>,
  programId: string,
  focuses: readonly WeekFocus[]
): WeekHourPlan {
  const program = state.programs[programId];
  const staff = programStaff(state, programId);
  const chosen = new Set(focuses.filter(isWeekFocus));
  const byStaff: Record<string, StaffAllocation> = Object.fromEntries(
    staff.map((member) => [member.id, emptyAllocation()])
  );
  const spare = new Map<string, number>(staff.map((member) => [member.id, capacityOf(member)]));

  const headCoach = staff.find((member) => member.role === "HEAD_COACH");
  for (const side of ["OFFENSE", "DEFENSE"] as const) {
    const role: StaffRole = side === "OFFENSE" ? "OFFENSIVE_COORDINATOR" : "DEFENSIVE_COORDINATOR";
    const focus: WeekFocus = side === "OFFENSE" ? "INSTALL_OFFENSE" : "INSTALL_DEFENSE";
    const coordinator = staff.find((member) => member.role === role);
    if (coordinator) {
      const hours = chosen.has(focus) ? capacityOf(coordinator) : coordinatorFloor(coordinator);
      byStaff[coordinator.id]!.PREPARE = hours;
      spare.set(coordinator.id, capacityOf(coordinator) - hours);
      continue;
    }
    // An empty chair is not a free week. The head coach covers that side, worse
    // than a coordinator would, and those hours leave the discretionary pool.
    if (!headCoach) continue;
    const cover = Math.min(spare.get(headCoach.id) ?? 0, Math.ceil(capacityOf(headCoach) * (chosen.has(focus) ? 0.4 : 0.25)));
    byStaff[headCoach.id]!.PREPARE += cover;
    spare.set(headCoach.id, (spare.get(headCoach.id) ?? 0) - cover);
  }

  const discretionary = staff.reduce((total, member) => total + (spare.get(member.id) ?? 0), 0);
  const targets = discretionaryTargets(discretionary, chosen);

  // Hand each job to whoever on the remaining staff is worth the most at it, so
  // the trait and the role reach the outcome rather than living on a card.
  const order = [...DISCRETIONARY_JOBS]
    .sort((left, right) => Number(chosen.has(jobFocus(right))) - Number(chosen.has(jobFocus(left))) || targets[right] - targets[left]);
  for (const job of order) {
    let need = targets[job];
    if (need <= 0) continue;
    const ranked = [...staff].sort((left, right) =>
      focusWeight(right, job) - focusWeight(left, job) || left.id.localeCompare(right.id));
    for (const member of ranked) {
      if (need <= 0) break;
      const room = spare.get(member.id) ?? 0;
      if (room <= 0) continue;
      const take = Math.min(need, room);
      byStaff[member.id]![job] += take;
      spare.set(member.id, room - take);
      need -= take;
    }
  }

  const byFocus = emptyAllocation();
  let totalHours = 0;
  for (const member of staff) {
    totalHours += capacityOf(member);
    for (const job of ["PREPARE", "SCOUT", "RECRUIT", "DEVELOP", "RECOVER"] as const) {
      byFocus[job] += byStaff[member.id]![job];
    }
  }

  const training = program?.facilities.TRAINING ?? 1;
  const practiceHours = Math.round(clamp(
    byFocus.PREPARE * PRACTICE_PER_COACHING_HOUR * (0.85 + training * 0.05), 2, MAXIMUM_PRACTICE_HOURS
  ));
  const reps = repsSplit(practiceHours, chosen);

  return { totalHours, byFocus, byStaff, practiceHours, ...reps };
}

function jobFocus(job: StaffFocus): WeekFocus {
  return job === "SCOUT" ? "SCOUT" : job === "DEVELOP" ? "DEVELOP" : "RECRUIT";
}

/**
 * Splits the hours nobody owes to a side of the ball. Largest remainder, because
 * the pool has to stay whole: an hour that vanishes is an hour the player
 * believes he spent.
 */
function discretionaryTargets(pool: number, chosen: ReadonlySet<WeekFocus>): Record<StaffFocus, number> {
  const targets = emptyAllocation();
  if (pool <= 0) return targets;
  const focused = DISCRETIONARY_JOBS.filter((job) => chosen.has(jobFocus(job)));
  const surge = focused.length > 0 ? Math.round(pool * SURGE_SHARE) : 0;
  const base = pool - surge;

  let assigned = 0;
  const remainders = DISCRETIONARY_JOBS.map((job) => {
    const exact = base * BASELINE_WEIGHT[job]!;
    const whole = Math.floor(exact);
    targets[job] = whole;
    assigned += whole;
    return { job, remainder: exact - whole };
  }).sort((left, right) => right.remainder - left.remainder);
  for (let index = 0; assigned < base; index += 1, assigned += 1) {
    targets[remainders[index % remainders.length]!.job] += 1;
  }

  if (focused.length > 0) {
    const each = Math.floor(surge / focused.length);
    let left = surge - each * focused.length;
    for (const job of focused) {
      targets[job] += each + (left > 0 ? 1 : 0);
      if (left > 0) left -= 1;
    }
  }
  return targets;
}

/**
 * Where the practice budget goes. Committing to a side is what buys a real
 * install: a focused side gets everything it can hold and the other side gets
 * what is left, which is the "you cannot drill both" trade stated in reps rather
 * than asked as a slider question.
 */
export function repsSplit(
  practiceHours: number,
  chosen: ReadonlySet<WeekFocus>
): { offensiveReps: number; defensiveReps: number } {
  const offense = chosen.has("INSTALL_OFFENSE");
  const defense = chosen.has("INSTALL_DEFENSE");
  const share = offense && !defense ? 0.78 : defense && !offense ? 0.22 : 0.5;
  const cap = (focused: boolean) => focused ? MAXIMUM_REPS_PER_SIDE : UNFOCUSED_REPS_CAP;
  const offensiveReps = Math.min(cap(offense), Math.round(practiceHours * share));
  const defensiveReps = Math.min(cap(defense), practiceHours - offensiveReps);
  return { offensiveReps, defensiveReps };
}

/**
 * How much of a coaching hour becomes a padded practice rep.
 *
 * Set by measurement, not by feel. Passing the raw PREPARE hours through put the
 * whole league at about 0.78 expected execution — the top of the band the
 * install table was calibrated against ("12 reps, 66–87%") — and a league where
 * every plan holds up amplifies unit-rating gaps, which showed up as one-score
 * games falling from 27% to 19%. At 0.55 the league sits mid-band and a focused
 * side is clearly better prepared than an unfocused one without being maxed.
 */
export const PRACTICE_PER_COACHING_HOUR = 0.55;

/**
 * A side nobody made a priority gets a walkthrough, not half a week. This is the
 * "you cannot drill both sides" trade stated in reps: without the cap, a focused
 * offense still left four reps over for the defense and committing bought almost
 * nothing.
 */
export const UNFOCUSED_REPS_CAP = 3;

/* -------------------------------------------------------------------------- */
/* The five cards                                                             */
/* -------------------------------------------------------------------------- */

function shareFrom(plan: WeekHourPlan): (member: StaffMember) => number {
  return (member) => clamp((plan.byStaff[member.id]?.PREPARE ?? 0) / Math.max(1, staffCapacity(member.rating, member.trait)), 0, 1);
}

/** Who this priority's week actually belongs to. */
export function focusOwner(
  state: Readonly<GameState>,
  programId: string,
  focus: WeekFocus
): StaffMember | null {
  const staff = programStaff(state, programId);
  const role = FOCUS_ROLE[focus];
  if (role) return staff.find((member) => member.role === role) ?? staff.find((member) => member.role === "HEAD_COACH") ?? null;
  const job = FOCUS_JOB[focus];
  return [...staff].sort((left, right) =>
    focusWeight(right, job) - focusWeight(left, job) || left.id.localeCompare(right.id))[0] ?? null;
}

/**
 * Who the development card names. Falls back to the man with the most headroom
 * left, which is the same player the curated suggestions call `RISING`.
 */
export function developmentTarget(state: Readonly<GameState>, programId: string): Player | null {
  const spotlight = state.developmentSpotlights?.[programId];
  if (spotlight?.target.type === "PLAYER") {
    const player = state.players[spotlight.target.playerId];
    if (player && player.programId === programId) return player;
  }
  return Object.values(state.players)
    .filter((player) => player.programId === programId
      && player.eligibility.rosterStatus === "SCHOLARSHIP"
      && player.eligibility.redshirtStatus !== "REDSHIRTING")
    .sort((left, right) =>
      (right.potential - right.overall) - (left.potential - left.overall) || left.id.localeCompare(right.id))[0] ?? null;
}

/** The opponent the department is working on, defaulting to the game in front of you. */
export function scoutingTargetFor(state: Readonly<GameState>, programId: string): string | null {
  const stored = state.scoutingTarget?.[programId];
  const remaining = state.schedule.filter((game) =>
    !game.played && game.week >= state.week
    && (game.homeProgramId === programId || game.awayProgramId === programId));
  const opponentOf = (game: (typeof remaining)[number]): string =>
    game.homeProgramId === programId ? game.awayProgramId : game.homeProgramId;
  if (stored && remaining.some((game) => opponentOf(game) === stored)) return stored;
  const next = [...remaining].sort((left, right) => left.week - right.week)[0];
  return next ? opponentOf(next) : null;
}

/**
 * The week as five cards. Each one states who runs it, what happens if you leave
 * it alone, what happens if you pick it, and why it might matter this week.
 *
 * Everything here is projected against the same functions the engine runs, so a
 * posted number is the number — the payoffs-are-visible invariant applied to the
 * one screen the player opens every single week.
 */
export function weekPriorities(state: Readonly<GameState>, programId: string): WeekPriority[] {
  const program = state.programs[programId];
  if (!program) return [];
  const chosen = activeFocuses(state, programId);
  const chosenSet = new Set(chosen);
  const programCount = Object.keys(state.programs).length;

  const withFocus = (focus: WeekFocus): WeekHourPlan =>
    planWeekHours(state, programId, chosenSet.has(focus) ? chosen : [...chosen.slice(0, Math.max(0, chosen.length - 1)), focus]);
  const withoutFocus = (focus: WeekFocus): WeekHourPlan =>
    planWeekHours(state, programId, chosen.filter((entry) => entry !== focus));

  const opponentId = scoutingTargetFor(state, programId);
  const opponent = opponentId ? state.programs[opponentId] : null;
  const fixture = opponentId
    ? state.schedule.find((game) => !game.played && game.week >= state.week
      && ((game.homeProgramId === programId && game.awayProgramId === opponentId)
        || (game.awayProgramId === programId && game.homeProgramId === opponentId)))
    : undefined;
  const playingThisWeek = state.schedule.some((game) => game.week === state.week && !game.played
    && (game.homeProgramId === programId || game.awayProgramId === programId));
  const prospect = developmentTarget(state, programId);
  const recruiting = state.recruiting?.[programId];

  const install = (focus: WeekFocus, side: "OFFENSE" | "DEFENSE"): WeekPriority => {
    const on = withFocus(focus);
    const off = withoutFocus(focus);
    const reps = (plan: WeekHourPlan) => side === "OFFENSE" ? plan.offensiveReps : plan.defensiveReps;
    const executionOn = planExecution(state, programId, side, reps(on), shareFrom(on));
    const executionOff = planExecution(state, programId, side, reps(off), shareFrom(off));
    const owner = focusOwner(state, programId, focus);
    const units = side === "OFFENSE"
      ? program.schemeIdentity.offense
      : program.schemeIdentity.defense;
    // Two things make a week of reps worth taking: how much execution is
    // actually on the table, and how badly the side would go in unprepared. Both
    // are read off the same projection the card posts, so the badge can never
    // disagree with the numbers printed above it.
    const gain = executionOn.expected - executionOff.expected;
    const stakes = !playingThisWeek ? 0 : Math.round(clamp(
      gain * 420 + (0.62 - executionOff.expected) * 150,
      0,
      100
    ));
    return {
      focus,
      label: WEEK_FOCUS_LABELS[focus],
      blurb: WEEK_FOCUS_BLURBS[focus],
      ownerStaffId: owner?.id ?? null,
      ownerName: executionOn.installerName,
      ownerRole: owner?.role ?? null,
      ownerNote: owner ? `coaches ${units.replace(/_/g, " ").toLowerCase()}` : "no coordinator in the chair",
      baseline: `${Math.round(executionOff.expected * 100)}% of it holds up (${reps(off)} rep${reps(off) === 1 ? "" : "s"})`,
      focused: `${Math.round(executionOn.expected * 100)}% of it holds up (${reps(on)} rep${reps(on) === 1 ? "" : "s"})`,
      chosen: chosenSet.has(focus),
      stakes,
      stakesNote: !playingThisWeek
        ? "No game this week, so reps keep for nobody."
        : executionOff.expected < 0.55
          ? `Left alone they run it at ${Math.round(executionOff.expected * 100)}% — they will be working it out on the field.`
          : gain >= 0.08
            ? `A week of reps is worth ${Math.round(gain * 100)} points of execution here.`
            : "They already know this well enough to play with it.",
      blocked: playingThisWeek ? null : "No game this Saturday."
    };
  };

  const on = withFocus("SCOUT");
  const off = withoutFocus("SCOUT");
  const files = state.dossiers?.[programId] ?? {};
  const filePoints = opponentId ? files[opponentId] ?? 0 : 0;
  const scoutingOn = projectedScouting(state, programId, on);
  const scoutingOff = projectedScouting(state, programId, off);
  const worth = opponent ? opponentValue(program, opponent, programCount) : null;
  const scoutOwner = focusOwner(state, programId, "SCOUT");
  const weeksOut = fixture ? fixture.week - state.week : null;

  const developOn = withFocus("DEVELOP");
  const developOff = withoutFocus("DEVELOP");
  const developOwner = focusOwner(state, programId, "DEVELOP");

  const recruitOn = withFocus("RECRUIT");
  const recruitOff = withoutFocus("RECRUIT");
  const recruitOwner = focusOwner(state, programId, "RECRUIT");

  return [
    install("INSTALL_OFFENSE", "OFFENSE"),
    install("INSTALL_DEFENSE", "DEFENSE"),
    {
      focus: "SCOUT",
      label: opponent ? `Scout ${opponent.name}` : WEEK_FOCUS_LABELS.SCOUT,
      blurb: WEEK_FOCUS_BLURBS.SCOUT,
      ownerStaffId: scoutOwner?.id ?? null,
      ownerName: scoutOwner?.name ?? "Nobody",
      ownerRole: scoutOwner?.role ?? null,
      ownerNote: scoutOwner ? "runs the film room" : "nobody on staff is watching tape",
      baseline: `+${scoutingReadiness(filePoints + scoutingOff).toFixed(1)} to every unit that game`,
      focused: `+${scoutingReadiness(filePoints + scoutingOn).toFixed(1)} to every unit that game`,
      chosen: chosenSet.has("SCOUT"),
      // What the game is worth, discounted by how much of the file is already
      // built — a complete file on a big opponent is not a reason to spend
      // another week on it.
      stakes: Math.round(clamp(
        ((worth?.value ?? 0) * 0.85 + (weeksOut !== null && weeksOut <= 1 ? 18 : 0))
          * (1 - scoutingReadiness(filePoints) / FULL_FILE_READINESS),
        0,
        100
      )),
      stakesNote: !opponent
        ? "Nothing left on the schedule to study."
        : (worth?.value ?? 0) >= MARQUEE_VALUE
          ? `#${opponent.nationalRank} and you play them in week ${fixture?.week ?? state.week}. This is the one.`
          : (worth?.value ?? 0) >= WORTH_SCOUTING
            ? `#${opponent.nationalRank}, week ${fixture?.week ?? state.week}. Worth knowing about.`
            : `#${opponent.nationalRank}. Nobody is going to remember this one.`,
      blocked: opponent ? null : "Nothing left on the schedule."
    },
    {
      focus: "DEVELOP",
      label: prospect ? `Coach up ${prospect.name}` : WEEK_FOCUS_LABELS.DEVELOP,
      blurb: WEEK_FOCUS_BLURBS.DEVELOP,
      ownerStaffId: developOwner?.id ?? null,
      ownerName: developOwner?.name ?? "Nobody",
      ownerRole: developOwner?.role ?? null,
      ownerNote: developOwner ? "takes the extra work" : "nobody has time for extra work",
      // Two different beneficiaries, named separately: the spotlight goes to
      // one man, the coaching term lifts the whole roster. The old copy said
      // "for everybody" on a card titled with one player's name.
      baseline: `${growthNote(state, programId, developOff)} · no spotlight on anybody`,
      focused: prospect
        ? `${prospect.name} gets the full spotlight · ${growthNote(state, programId, developOn)}`
        : growthNote(state, programId, developOn),
      chosen: chosenSet.has("DEVELOP"),
      stakes: Math.round(clamp(
        (prospect ? (prospect.potential - prospect.overall) * 2.1 : 0) + (15 - state.week) * 1.6,
        0,
        100
      )),
      stakesNote: !prospect
        ? "Nobody on the roster to work with."
        : prospect.potential - prospect.overall >= 10
          ? `${prospect.name} has ${Math.round(prospect.potential - prospect.overall)} points of headroom left and a whole career to use it.`
          : `${prospect.name} is close to what he is going to be.`,
      blocked: prospect ? null : "Nobody on scholarship to work with."
    },
    {
      focus: "RECRUIT",
      label: WEEK_FOCUS_LABELS.RECRUIT,
      blurb: WEEK_FOCUS_BLURBS.RECRUIT,
      ownerStaffId: recruitOwner?.id ?? null,
      ownerName: recruitOwner?.name ?? "Nobody",
      ownerRole: recruitOwner?.role ?? null,
      ownerNote: recruitOwner ? "works the living rooms" : "nobody is on the road",
      baseline: `+${trailNote(state, programId, recruitOff)} recruiting points this week`,
      focused: `+${trailNote(state, programId, recruitOn)} recruiting points this week`,
      chosen: chosenSet.has("RECRUIT"),
      stakes: Math.round(clamp(28 + state.week * 3.1 - (recruiting?.points ?? 0) * 0.4, 0, 100)),
      stakesNote: state.week >= 10
        ? "Class is closing. Points you do not spend now sign nobody."
        : `${recruiting?.points ?? 0} points banked. Plenty of season left to use them.`,
      blocked: null
    }
  ];
}

/**
 * The coaching term `developPlayers` actually multiplies growth by, stated as a
 * percentage. Derived from the same `staffContribution / 150` the engine runs,
 * so the card cannot drift away from the outcome.
 */
function growthNote(state: Readonly<GameState>, programId: string, plan: WeekHourPlan): string {
  const contribution = programStaff(state, programId).reduce((total, member) => {
    const capacity = staffCapacity(member.rating, member.trait);
    return total + focusWeight(member, "DEVELOP") * clamp((plan.byStaff[member.id]?.DEVELOP ?? 0) / Math.max(1, capacity), 0, 1);
  }, 0);
  const percent = contribution / 1.5;
  return percent < 0.5 ? "no extra coaching" : `the whole roster grows +${percent.toFixed(0)}% faster`;
}

/** Recruiting points the week's hours would put on the board. */
/**
 * What the trail would produce with a given week behind it.
 *
 * This used to carry its own copy of the recruiting formula, and the copy was
 * the one that existed before it was re-weighted — `32 + facilities * 4 +
 * contribution / 20` against the engine's `14 + facilities * 3 + contribution /
 * 4.2`. So the card posted 41 points and the week delivered 25, a 39% miss on a
 * number the player is asked to make a decision against. Two copies of one
 * formula is how a posted payoff drifts away from what the engine does, which
 * is the failure this codebase keeps finding; there is one copy now, and the
 * plan is applied to it through the same contribution term the engine reads.
 */
function trailNote(state: Readonly<GameState>, programId: string, plan: WeekHourPlan): number {
  const program = state.programs[programId];
  const contribution = programStaff(state, programId)
    // The strength coach is a fixed health investment and contributes nothing to
    // the trail, exactly as `staffContribution` has it.
    .filter((member) => member.role !== "STRENGTH_COACH")
    .reduce((total, member) => {
      const capacity = staffCapacity(member.rating, member.trait);
      const share = clamp((plan.byStaff[member.id]?.RECRUIT ?? 0) / Math.max(1, capacity), 0, 1);
      // `focusWeight` is already rating x role fit x trait aptitude, so this is
      // `staffContribution`'s term with the plan's share substituted for the
      // allocation the program is currently running.
      return total + focusWeight(member, "RECRUIT") * share;
    }, 0);
  return Math.round(RECRUITING_BASE_POINTS + (program?.facilities.RECRUITING ?? 1) * RECRUITING_PER_FACILITY + contribution / RECRUITING_PER_CONTRIBUTION);
}

/** What the department would produce with a given week behind it. */
function projectedScouting(state: Readonly<GameState>, programId: string, plan: WeekHourPlan): number {
  const current = weeklyScoutingOutput(state, programId);
  const staff = programStaff(state, programId);
  const live = staff.reduce((total, member) => {
    const capacity = staffCapacity(member.rating, member.trait);
    return total + focusWeight(member, "SCOUT") * clamp((member.allocation?.SCOUT ?? 0) / Math.max(1, capacity), 0, 1);
  }, 0);
  const projected = staff.reduce((total, member) => {
    const capacity = staffCapacity(member.rating, member.trait);
    return total + focusWeight(member, "SCOUT") * clamp((plan.byStaff[member.id]?.SCOUT ?? 0) / Math.max(1, capacity), 0, 1);
  }, 0);
  const program = state.programs[programId];
  const level = program?.facilities.SCOUTING ?? 1;
  return Math.max(0, Math.round(current + (projected - live) / 12 * (0.6 + level * 0.28)));
}
