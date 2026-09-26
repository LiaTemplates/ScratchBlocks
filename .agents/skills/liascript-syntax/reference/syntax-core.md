# Syntax Core

Core LiaScript authoring syntax: the meta-header, document structuring, text formatting, the standard Markdown-block elements (lists, blockquotes, tables, code, HTML), custom styling, and comments/footnotes/math. A LiaScript course is valid Markdown first — every pattern below still reads fine in a plain Markdown viewer (GitHub, an editor preview, etc.), LiaScript just adds meaning on top.

## Meta-Header

Every course starts with an HTML comment containing `key: value` macros. Continuation lines must be indented. This is parsed once, before the first slide.

```markdown
<!--
author:   Your Name; Second Author
email:    you@example.com
version:  0.1.0
language: en
narrator: US English Female
comment:  Short description shown on the course card.
          Only the first paragraph is used, even if you add more.
logo:     ./logo.png
icon:     ./favicon.png
attribute: [LibName](https://example.com) by Author is licensed under [MIT](https://opensource.org/licenses/MIT)
repository: https://github.com/org/repo
edit:     true
mode:     Presentation
persistent: true
script:   https://cdn.example.com/lib.js
link:     https://cdn.example.com/lib.css
-->
```

| Field | Purpose |
|---|---|
| `author` | Shown in the info panel and course card. Separate multiple authors with `;`. |
| `email` | Contact address shown in the info panel; can be overridden per section. |
| `version` | `major.minor.patch`. Major `0` = dev mode, always re-parsed, no persisted state. Major `>=1` enables IndexedDB persistence (code/quiz/task state); bump patch for typo fixes, minor for appended slides, major when restructuring (moves quizzes/code between slides). |
| `language` | Locale code (e.g. `en`, `de`) — drives UI strings, typographic quotes, and the default translation target. Full list: `github.com/liaScript/lia-localization`. |
| `narrator` | Default TTS voice, e.g. `UK English Female`, `US English Male`. Overridable per slide/comment. |
| `logo` | Background image (relative or absolute URL) for the course card. |
| `icon` | Replaces the default hummingbird icon; relative or absolute URL. |
| `comment` | Short abstract shown on the course card (first paragraph only). |
| `attribute` | Attribution/license text shown in the info panel; repeatable, preserved across `import`. |
| `repository` | Source repo URL, preserved even after SCORM export; also used to power the `edit` link. |
| `edit` | A URL to an editable source, or `true` to auto-link the current doc to the LiveEditor. |
| `mode` | Default view: `Presentation`, `Slides`, or `Textbook`. User can still switch via the UI. |
| `persistent` | `true` keeps a slide's DOM alive when navigating away (needed for scripts/widgets that must survive slide switches). Can also be set as a per-slide header. |
| `script` | External JS URL(s) to load before the course renders; repeatable or multi-line. |
| `link` | External CSS URL(s); repeatable or multi-line. |

