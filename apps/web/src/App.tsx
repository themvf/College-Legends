import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type {
  AwardCandidate,
  GamePlan,
  CareerPath,
  DevelopmentFocus,
  DivisionId,
  FacilityType,
  GameCommand,
  GameEvent,
  GameState,
  Player,
  PlayerGameStatLine,
  PlayerMediaAction,
  Position,
  ProgramId,
  RecruitingEvaluation,
  RecruitingSearchType,
  SeasonAwardType,
  StaffFocus
} from "@college-legends/model";
import { CAREER_PATHS, DIVISION_NAMES } from "@college-legends/content";
import {
  DEFAULT_GAME_PLAN,
  DEFENSIVE_IDENTITY_LABELS,
  OFFENSIVE_IDENTITY_LABELS,
  SCOUTING_TIERS,
  DEFENSIVE_PRESETS,
  OFFENSIVE_PRESETS,
  developmentCandidates,
  matchingPreset,
  projectGate,
  stadiumCapacity as capacityForLevel,
  weeklyDecisions,
  MAXIMUM_WEEKLY_ADVERTISING,
  MAXIMUM_TICKET_PRICE,
  MINIMUM_TICKET_PRICE,
  MAXIMUM_REPS_PER_SIDE,
  planExecution,
  staffModifiers,
  staffCandidatesFor,
  SCOUTING_TIER_DESCRIPTIONS,
  SCOUTING_TIER_LABELS,
  scoutingBoard,
  scoutingDepartmentSummary,
  scoutingReport,
  DOSSIER_THRESHOLDS,
  SCOUTING_FUNDING_LABELS,
  STAFF_FOCUSES,
  STAFF_FOCUS_LABELS,
  staffCapacity,
  staffFocusPayoff,
  weeklyScoutingOutput,
  GAME_PLAN_OPTIONS,
  projectGamePlan,
  unitLabel,
  developmentPayoff,
  facilityPayoff,
  marqueeGameOptions,
  playerMediaPayoff,
  projectedDevelopmentPayoff,
  projectedRecruitingOpenings,
  prospectScoutingReport,
  recruitingEvaluationCost,
  recruitingSearchCost,
  SEASON_AWARD_LABELS,
  SEASON_AWARD_TYPES,
  seasonAwardRace,
  stadiumCapacity
} from "@college-legends/simulation";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";

type GameView = { state: GameState; playerProgramId: ProgramId; events: GameEvent[] };
type Screen = "DASHBOARD" | "THIS_WEEK" | "WEEKLY_RECAPS" | "ROSTER" | "DEPTH_CHART" | "PLAYER_STATS" | "HONORS" | "DEVELOPMENT" | "PLAYER_MEDIA" | "SCHEDULE" | "DIVISIONS" | "STAFF" | "FINANCES" | "RECRUITING" | "INBOX";
/**
 * The week is one screen with five rooms rather than two long scrolls. Every
 * decision that resolves before Saturday lives here, and the tab bar is the
 * intermediate step: the player picks what part of the week to work on before
 * being shown a wall of controls.
 */
type WeekTab = "DECISIONS" | "SCOUTING" | "INSTALL" | "PLAYBOOK" | "REPORT";
const weekTabs: { id: WeekTab; label: string; detail: string }[] = [
  { id: "DECISIONS", label: "Decisions", detail: "Price, advertising, development, and the two strategy calls" },
  { id: "SCOUTING", label: "Scouting", detail: "The department, and which opponents are worth a file" },
  { id: "INSTALL", label: "Install", detail: "Who installs the plan and how hard the team practises" },
  { id: "PLAYBOOK", label: "Playbook", detail: "The seven individual calls and this week's matchups" },
  { id: "REPORT", label: "Last week", detail: "What the calls were actually worth" }
];

const careerOrder: CareerPath[] = ["DYNASTY_BUILDER", "PROGRAM_RISER", "CHAMPIONSHIP_MANDATE"];
const positionOrder: Player["position"][] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
const screens: Screen[] = ["DASHBOARD", "THIS_WEEK", "WEEKLY_RECAPS", "ROSTER", "DEPTH_CHART", "PLAYER_STATS", "HONORS", "DEVELOPMENT", "PLAYER_MEDIA", "SCHEDULE", "DIVISIONS", "STAFF", "FINANCES", "RECRUITING", "INBOX"];
const developmentFocuses: DevelopmentFocus[] = ["BALANCED", "TECHNIQUE", "STRENGTH", "CONDITIONING"];
const spotlightFocuses: Exclude<DevelopmentFocus, "BALANCED">[] = ["TECHNIQUE", "STRENGTH", "CONDITIONING"];
const playerMediaActions: PlayerMediaAction[] = ["FOOTBALL_FOCUS", "MEDIA_DAY", "SOCIAL_MEDIA", "COMMUNITY_APPEARANCE"];
const recruitingEvaluations: RecruitingEvaluation[] = ["BASIC", "ATHLETIC", "POSITION", "CHARACTER", "MEDICAL", "PROJECTION"];
const facilities: FacilityType[] = ["TRAINING", "STADIUM", "ACADEMICS", "RECRUITING", "SCOUTING"];
const starterCounts: Record<Player["position"], number> = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, DB: 4, K: 1, P: 1 };
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
  const [pendingCommands, setPendingCommands] = useState<GameCommand[]>([]);

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
      if (response.type === "COMPLETE") setPendingCommands([]);
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
    setPendingCommands([]);
    send({ type: "CREATE_GAME", requestId: nextRequestId(), careerPath, seed: `web-alpha-${careerPath.toLowerCase()}` });
  };
  const begin = (): void => {
    if (!game) return;
    setScreen("DASHBOARD");
    send({ type: "BEGIN_SEASON", requestId: nextRequestId(), playerProgramId: game.playerProgramId, commands: pendingCommands });
  };
  const prepare = (command: GameCommand): void => {
    if (!game) return;
    send({ type: "PREPARE", requestId: nextRequestId(), playerProgramId: game.playerProgramId, commands: [command] });
  };
  const queue = (command: GameCommand): void => {
    // Scouting settles now: a file read after the game cannot shape the plan.
    if (command.type === "ALLOCATE_SCOUTING") { prepare(command); return; }
    const key = command.type === "SET_PRACTICE_REPS" ? `reps:${command.side}`
      : command.type === "REPLACE_STAFF" ? `replace:${command.staffId}`
      : command.type === "SET_TICKET_PRICE" ? "ticket-price"
      : command.type === "SET_ADVERTISING" ? "advertising"
      : command.type === "SET_GAME_PLAN" ? `game-plan:${Object.keys(command.plan).sort().join(",")}`
      : command.type === "SET_DEVELOPMENT_SPOTLIGHT" ? "development-spotlight"
      : command.type === "SET_PLAYER_MEDIA_ACTION" ? "featured-media"
      : command.type === "SET_STAFF_ALLOCATION" ? `staff:${command.staffId}`
      : command.type === "UPGRADE_FACILITY" ? `facility:${command.facility}`
      : command.type === "SCHEDULE_MARQUEE_HOME_GAME" ? "marquee-game"
      : command.type === "SEARCH_PROSPECTS" ? `recruit-search:${command.searchType}:${command.position ?? "ALL"}`
      : command.type === "EVALUATE_PROSPECT" ? `recruit-eval:${command.prospectId}:${command.evaluation}`
      : command.type === "INVEST_RECRUITING_POINTS" ? `recruit-invest:${command.prospectId}`
      : command.type === "OFFER_PROSPECT" ? `prospect:${command.prospectId}`
      : command.type === "SET_DEPTH_CHART" ? `depth:${command.position}`
      : command.type === "SET_REDSHIRT" || command.type === "RED_SHIRT" ? `redshirt:${command.playerId}`
      : "command";
    if (command.type === "SET_REDSHIRT" && game) {
      const actual = game.state.players[command.playerId]?.eligibility.redshirtStatus === "REDSHIRTING";
      if (command.enabled === actual) {
        setPendingCommands((previous) => previous.filter((item) => commandKey(item) !== key));
        return;
      }
    }
    if (command.type === "SET_DEPTH_CHART" && game) {
      const actual = game.state.depthCharts[command.programId]?.[command.position] ?? [];
      if (actual.length === command.playerIds.length && actual.every((playerId, index) => playerId === command.playerIds[index])) {
        setPendingCommands((previous) => previous.filter((item) => commandKey(item) !== key));
        return;
      }
    }
    setPendingCommands((previous) => [
      ...previous.filter((item) => commandKey(item) !== key),
      command
    ]);
  };
  const advance = (): void => {
    if (!game) return;
    send({ type: "ADVANCE_WEEK", requestId: nextRequestId(), playerProgramId: game.playerProgramId, commands: pendingCommands });
  };

  if (!game) return <NewGame busy={busy} onStart={startGame} />;
  return <Dashboard game={game} screen={screen} busy={busy} error={error} pendingCommands={pendingCommands}
    onNavigate={setScreen} onQueue={queue} onBegin={begin} onAdvance={advance} />;
}

function commandKey(command: GameCommand): string {
  if (command.type === "ALLOCATE_SCOUTING") return `scout:${command.opponentProgramId}`;
  if (command.type === "SET_PRACTICE_REPS") return `reps:${command.side}`;
  if (command.type === "REPLACE_STAFF") return `replace:${command.staffId}`;
  if (command.type === "SET_TICKET_PRICE") return "ticket-price";
  if (command.type === "SET_ADVERTISING") return "advertising";
  if (command.type === "SET_GAME_PLAN") return `game-plan:${Object.keys(command.plan).sort().join(",")}`;
  if (command.type === "SET_DEVELOPMENT_SPOTLIGHT") return "development-spotlight";
  if (command.type === "SET_PLAYER_MEDIA_ACTION") return "featured-media";
  if (command.type === "SET_STAFF_ALLOCATION") return `staff:${command.staffId}`;
  if (command.type === "UPGRADE_FACILITY") return `facility:${command.facility}`;
  if (command.type === "SCHEDULE_MARQUEE_HOME_GAME") return "marquee-game";
  if (command.type === "SEARCH_PROSPECTS") return `recruit-search:${command.searchType}:${command.position ?? "ALL"}`;
  if (command.type === "EVALUATE_PROSPECT") return `recruit-eval:${command.prospectId}:${command.evaluation}`;
  if (command.type === "INVEST_RECRUITING_POINTS") return `recruit-invest:${command.prospectId}`;
  if (command.type === "OFFER_PROSPECT") return `prospect:${command.prospectId}`;
  if (command.type === "SET_DEPTH_CHART") return `depth:${command.position}`;
  if (command.type === "SET_REDSHIRT" || command.type === "RED_SHIRT") return `redshirt:${command.playerId}`;
  return "command";
}

