# FIVE NIGHTS AT TORGE'S (v1.0 · Dampf & Überstunden Edition)

Survival-Horror in **Chef Torges Mitternachts-Imbiss** — klassisches **FNaF-1-Kern-Gameplay** verschmolzen mit aktiven **Tealerland- / Fangame-Systemen** (Fritteusen-Thermik & Flur-Dampfstöße, 3D-Nacht-Bon-Drucker für Notstrom-Trinkgeld, CCTV-IR-Stroboskop & Risiko-Modifikatoren).

## Wer hat Nachtschicht?

- **Chef Torge** wartet mit goldener Krone und Bratpfanne auf der Döner-Bühne und zieht später durch den Ost-Flur. Auf **CAM 4B** beobachten bremst ihn — aber Vorsicht: Steigt die **Fritteusen-Hitze über 70 %**, bekommt er Küchen-Fieber und wird deutlich schneller!
- **Lost Anton** schleicht links mit Smartphone in der Hand. Starrst du ihn zu lange im selben Feed an, startet er einen **Videoanruf**. Wechsle die Kamera, senke den Monitor oder blende seine Frontkamera per **IR-Blitz (`X`)**!
- **Schnorrer Tom** hat es auf die rechte Tür und dein Spezi abgesehen. Der Bestellgong auf **CAM 6 (`B`, −4 % Strom)** lockt ihn zurück in die Küche — oder neble ihn auf **CAM 4B** kostenlos per **Dampfstoß (`G`)** ein!
- **Boss Hauke** lässt sich durch Blicke auf **CAM 1C** bremsen oder per **IR-Blitz (`X`)** sogar um 1 Vorhang-Stufe zurückdrängen. Bebt das Büro (**Seismograph**): **SOFORT linke Tür (`Q`) schließen!**
- **Goldene Ente** taucht selten über CAM 2B auf. Sitzt sie vor dem Schreibtisch, klappe sofort den Monitor hoch.

## Neue Fangame-Mechaniken & Engine-Highlights (`v1.0`)

- **Fritteusen-Thermik & Dampf-Abwehr (*Tealerland*-inspiriert):** Geschlossene Stahltüren stauen Hitze im Büro auf. Dreh links am **3D-Abluftventil (`V`)**, um das Büro zischend zu kühlen — oder nutze ab **45 % Druck** den angestauten Dampf auf **CAM 2B / CAM 4B (`G`)** als kostenlose Abwehrwaffe (`0 %` Strom!), um Anton, Tom oder Torge zurückzutreiben!
- **3D-Nacht-Bon-Drucker (`T`):** Rechts auf dem Schreibtisch rattern Nacht-Bestellungen herein. Im Büro rechtzeitig abstempeln bringt **`+4 %` Notstrom** (`+6 %` mit *Rostiger Generator*) + Trinkgeld. Verpasste Bons schlagen Alarm und locken Angreifer an!
- **CCTV IR-Stroboskop-Blitz (`X`):** Entstört ausgefallene Kamerafeeds sofort (`−1 %` Strom, `14 s` Cooldown), bricht Antons Videoanruf ab + blendet ihn kurz und beruhigt Hauke auf `CAM 1C`.
- **4 kombinierbare Risiko-Modifikatoren (Mutatoren):** *Fritteusen-Überlast*, *Liefer-Rushhour*, *Rostiger Generator* & *Nebel-Schicht* für Bonus-Prozente, **16 Stempel** und den neuen **`S++ KÜCHENGOTT`**-Rang (`★★★★`).
- **Gebatchte 60-FPS-WebGL2-Engine:** Statisches Geometry-Batching (~75 % weniger Draw Calls), `PCFShadowMap` mit selektiven Hero-Schatten, Live-Telemetrie-CRTs direkt auf dem 3D-Schreibtisch, volumetrische Flurlicht-Kegel, Heat-Haze-/Dampf-Shader und 3 Grafik-Profile (`HD Horror` / `60 FPS` / `Retro CRT`).

## Steuerung

### PC
- `Maus` (Bildschirmränder) / `A` & `D` / `Pfeiltasten` — Im Büro umschauen
- `Q` / `W` — Linke **Stahltür** / Linkes **Flurlicht** · `E` / `R` — Rechte **Stahltür** / Rechtes **Flurlicht**
- `V` (oder Klick aufs 3D-Ventil) — **Abluft-Ventil** öffnen · `T` (oder Klick auf 3D-Drucker) — **Nacht-Bon** abstempeln
- `Leertaste` / `S` — **CCTV-Kameras** · `1`–`0` — Kamera wechseln
- `X` — **IR-Kamerablitz** · `G` — **Flur-Dampfstoß** (`CAM 2B` / `4B`) · `B` — Bestellgong (`CAM 6`) · `F` — Kamerasicherung
- `M` — Anruf stumm · `H` oder Klick im Büro — **Poster-Hupe / Spezi / Mini-Ente** · `Esc` / `P` — Pause

### Handy / Touch (Querformat / Landscape)
- **Wischen** (oder `◀` / `▶`) zum Umschauen · **Links/Rechts**: Tür & Licht · **Unten**: Schreibtisch-Pills (`VENTIL`, `BON`), `KAMERAS` & CCTV-Gegenmaßnahmen (`IR-BLITZ`, `DAMPFSTOSS`)

## Lokal starten & testen

```bash
npm install
npm run dev     # Entwicklungsserver
npm run check   # Alle Unit-Tests (node --test) + Produktions-Build (vite build)
```
