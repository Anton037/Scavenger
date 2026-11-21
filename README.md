# FIVE NIGHTS AT TORGE'S (`v2.4` · 03:00 AM Schließdienst)

Psychologischer First-Person-Nachtschicht-Horror in **Torges geschlossenem Mitternachts-Imbiss** (*Chilla's Art „The Closing Shift“* trifft *FNaF Plus / FFPS*) — komplett ohne externe Pflicht-Binärdateien in eigenem **WebGL2-Renderer** + **Vite `8.3`** umgesetzt:

- **Facettiert modellierte PS1/VHS-Stalker (17-Gelenk-Rigs):** Maßgeschneiderte Low-Poly-Anatomie (`BufferGeometry`), prozedurale Bayer-geditherte `256×256`-UV-Gesichts- und Stofftexturen, tief beschattete Augenhöhlen, blutunterlaufene Skleren und **retroreflektierende weiße IR-Eye-Shine-Reflexe** im Taschenlampen- und Nachtsichtlicht.
- **2-Stationen-Wachkabine (`180°`) + Unter-Theke-Versteck:** Vorne sicherst du linke & rechte Stahlrollläden und leuchtest die **türlose Mittel-Durchreiche** ab; um `180°` gedreht bedienst du **Dönerspieß, Fritteuse, Spezi-Tütenstation, Abluftventil, Hinterluke** und den **physischen Hauptsicherungs-Hebel**; unter der Edelstahltheke beobachtest du nasse Sneaker und Antons suchenden Smartphone-Lichtkegel durch den Bodenspalt und hältst den Atem an.
- **Pflicht-Bons & 06:00-Uhr-Überstunden (*Nachschicht*):** Jede Schicht verlangt eine feste Bestellquote (`3` bis `8` Mitternachts-Bons). Wer um `06:00 AM` noch offene Bons hat, muss bei flackerndem Notlicht und eskalierender Bedrohung nacharbeiten, bis die letzte Tüte gepackt ist.
- **3 spielbare 3D-VHS-Kassetten & 3D- Figurenteller:** *Tape 01 · Flur-Kontrolle*, *Tape 02 · Hinterzimmer-Inventur* und *Tape 03 · Kühlhaus-Schlussrunde* — spielbar nach den Schichten 1–3 sowie jederzeit im **VHS-Archiv** samt interaktivem 360°-Modell- & Jumpscare-Inspektor.
- **Reiner Kosmetik-Nacht-Kiosk (`0 %` Pay-to-Win):** Verdientes Trinkgeld (`€`) schaltet ausschließlich 3D-Theken-Sammlerstücke, Wandplakate und VHS-Bandfilter frei.
- **Optionale Drop-In-Overrides ohne 404-Fehler:** Eigene Gesichter oder Sprachaufnahmen lassen sich jederzeit über [`public/overrides.json`](./public/overrides.json) einbinden (siehe [`public/README-OVERRIDES.md`](./public/README-OVERRIDES.md)).

---

## Die 5 Bedrohungen in der Nachtschicht

| Akte | Rolle & Route | Taktischer Konter |
| :--- | :--- | :--- |
| **Chef Torge** | Schichtleiter · `1A → 1B → 6 → Offene Mittel-Durchreiche` (3 Tiefenstufen) | Rollläden halten ihn im offenen Mittelgang **nicht** auf. **Taschenlampe (`F`)** gezielt in die Durchreiche richten, Pflicht-Bons nicht schleifen lassen und Hitze `< 70 °C` halten. |
| **Lost Anton** | West-Flur (`1A → 1B/5 → 2A/3 → 2B → Linkes Tor → Kabine`) | **Linken Rollladen (`Q`)** schließen; bei Video-Hijack Kamera wechseln oder `X` drücken. Schlüpft er in die Kabine: **sofort unter die Theke (`C`)** ducken und **Atem anhalten (`Space`)**, während sein Handylicht über die nassen Fliesen streicht! |
| **Schnorrer Tom** | Lärm-Jäger (`1A → 1B → 6/4A → Rechtes Fenster ODER Hinterluke`) | Wird durch Elektromesser-, Fritteusen- und Abluftlärm angelockt. **Rechten Rollladen (`E`)** schließen, per **Küchengong (`X` auf `CAM 6`)** weglocken oder um **`180°` drehen (`S`)** und ihn an der **Hinterluke anleuchten (`F`)**. |
| **Boss Hauke** | Lager-Vorhang (`CAM 1C → CAM 2A Sprint → Linkes Tor`) | Regelmäßig `CAM 1C` prüfen oder per **`X`** zurückdrängen. Bei Beben **linken Rollladen (`Q`)** schließen: Der Aufprall hält ihn auf, **wirft aber hinten die Hauptsicherung raus** (`180°` drehen + Hebel **`R`** hochziehen!). |
| **Das Enten-Kostüm** | `180°`-Anomalie · Durchnässtes Imbiss-Maskottchen | **STRIKTES LICHTVERBOT:** Steht das zusammengesackte gelbe Kostüm plötzlich vor oder hinter dir, **niemals die Taschenlampe (`F`) einschalten** — sofort wegdrehen (`S`), unter die Theke (`C`) oder Monitor (`Space`) öffnen! |

---

[Im Browser spielen](https://anton037.github.io/Torges-Pizza/) · [Spiel- und Technik-Checkup](./docs/CHECKUP.md)

## Steuerung (PC & Mobile Landscape)

Auf dem Handy im Querformat zeigt die kompakte Kameraauswahl die Raumnamen an. Wenn du während des Schichtstarts die App wechselst, wartet die Nacht im Pausenmenü. Der erste Bon in Nacht 1 gibt dir 12 Sekunden mehr Zeit und erklärt jeden Arbeitsschritt direkt an der Taste. Während der Korb unten ist, kannst du die Kameras prüfen. Ein Signal meldet den fertigen Korb, und nach dem Packen siehst du Strombonus und Trinkgeld.

### PC (Maus + Tastatur)
- `Mausränder` / `A`, `D` / `◀`, `▶` — Innerhalb der aktuellen Station umschauen
- `S` / `Tab` / `↓` — **`180°`-Wende** zwischen Vorderer Theke und Hinterer Vorbereitungsstation (bzw. unter der Theke wieder aufstehen)
- `C` / `Strg` — **Unter die Edelstahltheke ducken** / aufstehen
- `F` — **Taschenlampe** ein-/ausschalten (Durchreiche, Seitentüren & Hinterluke)
- `Q` / `E` — **Linker / Rechter Stahlrollladen** (Vorne) · an der Rückwand bedient `E` (halten/tippen) den aktuellen **Bon-Arbeitsschritt** (1. Dönerspieß → 2. Fritteuse → 3. Spezi & Tüte)
- `W` / `R` — **Linkes / Rechtes Flurlicht** (Vorne) · an der Rückwand zieht `R` die **Hauptsicherung** wieder hoch
- `V` — **Abluft-Ventil** öffnen (senkt Fritteusen-Hitze, dämpft kurzzeitig Flurgeräusche)
- `Leertaste` — **CCTV-Monitor** auf-/zuklappen · unter der Theke: **Atem anhalten** (gedrückt halten)
- `1`–`0` — Kameras `CAM 1A`–`CAM 6` direkt wählen
- `X` — **Kontext-Gegenmaßnahme im CCTV** (*IR-Stroboskop `−1 %`*, *Flur-Dampfstoß `0 %`* auf `2B`/`4B` ab `45 %` Hitze oder *Küchengong `0 %`* auf `CAM 6`/`4A`)
- `M` — Kassettenband stummschalten · `Esc` / `P` — Pause
- **Direkte 3D-Interaktion:** Alle Schalterkästen, Dönerspieß, Fritteusenkorb, Packstation, Hauptsicherung, Abluftventil und Hinterluke lassen sich auch direkt im 3D-Raum anklicken/halten.

### Smartphone / Tablet (Querformat / Landscape) — 100% Mobile-First
- **Automatischer Vollbildmodus:** Beim Start der Schicht wird Vollbild + Querformat-Sperre angefordert (Browserleiste aus, keine versehentlichen Systemgesten — wird beim Rückkehr ins Menü automatisch beendet)
- **Noch besser: Zum Startbildschirm hinzufügen!** Android startet über das Manifest automatisch im Vollbild-Querformat; auf dem iPhone (dort unterstützt Safari kein requestFullscreen) öffnet „Zum Home-Bildschirm“ die Kabine ohne Browserleiste → dauerhaftes Vollbild-Erlebnis
- **Grafik (v2.4).** Der eigene WebGL2-Renderer kombiniert gerichtetes Licht, dynamische Schatten, Normalmaps und VHS-Effekte. Er passt die interne Auflösung an die Bildrate an und hält UI-Text dabei scharf. WebGL2 muss im Browser verfügbar sein.
- **Halte-sichere Buttons:** ARBEITEN & ATEM ANHALTEN behalten den Griff, auch wenn der Finger leicht abrutscht (Pointer-Capture — kein Abbruch mehr mitten im Schneiden/Gasping)
- **Daumengroße Ziele:** Alle Spielknöpfe ≥ 40–56 px (Stahlgruppen 56 px, LICHT-Chips 44 px, Aktionen/Monitorleiste 44 px, Kamera-/Pauseknöpfe 40 px)
- **Vibration als Warnton:** Jumpscare, Sicherungsausfall, Anton-Videoanruf, Tom-Luke, Enten-Rascheln, Hauke-Anlauf & Türknall vibrieren (falls vom Gerät unterstützt)
- **Wischen links/rechts** zum Umschauen · **Nach unten wischen** = Unter die Theke ducken · **Nach oben wischen** = Aufstehen
- **Ein Bon-Arbeitsknopf hinten:** Gedrückt halten (oder `E`) — der Knopf springt automatisch zum aktuellen Schritt (Spieß → Fritteuse → Tüte)
- **Flurlicht-Chips:** Das LICHT-Steuerfeld hängt direkt an jedem TOR-Knopf (kompakte Taste direkt daneben)
- **Band-Stummschaltung:** Stumm-Chip direkt im Kassetten-Transkript antippen (statt oben in der Leiste)
- **Blick-Pfeile:** Optionale Halte-Pfeile zum Umschauen — Standard AUS, in den **Optionen** zuschaltbar (Wischen funktioniert immer)
- **Kontext-Aktionsleiste** passt sich automatisch an Vorderansicht, `180°`-Rückwand, Unter-Theke-Versteck, CCTV-Monitor und VHS-Bänder an.
- **Automatische Pause:** Tab/Hintergrund ausblenden pausiert die Schicht & senkt die Lautstärke — kein unfairer Tod mehr durch Hintergrundszeit.

---

## Lokal starten, testen & bauen

```bash
npm install
npm run dev     # Entwicklungsserver starten
npm run check   # Alle Unit-Tests (node --test) + Produktions-Build (vite build)
```
