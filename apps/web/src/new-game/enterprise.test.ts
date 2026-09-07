import { describe, expect, it } from 'vitest';
import { decide, homeDates, restoreEnterprise, startEnterprise, type Enterprise } from './enterprise.js';
const start=()=>decide(startEnterprise(42),'town');
function finishYear(g:Enterprise,build=false,road=true){let steps=0;while(!['renewals','ended'].includes(g.stage)&&steps++<30){g=decide(g,g.stage==='partner'?'partner':g.stage==='schedule'?(road?'away':'home'):g.stage==='capital'?(build?'build':'defer'):g.stage==='annual'?'next':'continue');}return g;}
describe('connected enterprise',()=>{
 it('pays campaign costs once and collects advance sales once',()=>{
  const before=startEnterprise(42),g=decide(before,'town');
  expect(before.lines).toHaveLength(0);expect(g.cash).toBe(600000-28000+g.tickets*132);
  expect(()=>decide(g,'town')).toThrow();
  const match=decide(decide(g,'continue'),'continue');
  expect(match.lines.filter(x=>x.label==='Season packages · collected before kickoff')).toHaveLength(1);
  expect(match.lines.find(x=>x.label==='Single-game admissions')?.amount).toBe((match.attendance-g.tickets)*28);
 });
 it('restores deterministic outcomes and reconciles every operating dollar',()=>{
  const g=start();expect(decide(restoreEnterprise(JSON.stringify(g)),'continue')).toEqual(decide(g,'continue'));
  const end=finishYear(g,true);expect(end.cash).toBe(600000+end.lines.reduce((s,l)=>s+l.amount,0));
  expect(end.grant).toBe(220000);expect(end.restrictedSpent).toBe(220000);
  expect(end.lines.some(l=>l.amount===220000)).toBe(false);
 });
 it('changes next season inventory, then settles the contracted road payment in that season',()=>{
  const next=finishYear(start());expect(next.year).toBe(2028);expect(homeDates(next)).toBe(5);
  expect(next.lines.some(l=>l.label.includes('road guarantee'))).toBe(false);
  const after=finishYear(decide(next,'phone'),false,false);
  expect(after.lines.find(l=>l.label.includes('road guarantee'))?.amount).toBe(180000);
  expect(after.lines.find(l=>l.label==='Road-game travel allocation')?.amount).toBe(-45000);
  expect(homeDates(after)).toBe(6);
 });
 it('limits local sponsorship to remaining home dates and expires it annually',()=>{
  const next=finishYear(start());
  expect(next.lines.filter(l=>l.label.includes('Local partner'))).toHaveLength(5);
  expect(next.sponsor).toBe(false);
 });
 it('ends authority at the disclosed reserve threshold, not on an arbitrary weekly loss',()=>{
  const g=startEnterprise(5);g.stage='annual';g.cash=180000;g.lines=[{year:2027,label:'Prior commitments',amount:-420000}];
  const end=decide(g,'next');expect(end.cash).toBe(85000);expect(end.stage).toBe('ended');
  expect(()=>decide(end,'next')).toThrow();
 });
 it('rejects insufficient matching funds and damaged or unreconciled saves',()=>{
  const g=startEnterprise(5);g.stage='capital';g.cash=200000;
  expect(()=>decide(g,'build')).toThrow();expect(g.grant).toBe(0);
  expect(()=>restoreEnterprise(JSON.stringify(g))).toThrow();expect(()=>restoreEnterprise('{}')).toThrow();
 });
});
