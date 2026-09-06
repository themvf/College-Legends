/**
 * Brief C item 3 — how much money actually leaves through recruiting.
 *
 * NIL is the only recruiting line that costs dollars (searches and evaluations
 * are charged in recruiting *points*), so this measures the NIL faucet against
 * its own ceiling: `weeklyDonorCapacity` is what a program *may* commit, and
 * `committedNilTotal` is what it actually pays every week. A sink nobody uses
 * is not a sink.
 */
import * as sim from "../../../packages/simulation/dist/index.js";
import * as ai from "../../../packages/ai/dist/index.js";

const { createFictionalLeague, beginSeason, advanceWeek, advanceOffseasonStep,
  weeklyDonorCapacity, committedNilTotal, reservedNilTotal, mediaRights } = sim;

const SEED = process.argv[2] ?? "qa-c3-econ-a";
const SEASONS = Number(process.argv[3] ?? 6);
const PROGRAMS = Number(process.argv[4] ?? 24);

let state = createFictionalLeague(SEED, PROGRAMS);
let done = 0;
const samples = [];
let offersIssued = 0, offersRejected = 0, commitments = 0, withdrawals = 0;

function sample(label) {
  for (const program of Object.values(state.programs)) {
    samples.push({
      label, season: state.season, tier: program.tier, id: program.id,
      capacity: weeklyDonorCapacity(program),
      committed: committedNilTotal(state, program.id),
      reserved: reservedNilTotal(state, program.id),
      fanBase: program.fanBase, budget: program.budget
    });
  }
}

while (done < SEASONS) {
  const season = state.season;
  let events = [];
  if (state.phase === "ROSTER_REVIEW") {
    state = beginSeason(state);
  } else {
    const commands = state.phase === "OFFSEASON" ? ai.planOffseasonCommands(state) : ai.planWeeklyCommands(state);
    for (const c of commands) if (c.type === "OFFER_NIL" || c.type === "SET_NIL_OFFER") offersIssued += 1;
    const result = state.phase === "OFFSEASON" ? advanceOffseasonStep(state, commands) : advanceWeek(state, commands);
    events = result.events ?? [];
    state = result.state ?? result;
  }
  for (const e of events) {
    if (e.type === "COMMAND_REJECTED" && /NIL/.test(e.command?.type ?? "")) offersRejected += 1;
    if (e.type === "PROSPECT_COMMITTED" || e.type === "RECRUIT_SIGNED") commitments += 1;
    if (e.type === "NIL_OFFER_WITHDRAWN") withdrawals += 1;
  }
  if (state.season !== season) { sample(`end-${season}`); done += 1; console.error(`season ${season} sampled`); }
}

const tiers = ["LOW", "MID", "POWER"];
const money = (n) => Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`;
const labels = [...new Set(samples.map((s) => s.label))];
console.log("NIL committed against donor capacity, medians per program");
console.log("label      | tier  |  n | donor capacity/wk | committed/wk | used | reserved/wk | fanBase");
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[(s.length >> 1) - 1] + s[s.length >> 1]) / 2; };
for (const label of labels) {
  for (const tier of tiers) {
    const rows = samples.filter((s) => s.label === label && s.tier === tier);
    if (!rows.length) continue;
    const cap = med(rows.map((r) => r.capacity));
    const com = med(rows.map((r) => r.committed));
    console.log(`${label.padEnd(10)} | ${tier.padEnd(5)} | ${String(rows.length).padStart(2)} | `
      + `${money(cap).padStart(9)} | ${money(com).padStart(9)} | ${(100 * com / (cap || 1)).toFixed(1).padStart(5)}% | `
      + `${money(med(rows.map((r) => r.reserved))).padStart(9)} | ${Math.round(med(rows.map((r) => r.fanBase)))}`);
  }
}
console.log(`\nNIL commands issued by the rival planner over the run: ${offersIssued}`);
console.log(`NIL commands rejected: ${offersRejected}`);
