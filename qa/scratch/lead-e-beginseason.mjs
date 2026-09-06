/**
 * qa-lead triage: does beginSeason refuse commands that game-rules.md §1 lists
 * as legal in ROSTER_REVIEW, and does prepareWeek accept the same commands in
 * the same phase? E reported this for REPLACE_STAFF only.
 */
import { league, sim } from "./lib.mjs";

const state = league("lead-e-phase", 24);
const pid = "program-3";
const program = state.programs[pid];

const market = sim.staffCandidatesFor
  ? sim.staffCandidatesFor(state, pid, "OFFENSIVE_COORDINATOR")
  : null;
const candidate = market?.[0];

const probes = [
  ["REPLACE_STAFF", candidate ? { type: "REPLACE_STAFF", programId: pid, role: "OFFENSIVE_COORDINATOR", candidateId: candidate.id } : null],
  ["SET_SCHEME", { type: "SET_SCHEME", programId: pid, offense: "POWER_RUN", defense: "NICKEL_PRESSURE" }],
  ["SET_WEEK_FOCUS", { type: "SET_WEEK_FOCUS", programId: pid, focuses: ["INSTALL_OFFENSE"] }],
  ["SET_DEPTH_CHART(control, allowed)", { type: "SET_DEPTH_CHART", programId: pid, position: "QB", playerIds: [] }]
];

console.log(`phase=${state.phase}  program=${program.name}\n`);
for (const [label, command] of probes) {
  if (!command) { console.log(`${label.padEnd(34)} SKIPPED (no candidate)`); continue; }

  const afterBegin = sim.beginSeason(state, [command]);
  const beginRej = afterBegin.eventHistory.filter((e) => e.type === "COMMAND_REJECTED" && e.command?.type === command.type);

  let prepStatus = "n/a";
  try {
    const prep = sim.prepareWeek(state, [command]);
    const events = prep.events ?? prep.state?.eventHistory ?? [];
    const rej = events.filter((e) => e.type === "COMMAND_REJECTED" && e.command?.type === command.type);
    prepStatus = rej.length ? `REJECTED "${rej[0].reason}"` : "ACCEPTED";
  } catch (error) {
    prepStatus = `THREW ${error.message}`;
  }

  console.log(`${label.padEnd(34)} beginSeason: ${beginRej.length ? `REJECTED "${beginRej[0].reason}"` : "accepted"}`);
  console.log(`${"".padEnd(34)} prepareWeek: ${prepStatus}\n`);
}
