/**
 * Does a NaN NIL offer win a contested recruit?
 *
 * `recruitingBaseScore` folds the NIL money term into the score. A NaN offer
 * makes the score NaN, and every gate in resolveRecruitingMarket is a
 * comparison — `score < threshold`, `score - runnerUp < lead` — all of which
 * are false against NaN. Command path only; nothing written into `state`.
 */
import { readFileSync } from "node:fs";
import { advanceWeek, prospectOdds } from "../../../packages/simulation/dist/index.js";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));
const seed = process.argv[2] ?? "qa-c3-market-1";

const base = load(seed, "s1-w11");

// The most contested AVAILABLE prospect on the board, and a program that is
// not currently chasing him and has openings.
const suitors = new Map();
for (const [programId, r] of Object.entries(base.recruiting)) {
  for (const id of r.offeredProspectIds) {
    if (!suitors.has(id)) suitors.set(id, []);
    suitors.get(id).push(programId);
  }
}
const contested = [...suitors.entries()]
  .filter(([id]) => base.prospects[id]?.status === "AVAILABLE")
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];

if (!contested) { console.log("no contested available prospect in this fixture"); process.exit(0); }
const [prospectId, existing] = contested;
const intruder = Object.keys(base.programs).sort().find((id) => !existing.includes(id));
console.log(`prospect=${prospectId} existing suitors=${existing.length} intruder=${intruder}`);
console.log(`intruder odds before: ${JSON.stringify(prospectOdds(base, intruder, prospectId))}`);

const arm = (amount, label) => {
  // The intruder discovers, evaluates, offers, and bids `amount`.
  let s = base;
  s = advanceWeek(s, [
    { type: "SEARCH_PROSPECTS", programId: intruder, searchType: "NATIONAL_SHOWCASE" }
  ]).state;
  const discovered = s.recruiting[intruder].discoveredProspectIds.includes(prospectId);
  // If the search did not turn him up, use the intruder's own top target instead.
  const id = discovered ? prospectId : null;
  if (!id) { console.log(`  ${label}: intruder never discovered him (search yield); skipping`); return; }
  const armed = advanceWeek(s, [
    { type: "EVALUATE_PROSPECT", programId: intruder, prospectId: id, evaluation: "BASIC" },
    { type: "OFFER_PROSPECT", programId: intruder, prospectId: id, extend: true }
  ]).state;
  const r = advanceWeek(armed, [{ type: "SET_NIL_OFFER", programId: intruder, prospectId: id, weeklyAmount: amount }]);
  const contest = r.events.find((e) => e.type === "RECRUITING_CONTEST_RESOLVED" && e.prospectId === id);
  const committed = r.events.find((e) => (e.type === "PROSPECT_COMMITTED" || e.type === "PROSPECT_FLIPPED") && e.prospectId === id);
  const after = r.state.prospects[id];
  const nil = r.state.nil?.[intruder];
  console.log(`\n  --- ${label}`);
  console.log(`     rejected=${r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === intruder).length}`);
  console.log(`     contest resolved=${Boolean(contest)} winner=${contest?.winnerProgramId} intruderWon=${contest?.winnerProgramId === intruder}`);
  if (contest) {
    const scores = Object.entries(contest.scores).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    console.log(`     scores (top 5): ${JSON.stringify(scores.slice(0, 5))}`);
    console.log(`     intruder score=${contest.scores[intruder]} isNaN=${Number.isNaN(contest.scores[intruder])}`);
    console.log(`     any NaN score: ${Object.values(contest.scores).some((v) => Number.isNaN(v))}`);
  }
  console.log(`     committed event=${committed?.type} to ${committed?.programId ?? committed?.toProgramId} score=${committed?.score}`);
  console.log(`     prospect after: status=${after.status} signedTo=${after.signedProgramId}`);
  console.log(`     intruder NIL commitment for him: ${nil?.commitmentsByPlayer?.[id]}  (paid nothing if undefined)`);
  console.log(`     intruder budget=${r.state.programs[intruder].budget} NaN=${Number.isNaN(r.state.programs[intruder].budget)}`);
};

arm(NaN, "NIL offer = NaN");
arm(0, "NIL offer = 0 (control)");
