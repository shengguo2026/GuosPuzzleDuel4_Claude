# Guo's Puzzle Duel IV: implementation plan

Status: **draft for Guo's review** (v0.1, 15 Nov 2026). No code is written until this plan is approved.

Inputs:
- [`Guos_Puzzle_Duel_IV_Full_Fidelity_GDD_v2.0.pdf`](Guos_Puzzle_Duel_IV_Full_Fidelity_GDD_v2.0.pdf): the requirements (IDs such as `G-009`, `ENV-TR-01`, `AB-03`).
- [`PLAN.md`](PLAN.md): every open point of the GDD decided (D-01 to D-36, all ✅), tech stack and risks.
- [`../art_prompt.md`](../art_prompt.md): art, video and music to generate; what is reused.

This plan turns those into work packages, in order, each with the requirements it serves, how it is tested, and what you can try at the end.

---

## 1. How the work runs

**Branches and pull requests.** One branch and one pull request per milestone (M1, M2a, …), merged into `main` only after your OK. Inside a milestone I push small commits; the PR description lists the work packages and requirement IDs it closes.

**Definition of done for every work package** (GDD Appendix B):
1. Code plus automated tests that name the requirement IDs they prove (`it('G-009: wrong token cannot win', …)`).
2. `pnpm typecheck`, `pnpm lint`, `pnpm test` green locally and in GitHub Actions (Windows + Ubuntu).
3. Tunable numbers live in `packages/rules/balance.v1.json`, never as hidden constants.
4. Nothing from a TBD is invented: if something turns out to be undecided, I stop and ask you with options.

**Your local test** after each milestone (PowerShell, from the README):

```powershell
cd C:\AI\Claude\GuosPuzzleDuel4_Claude
git fetch origin
git checkout <milestone branch>
git pull
.\start.bat
```

**Art never blocks code.** Every asset has a placeholder (code-drawn shape, Duel III boss poses, Duel II music) until the real file arrives in the Pictures repo under `GuosPuzzleDuel4/`.

---

## 2. Milestone overview

| # | Milestone | You can try at the end | Art/music needed for the full test |
|---|---|---|---|
| M0 | Rules document and balance file | Read and approve `MECHANICS.md` | — |
| M1 | Foundation | `start.bat` opens the game shell; ports and database work | — |
| M2a | Core match | A full match on one keyboard: maze → boss → tokens → escape → result; Solo vs a basic AI | Optional: B-GAR/E-GAR music |
| M2b | Environment | Traps, teleporters, terrain, pickups, gates, fog, boss patterns 4–8 | — |
| M3 | Local WiFi VS | Phone/tablet joins by QR and plays against the PC | — |
| M4 | Profiles and economy | Profiles with PIN, credits, Store with weekly sale, achievements, backups | 4 character portraits (IV-02 to IV-05) |
| M5 | Content and AI | 40 Campaign levels, 25 Challenges, Random with saved mazes, 5 AI tiers, Museum | Boss tier sets (IV-11 to IV-42) |
| M6 | Presentation | Title loop, music, announcer, VFX, EN/ZH/DE, accessibility, graphics quality | Title art IV-01, Flow title loop, all 14 music cues |
| M7 | Release | Windows package (`GuosPuzzleDuel4.exe`), six-gate report | — |

M3 and M4 do not depend on each other; they can swap if you prefer.

---

## 3. Milestones in detail

### M0 · Rules document and balance file

Goal: one canonical, testable rule text, so code and tests have a single source.

| WP | Work | Requirements | Output |
|---|---|---|---|
| 0.1 | Write `docs/MECHANICS.md`: every decided rule from PLAN.md as exact, numbered rules (movement cadence, energy, bombs, shields, Life, traps, teleporters, terrain, pickups, gates, fog, shortcuts, tokens, boss patterns, tick pipeline, outcome matrix) | CTRL-01–04, AB-01–05, ENV-*, BOSS-01–04, G-001–011 | `MECHANICS.md` |
| 0.2 | `balance.v1.json` schema and default values, every field marked LOCKED or PROVISIONAL | Appendix B | `packages/rules/balance.v1.json` + JSON schema |
| 0.3 | Acceptance-test index: requirement ID → planned test name, in `docs/TRACEABILITY.md` | GDD §18 | Traceability table |

**Your review:** read MECHANICS.md (it is PLAN.md decisions written as rules, nothing new).

### M1 · Foundation

Goal: the project starts reliably on Windows, Linux and macOS, with the test harness in place.

