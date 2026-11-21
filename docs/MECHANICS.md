# Guo's Puzzle Duel IV: game mechanics (canonical rules)

Status: **approved by Guo on 20 Nov 2026** (M0), including all 24 details in section 20. Sources: GDD v2.0 ([`Guos_Puzzle_Duel_IV_Full_Fidelity_GDD_v2.0.pdf`](Guos_Puzzle_Duel_IV_Full_Fidelity_GDD_v2.0.pdf)) and the decisions D-01 to D-36 in [`PLAN.md`](PLAN.md).

This document turns the decided design into exact, numbered, testable rules. Code in `packages/sim` and its tests implement these rules and cite their numbers (for example `it('BM-04 / AB-05: bomb explodes in front of a wall', …)`). Every tunable number lives in [`packages/rules/balance.v1.json`](../packages/rules/balance.v1.json) and is referenced here as `balance:<path>`; the value in brackets is the current default. Requirement → test mapping is in [`TRACEABILITY.md`](TRACEABILITY.md).

**How to read the tags**

- `[D-xx]` or a GDD ID: where the rule comes from. Nothing tagged this way is new.
- **🟡 M0** marks a detail that PLAN.md does not state exactly and that I had to fix so the rule can be coded and tested (mostly CTRL-04 "canonical equations" and the geometry of the signed boss patterns). Every 🟡 item is listed again in [section 20](#20-m0-details-that-need-your-ok) for your OK. All their numbers are PROVISIONAL in the balance file.

---

## 1. Simulation basics

- **SIM-01** The host simulates at **30 ticks per second** (`balance:sim.tickRateHz` [30]) [NET-03, D-01]. One tick = 1/30 s. All durations in this document are converted to ticks with `ticks = round(seconds × 30)` and stored as ticks in the simulation.
- **SIM-02** Simulation time advances only in the phases Boss and Escape (INV-01). Setup, countdown, paused and terminal phases run no gameplay ticks. Pause freezes every gameplay timer (abilities, traps, gates, boss, match timer) but not network grace deadlines (INV-05, TIME-03).
- **SIM-03** All gameplay state is integer: tiles, tick counters, movement progress units, energy counters, HP. No floating point in `packages/sim`.
- **SIM-04** Randomness comes from one seeded PRNG stream per match, drawn only inside the tick pipeline in a fixed order (section 17). Same seed + same input log ⇒ identical state hash on every tick (M-002, INV-02). Themes, cosmetics, characters, language, graphics quality and audio never read or write simulation state (M-005, V-003, INV-06, AV-05).
- **SIM-05** P1 and P2 are processed **symmetrically**: no step iterates "P1 first" in a way that can change an outcome. Where two players request the same thing on one tick, a rule below names the symmetric result (V-001, G-010).
- **SIM-06** Countdown 3 → 2 → 1 → GO is host-scheduled, 1 s per step (`balance:match.countdownStepTicks` [30]); GO is simulation tick 0 (G-005). A countdown cancelled before GO creates no match record.

## 2. Maze, coordinates and tile classes

- **MZ-01** Sizes: Small 15×15, Medium 21×21, Large 31×31 tiles (M-001). Coordinates `(x, y)`, origin top-left, North = smaller y.
- **MZ-02** Every tile has exactly one **base class**: `floor`, `solid wall`, `destructible wall`, `arena core`, `sealed shortcut`, `timed gate`, `entrance`. Environment elements on floor tiles are **entities** (trap, teleporter pad, boost, ice, conveyor, pickup, fog region) with stable IDs (Appendix A schema). Shields, boss walls, bombs, boss balls and tokens are dynamic entities.
- **MZ-03** **Point symmetry (VS, Random, mirrored levels)** [D-11 A]: the maze is generated for one half and rotated 180°: tile `(x, y)` maps to `(W−1−x, H−1−y)` with the same base class and an entity of the same kind (direction-bearing entities, i.e. conveyors, rotate 180°). Authored levels may be non-symmetric (D-11 B); their manifest says so and the fairness report (M-004) is produced.
- **MZ-04** **Entrances** [G-002]: P1 spawns on the North entrance, P2 on the South entrance (its point-symmetric partner). Their coordinates are stored once at match start and never change, whatever happens to the maze. P1's exit is the South entrance, P2's exit the North entrance.
- **MZ-05** **Boss arena** [D-11]: centred on the maze centre `(cx, cy)`. Small and Medium: arena core 3×3 (Chebyshev radius 1) inside an open ring 5×5 (radius 2). Large: core 5×5 (radius 2) in ring 7×7 (radius 3). `coreRadius` = 1 or 2 (`balance:boss.arena`). The ring is floor and is reachable from both entrances from tick 0. The core is impassable for players and bombs while the boss lives.
- **MZ-06** **Sealed shortcuts** [D-34, ENV-WA-05]: sealed doors in point-symmetric pairs on routes from the arena toward the exits: Small 1 pair, Medium and Large 2 pairs (`balance:maze.shortcutPairs`). Visible from tick 0 (crown symbol). Until the phase flip they behave like solid walls (block players, bombs and boss attacks; no bomb can open them). On the flip tick they become floor.
- **MZ-07** **Route guarantee** [D-10, M-003, INV-07]: the validator proves, with all shortcuts sealed, all destructible walls intact, every timed gate treated as "passable when open" and all traps avoidable, that these routes exist for each player: spawn → arena ring; arena ring → token tile; token tile → own exit. A maze or level that fails is rejected (generator re-rolls; an authored level fails its content test). Maze traps are never placed on a tile that every such route crosses (a cut tile) [D-28].
- **MZ-08** **Maze revision** [ENV-WA-06]: an integer that increases by 1 on every tick in which passability of any tile changes (wall destroyed, boss wall raised or removed, shield placed or removed, gate opened or closed, shortcut opened, core cleared). The tick's event list carries the changed tiles.

## 3. Movement

- **MV-01** **Tile-locked steps** [D-01]: a player always has a **logical tile**. Moving means performing a **step** from the logical tile to an orthogonal neighbour. A step has a direction, a kind (own, conveyor, ice, own-with-conveyor) and a progress counter in **units**: one tile = **300 units** (`balance:movement.unitsPerTile`).
- **MV-02** **Step speeds** (units per tick):
  - own step 60 (`balance:movement.ownUnitsPerTick`) ⇒ 5 ticks per tile = 6 tiles/s [D-01];
  - own step while boosted 78 (+30 %) [D-30] ⇒ 4, 4, 4, 3 … ticks per tile with carry (MV-04);
  - ice slide 60 (one tile per normal step) [D-30];
  - conveyor push 50 ⇒ 6 ticks per tile [D-30];
  - own step along the conveyor arrow: 60 + 50 = 110 ⇒ 3 ticks per tile ("moving with the arrow is faster") 🟡 M0.
- **MV-03** A step is **committed** when it starts: the destination must be passable at that tick (MV-08), and from then on the destination is **reserved** for that player. The step always runs to completion; there is no reversal mid-step 🟡 M0. The logical tile changes to the destination on the tick progress reaches 300 ("the player **enters** the tile"). Visual position is interpolated by the client only.
- **MV-04** **Carry**: when a step completes with progress above 300, the excess is carried into the next step if the player starts another step on the very next decision; otherwise it is dropped. This makes the boosted cadence exact over time without fractions.
- **MV-05** **Step decision**: in step 1 of a tick (section 17), a player who is not mid-step and not immobilized chooses at most one step, by the priority of D-30 (teleport > ice slide > conveyor push > own input). Teleports never compete here because they happen on the entry tick itself (TP-02); a player waiting on a blocked pad decides like any other player.
  1. On an ice tile entered by a step in direction `d` and the next tile in `d` is passable ⇒ ice slide in `d`.
  2. On a conveyor tile with arrow `c` (table TE-05).
  3. Own input: the buffered turn if its next tile is passable, else the held direction if its next tile is passable, else no step.
- **MV-06** **Input model** [D-02, CTRL-01]: each player's command stream gives per tick a **held direction** (or none) and an optional **turn request**.
  - Keyboard: held direction = the most recently pressed direction key that is still held; opposite or multiple keys never cancel each other (most recent wins). A turn request is created by pressing a direction that is not passable yet and is kept for **8 ticks** (`balance:movement.keyboardTurnBufferTicks`) 🟡 M0 (cornering buffer).
  - Touch swipe: the swipe sets the held direction, which persists until the player is stopped by a blocker or taps to stop (D-02a); a swipe toward a not-yet-passable direction becomes a turn request that persists until taken, replaced or cancelled by a stop tap [D-02].
  - Touch D-pad behaves like the keyboard.
- **MV-07** **Facing** [D-05]: the last direction the player pressed or swiped, even if no step was possible (so a player standing next to a wall or the boss can aim at it) 🟡 M0. Forced movement never changes facing. Initial facing: P1 South, P2 North.
- **MV-08** **Passable** for a player step: base class floor, entrance, opened shortcut, cleared arena core, or open timed gate; and no shield, Super Shield or boss wall on it. Players never block each other and may share a tile [D-31]. A tile is **occupied** by a player if it is that player's logical tile or reserved destination.
- **MV-09** **Immobilized** players (spike, snare) do not start steps and are not moved by conveyors or ice; a teleport pending on their tile waits. They may still throw bombs, place shields and charge 🟡 M0 (immobilize affects movement only).
- **MV-10** No speed difference between characters or cosmetics (ECON-03, V-003).

## 4. Energy and Life

- **EN-01** Attack and Defense: start **1**, cap **3** each, integer segments [CTRL-02, CTRL-03]. Starting energy can be overridden only by level content (Scarce Energy challenges start at 0) [D-18].
- **EN-02** **Attack regeneration** [CTRL-02, D-04]: each tick a player's own step advances, the player's **voluntary progress** increases by the own share of that tick's progress (60 normally, 78 boosted; never the conveyor's 50 and never ice or teleport). When voluntary progress reaches `attackTiles × 300` (preset, Normal 12 tiles = 3600 units), Attack +1 and that amount is subtracted. Progress carries over when the player stops. At Attack 3 voluntary progress does not increase (no banking).
- **EN-03** **Defense regeneration** [CTRL-03, ENV-TE-04, D-04]: a tick is **eligible** if all hold: no held direction and no turn request; not mid-step; no step started; not immobilized; not moved by a conveyor, ice or teleport this tick and not standing on a conveyor that is held back (TE-05 row "against"); not charging either ability; the player's own Shield or Super Shield is not on the field; Defense < 3. Each eligible tick adds 1 to the stationary counter; any ineligible tick resets it to 0. At `defenseTicks` (Normal 210 = 7.0 s) Defense +1 and the counter resets to 0.
- **EN-04** **Energy presets** [D-04] (`balance:energy.presets`): Tactical 15 tiles / 9 s, **Normal 12 tiles / 7 s (default)**, Fast 9 tiles / 5 s. VS and Custom matches use the host's shared setting; Campaign and Challenges use the level's fixed preset.
- **EN-05** **Life** [G-003, D-07]: start 3, cap 3 (Iron Will content may start at 1). Sources of Life loss: boss attacks, Spike traps, Shock traps. Bombs never damage players.
- **EN-06** **Hit rule** 🟡 M0 (D-07 made exact): all hits on one tick are collected; a player who is not invulnerable and has at least one hit loses **exactly 1 Life** that tick, whatever the number of hits, then becomes invulnerable for **45 ticks** (1.5 s, `balance:life.invulnerableTicks`) [D-07]. While invulnerable: no Life loss, no trap stun or snare, traps are not consumed. Taking a hit cancels any charge in progress (no cost) [D-03].
- **EN-07** Healing Heart +1 Life up to 3 (PU rules).

