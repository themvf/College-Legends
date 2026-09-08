import { cash, depth, roll, type Athlete, type State } from "./model.js";

export const agencyGoal = { money: 1000000, prestige: 85 };
export const prestigeTiers = [
  { at: 0, name: "Unknown", unlock: "Local development and commercial work" },
  {
    at: 18,
    name: "Local name",
    unlock: "Targeted specialists and client service hires",
  },
  { at: 40, name: "Regional contender", unlock: "Elite development team" },
  {
    at: 65,
    name: "National agency",
    unlock: "National licensed merchandise campaigns",
  },
  {
    at: 85,
    name: "Powerhouse",
    unlock: "Prestige goal reached — build your financial legacy",
  },
];
export const providers = [
  { name: "Community coach", cost: 1500, prestige: 0, gain: 6 },
  { name: "Targeted specialist", cost: 4500, prestige: 18, gain: 9 },
  { name: "Elite development team", cost: 8000, prestige: 40, gain: 12 },
];
const skillNames = {
  QB: ["Accuracy", "Reading defenses", "Pocket movement"],
  HB: ["Ball security", "Vision", "Receiving"],
  WR: ["Catching", "Route running", "Release technique"],
  EDGE: ["Pass-rush technique", "Run defense", "Pursuit"],
  FS: ["Coverage", "Tackling", "Reading plays"],
};
export type DevelopmentKind = "Skill" | "Media" | "Recovery" | "Mentor";
type Snapshot = {
  ability: number;
  recognition: number;
  fatigue: number;
  trust: number;
  role: string;
};
export type DevelopmentRecord = {
  id: string;
  player: string;
  year: number;
  week: number;
  due: number;
  kind: DevelopmentKind;
  skill: number;
  provider: number;
  cost: number;
  status: "Active" | "Complete";
  missed: number;
  before: Snapshot;
  after?: Snapshot;
  result?: string;
  skillBefore?: number;
  skillAfter?: number;
};
export type GrowthState = {
  clients: Record<
    string,
    { ability: number; recognition: number; skills: number[]; anchor: number }
  >;
  records: DevelopmentRecord[];
  milestones: {
    id: string;
    year: number;
    week: number;
    text: string;
    prestige: number;
  }[];
  peak: number;
  won?: { year: number; week: number };
};
export type DevelopmentAction = {
  type: "developmentPlan";
  id: string;
  kind: DevelopmentKind;
  skill: number;
  provider: number;
};
const limit = (n: number, max = 100) => Math.max(0, Math.min(max, n));
export const netAgencyCash = (s: State) => s.money - (s.loan ? 44800 : 0);
export const earnedPrestige = (s: State) =>
  Math.max(s.reputation, s.growth?.peak ?? 0);
export const prestigeTier = (s: State) =>
  prestigeTiers.filter((t) => earnedPrestige(s) >= t.at).at(-1)!;
export const nextPrestigeTier = (s: State) =>
  prestigeTiers.find((t) => earnedPrestige(s) < t.at);
export const activeDevelopment = (s: State) =>
  s.growth?.records.filter((r) => r.status === "Active") ?? [];
