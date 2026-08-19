/***********************************************************************
 *          covers.mjs
 *
 *      The one feature that reaches outside, held to its promises.
 *
 *      Five of them, and each one is a way this could go wrong quietly:
 *
 *        1. OFF by default means no request. The app says nothing leaves
 *           the device; while the switch is off that has to be literally
 *           true, not nearly true.
 *        2. It asks about ONE record — the one sounding — and not about
 *           the library. The `music` fixture is built for this: Ramones
 *           with a cover inside, Bach without. Playing the Bach must ask
 *           about the Bach and mention nothing else; a run that names
 *           Rocket to Russia is a run overwriting what the owner of the
 *           music chose.
 *        3. What goes out is artist and album, and nothing else.
 *        4. It paints when it comes back.
 *        5. It is kept. Playing the same record again, even after a
 *           reload, asks nobody anything.
 *
 *      The three services are answered here rather than over the real
 *      internet. MusicBrainz replies 503 "currently busy" often enough
 *      that a test depending on it would fail for reasons that have
 *      nothing to do with this app — and the fallback to iTunes is
 *      itself something to test, which needs a MusicBrainz that misses
 *      on demand.
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

/*  A red square, big enough to pass the "is this really a sleeve?" size
    check that throws away tracking pixels and 404 pages served as 200. */
function fake_art()
{
    const px = Buffer.alloc(120 * 120 * 3, 0);
    for(let i = 0; i < px.length; i += 3) { px[i] = 200; }
    /*  A BMP, because it can be built by hand and the app only cares
        that the type is an image and the body is not tiny. */
    const size = 54 + px.length;
    const head = Buffer.alloc(54);
    head.write("BM", 0);
    head.writeUInt32LE(size, 2);
    head.writeUInt32LE(54, 10);
    head.writeUInt32LE(40, 14);
    head.writeInt32LE(120, 18);
    head.writeInt32LE(120, 22);
    head.writeUInt16LE(1, 26);
    head.writeUInt16LE(24, 28);
    head.writeUInt32LE(px.length, 34);
    return Buffer.concat([head, px]);
}

const browser = await launch();
const page = await new_page(browser, {no_fsa: true});

/*  Everything the app asks the outside world, in order. */
const asked = [];

await page.route("**://musicbrainz.org/**", async (r) => {
    asked.push(r.request().url());
    /*  Misses on purpose: the point is that iTunes then answers. */
    await r.fulfill({status: 200, contentType: "application/json",
                     body: JSON.stringify({"release-groups": []})});
});
await page.route("**://coverartarchive.org/**", async (r) => {
    asked.push(r.request().url());
    await r.fulfill({status: 404, body: ""});
});
await page.route("**://itunes.apple.com/**", async (r) => {
    asked.push(r.request().url());
    await r.fulfill({status: 200, contentType: "application/json",
                     body: JSON.stringify({results: [{
                         artistName: "Bach", collectionName: "Cello Suites",
                         artworkUrl100: "https://is1-ssl.mzstatic.com/image/x/100x100bb.jpg"
                     }]})});
});
await page.route("**://is1-ssl.mzstatic.com/**", async (r) => {
    asked.push(r.request().url());
    await r.fulfill({status: 200, contentType: "image/bmp", body: fake_art()});
});

await boot(page);
await add_source(page, walk(FIX.music), 2, 2500);

/*  Put a record with NO cover of its own on, and leave it sounding.
 *
 *  Walking to it with the next button rather than trusting the clock is
 *  the difference between a test and a coin toss: the fixture tracks are
 *  five seconds long, so "press play and wait" lands on whatever the
 *  queue happened to reach. Stepping also exercises the trigger this
 *  feature now hangs on — a change of track. */
async function playing_now()
{
    return (await page.locator(".MUS_QROW.is-playing").first().textContent() || "").trim();
}

async function walk_to(who)
{
    for(let i = 0; i < 6; i++) {
        if((await playing_now()).includes(who)) {
            return true;
        }
        await page.click(".MUS_TNEXT");
        await page.waitForTimeout(900);
    }
    return (await playing_now()).includes(who);
}

await route(page, "#/player", 900);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(1200);
const on_bach = await walk_to("Bach");
/*  Pause on it. Five-second tracks would otherwise walk on while the
    switch is being found and pressed, and the record being asked about
    is the record the user is looking at — which, paused, is still this
    one. */
await page.click(".MUS_TPLAY");
await page.waitForTimeout(600);
console.log("suena un disco sin carátula (Bach):", on_bach, "|", await playing_now());

