# Visuals

Three independent visualization mechanisms: **table→chart** (a Markdown table auto-rendered as an interactive ECharts diagram), **ASCII-Art** (a text drawing rendered as a real SVG image), and raw **SVG** (embedded directly, with LiaScript content injectable via `foreignObject`). A fourth section covers the character-based fine-tuning notation shared by the ASCII line-plot flavor of charts.

## Table → Chart Syntax

Any Markdown table is, by default, shown as a plain sortable table with a small toggle icon that switches to a chart view. LiaScript inspects the table's shape (numeric vs. text columns, duplicate first-column values, row/column counts, value-range spread) to guess which chart type fits, and renders it via a `lia-chart` web component (Apache ECharts). Attach settings by placing an HTML comment with `key="value"` pairs directly above the table — the same attribute-comment mechanism used for custom styling elsewhere (see `reference/syntax-core.md`).

```markdown
<!--
data-show
data-title="Government expenditure on education"
data-xlabel="year"
data-ylabel="% of GDP"
-->
| Year | Finland | USA | Germany |
| ---- | -------:| ---:| -------:|
| 1995 | 6.8     | 3.1 | 4.4     |
| 1996 | 6.9     | 3.3 | 4.5     |
```

Rendered and confirmed: `data-show` displays the chart immediately (no click needed to switch away from the table); `data-title`/`data-xlabel`/`data-ylabel` populate the chart's title and axis labels exactly as given; `data-xlim="1994,2000"` widens the x-axis beyond the data's own min/max (one side can be left blank, e.g. `data-xlim=",12"`, to auto-determine only that end) — all four confirmed together on one live chart, no console errors.

**Caution:** if you add an authoring note (an ignoreable `<!--- ... --->` comment) near a chart table, never place it directly above the attribute comment with no blank line between them — the Markdown parser merges adjacent raw HTML comments into a single block, which breaks LiaScript's attribute extraction and silently turns the whole comment+table run into literal unrendered text (confirmed live: no table, no chart). Always separate them with a blank line. See `reference/syntax-core.md`'s "Ignoreable comments" subsection for the full rule.

**Type list** — what triggers each, confirmed by rendering a representative table for every entry except `Map`/`None` (noted separately below):

| Type | Triggered by (per docs) | Rendering confirmed |
|---|---|---|
| `LinePlot` | First column all-numeric, no repeated value → treated as a function | Connected multi-series line chart with legend |
| `ScatterPlot` | Like `LinePlot`, but the first column has repeated values (not a function) | Disconnected dots, no connecting line |
| `BoxPlot` | Not auto-detected — force with `data-type="boxplot"` | Real box-and-whisker plot, one box per column |
| `BarChart` | First column has at least one non-numeric entry, and column maxima are close enough in scale | Grouped vertical bars, one group per row |
| `Radar` | Per docs: a `BarChart`-shaped table whose column maxima differ too much for a `BarChart` to stay readable | **Did not reproduce** — see hedge below; force with `data-type="radar"` instead |
| `PieChart` | Exactly one data row, all-numeric | Real pie sectors with labels; a non-numeric first cell in that row becomes the title/subtitle |
| `Funnel` | Not auto-detected — force with `data-type="funnel"` (same table shape as `PieChart`) | Pyramid/funnel shape, one layer per column |
| `Map` | Table structured like a `BarChart`, plus `data-src="<geojson-url>"` naming a GeoJSON file whose feature names match the first column | Needs external GeoJSON — **not independently re-verified here** (no network access at the time this reference was written); per docs only |
| `HeatMap` | Header and first column both purely numeric (coordinates); force with `data-type="heatmap"` otherwise | Colored grid with a color-scale legend; `data-title` applies here too |
| `Parallel` | Per docs: used automatically when a `BarChart` would need too many thin categories to stay readable | **Did not reproduce** — see hedge below; force with `data-type="parallel"` instead |
| `Graph` | Table is a square matrix: header row and first column list the same node names | Real node/edge diagram; symmetric matrix → undirected graph, asymmetric → directed (edge weight = cell value) |
| `None` | `data-type="none"` | Absence case — disables charting for that table entirely (also disables the first-column-fixed-while-scrolling behavior); nothing to render |

