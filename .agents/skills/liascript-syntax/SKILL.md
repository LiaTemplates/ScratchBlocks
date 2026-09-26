---
name: liascript-syntax
description: Complete LiaScript authoring reference — full markdown syntax (quizzes, surveys, effects, charts, code execution, styling, math), the philosophy behind the language, and established best-usage patterns. Use when writing, editing, reviewing, or debugging any LiaScript course (README.md files meant to be rendered by the LiaScript interpreter). For building reusable LiaScript *templates/macros* for the LiaTemplates ecosystem, see the separate template-development skill.
license: CC0-1.0
---

# LiaScript

LiaScript turns plain Markdown into fully interactive, offline-capable online courses, rendered entirely client-side (Elm/JS) — no server, no build step. Its four design goals, verbatim from the official docs: **Simplicity** ("with a human-centered markup-language, anyone should be enabled to create and modify content"), **Interactive** ("...although content with LiaScript is developed within a 'static' markup-language it should not be presented that way"), **Extendability** ("everything that is not part of LiaScript shall be embeddable and importable"), **Durability** ("platforms go down... but LiaScript... even without the LiaScript interpreter the content is still readable and interpretable with every editor"). A LiaScript course is always a normal `.md` file — treat it as such: readable and editable outside any tool, versionable in git, and correct-by-construction Markdown first, LiaScript second.

See `reference/philosophy-patterns.md` for the full philosophy and the best-practice patterns derived from it — read that file when a design/style decision (not just syntax) is in question.

## Navigation — read the file that matches the task

| File | Covers | Read when... |
|---|---|---|
| `reference/syntax-core.md` | Meta-header, document structuring, text formatting, lists/blockquotes/tables/code/HTML blocks, custom styling, comments, footnotes, math & formulas | Writing or reviewing general course content/structure |
| `reference/quizzes-surveys.md` | All 6 quiz types + generic quizzes + surveys/classroom mode | Adding or debugging any graded or ungraded question |
| `reference/interactivity.md` | Effects (animation/TTS/multimedia comments/playback), interactive code blocks, the `send`/JS API, macro *usage* (not authoring — see `lia-template` for that) | Making content interactive, executable, narrated, or animated |
| `reference/presentation-pattern.md` | Slide-construction pattern for content that works as both a live presentation and a self-paced textbook — pairing `{{n}}` bullets with `--{{n}}--` narration, step-0 framing, the verified per-mode narration-visibility matrix | Building a lecture/slide-deck-style course meant to double as reading material |
| `reference/visuals.md` | Table→chart plot types, ASCII-art, SVG, chart fine-tuning | Adding a diagram, chart, or ASCII visualization |
| `reference/tooling.md` | `liascript-devserver`, `@liascript/exporter` (CLI + export formats), editors, publishing/hosting workflow | Running, exporting, publishing, or setting up a course project |
| `reference/philosophy-patterns.md` | Verbatim philosophy quotes + best-practice patterns (mode selection, accessibility, offline-first design, narrator/TTS usage, versioned imports) | Making a design/style choice, not just a syntax lookup |

## Cheatsheet

Minimal meta-header (every course needs one, as an HTML comment at the top of the file):
```markdown
<!--
author:   Your Name
email:    you@example.com
version:  0.0.1
language: en
narrator: UK English Female
-->
```

Slides are `#`/`##`/`###` headings — each `#`-level heading starts a new top-level slide.

Single-choice quiz:
```markdown
- [( )] Wrong answer
- [(X)] Right answer
```

Multiple-choice quiz:
```markdown
- [[X]] Correct, checked
- [[ ]] Incorrect, left unchecked
```

Executable code block (attach a `<script>@input</script>` tag right below the fence to make a JS block runnable, with output shown in a terminal panel):
````markdown
``` js
1 + 1
```
<script>@input</script>
````

For anything beyond this — full quiz type list, effects, charts, macros, publishing — go to the matching `reference/` file above rather than guessing.
