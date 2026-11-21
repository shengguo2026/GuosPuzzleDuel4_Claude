/**
 * The boss (WP 2a.6, 2b.8; BS-01 to BS-14, BOSS-01 to BOSS-04): the pattern
 * cycle cooldown → warning → attack → recovery and the eight signed patterns
 * (D-14). Each pattern picks its tiles at the start of the warning, so the
 * telegraph shows exactly what will happen; on the attack tick the tiles are
 * checked again (BS-13) and the pattern's entities spawn.
 */
import { balance } from '@gpd4/rules';
import { chebyshev } from './maze.js';
import { nextInt } from './rng.js';
import {
  DX,
  DY,
  PATTERN_KEYS,
  Tile,
  opposite,
  type Ball,
  type BossTier,
  type Dir,
  type EnvKind,
  type Lane,
  type MatchState,
  type PatternId,
  type Slot,
  type Wave,
} from './types.js';
import {
  addEnv,
  emit,
  inArena,
  inBounds,
  isBlocker,
  occupied,
  routeHazards,
  routeLegs,
  routeTile,
  shieldAt,
  tileIndex,
} from './world.js';

const B = balance;
const RECOVERY = B.boss.recoveryTicks.value;
const MIN_WARNING = B.boss.minWarningTicks.value;
const ALL_PATTERNS: PatternId[] = [1, 2, 3, 4, 5, 6, 7, 8];
const TIER_ORDER: readonly BossTier[] = ['easy', 'medium', 'hard', 'extreme', 'ultimate'];

/** BOSS-04 tier unlocks: Easy 1–2, Medium 1–5, Hard 1–6, Extreme 1–7, Ultimate 1–8. */
export function unlockedPatterns(tier: BossTier): PatternId[] {
  const rank = TIER_ORDER.indexOf(tier);
  return ALL_PATTERNS.filter(
    (p) => TIER_ORDER.indexOf(B.boss.patterns[PATTERN_KEYS[p]].fromTier.value as BossTier) <= rank,
  );
}

export function warningTicks(p: PatternId): number {
  return Math.max(MIN_WARNING, B.boss.patterns[PATTERN_KEYS[p]].warningTicks.value);
}

/** BS-02 cooldown per tier, shortened by Rage (BS-03). */
export function cooldownTicks(state: Pick<MatchState, 'config' | 'boss'>): number {
  const tier = B.boss.tiers[state.config.bossTier];
  const base = tier.cooldownTicks.value;
  const rage =
    tier.rage.value && state.boss.hp * 100 < state.boss.maxHp * B.boss.rageHpFraction.value * 100;
  return rage ? Math.floor(base * B.boss.rageCooldownFactor.value) : base;
}

/** BS-08: the Orb Shot lane toward a player. */
export function laneToward(s: MatchState, slot: Slot): Lane {
  const { cx, cy, coreRadius } = s.maze;
  const p = s.players[slot];
  const dx = p.x - cx;
  const dy = p.y - cy;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  if (Math.abs(dy) >= Math.abs(dx)) {
    const dir: Dir = dy < 0 ? 0 : 2;
    const x = clamp(cx + dx, cx - coreRadius, cx + coreRadius);
    return { x, y: cy + (dir === 0 ? -(coreRadius + 1) : coreRadius + 1), dir };
  }
  const dir: Dir = dx > 0 ? 1 : 3;
  const y = clamp(cy + dy, cy - coreRadius, cy + coreRadius);
  return { x: cx + (dir === 1 ? coreRadius + 1 : -(coreRadius + 1)), y, dir };
}

function mirrorLane(s: MatchState, lane: Lane): Lane {
  return { x: s.maze.w - 1 - lane.x, y: s.maze.h - 1 - lane.y, dir: opposite(lane.dir) };
}

/** BS-05 target choice: nearest by Manhattan distance; ties alternate. */
function chooseTarget(s: MatchState): Slot {
  const { cx, cy } = s.maze;
  const d = s.players.map((p) => Math.abs(p.x - cx) + Math.abs(p.y - cy));
  if (d[0]! < d[1]!) return 0;
  if (d[1]! < d[0]!) return 1;
  const pick: Slot = s.boss.lastTie === -1 ? (nextInt(s, 2) as Slot) : s.boss.lastTie === 0 ? 1 : 0;
  s.boss.lastTie = pick;
  return pick;
}

