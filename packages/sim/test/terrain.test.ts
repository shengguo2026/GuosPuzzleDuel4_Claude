import { describe, expect, it } from 'vitest';
import { EAST, NORTH, SOUTH, Tile, WEST, addEnv } from '../src/index.js';
import { input, place, put, run, runUntil, setTile, testMatch } from './helpers.js';

const NONE = input();

describe('terrain (WP 2b.4, ENV-TE-01 to ENV-TE-05, TE-01 to TE-06)', () => {
  it('ENV-TE-01: boost 90 ticks at 78 units/tick; refresh, no stacking', () => {
    const s = testMatch();
    place(s, 0, 2, 2);
    put(s, 'boost', 3, 2);
    run(s, 5, () => [input({ held: EAST }), NONE]); // enters the boost on tick 4
    const p = s.players[0];
    expect(p.boost).toBe(90);
    run(s, 1, () => [input({ held: EAST }), NONE]);
    expect(p.step).toMatchObject({ kind: 'own', progress: 78 });
    // 90 boosted ticks in total.
    let boosted = 1;
    while (p.boost > 0) {
      run(s, 1);
      boosted++;
    }
    expect(boosted).toBe(90);
    // Refresh: entering a boost while boosted sets it back to 90.
    const t = testMatch();
    place(t, 0, 2, 2);
    put(t, 'boost', 3, 2);
    t.players[0].boost = 20;
    runUntil(
      t,
      () => t.players[0].x === 3,
      10,
      () => [input({ held: EAST }), NONE],
    );
    expect(t.players[0].boost).toBe(90);
  });

  it('ENV-TE-02: ice slides to the first non-ice tile; no turning; slid tiles give no Attack', () => {
    const s = testMatch();
    place(s, 0, 2, 2);
    for (const x of [3, 4, 5]) put(s, 'ice', x, 2);
    // One tap East, then North held: the slide ignores it.
    run(s, 1, () => [input({ held: EAST, pressed: EAST }), NONE]);
    run(s, 19, () => [input({ held: NORTH }), NONE]);
    const p = s.players[0];
    expect([p.x, p.y]).toEqual([6, 2]);
    expect(p.voluntary).toBeLessThanOrEqual(5 * 60); // only the first, own step
    // A blocker ends the slide on the ice.
    const t = testMatch();
    place(t, 0, 2, 2);
    for (const x of [3, 4]) put(t, 'ice', x, 2);
    setTile(t, 5, 2, Tile.WALL);
    run(t, 1, () => [input({ held: EAST, pressed: EAST }), NONE]);
    run(t, 20);
    expect([t.players[0].x, t.players[0].y]).toEqual([4, 2]);
    // From there the next step is an own step in any direction.
    run(t, 5, () => [input({ held: SOUTH }), NONE]);
    expect([t.players[0].x, t.players[0].y]).toEqual([4, 3]);
  });

  it('TE-03: a tile turned to ice under a standing player does not start a slide', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    addEnv(s, 'ice', 3, 3);
    addEnv(s, 'ice', 4, 3);
    run(s, 20);
    expect([s.players[0].x, s.players[0].y]).toEqual([3, 3]);
  });

  it('TE-05: conveyor decision table (none, along, against, sideways)', () => {
    const at = () => {
      const s = testMatch();
      place(s, 0, 3, 10);
      put(s, 'conveyor', 3, 10, { dir: EAST });
      return s;
    };
    // none: pushed at 50 units/tick ⇒ 6 ticks, no Attack, not stationary.
    const a = at();
    run(a, 6);
    expect([a.players[0].x, a.players[0].voluntary, a.players[0].stationary]).toEqual([4, 0, 0]);
    // along: 110 units/tick ⇒ 3 ticks; Attack counts the own 60 per tick.
    const b = at();
    run(b, 3, () => [input({ held: EAST }), NONE]);
    expect([b.players[0].x, b.players[0].voluntary]).toEqual([4, 180]);
    // against: stays, no Attack, not stationary.
    const c = at();
    run(c, 30, () => [input({ held: WEST }), NONE]);
    expect([c.players[0].x, c.players[0].voluntary, c.players[0].stationary]).toEqual([3, 0, 0]);
    // sideways: an own step off the belt.
    const d = at();
    run(d, 5, () => [input({ held: NORTH }), NONE]);
    expect([d.players[0].x, d.players[0].y, d.players[0].voluntary]).toEqual([3, 9, 300]);
  });

  it('TE-05: a blocked push leaves the player in place (ineligible for Defense)', () => {
    const s = testMatch();
    place(s, 0, 3, 10);
    put(s, 'conveyor', 3, 10, { dir: EAST });
    setTile(s, 4, 10, Tile.WALL);
    run(s, 300);
    expect([s.players[0].x, s.players[0].defense, s.players[0].stationary]).toEqual([3, 1, 0]);
  });

  it('MV-04: boosted steps keep their carry (4, 4, 4, 3 ticks per tile)', () => {
    const s = testMatch();
    place(s, 0, 1, 1);
    s.players[0].boost = 200;
    const enters: number[] = [];
    let x = 1;
    run(s, 15, (t) => {
      if (s.players[0].x !== x) {
        x = s.players[0].x;
        enters.push(t);
      }
      return [input({ held: EAST }), NONE];
    });
    // Entering happens on ticks 3, 7, 11, 14 (tick index of the next sample is +1).
    expect(enters).toEqual([4, 8, 12, 15].slice(0, enters.length));
  });
});
