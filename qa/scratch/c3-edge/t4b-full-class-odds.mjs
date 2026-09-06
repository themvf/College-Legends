/**
 * Brief B §4 follow-up — does prospectOdds post a signing percentage for a
 * program the market cannot award the recruit to?
 *
 * resolveRecruitingMarket only admits contenders with openings > 0 and refuses
 * to award to a winner at <= 0, so a full program's true chance is exactly 0.
 * prospectOdds takes the `considering` branch whenever options.nilOffer > 0 and
 * never re-checks openings.
 *
 * This measures how often the combination occurs on a real board rather than
 * asserting it is reachable. Read-only; nothing is written into `state`.
 */
import { readFileSync } from "node:fs";
import { prospectOdds, recruitingOddsIndex, projectedRecruitingOpenings } from "../../../packages/simulation/dist/index.js";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));

for (const seed of ["qa-c3-market-1", "qa-c3-market-2", "qa-c3-market-3"]) {
  for (const week of ["s1-w11", "s1-w13", "s1-w14"]) {
    const state = load(seed, week);
    const index = recruitingOddsIndex(state);
    const full = Object.keys(state.programs).sort().filter((id) => projectedRecruitingOpenings(state, id) <= 0);
    let liveOffers = 0;      // full program with real money still on a live prospect
    let postedSign = 0;      // ...and the card would print a SIGN percentage
    let maxPercent = 0;
    const examples = [];
    for (const programId of full) {
      const offers = state.nil?.[programId]?.offersByProspect ?? {};
      for (const [prospectId, amount] of Object.entries(offers)) {
        const prospect = state.prospects[prospectId];
        if (!prospect || (prospect.status !== "AVAILABLE" && prospect.status !== "COMMITTED")) continue;
        if (!(amount > 0)) continue;
        liveOffers += 1;
        const odds = prospectOdds(state, programId, prospectId, index, { nilOffer: amount });
        if (odds?.outcome === "SIGN") {
          postedSign += 1;
          if (odds.percent > maxPercent) maxPercent = odds.percent;
          if (examples.length < 3) examples.push({ programId, prospectId, amount, percent: odds.percent, note: odds.note });
        }
      }
    }
    console.log(`${seed} ${week}: full programs=${full.length}  live NIL offers held by them=${liveOffers}  posting SIGN=${postedSign}  maxPercent=${maxPercent}`);
    for (const e of examples) console.log(`    ${e.programId} -> ${e.prospectId} $${e.amount}/wk  ${e.percent}%  "${e.note}"`);
  }
}
