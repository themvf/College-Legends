import {
  schedule,
  teams,
  type Match,
  type Position,
} from "../new-game/core.js";
export { teams };
import { initializeOffseason, ensureCareerReviews, offseasonAction, offseasonBeforeAdvance, offseasonAfterWeek, applySchoolDestination, nextAgreement, currentReview, validOffseason, type OffseasonState, type OffseasonAction } from './offseason.js';
import {
  initializeGrowth,
  growthMilestones,
  bookDevelopment,
  resolveDevelopment,
  activeDevelopment,
  earnedPrestige,
  type GrowthState,
  type DevelopmentAction,
} from "./growth.js";
import {
  initializeGameplay,
  assignAmbition,
  updateAmbitions,
  recruitingBonus,
  pendingNegotiation,
  beginNegotiation,
  reservedPlaces,
  resolveRecruitingDeadlines,
  storyAction,
  weeklyGameplay,
  graduateSeniors,
  type GameplayState,
  type GameplayAction,
} from "./gameplay.js";
import { commercialPremium, commercialService, type CommercialKind } from "./commercial.js";
export const SAVE_KEY = "football-agent-sim-v1";
export const cash = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
export type Want = "Development" | "Visibility" | "Security";
export type Box = {
  snaps?: number;
  week: number;
  team: number;
  opponent: number;
  for: number;
  against: number;
  yards: number;
  td: number;
  tackles: number;
  sacks: number;
  int: number;
  comp: number;
  att: number;
  points: number;
};
export type Athlete = {
  brandKit?: CommercialKind[];
  schoolYear: number;
  eligibility: number;
  careerPlan: "Draft" | "Return";
  transferredYear: number;
  injury: { name: string; throughWeek: number } | null;
  representedByYou?: boolean;
  id: string;
  name: string;
  position: Position;
  school: number;
  season: number;
  ability: number;
  ceiling: number;
  recognition: number;
  want: Want;
  trust: number;
  fatigue: number;
  owner: string | null;
  promise: Want;
  delivered: boolean;
  scouted: boolean;
  scoutingLevel?: number;
  fee: number;
  testing: number;
  interview: number;
  boxes: Box[];
  status:
    | "College"
    | "Drafted"
    | "Undrafted"
    | "Signed"
    | "Tryout"
    | "Unsigned"
    | "Pro"
    | "Departed";
  pick: number | null;
  proYears: number;
  prep: Prep | null;
  approached: number;
};
export type Prep = {
  level: number;
  focus: "Testing" | "Position" | "Interview";
  travel: boolean;
  recovery: boolean;
  cost: number;
  resolved: boolean;
};
export type Job = {
  player: string;
  focus: "Technique" | "Media" | "Recovery";
  specialist: number;
  venue: number;
  partner: string;
  intensity: boolean;
  left: number;
  duration: number;
  cost: number;
};
export type Deal = {
  id: string;
  player: string;
  brand: string;
  kind: number;
  gross: number;
  fee: number;
  cost: number;
  left: number;
  status: "Active" | "Paid";
  year: number;
};
export type Rival = {
  id: string;
  name: string;
  tier: string;
  style: Want;
  reputation: number;
  cash: number;
  capacity: number;
  drafted: number;
  income: number;
};
export type Honor = {
  year: number;
  week: number;
  name: string;
  player: string;
};
export type Entry = {
  year: number;
  week: number;
  label: string;
  amount: number;
  kind: "Expense" | "Commission" | "Pro income" | "Financing" | "Repayment";
};
export type Recap = {
  year: number;
  week: number;
  title: string;
  news: string[];
  boxes: { player: string; box: Box }[];
  careers?: {
    returning?: boolean;
    player: string;
    status: Athlete["status"];
    pick: number | null;
    outlook: string;
  }[];
  net: number;
  balance: number;
};
export type State = {
  offseason?: OffseasonState;
  growth?: GrowthState;
  gameplay?: GameplayState;
  lastPitch?: {
    pending?: boolean;
    player: string;
    accepted: boolean;
    message: string;
    competition: string;
    cost: number;
    year: number;
    week: number;
  };
  version: 1;
  seed: number;
  year: number;
  week: number;
  money: number;
  reputation: number;
  players: Athlete[];
  rivals: Rival[];
  matches: Match[];
  jobs: Job[];
  deals: Deal[];
  honors: Honor[];
  ledger: Entry[];
  recaps: Recap[];
  news: string[];
  loan: boolean;
  staff: number;
  failed: boolean;
};
export const packages = [
  {
    name: "Local foundation",
    cost: 6000,
    boost: 1,
    description: "Local position work and a structured testing plan.",
  },
  {
    name: "Regional combine camp",
    cost: 18000,
    boost: 3,
    description: "Specialist coaching and supervised preparation.",
  },
  {
    name: "National performance institute",
    cost: 42000,
    boost: 5,
    description: "An intensive residential program. Large cash commitment.",
  },
];
export const coaches = [
  { name: "Independent coach", cost: 1000, quality: 1 },
  { name: "Position specialist", cost: 3500, quality: 1.65 },
  { name: "Performance team", cost: 6000, quality: 2 },
];
export const venues = [
  { name: "Local training ground", cost: 0, quality: 1 },
  { name: "Regional sports lab", cost: 2000, quality: 1.25 },
  { name: "Private performance center", cost: 5000, quality: 1.5 },
];
export const brands = [
  {
    name: "Hometown Outfitters",
    type: "Local endorsement",
    cost: 0,
    base: 16000,
    weeks: 2,
    min: 0,
    load: 3,
  },
  {
    name: "Sideline Stories",
    type: "Media & podcast series",
    cost: 0,
    base: 32000,
    weeks: 3,
    min: 22,
    load: 8,
  },
  {
    name: "Saturday Signature",
    type: "Licensed merchandise",
    cost: 0,
    base: 60000,
    weeks: 4,
    min: 38,
    load: 12,
  },
];
export const clientList = (s: State) =>
  s.players.filter((p) => p.owner === "you" && p.status !== "Departed");
export const collegeClients = (s: State) =>
  clientList(s).filter((p) => p.status === "College");
export const burn = (s: State) => 1500 + s.staff * 750;
export const phase = (s: State) =>
  s.week === 0
    ? "Preseason"
    : s.week < 12
      ? `Week ${s.week}`
      : s.week === 12
        ? "Offseason 1 · Career review"
      : s.week === 13
        ? "Offseason 2 · Transfer market / semifinals"
        : s.week === 14
          ? "Offseason 3 · Commitments / championship"
          : s.week === 15
            ? "Offseason 4 · Pro Day results"
            : s.week === 16
              ? "Offseason 4 · Draft & paydays"
              : s.week === 17
                ? "Offseason 5 · Undrafted offers"
                : "Offseason 5 · Roster decisions";
export const nextLabel = (s: State) =>
  s.week < 12
    ? `Advance to Week ${s.week + 1}`
    : s.week === 12
      ? "Open transfer market & play semifinals"
      : s.week === 13
        ? "Enter final commitments & championship"
        : s.week === 14
          ? "Close school offers & run Pro Days"
          : s.week === 15
            ? "Enter draft weekend"
            : s.week === 16
              ? "Resolve undrafted offers"
              : s.week === 17
                ? "Resolve roster decisions"
                : "Start next agency year";
