# ADR 005: Save strategy

**Status:** Accepted

## Context

Browser storage can be evicted, save formats will change rapidly, and future web/iOS adapters differ.

## Decision

Keep persistence behind an interface. Start with IndexedDB autosaves, rotating slots, persistent-storage requests, visible status, and file export/import. Validate and migrate every load. Evaluate cloud backup as tester saves become valuable.

## Consequences

The alpha avoids making accounts mandatory while providing a user-controlled backup. Migrations and export safety are day-one work. Native or server adapters can replace IndexedDB without entering the simulation package.