Other fields that exist but are less commonly needed: `date`, `translation` (link to translated versions), `font` (paired with `link` to a webfont), `dark` (force dark/light), `classroom`, `sharing`, `translateWithGoogle`, `import` (pull in another course's macros/header — see `lia-template` skill), `onload`/`style` (raw JS/CSS blocks in the header — see `reference/interactivity.md`), `formula` (KaTeX macros — see Comments, Footnotes, Math below).

## Structuring

Slides are plain Markdown headings; heading depth is the slide hierarchy. Each `#`/`##`/`###`-level heading starts a new, separately-parsed slide (parsed lazily, on first view, then cached).

```markdown
# Main Title

## Section Title 1

### Subsection Title

## Section Title 2
```

Content between one heading and the next is a paragraph; separate blocks (paragraphs, lists, tables, ...) with a blank line — LiaScript, like all Markdown, is block-oriented.

To put more than one logical section under a single slide heading (without starting a new slide), wrap the sub-headings in `<section>` or `<article>`:

```markdown
# Slide Title

<section>
## Grouped Sub-Heading

Content that stays on this slide.
</section>
```

Sub-headings that should not appear in the table of contents can use Setext-style underlines instead of `#`:

```markdown
## Section Title

Local Subsection
================

Local Sub-SubSection
--------------------
```

## Text Formatting

```markdown
*italic*        **bold**        ***bold italic***
_also italic_   __also bold__   ___also bold italic___
~strike~        ~~underline~~   ~~~strike and underline~~~
^superscript^
```

Combine freely: `**bold _bold italic_**`, `*~italic strike~*`.

**Caution:** each emphasis span (`**bold**`, `*italic*`, `~strike~`, etc.) must stay on one physical line. If the source line is hard-wrapped so the closing marker lands on the next physical line — e.g. `**how plants turn light into\nfood**` — the parser mis-reads it: stray literal asterisks leak into the rendered text and the wrapper can attach to the wrong substring. This only affects hard line breaks inside the raw Markdown source; a long line that your editor soft-wraps visually (no actual newline character) is fine. Keep each span on one physical line, however long that makes the line.

Typography: `--` → en dash, `---` → em dash, `...` → ellipsis; straight quotes (`"..."`, `'...'`) are auto-converted to the typographic form for the document's `language`. Escape any special character with a leading backslash, e.g. `\*`, `\_`, `\$`, `\@`, `\\`.

Arrows and basic smileys are built in: `->`, `<-`, `<->`, `=>`, `<=`, `<=>`, `-->`, `<--`, `==>`, `<==`, `~>` and `:-)`, `;-)`, `:-D`, `:-(`. Unicode (including emoji) can be pasted directly.

Links, media, and references (a mix of standard Markdown and LiaScript extensions):

```markdown
[title](https://example.com "optional hover title")
[internal link to slide 5](#5)
<https://example.com/path_(with_parens)>          <!-- autolink, avoids escaping -->
[preview-lia](https://raw.githubusercontent.com/org/repo/master/README.md)   <!-- rich course-preview card -->
[qr-code](https://example.com)                    <!-- renders a QR code -->
[Write me](mailto:you@example.com)   [Call me](tel:+491234567890)

![alt text](img/photo.jpg "optional sub-title")   <!-- image -->
?[a horse](audio.mp3 "hear a horse")               <!-- audio -->
!?[a video](https://www.youtube.com/watch?v=xyz)   <!-- video: YouTube/Vimeo/PeerTube/DailyMotion/TeacherTube -->
??[embed](https://sketchfab.com/models/xyz)        <!-- generic oEmbed/iframe fallback -->
```

Adjacent media lines (no blank line between them) become a gallery.

**Floating image + wrapped text** — an image followed *directly* by text, with **no blank line between them**, forms a single paragraph in which the image floats left at up to 50% width and the text flows beside it, like a two-column slide layout:

```markdown
![Placeholder](img/photo.jpg "caption")
This text has no blank line before it, so it stays in the same
paragraph as the image above and wraps beside it.
```

**A blank line between the image and the text breaks this** — rendered and confirmed: with a blank line, the image becomes its own separate block (no float applied) and the text becomes a separate paragraph below it, stacked vertically instead of side-by-side. This is easy to get wrong, since a blank line after an image often looks more "correct" by ordinary Markdown-formatting habits:

```markdown
![Placeholder](img/photo.jpg "caption")

This text HAS a blank line before it, so it becomes its own separate
paragraph below the image instead of floating beside it.
```

## Lists, Blockquotes, Tables, Code, HTML

**Lists** — `*`, `+`, `-` for unordered (mixable); indent with spaces (2–4) to nest or continue an item as a new paragraph:

```markdown
* alpha
* beta
  continued text, same item

  - nested list
  - second nested item

* gamma
```

Ordered lists preserve the exact numbers you write (useful for interrupting a list with content and resuming it) — `0.` is a valid start:

```markdown
0. alpha
1. beta
3. gamma
```

Change the numbering style with an HTML-comment attribute directly above the list: `<!-- type="a" -->` (`a`/`A` letters, `i`/`I` roman numerals) or via CSS: `<!-- style="list-style-type: lower-greek" -->`.

Task/check-lists reuse the list syntax with bracketed checkboxes; state is preserved when `version >= 1.0.0`:

```markdown
- [ ] Not done
- [X] Done
```

**Blockquotes** — start each line with `>`; nest with `>>`:

```markdown
> Quoted text ...
>
>> Nested quote
>
> * a list inside a quote
```

GitHub-style alerts (also support a GitLab-style custom title/emoji after the keyword):

```markdown
> [!NOTE]
> Info worth noting.

> [!TIP] 💡 Pro tip
> Optional but helpful information.

> [!IMPORTANT]
> Crucial information.

> [!WARNING]
> Risk of something going wrong.

> [!CAUTION]
> Negative/irreversible consequences.
```

Citation form — a second paragraph starting with `--` inside a blockquote renders as a `<cite>`:

```markdown
> "Learn as if you were to live forever."
>
> -- Mahatma Gandhi
```

**Tables** — pipe-delimited; the second row sets alignment (`:---:` center, `---:` right, `:---`/`---` left):

```markdown
| Name    |   Qty  |  Price |
| ------- |:------:| ------:|
| Widget  |   3    |  $12.5 |
| Gadget  |   1    |   $8.0 |
```

Tables are sortable in the rendered course by clicking a header. A table whose non-header cells are mostly numeric is auto-offered as a line/scatter/bar chart toggle — see `reference/visuals.md` for the "Fun with Tables" plotting rules.

**Code** — fenced with 3+ backticks; the word after the opening fence is the language for syntax highlighting:

````markdown
``` python
for i in range(10):
    print(i)
```
````

Use 4+ backticks to fence a block that itself contains a 3-backtick example. Multiple fenced blocks placed back-to-back with no blank line between them form a "project" — a bundled multi-file unit (used for interactive/runnable code, see `reference/interactivity.md`). Prefix a block's optional filename with `-` to start it hidden/minimized or `+` (the default) to start it visible:

````markdown
``` js     -EvalScript.js
let x = 1
```
``` json    +Data.json
{ "x": 1 }
```
````

**HTML** — plain HTML is allowed inline and can itself contain Markdown:

```markdown
<div style="color: green">

Test <q>**bold**</q> works inline too.

</div>
```

`<details>`/`<summary>` work as a native accordion. Wrap a block in `<lia-keep>...</lia-keep>` to have it passed through as raw HTML with no Markdown parsing and no indentation checking — useful for complex hand-written HTML like multi-row/rowspan tables.

Horizontal rule: a line of 3+ dashes (`---`); note that `***` is reserved by LiaScript for animation/fragment grouping (see `reference/interactivity.md`'s Multi-block animation), not a horizontal rule. `***` has a second, unrelated meaning too — it also delimits a quiz's solution block, see `reference/quizzes-surveys.md`'s Tweaks section.

## Custom Styling

Attach an HTML comment containing HTML attributes (`style`, `class`, `id`, ...) directly before a block, or immediately after an inline element, to style it. LiaScript strips these comments from plain-Markdown rendering, so the source still reads cleanly elsewhere.

Block-level (comment goes *before* the block):

```markdown
<!-- style="color: purple; font-size: 1.2em" class="animated rollIn" -->
This whole paragraph is styled.
```

Table cells and headers can each carry their own attribute comment, in addition to one for the table as a whole:

```markdown
<!-- style="width: 50%" -->
| <!-- style="background: azure" --> Header 1 | Header 2 |
|:--------------------------------------------|:---------|
| <!-- style="background: coral" --> Item 1   | Item 2   |
```

Inline (comment goes *after* the span/word/link/image it applies to):

```markdown
This **is important**<!-- style="color: red" --> text.

![a lion](lion.svg)<!-- style="width: 300px;" class="animated bounce" -->
```

Reference: any CSS property works in `style="..."`; any HTML attribute works standalone (e.g. `id="..."`, `usemap="..."`).

## Comments, Footnotes, Math

**Ignoreable comments** — a comment opened with 3+ dashes (`<!---`, closed with `--->`) is dropped entirely by the parser (unlike a plain `<!-- ... -->`, which LiaScript tries to read as attributes). Use it for authoring notes or to comment out a block wholesale:

```markdown
<!---
Draft note, or an old attribute block to disable:
style="color: red"
--->
```

**Caution:** always put a blank line between an ignoreable comment and any functional HTML comment next to it (a plain `<!-- ... -->` attribute comment, or another ignoreable comment). Two raw HTML comments stacked back-to-back with no blank line — e.g. an ignoreable authoring note placed directly above a `<!-- data-type="LinePlot" -->` attribute comment — get merged by the underlying Markdown parser into a single HTML block. LiaScript's attribute-comment extractor can no longer find the attribute comment inside that merged block, and the whole comment+content run is swallowed and re-emitted as literal escaped text instead of being parsed (confirmed live: an attribute comment stacked directly under an ignoreable comment broke a table→chart into unrendered text — see `reference/visuals.md`'s Table → Chart Syntax section). Separate every HTML comment from its neighbors with a blank line.

**Footnotes** — a marker `[^id]` in the body (id can be a number, word, or emoji), defined at the end of the same section (LiaScript parses one section/slide at a time, so footnotes cannot span across slides). Definitions are indented by at least 2 spaces and may contain multiple paragraphs/blocks:

```markdown
### Section

Body text with a claim[^1].

[^1]: The footnote body, which can contain **Markdown** and span
  multiple lines and paragraphs.
```

Inline footnotes skip the separate definition — put the explanation directly in parentheses:

```markdown
Inline footnote[^x](a short explanation right here)
```

**Math** — KaTeX. Single `$...$` for inline, double `$$...$$` for a display block; nothing else (no Markdown/HTML) is allowed inside the dollar signs:

```markdown
Inline: $ \frac{a}{\sum{b+i}} $

$$
\frac{a}{\sum{b+i}}
$$
```

Chemical equations use the `mhchem` `\ce{...}` command: `$\ce{CO2 + C -> 2 CO}$`.

Reusable KaTeX macros can be defined once in the header with `formula:` (repeatable) and used in every formula on every slide; a slide can override one locally by adding its own `formula:` header:

```markdown
<!--
formula: foo  {x^2}
-->

# Main

$ \foo + \foo $
```
