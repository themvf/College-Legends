import type {
  GameState,
  OpponentDossier,
  Program,
  ScoutingTier,
  StaffAllocation,
  StaffFocus,
  StaffMember,
  StaffRole,
  StaffSkill,
  StaffTrait
} from "@college-legends/model";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

export const STAFF_FOCUSES: readonly StaffFocus[] = ["PREPARE", "SCOUT", "RECRUIT", "DEVELOP", "RECOVER"];

export const STAFF_FOCUS_LABELS: Readonly<Record<StaffFocus, string>> = {
  PREPARE: "Game prep",
  SCOUT: "Scouting opponents",
  RECRUIT: "On the road recruiting",
  DEVELOP: "Coaching guys up",
  RECOVER: "Training room"
};

/**
 * What a coach is known for. Rating alone made hiring a sort — the highest
 * number you could afford was always right. A trait says what his hours are
 * actually worth job by job, so a 74 who closes on the trail and a 74 who lives
 * in the film room are two different hires for the same money.
 *
 * Specialists trade breadth for a spike; the grinder trades the spike for two
 * more hours a week. Neither dominates: maxing one job wants a specialist,
 * covering four wants the grinder.
 */
export interface StaffTraitProfile {
  label: string;
  blurb: string;
  aptitude: Readonly<Record<StaffFocus, number>>;
  /** Extra hours a week on top of what his rating buys. */
  extraHours: number;
}

export const STAFF_TRAITS: Readonly<Record<StaffTrait, StaffTraitProfile>> = {
  TACTICIAN: {
    label: "Tactician",
    blurb: "Lives in the game plan. More of what you call actually holds up on Saturday.",
    aptitude: { PREPARE: 1.3, SCOUT: 1, RECRUIT: 0.85, DEVELOP: 0.9, RECOVER: 0.9 },
    extraHours: 0
  },
  FILM_RAT: {
    label: "Film rat",
    blurb: "Watches tape until he can call their plays. Builds scouting files fast.",
    aptitude: { PREPARE: 1.05, SCOUT: 1.35, RECRUIT: 0.85, DEVELOP: 0.85, RECOVER: 0.9 },
    extraHours: 0
  },
  CLOSER: {
    label: "Closer",
    blurb: "Wins living rooms. Signs kids who had no business signing here.",
    aptitude: { PREPARE: 0.9, SCOUT: 0.95, RECRUIT: 1.4, DEVELOP: 0.9, RECOVER: 0.9 },
    extraHours: 0
  },
  TEACHER: {
    label: "Teacher",
    blurb: "Makes players better than they were recruited to be.",
    aptitude: { PREPARE: 0.95, SCOUT: 0.9, RECRUIT: 0.9, DEVELOP: 1.4, RECOVER: 1.05 },
    extraHours: 0
  },
  PLAYERS_COACH: {
    label: "Players' coach",
    blurb: "Keeps a locker room fresh. Your guys are still standing in November.",
    aptitude: { PREPARE: 1, SCOUT: 0.9, RECRUIT: 1.05, DEVELOP: 1, RECOVER: 1.4 },
    extraHours: 0
  },
  GRINDER: {
    label: "Grinder",
    blurb: "No speciality and no weakness — he just works a longer week than anybody.",
    aptitude: { PREPARE: 1, SCOUT: 1, RECRUIT: 1, DEVELOP: 1, RECOVER: 1 },
    extraHours: 2
  }
};

export const STAFF_TRAIT_LIST: readonly StaffTrait[] =
  ["TACTICIAN", "FILM_RAT", "CLOSER", "TEACHER", "PLAYERS_COACH", "GRINDER"];

/**
 * Which traits turn up in which post. A strength coach who is a film rat would
 * be a curiosity rather than a decision, so the pools are weighted to the jobs
 * where the trait actually changes something.
 */
