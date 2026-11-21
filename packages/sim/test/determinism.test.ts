import { describe, expect, it } from 'vitest';
import {
  ReplayRecorder,
  createMatch,
  hashState,
  mirrorDir,
  nextInt,
  packInput,
  playReplay,
  stepMatch,
  unpackInput,
  type Dir,
  type MatchConfig,
  type MatchState,
  type PlayerInput,
  type RngState,
} from '../src/index.js';

/** A seeded random input stream: runs, turns, taps and charges. */
function randomInputs(seed: number) {
  const rng: RngState = { rng: seed };
  const state = [
    { held: -1 as Dir | -1, bomb: 0, shield: 0 },
    { held: -1 as Dir | -1, bomb: 0, shield: 0 },
  ];
  return (): [PlayerInput, PlayerInput] =>
    state.map((p) => {
      let pressed: Dir | -1 = -1;
      if (nextInt(rng, 12) === 0) {
        p.held = nextInt(rng, 5) === 0 ? -1 : (nextInt(rng, 4) as Dir);
        pressed = p.held;
      }
      if (p.bomb === 0 && nextInt(rng, 40) === 0) p.bomb = nextInt(rng, 3) === 0 ? 62 : 1;
      if (p.shield === 0 && nextInt(rng, 60) === 0) p.shield = nextInt(rng, 3) === 0 ? 62 : 1;
      const input: PlayerInput = {
        held: p.held,
        pressed,
        bomb: p.bomb > 0,
        shield: p.shield > 0,
      };
      if (p.bomb > 0) p.bomb--;
      if (p.shield > 0) p.shield--;
      return input;
    }) as [PlayerInput, PlayerInput];
}

/** State hashes after 1500 ticks of the golden input streams (re-recorded for the M2b environment layer). */
const GOLDEN: Record<number, number> = { 0: 3413289774, 1: 3840452644, 2: 759934510 };

const CONFIGS: MatchConfig[] = [
  { seed: 101, size: 'small', bossTier: 'easy', energy: 'normal' },
  { seed: 202, size: 'medium', bossTier: 'medium', energy: 'fast' },
  { seed: 303, size: 'large', bossTier: 'ultimate', energy: 'tactical' },
];

