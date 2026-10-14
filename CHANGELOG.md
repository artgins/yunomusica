# Changelog

This file starts on 2026-10-13. What came before is in the git log.

Each release of `@yuneta/gobj-ui` reaches this app through gobj-ui's deploy
round, which raises the range and the third number of the app's version, and
builds, tests and deploys it; the line of each round is written here after it.

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
