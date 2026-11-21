# Guo's Puzzle Duel IV: requirements traceability

Status: M0 draft (20 Nov 2026); M1 rows updated 20 Nov 2026; M2a rows updated 21 Nov 2026; M2b rows updated 21 Nov 2026. Every requirement ID of GDD v2.0 (sections 1 to 16, the §17 matrix and the §19 register) mapped to the rules in [`MECHANICS.md`](MECHANICS.md) or the decision in [`PLAN.md`](PLAN.md), the work package in [`implementation_plan.md`](implementation_plan.md) that delivers it, and the planned automated test (GDD Appendix B: "each module/PR must map requirements to tests").

**Conventions**

- Test titles start with the requirement ID so `pnpm test -t "G-009"` finds them. The suite is the package or app path (`sim/`, `rules/`, `host/`, `client/`, `content/`, `ai/`, `protocol/`; `e2e/` = Playwright; `tools/` = CI scripts).
- "Evidence" marks requirements proved by a report or manual check instead of (or in addition to) a unit test; the Release gate (QA-06) collects them.
- Status column: ⏳ planned; 🟡 partly proved (the part still open is named); ✅ proved by the named test. Each milestone PR updates the rows it closes with the test file.

## 1. Vision and invariants

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| V-001 | SIM-05, MZ-03, PU-04, BS-05 | 2a.2, 2a.8 | `sim/test/determinism.test.ts`: "V-001 / SIM-05: swapped players with mirrored inputs give the mirrored match" (property test over seeds and input logs) | ✅ |
| V-002 | PLAN §3 (no cloud) | 3.x, 7.2 | `e2e/offline.spec.ts`: "V-002: WiFi match completes with internet blocked"; Evidence: device report | ⏳ |
| V-003 | MV-10, SIM-04 | 2a.11, 4.3 | `sim/test/determinism.test.ts`: "M-005 / V-003 / INV-06: presentation choices are not part of the simulation"; characters and cosmetics arrive in M4 | 🟡 |
| V-004 | PLAN §3 | 3.4 | `host/authority.test.ts`: "V-004: client cannot take authority when the host stops" | ⏳ |
| INV-01 | SIM-02 | 2a.1 | `sim/test/outcome.test.ts`: "INV-01 / SIM-02: no ticks run after the match is over"; `e2e/match.spec.ts`: "TIME-02 / OC-04: Esc pauses (no ticks run)…" | ✅ |
| INV-02 | SIM-04, OC-05 | 2a.1, 3.3 | `sim/test/determinism.test.ts`: "INV-02: event IDs are unique and increasing", "WP 2a.1: a recorded replay plays back with identical hashes", "INV-02: a tampered replay is detected"; network replay of events in M3 | 🟡 |
| INV-03 | FL-02 | 2a.7 | `sim/test/flip.test.ts`: "INV-03 / FL-02: the rival walking over a token has no effect" | ✅ |
| INV-04 | OC-05 | 4.2 | `host/finalize.test.ts`: "INV-04: finalizing twice returns the first result" | ⏳ |
| INV-05 | SIM-02 | 2a.1, 3.4 | `e2e/match.spec.ts`: "TIME-02 / OC-04: Esc pauses (no ticks run)…"; grace deadline in M3 | 🟡 |
| INV-06 | SIM-04, BS-14 | 2a.11, 6.4 | `sim/test/determinism.test.ts`: "M-005 / V-003 / INV-06…"; `e2e/match.spec.ts`: "M-005: changing the theme mid-match keeps the state hash"; audio settings in M6 | 🟡 |
| INV-07 | MZ-07, BS-13 | 2a.2, 2b.9 | `sim/test/maze.test.ts`: "INV-07 / MZ-07 / MZ-03…"; `sim/test/maze.property.test.ts`: "INV-07 / MZ-07: routes hold with traps, pads and conveyors avoided and gates open", "BS-13 / INV-07: …boss traps and walls never cut an objective that was reachable"; authored levels in M5 | 🟡 M2b: generated mazes with environment; authored levels in M5 |

