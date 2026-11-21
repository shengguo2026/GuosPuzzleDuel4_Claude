import { useEffect, useMemo, useRef, useState } from 'react';
import type { MessageKey } from '@gpd4/content';
import {
  BOSS_TIERS,
  ENERGY_PRESETS,
  MAZE_SIZES,
  SIM_TICK_RATE_HZ,
  timerTicksFor,
  type BossTier,
  type EnergyPreset,
  type MatchConfig,
  type MatchState,
  type MazeSize,
  type PlayerState,
  type Slot,
} from '@gpd4/sim';
import { useT } from '../i18n';
import { GameSession, type Mode, type SessionView } from './session';
import { PLAYER_CSS, THEMES, type ThemeId } from './themes';

interface Settings {
  size: MazeSize;
  bossTier: BossTier;
  energy: EnergyPreset;
  theme: ThemeId;
  unlimitedTime: boolean;
  environment: boolean;
}

const SETTINGS_KEY = (mode: Mode) => `gpd4.match.${mode}`;

function loadSettings(mode: Mode): Settings {
  const base: Settings = {
    size: 'small',
    bossTier: 'easy',
    energy: 'normal',
    theme: 'garden',
    unlimitedTime: false,
    environment: true,
  };
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(SETTINGS_KEY(mode)) ?? '{}',
    ) as Partial<Settings>;
    const merged = { ...base, ...saved };
    if (!MAZE_SIZES.includes(merged.size)) merged.size = base.size;
    if (!BOSS_TIERS.includes(merged.bossTier)) merged.bossTier = base.bossTier;
    if (!ENERGY_PRESETS.includes(merged.energy)) merged.energy = base.energy;
    if (!THEMES.includes(merged.theme)) merged.theme = base.theme;
    if (typeof merged.environment !== 'boolean') merged.environment = base.environment;
    if (mode === 'solo') merged.unlimitedTime = false; // FL-05: Unlimited only in VS
    return merged;
  } catch {
    return base;
  }
}

function saveSettings(mode: Mode, s: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY(mode), JSON.stringify(s));
  } catch {
    // ignore
  }
}

/** URL options for tests and demos: ?autopilot=1&speed=8&seed=5&size=small&tier=easy&env=0&start=1 */
function urlOptions() {
  const q = new URLSearchParams(window.location.search);
  const num = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);
  return {
    autopilot: q.get('autopilot') === '1',
    speed: num('speed'),
    seed: num('seed'),
    size: q.get('size') as MazeSize | null,
    tier: q.get('tier') as BossTier | null,
    env: q.has('env') ? q.get('env') !== '0' : null,
    start: q.get('start') === '1',
  };
}

function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! | 0;
}

