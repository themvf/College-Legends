import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type {
  AwardCandidate,
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
  StaffAssignment
} from "@college-legends/model";
import { CAREER_PATHS, DIVISION_NAMES } from "@college-legends/content";
import {
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
  staffAssignmentPayoff,
  stadiumCapacity
} from "@college-legends/simulation";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";

type GameView = { state: GameState; playerProgramId: ProgramId; events: GameEvent[] };
type Screen = "DASHBOARD" | "WEEKLY_RECAPS" | "ROSTER" | "DEPTH_CHART" | "PLAYER_STATS" | "HONORS" | "DEVELOPMENT" | "PLAYER_MEDIA" | "SCHEDULE" | "DIVISIONS" | "STAFF" | "FINANCES" | "RECRUITING" | "INBOX";

const careerOrder: CareerPath[] = ["DYNASTY_BUILDER", "PROGRAM_RISER", "CHAMPIONSHIP_MANDATE"];
const positionOrder: Player["position"][] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
const screens: Screen[] = ["DASHBOARD", "WEEKLY_RECAPS", "ROSTER", "DEPTH_CHART", "PLAYER_STATS", "HONORS", "DEVELOPMENT", "PLAYER_MEDIA", "SCHEDULE", "DIVISIONS", "STAFF", "FINANCES", "RECRUITING", "INBOX"];
const developmentFocuses: DevelopmentFocus[] = ["BALANCED", "TECHNIQUE", "STRENGTH", "CONDITIONING"];
const spotlightFocuses: Exclude<DevelopmentFocus, "BALANCED">[] = ["TECHNIQUE", "STRENGTH", "CONDITIONING"];
const playerMediaActions: PlayerMediaAction[] = ["FOOTBALL_FOCUS", "MEDIA_DAY", "SOCIAL_MEDIA", "COMMUNITY_APPEARANCE"];
const recruitingEvaluations: RecruitingEvaluation[] = ["BASIC", "ATHLETIC", "POSITION", "CHARACTER", "MEDICAL", "PROJECTION"];
const staffAssignments: StaffAssignment[] = ["GAME_PREP", "PLAYER_DEVELOPMENT", "RECRUITING", "RECOVERY"];
const facilities: FacilityType[] = ["TRAINING", "STADIUM", "ACADEMICS", "RECRUITING"];
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
  const queue = (command: GameCommand): void => {
    const key = command.type === "SET_DEVELOPMENT_SPOTLIGHT" ? "development-spotlight"
      : command.type === "SET_PLAYER_MEDIA_ACTION" ? "featured-media"
      : command.type === "ASSIGN_STAFF" ? `staff:${command.staffId}`
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
  if (command.type === "SET_DEVELOPMENT_SPOTLIGHT") return "development-spotlight";
  if (command.type === "SET_PLAYER_MEDIA_ACTION") return "featured-media";
  if (command.type === "ASSIGN_STAFF") return `staff:${command.staffId}`;
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
  const staff = Object.values(game.state.staff).filter((item) => item.programId === game.playerProgramId);
  return <section className="panel table-panel"><SectionHeading eyebrow="Coaching staff" title="Weekly assignment decision tree" detail="Coach rating and role determine the exact payoff. Moving a coach creates an opportunity cost because they stop contributing to their previous assignment." />
    <div className="data-table staff-table"><div className="data-row data-header"><span>Coach</span><span>Role</span><span>Rating</span><span>Salary</span><span>Assignment</span></div>{staff.map((member) => {
      const queued = pending.find((item): item is Extract<GameCommand, { type: "ASSIGN_STAFF" }> => item.type === "ASSIGN_STAFF" && item.staffId === member.id);
      const assignment = queued?.assignment ?? member.assignment;
      return <div className="data-row decision-row" key={member.id}><strong data-label="Coach">{member.name}</strong><span data-label="Role">{label(member.role)}</span><span data-label="Rating">{member.rating}</span><span data-label="Salary">{money(member.salary)}</span><div className="decision-control"><select aria-label={`Assignment for ${member.name}`} value={assignment} onChange={(event) => onQueue({ type: "ASSIGN_STAFF", programId: game.playerProgramId, staffId: member.id, assignment: event.target.value as StaffAssignment })}>{staffAssignments.map((option) => <option value={option} key={option}>{label(option)}</option>)}</select>
        <div className="payoff-strip"><b>Weekly payoff</b><span>{staffAssignmentPayoff(member, assignment)}</span><small>Choosing this removes this coach’s contribution from every other area.</small></div></div></div>;
    })}</div></section>;
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
  if (event.type === "STAFF_ASSIGNED") return `${game.state.staff[event.staffId]?.name ?? "Coach"} assigned to ${label(event.assignment)}.`;
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
function label(value: string): string { return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }
function money(value: number): string {
  const absolute = Math.abs(value);
  const amount = absolute >= 1_000_000 ? `$${(absolute / 1_000_000).toFixed(1)}M` : `$${Math.round(absolute / 1_000)}K`;
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
  return { TRAINING: "Compounds every player’s weekly attribute and overall growth.", STADIUM: "Multiplies ticket and game-day income whenever you host.", ACADEMICS: "Protects returning players from entering the transfer portal.", RECRUITING: "Adds directly to your score in every contested commitment." }[facility];
}
function Metric({ label: metricLabel, value }: { label: string; value: string }): ReactElement { return <article><p>{metricLabel}</p><strong>{value}</strong></article>; }
