# Guo's Puzzle Duel IV: gap analysis, tech stack and implementation plan

Status: **proposal for review** (v0.1, 15 Nov 2026). Source: `docs/Guos_Puzzle_Duel_IV_GDD_v1.0.pdf` (GDD v1.0, read in full).

This document does three things:

1. Lists what the GDD leaves open or under-specified, with options and a recommended default for each (section 2).
2. Proposes a tech stack that is feasible for this scope, reusing proven pieces from Guo's Puzzle Duel II (section 3).
3. Lays out milestones that keep implementation moving while art is still being made (section 4).

The art plan and all prompts are in [`art_prompt.md`](../art_prompt.md).

**How to answer:** for every decision in section 2 the *Recommended* option is what I will implement unless you say otherwise. Reply "accept all", or name the IDs you want changed (for example "D-05: option B").

---

## 1. Summary

The GDD is strong on *rules of fairness, authority and persistence* and deliberately leaves *combat mechanics, content and economy numbers* open (it marks them TBD/PROVISIONAL and asks for a mechanics appendix before coding, BAL-04). The biggest gaps are:

- **Movement and combat model** (grid cadence, bomb placement and blast shape, shield behaviour, charge cancel, self-damage). Without these nothing can be coded. I propose a complete default set below.
- **Terminal-event precedence** (BAL-07). A complete tick-resolution table is proposed in D-12.
- **Maze fairness**. I recommend point-symmetric mazes, which removes most of the P1/P2 asymmetry measuring problem.
- **Boss design**. The boss is Guo; the eight existing Guo boss poses from Puzzle Duel III map exactly onto warning, attack, freeze, hit, recover, defeated and victory states. Zero new boss art.
- **Content volume** (40 Campaign levels, 25 Challenges, achievements, Museum). I recommend generating levels from authored *parameters* (seed + size + modifiers + boss tier) instead of hand-drawn maps, so content becomes data, not art.
- **Scope**. The GDD roadmap reaches a full v1.0 with LAN reconnect, economy, Museum, three languages and a packaged Windows launcher. That is achievable, but only if the vertical slice (maze → boss → tokens → escape → result) comes first, as the GDD itself says. My milestone plan puts a playable shared-keyboard match in your hands at the end of M2.

Art: **5 new images are required** (1 title key art, 4 character portraits), plus 1 Flow title loop clip and 3 required music cues. Everything else reuses existing art or is drawn in code. Details in `art_prompt.md`.

---

## 2. Gap analysis: decisions with options and recommendations

Notation: **Rec** marks the recommended option. Numbers are starting values kept in an editable balance file (`balance.v1.json`) so tuning never needs code changes.

### 2.1 Movement and controls (GDD C-001, BAL-04)

**D-01 Movement model** — ✅ **Decided 15 Nov: B**
- A. Free continuous movement with circular hitboxes (sub-tile positions).
- **B (Rec). Tile-locked lane movement**: players move tile to tile along corridors at a fixed cadence; holding a direction keeps moving; a turn pressed slightly early is buffered and taken at the next junction ("cornering buffer").
- Why B: the GDD counts Attack regeneration in *tiles* (C-002), uses tile mazes, and wants deterministic host simulation. B makes "qualifying tile", collision, prediction and replay exact. A causes wall-sliding edge cases and makes reconciliation harder.
- Values: 30 Hz tick, **5 ticks per tile (6 tiles/s)**, no speed differences between characters (E-006).

