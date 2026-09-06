import { league, step, sim, ai } from "./lib.mjs";

const t0 = Date.now();
let state = league("qa-c3-odds-1", 72);
state = step(state); // ROSTER_REVIEW -> season
console.log("phase", state.phase, "week", state.week, "prospects", Object.keys(state.prospects).length, `${Date.now() - t0}ms`);

for (let w = 0; w < 3; w += 1) {
  const t = Date.now();
  const index = sim.recruitingOddsIndex(state);
  let sign = 0, hold = 0, notPursuing = 0;
  const progs = Object.keys(state.programs);
  for (const p of Object.values(state.prospects)) {
    if (p.status === "SIGNED" || p.status === "WITHDRAWN") continue;
    for (const g of progs) {
      const o = sim.prospectOdds(state, g, p.id, index);
      if (!o) continue;
      if (o.outcome === "SIGN") sign += 1;
      else if (o.outcome === "HOLD") hold += 1;
      else notPursuing += 1;
    }
  }
  console.log(`week ${state.week}: SIGN=${sign} HOLD=${hold} NOT=${notPursuing} oddsTime=${Date.now() - t}ms`);
  const t2 = Date.now();
  state = step(state);
  console.log(`  advance ${Date.now() - t2}ms -> week ${state.week} phase ${state.phase}`);
}
