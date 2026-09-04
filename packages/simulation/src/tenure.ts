import type { GameState, JobReviewReason, JobVerdict, Program, ProgramId, SeasonHistory } from "@college-legends/model";

/**
 * Job security, and the only way to lose this game.
 *
 * The audit finding this closes: `coachSecurity` was written in three places —
 * set at creation, +10 for a coach award, +20 for a title — and every one of
 * them moved it *up*. Measured over five seasons across all seventy-two
 * programs, the league minimum never left its starting 45 and the average rose
 * by two. Nobody could be fired, so no decision anywhere in the game carried a
 * consequence. `championshipDeadline` was read in exactly one place in the
 * codebase: the UI, to print a mandate nothing ever checked.
 *
 * Three rules hold this together, and they are the reason it is arithmetic
 * rather than a roll:
 *
 * - **The board judges the number the player was already shown.** `expectedWins`
 *   is the same target `seasonExpectation` prints on the dashboard from week
 *   one. A season is graded against the figure it stated, or the header was a
 *   lie.
 * - **Security moves here and nowhere else.** The award and title bumps were
 *   removed from the season rollover and folded in below as named reasons. Two
 *   systems moving one number is how a posted projection drifts away from what
 *   the engine does, which GAME_DESIGN forbids.
 * - **No hidden roll.** `jobReview` consumes no RNG. It is a pure function of
 *   state, so the same call mid-season is a projection of the same verdict —
 *   the player can see the axe coming from week one, which is the difference
 *   between pressure and ambush.
 */

/** Points of security per win above or below the target. */
export const WIN_WEIGHT = 7;
/** Winning it all. Large enough to rescue a coach who was otherwise finished. */
export const CHAMPIONSHIP_BONUS = 25;
/** Reaching the twelve-team field without winning it. */
export const PLAYOFF_BONUS = 10;
/** Running the athletic department underwater for a season. */
export const INSOLVENCY_PENALTY = 20;
/**
 * Retained only so a save or a caller referring to it still resolves. An expired
 * mandate no longer subtracts anything — it ends the tenure outright. See the
 * comment in `jobReview` for the two defects that produced that change.
 *
 * @deprecated An expired mandate is a condition, not a penalty.
 */
export const MANDATE_FAILURE_PENALTY = 60;
/** A first-year coach inherited the roster, so his first review halves the damage. */
export const FIRST_YEAR_DISCOUNT = 0.5;

/** Security at or below this ends the tenure. */
export const DISMISSAL_THRESHOLD = 0;

/**
 * What a job of this standing is expected to win. Shared with the dashboard's
 * `seasonExpectation` so the stated target and the graded target cannot drift.
 */
export function expectedWins(tier: Program["tier"]): number {
  return tier === "POWER" ? 10 : tier === "MID" ? 7 : 5;
}

/**
 * What a chair is worth to its next occupant. Shared by league creation and by
 * the reset a dismissal performs, because a program that has just sacked
 * somebody must not immediately sack his replacement for inheriting a zero.
 *
 * **Patience lives in the target, not in the leash.** The first build set LOW
 * to 92 and, measured over six seasons of a 24-program league, the bottom of
 * the table never churned once: a low program is *already* forgiven by only
 * being asked for five wins, and starting it near the ceiling as well
 * double-counted the same mercy. Security fell from a minimum of 58 to 1 and
 * still nobody was ever dismissed.
 *
 * The tilt that remains is the real one — a blueblood is on the shortest leash
 * in the league — and it is small, because a bad program firing coaches often
 * is both true to the sport and where the coaching market gets its movement.
 */
export function startingSecurity(tier: Program["tier"]): number {
  return tier === "POWER" ? 45 : tier === "MID" ? 55 : 62;
}

/**
 * The named state of a chair, from a security number.
 *
 * These exist to be shown *early*. A coach who only learns he is in trouble in
 * the week he is sacked has been ambushed; one who has watched "Hot seat" sit
 * on his dashboard for half a season has been warned, and every decision he
 * made under it meant something.
 */
export function jobVerdict(security: number): JobVerdict {
  if (security <= DISMISSAL_THRESHOLD) return "FIRED";
  if (security < 15) return "FINAL_WARNING";
  if (security < 35) return "HOT_SEAT";
  if (security < 60) return "WATCHED";
  if (security < 85) return "SECURE";
  return "EXTENDED";
}

/** One line a UI can print without knowing anything about the arithmetic. */
export function jobVerdictLabel(verdict: JobVerdict): string {
  switch (verdict) {
    case "EXTENDED": return "Extension on the table";
    case "SECURE": return "Secure";
    case "WATCHED": return "Being watched";
    case "HOT_SEAT": return "Hot seat";
    case "FINAL_WARNING": return "Final warning";
    case "FIRED": return "Dismissed";
  }
}

export interface JobReview {
  programId: ProgramId;
  /** Wins the job is graded against. */
  target: number;
  wins: number;
  losses: number;
  securityBefore: number;
  securityAfter: number;
  /** Every signed movement, in the order the board would read them out. */
  reasons: JobReviewReason[];
  verdict: JobVerdict;
  /** False only when the verdict is FIRED. */
  survives: boolean;
  /** Seasons left on the mandate after this review, when the job carries one. */
  mandateSeasonsLeft: number | null;
  /** True on the one review where a title mandate ran out. Ends the tenure by itself. */
  mandateExpired: boolean;
}

