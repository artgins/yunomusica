/***********************************************************************
 *          qline.mjs
 *
 *      The queue's line of buttons: the rare and the destructive at one
 *      end, what is used all the time at the other.
 *
 *      Before, the four sat in one run: "Clear the queue" one thumb's
 *      width from "Save as list", and on a phone the run wrapped into
 *      two lines that left room for one row of the queue. Pinned here:
 *
 *        - on a phone the line is ONE row, and every button is a 40px
 *          target;
 *        - "clear" is at the start, "maximise" at the end, and the two
 *          groups are apart (in Arabic, mirrored);
 *        - "maximise" is the filled one;
 *        - a button that shows only its icon still has a name;
 *        - on a laptop every button keeps its words;
 *        - and the longest label (Russian, queue maximised) still fits
 *          one row at 360px.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {launch, new_page, boot, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();
const browser = await launch();


function measure()
{
    const rtl = getComputedStyle(document.documentElement).direction === "rtl";
    const b = (sel) => {
        const e = document.querySelector(".MUS_QHEAD " + sel);
        if(!e) {
            return null;
        }
        const r = e.getBoundingClientRect();
        const label = [...e.querySelectorAll("span:not(.MUS_ICO)")]
            .some((s) => s.offsetWidth > 0);
        return {x: r.x, right: r.right, y: Math.round(r.y), w: r.width, h: r.height,
                name: e.getAttribute("aria-label") || e.textContent.trim(),
                label: label,
                primary: e.classList.contains("is-primary")};
    };
    return {
        rtl,
        clear: b(".MUS_QCLEAR"),
        save:  b(".MUS_QSAVE"),
        follow: b(".MUS_TOG"),
        maxq:  b(".MUS_MAXQ"),
        head: (() => {
            const r = document.querySelector(".MUS_QHEAD").getBoundingClientRect();
            return {x: r.x, right: r.right};
        })(),
        doc_w: document.documentElement.scrollWidth,
        win_w: window.innerWidth
    };
}


async function probe(width, height, mobile, locale, tag, maxq)
{
    const page = await new_page(browser, {viewport: {width, height}, mobile, locale});
    await boot(page);
    await add_source(page, FIX.longtracks);
    await route(page, "#/player", 900);
    if(maxq) {
        await page.click(".MUS_MAXQ");
        await page.waitForTimeout(500);
    }
    const r = await page.evaluate(measure);

    const bad = [];
    const all = [r.clear, r.save, r.follow, r.maxq];
    if(all.some((x) => !x)) {
        bad.push("a button of the queue line is missing");
    } else {
        /*  "start" and "end" in the reading direction */
        const start = (x) => r.rtl ? -x.right : x.x;
        if(!(start(r.clear) < start(r.save) && start(r.save) < start(r.follow) &&
             start(r.follow) < start(r.maxq))) {
            bad.push("the order is not clear, save | follow, maximise");
        }
        const gap = r.rtl ? (r.save.x - r.follow.right) : (r.follow.x - r.save.right);
        if(gap < 24) {
            bad.push(`the rare group and the frequent one are only ${Math.round(gap)}px apart`);
        }
        if(!r.maxq.primary) {
            bad.push("\"maximise\" is not the filled button");
        }
        all.forEach((x) => {
            if(!x.name) {
                bad.push("a button has no name");
            }
            /*  The page can be the right width while a button hangs
                over the gutter: the Russian label did, at 360px. */
            if(x.x < r.head.x - 1 || x.right > r.head.right + 1) {
                bad.push(`"${x.name}" sticks out of the line ` +
                         `(${Math.round(x.x)}-${Math.round(x.right)} in ` +
                         `${Math.round(r.head.x)}-${Math.round(r.head.right)})`);
            }
        });
        if(mobile) {
            if(new Set(all.map((x) => x.y)).size !== 1) {
                bad.push(`on a phone the line wraps (${all.map((x) => x.y).join(", ")})`);
            }
            all.forEach((x) => {
                if(x.h < 40 || x.w < 40) {
                    bad.push(`"${x.name}" is a ${Math.round(x.w)}x${Math.round(x.h)} target`);
                }
            });
            if(!r.maxq.label) {
                bad.push("on a phone \"maximise\" lost its words");
            }
        } else {
            all.forEach((x) => {
                if(!x.label) {
                    bad.push(`on a laptop "${x.name}" lost its words`);
                }
            });
        }
    }
    if(r.doc_w > r.win_w) {
        bad.push(`the page scrolls sideways (${r.doc_w} > ${r.win_w})`);
    }

    console.log(`${tag.padEnd(14)} ${all.map((x) => x ? (x.label ? x.name : "[" + x.name + "]") : "?").join(" · ")}` +
        `   ${bad.length ? ">>>" : "ok"}`);
    bad.forEach((m) => console.log("    " + m));
    const errs = report(page);
    await page.context().close();
    return bad.length + errs;
}


let bad = 0;
bad += await probe(390, 780, true, "es-ES", "móvil");
bad += await probe(360, 740, true, "de-DE", "móvil 360 de");
bad += await probe(390, 780, true, "ar", "móvil ar");
/*  The longest label of the ten, on the narrowest phone, in the state
    that says it: "Показать проигрыватель". */
bad += await probe(360, 740, true, "ru-RU", "móvil 360 ru", true);
bad += await probe(1280, 900, false, "es-ES", "portátil");
await browser.close();

console.log(bad
    ? `>>> ${bad} problemas en la línea de la cola`
    : "línea de la cola: lo raro y lo destructivo a un lado, lo frecuente al otro");
process.exit(bad ? 1 : 0);
