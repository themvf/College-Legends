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
  OffseasonStep,
  Player,
  PlayerGameStatLine,
  PlayerMediaAction,
  PortalListingState,
  Position,
  ProgramId,
  Prospect,
  RecruitingEvaluation,
  RecruitingSearchType,
  SeasonAwardType,
  SchemeIdentity,
  StaffCandidate,
  StaffFocus,
  StaffMember,
  StaffSkill,
  TrainingCampFocus,
  WeekFocus
} from "@college-legends/model";
import { CAREER_PATHS, DIVISION_NAMES } from "@college-legends/content";
import type { BoxScore, BoxScoreTeam, ProgramPreview, WeeklyPlanningCommand, WeeklyStory } from "@college-legends/simulation";
import {
  DEFAULT_GAME_PLAN,
  DEFENSIVE_IDENTITY_LABELS,
  OFFENSIVE_IDENTITY_LABELS,
  SCOUTING_TIERS,
  activeSponsorship,
  activeEmergencyQuarterback,
  developmentCandidates,
  projectGate,
  projectSponsorshipOffer,
  sponsorshipMarketValue,
  stadiumCapacity as capacityForLevel,
  weeklyDecisions,
  weeklyBriefing,
  latestBoosterOffer,
  BOOSTER_KIND_LABELS,
  weekPriorities,
  WEEK_FOCUS_LABELS,
  focusCapacity,
  activeFocuses,
  scoutingTargetFor,
  weeklyStories,
  committedNilTotal,
  freeNilCapacity,
  nilAskingPriceRange,
  reservedNilTotal,
  weeklyDonorCapacity,
  SPOTLIGHT_INTENSITY,
  seasonExpectation,
  OPERATING_SHARE,
  SQUAD_COST_PER_SCHOLARSHIP,
  mediaRights,
  operatingCost,
  jobReview,
  jobVerdictLabel,
  startingLineup,
  attributesFor,
  ratingByRole,
  boxScore,
  latestBoxScore,
  MAXIMUM_WEEKLY_ADVERTISING,
  MAXIMUM_TICKET_PRICE,
  MINIMUM_TICKET_PRICE,
  personnelLabel,
  planExecution,
  installIfScheme,
  staffModifiers,
  staffCard,
  staffCandidatesFor,
  OFFENSIVE_SCHEMES,
  DEFENSIVE_SCHEMES,
  personnelSummary,
  rosterSchemeFit,
  programRoster,
  programStrengthCoachBenefits,
  coachSchemeFit,
  currentInjury,
  playerInjuryRisk,
  schemeFitLabel,
  SCOUTING_TIER_DESCRIPTIONS,
  SCOUTING_TIER_LABELS,
  scoutingBoard,
  scoutingDepartmentSummary,
  scoutingReport,
  DOSSIER_THRESHOLDS,
  SCOUTING_FUNDING_LABELS,
  readinessNote,
  FULL_FILE_READINESS,
  STAFF_FOCUSES,
  STAFF_FOCUS_LABELS,
  STAFF_TRAITS,
  staffCapacity,
  staffSkills,
  staffFocusPayoff,
  weeklyScoutingOutput,
  GAME_PLAN_OPTIONS,
  projectGamePlan,
  unitLabel,
  developmentPayoff,
  facilityPayoff,
  facilityUpkeepIncrease,
  marqueeGameOptions,
  playerMediaPayoff,
  projectedDevelopmentPayoff,
  prospectScoutingReport,
  staffBuyout,
  recruitingEvaluationCost,
  recruitingSearchCost,
  visitScore,
  MAX_VISITS_PER_SEASON,
  SIGNING_WEEK,
  VISIT_COST,
  OFFSEASON_STEPS,
  portalAskingPrice,
  portalListings,
  portalRecruitable,
  portalScholarshipOpenings,
  prospectProgramFit,
  PORTAL_MINIMUM_POINTS,
  TRAINING_CAMP_CONDITIONING_RISK,
  TRAINING_CAMP_INSTALL_BONUS,
  TRAINING_CAMP_INSTALL_RISK,
  TRAINING_CAMP_WEEKS,
  SEASON_AWARD_LABELS,
  SEASON_AWARD_TYPES,
  seasonAwardRace,
  stadiumCapacity
} from "@college-legends/simulation";
import type { WorkerRequest, WorkerResponse } from "./protocol.js";
import { Recruiting as WarRoomRecruiting } from "./Recruiting.js";
import { recruitingCommandKey } from "./recruiting-view-model.js";
import { weeklyPriorityDecision } from "./weekly-priority-decision.js";

type GameView = { state: GameState; playerProgramId: ProgramId; events: GameEvent[] };
type Screen = "DASHBOARD" | "THIS_WEEK" | "WEEKLY_RECAPS" | "ROSTER" | "DEPTH_CHART" | "PLAYER_STATS" | "HONORS" | "DEVELOPMENT" | "PLAYER_MEDIA" | "SCHEDULE" | "DIVISIONS" | "STAFF" | "FINANCES" | "RECRUITING" | "INBOX";
/**
 * The week is one screen with five rooms rather than two long scrolls. Every
 * decision that resolves before Saturday lives here, and the tab bar is the
 * intermediate step: the player picks what part of the week to work on before
 * being shown a wall of controls.
 */
type WeekTab = "WEEK" | "SCOUTING" | "BUSINESS" | "REPORT";
const weekTabs: { id: WeekTab; label: string; detail: string }[] = [
  { id: "WEEK", label: "Your week", detail: "The one to three things your staff is chasing" },
  { id: "SCOUTING", label: "Scouting board", detail: "Which game your film room is working on" },
  { id: "BUSINESS", label: "Business", detail: "Tickets and marketing — money, not hours" },
  { id: "REPORT", label: "Last Saturday", detail: "What all of it actually got you" }
];

const careerOrder: CareerPath[] = ["DYNASTY_BUILDER", "PROGRAM_RISER", "CHAMPIONSHIP_MANDATE"];
const positionOrder: Player["position"][] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
const screens: Screen[] = ["DASHBOARD", "THIS_WEEK", "WEEKLY_RECAPS", "ROSTER", "DEPTH_CHART", "PLAYER_STATS", "HONORS", "DEVELOPMENT", "PLAYER_MEDIA", "SCHEDULE", "DIVISIONS", "STAFF", "FINANCES", "RECRUITING", "INBOX"];
/**
 * Fifteen buttons in one strip was more than a player could hold in their
 * head at a glance — the same complaint the dashboard rewrite made about the
 * old status panels, just moved into the nav bar. These five are the screens
 * that ask for a decision most weeks; everything else is read-only or
 * occasional and lives behind "More" instead of competing for the same row.
 */
const PRIMARY_SCREENS: Screen[] = ["DASHBOARD", "THIS_WEEK", "ROSTER", "DEPTH_CHART", "RECRUITING"];
const OVERFLOW_SCREENS: Screen[] = screens.filter((item) => !PRIMARY_SCREENS.includes(item));
const developmentFocuses: DevelopmentFocus[] = ["BALANCED", "TECHNIQUE", "STRENGTH", "CONDITIONING"];
const spotlightFocuses: Exclude<DevelopmentFocus, "BALANCED">[] = ["TECHNIQUE", "STRENGTH", "CONDITIONING"];
const playerMediaActions: PlayerMediaAction[] = ["FOOTBALL_FOCUS", "MEDIA_DAY", "SOCIAL_MEDIA", "COMMUNITY_APPEARANCE"];
const recruitingEvaluations: RecruitingEvaluation[] = ["BASIC", "ATHLETIC", "POSITION", "CHARACTER", "MEDICAL", "PROJECTION"];
const facilities: FacilityType[] = ["TRAINING", "STADIUM", "ACADEMICS", "RECRUITING", "SCOUTING"];
/** Player-facing facility names. "TRAI 4" on the job-selection cards was the game's own no-cryptic-columns rule broken on its most important screen. */
const FACILITY_NAMES: Record<FacilityType, string> = {
  TRAINING: "Weight room", STADIUM: "Stadium", ACADEMICS: "Academics", RECRUITING: "Recruiting", SCOUTING: "Scouting"
};
const starterCounts: Record<Player["position"], number> = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, DB: 4, K: 1, P: 1 };
const descriptions: Record<CareerPath, string> = {
  DYNASTY_BUILDER: "Take an overlooked program and build a dynasty. Average players, a small budget, low expectations, and the longest leash.",
  PROGRAM_RISER: "Turn a capable mid-tier program into a national contender. Stronger players and resources, with real pressure to progress.",
  CHAMPIONSHIP_MANDATE: "Inherit a powerhouse roster. You have every advantage—and two seasons to win a national championship."
};

function nextRequestId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export function App(): ReactElement {
  const workerRef = useRef<Worker | undefined>(undefined);
  const playerProgramIdRef = useRef<ProgramId | undefined>(undefined);
  // The phase the last response left the career in, so the setup flow can be
  // reopened on the transition into roster review rather than on every reply
  // that happens to arrive while it is open.
  const phaseRef = useRef<GameState["phase"] | undefined>(undefined);
  const [game, setGame] = useState<GameView>();
  const [screen, setScreen] = useState<Screen>("ROSTER");
  const [weekTab, setWeekTab] = useState<WeekTab>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [pendingCommands, setPendingCommands] = useState<GameCommand[]>([]);
  const [inFlightDecision, setInFlightDecision] = useState<{ requestId: string; command: WeeklyPlanningCommand }>();
  /** The jobs on offer, between choosing a career path and taking one. */
  const [offers, setOffers] = useState<{ careerPath: CareerPath; previews: ProgramPreview[] }>();
  /** Scheme and staff are settled once, at takeover, before the first season. */
  const [setupDone, setSetupDone] = useState(false);
  /** What the career costs on disk, reported by the worker after each autosave. */
  const [saved, setSaved] = useState<{ bytes: number; at: string }>();
  /** Whether there is a career on this device to pick back up. */
  const [resumable, setResumable] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL("./simulation.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    // Ask on boot rather than on a button, so the new-game screen already knows
    // whether it should offer to continue.
    worker.postMessage({ type: "HAS_SAVE", requestId: nextRequestId() });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if ("requestId" in response) {
        setInFlightDecision((current) => current?.requestId === response.requestId ? undefined : current);
      }
      setBusy(false);
      if (response.type === "ERROR") { setError(response.message); return; }
      if (response.type === "CANDIDATES") {
        setOffers((previous) => ({ careerPath: previous?.careerPath ?? "DYNASTY_BUILDER", previews: response.previews }));
        return;
      }
      // Autosave finishing is unsolicited and must never disturb the screen.
      if (response.type === "SAVED") { setSaved({ bytes: response.bytes, at: response.savedAt }); return; }
      if (response.type === "SAVE_FOUND") {
        setResumable(true);
        setSaved({ bytes: response.bytes, at: new Date().toISOString() });
        setBusy(false);
        return;
      }
      if (response.type === "NO_SAVE") { setResumable(false); setBusy(false); return; }
      setOffers(undefined);
      if (response.type === "READY") {
        playerProgramIdRef.current = response.playerProgramId;
        setResumable(false);
        if (response.savedBytes) setSaved({ bytes: response.savedBytes, at: new Date().toISOString() });
      }
      setGame((previous) => ({
        state: response.state,
        playerProgramId: response.type === "READY" ? response.playerProgramId : previous!.playerProgramId,
        events: response.events
      }));
      // Completing training camp returns to the same preseason setup flow used
      // at takeover. Without resetting this flag, later seasons skipped scheme
      // and staff setup even though the engine correctly entered roster review.
      //
      // Only on the way *in*, though. Testing it on every reply meant that any
      // command answered while the preseason was still open — setting the
      // week's priorities from the dashboard, putting the film room on a game —
      // threw the player back to a takeover screen they had already finished,
      // with no message. Nothing was lost, but a new player cannot tell that
      // from a crash, and it was the dashboard's own REQUIRED instruction that
      // sent them there.
      const enteringRosterReview = phaseRef.current !== "ROSTER_REVIEW"
        && response.state.phase === "ROSTER_REVIEW";
      phaseRef.current = response.state.phase;
      if (enteringRosterReview) {
        setSetupDone(false);
        setScreen("ROSTER");
      }
      if (response.type === "COMPLETE") {
        const responseAuditIds = new Set(response.events
          .filter((gameEvent): gameEvent is Extract<GameEvent, { type: "DECISION_AUDITED" }> =>
            gameEvent.type === "DECISION_AUDITED" && gameEvent.programId === playerProgramIdRef.current)
          .map((gameEvent) => gameEvent.submissionId));
        const blockedDecision = response.state.decisionAudits?.find((audit) =>
          responseAuditIds.has(audit.submissionId) && audit.status === "BLOCKED");
        if (blockedDecision?.rejectionReason) setError(blockedDecision.rejectionReason);
        const playedGame = response.events.some((gameEvent) =>
          gameEvent.type === "WEEKLY_RECAP"
          && gameEvent.programId === playerProgramIdRef.current
          && gameEvent.result !== "BYE"
        );
        if (playedGame) {
          setWeekTab("REPORT");
          setScreen("THIS_WEEK");
        }
      }
    };
    return () => worker.terminate();
  }, []);

  const send = (request: WorkerRequest): void => {
    setBusy(true);
    setError(undefined);
    workerRef.current?.postMessage(request);
  };
  const startGame = (careerPath: CareerPath, reroll = 0): void => {
    setScreen("ROSTER");
    setPendingCommands([]);
    setSetupDone(false);
    setOffers({ careerPath, previews: [] });
    // The seed carries the reroll, so "look at another league" is a real reroll
    // rather than the same 72 programs shuffled.
    send({ type: "CREATE_GAME", requestId: nextRequestId(), careerPath, seed: `web-alpha-${careerPath.toLowerCase()}-${reroll}` });
  };
  const resume = (): void => {
    setScreen("DASHBOARD");
    setSetupDone(true);
    send({ type: "LOAD_SAVE", requestId: nextRequestId() });
  };
  const abandon = (): void => {
    send({ type: "DELETE_SAVE", requestId: nextRequestId() });
  };
  const takeJob = (programId: ProgramId): void => {
    if (!offers) return;
    send({ type: "CHOOSE_PROGRAM", requestId: nextRequestId(), careerPath: offers.careerPath, programId });
  };
  const begin = (): void => {
    if (!game) return;
    setScreen("DASHBOARD");
    send({ type: "BEGIN_SEASON", requestId: nextRequestId(), playerProgramId: game.playerProgramId, commands: pendingCommands });
    setPendingCommands([]);
  };
  const prepare = (command: GameCommand): void => {
    if (!game) return;
    send({ type: "PREPARE", requestId: nextRequestId(), playerProgramId: game.playerProgramId, commands: [command] });
  };
  const prepareDecision = (command: WeeklyPlanningCommand): void => {
    if (!game || inFlightDecision) return;
    const requestId = nextRequestId();
    setInFlightDecision({ requestId, command });
    send({
      type: "PREPARE_DECISION",
      requestId,
      playerProgramId: game.playerProgramId,
      command,
      actor: {
        mode: "MANUAL",
        actorId: `player:${game.playerProgramId}`,
        displayName: "Player"
      }
    });
  };
  const queue = (command: GameCommand): void => {
    // These settle now rather than on advance, so the screens and the dashboard
    // briefing reflect the decision the moment it is made.
    if (command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET") {
      prepareDecision(command);
      return;
    }
    if (command.type === "ALLOCATE_SCOUTING" || command.type === "SET_PRACTICE_REPS"
      || command.type === "SET_STAFF_ALLOCATION" || command.type === "SET_WEEK_HOURS"
      || command.type === "CHOOSE_BOOSTER") { prepare(command); return; }
    const key = recruitingCommandKey(command) ?? (command.type === "REPLACE_STAFF" ? `replace:${command.staffId}`
      : command.type === "SET_TICKET_PRICE" ? "ticket-price"
      : command.type === "SET_ADVERTISING" ? "advertising"
      : command.type === "ACCEPT_SPONSORSHIP" ? "sponsorship"
      : command.type === "SET_GAME_PLAN" ? `game-plan:${Object.keys(command.plan).sort().join(",")}`
      : command.type === "SET_DEVELOPMENT_SPOTLIGHT" ? "development-spotlight"
      : command.type === "SET_PLAYER_MEDIA_ACTION" ? "featured-media"
      : command.type === "UPGRADE_FACILITY" ? `facility:${command.facility}`
      : command.type === "SCHEDULE_MARQUEE_HOME_GAME" ? "marquee-game"
      : command.type === "BID_PORTAL_PLAYER" ? `portal:${command.playerId}`
      : command.type === "SET_TRAINING_CAMP_FOCUS" ? "training-camp"
      : command.type === "SET_DEPTH_CHART" ? `depth:${command.position}`
      : command.type === "SET_REDSHIRT" || command.type === "RED_SHIRT" ? `redshirt:${command.playerId}`
      : "command");
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
    if (command.type === "OFFER_PROSPECT" && game) {
      const actual = game.state.recruiting[command.programId]?.offeredProspectIds.includes(command.prospectId) ?? false;
      if (command.extend === actual) {
        setPendingCommands((previous) => previous.filter((item) => commandKey(item) !== key));
        return;
      }
    }
    if (command.type === "SET_NIL_OFFER" && game) {
      const actual = game.state.nil?.[command.programId]?.offersByProspect[command.prospectId] ?? 0;
      if (command.weeklyAmount === actual) {
        setPendingCommands((previous) => previous.filter((item) => commandKey(item) !== key));
        return;
      }
    }
    setPendingCommands((previous) => [
      ...previous.filter((item) => commandKey(item) !== key),
      command
    ]);
  };
  const advanceOffseason = (): void => {
    if (!game) return;
    send({ type: "ADVANCE_OFFSEASON", requestId: nextRequestId(), playerProgramId: game.playerProgramId, commands: pendingCommands });
    setPendingCommands([]);
  };
  const advance = (): void => {
    if (!game) return;
    send({ type: "ADVANCE_WEEK", requestId: nextRequestId(), playerProgramId: game.playerProgramId, commands: pendingCommands });
    // Clear at send time, not on COMPLETE. Clearing on completion silently
    // wiped any decision the player queued while the week was simulating —
    // a command the engine never saw and the screen said was queued.
    setPendingCommands([]);
  };

  if (game && game.state.phase === "ROSTER_REVIEW" && !setupDone) {
    return <SetUpProgram busy={busy} game={game} onPrepare={prepare}
      onDone={() => { setSetupDone(true); setScreen("ROSTER"); }} />;
  }
  // A dismissal ends the career. The event stays in history, so this survives a
  // reload rather than being a moment the player can navigate away from.
  const dismissal = game
    ? [...game.state.eventHistory].reverse().find(
        (event): event is Extract<GameEvent, { type: "COACH_FIRED" }> =>
          event.type === "COACH_FIRED" && event.programId === game.playerProgramId
      )
    : undefined;
  if (game && dismissal) {
    return <CareerOver game={game} dismissal={dismissal} busy={busy}
      onStartOver={() => { abandon(); setGame(undefined); setOffers(undefined); }} />;
  }
  if (game && game.state.phase === "OFFSEASON") {
    return <Offseason game={game} busy={busy} error={error} pending={pendingCommands} onQueue={queue}
      onContinue={advanceOffseason} />;
  }
  if (offers) return <ChooseJob busy={busy} careerPath={offers.careerPath} previews={offers.previews}
    onTake={takeJob} onReroll={() => startGame(offers.careerPath, Math.floor(Math.random() * 100_000))}
    onBack={() => setOffers(undefined)} />;
  if (!game) return <NewGame busy={busy} onStart={(path) => startGame(path)} resumable={resumable} saved={saved} onResume={resume} onAbandon={abandon} />;
  return <>
    <Dashboard game={game} screen={screen} busy={busy} error={error} pendingCommands={pendingCommands}
      inFlightDecision={inFlightDecision?.command ?? null}
      onNavigate={(next, tab) => { setWeekTab(tab); setScreen(next); }}
      weekTab={weekTab} onQueue={queue} onBegin={begin} onAdvance={advance} />
    <BoosterPopup game={game} busy={busy} onChoose={(optionId) =>
      prepare({ type: "CHOOSE_BOOSTER", programId: game.playerProgramId, optionId })} />
  </>;
}

/**
 * Somebody at the door, every third week.
 *
 * Deliberately a modal rather than another panel: this is the one thing in the
 * game that happens *to* the program rather than being something the staff is
 * spending, and it should interrupt. Four people, one yes, and it does not
 * always come off — the odds are printed on every card before you pick, because
 * a gamble with hidden odds is a slot machine.
 */