## 5. Ability input: tap and hold

- **CH-01** Each ability button (Bomb, Shield) has its own hold counter: the number of simulation ticks between press and release [D-03, AB-02]. Paused time does not count (AB-02 "not shortened by pauses").
- **CH-02** Release after **≤ 7 ticks** (< 0.25 s, `balance:abilities.tapMaxTicks`) = **tap** ⇒ normal ability on the release tick.
- **CH-03** Release after **≥ 60 ticks** (2.0 s, `balance:abilities.chargeTicks`) with energy ≥ 3 at the release tick, and (Shield only) phase = Escape and the player has no active Super Shield ⇒ **Super** ability; 3 energy is deducted on that tick [AB-02, AB-04, D-03, D-09].
- **CH-04** Any other release (8 to 59 ticks, or ≥ 60 without the Super conditions) cancels with **no cost**. The charge ring is shown greyed while the Super conditions are not met.
- **CH-05** Energy is deducted only when the ability is actually committed. A request that is rejected (no energy, illegal tile, two shields on one tile) costs nothing [D-03, D-08].
- **CH-06** Charging does not slow movement. A hit cancels the charge (EN-06). Snare and spike immobilization do not cancel it.

## 6. Bombs

- **BM-01** Normal Bomb costs 1 Attack (AB-01); Super Bomb costs 3 Attack and a 60-tick charge (AB-02). At 0 Attack a bomb tap is rejected.
- **BM-02** **Throw** [D-05]: the bomb appears on the thrower's logical tile, flying in the thrower's facing. It advances **one tile every 3 ticks** (10 tiles/s, `balance:bombs.ticksPerTile`) for at most **8 tiles** (`balance:bombs.rangeTiles`). Throwing does not stop movement; any number of bombs may be in flight.
- **BM-03** **Contact**: before each advance, if the next tile holds a **blocker** – any wall class (solid, destructible, boss wall, sealed shortcut, arena core while the boss lives), a closed timed gate, a Shield or Super Shield – the bomb explodes on its current tile (the **impact tile**) and the blocker is the **contacted tile**. A bomb also explodes on the tile where it meets a boss ball (same tile after the move, or the two swap tiles). After the 8th tile it explodes where it is. A bomb thrown while facing an adjacent blocker explodes on the thrower's tile at once.
- **BM-04** Bombs pass through players (rival and thrower) without effect, and over traps, terrain, pickups, teleporters, tokens and open gates [D-05, D-06].
- **BM-05** **Blast footprint** 🟡 M0 (D-06 "+ radius 1 / + radius 2" made exact): the blast covers every tile reachable from the impact tile by an orthogonal path of at most `r` steps (normal `r = 1`, Super `r = 2`) in which every tile **before the last** is not a blocker. Blockers can be inside the blast (they are the last tile of a path) but the blast does not continue through them. The contacted tile is always inside the blast. Result: a normal bomb covers the impact tile and its 4 neighbours; a Super Bomb covers the diamond of radius 2 minus what is behind walls.
- **BM-06** **Blast effects** [D-06]:

