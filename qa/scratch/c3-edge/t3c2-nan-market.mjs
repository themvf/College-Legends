/**
 * Brief B §3 — does a NaN NIL offer, or NaN recruiting points, win a contested
 * recruit? Command path only; nothing is written into `state`.
 *
 * Fixed from t3c-nan-market.mjs, which relied on a SEARCH_PROSPECTS yield to
 * turn the contested prospect up and it never did. This one picks a prospect
 * who is contested AND is already on some non-suitor's discovered list.
 */
import { readFileSync } from "node:fs";
import { advanceWeek, prospectOdds } from "../../../packages/simulation/dist/index.js";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));
const seed = process.argv[2] ?? "qa-c3-market-1";
const base = load(seed, "s1-w11");

const suitors = new Map();
for (const [programId, r] of Object.entries(base.recruiting)) {
  for (const id of r.offeredProspectIds) {
    if (!suitors.has(id)) suitors.set(id, []);
    suitors.get(id).push(programId);
  }
}

// Contested + AVAILABLE + already discovered by a program that is not a suitor.
let pick = null;
const ranked = [...suitors.entries()]
  .filter(([id]) => base.prospects[id]?.status === "AVAILABLE")
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
for (const [prospectId, existing] of ranked) {
  const intruder = Object.keys(base.recruiting).sort().find((programId) =>
    !existing.includes(programId) && base.recruiting[programId].discoveredProspectIds.includes(prospectId));
  if (intruder) { pick = { prospectId, existing, intruder }; break; }
}
if (!pick) { console.log("no usable contested prospect"); process.exit(0); }
const { prospectId, existing, intruder } = pick;
console.log(`seed=${seed} prospect=${prospectId} suitors=${existing.length} intruder=${intruder}`);
console.log(`odds before: ${JSON.stringify(prospectOdds(base, intruder, prospectId))}`);

const armed = advanceWeek(base, [
  { type: "EVALUATE_PROSPECT", programId: intruder, prospectId, evaluation: "BASIC" },
  { type: "OFFER_PROSPECT", programId: intruder, prospectId, extend: true }
]).state;
console.log(`armed: offered=${armed.recruiting[intruder].offeredProspectIds.includes(prospectId)}`);

const run = (label, commands) => {
  const r = advanceWeek(armed, commands);
  const contest = r.events.find((e) => e.type === "RECRUITING_CONTEST_RESOLVED" && e.prospectId === prospectId);
  const committed = r.events.find((e) => (e.type === "PROSPECT_COMMITTED" || e.type === "PROSPECT_FLIPPED") && e.prospectId === prospectId);
  const after = r.state.prospects[prospectId];
  const rej = r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === intruder);
  console.log(`\n--- ${label}`);
  console.log(`   rejected=${rej.length} ${rej.map((e) => e.reason).join(" | ")}`);
  if (contest) {
    const scores = Object.entries(contest.scores ?? {});
    console.log(`   contest winner=${contest.winnerProgramId} intruderWon=${contest.winnerProgramId === intruder}`);
    console.log(`   intruder score=${contest.scores?.[intruder]} anyNaN=${scores.some(([, v]) => Number.isNaN(v))}`);
  } else {
    console.log(`   no contest event this week`);
  }
  console.log(`   committed=${committed?.type ?? "-"} -> ${committed?.programId ?? committed?.toProgramId ?? "-"}`);
  console.log(`   prospect after: status=${after.status} signedTo=${after.signedProgramId ?? "-"}`);
  console.log(`   intruder recruiting.points=${r.state.recruiting[intruder].points} NaN=${Number.isNaN(r.state.recruiting[intruder].points)}`);
  console.log(`   intruder budget=${r.state.programs[intruder].budget} NaN=${Number.isNaN(r.state.programs[intruder].budget)}`);
  const odds = prospectOdds(r.state, intruder, prospectId);
  console.log(`   odds after: outcome=${odds?.outcome} percent=${odds?.percent} finite=${Number.isFinite(odds?.percent)}`);
};

run("control: nothing further", []);
run("NIL offer = NaN", [{ type: "SET_NIL_OFFER", programId: intruder, prospectId, weeklyAmount: NaN }]);
run("points = NaN", [{ type: "INVEST_RECRUITING_POINTS", programId: intruder, prospectId, points: NaN }]);
run("NIL offer = 250000 (control, real money)", [{ type: "SET_NIL_OFFER", programId: intruder, prospectId, weeklyAmount: 250_000 }]);
