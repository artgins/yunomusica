/***********************************************************************
 *          resume.mjs
 *
 *      Coming back to the app must give back the track AS IT WAS.
 *
 *      On a phone it gave back a corpse: the position on the left, 0:00
 *      on the right, and a play button that did nothing — until you
 *      changed track and came back, which loaded it properly.
 *
 *      Two faults, one cause. Android hands the folder back WITHOUT its
 *      read permission, so the deck is restored before any file can be
 *      read: the track resolved to nothing and the player was left
 *      empty, and nothing tried again once the permission arrived. The
 *      position was then written onto that empty element, which does not
 *      seek — it only moves the default start position — so the left
 *      clock showed a position of a track that was not loaded, while the
 *      right one had no duration to show.
 *
 *      Act 1 is the plain case: reload, and the deck must show the real
 *      duration and the position without being touched. Act 2 is the
 *      phone: the folder comes back unauthorised, and authorising it is
 *      what must bring the music back.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {readFileSync} from "fs";
import {join} from "path";

import {ensure_fixtures} from "./fixtures.mjs";
import {BASE, OUT, launch, new_page, boot, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();

const secs = (txt) => {
    let m = String(txt || "").trim().match(/^(\d+):(\d+)$/);
    return m ? (Number(m[1]) * 60 + Number(m[2])) : -1;
};

/*  This one judges itself. The fault it guards is invisible in a
    screenshot — a clock reading 0:00 next to a title looks like an app
    that has not been pressed yet — so the test says which of its
    conditions held, and fails on the ones that did not. */
let failed = 0;
const check = (label, ok) => {
    if(!ok) { failed++; }
    console.log(`   ${ok ? "ok " : ">>>"} ${label}`);
};

const browser = await launch();


                    /***************************
                     *      Act 1: a reload
                     ***************************/

const page = await new_page(browser, {viewport: {width: 1100, height: 950}});

await boot(page);
await add_source(page, FIX.longtracks);

/*  Listen for a few seconds, then leave it paused — which is how the
    app comes back anyway. */
await route(page, "#/player");
await page.click(".MUS_TPLAY");
await page.waitForTimeout(4000);
await page.click(".MUS_TPLAY");
await page.waitForTimeout(400);

const title0 = await page.locator(".MUS_DECKTITLE").textContent();
const cur0 = await page.locator(".MUS_TCUR").textContent();
const tot0 = await page.locator(".MUS_TTOT").textContent();
console.log(`antes: "${title0}"  ${cur0} / ${tot0}`);

/*  The deck is written on a timer; give it its 1.5 s before reloading.

    Then straight back to the deck the reload lands on — no navigating,
    no clicking. A repaint provoked by the test is a repaint the user
    does not do, and any later paint reads the duration off the element
    and hides the fault. */
await page.waitForTimeout(2000);
await page.reload({waitUntil: "networkidle"});
await page.waitForTimeout(2500);
await page.screenshot({path: `${OUT}/resume-restored.png`, fullPage: true});

const title1 = await page.locator(".MUS_DECKTITLE").textContent();
const cur1 = await page.locator(".MUS_TCUR").textContent();
const tot1 = await page.locator(".MUS_TTOT").textContent();
console.log(`1. tras recargar: "${title1}"  ${cur1} / ${tot1}`);
check("la misma canción", title1 === title0);
check("con su duración, sin tocar nada", secs(tot1) > 0 && secs(tot1) === secs(tot0));
check("y por donde iba", Math.abs(secs(cur1) - secs(cur0)) <= 1);

/*  It sounds on the first press: no changing track to wake it up. */
await page.click(".MUS_TPLAY");
await page.waitForTimeout(1500);
const cur2 = await page.locator(".MUS_TCUR").textContent();
console.log(`2. al pulsar play: ${cur1} -> ${cur2}`);
check("suena a la primera", secs(cur2) > secs(cur1));

const bad1 = report(page);
await page.context().close();


                    /***************************
                     *      Act 2: the phone
                     ***************************/

/*  A folder that behaves like Android's: the handle survives, the
    permission does not, and every read through it fails with
    NotAllowedError until it is asked for again. The handle itself is a
    real one — the origin private file system gives out real
    FileSystemDirectoryHandles, which survive IndexedDB exactly like a
    picked folder does. What is faked is only the permission, which is
    the part Chrome will not let a test drive. */
