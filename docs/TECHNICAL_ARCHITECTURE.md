# Technical Architecture

## Goals

The architecture must be deterministic enough to debug, fast enough for 130 AI programs, safe for long saves, portable across web and eventual iOS, and easy to balance without opening the UI.

## Proposed stack

- TypeScript throughout the domain, simulation, AI, analytics, and web app
- React for the management interface
- A Web Worker for live simulation
- IndexedDB for initial local browser saves
- Zod or an equivalent runtime validator at persistence boundaries
- Vitest for unit and integration tests
- Playwright for browser workflows
- A headless Node CLI for balance runs

## Repository shape

```text
apps/
  web/
  simulator-cli/

packages/
  model/
  content/
  simulation/
  ai/
  persistence/
  analytics/
  shared/

baseline/
docs/
```

## Domain state

Live state is held in memory as structured-clone-safe TypeScript data: plain objects, arrays, primitives, and explicitly supported cloneable values. Avoid class instances with behavior, functions, custom prototypes, UI objects, and platform handles inside GameState.

SQLite or IndexedDB is not the runtime simulation engine. Persistence loads and saves snapshots; the simulation operates on memory.

## Central contracts

```ts
interface SimulationIdentity {
  rootSeed: string;
  simulationVersion: string;
  balanceVersion: string;
  balanceConfiguration: BalanceConfiguration;
}

interface SimulationContext {
  identity: SimulationIdentity;
  rng: AddressableRandom;
  rules: BalanceConfiguration;
}

interface SimulationResult {
  state: GameState;
  events: GameEvent[];
}

function advanceWeek(
  state: Readonly<GameState>,
  commands: readonly GameCommand[],
  context: SimulationContext,
): SimulationResult;
```

The public convention is immutable input and returned state. Internals may use controlled mutation for performance, but callers must never depend on input mutation.

## Advance-week phases

```text
Validate commands
→ group contested actions
→ arbitrate contests
→ apply resolved actions
→ process weekly systems
→ emit events and projections
```

Recruiting, coaching, transfers, schedules, and other markets must resolve every competing action together. Array position or command order cannot influence results. Permutation tests enforce this.

## Randomness

A single consumed random stream is prohibited because adding one draw shifts all later outcomes.

Randomness is derived from stable addresses such as:

```ts
rng.at({
  season: 2027,
  week: 14,
  subsystem: "recruiting",
  entityId: prospect.id,
  purpose: "commitment-decision",
});
```

Named addresses partition outcomes by subsystem, program/entity, time, and purpose. The save captures the root seed plus the complete resolved balance configuration and simulation version. Reproduction claims are scoped to a compatible simulation version.

## Worker ownership

Advance Week runs outside the browser main thread. Initial messages may send complete state, but the preferred mature model is:

1. Load a validated save into the worker once.
2. Send commands and requested actions.
3. Receive progress messages, structured events, and UI projections.
4. Request periodic complete save snapshots.

This avoids repeatedly cloning a decades-old world. The UI should not read or mutate live worker state.

Worker requests and responses use discriminated unions with request IDs. Long operations report phases and progress. Errors cross the boundary in serialized form.

## Events

Events include stable identifiers, game time, entity IDs, before/after values, and structured contributing factors where useful. UI text is generated outside the simulation.

Events are outputs and historical evidence, but not the exclusive state model. Persistence stores the current snapshot plus selected historical events and summaries.

## Formulas and configuration

Primary causes use additive, interpretable terms with units. Bounded multipliers represent genuine amplification or penalties. Inputs and outputs are clamped explicitly.

Balance parameters live as validated data in packages/content, not scattered constants. Every run resolves and records its complete configuration.

## Persistence interface

```ts
interface SaveRepository {
  create(state: GameState): Promise<SaveMetadata>;
  load(id: SaveId): Promise<LoadedSave>;
  save(id: SaveId, snapshot: GameState, events: GameEvent[]): Promise<void>;
  list(): Promise<SaveMetadata[]>;
  export(id: SaveId): Promise<Blob>;
  import(file: Blob): Promise<LoadedSave>;
}
```

Adapters may include IndexedDB for web, in-memory for tests, server blob storage for backup, and native/SQLite storage for iOS. Simulation packages cannot import an adapter directly.

## Migrations

A version integer identifies a format; it does not migrate it. Ordered migrations are required for both stored schemas and serialized GameState.

Every load performs validation, ordered migration, and post-migration validation before state enters the worker. Save writes should be atomic where the adapter supports transactions.

## Testing layers

- Unit tests for eligibility, caps, formula boundaries, and deterministic outcomes
- Permutation tests proving contested results ignore input order
- Seed/address tests proving unrelated random calls do not shift outcomes
- Integration tests for weekly and season transitions
- Baseline simulations for distributions and drift
- Browser tests for commands, saves, import/export, and worker failures
