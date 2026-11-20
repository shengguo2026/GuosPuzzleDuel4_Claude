# Guo's Puzzle Duel IV: requirements traceability

Status: M0 draft (20 Nov 2026). Every requirement ID of GDD v2.0 (sections 1 to 16, the §17 matrix and the §19 register) mapped to the rules in [`MECHANICS.md`](MECHANICS.md) or the decision in [`PLAN.md`](PLAN.md), the work package in [`implementation_plan.md`](implementation_plan.md) that delivers it, and the planned automated test (GDD Appendix B: "each module/PR must map requirements to tests").

**Conventions**

- Test titles start with the requirement ID so `pnpm test -t "G-009"` finds them. The suite is the package or app path (`sim/`, `rules/`, `host/`, `client/`, `content/`, `ai/`, `protocol/`; `e2e/` = Playwright; `tools/` = CI scripts).
- "Evidence" marks requirements proved by a report or manual check instead of (or in addition to) a unit test; the Release gate (QA-06) collects them.
- Status column: ⏳ planned (all rows at M0). Each milestone PR updates the rows it closes to ✅ with the test file.

## 1. Vision and invariants

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| V-001 | SIM-05, MZ-03, PU-04, BS-05 | 2a.2, 2a.8 | `sim/fairness.test.ts`: "V-001: swapped player IDs on a symmetric maze give the mirrored outcome" (property test over seeds and input logs) | ⏳ |
| V-002 | PLAN §3 (no cloud) | 3.x, 7.2 | `e2e/offline.spec.ts`: "V-002: WiFi match completes with internet blocked"; Evidence: device report | ⏳ |
| V-003 | MV-10, SIM-04 | 2a.11, 4.3 | `sim/cosmetics.test.ts`: "V-003: changing character and cosmetics leaves the state hash unchanged" | ⏳ |
| V-004 | PLAN §3 | 3.4 | `host/authority.test.ts`: "V-004: client cannot take authority when the host stops" | ⏳ |
| INV-01 | SIM-02 | 2a.1 | `sim/phase.test.ts`: "INV-01: exactly one phase at a time; only Boss/Escape run ticks" | ⏳ |
| INV-02 | SIM-04, OC-05 | 2a.1, 3.3 | `sim/events.test.ts`: "INV-02: event IDs unique; replayed events consumed once" | ⏳ |
| INV-03 | FL-02 | 2a.7 | `sim/tokens.test.ts`: "INV-03: rival cannot pick up the other token" | ⏳ |
| INV-04 | OC-05 | 4.2 | `host/finalize.test.ts`: "INV-04: finalizing twice returns the first result" | ⏳ |
| INV-05 | SIM-02 | 2a.1, 3.4 | `sim/pause.test.ts`: "INV-05: pause freezes sim timers"; `host/grace.test.ts`: "INV-05: grace deadline runs during pause" | ⏳ |
| INV-06 | SIM-04, BS-14 | 2a.11, 6.4 | `client/presentation.test.ts`: "INV-06: audio/visual settings never change sim inputs or hash" | ⏳ |
| INV-07 | MZ-07, BS-13 | 2a.2, 2b.9 | `sim/maze.property.test.ts`: "INV-07: every generated maze passes the route checker"; `content/levels.test.ts`: "INV-07: every authored level passes the route checker" | ⏳ |