export function roll(seed: number, key: string) {
  let h = seed | 0;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
// Fictional school tiers within the demo's shared invitational schedule.
export const schools = teams.map((name, id) => ({
  name,
  division: id < 8 ? "D-I FCS" : "D-I FBS",
  conference: id < 8 ? "Founders Conference" : "National Conference",
  prestige: id < 8 ? 48 + id * 3 : 76 + (id - 8) * 3,
  competition: id < 8 ? 65 + id : 79 + (id - 8),
}));
export const ratingStars = (score: number) =>
  Math.max(1, Math.min(5, Math.ceil(score / 20)));
export const conferenceStrength = (school: number) => {
  const peers = schools.filter(
    (s) => s.conference === schools[school]!.conference,
  );
  return peers.reduce((sum, s) => sum + s.prestige, 0) / peers.length;
};
export const priorities = {
  Development: {
    label: "Build my brand",
    description:
      "Build a sponsor-ready portfolio, social content or press presence.",
    service: "Complete a stylist, social media or press project.",
  },
  Visibility: {
    label: "Build my name",
    description:
      "Arrange media work and brand opportunities to grow public awareness.",
    service:
      "Start a sponsor campaign or complete social media or press preparation.",
  },
  Security: {
    label: "Earn NIL income",
    description:
      "Find a paying commercial deal. This means income from delivered work, not a guaranteed football career.",
    service: "Deliver a commercial campaign that pays the client.",
  },
};
export const scoutingPackages = [
  {
    name: "Film review",
    cost: 1000,
    detail:
      "A broad potential range, current role and a useful development focus.",
  },
  {
    name: "Player & market assessment",
    cost: 5000,
    detail:
      "A tighter potential range, career-route assessment, client priorities and sponsor economics.",
  },
  {
    name: "Full due diligence",
    cost: 25000,
    detail:
      "Our narrowest potential estimate, current draft evaluation, school alternatives and rival recruitment priorities. Future outcomes remain uncertain.",
  },
];
export const scoutingLevel = (p: Athlete) =>
  p.scoutingLevel ?? (p.scouted ? 1 : 0);
export const scoutingUpgradeCost = (p: Athlete, level: number) =>
  scoutingPackages[level - 1]!.cost -
  (scoutingPackages[scoutingLevel(p) - 1]?.cost ?? 0);
export function potentialRange(p: Athlete) {
  const level = scoutingLevel(p);
  if (!level) return "Not researched";
  const spread = [0, 10, 6, 3][level]!;
  return `${Math.max(Math.round(p.ability), p.ceiling - spread)}–${Math.min(99, p.ceiling + spread)}`;
}
export function researchedOutlook(p: Athlete) {
  if (scoutingLevel(p) < 2 && !p.prep?.resolved)
    return "Career assessment not yet researched";
  if (scoutingLevel(p) < 3 && !p.prep?.resolved)
    return draftGrade(p) < 78
      ? "Development route · more evidence needed for a pro opportunity"
      : "Professional potential · draft position remains uncertain";
  return projection(p) === "Undrafted / fringe"
    ? "No draft selection projected today · development and alternative routes remain open"
    : `${projection(p)} today · an estimate, not a ceiling`;
}
function rivalProspects(s: State, r: Rival) {
  return s.players
    .filter(
      (p) =>
        p.season === s.year &&
        p.status === "College" &&
        !p.owner &&
        !pendingNegotiation(s, p.id) &&
        p.ability < 68 + r.reputation * 0.3,
    )
    .sort(
      (a, b) =>
        b.ability +
        (b.want === r.style ? 8 : 0) -
        (a.ability + (a.want === r.style ? 8 : 0)),
    );
}
export function competitionReport(s: State, p: Athlete) {
  const negotiation = pendingNegotiation(s, p.id);
  if (negotiation)
    return `${s.rivals.find((r) => r.id === negotiation.rival)!.name} has made a firm offer. Submit your final counter in Scouting by the end of Week ${negotiation.deadline}.`;
  if (p.owner === "you")
    return "Signed with your agency. Rivals cannot take this client during the current agreement.";
  if (p.owner)
    return `${s.rivals.find((r) => r.id === p.owner)?.name ?? "Another agency"} has signed this player.`;
  const rivals = s.rivals.filter(
    (r) =>
      s.week < 6 &&
      r.cash > 8000 &&
      s.players.filter((q) => q.owner === r.id && q.season === s.year).length +
        reservedPlaces(s, r.id) <
        r.capacity &&
      rivalProspects(s, r)[0]?.id === p.id,
  );
  return rivals.length
    ? `${rivals.map((r) => r.name).join(" and ")} currently prioritize this player. Their next recruitment window is Week ${Math.floor(s.week / 2) * 2 + 2}; priorities can change.`
    : "No rival currently has this player as its next signing priority. Interest can change as other prospects sign.";
}
export function depth(p: Athlete, school = p.school) {
  const gap = p.ability - schools[school]!.competition;
  const rank = gap >= 0 ? 1 : gap >= -6 ? 2 : 3;
  return {
    rank,
    role: rank === 1 ? "Starter" : rank === 2 ? "Rotation" : "Backup",
    snaps: rank === 1 ? 85 : rank === 2 ? 40 : 12,
  };
}
export const schoolLabel = (p: Athlete) =>
  `${schools[p.school]!.division} · ${schools[p.school]!.conference}`;
export const yearLabel = (p: Athlete) =>
  `Year ${p.schoolYear} · ${p.eligibility} season${p.eligibility === 1 ? "" : "s"} of eligibility incl. this year`;
export function health(p: Athlete, week: number) {
  if (p.injury && week <= p.injury.throughWeek)
    return `Out · ${p.injury.name} · expected back Week ${p.injury.throughWeek + 1}`;
  return p.fatigue > 55 ? "Limited · fatigue" : "Available";
}
export function playingShare(p: Athlete, week: number) {
  if (p.injury && week <= p.injury.throughWeek) return 0;
  return Math.round(depth(p).snaps * (p.fatigue > 55 ? 0.6 : 1));
}
export function dealValue(p: Athlete, kind: number, performance = false) {
  const market = 0.8 + schools[p.school]!.prestige / 200;
  const opportunity = 0.8 + depth(p).snaps / 425;
  return Math.round(
    brands[kind]!.base *
      (0.8 + p.recognition / 100) *
      market *
      opportunity *
      (1 + commercialPremium(p, kind)) *
      (performance ? 0.7 : 1),
  );
}
function profile(index: number) {
  const eligibility = (index % 3) + 1;
  return {
    schoolYear: 6 - eligibility,
    eligibility,
    careerPlan: "Draft" as const,
    transferredYear: 0,
    injury: null,
  };
}
function population(seed: number, year: number): Athlete[] {
  const positions: Position[] = ["QB", "HB", "WR", "FS", "EDGE"];
  return teams.flatMap((_, school) =>
    positions.map((position, j) => {
      const index = school * 5 + j,
        id = `${year}-${index}`,
        ability =
          index < 12
            ? 64 + index
            : 68 + Math.floor(roll(seed, id + "ability") * 24);
      return {
        ...profile(index),
        id,
        name: `${["Miles", "Jalen", "Nico", "Theo", "Andre", "Caleb", "Isaiah", "Eli", "Dante", "Micah", "Zion", "Owen", "Malik", "Noah", "Julian", "Ty"][index % 16]} ${["Ellis", "Reed", "Cruz", "Banks", "Moss", "Carter", "King", "Price", "Brooks", "Hayes", "Grant", "Ford", "West", "Hill", "Cole", "Ward"][(index * 7 + Math.floor(index / 16) + (year - 2027) * 2) % 16]}`,
        position,
        school,
        season: year,
        ability,
        ceiling: Math.min(
          97,
          ability + 4 + Math.floor(roll(seed, id + "ceiling") * 14),
        ),
        recognition:
          index < 12
            ? 10 + index
            : 20 + Math.floor(roll(seed, id + "fame") * 35),
        want: (["Development", "Visibility", "Security"] as Want[])[index % 3]!,
        trust: 65,
        fatigue: 0,
        owner: null,
        promise: "Development",
        delivered: false,
        scouted: false,
        fee: 15,
        testing: 0,
        interview: 0,
        boxes: [],
        status: "College",
        pick: null,
        proYears: 0,
        prep: null,
        approached: -1,
      };
    }),
  );
}
export function startAgency(seed = Date.now()): State {
  const rivals: Rival[] = [
    {
      id: "summit",
      name: "Summit Sports Group",
      tier: "Established leader",
      style: "Development",
      reputation: 88,
      cash: 1200000,
      capacity: 12,
      drafted: 0,
      income: 0,
    },
    {
      id: "crown",
      name: "Crownline Representation",
      tier: "Established leader",
      style: "Visibility",
      reputation: 85,
      cash: 1100000,
      capacity: 12,
      drafted: 0,
      income: 0,
    },
    {
      id: "field",
      name: "Fieldhouse Partners",
      tier: "Mid-sized",
      style: "Development",
      reputation: 53,
      cash: 360000,
      capacity: 7,
      drafted: 0,
      income: 0,
    },
    {
      id: "north",
      name: "Northstar Athlete Management",
      tier: "Mid-sized",
      style: "Security",
      reputation: 57,
      cash: 420000,
      capacity: 7,
      drafted: 0,
      income: 0,
    },
    {
      id: "first",
      name: "First Step Sports",
      tier: "Newcomer",
      style: "Security",
      reputation: 12,
      cash: 100000,
      capacity: 4,
      drafted: 0,
      income: 0,
    },
  ];
  const s: State = {
    version: 1,
    seed,
    year: 2027,
    week: 0,
    money: 100000,
    reputation: 10,
    players: population(seed, 2027),
    rivals,
    matches: schedule(),
    jobs: [],
    deals: [],
    honors: [],
    ledger: [],
    recaps: [],
    news: [
      "Your first office. Your first $100,000. Find a player worth believing in.",
    ],
    loan: false,
    staff: 0,
    failed: false,
  };
  for (let i = 0; i < 4; i++) {
    const r = s.rivals[i]!;
    const available = s.players
      .filter((p) => p.ability >= 80 && !p.owner)
      .sort((a, b) => b.ability - a.ability);
    for (const p of available.slice(0, i < 2 ? 3 : 2)) p.owner = r.id;
  }
  initializeGameplay(s);
  initializeGrowth(s);
  return s;
}
export function standings(s: State) {
  return teams
    .map((name, id) => {
      const games = s.matches.filter(
        (m) => m.hs !== null && (m.home === id || m.away === id),
      );
      return {
        id,
        name,
        wins: games.filter((m) =>
          m.home === id ? m.hs! > m.as! : m.as! > m.hs!,
        ).length,
        losses: games.filter((m) =>
          m.home === id ? m.hs! < m.as! : m.as! < m.hs!,
        ).length,
        diff: games.reduce(
          (n, m) => n + (m.home === id ? m.hs! - m.as! : m.as! - m.hs!),
          0,
        ),
      };
    })
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff || a.id - b.id);
}
export const seasonPoints = (p: Athlete) =>
  p.boxes.reduce((sum, b) => sum + b.points, 0);
