import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isWindows = process.platform === 'win32';

/** Runs the platform's start script with host options; resolves with its output. */
function runStartScript(args: string[]): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = isWindows
      ? spawn('cmd.exe', ['/d', '/c', 'start.bat', ...args], { cwd: root, windowsHide: true })
      : spawn('bash', ['start.sh', ...args], { cwd: root });
    let output = '';
    child.stdout.on('data', (d) => (output += String(d)));
    child.stderr.on('data', (d) => (output += String(d)));
    child.stdin.end(); // a "pause" on error must not wait
    child.on('close', (code) => resolve({ code, output }));
  });
}

let occupier: net.Server | null = null;
const dataDirs: string[] = [];
const tempData = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gpd4-smoke-'));
  dataDirs.push(d);
  return d;
};

beforeAll(async () => {
  // Another program on the first port of the range.
  occupier = net.createServer((s) => {
    s.on('error', () => undefined);
    s.end('other');
  });
  await new Promise<void>((resolve) => {
    occupier!.once('error', () => {
      occupier = null; // already busy on this machine: fine, still a busy port
      resolve();
    });
    occupier!.listen({ port: 3000, host: '127.0.0.1', exclusive: true }, () => resolve());
  });
});

afterAll(async () => {
  if (occupier) await new Promise<void>((r) => occupier!.close(() => r()));
  for (const d of dataDirs) fs.rmSync(d, { recursive: true, force: true });
});

describe(`start script (${isWindows ? 'start.bat' : 'start.sh'})`, () => {
  it('QA-03: port 3000 busy -> the script starts the game on the next free port and says so', async () => {
    const { code, output } = await runStartScript([
      '--smoke',
      '--no-open',
      '--data-dir',
      tempData(),
    ]);
    expect(output).toMatch(/SMOKE OK port=30(0[1-9]|1\d)/);
    expect(output).toMatch(/Port 3000.* busy, so the game uses port 30\d\d\./);
    expect(code).toBe(0);
  });

  it('QA-03: a second host on the same data folder is refused with a clear message', async () => {
    const dataDir = tempData();
    // First host: run the built host directly and keep it running.
    const first = spawn(
      process.execPath,
      [
        '--disable-warning=ExperimentalWarning',
        'apps/host/dist/host.mjs',
        '--no-open',
        '--data-dir',
        dataDir,
      ],
      { cwd: root },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        let out = '';
        first.stdout.on('data', (d) => {
          out += String(d);
          if (out.includes('Game running on port')) resolve();
        });
        first.once('exit', () => reject(new Error(`first host exited: ${out}`)));
      });
      const { code, output } = await runStartScript([
        '--smoke',
        '--no-open',
        '--data-dir',
        dataDir,
      ]);
      expect(output).toContain("Guo's Puzzle Duel IV is already running at http://127.0.0.1:");
      expect(code).not.toBe(0);
    } finally {
      first.kill();
    }
  });
});