## 2. Match rules and outcomes

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| G-001 | PLAN D-15, D-02 | 2a.9, 2a.10, 3.2 | `e2e/match.spec.ts`: "G-001 / UI-05: Local VS runs a full match…", "G-001: Solo vs AI runs a full match…"; `ai/test/ai.test.ts`: bot-vs-bot; WiFi modes in M3 | 🟡 |
| G-002 | MZ-04 | 2a.2 | `sim/test/maze.test.ts`: "G-002 / MZ-04: P1 spawns North, P2 South…"; `sim/test/flip.test.ts`: "FL-03…" (exits are the entrances stored in the maze, never the live tiles) | ✅ |
| G-003 | EN-05 | 2a.8 | `sim/test/outcome.test.ts`: "G-003 / G-011: both knocked out on one tick = draw…"; `sim/test/energy.test.ts`: "EN-01…" | ✅ |
| G-004 | PLAN 2.7 (loadout) | 3.2 | `host/lobby.test.ts`: "G-004: accepted shared change resets both Ready; cosmetic change resets only owner" | ⏳ |
| G-005 | SIM-06 | 3.2 | `host/countdown.test.ts`: "G-005: GO on one tick for both clients; cancel before GO records nothing" | ⏳ |
| G-006 | — | 3.2 | `host/rematch.test.ts`: "G-006: rematch needs both Ready; new seed unless same seed chosen" | ⏳ |
| G-007 | BS-01, BS-06 | 2a.6 | `sim/test/boss.test.ts`: "G-007: only bombs lower the boss HP; never below 0"; `sim/test/combat.test.ts`: "BM-06 / G-007…" | ✅ |
| G-008 | FL-01, tick step 6 | 2a.7 | `sim/test/flip.test.ts`: "G-008 / FL-01: flip, token spawn and shortcut opening happen on one tick exactly once" | ✅ |
| G-009 | FL-02, FL-03 | 2a.7, 2a.8 | `sim/test/flip.test.ts`: "G-009: no token, the wrong token or a blocked exit never wins" | ✅ |
| G-010 | OC-01 | 2a.8 | `sim/test/outcome.test.ts`: "G-010 / OC-01: every cell of the in-tick matrix", "G-010: symmetric…" | ✅ |
| G-011 | OC-01 to OC-04, section 17 | 2a.8 | `sim/test/outcome.test.ts`: "G-011: both escape on one tick = draw", "G-003 / G-011…", "OC-04: Leave…"; disconnect cases in M3 | 🟡 |

## 3. Maze and themes

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| M-001 | MZ-01, MZ-02 | 2a.2 | `sim/test/maze.test.ts`: "M-001: %s maze has the GDD size and one base class per tile" | ✅ |
| M-002 | SIM-04, MZ-03 | 2a.2, 5.4 | `sim/test/maze.test.ts`: "M-002: the same seed and size reproduce the same maze"; Random codes in M5 | 🟡 |
| M-003 | MZ-07 | 2a.2, 2b.9 | `sim/test/maze.test.ts`: "M-003: a maze whose routes are cut is rejected by the route checker" | ✅ |
| M-004 | D-11 | 2a.2, 5.1 | `tools/fairness-report.test.ts`: "M-004: report lists path lengths, dead ends, hazards per seed"; Evidence: report for non-symmetric levels | ⏳ |
| M-005 | SIM-04 | 2a.11 | `sim/test/determinism.test.ts`: "M-005 / V-003 / INV-06…"; `e2e/match.spec.ts`: "M-005: changing the theme mid-match keeps the state hash" | ✅ |
| M-006 | — | 3.2, 5.4 | `host/lobby.test.ts`: "M-006: host theme choice reaches both clients; Random theme reproducible from the code" | ⏳ |

