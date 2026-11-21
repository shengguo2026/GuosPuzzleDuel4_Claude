/**
 * Simulation data types. Everything is plain data with integer numbers
 * (SIM-03), so a state can be hashed, copied and sent over the network.
 */

/** Directions: North, East, South, West (MZ-01: North = smaller y). */
export type Dir = 0 | 1 | 2 | 3;
export const NORTH: Dir = 0;
export const EAST: Dir = 1;
export const SOUTH: Dir = 2;
export const WEST: Dir = 3;
export const DX: readonly number[] = [0, 1, 0, -1];
export const DY: readonly number[] = [-1, 0, 1, 0];
export const opposite = (d: Dir): Dir => ((d + 2) % 4) as Dir;
/** The direction a point-symmetric partner uses (180° rotation, MZ-03). */
export const mirrorDir = opposite;

/** Base tile classes (MZ-02). Timed gates arrive in M2b. */
export const Tile = {
  FLOOR: 0,
  WALL: 1,
  DESTRUCTIBLE: 2,
  CORE: 3,
  SHORTCUT: 4,
  ENTRANCE: 5,
} as const;
export type TileClass = (typeof Tile)[keyof typeof Tile];

export type MazeSize = 'small' | 'medium' | 'large';
export const MAZE_SIZES: readonly MazeSize[] = ['small', 'medium', 'large'];
export type BossTier = 'easy' | 'medium' | 'hard' | 'extreme' | 'ultimate';
export const BOSS_TIERS: readonly BossTier[] = ['easy', 'medium', 'hard', 'extreme', 'ultimate'];
export type EnergyPreset = 'tactical' | 'normal' | 'fast';
export const ENERGY_PRESETS: readonly EnergyPreset[] = ['tactical', 'normal', 'fast'];

export interface Point {
  x: number;
  y: number;
}

/** A generated maze (section 2). `tiles` is the immutable starting layout. */
export interface Maze {
  size: MazeSize;
  seed: number;
  w: number;
  h: number;
  tiles: Uint8Array;
  cx: number;
  cy: number;
  coreRadius: number;
  ringRadius: number;
  /** [North (P1 spawn, P2 exit), South (P2 spawn, P1 exit)] (MZ-04). */
  entrances: readonly [Point, Point];
  /** Token tiles: P1 (cx − 1, cy), P2 (cx + 1, cy) (FL-01). */
  tokenTiles: readonly [Point, Point];
  /** Tile indices of the sealed shortcuts (MZ-06). */
  shortcuts: readonly number[];
  /** Attempts the generator needed (re-rolls after a failed route check). */
  attempts: number;
}

export interface MatchConfig {
  seed: number;
  size: MazeSize;
  bossTier: BossTier;
  energy: EnergyPreset;
  /** Unlimited Time is allowed only in Local VS and WiFi VS (FL-05). */
  unlimitedTime?: boolean;
}

/** One player's command for one tick (MV-06, CH-01). */
export interface PlayerInput {
  /** Most recently pressed direction key that is still held, or -1. */
  held: Dir | -1;
  /** A direction pressed since the last tick (creates a turn request and sets facing), or -1. */
  pressed: Dir | -1;
  /** Bomb button is down on this tick. */
  bomb: boolean;
  /** Shield button is down on this tick. */
  shield: boolean;
}

export const NO_INPUT: PlayerInput = Object.freeze({
  held: -1,
  pressed: -1,
  bomb: false,
  shield: false,
}) as PlayerInput;

export type Slot = 0 | 1;

export interface Step {
  dir: Dir;
  /** Progress in units; one tile = 300 units (MV-01). */
  progress: number;
}

export interface PlayerStats {
  bossDamage: number;
  bombs: number;
  superBombs: number;
  shields: number;
  superShields: number;
  hitsTaken: number;
  tilesWalked: number;
}

export interface PlayerState {
  slot: Slot;
  x: number;
  y: number;
  facing: Dir;
  step: Step | null;
  /** Excess progress of the last completed step (MV-04); -1 when none. */
  carry: number;
  held: Dir | -1;
  turnDir: Dir | -1;
  turnTicks: number;
  attack: number;
  defense: number;
  life: number;
  /** Voluntary progress units toward the next Attack segment (EN-02). */
  voluntary: number;
  /** Eligible stationary ticks toward the next Defense segment (EN-03). */
  stationary: number;
  invulnerable: number;
  /** Hold counters (CH-01): -1 up, -2 cancelled until release, else ticks held down (1 on the press tick). */
  bombHold: number;
  shieldHold: number;
  startedStep: boolean;
  hasToken: boolean;
  stats: PlayerStats;
}

export interface Bomb {
  id: number;
  owner: Slot;
  x: number;
  y: number;
  dir: Dir;
  isSuper: boolean;
  age: number;
  moved: number;
}

