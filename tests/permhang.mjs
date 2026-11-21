/***********************************************************************
 *          permhang.mjs
 *
 *      A folder whose permission question gets no answer, or a wrong
 *      one, must still end on the "authorise" bar. Never on a silent
 *      app.
 *
 *      2026-11-21, on the phone: no folders in Sources, no "authorise"
 *      bar, and a Diagnostics panel that stayed empty. yunovídeo, which
 *      reads folders with the same code, did the same. Every await on
 *      the browser here assumed an answer would come. A
 *      queryPermission() that never settles left the start-up waiting
 *      for ever, before the folders reached the screen, and the
 *      Diagnostics panel showed nothing until every one of its checks
 *      had answered.
 *
 *      Act 1: queryPermission() never settles. The bar must come up,
 *      the folder must still be in Sources with its tracks, and
 *      Diagnostics must finish and name the call that did not answer.
 *      Authorising (requestPermission, which still answers) brings the
 *      music back.
 *
 *      Act 2: queryPermission() says "granted", but reading through the
 *      handle fails with NotAllowedError. The first read (the restored
 *      track, or play) must bring up the bar, not leave a player that
 *      does nothing.
 *
 *      The handles are real (origin private file system); only the
 *      permission calls and the picker are replaced, as in resume.mjs.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {readFileSync} from "fs";
import {join} from "path";

import {ensure_fixtures} from "./fixtures.mjs";
import {BASE, OUT, launch, new_page, route, cue_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();

let failed = 0;
const check = (label, ok) => {
    if(!ok) { failed++; }
    console.log(`   ${ok ? "ok " : ">>>"} ${label}`);
};

const secs = (txt) => {
    let m = String(txt || "").trim().match(/^(\d+):(\d+)$/);
    return m ? (Number(m[1]) * 60 + Number(m[2])) : -1;
};

/*  What the permission calls do, chosen per launch through
    sessionStorage["perm"]:
        (unset)  the browser's own answer
        "hang"   queryPermission() never settles
        "liar"   queryPermission() says "granted", reads fail NotAllowedError
    requestPermission() always answers "granted" and puts the browser's
    own behaviour back, which is what a user's "Allow" does. */
function folder_init()
{
    const mode = () => sessionStorage.getItem("perm") || "";
    const real_query = FileSystemHandle.prototype.queryPermission;
    FileSystemHandle.prototype.queryPermission = function(...args) {
        if(mode() === "hang") {
            return new Promise(() => {});
        }
        if(mode() === "liar") {
            return Promise.resolve("granted");
        }
        return real_query.apply(this, args);
    };
    FileSystemHandle.prototype.requestPermission = async function() {
        sessionStorage.removeItem("perm");
        return "granted";
    };
    const guard = (proto, name) => {
        const real = proto[name];
        proto[name] = function(...args) {
            if(mode() === "liar") {
                let e = new Error("the user did not grant read access");
                e.name = "NotAllowedError";
                return Promise.reject(e);
            }
            return real.apply(this, args);
        };
    };
    guard(FileSystemDirectoryHandle.prototype, "getFileHandle");
    guard(FileSystemDirectoryHandle.prototype, "getDirectoryHandle");
    window.showDirectoryPicker = async function() {
        let root = await navigator.storage.getDirectory();
        return await root.getDirectoryHandle("Mi música", {create: true});
    };
}

const MP3 = [1, 2].map((n) => [
    `0${n}.mp3`,
    readFileSync(join(FIX.longtracks, "Brain Salad Surgery", `0${n}.mp3`)).toString("base64")
]);

const bar_of = (page) => page.locator(".MUS_AUTHBAR:not(.MUS_UPDBAR):not(.MUS_INSTBAR)");

async function source_rows(page)
{
    await route(page, "#/sources", 700);
    return page.evaluate(() =>
        [...document.querySelectorAll(".MUS_SRCROW")].map((r) => ({
            name:  r.querySelector(".MUS_T1").textContent.trim(),
            count: Number((r.querySelector(".MUS_T2").textContent.match(/\d+/) || [0])[0]),
        })));
}

/*  Open Diagnostics and wait for it to finish: done when it is no
    longer only "…". Returns its text, or "" if it never finished. */