describe('determinism (WP 2a.1, SIM-04, INV-02, M-005, V-001)', () => {
  it('SIM-04: same seed + same inputs ⇒ same state hash on every tick', () => {
    for (const config of CONFIGS) {
      const a = createMatch(config);
      const b = createMatch(config);
      const ia = randomInputs(config.seed);
      const ib = randomInputs(config.seed);
      for (let t = 0; t < 3000 && a.phase !== 'over'; t++) {
        stepMatch(a, ia());
        stepMatch(b, ib());
        expect(hashState(a)).toBe(hashState(b));
      }
    }
  });

  it('WP 2a.1: a recorded replay plays back with identical hashes on every tick', () => {
    for (const config of CONFIGS) {
      const s = createMatch(config);
      const rec = new ReplayRecorder(config);
      const next = randomInputs(config.seed + 1);
      for (let t = 0; t < 4000 && s.phase !== 'over'; t++) {
        const inputs = next();
        stepMatch(s, inputs);
        rec.record(inputs, s);
      }
      const { state, mismatchAt } = playReplay(JSON.parse(JSON.stringify(rec.replay)));
      expect(mismatchAt).toBe(-1);
      expect(hashState(state)).toBe(hashState(s));
    }
  });

  it('WP 2a.1: golden replays keep their recorded hashes (update only on a deliberate rule change)', () => {
    const golden: Record<number, number> = GOLDEN;
    const got: Record<number, number> = {};
    for (const [i, config] of CONFIGS.entries()) {
      const s = createMatch(config);
      const next = randomInputs(1000 + i);
      for (let t = 0; t < 1500 && s.phase !== 'over'; t++) stepMatch(s, next());
      got[i] = hashState(s);
    }
    expect(got).toEqual(golden);
  });

  it('INV-02: a tampered replay is detected at the first changed tick', () => {
    const config = CONFIGS[0]!;
    const s = createMatch(config);
    const rec = new ReplayRecorder(config);
    const next = randomInputs(9);
    for (let t = 0; t < 600; t++) {
      const inputs = next();
      stepMatch(s, inputs);
      rec.record(inputs, s);
    }
    const tampered = JSON.parse(JSON.stringify(rec.replay));
    tampered.inputs[400] = packInput({ held: 1, pressed: 1, bomb: true, shield: false });
    expect(playReplay(tampered).mismatchAt).toBeGreaterThanOrEqual(200);
  });

  it('INV-02: event IDs are unique and increasing', () => {
    const s = createMatch(CONFIGS[1]!);
    const next = randomInputs(4);
    const ids: number[] = [];
    for (let t = 0; t < 3000 && s.phase !== 'over'; t++)
      ids.push(...stepMatch(s, next()).map((e) => e.id));
    expect(ids.length).toBeGreaterThan(10);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).toBeGreaterThan(ids[i - 1]!);
  });

  it('WP 2a.1: input packing round-trips', () => {
    for (const held of [-1, 0, 1, 2, 3] as const)
      for (const pressed of [-1, 0, 3] as const)
        for (const bomb of [false, true])
          for (const shield of [false, true]) {
            const i = { held, pressed, bomb, shield };
            expect(unpackInput(packInput(i))).toEqual(i);
          }
  });

  it('M-005 / V-003 / INV-06: presentation choices are not part of the simulation', () => {
    // Theme, character, cosmetics and audio live only in the client; passing
    // them along with the config changes nothing.
    for (const theme of ['garden', 'desert', 'caverns', 'neon', 'volcano']) {
      const withTheme = { ...CONFIGS[0]!, theme, character: 'robot', music: 0.5 } as MatchConfig;
      const a = createMatch(withTheme);
      const b = createMatch(CONFIGS[0]!);
      const ia = randomInputs(77);
      const ib = randomInputs(77);
      for (let t = 0; t < 500; t++) {
        stepMatch(a, ia());
        stepMatch(b, ib());
      }
      expect(hashState(a)).toBe(hashState(b));
    }
  });

  it('V-001 / SIM-05: swapped players with mirrored inputs give the mirrored match', () => {
    let compared = 0;
    for (const config of CONFIGS) {
      for (let k = 0; k < 4; k++) {
        const a = createMatch({ ...config, seed: config.seed + k });
        const b = createMatch({ ...config, seed: config.seed + k });
        const next = randomInputs(500 + k);
        const mirror = (i: PlayerInput): PlayerInput => ({
          ...i,
          held: i.held === -1 ? -1 : mirrorDir(i.held),
          pressed: i.pressed === -1 ? -1 : mirrorDir(i.pressed),
        });
        for (let t = 0; t < 3000 && a.phase !== 'over'; t++) {
          const [i0, i1] = next();
          stepMatch(a, [i0, i1]);
          stepMatch(b, [mirror(i1), mirror(i0)]);
          // The first boss tie is broken by the seed (BS-05), the only
          // place where the slot number may matter; compare up to there.
          if (a.boss.lastTie !== -1 || b.boss.lastTie !== -1) break;
          expectMirrored(a, b);
          compared++;
        }
        if (a.outcome && b.outcome && a.boss.lastTie === -1) {
          const w = a.outcome.winner;
          expect(b.outcome.winner).toBe(w === -1 ? -1 : 1 - w);
        }
      }
    }
    expect(compared).toBeGreaterThan(1000);
  });
});

function expectMirrored(a: MatchState, b: MatchState) {
  const { w, h } = a.maze;
  for (const slot of [0, 1] as const) {
    const pa = a.players[slot];
    const pb = b.players[1 - slot]!;
    expect([pb.x, pb.y]).toEqual([w - 1 - pa.x, h - 1 - pa.y]);
    expect([pb.life, pb.attack, pb.defense, pb.hasToken]).toEqual([
      pa.life,
      pa.attack,
      pa.defense,
      pa.hasToken,
    ]);
  }
  expect(b.boss.hp).toBe(a.boss.hp);
  expect(b.phase).toBe(a.phase);
  expect(b.bombs.length).toBe(a.bombs.length);
  expect(b.shields.length).toBe(a.shields.length);
  // M2b: the environment and boss hazards are mirrored too.
  const key = (s: MatchState, mirror: boolean) =>
    s.env
      .map(
        (e) =>
          `${e.kind}:${mirror ? w - 1 - e.x : e.x},${mirror ? h - 1 - e.y : e.y}:${e.warn}:${e.life}:${e.open}`,
      )
      .sort();
  expect(key(b, true)).toEqual(key(a, false));
  expect(b.darkness).toBe(a.darkness);
}