| Target in blast | Normal Bomb | Super Bomb |
|---|---|---|
| Boss (any core tile in blast) | 1 damage | 3 damage |
| Boss ball | destroyed | destroyed |
| Destructible wall | no effect | removed for the rest of the match (becomes floor) [ENV-WA-02] |
| Boss wall | no effect | removed [ENV-WA-03] |
| Shield | no effect (bomb was absorbed) | removed |
| Super Shield | no effect | removed [AB-04] |
| Solid wall, timed gate, sealed shortcut | no effect | no effect [ENV-WA-01, ENV-WA-04] |
| Player | no effect | no effect |
| Trap, terrain, pickup, teleporter, token | no effect | no effect |

- **BM-07** Boss damage per bomb is applied once per bomb, regardless of how many core tiles are inside the blast, and is credited to the thrower for stats and economy [D-14].

## 7. Shields

- **SH-01** **Target tile**: the tile in front of the player = the neighbour in facing direction of the player's logical tile, or of the reserved destination if the player is mid-step 🟡 M0 (so a running player shields ahead of themselves, not into their own path).
- **SH-02** **Placement is legal** only on a tile that is floor-like (MV-08 base classes), not a closed timed gate, not occupied by a player (MV-08), with no token, teleporter pad, pickup, shield or Super Shield [D-08]. Illegal ⇒ nothing happens, no energy spent. A trap on the tile does **not** prevent placement (SH-04). A boss ball on the tile is destroyed 🟡 M0.
- **SH-03** **Normal Shield** [AB-03, D-08]: costs 1 Defense, stays **90 ticks** (3 s). It is a wall for everyone (both players including the caster, who cannot pass it for the whole 90 ticks), bombs (BM-03) and boss attacks: it stops **any number** of boss balls during its lifetime (each ball is destroyed on contact, the shield is unharmed) and the shockwave stops at it (BS-12). Confirmed by Guo, 20 Nov.
- **SH-04** **Shield on a trap** [AB-03, ENV-TR-06, D-08]: if the target tile holds a trap (maze or boss trap, any state), the trap is destroyed on the placement tick and the Shield stays its full 90 ticks.
- **SH-05** **Super Shield** [AB-04, D-09]: tap-and-hold Super (CH-03), Escape Phase only, costs 3 Defense, same placement rules, stays **450 ticks** (15 s). Only a Super Bomb removes it. At most one active Super Shield per player.
- **SH-06** **Same tile, same tick**: two shield placements (any kinds, either player) aimed at the same tile on the same tick ⇒ neither is placed, neither pays [D-12 step 1].
- **SH-07** While a player's own Shield or Super Shield is on the field, that player's Defense does not regenerate (EN-03) [D-04].
- **SH-08** A shield never expires early because of anything except a Super Bomb blast; its timers run only on simulation ticks.

## 8. Wall classes

