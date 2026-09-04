import type {
  GameState,
  DefensiveIdentity,
  SchemeIdentity,
  OffensiveIdentity,
  PlanExecution,
  Program,
  StaffCandidate,
  StaffMember,
  StaffModifier,
  StaffRole,
  StaffTrait
} from "@college-legends/model";
import { AddressableRng } from "./rng.js";
import {
  STAFF_TRAITS,
  focusShare,
  pickStaffTrait,
  strengthCoachBenefits,
  staffCapacity,
  staffSkills,
  traitAptitude
} from "./department.js";
import { coachSchemeFit, schemeFitLabel, planAlignment, OFFENSIVE_SCHEMES, DEFENSIVE_SCHEMES } from "./scheme.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

/**
 * A full install on one side is half a normal staff's prep week. At 12 a side
 * against a 26-point pool a program could max both and still have change, which
 * is why the practice screen had no decision on it. Sixteen prep-hours against
 * an 8-per-side cap means maxing both sides costs every hour you have — and
 * sending a coordinator scouting takes it straight out of Saturday.
 */
export const MAXIMUM_REPS_PER_SIDE = 8;

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
  side: "OFFENSE" | "DEFENSE",
  /**
   * What share of his week a coach would give preparation, for projecting a week
   * the player has not committed to yet. Without it the only way to post "if you
   * focus this, your offense installs at 78%" is to clone the whole state, which
   * is 17 MB at full league size and runs on every render.
   */
  shareOverride?: (member: StaffMember) => number
): { staff: StaffMember | null; rating: number; name: string; note: string } {
  const staff = Object.values(state.staff).filter((member) => member.programId === programId);
  const identity = state.programs[programId]?.schemeIdentity;
  const share = (member: StaffMember): number => shareOverride?.(member) ?? focusShare(member, "PREPARE");
  const coordinator = staff.find((member) => member.role === INSTALLER_ROLE[side]);
  const coordinatorShare = coordinator ? share(coordinator) : 0;
  // A third of his week, not half. A coordinator owes his own side of the ball a
  // floor of his time whatever else the staff is chasing, and that floor has to
  // sit above the handover threshold — otherwise focusing anywhere else drops a
  // side of the ball onto a head coach who is not preparing either, which is a
  // cliff rather than a trade.
  if (coordinator && coordinatorShare >= 0.34) {
    // A coach installing someone else's scheme installs less of it. The plan is
    // never unavailable, only worse — the emphasis matchup matrix is calibrated
    // on every call staying selectable.
    const fit = identity ? coachSchemeFit(coordinator, identity) : 1;
    return {
      staff: coordinator,
      // Full attention is par; a coordinator splitting his week installs less.
      // A tactician gets more of it in than a recruiter does. Floored: a
      // coordinator in the wrong scheme is worse, never worse than having
      // nobody install it at all.
      rating: Math.max(
        42,
        coordinator.rating * (0.72 + coordinatorShare * 0.28) * fit * traitAptitude(coordinator.trait, "PREPARE")
      ),
      name: coordinator.name,
      note: fit < 0.9
        ? `Coordinator installing a scheme that is not his (${schemeFitLabel(fit).toLowerCase()})`
        : coordinatorShare >= 0.99
          ? "Coordinator running it"
          : `Coordinator on it ${Math.round(coordinatorShare * 100)}% of his week`
    };
  }
  const headCoach = staff.find((member) => member.role === "HEAD_COACH");
  const headCoachShare = headCoach ? share(headCoach) : 0;
  if (headCoach && headCoachShare > 0) {
    // A head coach covering a coordinator's job does it worse than the specialist would.
    return {
      staff: headCoach,
      rating: headCoach.rating * 0.82 * (0.72 + headCoachShare * 0.28) * traitAptitude(headCoach.trait, "PREPARE"),
      name: headCoach.name,
      note: "Head coach covering"
    };
  }
  return { staff: null, rating: 38, name: "Nobody", note: "No coach is preparing the team" };
}

/**
 * What your staff would install a scheme at, before a single rep.
 *
 * The takeover screen posts a roster fit for every scheme and an install
 * percentage for the one you already run, and never relates them. A cold player
 * met the worst decision in the game at the start of season two — stay on a
 * 19–29% roster fit installed at 56%, or switch to an 89–99% fit installed at
 * 48% — and described it as two numbers moving in opposite directions, in
 * different units, with no exchange rate. Both numbers were on the screen; the
 * second one was only ever shown for the incumbent scheme, so the cost of
 * switching could not be read anywhere.
 *
 * Shares `staffModifiers`' arithmetic rather than repeating it, so the number
 * posted per option is the number the engine would run.
 */
