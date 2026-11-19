# Scavenger / Five Nights at Torge's — Projektregeln

## Pflicht-Workflow nach jeder Änderung im Repository

Sobald Code, Assets, Konfigurationen oder Features im Repository überarbeitet wurden, gilt **immer** vor Abschluss der Aufgabe:

1. **Begleitdateien vollständig mitaktualisieren:**
   - Prüfen und aktualisieren, ob `README.md`, `package.json` (z. B. Version bei spürbaren Feature-Updates), `index.html`, `public/manifest.json`, Tests (`tests/*.test.js`) oder sonstige referenzierte Dateien angepasst werden müssen, damit Doku, Metadaten, Tests und Code stets synchron sind.
2. **Qualitätsprüfung ausführen:**
   - `npm run check` (`npm test && npm run build`) muss fehlerfrei durchlaufen.
   - `git status` prüfen, damit keine unerwünschten temporären Dateien im Working Tree liegen.
3. **Alles vollständig live auf `main` pushen:**
   - Alle relevanten Änderungen mit einer klaren Commit-Nachricht committen (`git add -A && git commit -m "..."`) und direkt auf `origin/main` pushen (`git push origin main`), damit Repository und GitHub-Pages-Deployment immer auf dem aktuellen Stand sind.