const TRAIT_POOLS: Readonly<Record<StaffRole, readonly StaffTrait[]>> = {
  HEAD_COACH: ["CLOSER", "CLOSER", "TACTICIAN", "PLAYERS_COACH", "PLAYERS_COACH", "GRINDER", "TEACHER"],
  OFFENSIVE_COORDINATOR: ["TACTICIAN", "TACTICIAN", "FILM_RAT", "FILM_RAT", "CLOSER", "TEACHER", "GRINDER"],
  DEFENSIVE_COORDINATOR: ["TACTICIAN", "TACTICIAN", "FILM_RAT", "FILM_RAT", "CLOSER", "TEACHER", "GRINDER"],
  STRENGTH_COACH: ["TEACHER", "TEACHER", "PLAYERS_COACH", "PLAYERS_COACH", "GRINDER", "TACTICIAN"]
};

/** Picks a trait for a post from a 0–1 roll. Deterministic by construction. */
export function pickStaffTrait(role: StaffRole, roll: number): StaffTrait {
  const pool = TRAIT_POOLS[role];
  return pool[Math.min(pool.length - 1, Math.floor(clamp(roll, 0, 0.9999) * pool.length))]!;
}

/** What this coach's hour is worth at this job, over a plain coach's hour. */
export function traitAptitude(trait: StaffTrait | undefined, focus: StaffFocus): number {
  return STAFF_TRAITS[trait ?? "GRINDER"].aptitude[focus];
}

/**
 * How much attention a coach has in a week. Better coaches do not merely do
 * each job better, they get through more of them — which is what makes a strong
 * staff feel like capacity rather than a rating.
 */
export function staffCapacity(rating: number, trait?: StaffTrait): number {
  return Math.round(clamp(4 + rating / 18, 4, 10)) + (trait ? STAFF_TRAITS[trait].extraHours : 0);
}

/**
 * How good a coach is at each job. A coordinator is worth more preparing the
 * team than recruiting, and a strength coach is not a scout — so splitting a
 * coach's week is a real allocation rather than a free reshuffle.
 */
const ROLE_FIT: Readonly<Record<StaffRole, Readonly<Record<StaffFocus, number>>>> = {
  HEAD_COACH: { PREPARE: 1.15, SCOUT: 0.9, RECRUIT: 1.2, DEVELOP: 0.8, RECOVER: 0.5 },
  OFFENSIVE_COORDINATOR: { PREPARE: 1.4, SCOUT: 1.15, RECRUIT: 0.85, DEVELOP: 0.7, RECOVER: 0.4 },
  DEFENSIVE_COORDINATOR: { PREPARE: 1.4, SCOUT: 1.15, RECRUIT: 0.85, DEVELOP: 0.7, RECOVER: 0.4 },
  STRENGTH_COACH: { PREPARE: 0.55, SCOUT: 0.35, RECRUIT: 0.5, DEVELOP: 1.4, RECOVER: 1.4 }
};

export function roleFit(role: StaffRole, focus: StaffFocus): number {
  return ROLE_FIT[role][focus];
}

export function emptyAllocation(): StaffAllocation {
  return { PREPARE: 0, SCOUT: 0, RECRUIT: 0, DEVELOP: 0, RECOVER: 0 };
}

/** Where a coach's week goes before the player touches anything. */
export function defaultAllocation(role: StaffRole, rating: number, trait?: StaffTrait): StaffAllocation {
  const capacity = staffCapacity(rating, trait);
  const allocation = emptyAllocation();
  if (role === "STRENGTH_COACH") return allocation;
  if (role === "HEAD_COACH") {
    allocation.PREPARE = Math.ceil(capacity * 0.5);
    allocation.RECRUIT = capacity - allocation.PREPARE;
    return allocation;
  }
  allocation.PREPARE = Math.ceil(capacity * 0.7);
  allocation.SCOUT = capacity - allocation.PREPARE;
  return allocation;
}

export function allocatedTotal(allocation: StaffAllocation): number {
  return STAFF_FOCUSES.reduce((total, focus) => total + Math.max(0, allocation[focus] ?? 0), 0);
}

/**
 * The incoming coach fills the post the outgoing one held, scaled to the hours
 * he actually works. Copying the week across verbatim leaves a longer week
 * partly unspent and an over-committed one silently capped.
 */
