/**
 * Where user data lives (D-27, OPS-04): outside the install folder, so updating
 * or re-cloning the game never touches profiles.
 *   Windows  %LOCALAPPDATA%\GuosPuzzleDuel4\
 *   macOS    ~/Library/Application Support/GuosPuzzleDuel4/
 *   Linux    ~/.local/share/guos-puzzle-duel-4/
 */
import path from 'node:path';

export interface DataDirInputs {
  platform: NodeJS.Platform;
  env: Record<string, string | undefined>;
  homedir: string;
}

export function resolveDataDir({ platform, env, homedir }: DataDirInputs): string {
  if (platform === 'win32') {
    const base = env.LOCALAPPDATA || path.win32.join(homedir, 'AppData', 'Local');
    return path.win32.join(base, 'GuosPuzzleDuel4');
  }
  if (platform === 'darwin') {
    return path.posix.join(homedir, 'Library', 'Application Support', 'GuosPuzzleDuel4');
  }
  return path.posix.join(homedir, '.local', 'share', 'guos-puzzle-duel-4');
}
