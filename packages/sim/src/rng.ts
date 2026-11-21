/**
 * Seeded PRNG (SIM-04): one 32-bit integer of state, so it is part of the
 * state hash and a match can be snapshotted and restored exactly. The
 * algorithm is mulberry32; it uses only integer operations.
 */
export interface RngState {
  rng: number;
}

/** Next unsigned 32-bit value; advances `s.rng`. */
export function nextU32(s: RngState): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/** Uniform integer in [0, n). */
export function nextInt(s: RngState, n: number): number {
  if (n <= 1) return 0;
  return nextU32(s) % n;
}

/** True with probability percent/100. */
export function chance(s: RngState, percent: number): boolean {
  return nextInt(s, 100) < percent;
}

/** Fisher–Yates shuffle in place. */
export function shuffle<T>(s: RngState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = nextInt(s, i + 1);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/** Normalises any number to a 32-bit seed. */
export function seedFrom(n: number): number {
  return (Math.trunc(n) ^ 0x9e3779b9) | 0;
}
