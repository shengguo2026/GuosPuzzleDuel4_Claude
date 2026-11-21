/**
 * The match simulation (WP 2a.1 to 2a.8): one call of `stepMatch` runs one
 * host tick through the fixed pipeline of MECHANICS.md section 17. Both
 * players are processed symmetrically (SIM-05): every step computes from the
 * state at its start and applies the results together.
 *
 * M2a scope: movement, energy, bombs, shields, boss patterns 1–3, phase flip,
 * tokens, shortcuts, escape, timer and outcomes. Environment elements (traps,
 * teleporters, terrain, pickups, gates, fog) and patterns 4–8 follow in M2b.
 */
import { balance } from '@gpd4/rules';
import { chebyshev, generateMaze } from './maze.js';
import { nextInt } from './rng.js';
import {
  DX,
  DY,
  NORTH,
  SOUTH,
  Tile,
  opposite,
  type Ball,
  type Bomb,
  type BossState,
  type Dir,
  type EventBody,
  type GameEvent,
  type Lane,
  type MatchConfig,
  type MatchState,
  type Maze,
  type Outcome,
  type PatternId,
  type PlayerInput,
  type PlayerState,
  type Slot,
  type Wave,
} from './types.js';

const B = balance;
const UNITS = B.movement.unitsPerTile.value;
const OWN_SPEED = B.movement.ownUnitsPerTick.value;
const TURN_BUFFER = B.movement.keyboardTurnBufferTicks.value;
const CAP_ATTACK = B.energy.attackCap.value;
const CAP_DEFENSE = B.energy.defenseCap.value;
const INVULNERABLE = B.life.invulnerableTicks.value;
const TAP_MAX = B.abilities.tapMaxTicks.value;
const CHARGE = B.abilities.chargeTicks.value;
const SUPER_COST = B.abilities.superCost.value;
const BOMB_TICKS_PER_TILE = B.bombs.ticksPerTile.value;
const BOMB_RANGE = B.bombs.rangeTiles.value;
const SHIELD_TICKS = B.shields.normalTicks.value;
const SUPER_SHIELD_TICKS = B.shields.superTicks.value;
const BALL_TICKS_PER_TILE = B.boss.ballTicksPerTile.value;
const WAVE_TICKS_PER_RING = B.boss.shockwaveTicksPerRing.value;
const WAVE_RINGS = B.boss.shockwaveRings.value;
const RECOVERY = B.boss.recoveryTicks.value;
const MIN_WARNING = B.boss.minWarningTicks.value;

/** Patterns implemented in M2a, with the tier they unlock at (BS-07). */
const M2A_PATTERNS: PatternId[] = [1, 2, 3];
const TIER_ORDER = ['easy', 'medium', 'hard', 'extreme', 'ultimate'] as const;

export function unlockedPatterns(tier: MatchConfig['bossTier']): PatternId[] {
  const rank = TIER_ORDER.indexOf(tier);
  return M2A_PATTERNS.filter((p) => {
    const key = ({ 1: 'orbShot', 2: 'shockwave', 3: 'twinOrbs' } as const)[p];
    return TIER_ORDER.indexOf(B.boss.patterns[key].fromTier.value as typeof tier) <= rank;
  });
}

function warningTicks(p: PatternId): number {
  const key = ({ 1: 'orbShot', 2: 'shockwave', 3: 'twinOrbs' } as const)[p];
  return Math.max(MIN_WARNING, B.boss.patterns[key].warningTicks.value);
}

export function cooldownTicks(state: Pick<MatchState, 'config' | 'boss'>): number {
  const tier = B.boss.tiers[state.config.bossTier];
  const base = tier.cooldownTicks.value;
  const rage =
    tier.rage.value && state.boss.hp * 100 < state.boss.maxHp * B.boss.rageHpFraction.value * 100;
  return rage ? Math.floor(base * B.boss.rageCooldownFactor.value) : base;
}

export function timerTicksFor(size: MatchConfig['size']): number {
  return B.match.timerTicks[size].value;
}

