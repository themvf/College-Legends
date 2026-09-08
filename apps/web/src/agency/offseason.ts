import { cash, schools, depth, roll, type State, type Athlete } from './model.js';

export type SchoolOffer = {
  id: string; school: number; gross: number; original: number;
  status: 'Open' | 'Withdrawn' | 'Signed' | 'Closed'; reason: string;
};
export type CareerReview = {
  player: string; year: number; status: 'Open' | 'Renewed' | 'Lost';
  trust: number; delivered: boolean; goalMet: boolean; income: number;
  rival: string; rivalPrestige: number; reason: string; chance: number;
  response?: string; offers: SchoolOffer[]; marketOpened: boolean;
  counterUsed: boolean; marketResult?: string; settled: boolean;
  routeChosen?: boolean;
};
export type SchoolAgreement = {
  id: string; player: string; year: number; season: number; school: number;
  formerSchool: number; gross: number; fee: number; cost: number;
  status: 'Signed' | 'Paid'; commission: number; clientNet: number;
};
export type OffseasonState = {
  reviews: CareerReview[]; agreements: SchoolAgreement[];
  budgets: { year: number; school: number; total: number; committed: number }[];
};
export type OffseasonAction =
  | { type: 'renewClient'; id: string; approach: 'Keep' | 'LowerFee' | 'PersonalPlan' }
  | { type: 'openSchoolMarket'; id: string }
  | { type: 'counterSchool'; id: string; offer: string }
  | { type: 'signSchool'; id: string; offer: string }
  | { type: 'staySchool'; id: string };

