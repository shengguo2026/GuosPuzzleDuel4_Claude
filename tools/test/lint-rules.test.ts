import { ESLint } from 'eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const eslint = new ESLint({ cwd: root });

async function lintSim(code: string, file = 'packages/sim/src/__lint_fixture.ts') {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, file) });
  return result!.messages.map((m) => m.ruleId);
}

describe('dependency rules (WP 1.1)', () => {
  it.each([
    ["import fs from 'node:fs';\nexport const x = fs;", 'no-restricted-imports'],
    [
      "import { DatabaseSync } from 'node:sqlite';\nexport const x = DatabaseSync;",
      'no-restricted-imports',
    ],
    ["import { WebSocket } from 'ws';\nexport const x = WebSocket;", 'no-restricted-imports'],
    ["import React from 'react';\nexport const x = React;", 'no-restricted-imports'],
    [
      "import { startHost } from '@gpd4/host';\nexport const x = startHost;",
      'no-restricted-imports',
    ],
    ['export const x = document.title;', 'no-restricted-globals'],
    ["export const x = fetch('http://example.com');", 'no-restricted-globals'],
    ['export const x = Date.now();', 'no-restricted-globals'],
    ['export const x = Math.random();', 'no-restricted-properties'],
  ])('QA-01: sim may not use %s', async (code, rule) => {
    expect(await lintSim(code)).toContain(rule);
  });

  it('QA-01: the AI package follows the same rule', async () => {
    expect(
      await lintSim('export const x = window;', 'packages/ai/src/__lint_fixture.ts'),
    ).toContain('no-restricted-globals');
  });

  it('QA-01: pure code that imports rules passes', async () => {
    expect(
      await lintSim("import { balance } from '@gpd4/rules';\nexport const x = balance.sim;"),
    ).toEqual([]);
  });

  it('QA-01: the host is allowed Node APIs', async () => {
    const [result] = await eslint.lintText("import fs from 'node:fs';\nexport const x = fs;", {
      filePath: path.join(root, 'apps/host/src/__lint_fixture.ts'),
    });
    expect(result!.messages).toEqual([]);
  });
});
