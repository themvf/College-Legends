import { useState } from "react";
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
  standings,
  seasonPoints,
  draftGrade,
  projection,
  fit,
  packages,
  coaches,
  venues,
  brands,
  prepCost,
  decideAgency,
  advanceAgency,
  type State,
  type Athlete,
  type Want,
  type Box,
  type Job,
  type Prep,
} from "./model.js";
import { Office } from "./Office.js";
import "./agency.css";
const sections = [
  "Agency",
  "Weekly Recap",
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
        {p.position === "QB"
          ? `${b.comp}/${b.att} passing · ${b.int} INT · `
          : ""}
        {teams[b.team]} {b.for}–{b.against} {teams[b.opponent]}
      </small>
    </>
  );
}
export function AgencyGame() {
  const [s, setS] = useState(initial),
    [tab, setTab] = useState("Agency"),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [promise, setPromise] = useState<Want>("Development"),
    [fee, setFee] = useState(15),
    [focus, setFocus] = useState<Job["focus"]>("Technique"),
    [specialist, setSpecialist] = useState(0),
    [venue, setVenue] = useState(0),
    [partner, setPartner] = useState(""),
    [duration, setDuration] = useState(2),
    [intensity, setIntensity] = useState(false),
    [level, setLevel] = useState(0),
    [prepFocus, setPrepFocus] = useState<Prep["focus"]>("Testing"),
    [travel, setTravel] = useState(false),
    [recovery, setRecovery] = useState(false),
    [performance, setPerformance] = useState(false),
    [worldTab, setWorldTab] = useState("Standings"),
    [recapIndex, setRecapIndex] = useState(0),
    [newConfirm, setNewConfirm] = useState(false),
    [expanded, setExpanded] = useState(false);
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
        : available.filter((p) => Number(p.id.split("-")[1]) < 12)
    ).sort((a, b) => a.ability - b.ability),
    recap = s.recaps[recapIndex];
  function update(fn: (s: State) => State, msg = "") {
    try {
      const next = fn(s);
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      setS(next);
      setError("");
      setNotice(msg);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save this decision.",
      );
      return false;
    }
  }
  function go(t: string) {
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
          setPartner("");
        }}
      >
        {clients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.position} · {p.status}
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
            {p.want} {prospect ? "" : `· ${p.status}`}
          </p>
        </div>
      </div>
      <div className="as-metrics">
        <div>
          <b>{Math.round(p.ability)}</b>
          <small>Ability</small>
        </div>
        <div>
          <b>
            {p.scouted
              ? `${Math.max(Math.round(p.ability), p.ceiling - 5)}–${Math.min(99, p.ceiling + 3)}`
              : "Unknown"}
          </b>
          <small>Potential estimate</small>
        </div>
        <div>
          <b>{Math.round(p.recognition)}</b>
          <small>Recognition</small>
        </div>
      </div>
      <div className="as-outlook">
        {p.status === "College"
          ? projection(p)
          : p.pick
            ? `Selected R${Math.ceil(p.pick / 32)} · P${((p.pick - 1) % 32) + 1}`
            : p.status}
        <small>
          {p.status === "College"
            ? "Projected professional outlook"
            : "Career outcome"}
        </small>
      </div>
      {prospect ? (
        <>
          <p className="as-fine">
            {Math.round(fit(s, p, promise, fee))}% estimated interest in this
            offer. Rivals are also recruiting.
          </p>
          <div className="as-buttons">
            <button
              disabled={p.scouted}
              onClick={() =>
                update(
                  (x) => decideAgency(x, { type: "scout", id: p.id }),
                  "Scouting report received. Potential remains uncertain.",
                )
              }
            >
              {p.scouted ? "Scouted" : "Scout · $1,000"}
            </button>
            <button
              className="as-primary"
              aria-label={`Pitch ${p.name}`}
              disabled={
                s.week > 6 ||
                college.length >= 4 + s.staff ||
                p.approached === s.week
              }
              onClick={() => {
                if (
                  update((x) =>
                    decideAgency(x, { type: "pitch", id: p.id, promise, fee }),
                  )
                )
                  setSelected(p.id);
              }}
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
            {p.promise} promised ·{" "}
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
          {sections.map((t, i) => (
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
        <header className="as-top">
          <div>
            <span className="as-eyebrow">
              {s.year} / {phase(s)}
            </span>
            <h1>{tab === "Agency" ? "A small office. A big belief." : tab}</h1>
          </div>
          <div className="as-top-money">
            <strong>{cash(s.money)}</strong>
            <small>
              {(s.money / burn(s)).toFixed(1)} weeks at current overhead
            </small>
          </div>
          <button
            className="as-primary"
            disabled={s.failed || (s.week === 0 && !college.length)}
            onClick={() => {
              if (update(advanceAgency)) {
                setRecapIndex(0);
                if (s.week === 18) setSelected("");
                go(s.week === 18 ? "Agency" : "Weekly Recap");
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
          {tab === "Agency" && (
            <>
              <div className="as-hero-heading">
                <div>
                  <span className="as-eyebrow">
                    YOUR STORY STARTS WITH SOMEONE ELSE’S
                  </span>
                  <h2>
                    {college.length
                      ? "Build careers. Build your agency."
                      : s.year > 2027
                        ? "Find your next class."
                        : "Find your first client."}
                  </h2>
                  <p>
                    {college.length
                      ? "Your clients play on Saturdays. You build the opportunities around them."
                      : "An overlooked player. The right support. A chance to make it together."}
                  </p>
                </div>
                <button onClick={() => go("Scouting")}>
                  {college.length
                    ? "Find another prospect"
                    : "Meet the prospects"}{" "}
                  ↗
                </button>
              </div>
              <Office
                clients={clients.length}
                staff={s.staff}
                year={s.year}
                onRoom={go}
              />
              <div className="as-summary">
                <div>
                  <span>College clients</span>
                  <b>
                    {college.length}
                    <small> / {4 + s.staff} places</small>
                  </b>
                </div>
                <div>
                  <span>Professional clients</span>
                  <b>{clients.filter((p) => p.status === "Pro").length}</b>
                </div>
                <div>
                  <span>Agency reputation</span>
                  <b>
                    {Math.round(s.reputation)}
                    <small> / 100</small>
                  </b>
                </div>
                <div>
                  <span>Weekly overhead</span>
                  <b>{cash(burn(s))}</b>
                </div>
              </div>
              <div className="as-two">
                <section className="as-panel">
                  <span className="as-eyebrow">ON YOUR DESK</span>
                  <h3>
                    {s.year === 2027 && s.week === 0 && !clients.length
                      ? "One relationship comes first"
                      : "Agency dispatch"}
                  </h3>
                  {s.news.slice(0, 5).map((n, i) => (
                    <p key={i}>{n}</p>
                  ))}
                  {s.week >= 12 && s.week <= 14 && (
                    <button
                      className="as-primary"
                      onClick={() => go("Pro Preparation")}
                    >
                      Book Pro Day packages ↗
                    </button>
                  )}
                </section>
                <section className="as-panel">
                  <span className="as-eyebrow">
                    THE BUSINESS YOU’RE BUILDING
                  </span>
                  <h3>Invest before the outcome is known.</h3>
                  <p>
                    Clients keep their earnings. Your agency receives its
                    commission, pays its own expenses, and carries the risk of
                    preparation spending.
                  </p>
                  <div className="as-steps">
                    <span>Discover</span>
                    <span>Develop</span>
                    <span>Represent</span>
                    <span>Reinvest</span>
                  </div>
                  <button onClick={() => go("Finances")}>
                    See the cash plan ↗
                  </button>
                </section>
              </div>
              {clients.length > 0 && (
                <>
                  <div className="as-section-title">
                    <h2>Your people</h2>
                    <button onClick={() => go("Clients")}>
                      All client files ↗
                    </button>
                  </div>
                  <div className="as-grid">
                    {clients.map((p) => playerCard(p))}
                  </div>
                </>
              )}
            </>
          )}
          {tab === "Scouting" && (
            <>
              <div className="as-page-intro">
                <span className="as-eyebrow">
                  A GOOD EYE IS YOUR FIRST ADVANTAGE
                </span>
                <h2>Who deserves a chance?</h2>
                <p>
                  Sign up to {4 + s.staff} college clients. Start with one. The
                  first year follows draft-bound players through their final
                  college season.
                </p>
              </div>
              <div className="as-panel as-offer">
                <label>
                  Your service promise
                  <select
                    value={promise}
                    onChange={(e) => setPromise(e.target.value as Want)}
                  >
                    <option>Development</option>
                    <option>Visibility</option>
                    <option>Security</option>
                  </select>
                </label>
                <label>
                  Your commercial commission
                  <select value={fee} onChange={(e) => setFee(+e.target.value)}>
                    <option value={10}>10% · client-friendly</option>
                    <option value={15}>15% · standard offer</option>
                    <option value={20}>20% · higher agency share</option>
                  </select>
                </label>
                <p>
                  $500 meeting cost; $1,500 setup only if signed. No client
                  advance. Promises affect trust. Security means delivering a
                  paying commercial deal.
                </p>
              </div>
              {s.news[0] && (
                <p className="as-inline-news" role="status">
                  {s.news[0]}
                </p>
              )}
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
            </>
          )}
          {tab === "Clients" && (
            <>
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
                  <div className="as-client-strip">
                    {clients.map((p) => (
                      <button
                        key={p.id}
                        aria-pressed={chosen.id === p.id}
                        onClick={() => setSelected(p.id)}
                      >
                        {p.name}
                        <small>
                          {p.position} · {p.status}
                        </small>
                      </button>
                    ))}
                  </div>
                  <div className="as-client-file">
                    <Portrait p={chosen} />
                    <div>
                      <span className="as-eyebrow">
                        {teams[chosen.school]} · {chosen.position} · CLASS OF{" "}
                        {chosen.season}
                      </span>
                      <h2>{chosen.name}</h2>
                      <p>
                        Values {chosen.want.toLowerCase()}. You promised{" "}
                        {chosen.promise.toLowerCase()}.
                      </p>
                      <div className="as-tags">
                        <span>Trust {Math.round(chosen.trust)}</span>
                        <span>Fatigue {Math.round(chosen.fatigue)}</span>
                        <span>{chosen.fee}% commercial commission</span>
                        <span>{chosen.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="as-two">
                    <section className="as-panel">
                      <h3>The next step</h3>
                      <p>
                        {chosen.status === "College"
                          ? `Current draft projection: ${projection(chosen)}. Your choices can help, but no preparation package guarantees a selection.`
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
                        Ability {Math.round(chosen.ability)} · Recognition{" "}
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
                          : `Professional status: ${chosen.status}`}
                      </p>
                    </section>
                  </div>
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
                </>
              )}
            </>
          )}
          {tab === "Development" && (
            <>
              <div className="as-page-intro">
                <h2>Invest in the person behind the numbers.</h2>
                <p>
                  Choose the specialist, setting and workload. Two concurrent
                  projects initially; one per client. All blocks finish by Week
                  12.
                </p>
              </div>
              {!chosen ? (
                <button onClick={() => go("Scouting")}>
                  Sign a client first
                </button>
              ) : (
                <div className="as-planner">
                  {pickClient}
                  <label>
                    Focus
                    <select
                      value={focus}
                      onChange={(e) => setFocus(e.target.value as Job["focus"])}
                    >
                      <option value="Technique">
                        Position technique · football ability
                      </option>
                      <option value="Media">
                        Media coaching · recognition
                      </option>
                      <option value="Recovery">
                        Recovery · fatigue and trust
                      </option>
                    </select>
                  </label>
                  <label>
                    Specialist
                    <select
                      value={specialist}
                      onChange={(e) => setSpecialist(+e.target.value)}
                    >
                      {coaches.map((c, i) => (
                        <option key={c.name} value={i}>
                          {c.name} · {cash(c.cost)} / 2 weeks
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Environment
                    <select
                      value={venue}
                      onChange={(e) => setVenue(+e.target.value)}
                    >
                      {venues.map((v, i) => (
                        <option key={v.name} value={i}>
                          {v.name} · {cash(v.cost)} / 2 weeks
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Training partner
                    <select
                      value={partner}
                      onChange={(e) => setPartner(e.target.value)}
                    >
                      <option value="">Facility training group</option>
                      {college
                        .filter((p) => p.id !== chosen.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.position}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Duration
                    <select
                      value={duration}
                      onChange={(e) => setDuration(+e.target.value)}
                    >
                      <option value={2}>2 weeks</option>
                      <option value={4}>4 weeks</option>
                    </select>
                  </label>
                  <label className="as-check">
                    <input
                      type="checkbox"
                      checked={intensity}
                      onChange={(e) => setIntensity(e.target.checked)}
                    />{" "}
                    Intensive technique work: faster gains, more fatigue
                  </label>
                  <div className="as-quote">
                    <span>Total agency investment</span>
                    <strong>
                      {cash(
                        ((coaches[specialist]!.cost + venues[venue]!.cost) *
                          duration) /
                          2,
                      )}
                    </strong>
                    <p>
                      QB–WR and FS–EDGE pairings help technique work. Media
                      builds recognition; expensive support does not remove a
                      player's ceiling.
                    </p>
                    <button
                      className="as-primary"
                      onClick={() =>
                        update(
                          (x) =>
                            decideAgency(x, {
                              type: "job",
                              id: chosen.id,
                              focus,
                              specialist,
                              venue,
                              partner,
                              duration,
                              intensity,
                            }),
                          "Development block booked.",
                        )
                      }
                    >
                      Book development
                    </button>
                  </div>
                </div>
              )}
              <h2>
                Work in progress · {s.jobs.length}/{2 + s.staff}
              </h2>
              {s.jobs.map((j) => (
                <div className="as-row" key={j.player}>
                  <b>{s.players.find((p) => p.id === j.player)!.name}</b>
                  <span>
                    {j.focus} · {j.left} weeks remaining
                  </span>
                  <progress value={j.duration - j.left} max={j.duration} />
                </div>
              ))}
            </>
          )}
          {tab === "Deals" && (
            <>
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
                          Lower guarantee + recognition bonus
                        </option>
                      </select>
                    </label>
                    <p>
                      One active campaign per client. Each brand can be signed
                      once per client per year.
                    </p>
                  </div>
                  <div className="as-grid">
                    {brands.map((b, i) => {
                      const gross = Math.round(
                          b.base *
                            (0.8 + chosen.recognition / 100) *
                            (performance ? 0.7 : 1),
                        ),
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
                              ? `${b.min}+ recognition`
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
                              Bonus depends on recognition at completion; it can
                              be zero. Your agency receives its commission on
                              any bonus.
                            </p>
                          )}
                          <p className="as-fine">
                            Client keeps the contract payment less commission.
                            Obligation adds {b.load} fatigue.
                          </p>
                          <button
                            className="as-primary"
                            disabled={
                              chosen.recognition < b.min ||
                              chosen.status !== "College" ||
                              s.deals.some(
                                (d) =>
                                  d.player === chosen.id &&
                                  d.kind === i &&
                                  d.year === s.year,
                              )
                            }
                            onClick={() =>
                              update(
                                (x) =>
                                  decideAgency(x, {
                                    type: "deal",
                                    id: chosen.id,
                                    kind: i,
                                    performance,
                                  }),
                                "Contract signed. Commission arrives after delivery.",
                              )
                            }
                          >
                            Negotiate {b.type.toLowerCase()}
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
                        {chosen.prep
                          ? "Package already booked"
                          : "Book Pro Day package"}
                      </button>
                    </div>
                    <div>
                      <h3>{chosen.name}</h3>
                      <p>
                        {projection({
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
                                    {p.position} · CLASS OF {p.season}
                                  </span>
                                  <h3>{p.name}</h3>
                                </div>
                              </div>
                              <div className="as-box">
                                <strong>
                                  {recap.week === 15
                                    ? c.outlook
                                    : c.pick
                                      ? `Round ${Math.ceil(c.pick / 32)} · Pick ${((c.pick - 1) % 32) + 1}`
                                      : c.status}
                                </strong>
                                <small>
                                  {recap.week === 15
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
                      recap.news.map((n, i) => (
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
                          {t.id < 8 ? "Atlantic" : "Frontier"} Conference
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
                            ? projection(p)
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
                  <small>Reputation</small>
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
                      <small>Reputation</small>
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
                    disabled={s.reputation < 18 || s.staff >= 2}
                    onClick={() =>
                      update(
                        (x) => decideAgency(x, { type: "hire" }),
                        "New associate hired.",
                      )
                    }
                  >
                    {s.reputation < 18
                      ? "Available at 18 reputation"
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
