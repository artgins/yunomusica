/***********************************************************************
 *          preview.mjs
 *
 *      The strip while a track is being previewed.
 *
 *      Two things shipped broken here, and both are invisible to every
 *      other test because the strip only enters this mode when a track
 *      row — not an album, not an artist — is played from the library:
 *
 *        1. The verbs are TEXT buttons, and `.MUS_PCTL button` sizes
 *           everything in that corner as a 40px circle. The labels ran
 *           out of their own buttons and over the title.
 *        2. The seek bar read the QUEUE's clock. The queue is paused
 *           underneath a preview, so the bar sat frozen wherever the
 *           queue was left, and clicking it seeked music nobody was
 *           listening to.
 *
 *      Checked at phone and laptop width: the phone is where the labels
 *      and the title compete for the same line.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {launch, new_page, boot, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();
const browser = await launch();


/*  Leaves the app previewing a track with the queue loaded and paused
    behind it — the state the user is in when they audition something
    while listening to something else. */
async function enter_preview(page)
{
    await add_source(page, FIX.longtracks);

    /*  something on the deck and sounding */
    await route(page, "#/player");
    await page.click(".MUS_TPLAY");
    await page.waitForTimeout(800);

    /*  "all" is the chip that lists TRACKS; a track's first button
        previews, where a group's first button replaces the deck */
    await route(page, "#/library", 900);
    const chips = await page.locator(".MUS_CHIP").count();
    await page.locator(".MUS_CHIP").nth(chips - 1).click();
    await page.waitForTimeout(600);
    await page.locator(".MUS_ROW .MUS_IBTN").first().click();
    await page.waitForTimeout(1200);
}


function measure()
{
    const box = (sel) => {
        const e = document.querySelector(sel);
        if(!e) {
            return null;
        }
        const b = e.getBoundingClientRect();
        return {y: Math.round(b.y), h: Math.round(b.height),
                x: Math.round(b.x), right: Math.round(b.right)};
    };
    return {
        preview: document.querySelector(".MUS_PLAYER").classList.contains("is-preview"),
        meta: box(".MUS_PMETA"),
        /*  scrollWidth > clientWidth is a label wider than the button
            holding it: the overlap, in one number */
        btns: [...document.querySelectorAll(".MUS_PCTL button")].map((e) => {
            const b = e.getBoundingClientRect();
            return {text: e.textContent.trim(),
                    x: Math.round(b.x), y: Math.round(b.y),
                    right: Math.round(b.right),
                    over: e.scrollWidth - e.clientWidth};
        }),
        fill: document.querySelector(".MUS_PLAYER .MUS_SEEK_FILL").style.width,
        doc_w: document.documentElement.scrollWidth,
        win_w: window.innerWidth
    };
}


async function probe(width, height, tag)
{
    const page = await new_page(browser, {viewport: {width, height}});
    await boot(page);
    await enter_preview(page);

    const r = await page.evaluate(measure);
    /*  Long enough that a ticking clock cannot be mistaken for jitter. */
    await page.waitForTimeout(2500);
    const fill2 = await page.evaluate(
        () => document.querySelector(".MUS_PLAYER .MUS_SEEK_FILL").style.width);

    const bad = [];
    if(!r.preview) {
        bad.push("the strip did not enter preview mode");
    }
    r.btns.forEach((b) => {
        if(b.over > 1) {
            bad.push(`"${b.text}" does not fit its button (+${b.over}px)`);
        }
        if(b.right > r.win_w) {
            bad.push(`"${b.text}" is off screen`);
        }
        /*  Same line as the title AND starting inside it = the labels
            printed over the track name. */
        if(r.meta && b.x < r.meta.right && b.y < r.meta.y + r.meta.h) {
            bad.push(`"${b.text}" sits on top of the title`);
        }
    });
    if(r.doc_w > r.win_w) {
        bad.push(`the page scrolls sideways (${r.doc_w} > ${r.win_w})`);
    }
    if(fill2 === r.fill) {
        bad.push(`the seek bar is frozen at ${r.fill}`);
    }

    console.log(`${tag.padEnd(9)} ${String(width).padEnd(5)} ` +
        `botones: ${r.btns.map((b) => b.text).join(" / ")}   ` +
        `barra: ${r.fill} → ${fill2}   ${bad.length ? ">>>" : "ok"}`);
    bad.forEach((m) => console.log("    " + m));

    const errs = report(page);
    await page.context().close();
    return bad.length + errs;
}


let bad = 0;
bad += await probe(390, 780, "móvil");
bad += await probe(1280, 900, "portátil");

console.log(bad
    ? `>>> ${bad} problemas en la tira de escucha`
    : "tira de escucha: se lee y el reloj avanza, en móvil y en portátil");

await browser.close();
process.exit(bad ? 1 : 0);
