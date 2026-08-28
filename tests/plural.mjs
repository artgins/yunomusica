/***********************************************************************
 *          plural.mjs
 *
 *      "1 pistas".
 *
 *      Every count in this app was drawn as two nodes with the noun
 *      frozen in its plural form, on the reasoning that keeping them
 *      apart stopped plural rules leaking into a composed string. It
 *      did not avoid the plural — it made it wrong, on every screen
 *      that counts anything, in every language that inflects.
 *
 *      Two halves, because they fail differently.
 *
 *      1. The CATALOGUES, checked in Node against i18next itself. A
 *         missing plural category does NOT fall back to another one in
 *         the same language: it falls through to English, or renders
 *         the bare key. Spanish has three categories, Russian four,
 *         Arabic six, Japanese one — so "it looks right in Spanish" is
 *         no evidence at all about Arabic, and only running every
 *         category of every language is.
 *
 *      2. The SCREEN, in a real browser, in more than one language.
 *         The catalogue can be perfect and the code still call t()
 *         without a count, which resolves to nothing useful.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import i18next from "i18next";
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";
import {ensure_fixtures} from "./fixtures.mjs";

const FIX = ensure_fixtures();

const CODES = ["en", "es", "zh", "ar", "ru", "hi", "pt", "fr", "de", "ja"];
/*  The count-bearing nouns, and the one whole SENTENCE that carries a
    count — "{{count}} de ellos ya estaban" was as wrong as "1 pistas",
    and a sentence can only agree with one count, which is why the
    covers line had to be split into two keys to be fixed at all. */
const KEYS  = ["n tracks", "n albums", "n entries", "n missing", "n folders inside",
               "some were already in"];

let bad = false;

function check(ok, what)
{
    console.log(`   ${ok ? "ok " : ">>>"} ${what}`);
    if(!ok) {
        bad = true;
    }
}


/*  =================================================================
 *  1. The catalogues, through i18next, over every category
 *  ================================================================= */
console.log("1. los catálogos, con el propio i18next");

const resources = {};
for(const c of CODES) {
    const m = await import(`../src/locales/${c}.js`);
    resources[c] = m[c];
}

/*  One count per plural category the language actually declares, found
    by asking Intl rather than by assuming — the categories are CLDR's,
    not ours, and they move between versions. */
function samples_for(code)
{
    const rules = new Intl.PluralRules(code);
    const want = new Set(rules.resolvedOptions().pluralCategories);
    const out = new Map();
    for(let n = 0; n <= 130; n++) {
        const cat = rules.select(n);
        if(want.has(cat) && !out.has(cat)) {
            out.set(cat, n);
        }
    }
    /*  The big ones: several languages put a millionth in its own
        category, and that is the one nobody ever writes a form for. */
    for(const n of [1000, 100000, 1000000, 2000000]) {
        const cat = rules.select(n);
        if(want.has(cat) && !out.has(cat)) {
            out.set(cat, n);
        }
    }
    return out;
}

i18next.init({lng: "en", fallbackLng: "en", resources: resources, initImmediate: false});

for(const code of CODES) {
    i18next.changeLanguage(code);
    const samples = samples_for(code);
    const problems = [];
    const seen = {};
    for(const key of KEYS) {
        const forms = new Set();
        for(const [cat, n] of samples) {
            const got = i18next.t(key, {count: n, other: "X", name: "Y"});
            if(!got || got === key) {
                problems.push(`${key} (${cat}, n=${n}) -> “${got}”`);
                continue;
            }
            forms.add(got);
        }
        seen[key] = forms;
    }
    /*  Declared and REACHED are not the same number, and the gap is not
        a hole: Russian declares "other" but only ever selects it for a
        fraction, and this app counts whole tracks. Both are printed so
        nobody reads the smaller one as a missing form. */
    const declared = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
    const cats = [...samples.keys()].join(",");
    check(!problems.length,
          `${code}: ${samples.size} de ${declared.length} formas alcanzables ` +
          `con enteros (${cats})` +
          (problems.length ? ` | ${problems.join("; ")}` : ""));

    /*  A language with more than one category must actually USE it
        somewhere, or the catalogue is a plural in name only — which is
        exactly the state this test exists to leave behind. Japanese and
        Chinese have one category and are right to. */
    if(samples.size > 1) {
        const inflects = KEYS.filter((k) => seen[k].size > 1);
        check(inflects.length > 0,
              `   y alguna palabra cambia de verdad: ${inflects.join(", ") || "ninguna"}`);
    }
}

