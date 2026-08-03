# yunomúsica

**Version 2.6.4** — live at [yunomusica.com](https://yunomusica.com)

A small, offline SPA for listening to the music already on your phone (or your
computer). You authorise a folder, it is read **here, on the device** — nothing
is copied and nothing is uploaded — and you build whatever queue you want out of
it.

Built with **Vite + Yuneta (`@yuneta/gobj-ui`)**: the declarative shell
`C_YUI_SHELL` + `C_YUI_NAV` provides the top bar and the menu (a side rail on
desktop, an icon bar at the bottom on mobile); the rest is five app gclasses and
three domain stores.

## The four screens

**Player** (home) — the first thing you see is the transport: play/pause,
previous, next, shuffle, repeat, the cover, the title of what is sounding and
the seek bar. Below it, **the queue**: what you loaded, in the order you want
it. Reorder it and take tracks out without stopping the music. It is the deck,
and it says whether what is playing is a **saved list** (by name, and whether
you have changed it since) or a queue put together by hand.

**Library** — five ways of looking at the same tracks (artists, albums, genres,
folders and the flat list), with a search box.

**Sources** — the authorised folders, and the only place music is added from.
This is where the app says out loud what it does with your disk: it copies
nothing, it takes a folder **whole** (that one and every folder below it), and
it tells you what your browser can and cannot remember.

**Lists** — the queues you saved with a name.

## Play is explicit

Browsing never changes what is sounding. Every other rule follows from that one:

- **Tapping a row** selects it and unfolds the rest of what is known about the
  track (album, genre, year, number, source and path). It is the one gesture
  that only looks.
- **▶ on a row** is a **preview**: it plays on its own audio element, pauses the
  queue, touches nothing, and offers the only decision worth offering — add it
  or drop it.
- **+ on a row** adds it to the queue.
- **"Play all"** on an album or an artist does replace the queue, which is why
  it **asks first** when there is something to lose. The dialog has three
  answers, not two: add, replace, or cancel. With an empty deck it asks nothing.

The queue survives a reload: which tracks, which list they came from, which one
was playing and how many seconds in. It is restored **paused** — a page that
starts making noise on its own is worse than one that restores nothing.

## What is stored, and what is not

Files are **never copied and never uploaded**. What goes into IndexedDB is a
*reference*:

- **Folder** (`FileSystemDirectoryHandle`, File System Access API): it survives
  a reload, so the folder is still listed and one click re-authorises it — no
  walking the tree again. A rescan picks up new files. **Chromium only** (Chrome,
  Edge, Chrome on Android).
- **Files** (the `File` objects themselves, also structured-cloneable): what
  every other engine and the loose-files picker get. The list is remembered, but
  it is a **snapshot**: files added to the folder afterwards do not appear. They
  go in chunks of 250 per record, because a single record holding thousands of
  `File`s exceeds the structured-clone limit and the write is refused.

A saved list is a set of `(source, path)` pairs, not audio. If its source is not
authorised in this session, the view says how many entries are missing instead
of quietly playing a shorter list.

### Scanning happens only when it has to

A folder is walked **when it is added and when you press Rescan**, not at start
up. The tags already parsed are kept by path, so opening the app **restores** the
library without opening a single file: measured, 0 walks and 0 reads against the
2 and 6 the first add costs. A restored track carries a path but no file; the
file is resolved **at play time**, walking down the folder's handle, which is
also the only moment the permission genuinely has to be there.

The price, worth knowing: **files you add to the folder from outside will not
appear on their own**. You have to press Rescan.

Of a tag, only **the tag** is read. The ID3v2 header is 10 bytes and states its
exact length, so that is all that gets read: across 300 files, 0.04 MiB instead
of the 150 MiB a fixed 512 KB slab per file used to cost.

## Languages and colours

Ten languages, all bundled (there is no backend to fetch them from): Spanish,
English, Chinese, Hindi, Arabic, Portuguese, Russian, Japanese, German and
French. Keys are lower-case English and the fallback is `en`, so a key nobody
has translated yet shows English rather than the bare key.

Arabic drives `dir="rtl"` onto `<html>`. The stylesheet is written with
**logical properties** (`inline-start`/`inline-end`, `text-align: start`), so the
interface mirrors itself: there is no second stylesheet and no `[dir]` rules to
keep in sync.

No string interpolates a number. Figures are painted as their own node next to a
plain noun (`12` + `tracks`), which keeps every language out of the plural-rule
business — Arabic alone has six forms.

Five **palettes**: gold, ice, rose, leaf, and *from the cover*, which is what the
app did before there were palettes and stays the default — the accent is tinted
with the dominant colour of the record playing. Choosing a palette turns that
tint off; going back to "from the cover" hands it back.

Each palette is defined **twice**, because a colour that reads well on white is
rarely the one that reads well on near-black: the dark-scheme block swaps in the
readable twin and the ink that goes on top of it. Contrast is measured by a test,
not judged by eye: all ten palette-and-scheme combinations clear 3:1 for the
accent against the page and 4.5:1 for ink on the accent.

## Also

- **ID3 tags** (v2.2/2.3/2.4 and v1) read with no dependencies, cover art
  included; a file without them is deduced from its name and its folder. Audio is
  recognised by extension **and by MIME type**, because Android hands over files
  whose display name carries no usable extension.
- **`MediaSession`**: system and headset controls.
- **Keyboard**: space, ←, →.
- **Installable PWA**: a manifest with 192/512 icons and a maskable one.
  Installing is not cosmetic: Chrome only offers persistent folder permissions to
  installed apps.
- **A scan bar** visible from every screen while a folder is being read, with the
  folder, a counter, a clock and a **Stop** button — which keeps what was already
  read.
- **New-version notice**: the build emits a `version.json` and the app compares
  its own stamp at start up and whenever the tab comes back to the front. Without
  it, a tab left open across a deploy goes on running the old bundle and the only
  symptom is that a fix "does not work".
- **Diagnostics** in Sources: which APIs the browser has, whether storage is
  durable, whether the last write landed, and per source how many files the walk
  handed over, how many were taken as audio, and whether a stored reference
  **can still be read**.
- The **welcome dialog** (what this is, how it works, credits) shows once,
  carries "do not show this again", and stays reachable from the toolbar and the
  player footer. It also carries the version and the build stamp.

## Development

```bash
npm install      # bulma, i18next and @yuneta/{gobj-js,gobj-ui} from the npm registry
npm run dev      # http://localhost:5173
npm run build    # production bundle in ./dist
npm run preview  # serves ./dist locally
```

The Yuneta libraries are consumed as versioned registry dependencies, not linked
to a checkout: `vite.config.js` has no aliases.

**The version is bumped on every change.** `vite.config.js` bakes `version` and
the build stamp in as constants and also emits them as `version.json`; both are
visible in the help dialog and in the diagnostics. That is what makes it possible
to tell, rather than guess, whether what is on screen is the latest deploy.

`package.json` is the one that counts — it is what gets built, shipped and
served at `/version.json`. The line at the top of this README is a copy for
whoever is reading the repo rather than the app, and goes up with it:

```bash
grep '"version"' package.json          # what is actually shipping
curl -s https://yunomusica.com/version.json    # what is actually deployed
```

## Tests

```bash
npm test                # the whole suite
npm test -- select      # just the ones whose name matches
npm run fixtures        # build the MP3 trees on their own (--force to rebuild)
```

Playwright driving a **real Chrome** (`CHROME_PATH`, default
`/usr/bin/google-chrome`) against the **built bundle**, not the dev server:
half of what is under test is what the build produces. `npm test` builds `dist/`
if it is missing, generates the fixtures if they are missing, starts
`vite preview` if nothing is listening, and shuts it down afterwards.

| Test | What breaks if it goes red |
|---|---|
| `fallback` | a visitor lands in a language nobody chose |
| `navink` | nav and primary buttons disagree about black-or-white ink |
| `minink` | the mini-player's button, the one accent surface `navink` cannot see |
| `select` | browsing changes what is sounding |
| `confirm` | "Play all" eats a queue without asking |
| `fitmobile` | something runs off the side of a phone |
| `e2e` | the whole walk: play, edit, save, Arabic, reload |

Two things they are strict about, both learned the hard way:

- **Console errors fail the run.** A test that passes while the console fills
  up has not passed.
- **Palette and theme are driven through the app's own menus**, never by setting
  `data-theme` from the test. Doing it from outside returns a style the browser
  has not recalculated: light and dark come back identical — which is impossible —
  and the test goes green over a broken app.

The MP3 trees are **generated, not committed** (`tests/fixtures.mjs`, ~7 MB, and
gitignored): silence from ffmpeg, ID3v2.3 tags written by hand, which also means
a tag the parser has to survive can be forged in one line. `ffmpeg` is the only
thing the suite needs that `npm install` does not bring.

## Deployment

`npm run build` leaves the static site in `./dist`. `deploy_yunomusica.sh` takes a
backup and rsyncs `./dist/` to the host
(`yunomusica.com:/yuneta/gui/yunomusica.com`). There is no backend: it is a pure
gobj tree with hash routing.

```bash
npm run build && ./deploy_yunomusica.sh
```

The vhost serves `.webmanifest` as `application/manifest+json` and revalidates
`index.html` on every request, so a redeploy is picked up immediately.

## Layout

| File | What it is |
|---|---|
| `src/main.js` | start up: registers gclasses and i18n, creates the yuno |
| `src/app_config.json` | the declarative shell: toolbar, menu and the four routes |
| `src/c_musica.js` | root service: shell, mini-player, scan bar, theme, palette, language, boot |
| `src/c_mus_deck.js` | **Player**: transport on top, queue below |
| `src/c_mus_view.js` | **Library**: the five groupings and their drill-down |
| `src/c_mus_sources.js` | **Sources**: authorised folders, permissions, rescan, diagnostics |
| `src/c_mus_lists.js` | **Lists**: the saved queues |
| `src/about_dialog.js` | the welcome / help / credits dialog |
| `src/confirm_replace.js` | "replace what is on the deck?" — add, replace or cancel |
| `src/update_check.js` | is this tab still running the deployed bundle? |
| `src/music_store.js` | domain: ID3, library, queue, preview and playback |
| `src/sources_store.js` | the authorised sources, their recursive walk and their diagnostics |
| `src/playlists_store.js` | the saved lists and how they resolve |
| `src/idb.js` | the minimal wrapper over IndexedDB |
| `src/locales/` | `locales.js` plus the ten translation files |
| `src/musica.css` | the app's styling, palettes included |
| `tests/run.mjs` | the runner: build, fixtures, server, one line per test |
| `tests/lib.mjs` | browser, booted app, the two colour-maths functions |
| `tests/fixtures.mjs` | generates the three MP3 trees the suite plays against |

## A few things that are expensive to work out twice

- The shell lays its views out as `.yui-zone-center > * { flex: 1 0 auto }`: they
  are **flex items with `shrink: 0`**, so a view without `width: 100%` is sized by
  its own content and never comes back down. One long unbreakable string — a
  path, a list of folder names — then carries the view off the side of a phone.
  Same story with `min-width: auto` on grid items.
- A `File` restored from IndexedDB **does not keep `webkitRelativePath`**. The
  path has to be stored beside it, or the tag cache misses on every single file.
- `createElement2` trims text nodes: the space between a figure and its noun
  comes from the CSS, not from the markup.
- The manifest carries **no `orientation`**, on purpose. `"any"` looks like "we
  do not care", but an installed PWA reads *any* value as the app claiming
  orientation control, and it overrides the device's rotation lock. Only the
  absence of the member defers to the user.