## 4. Environment

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| ENV-TR-01 | TR-03 | 2b.2 | `sim/test/traps.test.ts`: "ENV-TR-01: spike takes 1 Life once and immobilizes 15 ticks" | ✅ |
| ENV-TR-02 | TR-04 | 2b.2 | `sim/test/traps.test.ts`: "ENV-TR-02: shock hurts only in the dangerous window; it is never consumed" | ✅ |
| ENV-TR-03 | TR-05 | 2b.2 | `sim/test/traps.test.ts`: "ENV-TR-03: snare immobilizes 60 ticks without damage" | ✅ |
| ENV-TR-04 | TR-07, TR-08, FL-01 | 2b.2, 2b.8 | `sim/test/traps.test.ts`: "ENV-TR-04: boss trap removed when triggered, destroyed, expired or when the boss is defeated" | ✅ |
| ENV-TR-05 | TR-08 | 2b.2 | `sim/test/traps.test.ts`: "ENV-TR-05: boss trap harmless for 30 warning ticks, then active 300 ticks", "TR-08: a boss shock trap cycles from its own activation tick" | ✅ |
| ENV-TR-06 | SH-04 | 2b.2 | `sim/test/traps.test.ts`: "ENV-TR-06: shield on a trap destroys it and keeps 90 ticks"; `sim/test/matrix.test.ts`: "§17 shield…" | ✅ |
| ENV-TR-07 | TR-01, VI-04 | 2b.7, 6.7 | `sim/test/matrix.test.ts`: "§17 visibility: warnings always shown"; `e2e/match.spec.ts` M2b test (screenshots); high contrast and Reduced Effects in 6.7 | 🟡 M2b: fog and darkness; a11y modes in 6.7 |
| ENV-TR-08 | TR-10, section 17 | 2b.10 | `sim/test/matrix.test.ts`: "ENV-TR-08: trap vs teleport landing, conveyor push, same-tick damage"; `sim/test/traps.test.ts`: "TR-02…", "TR-06…" | ✅ |
| ENV-TP-01 | TP-01, TP-02 | 2b.3 | `sim/test/teleport.test.ts`: "ENV-TP-01: A→B and B→A for both players, no energy cost" | ✅ |
| ENV-TP-02 | TP-02, TP-03 | 2b.3 | `sim/test/teleport.test.ts`: "ENV-TP-02: blocked destination waits on the pad, transports on the first free tick", "TP-03…" | ✅ |
| ENV-TP-03 | TP-05 | 2b.3 | `sim/test/teleport.test.ts`: "ENV-TP-03: 30-tick cooldown, no A↔B oscillation in a long run" | ✅ |
| ENV-TP-04 | TP-06, EN-02 | 2b.3 | `sim/test/matrix.test.ts`: "§17 teleport: no Attack; transport on the entry tick; cooldown" | ✅ |
| ENV-TP-05 | TP-04 | 2b.3 | `sim/test/teleport.test.ts`: "ENV-TP-05: simultaneous entry swaps; same-destination guard moves nobody" | ✅ |
| ENV-TE-01 | TE-01 | 2b.4 | `sim/test/terrain.test.ts`: "ENV-TE-01: boost 90 ticks at 78 units/tick; refresh, no stacking" | ✅ |
| ENV-TE-02 | TE-02, TE-03 | 2b.4 | `sim/test/terrain.test.ts`: "ENV-TE-02: ice slides to the first non-ice tile; no turning; slid tiles give no Attack", "TE-03…" | ✅ |
| ENV-TE-03 | TE-05, EN-02 | 2b.4 | `sim/test/matrix.test.ts`: "§17 conveyor: only own share counts for Attack"; `sim/test/terrain.test.ts`: "TE-05: conveyor decision table…" | ✅ |
| ENV-TE-04 | EN-03, TR-09 | 2a.4, 2b.2 | `sim/test/energy.test.ts`: "CTRL-03 / EN-03…"; `sim/test/matrix.test.ts`: "§17 snare: counter resets and restarts after snare"; `sim/test/terrain.test.ts`: "TE-05: a blocked push leaves the player in place (ineligible for Defense)" | ✅ |
| ENV-TE-05 | TE-05, TE-06 | 2b.4, 2b.10 | `sim/test/matrix.test.ts`: "ENV-TE-05: ice/conveyor/boost/teleport priority table rows" | ✅ |
| ENV-PU-01 | PU-01, PU-02 | 2b.5 | `sim/test/pickups.test.ts`: "ENV-PU-01: Attack Orb +1, never above 3 (at cap it stays)" | ✅ |
| ENV-PU-02 | PU-01, PU-02 | 2b.5 | `sim/test/pickups.test.ts`: "ENV-PU-02: Defense Orb +1, never above 3" | ✅ |
| ENV-PU-03 | PU-01, EN-07 | 2b.5 | `sim/test/pickups.test.ts`: "ENV-PU-03: Heart +1 Life, never above 3" | ✅ |
| ENV-PU-04 | PU-04, PU-05 | 2b.5 | `sim/test/pickups.test.ts`: "ENV-PU-04: one grant per pickup; same-tick entry grants nobody; no respawn" | ✅ |
| ENV-PU-05 | PU-06 | 2b.5, 2b.9 | `sim/test/maze.property.test.ts`: "ENV-PU-05: counts per size and forbidden tiles respected" | ✅ |
| ENV-GA-01 | GA-01 | 2b.6 | `sim/test/gates.test.ts`: "ENV-GA-01: 120 open / 90 closed; the gate event matches passability" | ✅ |
| ENV-GA-02 | GA-01, GA-02 | 2b.6 | `sim/test/gates.test.ts`: "ENV-GA-02: 30-tick warning; closed gate blocks players and bombs; bombs never destroy it" | ✅ |
| ENV-GA-03 | GA-03, GA-06 | 2b.6 | `sim/test/gates.test.ts`: "ENV-GA-03: occupied or reserved gate stays open until clear; the cycle is delayed" | ✅ |
| ENV-GA-04 | GA-04, GA-05 | 2b.6 | `sim/test/gates.test.ts`: "ENV-GA-04: 100 000-tick run never seals an exit; closed ≤ 150 ticks" | ✅ |
| ENV-VI-01 | VI-02 | 2b.7 | `sim/test/visibility.test.ts`: "ENV-VI-01: fog mask radius 2 per player; outside fog the view is normal"; host-side filtering in M3 | 🟡 M2b: mask in sim; WiFi filtering in M3 |
| ENV-VI-02 | VI-03 | 2b.7 | `sim/test/visibility.test.ts`: "ENV-VI-02: darkness 120 ticks, radius 3 for every player" | ✅ |
| ENV-VI-03 | VI-04 | 2b.7 | `sim/test/matrix.test.ts`: "§17 visibility: warnings always shown"; renderer draws alerts, tokens, exits and the boss above the fog (`e2e/match.spec.ts` M2b test) | 🟡 M2b: shared screen; WiFi in M3 |
| ENV-VI-04 | VI-05 | 2b.7 | `sim/test/visibility.test.ts`: "ENV-VI-04: shared screen shows the union; WiFi shows own view"; WiFi rendering in M3 | 🟡 M2b: shared screen; WiFi in M3 |
| ENV-WA-01 | WL-01, BM-06 | 2a.5 | `sim/test/combat.test.ts`: "BM-06 / ENV-WA-01 / ENV-WA-02…" | ✅ |
| ENV-WA-02 | WL-02, BM-05, BM-06 | 2a.5 | `sim/test/combat.test.ts`: "BM-06 / ENV-WA-01 / ENV-WA-02: destructible walls fall only to Super Bombs; solid walls never" | ✅ |
| ENV-WA-03 | WL-03, BS-13 | 2b.8 | `sim/test/walls.test.ts`: "ENV-WA-03: boss wall expires at 240 ticks or breaks to a Super Bomb; revision increments", "ENV-WA-03: a boss wall blocks players, bombs and balls" | ✅ |
| ENV-WA-04 | WL-04, BM-06 | 2b.6 | `sim/test/walls.test.ts`: "ENV-WA-04: Super Bomb on a timed gate has no effect" | ✅ |
| ENV-WA-05 | MZ-06, FL-01 | 2a.7 | `sim/test/flip.test.ts`: "G-008 / FL-01…", "ENV-WA-05: both exits stay reachable without the shortcuts" | ✅ |
| ENV-WA-06 | MZ-08 | 2b.1, 3.3 | `sim/test/revision.test.ts`: "ENV-WA-06: every passability change increments revision with one event"; client prediction reconcile in M3 | 🟡 M2b: sim revision; reconcile in M3 |

