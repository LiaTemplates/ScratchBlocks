# Quizzes & Surveys

LiaScript quizzes and surveys share the same bracket-based syntax: quizzes have a defined correct answer and a "check"/"show solution" UI; surveys are the ungraded, anonymous counterpart — same brackets, but instead of a solution you provide options, and the UI is a single "Submit" button with no right/wrong feedback. Per the official docs (not independently re-verified here — both claims require a live SCORM/LMS deployment or a live multi-peer classroom session, neither of which this sandbox can provide): if you export a course to SCORM, the state of quizzes, surveys, and tasks is stored in the LMS backend; if you use LiaScript's live-presentation classroom feature, quizzes and surveys can also be synced anonymously across connected peers.

## Quiz Types

Every quiz type is built from `[[ ]]` (checkbox-style) or `[( )]` (radio-style) bracket pairs. A quiz never "fails" — by default users can retry until solved or until they click "show solution"; only the number of trials is tracked. Starting dashes (`- [[X]] ...`) are optional for most types (see per-type notes below); everything also works with 4-space code indentation instead of a paragraph.

### Multiple-Choice

Checkboxes: `[[ ]]` unchecked, `[[X]]` or `[[x]]` marks a correct option (upper/lowercase both work). The user's checkboxes always start empty — the `X` only marks the answer key, revealed via "show solution" or matched when they check.

```markdown
- [[ ]] Empty means not checked
- [[X]] Uppercase X means checked
- [[x]] Lowercase x also means checked
```

### Single-Choice

Radio buttons: `[( )]` not selected, `[(X)]`/`[(x)]` marks the correct option. Multiple options may be marked correct — the user only has to select one of them.

```markdown
- [( )] Not selected
- [(X)] This one has to be selected
```

### Matrix-Quiz

Combines multiple- and multiple single-choice "vector" quizzes into one grid. The first line is a header of column labels (brackets `[...]` or parentheses `(...)`, used purely to let you nest the other bracket type as literal text inside a label). Each following row starts with either `[...]`(checkboxes, multiple-choice row) or `(...)` (radio buttons, single-choice row), followed by the row's label text.

```markdown
- [[male (der)] (female [die]) [neuter (das)]]
- [    [X]           [ ]             [ ]     ]  Mann - German for man
- [    ( )           (X)             ( )     ]  Frau - German for woman
```

The column widths in the header and body rows don't have to line up character-for-character — extra spacing is cosmetic only.

**Header brackets are literal text, not per-column type selectors.** Checkbox-vs-radio is controlled entirely per data row: each row's own *leading* bracket sets the input type for that whole row (`[` = checkboxes, `(` = radio buttons), and every cell within a single data row must use the same bracket style — a row cannot mix `[ ]` and `( )` cells. There is no way to make one column checkboxes and another column radio buttons; the grid is always uniform-per-row. Mixing bracket styles in the header row, expecting it to assign a type per column, does not work — the header always renders as plain text labels, ignored for typing purposes:

```markdown
- [[checkbox col] (radio col) [another checkbox col]]
- [    [X]           [ ]             [ ]     ]  Row A
- [    ( )           (X)             ( )     ]  Row B
```

This renders exactly the same as a uniform `[[checkbox col] [radio col] [another checkbox col]]` header would: three plain-text column labels, Row A as three checkboxes (its leading bracket is `[`), Row B as three radio buttons (its leading bracket is `(`). The mixed bracket styles in the header have no effect on input type at all.

### Text-Quiz

A free-text input compared against a solution string. Does not support a starting dash; indentation is optional.

```markdown
What did the fish say when he swam into the wall?

    [[dam]]
```

### Selection-Quiz

A dropdown built from `|`-separated options; the correct option(s) are wrapped in parentheses. Options can contain inline Markdown/LaTeX. Does not support a starting dash.

```markdown
What is the derivative function of $f(x) = x^6$?

[[ $f'(x) = 6$ | ( $f'(x) = 6x^5$ ) | $f'(x) = 5x^6$ ]]
```

### Gap-Text Extreme

Embed Text-Quiz (`[[solution]]`) or Selection-Quiz (`[[a|(b)|c]]`) patterns directly inline inside any Markdown block — the input becomes a normal inline element, so it can be wrapped in `**bold**`, `_italic_`, `~strike~`, etc., and its width matches the length of the placeholder text.

```markdown
__I (learn) [[  have been learning  ]] English for seven years now.__
```

