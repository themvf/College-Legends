import type { DecisionStatus, GameCommand, GameState, SponsorshipOffer } from "@college-legends/model";

export interface SponsorshipDecisionView {
  status: Extract<DecisionStatus, "REQUIRED" | "PENDING" | "BLOCKED" | "DONE">;
  offers: readonly SponsorshipOffer[];
  activeOffer: SponsorshipOffer | undefined;
  queuedOffer: SponsorshipOffer | undefined;
  detail: string;
}

/** One pure effective-plan view for the briefing and sponsor controls. */
export function sponsorshipDecision(
  state: Readonly<GameState>, programId: string, pending: readonly GameCommand[] = []
): SponsorshipDecisionView | null {
  const market = state.sponsorships?.[programId];
  const offers = market?.season === state.season ? market.offers : [];
  const activeOffer = offers.find((offer) => offer.id === market?.activeContractId);
  const queued = pending.find((command) => command.type === "ACCEPT_SPONSORSHIP" && command.programId === programId);
  if (activeOffer) return { status: "DONE", offers, activeOffer, queuedOffer: undefined, detail: "Signed for this season." };
  if (queued?.type === "ACCEPT_SPONSORSHIP") {
    const queuedOffer = offers.find((offer) => offer.id === queued.offerId);
    return {
      status: queuedOffer ? "PENDING" : "BLOCKED", offers, activeOffer, queuedOffer,
      detail: queuedOffer
        ? `Queued for advance · $${queuedOffer.weeklyPayment.toLocaleString()} guaranteed every week. The contract is not signed yet.`
        : offers.length > 0
          ? "That sponsorship offer is no longer available. Choose an available contract to replace the queued choice."
          : "That sponsorship offer is no longer available. There are no current contracts to choose from."
    };
  }
  if (!offers.length) return null;
  const safest = offers.reduce((best, offer) => offer.weeklyPayment > best.weeklyPayment ? offer : best);
  return {
    status: "REQUIRED", offers, activeOffer, queuedOffer: undefined,
    detail: `${safest.sponsorName} is offering $${safest.weeklyPayment.toLocaleString()} guaranteed every week. A week without a contract is money you cannot recover later.`
  };
}
