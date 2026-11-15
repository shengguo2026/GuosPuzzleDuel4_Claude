# Guo's Puzzle Duel IV: art, video and music prompts

This file holds everything that needs to be generated outside the code: **Codex** images, one **Google Flow** title loop clip, and **Google Flow Music** cues. Everything else is reused or drawn in code (section 2).

Goal: **as few new assets as possible.**

| Kind | Required | Optional polish |
|---|---|---|
| Codex images | **37** (1 title key art, 4 character portraits, 32 boss tier poses) | 5 theme tile sheets |
| Flow video | **1** (title loop, 8 s) | — |
| Flow Music cues | **14** (Title/Menu, Lobby, Store & Museum, Results, and a Boss + Escape cue for each of the 5 themes) | — |

Until a file arrives the game uses a placeholder (code-drawn shape or a reused GPD2 track), so nothing here blocks implementation. It only blocks the final look-and-feel tests.

## 0. Workflow

1. Generate in the order of section 3 (characters first, because the title art uses them as references).
2. Save the files into the **Pictures** repo under `GuosPuzzleDuel4/` with the **Save as** name (a second candidate gets `_v2`).
3. Tell me the file names. I pull them into this repo through the asset pipeline (webp/ogg/m4a, hashed names), crop, cut tokens and wire them up.

Folder layout in the Pictures repo:

