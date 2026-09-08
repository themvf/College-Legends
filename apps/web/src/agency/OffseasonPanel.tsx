import { useState } from 'react';
import { cash, decideAgency, depth, schools, conferenceStrength, ratingStars, priorities, researchedOutlook, scoutingUpgradeCost, scoutingLevel, dealValue, type State, type Action, type Athlete } from './model.js';
import { offseasonNames, offseasonStage, currentReview, nextAgreement, renewalQuote, schoolCounterQuote, schoolFit, remainingSchoolBudget } from './offseason.js';

type Props = { s: State; update: (fn: (s: State) => State, message?: string) => boolean; go: (tab: string) => void };
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
export function OffseasonLink({s, go}: Pick<Props, 's' | 'go'>) {
  if (s.week < 12) return null;
  const rows = s.offseason?.reviews.filter(r => r.year === s.year) ?? [];
  const open = rows.filter(r => r.status === 'Open').length;
  const markets = rows.filter(r => r.status === 'Renewed' && !r.settled).length;
  return <section className="as-decision-desk as-offseason-link" aria-label="Offseason decisions">
    <strong>Offseason {offseasonStage(s)} · {offseasonNames[offseasonStage(s) - 1]}</strong>
    <button onClick={() => go('Offseason')}>Open offseason desk{open ? ` · ${open} representation review${open === 1 ? '' : 's'}` : markets && s.week <= 14 ? ` · ${markets} career decision${markets === 1 ? '' : 's'}` : ''} ↗</button>
    <small>{s.week <= 13 ? 'Contested renewals close after Offseason 2. School agreements close after Offseason 3.' : s.week === 14 ? 'Last chance to sign school offers or choose the draft path. Advancing closes offers.' : 'Follow draft outcomes, school paydays and your next-season clients.'}</small>
  </section>;
}
export function OffseasonPanel({s, update, go}: Props) {
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState('');
  const rows = s.offseason?.reviews.filter(r => r.year === s.year) ?? [];
  const r = rows.find(r => r.player === selected) ?? rows[0];
  const p = s.players.find(p => p.id === r?.player);
  const stage = offseasonStage(s);
  function act(a: Action) {
    const ok = update(x => decideAgency(x, a));
    if (ok) setResult('Decision saved. Your client’s response and updated terms are below.');
  }
  const agreements = s.offseason?.agreements.filter(a => a.year === s.year || (s.week === 0 && a.season === s.year)) ?? [];
  function handoffSummary(player: string) { const agreement = agreements.find(a => a.player === player); return agreement ? `${schools[agreement.school]!.name} · ${cash(agreement.gross)} school agreement for ${agreement.season}. ${agreement.status === 'Paid' ? `Paid: client ${cash(agreement.clientNet)}, agency ${cash(agreement.commission)}.` : 'Payment pending.'}` : 'Representation renewed; no school agreement signed.'; }
  const previous = s.offseason?.reviews.filter(r => r.year === s.year - 1) ?? [];
  return <section className="as-offseason">
    <span className="as-eyebrow">THE SEASON BUILT THEIR VALUE. NOW MAKE YOUR MOVE.</span>
    <h2>Your clients. Their next chapter.</h2>
    <p>Keep their trust. Compare school money and playing opportunity. Take the right clients to the draft.</p>
    <ol className="as-offseason-timeline" aria-label="Offseason timeline">
      {offseasonNames.map((name, i) => <li key={name} aria-current={stage === i + 1 ? 'step' : undefined}><strong>{i + 1}</strong><span>{name}</span></li>)}
    </ol>
    <p className="as-fine">Five compressed stages cover winter through summer. Playoffs run alongside the early market; Pro Days and the draft have separate reveals, as do undrafted offers and roster decisions. Each advance charges the displayed weekly overhead in Finances.</p>
    {result && <p role="status" className="as-notice">{result}</p>}
    {s.week < 12 && <div className="as-panel"><h3>{s.week === 0 && previous.length ? 'Your new season starts here' : 'The market opens after the regular season'}</h3><p>Performances, client goals and delivered promises shape offseason offers and loyalty. At the end of Week 12, this desk becomes your career review.</p>{previous.map(r => <p key={r.player}><strong>{s.players.find(p => p.id === r.player)?.name}</strong> · {r.status === 'Lost' ? r.response : handoffSummary(r.player)}</p>)}<button onClick={() => go('Clients')}>Open client files ↗</button></div>}
    {!!rows.length && <div className="as-client-tabs" aria-label="Offseason clients">{rows.map(row => <button key={row.player} aria-pressed={r?.player === row.player} onClick={() => { setSelected(row.player); setResult(''); }}>{s.players.find(p => p.id === row.player)?.name} · {row.status === 'Lost' ? 'Representation lost' : row.status === 'Open' ? 'Review due' : 'Retained'}</button>)}</div>}
    {p && r && <article className="as-panel as-career-review" aria-label={`${p.name} offseason review`}>
      <span className="as-eyebrow">{p.position} · {schools[p.school]!.name} · {priorities[p.want].label}</span>
      <h2>{p.name}</h2>
      <div className="as-offseason-stats"><div><small>Client sponsor income this season</small><strong>{cash(r.income)}</strong></div><div><small>Promised service</small><strong>{r.delivered ? 'Delivered' : 'Outstanding'}</strong></div><div><small>Season goal</small><strong>{r.goalMet ? 'Achieved' : 'Not achieved'}</strong></div><div><small>Trust at review</small><strong>{Math.round(r.trust)} / 100</strong></div></div>
      <p>{r.reason}</p>
      {r.status === 'Open' && <>
        <h3>Keep your client · deadline: end of Offseason 2</h3>
        <p>One final proposal. Your prestige and record of support affect retention. A rival can win representation without moving the player’s school.</p>
        <div className="as-choice-list">{(['Keep','LowerFee','PersonalPlan'] as const).map(approach => { const q = renewalQuote(s, p, approach); return <button key={approach} disabled={s.failed || s.week > 13 || s.money < q.cost} onClick={() => act({type:'renewClient', id:p.id, approach})}><strong>{approach === 'Keep' ? 'Renew current terms' : approach === 'LowerFee' ? 'Offer a lower commission' : 'Make a personal plan'}</strong><small>{q.fee}% future commission · {cash(q.cost)} cost · {q.chance}% retention chance{approach === 'PersonalPlan' ? ' · trust +8 if retained; does not count as training' : ''}</small></button>; })}</div>
        <p className="as-fine">{r.chance === 100 ? 'Your satisfied client will also renew the current terms if you advance.' : 'Ignoring this review through Offseason 2 loses representation. Planning costs are spent even if the client declines.'}</p>
      </>}
      {r.response && <p className={r.status === 'Lost' ? 'as-alert' : 'as-notice'}>{r.response}</p>}
      {r.status === 'Renewed' && <>
        <h3>{s.week <= 14 ? 'Choose the next career chapter' : 'Career decision'}</h3>
        <p>{p.eligibility > 1 ? `${p.eligibility - 1} college season${p.eligibility > 2 ? 's remain' : ' remains'} after this year. Staying or transferring keeps the college route open.` : 'Final eligible college season. The school market is unavailable; prepare for professional opportunities.'}</p>
        {!nextAgreement(s,p.id) && <p className="as-fine">The draft can bring a larger professional signing payment and agency commission, but being selected and making a roster are uncertain. Research estimates the opportunity; it does not buy a draft place.</p>}
        <p><strong>{researchedOutlook(p)}</strong></p>
        {scoutingLevel(p) < 3 && s.week <= 14 && <button disabled={s.failed || s.money < scoutingUpgradeCost(p, 3)} onClick={() => act({type:'scout', id:p.id, level:3})}>Research current draft outlook · {cash(scoutingUpgradeCost(p, 3))}</button>}
        <div className="as-buttons">
          <button aria-pressed={p.careerPlan === 'Return'} disabled={s.failed || s.week > 14 || p.eligibility <= 1 || !!p.prep || !!nextAgreement(s,p.id)} onClick={() => act({type:'career', id:p.id, plan:'Return'})}>Explore another college season</button>
          <button aria-pressed={p.careerPlan === 'Draft'} disabled={s.failed || s.week > 14 || p.schoolYear < 3 || !!nextAgreement(s,p.id)} onClick={() => act({type:'career', id:p.id, plan:'Draft'})}>Choose the draft path</button>
        </div>
        <p className="as-fine">Current plan: {!r.routeChosen && p.eligibility > 1 ? 'awaiting your career decision; defaults to returning if you do not choose' : p.careerPlan === 'Return' ? 'another college season' : 'draft attempt'}. Draft entry in this demo opens in Year 3. Decide by the end of Offseason 3. A signed school agreement locks the college route; booked Pro Day preparation locks the draft route. Selection is never guaranteed.</p>
        {p.careerPlan === 'Draft' && <button onClick={() => go('Pro Preparation')}>Arrange draft preparation ↗</button>}
        {p.careerPlan === 'Return' && s.week <= 14 && !r.settled && <>
          <h3>School offers for {s.year + 1}</h3>
          <p>Compare the guarantee, projected snaps and commercial stage. Your current school can pay to retain you. Prestige {Math.round(s.reputation)} helps you access schools and negotiate; it does not guarantee a starting job.</p>
          {!r.marketOpened && <button className="as-primary" disabled={s.failed || s.week < 13} onClick={() => act({type:'openSchoolMarket',id:p.id})}>{s.week < 13 ? 'School interest opens in Offseason 2' : 'Seek school offers · no cost'}</button>}
          {r.marketOpened && <p className="as-fine">Close by the end of Offseason 3. One counter per client; a declined counter withdraws that offer. Offers share each school’s finite budget. Current campaigns and training must finish before commitment.</p>}
          <div className="as-school-offers">{r.offers.map(o => <SchoolOfferCard key={o.id} s={s} p={p} offerId={o.id} act={act} />)}</div>
          {s.week >= 13 && <button disabled={s.failed} onClick={() => act({type:'staySchool',id:p.id})}>Stay at {schools[p.school]!.name} without a school agreement</button>}
        </>}
        {r.marketResult && <p className="as-notice">{r.marketResult}</p>}
        {p.careerPlan === 'Return' && s.week >= 15 && <p>Your school agreement begins next season. New sponsor campaigns open in preseason, using the new school and role.</p>}
        {s.week >= 16 && p.careerPlan !== 'Return' && <div className="as-offseason-payoff"><h3>{p.pick ? `Drafted · Round ${Math.ceil(p.pick/32)}, Pick ${(p.pick-1)%32+1}` : p.status === 'Undrafted' ? 'Undrafted · another route remains' : p.status}</h3><p>{p.status === 'Unsigned' ? 'No roster place secured. Earned signing income stays earned; this first demo has no further professional representation without a roster.' : p.status === 'Pro' ? 'A professional roster and a continuing agency relationship.' : 'Follow the next reveal to learn whether this becomes a professional roster place.'}</p>{s.week === 16 && p.status === 'Undrafted' && <button onClick={() => go('Pro Preparation')}>Arrange team outreach ↗</button>}</div>}
      </>}
    </article>}
    {!!agreements.length && <section aria-label="School agreement receipts"><h2>The deals you brought home</h2><div className="as-grid">{agreements.map(a => <article className="as-panel as-offseason-payoff" key={a.id}><span className="as-eyebrow">{a.status === 'Paid' ? 'PAYMENT RECEIVED' : 'SIGNED · PAYS AT DRAFT WEEKEND'}</span><h3>{s.players.find(p => p.id === a.player)?.name} → {schools[a.school]!.name}</h3><p>{a.season} season · {cash(a.gross)} school guarantee</p><p>{a.status === 'Paid' ? `Paid during the ${a.year} offseason, before the ${a.season} season.` : `Pays this offseason (${a.year}), at stage 4 · Draft & paydays, before the ${a.season} season begins.`}</p><dl><dt>Client take-home</dt><dd>{cash(a.clientNet)}</dd><dt>Agency commission ({a.fee}%)</dt><dd>{cash(a.commission)}</dd><dt>Agency support cost</dt><dd>{cash(a.cost)}</dd><dt>Agency margin</dt><dd>{cash(a.commission-a.cost)}</dd></dl><p className="as-fine">Fictional school compensation, paid upfront at the offseason settlement. Separate from sponsor campaigns. The next-season role remains a projection.</p></article>)}</div></section>}
  </section>;
}
function SchoolOfferCard({s,p,offerId,act}:{s:State;p:Athlete;offerId:string;act:(a:Action)=>void}) {
  const r = currentReview(s,p.id)!;
  const o = r.offers.find(o=>o.id===offerId)!;
  const school=schools[o.school]!;
  const d=depth(p,o.school), q=schoolCounterQuote(s,p,o), fit=schoolFit(p,o,r.offers);
  const commission=Math.round(o.gross*p.fee/100), cost=o.school===p.school?0:2500;
  const can=o.status==='Open'&&!r.settled&&!s.failed;
  return <article className="as-panel as-school-offer" aria-label={`${school.name} school offer`}>
    <span className="as-eyebrow">{o.school===p.school?'STAY OFFER':'TRANSFER OFFER'} · {o.status}</span><h3>{school.name}</h3>
    <p>{school.division} · {school.conference}</p>
    <p aria-label={`Team ${ratingStars(school.prestige)} of 5 stars; conference ${ratingStars(conferenceStrength(o.school))} of 5 stars`}>Team {stars(ratingStars(school.prestige))}<br/>Conference {stars(ratingStars(conferenceStrength(o.school)))}</p>
    <strong className="as-school-value">{cash(o.gross)}</strong><p>One-season school guarantee</p>
    <dl><dt>Projected role</dt><dd>{d.role} · {p.position}{d.rank} · {d.snaps}% snaps</dd><dt>Client take-home</dt><dd>{cash(o.gross-commission)}</dd><dt>Agency commission</dt><dd>{cash(commission)}</dd><dt>Agency cost / margin</dt><dd>{cash(cost)} / {cash(commission-cost)}</dd><dt>Separate local sponsor quote</dt><dd>{cash(dealValue({...p,school:o.school},0))}</dd></dl>
    <p>{o.reason}</p><p>{fit.text}</p>
    <p className="as-fine">Uncommitted school budget: {cash(remainingSchoolBudget(s,o.school))}. Sponsor quote is an unsigned estimate, excluded from this guarantee. School destination applies next season.</p>
    <div className="as-choice-list"><button className="as-primary" disabled={!can||s.money<cost||o.gross>remainingSchoolBudget(s,o.school)} onClick={()=>act({type:'signSchool',id:p.id,offer:o.id})}>Sign {school.name} agreement</button>
    {r.counterUsed ? <p className="as-fine">Counter used · choose from the remaining offers.</p> : <button disabled={!can||!q.affordable} onClick={()=>act({type:'counterSchool',id:p.id,offer:o.id})}>Ask for {cash(q.gross)} · {q.chance}% chance<small>{!q.affordable ? 'Remaining school budget cannot fund this counter.' : `${q.competing?'A competing offer strengthens your case.':'Your prestige supports the request.'} Rejection withdraws this offer.`}</small></button>}</div>
  </article>;
}