function newPlayer(slot: Slot, maze: Maze): PlayerState {
  const spawn = maze.entrances[slot];
  return {
    slot,
    x: spawn.x,
    y: spawn.y,
    facing: slot === 0 ? SOUTH : NORTH,
    step: null,
    carry: -1,
    held: -1,
    turnDir: -1,
    turnTicks: 0,
    attack: B.energy.attackStart.value,
    defense: B.energy.defenseStart.value,
    life: B.life.start.value,
    voluntary: 0,
    stationary: 0,
    invulnerable: 0,
    bombHold: -1,
    shieldHold: -1,
    startedStep: false,
    hasToken: false,
    stats: {
      bossDamage: 0,
      bombs: 0,
      superBombs: 0,
      shields: 0,
      superShields: 0,
      hitsTaken: 0,
      tilesWalked: 0,
    },
  };
}

/** Creates a match at GO (tick 0, Boss Phase; SIM-06). */
export function createMatch(config: MatchConfig, maze?: Maze): MatchState {
  const cfg: Required<MatchConfig> = { unlimitedTime: false, ...config };
  const m = maze ?? generateMaze(cfg.seed, cfg.size);
  const hp = B.boss.tiers[cfg.bossTier].hp.value;
  const boss: BossState = {
    hp,
    maxHp: hp,
    state: 'cooldown',
    timer: B.boss.tiers[cfg.bossTier].cooldownTicks.value,
    age: 0,
    pattern: 0,
    lastPattern: 0,
    target: -1,
    lastTie: -1,
    lanes: [],
    lastHitTick: -1000,
  };
  return {
    config: cfg,
    maze: m,
    tiles: new Uint8Array(m.tiles),
    tick: 0,
    phase: 'boss',
    revision: 0,
    players: [newPlayer(0, m), newPlayer(1, m)],
    bombs: [],
    shields: [],
    balls: [],
    waves: [],
    boss,
    tokens: null,
    timer: cfg.unlimitedTime ? -1 : timerTicksFor(cfg.size),
    // The match stream is separate from the maze stream but from the same seed.
    rng: (cfg.seed ^ 0x5bd1e995) | 0,
    nextId: 1,
    nextEventId: 1,
    outcome: null,
    events: [],
  };
}

// ---------------------------------------------------------------- helpers

export function tileIndex(s: Pick<MatchState, 'maze'>, x: number, y: number): number {
  return y * s.maze.w + x;
}

function inBounds(s: MatchState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < s.maze.w && y < s.maze.h;
}

function shieldAt(s: MatchState, x: number, y: number) {
  return s.shields.find((sh) => sh.x === x && sh.y === y);
}

/** Base class lets a player stand there (MV-08, without dynamic entities). */
export function floorLike(s: MatchState, x: number, y: number): boolean {
  if (!inBounds(s, x, y)) return false;
  const t = s.tiles[tileIndex(s, x, y)];
  return t === Tile.FLOOR || t === Tile.ENTRANCE;
}

/** MV-08 passable for a player step. */
export function passable(s: MatchState, x: number, y: number): boolean {
  return floorLike(s, x, y) && !shieldAt(s, x, y);
}

/** BM-03 / BS-10 blocker for bombs and balls. */
export function isBlocker(s: MatchState, x: number, y: number): boolean {
  if (!inBounds(s, x, y)) return true;
  const t = s.tiles[tileIndex(s, x, y)];
  if (t === Tile.WALL || t === Tile.DESTRUCTIBLE || t === Tile.SHORTCUT || t === Tile.CORE)
    return true;
  return !!shieldAt(s, x, y);
}

function occupied(s: MatchState, x: number, y: number): boolean {
  return s.players.some((p) => {
    if (p.x === x && p.y === y) return true;
    if (p.step) return p.x + DX[p.step.dir]! === x && p.y + DY[p.step.dir]! === y;
    return false;
  });
}

function emit(s: MatchState, body: EventBody): void {
  s.events.push({ ...body, id: s.nextEventId++, tick: s.tick } as GameEvent);
}

function attackTilesFor(s: MatchState): number {
  return B.energy.presets[s.config.energy].attackTiles.value;
}

function defenseTicksFor(s: MatchState): number {
  return B.energy.presets[s.config.energy].defenseTicks.value;
}

/** True while the boss lives and its core is impassable. */
function bossAlive(s: MatchState): boolean {
  return s.phase === 'boss' && s.boss.hp > 0;
}

// ---------------------------------------------------------------- tick

/**
 * Runs one simulation tick with one command per player. Does nothing when the
 * match is over (SIM-02: only Boss and Escape Phase run ticks). Returns the
 * tick's events (also in `state.events`).
 */