## 2. Match rules and outcomes

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| G-001 | PLAN D-15, D-02 | 2a.9, 2a.10, 3.2 | `e2e/modes.spec.ts`: "G-001: Solo vs AI, Local VS, WiFi host+1 and host-only+2 each finish a match" | ⏳ |
| G-002 | MZ-04 | 2a.2 | `sim/entrances.test.ts`: "G-002: exit stays the original entrance after walls change" | ⏳ |
| G-003 | EN-05 | 2a.8 | `sim/life.test.ts`: "G-003: start 3 Life; 0 Life loses; simultaneous 0 is a draw" | ⏳ |
| G-004 | PLAN 2.7 (loadout) | 3.2 | `host/lobby.test.ts`: "G-004: accepted shared change resets both Ready; cosmetic change resets only owner" | ⏳ |
| G-005 | SIM-06 | 3.2 | `host/countdown.test.ts`: "G-005: GO on one tick for both clients; cancel before GO records nothing" | ⏳ |
| G-006 | — | 3.2 | `host/rematch.test.ts`: "G-006: rematch needs both Ready; new seed unless same seed chosen" | ⏳ |
| G-007 | BS-01, BS-06 | 2a.6 | `sim/boss.test.ts`: "G-007: only legal bomb damage lowers boss HP" | ⏳ |
| G-008 | FL-01, tick step 6 | 2a.7 | `sim/flip.test.ts`: "G-008: flip, token spawn and shortcut opening happen in the same tick exactly once" | ⏳ |
| G-009 | FL-02, FL-03 | 2a.7, 2a.8 | `sim/escape.test.ts`: "G-009: wrong token, no token and blocked exit never win" | ⏳ |
| G-010 | OC-01 | 2a.8 | `sim/outcome.test.ts`: "G-010: every outcome-matrix cell, with reversed input arrival order" | ⏳ |
| G-011 | OC-01 to OC-04, section 17 | 2a.8 | `sim/outcome.test.ts`: "G-011: escape vs KO vs timer on one tick, all 9 cells + out-of-tick cases" | ⏳ |

## 3. Maze and themes

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| M-001 | MZ-01, MZ-02 | 2a.2 | `sim/maze.test.ts`: "M-001: sizes 15/21/31, all tiles in bounds with one base class" | ⏳ |
| M-002 | SIM-04, MZ-03 | 2a.2, 5.4 | `sim/maze.property.test.ts`: "M-002: same seed and settings reproduce geometry and entities" | ⏳ |
| M-003 | MZ-07 | 2a.2, 2b.9 | `sim/maze.property.test.ts`: "M-003: unreachable mazes are rejected" (fuzzed broken mazes) | ⏳ |
| M-004 | D-11 | 2a.2, 5.1 | `tools/fairness-report.test.ts`: "M-004: report lists path lengths, dead ends, hazards per seed"; Evidence: report for non-symmetric levels | ⏳ |
| M-005 | SIM-04 | 2a.11 | `sim/theme.test.ts`: "M-005: same seed gives the same state hash in all five themes" | ⏳ |
| M-006 | — | 3.2, 5.4 | `host/lobby.test.ts`: "M-006: host theme choice reaches both clients; Random theme reproducible from the code" | ⏳ |

