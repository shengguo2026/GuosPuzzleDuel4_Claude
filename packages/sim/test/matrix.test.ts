/**
 * GDD §17 cross-element interaction matrix (WP 2b.10, D-35): one test per row
 * of MECHANICS.md section 19.
 */
import { describe, expect, it } from 'vitest';
import {
  EAST,
  SOUTH,
  Tile,
  checkRoutes,
  createMatch,
  generateMaze,
  hashState,
  restoreMatch,
  snapshotMatch,
  stepMatch,
  viewMask,
  type MatchState,
} from '../src/index.js';
import {
  CONFIG,
  holdAndRelease,
  input,
  ofType,
  padPair,
  place,
  put,
  run,
  setTile,
  tap,
  testMatch,
} from './helpers.js';

const NONE = input();

function toEscape(s: MatchState) {
  s.boss.hp = 1;
  place(s, 0, 7, 5, SOUTH);
  s.players[0].attack = 1;
  tap(s, 0, 'bomb');
  expect(s.phase).toBe('escape');
}

describe('GDD §17 interaction matrix (WP 2b.10, ENV-TR-08, ENV-TE-05)', () => {
  it('§17 conveyor: only own share counts for Attack', () => {
    const s = testMatch();
    place(s, 0, 2, 10);
    for (let x = 2; x <= 5; x++) put(s, 'conveyor', x, 10, { dir: EAST });
    run(s, 9, () => [input({ held: EAST }), NONE]); // 3 tiles along the arrow at 110/tick
    expect(s.players[0].x).toBe(5);
    expect(s.players[0].voluntary).toBe(9 * 60);
    const t = testMatch();
    place(t, 0, 2, 10);
    for (let x = 2; x <= 5; x++) put(t, 'conveyor', x, 10, { dir: EAST });
    run(t, 18);
    expect([t.players[0].x, t.players[0].voluntary]).toEqual([5, 0]);
  });

  it('§17 teleport: no Attack; transport on the entry tick; cooldown', () => {
    const s = testMatch();
    padPair(s, [3, 3], [11, 11]);
    place(s, 0, 3, 2);
    const ev = run(s, 5, () => [input({ held: SOUTH }), NONE]);
    expect(ofType(ev, 'teleported')[0]!.tick).toBe(4);
    expect(s.players[0].voluntary).toBe(300); // the step onto the pad only
    expect(s.players[0].tpCooldown).toBe(29);
  });

  it('§17 snare: counter resets and restarts after snare', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    s.players[0].stationary = 150;
    put(s, 'snare', 3, 3);
    run(s, 1);
    expect(s.players[0].stationary).toBe(0);
    run(s, 60); // immobilized ticks are ineligible
    expect(s.players[0].stationary).toBe(0);
    run(s, 1);
    expect(s.players[0].stationary).toBe(1);
  });

  it('§17 shield: trap destroyed, shield keeps 90 ticks; multi-hit costs 1 Life', () => {
    const s = testMatch();
    place(s, 0, 3, 2, SOUTH);
    put(s, 'spike', 3, 3);
    tap(s, 0, 'shield');
    expect(s.env).toHaveLength(0);
    expect(s.shields[0]!.ticksLeft).toBe(90);
    // A ball and a spike on the same tick: one Life.
    const t = testMatch();
    place(t, 0, 7, 3);
    put(t, 'shock', 7, 3, { cycle: 100 });
    t.balls.push({ id: 900, x: 7, y: 4, dir: 0, age: 3 });
    const ev = run(t, 1);
    expect(ofType(ev, 'player-hit')).toHaveLength(1);
    expect(t.players[0].life).toBe(2);
  });

  it('§17 super bomb: destructible walls in footprint removed', () => {
    const s = testMatch();
    setTile(s, 3, 4, Tile.DESTRUCTIBLE);
    setTile(s, 2, 3, Tile.DESTRUCTIBLE);
    setTile(s, 4, 3, Tile.DESTRUCTIBLE);
    place(s, 0, 3, 1, SOUTH);
    s.players[0].attack = 3;
    holdAndRelease(s, 0, 'bomb', 61);
    run(s, 10);
    for (const [x, y] of [
      [3, 4],
      [2, 3],
      [4, 3],
    ] as const)
      expect(s.tiles[y * 15 + x]).toBe(Tile.FLOOR);
  });

  it('§17 super bomb: boss wall removed', () => {
    const s = testMatch();
    const wall = put(s, 'bossWall', 3, 3, { boss: true, life: 240 });
    place(s, 0, 3, 1, SOUTH);
    s.players[0].attack = 3;
    holdAndRelease(s, 0, 'bomb', 61);
    run(s, 10);
    expect(s.env).not.toContain(wall);
  });

  it('§17 super bomb: gate unchanged', () => {
    const s = testMatch();
    const gate = put(s, 'gate', 3, 3, { open: false, closedTicks: 1000 });
    place(s, 0, 3, 1, SOUTH);
    s.players[0].attack = 3;
    holdAndRelease(s, 0, 'bomb', 61);
    const ev = run(s, 10);
    expect(ofType(ev, 'blast')).toHaveLength(1);
    expect([s.tiles[3 * 15 + 3], gate.open, s.env.includes(gate)]).toEqual([
      Tile.GATE,
      false,
      true,
    ]);
  });

  it('§17 super bomb: blockade removed on blast tick', () => {
    const s = testMatch();
    toEscape(s);
    place(s, 1, 3, 4, SOUTH);
    s.players[1].defense = 3;
    holdAndRelease(s, 1, 'shield', 61); // Super Shield on (3,5)
    expect(s.shields[0]).toMatchObject({ isSuper: true, x: 3, y: 5 });
    place(s, 0, 3, 1, SOUTH);
    place(s, 1, 10, 10);
    s.players[0].attack = 3;
    holdAndRelease(s, 0, 'bomb', 61);
    const ev = run(s, 12);
    const removed = ofType(ev, 'shield-removed');
    expect(removed.map((e) => e.broken)).toEqual([true]);
    expect(removed[0]!.tick).toBe(ofType(ev, 'blast')[0]!.tick);
  });

  it('§17 teleport: wait on pad until free', () => {
    const s = testMatch();
    toEscape(s);
    // The destination pad is the exit tile's neighbour, occupied by the rival.
    padPair(s, [3, 3], [7, 13]);
    place(s, 0, 3, 2);
    place(s, 1, 7, 13);
    run(s, 30, (t) => [input({ held: t < 5 ? SOUTH : -1 }), NONE]);
    expect([s.players[0].x, s.players[0].y]).toEqual([3, 3]);
    const ev = run(s, 6, () => [NONE, input({ held: EAST })]);
    expect(ofType(ev, 'teleported')).toHaveLength(1);
    expect([s.players[0].x, s.players[0].y]).toEqual([7, 13]);
  });

  it('§17 gate: pending close until clear', () => {
    const s = testMatch();
    const gate = put(s, 'gate', 3, 3);
    place(s, 0, 3, 3);
    run(s, 150);
    expect([gate.open, gate.pending]).toEqual([true, true]);
    run(s, 5, () => [input({ held: EAST }), NONE]);
    expect(gate.open).toBe(false);
  });

  it('§17 visibility: warnings always shown', () => {
    // Darkness hides tiles, never the telegraph data the renderer draws on top (VI-04).
    const s = createMatch({ ...CONFIG, bossTier: 'ultimate' }, generateMaze(4, 'small'));
    s.darkness = 100;
    const shock = put(s, 'shock', 1, 1, { cycle: 65 });
    const mask = viewMask(s, [0, 1])!;
    expect(mask[1 * s.maze.w + 1]).toBe(0);
    expect(s.env).toContain(shock); // the state still carries the warning for the view
  });

  it('§17 flip: boss hazards cleared', () => {
    const s = testMatch();
    put(s, 'spike', 2, 2, { boss: true, warn: 0, life: 200 });
    put(s, 'bossWall', 12, 2, { boss: true, life: 200 });
    put(s, 'ice', 2, 12, { boss: true, life: 100 });
    s.darkness = 50;
    toEscape(s);
    expect([s.env.length, s.darkness]).toEqual([0, 0]);
  });

  it('§17 flip: shortcuts open, routes valid without them', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const maze = generateMaze(seed, 'medium');
      expect(checkRoutes(maze).ok).toBe(true);
      const s = createMatch({ ...CONFIG, seed, size: 'medium' }, maze);
      s.boss.hp = 0;
      const ev = run(s, 1);
      expect(ofType(ev, 'phase-escape')).toHaveLength(1);
      for (const i of maze.shortcuts) expect(s.tiles[i]).toBe(Tile.FLOOR);
    }
  });

  it('§17 pickup: same-tick entry grants nobody', () => {
    const s = testMatch();
    place(s, 0, 3, 2);
    place(s, 1, 3, 4);
    put(s, 'heart', 3, 3);
    s.players[0].life = 1;
    s.players[1].life = 1;
    run(s, 5, () => [input({ held: SOUTH }), input({ held: 0 })]);
    expect([s.players[0].life, s.players[1].life, s.env.length]).toEqual([1, 1, 1]);
  });

  it('§17 flip: two tokens, once, same tick', () => {
    const s = testMatch();
    s.boss.hp = 1;
    place(s, 0, 7, 5, SOUTH);
    const ev = [...tap(s, 0, 'bomb'), ...run(s, 100)];
    expect(ofType(ev, 'tokens-spawned')).toHaveLength(1);
    expect(ofType(ev, 'tokens-spawned')[0]!.tick).toBe(ofType(ev, 'phase-escape')[0]!.tick);
    expect(s.tokens).toHaveLength(2);
  });

  it('§17 reconnect: snapshot restores environment; nothing replayed', () => {
    const s = createMatch({ seed: 77, size: 'large', bossTier: 'ultimate', energy: 'normal' });
    s.players.forEach((p) => (p.life = 50));
    run(s, 1200, (t) => [
      input({ held: ((t >> 4) % 4) as 0 }),
      input({ held: ((t >> 5) % 4) as 0 }),
    ]);
    const pickupsBefore = s.env.filter((e) => e.kind.endsWith('Orb') || e.kind === 'heart').length;
    const r = restoreMatch(JSON.parse(JSON.stringify(snapshotMatch(s))));
    expect(r.revision).toBe(s.revision);
    expect(r.env.filter((e) => e.kind.endsWith('Orb') || e.kind === 'heart')).toHaveLength(
      pickupsBefore,
    );
    expect(r.events).toEqual([]);
    for (let t = 0; t < 300; t++) {
      stepMatch(s, [NONE, NONE]);
      stepMatch(r, [NONE, NONE]);
    }
    expect(hashState(r)).toBe(hashState(s));
  });

  it('ENV-TR-08: trap vs teleport landing, conveyor push, same-tick damage', () => {
    // A conveyor push onto a spike triggers it on entry.
    const s = testMatch();
    place(s, 0, 3, 10);
    put(s, 'conveyor', 3, 10, { dir: EAST });
    put(s, 'spike', 4, 10);
    const ev = run(s, 6);
    expect(ofType(ev, 'trap-triggered').map((e) => e.tick)).toEqual([5]);
    // Landing by teleport counts as entering (TP-07).
    const t = testMatch();
    padPair(t, [3, 3], [11, 11]);
    put(t, 'snare', 11, 11);
    place(t, 0, 3, 2);
    const ev2 = run(t, 5, () => [input({ held: SOUTH }), NONE]);
    // The snare on the destination blocks the transport (TP-02 "no snare trap").
    expect(ofType(ev2, 'teleported')).toHaveLength(0);
    expect(ofType(ev2, 'trap-triggered')).toHaveLength(0);
  });

  it('ENV-TE-05: ice/conveyor/boost/teleport priority table rows', () => {
    // Ice slide beats own input; a boost changes only own speed (not the slide).
    const s = testMatch();
    place(s, 0, 2, 2);
    put(s, 'boost', 3, 2);
    put(s, 'ice', 4, 2);
    run(s, 9, () => [input({ held: EAST }), NONE]); // boost on tick 4, ice on tick 8
    run(s, 1, () => [input({ held: SOUTH }), NONE]);
    const step = s.players[0].step!;
    expect(step).toMatchObject({ kind: 'ice', dir: EAST });
    const before = step.progress;
    run(s, 1, () => [input({ held: SOUTH }), NONE]);
    expect(s.players[0].step!.progress - before).toBe(60); // slide speed, not 78
    // Teleport beats everything: an own step onto a pad transports on that tick.
    const t = testMatch();
    padPair(t, [4, 2], [11, 11]);
    put(t, 'conveyor', 11, 11, { dir: EAST });
    place(t, 0, 3, 2);
    run(t, 5, () => [input({ held: EAST }), NONE]);
    expect([t.players[0].x, t.players[0].y]).toEqual([11, 11]);
    // Conveyor push beats no input; own input sideways beats the push.
    const u = testMatch();
    place(u, 0, 3, 10);
    put(u, 'conveyor', 3, 10, { dir: EAST });
    run(u, 1, () => [input({ held: SOUTH }), NONE]);
    expect(u.players[0].step).toMatchObject({ kind: 'own', dir: SOUTH });
  });
});
