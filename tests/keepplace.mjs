/***********************************************************************
 *          keepplace.mjs
 *
 *      Where does the deck come back to, when the app did not get to
 *      say goodbye?
 *
 *      The position used to be written on the "queue" and "playing"
 *      channels and nowhere else — when a track starts, when one ends,
 *      when the queue is edited. Across an album that is a fresh
 *      snapshot every few minutes and the loss is small enough to miss.
 *
 *      Inside ONE long track nothing changes for as long as it lasts.
 *      This library is DJ sessions of four hours in a single mp3: press
 *      play, `time: 0` is stored, and two hours later the phone's
 *      system reclaims the app — which it does, and which the app
 *      cannot prevent. It came back at 0:00, having thrown away two
 *      hours of listening.
 *
 *      So the position is written every fifteen seconds while the music
 *      is moving, and this pins it: the number ON DISK has to follow
 *      the clock ON SCREEN, and a reload has to land where the music
 *      was rather than at the beginning.
 *
 *      A reload stands in for the kill. From the deck's point of view
 *      they are the same event — a new document reading whatever the
 *      last one managed to leave behind.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {launch, new_page, boot, route, add_source, report} from "./lib.mjs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
/*  Six tracks of 25 seconds. Long enough to play through the save
    interval without a track change — which is the whole point: a track
    change would write a snapshot and hide the bug. */
const LONG = join(HERE, "fixtures", "longtracks", "Brain Salad Surgery");

/*  The app writes every 15 s; give it one interval and a margin. */
const PLAY_FOR = 20000;

const browser = await launch();
const page = await new_page(browser, {locale: "en-GB"});
await boot(page);

let bad = [];

await add_source(page, [LONG], 1, 4000);
await route(page, "#/player", 1200);

const clock = () => page.evaluate(
    () => (document.querySelector(".MUS_TCUR") || {}).textContent || "");

/*  What the deck left on disk for the next launch to find. */
const stored = () => page.evaluate(async () => {
    const db = await new Promise((res) => {
        const r = indexedDB.open("yunomusica");
        r.onsuccess = () => res(r.result);
    });
    const row = await new Promise((res) => {
        const q = db.transaction("prefs").objectStore("prefs").get("queue");
        q.onsuccess = () => res(q.result);
        q.onerror = () => res(null);
    });
    if (!row || !row.value) {
        return null;
    }
    return {index: row.value.index, time: Math.round(row.value.time)};
});

const secs = (mmss) => {
    const p = String(mmss).split(":");
    return (p.length === 2) ? (Number(p[0]) * 60 + Number(p[1])) : 0;
};

await page.locator(".MUS_QROW").first().locator(".MUS_IBTN").first().click();
await page.waitForTimeout(2500);
console.log("started at:", await clock());

/*  Play on, changing NOTHING: no track change, no pause, no edit. */
await page.waitForTimeout(PLAY_FOR);

const on_screen = await clock();
const on_disk = await stored();
console.log("clock:", on_screen, " stored:", JSON.stringify(on_disk));

if (!on_disk) {
    bad.push("the deck stored nothing at all while it was playing");
} else if (secs(on_screen) < 10) {
    bad.push("the track did not play: the clock is at " + on_screen);
} else if (on_disk.time < 10) {
    bad.push("after " + on_screen + " of playing, the position on disk is " +
             on_disk.time + "s — a kill here throws the listening away");
}

/*  And the half the user sees: come back, and be where the music was. */
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(2500);
await route(page, "#/player", 1200);
const back = await clock();
console.log("came back at:", back, "(was at " + on_screen + ")");

if (secs(back) < 10) {
    bad.push("it came back at " + back + " after being at " + on_screen);
}
/*  Not ahead of where it was, either: a restore that overshoots is a
    different bug wearing the same green. */
if (secs(back) > secs(on_screen) + 5) {
    bad.push("it came back at " + back + ", past where it was (" + on_screen + ")");
}

console.log(bad.length ? "FAIL" : "ok: the deck keeps its place inside a long track");
bad.forEach((b) => console.log("  >>> " + b));

const errs = report(page);
await browser.close();
process.exit((bad.length || errs) ? 1 : 0);