export interface ShieldEntity {
  id: number;
  owner: Slot;
  x: number;
  y: number;
  isSuper: boolean;
  ticksLeft: number;
}

/** A boss ball (patterns 1 and 3), drawn as a sports ball (D-14, 20 Nov). */
export interface Ball {
  id: number;
  x: number;
  y: number;
  dir: Dir;
  age: number;
}

/** Shockwave front (pattern 2, BS-12). */
export interface Wave {
  id: number;
  radius: number;
  maxRadius: number;
  age: number;
  /** Tile indices the front reached at the current radius. */
  reached: number[];
}

export type PatternId = 1 | 2 | 3;
export const PATTERN_KEYS: Record<PatternId, 'orbShot' | 'shockwave' | 'twinOrbs'> = {
  1: 'orbShot',
  2: 'shockwave',
  3: 'twinOrbs',
};

export interface Lane {
  x: number;
  y: number;
  dir: Dir;
}

export type BossPhase = 'cooldown' | 'warning' | 'attack' | 'recovery' | 'defeated';

export interface BossState {
  hp: number;
  maxHp: number;
  state: BossPhase;
  timer: number;
  /** Ticks spent in the current state. */
  age: number;
  pattern: PatternId | 0;
  lastPattern: PatternId | 0;
  target: Slot | -1;
  /** Slot picked at the previous tie (BS-05), -1 before the first tie. */
  lastTie: Slot | -1;
  /** Ball lanes of the current warning (telegraph). */
  lanes: Lane[];
  /** Tick of the last damage, for the cosmetic hit pose. */
  lastHitTick: number;
}

export type MatchPhase = 'boss' | 'escape' | 'over';

export type OutcomeReason = 'escape' | 'knockout' | 'timer' | 'forfeit' | 'both-left';
export interface Outcome {
  /** Winning slot, or -1 for a draw. */
  winner: Slot | -1;
  reason: OutcomeReason;
  tick: number;
  /** Per-slot end state on the deciding tick: K, E or '-' (OC-01). */
  states: [string, string];
}

export type GameEvent =
  | { id: number; tick: number; type: 'bomb-thrown'; slot: Slot; isSuper: boolean; bomb: number }
  | {
      id: number;
      tick: number;
      type: 'blast';
      slot: Slot;
      isSuper: boolean;
      x: number;
      y: number;
      tiles: number[];
    }
  | {
      id: number;
      tick: number;
      type: 'shield-placed';
      slot: Slot;
      isSuper: boolean;
      x: number;
      y: number;
    }
  | { id: number; tick: number; type: 'shield-removed'; x: number; y: number; broken: boolean }
  | { id: number; tick: number; type: 'ability-rejected'; slot: Slot; ability: 'bomb' | 'shield' }
  | { id: number; tick: number; type: 'wall-destroyed'; x: number; y: number }
  | { id: number; tick: number; type: 'boss-damaged'; slot: Slot; amount: number; hp: number }
  | { id: number; tick: number; type: 'boss-warning'; pattern: PatternId; target: Slot }
  | { id: number; tick: number; type: 'boss-attack'; pattern: PatternId }
  | { id: number; tick: number; type: 'ball-destroyed'; x: number; y: number }
  | { id: number; tick: number; type: 'player-hit'; slot: Slot; life: number }
  | { id: number; tick: number; type: 'attack-gained'; slot: Slot; attack: number }
  | { id: number; tick: number; type: 'defense-gained'; slot: Slot; defense: number }
  | { id: number; tick: number; type: 'knockout'; slot: Slot }
  | { id: number; tick: number; type: 'phase-escape' }
  | { id: number; tick: number; type: 'tokens-spawned' }
  | { id: number; tick: number; type: 'token-picked'; slot: Slot }
  | { id: number; tick: number; type: 'escaped'; slot: Slot }
  | { id: number; tick: number; type: 'urgency'; ticksLeft: number }
  | { id: number; tick: number; type: 'match-over'; outcome: Outcome };

/** Distributive Omit, so each event variant keeps its own fields. */
export type EventBody = GameEvent extends infer E
  ? E extends GameEvent
    ? Omit<E, 'id' | 'tick'>
    : never
  : never;

export interface MatchState {
  config: Required<MatchConfig>;
  maze: Maze;
  /** Live tiles (copy of maze.tiles that changes during the match). */
  tiles: Uint8Array;
  tick: number;
  phase: MatchPhase;
  revision: number;
  players: [PlayerState, PlayerState];
  bombs: Bomb[];
  shields: ShieldEntity[];
  balls: Ball[];
  waves: Wave[];
  boss: BossState;
  tokens: [Point & { taken: boolean }, Point & { taken: boolean }] | null;
  /** Remaining match ticks, or -1 for Unlimited Time. */
  timer: number;
  rng: number;
  nextId: number;
  nextEventId: number;
  outcome: Outcome | null;
  /** Events of the last simulated tick. */
  events: GameEvent[];
}
