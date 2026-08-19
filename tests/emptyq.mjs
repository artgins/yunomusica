/***********************************************************************
 *          emptyq.mjs
 *
 *      Emptying the deck asks first.
 *
 *      "Vaciar la cola" sits one tap away from "Guardar como lista", it
 *      throws away an order that can represent real work, and unlike
 *      taking a single track out there is nothing to undo it with. So
 *      the question is asked in the button itself — the same way
 *      removing a source asks — and this pins down the three things that
 *      have to be true about it:
 *
 *        1. One tap does not empty anything. It asks.
 *        2. Cancelling leaves the queue exactly as it was.
 *        3. Confirming empties it.
 *
 *      And a fourth that is easy to get wrong: a question left hanging
 *      when the screen is left must not still be standing on the way
 *      back. A confirmation that survives navigation is a trap — the
 *      next tap in that spot means something else entirely.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {readdirSync, statSync} from "fs";
import {join} from "path";
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";
import {ensure_fixtures} from "./fixtures.mjs";

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
const page = await new_page(browser, {no_fsa: true});

await boot(page);
await add_source(page, walk(FIX.music), 2, 2500);
await route(page, "#/player", 900);

const rows = () => page.locator(".MUS_QROW").count();
const before = await rows();
console.log("cola cargada:", before);

/*  1. one tap asks, and takes nothing away */
await page.locator(".MUS_QCLEAR").click();
await page.waitForTimeout(500);
const asking = await page.locator(".MUS_QCLEAR_YES").count();
const kept = await rows();
console.log("1. un toque -> pregunta:", asking > 0, "| pistas intactas:", kept === before, `(${kept})`);
console.log("   dice:", (await page.locator(".MUS_QCLEAR_YES").textContent() || "").trim());
await page.screenshot({path: `${OUT}/emptyq-asking.png`});

/*  2. cancelling leaves it alone */
await page.locator(".MUS_QCLEAR_NO").click();
await page.waitForTimeout(500);
const after_cancel = await rows();
const back_to_button = await page.locator(".MUS_QCLEAR").count();
console.log("2. al cancelar -> pistas:", after_cancel, "| vuelve el botón:", back_to_button > 0);

/*  3. the question does not survive leaving the screen */
await page.locator(".MUS_QCLEAR").click();
await page.waitForTimeout(400);
await route(page, "#/library", 700);
await route(page, "#/player", 900);
const still_asking = await page.locator(".MUS_QCLEAR_YES").count();
console.log("3. tras salir y volver -> la pregunta sigue en pie:", still_asking > 0);

/*  4. confirming empties it */
await page.locator(".MUS_QCLEAR").click();
await page.waitForTimeout(400);
await page.locator(".MUS_QCLEAR_YES").click();
await page.waitForTimeout(900);
const emptied = await rows();
console.log("4. al confirmar -> pistas:", emptied);
await page.screenshot({path: `${OUT}/emptyq-emptied.png`});

let bad = report(page);
if(!asking || kept !== before) {
    console.log(">>> vaciar la cola no pregunta, o se lleva las pistas al preguntar");
    bad = true;
}
if(after_cancel !== before || !back_to_button) {
    console.log(">>> cancelar no deja la cola como estaba");
    bad = true;
}
if(still_asking) {
    console.log(">>> la pregunta sigue en pie al volver a la pantalla");
    bad = true;
}
if(emptied !== 0) {
    console.log(">>> confirmar no vacía la cola");
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
