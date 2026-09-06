/**
 * Brief B §1, portal half — order independence of the PORTAL offseason step.
 *
 * Fixture: snapshots from build-states.mjs (72 programs), offseason-PORTAL.
 * Same command set, five orderings, compare the resulting portal + roster state.
 */
import { readFileSync } from "node:fs";
import { advanceOffseasonStep } from "../../../packages/simulation/dist/index.js";
import { portalPlanningKnowledgeViews, planOffseasonCommands } from "../../../packages/ai/dist/index.js";
import { byProgramBlocks, fixedShuffle, hash } from "./lib.mjs";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));

function portalFingerprint(state) {
  return Object.keys(state.portal ?? {}).sort().map((playerId) => {
    const listing = state.portal[playerId];
    const player = state.players[playerId];
    return [
      playerId,
      listing.status ?? "-",
      player?.programId ?? "-",
      JSON.stringify(Object.entries(listing.bidsByProgram ?? {}).sort()),
      JSON.stringify(Object.entries(listing.interestByProgram ?? {}).sort())
    ].join("|");
  }).join("\n");
}

function rosterFingerprint(state) {
  return hash(Object.keys(state.players).sort().map((id) => `${id}:${state.players[id].programId}`).join(","));
}

function nilFp(state) {
  return hash(Object.keys(state.nil ?? {}).sort().map((p) =>
    `${p}|${JSON.stringify(Object.entries(state.nil[p].commitmentsByPlayer ?? {}).sort())}`).join("\n"));
}

for (const seed of ["qa-c3-market-1", "qa-c3-market-2", "qa-c3-market-3"]) {
  const state = load(seed, "offseason-PORTAL");
  const views = portalPlanningKnowledgeViews(state);
  const commands = planOffseasonCommands(state, undefined, views);
  const bids = commands.filter((c) => c.type === "BID_PORTAL_PLAYER");
  const blocks = byProgramBlocks(commands);

  const orders = {
    A_forward: commands,
    B_blocksReversed: [...blocks].reverse().flatMap(([, l]) => l),
    C_blocksShuffled: fixedShuffle(blocks, 7).flatMap(([, l]) => l),
    D_allReversed: [...commands].reverse(),
    E_allShuffled: fixedShuffle(commands, 13)
  };

  console.log(`\n=== seed ${seed} · PORTAL step · listings=${Object.keys(state.portal ?? {}).length} commands=${commands.length} bids=${bids.length} ===`);
  const rows = {};
  for (const [name, list] of Object.entries(orders)) {
    const { state: next, events } = advanceOffseasonStep(state, list);
    const signings = events.filter((e) => e.type === "PORTAL_PLAYER_SIGNED")
      .map((e) => `${e.playerId}->${e.programId}`).sort().join(",");
    const unclaimed = events.filter((e) => e.type === "PORTAL_PLAYER_UNCLAIMED").map((e) => e.playerId).sort().join(",");
    rows[name] = { raw: `${signings}\n${unclaimed}\n${portalFingerprint(next)}` };
    console.log(`${name.padEnd(18)} signings=${hash(signings)} unclaimed=${hash(unclaimed)} roster=${rosterFingerprint(next)} nil=${nilFp(next)} signed=${events.filter((e) => e.type === "PORTAL_PLAYER_SIGNED").length} unclaimedN=${events.filter((e) => e.type === "PORTAL_PLAYER_UNCLAIMED").length} rejected=${events.filter((e) => e.type === "COMMAND_REJECTED").length}`);
  }
  const base = rows.A_forward.raw.split("\n");
  for (const [name, row] of Object.entries(rows)) {
    if (name === "A_forward") continue;
    const other = row.raw.split("\n");
    const diffs = [];
    for (let i = 0; i < base.length; i += 1) if (base[i] !== other[i]) diffs.push([base[i], other[i]]);
    if (diffs.length) {
      console.log(`  !! ${name}: ${diffs.length} listing rows differ. First 5:`);
      for (const d of diffs.slice(0, 5)) console.log(`     A: ${d[0]}\n     ${name}: ${d[1]}`);
    }
  }
}
