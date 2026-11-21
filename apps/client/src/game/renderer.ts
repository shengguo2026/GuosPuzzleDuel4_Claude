/**
 * Pixi match renderer (WP 2a.11, UI-01, M-005). Draws the maze with
 * procedural tiles in the theme palette and every dynamic thing in code:
 * players, bombs, shields, tokens, exits, telegraphs and the boss balls,
 * which look like sports balls (D-14, 20 Nov). The boss uses the tier's pose
 * art. Rendering only reads the state; it never changes it.
 */
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import {
  DX,
  DY,
  Tile,
  chebyshev,
  isBlocker,
  type BossTier,
  type GameEvent,
  type MatchState,
} from '@gpd4/sim';
import { PALETTES, PLAYER_COLORS, type ThemeId } from './themes';

const POSES = ['01', '02', '03', '04', '05', '06', '07', '08'] as const;
type Pose = (typeof POSES)[number];

/** An arc that starts a new sub-path (Pixi would otherwise join it to the last point). */
function arcAt(g: Graphics, cx: number, cy: number, r: number, a0: number, a1: number): Graphics {
  return g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r).arc(cx, cy, r, a0, a1);
}

interface BlastFx {
  tiles: number[];
  isSuper: boolean;
  start: number;
}

interface PopFx {
  x: number;
  y: number;
  color: number;
  start: number;
}

export class MatchRenderer {
  private app = new Application();
  private root = new Container();
  private tilesG = new Graphics();
  private telegraphG = new Graphics();
  private entityG = new Graphics();
  private bossSprite = new Sprite();
  private playerG = new Graphics();
  private fxG = new Graphics();
  private labels: Text[] = [];
  private textures = new Map<string, Texture>();
  private theme: ThemeId = 'garden';
  private tier: BossTier = 'easy';
  private drawnRevision = -1;
  private drawnTheme: ThemeId | null = null;
  private drawnSize = '';
  private tile = 24;
  private blasts: BlastFx[] = [];
  private pops: PopFx[] = [];
  private ready = false;
  private destroyed = false;

