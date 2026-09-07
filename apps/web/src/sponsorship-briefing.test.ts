import { describe, expect, it } from "vitest";
import type { GameCommand } from "@college-legends/model";
import { advanceWeek, beginSeason, createFictionalLeague, sponsorshipDecision, weeklyBriefing } from "@college-legends/simulation";

function fixture() {
  const state = beginSeason(createFictionalLeague("sponsor-briefing", 12));
  const programId = Object.keys(state.programs)[0]!;
  const offers = state.sponsorships[programId]!.offers;
  const command = (offerId: string): GameCommand => ({ type: "ACCEPT_SPONSORSHIP", programId, offerId });
  const briefing = (pendingCommands: GameCommand[] = []) => weeklyBriefing(state, programId, { pendingCommands });
  const sponsor = (pendingCommands: GameCommand[] = []) => briefing(pendingCommands).find((item) => item.id === "SPONSORSHIP");
  return { state, programId, offers, command, briefing, sponsor };
}

describe("sponsorship effective briefing", () => {
  it("names the queued choice without claiming a signature or counting it as attention", () => {
    const { state, offers, command, briefing, sponsor } = fixture();
    const before = structuredClone(state);
    expect(sponsor()?.status).toBe("REQUIRED");
    const pending = [command(offers[0]!.id)];
    expect(sponsor(pending)).toMatchObject({ status: "PENDING", headline: `Primary sponsor · ${offers[0]!.sponsorName}`, destination: "FINANCES" });
    expect(sponsor(pending)?.detail).toContain("Queued for advance");
    expect(sponsor(pending)?.detail).toContain("not signed yet");
    expect(briefing(pending).filter((item) => item.status !== "PENDING").some((item) => item.id === "SPONSORSHIP")).toBe(false);
    expect(state).toEqual(before);
  });

  it("reprojects a replacement or removed queue instead of retaining stale confirmation", () => {
    const { offers, command, sponsor } = fixture();
    expect(sponsor([command(offers[0]!.id)])?.headline).toContain(offers[0]!.sponsorName);
    expect(sponsor([command(offers[1]!.id)])?.headline).toContain(offers[1]!.sponsorName);
    expect(sponsor([])?.status).toBe("REQUIRED");
  });

  it("does not confirm another program's choice or an unavailable offer", () => {
    const { state, programId, offers, command, sponsor } = fixture();
    const other = Object.keys(state.programs).find((id) => id !== programId)!;
    expect(sponsor([{ type: "ACCEPT_SPONSORSHIP", programId: other, offerId: offers[0]!.id }])?.status).toBe("REQUIRED");
    expect(sponsor([command("missing")])?.status).toBe("BLOCKED");
    state.sponsorships[programId]!.season -= 1;
    expect(sponsor([command(offers[0]!.id)])?.status).toBe("BLOCKED");
  });

  it("clears the pending row once committed state contains the active contract", () => {
    const { state, programId, offers, command, sponsor } = fixture();
    state.sponsorships[programId]!.activeContractId = offers[0]!.id;
    expect(sponsor()).toBeUndefined();
    expect(sponsor([command(offers[0]!.id)])).toBeUndefined();
  });

  it("keeps an unavailable queued choice blocked even after its market disappears", () => {
    const { state, programId, offers, command, sponsor } = fixture();
    const pending = [command(offers[0]!.id)];
    state.sponsorships[programId]!.offers = [];
    expect(sponsor(pending)?.status).toBe("BLOCKED");
    expect(sponsorshipDecision(state, programId, pending)).toMatchObject({ status: "BLOCKED", offers: [] });
  });

  it("settles only on advance and projects engine rejection as actionable when the queue is cleared", () => {
    const { state, programId, offers, command } = fixture();
    const accepted = advanceWeek(state, [command(offers[0]!.id)]);
    expect(sponsorshipDecision(accepted.state, programId)?.status).toBe("DONE");
    expect(accepted.events.some((event) => event.type === "SPONSORSHIP_ACCEPTED" && event.programId === programId)).toBe(true);
    const rejected = advanceWeek(state, [command("missing")]);
    expect(rejected.events.some((event) => event.type === "COMMAND_REJECTED" && event.command.type === "ACCEPT_SPONSORSHIP")).toBe(true);
    expect(sponsorshipDecision(rejected.state, programId)?.status).toBe("REQUIRED");
  });
});
