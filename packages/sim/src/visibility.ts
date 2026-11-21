/**
 * Visibility (WP 2b.7; VI-01 to VI-05, D-33). Visibility is presentation: it
 * is computed from the state but never changes it. The host decides what each
 * view may show; the shared screen (Solo, Local VS) shows the union of both
 * players' views, WiFi VS shows each player their own (NET-02, ENV-VI-04).
 */
import { balance } from '@gpd4/rules';
import type { MatchState, Slot } from './types.js';
import { envAt } from './world.js';

/** VI-02 / VI-03: the radius a player sees, or -1 for the normal (full) view. */
export function viewRadius(s: MatchState, slot: Slot): number {
  const p = s.players[slot];
  if (s.darkness > 0) return balance.visibility.darknessRadiusTiles.value;
  if (envAt(s, p.x, p.y, 'fog')) return balance.visibility.fogRadiusTiles.value;
  return -1;
}

/** Tiles one player sees (1 = visible), or null when they see everything. */
export function visibleMask(s: MatchState, slot: Slot): Uint8Array | null {
  const r = viewRadius(s, slot);
  if (r < 0) return null;
  const { w, h } = s.maze;
  const p = s.players[slot];
  const mask = new Uint8Array(w * h);
  for (let y = Math.max(0, p.y - r); y <= Math.min(h - 1, p.y + r); y++)
    for (let x = Math.max(0, p.x - r); x <= Math.min(w - 1, p.x + r); x++) {
      const dx = x - p.x;
      const dy = y - p.y;
      if (dx * dx + dy * dy <= r * r) mask[y * w + x] = 1; // Euclidean circle (VI-02)
    }
  return mask;
}

/**
 * VI-05: the view for a set of viewers. One slot = that player's own view
 * (WiFi VS); both slots = the union for the shared screen or a spectator.
 * Null means everything is visible.
 */
export function viewMask(s: MatchState, slots: readonly Slot[]): Uint8Array | null {
  let union: Uint8Array | null = null;
  for (const slot of slots) {
    const m = visibleMask(s, slot);
    if (!m) return null;
    if (!union) union = m;
    else for (let i = 0; i < m.length; i++) union[i] = union[i]! | m[i]!;
  }
  return union;
}
