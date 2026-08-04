# yunomúsica

**Version 2.10.2** — live at [yunomusica.com](https://yunomusica.com)

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

The banner is where the record gets *looked* at. The cover sits in it and also
behind it, blurred into a wash of its own colour; under the title a line cycles
through what else is known — year, genre, track number, where this one sits in
the queue. This is the one screen that fades anything: covers crossfade, the
title lifts in, the facts change on their own. Everywhere else the DOM is
swapped outright, which is right for a list being edited under a finger, and
`prefers-reduced-motion` turns all of it into a cut.

**The banner does not scroll — only the list does.** The deck is a column as
tall as the shell zone, and the queue is the box inside it that moves. What is
sounding should never be something you scroll back up to find.

That is also what makes **following** possible: when the scroll has been still
for ten seconds, the playing row comes back to the middle of the list and stays
there as the queue advances. Any scroll of yours re-arms the wait from zero —
while you are reading, the page is yours. The button on the queue header turns
it off, and the wait is configurable for people who read slower than ten
seconds:

```js
localStorage["yunomusica:follow_delay"] = 20    // seconds
```

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
- **The app asks about installing, not the browser.** Chrome's own install
  banner is refused (`beforeinstallprompt` is caught in `index.html`, before the
  bundle loads) and the event is kept, so the question is asked once by the app
  itself and `prompt()` opens the real system dialog on the user's tap. Answered
  either way it is never asked again; a small bar on the player screen is what
  remains. See "The install question" below for why this is not a nicety.
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
half of what is under test is what the build produces. One test —
`firefox` — drives a real **Firefox** instead, and it earns its keep: see
"The prompt that never answers" below. `npm test` builds `dist/`
if it is missing, generates the fixtures if they are missing, starts
`vite preview` if nothing is listening, and shuts it down afterwards.

| Test | What breaks if it goes red |
|---|---|
| `fallback` | a visitor lands in a language nobody chose |
| `navink` | nav and primary buttons disagree about black-or-white ink |
| `minink` | the mini-player's button, the one accent surface `navink` cannot see |
| `select` | browsing changes what is sounding |
| `confirm` | "Play all" eats a queue without asking |
| `install` | the app stops asking about installing itself |
| `storage` | a second tab costs the first one its storage |
| `firefox` | Firefox reads no music at all |
| `fitmobile` | something runs off the side of a phone |
| `preview` | the listening strip is unreadable, or its clock is the queue's |
| `follow` | the banner scrolls away, or the queue stops following the music |
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
| `src/install_prompt.js` | the deferred install event: is there an offer, and taking it |
| `src/install_dialog.js` | "do you want to install this?", asked once |
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
- A view that wants to hold part of itself still has to be **exactly as tall as
  the zone**: the shell gives it `flex: 1 0 auto`, and `height: 100%` is what
  turns that basis into the zone's height. Without it the view grows past the
  zone, the zone scrolls, and the "fixed" banner leaves with everything else.
- Fading anything requires the node to **survive the repaint**. The deck's
  banner is built once and updated in place for exactly that reason; a node
  thrown away and made again has no previous state to animate from.
- A programmatic smooth scroll emits the same `scroll` events a finger does. An
  auto-scroll that re-arms its own idle timer follows itself for ever.
- A `File` restored from IndexedDB **does not keep `webkitRelativePath`**. The
  path has to be stored beside it, or the tag cache misses on every single file.
- `createElement2` trims text nodes: the space between a figure and its noun
  comes from the CSS, not from the markup.
- The manifest carries **no `orientation`**, on purpose. `"any"` looks like "we
  do not care", but an installed PWA reads *any* value as the app claiming
  orientation control, and it overrides the device's rotation lock. Only the
  absence of the member defers to the user.
- **`beforeinstallprompt` has to be caught in the HTML head, not in the
  bundle.** It can fire while the module graph is still loading, and an event
  nobody caught cannot be asked for again.
- **A blocked IndexedDB open never fails and never succeeds.** It sits queued
  until the other connection goes away. Answer the caller `null` at `blocked`
  and keep the request: a retry issued alongside it queues behind it and hangs
  for ever, and throwing it away loses the repair.

## The prompt that never answers

`navigator.storage.persist()` is not the same call on every engine. Chromium
decides by itself and answers in a millisecond. **Firefox asks the user**, and
the promise it returns does not settle until the doorhanger is answered — which,
for a doorhanger nobody notices, is never.

The app awaited it before reading a folder, on the reasonable-sounding grounds
that you should ask for durable storage before writing anything. On Firefox that
meant the read never began: no walk, no tags, no tracks, a scan bar up for ever
over an empty library, and no error anywhere to say why. It shipped because the
whole suite was Chrome.

Durable storage is worth asking for, so the request is still made — but it is
waited on for no longer than an engine that answers by itself would take
(`DURABLE_WAIT`, 2 s), and the real answer updates the state whenever it lands.
Nobody's music waits on a prompt they have not seen.

The lesson generalises past this one call: **anything that can put a permission
prompt on screen is not a background operation**, and a feature that is merely
nice to have must never be able to block one the app cannot work without.

## A version bump is not free

Raising `DB_VERSION` costs storage to anyone with a second tab open. IndexedDB
will not upgrade a schema while another connection holds the old one: it fires
`blocked`, and until that tab goes away the new one can store nothing at all.

Two things make that survivable, and both are in `idb.js`:

- every connection sets `onversionchange` and **closes itself** when a newer tab
  needs to upgrade, so the next bump costs nobody anything;
- a blocked open answers `null` immediately but **keeps its request**, and adopts
  the database when it finally opens — so closing the other tab repairs the app
  where it stands, with no reload.

And the screen says which of the two it is. "This browser is not letting the app
store anything" is a true sentence that sends people into their privacy settings;
"another tab of this app is open with an older version" is the one that gets it
fixed.

## The install question

Leaving the offer to Chrome does not work, and the way it fails is quiet.

Chrome shows its install banner by a heuristic, and that heuristic **goes silent
on an origin for around ninety days** once the banner has been dismissed — or
once the app has been installed and then removed. The app is still perfectly
installable; it is only unadvertised. So the first install is offered and the
*re*install, days later, finds no banner at all and only `⋮ → Install app`,
which is not where anyone looks. Nothing in the app changed, and yet it looks
like it stopped being installable.

That matters more here than in most apps, because installing is what makes
Chrome keep folder permissions. An uninstalled yunomúsica re-asks for every
music folder at every launch.

So the app takes the question off Chrome:

- `index.html` calls `preventDefault()` on `beforeinstallprompt` and stashes the
  event before the bundle loads.
- `install_prompt.js` owns that event: whether there is a live offer, whether we
  are already running installed (`display-mode: standalone` or `appinstalled`),
  and calling `prompt()` on it.
- `install_dialog.js` asks — once, after the welcome dialog rather than on top
  of it, and never again whichever way it was answered (`install_asked` in
  prefs).
- Afterwards a small bar on the player screen is the whole of the offer. It
  closes for the session with an ✕ and comes back at the next launch.

`prompt()` must be reached from the click with nothing awaited in between, or
the browser stops counting it as a user gesture and refuses to open the system
dialog. That is why the dialog tears itself down synchronously and calls
`do_install()` after.

The deferred event is **single use**: once prompted it is dropped. If the user
dismisses the system dialog the offer is gone until Chrome fires the event
again, which it does on a later visit.

Browsers that do not implement this (Firefox, Safari) never fire the event, so
`can_install()` is false and nothing is ever offered — no dialog promising an
install that cannot happen.
