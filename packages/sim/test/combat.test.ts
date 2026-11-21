import { describe, expect, it } from 'vitest';
import { EAST, NORTH, SOUTH, Tile, WEST, blastFootprint, stepMatch } from '../src/index.js';
import { holdAndRelease, input, ofType, place, run, setTile, tap, testMatch } from './helpers.js';

const NONE = input();

describe('bombs (WP 2a.5, AB-01, AB-02, BM-01 to BM-07)', () => {
  it('AB-01: a bomb costs 1 Attack; at 0 Attack it is rejected with no cost', () => {
    const s = testMatch();
    place(s, 0, 2, 2, EAST);
    expect(ofType(tap(s, 0, 'bomb'), 'bomb-thrown')).toHaveLength(1);
    expect(s.players[0].attack).toBe(0);
    const ev = tap(s, 0, 'bomb');
    expect(ofType(ev, 'bomb-thrown')).toHaveLength(0);
    expect(ofType(ev, 'ability-rejected')).toHaveLength(1);
    expect(s.players[0].attack).toBe(0);
  });

  it('BM-02: the bomb flies 1 tile per 3 ticks for at most 8 tiles, then explodes', () => {
    const s = testMatch();
    place(s, 0, 1, 2, EAST);
    s.players[0].attack = 1;
    tap(s, 0, 'bomb'); // thrown on the release tick (tick 2)
    const bomb = s.bombs[0]!;
    expect(bomb.x).toBe(1);
    const events = run(s, 30);
    const blast = ofType(events, 'blast')[0]!;
    expect(blast).toBeDefined();
    expect([blast.x, blast.y]).toEqual([9, 2]);
    expect(blast.tiles).toHaveLength(5); // impact tile + 4 neighbours (BM-05)
  });

  it('BM-03: explodes in front of a wall; at once when thrown into an adjacent wall', () => {
    const s = testMatch();
    place(s, 0, 2, 2, EAST);
    setTile(s, 5, 2, Tile.WALL);
    tap(s, 0, 'bomb');
    const blast = ofType(run(s, 20), 'blast')[0]!;
    expect([blast.x, blast.y]).toEqual([4, 2]);
    expect(blast.tiles).toContain(5 + 2 * 15); // the contacted wall is inside the blast

    const t = testMatch();
    place(t, 0, 4, 2, EAST);
    setTile(t, 5, 2, Tile.WALL);
    const ev = tap(t, 0, 'bomb');
    const b = ofType(ev, 'blast')[0]!;
    expect([b.x, b.y]).toEqual([4, 2]);
  });

  it('BM-04: bombs fly through players (rival and thrower) with no effect', () => {
    const s = testMatch();
    place(s, 0, 1, 2, EAST);
    place(s, 1, 4, 2);
    tap(s, 0, 'bomb');
    const events = run(s, 30);
    expect(ofType(events, 'blast')[0]!.x).toBe(9);
    expect(s.players[1].life).toBe(3);
    expect(ofType(events, 'player-hit')).toHaveLength(0);
  });

  it('BM-05: Super blast is the radius-2 diamond, stopped by walls', () => {
    const s = testMatch();
    expect(blastFootprint(s, 3, 3, 2, -1)).toHaveLength(13);
    setTile(s, 4, 3, Tile.WALL);
    const fp = blastFootprint(s, 3, 3, 2, -1);
    expect(fp).toContain(3 * 15 + 4); // the wall itself
    expect(fp).not.toContain(3 * 15 + 5); // nothing behind it
  });

  it('CH-03 / AB-02: hold ≥ 60 ticks with 3 Attack = Super Bomb for 3 Attack', () => {
    const s = testMatch();
    place(s, 0, 1, 2, EAST);
    s.players[0].attack = 3;
    const ev = holdAndRelease(s, 0, 'bomb', 60);
    const thrown = ofType(ev, 'bomb-thrown');
    expect(thrown).toHaveLength(1);
    expect(thrown[0]!.isSuper).toBe(true);
    expect(s.players[0].attack).toBe(0);
    const blast = ofType(run(s, 30), 'blast')[0]!;
    expect(blast.isSuper).toBe(true);
    expect(blast.tiles.length).toBeGreaterThan(5);
  });

  it('CH-04: release between 8 and 59 ticks, or ≥ 60 without 3 energy, cancels with no cost', () => {
    const s = testMatch();
    place(s, 0, 1, 2, EAST);
    s.players[0].attack = 3;
    expect(ofType(holdAndRelease(s, 0, 'bomb', 30), 'bomb-thrown')).toHaveLength(0);
    expect(s.players[0].attack).toBe(3);
    s.players[0].attack = 2;
    expect(ofType(holdAndRelease(s, 0, 'bomb', 70), 'bomb-thrown')).toHaveLength(0);
    expect(s.players[0].attack).toBe(2);
    // ≤ 7 ticks is still a tap.
    expect(ofType(holdAndRelease(s, 0, 'bomb', 7), 'bomb-thrown')).toHaveLength(1);
  });

  it('AB-02: the charge counts simulation ticks only (a pause adds none)', () => {
    const s = testMatch();
    place(s, 0, 1, 2, EAST);
    s.players[0].attack = 3;
    run(s, 59, () => [input({ bomb: true }), NONE]);
    // ...pause: no ticks run...
    run(s, 1, () => [NONE, NONE]); // released after 59 ticks
    expect(s.players[0].attack).toBe(3);
  });

  it('EN-06 / CH-06: taking a hit cancels the charge with no cost', () => {
    const s = testMatch({}, true);
    place(s, 0, 7, 4, NORTH);
    s.players[0].attack = 3;
    s.boss.state = 'warning';
    s.boss.pattern = 1;
    s.boss.timer = 1;
    s.boss.lanes = [{ x: 7, y: 5, dir: NORTH }];
    // Hold the bomb while the ball comes up the lane.
    let hit = false;
    for (let t = 0; t < 80 && !hit; t++) {
      hit = stepMatch(s, [input({ bomb: true }), NONE]).some((e) => e.type === 'player-hit');
    }
    expect(hit).toBe(true);
    expect(s.players[0].bombHold).toBe(-2);
    const ev = run(s, 1);
    expect(ofType(ev, 'bomb-thrown')).toHaveLength(0);
    expect(s.players[0].attack).toBe(3);
  });

  it('BM-06 / G-007: normal bomb 1 boss damage, Super 3; credited to the thrower once', () => {
    const s = testMatch();
    place(s, 0, 7, 5, SOUTH); // next to the core
    const ev = tap(s, 0, 'bomb');
    expect(ofType(ev, 'boss-damaged')[0]).toMatchObject({ slot: 0, amount: 1, hp: 5 });
    expect(s.boss.hp).toBe(5);
    s.players[1].attack = 3;
    place(s, 1, 7, 9, NORTH);
    const ev2 = holdAndRelease(s, 1, 'bomb', 60);
    expect(ofType(ev2, 'boss-damaged')).toHaveLength(1);
    expect(s.boss.hp).toBe(2);
    expect(s.players[0].stats.bossDamage).toBe(1);
    expect(s.players[1].stats.bossDamage).toBe(3);
  });

  it('BM-06 / ENV-WA-01 / ENV-WA-02: destructible walls fall only to Super Bombs; solid walls never', () => {
    const s = testMatch();
    place(s, 0, 2, 2, EAST);
    setTile(s, 3, 2, Tile.DESTRUCTIBLE);
    setTile(s, 2, 3, Tile.WALL);
    s.players[0].attack = 3;
    tap(s, 0, 'bomb');
    expect(s.tiles[2 * 15 + 3]).toBe(Tile.DESTRUCTIBLE);
    s.players[0].attack = 3;
    const rev = s.revision;
    const ev = holdAndRelease(s, 0, 'bomb', 60);
    expect(ofType(ev, 'wall-destroyed')).toHaveLength(1);
    expect(s.tiles[2 * 15 + 3]).toBe(Tile.FLOOR);
    expect(s.tiles[3 * 15 + 2]).toBe(Tile.WALL);
    expect(s.revision).toBe(rev + 1); // MZ-08
  });
});

