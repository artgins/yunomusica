/***********************************************************************
 *          confirm.mjs
 *
 *      Where the "this will discard your queue" question still belongs,
 *      and where it must never appear again.
 *
 *      There are two lists in this app and only one of them is the
 *      user's. The DECK is official: curated, saved, persistent. What
 *      the library shows is temporary — as long as the screen you are
 *      on. Pressing play in the library sounds the temporary one and
 *      leaves the deck paused and whole, so there is nothing to warn
 *      about and a dialog there was pure obstruction between the user
 *      and the sound they asked for.
 *
 *      Pressing play on a LIST is the other thing entirely: it means
 *      "make this my deck", which throws the current one away. That one
 *      asks, and it offers three answers rather than two — add, replace,
 *      cancel — because "add" is what the user usually meant when they
 *      did not want the deck destroyed. With an empty deck it must not
 *      ask at all: a confirmation that fires when nothing is at stake
 *      teaches people to dismiss confirmations.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();

let bad = false;

function check(ok, what)
{
    console.log(`   ${ok ? "ok " : ">>>"} ${what}`);
    if(!ok) {
        bad = true;
    }
}

const browser = await launch();
const page = await new_page(browser, {viewport: {width: 1100, height: 950}});

await boot(page);
await add_source(page, FIX.mimusica, 1, 4000);

const dialog = () => page.locator(".MUS_CONFIRM_CARD").count();
const qcount = async () => {
    await route(page, "#/player", 600);
    return page.locator(".MUS_QROW").count();
};

/*  A list nobody had to save: hearting a track builds "loved", which is
    a real list with a real play button on it.

    Hearted from the LIBRARY, inside one album, so the list can later be
    added to a deck that does not already hold those tracks — the deck
    refuses repeats (see deckq.mjs), so a list already on it appends
    nothing and would prove nothing. */
const heart_an_album = async (nth, howmany) => {
    await route(page, "#/library", 800);
    await page.locator(".MUS_CHIP").nth(1).click();             // álbumes
    await page.waitForTimeout(700);
    await page.locator(".MUS_CARD").nth(nth).locator(".MUS_CARDMAIN").click();
    await page.waitForTimeout(800);
    for(let i = 0; i < howmany; i++) {
        await page.locator(".MUS_ROW").nth(i).locator(".MUS_CNT_HEART").click();
        await page.waitForTimeout(250);
    }
};
await heart_an_album(0, 2);

const play_a_list = async () => {
    await route(page, "#/lists", 1000);
    await page.locator(".MUS_RANKACTIONS .MUS_QBTN").first().click();
    await page.waitForTimeout(900);
};


/*  =================================================================
 *  1. The library does not ask, because it takes nothing
 *  ================================================================= */
console.log("1. la biblioteca no pregunta");

const q0 = await qcount();
check(q0 > 0, `hay ${q0} pistas en la cola, que es lo que no se debe perder`);

await route(page, "#/library", 800);
await page.locator(".MUS_CHIP").nth(1).click();             // álbumes
await page.waitForTimeout(700);
await page.locator(".MUS_CARD").nth(0).locator(".MUS_IBTN").first().click();
await page.waitForTimeout(1200);

check((await dialog()) === 0, `dar al play en un álbum no abre ningún diálogo`);
check((await qcount()) === q0, `y la cola sigue con ${await qcount()} pistas, intacta`);


/*  =================================================================
 *  2. A list does ask, and Cancel changes nothing
 *  ================================================================= */
console.log("2. una lista sí pregunta");

await play_a_list();
check((await dialog()) === 1, `dar al play en una lista abre el diálogo`);

const says = (await page.locator(".MUS_CONFIRM_WHAT").textContent() || "")
    .replace(/\s+/g, " ").trim();
const options = await page.locator(".MUS_CONFIRM_ACTIONS button").allTextContents();
check(options.length === 3, `y ofrece tres salidas, no dos: ${options.join(" | ")}`);
console.log(`       dice: ${says}`);
await page.screenshot({path: `${OUT}/confirm-dialog.png`});

await page.locator(".MUS_CONFIRM_CANCEL").click();
await page.waitForTimeout(700);
check((await qcount()) === q0, `cancelar deja la cola como estaba: ${await qcount()}`);


/*  =================================================================
 *  3. Its three answers do what they say
 *  ================================================================= */
console.log("3. y sus tres respuestas hacen lo que dicen");

await play_a_list();
await page.locator(".MUS_CONFIRM_ACTIONS .is-danger").click();         // sustituir
await page.waitForTimeout(1200);
const q2 = await qcount();
check(q2 === 2 && q2 < q0,
      `«sustituir y reproducir» deja en la cola la lista y nada más: ${q0} → ${q2}`);

/*  Otro álbum en la cola, uno que NO tiene las pistas queridas, para que
    añadir tenga algo que añadir. */
await route(page, "#/library", 800);
await page.locator(".MUS_CHIP").nth(1).click();
await page.waitForTimeout(700);
await page.locator(".MUS_CARD").nth(5).locator(".MUS_IBTN").nth(1).click();   // +
await page.waitForTimeout(1000);
await route(page, "#/player", 600);
await page.click(".MUS_QHEAD .MUS_QBTN:nth-child(2)");                 // vaciar
await page.waitForTimeout(500);
const $clear = page.locator(".MUS_QHEAD .is-danger");
if(await $clear.count()) {
    await $clear.first().click();
    await page.waitForTimeout(600);
}
await route(page, "#/library", 800);
await page.locator(".MUS_CHIP").nth(1).click();
await page.waitForTimeout(700);
await page.locator(".MUS_CARD").nth(5).locator(".MUS_IBTN").nth(1).click();   // +
await page.waitForTimeout(1000);
const qa = await qcount();
check(qa > 0, `hay otro álbum en la cola: ${qa} pistas`);

await play_a_list();
await page.locator(".MUS_CONFIRM_ACTIONS button").first().click();     // añadir
await page.waitForTimeout(1200);
const q1 = await qcount();
check(q1 === qa + 2, `«añadir a la cola» la hace crecer sin tirar nada: ${qa} → ${q1}`);


/*  =================================================================
 *  4. With an empty deck there is nothing to lose, so it must not ask
 *  ================================================================= */
console.log("4. con el plato vacío no pregunta");

await route(page, "#/player", 600);
await page.click(".MUS_QHEAD .MUS_QBTN:nth-child(2)");                 // vaciar
await page.waitForTimeout(500);
/*  Emptying asks too — that question is emptyq.mjs's, not this one's. */
const $yes = page.locator(".MUS_CONFIRM_ACTIONS .is-danger, .MUS_QHEAD .is-danger");
if(await $yes.count()) {
    await $yes.first().click();
    await page.waitForTimeout(700);
}
check((await qcount()) === 0, `la cola está vacía: ${await qcount()}`);

await play_a_list();
check((await dialog()) === 0, `no pregunta cuando no hay nada que perder`);
check((await qcount()) > 0, `y carga la lista igualmente: ${await qcount()} pistas`);

await page.screenshot({path: `${OUT}/confirm.png`});
if(report(page)) {
    bad = true;
}
await browser.close();
process.exit(bad ? 1 : 0);
