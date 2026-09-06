/**
 * Brief B §3 — unknown enum values, on a CLEAN state.
 *
 * t3b ran these after a NaN had already poisoned recruiting.points, so the cost
 * column there is not trustworthy. This re-runs each on its own fresh fixture.
 * Command path only; nothing is written into `state`.
 */
import { readFileSync } from "node:fs";
import { advanceWeek } from "../../../packages/simulation/dist/index.js";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));
const seed = process.argv[2] ?? "qa-c3-market-1";
const base = load(seed, "s1-w1");
const me = "program-1";
const rec = (s) => s.recruiting[me];
const total = Object.keys(base.prospects).length;
console.log(`seed=${seed} program=${me} week=${base.week} points=${rec(base).points} discovered=${rec(base).discoveredProspectIds.length} board=${total}`);

const run = (label, commands) => {
  const r = advanceWeek(base, commands);
  const rej = r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me);
  const disc = r.events.find((e) => e.type === "PROSPECTS_DISCOVERED" && e.programId === me);
  console.log(`\n--- ${label}`);
  console.log(`   rejected: ${rej.length ? rej.map((e) => `${e.command.type}: ${e.reason}`).join(" | ") : "NONE"}`);
  console.log(`   points ${rec(base).points} -> ${rec(r.state).points}`);
  console.log(`   discovered ${rec(base).discoveredProspectIds.length} -> ${rec(r.state).discoveredProspectIds.length} of ${total}`);
  if (disc) console.log(`   PROSPECTS_DISCOVERED: ${disc.prospectIds.length} ids, pointsSpent=${disc.pointsSpent}, searchType=${disc.searchType}`);
  return r.state;
};

for (const searchType of ["LOCAL_CAMP", "REGIONAL_SWEEP", "NATIONAL_SHOWCASE", "OUIJA_BOARD", "", null, undefined, 7]) {
  run(`SEARCH_PROSPECTS searchType=${JSON.stringify(searchType)}`, [{ type: "SEARCH_PROSPECTS", programId: me, searchType }]);
}

// Unknown evaluation, on a prospect this program has offered.
{
  const target = rec(base).discoveredProspectIds.find((id) => base.prospects[id]?.status === "AVAILABLE");
  const armed = advanceWeek(base, [{ type: "OFFER_PROSPECT", programId: me, prospectId: target, extend: true }]).state;
  const before = armed.recruiting[me].points;
  for (const evaluation of ["BASIC", "TELEPATHY", "", null, 3]) {
    const r = advanceWeek(armed, [{ type: "EVALUATE_PROSPECT", programId: me, prospectId: target, evaluation }]);
    const rej = r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me);
    const scouting = r.state.recruiting[me].scoutingByProspect[target];
    console.log(`\n--- EVALUATE_PROSPECT evaluation=${JSON.stringify(evaluation)}`);
    console.log(`   rejected: ${rej.length ? rej.map((e) => e.reason).join(" | ") : "NONE"}`);
    console.log(`   points ${before} -> ${r.state.recruiting[me].points}`);
    console.log(`   evaluations stored: ${JSON.stringify(scouting?.evaluations)}`);
  }
}

// String-typed numerics.
{
  const target = rec(base).discoveredProspectIds.find((id) => base.prospects[id]?.status === "AVAILABLE");
  const armed = advanceWeek(base, [
    { type: "OFFER_PROSPECT", programId: me, prospectId: target, extend: true },
    { type: "EVALUATE_PROSPECT", programId: me, prospectId: target, evaluation: "BASIC" }
  ]).state;
  for (const points of ["5", "abc", true, [], {}]) {
    const r = advanceWeek(armed, [{ type: "INVEST_RECRUITING_POINTS", programId: me, prospectId: target, points }]);
    const rej = r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me);
    const p = r.state.recruiting[me];
    console.log(`\n--- INVEST_RECRUITING_POINTS points=${JSON.stringify(points)} (${typeof points})`);
    console.log(`   rejected: ${rej.length ? rej.map((e) => e.reason).join(" | ") : "NONE"}`);
    console.log(`   points=${p.points} finite=${Number.isFinite(p.points)} pursuit=${p.scoutingByProspect[target]?.pursuitPoints}`);
  }
  for (const weeklyAmount of ["5000", "abc", null, true]) {
    const r = advanceWeek(armed, [{ type: "SET_NIL_OFFER", programId: me, prospectId: target, weeklyAmount }]);
    const rej = r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me);
    const stored = r.state.nil?.[me]?.offersByProspect?.[target];
    console.log(`\n--- SET_NIL_OFFER weeklyAmount=${JSON.stringify(weeklyAmount)} (${typeof weeklyAmount})`);
    console.log(`   rejected: ${rej.length ? rej.map((e) => e.reason).join(" | ") : "NONE"}`);
    console.log(`   stored=${stored} finite=${Number.isFinite(stored)}`);
  }
}