/** BS-12: tiles at `radius` reached from the previous front without crossing blockers. */
export function waveFront(s: MatchState, previous: readonly number[], radius: number): number[] {
  const { w, cx, cy } = s.maze;
  const reached = new Set<number>();
  const queue: number[] = [];
  const consider = (x: number, y: number) => {
    if (!inBounds(s, x, y) || chebyshev(x, y, cx, cy) !== radius || isBlocker(s, x, y)) return;
    const i = y * w + x;
    if (reached.has(i)) return;
    reached.add(i);
    queue.push(i);
  };
  for (const i of previous) {
    const x = i % w;
    const y = (i - x) / w;
    for (let k = 0; k < 4; k++) consider(x + DX[k]!, y + DY[k]!);
  }
  while (queue.length > 0) {
    const i = queue.shift()!;
    const x = i % w;
    const y = (i - x) / w;
    for (let k = 0; k < 4; k++) consider(x + DX[k]!, y + DY[k]!);
  }
  return [...reached].sort((a, b) => a - b);
}

/** First front of a shockwave: every non-blocked tile at coreRadius + 1. */
function firstFront(s: MatchState): number[] {
  const { w, cx, cy, coreRadius } = s.maze;
  const r = coreRadius + 1;
  const out: number[] = [];
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if (chebyshev(x, y, cx, cy) === r && !isBlocker(s, x, y)) out.push(y * w + x);
  return out;
}

// ------------------------------------------------------------ BS-13 placement

/** Plain floor with no entity (fog does not count), no shield, outside the arena. */
function plainFloor(s: MatchState, i: number, allowArena: boolean): boolean {
  const { w } = s.maze;
  const x = i % w;
  const y = (i - x) / w;
  if (s.tiles[i] !== Tile.FLOOR) return false;
  if (!allowArena && inArena(s.maze, x, y)) return false;
  if (s.maze.tokenTiles.some((t) => t.x === x && t.y === y)) return false;
  if (s.env.some((e) => e.x === x && e.y === y && e.kind !== 'fog')) return false;
  return !shieldAt(s, x, y);
}

/** Current tile of each player, as route sources for BS-13. */
function playerSources(s: MatchState): [number, number] {
  return [
    tileIndex(s, s.players[0].x, s.players[0].y),
    tileIndex(s, s.players[1].x, s.players[1].y),
  ];
}

/**
 * BS-13: a boss trap or wall may go on `i` only if it is plain floor, not
 * occupied, not in the arena, and blocking it (with `extra`) does not cut any
 * player off from an objective leg that is reachable now (temporary hazards
 * may slow, never seal; INV-07).
 */
export function bossPlaceable(s: MatchState, i: number, extra: readonly number[]): boolean {
  const x = i % s.maze.w;
  const y = (i - x) / s.maze.w;
  if (!plainFloor(s, i, false) || occupied(s, x, y)) return false;
  const hazards = routeHazards(s.env, s.maze.w);
  for (const e of extra) hazards.add(e);
  const before = routeLegs(s.maze, s.tiles, hazards, playerSources(s));
  hazards.add(i);
  const after = routeLegs(s.maze, s.tiles, hazards, playerSources(s));
  return before.every((ok, k) => !ok || after[k]);
}

/** Picks up to `count` tiles from `candidates` in PRNG order that pass `ok`. */
function pickTiles(
  s: MatchState,
  candidates: number[],
  count: number,
  ok: (i: number, chosen: readonly number[]) => boolean,
): number[] {
  const pool = [...candidates];
  const chosen: number[] = [];
  while (chosen.length < count && pool.length > 0) {
    const k = nextInt(s, pool.length);
    const i = pool[k]!;
    pool.splice(k, 1);
    if (ok(i, chosen)) chosen.push(i);
  }
  return chosen;
}

/**
 * Tiles at Manhattan distance lo…hi from a player, listed in that player's own
 * frame (P2's list is P1's list rotated 180°), so the PRNG picks mirrored tiles
 * in a mirrored situation (V-001, SIM-05).
 */