export function installIfScheme(
  state: Readonly<GameState>,
  programId: string,
  side: "OFFENSE" | "DEFENSE",
  scheme: OffensiveIdentity | DefensiveIdentity
): number | null {
  const program = state.programs[programId];
  if (!program) return null;
  const coordinator = Object.values(state.staff).find((member) =>
    member.programId === programId && member.role === INSTALLER_ROLE[side]);
  if (!coordinator) return null;
  const identity: SchemeIdentity = side === "OFFENSE"
    ? { ...program.schemeIdentity, offense: scheme as OffensiveIdentity }
    : { ...program.schemeIdentity, defense: scheme as DefensiveIdentity };
  return installCentre(
    coordinator.rating,
    focusShare(coordinator, "PREPARE"),
    coachSchemeFit(coordinator, identity),
    traitAptitude(coordinator.trait, "PREPARE"),
    Math.max(0, program.facilities.TRAINING - 1) * 0.012
  );
}

/**
 * Where a coordinator's install band sits before reps. Extracted so the staff
 * card and the scheme picker cannot drift: a card that disagrees with the engine
 * breaks "payoffs are visible", and two copies of one formula is how that
 * happens.
 */
function installCentre(
  rating: number,
  share: number,
  fit: number,
  prepAptitude: number,
  facilityBonus: number
): number {
  const effective = Math.max(42, rating * (0.72 + clamp(share, 0, 1) * 0.28) * fit * prepAptitude);
  return Math.round((0.3 + effective / 100 * 0.28 + facilityBonus) * 100);
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
  repsOverride?: number,
  shareOverride?: (member: StaffMember) => number
): PlanExecution {
  const program = state.programs[programId];
  const preparation = state.preparation?.[programId];
  const reps = repsOverride ?? (side === "OFFENSE" ? preparation?.offensiveReps ?? 0 : preparation?.defensiveReps ?? 0);
  const installer = planInstaller(state, programId, side, shareOverride);

  const facility = program ? Math.max(0, program.facilities.TRAINING - 1) * 0.012 : 0;
  // Calling something the program does not run costs execution. A team is not a
  // menu — an Air Raid roster asked to grind it out is running a plan it has
  // never repped.
  const plan = state.gamePlans?.[programId];
  const alignment = program && plan ? planAlignment(plan, program.schemeIdentity, side) : 1;
  const base = (0.3 + installer.rating / 100 * 0.28) * alignment;
  const repsBonus = Math.sqrt(clamp(reps, 0, MAXIMUM_REPS_PER_SIDE) / MAXIMUM_REPS_PER_SIDE) * 0.26;
  // Reps still tire the roster, and now each one is worth more because there are
  // fewer of them to buy.
  // A camp spent on the playbook is still paying for the first few weeks.
  const camp = state.trainingCamp?.[programId];
  const campBonus = camp && camp.weeksRemaining > 0 && camp.focus === "INSTALL" ? TRAINING_CAMP_INSTALL_BONUS : 0;
  const uncampedCentre = base + repsBonus + facility;
  const centre = uncampedCentre + campBonus;
  const width = clamp(0.32 - installer.rating / 100 * 0.16, 0.08, 0.32);

  const low = Number(clamp(centre - width / 2, 0.1, 0.99).toFixed(3));
  const high = Number(clamp(centre + width / 2, 0.12, 0.99).toFixed(3));
  const uncampedLow = Number(clamp(uncampedCentre - width / 2, 0.1, 0.99).toFixed(3));
  const uncampedHigh = Number(clamp(uncampedCentre + width / 2, 0.12, 0.99).toFixed(3));
  const uncampedExpected = Number(((uncampedLow + uncampedHigh) / 2).toFixed(3));
  const expected = Number(clamp(uncampedExpected + campBonus, 0.1, 0.99).toFixed(3));

  const limits: string[] = [];
  if (!installer.staff) limits.push("Nobody on staff is running practice. Your guys are figuring it out themselves.");
  else if (installer.note === "Head coach covering") limits.push(`${installer.name} is covering for a coordinator who's off doing something else.`);
  else if (installer.note.startsWith("Coordinator installing on")) limits.push(`${installer.name} is only part-time on game prep — the rest of his week is scouting or on the road recruiting.`);
  else if (installer.note.startsWith("Coordinator installing a scheme")) limits.push(`${installer.name} doesn't coach this scheme, so less of it holds up on Saturday.`);
  if (alignment < 0.96) {
    limits.push(`This isn't what your program runs, so ${Math.round((1 - alignment) * 100)}% less of it holds up. Worth it only if the matchup is lopsided.`);
  }
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
  return Number((reps * 0.55).toFixed(2));
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
  member: Pick<StaffMember, "rating" | "role"> & { trait?: StaffTrait },
  context?: { schemeFit?: number; prepareShare?: number; facilityBonus?: number }
): StaffModifier[] {
  const rating = member.rating;
  const fit = context?.schemeFit ?? 1;
  const share = context?.prepareShare ?? 1;
  const facilityBonus = context?.facilityBonus ?? 0;
  const prepAptitude = traitAptitude(member.trait, "PREPARE");
  // Named, not counted. "All four phases" appeared on every staff card in the
  // game and the four were never listed on any screen that used it, so a cold
  // player read the most repeated phrase in the UI as four phases of nothing.
  const prep = (roleWeight: number): string =>
    `+${(rating * roleWeight * share * prepAptitude / 100).toFixed(1)} to your run game, pass game, run defense and pass defense`;

  if (member.role === "OFFENSIVE_COORDINATOR" || member.role === "DEFENSIVE_COORDINATOR") {
    const side = member.role === "OFFENSIVE_COORDINATOR" ? "offense" : "defense";
    const effective = Math.max(42, rating * (0.72 + clamp(share, 0, 1) * 0.28) * fit * prepAptitude);
    // Includes the weight-room term planExecution applies, so the posted
    // number is the number the engine will actually run.
    const centre = installCentre(rating, share, fit, prepAptitude, facilityBonus);
    const spread = Math.round(clamp(0.32 - effective / 100 * 0.16, 0.08, 0.32) * 100);
    const modifiers: StaffModifier[] = [
      { label: `Gets your ${side} installed to`, value: `${centre}% before practice reps` },
      { label: "Week to week, that swings", value: `±${Math.round(spread / 2)}%` },
      { label: "Game prep", value: prep(1.4) }
    ];
    // "Costs 45% of what he'd do" reads as "he delivers 45%". It means he loses
    // 45%, and a cold player only worked that out by switching schemes and
    // watching the number fall. Say the remainder, which cannot be read backwards.
    if (fit < 0.99) modifiers.push({
      label: "Coaching a scheme that isn't his",
      value: `you get ${Math.round(fit * 100)}% of what he'd do in his own`
    });
    return modifiers;
  }
  if (member.role === "HEAD_COACH") {
    return [
      { label: "Game prep", value: prep(1.15) },
      { label: "Fills in for a missing coordinator at", value: `${Math.round(rating * 0.82)} effective` }
    ];
  }
  const health = strengthCoachBenefits(member);
  return [
    { label: "Player strength gains", value: `+${health.strengthGrowthPercent}% per training week` },
    { label: "Fatigue recovery", value: `${health.fatigueRecoveryPoints} fatigue points per player per week` },
    { label: "Injury prevention", value: `${health.injuryRiskReductionPercent}% lower injury risk per player-game` },
    { label: "Injury recovery", value: `${health.extraRecoveryChancePercent}% chance to shorten an injury by 1 extra week` }
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
 * What is owed to a coach for ending his employment early. Priced off the
 * salary he was on, so `staffSalary`'s steep-at-the-top shape carries through
 * and firing an elite coach costs what it should — without a multi-year
 * contract model the engine does not carry.
 *
 * Load-bearing rather than decorative: replacing a coach used to charge only
 * the incoming man's signing cost, so an upgrade that was both better and
 * affordable was free on the way out.
 */
/**
 * How much of the new season camp still covers. Four weeks: long enough to
 * matter, short enough that camp is a start rather than a season-long buff
 * that makes the weekly priorities redundant.
 */
export const TRAINING_CAMP_WEEKS = 4;
/**
 * A head start on the playbook, against `planExecution`'s ~0.26 maximum from
 * a full week of reps — worth roughly a third of a drilled week, for four
 * weeks, and paid for in health.
 */
export const TRAINING_CAMP_INSTALL_BONUS = 0.05;
/** Both directions of the same trade, sized to match the CONDITIONING focus. */
export const TRAINING_CAMP_CONDITIONING_RISK = 0.85;
export const TRAINING_CAMP_INSTALL_RISK = 1.15;

export const BUYOUT_SALARY_FRACTION = 0.6;

export function staffBuyout(outgoing: Readonly<Pick<StaffMember, "salary">>): number {
  return Math.round(outgoing.salary * BUYOUT_SALARY_FRACTION);
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
  // Keyed on the post rather than the person, so hiring somebody does not
  // re-roll the market: a player who works down the list can still go back to
  // the coach he passed on.
  const rng = new AddressableRng(state.identity.rootSeed).fork("staff-market", String(state.season), programId, outgoing.role);
  // A program's pull decides the calibre it can attract at all.
  const ceiling = clamp(52 + program.prestige * 0.42 + program.nationalPress * 0.1, 55, 96);

  const identity = program.schemeIdentity;
  // Two above the ceiling are shown anyway, greyed out. A silent cap teaches
  // nothing; a named one turns prestige into a goal.
  return [0, 1, 2, 3, 4, 5].map((index) => {
    const reach = index >= 4;
    const rating = reach
      ? Math.round(clamp(rng.between(`${index}:reach-rating`, ceiling + 3, ceiling + 14), 40, 99))
      : Math.round(clamp(rng.between(`${index}:rating`, ceiling - 22, ceiling), 40, 99));
    const salary = staffSalary(rating, outgoing.role);
    // One coach in every market runs what the program runs.
    //
    // Measured across six leagues before this existed: of the coordinator posts
    // the dashboard flags REQUIRED — "he installs about 30% less of it than a
    // coach who knows the scheme; replace him, or change what you run" — 10% had
    // no reachable candidate clearing the same 0.78 fit the item is raised at,
    // and 6% had nobody better than the incumbent at all. Scheme is only
    // changeable in the preseason, so for those posts both branches of a
    // REQUIRED instruction were unavailable and the item stood for the rest of
    // the career. A briefing the player cannot act on teaches them to stop
    // reading the briefing, which costs more than the item was ever worth.
    //
    // Index 0 is always reachable, and overriding him shifts nothing else:
    // `AddressableRng` keys on the path rather than on call order, so the draws
    // this skips were never feeding any other candidate.
    const schemePreference: SchemeIdentity = index === 0 ? { ...identity } : {
      offense: OFFENSIVE_SCHEMES[Math.floor(rng.between(`${index}:offense`, 0, OFFENSIVE_SCHEMES.length - 0.0001))]!,
      defense: DEFENSIVE_SCHEMES[Math.floor(rng.between(`${index}:defense`, 0, DEFENSIVE_SCHEMES.length - 0.0001))]!
    };
    const fit = coachSchemeFit({ role: outgoing.role, schemePreference }, identity);
    const trait = pickStaffTrait(outgoing.role, rng.at(`${index}:trait`));
    const profile = STAFF_TRAITS[trait];
    return {
      id: `${programId}:${outgoing.role}:candidate:${index}`,
      name: nameFor(Math.floor(rng.between(`${index}:name`, 0, 4_000))),
      role: outgoing.role,
      rating,
      salary,
      signingCost: Math.round(salary * 0.35),
      // Priced against the post he would fill, so the card compares like for like.
      modifiers: staffModifiers({ rating, role: outgoing.role, trait }, {
        schemeFit: fit,
        prepareShare: focusShare(outgoing, "PREPARE"),
        facilityBonus: Math.max(0, program.facilities.TRAINING - 1) * 0.012
      }),
      trait,
      traitLabel: profile.label,
      traitBlurb: profile.blurb,
      hours: staffCapacity(rating, trait),
      skills: staffSkills({ rating, role: outgoing.role, trait }),
      schemePreference,
      schemeFit: fit,
      schemeFitNote: schemeFitLabel(fit),
      unavailableReason: reach
        ? `Won\u2019t return your calls — ${program.name} isn\u2019t a big enough job yet.`
        : null
    };
  }).sort((left, right) => Number(Boolean(left.unavailableReason)) - Number(Boolean(right.unavailableReason)) || right.rating - left.rating);
}
