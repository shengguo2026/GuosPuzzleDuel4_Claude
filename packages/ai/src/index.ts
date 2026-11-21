/**
 * AI opponents (basic AI in M2a WP 2a.10, five tiers in M5 WP 5.5). The AI
 * reads the match state and returns a `PlayerInput`, exactly what a keyboard
 * produces: it never touches the state, so it can only make legal moves
 * through the same command interface as a human (BOSS-05). It thinks on
 * simulation ticks and draws randomness from its own seeded stream, so a
 * bot-vs-bot match is deterministic.
 */
import { balance } from '@gpd4/rules';
import {
  DX,
  DY,
  NO_INPUT,
  SIM_TICK_RATE_HZ,
  Tile,
  bfs,
  chance,
  chebyshev,
  envAt,
  isBlocker,
  nextInt,
  opposite,
  passable,
  type Dir,
  type MatchState,
  type PlayerInput,
  type RngState,
  type Slot,
} from '@gpd4/sim';

export const AI_TIERS = [1, 2, 3, 4, 5] as const;
export type AiTier = (typeof AI_TIERS)[number];

/** The AI thinks on simulation ticks, never on wall-clock time. */
export const AI_TICK_RATE_HZ = SIM_TICK_RATE_HZ;

const CFG = balance.ai.basic;

export interface Bot {
  readonly slot: Slot;
  think(state: MatchState): PlayerInput;
}

type Mode = 'idle' | 'charge' | 'attack' | 'dodge' | 'token' | 'exit' | 'pickup';

/**
 * Tiles the bot plans around (M2b): traps, pads (they would carry it away),
 * conveyors and boss walls. It still crosses them when no other way exists.
 */
function hazard(s: MatchState, i: number): boolean {
  const x = i % s.maze.w;
  const y = Math.floor(i / s.maze.w);
  return !!envAt(s, x, y, 'spike', 'shock', 'snare', 'pad', 'conveyor', 'bossWall');
}

/**
 * Basic AI (D-15, the M2a opponent): walks to build Attack, bombs the boss
 * from the ring, dodges or shields telegraphed attacks, then races for its
 * token and exit.
 */
export class BasicBot implements Bot {
  readonly slot: Slot;
  private rng: RngState;
  private mode: Mode = 'idle';
  private goals: number[] = [];
  private dist: Int32Array | null = null;
  private planTick = -1000;
  private planRevision = -1;
  private bombDown = 0;
  private shieldDown = 0;
  private wanderGoal = -1;
  private warningSeen = -1;
  private dodgeRoll = false;
  private shieldRoll = false;
  private lastHeld: Dir | -1 = -1;

  constructor(slot: Slot, seed: number) {
    this.slot = slot;
    this.rng = { rng: (seed ^ (slot === 0 ? 0x1234567 : 0x7654321)) | 0 };
  }

  think(s: MatchState): PlayerInput {
    const p = s.players[this.slot];
    if (s.phase === 'over') return NO_INPUT;
    // Finish a button press: tap = down one tick, then up.
    if (this.bombDown > 0) {
      this.bombDown--;
      return { held: -1, pressed: -1, bomb: this.bombDown > 0, shield: false };
    }
    if (this.shieldDown > 0) {
      this.shieldDown--;
      return { held: -1, pressed: -1, bomb: false, shield: this.shieldDown > 0 };
    }
    if (p.step) return { held: this.lastHeld, pressed: -1, bomb: false, shield: false };

    const here = p.y * s.maze.w + p.x;
    const danger = this.dangerTiles(s);

    // 1. React to telegraphed boss attacks.
    if (danger.has(here)) {
      if (this.shieldRoll && p.defense >= 1 && s.boss.state === 'warning') {
        const block = this.shieldDirection(s, danger);
        if (block !== -1) {
          if (p.facing !== block) return this.face(block);
          this.shieldDown = 2;
          return { held: -1, pressed: -1, bomb: false, shield: true };
        }
      }
      if (this.dodgeRoll) {
        this.setGoals(s, 'dodge', this.safeTiles(s, danger));
        return this.walk(s, true);
      }
    }

    // 2. Escape Phase: own token, then own exit.
    if (s.phase === 'escape') {
      if (!p.hasToken) {
        const t = s.maze.tokenTiles[this.slot];
        this.setGoals(s, 'token', [t.y * s.maze.w + t.x]);
      } else {
        const e = s.maze.entrances[1 - this.slot]!;
        this.setGoals(s, 'exit', [e.y * s.maze.w + e.x]);
      }
      return this.walk(s, false, danger);
    }

    // 3. Boss Phase: grab a useful pickup nearby, bomb from an attack spot, or walk to charge Attack.
    const pickup = this.nearbyPickup(s);
    if (pickup >= 0) {
      this.setGoals(s, 'pickup', [pickup]);
      return this.walk(s, false, danger);
    }
    if (p.attack >= 1) {
      const toCore = this.coreDirection(s, p.x, p.y);
      if (toCore !== -1) {
        if (p.facing !== toCore) return this.face(toCore);
        if (p.attack >= 3 && chance(this.rng, 40)) {
          this.bombDown = balance.abilities.chargeTicks.value + 1;
          return { held: -1, pressed: -1, bomb: true, shield: false };
        }
        this.bombDown = 1;
        return { held: -1, pressed: -1, bomb: true, shield: false };
      }
      this.wanderGoal = -1;
      this.setGoals(s, 'attack', this.attackSpots(s));
      return this.walk(s, false, danger);
    }
    if (this.wanderGoal < 0 || this.wanderGoal === here) this.wanderGoal = this.pickWander(s);
    this.setGoals(s, 'charge', [this.wanderGoal]);
    return this.walk(s, false, danger);
  }

