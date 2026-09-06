/**
 * Brief B §3, follow-up — the three NaN paths found by t3-invalid, chased to
 * find out (a) whether the poison persists, (b) whether the state is leavable,
 * (c) whether anything the engine itself produces can reach them.
 *
 * All of it goes through the public command API. Nothing is written into
 * `state` directly.
 */
import { readFileSync } from "node:fs";
import { advanceWeek } from "../../../packages/simulation/dist/index.js";
import { planWeek } from "./lib.mjs";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));
const seed = process.argv[2] ?? "qa-c3-market-1";

const base = load(seed, "s1-w1");
const me = Object.keys(base.programs).sort()[0];
const target = base.recruiting[me].discoveredProspectIds.find((id) => base.prospects[id]?.status === "AVAILABLE");
const rec = (s) => s.recruiting[me];

console.log(`program=${me} week=${base.week} points=${rec(base).points} target=${target}`);

// --- 1. INVEST_RECRUITING_POINTS with NaN --------------------------------
{
  let s = advanceWeek(base, [{ type: "OFFER_PROSPECT", programId: me, prospectId: target, extend: true }]).state;
  console.log(`\n--- 1. INVEST_RECRUITING_POINTS points=NaN`);
  console.log(`   before: points=${rec(s).points}`);
  const r = advanceWeek(s, [{ type: "INVEST_RECRUITING_POINTS", programId: me, prospectId: target, points: NaN }]);
  s = r.state;
  console.log(`   rejected=${r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me).length}  accepted RECRUITING_INVESTMENT=${r.events.filter((e) => e.type === "RECRUITING_INVESTMENT" && e.programId === me).length}`);
  console.log(`   after:  points=${rec(s).points} pursuit=${rec(s).scoutingByProspect[target].pursuitPoints}`);
  // Can the program get out of it? Advance five clean weeks with the planner.
  for (let i = 0; i < 5 && s.phase === "REGULAR_SEASON" && s.week < 12; i += 1) {
    s = advanceWeek(s, planWeek(s)).state;
    console.log(`   week ${s.week}: points=${rec(s).points} pursuit=${rec(s).scoutingByProspect[target]?.pursuitPoints}`);
  }
  // Are costed actions now free?
  const probe = advanceWeek(s, [
    { type: "EVALUATE_PROSPECT", programId: me, prospectId: target, evaluation: "PROJECTION" },
    { type: "SEARCH_PROSPECTS", programId: me, searchType: "NATIONAL_SHOWCASE" },
    { type: "SCHEDULE_VISIT", programId: me, prospectId: target }
  ]);
  const rejected = probe.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me);
  console.log(`   with points=NaN, costed actions: rejected=${rejected.length} (${rejected.map((e) => e.command.type).join(",")}) accepted=${probe.events.filter((e) => ["PROSPECT_EVALUATED", "PROSPECTS_DISCOVERED", "RECRUITING_VISIT_SCHEDULED"].includes(e.type) && e.programId === me).map((e) => e.type).join(",")}`);
  console.log(`   points after those: ${rec(probe.state).points}`);
  // What a save would do to it.
  const roundTripped = JSON.parse(JSON.stringify(rec(s).points));
  console.log(`   JSON round-trip of points=NaN -> ${roundTripped} (${typeof roundTripped})`);
}

// --- 2. SET_NIL_OFFER with NaN -------------------------------------------
{
  console.log(`\n--- 2. SET_NIL_OFFER weeklyAmount=NaN`);
  let s = advanceWeek(base, [
    { type: "EVALUATE_PROSPECT", programId: me, prospectId: target, evaluation: "BASIC" },
    { type: "OFFER_PROSPECT", programId: me, prospectId: target, extend: true }
  ]).state;
  const r = advanceWeek(s, [{ type: "SET_NIL_OFFER", programId: me, prospectId: target, weeklyAmount: NaN }]);
  s = r.state;
  const offers = s.nil?.[me]?.offersByProspect ?? {};
  const nanOffers = Object.entries(offers).filter(([, v]) => Number.isNaN(v));
  console.log(`   NIL_OFFER_SET emitted=${r.events.some((e) => e.type === "NIL_OFFER_SET" && e.programId === me)} rejected=${r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me).length}`);
  console.log(`   stored offers for ${target}: ${offers[target]} (NaN=${Number.isNaN(offers[target])})  total NaN offers on the book: ${nanOffers.length}`);
  console.log(`   emitted weeklyAmount: ${r.events.filter((e) => e.type === "NIL_OFFER_SET" && e.programId === me).map((e) => `${e.weeklyAmount} (NaN=${Number.isNaN(e.weeklyAmount)})`).join(",")}`);
  // Does it survive a week, and does it poison capacity?
  for (let i = 0; i < 2 && s.phase === "REGULAR_SEASON" && s.week < 12; i += 1) {
    s = advanceWeek(s, planWeek(s)).state;
    const o = s.nil?.[me]?.offersByProspect ?? {};
    const c = s.nil?.[me]?.commitmentsByPlayer ?? {};
    console.log(`   week ${s.week}: offer=${o[target]} commitment=${c[target]} budget=${s.programs[me].budget} budgetNaN=${Number.isNaN(s.programs[me].budget)}`);
  }
}

// --- 3. unknown evaluation type and unknown search type -------------------
{
  console.log(`\n--- 3. unknown enum values`);
  let s = advanceWeek(base, [{ type: "OFFER_PROSPECT", programId: me, prospectId: target, extend: true }]).state;
  const before = rec(s).points;
  const discoveredBefore = rec(s).discoveredProspectIds.length;
  const r = advanceWeek(s, [
    { type: "EVALUATE_PROSPECT", programId: me, prospectId: target, evaluation: "TELEPATHY" },
    { type: "SEARCH_PROSPECTS", programId: me, searchType: "OUIJA_BOARD" }
  ]);
  const rejected = r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me);
  console.log(`   points ${before} -> ${rec(r.state).points}`);
  console.log(`   discovered ${discoveredBefore} -> ${rec(r.state).discoveredProspectIds.length}`);
  console.log(`   evaluations stored: ${JSON.stringify(rec(r.state).scoutingByProspect[target].evaluations)}`);
  console.log(`   rejected: ${rejected.length ? rejected.map((e) => `${e.command.type}: ${e.reason}`).join(" | ") : "NONE"}`);
  const discovery = r.events.find((e) => e.type === "PROSPECTS_DISCOVERED" && e.programId === me);
  if (discovery) console.log(`   PROSPECTS_DISCOVERED: ${discovery.prospectIds.length} ids, pointsSpent=${discovery.pointsSpent}`);
}

// --- 4. can the engine itself produce a non-finite command argument? -------
{
  console.log(`\n--- 4. planner sweep: non-finite numeric fields in AI-planned commands`);
  let s = load(seed, "s1-w1");
  let bad = 0;
  let total = 0;
  for (let i = 0; i < 12 && s.phase === "REGULAR_SEASON" && s.week < 14; i += 1) {
    const cmds = planWeek(s);
    for (const c of cmds) {
      total += 1;
      for (const [k, v] of Object.entries(c)) {
        if (typeof v === "number" && !Number.isFinite(v)) { bad += 1; console.log(`   !! ${c.type}.${k} = ${v} ${JSON.stringify(c)}`); }
      }
    }
    s = advanceWeek(s, cmds).state;
  }
  console.log(`   ${total} planned commands over 12 weeks at 72 programs: ${bad} with a non-finite numeric field`);
}
