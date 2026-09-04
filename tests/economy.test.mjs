import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceWeek,
  beginSeason,
  createFictionalLeague,
  facilityUpkeep,
  facilityUpkeepIncrease,
  mediaRights,
  operatingCost,
  stadiumCapacity,
  FACILITY_UPGRADE_COST,
  OPERATING_SHARE
} from "../packages/simulation/dist/index.js";

const activeLeague = (seed, count = 24) => beginSeason(createFictionalLeague(seed, count));
const capacityOf = (program) => stadiumCapacity(program.facilities.STADIUM);

test("nothing in the economy is a stored constant any more", () => {
  const state = createFictionalLeague("economy-derived", 12);
  for (const program of Object.values(state.programs)) {
    assert.equal(program.weeklyRevenue, undefined, "weeklyRevenue must not survive as a frozen field");
    assert.equal(program.weeklyExpenses, undefined, "weeklyExpenses must not survive as a frozen field");
  }
});

test("fame converts to money — a bigger name earns more from the same schedule", () => {
  const state = createFictionalLeague("economy-fame", 12);
  const [a, b] = Object.values(state.programs);
  const quiet = { ...a, nationalPress: 10, prestige: 40, championships: 0 };
  const famous = { ...a, nationalPress: 90, prestige: 95, championships: 3 };
  assert.ok(
    mediaRights(famous).total > mediaRights(quiet).total * 2,
    "national recognition has to be worth real money, or fame stays inert"
  );
  assert.ok(mediaRights(quiet).total > 0, "and every program still has a conference floor");
  assert.equal(mediaRights(b).conference > 0, true);
});

test("a facility costs something to run, for as long as you own it", () => {
  // The defect: facilities cost $350K-$3M once and were then free forever, so
  // an upgrade was a purchase rather than a commitment.
  assert.equal(facilityUpkeep(0), 0);
  for (let level = 1; level < 5; level += 1) {
    assert.ok(facilityUpkeep(level + 1) > facilityUpkeep(level), "every level costs more than the one below");
    assert.ok(
      facilityUpkeepIncrease(level) > facilityUpkeepIncrease(level - 1),
      "and each step up costs more than the step before it"
    );
  }
});

test("the upgrade price a player is shown is not the whole price", () => {
  // A one-off cost beside a permanent one is exactly the sort of decision the
  // game is supposed to post in full, so the recurring figure has to exist and
  // be material against the purchase.
  for (const level of [1, 2, 3, 4]) {
    const purchase = FACILITY_UPGRADE_COST[level];
    const weekly = facilityUpkeepIncrease(level);
    assert.ok(weekly > 0, `level ${level} must add upkeep`);
    assert.ok(
      weekly * 12 > purchase * 0.05,
      `level ${level}: a season of upkeep (${weekly * 12}) has to matter against the ${purchase} price`
    );
  }
});

test("operating cost is every part of it, and the parts add up", () => {
  const state = activeLeague("economy-parts", 12);
  for (const program of Object.values(state.programs)) {
    const cost = operatingCost(program, capacityOf(program), 1_000_000);
    assert.equal(
      cost.total,
      cost.squad + cost.facilities + cost.stadium + cost.operations,
      `${program.id}: the posted breakdown must equal the posted total`
    );
    assert.ok(cost.squad > 0 && cost.facilities > 0 && cost.stadium > 0 && cost.operations > 0);
    assert.equal(cost.operations, Math.round(1_000_000 * OPERATING_SHARE));
  }
});

test("costs scale with revenue, so improving the program can never cost more than it earns", () => {
  // The defect this pins: an earlier build scaled costs superlinearly with
  // prestige and press while media money rose linearly, so a program that got
  // better lost money for it. Measured over a season, mid-tier programs going
  // 11-2 and 9-5 lost $7.4M and $5.7M while nobody who went 3-9 lost more than
  // $3.7M. Winning has to be worth more than losing at every revenue level.
  const state = activeLeague("economy-monotone", 12);
  const program = Object.values(state.programs)[0];
  const capacity = capacityOf(program);
  let previousMargin = -Infinity;
  for (const revenue of [500_000, 1_000_000, 2_000_000, 4_000_000, 8_000_000]) {
    const margin = revenue - operatingCost(program, capacity, revenue).total;
    assert.ok(margin > previousMargin, `earning more must leave more: ${revenue} left ${margin}`);
    previousMargin = margin;
  }
});

test("no term in the economy scales with an unbounded quantity", () => {
  // The first build drove the department cost off fanBase, which has no
  // ceiling — power programs reach 748,000 against an 88,000 stadium — and 55
  // of 72 programs were insolvent within five seasons.
  const state = activeLeague("economy-bounded", 12);
  const program = Object.values(state.programs)[0];
  const capacity = capacityOf(program);
  const modest = operatingCost({ ...program, fanBase: 30_000 }, capacity, 1_000_000);
  const enormous = operatingCost({ ...program, fanBase: 900_000 }, capacity, 1_000_000);
  assert.equal(
    enormous.total,
    modest.total,
    "a fan base thirty times larger must not move the cost base at all"
  );
});

test("a league of average programs neither runs away nor collapses", () => {
  let state = activeLeague("economy-trajectory", 24);
  const opening = Object.fromEntries(Object.values(state.programs).map((p) => [p.id, p.budget]));
  while (state.phase === "REGULAR_SEASON") state = advanceWeek(state).state;
  const ratios = Object.values(state.programs).map((p) => p.budget / Math.max(1, opening[p.id]));
  const solvent = Object.values(state.programs).filter((p) => p.budget > 0).length;
  assert.ok(solvent >= 18, `most of the league survives a single season, saw ${solvent} of 24`);
  assert.ok(
    Math.max(...ratios) < 3,
    `nobody triples their budget in one year, saw ${Math.max(...ratios).toFixed(1)}x`
  );
});

test("the weekly finance event still reconciles against the budget it moved", () => {
  let state = activeLeague("economy-reconcile", 12);
  const before = Object.fromEntries(Object.values(state.programs).map((p) => [p.id, p.budget]));
  const result = advanceWeek(state);
  const nets = new Map();
  for (const event of result.events) {
    if (event.type !== "WEEKLY_FINANCES") continue;
    assert.equal(event.net, event.revenue - event.expenses, `${event.programId}: net must equal revenue minus expenses`);
    nets.set(event.programId, (nets.get(event.programId) ?? 0) + event.net);
  }
  assert.ok(nets.size > 0);
  for (const [programId, net] of nets) {
    const moved = result.state.programs[programId].budget - before[programId];
    assert.equal(moved, net, `${programId}: the budget moved by something the finance event did not report`);
  }
});
