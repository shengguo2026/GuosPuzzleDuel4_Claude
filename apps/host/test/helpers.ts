import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

export function tempDir(prefix = 'gpd4-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** A fake client build with an index page. */
export function fakeClientDir(): string {
  const dir = tempDir('gpd4-client-');
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>shell</title>');
  fs.writeFileSync(path.join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return dir;
}

/** Another program holding a port: answers every connection with "other". */
export async function occupy(port: number, host = '127.0.0.1'): Promise<net.Server> {
  const server = net.createServer((socket) => {
    socket.on('error', () => undefined); // port probes reset the connection
    socket.end('other');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen({ port, host, exclusive: true }, () => resolve());
  });
  return server;
}

export function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

/** Reads what the occupying program answers, proving it was left untouched. */
export function readFrom(port: number, host = '127.0.0.1'): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ port, host });
    let data = '';
    socket.on('data', (d) => (data += String(d)));
    socket.on('end', () => resolve(data));
    socket.on('error', reject);
  });
}

/** Finds `count` consecutive free ports, for an isolated test range. */
export async function freeRange(count: number): Promise<number> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const base = 20000 + Math.floor(Math.random() * 30000);
    const servers: net.Server[] = [];
    try {
      for (let p = base; p < base + count; p++) servers.push(await occupy(p));
      return base;
    } catch {
      // try another base
    } finally {
      await Promise.all(servers.map(closeServer));
    }
  }
  throw new Error('no free port range found');
}

export function ipv6LoopbackAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.listen({ port: 0, host: '::1' }, () => s.close(() => resolve(true)));
  });
}