**`Radar` and `Parallel` auto-detection did not reproduce at the time this reference was written.** The docs describe both as automatic fallbacks once a `BarChart` would be unreadable (too-different column maxima for `Radar`; too many categories for `Parallel`). Rendering the exact example tables from the docs (a 3-column, 3-row animal dataset for `Radar`; a 7-column, 5-row country dataset for `Parallel`) produced a plain `BarChart` and a `Radar` chart respectively — not the documented type — with no console errors either way, so this looks like a genuine behavior difference in the tested LiaScript version rather than a fixture mistake. **Do not rely on the automatic heuristic for either type** — force them explicitly:

```markdown
<!-- data-show data-type="radar" -->
| Animal          | weight in kg | Lifespan years | Mitogen |
| --------------- | ------------:| --------------:| -------:|
| Mouse           |        0.028 |               2 |      95 |
| Flying squirrel |        0.085 |              15 |      50 |
| Brown bat       |        0.020 |              30 |      10 |
```

Both forced forms rendered correctly and were confirmed: `data-type="radar"` produced a proper multi-axis polygon per row (needs 3+ numeric columns for a readable shape — 2 columns degenerates to a straight line); `data-type="parallel"` produced a real parallel-coordinates plot, one vertical axis per column, one connecting line per row.

**Other confirmed attributes:**

