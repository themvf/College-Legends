import { activeDevelopment } from './growth.js';
import { commercialService } from './commercial.js';
import {
  cash,
  collegeClients,
  depth,
  priorities,
  roll,
  schools,
  teams,
  type Athlete,
  type State,
  type Want,
} from "./model.js";

export type ClientRequest = {
  prompt?: string;
  id: string;
  player: string;
  year: number;
  week: number;
  deadline: number;
  kind: "Workload" | "Opportunity" | "Income";
  status: "Open" | "Answered" | "Expired";
  choice?: number;
  response?: string;
  followup?: string;
  followupWeek?: number;
};
export type Negotiation = {
  id: string;
  player: string;
  rival: string;
  year: number;
  deadline: number;
  fee: number;
  promise: Want;
  rivalFee: number;
  status: "Open" | "Won" | "Lost" | "Passed";
  result?: string;
};
export type SponsorOffer = {
  id: string;
  player: string;
  year: number;
  week: number;
  deadline: number;
  points: number;
  gross: number;
  status: "Open" | "Accepted" | "Passed" | "Expired";
  choice?: "Full" | "Light";
  result?: string;
};
export type Ambition = {
  id: string;
  player: string;
  year: number;
  kind: "Starter" | "Growth" | "Income" | "Stage" | "Profile";
  baseline: number;
  target: number;
  completed?: number;
  memory?: string;
};
export type Senior = {
  id: string;
  name: string;
  position: Athlete["position"];
  year: number;
  ability: number;
  ceiling: number;
  want: Want;
  schools: number[];
  committed: number | null;
  watched: boolean;
  research: number;
};
export type GameplayState = {
  requests: ClientRequest[];
  negotiations: Negotiation[];
  offers: SponsorOffer[];
  ambitions: Ambition[];
  seniors: Senior[];
  referrals: { player: string; from: string; year: number }[];
};
export type GameplayAction =
  | { type: "request"; id: string; choice: number }
  | {
      type: "counter";
      id: string;
      fee: number;
      promise: Want;
      attention: boolean;
    }
  | { type: "walkAway"; id: string }
  | { type: "spotlightDeal"; id: string; choice: "Full" | "Light" | "Pass" }
  | { type: "watchSenior"; id: string }
  | { type: "researchSenior"; id: string };

