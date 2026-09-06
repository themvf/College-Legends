/**
 * Brief B §1, third part — order independence at SIGNING_WEEK (week 12), with a
 * set of the *player's own* commands mixed into the rival-planned set.
 *
 * Week 12 is where `requiredLeadFor` drops to 0 and a commitment signs
 * immediately, so contests that were held open all season resolve in one pass.
 * That is the week where an order dependency would show most.
 */
import { readFileSync } from "node:fs";
import { advanceWeek } from "../../../packages/simulation/dist/index.js";
import { byProgramBlocks, fixedShuffle, hash, nilFingerprint, planWeek, prospectFingerprint, recruitingFingerprint, stateFingerprint } from "./lib.mjs";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));

for (const seed of ["qa-c3-market-1", "qa-c3-market-2", "qa-c3-market-3"]) {
  const state = load(seed, "s1-w12");
  const rivalCommands = planWeek(state);

  // Six "human" programs act as well: each piles onto the most contested
  // available prospect it has discovered, so several of them collide.
  const contestedCount = new Map();
  for (const r of Object.values(state.recruiting)) {
    for (const id of r.offeredProspectIds) contestedCount.set(id, (contestedCount.get(id) ?? 0) + 1);
  }
  const mine = [];
  const humans = Object.keys(state.programs).sort().slice(0, 6);
  for (const programId of humans) {
    const r = state.recruiting[programId];
    const target = [...r.discoveredProspectIds]
      .filter((id) => state.prospects[id] && state.prospects[id].status !== "SIGNED" && state.prospects[id].status !== "WITHDRAWN")
      .sort((a, b) => (contestedCount.get(b) ?? 0) - (contestedCount.get(a) ?? 0) || a.localeCompare(b))[0];
    if (!target) continue;
    mine.push({ type: "EVALUATE_PROSPECT", programId, prospectId: target, evaluation: "BASIC" });
    mine.push({ type: "OFFER_PROSPECT", programId, prospectId: target, extend: true });
    mine.push({ type: "INVEST_RECRUITING_POINTS", programId, prospectId: target, points: 10 });
    mine.push({ type: "SET_NIL_OFFER", programId, prospectId: target, weeklyAmount: 25_000 });
    mine.push({ type: "SCHEDULE_VISIT", programId, prospectId: target });
  }

  const commands = [...rivalCommands, ...mine];
  const blocks = byProgramBlocks(commands);
  const orders = {
    A_forward: commands,
    B_minesFirst: [...mine, ...rivalCommands],
    C_blocksReversed: [...blocks].reverse().flatMap(([, l]) => l),
    D_allReversed: [...commands].reverse(),
    E_allShuffled: fixedShuffle(commands, 13),
    F_altShuffle: fixedShuffle(commands, 99)
  };

  console.log(`\n=== seed ${seed} · week ${state.week} (SIGNING_WEEK=12) · rival=${rivalCommands.length} mine=${mine.length} ===`);
  const rows = {};
  for (const [name, list] of Object.entries(orders)) {
    const { state: next, events } = advanceWeek(state, list);
    rows[name] = { raw: prospectFingerprint(next) };
    const signed = Object.values(next.prospects).filter((p) => p.status === "SIGNED").length;
    console.log(`${name.padEnd(18)} prospects=${hash(rows[name].raw)} nil=${hash(nilFingerprint(next))} rec=${hash(recruitingFingerprint(next))} full=${stateFingerprint(next)} signed=${signed} rej=${events.filter((e) => e.type === "COMMAND_REJECTED").length}`);
  }
  const base = rows.A_forward.raw.split("\n");
  for (const [name, row] of Object.entries(rows)) {
    if (name === "A_forward") continue;
    const other = row.raw.split("\n");
    const diffs = [];
    for (let i = 0; i < base.length; i += 1) if (base[i] !== other[i]) diffs.push([base[i], other[i]]);
    if (diffs.length) {
      console.log(`  !! ${name}: ${diffs.length} prospect rows differ. First 5:`);
      for (const d of diffs.slice(0, 5)) console.log(`     A_forward: ${d[0]}\n     ${name}: ${d[1]}`);
    }
  }
}