function BoosterPopup({ game, busy, onChoose }: {
  game: GameView; busy: boolean; onChoose: (optionId: string) => void;
}): ReactElement | null {
  const programId = game.playerProgramId;
  const offer = latestBoosterOffer(game.state, programId);
  const [dismissed, setDismissed] = useState<string>();
  const offerKey = offer ? `${offer.season}:${offer.week}` : "";
  // A new offer re-opens the popup even if the last one was dismissed.
  useEffect(() => { setDismissed(undefined); }, [offerKey]);
  if (!offer || dismissed === offerKey) return null;

  const resolved = offer.chosenOptionId !== null;
  const chosen = resolved ? offer.options.find((option) => option.id === offer.chosenOptionId) : undefined;
  const result = [...game.state.eventHistory].reverse()
    .find((event): event is Extract<GameEvent, { type: "BOOSTER_RESOLVED" }> =>
      event.type === "BOOSTER_RESOLVED" && event.programId === programId && event.optionId === offer.chosenOptionId);

  return <div className="booster-backdrop" role="dialog" aria-modal="true" aria-label="Someone is at the door">
    <div className="booster-modal">
      {!resolved && <>
        <p className="eyebrow">Week {offer.week} · someone's at the door</p>
        <h2>Four people want to help. You can say yes to one.</h2>
        <p className="muted">
          The percentage is the chance it actually comes off. None of them are certain, and you only get one — pick
          the one worth the risk this week.
        </p>
        <div className="booster-options">{offer.options.map((option) => {
          const odds = option.chance;
          return <button className="booster-option" key={option.id} disabled={busy} onClick={() => onChoose(option.id)}>
            <span className="booster-kind">{BOOSTER_KIND_LABELS[option.kind]}</span>
            <strong className="booster-name">{option.name}</strong>
            <span className="booster-headline">{option.headline}</span>
            <span className="booster-reward">{option.reward}</span>
            <span className="booster-note">{option.note}</span>
            <span className={odds >= 60 ? "booster-odds safe" : odds >= 40 ? "booster-odds" : "booster-odds long"}>
              {odds}% chance
            </span>
          </button>;
        })}</div>
        <button className="booster-dismiss" disabled={busy} onClick={() => setDismissed(offerKey)}>
          Turn them all away
        </button>
      </>}
      {resolved && chosen && <div className={result?.succeeded ? "booster-result win" : "booster-result miss"}>
        <p className="eyebrow">{BOOSTER_KIND_LABELS[chosen.kind]} · {chosen.name}</p>
        <h2>{result?.succeeded ? "Success!" : "Try again next time!"}</h2>
        <p className="muted">
          {result?.succeeded ? result.outcome : `${chosen.name} could not make it work. Nothing changes this week.`}
        </p>
        {result?.succeeded && <p className="booster-reward">{chosen.reward}</p>}
        <button className="booster-dismiss primary" onClick={() => setDismissed(offerKey)}>Close</button>
      </div>}
    </div>
  </div>;
}

function commandKey(command: GameCommand): string {
  const recruitingKey = recruitingCommandKey(command);
  if (recruitingKey) return recruitingKey;
  if (command.type === "ALLOCATE_SCOUTING") return `scout:${command.opponentProgramId}`;
  if (command.type === "SET_PRACTICE_REPS") return `reps:${command.side}`;
  if (command.type === "REPLACE_STAFF") return `replace:${command.staffId}`;
  if (command.type === "SET_TICKET_PRICE") return "ticket-price";
  if (command.type === "SET_ADVERTISING") return "advertising";
  if (command.type === "ACCEPT_SPONSORSHIP") return "sponsorship";
  if (command.type === "SET_GAME_PLAN") return `game-plan:${Object.keys(command.plan).sort().join(",")}`;
  if (command.type === "SET_DEVELOPMENT_SPOTLIGHT") return "development-spotlight";
  if (command.type === "SET_PLAYER_MEDIA_ACTION") return "featured-media";
  if (command.type === "SET_STAFF_ALLOCATION") return `staff:${command.staffId}`;
  if (command.type === "SET_WEEK_HOURS") return `hours:${command.focus}`;
  if (command.type === "UPGRADE_FACILITY") return `facility:${command.facility}`;
  if (command.type === "SCHEDULE_MARQUEE_HOME_GAME") return "marquee-game";
  if (command.type === "BID_PORTAL_PLAYER") return `portal:${command.playerId}`;
  if (command.type === "SET_TRAINING_CAMP_FOCUS") return "training-camp";
  if (command.type === "SET_DEPTH_CHART") return `depth:${command.position}`;
  if (command.type === "SET_REDSHIRT" || command.type === "RED_SHIRT") return `redshirt:${command.playerId}`;
  return "command";
}

/**
 * The jobs on offer at a tier. Two programs at the same tier used to be the same
 * program — one facility level applied to everything, rosters from one narrow
 * band — so this screen would have been a coin flip. Character has to be legible
 * at the moment of choosing or it may as well not exist.
 */
function ChooseJob({ busy, careerPath, previews, onTake, onReroll, onBack }: {
  busy: boolean;
  careerPath: CareerPath;
  previews: ProgramPreview[];
  onTake: (programId: ProgramId) => void;
  onReroll: () => void;
  onBack: () => void;
}): ReactElement {
  const profile = CAREER_PATHS[careerPath];
  const facilityOrder: FacilityType[] = ["TRAINING", "RECRUITING", "STADIUM", "ACADEMICS", "SCOUTING"];
  return <main className="new-game">
    <header className="masthead">
      <p className="eyebrow">{profile.label} · {profile.tier} tier</p>
      <h1>Which job do you take?</h1>
      <p>
        These are all the same level of program. None is better than the others — they're good at
        different things, and what's sitting in the locker room is different at every one of them.
      </p>
      <div className="job-actions">
        <button className="replace-button" onClick={onBack} disabled={busy}>Back</button>
        <button className="replace-button" onClick={onReroll} disabled={busy}>Show me different openings</button>
      </div>
    </header>
    {previews.length === 0 && <p className="muted">Working the phones…</p>}
    <section className="career-grid">{previews.map((preview) =>
      <article className={`career-card job-card ${preview.character.toLowerCase()}`} key={preview.programId}>
        <p className="tier">{preview.characterLabel}</p>
        <h2>{preview.name}</h2>
        <p className="muted">{preview.location} · {compactNumber(preview.fanBase)} fans · {preview.prestige} prestige</p>
        <p>{preview.blurb}</p>
        <p className="job-strategy">{preview.strategy}</p>
        <dl>
          <div><dt>Roster today</dt><dd>{preview.rosterOverall}</dd></div>
          <div><dt>If they all hit</dt><dd>{preview.rosterCeiling}</dd></div>
          <div><dt>Potential stars</dt><dd>{preview.futureStars}</dd></div>
          <div><dt>Best of them</dt><dd>{preview.bestCeiling}</dd></div>
        </dl>
        <div className="facility-strip">{facilityOrder.map((type) =>
          <span className="facility-pip" key={type} title={`${FACILITY_NAMES[type]}, level ${preview.facilities[type]} of 5`}>
            <small>{FACILITY_NAMES[type]}</small>
            <b>{preview.facilities[type]}/5</b>
          </span>)}
        </div>
        <ul className="plan-notes">{preview.notes.map((note) => <li key={note}>{note}</li>)}</ul>
        <button disabled={busy} onClick={() => onTake(preview.programId)}>Sign the contract</button>
      </article>)}
    </section>
  </main>;
}

/** What the post is for, in one line, so a player never has to guess. */
const ROLE_JOB: Record<string, string> = {
  HEAD_COACH: "Runs the program. Covers for a missing coordinator and carries the recruiting trail.",
  OFFENSIVE_COORDINATOR: "Installs your offense every week. His hours are the offensive game plan.",
  DEFENSIVE_COORDINATOR: "Installs your defense every week. His hours are the defensive game plan.",
  STRENGTH_COACH: "Automatically improves strength training and protects player health. He has no weekly allocation sliders."
};

/** Short enough to sit above a bar. The long form is on the staff screen. */
const SKILL_SHORT: Record<StaffFocus, string> = {
  PREPARE: "Game plan",
  SCOUT: "Scouting",
  RECRUIT: "Recruiting",
  DEVELOP: "Developing",
  RECOVER: "Training room"
};

/** Everything one hire's row needs to say, from either an incumbent or the market. */
interface CoachOptionView {
  key: string;
  name: string;
  rating: number;
  traitLabel: string;
  traitBlurb: string;
  hours: number | null;
  skills: StaffSkill[];
  outcomes: { label: string; value: string }[];
  /** The scheme he coaches, when the post has one. */
  runs: string | null;
  fitNote: string | null;
  fitWarning: boolean;
  price: string;
  /** Why he is worth taking, or why you cannot. */
  note: string | null;
  blocked: string | null;
  current: boolean;
  onPick: (() => void) | null;
}

/**
 * One coach, as a row you can compare against the others in the same post.
 * Rating alone made this a sort — the tendency and the five job numbers are
 * what turn it into a choice, so they are on the row rather than behind a click.
 */
function CoachOption({ option, busy }: { option: CoachOptionView; busy: boolean }): ReactElement {
  const classes = ["coach-option"];
  if (option.current) classes.push("current");
  if (option.blocked) classes.push("locked");
  return <button className={classes.join(" ")} type="button"
    disabled={busy || Boolean(option.blocked) || !option.onPick}
    onClick={() => option.onPick?.()}>
    <div className="coach-line">
      <strong>{option.name}</strong>
      <span className="coach-rating">{option.rating}</span>
    </div>
    <p className="coach-trait"><b>{option.traitLabel}</b> — {option.traitBlurb}</p>
    {option.skills.length > 0 && <ul className="skill-strip">{option.skills.map((skill) =>
      <li className={skill.strength ? "strong" : ""} key={skill.focus}>
        <span>{SKILL_SHORT[skill.focus]}</span>
        <i><em style={{ width: `${skill.value}%` }} /></i>
        <b>{skill.value}</b>
      </li>)}
    </ul>}
    {option.outcomes.length > 0 && <div className="snapshot-list">{option.outcomes.map((outcome) =>
      <p key={outcome.label}><span>{outcome.label}</span><strong>{outcome.value}</strong></p>)}
    </div>}
    <p className="coach-meta">{option.hours === null ? "Automatic weekly work · no allocation sliders" : `${option.hours}-hour week`}{option.runs ? ` · ${option.runs}` : ""}</p>
    {option.fitNote && <p className={option.fitWarning ? "attention" : "muted"}>{option.fitNote}</p>}
    <p className="coach-price">{option.price}</p>
    {option.note && <p className="tradeoff">{option.note}</p>}
    {option.blocked && <p className="tradeoff">{option.blocked}</p>}
  </button>;
}

/** The scheme a coach runs, in the words the rest of the game uses. */
function coachRuns(preference: SchemeIdentity, side: "offense" | "defense" | null): string | null {
  if (side === "offense") return `${OFFENSIVE_IDENTITY_LABELS[preference.offense]} guy`;
  if (side === "defense") return `${DEFENSIVE_IDENTITY_LABELS[preference.defense]} guy`;
  return null;
}

/**
 * Every option for one post: whoever is in the chair, then everybody who would
 * take it. Shared by the takeover screen and the in-season staff screen so a
 * hire is described the same way whenever you make it.
 */
function coachOptions({ member, candidates, identity, budget, onHire }: {
  member: StaffMember;
  candidates: StaffCandidate[];
  identity: SchemeIdentity;
  budget: number;
  onHire: (candidateId: string) => void;
}): CoachOptionView[] {
  const side = member.role === "OFFENSIVE_COORDINATOR" ? "offense"
    : member.role === "DEFENSIVE_COORDINATOR" ? "defense" : null;
  const memberFit = coachSchemeFit(member, identity);
  const strengthPost = member.role === "STRENGTH_COACH";
  const incumbent: CoachOptionView = {
    key: member.id,
    name: member.name,
    rating: member.rating,
    traitLabel: STAFF_TRAITS[member.trait].label,
    traitBlurb: STAFF_TRAITS[member.trait].blurb,
    hours: strengthPost ? null : staffCapacity(member.rating, member.trait),
    skills: strengthPost ? [] : staffSkills(member),
    outcomes: strengthPost ? staffModifiers(member) : [],
    runs: coachRuns(member.schemePreference, side),
    fitNote: side ? schemeFitLabel(memberFit) : null,
    fitWarning: Boolean(side) && memberFit < 0.9,
    price: `${money(member.salary)} a year · ${money(staffBuyout(member))} to let him go`,
    note: null,
    blocked: null,
    current: true,
    onPick: null
  };
  // Replacing a post costs both halves: the incoming man's signing cost and
  // what is owed to the man being let go. The card has to post the total the
  // engine will actually charge.
  const buyout = staffBuyout(member);
  return [incumbent, ...candidates.map((candidate) => {
    const affordable = budget >= candidate.signingCost + buyout;
    return {
      key: candidate.id,
      name: candidate.name,
      rating: candidate.rating,
      traitLabel: candidate.traitLabel,
      traitBlurb: candidate.traitBlurb,
      hours: strengthPost ? null : candidate.hours,
      skills: strengthPost ? [] : candidate.skills,
      outcomes: strengthPost ? staffModifiers(candidate) : [],
      runs: coachRuns(candidate.schemePreference, side),
      fitNote: side ? candidate.schemeFitNote : null,
      fitWarning: Boolean(side) && candidate.schemeFit < 0.9,
      price: `${money(candidate.salary)} a year · ${money(candidate.signingCost)} to sign him${buyout > 0 ? ` + ${money(buyout)} buyout` : ""}`,
      note: `${candidate.rating >= member.rating ? "+" : ""}${candidate.rating - member.rating} on ${member.name}`,
      blocked: candidate.unavailableReason ?? (affordable ? null : "You can't cover the signing cost and the buyout."),
      current: false,
      onPick: () => onHire(candidate.id)
    } satisfies CoachOptionView;
  })];
}

/**
 * The rest of the takeover: what this program is going to run, and who is going
 * to install it. Presented together on purpose — the interesting case is when
 * the roster wants one scheme and the only coach who will take the job coaches
 * another.
 */
function SetUpProgram({ busy, game, onPrepare, onDone }: {
  busy: boolean;
  game: GameView;
  onPrepare: (command: GameCommand) => void;
  onDone: () => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const roster = programRoster(game.state, programId);
  const identity = program.schemeIdentity;
  const [openPost, setOpenPost] = useState<string>();

  const offensiveFit = rosterSchemeFit(roster, "OFFENSE", 0.72);
  const defensiveFit = rosterSchemeFit(roster, "DEFENSE", 0.72);
  const staff = Object.values(game.state.staff).filter((member) => member.programId === programId);
  const roleOrder = ["HEAD_COACH", "OFFENSIVE_COORDINATOR", "DEFENSIVE_COORDINATOR", "STRENGTH_COACH"] as const;

  const schemePanel = (side: "OFFENSE" | "DEFENSE") => {
    const fits = side === "OFFENSE" ? offensiveFit : defensiveFit;
    const chosen = side === "OFFENSE" ? identity.offense : identity.defense;
    const best = fits[0]!;
    return <article className="panel">
      <p className="eyebrow">{side === "OFFENSE" ? "Offensive scheme" : "Defensive scheme"}</p>
      <h2>{fits.find((fit) => fit.scheme === chosen)?.label ?? "—"}</h2>
      <p className="muted">
        These guys are built to run <strong>{best.label}</strong> ({best.summary}). Going another direction
        isn't a mistake — it's a rebuild, and it'll cost you until you recruit the right kids.
      </p>
      {/* Roster fit and install are the two halves of this decision and the
          screen only ever posted the second one for the scheme you were already
          running, so the cost of switching could not be read anywhere. Both are
          on every option now: how well the players suit it, and how much of it
          your coordinator would actually get installed. */}
      <p className="muted">
        <strong>Roster fit</strong> is how well these players suit the scheme. <strong>Installed</strong> is
        how much of it your coordinator gets across in a week — he coaches one scheme himself, and
        teaching somebody else's costs him. A great fit nobody can install is worse than a good one
        your coordinator knows.
      </p>
      <div className="plan-options">{fits.map((fit) =>
        <button className={chosen === fit.scheme ? "plan-option active" : "plan-option"} key={fit.scheme}
          disabled={busy}
          onClick={() => onPrepare({
            type: "SET_SCHEME", programId,
            scheme: (side === "OFFENSE" ? { offense: fit.scheme } : { defense: fit.scheme }) as Partial<SchemeIdentity>
          })}>
          <strong>{fit.label} · {fit.verdict}</strong>
          <span className="effect">{personnelSummary(side, fit.scheme)}</span>
          <span className="effect fit-line">
            Roster fit {fit.summary}
            {(() => {
              const install = installIfScheme(game.state, programId, side, fit.scheme);
              return install === null ? "" : ` · your coordinator installs it to ${install}%`;
            })()}
          </span>
          <span className="effect">{fit.blurb}</span>
          <div className="execution-bar" aria-label={`${fit.label} roster fit`}>
            <span className="execution-band" style={{ left: `${fit.low}%`, width: `${Math.max(2, fit.high - fit.low)}%` }} />
          </div>
        </button>)}
      </div>
    </article>;
  };

  return <main className="new-game setup-screen">
    <header className="masthead">
      <p className="eyebrow">{program.name} · {program.city}, {program.stateCode}</p>
      <h1>What are you going to run?</h1>
      <p>
        This is where the program starts, not where it has to finish. Your guys fit some of these a lot
        better than others — and whoever installs it had better know it.
      </p>
    </header>

    <section className="setup-grid">
      {schemePanel("OFFENSE")}
      {schemePanel("DEFENSE")}
    </section>

    <header className="masthead staff-masthead">
      <p className="eyebrow">Hiring · {money(program.budget)} to work with</p>
      <h2>Now put your staff together.</h2>
      <p>
        The number on the right is how good he is. The tendency underneath is what he’s good <em>at</em> —
        and the five bars are what an hour of his week is actually worth on each job. Whoever’s in the chair
        stays for free; anybody else costs you a buyout today and a salary every year after.
      </p>
    </header>

    <section className="setup-grid">{roleOrder.map((role) => {
      const member = staff.find((candidate) => candidate.role === role);
      if (!member) return null;
      const open = openPost === role;
      const candidates = open ? staffCandidatesFor(game.state, programId, member.id) : [];
      const options = coachOptions({
        member, candidates, identity, budget: program.budget,
        onHire: (candidateId) => onPrepare({ type: "REPLACE_STAFF", programId, staffId: member.id, candidateId })
      });
      return <article className={open ? "panel staff-card span-two" : "panel staff-card"} key={role}>
        <div className="staff-head">
          <div>
            <p className="eyebrow">{label(role)}</p>
            <h2>{member.name}</h2>
            <p className="muted">{ROLE_JOB[role]}</p>
          </div>
          <button className="replace-button" disabled={busy} onClick={() => setOpenPost(open ? undefined : role)}>
            {open ? "Keep him" : "See who’s available"}
          </button>
        </div>
        <div className="snapshot-list">{staffCard(game.state, programId, member.id).map((modifier) =>
          <p key={modifier.label}><span>{modifier.label}</span><strong>{modifier.value}</strong></p>)}
        </div>
        <div className="coach-list">
          {(open ? options : options.slice(0, 1)).map((option) =>
            <CoachOption busy={busy} key={option.key} option={option} />)}
        </div>
      </article>;
    })}</section>

    <div className="job-actions">
      <button disabled={busy} onClick={onDone}>This is my football team. Let’s go to work.</button>
    </div>
  </main>;
}

function NewGame({ busy, onStart, resumable, saved, onResume, onAbandon }: {
  busy: boolean; onStart: (path: CareerPath) => void; resumable: boolean;
  saved: { bytes: number; at: string } | undefined;
  onResume: () => void; onAbandon: () => void;
}): ReactElement {
  return <main className="new-game">
    <header className="masthead"><p className="eyebrow">College football management</p><h1>College Legends</h1><p>Choose the job that defines your career.</p></header>
    {resumable && <section className="resume-card">
      <div>
        <p className="eyebrow">Saved on this device{saved ? ` · ${(saved.bytes / 1e6).toFixed(2)} MB` : ""}</p>
        <h2>Pick your career back up</h2>
        <p className="muted">Your dynasty saves itself after every week.</p>
      </div>
      <div className="resume-actions">
        <button disabled={busy} onClick={onResume}>{busy ? "Loading…" : "Continue career"}</button>
        <button className="ghost" disabled={busy} onClick={onAbandon}>Start over</button>
      </div>
    </section>}
    <section className="career-grid">{careerOrder.map((path) => {
      const profile = CAREER_PATHS[path];
      return <article className={`career-card ${profile.tier.toLowerCase()}`} key={path}>
        <p className="tier">{profile.tier} TIER</p><h2>{profile.label}</h2><p>{descriptions[path]}</p>
        <dl>
          <div><dt>Opening budget</dt><dd>${(profile.budget / 1_000_000).toFixed(1)}M</dd></div>
          <div><dt>Opening roster</dt><dd>85 players</dd></div>
          <div><dt>Mandate</dt><dd>{profile.championshipDeadline ? `Win title in ${profile.championshipDeadline} years` : "Build at your pace"}</dd></div>
        </dl>
        <button disabled={busy} onClick={() => onStart(path)}>{busy ? "Creating program…" : `Start as ${profile.label}`}</button>
      </article>;
    })}</section>
  </main>;
}

/**
 * Five primary tabs plus a "More" menu for the rest. Opening a full section
 * pushed the page content down rather than floating a dropdown that could
 * clip against the viewport; this floats instead, anchored to the button, so
 * the primary row never reflows just because the menu opened.
 *
 * If the active screen is one hiding behind "More", the trigger shows that
 * screen's own name instead of the word "More" — losing your place behind an
 * unlabeled button is exactly the confusion this nav exists to avoid.
 */
function ProgramNav({ screen, isReview, onNavigate }: {
  screen: Screen; isReview: boolean; onNavigate: (screen: Screen) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeOverflow = OVERFLOW_SCREENS.includes(screen);

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent): void => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const screenLabel = (item: Screen): string => item === "RECRUITING" && isReview ? "Recruiting · Locked" : label(item);
  const go = (item: Screen): void => { onNavigate(item); setOpen(false); };

  return <div className="nav-row">
    <nav className="game-nav" aria-label="Program sections">{PRIMARY_SCREENS.map((item) =>
      <button className={screen === item ? "active" : ""} key={item} onClick={() => go(item)}>
        {screenLabel(item)}
      </button>)}</nav>
    <div className="nav-more" ref={wrapRef}>
      <button
        className={activeOverflow ? "nav-more-toggle active" : "nav-more-toggle"}
        aria-haspopup="true" aria-expanded={open}
        onClick={() => setOpen((value) => !value)}>
        {activeOverflow ? screenLabel(screen) : "More"} <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && <div className="nav-more-menu" role="menu">{OVERFLOW_SCREENS.map((item) =>
        <button role="menuitem" className={screen === item ? "active" : ""} key={item} onClick={() => go(item)}>
          {screenLabel(item)}
        </button>)}</div>}
    </div>
  </div>;
}

