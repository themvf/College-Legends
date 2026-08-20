import type {
  GameState,
  PlayerGameStatLine,
  PlayerSeasonStatLine,
  Season
} from "@college-legends/model";
import { retainedDecisionAudits, retainedDecisionEventHistory } from "./decisions.js";

/**
 * Saving a dynasty.
 *
 * Measured on a real two-season league at the full 72 programs — 81,297 stat
 * rows — before any of this existed:
 *
 * | | size |
 * |---|---|
 * | raw JSON, which is what the engine holds | 73.38 MB |
 * | gzip alone | 4.19 MB |
 * | season aggregation, then gzip | 3.06 MB |
 * | columnar typed arrays on top, then gzip | 3.00 MB |
 * | trimming the event log too | **2.94 MB** |
 *
 * Two things fell out of that table, and both are the opposite of the intuition.
 *
 * **Compression does almost all of the work, and it is free.** `CompressionStream`
 * is a web platform API — no dependency, no bundle cost, and it streams, so the
 * whole save never exists twice in memory. Seventeen times smaller for one call.
 *
 * **Columnar encoding is not worth it.** Packing the stat table into typed arrays
 * with dictionary-encoded string columns cut the *uncompressed* payload from
 * 25.3 MB to 22.0 MB — and after gzip that was 3.06 against 3.00, a 2% win for a
 * hand-rolled binary format, a manifest, and a decoder that can silently corrupt
 * a save. gzip already removes the repetition that columnar layout targets. It is
 * not built here, deliberately.
 *
 * Brotli reaches 2.27 MB and zstd 2.37 MB, but browsers only expose gzip and
 * deflate for *compression* — either would mean shipping a WASM codec to save
 * half a megabyte. Not worth it.
 *
 * What *is* worth it is aggregation, and mostly not for size: folding a finished
 * season's game logs into one row per player is what keeps the growth term
 * bounded, and it takes 81,297 rows out of memory where every league-wide scan
 * has to walk past them.
 */

/** How many events a save carries. Enough for a season's inbox, not a career's. */
export const SAVED_EVENT_LIMIT = 400;

export const SAVE_FORMAT_VERSION = 1;

const TOTALLED = [
  "snaps",
  "passingAttempts",
  "passingCompletions",
  "passingYards",
  "passingTouchdowns",
  "interceptionsThrown",
  "sacksTaken",
  "rushingAttempts",
  "rushingYards",
  "rushingTouchdowns",
  "targets",
  "receptions",
  "receivingYards",
  "receivingTouchdowns",
  "tackles",
  "tacklesForLoss",
  "sacks",
  "defensiveInterceptions",
  "passBreakups",
  "fieldGoalsAttempted",
  "fieldGoalsMade",
  "punts",
  "puntYards"
] as const satisfies readonly (keyof PlayerGameStatLine & keyof PlayerSeasonStatLine)[];

/**
 * Folds a season's game logs into one line per player.
 *
 * Every field is a sum, including the rating and blocking grade, which are kept
 * as totals rather than averages so a career page can add seasons together
 * without compounding rounding. Divide by `games` to display.
 */
export function foldSeasonStats(
  rows: readonly PlayerGameStatLine[],
  season: Season
): PlayerSeasonStatLine[] {
  const byPlayer = new Map<string, PlayerSeasonStatLine>();
  for (const row of rows) {
    if (row.season !== season) continue;
    let line = byPlayer.get(row.playerId);
    if (!line) {
      line = {
        playerId: row.playerId,
        season,
        programId: row.programId,
        position: row.position,
        games: 0,
        starts: 0,
        wins: 0,
        gameRatingTotal: 0,
        blockingGradeTotal: 0,
        ...Object.fromEntries(TOTALLED.map((field) => [field, 0]))
      } as PlayerSeasonStatLine;
      byPlayer.set(row.playerId, line);
    }
    line.games += 1;
    line.starts += row.started ? 1 : 0;
    line.wins += row.result === "WIN" ? 1 : 0;
    line.gameRatingTotal = Number((line.gameRatingTotal + row.gameRating).toFixed(2));
    line.blockingGradeTotal = Number((line.blockingGradeTotal + row.blockingGrade).toFixed(2));
    for (const field of TOTALLED) line[field] += row[field];
  }
  // Sorted so the array is stable across runs, which the determinism invariant
  // requires of anything that ends up in state.
  return [...byPlayer.values()].sort((left, right) =>
    left.season - right.season || left.playerId.localeCompare(right.playerId));
}

