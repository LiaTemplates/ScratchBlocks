# Philosophy & Patterns

## Why LiaScript Exists

> "With LiaScript, we tried to implement an extended Markdown format that should enable everyone to create, share, adapt, translate or correct online courses without the need of being a web-developer. We believe that a language-based approach, instead of a tooling-centered one, provides more flexibility, freedom of creativity, and sustainability."

> "Everything has been woven around Markdown, so that the content can still be read and interpreted with any kind of editor or Markdown-interpreter."

### The Four Goals (verbatim)

- **Simplicity**: with a human-centered markup-language, anyone should be enabled to create and modify content.
- **Interactive**: the browser is the next operating systems and although content with LiaScript is developed within a "static" markup-language it should not be presented that way.
- **Extendability**: everything that is not part of LiaScript shall be embeddable and importable.
- **Durability**: platforms go down, the development of proprietary software/formats is discontinued, but LiaScript is not hosted on one platform (it can be hosted everywhere) and even without the LiaScript interpreter the content is still readable and interpretable with every editor; you could even print or engrave it on stone or clay. Furthermore, if you use some kind of versioning system (e.g. git) you can refer to any previous version of your course.

> "Imagine a world where everyone would have the same access to high quality educational content for free."

> "No further hosting is required, no further compilation step, the JavaScript interpreter of LiaScript does everything else directly within the browser at client-side."

### Accessibility caveat (verbatim, from the Quizzes chapter's "Notes about Questions")

> "Not all of the previous examples we have shown were perfect in the sense of accessibility. Although these quizzes look good 'for us', they might not be perfectly for people that require a screen-reader to go through a course."

## Best-Usage Patterns

Each pattern below is grounded in a specific mechanism documented in one of the other reference files, not a generic assertion — the file/section is named so the mechanism can be checked directly.

### Mode selection: `Textbook` vs `Presentation` vs `Slides`

The `mode:` meta-header field (`syntax-core.md`'s Meta-Header table: "Default view: `Presentation`, `Slides`, or `Textbook`. User can still switch via the UI.") controls how the same content is exposed, and the two families behave differently for two mechanisms documented in `interactivity.md`'s Effects section:

- Animations/fragments (`{{n}}`, multi-block groups, etc.) are "revealed step-by-step with each click in `Presentation`/`Slides` mode; in `Textbook` mode every step is shown at once, each tagged with its step number."
- TTS-sync comments (`--{{n}}--`) are spoken aloud; rendering confirms `Presentation` hides `--{{n}}--` narration entirely while `Slides` shows it in a separate speaker-notes side panel — see `interactivity.md`'s TTS-sync comments section for the mechanism and `reference/presentation-pattern.md` for the full pattern.

Use `Presentation`/`Slides` for content authored as a click-through walkthrough — narrated, animated, timed reveals matter and the audience follows the author's pacing (e.g. a live lecture or guided demo). Use `Textbook` for longer, reference-style, or self-paced content meant to be read straight through: nothing is gated behind a click, and any TTS-sync narration degrades gracefully into ordinary visible text instead of disappearing. `interactivity.md` documents no behavioral split between `Presentation` and `Slides` for animation/fragment reveal (both share the click-driven reveal behavior above) — but rendering confirms a real split for TTS-sync comment (`--{{n}}--`) visibility specifically: `Presentation` hides the narration entirely, while `Slides` shows it in a separate speaker-notes side panel (see `interactivity.md`'s TTS-sync comments subsection). So the meaningful choice remains primarily `Textbook` vs. either of the other two, for pacing — with `Presentation` vs. `Slides` mattering specifically when the audience needs to *see* the narration text rather than just hear it.

For the concrete slide-construction pattern that makes one document work well in all three modes — pairing `{{n}}` bullets with `--{{n}}--` narration — see `reference/presentation-pattern.md`.

### Accessibility: give visual/audio-only cues a text equivalent

The verbatim caveat above is LiaScript's own admission that its quiz UI is not guaranteed screen-reader-accessible. Two concrete, already-built mechanisms exist to mitigate this rather than leaving a quiz's correctness signal purely visual:

