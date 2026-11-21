import { describe, expect, it } from 'vitest';
import { NORTH, SOUTH, WEST } from '../src/index.js';
import { input, ofType, place, put, run, testMatch } from './helpers.js';

const NONE = input();
const enter = () => [input({ held: SOUTH }), NONE] as const;

describe('pickups (WP 2b.5, ENV-PU-01 to ENV-PU-04, PU-01 to PU-05)', () => {
  it('ENV-PU-01: Attack Orb +1, never above 3 (at cap it stays)', () => {
    const s = testMatch();
    place(s, 0, 3, 2);
    const orb = put(s, 'attackOrb', 3, 3);
    const ev = run(s, 5, enter);
    expect(ofType(ev, 'pickup').map((e) => [e.slot, e.kind])).toEqual([[0, 'attackOrb']]);
    expect(s.players[0].attack).toBe(2);
    expect(s.env).not.toContain(orb);
    const t = testMatch();
    place(t, 0, 3, 2);
    t.players[0].attack = 3;
    const full = put(t, 'attackOrb', 3, 3);
    run(t, 5, enter);
    expect(t.players[0].attack).toBe(3);
    expect(t.env).toContain(full); // PU-02: stays for later or for the rival
  });

  it('ENV-PU-02: Defense Orb +1, never above 3', () => {
    const s = testMatch();
    place(s, 0, 3, 2);
    s.players[0].defense = 2;
    put(s, 'defenseOrb', 3, 3);
    run(s, 5, enter);
    expect(s.players[0].defense).toBe(3);
    put(s, 'defenseOrb', 3, 4);
    run(s, 5, enter);
    expect(s.players[0].defense).toBe(3);
    expect(s.env).toHaveLength(1);
  });

  it('ENV-PU-03: Heart +1 Life, never above 3', () => {
    const s = testMatch();
    place(s, 0, 3, 2);
    s.players[0].life = 2;
    put(s, 'heart', 3, 3);
    run(s, 5, enter);
    expect(s.players[0].life).toBe(3);
    const t = testMatch();
    place(t, 0, 3, 2);
    put(t, 'heart', 3, 3);
    run(t, 5, enter);
    expect([t.players[0].life, t.env.length]).toEqual([3, 1]);
  });

  it('ENV-PU-04: one grant per pickup; same-tick entry grants nobody; no respawn', () => {
    const s = testMatch();
    place(s, 0, 3, 2);
    place(s, 1, 3, 4);
    const orb = put(s, 'attackOrb', 3, 3);
    run(s, 5, () => [input({ held: SOUTH }), input({ held: NORTH })]);
    expect([s.players[0].attack, s.players[1].attack]).toEqual([1, 1]);
    expect(s.env).toContain(orb);
    // Standing on it does not collect; the next to enter does.
    run(s, 20);
    expect(s.env).toContain(orb);
    run(s, 5, () => [input({ held: WEST }), NONE]);
    const ev = run(s, 5, () => [input({ held: 1 }), NONE]);
    expect(ofType(ev, 'pickup')).toHaveLength(1);
    expect([s.players[0].attack, s.players[1].attack]).toEqual([2, 1]);
    run(s, 3000);
    expect(s.env).toHaveLength(0);
  });
});
