import { describe, expect, it } from 'vitest';
import { EAST, NORTH, SOUTH, Tile, WEST, stepMatch } from '../src/index.js';
import { input, place, run, setTile, tap, testMatch } from './helpers.js';

const NONE = input();

describe('movement (WP 2a.3, CTRL-04, MV-01 to MV-08)', () => {
  it('CTRL-04 / MV-02: an own step takes 5 ticks per tile (6 tiles/s)', () => {
    const s = testMatch();
    const south = input({ held: SOUTH });
    run(s, 4, () => [south, NONE]);
    expect([s.players[0].x, s.players[0].y]).toEqual([7, 0]);
    expect(s.players[0].step?.progress).toBe(240);
    run(s, 1, () => [south, NONE]);
    expect([s.players[0].x, s.players[0].y]).toEqual([7, 1]);
    run(s, 25, () => [south, NONE]);
    // 25 more ticks would be 5 tiles, but (7,6) is the boss core: it stops at y=5.
    expect(s.players[0].y).toBe(5);
  });

  it('MV-03: a committed step runs to completion; no reversal halfway', () => {
    const s = testMatch();
    place(s, 0, 2, 2);
    run(s, 2, () => [input({ held: EAST }), NONE]);
    expect(s.players[0].step?.dir).toBe(EAST);
    run(s, 3, () => [input({ held: WEST, pressed: WEST }), NONE]);
    expect([s.players[0].x, s.players[0].y]).toEqual([3, 2]);
    // The next decision takes the new direction.
    run(s, 5, () => [input({ held: WEST }), NONE]);
    expect(s.players[0].x).toBe(2);
  });

  it('MV-03 / MV-08: the destination is reserved, so no shield can go there', () => {
    const s = testMatch();
    place(s, 0, 2, 2);
    place(s, 1, 4, 2, WEST);
    s.players[1].defense = 3;
    run(s, 1, () => [input({ held: EAST }), NONE]);
    // P1 is stepping into (3,2); P2's shield target is (3,2).
    const events = tap(s, 1, 'shield');
    expect(events.some((e) => e.type === 'ability-rejected')).toBe(true);
    expect(s.shields).toHaveLength(0);
    expect(s.players[1].defense).toBe(3);
  });

  it('MV-08: players never block each other and may share a tile', () => {
    const s = testMatch();
    place(s, 0, 2, 2);
    place(s, 1, 3, 2);
    run(s, 5, () => [input({ held: EAST }), NONE]);
    expect([s.players[0].x, s.players[1].x]).toEqual([3, 3]);
  });

  it('MV-06: a turn pressed early is buffered for 8 ticks and taken at the junction', () => {
    const build = () => {
      const s = testMatch();
      // A corridor going South along x=2 with one opening to the East at y=5.
      for (let y = 1; y <= 9; y++) {
        setTile(s, 1, y, Tile.WALL);
        if (y !== 5) setTile(s, 3, y, Tile.WALL);
      }
      place(s, 0, 2, 1);
      return s;
    };
    // Pressed 6 ticks before arriving at (2,5): taken.
    const s = build();
    run(s, 15, () => [input({ held: SOUTH }), NONE]); // at (2,4) after 15 ticks
    expect(s.players[0].y).toBe(4);
    run(s, 1, () => [input({ held: SOUTH, pressed: EAST }), NONE]);
    run(s, 9, () => [input({ held: SOUTH }), NONE]);
    expect([s.players[0].x, s.players[0].y]).toEqual([3, 5]);

    // Pressed 11 ticks before: the request has expired; the player runs on South.
    const t = build();
    run(t, 9, () => [input({ held: SOUTH }), NONE]);
    run(t, 1, () => [input({ held: SOUTH, pressed: EAST }), NONE]);
    run(t, 15, () => [input({ held: SOUTH }), NONE]);
    expect(t.players[0].x).toBe(2);
    expect(t.players[0].y).toBeGreaterThan(5);
  });

  it('MV-07: facing turns to a pressed direction even when no step is possible', () => {
    const s = testMatch();
    place(s, 0, 7, 4, SOUTH);
    setTile(s, 8, 4, Tile.WALL);
    stepMatch(s, [input({ held: EAST, pressed: EAST }), NONE]);
    expect(s.players[0].facing).toBe(EAST);
    expect(s.players[0].step).toBeNull();
    // Facing also follows the direction the player moves.
    run(s, 1, () => [input({ held: NORTH }), NONE]);
    expect(s.players[0].facing).toBe(NORTH);
  });

  it('MV-08: walls, the boss core and shields are not passable', () => {
    const s = testMatch();
    place(s, 0, 7, 4);
    run(s, 10, () => [input({ held: SOUTH }), NONE]);
    expect(s.players[0].y).toBe(5); // core at y=6
    place(s, 0, 1, 1);
    run(s, 10, () => [input({ held: WEST }), NONE]);
    expect(s.players[0].x).toBe(1);
  });

  it('MV-10: initial facing is South for P1 and North for P2; spawns on the entrances', () => {
    const s = testMatch();
    expect(s.players[0]).toMatchObject({ x: 7, y: 0, facing: SOUTH });
    expect(s.players[1]).toMatchObject({ x: 7, y: 14, facing: NORTH });
  });
});
