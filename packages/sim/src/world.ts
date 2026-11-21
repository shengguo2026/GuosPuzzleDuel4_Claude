/**
 * Queries on a match's tiles and entities (MZ-02, MV-08, BM-03, BS-10), shared
 * by the tick pipeline, the boss patterns, the AI and the renderer. Nothing
 * here changes the state except `emit`, `addEnv` and `removeEnv`.
 */
import { balance } from '@gpd4/rules';
import { bfs, chebyshev, ringTiles } from './maze.js';
import {
  DX,
  DY,
  TRAP_KINDS,
  Tile,
  type Dir,
  type EnvEntity,
  type EnvKind,
  type EventBody,
  type GameEvent,
  type MatchState,
  type Maze,
} from './types.js';

export function tileIndex(s: Pick<MatchState, 'maze'>, x: number, y: number): number {
  return y * s.maze.w + x;
}

export function inBounds(s: Pick<MatchState, 'maze'>, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < s.maze.w && y < s.maze.h;
}

export function emit(s: MatchState, body: EventBody): void {
  s.events.push({ ...body, id: s.nextEventId++, tick: s.tick } as GameEvent);
}

export function shieldAt(s: MatchState, x: number, y: number) {
  return s.shields.find((sh) => sh.x === x && sh.y === y);
}

/** First environment entity of one of `kinds` on (x, y). */
export function envAt(
  s: Pick<MatchState, 'env'>,
  x: number,
  y: number,
  ...kinds: EnvKind[]
): EnvEntity | undefined {
  return s.env.find((e) => e.x === x && e.y === y && kinds.includes(e.kind));
}

export function trapAt(s: Pick<MatchState, 'env'>, x: number, y: number): EnvEntity | undefined {
  return envAt(s, x, y, ...TRAP_KINDS);
}

export function isIce(s: Pick<MatchState, 'env'>, x: number, y: number): boolean {
  return !!envAt(s, x, y, 'ice');
}

/** A new entity with default fields (IDs come from `s.nextId`). */
export function makeEnv(
  id: number,
  kind: EnvKind,
  x: number,
  y: number,
  over: Partial<EnvEntity> = {},
): EnvEntity {
  return {
    id,
    kind,
    x,
    y,
    boss: false,
    life: -1,
    warn: 0,
    cycle: 0,
    open: false,
    pending: false,
    dir: -1,
    link: -1,
    openTicks: 0,
    closedTicks: 0,
    ...over,
  };
}

export function addEnv(
  s: MatchState,
  kind: EnvKind,
  x: number,
  y: number,
  over: Partial<EnvEntity> = {},
): EnvEntity {
  const e = makeEnv(s.nextId++, kind, x, y, over);
  s.env.push(e);
  return e;
}

export function removeEnv(s: MatchState, e: EnvEntity): void {
  const i = s.env.indexOf(e);
  if (i >= 0) s.env.splice(i, 1);
}

/** A trap is active (can trigger) when it is not in its boss warning (TR-08). */
export function trapActive(e: EnvEntity): boolean {
  return e.warn === 0;
}

/** TR-04: a shock trap hurts during the last `shockDangerTicks` of its cycle. */
export function shockDangerous(e: EnvEntity): boolean {
  return e.kind === 'shock' && e.warn === 0 && e.cycle >= balance.traps.shockSafeTicks.value;
}

/** TR-04: warning glow in the last 15 ticks of the safe window. */
export function shockWarning(e: EnvEntity): boolean {
  const safe = balance.traps.shockSafeTicks.value;
  return (
    e.kind === 'shock' &&
    e.warn === 0 &&
    e.cycle < safe &&
    e.cycle >= safe - balance.traps.shockWarningTicks.value
  );
}

/** GA-01: closing warning in the last 30 ticks of the open window (or while pending). */
export function gateWarning(e: EnvEntity): boolean {
  return (
    e.kind === 'gate' &&
    e.open &&
    (e.pending || e.cycle >= e.openTicks - balance.gates.default.warningTicks.value)
  );
}

function gateClosedAt(s: MatchState, x: number, y: number): boolean {
  const g = envAt(s, x, y, 'gate');
  return !!g && !g.open;
}

/** Base class lets a player stand there (MV-08, without shields and boss walls). */
export function floorLike(s: MatchState, x: number, y: number): boolean {
  if (!inBounds(s, x, y)) return false;
  const t = s.tiles[tileIndex(s, x, y)];
  if (t === Tile.FLOOR || t === Tile.ENTRANCE) return true;
  if (t === Tile.GATE) return !gateClosedAt(s, x, y);
  return false;
}