## 4. Environment

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| ENV-TR-01 | TR-03 | 2b.2 | `sim/traps.test.ts`: "ENV-TR-01: spike takes 1 Life once and immobilizes 15 ticks" | ⏳ |
| ENV-TR-02 | TR-04 | 2b.2 | `sim/traps.test.ts`: "ENV-TR-02: shock hurts only in the dangerous window" | ⏳ |
| ENV-TR-03 | TR-05 | 2b.2 | `sim/traps.test.ts`: "ENV-TR-03: snare immobilizes 60 ticks without damage" | ⏳ |
| ENV-TR-04 | TR-07, TR-08, FL-01 | 2b.2, 2b.8 | `sim/traps.test.ts`: "ENV-TR-04: boss trap removed when triggered, destroyed, expired, boss defeated" | ⏳ |
| ENV-TR-05 | TR-08 | 2b.2 | `sim/traps.test.ts`: "ENV-TR-05: boss trap harmless for 30 warning ticks, active 300 ticks" | ⏳ |
| ENV-TR-06 | SH-04 | 2b.2 | `sim/shields.test.ts`: "ENV-TR-06: shield on a trap destroys it and keeps 90 ticks" | ⏳ |
| ENV-TR-07 | TR-01, VI-04 | 2b.7, 6.7 | `client/visibility.test.ts`: "ENV-TR-07: trap and warning drawn under fog, darkness, high contrast, Reduced Effects" | ⏳ |
| ENV-TR-08 | TR-10, section 17 | 2b.10 | `sim/matrix.test.ts`: "ENV-TR-08: trap vs movement, teleport landing, conveyor, shield, same-tick damage" | ⏳ |
| ENV-TP-01 | TP-01, TP-02 | 2b.3 | `sim/teleport.test.ts`: "ENV-TP-01: A→B and B→A for both players, no energy cost" | ⏳ |
| ENV-TP-02 | TP-02, TP-03 | 2b.3 | `sim/teleport.test.ts`: "ENV-TP-02: blocked destination waits on the pad, transports when free" | ⏳ |
| ENV-TP-03 | TP-05 | 2b.3 | `sim/teleport.test.ts`: "ENV-TP-03: 30-tick cooldown, no A↔B oscillation in a long run" | ⏳ |
| ENV-TP-04 | TP-06, EN-02 | 2b.3 | `sim/energy.test.ts`: "ENV-TP-04: teleport grants no Attack and is not delayed by animation" | ⏳ |
| ENV-TP-05 | TP-04 | 2b.3 | `sim/teleport.test.ts`: "ENV-TP-05: simultaneous entry swaps; same-destination guard moves nobody" | ⏳ |
| ENV-TE-01 | TE-01 | 2b.4 | `sim/terrain.test.ts`: "ENV-TE-01: boost 90 ticks at 78 units/tick; refresh, no stacking" | ⏳ |
| ENV-TE-02 | TE-02, TE-03 | 2b.4 | `sim/terrain.test.ts`: "ENV-TE-02: ice slides to the first blocker or non-ice tile" | ⏳ |
| ENV-TE-03 | TE-05, EN-02 | 2b.4 | `sim/energy.test.ts`: "ENV-TE-03: conveyor push never adds Attack" | ⏳ |
| ENV-TE-04 | EN-03, TR-09 | 2a.4, 2b.2 | `sim/energy.test.ts`: "ENV-TE-04: snared, pushed, blocked ticks give no Defense" | ⏳ |
| ENV-TE-05 | TE-05, TE-06 | 2b.4, 2b.10 | `sim/matrix.test.ts`: "ENV-TE-05: ice/conveyor/boost/teleport priority table rows" | ⏳ |
| ENV-PU-01 | PU-01, PU-02 | 2b.5 | `sim/pickups.test.ts`: "ENV-PU-01: Attack Orb +1, never above 3" | ⏳ |
| ENV-PU-02 | PU-01, PU-02 | 2b.5 | `sim/pickups.test.ts`: "ENV-PU-02: Defense Orb +1, never above 3" | ⏳ |
| ENV-PU-03 | PU-01, EN-07 | 2b.5 | `sim/pickups.test.ts`: "ENV-PU-03: Heart +1 Life, never above 3" | ⏳ |
| ENV-PU-04 | PU-04, PU-05 | 2b.5 | `sim/pickups.test.ts`: "ENV-PU-04: one grant per pickup; same-tick entry grants nobody; no respawn" | ⏳ |
| ENV-PU-05 | PU-06 | 2b.5, 2b.9 | `sim/maze.property.test.ts`: "ENV-PU-05: counts per size and forbidden tiles respected" | ⏳ |
| ENV-GA-01 | GA-01 | 2b.6 | `sim/gates.test.ts`: "ENV-GA-01: 120 open / 90 closed; state event matches passability" | ⏳ |
| ENV-GA-02 | GA-01, GA-02 | 2b.6 | `sim/gates.test.ts`: "ENV-GA-02: 30-tick warning; closed gate blocks players and bombs; bombs never destroy it" | ⏳ |
| ENV-GA-03 | GA-03, GA-06 | 2b.6 | `sim/gates.test.ts`: "ENV-GA-03: occupied or reserved gate stays open until clear" | ⏳ |
| ENV-GA-04 | GA-04, GA-05 | 2b.6 | `sim/gates.test.ts`: "ENV-GA-04: 100 000-tick run never seals an exit; closed ≤ 150 ticks" | ⏳ |
| ENV-VI-01 | VI-02 | 2b.7 | `host/visibility.test.ts`: "ENV-VI-01: fog mask radius 2 per player" | ⏳ |
| ENV-VI-02 | VI-03 | 2b.7 | `host/visibility.test.ts`: "ENV-VI-02: darkness 120 ticks, radius 3" | ⏳ |
| ENV-VI-03 | VI-04 | 2b.7 | `client/visibility.test.ts`: "ENV-VI-03: warnings, markers, token, exit and HUD stay visible" | ⏳ |
| ENV-VI-04 | VI-05 | 2b.7 | `client/visibility.test.ts`: "ENV-VI-04: shared screen shows the union; WiFi shows own view" | ⏳ |
| ENV-WA-01 | WL-01, BM-06 | 2a.5 | `sim/walls.test.ts`: "ENV-WA-01: no bomb changes a solid wall" | ⏳ |
| ENV-WA-02 | WL-02, BM-05, BM-06 | 2a.5 | `sim/walls.test.ts`: "ENV-WA-02: Super Bomb removes destructible wall for good; normal bomb does not" | ⏳ |
| ENV-WA-03 | WL-03, BS-13 | 2b.8 | `sim/walls.test.ts`: "ENV-WA-03: boss wall expires at 240 ticks or breaks to a Super Bomb; revision increments" | ⏳ |
| ENV-WA-04 | WL-04, BM-06 | 2b.6 | `sim/walls.test.ts`: "ENV-WA-04: Super Bomb on a timed gate has no effect" | ⏳ |
| ENV-WA-05 | MZ-06, FL-01 | 2a.7 | `sim/flip.test.ts`: "ENV-WA-05: shortcuts open on the flip tick; exits reachable without them" | ⏳ |
| ENV-WA-06 | MZ-08 | 2b.1, 3.3 | `sim/revision.test.ts`: "ENV-WA-06: every passability change increments revision with one event"; `client/reconcile.test.ts`: "ENV-WA-06: prediction reconciles after geometry change" | ⏳ |

