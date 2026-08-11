/***********************************************************************
 *          select.mjs
 *
 *      Browsing must never change what is sounding.
 *
 *      Tapping the name opens the track's card; the row's ▶ only
 *      previews; "Play all" is the one gesture that replaces the queue.
 *      This test exists because the app used to play on row click, and
 *      that made it impossible to look for the next track without
 *      losing the current one.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();

const browser = await launch();
const page = await new_page(browser, {viewport: {width: 1100, height: 950}});

await boot(page);
await add_source(page, FIX.longtracks);

/*  a queue we care about, playing */
await route(page, "#/player");
await page.click(".MUS_TPLAY");
await page.waitForTimeout(1200);
const q0 = await page.locator(".MUS_QROW").count();
console.log("cola inicial:", q0, "| sonando:", await page.locator(".MUS_DECKTITLE").textContent());

await route(page, "#/library", 800);
await page.locator(".MUS_CHIP").nth(4).click();
await page.waitForTimeout(700);

/*  1. click the name: opens the card, changes nothing */
await page.locator(".C_MUS_VIEW .MUS_ROWMAIN").nth(2).click();
await page.waitForTimeout(700);
console.log("1. ficha:", await page.locator(".MUS_TCARD").count(),
            "| título:", await page.locator(".MUS_TCARD_TITLE").textContent());
console.log("   campos:", (await page.locator(".MUS_TCARD_FACTS dt").allTextContents()).join(" / "));
console.log("   previa:", await page.locator(".MUS_PLAYER.is-preview").count(),
            "| cola:", await page.locator(".MUS_QROW").count());
/*  The card is modal: it has to be shut before the row under it can be
    reached again. */
await page.click(".MUS_TCARD_CLOSE");
await page.waitForTimeout(400);

/*  2. the row's ▶ previews, does not replace the queue */
await page.locator(".C_MUS_VIEW .MUS_ROW").nth(4).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(1500);
console.log("2. tras el ▶ de una fila -> previa:", await page.locator(".MUS_PLAYER.is-preview").count() > 0);
await route(page, "#/player");
const q1 = await page.locator(".MUS_QROW").count();
console.log("   cola:", q1, "| sonando:", await page.locator(".MUS_DECKTITLE").textContent(),
            "| intacta:", q1 === q0);

/*  3. "Play all" on an album still replaces the queue */
await route(page, "#/library");
await page.locator(".MUS_CHIP").nth(1).click();
await page.waitForTimeout(600);
await page.locator(".MUS_CARDMAIN").first().click();
await page.waitForTimeout(600);
await page.locator(".MUS_DHEAD .MUS_QBTN.is-primary").click();
await page.waitForTimeout(1500);
await route(page, "#/player");
console.log("3. tras 'Reproducir todo' -> cola:", await page.locator(".MUS_QROW").count(),
            "| origen:", (await page.locator(".MUS_QORIGIN").textContent() || "").replace(/\s+/g, " ").trim());

await page.screenshot({path: `${OUT}/select.png`, fullPage: true});
const bad = report(page);
await browser.close();
process.exit(bad ? 1 : 0);
