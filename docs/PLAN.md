# Guo's Puzzle Duel IV: gap analysis, tech stack and implementation plan

Status: **decisions in progress** (v0.2, 15 Nov 2026). Source: `docs/Guos_Puzzle_Duel_IV_Full_Fidelity_GDD_v2.0.pdf` (**GDD v2.0, read in full**; it replaces v1.0). Requirement IDs below refer to v2.0 (for example G-010, ENV-TR-01, AB-03).

This document does three things:

1. Lists what the GDD leaves open or under-specified, with options and a recommended default for each (section 2).
2. Proposes a tech stack that is feasible for this scope, reusing proven pieces from Guo's Puzzle Duel II (section 3).
3. Lays out milestones that keep implementation moving while art is still being made (section 4).

The art plan and all prompts are in [`art_prompt.md`](../art_prompt.md).

**How we work through it:** decisions are confirmed one by one. ✅ = decided, 🔁 = decided earlier but reopened by GDD v2.0, ⏳ = open with a recommendation. No implementation starts until every decision is closed.

---

## 1. Summary

GDD v2.0 keeps the v1.0 rules (fairness, host authority, persistence, LAN, release gates) and **restores the environment layer**: traps (spike, shock, snare), teleporters, speed boost, ice, conveyors, Attack/Defense orbs, Healing Hearts, timed gates, fog and darkness, wall classes, boss-created traps/walls and shortcuts that open when the boss falls. It also states that the boss has **eight attack patterns** whose definitions were not recovered, and it forbids implementers to invent TBD items without the product owner's approval (Appendix B).

Main gaps in v2.0 (each has a decision below):

- **Combat truth table** (AB-05, BAL-08): mostly settled in D-03 to D-09; wall interaction and Life sources reopened by v2.0 (D-06, D-07, D-10).
- **Environment details** (ENV-*, BAL-03 to BAL-06, BAL-12): durations, cycles, priority between traps, teleport, conveyor, ice and boost, fog on a shared screen. New decisions D-28 to D-35.
- **Eight boss attack patterns** (BOSS-04, BAL-07, blocking): a proposed manifest in D-14 for your signature.
- **Same-tick precedence** (G-011, BAL-11): rewritten in D-12 for traps and environment.
- **Content manifests** (PROG-04, MUS-05, BAL-09): Campaign/Challenge objectives, star/medal thresholds, achievements. My proposals in D-16 to D-21 need your explicit approval because v2.0 says "do not invent".
- **Music** (AV-01, LOCKED): music must vary by the five themes and by Boss/Escape phase, plus menu, lobby, store, museum and results music. This changes the art plan (D-36).
- **Scope**: M2 now includes the full environment system, so I split it into M2a (core match) and M2b (environment).

---

---

## 2. Gap analysis: decisions with options and recommendations

Notation: **Rec** marks the recommended option. Numbers are starting values kept in an editable balance file (`balance.v1.json`) so tuning never needs code changes.

### 2.1 Movement and controls (CTRL-01 to CTRL-04)

**D-01 Movement model** — ✅ **Decided 15 Nov: B**
- A. Free continuous movement with circular hitboxes (sub-tile positions).
- **B (Rec). Tile-locked lane movement**: players move tile to tile along corridors at a fixed cadence; holding a direction keeps moving; a turn pressed slightly early is buffered and taken at the next junction ("cornering buffer").
- Why B: the GDD counts Attack regeneration in *tiles* (CTRL-02), uses tile mazes, and wants deterministic host simulation. B makes "qualifying tile", collision, prediction and replay exact. A causes wall-sliding edge cases and makes reconciliation harder.
- Values: 30 Hz tick, **5 ticks per tile (6 tiles/s)**, no speed differences between characters (ECON-03).

