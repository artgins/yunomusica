# yunomúsica

**Version 2.30.1** — live at [yunomusica.com](https://yunomusica.com)

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
| **Spectrum** | the same 48 bands standing up, **each in the colour of its note**, with a peak that holds and falls |
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

**The hue is the pitch**, here and in **Spectrum**. A note is always the same
colour wherever it appears; the wheel turns once per octave, which is why the
spectrum shows its octave structure as repeating bands of colour without a line
being drawn to mark it; and a key change moves the whole picture through the
wheel. These two are the only things in the app that do not take their colour
from the palette — a deliberate exception, and the point of them: colour
carrying meaning is worth more here than colour carrying the palette. The other
three still follow the record.

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

**Lists** — the queues you saved with a name, and two more that nobody saved.

**Tapping a list's name unfolds its songs**, in the order they were saved — a
button of its own was the alternative, and that row already carries three, while
tapping a name to see what is inside it is what the gesture already means
everywhere else here. Entries whose source is not authorised right now still get
a row, greyed, drawn from the title stored *with* the list: an unfolded list
that is shorter than the list would be the same quiet lie the "3 missing" line
exists to avoid. (This is what `entries_of()` was written for and had never been
wired up to.)

A saved list is a decision; the other two are a consequence: **Loved**, every
track with at least one heart, most first, and **Most played**, everything that
has been listened to, most first. Both carry the whole-list **Play** and **Add
to queue**, and each row shows its counts and opens the track's card.

**Most played can be emptied**, which means putting its counts back to zero —
the only way it *can* be emptied, since the list is not stored anywhere but is
what the counts say. It asks twice, in place, because there is no undo, and it
clears only the play counts: the hearts are somebody's choices, one tap at a
time, and a button on the played list has no business touching them. Loved has
no such button rather than a dangerous one; a heart comes off the way it went
on, one at a time, from the track's card.

They are built from the counts every time the screen is drawn rather than stored
anywhere, which is what keeps them from ever disagreeing with the numbers on the
rows. A track whose source is not authorised in this session cannot be resolved
and is **reported** rather than dropped in silence — the same rule the saved
lists follow; the count is still real, it is the file that is out of reach.
Playing one does not stamp the deck with a list name: this list has no id and is
a different thing the moment a count moves, so the deck says "queue put together
by hand", which is closer to true.

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

**"Save as list" goes off while the deck IS a saved list, untouched.** There is
nothing to save that is not already saved, and the only thing the button could
produce is a second copy under another name. It comes back the instant the queue
is touched — the same instant the line above it starts saying "edited", because
that is the same fact.

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
| `locales` | a language quietly falls back to English, or loses a `{{placeholder}}` |
| `plural` | "1 pistas" — a count that does not agree with its noun |
| `navink` | nav and primary buttons disagree about black-or-white ink |
| `minink` | the mini-player's button, the one accent surface `navink` cannot see |
| `select` | browsing changes what is sounding |
| `confirm` | a saved list eats the deck without asking — or the library asks when it takes nothing |
| `install` | the app stops asking about installing itself |
| `storage` | a second tab costs the first one its storage |
| `firefox` | Firefox reads no music at all |
| `fitmobile` | something runs off the side of a phone |
| `preview` | the listening strip is unreadable, or its clock is the queue's |
| `resume` | the track you come back to has no duration and does not sound |
| `follow` | the banner scrolls away, or the queue stops following the music |
| `viz` | the banner draws the wrong note — or tapping the audio silenced it |
| `counts` | a skipped track counts as listened to, or the counts vanish on reload |
| `addsrc` | a folder added twice doubles the library, or two folders are read at once |
| `templist` | playing from the library asks, stops after one track, or eats the deck |
| `grouping` | one album tagged two ways shows as two, or two albums as one |
| `tree` | Carpetas stops showing the disk, or a source cannot be looked into |
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

## Offline had to mean the plane

The word was doing two jobs and only one of them was true.

"Offline" was written here to mean **nothing you play ever leaves the device**,
which it never did. It was read — reasonably, by the person who wrote it — as
"it works with no network", which it did not. There was no service worker at
all. A manifest makes an app *installable*: icon, own window, and the folder
permissions Chrome only keeps for installed apps. It caches nothing. So an
installed yunomúsica, on a phone full of music, opened to a blank screen at
30,000 feet, and the one thing it needed the network for was the thing nobody
counts as a download: itself.

So the shell is precached now, and the list cannot be written by hand — the JS
and the CSS carry a content hash. `vite.config.js` takes it from the bundle
Rollup just emitted plus whatever `public/` contributed, and writes
`sw_template.js` out as `dist/sw.js` with the names filled in.

- The **core** (`index.html`, the JS, the CSS) is an `addAll`: if any of it
  cannot be stored the install fails on purpose, because half a shell boots to
  a broken screen instead of falling back to the network. It is retried on the
  next visit.
- The icons and the manifest are added individually and are allowed to fail. An
  app without its favicon is still an app.
- **Cache first**, not network first. The case this exists for is the one with
  no network, and a network-first worker spends its timeout on every asset
  before falling back — a slow boot instead of no boot. A stale answer is not a
  risk when a new build has new file names.
- `version.json` is never served from the cache. It is the app asking whether a
  newer build is deployed, and answering that from a cache is answering "no"
  forever.
- Anything cross-origin is passed straight through, untouched.

`tests/offline.mjs` is the flight: visit once with the network, cut it, reload,
and the app must come up **and still play a local file**. Painting its own shell
while unable to reach the music would be no use on a plane.

### The afternoon this cost

The shell precached correctly and was then not found, which looks exactly like
having no worker at all.

`caches.match(request)` — matching by Request rather than by URL — compares the
headers named in the stored response's `Vary`. Vite's preview server answers
`Vary: Origin`, and plenty of real servers vary on something. The request the
worker itself made through `cache.add()` carries no `Origin`; the browser's own
request for a module script does. Same URL, same bytes, and the lookup misses.
The fix is `ignoreVary: true`, which is right *here* and would not be
everywhere: these entries are content-hashed, so the URL alone identifies the
file. There is no second variant of `index-<hash>.js` to confuse it with.

The other half was quieter. The version check fired on a plane, failed, and left
a red line in the console that reads like a fault. A check that cannot succeed
should not be made, so it is skipped when `navigator.onLine` is false — a flag
worth trusting in exactly one direction. `true` promises nothing; `false` is
definite.

## Asking about a sleeve

Most music on a phone is a folder of files with no picture inside them, and a
wall of grey squares is a poor way to find a record you know by its cover.

A name cannot *be* a picture. But a name is enough to **ask** about one, and
that is the whole of this feature: artist and album go out as text, an image
comes back. Which makes it the only thing in the app that reaches outside, so it
is built to be unable to hurt the part that matters.

**It asks about one record: the one that is sounding.** This began as a sweep
over every album with no cover, and that was wrong twice over. It handed two
companies a list of everything on somebody's disk in order to fill in squares
nobody was looking at, and it made the user wait in a queue for the one sleeve
they actually wanted to see. What you are listening to is a far smaller thing to
give away than what you own, and it arrives where the eyes already are.

**Once, and then never again.** What comes back is stored in IndexedDB beside
the covers read out of files, so the second time that record plays the sleeve is
painted from disk with no network at all. A miss is stored too — as a row with
no blob — so a library full of bootlegs does not re-ask the internet at every
launch. Misses are retried after a month, because the archive gains covers over
time.

**It is on, and it can be switched off.** It shipped off, behind a bar on the
player that offered it. That lasted a day: the owner of the app decided the
sleeves are worth having without being asked for, so the default moved — and the
paragraph in Sources moved with it. It used to promise that nothing ever leaves;
it now says what does. A default that quietly makes a written sentence false is
the exact trap this app fell into over the word "offline", and it was not going
to be walked into twice in the same week. An explicit **no** still wins: the
default applies only where there is no stored answer, so anyone who switched it
off stays off across reloads.

What that paragraph says now, in full: your files are neither copied nor
uploaded, and the one thing that leaves is the artist and album of the record
you are listening to, as text, to look for its cover — switched off just below.
The same correction was made to the manifest, the page description and the help
dialog, because a promise is not kept by being true in only one of the four
places it is written.

**A blank can be argued with.** Both services miss, and MusicBrainz in
particular is often simply down when asked. Without a way back, one bad minute
costs that sleeve for a month. So Sources reports how many drew a blank and
offers "retry the ones that failed", which forgets those misses and asks again
about what is playing. There is deliberately **no** bar on the player for this:
a record with no sleeve anywhere is common, and a bar that appears for every one
of them is an app nagging about something it cannot fix.

**It cannot get in the way.** Nothing awaits it, no view waits for it, and the
queue plays whether it succeeds, fails or never runs. With no network it is not
attempted. A request that hangs is aborted after eight seconds, because a
captive portal that accepts connections and then answers nothing would otherwise
hold it open forever.

**A cover found in the file always wins.** `add_cover()` refuses a key that
already has one. The network is a guess — right most of the time, and still a
guess — while the picture inside the file is what the owner of the music chose.

Two services, in order. **MusicBrainz** with the **Cover Art Archive** first —
non-profit, no key, no advertising behind it — and it is also the one that goes
down; `503 "currently busy"` is a normal answer from it, which is exactly why
there is a second. **The iTunes Search API** answers when the first does not.

### What the folder name is worth

This is where the shelf numbering earns its keep, by being thrown away.

A ripped folder is called `0060 - Yes Going For the One`, and no catalogue in
the world has a record by that name: the `0060` is the shelf, not the title. So
before anything is asked, a leading number and its separator go, `(Disc 2)` goes,
and `(Remastered 2011)` / `(Deluxe Edition)` go — an edition is not a different
record, and asking for one narrows a search that was going to succeed.

That exact folder is the case this was built from, and it is worth following
through because it shows both services doing their job. The tags are missing, so
the album name comes from the folder and the artist is not known at all.
MusicBrainz is asked `releasegroup:"Yes Going For the One"` with no artist to
narrow it, and finds nothing — there is no release group by that name. iTunes is
asked `Yes Going For the One` as free text, and answers with *Going for the One*
by Yes. The sleeve appears.

`tests/covers.mjs` answers all three services itself, so the suite does not fail
on a day MusicBrainz is busy, and a `mode` flag lets it play the day the service
is down and the day after — which is the only way to test a retry. It holds the
feature to six promises: on by default, one question about the record that is
sounding, nothing said about the one whose cover came out of its own file, a
blank reported with a retry that really does ask again, a picture painted when
it comes back, and never another question about that record — checked across a
reload. Plus the one that matters most: switched off by hand, it stays off, and
nothing goes out at all.

The rest of the suite is sealed off from the internet in `lib.mjs`. With covers
looked up by default, every test that loads the fixtures would otherwise ask
MusicBrainz and Apple about "Cello Suites" — slower, noisier, and dependent on
two services being up to test things that have nothing to do with them. They are
answered "nothing found" rather than aborted, because an aborted request is a
console error and every test here treats console errors as failure.

Its own trap is worth writing down: the fixture tracks are five seconds long, so
a test that presses play and then goes looking for a switch is asking about
whichever record the queue drifted onto. It steps to the album it means with the
next button and **pauses** there. A paused record is still the record you are
looking at, which is the whole idea.

## Emptying the deck asks

"Vaciar la cola" sits one tap away from "Guardar como lista". It throws away an
order that can represent an evening's work, and unlike taking a single track out
there is nothing to undo it with.

So it asks — in the button itself, which turns into **¿Vaciar la cola?** plus
**Cancelar**, the same way removing a source asks. A modal for this would be
ceremony; no question at all is how a queue disappears under a misplaced thumb.

The part that is easy to get wrong is what happens when the screen is left with
the question standing. The deck is **not** torn down on navigation — `mt_start`
does not run again on the way back — so a confirmation left up would still be up
minutes later, in the spot where the plain button used to be, and the next tap
there would empty a queue nobody was asking about. The deck now listens for
`EV_ROUTE_CHANGED` and takes the question down on the way out. `tests/emptyq.mjs`
checks that specifically, along with the obvious three: one tap asks and removes
nothing, cancelling leaves the queue exactly as it was, confirming empties it.

## The deck does not repeat itself

Adding an album that was already on the deck used to append it again. The damage
is quiet, which is why it lasted: the queue reads as longer than it is, the same
song comes round again mid-evening, and a list saved from that queue carries the
repeat for good.

`queue_add` now drops what is already there, so pressing "add" twice does
nothing the second time — and adding a list that had repeats inside it takes
them out on the way in. When every track handed over is already on the deck,
nothing happens at all: in particular the queue is **not** marked edited, or a
no-op would quietly un-save a saved list.

Identity is the **track**, not the song. Two files of the same tune, in
different albums, are two records, and the app has no business deciding they are
one. What it refuses is the same file appearing twice over. (The other way a
track used to arrive twice — the same folder added twice — is closed further
upstream now; see "Nothing is added twice".)

## Giving the queue the screen

The deck leads with the sleeve, the transport and the seek bar. That is right
when you are listening and wrong when you are working *on* the queue: on a phone
that card is most of the screen, and reordering forty tracks through the slot
underneath it is a chore.

So there is a toggle at the end of the queue's action row: **Ver la cola
entera**. It folds the card away and leaves the list with the whole screen, and
the button then offers the way back. Session only — it is a way of looking at
the deck for a minute, not a setting anyone should have to go and find again to
undo.

The class goes on the deck root and hides `.MUS_DECKCARD` alone. The bars below
it — a folder waiting to be authorised, a new build deployed — are not the
player and must not fold away with it; `tests/deckq.mjs` checks that they
survive, along with the queue itself.

It is added **after** the "follow playing" toggle on purpose. Both are settings
rather than actions on the queue, and anything inserted before them moves the
save and clear buttons, which the suite finds by position.

## Nothing is added twice

The easiest mistake in this app to make, and the worst one to notice. The picker
reopens on the folder you used last, that folder is under the cursor, and
nothing on the screen said it was already in. Press again and every track
arrived a second time: twice in the library, twice in its album, twice in the
folder tree, twice in any list saved from them — and by then there is nothing
left to tell the copies apart, because they are the same file read twice under
two source ids. Adding a **subfolder** of one already in did the same thing, and
so did picking loose files out of a folder that was in.

So the question is answered **before a source exists**, and it is answered on
what the browser can actually prove — which is not the same thing for the two
kinds of source.

A **folder handle** knows its own identity. `isSameEntry` says whether two
handles are the same folder, and `resolve` says whether one lies inside the
other; both are exact and both survive a restart. Three answers come out of it:

- the same folder → not added, and it says so. Rescan is the button that was
  wanted.
- a folder **inside** one already in → not added. A folder is taken whole, so
  its tracks are in the library already.
- a folder that **contains** ones already in → this is a question, not a
  refusal. Wanting the whole music folder after adding one album from it months
  ago is entirely reasonable, and it can only be granted by dropping those
  inner sources — which drops their play counts and their hearts. That is not a
  decision to make on somebody's behalf, so it is asked, in the row of the
  buttons, with both exits on it.

A **file snapshot** has no path above the folder that was chosen: "Bach" picked
on its own and "Bach" reached through "music" are indistinguishable by path. The
files are compared instead, by name, size and modification time. What is already
held is dropped and what is genuinely new is still added — refusing the whole
pick would make the parent of an album already in impossible to add at all, and
a snapshot is a bag of files, so trimming it is honest.

The two kinds can also meet each other, and on Chromium both pickers are on
offer, so they do: loose files taken out of a folder that is later added whole.
Ancestry cannot see that — a snapshot is not *inside* anything — so a folder's
walk is checked against what the snapshots hold before its files are read. That
is the one check that cannot happen at the picker: there is nothing to compare
until the tree has been walked.

That last case is **not covered by the suite**, and it is worth saying why rather
than leaving a green run implying it is. The folder-handle tests drive the origin
private file system, and a file written there and a file picked off the real disk
never share a modification time, so the harness cannot build the overlap it would
need to. The two directions that *are* reproducible — a folder then its loose
files, and loose files then the folder over them — are both in `addsrc`, and they
exercise the same comparison.

Every one of those answers is **spoken**. A refusal in silence is no better than
the duplicate: the user pressed a button and nothing happened. The note sits
directly under the two pickers — on the Sources screen and on the empty library
screen, which carries the same two buttons — and names the folder it collided
with.

`resolve` returns the **empty array** for the same entry, and an empty array is
truthy. `isSameEntry` has to be asked first or every folder reads as being
inside itself.

## One folder read at a time

The pickers stay live while a folder is being read, and queueing a second one is
a reasonable thing to do — a picker that goes dead for two minutes is worse than
the wait. What could not be shared was the reading. There is one progress
counter, one elapsed clock and one Stop, and two reads fighting over them made
the counter jump backwards — 98, then 0, then 175 — and reach `300 / 300` while
the other folder was still half way through. A bar that fills up and stays up is
exactly how a working app gets read as a stuck one, which is the failure this
bar was built to prevent in the first place.

Scans now go through a queue, one at a time, and a source waiting its turn says
so on its row instead of sitting at "0 tracks" with nothing to explain it — the
same silence, one level up. The chain absorbs a scan that threw, or every folder
picked after a bad one would be dropped on the floor.

Serialising them uncovered an older lie underneath, one that needed no
concurrency at all. A read has two phases: the tree is **walked** first, which
produces no numbers, and only then are files opened and counted. The counters
still held the *previous* folder's, so through the whole walk the bar showed the
new folder's name beside `300 / 300` and a full bar, before one file of it had
been opened. `begin_read()` zeroes them when the read starts, and the bar falls
back to the indeterminate one — reading, and not yet countable, which is the
truth.

`tests/addsrc.mjs` samples the bar's **name** alongside its count, because that
is what separates the two reads: starting over when the folder changes is
correct, going backwards without it is the bug. A bare counter cannot tell them
apart.

## Two lists, and only one of them is yours

The deck is the official list: curated, saved, persistent, the thing the
Reproductor screen is about. What the library shows you — a genre, an album, a
folder, one artist's records — is the other kind: **temporary**, unsaved,
exactly as long as the screen you are on.

Pressing play on a row starts the temporary one. The deck **pauses** and keeps
its place; nothing of it is replaced, appended to or reordered. And because
nothing is at risk, nothing is asked: the three-way "add / replace and play /
cancel" dialog that used to stand between the user and the sound is gone from
the library entirely. It survives in **Listas**, where play means "make this
saved list my deck", which really does throw the current one away.

It runs **on**, through the list on the screen, to the end of it. Sounding one
track and stopping dead was the old behaviour and it was the wrong shape:
nobody presses play on an album to hear its first song. Before that it replaced
the whole deck for one row, which cost the user everything they had built to
hear one track. Both are gone.

The way back lives on the strip along the bottom, which is the one piece of
screen the two lists share — and while the temporary one is sounding, that strip
is the **only** sign that what you hear is not the deck. So it shows on every
route, the deck included, in the accent colour, saying which list it is and how
far through it has got. It carries pause, next, a ＋ to keep what you are
hearing, and, in words rather than a glyph, **Volver a la cola**. Returning
gives the deck back playing, if it was playing when it was interrupted — and
silent if it was not, because starting music nobody asked for would be the app
deciding something on its own.

Reaching the end of the temporary list does the same thing as pressing that
button. Falling silent with no account of what had just ended would leave the
user staring at a strip that had stopped meaning anything.

## Group by the music, not by the typing

Every grouping in the library keyed a `Map` on the raw tag string, and real tags
are not consistent. One album tagged `Aqualung` in three files and `aqualung` in
the fourth came out as **two albums with, on the screen, the same name** — and
the collator sorted them next to each other, so it read less like a bug than
like the library being wrong about itself.

The same line of code had the opposite fault. An album is a title **and** an
artist, so grouping on the title alone folded every `Greatest Hits` in a library
into one record by nobody in particular.

Both are one fix: group on the normalised `(album artist, album)` pair — which
is `track.key`, the key the covers are already filed under, so a group and its
sleeve cannot disagree. Artists and genres group on their normalised name the
same way. Each group is then **labelled with the spelling most of its tracks
carry**, so the screen shows `Camel` rather than whichever of `Camel` and
`camel` happened to be read first.

How an artist is spelled is decided **once, over the whole library**, and album
cards borrow that answer. Deciding it per album gave a different one for a
record whose only track carried the minority spelling: `Mirage` was filed under
`camel` while the artist itself was listed as `Camel`. A name belongs to the
artist, not to one of their records.

A drill-down holds the group's **id**, never its name — two albums may
legitimately share a title, and re-resolving one by name landed on the other
one's tracks after any repaint.

### An artist is their records

Opening an artist used to give a run of songs with faint grey words over it.
Each section is now the record itself: sleeve, name, how many tracks, and the
same two verbs every other row carries — so "see the albums by author" is
answered where it is asked, inside the artist, rather than by a sixth chip.

Those sections split on the raw title too, which is why an artist whose record
was tagged two ways showed it as two headings directly under one another —
inside the very screen that exists to show their records. They go through
`albums_of()` now, the same rule the Albums view uses. One rule, one place.

The fixture that proves all of this is `messy`, and nothing in it is invented
for the sake of a test: an album spelled three ways, two different records
called `Greatest Hits`, an artist spelled two ways, a genre spelled two ways.
Five real albums by four real artists. Anything that reports more is reporting
the tags, not the music.

## The deck says what it was told

Adding to the queue was the only action in this app with no visible result at
all. The deck is another screen, and it **refuses repeats** — so pressing ＋ on a
record already on it changed nothing and said nothing. From the outside that is
a dead button, and the second press, and the third, were people checking whether
it worked. The refusal is right; the silence was not.

`queue_add` now records what it did — how many went on, how many were already
there — and the shell says it for about two seconds, above whatever strips are
showing. It floats rather than docking: a note that pushed the player up and
dropped it back down on every ＋ would be worse than saying nothing.

No number is welded into a sentence. A label and a figure, the same shape the
rest of the app uses for counts, because a count inside a sentence is a plural
rule per language and this app speaks ten. `Ya en la cola · 2` is true whatever
the number is.

The note has to clear the bottom **nav** as well as the strips, and that nav
belongs to the shell and only exists on a narrow screen — so its height is
measured by the same `ResizeObserver` that measures the strips, into
`--mus-nav-h`. Hard-coding it put the note squarely on top of the nav.

## Carpetas is the disk now, not the tags again

"Folders" grouped on the whole path, which produced a flat list of every **leaf**
directory in the library. A leaf directory is nearly always an album, so the view
was the Albums view again with worse names — as the person who asked for this put
it, *"es otra forma de ver los álbumes"*. What it never showed was the **shape**:
what holds what, the one thing the file system knows and the tags do not.

It is a walk now. One level at a time, starting at the source — because a folder
only means anything inside the source it came from, and two sources can each hold
a `music` that one merged row would turn into a folder nobody has. Each level
shows the directories directly inside it, each with everything below it counted,
and then the tracks that live in the level itself. A breadcrumb offers **every**
rung back, not just one: a tree with only "back" makes you climb down it a step
at a time to reach a root whose name is right there on the screen.

The walk starts at the source's own root segment, not at `""`. Every path a pick
produces carries the pick's folder name at its head — the handle's name, or the
top folder of the file list — so starting at nothing showed a single child named
after the source and made the user click through a rung that told them nothing.

### The bug underneath it

`fromPath` **popped** the parent segment off the array it then rebuilt the path
from:

```js
const folder = parts.pop() || "";     // "Aqualung"      — and parts loses it
const parent = parts.pop() || "";     // "Jethro Tull"   — and parts loses it too
…
folder: parts.concat(folder).join("/")   // "messy/Aqualung"
```

So the stored folder of a file living in `messy/Jethro Tull/Aqualung` was
`messy/Aqualung`, a directory nobody has. It read as harmless because nothing
ever walked with it — the old flat view only ever compared whole strings. Reading
those two segments instead of popping them fixes it.

That value is **stored with the tags**, though, so a library read by an older
build still carries the broken one until every source is re-read. The tree
therefore builds from the track's `path`, not from `folder`: the path is what the
file is fetched by, so it cannot be wrong without the track being unplayable.

## Looking inside a source

Fuentes could remove a folder, re-read it and queue it, and could not show what
was **in** it — the one question anybody actually has about a source. Each row
now carries **Ver dentro**, which opens that source's root in the tree above.

It is a door, not a second browser: the library already walks folders, and
growing another one inside Sources would be two things to keep honest instead of
one. The hand-off goes through `open_in_library()` — read once on the way in and
cleared — rather than a route carrying a source id, because that id is internal
and has no business in the address bar.

## "1 pistas"

Every count in the app was drawn as two nodes — the figure, then the noun — with
the noun frozen in its plural form. The comment above it said the split existed
so that *"neither language nor plural rules leak into a composed string"*. That
was the wrong lesson from a real problem. Keeping them apart did not avoid the
plural; it made it wrong, on every screen that counts anything, in every language
that inflects: `1 pistas`, `1 álbumes`, `1 entradas`, `1 carpetas dentro`, and
`1 Alben` in German where the plural is a different word.

The nouns are plural keys now — `n tracks`, `n albums`, `n entries`, `n missing`,
`n folders inside` — resolved with `t(key, {count: n})`. i18next picks the CLDR
category for the language in force, so each catalogue carries every form its own
language actually has and no code here knows anything about any of it: **six**
forms for Arabic, four for Russian, three for Spanish, two for German, one for
Japanese, which is correct for Japanese.

The figure stays its own node, so the stylesheet can still give it tabular
numerals or an accent. What changed is only that the noun beside it is now asked
for with a number.

Two things that are easy to get wrong here, and both are pinned down by
`tests/plural.mjs`:

**A missing category does not fall back within the language.** i18next resolves
`n tracks_many` for a Spanish count of a million; if that key is absent it falls
through to `fallbackLng` and prints the English word, or prints the bare key. So
"it looks right in Spanish" is no evidence at all about Arabic. The test asks
`Intl.PluralRules` which categories each language declares, finds an integer that
selects each one, and runs every key through i18next at every one of them.

**The noun node carries no `i18n` attribute.** `refresh_language` cannot pass a
count, so re-translating one of these in place would look the key up without it
and paint `n tracks` on the screen. The views that show counts re-render on a
language change instead — which is what the runtime's own documentation
prescribes for anything `refresh_language` cannot reach.

Declared and *reachable* are not the same number, and the gap is not a hole:
Russian declares four categories but only ever selects `other` for a fraction,
and this app counts whole tracks. The test prints both so nobody reads the
smaller one as a missing form.

### Two whole sentences had the same fault

`"{{skipped}} de ellos ya estaban"` is as wrong at one as `1 pistas` is, and it
is not a noun that can be split off — the whole sentence has to agree. It is a
plural key now, on `count`.

The covers line could not be fixed at all in the shape it had:

> Encontradas {{found}}. Sin resultado: {{missed}} (no se vuelven a preguntar…)

i18next pluralises on **one** `count` per key, and that sentence carries two
numbers, so a single key could only ever have agreed with one of them. It is two
keys now, `covers found` and `covers missed`, rendered side by side — which is
why "Sin resultado: 1 (no se **vuelven** a preguntar)" was on the screen at all.

That gap is closed too — see below.

## Ten languages, and no quiet English

`fallbackLng: "en"` is a safety net, not a plan. A key nobody has translated
renders in English and never changes, on a screen where everything around it is
Russian — and nothing anywhere goes red about it. That is how the **whole covers
section** — the switch, its buttons, and the paragraph explaining exactly what
leaves the device — sat in English in **seven of the ten languages**. The one
paragraph in this app whose entire job is to be believed, in a language the
reader may not have.

Fifteen keys were missing from Chinese, Arabic, Russian, Hindi, Portuguese,
French and Japanese. They are written now, and `tests/locales.mjs` will not let
it happen again. It checks three things, and none of them needs anyone to read
the languages:

**Coverage.** Every key English has, every catalogue has — and nothing extra,
which is either a typo or something the code stopped asking for.

**Placeholders.** A translation that drops `{{other}}` still renders, still
reads like a sentence, and has silently lost the name of the folder it is
talking about. One had: the Arabic zero form of "some were already in".

`{{count}}` is the deliberate exception. A plural form may name its own number
rather than print it — Arabic says *"one was found"*, not *"1 one was found"* —
so `count` is optional and every other placeholder is not.

**Nothing empty, and nothing still equal to its key.** i18next answers an unknown
key with the key itself, so a value that *is* its key looks on screen exactly
like a translation nobody wrote. English is exempt from that second half and
only that: the keys are lower-case English, so `"edited"` being the word
"edited" is the catalogue working.

What the test cannot check is whether a translation is any *good*. Quote marks
follow each language's own convention — 「」 in Japanese, «» in Russian and
Arabic, « » in French, “” in the rest — and the Arabic plural forms follow the
usual rule: dual for two, the broken plural for three to ten, the singular from
eleven up.