**Text outside `[[...]]` is ordinary literal prose — it has no special meaning.** The `(learn)` above is not a hint, base-form marker, or any other recognized annotation; it just renders as plain parenthesized text sitting next to the blank. LiaScript has no syntax for attaching a hint or base-form directly next to a `[[...]]` blank this way. (Real hints are a separate mechanism — see Tweaks → Hints below — written as `[[?]] hint text` lines attached to the quiz, not as inline parentheses next to the blank.)

To accept more than one correct answer for a blank, use Selection-Quiz syntax and wrap **every** acceptable option in parentheses (not just one) — this turns the blank into a dropdown rather than free text, but any of the parenthesized options is then marked correct:

```markdown
__I [[ (have been learning) | ('ve been learning) ]] English for seven years now.__
```

### Generic Quizzes

`[[!]]` plus an associated `<script>` — for quiz logic that doesn't fit any built-in type. The script's last expression must evaluate to `true`/`false` to mark the quiz solved/unsolved; there's no visible input element unless your script/Markdown adds one.

```markdown
[[!]]
<script>
  const random = Math.random()
  random < 0.2
</script>
```

## Tweaks (apply to every quiz type)

- **Hints** — any number of `[[?]] hint text` lines (or `- [[?]] hint text` with dashes), revealed one at a time by the "show hint" button.
- **Solution** — a block of arbitrary Markdown wrapped between two lines of `***` (3+ asterisks), shown after the quiz is solved or resolved. Any Markdown/media/code is allowed inside. Note `***` has a second, unrelated meaning as the animation/fragment-grouping marker — see `reference/interactivity.md`'s Multi-block animation and `reference/syntax-core.md`'s Horizontal rule note. **There must be zero blank lines between the quiz's last element (the `<script>` block, a `[[?]]` hint, or the answer brackets) and the opening `***`** — a blank line there breaks the parser's ability to recognize the delimiter: the `***` renders as a literal horizontal rule/text instead of being consumed as the solution-block marker, and the "solution" content displays unconditionally instead of being gated behind Check/Show-Solution. A blank line before the *closing* `***` is fine.
- **Associated script** — a `<script>` block placed directly after the quiz. Its last statement must evaluate to `true`/`false` to mark the quiz solved/unsolved. `@input` is substituted as raw text before the script runs, so how you quote it changes what you get: wrap it in backticks/quotes (`` `@input` ``) to force it into a JS string — required for Text-Quiz/Gap-Text, since the user's raw unquoted text isn't valid JS on its own. Leave it unquoted (`@input`) to get the native value instead: a number for Single-Choice/Selection-Quiz (e.g. `1`; quoting these still works, it just gives you the string `"1"` instead), a real array for Multiple-Choice (e.g. `[1, 0, 1]`), or a nested array of arrays/numbers for Matrix-Quiz (e.g. `[[1, 0, 0], 1]`).

```markdown
What is $37 + 15$?

[[52]]
- [[?]] the solution is larger than 50
- [[?]] it is less than 55
- [[?]] it should be an even number
<script>
  let input = Number(`@input`)
  input === 52
</script>
***********************************************************************

52 is the correct solution.

***********************************************************************
```

Right vs. wrong — the only difference is the blank line before the opening `***`:

Wrong (blank line before the opening `***` breaks it):

```markdown
[[52]]
- [[?]] the solution is larger than 50

***********************************************************************
52 is the correct solution.
***********************************************************************
```

Right (no blank line before the opening `***`):

```markdown
[[52]]
- [[?]] the solution is larger than 50
***********************************************************************
52 is the correct solution.
***********************************************************************
```

## Survey Types

Surveys reuse quiz syntax but without a right answer: brackets contain option identifiers/placeholders instead of a solution, and the UI shows a single "Submit" button (no check/hint/solution machinery). The `@input`/scripting mechanics from quizzes still apply, see Surveys and Scripting below.

### Text-Inputs

A placeholder of 3+ underscores becomes a text field. A single group of underscores → one-line text input; multiple whitespace-separated underscore groups on the same placeholder → a multi-line `textarea`, and the *number of groups sets the textarea's row count* (the length of each individual underscore run doesn't matter, only how many groups there are).

```markdown
**This is a one-liner, you can use commas to separate your inputs:**

    [[___]]

Please describe your opinion in a few sentences:

    [[___   ___   ___   ___]]
```

