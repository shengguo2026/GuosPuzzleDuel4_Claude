# Guo's Puzzle Duel IV: theme tile prompts (IV-06 to IV-10)

Codex prompts for the maze tiles of the five themes. Status: **ready to generate** (20 Nov 2026). Replaces the 2×2 tile-sheet prompt in `art_prompt.md` §3.

## What the tiles do

The five themes are **visual only** (GDD M-005): the same seed and rules give the same match in every theme. The game already ships **procedural tiles** (a palette and a pattern per theme, drawn in code), so these images never block a milestone. They replace the flat procedural look with painted textures that match the title art and the boss art:

- Every maze floor and wall in matches, Campaign chapters (one chapter per theme), Challenges and Random mazes.
- Campaign chapter covers (theme tiles + title art) and the theme picker in the lobby.
- Museum room backgrounds (theme pattern).

Traps, teleporters, ice, conveyors, boost pads, orbs, hearts, timed gates, fog, bombs, shields, boss-created walls and the colour-blind patterns stay **drawn in code** on top of these tiles, so the tiles must stay quiet enough for those to read.

**When to add them:** any time. The renderer loads a theme's tile files when they exist and falls back to the procedural tiles when they don't, so the tiles can be added after M7 as a drop-in content update with no rule or code change.

## What to generate

Per theme **4 single tiles**, one tile per image (Codex ignores multi-part layouts too often for a 2×2 sheet). 5 themes × 4 = **20 images**, all **1024×1024**, seen **straight from above**.

| Suffix | Tile | Game use | Must read as |
|---|---|---|---|
| `a` | **Floor** | Every walkable tile, the boss arena ring | Calm, low contrast, no focal object; seamless when tiled |
| `b` | **Solid wall** | Walls that never break (ENV-WA-01) | A solid block, clearly different in brightness from the floor |
| `c` | **Destructible wall** | Walls a Super Bomb removes (ENV-WA-02) | The **same block as `b`** with clear cracks and chips; readable by **shape**, not only colour |
| `d` | **Sealed shortcut door** | Doors that open when the boss falls (D-34) | The same block family as `b`, with a sealed door and a gold **crown symbol** in the centre |

Order per theme: **a → b → c → d.** Attach the previous approved tile of the same theme as an extra reference for the next one (attach `b` for both `c` and `d`).

How the tiles are shown: a maze tile is about **30 px** on a large maze and about **64 px** on a small one. Large simple shapes and a strong silhouette matter more than fine detail.

## Shared tile block (paste into every prompt)

Attach `GuosPuzzleDuel4/title/guos-puzzle-duel-iv-title.png` (the approved title v2) as the **style and colour reference**.

> Style: polished, glossy 2D cartoon game art in the same style as the attached reference, bold clean shapes, soft cel shading, bright saturated but not neon colours, even lighting from the top-left. A single square game tile seen exactly from above, flat orthographic top-down view, no perspective, no horizon, no camera tilt. The tile fills the whole square canvas edge to edge, with no border, frame, drop shadow or background around it. Large simple shapes that stay readable when shrunk to 32 pixels. No characters, no creatures, no people, no items, no text, no letters, no numbers, no logos, no watermark, no UI.

Extra lines per tile type (add after the shared block):

- **Floor (a):** `The texture must tile seamlessly: matching left/right and top/bottom edges, no vignette, no darker corners, no single central object, an even scatter of small details. Keep it low in contrast so small game pieces drawn on top stay easy to see.`
- **Solid wall (b):** `A raised solid wall block seen from above: a flat top face with a thin bevelled rim on all four sides, clearly brighter or darker than the floor. It looks heavy and unbreakable.`
- **Destructible wall (c):** `The same wall block as the attached reference, same colours and rim, but visibly damaged: several bold cracks from the centre outward and a few chipped corners, so it reads as breakable even in black and white.`
- **Sealed shortcut door (d):** `The same wall block family as the attached reference, with a sealed double door set into its top face, closed with a band across it, and a gold crown symbol (three points, a small ball on each point) in the centre. It reads as a locked door that will open later.`

## Theme prompts

Fill `<FLOOR>`, `<WALL>`, `<CRACK>` and `<DOOR>` from the table and use this template:

```text
[shared tile block]
[extra line for the tile type]
Theme: <THEME>. <FLOOR or WALL or CRACK or DOOR text for this tile>.
```

