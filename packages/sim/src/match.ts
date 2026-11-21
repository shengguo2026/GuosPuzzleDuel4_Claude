/**
 * The match simulation (WP 2a.1 to 2a.8, 2b.1 to 2b.8): one call of
 * `stepMatch` runs one host tick through the fixed pipeline of MECHANICS.md
 * section 17. Both players are processed symmetrically (SIM-05): every step
 * computes from the state at its start and applies the results together.
 *
 * Environment (M2b): traps, teleporters, boost, ice, conveyors, pickups,
 * timed gates, fog and darkness, boss walls and boss patterns 4–8.
 */
import { balance } from '@gpd4/rules';
import { advanceBoss, inRainZone, waveFront as waveFrontOf, type BossSpawns } from './boss.js';
import { generateMaze } from './maze.js';
import {
  DX,
  DY,
  NORTH,
  PICKUP_KINDS,
  SOUTH,
  TRAP_KINDS,
  Tile,
  opposite,
  type Bomb,
  type BossState,
  type Dir,
  type EnvEntity,
  type GameEvent,
  type MatchConfig,
  type MatchState,
  type Maze,
  type Outcome,
  type PlayerInput,
  type PlayerState,
  type Slot,
  type Step,
  type StepKind,
} from './types.js';
import {
  emit,
  envAt,
  floorLike,
  inBounds,
  isBlocker,
  isIce,
  occupied,
  passable,
  removeEnv,
  shieldAt,
  shockDangerous,
  tileIndex,
  trapActive,
  trapAt,
} from './world.js';

const B = balance;
const UNITS = B.movement.unitsPerTile.value;
const OWN_SPEED = B.movement.ownUnitsPerTick.value;
const BOOST_SPEED = B.terrain.boostOwnUnitsPerTick.value;
const ICE_SPEED = B.movement.iceUnitsPerTick.value;
const PUSH_SPEED = B.movement.conveyorUnitsPerTick.value;
const WITH_EXTRA = B.terrain.conveyorWithArrowUnitsPerTick.value - OWN_SPEED;
const TURN_BUFFER = B.movement.keyboardTurnBufferTicks.value;
const CAP_ATTACK = B.energy.attackCap.value;
const CAP_DEFENSE = B.energy.defenseCap.value;
const CAP_LIFE = B.life.cap.value;
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
const SHOCK_PERIOD = B.traps.shockSafeTicks.value + B.traps.shockDangerTicks.value;

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
    boost: 0,
    immobile: 0,
    tpCooldown: 0,
    pending: -1,
    slideDir: -1,
    entered: false,
    forced: false,
    hasToken: false,
    stats: {
      bossDamage: 0,
      bombs: 0,
      superBombs: 0,
      shields: 0,
      superShields: 0,
      hitsTaken: 0,
      tilesWalked: 0,
      pickups: 0,
      trapsTriggered: 0,
      teleports: 0,
    },
  };
}

/** Creates a match at GO (tick 0, Boss Phase; SIM-06). */
export function createMatch(config: MatchConfig, maze?: Maze): MatchState {
  const cfg: Required<MatchConfig> = { unlimitedTime: false, environment: true, ...config };
  const m = maze ?? generateMaze(cfg.seed, cfg.size, { environment: cfg.environment });
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
    marks: [],
    markKinds: [],
    lastHitTick: -1000,
  };
  const env = (m.env ?? []).map((e) => ({ ...e }));
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
    env,
    darkness: 0,
    balls: [],
    waves: [],
    boss,
    tokens: null,
    timer: cfg.unlimitedTime ? -1 : timerTicksFor(cfg.size),
    // The match stream is separate from the maze stream but from the same seed.
    rng: (cfg.seed ^ 0x5bd1e995) | 0,
    nextId: env.reduce((n, e) => Math.max(n, e.id), 0) + 1,
    nextEventId: 1,
    outcome: null,
    events: [],
  };
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

