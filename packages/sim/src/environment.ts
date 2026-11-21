/**
 * Environment layer of generated mazes (WP 2b.9; MZ-03, MZ-07, M-003, M-004,
 * INV-07, PU-06). Every element is placed on a tile and its 180° partner
 * (conveyor arrows rotate with it), so P1 and P2 face the same elements. The
 * result must keep every objective route open with traps, pads, conveyors
 * treated as impassable and gates as passable when open; otherwise the layer
 * is re-rolled.
 */
import { balance } from '@gpd4/rules';
import { chebyshev } from './maze.js';
import { nextInt, shuffle, type RngState } from './rng.js';
import {
  DX,
  DY,
  Tile,
  opposite,
  type Dir,
  type EnvEntity,
  type EnvKind,
  type Maze,
} from './types.js';
import { inArena, makeEnv, routeHazards, routeLegs } from './world.js';

const G = balance.maze.generator;

interface Layer {
  tiles: Uint8Array;
  env: EnvEntity[];
}

/** Places the environment for `maze` (whose layout is already validated); null if no valid layer was found. */
export function placeEnvironment(maze: Maze, seed: number): Layer | null {
  const rng: RngState = { rng: (seed ^ 0x2c1b3c6d) | 0 };
  for (let a = 0; a < G.envAttempts.value; a++) {
    const layer = attempt(maze, rng);
    if (layer && environmentRoutesOk(maze, layer.tiles, layer.env)) return layer;
  }
  return null;
}

/** MZ-07 with the environment: every leg for both players from their spawn. */
export function environmentRoutesOk(
  maze: Maze,
  tiles: Uint8Array,
  env: readonly EnvEntity[],
): boolean {
  const { w } = maze;
  const spawns: [number, number] = [
    maze.entrances[0].y * w + maze.entrances[0].x,
    maze.entrances[1].y * w + maze.entrances[1].x,
  ];
  return routeLegs(maze, tiles, routeHazards(env, w), spawns).every(Boolean);
}

