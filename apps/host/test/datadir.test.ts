import { describe, expect, it } from 'vitest';
import { resolveDataDir } from '../src/datadir.js';

describe('user-data folder (D-27)', () => {
  it('OPS-04: Windows uses %LOCALAPPDATA%\\GuosPuzzleDuel4', () => {
    expect(
      resolveDataDir({
        platform: 'win32',
        env: { LOCALAPPDATA: 'C:\\Users\\guo\\AppData\\Local' },
        homedir: 'C:\\Users\\guo',
      }),
    ).toBe('C:\\Users\\guo\\AppData\\Local\\GuosPuzzleDuel4');
    expect(resolveDataDir({ platform: 'win32', env: {}, homedir: 'C:\\Users\\guo' })).toBe(
      'C:\\Users\\guo\\AppData\\Local\\GuosPuzzleDuel4',
    );
  });

  it('OPS-04: macOS and Linux use their standard per-user folders', () => {
    expect(resolveDataDir({ platform: 'darwin', env: {}, homedir: '/Users/guo' })).toBe(
      '/Users/guo/Library/Application Support/GuosPuzzleDuel4',
    );
    expect(resolveDataDir({ platform: 'linux', env: {}, homedir: '/home/guo' })).toBe(
      '/home/guo/.local/share/guos-puzzle-duel-4',
    );
  });
});
