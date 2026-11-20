import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('repository conventions', () => {
  it('UI-02: the client uses the unified Guo favicon from the repository root', () => {
    expect(read('apps/client/public/favicon.svg')).toBe(read('favicon.svg'));
  });

  it('OPS-01: start scripts check Node 24 and pnpm and leave port choice to the host', () => {
    for (const script of ['start.bat', 'start.sh']) {
      const text = read(script);
      expect(text, script).toContain('24');
      expect(text, script).toContain('pnpm');
      expect(text, script).toContain(
        'apps/host/dist/host.mjs'.replace(/\//g, script.endsWith('.bat') ? '\\' : '/'),
      );
      expect(text, script).not.toMatch(/netstat|lsof|Get-NetTCPConnection|30\d\d/);
    }
    expect(read('start.command')).toContain('start.sh');
  });

  it('QA-01: CI pins Node 24 and runs on Windows and Ubuntu', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toContain('node-version: 24');
    expect(ci).toContain('windows-latest');
    expect(ci).toContain('ubuntu-latest');
  });
});