  async init(host: HTMLElement, tier: BossTier, theme: ThemeId): Promise<void> {
    this.tier = tier;
    this.theme = theme;
    await this.app.init({
      resizeTo: host,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      background: PALETTES[theme].background,
      preference: 'webgl',
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute('data-testid', 'match-canvas');
    this.root.addChild(
      this.tilesG,
      this.entityG,
      this.bossSprite,
      this.telegraphG,
      this.playerG,
      this.fxG,
    );
    this.app.stage.addChild(this.root);
    for (const n of ['1', '2']) {
      const t = new Text({
        text: n,
        style: {
          fill: 0xffffff,
          fontWeight: '800',
          fontSize: 14,
          fontFamily: 'Segoe UI, sans-serif',
        },
      });
      t.anchor.set(0.5);
      this.labels.push(t);
      this.root.addChild(t);
    }
    await this.loadPoses(tier);
    this.ready = true;
  }

  private async loadPoses(tier: BossTier): Promise<void> {
    await Promise.all(
      POSES.map(async (p) => {
        const url = `/assets/boss/${tier}/${p}.webp`;
        try {
          this.textures.set(`${tier}/${p}`, await Assets.load<Texture>(url));
        } catch {
          // A missing pose falls back to the code-drawn boss.
        }
      }),
    );
  }

  setTheme(theme: ThemeId): void {
    this.theme = theme;
    if (this.ready) this.app.renderer.background.color = PALETTES[theme].background;
  }

  /** Remembers short-lived effects from a tick's events. */
  onEvents(events: readonly GameEvent[], now: number): void {
    for (const e of events) {
      if (e.type === 'blast') this.blasts.push({ tiles: e.tiles, isSuper: e.isSuper, start: now });
      if (e.type === 'ball-destroyed')
        this.pops.push({ x: e.x, y: e.y, color: 0xffffff, start: now });
      if (e.type === 'player-hit')
        this.pops.push({ x: -1, y: e.slot, color: 0xff4040, start: now });
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.ready) this.app.destroy(true, { children: true });
    this.ready = false;
  }

  /** Draws the state; `alpha` (0–1) is how far wall-clock time is into the next tick. */
  render(s: MatchState, alpha: number, now: number): void {
    if (!this.ready) return;
    const { w, h } = s.maze;
    const screen = this.app.screen;
    const tile = Math.max(8, Math.floor(Math.min(screen.width / w, screen.height / h)));
    const sizeKey = `${screen.width}x${screen.height}x${w}`;
    if (tile !== this.tile || sizeKey !== this.drawnSize) {
      this.tile = tile;
      this.drawnSize = sizeKey;
      this.drawnRevision = -1;
      for (const l of this.labels) l.style.fontSize = Math.max(9, Math.round(tile * 0.5));
    }
    this.root.x = Math.floor((screen.width - tile * w) / 2);
    this.root.y = Math.floor((screen.height - tile * h) / 2);
    if (this.drawnRevision !== s.revision || this.drawnTheme !== this.theme) this.drawTiles(s);
    this.drawTelegraphs(s, now);
    this.drawEntities(s, alpha, now);
    this.drawBoss(s, now);
    this.drawPlayers(s, alpha, now);
    this.drawFx(s, now);
  }

  // ------------------------------------------------------------ tiles

  private drawTiles(s: MatchState): void {
    const g = this.tilesG;
    const pal = PALETTES[this.theme];
    const T = this.tile;
    const { w, h } = s.maze;
    g.clear();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = s.tiles[y * w + x];
        const px = x * T;
        const py = y * T;
        const ring = chebyshev(x, y, s.maze.cx, s.maze.cy) <= s.maze.ringRadius;
        if (t === Tile.FLOOR || t === Tile.ENTRANCE || t === Tile.CORE) {
          const base = ring ? pal.ring : (x + y) % 2 === 0 ? pal.floor : pal.floorAlt;
          g.rect(px, py, T, T).fill(t === Tile.ENTRANCE ? pal.entrance : base);
          // A deterministic sprinkle of dots, flowers or sparks per tile.
          const hash = (x * 73856093) ^ (y * 19349663);
          if (t === Tile.FLOOR && (hash & 7) === 0)
            g.circle(
              px + T * (0.3 + ((hash >> 4) & 3) * 0.12),
              py + T * (0.3 + ((hash >> 6) & 3) * 0.12),
              T * 0.07,
            ).fill({
              color: pal.floorDot,
              alpha: 0.8,
            });
          if (t === Tile.CORE) {
            g.rect(px, py, T, T).fill({ color: pal.core, alpha: 0.85 });
          }
        } else if (t === Tile.WALL) {
          g.rect(px, py, T, T).fill(pal.wall);
          g.rect(px + 1, py + 1, T - 2, T * 0.55).fill(pal.wallTop);
          g.rect(px, py + T - 2, T, 2).fill(pal.wallEdge);
        } else if (t === Tile.DESTRUCTIBLE) {
          g.rect(px, py, T, T).fill(pal.destructible);
          g.rect(px + 1, py + 1, T - 2, T * 0.45).fill({ color: 0xffffff, alpha: 0.12 });
          g.moveTo(px + T * 0.2, py + T * 0.25)
            .lineTo(px + T * 0.45, py + T * 0.5)
            .lineTo(px + T * 0.35, py + T * 0.8)
            .moveTo(px + T * 0.45, py + T * 0.5)
            .lineTo(px + T * 0.8, py + T * 0.4)
            .stroke({ width: Math.max(1, T * 0.07), color: pal.crack });
        } else if (t === Tile.SHORTCUT) {
          g.rect(px, py, T, T).fill(pal.shortcut);
          g.rect(px + 2, py + 2, T - 4, T - 4).stroke({
            width: Math.max(1, T * 0.06),
            color: pal.crown,
            alpha: 0.7,
          });
          this.crown(g, px + T / 2, py + T / 2, T * 0.32, pal.crown);
        }
      }
    }
    // Arena core frame.
    const { cx, cy, coreRadius } = s.maze;
    if (s.phase === 'boss') {
      const x0 = (cx - coreRadius) * T;
      const y0 = (cy - coreRadius) * T;
      const size = (2 * coreRadius + 1) * T;
      g.roundRect(x0 + 1, y0 + 1, size - 2, size - 2, T * 0.3).stroke({
        width: Math.max(2, T * 0.1),
        color: pal.coreEdge,
      });
    }
    this.drawnRevision = s.revision;
    this.drawnTheme = this.theme;
  }

