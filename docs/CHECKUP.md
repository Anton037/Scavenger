# Checkup für Torges-Pizza

> Spiele eine frische Schicht am Handy im Querformat. Kannst du den ersten Bon ohne Tastatur und mit stummem Ton abschließen? Kannst du an Geräuschen, Licht und Kameras erkennen, wo die Gefahr ist und wie du reagieren kannst? Welche Entscheidungen kosten Zeit, Strom oder Aufmerksamkeit? Prüfe, ob Kamerawechsel, Drehung, Versteck und VHS-Archiv ihre Aufgabe auch im Dunkeln erfüllen. Miss Build-Größe und Bildrate getrennt. Vergleiche mit Originalveröffentlichungen anderer Fanprojekte und übernimm daraus Prinzipien für Torges Imbiss. Priorisiere Änderungen, die beim tatsächlichen Spielen spürbar sind.

| Bereich | Stärke | Ergebnis des Checkups |
| --- | --- | --- |
| Spielfluss | Pflicht-Bons machen den Arbeitsplatz zum Spiel. Kochen erzeugt Lärm, Überwachung kostet Strom und Umdrehen kostet Sicht auf die Theke. | Die erste Bestellung führt durch Halten, Frittieren und Packen. Sie gibt 12 Sekunden extra. Der Korb meldet seine Restzeit auch auf CCTV. Der quittierte Bon zeigt den Ertrag. |
| Atmosphäre und Lesbarkeit | Regenfenster, Richtungsgeräusche, das Versteck und Antons Lichtkegel gehören zur gleichen Umgebung. | WebGL2 rendert gerichtetes Licht, Schatten und Materialdetails. Raumtiefe und Lichtinseln sollen die Aufmerksamkeit lenken. Welche Routengeräusche bei stummem Ton oder auf Handylautsprechern schlecht zu unterscheiden sind, lässt sich im Gerätetest prüfen. |
| Technik | Szenen und Simulation waren bereits getrennt. Die prozeduralen Figuren, Texturen und VHS-Filter lassen sich unabhängig vom Renderer betreiben. | Der eigene Renderer nutzt zusammengefasste Geometrie, Sichtfeldprüfung, GPU-Puffer, eine Schattenkarte und adaptive Auflösung. Bei dauerhaft niedriger Bildrate entfallen die dynamischen Schatten vorübergehend. Die Bildrate bleibt auf echten Geräten zu messen. |
| Wiederspielwert | VHS-Bänder, asymmetrische Gegner, Custom Night und kosmetische Belohnungen ergänzen die Schichten. | Der nächste größere Designhebel sind erkennbare Schichtschwerpunkte. Eine Schicht könnte abwechselnd kurze Bon-Spitzen und ruhige Beobachtungsphasen einsetzen. Das sollte erst mit Spieltests abgestimmt werden. |

## Vergleich

- **The Joy of Creation** gibt seinen fünf Levels unterschiedliche Mischungen aus freier Bewegung und stationärem Überleben. Für Torges-Pizza ist der übertragbare Ansatz der Wechsel konkreter Situationen. Die vorhandenen Kameras, Küchenstationen und VHS-Bänder können pro Schicht unterschiedlich gewichtet werden. [Spielbeschreibung von Nikson](https://store.steampowered.com/app/2948730/THE_JOY_OF_CREATION/)
- **POPGOES Arcade** baut seine zwei Kampagnen auf neuen Gebieten, Gegnern und Fähigkeiten auf. Torges-Pizza hat mit Archiv und Kiosk bereits eigene langfristige Ziele. Den unmittelbaren Fortschritt im Schichtalltag macht jetzt der Bonabschluss mit sichtbarem Ertrag deutlich. [Spielbeschreibung von Kane Carter](https://store.steampowered.com/app/1986840/POPGOES_Arcade/)