- **WL-01** **Solid wall**: never removed [ENV-WA-01].
- **WL-02** **Destructible wall**: removed only by a Super Bomb blast; stays floor [ENV-WA-02, D-10 A]. Never on a guaranteed route (MZ-07).
- **WL-03** **Boss wall** (pattern 6): temporary, lifetime 240 ticks (8 s), removed by a Super Bomb, by expiry or on the flip tick [ENV-WA-03, BOSS-03, D-14].
- **WL-04** **Timed gate**: indestructible; open/closed on a cycle (GA rules) [ENV-WA-04].
- **WL-05** **Sealed shortcut**: solid until the flip tick (MZ-06).
- **WL-06** Every change of passability increments the maze revision (MZ-08).

## 9. Traps

- **TR-01** Traps are always visible (no hidden traps) [ENV-TR-07, D-28]. Their warning and danger states remain visible under fog, darkness, high contrast and Reduced Effects (VI-04).
- **TR-02** **Contact**: a trap is contacted on every tick a player's logical tile is the trap tile and the trap is active. Players mid-step do not touch the tile they are moving towards until they enter it (MV-03). Landing by teleport or by ice/conveyor counts as entering [D-29].
- **TR-03** **Spike Trap** [ENV-TR-01, D-28]: on contact by a non-invulnerable player: hit (EN-06: 1 Life) and immobilized **15 ticks** (0.5 s). The maze spike is then removed.
- **TR-04** **Shock Trap** [ENV-TR-02, D-28]: cycle `safe 75 ticks (2.5 s)` → `dangerous 45 ticks (1.5 s)`, with a warning glow during the last **15 ticks** (0.5 s) of the safe window. Contact during the dangerous window by a non-invulnerable player is a hit (1 Life). It is never consumed. All shock traps start their cycle at tick 0 with offset 0 unless the level sets an offset; point-symmetric pairs always share their phase 🟡 M0.
- **TR-05** **Snare Trap** [ENV-TR-03, D-28]: on contact by a non-invulnerable player: immobilized **60 ticks** (2.0 s), no Life loss; the snare is then removed.
- **TR-06** **Invulnerable contact** [D-07]: an invulnerable player on a spike or snare is not affected and the trap is not consumed; if they are still on it when invulnerability ends, it triggers then.
- **TR-07** **Maze traps** persist until triggered (spike, snare) or destroyed by a Shield (all kinds) [ENV-TR-04].
- **TR-08** **Boss traps** (pattern 5) [ENV-TR-04, ENV-TR-05, D-28]: spawn in a **warning** state for **30 ticks** (1 s) in which they cannot be triggered, then are active for **300 ticks** (10 s). Removed when triggered (spike), destroyed by a Shield, expired, or on the flip tick. Boss shock traps cycle from their own activation tick.
- **TR-09** Immobilized ticks are never eligible for Defense (EN-03) [ENV-TE-04].
- **TR-10** Same-tick order with movement, teleport, terrain and shields is fixed by the tick pipeline (section 17) [ENV-TR-08, D-35].

## 10. Teleporters

- **TP-01** Pads form pairs A ↔ B, both directions, no energy cost [ENV-TP-01, D-29].
- **TP-02** A player who **enters** a pad (by any step or slide) and whose teleport cooldown is 0 is **pending** on that pad. In step 2.2 of the same tick (section 17) a pending player is moved to the partner pad if it is **free**: no player on it or reserved toward it, no shield, no snare trap, and not a closed gate. The landing counts as entering the partner pad but does **not** make the player pending again [ENV-TP-02, D-29].
- **TP-03** **Blocked destination**: the player stays on the pad, still pending, and is transported on the first tick the destination is free. Leaving the pad by an own step cancels the pending state [D-29].
- **TP-04** **Swap**: if both players are pending on the two pads of one pair on the same tick, both are moved (each destination is freed by the other leaving). If two transports would land on the same tile (only possible with malformed content), nobody moves that tick [D-29, ENV-TP-05].
- **TP-05** **Cooldown**: after a transport the player cannot be transported again for **30 ticks** (1.0 s) [ENV-TP-03, D-29]. Entering a pad during cooldown does nothing (no pending).
- **TP-06** A transport grants no Attack (EN-02) and makes the tick ineligible for Defense (EN-03) [ENV-TP-04]. Teleport animations never delay the move.
- **TP-07** Landing counts as entering the partner pad, so all entry rules apply there [D-29]. Content never places traps or pickups on pads (PU-06, BS-13), so in practice a landing triggers nothing else.
- **TP-08** Bombs and boss attacks are not teleported 🟡 M0 (pads are floor for projectiles).

## 11. Special terrain

- **TE-01** **Speed Boost** [ENV-TE-01, D-30]: entering a boost tile sets the player's boost timer to **90 ticks** (3 s); entering another boost while boosted resets it to 90 (refresh, no stacking). While the timer is > 0 own steps use 78 units/tick (MV-02). A boost never changes direction.
- **TE-02** **Ice** [ENV-TE-02, D-30]: a player who enters an ice tile by a step in direction `d` slides on (ice slide, 60 units/tick) while the next tile in `d` is passable and the current tile is ice. No turning or stopping on ice. If the next tile is blocked the player stops on the ice tile; the next step from there is an own step in any passable direction. Slid tiles are forced movement (no Attack).
- **TE-03** A player standing on an ice tile that was not entered by a step (for example a tile turned to ice by pattern 4 under the player) does not slide until they step onto another ice tile 🟡 M0.
- **TE-04** **Conveyor** [ENV-TE-03, D-30]: each conveyor tile has an arrow `c`.
- **TE-05** **Conveyor decision table** (player at rest on a conveyor, MV-05 step 3) 🟡 M0 (D-30 made exact):

| Player's input | Result | Attack | Defense tick |
|---|---|---|---|
| none | conveyor push step toward `c` at 50 units/tick | none | ineligible (pushed) |
| along `c` | own-with-conveyor step toward `c` at 110 units/tick | 60 per tick (own share only) | ineligible |
| against `c` | no step: the player stays (push and input cancel) | none | ineligible (held back) |
| sideways to `c` | own step sideways at 60 units/tick (stepping off is always possible) | 60 per tick | ineligible |

