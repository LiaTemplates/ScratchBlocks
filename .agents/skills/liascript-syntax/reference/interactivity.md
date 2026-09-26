# Interactivity

LiaScript content becomes interactive through five layers that combine freely: **effects** (animation/narration/playback timing), **executable code blocks** (editable code with an Execute button and a terminal), the **`send`/JS API** every script gets, **macros** (text-substitution shortcuts, usually imported from a template course), and **JS-Components** (raw `<script>` tags embedded directly in the Markdown body). This file covers all five for *using* them in a course. For *building* a reusable macro/template package for the LiaTemplates ecosystem, see the separate `lia-template` skill — it documents the 12 implementation patterns and the full `send` object from the author's side; this file only covers calling what already exists.

## Effects

Animations, comments, and playback are all defined with double curly braces `{{...}}` (or single braces `{...}` for inline use) placed above/around a block or span. They are revealed step-by-step with each click in `Presentation`/`Slides` mode; in `Textbook` mode every step is shown at once, each tagged with its step number.

**Block animation** — a `{{start-stop?}}` line directly above a block (indent by 4+ spaces so other Markdown tools show it as code); the block appears at `start` and, if given, disappears at `stop`:

```markdown
     {{1}}
This appears at step 1 and stays.

     {{2-3}}
This appears at step 2 and disappears at step 3.
```

**Inline animation** — wrap the animation definition and the affected text in two adjacent brace pairs, usable mid-sentence:

```markdown
* no effect here
* but in this line {2}{show ***second***}
* as well as this one {1-2}{show ***first*** remove on __second__}
```

**Multi-block animation** — group several Markdown blocks (paragraphs, tables, ...) under one step by surrounding them with lines of 3+ asterisks, with the animation definition above the opening line. Rendered and confirmed both forms: the asterisk-fence form below, and the alternative `<section>...</section>` wrapper (in place of the two asterisk lines) — both correctly revealed a paragraph and a table together as a single step, at the same time, with the animation definition placed above the block/tag either way. Note `***` has a second, unrelated meaning as the quiz solution-block delimiter — see `reference/quizzes-surveys.md`'s Tweaks section.

```markdown
     {{1-2}}
************************************

This is an example...

| that     | contains |
|----------|----------|
| multiple | blocks.  |

************************************
```

**TTS-sync comments** — a paragraph marked with `--{{n}}--` is read aloud by the document's text-to-speech engine when animation step `n` is reached, in `Presentation`/`Slides` mode. It is designed to be used *together with* a `{{n}}`-marked visual block at the same step number, not as an alternative to it: think of `{{n}}` as a presentation bullet point (the visual content revealed at that step) and `--{{n}}--` as the speaker notes for that same bullet (the spoken explanation of it). In `Textbook` mode the `--{{n}}--` paragraph is simply displayed as plain visible text in place — it is not hidden there (confirmed by rendering: the plain-text form is visible in Textbook mode with the surrounding document). `Presentation` and `Slides` do **not** behave identically here, despite both being non-`Textbook` modes: rendered and confirmed, `Presentation` mode truly hides the comment — wrapped in a visually-hidden CSS container (collapsed to a 1px sliver, present in the DOM/accessible text but not legible on screen) — while `Slides` mode shows it, but not in place: it renders in a separate, genuinely visible speaker-notes side panel docked at the edge of the viewport, not inline with the slide body (that panel's container carries a `hide-lg-down` responsive class, so this was only confirmed at a wide viewport — narrow-viewport/mobile behavior wasn't independently tested). For the full slide-construction pattern that combines `{{n}}` blocks and `--{{n}}--` comments into a presentation that also works as a textbook, see `reference/presentation-pattern.md`.

```markdown
     {{1}}
**Photosynthesis converts light into sugar.**

          --{{1}}--
This is the narration for that same step — spoken aloud when step 1
is reached, explaining what's already visible on screen.
```

