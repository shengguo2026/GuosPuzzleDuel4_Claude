/**
 * A local match session (WP 2a.9, 2a.10): runs the simulation at a fixed
 * 30 Hz from the browser's frame clock, feeds it keyboard or AI commands,
 * and hands state and events to the renderer, audio and HUD.
 *
 * M2a runs the authoritative simulation in the page for Solo and Local VS on
 * one PC. From M3 the same simulation runs in the host for WiFi VS.
 */
import { createBot, type Bot } from '@gpd4/ai';
import { balance } from '@gpd4/rules';
import {
  NO_INPUT,
  ReplayRecorder,
  SIM_TICK_RATE_HZ,
  createMatch,
  hashState,
  leaveMatch,
  stepMatch,
  type GameEvent,
  type MatchConfig,
  type MatchState,
  type PlayerInput,
  type Slot,
} from '@gpd4/sim';
import { MatchAudio } from './audio';
import { KeyboardInput, SOLO_BINDINGS, VS_BINDINGS } from './keyboard';
import { MatchRenderer } from './renderer';
import type { ThemeId } from './themes';

export type Mode = 'solo' | 'local';
export type Phase = 'loading' | 'countdown' | 'playing' | 'paused' | 'over';

export interface SessionOptions {
  mode: Mode;
  config: MatchConfig;
  theme: ThemeId;
  /** Test/demo: both players are bots. */
  autopilot?: boolean;
  /** Test/demo: simulation speed multiplier. */
  speed?: number;
}

export interface SessionView {
  phase: Phase;
  countdown: number;
  state: MatchState;
}

const TICK_MS = 1000 / SIM_TICK_RATE_HZ;
const COUNTDOWN_STEP_MS = (balance.match.countdownStepTicks.value * 1000) / SIM_TICK_RATE_HZ;

export class GameSession {
  readonly state: MatchState;
  readonly opts: SessionOptions;
  readonly audio = new MatchAudio();
  readonly replay: ReplayRecorder;
  private renderer = new MatchRenderer();
  private keyboard: KeyboardInput;
  private bots: (Bot | null)[];
  private humans: Slot[];
  private phase: Phase = 'loading';
  private countdown = 3;
  private countdownAt = 0;
  private acc = 0;
  private last = 0;
  private raf = 0;
  private listeners = new Set<(v: SessionView) => void>();
  private lastNotify = 0;
  private disposed = false;

  constructor(opts: SessionOptions) {
    this.opts = opts;
    this.state = createMatch(opts.config);
    this.replay = new ReplayRecorder(opts.config);
    const auto = !!opts.autopilot;
    this.bots = [
      auto ? createBot(0, opts.config.seed) : null,
      opts.mode === 'solo' || auto ? createBot(1, opts.config.seed) : null,
    ];
    this.humans = ([0, 1] as Slot[]).filter((s) => !this.bots[s]);
    this.keyboard = new KeyboardInput(opts.mode === 'solo' ? [SOLO_BINDINGS] : VS_BINDINGS, () =>
      this.togglePause(),
    );
  }

  async mount(host: HTMLElement): Promise<void> {
    await this.renderer.init(host, this.opts.config.bossTier, this.opts.theme);
    if (this.disposed) return;
    this.keyboard.attach();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.phase = 'countdown';
    this.countdown = 3;
    this.countdownAt = performance.now();
    this.audio.play('count');
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.notify(true);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.keyboard.detach();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.renderer.destroy();
    this.audio.dispose();
    this.listeners.clear();
  }

  subscribe(fn: (v: SessionView) => void): () => void {
    this.listeners.add(fn);
    fn(this.view());
    return () => this.listeners.delete(fn);
  }

  view(): SessionView {
    return { phase: this.phase, countdown: this.countdown, state: this.state };
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  get currentPhase(): Phase {
    return this.phase;
  }

  setTheme(theme: ThemeId): void {
    this.renderer.setTheme(theme);
  }

  hash(): number {
    return hashState(this.state);
  }

  togglePause(): void {
    if (this.phase === 'playing') this.pause();
    else if (this.phase === 'paused') this.resume();
  }

  /** TIME-02: Solo and Local VS pause immediately; no simulation tick runs while paused. */
  pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.keyboard.reset();
    this.audio.pauseMusic();
    this.notify(true);
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.keyboard.reset();
    this.acc = 0;
    this.last = performance.now();
    this.audio.resumeMusic();
    this.notify(true);
  }

  /** OC-04: Leave from the pause menu; the other player wins by forfeit. */
  leave(slots: Slot[]): void {
    if (this.phase === 'over') return;
    leaveMatch(this.state, slots);
    this.replay.leave(slots);
    this.audio.onEvents(this.state.events, this.humans);
    this.phase = 'over';
    this.notify(true);
  }

  private onVisibility = () => {
    if (document.hidden) this.pause();
  };

  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(250, now - this.last);
    this.last = now;
    if (this.phase === 'countdown') {
      const step = Math.floor((now - this.countdownAt) / COUNTDOWN_STEP_MS);
      const left = 3 - step;
      if (left !== this.countdown) {
        this.countdown = left;
        if (left > 0) this.audio.play('count');
        if (left <= 0) {
          // GO is simulation tick 0 (SIM-06).
          this.audio.play('go');
          this.audio.playMusic('boss');
          this.phase = 'playing';
          this.acc = 0;
        }
        this.notify(true);
      }
    } else if (this.phase === 'playing') {
      const speed = Math.max(1, this.opts.speed ?? 1);
      this.acc += dt * speed;
      let n = 0;
      const maxPerFrame = 8 * speed;
      while (this.acc >= TICK_MS && n < maxPerFrame && this.phase === 'playing') {
        this.tick(now);
        this.acc -= TICK_MS;
        n++;
      }
      if (n >= maxPerFrame) this.acc = 0;
    }
    const alpha = this.phase === 'playing' ? Math.min(1, this.acc / TICK_MS) : 0;
    this.renderer.render(this.state, alpha, now);
    this.notify(false);
    this.raf = requestAnimationFrame(this.frame);
  };

  private tick(now: number): void {
    const inputs: [PlayerInput, PlayerInput] = [NO_INPUT, NO_INPUT];
    let humanIndex = 0;
    for (const slot of [0, 1] as Slot[]) {
      const bot = this.bots[slot];
      inputs[slot] = bot ? bot.think(this.state) : this.keyboard.sample(humanIndex++);
    }
    const events: GameEvent[] = stepMatch(this.state, inputs);
    this.replay.record(inputs, this.state);
    this.renderer.onEvents(events, now);
    this.audio.onEvents(events, this.humans);
    if (this.state.phase === 'over') {
      this.phase = 'over';
      this.notify(true);
    }
  }

  private notify(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastNotify < 100) return;
    this.lastNotify = now;
    const v = this.view();
    for (const fn of this.listeners) fn(v);
  }
}
