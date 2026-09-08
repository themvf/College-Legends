import { describe,it,expect } from 'vitest';
import { startAgency,decideAgency,advanceAgency,restore,fit,dealValue, type State } from './model.js';
import { representedAgency } from './testFixtures.js';
import { commercialServices,preparedPlayer,type CommercialKind } from './commercial.js';
import { resolveDevelopment } from './growth.js';

const book=(s:State,kind:CommercialKind)=>decideAgency(s,{type:'developmentPlan',id:s.players[0]!.id,kind,skill:0,provider:0});
describe('commercial agency loop',()=>{
  it('allows a matched first pitch to lose and a lower commission to change that outcome',()=>{
    const s=startAgency(42),p=s.players[0]!;
    expect(fit(s,p,p.want,15)).toBe(62);
    const rejected=decideAgency(s,{type:'pitch',id:p.id,promise:p.want,fee:15});
    expect(rejected.lastPitch?.accepted).toBe(false);
    expect(rejected.money).toBe(99500);
    expect(rejected.players[0]!.owner).toBeNull();
    expect(()=>decideAgency(rejected,{type:'pitch',id:p.id,promise:p.want,fee:10})).toThrow(/next week/);
    const retryWeek=advanceAgency(rejected);
    expect(retryWeek.week).toBe(1);
    expect(()=>decideAgency(retryWeek,{type:'pitch',id:p.id,promise:p.want,fee:10})).not.toThrow();
    const accepted=decideAgency(s,{type:'pitch',id:p.id,promise:p.want,fee:10});
    expect(accepted.lastPitch?.accepted).toBe(true);
    expect(accepted.money).toBe(98000);
    expect(restore(JSON.stringify(rejected))?.lastPitch).toEqual(rejected.lastPitch);
  });
  it('produces both wins and losses across seeds, with fees and prestige influencing chances',()=>{
    let wins=0;
    for(let seed=1;seed<=100;seed++){
      const s=startAgency(seed),p=s.players[0]!;
      wins+=Number(decideAgency(s,{type:'pitch',id:p.id,promise:p.want,fee:15}).lastPitch?.accepted);
      expect(fit(s,p,p.want,10)).toBeGreaterThan(fit(s,p,p.want,20));
      expect(fit({...s,reputation:80},p,p.want,15)).toBeGreaterThan(fit(s,p,p.want,15));
    }
    expect(wins).toBeGreaterThan(40);expect(wins).toBeLessThan(80);
  });
  it.each(commercialServices)('$name costs time and cash, changes quotes only on delivery, and cannot be bought twice',service=>{
    const s=representedAgency(),p=s.players[0]!,expected=preparedPlayer(p,service.kind);
    let next=book(s,service.kind);
    expect(next.money).toBe(s.money-service.cost);
    expect(next.players[0]!.brandKit).toBeUndefined();
    expect(dealValue(next.players[0]!,0)).toBe(dealValue(p,0));
    expect(next.growth!.records[0]!.due).toBe(service.weeks);
    expect(()=>decideAgency(next,{type:'deal',id:p.id,kind:0,performance:false})).toThrow(/preparation/);
    for(let i=1;i<=service.weeks;i++){next.week=i;resolveDevelopment(next);}
    const after=next.players[0]!;
    expect(after.ability).toBe(p.ability);expect(after.testing).toBe(p.testing);
    expect(after.brandKit).toEqual([service.kind]);
    expect(after.fatigue-p.fatigue).toBe(service.hours*service.weeks);
    expect(after.recognition).toBe(expected.recognition);
    for(let i=0;i<3;i++) expect(dealValue(after,i)).toBe(dealValue(expected,i));
    expect(after.delivered).toBe(true);
    const saved=restore(JSON.stringify(next))!;
    expect(saved.players[0]!.brandKit).toEqual([service.kind]);
    expect(()=>book(saved,service.kind)).toThrow(/already/);
    const record=JSON.stringify(saved.growth!.records);resolveDevelopment(saved);
    expect(JSON.stringify(saved.growth!.records)).toBe(record);
  });
  it('rejects unaffordable, overlapping and late preparation without changing cash',()=>{
    const s=representedAgency();s.money=500;
    expect(()=>book(s,'Styling')).toThrow(/cash/);expect(s.money).toBe(500);
    s.money=98000;s.week=10;expect(()=>book(s,'Press')).toThrow(/Week 12/);
    s.week=0;const busy=book(s,'Social');expect(()=>book(busy,'Press')).toThrow(/existing/);
    const deal=decideAgency(s,{type:'deal',id:s.players[0]!.id,kind:0,performance:false});
    expect(()=>book(deal,'Styling')).toThrow(/active campaign/);
  });
  it('charges no activation fee and pays exactly one commission after delivery',()=>{
    const s=representedAgency(),p=s.players[0]!;
    let next=decideAgency(s,{type:'deal',id:p.id,kind:0,performance:false});
    const gross=next.deals[0]!.gross;
    expect(next.money).toBe(s.money);expect(next.deals[0]!.cost).toBe(0);
    expect(next.ledger).toEqual(s.ledger);
    next=advanceAgency(advanceAgency(next));
    expect(next.money).toBe(s.money-3000+Math.round(gross*.15));
    expect(next.ledger.filter(l=>l.kind==='Commission')).toHaveLength(1);
    next=advanceAgency(restore(JSON.stringify(next))!);
    expect(next.ledger.filter(l=>l.kind==='Commission')).toHaveLength(1);
  });
  it('preserves existing paid costs and unfinished training when loading an older save',()=>{
    let old=representedAgency();
    old=decideAgency(old,{type:'developmentPlan',id:old.players[0]!.id,kind:'Skill',skill:0,provider:0});
    const restored=restore(JSON.stringify(old))!;
    expect(restored.money).toBe(old.money);expect(restored.growth!.records).toEqual(old.growth!.records);
    expect(restored.players[0]!.brandKit).toBeUndefined();
    restored.players[0]!.brandKit=['Styling','Styling'];expect(restore(JSON.stringify(restored))).toBeNull();
  });
});
