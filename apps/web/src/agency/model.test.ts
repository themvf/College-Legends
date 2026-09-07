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
  depth,
  schools,
  dealValue,
  playingShare,
  scoutingLevel,
  scoutingUpgradeCost,
  researchedOutlook,
  competitionReport,
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
  it("charges scouting upgrades once and preserves uncertainty and old reports", () => {
    let s = startAgency(42);
    const p = s.players[0]!;
    expect(researchedOutlook(p)).toMatch(/not yet researched/);
    s = decideAgency(s, { type: "scout", id: p.id, level: 1 });
    expect(researchedOutlook(s.players[0]!)).toMatch(/not yet researched/);
    expect(scoutingUpgradeCost(s.players[0]!, 2)).toBe(4000);
    s = decideAgency(s, { type: "scout", id: p.id, level: 2 });
    expect(researchedOutlook(s.players[0]!)).toMatch(/Development route/);
    s = decideAgency(s, { type: "scout", id: p.id, level: 3 });
    expect(s.money).toBe(75000);
    expect(() =>
      decideAgency(s, { type: "scout", id: p.id, level: 2 }),
    ).toThrow(/already/);
    expect(restore(JSON.stringify(s))).toEqual(s);
    const old = { ...p, scouted: true };
    expect(scoutingLevel(old)).toBe(1);
  });
  it("persists accepted and declined pitch results and reports actual rival priorities", () => {
    const accepted = signed();
    expect(accepted.lastPitch).toMatchObject({
      accepted: true,
      cost: 2000,
      player: "2027-0",
    });
    const s = startAgency(42);
    const target = s.players.find((p) =>
      competitionReport(s, p).includes("currently prioritize"),
    )!;
    expect(target).toBeDefined();
    expect(competitionReport(s, target)).toMatch(/Week 2/);
    const declined = Array.from({ length: 40 }, (_, i) => i + 1)
      .map((seed) =>
        decideAgency(startAgency(seed), {
          type: "pitch",
          id: "2027-11",
          promise: "Development",
          fee: 20,
        }),
      )
      .find((x) => !x.lastPitch!.accepted)!;
    expect(declined.lastPitch).toMatchObject({ accepted: false, cost: 500 });
    expect(declined.lastPitch!.message).toMatch(/Revisit next week/);
    expect(restore(JSON.stringify(declined))!.lastPitch).toEqual(
      declined.lastPitch,
    );
  });
  it("migrates existing saves without changing the saved draft path or money", () => {
    const old = JSON.parse(JSON.stringify(signed()));
    for (const p of old.players)
      for (const key of [
        "schoolYear",
        "eligibility",
        "careerPlan",
        "transferredYear",
        "injury",
      ])
        delete p[key];
    const migrated = restore(JSON.stringify(old))!;
    expect(migrated.money).toBe(old.money);
    expect(clientList(migrated)[0]).toMatchObject({
      schoolYear: 4,
      eligibility: 1,
      careerPlan: "Draft",
    });
    expect(restore(JSON.stringify(migrated))).toEqual(migrated);
  });
  it("links school, playing time and sponsor offers while protecting commitments", () => {
    let s = signed();
    const p = clientList(s)[0]!;
    p.school = 15;
    const before = dealValue(p, 0);
    expect(depth(p).role).toBe("Backup");
    s = decideAgency(s, { type: "transfer", id: p.id, school: 0 });
    const moved = clientList(s)[0]!;
    expect(depth(moved).role).toBe("Rotation");
    expect(s.money).toBe(95500);
    expect(dealValue(moved, 0)).not.toBe(before);
    expect(() =>
      decideAgency(s, { type: "transfer", id: p.id, school: 1 }),
    ).toThrow(/One school move/);
    const committed = decideAgency(signed(), {
      type: "deal",
      id: p.id,
      kind: 0,
      performance: false,
    });
    expect(() =>
      decideAgency(committed, { type: "transfer", id: p.id, school: 15 }),
    ).toThrow(/commitments/);
    const star = { ...moved, ability: 99 };
    expect(dealValue({ ...star, school: 15 }, 0)).toBeGreaterThan(
      dealValue(star, 0),
    );
    expect(schools[15]!.division).toBe("D-I FBS");
  });
  it("makes an injured client miss production without cancelling a signed guarantee", () => {
    let s = decideAgency(signed(), {
      type: "deal",
      id: "2027-0",
      kind: 0,
      performance: false,
    });
    clientList(s)[0]!.injury = { name: "ankle sprain", throughWeek: 2 };
    const gross = s.deals[0]!.gross;
    expect(playingShare(clientList(s)[0]!, 2)).toBe(0);
    expect(playingShare(clientList(s)[0]!, 3)).toBeGreaterThan(0);
    s = through(s, 2);
    expect(clientList(s)[0]!.boxes[0]).toMatchObject({
      snaps: 0,
      yards: 0,
      td: 0,
      points: 0,
      att: 0,
    });
    expect(
      s.ledger.filter((l) => l.kind === "Commission").map((l) => l.amount),
    ).toEqual([Math.round(gross * 0.15)]);
  });
  it("retains a returning client, eligibility, recap archive and annual NIL opportunities", () => {
    let s = signed();
    clientList(s)[0]!.eligibility = 2;
    clientList(s)[0]!.schoolYear = 4;
    s = decideAgency(s, {
      type: "deal",
      id: "2027-0",
      kind: 0,
      performance: false,
    });
    s = through(s, 12);
    s = decideAgency(s, { type: "career", id: "2027-0", plan: "Return" });
    expect(() =>
      decideAgency(s, {
        type: "prep",
        id: "2027-0",
        level: 0,
        focus: "Testing",
        travel: false,
        recovery: false,
      }),
    ).toThrow(/returning/);
    s = through(s, 18);
    expect(clientList(s)[0]!.status).toBe("College");
    expect(s.ledger.filter((l) => l.kind === "Pro income")).toHaveLength(0);
    const oldRecap = structuredClone(s.recaps.find((r) => r.week === 1));
    s = advanceAgency(restore(JSON.stringify(s))!);
    expect(clientList(s)[0]).toMatchObject({
      id: "2027-0",
      eligibility: 1,
      schoolYear: 5,
      season: 2028,
      careerPlan: "Draft",
      owner: "you",
    });
    expect(s.recaps.find((r) => r.week === 1 && r.year === 2027)).toEqual(
      oldRecap,
    );
    expect(s.players.filter((p) => p.season === 2028)).toHaveLength(80);
    s = decideAgency(s, {
      type: "deal",
      id: "2027-0",
      kind: 0,
      performance: false,
    });
    expect(new Set(s.deals.map((d) => d.id)).size).toBe(2);
    s = through(s, 12);
    expect(() =>
      decideAgency(s, { type: "career", id: "2027-0", plan: "Return" }),
    ).toThrow(/final eligible/);
    expect(advanceAgency(restore(JSON.stringify(s))!)).toEqual(
      advanceAgency(s),
    );
  });
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
