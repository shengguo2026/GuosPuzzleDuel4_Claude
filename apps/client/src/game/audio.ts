/**
 * Match audio for M2a. Sound effects are synthesised with Web Audio (decided
 * 20 Nov: no SFX files). Music: the approved Enchanted Garden Boss and Escape
 * cues play for every theme until M6 brings the full music engine with all
 * 14 cues and the stinger bridge. Audio never reads or writes simulation
 * state (INV-06).
 */
import type { GameEvent, Slot } from '@gpd4/sim';

const MUTE_KEY = 'gpd4.muted';

type Sfx =
  | 'throw'
  | 'superThrow'
  | 'blast'
  | 'superBlast'
  | 'shield'
  | 'shieldBreak'
  | 'reject'
  | 'hit'
  | 'knockout'
  | 'warning'
  | 'bossAttack'
  | 'bossHurt'
  | 'flip'
  | 'token'
  | 'escape'
  | 'attackGain'
  | 'defenseGain'
  | 'count'
  | 'go'
  | 'urgency'
  | 'ballPop'
  | 'wallBreak'
  | 'win'
  | 'draw';

let noiseBuffer: AudioBuffer | null = null;

export class MatchAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: { boss: HTMLAudioElement; escape: HTMLAudioElement } | null = null;
  private current: 'boss' | 'escape' | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  muted: boolean;

  constructor() {
    let saved = false;
    try {
      saved = window.localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      // storage blocked
    }
    this.muted = saved;
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
    }
    // A context closed by dispose() rejects a pending resume(); that is harmless.
    this.ctx.resume().catch(() => {});
    if (!this.music) {
      const make = (src: string) => {
        const a = new Audio(src);
        a.loop = true;
        a.preload = 'auto';
        a.volume = 0;
        return a;
      };
      this.music = {
        boss: make('/assets/music/boss-garden.m4a'),
        escape: make('/assets/music/escape-garden.m4a'),
      };
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // ignore
    }
    if (this.master) this.master.gain.value = muted ? 0 : 0.6;
    if (this.music && this.current) this.music[this.current].volume = muted ? 0 : MUSIC_VOLUME;
  }

  playMusic(which: 'boss' | 'escape', fadeInMs = 600): void {
    if (!this.music) return;
    this.stopMusic(0);
    this.current = which;
    const a = this.music[which];
    a.currentTime = 0;
    a.volume = 0;
    void a.play().catch(() => undefined);
    this.fade(a, this.muted ? 0 : MUSIC_VOLUME, fadeInMs);
  }

  /** Boss → Escape: the boss cue fades under a short defeat stinger, then Escape starts. */
  bossDefeated(): void {
    if (!this.music) return;
    const boss = this.music.boss;
    this.fade(boss, 0, 900, () => boss.pause());
    this.current = null;
    this.play('flip');
    window.setTimeout(() => {
      if (this.music && this.current === null) this.playMusic('escape', 300);
    }, 1000);
  }

  pauseMusic(): void {
    if (this.music && this.current) this.music[this.current].pause();
  }

  resumeMusic(): void {
    if (this.music && this.current) void this.music[this.current].play().catch(() => undefined);
  }

  stopMusic(fadeMs = 400): void {
    if (!this.music) return;
    for (const a of [this.music.boss, this.music.escape]) {
      if (fadeMs <= 0) {
        a.pause();
        a.volume = 0;
      } else this.fade(a, 0, fadeMs, () => a.pause());
    }
    this.current = null;
  }

  dispose(): void {
    this.stopMusic(0);
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.music = null;
  }

  private fade(a: HTMLAudioElement, to: number, ms: number, done?: () => void): void {
    const from = a.volume;
    const start = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / Math.max(1, ms));
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) window.setTimeout(step, 30);
      else done?.();
    };
    step();
  }

  /** Plays the sounds for one tick's events. `humans` are the slots a person controls. */
  onEvents(events: readonly GameEvent[], humans: readonly Slot[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'bomb-thrown':
          this.play(e.isSuper ? 'superThrow' : 'throw');
          break;
        case 'blast':
          this.play(e.isSuper ? 'superBlast' : 'blast');
          break;
        case 'shield-placed':
          this.play('shield');
          break;
        case 'shield-removed':
          if (e.broken) this.play('shieldBreak');
          break;
        case 'ability-rejected':
          if (humans.includes(e.slot)) this.play('reject');
          break;
        case 'wall-destroyed':
          this.play('wallBreak');
          break;
        case 'boss-damaged':
          this.play('bossHurt');
          break;
        case 'boss-warning':
          this.play('warning');
          break;
        case 'boss-attack':
          this.play('bossAttack');
          break;
        case 'ball-destroyed':
          this.play('ballPop');
          break;
        case 'player-hit':
          this.play('hit');
          break;
        case 'attack-gained':
          if (humans.includes(e.slot)) this.play('attackGain');
          break;
        case 'defense-gained':
          if (humans.includes(e.slot)) this.play('defenseGain');
          break;
        case 'knockout':
          this.play('knockout');
          break;
        case 'phase-escape':
          this.bossDefeated();
          break;
        case 'token-picked':
          this.play('token');
          break;
        case 'escaped':
          this.play('escape');
          break;
        case 'urgency':
          this.play('urgency');
          break;
        case 'match-over':
          this.stopMusic(800);
          this.play(e.outcome.winner === -1 ? 'draw' : 'win');
          break;
        default:
          break;
      }
    }
  }

  play(name: Sfx): void {
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out || this.muted) return;
    const t = ctx.currentTime + 0.005;
    RECIPES[name](ctx, out, t);
  }
}

