# Changelog

This file starts on 2026-10-13. What came before is in the git log.

Each release of `@yuneta/gobj-ui` reaches this app through gobj-ui's deploy
round, which raises the range and the third number of the app's version, and
builds, tests and deploys it; the line of each round is written here after it.

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
