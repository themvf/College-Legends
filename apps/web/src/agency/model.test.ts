import { describe, it, expect } from "vitest";
import {
  startAgency,
  decideAgency,
  advanceAgency,
  clientList,
  standings,
  restore,
  roll,
  draftPayout,
  type State,
} from "./model.js";
const signed = (seed = 42) =>
  decideAgency(startAgency(seed), {
    type: "pitch",
    id: "2027-0",
    promise: "Development",
    fee: 15,
  });
function through(s: State, week: number) {
  while (s.week < week && !s.failed) s = advanceAgency(s);
  return s;
}
describe("agency career", () => {
  it("starts with five distinct rivals and no clients; first matching overlooked pitch is accessible", () => {
    const s = startAgency(42);
    expect(s.rivals.map((r) => r.tier)).toEqual([
      "Established leader",
      "Established leader",
      "Mid-sized",
      "Mid-sized",
      "Newcomer",
    ]);
    expect(clientList(s)).toHaveLength(0);
    expect(() => advanceAgency(s)).toThrow();
    const n = signed();
    expect(clientList(n)).toHaveLength(1);
    expect(n.money).toBe(98000);
    expect(s.money).toBe(100000);
    expect(() =>
      decideAgency(n, {
        type: "pitch",
        id: "2027-0",
        promise: "Development",
        fee: 15,
      }),
    ).toThrow();
  });
  it("accounts for commercial client earnings separately and pays commission once", () => {
    let s = signed();
    s = decideAgency(s, {
      type: "deal",
      id: "2027-0",
      kind: 0,
      performance: false,
    });
    const deal = s.deals[0]!;
    expect(s.money).toBe(97200);
    s = through(s, 2);
    expect(
      s.ledger.filter((l) => l.kind === "Commission").map((l) => l.amount),
    ).toEqual([Math.round(deal.gross * 0.15)]);
    expect(s.deals[0]!.status).toBe("Paid");
    const expected = s.money;
    s = advanceAgency(s);
    expect(s.money).toBe(expected - 1500);
    expect(() =>
      decideAgency(s, {
        type: "deal",
        id: "2027-0",
        kind: 0,
        performance: false,
      }),
    ).toThrow();
  });
  it("limits development and makes media distinct from football ability", () => {
    let s = signed();
    const ability = clientList(s)[0]!.ability;
    s = decideAgency(s, {
      type: "job",
      id: "2027-0",
      focus: "Media",
      specialist: 1,
      venue: 1,
      partner: "",
      duration: 2,
      intensity: false,
    });
    expect(() =>
      decideAgency(s, {
        type: "job",
        id: "2027-0",
        focus: "Technique",
        specialist: 0,
        venue: 0,
        partner: "",
        duration: 2,
        intensity: false,
      }),
    ).toThrow();
    s = through(s, 2);
    expect(clientList(s)[0]!.ability).toBe(ability);
    expect(clientList(s)[0]!.recognition).toBeGreaterThan(20);
    expect(s.jobs).toHaveLength(0);
  });
  it("preserves full weekly client stats, team records and postseason results", () => {
    let s = through(signed(), 12);
    expect(s.recaps).toHaveLength(12);
    expect(clientList(s)[0]!.boxes).toHaveLength(12);
    expect(standings(s).every((t) => t.wins + t.losses === 12)).toBe(true);
    expect(standings(s).reduce((n, t) => n + t.wins, 0)).toBe(96);
    expect(s.honors.filter((h) => h.week === 0)).toHaveLength(6);
    expect(s.honors.filter((h) => h.week > 0)).toHaveLength(24);
    expect(s.matches.filter((m) => m.week === 13)).toHaveLength(2);
    s = through(s, 14);
    expect(s.matches.find((m) => m.week === 14)!.hs).not.toBeNull();
  });
  it("has rivals sign available players and spend finite cash on preparation", () => {
    let s = signed();
    const r = s.rivals[4]!,
      cash = r.cash;
    s = through(s, 6);
    expect(s.players.some((p) => p.owner === r.id)).toBe(true);
    expect(s.rivals[4]!.cash).not.toBe(cash);
    s = through(s, 15);
    expect(
      s.players.some((p) => p.owner === "summit" && p.prep?.resolved),
    ).toBe(true);
  });
  it("books Pro Day once, respects timing and separates evaluation from selection", () => {
    let s = signed();
    expect(() =>
      decideAgency(s, {
        type: "prep",
        id: "2027-0",
        level: 0,
        focus: "Testing",
        travel: false,
        recovery: false,
      }),
    ).toThrow();
    s = through(s, 12);
    const before = s.money;
    s = decideAgency(s, {
      type: "prep",
      id: "2027-0",
      level: 1,
      focus: "Testing",
      travel: true,
      recovery: true,
    });
    expect(s.money).toBe(before - 25000);
    expect(() =>
      decideAgency(s, {
        type: "prep",
        id: "2027-0",
        level: 0,
        focus: "Testing",
        travel: false,
        recovery: false,
      }),
    ).toThrow();
    s = through(s, 15);
    const p = clientList(s)[0]!;
    expect(p.testing).toBeGreaterThan(0);
    expect(p.pick).toBeNull();
    expect(p.prep!.resolved).toBe(true);
  });
  it("assigns unique actual draft slots and reconciles every agency dollar", () => {
    const s = through(signed(81), 18);
    const picks = s.players.filter((p) => p.pick).map((p) => p.pick);
    expect(new Set(picks).size).toBe(picks.length);
    expect(picks.every((p) => p! >= 1 && p! <= 224)).toBe(true);
    expect(s.money).toBe(100000 + s.ledger.reduce((n, l) => n + l.amount, 0));
    expect(s.recaps).toHaveLength(18);
    expect(s.players.every((p) => p.status !== "College")).toBe(true);
  });
  it("pays draft, roster and continuing professional milestones without paying college income twice", () => {
    let s = signed(3);
    const p = clientList(s)[0]!;
    p.ability = 96;
    p.ceiling = 98;
    p.trust = 90;
    s = through(s, 16);
    const draft = clientList(s)[0]!;
    expect(draft.pick).not.toBeNull();
    expect(
      s.ledger.some(
        (l) => l.amount === draftPayout(draft.pick!) && l.kind === "Pro income",
      ),
    ).toBe(true);
    s = through(s, 18);
    expect(clientList(s)[0]!.status).toBe("Pro");
    const before = s.money;
    s = advanceAgency(s);
    expect(s.year).toBe(2028);
    expect(s.week).toBe(0);
    expect(s.money).toBe(before + 22000);
    expect(clientList(s)[0]!.status).toBe("Pro");
    expect(s.players.filter((p) => p.season === 2028)).toHaveLength(80);
  });
  it("offers signed, tryout and unsigned paths, with paid outreach improving signing odds", () => {
    const outcomes = new Set<string>();
    let organic = 0,
      supported = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const s = signed(seed);
      s.week = 16;
      const p = clientList(s)[0]!;
      p.status = "Undrafted";
      p.ability = 70;
      const normal = advanceAgency(s);
      const assisted = advanceAgency(
        decideAgency(s, { type: "outreach", id: p.id }),
      );
      outcomes.add(clientList(normal)[0]!.status);
      organic += Number(clientList(normal)[0]!.status === "Signed");
      supported += Number(clientList(assisted)[0]!.status === "Signed");
      if (clientList(normal)[0]!.status === "Signed") {
        expect(
          normal.ledger
            .filter((l) => l.kind === "Pro income")
            .map((l) => l.amount),
        ).toEqual([12000]);
      }
    }
    expect([...outcomes].sort()).toEqual(["Signed", "Tryout", "Unsigned"]);
    expect(supported).toBeGreaterThan(organic);
  });
  it("makes low-trust professional clients leave at renewal, not during the signed term", () => {
    const s = signed();
    s.week = 18;
    const p = clientList(s)[0]!;
    p.status = "Pro";
    p.trust = 40;
    const n = advanceAgency(s);
    expect(clientList(n)).toHaveLength(0);
    expect(n.players.find((q) => q.id === p.id)!.owner).toBe("field");
    expect(n.ledger.filter((l) => l.kind === "Pro income")).toHaveLength(0);
  });
  it("includes between-week commitments in the recap cash movement", () => {
    const s = advanceAgency(signed());
    expect(s.recaps[0]!.net).toBe(-3500);
    expect(s.recaps[0]!.balance).toBe(96500);
  });
  it("settles loan principal and interest exactly and can become insolvent", () => {
    let s = signed();
    s = decideAgency(s, { type: "loan" });
    expect(s.money).toBe(138000);
    expect(() => decideAgency(s, { type: "loan" })).toThrow();
    s = through(s, 18);
    const before = s.money;
    s = advanceAgency(s);
    expect(
      s.ledger.filter((l) => l.kind === "Repayment").map((l) => l.amount),
    ).toEqual([-44800]);
    expect(s.money).toBeLessThanOrEqual(before - 22800);
    let fail = signed();
    fail.money = 100;
    fail = advanceAgency(fail);
    expect(fail.failed).toBe(true);
    expect(() => decideAgency(fail, { type: "loan" })).toThrow();
  });
  it("preserves deterministic results through save and reload and rejects corrupt saves", () => {
    const s = signed(777);
    expect(advanceAgency(restore(JSON.stringify(s))!)).toEqual(
      advanceAgency(s),
    );
    expect(restore("broken")).toBeNull();
    expect(restore('{"version":1}')).toBeNull();
    expect(roll(4, "draft")).not.toBe(roll(4, "other"));
  });
  it("pays both contract and roster milestones when a tryout becomes a professional signing", () => {
    const seed = Array.from({ length: 100 }, (_, i) => i + 1).find(
      (n) => roll(n, "2027-0roster") < 0.26,
    )!;
    const s = signed(seed);
    s.week = 17;
    clientList(s)[0]!.status = "Tryout";
    const n = advanceAgency(s);
    expect(clientList(n)[0]!.status).toBe("Pro");
    expect(
      n.ledger.filter((l) => l.kind === "Pro income").map((l) => l.amount),
    ).toEqual([12000, 8000]);
    expect(n.recaps[0]!.careers?.[0]?.status).toBe("Pro");
  });
});