const MUSIC_VOLUME = 0.45;

// ------------------------------------------------------------ synthesis

function noise(ctx: BaseAudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = 0x2545f491;
  for (let i = 0; i < d.length; i++) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    d[i] = ((s >>> 0) / 0xffffffff) * 2 - 1;
  }
  noiseBuffer = b;
  return b;
}

interface Tone {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  start?: number;
  attack?: number;
  decay: number;
  gain: number;
}

function tone(ctx: AudioContext, out: AudioNode, at: number, o: Tone): void {
  const s = at + (o.start ?? 0);
  const a = o.attack ?? 0.005;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f0, s);
  if (o.f1 !== undefined)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), s + a + o.decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, s);
  g.gain.exponentialRampToValueAtTime(o.gain, s + a);
  g.gain.exponentialRampToValueAtTime(0.0001, s + a + o.decay);
  osc.connect(g).connect(out);
  osc.start(s);
  osc.stop(s + a + o.decay + 0.05);
}

interface Hiss {
  start?: number;
  decay: number;
  gain: number;
  filter: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
}

function hiss(ctx: AudioContext, out: AudioNode, at: number, o: Hiss): void {
  const s = at + (o.start ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = o.filter;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.f0, s);
  if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(o.f1, s + o.decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, s);
  g.gain.exponentialRampToValueAtTime(o.gain, s + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, s + 0.004 + o.decay);
  src.connect(f).connect(g).connect(out);
  src.start(s);
  src.stop(s + o.decay + 0.05);
}

type Recipe = (ctx: AudioContext, out: AudioNode, at: number) => void;

const notes = (
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  freqs: number[],
  step: number,
  gain = 0.12,
) =>
  freqs.forEach((f, i) =>
    tone(ctx, out, at, { type: 'triangle', f0: f, decay: 0.22, gain, start: i * step }),
  );

