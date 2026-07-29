import type {
  GameState,
  SchemeIdentity,
  PlanExecution,
  Program,
  StaffCandidate,
  StaffMember,
  StaffModifier,
  StaffRole
} from "@college-legends/model";
import { AddressableRng } from "./rng.js";
import { focusShare } from "./department.js";
import { coachSchemeFit, schemeFitLabel, OFFENSIVE_SCHEMES, DEFENSIVE_SCHEMES } from "./scheme.js";

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
  const identity = state.programs[programId]?.schemeIdentity;
  const coordinator = staff.find((member) => member.role === INSTALLER_ROLE[side]);
  const coordinatorShare = coordinator ? focusShare(coordinator, "PREPARE") : 0;
  if (coordinator && coordinatorShare >= 0.5) {
    // A coach installing someone else's scheme installs less of it. The plan is
    // never unavailable, only worse — the emphasis matchup matrix is calibrated
    // on every call staying selectable.
    const fit = identity ? coachSchemeFit(coordinator, identity) : 1;
    return {
      staff: coordinator,
      // Full attention is par; a coordinator splitting his week installs less.
      // Floored: a coordinator in the wrong scheme is worse, never worse than
      // having nobody install it at all.
      rating: Math.max(42, coordinator.rating * (0.72 + coordinatorShare * 0.28) * fit),
      name: coordinator.name,
      note: fit < 0.9
        ? `Coordinator installing a scheme that is not his (${schemeFitLabel(fit).toLowerCase()})`
        : coordinatorShare >= 0.99
          ? "Coordinator running it"
          : `Coordinator on it ${Math.round(coordinatorShare * 100)}% of his week`
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
  if (!installer.staff) limits.push("Nobody on staff is running practice. Your guys are figuring it out themselves.");
  else if (installer.note === "Head coach covering") limits.push(`${installer.name} is covering for a coordinator who's off doing something else.`);
  else if (installer.note.startsWith("Coordinator installing on")) limits.push(`${installer.name} is only part-time on game prep — the rest of his week is scouting or on the road recruiting.`);
  else if (installer.note.startsWith("Coordinator installing a scheme")) limits.push(`${installer.name} doesn't coach this scheme, so less of it holds up on Saturday.`);
  if (reps === 0) limits.push("You haven't put a single rep on this. They'll be walking through it.");
  if (reps >= MAXIMUM_REPS_PER_SIDE) limits.push("They've got this down cold. More reps just wear them out.");

  return {
    side,
    installerStaffId: installer.staff?.id ?? null,
    installerName: installer.name,
    installerRating: Math.round(installer.rating),
    reps,
    low,
    high,
    expected,
    summary: `${Math.round(low * 100)}–${Math.round(high * 100)}% of it holds up`,
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
 * What a staff member actually changes, at the hours he actually works and in
 * the scheme he is actually being asked to run.
 *
 * The first version computed everything from raw rating, so a card claiming
 * "installs at 51%" sat above a plan the engine ran at 47% — the coach was
 * splitting his week and coaching somebody else's scheme, and the card knew
 * neither. A posted number that disagrees with the engine is worse than no
 * number, and "payoffs are visible" is a load-bearing invariant.
 */
export function staffModifiers(
  member: Pick<StaffMember, "rating" | "role">,
  context?: { schemeFit?: number; prepareShare?: number; facilityBonus?: number }
): StaffModifier[] {
  const rating = member.rating;
  const fit = context?.schemeFit ?? 1;
  const share = context?.prepareShare ?? 1;
  const facilityBonus = context?.facilityBonus ?? 0;
  const prep = (roleWeight: number): string => `+${(rating * roleWeight * share / 100).toFixed(1)} to every unit`;

  if (member.role === "OFFENSIVE_COORDINATOR" || member.role === "DEFENSIVE_COORDINATOR") {
    const side = member.role === "OFFENSIVE_COORDINATOR" ? "offense" : "defense";
    const effective = Math.max(42, rating * (0.72 + clamp(share, 0, 1) * 0.28) * fit);
    // Includes the weight-room term planExecution applies, so the posted
    // number is the number the engine will actually run.
    const centre = Math.round((0.3 + effective / 100 * 0.28 + facilityBonus) * 100);
    const spread = Math.round(clamp(0.32 - effective / 100 * 0.16, 0.08, 0.32) * 100);
    const modifiers: StaffModifier[] = [
      { label: `Gets your ${side} installed to`, value: `${centre}% before practice reps` },
      { label: "Week to week, that swings", value: `±${Math.round(spread / 2)}%` },
      { label: "Game prep", value: prep(1.4) }
    ];
    if (fit < 0.99) modifiers.push({ label: "Running a scheme that isn't his costs", value: `${Math.round((1 - fit) * 100)}% of what he'd do` });
    return modifiers;
  }
  if (member.role === "HEAD_COACH") {
    return [
      { label: "Game prep", value: prep(1.15) },
      { label: "Fills in for a missing coordinator at", value: `${Math.round(rating * 0.82)} effective` }
    ];
  }
  return [
    { label: "Game prep", value: prep(0.55) },
    { label: "Weekly player growth", value: `+${Math.round(rating / 5)}%` },
    { label: "Knocks off fatigue", value: `-${(rating / 30).toFixed(1)} a week` }
  ];
}

/** The card for a coach who is actually on staff, with his real hours and scheme. */
export function staffCard(state: Readonly<GameState>, programId: string, staffId: string): StaffModifier[] {
  const member = state.staff[staffId];
  const program = state.programs[programId];
  if (!member || !program) return [];
  return staffModifiers(member, {
    schemeFit: coachSchemeFit(member, program.schemeIdentity),
    prepareShare: focusShare(member, "PREPARE"),
    facilityBonus: Math.max(0, program.facilities.TRAINING - 1) * 0.012
  });
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

  const identity = program.schemeIdentity;
  // Two above the ceiling are shown anyway, greyed out. A silent cap teaches
  // nothing; a named one turns prestige into a goal.
  return [0, 1, 2, 3, 4].map((index) => {
    const reach = index >= 3;
    const rating = reach
      ? Math.round(clamp(rng.between(`${index}:reach-rating`, ceiling + 3, ceiling + 14), 40, 99))
      : Math.round(clamp(rng.between(`${index}:rating`, ceiling - 22, ceiling), 40, 99));
    const salary = staffSalary(rating, outgoing.role);
    const schemePreference: SchemeIdentity = {
      offense: OFFENSIVE_SCHEMES[Math.floor(rng.between(`${index}:offense`, 0, OFFENSIVE_SCHEMES.length - 0.0001))]!,
      defense: DEFENSIVE_SCHEMES[Math.floor(rng.between(`${index}:defense`, 0, DEFENSIVE_SCHEMES.length - 0.0001))]!
    };
    const fit = coachSchemeFit({ role: outgoing.role, schemePreference }, identity);
    return {
      id: `${staffId}:candidate:${index}`,
      name: nameFor(Math.floor(rng.between(`${index}:name`, 0, 4_000))),
      role: outgoing.role,
      rating,
      salary,
      signingCost: Math.round(salary * 0.35),
      // Priced against the post he would fill, so the card compares like for like.
      modifiers: staffModifiers({ rating, role: outgoing.role }, {
        schemeFit: fit,
        prepareShare: focusShare(outgoing, "PREPARE"),
        facilityBonus: Math.max(0, program.facilities.TRAINING - 1) * 0.012
      }),
      schemePreference,
      schemeFit: fit,
      schemeFitNote: schemeFitLabel(fit),
      unavailableReason: reach
        ? `Won\u2019t return your calls — ${program.name} isn\u2019t a big enough job yet.`
        : null
    };
  }).sort((left, right) => Number(Boolean(left.unavailableReason)) - Number(Boolean(right.unavailableReason)) || right.rating - left.rating);
}
