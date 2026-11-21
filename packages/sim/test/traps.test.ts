import { describe, expect, it } from 'vitest';
import { SOUTH, shockDangerous, shockWarning, stepMatch } from '../src/index.js';
import { input, ofType, place, put, run, tap, testMatch } from './helpers.js';

const NONE = input();
const south = () => [input({ held: SOUTH }), NONE] as const;

describe('traps (WP 2b.2, ENV-TR-01 to ENV-TR-08, TR-01 to TR-10)', () => {
  it('ENV-TR-01: spike takes 1 Life once and immobilizes 15 ticks', () => {
    const s = testMatch();
    place(s, 0, 3, 2, SOUTH);
    put(s, 'spike', 3, 3);
    const ev = run(s, 5, south); // enters (3,3) on tick 4
    expect(ofType(ev, 'trap-triggered').map((e) => [e.kind, e.tick])).toEqual([['spike', 4]]);
    expect(ofType(ev, 'player-hit')).toHaveLength(1);
    expect(s.players[0].life).toBe(2);
    expect(s.env).toHaveLength(0); // TR-03: the maze spike is removed
    // Immobilized for 15 ticks although S is held.
    run(s, 15, south);
    expect([s.players[0].x, s.players[0].y, s.players[0].step]).toEqual([3, 3, null]);
    run(s, 1, south);
    expect(s.players[0].step).not.toBeNull();
  });

  it('ENV-TR-02: shock hurts only in the dangerous window; it is never consumed', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    const shock = put(s, 'shock', 3, 3);
    const warnings: number[] = [];
    const ev = run(s, 200, (t) => {
      if (shockWarning(shock)) warnings.push(t);
      return [NONE, NONE];
    });
    // Safe 75 ticks (warning in the last 15), dangerous 45; invulnerability spans the rest.
    expect(ofType(ev, 'player-hit').map((e) => e.tick)).toEqual([74, 194]);
    expect(warnings[0]).toBe(60);
    expect(warnings).toHaveLength(15 + 15);
    expect(s.env).toContain(shock);
  });

  it('ENV-TR-03: snare immobilizes 60 ticks without damage', () => {
    const s = testMatch();
    place(s, 0, 3, 2, SOUTH);
    put(s, 'snare', 3, 3);
    const ev = run(s, 5, south);
    expect(ofType(ev, 'trap-triggered')).toHaveLength(1);
    expect(s.players[0].life).toBe(3);
    expect(s.players[0].immobile).toBe(60);
    expect(s.env).toHaveLength(0);
    run(s, 60, south);
    expect(s.players[0].step).toBeNull();
    run(s, 1, south);
    expect(s.players[0].step).not.toBeNull();
  });

  it('TR-06: an invulnerable player is not affected; the trap triggers when invulnerability ends', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    s.players[0].invulnerable = 10;
    put(s, 'snare', 3, 3);
    const ev = run(s, 12);
    expect(ofType(ev, 'trap-triggered').map((e) => e.tick)).toEqual([9]);
  });

  it('ENV-TR-05: boss trap harmless for 30 warning ticks, then active 300 ticks', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    put(s, 'spike', 3, 3, { boss: true, warn: 30, life: 300 });
    const ev = run(s, 40);
    expect(ofType(ev, 'trap-triggered').map((e) => e.tick)).toEqual([29]);

    const t = testMatch();
    const trap = put(t, 'shock', 3, 3, { boss: true, warn: 30, life: 300 });
    run(t, 329);
    expect(t.env).toContain(trap);
    expect(trap.warn).toBe(0);
    run(t, 1);
    expect(t.env).not.toContain(trap);
  });

  it('TR-08: a boss shock trap cycles from its own activation tick', () => {
    const s = testMatch();
    const trap = put(s, 'shock', 3, 3, { boss: true, warn: 30, life: 300 });
    const dangerFrom = run(s, 200, () => [NONE, NONE]) && s.tick;
    expect(dangerFrom).toBe(200);
    // Activated on tick 29; cycle position 0 there, dangerous from position 75.
    const t = testMatch();
    const trap2 = put(t, 'shock', 3, 3, { boss: true, warn: 30, life: 300 });
    let first = -1;
    for (let k = 0; k < 200 && first < 0; k++) {
      stepMatch(t, [NONE, NONE]);
      if (shockDangerous(trap2)) first = k;
    }
    expect(first).toBe(29 + 75);
    expect(trap.kind).toBe('shock');
  });

  it('ENV-TR-04: boss trap removed when triggered, destroyed, expired or when the boss is defeated', () => {
    // Destroyed by a shield (SH-04), in any state.
    const s = testMatch();
    place(s, 0, 3, 2, SOUTH);
    put(s, 'spike', 3, 3, { boss: true, warn: 30, life: 300 });
    const ev = tap(s, 0, 'shield');
    expect(ofType(ev, 'trap-destroyed')).toHaveLength(1);
    expect(s.env).toHaveLength(0);
    // Removed on the flip tick; maze traps stay.
    const t = testMatch();
    put(t, 'spike', 3, 3, { boss: true, warn: 0, life: 300 });
    const maze = put(t, 'snare', 10, 10);
    t.boss.hp = 1;
    place(t, 0, 7, 5, SOUTH);
    tap(t, 0, 'bomb');
    expect(t.phase).toBe('escape');
    expect(t.env).toEqual([maze]);
  });

  it('ENV-TR-06: shield on a trap destroys it and keeps 90 ticks', () => {
    const s = testMatch();
    place(s, 0, 3, 2, SOUTH);
    put(s, 'shock', 3, 3);
    tap(s, 0, 'shield');
    expect(s.env).toHaveLength(0);
    expect(s.shields).toHaveLength(1);
    expect(s.shields[0]!.ticksLeft).toBe(90); // placed on the release tick, its first of 90
  });

  it('TR-02: a player mid-step touches the destination only when entering it', () => {
    const s = testMatch();
    place(s, 0, 3, 2, SOUTH);
    put(s, 'spike', 3, 3);
    const ev = run(s, 4, south);
    expect(ofType(ev, 'trap-triggered')).toHaveLength(0);
    expect(ofType(run(s, 1, south), 'trap-triggered')).toHaveLength(1);
  });
});
