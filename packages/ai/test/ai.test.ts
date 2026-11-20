import { describe, expect, it } from 'vitest';
import { AI_TIERS, AI_TICK_RATE_HZ } from '../src/index.js';

describe('ai scaffold', () => {
  it('scaffold: five AI tiers driven by simulation ticks', () => {
    expect(AI_TIERS).toHaveLength(5);
    expect(AI_TICK_RATE_HZ).toBe(30);
  });
});