export function rebalanceAllocation(
  outgoing: Pick<StaffMember, "role" | "allocation">,
  rating: number,
  trait: StaffTrait
): StaffAllocation {
  if (outgoing.role === "STRENGTH_COACH") return emptyAllocation();
  const target = staffCapacity(rating, trait);
  const previous = outgoing.allocation ?? emptyAllocation();
  const spent = allocatedTotal(previous);
  if (spent <= 0) return defaultAllocation(outgoing.role, rating, trait);
  const allocation = emptyAllocation();
  let assigned = 0;
  // Largest remainder, so the hours land where the post already had them.
  const order = STAFF_FOCUSES.map((focus) => {
    const exact = Math.max(0, previous[focus] ?? 0) / spent * target;
    const whole = Math.floor(exact);
    allocation[focus] = whole;
    assigned += whole;
    return { focus, remainder: exact - whole };
  }).sort((left, right) => right.remainder - left.remainder);
  for (let index = 0; assigned < target; index += 1, assigned += 1) {
    allocation[order[index % order.length]!.focus] += 1;
  }
  return allocation;
}

/**
 * The staff's total effort on one job, in rating-points. Every system that used
 * to filter staff by a single assignment reads this instead, so a coach who
 * gives a job a third of his week contributes a third of his worth to it.
 */
export function staffContribution(
  state: Readonly<GameState>,
  programId: string,
  focus: StaffFocus
): number {
  return Object.values(state.staff)
    // The strength coach is a fixed health investment, not part of the weekly
    // attention economy. Ignore stale allocations from older saves too.
    .filter((member) => member.programId === programId && member.role !== "STRENGTH_COACH")
    .reduce((total, member) => {
      const capacity = staffCapacity(member.rating, member.trait);
      const share = clamp((member.allocation?.[focus] ?? 0) / Math.max(1, capacity), 0, 1);
      return total + member.rating * share * roleFit(member.role, focus) * traitAptitude(member.trait, focus);
    }, 0);
}

export interface StrengthCoachBenefits {
  /** Additional progress applied only to the strength player rating. */
  strengthGrowthPercent: number;
  /** Fatigue rating points removed from every scholarship player each week. */
  fatigueRecoveryPoints: number;
  /** Percentage reduction applied to each active player's weekly injury risk. */
  injuryRiskReductionPercent: number;
  /** Chance to remove one additional week from an existing injury. */
  extraRecoveryChancePercent: number;
}

/**
 * A strength coach has no weekly sliders. Salary buys four automatic, named
 * health outcomes; none of these values feed preparation, scouting, recruiting,
 * or general overall development.
 */
export function strengthCoachBenefits(
  member: (Pick<StaffMember, "rating" | "role"> & { trait?: StaffTrait }) | undefined
): StrengthCoachBenefits {
  if (!member || member.role !== "STRENGTH_COACH") {
    return {
      strengthGrowthPercent: 0,
      fatigueRecoveryPoints: 0,
      injuryRiskReductionPercent: 0,
      extraRecoveryChancePercent: 0
    };
  }
  const strengthAptitude = traitAptitude(member.trait, "DEVELOP");
  const healthAptitude = traitAptitude(member.trait, "RECOVER");
  return {
    strengthGrowthPercent: Math.round(member.rating * strengthAptitude / 5),
    fatigueRecoveryPoints: Number((member.rating * healthAptitude / 30).toFixed(1)),
    injuryRiskReductionPercent: Math.round(clamp(member.rating * healthAptitude / 4, 5, 35)),
    extraRecoveryChancePercent: Math.round(clamp(member.rating * healthAptitude / 2, 10, 60))
  };
}

export function programStrengthCoachBenefits(
  state: Readonly<GameState>,
  programId: string
): StrengthCoachBenefits {
  const coach = Object.values(state.staff)
    .find((member) => member.programId === programId && member.role === "STRENGTH_COACH");
  return strengthCoachBenefits(coach);
}

/**
 * Rating-points this coach puts on a job when he works a full week at it. This
 * is exactly what `staffContribution` sums, so anything posted from it is the
 * number the engine will use.
 */
export function focusWeight(member: Pick<StaffMember, "rating" | "role" | "trait">, focus: StaffFocus): number {
  return member.rating * roleFit(member.role, focus) * traitAptitude(member.trait, focus);
}

/**
 * The same thing on a 0–99 scale, measured against the best this post can be.
 *
 * Rendering the raw product pegged every coordinator at 99 on game prep — the
 * role weight there is 1.4, so the bar that matters most carried no information
 * at all. Normalising by the post's own best weight keeps the comparison the
 * screen exists for: how these candidates stack up against each other in this
 * chair, not against a strength coach.
 */