  private crown(g: Graphics, x: number, y: number, r: number, color: number): void {
    g.poly([
      x - r,
      y + r * 0.6,
      x - r,
      y - r * 0.4,
      x - r * 0.5,
      y,
      x,
      y - r * 0.7,
      x + r * 0.5,
      y,
      x + r,
      y - r * 0.4,
      x + r,
      y + r * 0.6,
    ]).fill(color);
  }

  // ------------------------------------------------------------ telegraphs

  private drawTelegraphs(s: MatchState, now: number): void {
    const g = this.telegraphG;
    const T = this.tile;
    g.clear();
    const pulse = 0.35 + 0.25 * Math.sin(now / 90);
    const b = s.boss;
    if (b.state === 'warning') {
      for (const lane of b.lanes) {
        let x = lane.x;
        let y = lane.y;
        while (!isBlocker(s, x, y)) {
          g.rect(x * T + T * 0.15, y * T + T * 0.15, T * 0.7, T * 0.7).fill({
            color: 0xff3b30,
            alpha: pulse,
          });
          x += DX[lane.dir]!;
          y += DY[lane.dir]!;
        }
      }
      if (b.pattern === 2) {
        const { cx, cy, coreRadius } = s.maze;
        for (let r = coreRadius + 1; r <= coreRadius + 4; r++) {
          const x0 = (cx - r) * T;
          const y0 = (cy - r) * T;
          const size = (2 * r + 1) * T;
          g.rect(x0 + T * 0.5, y0 + T * 0.5, size - T, size - T).stroke({
            width: Math.max(2, T * 0.12),
            color: 0xff9500,
            alpha: pulse * (1 - (r - coreRadius - 1) * 0.18),
          });
        }
      }
    }
    for (const wave of s.waves) {
      for (const i of wave.reached) {
        const x = i % s.maze.w;
        const y = Math.floor(i / s.maze.w);
        g.rect(x * T, y * T, T, T).fill({ color: 0xffb020, alpha: 0.55 });
      }
    }
  }

  // ------------------------------------------------------------ entities

