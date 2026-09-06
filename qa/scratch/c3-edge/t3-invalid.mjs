/**
 * Brief B §3 — invalid and degenerate recruiting input.
 *
 * Every case is reached through the public command path against a real
 * 72-program state (snapshot from build-states.mjs, seed qa-c3-market-1,
 * season 2027 week 6). Nothing is written into `state` directly.
 */
import { readFileSync } from "node:fs";
import { advanceWeek, beginSeason, prospectOdds } from "../../../packages/simulation/dist/index.js";

const seed = process.argv[2] ?? "qa-c3-market-1";
const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));

let base = load("s1-w1");
// Advance to week 6 with no AI commands so the fixture is small and stable.
for (let i = 0; i < 5; i += 1) base = advanceWeek(base).state;

const programIds = Object.keys(base.programs).sort();
const me = programIds[0];
const rival = programIds[1];

// --- set up a legitimate board for `me` -------------------------------------
const availableIds = Object.keys(base.prospects).sort()
  .filter((id) => base.prospects[id].status === "AVAILABLE");
const discovered = base.recruiting[me].discoveredProspectIds;
console.log(`program=${me} week=${base.week} discovered=${discovered.length} available=${availableIds.length}`);

const target = discovered.find((id) => base.prospects[id]?.status === "AVAILABLE");
const undiscovered = availableIds.find((id) => !discovered.includes(id));

function run(label, commands, state = base) {
  const { state: next, events } = advanceWeek(state, commands);
  const rejects = events.filter((e) => e.type === "COMMAND_REJECTED");
  const accepted = events.filter((e) => ["PROSPECT_OFFERED", "NIL_OFFER_SET", "RECRUITING_INVESTMENT", "RECRUITING_VISIT_SCHEDULED", "PROSPECT_EVALUATED"].includes(e.type));
  console.log(`\n--- ${label}`);
  for (const r of rejects) console.log(`   REJECTED ${r.command.type}: ${r.reason}`);
  for (const a of accepted) console.log(`   ACCEPTED ${a.type} ${JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k]) => !["type", "season", "week"].includes(k))))}`);
  if (!rejects.length && !accepted.length) console.log("   (no COMMAND_REJECTED and no recruiting event — silent)");
  return { next, events, rejects, accepted };
}

// 1. Unknown prospect id
run("unknown prospect id", [{ type: "OFFER_PROSPECT", programId: me, prospectId: "no-such-prospect", extend: true }]);

// 2. Unknown program id
run("unknown program id", [{ type: "OFFER_PROSPECT", programId: "no-such-program", prospectId: target, extend: true }]);

// 3. A command naming ANOTHER program (the classic "act for a rival" case)
run("command issued for another program (rival's id)", [
  { type: "OFFER_PROSPECT", programId: rival, prospectId: base.recruiting[rival].discoveredProspectIds[0], extend: true }
]);

// 4. Offer to a prospect this program has never discovered
run("offer to an undiscovered prospect", [{ type: "OFFER_PROSPECT", programId: me, prospectId: undiscovered, extend: true }]);

// --- get a real offer on the table so the money cases are reachable ---------
let armed = advanceWeek(base, [
  { type: "EVALUATE_PROSPECT", programId: me, prospectId: target, evaluation: "BASIC" },
  { type: "OFFER_PROSPECT", programId: me, prospectId: target, extend: true }
]).state;
console.log(`\narmed: offered=${armed.recruiting[me].offeredProspectIds.includes(target)} evals=${JSON.stringify(armed.recruiting[me].scoutingByProspect[target].evaluations)} points=${armed.recruiting[me].points}`);

