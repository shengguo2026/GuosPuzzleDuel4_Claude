/**
 * HTTP + WebSocket server of the host (OPS-02, NET-09).
 *
 * - Serves the client build and a small JSON API under /api.
 * - WebSocket on /ws only; the Origin must be this host's own page (NET-09, D-24).
 * - The Host header must be loopback, or (with LAN on) an IP address, which
 *   blocks DNS-rebinding pages from reaching the host.
 * - URLs, WebSocket URL and QR code always use the port actually bound.
 */
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import qrcode from 'qrcode-generator';
import { WebSocketServer, type WebSocket } from 'ws';
import { PROTOCOL_VERSION, type HostWelcome } from '@gpd4/protocol';

export const HOST_VERSION = '0.1.0';

export interface HostUrls {
  /** Address the PC's own browser opens. */
  httpUrl: string;
  wsUrl: string;
  /** Address other devices use; equals httpUrl while LAN is off. Encoded in the QR. */
  joinUrl: string;
}

export interface HostInfo extends HostUrls {
  name: string;
  version: string;
  port: number;
  skippedPorts: number[];
  lan: boolean;
}

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** First non-internal IPv4 address of this PC, for LAN join links. */
export function lanAddress(): string | null {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const addr of list ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return null;
}

export function buildUrls(port: number, lan: boolean, lanIp: string | null): HostUrls {
  const httpUrl = `http://127.0.0.1:${port}/`;
  return {
    httpUrl,
    wsUrl: `ws://127.0.0.1:${port}/ws`,
    joinUrl: lan && lanIp ? `http://${lanIp}:${port}/` : httpUrl,
  };
}

/** Hostname part of a Host header ("[::1]:3000" -> "[::1]"). */
function hostnameOf(hostHeader: string): string {
  if (hostHeader.startsWith('[')) return hostHeader.slice(0, hostHeader.indexOf(']') + 1);
  return hostHeader.split(':')[0] ?? '';
}

function isAllowedHostname(hostname: string, lan: boolean): boolean {
  const h = hostname.toLowerCase();
  if (LOOPBACK_HOSTNAMES.has(h)) return true;
  return lan && (net.isIP(h) !== 0 || net.isIP(h.replace(/^\[|\]$/g, '')) !== 0);
}

/** NET-09: a WebSocket must come from a page this host served, on this port. */
export function isAllowedOrigin(origin: string | undefined, port: number, lan: boolean): boolean {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  return (
    url.protocol === 'http:' && Number(url.port) === port && isAllowedHostname(url.hostname, lan)
  );
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function send(
  res: http.ServerResponse,
  status: number,
  body: string | Buffer,
  type: string,
  extra: Record<string, string> = {},
) {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extra,
  });
  res.end(body);
}

function sendJson(res: http.ServerResponse, status: number, data: unknown) {
  send(res, status, JSON.stringify(data), 'application/json; charset=utf-8', {
    'Cache-Control': 'no-store',
  });
}

export function qrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
}

const NOT_BUILT_PAGE = `<!doctype html><meta charset="utf-8"><title>Guo's Puzzle Duel IV</title>
<p>The game client is not built yet. Run <code>pnpm build</code> (start.bat does this), then reload.</p>`;

export interface HostServerOptions {
  clientDir: string;
  lan: boolean;
  /** Filled in once the port is bound. */
  getInfo: () => HostInfo;
  dataDir: string;
}

export interface HostServer {
  server: http.Server;
  wss: WebSocketServer;
  close(): Promise<void>;
}

function isLoopbackAddress(addr: string | undefined): boolean {
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

export function createHostServer(options: HostServerOptions): HostServer {
  const { clientDir, lan, getInfo } = options;
  const root = path.resolve(clientDir);

  const serveStatic = (urlPath: string, res: http.ServerResponse) => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(urlPath);
    } catch {
      return send(res, 400, 'Bad request', 'text/plain; charset=utf-8');
    }
    const file = path.resolve(root, '.' + path.posix.normalize('/' + decoded));
    if (file !== root && !file.startsWith(root + path.sep)) {
      return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    }
    const ext = path.extname(file).toLowerCase();
    if (ext && fs.existsSync(file) && fs.statSync(file).isFile()) {
      const immutable = decoded.startsWith('/assets/');
      return send(
        res,
        200,
        fs.readFileSync(file),
        CONTENT_TYPES[ext] ?? 'application/octet-stream',
        {
          'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        },
      );
    }
    if (ext) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    // Client-side route (/play, /settings, ...): serve the app shell.
    const index = path.join(root, 'index.html');
    if (!fs.existsSync(index)) return send(res, 503, NOT_BUILT_PAGE, 'text/html; charset=utf-8');
    return send(res, 200, fs.readFileSync(index), 'text/html; charset=utf-8', {
      'Cache-Control': 'no-cache',
    });
  };

  const server = http.createServer((req, res) => {
    const hostHeader = req.headers.host ?? '';
    if (!isAllowedHostname(hostnameOf(hostHeader), lan)) {
      return send(res, 421, 'Unknown host name', 'text/plain; charset=utf-8');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8', {
        Allow: 'GET, HEAD',
      });
    }
    const url = new URL(req.url ?? '/', 'http://host.invalid');
    const p = url.pathname;
    if (p === '/api/health') return sendJson(res, 200, { ok: true });
    if (p === '/api/info') {
      const info = getInfo();
      // The data folder path is shown only to the PC itself, never to LAN devices.
      const local = isLoopbackAddress(req.socket.remoteAddress);
      return sendJson(res, 200, local ? { ...info, dataDir: options.dataDir } : info);
    }
    if (p === '/api/qr.svg') {
      return send(res, 200, qrSvg(getInfo().joinUrl), 'image/svg+xml', {
        'Cache-Control': 'no-store',
      });
    }
    if (p.startsWith('/api/') || p === '/api' || p === '/ws') {
      return sendJson(res, 404, { error: 'not-found' });
    }
    return serveStatic(p, res);
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    const info = getInfo();
    const url = new URL(req.url ?? '/', 'http://host.invalid');
    const reject = (status: string) => {
      socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
      socket.destroy();
    };
    if (url.pathname !== '/ws') return reject('404 Not Found');
    if (!isAllowedHostname(hostnameOf(req.headers.host ?? ''), lan))
      return reject('421 Misdirected Request');
    if (!isAllowedOrigin(req.headers.origin, info.port, lan)) return reject('403 Forbidden');
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws: WebSocket) => {
    const info = getInfo();
    const welcome: HostWelcome = {
      type: 'host/welcome',
      protocolVersion: PROTOCOL_VERSION,
      hostVersion: info.version,
      port: info.port,
    };
    ws.send(JSON.stringify(welcome));
    // M1 has no client messages yet; anything sent is ignored.
  });

  return {
    server,
    wss,
    close: () =>
      new Promise<void>((resolve) => {
        for (const client of wss.clients) client.terminate();
        wss.close();
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}