export function stepMatch(s: MatchState, inputs: readonly [PlayerInput, PlayerInput]): GameEvent[] {
  s.events = [];
  if (s.phase === 'over') return s.events;
  const revisionBefore = s.revision;
  let passChange = false;

  // ---- 1. Inputs
  type Release = { slot: Slot; ability: 'bomb' | 'shield'; held: number };
  const releases: Release[] = [];
  for (const p of s.players) {
    const inp = inputs[p.slot];
    p.held = inp.held;
    p.startedStep = false;
    if (inp.pressed !== -1) {
      p.facing = inp.pressed; // MV-07
      p.turnDir = inp.pressed;
      p.turnTicks = TURN_BUFFER;
    }
    for (const ability of ['bomb', 'shield'] as const) {
      const key = ability === 'bomb' ? 'bombHold' : 'shieldHold';
      const down = inp[ability];
      const hold = p[key];
      if (down) {
        if (hold === -1) p[key] = 1;
        else if (hold >= 0) p[key] = hold + 1;
      } else if (hold !== -1) {
        if (hold >= 0) releases.push({ slot: p.slot, ability, held: hold });
        p[key] = -1;
      }
    }
  }

  // 1.2 Shield placements (SH-01 to SH-06), computed together.
  type ShieldReq = { slot: Slot; x: number; y: number; isSuper: boolean };
  const placedNow = new Set<number>();
  const shieldReqs: ShieldReq[] = [];
  for (const r of releases) {
    if (r.ability !== 'shield') continue;
    const p = s.players[r.slot];
    const kind = abilityKind(r.held, p.defense, s.phase === 'escape' && !hasSuperShield(s, p.slot));
    if (kind === 'cancel') continue;
    const cost = kind === 'super' ? SUPER_COST : B.shields.normalCost.value;
    const ox = p.step ? p.x + DX[p.step.dir]! : p.x;
    const oy = p.step ? p.y + DY[p.step.dir]! : p.y;
    const x = ox + DX[p.facing]!;
    const y = oy + DY[p.facing]!;
    if (p.defense < cost || !shieldLegal(s, x, y)) {
      emit(s, { type: 'ability-rejected', slot: p.slot, ability: 'shield' });
      continue;
    }
    shieldReqs.push({ slot: p.slot, x, y, isSuper: kind === 'super' });
  }
  for (const req of shieldReqs) {
    const clash = shieldReqs.some((o) => o !== req && o.x === req.x && o.y === req.y);
    if (clash) {
      emit(s, { type: 'ability-rejected', slot: req.slot, ability: 'shield' }); // SH-06
      continue;
    }
    const p = s.players[req.slot];
    p.defense -= req.isSuper ? SUPER_COST : B.shields.normalCost.value;
    placedNow.add(s.nextId);
    s.shields.push({
      id: s.nextId++,
      owner: req.slot,
      x: req.x,
      y: req.y,
      isSuper: req.isSuper,
      ticksLeft: req.isSuper ? SUPER_SHIELD_TICKS : SHIELD_TICKS,
    });
    if (req.isSuper) p.stats.superShields++;
    else p.stats.shields++;
    passChange = true;
    emit(s, { type: 'shield-placed', slot: req.slot, isSuper: req.isSuper, x: req.x, y: req.y });
    // SH-02: a boss ball on the tile is destroyed.
    s.balls = s.balls.filter((b) => {
      if (b.x !== req.x || b.y !== req.y) return true;
      emit(s, { type: 'ball-destroyed', x: b.x, y: b.y });
      return false;
    });
  }
  // Bomb throws (BM-01, BM-02).
  for (const r of releases) {
    if (r.ability !== 'bomb') continue;
    const p = s.players[r.slot];
    const kind = abilityKind(r.held, p.attack, true);
    if (kind === 'cancel') continue;
    const cost = kind === 'super' ? SUPER_COST : B.bombs.normalCost.value;
    if (p.attack < cost) {
      emit(s, { type: 'ability-rejected', slot: p.slot, ability: 'bomb' });
      continue;
    }
    p.attack -= cost;
    const bomb: Bomb = {
      id: s.nextId++,
      owner: p.slot,
      x: p.x,
      y: p.y,
      dir: p.facing,
      isSuper: kind === 'super',
      age: 0,
      moved: 0,
    };
    s.bombs.push(bomb);
    if (bomb.isSuper) p.stats.superBombs++;
    else p.stats.bombs++;
    emit(s, { type: 'bomb-thrown', slot: p.slot, isSuper: bomb.isSuper, bomb: bomb.id });
  }

  // 1.3 Step decisions for players at rest (MV-05).
  for (const p of s.players) {
    if (p.step) continue;
    let dir: Dir | -1 = -1;
    if (p.turnDir !== -1 && passable(s, p.x + DX[p.turnDir]!, p.y + DY[p.turnDir]!))
      dir = p.turnDir;
    else if (p.held !== -1 && passable(s, p.x + DX[p.held]!, p.y + DY[p.held]!)) dir = p.held;
    if (dir !== -1) {
      p.step = { dir, progress: p.carry > 0 ? p.carry : 0 };
      p.facing = dir; // D-05: facing is also the direction the player moves
      p.startedStep = true;
      if (dir === p.turnDir) p.turnDir = -1;
    }
    p.carry = -1; // MV-04: carry only into the very next decision
  }
  for (const p of s.players) {
    if (p.turnDir !== -1 && --p.turnTicks <= 0) p.turnDir = -1;
  }

  // ---- 2. Step progress (2.1); teleports (2.2) arrive in M2b.
  for (const p of s.players) {
    if (!p.step) continue;
    p.step.progress += OWN_SPEED;
    if (p.attack < CAP_ATTACK) {
      p.voluntary += OWN_SPEED; // EN-02
      const need = attackTilesFor(s) * UNITS;
      if (p.voluntary >= need) {
        p.voluntary -= need;
        p.attack++;
        emit(s, { type: 'attack-gained', slot: p.slot, attack: p.attack });
      }
    }
    if (p.step.progress >= UNITS) {
      p.x += DX[p.step.dir]!;
      p.y += DY[p.step.dir]!;
      p.carry = p.step.progress - UNITS;
      p.step = null;
      p.stats.tilesWalked++;
    }
  }

  // ---- 3. Environment
  // 3.1 timers
  s.shields = s.shields.filter((sh) => {
    if (placedNow.has(sh.id)) return true; // the placement tick is the first of its 90
    if (--sh.ticksLeft > 0) return true;
    passChange = true;
    emit(s, { type: 'shield-removed', x: sh.x, y: sh.y, broken: false });
    return false;
  });
  for (const p of s.players) if (p.invulnerable > 0) p.invulnerable--;
  // 3.2 pickups: M2b.
  // 3.3 token pickup (FL-02)
  if (s.tokens) {
    for (const p of s.players) {
      const t = s.tokens[p.slot];
      if (!t.taken && p.x === t.x && p.y === t.y) {
        t.taken = true;
        p.hasToken = true;
        emit(s, { type: 'token-picked', slot: p.slot });
      }
    }
  }
  // 3.4 boss state machine; spawned attacks act from step 4 of the next tick.
  const spawnedBalls: Ball[] = [];
  const spawnedWaves: Wave[] = [];
  if (bossAlive(s)) advanceBoss(s, spawnedBalls, spawnedWaves);

  // ---- 4. Hits
  const hits = [0, 0];
  // 4.1 advance bombs and balls by their cadence
  const exploding: { bomb: Bomb; x: number; y: number; contact: number }[] = [];
  for (const b of s.bombs) {
    b.age++;
    const advanceTick = b.age % BOMB_TICKS_PER_TILE === 0;
    if (b.age === 1 || advanceTick) {
      const nx = b.x + DX[b.dir]!;
      const ny = b.y + DY[b.dir]!;
      if (isBlocker(s, nx, ny)) {
        exploding.push({
          bomb: b,
          x: b.x,
          y: b.y,
          contact: inBounds(s, nx, ny) ? tileIndex(s, nx, ny) : -1,
        });
        continue;
      }
      if (advanceTick) {
        b.x = nx;
        b.y = ny;
        b.moved++;
        if (b.moved >= BOMB_RANGE) exploding.push({ bomb: b, x: b.x, y: b.y, contact: -1 });
      }
    }
  }
  const ballFrom = new Map<number, { x: number; y: number }>();
  s.balls = s.balls.filter((ball) => {
    ball.age++;
    ballFrom.set(ball.id, { x: ball.x, y: ball.y });
    if (ball.age % BALL_TICKS_PER_TILE !== 0) return true;
    const nx = ball.x + DX[ball.dir]!;
    const ny = ball.y + DY[ball.dir]!;
    if (isBlocker(s, nx, ny)) {
      emit(s, { type: 'ball-destroyed', x: ball.x, y: ball.y }); // BS-10
      return false;
    }
    ball.x = nx;
    ball.y = ny;
    return true;
  });
  // Bomb meets ball: same tile, or the two swapped tiles (BM-03).
  for (const b of s.bombs) {
    if (exploding.some((e) => e.bomb === b)) continue;
    const meets = s.balls.some((ball) => {
      if (ball.x === b.x && ball.y === b.y) return true;
      const from = ballFrom.get(ball.id)!;
      const bx = b.x - DX[b.dir]!;
      const by = b.y - DY[b.dir]!;
      return from.x === b.x && from.y === b.y && ball.x === bx && ball.y === by;
    });
    if (meets) exploding.push({ bomb: b, x: b.x, y: b.y, contact: -1 });
  }
  // 4.2 blasts from the state at the start of the step (BM-05)
  const blasts = exploding.map((e) => ({
    ...e,
    tiles: blastFootprint(
      s,
      e.x,
      e.y,
      e.bomb.isSuper ? B.bombs.superBlastRadius.value : B.bombs.normalBlastRadius.value,
      e.contact,
    ),
  }));
  s.bombs = s.bombs.filter((b) => !exploding.some((e) => e.bomb === b));
  // 4.3 apply blast effects (BM-06)
  const coreAlive = bossAlive(s);
  for (const blast of blasts) {
    const set = new Set(blast.tiles);
    emit(s, {
      type: 'blast',
      slot: blast.bomb.owner,
      isSuper: blast.bomb.isSuper,
      x: blast.x,
      y: blast.y,
      tiles: blast.tiles,
    });
    s.balls = s.balls.filter((ball) => {
      if (!set.has(tileIndex(s, ball.x, ball.y))) return true;
      emit(s, { type: 'ball-destroyed', x: ball.x, y: ball.y });
      return false;
    });
    if (blast.bomb.isSuper) {
      for (const i of blast.tiles) {
        if (s.tiles[i] === Tile.DESTRUCTIBLE) {
          s.tiles[i] = Tile.FLOOR; // ENV-WA-02
          passChange = true;
          emit(s, { type: 'wall-destroyed', x: i % s.maze.w, y: Math.floor(i / s.maze.w) });
        }
      }
      s.shields = s.shields.filter((sh) => {
        if (!set.has(tileIndex(s, sh.x, sh.y))) return true;
        passChange = true;
        emit(s, { type: 'shield-removed', x: sh.x, y: sh.y, broken: true });
        return false;
      });
    }
    if (coreAlive && s.boss.hp > 0 && blast.tiles.some((i) => s.tiles[i] === Tile.CORE)) {
      const dmg = Math.min(
        s.boss.hp,
        blast.bomb.isSuper ? B.bombs.superBossDamage.value : B.bombs.normalBossDamage.value,
      );
      s.boss.hp -= dmg;
      s.boss.lastHitTick = s.tick;
      s.players[blast.bomb.owner].stats.bossDamage += dmg; // BM-07
      emit(s, { type: 'boss-damaged', slot: blast.bomb.owner, amount: dmg, hp: s.boss.hp });
    }
  }
  // 4.4 boss attacks against players
  s.balls = s.balls.filter((ball) => {
    let hit = false;
    for (const p of s.players) {
      if (p.x === ball.x && p.y === ball.y && p.invulnerable === 0) {
        hits[p.slot]!++;
        hit = true;
      }
    }
    if (hit) emit(s, { type: 'ball-destroyed', x: ball.x, y: ball.y });
    return !hit;
  });
  s.waves = s.waves.filter((wave) => {
    wave.age++;
    if (wave.age > 1) {
      if ((wave.age - 1) % WAVE_TICKS_PER_RING !== 0) return true;
      if (wave.radius >= wave.maxRadius) return false;
      wave.radius++;
      wave.reached = waveFront(s, wave.reached, wave.radius);
    }
    const set = new Set(wave.reached);
    for (const p of s.players)
      if (p.invulnerable === 0 && set.has(tileIndex(s, p.x, p.y))) hits[p.slot]!++;
    return true;
  });
  // 4.5 traps: M2b.
  // 4.6 apply hits (EN-06): at most 1 Life per player per tick.
  for (const p of s.players) {
    if (hits[p.slot]! > 0 && p.invulnerable === 0 && p.life > 0) {
      p.life = Math.max(0, p.life - B.life.maxLossPerTick.value);
      p.invulnerable = INVULNERABLE;
      p.stats.hitsTaken++;
      if (p.bombHold >= 0) p.bombHold = -2; // charge cancelled, no cost
      if (p.shieldHold >= 0) p.shieldHold = -2;
      emit(s, { type: 'player-hit', slot: p.slot, life: p.life });
    }
  }
  s.balls.push(...spawnedBalls);
  s.waves.push(...spawnedWaves);

  // ---- 5. Knock-outs
  const ko = s.players.map((p) => p.life <= 0);
  for (const p of s.players) if (ko[p.slot]) emit(s, { type: 'knockout', slot: p.slot });

  // ---- 6. Boss defeat → flip (FL-01)
  if (s.phase === 'boss' && s.boss.hp <= 0 && !ko[0] && !ko[1]) {
    flip(s);
    passChange = true;
  }

  // ---- 7. Escapes (FL-03)
  const escaped = s.players.map((p) => {
    if (ko[p.slot] || !p.hasToken || s.phase !== 'escape') return false;
    const exit = s.maze.entrances[1 - p.slot]!;
    return p.x === exit.x && p.y === exit.y;
  });
  for (const p of s.players) if (escaped[p.slot]) emit(s, { type: 'escaped', slot: p.slot });

  // ---- 8. Timer
  let timedOut = false;
  if (s.timer > 0) {
    s.timer--;
    if (B.match.urgencyCueTicksRemaining.value.includes(s.timer))
      emit(s, { type: 'urgency', ticksLeft: s.timer });
    if (s.timer === 0) timedOut = true;
  }
  const code = (slot: number) => (ko[slot] ? 'K' : escaped[slot] ? 'E' : '-');
  const outcome = resolveOutcome(code(0), code(1), timedOut);
  if (outcome) finish(s, { ...outcome, tick: s.tick, states: [code(0), code(1)] });

  // ---- 9. Bookkeeping
  for (const p of s.players) {
    const eligible =
      p.held === -1 &&
      p.turnDir === -1 &&
      !p.step &&
      !p.startedStep &&
      p.bombHold < 0 &&
      p.shieldHold < 0 &&
      !s.shields.some((sh) => sh.owner === p.slot) &&
      p.defense < CAP_DEFENSE;
    if (!eligible) {
      p.stationary = 0;
      continue;
    }
    if (++p.stationary >= defenseTicksFor(s)) {
      p.stationary = 0;
      p.defense++;
      emit(s, { type: 'defense-gained', slot: p.slot, defense: p.defense });
    }
  }
  if (passChange) s.revision = revisionBefore + 1; // MZ-08
  s.tick++;
  return s.events;
}