- **Hints and Solution blocks** (`quizzes-surveys.md`'s "Tweaks (apply to every quiz type)" section) — `[[?]] hint text` lines and a Markdown block wrapped between two `***` lines are both plain, readable text explaining the reasoning or the answer, not just a checkmark/color state. For any quiz whose correctness is otherwise conveyed only by a checked box or a grid position (e.g. a Matrix-Quiz), attach hints and a solution block so a screen-reader user has a textual path to the same information a sighted user gets visually.
- **TTS-sync comments and the Playback button** (`interactivity.md`'s Effects section: `--{{n}}--` comments and `{{|>}}`/`{|>}{...}`) exist to carry spoken narration deliberately tied to specific content, not as decoration layered over content that already stands on its own. Use `--{{n}}--` to narrate the same point being made visually at that step (not a different, redundant remark), and use the always-visible `{{|>}}` Playback button for a paragraph that should be independently replayable as audio in every mode. Note that `interactivity.md` explicitly hedges the actual spoken-audio output (which voice is heard, in what order) as not independently re-verified in that session — the pattern here is about using the *mechanism* deliberately (its visibility/timing behavior is confirmed by rendering), not a claim that the audio output itself is guaranteed correct.

### Offline-first design: keep external `script:`/`link:` dependencies minimal

`syntax-core.md`'s Meta-Header table describes `script`/`link` as "External JS URL(s) to load before the course renders" / "External CSS URL(s)" respectively — every entry is a hard dependency the course must fetch before it becomes usable at all, and `interactivity.md`'s "Loading external resources" section confirms the same constraint for libraries used inside code blocks: "a library referenced from inside a `<script>` tag must be loaded via the `script:` meta-header field first... once loaded it is available globally to every code block on the page." `tooling.md`'s Publishing section states that "the interpreter doubles as a reader and installs as a Progressive Web App, storing documents and reading progress locally in the browser for offline use" — but that section is itself explicitly hedged ("None of the publishing/PWA/offline claims in this section were independently re-verified... taken directly from the freshly-fetched docs page"). Carrying that hedge forward rather than laundering it into a guarantee: keep the number and size of `script:`/`link:` entries minimal and prefer resources you control (bundle/self-host where practical) — an external CDN URL that is unreachable once a learner is offline is a single point of failure for a course whose whole pitch is durability-first, static-file distribution (per the Four Goals above).

### Narrator/TTS consistency: match `narrator` to `language`

`syntax-core.md`'s Meta-Header table documents `narrator` and `language` as two independent fields — `narrator` is the "Default TTS voice, e.g. `UK English Female`, `US English Male`. Overridable per slide/comment," while `language` is the "Locale code (e.g. `en`, `de`) — drives UI strings, typographic quotes, and the default translation target." Nothing in that table (or elsewhere in the reference files) indicates LiaScript derives one field from the other — they are set independently. Pick a `narrator` voice whose language matches the course's `language` field (e.g. don't pair `language: de` with `narrator: UK English Female`); a mismatch has the TTS engine reading the wrong-language text aloud in the wrong voice, likely mispronouncing it, since nothing else in the meta-header reconciles the two.

### Versioned imports: pin `import:` for a stable course

`interactivity.md`'s "Using Macros" section states the recommendation directly: "Prefer pinning a specific tag/commit in the `import:` URL over `master`/`main` for a course that needs to keep working unmodified." This matches the convention already used by the `lia-template` skill's Pattern 10 ("Versioned import (for stability in courses)"), which shows offering both a pinned URL (e.g. `.../Pyodide/0.3.5/README.md`) and a `master` URL side by side, and instructs template authors to "always offer both options to users." Applied from the course-author side: use a tagged/commit URL in `import:` once a course is done and should keep rendering identically indefinitely; use `master`/`main` only while actively co-developing the imported template alongside the course, since an unpinned import can silently change behavior (or break) whenever the upstream template's default branch is updated.
