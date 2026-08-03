/***********************************************************************
 *          fallback.mjs
 *
 *      What language a visitor lands in.
 *
 *      A browser asking for one of the ten gets it. A browser asking for
 *      anything else gets English — the same answer as `fallbackLng`,
 *      so the app never gives two different answers to "what if we do
 *      not have it?". Arabic must also flip the direction.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {BASE, launch, new_page} from "./lib.mjs";

const CASES = [
    {locale: "es-ES", want: "es", dir: "ltr", why: "navegador en español"},
    {locale: "ko-KR", want: "en", dir: "ltr", why: "coreano (no lo hablamos)"},
    {locale: "sv-SE", want: "en", dir: "ltr", why: "sueco (no lo hablamos)"},
    {locale: "pt-BR", want: "pt", dir: "ltr", why: "portugués de Brasil"},
    {locale: "ar-EG", want: "ar", dir: "rtl", why: "árabe"},
    {locale: "en-GB", want: "en", dir: "ltr", why: "inglés"}
];

const browser = await launch();
let bad = 0;

for(const c of CASES) {
    const page = await new_page(browser, {locale: c.locale, viewport: {width: 900, height: 800}});
    await page.goto(BASE, {waitUntil: "networkidle"});
    await page.waitForTimeout(1100);

    const got = await page.evaluate(() => ({
        lang: document.documentElement.getAttribute("lang"),
        dir:  document.documentElement.getAttribute("dir"),
        nav:  [...document.querySelectorAll(".yui-nav-item")].slice(0, 2).map((e) => e.textContent.trim())
    }));
    const ok = got.lang === c.want && got.dir === c.dir && !page.errors.length;
    if(!ok) {
        bad++;
    }
    console.log(`${c.why.padEnd(28)} -> lang=${(got.lang || "?").padEnd(3)} dir=${got.dir}  ` +
                `nav: ${got.nav.join(" / ")}   errores:${page.errors.length}  ${ok ? "ok" : ">>> esperaba " + c.want + "/" + c.dir}`);
    await page.context().close();
}

console.log(bad ? `>>> ${bad} casos` : "idioma de entrada: correcto en los 6 casos");
await browser.close();
process.exit(bad ? 1 : 0);
