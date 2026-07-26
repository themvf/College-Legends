# Web and iOS Strategy

## Decision

Launch College Legends first as a private, desktop-primary responsive web game. Validate the loop and balance before packaging for iOS.

One web deployment can deliver frequent recruiting and balance changes without App Store review delay. The same platform-neutral simulation remains available to future desktop or native shells.

## Web alpha target

Desktop browsers are the primary design surface because rosters, recruiting boards, depth charts, finances, and history are information-dense.

Tablets should be fully operable. Phones are a supported secondary surface during alpha, with focused workflows such as inbox, shortlist, player profile, alerts, quick allocations, and results. Desktop screens must not be simplified merely to force identical phone layouts.

No core action may require hover. Touch targets, keyboard navigation, focus states, and safe-area handling remain requirements.

## Performance

All material simulation work runs in a Web Worker. The main thread owns presentation and interaction.

The worker reports progress for week advancement, season rollover, save serialization, and long simulations. Performance budgets must be measured on representative phones, not inferred from desktop results.

The worker may retain authoritative runtime state and return projections instead of cloning the full world every week.

## Save safety

The initial web build provides:

- IndexedDB autosaves
- Multiple rotating autosave slots
- A request for navigator.storage.persist()
- Visible persistence status
- Save export to a downloadable file from day one
- Import with validation and migration
- Clear warnings when durable storage is not granted

Browser storage remains evictable under some conditions. File export is the minimum protection for valuable alpha saves. Server backup may be added before testers accumulate dozens of hours, with deliberate decisions around authentication, ownership, conflicts, privacy, and cost.

## Private alpha

Human invitations begin only after the headless runner produces acceptable distributions. Testers can judge whether choices, stories, and pacing are fun; they should not be used as the primary detector for mathematically broken development, scoring, or roster turnover.

Initial access can be invite-only. Accounts and cloud synchronization are not prerequisites for the first playable loop unless save durability testing shows the tradeoff favors a small server-side blob store.

## iOS path

Capacitor is the leading first evaluation after the web game proves itself, but it is not yet a permanent commitment.

An iOS build should bundle game assets locally instead of merely loading the public website. It must feel like a substantive game rather than a thin wrapper. Native-feeling navigation, offline play, haptics, notifications, local saves, and optional Game Center or purchases can strengthen the experience.

Before iOS becomes load-bearing, profile:

- WKWebView memory on older supported devices
- Decades-long save size and load time
- Worker and structured-clone behavior
- Background/foreground save safety
- Touch depth-chart interactions
- Offline and migration behavior
- App Store packaging and review requirements

If the web interface cannot deliver the desired phone experience without harmful compromises, a separate simplified mobile presentation may use the same model, simulation, commands, and persistence contracts.

## Release sequence

1. Headless simulation kernel
2. Statistical baseline
3. Worker protocol
4. Desktop-primary web interface
5. Durable local save protections
6. Private web alpha
7. Optional cloud backup
8. Real-device Safari profiling
9. Capacitor prototype
10. iOS release planning
