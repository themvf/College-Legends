import { readFileSync } from "node:fs";
const marginal = JSON.parse(readFileSync(new URL("./d2-marginal.json", import.meta.url)));
const delivered = JSON.parse(readFileSync(new URL("./d2-delivered.json", import.meta.url)));
const briefing = JSON.parse(readFileSync(new URL("./d2-briefing.json", import.meta.url)));

const CARDS = ["INSTALL_OFFENSE", "INSTALL_DEFENSE", "SCOUT", "DEVELOP", "RECRUIT"];
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const f = (x, d = 2) => x === null || x === undefined ? "-" : Number(x).toFixed(d);

console.log(`marginal rows ${marginal.length} · delivered rows ${delivered.length} · briefing rows ${briefing.length}`);
console.log(`seeds ${[...new Set(marginal.map(r => r.seed))].join(", ")}`);

/* ---------------- (a) marginal value of one slot ---------------- */
console.log("\n## D2(a) Marginal value of the first slot, by card");
console.log("Units differ by card: install = points of execution (0-100); scout = readiness;");
console.log("develop = percentage points of roster growth rate; recruit = recruiting points.\n");
console.log("| tier | capacity | week | n | " + CARDS.map(c => c.replace("INSTALL_", "INST_")).join(" | ") + " |");
console.log("|---|---|---|---|" + CARDS.map(() => "---").join("|") + "|");
const keys = new Map();
for (const r of marginal) {
  const k = `${r.tier}|${r.capacity}|${r.week}`;
  (keys.get(k) ?? keys.set(k, []).get(k)).push(r);
}
const ordTier = { LOW: 0, MID: 1, POWER: 2 };
for (const k of [...keys.keys()].sort((a, b) => {
  const [ta, ca, wa] = a.split("|"); const [tb, cb, wb] = b.split("|");
  return ordTier[ta] - ordTier[tb] || +ca - +cb || +wa - +wb;
})) {
  const rs = keys.get(k);
  const cells = CARDS.map((c) => {
    const d = rs.map((r) => {
      const cc = r.cards[c];
      if (!cc) return null;
      const b = cc.baseNum ?? 0, ff = cc.focusNum ?? 0;
      return ff - b;
    }).filter((x) => x !== null);
    return f(mean(d));
  });
  console.log(`| ${k.split("|").join(" | ")} | ${rs.length} | ${cells.join(" | ")} |`);
}

console.log("\n### Pooled across everything, per card (absolute levels and delta)");
console.log("| card | n | leave alone | priority | delta | delta sd |");
console.log("|---|---|---|---|---|---|");
for (const c of CARDS) {
  const rows = marginal.map((r) => r.cards[c]).filter(Boolean);
  const b = rows.map((r) => r.baseNum ?? 0), ff = rows.map((r) => r.focusNum ?? 0);
  const d = rows.map((r, i) => ff[i] - b[i]);
  const m = mean(d);
  const sd = Math.sqrt(mean(d.map((x) => (x - m) ** 2)));
  console.log(`| ${c} | ${rows.length} | ${f(mean(b))} | ${f(mean(ff))} | ${f(m)} | ${f(sd)} |`);
}

console.log("\n### Stakes posted per card (the `matters N/100` badge)");
console.log("| card | mean stakes | median | %>=65 | % blocked |");
console.log("|---|---|---|---|---|");
for (const c of CARDS) {
  const rows = marginal.map((r) => r.cards[c]).filter(Boolean);
  const st = rows.map((r) => r.stakes).sort((a, b) => a - b);
  console.log(`| ${c} | ${f(mean(st), 1)} | ${st[Math.floor(st.length / 2)]} | ${f(100 * rows.filter(r => r.stakes >= 65).length / rows.length, 1)} | ${f(100 * rows.filter(r => r.blocked).length / rows.length, 1)} |`);
}

/* ---------------- (b) posted vs delivered ---------------- */
console.log("\n## D2(b) Posted versus delivered, all five cards");
const rowsFor = (c) => delivered.filter((r) => r.card === c);