export function playerSkills(s: State, p: Athlete) {
  const stored = s.growth?.clients[p.id];
  const offset = Math.floor(roll(s.seed, `${p.id}-skill-profile`) * 3);
  return (skillNames[p.position] ?? skillNames.WR).map((name, i) => ({
    name,
    value: limit(
      stored
        ? stored.skills[i]! + p.ability - stored.anchor
        : p.ability + [-9, 3, 6][(i + offset) % 3]!,
      99,
    ),
  }));
}
export function initializeGrowth(s: State) {
  s.growth ??= { clients: {}, records: [], milestones: [], peak: s.reputation };
  for (const p of s.players.filter((p) => p.owner === "you")) {
    if (!s.growth.clients[p.id])
      s.growth.clients[p.id] = {
        ability: p.ability,
        recognition: p.recognition,
        skills: playerSkills(s, p).map((v) => v.value),
        anchor: p.ability,
      };
  }
}
export function growthMilestones(s: State) {
  initializeGrowth(s);
  const g = s.growth!;
  for (const h of s.honors.filter(
    (h) =>
      h.year === s.year &&
      ((h.week === s.week && s.week > 0) || (h.week === 0 && s.week === 12)),
  )) {
    if (!s.players.some((p) => p.id === h.player && p.owner === "you"))
      continue;
    const id = `honor-${h.year}-${h.week}-${h.player}-${h.name}`;
    if (g.milestones.some((m) => m.id === id)) continue;
    const prestige = h.week === 0 ? 3 : 1;
    const text = `${s.players.find((p) => p.id === h.player)!.name}: ${h.name}. Prestige +${prestige}.`;
    g.milestones.push({ id, year: s.year, week: s.week, text, prestige });
    s.reputation = limit(s.reputation + prestige);
    s.news.unshift(text);
  }
  for (const p of s.players.filter(
    (p) => p.owner === "you" && p.status === "College",
  )) {
    const id = `developed-breakout-${p.id}`;
    const work = g.records.filter(
      (r) => r.player === p.id && r.kind === "Skill" && r.status === "Complete",
    );
    const developed = work.reduce(
      (n, r) => n + Math.max(0, (r.skillAfter ?? 0) - (r.skillBefore ?? 0)) / 3,
      0,
    );
    if (
      developed >= 3 &&
      p.boxes.some(
        (b) => b.week === s.week && b.points >= 18 && (b.snaps ?? 0) > 0,
      ) &&
      !g.milestones.some((m) => m.id === id)
    ) {
      const text = `${p.name}: your development investment meets a breakout performance. Prestige +5.`;
      s.reputation = limit(s.reputation + 5);
      g.milestones.push({ id, year: s.year, week: s.week, text, prestige: 5 });
      s.news.unshift(text);
    }
  }
  const previous = g.peak;
  g.peak = Math.max(previous, s.reputation);
  for (const tier of prestigeTiers.filter(
    (t) => t.at > previous && t.at <= g.peak,
  )) {
    const text = `${tier.name} reached: ${tier.unlock}.`;
    g.milestones.push({
      id: `tier-${tier.at}`,
      year: s.year,
      week: s.week,
      text,
      prestige: 0,
    });
    s.news.unshift(text);
  }
  if (
    !s.failed &&
    !g.won &&
    netAgencyCash(s) >= agencyGoal.money &&
    s.reputation >= agencyGoal.prestige
  ) {
    g.won = { year: s.year, week: s.week };
    s.news.unshift(
      "Agency goal achieved: $1,000,000 after loan obligations and 85 prestige. Your legacy is secured; you can keep playing.",
    );
  }
}
const snapshot = (p: Athlete): Snapshot => ({
  ability: p.ability,
  recognition: p.recognition,
  fatigue: p.fatigue,
  trust: p.trust,
  role: depth(p).role,
});
export function developmentQuote(
  s: State,
  p: Athlete,
  kind: DevelopmentKind,
  skill: number,
  provider: number,
) {
  const pro = providers[provider] ?? providers[0]!;
  const values = playerSkills(s, p);
  const target = values[skill] ?? values[0]!;
  const fit = target.value < p.ability ? 1.25 : 0.65;
  const max = Math.min(99 - target.value, pro.gain * fit);
  return {
    cost:
      kind === "Skill"
        ? pro.cost
        : kind === "Media"
          ? 2000
          : kind === "Recovery"
            ? 1500
            : 2500,
    weeks: kind === "Mentor" ? 4 : 2,
    maxSkill: Math.max(0, max),
    detail:
      kind === "Skill"
        ? `${target.name}: 0–${max.toFixed(1)} skill points (up to ${(max / 3).toFixed(1)} overall ability). ${fit > 1 ? "Targets a relative weakness." : "Polishes an existing strength."} Potential, workload and missed sessions can limit results.`
        : kind === "Media"
          ? "Media coaching: +4–8 public profile. No football ability gain."
          : kind === "Recovery"
            ? "Recovery coordination: removes up to 24 fatigue on completion. Injury return dates stay uncertain; this does not shorten an injury."
            : "Personal mentor: +8–12 trust and removes up to 8 fatigue on completion. No football ability gain.",
  };
}
export function bookDevelopment(s: State, a: DevelopmentAction) {
  initializeGrowth(s);
  const p = s.players.find((p) => p.id === a.id);
  if (!p || p.owner !== "you" || p.status !== "College")
    throw Error("Choose a current college client.");
  if (
    !["Skill", "Media", "Recovery", "Mentor"].includes(a.kind) ||
    !Number.isInteger(a.skill) ||
    a.skill < 0 ||
    a.skill > 2 ||
    !Number.isInteger(a.provider) ||
    !providers[a.provider]
  )
    throw Error("Choose a valid development plan.");
  if (a.kind === "Skill" && earnedPrestige(s) < providers[a.provider]!.prestige)
    throw Error(
      `This specialist unlocks at ${providers[a.provider]!.prestige} prestige.`,
    );
  if (a.kind === "Skill" && p.injury && s.week <= p.injury.throughWeek)
    throw Error(
      "This client is injured. Arrange recovery support or wait for their return before skill training.",
    );
  const quote = developmentQuote(s, p, a.kind, a.skill, a.provider);
  if (s.week + quote.weeks > 12)
    throw Error("Development must finish by Week 12.");
  const pending = activeDevelopment(s);
  if (
    pending.some((r) => r.player === p.id) ||
    s.jobs.some((j) => j.player === p.id)
  )
    throw Error("Finish this client's existing development block first.");
  if (pending.length + s.jobs.length >= 2 + s.staff)
    throw Error(
      "All development places are filled. Complete a block or hire support staff.",
    );
  if (s.money < quote.cost)
    throw Error("Not enough agency cash for this plan.");
  s.money -= quote.cost;
  const label = a.kind === "Skill" ? playerSkills(s, p)[a.skill]!.name : a.kind;
  s.ledger.push({
    year: s.year,
    week: s.week,
    label: `${p.name} · ${label} development`,
    amount: -quote.cost,
    kind: "Expense",
  });
  s.growth!.records.push({
    id: `${p.id}-${s.year}-${s.week}-${s.growth!.records.length}`,
    player: p.id,
    year: s.year,
    week: s.week,
    due: s.week + quote.weeks,
    kind: a.kind,
    skill: a.skill,
    provider: a.provider,
    cost: quote.cost,
    status: "Active",
    missed: 0,
    before: snapshot(p),
  });
  s.news.unshift(
    `${p.name}: ${label} plan booked for ${cash(quote.cost)}. Results in Week ${s.week + quote.weeks}.`,
  );
}
export function resolveDevelopment(s: State) {
  for (const r of activeDevelopment(s)) {
    const p = s.players.find((p) => p.id === r.player)!;
    if (r.kind === "Skill") {
      if (p.injury && s.week <= p.injury.throughWeek) r.missed++;
      else p.fatigue = limit(p.fatigue + 3);
    }
    if (s.week < r.due) continue;
    const chance = roll(s.seed, `${r.id}-development-result`);
    const skills = playerSkills(s, p);
    if (r.kind === "Skill") {
      const quote = developmentQuote(s, p, r.kind, r.skill, r.provider);
      const ceilingRoom = Math.max(0, p.ceiling - p.ability) * 3;
      const attendance = Math.max(0, 1 - r.missed / (r.due - r.week));
      const gain = Math.max(
        0,
        Math.min(
          ceilingRoom,
          quote.maxSkill *
            (chance < 0.15 ? 0 : 0.4 + chance * 0.6) *
            attendance *
            (p.fatigue > 40 ? 0.6 : 1),
        ),
      );
      r.skillBefore = skills[r.skill]!.value;
      skills[r.skill]!.value += gain;
      p.ability += gain / 3;
      s.growth!.clients[p.id]!.skills = skills.map((v) => v.value);
      s.growth!.clients[p.id]!.anchor = p.ability;
      r.skillAfter = skills[r.skill]!.value;
      r.result = `${skills[r.skill]!.name} ${r.skillBefore.toFixed(1)} → ${r.skillAfter.toFixed(1)}; training added ${(gain / 3).toFixed(1)} overall ability. ${gain === 0 ? "No measurable gain this block; reassess the plan." : "Game performances will show how the improvement translates."}${r.missed ? ` ${r.missed} session week(s) missed through injury.` : ""}`;
      if (p.promise === "Development") p.delivered = true;
    } else if (r.kind === "Media") {
      const before = p.recognition;
      p.recognition = limit(p.recognition + 4 + chance * 4);
      r.result = `Media coaching added ${(p.recognition - before).toFixed(1)} public profile. Football ability unchanged.`;
      if (p.promise === "Visibility") p.delivered = true;
    } else if (r.kind === "Recovery") {
      const removed = Math.min(p.fatigue, 24);
      p.fatigue -= removed;
      r.result = `Recovery support removed ${removed.toFixed(1)} fatigue. Injury duration and football ability unchanged.`;
    } else {
      const trust = p.trust;
      p.trust = limit(p.trust + 8 + chance * 4);
      p.fatigue = limit(p.fatigue - 8);
      r.result = `Mentoring added ${(p.trust - trust).toFixed(1)} trust and reduced fatigue by up to 8. Football ability unchanged.`;
    }
    r.status = "Complete";
    r.after = snapshot(p);
    s.news.push(`${p.name} completed development: ${r.result}`);
  }
}
