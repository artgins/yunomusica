/***********************************************************************
 *          longlisten.mjs
 *
 *      A long file heard over several sittings is ONE listen.
 *
 *      Reported on a mix of three or four hours: each time the app was
 *      opened again, the deck came back at its place, play was pressed,
 *      and twenty seconds later the count went up — six or seven plays
 *      for one file heard once. The store opened a "new" listen every
 *      time the page did.
 *
 *      What goes red here:
 *
 *        1. Counted once, then reloaded, then picked up where it was:
 *           still one.
 *        2. Started again FROM THE BEGINNING: that is a second listen,
 *           and it counts. A fix that stopped counting a track once it
 *           had been counted would pass act 1 and fail here.
 *
 *      On `longtracks` (25 s), where half the track — 12.5 s — is what
 *      the store asks for before it counts.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {launch, new_page, boot, route, add_source, cue_source, report, OUT} from "./lib.mjs";
import {join} from "path";

const FIX = ensure_fixtures();

let failed = 0;
const check = (label, ok) => {
    if(!ok) { failed++; }
    console.log(`   ${ok ? "ok " : ">>>"} ${label}`);
};

const plays = (page, i) => page.evaluate((i) => {
    const $c = document.querySelectorAll(".MUS_QROW")[i]
        ?.querySelector(".MUS_CNT_PLAYS");
    if(!$c || !$c.classList.contains("is-on")) {
        return 0;
    }
    return Number($c.querySelector(".MUS_CNT_N").textContent || 0);
}, i);

const secs = (txt) => {
    const m = String(txt || "").trim().match(/^(\d+):(\d+)$/);
    return m ? (Number(m[1]) * 60 + Number(m[2])) : -1;
};

const browser = await launch();
const page = await new_page(browser, {viewport: {width: 1100, height: 950}});

await boot(page);
await add_source(page, FIX.longtracks);
await cue_source(page);
await route(page, "#/player", 1200);

/*  The first sitting: long enough to count, then back ten seconds so
    the place left behind is well inside the track but leaves room for
    another twelve and a half seconds of it. */
await page.click(".MUS_TPLAY");
await page.waitForTimeout(14000);
await page.click(".MUS_TBACK");
await page.waitForTimeout(2500);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(400);
const left_at = secs(await page.locator(".MUS_TCUR").textContent());
const first = await plays(page, 0);
console.log(`1. primera sesión: ${first} escucha, se deja en ${left_at} s`);
check("counted once in the first sitting", first === 1);

/*  The app comes back. The deck is written on a timer: give it its turn. */
await page.waitForTimeout(2000);
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(2500);
await route(page, "#/player", 800);

await page.click(".MUS_TPLAY");
await page.waitForTimeout(14000);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(800);
const now_at = secs(await page.locator(".MUS_TCUR").textContent());
const second = await plays(page, 0);
console.log(`2. tras recargar y seguir: ${second} escucha(s), ahora en ${now_at} s`);
check("the test resumed mid-track (else it proves nothing)", left_at > 5 && now_at - left_at >= 12);
check("picking it up where it was left is the same listen", second === 1);

/*  Another track for a moment, then the long one again from its start. */
await page.locator(".MUS_QROW").nth(1).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(1500);
await page.locator(".MUS_QROW").first().locator(".MUS_IBTN").first().click();
await page.waitForTimeout(800);
const restart_at = secs(await page.locator(".MUS_TCUR").textContent());
await page.waitForTimeout(13500);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(800);
const third = await plays(page, 0);
console.log(`3. desde el principio otra vez (arranca en ${restart_at} s): ${third} escuchas`);
check("the restart began at the start", restart_at >= 0 && restart_at <= 2);
check("played again from the start, it counts again", third === 2);

await page.screenshot({path: join(OUT, "longlisten.png")});

const errs = report(page);
await browser.close();
process.exit(failed + errs ? 1 : 0);
