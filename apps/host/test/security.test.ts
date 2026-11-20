import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { startHost, type RunningHost } from '../src/host.js';
import { isAllowedOrigin } from '../src/server.js';
import { fakeClientDir, freeRange, tempDir } from './helpers.js';

const hosts: RunningHost[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.stop()));
});

async function start() {
  const base = await freeRange(2);
  const host = await startHost({
    dataDir: tempDir(),
    clientDir: fakeClientDir(),
    firstPort: base,
    lastPort: base + 1,
  });
  hosts.push(host);
  return host;
}

function upgradeStatus(port: number, path: string, origin?: string): Promise<number | 'open'> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`, origin ? { origin } : {});
    ws.once('open', () => {
      ws.close();
      resolve('open');
    });
    ws.once('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0));
    ws.once('error', () => undefined);
  });
}

function rawGet(port: number, path: string, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, headers: { host } }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.end();
  });
}

describe('host security (D-24)', () => {
  it('NET-09: foreign or missing Origin is refused on the WebSocket', async () => {
    const host = await start();
    const port = host.info.port;
    expect(await upgradeStatus(port, '/ws', `http://127.0.0.1:${port}`)).toBe('open');
    expect(await upgradeStatus(port, '/ws', `http://localhost:${port}`)).toBe('open');
    expect(await upgradeStatus(port, '/ws', 'http://evil.example')).toBe(403);
    expect(await upgradeStatus(port, '/ws', `http://127.0.0.1:${port + 1}`)).toBe(403);
    expect(await upgradeStatus(port, '/ws')).toBe(403);
  });

  it('NET-09: unknown paths are blocked', async () => {
    const host = await start();
    const port = host.info.port;
    expect(await upgradeStatus(port, '/other', `http://127.0.0.1:${port}`)).toBe(404);
    expect((await fetch(`${host.info.httpUrl}api/nope`)).status).toBe(404);
    expect((await fetch(`${host.info.httpUrl}missing.js`)).status).toBe(404);
    expect(await rawGet(port, '/../../package.json', `127.0.0.1:${port}`)).toBe(404);
    expect(await rawGet(port, '/%2e%2e/%2e%2e/package.json', `127.0.0.1:${port}`)).toBe(404);
    expect((await fetch(`${host.info.httpUrl}api/health`, { method: 'POST' })).status).toBe(405);
  });

  it('NET-09: requests for a foreign host name (DNS rebinding) are refused', async () => {
    const host = await start();
    const port = host.info.port;
    expect(await rawGet(port, '/api/health', `evil.example:${port}`)).toBe(421);
    expect(await rawGet(port, '/api/health', `localhost:${port}`)).toBe(200);
  });

  it('NET-09: with LAN off, an IP Origin other than loopback is refused', () => {
    expect(isAllowedOrigin('http://192.168.1.20:3000', 3000, false)).toBe(false);
    expect(isAllowedOrigin('http://192.168.1.20:3000', 3000, true)).toBe(true);
    expect(isAllowedOrigin('http://evil.example:3000', 3000, true)).toBe(false);
    expect(isAllowedOrigin('https://127.0.0.1:3000', 3000, false)).toBe(false);
  });
});
