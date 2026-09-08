import { describe, expect, it } from "vitest";
import {
  advanceAgency,
  decideAgency,
  restore,
  startAgency,
  type State,
} from "./model.js";
import {
  activeDevelopment,
  agencyGoal,
  earnedPrestige,
  growthMilestones,
  netAgencyCash,
  playerSkills,
  resolveDevelopment,
  type DevelopmentKind,
} from "./growth.js";

const signed = (seed = 42) =>
  decideAgency(startAgency(seed), {
    type: "pitch",
    id: "2027-0",
    promise: "Development",
    fee: 15,
  });
const book = (s: State, kind: DevelopmentKind = "Skill", provider = 0) =>
  decideAgency(s, {
    type: "developmentPlan",
    id: "2027-0",
    kind,
    skill: 0,
    provider,
  });
function complete(s: State) {
  s.week = s.growth!.records.at(-1)!.due;
  resolveDevelopment(s);
  return s;
}

describe("agency growth", () => {
  it("charges the ledger once, respects existing commitments, and saves an unfinished plan", () => {
    const initial = signed();
    const s = book(initial);
    expect(initial.money).toBe(98000);
    expect(s.money).toBe(96500);
    expect(s.money).toBe(100000 + s.ledger.reduce((n, e) => n + e.amount, 0));
    expect(activeDevelopment(s)).toHaveLength(1);
    expect(() => book(s)).toThrow(/existing development/);
    expect(() =>
      decideAgency(s, { type: "transfer", id: "2027-0", school: 15 }),
    ).toThrow(/commitments/);
    expect(() =>
      decideAgency(s, {
        type: "job",
        id: "2027-0",
        focus: "Technique",
        specialist: 0,
        venue: 0,
        duration: 2,
        intensity: false,
        partner: "",
      }),
    ).toThrow(/One development/);
    expect(advanceAgency(restore(JSON.stringify(s))!)).toEqual(
      advanceAgency(s),
    );
  });
  it("improves only the selected skill, translates gains to ability, and respects the ceiling", () => {
    for (const seed of [1, 2, 3, 42, 81]) {
      const s = book(signed(seed));
      const p = s.players[0]!;
      p.ceiling = p.ability + 0.2;
      const before = playerSkills(s, p);
      const ability = p.ability;
      complete(s);
      const after = playerSkills(s, p);
      const gain = after[0]!.value - before[0]!.value;
      expect(p.ability - ability).toBeCloseTo(gain / 3);
      expect(after[1]!.value).toBeCloseTo(before[1]!.value);
      expect(after[2]!.value).toBeCloseTo(before[2]!.value);
      expect(p.ability).toBeLessThanOrEqual(p.ceiling);
      expect(s.growth!.records[0]!.result).toMatch(/training added/);
    }
  });
  it("has variable outcomes including no gain; spending never gives instant prestige", () => {
    const gains: number[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const s = book(signed(seed));
      const before = s.players[0]!.ability;
      expect(s.reputation).toBe(10);
      complete(s);
      gains.push(s.players[0]!.ability - before);
    }
    expect(Math.min(...gains)).toBe(0);
    expect(Math.max(...gains)).toBeGreaterThan(1);
  });
  it("keeps media, mentoring and recovery distinct from football training", () => {
    for (const kind of ["Media", "Recovery", "Mentor"] as const) {
      const s = signed();
      s.players[0]!.fatigue = 35;
      s.players[0]!.injury = { name: "ankle sprain", throughWeek: 10 };
      const n = book(s, kind);
      complete(n);
      const p = n.players[0]!;
      expect(p.ability).toBe(s.players[0]!.ability);
      expect(p.injury).toEqual(s.players[0]!.injury);
      if (kind === "Media")
        expect(p.recognition).toBeGreaterThan(s.players[0]!.recognition);
      if (kind === "Recovery") expect(p.fatigue).toBe(11);
      if (kind === "Mentor")
        expect(p.trust).toBeGreaterThan(s.players[0]!.trust);
    }
  });
  it("blocks injured training and accounts for missed weeks after booking", () => {
    const s = signed();
    s.players[0]!.injury = { name: "ankle sprain", throughWeek: 2 };
    expect(() => book(s)).toThrow(/injured/);
    s.players[0]!.injury = null;
    const n = book(s);
    n.players[0]!.injury = { name: "ankle sprain", throughWeek: 2 };
    n.week = 1;
    resolveDevelopment(n);
    n.week = 2;
    resolveDevelopment(n);
    expect(n.players[0]!.ability).toBe(s.players[0]!.ability);
    expect(n.growth!.records[0]!.missed).toBe(2);
    expect(n.growth!.records[0]!.result).toMatch(/2 session/);
  });
  it("enforces cash, shared capacity, timing and specialist prestige", () => {
    const s = signed();
    expect(() => book(s, "Skill", 1)).toThrow(/18 prestige/);
    s.reputation = 18;
    expect(book(s, "Skill", 1).money).toBe(93500);
    expect(() => book(s, "Skill", 2)).toThrow(/40 prestige/);
    s.reputation = 40;
    const n = complete(book(s, "Skill", 2));
    n.reputation = 10;
    expect(earnedPrestige(n)).toBe(40);
    expect(() => book(n, "Skill", 2)).not.toThrow();
    s.money = 10;
    expect(() => book(s)).toThrow(/cash/);
    s.money = 98000;
    s.week = 11;
    expect(() => book(s)).toThrow(/Week 12/);
    s.week = 0;
    s.jobs = [1, 2].map((i) => ({
      player: `other-${i}`,
      focus: "Media",
      specialist: 0,
      venue: 0,
      partner: "",
      duration: 2,
      left: 2,
      cost: 1000,
      intensity: false,
    }));
    expect(() => book(s)).toThrow(/places are filled/);
  });
  it("preserves new records across reload and college return; migrates without invented history", () => {
    let s = complete(book(signed()));
    const record = structuredClone(s.growth!.records[0]);
    const p = s.players[0]!;
    p.eligibility = 2;
    p.careerPlan = "Return";
    s.week = 18;
    s = advanceAgency(restore(JSON.stringify(s))!);
    expect(s.growth!.records[0]).toEqual(record);
    expect(s.players[0]!.schoolYear).toBe(p.schoolYear + 1);
    const old = signed();
    delete old.growth;
    const migrated = restore(JSON.stringify(old))!;
    expect(migrated.money).toBe(old.money);
    expect(migrated.growth!.records).toEqual([]);
    expect(migrated.growth!.clients["2027-0"]!.ability).toBe(
      old.players[0]!.ability,
    );
    expect(
      restore(
        JSON.stringify({ ...s, growth: { ...s.growth, records: [null] } }),
      ),
    ).toBeNull();
  });
  it("rewards developed breakouts only after actual performance and only once", () => {
    let s = signed(9);
    s.reputation = 40;
    for (let i = 0; i < 4; i++) s = complete(book(s, "Skill", 2));
    const p = s.players[0]!;
    s.week = 9;
    p.boxes = [
      {
        week: 9,
        snaps: 85,
        points: 30,
        team: p.school,
        opponent: 1,
        for: 30,
        against: 7,
        yards: 200,
        td: 2,
        tackles: 0,
        sacks: 0,
        int: 0,
        comp: 10,
        att: 15,
      },
    ];
    const invested = s.growth!.records.reduce(
      (n, r) => n + (r.skillAfter! - r.skillBefore!) / 3,
      0,
    );
    expect(invested).toBeGreaterThanOrEqual(3);
    const before = s.reputation;
    growthMilestones(s);
    expect(s.reputation).toBe(before + 5);
    growthMilestones(s);
    expect(s.reputation).toBe(before + 5);
    expect(
      s.growth!.milestones.filter((m) => m.id.startsWith("developed-breakout")),
    ).toHaveLength(1);
  });
  it("requires both goals, excludes borrowed funds, and records victory once", () => {
    let s = signed();
    s.money = agencyGoal.money;
    s.reputation = 84;
    growthMilestones(s);
    expect(s.growth!.won).toBeUndefined();
    s.money = 999000;
    s.reputation = 85;
    s = decideAgency(s, { type: "loan" });
    expect(netAgencyCash(s)).toBe(994200);
    expect(s.growth!.won).toBeUndefined();
    s.money = 1044800;
    growthMilestones(s);
    expect(s.growth!.won).toEqual({ year: 2027, week: 0 });
    const count = s.news.length;
    growthMilestones(s);
    expect(s.news).toHaveLength(count);
  });
  it("gates new national deals, honors existing guarantees, and rewards lucrative payment once", () => {
    let s = signed();
    s.players[0]!.recognition = 80;
    expect(() =>
      decideAgency(s, {
        type: "deal",
        id: "2027-0",
        kind: 2,
        performance: false,
      }),
    ).toThrow(/65 agency prestige/);
    s.reputation = 65;
    s = decideAgency(s, {
      type: "deal",
      id: "2027-0",
      kind: 2,
      performance: false,
    });
    const gross = s.deals[0]!.gross;
    s.reputation = 10;
    for (let i = 0; i < 4; i++) s = advanceAgency(s);
    expect(s.deals[0]!.gross).toBe(gross);
    expect(s.deals[0]!.status).toBe("Paid");
    expect(s.ledger.filter((e) => e.kind === "Commission")).toHaveLength(1);
    expect(s.recaps[0]!.news.some((n) => n.includes("Prestige +6"))).toBe(true);
    expect(
      advanceAgency(s).ledger.filter((e) => e.kind === "Commission"),
    ).toHaveLength(1);
  });
});
