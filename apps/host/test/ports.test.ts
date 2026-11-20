import http from 'node:http';
import type net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { PortRangeExhaustedError, listenOnFirstFreePort } from '../src/ports.js';
import { closeServer, freeRange, ipv6LoopbackAvailable, occupy, readFrom } from './helpers.js';

const others: net.Server[] = [];
const ours: http.Server[] = [];
afterEach(async () => {
  await Promise.all(others.splice(0).map(closeServer));
  await Promise.all(ours.splice(0).map(closeServer));
});

function newServer() {
  const s = http.createServer((_req, res) => res.end('ours'));
  ours.push(s);
  return s;
}

describe('port fallback (D-25)', () => {
  it('OPS-02: a free first port is used as is', async () => {
    const base = await freeRange(3);
    const result = await listenOnFirstFreePort(newServer(), {
      host: '127.0.0.1',
      firstPort: base,
      lastPort: base + 2,
    });
    expect(result).toEqual({ port: base, skipped: [] });
  });

  it('OPS-02: first port busy -> next port, and the other program keeps its port', async () => {
    const base = await freeRange(3);
    others.push(await occupy(base));
    const result = await listenOnFirstFreePort(newServer(), {
      host: '127.0.0.1',
      firstPort: base,
      lastPort: base + 2,
    });
    expect(result).toEqual({ port: base + 1, skipped: [base] });
    expect(await readFrom(base)).toBe('other');
  });

  it('OPS-02: several busy ports are skipped in order', async () => {
    const base = await freeRange(5);
    for (const p of [base, base + 1, base + 3]) others.push(await occupy(p));
    const result = await listenOnFirstFreePort(newServer(), {
      host: '127.0.0.1',
      firstPort: base,
      lastPort: base + 4,
    });
    expect(result).toEqual({ port: base + 2, skipped: [base, base + 1] });
  });

  it('OPS-03: an exhausted range stops with a clear message; port owners untouched', async () => {
    const base = await freeRange(3);
    for (let p = base; p <= base + 2; p++) others.push(await occupy(p));
    const server = newServer();
    const attempt = listenOnFirstFreePort(server, {
      host: '127.0.0.1',
      firstPort: base,
      lastPort: base + 2,
    });
    await expect(attempt).rejects.toBeInstanceOf(PortRangeExhaustedError);
    await expect(attempt).rejects.toThrow(`No free port between ${base} and ${base + 2}`);
    expect(server.listening).toBe(false);
    for (let p = base; p <= base + 2; p++) expect(await readFrom(p)).toBe('other');
  });

  it('QA-03: a program answering only on IPv6 loopback also counts as busy', async () => {
    if (!(await ipv6LoopbackAvailable())) return;
    const base = await freeRange(2);
    others.push(await occupy(base, '::1'));
    const result = await listenOnFirstFreePort(newServer(), {
      host: '127.0.0.1',
      firstPort: base,
      lastPort: base + 1,
    });
    expect(result.port).toBe(base + 1);
    expect(await readFrom(base, '::1')).toBe('other');
  });
});