// 5. NIL money at the boundaries
for (const [label, amount] of [
  ["negative NIL offer (-5000)", -5000],
  ["zero NIL offer", 0],
  ["fractional NIL offer (1234.56)", 1234.56],
  ["NIL offer above the whole budget", armed.programs[me].budget + 1],
  ["NIL offer = Number.MAX_SAFE_INTEGER", Number.MAX_SAFE_INTEGER],
  ["NIL offer = Infinity", Infinity],
  ["NIL offer = NaN", NaN],
  ["NIL offer = undefined", undefined],
  ["NIL offer = \"5000\" (string)", "5000"]
]) {
  const { next } = run(label, [{ type: "SET_NIL_OFFER", programId: me, prospectId: target, weeklyAmount: amount }], armed);
  const stored = next.nil?.[me]?.offersByProspect?.[target];
  const committed = next.nil?.[me]?.commitmentsByPlayer?.[target];
  console.log(`   stored offer=${stored} committed=${committed} finite=${stored === undefined ? "n/a" : Number.isFinite(stored)}`);
}

// 6. Pursuit points at the boundaries
for (const [label, points] of [
  ["invest 0 points", 0],
  ["invest -10 points", -10],
  ["invest 2.7 points (fractional)", 2.7],
  ["invest 26 points (above the 25 cap)", 26],
  ["invest more points than the program holds", armed.recruiting[me].points + 500],
  ["invest Infinity points", Infinity],
  ["invest NaN points", NaN],
  ["invest undefined points", undefined]
]) {
  const { next } = run(label, [{ type: "INVEST_RECRUITING_POINTS", programId: me, prospectId: target, points }], armed);
  const pool = next.recruiting[me].points;
  const pursuit = next.recruiting[me].scoutingByProspect[target]?.pursuitPoints;
  console.log(`   pool=${pool} finite=${Number.isFinite(pool)} pursuit=${pursuit} finite=${Number.isFinite(pursuit)}`);
}

// 7. Unknown evaluation type
run("unknown evaluation type", [{ type: "EVALUATE_PROSPECT", programId: me, prospectId: target, evaluation: "TELEPATHY" }], armed);

// 8. Offer to a prospect committed elsewhere / committed here
const committedElsewhere = Object.values(base.prospects).find((p) => p.status === "COMMITTED" && p.signedProgramId !== me && base.recruiting[me].discoveredProspectIds.includes(p.id));
if (committedElsewhere) run(`offer to a prospect committed elsewhere (${committedElsewhere.signedProgramId})`, [
  { type: "OFFER_PROSPECT", programId: me, prospectId: committedElsewhere.id, extend: true }
]);
else console.log("\n--- offer to a prospect committed elsewhere: none discovered by this program");

// 9. prospectOdds boundaries
console.log("\n=== prospectOdds boundaries ===");
const oddsCases = [
  ["not pursuing, zero contenders", me, availableIds.find((id) => Object.values(base.recruiting).every((r) => !r.offeredProspectIds.includes(id) && !(r.scoutingByProspect[id]?.pursuitPoints > 0))), undefined],
  ["not pursuing, contested", me, target, undefined],
  ["nilOffer 0", me, target, { nilOffer: 0 }],
  ["nilOffer negative", me, target, { nilOffer: -1 }],
  ["nilOffer = whole budget", me, target, { nilOffer: base.programs[me].budget }],
  ["nilOffer = Infinity", me, target, { nilOffer: Infinity }],
  ["nilOffer = NaN", me, target, { nilOffer: NaN }],
  ["unknown prospect", me, "no-such-prospect", undefined],
  ["unknown program", "no-such-program", target, undefined]
];
for (const [label, programId, prospectId, options] of oddsCases) {
  if (!prospectId) { console.log(`${label.padEnd(34)} (no fixture)`); continue; }
  let odds;
  try { odds = prospectOdds(base, programId, prospectId, undefined, options); }
  catch (error) { console.log(`${label.padEnd(34)} THREW ${error.message}`); continue; }
  if (!odds) { console.log(`${label.padEnd(34)} null`); continue; }
  const ok = Number.isFinite(odds.percent) && odds.percent >= 0 && odds.percent <= 100;
  console.log(`${label.padEnd(34)} outcome=${odds.outcome} percent=${odds.percent} contenders=${odds.contenders} lead=${odds.lead} inRange=${ok}`);
}
