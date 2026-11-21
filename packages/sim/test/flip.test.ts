import { describe, expect, it } from 'vitest';
import {
  EAST,
  NORTH,
  SOUTH,
  Tile,
  checkRoutes,
  createMatch,
  generateMaze,
  type MatchState,
} from '../src/index.js';
import { CONFIG, input, ofType, place, run, tap, testMatch } from './helpers.js';

const NONE = input();

/** Boss at 1 HP and P1 next to the core, facing it with 1 Attack. */
function lastHit(s: MatchState) {
  s.boss.hp = 1;
  place(s, 0, 7, 5, SOUTH);
  s.players[0].attack = 1;
}

/** Puts the match into the Escape Phase by a real last hit. */
function toEscape(s: MatchState) {
  lastHit(s);
  tap(s, 0, 'bomb');
  expect(s.phase).toBe('escape');
}

describe('phase flip, tokens and escape (WP 2a.7, G-007 to G-009, FL-01 to FL-05)', () => {
  it('G-008 / FL-01: flip, token spawn and shortcut opening happen on one tick exactly once', () => {
    const maze = generateMaze(31, 'medium');
    const s = createMatch({ ...CONFIG, size: 'medium', seed: 31 }, maze);
    s.boss.timer = 1_000_000;
    s.boss.hp = 1;
    const { cx, cy } = maze;
    place(s, 0, cx, cy - 2, SOUTH);
    s.players[0].attack = 1;
    const rev = s.revision;
    const ev = tap(s, 0, 'bomb');
    const flipTick = ofType(ev, 'boss-damaged')[0]!.tick;
    expect(ofType(ev, 'phase-escape').map((e) => e.tick)).toEqual([flipTick]);
    expect(ofType(ev, 'tokens-spawned').map((e) => e.tick)).toEqual([flipTick]);
    expect(s.phase).toBe('escape');
    expect(s.boss.state).toBe('defeated');
    expect(s.revision).toBe(rev + 1);
    // ENV-WA-05: all shortcuts and the core are floor now.
    for (const i of maze.shortcuts) expect(s.tiles[i]).toBe(Tile.FLOOR);
    expect(s.tiles.includes(Tile.CORE)).toBe(false);
    expect(s.tokens).toEqual([
      { x: cx - 1, y: cy, taken: false },
      { x: cx + 1, y: cy, taken: false },
    ]);
    const later = run(s, 300);
    expect(ofType(later, 'phase-escape')).toHaveLength(0);
    expect(ofType(later, 'tokens-spawned')).toHaveLength(0);
  });

  it('ENV-WA-05: both exits stay reachable without the shortcuts', () => {
    for (let seed = 1; seed < 50; seed++) {
      const maze = generateMaze(seed, 'large');
      const sealed = new Uint8Array(maze.tiles);
      expect(checkRoutes(maze, sealed).ok).toBe(true);
    }
  });

  it('FL-01: boss balls and shockwaves are removed on the flip tick', () => {
    const s = testMatch();
    s.balls.push({ id: 99, x: 2, y: 2, dir: EAST, age: 0 });
    s.waves.push({ id: 98, radius: 3, maxRadius: 5, age: 2, reached: [] });
    toEscape(s);
    expect(s.balls).toHaveLength(0);
    expect(s.waves).toHaveLength(0);
  });

  it('OC-02: a knock-out on the tick of the last boss hit prevents the flip', () => {
    const s = testMatch();
    lastHit(s);
    place(s, 1, 3, 2);
    s.players[1].life = 1;
    // A ball that enters P2's tile on the tick P1's bomb lands (the release tick).
    s.balls.push({ id: 99, x: 2, y: 2, dir: EAST, age: 2 });
    const ev = tap(s, 0, 'bomb');
    expect(s.boss.hp).toBe(0);
    expect(ofType(ev, 'phase-escape')).toHaveLength(0);
    expect(s.outcome).toMatchObject({ winner: 0, reason: 'knockout' });
  });

  it('INV-03 / FL-02: the rival walking over a token has no effect; the owner picks it up', () => {
    const s = testMatch();
    toEscape(s);
    // P2 walks onto P1's token at (6,7), then P1 onto it.
    place(s, 1, 6, 9);
    run(s, 10, () => [NONE, input({ held: NORTH })]);
    expect([s.players[1].x, s.players[1].y]).toEqual([6, 7]);
    expect(s.tokens![0].taken).toBe(false);
    expect(s.players[1].hasToken).toBe(false);
    place(s, 0, 6, 6);
    const ev = run(s, 5, () => [input({ held: SOUTH }), NONE]);
    expect(ofType(ev, 'token-picked')).toEqual([expect.objectContaining({ slot: 0 })]);
    expect(s.players[0].hasToken).toBe(true);
  });

  it('G-009: no token, the wrong token or a blocked exit never wins', () => {
    const s = testMatch();
    toEscape(s);
    // P1 stands on its exit (South entrance) without the token.
    place(s, 0, 7, 13);
    run(s, 5, () => [input({ held: SOUTH }), NONE]);
    expect([s.players[0].x, s.players[0].y]).toEqual([7, 14]);
    expect(s.outcome).toBeNull();
    // P2 holds a token but stands on its own spawn (the South entrance): no win.
    place(s, 1, 7, 14);
    s.players[1].hasToken = true;
    run(s, 2);
    expect(s.outcome).toBeNull();
    // A shield on the exit tile blocks entering it.
    const t = testMatch();
    toEscape(t);
    t.players[0].hasToken = true;
    place(t, 1, 6, 14, EAST);
    tap(t, 1, 'shield'); // P2 shields (7,14)
    place(t, 0, 7, 13);
    run(t, 10, () => [input({ held: SOUTH }), NONE]);
    expect(t.players[0].y).toBe(13);
    expect(t.outcome).toBeNull();
  });

  it('FL-03: holding the own token on the own exit wins by escape', () => {
    const s = testMatch();
    toEscape(s);
    s.players[0].hasToken = true;
    place(s, 0, 7, 13);
    const ev = run(s, 5, () => [input({ held: SOUTH }), NONE]);
    expect(ofType(ev, 'escaped')).toHaveLength(1);
    expect(s.outcome).toMatchObject({ winner: 0, reason: 'escape', states: ['E', '-'] });
    expect(s.phase).toBe('over');
  });

  it('flip note: a player cannot escape on the flip tick (tokens appear at the end of step 6)', () => {
    const s = testMatch();
    lastHit(s);
    s.players[1].hasToken = false;
    const ev = tap(s, 0, 'bomb');
    expect(ofType(ev, 'token-picked')).toHaveLength(0);
  });
});
