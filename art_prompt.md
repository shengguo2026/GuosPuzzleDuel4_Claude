# Guo's Puzzle Duel IV: art, video and music prompts

This file holds everything that needs to be generated outside the code: **Codex** images, one **Google Flow** title loop clip, and **Google Flow Music** cues. Everything else is reused or drawn in code (section 2).

Goal: **as few new assets as possible.**

| Kind | Required | Optional polish |
|---|---|---|
| Codex images | **5** (1 title key art, 4 character portraits) | 5 theme tile sheets |
| Flow video | **1** (title loop, 8 s) | — |
| Flow Music cues | **3** (Title/Menu, Boss Phase, Escape Phase) | 2 (Results, Calm bed) |

Until a file arrives the game uses a placeholder (code-drawn shape or a reused GPD2 track), so nothing here blocks implementation. It only blocks the final look-and-feel tests.

## 0. Workflow

1. Generate in the order of section 3 (characters first, because the title art uses them as references).
2. Save the files into the **Pictures** repo under `GuosPuzzleDuelIV/` with the **Save as** name (a second candidate gets `_v2`).
3. Tell me the file names. I pull them into this repo through the asset pipeline (webp/ogg/m4a, hashed names), crop, cut tokens and wire them up.

Folder layout in the Pictures repo:

```
GuosPuzzleDuelIV/
  title/       IV-01 title key art
  characters/  IV-02 … IV-05
  tiles/       IV-06 … IV-10 (optional)
  video/       FLOW-IV-TITLE-LOOP.mp4
  music/       M01 … M05
```

---

## 1. Shared style (paste into every Codex prompt)

The boss art from Puzzle Duel III sets the look. Attach `Pictures/GuosPuzzleDuelIII/boss/guo-boss-01-idle.png` as a **style reference** for every Codex image.

> Style: polished, glossy 2D cartoon game illustration in the same style as the attached reference, bold clean outlines, soft cel shading with gentle gradients, bright saturated colours, warm rim light, crisp readable silhouette at small sizes, colourful modern arcade mood. No text, no letters, no numbers, no logos, no watermark, no signature, no UI frames.

---

## 2. What is reused (no new art)

### 2.1 Boss: Guo (all 8 states already exist)

Source: `Pictures/GuosPuzzleDuelIII/boss/` (1024×1024 PNG, transparent), made from your photo `GuoPhoto.jpg`.