  private face(d: Dir): PlayerInput {
    this.lastHeld = -1;
    return { held: -1, pressed: d, bomb: false, shield: false };
  }

  private setGoals(s: MatchState, mode: Mode, goals: number[]): void {
    const same =
      mode === this.mode &&
      goals.length === this.goals.length &&
      goals.every((g, i) => g === this.goals[i]);
    if (
      same &&
      this.dist &&
      s.revision === this.planRevision &&
      s.tick - this.planTick < CFG.replanTicks.value
    )
      return;
    this.mode = mode;
    this.goals = goals;
    this.planTick = s.tick;
    this.planRevision = s.revision;
    const p = s.players[this.slot];
    const here = p.y * s.maze.w + p.x;
    const open = (i: number) => passable(s, i % s.maze.w, Math.floor(i / s.maze.w));
    // Plan around hazards; fall back to any route when that finds none.
    const goalSet = new Set(goals);
    this.dist = bfs(
      s.maze.w,
      s.maze.h,
      (i) => open(i) && (i === here || goalSet.has(i) || !hazard(s, i)),
      goals,
    );
    if (this.dist[here]! < 0) this.dist = bfs(s.maze.w, s.maze.h, open, goals);
  }

  /** A reachable Attack/Defense Orb or Heart the bot can use, within 8 steps. */
  private nearbyPickup(s: MatchState): number {
    const p = s.players[this.slot];
    const wants = (k: string) =>
      (k === 'attackOrb' && p.attack < 3) ||
      (k === 'defenseOrb' && p.defense < 3) ||
      (k === 'heart' && p.life < 3);
    const targets = s.env.filter((e) => wants(e.kind)).map((e) => e.y * s.maze.w + e.x);
    if (targets.length === 0) return -1;
    const from = bfs(
      s.maze.w,
      s.maze.h,
      (i) => passable(s, i % s.maze.w, Math.floor(i / s.maze.w)) && !hazard(s, i),
      [p.y * s.maze.w + p.x],
    );
    let best = -1;
    let bestD = 9;
    for (const t of targets) {
      const d = from[t]!;
      if (d > 0 && d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  /** One step down the distance map; prefers tiles outside `avoid`. */
  private walk(s: MatchState, ignoreDanger: boolean, avoid?: Set<number>): PlayerInput {
    const p = s.players[this.slot];
    const dist = this.dist;
    const here = p.y * s.maze.w + p.x;
    if (!dist || dist[here]! <= 0) {
      this.lastHeld = -1;
      return NO_INPUT;
    }
    let best: Dir | -1 = -1;
    let bestScore = Infinity;
    for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
      const nx = p.x + DX[d]!;
      const ny = p.y + DY[d]!;
      if (!passable(s, nx, ny)) continue;
      const n = ny * s.maze.w + nx;
      const dn = dist[n]!;
      if (dn < 0 || dn >= dist[here]!) continue;
      const penalty = !ignoreDanger && avoid?.has(n) ? 1000 : 0;
      const score = dn + penalty + nextInt(this.rng, 2) * 0.1;
      if (score < bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best !== -1 && bestScore >= 1000) {
      // Every way forward is dangerous: wait for the attack to pass.
      this.lastHeld = -1;
      return NO_INPUT;
    }
    this.lastHeld = best;
    return { held: best, pressed: -1, bomb: false, shield: false };
  }

  /** Tiles a telegraphed or moving boss attack will reach soon. */
  private dangerTiles(s: MatchState): Set<number> {
    const out = new Set<number>();
    const { w, coreRadius } = s.maze;
    const b = s.boss;
    const warningStart = s.tick - b.age;
    if (b.state === 'warning' && this.warningSeen !== warningStart) {
      if (b.age < CFG.reactionTicks.value) return out; // not noticed yet
      this.warningSeen = warningStart;
      this.dodgeRoll = chance(this.rng, CFG.dodgeChancePercent.value);
      this.shieldRoll = chance(this.rng, CFG.shieldChancePercent.value);
    }
    const lane = (x: number, y: number, dir: Dir, max: number) => {
      for (let k = 0; k < max; k++) {
        if (isBlocker(s, x, y)) break;
        out.add(y * w + x);
        x += DX[dir]!;
        y += DY[dir]!;
      }
    };
    if (b.state === 'warning' && b.age >= CFG.reactionTicks.value) {
      for (const l of b.lanes) lane(l.x, l.y, l.dir, 99);
      if (b.pattern === 2) this.addRadius(s, out, coreRadius + 4);
      // Ball Rain zones (3×3) and the tiles where traps will appear.
      if (b.pattern === 8)
        for (const c of b.marks) {
          const cx = c % w;
          const cy = Math.floor(c / w);
          for (let y = cy - 1; y <= cy + 1; y++)
            for (let x = cx - 1; x <= cx + 1; x++)
              if (x >= 0 && y >= 0 && x < w && y < s.maze.h) out.add(y * w + x);
        }
      if (b.pattern === 5) for (const m of b.marks) out.add(m);
    }
    // Shock traps about to hurt or hurting.
    for (const e of s.env)
      if (e.kind === 'shock' && e.warn === 0 && e.cycle >= 55) out.add(e.y * w + e.x);
    for (const ball of s.balls) lane(ball.x, ball.y, ball.dir, 5);
    for (const wave of s.waves)
      if (wave.radius < wave.maxRadius) this.addRadius(s, out, wave.maxRadius);
    return out;
  }

  private addRadius(s: MatchState, out: Set<number>, r: number): void {
    const { w, h, cx, cy } = s.maze;
    for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy + r); y++)
      for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++)
        if (chebyshev(x, y, cx, cy) <= r) out.add(y * w + x);
  }

