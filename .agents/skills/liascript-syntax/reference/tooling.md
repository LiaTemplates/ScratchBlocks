# Tooling

The CLI/editor/hosting ecosystem around LiaScript: a local dev server for live-reloading preview, an exporter for packaging courses into SCORM/PDF/EPUB/etc., a handful of editors with LiaScript-aware preview, and a hosting model built entirely on static raw-text URLs (no backend, no build step).

## Running a Course Locally

`@liascript/devserver` (npm package; CLI binary `liascript-devserver`) serves a local folder as a live-reloading LiaScript course. Confirmed installed and run directly in this environment:

```
$ liascript-devserver --version
DevServer: 1.2.10
LiaScript: 1.1.0
```

Flags, confirmed via `liascript-devserver --help`:

```
liascript-devserver [-i input] [-n hostname] [-p port] [-l] [-o] [-t] [-r responsiveVoice-key]
```

| Flag | Long form | Meaning |
|---|---|---|
| `-h` | `--help` | show help |
| `-v` | `--version` | show version info |
| `-i` | `--input` | input `README.md` file or folder (default: `.`) |
| `-n` | `--hostname` | hostname of the server (default: `localhost`) |
| `-p` | `--port` | port number (default: `3000`) |
| `-l` | `--live` | live-reload the browser on file change |
| `-o` | `--open` | open the course in the default browser |
| `-t` | `--test` | test online on `https://LiaScript.github.io` |
| `-r` | `--responsiveVoice` | enable ResponsiveVoice TTS support, optionally passing your own key; per `--help`, this can slow down reload speed |

Typical usage: run `liascript-devserver -l -o` from a course's project root (the folder containing its `README.md`) to open it in the browser with live reload on save.

## Exporting

`@liascript/exporter` (npm package; CLI binaries `liaex` and `liascript-exporter`, same tool) packages a LiaScript course into a target format — SCORM for LMS import, PDF/EPUB/DOCX for static documents, a self-contained web bundle, etc. Confirmed installed in this environment (`/usr/local/bin/liaex`, `/usr/local/bin/liascript-exporter`) and live-verified via `liaex --help` and `liaex -f presets`:

```
$ liaex --version
version: 3.3.6--1.0.10
```

Core usage:

```
liaex -i <input.md> -f <format> -o <output-name>
```

Core flags (confirmed live):

