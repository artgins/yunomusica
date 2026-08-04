/***********************************************************************
 *          storage.mjs
 *
 *      A schema upgrade must not cost the user their storage because a
 *      second tab is open.
 *
 *      IndexedDB will not upgrade a database while another connection is
 *      still on the old version: it fires `blocked` and the open never
 *      completes. So the day DB_VERSION goes up, every user with two
 *      tabs of the app open — one of them still running yesterday's
 *      bundle — gets a tab that can store NOTHING, and the app used to
 *      report that as "this browser is not letting the app store
 *      anything", which sent people into their privacy settings after a
 *      problem that was one tab away from being fixed.
 *
 *      Three things are pinned here:
 *        1. the blocked tab says what is actually wrong;
 *        2. it recovers on its own once the other tab is gone — the
 *           failure is not memoised for the life of the page;
 *        3. a tab running THIS code steps aside when a newer one needs
 *           to upgrade, so the next bump costs nobody anything.
 *
 *      Chrome, because it is about IndexedDB semantics, which are the
 *      same everywhere; `firefox.mjs` covers what is engine-specific.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {chromium} from "playwright";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = join(HERE, "out");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const BASE = process.env.YUNOMUSICA_URL || "http://localhost:4321/";

const warnings = (page) => page.locator(".is-warn").allTextContents();

async function to_sources(page)
{
    await page.waitForTimeout(2000);
    if(await page.locator(".MUS_ABOUT_CLOSE").count()) {
        await page.click(".MUS_ABOUT_CLOSE");
    }
    await page.evaluate(() => { location.hash = "#/sources"; });
    await page.waitForTimeout(1200);
}

const browser = await chromium.launch({executablePath: CHROME});
const ctx = await browser.newContext();
const errors = [];

/*  Tab A is yesterday's bundle: same app, one schema version behind.
    Nothing else about it differs, which is the point. */
const old = await ctx.newPage();
await old.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = (name, ver) => open(name, name === "yunomusica" ? ver - 1 : ver);
    /*  And it does not step aside, because yesterday's bundle did not
        know it had to. Without this the tab under test would be a tab
        that already carries the fix, and the block it is supposed to
        cause would never happen. */
    Object.defineProperty(IDBDatabase.prototype, "onversionchange", {
        get: () => null,
        set: () => {},
    });
});
await old.goto(BASE, {waitUntil: "domcontentloaded"});
await old.waitForTimeout(2500);
console.log("1. una pestaña con el bundle de ayer, reteniendo el esquema anterior");

/*  Tab B is today's, and wants the upgrade. */
const now = await ctx.newPage();
now.on("pageerror", (e) => errors.push("PAGEERROR: " + (e && e.message)));
now.on("console", (m) => { if(m.type() === "error") { errors.push(m.text()); } });
await now.goto(BASE, {waitUntil: "domcontentloaded"});
await to_sources(now);

const said = (await warnings(now)).join(" | ");
const named_the_cause = /pestaña|tab/i.test(said);
console.log("2. la pestaña nueva dice:", said.slice(0, 90) || "(nada)");
console.log("   nombra la causa real:", named_the_cause);
await now.screenshot({path: `${OUT}/storage-blocked.png`});

/*  Closing the old tab must be enough. No reload: the blocked open is
    not a verdict, and the app should find that out by itself. */
await old.close();
await now.waitForTimeout(1200);
await now.evaluate(() => { location.hash = "#/player"; });
await now.waitForTimeout(400);
await now.evaluate(() => { location.hash = "#/sources"; });
await now.waitForTimeout(2500);
const after = (await warnings(now)).join(" | ");
const recovered = !/pestaña|tab/i.test(after);
console.log("3. cerrada la vieja, sin recargar -> recuperada:", recovered,
            after ? `(queda: ${after.slice(0, 60)})` : "");

let bad = false;
if(!named_the_cause) {
    console.log(">>> la pestaña bloqueada no dice que la culpa es de otra pestaña");
    bad = true;
}
if(!recovered) {
    console.log(">>> no se recupera al cerrar la pestaña vieja: el fallo quedó memorizado");
    bad = true;
}
console.log(`=== ERRORS (${errors.length}) ===`);
for(const e of errors) {
    console.log(e);
}
await browser.close();
process.exit(bad || errors.length ? 1 : 0);