const cap = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const offseasonStage = (s: State) => s.week < 12 ? 0 : s.week <= 14 ? s.week - 11 : s.week <= 16 ? 4 : 5;
export const offseasonNames = ['Career review', 'Transfer market', 'Commitments & preparation', 'Draft & paydays', 'Next-season handoff'];
export const currentReview = (s: State, id: string) => s.offseason?.reviews.find(r => r.player === id && r.year === s.year);
export const nextAgreement = (s: State, id: string) => s.offseason?.agreements.find(a => a.player === id && a.season === s.year + 1);
export function initializeOffseason(s: State) {
  s.offseason ??= { reviews: [], agreements: [], budgets: [] };
}
function ledger(s: State, label: string, amount: number, kind: 'Expense' | 'Commission') {
  if (!amount) return;
  if (amount < 0 && s.money < -amount) throw Error(`This needs ${cash(-amount)}. You have ${cash(s.money)}.`);
  s.money += amount;
  s.ledger.push({ year: s.year, week: s.week, label, amount, kind });
}
export function ensureCareerReviews(s: State) {
  initializeOffseason(s);
  if (s.week < 12 || s.week > 14) return;
  for (const p of s.players.filter(p => p.owner === 'you' && p.status === 'College' && p.season === s.year)) {
    if (currentReview(s, p.id)) continue;
    const goalMet = !!s.gameplay?.ambitions.find(a => a.player === p.id && a.year === s.year)?.completed;
    const income = s.deals.filter(d => d.player === p.id && d.year === s.year && d.status === 'Paid')
      .reduce((sum, d) => sum + d.gross - Math.round(d.gross * d.fee / 100), 0);
    const rival = [...s.rivals].sort((a, b) => (b.style === p.want ? 30 : 0) + b.reputation - ((a.style === p.want ? 30 : 0) + a.reputation))[0]!;
    const loyal = p.delivered && p.trust >= 75;
    const chance = loyal ? 100 : Math.round(cap(25 + p.trust * .55 + (p.delivered ? 15 : -12) + (goalMet ? 8 : 0) + s.reputation * .18 - Math.max(0, rival.reputation - s.reputation) * .1, 10, 95));
    s.offseason!.reviews.push({ player: p.id, year: s.year, status: s.week === 14 ? 'Renewed' : 'Open', trust: p.trust,
      delivered: p.delivered, goalMet, income, rival: rival.id, rivalPrestige: rival.reputation,
      reason: loyal ? 'You delivered the promised service and earned strong trust. This client wants to continue.' :
        `${p.delivered ? 'The promised service was delivered' : 'The promised service is still outstanding'}; trust is ${Math.round(p.trust)}. ${rival.name} is offering a fresh start.`,
      chance, offers: [], marketOpened: false, counterUsed: false, settled: false,
      routeChosen: p.eligibility <= 1 || !!p.prep || p.careerPlan === 'Return',
      ...(s.week === 14 ? { response: 'Existing late-offseason representation preserved. You can still finalize school or draft commitments.' } : {}) });
  }
}
export function renewalQuote(s: State, p: Athlete, approach: 'Keep' | 'LowerFee' | 'PersonalPlan') {
  const r = currentReview(s, p.id)!;
  const fee = approach === 'LowerFee' ? Math.max(5, p.fee - 5) : p.fee;
  const cost = approach === 'PersonalPlan' ? 2000 : 0;
  return { fee, cost, chance: Math.min(100, r.chance + (approach === 'LowerFee' && fee < p.fee ? 18 : approach === 'PersonalPlan' ? 12 : 0)) };
}
function loseClient(s: State, p: Athlete, r: CareerReview, why: string) {
  r.status = 'Lost'; r.settled = true;
  p.representedByYou = true;
  p.owner = r.rival;
  p.careerPlan = p.prep ? 'Draft' : p.eligibility > 1 ? 'Return' : 'Draft';
  r.response = `${why} ${p.name} chose ${s.rivals.find(v => v.id === r.rival)!.name}. School and representation are separate: no school move was made. Existing signed campaign commissions remain payable to your agency.`;
  s.news.unshift(r.response);
}
function budget(s: State, school: number) {
  let b = s.offseason!.budgets.find(b => b.year === s.year && b.school === school);
  if (!b) {
    b = { year: s.year, school, total: Math.round((150000 + schools[school]!.prestige ** 2 * 140) / 1000) * 1000, committed: 0 };
    s.offseason!.budgets.push(b);
  }
  return b;
}
export function remainingSchoolBudget(s: State, school: number) {
  const b = s.offseason?.budgets.find(b => b.year === s.year && b.school === school);
  return b ? b.total - b.committed : 0;
}
function createOffers(s: State, p: Athlete, r: CareerReview) {
  const current = schools[p.school]!;
  const candidates = schools.map((school, id) => ({ ...school, id }))
    .filter(school => school.id !== p.school && p.ability >= school.competition - 10 &&
      school.prestige <= current.prestige + 18 + s.reputation * .5 + Math.max(0, p.ability - 75) * 2);
  const starter = [...candidates].filter(c => depth(p, c.id).rank === 1)
    .sort((a, b) => b.prestige - a.prestige)[0];
  const exposure = [...candidates].filter(c => c.id !== starter?.id)
    .sort((a, b) => b.prestige - a.prestige)[0];
  const ids = [p.school, ...[starter?.id, exposure?.id].filter((id): id is number => id !== undefined)];
  const average = p.boxes.length ? p.boxes.reduce((n, b) => n + b.points, 0) / p.boxes.length : 0;
  r.offers = ids.map((school): SchoolOffer => {
    const place = schools[school]!;
    const demand = .85 + roll(s.seed, `${s.year}-${school}-${p.position}-demand`) * .35;
    const value = (20000 + Math.max(0, p.ability - 60) ** 2 * 140 + average * 900 + p.recognition * 450)
      * (.7 + place.prestige / 100) * (.65 + .35 * depth(p, school).snaps / 85) * demand;
    const available = budget(s, school).total - budget(s, school).committed;
    const gross = Math.max(0, Math.min(Math.round(value / 1000) * 1000, available));
    return { id: `${r.year}-${p.id}-${school}`, school, gross, original: gross, status: 'Open',
      reason: school === p.school ? 'Your current school wants to retain you.' : depth(p, school).rank === 1 ? 'Your recent production fits a projected starting opportunity.' : 'A larger platform, with competition for playing time.' };
  }).filter(o => o.gross >= 1000);
  r.marketOpened = true;
}
export function schoolCounterQuote(s: State, p: Athlete, offer: SchoolOffer) {
  const r = currentReview(s, p.id)!;
  const competing = r.offers.some(o => o.school !== offer.school && o.status === 'Open' && o.gross >= offer.gross);
  const gross = Math.round(offer.gross * (1.12 + Math.min(s.reputation, 85) / 1000) / 1000) * 1000;
  const affordable = gross <= remainingSchoolBudget(s, offer.school);
  return { chance: affordable ? Math.round(Math.min(90, 45 + s.reputation * .4 + (competing ? 18 : 0))) : 0,
    gross, competing, affordable };
}
export function schoolFit(p: Athlete, offer: SchoolOffer, all: SchoolOffer[]) {
  const max = Math.max(...all.filter(o => o.status === 'Open').map(o => o.gross), offer.gross);
  if (p.want === 'Security') return offer.gross >= max ? { trust: 4, text: 'Best available guarantee matches the income priority.' } : { trust: -3, text: 'Lower guaranteed income than another open offer: trust −3.' };
  if (p.want === 'Development') return depth(p, offer.school).rank === 1 ? { trust: 4, text: 'Projected starting snaps match the development priority.' } : { trust: -4, text: 'Limited projected playing time conflicts with development: trust −4.' };
  return schools[offer.school]!.prestige >= schools[p.school]!.prestige ? { trust: 4, text: 'An established or larger stage supports the visibility priority.' } : { trust: -3, text: 'A smaller stage conflicts with visibility: trust −3.' };
}
export function offseasonAction(s: State, a: OffseasonAction) {
  ensureCareerReviews(s);
  const p = s.players.find(p => p.id === a.id && p.owner === 'you' && p.status === 'College');
  const r = currentReview(s, a.id);
  if (!p || !r) throw Error('Choose a currently represented college client with a career review.');
  if (a.type === 'renewClient') {
    if (s.week < 12 || s.week > 13 || r.status !== 'Open') throw Error('Representation review closes after Offseason 2; respond only once.');
    if (!['Keep', 'LowerFee', 'PersonalPlan'].includes(a.approach)) throw Error('Choose a renewal approach.');
    const q = renewalQuote(s, p, a.approach);
    ledger(s, `${p.name} · renewal planning`, -q.cost, 'Expense');
    const success = roll(s.seed, `${s.year}-${p.id}-renewal`) * 100 < q.chance;
    if (!success) { loseClient(s, p, r, 'Your final renewal proposal was declined.'); return; }
    p.fee = q.fee; p.trust = cap(p.trust + (a.approach === 'PersonalPlan' ? 8 : 3));
    r.status = 'Renewed';
    r.response = `${p.name} renewed at ${q.fee}% commission. ${q.cost ? `${cash(q.cost)} planning cost paid. ` : ''}Next: choose a college opportunity or an eligible draft attempt.`;
    s.news.unshift(r.response); return;
  }
  if (r.status !== 'Renewed') throw Error('Resolve representation before arranging next-season business.');
  if (s.week < 13 || s.week > 14 || p.eligibility <= 1 || p.careerPlan !== 'Return' || p.prep) throw Error('The school market opens in Offseason 2–3 for returning clients with eligibility.');
  if (r.settled || nextAgreement(s, p.id)) throw Error('This school decision is already committed.');
  if (a.type === 'openSchoolMarket') {
    if (r.marketOpened) throw Error('School interest has already been explored.');
    createOffers(s, p, r);
    s.news.unshift(`${p.name}: ${r.offers.length} school offers received. Your prestige ${Math.round(s.reputation)} helps determine access; ability, season production, exposure and school need determine value. Compare and close by the end of Offseason 3.`);
    return;
  }
  if (a.type === 'staySchool') {
    r.settled = true; r.marketResult = `Staying at ${schools[p.school]!.name} without a new school compensation agreement. Sponsor opportunities remain separate.`;
    r.offers.forEach(o => { if (o.status === 'Open') o.status = 'Closed'; });
    s.news.unshift(`${p.name}: ${r.marketResult}`); return;
  }
  const offer = r.offers.find(o => o.id === a.offer && o.status === 'Open');
  if (!offer) throw Error('Choose an open school offer.');
  if (a.type === 'counterSchool') {
    if (r.counterUsed) throw Error('One school counter is available per client this offseason.');
    const q = schoolCounterQuote(s, p, offer);
    if (!q.affordable) throw Error('The school cannot fund that counter. Its remaining budget is shown on the offer.');
    r.counterUsed = true;
    if (q.gross <= remainingSchoolBudget(s, offer.school) && roll(s.seed, `${offer.id}-counter`) * 100 < q.chance) {
      offer.gross = q.gross; offer.reason = `Counter accepted: ${cash(offer.original)} → ${cash(offer.gross)}. Close before the end of Offseason 3.`;
    } else { offer.status = 'Withdrawn'; offer.reason = 'The school withdrew after your counter. Other open offers and staying remain available.'; }
    s.news.unshift(`${p.name} · ${schools[offer.school]!.name}: ${offer.reason}`); return;
  }
  if (s.deals.some(d => d.player === p.id && d.status === 'Active') || s.jobs.some(j => j.player === p.id) || s.growth?.records.some(d => d.player === p.id && d.status === 'Active')) throw Error('Finish current campaign and development commitments before signing the school agreement.');
  const b = budget(s, offer.school);
  if (offer.gross > b.total - b.committed) throw Error('This school no longer has enough uncommitted budget. Choose another offer.');
  const cost = offer.school === p.school ? 0 : 2500;
  ledger(s, `${p.name} · next-season school agreement support`, -cost, 'Expense');
  const fit = schoolFit(p, offer, r.offers);
  p.trust = cap(p.trust + fit.trust);
  const commission = Math.round(offer.gross * p.fee / 100);
  s.offseason!.agreements.push({ id: offer.id, player: p.id, year: s.year, season: s.year + 1, school: offer.school,
    formerSchool: p.school, gross: offer.gross, fee: p.fee, cost, status: 'Signed', commission, clientNet: offer.gross - commission });
  b.committed += offer.gross;
  r.offers.forEach(o => { o.status = o.id === offer.id ? 'Signed' : o.status === 'Open' ? 'Closed' : o.status; });
  r.settled = true;
  r.marketResult = `${schools[offer.school]!.name} committed for ${s.year + 1}: ${cash(offer.gross)} guarantee; client keeps ${cash(offer.gross - commission)}, agency receives ${cash(commission)} on Draft & paydays. ${fit.text} Current-season team stays unchanged.`;
  s.news.unshift(`${p.name}: ${r.marketResult}`);
}
export function offseasonBeforeAdvance(s: State) {
  ensureCareerReviews(s);
  if (s.week === 13) for (const r of s.offseason!.reviews.filter(r => r.year === s.year && r.status === 'Open')) {
    const p = s.players.find(p => p.id === r.player)!;
    if (r.chance === 100) {
      r.status = 'Renewed'; r.response = 'Your satisfied client renewed on the existing terms.';
      s.news.push(`${p.name}: ${r.response}`);
    } else loseClient(s, p, r, 'The warned renewal deadline passed without a response.');
  }
  if (s.week === 14) for (const r of s.offseason!.reviews.filter(r => r.year === s.year && r.status === 'Renewed' && !r.settled)) {
    const p = s.players.find(p => p.id === r.player)!;
    if (!r.routeChosen && p.eligibility > 1 && !p.prep) p.careerPlan = 'Return';
    r.settled = true;
    r.offers.forEach(o => { if (o.status === 'Open') o.status = 'Closed'; });
    r.marketResult = p.careerPlan === 'Return' ? `The market closed. Staying at ${schools[p.school]!.name} without a new school agreement.` : 'Draft declaration committed; college offers closed.';
    s.news.push(`${p.name}: ${r.marketResult}`);
  }
}
export function offseasonAfterWeek(s: State) {
  ensureCareerReviews(s);
  if (s.week === 12) s.news.unshift('Offseason 1: review your clients and defend representation. Contested renewals close after Offseason 2; school offers open next.');
  if (s.week === 13) s.news.unshift('Offseason 2: school interest is open. Compare a college guarantee with the draft route before committing.');
  if (s.week === 14) s.news.unshift('Offseason 3: final school commitments and draft preparation. Unsigned offers expire when you advance.');
  if (s.week === 16) for (const a of s.offseason!.agreements.filter(a => a.year === s.year && a.status === 'Signed')) {
    const p = s.players.find(p => p.id === a.player)!;
    ledger(s, `${p.name} · ${schools[a.school]!.name} school agreement commission`, a.commission, 'Commission');
    a.status = 'Paid';
    const prestige = a.gross >= 300000 ? 8 : a.gross >= 150000 ? 5 : 3;
    s.reputation = cap(s.reputation + prestige);
    s.news.unshift(`${p.name} · school agreement paid: client ${cash(a.clientNet)}, agency ${cash(a.commission)}. Prestige +${prestige}. ${schools[a.school]!.name} begins next season.`);
  }
}
export function applySchoolDestination(s: State, p: Athlete) {
  const a = s.offseason?.agreements.find(a => a.player === p.id && a.season === s.year);
  if (!a) return;
  p.school = a.school; p.transferredYear = s.year;
  s.news.push(`${p.name}'s ${schools[a.school]!.name} agreement begins: ${depth(p).role}, ${depth(p).snaps}% projected healthy snaps. School guarantee already paid; new sponsor work is separate.`);
}
export function validOffseason(s: State) {
  const o = s.offseason;
  if (!o) return true;
  return Array.isArray(o.reviews) && Array.isArray(o.agreements) && Array.isArray(o.budgets) &&
    o.reviews.every(r => r && s.players.some(p => p.id === r.player) && s.rivals.some(v => v.id === r.rival) && Number.isInteger(r.year) && ['Open','Renewed','Lost'].includes(r.status) && [r.trust,r.income,r.rivalPrestige].every(Number.isFinite) && typeof r.delivered === 'boolean' && typeof r.marketOpened === 'boolean' && typeof r.counterUsed === 'boolean' && typeof r.settled === 'boolean' && Number.isFinite(r.chance) && r.chance >= 0 && r.chance <= 100 && Array.isArray(r.offers) && new Set(r.offers.map(o => o.id)).size === r.offers.length && r.offers.every(a => a && typeof a.id === 'string' && Number.isInteger(a.school) && !!schools[a.school] && Number.isFinite(a.original) && a.original >= 0 && Number.isFinite(a.gross) && a.gross >= 0 && ['Open','Withdrawn','Signed','Closed'].includes(a.status))) &&
    o.agreements.every(a => a && s.players.some(p => p.id === a.player) && !!schools[a.school] && !!schools[a.formerSchool] && Number.isInteger(a.season) && Number.isInteger(a.year) && a.season === a.year + 1 && ['Signed','Paid'].includes(a.status) && [a.gross,a.fee,a.commission,a.clientNet,a.cost].every(n => Number.isFinite(n) && n >= 0) && a.commission === Math.round(a.gross * a.fee / 100) && a.clientNet === a.gross - a.commission) &&
    o.budgets.every(b => b && Number.isInteger(b.year) && Number.isInteger(b.school) && !!schools[b.school] && Number.isFinite(b.total) && Number.isFinite(b.committed) && b.committed >= 0 && b.total >= b.committed && b.committed === o.agreements.filter(a => a.year === b.year && a.school === b.school).reduce((n,a) => n+a.gross,0)) &&
    o.agreements.every(a => o.budgets.some(b => b.year === a.year && b.school === a.school) && o.reviews.some(r => r.player === a.player && r.year === a.year && r.offers.some(o => o.id === a.id && o.status === 'Signed' && o.school === a.school && o.gross === a.gross))) &&
    new Set(o.budgets.map(b => `${b.year}-${b.school}`)).size === o.budgets.length &&
    new Set(o.reviews.map(r => `${r.year}-${r.player}`)).size === o.reviews.length && new Set(o.agreements.map(a => `${a.season}-${a.player}`)).size === o.agreements.length;
}
