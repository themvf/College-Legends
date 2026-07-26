# ADR 004: Addressable partitioned RNG

**Status:** Accepted

## Context

One consumed seeded stream makes every later outcome shift when an unrelated random draw is added.

## Decision

Derive random values from stable addresses containing time, subsystem, entity/program, and purpose. Store the root seed, simulation version, and complete resolved balance configuration.

## Consequences

Unrelated systems do not perturb one another, debugging is more reliable, and tests can target exact outcomes. Reproduction across incompatible simulation versions is not promised.
