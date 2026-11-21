/**
 * Deterministic simulation (PLAN.md section 3, WP 2a.1 to 2a.8).
 *
 * This package is pure: it imports no DOM, network, database or Node API, and
 * uses no wall-clock time or Math.random. ESLint enforces that
 * (eslint.config.js, "sim purity"), and its tsconfig loads no DOM or Node types.
 */
import { balance } from '@gpd4/rules';

/** Fixed simulation rate (NET-03, SIM-01). */
export const SIM_TICK_RATE_HZ: number = balance.sim.tickRateHz.value;

/** Converts whole seconds to simulation ticks. */
export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * SIM_TICK_RATE_HZ);
}

export * from './types.js';
export * from './rng.js';
export * from './maze.js';
export * from './world.js';
export * from './boss.js';
export * from './match.js';
export * from './environment.js';
export * from './visibility.js';
export * from './snapshot.js';
export * from './hash.js';
export * from './replay.js';
