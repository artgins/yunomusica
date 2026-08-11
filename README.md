# yunomúsica

**Version 2.15.0** — live at [yunomusica.com](https://yunomusica.com)

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

### What is sounding, drawn from the sound

Beside the title (under it on a phone) there is a live picture of the audio
itself — not an animation that runs while music happens to be playing. It is
read off the samples on their way to the speakers, so it stops dead when they
do. **Tapping it** moves to the next one, and the choice is remembered:

| | |
|---|---|
| **Flight** | two or three **snakes** weaving: a few voices followed over time, each a smooth line crossing the others. The one that **picks** instead of showing everything — see below |
| **Notes** | a ribbon running leftwards, one column per frame, one row per semitone from C3 up. It draws the **ridges**: a semitone only when the spectrum peaks on it |
| **Spectrum** | the same 48 bands standing up, with a peak that holds and falls |
| **Wave** | the waveform, triggered on a rising zero crossing so it stands still instead of skidding |
| **Chroma** | the twelve pitch classes with the octaves folded together, around the **circle of fifths** — consonant intervals end up adjacent, so a chord is a compact shape and a key change is that shape rotating |
| **Off** | nothing, and no animation frame asked for either |

### Flight

The other four draw everything that is there and leave the eye to do the
picking. This one picks a handful of things and follows them: **two to four
snakes**, each a voice, gliding across the picture and crossing each other,
fading into the past over about three seconds.

What makes them snakes rather than marks is **memory**. Every other mode draws
whatever the current frame holds and forgets it; a snake is matched to the peak
nearest where it already was, so it stays the same snake while the tune moves
under it — which is why two lines *cross* instead of swapping. A voice that
stops for a breath keeps its snake for half a second before it is given up on.

Two things make the line sinuous, and neither is invented:

- **The pitch is read between the semitones.** A peak snapped to its row can
  only sit on twelve heights per octave, so vibrato and every slide between two
  notes vanish and the line comes out as a staircase. Three points around a
  maximum define a parabola, and its vertex is a far better estimate of where
  the peak really is. What ripples along a held note is a singer's vibrato,
  measured.
- **It glides.** Each snake moves a fraction of the way to its peak per frame
  rather than jumping, and the path is drawn as a spline through the midpoints
  rather than as a polyline through the samples. A step between two notes reads
  as an S instead of a corner. That is smoothing of real data: no snake goes
  anywhere the sound did not.

**The hue is the pitch.** A note is always the same colour and a key change
moves the whole picture through the wheel. This is the one thing in the app
that does not take its colour from the palette — a deliberate exception, and
the point of the mode: colour carrying meaning is worth more here than colour
carrying the palette.

**What it is not.** There is no source separation and none is claimed. A snake
follows a *peak*, which most of the time is a voice or an instrument holding a
line, and sometimes is a harmonic of one wandering off on its own.

Its peak-picking is **deliberately looser than the ribbon's**. `notes` draws
every ridge it finds, so it has to reject anything that might be noise; here
only the strongest few are ever used and a peak has to be strong to start a
snake at all, so the same prominence test did nothing but harm — measured
against gliding tones it rejected every peak in most frames, the snakes starved,
and all of them died and restarted together about once a second.

**"Notes" is not a transcription, and does not pretend to be.** It is the
spectrum folded onto semitones: the energy that fell inside each semitone's
band. One note lights its own row *and* the rows of its harmonics, which is a
true statement about the sound and not a chord. It starts at C3 (130.8 Hz)
because at 8192 bins the FFT resolves 5.4 Hz and a semitone down there is 7.6 Hz
wide — one bin. Below C3 the answer would be shared out between neighbours, so
it is not offered.

**It draws ridges, not everything.** Drawing every band above a fixed threshold
is what the first version did, and music lights every band to some degree —
harmonics, broadband noise, the skirts of each note — so it came out as a fog
with the notes buried in it, in thick fuzzy stripes. Three things fixed that:

- a semitone is drawn only where the spectrum **peaks** on it, and only when
  that peak **stands out** from its neighbours — a recording's noise floor is
  bumpy and produces ridges too, shallow ones, while a real note falls away
  sharply on both sides;
- the scale is a ceiling that **rises instantly and falls slowly**, so the
  picture is drawn against what is sounding now rather than against what the
  format could hold. A fade-out still reads as one; a quiet passage does not
  disappear;
- every row is snapped to **whole pixels**. 48 rows over 118 device pixels is
  2.46 each, so every band used to land on a fraction and get antialiased into
  its neighbours. That was the blur.

The same picture runs **behind the mini-player's strip** when you are not on the
deck — a layer, not a box, because that strip is 68 px tall and its width is
already spoken for by the cover, the name and three buttons. It carries no tap
of its own: the strip's gesture takes you to the deck and a second one competing
for the same pixels would be a trap. The mode is one setting, so changing it on
the deck changes it there too.

**Headroom in the analyser is not a detail.** `maxDecibels` is the level that
maps to the top of the byte range, and everything above it maps there too. At
−25 a loud master pins whole neighbourhoods of the spectrum at the ceiling, and
a plateau has no peaks in it — so the ridge tests every drawing here depends on
reject every band and the picture goes blank on exactly the tracks with the most
going on. It sits at −12, and the running ceiling in each renderer takes care of
the contrast that costs on a quiet track.

**The ink is measured, not assumed.** The picture is drawn in `--mus-accent`,
and under the default palette that accent is taken from the record's artwork.
The lift applied there puts the brightest channel at 235, which is right for a
button carrying its own dark ink and wrong for a line drawn straight onto a
near-white card: a pale or nearly grey cover produces a pale accent, and a pale
accent on a light card is a picture that is drawn perfectly and seen by nobody.
Nothing is broken in that case and nothing says so — it just looks dead. So the
contrast is measured at run time and the colour is pushed away from the ground,
keeping its hue, until it clears 2.2:1. The `tones` fixture's album carries a
colourless cover on purpose, so every assertion in the `viz` test runs against
the worst accent the app can produce.

Somebody who asked for less motion gets it **off** by default, collapsed to a
strip they can still tap if they want it. And there is a hatch for the day a
browser makes the whole trade a bad one:

```js
localStorage["yunomusica:viz"] = "off"    // never tap the audio at all
```

### The scrub bar

The bar under the banner is a bar you can **aim at**: 44 px tall, dragged with a
thumb, with the clock inside it instead of on a line of its own. It draws
**what has sounded** — the loudness of every moment, taken from the same tap,
twenty-five times a second and filed against its position in the track. It
fills in behind the playhead as the music goes by.

Ahead of the playhead there is a flat line, and that is the honest answer. A
deck in a booth draws the whole track because it read the whole file first;
doing that here means decoding a five-minute file into tens of megabytes of PCM
on a phone, for every track, before a note is heard — in an app whose whole
claim is that it opens what it plays and nothing else.

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

- **Tapping the name** opens the track's card: the whole title, everything else
  known about it (album, genre, year, number, source and path), and its two
  counts. It is the one gesture that only looks.
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

## Two numbers on a track, and the card that shows them

Beside every name, on both screens that list tracks, there are two counts:

- **▶ how often it has been listened to.** A track counts once it has really
  sounded — twenty seconds, or half of it when it is shorter than forty. What is
  added up is the time that *actually played*: the store believes the difference
  between two readings of the clock only when it is the size of a tick, so
  skipping past a track adds nothing and neither does dragging the scrub bar
  across it. A **preview** never counts, which is what a preview is for.
- **♥ how many hearts you have given it.** A number, not a flag — loving one
  song twice as much as another is a thing people mean, and a heart that only
  toggles cannot say it. One tap on the row gives one. Taking them back is not
  on the row, because a row is where fingers land by accident; that is on the
  card, next to the number it changes.

**Tapping the name opens the card.** It exists because of the title: a row gives
a name one ellipsised line — about twenty characters on a phone — and there was
nowhere to read the rest of it. On the card the title is the heading, it wraps,
and it is the one string in the app with no ellipsis anywhere near it. Under it,
everything the tags carried, then the counts: how many listens, how many of
those went through to the end, the hearts, and the buttons that add one, take
one back, or set them to zero.

It replaced a fold-out that used to open under a selected library row. That
fold-out could show the album and the path but never the thing that was
actually cut off, and it existed on one of the two screens that list tracks, so
the same tap did different things depending on where you were.

### What these counts are not

Version 4 of the database **deleted** a listening history, and the reason is
worth keeping in view: the screen that showed it had gone, and holding a record
of behaviour that the app no longer admits to holding is not a thing to do
quietly.

Nothing here is a history. There are no timestamps, no order, nothing that
reconstructs an evening — a count per track, shown on the track itself, and
erasable from the same card that shows it (**"forget these counts"**). Remove a
source and its counts go with it, rather than becoming orphans that nothing can
display and nothing can clear.

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
  **can still be read**. It also answers "why is the visualizer blank?", which
  has three causes that look identical from outside: no Web Audio at all, an
  `AudioContext` that never reached `running` so the tap was never taken, or a
  tap that is fine and hearing silence. It reports the state of the context,
  whether the tap was taken, the level reaching it **right now**, and the accent
  the picture is drawn in.
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
| `resume` | the track you come back to has no duration and does not sound |
| `follow` | the banner scrolls away, or the queue stops following the music |
| `viz` | the banner draws the wrong note — or tapping the audio silenced it |
| `counts` | a skipped track counts as listened to, or the counts vanish on reload |
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
a tag the parser has to survive can be forged in one line.

One tree is **not** silence. `tones` is two 25-second sine waves at pitches with
names — A4 at 440 Hz and C5 at 523.25 Hz — because a visualizer fed silence
draws an empty canvas, and an empty canvas is also what a broken one draws. The
`viz` test plays them and reads the canvas back: *the tallest bar is the one
belonging to the note that is sounding*, which is one assertion covering the tap,
the FFT, the fold onto semitones and the drawing. The tones are amplified to
about −3.5 dBFS on the way out of ffmpeg, because `sine` comes out at −18 and
real music does not. `ffmpeg` is the only
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
| `src/analyser.js` | the Web Audio tap: spectrum, waveform, and the fold onto semitones |
| `src/visualizer.js` | the four pictures and the envelope in the scrub bar |
| `src/track_card.js` | the two counts beside a name, and the card the name opens |
| `src/stats_store.js` | how often a track was listened to, and its hearts |
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
- **`createMediaElementSource` is a one-way door.** From the moment that node
  exists, the `<audio>` element no longer reaches the output on its own — it
  reaches it through the graph, and there is no putting it back. Tap an element
  while the `AudioContext` is suspended and the music goes into silence: a player
  whose play button does nothing. So the tap is taken inside a `play` handler
  (the one place we are certainly in the gesture that grants `resume()`), only
  once the context reports `running`, and the destination is connected **before**
  the analyser, so that anything throwing afterwards cannot take the sound with
  it.
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