**A single `[[...]]` always produces exactly one input field**, no matter how many underscores, spaces, or underscore groups are inside it — everything between the double brackets is placeholder content for that one field, consumed as a whole. `[[___   ___   ___   ___]]` above does not create four separate one-line inputs; it has 4 underscore groups, so it becomes one multi-line `textarea` with 4 rows. To collect several separate free-text answers, write several `[[___]]` placeholders as separate blocks — put the label/question for each field directly above that field, not one combined question over several fields — each becomes its own independent field (with its own Submit button):

```markdown
Name

    [[___]]

Vorname

    [[___]]
```

### Single-Choice Vector

Like a single-choice quiz, but each option is `[(identifier)]` — a numeric or textual identifier rather than a checkmark. Numeric identifiers let the classroom view plot results as a distribution; non-numeric identifiers are shown as categorical values. Identifiers don't need to be sequential.

```markdown
Select one option:

    [(1)] option 1
    [(2)] option 2
    [(3)] option 3
    [(0)] option 0
```

### Multi-Choice Vector

Like a multiple-choice quiz, but each `[[identifier]]` carries a variable name/number instead of a checkmark. Prefix identifiers with a number (`[[1 red]]`) to get a continuous/numeric classroom representation instead of categorical.

```markdown
What are your favorite colors?

    [[red]]         is it red
    [[green]]       green
    [[blue]]        or blue
    [[dark purple]] last chance ;-)
```

### Single-Choice Matrix

A Matrix-Quiz header/body, but using `(identifier)` column labels in the header (no checkmarks) — each row becomes an independent single-choice (radio) group.

```markdown
What is your opinion about LiaScript?

    [(totally)(agree)(unsure)(maybe not)(disagree)]
    [                                             ] LiaScript is great?
    [                                             ] I would use it to make online **courses**?
    [                                             ] I would use it for online **surveys**?
```

### Multi-Choice Matrix

Same idea, but with `[identifier]` column labels — each row becomes an independent multiple-choice (checkbox) group.

```markdown
    [[1][2][3][4][5][6][7]]
    [                     ] question 1 ?
    [                     ] question 2 ?
    [                     ] question 3 ?
```

### Surveys and Scripting

As with quizzes, attach a `<script>` after a survey to react to the submitted input or send it elsewhere. By default, an empty or whitespace-only input is treated as an error. The script's last statement controls the outcome: return `true` to accept, `send.lia("message", [], false)` to reject with a custom message, or plain `false` to reject silently. Use `alert(...)` to inspect `@input`'s shape while developing — `console.log` does not work here.

```markdown
Please enter some spaces at first:

[[___]]
<script>
  let input = `@input`.trim()

  if (input.length > 4) {
    true
  } else if (input.length == 0) {
    send.lia("Please enter some text", [], false)
  } else {
    send.lia("Please provide some meaningful input", [], false)
  }
</script>
```

### Classroom Experience

Per the official docs — this entire subsection describes a live, multi-peer feature that requires two or more connected browsers to exercise, which this sandbox can't provide, so none of the following claims (the peer-to-peer sync model, the "no central server" claim, the recommended/supported backends, and the exact `classroom:` header value spellings) were independently re-verified by rendering, unlike the quiz/survey syntax above. Treat them as per-docs and spot-check against your target LiaScript version before relying on them, matching the hedging convention used in `reference/interactivity.md`'s `LIA.classroom` coverage and `reference/tooling.md`'s Publishing section for the same class of claim.

If you're presenting a course live in the browser, LiaScript can open a peer-to-peer "classroom": connected viewers see the same anonymous, aggregated view of quiz and survey results (plus collaborative code editing and a chat that itself interprets LiaScript syntax). No central server stores data — state only exists while a peer is connected, backed by a distributed sync backend you select when opening the classroom (GunDB is the recommended option; other backends like Beaker are also supported).

The two Text-Input variants (see above) are aggregated differently in the classroom view: a one-line text input (single underscore group) is shown as a **word cloud**, with comma-separated terms across all submissions counted and sized by frequency — good for single-word/short-phrase answers. A `textarea` (multiple underscore groups) is shown as a list of each submitter's full response, one below another — good for longer free-text answers where you want to read full sentences, not aggregate keywords. Pick the field type with this in mind, not just for its row count.

- Disable classrooms for a course: add `classroom: disable` (or `classroom: false`) to the meta-header.
- Enable classrooms in a SCORM/IMS export (disabled by default there): add `classroom: enable` to the meta-header before exporting, and give the room a unique, quoted name so it doesn't collide with other courses.
