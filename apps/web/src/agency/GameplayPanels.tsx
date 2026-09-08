import { activeDevelopment } from "./growth.js";
import { commercialService } from "./commercial.js";
import { useState } from "react";
import {
  cash,
  decideAgency,
  priorities,
  schools,
  teams,
  type Action,
  type Athlete,
  type State,
  type Want,
} from "./model.js";
import {
  ambitionLabel,
  ambitionProgress,
  counterChance,
  recruitingBonus,
  requestOptions,
  requestText,
  type Negotiation,
} from "./gameplay.js";

type Props = {
  s: State;
  update: (fn: (s: State) => State, message?: string) => boolean;
};
export function DecisionDesk({
  s,
  go,
}: {
  s: State;
  go: (tab: string) => void;
}) {
  const g = s.gameplay;
  if (!g) return null;
  const items = [
    { label: "client request", tab: "Clients", rows: g.requests },
    { label: "final recruiting offer", tab: "Scouting", rows: g.negotiations },
    { label: "breakout sponsor offer", tab: "Deals", rows: g.offers },
  ]
    .map((item) => ({
      ...item,
      open: item.rows.filter((r) => r.year === s.year && r.status === "Open"),
    }))
    .filter((item) => item.open.length);
  if (!items.length) return null;
  return (
    <section className="as-decision-desk" aria-label="Decisions awaiting you">
      <strong>Before you advance</strong>
      {items.map((item) => (
        <button key={item.tab} onClick={() => go(item.tab)}>
          {item.open.length} {item.label}
          {item.open.length > 1 ? "s" : ""} · earliest deadline Week{" "}
          {Math.min(...item.open.map((r) => r.deadline))} ↗
        </button>
      ))}
      <small>
        Respond by the end of the deadline week. Advancing beyond it closes the
        offer or request.
      </small>
    </section>
  );
}
export function ClientRequests({
  s,
  update,
  player,
}: Props & { player?: string }) {
  const requests =
    s.gameplay?.requests.filter(
      (r) => r.year === s.year && (!player || r.player === player),
    ) ?? [];
  const open = requests.filter((r) => r.status === "Open");
  const history = requests.filter((r) => r.status !== "Open");
  if (!requests.length) return null;
  return (
    <section className="as-story-section" aria-label="Client requests">
      {open.length > 0 && <h2>What your clients need</h2>}
      <div className="as-grid">
        {open.map((r) => {
          const p = s.players.find((p) => p.id === r.player)!;
          return (
            <article className="as-panel as-story-card" key={r.id}>
              <span className="as-eyebrow">
                CLIENT REQUEST · RESPOND BY END OF WEEK {r.deadline}
              </span>
              <h3>{p.name}</h3>
              <p>“{requestText(r)}”</p>
              <p className="as-fine">
                Current: {Math.round(p.fatigue)} fatigue · {Math.round(p.trust)}{" "}
                trust. Ignoring this request costs 4 trust.
              </p>
              <div className="as-choice-list">
                {requestOptions(r, p).map((o, choice) => (
                  <button
                    key={o.label}
                    disabled={s.failed || s.money < o.cost}
                    onClick={() =>
                      update(
                        (x) =>
                          decideAgency(x, {
                            type: "request",
                            id: r.id,
                            choice,
                          }),
                        `${p.name}'s response is saved below; check the weekly recap for the follow-up.`,
                      )
                    }
                  >
                    <strong>{o.label}</strong>
                    <small>{o.detail}</small>
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      {history.length > 0 && (
        <details className="as-panel as-story-history">
          <summary>Client conversations · {history.length}</summary>
          {[...history].reverse().map((r) => (
            <div key={r.id}>
              <h4>
                {s.players.find((p) => p.id === r.player)!.name} · Week {r.week}{" "}
                · {r.status}
              </h4>
              <p>{r.response}</p>
              {r.followup && (
                <p>
                  <strong>Follow-up:</strong> {r.followup}
                </p>
              )}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
export function ClientAmbitions({ s, p }: { s: State; p: Athlete }) {
  const all = s.gameplay?.ambitions.filter((a) => a.player === p.id) ?? [];
  const goal = all.find((a) => a.year === s.year);
  if (!all.length) return null;
  return (
    <section className="as-panel as-ambition">
      <span className="as-eyebrow">A SEASON WITH A PURPOSE</span>
      {goal && (
        <>
          <h3>{ambitionLabel(goal)}</h3>
          <progress
            aria-label={`${p.name} season ambition`}
            max={100}
            value={Math.round(ambitionProgress(s, p, goal) * 100)}
          />
          <p>
            {goal.completed !== undefined
              ? `Achieved in Week ${goal.completed}. Trust +8 and agency prestige +2 earned.`
              : `${Math.round(ambitionProgress(s, p, goal) * 100)}% complete. Reward: +8 trust and +2 agency prestige. Achieve it during recruiting for a prospect referral, when someone is available.`}
          </p>
          {goal.kind === "Stage" && goal.completed === undefined && (
            <p className="as-fine">
              School moves open in preseason. Return with eligibility to pursue
              this next year. A stronger school can reduce playing time.
            </p>
          )}
        </>
      )}
      {all.some((a) => a.memory) && (
        <details>
          <summary>Career memories</summary>
          {all
            .filter((a) => a.memory)
            .map((a) => (
              <p key={a.id}>{a.memory}</p>
            ))}
        </details>
      )}
    </section>
  );
}
export function CounterOffer({
  s,
  update,
  n,
  onResolved,
}: Props & { n: Negotiation; onResolved?: () => void }) {
  const [fee, setFee] = useState(n.fee),
    [promise, setPromise] = useState<Want>(n.promise),
    [attention, setAttention] = useState(false);
  const p = s.players.find((p) => p.id === n.player)!;
  const rival = s.rivals.find((r) => r.id === n.rival)!;
  function act(a: Action) {
    if (update((x) => decideAgency(x, a))) onResolved?.();
  }
  return (
    <article className="as-panel as-story-card">
      <span className="as-eyebrow">
        ONE FINAL OFFER · END OF WEEK {n.deadline}
      </span>
      <h3>{p.name} is comparing agencies</h3>
      <p>
        <strong>{rival.name}:</strong> {n.rivalFee}% commission ·{" "}
        {priorities[rival.style].label.toLowerCase()}. They reserved $4,000 and
        one client place.
      </p>
      <p>
        Client priority: {priorities[p.want].label.toLowerCase()}. You get one
        counter; declining or missing the deadline awards the signing to the
        rival.
      </p>
      <div className="as-offer">
        <label>
          Final commission
          <select value={fee} onChange={(e) => setFee(Number(e.target.value))}>
            {[10, 15, 20].map((f) => (
              <option key={f} value={f}>
                {f}%
              </option>
            ))}
          </select>
        </label>
        <label>
          Final service plan
          <select
            value={promise}
            onChange={(e) => setPromise(e.target.value as Want)}
          >
            {Object.entries(priorities).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="as-attention">
        <input
          type="checkbox"
          checked={attention}
          onChange={(e) => setAttention(e.target.checked)}
        />{" "}
        Add a dedicated planning session · $2,500 if signed; trust +6, fatigue
        −8
      </label>
      <p>
        <strong>
          {counterChance(s, n, fee, promise, attention)}% estimated chance
        </strong>{" "}
        · ${attention ? "4,000" : "1,500"} due if signed, on top of the $500
        meeting. Lower commission reduces your future deal income.
      </p>
      <div className="as-buttons">
        <button
          className="as-primary"
          disabled={
            s.failed ||
            s.money < 1500 + (attention ? 2500 : 0) ||
            s.players.filter((p) => p.owner === "you" && p.status === "College")
              .length >=
              4 + s.staff
          }
          onClick={() =>
            act({ type: "counter", id: n.id, fee, promise, attention })
          }
        >
          Submit final offer for {p.name}
        </button>
        <button
          disabled={s.failed}
          onClick={() => act({ type: "walkAway", id: n.id })}
        >
          Walk away from {p.name}
        </button>
      </div>
    </article>
  );
}
export function RecruitingContests({
  s,
  update,
  onResolved,
}: Props & { onResolved: (player: string) => void }) {
  const negotiations =
    s.gameplay?.negotiations.filter((n) => n.year === s.year) ?? [];
  if (!negotiations.length) return null;
  return (
    <section className="as-story-section">
      {negotiations.some((n) => n.status === "Open") && (
        <h2>Recruiting decisions</h2>
      )}
      {negotiations
        .filter((n) => n.status === "Open")
        .map((n) => (
          <CounterOffer
            key={n.id}
            n={n}
            s={s}
            update={update}
            onResolved={() => onResolved(n.player)}
          />
        ))}
      {negotiations.some((n) => n.status !== "Open") && (
        <details className="as-panel">
          <summary>Recruiting results</summary>
          {negotiations
            .filter((n) => n.status !== "Open")
            .map((n) => (
              <p key={n.id}>{n.result}</p>
            ))}
        </details>
      )}
    </section>
  );
}
export function SpotlightOffers({ s, update }: Props) {
  const offers = s.gameplay?.offers.filter((o) => o.year === s.year) ?? [];
  const open = offers.filter((o) => o.status === "Open");
  return (
    <section className="as-story-section">
      <h2>When Saturday opens a door</h2>
      {!open.length && (
        <p className="as-fine">
          A standout game can attract a short-lived sponsor offer in Weeks 2–10.
          Your regular brand opportunities stay available below.
        </p>
      )}
      <div className="as-grid">
        {open.map((o) => {
          const p = s.players.find((p) => p.id === o.player)!;
          const busy = s.deals.some(d=>d.player===p.id&&d.status==='Active') || activeDevelopment(s).some(r=>r.player===p.id&&commercialService(r.kind));
          return (
            <article className="as-panel as-story-card" key={o.id}>
              <span className="as-eyebrow">
                SATURDAY SPOTLIGHT · END OF WEEK {o.deadline}
              </span>
              <h3>{p.name} caught a sponsor's eye</h3>
              <p>
                Week {o.week}: {o.points.toFixed(1)} performance points. The
                offer reflects this game and {teams[p.school]}'s reach.
              </p>
              <p>
                Current fatigue: {Math.round(p.fatigue)}.
                {busy
                  ? " Finish the current campaign or preparation before taking another."
                  : " Choose how much time to commit."}
              </p>
              <div className="as-choice-list">
                {(["Full", "Light"] as const).map((choice) => {
                  const gross = Math.round(
                      o.gross * (choice === "Light" ? 0.6 : 1),
                    ),
                    cost = 0;
                  const commission = Math.round((gross * p.fee) / 100);
                  return (
                    <button
                      key={choice}
                      disabled={busy || s.failed || s.money < cost}
                      onClick={() =>
                        update(
                          (x) =>
                            decideAgency(x, {
                              type: "spotlightDeal",
                              id: o.id,
                              choice,
                            }),
                          `${p.name}'s ${choice.toLowerCase()} campaign is signed. Follow payment in the contract book.`,
                        )
                      }
                    >
                      <strong>
                        {choice} campaign · {cash(gross)}
                      </strong>
                      <small>
                        {choice === "Light"
                          ? "1 week · +4 fatigue"
                          : "2 weeks · +14 fatigue"}{" "}
                        · sponsor funds production. Client keeps{" "}
                        {cash(gross - commission)}; agency commission{" "}
                        {cash(commission)}, margin {cash(commission - cost)}.
                      </small>
                    </button>
                  );
                })}
                <button
                  disabled={s.failed}
                  onClick={() =>
                    update(
                      (x) =>
                        decideAgency(x, {
                          type: "spotlightDeal",
                          id: o.id,
                          choice: "Pass",
                        }),
                      "Offer passed. No money spent or workload added.",
                    )
                  }
                >
                  Pass · protect time for football
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {offers.some((o) => o.status !== "Open") && (
        <details className="as-panel">
          <summary>Spotlight offer history</summary>
          {offers
            .filter((o) => o.status !== "Open")
            .map((o) => (
              <p key={o.id}>
                {s.players.find((p) => p.id === o.player)!.name} · Week {o.week}{" "}
                · {o.status}: {o.result}
              </p>
            ))}
        </details>
      )}
    </section>
  );
}
export function SeniorWatchlist({ s, update }: Props) {
  const seniors = s.gameplay?.seniors.filter((p) => p.year === s.year) ?? [];
  const arrivals = s.players.filter(
    (p) =>
      p.status === "College" &&
      p.season === s.year &&
      p.schoolYear === 1 &&
      p.id.startsWith("hs-"),
  );
  return (
    <section className="as-story-section">
      <details className="as-panel">
        <summary>
          Next year's prospects · {seniors.filter((p) => p.watched).length}{" "}
          {seniors.filter((p) => p.watched).length === 1 ? "senior" : "seniors"}{" "}
          watched
          {arrivals.length > 0 && ` · ${arrivals.length} college arrivals`}
        </summary>
        <p>
          Watch three high school seniors before they enter college. Film costs
          $500; a follow-up from Week 6 costs $1,500. School commitments arrive
          in Week 10. Familiarity helps next year's pitch; it never guarantees a
          signing.
        </p>
        {arrivals.length > 0 && (
          <div className="as-pipeline-arrivals">
            <h3>From your senior class to college</h3>
            {arrivals.map((p) => (
              <p key={p.id}>
                <strong>{p.name}</strong> · {teams[p.school]} · Year 1 ·
                familiarity +{recruitingBonus(s, p)} interest.{" "}
                {p.owner
                  ? `Signed with ${p.owner === "you" ? "you" : s.rivals.find((r) => r.id === p.owner)?.name}.`
                  : "Available in the college prospect cards below."}
              </p>
            ))}
          </div>
        )}
        <div className="as-grid">
          {seniors.map((p) => (
            <article className="as-story-card" key={p.id}>
              <span className="as-eyebrow">
                HIGH SCHOOL SENIOR · {p.position}
              </span>
              <h3>{p.name}</h3>
              <p>
                {p.committed === null
                  ? `Considering ${p.schools.map((i) => teams[i]).join(", ")}`
                  : `Committed to ${teams[p.committed]} · ${schools[p.committed]!.division}`}
              </p>
              <p>
                {p.research
                  ? `Film estimate: ${p.ability - (p.research === 1 ? 4 : 2)}–${p.ability + (p.research === 1 ? 4 : 2)} ability. Potential remains uncertain.`
                  : "Ability and priorities not yet researched."}
              </p>
              {p.research === 2 && (
                <p>
                  Priority: {priorities[p.want].label}. Potential estimate{" "}
                  {p.ceiling - 5}–{Math.min(99, p.ceiling + 3)}.
                </p>
              )}
              <p className="as-fine">
                Next year's familiarity bonus: +
                {p.research * 4 + (p.watched ? 2 : 0)} interest. College
                representation opens after enrollment. This demo keeps players
                in school through Year 2.
              </p>
              <div className="as-buttons">
                <button
                  disabled={s.failed}
                  aria-pressed={p.watched}
                  onClick={() =>
                    update((x) =>
                      decideAgency(x, { type: "watchSenior", id: p.id }),
                    )
                  }
                >
                  {p.watched ? "Watching" : "Watch"} {p.name}
                </button>
                <button
                  disabled={
                    s.failed ||
                    p.research === 2 ||
                    (p.research === 1 && s.week < 6) ||
                    s.money < (p.research ? 1500 : 500)
                  }
                  onClick={() =>
                    update(
                      (x) =>
                        decideAgency(x, { type: "researchSenior", id: p.id }),
                      `${p.name}'s research is saved.`,
                    )
                  }
                >
                  {p.research === 2
                    ? "Research complete"
                    : p.research === 1
                      ? "Follow-up · $1,500"
                      : "Film report · $500"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