## 5. Movement, energy, abilities

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| CTRL-01 | MV-06, D-02 | 2a.9, 3.5 | `e2e/match.spec.ts`: "CTRL-01: two players on one keyboard move at once; holding a direction while charging works"; touch in M3, remapping in M6 | 🟡 |
| CTRL-02 | EN-02, EN-04 | 2a.4 | `sim/test/energy.test.ts`: "CTRL-02…"; `sim/test/matrix.test.ts`: "§17 conveyor…", "§17 teleport…"; `sim/test/terrain.test.ts`: ice gives no Attack | ✅ |
| CTRL-03 | EN-03, EN-04 | 2a.4 | `sim/test/energy.test.ts`: "CTRL-03…"; `sim/test/matrix.test.ts`: "§17 snare: counter resets and restarts after snare" | ✅ |
| CTRL-04 | MV-01 to MV-09 | 2a.3 | `sim/test/movement.test.ts`: "CTRL-04 / MV-02…", "MV-03…", "MV-06…", "MV-07…", "MV-08…"; `sim/test/terrain.test.ts`: "MV-04: boosted steps keep their carry" | ✅ |
| AB-01 | BM-01, CH-05 | 2a.5 | `sim/test/combat.test.ts`: "AB-01: a bomb costs 1 Attack; at 0 Attack it is rejected with no cost" | ✅ |
| AB-02 | CH-01, CH-03, BM-06 | 2a.5 | `sim/test/combat.test.ts`: "CH-03 / AB-02…", "AB-02: the charge counts simulation ticks only" | ✅ |
| AB-03 | SH-03, SH-04 | 2a.5 | `sim/test/combat.test.ts`: "AB-03…"; `sim/test/traps.test.ts`: "ENV-TR-06: shield on a trap destroys it and keeps 90 ticks" | ✅ |
| AB-04 | SH-05, CH-03 | 2a.5 | `sim/test/combat.test.ts`: "AB-04: Super Shield only in the Escape Phase, 450 ticks, only a Super Bomb breaks it" | ✅ |
| AB-05 | CH-01 to CH-06, BM-02 to BM-07, SH-01 to SH-08 | 2a.5 | `sim/test/combat.test.ts`: bombs and shields suites (BM-02 to BM-06, CH-03, CH-04, SH-01, SH-02, SH-06, EN-06 / CH-06) | ✅ |

