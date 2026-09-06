import { readFileSync } from "node:fs";
const leagues = JSON.parse(readFileSync(new URL("./d1-rows.json", import.meta.url)));

const row = (name, games) => {
  const n = games.length;
  const one = games.filter((g) => Math.abs(g.h - g.a) <= 8).length;
  const home = games.filter((g) => g.h > g.a).length;
  const margin = games.reduce((a, g) => a + Math.abs(g.h - g.a), 0) / n;
  const shut = games.reduce((a, g) => a + (g.h === 0 ? 1 : 0) + (g.a === 0 ? 1 : 0), 0);
  const pts = games.reduce((a, g) => a + g.h + g.a, 0) / (2 * n);
  return { name, n, one: 100 * one / n, home: 100 * home / n, margin, shut: 100 * shut / (2 * n), pts };
};

const all = [];
console.log("| league | games | one-score % | home win % | avg margin | shutout % | pts/team-game |");
console.log("|---|---|---|---|---|---|---|");
for (const l of leagues) {
  const g = l.games.filter((x) => x.week <= 14);
  all.push(...g);
  const r = row(l.seed, g);
  console.log(`| ${l.seed} | ${r.n} | ${r.one.toFixed(1)} | ${r.home.toFixed(1)} | ${r.margin.toFixed(1)} | ${r.shut.toFixed(2)} | ${r.pts.toFixed(1)} |`);
}
const p = row("POOLED", all);
console.log(`| **pooled** | **${p.n}** | **${p.one.toFixed(1)}** | **${p.home.toFixed(1)}** | **${p.margin.toFixed(1)}** | **${p.shut.toFixed(2)}** | **${p.pts.toFixed(1)}** |`);

// spread
const per = leagues.map((l) => row(l.seed, l.games.filter((x) => x.week <= 14)));
for (const k of ["one", "home", "margin", "shut", "pts"]) {
  const xs = per.map((r) => r[k]);
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
  console.log(`${k}: mean ${m.toFixed(2)} sd ${sd.toFixed(2)} min ${Math.min(...xs).toFixed(2)} max ${Math.max(...xs).toFixed(2)}  (binomial SE on ${per[0].n} games would be ~${(100 * Math.sqrt(0.21 * 0.79 / per[0].n)).toFixed(2)} for a rate near 21%)`);
}
console.log(`\nteam-game stat rows retained per league: ${leagues.map((l) => l.teamGames.length).join(", ")} — season aggregation folds the game log at rollover, so the per-game football rates cannot be read from this run.`);