/**
 * Drops what a save does not need to reconstruct the game. Per-game rows for
 * finished seasons are already folded into `playerSeasonStats`, and the event
 * log is a rolling feed rather than a record. Postseason rows are kept from
 * every season — they are the permanent playoff record and bounded at eleven
 * games a season — so a loaded career matches the one that was never saved.
 */
export function saveablePayload(state: Readonly<GameState>): GameState {
  const decisionAudits = retainedDecisionAudits(state.decisionAudits ?? []);
  return {
    ...state,
    playerGameStats: state.playerGameStats.filter((row) =>
      row.season === state.season || row.gameId.startsWith("playoff:")),
    decisionAudits,
    eventHistory: retainedDecisionEventHistory(state.eventHistory, decisionAudits, SAVED_EVENT_LIMIT)
  } as GameState;
}

interface SaveEnvelope {
  version: number;
  simulationVersion: string;
  season: Season;
  week: number;
  savedAt: string;
  /** Whose career this is. Belongs to the save, not to the simulation state. */
  playerProgramId: string | null;
  state: GameState;
}

export interface LoadedSave {
  state: GameState;
  playerProgramId: string | null;
  season: Season;
  week: number;
  savedAt: string;
}

/** Whether this runtime can compress. Node 18+ and every current browser can. */
export function compressionAvailable(): boolean {
  return typeof CompressionStream === "function" && typeof DecompressionStream === "function";
}

async function through(
  bytes: Uint8Array,
  // `CompressionStream` is typed as accepting `BufferSource` on the writable
  // side, which is wider than `Uint8Array` and so not assignable to a strict
  // TransformStream<Uint8Array, Uint8Array>. The pair is genuinely compatible.
  stream: { readable: ReadableStream<Uint8Array>; writable: WritableStream<BufferSource> }
): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
  const chunks: Uint8Array[] = [];
  const reader = source.pipeThrough(stream as unknown as ReadableWritablePair<Uint8Array, Uint8Array>).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * A save: gzipped UTF-8 JSON with a small header the loader can read without
 * decompressing. Streams through `CompressionStream`, so the payload is never
 * held twice.
 */
export async function encodeSave(
  state: Readonly<GameState>,
  playerProgramId: string | null = null
): Promise<Uint8Array> {
  const envelope: SaveEnvelope = {
    version: SAVE_FORMAT_VERSION,
    simulationVersion: state.identity.simulationVersion,
    season: state.season,
    week: state.week,
    savedAt: new Date().toISOString(),
    playerProgramId,
    state: saveablePayload(state)
  };
  const json = new TextEncoder().encode(JSON.stringify(envelope));
  if (!compressionAvailable()) return json;
  return through(json, new CompressionStream("gzip"));
}

export async function decodeSave(bytes: Uint8Array): Promise<LoadedSave> {
  // A gzip member always opens 0x1f 0x8b, so an uncompressed save written by a
  // runtime without CompressionStream still loads.
  const gzipped = bytes.length > 1 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  const json = gzipped ? await through(bytes, new DecompressionStream("gzip")) : bytes;
  const envelope = JSON.parse(new TextDecoder().decode(json)) as SaveEnvelope;
  if (envelope.version > SAVE_FORMAT_VERSION) {
    throw new Error(`This save was written by a newer version of the game (format ${envelope.version}).`);
  }
  const state = envelope.state;
  // Older saves predate these fields; fill them rather than crashing on load.
  state.playerSeasonStats ??= [];
  state.weekFocus ??= {};
  state.scoutingTarget ??= {};
  state.decisionAudits = (state.decisionAudits ?? []).map((audit) => ({
    ...audit,
    standingOutcome: audit.standingOutcome ?? null
  }));
  return {
    state,
    playerProgramId: envelope.playerProgramId ?? null,
    season: envelope.season,
    week: envelope.week,
    savedAt: envelope.savedAt
  };
}

/** What a save costs, for a screen that wants to say so. */
export async function saveSize(state: Readonly<GameState>): Promise<number> {
  return (await encodeSave(state)).length;
}