export function focusSkill(member: Pick<StaffMember, "rating" | "role" | "trait">, focus: StaffFocus): number {
  const best = Math.max(...STAFF_FOCUSES.map((candidate) => roleFit(member.role, candidate)));
  return Math.round(clamp(focusWeight(member, focus) / best, 1, 99));
}

/** Every job this coach does, best first, with his two best flagged. */
export function staffSkills(member: Pick<StaffMember, "rating" | "role" | "trait">): StaffSkill[] {
  const scored = STAFF_FOCUSES.map((focus) => ({ focus, value: focusSkill(member, focus) }));
  const ranked = [...scored].sort((left, right) => right.value - left.value);
  const strong = new Set(ranked.slice(0, 2).map((entry) => entry.focus));
  return ranked.map((entry) => ({
    focus: entry.focus,
    label: STAFF_FOCUS_LABELS[entry.focus],
    value: entry.value,
    strength: strong.has(entry.focus)
  }));
}

/** The share of one coach's week going to a job, as a fraction. */
export function focusShare(member: Pick<StaffMember, "rating" | "allocation" | "trait">, focus: StaffFocus): number {
  const capacity = staffCapacity(member.rating, member.trait);
  return clamp((member.allocation?.[focus] ?? 0) / Math.max(1, capacity), 0, 1);
}

/**
 * Points a program's scouting department produces each week, from the coaches
 * who give it time and the funding behind them. Funding is the multiplier: the
 * same coaching hours are worth far more with a department behind them.
 */
export function weeklyScoutingOutput(state: Readonly<GameState>, programId: string): number {
  const program = state.programs[programId];
  if (!program) return 0;
  const level = program.facilities.SCOUTING ?? 1;
  const coaching = staffContribution(state, programId, "SCOUT") / 12;
  return Math.max(0, Math.round(departmentBaseOutput(level) + coaching * fundingMultiplier(level)));
}

/**
 * What a department produces before any coach gives it an hour. Funding is both
 * a floor and a multiplier, so the gap between a shoestring operation and a
 * national one is a factor of seven rather than a few points.
 */
export function departmentBaseOutput(level: number): number {
  return Math.round((3 + level * 3.5) * fundingMultiplier(level));
}

export function fundingMultiplier(level: number): number {
  return 0.6 + level * 0.28;
}

export const SCOUTING_FUNDING_LABELS: Readonly<Record<number, string>> = {
  1: "Shoestring",
  2: "Getting by",
  3: "Real operation",
  4: "Well funded",
  5: "Best in the country"
};

export function scoutingDepartmentSummary(level: number): string {
  const tier = SCOUTING_FUNDING_LABELS[clamp(Math.round(level), 1, 5)] ?? "Funded";
  return `${tier} — about ${departmentBaseOutput(level)} points a week on its own, and it multiplies whatever hours your coaches put in by ${fundingMultiplier(level).toFixed(2)}x`;
}

/**
 * Points a file needs before each tier of it is readable. Priced against a
 * season: a shoestring department can complete about three files in fourteen
 * weeks, a national one nearly the whole schedule. Scouting everybody is never
 * on the table, which is what makes the board a decision.
 */
export const DOSSIER_THRESHOLDS: Readonly<Record<ScoutingTier, number>> = {
  TENDENCIES: 6,
  PERSONNEL: 18,
  GAME_PLAN: 36
};

export function dossierTiers(points: number): ScoutingTier[] {
  return (Object.keys(DOSSIER_THRESHOLDS) as ScoutingTier[])
    .filter((tier) => points >= DOSSIER_THRESHOLDS[tier]);
}

/** Above this a fixture is worth opening a file on at all. */
export const WORTH_SCOUTING = 35;
/** Above this a fixture is worth rearranging the coaching week for. */
export const MARQUEE_VALUE = 60;

/**
 * What beating an opponent is worth to the program, on a 0–100 scale.
 *
 * This is the number that makes forward allocation a decision. A win over the
 * fifth-ranked side pays in followers and national attention; a win over the
 * hundredth pays almost nothing, and the points spent learning their tendencies
 * are points not spent on the game that matters. Beating someone ranked above
 * you is worth more again, so the same fixture is worth more to a rebuilding
 * program than to the team already at the top.
 */