## 5. Movement, energy, abilities

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| CTRL-01 | MV-06, D-02 | 2a.9, 3.5 | `e2e/controls.spec.ts`: "CTRL-01: hold direction while charging on keyboard and touch; no P1/P2 key conflicts; remap rejects conflicts" | ⏳ |
| CTRL-02 | EN-02, EN-04 | 2a.4 | `sim/energy.test.ts`: "CTRL-02: +1 Attack per 12 own tiles; forced motion never counts; carry-over; no banking at 3" | ⏳ |
| CTRL-03 | EN-03, EN-04 | 2a.4 | `sim/energy.test.ts`: "CTRL-03: +1 Defense per 210 eligible ticks; pause and immobility do not count" | ⏳ |
| CTRL-04 | MV-01 to MV-09 | 2a.3 | `sim/movement.test.ts`: "CTRL-04: 5 ticks per tile, carry, reservation, turn buffer, facing" (one test per grid transition) | ⏳ |
| AB-01 | BM-01, CH-05 | 2a.5 | `sim/bombs.test.ts`: "AB-01: bomb costs 1 Attack; rejected at 0 with no cost" | ⏳ |
| AB-02 | CH-01, CH-03, BM-06 | 2a.5 | `sim/abilities.test.ts`: "AB-02: Super Bomb needs 60 active ticks, not shortened by pause" | ⏳ |
| AB-03 | SH-03, SH-04 | 2a.5 | `sim/shields.test.ts`: "AB-03: shield costs 1 Defense, lasts 90 ticks, removes trap" | ⏳ |
| AB-04 | SH-05, CH-03 | 2a.5 | `sim/shields.test.ts`: "AB-04: Super Shield Escape-only, 60-tick charge, 450 ticks, only Super Bomb breaks it" | ⏳ |
| AB-05 | CH-01 to CH-06, BM-02 to BM-07, SH-01 to SH-08 | 2a.5 | `sim/combat.test.ts`: "AB-05: combat truth table" (one test per row of BM-06 and each CH rule) | ⏳ |

## 6. Boss and AI

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| BOSS-01 | BS-02, BS-14 | 2a.6 | `sim/boss.test.ts`: "BOSS-01: warning → attack → recovery timing independent of rendering" | ⏳ |
| BOSS-02 | BS-01, BS-02, BS-03 | 2a.6, 5.7 | `sim/boss.test.ts`: "BOSS-02: HP and cooldowns per tier from balance file; Rage at < 30 %"; Evidence: balance report | ⏳ |
| BOSS-03 | BS-13, FL-01 | 2b.8 | `sim/flip.test.ts`: "BOSS-03: no boss trap, wall, ball, ice or darkness left after defeat" | ⏳ |
| BOSS-04 | BS-04 to BS-12 (D-14 signed) | 2a.6, 2b.8 | `sim/patterns.test.ts`: "BOSS-04: pattern N telegraph, geometry, hits and cleanup" (8 tests); "BOSS-04: tier unlocks 2/5/6/7/8 patterns" | ⏳ |
| BOSS-05 | D-15 | 2a.10, 5.5 | `ai/legal.test.ts`: "BOSS-05: bot emits only commands through the player command interface" | ⏳ |

