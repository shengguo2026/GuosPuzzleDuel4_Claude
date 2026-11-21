import { describe, expect, it } from 'vitest';
import {
  Tile,
  checkRoutes,
  generateMaze,
  isPointSymmetric,
  mazeDimension,
  ringTiles,
  type MazeSize,
} from '../src/index.js';

const SIZES: MazeSize[] = ['small', 'medium', 'large'];
const VALID = new Set<number>(Object.values(Tile));

describe('maze generator (WP 2a.2)', () => {
  it.each(SIZES)('M-001: %s maze has the GDD size and one base class per tile', (size) => {
    const maze = generateMaze(12345, size);
    const n = mazeDimension(size);
    expect([maze.w, maze.h]).toEqual([n, n]);
    expect(n).toBe({ small: 15, medium: 21, large: 31 }[size]);
    expect(maze.tiles.length).toBe(n * n);
    for (const t of maze.tiles) expect(VALID.has(t)).toBe(true);
    // Border is solid except the two entrances.
    for (let i = 0; i < n; i++) {
      for (const [x, y] of [
        [i, 0],
        [i, n - 1],
        [0, i],
        [n - 1, i],
      ] as const) {
        const t = maze.tiles[y * n + x];
        if (x === maze.cx && (y === 0 || y === n - 1)) expect(t).toBe(Tile.ENTRANCE);
        else expect(t).toBe(Tile.WALL);
      }
    }
  });

  it('M-002: the same seed and size reproduce the same maze; another seed differs', () => {
    for (const size of SIZES) {
      const a = generateMaze(777, size);
      const b = generateMaze(777, size);
      expect(Buffer.from(a.tiles).equals(Buffer.from(b.tiles))).toBe(true);
      expect(a.shortcuts).toEqual(b.shortcuts);
      const c = generateMaze(778, size);
      expect(Buffer.from(a.tiles).equals(Buffer.from(c.tiles))).toBe(false);
    }
  });

  it('INV-07 / MZ-07 / MZ-03: thousands of seeds give symmetric mazes that pass the route check', () => {
    let count = 0;
    for (const size of SIZES) {
      const seeds = size === 'large' ? 400 : 1000;
      for (let seed = 1; seed <= seeds; seed++) {
        const maze = generateMaze(seed * 7919, size);
        expect(isPointSymmetric(maze)).toBe(true);
        const report = checkRoutes(maze);
        expect(report.problems).toEqual([]);
        count++;
      }
    }
    expect(count).toBe(2400);
  });

  it('MZ-05: arena core and open ring have the size of D-11', () => {
    for (const size of SIZES) {
      const maze = generateMaze(5, size);
      const core = size === 'large' ? 2 : 1;
      expect(maze.coreRadius).toBe(core);
      let cores = 0;
      for (const t of maze.tiles) if (t === Tile.CORE) cores++;
      expect(cores).toBe((2 * core + 1) ** 2);
      for (const i of ringTiles(maze)) expect(maze.tiles[i]).toBe(Tile.FLOOR);
    }
  });

  it('MZ-06 / D-34: shortcut pairs per size are sealed and point-symmetric', () => {
    for (const size of SIZES) {
      const maze = generateMaze(99, size);
      const pairs = { small: 1, medium: 2, large: 2 }[size];
      expect(maze.shortcuts.length).toBe(pairs * 2);
      const n = maze.w * maze.h;
      for (const s of maze.shortcuts) {
        expect(maze.tiles[s]).toBe(Tile.SHORTCUT);
        expect(maze.shortcuts).toContain(n - 1 - s);
      }
    }
  });

  it('G-002 / MZ-04: P1 spawns North, P2 South, tokens are point-symmetric partners', () => {
    const maze = generateMaze(3, 'medium');
    const [north, south] = maze.entrances;
    expect(north.y).toBe(0);
    expect(south.y).toBe(maze.h - 1);
    expect(south.x).toBe(maze.w - 1 - north.x);
    const [t1, t2] = maze.tokenTiles;
    expect(t2).toEqual({ x: maze.w - 1 - t1.x, y: maze.h - 1 - t1.y });
  });

  it('M-003: a maze whose routes are cut is rejected by the route checker', () => {
    for (const size of SIZES) {
      const maze = generateMaze(42, size);
      const broken = new Uint8Array(maze.tiles);
      // Seal the corridor right below the North entrance.
      broken[1 * maze.w + maze.cx] = Tile.WALL;
      const report = checkRoutes(maze, broken);
      expect(report.ok).toBe(false);
      expect(report.problems.join()).toContain('P1: spawn');
      // Sealing the whole ring cuts every route to the tokens.
      const sealed = new Uint8Array(maze.tiles);
      for (const i of ringTiles(maze)) sealed[i] = Tile.WALL;
      expect(checkRoutes(maze, sealed).ok).toBe(false);
    }
  });
});