  private drawEntities(s: MatchState, alpha: number, now: number): void {
    const g = this.entityG;
    const T = this.tile;
    g.clear();
    // Exits blink in the owner's colour after the flip (D-13, UI-01).
    if (s.phase !== 'boss') {
      const on = Math.floor(now / 350) % 2 === 0;
      for (const slot of [0, 1] as const) {
        const exit = s.maze.entrances[1 - slot]!;
        g.rect(exit.x * T + 2, exit.y * T + 2, T - 4, T - 4).stroke({
          width: Math.max(2, T * 0.14),
          color: PLAYER_COLORS[slot],
          alpha: on ? 1 : 0.35,
        });
      }
    }
    if (s.tokens) {
      s.tokens.forEach((tk, slot) => {
        if (!tk.taken)
          this.crystal(g, (tk.x + 0.5) * T, (tk.y + 0.5) * T, T * 0.38, PLAYER_COLORS[slot]!);
      });
    }
    for (const sh of s.shields) {
      const color = PLAYER_COLORS[sh.owner];
      const x = sh.x * T;
      const y = sh.y * T;
      g.roundRect(x + 1, y + 1, T - 2, T - 2, T * 0.2).fill({ color, alpha: 0.55 });
      g.roundRect(x + 1, y + 1, T - 2, T - 2, T * 0.2).stroke({
        width: Math.max(2, T * (sh.isSuper ? 0.16 : 0.08)),
        color: sh.isSuper ? 0xffd23f : 0xffffff,
      });
      const left = sh.ticksLeft / (sh.isSuper ? 450 : 90);
      g.rect(x + 3, y + T - 5, (T - 6) * left, 3).fill(0xffffff);
    }
    for (const bomb of s.bombs) {
      let fx = bomb.x;
      let fy = bomb.y;
      if (!isBlocker(s, bomb.x + DX[bomb.dir]!, bomb.y + DY[bomb.dir]!)) {
        const k = Math.min(1, ((bomb.age % 3) + alpha) / 3);
        fx += DX[bomb.dir]! * k;
        fy += DY[bomb.dir]! * k;
      }
      const cx = (fx + 0.5) * T;
      const cy = (fy + 0.5) * T;
      const r = T * (bomb.isSuper ? 0.34 : 0.26);
      g.circle(cx, cy, r).fill(0x222233);
      g.circle(cx - r * 0.35, cy - r * 0.35, r * 0.3).fill({ color: 0xffffff, alpha: 0.5 });
      g.circle(cx + r * 0.6, cy - r * 0.8, r * 0.25).fill(bomb.isSuper ? 0xffd23f : 0xff7a1a);
      if (bomb.isSuper) g.circle(cx, cy, r + 2).stroke({ width: 2, color: 0xffd23f });
    }
    for (const ball of s.balls) {
      let fx = ball.x;
      let fy = ball.y;
      if (!isBlocker(s, ball.x + DX[ball.dir]!, ball.y + DY[ball.dir]!)) {
        const k = Math.min(1, ((ball.age % 4) + alpha) / 4);
        fx += DX[ball.dir]! * k;
        fy += DY[ball.dir]! * k;
      }
      this.sportsBall(
        g,
        (fx + 0.5) * T,
        (fy + 0.5) * T,
        T * 0.36,
        ball.id % 4,
        now / 120 + ball.id,
      );
    }
  }

  private crystal(g: Graphics, x: number, y: number, r: number, color: number): void {
    g.poly([x, y - r, x + r * 0.7, y, x, y + r, x - r * 0.7, y]).fill(color);
    g.poly([x, y - r, x + r * 0.7, y, x, y]).fill({ color: 0xffffff, alpha: 0.35 });
    g.poly([x, y - r, x + r * 0.7, y, x, y + r, x - r * 0.7, y]).stroke({
      width: 1.5,
      color: 0xffffff,
    });
  }