## 6. Boss and AI

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| BOSS-01 | BS-02, BS-14 | 2a.6 | `sim/test/boss.test.ts`: "BOSS-01 / BS-02: cooldown → warning → attack (1 tick) → recovery (30) → cooldown" | ✅ |
| BOSS-02 | BS-01, BS-02, BS-03 | 2a.6, 5.7 | `sim/test/boss.test.ts`: "BOSS-02 / BS-01…", "BOSS-02 / BS-03: Rage…"; balance report in M5 | 🟡 |
| BOSS-03 | BS-13, FL-01 | 2b.8 | `sim/test/patterns.test.ts`: "BOSS-03: no boss trap, wall, ball, ice or darkness left after defeat"; `sim/test/matrix.test.ts`: "§17 flip: boss hazards cleared" | ✅ |
| BOSS-04 | BS-04 to BS-12 (D-14 signed) | 2a.6, 2b.8 | `sim/test/boss.test.ts`: patterns 1–3, tier unlocks; `sim/test/patterns.test.ts`: "BOSS-04 pattern 4…" to "pattern 8…", "BS-14 / BS-04: a full Ultimate run uses all eight patterns and never repeats one" | ✅ |
| BOSS-05 | D-15 | 2a.10, 5.5 | `ai/test/ai.test.ts`: "BOSS-05: the bot only returns a command; it never changes the state"; AI tiers in M5 | 🟡 |