function Dashboard({ game, screen, busy, error, pendingCommands, inFlightDecision, onNavigate, weekTab, onQueue, onBegin, onAdvance }: {
  game: GameView; screen: Screen; busy: boolean; error: string | undefined; pendingCommands: GameCommand[];
  inFlightDecision: WeeklyPlanningCommand | null;
  onNavigate: (screen: Screen, tab?: WeekTab) => void; weekTab: WeekTab | undefined;
  onQueue: (command: GameCommand) => void; onBegin: () => void; onAdvance: () => void;
}): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const roster = useMemo(() => Object.values(game.state.players)
    .filter((player) => player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP")
    .sort((a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position) || b.overall - a.overall), [game.state.players, program.id]);
  const isReview = game.state.phase === "ROSTER_REVIEW";

  return <main className="app-shell">
    <header className="dashboard-header">
      <div><p className="eyebrow">{program.tier} TIER · {DIVISION_NAMES[program.divisionId]}</p><h1>{program.name}</h1><p>{program.city}, {program.stateCode} · Season {game.state.season} · {isReview ? "Opening roster review" : `Week ${game.state.week}`}</p></div>
      <div className="week-action">
        {isReview
          ? <><span>{pendingCommands.length
            ? `${pendingCommands.length} preseason decision${pendingCommands.length === 1 ? "" : "s"} queued`
            : marqueeGameOptions(game.state, program.id).length > 0
              ? "A marquee-game offer is open on the Schedule tab — it expires when you accept"
              : "Recruiting has not started"}</span><button disabled={busy} onClick={onBegin}>{busy ? "Starting…" : "Accept roster & begin season"}</button></>
          : <><span>{pendingCommands.length > 0 ? `${pendingCommands.length} decision${pendingCommands.length === 1 ? "" : "s"} will apply on advance` : "Plays Saturday with the standing plan"}</span><button disabled={busy} onClick={onAdvance}>{busy ? "Simulating…" : "Advance week"}</button></>}
      </div>
    </header>
    {error && <p className="error">{error}</p>}
    <section className="metrics">
      <Metric label="Record" value={`${program.wins}–${program.losses}`} />
      <Metric label="National rank" value={`#${program.nationalRank}`} />
      <Metric label="Fans" value={compactNumber(program.fanBase)} />
      {/* Was "Budget" here and "In the bank" on the panel below it —
          the same number under two names on one screen. */}
      <Metric label="In the bank" value={money(program.budget)} />
      {/* Job security is retired from the header until the firing loop exists —
          the simulation never reads it, and a headline stat that nothing can
          move is a promise the game does not keep. seasonExpectation's win
          target carries the pressure honestly. */}
      <Metric label="National titles" value={`${program.championships}`} />
      <Metric label="Roster" value={`${roster.length}/${program.scholarshipLimit}`} />
    </section>
    <ProgramNav screen={screen} isReview={isReview} onNavigate={onNavigate} />
    {screen === "DASHBOARD" && <ProgramDashboard game={game} roster={roster} inFlightDecision={inFlightDecision} onNavigate={onNavigate} />}
    {screen === "THIS_WEEK" && <WeekHub game={game} busy={busy} inFlightDecision={inFlightDecision} pending={pendingCommands} onQueue={onQueue} initialTab={weekTab} />}
    {screen === "WEEKLY_RECAPS" && <WeeklyRecaps game={game} />}
    {screen === "ROSTER" && <Roster game={game} roster={roster} />}
    {screen === "DEPTH_CHART" && <DepthChart game={game} roster={roster} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "PLAYER_STATS" && <PlayerStats game={game} roster={roster} />}
    {screen === "HONORS" && <Honors game={game} />}
    {screen === "DEVELOPMENT" && <Development state={game.state} roster={roster} programId={program.id} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "PLAYER_MEDIA" && <PlayerMedia game={game} roster={roster} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "SCHEDULE" && <Schedule game={game} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "DIVISIONS" && <Divisions game={game} />}
    {screen === "STAFF" && <Staff game={game} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "FINANCES" && <Finances game={game} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "RECRUITING" && <WarRoomRecruiting game={game} locked={isReview} pending={pendingCommands} onQueue={onQueue} />}
    {screen === "INBOX" && <Inbox game={game} />}
  </main>;
}

/**
 * The one screen that has to answer "what do I do now".
 *
 * This used to be six panels of status — fan base, press, roster average — and
 * no direction at all, so a player had to hold every system in their head to
 * work out what was being wasted. It leads with the athletic director's
 * expectation, then a ranked list of what actually needs them this week, each
 * one a button that goes straight to the screen that fixes it.
 */
function ProgramDashboard({ game, roster, inFlightDecision, onNavigate }: {
  game: GameView; roster: Player[]; inFlightDecision: WeeklyPlanningCommand | null;
  onNavigate: (screen: Screen, tab?: WeekTab) => void;
}): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const board = scoutingBoard(game.state, game.playerProgramId);
  const priorityDecision = weeklyPriorityDecision(game.state, game.playerProgramId, inFlightDecision);
  const briefing = weeklyBriefing(game.state, game.playerProgramId, { excludeWeeklyPriorities: true });
  const expectation = seasonExpectation(game.state, game.playerProgramId);
  const nextGame = game.state.schedule.find((item) => !item.played && (item.homeProgramId === program.id || item.awayProgramId === program.id));
  const opponentId = nextGame ? (nextGame.homeProgramId === program.id ? nextGame.awayProgramId : nextGame.homeProgramId) : undefined;
  const opponent = opponentId ? game.state.programs[opponentId] : undefined;
  const file = board.find((dossier) => dossier.opponentProgramId === opponentId);
  const recap = [...game.state.eventHistory].reverse().find(
    (event): event is Extract<GameEvent, { type: "WEEKLY_RECAP" }> => event.type === "WEEKLY_RECAP" && event.programId === program.id
  );
  const recapLead = recap
    ? weeklyStories(game.state, program.id, recap.season, recap.week)
      .find((story): story is Extract<WeeklyStory, { kind: "PROGRAM_RESULT" }> => story.kind === "PROGRAM_RESULT")
    : null;
  const currentInjuryEvent = [...game.state.eventHistory].reverse().find(
    (event): event is Extract<GameEvent, { type: "PLAYER_INJURED" }> =>
      event.type === "PLAYER_INJURED"
      && game.state.players[event.playerId]?.programId === program.id
      && Boolean(currentInjury(game.state.players[event.playerId]!))
      && (event.wasStarter || event.seasonEnding || event.emergencyQuarterback)
  );
  const priorityUnresolved = priorityDecision.attention || priorityDecision.status === "PENDING";
  const unresolvedCount = briefing.length + (priorityUnresolved ? 1 : 0);
  const urgentCount = briefing.filter((item) => item.status === "REQUIRED").length
    + (priorityDecision.status === "REQUIRED" || priorityDecision.status === "BLOCKED" ? 1 : 0);

  const go = (destination: string): void => {
    if (destination === "WEEK_DECISIONS") return onNavigate("THIS_WEEK", "BUSINESS");
    if (destination === "WEEK_SCOUTING") return onNavigate("THIS_WEEK", "SCOUTING");
    if (destination === "WEEK_PRACTICE") return onNavigate("THIS_WEEK", "WEEK");
    if (destination === "WEEK_GAMEPLAN") return onNavigate("THIS_WEEK", "WEEK");
    if (destination === "DEVELOPMENT") return onNavigate("DEVELOPMENT");
    onNavigate(destination as Screen);
  };

  return <section className="dashboard-grid">
    <article className="panel hero-panel command-hero">
      <p className="eyebrow">
        {game.state.phase === "ROSTER_REVIEW" ? "Before the season" : `Week ${game.state.week}`}
      </p>
      <h2>{game.state.phase === "ROSTER_REVIEW"
        ? "Get the program ready"
        : nextGame ? `${nextGame.homeProgramId === program.id ? "Hosting" : "At"} ${opponent?.name}` : "Season's over"}</h2>
      {expectation && <p className="muted">{expectation.standing}</p>}
      <JobStanding game={game} />
      {nextGame && <p className="muted">
        {/* "You haven't scouted them at all" had no antecedent in the panel —
            a cold player had to open the schedule to learn who "them" was. */}
        {file && file.tiers.length > 0
          ? `You've got ${file.tiers.length === 3 ? "a complete file" : "a partial file"} on ${opponent?.name ?? "them"} — what it reports is about ${file.confidence}% dependable.`
          : `You haven't scouted ${opponent?.name ?? "them"} at all.`}
        {opponent ? ` They're #${opponent.nationalRank} at ${opponent.wins}–${opponent.losses}.` : ""}
      </p>}
    </article>

    <article className="panel span-two briefing-panel">
      <p className="eyebrow">What needs you this week</p>
      {unresolvedCount === 0
        ? <><h2>You're square</h2><p className="muted">Nothing is being wasted. Advance the week whenever you're ready.</p></>
        // The count used to be of the REQUIRED items alone while the list below
        // showed everything, so "2 things are costing you right now" sat on top
        // of four rows. The heading counts what is listed now, and says
        // separately how many of them are urgent.
        : <><h2>{urgentCount === 0
          ? `${unresolvedCount} thing${unresolvedCount === 1 ? "" : "s"} worth a look`
          : unresolvedCount === urgentCount
            ? `${urgentCount} thing${urgentCount === 1 ? "" : "s"} ${urgentCount === 1 ? "is" : "are"} costing you right now`
            : `${unresolvedCount} things need you — ${urgentCount} ${urgentCount === 1 ? "is" : "are"} costing you right now`}</h2>
          <div className="briefing-list">
            {priorityUnresolved && <button
              className={`briefing-item ${priorityDecision.status.toLowerCase()}`}
              onClick={() => onNavigate("THIS_WEEK", "WEEK")}>
              <span className="briefing-flag">{priorityDecision.status[0]}{priorityDecision.status.slice(1).toLowerCase()}</span>
              <strong>Weekly priorities</strong>
              <span className="briefing-detail">{priorityDecision.summary}</span>
              <span className="briefing-action">{priorityDecision.action} →</span>
            </button>}
            {briefing.map((item) =>
            <button className={`briefing-item ${item.status.toLowerCase()}`} key={item.id} onClick={() => go(item.destination)}>
              <span className="briefing-flag">{item.status === "REQUIRED" ? "Required" : "Optional"}</span>
              <strong>{item.headline}</strong>
              <span className="briefing-detail">{item.detail}</span>
              <span className="briefing-action">{item.action} →</span>
            </button>)}
          </div></>}
      {priorityDecision.status === "DONE" && <p className="decision-confirmation" aria-live="polite">
        <strong>Done ✓ · Weekly priorities</strong><span>{priorityDecision.summary}</span>
      </p>}
    </article>

    {currentInjuryEvent && (() => {
      const player = game.state.players[currentInjuryEvent.playerId]!;
      const replacement = currentInjuryEvent.replacementPlayerId
        ? game.state.players[currentInjuryEvent.replacementPlayerId]
        : null;
      const unitImpact = currentInjuryEvent.affectedUnit
        && currentInjuryEvent.unitRatingBefore !== null
        && currentInjuryEvent.unitRatingAfter !== null
        ? `${unitLabel(currentInjuryEvent.affectedUnit)} ${currentInjuryEvent.unitRatingBefore.toFixed(1)} → ${currentInjuryEvent.unitRatingAfter.toFixed(1)}`
        : null;
      return <article className="panel span-two injury-alert">
        <p className="eyebrow">{currentInjuryEvent.emergencyQuarterback ? "Emergency quarterback active" : "Lineup change"}</p>
        <h2>{player.name}: {injuryAbsence(currentInjury(player)!)}</h2>
        <p className="muted">
          {replacement
            ? `${replacement.eligibility.rosterStatus === "WALK_ON" ? "Emergency walk-on " : ""}${replacement.name} takes his place.`
            : "The next healthy player moves into the rotation."}
          {unitImpact ? ` ${unitImpact}${currentInjuryEvent.unitRatingChangePercent !== null ? ` · ${Math.abs(currentInjuryEvent.unitRatingChangePercent).toFixed(1)}% lower unit rating` : ""}.` : ""}
        </p>
        <button className="box-score-button" onClick={() => onNavigate("DEPTH_CHART")}>Adjust depth chart</button>
      </article>;
    })()}

    <article className="panel"><p className="eyebrow">The program</p>
      <h2>{compactNumber(program.fanBase)} fans · #{program.nationalRank}</h2>
      <div className="snapshot-list">
        <p><span>In the bank</span><strong>{money(program.budget)}</strong></p>
        <p><span>Prestige</span><strong>{program.prestige}/100</strong></p>
        <p><span>They're talking about you</span><strong>{program.nationalPress}/100</strong></p>
        <p><span>Starters average</span><strong>{(() => {
          const starters = startingLineup(game.state, program.id);
          const source = starters.length > 0 ? starters : roster;
          return (source.reduce((sum, player) => sum + player.overall, 0) / Math.max(source.length, 1)).toFixed(1);
        })()}</strong></p>
      </div>
    </article>

    {recap && <article className="panel recap-feature"><p className="eyebrow">Last Saturday</p>
      <h2>{recapLead ? weeklyStoryHeadline(recapLead, game) : recap.result === "BYE" ? `Week ${recap.week} bye` : `${recap.result}: ${recap.scoreFor}–${recap.scoreAgainst} points`}</h2>
      {recapLead && <p className="story-summary">{weeklyStoryBody(recapLead, game)}</p>}
      <RecapCascade recap={recap} game={game} />
      {recap.result !== "BYE" && <button className="box-score-button" onClick={() => onNavigate("THIS_WEEK", "REPORT")}>
        Open full box score
      </button>}</article>}

    <article className="panel span-two"><p className="eyebrow">Around the program</p><h2>What happened</h2>
      <EventList events={game.events.length ? game.events : game.state.eventHistory.slice(-40)} game={game} /></article>
  </section>;
}

function injuryStatus(player: Player): string {
  const injury = currentInjury(player);
  return injury
    ? `${injury.name} · ${injuryAbsence(injury)}`
    : "Healthy";
}

function injuryAbsence(injury: NonNullable<ReturnType<typeof currentInjury>>): string {
  return injury.seasonEnding
    ? "out for the season"
    : `out ${injury.weeksRemaining} game${injury.weeksRemaining === 1 ? "" : "s"}`;
}

