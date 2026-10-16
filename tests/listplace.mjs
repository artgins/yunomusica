/***********************************************************************
 *          listplace.mjs
 *
 *      A saved list is a thing of its own, and it remembers where it
 *      was left.
 *
 *      What goes red here:
 *
 *        1. The two skip buttons move the deck's track ten seconds
 *           back and ten forward, paused or not.
 *        2. A list left for something else (here: the queue emptied)
 *           and played again comes back on the track it was on, at the
 *           second it was at — not on its first track at 0:00.
 *        3. Two reloads in a row land where the music was. The second
 *           one is the one that used to lose it: the first snapshot
 *           after start up stored the element's clock, which stands at
 *           0 until the cued position is applied.
 *        4. The place of the list survives the reloads too: emptied
 *           and played again after them, it still comes back there.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {launch, new_page, boot, route, add_source, report} from "./lib.mjs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
/*  Six tracks of 25 seconds: room for a ten-second skip each way. */
const LONG = join(HERE, "fixtures", "longtracks", "Brain Salad Surgery");

const browser = await launch();
const page = await new_page(browser, {locale: "en-GB"});
await boot(page);

let bad = [];
const check = (label, ok) => {
    if(!ok) { bad.push(label); }
    console.log(`   ${ok ? "ok " : ">>>"} ${label}`);
};

const clock = () => page.evaluate(
    () => (document.querySelector(".MUS_TCUR") || {}).textContent || "");
const title = () => page.evaluate(
    () => (document.querySelector(".MUS_DECKTITLE") || {}).textContent || "");
const playing = () => page.evaluate(
    () => !!document.querySelector(".MUS_TPLAY [d^='M6 5h4']"));
const secs = (mmss) => {
    const p = String(mmss).split(":");
    return (p.length === 2) ? (Number(p[0]) * 60 + Number(p[1])) : -1;
};

async function pause()
{
    if(await playing()) {
        await page.click(".MUS_TPLAY");
        await page.waitForTimeout(400);
    }
}

async function empty_the_queue()
{
    await page.click(".MUS_QHEAD .MUS_QCLEAR");
    await page.click(".MUS_QHEAD .MUS_QCLEAR_YES");
    await page.waitForTimeout(500);
}

/*  The deck is empty, so Play on the list replaces it without asking. */
async function play_list_a()
{
    await route(page, "#/lists", 900);
    await page.locator(".C_MUS_LISTS .MUS_SRCROW").first()
        .locator(".MUS_QBTN.is-primary").first().click();
    await page.waitForTimeout(1500);
    await route(page, "#/player", 800);
}

await add_source(page, [LONG], 1, 4000);
await route(page, "#/player", 1200);

/*  The deck as list "A". */
await page.click(".MUS_QHEAD .MUS_QSAVE");
await page.fill(".MUS_NAME_INPUT", "A");
await page.click(".MUS_NAMEROW .is-primary");
await page.waitForTimeout(500);


/*  ---- 1. skip ------------------------------------------------- */
console.log("1. skip");
await page.locator(".MUS_QROW").nth(2).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(1800);
await pause();
const t3 = await title();
const at0 = secs(await clock());
await page.click(".MUS_TFWD");
await page.waitForTimeout(500);
const at_fwd = secs(await clock());
await page.click(".MUS_TBACK");
await page.waitForTimeout(500);
const at_back = secs(await clock());
console.log(`   paused at ${at0}s, +10 -> ${at_fwd}s, -10 -> ${at_back}s`);
check("+10 moves the clock ten seconds on", Math.abs(at_fwd - (at0 + 10)) <= 1);
check("-10 moves it back", Math.abs(at_back - at0) <= 1);

await page.click(".MUS_TFWD");
await page.waitForTimeout(500);
const left_at = secs(await clock());


/*  ---- 2. the list comes back where it was left ---------------- */
console.log("2. leave the list and come back");
await empty_the_queue();
check("the queue is empty", (await page.locator(".MUS_QROW").count()) === 0);
await play_list_a();
await pause();
let now_t = await title();
let now_s = secs(await clock());
console.log(`   left "${t3}" at ${left_at}s; back on "${now_t}" at ${now_s}s`);
check("back on the track it was left on", now_t === t3);
check("back at the second it was left at", now_s >= left_at - 1 && now_s <= left_at + 5);
const kept = now_s;


/*  ---- 3. two reloads in a row --------------------------------- */
console.log("3. reload twice");
await page.waitForTimeout(2000);            // let the pause be stored
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(400);
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(2500);
await route(page, "#/player", 1200);
now_t = await title();
now_s = secs(await clock());
console.log(`   after two reloads: "${now_t}" at ${now_s}s (was ${kept}s)`);
check("two reloads keep the track", now_t === t3);
check("two reloads keep the place", Math.abs(now_s - kept) <= 1);


/*  ---- 4. the list's place survives the reloads ---------------- */
console.log("4. leave the list again, after the reloads");
await empty_the_queue();
await play_list_a();
await pause();
now_t = await title();
now_s = secs(await clock());
console.log(`   back on "${now_t}" at ${now_s}s`);
check("the list's place survived the reloads (track)", now_t === t3);
check("the list's place survived the reloads (second)", now_s >= kept - 1 && now_s <= kept + 5);


console.log(bad.length ? "FAIL" : "ok: a list keeps its place, and so does a reload");
const errs = report(page);
await browser.close();
process.exit((bad.length || errs) ? 1 : 0);