/** MV-02: units per tick and the player's own share for a step this tick. */
function stepSpeed(p: PlayerState, kind: StepKind): { total: number; own: number } {
  const own = p.boost > 0 ? BOOST_SPEED : OWN_SPEED;
  switch (kind) {
    case 'own':
      return { total: own, own };
    case 'with':
      return { total: own + WITH_EXTRA, own };
    case 'ice':
      return { total: ICE_SPEED, own: 0 };
    case 'push':
      return { total: PUSH_SPEED, own: 0 };
  }
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
  /** Tiles whose passability changed this tick (MZ-08). */
  const changed = new Set<number>();

  // ---- 1. Inputs
  type Release = { slot: Slot; ability: 'bomb' | 'shield'; held: number };
  const releases: Release[] = [];
  for (const p of s.players) {
    const inp = inputs[p.slot];
    p.held = inp.held;
    p.startedStep = false;
    p.entered = false;
    p.forced = false;
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
    changed.add(tileIndex(s, req.x, req.y));
    emit(s, { type: 'shield-placed', slot: req.slot, isSuper: req.isSuper, x: req.x, y: req.y });
    // SH-04: a trap on the tile (maze or boss, any state) is destroyed.
    const trap = trapAt(s, req.x, req.y);
    if (trap) {
      removeEnv(s, trap);
      emit(s, { type: 'trap-destroyed', kind: trap.kind, x: req.x, y: req.y });
    }
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

  // 1.3 Step decisions for players at rest (MV-05): ice slide > conveyor > own input.
  for (const p of s.players) {
    if (p.step) continue;
    const carry = p.carry;
    p.carry = -1; // MV-04: carry only into the very next decision
    if (p.immobile > 0) {
      p.forced = true; // MV-09, TR-09
      continue;
    }
    const start = (dir: Dir, kind: StepKind) => {
      p.step = { dir, kind, progress: carry > 0 ? carry : 0 };
      if (kind === 'own' || kind === 'with') {
        p.facing = dir; // D-05: facing follows the player's own movement
        p.startedStep = true;
      } else p.forced = true;
      if (dir === p.turnDir) p.turnDir = -1;
      p.slideDir = -1;
      p.pending = -1; // TP-03: leaving the pad cancels a pending teleport
    };
    const can = (d: Dir) => passable(s, p.x + DX[d]!, p.y + DY[d]!);
    // TE-02: keep sliding on ice.
    if (p.slideDir !== -1 && isIce(s, p.x, p.y)) {
      if (can(p.slideDir)) {
        start(p.slideDir, 'ice');
        continue;
      }
    }
    p.slideDir = -1;
    let own: Dir | -1 = -1;
    if (p.turnDir !== -1 && can(p.turnDir)) own = p.turnDir;
    else if (p.held !== -1 && can(p.held)) own = p.held;
    const conveyor = envAt(s, p.x, p.y, 'conveyor');
    if (conveyor && conveyor.dir !== -1) {
      // TE-05 decision table. Every row is ineligible for Defense.
      const c = conveyor.dir;
      const want: Dir | -1 = own !== -1 ? own : p.held;
      p.forced = true;
      if (want === c) {
        if (can(c)) start(c, 'with');
      } else if (want !== -1 && want === opposite(c)) {
        // Against the arrow: push and input cancel; the player stays.
      } else if (want !== -1 && own === want) {
        start(want, 'own'); // sideways: stepping off is always possible
      } else if (can(c)) {
        start(c, 'push');
      }
      continue;
    }
    if (own !== -1) start(own, 'own');
  }
  for (const p of s.players) {
    if (p.turnDir !== -1 && --p.turnTicks <= 0) p.turnDir = -1;
  }

  // ---- 2. Forced movement and step progress
  // 2.1 advance all steps; players reaching 300 enter their destination.
  const boostedNow = [false, false];
  for (const p of s.players) {
    if (!p.step) continue;
    const { total, own } = stepSpeed(p, p.step.kind);
    p.step.progress += total;
    if (own > 0 && p.attack < CAP_ATTACK) {
      p.voluntary += own; // EN-02: only the player's own share
      const need = attackTilesFor(s) * UNITS;
      if (p.voluntary >= need) {
        p.voluntary -= need;
        p.attack++;
        emit(s, { type: 'attack-gained', slot: p.slot, attack: p.attack });
      }
    }
    if (p.step.progress >= UNITS) {
      const step: Step = p.step;
      p.x += DX[step.dir]!;
      p.y += DY[step.dir]!;
      p.carry = step.progress - UNITS;
      p.step = null;
      p.entered = true;
      if (step.kind === 'own' || step.kind === 'with') p.stats.tilesWalked++;
      else p.forced = true;
      // TE-02: a step that ends on ice keeps sliding in its direction.
      p.slideDir = isIce(s, p.x, p.y) ? step.dir : -1;
      // TE-01: entering a boost refreshes it to 90 ticks.
      if (envAt(s, p.x, p.y, 'boost')) {
        if (p.boost === 0) emit(s, { type: 'boosted', slot: p.slot });
        p.boost = B.terrain.boostTicks.value;
        boostedNow[p.slot] = true;
      }
      // TP-02: entering a pad with no cooldown makes the player pending.
      const pad = envAt(s, p.x, p.y, 'pad');
      if (pad && p.tpCooldown === 0) p.pending = pad.id;
    }
  }
  // 2.2 teleports (TP-02 to TP-05).
  teleport(s);

  // ---- 3. Environment
  // 3.1 timers
  s.shields = s.shields.filter((sh) => {
    if (placedNow.has(sh.id)) return true; // the placement tick is the first of its 90
    if (--sh.ticksLeft > 0) return true;
    changed.add(tileIndex(s, sh.x, sh.y));
    emit(s, { type: 'shield-removed', x: sh.x, y: sh.y, broken: false });
    return false;
  });
  for (const p of s.players) {
    if (p.invulnerable > 0) p.invulnerable--;
    if (p.immobile > 0) p.immobile--;
    if (p.tpCooldown > 0) p.tpCooldown--;
    if (p.boost > 0 && !boostedNow[p.slot]) p.boost--;
  }
  if (s.darkness > 0) s.darkness--;
  environmentTimers(s, changed);
  // 3.2 pickups (PU-03, PU-04)
  collectPickups(s);
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
  const spawns: BossSpawns = { balls: [], waves: [], rain: [] };
  if (bossAlive(s)) advanceBoss(s, spawns, changed);

  // ---- 4. Hits
  const hits = [0, 0];
  const immobilize = [0, 0];
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
          changed.add(i);
          emit(s, { type: 'wall-destroyed', x: i % s.maze.w, y: Math.floor(i / s.maze.w) });
        }
      }
      // ENV-WA-03: a Super Bomb removes boss walls in its footprint.
      for (const e of s.env.filter(
        (e) => e.kind === 'bossWall' && set.has(tileIndex(s, e.x, e.y)),
      )) {
        removeEnv(s, e);
        changed.add(tileIndex(s, e.x, e.y));
        emit(s, { type: 'boss-wall', x: e.x, y: e.y, raised: false });
      }
      s.shields = s.shields.filter((sh) => {
        if (!set.has(tileIndex(s, sh.x, sh.y))) return true;
        changed.add(tileIndex(s, sh.x, sh.y));
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
      wave.reached = waveFrontOf(s, wave.reached, wave.radius);
    }
    const set = new Set(wave.reached);
    for (const p of s.players)
      if (p.invulnerable === 0 && set.has(tileIndex(s, p.x, p.y))) hits[p.slot]!++;
    return true;
  });
  // Ball Rain resolves on its attack tick; shields, walls and bombs do not stop it (BS-07).
  for (const centre of spawns.rain)
    for (const p of s.players)
      if (p.invulnerable === 0 && inRainZone(s, centre, p.x, p.y)) hits[p.slot]!++;
  // 4.5 traps (TR-02 to TR-06)
  for (const trap of s.env.filter((e) => TRAP_KINDS.includes(e.kind) && trapActive(e))) {
    let consumed = false;
    for (const p of s.players) {
      if (p.x !== trap.x || p.y !== trap.y || p.invulnerable > 0) continue; // TR-06
      if (trap.kind === 'spike') {
        hits[p.slot]!++;
        immobilize[p.slot] = Math.max(immobilize[p.slot]!, B.traps.spikeImmobilizeTicks.value);
        consumed = true;
      } else if (trap.kind === 'snare') {
        immobilize[p.slot] = Math.max(immobilize[p.slot]!, B.traps.snareImmobilizeTicks.value);
        consumed = true;
      } else if (shockDangerous(trap)) {
        hits[p.slot]!++;
      } else continue;
      p.stats.trapsTriggered++;
      emit(s, { type: 'trap-triggered', slot: p.slot, kind: trap.kind, x: trap.x, y: trap.y });
    }
    if (consumed) removeEnv(s, trap); // TR-03, TR-05, TR-08
  }
  // 4.6 apply hits (EN-06): at most 1 Life per player per tick.
  for (const p of s.players) {
    if (immobilize[p.slot]! > 0) p.immobile = Math.max(p.immobile, immobilize[p.slot]!);
    if (hits[p.slot]! > 0 && p.invulnerable === 0 && p.life > 0) {
      p.life = Math.max(0, p.life - B.life.maxLossPerTick.value);
      p.invulnerable = INVULNERABLE;
      p.stats.hitsTaken++;
      if (p.bombHold >= 0) p.bombHold = -2; // charge cancelled, no cost
      if (p.shieldHold >= 0) p.shieldHold = -2;
      emit(s, { type: 'player-hit', slot: p.slot, life: p.life });
    }
  }
  s.balls.push(...spawns.balls);
  s.waves.push(...spawns.waves);

  // ---- 5. Knock-outs
  const ko = s.players.map((p) => p.life <= 0);
  for (const p of s.players) if (ko[p.slot]) emit(s, { type: 'knockout', slot: p.slot });

  // ---- 6. Boss defeat → flip (FL-01)
  if (s.phase === 'boss' && s.boss.hp <= 0 && !ko[0] && !ko[1]) flip(s, changed);

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
      !p.forced &&
      p.immobile === 0 &&
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
  if (changed.size > 0) {
    s.revision++; // MZ-08: one increment and one event per tick with changes
    emit(s, { type: 'revision', revision: s.revision, tiles: [...changed].sort((a, b) => a - b) });
  }
  s.tick++;
  return s.events;
}

