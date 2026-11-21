import { describe, expect, it } from 'vitest';
import {
  NORTH,
  SOUTH,
  TRAP_KINDS,
  Tile,
  bossPlaceable,
  createMatch,
  generateMaze,
  passable,
  routeHazards,
  routeLegs,
  startWarning,
  stepMatch,
  tileIndex,
  viewRadius,
  type BossTier,
  type MatchState,
  type PatternId,
  type Slot,
} from '../src/index.js';
import { CONFIG, input, ofType, openMaze, place, run, setTile, tap } from './helpers.js';

const NONE = input();

function match(tier: BossTier = 'ultimate') {
  const s = createMatch({ ...CONFIG, bossTier: tier }, openMaze());
  s.players.forEach((p) => (p.life = 3));
  return s;
}

/** Starts the warning of `pattern` now; the attack follows after `ticks` more ticks. */
function warn(s: MatchState, pattern: PatternId, target: Slot, ticks = 0) {
  s.boss.state = 'warning';
  s.boss.pattern = pattern;
  s.boss.target = target;
  startWarning(s, pattern, target);
  s.boss.timer = ticks;
}

const xy = (s: MatchState, i: number) => [i % s.maze.w, Math.floor(i / s.maze.w)];

describe('boss patterns 4–8 (WP 2b.8, BOSS-03, BOSS-04, BS-07, BS-13)', () => {
  it('BOSS-04 pattern 4 (Freeze Field): frost marks radius 2 around the target, ice for 120 ticks', () => {
    const s = match('medium');
    place(s, 0, 3, 3);
    place(s, 1, 11, 11);
    warn(s, 4, 0);
    expect(s.boss.marks).toHaveLength(25); // the 5×5 square around (3,3), all plain floor
    const ev = run(s, 1);
    expect(ofType(ev, 'boss-attack')[0]!.tiles).toHaveLength(25);
    const ice = s.env.filter((e) => e.kind === 'ice');
    expect(ice).toHaveLength(25);
    expect(ice.every((e) => e.boss && e.life === 120)).toBe(true);
    // TE-03: the player standing on it does not slide.
    run(s, 10);
    expect([s.players[0].x, s.players[0].y]).toEqual([3, 3]);
    run(s, 110);
    expect(s.env.filter((e) => e.kind === 'ice')).toHaveLength(0);
  });

  it('BOSS-04 pattern 5 (Trap Seeding): counts per tier split between players, 2–4 tiles away, 30-tick warning', () => {
    for (const [tier, count] of [
      ['medium', 2],
      ['hard', 3],
      ['extreme', 3],
      ['ultimate', 4],
    ] as const) {
      const s = match(tier);
      place(s, 0, 3, 3);
      place(s, 1, 11, 11);
      warn(s, 5, 1);
      expect(s.boss.marks).toHaveLength(count);
      run(s, 1);
      const traps = s.env.filter((e) => TRAP_KINDS.includes(e.kind));
      expect(traps).toHaveLength(count);
      const near = (slot: Slot) =>
        traps.filter((t) => {
          const p = s.players[slot];
          const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y);
          return d >= 2 && d <= 4;
        }).length;
      expect(near(1)).toBe(Math.ceil(count / 2)); // the extra one near the target
      expect(near(0)).toBe(Math.floor(count / 2));
      for (const t of traps) {
        expect(['spike', 'shock']).toContain(t.kind);
        expect([t.boss, t.warn, t.life]).toEqual([true, 30, 300]);
      }
    }
  });

  it('BOSS-04 pattern 6 (Wall Raise): 1 wall (Hard, Extreme), 2 (Ultimate) on corridors 2–5 from the target, 240 ticks', () => {
    let placed = 0;
    for (let seed = 1; seed <= 30; seed++) {
      for (const [tier, n] of [
        ['hard', 1],
        ['ultimate', 2],
      ] as const) {
        const maze = generateMaze(seed, 'medium', { environment: false });
        const s = createMatch({ ...CONFIG, seed, size: 'medium', bossTier: tier }, maze);
        place(s, 0, maze.cx, maze.cy - 5);
        warn(s, 6, 0);
        expect(s.boss.marks.length).toBeLessThanOrEqual(n);
        const rev = s.revision;
        const ev = run(s, 1);
        const walls = s.env.filter((e) => e.kind === 'bossWall');
        placed += walls.length;
        if (walls.length > 0) expect(s.revision).toBe(rev + 1);
        expect(ofType(ev, 'boss-wall')).toHaveLength(walls.length);
        for (const w of walls) {
          const d = Math.abs(w.x - maze.cx) + Math.abs(w.y - (maze.cy - 5));
          expect(d).toBeGreaterThanOrEqual(2);
          expect(d).toBeLessThanOrEqual(5);
          expect(passable(s, w.x, w.y)).toBe(false);
          expect([w.boss, w.life]).toEqual([true, 240]);
        }
      }
    }
    expect(placed).toBeGreaterThan(30);
  });

  it('BS-13: boss traps and walls never cut a player off from an objective', () => {
    const s = match('ultimate');
    // Column x = 2 is a wall except (2,1): the left strip connects only through (2,1).
    for (let y = 2; y <= 13; y++) setTile(s, 2, y, Tile.WALL);
    place(s, 0, 1, 8);
    place(s, 1, 11, 11);
    expect(bossPlaceable(s, tileIndex(s, 2, 1), [])).toBe(false);
    expect(bossPlaceable(s, tileIndex(s, 1, 1), [])).toBe(false);
    expect(bossPlaceable(s, tileIndex(s, 10, 3), [])).toBe(true);
    // Never on an occupied tile, the arena or an entity.
    expect(bossPlaceable(s, tileIndex(s, 11, 11), [])).toBe(false);
    expect(bossPlaceable(s, tileIndex(s, 7, 5), [])).toBe(false);
    // Seeding around P1 in the strip places nothing that seals it.
    warn(s, 5, 0);
    run(s, 1);
    const hazards = routeHazards(s.env, 15);
    const legs = routeLegs(s.maze, s.tiles, hazards, [tileIndex(s, 1, 8), tileIndex(s, 11, 11)]);
    expect(legs.every(Boolean)).toBe(true);
  });

  it('BOSS-04 pattern 7 (Darkness Pulse): darkness 120 ticks, no damage', () => {
    const s = match('extreme');
    place(s, 0, 3, 3);
    place(s, 1, 11, 11);
    warn(s, 7, 0);
    const ev = run(s, 1);
    expect(s.darkness).toBe(120);
    expect(viewRadius(s, 0)).toBe(3);
    expect(ofType(ev, 'player-hit')).toHaveLength(0);
    run(s, 120);
    expect(s.darkness).toBe(0);
  });

  it('BOSS-04 pattern 8 (Ball Rain): a 3×3 zone on each player at warning start; shields do not help', () => {
    const s = match('ultimate');
    place(s, 0, 3, 3, SOUTH);
    place(s, 1, 11, 11, NORTH);
    tap(s, 0, 'shield');
    warn(s, 8, 0, 35);
    expect(s.boss.marks).toEqual([tileIndex(s, 3, 3), tileIndex(s, 11, 11)]);
    // P2 walks two tiles out of its zone during the warning; P1 stays.
    const ev = run(s, 36, (t) => [NONE, input({ held: t < 10 ? NORTH : -1 })]);
    const attack = ofType(ev, 'boss-attack')[0]!;
    const hits = ofType(ev, 'player-hit');
    expect(hits.map((h) => [h.slot, h.tick])).toEqual([[0, attack.tick]]);
    expect(xy(s, s.boss.marks[1]!)).toEqual([11, 11]);
  });

  it('BOSS-03: no boss trap, wall, ball, ice or darkness left after defeat', () => {
    const s = match('ultimate');
    place(s, 0, 3, 3);
    place(s, 1, 11, 11);
    for (const p of [4, 5, 7] as const) {
      warn(s, p, 0);
      run(s, 1);
    }
    s.env.push({ ...s.env[0]!, id: 999, kind: 'bossWall', x: 12, y: 2, boss: true, life: 240 });
    s.balls.push({ id: 998, x: 1, y: 13, dir: 0, age: 0 });
    expect(s.env.some((e) => e.boss)).toBe(true);
    expect(s.darkness).toBeGreaterThan(0);
    s.boss.hp = 1;
    s.boss.timer = 1e6;
    s.boss.state = 'cooldown';
    place(s, 0, 7, 5, SOUTH);
    s.players[0].attack = 1;
    s.players[0].immobile = 0;
    stepMatch(s, [input({ bomb: true }), NONE]);
    stepMatch(s, [NONE, NONE]);
    expect(s.phase).toBe('escape');
    expect(s.env.filter((e) => e.boss)).toEqual([]);
    expect([s.balls.length, s.darkness, s.boss.marks.length]).toEqual([0, 0, 0]);
  });

  it('BS-14 / BS-04: a full Ultimate run uses all eight patterns and never repeats one', () => {
    const s = createMatch({ seed: 3, size: 'large', bossTier: 'ultimate', energy: 'normal' });
    s.players.forEach((p) => (p.life = 1e6));
    const patterns = ofType(run(s, 9000), 'boss-warning').map((w) => w.pattern);
    expect(new Set(patterns)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    for (let i = 1; i < patterns.length; i++) expect(patterns[i]).not.toBe(patterns[i - 1]);
  });
});
