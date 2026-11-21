/**
 * Replay recorder (WP 2a.1): the match config plus one input pair per tick
 * and the state hash after every tick. Playing a replay back must reproduce
 * every hash (golden replays, INV-02).
 */
import { hashState } from './hash.js';
import { createMatch, leaveMatch, stepMatch } from './match.js';
import type { Dir, MatchConfig, MatchState, PlayerInput, Slot } from './types.js';

/** Compact input: held+1 (0..4), pressed+1 (0..4), bomb, shield packed in one byte. */
export function packInput(i: PlayerInput): number {
  return (i.held + 1) | ((i.pressed + 1) << 3) | (i.bomb ? 64 : 0) | (i.shield ? 128 : 0);
}

export function unpackInput(n: number): PlayerInput {
  return {
    held: ((n & 7) - 1) as Dir | -1,
    pressed: (((n >> 3) & 7) - 1) as Dir | -1,
    bomb: (n & 64) !== 0,
    shield: (n & 128) !== 0,
  };
}

export interface Replay {
  version: 1;
  config: MatchConfig;
  /** Two packed inputs per tick. */
  inputs: number[];
  /** State hash after each tick. */
  hashes: number[];
  /** Leave at the end (OC-04), if any. */
  left?: Slot[];
}

export class ReplayRecorder {
  readonly replay: Replay;
  constructor(config: MatchConfig) {
    this.replay = { version: 1, config: { ...config }, inputs: [], hashes: [] };
  }
  record(inputs: readonly [PlayerInput, PlayerInput], state: MatchState): void {
    this.replay.inputs.push(packInput(inputs[0]), packInput(inputs[1]));
    this.replay.hashes.push(hashState(state));
  }
  leave(slots: Slot[]): void {
    this.replay.left = [...slots];
  }
}

/** Plays a replay back; returns the final state and the first tick whose hash differs (-1 = none). */
export function playReplay(replay: Replay): { state: MatchState; mismatchAt: number } {
  const state = createMatch(replay.config);
  let mismatchAt = -1;
  for (let t = 0; t * 2 < replay.inputs.length; t++) {
    stepMatch(state, [unpackInput(replay.inputs[t * 2]!), unpackInput(replay.inputs[t * 2 + 1]!)]);
    if (mismatchAt < 0 && hashState(state) !== replay.hashes[t]) mismatchAt = t;
  }
  if (replay.left) leaveMatch(state, replay.left);
  return { state, mismatchAt };
}