- **`data-transpose`** — mirrors the table so rows and columns swap (e.g. grow a `PieChart`'s categories vertically instead of horizontally). Rendered and confirmed: a category-per-row table with `data-transpose` produced the identical pie chart (same title/subtitle from the two header cells, same sectors) as the equivalent category-per-column table without it.
- **`data-orientation="horizontal"`** — flips a `BarChart` (default vertical bars, categories on the x-axis) to horizontal bars with categories on the y-axis. Rendered and confirmed on the animal weight/lifespan/mitogen table.

**Attributes documented but not independently re-verified here** (per docs — apply cautiously, spot-check against your target LiaScript version): `data-src` (GeoJSON URL for `Map` — store it in your own project rather than an external host, to avoid CORS issues, per docs); `data-sortable` (toggles per-table or per-column sortability of the table view; `false`/`true`, settable globally in the table's main comment or overridden per header cell).

`data-type` accepts (case-insensitive): `bar`/`barchart`, `boxplot`, `funnel`, `graph`, `heatmap`, `line`/`lineplot`, `map`, `none`, `parallel`, `pie`/`piechart`, `radar`, `sankey`, `scatter`/`scatterplot`. `sankey` (a directed-flow diagram, same adjacency-matrix table shape as `Graph`) is documented but not independently re-verified here — included for completeness of the attribute's accepted values.

### Custom Diagrams with ECharts

For anything the table-driven mechanism can't express, drop to the underlying `lia-chart` web component directly and pass a full [Apache ECharts](https://echarts.apache.org) `option` object as a JSON-like string in the `option` attribute — not independently re-verified at the time this reference was written (no live-rendering check was run against this specific form), but it is the documented escape hatch when a table shape doesn't map to any of the built-in types:

```html
<lia-chart option="{
  title: { text: 'Custom ECharts diagram' },
  xAxis: { type: 'value' },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: [[0,0],[1,1],[2,4]] }]
}"></lia-chart>
```

`<script>` tags (standalone JS-Components, see `reference/interactivity.md`) can compute the `option` dynamically and inject it via `"HTML: <lia-chart option='...'></lia-chart>"`.

## ASCII-Art

A fenced code block tagged `ascii` (or fenced with 10+ backticks) is parsed by an embedded SvgBob-derived renderer and turned into a real SVG diagram — not literal text, not a raw code display. **The fence must sit at the left margin, unindented** — a 4-space-indented ` ```ascii ` fence is treated as an ordinary Markdown indented code block instead (rendered and confirmed the difference directly: the same content indented by 4 spaces displayed as plain literal text; unindented, it rendered as boxes-and-arrows SVG).

````markdown
``` ascii
+------+   +-----+   +-----+   +-----+
|      |   |     |   |     |   |     |
| Foo  +-->| Bar +---+ Baz |<--+ Moo |
|      |   |     |   |     |   |     |
+------+   +-----+   +--+--+   +-----+
              ^         |
              |         V
.-------------+-----------------------.
| Hello here and there and everywhere |
'-------------------------------------'
```
````

Rendered and confirmed: real boxes with rounded/square corners, filled arrowheads on every `-->`/`<--`/`^`/`V`, and a rounded speech-bubble-style box for the `.----.`/`'----'` shape — exactly matching the ASCII layout, as an actual SVG (inspectable, scales to full slide width), not a monospace text block.

**Drawing vocabulary** (per docs, consistent with the rendered example above): borders `-`, `_`, `|` (straight) and `\`, `/` (diagonal); corners `+` (square), `.`/`,`/backtick/`'` (rounded — visually identical in the output, only the ASCII source differs), `(`/`)` (curvy, for rounded/organic shapes like `( 3 )`), and `*`/`#`/`o`/`O` (filled dot / filled square / empty dot, usable as corners or arrow endpoints); arrows use `<`/`>`/`v`/`V`/`^`/`A` for direction plus the same `*`/`#`/`o`/`O` endings (direction-independent). Unicode box-drawing characters (`─│┌┐└┘├┤┬┴┼` etc., plus double-line and shading block variants) can be mixed in freely, and full Unicode/emoji is supported directly in the drawing.

**Styling** — an HTML-comment attribute block directly above the fence works the same as any other custom-styling target (see `reference/syntax-core.md`): `style="..."` can center the image, cap its width, or override the SVG's own `fill`/`stroke`. Rendered and confirmed on a small test box with `style="display: block; margin-left: auto; margin-right: auto; max-width: 315px; fill: red; stroke: green;"` above the fence: the resulting SVG was horizontally centered within its container and its border color was overridden to green (`fill: red` had no visible effect on this particular drawing since it only used unfilled border/corner characters — no `*`/`#`-style filled shape was present to show the fill override).

**Title** — a one-liner of Markdown/LiaScript placed after the language tag on the opening fence line becomes a caption shown below the image, same mechanism as a multi-file code-project's per-block title. Rendered and confirmed: `` ``` ascii  Fig.: A simple box with a caption `` produced the literal text "Fig.: A simple box with a caption" in the DOM directly below the generated SVG image:

````markdown
``` ascii  Fig.: Working with branches in git
new feature      .---#---.
                 |       |
development    .-o---o---o----o----o-.
main   *---*-+-*---*---*-------------*----
```
````

**Embedding LiaScript content** — wrap a one-liner or a multi-line block in double quotes `"` inside the drawing to overlay real, interpreted LiaScript/Markdown (math, quizzes, code blocks, animations, images via a macro) as a `foreignObject` positioned over the generated SVG. A single `"..."` pair is a one-liner; several lines whose quotes all start at the same horizontal column form one multi-line block. This is documented in detail with worked examples (animations, TTS-synced narration, gap-text quizzes needing a leading space before `[[`, and macro-based images to keep long URLs out of the drawing's width) — not independently re-verified at the time this reference was written; treat the mechanism as directionally correct per docs, but expect to hand-adjust quote positions/widths against your actual content, as the docs themselves note the placement is not pixel-precise.

## SVG

A raw, unfenced `<svg>...</svg>` block placed directly in the document body is rendered as a live SVG image — standard elements (`<circle>`, `<rect>`, `<line>`, `<path>`, `<text>`, `<defs>`/`<marker>`, ...) all work as plain SVG. **This must NOT be wrapped in a fenced code block** — a fenced `` ```svg `` (or `` ````svg ````) block displays as literal source code instead of rendering (confirmed directly: identical content wrapped in a 4-backtick `svg`-tagged fence rendered as a syntax-highlighted code listing; the same content as a bare `<svg>` tag in the body rendered as the actual image). The docs' own tutorial deliberately shows both forms side by side — a fenced "here's the markup" block followed by the unfenced live render — which is easy to misread as "either form renders"; only the unfenced form does.

```markdown
<svg viewBox="0 0 200 100">
  <circle cx="50" cy="50" r="40" fill="lightblue" stroke="blue" stroke-width="2"/>
  <text x="50" y="55" font-size="10" text-anchor="middle">SVG Circle</text>
  <rect x="110" y="10" width="80" height="80" fill="lightgreen" stroke="green" stroke-width="2"/>
</svg>
```

### `foreignObject`

`<foreignObject>` embeds real Markdown/LiaScript content (math, styled text, even other interactive elements) inside the SVG's coordinate space — `x`, `y`, `width`, and `height` are required and position/size it like any other SVG element. Rendered and confirmed on a labeled-circle diagram with three `foreignObject`s (a $$C = 2\pi r$$ display formula, an inline `$r$` label, and a $$A = \pi r^2$$ display formula): all three rendered as real, correctly-typeset KaTeX at their given positions over the circle/line/dot drawn with plain SVG shapes, no console errors.

```markdown
<svg viewBox="0 0 280 200">
<foreignObject x="130" y="0" width="200" height="80">
Circumference:

$$C = 2 \pi r$$
</foreignObject>
<circle cx="100" cy="100" r="80" fill="lightblue" stroke="blue" stroke-width="2"/>
<line x1="100" y1="100" x2="180" y2="100" stroke="red" stroke-width="2"/>
<foreignObject x="110" y="78" width="100" height="30"> Radius: $r$ </foreignObject>
</svg>
```

Per docs (not independently re-verified beyond the math case above): a `foreignObject` can hold anything LiaScript can render, including animations (`{{n}}` on a nested element), quizzes, and further nested SVGs. Because dark mode inverts LiaScript's default palette but not an SVG's hard-coded colors, explicitly set colors/background on the outer `<svg style="...">` rather than relying on defaults, per docs.

## Chart Fine-Tuning

A separate, lighter-weight plotting notation — distinct from the table-driven charts above — for quick line/scatter/dot plots written directly as ASCII text (no fence required; LiaScript detects the shape automatically). Indent by 4+ spaces so non-LiaScript Markdown viewers still show it as a preformatted block:

```markdown
    | r          *                                    (* stars)
    |    r                     A   A   A   A   A      (r imaginary course)
    |       r *      *       A   A   A   A   A   A    (A big triangles)
    |        * r       *
    |       *      r      *       *
    |      *            r    *
    |     *                 r
    |   *                          r
    | *                              *    r    *
    +-------------------------------------------
```

Rendered and confirmed: this produces a real ECharts line/scatter plot (not a monospace text block) with a legend built from the parenthesized `(char label)` comments — three distinct series ("stars", "imaginary course", "big triangles"), each in the color/shape/line-style implied by its character.

**How the character encodes appearance** — the same letter used for two-or-more points at a shared x-position becomes a dot cluster (a density/dot-plot) rather than a connected line, and case matters:

- **Color** — the character itself picks the color: `x`/`+`/`*`/`#` → black; single letters `a`–`z` map to a fixed palette (`r` red, `b` blue, `g` green, `y` yellow, `o` orange, `p` pink, `v` violet, `s` silver/gray, `e` ebony/brown, and others — full `a`–`z` table in the upstream docs, not reproduced verbatim here since it's a static lookup, not something worth re-verifying char-by-char).
- **Shape** — case and letter together pick a marker shape (e.g. `A`/`T`-family for triangles); `+`/`*`/`#` are plotted as their literal glyph.
- **Size** — uppercase renders larger than the lowercase form of the same letter. Rendered and confirmed with a controlled same-letter test (`r` on one row, `R` on another, nothing else): inspecting the two markers' SVG transforms directly (each point is an ECharts symbol positioned via a `matrix(scale,0,0,scale,x,y)` transform) showed `R` at scale `5` versus `r` at scale `2.5` — exactly double the radius, confirming the case-based size difference is real and not just a rendering-density illusion.
- **Line style** — per docs, dashed/dotted/smoothed line variants are also driven by the character choice; not independently re-verified beyond the dashed lines visible in the rendered example above (the default `*` series and the `A` series both rendered dashed, the `r` series solid).

Custom styling applies the same way as for `ascii` blocks — an HTML comment (`<!-- style="..." -->`) directly above the plot, e.g. to increase its height for a dense multi-character legend.
