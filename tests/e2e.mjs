/***********************************************************************
 *          e2e.mjs
 *
 *      The long one: feed tagged MP3s through the loose-files picker,
 *      then walk every screen, play something, edit and save the queue,
 *      switch to Arabic, and reload to see what comes back.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {readdirSync, statSync} from "fs";
import {join} from "path";

import {ensure_fixtures} from "./fixtures.mjs";
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";

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
const page = await new_page(browser, {viewport: {width: 1280, height: 900}, locale: "en-US"});

const step = async (name) => {
    await page.waitForTimeout(400);
    await page.screenshot({path: `${OUT}/e2e-${name}.png`, fullPage: true});
    console.log(`--- ${name} ---`);
};

await boot(page);
await step("01-deck-empty");

/*  the loose-files picker, with every file of the tree */
await add_source(page, walk(FIX.music), 2, 2500);
await route(page, "#/player");
await step("02-deck-loaded");

console.log("queue rows:", await page.locator(".MUS_QROW").count());
console.log("deck title:", await page.locator(".MUS_DECKTITLE").textContent());

/*  Play. The audio element is a detached `new Audio()`, so the only
    honest probe is the UI it drives: the glyph flips and the clock
    moves. */
await page.click(".MUS_TPLAY");
await page.waitForTimeout(1400);
console.log("play button now:", await page.locator(".MUS_TPLAY").getAttribute("aria-label"));
const t1 = await page.locator(".MUS_TCUR").textContent();
const dur = await page.locator(".MUS_TTOT").textContent();
await page.waitForTimeout(1100);
const t2 = await page.locator(".MUS_TCUR").textContent();
console.log(`clock: ${t1} -> ${t2}  (duration ${dur})  advancing=${t1 !== t2}`);
await step("03-playing");

/*  reorder and remove */
await page.locator(".MUS_QROW").nth(3).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(200);
await page.locator(".MUS_QROW").nth(0).locator(".MUS_IBTN").nth(2).click();
await page.waitForTimeout(300);
console.log("queue rows after edit:", await page.locator(".MUS_QROW").count());
await step("04-queue-edited");

/*  save the queue as a named list */
await page.click(".MUS_QHEAD .MUS_QBTN:nth-child(1)");
await page.fill(".MUS_NAME_INPUT", "Test list");
await page.click(".MUS_NAMEROW .is-primary");
await page.waitForTimeout(500);

/*  the library */
await route(page, "#/library", 600);
await step("05-library");
console.log("library rows:", await page.locator(".MUS_ROW").count());
console.log("chips:", (await page.locator(".MUS_CHIP").allTextContents()).join(" | "));

await page.locator(".MUS_CHIP").nth(1).click();
await page.waitForTimeout(400);
await step("06-albums");
console.log("album cards:", await page.locator(".MUS_CARD").count());

await page.locator(".MUS_CARDMAIN").first().click();
await page.waitForTimeout(400);
await step("07-album-detail");
console.log("detail title:", await page.locator(".MUS_DTITLE").textContent());

await route(page, "#/sources");
await step("08-sources");
console.log("source rows:", await page.locator(".C_MUS_SOURCES .MUS_SRCROW").count());
console.log("source text:", (await page.locator(".C_MUS_SOURCES .MUS_SRCROW").first().textContent() || "").trim());

/*  keep_alive leaves every visited view mounted, so scope the selector
    to the view under test or it matches the sources rows too. */
await route(page, "#/lists");
await step("09-lists");
console.log("list rows:", await page.locator(".C_MUS_LISTS .MUS_SRCROW").count());
console.log("list text:", (await page.locator(".C_MUS_LISTS .MUS_SRCROW").first().textContent() || "").trim());

/*  Arabic: does the direction flip? */
await page.click('[data-toolbar-item-id="language"]');
await page.waitForTimeout(300);
await page.click("text=العربية");
await page.waitForTimeout(700);
console.log("dir:", await page.evaluate(() => document.documentElement.getAttribute("dir")));
await route(page, "#/player", 600);
await step("10-arabic-deck");
console.log("deck queue line (ar):", await page.locator(".MUS_QORIGIN").textContent());
console.log("nav (ar):", (await page.locator(".yui-nav-item").allTextContents()).join(" | "));

/*  reload: what comes back? */
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(1800);
await step("11-after-reload");
console.log("about reopened:", await page.locator(".MUS_ABOUT_BACKDROP").count());
await route(page, "#/sources", 900);
await step("12-sources-after-reload");
console.log("sources after reload:", await page.locator(".C_MUS_SOURCES .MUS_SRCROW").count());
console.log("lang kept:", await page.evaluate(() => document.documentElement.getAttribute("lang")));

const bad = report(page);
await browser.close();
process.exit(bad ? 1 : 0);
