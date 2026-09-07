import { describe, expect, it } from 'vitest';
import { act, newGame, parseSave, transact, unlocks } from './engine.js';
const signed=()=>act(newGame(42),{type:'sign',id:'ellis'});
describe('independent business engine',()=>{
  it('requires one signing and keeps the input immutable',()=>{
    const original=newGame(42);
    expect(()=>act(original,{type:'advance'})).toThrow();
    const g=act(original,{type:'sign',id:'ellis'});
    expect(g.business.cash).toBe(540000);expect(original.athlete).toBeNull();
    expect(()=>act(g,{type:'sign',id:'reed'})).toThrow();
    expect(()=>act(g,{type:'stock',units:300})).toThrow();
  });
  it('unlocks sponsors after the third game and resumes deterministically',()=>{
    let g=signed();g=act(g,{type:'advance'});g=act(g,{type:'advance'});
    expect(unlocks(g).sponsor).toBe(false);
    const next=act(g,{type:'advance'});
    expect(unlocks(next).sponsor).toBe(true);
    expect(next).toEqual(act(parseSave(JSON.stringify(g)),{type:'advance'}));
  });
  it('reconciles every cash movement and settles a full 52-week year',()=>{
    let g=signed();for(let i=0;i<12;i++)g=act(g,{type:'advance'});
    const cashBefore=g.business.cash, wins=g.wins;
    g=act(g,{type:'advance'});
    expect(g.tick).toBe(52);expect(g.season).toBe(2028);
    expect(g.business.cash-cashBefore).toBe(80000+wins*9000-40*1200);
    expect(g.business.cash).toBe(600000+g.business.entries.reduce((sum,e)=>sum+e.amount,0));
  });
  it('amortizes a loan across game weeks and offseason without free credit',()=>{
    let g=signed();for(let i=0;i<10;i++)g=act(g,{type:'advance'});
    g=act(g,{type:'loan'});transact(g,'Test reserve',1000000);
    for(let i=0;i<13;i++)g=act(g,{type:'advance'});
    expect(g.tick).toBe(62);expect(g.business.loan?.balance).toBe(0);
    expect(g.business.loan?.paymentsLeft).toBe(0);
    expect(g.business.loan!.interestPaid).toBeGreaterThan(0);
    const repayments=g.business.entries.filter(e=>e.label==='Loan repayment').reduce((sum,e)=>sum-e.amount,0);
    expect(repayments).toBe(150000+g.business.loan!.interestPaid);
    expect(()=>act(g,{type:'loan'})).toThrow();
  });
  it('ends a run after three unresolved weekly shortfalls',()=>{
    let g=signed();transact(g,'Test loss',-1000000);
    for(let i=0;i<3;i++)g=act(g,{type:'advance'});
    expect(g.bankrupt).toBe(true);expect(()=>act(g,{type:'advance'})).toThrow();
  });
  it('activates facilities only after construction and pays player sales shares',()=>{
    let g=signed();for(let i=0;i<9;i++)g=act(g,{type:'advance'});
    transact(g,'Test reserve',1000000);g=act(g,{type:'facility'});
    g=act(g,{type:'stock',units:300});const earnings=g.athlete!.earnings;
    g=act(g,{type:'advance'});
    expect(g.facility).toBe('building');expect(g.athlete!.earnings-earnings).toBe(1200+g.report!.sales*12);
    for(let i=0;i<3;i++)g=act(g,{type:'advance'});
    expect(g.facility).toBe('complete');
  });
  it('rejects malformed saves',()=>{
    expect(()=>parseSave('{')).toThrow();
    const g=signed();g.business.cash=NaN;
    expect(()=>parseSave(JSON.stringify(g))).toThrow();
  });
});
