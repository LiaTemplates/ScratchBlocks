<!--
author:   André Dietrich
email:    LiaScript@web.de
version:  0.1.0
language: de
narrator: Deutsch Female
comment:  Echtes Scratch 3 in LiaScript: Blöcke und Bühne überlagern den
          Code-Editor, das Projekt bleibt Text im Codeblock – mit ▶, ⏹ und
          LiaScripts Versionsgeschichte. Mit Profilen für Klasse 1 bis 13 und
          automatisch geprüften Aufgaben.

script:   dist/index.js

attribute: [Scratch](https://scratch.mit.edu) (scratch-vm, scratch-render,
           scratch-storage) by the Scratch Foundation is licensed under
           [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)

attribute: [scratch-blocks](https://github.com/scratchfoundation/scratch-blocks)
           by the Scratch Foundation is licensed under
           [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)

attribute: [scratchblocks](https://github.com/scratchblocks/scratchblocks)
           by Tim Radvan is licensed under
           [MIT](https://opensource.org/licenses/MIT)

@Scratch:        @Scratch._run(@uid,stufe4)
@Scratch.stufe1: @Scratch._run(@uid,stufe1)
@Scratch.stufe2: @Scratch._run(@uid,stufe2)
@Scratch.stufe3: @Scratch._run(@uid,stufe3)
@Scratch.stufe4: @Scratch._run(@uid,stufe4)
@Scratch.profil: @Scratch._run(@uid,@0)

@Scratch.check:  @Scratch._check(@uid,@0)

@Scratch._run
<script>
window.LiaScratch.run("@0", send, "@'input", "@1")
</script>

<lia-scratch id="@0" profile="@1"></lia-scratch>
@end

@Scratch._check
<script>
window.LiaScratch.check("@0", send, "@'input(0)", "@1", async function (api) {
  const { lauf, erwarte, figur, buehne, bloecke, run, expect, sprite, stage, blocks } = api
@input(1)
})
</script>

<lia-scratch id="@0" profile="@1"></lia-scratch>
@end
-->

# Scratch

    --{{0}}--
Mit diesem Template wird aus einem LiaScript-Codeblock ein echtes Scratch-3-Projekt.

Hänge `@Scratch` an einen Codeblock – und statt des Texteditors erscheinen
Blöcke und Bühne von Scratch:

* **▶** startet das Projekt (wie die grüne Flagge), **⏹** hält es an.
* Jeder Start mit Änderungen legt eine **neue Version** an. Mit den Pfeilen
  unter dem Projekt springst du zwischen deinen Versionen hin und her.
* Das Projekt selbst bleibt **Text im Codeblock** – lesbar, von Lehrkräften
  direkt schreibbar und auch ohne Scratch verständlich.

``` scratch
Wenn die grüne Flagge angeklickt
wiederhole (4) mal
  gehe (80) er Schritt
  drehe dich nach rechts um (90) Grad
  warte (0.5) Sekunden
Ende
```
@Scratch

> Scratch ist ein Projekt der Scratch Foundation, in Zusammenarbeit mit der
> Lifelong Kindergarten Group am MIT Media Lab. Dieses Template ist kein
> offizielles Scratch-Produkt; es nutzt die frei lizenzierten Scratch-Bausteine.

## Einbinden

Um das Template in einem eigenen Kurs zu nutzen, füge eine der folgenden
Zeilen in den Kopf deines Kurses ein.

Feste Version (empfohlen, ändert sich nicht mehr):

`import: https://raw.githubusercontent.com/LiaTemplates/Scratch/0.1.0/README.md`

Neueste Version (kann sich jederzeit ändern):

`import: https://raw.githubusercontent.com/LiaTemplates/Scratch/main/README.md`

Danach genügt ein Codeblock mit einem der Makros:

| Makro            | für            | Blöcke                                                         |
| ---------------- | -------------- | -------------------------------------------------------------- |
| `@Scratch.stufe1` | Klasse 1–2     | 8 große Blöcke, eine Figur, Vorlesen                           |
| `@Scratch.stufe2` | Klasse 3–4     | Ereignisse, Bewegung, Aussehen, Klang, einfache Steuerung      |
| `@Scratch.stufe3` | Klasse 5–7     | alles außer Listen, eigenen Blöcken und Klonen; mehrere Figuren |
| `@Scratch.stufe4` | ab Klasse 8    | voller Scratch-Umfang, sb3-Import/-Export                      |
| `@Scratch`        | = `stufe4`     |                                                                |
| `@Scratch.profil(name)` | eigenes Profil | siehe [Eigene Profile](#eigene-profile)                 |
| `@Scratch.check(stufe)` | Aufgaben   | Projekt + versteckte Prüfung, siehe [Aufgaben mit Prüfung](#aufgaben-mit-prüfung) |

## So funktioniert es

    --{{0}}--
Die Scratch-Oberfläche liegt über dem Codeblock. Gespeichert wird aber immer
der Text im Codeblock.

1. **Blöcke ziehen** – jede Änderung wird sofort als Text in den Codeblock
   geschrieben. Über den Knopf **Text** (ab Stufe 3) kannst du ihn ansehen.
2. **▶ drücken** – das Projekt startet. Alle Figuren beginnen dabei an ihrer
   **Startposition**; so läuft ein Programm bei jedem Start gleich ab.
3. **Startposition ändern** – ziehe eine Figur auf der Bühne an eine andere
   Stelle, solange das Projekt nicht läuft.
4. **Versionen** – mit ◀ und ▶ unter dem Projekt holst du frühere Versionen
   zurück. Blöcke und Bühne springen mit.

Wenn der Codeblock leer ist, beginnt das Projekt mit einer weißen Bühne und
der Figur _Robo_.

``` scratch
```
@Scratch

## Jahrgangsstufen

    --{{0}}--
Für jede Altersstufe gibt es ein eigenes Profil. Es legt fest, welche Blöcke
angeboten werden und wie groß sie sind.

Die Profile bauen aufeinander auf. Ein Projekt aus Stufe 1 läuft also auch in
Stufe 4 – nur mit mehr Blöcken zur Auswahl.

### Stufe 1 – Klasse 1 und 2

Wenige, große Blöcke und eine einzige Figur. Tippe auf einen Block in der
Leiste, um ihn vorlesen zu lassen.

**Aufgabe:** Lass Robo ein Quadrat laufen.

``` scratch
Wenn die grüne Flagge angeklickt
gehe (80) er Schritt
drehe dich nach rechts um (90) Grad
```
@Scratch.stufe1

### Stufe 2 – Klasse 3 und 4

Dazu kommen Tasten und Mausklicks, fortlaufende Wiederholungen, einfache
Bedingungen und Klänge.

**Aufgabe:** Steuere Robo mit den Pfeiltasten. Klicke dafür zuerst auf die
Bühne.

``` scratch
Wenn Taste [Pfeil nach rechts v] gedrückt wird
ändere x um (10)

Wenn Taste [Pfeil nach links v] gedrückt wird
ändere x um (-10)
```
@Scratch.stufe2

### Stufe 3 – Klasse 5 bis 7

Variablen, Operatoren, Fühlen, Nachrichten und der Malstift. Es können mehrere
Figuren angelegt werden.

**Aufgabe:** Robo zeichnet ein Vieleck. Ändere die Anzahl der Ecken.

``` scratch
[Figur Robo]
Variablen: Ecken = 6

Wenn die grüne Flagge angeklickt
lösche alles
schalte Stift ein
wiederhole (Ecken) mal
  gehe (60) er Schritt
  drehe dich nach rechts um ((360) / (Ecken)) Grad
Ende
schalte Stift aus
```
@Scratch.stufe3

### Stufe 4 – ab Klasse 8

Der volle Umfang von Scratch mit Listen, eigenen Blöcken und Klonen. Projekte
lassen sich als `.sb3` laden und speichern.

``` scratch
[Figur Robo]
Listen: Wörter = Hallo, LiaScript, Scratch

Definiere sage alle Wörter
setze [i v] auf (1)
wiederhole (Länge von [Wörter v]) mal
  sage (Element (i) von [Wörter v]) für (1) Sekunden
  ändere [i v] um (1)
Ende

Wenn die grüne Flagge angeklickt
sage alle Wörter
```
@Scratch.stufe4

## Das Textformat

    --{{0}}--
Im Codeblock steht das Projekt in der Schreibweise von scratchblocks. Das ist
dieselbe Schreibweise, die auch im Scratch-Wiki und im Scratch-Forum benutzt
wird.

Ein Projekt besteht aus Abschnitten für die Bühne und für jede Figur. Jeder
Abschnitt beginnt mit einer Kopfzeile in eckigen Klammern, danach folgen
Eigenschaften und schließlich die Skripte. Skripte werden durch Leerzeilen
getrennt.

``` scratch
[Bühne]
Hintergründe: weiss
Variablen: Punkte = 0

Wenn die grüne Flagge angeklickt
setze [Punkte v] auf (0)

[Figur Robo]
Kostüme: robo-a, robo-b
Klänge: plopp
Position: -100, 0
Richtung: 90
Größe: 100

Wenn diese Figur angeklickt wird
ändere [Punkte v] um (1)
spiele Klang [plopp v]
wechsle zum nächsten Kostüm
```
@Scratch

| Eigenschaft     | Bedeutung                                        | Standard      |
| --------------- | ------------------------------------------------ | ------------- |
| `Kostüme:`      | Kostüme aus der [Bibliothek](#figuren-und-klänge) | `robo-a, robo-b` |
| `Hintergründe:` | Hintergründe der Bühne                           | `weiss`       |
| `Klänge:`       | Klänge aus der Bibliothek                        | `plopp`       |
| `Position:`     | Startposition `x, y`                             | `0, 0`        |
| `Richtung:`     | Startrichtung in Grad                            | `90`          |
| `Größe:`        | Größe in Prozent                                 | `100`         |
| `Sichtbar:`     | `ja` oder `nein`                                 | `ja`          |
| `Variablen:`    | `Name = Startwert`, durch Kommas getrennt        |               |
| `Listen:`       | `Name = Wert, Wert, …`                           |               |

Fehlen die Kopfzeilen, gehören alle Skripte zur Figur _Robo_ auf einer weißen
Bühne. Englische Schreibweise (`[Stage]`, `[Sprite Robo]`, `costumes:`,
`when green flag clicked` …) wird ebenfalls verstanden.

### Projekte als project.json

    --{{0}}--
Manche Projekte lassen sich nicht vollständig als Text schreiben, zum Beispiel
wenn sie eigene Bilder oder Aufnahmen enthalten.

Dann kann der Codeblock auch das `project.json` von Scratch enthalten. Ein
Projekt, das mit **sb3 laden** geöffnet wird, erscheint automatisch in dieser
Form; eigene Bilder und Klänge werden darin eingebettet.

``` json
{
  "targets": [
    {
      "isStage": true,
      "name": "Stage",
      "variables": {},
      "lists": {},
      "broadcasts": {},
      "blocks": {},
      "comments": {},
      "currentCostume": 0,
      "costumes": [{ "name": "weiss", "asset": "weiss" }],
      "sounds": [],
      "volume": 100,
      "layerOrder": 0,
      "tempo": 60,
      "videoTransparency": 50,
      "videoState": "on",
      "textToSpeechLanguage": null
    },
    {
      "isStage": false,
      "name": "Robo",
      "variables": {},
      "lists": {},
      "broadcasts": {},
      "blocks": {
        "a": {"opcode":"event_whenflagclicked","next":"b","parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0},
        "b": {"opcode":"looks_sayforsecs","next":null,"parent":"a","inputs":{"MESSAGE":[1,[10,"Hallo!"]],"SECS":[1,[4,"2"]]},"fields":{},"shadow":false,"topLevel":false}
      },
      "comments": {},
      "currentCostume": 0,
      "costumes": [{ "name": "robo-a", "asset": "robo-a" }, { "name": "robo-b", "asset": "robo-b" }],
      "sounds": [{ "name": "plopp", "asset": "plopp" }],
      "volume": 100,
      "layerOrder": 1,
      "visible": true,
      "x": 0,
      "y": 0,
      "size": 100,
      "direction": 90,
      "draggable": false,
      "rotationStyle": "all around"
    }
  ],
  "monitors": [],
  "extensions": []
}
```
@Scratch

## Aufgaben mit Prüfung

    --{{0}}--
Eine Aufgabe besteht aus zwei Codeblöcken direkt untereinander: dem
Scratch-Projekt und einer versteckten Prüfung in JavaScript.

Die Prüfung beginnt mit einem Minus vor dem Dateinamen (`-Prüfung`), damit sie
zugeklappt bleibt. Beim Drücken von ▶ läuft zuerst das Projekt, danach die
Prüfung. Das Ergebnis erscheint unter dem Projekt.

**Aufgabe:** Robo soll mindestens 150 Schritte nach rechts laufen und dafür
eine Wiederholung benutzen – mit höchstens 4 Blöcken.

``` scratch
Wenn die grüne Flagge angeklickt
gehe (10) er Schritt
```
``` js -Prüfung
await lauf(3)

erwarte(figur("Robo").x >= 150, "Robo soll mindestens 150 Schritte nach rechts laufen.")
erwarte(bloecke.nutzt("control_repeat"), "Benutze eine Wiederholung.")
erwarte(bloecke.anzahl() <= 4, "Schaffst du es mit höchstens 4 Blöcken?")
```
@Scratch.check(stufe1)

Diese Befehle stehen in der Prüfung zur Verfügung (englisch in Klammern):

| Befehl                          | Bedeutung                                                     |
| ------------------------------- | ------------------------------------------------------------- |
| `await lauf(s)` (`run`)         | startet das Projekt und wartet höchstens `s` Sekunden          |
| `erwarte(bedingung, text)` (`expect`) | meldet `text`, wenn die Bedingung nicht erfüllt ist     |
| `figur(name)` (`sprite`)        | Zustand einer Figur: `x`, `y`, `richtung`, `größe`, `kostüm`, `sichtbar`, `sagt`, `variable(name)` |
| `buehne` (`stage`)              | Zustand der Bühne: `hintergrund`, `variable(name)`, `liste(name)` |
| `bloecke.anzahl()` (`blocks.count()`) | Anzahl der Blöcke im Projekt                            |
| `bloecke.nutzt(opcode)` (`blocks.uses()`) | benutzt das Projekt diesen Block?                   |

Die Namen der Blöcke (`control_repeat`, `motion_movesteps` …) findest du im
[Scratch-Wiki](https://en.scratch-wiki.info/wiki/List_of_Block_Opcodes).

## Eigene Profile

    --{{0}}--
Reichen die vier Stufen nicht aus, kannst du im Kopf deines Kurses eigene
Profile anlegen.

Ein Profil erweitert eine der Stufen. Die Liste `blocks` legt fest, welche
Blöcke erlaubt sind; mit `maxBlocks` begrenzt du die Anzahl der Blöcke.

``` html
<!--
import: https://raw.githubusercontent.com/LiaTemplates/Scratch/0.1.0/README.md

@onload
window.LiaScratch.defineProfile("labyrinth", {
  base: "stufe1",
  blocks: ["event_whenflagclicked", "motion_movesteps", "motion_turnright"],
  maxBlocks: 5
})
@end
-->
```

Verwendet wird es mit `@Scratch.profil(labyrinth)`.

| Option       | Bedeutung                                          |
| ------------ | -------------------------------------------------- |
| `base`       | Stufe, auf der das Profil aufbaut                  |
| `blocks`     | erlaubte Blöcke (Opcodes) oder `"all"`             |
| `exclude`    | Blöcke, die entfernt werden                        |
| `zoom`       | Größe der Blöcke (Stufe 1: `1.1`, Stufe 4: `0.675`) |
| `sprites`    | dürfen Figuren hinzugefügt werden?                 |
| `textView`   | Knopf **Text** anzeigen                            |
| `sb3`        | Knöpfe zum Laden und Speichern von `.sb3`          |
| `speech`     | Blöcke vorlesen                                    |
| `maxBlocks`  | höchstens so viele Blöcke (`0` = unbegrenzt)       |
| `resetOnRun` | Figuren bei ▶ an die Startposition setzen          |

## Figuren und Klänge

    --{{0}}--
Alle Figuren, Hintergründe und Klänge sind im Template enthalten. Sie
funktionieren deshalb auch ohne Internet.

| Name     | Art         |
| -------- | ----------- |
| `robo-a` | Kostüm      |
| `robo-b` | Kostüm      |
| `weiss`  | Hintergrund |
| `plopp`  | Klang       |
| `piep`   | Klang       |

Alle sind eigens für dieses Template erstellt und gemeinfrei
([CC0](https://creativecommons.org/publicdomain/zero/1.0/)). Die
Scratch-Katze wird bewusst nicht verwendet, sie ist eine Marke der Scratch
Foundation.

## Implementierung

Das Template ist ein npm-Projekt. Der Quelltext liegt in `src/`, Parcel bündelt
ihn nach `dist/index.js`.

``` bash
npm install        # Abhängigkeiten installieren (patcht scratch-vm für Parcel)
npm run build      # dist/index.js erzeugen
npm test           # Tests für das Textformat (alle Blöcke, de + en)
npm run typecheck  # TypeScript prüfen
npm run gen:specs  # src/format/specs.json neu erzeugen (nach Updates von scratch-blocks)
npm run serve      # diesen Kurs lokal mit Live-Reload öffnen
```

Aufbau von `src/`:

| Datei                   | Aufgabe                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `element.ts`            | `<lia-scratch>`: Oberfläche, ▶/⏹, Synchronisation                      |
| `bridge.ts`             | Verbindung zum LiaScript-Codeblock (ACE lesen, schreiben, beobachten) |
| `project.ts`            | Text ⇄ VM, Startzustand der Figuren                                   |
| `format/scratchtext.ts` | lesbares Textformat (scratchblocks-Syntax)                            |
| `format/json.ts`        | kompaktes `project.json`                                              |
| `format/specs.json`     | aus scratch-blocks erzeugte Tabelle aller Blöcke und Menüs            |
| `workspace.ts`          | scratch-blocks-Arbeitsfläche, Toolbox je Profil                       |
| `stage.ts`              | Bühne: Maus, Tastatur, Figuren ziehen, „frage und warte“              |
| `profiles.ts`           | Stufen 1–4 und eigene Profile                                         |
| `check.ts`              | Befehle für Prüfungen                                                 |
| `dom-guard.ts`          | hält fremde Knoten aus `<body>` fern (siehe unten)                    |
| `vendor/scratch-gui/`   | Verbindungscode aus scratch-gui 15.1.1 (AGPL-3.0)                     |

Hinweise:

* LiaScript verwaltet die Kinder von `<body>` über ihren Index. Blockly,
  scratch-render-fonts und scratch-vm hängen dort eigene Knoten an, was
  LiaScripts Darstellung zerstört. `dom-guard.ts` verschiebt sie sofort nach
  `<head>` bzw. in einen Container neben `<body>`.
* Die Symbole der Blöcke (grüne Flagge, Pfeile) lädt scratch-blocks per URL.
  Standard ist die feste Version auf jsDelivr. Für den Offline-Einsatz kann
  `window.LiaScratchMedia` im `@onload` auf eine eigene Kopie des Ordners
  `node_modules/scratch-blocks/media/` zeigen.
* `dist/index.js` ist etwa 10 MB groß (4 MB komprimiert), davon entfallen
  knapp 3 MB auf scratch-vm.

Die Makros im Kopf dieser Datei:

``` html
@Scratch:        @Scratch._run(@uid,stufe4)
@Scratch.stufe1: @Scratch._run(@uid,stufe1)
@Scratch.stufe2: @Scratch._run(@uid,stufe2)
@Scratch.stufe3: @Scratch._run(@uid,stufe3)
@Scratch.stufe4: @Scratch._run(@uid,stufe4)
@Scratch.profil: @Scratch._run(@uid,@0)

@Scratch.check:  @Scratch._check(@uid,@0)

@Scratch._run
<script>
window.LiaScratch.run("@0", send, "@'input", "@1")
</script>

<lia-scratch id="@0" profile="@1"></lia-scratch>
@end

@Scratch._check
<script>
window.LiaScratch.check("@0", send, "@'input(0)", "@1", async function (api) {
  const { lauf, erwarte, figur, buehne, bloecke, run, expect, sprite, stage, blocks } = api
@input(1)
})
</script>

<lia-scratch id="@0" profile="@1"></lia-scratch>
@end
```

Das Element `<lia-scratch>` sucht sich den Codeblock direkt davor, blendet
dessen Editor aus und hält Blöcke, Bühne und Text synchron. Neue Versionen
legt LiaScript selbst an, sobald ▶ gedrückt wird.

Lizenz: [AGPL-3.0](LICENSE). Kurse, die dieses Template einbinden, können
beliebig lizenziert werden.