/** CH-02 to CH-04: tap, Super or cancel at release. */
function abilityKind(
  held: number,
  energy: number,
  superAllowed: boolean,
): 'tap' | 'super' | 'cancel' {
  if (held <= TAP_MAX) return 'tap';
  if (held >= CHARGE && energy >= SUPER_COST && superAllowed) return 'super';
  return 'cancel';
}

function hasSuperShield(s: MatchState, slot: Slot): boolean {
  return s.shields.some((sh) => sh.owner === slot && sh.isSuper);
}

/** SH-02 placement rule. */
export function shieldLegal(s: MatchState, x: number, y: number): boolean {
  if (!floorLike(s, x, y) || occupied(s, x, y) || shieldAt(s, x, y)) return false;
  if (s.tokens?.some((t) => !t.taken && t.x === x && t.y === y)) return false;
  return true;
}

/** BM-05 blast footprint (tile indices, sorted). */
export function blastFootprint(
  s: MatchState,
  x: number,
  y: number,
  radius: number,
  contact: number,
): number[] {
  const seen = new Map<number, number>();
  const start = tileIndex(s, x, y);
  seen.set(start, 0);
  const queue = [start];
  while (queue.length > 0) {
    const i = queue.shift()!;
    const d = seen.get(i)!;
    const ix = i % s.maze.w;
    const iy = (i - ix) / s.maze.w;
    if (d > 0 && isBlocker(s, ix, iy)) continue; // blockers are the last tile of a path
    if (d === radius) continue;
    for (let k = 0; k < 4; k++) {
      const nx = ix + DX[k]!;
      const ny = iy + DY[k]!;
      if (!inBounds(s, nx, ny)) continue;
      const n = tileIndex(s, nx, ny);
      if (seen.has(n)) continue;
      seen.set(n, d + 1);
      queue.push(n);
    }
  }
  if (contact >= 0) seen.set(contact, 1);
  return [...seen.keys()].sort((a, b) => a - b);
}

