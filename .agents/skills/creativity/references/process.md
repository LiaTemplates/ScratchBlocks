# Prozessablauf, Feedback-Regeln, Guardrails

Vollständige Ausführungsreferenz zu ECP. Die Kurzfassung steht in [SKILL.md](../SKILL.md); die Begründung dahinter in [philosophy.md](philosophy.md).

## Zustände

```
Collector → Divergent Expansion ⇄ Gardener → Feedback-Check → Konvergenz-Checkpoint
                                                    ↑                    │
                                                    └── (Trigger) ───────┤
                                                                         ▼
                                                    Explorer ⇄ Feedback-Check
                                                         │
                                                         ▼
                                          Resonance → Distiller → Narrative Compiler
```

Der Prozess ist **zyklisch, kein Fließband**: jeder Schritt kann bei neuen Widersprüchen oder Stagnation zu einem früheren Schritt zurückspringen. Das ist Absicht (siehe "Feedback" im Original-Vision-Dokument), keine Fehlerbehandlung.

## 1. Collector

Input: Nutzerauftrag + eventuelles Referenzmaterial (Notizen, Bilder-Beschreibungen, bestehende Textfragmente).
Output: erste Semantic-Object-Dateien (Typ meist `concept`, `image`, oder `question`) gemäß [semantic-object-schema.md](semantic-object-schema.md).
Ausführung: kann direkt vom Hauptthread erledigt werden (kein zwingender Subagent-Call), wenn der Input kurz ist; bei umfangreichem Material lohnt ein `Agent`-Aufruf mit der Collector-Persona.

## 2. Divergent Expansion

**Ein `Agent`-Aufruf pro Rolle in derselben Nachricht** (echter Parallel-Fan-out, keine Sequenz): Dreamer, Questioner, Character Finder, World Builder. Jeder Aufruf bekommt:
- die Persona-Instruktion aus `references/agents/<rolle>.md`,
- den aktuellen Feld-Stand (Inhalt aller `field/objects/*.md`, oder bei großem Feld eine kompakte Zusammenfassung + die zuletzt geänderten Objekte),
- die explizite Anweisung, NICHT selbst zu schreiben, sondern Vorschläge als strukturierten Text zurückzugeben.

Nach Rückkehr aller vier: Hauptthread committet jeden Vorschlag als neuen Abschnitt in die passende(n) Objektdatei(en), legt neue Objektdateien für neue Ideen an.

### Guardrail: Rundenlimit

Max. **3 Divergenzrunden** ohne expliziten Nutzerwunsch nach mehr. Danach zwingend Schritt 3 (Gardener) und Schritt 5 (Konvergenz-Checkpoint), bevor überhaupt erneut divergiert werden darf. Begründung: siehe philosophy.md, Goldilocks-Effekt / creativity-stability tradeoff — unbeschränkte Emergenz destabilisiert typischerweise mehr, als sie nützt.

## 3. Gardener

Ein Aufruf (sequenziell, kein Fan-out). Liest **alle** aktuellen Objekte, sucht Muster/Cluster, ergänzt `relations`-Einträge zwischen bestehenden Objekten (der "100 Beziehungen"-Schritt aus der Vision). Flaggt explizit erkannte Widersprüche (→ Feedback-Trigger).

## 4. Feedback-Trigger (Logik im Hauptthread, kein eigener Agent-Aufruf für die Entscheidung selbst)

Nach jedem Gardener- oder Resonance-Pass prüfst du folgende Bedingungen und aktivierst bei Zutreffen die passende getriggerte Rolle:

| Bedingung | Rolle | Datei |
|---|---|---|
| Gardener oder Resonance flaggt einen Widerspruch zwischen Objekten | Contradiction Agent | `agents/triggered/contradiction-agent.md` |
| Neuheit/Überraschung (Resonance-Einschätzung) ist gegenüber der Vorrunde gleich oder niedriger | Dreamer erneut + optional Mutation Agent oder Entropy Agent | `agents/dreamer.md`, `agents/triggered/mutation-agent.md`, `agents/triggered/entropy-agent.md` |
| Eine offene Frage wird vom Explorer oder Nutzer vorschnell "beantwortet"/geschlossen, obwohl sie noch trägt | Silence Agent | `agents/triggered/silence-agent.md` |
| Feld wirkt symbolisch/emotional flach (wenige/keine Symbole, geringe emotionale Energie über mehrere Objekte) | Symbol Agent | `agents/triggered/symbol-agent.md` |
| Feld wirkt zu Rundenbeginn insgesamt reizarm (wenig Neues seit 2 Runden) | Curiosity Engine | `agents/triggered/curiosity-engine.md` |