/** MV-08 passable for a player step. */
export function passable(s: MatchState, x: number, y: number): boolean {
  return floorLike(s, x, y) && !shieldAt(s, x, y) && !envAt(s, x, y, 'bossWall');
}

/** BM-03 / BS-10 blocker for bombs, balls and the shockwave. */
export function isBlocker(s: MatchState, x: number, y: number): boolean {
  if (!inBounds(s, x, y)) return true;
  const t = s.tiles[tileIndex(s, x, y)];
  if (t === Tile.WALL || t === Tile.DESTRUCTIBLE || t === Tile.SHORTCUT || t === Tile.CORE)
    return true;
  if (t === Tile.GATE && gateClosedAt(s, x, y)) return true;
  return !!shieldAt(s, x, y) || !!envAt(s, x, y, 'bossWall');
}

/** MV-08 occupied: some player's logical tile or reserved destination. */
export function occupied(s: MatchState, x: number, y: number): boolean {
  return s.players.some((p) => {
    if (p.x === x && p.y === y) return true;
    if (p.step) return p.x + DX[p.step.dir]! === x && p.y + DY[p.step.dir]! === y;
    return false;
  });
}

export function neighbour(x: number, y: number, d: Dir): [number, number] {
  return [x + DX[d]!, y + DY[d]!];
}

// ------------------------------------------------------------ route checks

/**
 * Passability used by the route guarantee (MZ-07, BS-13): base floor, entrance
 * and timed gates (passable when open) count; sealed shortcuts and the core
 * (before the flip) do not; traps, pads, conveyors and boss walls are treated
 * as impassable, so a route never depends on crossing them.
 */
export function routeTile(
  maze: Pick<Maze, 'w'>,
  tiles: Uint8Array,
  hazards: ReadonlySet<number>,
  i: number,
  coreOpen: boolean,
): boolean {
  if (hazards.has(i)) return false;
  const t = tiles[i];
  return (
    t === Tile.FLOOR || t === Tile.ENTRANCE || t === Tile.GATE || (coreOpen && t === Tile.CORE)
  );
}

/** Tiles that the route guarantee must not cross: traps, pads, conveyors, boss walls. */
export function routeHazards(env: readonly EnvEntity[], w: number): Set<number> {
  const out = new Set<number>();
  for (const e of env)
    if (
      TRAP_KINDS.includes(e.kind) ||
      e.kind === 'pad' ||
      e.kind === 'conveyor' ||
      e.kind === 'bossWall'
    )
      out.add(e.y * w + e.x);
  return out;
}

/**
 * Which objective legs each player can complete (MZ-07): [from → arena ring,
 * ring → own token tile, token tile → own exit], for each slot. `from` is the
 * player's spawn (generator) or current tile (BS-13), which itself always counts
 * as passable.
 */
export function routeLegs(
  maze: Maze,
  tiles: Uint8Array,
  hazards: ReadonlySet<number>,
  from: readonly [number, number],
): boolean[] {
  const { w, h } = maze;
  const ring = ringTiles(maze);
  const legs: boolean[] = [];
  const fromRing = bfs(w, h, (i) => routeTile(maze, tiles, hazards, i, true), ring);
  for (let slot = 0; slot < 2; slot++) {
    const src = from[slot]!;
    const exitP = maze.entrances[1 - slot]!;
    const tokenP = maze.tokenTiles[slot]!;
    const exit = exitP.y * w + exitP.x;
    const token = tokenP.y * w + tokenP.x;
    const reach = bfs(w, h, (i) => i === src || routeTile(maze, tiles, hazards, i, false), [src]);
    legs.push(ring.some((r) => reach[r]! >= 0));
    legs.push(fromRing[token]! >= 0);
    const fromToken = bfs(w, h, (i) => i === token || routeTile(maze, tiles, hazards, i, true), [
      token,
    ]);
    legs.push(fromToken[exit]! >= 0);
  }
  return legs;
}

/** True for tiles of the boss arena (core and ring, MZ-05). */
export function inArena(maze: Pick<Maze, 'cx' | 'cy' | 'ringRadius'>, x: number, y: number) {
  return chebyshev(x, y, maze.cx, maze.cy) <= maze.ringRadius;
}
