/***********************************************************************
 *          fitmobile.mjs
 *
 *      Nothing may stick out of a phone screen, on any route, with real
 *      content: long folder names, long paths, the long notices.
 *
 *      The shell lays its views out as `.yui-zone-center > * { flex: 1 0
 *      auto }` — flex items with shrink 0 — so a view without an
 *      explicit width is sized by its widest child and never comes back
 *      down. One long unbreakable string then carries the whole view off
 *      the side of the phone, and it is invisible on a desktop viewport.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();

const browser = await launch();
const page = await new_page(browser, {viewport: {width: 390, height: 844}, mobile: true});

await boot(page);
await add_source(page, FIX.mimusica, 1, 5000);

/*  force the longest notice there is */
await page.evaluate(() => {
    const el = document.querySelector(".MUS_NOTICE span");
    if(el) {
        el.textContent = "Ese fichero no se ha podido leer. Puede que lo hayas movido o borrado.";
    }
});

let bad_routes = 0;

const check = async (hash, label) => {
    await route(page, hash, 900);
    const bad = await page.evaluate(() => {
        const vw = innerWidth, out = [];
        /*  A strip that scrolls sideways ON PURPOSE (the library chips)
            legitimately keeps items out of view. Only flag things that
            escape a container which is NOT meant to scroll. */
        const in_scroller = (e) => {
            for(let p = e.parentElement; p; p = p.parentElement) {
                const ox = getComputedStyle(p).overflowX;
                if(ox === "auto" || ox === "scroll") return true;
                if(p.classList.contains("yui-zone-center")) return false;
            }
            return false;
        };
        for(const e of document.querySelectorAll(".yui-zone-center *, .MUS_PLAYER *, .MUS_SCANBAR *")) {
            const b = e.getBoundingClientRect();
            if(b.width === 0 && b.height === 0) continue;
            if(in_scroller(e)) continue;
            if(b.right > vw + 1 || b.left < -1) {
                out.push(`${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]} [${Math.round(b.left)}..${Math.round(b.right)}]`);
            }
        }
        return {vw, zoneScrollW: (document.querySelector(".yui-zone-center") || {}).scrollWidth,
                docScrollW: document.documentElement.scrollWidth, out: [...new Set(out)].slice(0, 6)};
    });
    const ok = bad.out.length === 0 && bad.zoneScrollW <= bad.vw + 1;
    if(!ok) {
        bad_routes++;
    }
    console.log(`  ${label.padEnd(12)} ${ok ? "cabe" : ">>> SE SALE"}  zona=${bad.zoneScrollW} doc=${bad.docScrollW} vw=${bad.vw}`);
    bad.out.forEach((o) => console.log("      " + o));
    await page.screenshot({path: `${OUT}/fit-${label}.png`});
};

await check("#/player", "player");

/*  unfold a track's details first: the path is the longest unbreakable
    string the library can produce */
await route(page, "#/library");
await page.locator(".MUS_CHIP").nth(4).click();
await page.waitForTimeout(700);
await page.locator(".C_MUS_VIEW .MUS_ROWMAIN").nth(1).click();
await page.waitForTimeout(500);
await check("#/library", "library");

await check("#/sources", "sources");
await check("#/lists", "lists");

const bad = report(page) + bad_routes;
await browser.close();
process.exit(bad ? 1 : 0);
