/**
 * AI opponents (basic AI in M2a WP 2a.10, five tiers in M5 WP 5.5). The AI
 * sends only legal inputs through the same command queue as humans (BOSS-05).
 */
import { SIM_TICK_RATE_HZ } from '@gpd4/sim';

export const AI_TIERS = [1, 2, 3, 4, 5] as const;
export type AiTier = (typeof AI_TIERS)[number];

/** The AI thinks on simulation ticks, never on wall-clock time. */
export const AI_TICK_RATE_HZ = SIM_TICK_RATE_HZ;
