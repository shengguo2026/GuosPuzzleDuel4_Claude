import { describe, expect, it } from 'vitest';
import {
  NORTH,
  SOUTH,
  Tile,
  cooldownTicks,
  createMatch,
  laneToward,
  stepMatch,
  unlockedPatterns,
  type MatchState,
  type PatternId,
  type Slot,
} from '../src/index.js';
import { CONFIG, input, ofType, openMaze, place, run, setTile, tap } from './helpers.js';

const NONE = input();

/** Puts the boss at the end of a warning for `pattern`, aimed at `target`. */
function forcePattern(s: MatchState, pattern: PatternId, target: Slot) {
  s.boss.state = 'warning';
  s.boss.pattern = pattern;
  s.boss.target = target;
  s.boss.timer = 0;
  s.boss.lanes = [];
  if (pattern !== 2) {
    const lane = laneToward(s, target);
    s.boss.lanes.push(lane);
    if (pattern === 3)
      s.boss.lanes.push({ x: 14 - lane.x, y: 14 - lane.y, dir: ((lane.dir + 2) % 4) as 0 });
  }
}

function activeMatch(tier: 'easy' | 'medium' | 'hard' = 'easy') {
  return createMatch({ ...CONFIG, bossTier: tier }, openMaze());
}

describe('boss (WP 2a.6, BOSS-01, BOSS-02, BOSS-04, BS-01 to BS-14)', () => {
  it('BOSS-01 / BS-02: cooldown → warning → attack (1 tick) → recovery (30) → cooldown', () => {
    const s = activeMatch('easy');
    const events = run(s, 400);
    const warnings = ofType(events, 'boss-warning');
    const attacks = ofType(events, 'boss-attack');
    expect(warnings[0]!.tick).toBe(120); // first cooldown 4.0 s from GO
    const warn = warnings[0]!.pattern === 2 ? 36 : 30;
    expect(attacks[0]!.tick).toBe(120 + warn);
    // Recovery 30 ticks, then the next 120-tick cooldown.
    expect(warnings[1]!.tick).toBe(120 + warn + 1 + 30 + 120);
  });

  it('BOSS-02 / BS-01: HP per tier from the balance file', () => {
    const hp = { easy: 6, medium: 9, hard: 12, extreme: 15, ultimate: 18 };
    for (const [tier, value] of Object.entries(hp)) {
      const s = createMatch({ ...CONFIG, bossTier: tier as 'easy' }, openMaze());
      expect([s.boss.hp, s.boss.maxHp]).toEqual([value, value]);
    }
  });

  it('BOSS-02 / BS-03: Rage below 30 % HP shortens cooldowns by 25 % on Hard and up', () => {
    const hard = activeMatch('hard');
    expect(cooldownTicks(hard)).toBe(90);
    hard.boss.hp = 4; // 33 %
    expect(cooldownTicks(hard)).toBe(90);
    hard.boss.hp = 3; // 25 %
    expect(cooldownTicks(hard)).toBe(67);
    const easy = activeMatch('easy');
    easy.boss.hp = 1;
    expect(cooldownTicks(easy)).toBe(120); // no Rage on Easy
  });

  it('BOSS-04: tier unlocks (M2a patterns): Easy 1–2, Medium and up 1–3', () => {
    expect(unlockedPatterns('easy')).toEqual([1, 2]);
    for (const t of ['medium', 'hard', 'extreme', 'ultimate'] as const)
      expect(unlockedPatterns(t)).toEqual([1, 2, 3]);
  });

  it('BS-04: never the same pattern twice in a row', () => {
    const s = activeMatch('medium');
    place(s, 0, 1, 1);
    place(s, 1, 13, 13);
    s.players[0].life = 99;
    s.players[1].life = 99;
    const patterns = ofType(run(s, 6000), 'boss-warning').map((w) => w.pattern);
    expect(patterns.length).toBeGreaterThan(20);
    for (let i = 1; i < patterns.length; i++) expect(patterns[i]).not.toBe(patterns[i - 1]);
    expect(new Set(patterns)).toEqual(new Set([1, 2, 3]));
  });

  it('BS-05: targets the player nearer to the centre; ties alternate', () => {
    const s = activeMatch('easy');
    place(s, 0, 7, 3); // distance 4
    place(s, 1, 13, 13); // distance 12
    const w = ofType(run(s, 125), 'boss-warning')[0]!;
    expect(w.target).toBe(0);

    const t = activeMatch('medium');
    t.players.forEach((p) => (p.life = 99));
    // Both at mirrored tiles (equal distance) for the whole run.
    const targets = ofType(run(t, 3000), 'boss-warning').map((x) => x.target);
    expect(targets.length).toBeGreaterThan(8);
    for (let i = 1; i < targets.length; i++) expect(targets[i]).not.toBe(targets[i - 1]);
  });

  it('BOSS-04 pattern 1 (Orb Shot): the ball runs down the lane toward the target and hits', () => {
    const s = activeMatch();
    place(s, 0, 7, 3);
    place(s, 1, 13, 13);
    forcePattern(s, 1, 0);
    const ev = run(s, 1);
    expect(ofType(ev, 'boss-attack')).toHaveLength(1);
    // Spawned on the ring tile of the lane; it acts from the next tick.
    expect(s.balls[0]).toMatchObject({ x: 7, y: 5, dir: NORTH, age: 0 });
    run(s, 1);
    expect(s.balls[0]).toMatchObject({ x: 7, y: 5, age: 1 });
    const hits = ofType(run(s, 10), 'player-hit');
    expect(hits).toHaveLength(1);
    expect(s.players[0].life).toBe(2);
    expect(s.players[0].invulnerable).toBeGreaterThan(30);
    expect(s.balls).toHaveLength(0);
  });

  it('BS-08: the lane column is clamped to the core width; East/West lanes for side targets', () => {
    const s = activeMatch();
    place(s, 0, 12, 1); // dx 5, dy -6 → North lane, column clamped to cx+1
    expect(laneToward(s, 0)).toEqual({ x: 8, y: 5, dir: NORTH });
    place(s, 0, 13, 8); // dx 6, dy 1 → East lane, row cy+1
    expect(laneToward(s, 0)).toEqual({ x: 9, y: 8, dir: 1 });
  });

  it('BS-10 / SH-03: a shield destroys balls and is unharmed', () => {
    const s = activeMatch();
    place(s, 0, 7, 3, SOUTH);
    tap(s, 0, 'shield'); // shield at (7,4)
    s.players[1].x = 13;
    s.players[1].y = 13;
    forcePattern(s, 1, 0);
    const ev = run(s, 20);
    expect(ofType(ev, 'ball-destroyed')).toHaveLength(1);
    expect(ofType(ev, 'player-hit')).toHaveLength(0);
    expect(s.shields).toHaveLength(1);
  });

  it('BS-10 / BM-06: a bomb destroys a ball it meets', () => {
    const s = activeMatch();
    place(s, 0, 7, 2, SOUTH);
    place(s, 1, 13, 13);
    forcePattern(s, 1, 0);
    run(s, 2); // ball at (7,5)
    const ev = [...tap(s, 0, 'bomb'), ...run(s, 15)];
    expect(ofType(ev, 'blast')).toHaveLength(1);
    expect(ofType(ev, 'ball-destroyed')).toHaveLength(1);
    expect(ofType(ev, 'player-hit')).toHaveLength(0);
  });

  it('BOSS-04 pattern 2 (Shockwave): grows 2 → 5 every 4 ticks; a shield shadows the tiles behind it', () => {
    const s = activeMatch();
    place(s, 0, 7, 5); // on the ring
    place(s, 1, 7, 11, NORTH); // radius 4, in a corridor
    for (const [x, y] of [
      [6, 10],
      [8, 10],
      [6, 11],
      [8, 11],
    ] as const)
      setTile(s, x, y, Tile.WALL);
    tap(s, 1, 'shield'); // shield at (7,10)
    forcePattern(s, 2, 0);
    run(s, 1);
    const radii: number[] = [];
    const ev = run(s, 20, () => {
      if (s.waves[0]) radii.push(s.waves[0].radius);
      return [NONE, NONE];
    });
    expect([...new Set(radii)]).toEqual([2, 3, 4, 5]);
    expect(s.waves).toHaveLength(0);
    const hits = ofType(ev, 'player-hit');
    expect(hits.map((h) => h.slot)).toEqual([0]);
    expect(s.players[1].life).toBe(3);
  });

  it('BOSS-04 pattern 3 (Twin Orbs): two balls, the second in the point-symmetric lane', () => {
    const s = activeMatch('medium');
    place(s, 0, 7, 3);
    place(s, 1, 2, 12);
    forcePattern(s, 3, 0);
    run(s, 2);
    expect(s.balls.map((b) => [b.x, b.y, b.dir])).toEqual([
      [7, 5, NORTH],
      [7, 9, SOUTH],
    ]);
  });

  it('G-007: only bombs lower the boss HP; never below 0', () => {
    const s = activeMatch();
    s.players.forEach((p) => (p.life = 99));
    run(s, 2000, () => [input({ held: SOUTH }), input({ held: NORTH })]);
    expect(s.boss.hp).toBe(6);
    s.boss.hp = 1;
    place(s, 0, 7, 5, SOUTH);
    s.players[0].attack = 3;
    stepMatch(s, [input({ bomb: true }), NONE]);
    for (let t = 0; t < 60; t++) stepMatch(s, [input({ bomb: true }), NONE]);
    stepMatch(s, [NONE, NONE]);
    expect(s.boss.hp).toBe(0);
    expect(s.players[0].stats.bossDamage).toBe(1);
  });
});