async function diagnostics(page, ms)
{
    await route(page, "#/sources", 700);
    if(!(await page.evaluate(() => document.querySelector(".MUS_DIAG").open))) {
        await page.click(".MUS_DIAG_SUM");
    }
    const until = Date.now() + ms;
    while(Date.now() < until) {
        let txt = await page.evaluate(() => document.querySelector(".MUS_DIAG_BODY").textContent);
        if(txt && !txt.trim().endsWith("…")) {
            return txt;
        }
        await page.waitForTimeout(250);
    }
    return "";
}


const browser = await launch();
const page = await new_page(browser, {
    viewport: {width: 412, height: 915}, mobile: true,
    no_fsa: false, init: folder_init
});

await page.goto(BASE, {waitUntil: "networkidle"});
await page.waitForTimeout(1100);
if(await page.locator(".MUS_ABOUT_CLOSE").count()) {
    await page.check(".MUS_ABOUT_DONTSHOW");
    await page.click(".MUS_ABOUT_CLOSE");
}

await page.evaluate(async (files) => {
    let root = await navigator.storage.getDirectory();
    let dir = await root.getDirectoryHandle("Mi música", {create: true});
    for(const [name, b64] of files) {
        let fh = await dir.getFileHandle(name, {create: true});
        let w = await fh.createWritable();
        await w.write(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
        await w.close();
    }
}, MP3);

await route(page, "#/sources", 600);
await page.click(".MUS_SECHEAD .MUS_QBTN:nth-child(1)");
await page.waitForTimeout(3000);
await cue_source(page);
let rows = await source_rows(page);
console.log(`0. carpeta añadida: ${rows.map((r) => r.name + " " + r.count).join(", ")}`);


                    /***************************
                     *  Act 1: no answer at all
                     ***************************/
console.log("1. queryPermission() no contesta");
await page.evaluate(() => sessionStorage.setItem("perm", "hang"));
await page.reload({waitUntil: "networkidle"});
await route(page, "#/player", 600);
/*  The wait is bounded at 4 s; give it 4 s more. */
await page.waitForTimeout(8000);
await page.screenshot({path: `${OUT}/permhang-bar.png`, fullPage: true});
check("sale la barra de autorizar", await bar_of(page).count() > 0);

rows = await source_rows(page);
check(`la carpeta sigue en Fuentes con sus pistas: ${rows.map((r) => r.name + " " + r.count).join(", ") || "ninguna"}`,
      rows.length === 1 && rows[0].count === 2);

let diag = await diagnostics(page, 15000);
check("Diagnóstico termina", diag.length > 0);
check("y dice qué llamada no contestó",
      /queryPermission.*(no answer|did not answer)/i.test(diag));
console.log(diag.split("\n").filter((l) => /source|readable|handle/.test(l)).map((l) => "      " + l).join("\n"));

await route(page, "#/player", 600);
if(await bar_of(page).count()) {
    await bar_of(page).locator(".MUS_QBTN").click();
    await page.waitForTimeout(2500);
}
check("autorizar quita la barra", await bar_of(page).count() === 0);
const tot1 = await page.locator(".MUS_TTOT").textContent();
check(`y carga la pista: ${tot1}`, secs(tot1) > 0);


                    /***************************
                     *  Act 2: "granted", but nothing reads
                     ***************************/
console.log("2. queryPermission() dice que sí, pero no deja leer");
await page.evaluate(() => sessionStorage.setItem("perm", "liar"));
await page.reload({waitUntil: "networkidle"});
await route(page, "#/player", 600);
await page.waitForTimeout(2500);
/*  The deck reads its track as soon as it is restored, so the refusal
    usually puts the folder on the bar before anything is pressed. If
    it has not, play is what reads it. */
const at_restore = await bar_of(page).count() > 0;
if(!at_restore) {
    await page.click(".MUS_TPLAY");
    await page.waitForTimeout(2000);
}
await page.screenshot({path: `${OUT}/permhang-liar.png`, fullPage: true});
check(`al no poder leer, sale la barra (${at_restore ? "al restaurar la pista" : "al pulsar play"})`,
      await bar_of(page).count() > 0);

if(await bar_of(page).count()) {
    await bar_of(page).locator(".MUS_QBTN").click();
    await page.waitForTimeout(2500);
}
const tot2 = await page.locator(".MUS_TTOT").textContent();
check(`autorizar la carga: ${tot2}`, secs(tot2) > 0);

const bad = report(page);
await browser.close();
process.exit((bad || failed) ? 1 : 0);