function tilesAtManhattan(
  s: MatchState,
  slot: Slot,
  x: number,
  y: number,
  lo: number,
  hi: number,
): number[] {
  const out: number[] = [];
  for (let ty = y - hi; ty <= y + hi; ty++)
    for (let tx = x - hi; tx <= x + hi; tx++) {
      const d = Math.abs(tx - x) + Math.abs(ty - y);
      if (d >= lo && d <= hi && inBounds(s, tx, ty)) out.push(tileIndex(s, tx, ty));
    }
  return slot === 0 ? out : out.reverse();
}

/** A corridor tile: exactly two floor-like neighbours (BS-07 pattern 6). */
function corridor(s: MatchState, i: number): boolean {
  const x = i % s.maze.w;
  const y = (i - x) / s.maze.w;
  let n = 0;
  for (let d = 0; d < 4; d++) {
    const nx = x + DX[d]!;
    const ny = y + DY[d]!;
    if (inBounds(s, nx, ny) && routeTile(s.maze, s.tiles, new Set(), tileIndex(s, nx, ny), false))
      n++;
  }
  return n === 2;
}

// ------------------------------------------------------------ pattern cycle

/** What the attack tick spawned: balls and waves act from the next tick, rain resolves now. */
export interface BossSpawns {
  balls: Ball[];
  waves: Wave[];
  /** Ball Rain impact-zone centres (pattern 8), resolved in step 4 of this tick. */
  rain: number[];
}

export function advanceBoss(s: MatchState, spawns: BossSpawns, changed: Set<number>): void {
  const boss = s.boss;
  // A state entered on tick T with timer N lasts ticks T … T+N−1; the first
  // cooldown is entered at tick 0 (BS-02).
  if (boss.timer > 0) {
    boss.age++;
  } else {
    boss.age = 0;
    transitionBoss(s, spawns, changed);
  }
  boss.timer--;
}

function transitionBoss(s: MatchState, spawns: BossSpawns, changed: Set<number>): void {
  const boss = s.boss;
  switch (boss.state) {
    case 'cooldown': {
      // BS-04: uniform among unlocked patterns, no immediate repeat.
      const pool = unlockedPatterns(s.config.bossTier).filter(
        (p, _i, all) => all.length === 1 || p !== boss.lastPattern,
      );
      const pattern = pool[nextInt(s, pool.length)]!;
      boss.pattern = pattern;
      boss.target = chooseTarget(s);
      startWarning(s, pattern, boss.target);
      boss.state = 'warning';
      boss.timer = warningTicks(pattern);
      emit(s, { type: 'boss-warning', pattern, target: boss.target });
      return;
    }
    case 'warning': {
      const pattern = boss.pattern as PatternId;
      const tiles = attack(s, pattern, spawns, changed);
      boss.state = 'attack';
      boss.timer = 1;
      emit(s, { type: 'boss-attack', pattern, tiles });
      return;
    }
    case 'attack':
      boss.state = 'recovery';
      boss.timer = RECOVERY;
      return;
    case 'recovery':
      boss.lastPattern = boss.pattern;
      boss.pattern = 0;
      boss.lanes = [];
      boss.marks = [];
      boss.markKinds = [];
      boss.target = -1;
      boss.state = 'cooldown';
      boss.timer = cooldownTicks(s);
      return;
    case 'defeated':
      return;
  }
}

