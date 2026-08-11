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

/*  6. The two lists in Lists that nobody saved.
 *
 *  They are built from the counts every time that screen is drawn, so
 *  what has to be true is that they carry the right tracks IN THE RIGHT
 *  ORDER — a "most loved" list that is not sorted is worse than no list,
 *  because it looks like one. A second track gets one heart first, so
 *  there is an order to get wrong. */
await page.locator(".MUS_QROW").nth(1).locator(".MUS_CNT_HEART").click();
await page.waitForTimeout(400);
await route(page, "#/lists", 1200);

const derived = await page.evaluate(() => {
    /*  Section by section: the heading, then the rows under it until
        the next heading. */
    const out = [];
    const $c = document.querySelector(".C_MUS_LISTS") || document;
    let cur = null;
    for(const $n of $c.querySelectorAll(".MUS_SECTITLE, .MUS_RANK")) {
        if($n.classList.contains("MUS_SECTITLE")) {
            cur = {title: $n.textContent.trim(), rows: []};
            out.push(cur);
        } else if(cur) {
            const $h = $n.querySelector(".MUS_CNT_HEART .MUS_CNT_N");
            const $p = $n.querySelector(".MUS_CNT_PLAYS .MUS_CNT_N");
            cur.rows.push({
                title:  $n.querySelector(".MUS_T1").textContent,
                hearts: Number(($h && $h.textContent) || 0),
                plays:  Number(($p && $p.textContent) || 0)
            });
        }
    }
    return out.filter((s) => s.rows.length);
});

if(derived.length < 2) {
    bad.push(`Lists shows ${derived.length} derived sections, not 2`);
} else {
    const loved = derived[0].rows;
    const played = derived[1].rows;
    if(loved.length !== 2) {
        bad.push(`"loved" holds ${loved.length} tracks, not the 2 with hearts`);
    }
    /*  Descending, and it is the HEARTS that order it. */
    for(let i = 1; i < loved.length; i++) {
        if(loved[i].hearts > loved[i - 1].hearts) {
            bad.push(`"loved" is out of order: ${loved.map((r) => r.hearts).join(" ")}`);
            break;
        }
    }
    if(loved[0] && loved[0].hearts !== 2) {
        bad.push(`the most loved track shows ${loved[0].hearts} hearts, not 2`);
    }
    /*  …and the played list must NOT be the same list: only one track
        has ever been played here. */
    if(played.length !== 1) {
        bad.push(`"most played" holds ${played.length} tracks, not 1`);
    }
    if(played[0] && played[0].plays < 1) {
        bad.push(`"most played" shows a track with ${played[0].plays} plays`);
    }
}

await page.screenshot({path: join(OUT, "counts-lists.png")});


/*  And playing one of them fills the deck. */
await page.locator(".MUS_RANKACTIONS .MUS_QBTN.is-primary").first().click();
await page.waitForTimeout(1200);
if(await page.locator(".MUS_CONFIRM_CARD").count()) {
    await page.click(".MUS_CONFIRM_ACTIONS .is-danger");
    await page.waitForTimeout(1200);
}
const queued = await page.locator(".MUS_QROW").count();
if(queued !== 2) {
    bad.push(`playing "loved" put ${queued} tracks on the deck, not 2`);
}

/*  Back to a known place for what follows. */
await route(page, "#/player", 800);

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

/*  7. "Save as list" is off while the deck IS a saved list, untouched.
 *
 *  Three states, and the middle one is the whole point: saving then
 *  would only make a second copy of a list that already exists under a
 *  name. It has to come back the instant the queue differs from the
 *  list again, or the button is simply broken. */
const saved_n = await page.locator(".MUS_QROW").count();
await page.click(".MUS_QHEAD .MUS_QBTN:nth-child(1)");
await page.fill(".MUS_NAME_INPUT", "Test list");
await page.click(".MUS_NAMEROW .is-primary");
await page.waitForTimeout(700);

/*  Saving it is itself one of the three states: the deck IS that list
    now, so the button that just saved it has nothing left to do. It
    used to go on calling itself a hand-built queue and offering to
    save the same thing again under another name. */
const just_saved = await page.evaluate(() => ({
    off:    document.querySelector(".MUS_QHEAD .MUS_QBTN").disabled,
    origin: (document.querySelector(".MUS_QORIGIN") || {}).textContent || ""
}));
if(!just_saved.off) {
    bad.push(`right after saving, "save as list" is still on (${just_saved.origin})`);
}
if(just_saved.origin.indexOf("Test list") < 0) {
    bad.push(`the deck does not say it is the list just saved (${just_saved.origin})`);
}

await route(page, "#/lists", 900);
await page.locator(".MUS_SRCROW .MUS_QBTN.is-primary").first().click();
await page.waitForTimeout(900);
if(await page.locator(".MUS_CONFIRM_CARD").count()) {
    await page.click(".MUS_CONFIRM_ACTIONS .is-danger");
    await page.waitForTimeout(1200);
}
await route(page, "#/player", 900);