function NewGame({ busy, onStart }: { busy: boolean; onStart: (path: CareerPath) => void }): ReactElement {
  return <main className="new-game">
    <header className="masthead"><p className="eyebrow">College football management</p><h1>College Legends</h1><p>Choose the job that defines your career.</p></header>
    <section className="career-grid">{careerOrder.map((path) => {
      const profile = CAREER_PATHS[path];
      return <article className={`career-card ${profile.tier.toLowerCase()}`} key={path}>
        <p className="tier">{profile.tier} TIER</p><h2>{profile.label}</h2><p>{descriptions[path]}</p>
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

function Dashboard({ game, screen, busy, error, pendingCommands, onNavigate, onQueue, onBegin, onAdvance }: {
  game: GameView; screen: Screen; busy: boolean; error: string | undefined; pendingCommands: GameCommand[];
  onNavigate: (screen: Screen) => void; onQueue: (command: GameCommand) => void; onBegin: () => void; onAdvance: () => void;
}): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const roster = useMemo(() => Object.values(game.state.players)
    .filter((player) => player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP")
    .sort((a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position) || b.overall - a.overall), [game.state.players, program.id]);
  const incomingOpenings = projectedRecruitingOpenings(game.state, program.id);
  const isReview = game.state.phase === "ROSTER_REVIEW";

  return <main className="app-shell">
    <header className="dashboard-header">
      <div><p className="eyebrow">{program.tier} TIER · {DIVISION_NAMES[program.divisionId]}</p><h1>{program.name}</h1><p>{program.city}, {program.stateCode} · Season {game.state.season} · {isReview ? "Opening roster review" : `Week ${game.state.week}`}</p></div>
      <div className="week-action">
        {isReview
          ? <><span>{pendingCommands.length ? `${pendingCommands.length} preseason decision queued` : "Recruiting has not started"}</span><button disabled={busy} onClick={onBegin}>{busy ? "Starting…" : "Accept roster & begin season"}</button></>
          : <><span>{pendingCommands.length} decision{pendingCommands.length === 1 ? "" : "s"} queued</span><button disabled={busy} onClick={onAdvance}>{busy ? "Simulating…" : "Advance week"}</button></>}
      </div>
    </header>
    {error && <p className="error">{error}</p>}
    <section className="metrics">
      <Metric label="Record" value={`${program.wins}–${program.losses}`} />
      <Metric label="National rank" value={`#${program.nationalRank}`} />
      <Metric label="Fans" value={compactNumber(program.fanBase)} />
      <Metric label="Budget" value={money(program.budget)} />
      <Metric label="Job security" value={`${program.coachSecurity}/100`} />
      <Metric label="National titles" value={`${program.championships}`} />
      <Metric label="Roster" value={`${roster.length}/${program.scholarshipLimit}`} />
    </section>
    <nav className="game-nav" aria-label="Program sections">{screens.map((item) =>
      <button className={screen === item ? "active" : ""} key={item} onClick={() => onNavigate(item)}>
        {item === "RECRUITING" && isReview ? "Recruiting · Locked" : label(item)}
      </button>)}</nav>
    {screen === "DASHBOARD" && <ProgramDashboard game={game} roster={roster} />}
    {screen === "THIS_WEEK" && <WeekHub game={game} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "WEEKLY_RECAPS" && <WeeklyRecaps game={game} />}
    {screen === "ROSTER" && <Roster roster={roster} />}
    {screen === "DEPTH_CHART" && <DepthChart game={game} roster={roster} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "PLAYER_STATS" && <PlayerStats game={game} roster={roster} />}
    {screen === "HONORS" && <Honors game={game} />}
    {screen === "DEVELOPMENT" && <Development state={game.state} roster={roster} programId={program.id} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "PLAYER_MEDIA" && <PlayerMedia game={game} roster={roster} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "SCHEDULE" && <Schedule game={game} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "DIVISIONS" && <Divisions game={game} />}
    {screen === "STAFF" && <Staff game={game} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "FINANCES" && <Finances game={game} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "RECRUITING" && <Recruiting game={game} locked={isReview} incomingOpenings={incomingOpenings} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "INBOX" && <Inbox game={game} />}
  </main>;
}

function ProgramDashboard({ game, roster }: { game: GameView; roster: Player[] }): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const average = roster.reduce((sum, player) => sum + player.overall, 0) / Math.max(roster.length, 1);
  const nextGame = game.state.schedule.find((item) => !item.played && (item.homeProgramId === program.id || item.awayProgramId === program.id));
  const opponentId = nextGame ? (nextGame.homeProgramId === program.id ? nextGame.awayProgramId : nextGame.homeProgramId) : undefined;
  const finance = [...game.state.eventHistory].reverse().find((event) => event.type === "WEEKLY_FINANCES" && event.programId === program.id);
  const recap = [...game.state.eventHistory].reverse().find(
    (event): event is Extract<GameEvent, { type: "WEEKLY_RECAP" }> => event.type === "WEEKLY_RECAP" && event.programId === program.id
  );
  return <section className="dashboard-grid">
    <article className="panel hero-panel"><p className="eyebrow">Program command center</p><h2>{game.state.phase === "ROSTER_REVIEW" ? "Meet the program you inherited" : `Prepare for Week ${game.state.week}`}</h2>
      <p className="muted">{game.state.phase === "ROSTER_REVIEW" ? "Study your 85-player roster, depth chart, staff, facilities, and schedule before accepting the job." : "Make development, staffing, facility, and recruiting decisions. Everything resolves together when you advance the week."}</p>
    </article>
    <article className="panel"><p className="eyebrow">Next matchup</p><h2>{nextGame ? `${nextGame.homeProgramId === program.id ? "vs." : "at"} ${game.state.programs[opponentId!]?.name}` : "Season complete"}</h2><p className="muted">{nextGame ? `Week ${nextGame.week} · ${nextGame.homeProgramId === program.id ? "Home" : "Away"}` : "No remaining regular-season games."}</p></article>
    <article className="panel"><p className="eyebrow">Program momentum</p><h2>{compactNumber(program.fanBase)} fans · #{program.nationalRank}</h2><div className="snapshot-list"><p><span>Local press</span><strong>{program.localPress}/100</strong></p><p><span>National press</span><strong>{program.nationalPress}/100</strong></p><p><span>Stadium capacity</span><strong>{compactNumber(stadiumCapacity(program.facilities.STADIUM))}</strong></p></div></article>
    {recap && <article className="panel recap-feature"><p className="eyebrow">Latest weekly recap</p><h2>{recap.result === "BYE" ? `Week ${recap.week} bye` : `${recap.result}: ${recap.scoreFor}–${recap.scoreAgainst}`}</h2><RecapCascade recap={recap} game={game} /></article>}
    <article className="panel"><p className="eyebrow">Roster outlook</p><h2>{average.toFixed(1)} team overall</h2><div className="snapshot-list"><p><span>Seniors</span><strong>{roster.filter((player) => player.eligibility.seasonsRemaining === 1).length}</strong></p><p><span>Top-rated player</span><strong>{Math.round(Math.max(...roster.map((player) => player.overall)))}</strong></p></div></article>
    <article className="panel"><p className="eyebrow">Weekly business</p><h2>{finance && finance.type === "WEEKLY_FINANCES" ? `${finance.net >= 0 ? "+" : ""}${money(finance.net)}` : "Not reported yet"}</h2><p className="muted">Prestige {program.prestige}/100 · Fan support {program.fanSupport}/100</p></article>
    <article className="panel span-two"><p className="eyebrow">Latest inbox</p><h2>Program activity</h2><EventList events={game.events.length ? game.events : game.state.eventHistory.slice(-5)} game={game} /></article>
  </section>;
}

function Roster({ roster }: { roster: Player[] }): ReactElement {
  const average = roster.reduce((sum, player) => sum + player.overall, 0) / Math.max(roster.length, 1);
  return <section className="panel table-panel"><SectionHeading eyebrow="Team management" title={`${roster.length} scholarship players`} detail={`Average rating ${average.toFixed(1)} · complete positional roster`} />
    <div className="data-table roster-table"><div className="data-row data-header"><span>Player</span><span>Pos</span><span>OVR</span><span>POT</span><span>Stardom</span><span>Fans</span><span>Year / status</span></div>
      {roster.map((player) => <div className="data-row" key={player.id}><strong data-label="Player">{player.name}</strong><span data-label="Position">{player.position}</span><span data-label="Overall">{Math.round(player.overall)}</span><span data-label="Potential">{Math.round(player.potential)}</span><span data-label="Stardom">{player.stardom}/100</span><span data-label="Personal fans">{compactNumber(player.personalFans)}</span><span data-label="Year / status">{eligibilityClass(player)}<small>{player.eligibility.redshirtStatus === "REDSHIRTING" ? "Redshirting" : `${player.eligibility.seasonsRemaining} seasons left`}</small></span></div>)}
    </div></section>;
}

function DepthChart({ game, roster, pending, onQueue }: { game: GameView; roster: Player[]; pending: GameCommand[]; onQueue: (command: GameCommand) => void }): ReactElement {
  const programId = game.playerProgramId;
  const redshirtState = (player: Player): boolean => {
    const queued = pending.find((command): command is Extract<GameCommand, { type: "SET_REDSHIRT" }> =>
      command.type === "SET_REDSHIRT" && command.playerId === player.id
    );
    return queued?.enabled ?? player.eligibility.redshirtStatus === "REDSHIRTING";
  };
  const orderedIds = (position: Position): string[] => {
    const queued = pending.find((command): command is Extract<GameCommand, { type: "SET_DEPTH_CHART" }> =>
      command.type === "SET_DEPTH_CHART" && command.position === position
    );
    return queued?.playerIds ?? game.state.depthCharts[programId]?.[position] ?? roster
      .filter((player) => player.position === position)
      .sort((left, right) => right.overall - left.overall)
      .map((player) => player.id);
  };
  const move = (position: Position, playerId: string, direction: -1 | 1): void => {
    const playerIds = [...orderedIds(position)];
    const from = playerIds.indexOf(playerId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= playerIds.length) return;
    [playerIds[from], playerIds[to]] = [playerIds[to]!, playerIds[from]!];
    onQueue({ type: "SET_DEPTH_CHART", programId, position, playerIds });
  };
  return <section><SectionHeading eyebrow="Game day" title="Functional depth chart" detail="Your selected healthy starters drive team strength and record stats. Injuries promote the next active player automatically; redshirts do not play." />
    <article className="panel depth-rules"><strong>Redshirt payoff</strong><span>Preserves one season of eligibility at rollover.</span><small>Tradeoff: the player is removed from the active depth chart all season, but can still train and develop.</small></article>
    <div className="position-grid">{positionOrder.map((position) => {
      const players = orderedIds(position).map((playerId) => game.state.players[playerId]).filter((player): player is Player => Boolean(player));
      let activeIndex = 0;
      return <article className="panel position-card" key={position}><div className="position-title"><h2>{position}</h2><span>{starterCounts[position]} starter{starterCounts[position] === 1 ? "" : "s"}</span></div>
        {players.map((player, index) => {
          const redshirted = redshirtState(player);
          const injured = player.injuryWeeksRemaining > 0;
          const availableSlot = !redshirted && !injured ? activeIndex++ : -1;
          const role = redshirted ? "RS" : injured ? "OUT" : availableSlot < starterCounts[position] ? "START" : `#${availableSlot + 1}`;
          const canRedshirt = player.eligibility.redshirtStatus === "AVAILABLE" || player.eligibility.redshirtStatus === "REDSHIRTING";
          return <div className={`depth-player ${redshirted || injured ? "inactive" : ""}`} key={player.id}>
            <span><b>{role}</b> {player.name}<small>{eligibilityClass(player)} · {player.eligibility.gamesPlayedThisSeason} GP · {player.eligibility.seasonsRemaining} seasons left</small></span>
            <strong>{Math.round(player.overall)}</strong>
            <div className="depth-actions"><button disabled={index === 0} onClick={() => move(position, player.id, -1)} aria-label={`Move ${player.name} up`}>↑</button><button disabled={index === players.length - 1} onClick={() => move(position, player.id, 1)} aria-label={`Move ${player.name} down`}>↓</button>
              <button className={redshirted ? "selected" : ""} disabled={!canRedshirt} onClick={() => onQueue({ type: "SET_REDSHIRT", programId, playerId: player.id, enabled: !redshirted })}>{redshirted ? "Remove RS" : "Redshirt"}</button></div>
          </div>;
        })}
      </article>;
    })}</div></section>;
}

function PlayerStats({ game, roster }: { game: GameView; roster: Player[] }): ReactElement {
  const lines = game.state.playerGameStats.filter((line) => line.programId === game.playerProgramId && line.season === game.state.season);
  const totals = roster.map((player) => {
    const playerLines = lines.filter((line) => line.playerId === player.id);
    return { player, playerLines, games: playerLines.length, rating: playerLines.length ? Math.round(playerLines.reduce((sum, line) => sum + line.gameRating, 0) / playerLines.length) : null };
  }).filter((entry) => entry.games > 0).sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0) || right.games - left.games);
  const weekly = [...lines].sort((left, right) => right.week - left.week || right.gameRating - left.gameRating);
  return <section className="stats-layout">
    <article className="panel table-panel"><SectionHeading eyebrow="Season statistics" title={`${game.state.season} player leaders`} detail="Totals accumulate from each weekly game log; AVG is the player’s mean game rating." />
      <div className="data-table stats-table"><div className="data-row data-header"><span>Player</span><span>Pos</span><span>GP</span><span>AVG</span><span>Season production</span></div>
        {totals.length ? totals.map(({ player, playerLines, games, rating }) => <div className="data-row" key={player.id}><strong>{player.name}</strong><span>{player.position}</span><span>{games}</span><span>{rating}</span><span>{seasonStatSummary(player.position, playerLines)}</span></div>) : <p className="empty-state">Stats will appear after the first game.</p>}
      </div>
    </article>
    <article className="panel table-panel"><SectionHeading eyebrow="Weekly game logs" title="Every recorded performance" detail="Position-specific production is sampled from historical FBS bands and shifted by player quality, opponent strength, and game context." />
      <div className="data-table game-log-table"><div className="data-row data-header"><span>Week</span><span>Player</span><span>Opponent</span><span>Result</span><span>Rating</span><span>Stat line</span></div>
        {weekly.length ? weekly.map((line) => <div className="data-row" key={line.id}><strong>W{line.week}</strong><span>{game.state.players[line.playerId]?.name}<small>{line.position}</small></span><span>{game.state.programs[line.opponentProgramId]?.abbreviation}</span><span className={line.result.toLowerCase()}>{line.result}</span><strong>{line.gameRating}</strong><span>{statLineSummary(line)}</span></div>) : <p className="empty-state">No weekly performances recorded yet.</p>}
      </div>
    </article>
  </section>;
}

function Honors({ game }: { game: GameView }): ReactElement {
  const histories = [...(game.state.seasonHistory ?? [])].reverse();
  const playerProgramHistory = histories.filter((history) =>
    history.playoffSeeds.some((seed) => seed.programId === game.playerProgramId)
    || Object.values(history.divisionChampions).includes(game.playerProgramId)
    || history.awards.some((award) => award.winner.programId === game.playerProgramId)
  );
  const divisionTitles = histories.filter((history) => Object.values(history.divisionChampions).includes(game.playerProgramId)).length;
  const playoffAppearances = histories.filter((history) => history.playoffSeeds.some((seed) => seed.programId === game.playerProgramId)).length;
  const nationalAwards = histories.reduce((total, history) => total + history.awards.filter((award) => award.winner.programId === game.playerProgramId).length, 0);
  return <section className="honors-layout">
    <SectionHeading eyebrow="National honors" title="Award races and championship history" detail="Real weekly production drives the races. Winning honors and titles creates permanent stardom, fans, press, prestige, recruiting strength, and postseason revenue." />
    <div className="trophy-summary">
      <article><span>National titles</span><strong>{game.state.programs[game.playerProgramId]?.championships ?? 0}</strong></article>
      <article><span>Playoff appearances</span><strong>{playoffAppearances}</strong></article>
      <article><span>Division titles</span><strong>{divisionTitles}</strong></article>
      <article><span>National awards</span><strong>{nationalAwards}</strong></article>
    </div>
    <div className="award-grid">{SEASON_AWARD_TYPES.map((awardType) =>
      <AwardRaceCard key={awardType} game={game} awardType={awardType} candidates={seasonAwardRace(game.state, awardType).slice(0, 5)} />
    )}</div>
    <SectionHeading eyebrow="Permanent record book" title="Completed seasons" detail={`${playerProgramHistory.length} season${playerProgramHistory.length === 1 ? "" : "s"} with a playoff berth, division title, or national award for your program.`} />
    {histories.length ? histories.map((history) => {
      const champion = game.state.programs[history.nationalChampionProgramId]!;
      const runnerUp = game.state.programs[history.nationalRunnerUpProgramId]!;
      const titleGame = history.postseasonGames.find((postseasonGame) => postseasonGame.round === "NATIONAL_CHAMPIONSHIP");
      return <article className={`panel season-history ${history.nationalChampionProgramId === game.playerProgramId ? "user-champion" : ""}`} key={history.season}>
        <header><div><p className="eyebrow">{history.season} national champion</p><h2>{champion.name}</h2><p>{titleGame ? `${champion.abbreviation} defeated ${runnerUp.abbreviation}, ${Math.max(titleGame.homeScore, titleGame.awayScore)}–${Math.min(titleGame.homeScore, titleGame.awayScore)}` : `Runner-up: ${runnerUp.name}`}</p></div><strong>🏆</strong></header>
        <div className="season-honors-grid">
          <div><h3>National awards</h3>{history.awards.map((award) => <p key={award.type}><span>{SEASON_AWARD_LABELS[award.type]}</span><strong>{candidateName(game, award.winner)}<small>{game.state.programs[award.winner.programId]?.abbreviation} · {award.winner.score.toFixed(1)} score</small></strong></p>)}</div>
          <div><h3>Division champions</h3>{Object.entries(history.divisionChampions).map(([divisionId, programId]) => <p key={divisionId}><span>{DIVISION_NAMES[divisionId as DivisionId]}</span><strong>{game.state.programs[programId!]?.name}</strong></p>)}</div>
        </div>
        <div className="playoff-results"><h3>12-team playoff</h3>{history.postseasonGames.map((postseasonGame) => {
          const home = game.state.programs[postseasonGame.homeProgramId]!;
          const away = game.state.programs[postseasonGame.awayProgramId]!;
          return <p key={postseasonGame.id}><span>{label(postseasonGame.round)} · #{postseasonGame.homeSeed} {home.abbreviation} vs. #{postseasonGame.awaySeed} {away.abbreviation}</span><strong>{home.abbreviation} {postseasonGame.homeScore} · {away.abbreviation} {postseasonGame.awayScore}</strong></p>;
        })}</div>
      </article>;
    }) : <article className="panel"><p className="muted">Complete the regular season to crown division champions, finalize awards, and resolve the national playoff.</p></article>}
  </section>;
}

function AwardRaceCard({ game, awardType, candidates }: { game: GameView; awardType: SeasonAwardType; candidates: AwardCandidate[] }): ReactElement {
  return <article className="panel award-card">
    <header><div><p className="eyebrow">Live ballot</p><h2>{SEASON_AWARD_LABELS[awardType]}</h2></div><span>{candidates.length ? `Week ${game.state.week}` : "No ballot yet"}</span></header>
    {candidates.length ? candidates.map((candidate, index) => <div className={candidate.programId === game.playerProgramId ? "user-candidate" : ""} key={candidate.playerId ?? candidate.staffId}>
      <b>{index + 1}</b><p><strong>{candidateName(game, candidate)}</strong><span>{game.state.programs[candidate.programId]?.abbreviation} · {candidate.evidence[0]}</span></p><em>{candidate.score.toFixed(1)}</em>
    </div>) : <p className="empty-state">The first ballot appears after players record a game.</p>}
    <footer>{awardType === "COACH_OF_THE_YEAR"
      ? "40% record · 30% wins above expectation · 20% national finish · 10% coach/press profile"
      : "38% weekly performance · 37% production · 17% team success · 8% visibility"}</footer>
  </article>;
}

function candidateName(game: GameView, candidate: AwardCandidate): string {
  if (candidate.playerId) return game.state.players[candidate.playerId]?.name ?? "Unknown player";
  if (candidate.staffId) return game.state.staff[candidate.staffId]?.name ?? "Unknown coach";
  return "Unknown";
}

function Development({ state, roster, programId, pending, onQueue }: { state: GameState; roster: Player[]; programId: string; pending: GameCommand[]; onQueue: (command: GameCommand) => void }): ReactElement {
  const queued = pending.find((item): item is Extract<GameCommand, { type: "SET_DEVELOPMENT_SPOTLIGHT" }> => item.type === "SET_DEVELOPMENT_SPOTLIGHT");
  const selectedFocus = queued?.focus ?? "TECHNIQUE";
  const selectedTarget = queued?.target ?? { type: "POSITION" as const, position: "QB" as Position };
  const targetValue = selectedTarget.type === "PLAYER" ? `PLAYER:${selectedTarget.playerId}` : `POSITION:${selectedTarget.position}`;
  const selectedPlayers = roster.filter((player) =>
    selectedTarget.type === "PLAYER" ? player.id === selectedTarget.playerId : player.position === selectedTarget.position
  );
  const intensity = selectedTarget.type === "PLAYER" ? 1 : 0.55;
  const queueSpotlight = (value: string, focus: Exclude<DevelopmentFocus, "BALANCED">): void => {
    const [type, id] = value.split(":") as ["PLAYER" | "POSITION", string];
    onQueue({
      type: "SET_DEVELOPMENT_SPOTLIGHT",
      programId,
      focus,
      target: type === "PLAYER" ? { type, playerId: id } : { type, position: id as Position }
    });
  };
  return <section className="panel table-panel"><SectionHeading eyebrow="Player development" title="One weekly development spotlight" detail="Choose one player for full-intensity work or one position room for a 55%-intensity group session. Everyone else follows the balanced team plan automatically." />
    <div className="decision-legend">
      {developmentFocuses.map((focus) => {
        const sample = developmentPayoff(focus, "QB");
        return <article key={focus}><strong>{label(focus)}</strong><span>Base: {formatRatingChanges(sample.ratingChanges)}</span><small>{sample.tradeoff}</small></article>;
      })}
    </div>
    <div className="spotlight-planner">
      <label><span>Spotlight target</span><select aria-label="Development spotlight target" value={targetValue} onChange={(event) => queueSpotlight(event.target.value, selectedFocus)}>
        <optgroup label="Position rooms">{positionOrder.map((position) => <option key={position} value={`POSITION:${position}`}>{position} room · {roster.filter((player) => player.position === position).length} players</option>)}</optgroup>
        <optgroup label="Individual players">{[...roster].sort((left, right) => right.overall - left.overall).map((player) => <option key={player.id} value={`PLAYER:${player.id}`}>{player.name} · {player.position} · {Math.round(player.overall)} OVR</option>)}</optgroup>
      </select></label>
      <div><span>Training payoff</span><div className="spotlight-focuses">{spotlightFocuses.map((focus) => <button className={selectedFocus === focus && queued ? "selected" : ""} key={focus} onClick={() => queueSpotlight(targetValue, focus)}>{label(focus)}</button>)}</div></div>
      <article><p className="eyebrow">{selectedTarget.type === "PLAYER" ? "Full intensity" : "Group intensity"}</p><h2>{Math.round(intensity * 100)}% payoff · {selectedPlayers.length} player{selectedPlayers.length === 1 ? "" : "s"}</h2><p className="muted">{queued ? "This is the program's only special development investment this week." : "Choose a payoff to queue this week's spotlight."}</p></article>
    </div>
    <div className="data-table spotlight-table"><div className="data-row data-header"><span>Affected player</span><span>OVR/POT</span><span>Core ratings</span><span>Projected payoff</span></div>
      {selectedPlayers.map((player) => {
        const payoff = projectedDevelopmentPayoff(state, player, selectedFocus, intensity);
        return <div className="data-row" key={player.id}><strong>{player.name}<small>{player.position} · {player.injuryWeeksRemaining > 0 ? `Out ${player.injuryWeeksRemaining} week${player.injuryWeeksRemaining === 1 ? "" : "s"}` : `${Math.round(player.fatigue)}% fatigue`}</small></strong><span>{Math.round(player.overall)} / {Math.round(player.potential)}</span><span><small>TEC {Math.round(player.ratings.technique)} · STR {Math.round(player.ratings.strength)} · CON {Math.round(player.ratings.conditioning)}{player.position === "QB" ? ` · ARM ${Math.round(player.ratings.armStrength)}` : ""} · INJ {Math.round(player.ratings.injuryPrevention)}</small></span><span><b>{formatRatingChanges(payoff.ratingChanges)}</b><small>{signed(payoff.fatigueChange)} fatigue</small></span></div>;
      })}
    </div>
  </section>;
}

function PlayerMedia({ game, roster, pending, onQueue }: { game: GameView; roster: Player[]; pending: GameCommand[]; onQueue: (command: GameCommand) => void }): ReactElement {
  const players = [...roster].sort((left, right) => right.stardom - left.stardom || right.personalFans - left.personalFans || right.overall - left.overall);
  const queued = pending.find((command): command is Extract<GameCommand, { type: "SET_PLAYER_MEDIA_ACTION" }> => command.type === "SET_PLAYER_MEDIA_ACTION");
  const selectedPlayerId = queued?.playerId ?? players[0]?.id ?? "";
  const selectedAction = queued?.action ?? "SOCIAL_MEDIA";
  const selectedPlayer = game.state.players[selectedPlayerId];
  const queueCampaign = (playerId: string, action: PlayerMediaAction): void =>
    onQueue({ type: "SET_PLAYER_MEDIA_ACTION", programId: game.playerProgramId, playerId, action });
  return <section className="panel table-panel"><SectionHeading eyebrow="Player brands" title="One featured player per week" detail="Like choosing one artist or band to promote, the program gives one player a media campaign. Everyone else stays on Football Focus and grows through performance." />
    <div className="decision-legend media-legend">{playerMediaActions.map((action) => {
      const payoff = playerMediaPayoff(action);
      return <article key={action}><strong>{label(action)}</strong><span>{payoff.personalFans}</span><small>{payoff.stardom} · {payoff.schoolConversion}. {payoff.tradeoff}.</small></article>;
    })}</div>
    <div className="spotlight-planner media-planner">
      <label><span>Featured player</span><select aria-label="Featured media player" value={selectedPlayerId} onChange={(event) => queueCampaign(event.target.value, selectedAction)}>
        {players.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.position} · {player.stardom} stardom · {compactNumber(player.personalFans)} fans</option>)}
      </select></label>
      <div><span>Campaign</span><div className="spotlight-focuses">{playerMediaActions.map((action) => <button className={selectedAction === action && queued ? "selected" : ""} key={action} onClick={() => queueCampaign(selectedPlayerId, action)}>{action === "FOOTBALL_FOCUS" ? "No campaign" : label(action)}</button>)}</div></div>
      <article><p className="eyebrow">{queued && queued.action !== "FOOTBALL_FOCUS" ? "Campaign queued" : "Football first"}</p><h2>{selectedPlayer?.name ?? "Choose a player"}</h2><p className="muted">{playerMediaPayoff(selectedAction).personalFans} · {playerMediaPayoff(selectedAction).schoolConversion}</p></article>
    </div>
    <div className="data-table player-media-table"><div className="data-row data-header"><span>Player</span><span>Brand</span><span>Last performance</span><span>Weekly role</span></div>{players.map((player) => {
      const isFeatured = queued?.playerId === player.id && queued.action !== "FOOTBALL_FOCUS";
      return <div className={`data-row ${isFeatured ? "featured-row" : ""}`} key={player.id}>
        <strong data-label="Player">{player.name}<small>{player.position} · OVR {Math.round(player.overall)}</small></strong>
        <span data-label="Brand"><b>{player.stardom}/100 stardom</b><small>{compactNumber(player.personalFans)} personal fans</small></span>
        <span data-label="Last performance">{player.lastGameRating == null ? "No game yet" : `${player.lastGameRating}/99`}<small>{player.lastGameSummary ?? "No report"}</small></span>
        <span data-label="Weekly role"><b>{isFeatured ? label(queued.action) : "Football Focus"}</b><small>{isFeatured ? "Program's featured player" : "Performance-driven growth only"}</small></span>
      </div>;
    })}</div>
  </section>;
}

