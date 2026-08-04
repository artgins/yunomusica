/***********************************************************************
 *          firefox.mjs
 *
 *      The one test that is not Chrome, and the reason it exists.
 *
 *      Firefox answers navigator.storage.persist() with a permission
 *      doorhanger, and the promise it returns does not settle until
 *      somebody answers it. A doorhanger nobody notices is never
 *      answered. The app used to `await` that call before reading a
 *      folder, so on Firefox the read never began: no walk, no tags, no
 *      tracks — a scan bar up for ever over an empty library. On
 *      Chromium the same await costs a millisecond, which is exactly why
 *      a Chrome-only suite let it ship.
 *
 *      So this test runs a real Firefox and NEVER answers the prompt —
 *      the state the bug needed. What it asserts is that the music is
 *      read anyway.
 *
 *      Loose files, not a folder: Firefox has no File System Access API,
 *      so that is the only path it has, and it is the path the user is
 *      on.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {firefox} from "playwright";
import {readdirSync, statSync} from "fs";
import {join, dirname} from "path";
import {fileURLToPath} from "url";

import {ensure_fixtures} from "./fixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = join(HERE, "out");
const BASE = process.env.YUNOMUSICA_URL || "http://localhost:4321/";

/*  How long the read may take before we call it hung. The scan itself
    finishes in about two seconds; the point of the margin is that the
    unanswered prompt must not add to it. */
const PATIENCE = 20000;

function walk(dir, out = [])
{
    for(const e of readdirSync(dir)) {
        const f = join(dir, e);
        if(statSync(f).isDirectory()) {
            walk(f, out);
        } else if(/\.(mp3|flac|ogg|m4a|wav)$/i.test(e)) {
            out.push(f);
        }
    }
    return out;
}

const FIX = ensure_fixtures();
const files = walk(FIX.mimusica).slice(0, 8);

const browser = await firefox.launch();
const page = await (await browser.newContext({locale: "es-ES"})).newPage();

const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + (e && e.message)));
page.on("console", (m) => { if(m.type() === "error") { errors.push(m.text()); } });

/*  A heartbeat: it only advances while the main thread is free. It tells
    a hang that is WAITING on something apart from one that has frozen
    the page, and the two need different fixes. */
await page.addInitScript(() => {
    window.__beat = 0;
    setInterval(() => { window.__beat++; }, 100);
});

await page.goto(BASE, {waitUntil: "domcontentloaded"});
await page.waitForTimeout(1500);
if(await page.locator(".MUS_ABOUT_CLOSE").count()) {
    await page.click(".MUS_ABOUT_CLOSE");
}
await page.evaluate(() => { location.hash = "#/sources"; });
await page.waitForTimeout(600);

const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.click(".MUS_SECHEAD .MUS_QBTN:nth-child(2)")
]);
await chooser.setFiles(files);
console.log(`1. ${files.length} ficheros entregados a Firefox`);

/*  The prompt is deliberately left unanswered for the whole test. */
const t0 = Date.now();
let tracks = 0, beat0 = 0, beat1 = 0;
while(Date.now() - t0 < PATIENCE) {
    await new Promise((r) => setTimeout(r, 500));
    const st = await page.evaluate(() => ({
        beat:   window.__beat,
        tracks: document.querySelectorAll(".MUS_QROW").length,
        bar:    !!document.querySelector(".MUS_SCANBAR.is-on, .MUS_SCAN.is-on"),
    }));
    if(!beat0) {
        beat0 = st.beat;
    }
    beat1 = st.beat;
    tracks = st.tracks;
    if(tracks && !st.bar) {
        break;
    }
}
const secs = (Date.now() - t0) / 1000;

console.log(`2. leído en ${secs.toFixed(1)}s -> pistas en la cola: ${tracks}`);
console.log(`3. hilo principal vivo durante la espera: ${beat1 > beat0}`);

await page.screenshot({path: `${OUT}/firefox.png`});

let bad = false;
if(!tracks) {
    console.log(">>> Firefox no llegó a leer la música: el escaneo se quedó esperando");
    bad = true;
}
if(secs > 10) {
    console.log(`>>> la lectura tardó ${secs.toFixed(1)}s: algo la está esperando`);
    bad = true;
}
console.log(`=== ERRORS (${errors.length}) ===`);
for(const e of errors) {
    console.log(e);
}
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
