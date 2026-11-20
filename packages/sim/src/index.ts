/**
 * Deterministic simulation (PLAN.md section 3; filled in from M2a, WP 2a.1).
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