const round = (value: number): number => Math.round(value);
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/**
 * What the board concludes about one program.
 *
 * Called twice with the same meaning: once by the UI during the season, where
 * it reads as "here is what happens if it ends like this", and once for real at
 * the board-review step. Same function, so the projection cannot disagree with
 * the verdict.
 *
 * The completed season is looked up here rather than passed in. An earlier
 * signature took it as an argument and immediately proved why that was wrong:
 * a caller who omitted it — which the UI would — got a review missing the
 * playoff and championship reasons, so the projection on screen disagreed with
 * the verdict the engine reached. The lookup only matches when the recorded
 * season *is* the current one, so during the regular season the previous year's
 * history is correctly ignored and the result reads as "if it ended today".
 */
export function jobReview(
  state: Readonly<GameState>,
  programId: ProgramId,
  historyOverride?: Readonly<SeasonHistory>
): JobReview | null {
  const program = state.programs[programId];
  if (!program) return null;
  const recorded = state.seasonHistory[state.seasonHistory.length - 1];
  const history = historyOverride ?? (recorded?.season === state.season ? recorded : undefined);

  const target = expectedWins(program.tier);
  const reasons: JobReviewReason[] = [];

  // Mid-season, the useful question is "if I finish like this", not "if the
  // season stopped this instant". Grading the raw record told a 4–0 team it was
  // on the hot seat, because four wins is six short of a power program's ten —
  // true of the record and false of the season. Once every game is played the
  // pace *is* the record, so the verdict at the board review is unchanged and
  // the projection still cannot drift from it.
  const played = program.wins + program.losses;
  const scheduled = state.schedule.filter(
    (game) => game.homeProgramId === programId || game.awayProgramId === programId
  ).length;
  const remaining = Math.max(0, scheduled - played);
  const projecting = remaining > 0 && played > 0;
  const wins = projecting ? Math.round((program.wins / played) * scheduled) : program.wins;
  const losses = projecting ? scheduled - wins : program.losses;
  const record = projecting
    ? `On pace for ${wins}–${losses}`
    : `${wins}–${losses}`;

  const winDelta = (wins - target) * WIN_WEIGHT;
  if (winDelta !== 0) {
    reasons.push({
      label: winDelta > 0
        ? `${record}, ${wins - target} clear of the ${target} they asked for`
        : `${record}, ${target - wins} short of the ${target} they asked for`,
      delta: winDelta
    });
  } else {
    reasons.push({ label: `${record}, exactly the ${target} they asked for`, delta: 0 });
  }

  const wonTitle = history?.nationalChampionProgramId === programId;
  const madePlayoff = history?.playoffSeeds.some((seed) => seed.programId === programId) ?? false;
  if (wonTitle) {
    reasons.push({ label: "Won the national championship", delta: CHAMPIONSHIP_BONUS });
  } else if (madePlayoff) {
    reasons.push({ label: "Reached the playoff", delta: PLAYOFF_BONUS });
  }

  if (program.budget < 0) {
    reasons.push({ label: "The athletic department finished the year underwater", delta: -INSOLVENCY_PENALTY });
  }

  // A first year is graded gently, because the roster was somebody else's. The
  // discount applies to the damage only — a coach who wins straight away gets
  // the full credit for it.
  const rookie = program.coachTenure === 0;
  if (rookie) {
    const damage = reasons.reduce((total, reason) => total + Math.min(0, reason.delta), 0);
    const forgiven = round(-damage * FIRST_YEAR_DISCOUNT);
    if (forgiven > 0) {
      reasons.push({ label: "First year in the job — the roster was inherited", delta: forgiven });
    }
  }

  // An expired mandate is a *condition*, not arithmetic.
  //
  // It was first built as a large penalty, and playing three seasons of a
  // Championship Mandate career showed why that is wrong twice over. A coach
  // who went 12-2, 13-1 and 14-1 banked about +31 a season, so the penalty was
  // something a winning program simply absorbed — a mandate a good coach
  // survives is not a mandate. And because the clock kept counting past zero,
  // the same penalty was charged again every following season against a
  // "-1 seasons left" that means nothing.
  //
  // Being hired to win a title and not winning one ends the tenure directly.
  // The reason carries no delta, so the printed arithmetic still sums exactly
  // to the movement while the verdict is decided by the condition.
  let mandateSeasonsLeft = program.championshipDeadline ?? null;
  let mandateExpired = false;
  if (history && mandateSeasonsLeft !== null) {
    if (wonTitle) {
      mandateSeasonsLeft = null;
      reasons.push({ label: "Championship mandate satisfied — the job is yours", delta: 0 });
    } else {
      mandateSeasonsLeft -= 1;
      if (mandateSeasonsLeft <= 0) {
        mandateSeasonsLeft = 0;
        mandateExpired = true;
        reasons.push({ label: "Hired to win a national title, and the time is up", delta: 0 });
      } else {
        reasons.push({
          label: `${mandateSeasonsLeft} ${mandateSeasonsLeft === 1 ? "season" : "seasons"} left to win a title`,
          delta: 0
        });
      }
    }
  }

  const movement = reasons.reduce((total, reason) => total + reason.delta, 0);
  const securityAfter = clamp(round(program.coachSecurity + movement), 0, 100);
  const verdict = mandateExpired ? "FIRED" : jobVerdict(securityAfter);

  return {
    programId,
    target,
    wins,
    losses,
    securityBefore: program.coachSecurity,
    securityAfter,
    reasons,
    verdict,
    survives: verdict !== "FIRED",
    mandateSeasonsLeft,
    mandateExpired
  };
}