## 7. Timers and pausing

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| TIME-01 | FL-05 | 2a.8 | `sim/timer.test.ts`: "TIME-01: default timers per size; Unlimited only in VS; expiry draw" | ⏳ |
| TIME-02 | SIM-02, PLAN 2.7 | 2a.9, 3.4 | `host/pause.test.ts`: "TIME-02: Solo immediate, Local either player, WiFi needs consent, 10 s request expiry, 5 min max" | ⏳ |
| TIME-03 | SIM-02 | 3.4 | `host/grace.test.ts`: "TIME-03: disconnect pauses; ability durations unchanged after a 30 s pause" | ⏳ |
| TIME-04 | — | 3.4 | `e2e/reconnect.spec.ts`: "TIME-04: reconnect restores positions, energy, boss and maze, then 3-2-1-GO" | ⏳ |
| TIME-05 | FL-05 | 2a.8, 6.5 | `sim/timer.test.ts`: "TIME-05: urgency events at 2 min/1 min/30 s/10 s, none in Unlimited, none duplicated after restore" | ⏳ |

## 8. Modes and progression

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| PROG-01 | D-16, D-17 | 5.2 | `host/campaign.test.ts`: "PROG-01: 40 levels, 120 stars, stars kept per star, next level unlocks" | ⏳ |
| PROG-02 | D-18, PLAN 2.7 | 5.3 | `host/challenges.test.ts`: "PROG-02: 25 challenges, medals; purchased access is not completion" | ⏳ |
| PROG-03 | D-19 | 5.4 | `host/random.test.ts`: "PROG-03: code reproduces maze; records isolated; guests cannot save mazes" | ⏳ |
| PROG-04 | D-16 to D-18 | 5.1 | `content/manifest.test.ts`: "PROG-04: manifest complete and every entry marked approved"; Evidence: Guo's level sign-off | ⏳ |
| PROG-05 | D-15 | 5.5 | `host/difficulty.test.ts`: "PROG-05: Standard couples tiers; Custom sets them separately; choice persists" | ⏳ |

## 9. Profiles

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| PROFILE-01 | D-22a | 4.1 | `host/profiles.test.ts`: "PROFILE-01: one profile cannot occupy two slots; remote creation needs host approval" | ⏳ |
| PROFILE-02 | — | 4.1 | `host/profiles.test.ts`: "PROFILE-02: guest match writes no ledger, progress or inventory" | ⏳ |
| PROFILE-03 | D-22a | 4.5 | `host/profiles.test.ts`: "PROFILE-03: all profile data survives a host restart" | ⏳ |
| PROFILE-04 | — | 4.1 | `host/profiles.test.ts`: "PROFILE-04: soft delete, 30-day restore without duplicate ledger; active profile undeletable" | ⏳ |
| PROFILE-05 | D-26 | 4.6 | `host/export.test.ts`: "PROFILE-05: corrupt archive rejected atomically; ID collision asks keep/replace after safety backup" | ⏳ |
| PROFILE-06 | OC-04 | 4.5 | `host/stats.test.ts`: "PROFILE-06: wins, losses, draws, disconnect draw, forfeit, interrupted counted separately" | ⏳ |

