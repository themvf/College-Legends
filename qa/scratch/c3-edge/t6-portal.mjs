/**
 * Brief B §6 — recruiting and the portal share a market. One program bidding in
 * both in the same offseason, including a retention bid by the program the
 * player is leaving.
 *
 * Everything is reached through commands against the real `offseason-PORTAL`
 * snapshot. Nothing is written into `state`.
 */
import { readFileSync } from "node:fs";
import {
  advanceOffseasonStep, beginSeason, freeNilCapacity, weeklyDonorCapacity
} from "../../../packages/simulation/dist/index.js";
import { planOffseason } from "./lib.mjs";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));
const seed = process.argv[2] ?? "qa-c3-market-1";
const base = load(seed, "offseason-PORTAL");

const listings = Object.entries(base.portal ?? {});
console.log(`=== ${seed} offseason-PORTAL: ${listings.length} listings ===`);

// A program losing somebody good, so a retention bid is a real decision.
const byLoser = new Map();
for (const [playerId, listing] of listings) {
  const arr = byLoser.get(listing.previousProgramId) ?? [];
  arr.push(playerId);
  byLoser.set(listing.previousProgramId, arr);
}
const [loser, lostPlayers] = [...byLoser.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];
const mine = lostPlayers[0];
const somebodyElses = listings.find(([, l]) => l.previousProgramId !== loser)[0];
console.log(`   program losing the most: ${loser} (${lostPlayers.length} in the portal)`);
console.log(`   retention target: ${mine}   outside target: ${somebodyElses}`);
console.log(`   donor capacity: weekly=${weeklyDonorCapacity(base, loser)} free=${freeNilCapacity(base, loser)}`);

const summarise = (label, commands) => {
  const { state, events } = advanceOffseasonStep(base, [...planOffseason(base), ...commands]);
  const mineEvents = events.filter((e) => e.programId === loser);
  const rej = mineEvents.filter((e) => e.type === "COMMAND_REJECTED");
  const roster = (s, id) => Object.values(s.players).filter((p) => p.programId === id).length;
  const kept = state.players[mine]?.programId;
  const got = state.players[somebodyElses]?.programId;
  console.log(`\n--- ${label}`);
  console.log(`   rejections for ${loser}: ${rej.length ? rej.map((e) => `${e.command.type}: ${e.reason}`).join(" | ") : "none"}`);
  console.log(`   retention target ${mine} now at: ${kept}  (kept=${kept === loser})`);
  console.log(`   outside target  ${somebodyElses} now at: ${got}  (won=${got === loser})`);
  console.log(`   ${loser} roster ${roster(base, loser)} -> ${roster(state, loser)}   budget ${base.programs[loser].budget} -> ${state.programs[loser].budget} NaN=${Number.isNaN(state.programs[loser].budget)}`);
  const nil = state.nil?.[loser];
  const commitments = Object.entries(nil?.commitmentsByPlayer ?? {});
  const stranded = commitments.filter(([key]) => !state.players[key] && !state.prospects[key]);
  console.log(`   NIL commitments held by ${loser}: ${commitments.length}, non-finite=${commitments.filter(([, v]) => !Number.isFinite(v)).length}, stranded keys=${stranded.length}`);
  console.log(`   phase after: ${state.phase} step=${state.offseasonStep}`);
  return state;
};

summarise("control: no bids of my own", []);
summarise("retention bid only", [
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: mine, points: 20, weeklyNil: 30_000 }
]);
summarise("retention + an outside bid, same step", [
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: mine, points: 20, weeklyNil: 30_000 },
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: somebodyElses, points: 20, weeklyNil: 30_000 }
]);
summarise("re-bidding the same player replaces rather than stacks", [
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: mine, points: 20, weeklyNil: 30_000 },
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: mine, points: 5, weeklyNil: 1_000 }
]);
summarise("withdraw: points 0, weeklyNil 0", [
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: mine, points: 20, weeklyNil: 30_000 },
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: mine, points: 0, weeklyNil: 0 }
]);
summarise("bid beyond every donor dollar", [
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: mine, points: 20, weeklyNil: Math.round(base.programs[loser].budget) }
]);
summarise("negative bid", [
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: mine, points: -5, weeklyNil: -30_000 }
]);
summarise("non-finite bid", [
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: mine, points: NaN, weeklyNil: NaN }
]);
summarise("unknown player id", [
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: "player:no-such-thing", points: 5, weeklyNil: 1_000 }
]);
summarise("a player who is NOT in the portal", [
  { type: "BID_PORTAL_PLAYER", programId: loser, playerId: Object.keys(base.players).find((id) => !base.portal?.[id]), points: 5, weeklyNil: 1_000 }
]);

// ------------------------- the whole offseason with both markets in play
{
  console.log(`\n=== the same program bids in the portal AND signs a class, same offseason ===`);
  let state = base;
  const bidCommands = lostPlayers.slice(0, 3).map((playerId) => ({
    type: "BID_PORTAL_PLAYER", programId: loser, playerId, points: 15, weeklyNil: 20_000
  }));
  const r = advanceOffseasonStep(state, [...planOffseason(state), ...bidCommands]);
  state = r.state;
  console.log(`   after PORTAL: step=${state.offseasonStep} roster=${Object.values(state.players).filter((p) => p.programId === loser).length}`);
  while (state.phase === "OFFSEASON") {
    state = advanceOffseasonStep(state, planOffseason(state)).state;
  }
  const roster = Object.values(state.players).filter((p) => p.programId === loser);
  const scholarship = roster.filter((p) => p.eligibility.rosterStatus === "SCHOLARSHIP").length;
  console.log(`   after completeOffseason: phase=${state.phase} season=${state.season}`);
  console.log(`   ${loser} roster=${roster.length} scholarship=${scholarship} limit=${state.programs[loser].scholarshipLimit} over=${scholarship > state.programs[loser].scholarshipLimit}`);
  const over = Object.keys(state.programs).filter((id) => Object.values(state.players)
    .filter((p) => p.programId === id && p.eligibility.rosterStatus === "SCHOLARSHIP").length > state.programs[id].scholarshipLimit);
  console.log(`   programs over the scholarship limit league-wide: ${over.length} ${JSON.stringify(over.slice(0, 5))}`);
  const nilAll = Object.entries(state.nil ?? {});
  const strandedAll = nilAll.flatMap(([programId, n]) => Object.keys(n.commitmentsByPlayer ?? {})
    .filter((key) => !state.players[key] && !state.prospects[key]).map((key) => `${programId}:${key}`));
  const nonFinite = nilAll.flatMap(([programId, n]) => Object.entries(n.commitmentsByPlayer ?? {})
    .filter(([, v]) => !Number.isFinite(v)).map(([k]) => `${programId}:${k}`));
  console.log(`   league-wide stranded NIL commitments: ${strandedAll.length} ${JSON.stringify(strandedAll.slice(0, 5))}`);
  console.log(`   league-wide non-finite NIL commitments: ${nonFinite.length}`);
  const budgets = Object.values(state.programs).map((p) => p.budget);
  console.log(`   budgets: anyNaN=${budgets.some(Number.isNaN)} min=${Math.round(Math.min(...budgets))} max=${Math.round(Math.max(...budgets))}`);
  const next = beginSeason(state);
  console.log(`   beginSeason -> season=${next.season} week=${next.week} phase=${next.phase}`);
  console.log(`   eventHistory=${next.eventHistory.length}`);
}
