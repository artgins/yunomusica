/***********************************************************************
 *          choices.mjs
 *
 *      The toolbar says what is chosen.
 *
 *      What goes red here:
 *
 *        1. The language menu marks exactly one row, the language in
 *           force — at start and after switching.
 *        2. The colours menu marks exactly one row, the palette in
 *           force — at start ("auto") and after choosing another, and
 *           still after a reload.
 *        3. The theme button shows the theme in force, as in every app:
 *           the moon in dark, the sun in light. Its tooltip and its
 *           name say where a press goes, in the language in force. Up
 *           to 2.35.0 it was always the moon; 2.36.1-2.36.12 showed
 *           the theme it switches to.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {launch, new_page, boot, set_theme, set_palette, report} from "./lib.mjs";

const browser = await launch();
const page = await new_page(browser, {viewport: {width: 1100, height: 800}});
await boot(page);

let bad = [];
const check = (label, ok) => {
    console.log(`${ok ? "ok " : ">>>"} ${label}`);
    if(!ok) { bad.push(label); }
};

/*  The ids of the marked rows of one toolbar dropdown. */
async function marked(toolbar_id)
{
    await page.click(`[data-toolbar-item-id="${toolbar_id}"]`);
    await page.waitForTimeout(400);
    const ids = await page.evaluate(() =>
        [...document.querySelectorAll(".yui-toolbar-dropdown-panel .yui-toolbar-dropdown-item")]
            .filter((b) => b.classList.contains("is-selected") &&
                           b.getAttribute("aria-checked") === "true")
            .map((b) => b.dataset.dropdownItemId));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    return ids;
}

async function theme_icon()
{
    return page.evaluate(() => {
        const i = document.querySelector('[data-toolbar-item-id="theme"] .icon i');
        return i ? i.className : "";
    });
}

/*  The theme button's tooltip, and whether its name says the same. */
async function theme_tip()
{
    return page.evaluate(() => {
        const b = document.querySelector('[data-toolbar-item-id="theme"]');
        const tip = b ? b.getAttribute("title") : "";
        return b && b.getAttribute("aria-label") === tip ? tip : "(nombre distinto) " + tip;
    });
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/*  1. Language. */
check("idioma al arrancar: lang-es", same(await marked("language"), ["lang-es"]));
await page.click('[data-toolbar-item-id="language"]');
await page.waitForTimeout(400);
await page.click('[data-dropdown-item-id="lang-fr"]');
await page.waitForTimeout(700);
check("idioma tras elegir francés: lang-fr", same(await marked("language"), ["lang-fr"]));
await page.click('[data-toolbar-item-id="language"]');
await page.waitForTimeout(400);
await page.click('[data-dropdown-item-id="lang-es"]');
await page.waitForTimeout(700);

/*  2. Palette. */
check("paleta al arrancar: pal-auto", same(await marked("palette"), ["pal-auto"]));
await set_palette(page, "Aurora");
check("paleta tras elegir Aurora: pal-aurora", same(await marked("palette"), ["pal-aurora"]));

/*  3. Theme. */
await set_theme(page, "dark");
check("tema oscuro: luna", (await theme_icon()) === "yi-moon");
check("tema oscuro: «Cambiar a tema claro»", (await theme_tip()) === "Cambiar a tema claro");
await set_theme(page, "light");
check("tema claro: sol", (await theme_icon()) === "yi-sun");
check("tema claro: «Cambiar a tema oscuro»", (await theme_tip()) === "Cambiar a tema oscuro");

/*  In another language, the tooltip follows: a language switch must not
    put back the generic "theme" text. */
await page.click('[data-toolbar-item-id="language"]');
await page.waitForTimeout(400);
await page.click('[data-dropdown-item-id="lang-en"]');
await page.waitForTimeout(700);
check("en inglés: «Switch to dark theme»", (await theme_tip()) === "Switch to dark theme");
await page.click('[data-toolbar-item-id="language"]');
await page.waitForTimeout(400);
await page.click('[data-dropdown-item-id="lang-es"]');
await page.waitForTimeout(700);

/*  And it all holds across a reload. */
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(1100);
check("tras recargar: pal-aurora", same(await marked("palette"), ["pal-aurora"]));
check("tras recargar: lang-es", same(await marked("language"), ["lang-es"]));
check("tras recargar: sol", (await theme_icon()) === "yi-sun");
check("tras recargar: «Cambiar a tema oscuro»", (await theme_tip()) === "Cambiar a tema oscuro");

const errors = report(page);
await browser.close();
console.log(bad.length || errors ? `>>> ${bad.length} fallos, ${errors} errores`
                                 : "la barra dice lo elegido: idioma, paleta y tema");
process.exit(bad.length || errors ? 1 : 0);