## 7. Timers and pausing

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| TIME-01 | FL-05 | 2a.8 | `sim/test/outcome.test.ts`: "TIME-01 / FL-05…", "TIME-01: Unlimited Time has no timer…" | ✅ |
| TIME-02 | SIM-02, PLAN 2.7 | 2a.9, 3.4 | `e2e/match.spec.ts`: "TIME-02 / OC-04: Esc pauses…" (Solo and Local pause at once); WiFi consent in M3 | 🟡 |
| TIME-03 | SIM-02 | 3.4 | `host/grace.test.ts`: "TIME-03: disconnect pauses; ability durations unchanged after a 30 s pause" | ⏳ |
| TIME-04 | — | 3.4 | `e2e/reconnect.spec.ts`: "TIME-04: reconnect restores positions, energy, boss and maze, then 3-2-1-GO" | ⏳ |
| TIME-05 | FL-05 | 2a.8, 6.5 | `sim/test/outcome.test.ts`: "TIME-05: urgency events at 2 min, 1 min, 30 s and 10 s remaining, once each"; restore in M3, sounds in M6 | 🟡 |

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
| UI-01 | FL-01 (markers), D-13 | 2a.11, 6.7 | Code: P1 blue disc "1", P2 red disc "2" with a square marker, exits blink with the owner colour (`client/src/game/renderer.ts`); high contrast in M6 | 🟡 |
| UI-02 | — | 1.5 | `e2e/routes.spec.ts`: "UI-02: every dashboard route opens" | ✅ M1: `apps/client/e2e/routes.spec.ts` |
| UI-03 | G-004 | 3.2 | `e2e/lobby.spec.ts`: "UI-03: proposals, Ready resets, countdown cancel" | ⏳ |
| UI-04 | — | 2a.11 | `e2e/match.spec.ts`: "UI-04: the HUD shows Life, energy, timer, phase and boss HP"; phone layout in M3 | 🟡 |
| UI-05 | OC-05 | 2a.9 | `e2e/match.spec.ts`: "G-001 / UI-05…" (results screen from the committed outcome); stored results in M4 | 🟡 |
| UI-06 | D-02c | 1.5, 6.7 | `client/i18n.test.ts`: "UI-06: every string in EN/ZH/DE"; `e2e/a11y.spec.ts`: "UI-06: text scale, reduced motion, remap, touch target ≥ 64 px" | 🟡 M1: EN/ZH/DE scaffolding in `packages/content/test/i18n.test.ts`, `apps/client/e2e/routes.spec.ts`; a11y in 6.7 |
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
| NET-09 | D-24 | 1.3, 7.3 | `host/security.test.ts`: "NET-09: foreign Origin and unknown paths blocked; loopback-only by default" | 🟡 M1: `apps/host/test/security.test.ts`, `host.test.ts`; security review in 7.3 |
| NET-10 | D-23, D-24 | 3.1 | `protocol/schema.test.ts`: "NET-10: heartbeat 2 s / 6 s, stale input 8 ticks, rate limit 60/s, token rotation" | ⏳ |

## 15. Persistence and startup

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| DB-01 | D-27 | 1.4 | `host/db.test.ts`: "DB-01: cold start, migrations with pre-migration backup" | ✅ M1: `apps/host/test/db.test.ts` |
| DB-02 | OC-05 | 4.2 | `host/db.test.ts`: "DB-02: fault injection between writes never leaves a partial commit" | ⏳ |
| DB-03 | D-26 | 4.6 | `host/backup.test.ts`: "DB-03: manual backup/restore on sample data; safety backup before import" | ⏳ |
| DB-04 | D-26 | 4.6 | `host/backup.test.ts`: "DB-04: 7/4/3 rotation; online backup API, never a raw WAL copy" | ⏳ |
| OPS-01 | — | 1.6, 7.1 | `tools/start-scripts.test.ts`: "OPS-01: closing the browser does not stop the host"; Evidence: SEA package run | 🟡 M1: `apps/host/test/host.test.ts`, `tools/test/start-scripts.test.ts`; SEA package in 7.1 |
| OPS-02 | D-25 | 1.3 | `host/ports.test.ts`: "OPS-02: 3000 busy → 3001 with matching URL, WebSocket and QR" | ✅ M1: `apps/host/test/ports.test.ts`, `host.test.ts` |
| OPS-03 | D-25 | 1.3, 1.4 | `host/ports.test.ts`: "OPS-03: range exhausted exits clearly; port owner untouched; second host on same data dir refused" | ✅ M1: `apps/host/test/ports.test.ts`, `db.test.ts`, `host.test.ts` |
| OPS-04 | D-27 | 1.4, 7.1 | `host/datadir.test.ts`: "OPS-04: user data outside install dir; update keeps profiles; LAN bind only when enabled" | 🟡 M1: `apps/host/test/datadir.test.ts`, `host.test.ts`; update keeps profiles in 7.1 |

## 16. Quality and release

