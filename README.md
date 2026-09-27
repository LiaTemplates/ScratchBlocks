<!--
author:   André Dietrich
email:    LiaScript@web.de
version:  0.2.0
edit:     true
language: en
narrator: US English Female
comment:  Real Scratch 3 in LiaScript: blocks and stage overlay the code editor,
          while the project stays text in the code block – with ▶, ⏹ and
          LiaScript's version history. In all languages Scratch supports, with
          profiles for grades 1 to 13 and automatically checked tasks.

script:   dist/index.js

attribute: [Scratch](https://scratch.mit.edu) (scratch-vm, scratch-render,
           scratch-storage, scratch-l10n) by the Scratch Foundation is licensed
           under [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)

attribute: [scratch-blocks](https://github.com/scratchfoundation/scratch-blocks)
           by the Scratch Foundation is licensed under
           [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)

attribute: [scratchblocks](https://github.com/scratchblocks/scratchblocks)
           by Tim Radvan is licensed under
           [MIT](https://opensource.org/licenses/MIT)

@Scratch:         @Scratch._run(@uid,level4)
@Scratch.level1:  @Scratch._run(@uid,level1)
@Scratch.level2:  @Scratch._run(@uid,level2)
@Scratch.level3:  @Scratch._run(@uid,level3)
@Scratch.level4:  @Scratch._run(@uid,level4)
@Scratch.profile: @Scratch._run(@uid,@0)

@Scratch.stufe1:  @Scratch._run(@uid,level1)
@Scratch.stufe2:  @Scratch._run(@uid,level2)
@Scratch.stufe3:  @Scratch._run(@uid,level3)
@Scratch.stufe4:  @Scratch._run(@uid,level4)
@Scratch.profil:  @Scratch._run(@uid,@0)

@Scratch.check:   @Scratch._check(@uid,@0)

@Scratch.blocks:  @Scratch._blocks(@uid,```@0```)
@Scratch.bloecke: @Scratch._blocks(@uid,```@0```)

@Scratch._run
<script>
window.LiaScratch.run("@0", send, "@'input", "@1")
</script>

<lia-scratch id="@0" profile="@1"></lia-scratch>
@end

@Scratch._blocks
<script run-once="true" modify="false" style="display:block">
(function draw (tries) {
  if (window.LiaScratch) {
    send.lia("HTML: " + window.LiaScratch.blocks(`@1`))
    send.lia("LIA: stop")
  } else if (tries < 200) {
    setTimeout(() => draw(tries + 1), 50)
  }
})(0)
"LIA: wait"
</script>
@end

@Scratch._check
<script>
window.LiaScratch.check("@0", send, "@'input(0)", "@1", async function (api) {
  const { run, expect, sprite, stage, blocks, lauf, erwarte, figur, buehne, bloecke } = api
@input(1)
})
</script>

<lia-scratch id="@0" profile="@1"></lia-scratch>
@end
-->

# ScratchBlocks

    --{{0}}--
This template turns a LiaScript code block into a real Scratch 3 project.

Attach `@Scratch` to a code block – and instead of the text editor you get the
blocks and the stage of Scratch:

* **▶** starts the project (like the green flag), **⏹** stops it.
* Every start with changes creates a **new version**. Use the arrows below the
  project to go back and forth between your versions.
* The project itself stays **text in the code block** – readable, easy to
  write for teachers, and understandable even without Scratch.
* Blocks, menus and texts follow the **language of the course** – in all
  languages Scratch supports.

``` scratch
when green flag clicked
repeat (4)
  move (80) steps
  turn right (90) degrees
  wait (0.5) seconds
end
```
@Scratch

> Scratch is a project of the Scratch Foundation, in collaboration with the
> Lifelong Kindergarten Group at the MIT Media Lab. This template is not an
> official Scratch product; it uses the freely licensed Scratch components.

## Import

To use the template in your own course, add one of the following lines to the
header of your course.

Fixed version (recommended, will not change anymore):

`import: https://raw.githubusercontent.com/LiaTemplates/ScratchBlocks/0.2.0/README.md`

Latest version (may change at any time):

`import: https://raw.githubusercontent.com/LiaTemplates/ScratchBlocks/main/README.md`

Then attach one of the macros to a code block:

| Macro                    | for          | Blocks                                                           |
| ------------------------ | ------------ | ---------------------------------------------------------------- |
| `@Scratch.level1`        | grades 1–2   | 8 large blocks, one sprite, read aloud                           |
| `@Scratch.level2`        | grades 3–4   | events, motion, looks, sound, simple control                     |
| `@Scratch.level3`        | grades 5–7   | everything except lists, custom blocks and clones; many sprites  |
| `@Scratch.level4`        | grade 8 on   | all of Scratch, sb3 import and export                            |
| `@Scratch`               | = `level4`   |                                                                  |
| `@Scratch.profile(name)` | own profile  | see [Custom profiles](#custom-profiles)                          |
| `@Scratch.check(level)`  | tasks        | project + hidden check, see [Tasks with checks](#tasks-with-checks) |

The German names `@Scratch.stufe1` … `@Scratch.stufe4` and
`@Scratch.profil(name)` work as well.

In the `@onload` of your course you can also register your own profiles
(`window.LiaScratch.defineProfile`, see [Custom profiles](#custom-profiles))
and your own costumes, backdrops, sounds and sprites
(`window.LiaScratch.defineAsset` and `defineSprite`, see
[Own sprites, backdrops and sounds](#own-sprites-backdrops-and-sounds)).

## How it works

    --{{0}}--
The Scratch interface lies on top of the code block. What is stored, however,
is always the text in the code block.

1. **Drag blocks** – every change is written into the code block right away.
   With the **Text** button (from level 3 on) you can look at it.
2. **Press ▶** – the project starts. All sprites begin at their **start
   position**, so a program runs the same way every time.
3. **Change the start position** – drag a sprite to another place on the stage
   while the project is not running.
4. **Versions** – with ◀ and ▶ below the project you get earlier versions
   back. Blocks and stage follow along.

If the code block is empty, the project starts with a white stage and the
sprite _Robo_.

When a project opens, the blocks of _Robo_ are shown. Without a sprite
_Robo_, the first sprite with scripts is shown, otherwise the front-most
sprite. A click on a sprite below the stage shows its blocks.

``` scratch
```
@Scratch

### Working together in a classroom

    --{{0}}--
In a LiaScript classroom, several students can build one project together.

Switch the code block to the **collaborative editor** (the classroom button
below the project). From then on everyone works on the same project:

* Every change in the blocks is sent like typing – only the part that changed.
  Two students can work on different scripts or sprites at the same time;
  both changes are kept.
* If both change the very same value at the same moment, all participants
  still end up with the same project, but the value may be a mix of both.
* Changes of others appear right away – except while you are dragging a
  block or a sprite, editing a field, or while the project is running. Then
  they follow as soon as you are done.

This works best with the [text format](#the-text-format). A project stored as
`project.json` is synchronized as well, but changes made at the same time can
break the JSON; the last working project then stays loaded.

## Levels

    --{{0}}--
There is a profile for every age group. It defines which blocks are offered
and how large they are.

The profiles build on each other: a project from level 1 also runs in level 4,
just with more blocks to choose from.

### Level 1 – grades 1 and 2

Few, large blocks and a single sprite. Tap a block in the palette to hear it
read aloud.

**Task:** Let Robo walk a square.

``` scratch
when green flag clicked
move (80) steps
turn right (90) degrees
```
@Scratch.level1

### Level 2 – grades 3 and 4

Adds keys and mouse clicks, forever loops, simple conditions and sounds.

**Task:** Steer Robo with the arrow keys. Click on the stage first.

``` scratch
when [right arrow v] key pressed
change x by (10)

when [left arrow v] key pressed
change x by (-10)
```
@Scratch.level2

### Level 3 – grades 5 to 7

Variables, operators, sensing, broadcasts and the pen. More sprites can be
added.

**Task:** Robo draws a polygon. Change the number of corners.

``` scratch
[Sprite Robo]
variables: corners = 6

when green flag clicked
erase all
pen down
repeat (corners)
  move (60) steps
  turn right ((360) / (corners)) degrees
end
pen up
```
@Scratch.level3

### Level 4 – grade 8 on

All of Scratch with lists, custom blocks and clones. Projects can be loaded
and saved as `.sb3`.

``` scratch
[Sprite Robo]
lists: words = Hello, LiaScript, Scratch

define say all words
set [i v] to (1)
repeat (length of [words v])
  say (item (i) of [words v]) for (1) seconds
  change [i v] by (1)
end

when green flag clicked
say all words
```
@Scratch.level4

## Languages

    --{{0}}--
The template speaks the language of your course: set `language:` in the
header of your course, and blocks, menus, buttons and the text in the code
block follow.

All 80 languages Scratch supports are available, for example `de`, `fr`,
`es`, `et`, `ar`, `ja` or `zh-cn`. English is the default and is always
understood in the text as well, so you can write English text in any course.

The same program in a course with `language: de` and with `language: et`:

``` text
Wenn die grüne Flagge angeklickt        kui klõpsata ⚑
wiederhole (4) mal                      korda (4) korda
  gehe (80) er Schritt                    liigu (80) punkti
Ende                                    end
```

* Section headers and properties use Scratch's own words for _Stage_,
  _Sprite_, _costumes_, _sounds_ … in that language; where Scratch has no
  translation, the English word is used. `x:` and `y:` are the same in all
  languages.
* Where a block would be ambiguous in a language (e.g. the green flag without
  a readable spelling), it is written with its symbol (⚑ ↻ ↺) or in English.
* If the page is translated, e.g. with _Translate with Google_ in LiaScript's
  settings, blocks, menus and buttons switch to the new language right away,
  using Scratch's own translations (the Scratch interface is excluded from the
  machine translation). The text in the code block stays in the language of
  the course, so stored projects and their versions do not change; text in
  the display language is understood as well.
* Button texts, dialogs and pen blocks come from Scratch's own translations.
  The few texts of this template itself (e.g. the result of a check) exist in
  English and German; other languages show them in English.

## The text format

    --{{0}}--
The code block contains the project in scratchblocks notation – the same
notation that is used in the Scratch Wiki and the Scratch forums.

A project consists of sections for the stage and for every sprite. Each
section starts with a header in square brackets, followed by properties and
finally the scripts. Scripts are separated by empty lines.

``` scratch
[Stage]
backdrops: white
variables: score = 0

when green flag clicked
set [score v] to (0)

[Sprite Robo]
costumes: robo-a, robo-b
sounds: pop
x: -100
direction: 90
size: 100

when this sprite clicked
change [score v] by (1)
play sound [pop v]
next costume
```
@Scratch

| Property      | Meaning                                                     | Default          |
| ------------- | ----------------------------------------------------------- | ---------------- |
| `costumes:`   | costumes from the [library](#sprites-and-sounds) or [your own](#own-sprites-backdrops-and-sounds); a `*` marks the current one, e.g. `robo-a, robo-b*` | `robo-a, robo-b` |
| `backdrops:`  | backdrops of the stage, `*` marks the current one            | `white`          |
| `sounds:`     | sounds from the library                                     | `pop`            |
| `x:`, `y:`    | start position                                              | `0`              |
| `direction:`  | start direction in degrees                                  | `90`             |
| `size:`       | size in percent                                             | `100`            |
| `visible:`    | `yes` or `no`                                               | `yes`            |
| `draggable:`  | can the sprite be dragged while the project runs?           | `no`             |
| `variables:`  | `name = start value`, separated by commas                   |                  |
| `lists:`      | `name = value, value, …`, several lists separated by `;`    |                  |
| `monitors:`   | variables and lists shown on the stage                      |                  |

Without headers, all scripts belong to the sprite _Robo_ on a white stage.

### Projects as project.json

    --{{0}}--
Some projects cannot be written completely as text, for example when they
contain their own images or recordings.

In that case the code block can also contain Scratch's `project.json`. A
project opened with **Load sb3** automatically appears in this form; its own
images and sounds are embedded.

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
      "costumes": [{ "name": "white", "asset": "white" }],
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
        "b": {"opcode":"looks_sayforsecs","next":null,"parent":"a","inputs":{"MESSAGE":[1,[10,"Hello!"]],"SECS":[1,[4,"2"]]},"fields":{},"shadow":false,"topLevel":false}
      },
      "comments": {},
      "currentCostume": 0,
      "costumes": [{ "name": "robo-a", "asset": "robo-a" }, { "name": "robo-b", "asset": "robo-b" }],
      "sounds": [{ "name": "pop", "asset": "pop" }],
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

## Pictures of blocks

    --{{0}}--
Sometimes you only want to show blocks, for example in a hint or next to an
explanation. `@Scratch.blocks` draws them as a picture, without an editor and
without a stage. The blocks are written in the same notation and appear in the
language of the course.

```` markdown
``` scratch @Scratch.blocks
when green flag clicked
repeat (10)
  move (25) steps
end
```
````

``` scratch @Scratch.blocks
when green flag clicked
repeat (10)
  move (25) steps
end
```

The German alias is `@Scratch.bloecke`. The picture is an SVG with the text of
the blocks as its accessible label.

## Tasks with checks

    --{{0}}--
A task consists of two code blocks directly below each other: the Scratch
project and a hidden check written in JavaScript.

The check starts with a minus in front of its file name (`-Check`), so it
stays collapsed. When ▶ is pressed, the check starts the project and then
evaluates it. The result appears below the project.

**Task:** Robo should walk at least 150 steps to the right, using a repeat
loop – with at most 4 blocks.

``` scratch
when green flag clicked
move (10) steps
```
``` js -Check
await run(3)

expect(sprite("Robo").x >= 150, "Robo should walk at least 150 steps to the right.")
expect(blocks.uses("control_repeat"), "Use a repeat loop.")
expect(blocks.count() <= 4, "Can you do it with at most 4 blocks?")
```
@Scratch.check(level1)

These commands are available in a check (German names in brackets):

| Command                                     | Meaning                                                              |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `await run(s)` (`lauf`)                     | starts the project and waits at most `s` seconds                     |
| `expect(condition, text)` (`erwarte`)       | reports `text` if the condition is not met                           |
| `sprite(name)` (`figur`)                    | state of a sprite: `x`, `y`, `direction`, `size`, `costume`, `visible`, `says`, `variable(name)`, `list(name)` |
| `stage` (`buehne`)                          | state of the stage: `backdrop`, `variable(name)`, `list(name)`       |
| `blocks.count()` (`bloecke.anzahl()`)       | number of blocks in the project                                      |
| `blocks.count(opcode)` (`bloecke.anzahl()`) | how often the project uses this block                                |
| `blocks.uses(opcode)` (`bloecke.nutzt()`)   | does the project use this block?                                     |
| `blocks.fields(opcode, field)` (`bloecke.felder()`) | values of a field in all these blocks, e.g. `blocks.fields("event_whenkeypressed", "KEY_OPTION")` → `["right arrow", "left arrow"]` |
| `blocks.of(name)` (`bloecke.von()`)         | the same queries, only for the blocks of one sprite (or `"Stage"`)   |
| `blocks.scripts()` (`bloecke.skripte()`)    | every script as a list of block names in running order, e.g. `["event_whenflagclicked", "looks_say", "control_wait", "looks_say"]` |

Block queries only count blocks that are part of a script, i.e. hang below a
hat block such as `when green flag clicked`. Loose blocks lying next to a
script do not count.

The names of the blocks (`control_repeat`, `motion_movesteps` …) can be found
in the [Scratch Wiki](https://en.scratch-wiki.info/wiki/List_of_Block_Opcodes).

## Custom profiles

    --{{0}}--
If the four levels are not enough, you can define your own profiles in the
header of your course.

A profile extends one of the levels. The list `blocks` defines which blocks
are allowed; `maxBlocks` limits the number of blocks.

``` html
<!--
import: https://raw.githubusercontent.com/LiaTemplates/ScratchBlocks/0.2.0/README.md

@onload
;(window.LiaScratchSetup = window.LiaScratchSetup || []).push(function (scratch) {
  scratch.defineProfile("maze", {
    base: "level1",
    blocks: ["event_whenflagclicked", "motion_movesteps", "motion_turnright"],
    maxBlocks: 5
  })
})
@end
-->
```

Use it with `@Scratch.profile(maze)`.

| Option       | Meaning                                              |
| ------------ | ---------------------------------------------------- |
| `base`       | level the profile builds on                          |
| `blocks`     | allowed blocks (opcodes) or `"all"`                  |
| `exclude`    | blocks to remove                                     |
| `zoom`       | block size (level 1: `1.1`, level 4: `0.675`)        |
| `sprites`    | may sprites be added?                                |
| `textView`   | show the **Text** button                             |
| `sb3`        | buttons to load and save `.sb3`                      |
| `speech`     | read blocks aloud, and the result of a check (the first hint) |
| `maxBlocks`  | at most this many blocks (`0` = unlimited)           |
| `resetOnRun` | put sprites back to their start state on ▶           |
| `dragSprites`| `false`: only sprites with `draggable: yes` can be moved on the stage (keeps start positions fixed in tasks) |

## Sprites and sounds

    --{{0}}--
The template brings a small library of its own: these sprites, backdrops and
sounds are part of the template, so they also work offline. Your course can
add more, see the next section.

| Name     | Type     |
| -------- | -------- |
| `robo-a` | costume  |
| `robo-b` | costume  |
| `white`  | backdrop |
| `pop`    | sound    |
| `beep`   | sound    |

All of them were made for this template and are in the public domain
([CC0](https://creativecommons.org/publicdomain/zero/1.0/)). The Scratch Cat is
deliberately not used, it is a trademark of the Scratch Foundation.

## Own sprites, backdrops and sounds

    --{{0}}--
Your course can bring its own images and sounds. Register them once in the
header of your course, then use them by name, just like the built-in ones.

Every asset gets a short name (its key). `defineSprite` combines costumes and
sounds into a sprite: a new sprite with this name starts with them.

``` html
<!--
import: https://raw.githubusercontent.com/LiaTemplates/ScratchBlocks/0.2.0/README.md

@onload
;(window.LiaScratchSetup = window.LiaScratchSetup || []).push(function (scratch) {
  scratch.defineAsset("jungle", {
    type: "backdrop",
    url: "https://raw.githubusercontent.com/your-name/your-course/main/assets/jungle.png"
  })
  scratch.defineAsset("crystal", {
    type: "costume",
    url: "https://raw.githubusercontent.com/your-name/your-course/main/assets/crystal.svg",
    rotationCenterX: 20,
    rotationCenterY: 20
  })
  scratch.defineAsset("chime", {
    type: "sound",
    url: "https://raw.githubusercontent.com/your-name/your-course/main/assets/chime.mp3"
  })
  scratch.defineSprite("crystal", {
    name: "Crystal",
    costumes: ["crystal"],
    sounds: ["chime"]
  })
})
@end
-->
```

In the code block:

``` scratch
[Stage]
backdrops: jungle, white*

[Sprite Crystal]
x: 100

when this sprite clicked
play sound [chime v]
switch backdrop to [jungle v]
```

| Option             | Meaning                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| `type`             | `"costume"`, `"backdrop"` or `"sound"`                                   |
| `url`              | address of the file: `https://…`, relative to the course, or a `data:` URL |
| `svg`              | the SVG image itself as text, instead of `url`                           |
| `format`           | `"svg"`, `"png"`, `"jpg"`, `"wav"` or `"mp3"` – only needed if it cannot be detected from the file |
| `rotationCenterX`, `rotationCenterY` | rotation centre in pixels of the image; default: its centre |
| `bitmapResolution` | `2` for PNG/JPG images drawn at double resolution (like Scratch's own)   |

`defineSprite(key, { name, costumes, sounds })` registers a sprite: a sprite
section `[Sprite Crystal]` (its name or its key) without `costumes:` starts with
these costumes and sounds. Without `name`, the key is the name of the sprite.

Notes:

* The key is also the name of the costume in Scratch and in
  [checks](#tasks-with-checks): `sprite("Crystal").costume == "crystal"`.
  It may contain letters, digits, `_` and `-`. The built-in names (`robo-a`,
  `white`, `pop` …) cannot be redefined.
* Prefer absolute URLs, e.g. of files in the GitHub repository of your course.
  The server must allow loading from other pages (CORS), GitHub does.
  Relative URLs are resolved against the README of the course, as far as the
  page reveals it.
* In PNG and JPG images, one image pixel is one pixel on the stage (480 × 360).
  Backdrops of at least 960 pixels width count as double resolution, so a
  960 × 720 backdrop fills the stage. For sharp costumes, draw them twice as
  large and set `bitmapResolution: 2`. GIF and WebP are converted to PNG.
* The course's `@onload` can run before this template is loaded, so
  `window.LiaScratch` may not exist yet. That is why the definitions are pushed
  into `window.LiaScratchSetup`: the template runs them as soon as it is
  loaded, before the first code block starts. Once it is loaded, a push runs
  immediately. The same works for `defineProfile`; a code block with a profile
  that is not defined yet waits up to 3 seconds for it.
* Assets are loaded in the background; code blocks wait for them. If a name is
  unknown or a file could not be loaded, the code block shows it with its line
  number.

### Try it

    --{{0}}--
This slide registers a costume itself, with a script right above the code
block. In your course, `defineAsset` belongs into `@onload` in the header.

``` html
<script run-once modify="false">
(function define() {
  // on a direct link to this slide, the template may still be loading
  if (!window.LiaScratch) { setTimeout(define, 100); return }
  window.LiaScratch.defineAsset("star", {
    type: "costume",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">…</svg>'
  })
})()
</script>
```

<script run-once modify="false">
(function define() {
  if (!window.LiaScratch) { setTimeout(define, 100); return }
  window.LiaScratch.defineAsset("star", {
    type: "costume",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><polygon points="30,2 37,22 58,22 41,35 47,56 30,43 13,56 19,35 2,22 23,22" fill="#ffd21f" stroke="#c78a00" stroke-width="3" stroke-linejoin="round"/></svg>'
  })
})()
</script>

``` scratch
[Sprite Robo]
costumes: robo-a, star

when green flag clicked
repeat (8)
  next costume
  turn right (45) degrees
  wait (0.3) seconds
end
```
@Scratch

## Implementation

The template is an npm project. The sources are in `src/`, Parcel bundles them
into `dist/index.js`.

``` bash
npm install        # install dependencies (patches scratch-vm for Parcel)
npm run build      # create dist/index.js
npm test           # tests for the text format (all blocks, all languages)
npm run typecheck  # check TypeScript
npm run gen        # regenerate src/format/specs.json and src/locales.json
npm run serve      # open this course locally with live reload
```

Structure of `src/`:

| File                    | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `element.ts`            | `<lia-scratch>`: interface, ▶/⏹, synchronization                  |
| `bridge.ts`             | connection to the LiaScript code block (read, write, observe ACE) |
| `textdiff.ts`           | small edits instead of rewriting the text, merging with a classroom |
| `project.ts`            | text ⇄ VM, start state of the sprites                            |
| `format/scratchtext.ts` | readable text format (scratchblocks notation)                    |
| `format/language.ts`    | everything language-dependent in the text format                 |
| `format/json.ts`        | compact `project.json`                                           |
| `format/specs.json`     | table of all blocks and menus, generated from scratch-blocks     |
| `locales.json`          | UI texts and keywords of all languages, generated from scratch-l10n |
| `i18n.ts`               | language of the course, UI texts                                 |
| `workspace.ts`          | scratch-blocks workspace, toolbox per profile                    |
| `stage.ts`              | stage: mouse, keyboard, dragging sprites, "ask and wait"         |
| `profiles.ts`           | levels 1–4 and custom profiles                                   |
| `assets/library.ts`     | built-in costumes, backdrops, sounds and sprites                 |
| `assets/registry.ts`    | own assets of a course (`defineAsset`, `defineSprite`)           |
| `check.ts`              | commands for checks                                              |
| `dom-guard.ts`          | keeps foreign nodes out of `<body>` (see below)                  |
| `vendor/scratch-gui/`   | glue code from scratch-gui 15.1.1 (AGPL-3.0)                     |

Notes:

* LiaScript manages the children of `<body>` by their index. Blockly,
  scratch-render-fonts and scratch-vm add nodes of their own there, which
  breaks LiaScript's rendering. `dom-guard.ts` moves them to `<head>` or into
  a container next to `<body>` right away.
* The run controls and versions of LiaScript are shown below the Scratch
  interface. Both only swap their visual places (`position: relative`), no
  node of LiaScript is moved.
* scratch-blocks loads the icons of the blocks (green flag, arrows) by URL. By
  default a fixed version on jsDelivr is used. For offline use, set
  `window.LiaScratchMedia` in `@onload` to your own copy of the folder
  `node_modules/scratch-blocks/media/`.
* `dist/index.js` is about 11 MB (4 MB compressed), most of it scratch-vm.

The macros in the header of this file:

``` html
@Scratch:         @Scratch._run(@uid,level4)
@Scratch.level1:  @Scratch._run(@uid,level1)
@Scratch.level2:  @Scratch._run(@uid,level2)
@Scratch.level3:  @Scratch._run(@uid,level3)
@Scratch.level4:  @Scratch._run(@uid,level4)
@Scratch.profile: @Scratch._run(@uid,@0)

@Scratch.check:   @Scratch._check(@uid,@0)

@Scratch._run
<script>
window.LiaScratch.run("@0", send, "@'input", "@1")
</script>

<lia-scratch id="@0" profile="@1"></lia-scratch>
@end

@Scratch._check
<script>
window.LiaScratch.check("@0", send, "@'input(0)", "@1", async function (api) {
  const { run, expect, sprite, stage, blocks, lauf, erwarte, figur, buehne, bloecke } = api
@input(1)
})
</script>

<lia-scratch id="@0" profile="@1"></lia-scratch>
@end
```

The element `<lia-scratch>` finds the code block right before it, hides its
editor and keeps blocks, stage and text in sync. New versions are created by
LiaScript itself as soon as ▶ is pressed.

License: [AGPL-3.0](LICENSE), like the Scratch components it is built on.
Courses that import this template can be licensed freely. The licenses of all
bundled components and the Scratch trademark notice are listed in
[NOTICE](NOTICE).
