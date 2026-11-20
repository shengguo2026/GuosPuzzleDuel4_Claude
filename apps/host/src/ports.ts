/**
 * Port selection (D-25; OPS-02, OPS-03, QA-03).
 *
 * The host tries firstPort, then each next port up to lastPort. A port counts as
 * busy when binding fails with EADDRINUSE/EACCES, or when another program
 * already answers on it over loopback (Windows lets two programs bind the same
 * port on different addresses; we never take traffic meant for someone else).
 * We never touch the program that owns a busy port.
 */
import net from 'node:net';
import type { Server } from 'node:http';

export class PortRangeExhaustedError extends Error {
  constructor(
    readonly firstPort: number,
    readonly lastPort: number,
  ) {
    super(
      `No free port between ${firstPort} and ${lastPort}: other programs use all of them. ` +
        `Close one of those programs (or restart the PC), then start the game again.`,
    );
    this.name = 'PortRangeExhaustedError';
  }
}

export interface BindResult {
  port: number;
  /** Ports tried before the bound one because they were busy. */
  skipped: number[];
}

const PROBE_TIMEOUT_MS = 400;

/** True when something accepts a TCP connection on host:port. */
export function isAnswering(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (answering: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(answering);
    };
    socket.setTimeout(PROBE_TIMEOUT_MS, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

async function someoneAnswers(port: number): Promise<boolean> {
  const answers = await Promise.all([isAnswering('127.0.0.1', port), isAnswering('::1', port)]);
  return answers.some(Boolean);
}

function tryListen(server: Server, host: string, port: number): Promise<'ok' | 'busy'> {
  return new Promise((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      server.off('listening', onListening);
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') resolve('busy');
      else reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve('ok');
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen({ host, port, exclusive: true });
  });
}

/**
 * Binds `server` to the first free port in [firstPort, lastPort] on `host`.
 * Throws PortRangeExhaustedError when every port is busy.
 */
export async function listenOnFirstFreePort(
  server: Server,
  options: { host: string; firstPort: number; lastPort: number },
): Promise<BindResult> {
  const { host, firstPort, lastPort } = options;
  if (!Number.isInteger(firstPort) || !Number.isInteger(lastPort) || firstPort > lastPort) {
    throw new RangeError(`Invalid port range ${firstPort}-${lastPort}`);
  }
  const skipped: number[] = [];
  for (let port = firstPort; port <= lastPort; port++) {
    if (await someoneAnswers(port)) {
      skipped.push(port);
      continue;
    }
    if ((await tryListen(server, host, port)) === 'ok') return { port, skipped };
    skipped.push(port);
  }
  throw new PortRangeExhaustedError(firstPort, lastPort);
}
