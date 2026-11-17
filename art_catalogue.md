# Guo's Puzzle Duel IV: asset catalogue

Status of generated art, video and music, reviewed against `art_prompt.md`.
Source folder: `C:\AI\Claude\Assets\GuosPuzzleDuel4`. Last updated 2026-11-15.

Status key: **Approved** = use as is · **Approved, fix in edit** = usable, I fix it when I convert · **Needs regeneration** · **Rejected** · **Pending** = not delivered yet.

## Summary

| ID | File | Status | Use |
|---|---|---|---|
| IV-01 | `guos-puzzle-duel-iv-title_v2.png` | **Approved** | Title background, Flow start/end frame, package image, Museum entrance |
| IV-01 | `guos-puzzle-duel-iv-title.png` (v1) | Rejected | Superseded by v2 |
| FLOW-IV-TITLE-LOOP | `TitleLoop.mp4` | **Approved, fix in edit** | Title loop clip (use 1.0–7.9 s, crossfade loop) |
| M01 | `M01_Crown of the Maze.mp3` | Approved, fix in edit (mood to confirm by ear) | Title, dashboard menus |
| M02 | `M02_Waiting for the Duel.mp3` | **Approved** | Lobby, ready-up, countdown |
| M03 | `M03_Quiet Gallery.mp3` | **Approved** | Store, Museum, Profiles, Statistics |
| M04 | `M04_Results Fanfare.mp3` | Approved for **win** only | Results (win) |
| M04b | `M04b_Draw Sting.mp3`, `M04b_Loss Sting.mp3` | **Approved, fix in edit** (confirm mood by ear) | Results (draw, loss) |
| M04b | `M04b_Results Stings.mp3`, `_v2` | Fallback only | Superseded by the separate stings |
| B-GAR | `B-GAR_Enchanted Garden Boss.mp3` | **Approved** | Boss Phase, Enchanted Garden |
| E-GAR | `E-GAR_Enchanted Garden Escape.mp3` | **Approved** | Escape Phase, Enchanted Garden |
| B-DES | `B-DES_Desert Ruins Boss.mp3` | **Approved** | Boss Phase, Desert Ruins |
| E-DES | `E-DES_Desert Ruins Escape.mp3` | **Approved** | Escape Phase, Desert Ruins |
| B-CRY | `B-CRY_Crystal Caverns Boss.mp3` | **Approved** | Boss Phase, Crystal Caverns |
| E-CRY | `E-CRY_Crystal Caverns Escape.mp3` | **Approved, fix in edit** (peak over 0 dBFS) | Escape Phase, Crystal Caverns |
| B-NEO | `B-NEO_Neon Circuit Boss.mp3` | **Approved** | Boss Phase, Neon Circuit |
| E-NEO | `E-NEO_Neon Circuit Escape.mp3` | **Approved, fix in edit** (cut breakdowns) | Escape Phase, Neon Circuit |
| B-VOL | `B-VOL_Volcanic Citadel Boss.mp3` | **Approved** | Boss Phase, Volcanic Citadel |
| E-VOL | `E-VOL_Volcanic Citadel Escape.mp3` | **Approved, fix in edit** (level and peak) | Escape Phase, Volcanic Citadel |
| IV-02 | `characters/char-explorer.png` | **Approved** | Explorer portrait and head token |
| IV-03 | `characters/char-robot.png` | **Approved** | Robot portrait and head token |
| IV-04 | `characters/char-fox.png` | **Approved** | Fox portrait and head token |
| IV-05 | `characters/char-slime.png` | **Approved** (re-framed to 1024×1536) | Slime portrait and head token |
| IV-11 | `boss/easy/guo-boss-easy-01-idle.png` | **Approved** (resized to 1024×1024) | Easy · Coach Guo, idle; costume reference for the other Easy poses |
| IV-12 | `boss/easy/guo-boss-easy-02-charging.png` | **Approved** (resized to 1024×1024) | Easy · Coach Guo, charging |
| IV-13 to IV-42 | other boss tier poses | Pending | Edit of the matching Duel III pose |

Not yet checked by analysis on any music cue: the four-note "crown" motif. Confirm it by ear.

---

## Images

### IV-01 · Title key art

**v2: Approved** (`guos-puzzle-duel-iv-title_v2.png`, 1672×941, already 16:9)