function Schedule({ game, pending, onQueue }: { game: GameView; pending: GameCommand[]; onQueue: (command: GameCommand) => void }): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const schedule = game.state.schedule.filter((item) => item.homeProgramId === program.id || item.awayProgramId === program.id);
  const options = marqueeGameOptions(game.state, program.id);
  const queued = pending.find((command): command is Extract<GameCommand, { type: "SCHEDULE_MARQUEE_HOME_GAME" }> => command.type === "SCHEDULE_MARQUEE_HOME_GAME");
  return <section className="schedule-layout">
    {game.state.phase === "ROSTER_REVIEW" && <article className="panel marquee-planner"><p className="eyebrow">Preseason business decision</p><h2>Bring a Top-25 program to your stadium</h2>
      <p className="muted">Pay an appearance guarantee now to replace one cross-division opponent. An upset creates a major national story; a loss causes only a small recognition dip. The ranked visitor also lifts attendance, tickets, and concessions.</p>
      <div className="marquee-options">{options.slice(0, 8).map((option) => {
        const opponent = game.state.programs[option.opponentProgramId]!;
        const selected = queued?.opponentProgramId === opponent.id;
        return <button className={selected ? "selected" : ""} key={opponent.id} onClick={() => onQueue({ type: "SCHEDULE_MARQUEE_HOME_GAME", programId: program.id, opponentProgramId: opponent.id })}>
          <span>#{option.rank} {opponent.abbreviation}</span><small>Week {option.week} · {money(option.guarantee)}</small>
        </button>;
      })}</div>
      {!options.length && <p className="muted">No affordable compatible Top-25 date is available.</p>}
    </article>}
    <section className="panel table-panel"><SectionHeading eyebrow="Season" title={`${game.state.season} schedule`} detail={`${program.wins} wins · ${program.losses} losses · 8 division games · 4 national matchups`} />
    <div className="data-table schedule-table"><div className="data-row data-header"><span>Week</span><span>Site</span><span>Opponent</span><span>Matchup</span><span>Status</span></div>{schedule.map((item) => {
      const home = item.homeProgramId === program.id;
      const opponent = game.state.programs[home ? item.awayProgramId : item.homeProgramId]!;
      const result = item.played ? `${item.homeScore}–${item.awayScore}` : item.week === game.state.week ? "Next" : "Scheduled";
      return <div className={`data-row ${item.week === game.state.week ? "next-row" : ""}`} key={item.id}><strong data-label="Week">Week {item.week}</strong><span data-label="Site">{home ? "Home" : "Away"}</span><span data-label="Opponent">{opponent.nationalRank <= 25 ? `#${opponent.nationalRank} ` : ""}{opponent.name}<small>{opponent.city}, {opponent.stateCode}</small></span><span data-label="Matchup">{item.matchupType === "DIVISION" ? "Division" : item.matchupType === "MARQUEE" ? `Marquee · ${money(item.guaranteePaid)}` : "Cross-division"}</span><span data-label="Status">{result}</span></div>;
    })}</div></section>
  </section>;
}

