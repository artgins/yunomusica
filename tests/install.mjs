/***********************************************************************
 *          install.mjs
 *
 *      The app must ask about installing itself, and must not depend on
 *      Chrome asking.
 *
 *      This is the regression that started it: Chrome offers its own
 *      install banner by a heuristic that goes quiet on an origin for
 *      months once the banner has been dismissed, or once the app has
 *      been installed and removed. Reinstalling then finds no banner at
 *      all — only the browser menu, where nobody looks. The app now
 *      catches the deferred event and does the asking.
 *
 *      The event is synthesised here. A headless Chrome on localhost
 *      will not fire `beforeinstallprompt` on its own, and the point
 *      under test is not Chrome's heuristic — it is that we catch what
 *      it hands us, ask, and call prompt() on the real event.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {OUT, launch, new_page, boot, route, report} from "./lib.mjs";

const browser = await launch();
const page = await new_page(browser, {viewport: {width: 1100, height: 950}});

/*  The event Chrome would have sent, plus a note of whether prompt()
    was called on it — which is the whole contract. */
const fire = () => page.evaluate(() => {
    window.__prompted = false;
    const ev = new Event("beforeinstallprompt");
    ev.prompt = () => { window.__prompted = true; };
    ev.userChoice = Promise.resolve({outcome: "dismissed", platform: "web"});
    window.dispatchEvent(ev);
});

await boot(page);
await route(page, "#/player", 600);

/*  1. nothing offered before the browser says it is installable */
console.log("1. antes del evento -> diálogo:", await page.locator(".MUS_INSTALL_CARD").count(),
            "| barra:", await page.locator(".MUS_INSTBAR").count());

/*  2. the event arrives -> the app asks, by itself */
await fire();
await page.waitForTimeout(800);
const asked = await page.locator(".MUS_INSTALL_CARD").count();
console.log("2. tras el evento -> diálogo:", asked);
console.log("   dice:", (await page.locator(".MUS_INSTALL_TITLE").textContent() || "").trim());
console.log("   opciones:", (await page.locator(".MUS_INSTALL_ACTIONS button").allTextContents()).join(" | "));
await page.screenshot({path: `${OUT}/install-dialog.png`});

/*  3. "Instalar" opens the browser's own install dialog */
await page.locator(".MUS_INSTALL_GO").click();
await page.waitForTimeout(600);
const prompted = await page.evaluate(() => window.__prompted);
console.log("3. tras pulsar Instalar -> prompt() llamado:", prompted,
            "| diálogo cerrado:", (await page.locator(".MUS_INSTALL_CARD").count()) === 0);

/*  4. asked once. A reload with the offer still standing must not ask
       again — it must leave a bar instead. */
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(1200);
await fire();
await page.waitForTimeout(900);
await route(page, "#/player", 600);
const again = await page.locator(".MUS_INSTALL_CARD").count();
const bar = await page.locator(".MUS_INSTBAR").count();
console.log("4. tras recargar -> vuelve a preguntar:", again !== 0, "| barra:", bar);
await page.screenshot({path: `${OUT}/install-bar.png`});

/*  5. the bar's own button asks again, on purpose this time */
if(bar) {
    await page.locator(".MUS_INSTBAR .button").click();
    await page.waitForTimeout(700);
    console.log("5. desde la barra -> diálogo:", await page.locator(".MUS_INSTALL_CARD").count());
    await page.locator(".MUS_INSTALL_NO").click();
    await page.waitForTimeout(600);
    console.log("   tras 'Ahora no' -> diálogo:", await page.locator(".MUS_INSTALL_CARD").count(),
                "| barra:", await page.locator(".MUS_INSTBAR").count());
}

let bad = report(page);
if(!asked || !prompted || again || !bar) {
    console.log(">>> la app no pregunta por sí sola");
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