/** BS-12: tiles at `radius` reached from the previous front without crossing blockers. */
function waveFront(s: MatchState, previous: readonly number[], radius: number): number[] {
  const { w, cx, cy } = s.maze;
  const reached = new Set<number>();
  const queue: number[] = [];
  const consider = (x: number, y: number) => {
    if (!inBounds(s, x, y) || chebyshev(x, y, cx, cy) !== radius || isBlocker(s, x, y)) return;
    const i = y * w + x;
    if (reached.has(i)) return;
    reached.add(i);
    queue.push(i);
  };
  for (const i of previous) {
    const x = i % w;
    const y = (i - x) / w;
    for (let k = 0; k < 4; k++) consider(x + DX[k]!, y + DY[k]!);
  }
  while (queue.length > 0) {
    const i = queue.shift()!;
    const x = i % w;
    const y = (i - x) / w;
    for (let k = 0; k < 4; k++) consider(x + DX[k]!, y + DY[k]!);
  }
  return [...reached].sort((a, b) => a - b);
}

/** First front of a shockwave: every non-blocked tile at coreRadius + 1. */
function firstFront(s: MatchState): number[] {
  const { w, cx, cy, coreRadius } = s.maze;
  const r = coreRadius + 1;
  const out: number[] = [];
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if (chebyshev(x, y, cx, cy) === r && !isBlocker(s, x, y)) out.push(y * w + x);
  return out;
}

