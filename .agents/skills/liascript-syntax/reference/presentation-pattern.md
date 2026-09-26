# Presentation Pattern

A LiaScript course can be built once and rendered as either a click-through, narrated presentation or a straight-through reading document, from the *same* Markdown source, via the `mode:` meta-header field (`Presentation`/`Slides` vs `Textbook` — see `philosophy-patterns.md`'s "Mode selection" pattern for when to pick which). The official docs state the goal for this directly: "You need to balance these features properly so that your course can be read in Textbook mode and used for presentations and more." This file documents the concrete construction pattern that achieves that balance — illustrated by a fuller worked example at `docs/examples/powerpoint-style/README.md` if present in your checkout — and what verified rendering confirms about how it behaves in each mode.

## The core construction: one heading, paired bullets and narration

Structure each `#`/`##`/`###` slide as: the heading, then a sequence of `{{n}}`-tagged blocks (see `interactivity.md`'s Effects section for the underlying block-animation mechanics), each one immediately followed by a `--{{n}}--` comment carrying the spoken explanation of that same block — same step number, same order, one narration paragraph per bullet:

```markdown
## Slide Title

     {{1}}
* First point, revealed on the first click

          --{{1}}--
Spoken explanation of the first point.

     {{2}}
* Second point, revealed on the second click

          --{{2}}--
Spoken explanation of the second point.
```

Keep the pairing 1:1 — a `{{n}}` bullet with no matching `--{{n}}--` is fine (a silent reveal), but a `--{{n}}--` with no matching `{{n}}` is a documented failure mode (see `interactivity.md`'s "`--{{n}}--` is the narration half of the `{{n}}`/`--{{n}}--` pair" warning): the narration never gets a visual anchor, and produces no visual reveal in the slide body outside Textbook mode.

## Step 0: framing content outside the click sequence

Plain content with no `{{n}}` tag at all is never gated behind a click — it's part of the slide's static frame, visible immediately in every mode. `--{{0}}--` (narration with no matching visual bullet) is the deliberate exception to the 1:1 pairing rule above: it's the natural place for a slide's opening remark, spoken before the first click, without needing a throwaway `{{0}}` bullet to anchor it to. That worked example (where present in your checkout) uses this at both ends of the deck — a `--{{0}}--` welcome note on the title slide, and a `--{{0}}--` closing "thank you" on the last one.

## Mode visibility, and the balance/step-0 patterns confirmed

Rendered and confirmed, this is how `--{{n}}--` narration visibility actually behaves per mode:

| Mode | Narration comment (`--{{n}}--`) visible in place? |
|---|---|
| Textbook | **Yes** — renders inline as ordinary, unstyled paragraph text directly under the heading, alongside the fragment text, with no gating. Confirmed by rendering. |
| Presentation | **No** — present in the DOM (so a naive `innerText`/text-search check reads `true`) but wrapped in a `div.translate.hidden-visually.lia-tts-N` container: a visually-hidden CSS technique (collapsed to `1px × ~22px`, `display:block`, `visibility:visible`, but not legible/visible to a sighted viewer). No speaker-notes panel exists in this mode at all. |
| Slides | **In a side panel** — shown in a dedicated, genuinely visible speaker-notes side panel (`aside.lia-notes`, real layout, e.g. `315×848px`, `display:flex`, `visibility:visible`), docked at the right edge of the viewport. Separate from the main slide body, not inline like Textbook mode. (The panel's container carries a `hide-lg-down` responsive class — narrow-viewport/mobile behavior wasn't independently tested.) |

**Balance pattern — confirmed.** In `Textbook` mode all three bullets and their narration markers render simultaneously, each tagged with its own step-number badge. In both `Presentation` and `Slides` mode the bullets are step-gated: before any click, no bullet text exists in the DOM at all; after one "next" click, only the first bullet appears (with a real rendered box) while the second and third remain completely absent as DOM text nodes.

**Step-0 pattern — confirmed.** Ungated content (`INTRO-PARAGRAPH-MARKER`, no `{{n}}` tag) is visible immediately in all three modes, including before any click in `Presentation`/`Slides`. A `{{1}}`-gated fragment is absent from the visibly rendered page in both `Presentation` and `Slides` prior to the first click, while `Textbook` mode — which doesn't gate `{{n}}`/`--{{n}}--` content — shows everything immediately, as expected. `--{{0}}--` narration itself follows the same per-mode visibility rule as any other `--{{n}}--` comment (see table above) — it isn't a special case for visibility, only for *not requiring* a matching `{{n}}` bullet.

## Checklist

- [ ] One heading per slide — don't cram multiple unrelated topics under one `#`/`##`.
- [ ] Every `{{n}}` bullet that needs spoken narration gets its own `--{{n}}--` at the same `n`, directly below it.
- [ ] Never write a bare `--{{n}}--` without a matching `{{n}}` bullet (except `--{{0}}--` — see Step 0 above) — it silently produces no visual reveal in the slide body outside Textbook mode.
- [ ] Use `--{{0}}--` (or ungated plain text) for framing remarks that shouldn't wait for a click.
- [ ] Preview the course in all three modes before publishing — `Presentation`/`Slides` for the live-narrated flow, `Textbook` for the self-paced reading flow — per the docs' own instruction to "balance these features properly."
