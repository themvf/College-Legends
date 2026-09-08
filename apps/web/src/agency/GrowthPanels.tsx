import { useState } from "react";
import {
  cash,
  decideAgency,
  depth,
  health,
  playingShare,
  type Athlete,
  type State,
} from "./model.js";
import {
  activeDevelopment,
  agencyGoal,
  developmentQuote,
  earnedPrestige,
  netAgencyCash,
  nextPrestigeTier,
  playerSkills,
  prestigeTier,
  prestigeTiers,
  providers,
  type DevelopmentKind,
} from "./growth.js";

export function GoalBar({
  s,
  open,
  compact = false,
}: {
  s: State;
  open?: () => void;
  compact?: boolean;
}) {
  const next = nextPrestigeTier(s);
  return (
    <section
      className={`as-goal-bar${compact ? " as-goal-compact" : ""}`}
      aria-label="Money and prestige"
    >
      <div>
        <span>Cash · $1M goal</span>
        <strong>{cash(s.money)}</strong>
        <small>Goal: {cash(agencyGoal.money)} after debt</small>
        <progress
          aria-label="Financial goal"
          value={Math.max(0, netAgencyCash(s))}
          max={agencyGoal.money}
        />
      </div>
      <div>
        <span>Prestige</span>
        <strong>
          {Math.round(s.reputation)} <small>/ {agencyGoal.prestige} goal</small>
        </strong>
        <small>
          {next
            ? `Next unlock: ${next.at} prestige`
            : "All prestige tiers unlocked"}
        </small>
        <progress
          aria-label="Prestige goal"
          value={s.reputation}
          max={agencyGoal.prestige}
        />
      </div>
      {open && (
        <button onClick={open} aria-label="View agency goals and unlocks">
          Goals
        </button>
      )}
    </section>
  );
}
export function AgencyGoals({
  s,
  condensed = false,
}: {
  s: State;
  condensed?: boolean;
}) {
  return (
    <section className="as-panel as-agency-goals">
      <span className="as-eyebrow">BUILD A POWERHOUSE</span>
      <h3>
        {s.growth?.won
          ? "You built a championship agency."
          : "Find talent. Build stars. Earn your place."}
      </h3>
      <p>
        Reach <strong>{cash(agencyGoal.money)} after loan obligations</strong>{" "}
        and <strong>{agencyGoal.prestige} prestige</strong> together. These are
        the first playable targets; you can keep playing after winning.
      </p>
      <details open={!condensed}>
        <summary>How to win and what prestige unlocks</summary>
        <p>
          Financial progress: <strong>{cash(netAgencyCash(s))}</strong>
          {s.loan
            ? " after reserving $44,800 for the bridge repayment."
            : "."}{" "}
          Scouting and development use your agency cash; client contract totals
          are not your income.
        </p>
        <p>
          Delivered contracts earn 2 prestige below $50,000, 6 at $50,000+, or
          10 at $100,000+. A client who gains at least 3 ability from targeted
          training and then records an 18-point game earns 5 prestige once.
          Season ambitions, honors and draft success also build prestige.
        </p>
        <p className="as-fine">
          Unlocks stay earned. Winning requires current prestige and finances to
          meet both goals; borrowing cannot complete the money goal.
        </p>
        <ol className="as-tier-list">
          {prestigeTiers.map((t) => (
            <li key={t.at}>
              <strong>
                {earnedPrestige(s) >= t.at ? "Unlocked" : "Locked"} · {t.at}{" "}
                prestige · {t.name}
              </strong>
              <span>{t.unlock}</span>
            </li>
          ))}
        </ol>
        {!!s.growth?.milestones.length && (
          <details>
            <summary>Agency milestones · {s.growth.milestones.length}</summary>
            {[...s.growth.milestones].reverse().map((m) => (
              <p key={m.id}>
                {m.year} · Week {m.week} — {m.text}
              </p>
            ))}
          </details>
        )}
      </details>
    </section>
  );
}
export function PlayerGrowth({ s, p }: { s: State; p: Athlete }) {
  const skills = playerSkills(s, p);
  const origin = s.growth?.clients[p.id];
  const weak = skills.reduce((a, b) => (a.value < b.value ? a : b));
  return (
    <section
      className="as-panel as-player-growth"
      aria-label={`${p.name} development profile`}
    >
      <h3>What could unlock his next step?</h3>
      <div className="as-growth-factors">
        <div>
          <small>Ability</small>
          <strong>{p.ability.toFixed(1)}</strong>
          <span>
            {origin
              ? `${origin.ability.toFixed(1)} when tracking began`
              : "Current football ability"}
          </span>
        </div>
        <div>
          <small>Opportunity</small>
          <strong>{depth(p).role}</strong>
          <span>
            {playingShare(p, s.week)}% expected snaps · {health(p, s.week)}
          </span>
        </div>
        <div>
          <small>Fame</small>
          <strong>{Math.round(p.recognition)}</strong>
          <span>Public profile attracts commercial interest</span>
        </div>
      </div>
      <div className="as-skill-grid">
        {skills.map((v) => (
          <div key={v.name}>
            <span>
              {v.name}
              {v.name === weak.name ? " · development focus" : ""}
            </span>
            <strong>{v.value.toFixed(1)} / 99</strong>
            <progress aria-label={v.name} value={v.value} max={99} />
          </div>
        ))}
      </div>
      <p className="as-fine">
        Targeted training lifts the selected skill; every 3 skill points adds 1
        overall ability, up to the player's potential. Other ability changes
        move the three skill ratings together. Schools determine role; games
        determine performance.
      </p>
    </section>
  );
}
export function DevelopmentHistory({ s, p }: { s: State; p: Athlete }) {
  const rows =
    s.growth?.records.filter(
      (r) => r.player === p.id && r.status === "Complete",
    ) ?? [];
  return (
    <section className="as-panel">
      <h3>Development record</h3>
      {rows.length === 0 ? (
        <p>Your completed plans and results will stay here across seasons.</p>
      ) : (
        <>
          <p>
            {cash(rows.reduce((n, r) => n + r.cost, 0))} invested in{" "}
            {rows.length} completed plan{rows.length === 1 ? "" : "s"}.
          </p>
          {[...rows].reverse().map((r) => (
            <article className="as-development-receipt" key={r.id}>
              <strong>
                {r.year} · Week {r.due} ·{" "}
                {r.kind === "Skill"
                  ? playerSkills(s, p)[r.skill]!.name
                  : r.kind}{" "}
                · {cash(r.cost)}
              </strong>
              <p>{r.result}</p>
              <small>
                During this block, including other activity: ability{" "}
                {r.before.ability.toFixed(1)} → {r.after?.ability.toFixed(1)};
                role {r.before.role} → {r.after?.role}.
              </small>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
export function DevelopmentPlanner({
  s,
  p,
  update,
}: {
  s: State;
  p: Athlete;
  update: (fn: (s: State) => State, message?: string) => boolean;
}) {
  const skills = playerSkills(s, p);
  const [kind, setKind] = useState<DevelopmentKind>(
    !p.delivered && p.promise === "Visibility" ? "Media" : "Skill",
  );
  const [skill, setSkill] = useState(() =>
    skills.indexOf(skills.reduce((a, b) => (a.value < b.value ? a : b))),
  );
  const [provider, setProvider] = useState(0);
  const quote = developmentQuote(s, p, kind, skill, provider);
  const pending = activeDevelopment(s);
  const reason = s.failed
    ? "The agency is closed."
    : p.status !== "College"
      ? "Development is available to college clients."
      : pending.some((r) => r.player === p.id) ||
          s.jobs.some((j) => j.player === p.id)
        ? "This client already has a development block in progress."
        : pending.length + s.jobs.length >= 2 + s.staff
          ? "All development places are filled."
          : s.week + quote.weeks > 12
            ? "This plan cannot finish by Week 12."
            : kind === "Skill" &&
                earnedPrestige(s) < providers[provider]!.prestige
              ? `Unlock this specialist at ${providers[provider]!.prestige} prestige.`
              : kind === "Skill" && p.injury && s.week <= p.injury.throughWeek
                ? "Injured: arrange recovery support or wait before skill training."
                : s.money < quote.cost
                  ? "Not enough agency cash."
                  : "";
  return (
    <>
      <PlayerGrowth s={s} p={p} />
      <section className="as-panel as-development-builder">
        <h3>Choose where your investment goes</h3>
        <label>
          Development plan
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DevelopmentKind)}
          >
            <option value="Skill">Target a football weakness</option>
            <option value="Media">Build public profile</option>
            <option value="Recovery">Arrange recovery support</option>
            <option value="Mentor">Hire a personal mentor</option>
          </select>
        </label>
        {kind === "Skill" && (
          <>
            <label>
              Skill to develop
              <select
                value={skill}
                onChange={(e) => setSkill(Number(e.target.value))}
              >
                {skills.map((v, i) => (
                  <option value={i} key={v.name}>
                    {v.name} · {v.value.toFixed(1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Development specialist
              <select
                value={provider}
                onChange={(e) => setProvider(Number(e.target.value))}
              >
                {providers.map((v, i) => (
                  <option value={i} key={v.name}>
                    {v.name} · {cash(v.cost)}
                    {earnedPrestige(s) < v.prestige
                      ? ` · locked until ${v.prestige} prestige`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <div className="as-quote">
          <span>Agency investment</span>
          <strong>
            {cash(quote.cost)} · {quote.weeks} weeks
          </strong>
          <p>{quote.detail}</p>
          <p>
            {kind === "Skill"
              ? "Training adds 3 fatigue per attended week. Improvement is uncertain; expensive support cannot guarantee a star."
              : "One development commitment per client at a time."}
          </p>
          <p>
            Cash after booking: <strong>{cash(s.money - quote.cost)}</strong> ·
            Report due Week {s.week + quote.weeks}
          </p>
          <button
            className="as-primary"
            disabled={!!reason}
            onClick={() =>
              update(
                (x) =>
                  decideAgency(x, {
                    type: "developmentPlan",
                    id: p.id,
                    kind,
                    skill,
                    provider,
                  }),
                `${p.name}'s plan is booked. Advance weeks to follow the results.`,
              )
            }
          >
            Book development · {cash(quote.cost)}
          </button>
          {reason && <p>{reason}</p>}
        </div>
      </section>
      <section className="as-panel">
        <h3>
          Work in progress · {pending.length + s.jobs.length}/{2 + s.staff}
        </h3>
        {pending.map((r) => (
          <div className="as-development-receipt" key={r.id}>
            <strong>
              {s.players.find((q) => q.id === r.player)!.name} ·{" "}
              {r.kind === "Skill"
                ? playerSkills(s, s.players.find((q) => q.id === r.player)!)[
                    r.skill
                  ]!.name
                : r.kind}
            </strong>
            <p>
              Report due Week {r.due} · {cash(r.cost)} invested
            </p>
            <progress
              aria-label={`${s.players.find((q) => q.id === r.player)!.name} development progress`}
              max={r.due - r.week}
              value={Math.max(0, s.week - r.week)}
            />
          </div>
        ))}
        {s.jobs.map((j) => (
          <p key={j.player}>
            {s.players.find((q) => q.id === j.player)!.name} · Existing{" "}
            {j.focus.toLowerCase()} block · {j.left} weeks remaining
          </p>
        ))}
        {!pending.length && !s.jobs.length && (
          <p>
            No development commitments yet. You can also compare a school move
            below.
          </p>
        )}
      </section>
      <DevelopmentHistory s={s} p={p} />
    </>
  );
}
