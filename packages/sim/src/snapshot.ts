/**
 * Snapshots (WP 2b.1, §17 "Reconnect → environment state", MZ-08): a match
 * state as plain JSON data and back. A restored match continues exactly like
 * the original (same hash on every following tick): tiles, gates, trap
 * timers, buffs, fog and revision are restored; consumed pickups stay
 * consumed and past events are not replayed.
 */
import type { MatchState, Maze } from './types.js';

export type MazeSnapshot = Omit<Maze, 'tiles'> & { tiles: number[] };
export type MatchSnapshot = Omit<MatchState, 'tiles' | 'maze' | 'events'> & {
  tiles: number[];
  maze: MazeSnapshot;
};

export function snapshotMatch(s: MatchState): MatchSnapshot {
  const plain = {
    ...s,
    events: undefined,
    tiles: Array.from(s.tiles),
    maze: { ...s.maze, tiles: Array.from(s.maze.tiles) },
  };
  return JSON.parse(JSON.stringify(plain)) as MatchSnapshot;
}

export function restoreMatch(snap: MatchSnapshot): MatchState {
  const data = JSON.parse(JSON.stringify(snap)) as MatchSnapshot;
  return {
    ...data,
    tiles: Uint8Array.from(data.tiles),
    maze: { ...data.maze, tiles: Uint8Array.from(data.maze.tiles) },
    events: [],
  };
}
