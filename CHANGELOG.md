# Changelog

This file starts on 2026-10-13. What came before is in the git log.

Each release of `@yuneta/gobj-ui` reaches this app through gobj-ui's deploy
round, which raises the range and the third number of the app's version, and
builds, tests and deploys it; the line of each round is written here after it.

## 2.37.14 — 2026-10-22

- i18next `^26.5.6` (range caught up within its major; tabulator-tables 6.7.1 in the lockfile, through gobj-ui). Nothing the app uses changes: i18next 26.5.5/26.5.6 deep-copies the store of `cloneInstance({forkResourceStore: true})` and keeps literal a `{{placeholder}}` inside an unescaped `{{- var}}` value; neither is used. `npm audit` clean; the locales check passes. Deployed; serves the new bundle, console clean.

## 2.37.13 — 2026-10-22

- gobj-ui `^7.27.34` (deploy round): the gobj tree's gclass viewer no longer stays locked when a newer trace set overtakes its read. No code change in this app.

## 2.37.12 — 2026-10-22

- gobj-ui `^7.27.33` (deploy round): an element looked up by a name that comes from data no longer goes through a CSS selector; the schema graph applies the drag patch. No code change in this app.

## 2.37.11 — 2026-10-22

- gobj-ui `^7.27.32` (deploy round): G6's built-in behaviors are replaced without the two "has been registered before" console warnings. No code change in this app. Console clean on load.

## 2.37.10 — 2026-10-22

- gobj-ui `^7.27.31` (deploy round): review fixes in the library (a gclass viewer reopened during a trace set opens locked; a `C_YUI_NODE` tree ignores a route of another stage). No code change in this app.

## 2.37.9 — 2026-10-22