function WeeklyRecaps({ game }: { game: GameView }): ReactElement {
  const recaps = [...game.state.eventHistory]
    .filter((event): event is Extract<GameEvent, { type: "WEEKLY_RECAP" }> => event.type === "WEEKLY_RECAP" && event.programId === game.playerProgramId)
    .reverse();
  return <section><SectionHeading eyebrow="Cause and effect" title="Weekly program recaps" detail="Team results and individual performances grow separate audiences that flow into attendance, game-day sales, media reach, and the budget." />
    {recaps.length ? <div className="recap-grid">{recaps.map((recap) => <article className="panel recap-card" key={`${recap.season}-${recap.week}`}>
      <div className="recap-heading"><div><p className="eyebrow">Week {recap.week}</p><h2>{recap.result === "BYE" ? "Bye week" : `${recap.result} · ${recap.scoreFor}–${recap.scoreAgainst}`}</h2></div><strong className={recap.result.toLowerCase()}>{recap.result}</strong></div>
      <RecapCascade recap={recap} game={game} />
      <WeeklyBoxScore recap={recap} game={game} />
    </article>)}</div> : <article className="panel"><p className="muted">Advance the first week to generate the first connected recap.</p></article>}
  </section>;
}

function RecapCascade({ recap, game }: { recap: Extract<GameEvent, { type: "WEEKLY_RECAP" }>; game: GameView }): ReactElement {
  const opponent = recap.opponentProgramId ? game.state.programs[recap.opponentProgramId] : null;
  const featured = recap.featuredPlayerId ? game.state.players[recap.featuredPlayerId] : null;
  return <div className="recap-cascade">
    <p><span>Result</span><strong>{opponent ? `${recap.homeGame ? "vs." : "at"} ${recap.opponentRank && recap.opponentRank <= 25 ? `#${recap.opponentRank} ` : ""}${opponent.name}` : "No game"}</strong></p>
    <p><span>Team-result fans</span><strong>{signedNumber(recap.teamResultFanChange)}</strong></p>
    <p><span>Player-to-school fans</span><strong>{signedNumber(recap.playerFanLift)}</strong></p>
    <p><span>Total school fans</span><strong>{signedNumber(recap.fanChange)} → {compactNumber(recap.fansAfter)}</strong></p>
    <p><span>Featured player</span><strong>{featured ? `${featured.name} · ${recap.featuredPlayerRating ?? "—"} rating` : "No game standout"}</strong></p>
    <p><span>Stadium</span><strong>{recap.homeGame ? `${compactNumber(recap.attendance)} / ${compactNumber(recap.capacity)}` : "Away / bye"}</strong></p>
    <p><span>Tickets</span><strong>{money(recap.ticketRevenue)}</strong></p>
    <p><span>Concessions</span><strong>{money(recap.concessionRevenue)}</strong></p>
    <p><span>Local press</span><strong>{signedNumber(recap.localPressChange)}</strong></p>
    <p><span>National press</span><strong>{signedNumber(recap.nationalPressChange)}</strong></p>
    <p><span>Weekly net</span><strong>{signedMoney(recap.weeklyNet)}</strong></p>
    {recap.marqueeGame && <p className="marquee-note"><span>Marquee payoff</span><strong>{recap.result === "WIN" ? "National breakthrough" : "Small recognition dip"} · guarantee {money(recap.guaranteePaid)}</strong></p>}
  </div>;
}

function WeeklyBoxScore({ recap, game }: { recap: Extract<GameEvent, { type: "WEEKLY_RECAP" }>; game: GameView }): ReactElement | null {
  if (!recap.opponentProgramId) return null;
  const programIds = [recap.programId, recap.opponentProgramId];
  const lines = game.state.playerGameStats.filter((line) =>
    line.season === recap.season && line.week === recap.week && programIds.includes(line.programId)
  );
  if (!lines.length) return null;
  const totals = programIds.map((programId) => {
    const teamLines = lines.filter((line) => line.programId === programId);
    const passingYards = teamLines.reduce((sum, line) => sum + line.passingYards, 0);
    const rushingYards = teamLines.reduce((sum, line) => sum + line.rushingYards, 0);
    return {
      programId,
      passingYards,
      rushingYards,
      totalYards: passingYards + rushingYards,
      turnovers: teamLines.reduce((sum, line) => sum + line.interceptionsThrown, 0),
      sacks: teamLines.reduce((sum, line) => sum + line.sacks, 0),
      rating: Math.round(teamLines.reduce((sum, line) => sum + line.gameRating, 0) / Math.max(1, teamLines.length))
    };
  });
  return <section className="weekly-box-score">
    <h3>Team statistics</h3>
    <div className="team-stat-grid">
      <span>Team</span><span>Total</span><span>Pass</span><span>Rush</span><span>TO</span><span>Sacks</span><span>Grade</span>
      {totals.map((total) => <FragmentRow key={total.programId} values={[
        game.state.programs[total.programId]?.abbreviation ?? total.programId,
        total.totalYards,
        total.passingYards,
        total.rushingYards,
        total.turnovers,
        total.sacks,
        total.rating
      ]} />)}
    </div>
    <h3>Every player</h3>
    {programIds.map((programId, index) => {
      const teamLines = lines
        .filter((line) => line.programId === programId)
        .sort((left, right) => positionOrder.indexOf(left.position) - positionOrder.indexOf(right.position) || right.gameRating - left.gameRating);
      const program = game.state.programs[programId];
      return <details className="player-box-score" key={programId} open={index === 0}>
        <summary>{program?.name ?? programId} · {teamLines.length} player lines</summary>
        <div>{teamLines.map((line) => <p key={line.id}><span><b>{line.position}</b> {game.state.players[line.playerId]?.name ?? line.playerId}</span><strong>{statLineSummary(line)}</strong></p>)}</div>
      </details>;
    })}
  </section>;
}

function FragmentRow({ values }: { values: Array<string | number> }): ReactElement {
  return <>{values.map((value, index) => <span key={index}>{value}</span>)}</>;
}

function Divisions({ game }: { game: GameView }): ReactElement {
  const divisionIds = Object.keys(DIVISION_NAMES) as DivisionId[];
  return <section><SectionHeading eyebrow="National landscape" title="Six-division standings" detail="Seventy-two original programs represent all 50 states." />
    <div className="division-grid">{divisionIds.map((divisionId) => {
      const programs = Object.values(game.state.programs)
        .filter((program) => program.divisionId === divisionId)
        .sort((left, right) => right.wins - left.wins || left.losses - right.losses || right.prestige - left.prestige);
      return <article className="panel division-card" key={divisionId}><div className="position-title"><h2>{DIVISION_NAMES[divisionId]}</h2><span>{programs.length} teams</span></div>
        {programs.map((program, index) => <p className={program.id === game.playerProgramId ? "user-program" : ""} key={program.id}>
          <span><b>{index + 1}</b> {program.abbreviation} · {program.stateCode}<small>{program.name}</small></span>
          <strong>{program.wins}–{program.losses}</strong>
        </p>)}
      </article>;
    })}</div></section>;
}

function Staff({ game, pending, onQueue }: { game: GameView; pending: GameCommand[]; onQueue: (command: GameCommand) => void }): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const staff = Object.values(game.state.staff).filter((item) => item.programId === programId);
  const [openMarket, setOpenMarket] = useState<string>();

  const totalHours = staff.reduce((sum, member) => sum + staffCapacity(member.rating), 0);
  const allocationOf = (memberId: string): Record<StaffFocus, number> => {
    const member = game.state.staff[memberId]!;
    const queued = pending.find((item): item is Extract<GameCommand, { type: "SET_STAFF_ALLOCATION" }> =>
      item.type === "SET_STAFF_ALLOCATION" && item.staffId === memberId);
    return { ...member.allocation, ...(queued?.allocation ?? {}) } as Record<StaffFocus, number>;
  };
  const spentHours = staff.reduce((sum, member) =>
    sum + STAFF_FOCUSES.reduce((total, focus) => total + allocationOf(member.id)[focus], 0), 0);

  return <section className="screen staff-screen">
    <article className="panel">
      <p className="eyebrow">Coaching staff · {money(staff.reduce((sum, member) => sum + member.salary, 0))} a year</p>
      <h2>Hours: {totalHours} · Available: {totalHours - spentHours}</h2>
      <p className="muted">
        A coach's week is finite. Preparing the team, scouting opponents, and recruiting all draw on the same
        hours — a coordinator sent scouting installs less of Saturday's plan, and that is the whole trade.
      </p>
    </article>

    {staff.map((member) => {
      const capacity = staffCapacity(member.rating);
      const allocation = allocationOf(member.id);
      const spent = STAFF_FOCUSES.reduce((total, focus) => total + allocation[focus], 0);
      const setFocus = (focus: StaffFocus, hours: number): void => {
        const next = { ...allocation, [focus]: hours };
        const over = STAFF_FOCUSES.reduce((total, key) => total + next[key], 0) - capacity;
        // Take the overflow out of the other jobs so a slider is never blocked
        // by hours the player has forgotten they spent somewhere else.
        for (let remaining = over; remaining > 0;) {
          const donor = STAFF_FOCUSES.filter((key) => key !== focus && next[key] > 0)
            .sort((left, right) => next[right] - next[left])[0];
          if (!donor) break;
          const taken = Math.min(remaining, next[donor]);
          next[donor] -= taken;
          remaining -= taken;
        }
        onQueue({ type: "SET_STAFF_ALLOCATION", programId, staffId: member.id, allocation: next });
      };
      const queuedReplacement = pending.find((item): item is Extract<GameCommand, { type: "REPLACE_STAFF" }> =>
        item.type === "REPLACE_STAFF" && item.staffId === member.id);
      const candidates = openMarket === member.id ? staffCandidatesFor(game.state, programId, member.id) : [];
      return <article className="panel staff-card" key={member.id}>
        <div className="staff-head">
          <div>
            <p className="eyebrow">{label(member.role)}</p>
            <h2>{member.name}</h2>
            <p className="muted">{member.rating} rated · {money(member.salary)} a year</p>
          </div>
          <button className="replace-button" onClick={() => setOpenMarket(openMarket === member.id ? undefined : member.id)}>
            {openMarket === member.id ? "Close" : "Replace"}
          </button>
        </div>
        <div className="snapshot-list">{staffModifiers(member).map((modifier) =>
          <p key={modifier.label}><span>{modifier.label}</span><strong>{modifier.value}</strong></p>)}
        </div>
        <p className="eyebrow">His week · {spent} of {capacity} hours committed</p>
        {STAFF_FOCUSES.map((focus) => <div className="allocation-row" key={focus}>
          <p className="plan-label">{STAFF_FOCUS_LABELS[focus]}<span className="hours">{allocation[focus]}h</span></p>
          <input type="range" min={0} max={capacity} value={allocation[focus]}
            aria-label={`${STAFF_FOCUS_LABELS[focus]} hours for ${member.name}`}
            onChange={(event) => setFocus(focus, Number(event.target.value))} />
          <p className="muted">{staffFocusPayoff(member, focus)}</p>
        </div>)}
        {queuedReplacement && <p className="attention">Replacement queued; it resolves when the week is advanced.</p>}
        {candidates.length > 0 && <div className="plan-options">{candidates.map((candidate) => {
          const affordable = program.budget >= candidate.signingCost;
          return <button className="plan-option" key={candidate.id} disabled={!affordable}
            onClick={() => { onQueue({ type: "REPLACE_STAFF", programId, staffId: member.id, candidateId: candidate.id }); setOpenMarket(undefined); }}>
            <strong>{candidate.name} · {candidate.rating} rated</strong>
            <span className="effect">{money(candidate.salary)} a year · {money(candidate.signingCost)} to sign</span>
            <span className="tradeoff">
              {candidate.rating > member.rating ? `+${candidate.rating - member.rating} on ${member.name}` : `${candidate.rating - member.rating} on ${member.name}`}
              {affordable ? "" : " · cannot afford the signing cost"}
            </span>
          </button>;
        })}</div>}
      </article>;
    })}
  </section>;
}

