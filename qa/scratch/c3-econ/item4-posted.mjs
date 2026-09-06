/**
 * Brief C item 4 — posted versus charged, at every place a figure is posted.
 *
 * run.mjs already checks the WEEKLY_FINANCES event against operatingCost() and
 * mediaRights() recomputed from state: 0 mismatches in 6,240. That check is
 * close to tautological, because it calls the same function the engine calls
 * with the same arguments.
 *
 * The defect class the charter names is different: a *consumer* recomputing the
 * figure from an approximation. There are three consumers of operatingCost()
 * outside the finance step:
 *
 *   apps/web/src/App.tsx:1856   the Operating position panel
 *   packages/ai/src/index.ts:235  coachingPlanningKnowledgeView.weeklyExpenses
 *   packages/ai/src/index.ts:326  weeklyBusinessPlanningKnowledgeView.weeklyExpenses
 *
 * This measures each of them against what WEEKLY_FINANCES actually charged the
 * same program in the same week.
 */
import * as sim from "../../../packages/simulation/dist/index.js";
import * as ai from "../../../packages/ai/dist/index.js";

const { createFictionalLeague, beginSeason, advanceWeek, advanceOffseasonStep,
  operatingCost, mediaRights, stadiumCapacity } = sim;

const SEED = process.argv[2] ?? "qa-c3-econ-72";
const PROGRAMS = Number(process.argv[3] ?? 72);
const WEEKS = Number(process.argv[4] ?? 14);

const money = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[(s.length >> 1) - 1] + s[s.length >> 1]) / 2; };

let state = beginSeason(createFictionalLeague(SEED, PROGRAMS));

const rows = [];
for (let i = 0; i < WEEKS && state.phase === "REGULAR_SEASON" && state.week <= 14; i += 1) {
  // Capture the AI's own posted view BEFORE the week resolves — this is exactly
  // the number selectFacilityUpgrade and the coaching selector read.
  const views = ai.weeklyBusinessPlanningKnowledgeViews(state);
  const posted = new Map();
  for (const [id, v] of Object.entries(views)) posted.set(id, v.weeklyExpenses);
  const coachPosted = new Map();
  for (const id of Object.keys(state.programs)) {
    try { coachPosted.set(id, ai.coachingPlanningKnowledgeView(state, id).weeklyExpenses); } catch { /* not offered */ }
  }
  const week = state.week;
  const commands = ai.planWeeklyCommands(state);
  const result = advanceWeek(state, commands);
  const next = result.state ?? result;
  for (const e of result.events ?? []) {
    if (e.type !== "WEEKLY_FINANCES") continue;
    const program = state.programs[e.programId];
    if (!program) continue;
    // The engine's own operating cost for that week: what it charged.
    const chargedOperating = e.squadCost + e.facilitiesCost + e.stadiumCost + e.operationsCost;
    rows.push({
      week, id: e.programId, tier: program.tier,
      charged: chargedOperating,
      postedAI: posted.get(e.programId) ?? null,
      postedCoach: coachPosted.get(e.programId) ?? null,
      revenue: e.revenue,
      media: e.mediaRevenue,
      budget: program.budget
    });
  }
  state = next;
}

console.log(`seed ${SEED} · ${PROGRAMS} programs · ${rows.length} program-weeks\n`);
console.log("The rival planner's posted `weeklyExpenses` against what the same week charged:");
console.log("tier  |  n | median posted | median charged | median shortfall | posted as % of charged");
for (const tier of ["LOW", "MID", "POWER"]) {
  const t = rows.filter((r) => r.tier === tier && r.postedAI !== null);
  if (!t.length) continue;
  const short = t.map((r) => r.charged - r.postedAI);
  console.log(`${tier.padEnd(5)} | ${String(t.length).padStart(3)} | ${money(med(t.map((r) => r.postedAI))).padStart(9)} | `
    + `${money(med(t.map((r) => r.charged))).padStart(9)} | ${money(med(short)).padStart(9)} | `
    + `${(100 * med(t.map((r) => r.postedAI / r.charged))).toFixed(1)}%`);
}
const exact = rows.filter((r) => r.postedAI === r.charged).length;
console.log(`\nexact agreement: ${exact} of ${rows.length} program-weeks`);

const coachRows = rows.filter((r) => r.postedCoach !== null);
if (coachRows.length) {
  const cExact = coachRows.filter((r) => r.postedCoach === r.charged).length;
  console.log(`coaching view exact agreement: ${cExact} of ${coachRows.length}`);
}

// Does the gate the shortfall feeds actually flip? Re-run selectFacilityUpgrade
// with the corrected figure and count the decisions that change.
console.log("\nThe decision the shortfall feeds: `budget < cost + weeklyExpenses * 2`.");
console.log("Programs where the corrected figure would have blocked a build the posted figure allowed:");
let flipped = 0, considered = 0;
{
  let s = beginSeason(createFictionalLeague(SEED, PROGRAMS));
  const views = ai.weeklyBusinessPlanningKnowledgeViews(s);
  for (const [id, v] of Object.entries(views)) {
    if (v.week !== 1) continue;
    const issued = ai.selectFacilityUpgrade(v);
    if (!issued.length) continue;
    considered += 1;
    const program = s.programs[id];
    // What the engine would charge on a typical week: use the first week's
    // realised revenue as the argument, not media rights alone.
    const trueExpenses = operatingCost(program, stadiumCapacity(program.facilities.STADIUM),
      // Approximate realised revenue by the ratio measured above; exact figure
      // is not available before the week resolves, which is the point.
      mediaRights(program).total * 4).total;
    const corrected = ai.selectFacilityUpgrade({ ...v, weeklyExpenses: trueExpenses });
    if (!corrected.length) flipped += 1;
  }
}
console.log(`  ${flipped} of ${considered} week-1 builds would have been blocked`);
