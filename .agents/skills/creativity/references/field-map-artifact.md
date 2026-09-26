# Cognitive-Field-Map als Claude Artifact

Visualisiert den aktuellen Bedeutungsraum als Graph, ergänzend zu den maßgeblichen Markdown-Dateien in `.ecp/<slug>/field/objects/`. Bevor du zum ersten Mal renderst: Skill `artifact-design` laden (Plattformregel, siehe SKILL.md).

## Wann aktualisieren

Nach jeder Divergenzrunde, nach jedem Gardener-Pass, und nach der Compiler-Phase (process.md). Immer **denselben Dateipfad** erneut an `Artifact` übergeben (z. B. `<scratchpad>/ecp-<slug>-field-map.html`), damit die URL stabil bleibt und der Nutzer nicht bei jeder Runde einen neuen Link bekommt.

## Datenquelle

Baue den Graphen ausschließlich aus einem Scan von `field/objects/*.md`: Frontmatter-`id` und `type` je Objekt als Knoten, `relations`-Einträge als Kanten. Keine separate Zustandsdatei nötig — die Objektdateien sind schon die Quelle der Wahrheit (siehe semantic-object-schema.md).

## Darstellungskonventionen

- **Knotenfarbe nach `type`:** `character`, `image`, `rule`, `question`, `conflict`, `symbol`, `concept` bekommen je eine feste, unterscheidbare Farbe (siehe `dataviz`-Skill für eine konsistente, theme-fähige Palette — vor dem Bauen der Palette dort nachschlagen statt Farben frei zu erfinden).
- **Knotengröße/Betonung nach `emotional_energy`:** hoch = größer/hervorgehoben, niedrig = kleiner/blasser.
- **Kantenbeschriftung nach `relations[].kind`:** die Beziehung selbst (z. B. "widerspricht", "spiegelt") als Kantenlabel, nicht nur eine ungerichtete Linie.
- **Offene Fragen und Widersprüche sichtbar machen:** Objekte mit nicht-leeren `open_questions` oder `contradictions` bekommen ein sichtbares Marker-Symbol (z. B. "?" bzw. "!") am Knoten — das macht den ECP-Grundsatz "Fragen sind wertvoller als Antworten" auch visuell greifbar, statt Widersprüche zu verstecken.

## Technik

- Mermaid-Graph (`graph` oder `flowchart`) reicht für die meisten Feldgrößen; bei sehr großen Feldern (>40 Objekte) eher eine gefilterte Sicht (z. B. nur der zuletzt aktive Cluster) als ein unlesbarer Gesamtgraph — im Artifact selbst ggf. eine simple Filtersteuerung (Dropdown nach Cluster/Typ) ergänzen, kein Rebuild-per-Runde nötig, nur ein Redeploy mit aktualisierten Daten.
- Reines HTML/CSS/JS, kein externer Renderer — Artifacts laufen unter strikter CSP (siehe artifact-design-Skill).
- Theme-fähig gemäß Artifact-Konvention (hell/dunkel), da der Nutzer den Graphen ggf. über mehrere Sitzungen hinweg erneut aufruft.

## Kompiliertes Werk als zweites Artifact

Bei Text-/Kurs-/Präsentationsformen zusätzlich optional: eine lesbare HTML-Ansicht des `output/`-Ergebnisses aus process.md Schritt 8, als eigenständiges Artifact mit eigenem, ebenfalls stabilem Dateipfad (nicht derselbe Pfad wie die Field-Map — beides sind unabhängige, gleichzeitig gültige Artefakte).
