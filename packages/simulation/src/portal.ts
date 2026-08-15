import type { GameState, PlayerId, PortalListingState, Player, ProgramId, Recruitable } from "@college-legends/model";
import { NIL_BASE_PRICE, NIL_SCORE_CEILING, nilPriorityWeight } from "./nil.js";

/**
 * The transfer portal — the one system that can add double-digit rating points
 * to a roster in a single offseason, because a portal player arrives finished
 * rather than at ~68 overall like a freshman.
 *
 * Two decisions are load-bearing and tuning must stay inside them. **A portal
 * player has no hype-versus-truth gap** — he has played real games on
 * television, so his ratings are public and there is nothing to scout; what he
 * costs is priced off production instead. And **his old program bids in the
 * same window as everybody else**, which makes retention the same market
 * played in the other direction rather than a second mechanism with its own
 * rules. See docs/OFFSEASON.md.
 */

/**
 * What the incumbent's existing relationship is worth when it bids to keep
 * him. Deliberately smaller than a recruit's `COMMITMENT_INERTIA_BONUS`: a man
 * who has already decided to leave is harder to hold than one who merely
 * verballed elsewhere.
 */
export const PORTAL_INCUMBENT_BONUS = 4;
/**
 * A bid has to be real to register at all. Without a floor, every program
 * blankets every listing with a one-point bid and the window stops being a
 * decision about where to concentrate.
 */
export const PORTAL_MINIMUM_POINTS = 5;
/** Nobody signs on interest alone; a listing below this goes unclaimed. */
export const PORTAL_COMMITMENT_THRESHOLD = 58;

const POSITION_PREMIUM: Record<string, number> = {
  QB: 1.5, WR: 1.2, DL: 1.2, RB: 1.1, DB: 1.1, TE: 1.05, LB: 1.05, OL: 1.0, K: 0.4, P: 0.4
};

/**
 * What a transfer costs a week. Convex in `overall` the same way a recruit's
 * price is convex in `hype` — but read off production, because there is no
 * consensus-versus-truth gap to exploit here. A 65-overall depth piece is
 * near the floor; an 85-overall starter is many times that.
 */
export function portalAskingPrice(player: Readonly<Player>): number {
  const productionCurve = Math.max(0.5, Math.pow(Math.max(0, player.overall - 40) / 25, 2.6));
  const positionPremium = POSITION_PREMIUM[player.position] ?? 1.0;
  return Math.max(100, Math.round(NIL_BASE_PRICE * productionCurve * positionPremium / 50) * 50);
}

/** The portal listing and the player read together as one contested recruit. */
export function portalRecruitable(player: Readonly<Player>, listing: Readonly<PortalListingState>): Recruitable {
  return {
    id: player.id,
    position: player.position,
    overall: player.overall,
    homeDivisionId: player.homeDivisionId,
    priorities: listing.priorities,
    interestByProgram: listing.interestByProgram
  };
}

/**
 * The money term, identical in shape to the recruiting market's: paying his
 * ask buys ~63% of the ceiling, double ~86%. Money decides a close contest and
 * never overcomes a player who does not want the program.
 */
export function portalNilScore(weeklyOffer: number, askingPrice: number, priorityWeight: number): number {
  if (weeklyOffer <= 0) return 0;
  return Number((NIL_SCORE_CEILING * (1 - Math.exp(-weeklyOffer / Math.max(1, askingPrice))) * priorityWeight).toFixed(3));
}

export function portalPriorityWeight(listing: Readonly<PortalListingState>): number {
  return nilPriorityWeight(listing);
}

export function portalListings(state: Readonly<GameState>): Record<PlayerId, PortalListingState> {
  return state.portal ?? {};
}

/** Weekly dollars a program has already promised to portal bids still live. */
export function reservedPortalNil(state: Readonly<GameState>, programId: ProgramId): number {
  return Object.values(portalListings(state))
    .reduce((sum, listing) => sum + (listing.bidsByProgram[programId]?.weeklyNil ?? 0), 0);
}
