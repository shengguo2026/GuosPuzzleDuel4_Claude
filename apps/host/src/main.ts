/**
 * Command-line entry of the host (bundled to dist/host.mjs).
 *
 *   node apps/host/dist/host.mjs [--lan] [--no-open] [--data-dir <dir>]
 *                                [--first-port <n> --last-port <n>] [--smoke]
 *
 * --smoke starts, checks HTTP and WebSocket on the bound port, prints
 * "SMOKE OK port=<n>" and exits (used by the start-script tests in CI).
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { HostAlreadyRunningError, DatabaseTooNewError } from './db.js';
import { resolveDataDir } from './datadir.js';
import { describeHost, startHost } from './host.js';
import { PortRangeExhaustedError } from './ports.js';

interface Args {
  lan: boolean;
  open: boolean;
  smoke: boolean;
  dataDir: string | null;
  firstPort: number | null;
  lastPort: number | null;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    lan: false,
    open: true,
    smoke: false,
    dataDir: null,
    firstPort: null,
    lastPort: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--lan') args.lan = true;
    else if (a === '--open') args.open = true;
    else if (a === '--no-open') args.open = false;
    else if (a === '--smoke') args.smoke = true;
    else if (a === '--data-dir') args.dataDir = next();
    else if (a === '--first-port') args.firstPort = Number(next());
    else if (a === '--last-port') args.lastPort = Number(next());
    else throw new Error(`Unknown option ${a}`);
  }
  return args;
}

export function openBrowser(url: string): void {
  const [cmd, cmdArgs] =
    process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, cmdArgs, { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => console.log(`  Open ${url} in your browser.`));
    child.unref();
  } catch {
    console.log(`  Open ${url} in your browser.`);
  }
}

async function smokeCheck(httpUrl: string, wsUrl: string, port: number): Promise<void> {
  const health = await fetch(new URL('/api/health', httpUrl));
  if (!health.ok) throw new Error(`health check returned ${health.status}`);
  const page = await fetch(httpUrl);
  if (!page.ok) throw new Error(`client page returned ${page.status}`);
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { origin: `http://127.0.0.1:${port}` });
    const timer = setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    ws.once('message', (data) => {
      clearTimeout(timer);
      const msg = JSON.parse(String(data)) as { port?: number };
      ws.close();
      if (msg.port === port) resolve();
      else reject(new Error(`WebSocket reported port ${msg.port}`));
    });
    ws.once('error', reject);
  });
}

async function main(): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(String((err as Error).message));
    return 2;
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  const clientDir = path.resolve(here, '../../client/dist');
  const dataDir =
    args.dataDir ??
    resolveDataDir({ platform: process.platform, env: process.env, homedir: os.homedir() });

  let host;
  try {
    host = await startHost({
      dataDir,
      clientDir,
      lan: args.lan,
      firstPort: args.firstPort ?? undefined,
      lastPort: args.lastPort ?? undefined,
    });
  } catch (err) {
    if (err instanceof HostAlreadyRunningError) {
      console.error(`\n  ${err.message}\n`);
      if (args.open && err.other?.url) openBrowser(err.other.url);
      return 3;
    }
    if (err instanceof PortRangeExhaustedError || err instanceof DatabaseTooNewError) {
      console.error(`\n  ${err.message}\n`);
      return 4;
    }
    throw err;
  }

  for (const line of describeHost(host.info, dataDir)) console.log(line);
  if (host.database.migration.backupPath) {
    console.log(
      `  Database updated; previous version saved to ${host.database.migration.backupPath}`,
    );
  }

  if (args.smoke) {
    try {
      await smokeCheck(host.info.httpUrl, host.info.wsUrl, host.info.port);
      console.log(`SMOKE OK port=${host.info.port}`);
      return 0;
    } finally {
      await host.stop();
    }
  }

  if (args.open) openBrowser(host.info.httpUrl);

  await new Promise<void>((resolve) => {
    const shutdown = () => {
      console.log('\n  Stopping the game host…');
      void host.stop().then(resolve);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
    process.once('SIGHUP', shutdown);
  });
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