  /** Soccer, basketball, tennis or volleyball, drawn in code (D-14, 20 Nov). */
  private sportsBall(
    g: Graphics,
    x: number,
    y: number,
    r: number,
    kind: number,
    spin: number,
  ): void {
    const lw = Math.max(1, r * 0.12);
    g.circle(x + r * 0.15, y + r * 0.25, r).fill({ color: 0x000000, alpha: 0.2 });
    if (kind === 0) {
      // Soccer: white with a black pentagon and patches.
      g.circle(x, y, r).fill(0xffffff);
      const pts: number[] = [];
      for (let k = 0; k < 5; k++) {
        const a = spin + (k * 2 * Math.PI) / 5;
        pts.push(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38);
      }
      g.poly(pts).fill(0x111111);
      for (let k = 0; k < 5; k++) {
        const a = spin + (k * 2 * Math.PI) / 5 + Math.PI / 5;
        g.circle(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, r * 0.2).fill(0x111111);
      }
      g.circle(x, y, r).stroke({ width: lw, color: 0x333333 });
    } else if (kind === 1) {
      // Basketball: orange with black seams.
      g.circle(x, y, r).fill(0xf07a22);
      const c = Math.cos(spin);
      const sn = Math.sin(spin);
      g.moveTo(x - c * r, y - sn * r)
        .lineTo(x + c * r, y + sn * r)
        .stroke({ width: lw, color: 0x2a1408 });
      g.moveTo(x + sn * r, y - c * r)
        .lineTo(x - sn * r, y + c * r)
        .stroke({ width: lw, color: 0x2a1408 });
      arcAt(g, x - c * r * 1.1, y - sn * r * 1.1, r * 0.8, spin - 1, spin + 1).stroke({
        width: lw,
        color: 0x2a1408,
      });
      arcAt(
        g,
        x + c * r * 1.1,
        y + sn * r * 1.1,
        r * 0.8,
        spin + Math.PI - 1,
        spin + Math.PI + 1,
      ).stroke({
        width: lw,
        color: 0x2a1408,
      });
      g.circle(x, y, r).stroke({ width: lw, color: 0x2a1408 });
    } else if (kind === 2) {
      // Tennis: yellow-green felt with white curved seams.
      g.circle(x, y, r).fill(0xd4ef3a);
      arcAt(g, x - r * 1.15, y, r * 0.85, -0.9, 0.9).stroke({ width: lw * 1.2, color: 0xffffff });
      arcAt(g, x + r * 1.15, y, r * 0.85, Math.PI - 0.9, Math.PI + 0.9).stroke({
        width: lw * 1.2,
        color: 0xffffff,
      });
    } else {
      // Volleyball: white, yellow and blue panels.
      g.circle(x, y, r).fill(0xffffff);
      for (let k = 0; k < 3; k++) {
        const a = spin + (k * 2 * Math.PI) / 3;
        arcAt(
          g,
          x + Math.cos(a) * r * 0.9,
          y + Math.sin(a) * r * 0.9,
          r * 0.9,
          a + Math.PI - 0.9,
          a + Math.PI + 0.9,
        ).stroke({
          width: lw * 1.6,
          color: k === 0 ? 0x2a62d6 : k === 1 ? 0xf2c230 : 0x2a62d6,
        });
      }
      g.circle(x, y, r).stroke({ width: lw, color: 0x2a62d6 });
    }
    g.circle(x - r * 0.35, y - r * 0.4, r * 0.2).fill({ color: 0xffffff, alpha: 0.45 });
  }

  // ------------------------------------------------------------ boss

  /** BS-14 poses; they never affect the simulation. */
  private pose(s: MatchState, now: number): Pose {
    const b = s.boss;
    if (b.state === 'defeated' || s.boss.hp <= 0) return '07';
    if (s.tick - b.lastHitTick < 8 && now % 1 >= 0) return '05';
    if (b.state === 'warning') return '02';
    if (b.state === 'attack') return '03';
    if (b.state === 'recovery') return b.age < 15 ? '03' : '06';
    return '01';
  }

  private drawBoss(s: MatchState, now: number): void {
    const { cx, cy, coreRadius } = s.maze;
    const T = this.tile;
    const visible = s.phase === 'boss';
    this.bossSprite.visible = visible;
    if (!visible) return;
    const tex = this.textures.get(`${this.tier}/${this.pose(s, now)}`);
    if (tex) this.bossSprite.texture = tex;
    const size = (2 * coreRadius + 1) * T * 1.12;
    this.bossSprite.anchor.set(0.5, 0.58);
    this.bossSprite.width = size;
    this.bossSprite.height = size;
    this.bossSprite.x = (cx + 0.5) * T;
    this.bossSprite.y = (cy + 0.5) * T;
    this.bossSprite.alpha = s.tick - s.boss.lastHitTick < 8 && Math.floor(now / 60) % 2 ? 0.6 : 1;
  }

  // ------------------------------------------------------------ players