  private safeTiles(s: MatchState, danger: Set<number>): number[] {
    const out: number[] = [];
    for (let i = 0; i < s.tiles.length; i++) {
      const t = s.tiles[i];
      if ((t === Tile.FLOOR || t === Tile.ENTRANCE) && !danger.has(i) && !hazard(s, i)) out.push(i);
    }
    return out;
  }

  /** Direction toward the boss along a telegraphed lane, if a shield there is legal. */
  private shieldDirection(s: MatchState, danger: Set<number>): Dir | -1 {
    const p = s.players[this.slot];
    for (const l of s.boss.lanes) {
      const toward = opposite(l.dir);
      const nx = p.x + DX[toward]!;
      const ny = p.y + DY[toward]!;
      const onLane = l.dir % 2 === 0 ? p.x === l.x : p.y === l.y;
      if (onLane && danger.has(ny * s.maze.w + nx) && passable(s, nx, ny)) return toward;
    }
    return -1;
  }

  /** The direction from (x, y) straight into the boss core, if adjacent. */
  private coreDirection(s: MatchState, x: number, y: number): Dir | -1 {
    if (s.boss.hp <= 0) return -1;
    for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
      const nx = x + DX[d]!;
      const ny = y + DY[d]!;
      if (s.tiles[ny * s.maze.w + nx] === Tile.CORE) return d;
    }
    return -1;
  }

  private attackSpots(s: MatchState): number[] {
    const out: number[] = [];
    const { w, cx, cy, ringRadius } = s.maze;
    for (let y = cy - ringRadius; y <= cy + ringRadius; y++)
      for (let x = cx - ringRadius; x <= cx + ringRadius; x++)
        if (passable(s, x, y) && this.coreDirection(s, x, y) !== -1) out.push(y * w + x);
    return out;
  }

  /** A random reachable tile 6–12 steps away, to build Attack by walking. */
  private pickWander(s: MatchState): number {
    const p = s.players[this.slot];
    const from = bfs(
      s.maze.w,
      s.maze.h,
      (i) => passable(s, i % s.maze.w, Math.floor(i / s.maze.w)),
      [p.y * s.maze.w + p.x],
    );
    const options: number[] = [];
    for (let i = 0; i < from.length; i++)
      if (from[i]! >= 6 && from[i]! <= 12 && !hazard(s, i)) options.push(i);
    if (options.length === 0) return p.y * s.maze.w + p.x;
    return options[nextInt(this.rng, options.length)]!;
  }
}

export function createBot(slot: Slot, seed: number): Bot {
  return new BasicBot(slot, seed);
}
