/**
 * QA cycle 3, Brief C — the ledger over a dynasty.
 *
 * Headless economy soak. Runs a league for N seasons and writes one JSON row
 * per program per season, plus a per-week reconciliation of every budget
 * movement against the events that claim to explain it.
 *
 * Usage:
 *   node run.mjs --seed qa-c3-econ-a --seasons 20 --programs 24 --out a.json
 *   node run.mjs --seed qa-c3-econ-72 --seasons 5 --programs 72 --out w.json
 *
 * Optional:
 *   --reserve-multiplier 3   scale every program's opening balance (failure 3)
 *   --checkpoint-every 1     write partial results after each season
 */
import { writeFileSync } from "node:fs";
import * as sim from "../../../packages/simulation/dist/index.js";
import * as ai from "../../../packages/ai/dist/index.js";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const SEED = arg("seed", "qa-c3-econ-a");
const SEASONS = Number(arg("seasons", "5"));
const PROGRAMS = Number(arg("programs", "24"));
const OUT = arg("out", `${SEED}.json`);
const RESERVE_MULT = Number(arg("reserve-multiplier", "1"));
const CHECKPOINT = Number(arg("checkpoint-every", "1"));

const {
  createFictionalLeague, beginSeason, advanceWeek, advanceOffseasonStep,
  operatingCost, mediaRights, stadiumCapacity, committedNilTotal, reservedNilTotal
} = sim;

/**
 * Budget movers, keyed by event type. Two levels deliberately:
 *
 *  - `strict` uses only numeric fields the event itself carries. Anything left
 *    over is a budget movement the event log does not state.
 *  - `lenient` additionally joins BOOSTER_RESOLVED back to the BOOSTER_OFFERED
 *    option (the cheque is on the offer, not the resolution) and applies the
 *    engine's hard-coded postseason constants. What survives *that* is a
 *    movement nothing in the log can account for at all.
 */
const DIVISION_TITLE_CASH = 350_000;
const PLAYOFF_BERTH_CASH = 750_000;
const RUNNER_UP_CASH = 2_000_000;

function strictDeltas(event) {
  switch (event.type) {
    case "WEEKLY_FINANCES": return [[event.programId, event.net, "finances"]];
    case "FACILITY_UPGRADED": return [[event.programId, -event.cost, "facility"]];
    case "MARQUEE_GAME_SCHEDULED": return [[event.programId, -event.guarantee, "marquee"]];
    case "STAFF_REPLACED":
      return [[event.programId, -((event.signingCost ?? 0) + (event.buyoutCost ?? 0)), "staff-hire"]];
    case "NATIONAL_CHAMPION_CROWNED":
      return [[event.championProgramId, event.revenueGain ?? 0, "champion"]];
    default: return [];
  }
}

function snapshot(program) {
  return {
    budget: program.budget,
    scholarshipLimit: program.scholarshipLimit,
    facilities: { ...program.facilities },
    tier: program.tier,
    prestige: program.prestige,
    nationalPress: program.nationalPress,
    championships: program.championships,
    fanBase: program.fanBase
  };
}

const state0 = createFictionalLeague(SEED, PROGRAMS);
if (RESERVE_MULT !== 1) {
  for (const p of Object.values(state0.programs)) p.budget = Math.round(p.budget * RESERVE_MULT);
}

let state = state0;
const rows = [];            // one per program per season
const reconciliation = [];  // unexplained budget movements
const postedChecks = [];    // posted-vs-charged samples
let postedMismatches = 0;
let postedChecked = 0;
const timing = [];

// Season accumulators, reset each season.
let acc = new Map();
const zeroAcc = () => ({
  revenue: 0, mediaRevenue: 0, gateRevenue: 0, sponsorshipRevenue: 0,
  expenses: 0, squadCost: 0, facilitiesCost: 0, stadiumCost: 0,
  operationsCost: 0, staffPayroll: 0, advertisingSpend: 0, nilSpend: 0,
  net: 0, weeks: 0,
  facilitySpend: 0, marqueeSpend: 0, boosterCash: 0, staffHireSpend: 0,
  recruitSearchSpend: 0, recruitEvalSpend: 0, bonusCash: 0,
  minBudget: Infinity, weeksNegative: 0
});
function accFor(id) {
  let a = acc.get(id);
  if (!a) { a = zeroAcc(); acc.set(id, a); }
  return a;
}

let seasonOpening = new Map();