**D-02 Input maps** — ✅ **Decided 15 Nov (Guo's layout)**; D-02a/b/c accepted
- Solo / single keyboard player (one hand): **W A S D** move, **Q = Bomb, E = Shield**. Alternative: arrows + **Numpad 1 / Numpad 2**.
- Shared keyboard (Local VS):
  - P1: **W A S D** move, **Q** Bomb, **E** Shield.
  - P2: **Arrow keys** move, **Numpad 1** Bomb, **Numpad 2** Shield. Alternative for keyboards without a numpad: **, (comma)** Bomb, **. (period)** Shield.
- Keys are read by physical position (`KeyboardEvent.code`), so Numpad 1/2 work with Num Lock on or off, and Q/W/E/A/S/D stay in the same place on German QWERTZ and French AZERTY keyboards.
- All rebindable in Settings; rebinding rejects conflicts between the two Local VS players. A key-test page shows which keys the keyboard reports, to spot ghosting.
- Touch (phones/tablets): **swipe to move** on the left/centre of the screen, **two right-thumb buttons ≥ 64 px** (Bomb, Shield) with a hold-to-charge ring.
  - A swipe (≥ 24 px) sets the heading; the character keeps moving that way until a wall, and a swipe made before a junction is buffered and taken at the next possible turn (same cornering buffer as the keyboard).
  - **D-02a (accepted):** a short tap in the swipe area stops the character (needed to stand still for Defense regeneration).
  - **D-02b (accepted):** a floating 4-way D-pad is the alternative touch scheme.
  - **D-02c (accepted) where the touch scheme is chosen:** it is a device-local preference (UI-008: presentation only, never affects fairness), stored on the device, so it never resets anyone's Ready. It can be changed in: (1) a one-time "Choose your controls" card the first time a touch device joins, with a 10-second practice; (2) Settings → Controls at any time; (3) the pre-game lobby, on the player's own panel (only shown on touch devices); (4) the pause menu: immediately in Solo, and in WiFi VS while an agreed pause is active (no unilateral pause just to switch). Extra options there: swipe sensitivity, left-handed layout (buttons on the left), button size.
  - The swipe area ignores the outer 24 px of the screen (iOS/Android back gestures) and blocks browser scrolling, pull-to-refresh and zoom during a match.

**D-03 Charge (Super Bomb / Super Shield) input** — ✅ **Decided 15 Nov: B**
- A. Separate buttons for Super.
- **B (Rec). Same button, tap vs. hold**: tap (released < 0.25 s) = normal ability; hold shows a charge ring; release after **2.0 s** with 3 energy = Super; release between 0.25 s and 2.0 s cancels with **no cost**. Cost is deducted on commit only (host tick of release). Charging does not slow movement. Taking damage cancels the charge (no cost).
- If energy < 3 the ring does not fill (greyed); tapping still gives a normal ability.

**D-04 Resource regeneration details** — ✅ **Decided 15 Nov: GDD values as default + Energy presets**
- Attack +1 per **12 tiles entered by the player's own movement input**. Progress carries over (not reset when stopping). Forced movement (conveyor push, ice slide, teleport) does not count (CTRL-02, ENV-TP-04, ENV-TE-03).
- Defense +1 per **7.0 s continuously standing still** with no movement input, not charging, not snared/stunned, not being pushed, not paused (CTRL-03, ENV-TE-04). Any movement input resets the 7 s counter to zero.
- Both at 3 cap: progress stops (no banking).
- **Added rule (all presets):** Defense does not regenerate while the player's own Shield or Super Shield barrier is active. This prevents a chained Super Shield blockade.
- **Energy setting** (drop-down; host-owned shared setting in Local VS, WiFi VS and Custom; changing it resets both Ready flags per G-004). Campaign and Challenges use fixed values per level so stars, medals and records stay comparable; "Scarce Energy" challenges use Tactical.

| Preset | Attack +1 per | Defense +1 per | Super Bomb from 0 (running) | Shield max uptime | Gap after a Super Shield before the next one |
|---|---|---|---|---|---|
| Tactical | 15 tiles (2.5 s) | 9 s | 7.5 s | 25% | ≥ 29 s |
| **Normal (default, GDD CTRL-02/03)** | **12 tiles (2.0 s)** | **7 s** | **6.0 s** | **30%** | **≥ 23 s** |
| Fast | 9 tiles (1.5 s) | 5 s | 4.5 s | 37.5% | ≥ 17 s |

Limits that keep every preset fair: Super Bomb always needs ≥ 4.5 s of running (a barrier cannot be answered instantly), the blockade gap is always ≥ 17 s, and a normal Shield is never up more than 40% of the time. Starting energy stays 1/3 in all presets. Values live in `balance.v1.json`; the three presets are the only player-facing choices (no free number entry).

### 2.2 Combat (AB-01 to AB-05, BAL-08)

> ✅ **D-05 to D-09 decided 15 Nov (Guo's design clarification).** Core idea: the game has three phases: (1) explore the maze to the boss, (2) defeat the boss to get the tokens, (3) race the rival to the exit. **Bombs are for attacking the boss and the maze; shields are temporary walls.** Bombs never harm players. GDD v2.0 keeps all of this possible; it reopens only the points marked 🔁.

**D-05 Bomb delivery** — ✅ **thrown in the facing direction**
- Facing = the last direction the player moved (keyboard) or swiped (touch); shown by an arrow on the character token.
- The bomb flies straight at **10 tiles/s for up to 8 tiles** and explodes on the **first** thing it meets: wall (any type), shield, Super Shield, the boss, a boss attack ball, or at the end of its range.
- It **flies through players** (both the rival and the thrower) with no effect.
- Throwing does not stop movement. One bomb per throw; no limit on bombs in flight other than energy.

**D-06 Blast and damage** — ✅ (wall interaction settled by D-10 A)
- Normal Bomb: blast on the impact tile plus the 4 neighbours (+ radius 1); does **not** break walls (only Super Bombs remove destructible walls, ENV-WA-02); **1 damage to the boss**; destroys boss attack balls in the blast. A normal bomb that hits a shield explodes harmlessly on it.
- Super Bomb (3 Attack, 2 s charge, D-03): **+ radius 2**; breaks **destructible walls, boss-created walls, Shields and Super Shields**; never timed gates or solid walls (ENV-WA-01/04); **3 damage to the boss**.
- Bombs fly over floor traps, terrain, pickups and teleporters without effect (traps are destroyed by Shields, AB-03).
- Bombs never damage players, so there is no self-damage and no friendly fire.

**D-07 Life and hit recovery** — ✅ **Re-confirmed 15 Nov for v2.0 (traps take Life)**
- 3 Life (G-003). Life is lost to **boss attacks, Spike traps and Shock traps** (ENV-TR-01/02), in both phases. Bombs still never hurt players. **Healing Heart** pickups restore 1 Life up to 3 (ENV-PU-03).
- After a hit: 1.5 s invulnerability with blinking/outline flash: no Life loss and no trap stun during it (the trap is not consumed). No respawn, no knock-back.
- A player at 0 Life loses (G-010); simultaneous knock-out is a draw. Because traps work in the Escape Phase too, a knock-out can now happen during the race (see D-12).

**D-08 Normal Shield** — ✅ **a temporary wall in front of the player** (+ trap rule from AB-03)
- Costs 1 Defense; placed on the tile **in front** of the player (facing direction); lasts **3 s** of active simulation time.
- Blocks **everyone** (both players, including the caster) and **all attacks** (boss attacks from that side, bombs).
- Cannot be placed on a wall, a closed timed gate, a player, a token, a teleporter, a pickup or an existing shield: then nothing happens and **no energy is spent**.
- **Placing a Shield onto a trap tile destroys the trap immediately**; the Shield then stays for its full 3 s (AB-03, ENV-TR-06). This is the way to clear a trap from a corridor.
- Usable in both phases; in the Escape Phase it can briefly block the rival's corridor or exit.

**D-09 Super Shield** — ✅ **the same wall, 15 s, Escape Phase only (AB-04)**
- Costs 3 Defense, 2 s charge (D-03); placed in front like the normal Shield; lasts **15 s**; blocks everyone and everything.
- Only a **Super Bomb** breaks it. One active Super Shield per player.
- Defense does not regenerate while the player's own Shield or Super Shield is up (D-04), so blockades cannot be chained.
- A mutual blockade (both exits blocked) runs until expiry or a Super Bomb; the timer resolves it if nobody acts.

**D-10 Wall classes** — ✅ **Decided 15 Nov: A (follow v2.0)**
- v2.0 defines: **solid walls** (never destroyed), **destructible walls** (removed only by a **Super Bomb**), **boss-created temporary walls** (expire, or Super Bomb), **timed gates** (indestructible, open/close on a cycle), and **sealed shortcuts** that open on the boss-defeat tick.
- **A (Rec). Follow v2.0 exactly**: no wall class for normal bombs. Normal bombs are the boss weapon (damage, intercepting boss balls); Super Bombs are the maze weapon (destructible walls, boss walls, Super Shields). Shortcuts are rarer and more meaningful.
- B. Keep our earlier extra class "cracked wall" that a normal bomb breaks. More destruction and faster exploration, but a deviation from v2.0 that needs a GDD revision.
- Either way: the generator guarantees every mandatory route (spawn → boss, spawn → token, token → opposite entrance) exists **without destroying anything** and with timed gates recurring open; destruction only adds shortcuts. Destroyed walls stay destroyed. Sealed shortcuts are placed symmetrically and both escape paths stay valid with or without them (ENV-WA-05).

### 2.2b Environment (new in GDD v2.0, section 4) — ⏳ all open

All environment entities are host-simulated in ticks, placed **point-symmetrically** (D-11) so P1 and P2 face the same elements, drawn in code (no new art), and **identical in every theme** (M-005; the theme changes only the look).

**D-28 Traps** (ENV-TR-01 to 08, BAL-03) — ✅ **Decided 15 Nov**
- All traps are **always visible** (no hidden traps; ENV-TR-07). Never placed on a tile every route must cross (validator).
- **Spike Trap**: on contact, 1 Life and **0.5 s** immobilized; a maze spike persists until triggered (then removed) or destroyed by a Shield.
- **Shock Trap**: cycles **1.5 s dangerous / 2.5 s safe**, with a **0.5 s** warning glow before it turns dangerous; contact in the dangerous window costs 1 Life; not consumed (it keeps cycling) until a Shield destroys it.
- **Snare Trap**: on contact, immobilized **2.0 s**, no Life loss; removed when triggered.
- **Boss-spawned traps**: 1 s warning before active (ENV-TR-05), lifetime **10 s**; removed when triggered, destroyed, expired or when the boss is defeated (ENV-TR-04, BOSS-03).
- Immobilized time never counts as standing still for Defense (ENV-TE-04).

**D-29 Teleporters** (ENV-TP-01 to 05, BAL-04) — ✅ **Decided 15 Nov**
- Pairs A ↔ B, both directions, no energy cost, transport happens on the tick the player enters the pad.
- **Destination occupied or blocked** (player, shield, snare, closed gate): the player simply stays on the pad and is transported on the first tick the destination is free (no queue, no alternate tile).
- **Both players enter the two pads of one pair on the same tick**: they swap (each destination is freed by the other leaving). **Both would land on the same tile** (impossible with pairs, kept as a guard): nobody moves that tick.
- **Return cooldown 1.0 s** per player before they can be teleported again (ENV-TP-03).
- Landing on a trap triggers it normally (it is visible from the pad). Teleport distance never counts for Attack (ENV-TP-04).

**D-30 Special terrain** (ENV-TE-01 to 05, BAL-05) — ✅ **Decided 15 Nov**
- **Speed Boost** tile: +30% speed for 3 s; touching another boost **refreshes** the 3 s (no stacking).
- **Ice**: on entering an ice tile the player keeps sliding in the same direction, one tile per normal step, until a non-ice tile or a blocker; no turning or stopping on ice; slid tiles are forced movement (no Attack).
- **Conveyor**: pushes the player one tile in its arrow direction every 6 ticks (5 tiles/s) while they stand on it. Moving with the arrow is faster (only the player's own steps count for Attack); moving against it = standing still (but it does not count as stationary for Defense); stepping sideways off is always possible.
- Priority when combined: teleport > ice slide > conveyor push > the player's own input. A boost only changes speed, never direction.

**D-31 Pickups** (ENV-PU-01 to 05, BAL-12)
- Attack Orb (+1 Attack), Defense Orb (+1 Defense), Healing Heart (+1 Life), each up to the cap of 3.
- **At cap, the pickup is not consumed** (it stays for later or for the rival).
- Collected by the first player to **enter** the tile; if both enter on the same tick, neither collects that tick (symmetric, V-001); it stays for whoever enters next. Players may pass through each other (no body-blocking).
- No respawn. Per maze (symmetric pairs): Small 2 Attack + 2 Defense + 0 Hearts; Medium 4 + 4 + 2; Large 6 + 6 + 2. Never on traps, teleporters, gates or the boss arena.

**D-32 Timed gates** (ENV-GA-01 to 04, BAL-06)
- Default cycle **4 s open / 3 s closed**, with a **1 s closing warning**; authored levels may change the cycle and offset but must reopen within 5 s.
- A closed gate blocks players and bombs (bomb explodes on it, no damage to the gate).
- If a player is on the gate tile when it should close, it stays open until the tile is clear, then closes (never crushes).
- Boss patterns never close gates (keeps exits from being sealed).

**D-33 Fog and darkness** (ENV-VI-01 to 04, BAL-06)
- **Fog** regions (authored or seeded): inside fog a player sees only tiles within **2 tiles**; outside fog normal view.
- **Darkness** (a boss pattern, D-14): **4 s**, visible radius **3 tiles** around each player.
- Warnings, traps within the visible radius, players' own markers, tokens, HUD and objective arrows stay visible (ENV-VI-03).
- **Shared screen (Local VS)**: the screen shows the **union** of what both players can see. Both players get exactly the same information, so parity holds. **WiFi VS**: each device shows only its own player's view.

**D-34 Phase shortcuts** (ENV-WA-05): 2 symmetric pairs of sealed shortcut walls per maze (Small 1 pair); they open on the boss-defeat tick together with the token spawn, and are drawn as sealed doors with a crown symbol so players can plan the escape.

**D-35 Interaction matrix** (ENV-TR-08, ENV-TE-05, §17): implemented as one ordered tick pipeline (D-12) plus one test per row of GDD §17. Open rows are closed by the rules above.

### 2.3 Match flow, boss and victory (G-001 to G-011, BOSS-01 to BOSS-05)

**D-11 Maze fairness and layout (M-001 to M-004)** — ✅ **Decided 15 Nov: A**, with B kept for authored levels
- **A (Rec). Point-symmetric (180° rotational) generation**: generate one half, rotate it. P1 (North) and P2 (South) get mirror-identical routes to the boss, tokens and exits. Boss arena at the centre. Fairness is exact, so the "acceptable asymmetry thresholds" become logging only.
- B. Fully random mazes with measured asymmetry thresholds and re-roll. More variety, but needs fairness tuning (GDD marks the thresholds PROVISIONAL).
- **Required (Guo, 15 Nov):** Campaign and Challenge levels may use **either** A (mirrored) or B (non-symmetric); each level's manifest declares which. The route checker (M-003, INV-07) runs on **every** level of both kinds, and for B levels the fairness report (M-004) is also produced and reviewed. Random challenges and VS matches always use A.
- Arena: 3×3 boss core inside a 5×5 open ring on Small/Medium, 5×5 core in 7×7 ring on Large. Entrances are sealed gates during Boss Phase and open at the phase flip.

**D-12 Tick order and same-tick precedence (G-011, BAL-11)** — ✅ **Decided 15 Nov** (incl. both-Leave neutral draw and Unlimited-Time draw offer). Every host tick runs these steps in this fixed order; nothing depends on message arrival order or on P1/P2 slot order (two identical requests on one tick are treated symmetrically):

1. Inputs: movement steps, bomb throws, shield placements (two shields aimed at the same tile: neither placed, no cost).
2. Forced movement: teleports, ice slides, conveyor pushes (D-30 priority).
3. Environment: gate cycles, trap cycles, timers of shields/boss traps/boss walls/buffs; pickup collection (D-31).
4. Hits, all simultaneous: bomb blasts, boss attacks, trap contacts.
5. Knock-outs: every player at 0 Life is KO'd.
6. Boss defeat: if boss HP reached 0 and **no knock-out happened this tick**, flip to Escape Phase (tokens, shortcuts, clear boss traps/walls) in this same tick (G-008).
7. Escapes: a player who was **not KO'd this tick**, holds their own token and stands on the opponent's original entrance (not blocked) has escaped.
8. Timer: only if steps 5 and 7 produced no outcome.

**Complete outcome matrix.** Inside one tick each player ends in exactly one of three states: **K** (knocked out this tick), **E** (escaped this tick, which requires not K) or **–** (nothing). That gives every in-tick combination:

| P1 \ P2 | – | E | K |
|---|---|---|---|
| **–** | Match continues; if the timer reaches 0 this tick: **draw** | **P2 wins** (escape) | **P1 wins** (knock-out) |
| **E** | **P1 wins** (escape) | **Draw** (both escape) | **P1 wins** |
| **K** | **P2 wins** (knock-out) | **P2 wins** | **Draw** (both knocked out) |

Notes: a player who reaches the exit on the tick they are knocked out counts as K, not E. A KO on the tick of the last boss hit means the phase does not flip. A result on the tick the timer reaches 0 stands (timer is checked last).

**Outcomes outside the tick** (handled before step 1 of the next tick, NET-06 to NET-08, TIME-02):

| Situation | Result | Rewards / stats |
|---|---|---|
| One player chooses **Leave** | The other wins by forfeit | Forfeit (PROFILE-06) |
| **Both** choose Leave on the same tick (WiFi) | Neutral draw | Like dual-disconnect: no victory bonus |
| One player's 30 s reconnect grace expires | The other wins by forfeit | Disconnect forfeit |
| Both graces expire in the same host pass | Neutral dual-disconnect draw | No competitive win/loss |
| Host crashes or is stopped mid-match | Interrupted, no winner | Interrupted; nothing granted |
| Countdown cancelled before GO | No match | Nothing recorded |
| **Unlimited Time** and nobody can finish (for example both blockading) | Either player can offer a **draw** from the pause menu; if the other accepts, regular draw | Regular draw |

**D-13 Tokens and exits (G-008, G-009, INV-03)** — ✅ **Decided 15 Nov (Guo's design)**
- On the boss-defeat tick the boss plays its defeated pose and the arena core becomes walkable floor. **Both tokens appear where the boss stood**, side by side at mirrored positions (equal distance for both players).
- Each player can pick up **only their own** token (INV-03); the rival walks over it with no effect.
- On the same tick **each player's exit blinks in their colour** with their number and an arrow: P1's exit (the South original entrance) blinks blue "1", P2's exit (North) blinks red "2". The HUD shows a direction arrow to the own exit (UI-01 colour independence, UI-04).
- Tokens are never dropped, even when hit by a trap; they only vanish if their owner loses.
- **One match timer for the whole match** (TIME-01): it keeps running from GO through Boss and Escape Phase; there is no separate Escape timer. Expected sprint length after the boss falls (estimate, not a timer): Small 5–10 s, Medium 10–15 s, Large 15–25 s.
- Visuals: reuse the GPD2 blue and red crystals with "1"/"2" labels.

**D-14 Boss: eight attack patterns** (BOSS-01 to 04, BAL-01, BAL-07) — ✅ **Signed off by Guo, 15 Nov** (pattern manifest and tier spread; numbers stay PROVISIONAL for balancing)
- The boss (Guo) stays in the arena core and never walks. Every pattern runs warning → attack → recovery, with the warning never shorter than 0.6 s. It targets the nearest player; ties alternate so it never favours P1. Boss attacks deal 1 Life.
- Proposed manifest (pose = boss art used during the pattern):

| # | Pattern | What happens | Warning | From tier | Pose |
|---|---|---|---|---|---|
| 1 | **Orb Shot** | One ball rolls along a row or column out of the arena; a bomb can destroy it, a Shield blocks it | 1.0 s stripe | Easy | 02 → 03 |
| 2 | **Shockwave** | A ring expands from radius 2 to 5 around the arena; a Shield on the ring's path blocks it for the tiles behind it | 1.2 s ring | Easy | 02 → 03 |
| 3 | **Twin Orbs** | Two balls in opposite directions at once | 1.0 s | Medium | 02 → 03 |
| 4 | **Freeze Field** | Marked tiles turn to ice (D-30) for 4 s | 1.0 s frost marks | Medium | 04 |
| 5 | **Trap Seeding** | 2 (Medium) to 4 (Ultimate) temporary Spike/Shock traps near the players (D-28) | 1.0 s | Medium | 04 |
| 6 | **Wall Raise** | Temporary walls close 1–2 corridors for 8 s; Super Bomb breaks them (ENV-WA-03) | 1.0 s outline | Hard | 02 → 03 |
| 7 | **Darkness Pulse** | Darkness for 4 s (D-33) | 1.0 s dimming | Extreme | 04 |
| 8 | **Ball Rain** | 3×3 impact zones marked around each player | 1.2 s circles | Ultimate | 02 → 03 |

- Tiers: Easy patterns 1–2; Medium 1–5; Hard 1–6; Extreme 1–7; Ultimate 1–8. HP 6/9/12/15/18 (BOSS-02, PROVISIONAL). Cooldown between patterns 4.0 / 3.5 / 3.0 / 2.6 / 2.2 s. Below 30% HP ("Rage", Hard and up) cooldowns are 25% shorter.
- Poses (01 idle, 05 hit, 06 recovering, 07 defeated, 08 victory) are shared by all patterns. Each difficulty tier uses its own costume set (art_prompt.md IV-11 to IV-42).
- Boss damage is credited per player for the economy and stats.
- **No extra art**: patterns use the existing 8 poses per tier (02 charging = warning, 03 attack = throws/rings/walls, 04 freeze-cast = Freeze Field, Trap Seeding, Darkness); balls, rings, ice, traps, walls, darkness and impact zones are drawn in code.

**D-15 Solo vs AI, Campaign and difficulty** — ✅ **Decided 15 Nov**
- The AI opponent uses only legal inputs through the same command queue as humans (BOSS-05). Five AI tiers by reaction delay, path planning depth, bomb-risk tolerance and Super use.
- Campaign = Solo vs AI. Standard difficulty links AI, boss and maze tier; Custom sets them separately (PROG-05).

### 2.4 Content and progression (PROG-01 to PROG-05, BAL-09) — ⏳ needs your approval (v2.0 PROG-04: do not invent)

**D-16 How levels are authored**
- A. Hand-drawn tile maps for all 65 levels.
- **B (Rec). Parameterised levels**: each Campaign level / Challenge is a JSON entry `{seed, size, theme, bossTier, aiTier, environment{traps, teleporters, terrain, pickups, gates, fog}, modifiers[], objectives, starThresholds}`, generated by the same validated generator; a few showcase levels may pin hand-edited maps. A level editor is not needed for v1.
- Campaign: 5 chapters × 8 levels = the 5 themes in order (Enchanted Garden, Desert Ruins, Crystal Caverns, Neon Circuit, Volcanic Citadel), sizes and tiers rising inside each chapter. Chapter cover = theme tile art + title art, no extra images. Environment elements are introduced gradually: chapter 1 traps and pickups, chapter 2 + teleporters and boost, chapter 3 + ice and conveyors, chapter 4 + timed gates and fog, chapter 5 everything.

**D-17 Stars (Campaign)**: 1 star = win; 2 stars = win within par time (per level); 3 stars = win without losing a Life. Max 120 (locked).

**D-18 Challenge categories (5 × 5)** — proposed names:
1. **Speed Escape** (win under par time; medals by time).
2. **Boss Breaker** (deal the most boss damage / finish boss under time).
3. **Blockade Master** (Super Shield and Super Bomb focused, Escape-start scenarios).
4. **Scarce Energy** (start at 0 energy, slower regen).
5. **Iron Will** (1 Life, harder boss).
Bronze/Silver/Gold thresholds per challenge in the manifest.

**D-19 Random challenges**: seed + size + tier; records kept per `(generatorVersion, seed, size, tier)`; shareable 8-character seed code.

### 2.5 Economy, achievements, Museum (ECON-01 to 07, MUS-01 to 05, BAL-10, CONTENT-01)

**D-20 Starting economy (all PROVISIONAL, data file)**
- Match reward = base (Solo 40 / Local VS 30 per player / WiFi VS 40) × tier factor (0.8/1.0/1.2/1.5/2.0) + 3 × own boss damage + 20 win bonus. Draw: half of win bonus. Guests: none.
- Fox Adventurer 600, Mystic Slime 900 credits, or achievement unlock.
- Cosmetics v1: **colour trims, token shapes, trail effects, nameplate frames**: all drawn in code, so the Store needs no new art.
- Anti-farming: diminishing rewards after 10 completed matches between the same two profiles within 1 hour (50%, then 25%), reset after 1 hour. Never zero.

**D-21 Achievements**: a catalog of ~30, Bronze/Silver/Gold/Platinum, each using an existing GPD2 or Tower Defense badge picture with a tier frame drawn in code. Mapping in `art_prompt.md` §2.

**D-22 Museum**: six rooms as card galleries. Exhibits reuse existing art (boss poses, achievement badges, character portraits, maze thumbnails rendered from seeds). Public showcase = up to 6 chosen exhibit cards plus profile name and character, nothing else (MUS-04).

### 2.6 Network, persistence, operations (NET-01 to 10, DB-01 to 04, OPS-01 to 04)

**D-23 Network numbers (NET-01)**: heartbeat 2 s, unresponsive at 6 s → DISCONNECT_PAUSED; inputs older than 250 ms (8 ticks) are applied at the current tick, not rewound; interpolation buffer 100 ms; reconnect token rotates on each reconnect, expires at grace end.

**D-24 Security (NET-09, NET-10)**: invite token 128-bit random, single-room, revocable; session credential bound to device + slot; Origin check on WebSocket upgrade; schema validation on every message; per-connection rate limit (60 msgs/s). HTTPS/WSS stays a later evaluation item (NET-09); v1 stays HTTP on LAN with the warning text the GDD asks for.

**D-25 Ports (OPS-02, OPS-03)**: one Node bootstrap tries 3000, then 3001 … 3019 (20 candidates), reports the actually bound port to the launcher, URL and QR. Single host per user-data directory via a lock file with PID + start time plus SQLite `BEGIN EXCLUSIVE` check.

**D-26 Backups (OPS-02)**: automatic backup after each finalized session and daily (7 daily / 4 weekly / 3 monthly, as GDD), using SQLite online backup API into the user-data directory, no encryption in v1 (local only), manual Back Up / Restore and profile export/import as signed JSON (SHA-256 hash for integrity).

**D-27 Where user data lives (OPS-04)**: Windows `%LOCALAPPDATA%\GuosPuzzleDuel4\`, macOS `~/Library/Application Support/GuosPuzzleDuel4/`, Linux `~/.local/share/guos-puzzle-duel-4/`.

### 2.6b Music (AV-01, LOCKED in v2.0)

**D-36 How much music** — ⏳ v2.0 locks music that **varies by the five themes and by Boss/Escape phase**, plus **separate menu/lobby/store/museum and result music**.
- **A (Rec). 10 in-match cues + 4 others = 14 Flow Music cues**: per theme one Boss and one Escape cue, written from one prompt template (same tempo/key per theme pair so the 0.5–1.0 s crossfade works), plus Title/Menu, Lobby, Store & Museum (one shared calm cue), Results. Placeholders from GPD2 until they arrive.
- B. One shared Boss/Escape pair with a per-theme ambience layer (my earlier plan): 5–6 cues, but it does not meet AV-01 as written; needs a GDD revision.

### 2.7 Inconsistencies and small gaps found in the GDD

| Ref | Observation | Proposal |
|---|---|---|
| TIME-01 vs Campaign | Unlimited Time only in Local/WiFi VS; Campaign/Challenge timers not specified | Campaign and Challenges use the size timer unless a level overrides it |
| G-004 / UI-03 | "Personal loadout" is never defined (abilities are fixed) | Loadout = character + cosmetics only |
| UI-07 / AV-03 | "Host voice language" for shared PC vs client language | Shared PC: host's language; each remote client plays its own announcer locally from events |
| TIME-02 | WiFi pause needs consent; what if the second player never answers? | Request expires after 10 s; the requester can still use Leave |
| ECON-05/06 | "Access purchases" are not listed anywhere | v1: Challenge categories 4 and 5 and Large Random mazes can be bought early or unlocked by play |
| MUS-04 | Who are "authorized LAN participants"? | Approved devices in the current room only |
| M-005 | Five visual themes imply 5 tile sets | Procedural tiles first; Codex tile sheets are optional polish |
| ENV-* | Environment elements need visuals in all 5 themes | Drawn in code (shapes, icons, particles) with theme palettes; no new art |
| ENV-VI-04 vs UI-04 | Fog on a shared screen vs HUD parity | Union view on the shared screen (D-33) |
| Characters | "Robot", "Mystic Slime" need top-down sprites | In-maze tokens are drawn from the portrait head plus code-drawn body ring and direction arrow; no sprite sheets |

---

## 3. Tech stack (feasible, offline-first, LAN-first)

The GDD recommends Node host + SQLite + browser clients. I keep that core and choose concrete pieces for a small team, few native dependencies and an easy Windows package.

| Layer | Choice | Why / reuse |
|---|---|---|
| Language & repo | **TypeScript 6, pnpm workspace monorepo**, ESLint, Prettier | Same as GPD2; reuse configs |
| Runtime | **Node.js 24 LTS** | Ships `node:sqlite` built in and supports Single Executable Applications |
| Shared simulation | `packages/sim`: pure, deterministic TS, fixed 30 Hz, integer tile maths, seeded RNG, no DOM / network / DB imports | GPD2 `rng.ts`, `hash.ts`, replay golden-file pattern |
| Rules & balance data | `packages/rules`: versioned JSON + TS types, zod schemas; `balance.v1.json` marks LOCKED/PROVISIONAL fields | GPD2 content schema pattern |
| Content | `packages/content`: Campaign/Challenge manifests, achievements, store, i18n strings, validator tests | GPD2 `content` package pattern |
| AI | `packages/ai`: bot controllers that emit commands only | GPD2 AI structure (search, difficulty, policy) |
| Protocol | `packages/protocol`: message types + zod validation, protocol version, snapshot/event envelopes (GDD Appendix A) | GPD2 protocol/validate/reconnect |
| Host server | `apps/host`: Node `http` + **`ws`**, static file serving, room/session/approval, authoritative loop, port fallback | GPD2 lan-server uses `ws` |
| Persistence | **SQLite via `node:sqlite`** (no native build); WAL mode; migrations with pre-migration backup; fallback `better-sqlite3` if a gap appears | Meets PR/DB requirements, easy to package |
| Client | `apps/client`: **Vite + React 19** for menus/lobby/results; **PixiJS 8** (WebGL, Canvas fallback) for the match view | Static build, works offline over LAN; Pixi keeps 31×31 + particles at 60 FPS on phones and gives the Auto/High/Standard/Reduced quality switch |
| Audio | Web Audio: music layers with 0.5–1.0 s crossfade, priority mixer and ducking, synthesized SFX | Port GPD2 `audio/engine.ts`, `synth.ts`, `voices.ts` |
| Announcer | Offline TTS (espeak-ng + MBROLA) EN/ZH/DE, post-processed like GPD2's referee | Port GPD2 `tools/voice/build-voice.py`; no voice actor needed |
| i18n | JSON per locale, CJK font subset for offline | GPD2 i18n + `subset-cjk-font.py` |
| QR invites | `qrcode-generator` | Used in GPD2 |
| Tests | Vitest, fast-check (property tests for mazes and sim), Playwright E2E (multi-context = multiple devices), custom network fault-injection proxy in tests | GPD2 stack |
| CI | GitHub Actions: typecheck, lint, unit, sim goldens, Playwright on Windows + Ubuntu | |
| Dev startup | `start.bat` (Windows), `start.sh` (Linux/macOS) call the same Node bootstrap (no port scanning in scripts, OPS-02) | GPD2 start scripts as a base |
| Windows package | **Node SEA executable** `GuosPuzzleDuel4.exe` with the client build embedded; it opens a loopback **Host Control** page (Start Hosting / Stop Hosting / LAN on-off / QR / backups) and the game in the default browser; zipped with checksums | Satisfies OPS-01 without Electron; Option B: Electron tray app (heavier, ~150 MB) |

What I deliberately do not use: Next.js (no server rendering needed; a static Vite build is simpler offline), Firebase or any cloud (non-goal), Electron (size), a game engine like Godot/Unity (browser clients are required; TypeScript sim must be shared with the host).

### Repository layout

```
apps/
  host/        Node host: http + ws + sqlite + launcher control page
  client/      Vite + React + Pixi browser client
packages/
  sim/         deterministic simulation (pure)
  rules/       rule data, balance file, precedence tables
  protocol/    messages, validation, versioning
  ai/          bot controllers
  content/     levels, challenges, achievements, store, i18n
tools/         asset pipeline (webp/ogg/m4a), voice build, release packaging
assets/        source art/audio pulled from the Pictures repo (pipeline output goes to apps/client/public)
docs/          GDD, this plan, mechanics appendix, test evidence
```

---

## 4. Milestones

Each milestone ends with something you can run locally with the PowerShell commands in the README. Art never blocks a milestone: every asset has a code-drawn placeholder until the real file lands.

| # | Milestone | Main deliverables | Done when | Needs from you |
|---|---|---|---|---|
| **M0** | Plan & mechanics appendix | This plan; `docs/MECHANICS.md` (the accepted decisions turned into exact rules + precedence table); `balance.v1.json` | You accept or change the decisions in §2 | Decision answers |
| **M1** | Foundation | Monorepo, CI, host bootstrap with port fallback + single-instance lock, SQLite init/migrations, Vite client shell with the unified favicon, `start.bat`/`start.sh`, test harness | `start.bat` opens the game shell; port 3000 busy → 3001 works; tests green in CI | — |
| **M2a** | Playable core match (vertical slice) | Symmetric maze generator + validator, movement, energy, bombs, shields, boss (patterns 1–3) with Guo poses, tokens, shortcuts, escape, timer, tick pipeline (D-12), results; Local VS on shared keyboard and Solo vs a basic AI; Pixi renderer with procedural tiles | A full match maze → boss → tokens → escape → result, deterministic replays, G-/AB- tests pass | **First play-test** on your PC; feedback on feel |
| **M2b** | Environment | Traps, teleporters, boost/ice/conveyor, pickups, timed gates, fog/darkness, boss patterns 4–8, wall classes, interaction-matrix tests (GDD §17) | Every ENV-* acceptance test passes; validator proves routes with all elements | Second play-test: environment feel |
| **M3** | Local WiFi VS | Lobby, QR invite, host approval, slots/Ready rules, snapshots 20 Hz, prediction + reconciliation, pause consent, disconnect grace / reconnect / forfeit, touch controls | Host + phone, and host-only + 2 devices complete matches under injected latency/loss; NET-04/06/07 | Test with your phone/tablet on home Wi-Fi |
| **M4** | Profiles & economy | Profiles, guests, stats, credits ledger, Store (characters + code-drawn cosmetics), purchases/refunds, achievements, backups, export/import, archive bin | Idempotency, no-double-reward and restore tests pass; DB-02/03, ECON-01 | — |
| **M5** | Content & AI | 5 AI/boss tiers, 40 Campaign levels, 25 Challenges, Random seeds, stars/medals, Museum with showcase | Content validation + progression tests; all modes complete | Optional: play-test chapter 1, star thresholds |
| **M6** | Presentation | Final art & music integration, title loop, announcer EN/ZH/DE, VFX, HUD polish, EN/ZH/DE UI, accessibility settings, graphics Auto | UI-06, AV-01..06 and QA-04 on real browsers/devices | Art + music delivered (see `art_prompt.md`) |
| **M7** | Release | Windows SEA package + Host Control page, docs EN/ZH/DE, six-gate report, real-device run | All gates pass, no S1/S2; QA-03, QA-06/07 | Real-device testing (Android, iPhone/iPad) |

Ordering notes:

- M3 and M4 are independent after M2 and can be swapped if you prefer profiles before WiFi.
- Art is needed **for proper tests from M2 onward** (boss poses already exist, so M2 is fully testable without new art). Character portraits and title art are needed by M5/M6; procedural placeholders cover the gap.
- Every work item carries the requirement IDs it serves and maps them to tests (GDD v2.0 Appendix B).

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scope (full v1.0 is large, v2.0 adds the environment layer) | Long time to first fun | Vertical slice in M2; content as parameters; cosmetics in code |
| Shared keyboard ghosting (many keys held at once) | Missed inputs in Local VS | P1 and P2 keys sit at opposite ends of the keyboard (D-02); rebinding; key-test page that shows pressed keys |
| iOS Safari over plain HTTP (audio unlock, no service worker, screen sleep) | Phone sessions feel rough | Tap-to-start audio unlock, keep-awake via silent video fallback, no PWA dependency |
| `node:sqlite` maturity | Packaging or API gaps | Thin DB adapter; `better-sqlite3` fallback |
| Windows Firewall prompt on first LAN host | Players cannot join | Host Control page explains "Private networks only"; LAN hosting is an explicit toggle |
| Art arrives late | Final look/feel testing late | Placeholders everywhere; only 5 images required |
