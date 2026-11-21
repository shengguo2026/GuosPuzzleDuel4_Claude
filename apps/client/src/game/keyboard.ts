/**
 * Keyboard input (WP 2a.9, D-02, MV-06, CH-01). Keys are read by physical
 * position (`KeyboardEvent.code`), so Numpad 1/2 work with Num Lock on or off
 * and WASD stays in place on QWERTZ and AZERTY keyboards.
 *
 * Each tick the session samples one `PlayerInput` per player: the most
 * recently pressed direction that is still held, a direction pressed since
 * the last sample, and whether each ability button is down. A press and
 * release between two samples still counts as one tick down (a tap).
 */
import type { Dir, PlayerInput } from '@gpd4/sim';

export interface Bindings {
  dirs: Record<string, Dir>;
  bomb: string[];
  shield: string[];
}

const WASD: Record<string, Dir> = { KeyW: 0, KeyD: 1, KeyS: 2, KeyA: 3 };
const ARROWS: Record<string, Dir> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };

/** Solo / single player: WASD + Q/E, or arrows + Numpad 1/2 (D-02). */
export const SOLO_BINDINGS: Bindings = {
  dirs: { ...WASD, ...ARROWS },
  bomb: ['KeyQ', 'Numpad1', 'Comma'],
  shield: ['KeyE', 'Numpad2', 'Period'],
};

/** Local VS on one keyboard (D-02). */
export const VS_BINDINGS: [Bindings, Bindings] = [
  { dirs: WASD, bomb: ['KeyQ'], shield: ['KeyE'] },
  { dirs: ARROWS, bomb: ['Numpad1', 'Comma'], shield: ['Numpad2', 'Period'] },
];

export const PAUSE_KEYS = ['Escape', 'KeyP'];

class PlayerKeys {
  private heldStack: string[] = [];
  private pressed: Dir | -1 = -1;
  private down = { bomb: false, shield: false };
  private latched = { bomb: false, shield: false };

  constructor(readonly bindings: Bindings) {}

  owns(code: string): boolean {
    return (
      code in this.bindings.dirs ||
      this.bindings.bomb.includes(code) ||
      this.bindings.shield.includes(code)
    );
  }

  keyDown(code: string): void {
    const dir = this.bindings.dirs[code];
    if (dir !== undefined) {
      this.heldStack = this.heldStack.filter((c) => c !== code);
      this.heldStack.push(code);
      this.pressed = dir;
    }
    for (const ability of ['bomb', 'shield'] as const) {
      if (this.bindings[ability].includes(code)) {
        this.down[ability] = true;
        this.latched[ability] = true;
      }
    }
  }

  keyUp(code: string): void {
    this.heldStack = this.heldStack.filter((c) => c !== code);
    for (const ability of ['bomb', 'shield'] as const)
      if (this.bindings[ability].includes(code)) this.down[ability] = false;
  }

  sample(): PlayerInput {
    const top = this.heldStack[this.heldStack.length - 1];
    const input: PlayerInput = {
      held: top === undefined ? -1 : this.bindings.dirs[top]!,
      pressed: this.pressed,
      bomb: this.down.bomb || this.latched.bomb,
      shield: this.down.shield || this.latched.shield,
    };
    this.pressed = -1;
    this.latched = { bomb: false, shield: false };
    return input;
  }

  reset(): void {
    this.heldStack = [];
    this.pressed = -1;
    this.down = { bomb: false, shield: false };
    this.latched = { bomb: false, shield: false };
  }
}

export class KeyboardInput {
  private players: PlayerKeys[];
  private onPause: () => void;
  private listening = false;

  constructor(bindings: Bindings[], onPause: () => void) {
    this.players = bindings.map((b) => new PlayerKeys(b));
    this.onPause = onPause;
  }

  private handleDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (PAUSE_KEYS.includes(e.code)) {
      if (!e.repeat) this.onPause();
      e.preventDefault();
      return;
    }
    let used = false;
    for (const p of this.players)
      if (p.owns(e.code)) {
        used = true;
        if (!e.repeat) p.keyDown(e.code);
      }
    if (used) e.preventDefault();
  };

  private handleUp = (e: KeyboardEvent) => {
    for (const p of this.players) if (p.owns(e.code)) p.keyUp(e.code);
  };

  private handleBlur = () => this.reset();

  attach(): void {
    if (this.listening) return;
    this.listening = true;
    window.addEventListener('keydown', this.handleDown);
    window.addEventListener('keyup', this.handleUp);
    window.addEventListener('blur', this.handleBlur);
  }

  detach(): void {
    this.listening = false;
    window.removeEventListener('keydown', this.handleDown);
    window.removeEventListener('keyup', this.handleUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  sample(slot: number): PlayerInput {
    return this.players[slot]?.sample() ?? { held: -1, pressed: -1, bomb: false, shield: false };
  }

  reset(): void {
    for (const p of this.players) p.reset();
  }
}
