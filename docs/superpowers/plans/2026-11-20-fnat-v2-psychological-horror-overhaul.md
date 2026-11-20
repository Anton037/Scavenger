# Five Nights at Torge's v2.0 — Psychological Horror, Asset, Gameplay & Audio Overhaul Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform *Five Nights at Torge's* (`Scavenger`) into a genuine PS1/VHS psychological workplace horror game (*Chilla's Art "The Closing Shift"* meets *FNaF Plus / FFPS*) featuring sculpted low-poly human stalkers, a tactile 2-Station 180° Imbiss Booth with Under-Desk hiding and Mandatory Midnight Order Prep, 3 playable 3D VHS post-shift micro-horror minigames, a purely cosmetic Trinkgeld Kiosk + 3D Character/Jumpscare Viewer, and 180° spatial baked foley + cassette murmur audio.

**Architecture:** Fixed-step `60 Hz` deterministic simulation (`src/engine/`, `src/minigames/`) decoupled from batched WebGL2 PBR/PSX rendering (`src/render/`), offline-baked procedural WebAudio (`src/audio.js`), optional zero-404 user overrides (`public/overrides.json`), and accessible PC + Mobile Landscape UI (`index.html`, `src/hud.js`, `src/style.css`).

**Tech Stack:** Vanilla ES Modules, Three.js `0.187.0`, Web Audio API (`OfflineAudioContext` / `AudioBuffer` synthesis), Vite `8.3.8`, Node `node:test`.

**Spec:** User v2.0 Master Prompt & `AGENTS.md`

## Global Constraints
- Zero mandatory external binary assets; optional face/SFX overrides via `public/overrides.json` (`{ "faces": {}, "sfx": {} }`) with zero 404 console spam when empty.
- Tone: 80% genuine psychological horror / 20% dry deadpan 3:00 AM German Döner-Imbiss workplace lore. Zero arcade/meme toast banners during shifts.
- Zero pay-to-win perks: Trinkgeld (`€`) buys cosmetics only (3D desk collectibles, posters, VHS shaders).
- Zero `window.speechSynthesis` usage.
- `npm run check` (`npm test && npm run build`) must pass with zero errors and zero warnings; sync docs/metadata (`v2.0.0`) and push live to `origin/main`.

## Review Focus
1. **Duck Suit Anti-Flash Fairness vs Instant Punishment:** Spawn the Duck Suit without instantly killing a player whose flashlight was already toggled on prior to turning around (auto-cut flashlight on manifestation shock or require fresh flash/look), while turning ON the flashlight while facing the Duck Suit triggers an immediate `flash` jumpscare.
2. **180° Order Prep Persistence:** Turning 180° away mid-slice or while fries sizzle in the vat must preserve exact progress so players can juggle hallway defense and prep steps seamlessly.
3. **6:00 AM Overtime (*Nachschicht*) Edge Case:** Reaching `6:00 AM` with `orders.completed < orders.quota` must NOT win early; it enters `overtime` (`06:00 · ÜBERSTUNDEN`), spikes Torge's aggression, and wins on the exact frame the final required order is bagged.
4. **Under-Desk Breath Depletion:** Holding breath under the desk during Anton/Tom's floor inspection must protect the player while `breath > 0`, but exhausting `breath` to `0` triggers an involuntary loud gasp and immediate under-desk jumpscare if the stalker is still in the office.
5. **180° Stereo Pan Inversion:** When `viewState === 'back'`, left-side world cues (`side: 'left'`, `rawPan < 0`) must invert to positive right-ear pan (`pan > 0`) with rear high-shelf occlusion so headphone directional cues remain physically accurate.

---

### Task 1: Build Hygiene & Optional Asset Override Loader
- Modify `vite.config.js` to split `three` into a dedicated vendor chunk (`build.rolldownOptions.output.codeSplitting` / `manualChunks`) so `vite build` emits zero chunk warnings.
- Create `public/overrides.json` (`{ "faces": {}, "sfx": {} }`), `public/README-OVERRIDES.md`, and `src/render/overrides.js`.