/** Sets the pattern's telegraph (lanes or marked tiles) at the start of the warning. */
export function startWarning(s: MatchState, pattern: PatternId, target: Slot): void {
  const boss = s.boss;
  boss.lanes = [];
  boss.marks = [];
  boss.markKinds = [];
  const t = s.players[target];
  const tier = B.boss.tiers[s.config.bossTier];
  switch (pattern) {
    case 1:
    case 3: {
      const lane = laneToward(s, target);
      boss.lanes.push(lane);
      if (pattern === 3) boss.lanes.push(mirrorLane(s, lane));
      return;
    }
    case 4: {
      // Freeze Field: every plain floor tile within Chebyshev radius 2 of the target.
      const r = B.boss.freezeRadiusTiles.value;
      for (let y = t.y - r; y <= t.y + r; y++)
        for (let x = t.x - r; x <= t.x + r; x++)
          if (inBounds(s, x, y) && plainFloor(s, tileIndex(s, x, y), true))
            boss.marks.push(tileIndex(s, x, y));
      return;
    }
    case 5: {
      // Trap Seeding: count split between both players, the extra one near the target.
      const count = tier.trapSeedCount.value;
      const [lo, hi] = B.boss.trapSeedDistance.value as [number, number];
      const order: Slot[] = [target, target === 0 ? 1 : 0];
      for (const [k, slot] of order.entries()) {
        const n = k === 0 ? Math.ceil(count / 2) : Math.floor(count / 2);
        const p = s.players[slot];
        const picked = pickTiles(s, tilesAtManhattan(s, slot, p.x, p.y, lo, hi), n, (i, chosen) =>
          bossPlaceable(s, i, [...boss.marks, ...chosen]),
        );
        for (const i of picked) {
          boss.marks.push(i);
          boss.markKinds.push(nextInt(s, 2));
        }
      }
      return;
    }
    case 6: {
      // Wall Raise: corridor tiles 2–5 from the target.
      const [lo, hi] = B.boss.wallRaiseDistance.value as [number, number];
      const candidates = tilesAtManhattan(s, target, t.x, t.y, lo, hi).filter((i) =>
        corridor(s, i),
      );
      boss.marks = pickTiles(s, candidates, tier.wallRaiseCount.value, (i, chosen) =>
        bossPlaceable(s, i, chosen),
      );
      return;
    }
    case 8:
      // Ball Rain: one 3×3 zone centred on each player's tile.
      boss.marks = s.players.map((p) => tileIndex(s, p.x, p.y));
      return;
    default:
      return;
  }
}

/** The attack tick: spawns the pattern's effects; returns the tiles it acted on. */
function attack(
  s: MatchState,
  pattern: PatternId,
  spawns: BossSpawns,
  changed: Set<number>,
): number[] {
  const boss = s.boss;
  const xy = (i: number): [number, number] => [i % s.maze.w, Math.floor(i / s.maze.w)];
  switch (pattern) {
    case 1:
    case 3:
      for (const lane of boss.lanes) {
        if (isBlocker(s, lane.x, lane.y)) continue; // a shield on the spawn tile stops it
        spawns.balls.push({ id: s.nextId++, x: lane.x, y: lane.y, dir: lane.dir, age: 0 });
      }
      return [];
    case 2:
      spawns.waves.push({
        id: s.nextId++,
        radius: s.maze.coreRadius + 1,
        maxRadius: s.maze.coreRadius + B.boss.shockwaveRings.value,
        age: 0,
        reached: firstFront(s),
      });
      return [];
    case 4: {
      const done: number[] = [];
      for (const i of boss.marks) {
        if (!plainFloor(s, i, true)) continue;
        const [x, y] = xy(i);
        addEnv(s, 'ice', x, y, { boss: true, life: B.boss.freezeTicks.value });
        done.push(i);
      }
      return done;
    }
    case 5: {
      const done: number[] = [];
      boss.marks.forEach((i, k) => {
        if (!bossPlaceable(s, i, [])) return;
        const [x, y] = xy(i);
        const kind: EnvKind = boss.markKinds[k] === 1 ? 'shock' : 'spike';
        addEnv(s, kind, x, y, {
          boss: true,
          warn: B.traps.bossTrapWarningTicks.value,
          life: B.traps.bossTrapLifetimeTicks.value,
        });
        done.push(i);
      });
      return done;
    }
    case 6: {
      const done: number[] = [];
      for (const i of boss.marks) {
        if (!bossPlaceable(s, i, [])) continue;
        const [x, y] = xy(i);
        addEnv(s, 'bossWall', x, y, { boss: true, life: B.boss.wallTicks.value });
        changed.add(i);
        emit(s, { type: 'boss-wall', x, y, raised: true });
        done.push(i);
      }
      return done;
    }
    case 7:
      s.darkness = B.visibility.darknessTicks.value;
      return [];
    case 8:
      spawns.rain.push(...boss.marks);
      return [...boss.marks];
  }
}

/** BS-07 pattern 8: the 3×3 zone around a centre tile contains (x, y). */
export function inRainZone(s: MatchState, centre: number, x: number, y: number): boolean {
  const cx = centre % s.maze.w;
  const cy = (centre - cx) / s.maze.w;
  const r = Math.floor(B.boss.ballRainZoneSize.value / 2);
  return chebyshev(x, y, cx, cy) <= r;
}