/*  The one that started it, spelled out. */
i18next.changeLanguage("es");
check(i18next.t("n tracks", {count: 1}) === "pista" &&
      i18next.t("n tracks", {count: 3}) === "pistas",
      `es: 1 → “${i18next.t("n tracks", {count: 1})}”, ` +
      `3 → “${i18next.t("n tracks", {count: 3})}”`);
i18next.changeLanguage("de");
check(i18next.t("n albums", {count: 1}) === "Album" &&
      i18next.t("n albums", {count: 2}) === "Alben",
      `de: 1 → “${i18next.t("n albums", {count: 1})}”, ` +
      `2 → “${i18next.t("n albums", {count: 2})}”`);
i18next.changeLanguage("ru");
check(new Set([1, 2, 5].map((n) => i18next.t("n tracks", {count: n}))).size === 3,
      `ru: 1/2/5 → ` + [1, 2, 5].map((n) => i18next.t("n tracks", {count: n})).join(" / "));


/*  =================================================================
 *  2. And on the screen, where t() might be called without a count
 *  ================================================================= */
console.log("2. y en pantalla");

const browser = await launch();

/*  `messy` has a folder holding exactly ONE track next to folders
    holding several, so one screen shows both forms at once. */
async function on_screen(locale, label)
{
    const page = await new_page(browser, {locale: locale, viewport: {width: 900, height: 950}});
    await boot(page);
    await add_source(page, [FIX.messy], 1, 3500);
    await route(page, "#/library", 800);
    await page.locator(".MUS_CHIP").nth(3).click();          // Carpetas
    await page.waitForTimeout(700);
    await page.locator(".MUS_DIRROW .MUS_ROWMAIN").first().click();
    await page.waitForTimeout(800);

    const rows = await page.evaluate(() =>
        [...document.querySelectorAll(".MUS_DIRROW")].map((r) => {
            const spans = [...r.querySelectorAll(".MUS_T2 span")].map((s) => s.textContent.trim());
            return {name: r.querySelector(".MUS_T1").textContent.trim(),
                    n: spans[0], noun: spans[1]};
        }));
    const head = await page.evaluate(() => {
        const spans = [...document.querySelectorAll(".MUS_TREEHEAD .MUS_DMETA span")]
            .map((s) => s.textContent.trim());
        return spans.join(" ");
    });
    await page.screenshot({path: `${OUT}/plural-${locale}.png`, fullPage: true});
    const errs = report(page);
    await page.context().close();

    console.log(`   ${label}: ${rows.map((r) => `${r.n} ${r.noun}`).join(" · ")}  | ${head}`);

    const one  = rows.find((r) => r.n === "1");
    const many = rows.find((r) => Number(r.n) > 1);
    check(!!one && !!many, `${label}: la pantalla enseña un 1 y un varios`);
    if(one && many) {
        check(!/^n /.test(one.noun) && !!one.noun,
              `${label}: y el nombre del singular es una palabra, no la clave: “${one.noun}”`);
        return {one: one.noun, many: many.noun, errs: errs};
    }
    return {one: "", many: "", errs: errs};
}

const es = await on_screen("es-ES", "español");
check(es.one === "pista" && es.many === "pistas",
      `español: “1 ${es.one}” y “3 ${es.many}”`);

const de = await on_screen("de-DE", "alemán");
check(!!de.one && !!de.many, `alemán: “1 ${de.one}” y “3 ${de.many}”`);

const ja = await on_screen("ja-JP", "japonés");
check(ja.one === ja.many && !!ja.one,
      `japonés: una sola forma, que es lo correcto: “${ja.one}”`);

if(es.errs || de.errs || ja.errs) {
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
