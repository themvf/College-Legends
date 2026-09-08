import { cash, depth, teams, type Athlete, type State, type Want } from './model.js';
import { activeDevelopment } from './growth.js';
import { currentReview, nextAgreement } from './offseason.js';

export function promiseTask(want: Want) {
  return want === 'Security' ? 'Deliver a paying sponsor campaign' : want === 'Visibility' ? 'Complete media work or a sponsor campaign' : 'Complete football skills training';
}
export function nextClientStep(s: State, p: Athlete) {
  const agreement = nextAgreement(s, p.id);
  const review = currentReview(s, p.id);
  const campaign = s.deals.find(d => d.player === p.id && d.status === 'Active');
  const training = activeDevelopment(s).find(d => d.player === p.id);
  if (p.status !== 'College') return { title: p.status === 'Undrafted' ? 'Find a professional roster' : 'Follow the pro career', detail: 'Review signing and roster results.', tab: 'Pro Preparation', action: 'Open pro career' };
  if (s.week >= 12) return { title: agreement ? 'School contract secured' : review?.status === 'Open' ? 'Renew representation' : 'Choose the next career move', detail: agreement ? `${teams[agreement.school]} next season · ${cash(agreement.commission)} agency commission ${agreement.status === 'Paid' ? 'paid' : 'due at the draft payday'}.` : 'Handle renewal, college offers or the draft in one place.', tab: 'Offseason', action: 'Open offseason decision' };
  if (campaign) return { title: 'Campaign in progress', detail: `${campaign.brand} · ${campaign.left} week${campaign.left === 1 ? '' : 's'} to payment. Advance the week to deliver it.`, tab: 'Deals', action: 'View active campaign' };
  if (training) return { title: 'Training in progress', detail: 'Advance the week to complete sessions and receive a report.', tab: 'Development', action: 'View training' };
  if (!p.delivered) return { title: 'Deliver your promise', detail: promiseTask(p.promise) + '.', tab: p.promise === 'Security' ? 'Deals' : 'Development', action: p.promise === 'Security' ? 'Find a sponsor deal' : 'Arrange client support' };
  return { title: 'Build the next payday', detail: 'Your promise is delivered. Seek another deal or advance to see how the season changes their opportunities.', tab: 'Deals', action: 'Find a sponsor deal' };
}
export function ClientJourney({s,p,go}:{s:State;p:Athlete;go:(tab:string)=>void}) {
  const next = nextClientStep(s,p);
  return <section className="as-panel as-client-journey" aria-label={`${p.name} career path`}>
    <div className="as-career-track" aria-label="Career path"><span>✓ Sign client</span><span aria-current={s.week < 12 ? 'step' : undefined}>Earn & build</span><span aria-current={s.week >= 12 ? 'step' : undefined}>Renew / move / draft</span></div>
    <h3>{next.title}</h3><p>{next.detail}</p>
    <button className="as-primary" onClick={()=>go(next.tab)}>{next.action}</button>
  </section>;
}
export function ClientHomeCard({s,p,go}:{s:State;p:Athlete;go:(tab:string)=>void}) {
  const next=nextClientStep(s,p);
  return <article className="as-panel as-home-client"><h3>{p.name}</h3><p>{p.position} · {teams[p.school]} · {p.status === 'College' ? depth(p).role : p.status}</p><strong>{next.title}</strong><p>{next.detail}</p><button className="as-primary" onClick={()=>go(next.tab)}>{next.action}</button><button onClick={()=>go('Clients')}>Client hub</button></article>;
}
