import { describe, expect, it } from 'vitest';
import { SIM_TICK_RATE_HZ, secondsToTicks } from '../src/index.js';

describe('sim scaffold', () => {
  it('scaffold: the simulation rate comes from the balance file (30 Hz)', () => {
    expect(SIM_TICK_RATE_HZ).toBe(30);
    expect(secondsToTicks(2)).toBe(60);
  });
});
