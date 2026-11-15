# Guo's Puzzle Duel IV

A colourful top-down tile-maze arcade duel: two players fight a shared boss (Guo), then race to collect their own token and escape through the rival's original entrance. Solo vs AI, shared-keyboard Local VS and Local WiFi VS with an authoritative PC host and browser clients.

Status: **planning** (no game code yet).

## Documents

- [docs/Guos_Puzzle_Duel_IV_Full_Fidelity_GDD_v2.0.pdf](docs/Guos_Puzzle_Duel_IV_Full_Fidelity_GDD_v2.0.pdf): the game design document (Full-Fidelity GDD v2.0; replaces v1.0).
- [docs/PLAN.md](docs/PLAN.md): gap analysis with decisions, tech stack and milestones.
- [docs/implementation_plan.md](docs/implementation_plan.md): work packages per milestone, tests and review points (draft for review).
- [art_prompt.md](art_prompt.md): what art is reused, Codex image prompts, Google Flow title loop and music prompts.
- [favicon.svg](favicon.svg): the unified Guo mark used across all of Guo's games.

## Get the code on Windows (PowerShell)

First time:

```powershell
cd C:\AI\Claude
git clone https://github.com/shengguo2026/GuosPuzzleDuel4_Claude.git
cd GuosPuzzleDuel4_Claude
git fetch origin claude/project-thread-90x0d0
git checkout claude/project-thread-90x0d0
```

Later, to get the newest work:

```powershell
cd C:\AI\Claude\GuosPuzzleDuel4_Claude
git checkout claude/project-thread-90x0d0
git pull
```

Starting the game (from milestone M1 on) will be `start.bat`, or `pnpm install` then `pnpm start` in PowerShell; Node.js 24 LTS and pnpm 10 are needed.
