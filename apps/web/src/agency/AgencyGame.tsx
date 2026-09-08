import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  startAgency,
  restore,
  SAVE_KEY,
  cash,
  phase,
  nextLabel,
  clientList,
  collegeClients,
  burn,
  teams,
  ratingStars,
  conferenceStrength,
  priorities,
  scoutingPackages,
  scoutingLevel,
  scoutingUpgradeCost,
  potentialRange,
  researchedOutlook,
  competitionReport,
  schools,
  depth,
  schoolLabel,
  yearLabel,
  health,
  playingShare,
  dealValue,
  standings,
  seasonPoints,
  draftGrade,
  fit,
  packages,
  brands,
  prepCost,
  decideAgency,
  advanceAgency,
  type Action,
  type State,
  type Athlete,
  type Want,
  type Box,
  type Prep,
} from "./model.js";
import { ClientJourney, ClientHomeCard, promiseTask } from "./ClientJourney.js";
import { currentReview, nextAgreement } from "./offseason.js";
import { OffseasonPanel, OffseasonLink } from './OffseasonDesk.js';
import { pendingNegotiation, recruitingBonus } from "./gameplay.js";
import {
  DecisionDesk,
  ClientRequests,
  ClientAmbitions,
  CounterOffer,
  RecruitingContests,
  SpotlightOffers,
  SeniorWatchlist,
} from "./GameplayPanels.js";
import "./agency.css";
import { activeDevelopment, earnedPrestige, playerSkills } from "./growth.js";
import {
  GoalBar,
  AgencyGoals,
  PlayerGrowth,
  DevelopmentPlanner,
  DevelopmentHistory,
} from "./GrowthPanels.js";
const sections = [
  "Agency",
  "Weekly Recap",
  "Offseason",
  "Clients",
  "Scouting",
  "Development",
  "Deals",
  "Pro Preparation",
  "Football World",
  "Competitors",
  "Finances",
];
function initial() {
  try {
    return restore(localStorage.getItem(SAVE_KEY)) ?? startAgency();
  } catch {
    return startAgency();
  }
}
function Portrait({ p }: { p: Athlete }) {
  const n = Number(p.id.split("-")[1]) || 0;
  const skin = ["#c38a62", "#8c563e", "#d9a17a", "#b87e57"][n % 4],
    shirt = ["#335c60", "#796241", "#95523d", "#535f80"][p.school % 4];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="as-portrait">
      <rect width="100" height="100" rx="18" fill={shirt + "25"} />
      <path d="M8 100V80Q11 66 38 64H62Q89 66 92 80V100Z" fill={shirt} />
      <path d="M41 54H59V73Q50 84 41 73Z" fill={skin} />
      <ellipse cx="50" cy="40" rx="24" ry="28" fill={skin} />
      <path
        d={
          n % 2
            ? "M26 42Q15 4 48 8Q82 2 75 44L66 26Q51 35 34 26Z"
            : "M26 35Q24 7 50 9Q78 5 75 39L68 24L33 26Z"
        }
        fill="#302f2b"
      />
      <path
        d="M36 42H41M59 42H64"
        stroke="#332f2b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M43 56Q50 60 58 55"
        stroke="#6d4232"
        strokeWidth="2"
        fill="none"
      />
      <text
        x="50"
        y="97"
        textAnchor="middle"
        fill="#efe5cd"
        fontSize="18"
        fontWeight="bold"
      >
        {p.position}
      </text>
    </svg>
  );
}
function StatLine({ p, b }: { p: Athlete; b: Box }) {
  return (
    <>
      <strong>
        {["QB", "HB", "WR"].includes(p.position)
          ? `${b.yards} YDS · ${b.td} TD`
          : `${b.tackles} TKL · ${p.position === "FS" ? `${b.int} INT` : `${b.sacks} SACK`}`}
      </strong>
      <small>
        {b.snaps !== undefined && `${b.snaps}% snaps · `}
        {p.position === "QB"
          ? `${b.comp}/${b.att} passing · ${b.int} INT · `
          : ""}
        {teams[b.team]} {b.for}–{b.against} {teams[b.opponent]}
      </small>
    </>
  );
}
function FootballProfile({ p, week }: { p: Athlete; week: number }) {
  const role = depth(p);
  return (
    <div className="as-football-profile">
      <p className="as-school-context">{schoolLabel(p)}</p>
      <div className="as-school-ratings">
        <Stars
          label="Conference"
          value={ratingStars(conferenceStrength(p.school))}
        />
        <Stars label="Team" value={ratingStars(schools[p.school]!.prestige)} />
      </div>
      <p>{yearLabel(p)}</p>
      <dl>
        <div>
          <dt>Depth chart</dt>
          <dd>
            {role.role} · {p.position}
            {role.rank}
          </dd>
        </div>
        <div>
          <dt>Expected snaps</dt>
          <dd>{playingShare(p, week)}%</dd>
        </div>
        <div>
          <dt>Health</dt>
          <dd>{health(p, week)}</dd>
        </div>
      </dl>
    </div>
  );
}
function Stars({ label, value }: { label: string; value: number }) {
  return (
    <span
      role="img"
      className="as-star-rating"
      aria-label={`${label}: ${value} out of 5 stars`}
    >
      <small>{label}</small>
      <span aria-hidden="true">
        <b>{"★".repeat(value)}</b>
        <span>{"☆".repeat(5 - value)}</span>
      </span>
      <small>{value}/5</small>
    </span>
  );
}
function ResultDialog({
  s,
  title,
  children,
  close,
}: {
  s: State;
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
    dialog.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    dialog.scrollTop = 0;
    return () => {
      if (dialog.close) dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>("h2")
      ?.focus({ preventScroll: true });
    if (ref.current) ref.current.scrollTop = 0;
  }, [title]);
  return (
    <dialog
      ref={ref}
      className="as-result-dialog"
      aria-labelledby="as-result-title"
      onCancel={close}
    >
      <GoalBar s={s} compact />
      <h2 id="as-result-title" tabIndex={-1}>
        {title}
      </h2>
      {children}
      <button className={title.startsWith('Review ') || title.startsWith('Your pitch to') ? '' : 'as-primary'} onClick={close}>
        {title.startsWith('Review ') || title.startsWith('Your pitch to') ? 'Cancel' : 'Continue'}
      </button>
    </dialog>
  );
}
function ScoutingReport({ p, s }: { p: Athlete; s: State }) {
  const level = scoutingLevel(p);
  return (
    <div className="as-research-report">
      <p>
        {scoutingPackages[level - 1]?.name ?? "Public profile"} ·{" "}
        {level
          ? "Assessment updates as the player develops."
          : "Research to learn more."}
      </p>
      {level > 0 && (
        <>
          <div className="as-skill-grid">
            {playerSkills(s, p).map((v) => (
              <p key={v.name}>
                <strong>{v.name}</strong> · {v.value.toFixed(1)} / 99
              </p>
            ))}
          </div>
          <p>
            <strong>Potential range: {potentialRange(p)}</strong> · an estimate,
            not a guaranteed outcome.
          </p>
          <p>
            Current opportunity: {depth(p).role.toLowerCase()} at{" "}
            {teams[p.school]}.{" "}
            {p.fatigue > 40
              ? "Manage workload before an intensive training block."
              : "Technique work can improve ability; the school determines playing time."}
          </p>
        </>
      )}
      {level >= 2 && (
        <>
          <h3>Career & commercial assessment</h3>
          <p>{researchedOutlook(p)}</p>
          <p>
            Client priority: {priorities[p.want].label}.{" "}
            {priorities[p.want].description}
          </p>
          <p>
            Local endorsement at today's school, role and public profile:{" "}
            {cash(dealValue(p, 0))} gross; agency commission at {p.fee}%:{" "}
            {cash(Math.round((dealValue(p, 0) * p.fee) / 100))}. Activation
            costs $800. This is the current available quote, not promised annual
            income.
          </p>
        </>
      )}
      {level >= 3 && (
        <>
          <h3>Competition & school alternatives</h3>
          <p>{competitionReport(s, p)}</p>
          {schools
            .map((school, i) => ({ school, i, role: depth(p, i) }))
            .filter((x) => x.i !== p.school)
            .sort(
              (a, b) =>
                b.role.snaps - a.role.snaps ||
                b.school.prestige - a.school.prestige,
            )
            .slice(0, 2)
            .map((x) => (
              <p key={x.i}>
                {x.school.name}: {x.school.division}, {x.school.conference};{" "}
                {x.role.role.toLowerCase()}, {x.role.snaps}% healthy snaps;
                current local offer {cash(dealValue({ ...p, school: x.i }, 0))}.
                A school move is a separate preseason decision.
              </p>
            ))}
        </>
      )}
    </div>
  );
}
function SchoolChoices({p,s,go}:{p:Athlete;s:State;go:(tab:string)=>void}) {
  if(p.status !== 'College') return null;
  const agreement=nextAgreement(s,p.id);
  return <section className="as-panel"><h3>School & next season</h3><p>{agreement ? `${teams[agreement.school]} committed for next season. College route locked.` : s.week < 12 ? 'Keep earning this season. Review college offers and draft options after Week 12.' : 'Make this client’s career decision at the offseason desk.'}</p>{s.week >= 12 && <button onClick={()=>go('Offseason')}>Review offseason decision</button>}</section>;
}
export function AgencyGame() {
  const [showGoals, setShowGoals] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pitchTarget, setPitchTarget] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{title:string; lines:string[]; action:Action} | null>(null);
  const [feedback, setFeedback] = useState<{title:string; lines:string[]} | null>(null);
  function reviewAction(action:Action,title:string,lines:string[]) { setConfirmation({action,title,lines}); }

  const [s, setS] = useState(initial),
    [tab, setTab] = useState("Agency"),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [promise, setPromise] = useState<Want>("Development"),
    [fee, setFee] = useState(15),
    [level, setLevel] = useState(0),
    [prepFocus, setPrepFocus] = useState<Prep["focus"]>("Testing"),
    [travel, setTravel] = useState(false),
    [recovery, setRecovery] = useState(false),
    [performance, setPerformance] = useState(false),
    [worldTab, setWorldTab] = useState("Standings"),
    [recapIndex, setRecapIndex] = useState(0),
    [newConfirm, setNewConfirm] = useState(false),
    [expanded, setExpanded] = useState(false);
  const [overlay, setOverlay] = useState<{
    kind: "pitch" | "scout";
    id: string;
  } | null>(null);
  const [researchTier, setResearchTier] = useState(1);
  const clients = clientList(s),
    college = collegeClients(s),
    chosen =
      s.players.find(
        (p) =>
          p.id === selected && (p.owner === "you" || p.status === "Departed"),
      ) ||
      college[0] ||
      clients[0],
    available = s.players.filter(
      (p) => p.season === s.year && !p.owner && p.status === "College",
    ),
    targets = (
      expanded
        ? available
        : available.filter(
            (p) => Number(p.id.split("-")[1]) < 12 || p.id.startsWith("hs-"),
          )
    ).sort((a, b) => a.ability - b.ability),
    recap = s.recaps[recapIndex];
  function update(fn: (s: State) => State, msg = "") {
    try {
      const next = fn(s);
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      setS(next);
      setError("");
      setNotice('');
      const pitchChanged = next.lastPitch && JSON.stringify(next.lastPitch) !== JSON.stringify(s.lastPitch);
      const researchChanged = next.players.some((p,i) => scoutingLevel(p) !== scoutingLevel(s.players[i] ?? p));
      if (pitchChanged) { setFeedback(null); setSelected(next.lastPitch!.player); setOverlay({kind:'pitch',id:next.lastPitch!.player}); }
      else if (researchChanged) { const researched=next.players.find((p,i)=>scoutingLevel(p)!==scoutingLevel(s.players[i]??p))!; setFeedback(null); setOverlay({kind:'scout',id:researched.id}); }
      else if (next.week === s.week && next.year === s.year && !researchChanged) {
        const deal = next.deals.find(d => !s.deals.some(old => old.id === d.id));
        const request = next.gameplay?.requests.find(r => r.response && !s.gameplay?.requests.some(old => old.id === r.id && old.response === r.response));
        const changedReview = next.offseason?.reviews.find(r => JSON.stringify(r) !== JSON.stringify(s.offseason?.reviews.find(old => old.player === r.player && old.year === r.year)));
        const reviewBefore = changedReview && s.offseason?.reviews.find(r=>r.player===changedReview.player && r.year===changedReview.year);
        const offer = changedReview?.offers.find(o=>o.reason !== reviewBefore?.offers.find(old=>old.id===o.id)?.reason);
        const person = deal && next.players.find(p=>p.id===deal.player);
        const summary = deal ? `${person?.name} · ${deal.brand}` : request?.response || (changedReview?.marketResult !== reviewBefore?.marketResult ? changedReview?.marketResult : null) || (changedReview?.response !== reviewBefore?.response ? changedReview?.response : null) || offer?.reason || msg || next.news.find(n=>!s.news.includes(n)) || 'Your choice is saved. The client’s next step has updated.';
        const delta=next.money-s.money;
        setFeedback({title:deal ? 'Deal signed' : changedReview?.status === 'Lost' ? 'Client chose another agent' : 'Decision complete', lines:deal ? [summary, `Paid now: ${cash(deal.cost)} activation.`, `In ${deal.left} weeks: client ${cash(deal.gross-Math.round(deal.gross*deal.fee/100))} · agency ${cash(Math.round(deal.gross*deal.fee/100))}.`, 'Advance the week to deliver the campaign. Other campaigns are locked until it finishes.'] : [summary, ...(delta ? [`Agency cash ${delta < 0 ? 'spent' : 'received'}: ${cash(Math.abs(delta))}.`] : []), ...(next.reputation !== s.reputation ? [`Prestige ${Math.round(s.reputation)} → ${Math.round(next.reputation)}.`] : [])]});
      }
      if(next.week!==s.week) {
        const payments=next.deals.filter(d=>d.status==='Paid'&&s.deals.some(old=>old.id===d.id&&old.status==='Active'));
        const schoolPayments=next.offseason?.agreements.filter(a=>a.status==='Paid'&&s.offseason?.agreements.some(old=>old.id===a.id&&old.status==='Signed'))??[];
        if(payments.length||schoolPayments.length) setFeedback({title:'Payday',lines:[...payments.map(d=>`${next.players.find(p=>p.id===d.player)?.name} · ${d.brand}: agency received ${cash(Math.round(d.gross*d.fee/100))}.`),...schoolPayments.map(a=>`${next.players.find(p=>p.id===a.player)?.name} · school agreement: client ${cash(a.clientNet)}, agency ${cash(a.commission)}.`),`Agency cash is now ${cash(next.money)} after this week’s costs.`]});
      }
      return true;
    } catch (e) {
      const message=e instanceof Error ? e.message : 'Unable to save this decision.';
      setError(message); setFeedback({title:'Action unavailable',lines:[message]});
      return false;
    }
  }
  function go(t: string) {
    setMenu(false);
    setTab(t);
    setError("");
    setNotice("");
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
  const pickClient = (
    <label>
      Client
      <select
        value={chosen?.id || ""}
        onChange={(e) => {
          setSelected(e.target.value);
        }}
      >
        {clients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.position} ·{" "}
            {p.status === "College" ? teams[p.school] : p.status}
          </option>
        ))}
      </select>
    </label>
  );
  const agentName = (p: Athlete) =>
    p.owner === "you"
      ? "Origin Sports Agency"
      : s.rivals.find((r) => r.id === p.owner)?.name || "Unrepresented";
  const playerCard = (p: Athlete, prospect = false) => (
    <article className="as-player" key={p.id}>
      <div className="as-person">
        <Portrait p={p} />
        <div>
          <span className="as-eyebrow">
            {p.position} · {teams[p.school]}
          </span>
          <h3>{p.name}</h3>
          <p>
            {prospect ? "Priority: " : ""}
            {priorities[p.want].label}{" "}
            {prospect || p.status === "College" ? "" : `· ${p.status}`}
          </p>
        </div>
      </div>
      {prospect ? <><p>{schools[p.school]!.division} · Year {p.schoolYear} · {depth(p).role}</p><div className="as-school-ratings"><Stars label="Team" value={ratingStars(schools[p.school]!.prestige)} /><Stars label="Conference" value={ratingStars(conferenceStrength(p.school))} /></div></> : p.status === 'College' && <FootballProfile p={p} week={s.week} />}
      {prospect && recruitingBonus(s, p) > 0 && (
        <p className="as-referral">
          A relationship already exists · +{recruitingBonus(s, p)} recruiting
          interest from familiarity or a referral.
        </p>
      )}
      <details className="as-prospect-details"><summary>Ability, potential & career details</summary>
      <div className="as-metrics">
        <div>
          <b>{Math.round(p.ability)}</b>
          <small>Ability</small>
        </div>
        <div>
          <b>{potentialRange(p)}</b>
          <small>Potential estimate</small>
        </div>
        <div>
          <b>{Math.round(p.recognition)}</b>
          <small>Public profile</small>
        </div>
      </div>
      <div className="as-outlook">
        {p.status === "College"
          ? researchedOutlook(p)
          : p.pick
            ? `Selected R${Math.ceil(p.pick / 32)} · P${((p.pick - 1) % 32) + 1}`
            : p.status}
        <small>
          {p.status === "College"
            ? "Scouting insight · not a limit on ambition"
            : "Career outcome"}
        </small>
      </div>
      </details>
      {prospect ? (
        <>
          <div className="as-buttons">
            <button
              disabled={scoutingLevel(p) >= researchTier}
              onClick={() =>
                update(
                  (x) =>
                    decideAgency(x, {
                      type: "scout",
                      id: p.id,
                      level: researchTier,
                    }),
                  "Scouting report received.",
                ) && setOverlay({ kind: "scout", id: p.id })
              }
            >
              {scoutingLevel(p) >= researchTier
                ? "Report owned"
                : `${scoutingLevel(p) ? "Upgrade" : "Scout"} · ${cash(scoutingUpgradeCost(p, researchTier))}`}
            </button>
            {scoutingLevel(p) > 0 && (
              <button onClick={() => setOverlay({ kind: "scout", id: p.id })}>
                Read report
              </button>
            )}
            <button
              className="as-primary"
              aria-label={`Pitch ${p.name}`}
              disabled={
                s.week > 6 ||
                college.length >= 4 + s.staff ||
                !!pendingNegotiation(s, p.id) ||
                p.approached === s.week
              }
              onClick={() => { setPromise(p.want); setFee(15); setPitchTarget(p.id); }}
            >
              Pitch {p.name.split(" ")[0]}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="as-trust">
            <span>Trust {Math.round(p.trust)}</span>
            <meter min="0" max="100" value={p.trust} />
            <span>Fatigue {Math.round(p.fatigue)}</span>
          </div>
          <p className="as-fine">
            {priorities[p.promise].label} promised ·{" "}
            {p.delivered ? "Service delivered" : "Still to deliver"} · {p.fee}%
            commercial fee
          </p>
          {p.boxes.at(-1) && (
            <div className="as-last">
              <StatLine p={p} b={p.boxes.at(-1)!} />
            </div>
          )}
          <button
            onClick={() => {
              setSelected(p.id);
              go("Clients");
            }}
          >
            Open client file ↗
          </button>
        </>
      )}
    </article>
  );
  return (
    <div className="as-app">
      {menu && <ResultDialog s={s} title="All activities" close={()=>setMenu(false)}><div className="as-menu-grid">{sections.filter(t=>t !== 'Offseason' || s.week>=12 || s.offseason?.reviews.length).map(t=><button key={t} onClick={()=>go(t)}>{t}</button>)}</div></ResultDialog>}
      {feedback && !overlay && <ResultDialog s={s} title={feedback.title} close={()=>setFeedback(null)}>{feedback.lines.map((line,i)=><p key={i}>{line}</p>)}</ResultDialog>}
      {confirmation && <ResultDialog s={s} title={confirmation.title} close={()=>setConfirmation(null)}>{confirmation.lines.map((line,i)=><p key={i}>{line}</p>)}<button className="as-primary" onClick={()=>{const a=confirmation.action;setConfirmation(null);update(x=>decideAgency(x,a));}}>Confirm commitment</button></ResultDialog>}
      {pitchTarget && (()=>{const p=s.players.find(p=>p.id===pitchTarget)!;return <ResultDialog s={s} title={`Your pitch to ${p.name}`} close={()=>setPitchTarget(null)}><p>{p.name} wants to {priorities[p.want].label.toLowerCase()}.</p><label>Promise to {p.name}<select value={promise} onChange={e=>setPromise(e.target.value as Want)}>{(['Development','Visibility','Security'] as Want[]).map(w=><option key={w} value={w}>{w==='Security'?'Paying sponsor campaign':w==='Visibility'?'Media & sponsor exposure':'Football skills training'}</option>)}</select></label><p>{promiseTask(promise)} for {p.name}. Deliver during the season to build trust.</p><label>Your commercial commission<select value={fee} onChange={e=>setFee(Number(e.target.value))}><option value={10}>10% · client-friendly</option><option value={15}>15% · standard</option><option value={20}>20% · higher agency share</option></select></label><p>{Math.round(fit(s,p,promise,fee))}% initial interest · $500 meeting, plus $1,500 only if signed.</p><button className="as-primary" onClick={()=>{setPitchTarget(null);update(x=>decideAgency(x,{type:'pitch',id:p.id,promise,fee}));}}>Send pitch to {p.name}</button></ResultDialog>})()}
      {showGoals && (
        <ResultDialog
          s={s}
          title="Agency goals and unlocks"
          close={() => setShowGoals(false)}
        >
          <AgencyGoals s={s} />
        </ResultDialog>
      )}
      {overlay &&
        (() => {
          const player = s.players.find((p) => p.id === overlay.id)!;
          const result = s.lastPitch;
          return (
            <ResultDialog
              s={s}
              title={
                overlay.kind === "scout"
                  ? `${player.name} · Scouting report`
                  : result?.accepted
                    ? `${player.name} signed`
                    : result?.pending
                      ? `${player.name} · Final offer requested`
                      : `${player.name} · Pitch result`
              }
              close={() => setOverlay(null)}
            >
              {overlay.kind === "scout" ? (
                <ScoutingReport p={player} s={s} />
              ) : pendingNegotiation(s, player.id) ? (
                <>
                  <p>
                    Meeting completed · $500 spent. Choose your final offer now
                    or return to Scouting before the deadline.
                  </p>
                  <CounterOffer
                    key={pendingNegotiation(s, player.id)!.id}
                    n={pendingNegotiation(s, player.id)!}
                    s={s}
                    update={update}
                  />
                </>
              ) : (
                <>
                  <p>{result?.message}</p>
                  <p>
                    <strong>Agency spent {cash(result?.cost ?? 0)}</strong> ·{" "}
                    {result?.accepted
                      ? result.cost > 2000
                        ? "$500 meeting + $1,500 setup + $2,500 dedicated session"
                        : "$500 meeting + $1,500 setup"
                      : "$500 meeting; no setup charged"}
                  </p>
                  <details><summary>Rival response</summary><p>{result?.competition}</p></details>
                  {result?.accepted && <button className="as-primary" onClick={()=>{setOverlay(null);setSelected(player.id);go('Clients');}}>Plan {player.name.split(' ')[0]}’s next step</button>}
                  <p>
                    {result?.accepted
                      ? `Your promise: ${promiseTask(player.promise)}.`
                      : result?.pending
                        ? "Choose your final offer below, or return to Scouting before the deadline."
                        : "Review the result and recruit another prospect, or revisit an available player next week."}
                  </p>
                </>
              )}
            </ResultDialog>
          );
        })()}
      <nav className="as-mobile-nav" aria-label="Quick navigation">{['Agency','Clients','Scouting','Deals'].map(t=><button key={t} onClick={()=>go(t)} aria-current={tab===t?'page':undefined}>{t==='Agency'?'Home':t==='Scouting'?'Recruit':t}</button>)}<button aria-expanded={menu} onClick={()=>setMenu(true)}>More</button></nav>
      <aside className="as-sidebar">
        <a
          className="as-logo"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Agency");
          }}
        >
          <span>
            O<span className="as-logo-dot">.</span>
          </span>
          <div>
            ORIGIN<small>SPORTS AGENCY</small>
          </div>
        </a>
        <p className="as-edition">COLLEGE FOOTBALL AGENT SIM</p>
        <nav aria-label="Agency navigation">
          {sections.filter(t => t !== 'Offseason' || s.week >= 12 || !!s.offseason?.reviews.length).map((t, i) => (
            <button
              key={t}
              aria-label={t}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => go(t)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {t}
              {t === "Weekly Recap" && s.recaps.length > 0 && <b>●</b>}
            </button>
          ))}
        </nav>
        <div className="as-sidebar-foot">
          <span>
            FROM FIRST CLIENT
            <br />
            TO FIRST ROUND.
          </span>
          <small>Playable agency prototype · v1</small>
        </div>
      </aside>
      <div className="as-workspace">
        <GoalBar s={s} open={() => setShowGoals(true)} />
        <header className="as-top">
          <div>
            <span className="as-eyebrow">
              {s.year} / {phase(s)}
            </span>
            <h1>{tab === "Agency" ? "Your agency" : tab}</h1>
          </div>
          <button
            className="as-primary"
            hidden={s.week===0&&!college.length}
            disabled={s.failed || (s.week === 0 && !college.length)}
            onClick={() => {
              if (update(advanceAgency)) {
                setRecapIndex(0);
                if (s.week === 18) setSelected("");
                go(s.week === 18 ? "Agency" : s.week >= 11 && s.week <= 13 ? "Offseason" : "Weekly Recap");
              }
            }}
          >
            {s.failed ? "Agency closed" : nextLabel(s)} →
          </button>
        </header>
        <main>
          {error && (
            <div className="as-alert" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="as-notice" role="status">
              {notice}
            </div>
          )}
          {s.failed && (
            <div className="as-alert">
              The agency closed because cash fell below zero. Review the ledger,
              then start a new agency below.
            </div>
          )}
          <DecisionDesk s={s} go={go} />
          {tab !== 'Offseason' && <OffseasonLink s={s} go={go} />}
          {tab === 'Offseason' && <OffseasonPanel s={s} update={update} go={go} reviewAction={reviewAction} player={chosen?.id??''} selectClient={setSelected} />}
          {tab === 'Agency' && <>
            <h2>{clients.length ? 'Your next moves' : 'Sign your first client'}</h2>
            <p>{clients.length ? 'Choose a client. Make a move. Advance to see the result.' : 'Find talent → earn their trust → land deals → make the offseason move.'}</p>
            {!clients.length && <button className="as-primary" onClick={()=>go('Scouting')}>Meet the prospects ↗</button>}
            <div className="as-grid">{clients.map(p=><ClientHomeCard key={p.id} p={p} s={s} go={t=>{setSelected(p.id);go(t);}} />)}</div>
            <div className="as-activity-grid"><button onClick={()=>go('Scouting')}>Recruit clients</button><button onClick={()=>go('Development')}>Arrange development</button><button onClick={()=>go('Deals')}>Find sponsor deals</button><button onClick={()=>go(s.week>=12?'Offseason':'Weekly Recap')}>{s.week>=12?'Offseason decisions':'Season results'}</button></div>
            <details className="as-panel"><summary>Agency news & finances</summary><p>Weekly overhead: {cash(burn(s))}</p>{s.news.slice(0,5).map((n,i)=><p key={i}>{n}</p>)}<button onClick={()=>go('Finances')}>Open finances</button></details>
          </>}
          {tab === "Scouting" && (
            <>
              <RecruitingContests
                s={s}
                update={update}
                onResolved={(id) => setOverlay({ kind: "pitch", id })}
              />

              <div className="as-page-intro">

                <h2>Choose your client</h2>
                <p>
                  Pick a player. Research them or build a personal pitch.
                </p>
              </div>
              <div className="as-section-title">
                <h3>
                  {college.length}/{4 + s.staff} college places filled
                </h3>
                <button onClick={() => setExpanded(!expanded)}>
                  {expanded
                    ? "Show overlooked prospects"
                    : "Include established prospects"}
                </button>
              </div>
              <div className="as-grid">
                {targets.map((p) => playerCard(p, true))}
              </div>
              <details className="as-panel as-scouting-guide">
                <summary>How to read a prospect</summary>
                <p>
                  Team and conference stars compare program stature and
                  exposure: 1/5 is a small stage, 3/5 is established, 5/5 is
                  elite. They do not guarantee wins or measure this player's
                  talent.
                </p>
                <p>
                  Ability measures current football skill. Potential is a
                  researched range of possible development. Public profile
                  (0–100) is awareness among fans and brands; it grows through
                  performances and media work and affects sponsor opportunities.
                </p>
                <p>
                  Your role: arrange support, negotiate commercial work and
                  manage promises. Coaches control the football program. A
                  client's priority tells you what they want from
                  representation.
                </p>
              </details>
              <details className="as-panel as-research-picker"><summary>Scouting packages · from $1,000</summary>
                <label>
                  Scouting depth
                  <select
                    value={researchTier}
                    onChange={(e) => setResearchTier(Number(e.target.value))}
                  >
                    {scoutingPackages.map((pack, i) => (
                      <option key={pack.name} value={i + 1}>
                        {pack.name} · {cash(pack.cost)} total
                      </option>
                    ))}
                  </select>
                </label>
                <p>{scoutingPackages[researchTier - 1]!.detail}</p>
                <p className="as-fine">
                  Earlier research is credited toward upgrades. The deepest
                  report totals $25,000 per player, not $31,000. Better
                  information cannot guarantee future results.
                </p>
              </details>
              <details className="as-panel"><summary>Recruiting history</summary>              {s.lastPitch && s.lastPitch.year === s.year && (
                <section className="as-panel">
                  <h3>Last pitch</h3>
                  <p>{s.lastPitch.message}</p>
                  <p>
                    {competitionReport(
                      s,
                      s.players.find((p) => p.id === s.lastPitch!.player)!,
                    )}
                  </p>
                  <button
                    onClick={() =>
                      setOverlay({ kind: "pitch", id: s.lastPitch!.player })
                    }
                  >
                    Review pitch result
                  </button>
                </section>
              )}
              {s.players
                .filter(
                  (p) =>
                    p.season === s.year &&
                    p.approached >= 0 &&
                    p.owner &&
                    p.owner !== "you",
                )
                .map((p) => (
                  <p className="as-notice" key={p.id}>
                    {p.name}: {competitionReport(s, p)} Your earlier pitch did
                    not secure the client.
                  </p>
                ))}
              {s.news[0] && (
                <p className="as-inline-news" role="status">
                  {s.news[0]}
                </p>
              )}
</details>
              <SeniorWatchlist s={s} update={update} />
            </>
          )}
          {tab === "Clients" && (
            <>
              <ClientRequests s={s} update={update} />
              {s.players.some(
                (p) => p.representedByYou && p.status === "Departed",
              ) && (
                <label className="as-panel">
                  Career archive
                  <select
                    value={chosen?.status === "Departed" ? chosen.id : ""}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">Choose a former client</option>
                    {s.players
                      .filter(
                        (p) => p.representedByYou && p.status === "Departed",
                      )
                      .map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name} · Class of {p.season}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {!chosen ? (
                <div className="as-empty">
                  <h2>Your first client belongs here.</h2>
                  <button className="as-primary" onClick={() => go("Scouting")}>
                    Meet prospects
                  </button>
                </div>
              ) : (
                <>
                  <div className="as-client-strip" hidden={clients.length<2}>
                    {clients.map((p) => (
                      <button
                        key={p.id}
                        aria-pressed={chosen.id === p.id}
                        onClick={() => setSelected(p.id)}
                      >
                        {p.name}
                        <small>
                          {p.position} ·{" "}
                          {p.status === "College" ? depth(p).role : p.status}
                        </small>
                      </button>
                    ))}
                  </div>
                  <div className="as-client-file">
                    <Portrait p={chosen} />
                    <div>
                      <span className="as-eyebrow">
                        {teams[chosen.school]} · {chosen.position} · SEASON{" "}
                        {chosen.season}
                      </span>
                      <h2>{chosen.name}</h2>
                      <p>
                        Wants: {priorities[chosen.want].label.toLowerCase()}.
                        You promised:{" "}
                        {priorities[chosen.promise].label.toLowerCase()}.
                      </p>
                      <div className="as-tags">
                        <span>Trust {Math.round(chosen.trust)}</span>
                        <span>Fatigue {Math.round(chosen.fatigue)}</span>
                        <span>{chosen.fee}% commercial commission</span>
                        {chosen.status !== "College" && (
                          <span>{chosen.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ClientJourney s={s} p={chosen} go={go} />
                  <div className="as-activity-grid"><button onClick={()=>go('Deals')}>Sponsor deals</button><button onClick={()=>go('Development')}>Development</button><button onClick={()=>go(s.week>=12?'Offseason':'Pro Preparation')}>{s.week>=12?'Offseason decision':'Pro career'}</button></div>
                  <details className="as-panel"><summary>Player profile & career history</summary>
                  {chosen.status === "College" && (
                    <FootballProfile p={chosen} week={s.week} />
                  )}
                  <SchoolChoices
                    key={`${chosen.id}-${chosen.school}`}
                    p={chosen}
                    s={s}
                    go={go}
                  />
                  <ClientAmbitions s={s} p={chosen} />
                  <div className="as-two">
                    <section className="as-panel">
                      <h3>The next step</h3>
                      <p>
                        {chosen.status === "College"
                          ? chosen.careerPlan === "Return"
                            ? "Returning to school next year. New sponsor opportunities open in preseason; this client will skip Pro Days and the draft."
                            : `${researchedOutlook(chosen)}. ${priorities[chosen.promise].service}`
                          : chosen.status === "Pro"
                            ? "A professional relationship. Annual income continues at renewal, provided trust remains at least 50."
                            : chosen.status === "Undrafted"
                              ? "The draft is over, but the opportunity is not. Arrange outreach before undrafted offers."
                              : "Follow signing and roster outcomes in the weekly recap."}
                      </p>
                      <div className="as-buttons">
                        <button
                          disabled={chosen.status !== "College"}
                          onClick={() => go("Development")}
                        >
                          Development
                        </button>
                        <button
                          disabled={chosen.status !== "College"}
                          onClick={() => go("Deals")}
                        >
                          Commercial deals
                        </button>
                        <button
                          disabled={
                            !["College", "Undrafted"].includes(chosen.status)
                          }
                          onClick={() => go("Pro Preparation")}
                        >
                          Pro preparation
                        </button>
                        <button
                          disabled={chosen.status === "Departed"}
                          onClick={() =>
                            update(
                              (x) =>
                                decideAgency(x, {
                                  type: "support",
                                  id: chosen.id,
                                }),
                              "Support delivered: trust +8, fatigue −12.",
                            )
                          }
                        >
                          Client support · $1,500
                        </button>
                      </div>
                    </section>
                    <section className="as-panel">
                      <h3>Career & service record</h3>
                      <p>
                        Ability {Math.round(chosen.ability)} · Public profile{" "}
                        {Math.round(chosen.recognition)}
                      </p>
                      <p>
                        {chosen.delivered
                          ? "Your promised service has been delivered."
                          : "Your promised service is still outstanding. Unmet promises reduce trust in Week 8."}
                      </p>
                      <p>
                        {chosen.prep
                          ? `${packages[chosen.prep.level]!.name} · ${chosen.prep.resolved ? "completed" : "booked"} · ${cash(chosen.prep.cost)}`
                          : "No Pro Day package booked."}
                      </p>
                      <p>
                        {chosen.pick
                          ? `Drafted: Round ${Math.ceil(chosen.pick / 32)} · Pick ${((chosen.pick - 1) % 32) + 1}`
                          : chosen.status === "College"
                            ? `Next-season plan: ${nextAgreement(s,chosen.id) ? "College contract signed" : chosen.prep ? "Draft preparation committed" : s.week<12 ? "Review after Week 12" : "See offseason desk"}`
                            : `Professional status: ${chosen.status}`}
                      </p>
                    </section>
                  </div>
                  <details className="as-panel">
                    <summary>Scouting file & research upgrades</summary>
                    <ScoutingReport p={chosen} s={s} />
                    <div className="as-buttons">
                      {scoutingPackages.map((pack, i) => (
                        <button
                          key={pack.name}
                          disabled={scoutingLevel(chosen) >= i + 1}
                          onClick={() => {
                            if (
                              update((x) =>
                                decideAgency(x, {
                                  type: "scout",
                                  id: chosen.id,
                                  level: i + 1,
                                }),
                              )
                            )
                              setOverlay({ kind: "scout", id: chosen.id });
                          }}
                        >
                          {pack.name} ·{" "}
                          {scoutingLevel(chosen) >= i + 1
                            ? "Owned"
                            : cash(scoutingUpgradeCost(chosen, i + 1))}
                        </button>
                      ))}
                    </div>
                  </details>
                  <PlayerGrowth s={s} p={chosen} />
                  <DevelopmentHistory s={s} p={chosen} />
                  <h2>Weekly box statistics</h2>
                  <p className="as-fine">
                    Client-focused box stats. Supporting roster production is
                    simulated in aggregate.
                  </p>
                  {chosen.boxes.length === 0 ? (
                    <p>His first game report arrives after Week 1.</p>
                  ) : (
                    chosen.boxes
                      .slice()
                      .reverse()
                      .map((b) => (
                        <div className="as-row" key={b.week}>
                          <b>Week {b.week}</b>
                          <div>
                            <StatLine p={chosen} b={b} />
                          </div>
                          <span
                            className={
                              b.for > b.against ? "as-positive" : "as-negative"
                            }
                          >
                            {b.for > b.against ? "WIN" : "LOSS"}
                          </span>
                        </div>
                      ))
                  )}
                  </details>
                </>
              )}
            </>
          )}
          {tab === "Development" && (
            <>
              <div className="as-page-intro">
                <span className="as-eyebrow">
                  FROM POTENTIAL TO PERFORMANCE
                </span>
                <h2>Back the player you believe in.</h2>
                <p>
                  Identify a weakness, arrange the right help, and watch the
                  results. Training builds ability; school fit opens
                  opportunity; media work builds fame.
                </p>
              </div>
              {!chosen ? (
                <button onClick={() => go("Scouting")}>
                  Sign a client first
                </button>
              ) : (
                <>
                  <div className="as-panel">{pickClient}</div>
                  <DevelopmentPlanner
                    key={chosen.id}
                    s={s}
                    p={chosen}
                    update={update}
                  />
                  <SchoolChoices
                    key={`development-school-${chosen.id}`}
                    s={s}
                    p={chosen}
                    go={go}
                  />
                </>
              )}
            </>
          )}
          {tab === "Deals" && (
            <>
              <SpotlightOffers s={s} update={update} />
              <div className="as-page-intro">
                <span className="as-eyebrow">
                  GOOD REPRESENTATION IS GOOD BUSINESS
                </span>
                <h2>Sponsors. Media. Merchandise.</h2>
                <p>
                  Clients earn the deal value; your agency earns its agreed
                  commission. Pay activation costs up front and collect when the
                  campaign is delivered.
                </p>
              </div>
              {chosen ? (
                <>
                  <div className="as-panel as-offer">
                    {pickClient}
                    <label>
                      Negotiating approach
                      <select
                        value={performance ? "bonus" : "fixed"}
                        onChange={(e) =>
                          setPerformance(e.target.value === "bonus")
                        }
                      >
                        <option value="fixed">
                          Guaranteed fee · predictable income
                        </option>
                        <option value="bonus">
                          Lower guarantee + public-profile bonus
                        </option>
                      </select>
                    </label>
                    <p>
                      One active campaign per client. Each brand can be signed
                      once per client per year.
                    </p>
                  </div>
                  {s.deals.some(d=>d.player===chosen.id&&d.status==='Active') && <p className="as-notice">Campaign underway. Advance the week to deliver it; other deals unlock after payment.</p>}
                  <div className="as-grid">
                    {brands.map((b, i) => {
                      const gross = dealValue(chosen, i, performance),
                        commission = Math.round((gross * chosen.fee) / 100);
                      return (
                        <article className="as-deal" key={b.name}>
                          <span className="as-deal-icon">
                            {["↗", "◉", "✦"][i]}
                          </span>
                          <span className="as-eyebrow">{b.type}</span>
                          <h3>{b.name}</h3>
                          <p>
                            {b.weeks} weeks ·{" "}
                            {b.min
                              ? `${b.min}+ public profile`
                              : "Available to new clients"}
                          </p>
                          <dl>
                            <div>
                              <dt>Client contract guarantee</dt>
                              <dd>{cash(gross)}</dd>
                            </div>
                            <div>
                              <dt>Agency commission ({chosen.fee}%)</dt>
                              <dd>{cash(commission)}</dd>
                            </div>
                            <div>
                              <dt>Agency activation cost</dt>
                              <dd>−{cash(b.cost)}</dd>
                            </div>
                            <div>
                              <dt>Guaranteed agency margin</dt>
                              <dd>{cash(commission - b.cost)}</dd>
                            </div>
                          </dl>
                          {performance && (
                            <p className="as-fine">
                              Bonus depends on public profile at completion; it
                              can be zero. Your agency receives its commission
                              on any bonus.
                            </p>
                          )}
                          <p>{b.load} fatigue · pays after {b.weeks} weekly advances.</p>
                          {i === 2 && earnedPrestige(s) < 65 && (
                            <p>
                              Unlocks at 65 agency prestige. Your client also
                              needs {b.min} public profile.
                            </p>
                          )}
                          <button
                            className="as-primary"
                            disabled={
                              (i === 2 && earnedPrestige(s) < 65) ||
                              chosen.recognition < b.min ||
                              chosen.status !== "College" || s.failed || s.money < b.cost || s.week+b.weeks>14 ||
                              s.deals.some(d=>d.player===chosen.id && d.status==='Active') || !!nextAgreement(s,chosen.id) ||
                              s.deals.some(
                                (d) =>
                                  d.player === chosen.id &&
                                  d.kind === i &&
                                  d.year === s.year,
                              )
                            }
                            onClick={()=>reviewAction({type:'deal',id:chosen.id,kind:i,performance},`Review ${b.name}`, [`${chosen.name} · ${b.type}`, `Pay ${cash(b.cost)} now. Campaign takes ${b.weeks} weeks and adds ${b.load} fatigue.`, `At delivery: client ${cash(gross-commission)} · agency ${cash(commission)}. Agency margin ${cash(commission-b.cost)}.`, performance ? 'Any public-profile bonus is uncertain; these figures are the guarantee.' : 'This is a fixed offer. Signing starts the campaign; advance the week to deliver it.'])}
                          >
                            {s.deals.some(d=>d.player===chosen.id&&d.status==='Active') ? 'Campaign in progress' : `Review ${b.type.toLowerCase()}`}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <button onClick={() => go("Scouting")}>
                  Sign a client first
                </button>
              )}
              <h2>Contract book</h2>
              {s.deals.length === 0 ? (
                <p>Your first signed deal will appear here.</p>
              ) : (
                s.deals
                  .slice()
                  .reverse()
                  .map((d) => (
                    <div className="as-row" key={d.id}>
                      <b>
                        {d.brand}
                        <small>
                          {s.players.find((p) => p.id === d.player)!.name} ·{" "}
                          {d.year}
                        </small>
                      </b>
                      <span>
                        {d.status === "Paid"
                          ? "Paid"
                          : `${d.left} weeks to delivery`}
                      </span>
                      <span>
                        {cash(Math.round((d.gross * d.fee) / 100))}
                        <small>
                          Agency commission{" "}
                          {d.status === "Paid" ? "received" : "guaranteed"}
                        </small>
                      </span>
                    </div>
                  ))
              )}
            </>
          )}
          {tab === "Pro Preparation" && (
            <>
              <div className="as-page-intro">
                <span className="as-eyebrow">THE BIGGEST BET OF YOUR YEAR</span>
                <h2>Prepare for the next level.</h2>
                <p>
                  Packages open after Week 12. Book by the end of the
                  championship, before Pro Days. Self-directed preparation costs
                  the agency nothing and remains a valid choice.
                </p>
              </div>
              <div className="as-timeline">
                {[
                  "College season",
                  "Pro Day · 15",
                  "Draft · 16",
                  "Offers · 17",
                  "Rosters · 18",
                ].map((n, i) => (
                  <span
                    className={s.week >= (i === 0 ? 0 : 14 + i) ? "done" : ""}
                    key={n}
                  >
                    {n}
                  </span>
                ))}
              </div>
              {chosen && (
                <>
                  {pickClient}
                  {chosen.status === "Undrafted" && s.week === 16 && (
                    <div className="as-panel">
                      <h3>The next call could matter.</h3>
                      <p>
                        Target professional teams and fund tryout travel. This
                        increases the chance of an undrafted signing; it does
                        not guarantee one.
                      </p>
                      <button
                        className="as-primary"
                        disabled={chosen.interview >= 100}
                        onClick={() =>
                          update(
                            (x) =>
                              decideAgency(x, {
                                type: "outreach",
                                id: chosen.id,
                              }),
                            "Outreach and travel arranged.",
                          )
                        }
                      >
                        Arrange outreach · $2,500
                      </button>
                    </div>
                  )}
                  <div className="as-grid">
                    {packages.map((p, i) => (
                      <button
                        className={
                          "as-package " + (i === level ? "selected" : "")
                        }
                        key={p.name}
                        disabled={!!chosen.prep||chosen.careerPlan==='Return'||chosen.status!=='College'}
                        onClick={() => setLevel(i)}
                        aria-pressed={i === level}
                      >
                        <span className="as-eyebrow">PACKAGE {i + 1}</span>
                        <h3>{p.name}</h3>
                        <strong>{cash(p.cost)}</strong>
                        <p>{p.description}</p>
                      </button>
                    ))}
                  </div>
                  <div className="as-planner">
                    <label>
                      Priority
                      <select
                        value={prepFocus}
                        onChange={(e) =>
                          setPrepFocus(e.target.value as Prep["focus"])
                        }
                      >
                        <option value="Testing">
                          Testing · improve evaluation
                        </option>
                        <option value="Position">
                          Position work · small football gains
                        </option>
                        <option value="Interview">
                          Interview preparation · communication
                        </option>
                      </select>
                    </label>
                    <div>
                      <label className="as-check">
                        <input
                          type="checkbox"
                          checked={travel}
                          onChange={(e) => setTravel(e.target.checked)}
                        />{" "}
                        Travel & accommodation · $4,000
                      </label>
                      <label className="as-check">
                        <input
                          type="checkbox"
                          checked={recovery}
                          onChange={(e) => setRecovery(e.target.checked)}
                        />{" "}
                        Recovery support · $3,000
                      </label>
                    </div>
                    <div className="as-quote">
                      <span>Agency pays upfront</span>
                      <strong>{cash(prepCost(level, travel, recovery))}</strong>
                      <p>
                        Cash remaining:{" "}
                        {cash(s.money - prepCost(level, travel, recovery))}
                        <br />
                        {Math.max(
                          0,
                          (s.money - prepCost(level, travel, recovery)) /
                            burn(s),
                        ).toFixed(1)}{" "}
                        weeks of current overhead. Other commitments and debt
                        are additional.
                      </p>
                      <button
                        className="as-primary"
                        disabled={
                          s.week < 12 ||
                          s.week > 14 ||
                          !!chosen.prep ||
                          s.failed || s.money < prepCost(level,travel,recovery) ||
                          (!!currentReview(s,chosen.id) && currentReview(s,chosen.id)!.status !== 'Renewed') ||
                          chosen.careerPlan === "Return" ||
                          chosen.status !== "College"
                        }
                        onClick={() =>
                          update(
                            (x) =>
                              decideAgency(x, {
                                type: "prep",
                                id: chosen.id,
                                level,
                                focus: prepFocus,
                                travel,
                                recovery,
                              }),
                            "Pro Day package booked.",
                          )
                        }
                      >
                        {chosen.careerPlan === "Return"
                          ? "Returning to school"
                          : chosen.prep
                            ? "Package already booked"
                            : "Book Pro Day package"}
                      </button>
                    </div>
                    <div>
                      <h3>{chosen.name}</h3>
                      <p>
                        {researchedOutlook({
                          ...chosen,
                          interview:
                            chosen.interview >= 100
                              ? chosen.interview - 100
                              : chosen.interview,
                        })}
                      </p>
                      <p>
                        Draft evaluations combine football ability, season
                        performance and preparation. The final decision also
                        includes uncertainty and competing prospects.
                      </p>
                      {chosen.prep && (
                        <p>
                          Booked: {packages[chosen.prep.level]!.name} ·{" "}
                          {chosen.prep.focus} ·{" "}
                          {chosen.prep.resolved ? "completed" : "scheduled"}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
              <div className="as-panel">
                <h3>How your agency earns at the next level</h3>
                <p>
                  Fictional game payouts: Rounds 1–7 pay $350k / $200k / $130k /
                  $90k / $65k / $50k / $40k. An undrafted signing pays $12k.
                  Making a roster pays another $15k for drafted clients or $8k
                  for undrafted clients.
                </p>
                <p>
                  Retained pro clients bring $22k per year if drafted, $12k
                  otherwise, for up to four annual renewals. These are
                  accelerated game rules, not real-world commission schedules.
                </p>
              </div>
            </>
          )}
          {tab === "Weekly Recap" && (
            <>
              {!recap ? (
                <div className="as-empty">
                  <h2>Saturday gives your decisions meaning.</h2>
                  <p>
                    Your first recap arrives after Week 1: box stats, deals,
                    client progress and the agency cash position.
                  </p>
                  <button onClick={() => go("Scouting")}>
                    Find your first client
                  </button>
                </div>
              ) : (
                <>
                  <div className="as-section-title">
                    <div>
                      <span className="as-eyebrow">
                        THE ORIGIN DISPATCH / {recap.year}
                      </span>
                      <h2>{recap.title}</h2>
                    </div>
                    <label>
                      Recap archive
                      <select
                        value={recapIndex}
                        onChange={(e) => setRecapIndex(+e.target.value)}
                      >
                        {s.recaps.map((r, i) => (
                          <option key={`${r.year}-${r.week}`} value={i}>
                            {r.year} · {r.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="as-summary">
                    <div>
                      <span>Cash change since last recap</span>
                      <b
                        className={
                          recap.net >= 0 ? "as-positive" : "as-negative"
                        }
                      >
                        {cash(recap.net)}
                      </b>
                    </div>
                    <div>
                      <span>Closing balance</span>
                      <b>{cash(recap.balance)}</b>
                    </div>
                  </div>
                  {recap.careers && recap.careers.length > 0 && (
                    <>
                      <h2>Your clients at the next level</h2>
                      <div className="as-grid">
                        {recap.careers.map((c) => {
                          const p = s.players.find((p) => p.id === c.player)!;
                          return (
                            <article className="as-panel" key={c.player}>
                              <div className="as-person">
                                <Portrait p={p} />
                                <div>
                                  <span className="as-eyebrow">
                                    {p.position} · SEASON {recap.year}
                                  </span>
                                  <h3>{p.name}</h3>
                                </div>
                              </div>
                              <div className="as-box">
                                <strong>
                                  {c.returning
                                    ? "Returning to school"
                                    : recap.week === 15
                                      ? c.outlook
                                      : c.pick
                                        ? `Round ${Math.ceil(c.pick / 32)} · Pick ${((c.pick - 1) % 32) + 1}`
                                        : c.status}
                                </strong>
                                <small>
                                  {c.returning
                                    ? "Another season of eligibility and NIL opportunities"
                                    : recap.week === 15
                                      ? "Projected after Pro Day"
                                      : c.status === "Pro"
                                        ? "Professional roster secured"
                                        : c.status === "Drafted"
                                          ? "Drafted and signed"
                                          : c.status === "Signed"
                                            ? "Undrafted contract signed"
                                            : c.status === "Tryout"
                                              ? "A tryout opportunity"
                                              : c.status === "Undrafted"
                                                ? "The next call still matters"
                                                : "No roster place secured"}
                                </small>
                              </div>
                              <button
                                onClick={() => {
                                  setSelected(p.id);
                                  go("Clients");
                                }}
                              >
                                Open career file ↗
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {recap.week <= 14 && <h2>Your clients on Saturday</h2>}
                  {recap.boxes.length === 0 ? (
                    recap.week <= 14 && (
                      <p>
                        No client college games in this period. Follow career
                        developments below.
                      </p>
                    )
                  ) : (
                    <div className="as-grid">
                      {recap.boxes.map(({ player, box }) => {
                        const p = s.players.find((p) => p.id === player)!;
                        return (
                          <article className="as-panel" key={player}>
                            <div className="as-person">
                              <Portrait p={p} />
                              <div>
                                <h3>{p.name}</h3>
                                <span className="as-eyebrow">
                                  {p.position} ·{" "}
                                  {box.for > box.against ? "WIN" : "LOSS"}
                                </span>
                              </div>
                            </div>
                            <div className="as-box">
                              <StatLine p={p} b={box} />
                            </div>
                            <button
                              onClick={() => {
                                setSelected(p.id);
                                go("Clients");
                              }}
                            >
                              Career box statistics ↗
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                  <h2>On and off the field</h2>
                  <section className="as-panel">
                    {recap.news.length ? (
                      recap.news.slice(0,3).map((n, i) => (
                        <p className="as-dispatch" key={i}>
                          {n}
                        </p>
                      ))
                    ) : (
                      <p>
                        A quiet week off the field. Client performances and
                        operating costs are recorded above.
                      </p>
                    )}
                  </section>
                  {recap.news.length>3&&<details className="as-panel"><summary>More league news · {recap.news.length-3}</summary>{recap.news.slice(3).map((n,i)=><p key={i}>{n}</p>)}</details>}
                  {s.honors.some(
                    (h) => h.year === recap.year && h.week === recap.week,
                  ) && <h3>Weekly honors</h3>}
                  {s.honors
                    .filter(
                      (h) => h.year === recap.year && h.week === recap.week,
                    )
                    .map((h) => (
                      <div className="as-row" key={h.name}>
                        <b>{h.name}</b>
                        <span>
                          {s.players.find((p) => p.id === h.player)?.name}
                        </span>
                      </div>
                    ))}
                </>
              )}
            </>
          )}
          {tab === "Football World" && (
            <>
              <div className="as-page-intro">
                <h2>The world keeps moving.</h2>
                <p>
                  16 fictional schools, 12 regular-season games, a four-team
                  playoff. You represent players; their schools run the teams.
                  This demo uses a shared invitational across its fictional FBS
                  and FCS conferences, not separate real-world championships.
                </p>
              </div>
              <div className="as-subtabs">
                {["Standings", "Scores", "Awards", "Draft Board"].map((t) => (
                  <button
                    aria-pressed={worldTab === t}
                    onClick={() => setWorldTab(t)}
                    key={t}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {worldTab === "Standings" && (
                <>
                  {standings(s).map((t, i) => (
                    <div className="as-row" key={t.id}>
                      <b>
                        #{i + 1} {t.name}
                        <small>
                          {schools[t.id]!.division} ·{" "}
                          {schools[t.id]!.conference}
                        </small>
                      </b>
                      <span>
                        {t.wins}–{t.losses}
                      </span>
                      <span>
                        {t.diff > 0 ? "+" : ""}
                        {t.diff} differential
                      </span>
                    </div>
                  ))}
                  <p className="as-fine">
                    Ranked by wins, then point differential, then school order.
                    Top four after Week 12 qualify for the playoffs.
                  </p>
                </>
              )}
              {worldTab === "Scores" && (
                <>
                  {s.matches
                    .filter((m) => m.week > 12)
                    .map((m, i) => (
                      <div className="as-panel" key={i}>
                        <span className="as-eyebrow">
                          {m.week === 13
                            ? "SEMIFINAL"
                            : "NATIONAL CHAMPIONSHIP"}
                        </span>
                        <h3>
                          {teams[m.home]} {m.hs ?? "—"} · {m.as ?? "—"}{" "}
                          {teams[m.away]}
                        </h3>
                      </div>
                    ))}
                  {Array.from({ length: 12 }, (_, i) => 12 - i).map((w) => (
                    <details key={w} open={w === Math.min(12, s.week)}>
                      <summary>Week {w}</summary>
                      {s.matches
                        .filter((m) => m.week === w)
                        .map((m) => (
                          <div className="as-row" key={m.home}>
                            <b>
                              {teams[m.home]} vs {teams[m.away]}
                            </b>
                            <span>
                              {m.hs === null ? "Upcoming" : `${m.hs}–${m.as}`}
                            </span>
                          </div>
                        ))}
                    </details>
                  ))}
                </>
              )}
              {worldTab === "Awards" && (
                <>
                  <h3>
                    Founders Trophy ·{" "}
                    {s.week < 12
                      ? "live race"
                      : "regular-season award finalized"}
                  </h3>
                  {s.players
                    .filter((p) => p.season === s.year)
                    .sort((a, b) => seasonPoints(b) - seasonPoints(a))
                    .slice(0, 10)
                    .map((p, i) => (
                      <div className="as-row" key={p.id}>
                        <b>
                          {i + 1}. {p.name}
                          <small>
                            {p.position} · {teams[p.school]}
                          </small>
                        </b>
                        <span>{agentName(p)}</span>
                        <strong>{seasonPoints(p).toFixed(1)} pts</strong>
                      </div>
                    ))}
                  <h3>Award history</h3>
                  {s.honors
                    .slice()
                    .reverse()
                    .map((h, i) => (
                      <div className="as-row" key={i}>
                        <b>
                          {h.name}
                          <small>
                            {h.year} ·{" "}
                            {h.week ? `Week ${h.week}` : "Annual award"}
                          </small>
                        </b>
                        <span>
                          {s.players.find((p) => p.id === h.player)?.name}
                        </span>
                      </div>
                    ))}
                </>
              )}
              {worldTab === "Draft Board" && (
                <>
                  <p>
                    {s.week < 16
                      ? "Projection watchlist"
                      : "Actual draft outcomes"}{" "}
                    for tracked players. The wider draft has 224 slots;
                    untracked prospects occupy other slots. Early projections
                    can overlap; final picks are unique.
                  </p>
                  {s.players
                    .filter((p) => p.season === s.year)
                    .sort((a, b) =>
                      s.week < 16
                        ? draftGrade(b) - draftGrade(a)
                        : (a.pick ?? 999) - (b.pick ?? 999),
                    )
                    .map((p) => (
                      <div
                        className={
                          "as-row " + (p.owner === "you" ? "highlight" : "")
                        }
                        key={p.id}
                      >
                        <b>
                          {p.name}
                          <small>
                            {p.position} · {teams[p.school]}
                          </small>
                        </b>
                        <span>{agentName(p)}</span>
                        <strong>
                          {s.week < 16
                            ? researchedOutlook(p)
                            : p.pick
                              ? `Round ${Math.ceil(p.pick / 32)} · Pick ${((p.pick - 1) % 32) + 1}`
                              : p.status}
                        </strong>
                      </div>
                    ))}
                </>
              )}
            </>
          )}
          {tab === "Competitors" && (
            <>
              <div className="as-page-intro">
                <span className="as-eyebrow">
                  FIVE RIVALS. ONE PLACE TO MAKE YOUR NAME.
                </span>
                <h2>Earn your seat at the table.</h2>
                <p>
                  Two established leaders, two mid-sized agencies, and a
                  newcomer like you. Rivals recruit through Week 6, fund
                  preparation, and earn income from their clients.
                </p>
              </div>
              <div className="as-rival you">
                <div>
                  <span className="as-eyebrow">YOUR AGENCY</span>
                  <h3>Origin Sports Agency</h3>
                  <p>Personal attention. A reputation still being written.</p>
                </div>
                <div>
                  <strong>{Math.round(s.reputation)}</strong>
                  <small>Prestige</small>
                </div>
                <div>
                  <strong>{clients.length}</strong>
                  <small>Active clients</small>
                </div>
              </div>
              {s.rivals
                .slice()
                .sort((a, b) => b.reputation - a.reputation)
                .map((r) => (
                  <article className="as-rival" key={r.id}>
                    <div>
                      <span className="as-eyebrow">{r.tier}</span>
                      <h3>{r.name}</h3>
                      <p>
                        {r.style} specialists ·{" "}
                        {r.cash > 0
                          ? "Actively operating"
                          : "Restructuring after financial pressure"}
                      </p>
                      <details>
                        <summary>Public client list</summary>
                        {s.players
                          .filter((p) => p.owner === r.id)
                          .map((p) => (
                            <p key={p.id}>
                              {p.name} · {p.position} · {p.status}
                            </p>
                          ))}
                      </details>
                    </div>
                    <div>
                      <strong>{Math.round(r.reputation)}</strong>
                      <small>Prestige</small>
                    </div>
                    <div>
                      <strong>
                        {s.players.filter((p) => p.owner === r.id).length}
                      </strong>
                      <small>Represented</small>
                    </div>
                    <div>
                      <strong>{r.drafted}</strong>
                      <small>Drafted clients</small>
                    </div>
                  </article>
                ))}
              <p className="as-fine">
                Rivals have finite cash and capacity. Their private balances are
                not visible. Signed clients stay under their agreement until the
                annual renewal decision.
              </p>
            </>
          )}
          {tab === "Finances" && (
            <>
              <div className="as-page-intro">
                <h2>Keep tomorrow funded.</h2>
                <p>
                  Runway covers current office overhead only. Preparation,
                  activation costs and loan repayment are additional.
                </p>
              </div>
              <div className="as-summary">
                <div>
                  <span>Cash available</span>
                  <b>{cash(s.money)}</b>
                </div>
                <div>
                  <span>Commercial commissions received</span>
                  <b>
                    {cash(
                      s.ledger
                        .filter((l) => l.kind === "Commission")
                        .reduce((n, l) => n + l.amount, 0),
                    )}
                  </b>
                </div>
                <div>
                  <span>Professional income received</span>
                  <b>
                    {cash(
                      s.ledger
                        .filter((l) => l.kind === "Pro income")
                        .reduce((n, l) => n + l.amount, 0),
                    )}
                  </b>
                </div>
              </div>
              <div className="as-two">
                <section className="as-panel">
                  <h3>A bridge, not a rescue.</h3>
                  <p>
                    Borrow $40,000. Repay $44,800 at the agency year review:
                    principal plus 12% interest. One outstanding loan. Negative
                    cash ends the career.
                  </p>
                  <button
                    disabled={s.loan}
                    onClick={() =>
                      update(
                        (x) => decideAgency(x, { type: "loan" }),
                        "Loan received; $44,800 is due at the year review.",
                      )
                    }
                  >
                    {s.loan ? "$44,800 due at year review" : "Borrow $40,000"}
                  </button>
                </section>
                <section className="as-panel">
                  <h3>Build your support team</h3>
                  <p>
                    {s.staff}/2 client service associates. Each adds one college
                    client place and one project slot. $6,000 setup, then $750
                    each week.
                  </p>
                  <button
                    disabled={earnedPrestige(s) < 18 || s.staff >= 2}
                    onClick={() =>
                      update(
                        (x) => decideAgency(x, { type: "hire" }),
                        "New associate hired.",
                      )
                    }
                  >
                    {earnedPrestige(s) < 18
                      ? "Available at 18 prestige"
                      : "Hire client service associate"}
                  </button>
                </section>
              </div>
              <h2>Cash ledger</h2>
              <div className="as-row">
                <b>Opening investment</b>
                <span>{cash(100000)}</span>
              </div>
              {s.ledger
                .slice()
                .reverse()
                .map((l, i) => (
                  <div className="as-row" key={i}>
                    <div>
                      <b>{l.label}</b>
                      <small>
                        {l.year} · Week {l.week} · {l.kind}
                      </small>
                    </div>
                    <strong
                      className={l.amount >= 0 ? "as-positive" : "as-negative"}
                    >
                      {cash(l.amount)}
                    </strong>
                  </div>
                ))}
            </>
          )}
          <footer className="as-footer">
            <p>
              Fictional athletes, schools and agency economics. Automatic
              browser save. Draft payouts are game mechanics, not real
              commission rules.
            </p>
            {newConfirm ? (
              <div className="as-buttons">
                <span>Replace this agency save?</span>
                <button
                  className="as-danger"
                  onClick={() => {
                    if (update(() => startAgency())) {
                      setNewConfirm(false);
                      setSelected("");
                      go("Agency");
                      setRecapIndex(0);
                    }
                  }}
                >
                  Confirm new agency
                </button>
                <button onClick={() => setNewConfirm(false)}>
                  Keep this agency
                </button>
              </div>
            ) : (
              <button onClick={() => setNewConfirm(true)}>
                Start a new agency
              </button>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
