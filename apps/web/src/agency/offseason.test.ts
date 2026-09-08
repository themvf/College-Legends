import { describe, it, expect } from 'vitest';
import { startAgency, decideAgency, advanceAgency, restore, clientList, depth, type State } from './model.js';
import { ensureCareerReviews, currentReview, renewalQuote, schoolCounterQuote, remainingSchoolBudget, offseasonAfterWeek } from './offseason.js';

function review(seed=42, loyal=true) {
  let s=decideAgency(startAgency(seed),{type:'pitch',id:'2027-5',promise:'Security',fee:15});
  const p=s.players[5]!;
  expect(p.owner).toBe('you');
  p.ability=78; p.recognition=38; p.delivered=loyal; p.trust=loyal?90:20;
  s=through(s,12);
  s.players[5]!.delivered=loyal;s.players[5]!.trust=loyal?90:20;
  s.offseason!.reviews=[];
  ensureCareerReviews(s);
  return s;
}
function market() {
  let s=decideAgency(review(),{type:'renewClient',id:'2027-5',approach:'Keep'});
  s=decideAgency(s,{type:'career',id:'2027-5',plan:'Return'});
  s=advanceAgency(s);
  return decideAgency(s,{type:'openSchoolMarket',id:'2027-5'});
}
function through(s:State,week:number) { while(s.week<week)s=advanceAgency(s); return s; }

