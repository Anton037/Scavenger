# Five Nights at Torge's v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform *Five Nights at Torge's* with a completely rebuilt Stylized Mascot-Animatronic 3D art style, authentic FNaF 1 tension/AI/power/sound cues, and balanced high-skill FNaF fangame mechanics.

**Architecture:** Deterministic 60Hz simulation (`src/engine/`) cleanly separated from batched Three.js WebGL2 diorama rendering (`src/render/`), procedural WebAudio (`src/audio.js`), and responsive HUD/modals (`src/hud.js`, `src/style.css`).

**Tech Stack:** Vanilla ES Modules, Three.js `0.187.0`, Web Audio API, Vite `8.3.8`, Node `node:test`.

**Spec:** `docs/IMPROVEMENT_PROMPT.md`

## Global Constraints

- Zero external runtime asset bloat: all 3D geometry, PBR/canvas textures, UI mugshots, and sound cues remain procedurally generated and deterministic.
- Maintain `npm run check` (`npm test && npm run build`) with 0 failures and fast 60 FPS WebGL2 batching.
- Keep default gameplay free of automatic doorway text spoilers (`audioSubtitles: false` by default in `DEFAULT_SETTINGS`; opt-in via Settings).

## Review Focus

- Double-door AFK power drain exploit: verify `usage = 3` drains `100%` power well before `6:00 AM` even on Night 1.
- Chef Torge `4B` ambush edge case: verify Torge does NOT enter the office from `4B` while monitor is closed, ONLY when monitor is open on a camera `!== '4B'` and `rightDoor === false`.
- Closed-door window visibility: verify Anton remains visible outside the Left Office Window when `leftDoor === true` and `leftLight === true`.
- Spezi-Kick charges & Tom aggro: verify `sipSpezi` caps at 2 tactical charges for Koffein-Boost (further clicks just play empty-can rattle) and speeds up Tom's next step if active.
- In-office jumpscares: verify office jumpscares keep `officeRoot.visible = true` so characters lunge inside the actual 3D office rather than a black void.

---

### Task 1: Core FNaF 1 Power Economy, AI Fidelity & Upgraded Fangame Systems

**Files:**
- Modify: `src/config/constants.js`, `src/config/characters.js`, `src/config/nights.js`
- Modify: `src/engine/simulation.js`, `src/engine/ai/torgeAi.js`, `src/engine/ai/haukeAi.js`, `src/engine/ai/antonAi.js`, `src/engine/ai/tomAi.js`
- Modify: `src/engine/systems/orderSystem.js`, `src/engine/systems/thermalSystem.js`
- Modify: `src/storage/saveSystem.js`, `src/controls.js`
- Test: `tests/fnaf.test.js`, `tests/systems.test.js`, `tests/controls.test.js`

- [x] Calibrate FNaF 1 power drain (`BASE_IDLE_DRAIN = 0.148`, `EXTRA_BAR_DRAIN = 0.162`), `KITCHEN_BELL_COST = 0`, Express Bon rewards (`+5%` express / `+3%` normal; `+7%`/`+5%` with `rusty_gen`), and 2-charge `SPEZI_CHARGES = 2` (`KeyC` + 3D click).
- [x] Upgrade `torgeAi.js` (Freddy camera-look stall + `4B` non-`4B`-monitor ambush + `4B` door knock) and `haukeAi.js` (general monitor check calming + strong `1C` lock).
- [x] Add `audioSubtitles: false` to `DEFAULT_SETTINGS` and `saveSystem.js`.
- [x] Update and expand unit tests in `tests/*.test.js` and verify `npm test` passes.

### Task 2: Complete 3D Character Models, Procedural Canvas Art & Mugshot Generator

**Files:**
- Modify: `src/render/primitives.js`, `src/render/textures.js`, `src/render/characters3d.js`

- [x] Add articulated Mascot-Animatronic builder helpers (endoskeleton joints, segmented limbs, hinged jaws with teeth, posable eyelids & 3D brows, Endo-Stare eye mode).
- [x] Rebuild `chefTorgeModel`, `lostAntonModel`, `schnorrerTomModel`, `bossHaukeModel`, and `goldenDuckModel` with rich canvas outfit/prop textures and zero geometry clipping.
- [x] Add `renderCharacterPortraitDataUrl(charId)` in `src/render/textures.js` for crisp illustrated animatronic portraits in Custom Night & Dossier UI, plus upgraded retro-Imbiss wall tiles, comic posters, Paulaner-style Spezi wrap, Google Maps phone screen, and Surf-Miami / Bib textures.

### Task 3: Rebuilt 3D Security Office, Clickable Doorframe Switches, All 10 CCTV Dioramas & In-Office Jumpscares

**Files:**
- Modify: `src/render/props3d.js`, `src/render/SceneView.js`, `src/main.js`

- [x] Replace upside-down cone garlands with festive triangular Imbiss bunting flags + string bulbs; add plumbed steam pipes, arcade cabinet (`FLAPPY ENTE 87`), staring spare animatronic heads (`CAM 5`), and clickable 3D doorframe `DOOR` / `LIGHT` button boxes (`left_door_btn`, `left_light_btn`, `right_door_btn`, `right_light_btn`).
- [x] Position Anton outside the Left Office Window when `leftDoor` is closed so Left Light (`W`) reveals his silhouette & glowing phone; add window steam condensation when heat is high.
- [x] Render office jumpscares directly inside `officeRoot` lunging across the desk with strobing office light & jaw chomping.

### Task 4: Authentic FNaF 1 Sound Cues, Steam Audio Muffle & UI Polish

**Files:**
- Modify: `src/audio.js`, `src/hud.js`, `index.html`, `src/style.css`

- [x] Implement harsh FNaF-1 `jammed` error buzzer, piercing dissonant `window_sting` scare chord, WebAudio low-pass muffling of room/hallway cues while `V` steam exhaust roars, Tom bottle-clinking footsteps, 3-distance Torge laughs, and rare creepy Imbiss calliope melody.
- [x] Remove automatic doorway HUD spoiler banners unless `settings.audioSubtitles` is enabled; add Custom Night & Personalakte character portraits, Spezi-Kick HUD pill (`C`), and Settings toggle for `Audio-Untertitel`.
- [x] Visually inspect `after` WebGL2 screenshots via headless Edge CDP, update `README.md` + metadata (`v2.0.0`), pass `npm run check`, commit & push live to `origin/main`.
