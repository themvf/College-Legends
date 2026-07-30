import type { DefensiveIdentity, OffensiveIdentity, Position, SchemeIdentity } from "@college-legends/model";

/**
 * Eleven on the field, and a rotation behind them.
 *
 * The previous model fielded a flat set of "starters" and totalled *twelve* on
 * offense, which is not a football team. But the naive fix — exactly eleven
 * players, each on for every play — is not one either. From a real snap-count
 * sheet (Chiefs, 61 offensive and 65 defensive snaps):
 *
 * ```
 * OL   5 men at 100%, one backup at 3%
 * QB   1 man at 100%
 * WR   93% / 80% / 72% / 10% / 5% / 2%   → 2.6 on the field, six men used
 * TE   84% / 41% / 8%                    → 1.3 on the field
 * RB   51% / 38% / 13%                   → 1.0 on the field, a true committee
 * DL   85% / 78% / 68% / 58% / 46% / 40% / 14% / 5%  → 3.9, eight men for four spots
 * LB   100% / 83% / 35% / 8%             → 2.3
 * DB   100% / 100% / 98% / 98% / 60% / 23% → 4.8
 * ```
 *
 * Both sides sum to eleven. Twenty-odd players take snaps. So the right model is
 * **spots on the field plus a snap share per man**, and the shape of the rotation
 * is position-specific: the rooms where fatigue actually bites — defensive line
 * and running back — rotate hardest, while the line and the quarterback never
 * come off.
 */

/** How many of a position are on the field on an average play. Sums to eleven. */
export const OFFENSIVE_SPOTS: Readonly<Record<OffensiveIdentity, Readonly<Partial<Record<Position, number>>>>> = {
  // 10 personnel. Four receivers, no tight end, one back who runs routes.
  AIR_RAID: { QB: 1, OL: 5, WR: 4, TE: 0, RB: 1 },
  // 11 personnel at tempo.
  SPREAD_TEMPO: { QB: 1, OL: 5, WR: 3, TE: 1, RB: 1 },
  // 11 personnel, the modern default.
  PRO_BALANCED: { QB: 1, OL: 5, WR: 3, TE: 1, RB: 1 },
  // 12 personnel. Second tight end instead of a third receiver.
  POWER_RUN: { QB: 1, OL: 5, WR: 2, TE: 2, RB: 1 },
  // Flexbone. Two backs in the game, receivers who block.
  TRIPLE_OPTION: { QB: 1, OL: 5, WR: 2, TE: 1, RB: 2 }
};

export const DEFENSIVE_SPOTS: Readonly<Record<DefensiveIdentity, Readonly<Partial<Record<Position, number>>>>> = {
  FOUR_THREE_BASE: { DL: 4, LB: 3, DB: 4 },
  NICKEL_PRESSURE: { DL: 4, LB: 2, DB: 5 },
  ZONE_BLITZ: { DL: 3, LB: 4, DB: 4 },
  BEND_DONT_BREAK: { DL: 3, LB: 3, DB: 5 }
};

/**
 * How flat a room's rotation is. Larger means more men share the spots, which is
 * what makes depth matter in the rooms where it actually does. Read straight off
 * the reference sheet above.
 */
const ROTATION_SPREAD: Readonly<Record<Position, number>> = {
  QB: 0.15,
  OL: 0.28,
  WR: 1.3,
  TE: 0.85,
  RB: 2.2,
  DL: 3.6,
  LB: 1.05,
  DB: 1.2,
  K: 0.15,
  P: 0.15
};

/**
 * Below this share a man is not really in the rotation and should not appear in a
 * box score. The reference sheet bottoms out at 2%, so that is the floor.
 */
export const MINIMUM_SNAP_SHARE = 0.02;

/** Nobody past this many deep in a room sees the field on offense or defense. */
function rotationSize(spots: number, available: number): number {
  if (spots <= 0) return 0;
  return Math.min(available, Math.max(1, Math.ceil(spots) + 3));
}

/**
 * Snap share per man in one room, best first. Sums to `spots`, and no share can
 * exceed 1 because a player cannot be on the field for more than every play.
 *
 * The clamp is what reproduces real football without authoring it: give the
 * offensive line five spots and a tight spread and the top five saturate at 100%
 * with the sixth man picking up the remainder, exactly as a real sheet reads.
 */
export function snapShares(position: Position, spots: number, available: number): number[] {
  const size = rotationSize(spots, available);
  if (size === 0 || spots <= 0) return [];
  const tau = ROTATION_SPREAD[position];
  const raw = Array.from({ length: size }, (_, index) => Math.exp(-index / Math.max(0.05, tau)));

  const shares = new Array<number>(size).fill(0);
  const locked = new Array<boolean>(size).fill(false);
  let remaining = Math.min(spots, size);

  // Water-filling: scale to the spots available, cap anyone over a full game at
  // one, then redistribute what they could not absorb to the men behind them.
  for (let pass = 0; pass < size + 1; pass += 1) {
    const openTotal = raw.reduce((total, weight, index) => total + (locked[index] ? 0 : weight), 0);
    if (openTotal <= 0 || remaining <= 1e-9) break;
    let overflowed = false;
    for (let index = 0; index < size; index += 1) {
      if (locked[index]) continue;
      const value = raw[index]! / openTotal * remaining;
      if (value > 1) overflowed = true;
      shares[index] = value;
    }
    if (!overflowed) break;
    for (let index = 0; index < size; index += 1) {
      if (locked[index] || shares[index]! <= 1) continue;
      shares[index] = 1;
      locked[index] = true;
      remaining -= 1;
    }
  }
  return shares.map((share) => Number(Math.max(0, Math.min(1, share)).toFixed(4)));
}

/** Spots on the field per position, given what the program runs. */
export function schemeSpots(identity: Readonly<SchemeIdentity> | undefined): Readonly<Partial<Record<Position, number>>> {
  if (!identity) return { ...OFFENSIVE_SPOTS.PRO_BALANCED, ...DEFENSIVE_SPOTS.FOUR_THREE_BASE, K: 1, P: 1 };
  return {
    ...OFFENSIVE_SPOTS[identity.offense],
    ...DEFENSIVE_SPOTS[identity.defense],
    K: 1,
    P: 1
  };
}

/** How many of a room the scheme puts on the field. Used by generation and the UI. */
export function spotsForRoom(identity: Readonly<SchemeIdentity> | undefined, position: Position): number {
  return schemeSpots(identity)[position] ?? 0;
}

/** Plain-language personnel grouping, for the scheme cards. */
export function personnelLabel(scheme: OffensiveIdentity): string {
  const spots = OFFENSIVE_SPOTS[scheme];
  const parts = [`${spots.WR} WR`];
  if ((spots.TE ?? 0) > 0) parts.push(`${spots.TE} TE`);
  parts.push(`${spots.RB} ${spots.RB === 1 ? "back" : "backs"}`);
  return parts.join(", ");
}