**`--{{n}}--` is the narration half of the `{{n}}`/`--{{n}}--` pair — it does not, by itself, create a visual reveal.** A common mistake is using `--{{n}}--` alone, expecting the paragraph it wraps to appear on screen at that step the way a `{{n}}`-marked paragraph would. It does not: in `Presentation` mode that paragraph is hidden entirely (narration-only, via the visually-hidden CSS technique described above); in `Slides` mode it does appear, but only in the separate speaker-notes side panel, never inline in the main slide body the way a `{{n}}`-marked fragment would (it does show as plain text in place in `Textbook` mode — see above); either way it never produces the visual reveal a `{{n}}`-marked paragraph would, and this fails silently — there's no error that flags the *markup* as wrong. You may see unrelated TTS/EasySpeech console errors (see below) as a side effect of the browser attempting to speak text it now thinks is narration, but nothing in those errors points at the real problem — a missing visual reveal. Confirmed by rendering: a paragraph marked `--{{1}}--` with no accompanying `{{1}}` block never appeared on screen at step 0, 1, or 2 in `Presentation` mode, while the same paragraph marked with bare `{{1}}` rendered normally and became visible exactly at its step. Adding to the confusion risk: `---` (3+ dashes) is the horizontal-rule/section-break marker (see `reference/syntax-core.md`), and `--` on its own, mid-text, is typographic — it renders as an en dash, not a rule (also `reference/syntax-core.md`). Neither of those creates a visual reveal either, but both make `--{{n}}--` look like a plausible standalone "dashed fragment" variant when it is really the narration side of a pair.

```markdown
     {{1}}
This is a real fragment/bullet point. It appears at step 1 and stays
visible from then on, in every presentation mode.

          --{{1}}--
This is the narration for step 1 — pair it with the {{1}} block
above, don't use it alone expecting a visual reveal.
```

Wrap the comment in an HTML comment (`<!-- --{{n}}-- ... -->`) to keep it out of Textbook mode too — a "hidden" comment, spoken but never shown. Rendered and confirmed: a plain `--{{n}}--` comment's text is visible in Textbook mode, while the exact same comment wrapped in `<!-- -->` produces no visible text anywhere, in any mode, even though it occupies a real animation step (a later step still advances past it correctly).