export function MatchScreen({ mode, onBack }: { mode: Mode; onBack: () => void }) {
  const { t } = useT();
  const url = useMemo(urlOptions, []);
  const [settings, setSettings] = useState<Settings>(() => {
    const s = loadSettings(mode);
    if (url.size && MAZE_SIZES.includes(url.size)) s.size = url.size;
    if (url.tier && BOSS_TIERS.includes(url.tier)) s.bossTier = url.tier;
    if (url.env !== null) s.environment = url.env;
    return s;
  });
  const [run, setRun] = useState<{ key: number; config: MatchConfig } | null>(null);

  const start = (seed = url.seed ?? randomSeed()) => {
    saveSettings(mode, settings);
    setRun((r) => ({
      key: (r?.key ?? 0) + 1,
      config: {
        seed,
        size: settings.size,
        bossTier: settings.bossTier,
        energy: settings.energy,
        unlimitedTime: mode === 'local' && settings.unlimitedTime,
        environment: settings.environment,
      },
    }));
  };

  const autoStarted = useRef(false);
  useEffect(() => {
    if (url.start && !autoStarted.current) {
      autoStarted.current = true;
      start();
    }
  });

  if (run) {
    return (
      <MatchView
        key={run.key}
        mode={mode}
        config={run.config}
        theme={settings.theme}
        autopilot={url.autopilot}
        speed={url.speed}
        onRestart={() => start(run.config.seed)}
        onRematch={() => start()}
        onSettings={() => setRun(null)}
        onBack={onBack}
        onTheme={(theme) => setSettings((s) => ({ ...s, theme }))}
      />
    );
  }

  const select = <K extends keyof Settings>(
    key: K,
    values: readonly Settings[K][],
    label: MessageKey,
    text: (v: Settings[K]) => string,
  ) => (
    <label className="field">
      <span>{t(label)}</span>
      <select
        data-testid={`setup-${key}`}
        value={String(settings[key])}
        onChange={(e) => {
          const v = values.find((x) => String(x) === e.target.value)!;
          setSettings((s) => ({ ...s, [key]: v }));
        }}
      >
        {values.map((v) => (
          <option key={String(v)} value={String(v)}>
            {text(v)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="setup" data-testid={`setup-${mode}`}>
      <h2>{t(mode === 'solo' ? 'match.title.solo' : 'match.title.local')}</h2>
      <p className="muted">{t('match.goal')}</p>
      <div className="setup-grid">
        {select('size', MAZE_SIZES, 'match.setup.size', (v) => t(`match.size.${v}` as MessageKey))}
        {select('bossTier', BOSS_TIERS, 'match.setup.tier', (v) =>
          t(`match.tier.${v}` as MessageKey),
        )}
        {select('theme', THEMES, 'match.setup.theme', (v) => t(`match.theme.${v}` as MessageKey))}
        {select('energy', ENERGY_PRESETS, 'match.setup.energy', (v) =>
          t(`match.energy.${v}` as MessageKey),
        )}
        {select('environment', [true, false], 'match.setup.environment', (v) =>
          t(v ? 'match.environment.on' : 'match.environment.off'),
        )}
        {mode === 'local' &&
          select('unlimitedTime', [false, true], 'match.setup.time', (v) =>
            v
              ? t('match.time.unlimited')
              : t('match.time.normal', {
                  minutes: Math.round(timerTicksFor(settings.size) / SIM_TICK_RATE_HZ / 60),
                }),
          )}
      </div>
      <div className="controls-help">
        <h3>{t('match.setup.controls')}</h3>
        {mode === 'solo' ? (
          <p>{t('match.controls.solo')}</p>
        ) : (
          <>
            <p style={{ color: PLAYER_CSS[0] }}>{t('match.controls.p1')}</p>
            <p style={{ color: PLAYER_CSS[1] }}>{t('match.controls.p2')}</p>
          </>
        )}
        <p className="muted">{t('match.controls.hold')}</p>
        {settings.environment && <p className="muted">{t('match.legend')}</p>}
      </div>
      <div className="setup-actions">
        <button className="button primary" data-testid="start-match" onClick={() => start()}>
          ▶ {t('match.setup.start')}
        </button>
        <button className="button" data-testid="back" onClick={onBack}>
          ← {t('nav.back')}
        </button>
      </div>
    </section>
  );
}

interface MatchViewProps {
  mode: Mode;
  config: MatchConfig;
  theme: ThemeId;
  autopilot: boolean;
  speed?: number;
  onRestart: () => void;
  onRematch: () => void;
  onSettings: () => void;
  onBack: () => void;
  onTheme: (theme: ThemeId) => void;
}

declare global {
  interface Window {
    __gpd4?: { session: GameSession; hash: () => number; state: () => MatchState };
  }
}

function MatchView(props: MatchViewProps) {
  const { t } = useT();
  const host = useRef<HTMLDivElement>(null);
  const makeSession = () =>
    new GameSession({
      mode: props.mode,
      config: props.config,
      theme: props.theme,
      autopilot: props.autopilot,
      speed: props.speed,
    });
  const makeRef = useRef(makeSession);
  const [session, setSession] = useState(makeSession);
  const [view, setView] = useState<SessionView>(() => session.view());
  const [muted, setMuted] = useState(session.audio.muted);
  const [theme, setTheme] = useState<ThemeId>(props.theme);

  useEffect(() => {
    // React StrictMode (dev) unmounts and remounts once: a disposed session is replaced.
    if (session.isDisposed) {
      setSession(makeRef.current());
      return;
    }
    session.audio.unlock();
    const unsub = session.subscribe((v) => setView({ ...v }));
    void session.mount(host.current!);
    window.__gpd4 = { session, hash: () => session.hash(), state: () => session.state };
    return () => {
      unsub();
      session.dispose();
      if (window.__gpd4?.session === session) delete window.__gpd4;
    };
  }, [session]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && !e.repeat) {
        const next = !session.audio.muted;
        session.audio.setMuted(next);
        setMuted(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  const s = view.state;
  const names = [t('match.player1'), props.mode === 'solo' ? t('match.ai') : t('match.player2')];
  if (props.autopilot) names[0] = `${t('match.ai')} 1`;
  if (props.autopilot) names[1] = `${t('match.ai')} 2`;

  return (
    <section className="match" data-testid="match" data-phase={view.phase}>
      <Hud state={s} names={names} />
      <div className="match-stage">
        <div className="match-canvas" ref={host} />
        {view.phase === 'loading' && <div className="overlay">{t('match.loading')}</div>}
        {view.phase === 'countdown' && (
          <div className="overlay countdown" data-testid="countdown">
            {view.countdown > 0 ? view.countdown : t('match.go')}
          </div>
        )}
        {view.phase === 'paused' && (
          <div className="overlay">
            <div className="panel" data-testid="pause-menu">
              <h2>{t('match.pause.title')}</h2>
              <button
                className="button primary"
                data-testid="resume"
                onClick={() => session.resume()}
              >
                {t('match.pause.resume')}
              </button>
              <button className="button" data-testid="restart" onClick={props.onRestart}>
                {t('match.pause.restart')}
              </button>
              <label className="field">
                <span>{t('match.setup.theme')}</span>
                <select
                  data-testid="pause-theme"
                  value={theme}
                  onChange={(e) => {
                    const next = e.target.value as ThemeId;
                    setTheme(next);
                    session.setTheme(next);
                    props.onTheme(next);
                  }}
                >
                  {THEMES.map((th) => (
                    <option key={th} value={th}>
                      {t(`match.theme.${th}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button"
                onClick={() => {
                  session.audio.setMuted(!muted);
                  setMuted(!muted);
                }}
              >
                {muted ? t('match.sound.off') : t('match.sound.on')}
              </button>
              {props.mode === 'solo' ? (
                <button
                  className="button danger"
                  data-testid="leave"
                  onClick={() => session.leave([0])}
                >
                  {t('match.pause.leave')}
                </button>
              ) : (
                <>
                  <button
                    className="button danger"
                    data-testid="leave-p1"
                    onClick={() => session.leave([0])}
                  >
                    {t('match.pause.leaveP1')}
                  </button>
                  <button
                    className="button danger"
                    data-testid="leave-p2"
                    onClick={() => session.leave([1])}
                  >
                    {t('match.pause.leaveP2')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {view.phase === 'over' && s.outcome && (
          <Results
            state={s}
            names={names}
            tier={props.config.bossTier}
            onRematch={props.onRematch}
            onSettings={props.onSettings}
            onBack={props.onBack}
          />
        )}
      </div>
    </section>
  );
}

const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];

function arrowTo(p: PlayerState, x: number, y: number): string {
  const a = Math.atan2(y - p.y, x - p.x);
  const k = (Math.round(a / (Math.PI / 4)) + 8) % 8;
  return p.x === x && p.y === y ? '•' : ARROWS[k]!;
}

function Segments({ value, max, kind }: { value: number; max: number; kind: string }) {
  return (
    <span className={`segments ${kind}`} aria-label={`${value}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'on' : ''} />
      ))}
    </span>
  );
}

function Hud({ state: s, names }: { state: MatchState; names: string[] }) {
  const { t } = useT();
  const secs = s.timer < 0 ? -1 : Math.ceil(s.timer / SIM_TICK_RATE_HZ);
  const time = secs < 0 ? '∞' : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const urgent = secs >= 0 && secs <= 30;
  return (
    <div className="hud" data-testid="hud">
      {[0, 1].map((slot) => {
        const p = s.players[slot as Slot];
        let goal = '';
        if (s.phase === 'escape') {
          const tk = s.maze.tokenTiles[slot as Slot];
          const ex = s.maze.entrances[1 - slot]!;
          goal = p.hasToken
            ? `${t('match.hud.toExit')} ${arrowTo(p, ex.x, ex.y)}`
            : `${t('match.hud.getToken')} ${arrowTo(p, tk.x, tk.y)}`;
        }
        return (
          <div key={slot} className={`hud-player p${slot + 1}`} data-testid={`hud-p${slot + 1}`}>
            <div className="hud-name" style={{ color: PLAYER_CSS[slot] }}>
              <span className="badge" style={{ background: PLAYER_CSS[slot] }}>
                {slot + 1}
              </span>
              {names[slot]}
              {p.hasToken && <span title="crystal"> 💎</span>}
            </div>
            <div className="hud-row">
              <span className="hud-label">{t('match.hud.life')}</span>
              <span className="hearts" data-testid={`life-p${slot + 1}`} data-value={p.life}>
                {'♥'.repeat(p.life)}
                <span className="lost">{'♥'.repeat(Math.max(0, 3 - p.life))}</span>
              </span>
            </div>
            <div className="hud-row">
              <span className="hud-label">{t('match.hud.attack')}</span>
              <Segments value={p.attack} max={3} kind="attack" />
            </div>
            <div className="hud-row">
              <span className="hud-label">{t('match.hud.defense')}</span>
              <Segments value={p.defense} max={3} kind="defense" />
            </div>
            <div className="hud-goal">
              {goal}
              {p.boost > 0 && <span className="hud-status boost"> ⚡ {t('match.hud.boost')}</span>}
              {p.immobile > 0 && (
                <span className="hud-status stuck"> ⛓ {t('match.hud.stuck')}</span>
              )}
              {!goal && p.boost === 0 && p.immobile === 0 && '\u00a0'}
            </div>
          </div>
        );
      })}
      <div className="hud-center">
        <div className={`hud-phase ${s.phase}`} data-testid="hud-phase">
          {s.phase === 'boss' ? t('match.phase.boss') : t('match.phase.escape')}
        </div>
        <div className={`hud-timer ${urgent ? 'urgent' : ''}`} data-testid="hud-timer">
          {time}
        </div>
        {s.darkness > 0 && <div className="hud-dark">🌑 {t('match.hud.dark')}</div>}
        {s.phase === 'boss' && (
          <div className="boss-bar" data-testid="boss-hp" data-value={s.boss.hp}>
            <span className="boss-name">{t('match.hud.boss')}</span>
            <span className="bar">
              <span style={{ width: `${(100 * s.boss.hp) / s.boss.maxHp}%` }} />
            </span>
            <span>
              {s.boss.hp}/{s.boss.maxHp}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Results(props: {
  state: MatchState;
  names: string[];
  tier: BossTier;
  onRematch: () => void;
  onSettings: () => void;
  onBack: () => void;
}) {
  const { t } = useT();
  const s = props.state;
  const o = s.outcome!;
  const reasonKey: Record<string, MessageKey> = {
    escape: o.winner === -1 ? 'match.reason.escapeDraw' : 'match.reason.escape',
    knockout: o.winner === -1 ? 'match.reason.knockoutDraw' : 'match.reason.knockout',
    timer: 'match.reason.timer',
    forfeit: 'match.reason.forfeit',
    'both-left': 'match.reason.bothLeft',
  };
  // BS-14: 08 victory when no player wins, 07 defeated once the boss fell.
  const pose = o.winner === -1 ? '08' : s.boss.hp <= 0 ? '07' : '01';
  const secs = Math.round(o.tick / SIM_TICK_RATE_HZ);
  const stats: [MessageKey, keyof PlayerState['stats']][] = [
    ['match.stats.bossDamage', 'bossDamage'],
    ['match.stats.bombs', 'bombs'],
    ['match.stats.superBombs', 'superBombs'],
    ['match.stats.shields', 'shields'],
    ['match.stats.hitsTaken', 'hitsTaken'],
    ['match.stats.tilesWalked', 'tilesWalked'],
    ['match.stats.pickups', 'pickups'],
    ['match.stats.traps', 'trapsTriggered'],
    ['match.stats.teleports', 'teleports'],
  ];
  return (
    <div className="overlay">
      <div
        className="panel results"
        data-testid="results"
        data-winner={o.winner}
        data-reason={o.reason}
      >
        <img className="results-boss" src={`/assets/boss/${props.tier}/${pose}.webp`} alt="" />
        <h2 style={{ color: o.winner === -1 ? undefined : PLAYER_CSS[o.winner] }}>
          {o.winner === -1
            ? t('match.result.draw')
            : t('match.result.win', { name: props.names[o.winner]! })}
        </h2>
        <p className="muted">{t(reasonKey[o.reason]!)}</p>
        <table className="stats">
          <thead>
            <tr>
              <th />
              <th style={{ color: PLAYER_CSS[0] }}>{props.names[0]}</th>
              <th style={{ color: PLAYER_CSS[1] }}>{props.names[1]}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(([label, key]) => (
              <tr key={key}>
                <td>{t(label)}</td>
                <td>{s.players[0].stats[key]}</td>
                <td>{s.players[1].stats[key]}</td>
              </tr>
            ))}
            <tr>
              <td>{t('match.result.time')}</td>
              <td colSpan={2}>
                {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
              </td>
            </tr>
            <tr>
              <td>{t('match.result.seed')}</td>
              <td colSpan={2}>{s.config.seed}</td>
            </tr>
          </tbody>
        </table>
        <div className="setup-actions">
          <button className="button primary" data-testid="rematch" onClick={props.onRematch}>
            {t('match.result.rematch')}
          </button>
          <button className="button" data-testid="change-settings" onClick={props.onSettings}>
            {t('match.result.settings')}
          </button>
          <button className="button" data-testid="results-back" onClick={props.onBack}>
            ← {t('nav.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
