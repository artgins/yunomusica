/***********************************************************************
 *          deckq.mjs
 *
 *      Two things about the queue on the deck.
 *
 *      0. It SAYS what it did. Adding to the queue was the only action
 *         in the app with no visible result at all: the deck is another
 *         screen, and it refuses repeats (below), so pressing + on a
 *         record already on it changed nothing and said nothing. From
 *         the outside that is a dead button, and the second and third
 *         presses were people checking whether it worked. The refusal
 *         is right; the silence was not.
 *
 *      1. It does not repeat itself. Adding an album that is already on
 *         the deck used to append it again, and the damage was quiet:
 *         the queue reads as longer than it is, the same song comes
 *         round again mid-evening, and a list saved from it carries the
 *         repeat for good. Pressing "add" twice must be safe.
 *
 *         What it refuses is the same TRACK twice, not the same song:
 *         two files of the same tune, in different albums, are two
 *         records and the app has no business merging them. This test
 *         only pins down the first half — the second is a decision, and
 *         a test that asserted it would be asserting an opinion.
 *
 *      2. It can have the whole screen. The deck leads with the sleeve
 *         and the transport, which is right when you are listening and
 *         wrong when you are working on the queue — on a phone that card
 *         is most of the screen. The fold has to take the card and
 *         nothing else: the bars under it (a folder waiting to be
 *         authorised, a new build deployed) are not the player.
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
const page = await new_page(browser, {viewport: {width: 412, height: 915}, mobile: true});

await boot(page);
await add_source(page, walk(FIX.music), 2, 2500);
await route(page, "#/player", 900);

const rows = () => page.locator(".MUS_QROW").count();
const start = await rows();
console.log("cola cargada:", start);

/*  What the app says about the deck, while it is saying it. */
const said = () => page.evaluate(() => {
    const $s = document.querySelector(".MUS_SAID");
    if(!$s || !$s.classList.contains("is-on")) {
        return "";
    }
    return $s.textContent.replace(/\s+/g, " ").trim();
});

/*  1. add an album that is already on the deck, twice */
let last_said_text = "";

async function add_album(name)
{
    await route(page, "#/library", 900);
    await page.click('.MUS_CHIP:has-text("Álbumes")');
    await page.waitForTimeout(600);
    /*  Second button of the pair: play all, then add all. */
    await page.locator(`.MUS_CARD:has-text("${name}")`).first()
        .locator(".MUS_ROWCTL .MUS_IBTN").nth(1).click();
    /*  Read BEFORE the note times itself out — it lasts about two
        seconds, which is the point of it. */
    await page.waitForTimeout(400);
    last_said_text = await said();
    await page.waitForTimeout(900);
    await route(page, "#/player", 800);
    return rows();
}

const once  = await add_album("Cello Suites");
const said_once = last_said_text;
const twice = await add_album("Cello Suites");
const said_twice = last_said_text;
console.log("1. añadido un álbum que ya estaba:", once, "| y otra vez:", twice);
console.log("0. y lo dijo:", `“${said_once}”`, "| la segunda vez:", `“${said_twice}”`);

/*  …and the titles are each there once */
const titles = await page.evaluate(() =>
    [...document.querySelectorAll(".MUS_QROW")].map((r) => r.textContent.trim()));
const repeated = titles.filter((x, i) => titles.indexOf(x) !== i);
console.log("   filas repetidas:", repeated.length ? repeated.join(" · ") : "ninguna");

/*  0b. y con la cola vacía, lo que entra se cuenta */
await route(page, "#/player", 700);
await page.click(".MUS_QHEAD .MUS_QBTN:nth-child(2)");
await page.waitForTimeout(500);
const $yes = page.locator(".MUS_QHEAD .is-danger");
if(await $yes.count()) {
    await $yes.first().click();
    await page.waitForTimeout(600);
}
const added_n = await add_album("Cello Suites");
const said_added = last_said_text;
console.log("0b. con la cola vacía:", `“${said_added}”`, "| cola:", added_n);

/*  2. the queue takes the screen, and gives it back */
await page.screenshot({path: `${OUT}/deckq-normal.png`});
const card_before = await page.locator(".MUS_DECKCARD").isVisible();
await page.click(".MUS_MAXQ");
await page.waitForTimeout(700);
const card_max = await page.locator(".MUS_DECKCARD").isVisible();
const bars_alive = await page.locator(".MUS_DECKBARS").count();
const still_rows = await rows();
console.log("2. maximizada -> tarjeta:", card_max, "| filas:", still_rows,
            "| las barras siguen existiendo:", bars_alive > 0);
console.log("   el botón se ofrece a volver:",
            (await page.locator(".MUS_MAXQ").textContent() || "").trim());
await page.screenshot({path: `${OUT}/deckq-max.png`});

await page.click(".MUS_MAXQ");
await page.waitForTimeout(700);
const card_back = await page.locator(".MUS_DECKCARD").isVisible();
console.log("   restaurada -> tarjeta:", card_back);

let bad = report(page);
/*  Both presses were no-ops on the queue, and BOTH have to say so:
    "nothing happened because it was already there" is the one thing the
    user cannot see for themselves from the library. */
if(!said_once || !said_twice) {
    console.log(">>> añadir a la cola no dice nada:",
                `“${said_once}” / “${said_twice}”`);
    bad = true;
}
if(!/\d/.test(said_twice)) {
    console.log(">>> lo que dice no lleva ninguna cifra:", said_twice);
    bad = true;
}
/*  Y el caso contrario, que es el que se ve el resto del tiempo: con la
    cola vacía, lo que entra entra, y se dice cuánto. */
if(!/\d/.test(said_added) || added_n !== 2) {
    console.log(">>> añadir de verdad no dice cuánto:", `“${said_added}” -> ${added_n}`);
    bad = true;
}
if(once !== start || twice !== start) {
    console.log(">>> la cola repite pistas que ya tenía");
    bad = true;
}
if(repeated.length) {
    console.log(">>> hay filas repetidas en la cola");
    bad = true;
}
if(still_rows !== added_n) {
    console.log(">>> la cola cambió al plegar el reproductor");
    bad = true;
}
if(!card_before || card_max || !card_back) {
    console.log(">>> el botón de cola entera no pliega y despliega el reproductor");
    bad = true;
}
if(!bars_alive) {
    console.log(">>> maximizar se lleva por delante algo que no era el reproductor");
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