function Finances({ game, pending, onQueue }: { game: GameView; pending: GameCommand[]; onQueue: (command: GameCommand) => void }): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const staffPayroll = Object.values(game.state.staff).filter((staff) => staff.programId === program.id).reduce((sum, staff) => sum + staff.salary, 0);
  return <section className="finance-layout">
    <article className="panel"><p className="eyebrow">Athletic department</p><h2>Operating position</h2><div className="snapshot-list"><p><span>Available budget</span><strong>{money(program.budget)}</strong></p><p><span>Base weekly revenue</span><strong>{money(program.weeklyRevenue)}</strong></p><p><span>Base weekly expenses</span><strong>{money(program.weeklyExpenses)}</strong></p><p><span>Annual staff payroll</span><strong>{money(staffPayroll)}</strong></p></div></article>
    <article className="panel"><p className="eyebrow">Program reach</p><h2>Business drivers</h2><div className="snapshot-list"><p><span>Fan base</span><strong>{compactNumber(program.fanBase)}</strong></p><p><span>Stadium capacity</span><strong>{compactNumber(stadiumCapacity(program.facilities.STADIUM))}</strong></p><p><span>Local / national press</span><strong>{program.localPress} / {program.nationalPress}</strong></p><p><span>National rank</span><strong>#{program.nationalRank}</strong></p></div></article>
    <div className="facility-grid span-two">{facilities.map((facility) => {
      const level = program.facilities[facility];
      const queued = pending.some((item) => item.type === "UPGRADE_FACILITY" && item.facility === facility);
      const cost = level >= 5 ? null : [0, 350_000, 750_000, 1_500_000, 3_000_000][level];
      return <article className="panel business-decision" key={facility}><p className="eyebrow">{label(facility)}</p><h2>Level {level}/5</h2><div className="level-track"><span style={{ width: `${level * 20}%` }} /></div><p className="muted">{facilityBenefit(facility)}</p>
        <div className="choice-compare"><p><span>Current payoff</span><strong>{facilityPayoff(facility, level)}</strong></p><p><span>After upgrade</span><strong>{level >= 5 ? "Maximum reached" : facilityPayoff(facility, level + 1)}</strong></p>{cost && <p><span>Decision cost</span><strong>{money(cost)} now</strong></p>}</div>
        <button disabled={queued || !cost || program.budget < cost} onClick={() => onQueue({ type: "UPGRADE_FACILITY", programId: program.id, facility })}>{level >= 5 ? "Maximum level" : queued ? "Upgrade queued" : `Queue upgrade · ${money(cost!)}`}</button></article>;
    })}</div>
  </section>;
}

function Recruiting({ game, locked, incomingOpenings, pending, onQueue }: {
  game: GameView;
  locked: boolean;
  incomingOpenings: number;
  pending: GameCommand[];
  onQueue: (command: GameCommand) => void;
}): ReactElement {
  const [position, setPosition] = useState<Position>("QB");
  const program = game.state.programs[game.playerProgramId]!;
  const recruiting = game.state.recruiting[program.id]!;
  const queuedSpend = pending.reduce((sum, command) => sum + queuedRecruitingCost(command), 0);
  const pointsAvailable = Math.max(0, recruiting.points - queuedSpend);
  const prospects = recruiting.discoveredProspectIds
    .map((prospectId) => game.state.prospects[prospectId])
    .filter((prospect) => prospect && (prospect.status === "AVAILABLE" || prospect.signedProgramId === program.id))
    .sort((left, right) => {
      const leftReport = prospectScoutingReport(game.state, program.id, left!);
      const rightReport = prospectScoutingReport(game.state, program.id, right!);
      return Number(right!.status === "COMMITTED") - Number(left!.status === "COMMITTED")
        || rightReport.pursuitPoints - leftReport.pursuitPoints
        || left!.name.localeCompare(right!.name);
    });
  const commitments = Object.values(game.state.prospects).filter((prospect) =>
    prospect.status === "COMMITTED" && prospect.signedProgramId === program.id
  );
  const queueSearch = (searchType: RecruitingSearchType): void => {
    if (searchType === "POSITION") {
      onQueue({ type: "SEARCH_PROSPECTS", programId: program.id, searchType, position });
    } else {
      onQueue({ type: "SEARCH_PROSPECTS", programId: program.id, searchType });
    }
  };

  return <section className="recruiting-layout">
    <article className="panel recruiting-command-center">
      <div><p className="eyebrow">Prospect Market</p><h2>{locked ? "Recruiting opens with the season" : `${pointsAvailable} Recruiting Points available`}</h2>
        <p className="muted">Use one shared resource to discover talent, unlock information, and entice recruits. Investments persist; committed freshmen enroll next season.</p></div>
      <div className="recruiting-metrics">
        <Metric label="Weekly production" value={`+${recruiting.weeklyPoints}`} />
        <Metric label="Projected openings" value={String(incomingOpenings)} />
        <Metric label="Committed" value={String(commitments.length)} />
        <Metric label="Board" value={String(prospects.length)} />
      </div>
    </article>

    {!locked && <article className="panel scouting-market">
      <SectionHeading eyebrow="Scouting department" title="Find the next group" detail="Searches reveal prospects—not ratings. You decide which discoveries deserve deeper evaluation." />
      <div className="scouting-actions">
        <button disabled={pointsAvailable < recruitingSearchCost("LOCAL_REGION")} onClick={() => queueSearch("LOCAL_REGION")}>
          <strong>Local region</strong><span>8 discoveries · {recruitingSearchCost("LOCAL_REGION")} pts</span>
        </button>
        <button disabled={pointsAvailable < recruitingSearchCost("SLEEPERS")} onClick={() => queueSearch("SLEEPERS")}>
          <strong>Find sleepers</strong><span>6 high-upside discoveries · {recruitingSearchCost("SLEEPERS")} pts</span>
        </button>
        <button disabled={pointsAvailable < recruitingSearchCost("NATIONAL_SHOWCASE")} onClick={() => queueSearch("NATIONAL_SHOWCASE")}>
          <strong>National showcase</strong><span>10 national names · {recruitingSearchCost("NATIONAL_SHOWCASE")} pts</span>
        </button>
        <div className="position-search"><select value={position} onChange={(event) => setPosition(event.target.value as Position)}>
          {positionOrder.map((item) => <option key={item} value={item}>{item}</option>)}
        </select><button disabled={pointsAvailable < recruitingSearchCost("POSITION")} onClick={() => queueSearch("POSITION")}>Scout position · {recruitingSearchCost("POSITION")} pts</button></div>
      </div>
    </article>}

    {locked
      ? <article className="panel"><SectionHeading eyebrow="Recruiting board" title="Review the inherited roster first" detail="Your scouting department begins work when you accept the roster and start the season." /></article>
      : <div className="prospect-grid">{prospects.map((prospect) => {
        const report = prospectScoutingReport(game.state, program.id, prospect!);
        const queuedInvestment = pending.find((command): command is Extract<GameCommand, { type: "INVEST_RECRUITING_POINTS" }> =>
          command.type === "INVEST_RECRUITING_POINTS" && command.prospectId === prospect!.id
        );
        const pendingEvaluations = pending.filter((command): command is Extract<GameCommand, { type: "EVALUATE_PROSPECT" }> =>
          command.type === "EVALUATE_PROSPECT" && command.prospectId === prospect!.id
        ).map((command) => command.evaluation);
        const committed = prospect!.status === "COMMITTED";
        return <article className={`panel prospect-card ${committed ? "committed" : ""}`} key={prospect!.id}>
          <header><div><p className="eyebrow">{prospect!.reputation} · {prospect!.homeStateCode}</p><h2>{prospect!.name}</h2><p>{prospect!.position} · Scouted {report.scoutingPercent}%</p></div><strong>{committed ? "COMMITTED" : report.pursuitPoints ? `${report.pursuitPoints} PTS` : "NEW"}</strong></header>
          <div className="intel-grid">
            <p><span>Overall</span><strong>{report.overall}</strong></p>
            <p><span>Potential</span><strong>{report.potential}</strong></p>
            <p><span>Position skill</span><strong>{report.positionSkill}</strong></p>
            <p><span>Athletic</span><strong>{report.athletic}</strong></p>
            <p><span>Character</span><strong>{report.character}</strong></p>
            <p><span>Medical</span><strong>{report.medical}</strong></p>
          </div>
          {report.priorities.length > 0 && <div className="recruit-fit"><span>Priorities</span><strong>{report.priorities.map(label).join(" · ")}</strong><span>Program fit</span><strong>{report.fitScore}/100</strong></div>}
          {report.competition.length > 0 && <div className="competition"><span>Competition</span>{report.competition.map((entry) => <small key={entry.programId}>{game.state.programs[entry.programId]?.abbreviation}: {entry.points} pts</small>)}</div>}
          {!committed && <><div className="evaluation-actions">{recruitingEvaluations.map((evaluation) => {
            const complete = game.state.recruiting[program.id]!.scoutingByProspect[prospect!.id]!.evaluations.includes(evaluation);
            const queued = pendingEvaluations.includes(evaluation);
            const cost = recruitingEvaluationCost(evaluation);
            return <button disabled={complete || queued || pointsAvailable < cost} key={evaluation} onClick={() => onQueue({ type: "EVALUATE_PROSPECT", programId: program.id, prospectId: prospect!.id, evaluation })}>
              {complete ? `${label(evaluation)} ✓` : queued ? `${label(evaluation)} queued` : `${label(evaluation)} · ${cost}`}
            </button>;
          })}</div>
          <div className="pursuit-actions"><span>{incomingOpenings > 0 ? "Entice him to join" : "Incoming class full"}</span>{[5, 10, 20].map((points) => <button disabled={incomingOpenings <= 0 || pointsAvailable < points} key={points} onClick={() => onQueue({ type: "INVEST_RECRUITING_POINTS", programId: program.id, prospectId: prospect!.id, points })}>+{points}</button>)}{queuedInvestment && <strong>+{queuedInvestment.points} queued</strong>}</div></>}
        </article>;
      })}</div>}
  </section>;
}

function Inbox({ game }: { game: GameView }): ReactElement {
  const events = game.state.eventHistory.filter((event) => event.type !== "PLAYER_DEVELOPED").slice(-500);
  return <section className="panel"><p className="eyebrow">Program inbox</p><h2>Decisions, results, and reports</h2>{events.length ? <EventList events={events} game={game} /> : <p className="muted">Your inbox is clear. Begin the season to receive weekly reports.</p>}</section>;
}

function EventList({ events, game }: { events: GameEvent[]; game: GameView }): ReactElement {
  const visible = events.filter((event) => event.type !== "PLAYER_DEVELOPED" && eventRelevantToProgram(event, game)).slice(-12).reverse();
  if (!visible.length) return <p className="muted">No new reports.</p>;
  return <div className="inbox-list">{visible.map((event, index) => <article key={`${event.type}-${"week" in event ? event.week : "season" in event ? event.season : 0}-${index}`}><span>{eventIcon(event)}</span><div><strong>{eventTitle(event)}</strong><p>{eventText(event, game)}</p></div></article>)}</div>;
}

