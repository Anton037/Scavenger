# FIVE NIGHTS AT TORGE'S — Full Repository Audit & Master Improvement Prompt (`v2.0`)

## Part 1: Honest Audit — What's Good vs. What Misses Original FNaF 1 Quality

### What Is Already Good in the Repository
1. **Clean Deterministic Simulation Core (`src/engine/simulation.js`):** Fixed `60 Hz` (`STEP = 1/60`) simulation decoupled from DOM and WebGL rendering, seeded PRNG (`randomFrom`), and fast Node unit tests (`node --test`).
2. **Fast Batched WebGL2 Architecture (`src/render/primitives.js`, `SceneView.js`, `postShader.js`):** Static geometry batching (`batchStaticGroup`), single post-processing pass (CRT curvature, chromatic aberration, heat shimmer, vignette), and 3 performance profiles (`HD Horror`, `60 FPS`, `Retro CRT`).
3. **Zero-Asset-Bloat Procedural WebAudio (`src/audio.js`):** Stereo panning, algorithmic hallway convolution reverb, dynamics compression, Toreador music-box power-outage sequence, and 6:00 AM Westminster chimes.
4. **Complete Meta-Progression (`src/storage/saveSystem.js`, `nights.js`):** Nights 1–6 + Custom Night (AI `0–20`), `1-9-8-7` Golden Duck Easter Egg, shift modifiers, rank grading (`C` to `S++`), Personalakte dossier, and 16+ Stempelkarte achievements.

---

### Why Gameplay & Art Currently Feel Worse Than Original *Five Nights at Freddy's 1*

#### A. Critical Gameplay Flaws vs. FNaF 1
1. **HUD Text Spoilers Destroy All FNaF 1 Sensory Tension (`src/hud.js`):**
   - `paintShiftAlert()` displays a persistent red banner at the top of the screen (`"SCHRITTE LINKS"`, `"SCHLEIFEN RECHTS"`) the entire time Anton or Tom is at a door — even while the CCTV monitor is up!
   - Worse, `MEME_LINES.antonBlock` / `tomBlock` immediately pop up `"WEST FREI"` / `"OST FREI"` the instant an animatronic leaves a closed door.
   - **Why this ruins FNaF 1:** Original FNaF 1 never tells you via text HUD that Bonnie or Chica arrived or left. You must listen for directional footsteps, watch cameras, and flick Hall Lights (`W`/`R`) to check doorway/window shadows!
2. **Broken Power Economy Allows AFK Double-Door Cheese (`src/engine/simulation.js`):**
   - Current drain formula: `0.098 * usage + passiveDrain` over `330s`.
   - On Night 1, closing **both steel doors for the entire 6-hour night** (`usage = 3`) only drains `0.098 * 3 * 330 = 97.02%` power! Players can literally lock both doors at `12:00 AM` and go AFK to win Night 1 (and stamp 1–2 Bons on Nights 2–3 to keep both doors permanently shut).
   - Meanwhile, the `CAM 6` Kitchen Bell costs **`-4%` power** — 8× more expensive than just shutting the right door for 5 seconds!
3. **Chef Torge (`torgeAi.js`) Misses Iconic FNaF 1 Freddy Fazbear Mechanics:**
   - Currently, Torge retreats from `4B` back to `4A` if the Right Door is closed, and walks into your office from `4B` even while your monitor is down!
   - In real FNaF 1, **Freddy Fazbear** gets a post-camera-look stall countdown based on AI (`~15s - 0.6s * AI`), lurks in the **East Corner blind spot (`4B`)** (invisible or barely glinting in the Right Hall Light), **only slips into the Office from `4B` when the player raises the Monitor on a camera OTHER than `4B`** while the Right Door is open, and stays camping at `4B` if blocked by the door — creating the iconic FNaF 1 *"Cam-Stall `4B` before flipping to `1C`"* tension!
4. **Boss Hauke (`haukeAi.js`) Forces Tedious `1C`-Only Babysitting Instead of FNaF 1 Camera Rhythm:**
   - In FNaF 1, **any** camera monitor usage briefly locks Foxy's movement timer (so regular camera checks naturally keep him calm without staring only at `1C`), while neglecting cameras lets him progress through 4 clear stages and charge down `2A`.
5. **Closed-Door Window Check Broken on Left Side (`SceneView.js`):**
   - When the Left Door is closed and Anton is still waiting outside, flicking the Left Hall Light (`W`) shows nothing because Anton stands behind the opaque steel shutter away from the window. In FNaF 1, Bonnie casts a chilling **silhouette across the Left Office Window** when the door is shut so you know it's not safe to open yet!
