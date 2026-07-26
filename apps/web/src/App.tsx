import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { CareerPath, GameCommand, GameEvent, GameState, Player, ProgramId } from "@college-legends/model";
import { CAREER_PATHS } from "@college-legends/content";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";

type GameView = { state: GameState; playerProgramId: ProgramId; events: GameEvent[] };
type Screen = "OVERVIEW" | "ROSTER" | "RECRUITING";

const careerOrder: CareerPath[] = ["DYNASTY_BUILDER", "PROGRAM_RISER", "CHAMPIONSHIP_MANDATE"];
const positionOrder: Player["position"][] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
const descriptions: Record<CareerPath, string> = {
  DYNASTY_BUILDER: "Take an overlooked program and build a dynasty. Average players, a small budget, low expectations, and the longest leash.",
  PROGRAM_RISER: "Turn a capable mid-tier program into a national contender. Stronger players and resources, with real pressure to progress.",
  CHAMPIONSHIP_MANDATE: "Inherit a powerhouse roster. You have every advantage—and two seasons to win a national championship."
};

function nextRequestId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function App(): ReactElement {
  const workerRef = useRef<Worker | undefined>(undefined);
  const [game, setGame] = useState<GameView>();
  const [screen, setScreen] = useState<Screen>("ROSTER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedProspectIds, setSelectedProspectIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const worker = new Worker(new URL("./simulation.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      setBusy(false);
      if (response.type === "ERROR") { setError(response.message); return; }
      setGame((previous) => ({
        state: response.state,
        playerProgramId: response.type === "READY" ? response.playerProgramId : previous!.playerProgramId,
        events: response.events
      }));
      if (response.type === "COMPLETE") setSelectedProspectIds(new Set());
    };
    return () => worker.terminate();
  }, []);

  const send = (request: WorkerRequest): void => {
    setBusy(true);
    setError(undefined);
    workerRef.current?.postMessage(request);
  };
  const startGame = (careerPath: CareerPath): void => {
    setScreen("ROSTER");
    send({ type: "CREATE_GAME", requestId: nextRequestId(), careerPath, seed: `web-alpha-${careerPath.toLowerCase()}` });
  };
  const begin = (): void => {
    if (!game) return;
    setScreen("OVERVIEW");
    send({ type: "BEGIN_SEASON", requestId: nextRequestId(), playerProgramId: game.playerProgramId });
  };
  const advance = (): void => {
    if (!game) return;
    const commands: GameCommand[] = [...selectedProspectIds].map((prospectId) => ({
      type: "OFFER_PROSPECT",
      programId: game.playerProgramId,
      prospectId
    }));
    send({ type: "ADVANCE_WEEK", requestId: nextRequestId(), playerProgramId: game.playerProgramId, commands });
  };

  if (!game) return <NewGame busy={busy} onStart={startGame} />;
  return <Dashboard
    game={game}
    screen={screen}
    busy={busy}
    error={error}
    selectedProspectIds={selectedProspectIds}
    onNavigate={setScreen}
    onToggle={(id) => setSelectedProspectIds((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    })}
    onBegin={begin}
    onAdvance={advance}
  />;
}

function NewGame({ busy, onStart }: { busy: boolean; onStart: (path: CareerPath) => void }): ReactElement {
  return <main className="new-game">
    <header className="masthead">
      <p className="eyebrow">College football management</p>
      <h1>College Legends</h1>
      <p>Choose the job that defines your career.</p>
    </header>
    <section className="career-grid">{careerOrder.map((path) => {
      const profile = CAREER_PATHS[path];
      return <article className={`career-card ${profile.tier.toLowerCase()}`} key={path}>
        <p className="tier">{profile.tier} TIER</p>
        <h2>{profile.label}</h2>
        <p>{descriptions[path]}</p>
        <dl>
          <div><dt>Opening budget</dt><dd>${(profile.budget / 1_000_000).toFixed(1)}M</dd></div>
          <div><dt>Opening roster</dt><dd>85 players</dd></div>
          <div><dt>Job security</dt><dd>{profile.initialSecurity}/100</dd></div>
          <div><dt>Mandate</dt><dd>{profile.championshipDeadline ? `Win title in ${profile.championshipDeadline} years` : "Build at your pace"}</dd></div>
        </dl>
        <button disabled={busy} onClick={() => onStart(path)}>{busy ? "Creating program…" : `Start as ${profile.label}`}</button>
      </article>;
    })}</section>
  </main>;
}

