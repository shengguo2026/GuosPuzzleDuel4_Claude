import { describe, expect, it } from 'vitest';
import { balance } from '@gpd4/rules';
import {
  PICKUP_KINDS,
  TRAP_KINDS,
  Tile,
  checkRoutes,
  chebyshev,
  createMatch,
  generateMaze,
  isPointSymmetric,
  nextInt,
  opposite,
  routeHazards,
  routeLegs,
  stepMatch,
  tileIndex,
  type Dir,
  type MazeSize,
  type PlayerInput,
  type RngState,
} from '../src/index.js';

const SIZES: MazeSize[] = ['small', 'medium', 'large'];

describe('generator with the environment layer (WP 2b.9, M-003, M-004, INV-07, PU-06)', () => {
  it('MZ-03 / M-003: every element has a point-symmetric partner of the same kind', () => {
    for (const size of SIZES)
      for (let seed = 1; seed <= 150; seed++) {
        const maze = generateMaze(seed, size);
        const n = maze.w * maze.h;
        expect(isPointSymmetric(maze)).toBe(true);
        const at = new Map(maze.env.map((e) => [`${e.kind}@${e.y * maze.w + e.x}`, e]));
        for (const e of maze.env) {
          const partner = at.get(`${e.kind}@${n - 1 - (e.y * maze.w + e.x)}`);
          expect(partner, `${size} ${seed} ${e.kind}`).toBeDefined();
          if (e.kind === 'conveyor') expect(partner!.dir).toBe(opposite(e.dir as Dir));
          if (e.kind === 'gate') {
            expect(maze.tiles[e.y * maze.w + e.x]).toBe(Tile.GATE);
            expect([partner!.cycle, partner!.openTicks]).toEqual([e.cycle, e.openTicks]);
          }
          if (e.kind === 'pad') expect(partner!.link).toBe(e.id);
        }
      }
  });

  it('INV-07 / MZ-07: routes hold with traps, pads and conveyors avoided and gates open', () => {
    for (const size of SIZES)
      for (let seed = 1; seed <= 300; seed++) {
        const maze = generateMaze(seed, size);
        const report = checkRoutes(maze);
        expect(report.problems, `${size} ${seed}`).toEqual([]);
      }
  });

  it('ENV-PU-05: counts per size and forbidden tiles respected', () => {
    for (const size of SIZES) {
      const counts = balance.maze.generator.environment[size];
      const pickups = balance.pickups.perSize[size];
      let complete = 0;
      for (let seed = 1; seed <= 100; seed++) {
        const maze = generateMaze(seed, size);
        const count = (k: string) => maze.env.filter((e) => e.kind === k).length;
        if (maze.env.length > 0) complete++;
        else continue;
        expect(count('attackOrb')).toBe(pickups.attackOrbs.value);
        expect(count('defenseOrb')).toBe(pickups.defenseOrbs.value);
        expect(count('heart')).toBe(pickups.hearts.value);
        expect(count('spike')).toBe(2 * counts.spikes.value);
        expect(count('shock')).toBe(2 * counts.shocks.value);
        expect(count('snare')).toBe(2 * counts.snares.value);
        expect(count('pad')).toBe(2 * counts.padPairs.value);
        expect(count('gate')).toBe(2 * counts.gates.value);
        expect(count('boost')).toBe(2 * counts.boosts.value);
        for (const e of maze.env) {
          if (e.kind === 'fog') continue;
          // One element per tile (fog overlaps); never in the arena or on an entrance.
          const same = maze.env.filter((o) => o.x === e.x && o.y === e.y && o.kind !== 'fog');
          expect(same).toHaveLength(1);
          expect(chebyshev(e.x, e.y, maze.cx, maze.cy)).toBeGreaterThan(maze.ringRadius);
          if (PICKUP_KINDS.includes(e.kind) || TRAP_KINDS.includes(e.kind))
            expect(maze.tiles[e.y * maze.w + e.x]).toBe(Tile.FLOOR);
        }
      }
      expect(complete).toBe(100);
    }
  });

  it('M-002: the same seed gives the same environment; environment off gives the bare maze', () => {
    const a = generateMaze(99, 'large');
    const b = generateMaze(99, 'large');
    expect(a.env).toEqual(b.env);
    const bare = generateMaze(99, 'large', { environment: false });
    expect(bare.env).toEqual([]);
    expect(bare.tiles.includes(Tile.GATE)).toBe(false);
  });

  it('BS-13 / INV-07: in long Ultimate matches boss traps and walls never cut an objective that was reachable', () => {
    for (const seed of [11, 12, 13]) {
      const s = createMatch({ seed, size: 'medium', bossTier: 'ultimate', energy: 'normal' });
      s.players.forEach((p) => (p.life = 1e6));
      const rng: RngState = { rng: seed };
      const held: (Dir | -1)[] = [-1, -1];
      const legs = () =>
        routeLegs(
          s.maze,
          s.tiles,
          new Set([
            ...routeHazards(
              s.env.filter((e) => e.boss),
              s.maze.w,
            ),
            ...routeHazards(
              s.env.filter((e) => !e.boss),
              s.maze.w,
            ),
          ]),
          [
            tileIndex(s, s.players[0].x, s.players[0].y),
            tileIndex(s, s.players[1].x, s.players[1].y),
          ],
        );
      let checked = 0;
      for (let t = 0; t < 6000 && s.phase === 'boss'; t++) {
        if (nextInt(rng, 15) === 0) held[nextInt(rng, 2)] = nextInt(rng, 4) as Dir;
        const inputs = held.map((h) => ({ held: h, pressed: -1, bomb: false, shield: false }));
        const willAttack = s.boss.state === 'warning' && s.boss.timer === 0;
        const before = willAttack ? legs() : null;
        stepMatch(s, inputs as [PlayerInput, PlayerInput]);
        if (before && (s.boss.pattern === 5 || s.boss.pattern === 6)) {
          const after = legs();
          before.forEach((ok, k) => expect(!ok || after[k]).toBe(true));
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(5);
    }
  });
});
