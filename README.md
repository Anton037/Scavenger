# Scavenger — Chef Torge Edition (2026)

Ein prozeduraler **Dead-Cells-Pixel-Art 3D-Horror-Roguelite** im Browser (PC & Handy): Du spielst **Chef Torge** mit goldener Chef-Krone und Sonnenbrille, schlägst dich durch immer wieder neu generierte Keller-Etagen, sammelst Relikte, sprengst Druckfässer und entscheidest am **Lastenaufzug**: Run mit **Chef-Mod** tiefer treiben oder Beute sichern!

## Roguelite-Features (Chef Torge Edition)

- **Prozedurale Keller & teilbare Seeds (`?seed=XXXX`)**: Jeder Keller entsteht aus einem exakten 4-stelligen Seed (direkt eingebbar, neu würfelbar oder als Share-Link kopierbar — inklusive „Gleicher Seed“-Sofort-Revanchie in der End-Bilanz).
- **3 Biome & rotierende Etagen-Mutatoren**: Wechsel zwischen *Keller-Trakt*, *Kühlhaus -18°C* und *Heiz-Bunker* mit angepasstem Biome-Soundscape — kombiniert mit Mutatoren wie *Spiegelglatt*, *Kisten-Rausch*, *Vollgas-Hauke*, *Schnorrer-Alarm*, *Stromausfall* oder *Pfannen-Fieber*.
- **3 Chef-Stile (Loadouts)**: Starte als **Klassik** (Allrounder), **Pfand-Jäger** (+16 % Tempo, 4 Dosen, schneller Dash) oder **Schwergewicht** (+38 % Pfannen-Reichweite & früher Stun).
- **Goldene Chef-Truhen, Holzkisten & Druckfässer**: Pro Etage wartet eine vergoldete **Chef-Truhe** mit Jade-Kristall für Extra-Aura, Kronen-Reparatur, Espresso-Turbo & +1 Dose — während rote **Druckfässer** Kettenreaktionen durch Gegner & Nachbarfässer jagen.
- **Lastenaufzug, Chef-Mods & HUD-Leiste**: Am Aufzug wählst du (per Klick oder `1`–`3`) aus 3 **Chef-Mods** (*Flammende Pfanne* mit DoT + Tempo-Slow, *Turbo-Kettendash*, *Schock-Schelle*, *Flutlicht-Brenner*, *Pfand-Recycling*, *Dreifach-Espresso*, *Titan-Krone*) für steigende Aura-Multiplikatoren (`×1,35` pro Etage). Alle aktiven Mods werden dauerhaft als Icons im HUD & Abschluss-Beleg angezeigt.

## Die Crew im Keller

- **Chef Torge (Du)**: Trägt seine **Chef-Krone** als Rüstungsschild (absorbiert 1 Treffer — der Leuchtstrahl markiert eine verlorene Krone weithin sichtbar), pariert mit `0,15 s`-Input-Buffering, Hit-Stop & **Chef-Schellen**.
- **Massiv-Rund Hauke (Boss)**: Eigene Boss-Leiste, rotes Gravitationsfeld samt kreisendem **Burger, Döner-Spieß & Spezi-Dose**, telegraphierte **Bauch-Ramme** (`Dash`-Ausweichen lässt ihn mit `-25% HP` in die Wand krachen), **Wut-Modus** ab `<= 50% HP` und **Fresskoma** bei `0% HP`.
- **Lost Anton**: Schlaksiger Stalker im Nadelstreifen-Anzug mit rotem Boden-Sichtkegel und goldener **`?`**-Markierung im Suchmodus. Hört Geräusche, reagiert auf den Lichtkegel und rutscht auf Pfützen aus.
- **Einfach Tom**: Flinker Schnorrer mit überfülltem Loot-Rucksack — mopst heimlich **Aura & Dosen** in seine *Piñata-Beute*, die komplett plus Bonus explodiert, sobald ihn deine Chef-Schelle erwischt!

## Relikt-Perks & Steuerung

Jedes geborgene Relikt stärkt deinen aktuellen Run sofort:
- **Goldene Chef-Krone**: `+45% Schellen-Radius` & repariert dein Kronen-Schild
- **Paulaner Spezi**: `+20% Lauftempo` & Espresso-Schub
- **Mitternachts-Döner**: `+2 Pfand-Dosen` & Kronen-Reparatur
- **Goldener Grillspieß** *(ab Etage 3)*: `+3.000 Aura` & `+2× Combo`

### PC-Steuerung
- `WASD` / `Pfeiltasten` — Bewegen
- `Maus` — Taschenlampe & Blickrichtung zielen
- `Linksklick` / `C` / `V` — **Chef-Schelle** (Funken-Arc, Kisten/Fässer treffen, Rückstoß & Stun)
- `Rechtsklick` / `Leertaste` — **Dash** (`KNAPP! +400 ⚡` bei Timing-Ausweichen; Rutschen auf Pfützen)
- `Q` — Taschenlampe an/aus (Tarnung in echter Dunkelheit vs. Weitsicht)
- `F` — Goldene Pfand-Dose werfen (lenkt Anton & Hauke ab)
- `E` — Relikt greifen / Krone aufheben / Dampf-Ventil zünden / Aufzug rufen
- `M` — Keller-Radar · `Escape` / `P` — Pause

### Handy / Touch
- **Links**: Virtueller Analog-Stick (merkt sich die letzte Blickrichtung beim Loslassen)
- **Rechts**: Touch-Buttons für **Schelle**, **Licht**, **Dose**, **Dash** & **Greifen**

## Lokal starten & testen

```bash
npm install
npm run dev     # Entwicklungsserver
npm run check   # Tests (node --test) + Produktions-Build (vite build)
```
