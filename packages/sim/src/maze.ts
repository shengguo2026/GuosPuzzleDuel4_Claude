/**
 * Maze generator and route checker (WP 2a.2; MZ-01 to MZ-07, M-001 to M-004,
 * G-002, INV-07). VS and Random mazes are point-symmetric (D-11 A): every
 * carve is applied to a tile and its 180° partner, so P1 (North) and P2
 * (South) face identical routes.
 */
import { balance } from '@gpd4/rules';
import { nextInt, chance, shuffle, type RngState } from './rng.js';
import { placeEnvironment } from './environment.js';
import { DX, DY, Tile, type EnvEntity, type Maze, type MazeSize, type Point } from './types.js';
import { routeHazards, routeLegs } from './world.js';

export function mazeDimension(size: MazeSize): number {
  return balance.maze.sizes[size].value;
}

export function coreRadiusFor(size: MazeSize): number {
  return balance.boss.arena.coreRadius[size].value;
}

/** Index of the point-symmetric partner tile (MZ-03). */
export function mirrorIndex(w: number, h: number, i: number): number {
  return w * h - 1 - i;
}

export function chebyshev(x: number, y: number, cx: number, cy: number): number {
  return Math.max(Math.abs(x - cx), Math.abs(y - cy));
}

/** Breadth-first distances from `sources` over tiles where `passable(i)`; -1 = unreachable. */
export function bfs(
  w: number,
  h: number,
  passable: (i: number) => boolean,
  sources: readonly number[],
): Int32Array {
  const dist = new Int32Array(w * h).fill(-1);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  for (const s of sources) {
    if (dist[s] === -1 && passable(s)) {
      dist[s] = 0;
      queue[tail++] = s;
    }
  }
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % w;
    const y = (i - x) / w;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d]!;
      const ny = y + DY[d]!;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (dist[n] !== -1 || !passable(n)) continue;
      dist[n] = dist[i]! + 1;
      queue[tail++] = n;
    }
  }
  return dist;
}

/** Tiles of the open ring around the core (MZ-05). */
export function ringTiles(maze: Pick<Maze, 'w' | 'cx' | 'cy' | 'coreRadius' | 'ringRadius'>) {
  const out: number[] = [];
  const { w, cx, cy, coreRadius, ringRadius } = maze;
  for (let y = cy - ringRadius; y <= cy + ringRadius; y++)
    for (let x = cx - ringRadius; x <= cx + ringRadius; x++)
      if (chebyshev(x, y, cx, cy) > coreRadius) out.push(y * w + x);
  return out;
}

export interface RouteReport {
  ok: boolean;
  problems: string[];
}

/**
 * MZ-07 route guarantee: with all shortcuts sealed and destructible walls
 * intact, gates passable when open, and traps, pads and conveyors avoided,
 * each player reaches the arena ring from their spawn, the token tiles from
 * the ring (core cleared), and their exit from their token.
 */
export function checkRoutes(
  maze: Maze,
  tiles: Uint8Array = maze.tiles,
  env: readonly EnvEntity[] = maze.env ?? [],
): RouteReport {
  const { w } = maze;
  const problems: string[] = [];
  const spawns: [number, number] = [
    maze.entrances[0].y * w + maze.entrances[0].x,
    maze.entrances[1].y * w + maze.entrances[1].x,
  ];
  const legs = routeLegs(maze, tiles, routeHazards(env, w), spawns);
  const names = ['spawn → arena ring', 'arena ring → token', 'token → exit'];
  legs.forEach((ok, k) => {
    if (!ok) problems.push(`P${Math.floor(k / 3) + 1}: ${names[k % 3]}`);
  });
  for (const s of maze.shortcuts) if (tiles[s] !== Tile.SHORTCUT) problems.push('shortcut tile');
  return { ok: problems.length === 0, problems };
}