### Task 2: Cosmetics, Presets, Save System & v2.0 Configs (TDD)
- Create `src/config/cosmetics.js` (5 desk collectibles, 3 wall posters, 4 VHS shader themes) and update `src/config/constants.js`, `src/config/characters.js`, `src/config/facility.js`, `src/config/nights.js`.
- Upgrade `src/storage/saveSystem.js` with `loadWallet`, `purchaseCosmetic`, `toggleCosmetic`, `loadCosmeticState`, `markTapeCompleted`, `markPresetCompleted` (strictly zero gameplay stat buffs).

### Task 3: 2-Station Booth Simulation, Prep Quota, Overtime & 5-Stalker AI (TDD)
- Update `src/engine/simulation.js`, `src/engine/systems/orderSystem.js`, `src/engine/systems/thermalSystem.js`, `src/engine/systems/camPulseSystem.js`, and `src/controls.js`.
- Implement `viewState` (`'front'` | `'back'` | `'under_desk'`), `turnAround`, `setUnderDesk`, `setHoldingBreath`, `toggleFlashlight` / `setFlashlight`, `resetBreaker`, `interactPrepStation`, and unified `triggerCamCounter`.
- Implement `torgeAi.js` (Center Pass-Through depth stages + Flashlight repel), `antonAi.js` (Office breach + Under-Desk Hold-Breath inspection), `tomAi.js` (Noise scavenger + East shutter & Back Pickup Hatch), `haukeAi.js` (CAM 1C -> 2A Sprint -> Left Shutter slam + Physical Breaker trip), and `duckAi.js` (Silent 180° anomaly + Anti-Flash instant fail + look-away/monitor banish).

### Task 4: Three Playable VHS Micro-Horror Minigames Engine (TDD)
- Create `src/minigames/vhsMinigames.js` implementing deterministic fixed-step simulation & controls for:
  - `tape1`: *TAPE 01 · FLUR-KONTROLLE* (Plushtrap-style dark corridor audio + `X` marker flash freeze)
  - `tape2`: *TAPE 02 · HINTERZIMMER-INVENTUR* (FFPS-style table cassette test + clipboard + 3-charge strobe taser)
  - `tape3`: *TAPE 03 · KÜHLHAUS-SCHLUSSRUNDE* (Walk-in freezer 3-relay hold-repair + strip-curtain silhouette breath-hold)

### Task 5: Sculpted PS1/VHS Low-Poly Human Rigs, PBRBooth, CCTV & VHS Scenes
- Update `src/render/primitives.js`, new `src/render/characterTextures.js`, `src/render/portraits.js`, `src/render/characters3d.js`, `src/render/textures.js`, `src/render/props3d.js`, `src/render/postShader.js`, and `src/render/SceneView.js`.
- Build faceted low-poly human anatomy (`BufferGeometry` builders), full 17-joint articulated rigs, bloodshot socketed eyes + retroreflective IR pinpoints, Anton's smartphone uplight `PointLight`, and the life-sized Filthy Duck Suit with human eyes glinting inside.
- Build Front Station (with dark Center Service Pass-Through & Under-Desk sightline gap), Back Prep Station (Döner Spit/Slicer, Twin Fryer, Spezi Dispenser, Bagging Tray, Back Pickup Hatch, Physical Main Breaker Lever, Exhaust Valve), dense `batchStaticGroup` CCTV rooms, 3 VHS Minigame 3D environments, and 3D Character/Jumpscare Turntable Viewer.

### Task 6: 180° Spatial Foley Buffers, Danger Stingers & Cassette Murmur Synth
- Rebuild `src/audio.js` (deleting `speechSynthesis`), baking rich procedural `AudioBuffer` foley samples, per-stalker footsteps/scrapes/murmurs, prep equipment loops, 180° stereo inversion (`computeSpatialAudioParams`), under-desk `420 Hz` low-pass ear pressure, and the `300–2800 Hz` telephone/cassette formant murmur synthesizer.

### Task 7: Horror UI, Kiosk, VHS Archive, Browser Verification & Live Push
- Update `index.html`, `src/hud.js`, `src/main.js`, and `src/style.css` with native `<dialog>` modals, clean PC + Mobile Landscape contextual HUD bars, Kiosk, VHS Archive & 3D Viewer.
- Verify visually and interactively in Chrome DevTools MCP (`0` console errors, `0` 404s, Desktop + Mobile Landscape viewports), sync all docs/metadata, pass `npm run check` with zero warnings, commit, and push live to `origin/main`.
