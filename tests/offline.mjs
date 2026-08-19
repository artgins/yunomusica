/***********************************************************************
 *          offline.mjs
 *
 *      The plane test.
 *
 *      The bug this pins down was reported from a flight: an installed
 *      yunomúsica, a phone full of music, no network — and a blank
 *      screen. The app was called offline because nothing it read ever
 *      left the device, which was true and was not the same claim. There
 *      was no service worker at all, so opening the app was an ordinary
 *      request for index.html and the bundle.
 *
 *      So the test is the flight: boot once with the network, cut it,
 *      reload, and the app must come up and still play a local file.
 *      Playing matters as much as painting — an app that draws its own
 *      shell but cannot reach the music is no more use at 30,000 feet.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {readdirSync, statSync} from "fs";
import {join} from "path";
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";
import {ensure_fixtures} from "./fixtures.mjs";

const FIX = ensure_fixtures();

function walk(dir, out = [])
{
    for(const n of readdirSync(dir)) {
        const p = join(dir, n);
        if(statSync(p).isDirectory()) { walk(p, out); } else { out.push(p); }
    }
    return out;
}

const browser = await launch();
const page = await new_page(browser, {no_fsa: true});

/*  1. one visit with the network, which is what fills the cache */
await boot(page);
const reg = await page.evaluate(async () => {
    if(!("serviceWorker" in navigator)) {
        return "unsupported";
    }
    const r = await navigator.serviceWorker.ready;
    return r && r.active ? r.active.state : "none";
});
console.log("1. tras la primera visita -> worker:", reg);

const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    if(!names.length) {
        return {cache: "none", files: 0};
    }
    const c = await caches.open(names[0]);
    const keys = await c.keys();
    return {cache: names[0], files: keys.length,
            has_index: keys.some((k) => k.url.endsWith("/index.html"))};
});
console.log("   caché:", cached.cache, "| ficheros:", cached.files,
            "| index.html:", cached.has_index);

/*  2. the network goes away and the app is opened again */
await page.context().setOffline(true);
/*  Playwright's offline emulation drops `navigator.onLine` on the live
    page and then hands the RELOADED document a fresh `true`, which no
    real device does. Pinning it is not the test cheating: on a plane the
    flag is false, and the app is supposed to notice and skip the version
    check rather than log a failed request that could never have worked. */
await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", {get: () => false, configurable: true});
});
await page.reload({waitUntil: "domcontentloaded"});
await page.waitForTimeout(1800);

const booted = await page.locator(".MUS_DECK, .MUS_PLAYER, .yui-shell").count();
const title = await page.title();
console.log("2. sin red -> arranca:", booted > 0, "| título:", JSON.stringify(title));
await page.screenshot({path: `${OUT}/offline-boot.png`});

/*  3. and it can still play what is on the device. The music never came
       over the network in the first place; the point is that the app is
       now there to reach it. */
let played = false;
if(booted) {
    await add_source(page, walk(FIX.music), 2, 2500);
    await route(page, "#/player", 800);
    const n = await page.locator(".MUS_QROW").count();
    console.log("3. sin red -> pistas en la cola:", n);

    if(n) {
        /*  The audio element is a detached `new Audio()`, so the honest
            probe is the clock it drives, not a DOM query for <audio>. */
        await page.click(".MUS_TPLAY");
        await page.waitForTimeout(1400);
        const t1 = await page.locator(".MUS_TCUR").textContent();
        await page.waitForTimeout(1200);
        const t2 = await page.locator(".MUS_TCUR").textContent();
        played = t1 !== t2;
        console.log("   reloj:", t1, "->", t2);
    }
    console.log("   suena:", played);
    await page.screenshot({path: `${OUT}/offline-playing.png`});
}

await page.context().setOffline(false);

let bad = report(page);
if(!booted) {
    console.log(">>> sin red la app no arranca: sigue sin ser offline");
    bad = true;
}
if(booted && !played) {
    console.log(">>> arranca sin red pero no reproduce lo que hay en el dispositivo");
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