### IV-06 · Enchanted Garden

| Tile | Text | Save as |
|---|---|---|
| a | Floor: soft green moss and clover with tiny white and pink flowers and a few round stepping stones, fresh spring green | `tiles/garden/tile-garden-a-floor.png` |
| b | Wall: a neatly trimmed hedge block, dense dark-green leaves, a thin border of light stone along the rim | `tiles/garden/tile-garden-b-wall.png` |
| c | Crack: the same hedge block with broken twigs, torn gaps showing brown branches inside, a few loose leaves | `tiles/garden/tile-garden-c-cracked.png` |
| d | Door: a hedge block with an arched wooden garden door wrapped in golden vines, gold crown symbol in the centre | `tiles/garden/tile-garden-d-door.png` |

### IV-07 · Desert Ruins

| Tile | Text | Save as |
|---|---|---|
| a | Floor: warm golden sand with faint ripples and a few half-buried patterned stone slabs | `tiles/desert/tile-desert-a-floor.png` |
| b | Wall: a block of large sandstone bricks with carved edges, warm orange-beige | `tiles/desert/tile-desert-b-wall.png` |
| c | Crack: the same sandstone block with deep cracks, crumbled corners and small piles of sand | `tiles/desert/tile-desert-c-cracked.png` |
| d | Door: a sandstone block with a carved stone door and bronze bands, gold crown symbol in the centre | `tiles/desert/tile-desert-d-door.png` |

### IV-08 · Crystal Caverns

| Tile | Text | Save as |
|---|---|---|
| a | Floor: dark blue-grey slate with tiny glowing cyan specks and thin mineral veins | `tiles/crystal/tile-crystal-a-floor.png` |
| b | Wall: a violet crystal-rock block with smooth faceted plates, cool lavender highlights | `tiles/crystal/tile-crystal-b-wall.png` |
| c | Crack: the same crystal-rock block, split by bright fractures, a few shards chipped off the edges | `tiles/crystal/tile-crystal-c-cracked.png` |
| d | Door: a crystal-rock block with a door of clear cyan crystal panes, gold crown symbol in the centre | `tiles/crystal/tile-crystal-d-door.png` |

### IV-09 · Neon Circuit

| Tile | Text | Save as |
|---|---|---|
| a | Floor: dark navy panels with faint thin circuit lines and small soft-glowing nodes | `tiles/neon/tile-neon-a-floor.png` |
| b | Wall: a glossy dark metal panel block with glowing cyan edges | `tiles/neon/tile-neon-b-wall.png` |
| c | Crack: the same panel block, dented and split, broken edge lights flickering, small sparks at the cracks | `tiles/neon/tile-neon-c-cracked.png` |
| d | Door: a panel block with a sliding blast door and glowing magenta strips, gold crown symbol in the centre | `tiles/neon/tile-neon-d-door.png` |

### IV-10 · Volcanic Citadel

| Tile | Text | Save as |
|---|---|---|
| a | Floor: dark basalt flagstones with thin glowing orange cracks between them | `tiles/volcanic/tile-volcanic-a-floor.png` |
| b | Wall: a black stone block with iron corner plates and glowing rivets | `tiles/volcanic/tile-volcanic-b-wall.png` |
| c | Crack: the same black stone block, broken open with glowing lava-orange cracks and chipped corners | `tiles/volcanic/tile-volcanic-c-cracked.png` |
| d | Door: a black stone block with a heavy iron portcullis door, gold crown symbol in the centre | `tiles/volcanic/tile-volcanic-d-door.png` |

## Review checklist

I check each tile against these points:

1. Exactly top-down, fills the canvas, no frame or outer shadow.
2. Floor tiles without visible seams in a 3×3 test grid (I fix small seams in the pipeline).
3. Wall `b` is clearly brighter or darker than floor `a` (also in greyscale).
4. Cracked wall `c` reads as breakable in greyscale at 32 px.
5. Door `d` shows the crown and reads as a door at 32 px.
6. The four tiles of a theme look like one set; the five themes match the colours of the title art.
7. No text, characters or objects.

Save into this repo under `GuosPuzzleDuel4/tiles/<theme>/` with the names above (a second candidate gets `_v2`), then tell me the names and I review them in `art_catalogue.md`.
