import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { CareerPath, GameCommand, GameEvent, GameState, ProgramId } from "@college-legends/model";
import { CAREER_PATHS } from "@college-legends/content";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";

type GameView = { state: GameState; playerProgramId: ProgramId; events: GameEvent[] };

const careerOrder: CareerPath[] = ["DYNASTY_BUILDER", "PROGRAM_RISER", "CHAMPIONSHIP_MANDATE"];
const descriptions: Record<CareerPath, string> = {
  DYNASTY_BUILDER: "Take a low-tier program from obscurity to a dynasty. Small budget, low expectations, and the longest leash.",
  PROGRAM_RISER: "Turn a capable mid-tier program into a national contender. Solid resources, real pressure, no shortcuts.",
  CHAMPIONSHIP_MANDATE: "Inherit a powerhouse. You have the resources to win now—and two seasons to bring home a title."
};

function nextRequestId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function App(): ReactElement {
  const workerRef = useRef<Worker | undefined>(undefined);
  const [game, setGame] = useState<GameView>();
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
      setGame((previous) => ({ state: response.state, playerProgramId: response.type === "READY" ? response.playerProgramId : previous!.playerProgramId, events: response.events }));
      if (response.type === "COMPLETE") setSelectedProspectIds(new Set());
    };
    return () => worker.terminate();
  }, []);

  const send = (request: WorkerRequest): void => { setBusy(true); setError(undefined); workerRef.current?.postMessage(request); };
  const startGame = (careerPath: CareerPath): void => send({ type: "CREATE_GAME", requestId: nextRequestId(), careerPath, seed: `web-alpha-${careerPath.toLowerCase()}` });
  const advance = (): void => {
    if (!game) return;
    const commands: GameCommand[] = [...selectedProspectIds].map((prospectId) => ({ type: "OFFER_PROSPECT", programId: game.playerProgramId, prospectId }));
    send({ type: "ADVANCE_WEEK", requestId: nextRequestId(), playerProgramId: game.playerProgramId, commands });
  };

  if (!game) return <NewGame busy={busy} onStart={startGame} />;
  return <Dashboard game={game} busy={busy} error={error} selectedProspectIds={selectedProspectIds} onToggle={(id) => setSelectedProspectIds((previous) => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; })} onAdvance={advance} />;
}

function NewGame({ busy, onStart }: { busy: boolean; onStart: (path: CareerPath) => void }): ReactElement {
  return <main className="new-game"><header className="masthead"><p className="eyebrow">College football management</p><h1>College Legends</h1><p>Choose the job that defines your career.</p></header><section className="career-grid">{careerOrder.map((path) => { const profile = CAREER_PATHS[path]; return <article className={`career-card ${profile.tier.toLowerCase()}`} key={path}><p className="tier">{profile.tier} TIER</p><h2>{profile.label}</h2><p>{descriptions[path]}</p><dl><div><dt>Opening budget</dt><dd>${(profile.budget / 1_000_000).toFixed(1)}M</dd></div><div><dt>Job security</dt><dd>{profile.initialSecurity}/100</dd></div><div><dt>Mandate</dt><dd>{profile.championshipDeadline ? `Win title in ${profile.championshipDeadline} years` : "Build at your pace"}</dd></div></dl><button disabled={busy} onClick={() => onStart(path)}>{busy ? "Creating program…" : `Start as ${profile.label}`}</button></article>; })}</section></main>;
}

function Dashboard({ game, busy, error, selectedProspectIds, onToggle, onAdvance }: { game: GameView; busy: boolean; error: string | undefined; selectedProspectIds: Set<string>; onToggle: (id: string) => void; onAdvance: () => void }): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const prospects = useMemo(() => Object.values(game.state.prospects).filter((prospect) => prospect.status === "AVAILABLE").sort((a, b) => b.potential - a.potential || b.overall - a.overall).slice(0, 24), [game.state.prospects]);
  const scholarships = Object.values(game.state.players).filter((player) => player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
  const signings = game.events.filter((event) => event.type === "PROSPECT_SIGNED");
  const games = game.events.filter((event) => event.type === "GAME_COMPLETED");
  return <main className="app-shell"><header className="dashboard-header"><div><p className="eyebrow">{program.tier} TIER PROGRAM</p><h1>{program.name}</h1><p>Season {game.state.season} · Week {game.state.week}</p></div><div className="week-action"><span>{selectedProspectIds.size} offer{selectedProspectIds.size === 1 ? "" : "s"} queued</span><button disabled={busy} onClick={onAdvance}>{busy ? "Simulating…" : "Advance week"}</button></div></header>{error && <p className="error">{error}</p>}<section className="metrics"><Metric label="Record" value={`${program.wins}–${program.losses}`} /><Metric label="Budget" value={`$${(program.budget / 1_000_000).toFixed(1)}M`} /><Metric label="Job security" value={`${program.coachSecurity}/100`} /><Metric label="Scholarships" value={`${scholarships}/${program.scholarshipLimit}`} /></section><section className="workspace"><div className="prospects"><div className="section-heading"><div><p className="eyebrow">Recruiting board</p><h2>Available prospects</h2></div><p>Offers resolve simultaneously at the end of the week.</p></div><div className="prospect-table"><div className="table-row table-header"><span>Prospect</span><span>Pos</span><span>OVR</span><span>POT</span><span>Interest</span><span>Offer</span></div>{prospects.map((prospect) => <div className="table-row" key={prospect.id}><strong>{prospect.name}</strong><span>{prospect.position}</span><span>{prospect.overall}</span><span>{prospect.potential}</span><span>{Math.round(prospect.interestByProgram[program.id] ?? 0)}</span><label className="offer-toggle"><input type="checkbox" checked={selectedProspectIds.has(prospect.id)} onChange={() => onToggle(prospect.id)} /><span>{selectedProspectIds.has(prospect.id) ? "Queued" : "Offer"}</span></label></div>)}</div></div><aside className="inbox"><p className="eyebrow">Weekly report</p><h2>What happened</h2>{game.events.length === 0 ? <p className="muted">Make offers, then advance the week to begin your career.</p> : <ul>{signings.map((event) => <li key={`${event.type}-${event.prospectId}`}><b>Signing:</b> {event.prospectId.replace("prospect-", "")} joined {game.state.programs[event.programId]?.name}.</li>)}{games.slice(0, 4).map((event) => <li key={event.gameId}><b>Final:</b> {game.state.programs[event.homeProgramId]?.name} {event.homeScore}, {game.state.programs[event.awayProgramId]?.name} {event.awayScore}</li>)}{!signings.length && !games.length && <li>Weekly training completed. No headline events.</li>}</ul>}</aside></section></main>;
}

function Metric({ label, value }: { label: string; value: string }): ReactElement { return <article><p>{label}</p><strong>{value}</strong></article>; }
