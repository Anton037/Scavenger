# FIVE NIGHTS AT TORGE'S — v2.0 Psychological Horror Architecture & Design Spec

Dieses Dokument beschreibt die in **`v2.0.0`** umgesetzte Architektur für **Five Nights at Torge's** (*Chilla's Art „The Closing Shift“* × *FNaF Plus / FFPS*).

## 1. Visuelle & Technische Leitlinien (`src/render/`)
- **Skulpturierte PS1/VHS-Stalker statt Primitiv-Figuren (`primitives.js`, `characters3d.js`, `characterTextures.js`):**
  - Alle 5 Figuren nutzen artikulierte 17-Gelenk-Hierarchien (`pelvis`, `torso`, `chest`, `neck`, `head`, `jaw`, `eyes`, Ober-/Unterarme, Hände, Ober-/Unterschenkel, Füße) auf Basis facettierter `BufferGeometry`-Builder.
  - Bayer-4×4-quantisierte `256×256`-Canvas-Texturen liefern Hautporen, Augenringe, Bartstoppeln, Schweißglanz und verschmutzte Arbeitskleidung.
  - Tiefe Augenhöhlen mit blutunterlaufenen Skleren und **retroreflektierenden weißen IR-Pinpoints** (`setIrEyeShine`), die im Kegel der Taschenlampe und auf Nachtsichtkameras aufleuchten.
  - **Das Enten-Kostüm (`duck`):** Lebensgroßes, ölverschmiertes Maskottchenkostüm mit aufgeplatzten Nähten und menschlichen Augen tief hinter dem schwarzen Schnabelgitter.
- **Prozedurale PBR-Materialien & 2-Stationen-Kabine (`textures.js`, `props3d.js`, `SceneView.js`, `postShader.js`):**
  - Sobel-Normalmaps + Roughness-Maps für nasse Steinzeugfliesen, gekachelte Imbisswände, gebürsteten Edelstahl und Rollladenprofile.
  - **Nord-Ansicht (`front`):** Überwachungstresen mit zwei Live-Telemetrie-CRTs, Ventilator, Kassetten-Telefon, Kosmetik-Slots, Seitenrollläden + regennassen Fenstern sowie der **türlosen Mittel-Durchreiche** in den dunklen Küchengang.
  - **Süd-Ansicht (`back`, `180°`):** Vorbereitungszeile (Dönerspieß, Doppel-Fritteuse, Spezi-Zapfanlage & Packstation), physischer **Hauptsicherungs-Kasten**, **Abluftventil** und **Hinterluke**.
  - **Unter-Theke-Ansicht (`under_desk`):** Versteck unter dem Edelstahltresen mit flachem Sichtspalt auf die nassen Bodenfliesen, vorbeigehende Sneaker und Antons suchenden Smartphone-Lichtkegel.
- **Optionale Asset-Overrides (`public/overrides.json`, `src/render/overrides.js`):**
  - Einmaliger Manifest-Load beim Booten ohne 404-Konsolenfehler im Auslieferungszustand (`{ "faces": {}, "sfx": {} }`).

## 2. Kernschleife & 5-Stalker-KI (`src/engine/`)
- **Pflicht-Bons & `06:00 AM`-Überstunden (`systems/orderSystem.js`, `simulation.js`):**
  - Jede Schicht verlangt `3..8` dreistufig zubereitete Mitternachts-Bestellungen (`doner` → `fryer` → `bag`), deren Fortschritt beim `180°`-Umdrehen erhalten bleibt.
  - Sind um `06:00 AM` noch Bons offen, wechselt die Schicht in **`06:00 · ÜBERSTUNDEN`**, bis die Quote erfüllt ist.
- **Asymmetrische Konter (`ai/*.js`):**
  - **Chef Torge:** Rückt durch die unverschließbare Mittel-Durchreiche vor; wird durch gezieltes Taschenlampenlicht (`F`) zurückgedrängt.
  - **Lost Anton:** West-Flur + Video-Hijack; durchsucht bei Einbruch den Boden vor der Theke (`5,4 s` Atem-Anhalten unter der Theke rettet).
  - **Schnorrer Tom:** Reagiert auf Küchengeräusche (`roomNoise`); greift über das rechte Fenster oder die `180°`-Hinterluke an.
  - **Boss Hauke:** `CAM 1C` → `CAM 2A`-Sprint; ein geblockter Einschlag am linken Rollladen löst die physische Hauptsicherung (`breakerTripped`) an der Rückwand aus.
  - **Das Enten-Kostüm:** Lautlose `180°`-Anomalie mit striktem **Lichtverbot** (Anleuchten = sofortiger Jumpscare; Wegdrehen/Monitor = Verbannung).

## 3. Spielbare VHS-Bänder & Reiner Kosmetik-Kiosk (`src/minigames/`, `src/storage/`)
- **3 First-Person-3D-VHS-Minispiele (`vhsMinigames.js`):** *Tape 01 · Flur-Kontrolle*, *Tape 02 · Hinterzimmer-Inventur* und *Tape 03 · Kühlhaus-Schlussrunde* schalten Schichtprotokolle und Trinkgeld frei.
- **100 % faire Kosmetik (`cosmetics.js`, `saveSystem.js`):** Trinkgeld (`€`) schaltet ausschließlich 5 Theken-Trophäen, 3 Wandplakate und 4 VHS-Shader frei — ohne Gameplay-Vorteile.

## 4. Räumliches WebAudio & Kassetten-Synthese (`src/audio.js`)
- Echte **`180°`-Stereo-Invertierung** (`pan = -pan`) + **`-8,5 dB` High-Shelf-Rückwanddämpfung** (`computeSpatialAudioParams`).
- Offline-synthetisierte `AudioBuffer`-Foley-Bank (Dosenklappern, nasse Sneaker, Gusseisen-Schaben, nasses Kostümrascheln, Papiertüten, Sicherungsklack, Kassettenlaufwerk, Herzschlag).
- `420 Hz`-Low-Pass-Ohrdruck beim Luftanhalten unter der Theke, 5 individuelle mehrschichtige Jumpscare-Schreie und `300–2800 Hz`-Formant-Kassettensynthese ohne `window.speechSynthesis`.
