/**
 * Brief B §1, second half — "program iteration order must never decide a winner".
 *
 * Command permutation cannot test this: the engine canonically sorts commands
 * (`commandArbitrationKey`), so a permuted list is the same list. What is *not*
 * sorted is `Object.keys(state.programs)`, which resolveRecruitingMarket walks
 * to build the contender set, and `Object.keys(state.recruiting)` / `state.nil`.
 *
 * CONSTRUCTED: the program map is rebuilt with reversed key-insertion order.
 * Nothing else changes. A JSON round-trip preserves insertion order, so this is
 * a reachable shape only if some load path re-keys; treat it as a probe of the
 * invariant as written rather than as a reachable state.
 */
import { advanceWeek, beginSeason } from "../../../packages/simulation/dist/index.js";
import { hash, league, nilFingerprint, planWeek, prospectFingerprint, recruitingFingerprint, step } from "./lib.mjs";

const reKey = (record, order) => {
  const next = {};
  for (const key of order) if (key in record) next[key] = record[key];
  for (const key of Object.keys(record)) if (!(key in next)) next[key] = record[key];
  return next;
};

for (const seed of ["qa-c3-market-1", "qa-c3-market-2", "qa-c3-market-3"]) {
  let state = beginSeason(league(seed, 72));
  for (let week = 1; week < 6; week += 1) state = step(state).state;

  const commands = planWeek(state);
  const forward = Object.keys(state.programs);
  const reversed = [...forward].reverse();

  const variants = {
    natural: state,
    reversedPrograms: {
      ...state,
      programs: reKey(state.programs, reversed),
      recruiting: reKey(state.recruiting, reversed),
      nil: reKey(state.nil ?? {}, reversed)
    },
    sortedPrograms: {
      ...state,
      programs: reKey(state.programs, [...forward].sort()),
      recruiting: reKey(state.recruiting, [...forward].sort()),
      nil: reKey(state.nil ?? {}, [...forward].sort())
    }
  };

  console.log(`\n=== seed ${seed} · week ${state.week} ===`);
  const rows = {};
  for (const [name, variant] of Object.entries(variants)) {
    const { state: next } = advanceWeek(variant, commands);
    rows[name] = {
      prospects: hash(prospectFingerprint(next)),
      nil: hash(nilFingerprint(next)),
      recruiting: hash(recruitingFingerprint(next)),
      raw: prospectFingerprint(next)
    };
    console.log(`${name.padEnd(18)} prospects=${rows[name].prospects} nil=${rows[name].nil} recruiting=${rows[name].recruiting}`);
  }
  const base = rows.natural.raw.split("\n");
  for (const [name, row] of Object.entries(rows)) {
    if (name === "natural") continue;
    const other = row.raw.split("\n");
    const diffs = [];
    for (let i = 0; i < base.length; i += 1) if (base[i] !== other[i]) diffs.push([base[i], other[i]]);
    if (diffs.length) {
      console.log(`  ${name}: ${diffs.length} prospect rows differ. First 8:`);
      for (const d of diffs.slice(0, 8)) console.log(`    natural : ${d[0]}\n    ${name.padEnd(8)}: ${d[1]}`);
    }
  }
}