export const draftGrade = (p: Athlete) =>
  p.ability +
  Math.min(5, seasonPoints(p) / 85) +
  p.testing * 0.45 +
  p.interview * 0.3 -
  p.fatigue * 0.025;
export function projection(p: Athlete) {
  const grade = draftGrade(p);
  if (grade < 78) return "Undrafted / fringe";
  const pick = Math.max(1, Math.min(224, Math.round(224 - (grade - 78) * 13)));
  return `Round ${Math.ceil(pick / 32)} · Pick ${((pick - 1) % 32) + 1}`;
}
export const draftPayout = (pick: number) =>
  [350000, 200000, 130000, 90000, 65000, 50000, 40000][
    Math.ceil(pick / 32) - 1
  ]!;
export function fit(s: State, p: Athlete, promise: Want, fee: number) {
  return clamp(
    44 +
      recruitingBonus(s, p) +
      (promise === p.want ? 18 : 0) +
      (15 - fee) * 2 +
      (s.reputation - 10) * 0.4 -
      Math.max(0, p.ability - 75) * 4 -
      Math.max(0, schools[p.school]!.prestige - 70) * 0.3,
    8,
    85,
  );
}
export function prepCost(level: number, travel: boolean, recovery: boolean) {
  return packages[level]!.cost + (travel ? 4000 : 0) + (recovery ? 3000 : 0);
}
function entry(s: State, label: string, amount: number, kind: Entry["kind"]) {
  s.money += amount;
  s.ledger.push({ year: s.year, week: s.week, label, amount, kind });
}
function spend(s: State, label: string, n: number) {
  if (s.money < n)
    throw Error(`This needs ${cash(n)}. You have ${cash(s.money)} available.`);
  entry(s, label, -n, "Expense");
}
function owned(s: State, id: string) {
  const p = s.players.find(
    (p) => p.id === id && p.owner === "you" && p.status !== "Departed",
  );
  if (!p) throw Error("Select one of your clients.");
  return p;
}
function active(s: State) {
  if (s.failed)
    throw Error("The agency has closed. Start a new career to try again.");
}
export type Action =
  | OffseasonAction
  | DevelopmentAction
  | GameplayAction
  | { type: "career"; id: string; plan: Athlete["careerPlan"] }
  | { type: "transfer"; id: string; school: number }
  | { type: "scout"; id: string; level?: number }
  | { type: "pitch"; id: string; promise: Want; fee: number }
  | {
      type: "job";
      id: string;
      focus: Job["focus"];
      specialist: number;
      venue: number;
      partner: string;
      duration: number;
      intensity: boolean;
    }
  | { type: "deal"; id: string; kind: number; performance: boolean }
  | {
      type: "prep";
      id: string;
      level: number;
      focus: Prep["focus"];
      travel: boolean;
      recovery: boolean;
    }
  | { type: "outreach"; id: string }
  | { type: "hire" }
  | { type: "loan" }
  | { type: "support"; id: string };