| Game state | File |
|---|---|
| Idle (Boss Phase, between attacks) | `guo-boss-01-idle.png` |
| Warning / charging telegraph | `guo-boss-02-charging.png` |
| Attack (Orb Shot, Shockwave) | `guo-boss-03-attack.png` |
| Freeze Field cast | `guo-boss-04-freeze-cast.png` |
| Hit (takes bomb damage) | `guo-boss-05-hit.png` |
| Recovery window | `guo-boss-06-recovering.png` |
| Defeated (phase flip → Escape) | `guo-boss-07-defeated.png` |
| Victory (both players KO'd / draw screen) | `guo-boss-08-victory.png` |

The boss stands in the maze centre as a large billboard sprite over the arena; telegraphs, rings and stripes are drawn in code. The same images feed the Museum "Boss Hall" and the results screens.

### 2.2 Other reuse

| Need | Reused from | Notes |
|---|---|---|
| Favicon / logo mark | `C:\AI\Claude\Specifications\favicon.svg` | Unified Guo mark, used as favicon, app icon and next to the title text |
| Title text "Guo's Puzzle Duel IV" | Drawn in code | Same treatment as GPD2's intro poster; never baked into images, so EN/ZH/DE work |
| P1 / P2 tokens | GPD2 `crystal-blue`, `crystal-red` (`apps/web/public/assets/base/`) | Plus "1"/"2" label for colour independence |
| Achievement pictures (~28) | GPD2 base badges (`*.full/.badge/.silhouette.webp`) | Tier frame (Bronze/Silver/Gold/Platinum) drawn in code; mapping below |
| Extra achievement pictures | GPD2 pack art (barrierWars, combat, grandGauntlet, …) | Reserve pool if the catalogue grows |
| WiFi / shared-keyboard achievements | `Pictures/TowerDefense/ACH-WIFI-HANDSHAKE.png`, `ACH-HOT-SEAT-DUEL.png` | Only if you like the mixed style; otherwise GPD2 `onlineChampion`, `duelist` |
| Bombs, shields, blasts, barrier, Freeze tiles, entrances/gates, HUD icons | Drawn in code (vector + particles) | Needed for crisp scaling, colour-blind patterns and the graphics-quality setting |
| Maze tiles for the 5 themes | Procedural (palette + pattern per theme) | IV-06…10 optional upgrade |
| Store cosmetics (colour trims, token shapes, trails, nameplates) | Drawn in code | Zero art per item |
| Museum room backgrounds | Gradient + theme pattern + reused art cards | |
| SFX | Synthesised (port of GPD2 `audio/synth.ts`) | |
| Announcer EN/ZH/DE ("SUPER!", "AMAZING!", "厉害！", phase calls) | Offline TTS pipeline (port of GPD2 `tools/voice/build-voice.py`) | No recording needed |
| Placeholder music until Flow cues arrive | GPD2 `music-menu`, `music-duel-base/layer1-3`, `music-victory`, `music-defeat` | |

Achievement art mapping (GPD2 base set):

| GPD4 achievement (proposed) | Picture |
|---|---|
| First Duel: finish a match | `firstDuel` |
| First Victory | `firstVictory` |
| First Strike: hit the rival with a bomb | `firstStrike` |
| First Crack: destroy a breakable wall | `firstCrack` |
| Wall Breaker: destroy 100 walls | `wallBreaker` |
| Demolition Day: Super Bomb breaks a Super Shield | `demolitionDay` |
| Chain Reaction: one bomb sets off another | `chainReaction` |
| Blockade: a Super Shield holds for the full 15 s | `superShield` |
| Iron Wall: shields block 25 hits | `ironWall` |
| Deep Strike: land the final boss hit 10 times | `deepStrike` |
| Master Slayer: defeat the Ultimate boss | `masterSlayer` |
| Hard Won: win on Extreme | `hardWon` |
| Breakthrough: escape within 30 s of the boss falling | `breakthrough` |
| Invader: win by escape 25 times | `invader` |
| Overrun: win by knock-out 10 times | `overrun` |
| Last Line: win with 1 Life left | `lastLine` |
| Survivor: win without losing a Life | `survivor` |
| Unstoppable: 5 wins in a row | `unstoppable` |
| Veteran: 100 matches | `veteran` |
| Duelist: 10 Local VS matches | `duelist` |
| WiFi Champion: 10 WiFi VS wins | `onlineChampion` |
| Gem Collector: collect 25 tokens | `gemCollector` |
| Gold Rush: earn 5,000 credits | `goldRush` |
| Challenger: finish a Challenge | `challenger` |
| Challenge Graduate: Bronze on all 25 | `challengeGraduate` |
| Tactician: 3 stars on a full chapter | `tactician` |
| Super Star: 120 Campaign stars | `superStar` |
| Curator: 30 Museum exhibits | `curator` |
| Color Specialist: own every colour trim | `colorSpecialist` |

---

## 3. Codex image prompts

Codex output sizes: 1024×1024, 1536×1024, 1024×1536. Ask for a transparent background where noted.

### IV-02 to IV-05 · Character portraits (required, make these first)

One image per character, same framing so they line up in the character select and so I can cut a round **head token** for the maze (the token gets a blue or red ring, a "1"/"2" label and a direction arrow in code).

- **Size:** 1024×1024, **transparent background**.
- **Framing (all four):** full body, standing, three-quarter view facing the viewer, centred, feet at about 92% of the height, head top at about 8%, **big readable head** (head about one third of the body height), friendly confident expression, mouth closed smile, eyes looking at the viewer.
- **Colour rule:** avoid large areas of pure blue or pure red, because the game puts blue (P1) and red (P2) rings around the characters.
- **References to attach:** the style reference (§1), and for IV-03 to IV-05 also the approved IV-02, so all four match.
- **What I check:** same scale and line weight in all four, clean transparent edges, no text, head readable at 48 px.

**IV-02 · Explorer** · Save as `GuosPuzzleDuelIV/characters/char-explorer.png`

```text
A cheerful young adventurer mascot character for a colourful arcade maze game: khaki explorer jacket with many pockets, olive-green scarf, sturdy brown boots, a leather satchel across the body, a rolled paper map in the right hand, a small brass compass on a cord, short tousled brown hair under a wide-brim sand-coloured explorer hat. Full body, standing, three-quarter view facing the viewer, centred, big readable head about one third of body height, friendly confident closed-mouth smile, looking at the viewer. Transparent background, no ground shadow.
[paste the shared style block]
```

**IV-03 · Robot** · Save as `GuosPuzzleDuelIV/characters/char-robot.png`

```text
A friendly small robot mascot character for a colourful arcade maze game: rounded pearl-white and silver body with soft panel lines, a large rounded screen face showing two glowing mint-green eyes and a small curved smile line, one short antenna with a glowing yellow tip, stubby arms with three-fingered hands, the right hand giving a small wave, two short legs with rubber-grey feet, small mint-green light strips on the chest. Full body, standing, three-quarter view facing the viewer, centred, big readable head about one third of body height, same scale and framing as the attached Explorer. Transparent background, no ground shadow.
[paste the shared style block]
```

**IV-04 · Fox Adventurer** · Save as `GuosPuzzleDuelIV/characters/char-fox.png`

```text
A clever anthropomorphic fox adventurer mascot character for a colourful arcade maze game: warm amber-orange fur with cream chest and muzzle, big pointed ears, a fluffy tail with a white tip curling beside the legs, a teal travel vest with brass buttons, a brown leather belt with small pouches, short brown boots, aviator goggles pushed up on the forehead, the left hand on the hip, the right hand holding a small glowing lantern. Full body, standing, three-quarter view facing the viewer, centred, big readable head about one third of body height, playful confident closed-mouth smile, same scale and framing as the attached Explorer. Transparent background, no ground shadow.
[paste the shared style block]
```

**IV-05 · Mystic Slime** · Save as `GuosPuzzleDuelIV/characters/char-slime.png`

```text
A cute magical slime mascot character for a colourful arcade maze game: a round, glossy, semi-translucent mint-green and lime jelly body shaped like a soft droplet, with tiny floating sparkles and a few small bubbles inside, two large shiny dark eyes with white highlights, rosy cheeks, a small happy closed-mouth smile, a tiny violet wizard hat with a golden star tilted on top, two little stubby jelly arms, the right one raised in a cheerful wave. Standing on its own base, three-quarter view facing the viewer, centred, the whole body about the same height as the attached Explorer's head-to-knee, same framing and scale. Transparent background, no ground shadow.
[paste the shared style block]
```

### IV-01 · Title key art (required)

Used as the title screen background, the Flow title loop **start and end frame**, the Windows package image and the Museum entrance.

- **Size:** 1536×1024; I crop to 16:9 (1536×864), so keep everything important in the middle 85% of the height.
- **Save as:** `GuosPuzzleDuelIV/title/guos-puzzle-duel-iv-title.png`
- **References to attach:** style reference (§1), `guo-boss-01-idle.png` (Guo's face, crown and outfit), `char-explorer.png` (IV-02), `char-robot.png` (IV-03).
- **Leave free:** the upper fifth (title text goes there in code) and the lower sixth (menu hint), both calm sky/floor with no small detail.
- **What I check:** Guo's face matches the boss art, both heroes match their portraits, no text anywhere, the maze reads as a maze.

```text
Title key art for a colourful top-down arcade maze duel game. A large glowing tile maze seen from a high three-quarter angle, its walls made of bright rounded blocks in garden green, sandstone, crystal violet, neon cyan and volcanic orange sections, small torches and crystals sparkling along the walls. In the centre of the maze, a round open arena where the boss stands: the man from the attached boss reference, same face, glasses, short black hair, golden whistle crown and purple-and-gold tracksuit, shown from the waist up, arms crossed, confident smile, a glowing multicoloured orb of light floating beside his right shoulder. At the near bottom edge of the maze a small open gate with the attached Explorer character standing in it, surrounded by a soft blue glow; at the far top edge another open gate with the attached Robot character, surrounded by a soft red glow; both heroes face the boss. Deep evening-blue sky with soft light beams and floating sparkles. The upper fifth of the image is calm empty sky and the lower sixth is calm maze floor, both without small details. Wide 16:9 composition centred on the boss.
[paste the shared style block]
```

### IV-06 to IV-10 · Theme tile sheets (optional polish)

The game ships procedural tiles that already look clean; these sheets only add texture. Make them last, and only if time allows. One image per theme, 1024×1024, a **2×2 grid of four square tiles seen straight from above** (orthographic, no perspective), each tile filling its quarter with a 2 px gap:

top-left **floor**, top-right **solid wall** (top face), bottom-left **breakable wall** (visible cracks), bottom-right **reinforced wall** (metal bands or crystal plates).

Save as `GuosPuzzleDuelIV/tiles/tiles-<theme>.png`. I make the floors seamless in the pipeline.

```text
A 2×2 sheet of four square top-down game tiles for a colourful arcade maze game, seen exactly from above, flat orthographic view, no perspective, no shadows falling outside the tiles, even lighting. Top-left: floor tile. Top-right: solid wall tile seen from above. Bottom-left: the same wall with clear cracks so it reads as breakable. Bottom-right: the same wall reinforced with <REINFORCEMENT>. Theme: <THEME>. Each tile fills its quarter exactly, separated by a thin neutral gap.
[paste the shared style block]
```

| ID | `<THEME>` | `<REINFORCEMENT>` | Save as |
|---|---|---|---|
| IV-06 | Enchanted Garden: soft moss-and-clover floor with tiny flowers; hedge-block walls with leaves | woven golden vines and a brass plate | `tiles-garden.png` |
| IV-07 | Desert Ruins: warm sand floor with faint patterned stones; sandstone brick walls | bronze bands and carved stone studs | `tiles-desert.png` |
| IV-08 | Crystal Caverns: dark slate floor with tiny glowing specks; violet crystal-rock walls | clusters of bright cyan crystals | `tiles-crystal.png` |
| IV-09 | Neon Circuit: dark navy floor with faint circuit lines; glossy dark panel walls with cyan edges | thick steel frames with glowing magenta strips | `tiles-neon.png` |
| IV-10 | Volcanic Citadel: dark basalt floor with thin glowing orange cracks; black stone block walls | iron plates with glowing rivets | `tiles-volcanic.png` |

---

## 4. Google Flow: title loop clip (required)

Rules from `Pictures/FightForPeace/FLOW_LESSONS.md` applied: locked camera, small motion only, named gaze targets, nobody walks, mouths closed, one or two quiet sounds named.

**FLOW-IV-TITLE-LOOP**

- **Start frame:** `GuosPuzzleDuelIV/title/guos-puzzle-duel-iv-title.png` (IV-01, cropped 16:9).
- **End frame (if Flow offers it):** the same picture, so the loop has no jump.
- **Length:** 8 s.
- **Save as:** `GuosPuzzleDuelIV/video/FLOW-IV-TITLE-LOOP.mp4`
- **What I check:** Guo's face stays identical, the orb stays beside his shoulder, the two heroes stay in their gates, the maze walls never change shape, no text appears. A usable 0–5 s range is enough; I make the seamless loop in the edit.

```text
From the supplied frame, locked camera, no zoom, the frame never moves. Exactly three characters, the same three for the whole clip, and everyone stays on the spot where they stand.
The man in the centre keeps his arms crossed, breathes slowly and blinks once, eyes on the small hero at the bottom gate; the glowing orb beside his right shoulder slowly swirls its colours and stays beside his shoulder. The small explorer at the bottom gate keeps the map in the right hand and looks up at the man; the small robot at the top gate keeps its arms still and its eyes softly pulse, looking at the man.
The maze walls stay exactly as they are. Torches flicker small and steady, crystals along the walls twinkle, sparkles drift slowly upward, light beams in the sky shimmer gently.
Nobody turns toward us. Hold still at the end in the same poses.
Same glossy cartoon style, faces, hair and outfits throughout. Nobody appears, vanishes or duplicates. Mouths closed. No text, no style change.
Sound: soft magical shimmer and a low warm hum, no voices, no music.
```

Fallback if two tries fail: I build the loop in code from the still (slow orb glow, particle sparkles, light-beam shimmer), which costs no credit.

---

## 5. Google Flow Music cues

### How to make a cue

1. Open Google Flow Music, paste the cue's prompt, then append the **shared exclusions** below.
2. Generate several candidates; keep the best one or two.
3. Save into `GuosPuzzleDuelIV/music/` with the **Save as** name (`_v2` for a second candidate).
4. Tell me the file names. I cut loops, align the Boss/Escape pair for the crossfade and make OGG/M4A.

### Shared musical language

- Bright **modern arcade electro-pop** with an orchestral lift: punchy drums, plucky synth bass, marimba and glockenspiel sparkle, short brass stabs, a little chiptune lead colour.
- One **four-note "crown" motif** (rising, playful) shared by all cues so the soundtrack feels like one family.
- **Boss Phase and Escape Phase share key and tempo** so the game can crossfade between them in under a second when the boss falls: both around **132 BPM, A minor**.
- Leave space for announcer calls, warning sounds, bomb blasts and voices; no wall-of-sound mastering.

### Shared exclusions (append to every request)

> Instrumental only, no lyrics, no vocals, no choir words, no recognizable copyrighted melody, no imitation of a named artist, composer, film, anime or game soundtrack, no harsh mastering, no clipped transients, no abrupt ending, no explosions, alarms or sound effects embedded in the music, no long exposed solo that prevents looping. Leave frequency space for announcer voice, warning cues and impact sounds.

### Overview

| # | Cue | Use | Required | Save as |
|---|---|---|---|---|
| M01 | Crown of the Maze | Title loop, main dashboard menus | ✔ | `M01_Crown of the Maze.mp3` |
| M02 | Guo's Arena | Boss Phase (all themes) | ✔ | `M02_Guos Arena.mp3` |
| M03 | Race to the Gate | Escape Phase (all themes) | ✔ | `M03_Race to the Gate.mp3` |
| M04 | Results Fanfare | Victory / draw / defeat results (I cut three endings) | optional | `M04_Results Fanfare.mp3` |
| M05 | Quiet Gallery | Museum, Store, Profiles, Statistics | optional | `M05_Quiet Gallery.mp3` |

Five themes share M02/M03; each theme adds a quiet ambience layer synthesised in code (birds and leaves, desert wind, cave drips, neon hum, lava rumble), which covers AV-001 without ten separate tracks. If you later want per-theme music, the M02/M03 prompts can be re-run with a theme line added.

### M01 · Crown of the Maze

**Use:** title loop and dashboard menus. **Save as:** `M01_Crown of the Maze.mp3`

> Create an instrumental title theme for a colourful competitive arcade maze game where two players challenge a playful boss. Bright modern arcade electro-pop with an orchestral lift: punchy but not loud drums, plucky synth bass, sparkling marimba and glockenspiel, short brass stabs and a light chiptune lead. Introduce a catchy rising four-note "crown" motif early, develop it with a confident, cheeky and friendly mood, never dark. Include a calmer middle section that can loop under menus, and end on a chord that loops cleanly back to the beginning. Around 118 BPM, major key, 2–3 minutes of editable material.

### M02 · Guo's Arena (Boss Phase)

**Use:** Boss Phase, under telegraph warnings and bombs. **Save as:** `M02_Guos Arena.mp3`

> Create an instrumental boss battle loop for a colourful top-down arcade maze game: two players race through a maze while a theatrical, mischievous boss throws telegraphed attacks from the centre. Driving electro-pop drums, a pulsing synth bass ostinato, tense staccato strings, marimba runs, bold brass hits on the downbeats and a playful version of a rising four-note "crown" motif in the lead. Tension and fun together, exciting but not aggressive or scary. Keep a steady energy suitable for a long seamless loop, with no big build-up or stop. 132 BPM, A minor, 2 minutes or more of loopable material.

### M03 · Race to the Gate (Escape Phase)

**Use:** Escape Phase, after the boss falls; crossfaded from M02. **Save as:** `M03_Race to the Gate.mp3`

> Create an instrumental chase loop for the final race of a colourful arcade maze duel: the boss is defeated and both players sprint to grab their gem and escape through the rival's gate. Same instrumentation family as an electro-pop boss battle theme: faster-feeling double-time hi-hats and snare rolls, bouncy synth bass, urgent rising string ostinato, bright brass stabs and a triumphant, speedier variation of a rising four-note "crown" motif. Urgent, thrilling and bright, never dark. Steady energy for a seamless loop, no slowdown or ending inside the loop. 132 BPM, A minor, 2 minutes or more of loopable material.

### M04 · Results Fanfare (optional)

**Save as:** `M04_Results Fanfare.mp3`. Until it exists I use GPD2's `music-victory` and `music-defeat`.

> Create a short instrumental results cue for a colourful arcade maze game. Start with a bright 6-second victory fanfare built on a rising four-note "crown" motif with brass, marimba and punchy drums, then settle into a relaxed, warm groove with soft synth pads and light percussion that can loop under a results screen, ending on a gentle resolved chord. Also include, after a short pause, a separate 5-second playful "close match" sting in a lighter mood. Around 118 BPM, major key, 60–90 seconds.

### M05 · Quiet Gallery (optional)

**Save as:** `M05_Quiet Gallery.mp3`. Until it exists I use GPD2's `music-lobby`.

> Create a calm instrumental background loop for a game museum and shop screen: soft electric piano, warm pads, gentle marimba, light brushed percussion and a slow, relaxed version of a rising four-note "crown" motif. Cosy, curious and friendly, quiet dynamics, suitable for a long loop without fatigue. Around 90 BPM, major key, 2 minutes or more of loopable material.

---

## 6. Priority and order

1. **IV-02 Explorer** → approve the style.
2. **IV-03, IV-04, IV-05** with IV-02 attached.
3. **IV-01 Title** with IV-02/IV-03 attached.
4. **FLOW-IV-TITLE-LOOP** from IV-01.
5. **M02 + M03** (needed for the in-match feel test), then **M01**.
6. Optional: M04, M05, then the tile sheets IV-06 … IV-10.