## 10. Economy

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| ECON-01 | OC-05, D-20 | 4.2 | `host/ledger.test.ts`: "ECON-01: duplicate purchase or result retry never double debits or grants" | ⏳ |
| ECON-02 | D-20 | 4.2, 5.7 | `tools/economy-sim.test.ts`: "ECON-02: credits per minute by mode and skill within 8–15"; Evidence: balance report | ⏳ |
| ECON-03 | MV-10 | 4.3 | `sim/cosmetics.test.ts`: "ECON-03: damage, hitbox and speed identical for all characters" | ⏳ |
| ECON-04 | D-20 | 4.3 | `host/store.test.ts`: "ECON-04: remote purchase or refund rejected without its own host approval" | ⏳ |
| ECON-05 | D-20 | 4.3 | `host/store.test.ts`: "ECON-05: refund within 10 min once; used or achievement items refused" | ⏳ |
| ECON-06 | PLAN 2.7 | 4.3, 5.3 | `host/store.test.ts`: "ECON-06: access purchase never marks completion; refund keeps earned records" | ⏳ |
| ECON-07 | D-20, balance file | 4.3, 5.7 | `rules/balance.test.ts`: "ECON-07: economy values come only from balance.v1.json"; Evidence: economy sign-off | ⏳ |

## 11. Achievements and Museum

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| MUS-01 | D-21 | 4.4 | `host/achievements.test.ts`: "MUS-01: each tier grants once per profile" | ⏳ |
| MUS-02 | D-22 | 5.6 | `e2e/museum.spec.ts`: "MUS-02: six rooms navigable" | ⏳ |
| MUS-03 | D-22 | 5.6 | `host/museum.test.ts`: "MUS-03: exhibit appears after committed achievement" | ⏳ |
| MUS-04 | D-22, PLAN 2.7 | 5.6 | `host/museum.test.ts`: "MUS-04: unshared exhibits unreadable to other room clients" | ⏳ |
| MUS-05 | D-21 | 4.4 | `content/achievements.test.ts`: "MUS-05: 33-entry manifest complete and approved" | ⏳ |

## 12. UI and accessibility

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| UI-01 | FL-01 (markers), D-13 | 2a.11, 6.7 | `e2e/a11y.spec.ts`: "UI-01: P1/P2 distinguishable in monochrome and high contrast" | ⏳ |
| UI-02 | — | 1.5 | `e2e/routes.spec.ts`: "UI-02: every dashboard route opens" | ⏳ |
| UI-03 | G-004 | 3.2 | `e2e/lobby.spec.ts`: "UI-03: proposals, Ready resets, countdown cancel" | ⏳ |
| UI-04 | — | 2a.11 | `e2e/hud.spec.ts`: "UI-04: HUD shows Life, energy, timer, phase, boss HP / token, goal, blockade on phone and shared screen" | ⏳ |
| UI-05 | OC-05 | 2a.9 | `e2e/results.spec.ts`: "UI-05: results read the committed outcome once" | ⏳ |
| UI-06 | D-02c | 1.5, 6.7 | `client/i18n.test.ts`: "UI-06: every string in EN/ZH/DE"; `e2e/a11y.spec.ts`: "UI-06: text scale, reduced motion, remap, touch target ≥ 64 px" | ⏳ |
| UI-07 | PLAN 2.7 | 6.5 | `e2e/language.spec.ts`: "UI-07: two devices in different languages show the same event" | ⏳ |

## 13. Audio and VFX

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| AV-01 | D-36 | 6.4 | `client/music.test.ts`: "AV-01: cue per theme and phase; stinger bridge never delays the phase event" | ⏳ |
| AV-02 | — | 6.4 | `client/mixer.test.ts`: "AV-02: critical cues outrank ambient under saturation" | ⏳ |
| AV-03 | PLAN 2.7 | 6.5 | `client/announcer.test.ts`: "AV-03: language, cooldown, no repeat after reconnect" | ⏳ |
| AV-04 | BS-14 | 6.6 | `client/vfx.test.ts`: "AV-04: every authoritative event maps to a cosmetic cue only" | ⏳ |
| AV-05 | SIM-04 | 6.6 | `client/quality.test.ts`: "AV-05: quality modes keep hitboxes and tick timing" | ⏳ |
| AV-06 | — | 6.6, 7.2 | Evidence: frame-time captures on real devices (60/30 FPS targets) | ⏳ |