function Dashboard({
  game, screen, busy, error, selectedProspectIds, onNavigate, onToggle, onBegin, onAdvance
}: {
  game: GameView;
  screen: Screen;
  busy: boolean;
  error: string | undefined;
  selectedProspectIds: Set<string>;
  onNavigate: (screen: Screen) => void;
  onToggle: (id: string) => void;
  onBegin: () => void;
  onAdvance: () => void;
}): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const roster = useMemo(() => Object.values(game.state.players)
    .filter((player) => player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP")
    .sort((a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position) || b.overall - a.overall), [game.state.players, program.id]);
  const prospects = useMemo(() => Object.values(game.state.prospects)
    .filter((prospect) => prospect.status === "AVAILABLE")
    .sort((a, b) => b.potential - a.potential || b.overall - a.overall)
    .slice(0, 24), [game.state.prospects]);
  const openScholarships = Math.max(0, program.scholarshipLimit - roster.length);
  const isReview = game.state.phase === "ROSTER_REVIEW";

  return <main className="app-shell">
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">{program.tier} TIER PROGRAM</p>
        <h1>{program.name}</h1>
        <p>Season {game.state.season} · {isReview ? "Opening roster review" : `Week ${game.state.week}`}</p>
      </div>
      <div className="week-action">
        {isReview
          ? <><span>Recruiting has not started</span><button disabled={busy} onClick={onBegin}>{busy ? "Starting…" : "Accept roster & begin season"}</button></>
          : <><span>{selectedProspectIds.size} offer{selectedProspectIds.size === 1 ? "" : "s"} queued</span><button disabled={busy} onClick={onAdvance}>{busy ? "Simulating…" : "Advance week"}</button></>}
      </div>
    </header>
    {error && <p className="error">{error}</p>}
    <section className="metrics">
      <Metric label="Record" value={`${program.wins}–${program.losses}`} />
      <Metric label="Budget" value={`$${(program.budget / 1_000_000).toFixed(1)}M`} />
      <Metric label="Job security" value={`${program.coachSecurity}/100`} />
      <Metric label="Roster" value={`${roster.length}/${program.scholarshipLimit}`} />
    </section>
    <nav className="game-nav" aria-label="Program sections">
      {(["OVERVIEW", "ROSTER", "RECRUITING"] as Screen[]).map((item) =>
        <button className={screen === item ? "active" : ""} key={item} onClick={() => onNavigate(item)}>
          {item === "RECRUITING" && isReview ? "Recruiting · Locked" : titleCase(item)}
        </button>)}
    </nav>
    {screen === "OVERVIEW" && <Overview game={game} roster={roster} openScholarships={openScholarships} />}
    {screen === "ROSTER" && <Roster roster={roster} />}
    {screen === "RECRUITING" && <Recruiting
      game={game}
      prospects={prospects}
      locked={isReview || openScholarships === 0}
      openScholarships={openScholarships}
      selectedProspectIds={selectedProspectIds}
      onToggle={onToggle}
    />}
  </main>;
}

