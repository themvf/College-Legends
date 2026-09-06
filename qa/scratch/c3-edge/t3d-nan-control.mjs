/**
 * Brief B §3 — isolate the cause of the winner change under a NaN bid.
 *
 * t3c2 showed that a NaN NIL offer from a non-contending program changed which
 * OTHER program won a contested recruit (28 -> 14). Two hypotheses:
 *   H1  the NaN score corrupts the market's ranking
 *   H2  any accepted command shifts an RNG draw and the winner moves anyway
 * The distinguishing control is an accepted, *small, valid* NIL offer.
 * Command path only; nothing written into `state`.
 */
import { readFileSync } from "node:fs";
import { advanceWeek } from "../../../packages/simulation/dist/index.js";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));

for (const seed of process.argv.slice(2).length ? process.argv.slice(2) : ["qa-c3-market-1"]) {
  const base = load(seed, "s1-w11");
  const suitors = new Map();
  for (const [programId, r] of Object.entries(base.recruiting)) {
    for (const id of r.offeredProspectIds) {
      if (!suitors.has(id)) suitors.set(id, []);
      suitors.get(id).push(programId);
    }
  }
  const ranked = [...suitors.entries()]
    .filter(([id]) => base.prospects[id]?.status === "AVAILABLE")
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  let pick = null;
  for (const [prospectId, existing] of ranked) {
    const intruder = Object.keys(base.recruiting).sort().find((programId) =>
      !existing.includes(programId) && base.recruiting[programId].discoveredProspectIds.includes(prospectId));
    if (intruder) { pick = { prospectId, existing, intruder }; break; }
  }
  if (!pick) { console.log(`${seed}: no usable prospect`); continue; }
  const { prospectId, existing, intruder } = pick;
  const armed = advanceWeek(base, [
    { type: "EVALUATE_PROSPECT", programId: intruder, prospectId, evaluation: "BASIC" },
    { type: "OFFER_PROSPECT", programId: intruder, prospectId, extend: true }
  ]).state;

  console.log(`\n=== ${seed} prospect=${prospectId} suitors=${existing.length} intruder=${intruder} ===`);
  const run = (label, commands) => {
    const r = advanceWeek(armed, commands);
    const rej = r.events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === intruder);
    const accepted = r.events.filter((e) => e.type === "NIL_OFFER_SET" && e.programId === intruder && e.prospectId === prospectId);
    const contest = r.events.find((e) => e.type === "RECRUITING_CONTEST_RESOLVED" && e.prospectId === prospectId);
    const scores = Object.entries(contest?.scores ?? {}).sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1));
    console.log(`  ${label.padEnd(34)} rej=${rej.length} accepted=${accepted.length} winner=${contest?.winnerProgramId} ` +
      `intruderScore=${contest?.scores?.[intruder]} anyNaN=${Object.values(contest?.scores ?? {}).some((v) => Number.isNaN(v))}`);
    console.log(`  ${" ".repeat(34)} top3=${JSON.stringify(scores.slice(0, 3))}`);
  };
  run("control: no extra command", []);
  run("valid small NIL offer 5000", [{ type: "SET_NIL_OFFER", programId: intruder, prospectId, weeklyAmount: 5_000 }]);
  run("valid NIL offer 1", [{ type: "SET_NIL_OFFER", programId: intruder, prospectId, weeklyAmount: 1 }]);
  run("NIL offer = NaN", [{ type: "SET_NIL_OFFER", programId: intruder, prospectId, weeklyAmount: NaN }]);
  run("NIL offer = undefined", [{ type: "SET_NIL_OFFER", programId: intruder, prospectId, weeklyAmount: undefined }]);
  run("points = NaN", [{ type: "INVEST_RECRUITING_POINTS", programId: intruder, prospectId, points: NaN }]);
  run("points = 5 (control)", [{ type: "INVEST_RECRUITING_POINTS", programId: intruder, prospectId, points: 5 }]);
}
