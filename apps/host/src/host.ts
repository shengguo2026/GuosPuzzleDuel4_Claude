/**
 * Host bootstrap (WP 1.3, 1.4): lock the user-data folder, open the database,
 * bind the first free port, and serve the client. start.bat / start.sh call
 * this through main.ts; the scripts never scan ports themselves (OPS-02).
 */
import { hostPortRange } from '@gpd4/rules';
import { openHostDatabase, type HostDatabase } from './db.js';
import { listenOnFirstFreePort } from './ports.js';
import {
  HOST_VERSION,
  buildUrls,
  createHostServer,
  lanAddress,
  type HostInfo,
  type HostServer,
} from './server.js';

export interface StartHostOptions {
  dataDir: string;
  clientDir: string;
  /** Accept devices on the local network (default off: loopback only, OPS-04 / NET-09). */
  lan?: boolean;
  firstPort?: number;
  lastPort?: number;
}

export interface RunningHost {
  info: HostInfo;
  database: HostDatabase;
  http: HostServer;
  stop(): Promise<void>;
}

export async function startHost(options: StartHostOptions): Promise<RunningHost> {
  const lan = options.lan ?? false;
  // Lock first: a second host on the same data folder stops before taking a port.
  const database = openHostDatabase(options.dataDir);

  let info: HostInfo | null = null;
  const http = createHostServer({
    clientDir: options.clientDir,
    lan,
    dataDir: options.dataDir,
    getInfo: () => {
      if (!info) throw new Error('host not bound yet');
      return info;
    },
  });

  try {
    const bound = await listenOnFirstFreePort(http.server, {
      host: lan ? '0.0.0.0' : '127.0.0.1',
      firstPort: options.firstPort ?? hostPortRange.first,
      lastPort: options.lastPort ?? hostPortRange.last,
    });
    info = {
      name: "Guo's Puzzle Duel IV",
      version: HOST_VERSION,
      port: bound.port,
      skippedPorts: bound.skipped,
      lan,
      ...buildUrls(bound.port, lan, lan ? lanAddress() : null),
    };
    database.updateLock({ url: info.httpUrl });
  } catch (err) {
    database.close();
    throw err;
  }

  let stopped = false;
  return {
    info,
    database,
    http,
    async stop() {
      if (stopped) return;
      stopped = true;
      await http.close();
      database.close();
    },
  };
}

/** Lines printed to the start window (and checked by the smoke tests). */
export function describeHost(info: HostInfo, dataDir: string): string[] {
  const lines = [`Guo's Puzzle Duel IV host ${info.version}`];
  if (info.skippedPorts.length > 0) {
    const busy = info.skippedPorts.join(', ');
    lines.push(
      `  Port ${busy} ${info.skippedPorts.length > 1 ? 'were' : 'was'} busy, so the game uses port ${info.port}.`,
    );
  }
  lines.push(`  Game running on port ${info.port}: ${info.httpUrl}`);
  lines.push(`  Saved data: ${dataDir}`);
  lines.push(
    info.lan
      ? `  LAN on: phones and tablets on this network can join at ${info.joinUrl}`
      : '  LAN off: only this PC can connect (start with --lan to let other devices join).',
  );
  lines.push(
    '  Closing the browser tab does not stop the game. To stop it, close this window or press Ctrl+C.',
  );
  return lines;
}