const limit = (n: number) => Math.max(0, Math.min(100, n));
export function gameplay(s: State): GameplayState {
  return (s.gameplay ??= {
    requests: [],
    negotiations: [],
    offers: [],
    ambitions: [],
    seniors: [],
    referrals: [],
  });
}
function pay(s: State, label: string, amount: number) {
  if (s.money < amount)
    throw Error(
      `This needs ${cash(amount)}. You have ${cash(s.money)} available.`,
    );
  s.money -= amount;
  s.ledger.push({
    year: s.year,
    week: s.week,
    label,
    amount: -amount,
    kind: "Expense",
  });
}
export function initializeGameplay(s: State) {
  const g = gameplay(s);
  if (!g.seniors.some((p) => p.year === s.year)) {
    for (let i = 0; i < 3; i++) {
      const id = `hs-${s.year}-${i}`;
      const school = Math.floor(roll(s.seed, id + "school") * 16);
      const ability = 63 + Math.floor(roll(s.seed, id + "ability") * 14);
      g.seniors.push({
        id,
        year: s.year,
        name: `${["Darius", "Cam", "Jordan"][i]} ${["Bennett", "Lawson", "Sutton"][(i + s.year - 2027) % 3]}`,
        position: (["QB", "WR", "FS"] as const)[i]!,
        ability,
        ceiling: Math.min(
          97,
          ability + 10 + Math.floor(roll(s.seed, id + "ceiling") * 9),
        ),
        want: (["Development", "Visibility", "Security"] as const)[i]!,
        schools: [school, (school + 5) % 16, (school + 10) % 16],
        committed:
          s.week >= 10
            ? [school, (school + 5) % 16, (school + 10) % 16][
                Math.floor(roll(s.seed, id + "commit") * 3)
              ]!
            : null,
        watched: false,
        research: 0,
      });
    }
  }
  for (const p of collegeClients(s)) assignAmbition(s, p);
  // Retire unfinished coach-style goals in older saves while keeping achieved history.
  for (const a of g.ambitions.filter(a=>a.kind==='Growth'&&a.completed===undefined)) {
    const p=s.players.find(p=>p.id===a.player);
    if(p){a.kind='Profile';a.baseline=p.recognition;a.target=Math.min(100,p.recognition+15);}
  }
}
export function assignAmbition(s: State, p: Athlete) {
  const g = gameplay(s);
  if (g.ambitions.some((a) => a.player === p.id && a.year === s.year)) return;
  const kind: Ambition["kind"] =
    p.want === "Security"
      ? "Income"
      : p.want === "Visibility" && p.recognition < 99
        ? "Profile"
        : p.recognition < 99 ? "Profile" : "Income";
  const baseline = kind === "Profile" ? p.recognition : 0;
  g.ambitions.push({
    id: `${p.id}-goal-${s.year}`,
    player: p.id,
    year: s.year,
    kind,
    baseline,
    target:
      kind === "Profile"
          ? Math.min(100, p.recognition + 15)
          : kind === "Income"
            ? 15000
            : 1,
  });
}
export function ambitionLabel(a: Ambition) {
  return a.kind === "Starter"
    ? "Earn a starting role and play at least 60% of snaps in a game"
    : a.kind === "Growth"
      ? `Improve ability to ${Math.round(a.target * 10) / 10}`
      : a.kind === "Income"
        ? "Take home $15,000 from NIL campaigns"
        : a.kind === "Stage"
          ? `Play at a school with prestige ${a.target}+ and earn at least 40% of snaps`
          : `Build public profile to ${Math.round(a.target)}`;
}
export function ambitionProgress(s: State, p: Athlete, a: Ambition) {
  if (a.completed !== undefined) return 1;
  if (a.kind === "Income")
    return Math.min(
      1,
      s.deals
        .filter(
          (d) => d.player === p.id && d.year === a.year && d.status === "Paid",
        )
        .reduce(
          (n, d) => n + d.gross - Math.round((d.gross * d.fee) / 100),
          0,
        ) / a.target,
    );
  if (a.kind === "Starter")
    return p.boxes.some((b) => (b.snaps ?? 0) >= 60) ? 1 : 0;
  if (a.kind === "Stage")
    return p.boxes.some(
      (b) => schools[b.team]!.prestige >= a.target && (b.snaps ?? 0) >= 40,
    )
      ? 1
      : 0;
  const value = a.kind === "Growth" ? p.ability : p.recognition;
  return Math.max(
    0,
    Math.min(1, (value - a.baseline) / Math.max(1, a.target - a.baseline)),
  );
}
export function recruitingBonus(s: State, p: Athlete) {
  const g = s.gameplay;
  const senior = g?.seniors.find((q) => q.id === p.id);
  return Math.min(
    12,
    (senior ? senior.research * 4 + (senior.watched ? 2 : 0) : 0) +
      (g?.referrals.some((r) => r.player === p.id && r.year === s.year)
        ? 8
        : 0),
  );
}
export function updateAmbitions(s: State) {
  for (const a of gameplay(s).ambitions.filter(
    (a) => a.year === s.year && a.completed === undefined,
  )) {
    const p = s.players.find((p) => p.id === a.player && p.owner === "you");
    if (!p || ambitionProgress(s, p, a) < 1) continue;
    a.completed = s.week;
    p.trust = limit(p.trust + 8);
    s.reputation = limit(s.reputation + 2);
    a.memory = `${s.year}, Week ${s.week}: ${p.name} achieved “${ambitionLabel(a)}”. Trust +8; agency prestige +2.`;
    s.news.unshift(a.memory);
    const referral =
      s.week <= 6 &&
      s.players.find(
        (q) =>
          q.season === s.year &&
          q.status === "College" &&
          !q.owner &&
          q.id !== p.id &&
          !gameplay(s).referrals.some((r) => r.player === q.id),
      );
    if (referral) {
      gameplay(s).referrals.push({
        player: referral.id,
        from: p.id,
        year: s.year,
      });
      a.memory += ` Referred ${referral.name}: +8 recruiting interest this season.`;
      s.news.unshift(
        `${p.name} introduces you to ${referral.name}. The referral helps your pitch; signing is still their choice.`,
      );
    }
  }
}