| WP | Work | Requirements | Tests |
|---|---|---|---|
| 1.1 | pnpm monorepo (`apps/host`, `apps/client`, `packages/sim`, `rules`, `protocol`, `ai`, `content`), TypeScript, ESLint, Prettier, Vitest, dependency rules (sim imports no DOM/network/DB) | QA-01 | Lint rule test |
| 1.2 | GitHub Actions: typecheck, lint, unit tests on Windows + Ubuntu; Playwright job | QA-01 | CI green |
| 1.3 | Host bootstrap: bind 3000, on `EADDRINUSE` try 3001 … 3019, stop with a clear message when exhausted; use the actually bound port for HTTP, WebSocket and QR; loopback-only by default, LAN as explicit option | OPS-02, OPS-03, OPS-04, NET-09 | Port tests: free, occupied → 3001, several occupied, exhausted, other processes untouched (QA-03) |
| 1.4 | User-data directory `%LOCALAPPDATA%\GuosPuzzleDuel4\` (macOS/Linux equivalents), single-instance lock, SQLite via `node:sqlite`, WAL, migration runner with pre-migration backup | DB-01, OPS-03, OPS-04 | Two hosts on one data dir: second refused; migration backup created |
| 1.5 | Client shell: Vite + React, unified Guo favicon, dashboard skeleton with all GDD routes (Play, Campaign, Challenges, Local VS, Local WiFi VS, Profiles, Store, Museum, Statistics, Settings) as placeholders, i18n scaffolding EN/ZH/DE | UI-02, UI-06 | Playwright: every route opens |
| 1.6 | `start.bat`, `start.sh`, `start.command`: check Node 24 and pnpm, install, build, call the bootstrap (no port scanning in scripts), open the browser; closing the tab does not stop the host | OPS-01, OPS-02 | Script smoke tests in CI |

**Your test:** `.\start.bat` opens the shell; start a second time → it picks 3001 and says so.

### M2a · Core match (vertical slice)

Goal: a complete, deterministic match without the environment layer.

| WP | Work | Requirements | Tests |
|---|---|---|---|
| 2a.1 | `packages/sim` core: fixed 30 Hz tick, integer tile grid, seeded RNG, state hash, replay recorder | INV-01, INV-02, NET-03 | Same seed + inputs → same hash (golden replays) |
| 2a.2 | Maze generator: point-symmetric (D-11 A) and non-symmetric (D-11 B, authored only); sizes 15/21/31; boss arena; North/South entrances stored immutable; route checker for every mandatory path | M-001–M-004, G-002, INV-07 | Property tests over thousands of seeds; swapped-player symmetry test (V-001) |
| 2a.3 | Movement: tile-locked lanes, 5 ticks per tile, cornering buffer, facing (D-01) | CTRL-01, CTRL-04 | Grid-transition tests |
| 2a.4 | Energy: Attack per 12 voluntary tiles, Defense per 7 s stationary, caps, presets Tactical/Normal/Fast, no Defense while own shield is up (D-04) | CTRL-02, CTRL-03 | Voluntary vs forced motion; pause never regenerates |
| 2a.5 | Abilities: tap/hold charge (D-03); thrown bombs 10 tiles/s, range 8, explode on first contact (D-05, D-06); Shield wall in front 3 s (D-08); Super Shield 15 s Escape-only, broken only by Super Bomb (D-09); wall classes (D-10) | AB-01–AB-05, ENV-WA-01/02/06 | Combat truth table, one test per row; 60-tick charge, 90-tick shield, 450-tick blockade |
| 2a.6 | Boss: HP per tier, patterns 1–3 (Orb Shot, Shockwave, Twin Orbs), warning → attack → recovery, nearest-target rule, Guo poses (Duel III set) | BOSS-01, BOSS-02, BOSS-04 (part) | Pattern timing tests; bombs destroy balls; shields block |
| 2a.7 | Phase flip on the boss-defeat tick: tokens at the boss (D-13), shortcuts open (D-34), exits blink in player colour | G-007, G-008, ENV-WA-05 | Same tick contains flip + spawn exactly once |
| 2a.8 | Tick pipeline and outcome matrix (D-12): KO, escape, draw, timer, Leave | G-009–G-011, TIME-01 | All 9 in-tick cells + out-of-tick cases, reversed arrival order |
| 2a.9 | Local VS on one keyboard (WASD+Q/E, arrows+Numpad 1/2, alternatives), pause, results screen | G-001, CTRL-01, TIME-02, UI-05 | Playwright: two players finish a match |
| 2a.10 | Solo vs basic AI through the same command interface | G-001, BOSS-05 | Bot-vs-bot runs end deterministically |
| 2a.11 | Pixi renderer: procedural tiles per theme palette, code-drawn bombs/shields/tokens, HUD with Life, energy, timer, phase, boss HP, exit arrow | UI-01, UI-04, M-005 | Screenshot tests; theme change keeps the state hash (M-005) |

**Your test (first play-test):** a full match on one keyboard and against the AI. Feedback on speed and feel goes into `balance.v1.json`.

### M2b · Environment

| WP | Work | Requirements | Tests |
|---|---|---|---|
| 2b.1 | Entity model for environment elements (`entityId, kind, tile, state, …`), maze revision events | Appendix A, ENV-WA-06 | Snapshot/restore round trip |
| 2b.2 | Traps: Spike, Shock, Snare; boss-spawned traps; Shield destroys traps (D-28) | ENV-TR-01–08, AB-03 | Lifecycle and trigger tests |
| 2b.3 | Teleporters (D-29) | ENV-TP-01–05 | Blocked destination, swap, cooldown, no Attack |
| 2b.4 | Speed Boost, Ice, Conveyor and their priority (D-30) | ENV-TE-01–05 | Interaction matrix rows |
| 2b.5 | Pickups: Attack Orb, Defense Orb, Healing Heart (D-31) | ENV-PU-01–05 | Cap, same-tick entry, no respawn |
| 2b.6 | Timed gates (D-32) | ENV-GA-01–04 | Occupied gate never closes; long run never seals |
| 2b.7 | Fog and darkness, shared-screen union view (D-33) | ENV-VI-01–04 | Visibility masks per mode |
| 2b.8 | Boss patterns 4–8 (Freeze Field, Trap Seeding, Wall Raise, Darkness Pulse, Ball Rain); tier unlocks; Rage | BOSS-03, BOSS-04, ENV-WA-03 | Each pattern's telegraph and cleanup on defeat |
| 2b.9 | Generator places environment symmetrically; route checker covers gates, traps and boss walls | M-003, M-004, INV-07 | Property tests with all elements |
| 2b.10 | One automated test per row of GDD §17 (D-35) | §17 | Matrix suite |

**Your test (second play-test):** environment feel on all three sizes.

### M3 · Local WiFi VS

| WP | Work | Requirements | Tests |
|---|---|---|---|
| 3.1 | Protocol package: versioned messages, schema validation, rate limits, origin check (D-24) | NET-02, NET-09, NET-10 | Malformed/malicious message tests |
| 3.2 | Rooms: QR invite and URL, random revocable invite tokens, host approval, slots, profile choice, Ready rules, shared settings proposals, countdown 3-2-1-GO on a tick | NET-05, G-004, G-005, UI-03 | Lobby state-machine E2E |
| 3.3 | Snapshots 20 Hz, events with IDs, client prediction + reconciliation, interpolation 100 ms (D-23) | NET-03, NET-04 | Convergence under injected latency |
| 3.4 | Pause with consent (10 s request expiry), disconnect pause, 30 s grace, reconnect with full state, forfeit, dual-disconnect draw, draw offer in Unlimited Time | TIME-02–TIME-04, NET-06, NET-07, NET-08 | 29 s accepted / 31 s forfeit; dual timeout; no duplicate events |
| 3.5 | Touch controls: swipe (tap to stop), optional D-pad, left-handed layout, sensitivity; chooser card, Settings, lobby panel, pause menu (D-02) | CTRL-01, UI-06 | Playwright mobile emulation |
| 3.6 | Fault-injection harness: latency 5–200 ms, jitter, loss, stalls, stale and duplicate inputs | QA-02 | Logged reproducible fixtures |

**Your test:** PC + your phone on home Wi-Fi; then host-only PC + two devices.

### M4 · Profiles and economy

| WP | Work | Requirements | Tests |
|---|---|---|---|
| 4.1 | Profiles, guests, unique active profile, archive bin 30 days, 4-digit PIN with lockout and host reset (D-22a) | PROFILE-01–PROFILE-04 | PIN, lockout, recovery without re-grant |
| 4.2 | Credit ledger with transaction IDs; idempotent match finalization | ECON-01, DB-02, INV-04 | Retry and crash-between-writes tests |
| 4.3 | Store: characters and code-drawn cosmetics, weekly sale shelf (4 items, 20% off, host clock), purchases with host approval for remote devices, 10-minute refunds (D-20) | ECON-03–ECON-07 | No double debit; sale price fixed at commit |
| 4.4 | Achievements (33, tiers) and credit awards (D-21) | MUS-01, MUS-05 | One grant per tier |
| 4.5 | Statistics and Profile viewer: credits, ledger, match history, stats, progress, inventory | PROFILE-03, PROFILE-06, UI-02 | Stats match finalized outcomes |
| 4.6 | Backups (after session, daily; 7/4/3 rotation), manual Back Up / Restore, profile export/import with integrity check and safety backup (D-26) | DB-03, DB-04, PROFILE-05 | Corrupt archive rejected; restore on sample data |

### M5 · Content and AI

| WP | Work | Requirements | Tests |
|---|---|---|---|
| 5.1 | **Level manifest for your approval:** 40 Campaign + 25 Challenge recipes with objectives, par times, star and medal thresholds, mirrored or not (D-16 to D-18) | PROG-01, PROG-02, PROG-04 | — (your sign-off, level by level) |
| 5.2 | Campaign: chapters, unlocks, stars kept per star (D-17) | PROG-01 | Progression and replay tests |
| 5.3 | Challenges: 5 categories, medals, access purchases | PROG-02, ECON-06 | Access ≠ completion |
| 5.4 | Random challenges: codes, records, **saved and named mazes** ("My Mazes") (D-19) | PROG-03 | Code reproduces maze; guests cannot save |
| 5.5 | AI tiers 1–5 (D-15), Standard/Custom difficulty | BOSS-05, PROG-05 | Bot-vs-bot balance runs |
| 5.6 | Museum: six rooms, exhibit cards, showcase of up to 6 cards (D-22) | MUS-02–MUS-04 | Unshared exhibits unreadable to others |
| 5.7 | Balance pass: bot statistics + economy simulation → tuned `balance.v1.json` | QA-05, BAL-01/02/10 | Report in `docs/balance-report.md` |

### M6 · Presentation

| WP | Work | Requirements | Tests |
|---|---|---|---|
| 6.1 | Asset pipeline (port of GPD2 `build-art.py` / asset registry): webp/ogg/m4a with hashed names; import from Pictures `GuosPuzzleDuel4/` | — | Registry check in CI |
| 6.2 | Art integration: title, portraits and head tokens, 5 boss tier sets, achievement badges with tier frames | UI-01 | Visual checks |
| 6.3 | Title loop video with still fallback | AV-04 | — |
| 6.4 | Music engine: 14 cues, Boss → Escape stinger bridge (boss cue fades under a ~1 s defeat stinger, Escape starts on its downbeat), priority mixer, ducking (port of GPD2 audio engine) | AV-01, AV-02 | Music never delays the phase event |
| 6.5 | Announcer EN/ZH/DE via offline TTS (port of GPD2 voice tool), subtitles, cooldowns; synthesized SFX | AV-03 | No repeated callout after reconnect |
| 6.6 | VFX for bombs, shields, charge, blockade timer, boss telegraphs; graphics Auto/High/Standard/Reduced | AV-04, AV-05, AV-06 | Quality modes keep hitboxes and tick timing |
| 6.7 | Full EN/ZH/DE text, CJK font subset; accessibility: high contrast, text scale, reduced motion, colour-independent markers, remapping, large touch targets | UI-01, UI-06, UI-07 | String coverage test; a11y checklist |

### M7 · Release

| WP | Work | Requirements | Tests |
|---|---|---|---|
| 7.1 | Windows package: Node SEA `GuosPuzzleDuel4.exe` with Host Control page (Start/Stop Hosting, LAN toggle, QR, backups, PIN reset), checksums | OPS-01, D-006 equivalent | Install, update without data loss |
| 7.2 | Real-device run: Windows host, Android, iPhone/iPad, desktop browsers; Linux/macOS start scripts | QA-04 | Device report |
| 7.3 | Security review: origins, sessions, rate limits, LAN-only binding | NET-09, QA-06 | Security gate evidence |
| 7.4 | Documentation EN/ZH/DE (player guide, host guide, firewall note), changelog | QA-06 | — |
| 7.5 | Six-gate report, S1/S2 zero, S3/S4 register | QA-06, QA-07 | Signed gates |

---

## 4. Art and music schedule against milestones

| Needed by | Items (art_prompt.md) | Placeholder until then |
|---|---|---|
| M2a play-test (nice to have) | B-GAR, E-GAR music | Duel II duel music |
| M4 | IV-02 to IV-05 character portraits | Coloured discs with initials |
| M5 | IV-11 to IV-42 boss tier sets | Duel III set with a tier tint |
| M6 | IV-01 title art, FLOW title loop, remaining 12 music cues | Code-drawn title, Duel II music |
| Optional | IV-06 to IV-10 tile sheets | Procedural tiles |

---

## 5. What I need from you, and when

| When | What |
|---|---|
| Now | Approve this plan (or name changes) |
| End of M0 | Read and approve `MECHANICS.md` |
| End of M2a, M2b | Play-tests on your PC; feel feedback |
| End of M3 | Test with your phone/tablet on home Wi-Fi |
| Before M5 | Approve the 65-level manifest level by level |
| Through M4–M6 | Generate art and music per art_prompt.md and push to Pictures `GuosPuzzleDuel4/` |
| M7 | Real-device tests (Android, iPhone/iPad) and release sign-off |
