/***********************************************************************
 *          queuereach.mjs
 *
 *      La cola siempre al alcance, con el zoom al 100%. En una ventana
 *      baja la tarjeta de lo que suena se lleva casi todo el alto del
 *      reproductor, y la cola, que sólo scrolleaba dentro de lo que
 *      sobraba, se quedaba en una fila y media. A 440x643 (un móvil en
 *      el navegador de escritorio) y a 1920x868 (un portátil), bajando
 *      con la rueda la caja de la cola entera cabe en la zona central y
 *      enseña varias filas; subiendo, la botonera vuelve a verse.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {OUT, launch, new_page, boot, route, add_source, cue_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();
let failures = 0;
let errors = 0;

function check(ok, what)
{
    console.log((ok ? "ok    " : "FAIL  ") + what);
    failures += ok ? 0 : 1;
}

const browser = await launch();
for(const [w, h] of [[440, 643], [1920, 868]]) {
    const page = await new_page(browser, {viewport: {width: w, height: h}});
    await boot(page);
    await add_source(page, [FIX.root], 1, 2500);
    await cue_source(page);
    await route(page, "#/player", 800);

    /*  Como llega un usuario: la rueda, sobre la tarjeta. */
    await page.locator(".MUS_NOWCARD").hover();
    for(let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(80);
    }
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
        const zone = document.querySelector(".yui-zone-center").getBoundingClientRect();
        const box = document.querySelector(".MUS_DECKSCROLL").getBoundingClientRect();
        let seen = 0;
        for(const row of document.querySelectorAll(".MUS_QROW")) {
            const b = row.getBoundingClientRect();
            if(b.top >= box.top && b.bottom <= box.bottom) {
                seen++;
            }
        }
        return {zone: [Math.round(zone.top), Math.round(zone.bottom)],
                box: [Math.round(box.top), Math.round(box.bottom)], seen};
    });
    check(r.box[0] >= r.zone[0] - 1 && r.box[1] <= r.zone[1] + 1 && r.seen >= 3,
          `${w}x${h}: la cola ${r.box[0]}→${r.box[1]} en la zona ${r.zone[0]}→${r.zone[1]}, ` +
          `${r.seen} filas enteras a la vista`);
    await page.screenshot({path: `${OUT}/queuereach-${w}.png`});

    await page.locator(".MUS_NOWCARD").hover({force: true}).catch(() => {});
    for(let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, -400);
        await page.waitForTimeout(80);
    }
    await page.waitForTimeout(300);
    const top = await page.evaluate(() => {
        const zone = document.querySelector(".yui-zone-center").getBoundingClientRect();
        const b = document.querySelector(".MUS_TPLAY").getBoundingClientRect();
        return b.top >= zone.top && b.bottom <= zone.bottom;
    });
    check(top, `${w}x${h}: arriba otra vez, la botonera está a la vista`);
    errors += report(page);
    await page.context().close();
}
await browser.close();
process.exit(failures || errors ? 1 : 0);
