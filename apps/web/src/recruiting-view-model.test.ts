import { describe, expect, it } from "vitest";
import type { GameCommand, Position } from "@college-legends/model";
import { beginSeason, createFictionalLeague, MAX_VISITS_PER_SEASON, VISIT_COST } from "@college-legends/simulation";
import {
  buildPositionRooms,
  buildProspectBoard,
  buildRecruitingLedger,
  filterAndSortProspects,
  queuedRecruitingCost,
  recruitingCommandKey
} from "./recruiting-view-model.js";

function fixture(seed = "war-room-view-model") {
  const state = beginSeason(createFictionalLeague(seed, 12));
  const programId = Object.keys(state.programs)[0]!;
  return { state, programId };
}

describe("recruiting command projections", () => {
  it("keeps visits and NIL offers distinct for every prospect", () => {
    const visit = { type: "SCHEDULE_VISIT", programId: "program-1", prospectId: "prospect-1" } satisfies GameCommand;
    const nil = { type: "SET_NIL_OFFER", programId: "program-1", prospectId: "prospect-1", weeklyAmount: 500 } satisfies GameCommand;
    const otherNil = { ...nil, prospectId: "prospect-2" } satisfies GameCommand;
    expect(recruitingCommandKey(visit)).not.toBe(recruitingCommandKey(nil));
    expect(recruitingCommandKey(nil)).not.toBe(recruitingCommandKey(otherNil));
    expect(queuedRecruitingCost(visit)).toBe(VISIT_COST);
  });

  it("projects queued visits, points, scholarship offers, and weekly NIL together", () => {
    const { state, programId } = fixture();
    const recruiting = state.recruiting[programId]!;
    const [first, second] = recruiting.discoveredProspectIds;
    const pending: GameCommand[] = [
      { type: "OFFER_PROSPECT", programId, prospectId: first!, extend: true },
      { type: "SCHEDULE_VISIT", programId, prospectId: first! },
      { type: "SET_NIL_OFFER", programId, prospectId: first!, weeklyAmount: 500 },
      { type: "SET_NIL_OFFER", programId, prospectId: second!, weeklyAmount: 750 }
    ];
    const ledger = buildRecruitingLedger(state, programId, pending);
    expect(ledger.pointsAvailable).toBe(recruiting.points - VISIT_COST);
    expect(ledger.visitsRemaining).toBe(MAX_VISITS_PER_SEASON - 1);
    expect(ledger.effectiveScholarshipOffers.has(first!)).toBe(true);
    expect(ledger.nilReserved).toBe(1250);
    expect(ledger.nilFree).toBe(Math.max(0, ledger.nilCapacity - ledger.nilCommitted - 1250));
  });
});

describe("recruiting board view model", () => {
  it("does not leak gated scouting values and sorts unknown values last", () => {
    const { state, programId } = fixture("war-room-gates");
    const [knownId] = state.recruiting[programId]!.discoveredProspectIds;
    state.recruiting[programId]!.scoutingByProspect[knownId!]!.evaluations.push("BASIC", "CHARACTER");
    const ledger = buildRecruitingLedger(state, programId, []);
    const rooms = buildPositionRooms(state, programId);
    const board = buildProspectBoard(state, programId, [], ledger);
    const known = board.find((item) => item.prospect.id === knownId)!;
    const unknown = board.find((item) => item.prospect.id !== knownId)!;
    expect(known.report.overall).not.toBe("Unknown");
    expect(known.report.fitScore).not.toBeNull();
    expect(unknown.report.overall).toBe("Unknown");
    expect(unknown.report.fitScore).toBeNull();
    const sorted = filterAndSortProspects(board, { query: "", position: "ALL", status: "ALL", offeredOnly: false, sort: "OVERALL" }, rooms);
    expect(sorted.at(-1)?.report.overall).toBe("Unknown");
  });

  it("derives transparent position-room planning without changing eligibility", () => {
    const { state, programId } = fixture("war-room-rooms");
    const rooms = buildPositionRooms(state, programId);
    for (const position of Object.keys(rooms) as Position[]) {
      const room = rooms[position];
      expect(room.projected).toBe(room.expectedReturners + room.incoming);
      expect(["THIN", "BALANCED", "CROWDED"]).toContain(room.plan);
      expect(room.target).toBeGreaterThan(0);
    }
  });
});
