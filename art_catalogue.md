# Guo's Puzzle Duel IV: asset catalogue

Status of generated art, video and music, reviewed against `art_prompt.md`.
Source folder: `C:\AI\Claude\Assets\GuosPuzzleDuel4`. Last updated 2026-11-15.

Status key: **Approved** = use as is · **Approved, fix in edit** = usable, I fix it when I convert · **Needs regeneration** · **Rejected** · **Pending** = not delivered yet.

## Summary

| ID | File | Status | Use |
|---|---|---|---|
| IV-01 | `guos-puzzle-duel-iv-title_v2.png` | **Approved** | Title background, Flow start/end frame, package image, Museum entrance |
| IV-01 | `guos-puzzle-duel-iv-title.png` (v1) | Rejected | Superseded by v2 |
| FLOW-IV-TITLE-LOOP | `FLOW-IV-TITLE-LOOP.mp4` | Pending | Title loop clip (prompt below) |
| M01 | `M01_Crown of the Maze.mp3` | Approved, fix in edit (mood to confirm by ear) | Title, dashboard menus |
| M02 | `M02_Waiting for the Duel.mp3` | **Approved** | Lobby, ready-up, countdown |
| M03 | `M03_Quiet Gallery.mp3` | **Approved** | Store, Museum, Profiles, Statistics |
| M04 | `M04_Results Fanfare.mp3` | Approved for **win** only | Results (win) |
| M04b | `M04b_Results Stings.mp3` | Pending | Results (draw, loss) |
| IV-02, IV-03 | `char-explorer.png`, `char-robot.png` | Pending | Must match the heroes in title v2 |

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

**v1: Rejected** (`guos-puzzle-duel-iv-title.png`)

- Bottom gate showed a small Guo in the tracksuit instead of the Explorer; top gate showed a cannon instead of the Robot.
- Maze reached the top edge (no title space) and the gate intruded on the bottom sixth.
- Guo himself was good; kept only as a reference.

---

## Video

### FLOW-IV-TITLE-LOOP · Pending

Start frame (and end frame, if offered): title v2. 8 s, 16:9. Flow works best with a short prompt, the start frame and no sound; any audio is stripped in the edit.

```text
Locked camera, no movement. The man in the centre keeps his arms crossed, breathes slowly and blinks once; the sports balls beside his shoulder slowly rotate in their glow. The explorer and the robot stay still in their gates; the robot's eyes softly pulse. Torches flicker, crystals twinkle, sparkles drift upward. The maze stays exactly the same. Nobody walks or changes pose. Mouths closed. No text. No sound, no music.
```

Fallback if it drifts: "Locked camera. Torches flicker, crystals twinkle, sparkles drift upward, the man blinks once." Last resort: animate the still in code (no credit cost).

What I check: Guo's face identical, balls stay at his shoulder, both heroes stay in their gates, walls don't warp, no text. A usable 0–5 s range is enough.

---

## Music

All four delivered cues are 48 kHz stereo MP3 at 128 kb/s. All have a true peak around −0.5 to −0.8 dBFS: **trim to −1 dBTP during OGG/M4A conversion** (applies to every cue).

| Cue | Length | Tempo (target) | Key (target) | Loudness | LRA | True peak |
|---|---|---|---|---|---|---|
| M01 | 2:42 | 117.5 (118) | G minor / E♭ major (major) | −17.0 LUFS | 11.1 LU | −0.6 dBFS |
| M02 | 2:57 | 103.4 (104) | C major (major) | −15.9 LUFS | 8.8 LU | −0.8 dBFS |
| M03 | 2:40 | 89 (90) | D major (major) | −17.2 LUFS | 10.4 LU | −0.5 dBFS |
| M04 | 1:42 | 117.5 (118) | A♭ major (major) | −15.5 LUFS | 5.2 LU | −0.5 dBFS |

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

### Theme cues (B-/E- for five themes) · Pending

Each Boss/Escape pair must share tempo and key (see `art_prompt.md` §5) for the crossfade when the boss falls.

---

## Lessons for the next prompts

- Flow follows short prompts with a start frame better than long ones; ask for no sound on video.
- Flow Music tends to ignore multi-part structure; ask for one part per generation.
- Name the key explicitly ("bright major key") and ask for a resolving final chord.
- Images: if a character reference doesn't exist yet, describe it in words and say what it is NOT (e.g. "NOT the boss", "NOT a cannon").
- Images: specify empty margins as percentages ("top 22% empty sky") and "camera pulled far back".