export function opponentValue(
  program: Readonly<Program>,
  opponent: Readonly<Program>,
  programCount: number
): { value: number; note: string } {
  const spread = Math.max(1, programCount - 1);
  const standing = clamp((programCount - opponent.nationalRank) / spread, 0, 1);
  const upset = clamp((program.nationalRank - opponent.nationalRank) / spread, 0, 1);
  const followers = Math.round(program.fanBase * (0.014 + standing * 0.045));
  const press = Math.round(4 + standing * 20);
  const value = Math.round(clamp(Math.pow(standing, 1.5) * 88 + upset * 12 + 4, 2, 100));
  const note = value >= MARQUEE_VALUE
    ? `#${opponent.nationalRank}. Beat them and you pick up around ${followers.toLocaleString()} fans and ${press} points of national buzz. This is the one.`
    : value >= WORTH_SCOUTING
      ? `#${opponent.nationalRank}. A win here is worth about ${followers.toLocaleString()} fans and ${press} points of national buzz.`
      : `#${opponent.nationalRank}. Maybe ${followers.toLocaleString()} fans. Nobody's going to remember this one — save your points.`;
  return { value, note };
}

/**
 * Every opponent still to be played, with the file built so far. This is what
 * lets a program spend early on a game that matters and skip one that does not.
 */
export function upcomingDossiers(
  state: Readonly<GameState>,
  programId: string,
  confidenceFor: (opponentId: string, points: number) => number
): OpponentDossier[] {
  const program = state.programs[programId];
  if (!program) return [];
  const files = state.dossiers?.[programId] ?? {};
  const programCount = Object.keys(state.programs).length;
  return state.schedule
    .filter((game) => !game.played && game.week >= state.week
      && (game.homeProgramId === programId || game.awayProgramId === programId))
    .sort((left, right) => left.week - right.week)
    .map((game) => {
      const opponentProgramId = game.homeProgramId === programId ? game.awayProgramId : game.homeProgramId;
      const opponent = state.programs[opponentProgramId];
      if (!opponent) return null;
      const points = files[opponentProgramId] ?? 0;
      const { value, note } = opponentValue(program, opponent, programCount);
      return {
        opponentProgramId,
        week: game.week,
        points,
        tiers: dossierTiers(points),
        confidence: confidenceFor(opponentProgramId, points),
        value,
        valueNote: note
      };
    })
    .filter((dossier): dossier is OpponentDossier => dossier !== null);
}


/**
 * What a scouting file is worth on the field.
 *
 * The department's payoff used to be information alone, and information only
 * cashes if you change your call to counter them. But a team is not a menu — an
 * Air Raid roster asked to grind it out is running something it has never
 * repped, which is what `planAlignment` exists to discourage. So the reward was
 * designed out from under the system.
 *
 * A file now makes your own team better in that game instead: your guys have
 * seen the formation on tape and react half a step faster. It never asks you to
 * abandon what you run. The information still comes with it — that is what tells
 * you where to spend practice hours — but it is no longer the thing you are
 * paying for.
 *
 * Scaled against the anchors the engine already has: home field is worth 2.8,
 * and a full emphasis counter about 2.7 points of scoring. A complete file is
 * worth about the same as playing at home, which is the right order of magnitude
 * for something the player pays for every single week.
 */
export const FULL_FILE_READINESS = 3;

export function scoutingReadiness(dossierPoints: number): number {
  const capped = clamp(dossierPoints, 0, DOSSIER_THRESHOLDS.GAME_PLAN);
  // Square root, so the first points matter most and a full file is a
  // diminishing-returns purchase rather than a cliff at each tier.
  return Number((FULL_FILE_READINESS * Math.sqrt(capped / DOSSIER_THRESHOLDS.GAME_PLAN)).toFixed(2));
}

/** Plain-language version for the board and the week screen. */
export function readinessNote(dossierPoints: number): string {
  const bonus = scoutingReadiness(dossierPoints);
  if (bonus <= 0) return "No file. Your guys go in cold.";
  return `+${bonus.toFixed(1)} to every unit — they have seen this on tape`;
}