If the push destination is blocked, nothing happens that tick (the player stays, ineligible for Defense).
- **TE-06** **Priority** when combined: teleport > ice slide > conveyor push > own input; a boost only changes own-step speed [D-30].

## 12. Pickups

- **PU-01** Attack Orb +1 Attack, Defense Orb +1 Defense, Healing Heart +1 Life; each up to its cap of 3 [ENV-PU-01..03, D-31].
- **PU-02** **At cap** the pickup is not consumed; it stays for later or for the rival [D-31].
- **PU-03** Collection happens when a player **enters** the tile (step 3 of the tick, after movement) [D-31].
- **PU-04** **Contest**: if both players enter the tile on the same tick, neither collects that tick; the pickup stays for whoever enters next [D-31, ENV-PU-04, V-001]. One pickup never produces two grants.
- **PU-05** No respawn during the match [ENV-PU-04].
- **PU-06** Counts per maze, in point-symmetric pairs (`balance:pickups.perSize`): Small 2 Attack + 2 Defense + 0 Hearts; Medium 4 + 4 + 2; Large 6 + 6 + 2. Never on traps, teleporters, timed gates, conveyors, ice, entrances or the arena [D-31, ENV-PU-05]. Levels may lower the counts.

## 13. Timed gates

- **GA-01** Cycle (`balance:gates.default`): open **120 ticks** (4 s) → closed **90 ticks** (3 s). The last **30 ticks** (1 s) of the open window are the closing warning [ENV-GA-01, ENV-GA-02, D-32].
- **GA-02** A closed gate blocks players and bombs (a bomb explodes in front of it; the gate is unharmed). Boss balls and the shockwave are blocked too 🟡 M0.
- **GA-03** **Occupied gate** [ENV-GA-03, D-32]: if, on the tick a gate should close, its tile is occupied (MV-08: logical tile or reserved destination), it stays open ("pending close") and closes on the first tick the tile is free. The closed window then starts on that tick (the cycle is delayed, never shortened).
- **GA-04** Authored levels may set cycle lengths and an initial offset per gate, but the closed window may not exceed 150 ticks (5 s) [D-32, ENV-GA-04]. Point-symmetric gate pairs share their cycle.
- **GA-05** Nothing else closes a gate: boss patterns never do [D-32].
- **GA-06** Players cannot start a step into a closed gate. A step into a gate that is open at commit is safe (the reservation keeps the gate open, GA-03).

## 14. Visibility

- **VI-01** Visibility is **presentation**: it never changes simulation outcomes. The host decides what each view may show (NET-02).
- **VI-02** **Fog** [ENV-VI-01, D-33]: authored or seeded regions. A player whose logical tile is inside fog sees only tiles within Euclidean distance **2** (`dx² + dy² ≤ 4`) 🟡 M0 (distance metric). Outside fog: normal view.
- **VI-03** **Darkness** (pattern 7) [ENV-VI-02, D-33]: for **120 ticks** (4 s) every player sees only tiles with `dx² + dy² ≤ 9` (radius 3) around themselves.
- **VI-04** Always visible regardless of fog or darkness [ENV-VI-03, ENV-TR-07]: trap warnings and traps within the visible radius, every telegraph of a boss pattern that can hit the viewer, both players' own markers, own token, own exit marker, HUD and objective arrows.
- **VI-05** **Shared screen** (Local VS, Solo): the screen shows the **union** of what both players see. **WiFi VS**: each device shows its own player's view (a host-only PC spectator view is the union) [D-33, ENV-VI-04].

## 15. Boss

