# FIVE NIGHTS AT TORGE'S (2026)

Survival-Horror in **Chef Torges Mitternachts-Imbiss**. Halte als Nachtwächter bis 06:00 Uhr durch. Kontrolliere die Kameras, horch auf Schritte und halte genug Strom für Türen, Licht und den Küchenfunk zurück.

## Wer hat Nachtschicht?

- **Chef Torge** wartet auf der Döner-Bühne und zieht später durch den Ost-Flur. Sein Lachen kündigt an, dass er näher kommt.
- **Lost Anton** schleicht links. Wenn er zu lange im selben Bild beobachtet wird, meldet er sich per Video. Wechsle den Feed oder senke den Monitor, bevor er selbst abnimmt.
- **Schnorrer Tom** hat es auf die rechte Tür abgesehen. Der Bestellgong auf **CAM 6** kann ihn aus dem Ost-Flur zurück in die Küche locken. Eine Bestellung kostet **4 % Strom**.
- **Boss Hauke** lässt sich durch einen Blick in die Buffet-Bucht (**CAM 1C**) bremsen. Wenn er rennt, bebt der Boden. Die linke Tür fängt ihn ab, kann dabei aber die Kamerasicherung kosten. Die Kameras kommen nach neun Sekunden zurück oder sofort für **3 % Strom**.
- **Goldene Ente** taucht selten auf. Wenn sie im Büro erscheint, klapp den Monitor wieder hoch.

## Features

- **5 Nächte + 6. Nacht (Überstunden) + Custom Night (KI 0–20)** inkl. `4/20 ALPTRAUM` & freischaltbaren Titel-Sternen (`★ ★ ★`).
- **10 Kameras** auf interaktivem Imbiss-Grundriss (`1A` Döner-Bühne, `1B` Gastraum, `1C` Buffet-Bucht, `2A/2B` West-Flur, `3` Pfand-Lager, `4A/4B` Ost-Flur, `5` Werkstatt, `6` Küche [Nur Audio]).
- **Deutsche Phone-Guy-Anrufe** für Nacht 1–5 (mit `Anruf stumm`-Button).
- **Maßgeschneiderte Single-Active-View 3D-Pixel-Art-Engine** mit CRT-Static, Scanlines, Flimmern, 3D-Büro-Requisiten (klickbares *FEIERABEND!*-Poster mit Hupe!) & 3D-Jumpscares.
- **Prozedurale Web-Audio-Horror-Soundscape** (Ventilator, Tür-Hydraulik, Flurlicht-Summen, Fenster-Horror-Sting, Hauke-Erdbeben, Torge-Spieluhr, Jumpscare-Kreischen, 6:00-AM-Glocke).

## Steuerung

### PC
- `Maus` (Bildschirmränder) / `A` & `D` / `Pfeiltasten` — Im Büro nach links & rechts schauen
- `Q` / `W` — Linke **Stahltür** / Linkes **Flurlicht**
- `E` / `R` — Rechte **Stahltür** / Rechtes **Flurlicht**
- `Leertaste` / `S` — **CCTV-Kameras** öffnen / schließen · `1`–`0` — Kamera wechseln
- `B` — Bestellgong auf CAM 6 · `F` — ausgelöste Kamerasicherung umlegen
- `M` — Anruf stumm schalten · `H` oder Klick auf das Poster — **Hupe** · `Esc` / `P` — Pause

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