function recordSeason(season) {
  // `program.wins/losses` reset at rollover, so the finished season's record
  // comes from the SeasonHistory the rollover just wrote.
  const history = state.seasonHistory.find((entry) => entry.season === season);
  for (const program of Object.values(state.programs)) {
    const a = accFor(program.id);
    const record = history?.finalRecords?.[program.id];
    rows.push({
      seed: SEED, season, programId: program.id, tier: program.tier,
      name: program.name, character: program.character ?? null,
      wins: record?.wins ?? null, losses: record?.losses ?? null,
      finalRank: record?.nationalRank ?? null,
      budget: program.budget,
      budgetStart: seasonOpening.get(program.id) ?? null,
      fanBase: program.fanBase, prestige: program.prestige,
      nationalPress: program.nationalPress, championships: program.championships,
      ticketPrice: program.ticketPrice,
      facilities: { ...program.facilities },
      committedNil: committedNilTotal(state, program.id),
      reservedNil: reservedNilTotal(state, program.id),
      ...a
    });
  }
  acc = new Map();
  seasonOpening = budgetsOf(state);
}

function budgetsOf(st) {
  const m = new Map();
  for (const p of Object.values(st.programs)) m.set(p.id, p.budget);
  return m;
}

/** Offer options seen so far, so a resolution can be priced. programId -> optionId -> option. */
const offersSeen = new Map();

function processStep(before, after, events, season, week, phase) {
  // Reconcile every budget movement against the events that explain it.
  const explained = new Map();   // strict: numeric fields on the event
  const lenient = new Map();     // strict + offer join + engine constants
  const bump = (map, id, delta) => map.set(id, (map.get(id) ?? 0) + delta);
  for (const event of events) {
    for (const [id, delta, source] of strictDeltas(event)) {
      bump(explained, id, delta);
      bump(lenient, id, delta);
      const a = accFor(id);
      if (source === "facility") a.facilitySpend += -delta;
      if (source === "marquee") a.marqueeSpend += -delta;
      if (source === "staff-hire") a.staffHireSpend += -delta;
      if (source === "champion") a.bonusCash += delta;
    }
    if (event.type === "BOOSTER_OFFERED") {
      const map = offersSeen.get(event.programId) ?? new Map();
      for (const option of event.options) map.set(option.id, option);
      offersSeen.set(event.programId, map);
    }
    if (event.type === "BOOSTER_RESOLVED" && event.succeeded && event.kind === "DONOR") {
      const option = offersSeen.get(event.programId)?.get(event.optionId);
      const amount = option?.amount ?? 0;
      bump(lenient, event.programId, amount);
      accFor(event.programId).boosterCash += amount;
    }
    if (event.type === "DIVISION_TITLE_WON") {
      bump(lenient, event.programId, DIVISION_TITLE_CASH);
      accFor(event.programId).bonusCash += DIVISION_TITLE_CASH;
    }
    if (event.type === "NATIONAL_CHAMPION_CROWNED") {
      bump(lenient, event.runnerUpProgramId, RUNNER_UP_CASH);
      accFor(event.runnerUpProgramId).bonusCash += RUNNER_UP_CASH;
      // Playoff berths: 12 seeds each take $750K, and no event says so.
      const history = after.seasonHistory.find((entry) => entry.season === event.season);
      for (const seed of history?.playoffSeeds ?? []) {
        bump(lenient, seed.programId, PLAYOFF_BERTH_CASH);
        accFor(seed.programId).bonusCash += PLAYOFF_BERTH_CASH;
      }
    }
    if (event.type === "WEEKLY_FINANCES") {
      const a = accFor(event.programId);
      for (const k of ["revenue", "mediaRevenue", "gateRevenue", "sponsorshipRevenue", "expenses",
        "squadCost", "facilitiesCost", "stadiumCost", "operationsCost", "staffPayroll",
        "advertisingSpend", "nilSpend", "net"]) {
        a[k] += event[k] ?? 0;
      }
      a.weeks += 1;
    }
    if (event.type === "RECRUITING_SEARCH_RUN" || event.type === "PROSPECT_EVALUATED") {
      // points, not money — tracked separately if the fields exist
      const a = accFor(event.programId);
      if (typeof event.cost === "number") a.recruitSearchSpend += event.cost;
    }
  }
  for (const [id, budgetAfter] of budgetsOf(after)) {
    const delta = budgetAfter - (before.get(id) ?? 0);
    const claimed = explained.get(id) ?? 0;
    const claimedLenient = lenient.get(id) ?? 0;
    if (Math.abs(delta - claimed) > 0.5) {
      const kinds = events.filter((e) => (e.programId === id || e.runnerUpProgramId === id || e.championProgramId === id))
        .map((e) => e.type);
      reconciliation.push({
        season, week, phase, programId: id,
        delta, claimed, unexplained: delta - claimed,
        unexplainedLenient: delta - claimedLenient,
        eventKinds: [...new Set(kinds)]
      });
    }
    const a = accFor(id);
    a.minBudget = Math.min(a.minBudget, budgetAfter);
    if (budgetAfter < 0) a.weeksNegative += 1;
  }
}