  private drawPlayers(s: MatchState, alpha: number, now: number): void {
    const g = this.playerG;
    const T = this.tile;
    g.clear();
    for (const p of s.players) {
      let fx = p.x;
      let fy = p.y;
      if (p.step) {
        const k = Math.min(0.999, (p.step.progress + alpha * 60) / 300);
        fx += DX[p.step.dir]! * k;
        fy += DY[p.step.dir]! * k;
      }
      const x = (fx + 0.5) * T;
      const y = (fy + 0.5) * T;
      const r = T * 0.36;
      const color = PLAYER_COLORS[p.slot];
      const blink = p.invulnerable > 0 && Math.floor(now / 80) % 2 === 0;
      const a = blink ? 0.35 : 1;
      g.circle(x + r * 0.12, y + r * 0.2, r).fill({ color: 0x000000, alpha: 0.25 * a });
      // Facing arrow (D-05), drawn behind the disc.
      const fdx = DX[p.facing]!;
      const fdy = DY[p.facing]!;
      g.poly([
        x + fdx * r * 1.45,
        y + fdy * r * 1.45,
        x + fdx * r * 0.6 - fdy * r * 0.55,
        y + fdy * r * 0.6 + fdx * r * 0.55,
        x + fdx * r * 0.6 + fdy * r * 0.55,
        y + fdy * r * 0.6 - fdx * r * 0.55,
      ]).fill({ color: 0xffffff, alpha: a });
      g.circle(x, y, r).fill({ color, alpha: a });
      g.circle(x, y, r).stroke({ width: Math.max(2, T * 0.08), color: 0xffffff, alpha: a });
      // P2 also has a square marker so the two differ without colour (UI-01).
      if (p.slot === 1)
        g.rect(x - r * 0.95, y - r * 0.95, r * 1.9, r * 1.9).stroke({
          width: 1.5,
          color: 0xffffff,
          alpha: 0.6 * a,
        });
      // Charge ring (CH rules): fills over 60 ticks; grey when Super is not possible.
      const hold = Math.max(p.bombHold, p.shieldHold);
      if (hold > 7) {
        const isBomb = p.bombHold >= p.shieldHold;
        const energy = isBomb ? p.attack : p.defense;
        const ok = energy >= 3 && (isBomb || s.phase === 'escape');
        const k = Math.min(1, hold / 60);
        arcAt(g, x, y, r * 1.35, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2).stroke({
          width: Math.max(2, T * 0.12),
          color: ok ? (k >= 1 ? 0xffd23f : 0xffffff) : 0x777777,
        });
      }
      if (p.hasToken) this.crystal(g, x + r * 0.9, y - r * 0.9, r * 0.5, color);
      const label = this.labels[p.slot]!;
      label.x = x;
      label.y = y;
      label.alpha = a;
    }
  }

  // ------------------------------------------------------------ effects

  private drawFx(s: MatchState, now: number): void {
    const g = this.fxG;
    const T = this.tile;
    g.clear();
    this.blasts = this.blasts.filter((b) => now - b.start < 380);
    for (const b of this.blasts) {
      const k = (now - b.start) / 380;
      for (const i of b.tiles) {
        const x = i % s.maze.w;
        const y = Math.floor(i / s.maze.w);
        const grow = 0.35 + k * 0.6;
        g.circle((x + 0.5) * T, (y + 0.5) * T, T * grow * (b.isSuper ? 0.75 : 0.6)).fill({
          color: k < 0.4 ? 0xfff3a0 : b.isSuper ? 0xffb020 : 0xff7a1a,
          alpha: 0.85 * (1 - k),
        });
      }
    }
    this.pops = this.pops.filter((p) => now - p.start < 300);
    for (const p of this.pops) {
      const k = (now - p.start) / 300;
      let x = p.x;
      let y = p.y;
      if (p.x < 0) {
        const pl = s.players[p.y as 0 | 1];
        x = pl.x;
        y = pl.y;
      }
      g.circle((x + 0.5) * T, (y + 0.5) * T, T * (0.3 + k * 0.5)).stroke({
        width: 3,
        color: p.color,
        alpha: 1 - k,
      });
    }
  }
}