function phone_folder()
{
    const ok = () => sessionStorage.getItem("fsa_granted") === "1";
    const denied = () => {
        let e = new Error("the user did not grant read access");
        e.name = "NotAllowedError";
        return Promise.reject(e);
    };
    const guard = (proto, name) => {
        const real = proto[name];
        proto[name] = function(...args) {
            return ok() ? real.apply(this, args) : denied();
        };
    };
    FileSystemHandle.prototype.queryPermission = async function() {
        return ok() ? "granted" : "prompt";
    };
    FileSystemHandle.prototype.requestPermission = async function() {
        sessionStorage.setItem("fsa_granted", "1");
        return "granted";
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

const phone = await new_page(browser, {
    viewport: {width: 412, height: 915}, mobile: true,
    no_fsa: false, init: phone_folder
});

await phone.goto(BASE, {waitUntil: "networkidle"});
await phone.waitForTimeout(1100);
if(await phone.locator(".MUS_ABOUT_CLOSE").count()) {
    await phone.check(".MUS_ABOUT_DONTSHOW");
    await phone.click(".MUS_ABOUT_CLOSE");
}

/*  Put the music in that folder, with the permission held. */
await phone.evaluate(async (files) => {
    sessionStorage.setItem("fsa_granted", "1");
    let root = await navigator.storage.getDirectory();
    let dir = await root.getDirectoryHandle("Mi música", {create: true});
    for(const [name, b64] of files) {
        let fh = await dir.getFileHandle(name, {create: true});
        let w = await fh.createWritable();
        await w.write(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
        await w.close();
    }
}, MP3);

await route(phone, "#/sources", 600);
await phone.click(".MUS_SECHEAD .MUS_QBTN:nth-child(1)");
await phone.waitForTimeout(3000);
console.log("3. carpeta añadida, pistas:", await phone.locator(".MUS_QROW").count() ||
            await phone.evaluate(() => document.querySelectorAll(".MUS_QROW").length));

await route(phone, "#/player");
await phone.click(".MUS_TPLAY");
await phone.waitForTimeout(4000);
await phone.click(".MUS_TPLAY");
const cur3 = await phone.locator(".MUS_TCUR").textContent();
const tot3 = await phone.locator(".MUS_TTOT").textContent();
console.log(`   escuchando: ${cur3} / ${tot3}`);

/*  Relaunch as Android does it: the folder is still there, the
    permission on it is not. */
await phone.waitForTimeout(2000);
await phone.evaluate(() => sessionStorage.removeItem("fsa_granted"));
await phone.reload({waitUntil: "networkidle"});
await phone.waitForTimeout(2500);
await phone.screenshot({path: `${OUT}/resume-phone-pending.png`, fullPage: true});

const bar = phone.locator(".MUS_AUTHBAR:not(.MUS_UPDBAR):not(.MUS_INSTBAR)");
const cur_pend = await phone.locator(".MUS_TCUR").textContent();
console.log(`4. sin permiso: ${cur_pend} / ${await phone.locator(".MUS_TTOT").textContent()}`);
check("pide autorizar la carpeta", await bar.count() > 0);
/*  Nothing is loaded, so nothing may claim a position, and the file is
    not "unreadable" — it is unauthorised, which the bar already says. */
check("sin posición de una pista que no está cargada", secs(cur_pend) === 0);
check("sin aviso de archivo ilegible", await phone.locator(".MUS_NOTICE").count() === 0);

/*  Authorise: that alone must bring the track back, position and all. */
await bar.locator(".MUS_QBTN").click();
await phone.waitForTimeout(2500);
await phone.screenshot({path: `${OUT}/resume-phone-authorised.png`, fullPage: true});
const cur4 = await phone.locator(".MUS_TCUR").textContent();
const tot4 = await phone.locator(".MUS_TTOT").textContent();
console.log(`5. tras autorizar: ${cur4} / ${tot4}`);
check("autorizar carga la pista con su duración", secs(tot4) > 0 && secs(tot4) === secs(tot3));
check("y la deja por donde iba", Math.abs(secs(cur4) - secs(cur3)) <= 1);

await phone.click(".MUS_TPLAY");
await phone.waitForTimeout(1500);
const cur5 = await phone.locator(".MUS_TCUR").textContent();
console.log(`6. al pulsar play: ${cur4} -> ${cur5}`);
check("suena sin cambiar de canción y volver", secs(cur5) > secs(cur4));

const bad2 = report(phone);
await browser.close();
process.exit((bad1 + bad2 + failed) ? 1 : 0);
