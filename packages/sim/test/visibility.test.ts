import { describe, expect, it } from 'vitest';
import { viewMask, viewRadius, visibleMask } from '../src/index.js';
import { place, put, run, testMatch } from './helpers.js';

const count = (m: Uint8Array | null) => (m ? m.reduce((n, v) => n + v, 0) : -1);

describe('visibility (WP 2b.7, ENV-VI-01 to ENV-VI-04, VI-01 to VI-05)', () => {
  it('ENV-VI-01: fog mask radius 2 per player; outside fog the view is normal', () => {
    const s = testMatch();
    for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) put(s, 'fog', x, y);
    place(s, 0, 3, 3);
    place(s, 1, 10, 10);
    expect(viewRadius(s, 0)).toBe(2);
    expect(viewRadius(s, 1)).toBe(-1);
    const m = visibleMask(s, 0)!;
    expect(count(m)).toBe(13); // dx² + dy² ≤ 4
    expect(m[3 * 15 + 5]).toBe(1);
    expect(m[5 * 15 + 5]).toBe(0);
    expect(visibleMask(s, 1)).toBeNull();
  });

  it('ENV-VI-02: darkness 120 ticks, radius 3 for every player', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    place(s, 1, 11, 11);
    s.darkness = 120;
    expect(viewRadius(s, 0)).toBe(3);
    expect(count(visibleMask(s, 0))).toBe(29); // dx² + dy² ≤ 9
    run(s, 119);
    expect(s.darkness).toBe(1);
    run(s, 1);
    expect(viewMask(s, [0, 1])).toBeNull();
  });

  it('ENV-VI-04: shared screen shows the union; WiFi shows own view', () => {
    const s = testMatch();
    place(s, 0, 3, 3);
    place(s, 1, 11, 11);
    s.darkness = 10;
    const own = viewMask(s, [0])!;
    const union = viewMask(s, [0, 1])!;
    expect(count(own)).toBe(29);
    expect(count(union)).toBe(58);
    expect(own[11 * 15 + 11]).toBe(0);
    expect(union[11 * 15 + 11]).toBe(1);
    // One player outside fog and darkness sees everything, so the union is everything.
    s.darkness = 0;
    put(s, 'fog', 3, 3);
    expect(viewMask(s, [0])).not.toBeNull();
    expect(viewMask(s, [0, 1])).toBeNull();
  });

  it('VI-01: visibility never changes the simulation', () => {
    const a = testMatch({}, true);
    const b = testMatch({}, true);
    for (let y = 1; y <= 13; y++) for (let x = 1; x <= 5; x++) put(a, 'fog', x, y);
    for (let y = 1; y <= 13; y++) for (let x = 1; x <= 5; x++) put(b, 'fog', x, y);
    run(a, 300);
    viewMask(b, [0, 1]);
    run(b, 300);
    expect(a.players.map((p) => [p.x, p.y, p.life])).toEqual(
      b.players.map((p) => [p.x, p.y, p.life]),
    );
  });
});
