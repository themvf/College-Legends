# Visual design exploration

Standalone HTML mockups, none of them wired to the app. Each is a self-contained
page — no build step, no external dependency, no font or script CDN — exploring a
visual direction for a real screen using real content from `packages/content`, so
treatments can be compared against each other rather than against a description.

Open `index.html` for the contact sheet, or any file directly in a browser.

| # | File | Direction | State |
|---|---|---|---|
| 01 | `program-marks.html` | Program identity — five shields | Reference |
| 02 | `scoreboard-math.html` | Moneyball x Arcade | Reference |
| 03 | `three-treatments.html` | Bloomberg x Moneyball / Bloomberg x Arcade / Palantir x Arcade | Reference |
| 04 | `war-room-mockup.html` | Broadcast scorebug | Current direction |

They run in order — each answers something the one before it raised.

**01 Shield System.** Five marks drawn from real generated programs (Keystone
Commonwealth, Lake Erie, Lone Star Metropolitan, Crescent City, Front Range),
one per program character, each at four sizes on both grounds. Produced the one
rule that carried forward: a dark shield needs a keyline or it disappears on a
dark UI.

**02 Scoreboard Math.** A single amber-CRT hue carrying both the numbers and the
drama, on the argument that the sim's appeal is arithmetic that happens to be
exciting. States its own three risks.

**03 Three Screens.** One recruiting board rendered three ways on deliberately
identical content — same four prospects, same numbers — so anything that differs
between the treatments is a design decision rather than a content difference.
Closes recommending the Palantir treatment.

**04 War Room.** Broadcast-scorebug UI: circular percentage gauges, italic
condensed numerals, a yard-line divider, field green against leather brown.
Started from a racing UI kit as a reference point, then retextured for football
and repalletted once the racing neon proved hard to read. The argument it lands
on is that the percentage circle and the italic numeral were already football's
own visual language — recruiting sites and broadcast scorebugs got there first.

## Two conventions worth keeping

**Compare on identical content.** Study 03 renders the same four prospects with
the same numbers across all three treatments for the same reason the engine's
distribution tests pool independent leagues: otherwise you cannot tell a design
difference from a content difference.

**Contrast is a bug; hue is a choice.** Study 04's first pass used
`--text-faint: #4a5266` on a `#0a0d14` ground — small caption labels sitting a
hair above the background, which read as "the text is hard to see" rather than as
a colour opinion. It was fixed by raising the text tokens, not by changing the
direction. Studies 01–03 were checked for the same defect and do not have it;
their muted tokens are properly light on dark and dark on light.

Studies 01–03 follow the viewer's theme. Study 04 deliberately commits to a
single dark ground — it is a night-game broadcast look, and inverting it would
defeat the point.
