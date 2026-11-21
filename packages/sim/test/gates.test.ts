import { describe, expect, it } from 'vitest';
import {
  EAST,
  SOUTH,
  checkRoutes,
  createMatch,
  gateWarning,
  generateMaze,
  passable,
  stepMatch,
} from '../src/index.js';
import { CONFIG, input, ofType, place, put, run, testMatch } from './helpers.js';

const NONE = input();

describe('timed gates (WP 2b.6, ENV-GA-01 to ENV-GA-04, GA-01 to GA-06)', () => {
  it('ENV-GA-01: 120 open / 90 closed; the gate event matches passability', () => {
    const s = testMatch();
    put(s, 'gate', 3, 3);
    const open: boolean[] = [];
    const ev = run(s, 420, () => {
      open.push(passable(s, 3, 3));
      return [NONE, NONE];
    });
    expect(ofType(ev, 'gate').map((e) => [e.tick, e.open])).toEqual([
      [119, false],
      [209, true],
      [329, false],
      [419, true],
    ]);
    // Seen by step decisions: 120 ticks open, then 90 closed.
    expect(open.slice(0, 120).every(Boolean)).toBe(true);
    expect(open.slice(120, 210).some(Boolean)).toBe(false);
    expect(open[210]).toBe(true);
  });

  it('ENV-GA-02: 30-tick warning; closed gate blocks players and bombs; bombs never destroy it', () => {
    const s = testMatch();
    const gate = put(s, 'gate', 3, 3);
    const warn: number[] = [];
    run(s, 125, (t) => {
      if (gateWarning(gate)) warn.push(t);
      return [NONE, NONE];
    });
    expect(warn[0]).toBe(90);
    expect(gate.open).toBe(false);
    // A player cannot step in; a Super Bomb explodes in front and leaves it.
    place(s, 0, 3, 1, SOUTH);
    s.players[0].attack = 3;
    run(s, 10, () => [input({ held: SOUTH }), NONE]);
    expect(s.players[0].y).toBe(2);
    for (let t = 0; t < 61; t++) stepMatch(s, [input({ bomb: true }), NONE]);
    const ev = run(s, 2);
    const blast = ofType(ev, 'blast')[0]!;
    expect([blast.x, blast.y, blast.isSuper]).toEqual([3, 2, true]);
    expect(s.env).toContain(gate);
    expect(gate.open).toBe(false);
  });

  it('ENV-GA-03: occupied or reserved gate stays open until clear; the cycle is delayed', () => {
    const s = testMatch();
    const gate = put(s, 'gate', 3, 3);
    place(s, 0, 3, 3);
    run(s, 200);
    expect(gate.open).toBe(true);
    expect(gate.pending).toBe(true);
    // Leaves: closes on the first tick the tile is free (P1 enters (4,3) on tick 4).
    const ev = run(s, 5, () => [input({ held: EAST }), NONE]);
    expect(ofType(ev, 'gate').map((e) => [e.tick, e.open])).toEqual([[204, false]]);
    // The closed window starts then: 90 ticks.
    const reopen = run(s, 95);
    expect(ofType(reopen, 'gate').map((e) => e.tick)).toEqual([294]);

    // GA-06: a step into a gate that is open at commit reserves it.
    const t = testMatch();
    const g2 = put(t, 'gate', 3, 3, { cycle: 117 });
    place(t, 0, 3, 2);
    run(t, 5, () => [input({ held: SOUTH }), NONE]);
    expect([t.players[0].x, t.players[0].y, g2.open]).toEqual([3, 3, true]);
  });

  it('ENV-GA-04: 100 000-tick run never seals an exit; closed ≤ 150 ticks', () => {
    let seed = 1;
    let maze = generateMaze(seed, 'large');
    while (!maze.env.some((e) => e.kind === 'gate')) maze = generateMaze(++seed, 'large');
    const s = createMatch({ ...CONFIG, size: 'large', seed, unlimitedTime: true }, maze);
    s.boss.timer = 1e9;
    const gates = s.env.filter((e) => e.kind === 'gate');
    const closedRun = gates.map(() => 0);
    let longest = 0;
    for (let t = 0; t < 100_000; t++) {
      stepMatch(s, [NONE, NONE]);
      gates.forEach((g, k) => {
        closedRun[k] = g.open ? 0 : closedRun[k]! + 1;
        longest = Math.max(longest, closedRun[k]!);
      });
      if (t % 5000 === 0) expect(checkRoutes(s.maze, s.tiles, s.env).ok).toBe(true);
    }
    expect(longest).toBeLessThanOrEqual(150);
    expect(longest).toBe(90);
  }, 30_000);
});
