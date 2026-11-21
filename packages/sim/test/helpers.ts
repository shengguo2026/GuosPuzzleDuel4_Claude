import {
  NO_INPUT,
  addEnv,
  Tile,
  createMatch,
  stepMatch,
  type Dir,
  type EnvEntity,
  type EnvKind,
  type GameEvent,
  type MatchConfig,
  type MatchState,
  type Maze,
  type PlayerInput,
} from '../src/index.js';

export const CONFIG: MatchConfig = { seed: 1, size: 'small', bossTier: 'easy', energy: 'normal' };

/**
 * A hand-made 15×15 test maze: open floor inside a solid border, the 3×3 boss
 * core in the centre, entrances at (7,0) and (7,14). Tests add walls as needed.
 */
export function openMaze(): Maze {
  const w = 15;
  const h = 15;
  const tiles = new Uint8Array(w * h).fill(Tile.FLOOR);
  for (let i = 0; i < w; i++) {
    tiles[i] = Tile.WALL;
    tiles[(h - 1) * w + i] = Tile.WALL;
    tiles[i * w] = Tile.WALL;
    tiles[i * w + w - 1] = Tile.WALL;
  }
  for (let y = 6; y <= 8; y++) for (let x = 6; x <= 8; x++) tiles[y * w + x] = Tile.CORE;
  tiles[7] = Tile.ENTRANCE;
  tiles[(h - 1) * w + 7] = Tile.ENTRANCE;
  return {
    size: 'small',
    seed: 0,
    w,
    h,
    tiles,
    cx: 7,
    cy: 7,
    coreRadius: 1,
    ringRadius: 2,
    entrances: [
      { x: 7, y: 0 },
      { x: 7, y: 14 },
    ],
    tokenTiles: [
      { x: 6, y: 7 },
      { x: 8, y: 7 },
    ],
    shortcuts: [],
    attempts: 1,
    env: [],
  };
}

/** Match on the open test maze; the boss is kept quiet unless `bossActive`. */
export function testMatch(over: Partial<MatchConfig> = {}, bossActive = false): MatchState {
  const s = createMatch({ ...CONFIG, ...over }, openMaze());
  if (!bossActive) s.boss.timer = 1_000_000;
  return s;
}

export function setTile(s: MatchState, x: number, y: number, t: number): void {
  s.tiles[y * s.maze.w + x] = t;
}

export function place(s: MatchState, slot: 0 | 1, x: number, y: number, facing?: Dir): void {
  const p = s.players[slot];
  p.x = x;
  p.y = y;
  p.step = null;
  if (facing !== undefined) p.facing = facing;
}

export function input(over: Partial<PlayerInput> = {}): PlayerInput {
  return { ...NO_INPUT, ...over };
}

/** Runs n ticks; `f(t)` gives the input pair for tick t (default: none). */
export function run(
  s: MatchState,
  n: number,
  f: (t: number) => readonly [PlayerInput, PlayerInput] = () => [NO_INPUT, NO_INPUT],
): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < n; t++) all.push(...stepMatch(s, f(t)));
  return all;
}

/** Holds an ability down for `downTicks` ticks, then releases it on the next tick. */
export function holdAndRelease(
  s: MatchState,
  slot: 0 | 1,
  ability: 'bomb' | 'shield',
  downTicks: number,
  extra: Partial<PlayerInput> = {},
): GameEvent[] {
  const events: GameEvent[] = [];
  for (let t = 0; t <= downTicks; t++) {
    const pair: [PlayerInput, PlayerInput] = [NO_INPUT, NO_INPUT];
    pair[slot] = input({ ...extra, [ability]: t < downTicks });
    events.push(...stepMatch(s, pair));
  }
  return events;
}

/** A one-tick tap: down on one tick, up on the next. */
export function tap(s: MatchState, slot: 0 | 1, ability: 'bomb' | 'shield'): GameEvent[] {
  return holdAndRelease(s, slot, ability, 1);
}

export const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

/** Adds an environment entity on (x, y); a gate also turns the tile into Tile.GATE. */
export function put(
  s: MatchState,
  kind: EnvKind,
  x: number,
  y: number,
  over: Partial<EnvEntity> = {},
): EnvEntity {
  if (kind === 'gate') {
    setTile(s, x, y, Tile.GATE);
    return addEnv(s, kind, x, y, { open: true, openTicks: 120, closedTicks: 90, ...over });
  }
  return addEnv(s, kind, x, y, over);
}

/** Two pads linked to each other. */
export function padPair(s: MatchState, a: [number, number], b: [number, number]) {
  const pa = put(s, 'pad', a[0], a[1]);
  const pb = put(s, 'pad', b[0], b[1]);
  pa.link = pb.id;
  pb.link = pa.id;
  return [pa, pb] as const;
}

/** Runs ticks until `done()` or `max` ticks; returns the events. */
export function runUntil(
  s: MatchState,
  done: () => boolean,
  max = 1000,
  f?: (t: number) => readonly [PlayerInput, PlayerInput],
) {
  const all: GameEvent[] = [];
  for (let t = 0; t < max && !done(); t++)
    all.push(...stepMatch(s, f ? f(t) : [NO_INPUT, NO_INPUT]));
  return all;
}