function eventRelevantToProgram(event: GameEvent, game: GameView): boolean {
  const programId = game.playerProgramId;
  if (event.type === "RECRUITING_CONTEST_RESOLVED") return event.offeredBy.includes(programId);
  if (event.type === "PROSPECT_COMMITTED") {
    return event.programId === programId || game.state.recruiting[programId]?.discoveredProspectIds.includes(event.prospectId) === true;
  }
  if (event.type === "PROSPECTS_DISCOVERED" || event.type === "PROSPECT_EVALUATED" || event.type === "RECRUITING_INVESTMENT"
    || event.type === "RECRUITING_POINTS_ADDED" || event.type === "PROSPECT_ENROLLED" || event.type === "COMMAND_REJECTED") {
    return event.programId === programId;
  }
  return true;
}

function eventIcon(event: GameEvent): string {
  if (event.type === "GAME_COMPLETED") return "🏈";
  if (event.type === "PLAYOFF_GAME_COMPLETED") return "P";
  if (event.type === "NATIONAL_CHAMPION_CROWNED" || event.type === "DIVISION_TITLE_WON") return "🏆";
  if (event.type === "SEASON_AWARD_FINALIZED") return "★";
  if (event.type === "WEEKLY_RECAP") return "↗";
  if (event.type === "MARQUEE_GAME_SCHEDULED") return "TV";
  if (event.type === "PLAYER_INJURED") return "✚";
  if (event.type === "PLAYER_RECOVERED") return "✓";
  if (event.type === "WEEKLY_FINANCES") return "＄";
  if (event.type === "FACILITY_UPGRADED") return "▲";
  if (event.type === "PROSPECT_SIGNED" || event.type === "PROSPECT_COMMITTED" || event.type === "PROSPECT_ENROLLED") return "★";
  if (event.type === "PROSPECTS_DISCOVERED" || event.type === "PROSPECT_EVALUATED") return "⌕";
  if (event.type === "RECRUITING_INVESTMENT" || event.type === "RECRUITING_POINTS_ADDED") return "R";
  if (event.type === "PLAYER_BRAND_UPDATED" || event.type === "PLAYER_MEDIA_ACTION_SET") return "✦";
  if (event.type === "COMMAND_REJECTED") return "!";
  return "✓";
}

function eventTitle(event: GameEvent): string {
  return label(event.type);
}

function eventText(event: GameEvent, game: GameView): string {
  if (event.type === "GAME_COMPLETED") return `${game.state.programs[event.homeProgramId]?.name} ${event.homeScore}, ${game.state.programs[event.awayProgramId]?.name} ${event.awayScore}`;
  if (event.type === "PLAYOFF_GAME_COMPLETED") return `${label(event.round)}: ${game.state.programs[event.homeProgramId]?.name} ${event.homeScore}, ${game.state.programs[event.awayProgramId]?.name} ${event.awayScore}.`;
  if (event.type === "NATIONAL_CHAMPION_CROWNED") return `${game.state.programs[event.championProgramId]?.name} won the national title over ${game.state.programs[event.runnerUpProgramId]?.name} · ${signedNumber(event.fanGain)} fans · +${event.prestigeGain} prestige · ${signedMoney(event.revenueGain)} postseason revenue.`;
  if (event.type === "DIVISION_TITLE_WON") return `${game.state.programs[event.programId]?.name} won the ${DIVISION_NAMES[event.divisionId]} title.`;
  if (event.type === "SEASON_AWARD_FINALIZED") {
    const winner = event.playerId ? game.state.players[event.playerId]?.name : event.staffId ? game.state.staff[event.staffId]?.name : "Winner";
    return `${winner} won ${SEASON_AWARD_LABELS[event.awardType]} with a ${event.score.toFixed(1)} score · ${signedNumber(event.playerFanGain)} personal fans · ${signedNumber(event.programFanGain)} school fans.`;
  }
  if (event.type === "WEEKLY_FINANCES") return `${money(event.revenue)} revenue · ${money(event.expenses)} expenses · ${event.net >= 0 ? "+" : ""}${money(event.net)} net`;
  if (event.type === "WEEKLY_RECAP") return `${event.result} · ${signedNumber(event.fanChange)} fans · ${signedNumber(event.localPressChange)} local press · ${signedNumber(event.nationalPressChange)} national press · ${signedMoney(event.weeklyNet)} net`;
  if (event.type === "PLAYER_BRAND_UPDATED") return `${game.state.players[event.playerId]?.name ?? "Player"}: ${event.performanceSummary} · ${signedNumber(event.personalFanChange)} personal fans · ${signedNumber(event.schoolFanLift)} school fans · ${signed(event.stardomChange)} stardom.`;
  if (event.type === "PLAYER_MEDIA_ACTION_SET") return `${game.state.players[event.playerId]?.name ?? "Player"} scheduled for ${label(event.action)}.`;
  if (event.type === "MARQUEE_GAME_SCHEDULED") return `#${event.opponentRank} ${game.state.programs[event.opponentProgramId]?.name} will visit in Week ${event.week}. Guarantee: ${money(event.guarantee)}.`;
  if (event.type === "FACILITY_UPGRADED") return `${label(event.facility)} reached Level ${event.newLevel} for ${money(event.cost)}.`;
  if (event.type === "STAFF_ALLOCATION_SET") {
    const week = STAFF_FOCUSES.filter((focus) => event.allocation[focus] > 0)
      .map((focus) => `${event.allocation[focus]}h ${STAFF_FOCUS_LABELS[focus].toLowerCase()}`).join(", ");
    return `${game.state.staff[event.staffId]?.name ?? "Coach"} now spends his week on ${week || "nothing"}.`;
  }
  if (event.type === "SCOUTING_ALLOCATED") {
    const opponent = game.state.programs[event.opponentProgramId]?.abbreviation ?? "opponent";
    const opened = event.tiers.length > 0 ? ` — ${event.tiers.map((tier) => SCOUTING_TIER_LABELS[tier].toLowerCase()).join(", ")} readable.` : ".";
    return `${event.points} scouting points onto the ${opponent} file, now ${event.totalPoints}${opened}`;
  }
  if (event.type === "DEVELOPMENT_SPOTLIGHT_SET") {
    const target = event.target.type === "PLAYER"
      ? game.state.players[event.target.playerId]?.name ?? "one player"
      : `${event.target.position} room`;
    return `${target} received the ${label(event.focus)} development spotlight at ${Math.round(event.intensity * 100)}% intensity.`;
  }
  if (event.type === "DEPTH_CHART_UPDATED") return `${event.position} depth chart updated.`;
  if (event.type === "REDSHIRT_STATUS_CHANGED") return `${game.state.players[event.playerId]?.name ?? "Player"} is now ${event.status === "REDSHIRTING" ? "redshirting" : label(event.status)}.`;
  if (event.type === "PLAYER_INJURED") return `${game.state.players[event.playerId]?.name ?? "Player"} will miss approximately ${event.weeks} week${event.weeks === 1 ? "" : "s"} (${event.risk}% risk).`;
  if (event.type === "PLAYER_RECOVERED") return `${game.state.players[event.playerId]?.name ?? "Player"} has returned to full availability.`;
  if (event.type === "PROSPECT_SIGNED") return `${game.state.prospects[event.prospectId]?.name ?? "Prospect"} signed with ${game.state.programs[event.programId]?.name}.`;
  if (event.type === "PROSPECTS_DISCOVERED") return `${event.prospectIds.length} new prospects found through ${label(event.searchType)} scouting for ${event.pointsSpent} points.`;
  if (event.type === "PROSPECT_EVALUATED") return `${label(event.evaluation)} report unlocked for ${game.state.prospects[event.prospectId]?.name ?? "prospect"} at a cost of ${event.pointsSpent} points.`;
  if (event.type === "RECRUITING_INVESTMENT") return `${event.pointsSpent} points invested in ${game.state.prospects[event.prospectId]?.name ?? "prospect"} · ${event.totalInvestment} total.`;
  if (event.type === "PROSPECT_COMMITTED") return `${game.state.prospects[event.prospectId]?.name ?? "Prospect"} committed to ${game.state.programs[event.programId]?.name}; he will enroll next season.`;
  if (event.type === "PROSPECT_ENROLLED") return `${game.state.prospects[event.prospectId]?.name ?? "Freshman"} joined ${game.state.programs[event.programId]?.name}.`;
  if (event.type === "RECRUITING_POINTS_ADDED") return `Scouting generated ${event.pointsAdded} points · ${event.pointsAvailable} available for next week.`;
  if (event.type === "COMMAND_REJECTED") return event.reason;
  if (event.type === "PLAYER_DEPARTED") return `${game.state.players[event.playerId]?.name ?? "Player"} left the program.`;
  if (event.type === "RECRUITING_CONTEST_RESOLVED") return `${game.state.prospects[event.prospectId]?.name ?? "Prospect"} chose ${game.state.programs[event.winnerProgramId]?.name}.`;
  return "Weekly development report completed.";
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }): ReactElement {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><p>{detail}</p></div>;
}

function statLineSummary(line: PlayerGameStatLine): string {
  if (line.position === "QB") return `${line.passingCompletions}/${line.passingAttempts}, ${line.passingYards} YD, ${line.passingTouchdowns} TD, ${line.interceptionsThrown} INT, ${line.sacksTaken} SK`;
  if (line.position === "RB") return `${line.rushingAttempts} CAR, ${line.rushingYards} YD, ${line.rushingTouchdowns} TD`;
  if (line.position === "WR" || line.position === "TE") return `${line.receptions}/${line.targets} REC/TGT, ${line.receivingYards} YD, ${line.receivingTouchdowns} TD`;
  if (line.position === "OL") return `${line.snaps} SNAPS, ${line.blockingGrade} BLK`;
  if (line.position === "DL" || line.position === "LB") return `${line.tackles} TKL, ${line.tacklesForLoss} TFL, ${line.sacks} SACK`;
  if (line.position === "DB") return `${line.tackles} TKL, ${line.defensiveInterceptions} INT, ${line.passBreakups} PBU`;
  if (line.position === "K") return `${line.fieldGoalsMade}/${line.fieldGoalsAttempted} FG`;
  return `${line.punts} PUNTS, ${line.punts ? (line.puntYards / line.punts).toFixed(1) : "0.0"} AVG`;
}

function seasonStatSummary(position: Position, lines: PlayerGameStatLine[]): string {
  const sum = (field: keyof PlayerGameStatLine): number => lines.reduce((total, line) => total + (typeof line[field] === "number" ? Number(line[field]) : 0), 0);
  if (position === "QB") return `${sum("passingCompletions")}/${sum("passingAttempts")}, ${sum("passingYards")} YD, ${sum("passingTouchdowns")} TD, ${sum("interceptionsThrown")} INT, ${sum("sacksTaken")} SK`;
  if (position === "RB") return `${sum("rushingAttempts")} CAR, ${sum("rushingYards")} YD, ${sum("rushingTouchdowns")} TD`;
  if (position === "WR" || position === "TE") return `${sum("receptions")} REC, ${sum("receivingYards")} YD, ${sum("receivingTouchdowns")} TD`;
  if (position === "OL") return `${sum("snaps")} SNAPS, ${Math.round(sum("blockingGrade") / Math.max(1, lines.length))} AVG BLK`;
  if (position === "DL" || position === "LB") return `${sum("tackles")} TKL, ${sum("tacklesForLoss")} TFL, ${sum("sacks")} SACK`;
  if (position === "DB") return `${sum("tackles")} TKL, ${sum("defensiveInterceptions")} INT, ${sum("passBreakups")} PBU`;
  if (position === "K") return `${sum("fieldGoalsMade")}/${sum("fieldGoalsAttempted")} FG`;
  const punts = sum("punts");
  return `${punts} PUNTS, ${punts ? (sum("puntYards") / punts).toFixed(1) : "0.0"} AVG`;
}

function className(seasonsParticipated: number): string { return ["Freshman", "Sophomore", "Junior", "Senior"][Math.min(seasonsParticipated, 3)]!; }
function eligibilityClass(player: Player): string {
  const redshirtPrefix = player.eligibility.redshirtStatus === "USED" && player.eligibility.seasonsEnrolled > player.eligibility.seasonsParticipated ? "RS " : "";
  return `${redshirtPrefix}${className(player.eligibility.seasonsParticipated)}`;
}

const gamePlanSections: { title: string; keys: (keyof GamePlan)[] }[] = [
  { title: "Offense", keys: ["runPassBalance", "backfieldUsage", "targetDistribution", "tempo"] },
  { title: "Defense", keys: ["defensivePriority", "defensivePosture", "pressure"] }
];
const gamePlanLabels: Record<keyof GamePlan, string> = {
  runPassBalance: "Run / pass balance",
  backfieldUsage: "Backfield",
  targetDistribution: "Targets",
  tempo: "Tempo",
  defensivePriority: "Defensive priority",
  defensivePosture: "Posture",
  pressure: "Pass rush"
};

/**
 * The weekly hub. This Week and Game Plan were two screens dealing with the same
 * seven days, so a player had to hold half a decision on one and half on the
 * other. They are one screen now, and the tab bar is the intermediate step —
 * pick the part of the week to work on, then see only its controls.
 */
