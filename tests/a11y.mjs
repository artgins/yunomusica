/***********************************************************************
 *          a11y.mjs
 *
 *      Escape closes the dialogs (the welcome, a track's card), as the
 *      shell's Escape stack routes it; a row's buttons are named by the
 *      row, so a reader tells them apart; and the card keeps the focus
 *      on the heart button that was pressed.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {BASE, launch, new_page, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();
let failures = 0;
function check(ok, what)
{
    console.log((ok ? "ok    " : "FAIL  ") + what);
    if(!ok) {
        failures++;
    }
}

const browser = await launch();
const page = await new_page(browser, {locale: "en-US"});
await page.goto(BASE, {waitUntil: "networkidle"});
await page.waitForTimeout(1200);
check(await page.locator(".MUS_ABOUT_CARD").count() === 1, "the welcome is up");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
check(await page.locator(".MUS_ABOUT_CARD").count() === 0, "Escape closes the welcome");

await add_source(page, [FIX.root], 1, 3000);
await route(page, "#/player", 800);

/*  The buttons of a row, named by the row, the way a reader resolves
    aria-labelledby. */
const names = await page.evaluate(() => {
    const row = document.querySelectorAll(".MUS_QROW")[1];
    const title = row.querySelector(".MUS_T1").textContent.trim();
    const name_of = (el) => (el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean)
        .map((id) => {
            const n = document.getElementById(id);
            return n ? (n.getAttribute("aria-label") || n.textContent || "").trim() : "#MISSING#";
        }).join(" ");
    return {title: title, names: [...row.querySelectorAll("button")].map(name_of)};
});
check(names.names.length >= 5 && names.names.every((n) => n.endsWith(names.title) && n !== names.title),
      `every button of a row is named by it: ${JSON.stringify(names.names.slice(0, 3))}…`);

/*  The card: Escape closes it, and a heart given keeps the focus. */
await page.locator(".MUS_QROW").nth(1).locator(".MUS_QMETA").click();
await page.waitForTimeout(400);
check(await page.locator(".MUS_TCARD").count() === 1, "the card opens");
await page.focus(".MUS_TCARD_HADD");
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
const focus = await page.evaluate(() => (document.activeElement || {}).className || "");
const hearts = await page.textContent(".MUS_TCARD_CV.is-heart");
check(/MUS_TCARD_HADD/.test(focus) && hearts.trim() === "2",
      `two hearts given from the keyboard, the focus stayed: ${hearts.trim()} / ${focus}`);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
check(await page.locator(".MUS_TCARD").count() === 0, "Escape closes the card");

const errs = report(page);
await browser.close();
process.exit(failures || errs ? 1 : 0);