## 14. Network

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| NET-01 | PLAN §3 | 1.3, 3.2 | `e2e/topology.spec.ts`: "NET-01: play+host, host-only and Solo configurations run" | ⏳ |
| NET-02 | section 17 step 1 | 3.1 | `protocol/validate.test.ts`: "NET-02: client state claims rejected; only commands accepted" | ⏳ |
| NET-03 | SIM-01 | 3.3 | `host/snapshots.test.ts`: "NET-03: 30 Hz sim, 20 Hz snapshots, events carry match/tick/event IDs, no duplicate one-shots" | ⏳ |
| NET-04 | MZ-08 | 3.3 | `client/reconcile.test.ts`: "NET-04: injected lag converges to host state" | ⏳ |
| NET-05 | D-24 | 3.2 | `host/join.test.ts`: "NET-05: unknown device cannot take a slot without approval" | ⏳ |
| NET-06 | OC-04 | 3.4 | `host/grace.test.ts`: "NET-06: reconnect at 29 s accepted, 31 s forfeit, deadline never reset" | ⏳ |
| NET-07 | OC-04 | 3.4 | `host/grace.test.ts`: "NET-07: Leave forfeits; dual expiry is a neutral draw regardless of callback order" | ⏳ |
| NET-08 | OC-04 | 3.4, 4.2 | `host/crash.test.ts`: "NET-08: restart after crash marks interrupted and grants nothing" | ⏳ |
| NET-09 | D-24 | 1.3, 7.3 | `host/security.test.ts`: "NET-09: foreign Origin and unknown paths blocked; loopback-only by default" | ⏳ |
| NET-10 | D-23, D-24 | 3.1 | `protocol/schema.test.ts`: "NET-10: heartbeat 2 s / 6 s, stale input 8 ticks, rate limit 60/s, token rotation" | ⏳ |

## 15. Persistence and startup

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| DB-01 | D-27 | 1.4 | `host/db.test.ts`: "DB-01: cold start, migrations with pre-migration backup" | ⏳ |
| DB-02 | OC-05 | 4.2 | `host/db.test.ts`: "DB-02: fault injection between writes never leaves a partial commit" | ⏳ |
| DB-03 | D-26 | 4.6 | `host/backup.test.ts`: "DB-03: manual backup/restore on sample data; safety backup before import" | ⏳ |
| DB-04 | D-26 | 4.6 | `host/backup.test.ts`: "DB-04: 7/4/3 rotation; online backup API, never a raw WAL copy" | ⏳ |
| OPS-01 | — | 1.6, 7.1 | `tools/start-scripts.test.ts`: "OPS-01: closing the browser does not stop the host"; Evidence: SEA package run | ⏳ |
| OPS-02 | D-25 | 1.3 | `host/ports.test.ts`: "OPS-02: 3000 busy → 3001 with matching URL, WebSocket and QR" | ⏳ |
| OPS-03 | D-25 | 1.3, 1.4 | `host/ports.test.ts`: "OPS-03: range exhausted exits clearly; port owner untouched; second host on same data dir refused" | ⏳ |
| OPS-04 | D-27 | 1.4, 7.1 | `host/datadir.test.ts`: "OPS-04: user data outside install dir; update keeps profiles; LAN bind only when enabled" | ⏳ |

## 16. Quality and release

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| QA-01 | — | 1.1, 1.2 | CI: unit, sim goldens, property, bot-vs-bot, economy, E2E jobs produce artifacts | ⏳ |
| QA-02 | — | 3.6 | `host/faults.test.ts`: "QA-02: latency 5–200 ms, jitter, loss, stalls, stale and duplicate inputs (logged fixtures)" | ⏳ |
| QA-03 | D-25 | 1.3, 1.6 | `tools/start-scripts.test.ts`: "QA-03: port cases on start.bat and start.sh (Windows, Linux, macOS)" | ⏳ |
| QA-04 | — | 7.2 | Evidence: device report (Windows host, Android, iPhone/iPad, desktop browsers) | ⏳ |
| QA-05 | — | 5.7 | Evidence: `docs/balance-report.md` (bot and human samples labelled) | ⏳ |
| QA-06 | — | 7.5 | Evidence: signed six-gate report | ⏳ |
| QA-07 | — | 7.5 | Evidence: defect register with zero open S1/S2 | ⏳ |

## 17. Cross-element interaction matrix (GDD §17)