/** TP-02 to TP-05: transports for every pending player, computed together. */
function teleport(s: MatchState): void {
  const pendingPad = (slot: Slot): EnvEntity | undefined => {
    const p = s.players[slot];
    if (p.pending === -1 || p.step || p.immobile > 0) return undefined;
    const pad = s.env.find((e) => e.id === p.pending);
    if (!pad || pad.x !== p.x || pad.y !== p.y) {
      p.pending = -1;
      return undefined;
    }
    return pad;
  };
  const moves = new Map<Slot, EnvEntity>();
  for (const slot of [0, 1] as Slot[]) {
    const pad = pendingPad(slot);
    const dest = pad && s.env.find((e) => e.id === pad.link);
    if (dest) moves.set(slot, dest);
  }
  // Drop moves whose destination is not free; a player leaving frees its pad (swap, TP-04).
  let dropped = true;
  while (dropped) {
    dropped = false;
    for (const [slot, dest] of moves) {
      const blockedByPlayer = s.players.some((q) => {
        if (q.slot === slot || moves.has(q.slot)) return false;
        if (q.x === dest.x && q.y === dest.y) return true;
        return !!q.step && q.x + DX[q.step.dir]! === dest.x && q.y + DY[q.step.dir]! === dest.y;
      });
      const gate = envAt(s, dest.x, dest.y, 'gate');
      const free =
        !blockedByPlayer &&
        !shieldAt(s, dest.x, dest.y) &&
        !envAt(s, dest.x, dest.y, 'snare') &&
        !(gate && !gate.open);
      if (!free) {
        moves.delete(slot);
        dropped = true;
      }
    }
  }
  // Same-destination guard (malformed content only): nobody moves.
  const dests = [...moves.values()];
  if (dests.length === 2 && dests[0] === dests[1]) return;
  for (const [slot, dest] of moves) {
    const p = s.players[slot];
    p.x = dest.x;
    p.y = dest.y;
    p.pending = -1; // TP-02: landing never makes the player pending again
    p.tpCooldown = B.teleporters.cooldownTicks.value;
    p.carry = -1;
    p.slideDir = -1;
    p.entered = true; // TP-07: landing counts as entering
    p.forced = true; // TP-06
    p.stats.teleports++;
    emit(s, { type: 'teleported', slot, x: dest.x, y: dest.y });
  }
}