const on_list = await page.evaluate(() => ({
    off:    document.querySelector(".MUS_QHEAD .MUS_QBTN").disabled,
    origin: (document.querySelector(".MUS_QORIGIN") || {}).textContent || ""
}));
if(!on_list.off) {
    bad.push(`playing an untouched saved list leaves "save as list" enabled ` +
             `(${on_list.origin})`);
}

/*  Take a track out — now the deck is not that list any more. */
await page.locator(".MUS_QROW").nth(0).locator(".MUS_IBTN").nth(2).click();
await page.waitForTimeout(700);
const touched = await page.evaluate(
    () => document.querySelector(".MUS_QHEAD .MUS_QBTN").disabled);
if(touched) {
    bad.push("editing the queue does not bring \"save as list\" back");
}

/*  8. A saved list unfolds its songs when its NAME is tapped, in the
    order it was saved. */
await route(page, "#/lists", 900);
await page.click(".MUS_LISTNAME");
await page.waitForTimeout(500);
const unfolded = await page.evaluate(() => ({
    rows:     document.querySelectorAll(".MUS_LISTWRAP .MUS_RANK").length,
    expanded: document.querySelector(".MUS_LISTNAME").getAttribute("aria-expanded")
}));
if(unfolded.expanded !== "true") {
    bad.push("tapping the name does not say the list is open");
}
/*  Every song that went into the list, and taking one off the DECK
    afterwards must not have taken it out of the SAVED list. */
if(unfolded.rows !== saved_n) {
    bad.push(`the unfolded list shows ${unfolded.rows} songs, not the ${saved_n} saved`);
}
await page.click(".MUS_LISTNAME");
await page.waitForTimeout(400);
const folded = await page.evaluate(
    () => document.querySelectorAll(".MUS_LISTWRAP .MUS_RANK").length);
if(folded !== 0) {
    bad.push("tapping the name again does not close it");
}

/*  9. "Most played" can be emptied, and empties only itself.
 *
 *  SELF-CONTAINED on purpose: it makes its own play count first rather
 *  than borrowing one from the assertions above. Dropped in the middle
 *  of them it cleared a count they still needed, which is the second
 *  time that has happened in this file — a block that destroys state
 *  has to own the state it destroys.
 *
 *  Asked twice, because there is no undo. And the hearts have to
 *  survive it: they are somebody's choices, one tap at a time, and a
 *  button on the played list has no business touching them — which is
 *  the half of this that would go unnoticed without a test. */
await route(page, "#/player", 900);
await page.locator(".MUS_QROW").first().locator(".MUS_IBTN").first().click();
await page.waitForTimeout(HEARD_MS);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(600);
await route(page, "#/lists", 1200);

const sections = () => page.evaluate(() => {
    const out = [];
    let cur = null;
    for(const $n of document.querySelectorAll(
            ".C_MUS_LISTS .MUS_SECTITLE, .C_MUS_LISTS .MUS_RANK")) {
        if($n.classList.contains("MUS_SECTITLE")) {
            cur = {title: $n.textContent.trim(), n: 0};
            out.push(cur);
        } else if(cur) {
            cur.n++;
        }
    }
    return out;
});

const was = await sections();
const played_before = was.length ? was[was.length - 1].n : 0;
const loved_before = was.length > 1 ? was[was.length - 2].n : 0;
if(!played_before) {
    bad.push("nada que vaciar: la prueba no dice nada");
}

const $clear = page.locator(".MUS_RANKACTIONS").last().locator(".MUS_QBTN.is-ghost").first();
if(!await $clear.count()) {
    bad.push("\"most played\" has no way to be emptied");
} else {
    await $clear.click();
    await page.waitForTimeout(350);
    /*  One press must not have done it. */
    const armed = await sections();
    const still = armed.length ? armed[armed.length - 1].n : 0;
    if(still !== played_before) {
        bad.push("emptying the played list is not asked about, it just happens");
    }
    await page.locator(".MUS_RANKACTIONS .is-danger").first().click();
    await page.waitForTimeout(700);

    const now = await sections();
    const played_after = now.length ? now[now.length - 1].n : 0;
    const loved_after = now.length > 1 ? now[now.length - 2].n : 0;
    if(played_after !== 0) {
        bad.push(`"most played" still holds ${played_after} tracks after being cleared`);
    }
    if(loved_after !== loved_before) {
        bad.push(`clearing the play counts took the hearts with it ` +
                 `(${loved_before} loved before, ${loved_after} after)`);
    }
}
await page.screenshot({path: join(OUT, "counts-cleared.png")});

bad.forEach((b) => console.log("  ✗ " + b));
const errs = report(page);
await browser.close();
process.exit(bad.length + errs ? 1 : 0);
