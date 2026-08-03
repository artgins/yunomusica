/***********************************************************************
 *          navink.mjs
 *
 *      The active nav item and the primary buttons, in all five
 *      palettes and both schemes: legible, and painted in the SAME ink
 *      as each other. Two accented surfaces disagreeing about whether
 *      their ink is black or white is the thing that looks broken even
 *      when both are individually readable.
 *
 *      Driven through the app's own palette menu and theme toggle —
 *      see set_theme/set_palette in lib.mjs for why that matters.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {launch, new_page, boot, route, lum, contrast, set_theme, set_palette, report} from "./lib.mjs";

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
await route(page, "#/sources");

console.log("paleta   esquema   nav activo        botón primario     contraste  ¿misma tinta?");
let bad = 0;

for(const [pal, label] of PALETTES) {
    for(const theme of ["light", "dark"]) {
        await set_theme(page, theme);
        await set_palette(page, label);

        const r = await page.evaluate(() => {
            const nav = document.querySelector(".yui-nav-item.is-active, li.is-active > .yui-nav-item");
            const btn = document.querySelector(".MUS_SECHEAD .MUS_QBTN.is-primary");
            const g = (e) => e ? {c: getComputedStyle(e).color, b: getComputedStyle(e).backgroundColor} : null;
            return {nav: g(nav), btn: g(btn)};
        });
        if(!r.nav || !r.btn) {
            console.log(`${pal} ${theme}: no medible`);
            bad++;
            continue;
        }

        const cn = contrast(r.nav.c, r.nav.b), cb = contrast(r.btn.c, r.btn.b);
        const dark_ink = (c) => lum(c) < 0.5;
        const same = dark_ink(r.nav.c) === dark_ink(r.btn.c);
        const ok = cn >= 4.5 && cb >= 4.5 && same;
        if(!ok) {
            bad++;
        }
        console.log(`${pal.padEnd(8)} ${theme.padEnd(9)} ${r.nav.c.padEnd(17)} ${r.btn.c.padEnd(18)} ` +
                    `${cn.toFixed(1)}/${cb.toFixed(1)}   ${same ? "sí" : "NO"}  ${ok ? "ok" : ">>>"}`);
    }
}

console.log(bad ? `>>> ${bad} casos` : "nav y botones: misma tinta y legibles en las 10 combinaciones");
const errs = report(page);
await browser.close();
process.exit(bad + errs ? 1 : 0);