/** Step 3.1 for environment entities: gates, shock cycles and expiring entities. */
function environmentTimers(s: MatchState, changed: Set<number>): void {
  const expired: EnvEntity[] = [];
  for (const e of s.env) {
    if (e.kind === 'gate') {
      e.cycle++;
      if (e.open) {
        if (e.cycle >= e.openTicks || e.pending) {
          if (occupied(s, e.x, e.y))
            e.pending = true; // GA-03: never closes on a player
          else {
            e.open = false;
            e.pending = false;
            e.cycle = 0;
            changed.add(tileIndex(s, e.x, e.y));
            emit(s, { type: 'gate', x: e.x, y: e.y, open: false });
          }
        }
      } else if (e.cycle >= e.closedTicks) {
        e.open = true;
        e.cycle = 0;
        changed.add(tileIndex(s, e.x, e.y));
        emit(s, { type: 'gate', x: e.x, y: e.y, open: true });
      }
      continue;
    }
    if (e.warn > 0) {
      e.warn--; // TR-08: boss traps are harmless in their warning
      continue;
    }
    if (e.kind === 'shock') e.cycle = (e.cycle + 1) % SHOCK_PERIOD;
    if (e.life > 0 && --e.life === 0) expired.push(e);
  }
  for (const e of expired) {
    removeEnv(s, e);
    if (e.kind === 'bossWall') {
      changed.add(tileIndex(s, e.x, e.y));
      emit(s, { type: 'boss-wall', x: e.x, y: e.y, raised: false });
    }
  }
}