- Guo matches `guo-boss-01-idle.png`: face, glasses, whistle crown, purple-and-gold tracksuit, arms crossed, sports-ball orb.
- Explorer (bottom gate, blue glow, back view, hat, scarf, satchel, map) and Robot (top gate, red glow, pearl-white, mint eyes, yellow antenna tip) are correct.
- Top 22% empty sky (title text), bottom 17% plain floor (menu hint).
- All five theme colours, torches, crystals; no text.
- Minor, accepted: theme colours are mixed through the maze rather than in sections; the Robot faces the viewer rather than the boss.
- **Follow-up:** the heroes were drawn from text, so IV-02 and IV-03 must match them. Crop each hero from v2 and attach it as an extra reference when generating the portraits.

### IV-02 · Explorer portrait · Approved

`char-explorer.png`, 1024×1536 RGBA (asked 1024×1024; accepted, see framing note).

- Matches the Explorer in title v2: wide-brim sand hat with brown band and brass buckle, short brown hair, olive-green scarf, khaki multi-pocket jacket, brown satchel, rolled map in his right hand, brown lace-up boots.
- Full body, three-quarter view, friendly closed-mouth smile, eyes on the viewer; head about a third of body height.
- Clean transparent background (alpha 0 outside the figure), no ground shadow, no text. No large pure blue or red areas.
- Figure spans x 104–916, y 31–1500 (2%–98% of the height): tighter than the 8%/92% asked, but nothing is cut.
- Head reads clearly at 48 px (token test done).
- **Framing note for IV-03 to IV-05:** generate at the same 1024×1536 portrait size with the same head-top and feet positions, and attach this file, so all four line up. In the pipeline I pad to a square and cut the head token.

### IV-03 · Robot portrait · Approved

`char-robot.png`, 1024×1536 RGBA, same size as IV-02.

- Matches the Robot in title v2: pearl-white and silver body, dark screen face with mint-green eyes and smile, mint light strips on the chest and limbs, short antenna with a glowing yellow tip, three-fingered hands, right hand waving, grey feet.
- Small difference: the eyes are happy closed arcs rather than the round eyes in the title crop. It reads friendly and is accepted.
- Framing lines up with the Explorer: figure spans y 50–1488 (Explorer 31–1500), same line weight and shading. Big head, about a third of the height.
- Clean transparent background, no shadow, no text, no large pure blue or red areas.

### IV-04 · Fox Adventurer portrait · Approved

`char-fox.png`, 1024×1536 RGBA, same size as IV-02 and IV-03.

- Matches the brief: amber-orange fur with cream muzzle and chest, big pointed ears, aviator goggles on the forehead, teal vest with brass buttons, belt with pouches, brown boots, fluffy white-tipped tail, left hand on hip, right hand holding a glowing lantern, confident closed-mouth smile.
- Lines up with the Explorer and Robot: ear tips at y 16 and feet at y 1513 (Explorer 31–1500), same line weight and shading; the three read as one set.
- Orange is the dominant colour but is not pure red, so it stays distinct from the P2 red ring.
- Clean transparent background, no shadow, no text. The tail reaches x 972, which leaves enough margin.

### IV-05 · Mystic Slime portrait · Approved, re-framed

