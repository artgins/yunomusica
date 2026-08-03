/***********************************************************************
 *          minink.mjs
 *
 *      The mini-player's play button, in all five palettes and both
 *      schemes.
 *
 *      It gets its own test because it is the one accented surface the
 *      nav/button test cannot see: it only exists once something is
 *      playing AND you have navigated off the deck. It shipped with a
 *      near-white glyph on gold — about 1.5:1 — for exactly that reason,
 *      `.MUS_PCTL button { color: inherit }` having outranked it on
 *      specificity.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {launch, new_page, boot, route, add_source, lum, contrast,
        set_theme, set_palette, report} from "./lib.mjs";

const FIX = ensure_fixtures();

const PALETTES = [
    ["auto", "Según la carátula"],
    ["gold", "Oro"],
    ["ice",  "Hielo"],
    ["rose", "Rosa"],
    ["leaf", "Hoja"]
];

const browser = await launch();
const page = await new_page(browser, {viewport: {width: 1000, height: 900}});

await boot(page);
await add_source(page, FIX.longtracks);

/*  something playing, and off the deck, or there is no mini-player */
await route(page, "#/player");
await page.click(".MUS_TPLAY");
await page.waitForTimeout(600);
await route(page, "#/library", 900);

console.log("paleta   esquema   tinta botón mini   fondo             contraste");
let bad = 0;

for(const [pal, label] of PALETTES) {
    for(const theme of ["light", "dark"]) {
        await set_theme(page, theme);
        await set_palette(page, label);

        const r = await page.evaluate(() => {
            const e = document.querySelector(".MUS_PPLAY");
            if(!e) {
                return null;
            }
            const s = getComputedStyle(e);
            return {c: s.color, b: s.backgroundColor};
        });
        if(!r) {
            console.log(`${pal} ${theme}: sin mini-reproductor`);
            bad++;
            continue;
        }

        const k = contrast(r.c, r.b);
        /*  In dark the ink must actually be dark: white-on-accent is
            legible by the numbers and still shouts, which is what the
            user objected to. */
        const ok = k >= 4.5 && (theme === "light" || lum(r.c) < 0.5);
        if(!ok) {
            bad++;
        }
        console.log(`${pal.padEnd(8)} ${theme.padEnd(9)} ${r.c.padEnd(17)} ${r.b.padEnd(17)} ${k.toFixed(1)}  ${ok ? "ok" : ">>>"}`);
    }
}

console.log(bad ? `>>> ${bad} casos` : "botón del mini-reproductor: legible en las 10 combinaciones");
const errs = report(page);
await browser.close();
process.exit(bad + errs ? 1 : 0);
