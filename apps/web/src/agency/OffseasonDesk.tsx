import { useState } from 'react';
import { cash, decideAgency, depth, schools, conferenceStrength, ratingStars, researchedOutlook, scoutingUpgradeCost, scoutingLevel, dealValue, type State, type Action, type Athlete } from './model.js';
import { activeDevelopment } from './growth.js';
import { offseasonNames, offseasonStage, currentReview, nextAgreement, renewalQuote, schoolCounterQuote, schoolFit, remainingSchoolBudget } from './offseason.js';
type Props = { s: State; update: (fn: (s: State) => State, message?: string) => boolean; go: (tab: string) => void; reviewAction: (action:Action,title:string,lines:string[])=>void; player?:string; selectClient:(id:string)=>void };
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
export function OffseasonLink({s, go}: Pick<Props, 's' | 'go'>) {
  if (s.week < 12) return null;
  const due=s.offseason?.reviews.filter(r=>r.year===s.year&&(r.status==='Open'||r.status==='Renewed'&&!r.settled)).length??0;
  return <section className="as-decision-desk" aria-label="Offseason decisions"><button className="as-primary" onClick={()=>go('Offseason')}>Offseason desk{due&&s.week<=14?` · ${due} clients to review`:''} ↗</button></section>;
}
export function OffseasonPanel({s, update, go, reviewAction,player,selectClient}: Props) {
  const [selected,setSelected]=useState(player??'');
  const rows=s.offseason?.reviews.filter(r=>r.year===s.year)??[];
  const r=rows.find(r=>r.player===selected)??rows[0];
  const p=s.players.find(p=>p.id===r?.player);
  const agreement=p&&nextAgreement(s,p.id);
  const stage=offseasonStage(s);
  const agreements=s.offseason?.agreements.filter(a=>(a.year===s.year||a.season===s.year)&&(p?a.player===p.id:true))??[];
  const finished=!!r&&(r.settled||r.status==='Lost');
  function act(a:Action,msg:string) { update(x=>decideAgency(x,a),msg); }
  return <section className="as-offseason">
    {s.week<12&&<h2>Last offseason</h2>}
    {s.week>=12&&<><p className="as-stage-heading">{stage} / 5 · {offseasonNames[stage-1]}</p><progress aria-label="Offseason timeline" value={stage} max={5}/></>}
    {!rows.length&&<p>Review clients after Week 12. Their performance and your promises shape school offers and loyalty.</p>}
    {rows.length>1&&<label>Offseason client<select value={r?.player} onChange={e=>{setSelected(e.target.value);selectClient(e.target.value);}}>{rows.map(row=><option key={row.player} value={row.player}>{s.players.find(p=>p.id===row.player)?.name} · {row.status==='Lost'?'Left agency':row.settled?'Decision complete':row.status==='Open'?'Renewal due':'Career decision'}</option>)}</select></label>}
    {r&&p&&<article className="as-panel" aria-label={`${p.name} offseason review`}>
      <h3>{p.name}</h3><p>{p.position} · {schools[p.school]!.name}</p>


      {r.status==='Open'&&<><h3>Keep {p.name.split(' ')[0]} as a client</h3><p>{r.chance===100?'They want to stay on current terms.':'Make one final proposal. Missing the deadline loses this client to a rival.'}</p><p>Deadline: end of Offseason 2.</p><div className="as-choice-list">{(r.chance===100 ? ['Keep'] as const : ['Keep','LowerFee','PersonalPlan'] as const).map(approach=>{const q=renewalQuote(s,p,approach);return <button key={approach} disabled={s.failed||s.week>13||s.money<q.cost} onClick={()=>act({type:'renewClient',id:p.id,approach},'Representation decision recorded.')}><strong>{approach==='Keep'?'Renew current terms':approach==='LowerFee'?'Offer a lower commission':'Make a personal plan'}</strong><span>{q.fee}% commission · {cash(q.cost)} cost · {q.chance}% chance</span>{approach==='PersonalPlan'&&<span>Up to +{Math.min(8,100-Math.round(p.trust))} trust if retained; no training.</span>}</button>})}</div></>}
      {r.status==='Lost'&&<p className="as-alert">{r.response}</p>}
      {r.status==='Renewed'&&!finished&&<>
        {!r.routeChosen&&!p.prep&&<><h3>College money or a pro attempt?</h3><p>{p.eligibility>1?`${p.eligibility-1} more college season${p.eligibility===2?'':'s'} available.`:'Final college season. Explore professional opportunities.'}</p><p>College offers show guaranteed money. The draft can pay more, but selection and roster places are uncertain.</p></>}
        {!p.prep&&s.week<=14&&(!r.routeChosen||p.careerPlan==='Draft')&&<div className="as-choice-list"><button className="as-primary" disabled={p.eligibility<=1||s.failed} onClick={()=>act({type:'career',id:p.id,plan:'Return'},'College route selected. Compare school offers before committing.')}><strong>Compare college offers</strong><span>Stay or transfer · no commitment yet</span></button><button disabled={p.schoolYear<3||s.failed||r.routeChosen&&p.careerPlan==='Draft'} onClick={()=>act({type:'career',id:p.id,plan:'Draft'},'Draft path selected. Choose preparation next. College remains available until you book preparation.')}><strong>Explore the draft</strong><span>{p.schoolYear<3?'Available in Year 3':'Leave college for a professional attempt'}</span></button></div>}
        {p.careerPlan==='Return'&&s.week<=14&&<>
          <h3>Choose a school for {s.year+1}</h3><p>Sign by the end of Offseason 3. Compare money with playing time.</p>
          {!r.marketOpened?<button className="as-primary" disabled={s.failed||s.week<13} onClick={()=>act({type:'openSchoolMarket',id:p.id},'School offers received. Compare them, counter once, then sign.')} >{s.week<13?'Offers open in Offseason 2':'Seek school offers · no cost'}</button>:<><p>One counter per client. Rejection removes that offer.</p><div className="as-school-offers">{r.offers.map(o=><SchoolOfferCard key={o.id} s={s} p={p} offerId={o.id} act={act} reviewAction={reviewAction}/>)}</div></>}
          <details><summary>Other career choices</summary><button disabled={s.failed||s.week<13} onClick={()=>reviewAction({type:'staySchool',id:p.id},`Review staying at ${schools[p.school]!.name}`,[`Keep ${p.name} at their current school without a school guarantee.`, 'Closes all school offers for this offseason. New sponsor work is separate.'])}>Stay without a school agreement</button><button disabled={s.failed||p.schoolYear<3} onClick={()=>act({type:'career',id:p.id,plan:'Draft'},'Draft path selected. School offers cannot be signed while on this path.')}>Explore the draft instead</button></details>
        </>}
        {p.careerPlan==='Draft'&&r.routeChosen&&<><h3>{p.prep?'Draft preparation booked':'Prepare for the draft'}</h3><p>{p.prep?'College choices are locked. Advance to Pro Days, then the draft.':'Booking preparation commits this client to the draft.'}</p><button onClick={()=>go('Pro Preparation')}>{p.prep?'View preparation':'Choose draft preparation'}</button></>}
        <details><summary>Draft research & rules</summary><p>{researchedOutlook(p)}</p>{scoutingLevel(p)<3&&s.week<=14&&<button disabled={s.failed||s.money<scoutingUpgradeCost(p,3)} onClick={()=>act({type:'scout',id:p.id,level:3},'Career assessment updated.')}>Research draft outlook · {cash(scoutingUpgradeCost(p,3))}</button>}<p>Decide by the end of Offseason 3. A signed school deal locks college; booked preparation locks the draft. With eligibility left, doing nothing defaults to college without a school agreement.</p></details>
      </>}
      {finished&&r.status==='Renewed'&&<><h3>✓ Career decision complete</h3><p>{agreement?`${schools[agreement.school]!.name} next season. College route locked.`:r.marketResult}</p><p>{agreement?.status==='Paid'?'Payment received. Advance toward next season.':agreement?'Next: advance to Offseason 4 for payment.':'Advance to the next career result.'}</p></>}
      {r.status==='Renewed'&&s.week>=16&&p.careerPlan!=='Return'&&<><h3>{p.pick?`Drafted · Round ${Math.ceil(p.pick/32)}`:p.status}</h3>{p.status==='Undrafted'&&s.week===16&&<button onClick={()=>go('Pro Preparation')}>Arrange team outreach</button>}</>}
            <details><summary>Season review · {cash(r.income)} earned · {r.goalMet?'goal met':'goal missed'}</summary><p>Promise: {r.delivered?'delivered':'outstanding'} · trust {Math.round(r.trust)}/100.</p><p>{r.reason}</p></details>
    </article>}
    {!!agreements.length&&<section aria-label="School agreement receipts"><h3>Your school contracts</h3>{agreements.map(a=><article className="as-panel as-offseason-payoff" key={a.id}><strong>{a.status==='Paid'?'PAYMENT RECEIVED':'SIGNED · PAYMENT DUE'}</strong><h3>{s.players.find(p=>p.id===a.player)?.name} → {schools[a.school]!.name}</h3><p>{a.season} season · {cash(a.gross)} guarantee</p><p>{a.status==='Paid'?`Paid during the ${a.year} offseason, before the ${a.season} season.`:`Pays this offseason (${a.year}), at stage 4.`}</p><p>Client {cash(a.clientNet)} · agency {cash(a.commission)}</p><details><summary>Contract breakdown</summary><p>Agency fee {a.fee}% · cost {cash(a.cost)} · margin {cash(a.commission-a.cost)}.</p><p>School changes next season. Playing time is projected. Sponsors are separate.</p></details></article>)}</section>}
    <details><summary>Full offseason schedule</summary><ol>{offseasonNames.map(name=><li key={name}>{name}</li>)}</ol><p>Five stages cover winter through summer. Playoffs overlap the market. Pro Days, draft, undrafted offers and roster decisions each have a reveal.</p></details>
  </section>;
}
function SchoolOfferCard({s,p,offerId,act,reviewAction}:{s:State;p:Athlete;offerId:string;act:(a:Action,msg:string)=>void;reviewAction:Props['reviewAction']}) {
  const r=currentReview(s,p.id)!,o=r.offers.find(o=>o.id===offerId)!,school=schools[o.school]!;
  const d=depth(p,o.school),q=schoolCounterQuote(s,p,o),fit=schoolFit(p,o,r.offers);
  const commission=Math.round(o.gross*p.fee/100),cost=o.school===p.school?0:2500;
  const busy=s.deals.some(d=>d.player===p.id&&d.status==='Active')||s.jobs.some(j=>j.player===p.id)||activeDevelopment(s).some(d=>d.player===p.id);
  const can=o.status==='Open'&&!r.settled&&!s.failed;
  return <article className="as-panel as-school-offer" aria-label={`${school.name} school offer`}><p>{o.school===p.school?'Stay':'Transfer'} · {o.status}</p><h3>{school.name}</h3><p>{school.division} · Team {stars(ratingStars(school.prestige))}</p><strong className="as-school-value">{cash(o.gross)}</strong><p>{d.role} · {d.snaps}% projected playing time</p><p>Client keeps {cash(o.gross-commission)}<br/>Agency earns {cash(commission)} · cost {cash(cost)}</p><p>{fit.text}</p>
    {o.status==='Open'?<><button className="as-primary" disabled={!can||busy||s.money<cost||o.gross>remainingSchoolBudget(s,o.school)} onClick={()=>reviewAction({type:'signSchool',id:p.id,offer:o.id},`Review ${school.name} agreement`,[`${p.name} → ${school.name} for ${s.year+1}. ${d.role}, ${d.snaps}% projected playing time.`,`Pay ${cash(cost)} now. At this offseason’s draft payday: client ${cash(o.gross-commission)}, agency ${cash(commission)}.`,fit.text,'Signing closes other school offers and the draft path. The school change takes effect next season.'])}>Sign {school.name} agreement</button>{busy&&<p>Finish active campaigns or training before signing.</p>}{r.counterUsed?<p>Counter used · choose from the remaining offers.</p>:<button disabled={!can||!q.affordable} onClick={()=>act({type:'counterSchool',id:p.id,offer:o.id},'School counter resolved. Review the updated offer.')} >Ask for {cash(q.gross)} · {q.chance}% chance</button>}</>:<p>{o.reason}</p>}
    <details><summary>School details & terms</summary><p>{school.conference} · {stars(ratingStars(conferenceStrength(o.school)))}</p><p>{o.reason}</p><p>Agency margin {cash(commission-cost)}. Unsigned local sponsor estimate {cash(dealValue({...p,school:o.school},0))}, separate from this contract.</p><p>School budget remaining {cash(remainingSchoolBudget(s,o.school))}. Declined counters withdraw this offer.</p></details>
  </article>;
}