function attempt(maze: Maze, rng: RngState): Layer | null {
  const { w, h, size } = maze;
  const n = w * h;
  const tiles = new Uint8Array(maze.tiles);
  const env: EnvEntity[] = [];
  const used = new Set<number>();
  const counts = G.environment[size];
  const clearance = G.entranceClearance.value;
  const mirror = (i: number) => n - 1 - i;
  const xy = (i: number): [number, number] => [i % w, Math.floor(i / w)];
  const walkable = (i: number) =>
    tiles[i] === Tile.FLOOR || tiles[i] === Tile.ENTRANCE || tiles[i] === Tile.GATE;
  const neighbours = (i: number): number[] => {
    const [x, y] = xy(i);
    const out: number[] = [];
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d]!;
      const ny = y + DY[d]!;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && walkable(ny * w + nx)) out.push(ny * w + nx);
    }
    return out;
  };
  const free = (i: number): boolean => {
    if (i === mirror(i) || used.has(i) || tiles[i] !== Tile.FLOOR) return false;
    const [x, y] = xy(i);
    if (inArena(maze, x, y)) return false;
    for (const e of maze.entrances)
      if (Math.abs(e.x - x) + Math.abs(e.y - y) <= clearance) return false;
    return true;
  };
  /** Free tiles of the "first" half, each standing for itself and its partner. */
  const halfCandidates = (ok: (i: number) => boolean = () => true) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++)
      if (i < mirror(i) && free(i) && free(mirror(i)) && ok(i)) out.push(i);
    return shuffle(rng, out);
  };
  const add = (kind: EnvKind, i: number, over: Partial<EnvEntity> = {}) => {
    const [x, y] = xy(i);
    const e = makeEnv(env.length + 1, kind, x, y, over);
    env.push(e);
    used.add(i);
    return e;
  };
  const straight = (i: number) => {
    const nb = neighbours(i);
    return nb.length === 2 && nb[0]! + nb[1]! === 2 * i;
  };

  // Timed gates on straight corridors (GA-01; pairs share their cycle, GA-04).
  const gateCfg = balance.gates.default;
  for (const i of halfCandidates(straight).slice(0, counts.gates.value)) {
    for (const t of [i, mirror(i)]) {
      tiles[t] = Tile.GATE;
      add('gate', t, {
        open: true,
        openTicks: gateCfg.openTicks.value,
        closedTicks: gateCfg.closedTicks.value,
      });
    }
  }

  // Teleporter pairs A ↔ B with B the partner of A (TP-01), preferably in dead ends.
  const dead = halfCandidates((i) => neighbours(i).length === 1);
  const pads = dead.concat(halfCandidates((i) => neighbours(i).length !== 1));
  for (const i of pads.slice(0, counts.padPairs.value)) {
    const a = add('pad', i);
    const b = add('pad', mirror(i));
    a.link = b.id;
    b.link = a.id;
  }

  // Ice and conveyor strips: straight runs of free tiles (TE-02, TE-04).
  const [minLen, maxLen] = G.stripLength.value as [number, number];
  const strip = (kind: 'ice' | 'conveyor') => {
    for (const start of halfCandidates()) {
      const len = minLen + nextInt(rng, maxLen - minLen + 1);
      const dir = nextInt(rng, 4) as Dir;
      const run: number[] = [];
      let [x, y] = xy(start);
      for (let k = 0; k < len; k++) {
        if (x < 0 || y < 0 || x >= w || y >= h) break;
        run.push(y * w + x);
        x += DX[dir]!;
        y += DY[dir]!;
      }
      if (run.length < len) continue;
      const mirrored = run.map(mirror);
      const all = run.concat(mirrored);
      if (new Set(all).size !== all.length || !all.every(free)) continue;
      const arrow: Dir = nextInt(rng, 2) === 0 ? dir : opposite(dir);
      for (const i of run) add(kind, i, kind === 'conveyor' ? { dir: arrow } : {});
      for (const i of mirrored) add(kind, i, kind === 'conveyor' ? { dir: opposite(arrow) } : {});
      return true;
    }
    return false;
  };
  for (let k = 0; k < counts.iceStrips.value; k++) if (!strip('ice')) return null;
  for (let k = 0; k < counts.conveyorStrips.value; k++) if (!strip('conveyor')) return null;

  // Single-tile elements in pairs: boosts, traps, pickups (PU-06).
  const pairs = (kind: EnvKind, count: number, prefer?: (i: number) => boolean) => {
    const list = prefer ? halfCandidates(prefer).concat(halfCandidates()) : halfCandidates();
    let placed = 0;
    for (const i of list) {
      if (placed >= count) break;
      if (used.has(i) || used.has(mirror(i))) continue;
      add(kind, i);
      add(kind, mirror(i));
      placed++;
    }
    return placed === count;
  };
  const pickups = balance.pickups.perSize[size];
  const ok =
    pairs('boost', counts.boosts.value, straight) &&
    pairs('spike', counts.spikes.value) &&
    pairs('shock', counts.shocks.value) &&
    pairs('snare', counts.snares.value) &&
    pairs('attackOrb', Math.floor(pickups.attackOrbs.value / 2)) &&
    pairs('defenseOrb', Math.floor(pickups.defenseOrbs.value / 2)) &&
    pairs('heart', Math.floor(pickups.hearts.value / 2));
  if (!ok) return null;

  // Fog regions (VI-02): floor around a centre, mirrored; fog overlaps other elements.
  const fogR = G.fogRadius.value;
  const fogged = new Set<number>();
  for (const c of halfCandidates().slice(0, counts.fogRegions.value)) {
    const [cx, cy] = xy(c);
    for (let y = cy - fogR; y <= cy + fogR; y++)
      for (let x = cx - fogR; x <= cx + fogR; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h || chebyshev(x, y, cx, cy) > fogR) continue;
        const i = y * w + x;
        if (!walkable(i) || inArena(maze, x, y)) continue;
        fogged.add(i);
        fogged.add(mirror(i));
      }
  }
  for (const i of [...fogged].sort((a, b) => a - b)) {
    const [x, y] = xy(i);
    env.push(makeEnv(env.length + 1, 'fog', x, y));
  }
  return { tiles, env };
}
