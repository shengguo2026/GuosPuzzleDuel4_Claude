import { describe, expect, it } from 'vitest';
import { SOUTH, passable, stepMatch } from '../src/index.js';
import { input, ofType, place, put, run, testMatch } from './helpers.js';

const NONE = input();

function superBomb(s: ReturnType<typeof testMatch>) {
  s.players[0].attack = 3;
  for (let t = 0; t < 61; t++) stepMatch(s, [input({ bomb: true }), NONE]);
  return run(s, 10);
}

describe('boss walls and timed gates vs bombs (WP 2b.6, 2b.8, ENV-WA-03, ENV-WA-04, WL-03)', () => {
  it('ENV-WA-03: boss wall expires at 240 ticks or breaks to a Super Bomb; revision increments', () => {
    const s = testMatch();
    const wall = put(s, 'bossWall', 3, 3, { boss: true, life: 240 });
    expect(passable(s, 3, 3)).toBe(false);
    const rev = s.revision;
    const ev = run(s, 240);
    expect(ofType(ev, 'boss-wall').map((e) => [e.tick, e.raised])).toEqual([[239, false]]);
    expect(s.env).not.toContain(wall);
    expect(s.revision).toBe(rev + 1);
    expect(passable(s, 3, 3)).toBe(true);

    const t = testMatch();
    const w2 = put(t, 'bossWall', 3, 3, { boss: true, life: 240 });
    place(t, 0, 3, 1, SOUTH);
    const ev2 = superBomb(t);
    expect(ofType(ev2, 'boss-wall')).toHaveLength(1);
    expect(t.env).not.toContain(w2);
    // A normal bomb does nothing to it.
    const u = testMatch();
    const w3 = put(u, 'bossWall', 3, 3, { boss: true, life: 240 });
    place(u, 0, 3, 1, SOUTH);
    run(u, 1, () => [input({ bomb: true }), NONE]);
    run(u, 5);
    expect(u.env).toContain(w3);
  });

  it('ENV-WA-03: a boss wall blocks players, bombs and balls', () => {
    const s = testMatch();
    put(s, 'bossWall', 3, 3, { boss: true, life: 240 });
    place(s, 0, 3, 1, SOUTH);
    run(s, 20, () => [input({ held: SOUTH }), NONE]);
    expect(s.players[0].y).toBe(2);
    const ev = run(s, 4, (t) => [input({ bomb: t === 0 }), NONE]);
    expect(ofType(ev, 'blast')[0]).toMatchObject({ x: 3, y: 2 });
  });

  it('ENV-WA-04: Super Bomb on a timed gate has no effect', () => {
    const s = testMatch();
    const gate = put(s, 'gate', 3, 3, { open: false, closedTicks: 1000 });
    place(s, 0, 3, 1, SOUTH);
    const ev = superBomb(s);
    expect(ofType(ev, 'blast')).toHaveLength(1);
    expect(s.env).toContain(gate);
    expect(gate.open).toBe(false);
  });
});