function Roster({ game, roster }: { game: GameView; roster: Player[] }): ReactElement {
  const average = roster.reduce((sum, player) => sum + player.overall, 0) / Math.max(roster.length, 1);
  const injured = roster.filter((player) => currentInjury(player));
  const health = programStrengthCoachBenefits(game.state, game.playerProgramId);
  return <section>
    <article className="panel health-summary">
      <SectionHeading eyebrow="Team health" title={`${roster.length - injured.length} healthy · ${injured.length} injured`} detail="An injured starter is removed automatically and the next healthy player on your depth chart takes his place." />
      <div className="snapshot-list">
        <p><span>Strength coach prevention</span><strong>{health.injuryRiskReductionPercent}% lower risk per player-game</strong></p>
        <p><span>Strength coach recovery</span><strong>{health.extraRecoveryChancePercent}% chance to remove 1 extra week</strong></p>
      </div>
    </article>
    <article className="panel table-panel"><SectionHeading eyebrow="Team management" title={`${roster.length} scholarship players`} detail={`Average rating ${average.toFixed(1)} · risk assumes a normal game workload and includes fatigue plus your strength coach`} />
      <div className="data-table roster-table"><div className="data-row data-header"><span>Player</span><span>Pos</span><span>OVR</span><span>POT</span><span>Durability</span><span>Injury risk this game</span><span>Health</span><span>Fame 0&ndash;100</span><span>Personal fans</span><span>Year / status</span></div>
        {roster.map((player) => {
          const risk = playerInjuryRisk(game.state, player, 55);
          return <div className="data-row" key={player.id}><strong data-label="Player">{player.name}</strong><span data-label="Position">{player.position}</span><span data-label="Overall">{Math.round(player.overall)}</span><span data-label="Potential">{Math.round(player.potential)}</span><span data-label="Durability">{Math.round(ratingByRole(player.position, player.ratings, "DURABILITY"))}</span><span data-label="Injury risk this game">{risk.riskPercent}%<small>{risk.riskWithoutCoachPercent}% before coach · {Math.round(player.fatigue)}% fatigue</small></span><span className={currentInjury(player) ? "injured-status" : "healthy-status"} data-label="Health">{injuryStatus(player)}</span><span data-label="Fame">{player.stardom}/100</span><span data-label="Personal fans">{compactNumber(player.personalFans)}</span><span data-label="Year / status">{eligibilityClass(player)}<small>{player.eligibility.redshirtStatus === "REDSHIRTING" ? "Redshirting" : `${player.eligibility.seasonsRemaining} season${player.eligibility.seasonsRemaining === 1 ? "" : "s"} left`}</small></span></div>;
        })}
      </div>
    </article>
  </section>;
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
    const ordered = queued?.playerIds ?? game.state.depthCharts[programId]?.[position] ?? roster
      .filter((player) => player.position === position)
      .sort((left, right) => right.overall - left.overall)
      .map((player) => player.id);
    const emergency = position === "QB" ? activeEmergencyQuarterback(game.state, programId) : null;
    return emergency && !ordered.includes(emergency.id) ? [emergency.id, ...ordered] : ordered;
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
          const emergency = player.eligibility.rosterStatus === "WALK_ON";
          const redshirted = redshirtState(player);
          const injury = currentInjury(player);
          const injured = Boolean(injury);
          const availableSlot = !redshirted && !injured ? activeIndex++ : -1;
          const role = emergency ? "EMERGENCY" : redshirted ? "RS" : injured ? "OUT" : availableSlot < starterCounts[position] ? "START" : `#${availableSlot + 1}`;
          const canRedshirt = player.eligibility.redshirtStatus === "AVAILABLE" || player.eligibility.redshirtStatus === "REDSHIRTING";
          return <div className={`depth-player ${redshirted || injured ? "inactive" : ""}`} key={player.id}>
            <span><b>{role}</b> {player.name}<small>{emergency ? "Replacement-level walk-on · active until a scholarship QB returns" : injury ? `${injury.name} · ${injuryAbsence(injury)}` : `${eligibilityClass(player)} · ${player.eligibility.gamesPlayedThisSeason} GP · ${playerInjuryRisk(game.state, player, 55).riskPercent}% normal-workload injury risk`}</small></span>
            <strong>{Math.round(player.overall)}</strong>
            <div className="depth-actions"><button disabled={emergency || index === 0} onClick={() => move(position, player.id, -1)} aria-label={`Move ${player.name} up`}>↑</button><button disabled={emergency || index === players.length - 1} onClick={() => move(position, player.id, 1)} aria-label={`Move ${player.name} down`}>↓</button>
              <button className={redshirted ? "selected" : ""} disabled={emergency || !canRedshirt} onClick={() => onQueue({ type: "SET_REDSHIRT", programId, playerId: player.id, enabled: !redshirted })}>{redshirted ? "Remove RS" : "Redshirt"}</button></div>
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
  // The engine's own constants, not a copy. This screen shipped for months
  // reading 1 / 0.55 while the engine ran 1.6 / 0.28 — every projection on it
  // was wrong, and the copy below quoted the stale number too.
  const intensity = selectedTarget.type === "PLAYER" ? SPOTLIGHT_INTENSITY.PLAYER : SPOTLIGHT_INTENSITY.POSITION;
  const queueSpotlight = (value: string, focus: Exclude<DevelopmentFocus, "BALANCED">): void => {
    const [type, id] = value.split(":") as ["PLAYER" | "POSITION", string];
    onQueue({
      type: "SET_DEVELOPMENT_SPOTLIGHT",
      programId,
      focus,
      target: type === "PLAYER" ? { type, playerId: id } : { type, position: id as Position }
    });
  };
  return <section className="panel table-panel"><SectionHeading eyebrow="Player development" title="One weekly development spotlight" detail={`One player gets concentrated work at ${Math.round(SPOTLIGHT_INTENSITY.PLAYER * 100)}% of the normal rate, or a whole position room shares a session at ${Math.round(SPOTLIGHT_INTENSITY.POSITION * 100)}% each. Everyone else follows the balanced team plan automatically.`} />
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
      <article><p className="eyebrow">{selectedTarget.type === "PLAYER" ? "Concentrated work" : "Room session"}</p><h2>{Math.round(intensity * 100)}% of the normal rate · {selectedPlayers.length} player{selectedPlayers.length === 1 ? "" : "s"}</h2><p className="muted">{queued ? "This is the program's only special development investment this week." : "Choose a training focus to queue this week's spotlight."}</p></article>
    </div>
    <div className="data-table spotlight-table"><div className="data-row data-header"><span>Affected player</span><span>OVR/POT</span><span>Core ratings</span><span>Projected payoff</span></div>
      {selectedPlayers.map((player) => {
        const payoff = projectedDevelopmentPayoff(state, player, selectedFocus, intensity);
        const injury = currentInjury(player);
        const risk = playerInjuryRisk(state, player, 55, selectedFocus);
        return <div className="data-row" key={player.id}><strong>{player.name}<small>{player.position} · {injury ? `${injury.name}, out ${injury.weeksRemaining} week${injury.weeksRemaining === 1 ? "" : "s"}` : `${Math.round(player.fatigue)}% fatigue`}</small></strong><span>{Math.round(player.overall)} / {Math.round(player.potential)}</span><span><small>{attributesFor(player.position).map((attribute) =>
        `${attribute.label} ${Math.round(player.ratings[attribute.key] ?? 50)}`).join(" · ")}</small></span><span><b>{formatRatingChanges(payoff.ratingChanges)}</b><small>{signed(payoff.fatigueChange)} fatigue · {risk.riskPercent}% projected game risk ({risk.riskWithoutCoachPercent}% before coach)</small></span></div>;
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
  const [selectedGameId, setSelectedGameId] = useState<string>();
  const selectedBox = selectedGameId ? boxScore(game.state, selectedGameId) : null;
  return <section className="schedule-layout">
    {game.state.phase === "ROSTER_REVIEW" && <article className="panel marquee-planner"><p className="eyebrow">Preseason business decision</p><h2>Bring a Top-25 program to your stadium</h2>
      <p className="muted">Pay an appearance guarantee now to replace one cross-division opponent. An upset creates a major national story; a loss causes only a small recognition dip. The ranked visitor also lifts attendance, tickets, and concessions.</p>
      <p className="muted"><strong>These offers expire the moment you accept the roster</strong> — this is the only window to buy one. The guarantee comes out of your {money(program.budget)} budget on the spot.</p>
      <div className="marquee-options">{options.slice(0, 8).map((option) => {
        const opponent = game.state.programs[option.opponentProgramId]!;
        const selected = queued?.opponentProgramId === opponent.id;
        return <button className={selected ? "selected" : ""} key={opponent.id} onClick={() => onQueue({ type: "SCHEDULE_MARQUEE_HOME_GAME", programId: program.id, opponentProgramId: opponent.id })}>
          <span>#{option.rank} {opponent.name}</span><small>Week {option.week} · {money(option.guarantee)} guarantee</small>
        </button>;
      })}</div>
      {!options.length && <p className="muted">No affordable compatible Top-25 date is available.</p>}
    </article>}
    <section className="panel table-panel"><SectionHeading eyebrow="Season" title={`${game.state.season} schedule`} detail={`${program.wins} wins · ${program.losses} losses · 8 division games · 4 national matchups`} />
    <div className="data-table schedule-table"><div className="data-row data-header"><span>Week</span><span>Site</span><span>Opponent</span><span>Matchup</span><span>Status</span></div>{schedule.map((item) => {
      const home = item.homeProgramId === program.id;
      const opponent = game.state.programs[home ? item.awayProgramId : item.homeProgramId]!;
      const programScore = home ? item.homeScore : item.awayScore;
      const opponentScore = home ? item.awayScore : item.homeScore;
      return <div className={`data-row ${item.week === game.state.week ? "next-row" : ""}`} key={item.id}><strong data-label="Week">Week {item.week}</strong><span data-label="Site">{home ? "Home" : "Away"}</span><span data-label="Opponent">{opponent.nationalRank <= 25 ? `#${opponent.nationalRank} ` : ""}{opponent.name}<small>{opponent.city}, {opponent.stateCode}</small></span><span data-label="Matchup">{item.matchupType === "DIVISION" ? "Division" : item.matchupType === "MARQUEE" ? `Marquee · ${money(item.guaranteePaid)}` : "Cross-division"}</span><span data-label="Status">{item.played
        ? <><b>{Number(programScore) > Number(opponentScore) ? "W" : "L"} {programScore}–{opponentScore} points</b><button className="inline-link" onClick={() => setSelectedGameId(item.id)}>View box score</button></>
        : item.week === game.state.week ? "Next" : "Scheduled"}</span></div>;
    })}</div></section>
    {selectedBox && <BoxScorePanel box={selectedBox} programId={game.playerProgramId} />}
  </section>;
}

function WeeklyRecaps({ game }: { game: GameView }): ReactElement {
  const recaps = [...game.state.eventHistory]
    .filter((event): event is Extract<GameEvent, { type: "WEEKLY_RECAP" }> => event.type === "WEEKLY_RECAP" && event.programId === game.playerProgramId)
    .reverse();
  return <section><SectionHeading eyebrow="Cause and effect" title="Weekly program recaps" detail="Team results and individual performances grow separate audiences that flow into attendance, game-day sales, media reach, and the budget." />
    {recaps.length ? <div className="recap-grid">{recaps.map((recap) => <article className="panel recap-card" key={`${recap.season}-${recap.week}`}>
      <div className="recap-heading"><div><p className="eyebrow">Season {recap.season} · Week {recap.week}</p><h2>The week in review</h2></div><strong className={recap.result.toLowerCase()}>{recap.result}</strong></div>
      <WeeklyStoryPackage stories={weeklyStories(game.state, game.playerProgramId, recap.season, recap.week)} game={game} />
      <RecapCascade recap={recap} game={game} />
    </article>)}</div> : <article className="panel"><p className="muted">Advance the first week to generate the first connected recap.</p></article>}
  </section>;
}

function storyProgram(game: GameView, programId: ProgramId, rank: number | null = null): string {
  const program = game.state.programs[programId];
  if (!program) return "Unknown program";
  return `${rank !== null && rank <= 25 ? `#${rank} ` : ""}${program.name}`;
}

function weeklyStoryHeadline(story: WeeklyStory, game: GameView): string {
  if (story.kind === "PROGRAM_RESULT") {
    const program = storyProgram(game, story.programId);
    const opponent = story.opponentProgramId ? storyProgram(game, story.opponentProgramId, story.opponentRank) : null;
    if (story.result === "BYE") return `${program} catches its breath and keeps building`;
    const margin = Math.abs((story.scoreFor ?? 0) - (story.scoreAgainst ?? 0));
    if (story.result === "WIN" && story.opponentRank !== null && story.opponentRank <= 25) {
      return `${program} takes down ${opponent}`;
    }
    if (story.result === "WIN" && story.marqueeGame) return `${program} turns the marquee gamble into a breakthrough`;
    if (story.result === "WIN" && margin >= 21) return `${program} leaves no doubt against ${opponent}`;
    if (story.result === "WIN" && margin <= 7) return `${program} survives ${opponent} in a one-score finish`;
    if (story.result === "WIN") return `${program} beats ${opponent} and keeps building`;
    if (story.opponentRank !== null && story.opponentRank <= 25 && margin <= 7) {
      return `${program} pushes ${opponent} to the edge`;
    }
    if (margin <= 7) return `${program} comes up one score short against ${opponent}`;
    if (margin >= 21) return `${program} has answers to find after the ${opponent} loss`;
    return `${program} falls to ${opponent}`;
  }
  if (story.kind === "NATIONAL_RESULT") {
    const winner = storyProgram(game, story.winnerProgramId, story.winnerRank);
    const loser = storyProgram(game, story.loserProgramId, story.loserRank);
    if (story.angle === "UPSET") return `${winner} sends a shock through the rankings`;
    if (story.angle === "THRILLER") return `${winner} escapes ${loser} in the game of the week`;
    if (story.angle === "RANKED_STATEMENT") return `${winner} makes a statement against ${loser}`;
    if (story.angle === "SHOOTOUT") return `${winner} outlasts ${loser} in a shootout`;
    return `${winner} handles ${loser} on the national stage`;
  }
  if (story.kind === "PLAYER_SPOTLIGHT") {
    const player = game.state.players[story.playerId];
    return `${player?.name ?? "A Saturday star"} owns the spotlight for ${storyProgram(game, story.programId)}`;
  }
  if (story.kind === "PROGRAM_HEALTH") {
    const player = game.state.players[story.playerId]?.name ?? "A key player";
    const replacement = story.replacementPlayerId ? game.state.players[story.replacementPlayerId]?.name : null;
    if (story.angle === "EMERGENCY_QB") return `${game.state.programs[story.programId]?.name} turns to an emergency quarterback`;
    if (story.angle === "KEY_RETURN") return `${player} returns to the starting lineup`;
    if (story.angle === "MAJOR_INJURY") return `${player} is lost for the season`;
    return `${player} goes down; ${replacement ?? "the next man"} steps in`;
  }
  const program = storyProgram(game, story.programId);
  if (story.angle === "SPONSOR_BONUS") return `${program} delivers for ${story.sponsorName ?? "its sponsor"}`;
  if (story.angle === "PACKED_HOUSE") return `${program} turns home Saturday into a packed-house payday`;
  if (story.angle === "FAN_SURGE") return `${program} converts the weekend into a wave of new fans`;
  return `${program} finishes a major week in the black`;
}

function weeklyStoryBody(story: WeeklyStory, game: GameView): string {
  if (story.kind === "PROGRAM_RESULT") {
    if (story.result === "BYE") {
      return `There was no game, but the program still moved ${signedNumber(story.fanChange)} fans and finished the week ${signedMoney(story.weeklyNet)}.`;
    }
    const featured = story.featuredPlayerId ? game.state.players[story.featuredPlayerId] : null;
    const performance = featured && story.featuredPlayerSummary
      ? ` ${featured.name} led the story: ${story.featuredPlayerSummary}.`
      : "";
    const press = story.nationalPressChange !== 0
      ? `${signedNumber(story.nationalPressChange)} national press points`
      : `${signedNumber(story.localPressChange)} local press points`;
    return `${story.scoreFor}–${story.scoreAgainst}.${performance} The result moved ${signedNumber(story.fanChange)} school fans, ${press}, and left ${signedMoney(story.weeklyNet)} after expenses.`;
  }
  if (story.kind === "NATIONAL_RESULT") {
    const winner = storyProgram(game, story.winnerProgramId, story.winnerRank);
    const loser = storyProgram(game, story.loserProgramId, story.loserRank);
    if (story.angle === "UPSET") {
      return `${winner} beat ${loser}, ${story.winnerScore}–${story.loserScore}, putting a ranked contender's season under immediate pressure.`;
    }
    return `${winner} beat ${loser}, ${story.winnerScore}–${story.loserScore}. This was the most consequential result elsewhere in the league.`;
  }
  if (story.kind === "PLAYER_SPOTLIGHT") {
    const player = game.state.players[story.playerId];
    const opponent = story.opponentProgramId ? game.state.programs[story.opponentProgramId] : null;
    return `${player?.name ?? "The standout"} posted a ${story.gameRating}/99 game rating${opponent ? ` against ${opponent.name}` : ""}: ${story.performanceSummary}. That performance added ${signedNumber(story.personalFanChange)} personal fans and ${signedNumber(story.schoolFanLift)} fans to the program.`;
  }
  if (story.kind === "PROGRAM_HEALTH") {
    const player = game.state.players[story.playerId]?.name ?? "The injured player";
    if (story.angle === "KEY_RETURN") {
      return `${player} completed his recovery from a ${story.injuryName.toLowerCase()} and reclaimed a starting job.`;
    }
    const replacement = story.replacementPlayerId
      ? game.state.players[story.replacementPlayerId]?.name ?? "the next player on the depth chart"
      : "the next player on the depth chart";
    const unit = story.affectedUnit ? unitLabel(story.affectedUnit).toLowerCase() : "the affected unit";
    const impact = story.unitRatingBefore !== null && story.unitRatingAfter !== null
      ? ` ${unitLabel(story.affectedUnit!)} falls from ${story.unitRatingBefore.toFixed(1)} to ${story.unitRatingAfter.toFixed(1)}${story.unitRatingChangePercent !== null ? `, a ${Math.abs(story.unitRatingChangePercent).toFixed(1)}% drop in the unit rating` : ""}.`
      : "";
    if (story.angle === "EMERGENCY_QB") {
      return `Every scholarship quarterback is unavailable. Emergency walk-on ${replacement} will start and remain active until a rostered quarterback returns.${impact}`;
    }
    return `${player} suffered a ${story.injuryName.toLowerCase()} and is ${story.seasonEnding || story.week >= 14 ? "out for the remainder of the season" : `expected to miss ${story.weeks} game${story.weeks === 1 ? "" : "s"}`}. ${replacement} moves into the rotation, affecting ${unit}.${impact}`;
  }
  if (story.angle === "SPONSOR_BONUS") {
    return `${story.sponsorName ?? "The sponsor"} paid ${money(story.sponsorBonus)} above its guarantee after the contract trigger hit. The program finished the week ${signedMoney(story.weeklyNet)}.`;
  }
  if (story.angle === "PACKED_HOUSE") {
    return `${compactNumber(story.attendance)} people filled ${Math.round(story.attendance / Math.max(1, story.capacity) * 100)}% of the stadium. The crowd helped turn the week into ${signedMoney(story.weeklyNet)}.`;
  }
  if (story.angle === "FAN_SURGE") {
    return `${signedNumber(story.fanChange)} fans joined the program after one weekend, expanding the audience that drives future tickets and sponsorship value.`;
  }
  return `The program cleared ${signedMoney(story.weeklyNet)} after weekly expenses, creating more room to invest in staff and facilities.`;
}

function WeeklyStoryPackage({ stories, game }: { stories: WeeklyStory[]; game: GameView }): ReactElement | null {
  const lead = stories.find((story) => story.kind === "PROGRAM_RESULT");
  const briefs = stories.filter((story) => story !== lead);
  if (!lead && briefs.length === 0) return null;
  return <div className="story-package">
    {lead && <article className="story-lead">
      <p className="eyebrow">Program lead</p>
      <h3>{weeklyStoryHeadline(lead, game)}</h3>
      <p>{weeklyStoryBody(lead, game)}</p>
    </article>}
    {briefs.length > 0 && <div className="story-briefs">{briefs.map((story) =>
      <article className={`story-brief ${story.kind.toLowerCase()}`} key={story.id}>
        <p className="eyebrow">{story.kind === "NATIONAL_RESULT" ? "Around the nation" : story.kind === "PLAYER_SPOTLIGHT" ? "Saturday star" : story.kind === "PROGRAM_HEALTH" ? "Team health" : "Program business"}</p>
        <h3>{weeklyStoryHeadline(story, game)}</h3>
        <p>{weeklyStoryBody(story, game)}</p>
      </article>)}</div>}
  </div>;
}

function RecapCascade({ recap, game }: { recap: Extract<GameEvent, { type: "WEEKLY_RECAP" }>; game: GameView }): ReactElement {
  const opponent = recap.opponentProgramId ? game.state.programs[recap.opponentProgramId] : null;
  const featured = recap.featuredPlayerId ? game.state.players[recap.featuredPlayerId] : null;
  return <div className="recap-cascade">
    <p><span>Result</span><strong>{opponent ? `${recap.homeGame ? "vs." : "at"} ${recap.opponentRank && recap.opponentRank <= 25 ? `#${recap.opponentRank} ` : ""}${opponent.name}` : "No game"}</strong></p>
    <p><span>Fans from team result</span><strong>{signedNumber(recap.teamResultFanChange)} fans</strong></p>
    <p><span>Fans from player brands</span><strong>{signedNumber(recap.playerFanLift)} fans</strong></p>
    <p><span>Total school fan change</span><strong>{signedNumber(recap.fanChange)} fans → {compactNumber(recap.fansAfter)} fans</strong></p>
    <p><span>Featured player game rating</span><strong>{featured ? `${featured.name} · ${recap.featuredPlayerRating ?? "—"}/99` : "No game standout"}</strong></p>
    <p><span>Stadium attendance</span><strong>{recap.homeGame ? `${compactNumber(recap.attendance)} people / ${compactNumber(recap.capacity)} seats` : "Away / bye"}</strong></p>
    <p><span>Ticket revenue</span><strong>{money(recap.ticketRevenue)}</strong></p>
    <p><span>Concession revenue</span><strong>{money(recap.concessionRevenue)}</strong></p>
    <p><span>Sponsorship revenue</span><strong>{money(recap.sponsorshipRevenue)}</strong></p>
    <p><span>Local press change</span><strong>{signedNumber(recap.localPressChange)} points</strong></p>
    <p><span>National press change</span><strong>{signedNumber(recap.nationalPressChange)} points</strong></p>
    <p><span>Weekly net income</span><strong>{signedMoney(recap.weeklyNet)}</strong></p>
    {recap.marqueeGame && <p className="marquee-note"><span>Marquee payoff</span><strong>{recap.result === "WIN" ? "National breakthrough" : "Small recognition dip"} · guarantee {money(recap.guaranteePaid)}</strong></p>}
  </div>;
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

  const allocatable = staff.filter((member) => member.role !== "STRENGTH_COACH");
  const totalHours = allocatable.reduce((sum, member) => sum + staffCapacity(member.rating, member.trait), 0);
  const capacity = focusCapacity(game.state, programId);
  const chosen = activeFocuses(game.state, programId);

  return <section className="screen staff-screen">
    <article className="panel">
      <p className="eyebrow">Coaching staff · {money(staff.reduce((sum, member) => sum + member.salary, 0))} a year</p>
      <h2>{totalHours} coaching hours a week · {capacity.capacity} priorit{capacity.capacity === 1 ? "y" : "ies"}</h2>
      <p className="muted">
        You do not divide these hours by hand — they follow from what you tell the staff to chase on your week
        screen. What a hire changes is how far those hours go, and <strong>how many things you can chase at
        once</strong>. {capacity.note}
      </p>
      <p className="muted">
        This week: <strong>{chosen.length > 0 ? chosen.map((focus) => WEEK_FOCUS_LABELS[focus]).join(" · ") : "nothing chosen"}</strong>.
        Coordinators always owe their own side of the ball a third of their week; the rest of the staff's time follows
        the priorities.
      </p>
    </article>

    {staff.map((member) => {
      const hours = staffCapacity(member.rating, member.trait);
      const allocation = member.allocation;
      const isStrengthCoach = member.role === "STRENGTH_COACH";
      const queuedReplacement = pending.find((item): item is Extract<GameCommand, { type: "REPLACE_STAFF" }> =>
        item.type === "REPLACE_STAFF" && item.staffId === member.id);
      const candidates = openMarket === member.id ? staffCandidatesFor(game.state, programId, member.id) : [];
      const options = coachOptions({
        member, candidates, identity: program.schemeIdentity, budget: program.budget,
        onHire: (candidateId) => {
          onQueue({ type: "REPLACE_STAFF", programId, staffId: member.id, candidateId });
          setOpenMarket(undefined);
        }
      });
      return <article className="panel staff-card" key={member.id}>
        <div className="staff-head">
          <div>
            <p className="eyebrow">{label(member.role)}</p>
            <h2>{member.name}</h2>
            <p className="muted">{STAFF_TRAITS[member.trait].label} · {member.rating} rated · {money(member.salary)} a year</p>
          </div>
          <button className="replace-button" onClick={() => setOpenMarket(openMarket === member.id ? undefined : member.id)}>
            {openMarket === member.id ? "Close" : "Replace"}
          </button>
        </div>
        <div className="snapshot-list">{staffCard(game.state, programId, member.id).map((modifier) =>
          <p key={modifier.label}><span>{modifier.label}</span><strong>{modifier.value}</strong></p>)}
        </div>
        {isStrengthCoach
          ? <p className="eyebrow">Automatic weekly work · salary buys health, not hours</p>
          : <p className="eyebrow">His {hours}-hour week, as the priorities have set it</p>}
        {!isStrengthCoach && STAFF_FOCUSES.filter((focus) => focus !== "RECOVER").map((focus) =>
          <div className="allocation-row read-only" key={focus}>
            <p className="plan-label">
              {STAFF_FOCUS_LABELS[focus]}<span className="hours">{allocation[focus] ?? 0}h</span>
            </p>
            <div className="allocation-bar">
              <span style={{ width: `${(allocation[focus] ?? 0) / Math.max(1, hours) * 100}%` }} />
            </div>
            <p className="muted">{staffFocusPayoff(member, focus)}</p>
          </div>)}
        {queuedReplacement && <p className="attention">Hire is queued — it goes through when you advance the week.</p>}
        {candidates.length > 0 && <div className="coach-list">{options.map((option) =>
          <CoachOption busy={false} key={option.key} option={option} />)}
        </div>}
      </article>;
    })}
  </section>;
}

function Finances({ game, pending, onQueue }: { game: GameView; pending: GameCommand[]; onQueue: (command: GameCommand) => void }): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const staffPayroll = Object.values(game.state.staff).filter((staff) => staff.programId === program.id).reduce((sum, staff) => sum + staff.salary, 0);
  const sponsorship = game.state.sponsorships?.[program.id];
  const activeSponsor = activeSponsorship(game.state, program.id);
  const queuedSponsor = pending.find((command): command is Extract<GameCommand, { type: "ACCEPT_SPONSORSHIP" }> =>
    command.type === "ACCEPT_SPONSORSHIP");
  const sponsorshipRevenue = game.state.eventHistory
    .filter((event): event is Extract<GameEvent, { type: "SPONSORSHIP_PAYMENT" }> =>
      event.type === "SPONSORSHIP_PAYMENT"
      && event.programId === program.id
      && event.season === game.state.season)
    .reduce((total, event) => total + event.total, 0);
  const lastFinances = [...game.state.eventHistory].reverse().find(
    (event): event is Extract<GameEvent, { type: "WEEKLY_FINANCES" }> =>
      event.type === "WEEKLY_FINANCES" && event.programId === program.id
  );
  const marketValue = sponsorshipMarketValue(program);
  const strategyName = (strategy: "GUARANTEED" | "HOME_CROWD" | "WINNING"): string =>
    strategy === "GUARANTEED" ? "Guaranteed partner" : strategy === "HOME_CROWD" ? "Game-day partner" : "Performance partner";
  const contractTrigger = (offer: NonNullable<typeof sponsorship>["offers"][number]): string => {
    if (offer.strategy === "HOME_CROWD") {
      return `${money(offer.homeAttendanceBonus)} whenever a home crowd fills at least ${Math.round((offer.homeAttendanceTarget ?? 0) * 100)}% of the stadium`;
    }
    if (offer.strategy === "WINNING") {
      return `${money(offer.winBonus)} for every win, plus another ${money(offer.rankedWinBonus)} when that win is against a top-25 team`;
    }
    return "No conditions. The full amount is guaranteed, including bye weeks";
  };
  return <section className="finance-layout">
    {/* Read back what the engine actually charged rather than recomputing it:
        the operating cost is a share of total revenue, and the UI does not know
        the gate until the week has resolved. A posted number that guesses at an
        engine input is the drift this codebase keeps finding. */}
    <article className="panel"><p className="eyebrow">Athletic department</p><h2>Operating position</h2><div className="snapshot-list"><p><span>Available budget</span><strong>{money(program.budget)}</strong></p><p><span>Weekly media rights</span><strong>{money(mediaRights(program).total)}</strong></p><p><span>Sponsorship earned this season</span><strong>{money(sponsorshipRevenue)}</strong></p><p><span>Last week&rsquo;s revenue</span><strong>{lastFinances ? money(lastFinances.revenue) : "—"}</strong></p><p><span>Last week&rsquo;s costs</span><strong>{lastFinances ? money(lastFinances.expenses) : "—"}</strong></p><p><span>Annual staff payroll</span><strong>{money(staffPayroll)}</strong></p></div></article>

    {/* The cost side used to be a single number, against a revenue side broken
        down to the sponsor's own arithmetic. Five of these six are things the
        player can act on — hire, build, price, sign — and showing them as one
        total is why a cold player never bought a facility: "$49K a week
        forever" had nothing to sit against. Read back off the event, so the
        panel states what was charged rather than a recomputed guess at it. */}
    {lastFinances && <article className="panel"><p className="eyebrow">Where last week went</p><h2>{money(lastFinances.expenses)} of costs</h2>
      <div className="snapshot-list">
        <p><span>Scholarships &mdash; {program.scholarshipLimit} at ${SQUAD_COST_PER_SCHOLARSHIP.toLocaleString()} a week</span><strong>{money(lastFinances.squadCost)}</strong></p>
        <p><span>Facilities upkeep</span><strong>{money(lastFinances.facilitiesCost)}</strong></p>
        <p><span>Stadium overheads &mdash; {compactNumber(stadiumCapacity(program.facilities.STADIUM))} seats</span><strong>{money(lastFinances.stadiumCost)}</strong></p>
        <p><span>Running the department &mdash; {Math.round(OPERATING_SHARE * 100)}% of revenue</span><strong>{money(lastFinances.operationsCost)}</strong></p>
        <p><span>Coaching salaries</span><strong>{money(lastFinances.staffPayroll)}</strong></p>
        <p><span>NIL commitments</span><strong>{money(lastFinances.nilSpend)}</strong></p>
        {lastFinances.advertisingSpend > 0 && <p><span>Marketing</span><strong>{money(lastFinances.advertisingSpend)}</strong></p>}
        <p><span>Against {money(lastFinances.revenue)} of revenue</span><strong>{lastFinances.net >= 0 ? `+${money(lastFinances.net)}` : `−${money(Math.abs(lastFinances.net))}`}</strong></p>
      </div>
      <p className="muted">Everything the program has built costs something to keep running. Facilities and the squad are charged every week whether you play or not.</p>
    </article>}
    <article className="panel"><p className="eyebrow">Sponsor market</p><h2>{money(marketValue)} of weekly reach</h2><p className="muted">Sponsors value the audience and recognition the program has already built. These four inputs set this season's offers.</p><div className="snapshot-list"><p><span>{compactNumber(program.fanBase)} fans × $1.25</span><strong>{money(program.fanBase * 1.25)}</strong></p><p><span>{program.nationalPress} national press points × $900</span><strong>{money(program.nationalPress * 900)}</strong></p><p><span>{program.prestige} prestige points × $400</span><strong>{money(program.prestige * 400)}</strong></p><p><span>{program.championships} titles × $15,000</span><strong>{money(program.championships * 15_000)}</strong></p></div></article>
    {activeSponsor ? <article className="panel sponsor-active span-two">
      <p className="eyebrow">Primary sponsor · signed through Season {game.state.season}</p>
      <h2>{activeSponsor.sponsorName}</h2>
      <p className="muted">{strategyName(activeSponsor.strategy)}. This contract cannot be replaced until next season.</p>
      <div className="choice-compare">
        <p><span>Guaranteed every week</span><strong>{money(activeSponsor.weeklyPayment)}</strong></p>
        <p><span>Bonus trigger</span><strong>{contractTrigger(activeSponsor)}</strong></p>
        <p><span>Earned so far</span><strong>{money(sponsorshipRevenue)}</strong></p>
      </div>
    </article> : <div className="sponsor-offers span-two">
      <div className="sponsor-intro">
        <p className="eyebrow">Primary sponsorship · choose one for Season {game.state.season}</p>
        <h2>How much revenue do you want to put at risk?</h2>
        <p className="muted">Each contract lasts through Week 14. The guarantee is paid every week; bonuses are added only when the stated trigger happens.</p>
      </div>
      <div className="sponsor-grid">{(sponsorship?.offers ?? []).map((offer) => {
        const projection = projectSponsorshipOffer(game.state, program.id, offer);
        const queued = queuedSponsor?.offerId === offer.id;
        return <article className="panel business-decision sponsor-card" key={offer.id}>
          <p className="eyebrow">{strategyName(offer.strategy)}</p>
          <h2>{offer.sponsorName}</h2>
          <p className="muted">{contractTrigger(offer)}.</p>
          <div className="choice-compare">
            <p><span>Guaranteed every week</span><strong>{money(offer.weeklyPayment)}</strong></p>
            <p><span>Guaranteed remaining</span><strong>{money(projection.guaranteedRemaining)} over {projection.remainingWeeks} weeks</strong></p>
            <p><span>Bonuses still available</span><strong>{money(projection.maximumBonusRemaining)}</strong></p>
            <p><span>Maximum remaining value</span><strong>{money(projection.maximumRemaining)}</strong></p>
          </div>
          <button disabled={Boolean(queuedSponsor)} onClick={() => onQueue({ type: "ACCEPT_SPONSORSHIP", programId: program.id, offerId: offer.id })}>
            {queued ? "Contract queued" : queuedSponsor ? "Another contract queued" : `Sign with ${offer.sponsorName}`}
          </button>
        </article>;
      })}</div>
    </div>}
    <div className="facility-grid span-two">{facilities.map((facility) => {
      const level = program.facilities[facility];
      const queued = pending.some((item) => item.type === "UPGRADE_FACILITY" && item.facility === facility);
      const cost = level >= 5 ? null : [0, 350_000, 750_000, 1_500_000, 3_000_000][level];
      return <article className="panel business-decision" key={facility}><p className="eyebrow">{label(facility)}</p><h2>Level {level}/5</h2><div className="level-track"><span style={{ width: `${level * 20}%` }} /></div><p className="muted">{facilityBenefit(facility)}</p>
        <div className="choice-compare"><p><span>Current payoff</span><strong>{facilityPayoff(facility, level)}</strong></p><p><span>After upgrade</span><strong>{level >= 5 ? "Maximum reached" : facilityPayoff(facility, level + 1)}</strong></p>{cost && <p><span>Decision cost</span><strong>{money(cost)} now</strong></p>}{level < 5 && <p><span>Adds to every week</span><strong>{money(facilityUpkeepIncrease(level))} forever</strong></p>}</div>
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
    .filter((prospect) => prospect && (
      prospect.status === "AVAILABLE"
      || prospect.signedProgramId === program.id
      // A verbal commitment elsewhere is still a flip target up to the signing week.
      || (prospect.status === "COMMITTED" && game.state.week < SIGNING_WEEK)
    ))
    .sort((left, right) => {
      const leftReport = prospectScoutingReport(game.state, program.id, left!);
      const rightReport = prospectScoutingReport(game.state, program.id, right!);
      const leftMine = left!.signedProgramId === program.id ? 1 : 0;
      const rightMine = right!.signedProgramId === program.id ? 1 : 0;
      return rightMine - leftMine
        || rightReport.pursuitPoints - leftReport.pursuitPoints
        || left!.name.localeCompare(right!.name);
    });
  const commitments = Object.values(game.state.prospects).filter((prospect) =>
    (prospect.status === "COMMITTED" || prospect.status === "SIGNED") && prospect.signedProgramId === program.id
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
        <p className="muted">Points bank from week to week and pay for searches, evaluations, and pursuit. NIL money is separate: weekly dollars from your donors, capped by how much they love this program — not by your budget.</p></div>
      <div className="recruiting-metrics">
        <Metric label="Weekly production" value={`+${recruiting.weeklyPoints} points`} />
        <Metric label="Projected openings" value={String(incomingOpenings)} />
        <Metric label="Committed" value={String(commitments.length)} />
        <Metric label="On your board" value={String(prospects.length)} />
        <Metric label="Donor NIL ceiling" value={`${money(weeklyDonorCapacity(program))} a week`} />
        <Metric label="Promised to signees" value={`${money(committedNilTotal(game.state, program.id))} a week`} />
        <Metric label="Reserved by offers" value={`${money(reservedNilTotal(game.state, program.id))} a week`} />
        <Metric label="Free to offer" value={`${money(Math.max(0, freeNilCapacity(game.state, program.id)))} a week`} />
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
        const queuedOffer = pending.find((command): command is Extract<GameCommand, { type: "OFFER_PROSPECT" }> =>
          command.type === "OFFER_PROSPECT" && command.prospectId === prospect!.id
        );
        const currentlyOffered = recruiting.offeredProspectIds.includes(prospect!.id);
        const offered = queuedOffer ? queuedOffer.extend : currentlyOffered;
        const isMine = prospect!.signedProgramId === program.id;
        const committedElsewhere = prospect!.status === "COMMITTED" && !isMine;
        // Verbal until the signing week — still a flip target for a rival,
        // still worth defending for the incumbent. Locked means the actions
        // are gone for good.
        const locked = prospect!.status === "SIGNED" || prospect!.status === "ENROLLED";
        const badge = locked ? "SIGNED"
          : prospect!.status === "COMMITTED" ? (isMine ? "YOUR COMMIT" : `FLIP TARGET (${game.state.programs[prospect!.signedProgramId!]?.abbreviation ?? "?"})`)
          : report.pursuitPoints ? `${report.pursuitPoints} PTS` : "NEW";
        return <article className={`panel prospect-card ${locked ? "committed" : ""}`} key={prospect!.id}>
          <header><div><p className="eyebrow">{prospect!.reputation} · {prospect!.homeStateCode}</p><h2>{prospect!.name}</h2><p>{prospect!.position} · Scouted {report.scoutingPercent}%</p></div><strong>{badge}</strong></header>
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
          {committedElsewhere && <p className="muted">Verbally committed elsewhere — still contestable until the signing week.</p>}
          {!locked && <><div className="offer-actions">
            <span>{offered ? "Scholarship offered" : "No offer extended"}</span>
            <button
              disabled={!offered && incomingOpenings <= 0}
              onClick={() => onQueue({ type: "OFFER_PROSPECT", programId: program.id, prospectId: prospect!.id, extend: !offered })}
            >
              {offered ? "Rescind offer" : "Offer scholarship"}
            </button>
          </div>
          <div className="evaluation-actions">{recruitingEvaluations.map((evaluation) => {
            const complete = game.state.recruiting[program.id]!.scoutingByProspect[prospect!.id]!.evaluations.includes(evaluation);
            const queued = pendingEvaluations.includes(evaluation);
            const cost = recruitingEvaluationCost(evaluation);
            return <button disabled={complete || queued || pointsAvailable < cost} key={evaluation} onClick={() => onQueue({ type: "EVALUATE_PROSPECT", programId: program.id, prospectId: prospect!.id, evaluation })}>
              {complete ? `${label(evaluation)} ✓` : queued ? `${label(evaluation)} queued` : `${label(evaluation)} · ${cost}`}
            </button>;
          })}</div>
          <div className="pursuit-actions"><span>{!offered ? "Offer him first" : incomingOpenings > 0 ? "Entice him to join" : "Incoming class full"}</span>{[5, 10, 20].map((points) => <button disabled={!offered || incomingOpenings <= 0 || pointsAvailable < points} key={points} onClick={() => onQueue({ type: "INVEST_RECRUITING_POINTS", programId: program.id, prospectId: prospect!.id, points })}>+{points}</button>)}{queuedInvestment && <strong>+{queuedInvestment.points} queued</strong>}</div>
          {(() => {
            const visitsUsed = game.state.recruiting[program.id]!.scoutingByProspect[prospect!.id]?.visitsUsed ?? 0;
            const visitsRemaining = MAX_VISITS_PER_SEASON - recruiting.visitsUsedThisSeason;
            const queuedVisit = pending.some((command) => command.type === "SCHEDULE_VISIT" && command.prospectId === prospect!.id);
            const preview = report.fitScore !== null ? visitScore(report.fitScore, visitsUsed) : null;
            return <div className="visit-actions">
              <span>{!offered ? "Offer him first" : visitsRemaining <= 0 ? "No visit weekends left this season" : `Worth this program's season: ${visitsRemaining}/${MAX_VISITS_PER_SEASON} left`}</span>
              <button
                disabled={!offered || visitsRemaining <= 0 || pointsAvailable < VISIT_COST || queuedVisit}
                onClick={() => onQueue({ type: "SCHEDULE_VISIT", programId: program.id, prospectId: prospect!.id })}
              >
                {queuedVisit ? "Visit queued" : `Schedule a visit · ${VISIT_COST} pts${preview !== null ? ` · worth +${preview.toFixed(1)}` : ""}`}
              </button>
            </div>;
          })()}
          <NilOfferControl game={game} prospect={prospect!} pending={pending} onQueue={onQueue} disabled={incomingOpenings <= 0} /></>}
          {isMine && (game.state.nil?.[program.id]?.commitmentsByPlayer[prospect!.id] ?? 0) > 0 &&
            <p className="muted">NIL deal: {money(game.state.nil![program.id]!.commitmentsByPlayer[prospect!.id]!)} a week, charged until he leaves the program.</p>}
        </article>;
      })}</div>}
  </section>;
}

/**
 * The NIL offer on one recruit: a weekly dollar slider against the donor
 * ceiling, with his asking price beside it. The percentage is explicitly the
 * share of what money can buy with him — never his odds of committing, which
 * depend on everything else on this card too.
 */
function NilOfferControl({ game, prospect, pending, onQueue, disabled }: {
  game: GameView;
  prospect: Prospect;
  pending: GameCommand[];
  onQueue: (command: GameCommand) => void;
  disabled: boolean;
}): ReactElement | null {
  const program = game.state.programs[game.playerProgramId]!;
  const scouting = game.state.recruiting[program.id]?.scoutingByProspect[prospect.id];
  const evaluationCount = scouting?.evaluations.length ?? 0;
  const currentOffer = game.state.nil?.[program.id]?.offersByProspect[prospect.id] ?? 0;
  const queued = pending.find((command): command is Extract<GameCommand, { type: "SET_NIL_OFFER" }> =>
    command.type === "SET_NIL_OFFER" && command.prospectId === prospect.id);
  const [amount, setAmount] = useState(queued?.weeklyAmount ?? currentOffer);
  // Other cards' queued raises also reserve capacity before the engine sees them.
  const queuedElsewhere = pending
    .filter((command): command is Extract<GameCommand, { type: "SET_NIL_OFFER" }> =>
      command.type === "SET_NIL_OFFER" && command.prospectId !== prospect.id)
    .reduce((sum, command) => sum + Math.max(0, command.weeklyAmount - (game.state.nil?.[program.id]?.offersByProspect[command.prospectId] ?? 0)), 0);
  const free = Math.max(0, freeNilCapacity(game.state, program.id) - queuedElsewhere);
  const maximum = currentOffer + free;
  if (evaluationCount === 0) {
    return <div className="nil-offer"><span>NIL money</span><p className="muted">Evaluate him at least once to learn what he wants and put money on the table.</p></div>;
  }
  const ask = nilAskingPriceRange(prospect, evaluationCount, program);
  const askMidpoint = (ask.low + ask.high) / 2;
  const shareOfCeiling = amount > 0 ? Math.round((1 - Math.exp(-amount / Math.max(1, askMidpoint))) * 100) : 0;
  return <div className="nil-offer">
    <span>NIL money</span>
    <p>Wants {ask.exact ? `${money(ask.low)} a week` : `${money(ask.low)}–${money(ask.high)} a week (scout him again for the exact figure)`}</p>
    <div className="nil-offer-row">
      <input type="range" min={0} max={Math.max(maximum, currentOffer)} step={50} value={Math.min(amount, Math.max(maximum, currentOffer))}
        disabled={disabled || maximum <= 0} onChange={(event) => setAmount(Number(event.target.value))} />
      <strong>{money(amount)} a week</strong>
    </div>
    <p className="muted">{amount > 0 ? `Buys ${shareOfCeiling}% of what money can get you with him — his priorities and your program still decide the rest.` : maximum <= 0 ? "Your donors are fully committed. Capacity comes from fans, support, prestige, and titles." : "Money helps most with recruits chasing stardom, least with ones choosing home or the classroom."}</p>
    {amount !== (queued?.weeklyAmount ?? currentOffer) &&
      <button disabled={disabled} onClick={() => onQueue({ type: "SET_NIL_OFFER", programId: program.id, prospectId: prospect.id, weeklyAmount: amount })}>
        {amount === 0 ? "Withdraw the offer (he'll remember)" : `Offer ${money(amount)} a week`}
      </button>}
    {queued && <strong>{money(queued.weeklyAmount)} a week queued</strong>}
    {!queued && currentOffer > 0 && amount === currentOffer && <strong>{money(currentOffer)} a week on the table</strong>}
  </div>;
}

function Inbox({ game }: { game: GameView }): ReactElement {
  const events = game.state.eventHistory.filter((event) => event.type !== "PLAYER_DEVELOPED").slice(-500);
  return <section className="panel"><p className="eyebrow">Program inbox</p><h2>Decisions, results, and reports</h2>{events.length ? <EventList events={events} game={game} /> : <p className="muted">Your inbox is clear. Begin the season to receive weekly reports.</p>}</section>;
}

/**
 * Bookkeeping the engine has to emit but nobody wants to read. The inbox showed
 * nine consecutive "Prep Points Added" entries, which is not news — it is the
 * simulation talking to itself in front of the player.
 */
const INBOX_NOISE: ReadonlySet<GameEvent["type"]> = new Set([
  "PLAYER_DEVELOPED", "PREP_POINTS_ADDED", "RECRUITING_POINTS_ADDED", "STAFF_ALLOCATION_SET",
  "SCOUTING_ALLOCATED", "PRACTICE_REPS_SET", "TICKET_PRICE_SET", "ADVERTISING_SET",
  "SPONSORSHIP_PAYMENT",
  "GAME_PLAN_SET", "SCHEME_SET", "DEVELOPMENT_SPOTLIGHT_SET", "PLAYER_MEDIA_ACTION_SET",
  "DEPTH_CHART_UPDATED", "WEEKLY_FINANCES", "PLAYER_BRAND_UPDATED", "GAME_PLAN_REPORT",
  "WEEKLY_RECAP", "RANKINGS_UPDATED", "COMMAND_REJECTED",
  "DECISION_AUDITED",
  // Every program emits these weekly; the player's own payoff already has a
  // home on the postgame screen. Left unfiltered they were twelve identical
  // rows — the same defect the "Prep Points Added" purge fixed once before.
  "WEEK_FOCUS_PAYOFF", "WEEK_FOCUS_SET", "SCOUTING_TARGET_SET", "SEASON_STATS_ARCHIVED"
] as GameEvent["type"][]);

/**
 * A result is news if it involves somebody the player is about to play, or if a
 * ranked team just lost to somebody they shouldn't have. Everything else is 216
 * scores a week that nobody asked for.
 */
function resultIsNews(event: Extract<GameEvent, { type: "GAME_COMPLETED" }>, game: GameView): boolean {
  const upcoming = new Set(game.state.schedule
    .filter((fixture) => !fixture.played
      && (fixture.homeProgramId === game.playerProgramId || fixture.awayProgramId === game.playerProgramId))
    .map((fixture) => fixture.homeProgramId === game.playerProgramId ? fixture.awayProgramId : fixture.homeProgramId));
  if (upcoming.has(event.homeProgramId) || upcoming.has(event.awayProgramId)) return true;
  const home = game.state.programs[event.homeProgramId];
  const away = game.state.programs[event.awayProgramId];
  if (!home || !away) return false;
  const homeWon = event.homeScore > event.awayScore;
  const loser = homeWon ? away : home;
  const winner = homeWon ? home : away;
  return loser.nationalRank <= 15 && winner.nationalRank > 40;
}

function EventList({ events, game }: { events: GameEvent[]; game: GameView }): ReactElement {
  const visible = events.filter((event) => {
    if (INBOX_NOISE.has(event.type)) return false;
    if (event.type === "GAME_COMPLETED") return resultIsNews(event, game);
    return eventRelevantToProgram(event, game);
  }).slice(-12).reverse();
  if (!visible.length) return <p className="muted">Quiet week. Nothing worth reporting.</p>;
  return <div className="inbox-list">{visible.map((event, index) => <article key={`${event.type}-${"week" in event ? event.week : "season" in event ? event.season : 0}-${index}`}><span>{eventIcon(event)}</span><div><strong>{eventTitle(event)}</strong><p>{eventText(event, game)}</p></div></article>)}</div>;
}

function eventRelevantToProgram(event: GameEvent, game: GameView): boolean {
  const programId = game.playerProgramId;
  if (event.type === "PLAYER_INJURED" || event.type === "PLAYER_RECOVERED" || event.type === "INJURY_RECOVERY_ACCELERATED") {
    return game.state.players[event.playerId]?.programId === programId;
  }
  if (event.type === "RECRUITING_CONTEST_RESOLVED") return event.offeredBy.includes(programId);
  if (event.type === "PROSPECT_COMMITTED" || event.type === "NIL_DEAL_SIGNED" || event.type === "PROSPECT_SIGNED") {
    return event.programId === programId || game.state.recruiting[programId]?.discoveredProspectIds.includes(event.prospectId) === true;
  }
  if (event.type === "PROSPECT_FLIPPED") {
    return event.toProgramId === programId || event.fromProgramId === programId
      || game.state.recruiting[programId]?.discoveredProspectIds.includes(event.prospectId) === true;
  }
  if (event.type === "NIL_COMMITMENT_ENDED") return event.programId === programId;
  if (event.type === "PROSPECTS_DISCOVERED" || event.type === "PROSPECT_EVALUATED" || event.type === "RECRUITING_INVESTMENT"
    || event.type === "RECRUITING_POINTS_ADDED" || event.type === "PROSPECT_ENROLLED"
    || event.type === "PROSPECT_OFFERED" || event.type === "RECRUITING_VISIT_SCHEDULED" || event.type === "PROSPECT_COMMITMENT_VOIDED"
    || event.type === "SPONSORSHIP_ACCEPTED" || event.type === "SPONSORSHIP_PAYMENT"
    || event.type === "COMMAND_REJECTED") {
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
  if (event.type === "INJURY_RECOVERY_ACCELERATED") return "⚕";
  if (event.type === "PLAYER_RECOVERED") return "✓";
  if (event.type === "WEEKLY_FINANCES") return "＄";
  if (event.type === "SPONSORSHIP_ACCEPTED" || event.type === "SPONSORSHIP_PAYMENT") return "＄";
  if (event.type === "FACILITY_UPGRADED") return "▲";
  if (event.type === "PROSPECT_SIGNED" || event.type === "PROSPECT_COMMITTED" || event.type === "PROSPECT_ENROLLED") return "★";
  if (event.type === "PROSPECT_COMMITMENT_VOIDED") return "★";
  if (event.type === "PROSPECT_FLIPPED") return "⇄";
  if (event.type === "PROSPECTS_DISCOVERED" || event.type === "PROSPECT_EVALUATED") return "⌕";
  if (event.type === "RECRUITING_INVESTMENT" || event.type === "RECRUITING_POINTS_ADDED" || event.type === "PROSPECT_OFFERED" || event.type === "RECRUITING_VISIT_SCHEDULED") return "R";
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
  if (event.type === "WEEKLY_FINANCES") return `${money(event.revenue)} revenue, including ${money(event.sponsorshipRevenue)} from sponsorship · ${money(event.expenses)} expenses${event.nilSpend > 0 ? `, including ${money(event.nilSpend)} in NIL commitments` : ""} · ${event.net >= 0 ? "+" : ""}${money(event.net)} net`;
  if (event.type === "NIL_DEAL_SIGNED") {
    const prospect = game.state.prospects[event.prospectId];
    const asked = event.weeklyAmount >= event.askingPrice ? "at" : "under";
    return `${prospect?.name ?? "A recruit"} signed with ${game.state.programs[event.programId]?.name ?? "a program"} on a ${money(event.weeklyAmount)}-a-week NIL deal — ${asked} his ${money(event.askingPrice)} asking price.`;
  }
  if (event.type === "NIL_COMMITMENT_ENDED") return `${game.state.players[event.playerId]?.name ?? "A player"} left the program; his ${money(event.weeklyAmount)}-a-week NIL deal comes off the books.`;
  if (event.type === "SPONSORSHIP_ACCEPTED") return `${event.sponsorName} signed through the end of Season ${event.season} · ${money(event.weeklyPayment)} guaranteed every week.`;
  if (event.type === "SPONSORSHIP_PAYMENT") return `${event.sponsorName} paid ${money(event.basePayment)} guaranteed plus ${money(event.total - event.basePayment)} in bonuses · ${money(event.total)} total.`;
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
  if (event.type === "PLAYER_INJURED") {
    const diagnosis = event.injuryName?.toLowerCase() ?? "undisclosed injury";
    const article = /^[aeiou]/.test(diagnosis) ? "an" : "a";
    const coachEffect = Number.isFinite(event.riskWithoutCoach) && event.coachReductionPercent > 0
      ? ` His strength coach reduced the risk from ${event.riskWithoutCoach}% to ${event.risk}%.`
      : "";
    const absence = event.seasonEnding || event.week >= 14
      ? "is out for the remainder of the season"
      : `will miss approximately ${event.weeks} game${event.weeks === 1 ? "" : "s"}`;
    const replacement = event.replacementPlayerId ? game.state.players[event.replacementPlayerId] : null;
    const lineupEffect = replacement
      ? ` ${replacement.eligibility.rosterStatus === "WALK_ON" ? "Emergency walk-on " : ""}${replacement.name} takes his place${event.affectedUnit && event.unitRatingBefore !== null && event.unitRatingAfter !== null ? `; ${unitLabel(event.affectedUnit).toLowerCase()} falls from ${event.unitRatingBefore.toFixed(1)} to ${event.unitRatingAfter.toFixed(1)}` : ""}.`
      : "";
    return `${game.state.players[event.playerId]?.name ?? "Player"} suffered ${article} ${diagnosis} and ${absence}.${lineupEffect}${coachEffect}`;
  }
  if (event.type === "INJURY_RECOVERY_ACCELERATED") return `${game.state.staff[event.coachId]?.name ?? "The strength coach"} shortened ${game.state.players[event.playerId]?.name ?? "the player's"} recovery from a ${event.injuryName.toLowerCase()} by one week${event.weeksRemaining ? ` · approximately ${event.weeksRemaining} week${event.weeksRemaining === 1 ? "" : "s"} remain` : ""}.`;
  if (event.type === "PLAYER_RECOVERED") return `${game.state.players[event.playerId]?.name ?? "Player"} has recovered from his ${event.injuryName?.toLowerCase() ?? "injury"} and returned to full availability.`;
  if (event.type === "PROSPECT_SIGNED") return `${game.state.prospects[event.prospectId]?.name ?? "Prospect"} signed with ${game.state.programs[event.programId]?.name}.`;
  if (event.type === "PROSPECTS_DISCOVERED") return `${event.prospectIds.length} new prospects found through ${label(event.searchType)} scouting for ${event.pointsSpent} points.`;
  if (event.type === "PROSPECT_EVALUATED") return `${label(event.evaluation)} report unlocked for ${game.state.prospects[event.prospectId]?.name ?? "prospect"} at a cost of ${event.pointsSpent} points.`;
  if (event.type === "RECRUITING_INVESTMENT") return `${event.pointsSpent} points invested in ${game.state.prospects[event.prospectId]?.name ?? "prospect"} · ${event.totalInvestment} total.`;
  if (event.type === "PROSPECT_OFFERED") return event.extended
    ? `Scholarship offered to ${game.state.prospects[event.prospectId]?.name ?? "a prospect"}.`
    : `Scholarship offer to ${game.state.prospects[event.prospectId]?.name ?? "a prospect"} rescinded.`;
  if (event.type === "PROSPECT_FLIPPED") return `${game.state.prospects[event.prospectId]?.name ?? "A recruit"} flipped from ${game.state.programs[event.fromProgramId]?.name ?? "his old commitment"} to ${game.state.programs[event.toProgramId]?.name ?? "a new one"}.`;
  if (event.type === "RECRUITING_VISIT_SCHEDULED") return `Home visit with ${game.state.prospects[event.prospectId]?.name ?? "a prospect"} worth +${event.bonus.toFixed(1)} · ${event.visitsRemainingThisSeason} visit${event.visitsRemainingThisSeason === 1 ? "" : "s"} left this season.`;
  if (event.type === "PROSPECT_COMMITTED") return `${game.state.prospects[event.prospectId]?.name ?? "Prospect"} committed to ${game.state.programs[event.programId]?.name}; he will enroll next season.`;
  if (event.type === "PROSPECT_ENROLLED") return `${game.state.prospects[event.prospectId]?.name ?? "Freshman"} ${event.lateFill ? "accepted a late scholarship to stabilize the roster at" : "joined"} ${game.state.programs[event.programId]?.name}.`;
  if (event.type === "ROSTER_POSITION_CONVERTED") return `${game.state.players[event.playerId]?.name ?? "An athlete"} moved from ${event.from} to ${event.to} to stabilize ${game.state.programs[event.programId]?.name}'s roster.`;
  if (event.type === "PROSPECT_COMMITMENT_VOIDED") return `${game.state.prospects[event.prospectId]?.name ?? "A committed recruit"}'s class filled before he could enroll; the commitment is void.`;
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
function WeekHub({ game, busy, inFlightDecision, pending, onQueue, initialTab }: {
  game: GameView; busy: boolean; inFlightDecision: WeeklyPlanningCommand | null;
  pending: GameCommand[]; onQueue: (command: GameCommand) => void; initialTab: WeekTab | undefined;
}): ReactElement {
  const programId = game.playerProgramId;
  const [tab, setTab] = useState<WeekTab>(initialTab ?? "WEEK");
  // Arriving from the dashboard briefing should land on the tab that fixes it.
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);
  const decisions = weeklyDecisions(game.state, programId);
  const preparation = game.state.preparation?.[programId];
  const scouting = scoutingReport(game.state, programId);
  const fixture = game.state.schedule.find((item) =>
    item.week === game.state.week && !item.played && (item.homeProgramId === programId || item.awayProgramId === programId));
  const atHome = fixture?.homeProgramId === programId;
  const opponent = fixture ? game.state.programs[atHome ? fixture.awayProgramId : fixture.homeProgramId] ?? null : null;

  const capacity = focusCapacity(game.state, programId);
  const priorityDecision = weeklyPriorityDecision(game.state, programId, inFlightDecision);
  const chosen = priorityDecision.focuses;
  const scoutTargetId = scoutingTargetFor(game.state, programId);
  const flagged: Record<WeekTab, number> = {
    // A priority nobody claimed is a week the staff spends on nothing in
    // particular, and nothing banks. That is what the badge is for.
    WEEK: priorityDecision.attention ? 1 : 0,
    SCOUTING: scouting.opponentProgramId && scouting.tiers.length === 0 ? 1 : 0,
    BUSINESS: decisions.filter((decision) => decision.attention).length,
    REPORT: 0
  };

  return <section className="screen week-hub">
    <article className="panel week-header">
      <p className="eyebrow">
        Week {game.state.week} · chasing {chosen.length} of {capacity.capacity}
      </p>
      <h2>{opponent ? `${atHome ? "Hosting" : "At"} ${opponent.name}` : "No game this week"}</h2>
      <ul className="decision-list">
        <li className={priorityDecision.attention ? "attention-row" : ""}>
          <span>{priorityDecision.status[0]}{priorityDecision.status.slice(1).toLowerCase()} · Weekly priorities</span>
          <strong>{priorityDecision.summary}</strong>
        </li>
        <li>
          <span>Practice reps</span>
          <strong>{preparation?.offensiveReps ?? 0} offense · {preparation?.defensiveReps ?? 0} defense</strong>
        </li>
        <li>
          <span>The film room is on</span>
          <strong>{scoutTargetId ? game.state.programs[scoutTargetId]?.name ?? "nobody" : "nobody"}</strong>
        </li>
        {decisions.filter((decision) => decision.attention).map((decision) =>
          <li className="attention-row" key={decision.id}>
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
    {tab === "WEEK" && <WeekPriorities game={game} busy={busy} inFlightDecision={inFlightDecision} onQueue={onQueue} />}
    {tab === "SCOUTING" && <WeekScouting game={game} busy={busy} inFlightDecision={inFlightDecision} onQueue={onQueue} />}
    {tab === "BUSINESS" && <WeekDecisions game={game} pending={pending} onQueue={onQueue} />}
    {tab === "REPORT" && <WeekReport game={game} />}
  </section>;
}

/**
 * The week as five cards, and you name the priorities.
 *
 * This replaces a pool of hours behind four sliders. Hours are what the engine
 * spends, but they are not a decision anybody can hold: four sliders over a
 * 24-hour pool is about two thousand valid weeks, every drag moves three numbers
 * you did not touch, and the coaches disappear into one anonymous total so
 * hiring never shows up anywhere. A playtest verdict of "I don't even understand
 * it" is what that produces.
 *
 * So: everything runs at a baseline whether you pick it or not — no chore, no
 * punishment for not reading a screen — and what you actually do is name the one
 * to three things the staff is chasing. Each card says who runs it, what happens
 * if you leave it alone, what happens if you pick it, and why it might matter
 * this particular week.
 */
function WeekPriorities({ game, busy, inFlightDecision, onQueue }: {
  game: GameView; busy: boolean; inFlightDecision: WeeklyPlanningCommand | null;
  onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const capacity = focusCapacity(game.state, programId);
  const identity = program.schemeIdentity;

  const priorityDecision = weeklyPriorityDecision(game.state, programId, inFlightDecision);
  const cards = weekPriorities(game.state, programId);
  const chosen = priorityDecision.focuses;
  const isChosen = (focus: WeekFocus) => chosen.includes(focus);

  const toggle = (focus: WeekFocus): void => {
    const next = isChosen(focus)
      ? chosen.filter((entry) => entry !== focus)
      // Picking past capacity drops the oldest choice, so the control never
      // silently refuses. A card that does nothing when tapped reads as broken.
      : [...chosen, focus].slice(-capacity.capacity);
    onQueue({ type: "SET_WEEK_FOCUS", programId, focuses: next });
  };

  return <div className="week-tab-body">
    <article className="panel focus-header">
      <p className="eyebrow">Week {game.state.week} · {capacity.power} staff rating</p>
      <div className={`decision-status-line ${priorityDecision.status.toLowerCase()}`} aria-live="polite">
        <strong>{priorityDecision.status[0]}{priorityDecision.status.slice(1).toLowerCase()} · Weekly priorities</strong>
        <span>{priorityDecision.summary}</span>
      </div>
      <p className="muted">
        Everything below happens anyway — your coaches turn up and do their jobs. What you choose here is what they
        put the week into. <strong>{capacity.note}</strong>
      </p>
      <div className="focus-pips" aria-label={`${chosen.length} of ${capacity.capacity} priorities chosen`}>
        {Array.from({ length: capacity.capacity }, (_, index) =>
          <span className={index < chosen.length ? "focus-pip filled" : "focus-pip"} key={index} />)}
        <span className="muted">{chosen.length} of {capacity.capacity}</span>
      </div>
      {priorityDecision.status === "OPTIONAL" && <p className="focus-suggestion">
        <strong>Optional:</strong> {priorityDecision.detail}
      </p>}
    </article>

    <div className="focus-cards">{cards.map((card) => {
      const picked = isChosen(card.focus);
      return <article className={`focus-card${picked ? " picked" : ""}${card.blocked ? " blocked" : ""}`} key={card.focus}>
        <header>
          <div>
            <h3>{card.label}</h3>
            <p className="muted">{card.blurb}</p>
          </div>
          <span className={card.stakes >= 60 ? "stakes high" : card.stakes >= 30 ? "stakes" : "stakes low"}
            title="How much this is worth this week, 0–100, judged from the numbers on this card">
            <small>matters</small>
            <b>{card.stakes}/100</b>
          </span>
        </header>
        <p className="focus-owner">
          <strong>{card.ownerName}</strong> <span className="muted">{card.ownerNote}</span>
        </p>
        <div className="focus-outcomes">
          <p className={picked ? "muted" : "focus-live"}><span>Leave it alone</span><strong>{card.baseline}</strong></p>
          <p className={picked ? "focus-live" : "muted"}><span>Make it a priority</span><strong>{card.focused}</strong></p>
        </div>
        <p className="focus-why">{card.blocked ?? card.stakesNote}</p>
        <button className={picked ? "focus-button picked" : "focus-button"}
          disabled={busy || priorityDecision.status === "PENDING" || Boolean(card.blocked)}
          onClick={() => toggle(card.focus)}>
          {priorityDecision.status === "PENDING" ? "Applying…" : picked ? "Chasing this" : card.blocked ? "Not available" : "Make it a priority"}
        </button>
      </article>;
    })}</div>

    <article className="panel">
      <p className="eyebrow">What you run</p>
      <h2>{OFFENSIVE_IDENTITY_LABELS[identity.offense]} · {DEFENSIVE_IDENTITY_LABELS[identity.defense]}</h2>
      <p className="muted">
        Your scheme is your game plan. There is no weekly call to make and no preset to pick — an Air Raid program is
        never asked whether it would rather grind it out this Saturday. Your offense puts{" "}
        <strong>{personnelLabel(identity.offense)}</strong> on the field. Changing how you play means changing your
        scheme, and that only happens between seasons.
      </p>
      <p className="muted">
        Practice decides how much of it holds up on Saturday. Scouting decides how ready your guys are for the man
        across from them. Both come out of the same week, which is why you cannot have all of it.
      </p>
    </article>
  </div>;
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
  // The fallback here used to be `state.developmentSpotlights?.[programId] ?
  // undefined : undefined`, which is `undefined` either way — so this panel read
  // only the queued command and never the committed one. Your week said "Tariq
  // Cruz gets the full spotlight" while this section said "Nobody yet" about the
  // same player in the same moment, which is two screens disagreeing about one
  // piece of state rather than two vocabularies for it.
  const spotlight = pending.find((command): command is Extract<GameCommand, { type: "SET_DEVELOPMENT_SPOTLIGHT" }> => command.type === "SET_DEVELOPMENT_SPOTLIGHT")
    ?? game.state.developmentSpotlights?.[programId]
    ?? undefined;
  const spotlightPlayerId = spotlight?.target.type === "PLAYER" ? spotlight.target.playerId : null;
  const spotlightPosition = spotlight?.target.type === "POSITION" ? spotlight.target.position : null;
  const roster = Object.values(game.state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP");
  const spotlightLabel = spotlightPlayerId
    ? `${game.state.players[spotlightPlayerId]?.name ?? "Somebody"} gets the week`
    : spotlightPosition ? `The whole ${spotlightPosition} room gets the week` : "Nobody yet";
  const [devMode, setDevMode] = useState<"SUGGESTED" | "ROOM" | "ANYBODY">("SUGGESTED");
  const [devSearch, setDevSearch] = useState("");

  const Header = ({ id, title }: { id: string; title: string }): ReactElement => {
    const info = alert(id);
    return <><p className="eyebrow">{title}{info?.attention && <span className="attention-dot" aria-label="Needs attention"> ●</span>}</p>
      {info?.attention && <p className="attention">{info.attention}</p>}</>;
  };

  return <div className="week-tab-body">
    <article className={atHome ? "panel" : "panel locked-panel"}>
      <Header id="TICKET_PRICE" title="1 · Ticket price" />
      {/* A bye week and the preseason both have no fixture at all, and saying
          "you're on the road" there is simply false — a cold player read it in
          a week when their next game was at home. */}
      {!atHome && <p className="locked-note">{fixture
        ? "You're on the road this week. Gate business happens at home."
        : "There's no game this week, so there's no gate. Pricing applies to your next home game."}</p>}
      <h2>{money(price)} a seat</h2>
      <input type="range" min={MINIMUM_TICKET_PRICE} max={MAXIMUM_TICKET_PRICE} value={price} disabled={!atHome}
        onChange={(event) => onQueue({ type: "SET_TICKET_PRICE", programId, price: Number(event.target.value) })} />
      <div className="snapshot-list">
        <p><span>Programs like yours charge</span><strong>{money(gate.fairPrice)}</strong></p>
        <p><span>Expected crowd</span><strong>{atHome ? `${gate.attendance.toLocaleString()} / ${capacity.toLocaleString()}${gate.soldOut ? " · sold out" : ""}` : "—"}</strong></p>
        <p><span>Gate</span><strong>{atHome ? money(gate.ticketRevenue) : "—"}</strong></p>
      </div>
    </article>

    <article className={atHome ? "panel" : "panel locked-panel"}>
      <Header id="ADVERTISING" title="2 · Marketing" />
      {!atHome && <p className="locked-note">Nothing to promote — you're playing somewhere else this week.</p>}
      <h2>{!atHome ? "Not this week" : spend > 0 ? `${money(spend)} this week` : "No spend"}</h2>
      <input type="range" min={0} max={MAXIMUM_WEEKLY_ADVERTISING} step={5_000} value={spend} disabled={!atHome}
        onChange={(event) => onQueue({ type: "SET_ADVERTISING", programId, spend: Number(event.target.value) })} />
      <div className="snapshot-list">
        <p><span>New fans this week</span><strong>{atHome ? gate.advertisingFans.toLocaleString() : "—"}</strong></p>
        <p><span>Extra bodies in seats</span><strong>{atHome ? `${Math.max(0, gate.attendance - projectGate(program, opponent, capacity, false, price, 0).attendance).toLocaleString()}` : "—"}</strong></p>
        <p><span>Net this week</span><strong>{atHome ? money(gate.net) : "$0"}</strong></p>
      </div>
    </article>

    <article className="panel">
      <Header id="DEVELOPMENT" title="3 · Who gets the extra work" />
      <h2>{spotlightLabel}</h2>
      <p className="muted">
        One player gets your staff's full attention, or a whole position room splits it. Concentrated work
        builds a star; a room lifts everybody a little. You can't do both.
      </p>
      <div className="dev-modes">
        {(["SUGGESTED", "ROOM", "ANYBODY"] as const).map((mode) =>
          <button className={devMode === mode ? "dev-mode active" : "dev-mode"} key={mode} onClick={() => setDevMode(mode)}>
            {mode === "SUGGESTED" ? "Three worth it" : mode === "ROOM" ? "A whole room" : "Anybody on the roster"}
          </button>)}
      </div>

      {devMode === "SUGGESTED" && <div className="plan-options">{candidates.map((candidate) =>
        <button className={spotlightPlayerId === candidate.playerId ? "plan-option active" : "plan-option"}
          key={candidate.playerId}
          onClick={() => onQueue({
            type: "SET_DEVELOPMENT_SPOTLIGHT", programId,
            target: { type: "PLAYER", playerId: candidate.playerId },
            focus: candidate.reason === "AT_RISK" ? "CONDITIONING" : "TECHNIQUE"
          })}>
          <strong>{candidate.name} · {candidate.position} · {candidate.overall}</strong>
          <span className="effect">{candidate.headline}</span>
          <span className="tradeoff">{candidate.detail}</span>
        </button>)}
      </div>}

      {devMode === "ROOM" && <div className="plan-options">{positionOrder.map((position) => {
        const room = roster.filter((player) => player.position === position);
        if (room.length === 0) return null;
        const best = Math.max(...room.map((player) => player.overall));
        const headroom = room.reduce((total, player) => total + (player.potential - player.overall), 0) / room.length;
        return <button className={spotlightPosition === position ? "plan-option active" : "plan-option"} key={position}
          onClick={() => onQueue({ type: "SET_DEVELOPMENT_SPOTLIGHT", programId, target: { type: "POSITION", position }, focus: "TECHNIQUE" })}>
          <strong>{position} room · {room.length} players</strong>
          <span className="effect">Best is {Math.round(best)}, average {headroom.toFixed(1)} points of headroom left</span>
          <span className="tradeoff">Each gets a fraction of the work — nobody in here becomes a star this week</span>
        </button>;
      })}</div>}

      {devMode === "ANYBODY" && <div className="dev-browser">
        <input className="dev-search" type="search" placeholder="Search your roster…" value={devSearch}
          onChange={(event) => setDevSearch(event.target.value)} />
        <div className="dev-list">{roster
          .filter((player) => player.name.toLowerCase().includes(devSearch.toLowerCase()) || player.position.toLowerCase() === devSearch.toLowerCase())
          .sort((left, right) => (right.potential - right.overall) - (left.potential - left.overall))
          .slice(0, 40)
          .map((player) =>
            <button className={spotlightPlayerId === player.id ? "dev-row active" : "dev-row"} key={player.id}
              onClick={() => onQueue({ type: "SET_DEVELOPMENT_SPOTLIGHT", programId, target: { type: "PLAYER", playerId: player.id }, focus: "TECHNIQUE" })}>
              <strong>{player.name}</strong>
              <span>{player.position} · {Math.round(player.overall)} now</span>
              <span className="dev-headroom">{Math.round(player.potential - player.overall)} left in him</span>
            </button>)}
        </div>
      </div>}
    </article>

    {/* The weekly offensive/defensive strategy presets used to live here. The
        engine refuses SET_GAME_PLAN since the five-priorities rework — your
        scheme is your game plan — so the pickers were dead controls that
        queued commands the engine silently discarded. The preset data and the
        emphasis matrix stay intact in the engine per the design note; only
        the UI that could never do anything is gone. */}
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
function WeekScouting({ game, busy, inFlightDecision, onQueue }: {
  game: GameView; busy: boolean; inFlightDecision: WeeklyPlanningCommand | null;
  onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const board = scoutingBoard(game.state, programId);
  const scouting = scoutingReport(game.state, programId);
  const level = program.facilities.SCOUTING ?? 1;
  const target = inFlightDecision?.type === "SET_SCOUTING_TARGET" && inFlightDecision.programId === programId
    ? inFlightDecision.opponentProgramId
    : scoutingTargetFor(game.state, programId);
  const scoutFocused = activeFocuses(game.state, programId).includes("SCOUT");

  return <div className="week-tab-body">
    <article className="panel">
      <p className="eyebrow">Opponent scouting department · tier {level} of 5</p>
      <h2>{weeklyScoutingOutput(game.state, programId)} points a week{scoutFocused ? ", with the week behind it" : " at baseline"}</h2>
      <p className="muted">{scoutingDepartmentSummary(level)}</p>
      <p className="muted">
        You do not assign the points — the department files everything it produces against the game you point it at.
        The decision is <strong>which game</strong>. Make scouting a priority on your week screen and the same
        department produces considerably more.
      </p>
      <p className="eyebrow tier-heading">What a file is worth</p>
      <p className="muted">
        A file makes <strong>your own team better in that game</strong> — your guys have seen the formation on tape
        and react half a step faster. A complete file is worth <strong>+{FULL_FILE_READINESS.toFixed(1)} to all four
        units</strong>, which is about what playing at home is worth. It never asks you to change what you run.
      </p>
      <p className="eyebrow tier-heading">And what it tells you</p>
      <ol className="tier-ladder">{SCOUTING_TIERS.map((tier) =>
        <li key={tier}>
          <span className="tier-cost">{DOSSIER_THRESHOLDS[tier]} pts</span>
          <span>
            <strong>{SCOUTING_TIER_LABELS[tier]}</strong> — {SCOUTING_TIER_DESCRIPTIONS[tier].toLowerCase()}
            <small> · {readinessNote(DOSSIER_THRESHOLDS[tier]).replace(" — they have seen this on tape", "")}</small>
          </span>
        </li>)}
      </ol>
    </article>

    <article className="panel">
      <p className="eyebrow">The board · {board.length} game{board.length === 1 ? "" : "s"} left</p>
      <h2>Which game is the film room on?</h2>
      <p className="muted">
        A ranked win pays in followers and national attention; a routine one barely moves the program. Point the
        department at a game several weeks out and it arrives with a complete file — point it at this Saturday every
        week and you never get past the first tier.
      </p>
      {board.map((dossier) => {
        const opponent = game.state.programs[dossier.opponentProgramId]!;
        const nextTier = SCOUTING_TIERS.find((tier) => !dossier.tiers.includes(tier));
        const isTarget = target === dossier.opponentProgramId;
        return <div className={`dossier-row${dossier.week === game.state.week ? " now" : ""}${isTarget ? " targeted" : ""}`} key={dossier.opponentProgramId}>
          <div className="dossier-head">
            <p className="plan-label">
              Week {dossier.week} · {opponent.name} · #{opponent.nationalRank} · {opponent.wins}–{opponent.losses}
            </p>
            <span className={dossier.value >= 55 ? "dossier-value high" : "dossier-value"}>worth {dossier.value}</span>
          </div>
          <p className="muted">{dossier.valueNote}</p>
          <p className={dossier.points > 0 ? "readiness-line" : "muted"}>
            <strong>{readinessNote(dossier.points)}</strong>
            {dossier.points < DOSSIER_THRESHOLDS.GAME_PLAN && (
              <span className="muted"> · a complete file is +{FULL_FILE_READINESS.toFixed(1)}</span>
            )}
          </p>
          <p className="muted">
            File: {dossier.points} point{dossier.points === 1 ? "" : "s"} · what it reports is about {dossier.confidence}% dependable ·
            {" "}{dossier.tiers.length > 0 ? dossier.tiers.map((tier) => SCOUTING_TIER_LABELS[tier]).join(", ") : "nothing readable yet"}
            {nextTier ? ` · ${DOSSIER_THRESHOLDS[nextTier] - dossier.points} more points open ${SCOUTING_TIER_LABELS[nextTier].toLowerCase()}` : " · complete"}
          </p>
          <button className={isTarget ? "focus-button picked" : "focus-button"}
            disabled={busy || inFlightDecision !== null}
            onClick={() => onQueue({ type: "SET_SCOUTING_TARGET", programId, opponentProgramId: dossier.opponentProgramId })}>
            {inFlightDecision?.type === "SET_SCOUTING_TARGET" ? "Applying…" : isTarget ? "The film room is on this one" : `Put the film room on ${opponent.name}`}
          </button>
        </div>;
      })}
      {board.length === 0 && <p className="muted">Nothing left on the schedule to scout.</p>}
    </article>

    {scouting.opponentProgramId && <article className="panel">
      <p className="eyebrow">This week's file</p>
      <h2>{game.state.programs[scouting.opponentProgramId]?.name}</h2>
      <p className="muted">
        {scouting.record} · #{scouting.nationalRank} · {scouting.reputation} — known without paying.
        {" "}What the file reports is about {scouting.confidence}% dependable{scouting.filmGames === 0
          ? " — there is no film on them yet, so treat every number as a guess."
          : `, read from ${scouting.filmGames} game${scouting.filmGames === 1 ? "" : "s"} of film — more film, sharper numbers.`}
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

/** One team's half of the box score: a table per phase, TEAM line at the foot. */
function BoxScoreTeamTables({ team, yours }: { team: BoxScoreTeam; yours: boolean }): ReactElement {
  return <div className="box-team">
    <h3>{team.name} <span className="box-team-score">{team.score} points</span>{yours && <em>you</em>}</h3>
    {team.groups.map((group) => <div className="box-group" key={group.id}>
      <p className="box-group-label">{group.label}</p>
      <table className="stat-table box-table">
        <thead><tr>
          <th>{group.label}</th>
          {group.columns.map((column) => <th key={column}>{column}</th>)}
        </tr></thead>
        <tbody>{group.rows.map((row) =>
          <tr className={row.total ? "box-total" : ""} key={row.playerId}>
            <th scope="row">{row.name}{row.position && <small> {row.position}</small>}</th>
            {row.values.map((value, index) => <td key={group.columns[index] ?? index}>{value}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>)}
  </div>;
}

/** The whole game, printed the way a box score is printed. */
function BoxScorePanel({ box, programId }: { box: BoxScore; programId: string }): ReactElement {
  return <article className="panel box-score">
    <p className="eyebrow">Week {box.week} final score · points</p>
    <h2>
      {box.away.abbreviation} {box.away.score} &nbsp;at&nbsp; {box.home.abbreviation} {box.home.score}
    </h2>
    <table className="stat-table team-stats-table">
      <thead><tr><th>Team stats</th><th>{box.away.abbreviation}</th><th>{box.home.abbreviation}</th></tr></thead>
      <tbody>{box.teamStats.map((stat) =>
        <tr key={stat.label}>
          <th scope="row">{stat.label}</th>
          <td>{stat.away}</td>
          <td>{stat.home}</td>
        </tr>)}
      </tbody>
    </table>
    <div className="box-teams">
      <BoxScoreTeamTables team={box.away} yours={box.away.programId === programId} />
      <BoxScoreTeamTables team={box.home} yours={box.home.programId === programId} />
    </div>
  </article>;
}

function WeekReport({ game }: { game: GameView }): ReactElement {
  const programId = game.playerProgramId;
  const lastReport = [...game.state.eventHistory]
    .reverse()
    .find((event): event is Extract<GameEvent, { type: "GAME_PLAN_REPORT" }> =>
      event.type === "GAME_PLAN_REPORT" && event.programId === programId);
  const box = useMemo(() => latestBoxScore(game.state, programId), [game.state, programId]);
  const payoff = [...game.state.eventHistory]
    .reverse()
    .find((event): event is Extract<GameEvent, { type: "WEEK_FOCUS_PAYOFF" }> =>
      event.type === "WEEK_FOCUS_PAYOFF" && event.programId === programId);
  const latestRecap = [...game.state.eventHistory]
    .reverse()
    .find((event): event is Extract<GameEvent, { type: "WEEKLY_RECAP" }> =>
      event.type === "WEEKLY_RECAP" && event.programId === programId);
  const stories = latestRecap
    ? weeklyStories(game.state, programId, latestRecap.season, latestRecap.week)
    : [];

  return <div className="week-tab-body">
    {stories.length > 0 && <article className="panel weekly-stories-panel">
      <p className="eyebrow">Season {latestRecap?.season} · Week {latestRecap?.week}</p>
      <h2>The week in stories</h2>
      <WeeklyStoryPackage stories={stories} game={game} />
    </article>}
    {box && <BoxScorePanel box={box} programId={programId} />}
    {payoff && payoff.focuses.length > 0 && <article className="panel">
      <p className="eyebrow">What you chased last week</p>
      <h2>{payoff.focuses.map((focus) => WEEK_FOCUS_LABELS[focus]).join(" · ")}</h2>
      <div className="snapshot-list">
        <p>
          <span>Offense on Saturday</span>
          <strong>{Math.round(payoff.offensiveExecution * 100)}% of the plan held up</strong>
        </p>
        <p>
          <span>Defense on Saturday</span>
          <strong>{Math.round(payoff.defensiveExecution * 100)}% of the plan held up</strong>
        </p>
        <p>
          <span>Film on {payoff.scoutedOpponentId ? game.state.programs[payoff.scoutedOpponentId]?.abbreviation ?? "them" : "nobody"}</span>
          <strong>{payoff.scoutingReadiness > 0
            ? `+${payoff.scoutingReadiness.toFixed(1)} to every unit`
            : "your guys went in cold"}</strong>
        </p>
        {payoff.developedPlayerId && <p>
          <span>{game.state.players[payoff.developedPlayerId]?.name ?? "Development"}</span>
          <strong>+{payoff.developedOverallGain.toFixed(2)} Overall</strong>
        </p>}
        <p><span>Recruiting</span><strong>+{payoff.recruitingPointsAdded} points on the trail</strong></p>
      </div>
      <p className="muted">
        These are the numbers your week actually bought.
      </p>
    </article>}
    {!lastReport && <article className="panel">
      <p className="eyebrow">Last week</p>
      <h2>Nothing to review yet</h2>
      <p className="muted">A plan report appears here once a game has been played. Decisions you cannot review are decisions you cannot learn from.</p>
    </article>}
    {lastReport && <article className="panel">
      <p className="eyebrow">Last week vs {game.state.programs[lastReport.opponentProgramId]?.abbreviation ?? "opponent"}</p>
      <h2>What the calls were worth</h2>
      <div className="snapshot-list">
        <p><span>Play mix</span><strong>{lastReport.runPlays} rushing plays · {lastReport.passPlays} passing plays</strong></p>
        <p><span>Turnovers</span><strong>{lastReport.takeaways} takeaways · {lastReport.giveaways} giveaways</strong></p>
        <p><span>Sacks</span><strong>{lastReport.sacksFor} made · {lastReport.sacksAgainst} allowed</strong></p>
        <p><span>Lead back share of carries</span><strong>{Math.round(lastReport.leadBackShare * 100)}%</strong></p>
        <p><span>Top receiver share of targets</span><strong>{Math.round(lastReport.topTargetShare * 100)}%</strong></p>
      </div>
      <table className="stat-table matchup-table">
        <thead><tr><th>Unit</th><th>Your rating (0–100)</th><th>Opponent rating (0–100)</th><th>Plays</th><th>Yards</th><th>Yards per play</th><th>Touchdowns</th></tr></thead>
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
  if (command.type === "SCHEDULE_VISIT") return VISIT_COST;
  return 0;
}
function formatRatingChanges(changes: Partial<Record<keyof Player["ratings"], number>>): string {
  // Full words, not engine tokens — this string faces the player, and TEC/STR/CON
  // was the last screen still speaking raw abbreviations.
  const names: Record<keyof Player["ratings"], string> = { technique: "Technique", strength: "Strength", conditioning: "Conditioning", injuryPrevention: "Injury protection", armStrength: "Arm strength" };
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

/**
 * The offseason: four steps, in order, each its own screen.
 *
 * Deliberately a full-screen flow rather than another dashboard tab, for the
 * same reason `SetUpProgram` is: no games are being played, the weekly
 * decisions do not apply, and the nav bar full of in-season screens would be
 * fourteen dead links. The player works through the four steps and comes out
 * the other side in week one.
 *
 * Every step is skippable. "Continue" with nothing chosen is a legal, sane
 * week — the engine's own default — so the flow is never homework.
 */
/**
 * Games that have to be played before "if the season ended today" says anything.
 * A third of a season is enough to separate a bad start from a bad team.
 */
const MEANINGFUL_RECORD = 4;

/**
 * Where the job stands, on the screen the player opens most.
 *
 * The point of showing this every week is that a dismissal must never be a
 * surprise. `jobReview` is the same call the board makes in the offseason, so
 * this is not an estimate of the verdict — it is the verdict, on today's
 * record. A coach who has watched "Hot seat" sit here since October was warned;
 * one who finds out in the offseason was ambushed.
 *
 * Quiet while the job is safe: a permanent status line about job security would
 * be noise for the many seasons where nothing is wrong.
 */
function JobStanding({ game }: { game: GameView }): ReactElement | null {
  const review = jobReview(game.state, game.playerProgramId);
  if (!review) return null;
  const program = game.state.programs[game.playerProgramId]!;
  // "If it ended today" is a nonsense premise before anybody has played. At 0–0
  // every coach in the league projects as missing the target by the whole
  // target, so the banner opened the season telling a fresh hire he was on his
  // final warning. Wait until the record carries information.
  const played = program.wins + program.losses;
  if (played < MEANINGFUL_RECORD) return null;
  const mandate = program.championshipDeadline ?? null;

  // This used to render only while the job was in trouble or carried a mandate,
  // on the reasoning that a permanent status line would be noise through the
  // many seasons where nothing is wrong. That optimised for quiet at the cost of
  // the thing the banner exists for: a number nobody has ever seen cannot warn
  // anybody. A cold player went 10–3 and met their security score for the first
  // time in February, when the board announced it had moved from 65 to 96 —
  // a good verdict, and still a surprise, because they had not known they were
  // being graded. The band shows from a meaningful record onward whatever it
  // says; only its tone changes.
  const tone = review.verdict === "FIRED" || review.verdict === "FINAL_WARNING" ? "critical"
    : review.verdict === "HOT_SEAT" ? "warning"
      : "neutral";
  const headline = review.verdict === "FIRED"
    ? "As it stands, the board lets you go at the end of the year."
    : review.verdict === "FINAL_WARNING"
      ? "One more year like this and you are gone."
      : review.verdict === "HOT_SEAT"
        ? "You are on the hot seat."
        : review.verdict === "WATCHED"
          ? "The board is watching this one."
          : review.verdict === "EXTENDED"
            ? "A year like this puts an extension on the table."
            : "The board has no questions about the job.";

  return <p className={`job-standing ${tone}`}>
    <strong>{jobVerdictLabel(review.verdict)}.</strong> {headline}
    {" "}Finish on this pace, {review.wins}–{review.losses}, and the board has you at {review.securityAfter}
    {review.securityAfter === review.securityBefore ? ", unchanged" : ` from ${review.securityBefore}`}.
    {mandate !== null && ` You have ${mandate} ${mandate === 1 ? "season" : "seasons"} to win a title, or the job is forfeit.`}
  </p>;
}

function Offseason({ game, busy, error, pending, onQueue, onContinue }: {
  game: GameView;
  busy: boolean;
  error: string | undefined;
  pending: GameCommand[];
  onQueue: (command: GameCommand) => void;
  onContinue: () => void;
}): ReactElement {
  const step = game.state.offseasonStep ?? "PORTAL";
  const index = OFFSEASON_STEPS.indexOf(step);
  const program = game.state.programs[game.playerProgramId]!;
  return <main className="new-game offseason-screen">
    <header className="masthead">
      <p className="eyebrow">{program.name} · the {game.state.season} season is over</p>
      <h1>{OFFSEASON_STEP_HEADLINES[step]}</h1>
      <p>{OFFSEASON_STEP_BLURBS[step]}</p>
      <ol className="offseason-steps">{OFFSEASON_STEPS.map((entry, entryIndex) => (
        <li className={entryIndex === index ? "current" : entryIndex < index ? "done" : ""} key={entry}>
          <span>{entryIndex + 1}</span>{OFFSEASON_STEP_TITLES[entry]}
        </li>
      ))}</ol>
    </header>

    {error && <article className="panel offseason-error"><p className="eyebrow">Something went wrong</p><p>{error}</p></article>}
    <OffseasonRecap game={game} />

    {step === "BOARD_REVIEW" && <BoardReview game={game} />}
    {step === "PORTAL" && <PortalBoard game={game} busy={busy} pending={pending} onQueue={onQueue} />}
    {step === "SIGNING_DAY" && <SigningDay game={game} />}
    {step === "COACHING" && <CoachingMarket game={game} busy={busy} pending={pending} onQueue={onQueue} />}
    {step === "TRAINING_CAMP" && <TrainingCamp game={game} busy={busy} pending={pending} onQueue={onQueue} />}

    <div className="job-actions">
      <button disabled={busy} onClick={onContinue}>
        {busy ? "Working…" : index === OFFSEASON_STEPS.length - 1 ? "Open the season" : OFFSEASON_STEP_ACTIONS[step]}
      </button>
    </div>
  </main>;
}

const OFFSEASON_STEP_TITLES: Record<OffseasonStep, string> = {
  BOARD_REVIEW: "Review",
  PORTAL: "Portal",
  SIGNING_DAY: "Signing day",
  COACHING: "Staff",
  TRAINING_CAMP: "Camp"
};
const OFFSEASON_STEP_HEADLINES: Record<OffseasonStep, string> = {
  BOARD_REVIEW: "The board has been through your season.",
  PORTAL: "Players are in the portal. Some of them are yours.",
  SIGNING_DAY: "This is the class you signed.",
  COACHING: "One look at your staff before the season starts.",
  TRAINING_CAMP: "How do you want to spend camp?"
};
const OFFSEASON_STEP_BLURBS: Record<OffseasonStep, string> = {
  BOARD_REVIEW: "They grade you against the wins they asked for at the start of the year, and against what the department spent getting them. Nothing here is a roll — every line below moved your number by the amount it says.",
  PORTAL: "Everybody bids at once and nobody sees anybody else's offer. Bidding on a man who is leaving you is how you keep him — you already know him, and that counts for something.",
  SIGNING_DAY: "Recruiting settled during the season. They arrive on campus when the offseason closes, and only if you have the scholarships free.",
  COACHING: "The market you can reach depends on what the program is worth. Letting a coach go costs you his buyout on top of what the new man wants to sign.",
  TRAINING_CAMP: "One choice, and it is a trade rather than an upgrade. Whatever you pick covers the opening weeks and then runs out."
};
const OFFSEASON_STEP_ACTIONS: Record<OffseasonStep, string> = {
  BOARD_REVIEW: "On to the portal",
  PORTAL: "Close the portal window",
  SIGNING_DAY: "On to the staff",
  COACHING: "On to camp",
  TRAINING_CAMP: "Open the season"
};

/**
 * The end of a career, which until now the game had no way of reaching.
 *
 * Deliberately not a failure screen. It reports the tenure as a record — what
 * the program looked like when it was taken over against what it looks like
 * now — because a coach who was fired having doubled the fan base and left a
 * full trophy case did something, and a business sim should say so.
 */
function CareerOver({ game, dismissal, busy, onStartOver }: {
  game: GameView;
  dismissal: Extract<GameEvent, { type: "COACH_FIRED" }>;
  busy: boolean;
  onStartOver: () => void;
}): ReactElement {
  const program = game.state.programs[game.playerProgramId]!;
  const seasons = game.state.seasonHistory.filter(
    (history) => history.finalRecords[program.id] !== undefined
  );
  const totals = seasons.reduce((running, history) => {
    const record = history.finalRecords[program.id]!;
    return { wins: running.wins + record.wins, losses: running.losses + record.losses };
  }, { wins: 0, losses: 0 });
  const titles = seasons.filter((history) => history.nationalChampionProgramId === program.id).length;
  const cause = dismissal.cause === "MANDATE"
    ? "You were hired to win a national championship and the clock ran out."
    : dismissal.cause === "INSOLVENCY"
      ? "The athletic department could not go on funding the program you were running."
      : "The wins were not there often enough, for long enough.";

  return <main className="new-game career-over">
    <header className="masthead">
      <p className="eyebrow">{program.name} · {dismissal.season}</p>
      <h1>They have decided to go in a different direction.</h1>
      <p>{cause}</p>
    </header>

    <article className="panel">
      <p className="eyebrow">{dismissal.tenure} {dismissal.tenure === 1 ? "season" : "seasons"} in the chair</p>
      <dl className="career-record">
        <div><dt>Record</dt><dd>{totals.wins}–{totals.losses}</dd></div>
        <div><dt>National titles</dt><dd>{titles}</dd></div>
        <div><dt>Final ranking</dt><dd>#{program.nationalRank}</dd></div>
        <div><dt>Fan base</dt><dd>{program.fanBase.toLocaleString()}</dd></div>
        <div><dt>Prestige</dt><dd>{program.prestige}</dd></div>
        <div><dt>Left the books at</dt><dd>${(program.budget / 1_000_000).toFixed(1)}M</dd></div>
      </dl>
    </article>

    <div className="job-actions">
      <button disabled={busy} onClick={onStartOver}>Take another job</button>
    </div>
  </main>;
}

/**
 * The board's verdict, with its arithmetic shown.
 *
 * Every line is a reason the engine actually applied, carrying the signed
 * number it moved. That is the whole design: a career can end here, so the
 * player has to be able to read back exactly why, and add it up himself if he
 * wants to. Nothing on this screen is a summary of something hidden.
 *
 * Rendered before the step is advanced, so it is a projection of the verdict;
 * it comes from `jobReview`, which is the same call the engine will make.
 */
function BoardReview({ game }: { game: GameView }): ReactElement {
  const review = jobReview(game.state, game.playerProgramId);
  const program = game.state.programs[game.playerProgramId]!;
  if (!review) return <article className="panel"><p>No review available.</p></article>;

  const movement = review.securityAfter - review.securityBefore;
  return <article className={`panel board-review ${review.survives ? "" : "dismissed"}`}>
    <header className="board-review-head">
      <div>
        <p className="eyebrow">{program.name} · {game.state.season}</p>
        <h2>{review.wins}–{review.losses}, against {review.target} asked for</h2>
      </div>
      <div className="board-review-verdict">
        <span className="verdict-label">{jobVerdictLabel(review.verdict)}</span>
        <span className="verdict-number">{review.securityAfter}</span>
        <span className="verdict-move">
          {movement === 0 ? "no change" : `${movement > 0 ? "+" : ""}${movement} from ${review.securityBefore}`}
        </span>
      </div>
    </header>

    <ul className="board-review-reasons">
      {review.reasons.map((reason, index) => (
        <li key={index} className={reason.delta > 0 ? "up" : reason.delta < 0 ? "down" : "flat"}>
          <span className="reason-label">{reason.label}</span>
          <span className="reason-delta">
            {reason.delta === 0 ? "—" : `${reason.delta > 0 ? "+" : ""}${reason.delta}`}
          </span>
        </li>
      ))}
    </ul>

    <p className="board-review-outcome">
      {review.survives
        ? review.verdict === "FINAL_WARNING"
          ? "You keep the job. You will not keep it through another year like this one."
          : review.verdict === "HOT_SEAT"
            ? "You keep the job, and everybody knows what next season is."
            : "You keep the job."
        : review.mandateExpired
          // The number can be excellent and the tenure still over — a coach who
          // went 13–1 reads "Dismissed" beside a 95, which needs saying out loud
          // or the screen looks broken.
          ? `You are relieved of your duties. ${review.securityAfter >= 60
              ? "Your record was never the problem. You were hired to win a national championship, and that is the job you did not do."
              : "You were hired to win a national championship, and the time is up."}`
          : "You are relieved of your duties. Thanks for your service."}
      {review.mandateSeasonsLeft !== null && review.survives
        ? ` ${review.mandateSeasonsLeft} ${review.mandateSeasonsLeft === 1 ? "season" : "seasons"} left on the title mandate.`
        : ""}
    </p>
  </article>;
}

/** What the step the player just closed actually did. Saturday names Monday. */
function OffseasonRecap({ game }: { game: GameView }): ReactElement | null {
  const programId = game.playerProgramId;
  const lines: string[] = [];
  for (const event of game.events) {
    if (event.type === "PORTAL_PLAYER_SIGNED" && event.programId === programId) {
      const player = game.state.players[event.playerId];
      lines.push(event.retained
        ? `You kept ${player?.name ?? "a player"} (${player?.position}, ${player?.overall.toFixed(0)} overall).`
        : `Signed ${player?.name ?? "a transfer"} out of the portal (${player?.position}, ${player?.overall.toFixed(0)} overall).`);
    }
    if (event.type === "PORTAL_PLAYER_SIGNED" && event.previousProgramId === programId && event.programId !== programId) {
      const player = game.state.players[event.playerId];
      lines.push(`Lost ${player?.name ?? "a player"} to ${game.state.programs[event.programId]?.name ?? "a rival"}.`);
    }
    if (event.type === "PORTAL_PLAYER_UNCLAIMED" && event.previousProgramId === programId) {
      const player = game.state.players[event.playerId];
      lines.push(`${player?.name ?? "A player"} left the program and did not land anywhere.`);
    }
    if (event.type === "STAFF_REPLACED" && event.programId === programId) {
      lines.push(`Hired ${event.name} · ${money(event.signingCost)} to sign him and ${money(event.buyoutCost)} to let the last man go.`);
    }
    if (event.type === "TRAINING_CAMP_SET" && event.programId === programId) {
      lines.push(`Camp is set on ${label(event.focus).toLowerCase()} for the first ${event.weeks} weeks.`);
    }
  }
  if (!lines.length) return null;
  return <article className="panel offseason-recap">
    <p className="eyebrow">What just happened</p>
    <ul>{lines.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>
  </article>;
}

/**
 * The portal window. Two lists, because they are two different decisions: the
 * men leaving you, whom you are trying to keep, and everybody else, whom you
 * are trying to take. Keeping somebody is the same bid either way — the engine
 * runs one market — but the reason you are making it is not the same, and the
 * screen should not pretend it is.
 */
function PortalBoard({ game, busy, pending, onQueue }: {
  game: GameView; busy: boolean; pending: GameCommand[]; onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const recruiting = game.state.recruiting[programId]!;
  const listings = Object.entries(portalListings(game.state))
    .map(([playerId, listing]) => ({ playerId, listing, player: game.state.players[playerId]! }))
    .filter((entry) => Boolean(entry.player));

  const bids = pending.filter((command): command is Extract<GameCommand, { type: "BID_PORTAL_PLAYER" }> =>
    command.type === "BID_PORTAL_PLAYER");
  const pointsCommitted = bids.reduce((sum, bid) => sum + bid.points, 0);
  const nilCommitted = bids.reduce((sum, bid) => sum + bid.weeklyNil, 0);
  const pointsLeft = recruiting.points - pointsCommitted;
  const nilLeft = freeNilCapacity(game.state, programId) - nilCommitted;
  const openings = portalScholarshipOpenings(game.state, programId);

  const yours = listings.filter((entry) => entry.listing.previousProgramId === programId);
  const others = listings
    .filter((entry) => entry.listing.previousProgramId !== programId)
    .sort((left, right) => right.player.overall - left.player.overall)
    .slice(0, 24);

  const card = (entry: typeof listings[number]) => <PortalCard
    key={entry.playerId} game={game} busy={busy} entry={entry}
    pointsLeft={pointsLeft} nilLeft={nilLeft} openings={openings}
    bid={bids.find((item) => item.playerId === entry.playerId)}
    onQueue={onQueue} />;

  return <>
    <article className="panel recruiting-command-center">
      <div>
        <p className="eyebrow">Portal window</p>
        <h2>{pointsLeft} Recruiting Points and {money(Math.max(0, nilLeft))} a week left to spend</h2>
        <p className="muted">
          A bid reserves points and NIL room now; only a completed signing spends the points and commits the weekly
          NIL. Everything resolves at once when you close the window — nobody wins by bidding first, and nobody sees
          what anybody else offered.
        </p>
      </div>
      <div className="recruiting-metrics">
        <Metric label="Leaving you" value={String(yours.length)} />
        <Metric label="In the portal" value={String(listings.length)} />
        <Metric label="Roster openings" value={String(openings)} />
        <Metric label="Bids placed" value={String(bids.length)} />
        <Metric label="Points left" value={String(Math.max(0, pointsLeft))} />
        <Metric label="Donor room left" value={`${money(Math.max(0, nilLeft))} a week`} />
      </div>
    </article>

    <article className="panel">
      <SectionHeading eyebrow="Your players" title={yours.length
        ? `${yours.length} of your own are in the portal`
        : "Nobody left you this year"}
        detail={yours.length
          ? "Bid on him and you are re-recruiting him. You already know him, which is worth something no rival can match — but he has already decided to look."
          : "Everyone with eligibility left is staying. Nothing to do here."} />
    </article>
    {yours.length > 0 && <div className="prospect-grid">{yours.map(card)}</div>}

    <article className="panel">
      <SectionHeading eyebrow="Everybody else" title="Players other programs are losing"
        detail={openings > 0
          ? "A transfer arrives finished rather than at eighteen, and keeps whatever eligibility he had left. That is what makes the portal the fast way up."
          : "Your projected roster is full, so you cannot take anybody on. Openings come from graduations and departures."} />
    </article>
    <div className="prospect-grid">{others.map(card)}</div>
  </>;
}

/** One man in the portal, with the whole bid on the card and no hidden numbers. */
function PortalCard({ game, busy, entry, bid, pointsLeft, nilLeft, openings, onQueue }: {
  game: GameView;
  busy: boolean;
  entry: { playerId: string; listing: PortalListingState; player: Player };
  bid: Extract<GameCommand, { type: "BID_PORTAL_PLAYER" }> | undefined;
  pointsLeft: number;
  nilLeft: number;
  openings: number;
  onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const { playerId, listing, player } = entry;
  const yours = listing.previousProgramId === programId;
  const ask = portalAskingPrice(player);
  const fit = Math.round(prospectProgramFit(game.state, portalRecruitable(player, listing), programId));
  const currentPoints = bid?.points ?? 0;
  const currentNil = bid?.weeklyNil ?? 0;
  // The sliders may not offer more than the program can still cover, plus
  // whatever this card has already reserved.
  const maxPoints = Math.max(0, pointsLeft + currentPoints);
  const maxNil = Math.max(0, Math.round((nilLeft + currentNil) / 50) * 50);
  const blocked = openings <= 0;

  const place = (points: number, weeklyNil: number): void => {
    onQueue({ type: "BID_PORTAL_PLAYER", programId, playerId, points, weeklyNil });
  };

  return <article className={yours ? "panel prospect-card portal-card yours" : "panel prospect-card portal-card"}>
    <header>
      <div>
        <p className="eyebrow">{yours ? "Leaving you" : game.state.programs[listing.previousProgramId]?.name ?? "Unattached"}</p>
        <h2>{player.name}</h2>
        <p>{player.position} · {player.eligibility.seasonsRemaining} {player.eligibility.seasonsRemaining === 1 ? "season" : "seasons"} of eligibility left</p>
      </div>
      <strong>{player.overall.toFixed(0)}</strong>
    </header>
    <div className="recruit-fit">
      <span>He is looking for</span><strong>{listing.priorities.map(label).join(" · ")}</strong>
      <span>How well you offer it</span><strong>{fit}/100</strong>
    </div>
    <p className="muted">Wants about {money(ask)} a week.</p>

    {blocked
      ? <p className="muted">No roster room to take anybody on.</p>
      : <>
        <div className="portal-bid">
          <label>
            <span>Recruiting Points</span>
            <input type="range" min={0} max={Math.max(maxPoints, currentPoints)} step={5} value={currentPoints}
              disabled={busy || maxPoints < PORTAL_MINIMUM_POINTS}
              onChange={(event) => place(Number(event.target.value), currentNil)} />
            <strong>{currentPoints} pts</strong>
          </label>
          <label>
            <span>NIL a week</span>
            <input type="range" min={0} max={Math.max(maxNil, currentNil, ask)} step={50} value={currentNil}
              disabled={busy || currentPoints < PORTAL_MINIMUM_POINTS}
              onChange={(event) => place(currentPoints, Number(event.target.value))} />
            <strong>{money(currentNil)}</strong>
          </label>
        </div>
        <p className="muted">
          {currentPoints === 0
            ? `Not bidding. A serious bid starts at ${PORTAL_MINIMUM_POINTS} points.`
            : currentPoints < PORTAL_MINIMUM_POINTS
              ? `Below the ${PORTAL_MINIMUM_POINTS}-point minimum — this bid would be refused.`
              : `Bidding ${currentPoints} points${currentNil > 0 ? ` and ${money(currentNil)} a week` : " and no money"}${yours ? ", and he already knows you" : ""}.`}
        </p>
      </>}
  </article>;
}

/**
 * Signing day. Deliberately a report rather than a decision: recruiting ran
 * all season and settled at the signing week. This is where the player finally
 * sees the class as one thing, and where a scholarship squeeze becomes
 * visible before it silently voids somebody at enrollment.
 */
function SigningDay({ game }: { game: GameView }): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const signed = Object.values(game.state.prospects)
    .filter((prospect) => (prospect.status === "SIGNED" || prospect.status === "COMMITTED") && prospect.signedProgramId === programId)
    .sort((left, right) => right.overall - left.overall);
  const roster = Object.values(game.state.players).filter((player) =>
    player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
  const room = program.scholarshipLimit - roster;
  const squeezed = signed.length > room;

  return <>
    <article className="panel recruiting-command-center">
      <div>
        <p className="eyebrow">Incoming class</p>
        <h2>{signed.length} signed for {game.state.season + 1}</h2>
        <p className="muted">
          They join the roster when the offseason closes. {squeezed
            ? "You have signed more men than you have scholarships for — the ones at the bottom of this list will not make it onto the roster."
            : "There is room on the roster for all of them."}
        </p>
      </div>
      <div className="recruiting-metrics">
        <Metric label="Signed" value={String(signed.length)} />
        <Metric label="On the roster now" value={String(roster)} />
        <Metric label="Scholarships free" value={String(Math.max(0, room))} />
        <Metric label="Best in the class" value={signed[0] ? signed[0].overall.toFixed(0) : "—"} />
      </div>
    </article>
    {signed.length === 0
      ? <article className="panel"><SectionHeading eyebrow="Nobody signed"
          title="This class is empty"
          detail="Nothing was locked down during the season. Every prospect you were chasing went somewhere else or withdrew." /></article>
      : <div className="prospect-grid">{signed.map((prospect, rank) => {
        const overCap = rank >= room;
        return <article className={overCap ? "panel prospect-card over-cap" : "panel prospect-card"} key={prospect.id}>
          <header>
            <div>
              <p className="eyebrow">{prospect.reputation} · {prospect.homeStateCode}</p>
              <h2>{prospect.name}</h2>
              <p>{prospect.position}</p>
            </div>
            <strong>{prospect.overall.toFixed(0)}</strong>
          </header>
          {overCap && <p className="muted">No scholarship left for him — this commitment will be void.</p>}
        </article>;
      })}</div>}
  </>;
}

/**
 * The coaching market, once a year, whether or not the player ever opened the
 * staff screen mid-season. The cards are the ones the takeover screen already
 * uses, so a hire here is priced and explained exactly the same way.
 */
function CoachingMarket({ game, busy, pending, onQueue }: {
  game: GameView; busy: boolean; pending: GameCommand[]; onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const program = game.state.programs[programId]!;
  const [openPost, setOpenPost] = useState<string>();
  const staff = Object.values(game.state.staff).filter((member) => member.programId === programId);
  const roleOrder = ["HEAD_COACH", "OFFENSIVE_COORDINATOR", "DEFENSIVE_COORDINATOR", "STRENGTH_COACH"] as const;
  const queuedHire = pending.find((command): command is Extract<GameCommand, { type: "REPLACE_STAFF" }> =>
    command.type === "REPLACE_STAFF");

  return <>
    <article className="panel recruiting-command-center">
      <div>
        <p className="eyebrow">Staff · {money(program.budget)} in the bank</p>
        <h2>{queuedHire ? "One change queued" : "Nobody has to change"}</h2>
        <p className="muted">
          Every post is worth a look once a year. Prestige decides which coaches will even take your call — the ones
          out of reach say so on the card rather than quietly never appearing.
        </p>
      </div>
    </article>
    <section className="setup-grid">{roleOrder.map((role) => {
      const member = staff.find((candidate) => candidate.role === role);
      if (!member) return null;
      const open = openPost === role;
      const candidates = open ? staffCandidatesFor(game.state, programId, member.id) : [];
      const options = coachOptions({
        member, candidates, identity: program.schemeIdentity, budget: program.budget,
        onHire: (candidateId) => onQueue({ type: "REPLACE_STAFF", programId, staffId: member.id, candidateId })
      });
      return <article className={open ? "panel staff-card span-two" : "panel staff-card"} key={role}>
        <div className="staff-head">
          <div>
            <p className="eyebrow">{label(role)}</p>
            <h2>{member.name}</h2>
            <p className="muted">{ROLE_JOB[role]}</p>
          </div>
          <button className="replace-button" disabled={busy} onClick={() => setOpenPost(open ? undefined : role)}>
            {open ? "Keep him" : "See who's available"}
          </button>
        </div>
        <div className="snapshot-list">{staffCard(game.state, programId, member.id).map((modifier) =>
          <p key={modifier.label}><span>{modifier.label}</span><strong>{modifier.value}</strong></p>)}
        </div>
        <div className="coach-list">
          {(open ? options : options.slice(0, 1)).map((option) =>
            <CoachOption busy={busy} key={option.key} option={option} />)}
        </div>
      </article>;
    })}</section>
  </>;
}

/** Camp: three cards, one choice, both halves of the trade posted on each. */
function TrainingCamp({ game, busy, pending, onQueue }: {
  game: GameView; busy: boolean; pending: GameCommand[]; onQueue: (command: GameCommand) => void;
}): ReactElement {
  const programId = game.playerProgramId;
  const queued = pending.find((command): command is Extract<GameCommand, { type: "SET_TRAINING_CAMP_FOCUS" }> =>
    command.type === "SET_TRAINING_CAMP_FOCUS");
  const chosen = queued?.focus ?? "BALANCED";
  const options: { focus: TrainingCampFocus; title: string; gain: string; cost: string }[] = [
    {
      focus: "CONDITIONING",
      title: "Get them fit",
      gain: `${Math.round((1 - TRAINING_CAMP_CONDITIONING_RISK) * 100)}% less chance of an injury, every man, every game`,
      cost: "No head start on the playbook"
    },
    {
      focus: "BALANCED",
      title: "Split it",
      gain: "Nothing either way",
      cost: "Nothing either way"
    },
    {
      focus: "INSTALL",
      title: "Get the playbook in",
      gain: `+${Math.round(TRAINING_CAMP_INSTALL_BONUS * 100)} points of execution on both sides of the ball`,
      cost: `${Math.round((TRAINING_CAMP_INSTALL_RISK - 1) * 100)}% more chance of an injury while it lasts`
    }
  ];
  return <>
    <article className="panel recruiting-command-center">
      <div>
        <p className="eyebrow">Training camp</p>
        <h2>Whatever you pick covers the first {TRAINING_CAMP_WEEKS} weeks</h2>
        <p className="muted">
          Then it runs out. This is a head start, not something you carry all year — the weekly priorities are still
          what decide the rest of the season.
        </p>
      </div>
    </article>
    <div className="plan-options camp-options">{options.map((option) =>
      <button className={chosen === option.focus ? "plan-option active" : "plan-option"} key={option.focus}
        disabled={busy}
        onClick={() => onQueue({ type: "SET_TRAINING_CAMP_FOCUS", programId, focus: option.focus })}>
        <strong>{option.title}</strong>
        <span className="effect">You get: {option.gain}</span>
        <span className="effect fit-line">It costs: {option.cost}</span>
      </button>)}
    </div>
  </>;
}
