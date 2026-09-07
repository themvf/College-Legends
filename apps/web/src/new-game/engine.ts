/** Independent first-playable business game. No imports from the legacy dynasty simulation. */
export const SAVE_KEY = 'college-legends-business-v1';
export type Entry = { tick: number; label: string; amount: number };
export type Loan = { balance: number; payment: number; paymentsLeft: number; interestPaid: number };
export type Business = { cash: number; entries: Entry[]; loan: Loan | null; shortfallWeeks: number };
export type Prospect = { id: string; name: string; number: number; description: string; assessment: string; fee: number; weekly: number; base: number; spread: number };
export const PROSPECTS: readonly Prospect[] = [
  { id:'ellis', name:'Miles Ellis', number:12, description:'The steady hand', assessment:'Ready to compete. Modest upside.', fee:60000, weekly:1200, base:63, spread:10 },
  { id:'reed', name:'Jalen Reed', number:7, description:'The overlooked talent', assessment:'Raw today. His upside is uncertain.', fee:110000, weekly:2000, base:54, spread:30 },
  { id:'cruz', name:'Nico Cruz', number:9, description:'The headline signing', assessment:'Strong early report. An expensive bet.', fee:210000, weekly:3500, base:69, spread:18 }
];
export type Athlete = { prospectId: string; ability: number; ceiling: number; popularity: number; earnings: number; seasonTD: number; startAbility: number };
export type Report = { title: string; detail: string; opponent?: string; score?: [number,number]; net: number; sales: number; growth: number; unlocked: string[] };
export type Game = { version:1; seed:number; tick:number; season:number; week:number; wins:number; losses:number; fans:number; business:Business; athlete:Athlete|null; sponsor:'local'|'wins'|null; stock:number; coach:boolean; facility:'basic'|'building'|'complete'; buildAt:number; report:Report|null; bankrupt:boolean; history:{season:number;wins:number;cash:number}[] };
export function newGame(seed = Math.floor(Math.random()*1e9)): Game {
  return {version:1,seed,tick:0,season:2027,week:0,wins:0,losses:0,fans:3500,business:{cash:600000,entries:[],loan:null,shortfallWeeks:0},athlete:null,sponsor:null,stock:0,coach:false,facility:'basic',buildAt:0,report:null,bankrupt:false,history:[]};
}
function random(g: Game, key:string):number { let h=g.seed|0; for(const c of `${g.tick}:${key}`) h=Math.imul(h^c.charCodeAt(0),16777619); h=Math.imul(h^(h>>>16),2246822507); return (h>>>0)/4294967296; }
export function transact(g:Game,label:string,amount:number) { if(!Number.isFinite(amount))throw new Error('Invalid transaction'); g.business.cash+=Math.round(amount);g.business.entries.push({tick:g.tick,label,amount:Math.round(amount)}); }
export type Action = {type:'sign';id:string}|{type:'advance'}|{type:'sponsor';deal:'local'|'wins'}|{type:'stock';units:number}|{type:'coach'}|{type:'facility'}|{type:'loan'};
export const unlocks=(g:Game)=>({sponsor:g.tick>=3,merch:g.tick>=5,coach:g.tick>=7,facility:g.tick>=9,loan:g.tick>=10});
export function available(g:Game):string {const u=unlocks(g); return !u.sponsor?'Local sponsors · after 3 games':!u.merch?'Player merchandise · after 5 games':!u.coach?'Staff investment · after 7 games':!u.facility?'Facility investment · after 9 games':!u.loan?'Lending · after 10 games':'More business systems are planned';}
export const loanPayment=(principal:number,rate:number,weeks:number)=>Math.ceil(principal*(rate/52)/(1-(1+rate/52)**-weeks));
const opponents=['Crossroads','Lake Erie','Bluegrass','Twin Rivers','Kanawha','Prairie State','Sierra Basin','Sun Coast','Great Lakes Tech','Black Hills','Central Valley','North Bay'];
function settleWeek(g:Game,playing:boolean) {
  g.tick++; if(g.facility==='building'&&g.tick>=g.buildAt)g.facility='complete';
  transact(g,'Institutional operating support',playing?18000:12000);
  transact(g,'Inherited staff & operations',playing?-42000:-12000);
  const p=PROSPECTS.find(p=>p.id===g.athlete!.prospectId)!;
  transact(g,`${p.name} · player agreement`,-p.weekly);g.athlete!.earnings+=p.weekly;
  if(g.coach)transact(g,'Development coordinator payroll',-1500);
  if(g.facility==='complete')transact(g,'Facility upkeep',-250);
  const loan=g.business.loan;
  if(loan&&loan.paymentsLeft>0){const interest=Math.round(loan.balance*.12/52);const payment=loan.paymentsLeft===1?loan.balance+interest:Math.min(loan.payment,loan.balance+interest);transact(g,'Loan repayment',-payment);loan.balance=Math.max(0,loan.balance-(payment-interest));loan.interestPaid+=interest;loan.paymentsLeft--;}
}
function insolvency(g:Game){g.business.shortfallWeeks=g.business.cash<0?g.business.shortfallWeeks+1:0;if(g.business.shortfallWeeks>=3)g.bankrupt=true;}
function advance(g:Game){
  const before=g.business.cash,previous=unlocks(g),a=g.athlete!;let sales=0,growth=0;
  if(g.week===12){
    g.history.push({season:g.season,wins:g.wins,cash:g.business.cash});
    transact(g,'Annual alumni support',80000+g.wins*9000);
    let settled=0; for(;settled<40&&!g.bankrupt;settled++){settleWeek(g,false);insolvency(g);}
    if(!g.bankrupt){g.season++;g.week=0;g.wins=0;g.losses=0;g.sponsor=null;a.startAbility=a.ability;}
    g.report={title:g.bankrupt?'The program cannot meet its obligations.':'A new year. The same commitments.',detail:`The offseason settled ${settled} calendar weeks of operating support, payroll, player agreements and loan payments. Your staff and player remain for this early build.`,net:g.business.cash-before,sales:0,growth:0,unlocked:[]};return;
  }
  settleWeek(g,true);g.week++;
  const edge=(a.ability-60)*.008+(g.coach?.04:0)+(random(g,'opponent')-.5)*.3;
  const won=random(g,'game')<Math.max(.15,Math.min(.8,.43+edge));
  const own=won?24+Math.floor(random(g,'score')*18):7+Math.floor(random(g,'score')*20),other=won?Math.max(3,own-3-Math.floor(random(g,'margin')*14)):own+3+Math.floor(random(g,'margin')*17);
  if(won)g.wins++;else g.losses++;
  g.fans=Math.max(1800,g.fans+(won?160:-65));a.popularity=Math.max(10,Math.min(90,a.popularity+(won?3:-1)));a.seasonTD+=Math.max(0,Math.floor(own/9));
  if(g.week%2===0)transact(g,'Home ticket receipts',Math.round(Math.min(8000,g.fans)*(.63+random(g,'crowd')*.17)*18));
  if(g.sponsor==='local')transact(g,'Local sponsor payment',8000);
  if(g.sponsor==='wins'&&won)transact(g,'Performance sponsor payment',17000);
  if(g.stock>0){sales=Math.min(g.stock,Math.floor(a.popularity*(.4+random(g,'sales')*.9)));g.stock-=sales;transact(g,'Jersey sales',sales*60);transact(g,'Player merchandise share',-sales*12);a.earnings+=sales*12;}
  const gain=Math.min(Math.max(0,a.ceiling-a.ability),(.08+random(g,'development')*.28)*(g.coach?1.45:1)*(g.facility==='complete'?1.18:1));a.ability+=gain;growth=gain;
  insolvency(g);const now=unlocks(g),names={sponsor:'A local sponsor wants to meet.',merch:'A small merchandise opportunity.',coach:'A coordinator is available.',facility:'A facility investment is available.',loan:'A lender has made an offer.'};
  const opened=(Object.keys(now) as (keyof typeof now)[]).filter(k=>now[k]&&!previous[k]).map(k=>names[k]);
  g.report={title:g.bankrupt?'The program cannot meet its obligations.':won?'A Saturday to build on.':'A setback. Not the whole story.',detail:`${PROSPECTS.find(p=>p.id===a.prospectId)!.name} is still developing. One result does not determine his future.`,opponent:opponents[g.week-1]!,score:[own,other],net:g.business.cash-before,sales,growth,unlocked:opened};
}
export function act(current:Game,action:Action):Game {
  const g=structuredClone(current);if(g.bankrupt)throw new Error('This program is insolvent. Start a new career.');
  const spend=(label:string,value:number)=>{if(g.business.cash<value)throw new Error('Not enough available cash.');transact(g,label,-value);};
  if(action.type==='sign'){if(g.athlete)throw new Error('Your first recruit is already signed.');const p=PROSPECTS.find(p=>p.id===action.id);if(!p)throw new Error('Unknown prospect.');spend(`${p.name} · signing commitment`,p.fee);g.athlete={prospectId:p.id,ability:p.base,ceiling:p.base+random(g,'upside:'+p.id)*p.spread,popularity:p.id==='cruz'?35:16,earnings:p.fee,seasonTD:0,startAbility:p.base};return g;}
  if(!g.athlete)throw new Error('Sign your first recruit to begin.');
  const u=unlocks(g);
  switch(action.type){
    case 'advance':advance(g);break;
    case 'sponsor':if(!u.sponsor||g.sponsor)throw new Error('No sponsor choice is available.');g.sponsor=action.deal;break;
    case 'stock':if(!u.merch||![300,1000].includes(action.units))throw new Error('That merchandise order is unavailable.');spend('Jersey inventory',action.units*30);g.stock+=action.units;break;
    case 'coach':if(!u.coach||g.coach)throw new Error('That coach is unavailable.');spend('Coordinator recruitment & transition',80000);g.coach=true;break;
    case 'facility':if(!u.facility||g.facility!=='basic')throw new Error('That project is unavailable.');spend('Strength facility construction',240000);g.facility='building';g.buildAt=g.tick+8;break;
    case 'loan':if(!u.loan||g.business.loan)throw new Error('No further credit is available.');if(g.business.shortfallWeeks>1)throw new Error('The lender declined: unresolved arrears.');g.business.loan={balance:150000,payment:loanPayment(150000,.12,52),paymentsLeft:52,interestPaid:0};transact(g,'Loan principal received',150000);break;
  }
  return g;
}
/** Validate the version and persisted structures before loading a career. */
export function parseSave(raw:string):Game {
  const g=JSON.parse(raw) as Game;
  const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n);
  if(!g||g.version!==1||!finite(g.seed)||!Number.isInteger(g.tick)||g.tick<0||!Number.isInteger(g.week)||g.week<0||g.week>12||!finite(g.season)||!finite(g.wins)||!finite(g.losses)||!finite(g.fans)||!g.business||!finite(g.business.cash)||!finite(g.business.shortfallWeeks)||!Array.isArray(g.business.entries)||g.business.entries.some(e=>!finite(e.tick)||typeof e.label!=='string'||!finite(e.amount))||!['basic','building','complete'].includes(g.facility)||!finite(g.buildAt)||typeof g.coach!=='boolean'||typeof g.bankrupt!=='boolean'||!finite(g.stock)||!Array.isArray(g.history)||g.history.some(h=>!finite(h.season)||!finite(h.wins)||!finite(h.cash))||![null,'local','wins'].includes(g.sponsor))throw new Error('This save is not compatible or is damaged.');
  if(g.athlete&&(!PROSPECTS.some(p=>p.id===g.athlete!.prospectId)||!['ability','ceiling','popularity','earnings','seasonTD','startAbility'].every(k=>finite(g.athlete![k as keyof Athlete]))))throw new Error('Invalid player data.');
  const l=g.business.loan;if(l&&(!finite(l.balance)||l.balance<0||!finite(l.payment)||!Number.isInteger(l.paymentsLeft)||l.paymentsLeft<0||l.paymentsLeft>52||!finite(l.interestPaid)))throw new Error('Invalid loan data.');
  if(g.report&&(typeof g.report.title!=='string'||typeof g.report.detail!=='string'||!finite(g.report.net)||!finite(g.report.growth)||!finite(g.report.sales)||!Array.isArray(g.report.unlocked)||g.report.unlocked.some(x=>typeof x!=='string')||(g.report.score&&(!Array.isArray(g.report.score)||g.report.score.length!==2||!g.report.score.every(finite)))))throw new Error('Invalid report data.');
  return g;
}
