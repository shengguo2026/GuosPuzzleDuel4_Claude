/**
 * The five theme palettes for the procedural tiles (WP 2a.11). A theme only
 * changes colours: the simulation never sees it (M-005). The optional theme
 * tile art (tile_prompts.md) can replace these drawings later.
 */
export const THEMES = ['garden', 'desert', 'caverns', 'neon', 'volcano'] as const;
export type ThemeId = (typeof THEMES)[number];

export interface Palette {
  background: number;
  floor: number;
  floorAlt: number;
  floorDot: number;
  wall: number;
  wallTop: number;
  wallEdge: number;
  destructible: number;
  crack: number;
  ring: number;
  core: number;
  coreEdge: number;
  shortcut: number;
  crown: number;
  entrance: number;
}

export const PALETTES: Record<ThemeId, Palette> = {
  garden: {
    background: 0x1d3b24,
    floor: 0x9fd67a,
    floorAlt: 0x93cc6e,
    floorDot: 0xf7e46b,
    wall: 0x2f6b3a,
    wallTop: 0x4b9a4e,
    wallEdge: 0x1f4a28,
    destructible: 0x8a6b45,
    crack: 0x4d3a23,
    ring: 0xc7e89a,
    core: 0x6c4f8f,
    coreEdge: 0xf3d548,
    shortcut: 0x6d5a3a,
    crown: 0xf3d548,
    entrance: 0xe9f6d4,
  },
  desert: {
    background: 0x4a3220,
    floor: 0xf0d39a,
    floorAlt: 0xe8c98c,
    floorDot: 0xcf9b5a,
    wall: 0xb5653a,
    wallTop: 0xd7834c,
    wallEdge: 0x7a3f22,
    destructible: 0xa88a62,
    crack: 0x5d4428,
    ring: 0xf7e2b6,
    core: 0x8a4b2c,
    coreEdge: 0xffd36a,
    shortcut: 0x7a5233,
    crown: 0xffd36a,
    entrance: 0xfff3d6,
  },
  caverns: {
    background: 0x1a1336,
    floor: 0x6f6bb8,
    floorAlt: 0x6763ad,
    floorDot: 0x9ff0ff,
    wall: 0x3a2a73,
    wallTop: 0x5a44a8,
    wallEdge: 0x22184a,
    destructible: 0x4f83a8,
    crack: 0x1f3550,
    ring: 0x8d89d6,
    core: 0x2a1f5c,
    coreEdge: 0x7ef0ff,
    shortcut: 0x3d3470,
    crown: 0x7ef0ff,
    entrance: 0xd8d6ff,
  },
  neon: {
    background: 0x0a0b1e,
    floor: 0x1b1f45,
    floorAlt: 0x191c40,
    floorDot: 0x29e7ff,
    wall: 0x2c1458,
    wallTop: 0xff3fd2,
    wallEdge: 0x14082e,
    destructible: 0x335c88,
    crack: 0x29e7ff,
    ring: 0x252a5c,
    core: 0x120a2e,
    coreEdge: 0x29e7ff,
    shortcut: 0x3a1f66,
    crown: 0xfff04a,
    entrance: 0x4cffb0,
  },
  volcano: {
    background: 0x1c0d0a,
    floor: 0x5b4540,
    floorAlt: 0x543f3a,
    floorDot: 0xff8a2a,
    wall: 0x2a1a18,
    wallTop: 0x4a2c26,
    wallEdge: 0x120806,
    destructible: 0x7a3a22,
    crack: 0xff6a1a,
    ring: 0x6b524b,
    core: 0x3a1410,
    coreEdge: 0xff6a1a,
    shortcut: 0x3a2420,
    crown: 0xffc23a,
    entrance: 0xffd8b0,
  },
};

/** Player colours (D-13): P1 blue "1", P2 red "2". */
export const PLAYER_COLORS = [0x2f7bff, 0xe8413c] as const;
export const PLAYER_CSS = ['#2f7bff', '#e8413c'] as const;
