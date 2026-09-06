/**
 * Brief B §4 — prospectOdds at its boundaries.
 *
 * One assertion only, at every degenerate input: the percentage is a finite
 * number inside 0–100 and is never NaN. Calibration is Brief D's.
 *
 * Fixtures are real 72-program states (build-states.mjs). The only constructed
 * inputs are the `options.nilOffer` values, which are function arguments rather
 * than writes into `state` — flagged as such in the report.
 */
import { readFileSync } from "node:fs";
import { prospectOdds, recruitingOddsIndex, projectedRecruitingOpenings } from "../../../packages/simulation/dist/index.js";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));

const bad = [];

function probe(label, state, seed, programId, prospectId, options) {
  let odds;
  try {
    odds = prospectOdds(state, programId, prospectId, undefined, options);
  } catch (error) {
    bad.push({ kind: "THREW", label, seed, week: state.week, programId, prospectId, options, message: error.message });
    return `THREW ${error.message}`;
  }
  if (odds === null) return "null";
  const p = odds.percent;
  const ok = typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 100;
  const noteOk = typeof odds.note === "string" && !odds.note.includes("NaN") && !odds.note.includes("undefined") && !odds.note.includes("Infinity");
  const leadOk = Number.isFinite(odds.lead);
  if (!ok || !noteOk || !leadOk) {
    bad.push({ kind: !ok ? "PERCENT" : !leadOk ? "LEAD" : "NOTE", label, seed, week: state.week, programId, prospectId, options, odds });
  }
  return `${odds.outcome} percent=${p} contenders=${odds.contenders} lead=${odds.lead} contested=${odds.contested}${ok && noteOk && leadOk ? "" : "  <<<< BAD"}`;
}

const seeds = ["qa-c3-market-1", "qa-c3-market-2", "qa-c3-market-3"];
const weeks = ["s1-w1", "s1-w11", "s1-w12", "s1-w13", "s1-w14"];

for (const seed of seeds) {
  for (const weekName of weeks) {
    const state = load(seed, weekName);
    const programIds = Object.keys(state.programs).sort();
    const me = programIds[0];
    const rival = programIds[1];
    const prospectIds = Object.keys(state.prospects).sort();

    const byStatus = {};
    for (const id of prospectIds) (byStatus[state.prospects[id].status] ??= []).push(id);

    // Zero contenders: nobody has offered, nobody has points down, no NIL.
    const noContenders = prospectIds.find((id) => Object.values(state.recruiting).every((r) =>
      !r.offeredProspectIds.includes(id) && !((r.scoutingByProspect[id]?.pursuitPoints ?? 0) > 0))
      && Object.values(state.nil ?? {}).every((n) => n.offersByProspect[id] === undefined && n.commitmentsByPlayer[id] === undefined));
    const committedHere = prospectIds.find((id) => state.prospects[id].status === "COMMITTED" && state.prospects[id].signedProgramId === me);
    const committedElsewhere = prospectIds.find((id) => state.prospects[id].status === "COMMITTED" && state.prospects[id].signedProgramId !== me);
    const signed = (byStatus.SIGNED ?? [])[0];
    const withdrawn = (byStatus.WITHDRAWN ?? [])[0];
    const contested = prospectIds.find((id) => Object.values(state.recruiting).filter((r) => r.offeredProspectIds.includes(id)).length >= 3);
    const mineOffered = state.recruiting[me].offeredProspectIds[0];

    // A program at zero projected openings — it cannot be a contender at all.
    const fullProgram = programIds.find((id) => projectedRecruitingOpenings(state, id) <= 0) ?? null;

    console.log(`\n=== ${seed} ${weekName} (week ${state.week}) ===`);
    const cases = [
      ["zero contenders, not pursuing", me, noContenders, undefined],
      ["contested (3+ suitors), not pursuing", me, contested, undefined],
      ["committed to me", me, committedHere, undefined],
      ["committed elsewhere", me, committedElsewhere, undefined],
      ["already SIGNED", me, signed, undefined],
      ["WITHDRAWN", me, withdrawn, undefined],
      ["a prospect I have offered", me, mineOffered, undefined],
      ["nilOffer 0", me, contested ?? mineOffered, { nilOffer: 0 }],
      ["nilOffer -1", me, contested ?? mineOffered, { nilOffer: -1 }],
      ["nilOffer -1e12", me, contested ?? mineOffered, { nilOffer: -1e12 }],
      ["nilOffer = whole budget", me, contested ?? mineOffered, { nilOffer: Math.round(state.programs[me].budget) }],
      ["nilOffer = 1e15", me, contested ?? mineOffered, { nilOffer: 1e15 }],
      ["nilOffer = MAX_SAFE_INTEGER", me, contested ?? mineOffered, { nilOffer: Number.MAX_SAFE_INTEGER }],
      ["nilOffer = Infinity", me, contested ?? mineOffered, { nilOffer: Infinity }],
      ["nilOffer = -Infinity", me, contested ?? mineOffered, { nilOffer: -Infinity }],
      ["nilOffer = NaN", me, contested ?? mineOffered, { nilOffer: NaN }],
      ["nilOffer = 0.5 (fractional)", me, contested ?? mineOffered, { nilOffer: 0.5 }],
      ["unknown prospect id", me, "prospect:no-such-thing", undefined],
      ["unknown program id", "program:no-such-thing", contested ?? mineOffered, undefined],
      ["empty program id", "", contested ?? mineOffered, undefined],
      ["program with zero openings", fullProgram, contested ?? mineOffered, undefined],
      ["program with zero openings + big nil", fullProgram, contested ?? mineOffered, { nilOffer: 500_000 }],
      ["rival's view of my commitment", rival, committedHere, undefined]
    ];
    for (const [label, programId, prospectId, options] of cases) {
      if (!prospectId || programId === null) { console.log(`  ${label.padEnd(38)} (no fixture)`); continue; }
      console.log(`  ${label.padEnd(38)} ${probe(label, state, seed, programId, prospectId, options)}`);
    }

    // Volume: every discovered prospect for every program, plain and with a
    // money slider at both ends. This is the sample that would catch a >100.
    const index = recruitingOddsIndex(state);
    let n = 0;
    let worst = { percent: -1 };
    for (const programId of programIds) {
      for (const prospectId of state.recruiting[programId].discoveredProspectIds) {
        for (const options of [undefined, { nilOffer: 0 }, { nilOffer: 1 }, { nilOffer: 10_000_000 }]) {
          let odds;
          try { odds = prospectOdds(state, programId, prospectId, index, options); }
          catch (error) { bad.push({ kind: "THREW-BULK", seed, week: state.week, programId, prospectId, options, message: error.message }); continue; }
          if (!odds) continue;
          n += 1;
          const p = odds.percent;
          if (!(Number.isFinite(p) && p >= 0 && p <= 100) || !Number.isFinite(odds.lead) || String(odds.note).match(/NaN|undefined|Infinity/)) {
            bad.push({ kind: "BULK", seed, week: state.week, programId, prospectId, options, odds });
          }
          if (p > worst.percent) worst = odds;
        }
      }
    }
    console.log(`  bulk: ${n} odds computed, max percent=${worst.percent}`);
  }
}

console.log(`\n==================== ${bad.length} BAD RESULTS ====================`);
for (const row of bad.slice(0, 40)) console.log(JSON.stringify(row));