Nach jedem Trigger: zurück zu Schritt 2 oder 3 mit genau der ausgelösten Rolle (nicht das ganze Ensemble erneut), dann Feedback-Check erneut prüfen. Getriggerte Rollen sind bewusst **nicht** Teil jeder Runde — das hält den Prozess wartbar und mildert das Instabilitätsrisiko aus der Forschung zusätzlich.

## 5. Konvergenz-Checkpoint

**Resonance** bewertet die 8 Qualitätsmetriken aus dem Vision-Dokument — Neuheit, Überraschung, Emergenz, innere Kohärenz, symbolische Dichte, emotionale Resonanz, Eigenständigkeit der Figuren, Wiederlesewert — jeweils kurz qualitativ (z. B. "Hoch/Mittel/Niedrig + ein Satz Begründung"), **keine erfundene Zahl**.

Ist das Ergebnis über die meisten Dimensionen solide UND es gibt mindestens einen erkennbaren emergenten Kern (eine Beziehung/ein Bild, das mehr ist als die Summe der Einzelobjekte), schlägst du dem Nutzer die Konvergenz vor. Der Nutzer kann trotzdem auf weiterer Divergenz bestehen (Guardrail in Schritt 2 gilt dann als "explizit gewünscht").

## 6. Explorer

Schreibt **schrittweise** (nicht in einem Rutsch) einen Entwurf, der sich am Feld orientiert — zitiert/verweist auf konkrete Semantic Objects statt sie zu ignorieren. Trifft der Explorer beim Schreiben auf einen Widerspruch, der im Feld noch nicht aufgelöst ist, bricht er ab und meldet das zurück an den Hauptthread → Schritt 4.

## 7. Resonance + Distiller

**Reihenfolge ist wichtig:** erst Resonance, dann Distiller — nie umgekehrt.

- **Resonance** prüft zuerst "Lebendigkeit": wirken Figuren/Ideen eigenständig, oder tun sie nur das, was der Entwurf von ihnen will? (Siehe Ende-Zitat in philosophy.md.) Wirkt etwas flach, zurück zum Character Finder oder World Builder (Schritt 2/3), NICHT direkt zu Distiller.
- **Distiller** poliert Sprache/Struktur — aber erst, nachdem Resonance grünes Licht für "Lebendigkeit" gegeben hat. Distiller optimiert nie auf Kosten der von Resonance geprüften Eigenständigkeit.

## 8. Narrative Compiler

Frag den Nutzer nach der Zielform, falls nicht vorgegeben: Roman/Kurzgeschichte, wissenschaftlicher Artikel, Vorlesung, LiaScript-Kurs, Podcast-Skript, Video-Skript, Präsentation. Kompiliere aus **demselben** Bedeutungsraum (nicht aus dem Explorer-Rohtext allein) in die Zielform. Schreibe das Ergebnis nach `.ecp/<slug>/output/<form>.md` (oder passendes Format). Aktualisiere danach die Cognitive-Field-Map und rendere ggf. das kompilierte Werk als Artifact (siehe [field-map-artifact.md](field-map-artifact.md)).

Der Bedeutungsraum bleibt nach der Kompilierung erhalten — eine zweite Projektion (z. B. zusätzlich ein LiaScript-Kurs neben dem Roman) ist jederzeit möglich, ohne den Prozess neu zu durchlaufen.

## Protokollierung

Nach jeder Phase/jedem Trigger einen kurzen Eintrag an `field/log.md` anhängen: Datum, Phase/Rolle, Kurzfassung was committet wurde, ggf. ausgelöster Trigger und Grund. Das macht den Zyklus für den Nutzer nachvollziehbar und ist die Grundlage für die Verifikation (Stagnations-Vergleich in Schritt 4 braucht die Vorrunden-Werte aus dem Log).