function Overview({ game, roster, openScholarships }: { game: GameView; roster: Player[]; openScholarships: number }): ReactElement {
  const signings = game.events.filter((event) => event.type === "PROSPECT_SIGNED");
  const games = game.events.filter((event) => event.type === "GAME_COMPLETED");
  const average = roster.length ? roster.reduce((sum, player) => sum + player.overall, 0) / roster.length : 0;
  return <section className="overview-grid">
    <article className="panel">
      <p className="eyebrow">Program snapshot</p>
      <h2>Your starting point</h2>
      <div className="snapshot-list">
        <p><span>Average roster rating</span><strong>{average.toFixed(1)}</strong></p>
        <p><span>Open scholarships</span><strong>{openScholarships}</strong></p>
        <p><span>Players leaving after season</span><strong>{roster.filter((player) => player.eligibility.seasonsRemaining === 1).length}</strong></p>
      </div>
    </article>
    <article className="panel">
      <p className="eyebrow">Weekly report</p>
      <h2>What happened</h2>
      {game.state.phase === "ROSTER_REVIEW"
        ? <p className="muted">Review all 85 players before beginning the season. No recruiting offers have been made.</p>
        : game.events.length === 0
          ? <p className="muted">Your program is ready for Week {game.state.week}.</p>
          : <ul>{signings.map((event) => <li key={`${event.type}-${event.prospectId}`}><b>Signing:</b> {game.state.prospects[event.prospectId]?.name} joined {game.state.programs[event.programId]?.name}.</li>)}{games.slice(0, 4).map((event) => <li key={event.gameId}><b>Final:</b> {game.state.programs[event.homeProgramId]?.name} {event.homeScore}, {game.state.programs[event.awayProgramId]?.name} {event.awayScore}</li>)}</ul>}
    </article>
  </section>;
}

function Roster({ roster }: { roster: Player[] }): ReactElement {
  const average = roster.reduce((sum, player) => sum + player.overall, 0) / Math.max(roster.length, 1);
  return <section className="panel table-panel">
    <div className="section-heading">
      <div><p className="eyebrow">Opening roster</p><h2>{roster.length} scholarship players</h2></div>
      <p>Average rating {average.toFixed(1)} · complete positional roster</p>
    </div>
    <div className="data-table roster-table">
      <div className="data-row data-header"><span>Player</span><span>Pos</span><span>OVR</span><span>POT</span><span>Year</span><span>Eligibility</span></div>
      {roster.map((player) => <div className="data-row" key={player.id}>
        <strong data-label="Player">{player.name}</strong>
        <span data-label="Position">{player.position}</span>
        <span data-label="Overall">{Math.round(player.overall)}</span>
        <span data-label="Potential">{Math.round(player.potential)}</span>
        <span data-label="Year">{className(player.eligibility.seasonsEnrolled)}</span>
        <span data-label="Eligibility">{player.eligibility.seasonsRemaining} seasons</span>
      </div>)}
    </div>
  </section>;
}

function Recruiting({ game, prospects, locked, openScholarships, selectedProspectIds, onToggle }: {
  game: GameView;
  prospects: GameState["prospects"][string][];
  locked: boolean;
  openScholarships: number;
  selectedProspectIds: Set<string>;
  onToggle: (id: string) => void;
}): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  return <section className="panel table-panel">
    <div className="section-heading">
      <div><p className="eyebrow">Recruiting board</p><h2>{locked ? "Recruiting is not open yet" : "Available prospects"}</h2></div>
      <p>{game.state.phase === "ROSTER_REVIEW" ? "Begin with the roster you inherited. No offers exist." : openScholarships === 0 ? "Your 85-player roster is full. Openings arrive after departures." : `${openScholarships} scholarship openings available.`}</p>
    </div>
    {!locked && <div className="data-table recruit-table">
      <div className="data-row data-header"><span>Prospect</span><span>Pos</span><span>OVR</span><span>POT</span><span>Interest</span><span>Offer</span></div>
      {prospects.map((prospect) => <div className="data-row" key={prospect.id}>
        <strong data-label="Prospect">{prospect.name}</strong>
        <span data-label="Position">{prospect.position}</span>
        <span data-label="Overall">{prospect.overall}</span>
        <span data-label="Potential">{Math.round(prospect.potential)}</span>
        <span data-label="Interest">{Math.round(prospect.interestByProgram[program.id] ?? 0)}</span>
        <label className="offer-toggle"><input type="checkbox" checked={selectedProspectIds.has(prospect.id)} onChange={() => onToggle(prospect.id)} /><span>{selectedProspectIds.has(prospect.id) ? "Queued" : "Offer"}</span></label>
      </div>)}
    </div>}
  </section>;
}

function className(seasonsEnrolled: number): string {
  return ["Freshman", "Sophomore", "Junior", "Senior"][Math.min(seasonsEnrolled, 3)]!;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function Metric({ label, value }: { label: string; value: string }): ReactElement {
  return <article><p>{label}</p><strong>{value}</strong></article>;
}
