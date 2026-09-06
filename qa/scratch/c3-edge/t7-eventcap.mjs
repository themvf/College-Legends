/**
 * Brief B §5 / charter — the 10,000-entry eventHistory cap. Play long enough to
 * exceed it and confirm the overshoot is bounded rather than growing.
 *
 * `retainedDecisionEventHistory` keeps the last 10,000 PLUS every event pinned
 * by a retained decision audit, so a length above 10,000 is by construction.
 * The question is whether the pinned set is bounded. Commands only.
 */
import { readFileSync } from "node:fs";
import { beginSeason } from "../../../packages/simulation/dist/index.js";
import { step } from "./lib.mjs";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const seed = process.argv[2] ?? "qa-c3-market-1";
const seasons = Number(process.argv[3] ?? 3);
let state = JSON.parse(readFileSync(`${snapDir}${seed}.s2-w1.json`, "utf8"));

const row = (label) => {
  const n = state.eventHistory.length;
  const audits = state.decisionAudits?.length ?? 0;
  const pinned = Math.max(0, n - 10_000);
  console.log(`${label.padEnd(30)} events=${String(n).padStart(6)} over10k=${String(pinned).padStart(5)} audits=${audits} stats=${Object.keys(state.playerGameStats ?? {}).length} seasonLines=${(state.playerSeasonStats ?? []).length}`);
};

row(`start s${state.season} w${state.week}`);
const targetSeason = state.season + seasons;
while (state.season < targetSeason) {
  state = step(state).state;
  if (state.phase === "REGULAR_SEASON") row(`s${state.season} w${state.week}`);
  else if (state.phase === "OFFSEASON") row(`s${state.season} off:${state.offseasonStep}`);
  else row(`s${state.season} ${state.phase}`);
}
row("final");

// Is anything that matters lost? Every audit's pinned causes must still resolve.
const ids = new Set(state.eventHistory.map((e) => e.decisionCauseId).filter(Boolean));
const audits = state.decisionAudits ?? [];
const dangling = audits.flatMap((a) => a.causes.map((c) => c.id)).filter((id) => !ids.has(id));
console.log(`\naudits=${audits.length} pinned cause ids missing from eventHistory: ${dangling.length}`);
const types = {};
for (const e of state.eventHistory) types[e.type] = (types[e.type] ?? 0) + 1;
console.log(`distinct event types retained: ${Object.keys(types).length}`);
console.log(`oldest retained event: season=${state.eventHistory[0]?.season} week=${state.eventHistory[0]?.week} type=${state.eventHistory[0]?.type}`);