/**
 * Posted versus charged. Recompute operatingCost / mediaRights from the state
 * the engine held at the finance step and compare to the event, exactly.
 */
function checkPosted(after, events, season, week) {
  for (const event of events) {
    if (event.type !== "WEEKLY_FINANCES") continue;
    const program = after.programs[event.programId];
    if (!program) continue;
    const capacity = stadiumCapacity(program.facilities.STADIUM);
    const oc = operatingCost(program, capacity, event.revenue);
    const mr = mediaRights(program);
    const problems = [];
    if (oc.squad !== event.squadCost) problems.push(["squad", oc.squad, event.squadCost]);
    if (oc.facilities !== event.facilitiesCost) problems.push(["facilities", oc.facilities, event.facilitiesCost]);
    if (oc.stadium !== event.stadiumCost) problems.push(["stadium", oc.stadium, event.stadiumCost]);
    if (oc.operations !== event.operationsCost) problems.push(["operations", oc.operations, event.operationsCost]);
    if (mr.total !== event.mediaRevenue) problems.push(["media", mr.total, event.mediaRevenue]);
    const sumExpenses = event.squadCost + event.facilitiesCost + event.stadiumCost
      + event.operationsCost + event.staffPayroll + event.advertisingSpend + event.nilSpend;
    if (sumExpenses !== event.expenses) problems.push(["expenses-sum", sumExpenses, event.expenses]);
    const sumRevenue = event.mediaRevenue + event.gateRevenue + event.sponsorshipRevenue;
    if (sumRevenue !== event.revenue) problems.push(["revenue-sum", sumRevenue, event.revenue]);
    if (event.net !== event.revenue - event.expenses) problems.push(["net", event.revenue - event.expenses, event.net]);
    postedChecked += 1;
    if (problems.length) {
      postedMismatches += 1;
      if (postedChecks.length < 400) {
        postedChecks.push({ season, week, programId: event.programId, tier: program.tier, problems });
      }
    }
  }
}

function flush(partial) {
  writeFileSync(OUT, JSON.stringify({
    seed: SEED, seasons: SEASONS, programs: PROGRAMS, reserveMultiplier: RESERVE_MULT,
    partial: Boolean(partial), rows, reconciliation, postedChecks,
    postedChecked, postedMismatches, timing
  }));
}

seasonOpening = budgetsOf(state);
let seasonsDone = 0;
let guard = 0;
const t0 = Date.now();
let seasonStart = t0;

while (seasonsDone < SEASONS && guard++ < 20_000) {
  const before = budgetsOf(state);
  const phase = state.phase;
  const week = state.week;
  const season = state.season;
  let events = [];
  if (phase === "ROSTER_REVIEW") {
    state = beginSeason(state);
  } else {
    const commands = phase === "OFFSEASON" ? ai.planOffseasonCommands(state) : ai.planWeeklyCommands(state);
    const result = phase === "OFFSEASON"
      ? advanceOffseasonStep(state, commands)
      : advanceWeek(state, commands);
    state = result.state ?? result;
    events = result.events ?? [];
  }
  processStep(before, state, events, season, week, phase);
  // Season finalisation runs inside the week-14 step and moves prestige and
  // press through awards, division titles and the playoff, so the post-step
  // state is not what the finance step saw that week. Every other week it is:
  // finances run after commands and after the recap's own press/fan changes,
  // and nothing later in the pipeline touches an input to either function.
  if (phase === "REGULAR_SEASON" && week < 14) checkPosted(state, events, season, week);

  if (state.season !== season) {
    // The rollover happened inside that step; the season just finished is `season`.
    recordSeason(season);
    seasonsDone += 1;
    const now = Date.now();
    timing.push({ season, ms: now - seasonStart });
    seasonStart = now;
    console.error(`[${SEED}] season ${season} done in ${((now - t0) / 1000).toFixed(1)}s (+${(timing.at(-1).ms / 1000).toFixed(1)}s)`);
    if (CHECKPOINT && seasonsDone % CHECKPOINT === 0) flush(true);
  }
}

flush(false);
console.error(`[${SEED}] complete: ${seasonsDone} seasons, ${rows.length} rows, `
  + `${reconciliation.length} unexplained movements, ${postedMismatches}/${postedChecked} posted mismatches, `
  + `${((Date.now() - t0) / 1000).toFixed(1)}s total`);
