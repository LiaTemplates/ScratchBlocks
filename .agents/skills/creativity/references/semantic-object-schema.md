# Semantic-Object-Schema & Versionierungsregel

Jedes Semantic Object aus der Vision (`ECP_Idee_und_Vision.md`, Abschnitt "Semantic Objects") ist eine eigene Datei unter `.ecp/<slug>/field/objects/<id>.md`. `<id>` ist ein kurzer, stabiler kebab-case-Slug (z. B. `bastian-zweifel`, `symbol-vergessener-name`), der über die gesamte Sitzung unverändert bleibt.

## Frontmatter

```markdown
---
id: <kebab-case-id>
type: character | image | rule | question | conflict | symbol | concept
created: <Runde/Datum der Ersterstellung>
relations:
  - target: <andere-id>
    kind: <z.B. "spiegelt", "widerspricht", "entwickelt sich aus", "bedroht">
novelty: hoch | mittel | niedrig
emotional_energy: hoch | mittel | niedrig
open_questions:
  - <offene Frage im Zusammenhang mit diesem Objekt>
contradictions:
  - <benannter Widerspruch, falls vorhanden — nicht auflösen, nur festhalten>
origin: <welche Rolle/Runde hat dieses Objekt erzeugt>
---
```

Felder dürfen leer/fehlend sein (z. B. `contradictions: []`), aber das Schema selbst bleibt bei jedem Objekt gleich, damit Gardener/Resonance zuverlässig darüber iterieren können.

## Body: Append-only-Regel

**Bestehender Text wird nie gelöscht oder überschrieben.** Jede Runde, die dieses Objekt verändert, fügt unten einen neuen Abschnitt an:

```markdown
## Runde <N> — <Rolle> — <Datum>

<was diese Rolle zu diesem Objekt beigetragen/verändert/hinzugefügt hat>
```

Widersprüchliche spätere Erkenntnisse werden **nicht** durch Löschen des alten Textes aufgelöst — stattdessen wird der Widerspruch im Frontmatter unter `contradictions` benannt und ein neuer Abschnitt beschreibt die neue Sicht. Das erhält die Entwicklungsgeschichte des Objekts (Herkunft/Entwicklung sind laut Vision-Dokument selbst Teil der Objektidentität) und erlaubt es, spätere Entscheidungen nachvollziehbar auf konkrete Artefakt-Versionen zu verweisen ("Alle späteren Entscheidungen müssen auf Artefakte verweisen" — Original-Dokument, Abschnitt "Artefakte").

## Beziehungen (`relations`)

Beziehungen werden **auf beiden beteiligten Objekten** eingetragen (nicht nur einseitig), damit ein reiner Dateiscan über `field/objects/` genügt, um den vollständigen Beziehungsgraphen für die Cognitive-Field-Map zu rekonstruieren (siehe [field-map-artifact.md](field-map-artifact.md)).

## Wer schreibt

Nur der orchestrierende Hauptthread schreibt/ändert Objektdateien (siehe SKILL.md, "Grundregel"). Subagenten liefern ihre Vorschläge als Text zurück; der Hauptthread entscheidet, ob ein Vorschlag ein neues Objekt anlegt oder einen Abschnitt an ein bestehendes Objekt anhängt.
