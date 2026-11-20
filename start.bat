@echo off
rem Guo's Puzzle Duel IV: double-click to start (implementation plan WP 1.6).
rem Checks Node.js 24 and pnpm, installs dependencies, builds, starts the game
rem host and opens the browser. The host itself picks a free port (OPS-02).
rem Options are passed to the host, e.g.  start.bat --lan   or   start.bat --no-open
rem Closing the browser tab does not stop the game; close this window or press Ctrl+C.
setlocal
title Guo's Puzzle Duel IV
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed, or this window cannot find it.
  echo  1. Download Node.js 24 LTS from https://nodejs.org and install it.
  echo  2. Double-click start.bat again.
  echo.
  pause
  exit /b 1
)

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
  echo.
  for /f "delims=" %%v in ('node --version') do echo  This computer has Node.js %%v; the game needs Node.js 24 or newer.
  echo  Install Node.js 24 LTS from https://nodejs.org, then double-click start.bat again.
  echo.
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo.
  echo  pnpm is not installed. Install it once with this command
  echo  ^(in PowerShell or a Command Prompt^):
  echo.
  echo      npm install -g pnpm@10
  echo.
  echo  Then double-click start.bat again.
  echo.
  pause
  exit /b 1
)

echo  Installing dependencies...
call pnpm install --frozen-lockfile
if errorlevel 1 goto failed

echo  Building the game...
call pnpm build
if errorlevel 1 goto failed

node --disable-warning=ExperimentalWarning apps\host\dist\host.mjs %*
if errorlevel 1 goto failed
endlocal
exit /b 0

:failed
echo.
echo  The game stopped with an error; the messages above say why.
echo.
pause
exit /b 1
