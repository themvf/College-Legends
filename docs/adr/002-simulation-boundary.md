# ADR 002: Simulation boundary

**Status:** Accepted

## Context

UI-coupled logic prevents fast balance testing, complicates saves, and makes other platforms expensive.

## Decision

The simulation is a pure TypeScript package ignorant of React and persistence adapters. It accepts state, commands, and context and returns state plus structured events. Live web simulation runs in a Worker using structured-clone-safe data.

## Consequences

The same engine serves the CLI, web, AI, and eventual iOS. UI projections and worker protocols require explicit design, but balance runs no longer depend on rendering.