function compare(name, rows, postedOf, deliveredOf, tol) {
  const pairs = rows.map((r) => [postedOf(r), deliveredOf(r)]).filter(([p, d]) => p !== null && d !== null && !Number.isNaN(p) && !Number.isNaN(d));
  const diffs = pairs.map(([p, d]) => d - p);
  const bad = diffs.filter((x) => Math.abs(x) > tol).length;
  const m = mean(diffs);
  console.log(`\n**${name}** — n=${pairs.length}`);
  console.log(`  mean posted ${f(mean(pairs.map(p => p[0])))} · mean delivered ${f(mean(pairs.map(p => p[1])))} · mean gap ${f(m)} · max |gap| ${f(Math.max(...diffs.map(Math.abs)))} · outside ±${tol}: ${bad} (${f(100 * bad / pairs.length, 1)}%)`);
  return { n: pairs.length, mean: m, bad };
}

compare("INSTALL_OFFENSE: card % vs WEEK_FOCUS_PAYOFF.offensiveExecution",
  rowsFor("INSTALL_OFFENSE"), (r) => r.postedNum, (r) => r.evOffense === null ? null : r.evOffense * 100, 0.5);
compare("INSTALL_DEFENSE: card % vs WEEK_FOCUS_PAYOFF.defensiveExecution",
  rowsFor("INSTALL_DEFENSE"), (r) => r.postedNum, (r) => r.evDefense === null ? null : r.evDefense * 100, 0.5);

const scoutAligned = rowsFor("SCOUT").filter((r) => r.target && r.evScouted && r.target === r.evScouted);
const scoutMis = rowsFor("SCOUT").filter((r) => r.evScouted && r.target && r.target !== r.evScouted);
console.log(`\nSCOUT rows where the film-room target is this week's opponent: ${scoutAligned.length}; where it is not: ${scoutMis.length}; no game: ${rowsFor("SCOUT").filter(r => !r.evScouted).length}`);
compare("SCOUT: card readiness vs WEEK_FOCUS_PAYOFF.scoutingReadiness (target == this week's opponent)",
  scoutAligned, (r) => r.postedNum, (r) => r.evReadiness, 0.05);

compare("RECRUIT: card points vs WEEK_FOCUS_PAYOFF.recruitingPointsAdded",
  rowsFor("RECRUIT"), (r) => r.postedNum, (r) => r.evRecruit, 0.5);

// DEVELOP: the card names a man and claims a roster growth rate.
const dev = rowsFor("DEVELOP");
const named = dev.filter((r) => r.cardSpotlight && r.evDevPlayer);
const namedMatch = named.filter((r) => r.cardSpotlight === r.evDevPlayer).length;
console.log(`\n**DEVELOP: the man the card names vs WEEK_FOCUS_PAYOFF.developedPlayerId** — n=${named.length}, match ${namedMatch} (${f(100 * namedMatch / Math.max(1, named.length), 1)}%)`);
console.log(`  rows where the card named somebody but the event reported no developed player: ${dev.filter(r => r.cardSpotlight && !r.evDevPlayer).length}`);
const growth = dev.filter((r) => r.growthN > 0 && r.noneGrowthN > 0);
const ratios = growth.map((r) => (r.growthTotal / r.growthN) / (r.noneGrowthTotal / r.noneGrowthN));
console.log(`\n**DEVELOP: roster growth actually delivered** — n=${growth.length} programs`);
console.log(`  mean per-player Overall gain, DEVELOP arm ${f(mean(growth.map(r => r.growthTotal / r.growthN)), 4)} vs no-priority arm ${f(mean(growth.map(r => r.noneGrowthTotal / r.noneGrowthN)), 4)}`);
console.log(`  mean ratio ${f(mean(ratios), 3)}  (the card posts a roster growth percentage; see the marginal table for the posted delta)`);

/* ---------------- briefing ---------------- */
console.log("\n## The >=65 re-prompt");
for (const pop of ["AI", "STANDING"]) {
  const rs = briefing.filter((r) => r.pop === pop);
  const cond = rs.filter((r) => r.conditionMet).length;
  const shown = rs.filter((r) => r.itemShown).length;
  console.log(`${pop}: n=${rs.length} program-weeks · slots full ${f(100 * rs.filter(r => r.slotsFull).length / rs.length, 1)}% · condition met ${cond} (${f(100 * cond / rs.length, 1)}%) · item actually in the briefing ${shown} (${f(100 * shown / rs.length, 1)}%)`);
  const byCard = {};
  for (const r of rs) if (r.conditionMet) byCard[r.missedFocus] = (byCard[r.missedFocus] ?? 0) + 1;
  console.log(`  which card: ${Object.entries(byCard).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" ") || "(none)"}`);
}
