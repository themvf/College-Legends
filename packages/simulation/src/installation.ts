import type {
  GameState,
  PlanExecution,
  Program,
  StaffCandidate,
  StaffMember,
  StaffModifier,
  StaffRole
} from "@college-legends/model";
import { AddressableRng } from "./rng.js";
import { focusShare } from "./department.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

/** Reps are bought with the same weekly attention that pays for scouting. */
export const MAXIMUM_REPS_PER_SIDE = 12;

/**
 * A game plan is built during the week rather than merely chosen. Who installs
 * it and how many reps it gets decide how much of the chosen emphasis survives
 * to Saturday: a plan run at 40% delivers a fraction of what it promises, and
 * one run at 85% delivers nearly all of it.
 */
export function executionMultiplier(execution: number): number {
  return clamp(execution, 0, 1);
}

const INSTALLER_ROLE: Readonly<Record<"OFFENSE" | "DEFENSE", StaffRole>> = {
  OFFENSE: "OFFENSIVE_COORDINATOR",
  DEFENSE: "DEFENSIVE_COORDINATOR"
};

/**
 * Who actually installs a side of the plan, and how much of himself he brings
 * to it. The coordinator does it, at the fraction of his week he actually spends
 * preparing the team — send him scouting or recruiting instead and the plan
 * installs worse. Below half a week the head coach covers, worse than the
 * specialist would; with nobody preparing at all the players work it out
 * themselves.
 */
export function planInstaller(
  state: Readonly<GameState>,
  programId: string,
  side: "OFFENSE" | "DEFENSE"
): { staff: StaffMember | null; rating: number; name: string; note: string } {
  const staff = Object.values(state.staff).filter((member) => member.programId === programId);
  const coordinator = staff.find((member) => member.role === INSTALLER_ROLE[side]);
  const coordinatorShare = coordinator ? focusShare(coordinator, "PREPARE") : 0;
  if (coordinator && coordinatorShare >= 0.5) {
    return {
      staff: coordinator,
      // Full attention is par; a coordinator splitting his week installs less.
      rating: coordinator.rating * (0.72 + coordinatorShare * 0.28),
      name: coordinator.name,
      note: coordinatorShare >= 0.99
        ? "Coordinator installing"
        : `Coordinator installing on ${Math.round(coordinatorShare * 100)}% of his week`
    };
  }
  const headCoach = staff.find((member) => member.role === "HEAD_COACH");
  const headCoachShare = headCoach ? focusShare(headCoach, "PREPARE") : 0;
  if (headCoach && headCoachShare > 0) {
    // A head coach covering a coordinator's job does it worse than the specialist would.
    return {
      staff: headCoach,
      rating: headCoach.rating * 0.82 * (0.72 + headCoachShare * 0.28),
      name: headCoach.name,
      note: "Head coach covering"
    };
  }
  return { staff: null, rating: 38, name: "Nobody", note: "No coach is preparing the team" };
}

/**
 * The execution band for one side of the plan. Reps raise it with diminishing
 * returns; a better installer raises it and narrows it, because good coaching is
 * more consistent as well as better.
 */
export function planExecution(
  state: Readonly<GameState>,
  programId: string,
  side: "OFFENSE" | "DEFENSE",
  repsOverride?: number
): PlanExecution {
  const program = state.programs[programId];
  const preparation = state.preparation?.[programId];
  const reps = repsOverride ?? (side === "OFFENSE" ? preparation?.offensiveReps ?? 0 : preparation?.defensiveReps ?? 0);
  const installer = planInstaller(state, programId, side);

  const facility = program ? Math.max(0, program.facilities.TRAINING - 1) * 0.012 : 0;
  const base = 0.3 + installer.rating / 100 * 0.28;
  const repsBonus = Math.sqrt(clamp(reps, 0, MAXIMUM_REPS_PER_SIDE) / MAXIMUM_REPS_PER_SIDE) * 0.26;
  const centre = base + repsBonus + facility;
  const width = clamp(0.32 - installer.rating / 100 * 0.16, 0.08, 0.32);

  const low = Number(clamp(centre - width / 2, 0.1, 0.99).toFixed(3));
  const high = Number(clamp(centre + width / 2, 0.12, 0.99).toFixed(3));
  const expected = Number(((low + high) / 2).toFixed(3));

  const limits: string[] = [];
  if (!installer.staff) limits.push("Nobody is preparing the team, so the plan installs itself badly.");
  else if (installer.note === "Head coach covering") limits.push(`${installer.name} is covering for a coordinator who is working elsewhere.`);
  else if (installer.note.startsWith("Coordinator installing on")) limits.push(`${installer.name} is only part-time on preparation; the rest of his week is scouting or recruiting.`);
  if (reps === 0) limits.push("No reps have been spent, so the plan is only walked through.");
  if (reps >= MAXIMUM_REPS_PER_SIDE) limits.push("The players have this fully installed; more reps would only tire them.");

  return {
    side,
    installerStaffId: installer.staff?.id ?? null,
    installerName: installer.name,
    installerRating: Math.round(installer.rating),
    reps,
    low,
    high,
    expected,
    summary: `${Math.round(low * 100)}–${Math.round(high * 100)}% of the plan lands`,
    limits
  };
}