6. **Jumpscares Cut to an Empty Black Void (`SceneView.js`):**
   - `jumpscareRoot` hides the entire 3D Security Office and shows a model floating in pitch-black emptiness. Real FNaF 1 jumpscares lunge at you **inside the actual lit/flickering Security Office** (or right inside the live CCTV feed)!
7. **Missing Classic FNaF 1 Audio Signatures (`src/audio.js`):**
   - Missing the iconic harsh **Jammed-Door `ERR-ERR` Buzzer** when clicking a jammed door/light (the signature tell that Anton or Tom is already inside the room!).
   - `window_sting` is a soft noise puff instead of FNaF 1's heart-stopping **dissonant horror violin/piano scare chord** when illuminating an animatronic right outside your window!
   - Venting steam (`V`) claims `"kurz schwerhörig"` in text, yet doesn't actually muffle hallway audio in WebAudio!

#### B. Visual & Art Style Flaws (Diagnosed via Rendered WebGL Screenshots)
1. **Primitive "Snowman / Pill" Character Models (`src/render/characters3d.js`):**
   - **Boss Hauke** is a giant white sphere (`orb`) that completely swallows his own chin/mouth!
   - **Schnorrer Tom** has a flat black rectangle mouth that reads like a mustache on a pink cone.
   - **Lost Anton** looks like a black stick figure with a bowling-ball `O` mouth.
   - **Chef Torge** has giant red sphere shoulder-balls and a tiny flat disc pan.
   - None of the characters look like **chunky, articulated, goofy Mascot-Animatronics** with endoskeleton joints, hinged toothed jaws, expressive eyelids/eyebrows, fingers, and textured outfits!
2. **Dull Repetitive Room Palette & Broken Prop Proportions (`props3d.js`, `textures.js`, `SceneView.js`):**
   - Ceiling garlands look like upside-down floating cones instead of triangular diner bunting flags + string lights.
   - The desk Spezi can is nearly as big as the desk fan and glows like neon tubes instead of having a crisp painted can label.
   - Every room shares the same dark-navy wall gradient, lacking warm retro-diner tile contrast, goofy Imbiss posters, arcade cabinets, spare mascot heads in `CAM 5`, and clickable 3D doorframe switch boxes.

---

## Part 2: The Self-Applied Master Improvement Prompt

