/***********************************************************************
 *          follow.mjs
 *
 *      The deck holds still and the queue follows the music.
 *
 *      Two behaviours that only show up with a queue longer than the
 *      screen, which is every real queue and none of the other tests':
 *
 *        1. The banner and the bars do NOT scroll. Only the list does.
 *           The shell zone must not scroll either — if it does, the
 *           transport goes off the top and the whole point is lost.
 *        2. After the scroll has been still for the configured wait, the
 *           playing row is brought back to the middle of the list, and
 *           it stays there as the queue advances. A scroll of the user's
 *           re-arms the wait from zero: while they are looking at
 *           something, the page is theirs.
 *
 *      The wait is read from localStorage, so the test sets it to two
 *      seconds instead of sitting through the ten the app ships with.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {launch, new_page, boot, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();
const WAIT = 2;                 // seconds the app waits before following

const browser = await launch();


/*  Where the playing row sits inside the box that scrolls, and by how
    much it misses the middle of it. */
function measure()
{
    const $s = document.querySelector(".MUS_DECKSCROLL");
    const $row = document.querySelector(".MUS_QROW.is-playing");
    const $card = document.querySelector(".MUS_DECKCARD");
    const $zone = document.querySelector(".yui-zone-center");
    if(!$s || !$row) {
        return null;
    }
    const s = $s.getBoundingClientRect();
    const r = $row.getBoundingClientRect();
    return {
        off:       Math.round((r.top + r.height / 2) - (s.top + s.height / 2)),
        card_top:  Math.round($card.getBoundingClientRect().top),
        scrolled:  Math.round($s.scrollTop),
        can_scroll: $s.scrollHeight > $s.clientHeight + 1,
        /*  The zone around the view must have nothing to scroll: the
            view is exactly as tall as the zone and hides its own
            overflow. */
        zone_over: $zone ? $zone.scrollHeight - $zone.clientHeight : -1,
        doc_over:  document.documentElement.scrollHeight - window.innerHeight
    };
}


async function probe(width, height, tag)
{
    const page = await new_page(browser, {
        viewport: {width, height},
        init: `localStorage.setItem("yunomusica:follow_delay", "${WAIT}")`
    });
    await boot(page);
    await add_source(page, FIX.mimusica);
    await route(page, "#/player", 1200);

    /*  Play something from the MIDDLE of the queue. The first row cannot
        be centred — there is nothing above it to scroll — so a queue
        parked at track 1 would report a miss the app is right about. */
    await page.locator(".MUS_QROW").nth(20).locator(".MUS_IBTN").first().click();
    await page.waitForTimeout(800);
    /*  And pause it. A fixture track is one second of silence, so a
        running queue steps to the next row every second and the deck is
        forever a row behind — which is the feature working, and makes
        every measurement here a race. Pausing leaves the playing row
        where it is; following does not depend on the audio. */
    await page.click(".MUS_TPLAY");
    await page.waitForTimeout(400);

    const bad = [];
    const before = await page.evaluate(measure);
    if(!before) {
        console.log(`${tag}: no hay fila sonando`);
        await page.context().close();
        return 1;
    }
    if(!before.can_scroll) {
        bad.push("the list is not long enough to scroll: the test proves nothing");
    }
    if(before.zone_over > 1) {
        bad.push(`the shell zone scrolls (${before.zone_over}px over)`);
    }
    if(before.doc_over > 1) {
        bad.push(`the page itself scrolls (${before.doc_over}px over)`);
    }

    /*  Scroll the list a long way from the playing row and check the
        banner did not move with it. */
    await page.evaluate(() => {
        document.querySelector(".MUS_DECKSCROLL").scrollTop = 2400;
    });
    await page.waitForTimeout(400);
    const away = await page.evaluate(measure);
    if(away.card_top !== before.card_top) {
        bad.push(`the banner scrolled with the list ` +
                 `(${before.card_top} → ${away.card_top})`);
    }
    if(away.scrolled < 1000) {
        bad.push("the list did not scroll");
    }

    /*  Still within the wait: nothing may move yet. */
    await page.waitForTimeout(WAIT * 1000 * 0.4);
    const early = await page.evaluate(measure);
    if(Math.abs(early.scrolled - away.scrolled) > 4) {
        bad.push(`it followed before the wait was up ` +
                 `(${away.scrolled} → ${early.scrolled})`);
    }

    /*  Past the wait, plus the smooth scroll's own time. */
    await page.waitForTimeout(WAIT * 1000 + 1600);
    const after = await page.evaluate(measure);
    /*  Half a row of slack: the app itself stops caring within 24px. */
    if(Math.abs(after.off) > 40) {
        bad.push(`the playing row is ${after.off}px off the middle`);
    }
    if(after.card_top !== before.card_top) {
        bad.push("the banner moved while following");
    }

    /*  And the switch turns it off. */
    await page.click(".MUS_QACTIONS .MUS_TOG");
    await page.evaluate(() => {
        document.querySelector(".MUS_DECKSCROLL").scrollTop = 2400;
    });
    await page.waitForTimeout(WAIT * 1000 + 1600);
    const off = await page.evaluate(measure);
    if(Math.abs(off.scrolled - 2400) > 40) {
        bad.push(`switched off, it still followed (scroll ${off.scrolled})`);
    }

    console.log(`${tag.padEnd(9)} ${String(width).padEnd(5)} ` +
        `desvío del centro: ${before.off} → ${away.off} → ${after.off}px   ` +
        `banner fijo en ${before.card_top}   ${bad.length ? ">>>" : "ok"}`);
    bad.forEach((m) => console.log("    " + m));

    const errs = report(page);
    await page.context().close();
    return bad.length + errs;
}


let bad = 0;
bad += await probe(390, 780, "móvil");
bad += await probe(1280, 900, "portátil");

console.log(bad
    ? `>>> ${bad} problemas siguiendo lo que suena`
    : "el banner no se mueve y la fila que suena vuelve al centro");

await browser.close();
process.exit(bad ? 1 : 0);