/** Step 3.2: PU-01 to PU-05. */
function collectPickups(s: MatchState): void {
  for (const e of s.env.filter((e) => PICKUP_KINDS.includes(e.kind))) {
    const here = s.players.filter((p) => p.entered && p.x === e.x && p.y === e.y);
    if (here.length !== 1) continue; // PU-04: same-tick entry grants nobody
    const p = here[0]!;
    if (e.kind === 'attackOrb') {
      if (p.attack >= CAP_ATTACK) continue; // PU-02: stays at cap
      p.attack++;
    } else if (e.kind === 'defenseOrb') {
      if (p.defense >= CAP_DEFENSE) continue;
      p.defense++;
    } else {
      if (p.life >= CAP_LIFE) continue;
      p.life++;
    }
    p.stats.pickups++;
    removeEnv(s, e); // PU-05: no respawn
    emit(s, { type: 'pickup', slot: p.slot, kind: e.kind, x: e.x, y: e.y });
  }
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
  if (envAt(s, x, y, 'pad', 'bossWall', ...PICKUP_KINDS)) return false;
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

/** FL-01: the phase flip, all on one tick. */
function flip(s: MatchState, changed: Set<number>): void {
  s.phase = 'escape';
  for (let i = 0; i < s.tiles.length; i++) {
    if (s.tiles[i] === Tile.CORE || s.tiles[i] === Tile.SHORTCUT) {
      s.tiles[i] = Tile.FLOOR;
      changed.add(i);
    }
  }
  const [t1, t2] = s.maze.tokenTiles;
  s.tokens = [
    { x: t1.x, y: t1.y, taken: false },
    { x: t2.x, y: t2.y, taken: false },
  ];
  s.balls = [];
  s.waves = [];
  // BOSS-03: boss traps, walls and ice and the darkness are removed.
  for (const e of s.env.filter((e) => e.boss)) {
    removeEnv(s, e);
    if (e.kind === 'bossWall') changed.add(tileIndex(s, e.x, e.y));
  }
  s.darkness = 0;
  s.boss.state = 'defeated';
  s.boss.pattern = 0;
  s.boss.lanes = [];
  s.boss.marks = [];
  s.boss.markKinds = [];
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