export function reservedPlaces(s: State, rival: string) {
  return gameplay(s).negotiations.filter(
    (n) => n.rival === rival && n.status === "Open",
  ).length;
}
export function pendingNegotiation(s: State, player: string) {
  return s.gameplay?.negotiations.find(
    (n) => n.player === player && n.status === "Open",
  );
}
export function beginNegotiation(
  s: State,
  p: Athlete,
  promise: Want,
  fee: number,
) {
  if (p.ability < 73) return false;
  const rival = [...s.rivals]
    .filter(
      (r) =>
        r.cash > 8000 &&
        p.ability < 68 + r.reputation * 0.3 &&
        s.players.filter((q) => q.owner === r.id && q.season === s.year)
          .length +
          reservedPlaces(s, r.id) <
          r.capacity,
    )
    .sort(
      (a, b) =>
        Number(b.style === p.want) - Number(a.style === p.want) ||
        a.reputation - b.reputation,
    )[0];
  if (!rival) return false;
  rival.cash -= 4000; // A real, refundable recruiting commitment, reserved until resolution.
  const n: Negotiation = {
    id: `${p.id}-neg-${s.year}-${s.week}`,
    player: p.id,
    rival: rival.id,
    year: s.year,
    deadline: s.week + 1,
    fee,
    promise,
    rivalFee: rival.reputation > 70 ? 20 : 15,
    status: "Open",
  };
  gameplay(s).negotiations.push(n);
  const message = `${p.name} wants a final offer. ${rival.name} offers ${n.rivalFee}% commission and “${priorities[rival.style].label.toLowerCase()}”. Counter by the end of Week ${n.deadline}, or they sign with the rival.`;
  s.lastPitch = {
    player: p.id,
    accepted: false,
    pending: true,
    message,
    competition: `${rival.name} has reserved $4,000 and one client place for this offer.`,
    cost: 500,
    year: s.year,
    week: s.week,
  };
  s.news.unshift(message);
  return true;
}
export function counterChance(
  s: State,
  n: Negotiation,
  fee: number,
  promise: Want,
  attention: boolean,
) {
  const p = s.players.find((p) => p.id === n.player)!;
  const r = s.rivals.find((r) => r.id === n.rival)!;
  const score = (rep: number, service: Want, rate: number) =>
    rep * 0.3 + (service === p.want ? 25 : 0) + (20 - rate) * 2;
  return Math.round(
    Math.max(
      10,
      Math.min(
        90,
        50 +
          (score(s.reputation, promise, fee) +
            (attention ? 12 : 0) +
            recruitingBonus(s, p) -
            score(r.reputation, r.style, n.rivalFee)) *
            0.8,
      ),
    ),
  );
}
function settleNegotiation(
  s: State,
  n: Negotiation,
  offer?: { fee: number; promise: Want; attention: boolean },
) {
  const p = s.players.find((p) => p.id === n.player)!;
  const r = s.rivals.find((r) => r.id === n.rival)!;
  const won =
    !!offer &&
    roll(s.seed, n.id + "decision") * 100 <
      counterChance(s, n, offer.fee, offer.promise, offer.attention);
  if (won && offer) {
    pay(
      s,
      `${p.name} · onboarding${offer.attention ? " and dedicated planning session" : ""}`,
      1500 + (offer.attention ? 2500 : 0),
    );
    r.cash += 4000;
    p.owner = "you";
    p.representedByYou = true;
    p.fee = offer.fee;
    p.promise = offer.promise;
    p.trust = offer.promise === p.want ? 80 : 65;
    if (offer.attention) {
      p.trust = limit(p.trust + 6);
      p.fatigue = limit(p.fatigue - 8);
    }
    n.status = "Won";
    assignAmbition(s, p);
    n.result = `${p.name} chose your ${offer.fee}% offer and ${priorities[offer.promise].label.toLowerCase()} plan. ${r.name}'s recruiting commitment was refunded.${offer.attention ? " Your dedicated planning session added 6 trust and relieved 8 fatigue; the service promise still needs delivery." : ""}`;
  } else {
    p.owner = r.id;
    p.fee = n.rivalFee;
    p.promise = r.style;
    n.status = offer ? "Lost" : "Passed";
    n.result = `${p.name} signs with ${r.name} at ${n.rivalFee}% commission. ${offer ? "Your final offer was considered, but they preferred the rival." : "You did not counter before the decision, or chose to walk away."} The rival's $4,000 commitment funds the signing.`;
  }
  s.news.unshift(n.result);
  s.lastPitch = {
    player: p.id,
    accepted: won,
    message: n.result,
    competition: won
      ? "The rival offer is closed."
      : `${r.name} won this recruitment.`,
    cost: won ? 2000 + (offer?.attention ? 2500 : 0) : 500,
    year: s.year,
    week: s.week,
  };
}
export function resolveRecruitingDeadlines(s: State) {
  for (const n of gameplay(s).negotiations.filter(
    (n) => n.status === "Open" && s.week > n.deadline,
  ))
    settleNegotiation(s, n);
}