/** BS-08: the Orb Shot lane toward a player. */
export function laneToward(s: MatchState, slot: Slot): Lane {
  const { cx, cy, coreRadius } = s.maze;
  const p = s.players[slot];
  const dx = p.x - cx;
  const dy = p.y - cy;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  if (Math.abs(dy) >= Math.abs(dx)) {
    const dir: Dir = dy < 0 ? 0 : 2;
    const x = clamp(cx + dx, cx - coreRadius, cx + coreRadius);
    return { x, y: cy + (dir === 0 ? -(coreRadius + 1) : coreRadius + 1), dir };
  }
  const dir: Dir = dx > 0 ? 1 : 3;
  const y = clamp(cy + dy, cy - coreRadius, cy + coreRadius);
  return { x: cx + (dir === 1 ? coreRadius + 1 : -(coreRadius + 1)), y, dir };
}

function mirrorLane(s: MatchState, lane: Lane): Lane {
  return { x: s.maze.w - 1 - lane.x, y: s.maze.h - 1 - lane.y, dir: opposite(lane.dir) };
}

/** BS-05 target choice: nearest by Manhattan distance; ties alternate. */
function chooseTarget(s: MatchState): Slot {
  const { cx, cy } = s.maze;
  const d = s.players.map((p) => Math.abs(p.x - cx) + Math.abs(p.y - cy));
  if (d[0]! < d[1]!) return 0;
  if (d[1]! < d[0]!) return 1;
  const pick: Slot = s.boss.lastTie === -1 ? (nextInt(s, 2) as Slot) : s.boss.lastTie === 0 ? 1 : 0;
  s.boss.lastTie = pick;
  return pick;
}