**D-02 Input maps** — ✅ **Decided 15 Nov (Guo's layout)**; touch details pending confirmation (D-02a, D-02b)
- Solo / single keyboard player (one hand): **W A S D** move, **Q = Bomb, E = Shield**. Alternative: arrows + **Numpad 1 / Numpad 2**.
- Shared keyboard (Local VS):
  - P1: **W A S D** move, **Q** Bomb, **E** Shield.
  - P2: **Arrow keys** move, **Numpad 1** Bomb, **Numpad 2** Shield. Alternative for keyboards without a numpad: **, (comma)** Bomb, **. (period)** Shield.
- Keys are read by physical position (`KeyboardEvent.code`), so Numpad 1/2 work with Num Lock on or off, and Q/W/E/A/S/D stay in the same place on German QWERTZ and French AZERTY keyboards.
- All rebindable in Settings; rebinding rejects conflicts between the two Local VS players. A key-test page shows which keys the keyboard reports, to spot ghosting.
- Touch (phones/tablets): **swipe to move** on the left/centre of the screen, **two right-thumb buttons ≥ 64 px** (Bomb, Shield) with a hold-to-charge ring.
  - A swipe (≥ 24 px) sets the heading; the character keeps moving that way until a wall, and a swipe made before a junction is buffered and taken at the next possible turn (same cornering buffer as the keyboard).
  - **D-02a (pending, Rec):** a short tap in the swipe area stops the character (needed to stand still for Defense regeneration).
  - **D-02b (pending, Rec):** a floating 4-way D-pad stays available in Settings as an accessibility option.
  - The swipe area ignores the outer 24 px of the screen (iOS/Android back gestures) and blocks browser scrolling, pull-to-refresh and zoom during a match.

**D-03 Charge (Super Bomb / Super Shield) input**
- A. Separate buttons for Super.
- **B (Rec). Same button, tap vs. hold**: tap (released < 0.25 s) = normal ability; hold shows a charge ring; release after **2.0 s** with 3 energy = Super; release between 0.25 s and 2.0 s cancels with **no cost**. Cost is deducted on commit only (host tick of release). Charging does not slow movement. Taking damage cancels the charge (no cost).
- If energy < 3 the ring does not fill (greyed); tapping still gives a normal ability.

**D-04 Resource regeneration details**
- Attack +1 per **12 tiles entered by the player's own movement input**. Progress carries over (not reset when stopping). Knock-back or other forced movement does not count (C-002).
- Defense +1 per **7.0 s continuously standing still** with no movement input, not charging, not stunned, not paused. Any movement input resets the 7 s counter to zero.
- Both at 3 cap: progress stops (no banking).

### 2.2 Combat (C-004 to C-007, BAL-04)

**D-05 Bomb delivery**
- **A (Rec). Placed bomb** on the player's current tile, fuse **1.5 s**, the bomb tile blocks movement for others (owner can step off). Classic, readable, works perfectly on a tile grid and with telegraphs.
- B. Thrown bomb travels N tiles in facing direction. More skill-shot, harder on touch, more network-sensitive.
- C. Instant blast in front of the player. Simple but no counterplay window for Shield.

**D-06 Blast shape and damage**
- Normal Bomb: **cross (+) radius 2**, stops at solid walls; destroys **breakable** walls; 1 damage to players; **1 damage to the boss** if any blast tile touches the boss arena core.
- Super Bomb: **cross radius 4 plus a 3×3 core**; destroys breakable **and reinforced** walls; breaks an enemy Super Shield barrier; 1 damage to players, **3 damage to the boss**.
- Blast lasts 0.3 s (one hit per player per blast).
- **Self-damage: Rec yes** (your own bomb hurts you). It is the core risk of the bomb and keeps "same rules for both players". Option: off on Easy/Campaign chapter 1 only.
- Friendly fire between duelists in Boss Phase: **yes**. The duel is competitive from GO; harming the rival while fighting the boss is a deliberate strategy, and the boss telegraphs keep it readable.

**D-07 Life and hit recovery**
- 3 Life (locked). After a hit: **1.5 s invulnerability** with blinking (also used as reduced-motion-safe outline flash). No respawn, no knock-back (Rec: knock-back adds forced movement complexity for little value).

**D-08 Normal Shield**
- 3 s bubble around the player: blocks all damage (bombs, boss), player keeps moving, cannot place bombs while shielded (Rec, gives the shield a cost beyond energy). Option: allow bombs while shielded.

**D-09 Super Shield (Escape Phase only, C-006)**
- The GDD says it "may block the opponent's exit for up to 15 seconds". The opponent's exit is the *caster's own* original entrance.
- A. A personal 15 s shield bubble that also blocks the entrance if the caster stands on it.
- **B (Rec). A barrier tile**: after the 2 s charge it is placed on the caster's current tile (caster steps off freely); it is impassable for the opponent, passable for the caster, lasts **15 s**, one active per player, a valid Super Bomb destroys it. It can be placed anywhere, which naturally means "blockade my entrance" or "block a corridor to your token".
- C. Only usable within 3 tiles of the caster's own entrance. More literal but awkward on large mazes.
- A mutual blockade (both barriers active) simply runs until expiry or a Super Bomb; the timer resolves it if nobody acts.

**D-10 Wall types and destructibility (M-003)**
- Border wall: indestructible. Solid wall: indestructible. Breakable wall: Normal or Super Bomb. Reinforced wall: Super Bomb only.
- The generator guarantees every mandatory route (spawn → boss, spawn → each token, token → opposite entrance) exists **without destroying anything**. Destruction only creates shortcuts, so M-003 reachability holds by construction. Destroyed walls stay destroyed (no regrowth) in v1.

### 2.3 Match flow, boss and victory (G-001 to G-009, B-001 to B-003, BAL-07)

**D-11 Maze fairness and layout (M-001/M-002)**
- **A (Rec). Point-symmetric (180° rotational) generation**: generate one half, rotate it. P1 (North) and P2 (South) get mirror-identical routes to the boss, tokens and exits. Boss arena at the centre. Fairness is exact, so the "acceptable asymmetry thresholds" become logging only.
- B. Fully random mazes with measured asymmetry thresholds and re-roll. More variety, but needs fairness tuning (GDD marks the thresholds PROVISIONAL).
- Authored Campaign/Challenge maps can use either; the validator still runs on both.
- Arena: 3×3 boss core inside a 5×5 open ring on Small/Medium, 5×5 core in 7×7 ring on Large. Entrances are sealed gates during Boss Phase and open at the phase flip.

**D-12 Terminal-event precedence (BAL-07, AC-02)** — resolved inside one host tick in this fixed order, independent of message arrival order:

1. Apply inputs (movement, ability commits) in slot order P1, P2 (order cannot change outcomes because steps 2 to 4 are simultaneous).
2. Resolve all damage of this tick simultaneously (bombs, boss).
3. Knock-outs: a player at 0 Life is KO'd.
4. Escapes: a player who is **not KO'd this tick**, holds their own token and stands on the opponent's original entrance (not barrier-blocked) has escaped.
5. Timer: only if no outcome from steps 3 to 4.

| Same-tick situation | Result |
|---|---|
| Both KO | Draw |
| Both escape | Draw |
| A escapes, B KO'd | A wins |
| A escapes but is also KO'd this tick | A's escape is void; B wins by KO (if B alive) |
| A KO'd by own bomb | B wins |
| Boss attack KOs both | Draw |
| Valid escape or KO on the tick the timer hits 0 | Escape / KO stands (timer is checked last) |
| Timer 0, no outcome | Draw (G-005) |
| Explicit Leave / grace expiry | Handled by N-009, before step 1 of the next tick |

**D-13 Tokens (G-004, I-02)**
- Spawn on the boss-defeat tick at symmetric positions, each in the half *farther* from its owner's opponent entrance, so the route is token → boss arena → opponent entrance (forces crossing paths). Only the owner can pick a token up; the other player walks over it.
- **Rec: tokens are not dropped on hit** (simpler, readable). Option: drop on hit for a "contested" Challenge category.
- Visuals: reuse the GPD2 blue and red crystals (P1 blue, P2 red, plus "1"/"2" label for colour independence).

**D-14 Boss behaviour (B-001, BAL-03)**
- The boss (Guo) stays in the arena core; it does not walk the maze. Telegraphed attacks, each warning → attack → recovery:
  - **Orb Shot**: line along a row or column through the arena (warning stripe 1.0 s).
  - **Shockwave**: expanding ring radius 2 to 5 around the arena (warning ring 1.2 s).
  - **Freeze Field**: marked tiles become ice for 3 s: players on them are slowed 50% (warning 1.0 s). (Uses the existing "freeze-cast" pose.)
  - **Rage** below 30% HP: shorter cooldowns per tier table.
- The boss targets the nearest player, ties alternate, so it cannot favour P1.
- Damage: boss attacks deal 1 Life. Boss HP 6/9/12/15/18 by tier (PROVISIONAL, as GDD).
- Five tiers differ by: HP, attack cooldown, warning length (never below 0.6 s), number of simultaneous attacks, Freeze Field use (Medium+), Rage (Hard+).
- Pose mapping (existing art, Pictures repo `GuosPuzzleDuelIII/boss/`): idle, charging = warning, attack, freeze-cast, hit (on damage), recovering, defeated (phase flip), victory (both players KO'd / timeout draw screen).
- Boss damage is credited per player for the economy and stats.

**D-15 Solo vs AI, Campaign and difficulty**
- The AI opponent uses only legal inputs through the same command queue as humans (B-002). Five AI tiers by reaction delay, path planning depth, bomb-risk tolerance and Super use.
- Campaign = Solo vs AI. Standard difficulty links AI, boss and maze tier; Custom sets them separately (M-005).

### 2.4 Content and progression (P-001 to P-005, BAL-06, CONTENT-01)

**D-16 How levels are authored**
- A. Hand-drawn tile maps for all 65 levels.
- **B (Rec). Parameterised levels**: each Campaign level / Challenge is a JSON entry `{seed, size, theme, bossTier, aiTier, modifiers[], objectives, starThresholds}`, generated by the same validated generator; a few showcase levels may pin hand-edited maps. A level editor is not needed for v1.
- Campaign: 5 chapters × 8 levels = the 5 themes in order (Enchanted Garden, Desert Ruins, Crystal Caverns, Neon Circuit, Volcanic Citadel), sizes and tiers rising inside each chapter. Chapter cover = theme tile art + title art, no extra images.

**D-17 Stars (Campaign)**: 1 star = win; 2 stars = win within par time (per level); 3 stars = win without losing a Life. Max 120 (locked).

**D-18 Challenge categories (5 × 5)** — proposed names:
1. **Speed Escape** (win under par time; medals by time).
2. **Boss Breaker** (deal the most boss damage / finish boss under time).
3. **Blockade Master** (Super Shield and Super Bomb focused, Escape-start scenarios).
4. **Scarce Energy** (start at 0 energy, slower regen).
5. **Iron Will** (1 Life, harder boss).
Bronze/Silver/Gold thresholds per challenge in the manifest.

**D-19 Random challenges**: seed + size + tier; records kept per `(generatorVersion, seed, size, tier)`; shareable 8-character seed code.

### 2.5 Economy, achievements, Museum (E-001 to E-007, A-001 to A-004, BAL-05)

**D-20 Starting economy (all PROVISIONAL, data file)**
- Match reward = base (Solo 40 / Local VS 30 per player / WiFi VS 40) × tier factor (0.8/1.0/1.2/1.5/2.0) + 3 × own boss damage + 20 win bonus. Draw: half of win bonus. Guests: none.
- Fox Adventurer 600, Mystic Slime 900 credits, or achievement unlock.
- Cosmetics v1: **colour trims, token shapes, trail effects, nameplate frames**: all drawn in code, so the Store needs no new art.
- Anti-farming: diminishing rewards after 10 completed matches between the same two profiles within 1 hour (50%, then 25%), reset after 1 hour. Never zero.

**D-21 Achievements**: a catalog of ~30, Bronze/Silver/Gold/Platinum, each using an existing GPD2 or Tower Defense badge picture with a tier frame drawn in code. Mapping in `art_prompt.md` §2.

**D-22 Museum**: six rooms as card galleries. Exhibits reuse existing art (boss poses, achievement badges, character portraits, maze thumbnails rendered from seeds). Public showcase = up to 6 chosen exhibit cards plus profile name and character, nothing else (A-004).

### 2.6 Network, persistence, operations (N-xxx, DB-xxx, D-xxx)

**D-23 Network numbers (NET-01)**: heartbeat 2 s, unresponsive at 6 s → DISCONNECT_PAUSED; inputs older than 250 ms (8 ticks) are applied at the current tick, not rewound; interpolation buffer 100 ms; reconnect token rotates on each reconnect, expires at grace end.

**D-24 Security (N-011, SEC-01)**: invite token 128-bit random, single-room, revocable; session credential bound to device + slot; Origin check on WebSocket upgrade; schema validation on every message; per-connection rate limit (60 msgs/s). HTTPS/WSS stays a later evaluation item (N-012); v1 stays HTTP on LAN with the warning text the GDD asks for.

**D-25 Ports (D-002/D-003, OPS-01)**: one Node bootstrap tries 3000, then 3001 … 3019 (20 candidates), reports the actually bound port to the launcher, URL and QR. Single host per user-data directory via a lock file with PID + start time plus SQLite `BEGIN EXCLUSIVE` check.

**D-26 Backups (OPS-02)**: automatic backup after each finalized session and daily (7 daily / 4 weekly / 3 monthly, as GDD), using SQLite online backup API into the user-data directory, no encryption in v1 (local only), manual Back Up / Restore and profile export/import as signed JSON (SHA-256 hash for integrity).

**D-27 Where user data lives (DB-004)**: Windows `%LOCALAPPDATA%\GuosPuzzleDuel4\`, macOS `~/Library/Application Support/GuosPuzzleDuel4/`, Linux `~/.local/share/guos-puzzle-duel-4/`.

### 2.7 Inconsistencies and small gaps found in the GDD

| Ref | Observation | Proposal |
|---|---|---|
| T-001 vs Campaign | Unlimited Time only in Local/WiFi VS; Campaign/Challenge timers not specified | Campaign and Challenges use the size timer unless a level overrides it |
| G-007 / N-006 | "Personal loadout" is never defined (abilities are fixed) | Loadout = character + cosmetics only |
| UI-006 / AV-003 | "Host voice language" for shared PC vs client language | Shared PC: host's language; each remote client plays its own announcer locally from events |
| T-002 | WiFi pause needs consent; what if the second player never answers? | Request expires after 10 s; the requester can still use Leave |
| P-005 / E-004 | "Access purchases" are not listed anywhere | v1: Challenge categories 4 and 5 and Large Random mazes can be bought early or unlocked by play |
| A-004 | Who are "authorized LAN participants"? | Approved devices in the current room only |
| AV-001 | 5 themes × 2 phases = 10 music tracks | One Boss/Escape pair shared by all themes, with a per-theme ambience layer (see `art_prompt.md`) |
| UI-001 | Five visual themes imply 5 tile sets | Procedural tiles first; Codex tile sheets are optional polish |
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
| Dev startup | `start.bat` (Windows), `start.sh` (Linux/macOS) call the same Node bootstrap (no port scanning in scripts, D-002) | GPD2 start scripts as a base |
| Windows package | **Node SEA executable** `GuosPuzzleDuel4.exe` with the client build embedded; it opens a loopback **Host Control** page (Start Hosting / Stop Hosting / LAN on-off / QR / backups) and the game in the default browser; zipped with checksums | Satisfies D-001/D-004 without Electron; Option B: Electron tray app (heavier, ~150 MB) |

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
| **M2** | Playable match (vertical slice) | Symmetric maze generator + validator, movement, energy, bombs, shields, boss with Guo poses, tokens, escape, timer, precedence table, results; Local VS on shared keyboard and Solo vs a basic AI; Pixi renderer with procedural tiles | A full match maze → boss → tokens → escape → result, deterministic replays, AC-01..04 tests pass | **First play-test** on your PC; feedback on feel |
| **M3** | Local WiFi VS | Lobby, QR invite, host approval, slots/Ready rules, snapshots 20 Hz, prediction + reconciliation, pause consent, disconnect grace / reconnect / forfeit, touch controls | Host + phone, and host-only + 2 devices complete matches under injected latency/loss; AC-06/07 | Test with your phone/tablet on home Wi-Fi |
| **M4** | Profiles & economy | Profiles, guests, stats, credits ledger, Store (characters + code-drawn cosmetics), purchases/refunds, achievements, backups, export/import, archive bin | Idempotency, no-double-reward and restore tests pass; AC-05/09 | — |
| **M5** | Content & AI | 5 AI/boss tiers, 40 Campaign levels, 25 Challenges, Random seeds, stars/medals, Museum with showcase | Content validation + progression tests; all modes complete | Optional: play-test chapter 1, star thresholds |
| **M6** | Presentation | Final art & music integration, title loop, announcer EN/ZH/DE, VFX, HUD polish, EN/ZH/DE UI, accessibility settings, graphics Auto | AC-10 on real browsers/devices | Art + music delivered (see `art_prompt.md`) |
| **M7** | Release | Windows SEA package + Host Control page, docs EN/ZH/DE, six-gate report, real-device run | All gates pass, no S1/S2; AC-08, AC-11 | Real-device testing (Android, iPhone/iPad) |

Ordering notes:

- M3 and M4 are independent after M2 and can be swapped if you prefer profiles before WiFi.
- Art is needed **for proper tests from M2 onward** (boss poses already exist, so M2 is fully testable without new art). Character portraits and title art are needed by M5/M6; procedural placeholders cover the gap.
- Every work item carries the acceptance-criteria ID it serves (GDD §20).

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scope (full v1.0 is large) | Long time to first fun | Vertical slice in M2; content as parameters; cosmetics in code |
| Shared keyboard ghosting (many keys held at once) | Missed inputs in Local VS | P1 and P2 keys sit at opposite ends of the keyboard (D-02); rebinding; key-test page that shows pressed keys |
| iOS Safari over plain HTTP (audio unlock, no service worker, screen sleep) | Phone sessions feel rough | Tap-to-start audio unlock, keep-awake via silent video fallback, no PWA dependency |
| `node:sqlite` maturity | Packaging or API gaps | Thin DB adapter; `better-sqlite3` fallback |
| Windows Firewall prompt on first LAN host | Players cannot join | Host Control page explains "Private networks only"; LAN hosting is an explicit toggle |
| Art arrives late | Final look/feel testing late | Placeholders everywhere; only 5 images required |