export function requestText(r: ClientRequest) {
  if (r.prompt) return r.prompt;
  return r.kind === "Workload"
    ? "I am feeling the workload. Can we make room to recover?"
    : r.kind === "Income"
      ? "I need this season to bring in money. Can you help me become ready for a sponsor?"
      : "I want better commercial opportunities. Can we improve my presentation or review next season’s school options?";
}
export function requestOptions(r: ClientRequest, p?: Athlete) {
  return r.kind === "Workload"
    ? [
        {
          label: "Arrange recovery",
          detail:
            "$1,500 · fatigue −18, trust +6; signed campaigns stay in place",
          cost: 1500,
        },
        {
          label: "Keep the schedule",
          detail: "$0 · public profile +3, fatigue +8, trust −4",
          cost: 0,
        },
        {
          label: "Make time to listen",
          detail: "$0 · fatigue −5, trust +2",
          cost: 0,
        },
      ]
    : r.kind === "Income"
      ? [
          {
            label: "Build a sponsor presentation",
            detail:
              "$1,500 · public profile +8, fatigue +5, trust +6; no guaranteed deal",
            cost: 1500,
          },
          {
            label: "Put football first",
            detail: "$0 · fatigue −6, trust −3",
            cost: 0,
          },
          {
            label: "Arrange a small media session",
            detail: "$500 · public profile +3, fatigue +2, trust +2",
            cost: 500,
          },
        ]
      : [
          {
            label: "Build a sponsor portfolio",
            detail:
              "$2,000 · public profile +6, fatigue +6, trust +6; no guaranteed deal",
            cost: 2000,
          },
          {
            label: "Review the next step",
            detail:
              p && p.eligibility > 1 && schools[p.school]!.prestige <= 87
                ? "$1,000 · public profile +3, trust +3; unfinished ambition becomes a school move next season if returning"
                : "$1,000 · public profile +3, trust +3; clarify career options",
            cost: 1000,
          },
          {
            label: "Let this season develop",
            detail: "$0 · fatigue −4, trust −2",
            cost: 0,
          },
        ];
}
export function storyAction(s: State, a: GameplayAction) {
  const g = gameplay(s);
  if (a.type === "watchSenior" || a.type === "researchSenior") {
    const p = g.seniors.find((p) => p.id === a.id && p.year === s.year);
    if (!p) throw Error("Choose a senior in this year's watchlist.");
    if (a.type === "watchSenior") p.watched = !p.watched;
    else {
      if (p.research >= 2) throw Error("Your senior research is complete.");
      if (p.research === 1 && s.week < 6)
        throw Error("The follow-up conversation opens in Week 6.");
      pay(
        s,
        `${p.name} · ${p.research ? "senior follow-up" : "senior film report"}`,
        p.research ? 1500 : 500,
      );
      p.research++;
      p.watched = true;
      s.news.unshift(
        `${p.name}: ${p.research === 1 ? "film report added. A follow-up conversation opens in Week 6." : `follow-up complete. Priority learned: ${priorities[p.want].label.toLowerCase()}.`}`,
      );
    }
    return;
  }
  if (a.type === "counter" || a.type === "walkAway") {
    const n = g.negotiations.find(
      (n) => n.id === a.id && n.status === "Open" && n.year === s.year,
    );
    if (!n || s.week > n.deadline) throw Error("This negotiation has closed.");
    if (a.type === "counter") {
      if (![10, 15, 20].includes(a.fee) || !priorities[a.promise])
        throw Error("Choose a valid final offer.");
      if (collegeClients(s).length >= 4 + s.staff)
        throw Error(
          "Your college client capacity is full. Walk away or hire support before countering.",
        );
      if (s.money < 1500 + (a.attention ? 2500 : 0))
        throw Error(
          "Reserve the onboarding and any dedicated-session cost before countering.",
        );
      settleNegotiation(s, n, a);
    } else settleNegotiation(s, n);
    return;
  }
  if (a.type === "request") {
    const r = g.requests.find(
      (r) => r.id === a.id && r.status === "Open" && r.year === s.year,
    );
    if (!r || s.week > r.deadline || ![0, 1, 2].includes(a.choice))
      throw Error("Choose an open client request and response.");
    const p = s.players.find(
      (p) => p.id === r.player && p.owner === "you" && p.status === "College",
    );
    if (!p) throw Error("This player is no longer a college client.");
    const option = requestOptions(r, p)[a.choice]!;
    pay(s, `${p.name} · ${option.label}`, option.cost);
    if (r.kind === "Workload") {
      p.fatigue = limit(p.fatigue + [-18, 8, -5][a.choice]!);
      p.trust = limit(p.trust + [6, -4, 2][a.choice]!);
      if (a.choice === 1) p.recognition = limit(p.recognition + 3);
    } else if (r.kind === "Income") {
      p.recognition = limit(p.recognition + [8, 0, 3][a.choice]!);
      p.fatigue = limit(p.fatigue + [5, -6, 2][a.choice]!);
      p.trust = limit(p.trust + [6, -3, 2][a.choice]!);
    } else {
      p.trust = limit(p.trust + [6, 3, -2][a.choice]!);
      p.fatigue = limit(p.fatigue + [6, 0, -4][a.choice]!);
      if (a.choice === 0) {
        p.recognition = limit(p.recognition + 6);
        // A quick portfolio consultation does not replace the promised completed brand project.
      }
      if (a.choice === 1) {
        p.recognition = limit(p.recognition + 3);
        const goal = g.ambitions.find(
          (g) =>
            g.player === p.id && g.year === s.year && g.completed === undefined,
        );
        if (goal && p.eligibility > 1 && schools[p.school]!.prestige <= 87) {
          goal.kind = "Stage";
          goal.baseline = schools[p.school]!.prestige;
          goal.target = goal.baseline + 10;
        }
      }
    }
    r.status = "Answered";
    r.choice = a.choice;
    r.followupWeek = s.week + 2;
    r.response = `${option.label}. ${option.detail}. Follow-up in Week ${r.followupWeek}.`;
    s.news.unshift(`${p.name}: ${r.response}`);
    return;
  }
  const o = g.offers.find(
    (o) => o.id === a.id && o.status === "Open" && o.year === s.year,
  );
  if (!o || s.week > o.deadline) throw Error("This sponsor window has closed.");
  if (a.choice === "Pass") {
    o.status = "Passed";
    o.result = "Passed to protect time for football and existing commitments.";
    return;
  }
  if (!["Full", "Light"].includes(a.choice))
    throw Error("Choose a campaign workload.");
  const p = s.players.find(
    (p) => p.id === o.player && p.owner === "you" && p.status === "College",
  );
  if (!p || s.deals.some((d) => d.player === p.id && d.status === "Active"))
    throw Error(
      "Finish this client's active campaign before accepting another.",
    );
  if (activeDevelopment(s).some(r=>r.player===p.id&&commercialService(r.kind))) throw Error('Finish brand preparation before signing a campaign.');
  const light = a.choice === "Light",
    cost = 0; // Sponsor pays its production costs.
  s.deals.push({
    id: o.id,
    player: p.id,
    brand: `Saturday Spotlight · Week ${o.week}`,
    kind: 3,
    gross: Math.round(o.gross * (light ? 0.6 : 1)),
    fee: p.fee,
    cost,
    left: light ? 1 : 2,
    status: "Active",
    year: s.year,
  });
  p.fatigue = limit(p.fatigue + (light ? 4 : 14));
  if (p.promise === "Visibility") p.delivered = true;
  o.status = "Accepted";
  o.choice = a.choice;
  o.result = `${a.choice} campaign signed. Payment in ${light ? 1 : 2} week${light ? "" : "s"}; guarantee survives injury.`;
  s.news.unshift(`${p.name}: ${o.result}`);
}

