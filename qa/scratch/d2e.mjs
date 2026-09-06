/**
 * D2(e) — the card a player reads while every slot is FULL, which is the normal
 * case (D2's briefing count: slots full in 92.3% of program-weeks).
 *
 * `weekPriorities` projects "make it a priority" as
 *     planWeekHours(chosen.slice(0, chosen.length - 1) + [focus])      priorities.ts:421
 * The button the player presses does
 *     [...chosen, focus].slice(-capacity)                              App.tsx:2488
 * Those are the same length but not the same set: the card drops the LAST
 * standing priority, the button drops the FIRST.
 *
 * Two delivery arms off one posted number:
 *   armUI    what the button actually produces
 *   armCard  what the card's own projection assumed
 * If posted matches armCard and not armUI, the number on the screen is a
 * projection of a week the screen cannot produce.
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
  // Every program at exactly capacity, using its own standing choices where it
  // has them and the engine's defaults where it does not.
  const chosen = {};
  for (const programId of Object.keys(state.programs)) {
    const cap = sim.focusCapacity(state, programId).capacity;
    const have = sim.activeFocuses(state, programId);
    const fill = [...have];
    for (const f of sim.defaultFocuses(state, programId)) if (fill.length < cap && !fill.includes(f)) fill.push(f);
    for (const f of CARDS) if (fill.length < cap && !fill.includes(f)) fill.push(f);
    chosen[programId] = fill.slice(0, cap);
  }
  const setTo = (pick) => sim.prepareWeek(state, Object.entries(chosen).map(([programId, c]) => ({
    type: "SET_WEEK_FOCUS", programId, focuses: pick(programId, c)
  }))).state;

  const base = setTo((_, c) => c);
  const posted = {};
  for (const programId of Object.keys(state.programs)) {
    posted[programId] = Object.fromEntries(sim.weekPriorities(base, programId)
      .map((c) => [c.focus, { focused: c.focused, num: num(c.focused), blocked: c.blocked }]));
  }

  for (const card of CARDS) {
    const cap = (programId) => sim.focusCapacity(state, programId).capacity;
    const armUIState = setTo((programId, c) => c.includes(card) ? c : [...c, card].slice(-cap(programId)));
    const armCardState = setTo((programId, c) => c.includes(card) ? c : [...c.slice(0, Math.max(0, c.length - 1)), card]);
    const run = (s) => {
      const r = sim.advanceWeek(s, []);
      const m = {};
      for (const e of r.events) if (e.type === "WEEK_FOCUS_PAYOFF") m[e.programId] = e;
      return m;
    };
    const ui = run(armUIState), cd = run(armCardState);
    for (const programId of Object.keys(state.programs)) {
      if (chosen[programId].includes(card)) continue;
      if (chosen[programId].length < cap(programId)) continue;  // full slots only
      if (!ui[programId] || !cd[programId]) continue;
      rows.push({
        seed, week: AT_WEEK, programId, tier: state.programs[programId].tier,
        capacity: cap(programId), standing: chosen[programId], card,
        posted: posted[programId][card]?.focused ?? null,
        postedNum: posted[programId][card]?.num ?? null,
        blocked: posted[programId][card]?.blocked ?? null,
        uiOff: ui[programId].offensiveExecution, uiDef: ui[programId].defensiveExecution,
        uiRead: ui[programId].scoutingReadiness, uiRec: ui[programId].recruitingPointsAdded,
        uiScouted: ui[programId].scoutedOpponentId,
        cdOff: cd[programId].offensiveExecution, cdDef: cd[programId].defensiveExecution,
        cdRead: cd[programId].scoutingReadiness, cdRec: cd[programId].recruitingPointsAdded,
        cdScouted: cd[programId].scoutedOpponentId,
        target: sim.scoutingTargetFor(base, programId)
      });
    }
  }
  process.stderr.write(`${seed} done\n`);
}

writeFileSync(new URL("./d2e-rows.json", import.meta.url), JSON.stringify(rows));

const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const f = (x, d = 2) => x === null || x === undefined ? "-" : Number(x).toFixed(d);
const pick = {
  INSTALL_OFFENSE: (r) => [r.postedNum, r.uiOff * 100, r.cdOff * 100, 0.5],
  INSTALL_DEFENSE: (r) => [r.postedNum, r.uiDef * 100, r.cdDef * 100, 0.5],
  SCOUT: (r) => [r.postedNum, r.uiRead, r.cdRead, 0.05],
  RECRUIT: (r) => [r.postedNum, r.uiRec, r.cdRec, 0.5]
};
console.log(`rows ${rows.length}`);
console.log("| card | n | posted | delivered (button) | gap | outside tol | delivered (card's own plan) | gap | outside tol |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const card of Object.keys(pick)) {
  const rs = rows.filter((r) => r.card === card && !(card === "SCOUT" && (r.target !== r.uiScouted || r.target !== r.cdScouted)));
  if (!rs.length) continue;
  const p = rs.map(pick[card]);
  const du = p.map(([a, b]) => b - a), dc = p.map(([a, , c]) => c - a);
  console.log(`| ${card} | ${rs.length} | ${f(mean(p.map(x => x[0])))} | ${f(mean(p.map(x => x[1])))} | ${f(mean(du))} | ${du.filter((x, i) => Math.abs(x) > p[i][3]).length} | ${f(mean(p.map(x => x[2])))} | ${f(mean(dc))} | ${dc.filter((x, i) => Math.abs(x) > p[i][3]).length} |`);
}
console.log("\nby tier/capacity, button arm:");
for (const card of Object.keys(pick)) {
  for (const tier of ["LOW", "MID", "POWER"]) {
    const rs = rows.filter((r) => r.card === card && r.tier === tier && !(card === "SCOUT" && (r.target !== r.uiScouted || r.target !== r.cdScouted)));
    if (!rs.length) continue;
    const p = rs.map(pick[card]);
    console.log(`  ${card} ${tier}: n=${rs.length} posted ${f(mean(p.map(x => x[0])))} button ${f(mean(p.map(x => x[1])))} gap ${f(mean(p.map(([a, b]) => b - a)))}`);
  }
}