/**
 * Reps tire the roster, which is the cost that stops a maximum install every
 * week. Kept modest because fatigue never falls on its own — a program that
 * wants to practise hard all season has to staff recovery to pay for it.
 */
export function repsFatigue(reps: number): number {
  return Number((reps * 0.22).toFixed(2));
}

/**
 * What a staff member changes, stated plainly. A hire should never be a guess:
 * the card posts the numbers, the same way a salaried specialist does.
 */
export function staffModifiers(member: Pick<StaffMember, "rating" | "role">): StaffModifier[] {
  const rating = member.rating;
  if (member.role === "OFFENSIVE_COORDINATOR" || member.role === "DEFENSIVE_COORDINATOR") {
    const side = member.role === "OFFENSIVE_COORDINATOR" ? "offensive" : "defensive";
    const centre = Math.round((0.3 + rating / 100 * 0.28) * 100);
    const spread = Math.round(clamp(0.32 - rating / 100 * 0.16, 0.08, 0.32) * 100);
    return [
      { label: `Installs the ${side} plan at`, value: `${centre}% before reps` },
      { label: "Week-to-week swing", value: `±${Math.round(spread / 2)}%` },
      { label: "Game preparation", value: `+${(rating * 1.4 / 100).toFixed(1)} to every unit` }
    ];
  }
  if (member.role === "HEAD_COACH") {
    return [
      { label: "Game preparation", value: `+${(rating * 1.2 / 100).toFixed(1)} to every unit` },
      { label: "Covers a missing coordinator at", value: `${Math.round(rating * 0.82)} effective` }
    ];
  }
  return [
    { label: "Game preparation", value: `+${(rating * 0.6 / 100).toFixed(1)} to every unit` },
    { label: "Weekly player growth", value: `+${Math.round(rating / 5)}%` },
    { label: "Roster fatigue recovery", value: `-${(rating / 30).toFixed(1)} a week` }
  ];
}

/**
 * What a coach of this calibre costs. Shared by league creation and the hiring
 * market so the two agree: without it, incumbents are priced at random and a
 * replacement can be both better and cheaper, which makes replacing free.
 */
export function staffSalary(rating: number, role: StaffRole): number {
  const roleWeight: Record<StaffRole, number> = {
    HEAD_COACH: 2.5,
    OFFENSIVE_COORDINATOR: 1,
    DEFENSIVE_COORDINATOR: 1,
    STRENGTH_COACH: 0.55
  };
  // Steep at the top: the difference between good and elite is a payroll decision.
  const base = 150_000 + Math.pow(Math.max(0, rating - 45), 2.6) * 40;
  return Math.round(base * roleWeight[role] / 1000) * 1000;
}

/**
 * Replacements available for a post. Drawn from the save seed so the market is
 * stable rather than re-rolled every time the screen is opened.
 */
export function staffCandidates(
  state: Readonly<GameState>,
  programId: string,
  staffId: string,
  nameFor: (ordinal: number) => string
): StaffCandidate[] {
  const outgoing = state.staff[staffId];
  const program = state.programs[programId];
  if (!outgoing || !program) return [];
  const rng = new AddressableRng(state.identity.rootSeed).fork("staff-market", String(state.season), programId, staffId);
  // A program's pull decides the calibre it can attract at all.
  const ceiling = clamp(52 + program.prestige * 0.42 + program.nationalPress * 0.1, 55, 96);

  return [0, 1, 2].map((index) => {
    const rating = Math.round(clamp(rng.between(`${index}:rating`, ceiling - 22, ceiling), 40, 99));
    const salary = staffSalary(rating, outgoing.role);
    return {
      id: `${staffId}:candidate:${index}`,
      name: nameFor(Math.floor(rng.between(`${index}:name`, 0, 4_000))),
      role: outgoing.role,
      rating,
      salary,
      signingCost: Math.round(salary * 0.35),
      modifiers: staffModifiers({ rating, role: outgoing.role })
    };
  }).sort((left, right) => right.rating - left.rating);
}
