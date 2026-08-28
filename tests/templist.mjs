/***********************************************************************
 *          templist.mjs
 *
 *      Two lists, and only one of them is the user's.
 *
 *      The DECK is the official list: curated, saved, persistent, the
 *      thing the Reproductor screen is about. What the library shows —
 *      a genre, an album, a folder, the tracks of one artist — is the
 *      other kind: temporary, unsaved, exactly as long as the screen you
 *      are looking at.
 *
 *      Pressing play on a row starts the temporary one. Three things
 *      have to be true at once and each of them shipped wrong at some
 *      point:
 *
 *        1. It SOUNDS, immediately. No dialog stands between the user
 *           and the sound they asked for, because nothing is at risk.
 *        2. The deck is PAUSED and whole. Not replaced, not appended
 *           to, not reordered — paused, keeping its place.
 *        3. It runs ON through the list on the screen to the end of it.
 *           Sounding one track and stopping dead is not what anybody
 *           means by play.
 *
 *      And there has to be a way back, on the strip the two lists share,
 *      because that strip is the only sign that what you hear is not the
 *      deck. Returning gives the deck back playing, if it was playing
 *      when it was interrupted.
 *
 *      Driven on the `music` fixture: 5-second tracks, so a list running
 *      on to its next track is something this test can WATCH happen
 *      rather than assert about in the abstract.
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

let bad = false;

function check(ok, what)
{
    console.log(`   ${ok ? "ok " : ">>>"} ${what}`);
    if(!ok) {
        bad = true;
    }
}

const browser = await launch();
const page = await new_page(browser, {viewport: {width: 412, height: 915}, mobile: true});

await boot(page);
await add_source(page, walk(FIX.music), 2, 2500);

/*  What the shared strip is saying, without leaving the screen. */
const strip = () => page.evaluate(() => {
    const $p = document.querySelector(".MUS_PLAYER");
    const txt = (sel) => {
        const e = $p && $p.querySelector(sel);
        return e ? e.textContent.trim() : "";
    };
    return {
        temp:  !!($p && $p.classList.contains("is-preview")),
        title: txt(".MUS_PTITLE"),
        line:  txt(".MUS_PARTIST"),
        back:  !!($p && $p.querySelector(".MUS_BACKDECK")),
        /*  While the deck owns the strip its button says what pressing
            it would DO, so "pause" means the deck is sounding. */
        deck_playing: !!($p && $p.querySelector('.MUS_PPLAY[aria-label]') &&
            /paus/i.test($p.querySelector(".MUS_PPLAY").getAttribute("aria-label"))),
    };
});

const deck = async () => {
    await route(page, "#/player", 700);
    const n = await page.locator(".MUS_QROW").count();
    const titles = await page.evaluate(() =>
        [...document.querySelectorAll(".MUS_QROW .MUS_T1")].map((e) => e.textContent.trim()));
    return {n, titles: titles.join(" | ")};
};

/*  Open one album and leave the screen on its track rows. */
const open_album = async (name) => {
    await route(page, "#/library", 800);
    await page.locator('.MUS_CHIP:has-text("Álbumes")').click();
    await page.waitForTimeout(700);
    await page.locator(`.MUS_CARD:has-text("${name}")`).first()
        .locator(".MUS_CARDMAIN").click();
    await page.waitForTimeout(800);
};


/*  =================================================================
 *  1. The deck is sounding, and the temporary list takes over
 *  ================================================================= */
console.log("1. la lista temporal entra, y la oficial espera");

await route(page, "#/player", 800);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(1200);
const before = await deck();
check(before.n === 4, `la cola oficial tiene ${before.n} pistas`);

await open_album("Cello Suites");
const rows = await page.locator(".MUS_ROW").count();
check(rows === 2, `el álbum en pantalla tiene ${rows} filas`);

await page.locator(".MUS_ROW").first().locator(".MUS_IBTN").first().click();
await page.waitForTimeout(1500);

let s = await strip();
check(s.temp, `la tira entra en modo lista temporal`);
check(s.back, `y lleva el botón de volver a la cola`);
check(!!s.title, `suena algo: “${s.title}” — ${s.line}`);
check(/1 \/ 2/.test(s.line), `y dice por dónde va: ${s.line}`);
await page.screenshot({path: `${OUT}/templist-strip.png`});

const during = await deck();
check(during.n === before.n && during.titles === before.titles,
      `la cola oficial sigue igual: ${during.n} pistas, sin tocar`);
await route(page, "#/library", 700);


/*  =================================================================
 *  2. Y sigue sola hasta el final de lo que hay en pantalla
 *  ================================================================= */
console.log("2. y sigue sola hasta el final de la lista");

const first = (await strip()).title;
/*  Las pistas duran 5 s: esto es esperar a que ACABE, no un timeout
    inventado. */
await page.waitForTimeout(6500);
s = await strip();
check(s.temp && s.title && s.title !== first,
      `pasa sola a la siguiente: “${first}” → “${s.title}”`);
check(/2 \/ 2/.test(s.line), `y lo cuenta: ${s.line}`);

/*  Al acabar la última, la cola oficial recupera su turno en vez de que
    la app se quede muda sin explicar qué ha terminado. */
await page.waitForTimeout(6500);
s = await strip();
check(!s.temp, `al acabar la lista, la tira vuelve a ser la de la cola`);
check(s.deck_playing, `y la cola oficial vuelve a sonar donde estaba`);


/*  =================================================================
 *  3. El botón de volver es la salida en cualquier momento
 *  ================================================================= */
console.log("3. y se puede volver cuando se quiera");

await open_album("Rocket to Russia");
await page.locator(".MUS_ROW").first().locator(".MUS_IBTN").first().click();
await page.waitForTimeout(1500);
s = await strip();
check(s.temp, `otra lista temporal en marcha: “${s.title}”`);

await page.locator(".MUS_BACKDECK").click();
await page.waitForTimeout(1200);
s = await strip();
check(!s.temp, `volver a la cola saca de la lista temporal`);
check(s.deck_playing, `y la cola oficial sigue sonando`);

const after = await deck();
check(after.n === before.n && after.titles === before.titles,
      `y despues de todo eso la cola oficial no ha cambiado: ${after.n} pistas`);


/*  =================================================================
 *  4. Un álbum entero, desde su tarjeta, sin preguntar nada
 *  ================================================================= */
console.log("4. un álbum entero, sin preguntas");

await route(page, "#/library", 800);
await page.locator('.MUS_CHIP:has-text("Álbumes")').click();
await page.waitForTimeout(700);
await page.locator(".MUS_CARD").first().locator(".MUS_IBTN").first().click();
await page.waitForTimeout(1500);

check((await page.locator(".MUS_CONFIRM_CARD").count()) === 0,
      `no aparece ningún diálogo`);
s = await strip();
check(s.temp && /1 \/ 2/.test(s.line), `el álbum suena desde el principio: ${s.line}`);
await page.screenshot({path: `${OUT}/templist-album.png`});

await page.locator(".MUS_BACKDECK").click();
await page.waitForTimeout(1000);
const end = await deck();
check(end.n === before.n && end.titles === before.titles,
      `y la cola oficial, otra vez, intacta: ${end.n} pistas`);

if(report(page)) {
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