/*  1. off by default: a record is playing, time passes, nothing goes out */
await page.waitForTimeout(6000);
console.log("1. apagado -> peticiones al exterior:", asked.length);

/*  How many sleeves are on screen BEFORE anything is fetched. The
    Ramones cover came out of the file and is already painted, so the
    count that means something is the difference, not the total. */
await route(page, "#/library", 1000);
const painted_before = await page.evaluate(() =>
    [...document.querySelectorAll("img")].filter((i) => i.src.startsWith("blob:")).length);
console.log("   carátulas ya pintadas (del fichero):", painted_before);

await route(page, "#/sources", 800);
const box = page.locator(".MUS_COVOPT_CHECK");
console.log("   interruptor presente:", await box.count(),
            "| encendido:", await box.isChecked());
await page.screenshot({path: `${OUT}/covers-switch-off.png`});
const clean_start = asked.length === 0 && (await box.count()) === 1 &&
                    (await box.isChecked()) === false;

/*  1b. the offer is made where the missing sleeve is, not only in
       Sources — which is the whole reason this bar exists. */
await route(page, "#/player", 900);
const offered = await page.locator(".MUS_COVBAR").count();
console.log("1b. la oferta sale en el Reproductor:", offered > 0);
await page.screenshot({path: `${OUT}/covers-offer.png`});

/*  2. answered from that bar, it goes to work on what is sounding */
if(offered) {
    await page.locator(".MUS_COVBAR .is-primary").click();
} else {
    await route(page, "#/sources", 600);
    await box.check();
}
await page.waitForTimeout(12000);

const hosts = asked.map((u) => new URL(u).host);
console.log("2. encendido -> servicios consultados:",
            [...new Set(hosts)].join(", ") || "ninguno");

const mb = asked.filter((u) => u.includes("musicbrainz"));
const it = asked.filter((u) => u.includes("itunes"));
console.log("   MusicBrainz:", mb.length, "| iTunes (respaldo):", it.length);
for(const u of mb.concat(it)) {
    console.log("   pregunta:", decodeURIComponent(u).slice(0, 130));
}

/*  2b. answering it makes the bar go away for good */
await route(page, "#/player", 900);
const still_offering = await page.locator(".MUS_COVBAR").count();
console.log("2b. la oferta desaparece tras contestarla:", still_offering === 0);

/*  3. it asked about the album with no cover, and left the other alone */
const all = decodeURIComponent(asked.join(" | "));
const asked_bach = /Cello Suites/i.test(all);
const asked_ramones = /Rocket to Russia/i.test(all);
console.log("3. pregunta por el disco sin carátula (Bach):", asked_bach);
console.log("   respeta la carátula del fichero (Ramones):", !asked_ramones);

/*  4. and what came back is now painted */
await route(page, "#/library", 1200);
const painted = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    return imgs.filter((i) => i.src.startsWith("blob:")).length;
});
console.log("4. carátulas pintadas en la biblioteca:", painted,
            "(antes", painted_before + ")");
await page.screenshot({path: `${OUT}/covers-found.png`, fullPage: true});

/*  5. it is kept: the same record, sounding again after a reload, is not
       asked about a second time. This is the point of storing it. */
const before = asked.length;
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(2500);
await route(page, "#/player", 1200);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(1200);
await walk_to("Bach");
await page.click(".MUS_TPLAY");
await page.waitForTimeout(7000);
console.log("5. mismo disco tras recargar -> preguntas nuevas:", asked.length - before,
            "| suena:", await playing_now());

let bad = report(page);
if(!on_bach) {
    console.log(">>> el test no consiguió poner el disco sin carátula");
    bad = true;
}
if(!clean_start) {
    console.log(">>> apagado no significa apagado");
    bad = true;
}
if(!offered) {
    console.log(">>> no se ofrece donde falta la carátula");
    bad = true;
}
if(still_offering) {
    console.log(">>> la oferta sigue ahí después de contestarla");
    bad = true;
}
if(!asked_bach || asked_ramones) {
    console.log(">>> pregunta por los discos equivocados");
    bad = true;
}
if(!it.length) {
    console.log(">>> no cae al respaldo cuando MusicBrainz no contesta");
    bad = true;
}
if(painted <= painted_before) {
    console.log(">>> la carátula encontrada no se pinta");
    bad = true;
}
if(asked.length - before !== 0) {
    console.log(">>> vuelve a preguntar por lo que ya sabe");
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