- gobj-ui `^7.27.30` (deploy round): review fixes in the library (a `keep_alive` tree tells its content once, the gobj tree's camera at any zoom, the gclass viewer). No code change in this app. Console clean.

## 2.37.8 — 2026-10-21

- gobj-ui `^7.27.29` (deploy round): the library adds `C_YUI_UPDATE_WATCH`, "a new version is available"; this app keeps its own notice. `deploy_yunomusica.sh` uploads with `rsync --delete-after --delay-updates`, so a page loaded during the upload never gets an `index.html` whose chunks are not there yet. Console clean.

## 2.37.7 — 2026-10-21

- i18next `^26.5.4`, vite `^8.3.5` (ranges caught up within their majors; tabulator-tables 6.7.0 in the lockfile, through gobj-ui). Nothing the app uses changes: i18next 26.5.4 keeps a `{{placeholder}}` that arrives inside an interpolated value literal; vite 8.3.5 is a build and dev-server patch. `npm audit` clean; the locales check passes. Console clean.

## 2.37.6 — 2026-10-19

- gobj-ui `^7.27.28` (deploy round): the trace notes of the gobj tree say what the yuno keeps (SDK 7.27.3): a service's traces survive a restart, any other gobj's end with the yuno. Console clean.

## 2.37.5 — 2026-10-19

- gobj-ui `^7.27.27` (deploy round): in the gobj tree of the Developer window each trace scope is set where it belongs (a card: this gobj; the gclass viewer: every gobj of the gclass; *traces of the yuno*: the whole yuno), and the gclass viewer lays itself out by its own width, short zones first. Console clean.

## 2.37.4 — 2026-10-19

- gobj-ui `^7.27.26` (deploy round): the gobj tree of the Developer window has a minimap from 20 cards on, and a running gobj with nothing to play (no `mt_play` or `mt_pause` in its gclass) reads `● running`, not `‖ running (paused)`. Console clean.

## 2.37.3 — 2026-10-19

- Deploy round: the ranges of `package.json` caught up with what was installed (`ncu -u`): `npm update` had left them behind. Same code as the deployed bundle; the bundle carries `package.json`, so it is a new one.

## 2.37.2 — 2026-10-19

- gobj-ui `^7.27.25` (deploy round): G6 cameras reach a coordinate of 0
  (`@antv/g-lite` 2.7.2). Dependencies refreshed within their majors:
  i18next 26.5.2, playwright 1.64.1. `npm audit`: 0 vulnerabilities.

## 2.37.1 — 2026-10-19

- gobj-ui `^7.27.23` (deploy round). The Developer window has a **Line**
  view of the traffic again; its two new keys are added in the ten
  languages.

## 2.37.0 — 2026-10-18

The fixes found reviewing yunovídeo, which inherited this code.

- **A rescan leaves the queue as it was.** It used to take that source's
  tracks off the queue, stop the one sounding and, the queue left empty, pour
  the whole folder onto it in walk order. Now the queue keeps its tracks,
  order and place; only what left the folder leaves it. New test: `rescan`.
- **Escape closes the dialogs** — the welcome, the install question, the
  replace question and a track's card. Registering them as shell overlays
  bought the Back button and not Escape, which is a stack of its own.
- **What happens outside the machine is no blind spot.** The stores are plain
  modules and the screens repaint straight from their callbacks — cheap, and
  low-level by nature — but none of it showed in the trace. Now the calls
  into the stores, the channels they emit, the browser callbacks they answer
  (the audio elements, the write timer, the picker, the cover hunt, the black
  box) and every screen's repaint from a store callback ("C_MUS_DECK ←
  music:playing") are lines of the trace under C_MUSICA's user level
  `stores` (the clock under `stores-time`), switched from the developer
  sheet's Traces tab and kept across launches. So are the user's gestures
  (one capture listener: "click MUS_QMETA «Aqualung»") and the screens' own
  timers (facts, follow, search, the visualizer's start and stop). New test:
  `trace`.
- **Hidden screens draw nothing.** Library, Lists and Sources are kept alive
  and went on rebuilding while hidden; now they note that they are out of date
  and render when shown. The library no longer rebuilds ten times a second
  during a scan when it has a library on screen, and Sources writes the
  scan's progress in place — a rebuild that often swallowed taps.
- **Every row's buttons are named by the row** for a screen reader — "Play
  this one Aqualung", "Give a heart Aqualung" — instead of the same words 350
  times (`aria-labelledby`, as gobj-ui names a control with its badge). And
  the controls that had no title or aria-label have both now: the row titles,
  the chips, the search box, the mini-player, the scan's Stop, the queue's
  line, the empty screens, the source rows, the developer sheet. New test:
  `a11y`.
- **The track card keeps the focus** on the heart button that was pressed.
- **No silent failures**: play() refusals, unreadable tags, unreachable
  files, seeks, permission queries, the folder picker, a scan that threw, the
  cover lookups, the install prompt, the developer traces — all logged. An
  IndexedDB write answers when its transaction completes, so a quota refusal
  is a failure and not a success; the database's open failures are logged.
  The developer sheet's Copy no longer sticks on "Copied", and says when the
  copy failed.
- **Nothing fades or slides, anywhere** — the Yuneta GUI rule, now without the
  exception the deck's banner had: covers, the background wash, the title and
  the facts change at once (the next cover still decodes behind the current
  one, so the cut never goes through a blank frame); the queue jumps to what
  is sounding instead of gliding; the scan ring is still, a read with no total
  yet is a hatched bar; the "added" note and the list chevron appear at once.
  Only the visualizer moves: it is a picture of the sound, not an animation.
- Names with `&` or `<` are no longer HTML-escaped in messages; "MB" says its
  unit in the language in force; the service worker precaches from the
  server, never from the HTTP cache; a first deploy to a new host no longer
  stops at the backup.
- `package-lock.json` is committed (it was ignored, so two builds of the same
  commit could get different libraries within the `^` ranges), and the chunk
  size warning is set to 700 kB (it warned on every build at Vite's 500 kB,
  so nobody read it; now it speaks if the bundle grows by a third).

## 2.36.17 — 2026-10-18

- gobj-ui `^7.27.21` (deploy round).

## 2.36.16 — 2026-10-18

- gobj-ui `^7.27.20` (deploy round).

## 2.36.15 — 2026-10-18

- gobj-ui `^7.27.19` (deploy round).

## 2.36.14 — 2026-10-18

- gobj-ui `^7.27.18` (deploy round).

## 2.36.13 — 2026-10-18

- **The theme button shows the theme in force** again — the moon in dark,
  the sun in light — as in every Yuneta app, where the toolbar says what is
  in force (with a menu or without). Its tooltip and accessible name still
  say where a press goes ("Switch to light theme"). Undoes the icon of
  2.36.1.

## 2.36.12 — 2026-10-18

- gobj-ui `^7.27.17` (deploy round).

## 2.36.11 — 2026-10-18

- gobj-ui `^7.27.15` (deploy round).

## 2.36.10 — 2026-10-18

- gobj-ui `^7.27.14` (deploy round).

## 2.36.9 — 2026-10-17

- **Maximise the queue / show the player** wear the arrows of a panel growing
  to the whole screen and back (Material `open_in_full` / `close_fullscreen`,
  as Material, YouTube and Google Docs draw it): the two small triangles read
  as a dropdown or a sort, the same reason move up / down lost theirs. Icon
  only.

## 2.36.8 — 2026-10-17

- gobj-ui `^7.27.13` (deploy round).

## 2.36.7 — 2026-10-17

- gobj-ui `^7.27.12` (deploy round).

## 2.36.6 — 2026-10-17

- gobj-ui `^7.27.11` (deploy round).

## 2.36.5 — 2026-10-17

- **Help** wears the **?**, as in Google, Apple and Microsoft apps: it wore the
  **ⓘ**, which they keep for "About". Every Yuneta app now says it the same
  way.

## 2.36.4 — 2026-10-17

- **Each icon says what its button does, as the market draws it** (Material
  Icons, the set YouTube Music speaks):
    - **Library** is a shelf of albums (`library_music`): it wore the menu's
      hamburger, which is also the site map's and the app menu's.
    - **Lists** are lines and a note (`queue_music`), the playlist: a tag says
      "label".
    - **Add to queue** is lines and a plus (`playlist_add`), not a bare plus.
    - **Move up / down** in the queue are arrows with a shaft (one step through
      a sequence): the small triangles read as a dropdown or a sort.
    - **Clear the queue** and **clear the counts** are the broom: they empty,
      they do not delete. The bin stays for deleting a list or removing a
      source.
    - **Authorise** a folder is the key (granting access), not the padlock.
    - **Back** is the arrow with a shaft, not the chevron.
    - **Language** is the same `yi-language` as every other app, and the
      **site map** the site map.
- The unused `.mi-info` rule is gone, with `.mi-tag` and `.mi-globe`.

## 2.36.3 — 2026-10-17

- **The developer window wears the bug** (gobj-ui `^7.27.10`), the
  debugging icon of VS Code, IntelliJ and Xcode, as in every other app: its
  `>_` was also the command console and the TTY of gui_agent.

## 2.36.2 — 2026-10-16

- **The theme button's tooltip says where it goes** — "Switch to light
  theme" while dark, "Switch to dark theme" while light — in all ten
  languages, and its accessible name says the same.

## 2.36.1 — 2026-10-16

- **The theme button shows the theme it switches to** — the sun while
  dark, the moon while light — instead of the theme in force.

## 2.36.0 — 2026-10-16

- **The toolbar says what is chosen.** The language and colours menus put
  a check on the choice in force, at start and after every switch, and the
  theme button wears the theme in force — the moon in dark, the sun in
  light — where it was always the moon. New test `choices`.

## 2.35.0 — 2026-10-16

- **Two multicolour palettes**, "Aurora" (teal, violet, rose) and "Dusk"
  (amber, coral, plum), next to the five one-colour ones. Three
  neighbouring hues share the roles instead of one hue doing all of them:
  the accent keeps the buttons and the nav, the second hue takes the play
  count, the facts and the folders, the third the hearts and shuffle /
  repeat / follow, and a gradient of the three goes on the play buttons,
  the seek and scan bars and, faintly, the playing row. Every hue clears
  5:1 with its ink and with the card in both schemes. The one-colour
  palettes look exactly as before.
- **The visualizer follows them.** Under a multicolour palette every mode
  draws in its three hues — the notes, the bars, the wave, the chroma
  lamps and the envelope in the scrub bar — and a note is still always
  the same colour. New test `multipal`, on a new chord-progression
  fixture: a pure tone is one hue in any palette and could not show it.

## 2.34.0 — 2026-10-16

- **Ten seconds back and forward** on the deck's transport, either side of
  play. Seven buttons do not fit a 360px phone at 48px, so the transport
  shrinks them with its own width instead of taking a second line from the
  banner.
- **A saved list remembers where it was left.** Leaving it (another list, an
  album played over the deck, the queue emptied) and playing it again goes
  back to its track and second, across reloads too.
- **The place survives a second reload.** The first snapshot after start up
  stored the clock of an element that had not loaded the track yet (on a
  phone it waits for the folder to be authorised): 0. The next launch — a
  new version, a kill — came back at the start of the track. A position
  still waiting to be applied is now the position that is stored; nothing is
  stored before the stored deck has been read back; and the "reload" of the
  new-version bar waits for the write.
- **The play count stands out** — filled in the accent — and on a phone it
  no longer lies over the title: the counts moved to the artist's line, and
  a long title ends in an ellipsis instead of running under them.

## 2.33.39 — 2026-10-15

- gobj-js `^7.27.0`, gobj-ui `^7.27.0` (deploy rounds): gobj-js and gobj-ui 7.27.0, whose number follows SDK 7.27.0 (no change of
  their code). Two rounds (gobj-js, then gobj-ui), so the version moved by two.
  No change of the app's own code.

## 2.33.37 — 2026-10-15

- gobj-ui `^7.26.59` (deploy round): the gobj-ui 7.26.59 round (the thirty-fourth review): the topic table
  cancels an open cell editor only when the update changes the edited
  field, so the echo of the reader's own write no longer closes the next
  cell's editor. No change of the app's own code.

## 2.33.36 — 2026-10-15

- gobj-ui `^7.26.58` (deploy round): the gobj-ui 7.26.58 round (the thirty-third review): the topic table
  cancels an open cell editor before it updates that row from the backend
  (the echo of the reader's own write threw and left the row half painted),
  and the cell editor is re-opened after a column change only when it still
  can. No change of the app's own code.

## 2.33.35 — 2026-10-15

- gobj-ui `^7.26.57` (deploy round): the gobj-ui 7.26.57 round (the thirty-second review): the topic table
  closes an open cell editor before it reloads or is destroyed (it threw page
  errors), and a cell editor also survives `addColumn`,
  `updateColumnDefinition` and `moveColumn`. No change of the app's own code.

## 2.33.34 — 2026-10-15

- gobj-ui `^7.26.56`, gobj-js `^7.26.29` (deploy rounds): the gobj-ui 7.26.56 and gobj-js 7.26.29 rounds (the thirty-first
  review), with the dependencies up to date: i18next ^26.4.5 (26.4.4 fixes a
  ReDoS on an interpolated value holding an unclosed `$t(`; no locale uses the
  `$t(` nesting), maplibre-gl ^6.14.0 (fixes; the worker is self-contained
  since 6.13) and vite ^8.3.4 (build fixes). Also: a time field can clear a
  value it cannot show, a cell editor survives `setColumns`, and `gobj_play()`
  fails when its start does. The two rounds ran back to back: the version
  between them was deployed and has no commit.

## 2.33.32 — 2026-10-14

- gobj-ui `^7.26.54` (deploy round): the gobj-ui 7.26.54 round: a table cell editor no longer closes (nor
  throws a page error in Chromium) when the table redraws on entering the view.
  No change of the app's own code.

## 2.33.31 — 2026-10-14

- gobj-ui `^7.26.53` (deploy round): the gobj-ui 7.26.53 round: a time a view shows as text (the cells of
  the topic and form tables, the JSON viewer, the axes and legend of the
  charts) is in the app's language with a 24-hour clock ("Oct 14, 2026,
  15:05:09") and changes with the language button. (The 7.26.52 round did not
  reach the app: its build failed on the period picker's keys the validator
  asked for; 7.26.53 fixes it.) No change of the
  app's own code.

## 2.33.29 — 2026-10-14

- gobj-ui `^7.26.51`, gobj-js `^7.26.28` (deploy rounds): the gobj-ui 7.26.51 and gobj-js 7.26.28 rounds (the thirtieth review):
  saving a form time field untouched no longer goes back one hour in the
  repeated autumn hour; the retirement of dead Back entries stays in its
  document and follows the reader's traversals; `node_uuid()` is stable for the
  page; a walk gives each gobj once; `gobj_start()` checks `SDF_REQUIRED`
  attributes (BREAKING; no app declares one); the validator imports the locales
  in a process of its own. The two rounds ran back to back: the version between
  them was deployed and has no commit. No
  change of the app's own code.

## 2.33.27 — 2026-10-14

- gobj-ui `^7.26.50` (deploy round): the gobj-ui 7.26.50 round: a menu item's badge is the v1 pill again,
  with no ring of the page's colour (in the dark theme it read as a black
  circle that ate the tone; red and yellow were hard to tell apart). No change of the app's
  own code.

## 2.33.26 — 2026-10-14

- gobj-ui `^7.26.49`, gobj-js `^7.26.27` (deploy rounds): the gobj-ui 7.26.49 and gobj-js 7.26.27 rounds (the twenty-ninth
  review): a logout with an overlay up no longer leaves dead Back entries; a
  focus trap whose panel left is warned; a time cell confirmed unchanged no
  longer goes back one hour in the repeated autumn hour; a template time field
  shows its time again; gobj-js no longer throws with the site's data blocked
  (the app did not start), floors the reconnection retry at 1000 ms, and its
  walks step over a gobj already destroyed. The two rounds ran back to back:
  the version between them was deployed and has no commit. No
  change of the app's own code. Catalogue check and build green.

## 2.33.24 — 2026-10-14

- gobj-ui `^7.26.47`, gobj-js `^7.26.26` (deploy rounds): the gobj-ui 7.26.47 and gobj-js 7.26.26 rounds (the twenty-eighth
  review): an incomplete date no longer erases a stored time; Enter in a box
  of a form no longer adds a row or reloads the page; a cancelled cell edit is
  not a change; the header checkbox is named `select all rows` (new key, added
  in en/es where the app mounts a form); a stopping shell no longer moves the
  browser history; a panel that only moves keeps its focus trap; gobj-js
  refuses values whose text says another thing (NaN, `toJSON`, an `undefined`
  in an array) and a getter that throws, resets the backoff after a long
  session and removes a corrupt localStorage entry. The two rounds ran back to
  back: the version between them was deployed and has no commit. No
  change of the app's own code (it mounts no form, so no new key). Catalogue
  check and build green.

## 2.33.22 — 2026-10-14

- gobj-ui `^7.26.46`, gobj-js `^7.26.25` (deploy rounds): the gobj-ui 7.26.46 and gobj-js 7.26.25 rounds (the twenty-seventh
  review): a stopped shell closes its overlays (their focus traps left later
  windows without focus after a logout); the checkbox column respects
  `selectable`; a time column is editable without luxon; `C_IEVENT_CLI`
  refuses the transport's own events from the server and closes with 4002 on
  a server fault without resetting the backoff; URLs and queries encoded
  inside a value are masked. The two rounds ran back to back: the version
  between them was deployed and has no commit. No
  change of the app's own code. Catalogue check and build green.

## 2.33.20 — 2026-10-14

- gobj-ui `^7.26.45`, gobj-js `^7.26.24` (deploy rounds): the gobj-ui 7.26.45 and gobj-js 7.26.24 rounds (the twenty-sixth review):
  `selectable` is Tabulator's `selectableRowsCheck`; an open cell editor no
  longer breaks a reload; a window yields Escape to a newer overlay; a session
  cut uncleanly is a WARNING again and `EV_ON_CLOSE` carries `code`, `reason`
  and `was_clean`; names written as a form writes them and a URL's password
  are masked. The two rounds ran back to back: the version between them was
  deployed and has no commit. No
  change of the app's own code. Catalogue check and build green.

## 2.33.18 — 2026-10-14

- gobj-js `^7.26.23` (deploy round): gobj-js 7.26.23: `C_IEVENT_CLI` no longer warns when a session ends
  (every close was a warning, the clean one of a logout included; it is
  `EV_ON_CLOSE` now, as in C), and the reason of a failed open is masked. No
  change of the app's own code. Catalogue check and build green.

## 2.33.17 — 2026-10-14

- gobj-ui `^7.26.44` (deploy round): gobj-ui 7.26.44: a click on a row of a form's table WROTE its `selectable`
  attr with no value instead of reading it (since v1); with gobj-js 7.26.22
  that was an ERROR and an exception. No change of the app's own
  code. Catalogue check and build green.

## 2.33.16 — 2026-10-14

- gobj-js `^7.26.22` (deploy round): the gobj-js 7.26.22 round (the twenty-fifth review, parity with the C kernel
  of 7.26.10): a token in a URL query is masked; an attribute's value is read
  as its type by the command parser's grammar (a value that is not is not
  written, and said); and a gobj destroyed under code still running on it is
  reported with an ERROR. No change of the app's own
  code. Catalogue check and build green.

