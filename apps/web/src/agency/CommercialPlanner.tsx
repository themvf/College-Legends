import { useState } from 'react';
import { brands, cash, dealValue, type Athlete, type State, type Action } from './model.js';
import { activeDevelopment } from './growth.js';
import { commercialServices, commercialService, preparedPlayer, type CommercialKind } from './commercial.js';

export function CommercialPlanner({s,p,reviewAction,go}:{s:State;p:Athlete;reviewAction:(a:Action,title:string,lines:string[])=>void;go:(tab:string)=>void}) {
  const [kind,setKind] = useState<CommercialKind>(()=>{const preferred=p.want==='Visibility'?'Social':'Styling';return !p.brandKit?.includes(preferred)?preferred:commercialServices.find(v=>!p.brandKit?.includes(v.kind))?.kind??'Styling';});
  const service = commercialService(kind)!;
  const pending=activeDevelopment(s).find(r=>r.player===p.id);
  const projected=preparedPlayer(p,kind);
  const reason=s.failed?'Agency closed':p.status!=='College'?'Choose a college client':pending||s.jobs.some(j=>j.player===p.id)?'Finish the current preparation first':s.deals.some(d=>d.player===p.id&&d.status==='Active')?'Deliver the current campaign first':p.brandKit?.includes(kind)?'Already prepared':activeDevelopment(s).length+s.jobs.length>=2+s.staff?'All preparation slots are busy':s.week+service.weeks>12?'Too late to finish this season':s.money<service.cost?'Not enough agency cash':'';
  const history=s.growth?.records.filter(r=>r.player===p.id&&r.status==='Complete')??[];
  return <>
    <h2>{p.name.split(' ')[0]}’s next proposal</h2>
    {!!p.brandKit?.length&&<section className="as-panel"><h3>Ready to show sponsors</h3>{p.brandKit.map(k=><p key={k}>✓ {commercialService(k)?.result}</p>)}<button className="as-primary" onClick={()=>go('Deals')}>Review improved offers</button></section>}
    {pending?<section className="as-panel"><h3>{commercialService(pending.kind)?.name??'Existing plan'} in progress</h3><p>{Math.max(0,pending.due-s.week)} weeks left · report in Week {pending.due}.</p><p>Advance the week to finish the work and see new offers.</p><progress aria-label="Preparation progress" max={pending.due-pending.week} value={s.week-pending.week}/></section>:p.brandKit?.length!==3&&<section className="as-panel">
      <label>Who should we hire?<select value={kind} onChange={e=>setKind(e.target.value as CommercialKind)}>{commercialServices.map(v=><option key={v.kind} value={v.kind}>{v.name}{p.brandKit?.includes(v.kind)?' · completed':''}</option>)}</select></label>
      <p>{service.deliverable}</p><strong>{cash(service.cost)} · {service.weeks} week{service.weeks===1?'':'s'}</strong><p>Client time: {service.hours} hours/week · +{service.hours} fatigue/week.</p><p>{service.fit}</p>
      <button className="as-primary" disabled={!!reason} onClick={()=>reviewAction({type:'developmentPlan',id:p.id,kind,skill:0,provider:0},`Review ${service.name}`,[`${p.name}: ${service.deliverable}`,`Pay ${cash(service.cost)} to the provider now. ${service.hours} client hours/week for ${service.weeks} week${service.weeks===1?'':'s'}; +${service.hours} fatigue each week.`,`${service.fit} Results arrive in Week ${s.week+service.weeks}.`, 'This improves future offers. It does not sign a deal or earn money yet.'])}>Review hire · {cash(service.cost)}</button>{reason&&<p>{reason}</p>}
      <details><summary>Compare the money before hiring</summary><div className="as-prep-comparison">{brands.map((b,i)=><div key={b.name}><span>{b.type}</span><strong>{cash(dealValue(p,i))} → {cash(dealValue(projected,i))}</strong><small>Agency commission: {cash(Math.round(dealValue(p,i)*p.fee/100))} → {cash(Math.round(dealValue(projected,i)*p.fee/100))}</small>{projected.recognition<b.min&&<small>Still needs {b.min} public profile.</small>}{i===2&&Math.max(s.reputation,s.growth?.peak??0)<65&&<small>Still needs 65 agency prestige.</small>}</div>)}</div><p className="as-fine">Estimates hold today's school and role constant. The profile gain shown above is included. Signed contracts stay fixed. One of each service per college career.</p></details>
      <button onClick={()=>go('Deals')}>Skip preparation · see current offers</button>
    </section>}
    {!!history.length&&<details className="as-panel"><summary>Preparation reports · {history.length}</summary>{history.map(r=><article key={r.id}><h3>{commercialService(r.kind)?.name??r.kind}</h3><p>{r.result}</p><small>{cash(r.cost)} · {r.year}, Week {r.due}</small></article>)}</details>}
  </>;
}