describe('shields (WP 2a.5, AB-03, AB-04, SH-01 to SH-08)', () => {
  it('AB-03: a shield costs 1 Defense, stands 90 ticks in front and blocks both players', () => {
    const s = testMatch();
    place(s, 0, 2, 2, EAST);
    tap(s, 0, 'shield');
    expect(s.players[0].defense).toBe(0);
    expect(s.shields[0]).toMatchObject({ x: 3, y: 2, isSuper: false });
    run(s, 20, () => [input({ held: EAST }), NONE]);
    expect(s.players[0].x).toBe(2); // the caster cannot pass either
    run(s, 70);
    expect(s.shields).toHaveLength(0);
  });

  it('AB-03 / SH-03: a normal bomb explodes harmlessly on a shield; a Super Bomb removes it', () => {
    const s = testMatch();
    place(s, 0, 4, 2, WEST);
    tap(s, 0, 'shield'); // shield at (3,2)
    place(s, 1, 1, 2, EAST);
    s.players[1].attack = 3;
    tap(s, 1, 'bomb');
    run(s, 6);
    expect(s.shields).toHaveLength(1);
    s.players[1].attack = 3;
    holdAndRelease(s, 1, 'bomb', 60);
    run(s, 10);
    expect(s.shields).toHaveLength(0);
  });

  it('SH-01: a running player shields one tile beyond the tile they step into', () => {
    const s = testMatch();
    place(s, 0, 2, 2);
    run(s, 2, () => [input({ held: EAST }), NONE]);
    tap(s, 0, 'shield');
    expect(s.shields[0]).toMatchObject({ x: 4, y: 2 });
  });

  it('SH-02: placement on a wall or an occupied tile is rejected with no cost', () => {
    const s = testMatch();
    place(s, 0, 1, 1, NORTH); // the border wall is in front
    expect(ofType(tap(s, 0, 'shield'), 'ability-rejected')).toHaveLength(1);
    place(s, 1, 2, 1);
    s.players[0].facing = EAST;
    expect(ofType(tap(s, 0, 'shield'), 'ability-rejected')).toHaveLength(1);
    expect(s.players[0].defense).toBe(1);
  });

  it('SH-06: two shields aimed at one tile on one tick: neither placed, neither pays', () => {
    const s = testMatch();
    place(s, 0, 2, 2, EAST);
    place(s, 1, 4, 2, WEST);
    stepMatch(s, [input({ shield: true }), input({ shield: true })]);
    const ev = stepMatch(s, [NONE, NONE]);
    expect(ofType(ev, 'ability-rejected')).toHaveLength(2);
    expect(s.shields).toHaveLength(0);
    expect([s.players[0].defense, s.players[1].defense]).toEqual([1, 1]);
  });

  it('AB-04: Super Shield only in the Escape Phase, 450 ticks, only a Super Bomb breaks it', () => {
    const s = testMatch();
    place(s, 0, 2, 2, EAST);
    s.players[0].defense = 3;
    holdAndRelease(s, 0, 'shield', 60);
    expect(s.shields).toHaveLength(0); // Boss Phase: cancelled, no cost
    expect(s.players[0].defense).toBe(3);
    s.phase = 'escape';
    holdAndRelease(s, 0, 'shield', 60);
    expect(s.shields[0]).toMatchObject({ isSuper: true, ticksLeft: 450 });
    expect(s.players[0].defense).toBe(0);
    // At most one active Super Shield per player.
    s.players[0].defense = 3;
    s.players[0].facing = SOUTH;
    holdAndRelease(s, 0, 'shield', 60);
    expect(s.shields.filter((x) => x.isSuper)).toHaveLength(1);
    // Normal bomb: no effect; Super Bomb: removed.
    place(s, 1, 6, 2, WEST);
    s.players[1].attack = 3;
    tap(s, 1, 'bomb');
    run(s, 10);
    expect(s.shields.some((x) => x.isSuper)).toBe(true);
    s.players[1].attack = 3;
    holdAndRelease(s, 1, 'bomb', 60);
    run(s, 10);
    expect(s.shields.some((x) => x.isSuper)).toBe(false);
  });
});