Delivered as `char-slime.png` at 1312×1199 (not the 1024×1536 of the other three). The repo copy is re-framed losslessly to match the set: faint alpha noise (values 1–3) across the empty canvas cleared, the figure cropped and placed unscaled on a transparent 1024×1536 canvas, centred, bottom at y 1497 (Explorer's boots end at 1500). The original stays in Guo's `pictures` folder.

- Matches the brief: glossy semi-translucent mint-and-lime droplet body with sparkles and bubbles inside, large shiny dark eyes, rosy cheeks, small closed-mouth smile, tilted violet wizard hat with a golden star, stubby arms with the right one waving.
- Height in the set: top of hat at y 465, about 67% of the frame, close to the Explorer's head-to-knee as specified. It's wider than the others (x 38–984) because of its round body, but fits inside the frame.
- Same line weight and glossy shading as the other three; the four read as one set.
- The face is large, so the head token reads easily at 48 px.

**Characters complete:** IV-02 to IV-05 are all approved.

### IV-11 · Easy · Coach Guo · idle · Approved, resized

Delivered at 1254×1254; the repo copy is resized to 1024×1024 to match the Duel III source, with faint alpha noise (values 1–3) cleared.

- Face, glasses, hair, smile, crossed arms and body size are identical to `guo-boss-01-idle.png` (compared side by side at the same scale).
- Costume as specified: mint-green and white tracksuit, silver whistle on a cord, mint baseball cap instead of the crown. The sports-ball cluster stays in place with a mint-and-white glow and sparkles.
- No blue or red aura, clean transparent edges, no text.
- **Use it as the costume reference** for Easy poses 02 to 08.

### IV-12 · Easy · Coach Guo · charging · Approved, resized

Delivered at 1254×1254 (attached in chat); repo copy resized to 1024×1024 with faint alpha noise cleared.

- Face, glasses, focused frown, hand positions (right hand cupped under the ball cluster, left hand above it) and body size match `guo-boss-02-charging.png`.
- Costume matches the approved Easy idle: mint-and-white tracksuit, silver whistle, mint cap. The ball cluster and swirl keep their place and size with a mint glow.
- No blue or red aura, clean edges, no text.

**v1: Rejected** (`guos-puzzle-duel-iv-title.png`)

- Bottom gate showed a small Guo in the tracksuit instead of the Explorer; top gate showed a cannon instead of the Robot.
- Maze reached the top edge (no title space) and the gate intruded on the bottom sixth.
- Guo himself was good; kept only as a reference.

---

## Video

### FLOW-IV-TITLE-LOOP · Approved, fix in edit

Delivered as `TitleLoop.mp4` (save in the repo as `FLOW-IV-TITLE-LOOP.mp4`): 1280×720, 24 fps, 7.9 s, H.264 with an AAC audio track.

- Frame 0 matches title v2. Guo's face, crown and pose stay identical; he blinks. Explorer and Robot stay in their gates; maze walls never change shape; no text.
- **Change from the still:** within the first 0.5 s the sports-ball cluster splits into two balls, a soccer ball left of his head and a basketball right. Stable from about 1.0 s to the end. Looks good; accepted.
- **Sparkles:** from about 2 s, sparkle fountains rise into the top sky where the title text sits. Busy but not blocking; the title gets a soft shadow/glow in code to stay readable.
- **Fix in edit:** use 1.0–7.9 s, crossfade the last ~0.5 s into the start for a seamless loop; strip the audio; poster image = a frame at 1.0 s (not v2, so there's no jump from the cluster to two balls when the video starts).
- Resolution is 720p versus the 1672×941 still; acceptable for a background behind UI.

Prompt used (short, start frame only, no sound):

```text
Locked camera, no movement. The man in the centre keeps his arms crossed, breathes slowly and blinks once; the sports balls beside his shoulder slowly rotate in their glow. The explorer and the robot stay still in their gates; the robot's eyes softly pulse. Torches flicker, crystals twinkle, sparkles drift upward. The maze stays exactly the same. Nobody walks or changes pose. Mouths closed. No text. No sound, no music.
```

---

## Music

All delivered cues are 48 kHz stereo MP3 at 128 kb/s. Most have a true peak around −0.5 to −0.8 dBFS (M04b goes over 0): **trim to −1 dBTP during OGG/M4A conversion** (applies to every cue).

| Cue | Length | Tempo (target) | Key (target) | Loudness | LRA | True peak |
|---|---|---|---|---|---|---|
| M01 | 2:42 | 120 (118) | G minor / E♭ major (major) | −17.0 LUFS | 11.1 LU | −0.6 dBFS |
| M02 | 2:57 | 104 (104) | C major (major) | −15.9 LUFS | 8.8 LU | −0.8 dBFS |
| M03 | 2:40 | 90 (90) | D major (major) | −17.2 LUFS | 10.4 LU | −0.5 dBFS |
| M04 | 1:42 | 120 (118) | A♭ major (major) | −15.5 LUFS | 5.2 LU | −0.5 dBFS |
| M04b | 1:02 | 114 (118) | D major (A♭ major) | −15.2 LUFS | 9.5 LU | **+0.6 dBFS** |
| M04b v2 | 1:01 | 120 (118) | G♯ minor (A♭ major) | −14.5 LUFS | 8.0 LU | −0.8 dBFS |
| M04b Draw | 1:05 | 120 (118) | F major (major) | −16.0 LUFS | 2.4 LU | −0.8 dBFS |
| M04b Loss | 1:02 | 82 (118) | A♭ major (major) | −14.2 LUFS | 2.3 LU | −0.2 dBFS |
| B-GAR | 2:57 | 120 (124) | G major (D minor) | −16.2 LUFS | 7.8 LU | −0.6 dBFS |
| E-GAR | 3:00 | 124 (124) | D, major/minor mix (D minor) | −14.5 LUFS | 9.2 LU | −0.2 dBFS |
| B-DES | 3:02 | 133 (128) | C, Arabic-style mixed scale (E minor) | −15.6 LUFS | 8.1 LU | −0.2 dBFS |
| E-DES | 2:55 | 144 (133 to match) | F♯/E♭ minor area (C to match) | −14.9 LUFS | 3.5 LU | −0.1 dBFS |
| B-CRY | 2:04 | 121 (120) | F♯ centre, B major scale, brighter than minor (F♯ minor) | −14.4 LUFS | 8.7 LU | −0.3 dBFS |
| E-CRY | 2:42 | 125 (120) | F♯ minor (F♯ minor) | −14.4 LUFS | 7.2 LU | **+0.3 dBFS** |
| B-NEO | 2:27 | 136 (136) | no clear key, chromatic around G/F♯ (A minor) | −14.4 LUFS | 8.5 LU | −0.7 dBFS |
| E-NEO | 2:54 | 136 (136) | D, major/minor mix (A minor) | −15.5 LUFS | 8.3 LU | −1.2 dBFS |
| B-VOL | 2:48 | 140 (140) | F minor (C minor) | −15.9 LUFS | 4.9 LU | −0.3 dBFS |
| E-VOL | 2:57 | 146 (140) | no clear key, chromatic around G/F♯ (C minor) | −13.5 LUFS | 3.6 LU | **+0.2 dBFS** |

Tempo is measured by autocorrelation over the whole track (±0.1 BPM); earlier readings of 117.5 were a coarse estimate.

### M01 · Crown of the Maze · Approved, fix in edit (confirm mood)

- Structure: quiet intro 0:00–0:15, full 0:15–0:45, calm dip 0:50–1:05 (menu-friendly), full 1:35–2:24, quiet outro.
- **Issue: key.** Reads as G minor (or E♭ major with a minor colour), not the bright major asked for. May sound moodier than "cheeky and friendly". Listen and decide.
- **Issue: ending.** Hard cut at 2:40 instead of a resolving chord, then 2.7 s of silence.
- **Fix in edit:** loop the 0:15–2:24 body on bar boundaries; trim the silence; −1 dBTP.
- **If regenerating:** add "bright major key, resolve on the tonic chord at the end" to the prompt.

### M02 · Waiting for the Duel · Approved

- Steady groove, major, proper ending (quiet outro from 2:46, short fade at 2:55).
- Gentle dip at 1:30–1:45 (about 9 dB); keep it in the loop for variety.
- **Fix in edit:** loop about 0:20–2:45; the intro can play once when the lobby opens; −1 dBTP.

### M03 · Quiet Gallery · Approved

- Clearly D major, smooth 6 s fade at the end. Cleanest match so far.
- Note: builds to two fuller sections (0:50–1:15, 1:50–2:20), so it's less flat than "quiet dynamics".
- **Fix in edit:** set in-game volume a few dB below M01; −1 dBTP.
- **Option if too busy:** loop only the softer stretches (about 0:15–0:45 plus 1:20–1:45).

### M04 · Results Fanfare · Approved for win only

- Flow ignored the three-part layout: one continuous track, no separate draw/loss stings, no pauses.
- Structure: soft intro 0:00–0:03, build 0:03–0:06, full energy to 0:39, soft break 0:39–0:47, groove to 1:31, outro fading by 1:40.
- **Win cut:** 0:00–0:06 fanfare, then loop the groove about 0:48–1:30.
- **Draw/loss:** missing. Stand-in for draw only if needed: the soft break 0:39–0:47.
- **Fix:** generate `M04b_Results Stings.mp3`:

```text
Two short instrumental stings for a colourful arcade game, about 5 seconds each, with 2 seconds of silence between them. First: a playful, good-humoured "close match" sting with marimba and light brass. Second: a gentle, encouraging "better luck next time" sting with soft piano and pads, warm, never sad. Around 118 BPM, A flat major. No vocals, no sound effects.
```

If Flow won't separate them, generate each sting on its own.

### M04b · Results Stings · Candidates cut, confirm by ear

- Again Flow ignored the layout: a 62 s continuous piece, not two 5 s stings with silence between. D major at 114 BPM instead of A♭ at 118 (acceptable: stings play on their own, not mixed with M04).
- Structure: bright opening 0:00–0:05.5, soft passage 0:05.5–0:13, groove 0:13–0:55, soft 0:55.5–0:58, final hit 0:58–0:59.4, silence.
- **Draw candidate:** 0:00–0:05.5 (bright, playful opening), with a 0.3 s fade out.
- **Loss candidate:** 0:05.5–0:13 (soft, about 10 dB quieter), with fades in and out. Alternative: 0:55.5–0:59.4 (soft lead-in plus final hit).
- **Issue:** true peak +0.6 dBFS (inter-sample overs); normalise to −1 dBTP in the edit.
- If the moods don't fit by ear, generate each sting on its own with a very short prompt.

**v2 (`M04b_Results Stings_v2.mp3`): not better for stings.** Again one continuous 61 s piece with no gaps. Tempo is close (120) and the peak is fine (−0.8 dBFS), but it reads as G♯ minor, which risks sounding sad (brief: "never sad"). Structure: lighter opening 0:00–0:14 with small dips at 0:02.5, 0:07 and 0:13, groove 0:14.5–0:48, long natural fade 0:48–0:58. Only usable piece: the fade 0:50–0:58 as a loss candidate, if it doesn't sound sad.

**Recommended next step:** generate each sting separately (one request each, 5–8 s), prompts:

```text
A 6-second playful "close match" music sting for a colourful arcade game: marimba and light brass, good-humoured, bright major key, ends on a clean final chord. Instrumental, no sound effects.
```

```text
A 6-second gentle "better luck next time" music sting for a colourful arcade game: soft piano and warm pads, encouraging and friendly, major key, never sad, ends on a soft final chord. Instrumental, no sound effects.
```

Save as `M04b_Draw Sting.mp3` and `M04b_Loss Sting.mp3`. Flow Music may still return a longer piece; then the opening seconds usually hold the sting.

**Separate stings: Approved, fix in edit.** Asked for 6 s each; Flow Music still returned about a minute each (it seems to have a minimum length), but both are now single-mood, major-key pieces with very even level (LRA ~2 LU).

- `M04b_Draw Sting.mp3`: F major, 120 BPM, −16 LUFS. 2 s fade-in, steady to 1:01.5, then a quick ending.
  - **Cut:** the last ~6 s (about 0:55.5–1:02), which includes the real ending. Backup: 0:01.5–0:08 with a 1 s fade.
- `M04b_Loss Sting.mp3`: A♭ major (same key as M04, a nice link), slow feel, −14.2 LUFS, true peak −0.2 dBFS.
  - **Cut:** the last ~6 s (about 0:54–1:00), including its natural 2 s decay. Backup: 0:00–0:06 with a 1 s fade.
  - **Fix:** it's the loudest cue so far for a "gentle" sting: play it about 3–4 dB below the draw sting; −1 dBTP.
- Mood ("playful" vs "encouraging, never sad") can't be measured; confirm by ear.

### B-GAR · Enchanted Garden Boss · Approved if the mood fits

- 2:57, **120 BPM in G major**, not the 124 BPM D minor asked for. Brighter and more playful than planned; "tension and fun" is now mostly fun.
- Structure: quiet intro 0:00–0:15, steady drive 0:16–2:18 with small dips (0:46–1:00, 1:18, 1:46), softer outro 2:20–2:48, fade by 2:54, then 2.3 s of silence.
- **Loop:** 0:16–2:18 on bar boundaries. −1 dBTP.
- **Pairing rule:** the Escape cue must share tempo and key for the crossfade. Cheapest fix: keep B-GAR and generate **E-GAR at 120 BPM, G major** (change the last line of the E-GAR prompt to "120 BPM, G major, 2 minutes or more of loopable material"). Alternative: regenerate B-GAR in D minor at 124.
- If the theme table changes, Crystal Caverns also runs at 120 BPM (F♯ minor), which is fine because the keys differ.

### E-GAR · Enchanted Garden Escape · Approved, fix in edit

- 3:00, **124 BPM centred on D** (mix of D major and D minor colour), matching the original brief; generated with the unchanged prompt, so it does **not** match B-GAR's 120 BPM G major.
- Structure: quiet intro 0:00–0:13, drive 0:14–1:16, dip 1:18–1:30, drive to 2:54, short ending, 2.3 s silence. Louder than B-GAR by about 1.7 LU, which suits the sprint.
- **Loop:** 0:14–2:54 (or skip the 1:18–1:30 dip if it drags). True peak −0.2 dBFS → −1 dBTP.

**Pairing:** superseded by the stinger-bridge decision (see E-DES); no stretching needed. Original plan, kept for reference:
- Time-stretch B-GAR from 120 to 124 BPM (+3.3%, pitch kept), so beats line up at the crossfade.
- Keys: G major → D centre is a move to the closely related dominant key, which sounds like a lift, fitting "the boss is down, now race". The 0.5–1.0 s crossfade sits under the boss-defeat sound, which masks the harmonic change.
- If it still sounds off in game, regenerate B-GAR at 124 BPM, D minor (original prompt) rather than E-GAR.

### B-DES · Desert Ruins Boss · Approved

- 3:02, **133 BPM** (very clear), key centre **C** with an Arabic-style scale (both E♭ and E, strong F and G), so neither plain major nor minor. Brief asked 128 BPM, E minor; the scale suits the desert theme well.
- Structure: intro 0:00–0:14, near-silent break around 0:16, drive 0:18–0:48, dip 0:48–0:53, full energy 0:54–2:58, short ending at 2:58.
- **Loop:** 0:18–2:58 (consider skipping the 0:48–0:53 dip). True peak −0.2 dBFS → −1 dBTP.
- **E-DES:** generate with the original E-DES prompt but ending in "133 BPM, C minor with an Arabic-style scale, 2 minutes or more of loopable material." Then I measure and pair.

### E-DES · Desert Ruins Escape · Approved

- 2:55, **144 BPM**, key centre around **F♯ / E♭ minor**, very even level (LRA 3.5 LU: ideal for a sprint loop). Short intro 0:00–0:13, then constant drive to 2:52. True peak −0.1 dBFS → −1 dBTP.
- Flow ignored "133 BPM, C minor". Against B-DES: 8% faster and a tritone away from C, the most distant key possible. A plain crossfade would clash; the tempo gap is too large to stretch cleanly and the key gap too large to pitch-shift.
- **Options:** (A) regenerate E-DES until it lands near 133 BPM / C; (B) keep it and change the Boss → Escape transition for all themes to a "stinger bridge": boss music fades out under a ~1 s boss-defeat stinger, Escape starts on its own downbeat. Then no theme pair needs matching tempo or key.
- **Decided 15 Nov by Guo: (B) stinger bridge.** E-DES approved as is.

### B-CRY · Crystal Caverns Boss · Approved

- 2:04, **121 BPM** (target 120), centred on F♯ with a B-major scale, so brighter than the F♯ minor asked for; fits "shimmering and wondrous". −14.4 LUFS.
- Structure: sparse intro 0:00–0:13 (quiet bell-like dips at 0:02–0:05), steady drive 0:14–1:59 building gently, quick ending at 2:00.
- Shortest boss cue: the loop body 0:14–1:59 is 1:45. Fine for a loop, but repeats more often than the others.
- **Fix in edit:** loop 0:14–1:59; true peak −0.3 dBFS → −1 dBTP.
- Prompt used: the B-CRY prompt from `art_prompt.md`, unchanged.

### E-CRY · Crystal Caverns Escape · Approved, fix in edit

- 2:42, **125 BPM in clear F♯ minor**: the first cue to land exactly on its requested key. A bit faster than the 120 asked, which suits the sprint.
- Starts at full drive from 0:00 (no quiet intro), good straight after the defeat stinger. Small dip at 0:48–0:53, then builds slightly to 2:34; quick ending at 2:36.
- **Fix in edit:** loop 0:00–2:34; true peak **+0.3 dBFS** (over full scale, can clip) → −1 dBTP.

### B-NEO · Neon Circuit Boss · Approved

- 2:27, **exactly 136 BPM** as asked. No clear key (weak key match, chromatic movement around G/F♯ in the bass) instead of A minor; reads as edgy electronic, which suits the neon theme.
- Structure: quiet intro 0:00–0:13, full drive 0:14–0:41, **breakdown 0:42–0:55** (about 9 dB quieter), full drive 0:56–2:19 with a short dip at 1:26, fade-out 2:20–2:26.
- The breakdown goes against "no stop inside the loop", but it's short. **Loop:** 0:14–2:19 including it, or 0:56–2:19 (1:23) if it feels like a stall in play. True peak −0.7 dBFS → −1 dBTP.

### E-NEO · Neon Circuit Escape · Approved, fix in edit

- 2:54, **exactly 136 BPM** (same as B-NEO), centred on D with a major/minor mix instead of A minor. True peak −1.2 dBFS: already safe, the only cue so far that needs no peak trim.
- Structure: quiet intro 0:00–0:13, drive 0:14–0:42, **breakdown 0:43–0:55**, drive 0:56–1:53, **second breakdown 1:54–2:05**, drive 2:06–2:49, fade.
- Two ~10 dB breakdowns are wrong for an urgent sprint ("no slowdown inside the loop").
- **Fix in edit:** splice the drive sections on bar lines (one bar = 1.765 s at 136 BPM): 0:14–0:42 + 0:56–1:53 + 2:06–2:49 → about 2:08 of continuous drive, looped.

### B-VOL · Volcanic Citadel Boss · Approved

- 2:48, **exactly 140 BPM** as asked, in a clear **F minor** (asked C minor; a closely related key, same dark-but-fun colour).
- Very even level (LRA 4.9 LU), ideal for a loop. The first 20 s alternate with short drum drop-outs (taiko-style hits and gaps), then a steady drive from 0:20 to 2:44 with only a brief dip at 1:58. Ends with a fairly hard stop at 2:45.
- **Fix in edit:** loop 0:20–2:44 on bar lines (one bar = 1.714 s at 140 BPM), drop the hard ending; true peak −0.3 dBFS → −1 dBTP.

### E-VOL · Volcanic Citadel Escape · Approved, fix in edit

- 2:57, **146 BPM** (asked 140; faster suits the final sprint), no clear key (chromatic, around G/F♯) instead of C minor.
- Most constant cue of the set (LRA 3.6 LU): drive from 0:12 to 2:51 with only small dips at 0:40 and 2:12. Short intro, fade by 2:54.
- **Loudest cue** at −13.5 LUFS and true peak **+0.2 dBFS** (over full scale).
- **Fix in edit:** loop 0:12–2:51; turn down about 2 dB to sit with the other Escape cues; −1 dBTP.

### Music status

All 14 cues are delivered and approved (M04 covers win; M04b Draw/Loss Sting cover draw and loss). Every cue still gets the −1 dBTP trim and loop cut in the edit.

Flow Music doesn't reliably hit the requested tempo or key, but since the stinger-bridge decision (15 Nov) Boss and Escape cues no longer need to match. Use the prompts in `art_prompt.md` as written.

Each Boss/Escape pair must share tempo and key (see `art_prompt.md` §5) for the crossfade when the boss falls.

---

## Decisions

- **15 Nov · Boss → Escape music: stinger bridge.** When the boss falls, the boss cue fades out (about 0.3–0.5 s) under a ~1 s boss-defeat stinger, and the Escape cue starts on its own downbeat. Replaces the 0.5–1.0 s crossfade; theme pairs need not share tempo or key. Plan docs updated.

## Proposed: boss attack balls drawn as sports balls

Boss patterns 1 (Orb Shot), 3 (Twin Orbs) and 8 (Ball Rain) throw "balls" (docs/PLAN.md D-14); they are drawn in code and their look was not specified. Proposal: draw them as sports balls (soccer, basketball, tennis, volleyball) to match Guo's orb and the title loop. Awaiting Guo's decision.

## Lessons for the next prompts

- Flow follows short prompts with a start frame better than long ones; ask for no sound on video. Flow may still add audio and reinterpret small details (the ball cluster became two balls).
- Flow Music tends to ignore multi-part structure; ask for one part per generation. It also returns about a minute even when asked for 6 s, so plan to cut stings from the ending.
- Name the key explicitly ("bright major key") and ask for a resolving final chord.
- Images: if a character reference doesn't exist yet, describe it in words and say what it is NOT (e.g. "NOT the boss", "NOT a cannon").
- Images: specify empty margins as percentages ("top 22% empty sky") and "camera pulled far back".