function advanceBoss(s: MatchState, balls: Ball[], waves: Wave[]): void {
  const boss = s.boss;
  // A state entered on tick T with timer N lasts ticks T … T+N−1; the first
  // cooldown is entered at tick 0 (BS-02).
  if (boss.timer > 0) {
    boss.age++;
  } else {
    boss.age = 0;
    transitionBoss(s, balls, waves);
  }
  boss.timer--;
}

function transitionBoss(s: MatchState, balls: Ball[], waves: Wave[]): void {
  const boss = s.boss;
  switch (boss.state) {
    case 'cooldown': {
      // BS-04: uniform among unlocked patterns, no immediate repeat.
      const pool = unlockedPatterns(s.config.bossTier).filter(
        (p, _i, all) => all.length === 1 || p !== boss.lastPattern,
      );
      const pattern = pool[nextInt(s, pool.length)]!;
      boss.pattern = pattern;
      boss.target = chooseTarget(s);
      boss.lanes = [];
      if (pattern === 1 || pattern === 3) {
        const lane = laneToward(s, boss.target);
        boss.lanes.push(lane);
        if (pattern === 3) boss.lanes.push(mirrorLane(s, lane));
      }
      boss.state = 'warning';
      boss.timer = warningTicks(pattern);
      emit(s, { type: 'boss-warning', pattern, target: boss.target });
      return;
    }
    case 'warning': {
      const pattern = boss.pattern as PatternId;
      if (pattern === 2) {
        waves.push({
          id: s.nextId++,
          radius: s.maze.coreRadius + 1,
          maxRadius: s.maze.coreRadius + WAVE_RINGS,
          age: 0,
          reached: firstFront(s),
        });
      } else {
        for (const lane of boss.lanes) {
          if (isBlocker(s, lane.x, lane.y)) continue; // a shield on the spawn tile stops it
          balls.push({ id: s.nextId++, x: lane.x, y: lane.y, dir: lane.dir, age: 0 });
        }
      }
      boss.state = 'attack';
      boss.timer = 1;
      emit(s, { type: 'boss-attack', pattern });
      return;
    }
    case 'attack':
      boss.state = 'recovery';
      boss.timer = RECOVERY;
      return;
    case 'recovery':
      boss.lastPattern = boss.pattern;
      boss.pattern = 0;
      boss.lanes = [];
      boss.target = -1;
      boss.state = 'cooldown';
      boss.timer = cooldownTicks(s);
      return;
    case 'defeated':
      return;
  }
}

