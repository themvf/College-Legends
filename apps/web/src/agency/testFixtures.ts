import { startAgency, type Want } from './model.js';
import { initializeGameplay } from './gameplay.js';
import { initializeGrowth } from './growth.js';

// A represented-client fixture isolates downstream economics from recruiting luck.
// Pitch acceptance itself is exercised with real actions in the recruiting tests.
export function representedAgency(seed=42, index=0, promise:Want='Development') {
  const s=startAgency(seed),p=s.players[index]!;
  p.owner='you';p.representedByYou=true;p.promise=promise;p.fee=15;p.trust=promise===p.want?80:65;
  p.approached=0;s.money-=2000;
  s.ledger.push({year:s.year,week:0,label:`${p.name} · representation meeting`,amount:-500,kind:'Expense'}, {year:s.year,week:0,label:`${p.name} · onboarding and service setup`,amount:-1500,kind:'Expense'});
  initializeGameplay(s);initializeGrowth(s);
  return s;
}
