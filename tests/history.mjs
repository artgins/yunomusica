/***********************************************************************
 *          history.mjs
 *
 *      What was listened to gets written down, and what it adds up to
 *      can be read back.
 *
 *      The rules this pins, all of them cheap to break by accident:
 *
 *        - Listening is counted, waiting is not. A deck that sits
 *          paused for a minute must add nothing.
 *        - A session appears in "recent" once it has really sounded,
 *          and it can be put back on the deck afterwards.
 *        - Favourite tracks are counted plays, not tracks touched.
 *        - Clearing the history clears it, and it survives a reload
 *          until then — it is in IndexedDB, not in a variable.
 *
 *      The fixture tracks are a second long, so the "20 seconds or half
 *      the track" rule counts a play after half a second here. That is
 *      the rule working, not the test cheating: a second-long track IS
 *      half-listened after half a second.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {readdirSync, statSync} from "fs";
import {join} from "path";

import {ensure_fixtures} from "./fixtures.mjs";
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();

/*  The loose-files picker takes files, not a folder. */
function walk(dir, out = [])
{
    for(const n of readdirSync(dir)) {
        const p = join(dir, n);
        if(statSync(p).isDirectory()) { walk(p, out); } else { out.push(p); }
    }
    return out;
}
const browser = await launch();
const page = await new_page(browser, {viewport: {width: 1280, height: 900},
                                      locale: "es-ES"});

const bad = [];

await boot(page);
await add_source(page, walk(FIX.music), 2, 2500);

/*  Every selector here is scoped to the view: keep_alive leaves every
    visited screen mounted, and Sources uses the same row class. An
    unscoped .MUS_SRCROW counts the authorised folders and reports a
    history that was never written. */

/*  Nothing has sounded yet. */
await route(page, "#/history", 700);
const empty = await page.locator(".C_MUS_HISTORY .MUS_EMPTY_NOTE").count();
if(!empty) {
    bad.push("the history was not empty before anything played");
}
await page.screenshot({path: `${OUT}/history-empty.png`});

/*  A minute of nothing: paused is not listened to. */
await route(page, "#/player", 500);
await page.waitForTimeout(2500);
await route(page, "#/history", 600);
if(await page.locator(".C_MUS_HISTORY .MUS_SRCROW").count()) {
    bad.push("a paused deck was recorded as listening");
}

/*  Now actually listen. */
await route(page, "#/player", 400);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(9000);
await page.click(".MUS_TPLAY");          // pause: flushes what is open
await page.waitForTimeout(600);

await route(page, "#/history", 800);
const sessions = await page.locator(".C_MUS_HISTORY .MUS_SRCROW").count();
if(sessions < 1) {
    bad.push("nine seconds of music left no session in the history");
}
const first = (await page.locator(".C_MUS_HISTORY .MUS_SRCROW").first().textContent() || "").trim();
console.log("sesión:", first.replace(/\s+/g, " ").slice(0, 90));
await page.screenshot({path: `${OUT}/history-recent.png`});

/*  Favourite tracks: counted plays. */
const chips = await page.locator(".C_MUS_HISTORY .MUS_CHIP").allTextContents();
console.log("chips:", chips.join(" | "));
if(chips.length !== 5) {
    bad.push(`expected five chips, found ${chips.length}`);
}
await page.locator(".C_MUS_HISTORY .MUS_CHIP").nth(2).click();
await page.waitForTimeout(500);
const fav = await page.locator(".C_MUS_HISTORY .MUS_SRCROW").count();
console.log("canciones favoritas:", fav);
if(fav < 1) {
    bad.push("no track was counted as played");
}
await page.screenshot({path: `${OUT}/history-tracks.png`});

/*  Albums and artists are the same sum over another field. */
for(const [i, what] of [[3, "álbumes"], [4, "artistas"]]) {
    await page.locator(".C_MUS_HISTORY .MUS_CHIP").nth(i).click();
    await page.waitForTimeout(400);
    const n = await page.locator(".C_MUS_HISTORY .MUS_SRCROW").count();
    console.log(`${what} favoritos:`, n);
    if(n < 1) {
        bad.push(`nothing under ${what}`);
    }
}

/*  It is in IndexedDB, not in a variable. */
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(1800);
await route(page, "#/history", 900);
const after_reload = await page.locator(".C_MUS_HISTORY .MUS_SRCROW").count();
console.log("tras recargar:", after_reload);
if(after_reload < 1) {
    bad.push("the history did not survive a reload");
}

/*  A remembered queue goes back on the deck. */
await page.locator(".C_MUS_HISTORY .MUS_SRCROW").first().locator(".MUS_QBTN").nth(1).click();
await page.waitForTimeout(800);
await route(page, "#/player", 600);
const requeued = await page.locator(".MUS_QROW").count();
console.log("cola tras re-encolar:", requeued);
if(requeued < 1) {
    bad.push("adding a remembered session to the queue did nothing");
}

/*  And it can be wiped. */
await route(page, "#/history", 600);
await page.locator(".MUS_HISTFOOT .MUS_QBTN").first().click();
await page.waitForTimeout(300);
await page.locator(".MUS_HISTFOOT .is-danger").click();
await page.waitForTimeout(700);
const left = await page.locator(".C_MUS_HISTORY .MUS_SRCROW").count();
console.log("tras borrar:", left, "filas");
if(left) {
    bad.push(`${left} rows survived "clear the history"`);
}
await page.screenshot({path: `${OUT}/history-cleared.png`});

bad.forEach((m) => console.log("    " + m));
const errs = report(page);
await browser.close();

console.log((bad.length + errs)
    ? `>>> ${bad.length + errs} problemas en la historia`
    : "la historia se apunta, se lee, se reencola y se borra");
process.exit(bad.length + errs ? 1 : 0);