function WeekHub({ game, pending, onQueue }: {
  game: GameView; pending: GameCommand[]; onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const [tab, setTab] = useState<WeekTab>("DECISIONS");
  const decisions = weeklyDecisions(game.state, programId);
  const preparation = game.state.preparation?.[programId];
  const scouting = scoutingReport(game.state, programId);
  const fixture = game.state.schedule.find((item) =>
    item.week === game.state.week && !item.played && (item.homeProgramId === programId || item.awayProgramId === programId));
  const atHome = fixture?.homeProgramId === programId;
  const opponent = fixture ? game.state.programs[atHome ? fixture.awayProgramId : fixture.homeProgramId] ?? null : null;

  const flagged: Record<WeekTab, number> = {
    DECISIONS: decisions.filter((decision) => decision.attention).length,
    SCOUTING: scouting.opponentProgramId && scouting.tiers.length === 0 ? 1 : 0,
    INSTALL: (preparation?.offensiveReps ?? 0) + (preparation?.defensiveReps ?? 0) === 0 ? 1 : 0,
    PLAYBOOK: 0,
    REPORT: 0
  };

  return <section className="screen week-hub">
    <article className="panel week-header">
      <p className="eyebrow">Week {game.state.week} · {preparation?.points ?? 0} prep · {preparation?.scoutingPoints ?? 0} scouting points</p>
      <h2>{opponent ? `${atHome ? "Hosting" : "At"} ${opponent.name}` : "No game this week"}</h2>
      <ul className="decision-list">{decisions.map((decision) =>
        <li className={decision.attention ? "attention-row" : ""} key={decision.id}>
          <span>{decision.label}</span><strong>{decision.current}</strong>
        </li>)}
      </ul>
    </article>
    <nav className="week-tabs">{weekTabs.map((entry) =>
      <button className={tab === entry.id ? "week-tab active" : "week-tab"} key={entry.id} onClick={() => setTab(entry.id)}>
        <strong>{entry.label}{flagged[entry.id] > 0 && <span className="attention-dot" aria-label="Needs attention"> ●</span>}</strong>
        <span>{entry.detail}</span>
      </button>)}
    </nav>
    {tab === "DECISIONS" && <WeekDecisions game={game} pending={pending} onQueue={onQueue} />}
    {tab === "SCOUTING" && <WeekScouting game={game} pending={pending} onQueue={onQueue} />}
    {tab === "INSTALL" && <WeekInstall game={game} pending={pending} onQueue={onQueue} />}
    {tab === "PLAYBOOK" && <WeekPlaybook game={game} pending={pending} onQueue={onQueue} />}
    {tab === "REPORT" && <WeekReport game={game} />}
  </section>;
}

function WeekDecisions({ game, pending, onQueue }: {
  game: GameView; pending: GameCommand[]; onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const decisions = weeklyDecisions(game.state, programId);
  const alert = (id: string) => decisions.find((decision) => decision.id === id);

  const queuedPrice = pending.find((command): command is Extract<GameCommand, { type: "SET_TICKET_PRICE" }> => command.type === "SET_TICKET_PRICE")?.price;
  const queuedSpend = pending.find((command): command is Extract<GameCommand, { type: "SET_ADVERTISING" }> => command.type === "SET_ADVERTISING")?.spend;
  const price = queuedPrice ?? program.ticketPrice;
  const spend = queuedSpend ?? program.advertisingSpend;

  const fixture = game.state.schedule.find((item) =>
    item.week === game.state.week && !item.played && (item.homeProgramId === programId || item.awayProgramId === programId));
  const atHome = fixture?.homeProgramId === programId;
  const opponent = fixture ? game.state.programs[atHome ? fixture.awayProgramId : fixture.homeProgramId] ?? null : null;
  const capacity = capacityForLevel(program.facilities.STADIUM);
  const gate = projectGate(program, opponent, capacity, fixture?.matchupType === "MARQUEE", price, spend);

  const plan: GamePlan = { ...(game.state.gamePlans?.[programId] ?? DEFAULT_GAME_PLAN),
    ...Object.assign({}, ...pending.filter((command) => command.type === "SET_GAME_PLAN").map((command) => (command as Extract<GameCommand, { type: "SET_GAME_PLAN" }>).plan)) };
  const candidates = developmentCandidates(game.state, programId);
  const spotlight = pending.find((command): command is Extract<GameCommand, { type: "SET_DEVELOPMENT_SPOTLIGHT" }> => command.type === "SET_DEVELOPMENT_SPOTLIGHT")
    ?? (game.state.developmentSpotlights?.[programId] ? undefined : undefined);
  const spotlightPlayerId = spotlight?.target.type === "PLAYER" ? spotlight.target.playerId : null;

  const Header = ({ id, title }: { id: string; title: string }): ReactElement => {
    const info = alert(id);
    return <><p className="eyebrow">{title}{info?.attention && <span className="attention-dot" aria-label="Needs attention"> ●</span>}</p>
      {info?.attention && <p className="attention">{info.attention}</p>}</>;
  };

  return <div className="week-tab-body">
    <article className="panel">
      <Header id="TICKET_PRICE" title="1 · Ticket price" />
      <h2>{money(price)} a seat</h2>
      <input type="range" min={MINIMUM_TICKET_PRICE} max={MAXIMUM_TICKET_PRICE} value={price}
        onChange={(event) => onQueue({ type: "SET_TICKET_PRICE", programId, price: Number(event.target.value) })} />
      <div className="snapshot-list">
        <p><span>Comparable programmes charge</span><strong>{money(gate.fairPrice)}</strong></p>
        <p><span>Projected attendance</span><strong>{atHome ? `${gate.attendance.toLocaleString()} / ${capacity.toLocaleString()}${gate.soldOut ? " · sold out" : ""}` : "away week"}</strong></p>
        <p><span>Gate</span><strong>{atHome ? money(gate.ticketRevenue) : "away week"}</strong></p>
      </div>
    </article>

    <article className="panel">
      <Header id="ADVERTISING" title="2 · Advertising" />
      <h2>{spend > 0 ? `${money(spend)} this week` : "No spend"}</h2>
      <input type="range" min={0} max={MAXIMUM_WEEKLY_ADVERTISING} step={5_000} value={spend}
        onChange={(event) => onQueue({ type: "SET_ADVERTISING", programId, spend: Number(event.target.value) })} />
      <div className="snapshot-list">
        <p><span>New followers a week</span><strong>{gate.advertisingFans.toLocaleString()}</strong></p>
        <p><span>Extra through the gate</span><strong>{atHome ? `${Math.max(0, gate.attendance - projectGate(program, opponent, capacity, false, price, 0).attendance).toLocaleString()}` : "—"}</strong></p>
        <p><span>Net this week</span><strong>{atHome ? money(gate.net) : money(-spend)}</strong></p>
      </div>
    </article>

    <article className="panel">
      <Header id="DEVELOPMENT" title="3 · Development focus" />
      <h2>Who gets the week</h2>
      <div className="plan-options">{candidates.map((candidate) =>
        <button className={spotlightPlayerId === candidate.playerId ? "plan-option active" : "plan-option"}
          key={candidate.playerId}
          onClick={() => onQueue({
            type: "SET_DEVELOPMENT_SPOTLIGHT", programId,
            target: { type: "PLAYER", playerId: candidate.playerId },
            focus: candidate.reason === "AT_RISK" ? "CONDITIONING" : candidate.reason === "STAR" ? "TECHNIQUE" : "TECHNIQUE"
          })}>
          <strong>{candidate.name} · {candidate.position} · {candidate.overall}</strong>
          <span className="effect">{candidate.headline}</span>
          <span className="tradeoff">{candidate.detail}</span>
        </button>)}
      </div>
    </article>

    <article className="panel">
      <Header id="OFFENSE" title="4 · Offensive strategy" />
      <h2>{matchingPreset(plan, OFFENSIVE_PRESETS)?.label ?? "Custom"}</h2>
      <div className="plan-options">{OFFENSIVE_PRESETS.map((preset) =>
        <button className={matchingPreset(plan, OFFENSIVE_PRESETS)?.id === preset.id ? "plan-option active" : "plan-option"}
          key={preset.id}
          onClick={() => onQueue({ type: "SET_GAME_PLAN", programId, plan: preset.plan })}>
          <strong>{preset.label}</strong>
          <span className="effect">{preset.effect}</span>
          <span className="tradeoff">{preset.tradeoff}</span>
        </button>)}
      </div>
    </article>

    <article className="panel">
      <Header id="DEFENSE" title="5 · Defensive strategy" />
      <h2>{matchingPreset(plan, DEFENSIVE_PRESETS)?.label ?? "Custom"}</h2>
      <div className="plan-options">{DEFENSIVE_PRESETS.map((preset) =>
        <button className={matchingPreset(plan, DEFENSIVE_PRESETS)?.id === preset.id ? "plan-option active" : "plan-option"}
          key={preset.id}
          onClick={() => onQueue({ type: "SET_GAME_PLAN", programId, plan: preset.plan })}>
          <strong>{preset.label}</strong>
          <span className="effect">{preset.effect}</span>
          <span className="tradeoff">{preset.tradeoff}</span>
        </button>)}
      </div>
      <p className="muted">Fine-tune the individual calls on the Playbook tab.</p>
    </article>
  </div>;
}

/**
 * The scouting department: what it produces, and where those points go.
 *
 * The board is the decision the user described — a file on the number five team
 * in six weeks is worth opening now, and a file on the hundredth-ranked team
 * probably is not worth opening at all. Points are allocated forward, so the
 * week a big game arrives is far too late to start.
 */
function WeekScouting({ game, pending, onQueue }: {
  game: GameView; pending: GameCommand[]; onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const preparation = game.state.preparation?.[programId];
  const available = preparation?.scoutingPoints ?? 0;
  const board = scoutingBoard(game.state, programId);
  const scouting = scoutingReport(game.state, programId);
  const level = program.facilities.SCOUTING ?? 1;
  const [stake, setStake] = useState<Record<string, number>>({});

  return <div className="week-tab-body">
    <article className="panel">
      <p className="eyebrow">Opponent scouting department · tier {level} of 5</p>
      <h2>{available} of {preparation?.weeklyScoutingPoints ?? 0} points left this week</h2>
      <p className="muted">{scoutingDepartmentSummary(level)}</p>
      <div className="snapshot-list">
        <p><span>Funding tier</span><strong>{SCOUTING_FUNDING_LABELS[level] ?? "Funded"}</strong></p>
        <p><span>Weekly output</span><strong>{weeklyScoutingOutput(game.state, programId)} points</strong></p>
        <p><span>Opens a file at</span><strong>{DOSSIER_THRESHOLDS.TENDENCIES} / {DOSSIER_THRESHOLDS.PERSONNEL} / {DOSSIER_THRESHOLDS.GAME_PLAN}</strong></p>
      </div>
      <p className="muted">Points never bank. Whatever is not allocated by Saturday is gone.</p>
      <div className="plan-options">{SCOUTING_TIERS.map((tier) =>
        <div className="plan-option static" key={tier}>
          <strong>{SCOUTING_TIER_LABELS[tier]} · {DOSSIER_THRESHOLDS[tier]} points on the file</strong>
          <span className="effect">{SCOUTING_TIER_DESCRIPTIONS[tier]}</span>
        </div>)}
      </div>
    </article>

    <article className="panel">
      <p className="eyebrow">The board · {board.length} game{board.length === 1 ? "" : "s"} left</p>
      <h2>Where the week goes</h2>
      <p className="muted">A ranked win pays in followers and national attention; a routine one barely moves the program. Spend where the prize is.</p>
      {board.map((dossier) => {
        const opponent = game.state.programs[dossier.opponentProgramId]!;
        const staked = stake[dossier.opponentProgramId] ?? Math.min(available, 6);
        const nextTier = SCOUTING_TIERS.find((tier) => !dossier.tiers.includes(tier));
        return <div className={dossier.week === game.state.week ? "dossier-row now" : "dossier-row"} key={dossier.opponentProgramId}>
          <div className="dossier-head">
            <p className="plan-label">
              Week {dossier.week} · {opponent.abbreviation} · #{opponent.nationalRank} · {opponent.wins}–{opponent.losses}
            </p>
            <span className={dossier.value >= 55 ? "dossier-value high" : "dossier-value"}>worth {dossier.value}</span>
          </div>
          <p className="muted">{dossier.valueNote}</p>
          <p className="muted">
            File: {dossier.points} point{dossier.points === 1 ? "" : "s"} · {dossier.confidence}% reliable ·
            {" "}{dossier.tiers.length > 0 ? dossier.tiers.map((tier) => SCOUTING_TIER_LABELS[tier]).join(", ") : "nothing readable yet"}
            {nextTier ? ` · ${DOSSIER_THRESHOLDS[nextTier] - dossier.points} more opens ${SCOUTING_TIER_LABELS[nextTier].toLowerCase()}` : " · complete"}
          </p>
          <div className="dossier-controls">
            <input type="range" min={1} max={Math.max(1, available)} value={Math.min(staked, Math.max(1, available))}
              aria-label={`Points to put on the ${opponent.abbreviation} file`}
              onChange={(event) => setStake({ ...stake, [dossier.opponentProgramId]: Number(event.target.value) })} />
            <button className="replace-button" disabled={available < 1}
              onClick={() => onQueue({
                type: "ALLOCATE_SCOUTING", programId,
                opponentProgramId: dossier.opponentProgramId,
                points: Math.min(staked, available)
              })}>
              Assign {Math.min(staked, Math.max(0, available))}
            </button>
          </div>
        </div>;
      })}
      {board.length === 0 && <p className="muted">Nothing left on the schedule to scout.</p>}
    </article>

    {scouting.opponentProgramId && <article className="panel">
      <p className="eyebrow">This week's file</p>
      <h2>{game.state.programs[scouting.opponentProgramId]?.name}</h2>
      <p className="muted">
        {scouting.record} · #{scouting.nationalRank} · {scouting.reputation} — known without paying.
        {" "}The file is {scouting.confidence}% reliable{scouting.filmGames === 0
          ? " with no film on them yet."
          : ` from ${scouting.filmGames} game${scouting.filmGames === 1 ? "" : "s"} of film.`}
      </p>
      {scouting.identity && <p className="scout-line">
        <span>Identity</span>
        <strong>{OFFENSIVE_IDENTITY_LABELS[scouting.identity.offense]} offense · {DEFENSIVE_IDENTITY_LABELS[scouting.identity.defense]} defense</strong>
      </p>}
      {scouting.units && <table className="stat-table matchup-table">
        <thead><tr><th>Their unit</th><th>Estimated range</th></tr></thead>
        <tbody>{scouting.units.map((unit) =>
          <tr key={unit.unit}><td>{unitLabel(unit.unit)}</td><td>{unit.low.toFixed(1)} – {unit.high.toFixed(1)}</td></tr>)}
        </tbody>
      </table>}
      {scouting.keyPlayers && <p className="muted">Key men: {scouting.keyPlayers.map((player) => `${player.name} (${player.position})`).join(", ")}</p>}
      {scouting.tendencies && <div className="tendencies">{scouting.tendencies.map((tendency) =>
        <div className="plan-row" key={tendency.axis}>
          <p className="plan-label">{gamePlanLabels[tendency.axis as keyof GamePlan] ?? tendency.axis}</p>
          <div className="likelihood-bar">{tendency.options.map((option) =>
            <span className="likelihood" key={option.value}>
              {option.label} <strong>{Math.round(option.probability * 100)}%</strong>
            </span>)}
          </div>
        </div>)}
      </div>}
      <ul className="plan-notes">{scouting.notes.map((note) => <li key={note}>{note}</li>)}</ul>
    </article>}
  </div>;
}

function WeekReport({ game }: { game: GameView }): ReactElement {
  const programId = game.playerProgramId;
  const lastReport = [...game.events]
    .reverse()
    .find((event): event is Extract<GameEvent, { type: "GAME_PLAN_REPORT" }> =>
      event.type === "GAME_PLAN_REPORT" && event.programId === programId);

  return <div className="week-tab-body">
    {!lastReport && <article className="panel">
      <p className="eyebrow">Last week</p>
      <h2>Nothing to review yet</h2>
      <p className="muted">A plan report appears here once a game has been played. Decisions you cannot review are decisions you cannot learn from.</p>
    </article>}
    {lastReport && <article className="panel">
      <p className="eyebrow">Last week vs {game.state.programs[lastReport.opponentProgramId]?.abbreviation ?? "opponent"}</p>
      <h2>What the calls were worth</h2>
      <div className="snapshot-list">
        <p><span>Play mix</span><strong>{lastReport.runPlays} run · {lastReport.passPlays} pass</strong></p>
        <p><span>Turnover margin</span><strong>{lastReport.takeaways} won · {lastReport.giveaways} lost</strong></p>
        <p><span>Sacks</span><strong>{lastReport.sacksFor} for · {lastReport.sacksAgainst} against</strong></p>
        <p><span>Lead back carries</span><strong>{Math.round(lastReport.leadBackShare * 100)}%</strong></p>
        <p><span>Top receiver targets</span><strong>{Math.round(lastReport.topTargetShare * 100)}%</strong></p>
      </div>
      <table className="stat-table matchup-table">
        <thead><tr><th>Unit</th><th>You</th><th>Them</th><th>Plays</th><th>Yards</th><th>Y/P</th><th>TD</th></tr></thead>
        <tbody>{lastReport.matchups.map((matchup) =>
          <tr key={matchup.unit}>
            <td>{unitLabel(matchup.unit)}</td>
            <td>{matchup.rating.toFixed(1)}</td>
            <td>{matchup.opposingRating.toFixed(1)}</td>
            <td>{matchup.plays}</td>
            <td>{matchup.yards}</td>
            <td>{matchup.yardsPerPlay.toFixed(1)}</td>
            <td>{matchup.touchdowns}</td>
          </tr>)}
        </tbody>
      </table>
      <ul className="plan-notes">{lastReport.notes.map((note) => <li key={note}>{note}</li>)}</ul>
    </article>}
  </div>;
}

function WeekInstall({ game, pending, onQueue }: {
  game: GameView; pending: GameCommand[]; onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const preparation = game.state.preparation?.[programId];
  const remaining = preparation?.points ?? 0;
  const queuedReps = (["OFFENSE", "DEFENSE"] as const).reduce((total, side) => {
    const queued = pending.find((command): command is Extract<GameCommand, { type: "SET_PRACTICE_REPS" }> =>
      command.type === "SET_PRACTICE_REPS" && command.side === side);
    if (!queued) return total;
    const saved = side === "OFFENSE" ? preparation?.offensiveReps ?? 0 : preparation?.defensiveReps ?? 0;
    return total + (queued.reps - saved);
  }, 0);
  const remainingPrep = remaining - queuedReps;

  return <div className="week-tab-body">
    <article className="panel">
      <p className="eyebrow">Installing the plan · {remainingPrep} of {preparation?.weeklyPoints ?? 0} prep left</p>
      <h2>How much of it actually lands</h2>
      <p className="muted">A plan is built during the week, not just chosen. Reps raise how much of it survives to Saturday; who installs it sets the floor and how much it swings.</p>
      {(["OFFENSE", "DEFENSE"] as const).map((side) => {
        const queued = pending.find((command): command is Extract<GameCommand, { type: "SET_PRACTICE_REPS" }> =>
          command.type === "SET_PRACTICE_REPS" && command.side === side);
        const saved = side === "OFFENSE" ? preparation?.offensiveReps ?? 0 : preparation?.defensiveReps ?? 0;
        const reps = queued?.reps ?? saved;
        const current = planExecution(game.state, programId, side, reps);
        const without = planExecution(game.state, programId, side, 0);
        return <div className="install-row" key={side}>
          <p className="plan-label">{side === "OFFENSE" ? "Offensive install" : "Defensive install"} · {current.installerName} ({current.installerRating})</p>
          <div className="execution-bar" aria-label={`${side} execution band`}>
            <span className="execution-band" style={{ left: `${current.low * 100}%`, width: `${Math.max(2, (current.high - current.low) * 100)}%` }} />
            <span className="execution-par" style={{ left: "55%" }} />
          </div>
          <p className="execution-summary">
            <strong>{current.summary}</strong>
            {reps > 0 && <span className="muted"> — was {without.summary} with no reps</span>}
          </p>
          <input type="range" min={0} max={MAXIMUM_REPS_PER_SIDE} value={reps}
            onChange={(event) => onQueue({ type: "SET_PRACTICE_REPS", programId, side, reps: Number(event.target.value) })} />
          <p className="muted">{reps} rep{reps === 1 ? "" : "s"} · costs {reps} prep · {(reps * 0.22).toFixed(1)} roster fatigue</p>
          {current.limits.map((limit) => <p className="attention" key={limit}>{limit}</p>)}
        </div>;
      })}
      <p className="muted">
        Who installs it is set on the Staff screen. A coordinator only installs the side he is hired for, and only
        for the share of his week he actually spends preparing the team.
      </p>
    </article>
  </div>;
}

function WeekPlaybook({ game, pending, onQueue }: {
  game: GameView; pending: GameCommand[]; onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const saved = game.state.gamePlans?.[programId] ?? { ...DEFAULT_GAME_PLAN };
  const queued = pending.filter((command): command is Extract<GameCommand, { type: "SET_GAME_PLAN" }> => command.type === "SET_GAME_PLAN");
  const plan: GamePlan = { ...saved, ...Object.assign({}, ...queued.map((command) => command.plan)) };
  const edges = projectGamePlan(game.state, programId);
  const opponentScheduled = edges.some((edge) => edge.edge !== null);
  const scouting = scoutingReport(game.state, programId);

  return <div className="week-tab-body">
    <article className="panel">
      <p className="eyebrow">This week's matchups</p>
      <h2>What the plan is worth</h2>
      <p className="muted">{opponentScheduled
        ? "Their side is the scouted estimate, not a certainty. Every call concedes something — the right one depends on what they do."
        : scouting.opponentProgramId
          ? "Build the file to the personnel tier to see what you are up against."
          : "No opponent is scheduled this week, so only your own unit ratings are shown."}</p>
      <div className="unit-grid">{edges.map((edge) =>
        <div className={`unit-card ${edge.edge === null ? "" : edge.edge >= 2 ? "good" : edge.edge <= -2 ? "bad" : "even"}`} key={edge.unit}>
          <p className="unit-name">{unitLabel(edge.unit)}</p>
          <p className="unit-rating">{edge.rating.toFixed(1)}</p>
          <p className="muted">{edge.opposingRating === null ? "opponent unscouted" : `vs ${edge.opposingRating.toFixed(1)}`}</p>
          <p className="unit-verdict">{edge.edge === null ? "—" : `${edge.verdict} (${edge.edge > 0 ? "+" : ""}${edge.edge})`}</p>
        </div>)}
      </div>
    </article>
    {gamePlanSections.map((section) =>
      <article className="panel" key={section.title}>
        <p className="eyebrow">{section.title}</p>
        <h2>{section.title === "Offense" ? "How you attack" : "How you defend"}</h2>
        {section.keys.map((key) =>
          <div className="plan-row" key={key}>
            <p className="plan-label">{gamePlanLabels[key]}</p>
            <div className="plan-options">{GAME_PLAN_OPTIONS[key].map((option) =>
              <button
                className={plan[key] === option.value ? "plan-option active" : "plan-option"}
                key={option.value}
                onClick={() => onQueue({ type: "SET_GAME_PLAN", programId, plan: { [key]: option.value } as Partial<GamePlan> })}
              >
                <strong>{option.label}</strong>
                <span className="effect">{option.effect}</span>
                <span className="tradeoff">{option.tradeoff}</span>
              </button>)}
            </div>
          </div>)}
      </article>)}
  </div>;
}

function label(value: string): string { return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
function money(value: number): string {
  const absolute = Math.abs(value);
  // Ticket prices are tens of dollars, so the compact form has to keep exact
  // amounts below a thousand rather than rounding them all to $0K.
  const amount = absolute >= 1_000_000 ? `$${(absolute / 1_000_000).toFixed(1)}M`
    : absolute >= 1_000 ? `$${Math.round(absolute / 1_000)}K`
      : `$${Math.round(absolute)}`;
  return value < 0 ? `-${amount}` : amount;
}
function signedMoney(value: number): string { return `${value > 0 ? "+" : ""}${money(value)}`; }
function compactNumber(value: number): string { return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function signedNumber(value: number): string { return `${value > 0 ? "+" : ""}${value.toLocaleString()}`; }
function signed(value: number): string { return `${value > 0 ? "+" : ""}${value}`; }
function queuedRecruitingCost(command: GameCommand): number {
  if (command.type === "SEARCH_PROSPECTS") return recruitingSearchCost(command.searchType);
  if (command.type === "EVALUATE_PROSPECT") return recruitingEvaluationCost(command.evaluation);
  if (command.type === "INVEST_RECRUITING_POINTS") return command.points;
  if (command.type === "OFFER_PROSPECT") return 10;
  return 0;
}
function formatRatingChanges(changes: Partial<Record<keyof Player["ratings"], number>>): string {
  const names: Record<keyof Player["ratings"], string> = { technique: "TEC", strength: "STR", conditioning: "CON", injuryPrevention: "INJ", armStrength: "ARM" };
  return (Object.entries(changes) as [keyof Player["ratings"], number][]).map(([rating, value]) => `${names[rating]} +${value}`).join(" · ");
}
function facilityBenefit(facility: FacilityType): string {
  return {
    TRAINING: "Compounds every player’s weekly attribute and overall growth.",
    STADIUM: "Multiplies ticket and game-day income whenever you host.",
    ACADEMICS: "Protects returning players from entering the transfer portal.",
    RECRUITING: "Adds directly to your score in every contested commitment.",
    SCOUTING: "Produces the weekly points that build files on future opponents, and multiplies the hours coaches give it."
  }[facility];
}
function Metric({ label: metricLabel, value }: { label: string; value: string }): ReactElement { return <article><p>{metricLabel}</p><strong>{value}</strong></article>; }
