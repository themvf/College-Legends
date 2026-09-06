/**
 * Brief C, failure 2 — nothing may scale with an unbounded quantity.
 *
 * Hold everything constant, multiply `fanBase` thirtyfold, confirm the cost
 * base does not move. Two levels:
 *
 *   A. The pure functions the finance step charges from: `operatingCost` and
 *      `mediaRights`, and the facility upkeep inside them.
 *   B. What the engine actually charges over a played week — a real league
 *      advanced one week against an identical copy whose fan bases are 30x.
 *      Revenue is allowed to move (the gate is bounded by capacity, and the
 *      sponsor market value is a designed fanBase term); the *cost base* —
 *      squad, facilities, stadium — must not.
 */
import * as sim from "../../../packages/simulation/dist/index.js";
import * as ai from "../../../packages/ai/dist/index.js";

const { createFictionalLeague, beginSeason, advanceWeek, operatingCost, mediaRights, stadiumCapacity } = sim;
const SEED = process.argv[2] ?? "qa-c3-econ-a";
const MULT = 30;

// ---- A. the pure functions -------------------------------------------------
const base = createFictionalLeague(SEED, 24);
const pureRows = [];
for (const program of Object.values(base.programs)) {
  const capacity = stadiumCapacity(program.facilities.STADIUM);
  // Revenue held constant, which is the point: the question is whether the cost
  // base moves when only fanBase moves.
  const revenue = 1_000_000;
  const before = operatingCost(program, capacity, revenue);
  const beforeMedia = mediaRights(program);
  const inflated = { ...program, fanBase: program.fanBase * MULT };
  const after = operatingCost(inflated, capacity, revenue);
  const afterMedia = mediaRights(inflated);
  pureRows.push({
    id: program.id, tier: program.tier, fanBase: program.fanBase,
    costBaseBefore: before.squad + before.facilities + before.stadium,
    costBaseAfter: after.squad + after.facilities + after.stadium,
    totalBefore: before.total, totalAfter: after.total,
    mediaBefore: beforeMedia.total, mediaAfter: afterMedia.total
  });
}
const pureMoved = pureRows.filter((r) => r.totalBefore !== r.totalAfter || r.mediaBefore !== r.mediaAfter);
console.log(`A. pure functions, 24 programs, fanBase x${MULT}: ${pureMoved.length} of ${pureRows.length} moved`);
if (pureMoved.length) console.log(JSON.stringify(pureMoved.slice(0, 5), null, 1));

// ---- B. a played week ------------------------------------------------------
function financeByProgram(events) {
  const map = new Map();
  for (const event of events) if (event.type === "WEEKLY_FINANCES") map.set(event.programId, event);
  return map;
}

function playOneWeek(state) {
  const commands = ai.planWeeklyCommands(state);
  return advanceWeek(state, commands);
}

let control = beginSeason(createFictionalLeague(SEED, 24));
let treated = beginSeason(createFictionalLeague(SEED, 24));
for (const program of Object.values(treated.programs)) program.fanBase = program.fanBase * MULT;

const controlOut = playOneWeek(control);
const treatedOut = playOneWeek(treated);
const c = financeByProgram(controlOut.events);
const t = financeByProgram(treatedOut.events);

const rows = [];
for (const [id, ce] of c) {
  const te = t.get(id);
  if (!te) continue;
  rows.push({
    id, tier: control.programs[id].tier, fanBase: control.programs[id].fanBase,
    squad: [ce.squadCost, te.squadCost],
    facilities: [ce.facilitiesCost, te.facilitiesCost],
    stadium: [ce.stadiumCost, te.stadiumCost],
    operations: [ce.operationsCost, te.operationsCost],
    nil: [ce.nilSpend, te.nilSpend],
    payroll: [ce.staffPayroll, te.staffPayroll],
    revenue: [ce.revenue, te.revenue],
    gate: [ce.gateRevenue, te.gateRevenue],
    sponsorship: [ce.sponsorshipRevenue, te.sponsorshipRevenue],
    media: [ce.mediaRevenue, te.mediaRevenue],
    expenses: [ce.expenses, te.expenses]
  });
}
const moved = (key) => rows.filter((r) => r[key][0] !== r[key][1]).length;
console.log(`\nB. one played week, ${rows.length} programs with finances, fanBase x${MULT}:`);
for (const key of ["squad", "facilities", "stadium", "payroll", "nil", "operations", "media", "gate", "sponsorship", "revenue", "expenses"]) {
  const n = moved(key);
  const ratio = rows.length
    ? rows.reduce((s, r) => s + (r[key][0] > 0 ? r[key][1] / r[key][0] : 1), 0) / rows.length
    : 1;
  console.log(`  ${key.padEnd(12)} moved in ${String(n).padStart(2)} / ${rows.length}   mean ratio ${ratio.toFixed(3)}`);
}
const costBaseMoved = rows.filter((r) =>
  r.squad[0] !== r.squad[1] || r.facilities[0] !== r.facilities[1] || r.stadium[0] !== r.stadium[1]);
console.log(`\n  cost base (squad+facilities+stadium) moved in ${costBaseMoved.length} of ${rows.length}`);
if (costBaseMoved.length) console.log(JSON.stringify(costBaseMoved.slice(0, 3), null, 1));

// Sample the biggest sponsorship/gate movers, since those are designed to see fans.
rows.sort((a, b) => (b.revenue[1] - b.revenue[0]) - (a.revenue[1] - a.revenue[0]));
console.log("\n  largest revenue movers:");
for (const r of rows.slice(0, 4)) {
  console.log(`   ${r.id} ${r.tier} fans ${r.fanBase} · revenue ${r.revenue[0]} -> ${r.revenue[1]}`
    + ` (gate ${r.gate[0]}->${r.gate[1]}, sponsor ${r.sponsorship[0]}->${r.sponsorship[1]})`
    + ` · expenses ${r.expenses[0]} -> ${r.expenses[1]}`);
}
