# Guo's Puzzle Duel IV

A colourful top-down tile-maze arcade duel: two players fight a shared boss (Guo), then race to collect their own token and escape through the rival's original entrance. Solo vs AI, shared-keyboard Local VS and Local WiFi VS with an authoritative PC host and browser clients.

Status: **implementation plan approved** (20 Nov 2026); M0 (rules and balance file) approved; M1 (foundation: start scripts, host, database, client shell, CI) in review. All required art and music is delivered in the Pictures repo; the optional theme tiles are in [tile_prompts.md](tile_prompts.md).

## Documents

- [docs/Guos_Puzzle_Duel_IV_Full_Fidelity_GDD_v2.0.pdf](docs/Guos_Puzzle_Duel_IV_Full_Fidelity_GDD_v2.0.pdf): the game design document (Full-Fidelity GDD v2.0; replaces v1.0).
- [docs/PLAN.md](docs/PLAN.md): gap analysis with decisions, tech stack and milestones.
- [docs/implementation_plan.md](docs/implementation_plan.md): work packages per milestone, tests and review points (approved 20 Nov 2026).
- [docs/MECHANICS.md](docs/MECHANICS.md): the canonical game rules, numbered and testable (M0).
- [packages/rules/balance.v1.json](packages/rules/balance.v1.json): every tunable number, marked LOCKED or PROVISIONAL, with its [JSON schema](packages/rules/balance.v1.schema.json).
- [docs/TRACEABILITY.md](docs/TRACEABILITY.md): every GDD requirement ID mapped to rules, work package and planned test.
- [art_prompt.md](art_prompt.md): what art is reused, Codex image prompts, Google Flow title loop and music prompts.
- [favicon.svg](favicon.svg): the unified Guo mark used across all of Guo's games.

## Get the code on Windows (PowerShell)

First time:

```powershell
cd C:\AI\Claude
git clone https://github.com/shengguo2026/GuosPuzzleDuel4_Claude.git
cd GuosPuzzleDuel4_Claude
```

Later, to get the newest work:

```powershell
cd C:\AI\Claude\GuosPuzzleDuel4_Claude
git checkout main
git pull
```

## Start the game

You need **Node.js 24 LTS** and **pnpm 10** (`npm install -g pnpm@10`).

- Windows: double-click `start.bat`, or in PowerShell run `.\start.bat`.
- Linux: `./start.sh`. macOS: double-click `start.command`.

The script installs the dependencies, builds the game, starts the game host and opens the browser. The host uses port 3000, or the next free port up to 3019 if another program uses it, and prints which one. Closing the browser tab does not stop the game; close the window or press Ctrl+C to stop it.

Options (after the script name, e.g. `.\start.bat --lan`):

| Option | Effect |
|---|---|
| `--lan` | Let phones and tablets on your network join (default: only this PC) |
| `--no-open` | Do not open the browser |
| `--data-dir <folder>` | Use another saved-data folder (default `%LOCALAPPDATA%\GuosPuzzleDuel4`) |

Saved data lives outside the game folder: Windows `%LOCALAPPDATA%\GuosPuzzleDuel4\`, macOS `~/Library/Application Support/GuosPuzzleDuel4/`, Linux `~/.local/share/guos-puzzle-duel-4/`. Only one game host can use a data folder at a time; a second start says where the first one runs.

## Develop

```powershell
pnpm install
pnpm typecheck; pnpm lint; pnpm test     # unit tests
pnpm build; pnpm test:smoke              # start-script smoke tests
pnpm test:e2e                            # Playwright (needs: pnpm --filter @gpd4/client exec playwright install chromium)
```

| Folder | Contents |
|---|---|
| `apps/host` | Node host: HTTP + WebSocket, port fallback, SQLite (`node:sqlite`), single-instance lock |
| `apps/client` | Vite + React browser client (Pixi match view from M2a) |
| `packages/sim` | Pure deterministic simulation (no DOM, network, database; enforced by ESLint) |
| `packages/rules` | `balance.v1.json`, its schema and typed access |
| `packages/protocol` | Host/client messages |
| `packages/ai` | AI opponents |
| `packages/content` | i18n strings (EN/ZH/DE), later levels, achievements, store |
