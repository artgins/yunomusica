/***********************************************************************
 *          counts.mjs
 *
 *      The two numbers a track carries, and the card that shows them.
 *
 *      What goes red here:
 *
 *        1. A track that really sounded is counted, ONCE. Both halves
 *           matter: a counter that never moves is useless, and one that
 *           moves on every `timeupdate` is worse than useless because it
 *           looks like it works.
 *        2. Skipping past a track does not count it. The whole claim of
 *           the number is "how often did I listen to this", and a queue
 *           skipped through in five seconds must leave it alone.
 *        3. The counts SURVIVE A RELOAD. They live in IndexedDB behind a
 *           debounced write, which is exactly the shape of thing that
 *           works all session and is empty tomorrow.
 *        4. A heart goes up from the row and comes back down from the
 *           card, and reset means zero.
 *        5. The card shows the whole title. That is the reason it
 *           exists: a row gives a name one ellipsised line, and this is
 *           the only place in the app where a long one can be read.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {launch, new_page, boot, route, add_source, report, OUT} from "./lib.mjs";
import {join} from "path";

const FIX = ensure_fixtures();

const browser = await launch();
const bad = [];

/*  The `music` tree is five-second tracks, so half of one — which is
    what the store asks for before it counts a listen — is two and a
    half seconds rather than the twenty a real track would need. */
const HEARD_MS = 4200;

async function counts(page, row)
{
    return page.evaluate((i) => {
        const $row = document.querySelectorAll(".MUS_QROW")[i];
        if(!$row) {
            return null;
        }
        const n = function(sel) {
            const $c = $row.querySelector(sel);
            if(!$c || !$c.classList.contains("is-on")) {
                return 0;
            }
            return Number($c.querySelector(".MUS_CNT_N").textContent || 0);
        };
        return {
            plays:  n(".MUS_CNT_PLAYS"),
            hearts: n(".MUS_CNT_HEART"),
            title:  $row.querySelector(".MUS_T1").textContent
        };
    }, row);
}


const page = await new_page(browser, {viewport: {width: 1100, height: 950}});
await boot(page);
await add_source(page, FIX.music);
await route(page, "#/player", 1200);

/*  Nothing has been listened to yet, so no row may claim otherwise. */
const before = await counts(page, 0);
if(!before) {
    bad.push("no hay filas en la cola");
} else if(before.plays !== 0) {
    bad.push(`a track nobody played is at ${before.plays}`);
}

/*  1. Play the first track long enough for it to count. */
await page.locator(".MUS_QROW").first().locator(".MUS_IBTN").first().click();
await page.waitForTimeout(HEARD_MS);
await page.click(".MUS_TPLAY");                 // pause, so it stops advancing
await page.waitForTimeout(500);

const heard = await counts(page, 0);
if(heard.plays !== 1) {
    bad.push(`a track listened to once is at ${heard.plays}`);
}

/*  …and it does NOT go on counting while it sits there. */
await page.waitForTimeout(1500);
const again = await counts(page, 0);
if(again.plays !== 1) {
    bad.push(`the count moved with nothing playing (${again.plays})`);
}

/*  2. Skipping through does not count. Three tracks touched for a
    moment each must leave every one of them at zero. */
await page.locator(".MUS_QROW").nth(1).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(500);
await page.click(".MUS_TNEXT");
await page.waitForTimeout(500);
await page.click(".MUS_TNEXT");
await page.waitForTimeout(500);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(400);
const skipped = await counts(page, 1);
if(skipped.plays !== 0) {
    bad.push(`a track skipped past counted as listened to (${skipped.plays})`);
}

/*  4. A heart, given from the row. */
await page.locator(".MUS_QROW").first().locator(".MUS_CNT_HEART").click();
await page.waitForTimeout(200);
await page.locator(".MUS_QROW").first().locator(".MUS_CNT_HEART").click();
await page.waitForTimeout(300);
const loved = await counts(page, 0);
if(loved.hearts !== 2) {
    bad.push(`two taps on the heart gave ${loved.hearts}`);
}

await page.screenshot({path: join(OUT, "counts-rows.png")});

/*  3. And all of it survives a reload. The write is debounced, so give
    it its moment before pulling the page out from under it. */
await page.waitForTimeout(1200);
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(2000);
await route(page, "#/player", 1200);
const back = await counts(page, 0);
if(!back) {
    bad.push("la cola no volvió tras recargar");
} else {
    if(back.plays !== 1) {
        bad.push(`after a reload the play count is ${back.plays}, not 1`);
    }
    if(back.hearts !== 2) {
        bad.push(`after a reload the hearts are ${back.hearts}, not 2`);
    }
}

/*  5. The card: the whole title, the fields, and the counts. */
await page.locator(".MUS_QROW").first().locator(".MUS_QMETA").click();
await page.waitForTimeout(500);
const card = await page.evaluate(() => {
    const $c = document.querySelector(".MUS_TCARD");
    if(!$c) {
        return null;
    }
    const $t = $c.querySelector(".MUS_TCARD_TITLE");
    const cs = $t ? getComputedStyle($t) : null;
    return {
        title:  $t ? $t.textContent : "",
        /*  The one string in the app that must NOT be ellipsised. */
        clip:   cs ? cs.textOverflow : "",
        fields: $c.querySelectorAll(".MUS_TCARD_FACT").length,
        values: Array.from($c.querySelectorAll(".MUS_TCARD_CV"))
                    .map((x) => x.textContent.trim())
    };
});
if(!card) {
    bad.push("tocar el nombre no abre la ficha");
} else {
    if(card.clip === "ellipsis") {
        bad.push("the card truncates the title, which is what it exists to avoid");
    }
    if(card.fields < 5) {
        bad.push(`the card shows ${card.fields} fields`);
    }
    if(card.values[0] !== "1" || card.values[1] !== "2") {
        bad.push(`the card reads ${card.values.join(" / ")}, not 1 play and 2 hearts`);
    }
}

await page.screenshot({path: join(OUT, "counts-card.png")});

/*  A heart taken back, and then all of them. */
await page.click(".MUS_TCARD_HSUB");
await page.waitForTimeout(250);
let hearts = await page.evaluate(
    () => document.querySelectorAll(".MUS_TCARD_CV")[1].textContent.trim());
if(hearts !== "1") {
    bad.push(`taking one back left ${hearts}`);
}
await page.click(".MUS_TCARD_HZERO");
await page.waitForTimeout(250);
hearts = await page.evaluate(
    () => document.querySelectorAll(".MUS_TCARD_CV")[1].textContent.trim());
if(hearts !== "0") {
    bad.push(`reset left ${hearts} hearts`);
}

/*  And forgetting the lot, which is the whole privacy story: a number
    you can read is a number you can clear, from where you read it. */
await page.click(".MUS_TCARD_FORGET");
await page.waitForTimeout(300);
const forgotten = await page.evaluate(
    () => document.querySelectorAll(".MUS_TCARD_CV")[0].textContent.trim());
if(forgotten !== "0") {
    bad.push(`"forget these counts" left the play count at ${forgotten}`);
}
await page.click(".MUS_TCARD_CLOSE");
await page.waitForTimeout(300);
const cleared = await counts(page, 0);
if(cleared.plays !== 0 || cleared.hearts !== 0) {
    bad.push(`the row still shows ${cleared.plays} plays / ${cleared.hearts} hearts`);
}

bad.forEach((b) => console.log("  ✗ " + b));
const errs = report(page);
await browser.close();
process.exit(bad.length + errs ? 1 : 0);