- **BS-01** One boss (Guo) in the arena core; it never moves [D-14, BOSS-01]. HP per tier (`balance:boss.tiers.*.hp`): Easy 6, Medium 9, Hard 12, Extreme 15, Ultimate 18 [BOSS-02, BAL-01].
- **BS-02** **Pattern cycle** [BOSS-01, D-14]: the boss is in exactly one state: `cooldown` → `warning` → `attack` → `recovery` → `cooldown` … The first cooldown starts at tick 0. Cooldown per tier: Easy 120, Medium 105, Hard 90, Extreme 78, Ultimate 66 ticks (4.0 / 3.5 / 3.0 / 2.6 / 2.2 s). Warning per pattern (BS-07 table), never below 18 ticks (0.6 s). **Recovery 30 ticks** (1.0 s) for every pattern 🟡 M0. The attack state lasts 1 tick (it spawns the pattern's effects, which then live on as entities).
- **BS-03** **Rage** [D-14]: on Hard, Extreme and Ultimate, once boss HP < 30 % of max, cooldowns are multiplied by 0.75 (rounded down). Warnings are not shortened.
- **BS-04** **Pattern choice** 🟡 M0: at the start of each warning, the boss picks one pattern uniformly with the match PRNG from the patterns unlocked for its tier (BS-07), never the same pattern twice in a row when more than one is unlocked.
- **BS-05** **Target** [D-14]: the player with the smaller Manhattan distance from their logical tile to `(cx, cy)` at the start of the warning 🟡 M0 (metric). On a tie the boss alternates: the first tie is broken by one PRNG bit, each later tie picks the player not picked at the previous tie. Patterns 5 and 8 affect both players (BS-07), so they still use the target only for ordering.
- **BS-06** The boss takes damage in every state (BM-06, BM-07). HP never goes below 0. Each damage event is credited to the thrower.
- **BS-07** **Pattern manifest** [D-14, BOSS-04, signed 15 Nov]; geometry details 🟡 M0:

| # | Pattern | Tiers | Warning | What happens (exact) | Pose |
|---|---|---|---|---|---|
| 1 | Orb Shot | all | 30 | One ball. **Lane** (BS-08) toward the target. The ball starts on the ring tile next to the core in that lane and moves 1 tile every 4 ticks (7.5 tiles/s) until it is destroyed (BS-10). | 02 → 03 |
| 2 | Shockwave | all | 36 | A wave front starts at Chebyshev radius `coreRadius + 1` and grows by 1 every 4 ticks up to `coreRadius + 4` (2 → 5 on Small/Medium). Propagation BS-12. | 02 → 03 |
| 3 | Twin Orbs | Medium+ | 30 | Two balls at once: one in the Orb Shot lane, one in the point-symmetric lane (opposite direction). | 02 → 03 |
| 4 | Freeze Field | Medium+ | 30 | Every eligible floor tile within Chebyshev radius 2 of the target's tile (at warning start) becomes ice for 120 ticks (4 s). Eligible: plain floor with no entity, no player reservation change. | 04 |
| 5 | Trap Seeding | Medium+ | 30 | Medium 2, Hard 3, Extreme 3, Ultimate 4 boss traps, split as evenly as possible between both players (the extra one near the target). Each on a random eligible floor tile at Manhattan distance 2–4 from that player; type Spike or Shock by PRNG. Placement rules BS-13. | 04 |
| 6 | Wall Raise | Hard+ | 30 | Hard and Extreme 1, Ultimate 2 boss walls (WL-03), each on a random eligible corridor tile at Manhattan distance 2–5 from the target, closing that corridor for 240 ticks (8 s). Placement rules BS-13. | 02 → 03 |
| 7 | Darkness Pulse | Extreme+ | 30 | Darkness for 120 ticks (VI-03). No damage. | 04 |
| 8 | Ball Rain | Ultimate | 36 | One 3×3 impact zone centred on **each** player's logical tile at warning start. On the attack tick every player whose logical tile is inside a zone is hit. Shields, walls and bombs do not affect it. | 02 → 03 |

- **BS-08** **Lane** (patterns 1 and 3) 🟡 M0: let `(dx, dy)` = target tile − `(cx, cy)`. If `|dy| ≥ |dx|` the ball moves North (dy < 0) or South along the column `x = clamp(cx + dx, cx − coreRadius, cx + coreRadius)`; otherwise it moves East or West along the row `y = clamp(cy + dy, cy − coreRadius, cy + coreRadius)`. The warning stripe shows the whole lane up to the first blocker.
- **BS-09** **Ball contact**: a ball moving into or sharing a tile with a player hits that player (EN-06) and is destroyed; with invulnerable players it passes through.
- **BS-10** **Ball destruction**: a ball is destroyed when its next tile is a blocker (any wall class, closed gate, shield, Super Shield), when it is inside any bomb blast, when it meets a bomb (BM-03), or when it hits a player. Shields are not harmed [D-14].
- **BS-11** Boss attacks deal exactly 1 Life through the hit rule (EN-06) [D-14].
- **BS-12** **Shockwave propagation** 🟡 M0: a tile at radius `r` is reached when the front reaches `r` if there is an orthogonal path from the ring to it on which radius never decreases and no tile is a blocker (walls, closed gates, shields, Super Shields, boss walls). A shield therefore protects the tiles behind it [D-14]. A player on a reached tile on that tick is hit.
- **BS-13** **Placement rules for boss traps and boss walls** [D-28, ENV-WA-03] 🟡 M0: only on plain floor tiles that are not occupied, not an entrance, token tile, pad, pickup, gate, conveyor, ice, boost, trap, arena ring or core; and never on a cut tile of any route in MZ-07 for either player at that moment (temporary hazards may slow, never seal). If not enough eligible tiles exist, fewer are placed.
- **BS-14** **Poses** [D-14]: 01 idle (cooldown), 02 charging (warning), 03 attack (attack and recovery of patterns 1, 2, 3, 6, 8), 04 freeze-cast (patterns 4, 5, 7), 05 hit (cosmetic flash on damage), 06 recovering (recovery), 07 defeated (from the flip tick), 08 victory (shown on the results screen when no player wins). Poses never delay simulation (BOSS-01, INV-06).

## 16. Phase flip, tokens, shortcuts, exits

- **FL-01** **Flip** [G-008, D-12 step 6, D-13]: on the tick the boss HP is 0 after step 4 and no player was knocked out on that tick, the same tick:
  1. phase becomes **Escape**;
  2. the arena core becomes floor;
  3. both tokens spawn: P1 token at `(cx − 1, cy)`, P2 token at `(cx + 1, cy)` (point-symmetric partners);
  4. all sealed shortcuts open (MZ-06);
  5. all boss balls, boss traps, boss walls, frozen tiles and darkness are removed; the boss pattern cycle stops;
  6. each player's exit is marked (P1: South entrance, blue "1"; P2: North entrance, red "2") [D-13, UI-01].
  The flip produces exactly one `PHASE_ESCAPE` event and one `TOKENS_SPAWNED` event (G-008 acceptance).
- **FL-02** **Tokens** [G-009, INV-03, D-13]: a player who enters the tile of their **own** token picks it up. The rival walking over it has no effect. Tokens are never dropped and never move.
- **FL-03** **Escape** [G-009, D-12 step 7]: a player escapes on a tick when they hold their own token, their logical tile is their exit (the rival's original entrance) and they were not knocked out on that tick. A player on the exit without their token has no effect. "Not blocked" is implied: a Super Shield or Shield on the exit tile prevents entering it (MV-08).
- **FL-04** Boss damage from bombs already in flight after the flip has no effect (no boss).
- **FL-05** **Match timer** [TIME-01, D-13, PLAN 2.7]: one timer from GO through both phases: Small 10 800, Medium 18 000, Large 27 000 ticks (6 / 10 / 15 min). Campaign and Challenges use the size timer unless the level overrides it. Unlimited Time is allowed only in Local VS and WiFi VS. Urgency cues at 2 min, 1 min, 30 s, 10 s remaining, none in Unlimited Time [TIME-05].

## 17. Tick pipeline

Every host tick runs these steps in this order [D-12, G-011, BAL-11]. "Simultaneously" means: computed from the state at the start of the step, then applied together.

1. **Inputs**
   1. Apply each player's command for this tick (held direction, turn request, ability press/release). Inputs older than 8 ticks are applied now, never rewound [D-23].
   2. Resolve ability releases (CH rules): shield placements (SH-02, SH-04 trap destruction, SH-06 same-tile rule), bomb throws (bomb spawned on the thrower's tile).
   3. Step decisions for players at rest, in MV-05 priority (ice slide, conveyor table, own input). Commit and reserve.
2. **Forced movement and step progress**
   1. Advance all steps (own and forced) by their speed; players whose progress reaches 300 **enter** their destination (MV-03, MV-04). Voluntary progress (EN-02) is added here. Entering a pad makes the player pending; entering a boost refreshes it (TE-01).
   2. Teleports for all pending players, including those who entered a pad in 2.1 (TP-02 to TP-04).
3. **Environment**
   1. Gate cycles (GA rules), trap cycles (TR-04), timers of shields, boss traps, boss walls, frozen tiles, darkness, invulnerability, immobilization, boost, teleport cooldown. Expired entities are removed.
   2. Pickup collection (PU-03, PU-04).
   3. Token pickup (FL-02).
   4. Boss state machine advances (BS-02); on the attack tick the pattern's entities spawn (they act from step 4 of the **next** tick, except Ball Rain which resolves in step 4 of this tick).
4. **Hits** (all collected, then applied together)
   1. Advance bombs and boss balls by their cadence.
   2. Bomb contacts (BM-03) ⇒ explosions; compute all blasts (BM-05).
   3. Apply blast effects (BM-06): destroy balls in blasts, remove walls and shields, damage the boss.
   4. Remaining boss attacks against players: ball contacts (BS-09), shockwave front (BS-12), Ball Rain (BS-07).
   5. Trap contacts (TR-02 to TR-06).
   6. Apply hits (EN-06: at most 1 Life per player per tick), immobilization from traps, charge cancels.
5. **Knock-outs**: every player at 0 Life is KO'd this tick.
6. **Boss defeat**: if boss HP is 0 and no KO happened this tick ⇒ flip (FL-01).
7. **Escapes**: FL-03 for each player not KO'd this tick.
8. **Timer**: decrement the match timer; if it reaches 0 and steps 5 and 7 produced no outcome ⇒ draw.
9. **Bookkeeping**: Defense stationary counters (EN-03, using this tick's facts), maze revision (MZ-08), event list, state hash.

Note on the flip: tokens appear at the end of step 6, so they cannot be picked up before the next tick; a player cannot escape on the flip tick.

## 18. Outcomes

- **OC-01** **In-tick matrix** [D-12, G-010]: each player ends a tick as **K** (knocked out), **E** (escaped, requires not K) or **–**.

| P1 \ P2 | – | E | K |
|---|---|---|---|
| **–** | continue; if the timer reached 0 this tick: **draw** | **P2 wins** (escape) | **P1 wins** (knock-out) |
| **E** | **P1 wins** (escape) | **Draw** (both escape) | **P1 wins** |
| **K** | **P2 wins** (knock-out) | **P2 wins** | **Draw** (both KO) |

- **OC-02** A KO on the tick of the last boss hit prevents the flip; the KO result decides the match (D-12 note).
- **OC-03** A result on the tick the timer reaches 0 stands (timer checked last).
- **OC-04** **Outside the tick** (processed before step 1 of the next tick) [D-12, NET-06..08, TIME-02]:

| Situation | Result | Stats / rewards |
|---|---|---|
| One player chooses Leave | other wins by forfeit | forfeit |
| Both choose Leave on the same tick | neutral draw | no victory bonus |
| One reconnect grace (30 s, host monotonic clock) expires | other wins by forfeit | disconnect forfeit |
| Both graces expire in the same host pass | neutral dual-disconnect draw | no competitive win/loss |
| Host stops or crashes mid-match | interrupted, no winner | nothing granted |
| Countdown cancelled before GO | no match | nothing recorded |
| Unlimited Time: one player offers a draw from the pause menu and the other accepts | regular draw | regular draw |

- **OC-05** Outcome and rewards are committed once per match ID; retries return the committed result (INV-04, ECON-01).

## 19. Cross-element interaction matrix (GDD §17)

One automated test per row [D-35]. Rule references show where each answer comes from.

| Situation | Rule | Answer |
|---|---|---|
| Conveyor → Attack | EN-02, TE-05 | Only the player's own share (60/tick) counts; push (50) never. Input against the arrow: no movement, no Attack. |
| Teleport → Attack | TP-06 | No Attack. Transport in step 2.2 of the tick the pad is entered; cooldown 30 ticks. |
| Snare → Defense | EN-03, TR-09 | Immobilized ticks are ineligible and reset the counter; counting restarts on the first eligible tick after the snare ends. |
| Normal Shield → trap | SH-04, EN-06 | Trap destroyed on placement, shield keeps 90 ticks. Several hits on one tick cost 1 Life. |
| Super Bomb → destructible wall | BM-05, BM-06 | Removed if inside the blast footprint; one bomb removes every destructible wall in its footprint (no wall HP). |
| Super Bomb → boss wall | BM-06, WL-03 | Removed. Boss wall placement BS-13. |
| Super Bomb → timed gate | BM-06, GA-02 | No effect (visual response only). |
| Super Bomb → Super Shield | BM-06, SH-05 | Removed on the blast tick (step 4.3); the bomb's 3 Attack were paid at throw. |
| Teleport → occupied exit | TP-03 | Wait on the pad, still pending; no queue, no alternate tile. |
| Player in closing gate | GA-03 | Gate stays open until the tile is free, then closes. |
| Fog/darkness → trap warning | VI-04 | Warnings always visible. |
| Boss defeated → trap cleanup | FL-01 | Boss traps, walls, balls, ice and darkness removed on the flip tick. |
| Boss defeated → shortcuts | FL-01, MZ-06 | Open on the flip tick, same event batch, validator proves exits reachable without them. |
| Two players → one pickup | PU-04 | Same tick: nobody collects; otherwise first to enter. |
| Phase transition → tokens | FL-01 | Exactly one token spawn per player, same tick as the flip. |
| Reconnect → environment state | SIM-02, MZ-08 | Snapshot restores tiles, gates, trap timers, buffs, fog, revision; consumed pickups and events are not replayed. |

## 20. M0 details that need your OK

These are the 🟡 points: details PLAN.md does not state exactly, which I fixed so the rules are codable. **All 24 approved by Guo on 20 Nov 2026.** Everything else in this document is PLAN.md or the GDD restated. All numbers below are PROVISIONAL in `balance.v1.json` and can change after the play-tests.

| # | Rule | What I fixed | Why |
|---|---|---|---|
| 1 | MV-02, TE-05 | Conveyor with input along the arrow: 3 ticks per tile; against: stays; sideways: normal step off. | D-30 says "faster", "standing still" and "stepping sideways is always possible"; this is the exact table. |
| 2 | MV-03 | A step cannot be reversed halfway (5 ticks = 0.17 s). | Keeps occupancy and gate/shield rules exact. |
| 3 | MV-06 | Keyboard turn buffer 8 ticks (0.27 s). | D-01 asks for a cornering buffer, length not given. |
| 4 | MV-07 | Facing turns even when no step is possible. | So you can aim at the boss or a wall while standing next to it. |
| 5 | MV-09, CH-06 | Immobilized players can still use bombs, shields and charge. | "Immobilized" in D-28 is about movement. |
| 6 | EN-06 | Several hits on one tick cost 1 Life in total. | Prevents an unavoidable double loss (e.g. ball + spike). |
| 7 | BM-05 | Blast spreads up to `r` orthogonal steps and stops at walls (walls inside are affected, nothing behind them). | D-06 gives the size, not how walls shape it (BAL-08). |
| 8 | SH-01 | A running player's shield goes one tile beyond the tile they are stepping into. | Otherwise shielding while running would always fail. |
| 9 | SH-02 | Placing a shield on a boss ball destroys the ball. | Shields block all attacks. |
| 10 | TR-04 | Shock traps start at tick 0; mirrored pairs share their phase. | Fairness (V-001). |
| 11 | TP-08 | Bombs and balls are not teleported. | Keeps projectiles simple and readable. |
| 12 | TE-03 | Standing on a tile that became ice does not start a slide. | No sudden forced movement under a standing player. |
| 13 | GA-02 | Closed gates also block boss balls and the shockwave. | Consistent with "closed gate blocks projectiles" (ENV-GA-02). |
| 14 | VI-02 | Fog and darkness radii are circles (Euclidean). | D-33 gives the radius, not the shape. |
| 15 | BS-02 | Recovery 1.0 s for every pattern; first pattern after one cooldown from GO. | D-14 gives warnings and cooldowns only. |
| 16 | BS-04 | Random pattern among unlocked ones, no immediate repeat. | D-14 gives the tier spread, not the order. |
| 17 | BS-05 | "Nearest" = Manhattan distance to the arena centre; ties alternate, first tie by seed. | D-14 says nearest with alternating ties. |
| 18 | BS-07, BS-08 | Ball speed 7.5 tiles/s; Orb Shot lane rule; Twin Orbs mirrored lane. | Pattern geometry for patterns 1 and 3. |
| 19 | BS-07, BS-12 | Shockwave grows 1 tile per 4 ticks and is blocked by walls and shields (shadow behind). | Pattern 2 geometry. |
| 20 | BS-07 | Freeze Field: radius 2 around the target, 4 s. | Pattern 4 area. |
| 21 | BS-07 | Trap Seeding counts 2/3/3/4 (Medium/Hard/Extreme/Ultimate), split between both players, 2–4 tiles away. | D-14 gives "2 to 4". |
| 22 | BS-07 | Wall Raise: 1 wall (Hard, Extreme), 2 walls (Ultimate), 2–5 tiles from the target. | D-14 gives "1–2 corridors". |
| 23 | BS-07 | Ball Rain: one 3×3 zone per player, both players at once. | Fair to both players. |
| 24 | BS-13 | Boss traps and walls never on a tile that would cut a player off from their objective. | Temporary hazards slow, never seal (INV-07). |

## 21. M2b details (for your OK at the play-test)

Points the M2b code had to fix that sections 1 to 20 do not state exactly. All numbers are PROVISIONAL in `balance.v1.json`.

| # | Rule | What I fixed | Why |
|---|---|---|---|
| 1 | MZ-03, PU-06 | Generator counts per size (pairs): Small 1 spike, 1 shock, 1 snare, 1 pad pair, 1 boost, 1 ice strip, 1 conveyor strip, 1 gate, no fog; Medium 2, 1, 1, 1, 2, 1, 1, 1, 1 fog region; Large 3, 2, 2, 2, 2, 2, 2, 2, 2 fog regions. Strips are 2–3 tiles; fog regions radius 2. | The GDD names the elements, not how many. |
| 2 | MZ-07 | Nothing is placed in the boss arena or within 3 steps of an entrance; if no valid layer is found the layout is re-rolled. | Spawns stay calm and the route check always holds. |
| 3 | BS-07 | Telegraph tiles (frost, trap seeds, walls, rain zones) are chosen when the warning starts, so the warning shows exactly where the attack lands. | Readable warnings (D-14). |
| 4 | TR-03, TR-05 | Immobilization does not stop a step already in progress; it starts when the player reaches the next tile. | Keeps steps whole (rule 20.2). |
| 5 | TE-05 | On a conveyor, a sideways input into a wall falls back to the push. | Otherwise the player would stand still on a moving belt. |
| 6 | — | The environment is on by default; the setup screen has "Maze environment: Off (plain maze)". | Lets beginners and tests use the M2a maze. |
| 7 | VI-04 | The boss, its telegraphs, trap warnings, tokens and exits are drawn above fog and darkness. | Warnings always shown (§17). |