One test per row in `sim/matrix.test.ts` (WP 2b.10, D-35). Answers are in [MECHANICS.md section 19](MECHANICS.md#19-cross-element-interaction-matrix-gdd-17).

| Row | Planned test | Status |
|---|---|---|
| Conveyor → Attack | "§17 conveyor: only own share counts for Attack" | ⏳ |
| Teleport → Attack | "§17 teleport: no Attack; next-tick transport; cooldown" | ⏳ |
| Snare → Defense | "§17 snare: counter resets and restarts after snare" | ⏳ |
| Normal Shield → trap | "§17 shield: trap destroyed, shield keeps 90 ticks; multi-hit costs 1 Life" | ⏳ |
| Super Bomb → destructible wall | "§17 super bomb: destructible walls in footprint removed" | ⏳ |
| Super Bomb → boss wall | "§17 super bomb: boss wall removed" | ⏳ |
| Super Bomb → timed gate | "§17 super bomb: gate unchanged" | ⏳ |
| Super Bomb → Super Shield | "§17 super bomb: blockade removed on blast tick" | ⏳ |
| Teleport → occupied exit | "§17 teleport: wait on pad until free" | ⏳ |
| Player in closing gate | "§17 gate: pending close until clear" | ⏳ |
| Fog/darkness → trap warning | "§17 visibility: warnings always shown" | ⏳ |
| Boss defeated → trap cleanup | "§17 flip: boss hazards cleared" | ⏳ |
| Boss defeated → shortcuts | "§17 flip: shortcuts open, routes valid without them" | ⏳ |
| Two players → one pickup | "§17 pickup: same-tick entry grants nobody" | ⏳ |
| Phase transition → tokens | "§17 flip: two tokens, once, same tick" | ⏳ |
| Reconnect → environment state | "§17 reconnect: snapshot restores environment; nothing replayed" | ⏳ |

## 18. Provisional values register (GDD §19)

| ID | Closed by | Where the value lives | Sign-off evidence | Status |
|---|---|---|---|---|
| BAL-01 | D-14, BS-01 | `boss.tiers.*.hp` | Encounter calibration (5.7) | ⏳ |
| BAL-02 | FL-05 | `match.timerTicks` | Match-length play-test (2a, 5.7) | ⏳ |
| BAL-03 | D-28, TR-03 to TR-08 | `traps.*` | Play-test M2b | ⏳ |
| BAL-04 | D-29, TP-02 to TP-05 | `teleporters.cooldownTicks` | `sim/teleport.test.ts` | ⏳ |
| BAL-05 | D-30, MV-02, TE-01 to TE-06 | `movement.*`, `terrain.*` | Play-test M2b | ⏳ |
| BAL-06 | D-32, D-33 | `gates.*`, `visibility.*` | Play-test M2b, a11y check | ⏳ |
| BAL-07 | D-14 (signed), BS-07 | `boss.patterns.*` | `sim/patterns.test.ts` + play-test | ⏳ |
| BAL-08 | D-05 to D-09, BM-05, BM-06 | `bombs.*`, `shields.*` | `sim/combat.test.ts` | ⏳ |
| BAL-09 | D-16 to D-18 | `packages/content` manifests | Guo's level sign-off before M5 | ⏳ |
| BAL-10 | D-20 | `economy.*` | Economy simulation (5.7) | ⏳ |
| BAL-11 | D-12, section 17, OC-01 | — (rules, not values) | `sim/outcome.test.ts` | ⏳ |
| BAL-12 | D-31, PU-01 to PU-06 | `pickups.perSize` | `sim/pickups.test.ts` | ⏳ |
| NET-01 (register) | D-23 | `network.heartbeatTicks`, `network.unresponsiveTicks`, `network.interpolationMs` | Network tests (3.6) | ⏳ |
| NET-02 (register) | D-24 | `network.maxMessagesPerSecond` | Security tests (7.3) | ⏳ |
| OPS-01 (register) | D-25 | `ops.firstPort`, `ops.lastPort` | Port tests (1.3) | ⏳ |
| OPS-02 (register) | D-26 | `backups.*` | Backup tests (4.6) | ⏳ |
| CONTENT-01 | D-21, D-20 | `packages/content` achievements and store | Manifest approval (4.4, 5.1) | ⏳ |

Note: the GDD §19 register reuses the names NET-01, NET-02, OPS-01 and OPS-02 for register items that differ from the requirements of the same name in sections 14 and 15; they are listed here with "(register)".
