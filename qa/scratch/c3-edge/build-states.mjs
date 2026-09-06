/**
 * Runs 72-program careers and snapshots them at named checkpoints so the
 * boundary probes do not re-simulate a season each time. Deterministic: every
 * snapshot is reproducible from (seed, checkpoint).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { step, league } from "./lib.mjs";
import { beginSeason } from "../../../packages/simulation/dist/index.js";

const seed = process.argv[2] ?? "qa-c3-market-1";
const dir = new URL("./snap/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });

const save = (name, state) => {
  writeFileSync(`${dir}${seed}.${name}.json`, JSON.stringify(state));
  console.log(`${name.padEnd(22)} season=${state.season} week=${state.week} phase=${state.phase} step=${state.offseasonStep ?? "-"} t=${Date.now() - t0}ms`);
};

const t0 = Date.now();
let state = league(seed, 72);
save("s1-rosterreview", state);
state = beginSeason(state);
save("s1-w1", state);
while (state.phase === "REGULAR_SEASON" && state.week < 12) {
  state = step(state).state;
  if (state.week === 11) save("s1-w11", state);
}
// week 12 is SIGNING_WEEK territory — snapshot each of 12/13/14
while (state.phase === "REGULAR_SEASON") {
  save(`s1-w${state.week}`, state);
  state = step(state).state;
}
save("offseason-board", state);
while (state.phase === "OFFSEASON") {
  save(`offseason-${state.offseasonStep}`, state);
  state = step(state).state;
}
save("s2-rosterreview", state);
state = beginSeason(state);
save("s2-w1", state);
