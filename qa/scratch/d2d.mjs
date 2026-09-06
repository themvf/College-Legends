/**
 * D2(d) — the card a player reads while filling an EMPTY slot.
 *
 * `weekPriorities` projects "make it a priority" as
 *   planWeekHours(chosen.slice(0, chosen.length - 1) + [focus])
 * — it always drops the last standing priority. That is right when every slot is
 * full. When a slot is free — which the dashboard raises as a REQUIRED item,
 * "Your staff has 1 priority nobody has claimed" — the week the player actually
 * gets is chosen + [focus], not chosen-minus-one + [focus].
 *
 * Method: put every program one slot under its capacity, read all five cards,
 * then for each card advance the week with chosen + [card] and read
 * WEEK_FOCUS_PAYOFF. Posted against delivered.
 */
import { writeFileSync } from "node:fs";
import { league, sim, ai } from "./lib.mjs";

const SEEDS = (process.argv[2] ?? "qa-c3-slot-1,qa-c3-slot-2,qa-c3-slot-3,qa-c3-slot-4").split(",");
const SIZE = Number(process.argv[3] ?? 72);
const AT_WEEK = Number(process.argv[4] ?? 7);
const CARDS = ["INSTALL_OFFENSE", "INSTALL_DEFENSE", "SCOUT", "DEVELOP", "RECRUIT"];
const num = (s) => { const m = String(s).match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };

const rows = [];
for (const seed of SEEDS) {
  let state = sim.beginSeason(league(seed, SIZE));
  while (state.phase === "REGULAR_SEASON" && state.week < AT_WEEK) {
    state = sim.advanceWeek(state, ai.planWeeklyCommands(state)).state;
  }
  // One slot deliberately free.
  const partial = {};
  for (const programId of Object.keys(state.programs)) {
    const cap = sim.focusCapacity(state, programId).capacity;
    partial[programId] = sim.defaultFocuses(state, programId).slice(0, Math.max(0, cap - 1));
  }
  const under = sim.prepareWeek(state, Object.entries(partial).map(([programId, focuses]) => ({
    type: "SET_WEEK_FOCUS", programId, focuses
  }))).state;

  const posted = {};
  for (const programId of Object.keys(state.programs)) {
    const cards = sim.weekPriorities(under, programId);
    posted[programId] = Object.fromEntries(cards.map((c) => [c.focus, { focused: c.focused, num: num(c.focused) }]));
  }

  for (const card of CARDS) {
    const added = sim.prepareWeek(state, Object.entries(partial).map(([programId, focuses]) => ({
      type: "SET_WEEK_FOCUS", programId, focuses: focuses.includes(card) ? focuses : [...focuses, card]
    }))).state;
    const result = sim.advanceWeek(added, []);
    const payoffs = {};
    for (const e of result.events) if (e.type === "WEEK_FOCUS_PAYOFF") payoffs[e.programId] = e;
    for (const programId of Object.keys(state.programs)) {
      const cap = sim.focusCapacity(state, programId).capacity;
      if (cap < 2) continue;                       // capacity 1 has no "free slot" case
      if (partial[programId].includes(card)) continue; // already chosen
      const ev = payoffs[programId];
      if (!ev) continue;
      rows.push({
        seed, week: AT_WEEK, programId, tier: state.programs[programId].tier, capacity: cap,
        standing: partial[programId], card,
        posted: posted[programId][card]?.focused ?? null,
        postedNum: posted[programId][card]?.num ?? null,
        evOffense: ev.offensiveExecution, evDefense: ev.defensiveExecution,
        evReadiness: ev.scoutingReadiness, evRecruit: ev.recruitingPointsAdded,
        evScouted: ev.scoutedOpponentId,
        target: sim.scoutingTargetFor(added, programId)
      });
    }
  }
  process.stderr.write(`${seed} done\n`);
}

writeFileSync(new URL("./d2d-rows.json", import.meta.url), JSON.stringify(rows));

const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const f = (x, d = 2) => x === null ? "-" : Number(x).toFixed(d);
const pick = {
  INSTALL_OFFENSE: (r) => [r.postedNum, r.evOffense * 100, 0.5],
  INSTALL_DEFENSE: (r) => [r.postedNum, r.evDefense * 100, 0.5],
  SCOUT: (r) => [r.postedNum, r.evReadiness, 0.05],
  RECRUIT: (r) => [r.postedNum, r.evRecruit, 0.5]
};
console.log(`rows ${rows.length}`);
console.log("| card | n | mean posted | mean delivered | mean gap | max abs gap | outside tol |");
console.log("|---|---|---|---|---|---|---|");
for (const card of Object.keys(pick)) {
  const rs = rows.filter((r) => r.card === card && !(card === "SCOUT" && r.target !== r.evScouted));
  if (!rs.length) continue;
  const pairs = rs.map(pick[card]);
  const diffs = pairs.map(([p, d]) => d - p);
  console.log(`| ${card} | ${rs.length} | ${f(mean(pairs.map(p => p[0])))} | ${f(mean(pairs.map(p => p[1])))} | ${f(mean(diffs))} | ${f(Math.max(...diffs.map(Math.abs)))} | ${diffs.filter((x, i) => Math.abs(x) > pairs[i][2]).length} |`);
}