export function weeklyGameplay(s: State) {
  const g = gameplay(s);
  for (const r of g.requests.filter((r) => r.year === s.year)) {
    const p = s.players.find((p) => p.id === r.player)!;
    if (r.status === "Open" && s.week > r.deadline) {
      r.status = "Expired";
      p.trust = limit(p.trust - 4);
      r.response = "No response before the deadline. Trust −4; no money spent.";
      s.news.push(`${p.name}: ${r.response}`);
    }
    if (r.status === "Answered" && !r.followup && s.week >= r.followupWeek!) {
      r.followup =
        r.kind === "Workload"
          ? `The recovery check: fatigue is now ${Math.round(p.fatigue)}; ${p.fatigue > 55 ? "workload still limits snaps" : "fatigue is not limiting snaps"}.`
          : r.kind === "Income"
            ? `Sponsor check: public profile ${Math.round(p.recognition)}; ${s.deals.some((d) => d.player === p.id && d.year === s.year) ? "a campaign is on the books" : "you still need to secure a campaign"}.`
            : `Football check: ${depth(p).role} at ${teams[p.school]}; ability ${Math.round(p.ability)}. ${r.choice === 1 ? "Compare school offers in the offseason, with eligibility and playing time to consider." : "Coaches set the depth chart; representation cannot guarantee starts."}`;
      s.news.push(`${p.name} follows up: ${r.followup}`);
    }
  }
  for (const o of g.offers.filter(
    (o) => o.status === "Open" && s.week > o.deadline,
  )) {
    o.status = "Expired";
    o.result = "Sponsor moved on. No cost or penalty.";
    s.news.push(
      `Saturday Spotlight for ${s.players.find((p) => p.id === o.player)!.name} expired. No cost or penalty.`,
    );
  }
  let newRequests = 0;
  for (const p of collegeClients(s)) {
    const history = g.requests.filter(
      (r) => r.player === p.id && r.year === s.year,
    );
    if (
      s.week >= 2 &&
      s.week <= 10 &&
      history.length < 3 &&
      !history.some((r) => r.status === "Open") &&
      s.week - (history.at(-1)?.week ?? -2) >= 4 &&
      newRequests < 2
    ) {
      const kind =
        p.fatigue >= 25 || (p.injury && s.week <= p.injury.throughWeek)
          ? "Workload"
          : (p.want === "Security" || p.want === "Visibility") &&
              !s.deals.some(
                (d) =>
                  d.player === p.id && d.year === s.year && d.status === "Paid",
              )
            ? "Income"
            : "Opportunity";
      const r: ClientRequest = {
        id: `${p.id}-request-${s.year}-${s.week}`,
        player: p.id,
        year: s.year,
        week: s.week,
        deadline: s.week + 1,
        kind,
        status: "Open",
      };
      r.prompt =
        kind === "Workload"
          ? p.injury && s.week <= p.injury.throughWeek
            ? `I'm recovering from an ${p.injury.name}. Can we make room to recover around my commitments?`
            : `My fatigue is at ${Math.round(p.fatigue)}. Can we make room to recover around my commitments?`
          : kind === "Income"
            ? p.want === "Visibility"
              ? "Can we make more of my Saturday performances? I want people to know my name."
              : "I need this season to bring in money. Can you help me become ready for a sponsor?"
            : depth(p).rank > 1
              ? `I'm still ${p.position}${depth(p).rank} at ${teams[p.school]}. Can we work toward more playing time${p.eligibility > 1 ? ", or look at next year's school options" : " before my final season ends"}?`
              : `Starting at ${teams[p.school]} is a chance to show what I can do. Can we invest in my game${p.eligibility === 1 ? " before my final college season ends" : ""}?`;
      g.requests.push(r);
      newRequests++;
      s.news.unshift(
        `${p.name} asks: “${requestText(r)}” Respond by the end of Week ${r.deadline} in Clients or Agency.`,
      );
    }
    const box = p.boxes.find((b) => b.week === s.week);
    const past = g.offers.filter((o) => o.player === p.id && o.year === s.year);
    const priorBest = Math.max(
      0,
      ...p.boxes.filter((b) => b.week < s.week).map((b) => b.points),
    );
    if (
      box &&
      (box.snaps ?? 0) > 0 &&
      s.week >= 2 &&
      s.week <= 10 &&
      box.points >= 18 &&
      (box.points >= priorBest || box.points >= 32) &&
      past.length < 2 &&
      s.week - (past.at(-1)?.week ?? -2) >= 4
    ) {
      g.offers.push({
        id: `${p.id}-spotlight-${s.year}-${s.week}`,
        player: p.id,
        year: s.year,
        week: s.week,
        deadline: s.week + 1,
        points: box.points,
        gross: Math.round(
          (16000 + box.points * 300) *
            (0.8 + schools[p.school]!.prestige / 200),
        ),
        status: "Open",
      });
      s.news.unshift(
        `${p.name}'s ${box.points.toFixed(1)}-point game attracted Saturday Spotlight. Choose a campaign in Deals by the end of Week ${s.week + 1}.`,
      );
    }
  }
  for (const p of g.seniors.filter((p) => p.year === s.year)) {
    if (s.week === 6 && p.watched)
      s.news.push(
        `${p.name}'s senior follow-up is available in Scouting. Learn their priority and build familiarity.`,
      );
    if (s.week >= 10 && p.committed === null) {
      p.committed = p.schools[Math.floor(roll(s.seed, p.id + "commit") * 3)]!;
      if (p.watched)
        s.news.push(
          `${p.name} commits to ${teams[p.committed]}. They join next year's college recruiting class.`,
        );
    }
  }
  updateAmbitions(s);
}

