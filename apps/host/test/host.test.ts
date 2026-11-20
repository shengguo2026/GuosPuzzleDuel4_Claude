import { afterEach, describe, expect, it } from 'vitest';
import type net from 'node:net';
import { WebSocket } from 'ws';
import { HostAlreadyRunningError } from '../src/db.js';
import { describeHost, startHost, type RunningHost } from '../src/host.js';
import { qrSvg } from '../src/server.js';
import { closeServer, fakeClientDir, freeRange, occupy, readFrom, tempDir } from './helpers.js';

const hosts: RunningHost[] = [];
const others: net.Server[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.stop()));
  await Promise.all(others.splice(0).map(closeServer));
});

async function start(range: number, count = 3, dataDir = tempDir()) {
  const host = await startHost({
    dataDir,
    clientDir: fakeClientDir(),
    firstPort: range,
    lastPort: range + count - 1,
  });
  hosts.push(host);
  return host;
}

export function welcome(
  port: number,
  origin = `http://127.0.0.1:${port}`,
): Promise<{ port: number }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin });
    ws.once('message', (d) => {
      ws.close();
      resolve(JSON.parse(String(d)) as { port: number });
    });
    ws.once('error', reject);
  });
}

describe('host bootstrap', () => {
  it('OPS-02: 3000 busy -> 3001 with matching URL, WebSocket and QR', async () => {
    const base = await freeRange(3);
    others.push(await occupy(base));
    const host = await start(base);
    const port = base + 1;
    expect(host.info.port).toBe(port);
    expect(host.info.skippedPorts).toEqual([base]);
    expect(host.info.httpUrl).toBe(`http://127.0.0.1:${port}/`);
    expect(host.info.wsUrl).toBe(`ws://127.0.0.1:${port}/ws`);
    expect(host.info.joinUrl).toBe(`http://127.0.0.1:${port}/`);

    const info = (await (await fetch(`${host.info.httpUrl}api/info`)).json()) as Record<
      string,
      unknown
    >;
    expect(info).toMatchObject({
      port,
      httpUrl: host.info.httpUrl,
      skippedPorts: [base],
      lan: false,
    });
    expect((await welcome(port)).port).toBe(port);
    const qr = await (await fetch(`${host.info.httpUrl}api/qr.svg`)).text();
    expect(qr).toBe(qrSvg(`http://127.0.0.1:${port}/`));
    expect(await readFrom(base)).toBe('other');

    const lines = describeHost(host.info, 'X').join('\n');
    expect(lines).toContain(`Port ${base} was busy, so the game uses port ${port}.`);
  });

  it('OPS-03: a second host on the same data folder stops before taking a port', async () => {
    const base = await freeRange(3);
    const dataDir = tempDir();
    const first = await start(base, 3, dataDir);
    await expect(start(base, 3, dataDir)).rejects.toBeInstanceOf(HostAlreadyRunningError);
    await expect(start(base, 3, dataDir)).rejects.toThrow(first.info.httpUrl);
    // Nothing listens on base+1: the refused host never bound a port.
    await expect(readFrom(base + 1)).rejects.toThrow();
  });

  it('OPS-01: closing the browser tab does not stop the host', async () => {
    const base = await freeRange(2);
    const host = await start(base);
    await welcome(host.info.port); // opens and closes a connection like a tab
    await new Promise((r) => setTimeout(r, 100));
    const res = await fetch(`${host.info.httpUrl}api/health`);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('OPS-04: loopback-only by default; LAN bind only when enabled', async () => {
    const base = await freeRange(2);
    const local = await start(base);
    expect((local.http.server.address() as net.AddressInfo).address).toBe('127.0.0.1');
    expect(local.info.lan).toBe(false);
    await local.stop();

    const lanHost = await startHost({
      dataDir: tempDir(),
      clientDir: fakeClientDir(),
      lan: true,
      firstPort: base,
      lastPort: base + 1,
    });
    hosts.push(lanHost);
    expect((lanHost.http.server.address() as net.AddressInfo).address).toBe('0.0.0.0');
    expect(lanHost.info.lan).toBe(true);
  });

  it('UI-02: client routes are served the app shell, files with their type', async () => {
    const base = await freeRange(2);
    const host = await start(base);
    for (const route of ['/', '/play', '/settings']) {
      const res = await fetch(new URL(route, host.info.httpUrl));
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('<title>shell</title>');
    }
    const icon = await fetch(new URL('/favicon.svg', host.info.httpUrl));
    expect(icon.headers.get('content-type')).toBe('image/svg+xml');
  });
});