> **MASTER PROMPT — FIVE NIGHTS AT TORGE'S v2.0 ("ANIMATRONIC IMBISS OVERHAUL"):**
>
> Transform *Five Nights at Torge's* into a faithful, nail-biting **FNaF 1 experience** fused with a **vibrant, goofy, expressive Stylized Mascot-Animatronic 3D art style** and **high-skill FNaF fangame mechanics**:
>
> 1. **Rebuild All 5 Character 3D Models & Textures from Scratch (`characters3d.js`, `textures.js`):**
>    - Design every character as a **chunky, articulated Mascot-Animatronic Caricature** with dark-iron endoskeleton joints/neck rings, brass bolts, sculpted head shells, **hinged lower jaws with chunky animatronic teeth**, posable 3D eyebrows & eyelids (switching from goofy mascot expressions to eerie blacked-out pinprick "Endo-Stare" eyes when close!), sculpted hands/sneakers, and custom canvas-painted clothing/prop textures:
>      - **Chef Torge:** Sculpted mascot head, curly dark hair clusters, green snapback + gleaming jeweled Golden Crown, rosy animatronic cheeks, double-breasted crimson/white Chef Coat + printed *"MIT SCHARF!"* apron, stage mic/tongs + sizzling cast-iron pan with fried egg!
>      - **Lost Anton:** Tall slouched hoodie-animatronic, crooked gamer headphones, tired dark-ringed eyes, *"404 AUSGANG?"* streetwear hoodie texture, glowing cracked Smartphone with painted Google Maps / FaceTime screen lighting up his face in the dark!
>      - **Schnorrer Tom:** Mischievous loot-goblin animatronic, backwards snapback with hair tuft, scheming half-lidded emerald eyes, buck-toothed hinged jaw, comical *"GRATIS SPEZI?"* bib (Chica homage!), Surf-Miami palm-tree shirt texture, overflowing Pfand backpack with bottles/cans, clutching a crisp textured Spezi can!
>      - **Boss Hauke:** Broad, barrel-chested Heavyweight Bouncer Animatronic (no belly-chin clipping!), swept pompadour quiff, fierce angled brows, heavy hinged chomping jaw, gold chain + `"8.4"` Richter belt buckle, track-stripe jacket/joggers, brass-plated Seismic Boots, holding a bitten XXL-Dürüm!
>      - **Goldene Ente:** Slumped Golden-Freddy-pose gilded animatronic duck suit with tarnished seams, crooked mini top-hat & bowtie, hollow black sockets with jittering white pinpricks!
>
> 2. **Overhaul 3D Office, Lighting, Props & All 10 CCTV Rooms (`props3d.js`, `textures.js`, `SceneView.js`):**
>    - Replace dull navy walls with warm glazed retro-Imbiss diner tiles, classic red/white/black checkered frieze, grime/grease decals, comic-illustrated posters (with corrupted Night 4–5 & Golden Duck variants), proper triangular bunting flags + string bulbs, plumbed overhead brass steam pipes, and **clickable 3D doorframe `DOOR` / `LIGHT` button boxes**!
>    - Fix **Window Visibility**: When Left Door is closed and Anton is still at `left_door`, flicking Left Light (`W`) reveals Anton's eerie silhouette & glowing phone peeking outside the **Left Office Window**! Keep Tom staring right into the **Right Office Window** (`R`), and keep Torge lurking in the shadowy East blind spot so `CAM 4B` stays essential!
>    - Give each CCTV room unmistakable visual identity & multi-pose character framing (close-up camera stares on `2B`/`4B`/`5`, staring spare mascot heads on `CAM 5`, *"FLAPPY ENTE 87"* arcade cabinet in `CAM 1B`, swinging bulb in `CAM 3`).
>    - **In-Office 3D Jumpscares:** Render office jumpscares directly inside the flickering 3D Security Office lunging over the desk!
>
> 3. **Restore Pure FNaF 1 Gameplay Tension & Fix Balance (`simulation.js`, `ai/*`, `hud.js`):**
>    - **Authentic Power Curve:** Calibrate base & per-bar battery drain (`1 bar` idle ~`52%` over a night; each extra bar adds meaningful drain) so doors/lights/cameras require real FNaF-1 discipline and double-door camping drains out mid-night.
>    - **Pure Sensory Cues (No HUD Spoilers):** Remove automatic `"SCHRITTE LINKS"` / `"SCHLEIFEN RECHTS"` / `"WEST FREI"` / `"OST FREI"` text popups in standard play. Add an optional **Settings -> Audio-Untertitel (Barrierefreiheit)** toggle (`AUS` by default) for players who want visual sound captions.
>    - **Authentic FNaF 1 AI:**
>      - *Chef Torge (Freddy):* Camera-look stall countdown (`14s - 0.55s * AI`), `CAM 4B` cam-stalling, only slips from `4B` into Office when Monitor is raised on a non-`4B` camera while Right Door is open, and camps `4B` with a metallic knock/laugh when blocked!
>      - *Boss Hauke (Foxy):* Any monitor activity briefly calms `lockTimer` (stronger on `1C`), 4 distinct curtain stages, dramatic `2A` sprint!
>      - *Anton & Tom (Bonnie & Chica):* Window shadow/stare checks, jammed-door buzzer if already inside, and forced monitor pull-down if player camps on CCTV too long while they're inside the office!
>
> 4. **Elevate Fangame Mechanics into Cohesive High-Skill Tools (`systems/*`, `controls.js`):**
>    - **FREE Kitchen Audio Lure (`B` on `CAM 6`, `0%` power, `22s` cooldown):** Pulls Tom from East Hall/Door back to `CAM 6` and slows Torge in `CAM 6` — rewarding smart camera scouting by saving precious door battery!
>    - **Express Nacht-Bon Dynamo (`T`):** Stamping within the first `5.5s` (*"HEISS SERVIERT!"*) grants **`+5%` Power (`+7%` with Rusty Gen) + `2×` Tip**; normal stamp grants `+3%` (`+5%`); missed Bon triggers a loud Storno-Alarm that agitates Tom & Torge!
>    - **Thermal Exhaust Audio Risk (`V` & `G`):** High heat (`>70%`) fogs office window glass & enrages Torge; opening the Office Exhaust Valve (`V`) rapidly cools heat **at the cost of roaring steam muffling hallway footsteps/laughs** (real WebAudio low-pass muffle!); `G` on `CAM 2B`/`4B` spends `>=45%` steam to blast corner threats back for `0%` power!
>    - **Tactical Desk Spezi Koffein-Kick (`C` or clicking the 3D Spezi can, 2 sips per night):** Grants `8s` of **Koffein-Fokus** (snappier door/monitor servos, steadied camera during quakes, slight passive drain relief) — **WITH A TWIST:** cracking open a cold Spezi in the office makes Schnorrer Tom smell it and advance faster if he's nearby!
>
> 5. **Upgrade WebAudio Signatures & UI Polish (`audio.js`, `hud.js`, `style.css`):**
>    - Harsh FNaF-1 **Jammed-Door `ERR-ERR` Buzzer**, piercing **Window Scare Chord**, mechanical monitor flip + CCTV garble interference, real low-pass muffling during `V` steam exhaust, and procedural **Animatronic Mugshot Portraits** on Custom Night & Personalakte cards!