| Flag | Long form | Meaning |
|---|---|---|
| `-h` | `--help` | show help |
| `-i` | `--input` | input file |
| `-p` | `--path` | path to be packed (defaults to the input file's path) |
| `-o` | `--output` | output file name (default `output`; extension is set by the format) |
| `-s` | `--style` | inline styling override, e.g. `"height: 100vh; width: 100%; border: 2px;"` |
| `-f` | `--format` | output format (see table below; default `json`) |
| `-v` | `--version` | show exporter version |
| `-k` | `--key` | ResponsiveVoice key |
|   | `--git-url` | clone a git/GitHub repo and export from it, instead of `-i` |
|   | `--git-branch` | branch/tag to checkout with `--git-url` (default: repo default) |
|   | `--git-subdir` | subdirectory within the cloned repo to use as root |
|   | `--git-file` | specific Markdown file within the repo (default: `README.md` or first `.md` found) |

**Formats accepted by `-f`** (confirmed live, exactly this list — note this is narrower than it looks, since xAPI/RDF/project support are layered on via separate flag namespaces rather than being `-f` values of their own):

`scorm1.2`, `scorm2004`, `json`, `fullJson`, `web`, `ims`, `pdf`, `epub`, `docx`, `android`, `linkedData`, `presets`

Each format has its own namespaced flags (all confirmed live via `--help`, not independently exercised end-to-end at the time this reference was written — i.e. the flags are real and documented by the tool itself, but no actual export was run to confirm output correctness):

- **SCORM** (`scorm1.2`/`scorm2004`): `--scorm-organization`, `--scorm-masteryScore` (0–100, default 0), `--scorm-typicalDuration` (default `PT0H5M0S`), `--scorm-iframe`, `--scorm-embed` (for Moodle 4's dynamic-loading restrictions), `--lia-subfolder` (keep SCORM spec files at the root, course content in a `content/` subfolder)
- **IMS** (`ims`): `--ims-indexeddb`
- **Web** (`web`): `--web-iframe`, `--web-indexeddb` (optionally with a key), `--web-zip`
- **Android** (`android`, via Capacitor, requires the Android SDK): `--android-sdk`, `--android-appName`, `--android-appId`, `--android-icon`, `--android-iconBackgroundColor[Dark]`, `--android-release`, `--android-bundle`, `--android-keystore`/`--android-keystorePassword`/`--android-keyAlias`/`--android-keyPassword` (or `KEYSTORE_PASSWORD`/`KEY_ALIAS`/`KEY_PASSWORD` env vars), `--android-preview`
- **PDF** (`pdf`, via Puppeteer/headless Chrome): `--pdf-stylesheet`, `--pdf-theme` (`default`/`turquoise`/`blue`/`red`/`yellow`), `--pdf-timeout` (default 15000ms), `--pdf-preview`, plus a full set of Puppeteer `page.pdf()` passthroughs (`--pdf-scale`, `--pdf-displayHeaderFooter`, `--pdf-headerTemplate`/`--pdf-footerTemplate`, `--pdf-printBackground`, `--pdf-landscape`, `--pdf-pageRanges`, `--pdf-format`, `--pdf-width`/`--pdf-height`, `--pdf-margin-*`, `--pdf-preferCSSPageSize`, `--pdf-omitBackground`)
- **EPUB** (`epub`, via Puppeteer + `@lesjoursfr/html-to-epub`): required `--epub-title`, `--epub-author`; optional `--epub-publisher`, `--epub-cover`, `--epub-description`, `--epub-language` (default `en`), `--epub-version` (2 or 3, default 3), `--epub-stylesheet`, `--epub-theme`, `--epub-toc-title`, `--epub-hide-toc`, `--epub-timeout` (default 15000ms), `--epub-fonts`, `--epub-chapter-title`, `--epub-preview`
- **DOCX** (`docx`, via Puppeteer + `@turbodocx/html-to-docx`; compatible with Word 2007+, LibreOffice Writer, Google Docs): `--docx-title`, `--docx-author`, `--docx-subject`, `--docx-description`, `--docx-language` (default `en-US`), `--docx-orientation` (`portrait`/`landscape`), `--docx-font` (default Arial), `--docx-font-size` (half-points, default 22 = 11pt), `--docx-header[-html]`, `--docx-footer[-html]`, `--docx-page-number`, `--docx-stylesheet`, `--docx-theme`, `--docx-timeout` (default 15000ms), `--docx-preview`
- **Linked data / RDF** (`linkedData`): `--rdf-format` (`n-quads`/`json-ld`, default `json-ld`), `--rdf-preview` (print to console), `--rdf-url`, `--rdf-type` (defaults to schema.org `Course`), `--rdf-license`, `--rdf-educationalLevel`, `--rdf-template`
- **xAPI tracking** (layered onto other formats, not a standalone `-f` value): `--xapi-endpoint` (LRS URL), `--xapi-auth`, `--xapi-actor` (default anonymous), `--xapi-course-id`/`--xapi-course-title`, `--xapi-mastery-threshold` (default 0.8), `--xapi-progress-threshold` (default 0.9), `--xapi-debug`, `--xapi-zip`
- **Project bundles**: multiple LiaScript resources bundled into one overview page from a `project.yaml` description (example: `https://github.com/LiaBooks/liabooks.github.com/blob/main/project.yaml` → `https://liabooks.github.io`); flags include `--project-no-meta`, `--project-no-rdf`, `--project-no-categories`, `--project-category-blur`, `--project-generate-scorm12`/`-scorm2004`/`-ims`/`-pdf`/`-android`/`-epub`/`-docx`/`-xapi` (auto-generate that format per card), `--project-generate-cache` (skip regenerating existing files), `--project-search` (full-text fuzzy search across courses)

**Git-based export** — export directly from a repository instead of a local `-i` file, using `--git-url` (+ optional `--git-branch`, `--git-subdir`, `--git-file`).

**Presets** — pre-configured bundles of format + flags tuned for specific LMS platforms, confirmed live via `liaex -f presets`:

```
liaex -f presets                                    # list all presets
liaex -f presets --moodle3                          # show one preset's configuration
liaex -i course.md -f presets --moodle3 -o output   # export using that preset
liaex -i course.md -f presets --moodle3 --scorm-organization "My Org" -o output  # override a preset default
```

Confirmed available presets (each SCORM-based): `moodle3`, `moodle4`, `moodle5` (SCORM 1.2, embed mode, per Moodle major version), `ilias` (SCORM 1.2), `opal` (SCORM 1.2), `scormcloud-1.2`, `scormcloud-2004`, `openolat` (SCORM 1.2), `openedx` (SCORM 2004, via the SCORM XBlock), `learnworlds` (SCORM 2004, iframe mode + masteryScore).

There's also a `serve` mode with a browser-based export UI: `liaex serve [--port PORT] [--no-browser]` (default port 3000, opens the browser by default) — not exercised at the time this reference was written.

## Editors

Per the LiaScript docs' Tools page (fetched fresh, not independently re-verified beyond what's stated there):

- **LiveEditor** — `https://liascript.github.io/LiveEditor` — fully browser-based, no installation, supports uploading images/videos and collaborative editing.
- **VS Code** — two official extensions: `liascript-preview` (toggle with `Alt+L`, updates the rendered course on save) and `liascript-snippets` (fuzzy-search snippet helper, triggered by typing `lia`). Install guide: `https://liascript.github.io/blog/install-visual-studio-code-with-liascript/`.
- **VS Code Web** (github.dev) — the `liascript-preview-web` marketplace extension.
- **Atom** — same pair of extensions and the same `Alt+L` toggle as VS Code. Install guide: `https://liascript.github.io/blog/install-atom-with-liascript/`.
- **CodiLIA** — a fork of the collaborative editor CodiMD/HedgeDoc with built-in LiaScript preview, for real-time multi-author editing: `https://github.com/liascript/codilia`.

## Publishing

LiaScript courses are plain Markdown/HTML files interpreted entirely client-side — there is no build step and no backend. Per the docs (fetched fresh):

- **Hosting model**: put the course's Markdown file somewhere publicly reachable as raw text — a GitHub repo (`README.md`), DropBox, ownCloud, NextCloud, or any plain web space — and view it through the LiaScript interpreter by passing the raw file's URL to the viewer:

  ```
  https://LiaScript.github.io/course/?<raw-course-url>.md
  ```

  Slides can be deep-linked with a trailing `#<n>`, e.g. `https://liascript.github.io/course/?https://raw.githubusercontent.com/liaScript/docs/master/README.md#5`.

- **GitHub workflow**: create a (free) GitHub account, commit the course Markdown, and link to it via the raw-URL viewer pattern above. Tagging the repo `liascript`, `liascript-course`, or `liascript-template` makes it discoverable via GitHub's topic pages (`github.com/topics/liascript`, `.../liascript-course`, `.../liascript-template`).
- **No backend required**: "No further hosting is required, no further compilation step, the JavaScript interpreter of LiaScript does everything else directly within the browser at client-side" — and per the docs, no course or user-progress data is stored server-side.
- **Offline / PWA**: the interpreter doubles as a reader and installs as a Progressive Web App, storing documents and reading progress locally in the browser for offline use.
- **LMS embedding**: for importing into an LMS (Moodle, ILIAS, OPAL, etc.), the docs recommend embedding the hosted course via an external-website link or `iframe` — this is the lightweight alternative to a full SCORM/IMS package built with the exporter (see `## Exporting` above).

None of the publishing/PWA/offline claims in this section were independently re-verified by actually deploying a course at the time this reference was written (no network access) — they're taken directly from the freshly-fetched docs page and hedged accordingly, unlike the devserver/exporter CLI flags above, which were confirmed against live `--help`/`--version` output and, for presets, a live command run.
