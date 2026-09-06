/**
 * Brief B §6, second pass. t6 picked the program losing the most players, and
 * the rival planner had already spent its whole recruiting pool on bids, so
 * every bid of mine was correctly refused for want of points and no retention
 * bid ever landed. This picks a program that is losing somebody AND has spare
 * points, so the retention market is actually exercised.
 * Commands only; nothing written into `state`.
 */
import { readFileSync } from "node:fs";
import {
  advanceOffseasonStep, freeNilCapacity, weeklyDonorCapacity
} from "../../../packages/simulation/dist/index.js";
import { planOffseason } from "./lib.mjs";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));

for (const seed of process.argv.slice(2).length ? process.argv.slice(2) : ["qa-c3-market-1"]) {
const base = load(seed, "offseason-PORTAL");
const listings = Object.entries(base.portal ?? {});

// The rival planner's own bids for this step, so I can tell whose points are free.
const plan = planOffseason(base);
const bidPoints = new Map();
for (const c of plan) {
  if (c.type === "BID_PORTAL_PLAYER") bidPoints.set(c.programId, (bidPoints.get(c.programId) ?? 0) + c.points);
}
const byLoser = new Map();
for (const [playerId, listing] of listings) {
  const arr = byLoser.get(listing.previousProgramId) ?? [];
  arr.push(playerId);
  byLoser.set(listing.previousProgramId, arr);
}
const candidates = [...byLoser.entries()]
  .map(([programId, players]) => ({
    programId, players,
    spare: (base.recruiting[programId]?.points ?? 0) - (bidPoints.get(programId) ?? 0)
  }))
  .filter((c) => c.spare >= 25)
  .sort((a, b) => b.spare - a.spare || a.programId.localeCompare(b.programId));
if (!candidates.length) { console.log(`${seed}: nobody losing a player has 25 spare points`); continue; }
const { programId: me, players, spare } = candidates[0];
const mine = players[0];
const outside = listings.find(([, l]) => l.previousProgramId !== me)[0];
const program = base.programs[me];
console.log(`\n=== ${seed}: ${me} — losing ${players.length}, ${base.recruiting[me].points} points, planner spends ${bidPoints.get(me) ?? 0}, spare ${spare} ===`);
console.log(`   donor capacity weekly=${weeklyDonorCapacity(program)} free=${freeNilCapacity(base, me)}`);
console.log(`   retention target=${mine}  outside target=${outside}`);
// Every rival bidding on my man, so I know whether retention is contested.
const rivalBids = plan.filter((c) => c.type === "BID_PORTAL_PLAYER" && c.playerId === mine);
console.log(`   rivals bidding on ${mine}: ${rivalBids.length} ${JSON.stringify(rivalBids.map((c) => [c.programId, c.points, c.weeklyNil]))}`);

const run = (label, commands) => {
  const { state, events } = advanceOffseasonStep(base, [...plan, ...commands]);
  const rej = events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me);
  const bidEvents = events.filter((e) => e.type === "PORTAL_BID_SET" && e.programId === me);
  const settled = events.filter((e) => e.type === "PORTAL_SIGNING" || e.type === "PORTAL_PLAYER_SIGNED" || e.type === "PORTAL_RETAINED");
  const kept = state.players[mine]?.programId;
  const got = state.players[outside]?.programId;
  const rec = state.recruiting[me];
  console.log(`\n--- ${label}`);
  console.log(`   rejected=${rej.length}${rej.length ? ": " + rej.map((e) => e.reason).join(" | ") : ""}   PORTAL_BID_SET=${bidEvents.length}`);
  console.log(`   ${mine} -> ${kept} (retained=${kept === me})   ${outside} -> ${got} (poached=${got === me})`);
  console.log(`   ${me} recruiting.points ${base.recruiting[me].points} -> ${rec.points} finite=${Number.isFinite(rec.points)}`);
  console.log(`   ${me} budget finite=${Number.isFinite(state.programs[me].budget)}   NIL commitments=${Object.keys(state.nil?.[me]?.commitmentsByPlayer ?? {}).length} nonFinite=${Object.values(state.nil?.[me]?.commitmentsByPlayer ?? {}).filter((v) => !Number.isFinite(v)).length}`);
  console.log(`   league portal settlements this step: ${settled.length}`);
  return state;
};

run("control: planner only", []);
run("retention bid 25pts / $40k", [{ type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: 25, weeklyNil: 40_000 }]);
run("retention + poach, both funded", [
  { type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: 12, weeklyNil: 20_000 },
  { type: "BID_PORTAL_PLAYER", programId: me, playerId: outside, points: 12, weeklyNil: 20_000 }
]);
run("re-bid replaces rather than stacks (25 then 5)", [
  { type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: 25, weeklyNil: 40_000 },
  { type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: 5, weeklyNil: 1_000 }
]);
run("withdraw (0/0) after a real bid", [
  { type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: 25, weeklyNil: 40_000 },
  { type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: 0, weeklyNil: 0 }
]);
run("points=NaN, weeklyNil=NaN", [{ type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: NaN, weeklyNil: NaN }]);
run("points=25, weeklyNil=NaN", [{ type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: 25, weeklyNil: NaN }]);
run("points=Infinity", [{ type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: Infinity, weeklyNil: 1000 }]);
run("weeklyNil above every donor dollar", [{ type: "BID_PORTAL_PLAYER", programId: me, playerId: mine, points: 25, weeklyNil: 999_999_999 }]);
}
