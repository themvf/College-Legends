/**
 * Brief B §1 — order independence of the recruiting market at 72 programs.
 *
 * Three orderings of the identical command set:
 *   A  forward (as planned)
 *   B  program blocks reversed, each program's own sequence intact
 *   C  program blocks shuffled by a fixed permutation, sequences intact
 *   D  every command reversed (breaks prerequisite chains — reported separately)
 *   E  every command shuffled by a fixed permutation
 */
import { advanceWeek } from "../../../packages/simulation/dist/index.js";
import {
  beginSeason
} from "../../../packages/simulation/dist/index.js";
import {
  byProgramBlocks, fixedShuffle, league, nilFingerprint, planWeek,
  prospectFingerprint, recruitingFingerprint, hash, step, stateFingerprint
} from "./lib.mjs";

const seeds = process.argv[2] ? [process.argv[2]] : ["qa-c3-market-1", "qa-c3-market-2", "qa-c3-market-3"];
const upToWeek = Number(process.argv[3] ?? 6);

for (const seed of seeds) {
  let state = beginSeason(league(seed, 72));
  for (let week = 1; week < upToWeek; week += 1) state = step(state).state;

  const commands = planWeek(state);
  const recruitCommands = commands.filter((c) =>
    ["OFFER_PROSPECT", "SET_NIL_OFFER", "INVEST_RECRUITING_POINTS", "SCHEDULE_VISIT", "EVALUATE_PROSPECT", "SEARCH_PROSPECTS"].includes(c.type));

  const blocks = byProgramBlocks(commands);
  const orders = {
    A_forward: commands,
    B_blocksReversed: [...blocks].reverse().flatMap(([, list]) => list),
    C_blocksShuffled: fixedShuffle(blocks, 7).flatMap(([, list]) => list),
    D_allReversed: [...commands].reverse(),
    E_allShuffled: fixedShuffle(commands, 13)
  };

  const results = {};
  for (const [name, list] of Object.entries(orders)) {
    const { state: next, events } = advanceWeek(state, list);
    results[name] = {
      prospects: hash(prospectFingerprint(next)),
      nil: hash(nilFingerprint(next)),
      recruiting: hash(recruitingFingerprint(next)),
      full: stateFingerprint(next),
      committed: Object.values(next.prospects).filter((p) => p.status === "COMMITTED").length,
      rejected: events.filter((e) => e.type === "COMMAND_REJECTED").length,
      raw: prospectFingerprint(next)
    };
  }

  console.log(`\n=== seed ${seed} · week ${state.week} · 72 programs ===`);
  console.log(`commands=${commands.length} recruiting=${recruitCommands.length} programs=${blocks.length}`);
  for (const [name, r] of Object.entries(results)) {
    console.log(`${name.padEnd(18)} prospects=${r.prospects} nil=${r.nil} recruiting=${r.recruiting} full=${r.full} committed=${r.committed} rejected=${r.rejected}`);
  }

  // Isolate any prospect whose outcome changed between orderings.
  const base = results.A_forward.raw.split("\n");
  for (const [name, r] of Object.entries(results)) {
    if (name === "A_forward") continue;
    const other = r.raw.split("\n");
    const diffs = [];
    for (let i = 0; i < base.length; i += 1) if (base[i] !== other[i]) diffs.push({ forward: base[i], [name]: other[i] });
    if (diffs.length) {
      console.log(`  ${name}: ${diffs.length} prospect rows differ from forward. First 5:`);
      for (const d of diffs.slice(0, 5)) console.log(`    ${JSON.stringify(d)}`);
    }
  }
}