| ID | Rules / decision | WP | Planned test(s) | Status |
|---|---|---|---|---|
| QA-01 | — | 1.1, 1.2 | CI: unit, sim goldens, property, bot-vs-bot, economy, E2E jobs produce artifacts | 🟡 M1: `.github/workflows/ci.yml` (unit, lint rule test, smoke, E2E with artifacts on Windows + Ubuntu); sim, bot and economy jobs join from M2a |
| QA-02 | — | 3.6 | `host/faults.test.ts`: "QA-02: latency 5–200 ms, jitter, loss, stalls, stale and duplicate inputs (logged fixtures)" | ⏳ |
| QA-03 | D-25 | 1.3, 1.6 | `tools/start-scripts.test.ts`: "QA-03: port cases on start.bat and start.sh (Windows, Linux, macOS)" | 🟡 M1: `tools/test/start-scripts.test.ts` in CI on Windows and Linux; macOS run in 7.2 |
| QA-04 | — | 7.2 | Evidence: device report (Windows host, Android, iPhone/iPad, desktop browsers) | ⏳ |
| QA-05 | — | 5.7 | Evidence: `docs/balance-report.md` (bot and human samples labelled) | ⏳ |
| QA-06 | — | 7.5 | Evidence: signed six-gate report | ⏳ |
| QA-07 | — | 7.5 | Evidence: defect register with zero open S1/S2 | ⏳ |

## 17. Cross-element interaction matrix (GDD §17)

One test per row in `sim/test/matrix.test.ts` (WP 2b.10, D-35). Answers are in [MECHANICS.md section 19](MECHANICS.md#19-cross-element-interaction-matrix-gdd-17).

| Row | Planned test | Status |
|---|---|---|
| Conveyor → Attack | `sim/test/matrix.test.ts`: "§17 conveyor: only own share counts for Attack" | ✅ |
| Teleport → Attack | `sim/test/matrix.test.ts`: "§17 teleport: no Attack; transport on the entry tick; cooldown" | ✅ |
| Snare → Defense | `sim/test/matrix.test.ts`: "§17 snare: counter resets and restarts after snare" | ✅ |
| Normal Shield → trap | `sim/test/matrix.test.ts`: "§17 shield: trap destroyed, shield keeps 90 ticks; multi-hit costs 1 Life" | ✅ |
| Super Bomb → destructible wall | `sim/test/matrix.test.ts`: "§17 super bomb: destructible walls in footprint removed" | ✅ |
| Super Bomb → boss wall | `sim/test/matrix.test.ts`: "§17 super bomb: boss wall removed" | ✅ |
| Super Bomb → timed gate | `sim/test/matrix.test.ts`: "§17 super bomb: gate unchanged" | ✅ |
| Super Bomb → Super Shield | `sim/test/matrix.test.ts`: "§17 super bomb: blockade removed on blast tick" | ✅ |
| Teleport → occupied exit | `sim/test/matrix.test.ts`: "§17 teleport: wait on pad until free" | ✅ |
| Player in closing gate | `sim/test/matrix.test.ts`: "§17 gate: pending close until clear" | ✅ |
| Fog/darkness → trap warning | `sim/test/matrix.test.ts`: "§17 visibility: warnings always shown" | ✅ |
| Boss defeated → trap cleanup | `sim/test/matrix.test.ts`: "§17 flip: boss hazards cleared" | ✅ |
| Boss defeated → shortcuts | `sim/test/matrix.test.ts`: "§17 flip: shortcuts open, routes valid without them" | ✅ |
| Two players → one pickup | `sim/test/matrix.test.ts`: "§17 pickup: same-tick entry grants nobody" | ✅ |
| Phase transition → tokens | `sim/test/matrix.test.ts`: "§17 flip: two tokens, once, same tick" | ✅ |
| Reconnect → environment state | `sim/test/matrix.test.ts`: "§17 reconnect: snapshot restores environment; nothing replayed" | ✅ |

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
| OPS-01 (register) | D-25 | `ops.firstPort`, `ops.lastPort` | Port tests (1.3) | ✅ M1: `packages/rules/test/balance.test.ts`, `apps/host/test/ports.test.ts` |
| OPS-02 (register) | D-26 | `backups.*` | Backup tests (4.6) | ⏳ |
| CONTENT-01 | D-21, D-20 | `packages/content` achievements and store | Manifest approval (4.4, 5.1) | ⏳ |

Note: the GDD §19 register reuses the names NET-01, NET-02, OPS-01 and OPS-02 for register items that differ from the requirements of the same name in sections 14 and 15; they are listed here with "(register)".
