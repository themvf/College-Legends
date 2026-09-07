# College Legends Design Documents

The current product direction and proposed build sequence are:

- [Core Game Specification](CORE_GAME_SPEC.md) — player lifecycle, business model, scope, and acceptance gates
- [Ordered Implementation Backlog](IMPLEMENTATION_BACKLOG.md) — reuse audit, dependencies, first playable, and later expansion
- [Graphics and Interface Specification](design/GRAPHICS_SPEC.md) — screen compositions, art families, and production gates

The V2 execution ledger remains the existing execution record. The new backlog starts by reconciling it; the design documents do not mark implementation complete.

Earlier plans and continuing technical references follow. The current core specification takes precedence on product direction where they conflict:

- [Product Vision](PRODUCT_VISION.md)
- [Game Design](GAME_DESIGN.md)
- [Technical Architecture](TECHNICAL_ARCHITECTURE.md)
- [Web and iOS Strategy](WEB_AND_IOS_STRATEGY.md)
- [Development Roadmap](DEVELOPMENT_ROADMAP.md)

Architecture decision records preserve the reasoning behind load-bearing choices:

- [ADR 001: Web-first](adr/001-web-first.md)
- [ADR 002: Simulation boundary](adr/002-simulation-boundary.md)
- [ADR 003: Possession-level game engine](adr/003-possession-game-engine.md)
- [ADR 004: Addressable partitioned RNG](adr/004-partitioned-rng.md)
- [ADR 005: Save strategy](adr/005-save-strategy.md)

## Document status

The product direction and architectural boundaries are committed. Formula values and detailed mechanics are hypotheses until headless simulation and human testing support them.