export function graduateSeniors(s: State) {
  for (const p of gameplay(s).seniors.filter((p) => p.year === s.year - 1)) {
    if (s.players.some((q) => q.id === p.id)) continue;
    const school = p.committed ?? p.schools[0]!;
    s.players.push({
      id: p.id,
      name: p.name,
      position: p.position,
      school,
      season: s.year,
      schoolYear: 1,
      eligibility: 4,
      careerPlan: "Return",
      transferredYear: 0,
      injury: null,
      ability: p.ability,
      ceiling: p.ceiling,
      recognition: 8,
      want: p.want,
      trust: 65,
      fatigue: 0,
      owner: null,
      promise: p.want,
      delivered: false,
      scouted: p.research > 0,
      scoutingLevel: p.research ? 1 : 0,
      fee: 15,
      testing: 0,
      interview: 0,
      boxes: [],
      status: "College",
      pick: null,
      proYears: 0,
      prep: null,
      approached: -1,
    });
    if (p.watched)
      s.news.push(
        `${p.name} arrives at ${teams[school]}. Familiarity adds ${p.research * 4 + 2} recruiting interest; representation is still open to rivals.`,
      );
  }
  // Carry a planned school ambition across the offseason while its client returns.
  for (const a of [...gameplay(s).ambitions].filter(
    (a) =>
      a.kind === "Stage" && a.completed === undefined && a.year === s.year - 1,
  )) {
    const p = s.players.find(
      (p) =>
        p.id === a.player &&
        p.owner === "you" &&
        p.status === "College" &&
        p.season === s.year,
    );
    if (p)
      gameplay(s).ambitions.push({
        ...a,
        id: `${p.id}-goal-${s.year}`,
        year: s.year,
      });
  }
  initializeGameplay(s);
}
