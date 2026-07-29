import type {
  GameState,
  OpponentDossier,
  Program,
  ScoutingTier,
  StaffAllocation,
  StaffFocus,
  StaffMember,
  StaffRole
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
 * How much attention a coach has in a week. Better coaches do not merely do
 * each job better, they get through more of them — which is what makes a strong
 * staff feel like capacity rather than a rating.
 */
export function staffCapacity(rating: number): number {
  return Math.round(clamp(4 + rating / 18, 4, 10));
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
export function defaultAllocation(role: StaffRole, rating: number): StaffAllocation {
  const capacity = staffCapacity(rating);
  const allocation = emptyAllocation();
  if (role === "STRENGTH_COACH") {
    allocation.DEVELOP = Math.ceil(capacity * 0.6);
    allocation.RECOVER = capacity - allocation.DEVELOP;
    return allocation;
  }
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
    .filter((member) => member.programId === programId)
    .reduce((total, member) => {
      const capacity = staffCapacity(member.rating);
      const share = clamp((member.allocation?.[focus] ?? 0) / Math.max(1, capacity), 0, 1);
      return total + member.rating * share * roleFit(member.role, focus);
    }, 0);
}

/** The share of one coach's week going to a job, as a fraction. */
export function focusShare(member: Pick<StaffMember, "rating" | "allocation">, focus: StaffFocus): number {
  const capacity = staffCapacity(member.rating);
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