describe('offseason agency market',()=>{
  it('turns a loyal service record into retention and rejects duplicate renewal spending',()=>{
    const initial=review();
    const quote=renewalQuote(initial,initial.players[5]!,'PersonalPlan');
    expect(quote.chance).toBe(100);
    const s=decideAgency(initial,{type:'renewClient',id:'2027-5',approach:'PersonalPlan'});
    expect(s.money).toBe(initial.money-2000);
    expect(currentReview(s,'2027-5')!.status).toBe('Renewed');
    expect(initial.players[5]!.trust).toBe(90);
    expect(()=>decideAgency(s,{type:'renewClient',id:'2027-5',approach:'PersonalPlan'})).toThrow(/once/);
  });
  it('uses prestige and a lower fee to improve an at-risk retention offer without immunity',()=>{
    const low=review(42,false), high=review(42,false);
    high.reputation=65;high.offseason!.reviews=[];ensureCareerReviews(high);
    expect(currentReview(high,'2027-5')!.chance).toBeGreaterThan(currentReview(low,'2027-5')!.chance);
    expect(renewalQuote(low,low.players[5]!,'LowerFee').chance).toBeGreaterThan(renewalQuote(low,low.players[5]!,'Keep').chance);
    expect(renewalQuote(high,high.players[5]!,'Keep').chance).toBeLessThan(100);
  });
  it('loses an ignored contested renewal without changing schools and stops new transactions',()=>{
    let s=review(42,false);const former=s.players[5]!.school;
    s=through(s,14);
    expect(currentReview(s,'2027-5')!.status).toBe('Lost');
    expect(s.players[5]!.owner).not.toBe('you');expect(s.players[5]!.school).toBe(former);
    expect(()=>decideAgency(s,{type:'openSchoolMarket',id:'2027-5'})).toThrow(/represented/);
    expect(()=>decideAgency(s,{type:'deal',id:'2027-5',kind:0,performance:false})).toThrow();
    expect(s.recaps[0]!.news.join(' ')).toMatch(/deadline passed/);
  });
  it('blocks preparation before renewal and preserves an already booked draft commitment on loss',()=>{
    let s=review(42,false);
    expect(()=>decideAgency(s,{type:'prep',id:'2027-5',level:0,focus:'Testing',travel:false,recovery:false})).toThrow(/Renew representation/);
    s.players[5]!.prep={level:0,focus:'Testing',travel:false,recovery:false,cost:6000,resolved:false};
    s=through(s,14);
    expect(s.players[5]!.careerPlan).toBe('Draft');
  });
  it('offers distinct playing-time and money alternatives, with school values excluding sponsors',()=>{
    const s=market(), r=currentReview(s,'2027-5')!;
    expect(r.offers).toHaveLength(3);
    expect(new Set(r.offers.map(o=>depth(s.players[5]!,o.school).rank)).size).toBeGreaterThan(1);
    expect(new Set(r.offers.map(o=>o.gross)).size).toBeGreaterThan(1);
    expect(r.offers.every(o=>o.gross<=remainingSchoolBudget(s,o.school))).toBe(true);
  });
  it('counters once with truthful budget limits and no charge',()=>{
    let s=market();const r=currentReview(s,'2027-5')!, offer=r.offers[0]!;
    const b=s.offseason!.budgets.find(b=>b.school===offer.school)!;
    const original=b.total;b.total=offer.gross;
    expect(schoolCounterQuote(s,s.players[5]!,offer).chance).toBe(0);
    expect(()=>decideAgency(s,{type:'counterSchool',id:'2027-5',offer:offer.id})).toThrow(/cannot fund/);
    b.total=original;
    const cash=s.money;
    s=decideAgency(s,{type:'counterSchool',id:'2027-5',offer:offer.id});
    expect(s.money).toBe(cash);expect(currentReview(s,'2027-5')!.counterUsed).toBe(true);
    const another=currentReview(s,'2027-5')!.offers.find(o=>o.status==='Open')!;
    expect(()=>decideAgency(s,{type:'counterSchool',id:'2027-5',offer:another.id})).toThrow(/One school counter/);
    expect(restore(JSON.stringify(s))).toEqual(s);
  });
  it('signs and pays once, changes schools only at rollover, and prevents draft or second-transfer double dipping',()=>{
    let s=market();const p=s.players[5]!, original=p.school;
    const offer=currentReview(s,p.id)!.offers.find(o=>o.school!==original)!;
    const before=s.money;
    s=decideAgency(s,{type:'signSchool',id:p.id,offer:offer.id});
    expect(s.money).toBe(before-2500);expect(s.players[5]!.school).toBe(original);
    expect(()=>decideAgency(s,{type:'signSchool',id:p.id,offer:offer.id})).toThrow(/committed/);
    expect(()=>decideAgency(s,{type:'career',id:p.id,plan:'Draft'})).toThrow(/school agreement/);
    s=through(restore(JSON.stringify(s))!,16);
    const a=s.offseason!.agreements[0]!;
    expect(a.status).toBe('Paid');expect(a.clientNet+a.commission).toBe(a.gross);
    expect(s.ledger.filter(e=>e.label.includes('school agreement commission'))).toHaveLength(1);
    const money=s.money,prestige=s.reputation;
    offseasonAfterWeek(s);expect(s.money).toBe(money);expect(s.reputation).toBe(prestige);
    s=advanceAgency(through(restore(JSON.stringify(s))!,18));
    expect(s.players[5]).toMatchObject({school:offer.school,season:2028,owner:'you',eligibility:2,fee:15});
    expect(()=>decideAgency(s,{type:'transfer',id:p.id,school:original})).toThrow();
    expect(s.money).toBe(100000+s.ledger.reduce((n,e)=>n+e.amount,0));
  });
  it('retains a school with a paid stay agreement and no move cost',()=>{
    let s=market();const offer=currentReview(s,'2027-5')!.offers[0]!,before=s.money;
    s=decideAgency(s,{type:'signSchool',id:'2027-5',offer:offer.id});
    expect(s.money).toBe(before);expect(s.offseason!.agreements[0]!.cost).toBe(0);
    expect(s.players[5]!.school).toBe(offer.school);
  });
  it('rejects a stale second offer after another client commits the shared school budget',()=>{
    let s=review();
    const first=s.players[5]!, second=s.players[4]!;
    Object.assign(second,{owner:'you',representedByYou:true,school:first.school,
      eligibility:3,fee:15,trust:90,delivered:true});
    s.offseason!.reviews=[];
    ensureCareerReviews(s);
    for(const id of [first.id,second.id]) {
      s=decideAgency(s,{type:'renewClient',id,approach:'Keep'});
      s=decideAgency(s,{type:'career',id,plan:'Return'});
    }
    s=advanceAgency(s);
    for(const id of [first.id,second.id]) s=decideAgency(s,{type:'openSchoolMarket',id});
    const firstOffer=currentReview(s,first.id)!.offers.find(o=>o.school===first.school)!;
    const secondOffer=currentReview(s,second.id)!.offers.find(o=>o.school===first.school)!;
    // Each quote fits alone, but the school cannot fund both guarantees.
    const budget=s.offseason!.budgets.find(b=>b.year===s.year&&b.school===first.school)!;
    budget.total=Math.max(firstOffer.gross,secondOffer.gross);
    expect(firstOffer.gross).toBeLessThanOrEqual(remainingSchoolBudget(s,first.school));
    expect(secondOffer.gross).toBeLessThanOrEqual(remainingSchoolBudget(s,first.school));
    expect(restore(JSON.stringify(s))).toEqual(s);

    s=decideAgency(s,{type:'signSchool',id:first.id,offer:firstOffer.id});
    expect(remainingSchoolBudget(s,first.school)).toBe(budget.total-firstOffer.gross);
    expect(secondOffer.gross).toBeGreaterThan(remainingSchoolBudget(s,first.school));
    const loaded=restore(JSON.stringify(s));
    expect(loaded).toEqual(s);
    const before=structuredClone(loaded!);
    expect(()=>decideAgency(loaded!,{type:'signSchool',id:second.id,offer:secondOffer.id}))
      .toThrow(/enough uncommitted budget/);
    expect(loaded).toEqual(before);
    expect(loaded!.offseason!.agreements).toHaveLength(1);
    expect(currentReview(loaded!,second.id)!.settled).toBe(false);
    expect(remainingSchoolBudget(loaded!,first.school)).toBeGreaterThanOrEqual(0);
    expect(restore(JSON.stringify(loaded))).toEqual(loaded);
  });
  it('keeps staying without an agreement viable and closes unchosen offers at deadline',()=>{
    let s=market();s=decideAgency(s,{type:'staySchool',id:'2027-5'});
    expect(s.offseason!.agreements).toHaveLength(0);
    expect(currentReview(s,'2027-5')!.offers.every(o=>o.status==='Closed')).toBe(true);
    let expired=through(market(),15);
    expect(expired.offseason!.agreements).toHaveLength(0);
    expect(currentReview(expired,'2027-5')!.marketResult).toMatch(/market closed/i);
    expect(()=>decideAgency(expired,{type:'signSchool',id:'2027-5',offer:currentReview(expired,'2027-5')!.offers[0]!.id})).toThrow();
  });
  it('protects original sponsor commission rights when a client changes agents mid-campaign',()=>{
    let s=review(42,false);
    s=decideAgency(s,{type:'deal',id:'2027-5',kind:0,performance:false});
    const commission=Math.round(s.deals[0]!.gross*.15);
    s=through(s,15);
    expect(currentReview(s,'2027-5')!.status).toBe('Lost');
    expect(s.deals[0]!.status).toBe('Paid');
    expect(s.ledger.some(e=>e.kind==='Commission'&&e.amount===commission)).toBe(true);
  });
  it('rejects school commitments while services are still active',()=>{
    let s=review();s=decideAgency(s,{type:'deal',id:'2027-5',kind:0,performance:false});
    s=decideAgency(s,{type:'renewClient',id:'2027-5',approach:'Keep'});
    s=decideAgency(s,{type:'career',id:'2027-5',plan:'Return'});
    s=advanceAgency(s);s=decideAgency(s,{type:'openSchoolMarket',id:'2027-5'});
    const o=currentReview(s,'2027-5')!.offers[0]!;
    expect(()=>decideAgency(s,{type:'signSchool',id:'2027-5',offer:o.id})).toThrow(/Finish current/);
  });
  it('does not offer a college market to final-year clients or permit young draft entry',()=>{
    let s=review();s.players[5]!.eligibility=1;
    s=decideAgency(s,{type:'renewClient',id:'2027-5',approach:'Keep'});
    expect(()=>decideAgency(s,{type:'career',id:'2027-5',plan:'Return'})).toThrow(/final eligible/);
    s.players[5]!.eligibility=3;s.players[5]!.schoolYear=2;
    expect(()=>decideAgency(s,{type:'career',id:'2027-5',plan:'Draft'})).toThrow(/Year 3/);
  });
  it('migrates pre-market saves without a late-renewal deadlock and rejects corrupted market records',()=>{
    for(const week of [12,13,14,15,18]) {
      const old=through(review(),week);delete old.offseason;
      const loaded=restore(JSON.stringify(old))!;expect(loaded).not.toBeNull();
      if(week===14) {
        expect(currentReview(loaded,'2027-5')!.status).toBe('Renewed');
        expect(()=>decideAgency(loaded,{type:'career',id:'2027-5',plan:'Return'})).not.toThrow();
      }
      expect(()=>advanceAgency(loaded)).not.toThrow();
    }
    const broken=market();broken.offseason!.reviews[0]!.rival='missing';
    expect(restore(JSON.stringify(broken))).toBeNull();
    const duplicate=market();duplicate.offseason!.reviews.push(duplicate.offseason!.reviews[0]!);
    expect(restore(JSON.stringify(duplicate))).toBeNull();
  });
});
