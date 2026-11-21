import { describe, expect, it } from 'vitest';
import {
  EAST,
  NORTH,
  SOUTH,
  createMatch,
  leaveMatch,
  resolveOutcome,
  stepMatch,
  timerTicksFor,
  type MatchState,
} from '../src/index.js';
import { CONFIG, input, ofType, openMaze, place, run, testMatch } from './helpers.js';

const NONE = input();

/** Both players one step from their exits, holding their tokens, in the Escape Phase. */
function bothNearExits(): MatchState {
  const s = testMatch();
  s.phase = 'escape';
  s.boss.hp = 0;
  s.boss.state = 'defeated';
  s.tokens = [
    { x: 6, y: 7, taken: true },
    { x: 8, y: 7, taken: true },
  ];
  s.players[0].hasToken = true;
  s.players[1].hasToken = true;
  place(s, 0, 7, 13);
  place(s, 1, 7, 1);
  return s;
}

/** Puts a boss ball so that it enters the player's tile on the next tick. */
function ballInto(s: MatchState, slot: 0 | 1) {
  const p = s.players[slot];
  s.balls.push({ id: 900 + slot, x: p.x - 1, y: p.y, dir: EAST, age: 3 });
}

describe('outcomes (WP 2a.8, G-003, G-010, G-011, OC-01 to OC-05)', () => {
  it('G-010 / OC-01: every cell of the in-tick matrix', () => {
    const cells: [string, string, number, string][] = [
      ['-', '-', -2, ''],
      ['-', 'E', 1, 'escape'],
      ['-', 'K', 0, 'knockout'],
      ['E', '-', 0, 'escape'],
      ['E', 'E', -1, 'escape'],
      ['E', 'K', 0, 'escape'],
      ['K', '-', 1, 'knockout'],
      ['K', 'E', 1, 'escape'],
      ['K', 'K', -1, 'knockout'],
    ];
    for (const [a, b, winner, reason] of cells) {
      const r = resolveOutcome(a, b, false);
      if (winner === -2) expect(r).toBeNull();
      else expect(r).toEqual({ winner, reason });
      // OC-03: a result on the timer tick stands; only '-','-' becomes a draw.
      const rt = resolveOutcome(a, b, true);
      if (winner === -2) expect(rt).toEqual({ winner: -1, reason: 'timer' });
      else expect(rt).toEqual({ winner, reason });
    }
  });

  it('G-010: symmetric — swapping P1 and P2 swaps the winner', () => {
    for (const [a, b] of [
      ['-', 'E'],
      ['E', 'K'],
      ['K', '-'],
    ]) {
      const r1 = resolveOutcome(a!, b!, false)!;
      const r2 = resolveOutcome(b!, a!, false)!;
      expect(r2.winner).toBe(r1.winner === -1 ? -1 : 1 - r1.winner);
    }
  });

  it('G-011: both escape on one tick = draw', () => {
    const s = bothNearExits();
    run(s, 5, () => [input({ held: SOUTH }), input({ held: NORTH })]);
    expect(s.outcome).toMatchObject({ winner: -1, reason: 'escape', states: ['E', 'E'] });
  });

  it('G-003 / G-011: both knocked out on one tick = draw; a KO beats an escape on the same tick', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    place(s, 1, 11, 11);
    s.players[0].life = 1;
    s.players[1].life = 1;
    ballInto(s, 0);
    ballInto(s, 1);
    run(s, 1);
    expect(s.outcome).toMatchObject({ winner: -1, reason: 'knockout', states: ['K', 'K'] });

    // P1 escapes on the tick P2 is knocked out: P1 wins.
    const t = bothNearExits();
    t.players[1].life = 1;
    t.players[1].hasToken = false;
    place(t, 1, 3, 3);
    run(t, 4, () => [input({ held: SOUTH }), NONE]);
    ballInto(t, 1);
    run(t, 1, () => [input({ held: SOUTH }), NONE]);
    expect(t.outcome).toMatchObject({ winner: 0, states: ['E', 'K'] });

    // A player who reaches the exit on the tick they are knocked out counts as K.
    const u = bothNearExits();
    u.players[0].life = 1;
    run(u, 4, () => [input({ held: SOUTH }), NONE]);
    u.balls.push({ id: 7, x: 6, y: 14, dir: EAST, age: 3 }); // enters (7,14) next tick
    run(u, 1, () => [input({ held: SOUTH }), NONE]);
    expect(u.outcome).toMatchObject({ winner: 1, reason: 'knockout', states: ['K', '-'] });
  });

  it('TIME-01 / FL-05: one match timer per size; expiry with no other result is a draw', () => {
    expect(timerTicksFor('small')).toBe(10800);
    expect(timerTicksFor('medium')).toBe(18000);
    expect(timerTicksFor('large')).toBe(27000);
    const s = testMatch();
    expect(s.timer).toBe(10800);
    s.timer = 2;
    run(s, 1);
    expect(s.outcome).toBeNull();
    run(s, 1);
    expect(s.outcome).toMatchObject({ winner: -1, reason: 'timer' });
    // OC-03: an escape on the expiry tick stands.
    const t = bothNearExits();
    t.timer = 5;
    run(t, 5, () => [input({ held: SOUTH }), NONE]);
    expect(t.outcome).toMatchObject({ winner: 0, reason: 'escape' });
  });

  it('TIME-01: Unlimited Time has no timer and never times out', () => {
    const s = createMatch({ ...CONFIG, unlimitedTime: true }, openMaze());
    s.boss.timer = 1_000_000;
    expect(s.timer).toBe(-1);
    run(s, 12000);
    expect(s.outcome).toBeNull();
  });

  it('TIME-05: urgency events at 2 min, 1 min, 30 s and 10 s remaining, once each', () => {
    const s = testMatch();
    s.boss.timer = 1_000_000;
    const ev = run(s, 10800);
    expect(ofType(ev, 'urgency').map((e) => e.ticksLeft)).toEqual([3600, 1800, 900, 300]);
    const u = createMatch({ ...CONFIG, unlimitedTime: true }, openMaze());
    u.boss.timer = 1_000_000;
    expect(ofType(run(u, 10800), 'urgency')).toHaveLength(0);
  });

  it('OC-04: Leave by one player = forfeit win for the other; both on one tick = neutral draw', () => {
    const s = testMatch();
    run(s, 10);
    expect(leaveMatch(s, [1])).toMatchObject({ winner: 0, reason: 'forfeit' });
    const t = testMatch();
    expect(leaveMatch(t, [0, 1])).toMatchObject({ winner: -1, reason: 'both-left' });
  });

  it('INV-01 / SIM-02: no ticks run after the match is over', () => {
    const s = testMatch();
    leaveMatch(s, [0]);
    const tick = s.tick;
    expect(stepMatch(s, [input({ held: SOUTH }), NONE])).toEqual([]);
    expect(s.tick).toBe(tick);
    expect(s.players[0].y).toBe(0);
  });

  it('OC-05: the outcome is committed once and never changes', () => {
    const s = bothNearExits();
    run(s, 5, () => [input({ held: SOUTH }), NONE]);
    const first = JSON.stringify(s.outcome);
    run(s, 10, () => [NONE, input({ held: NORTH })]);
    leaveMatch(s, [0]);
    expect(JSON.stringify(s.outcome)).toBe(first);
  });
});