export function decideAgency(current: State, a: Action): State {
  const s = decision(current, a);
  updateAmbitions(s);
  growthMilestones(s);
  return s;
}
function decision(current: State, a: Action): State {
  const s = structuredClone(current);
  active(s);
  initializeGameplay(s);
  initializeGrowth(s);
  initializeOffseason(s);
  if (['renewClient', 'openSchoolMarket', 'counterSchool', 'signSchool', 'staySchool'].includes(a.type)) {
    offseasonAction(s, a as OffseasonAction);
    return s;
  }
  if (a.type === "developmentPlan") {
    bookDevelopment(s, a);
    return s;
  }
  if (
    a.type === "request" ||
    a.type === "counter" ||
    a.type === "walkAway" ||
    a.type === "spotlightDeal" ||
    a.type === "watchSenior" ||
    a.type === "researchSenior"
  ) {
    storyAction(s, a);
    return s;
  }
  if (a.type === "loan") {
    if (s.loan)
      throw Error(
        "The current bridge loan must be settled at the year review.",
      );
    s.loan = true;
    entry(
      s,
      "Bridge loan principal · 12% due at year review",
      40000,
      "Financing",
    );
    s.news.unshift("Loan received. $44,800 is due after roster decisions.");
    return s;
  }
  if (a.type === "hire") {
    if (s.staff >= 2 || earnedPrestige(s) < 18)
      throw Error("Hire support staff at 18 prestige, up to two staff.");
    spend(s, "Client service hire and equipment", 6000);
    s.staff++;
    s.news.unshift(
      "A client services associate joins. Project capacity +1; weekly payroll +$750.",
    );
    return s;
  }
  const p = s.players.find((p) => p.id === a.id);
  if (!p) throw Error("Player not found.");
  if (a.type === "scout") {
    const level = a.level ?? 1;
    if (![1, 2, 3].includes(level)) throw Error("Choose a scouting package.");
    if (scoutingLevel(p) >= level)
      throw Error("You already have this report or a deeper assessment.");
    spend(
      s,
      `${p.name} · ${scoutingPackages[level - 1]!.name}`,
      scoutingUpgradeCost(p, level),
    );
    p.scouted = true;
    p.scoutingLevel = level;
    return s;
  }
  if (a.type === "pitch") {
    if (pendingNegotiation(s, p.id))
      throw Error(
        "A final offer is already pending. Resolve the negotiation in Scouting.",
      );
    if (p.owner || p.status !== "College" || p.season !== s.year || s.week > 6)
      throw Error(
        "This player is unavailable. Recruitment closes after Week 6.",
      );
    if (collegeClients(s).length >= 4 + s.staff)
      throw Error("Your college client capacity is full.");
    if (p.approached === s.week)
      throw Error("The player will reconsider next week.");
    if (![10, 15, 20].includes(a.fee))
      throw Error("Choose an available commission rate.");
    if (!priorities[a.promise])
      throw Error("Choose an available service promise.");
    spend(s, `${p.name} · representation meeting`, 500);
    p.approached = s.week;
    if (beginNegotiation(s, p, a.promise, a.fee)) return s;
    const chance = fit(s, p, a.promise, a.fee);
    const competition = competitionReport(s, p);
    const accepted = roll(s.seed, `${p.id}pitch${s.week}`) * 100 < chance;
    if (accepted) {
      spend(s, `${p.name} · onboarding and service setup`, 1500);
      p.owner = "you";
      p.representedByYou = true;
      p.promise = a.promise;
      p.fee = a.fee;
      p.trust = a.promise === p.want ? 80 : 65;
      assignAmbition(s, p);
      s.news.unshift(
        `${p.name} signs with you at ${a.fee}% commercial commission. ${a.promise === p.want ? "Your service plan matches their priority." : "They accepted, but your service plan differs from their priority."}`,
      );
    } else
      s.news.unshift(
        `${p.name} declines: your current offer did not outweigh their other options. You can revisit next week.`,
      );
    s.lastPitch = {
      player: p.id,
      accepted,
      competition: accepted ? competitionReport(s, p) : competition,
      cost: accepted ? 2000 : 500,
      year: s.year,
      week: s.week,
      message: accepted
        ? `${p.name} signed at ${a.fee}% commission. Their priority is: ${priorities[p.want].label.toLowerCase()}. ${priorities[a.promise].service}`
        : `${p.name} has not signed. Their priority is: ${priorities[p.want].label.toLowerCase()}. ${a.promise !== p.want ? "Your proposed service did not match that priority." : "Your service matched, but the offer was not accepted at your current fee and prestige."} ${s.week < 6 ? "Revisit next week with a matching service or lower commission." : "The recruitment window has closed for further pitches."}`,
    };
    return s;
  }
  owned(s, p.id);
  if (a.type === "career") {
    if (p.status !== "College" || s.week < 12 || s.week > 14)
      throw Error(
        "Choose a college return or draft path after Week 12, before Pro Days.",
      );
    if (a.plan !== "Draft" && a.plan !== "Return")
      throw Error("Choose a career path.");
    if (a.plan === "Draft" && p.schoolYear < 3)
      throw Error(
        "In this demo, the draft path opens in Year 3. This player returns to college.",
      );
    if (a.plan === "Return" && p.eligibility <= 1)
      throw Error("This is the client's final eligible season.");
    if (a.plan === "Return" && p.prep)
      throw Error(
        "A Pro Day package is already committed. This client is on the draft path.",
      );
    const review = currentReview(s, p.id);
    if (review && review.status !== 'Renewed') throw Error('Resolve the client representation review in Offseason first.');
    if (a.plan === 'Draft' && nextAgreement(s, p.id)) throw Error('A next-season school agreement is already committed.');
    if (review) review.routeChosen = true;
    p.careerPlan = a.plan;
    s.news.unshift(
      `${p.name} plans to ${a.plan === "Return" ? "return for another college season, with new NIL opportunities next year" : "enter the draft"}.`,
    );
    return s;
  }
  if (a.type === "transfer") {
    if (p.status !== "College" || s.week !== 0 || p.transferredYear === s.year)
      throw Error("One school move per client is available in preseason.");
    if (s.offseason?.agreements.some(a => a.player === p.id && a.season === s.year)) throw Error('The current-season school agreement is already committed.');
    if (
      !Number.isInteger(a.school) ||
      !schools[a.school] ||
      a.school === p.school
    )
      throw Error("Choose a different school.");
    if (
      s.deals.some((d) => d.player === p.id && d.status === "Active") ||
      s.jobs.some((j) => j.player === p.id) ||
      activeDevelopment(s).some((r) => r.player === p.id)
    )
      throw Error(
        "Finish current campaign and development commitments before moving schools.",
      );
    const former = teams[p.school];
    spend(s, `${p.name} · school transfer support`, 2500);
    p.school = a.school;
    p.transferredYear = s.year;
    s.news.unshift(
      `${p.name} moves from ${former} to ${teams[p.school]}. Expected role: ${depth(p).role}. New sponsor offers reflect the new school and role; paid deals stay earned.`,
    );
    return s;
  }
  if (a.type === "support") {
    if (p.fatigue <= 0 && p.trust >= 95)
      throw Error("No additional support is needed right now.");
    spend(s, `${p.name} · client support session`, 1500);
    p.trust = clamp(p.trust + 8);
    p.fatigue = clamp(p.fatigue - 12);
    s.news.unshift(`${p.name}: “Thanks for making time for me.”`);
    return s;
  }
  if (a.type === "job") {
    if (p.status !== "College" || s.week + a.duration > 12)
      throw Error("Development blocks must finish by Week 12.");
    if (
      ![2, 4].includes(a.duration) ||
      !coaches[a.specialist] ||
      !venues[a.venue]
    )
      throw Error("Choose a valid training plan.");
    if (
      s.jobs.some((j) => j.player === p.id) ||
      activeDevelopment(s).some((r) => r.player === p.id) ||
      s.jobs.length + activeDevelopment(s).length >= 2 + s.staff
    )
      throw Error(
        "One development block per client; hire staff for more than two concurrent blocks.",
      );
    if (
      a.partner &&
      !collegeClients(s).some((q) => q.id === a.partner && q.id !== p.id)
    )
      throw Error("Choose another client as a training partner.");
    const cost =
      ((coaches[a.specialist]!.cost + venues[a.venue]!.cost) * a.duration) / 2;
    spend(s, `${p.name} · ${a.focus} block`, cost);
    s.jobs.push({
      player: p.id,
      focus: a.focus,
      specialist: a.specialist,
      venue: a.venue,
      partner: a.partner,
      intensity: a.intensity,
      left: a.duration,
      duration: a.duration,
      cost,
    });
    return s;
  }
  if (a.type === "deal") {
    if (p.status !== "College" || !brands[a.kind])
      throw Error("Choose a current college client and opportunity.");
    const b = brands[a.kind]!;
    if (a.kind === 2 && earnedPrestige(s) < 65)
      throw Error(
        "National licensed merchandise campaigns unlock at 65 agency prestige.",
      );
    if (p.recognition < b.min)
      throw Error(`This brand needs ${b.min} recognition.`);
    if (s.week + b.weeks > 14)
      throw Error(
        "This campaign cannot finish before the professional transition.",
      );
    if (
      s.deals.some(
        (d) => d.player === p.id && d.kind === a.kind && d.year === s.year,
      )
    )
      throw Error("This client already signed this brand this year.");
    if (s.deals.some((d) => d.player === p.id && d.status === "Active"))
      throw Error(
        "Finish the existing campaign before adding another obligation.",
      );
    if (activeDevelopment(s).some(r=>r.player===p.id&&commercialService(r.kind)))
      throw Error('Finish brand preparation before signing a campaign.');
    // Brands fund campaign delivery; optional agency preparation is purchased separately.
    const gross = dealValue(p, a.kind, a.performance);
    s.deals.push({
      id: `${p.id}-${s.year}-${a.kind}`,
      player: p.id,
      brand: b.name,
      kind: a.kind,
      gross,
      fee: p.fee,
      cost: b.cost,
      left: b.weeks,
      status: "Active",
      year: s.year,
    });
    if (a.performance) s.deals[s.deals.length - 1]!.id += "-bonus";
    p.fatigue = clamp(p.fatigue + b.load);
    if (p.promise === "Visibility") {
      p.delivered = true;
      p.trust = clamp(p.trust + 6);
    }
    return s;
  }
  if (a.type === "prep") {
    const review = currentReview(s, p.id);
    if (review && review.status !== 'Renewed') throw Error('Renew representation in Offseason before booking preparation.');
    if (p.careerPlan === "Return")
      throw Error(
        "This client is returning to school. Choose the draft path before booking preparation.",
      );
    if (p.status !== "College" || s.week < 12 || s.week > 14)
      throw Error(
        "Pro Day bookings open after Week 12 and close before Pro Days.",
      );
    if (p.prep) throw Error("This client already has a booked package.");
    if (!packages[a.level]) throw Error("Select an available package.");
    const cost = prepCost(a.level, a.travel, a.recovery);
    spend(s, `${p.name} · ${packages[a.level]!.name}`, cost);
    p.prep = {
      level: a.level,
      focus: a.focus,
      travel: a.travel,
      recovery: a.recovery,
      cost,
      resolved: false,
    };
    return s;
  }
  if (a.type === "outreach") {
    if (p.status !== "Undrafted" || s.week !== 16)
      throw Error(
        "Outreach is available between the draft and undrafted signings.",
      );
    if (p.interview >= 100) throw Error("Outreach is already arranged.");
    spend(s, `${p.name} · team outreach and tryout travel`, 2500);
    p.interview += 100;
    s.news.unshift(
      `${p.name}: targeted outreach arranged before undrafted offers.`,
    );
    return s;
  }
  return s;
}
function simulateFootball(s: State) {
  const power = (team: number) => {
    const roster = s.players.filter(
      (p) => p.school === team && p.season === s.year && p.status === "College",
    );
    const baseline = schools[team]!.competition;
    return (
      baseline +
      roster.reduce(
        (sum, p) =>
          sum +
          ((p.ability - baseline - p.fatigue * 0.07) *
            playingShare(p, s.week)) /
            100,
        0,
      ) /
        Math.max(5, roster.length)
    );
  };
  for (const m of s.matches.filter((m) => m.week === s.week)) {
    const rand = (key: string) =>
      roll(s.seed, `${s.year}:${s.week}:${m.home}:${key}`);
    m.hs = Math.max(
      7,
      Math.round(
        25 + (power(m.home) - power(m.away)) * 0.6 + (rand("home") - 0.5) * 24,
      ),
    );
    m.as = Math.max(
      7,
      Math.round(
        24 + (power(m.away) - power(m.home)) * 0.6 + (rand("away") - 0.5) * 24,
      ),
    );
    if (m.hs === m.as) m.hs += 3;
    for (const team of [m.home, m.away]) {
      const score = team === m.home ? m.hs : m.as,
        against = team === m.home ? m.as : m.hs,
        totalTD = Math.floor(score / 7),
        passTD = Math.round(totalTD * 0.6);
      for (const p of s.players.filter(
        (p) =>
          p.school === team && p.season === s.year && p.status === "College",
      )) {
        const form = 0.75 + rand(p.id) * 0.5;
        const positionLoad = s.players
          .filter(
            (q) =>
              q.school === team &&
              q.season === s.year &&
              q.status === "College" &&
              q.position === p.position,
          )
          .reduce((sum, q) => sum + playingShare(q, s.week), 0);
        const snaps = Math.round(
            playingShare(p, s.week) / Math.max(1, positionLoad / 100),
          ),
          share = snaps / 100;
        const effective = p.ability * form * (1 - p.fatigue * 0.002) * share;
        const attack = ["QB", "HB", "WR"].includes(p.position);
        const td = Math.round(
          (p.position === "HB" ? totalTD - passTD : passTD) * share,
        );
        const att =
          p.position === "QB"
            ? Math.round((25 + rand(p.id + "att") * 12) * share)
            : 0;
        const comp = Math.round(att * clamp(0.45 + effective * 0.002, 0, 0.83));
        const yards = Math.round(
          p.position === "QB"
            ? comp * (9 + rand(p.id + "yards") * 5)
            : effective * (p.position === "HB" ? 1.4 : 1.15),
        );
        const tackles = attack
          ? 0
          : Math.round(effective / (p.position === "FS" ? 10 : 15));
        const sacks =
          p.position === "EDGE" && rand(p.id + "sacks") < 0.55 * share
            ? 1 + (effective > 95 ? 1 : 0)
            : 0;
        const interceptions = attack
          ? p.position === "QB" && rand(p.id + "int") < 0.35 * share
            ? 1
            : 0
          : p.position === "FS" && rand(p.id + "int") < 0.2 * share
            ? 1
            : 0;
        const points = attack
          ? yards / 15 + td * 5 + (score > against && snaps > 0 ? 4 : 0)
          : tackles * 2 +
            sacks * 7 +
            interceptions * 8 +
            (score > against && snaps > 0 ? 4 : 0);
        p.boxes.push({
          snaps,
          week: s.week,
          team,
          opponent: team === m.home ? m.away : m.home,
          for: score,
          against,
          yards: attack ? yards : 0,
          td: attack ? td : 0,
          tackles,
          sacks,
          int: interceptions,
          comp,
          att,
          points,
        });
        p.recognition = clamp(
          p.recognition +
            points * 0.12 * (0.75 + schools[p.school]!.prestige / 150),
        );
        if (snaps > 0 && rand(p.id + "injury") < 0.015 + p.fatigue / 2500) {
          p.injury = {
            name: "ankle sprain",
            throughWeek: s.week + 1 + Number(rand(p.id + "severity") > 0.65),
          };
          if (p.owner === "you")
            s.news.push(
              `${p.name}: ankle sprain after the game. ${health(p, s.week)}. Missed games reduce exposure; signed campaign guarantees are protected.`,
            );
        }
        p.fatigue = clamp(p.fatigue - 3);
      }
    }
  }
  for (const defense of [false, true]) {
    const winner = s.players
      .filter(
        (p) =>
          p.season === s.year &&
          ["FS", "EDGE"].includes(p.position) === defense &&
          p.boxes.at(-1)?.week === s.week,
      )
      .sort((a, b) => b.boxes.at(-1)!.points - a.boxes.at(-1)!.points)[0];
    if (winner)
      s.honors.push({
        year: s.year,
        week: s.week,
        name: defense
          ? "Defensive Player of the Week"
          : "Offensive Player of the Week",
        player: winner.id,
      });
  }
  if (s.week === 12) {
    const rank = standings(s);
    s.matches.push(
      { week: 13, home: rank[0]!.id, away: rank[3]!.id, hs: null, as: null },
      { week: 13, home: rank[1]!.id, away: rank[2]!.id, hs: null, as: null },
    );
    const ranked = s.players
      .filter((p) => p.season === s.year)
      .sort((a, b) => seasonPoints(b) - seasonPoints(a));
    for (const pos of ["All", "QB", "HB", "WR", "FS", "EDGE"]) {
      const p = ranked.find((p) => pos === "All" || p.position === pos)!;
      s.honors.push({
        year: s.year,
        week: 0,
        name: pos === "All" ? "Founders Trophy" : `${pos} of the Year`,
        player: p.id,
      });
    }
    s.news.push("Annual awards are final. Pro Day packages are now available.");
  }
  if (s.week === 13) {
    const win = s.matches
      .filter((m) => m.week === 13)
      .map((m) => (m.hs! > m.as! ? m.home : m.away));
    s.matches.push({
      week: 14,
      home: win[0]!,
      away: win[1]!,
      hs: null,
      as: null,
    });
  }
  if (s.week === 14) {
    const f = s.matches.find((m) => m.week === 14)!;
    s.news.push(
      `${teams[f.hs! > f.as! ? f.home : f.away]} wins the national championship.`,
    );
  }
}
function rivalsTurn(s: State) {
  for (const r of s.rivals) {
    r.cash -=
      r.tier === "Established leader"
        ? 9000
        : r.tier === "Mid-sized"
          ? 3500
          : 1500;
    if (r.cash <= 0) {
      r.reputation = clamp(r.reputation - 1);
      continue;
    }
    if (
      s.week <= 6 &&
      s.week % 2 === 0 &&
      s.players.filter((p) => p.owner === r.id && p.season === s.year).length +
        reservedPlaces(s, r.id) <
        r.capacity
    ) {
      const prospects = rivalProspects(s, r);
      const p = prospects[0];
      if (p && r.cash > 8000) {
        p.owner = r.id;
        r.cash -= 4000;
        s.news.push(
          `${r.name} signs ${p.name}, ${p.position} at ${teams[p.school]}.`,
        );
      }
    }
    if (s.week === 14) {
      for (const p of s.players.filter(
        (p) =>
          p.owner === r.id && p.season === s.year && p.careerPlan !== "Return",
      )) {
        const level = r.cash > 130000 ? 2 : r.cash > 40000 ? 1 : 0;
        const cost = packages[level]!.cost;
        if (r.cash >= cost) {
          r.cash -= cost;
          p.prep = {
            level,
            focus: r.style === "Visibility" ? "Interview" : "Position",
            travel: false,
            recovery: false,
            cost,
            resolved: false,
          };
        }
      }
    }
    if (s.week <= 12) {
      for (const p of s.players.filter(
        (p) => p.owner === r.id && p.season === s.year,
      )) {
        p.ability = Math.min(p.ceiling, p.ability + 0.08);
        if (s.week % 4 === 0) {
          const earned = Math.round(p.recognition * 100);
          r.cash += earned;
          r.income += earned;
        }
      }
    }
  }
}
function creditOwner(s: State, p: Athlete, label: string, amount: number) {
  if (p.owner === "you") entry(s, `${p.name} · ${label}`, amount, "Pro income");
  else {
    const r = s.rivals.find((r) => r.id === p.owner);
    if (r) {
      r.cash += amount;
      r.income += amount;
    }
  }
}
export function advanceAgency(current: State): State {
  const s = structuredClone(current);
  initializeGameplay(s);
  initializeGrowth(s);
  active(s);
  initializeOffseason(s);
    if (s.week === 0 && !collegeClients(s).length && !s.lastPitch)
    throw Error("Sign your first client before advancing.");
  if (s.week === 18) {
    const next = nextYear(s);
    growthMilestones(next);
    return next;
  }
  s.news = [];
  offseasonBeforeAdvance(s);
  s.week++;
  const before = s.recaps[0]?.balance ?? 100000;
  const previousOutlooks = new Map(
    collegeClients(s).map((p) => [p.id, projection(p)]),
  );
  entry(s, "Office, services and payroll", -burn(s), "Expense");
  resolveDevelopment(s);
  for (const j of s.jobs) {
    const p = owned(s, j.player);
    const quality = coaches[j.specialist]!.quality * venues[j.venue]!.quality;
    const partner = s.players.find((p) => p.id === j.partner);
    const compatible =
      partner &&
      ((p.position === "QB" && partner.position === "WR") ||
        (p.position === "WR" && partner.position === "QB") ||
        (["FS", "EDGE"].includes(p.position) &&
          ["FS", "EDGE"].includes(partner.position)));
    if (j.focus === "Recovery") {
      p.fatigue = clamp(p.fatigue - 18 * Math.sqrt(quality));
      p.trust = clamp(p.trust + 3);
    } else if (j.focus === "Media") {
      p.recognition = clamp(p.recognition + quality * 2.5);
      p.fatigue = clamp(p.fatigue + 3);
      if (p.promise === "Visibility") p.delivered = true;
    } else {
      p.ability = Math.min(
        p.ceiling,
        p.ability +
          0.45 * quality * (compatible ? 1.2 : 1) * (j.intensity ? 1.3 : 1),
      );
      p.fatigue = clamp(p.fatigue + (j.intensity ? 11 : 5));
      if (p.promise === "Development") p.delivered = true;
    }
    j.left--;
    if (j.left === 0) {
      p.trust = clamp(p.trust + 4);
      s.news.push(
        `${p.name} completes ${j.focus.toLowerCase()}: ability ${Math.round(p.ability)}, recognition ${Math.round(p.recognition)}.`,
      );
    }
  }
  s.jobs = s.jobs.filter((j) => j.left > 0);
  for (const d of s.deals.filter((d) => d.status === "Active")) {
    d.left--;
    if (d.left === 0) {
      const p = s.players.find(p => p.id === d.player)!;
      const bonus = d.id.endsWith("-bonus")
        ? Math.round(d.gross * clamp((p.recognition - 20) / 35, 0, 1.6))
        : 0;
      d.gross += bonus;
      const commission = Math.round((d.gross * d.fee) / 100);
      entry(s, `${p.name} · ${d.brand} commission`, commission, "Commission");
      d.status = "Paid";
      if (p.owner === 'you') {
        p.trust = clamp(p.trust + 5);
        if (p.promise === "Security") p.delivered = true;
      }
      const prestige = d.gross >= 100000 ? 10 : d.gross >= 50000 ? 6 : 2;
      s.reputation = clamp(s.reputation + prestige);
      s.news.push(
        `${d.brand} pays ${cash(d.gross)}: client keeps ${cash(d.gross - commission)}; agency earns ${cash(commission)}. Prestige +${prestige}.`,
      );
    }
  }
  for (const p of collegeClients(s)) {
    if (p.fatigue > 40) {
      p.trust = clamp(p.trust - 4);
      s.news.push(
        `${p.name} feels overloaded. Recovery or a support session could help.`,
      );
    }
    if (s.week === 8 && !p.delivered) {
      p.trust = clamp(p.trust - 15);
      s.news.push(
        `${p.name} expected ${p.promise.toLowerCase()} support. Their trust has fallen.`,
      );
    }
  }
  resolveRecruitingDeadlines(s);
  rivalsTurn(s);
  if (s.week <= 14) {
    simulateFootball(s);
    for (const p of collegeClients(s)) {
      const old = previousOutlooks.get(p.id);
      if (old !== projection(p) && scoutingLevel(p) >= 2)
        s.news.push(
          `${p.name}: updated career assessment after performance and development: ${researchedOutlook(p)}.`,
        );
    }
  }
  if (s.week === 15) {
    for (const p of s.players.filter(
      (p) => p.season === s.year && p.careerPlan !== "Return",
    )) {
      if (p.prep) {
        const prep = p.prep,
          b = packages[prep.level]!.boost;
        const fit = prep.focus === "Testing" ? 1.5 : 1;
        p.testing += b * fit + (prep.travel ? 1 : 0);
        p.interview += prep.focus === "Interview" ? b * 1.6 : b * 0.3;
        if (prep.focus === "Position")
          p.ability = Math.min(p.ceiling, p.ability + b * 0.35);
        if (prep.recovery) p.fatigue = clamp(p.fatigue - 20);
        prep.resolved = true;
      }
      if (p.owner === "you")
        s.news.push(
          `${p.name}: ${p.prep ? "preparation complete" : "self-directed preparation"}. Updated outlook: ${projection(p)}. Testing improves evaluation, not guaranteed selection.`,
        );
    }
  }
  if (s.week === 16) {
    for (const p of collegeClients(s).filter((p) => p.careerPlan === "Return")) {
      const agreement = nextAgreement(s, p.id);
      s.news.push(
        agreement
          ? `${p.name} will play at ${teams[agreement.school]} in Year ${p.schoolYear + 1} under the signed ${cash(agreement.gross)} school agreement. Playing time and additional sponsor earnings remain uncertain.`
          : `${p.name} is returning to ${teams[p.school]} for Year ${p.schoolYear + 1}. Another season offers playing time and NIL opportunities, not guaranteed earnings.`,
      );
    }
    const eligible = s.players.filter(
      (p) => p.season === s.year && p.careerPlan !== "Return",
    );
    const used = new Set<number>();
    for (const p of eligible.sort((a, b) => draftGrade(b) - draftGrade(a))) {
      const grade = draftGrade(p) + (roll(s.seed, p.id + "draft") - 0.5) * 7;
      if (grade >= 78) {
        let pick = Math.max(
          1,
          Math.min(224, Math.round(224 - (grade - 78) * 13)),
        );
        while (used.has(pick) && pick <= 224) pick++;
        if (pick <= 224) {
          used.add(pick);
          p.pick = pick;
          p.status = "Drafted";
          const payout = draftPayout(pick);
          creditOwner(
            s,
            p,
            "pro contract signing · fictional agency payout",
            payout,
          );
          const r = s.rivals.find((r) => r.id === p.owner);
          if (r) {
            r.drafted++;
            r.reputation = clamp(r.reputation + 1);
          }
          if (p.owner === "you") {
            s.reputation = clamp(
              s.reputation + Math.max(3, 10 - Math.ceil(pick / 32)),
            );
            s.news.push(
              `${p.name} selected Round ${Math.ceil(pick / 32)}, Pick ${((pick - 1) % 32) + 1}. Agency signing income ${cash(payout)}.`,
            );
          }
          continue;
        }
      }
      p.status = "Undrafted";
      if (p.owner === "you")
        s.news.push(
          `${p.name} goes undrafted. Professional-team outreach is available before offers arrive.`,
        );
    }
  }
  if (s.week === 17) {
    for (const p of s.players.filter(
      (p) => p.season === s.year && p.status === "Undrafted",
    )) {
      const support = p.interview >= 100,
        grade = draftGrade({
          ...p,
          interview: support ? p.interview - 100 : p.interview,
        });
      const r = roll(s.seed, p.id + "udfa");
      const chance = clamp(
        0.18 + (grade - 68) * 0.035 + (support ? 0.2 : 0),
        0.08,
        0.8,
      );
      if (r < chance) {
        p.status = "Signed";
        creditOwner(s, p, "undrafted contract signing", 12000);
      } else p.status = r < chance + 0.3 ? "Tryout" : "Unsigned";
      if (p.owner === "you")
        s.news.push(
          `${p.name}: ${p.status === "Signed" ? "undrafted contract signed; agency earns $12,000" : p.status === "Tryout" ? "invited to a tryout" : "no professional offer yet"}.`,
        );
    }
  }
  if (s.week === 18) {
    for (const p of s.players.filter(
      (p) =>
        p.season === s.year &&
        ["Drafted", "Signed", "Tryout"].includes(p.status),
    )) {
      const chance =
        p.status === "Drafted" ? 0.87 : p.status === "Signed" ? 0.57 : 0.26;
      const made = roll(s.seed, p.id + "roster") < chance;
      const fromTryout = p.status === "Tryout";
      if (made) {
        if (fromTryout)
          creditOwner(
            s,
            p,
            "tryout converted to a professional contract",
            12000,
          );
        p.status = "Pro";
        p.proYears = 0;
        creditOwner(s, p, "roster milestone", p.pick ? 15000 : 8000);
      } else p.status = "Unsigned";
      if (p.owner === "you")
        s.news.push(
          `${p.name} ${made ? "makes a professional roster. Your representation continues." : fromTryout ? "finishes the tryout without a contract or roster place." : "does not make a roster. Signing income already earned is retained."}`,
        );
    }
    s.news.push(
      "The year review will settle any bridge loan. Continuing professionals provide annual income next year. Clients below 50 trust may choose another agency.",
    );
  }
  weeklyGameplay(s);
  offseasonAfterWeek(s);
  if (s.money < 0) {
    s.failed = true;
    s.news.unshift(
      "The agency cannot pay its bills. Your career ends with negative cash.",
    );
  }
  growthMilestones(s);
  s.recaps.unshift({
    year: s.year,
    week: s.week,
    title: phase(s),
    news: [...s.news],
    careers:
      s.week >= 15
        ? clientList(s)
            .filter((p) => p.season === s.year)
            .map((p) => ({
              returning: p.careerPlan === "Return",
              player: p.id,
              status: p.status,
              pick: p.pick,
              outlook: projection({
                ...p,
                interview: p.interview >= 100 ? p.interview - 100 : p.interview,
              }),
            }))
        : [],
    boxes: clientList(s).flatMap((p) => {
      const box = p.boxes.find((b) => b.week === s.week && p.season === s.year);
      return box ? [{ player: p.id, box }] : [];
    }),
    net: s.money - before,
    balance: s.money,
  });
  return s;
}
function nextYear(s: State): State {
  if (s.loan) {
    entry(s, "Bridge principal and 12% annual interest", -44800, "Repayment");
    s.loan = false;
  }
  if (s.money < 0) {
    s.failed = true;
    s.news = ["The bridge repayment exhausted your cash. The agency closes."];
    return s;
  }
  s.news = [];
  s.year++;
  s.week = 0;
  for (const p of s.players.filter(
    (p) =>
      (p.owner === "you" && p.status !== "Departed") ||
      (p.status === "College" &&
        p.careerPlan === "Return" &&
        p.season === s.year - 1),
  )) {
    if (p.owner === "you") p.representedByYou = true;
    if (
      p.status === "College" &&
      p.careerPlan === "Return" &&
      p.eligibility > 1
    ) {
      p.schoolYear++;
      p.eligibility--;
      p.season = s.year;
      p.careerPlan = p.schoolYear < 3 ? "Return" : "Draft";
      p.approached = -1;
      p.boxes = [];
      p.prep = null;
      p.testing = 0;
      p.interview = 0;
      p.injury = null;
      p.fatigue = 0;
      p.delivered = false;
      applySchoolDestination(s, p);
      if (p.owner === "you")
        s.news.push(
          `${p.name} returns to ${teams[p.school]}: ${yearLabel(p)}. Their client place and commission terms carry forward.`,
        );
    } else if (p.status === "Pro") {
      if (p.trust < 50) {
        p.owner = p.promise === "Visibility" ? "crown" : "field";
        p.status = "Departed";
        s.news.push(
          `${p.name} changes representation at renewal after unmet expectations.`,
        );
      } else {
        p.proYears++;
        if (p.proYears > 4) {
          p.status = "Departed";
          s.news.push(`${p.name} retires after a professional career.`);
        } else {
          creditOwner(
            s,
            p,
            "continuing professional representation",
            p.pick ? 22000 : 12000,
          );
          s.news.push(
            `${p.name} renews professional representation. Agency income of ${cash(p.pick ? 22000 : 12000)} helps fund this year's recruiting class.`,
          );
        }
      }
    } else {
      p.status = "Departed";
      s.news.push(
        `${p.name}'s college representation closes without an ongoing professional contract.`,
      );
    }
  }
  for (const p of s.players.filter(
    (p) => p.owner && p.owner !== "you" && p.status === "Pro",
  )) {
    p.proYears++;
    if (p.proYears > 4) p.status = "Departed";
    else
      creditOwner(
        s,
        p,
        "continuing professional representation",
        p.pick ? 22000 : 12000,
      );
  }
  s.matches = schedule();
  s.jobs = [];
  const returning = s.players.filter(
    (p) => p.status === "College" && p.season === s.year,
  );
  s.players.push(
    ...population(s.seed, s.year).filter(
      (p) =>
        !returning.some(
          (q) => q.school === p.school && q.position === p.position,
        ),
    ),
  );
  graduateSeniors(s);
  s.news.unshift(
    "A new class is available. Your office, cash, prestige and professional relationships carry forward.",
  );
  return s;
}
export function restore(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as State;
    if (
      s.version !== 1 ||
      !Number.isFinite(s.money) ||
      !Number.isFinite(s.seed) ||
      !Number.isInteger(s.week) ||
      s.week < 0 ||
      s.week > 18 ||
      !Array.isArray(s.players) ||
      !Array.isArray(s.rivals) ||
      s.rivals.length !== 5 ||
      !Array.isArray(s.recaps) ||
      !Array.isArray(s.ledger) ||
      !Array.isArray(s.jobs) ||
      !Array.isArray(s.deals) ||
      !Array.isArray(s.matches) ||
      !Array.isArray(s.honors) ||
      !Number.isFinite(s.reputation) ||
      !Number.isInteger(s.year) ||
      !Number.isInteger(s.staff) ||
      s.staff < 0 ||
      s.staff > 2 ||
      !s.players.every(
        (p) =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          Array.isArray(p.boxes) &&
          Number.isFinite(p.ability) &&
          Number.isFinite(p.recognition) &&
          Number.isFinite(p.trust),
      ) ||
      !s.rivals.every(
        (r) =>
          r &&
          typeof r.id === "string" &&
          Number.isFinite(r.cash) &&
          Number.isFinite(r.reputation),
      )
    )
      return null;
    for (const p of s.players) {
      // Preserve existing careers: old saves described all prospects as draft-bound.
      if (p.schoolYear === undefined)
        Object.assign(p, { ...profile(0), schoolYear: 4 });
      if (
        !schools[p.school] ||
        !Number.isInteger(p.schoolYear) ||
        p.schoolYear < 1 ||
        p.schoolYear > 7 ||
        !Number.isInteger(p.eligibility) ||
        p.eligibility < 1 ||
        p.eligibility > 4 ||
        !["Draft", "Return"].includes(p.careerPlan) ||
        !Number.isFinite(p.transferredYear) ||
        (p.scoutingLevel !== undefined &&
          ![0, 1, 2, 3].includes(p.scoutingLevel)) ||
        (p.injury !== null &&
          (!p.injury ||
            typeof p.injury.name !== "string" ||
            !Number.isInteger(p.injury.throughWeek)))
      )
        return null;
    }
    if (
      s.gameplay &&
      ![
        "requests",
        "negotiations",
        "offers",
        "ambitions",
        "seniors",
        "referrals",
      ].every((key) =>
        Array.isArray((s.gameplay as unknown as Record<string, unknown>)[key]),
      )
    )
      return null;
    initializeGameplay(s);
    if (
      s.growth &&
      (!s.growth.clients ||
        typeof s.growth.clients !== "object" ||
        !Array.isArray(s.growth.records) ||
        !Array.isArray(s.growth.milestones) ||
        !Number.isFinite(s.growth.peak) ||
        !Object.values(s.growth.clients).every(
          (c) =>
            c &&
            Number.isFinite(c.ability) &&
            Number.isFinite(c.recognition) &&
            Number.isFinite(c.anchor) &&
            Array.isArray(c.skills) &&
            c.skills.length === 3 &&
            c.skills.every(Number.isFinite),
        ) ||
        !s.growth.records.every(
          (r) =>
            r &&
            s.players.some((p) => p.id === r.player) &&
            ["Skill", "Media", "Recovery", "Mentor", "Styling", "Social", "Press"].includes(r.kind) &&
            ["Active", "Complete"].includes(r.status) &&
            [0, 1, 2].includes(r.skill) &&
            [0, 1, 2].includes(r.provider) &&
            Number.isFinite(r.cost) &&
            r.cost >= 0 &&
            Number.isInteger(r.due) &&
            Number.isInteger(r.week) &&
            r.due > r.week &&
            Number.isFinite(r.missed) &&
            r.before &&
            Number.isFinite(r.before.ability),
        ))
    )
      return null;
    if (s.players.some(p => p.brandKit !== undefined && (!Array.isArray(p.brandKit) || new Set(p.brandKit).size !== p.brandKit.length || p.brandKit.some(k => !['Styling','Social','Press'].includes(k))))) return null;
    initializeGrowth(s);
    if (!validOffseason(s)) return null;
    initializeOffseason(s);
    ensureCareerReviews(s);
    return s;
  } catch {
    return null;
  }
}
