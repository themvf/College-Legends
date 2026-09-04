import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement } from "react";
import type {
  GameCommand,
  GameEvent,
  GameState,
  Position,
  ProgramId,
  RecruitingEvaluation,
  RecruitingSearchType
} from "@college-legends/model";
import {
  MAX_VISITS_PER_SEASON,
  SIGNING_WEEK,
  VISIT_COST,
  recruitingEvaluationCost,
  recruitingSearchCost,
  rosterOutlook,
  visitScore
} from "@college-legends/simulation";
import {
  buildPositionRooms,
  buildProspectBoard,
  buildRecruitingLedger,
  filterAndSortProspects,
  queuedRecruitingCost,
  type PositionRoom,
  type ProspectBoardItem,
  type RecruitingFilters,
  type RecruitingLedger
} from "./recruiting-view-model.js";

export type RecruitingGameView = { state: GameState; playerProgramId: ProgramId; events: GameEvent[] };

const positions: Position[] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
const evaluations: RecruitingEvaluation[] = ["BASIC", "ATHLETIC", "POSITION", "CHARACTER", "MEDICAL", "PROJECTION"];

export function Recruiting({ game, locked, pending, onQueue }: {
  game: RecruitingGameView;
  locked: boolean;
  pending: GameCommand[];
  onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const [scoutingPosition, setScoutingPosition] = useState<Position>("QB");
  const [filters, setFilters] = useState<RecruitingFilters>({
    query: "", position: "ALL", status: "ALL", offeredOnly: false, sort: "STATUS"
  });
  const [selectedProspectId, setSelectedProspectId] = useState<string>();
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

  const ledger = useMemo(() => buildRecruitingLedger(game.state, programId, pending), [game.state, pending, programId]);
  const rooms = useMemo(() => buildPositionRooms(game.state, programId), [game.state, programId]);
  const board = useMemo(() => buildProspectBoard(game.state, programId, pending, ledger), [game.state, pending, programId, ledger]);
  const visible = useMemo(() => filterAndSortProspects(board, filters, rooms), [board, filters, rooms]);
  const activeProspectId = visible.some((item) => item.prospect.id === selectedProspectId)
    ? selectedProspectId
    : visible[0]?.prospect.id;
  const selected = visible.find((item) => item.prospect.id === activeProspectId);
  const bulkOfferCandidates = visible
    .filter((item) => item.prospect.status === "AVAILABLE" && !item.offered)
    .slice(0, Math.max(0, ledger.projectedOpenings - ledger.activeScholarshipOffers));

  useEffect(() => {
    if (activeProspectId !== selectedProspectId) setSelectedProspectId(activeProspectId);
  }, [activeProspectId, selectedProspectId]);

  const queueSearch = (searchType: RecruitingSearchType): void => {
    onQueue(searchType === "POSITION"
      ? { type: "SEARCH_PROSPECTS", programId, searchType, position: scoutingPosition }
      : { type: "SEARCH_PROSPECTS", programId, searchType });
  };

  const selectByKeyboard = (event: KeyboardEvent<HTMLButtonElement>, prospectId: string): void => {
    const current = visible.findIndex((item) => item.prospect.id === prospectId);
    if (current < 0) return;
    let next = current;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = Math.min(visible.length - 1, current + 1);
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = Math.max(0, current - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visible.length - 1;
    else return;
    event.preventDefault();
    const id = visible[next]?.prospect.id;
    if (!id) return;
    setSelectedProspectId(id);
    buttonRefs.current.get(id)?.focus();
  };

  return <section className="recruiting-layout war-room" aria-labelledby="war-room-title">
    <RecruitingHud game={game} ledger={ledger} boardCount={board.length} rooms={rooms} />

    {!locked && <ScoutingMarket
      pointsAvailable={ledger.pointsAvailable}
      position={scoutingPosition}
      onPosition={setScoutingPosition}
      onSearch={queueSearch}
    />}

    {locked
      ? <article className="panel war-room-empty">
          <p className="eyebrow">Recruiting board</p>
          <h2>Review the inherited roster first</h2>
          <p className="muted">Your scouting department begins work when you accept the roster and start the season.</p>
        </article>
      : <>
        <RecruitingBoardControls filters={filters} onChange={setFilters} count={visible.length} total={board.length}
          bulkOfferCount={bulkOfferCandidates.length}
          onBulkOffer={() => bulkOfferCandidates.forEach((item) => onQueue({ type: "OFFER_PROSPECT", programId, prospectId: item.prospect.id, extend: true }))} />
        <div className="war-room-workspace">
          <section className="war-room-board" aria-labelledby="prospect-board-title">
            <div className="war-room-section-head">
              <div><p className="eyebrow">Live board</p><h2 id="prospect-board-title">Recruiting targets</h2></div>
              <strong>{visible.length} shown</strong>
            </div>
            {visible.length === 0
              ? <div className="war-room-empty"><h3>No prospects match these filters</h3><p>Clear a filter or send scouts out to expand the board.</p></div>
              : <ul className="prospect-summary-list" aria-label="Recruiting targets">
                {visible.map((item) => <li key={item.prospect.id}>
                  <ProspectSummaryButton
                    item={item}
                    selected={item.prospect.id === activeProspectId}
                    setRef={(element) => {
                      if (element) buttonRefs.current.set(item.prospect.id, element);
                      else buttonRefs.current.delete(item.prospect.id);
                    }}
                    onSelect={() => setSelectedProspectId(item.prospect.id)}
                    onKeyDown={(event) => selectByKeyboard(event, item.prospect.id)}
                  />
                </li>)}
              </ul>}
          </section>

          <section className="war-room-detail" aria-labelledby="prospect-detail-title">
            {selected
              ? <ProspectDetail game={game} item={selected} ledger={ledger} room={rooms[selected.prospect.position]} pending={pending} onQueue={onQueue} />
              : <div className="war-room-empty"><h2 id="prospect-detail-title">Select a prospect</h2><p>The scouting report and every recruiting action will appear here.</p></div>}
          </section>
        </div>
      </>}
  </section>;
}

function RecruitingHud({ game, ledger, boardCount, rooms }: {
  game: RecruitingGameView;
  ledger: RecruitingLedger;
  boardCount: number;
  rooms: Record<Position, PositionRoom>;
}): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const outlook = rosterOutlook(game.state, game.playerProgramId);
  const thinRooms = positions.filter((position) => rooms[position].plan === "THIN");
  return <article className="panel war-room-hud">
    <div className="war-room-brand">
      <p className="eyebrow">{program.abbreviation} recruiting command</p>
      <h1 id="war-room-title">The <span>War Room</span></h1>
      <p>Build the class with verified intel, weekly resources, and the full recruiting trail in one place. Name, image and likeness money &mdash; NIL &mdash; is what you pay a recruit every week to sign, and it is charged for as long as he is on the roster.</p>
    </div>
    <div className="war-room-ledger" aria-label="Recruiting resource ledger">
      <LedgerItem label="Recruiting Points" value={String(ledger.pointsAvailable)} note={`+${ledger.weeklyPoints} next week${ledger.queuedPointSpend ? ` · ${ledger.queuedPointSpend} queued` : ""}`} />
      {/* "Projected openings 21 · 0 committed" was a count with no consequence
          attached — a cold player read it all season and asked "openings for
          what, when?". The same numbers said as next year's roster answer the
          question and are the thing they were actually ambushed by. */}
      <LedgerItem
        label="Roster next season"
        value={outlook ? `${outlook.projected} of ${outlook.scholarshipLimit}` : String(ledger.projectedOpenings)}
        note={outlook
          ? `${outlook.leaving} leaving · ${outlook.incoming} coming in`
          : `${ledger.commitments} committed`}
      />
      <LedgerItem label="Visit weekends" value={`${ledger.visitsRemaining}/${MAX_VISITS_PER_SEASON}`} note="remaining this season" />
      <LedgerItem label="Scholarship offers" value={String(ledger.activeScholarshipOffers)} note={`${boardCount} prospects on board`} />
      {/* "NIL" was a headline stat that the game never once expanded. It is
          money paid to players for their name, image and likeness — the label
          says so, and the panel below says what it buys. */}
      <LedgerItem label="Player pay (NIL) available" value={formatMoney(ledger.nilCapacity)} note={`${formatMoney(ledger.nilFree)} a week still free`} />
      <LedgerItem label="Player pay committed" value={formatMoney(ledger.nilCommitted)} note={`${formatMoney(ledger.nilReserved)} a week reserved`} />
    </div>
    {/* "project below the room plan" used a term the game defines nowhere. What
        it means is that the position group will not have enough bodies to field
        and rotate, so that is what it says now. */}
    {thinRooms.length > 0 && <p className="roster-warning" role="status"><strong>Roster warning:</strong> {thinRooms.join(", ")} won't have enough bodies to field and rotate next season. Recruit those positions first; a late scholarship only buys you a warm body.</p>}
  </article>;
}

function LedgerItem({ label, value, note }: { label: string; value: string; note: string }): ReactElement {
  return <div className="ledger-item"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function ScoutingMarket({ pointsAvailable, position, onPosition, onSearch }: {
  pointsAvailable: number;
  position: Position;
  onPosition: (position: Position) => void;
  onSearch: (search: RecruitingSearchType) => void;
}): ReactElement {
  return <article className="panel scouting-market war-room-scouting">
    <div className="war-room-section-head"><div><p className="eyebrow">Scouting department</p><h2>Find the next group</h2></div><strong>{pointsAvailable} RP available</strong></div>
    <p className="muted">Searches reveal prospects, not ratings. Evaluate the discoveries that deserve real attention.</p>
    <div className="scouting-actions">
      {(["LOCAL_REGION", "SLEEPERS", "NATIONAL_SHOWCASE"] as RecruitingSearchType[]).map((search) => {
        const copy = search === "LOCAL_REGION" ? ["Local region", "8 discoveries"]
          : search === "SLEEPERS" ? ["Find sleepers", "6 high-upside discoveries"]
            : ["National showcase", "10 national names"];
        const cost = recruitingSearchCost(search);
        return <button disabled={pointsAvailable < cost} key={search} onClick={() => onSearch(search)}>
          <strong>{copy[0]}</strong><span>{copy[1]} · {cost} RP</span>
        </button>;
      })}
      <div className="position-search">
        <label htmlFor="scouting-position">Position search</label>
        <select id="scouting-position" value={position} onChange={(event) => onPosition(event.target.value as Position)}>
          {positions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button disabled={pointsAvailable < recruitingSearchCost("POSITION")} onClick={() => onSearch("POSITION")}>Scout position · {recruitingSearchCost("POSITION")} RP</button>
      </div>
    </div>
  </article>;
}

function RecruitingBoardControls({ filters, onChange, count, total, bulkOfferCount, onBulkOffer }: {
  filters: RecruitingFilters;
  onChange: (filters: RecruitingFilters) => void;
  count: number;
  total: number;
  bulkOfferCount: number;
  onBulkOffer: () => void;
}): ReactElement {
  const update = <Key extends keyof RecruitingFilters>(key: Key, value: RecruitingFilters[Key]): void => onChange({ ...filters, [key]: value });
  return <article className="panel board-controls" aria-label="Recruiting board filters">
    <label>Search prospects<input type="search" value={filters.query} placeholder="Name, position, or state" onChange={(event) => update("query", event.target.value)} /></label>
    <label>Position<select value={filters.position} onChange={(event) => update("position", event.target.value as Position | "ALL")}><option value="ALL">All positions</option>{positions.map((position) => <option key={position}>{position}</option>)}</select></label>
    <label>Status<select value={filters.status} onChange={(event) => update("status", event.target.value as RecruitingFilters["status"])}><option value="ALL">All statuses</option><option value="AVAILABLE">Available</option><option value="MINE">My commitments</option><option value="FLIP">Flip targets</option></select></label>
    <label>Sort<select value={filters.sort} onChange={(event) => update("sort", event.target.value as RecruitingFilters["sort"])}><option value="STATUS">Priority status</option><option value="PURSUIT">Pursuit points</option><option value="FIT">Program fit</option><option value="OVERALL">Scouted overall</option><option value="NEED">Roster plan</option><option value="NAME">Name</option></select></label>
    <label className="offered-filter"><input type="checkbox" checked={filters.offeredOnly} onChange={(event) => update("offeredOnly", event.target.checked)} /> Scholarship offers only</label>
    <button className="bulk-offer" disabled={bulkOfferCount === 0} onClick={onBulkOffer}>Offer visible targets ({bulkOfferCount})</button>
    <div className="filter-count"><strong>{count}/{total}</strong><span>targets shown</span>{(count !== total || filters.query) && <button onClick={() => onChange({ query: "", position: "ALL", status: "ALL", offeredOnly: false, sort: "STATUS" })}>Clear filters</button>}</div>
  </article>;
}

function ProspectSummaryButton({ item, selected, setRef, onSelect, onKeyDown }: {
  item: ProspectBoardItem;
  selected: boolean;
  setRef: (element: HTMLButtonElement | null) => void;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}): ReactElement {
  const ask = item.ask ? item.ask.exact ? formatMoney(item.ask.low) : `${formatMoney(item.ask.low)}–${formatMoney(item.ask.high)}` : "Unknown";
  return <button
    ref={setRef}
    type="button"
    className={`prospect-summary ${selected ? "selected" : ""}`}
    aria-pressed={selected}
    tabIndex={selected ? 0 : -1}
    onClick={onSelect}
    onKeyDown={onKeyDown}
  >
    <span className="prospect-summary-top"><span><small>{item.prospect.reputation} · {item.prospect.homeStateCode}</small><strong>{item.prospect.name}</strong><em>{item.prospect.position}</em></span><StatusBadge item={item} /></span>
    <span className="prospect-summary-data">
      <IntelGauge value={item.report.scoutingPercent} />
      <span><small>Overall</small><strong>{item.report.overall}</strong></span>
      <span><small>Program fit</small><strong>{item.report.fitScore ?? "Unknown"}</strong></span>
      <span><small>Ask / week</small><strong>{ask}</strong></span>
    </span>
    <span className="prospect-summary-footer"><span>{item.report.competition.filter((entry) => entry.programId !== item.prospect.signedProgramId).length} known pursuits</span><span>{selected ? "Selected ✓" : "View report"}</span></span>
  </button>;
}

function IntelGauge({ value }: { value: number }): ReactElement {
  return <span className="intel-gauge" style={{ "--intel": `${value * 3.6}deg` } as CSSProperties} role="progressbar" aria-label="Scouting completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
    <strong>{value}%</strong><small>Scouted</small>
  </span>;
}

function StatusBadge({ item }: { item: ProspectBoardItem }): ReactElement {
  return <span className={`prospect-status ${item.isMine ? "mine" : item.flipTarget ? "flip" : item.offered ? "offered" : ""}`}>{item.statusLabel}</span>;
}

function ProspectDetail({ game, item, ledger, room, pending, onQueue }: {
  game: RecruitingGameView;
  item: ProspectBoardItem;
  ledger: RecruitingLedger;
  room: PositionRoom;
  pending: GameCommand[];
  onQueue: (command: GameCommand) => void;
}): ReactElement {
  const { prospect, report } = item;
  const program = game.state.programs[game.playerProgramId]!;
  const knownPursuit = report.competition.filter((entry) => entry.programId !== program.id);
  const signingClock = prospect.status === "SIGNED" ? "Signed"
    : game.state.week < SIGNING_WEEK ? `Signing week in ${SIGNING_WEEK - game.state.week} week${SIGNING_WEEK - game.state.week === 1 ? "" : "s"}`
      : "Signing week open";
  const prospectPending = pending.filter((command) => "prospectId" in command && command.prospectId === prospect.id);
  return <article className="panel prospect-report">
    <a className="back-to-board" href="#prospect-board-title">← Back to board</a>
    <header className="prospect-report-header">
      <div><p className="eyebrow">Incoming {game.state.season + 1} · {prospect.reputation} · Home {prospect.homeStateCode}</p><h2 id="prospect-detail-title">{prospect.name}</h2><p>{prospect.position} · {signingClock}</p></div>
      <div><IntelGauge value={report.scoutingPercent} /><StatusBadge item={item} /></div>
    </header>

    <section className="room-strip" aria-labelledby="room-context-title">
      <div><span id="room-context-title">{prospect.position} roster plan</span><strong className={`room-plan ${room.plan.toLowerCase()}`}>{title(room.plan)}</strong></div>
      <RoomFact label="Current scholarships" value={String(room.currentScholarships)} />
      <RoomFact label="Expected returners" value={String(room.expectedReturners)} />
      <RoomFact label="Incoming" value={String(room.incoming)} />
      <RoomFact label="Projected / target" value={`${room.projected}/${room.target}`} />
      <RoomFact label="Best returning OVR" value={room.bestReturningOverall?.toString() ?? "None"} />
    </section>

    <div className="report-metrics">
      <ReportMetric label="Overall" value={report.overall} gate="Basic evaluation" />
      <ReportMetric label="Potential" value={report.potential} gate="Projection evaluation" />
      <ReportMetric label="Program fit" value={report.fitScore?.toString() ?? "Unknown"} gate="Character evaluation" />
      <ReportMetric label="Weekly NIL ask" value={formatAsk(item)} gate="One evaluation reveals a range; two reveal the exact ask" />
    </div>

    <div className="scouting-report-grid">
      <ScoutingGroup title="Position skills" fallback={report.positionSkill} values={report.positionAttributes} />
      <ScoutingGroup title="Athletic profile" fallback={report.athletic} values={report.athleticAttributes} />
      <section><h3>Character & health</h3><Fact label="Character" value={report.character} /><Fact label="Medical" value={report.medical} /></section>
      <section><h3>Revealed priorities</h3>{report.priorities.length ? <div className="priority-chips">{report.priorities.map((priority) => <span key={priority}>{title(priority)}</span>)}</div> : <p className="unknown-copy">Character evaluation required</p>}</section>
    </div>

    <section className="known-pursuit" aria-labelledby="known-pursuit-title">
      <div><h3 id="known-pursuit-title">Known pursuit</h3><p>Visible Recruiting Point investment—not every scholarship or NIL conversation.</p></div>
      {knownPursuit.length
        ? <ul>{knownPursuit.map((entry) => <li key={entry.programId}><strong>{game.state.programs[entry.programId]?.abbreviation ?? "Unknown"}</strong><span>{entry.points} RP invested</span></li>)}</ul>
        : <strong>No known rival investment</strong>}
    </section>

    <section className="scout-facts" aria-labelledby="scout-facts-title">
      <h3 id="scout-facts-title">Scout facts</h3>
      <ul>
        <li>{item.offered ? "Scholarship offer is active." : "No scholarship offer has been extended."}</li>
        <li>{report.pursuitPoints ? `${report.pursuitPoints} Recruiting Points invested so far.` : "No pursuit points invested yet."}</li>
        <li>{item.effectiveNilOffer ? `${formatMoney(item.effectiveNilOffer)} per week is on the table.` : "No NIL offer is active."}</li>
        <li>{report.fitScore === null ? "Character evaluation will reveal program fit and priorities." : `Program fit is ${report.fitScore}/100 based on his revealed priorities.`}</li>
      </ul>
    </section>

    {prospectPending.length > 0 && <p className="queued-summary" aria-live="polite">{prospectPending.length} decision{prospectPending.length === 1 ? "" : "s"} queued for {prospect.name}.</p>}
    {!item.resolved
      ? <RecruitingActions game={game} item={item} ledger={ledger} pending={pending} onQueue={onQueue} />
      : <p className="signed-summary">This recruitment is final. No further actions are available.</p>}
  </article>;
}

function RoomFact({ label, value }: { label: string; value: string }): ReactElement { return <p><span>{label}</span><strong>{value}</strong></p>; }
function ReportMetric({ label, value, gate }: { label: string; value: string; gate: string }): ReactElement { return <div><span>{label}</span><strong>{value}</strong><small>{value === "Unknown" ? gate : "Verified scouting range"}</small></div>; }
function Fact({ label, value }: { label: string; value: string }): ReactElement { return <p className="report-fact"><span>{label}</span><strong>{value}</strong></p>; }

function ScoutingGroup({ title: groupTitle, fallback, values }: { title: string; fallback: string; values: { label: string; range: string }[] }): ReactElement {
  return <section><h3>{groupTitle}</h3>{values.length ? values.map((entry) => <Fact key={entry.label} label={entry.label} value={entry.range} />) : <p className="unknown-copy">{fallback === "Unknown" ? `${groupTitle} evaluation required` : fallback}</p>}</section>;
}

function RecruitingActions({ game, item, ledger, pending, onQueue }: {
  game: RecruitingGameView;
  item: ProspectBoardItem;
  ledger: RecruitingLedger;
  pending: GameCommand[];
  onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const scouting = game.state.recruiting[programId]!.scoutingByProspect[item.prospect.id]!;
  const visitsUsed = scouting.visitsUsed ?? 0;
  const visitPreview = item.report.fitScore !== null ? visitScore(item.report.fitScore, visitsUsed) : null;
  const offerDisabled = !item.offered && ledger.projectedOpenings <= 0;
  const offerReason = offerDisabled ? "The projected incoming class has no open scholarships." : item.offered ? "Rescinding costs recruit interest." : "Scholarship offers are free and unlock pursuit actions.";
  return <section className="recruiting-actions" aria-labelledby="recruiting-actions-title">
    <div className="action-heading"><div><p className="eyebrow">Decision stack</p><h3 id="recruiting-actions-title">Work this recruitment</h3></div><strong>{ledger.pointsAvailable} RP available</strong></div>

    <ActionGroup title="Scholarship" reason={offerReason} id="scholarship-action-reason">
      <button aria-describedby="scholarship-action-reason" disabled={offerDisabled} onClick={() => onQueue({ type: "OFFER_PROSPECT", programId, prospectId: item.prospect.id, extend: !item.offered })}>{item.queuedOffer ? "Offer change queued" : item.offered ? "Rescind offer" : "Offer scholarship"}</button>
    </ActionGroup>

    <ActionGroup title="Evaluations" reason="Each report unlocks only the information named on the button." id="evaluation-action-reason">
      <div className="evaluation-actions">{evaluations.map((evaluation) => {
        const complete = scouting.evaluations.includes(evaluation);
        const queued = item.pendingEvaluations.includes(evaluation);
        const cost = recruitingEvaluationCost(evaluation);
        const disabled = complete || queued || ledger.pointsAvailable < cost;
        return <button aria-describedby="evaluation-action-reason" disabled={disabled} key={evaluation} onClick={() => onQueue({ type: "EVALUATE_PROSPECT", programId, prospectId: item.prospect.id, evaluation })}>{complete ? `${title(evaluation)} ✓` : queued ? `${title(evaluation)} queued` : `${title(evaluation)} · ${cost} RP`}</button>;
      })}</div>
    </ActionGroup>

    <ActionGroup title="Pursuit" reason={!item.offered ? "Extend a scholarship offer first." : ledger.projectedOpenings <= 0 ? "The projected incoming class is full." : "Pursuit is persistent and known to competing programs."} id="pursuit-action-reason">
      <div className="pursuit-actions">{[5, 10, 20].map((points) => <button aria-describedby="pursuit-action-reason" disabled={!item.offered || ledger.projectedOpenings <= 0 || ledger.pointsAvailable < points} key={points} onClick={() => onQueue({ type: "INVEST_RECRUITING_POINTS", programId, prospectId: item.prospect.id, points })}>Invest {points} RP</button>)}{item.queuedInvestment > 0 && <strong>+{item.queuedInvestment} RP queued</strong>}</div>
    </ActionGroup>

    <ActionGroup title="Home visit" reason={!item.offered ? "Extend a scholarship offer first." : ledger.visitsRemaining <= 0 ? "No visit weekends remain this season." : `Costs ${VISIT_COST} RP and uses one of ${MAX_VISITS_PER_SEASON} season slots.${visitPreview === null ? " Character evaluation reveals the fit-based payoff." : ` Projected fit bonus: +${visitPreview.toFixed(1)}.`}`} id="visit-action-reason">
      <button aria-describedby="visit-action-reason" disabled={!item.offered || ledger.visitsRemaining <= 0 || ledger.pointsAvailable < VISIT_COST || item.queuedVisit} onClick={() => onQueue({ type: "SCHEDULE_VISIT", programId, prospectId: item.prospect.id })}>{item.queuedVisit ? "Visit queued" : `Schedule visit · ${VISIT_COST} RP`}</button>
    </ActionGroup>

    <NilOfferControl game={game} item={item} ledger={ledger} pending={pending} onQueue={onQueue} disabled={ledger.projectedOpenings <= 0} />
  </section>;
}

function ActionGroup({ title: groupTitle, reason, id, children }: { title: string; reason: string; id: string; children: ReactElement | ReactElement[] }): ReactElement {
  return <section className="action-group"><div><h4>{groupTitle}</h4><p id={id}>{reason}</p></div><div>{children}</div></section>;
}

function NilOfferControl({ game, item, ledger, pending, onQueue, disabled }: {
  game: RecruitingGameView;
  item: ProspectBoardItem;
  ledger: RecruitingLedger;
  pending: GameCommand[];
  onQueue: (command: GameCommand) => void;
  disabled: boolean;
}): ReactElement {
  const programId = game.playerProgramId;
  const queued = pending.find((command): command is Extract<GameCommand, { type: "SET_NIL_OFFER" }> => command.type === "SET_NIL_OFFER" && command.prospectId === item.prospect.id);
  const [amount, setAmount] = useState(item.effectiveNilOffer);
  useEffect(() => setAmount(item.effectiveNilOffer), [item.prospect.id, item.effectiveNilOffer]);
  if (item.evaluationCount === 0) {
    return <section className="action-group nil-action"><div><h4>Weekly NIL</h4><p>Complete one evaluation to learn an asking range and unlock an offer.</p></div><strong>Ask unknown</strong></section>;
  }
  const maximum = item.effectiveNilOffer + ledger.nilFree;
  const ask = item.ask!;
  const askMidpoint = (ask.low + ask.high) / 2;
  const askCoverage = amount > 0 ? Math.round(amount / Math.max(1, askMidpoint) * 100) : 0;
  const changed = amount !== item.effectiveNilOffer;
  return <section className="action-group nil-action">
    <div><h4>Weekly NIL</h4><p>Wants {ask.exact ? `${formatMoney(ask.low)} per week` : `${formatMoney(ask.low)}–${formatMoney(ask.high)} per week; one more evaluation reveals the exact ask.`}</p></div>
    <div className="nil-offer-control">
      <label htmlFor={`nil-${item.prospect.id}`}>Offer amount <strong>{formatMoney(amount)} / week</strong></label>
      <input id={`nil-${item.prospect.id}`} type="range" min={0} max={Math.max(maximum, item.effectiveNilOffer)} step={50} value={Math.min(amount, Math.max(maximum, item.effectiveNilOffer))} disabled={disabled || maximum <= 0} onChange={(event) => setAmount(Number(event.target.value))} />
      <p>{amount > 0 ? `${askCoverage}% of the estimated weekly ask. This is not a signing probability.` : maximum <= 0 ? "Donor capacity is fully committed or reserved." : "No NIL offer is active."}</p>
      {changed && <button disabled={disabled} onClick={() => onQueue({ type: "SET_NIL_OFFER", programId, prospectId: item.prospect.id, weeklyAmount: amount })}>{amount === 0 ? "Withdraw NIL offer" : `Queue ${formatMoney(amount)} / week`}</button>}
      {queued && <strong aria-live="polite">{formatMoney(queued.weeklyAmount)} / week queued</strong>}
      {!queued && item.currentNilOffer > 0 && <strong>{formatMoney(item.currentNilOffer)} / week on the table</strong>}
    </div>
  </section>;
}

function formatAsk(item: ProspectBoardItem): string {
  if (!item.ask) return "Unknown";
  return item.ask.exact ? `${formatMoney(item.ask.low)} / week` : `${formatMoney(item.ask.low)}–${formatMoney(item.ask.high)} / week`;
}

function formatMoney(value: number): string {
  const absolute = Math.abs(value);
  const amount = absolute >= 1_000_000 ? `$${(absolute / 1_000_000).toFixed(1)}M`
    : absolute >= 1_000 ? `$${Math.round(absolute / 1_000)}K` : `$${Math.round(absolute)}`;
  return value < 0 ? `-${amount}` : amount;
}

function title(value: string): string {
  return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
