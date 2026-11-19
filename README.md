# FIVE NIGHTS AT TORGE'S (2026 · v0.3 Mitternachts-Edition)

Survival-Horror in **Chef Torges Mitternachts-Imbiss**. Halte als Nachtwächter bis 06:00 Uhr durch. Kontrolliere die Kameras, horch auf Schritte und halte genug Strom für Türen, Licht und den Küchenfunk zurück.

## Wer hat Nachtschicht?

- **Chef Torge** wartet mit goldener Krone und Bratpfanne auf der Döner-Bühne und zieht später durch den Ost-Flur. Sein Lachen kündigt an, dass er näher kommt. Auf **CAM 4B** beobachten bremst ihn.
- **Lost Anton** schleicht links mit Smartphone in der Hand. Wenn er zu lange im selben Bild beobachtet wird, startet er einen **Videoanruf** direkt im CCTV-Feed. Wechsle den Feed oder senke den Monitor, bevor er selbst abnimmt.
- **Schnorrer Tom** hat es auf die rechte Tür und dein Spezi abgesehen. Der Bestellgong auf **CAM 6** lockt ihn aus dem Ost-Flur zurück in die Küche (kostet **4 % Strom**).
- **Boss Hauke** lässt sich durch einen Blick in die Buffet-Bucht (**CAM 1C**) bremsen. Achte auf den **Seismographen**! Wenn er rennt, bebt der Boden. Die linke Tür fängt ihn ab, kann dabei aber die Kamerasicherung kosten. Die Kameras kommen nach neun Sekunden zurück oder sofort für **3 % Strom**.
- **Goldene Ente** taucht selten über CAM 2B auf. Wenn sie im Büro erscheint, klapp den Monitor sofort wieder hoch.

## Features

- **5 Nächte + 6. Nacht (Überstunden) + Custom Night (KI 0–20)** inkl. `4/20 ALPTRAUM`, Zufalls-Generator, Shift+Klick (`±5`), Gefahrenstufen-Balken & freischaltbaren Titel-Sternen (`★ ★ ★`).
- **HD-Imbiss-Horror-3D-Engine (umschaltbar auf Retro Pixel CRT):** Echtzeit-Schatten, schwebende Staubpartikel im Lampenkegel, Neon-Leuchtschilder, rotierender Döner-Spieß, Imbiss-Hausordnung, klickbare Büro-Requisiten (**Feierabend-Poster**, **Spezi-Dose**, **Mini-Ente**) & sanfte Kamera-Trägheit.
- **10 CCTV-Kameras mit Live-Telemetrie & Bewegungs-Blips:** REC-Anzeige, Live-Uhrzeit, Signalstärke-Balken, gelbe Bewegungs-Impulse auf dem Grundriss und **Seismograph** für Boss Hauke.
- **Personalakte & Taktik-Handbuch:** Alle Charaktere mit Route, Konter und Imbiss-Lore direkt im Menü & Pause-Screen.
- **Stempelkarte (11 Achievements) & Schichtzeugnis (`S+` / `A` / `B` / `C`):** Dauerhafte Rekorde, Gehaltsabrechnung bei 6:00 AM und Toast-Stempel im Spiel.
- **Einstellungen:** Grafik-Stil (`HD Horror` / `Retro CRT`), CRT-Scanlines (`Aus` / `Dezent` / `Stark`), Master-Lautstärke, Maus-Schwenktempo & Reduzierte Bewegung.
- **Räumliche Prozedurale Web-Audio-Horror-Soundscape:** Blickrichtungs-abhängiges Stereo-Panning, Hallway-Reverb, Ventilator, Tür-Hydraulik, Handy-Videoanruf-Klingelton, Spezi-Zischen, Kassen-Klingeln, Hauke-Erdbeben, Torge-Spieluhr & 6:00-AM-Glocke.

## Steuerung

### PC
- `Maus` (Bildschirmränder) / `A` & `D` / `Pfeiltasten` — Im Büro nach links & rechts schauen
- `Q` / `W` — Linke **Stahltür** / Linkes **Flurlicht**
- `E` / `R` — Rechte **Stahltür** / Rechtes **Flurlicht**
- `Leertaste` / `S` — **CCTV-Kameras** öffnen / schließen · `1`–`0` — Kamera wechseln
- `B` — Bestellgong auf CAM 6 · `F` — ausgelöste Kamerasicherung umlegen
- `M` — Anruf stumm schalten · `H` oder Klick im Büro — **Poster-Hupe / Spezi / Mini-Ente** · `Esc` / `P` — Pause

### Handy / Touch (Nur Querformat / Landscape)
- Im Hochformat erscheint automatisch ein **„Handy bitte drehen“**-Hinweis (pausiert eine laufende Nacht sicher, bis das Gerät zurückgedreht wird).
- **Wischen** (oder `◀` / `▶`-Pfeile) zum Umschauen im Büro (Anti-Zoom & Anti-Markierung aktiv)
- **Links / Rechts**: Große Stahltür- & Flurlicht-Schalter · **Unten**: breite **`KAMERAS`**-Leiste · **Grundriss** klappt den Lageplan auf

## Lokal starten & testen

```bash
npm install
npm run dev     # Entwicklungsserver
npm run check   # Tests (node --test) + Produktions-Build (vite build)
```