## 2.33.15 — 2026-10-14

- gobj-ui `^7.26.43` (deploy round): the gobj-ui 7.26.43 round (the twenty-fifth review): Undo reverts a form's
  tables and the record stays as loaded; nested tables live as long as their
  row; a table loads in one call; `C_YUI_WINDOW` is a named dialog with
  Escape and focus; the shell's dialogs are named and reachable from the
  keyboard; the floating dock no longer covers a full-screen window. No
  change of the app's own code. Catalogue check and build green.

## 2.33.14 — 2026-10-13

- gobj-js `^7.26.21` (deploy round): the masking of the twenty-fourth review
  (yunovatios `REV-CLOUD.md` V24.4.2, V24.4.3) -- after `Bearer` or `Basic`
  only a word that can be a credential is masked; a JWE and a `name: value`
  whose name is a secret's are masked; no rule hides a value from the next. No
  change of the app's own code. Catalogue check and build green.

## 2.33.13 — 2026-10-13

- gobj-ui `^7.26.42` (deploy round): every change of a badge is said, as text,
  and the nav and toolbar items are named by a key. This app mounts no graph,
  so it needs none of the new keys. Catalogue check and build green.

## 2.33.12 — 2026-10-13

- `npm audit fix`: `npm install` reported three high vulnerabilities (the
  deploy round shows every step's output now): `devalue` (svelte, through
  `vanilla-jsoneditor`), `fast-uri` (ajv, the same) and `source-map-js` (vite
  and postcss, build only). Raised within their ranges to 5.9.4, 3.1.8 and
  1.2.2; no `package.json` range moves, the bundle does. Catalogue check and
  build green.

