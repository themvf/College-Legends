import { describe, expect, it } from "vitest";
import {
  advanceAgency,
  clientList,
  decideAgency,
  fit,
  restore,
  schools,
  startAgency,
  type State,
} from "./model.js";
import {
  ambitionProgress,
  counterChance,
  gameplay,
  pendingNegotiation,
  recruitingBonus,
  reservedPlaces,
  updateAmbitions,
} from "./gameplay.js";

function signed(seed = 42) {
  return decideAgency(startAgency(seed), {
    type: "pitch",
    id: "2027-0",
    promise: "Development",
    fee: 15,
  });
}
function through(s: State, week: number) {
  while (s.week < week) s = advanceAgency(s);
  return s;
}
function contested(seed = 42) {
  return decideAgency(signed(seed), {
    type: "pitch",
    id: "2027-11",
    promise: "Security",
    fee: 15,
  });
}
describe("client stories and ambitions", () => {
  it("answers a contextual request once, charges exactly once and follows up on actual conditions", () => {
    let s = signed();
    s.players[0]!.fatigue = 40;
    s = through(s, 2);
    const r = gameplay(s).requests[0]!;
    expect(r.kind).toBe("Workload");
    const before = structuredClone(s),
      fatigue = s.players[0]!.fatigue;
    s = decideAgency(s, { type: "request", id: r.id, choice: 0 });
    expect(s.money).toBe(before.money - 1500);
    expect(s.players[0]!.fatigue).toBe(fatigue - 18);
    expect(before.gameplay!.requests[0]!.status).toBe("Open");
    expect(() =>
      decideAgency(s, { type: "request", id: r.id, choice: 0 }),
    ).toThrow(/open/);
    s = through(restore(JSON.stringify(s))!, 4);
    expect(gameplay(s).requests[0]!.followup).toMatch(/fatigue is now/);
    expect(s.recaps[0]!.news.some((n) => n.includes("follows up"))).toBe(true);
    expect(
      s.ledger.filter((l) => l.label.includes("Arrange recovery")),
    ).toHaveLength(1);
  });
  it("gives one full deadline week, expires unanswered requests once and limits each client to three", () => {
    let s = through(signed(), 2);
    const trust = s.players[0]!.trust;
    s = advanceAgency(s);
    expect(gameplay(s).requests[0]!.status).toBe("Open");
    s = advanceAgency(s);
    expect(gameplay(s).requests[0]!.status).toBe("Expired");
    expect(s.players[0]!.trust).toBe(trust - 4);
    s = through(s, 12);
    expect(
      gameplay(s).requests.filter((r) => r.player === "2027-0"),
    ).toHaveLength(3);
  });
  it("makes an achieved ambition memorable and awards only one referral and reward", () => {
    let s = signed();
    s.players[0]!.ability = 70;
    s = advanceAgency(s);
    const a = gameplay(s).ambitions[0]!;
    expect(a.completed).toBe(1);
    expect(a.memory).toMatch(/Referred/);
    expect(ambitionProgress(s, s.players[0]!, a)).toBe(1);
    const rep = s.reputation,
      trust = s.players[0]!.trust;
    updateAmbitions(s);
    updateAmbitions(s);
    expect(s.reputation).toBe(rep);
    expect(s.players[0]!.trust).toBe(trust);
    expect(gameplay(s).referrals).toHaveLength(1);
    const referred = s.players.find(
      (p) => p.id === gameplay(s).referrals[0]!.player,
    )!;
    expect(recruitingBonus(s, referred)).toBe(8);
    const without = structuredClone(s);
    without.gameplay!.referrals = [];
    expect(fit(s, referred, "Visibility", 20)).toBeGreaterThan(
      fit(without, referred, "Visibility", 20),
    );
    expect(restore(JSON.stringify(s))!.gameplay!.ambitions[0]!.memory).toBe(
      a.memory,
    );
  });
  it("measures NIL ambitions by client take-home payments, not offers or agency receipts", () => {
    let s = signed();
    const p = s.players[0]!;
    p.want = "Security";
    s.gameplay!.ambitions = [];
    s = decideAgency(s, {
      type: "deal",
      id: p.id,
      kind: 0,
      performance: false,
    });
    const a = s.gameplay!.ambitions[0]!;
    expect(a.kind).toBe("Income");
    expect(ambitionProgress(s, s.players[0]!, a)).toBe(0);
    s = through(s, 2);
    const deal = s.deals[0]!;
    expect(
      ambitionProgress(s, s.players[0]!, s.gameplay!.ambitions[0]!),
    ).toBeCloseTo(
      Math.min(
        1,
        (deal.gross - Math.round((deal.gross * deal.fee) / 100)) / 15000,
      ),
    );
  });
  it("carries a planned stronger-school ambition into a returning client's next season", () => {
    let s = signed();
    s.players[0]!.eligibility = 3;
    s = through(s, 2);
    s = decideAgency(s, {
      type: "request",
      id: s.gameplay!.requests[0]!.id,
      choice: 1,
    });
    expect(s.gameplay!.ambitions[0]!.kind).toBe("Stage");
    s = through(s, 12);
    s = decideAgency(s, { type: "career", id: "2027-0", plan: "Return" });
    s = advanceAgency(through(s, 18));
    const a = s.gameplay!.ambitions.find((a) => a.year === 2028)!;
    expect(a).toMatchObject({ kind: "Stage", target: 58 });
    const destination = schools.findIndex((q) => q.prestige >= a.target);
    s.players[0]!.ability = 90;
    s = decideAgency(s, {
      type: "transfer",
      id: "2027-0",
      school: destination,
    });
    expect(
      s.gameplay!.ambitions.find((a) => a.year === 2028)!.completed,
    ).toBeUndefined();
    s = advanceAgency(s);
    expect(s.gameplay!.ambitions.find((a) => a.year === 2028)!.completed).toBe(
      1,
    );
  });
});
describe("contested recruiting", () => {
  it("reserves real rival cash and capacity, and blocks duplicate meetings", () => {
    const before = signed(),
      s = contested();
    const n = pendingNegotiation(s, "2027-11")!;
    expect(n.status).toBe("Open");
    expect(s.money).toBe(before.money - 500);
    expect(s.rivals.find((r) => r.id === n.rival)!.cash).toBe(
      before.rivals.find((r) => r.id === n.rival)!.cash - 4000,
    );
    expect(reservedPlaces(s, n.rival)).toBe(1);
    expect(() =>
      decideAgency(s, {
        type: "pitch",
        id: n.player,
        fee: 15,
        promise: "Security",
      }),
    ).toThrow(/pending/);
    const favorable = counterChance(s, n, 10, "Security", true);
    expect(favorable).toBeGreaterThan(
      counterChance(s, n, 20, "Development", false),
    );
    expect(restore(JSON.stringify(s))).toEqual(s);
  });
  it("settles a winning counter once, charges the chosen service and returns rival funds", () => {
    let resolved: State | undefined, original: State | undefined;
    for (let seed = 1; seed <= 30; seed++) {
      const s = contested(seed),
        n = s.gameplay!.negotiations[0]!;
      const next = decideAgency(s, {
        type: "counter",
        id: n.id,
        fee: 10,
        promise: "Security",
        attention: true,
      });
      if (next.gameplay!.negotiations[0]!.status === "Won") {
        original = s;
        resolved = next;
        break;
      }
    }
    expect(resolved).toBeDefined();
    const n = resolved!.gameplay!.negotiations[0]!;
    expect(resolved!.money).toBe(original!.money - 4000);
    expect(resolved!.players.find((p) => p.id === n.player)).toMatchObject({
      owner: "you",
      fee: 10,
      promise: "Security",
      trust: 86,
    });
    expect(resolved!.rivals.find((r) => r.id === n.rival)!.cash).toBe(
      original!.rivals.find((r) => r.id === n.rival)!.cash + 4000,
    );
    expect(reservedPlaces(resolved!, n.rival)).toBe(0);
    expect(() =>
      decideAgency(resolved!, { type: "walkAway", id: n.id }),
    ).toThrow(/closed/);
  });
  it("resolves losses and walkaways without charging your agency for onboarding", () => {
    const s = contested(),
      n = s.gameplay!.negotiations[0]!;
    const next = decideAgency(s, { type: "walkAway", id: n.id });
    expect(next.money).toBe(s.money);
    expect(next.players.find((p) => p.id === n.player)!.owner).toBe(n.rival);
    expect(next.rivals.find((r) => r.id === n.rival)!.cash).toBe(
      s.rivals.find((r) => r.id === n.rival)!.cash,
    );
    let losses = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const base = contested(seed),
        contest = base.gameplay!.negotiations[0]!;
      const final = decideAgency(base, {
        type: "counter",
        id: contest.id,
        fee: 20,
        promise: "Development",
        attention: false,
      });
      if (final.gameplay!.negotiations[0]!.status === "Lost") {
        losses++;
        expect(final.money).toBe(base.money);
      }
    }
    expect(losses).toBeGreaterThan(0);
  });
  it("keeps the prospect available through the deadline and lets the rival sign after it", () => {
    let s = contested();
    const n = s.gameplay!.negotiations[0]!;
    s = advanceAgency(s);
    expect(s.players.find((p) => p.id === n.player)!.owner).toBeNull();
    expect(pendingNegotiation(s, n.player)).toBeDefined();
    s = advanceAgency(restore(JSON.stringify(s))!);
    expect(s.players.find((p) => p.id === n.player)!.owner).toBe(n.rival);
    expect(
      s.recaps[0]!.news.some((n) => n.includes("commitment funds the signing")),
    ).toBe(true);
    expect(reservedPlaces(s, n.rival)).toBe(0);
  });
  it("does not promise a rival place or your place when capacity is exhausted", () => {
    const full = signed();
    for (const r of full.rivals)
      r.capacity = full.players.filter((p) => p.owner === r.id).length;
    const noContest = decideAgency(full, {
      type: "pitch",
      id: "2027-11",
      fee: 15,
      promise: "Security",
    });
    expect(noContest.gameplay!.negotiations).toHaveLength(0);
    const s = contested(),
      n = s.gameplay!.negotiations[0]!;
    for (const p of s.players.slice(1, 4)) p.owner = "you";
    expect(() =>
      decideAgency(s, {
        type: "counter",
        id: n.id,
        fee: 10,
        promise: "Security",
        attention: true,
      }),
    ).toThrow(/capacity/);
    expect(
      decideAgency(s, { type: "walkAway", id: n.id }).gameplay!.negotiations[0]!
        .status,
    ).toBe("Passed");
  });
});
function breakout() {
  for (let seed = 1; seed <= 20; seed++) {
    let s = signed(seed);
    s.players[0]!.ability = 90;
    for (let week = 1; week <= 6; week++) {
      s = advanceAgency(s);
      if (s.gameplay!.offers.some((o) => o.status === "Open")) return s;
    }
  }
  throw Error("No breakout occurred in seeded seasons");
}
describe("breakout sponsors", () => {
  it("connects a real performance to an offer and pays the light campaign once", () => {
    let s = breakout();
    const o = s.gameplay!.offers[0]!,
      p = s.players[0]!;
    expect(p.boxes.find((b) => b.week === o.week)!.points).toBe(o.points);
    const before = s.money,
      fatigue = p.fatigue;
    s = decideAgency(s, { type: "spotlightDeal", id: o.id, choice: "Light" });
    expect(s.money).toBe(before - 500);
    expect(s.players[0]!.fatigue).toBe(fatigue + 4);
    expect(s.deals[0]).toMatchObject({
      gross: Math.round(o.gross * 0.6),
      left: 1,
    });
    s.players[0]!.injury = { name: "ankle sprain", throughWeek: 12 };
    s = advanceAgency(restore(JSON.stringify(s))!);
    expect(s.deals[0]!.status).toBe("Paid");
    expect(s.ledger.filter((l) => l.kind === "Commission")).toHaveLength(1);
    s = advanceAgency(s);
    expect(s.ledger.filter((l) => l.kind === "Commission")).toHaveLength(1);
    expect(() =>
      decideAgency(s, { type: "spotlightDeal", id: o.id, choice: "Full" }),
    ).toThrow(/closed/);
  });
  it("offers a higher-paying heavier workload but prevents overlapping campaigns", () => {
    const s = breakout(),
      o = s.gameplay!.offers[0]!;
    const full = decideAgency(s, {
      type: "spotlightDeal",
      id: o.id,
      choice: "Full",
    });
    expect(full.players[0]!.fatigue).toBe(s.players[0]!.fatigue + 14);
    expect(full.deals[0]).toMatchObject({
      gross: o.gross,
      left: 2,
      cost: 1000,
    });
    expect(() =>
      decideAgency(full, {
        type: "deal",
        id: "2027-0",
        kind: 0,
        performance: false,
      }),
    ).toThrow(/existing campaign/);
    const ordinary = decideAgency(s, {
      type: "deal",
      id: "2027-0",
      kind: 0,
      performance: false,
    });
    expect(() =>
      decideAgency(ordinary, {
        type: "spotlightDeal",
        id: o.id,
        choice: "Light",
      }),
    ).toThrow(/active campaign/);
    const paid = advanceAgency(advanceAgency(full));
    expect(paid.deals[0]!.status).toBe("Paid");
  });
  it("expires or passes without a charge, and never generates offers from missed games", () => {
    const s = breakout(),
      o = s.gameplay!.offers[0]!;
    const passed = decideAgency(s, {
      type: "spotlightDeal",
      id: o.id,
      choice: "Pass",
    });
    expect(passed.money).toBe(s.money);
    const expired = through(s, o.deadline + 1);
    expect(expired.gameplay!.offers.find((q) => q.id === o.id)!.status).toBe(
      "Expired",
    );
    expect(expired.deals).toHaveLength(0);
    const injured = signed();
    injured.players[0]!.injury = { name: "ankle sprain", throughWeek: 12 };
    expect(through(injured, 12).gameplay!.offers).toHaveLength(0);
  });
});
describe("senior pipeline and saved careers", () => {
  it("stages research, preserves commitments and converts familiarity to a college recruiting advantage", () => {
    let s = signed();
    const id = s.gameplay!.seniors[0]!.id;
    s = decideAgency(s, { type: "researchSenior", id });
    expect(s.money).toBe(97500);
    expect(() => decideAgency(s, { type: "researchSenior", id })).toThrow(
      /Week 6/,
    );
    s = through(s, 6);
    const before = s.money;
    s = decideAgency(s, { type: "researchSenior", id });
    expect(s.money).toBe(before - 1500);
    expect(() => decideAgency(s, { type: "researchSenior", id })).toThrow(
      /complete/,
    );
    s = through(s, 10);
    const school = s.gameplay!.seniors[0]!.committed;
    expect(school).not.toBeNull();
    s = advanceAgency(through(restore(JSON.stringify(s))!, 18));
    const p = s.players.find((p) => p.id === id)!;
    expect(p).toMatchObject({
      school,
      season: 2028,
      schoolYear: 1,
      eligibility: 4,
      careerPlan: "Return",
      owner: null,
      scoutingLevel: 1,
    });
    expect(recruitingBonus(s, p)).toBe(10);
    expect(s.gameplay!.seniors.filter((p) => p.year === 2028)).toHaveLength(3);
    const cold = structuredClone(s);
    cold.gameplay!.seniors = [];
    expect(fit(s, p, "Security", 20)).toBeGreaterThan(
      fit(cold, p, "Security", 20),
    );
    expect(restore(JSON.stringify(s))).toEqual(s);
  });
  it("keeps young college players out of early draft selection and carries owned and unowned students forward", () => {
    let s = advanceAgency(through(signed(), 18));
    s.money = 500000;
    const ids = s
      .gameplay!.seniors.filter((p) => p.year === 2027)
      .map((p) => p.id);
    const p = s.players.find((p) => p.id === ids[0])!;
    p.owner = "you";
    for (const r of s.rivals) r.cash = 0;
    s = through(s, 12);
    expect(() =>
      decideAgency(s, { type: "career", id: p.id, plan: "Draft" }),
    ).toThrow(/Year 3/);
    s = through(s, 18);
    for (const id of ids)
      expect(s.players.find((p) => p.id === id)!.status).toBe("College");
    s = advanceAgency(s);
    for (const id of ids)
      expect(s.players.find((p) => p.id === id)).toMatchObject({
        season: 2029,
        schoolYear: 2,
        eligibility: 3,
        careerPlan: "Return",
      });
    s = advanceAgency(through(s, 18));
    for (const id of ids)
      expect(s.players.find((p) => p.id === id)).toMatchObject({
        season: 2030,
        schoolYear: 3,
        eligibility: 2,
        careerPlan: "Draft",
      });
    expect(new Set(s.players.map((p) => p.id)).size).toBe(s.players.length);
  });
  it("upgrades existing saves without resetting their cash, roster, matches or archive", () => {
    const s = through(signed(), 10),
      old = structuredClone(s);
    delete old.gameplay;
    const restored = restore(JSON.stringify(old))!;
    expect(restored.money).toBe(s.money);
    expect(restored.players).toEqual(s.players);
    expect(restored.matches).toEqual(s.matches);
    expect(restored.recaps).toEqual(s.recaps);
    expect(restored.gameplay!.seniors).toHaveLength(3);
    expect(restored.gameplay!.seniors.every((p) => p.committed !== null)).toBe(
      true,
    );
    expect(
      restore(JSON.stringify({ ...s, gameplay: { requests: null } })),
    ).toBeNull();
  });
});
