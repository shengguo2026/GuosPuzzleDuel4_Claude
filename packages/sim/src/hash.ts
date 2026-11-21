/**
 * State hash (WP 2a.1, SIM-04, INV-02): FNV-1a over every gameplay field in a
 * fixed order. Same seed + same inputs ⇒ same hash on every tick. Presentation
 * (theme, characters, cosmetics, audio) is not part of the state, so it can
 * never change the hash (M-005, V-003, INV-06).
 */
import { ENV_KINDS, type MatchState } from './types.js';

const OFFSET = 0x811c9dc5;
const PRIME = 0x01000193;

class Hasher {
  h = OFFSET;
  int(n: number): void {
    let v = n | 0;
    for (let k = 0; k < 4; k++) {
      this.h ^= v & 0xff;
      this.h = Math.imul(this.h, PRIME);
      v >>>= 8;
    }
  }
  bool(b: boolean): void {
    this.int(b ? 1 : 0);
  }
}

export function hashState(s: MatchState): number {
  const h = new Hasher();
  h.int(s.tick);
  h.int(['boss', 'escape', 'over'].indexOf(s.phase));
  h.int(s.revision);
  h.int(s.timer);
  h.int(s.rng);
  h.int(s.nextId);
  for (const t of s.tiles) h.int(t);
  for (const p of s.players) {
    h.int(p.x);
    h.int(p.y);
    h.int(p.facing);
    h.int(p.step ? p.step.dir : -1);
    h.int(p.step ? p.step.progress : -1);
    h.int(p.carry);
    h.int(p.held);
    h.int(p.turnDir);
    h.int(p.turnTicks);
    h.int(p.attack);
    h.int(p.defense);
    h.int(p.life);
    h.int(p.voluntary);
    h.int(p.stationary);
    h.int(p.invulnerable);
    h.int(p.bombHold);
    h.int(p.shieldHold);
    h.int(p.step ? ['own', 'ice', 'push', 'with'].indexOf(p.step.kind) : -1);
    h.int(p.boost);
    h.int(p.immobile);
    h.int(p.tpCooldown);
    h.int(p.pending);
    h.int(p.slideDir);
    h.bool(p.entered);
    h.bool(p.forced);
    h.bool(p.hasToken);
    h.int(p.stats.bossDamage);
  }
  for (const e of s.env) {
    h.int(e.id);
    h.int(ENV_KINDS.indexOf(e.kind));
    h.int(e.x);
    h.int(e.y);
    h.bool(e.boss);
    h.int(e.life);
    h.int(e.warn);
    h.int(e.cycle);
    h.bool(e.open);
    h.bool(e.pending);
    h.int(e.dir);
    h.int(e.link);
    h.int(e.openTicks);
    h.int(e.closedTicks);
  }
  h.int(-1);
  h.int(s.darkness);
  for (const b of s.bombs) {
    h.int(b.id);
    h.int(b.owner);
    h.int(b.x);
    h.int(b.y);
    h.int(b.dir);
    h.bool(b.isSuper);
    h.int(b.age);
    h.int(b.moved);
  }
  h.int(-1);
  for (const sh of s.shields) {
    h.int(sh.id);
    h.int(sh.owner);
    h.int(sh.x);
    h.int(sh.y);
    h.bool(sh.isSuper);
    h.int(sh.ticksLeft);
  }
  h.int(-1);
  for (const b of s.balls) {
    h.int(b.id);
    h.int(b.x);
    h.int(b.y);
    h.int(b.dir);
    h.int(b.age);
  }
  h.int(-1);
  for (const w of s.waves) {
    h.int(w.id);
    h.int(w.radius);
    h.int(w.age);
    for (const i of w.reached) h.int(i);
  }
  h.int(-1);
  const b = s.boss;
  h.int(b.hp);
  h.int(['cooldown', 'warning', 'attack', 'recovery', 'defeated'].indexOf(b.state));
  h.int(b.timer);
  h.int(b.pattern);
  h.int(b.lastPattern);
  h.int(b.target);
  h.int(b.lastTie);
  for (const i of b.marks) h.int(i);
  h.int(-1);
  for (const k of b.markKinds) h.int(k);
  h.int(-1);
  if (s.tokens) for (const t of s.tokens) h.bool(t.taken);
  if (s.outcome) {
    h.int(s.outcome.winner);
    h.int(s.outcome.tick);
  }
  return h.h >>> 0;
}