```
GuosPuzzleDuel4/
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
| Bombs, shields, blasts, Super Shield walls, traps, teleporters, boost/ice/conveyor tiles, orbs and hearts, timed gates, fog, entrances, HUD icons | Drawn in code (vector + particles) | Needed for crisp scaling, colour-blind patterns and the graphics-quality setting |
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
| First Strike: hit the boss with a bomb | `firstStrike` |
| First Crack: destroy a breakable wall | `firstCrack` |
| Wall Breaker: destroy 100 walls | `wallBreaker` |
| Demolition Day: Super Bomb breaks a Super Shield | `demolitionDay` |
| Chain Reaction: one Super Bomb breaks 3 walls | `chainReaction` |
| Blockade: a Super Shield holds for the full 15 s | `superShield` |
| Iron Wall: shields block 25 boss attacks | `ironWall` |
| Deep Strike: land the final boss hit 10 times | `deepStrike` |
| Master Slayer: defeat the Ultimate boss | `masterSlayer` |
| Hard Won: win on Extreme | `hardWon` |
| Breakthrough: escape within 30 s of the boss falling | `breakthrough` |
| Invader: win by escape 25 times | `invader` |
| Overrun: win 10 matches without using a Shield | `overrun` |
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
| Trap Buster: destroy 25 traps with Shields | `combat/sapper` (GPD2 pack art) |
| Portal Hopper: 50 teleports | `chaosArena/splitDecision` (GPD2 pack art) |
| Ice Dancer: win a match that has ice | `chaosArena/singingInTheRain` (GPD2 pack art) |
| Heart Collector: pick up 10 Hearts | `combat/perfectPairing` (GPD2 pack art) |

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

**IV-02 · Explorer** · Save as `GuosPuzzleDuel4/characters/char-explorer.png`

```text
A cheerful young adventurer mascot character for a colourful arcade maze game: khaki explorer jacket with many pockets, olive-green scarf, sturdy brown boots, a leather satchel across the body, a rolled paper map in the right hand, a small brass compass on a cord, short tousled brown hair under a wide-brim sand-coloured explorer hat. Full body, standing, three-quarter view facing the viewer, centred, big readable head about one third of body height, friendly confident closed-mouth smile, looking at the viewer. Transparent background, no ground shadow.
[paste the shared style block]
```

**IV-03 · Robot** · Save as `GuosPuzzleDuel4/characters/char-robot.png`

```text
A friendly small robot mascot character for a colourful arcade maze game: rounded pearl-white and silver body with soft panel lines, a large rounded screen face showing two glowing mint-green eyes and a small curved smile line, one short antenna with a glowing yellow tip, stubby arms with three-fingered hands, the right hand giving a small wave, two short legs with rubber-grey feet, small mint-green light strips on the chest. Full body, standing, three-quarter view facing the viewer, centred, big readable head about one third of body height, same scale and framing as the attached Explorer. Transparent background, no ground shadow.
[paste the shared style block]
```

**IV-04 · Fox Adventurer** · Save as `GuosPuzzleDuel4/characters/char-fox.png`

```text
A clever anthropomorphic fox adventurer mascot character for a colourful arcade maze game: warm amber-orange fur with cream chest and muzzle, big pointed ears, a fluffy tail with a white tip curling beside the legs, a teal travel vest with brass buttons, a brown leather belt with small pouches, short brown boots, aviator goggles pushed up on the forehead, the left hand on the hip, the right hand holding a small glowing lantern. Full body, standing, three-quarter view facing the viewer, centred, big readable head about one third of body height, playful confident closed-mouth smile, same scale and framing as the attached Explorer. Transparent background, no ground shadow.
[paste the shared style block]
```

**IV-05 · Mystic Slime** · Save as `GuosPuzzleDuel4/characters/char-slime.png`

```text
A cute magical slime mascot character for a colourful arcade maze game: a round, glossy, semi-translucent mint-green and lime jelly body shaped like a soft droplet, with tiny floating sparkles and a few small bubbles inside, two large shiny dark eyes with white highlights, rosy cheeks, a small happy closed-mouth smile, a tiny violet wizard hat with a golden star tilted on top, two little stubby jelly arms, the right one raised in a cheerful wave. Standing on its own base, three-quarter view facing the viewer, centred, the whole body about the same height as the attached Explorer's head-to-knee, same framing and scale. Transparent background, no ground shadow.
[paste the shared style block]
```

### IV-01 · Title key art (required)

Used as the title screen background, the Flow title loop **start and end frame**, the Windows package image and the Museum entrance.

- **Size:** 1536×1024; I crop to 16:9 (1536×864), so keep everything important in the middle 85% of the height.
- **Save as:** `GuosPuzzleDuel4/title/guos-puzzle-duel-iv-title.png`
- **References to attach:** style reference (§1), `guo-boss-01-idle.png` (Guo's face, crown and outfit), `char-explorer.png` (IV-02), `char-robot.png` (IV-03).
- **Leave free:** the upper fifth (title text goes there in code) and the lower sixth (menu hint), both calm sky/floor with no small detail.
- **What I check:** Guo's face matches the boss art, both heroes match their portraits, no text anywhere, the maze reads as a maze.

```text
Title key art for a colourful top-down arcade maze duel game. A large glowing tile maze seen from a high three-quarter angle, its walls made of bright rounded blocks in garden green, sandstone, crystal violet, neon cyan and volcanic orange sections, small torches and crystals sparkling along the walls. In the centre of the maze, a round open arena where the boss stands: the man from the attached boss reference, same face, glasses, short black hair, golden whistle crown and purple-and-gold tracksuit, shown from the waist up, arms crossed, confident smile, a glowing multicoloured orb of light floating beside his right shoulder. At the near bottom edge of the maze a small open gate with the attached Explorer character standing in it, surrounded by a soft blue glow; at the far top edge another open gate with the attached Robot character, surrounded by a soft red glow; both heroes face the boss. Deep evening-blue sky with soft light beams and floating sparkles. The upper fifth of the image is calm empty sky and the lower sixth is calm maze floor, both without small details. Wide 16:9 composition centred on the boss.
[paste the shared style block]
```

### IV-11 to IV-42 · Boss tier sets (decided: 4 new sets × 8 poses = 32 images)

One costume per difficulty tier. **Hard reuses the Puzzle Duel III set unchanged.** Each new pose is a Codex **edit** of the matching Duel III pose, so the face and pose stay identical and only the costume, crown and aura change.

- **Size:** 1024×1024, transparent background (same as the source).
- **Attach:** the source pose from `Pictures/GuosPuzzleDuelIII/boss/` (the image to edit) and, from the second pose of a tier on, the approved idle of that tier as the costume reference.
- **Poses per tier (8):** `01-idle`, `02-charging`, `03-attack`, `04-freeze-cast`, `05-hit`, `06-recovering`, `07-defeated`, `08-victory` (same numbers and names as the source files).
- **Save as:** `GuosPuzzleDuel4/boss/<tier>/guo-boss-<tier>-<NN>-<pose>.png`, for example `boss/easy/guo-boss-easy-01-idle.png`.
- **What I check:** face, glasses and hair identical to the source, pose identical, no blue or red aura (those mean P1/P2), clean transparent edges, no text.

Edit prompt (one per pose; change only `<COSTUME>`):

```text
Edit the attached image. Keep the man's face, glasses, hair, expression, pose, hand positions, body size and framing exactly the same, and keep the transparent background. Change only his outfit, headwear and magic effects to: <COSTUME>. The glowing orb or magic effect stays in the same place and size as in the original, only its colours change.
[paste the shared style block]
```

| Tier | `<COSTUME>` | Folder |
|---|---|---|
| Easy · Coach Guo | a mint-green and white sports tracksuit with a silver whistle on a cord, a simple mint baseball cap instead of the crown, and a small calm mint-and-white orb with soft sparkles | `boss/easy/` |
| Medium · Referee Guo | a black-and-white striped referee shirt with a black collar, a small golden whistle crown, and a yellow-and-white orb with bright card-shaped sparkles | `boss/medium/` |
| Hard · Champion Guo | *(reuse the Duel III set, no generation)* | `GuosPuzzleDuelIII/boss/` |
| Extreme · Storm Guo | a dark charcoal armoured tracksuit with silver plates on the shoulders and forearms, a jagged silver crown, and a crackling violet-and-white lightning orb with small lightning arcs | `boss/extreme/` |
| Ultimate · Emperor Guo | a flowing black-and-gold emperor robe with a high collar and gold embroidery, a large ornate golden crown with white gems, and three small white-gold flame orbs circling the main orb | `boss/ultimate/` |

Order: make each tier's idle first, approve it, then the other seven poses with it attached.

The Easy tier never casts Freeze Field in the game (D-14), but its `04-freeze-cast` is still made for the Museum Boss Hall so every tier has a complete set.

### IV-06 to IV-10 · Theme tile sheets (optional polish)

The game ships procedural tiles that already look clean; these sheets only add texture. Make them last, and only if time allows. One image per theme, 1024×1024, a **2×2 grid of four square tiles seen straight from above** (orthographic, no perspective), each tile filling its quarter with a 2 px gap:

top-left **floor**, top-right **solid wall** (top face), bottom-left **breakable wall** (visible cracks), bottom-right **reinforced wall** (metal bands or crystal plates).

Save as `GuosPuzzleDuel4/tiles/tiles-<theme>.png`. I make the floors seamless in the pipeline.

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

- **Start frame:** `GuosPuzzleDuel4/title/guos-puzzle-duel-iv-title.png` (IV-01, cropped 16:9).
- **End frame (if Flow offers it):** the same picture, so the loop has no jump.
- **Length:** 8 s.
- **Save as:** `GuosPuzzleDuel4/video/FLOW-IV-TITLE-LOOP.mp4`
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

## 5. Google Flow Music cues (D-36 A: 14 cues)

GDD v2.0 AV-01 (LOCKED): music varies by the five themes and by Boss/Escape phase, with separate menu, lobby, store/museum and result music. That means **10 in-match cues** (one Boss + one Escape per theme) and **4 other cues**.

### How to make a cue

1. Open Google Flow Music, paste the cue's prompt, then append the **shared exclusions** below.
2. Generate several candidates; keep the best one or two.
3. Save into `GuosPuzzleDuel4/music/` with the **Save as** name (`_v2` for a second candidate).
4. Tell me the file names. I cut the loops, set up the Boss → Escape stinger bridge (decided 15 Nov; pairs need not match), and make OGG/M4A.

Until a cue arrives, the game plays a Duel II track in its place (menu, lobby, duel layers, victory, defeat).

### Shared musical language

- One family: bright, colourful **modern arcade** music with an orchestral lift, never dark or horror.
- One **four-note "crown" motif** (rising, playful) appears in every cue, so all 14 sound like one soundtrack.
- **Each theme's Boss and Escape cue share the same tempo and key** (table below), so the switch when the boss falls is seamless.
- Leave space for announcer calls, warning sounds and impacts; no wall-of-sound mastering.

### Shared exclusions (append to every request)

> Instrumental only, no lyrics, no vocals, no choir words, no recognizable copyrighted melody, no imitation of a named artist, composer, film, anime or game soundtrack, no harsh mastering, no clipped transients, no abrupt ending, no explosions, alarms or sound effects embedded in the music, no long exposed solo that prevents looping. Leave frequency space for announcer voice, warning cues and impact sounds.

### Overview

| # | Cue | Use | Tempo / key | Save as |
|---|---|---|---|---|
| M01 | Crown of the Maze | Title loop, dashboard menus | 118 BPM, major | `M01_Crown of the Maze.mp3` |
| M02 | Waiting for the Duel | Lobby, ready-up, countdown | 104 BPM, major | `M02_Waiting for the Duel.mp3` |
| M03 | Quiet Gallery | Store, Museum, Profiles, Statistics | 90 BPM, major | `M03_Quiet Gallery.mp3` |
| M04 | Results Fanfare | Results (win, draw and loss endings cut from one cue) | 118 BPM, major | `M04_Results Fanfare.mp3` |
| B-GAR | Enchanted Garden: Boss | Boss Phase in Enchanted Garden | 124 BPM, D minor | `B-GAR_Enchanted Garden Boss.mp3` |
| E-GAR | Enchanted Garden: Escape | Escape Phase in Enchanted Garden | 124 BPM, D minor | `E-GAR_Enchanted Garden Escape.mp3` |
| B-DES | Desert Ruins: Boss | Boss Phase in Desert Ruins | 128 BPM, E minor | `B-DES_Desert Ruins Boss.mp3` |
| E-DES | Desert Ruins: Escape | Escape Phase in Desert Ruins | 128 BPM, E minor | `E-DES_Desert Ruins Escape.mp3` |
| B-CRY | Crystal Caverns: Boss | Boss Phase in Crystal Caverns | 120 BPM, F sharp minor | `B-CRY_Crystal Caverns Boss.mp3` |
| E-CRY | Crystal Caverns: Escape | Escape Phase in Crystal Caverns | 120 BPM, F sharp minor | `E-CRY_Crystal Caverns Escape.mp3` |
| B-NEO | Neon Circuit: Boss | Boss Phase in Neon Circuit | 136 BPM, A minor | `B-NEO_Neon Circuit Boss.mp3` |
| E-NEO | Neon Circuit: Escape | Escape Phase in Neon Circuit | 136 BPM, A minor | `E-NEO_Neon Circuit Escape.mp3` |
| B-VOL | Volcanic Citadel: Boss | Boss Phase in Volcanic Citadel | 140 BPM, C minor | `B-VOL_Volcanic Citadel Boss.mp3` |
| E-VOL | Volcanic Citadel: Escape | Escape Phase in Volcanic Citadel | 140 BPM, C minor | `E-VOL_Volcanic Citadel Escape.mp3` |

### M01 · Crown of the Maze

**Use:** title loop and dashboard menus. **Save as:** `M01_Crown of the Maze.mp3`

> Create an instrumental title theme for a colourful competitive arcade maze game where two players challenge a playful boss. Bright modern arcade electro-pop with an orchestral lift: punchy but not loud drums, plucky synth bass, sparkling marimba and glockenspiel, short brass stabs and a light chiptune lead. Introduce a catchy rising four-note "crown" motif early, develop it with a confident, cheeky and friendly mood, never dark. Include a calmer middle section that can loop under menus, and end on a chord that loops cleanly back to the beginning. Around 118 BPM, major key, 2–3 minutes of editable material.

### M02 · Waiting for the Duel

**Use:** pre-game lobby (players joining, choosing characters, Ready). **Save as:** `M02_Waiting for the Duel.mp3`

> Create an instrumental lobby loop for a colourful arcade maze duel game, playing while two players join, pick characters and get ready. Light, bouncy groove with soft punchy drums, a friendly synth bass, plucked guitar or marimba chords, gentle glockenspiel sparkles and a relaxed, teasing version of a rising four-note "crown" motif. Anticipation without stress, friendly and social. Steady energy for a long seamless loop, no big build-ups or endings inside the loop. Around 104 BPM, major key, 2 minutes or more of loopable material.

### M03 · Quiet Gallery

**Use:** Store, Museum, Profiles, Statistics. **Save as:** `M03_Quiet Gallery.mp3`

> Create a calm instrumental background loop for a game museum and shop screen: soft electric piano, warm pads, gentle marimba, light brushed percussion and a slow, relaxed version of a rising four-note "crown" motif. Cosy, curious and friendly, quiet dynamics, suitable for a long loop without fatigue. Around 90 BPM, major key, 2 minutes or more of loopable material.

### M04 · Results Fanfare

**Use:** results screen; I cut a win, a draw and a loss ending from this cue. **Save as:** `M04_Results Fanfare.mp3`

> Create an instrumental results cue for a colourful arcade maze game, in three clearly separated parts with a short pause between them. Part one: a bright 6-second victory fanfare built on a rising four-note "crown" motif with brass, marimba and punchy drums, then a relaxed, warm groove with soft synth pads and light percussion that can loop under a results screen. Part two: a 5-second playful "close match" sting, light and good-humoured. Part three: a 5-second gentle "better luck next time" sting, soft and encouraging, never sad. Around 118 BPM, major key, 60–90 seconds in total.

### Theme cues: Boss and Escape (10 cues)

Each theme has one **Boss** cue (Boss Phase: tension and fun while the boss attacks from the centre) and one **Escape** cue (Escape Phase: an urgent sprint to the exit). Since 15 Nov the switch uses a stinger bridge, so the two cues of a theme no longer need the same tempo and key; the tempo/key in each prompt is a style guide only.

#### Enchanted Garden

**B-GAR · Enchanted Garden: Boss** · Save as `B-GAR_Enchanted Garden Boss.mp3`

> Create an instrumental boss battle loop for a colourful top-down arcade maze game set in a magical overgrown hedge maze full of flowers, glowing mushrooms and fireflies. Two players move through the maze while a theatrical, mischievous boss throws telegraphed attacks from the centre. Instruments: airy wooden flutes, pizzicato strings, harp glissandos, warm marimba, light hand percussion and bright synth plucks. Mood: playful and mischievous, like a garden full of tricks; tension and fun together, exciting but not aggressive or scary. Feature a playful version of a rising four-note "crown" motif in the lead, with birdsong-like flute trills and rustling-leaf shakers. Keep a steady driving energy for a long seamless loop, with no big build-up, stop or ending inside the loop. 124 BPM, D minor, 2 minutes or more of loopable material.

**E-GAR · Enchanted Garden: Escape** · Save as `E-GAR_Enchanted Garden Escape.mp3`

> Create an instrumental chase loop for the final race of a colourful arcade maze duel set in a magical overgrown hedge maze full of flowers, glowing mushrooms and fireflies: the boss has just been defeated and both players sprint to grab their token and escape through the exit. Same instruments as the boss battle of this place: airy wooden flutes, pizzicato strings, harp glissandos, warm marimba, light hand percussion and bright synth plucks, now with double-time hi-hats or fast hand percussion, snare rolls and an urgent rising string ostinato. Mood: playful and mischievous, like a garden full of tricks, now urgent, thrilling and triumphant. Feature a faster, triumphant variation of a rising four-note "crown" motif, with birdsong-like flute trills and rustling-leaf shakers. Steady energy for a seamless loop, no slowdown or ending inside the loop. 124 BPM, D minor, 2 minutes or more of loopable material.

#### Desert Ruins

**B-DES · Desert Ruins: Boss** · Save as `B-DES_Desert Ruins Boss.mp3`

> Create an instrumental boss battle loop for a colourful top-down arcade maze game set in sun-baked sandstone ruins with hidden passages and ancient carvings. Two players move through the maze while a theatrical, mischievous boss throws telegraphed attacks from the centre. Instruments: darbuka and frame drums, hand claps, a plucked lute, a breathy reed melody, low strings and a warm synth bass. Mood: adventurous and sun-drenched, with a hint of ancient mystery; tension and fun together, exciting but not aggressive or scary. Feature a playful version of a rising four-note "crown" motif in the lead, with sliding reed bends and dry shaker sand textures. Keep a steady driving energy for a long seamless loop, with no big build-up, stop or ending inside the loop. 128 BPM, E minor, 2 minutes or more of loopable material.

**E-DES · Desert Ruins: Escape** · Save as `E-DES_Desert Ruins Escape.mp3`

> Create an instrumental chase loop for the final race of a colourful arcade maze duel set in sun-baked sandstone ruins with hidden passages and ancient carvings: the boss has just been defeated and both players sprint to grab their token and escape through the exit. Same instruments as the boss battle of this place: darbuka and frame drums, hand claps, a plucked lute, a breathy reed melody, low strings and a warm synth bass, now with double-time hi-hats or fast hand percussion, snare rolls and an urgent rising string ostinato. Mood: adventurous and sun-drenched, with a hint of ancient mystery, now urgent, thrilling and triumphant. Feature a faster, triumphant variation of a rising four-note "crown" motif, with sliding reed bends and dry shaker sand textures. Steady energy for a seamless loop, no slowdown or ending inside the loop. 128 BPM, E minor, 2 minutes or more of loopable material.

#### Crystal Caverns

**B-CRY · Crystal Caverns: Boss** · Save as `B-CRY_Crystal Caverns Boss.mp3`

> Create an instrumental boss battle loop for a colourful top-down arcade maze game set in deep glittering caves of glowing violet and cyan crystals. Two players move through the maze while a theatrical, mischievous boss throws telegraphed attacks from the centre. Instruments: glass bells, celesta, sparkling glassy synth arpeggios, a deep round sub bass, echoing toms and soft bowed strings. Mood: shimmering and wondrous, with a cool echoing depth; tension and fun together, exciting but not aggressive or scary. Feature a playful version of a rising four-note "crown" motif in the lead, with bell echoes and glassy sparkle runs. Keep a steady driving energy for a long seamless loop, with no big build-up, stop or ending inside the loop. 120 BPM, F sharp minor, 2 minutes or more of loopable material.

**E-CRY · Crystal Caverns: Escape** · Save as `E-CRY_Crystal Caverns Escape.mp3`

> Create an instrumental chase loop for the final race of a colourful arcade maze duel set in deep glittering caves of glowing violet and cyan crystals: the boss has just been defeated and both players sprint to grab their token and escape through the exit. Same instruments as the boss battle of this place: glass bells, celesta, sparkling glassy synth arpeggios, a deep round sub bass, echoing toms and soft bowed strings, now with double-time hi-hats or fast hand percussion, snare rolls and an urgent rising string ostinato. Mood: shimmering and wondrous, with a cool echoing depth, now urgent, thrilling and triumphant. Feature a faster, triumphant variation of a rising four-note "crown" motif, with bell echoes and glassy sparkle runs. Steady energy for a seamless loop, no slowdown or ending inside the loop. 120 BPM, F sharp minor, 2 minutes or more of loopable material.

#### Neon Circuit

**B-NEO · Neon Circuit: Boss** · Save as `B-NEO_Neon Circuit Boss.mp3`

> Create an instrumental boss battle loop for a colourful top-down arcade maze game set in a glowing futuristic circuit-board city at night. Two players move through the maze while a theatrical, mischievous boss throws telegraphed attacks from the centre. Instruments: pulsing synth arpeggiators, gated synth chords, punchy electronic drums, a bouncy synth bass and a bright chiptune lead. Mood: energetic and electric, retro-futuristic arcade; tension and fun together, exciting but not aggressive or scary. Feature a playful version of a rising four-note "crown" motif in the lead, with bit-crushed chiptune fills and laser-like synth sweeps. Keep a steady driving energy for a long seamless loop, with no big build-up, stop or ending inside the loop. 136 BPM, A minor, 2 minutes or more of loopable material.

**E-NEO · Neon Circuit: Escape** · Save as `E-NEO_Neon Circuit Escape.mp3`

> Create an instrumental chase loop for the final race of a colourful arcade maze duel set in a glowing futuristic circuit-board city at night: the boss has just been defeated and both players sprint to grab their token and escape through the exit. Same instruments as the boss battle of this place: pulsing synth arpeggiators, gated synth chords, punchy electronic drums, a bouncy synth bass and a bright chiptune lead, now with double-time hi-hats or fast hand percussion, snare rolls and an urgent rising string ostinato. Mood: energetic and electric, retro-futuristic arcade, now urgent, thrilling and triumphant. Feature a faster, triumphant variation of a rising four-note "crown" motif, with bit-crushed chiptune fills and laser-like synth sweeps. Steady energy for a seamless loop, no slowdown or ending inside the loop. 136 BPM, A minor, 2 minutes or more of loopable material.

#### Volcanic Citadel

**B-VOL · Volcanic Citadel: Boss** · Save as `B-VOL_Volcanic Citadel Boss.mp3`

> Create an instrumental boss battle loop for a colourful top-down arcade maze game set in a fortress of black basalt over glowing rivers of lava. Two players move through the maze while a theatrical, mischievous boss throws telegraphed attacks from the centre. Instruments: big taiko-style drums, low brass, a gritty but clean synth bass, staccato low strings and wordless low pads. Mood: powerful and fiery but still fun, never horror or metal; tension and fun together, exciting but not aggressive or scary. Feature a playful version of a rising four-note "crown" motif in the lead, with rumbling drum rolls and bold brass swells. Keep a steady driving energy for a long seamless loop, with no big build-up, stop or ending inside the loop. 140 BPM, C minor, 2 minutes or more of loopable material.

**E-VOL · Volcanic Citadel: Escape** · Save as `E-VOL_Volcanic Citadel Escape.mp3`

> Create an instrumental chase loop for the final race of a colourful arcade maze duel set in a fortress of black basalt over glowing rivers of lava: the boss has just been defeated and both players sprint to grab their token and escape through the exit. Same instruments as the boss battle of this place: big taiko-style drums, low brass, a gritty but clean synth bass, staccato low strings and wordless low pads, now with double-time hi-hats or fast hand percussion, snare rolls and an urgent rising string ostinato. Mood: powerful and fiery but still fun, never horror or metal, now urgent, thrilling and triumphant. Feature a faster, triumphant variation of a rising four-note "crown" motif, with rumbling drum rolls and bold brass swells. Steady energy for a seamless loop, no slowdown or ending inside the loop. 140 BPM, C minor, 2 minutes or more of loopable material.

---

## 6. Priority and order

1. **IV-02 Explorer** → approve the style.
2. **IV-03, IV-04, IV-05** with IV-02 attached.
3. **IV-01 Title** with IV-02/IV-03 attached.
4. **FLOW-IV-TITLE-LOOP** from IV-01.
5. **B-GAR + E-GAR** (Garden is Campaign chapter 1 and the first in-match feel test), then **M01**, then the other four theme pairs, then M02, M03, M04.
6. Boss tier sets IV-11 … IV-42, Easy and Ultimate first.
7. Optional: the tile sheets IV-06 … IV-10.
