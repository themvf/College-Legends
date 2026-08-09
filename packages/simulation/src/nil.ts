import type { GameState, NilProgramState, Program, ProgramId, Prospect } from "@college-legends/model";

/**
 * NIL — weekly dollars offered to recruits, capped by donor capacity.
 *
 * Every constant here is a hypothesis tuned by the committed tests in
 * `tests/nil.test.mjs`; the three *decisions* are settled and tuning must stay
 * inside them: deals charge from commitment, money is a tiebreaker (a maxed
 * offer stays under the priorities/fit gap), and the drain is moderate.
 * See docs/NIL_RECRUITING.md.
 */

/** Weekly donor dollars per thousand fans, before the multipliers. */
export const NIL_DOLLARS_PER_THOUSAND_FANS = 700;
/** Every national title is a permanent weekly annuity from the donor base. */
export const NIL_TITLE_ANNUITY = 4_000;
/** Weekly asking-price floor for the least hyped prospect at a discount position. */
export const NIL_BASE_PRICE = 400;
/**
 * What a fully saturated offer is worth in the recruiting market. Deliberately
 * under the priorities/fit gap (fit contributes 0–35, interest 10–26): money
 * decides a close contest and never overcomes "he doesn't want you".
 */
export const NIL_SCORE_CEILING = 14;
/** Withdrawing an offer is remembered: a flat, deterministic interest cost. */
export const NIL_WITHDRAWAL_INTEREST_PENALTY = 6;

const POSITION_PREMIUM: Record<string, number> = {
  QB: 1.5, WR: 1.2, DL: 1.2, RB: 1.1, DB: 1.1, TE: 1.05, LB: 1.05, OL: 1.0, K: 0.4, P: 0.4
};

export function emptyNilState(): NilProgramState {
  return { offersByProspect: {}, commitmentsByPlayer: {} };
}

export function nilState(state: Readonly<GameState>, programId: ProgramId): NilProgramState {
  return state.nil?.[programId] ?? emptyNilState();
}

/**
 * The ceiling. Derived from what the program has earned — fans, support,
 * prestige, titles, donor culture — and money cannot raise it. A LOW program
 * opens near $20K a week; a POWER program near $130K; a diehard out-raises a
 * front-runner with the same fan count through `donorCulture` alone.
 */
export function weeklyDonorCapacity(program: Readonly<Program>): number {
  const supportMultiplier = 0.6 + (program.fanSupport / 100) * 0.7;
  const prestigeMultiplier = 0.7 + (program.prestige / 100) * 0.55;
  return Math.round(
    (program.fanBase / 1000) * NIL_DOLLARS_PER_THOUSAND_FANS
      * supportMultiplier
      * prestigeMultiplier
      * program.donorCulture
      + program.championships * NIL_TITLE_ANNUITY
  );
}

/**
 * What the market thinks he costs a week. Prices the consensus (`hype`), not
 * the truth (`potential`) — over-hyped busts are expensive and hidden gems are
 * cheap, which is what gives scouting a cash payoff. Flat across programs
 * except the home discount: a kid who wants to stay close comes cheaper to the
 * programs he grew up watching.
 */
export function nilAskingPrice(prospect: Readonly<Prospect>, program?: Readonly<Program>): number {
  // Convex in hype: 55 hype ≈ 1x, 80 hype ≈ 6x.
  const hypeCurve = Math.max(0.5, Math.pow(Math.max(0, prospect.hype - 30) / 25, 2.6));
  const positionPremium = POSITION_PREMIUM[prospect.position] ?? 1.0;
  const stardomPremium = prospect.priorities.includes("PERSONAL_STARDOM") ? 1.4 : 1.0;
  const homeDiscount = program && prospect.priorities.includes("CLOSE_TO_HOME")
    && prospect.homeDivisionId === program.divisionId ? 0.75 : 1.0;
  return Math.max(100, Math.round(NIL_BASE_PRICE * hypeCurve * positionPremium * stardomPremium * homeDiscount / 50) * 50);
}

/**
 * How much a prospect cares about the money. Strong on a stardom chaser, weak
 * on a kid choosing home or the classroom — the low-tier strategy stays
 * "serve the priorities you can serve", not "outbid".
 */
export function nilPriorityWeight(prospect: Readonly<Pick<Prospect, "priorities">>): number {
  if (prospect.priorities.includes("PERSONAL_STARDOM")) return 1.35;
  if (prospect.priorities.includes("CLOSE_TO_HOME") || prospect.priorities.includes("ACADEMICS")) return 0.65;
  return 1.0;
}

/**
 * The market term an offer buys, on a curve the slider makes visible: paying
 * his ask buys ~63% of the ceiling, double ~86%, quadruple ~98%. Doubling the
 * offer never doubles the odds.
 */
export function nilScore(weeklyOffer: number, askingPrice: number, prospect: Readonly<Prospect>): number {
  if (weeklyOffer <= 0) return 0;
  return Number((NIL_SCORE_CEILING * (1 - Math.exp(-weeklyOffer / Math.max(1, askingPrice))) * nilPriorityWeight(prospect)).toFixed(3));
}

/** Weekly dollars already promised to rostered players. */
export function committedNilTotal(state: Readonly<GameState>, programId: ProgramId): number {
  return Object.values(nilState(state, programId).commitmentsByPlayer).reduce((sum, amount) => sum + amount, 0);
}

/** Weekly dollars reserved by live offers to prospects still on the board. */
export function reservedNilTotal(state: Readonly<GameState>, programId: ProgramId): number {
  return Object.values(nilState(state, programId).offersByProspect).reduce((sum, amount) => sum + amount, 0);
}

/**
 * What is left to offer. Committed and reserved dollars both count against the
 * ceiling, so a program cannot dangle the same money at six quarterbacks —
 * the reservation is the portfolio decision.
 */
export function freeNilCapacity(state: Readonly<GameState>, programId: ProgramId): number {
  const program = state.programs[programId];
  if (!program) return 0;
  return weeklyDonorCapacity(program) - committedNilTotal(state, programId) - reservedNilTotal(state, programId);
}

/**
 * The asking-price band an unscouted program sees. One evaluation narrows it;
 * two reveal it exactly — scouting a recruit tells you what he wants, not just
 * what he is.
 */
export function nilAskingPriceRange(
  prospect: Readonly<Prospect>,
  evaluationCount: number,
  program?: Readonly<Program>
): { low: number; high: number; exact: boolean } {
  const price = nilAskingPrice(prospect, program);
  if (evaluationCount >= 2) return { low: price, high: price, exact: true };
  const spread = evaluationCount >= 1 ? 0.25 : 0.65;
  return {
    low: Math.max(100, Math.round(price * (1 - spread) / 50) * 50),
    high: Math.round(price * (1 + spread) / 50) * 50,
    exact: false
  };
}
