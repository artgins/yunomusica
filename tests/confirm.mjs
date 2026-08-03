/***********************************************************************
 *          confirm.mjs
 *
 *      "Play all" must warn before discarding a queue — and the dialog
 *      must offer three answers, not two: add, replace, cancel. With an
 *      empty deck there is nothing to lose, so it must not ask at all;
 *      a confirmation that fires when nothing is at stake teaches people
 *      to dismiss confirmations.
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
await add_source(page, FIX.mimusica, 1, 4000);

const goLib = async () => {
    await route(page, "#/library", 800);
    await page.locator(".MUS_CHIP").nth(1).click();
    await page.waitForTimeout(700);
};
const qcount = async () => {
    await route(page, "#/player", 600);
    return page.locator(".MUS_QROW").count();
};

/*  1. deck empty -> no question at all */
await route(page, "#/player", 600);
await page.click(".MUS_QHEAD .MUS_QBTN:nth-child(2)");            // vaciar
await page.waitForTimeout(600);
await goLib();
await page.locator(".MUS_CARD").nth(0).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(1000);
console.log("1. plato vacío -> diálogo:", await page.locator(".MUS_CONFIRM_CARD").count(),
            "| cola:", await qcount());

/*  2. deck busy -> it asks, and Cancel changes nothing */
const q0 = await qcount();
await goLib();
await page.locator(".MUS_CARD").nth(1).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(900);
console.log("2. plato con", q0, "-> diálogo:", await page.locator(".MUS_CONFIRM_CARD").count());
console.log("   dice:", (await page.locator(".MUS_CONFIRM_WHAT").textContent() || "").replace(/\s+/g, " ").trim());
console.log("   opciones:", (await page.locator(".MUS_CONFIRM_ACTIONS button").allTextContents()).join(" | "));
await page.screenshot({path: `${OUT}/confirm-dialog.png`});
await page.locator(".MUS_CONFIRM_CANCEL").click();
await page.waitForTimeout(700);
console.log("   tras Cancelar -> cola:", await qcount(), "| intacta:", (await qcount()) === q0);

/*  3. "Add to queue" from the dialog appends */
await goLib();
await page.locator(".MUS_CARD").nth(1).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(900);
await page.locator(".MUS_CONFIRM_ACTIONS button").first().click();
await page.waitForTimeout(1200);
const q1 = await qcount();
console.log("3. tras 'Añadir a la cola' -> cola:", q1, "| creció:", q1 > q0);

/*  4. "Replace and play" replaces */
await goLib();
await page.locator(".MUS_CARD").nth(2).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(900);
await page.locator(".MUS_CONFIRM_ACTIONS .is-danger").click();
await page.waitForTimeout(1200);
const q2 = await qcount();
console.log("4. tras 'Sustituir y reproducir' -> cola:", q2, "| sustituida:", q2 < q1);

await page.screenshot({path: `${OUT}/confirm.png`});
const bad = report(page);
await browser.close();
process.exit(bad ? 1 : 0);
