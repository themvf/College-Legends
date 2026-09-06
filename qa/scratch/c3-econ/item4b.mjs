/**
 * Brief C item 4, detail. Characterise the rival planner's posted-vs-charged
 * shortfall properly: it is bimodal, because the argument the planner passes
 * (media rights) is close to realised revenue on a road week and nowhere near
 * it on a home week.
 *
 * Also: does the error ever flip the decision it feeds? Two gates read
 * `weeklyExpenses`:
 *   ai/src/index.ts:642  budget < cost + weeklyExpenses * 2      (facility build)
 *   ai/src/index.ts:951  availableBudget < signingCost + buyout + weeklyExpenses * 2  (hire)
 */
import * as sim from "../../../packages/simulation/dist/index.js";
import * as ai from "../../../packages/ai/dist/index.js";

const { createFictionalLeague, beginSeason, advanceWeek, operatingCost, mediaRights, stadiumCapacity } = sim;

const SEEDS = (process.argv[2] ?? "qa-c3-econ-72,qa-c3-econ-a,qa-c3-econ-b").split(",");
const PROGRAMS = Number(process.argv[3] ?? 24);
const WEEKS = Number(process.argv[4] ?? 8);

const money = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[s.length >> 1] : (s[(s.length >> 1) - 1] + s[s.length >> 1]) / 2; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

const rows = [];
for (const SEED of SEEDS) {
  let state = beginSeason(createFictionalLeague(SEED, PROGRAMS));
  for (let i = 0; i < WEEKS && state.phase === "REGULAR_SEASON" && state.week <= 14; i += 1) {
    const views = ai.weeklyBusinessPlanningKnowledgeViews(state);
    const week = state.week;
    const result = advanceWeek(state, ai.planWeeklyCommands(state));
    for (const e of result.events ?? []) {
      if (e.type !== "WEEKLY_FINANCES") continue;
      const program = state.programs[e.programId];
      const v = views[e.programId];
      if (!program || !v) continue;
      rows.push({
        seed: SEED, week, tier: program.tier,
        posted: v.weeklyExpenses,
        charged: e.squadCost + e.facilitiesCost + e.stadiumCost + e.operationsCost,
        home: e.gateRevenue > 0,
        revenue: e.revenue, media: e.mediaRevenue
      });
    }
    state = result.state ?? result;
  }
}

console.log(`n = ${rows.length} program-weeks over ${SEEDS.length} seeds, ${PROGRAMS} programs, ${WEEKS} weeks\n`);
console.log("Shortfall = what the engine charged minus what the planner posted.");
console.log("split       | tier  |   n | median posted | median charged | median shortfall | mean shortfall | max shortfall");
for (const [label, filter] of [["road week", (r) => !r.home], ["HOME week", (r) => r.home], ["all", () => true]]) {
  for (const tier of ["LOW", "MID", "POWER"]) {
    const t = rows.filter((r) => r.tier === tier && filter(r));
    if (!t.length) continue;
    const short = t.map((r) => r.charged - r.posted);
    console.log(`${label.padEnd(11)} | ${tier.padEnd(5)} | ${String(t.length).padStart(3)} | `
      + `${money(med(t.map((r) => r.posted))).padStart(9)} | ${money(med(t.map((r) => r.charged))).padStart(9)} | `
      + `${money(med(short)).padStart(9)} | ${money(mean(short)).padStart(9)} | ${money(Math.max(...short)).padStart(9)}`);
  }
}
const exact = rows.filter((r) => r.posted === r.charged).length;
const under = rows.filter((r) => r.posted < r.charged).length;
console.log(`\nexact agreement: ${exact} of ${rows.length}   ·   posted understates: ${under} of ${rows.length}`);

// ---- does it flip a decision? ----------------------------------------------
console.log("\nDecision impact. Week-1 facility builds, posted figure vs a figure built from realised revenue:");
let considered = 0, flipped = 0, gained = 0;
for (const SEED of SEEDS) {
  const s = beginSeason(createFictionalLeague(SEED, PROGRAMS));
  // Realised revenue for week 1, taken from the week actually played.
  const played = advanceWeek(s, ai.planWeeklyCommands(s));
  const realised = new Map();
  for (const e of played.events ?? []) if (e.type === "WEEKLY_FINANCES") realised.set(e.programId, e.revenue);
  const views = ai.weeklyBusinessPlanningKnowledgeViews(s);
  for (const [id, v] of Object.entries(views)) {
    const program = s.programs[id];
    const trueExpenses = operatingCost(program, stadiumCapacity(program.facilities.STADIUM),
      realised.get(id) ?? mediaRights(program).total).total;
    const asPosted = ai.selectFacilityUpgrade(v).length > 0;
    const asCorrect = ai.selectFacilityUpgrade({ ...v, weeklyExpenses: trueExpenses }).length > 0;
    considered += 1;
    if (asPosted && !asCorrect) flipped += 1;
    if (!asPosted && asCorrect) gained += 1;
  }
}
console.log(`  ${considered} programs evaluated · builds allowed by the posted figure that the`
  + ` correct figure blocks: ${flipped} · blocked that it allows: ${gained}`);
console.log(`  (the gate is \`budget < cost + weeklyExpenses * 2\`; the shortfall is doubled,`
  + ` and \`cost\` is $350K-$3M, so a 6-40% error in a two-week term rarely reaches the boundary)`);
