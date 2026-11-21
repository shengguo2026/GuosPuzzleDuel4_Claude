import { describe, expect, it } from 'vitest';
import {
  createMatch,
  hashState,
  stepMatch,
  type MatchConfig,
  type MatchState,
  type PlayerInput,
} from '@gpd4/sim';
import { AI_TIERS, AI_TICK_RATE_HZ, createBot } from '../src/index.js';

/** Runs a bot-vs-bot match to its end; returns the final state and the hash trail. */
function botMatch(config: MatchConfig) {
  const s = createMatch(config);
  const bots = [createBot(0, config.seed), createBot(1, config.seed)] as const;
  const hashes: number[] = [];
  while (s.phase !== 'over') {
    const inputs: [PlayerInput, PlayerInput] = [bots[0].think(s), bots[1].think(s)];
    stepMatch(s, inputs);
    if (s.tick % 300 === 0) hashes.push(hashState(s));
  }
  return { s, hashes };
}

describe('basic AI (WP 2a.10, BOSS-05, D-15)', () => {
  it('scaffold: five AI tiers driven by simulation ticks', () => {
    expect(AI_TIERS).toHaveLength(5);
    expect(AI_TICK_RATE_HZ).toBe(30);
  });

  it('BOSS-05: the bot only returns a command; it never changes the state', () => {
    const s = createMatch({ seed: 5, size: 'small', bossTier: 'easy', energy: 'normal' });
    const bot = createBot(1, 5);
    for (let t = 0; t < 300; t++) {
      const before = hashState(s);
      const cmd = bot.think(s);
      expect(hashState(s)).toBe(before);
      expect(Object.keys(cmd).sort()).toEqual(['bomb', 'held', 'pressed', 'shield']);
      stepMatch(s, [{ held: -1, pressed: -1, bomb: false, shield: false }, cmd]);
    }
  });

  it('G-001 / WP 2a.10: bot-vs-bot matches end, and end the same way every time', () => {
    const results: string[] = [];
    for (const [seed, size, bossTier] of [
      [11, 'small', 'easy'],
      [12, 'medium', 'medium'],
      [13, 'large', 'hard'],
    ] as const) {
      const config: MatchConfig = { seed, size, bossTier, energy: 'normal' };
      const a = botMatch(config);
      const b = botMatch(config);
      expect(a.hashes).toEqual(b.hashes);
      expect(a.s.outcome).toEqual(b.s.outcome);
      results.push(
        `${size}/${bossTier}: ${a.s.outcome!.reason} winner ${a.s.outcome!.winner} at ${a.s.tick}`,
      );
    }
    console.log(results.join('\n'));
  });

  it('WP 2a.10: the basic AI defeats an Easy boss and reaches the Escape Phase', () => {
    let escapes = 0;
    let bossDefeated = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const { s } = botMatch({ seed, size: 'small', bossTier: 'easy', energy: 'normal' });
      if (s.boss.hp === 0) bossDefeated++;
      if (s.outcome!.reason === 'escape') escapes++;
    }
    console.log(`boss defeated ${bossDefeated}/10, escapes ${escapes}/10`);
    expect(bossDefeated).toBeGreaterThanOrEqual(7);
    expect(escapes).toBeGreaterThanOrEqual(5);
  });
});

export type { MatchState };
