#!/usr/bin/env bash
# Guo's Puzzle Duel IV: start on Linux or macOS (implementation plan WP 1.6).
# Checks Node.js 24 and pnpm, installs dependencies, builds, starts the game
# host and opens the browser. The host itself picks a free port (OPS-02).
# Options are passed to the host, e.g.  ./start.sh --lan   or   ./start.sh --no-open
# macOS: double-click start.command (it runs this script in Terminal).
cd "$(dirname "$0")" || exit 1

fail() {
  echo
  printf '%s\n' "$@"
  echo
  # Keep a double-clicked window open long enough to read the message.
  if [ -t 0 ]; then read -r -p "Press Enter to close." _; fi
  exit 1
}

command -v node >/dev/null 2>&1 ||
  fail " Node.js is not installed, or this terminal cannot find it." \
    " Install Node.js 24 LTS from https://nodejs.org, then start again."

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)" ||
  fail " This computer has Node.js $(node --version); the game needs Node.js 24 or newer." \
    " Install Node.js 24 LTS from https://nodejs.org, then start again."

command -v pnpm >/dev/null 2>&1 ||
  fail " pnpm is not installed. Install it once with:" "" "     npm install -g pnpm@10" "" \
    " (add sudo in front if npm says permission denied), then start again."

echo " Installing dependencies..."
pnpm install --frozen-lockfile || fail " Installing dependencies failed; the messages above say why."
echo " Building the game..."
pnpm build || fail " Building the game failed; the messages above say why."

node --disable-warning=ExperimentalWarning apps/host/dist/host.mjs "$@" ||
  fail " The game stopped with an error; the messages above say why."
