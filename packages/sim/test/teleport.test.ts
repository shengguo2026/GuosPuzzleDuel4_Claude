import { describe, expect, it } from 'vitest';
import { EAST, NORTH, SOUTH, WEST } from '../src/index.js';
import { input, ofType, padPair, place, put, run, testMatch } from './helpers.js';

const NONE = input();

describe('teleporters (WP 2b.3, ENV-TP-01 to ENV-TP-05, TP-01 to TP-08)', () => {
  it('ENV-TP-01: A→B and B→A for both players, no energy cost', () => {
    for (const slot of [0, 1] as const) {
      const s = testMatch();
      padPair(s, [3, 3], [11, 11]);
      place(s, slot, 3, 2);
      place(s, slot === 0 ? 1 : 0, 1, 13);
      const held = (d: number) => {
        const pair = [NONE, NONE];
        pair[slot] = input({ held: d as 0 });
        return pair as [typeof NONE, typeof NONE];
      };
      const ev = run(s, 5, () => held(SOUTH));
      const p = s.players[slot];
      expect(ofType(ev, 'teleported').map((e) => [e.slot, e.tick, e.x, e.y])).toEqual([
        [slot, 4, 11, 11],
      ]);
      expect([p.x, p.y, p.attack, p.defense]).toEqual([11, 11, 1, 1]);
      // Back: off the pad, wait out the cooldown, on again.
      run(s, 45, (t) => (t < 5 ? held(EAST) : t >= 35 && t < 40 ? held(WEST) : [NONE, NONE]));
      expect([p.x, p.y]).toEqual([3, 3]);
    }
  });

  it('ENV-TP-02: blocked destination waits on the pad, transports on the first free tick', () => {
    const s = testMatch();
    padPair(s, [3, 3], [11, 11]);
    place(s, 0, 3, 2);
    place(s, 1, 11, 11);
    run(s, 20, (t) => [input({ held: t < 5 ? SOUTH : -1 }), NONE]);
    expect([s.players[0].x, s.players[0].y]).toEqual([3, 3]);
    expect(s.players[0].pending).toBeGreaterThan(0);
    // P2 steps off: P1 lands on the tick P2 enters the next tile.
    const ev = run(s, 5, () => [NONE, input({ held: EAST })]);
    expect(ofType(ev, 'teleported').map((e) => e.tick)).toEqual([24]);
    expect([s.players[0].x, s.players[0].y]).toEqual([11, 11]);
    // A shield or a closed gate on the destination blocks it too.
    const t = testMatch();
    padPair(t, [3, 3], [11, 11]);
    put(t, 'gate', 11, 11, { open: false, cycle: 0, closedTicks: 50 });
    place(t, 0, 3, 3);
    t.players[0].pending = t.env[0]!.id;
    run(t, 10);
    expect(t.players[0].x).toBe(3);
  });

  it('TP-03: leaving the pad by an own step cancels the pending teleport', () => {
    const s = testMatch();
    padPair(s, [3, 3], [11, 11]);
    place(s, 0, 3, 2);
    place(s, 1, 11, 11);
    run(s, 5, () => [input({ held: SOUTH }), NONE]);
    run(s, 5, () => [input({ held: WEST }), NONE]);
    expect(s.players[0].pending).toBe(-1);
    run(s, 5, () => [NONE, input({ held: EAST })]);
    expect([s.players[0].x, s.players[0].y]).toEqual([2, 3]);
  });

  it('ENV-TP-03: 30-tick cooldown, no A↔B oscillation in a long run', () => {
    const s = testMatch();
    padPair(s, [3, 3], [11, 11]);
    place(s, 0, 3, 2);
    run(s, 5, () => [input({ held: SOUTH }), NONE]); // teleported on tick 4
    expect(s.players[0].tpCooldown).toBe(29);
    // Off and back on within the cooldown: no transport.
    run(s, 10, (t) => [input({ held: t < 5 ? EAST : WEST }), NONE]);
    expect([s.players[0].x, s.players[0].y]).toEqual([11, 11]);
    // Standing on the landing pad never transports back (landing does not make pending).
    const ev = run(s, 2000);
    expect(ofType(ev, 'teleported')).toHaveLength(0);
  });

  it('ENV-TP-05: simultaneous entry swaps; same-destination guard moves nobody', () => {
    const s = testMatch();
    padPair(s, [3, 3], [11, 11]);
    place(s, 0, 3, 2);
    place(s, 1, 11, 12);
    const ev = run(s, 5, () => [input({ held: SOUTH }), input({ held: NORTH })]);
    expect(ofType(ev, 'teleported')).toHaveLength(2);
    expect([s.players[0].x, s.players[0].y, s.players[1].x, s.players[1].y]).toEqual([
      11, 11, 3, 3,
    ]);
    // Malformed content: two pads lead to the same tile.
    const t = testMatch();
    const [a, b] = padPair(t, [3, 3], [11, 11]);
    const c = put(t, 'pad', 3, 11, { link: b.id });
    expect(a.link).toBe(b.id);
    place(t, 0, 3, 2);
    place(t, 1, 3, 12);
    const ev2 = run(t, 5, () => [input({ held: SOUTH }), input({ held: NORTH })]);
    expect(ofType(ev2, 'teleported')).toHaveLength(0);
    expect(c.kind).toBe('pad');
  });

  it('TP-08: bombs are not teleported (pads are floor for projectiles)', () => {
    const s = testMatch();
    padPair(s, [3, 4], [11, 11]);
    place(s, 0, 3, 2, SOUTH);
    s.players[0].attack = 1;
    run(s, 1, () => [input({ bomb: true }), NONE]);
    run(s, 9);
    expect(s.bombs[0]).toMatchObject({ x: 3, y: 5 });
  });
});