/** FL-01: the phase flip, all on one tick. */
function flip(s: MatchState): void {
  s.phase = 'escape';
  for (let i = 0; i < s.tiles.length; i++) {
    if (s.tiles[i] === Tile.CORE || s.tiles[i] === Tile.SHORTCUT) s.tiles[i] = Tile.FLOOR;
  }
  const [t1, t2] = s.maze.tokenTiles;
  s.tokens = [
    { x: t1.x, y: t1.y, taken: false },
    { x: t2.x, y: t2.y, taken: false },
  ];
  s.balls = [];
  s.waves = [];
  s.boss.state = 'defeated';
  s.boss.pattern = 0;
  s.boss.lanes = [];
  s.boss.target = -1;
  emit(s, { type: 'phase-escape' });
  emit(s, { type: 'tokens-spawned' });
}

/** OC-01 in-tick outcome matrix. */
export function resolveOutcome(
  p1: string,
  p2: string,
  timedOut: boolean,
): Pick<Outcome, 'winner' | 'reason'> | null {
  if (p1 === 'K' && p2 === 'K') return { winner: -1, reason: 'knockout' };
  if (p1 === 'E' && p2 === 'E') return { winner: -1, reason: 'escape' };
  if (p2 === 'K') return { winner: 0, reason: p1 === 'E' ? 'escape' : 'knockout' };
  if (p1 === 'K') return { winner: 1, reason: p2 === 'E' ? 'escape' : 'knockout' };
  if (p1 === 'E') return { winner: 0, reason: 'escape' };
  if (p2 === 'E') return { winner: 1, reason: 'escape' };
  if (timedOut) return { winner: -1, reason: 'timer' };
  return null;
}

function finish(s: MatchState, outcome: Outcome): void {
  s.outcome = outcome;
  s.phase = 'over';
  emit(s, { type: 'match-over', outcome });
}

/**
 * OC-04 outside the tick: one or both players choose Leave. Processed before
 * the next tick; the other player wins by forfeit, both leaving is a draw.
 */
export function leaveMatch(s: MatchState, slots: readonly Slot[]): Outcome | null {
  if (s.phase === 'over' || slots.length === 0) return s.outcome;
  s.events = [];
  const both = slots.includes(0) && slots.includes(1);
  const winner: Slot | -1 = both ? -1 : slots[0] === 0 ? 1 : 0;
  finish(s, {
    winner,
    reason: both ? 'both-left' : 'forfeit',
    tick: s.tick,
    states: [slots.includes(0) ? 'L' : '-', slots.includes(1) ? 'L' : '-'],
  });
  return s.outcome;
}