const RECIPES: Record<Sfx, Recipe> = {
  throw: (c, o, t) =>
    tone(c, o, t, { type: 'triangle', f0: 520, f1: 900, decay: 0.08, gain: 0.12 }),
  superThrow: (c, o, t) => {
    tone(c, o, t, { type: 'sawtooth', f0: 220, f1: 880, decay: 0.2, gain: 0.08 });
    tone(c, o, t, { type: 'triangle', f0: 440, f1: 1320, decay: 0.2, gain: 0.08 });
  },
  blast: (c, o, t) => {
    tone(c, o, t, { f0: 180, f1: 50, decay: 0.25, gain: 0.35 });
    hiss(c, o, t, { filter: 'lowpass', f0: 2400, f1: 200, decay: 0.3, gain: 0.25 });
  },
  superBlast: (c, o, t) => {
    tone(c, o, t, { f0: 140, f1: 35, decay: 0.55, gain: 0.45 });
    hiss(c, o, t, { filter: 'lowpass', f0: 4000, f1: 120, decay: 0.6, gain: 0.35 });
    hiss(c, o, t, { filter: 'bandpass', f0: 1800, q: 3, decay: 0.3, gain: 0.15, start: 0.05 });
  },
  shield: (c, o, t) => {
    tone(c, o, t, { type: 'sine', f0: 660, f1: 990, decay: 0.18, gain: 0.12 });
    tone(c, o, t, { type: 'sine', f0: 1320, decay: 0.25, gain: 0.05, start: 0.04 });
  },
  shieldBreak: (c, o, t) => {
    for (let k = 0; k < 4; k++)
      hiss(c, o, t, {
        filter: 'bandpass',
        f0: 3000 + k * 800,
        q: 6,
        decay: 0.15,
        gain: 0.12,
        start: k * 0.03,
      });
  },
  reject: (c, o, t) => tone(c, o, t, { type: 'square', f0: 160, decay: 0.08, gain: 0.05 }),
  hit: (c, o, t) => {
    tone(c, o, t, { type: 'square', f0: 330, f1: 110, decay: 0.2, gain: 0.12 });
    hiss(c, o, t, { filter: 'highpass', f0: 1500, decay: 0.1, gain: 0.1 });
  },
  knockout: (c, o, t) => notes(c, o, t, [392, 330, 262, 196], 0.12, 0.14),
  warning: (c, o, t) => {
    tone(c, o, t, { type: 'square', f0: 880, decay: 0.07, gain: 0.05 });
    tone(c, o, t, { type: 'square', f0: 880, decay: 0.07, gain: 0.05, start: 0.12 });
  },
  bossAttack: (c, o, t) => {
    tone(c, o, t, { type: 'sawtooth', f0: 300, f1: 120, decay: 0.18, gain: 0.08 });
    hiss(c, o, t, { filter: 'bandpass', f0: 900, f1: 300, q: 2, decay: 0.2, gain: 0.12 });
  },
  bossHurt: (c, o, t) =>
    tone(c, o, t, { type: 'triangle', f0: 240, f1: 160, decay: 0.15, gain: 0.18 }),
  flip: (c, o, t) => notes(c, o, t, [523, 659, 784, 1047], 0.09, 0.14),
  token: (c, o, t) => notes(c, o, t, [988, 1319], 0.07, 0.12),
  escape: (c, o, t) => notes(c, o, t, [784, 988, 1175, 1568], 0.08, 0.14),
  attackGain: (c, o, t) =>
    tone(c, o, t, { type: 'square', f0: 660, f1: 880, decay: 0.06, gain: 0.03 }),
  defenseGain: (c, o, t) =>
    tone(c, o, t, { type: 'sine', f0: 523, f1: 784, decay: 0.12, gain: 0.06 }),
  count: (c, o, t) => tone(c, o, t, { type: 'square', f0: 660, decay: 0.12, gain: 0.06 }),
  go: (c, o, t) => tone(c, o, t, { type: 'square', f0: 1320, decay: 0.3, gain: 0.07 }),
  urgency: (c, o, t) => notes(c, o, t, [880, 880, 880], 0.15, 0.06),
  ballPop: (c, o, t) =>
    hiss(c, o, t, { filter: 'bandpass', f0: 1200, q: 4, decay: 0.08, gain: 0.12 }),
  wallBreak: (c, o, t) => {
    hiss(c, o, t, { filter: 'lowpass', f0: 1200, f1: 150, decay: 0.4, gain: 0.25 });
    tone(c, o, t, { f0: 90, f1: 40, decay: 0.3, gain: 0.25 });
  },
  win: (c, o, t) => notes(c, o, t, [523, 659, 784, 1047, 1319], 0.11, 0.14),
  draw: (c, o, t) => notes(c, o, t, [523, 494, 523], 0.16, 0.12),
};