Per the official docs, `--{{n voice}}--` overrides the narrator voice for just that one comment, and multiple comments sharing the same step number are concatenated and read aloud in document order (using only the first one's voice). The *syntax* for both is confirmed safe to use — several `--{{1}}--`/`--{{1 voice}}--` comments at the same step number, mixing default and named voices, parse without error and all coexist under that one step — but the actual **spoken** behavior (which voice is heard, in which order) could not be independently verified here: the headless Chrome environment used to write this reference had no browser TTS voices, so LiaScript's speech engine (EasySpeech) never finishes initializing and throws `EasySpeech: not initialized` on any attempt to actually speak, before ever reaching the browser's `speechSynthesis.speak()` call (confirmed by patching `speechSynthesis.speak` to capture calls — zero calls arrived, and the console showed the same init error). Treat the voice-override and speech-order claims as per-docs, not independently re-verified for audio output.

**Multimedia comments** — append (or prepend) a standard audio/video embed to the end of a TTS-sync comment paragraph to play it alongside that step:

```markdown
    --{{0}}--
To play an audio file during your animation step,
simply attach the multimedia link at the end of
your comment.
?[⏯](recording/audio_1.mp3)
```

This is genuinely different behavior from a normal media embed, and easy to get wrong: **a media link inside a `--{{n}}--` comment is never rendered as a visible player.** Verified by testing both forms side by side — `?[audio](file.mp3)` on its own, outside any comment, renders a normal visible `<audio>` control; the exact same link appended to a `--{{0}}--` comment produces *no* visible element and *no* network request at all until the comment's animation step is actually triggered in `Presentation`/`Slides` mode, at which point the file is fetched and played automatically as a narration cue, with the comment's own text still not shown on screen (only spoken/played). If you want a visible player instead, use the media syntax outside of a comment.

**Playback** — `{{|>}}` (block) or `{|>}{...}` (inline) attaches a visible Play/Pause button that reads the paragraph aloud on click, independent of the animation step machinery and visible in every presentation mode (unlike TTS-sync comments, which never appear inline outside Textbook mode — see above):

```markdown
    {{|>}}
This entire paragraph will be spoken out __LOUD__.

    {{!> Australian Female}}
* But in this case, this can also be combined
* with a couple of
* - different
  - Markdown elements
```

`{{!> voice}}`/`{!> voice}{...}` picks a specific voice for that one playback button — per the official docs; which voice actually gets used could not be independently re-verified here for the same headless-TTS reason as TTS-sync comments above (no browser voices available, `EasySpeech` never initializes). Playback and animation numbering combine (`{{1 |>}}`) so a play button only appears once its step is reached — this part **is** confirmed by rendering: a `{{1 |>}}`-marked paragraph's Play button is completely absent from the DOM at step 0 and appears (with the paragraph itself, tagged with its step badge) only after advancing to step 1.

## Interactive Code Blocks

**Starting simple** — attach a `<script>@input</script>` tag directly below a fenced code block to make it executable: an Execute button and (after the first run) a terminal panel appear below the editor. `@input` is replaced with the block's current (editable) content before the script runs; the script's last expression is the returned/displayed value.

````markdown
``` javascript
var result = 0
for (var i = 0; i < 5; i++) { result += i }
result
```
<script>@input</script>
````

**Multi-file projects** — several fenced code blocks placed back-to-back with *no blank line between them* become one project with one shared `<script>` tag at the end. Give each block a filename after the language (prefix `-` to start hidden/minimized, `+` — the default — to start visible), and reference an individual block from the script with `@input(n)` (0-indexed; `@input` alone is equivalent to `@input(0)`):

````markdown
``` js     -EvalScript.js
let who = data.first_name + " " + data.last_name;
if (data.online) { who + " is online"; } else { who + " is NOT online"; }
```
``` json   +Data.json
{ "first_name": "Sammy", "last_name": "Shark", "online": true }
```
<script>
  let data = @input(1);
  @input(0)
</script>
````

**Default `@output`** — add `@output` as an attribute in the *last* code block's fence header (` ```text @output `) inside a project to designate its content as the default output, shown immediately on load, before the project has ever been executed. This is a fence-header attribute, not a standalone directive line and not something you can attach to a single non-project code block — confirmed by rendering: the placeholder text from the `@output` block appears in the terminal panel as soon as the slide loads, and is replaced by the script's real return value only after clicking Execute.

````markdown
``` js     -EvalScript.js
let who = data.first_name + " " + data.last_name;
if (data.online) { who + " is online"; } else { who + " is NOT online"; }
```
``` json   +Data.json
{ "first_name": "Sammy", "last_name": "Shark", "online": true }
```
``` text @output
Is Sammy Shark really online?
```
<script>
  let data = @input(1);
  @input(0)
</script>
````

This is useful for a course a student may be running offline (no external interpreter available) or for a plain-Markdown viewer like GitHub, where the code never actually executes.

**Loading external resources** — a library referenced from inside a `<script>` tag must be loaded via the `script:` meta-header field first (`<script>` tags themselves cannot fetch external JS); once loaded it is available globally to every code block on the page:

```markdown
<!--
script: https://cdn.example.com/library.min.js
-->

``` matlab
f = sin(t)^4 - 2*cos(t/2)^3*sin(t)
```
<script> Algebrite.run(`@input`) </script>
```

**Styling** — attributes go in an HTML comment directly above the fence. Rendered and confirmed working: `data-showGutter="false"` removes the line-number gutter (checked directly against the Ace editor instance); `data-theme="chaos"` (any Ace theme name) switches the editor's color theme; `data-marker="y1 x1 y2 x2 color type;"` (repeatable, `;`-separated) highlights a row/column range with a color keyword (`error`/`log`/`warn`/`debug`/`info`, or a spaceless `rgba(...)`) and an optional marker type (`text`, `fullLine` default, `screenLine`) — confirmed via the actual marker DOM nodes and their color classes. `data-tabSize`, `data-fontSize`, and `data-firstLineNumber` are documented but were not independently re-verified here. **`data-readOnly="true"` did not take effect in testing** — tried on a standalone scripted block, as a bare `data-readOnly` attribute, and inside a two-file project (the exact form shown in the official docs); in all three cases the Ace editor's `getReadOnly()` still reported `false` and typing into the editor was accepted. Treat `data-readOnly` as unverified/possibly version-dependent rather than a reliable way to lock a block from editing.

## The send/JS API

Every `<script>` — whether attached to a code block via `@input`, standalone in the body, or driving a quiz/survey/task — gets a local `send` object plus global `console.*` shortcuts for talking back to LiaScript:

```js
// Control strings — as the script's last expression, or via send.lia(...)
"LIA: stop"       // finish, no further output shown for this run
"LIA: wait"       // keep the loading/running indicator active (for async work)
"LIA: terminal"   // open an interactive input line below the output (a REPL)
"LIA: clear"      // clear the terminal panel

send.lia("message")           // push output, keep running
send.lia("message", [], true) // push output, mark as success (green)
send.lia("message", [], false)// push output, mark as failure (red)
send.lia("LIA: stop")         // push output and stop in one call

send.lia("LIASCRIPT:\n## Heading\n...")  // parsed as LiaScript markup
send.lia("HTML: <b>bold</b>")            // injected as raw HTML
send.liascript(`## Dynamic content`)     // shorthand for the LIASCRIPT: prefix

console.debug(...)   // gray debug line
console.warn(...)    // yellow warning
console.log(...)     // plain info line
console.error(...)   // red error line
console.html(str)    // inject raw HTML into the terminal
console.stream(str)  // append without a trailing newline
console.clear()      // shorthand for send.lia("LIA: clear")

// Terminal I/O, once "LIA: terminal" is active
send.handle("input", input => { /* runs on each line the user submits */ })
send.handle("stop",  e     => { /* runs when the user clicks stop */ })

// Cross-block pub/sub
send.register("event-name", callback)
send.dispatch("event-name", payload)
```

Verified behavior worth calling out:

- **Async pattern** — end the run with `"LIA: wait"`, and call `send.lia(...)` (with `"LIA: stop"` at the end, or as a separate call) once the async work finishes. Rendered and confirmed: the Execute button hides while waiting, `console.warn`/`send.lia` output from inside a `setTimeout` callback appears once it fires, and the Execute button reappears once `"LIA: stop"` is sent.
- **`"LIA: terminal"` + `send.handle`** — rendered and confirmed: after Execute, a small input editor plus a "Send to terminal" button appear; typing `2+2` and sending it runs the registered `input` handler (`eval(input)` in the test) and prints `4`.
- **`send.register`/`send.dispatch`** — confirmed working for two code blocks that both live **on the same slide**: block A's terminal input dispatched an event that block B's registered listener received and logged, and vice versa. Cross-*slide* delivery (the official docs' claim that this also works "even if both code blocks are defined on different slides") did **not** reproduce in testing here: after executing a listener on slide B, navigating away, then executing and dispatching from slide A, no callback fired on B — LiaScript unmounts a slide's scripts (and, apparently, their registered listeners) when you navigate away from it, unless something keeps that slide's DOM alive (e.g. the `persistent: true` meta-header/slide-header field). If you rely on cross-slide messaging, keep the receiving slide `persistent` or verify your specific case rather than assuming it works out of the box.
- **`send.output`** is for standalone JS-Component `<script>` tags (see below), not for `<script>@input</script>` code-block scripts — see the JS-Components section for the verified distinction.

## Using Macros

A macro is `@Name` or `@Name(args)` anywhere in the document body (or `@Name`/`@Name: ...` in a meta-header block), expanded at parse time from a definition — either written locally in this course's header, or pulled in from another course entirely with `import:`:

```markdown
<!--
import: https://raw.githubusercontent.com/liaTemplates/ABCjs/main/README.md
-->

``` abc  @ABCJS.render
X: 1
T: Test Tune
M: C
L: 1/8
K: F
"F"[A3F3][AF] ([AF][GE][AF])[BG] |
```
```

`import:` (repeatable, one URL per line) loads only the *main header* of the referenced course — its macros, `script:`/`link:` entries, `attribute:` lines, and `@onload` block — not its body content. Rendered and confirmed both halves of this claim with a small local two-course fixture: importing the [LiaTemplates ABCjs](https://github.com/liaTemplates/ABCjs) template and calling `@ABCJS.render` on a fenced `abc` code block produces a fully interactive sheet-music rendering with working playback controls, no console errors (confirms the macro/header *is* loaded); separately, importing a second local course whose header defined one macro and whose body had two of its own slide headings, the importing course's table of contents listed only its own sections — the imported course's slide titles never appeared, confirming the body is *not* pulled in. Prefer pinning a specific tag/commit in the `import:` URL over `master`/`main` for a course that needs to keep working unmodified.

**Calling a macro with parameters** — parentheses, comma-separated, positional (`@0`, `@1`, ... inside the definition). Rendered and confirmed with a two-parameter macro (`@highlight: <b style="color: @0">@1</b>`, called as `@highlight(red, simple text)` → a real, interpreted `<b style="color: red">simple text</b>`, not escaped text):

```markdown
@highlight(red, simple text)
```

The official docs say a parameter containing a comma must be wrapped in backticks (e.g. `` @highlight(green, `simply, simply, green`) ``). **This did not reproduce cleanly in testing**: both a direct backtick-wrapped parameter and one forwarded through a second, wrapping macro rendered as literal escaped text cut off at the first internal comma, instead of the fully-substituted HTML. Verify backtick-comma escaping empirically against your target LiaScript version before relying on it — when in doubt, avoid commas inside a single parameter (split into more positional parameters, or restructure the macro) rather than trying to protect them. **Note this disagrees with the `lia-template` skill**, whose `### Parameters` section states flatly "Commas inside a param: wrap in backticks" as if it works reliably — if both skills are loaded, trust this file's live-tested finding (it doesn't reproduce as described) over `lia-template`'s unqualified claim, and re-verify against your target LiaScript version either way.

The **last** parameter can instead be supplied as a fenced code block placed directly above the call (its content, including any language tag, becomes that final argument), which is confirmed working — a block-macro call with one named argument plus a fenced-block last argument rendered exactly as defined, with the block's Markdown content parsed normally inside it. For a link-shaped call — `@[MacroName(other, args)](relative/or/absolute/url "optional title")`, where a relative URL is auto-resolved to an absolute one so the call still works as a normal Markdown link on GitHub/other viewers — see the `@load`/link-parameter pattern in the official docs; not independently re-verified here.

**Escaping for use inside a JS string** — prefix with `'`: `@'input`, `@'input(1)`, `@'0`, or `@'MacroName(...)` backslash-escape the substituted value so it's safe to embed inside a JS template literal, per the official docs. Apply it once only; chaining escaped macros can double-escape special characters. Not independently re-verified at the time this reference was written.

**Debugging a call** without running it — prefix with an extra `@` (`@@MyMacro(args)`) to dump its fully expanded output into a gray, read-only block instead of executing it. Rendered and confirmed: `@@highlight(red, dump this call)` produced a gray `<pre><code>` block showing the (HTML-escaped) expansion instead of a live bold-red span.

For *authoring* your own macros/templates — the block/single-line macro syntax, `@uid`, the 12 established implementation patterns for wrapping a JS library, `LiaError` for editor annotations, and the full template file layout — see the `lia-template` skill; that content is not duplicated here.

## JS-Components

A bare `<script>...</script>` tag placed directly in the document body (no fenced code block, no `@input`, no Execute button) is a **standalone JS-Component**: it runs automatically wherever it appears, as an inline element like `**bold**` or an inline formula, and its final expression's value is displayed in place of the tag (an `undefined` result, e.g. from a bare `alert(...)` call, displays nothing, making the script effectively invisible). Rendered and confirmed: `<script>2+2</script>` inline in a sentence displays `4` in place; a script whose last statement is a plain `var` assignment (`undefined`) displays nothing at all.

```markdown
$ \sin(\frac{\pi}{2}) = $ <script>Math.sin(Math.PI / 2)</script>
```

Every script — code-block or standalone — runs in its own local scope; two `<script>` tags cannot see each other's plain `var`/`let` bindings. To share state, attach it to `window` explicitly. Rendered and confirmed: `window.a = 22 ** 3` in one script followed by `window.a / 2` in a second, separate script correctly produced `10648` then `5324` — the second script read the value the first one attached to `window`.

```markdown
<script> window.a = 22 ** 3 </script>
<script> window.a / 2 </script>
```

Scripts combine with animation numbers the same way any block does (`{{1}} <script>...</script>`) to delay execution until that step is reached; in `Textbook` mode all of a slide's scripts run once the slide loads.

**Asynchronous execution & `send.output`** — this is where the standalone form and the code-block form genuinely diverge, confirmed by testing both: `send.output(...)` only produces visible, live-updating output from a **standalone** `<script>` tag (no fence, no `@input`); the same `send.output` call inside a `<script>@input</script>` code-block script does not surface anything in the terminal panel. For a long-running/self-updating standalone script, return `"LIA: wait"` (or call `send.wait()`) so LiaScript knows the process is still active, then call `send.output(...)` on every update — this does not reset the run the way `send.lia(...)` would:

```markdown
<script>
setInterval(function(){
  i++
  send.output("counting " + i)
}, 1000)

var i = 0
"LIA: wait"
</script>
```

Rendered and confirmed: the inline text updates live ("counting 1", "counting 2", ...) without any Execute button. Also specifically confirmed by navigating away to a different slide and back: the counter kept incrementing the whole time it was off-screen (it read a much higher count on return than when last seen) and a `window`-level run-counter variable stayed at its original value — i.e. revisiting the slide did **not** re-run the script's setup code or reset the interval, it just re-attached the display to the still-running background process. This holds until `send.stop()`/`send.lia("LIA: stop")` is called. Shortcuts: `send.wait()` = `"LIA: wait"`, `send.stop()` = `"LIA: stop"`, `send.clear()` = `"LIA: clear"`.

**Input types** — add `input="<type>"` (plus `value="..."` for the initial value) to a `<script>` tag to turn it into a small interactive widget wired to `@input`; most HTML5 input types are supported, and `text`/`number`/`range`/`radio`/`checkbox` re-run the script on every change while the rest (`search`, `password`, date/time types, ...) re-run once the field loses focus or on submit. Rendered and confirmed for the most commonly used types:

```markdown
<script input="text" value="reverse">
let str = "@input"
str.split("").reverse().join("")
</script>

<script input="number" value="1" min="0" max="1000000">
let i = @input
"Square of " + i + " = " + i * i
</script>

<script input="range" value="0" min="0" max="360" step="0.1">
let i = @input
"Sinus of " + i + " = " + Math.sin(i)
</script>

<script input="checkbox" value="true">
"@input"
</script>

<script input="radio" value="1" options="1|2|3|Hello World">
"Selected option: @input"
</script>

<script input="select" value="1" options="1|2|3|Hello World">
"Selected option: @input"
</script>

<script input="button">
"click me"
</script>

<script input="submit" default="click me">
Math.random()
</script>
```

`options` (`radio`/`select`, `|`-separated) and `default` (`submit`/`button` — the value shown before the first click) are LiaScript-specific, not standard HTML attributes. Confirmed distinctions: `text`/`number`/`range`/`radio`/`select`/`checkbox` execute immediately on load with their default `value`; `button` also executes on load and again on every click; `submit` does **not** execute on load — it shows its `default` text until clicked, and only then runs the script (verified: clicking replaced the static `"click me"` with a fresh `Math.random()` result each time).

**Connecting scripts via `output`/`input`** — give a script `output="channel-name"`, then reference its live, currently-displayed value from any other script (same slide) with `` @input(`channel-name`) `` (backticks required around the channel name):

```markdown
<script input="checkbox" value="true" output="P" default="true">
@input
</script>
AND
<script input="checkbox" value="false" output="Q" default="false">
@input
</script>
<script>
@input(`P`) && @input(`Q`)
</script>
```

Rendered and confirmed: toggling either checkbox live-updates the combining script's `true`/`false` result. If two scripts reference each other's output (a cycle), give both a `default` value or the first calculation has nothing to read and errors out — rendered and confirmed both sides of this specifically: two async scripts with `output`/`` @input(`other`) `` pointing at each other and a `default` on both settled cleanly to a computed value with no console errors; the identical pair with `default` removed from both instead threw an uncaught `TypeError` in the console on load and displayed nothing.

**Internationalization API** — `format="..."` (`number`, `datetime`, `list`, `relativetime`, `pluralrules`) applies a `locale`-aware `Intl.*` formatter to the script's output for display only (the underlying `@input` value used by connected scripts is unaffected). Confirmed: `format="number" locale="de-DE"` renders `1234.5` as `1.234,5` (German grouping/decimal separator), and `format="datetime" locale="de"` renders a `date`-type input in the German date format. The docs additionally describe a `localeStyle` parameter (used instead of `style`, since `style` is reserved for inline CSS) for `Intl.NumberFormat`'s `style` option (e.g. `localeStyle="currency" currency="EUR"`) — this did not visibly change the rendered output in testing here (both `localeStyle="currency"` and a plain `style="currency"` attempt produced the same locale-formatted number with no currency symbol), so treat currency-style formatting as unverified and check it against your target LiaScript version before relying on it.

**`LIA` global object** — the official docs mark this section as still incomplete ("Todo") beyond one documented sub-API: `LIA.classroom` is a publish/subscribe interface for the live-presentation "Classroom" feature (peer-to-peer, active only while a classroom session is connected):

```js
LIA.classroom.connected                 // bool: is a classroom session active
LIA.classroom.on("connect", () => {})
LIA.classroom.on("disconnect", () => {})
LIA.classroom.publish("topic", payload)
const id = LIA.classroom.subscribe("topic", message => {})
LIA.classroom.unsubscribe(id)
```

Confirmed only that `LIA.classroom.connected` is safely accessible and reads `false` outside of an active classroom session — the object exists and does not throw even with no session connected; the publish/subscribe round-trip itself needs a live multi-peer classroom to exercise and was not independently re-verified here.
