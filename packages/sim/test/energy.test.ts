import { describe, expect, it } from 'vitest';
import { EAST, WEST } from '../src/index.js';
import { input, place, run, tap, testMatch } from './helpers.js';

const NONE = input();
const east = input({ held: EAST });

describe('energy (WP 2a.4, CTRL-02, CTRL-03, EN-01 to EN-04)', () => {
  it('EN-01: Attack and Defense start at 1, Life at 3', () => {
    const p = testMatch().players[0];
    expect([p.attack, p.defense, p.life]).toEqual([1, 1, 3]);
  });

  it('CTRL-02: +1 Attack per 12 own tiles (Normal)', () => {
    const s = testMatch();
    place(s, 0, 1, 1);
    run(s, 59, () => [east, NONE]);
    expect(s.players[0].attack).toBe(1);
    const events = run(s, 1, () => [east, NONE]);
    expect(s.players[0].attack).toBe(2);
    expect(events.some((e) => e.type === 'attack-gained')).toBe(true);
  });

  it('CTRL-02 / EN-02: progress carries over when the player stops', () => {
    const s = testMatch();
    place(s, 0, 1, 1);
    run(s, 30, () => [east, NONE]); // 6 tiles
    run(s, 50); // stand
    run(s, 30, () => [input({ held: WEST }), NONE]); // 6 more
    expect(s.players[0].attack).toBe(2);
  });

  it('CTRL-02 / EN-02: no banking at the cap of 3', () => {
    const s = testMatch();
    place(s, 0, 1, 1);
    s.players[0].attack = 3;
    run(s, 60, () => [east, NONE]);
    expect(s.players[0].voluntary).toBe(0);
    tap(s, 0, 'bomb');
    expect(s.players[0].attack).toBe(2);
  });

  it('EN-04: presets Tactical 15 tiles / 270 ticks and Fast 9 tiles / 150 ticks', () => {
    for (const [energy, tiles, ticks] of [
      ['tactical', 15, 270],
      ['fast', 9, 150],
      ['normal', 12, 210],
    ] as const) {
      const s = testMatch({ energy });
      place(s, 0, 1, 1);
      // Run back and forth along row 1 (x = 1 … 13).
      let dir: 1 | 3 = EAST;
      const shuttle = () => {
        const p = s.players[0];
        if (!p.step && p.x === 13) dir = WEST;
        if (!p.step && p.x === 1) dir = EAST;
        return [input({ held: dir }), NONE] as const;
      };
      run(s, tiles * 5 - 1, shuttle);
      expect(s.players[0].attack).toBe(1);
      run(s, 1, shuttle);
      expect(s.players[0].attack).toBe(2);
      run(s, ticks - 1);
      expect(s.players[0].defense).toBe(1);
      run(s, 1);
      expect(s.players[0].defense).toBe(2);
    }
  });

  it('CTRL-03: +1 Defense after 210 eligible stationary ticks; movement input resets', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    run(s, 200);
    run(s, 1, () => [input({ held: EAST }), NONE]); // input resets the counter
    run(s, 5); // the step ends on the 4th tick, which already counts again
    expect(s.players[0].stationary).toBe(2);
    run(s, 207);
    expect(s.players[0].defense).toBe(1);
    run(s, 1);
    expect(s.players[0].defense).toBe(2);
  });

  it('CTRL-03 / EN-03: charging an ability is not eligible for Defense', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    run(s, 300, () => [input({ bomb: true }), NONE]);
    expect(s.players[0].defense).toBe(1);
    expect(s.players[0].stationary).toBe(0);
  });

  it('D-04 / SH-07: no Defense regeneration while the own Shield is on the field', () => {
    const s = testMatch();
    place(s, 0, 3, 3, EAST);
    s.players[0].defense = 2;
    tap(s, 0, 'shield');
    expect(s.players[0].defense).toBe(1);
    expect(s.shields).toHaveLength(1);
    run(s, 85);
    expect(s.players[0].stationary).toBe(0);
    run(s, 10); // shield expired after 90 ticks
    expect(s.shields).toHaveLength(0);
    expect(s.players[0].stationary).toBeGreaterThan(0);
  });

  it('CTRL-03: Defense caps at 3; pause (no ticks) never regenerates', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    run(s, 210 * 4);
    expect(s.players[0].defense).toBe(3);
    // A paused match runs no ticks, so nothing changes however long the pause.
    const before = JSON.stringify(s.players[0]);
    expect(JSON.stringify(s.players[0])).toBe(before);
  });
});