## 2.33.11 — 2026-10-13

- gobj-ui `^7.26.41` (deploy round, which tests the app before deploying it
  now: `npm test -- locales`): a table edit in a form is `edited` whatever the
  form opened with, and a change of language no longer duplicates the column
  titles of a table.
- `tests/locales.mjs`: check 3 took for untranslated a value equal to its key
  outside English, and gobj-ui's badge key `"{{name}}, {{n}}"` is written the
  same in six of the ten languages: the suite was red from 2.33.5 to 2.33.10.
  A key with no word to translate (placeholders and punctuation only) is
  exempt (yunovatios `REV-CLOUD.md` V24.6.1).
- `deploy_yunomusica.sh` stops on a failed step (`set -eu`): a failed backup
  went on to the rsync (V24.6.2).

## 2.33.10 — 2026-10-13

- gobj-ui `^7.26.40` (deploy round): the library's charts ink their Y axis
  with the theme. No change of the app's own code.

## 2.33.9 — 2026-10-13

- gobj-ui `^7.26.39` (deploy round): closing a form asks only for what the
  reader changed. No change of the app's own code.

## 2.33.8 — 2026-10-13

- gobj-ui `^7.26.38` (deploy round): a guard that asks before a modal closes
  asks once. No change of the app's own code.

## 2.33.7 — 2026-10-13

- gobj-ui `^7.26.37` (deploy round): the editor of a boolean cell is a box to
  tick. No change of the app's own code.

## 2.33.6 — 2026-10-13

- gobj-ui `^7.26.36` (deploy round): the composed title of a dock chip changes
  language. No change of the app's own code.

## 2.33.5 — 2026-10-13

- gobj-ui `^7.26.35`, gobj-js `^7.26.20` (deploy round). The shell's new key
  `"{{name}}, {{n}}"` (a menu badge said with the name of its entry) in the ten
  locales, with each language's own comma. The version is raised by the round
  now (V23.6.1: 2.33.4 had covered two rounds).

## 2.33.4 — 2026-10-12 to 2026-10-13

- gobj-ui `^7.26.29`, and the rounds of 7.26.31 to 7.26.34, which did not
  raise the app's version yet. No change of the app's own code.
