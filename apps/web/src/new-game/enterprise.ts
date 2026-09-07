/** Fictional, incremental operating model. The inherited base budget is funded separately. */
export const ENTERPRISE_KEY = 'college-legends-enterprise-v1';
export type Stage = 'renewals'|'campaign-report'|'match'|'match-report'|'partner'|'schedule'|'capital'|'annual'|'ended';
export type Line = { year:number; label:string; amount:number };
export type Enterprise = { version:1; seed:number; year:number; stage:Stage; cash:number; tickets:number; loyalty:number; campaign:'phone'|'town'|'premium'|null; attendance:number; match:number; wins:number; result:string; news:string[]; lines:Line[]; sponsor:boolean; future:'home'|'away'|null; thisYearAway:boolean; premium:boolean; grant:number; restrictedSpent:number; report:{title:string;body:string;net:number}; };
export type Decision = 'phone'|'town'|'premium'|'continue'|'partner'|'independent'|'home'|'away'|'build'|'defer'|'next';
export const campaigns = [
  {id:'phone' as const,title:'Call our regulars',cost:8000,description:'A small renewal campaign. Lower cost, limited reach.',range:'180–300 packages'},
  {id:'town' as const,title:'Bring the town back',cost:28000,description:'Local advertising and outreach. More reach, more cash at risk.',range:'300–660 packages'},
  {id:'premium' as const,title:'Make a bigger impression',cost:65000,description:'A regional campaign. Expensive reach into a less certain audience.',range:'220–820 packages'}
];
export function startEnterprise(seed=Math.floor(Math.random()*1e9)):Enterprise{return {version:1,seed,year:2027,stage:'renewals',cash:600000,tickets:0,loyalty:50,campaign:null,attendance:0,match:0,wins:0,result:'',news:['Mara Chen, ticket office: “We have seats. Let’s give people a reason to return.”','Coach Bell has the inherited roster back at practice.'],lines:[],sponsor:false,future:null,thisYearAway:false,premium:false,grant:0,restrictedSpent:0,report:{title:'',body:'',net:0}};}
function roll(g:Enterprise,key:string){let h=g.seed|0;for(const c of `${g.year}:${g.match}:${key}`)h=Math.imul(h^c.charCodeAt(0),16777619);return (Math.imul(h^(h>>>16),2246822507)>>>0)/4294967296;}
function post(g:Enterprise,label:string,amount:number){g.cash+=amount;g.lines.push({year:g.year,label,amount});}
export const homeDates=(g:Enterprise)=>g.thisYearAway?5:6;
export const packagePrice=(g:Enterprise)=>homeDates(g)*22;
export const matchLimit=(g:Enterprise)=>homeDates(g);
export const homeOpponent=(g:Enterprise)=>['Crossroads College','Lake Erie State','Bluegrass Tech','Twin Rivers','Prairie State','North Bay'][Math.min(g.match,5)]!;
export function decide(current:Enterprise,choice:Decision):Enterprise{
 const g=structuredClone(current),before=g.cash;
 const spend=(label:string,n:number)=>{if(g.cash<n)throw Error('This commitment exceeds available operating reserves.');post(g,label,-n);};
 if(g.stage==='renewals'){
   const c=campaigns.find(x=>x.id===choice);if(!c)throw Error('Choose a renewal campaign.');
   spend(c.title,c.cost);g.campaign=c.id;
   const bounds=c.id==='phone'?[180,120]:c.id==='town'?[300,360]:[220,600];
   g.tickets=Math.max(100,Math.floor(bounds[0]!+roll(g,'renew')*bounds[1]!+(g.loyalty-50)*5));
   post(g,'Season packages · collected before kickoff',g.tickets*packagePrice(g));
   g.report={title:'The first commitments are in.',body:`${g.tickets} supporters bought a ${homeDates(g)}-game package at $${packagePrice(g)}. Their seats are reserved all season. This cash will not be counted again at the gate.`,net:g.cash-before};
   g.news=[`Mara Chen: “${g.tickets} packages sold. Now we need to bring them back next year.”`,'The ticket office is preparing supporter packs.'];g.stage='campaign-report';
 }else if(g.stage==='campaign-report'&&choice==='continue'){g.stage='match';}
 else if(g.stage==='match'&&choice==='continue'){
   const opponent=homeOpponent(g);g.match++;const wet=roll(g,'weather')<.3;const casual=Math.max(150,Math.floor(950+g.loyalty*12+roll(g,'gate')*850-(wet?500:0)));
   g.attendance=Math.min(6000,g.tickets+casual);const walkups=Math.max(0,g.attendance-g.tickets);
   post(g,'Single-game admissions',walkups*28);post(g,'Contracted concessions & parking share',g.attendance*5);
   post(g,'Home-event staffing, security & operations',-46000);
   if(g.sponsor)post(g,'Local partner · delivered home-game inventory',14000);
   if(g.premium){post(g,'Hospitality contribution after service costs',Math.floor((60+roll(g,'suites')*70)*170));post(g,'Hospitality maintenance allocation',-4000);}
   const won=roll(g,'result')<.48;g.wins+=won?1:0;g.loyalty=Math.max(20,Math.min(85,g.loyalty+(won?4:-3)));
   const score=17+Math.floor(roll(g,'score')*20),margin=3+Math.floor(roll(g,'margin')*12);
   g.result=`Gateway ${score} · ${opponent} ${won?score-margin:score+margin}`;
   g.report={title:won?'A Saturday to remember.':'A tough afternoon at home.',body:`${g.result}. ${g.attendance.toLocaleString()} attended${wet?' despite the rain':''}. ${walkups.toLocaleString()} bought single-game tickets. Today’s operating result includes event costs.`,net:g.cash-before};
   g.news=[wet?'Rain moved the pregame gathering under cover.':'Supporters linger outside the ground after the final whistle.',won?'Coach Bell: “A good team effort. Back to work Monday.”':'Coach Bell: “We’ll review the film. There’s another week ahead.”'];g.stage='match-report';
 }else if(g.stage==='match-report'&&choice==='continue'){
   g.stage=g.match===1&&!g.sponsor?'partner':g.match===2&&g.future===null?'schedule':g.match===3&&!g.premium?'capital':g.match>=matchLimit(g)?'annual':'match';
 }else if(g.stage==='partner'&&(choice==='partner'||choice==='independent')){
   g.sponsor=choice==='partner';g.news=[g.sponsor?'Northbank signs a one-season signage and hospitality agreement.':'The commercial team will keep the remaining inventory unsold this season.'];g.stage='match';
 }else if(g.stage==='schedule'&&(choice==='home'||choice==='away')){
   g.future=choice;g.news=[choice==='away'?'Next season: a guaranteed road payment, one fewer home date.':'Next season: the inherited six-home-game plan stays intact.'];g.stage='match';
 }else if(g.stage==='capital'&&(choice==='build'||choice==='defer')){
   if(choice==='build'){spend('Hospitality project · operating cash match',330000);g.grant+=220000;g.restrictedSpent+=220000;g.premium=true;g.news=['The foundation paid $220,000 directly toward the approved project.','A compact hospitality terrace is being prepared for the next home date.'];}
   else g.news=['The donor’s capital offer expires. Operating reserves stay available.'];g.stage='match';
 }else if(g.stage==='annual'&&choice==='next'){
   post(g,'Year-end shared athletics contribution',-95000);
   if(g.thisYearAway){post(g,'Contracted road guarantee · paid after game',180000);post(g,'Road-game travel allocation',-45000);}
   g.report={title:'A year of commitments.',body:'The shared athletics contribution has settled. The next campaign opens against a new schedule. Inherited roster, coaching and base operations remain covered by the approved base budget.',net:g.cash-before};
   if(g.cash<100000){g.stage='ended';g.news=['The university’s $100,000 reserve requirement was not met. Your delegated spending authority has ended.'];}
   else {g.year++;g.stage='renewals';g.thisYearAway=g.future==='away';g.future=null;g.sponsor=false;g.match=0;g.wins=0;g.tickets=0;g.attendance=0;g.campaign=null;g.news=[`The new schedule has ${homeDates(g)} home dates. Renewals are open.`,g.premium?'The hospitality terrace needs bookings again this year.':'The inherited staff is preparing another season.'];}
 }else throw Error('That decision is not available now.');
 return g;
}
export function restoreEnterprise(raw:string):Enterprise{
 const x=JSON.parse(raw) as Enterprise;const stages=['renewals','campaign-report','match','match-report','partner','schedule','capital','annual','ended'];
 if(!x||x.version!==1||!stages.includes(x.stage)||!['seed','year','cash','tickets','loyalty','attendance','match','wins','grant','restrictedSpent'].every(k=>Number.isFinite(x[k as keyof Enterprise]))||![null,'phone','town','premium'].includes(x.campaign)||![null,'home','away'].includes(x.future)||!['sponsor','thisYearAway','premium'].every(k=>typeof x[k as keyof Enterprise]==='boolean')||!Array.isArray(x.lines)||x.lines.some(l=>!l||!Number.isFinite(l.amount)||!Number.isFinite(l.year)||typeof l.label!=='string')||!Array.isArray(x.news)||x.news.some(n=>typeof n!=='string')||!x.report||typeof x.report.title!=='string'||typeof x.report.body!=='string'||!Number.isFinite(x.report.net)||typeof x.result!=='string'||x.match<0||x.match>6||x.tickets<0||x.tickets>6000||600000+x.lines.reduce((s,l)=>s+l.amount,0)!==x.cash)throw Error('This save could not be read.');return x;
}