/** True when every tile equals its point-symmetric partner (MZ-03). */
export function isPointSymmetric(maze: Pick<Maze, 'w' | 'h' | 'tiles'>): boolean {
  const n = maze.w * maze.h;
  for (let i = 0; i < n; i++) if (maze.tiles[i] !== maze.tiles[n - 1 - i]) return false;
  return true;
}

function attempt(rng: RngState, size: MazeSize): Maze | null {
  const w = mazeDimension(size);
  const h = w;
  const n = w * h;
  const tiles = new Uint8Array(n).fill(Tile.WALL);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const coreRadius = coreRadiusFor(size);
  const ringRadius = coreRadius + 1;
  const mirror = (i: number) => n - 1 - i;
  const carve = (i: number) => {
    tiles[i] = Tile.FLOOR;
    tiles[mirror(i)] = Tile.FLOOR;
  };
  const isCell = (x: number, y: number) =>
    x % 2 === 1 && y % 2 === 1 && x > 0 && y > 0 && x < w - 1 && y < h - 1;

  // 1. Symmetric depth-first carve over the odd-coordinate cells.
  const visited = new Uint8Array(n);
  const sx = cx % 2 === 1 ? cx : cx - 1;
  const start = 1 * w + sx;
  visited[start] = 1;
  visited[mirror(start)] = 1;
  carve(start);
  const stack = [start];
  while (stack.length > 0) {
    const cur = stack[stack.length - 1]!;
    const x = cur % w;
    const y = (cur - x) / w;
    const options: number[] = [];
    for (let d = 0; d < 4; d++) {
      const nx = x + 2 * DX[d]!;
      const ny = y + 2 * DY[d]!;
      if (isCell(nx, ny) && !visited[ny * w + nx]) options.push(d);
    }
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const d = options[nextInt(rng, options.length)]!;
    const nx = x + 2 * DX[d]!;
    const ny = y + 2 * DY[d]!;
    const next = ny * w + nx;
    visited[next] = 1;
    visited[mirror(next)] = 1;
    carve((y + DY[d]!) * w + (x + DX[d]!));
    carve(next);
    stack.push(next);
  }

  // 2. Loops: open some remaining walls between two cells (in symmetric pairs).
  const loopPercent = balance.maze.generator.loopPercent.value;
  const edgeWalls: number[] = [];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const horiz = x % 2 === 0 && y % 2 === 1;
      const vert = x % 2 === 1 && y % 2 === 0;
      if (horiz || vert) edgeWalls.push(y * w + x);
    }
  for (const i of edgeWalls)
    if (i < mirror(i) && tiles[i] === Tile.WALL && chance(rng, loopPercent)) carve(i);

  // 3. Boss arena: open ring, impassable core (MZ-05).
  for (let y = cy - ringRadius; y <= cy + ringRadius; y++)
    for (let x = cx - ringRadius; x <= cx + ringRadius; x++)
      tiles[y * w + x] = chebyshev(x, y, cx, cy) <= coreRadius ? Tile.CORE : Tile.FLOOR;

  // 4. Entrances on the North and South edge (MZ-04).
  const north: Point = { x: cx, y: 0 };
  const south: Point = { x: w - 1 - cx, y: h - 1 };
  tiles[north.y * w + north.x] = Tile.ENTRANCE;
  tiles[south.y * w + south.x] = Tile.ENTRANCE;
  carve(1 * w + cx);

  // 5. Destructible walls among the remaining walls between two cells (WL-02).
  const destructiblePercent = balance.maze.generator.destructiblePercent.value;
  for (const i of edgeWalls)
    if (i <= mirror(i) && tiles[i] === Tile.WALL && chance(rng, destructiblePercent)) {
      tiles[i] = Tile.DESTRUCTIBLE;
      tiles[mirror(i)] = Tile.DESTRUCTIBLE;
    }

  // 6. Sealed shortcuts on routes from the arena toward the exits (MZ-06):
  //    walls whose opening shortens the ring → South exit route the most,
  //    mirrored for the North exit.
  const pairs = balance.maze.shortcutPairs[size].value;
  const open = (i: number) => tiles[i] === Tile.FLOOR || tiles[i] === Tile.ENTRANCE;
  const southIdx = south.y * w + south.x;
  const fromExit = bfs(w, h, open, [southIdx]);
  const ring = ringTiles({ w, cx, cy, coreRadius, ringRadius });
  const fromRing = bfs(w, h, open, ring);
  const current = fromRing[southIdx]!;
  if (current < 0) return null;
  const candidates: { i: number; gain: number }[] = [];
  for (const i of edgeWalls) {
    const x = i % w;
    const y = (i - x) / w;
    if (tiles[i] !== Tile.WALL || y <= cy + ringRadius) continue;
    const horiz = x % 2 === 0;
    const a = horiz ? i - 1 : i - w;
    const b = horiz ? i + 1 : i + w;
    if (!open(a) || !open(b)) continue;
    const via = Math.min(
      fromRing[a]! >= 0 && fromExit[b]! >= 0 ? fromRing[a]! + 2 + fromExit[b]! : 1e9,
      fromRing[b]! >= 0 && fromExit[a]! >= 0 ? fromRing[b]! + 2 + fromExit[a]! : 1e9,
    );
    const gain = current - via;
    if (gain >= 4) candidates.push({ i, gain });
  }
  candidates.sort((p, q) => q.gain - p.gain || p.i - q.i);
  const chosen: number[] = [];
  // A random choice among the best few, then the rest in order of gain.
  const best = shuffle(rng, candidates.slice(0, pairs * 3));
  for (const c of best.concat(candidates)) {
    if (chosen.length >= pairs) break;
    if (chosen.includes(c.i)) continue;
    const cx2 = c.i % w;
    const cy2 = (c.i - cx2) / w;
    const far = chosen.every((o) => {
      const ox = o % w;
      return Math.abs(ox - cx2) + Math.abs((o - ox) / w - cy2) >= 4;
    });
    if (far) chosen.push(c.i);
  }
  if (chosen.length < pairs) return null;
  const shortcuts: number[] = [];
  for (const i of chosen) {
    tiles[i] = Tile.SHORTCUT;
    tiles[mirror(i)] = Tile.SHORTCUT;
    shortcuts.push(i, mirror(i));
  }
  shortcuts.sort((p, q) => p - q);

  return {
    size,
    seed: 0,
    w,
    h,
    tiles,
    cx,
    cy,
    coreRadius,
    ringRadius,
    entrances: [north, south],
    tokenTiles: [
      { x: cx - 1, y: cy },
      { x: cx + 1, y: cy },
    ],
    shortcuts,
    attempts: 0,
    env: [],
  };
}

/**
 * Generates a validated point-symmetric maze. The same seed and size always
 * give the same maze (M-002). A maze that fails the route check is re-rolled
 * from the same PRNG stream (MZ-07).
 */
export function generateMaze(
  seed: number,
  size: MazeSize,
  opts: { environment?: boolean } = {},
): Maze {
  const rng: RngState = { rng: seed | 0 };
  const max = balance.maze.generator.maxAttempts.value;
  let bare: Maze | null = null;
  for (let a = 1; a <= max; a++) {
    const maze = attempt(rng, size);
    if (!maze) continue;
    maze.seed = seed | 0;
    maze.attempts = a;
    if (!checkRoutes(maze).ok || !isPointSymmetric(maze)) continue;
    bare ??= maze;
    // WP 2b.9: the environment layer on top of the validated layout.
    if (opts.environment !== false) {
      const layer = placeEnvironment(maze, seed + a);
      if (!layer) continue; // re-roll the layout too
      maze.tiles = layer.tiles;
      maze.env = layer.env;
    }
    return maze;
  }
  if (bare) return bare; // no environment layer fitted: the validated bare maze
  throw new Error(`No valid ${size} maze for seed ${seed} after ${max} attempts`);
}
