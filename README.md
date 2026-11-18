# Scavenger — Chef Torge Edition (2026)

Ein schnelles, atmosphärisches **Dead-Cells-Pixel-Art 3D-Horror-Action-Game** im Browser (PC & Handy): Du spielst **Chef Torge** mit goldener Chef-Krone und Sonnenbrille, schlägst dich durch den stockdunklen Keller, sammelst **Goldene Chef-Krone**, **Limitierte Paulaner Spezi** & **Heiligen Mitternachts-Döner** — und entkommst per Aufzug!

## Die Crew im Keller

- **Chef Torge (Du)**: Trägt seine **Chef-Krone** als Rüstungsschild (absorbiert 1 Treffer und fällt zu Boden — schnell wieder aufheben!) und teilt mit der goldenen Pfanne **Chef-Schellen** aus.
- **Massiv-Rund Hauke (Boss)**: Hat eine eigene Boss-Leiste, ein rotes Gravitationsfeld samt kreisendem **Burger, Döner-Spieß & Spezi-Dose**, telegraphiert seine gefährliche **Bauch-Ramme** (mit `Dash` ausweichen, sodass er mit `-25% HP` in die Wand kracht!) und fällt bei `0% HP` ins **Fresskoma** (`+4.000 Aura`).
- **Lost Anton (Slenderman)**: Schlaksiger Keller-Stalker mit Anzug, roter Krawatte und goldener **`?`-Markierung**, wenn er mal wieder komplett lost durch die Gänge irrt. Hört Lärm, sieht Lichtkegel und rutscht auf Wasserpfützen aus.
- **Tom (Einfach Tom)**: Geduckter Schnorrer mit überfülltem Loot-Rucksack — klaut heimlich **Aura & Pfand-Dosen**, bis er eine Chef-Schelle kassiert.

## Direkte Relikt-Perks & Steuerung

Jeder Schatz gibt dir sofort einen permanenten Run-Vorteil (sichtbar als Relikt-Rack oben links):
- 👑 **Chef-Krone**: `+45% Schellen-Radius` & Combo-Aura
- 🍺 **Paulaner Spezi**: `+22% Lauftempo` (zischende Dose lockt gelegentlich Anton)
- 🥙 **Mitternachts-Döner**: `+2 Pfand-Dosen`, `10s Turbo-Speed` & repariert sofort deine **Chef-Krone**

### PC-Steuerung
- `WASD` / `Pfeiltasten` — Bewegen
- `Maus` — Taschenlampe & Blickrichtung zielen
- `Linksklick` / `C` / `V` — **Chef-Schelle** (Funken-Arc, Rückstoß & Stun)
- `Rechtsklick` / `Leertaste` — **Dash** (Unverwundbarkeits-Hechtsprung; `KNAPP! +400 ⚡` bei Timing-Ausweichen; Rutschen auf Pfützen)
- `Q` — Taschenlampe an/aus (Tarnung in echter Dunkelheit vs. Weitsicht)
- `F` — Goldene Pfand-Dose werfen (lenkt Anton & Hauke ab)
- `E` — Relikt greifen / Krone aufheben / Dampf-Ventil aufdrehen
- `M` — Keller-Radar · `Escape` / `P` — Pause

### Handy / Touch
- **Links**: Virtueller Analog-Stick (merkt sich die letzte Blickrichtung beim Loslassen) & Tap zum Ausrichten
- **Rechts**: Dedizierte Touch-Buttons für **Schelle**, **Licht**, **Dose**, **Dash** & **Greifen**

## Lokal starten & testen

```bash
npm install
npm run dev     # Entwicklungsserver
npm run check   # Tests (node --test) + Produktions-Build (vite build)
```
