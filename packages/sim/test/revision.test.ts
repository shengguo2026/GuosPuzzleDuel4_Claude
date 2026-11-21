import { describe, expect, it } from 'vitest';
import {
  SOUTH,
  createMatch,
  hashState,
  nextInt,
  restoreMatch,
  snapshotMatch,
  stepMatch,
  type Dir,
  type MatchConfig,
  type PlayerInput,
  type RngState,
} from '../src/index.js';
import { input, ofType, place, put, run, tap, testMatch } from './helpers.js';

const NONE = input();

describe('entity model, revision and snapshots (WP 2b.1, ENV-WA-06, MZ-08, §17 reconnect)', () => {
  it('ENV-WA-06: every passability change increments revision with one event', () => {
    const s = testMatch();
    const gate = put(s, 'gate', 3, 3);
    put(s, 'gate', 5, 3);
    place(s, 0, 10, 2, SOUTH);
    const ev = run(s, 120);
    // Two gates close on the same tick: one increment, one event with both tiles.
    const revs = ofType(ev, 'revision');
    expect(revs.map((e) => [e.tick, e.revision, e.tiles])).toEqual([
      [119, 1, [3 * 15 + 3, 3 * 15 + 5]],
    ]);
    expect(gate.open).toBe(false);
    // A shield placement is a change too; standing still is not.
    const ev2 = tap(s, 0, 'shield');
    expect(ofType(ev2, 'revision').map((e) => e.tiles)).toEqual([[3 * 15 + 10]]);
    expect(s.revision).toBe(2);
    expect(ofType(run(s, 50), 'revision')).toHaveLength(0);
  });

  it('WP 2b.1: every environment entity has a stable unique ID', () => {
    const s = createMatch({ seed: 9, size: 'large', bossTier: 'ultimate', energy: 'normal' });
    const ids = s.env.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(s.nextId).toBeGreaterThan(Math.max(...ids));
  });

  it('§17 reconnect: snapshot restores tiles, gates, trap timers, buffs, fog and revision; nothing is replayed', () => {
    const configs: MatchConfig[] = [
      { seed: 41, size: 'medium', bossTier: 'hard', energy: 'normal' },
      { seed: 42, size: 'large', bossTier: 'ultimate', energy: 'fast' },
    ];
    for (const config of configs) {
      const rng: RngState = { rng: config.seed };
      const inputs = (): [PlayerInput, PlayerInput] =>
        [0, 1].map(() => ({
          held: (nextInt(rng, 5) - 1) as Dir | -1,
          pressed: -1,
          bomb: nextInt(rng, 30) === 0,
          shield: nextInt(rng, 40) === 0,
        })) as [PlayerInput, PlayerInput];
      const a = createMatch(config);
      a.players.forEach((p) => (p.life = 99));
      for (let t = 0; t < 900; t++) stepMatch(a, inputs());
      const snap = JSON.parse(JSON.stringify(snapshotMatch(a)));
      const b = restoreMatch(snap);
      expect(hashState(b)).toBe(hashState(a));
      expect(b.env).toEqual(a.env);
      expect(b.events).toEqual([]);
      for (let t = 0; t < 900; t++) {
        const i = inputs();
        stepMatch(a, i);
        stepMatch(b, i);
        expect(hashState(b)).toBe(hashState(a));
      }
    }
  });

  it('M-005: the environment does not depend on presentation; NO_INPUT keeps the hash deterministic', () => {
    const a = createMatch({ seed: 5, size: 'medium', bossTier: 'medium', energy: 'normal' });
    const b = createMatch({ seed: 5, size: 'medium', bossTier: 'medium', energy: 'normal' });
    run(a, 500);
    run(b, 500);
    expect(hashState(a)).toBe(hashState(b));
    expect(NONE.held).toBe(-1);
  });
});