/**
 * The week as one pool, which is what the player should actually see.
 *
 * Hours already come from `StaffAllocation`, but they were edited per coach on a
 * separate screen — roughly twenty sliders — and then spent again on three more
 * screens as prep points and scouting points. So the four jobs never visibly
 * competed, every downstream screen looked like a free pool, and the honest
 * answer to "why not max practice every week" was: you would, because those hours
 * could not buy anything else.
 *
 * This aggregates the staff into hours per job. The per-coach split still exists
 * underneath — it is what makes a coach's trait and role matter — but the
 * decision the player makes is one number per job against one total.
 */
export interface WeekAllocation {
  totalHours: number;
  spent: number;
  available: number;
  byFocus: Record<StaffFocus, number>;
  /** Rating-points the staff actually delivers to each job, after role and trait. */
  deliveredByFocus: Record<StaffFocus, number>;
}

/** Coaches who split a week. The strength coach is money in, health out. */
export function allocatableStaff(state: Readonly<GameState>, programId: string): StaffMember[] {
  return Object.values(state.staff)
    .filter((member) => member.programId === programId && member.role !== "STRENGTH_COACH")
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function weekAllocation(state: Readonly<GameState>, programId: string): WeekAllocation {
  const staff = allocatableStaff(state, programId);
  const byFocus = emptyAllocation();
  const deliveredByFocus = emptyAllocation();
  let totalHours = 0;
  for (const member of staff) {
    totalHours += staffCapacity(member.rating, member.trait);
    for (const focus of STAFF_FOCUSES) {
      const hours = Math.max(0, member.allocation?.[focus] ?? 0);
      byFocus[focus] += hours;
      deliveredByFocus[focus] += hours * focusWeight(member, focus) / Math.max(1, staffCapacity(member.rating, member.trait));
    }
  }
  const spent = STAFF_FOCUSES.reduce((total, focus) => total + byFocus[focus], 0);
  return {
    totalHours,
    spent,
    available: Math.max(0, totalHours - spent),
    byFocus,
    deliveredByFocus: Object.fromEntries(
      STAFF_FOCUSES.map((focus) => [focus, Number(deliveredByFocus[focus].toFixed(1))])
    ) as Record<StaffFocus, number>
  };
}

/**
 * Puts a target number of hours on one job, taking whatever it needs from the
 * others. Hours go to the coaches worth the most at that job first, so moving
 * hours to scouting pulls them from the man best suited to scouting — which is
 * how the aggregate control stays consistent with the per-coach model beneath it.
 */
export function distributeWeekHours(
  state: Readonly<GameState>,
  programId: string,
  focus: StaffFocus,
  targetHours: number
): Record<string, StaffAllocation> {
  const staff = allocatableStaff(state, programId);
  const plans = new Map<string, StaffAllocation>(
    staff.map((member) => [member.id, { ...emptyAllocation(), ...(member.allocation ?? {}) }])
  );
  const capacityOf = (member: StaffMember) => staffCapacity(member.rating, member.trait);
  const ceiling = staff.reduce((total, member) => total + capacityOf(member), 0);
  let wanted = Math.max(0, Math.min(Math.round(targetHours), ceiling));

  // Clear the job, then refill it best-first.
  for (const member of staff) plans.get(member.id)![focus] = 0;
  const ranked = [...staff].sort((left, right) =>
    focusWeight(right, focus) - focusWeight(left, focus) || left.id.localeCompare(right.id));
  for (const member of ranked) {
    if (wanted <= 0) break;
    const plan = plans.get(member.id)!;
    const capacity = capacityOf(member);
    const take = Math.min(wanted, capacity);
    plan[focus] = take;
    wanted -= take;
    // Whatever else he was doing has to give way, worst-value job first.
    let over = allocatedTotal(plan) - capacity;
    const donors = STAFF_FOCUSES
      .filter((other) => other !== focus)
      .sort((left, right) => focusWeight(member, left) - focusWeight(member, right));
    for (const donor of donors) {
      if (over <= 0) break;
      const given = Math.min(over, plan[donor]);
      plan[donor] -= given;
      over -= given;
    }
  }
  return Object.fromEntries(plans);
}
