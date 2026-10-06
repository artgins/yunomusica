/***********************************************************************
 *          locked.mjs
 *
 *      With the screen locked, the music is not playing through Web Audio.
 *
 *      The visualizer reads the sound through createMediaElementSource,
 *      and that is a one-way door: once an element is tapped, all of its
 *      sound goes through an AudioContext for as long as the element
 *      lives. With the screen locked nobody draws anything, so that graph
 *      only costs memory and a second audio thread, at the moment when
 *      Android is choosing what to kill.
 *
 *      So when the page goes hidden the app puts the music on a fresh,
 *      untapped element at the same place and suspends the context. When
 *      the page comes back the tap is taken again. This test pins the
 *      three things that must hold:
 *
 *        - hidden: the element that sounds is not tapped, the context
 *          is not running, and the clock went on with no jump back;
 *        - visible again: the tap is back and the music never stopped;
 *        - paused: the swap is silent, nothing starts to play.
 *
 *      Nothing in the app is reachable from here, so the browser is
 *      watched from the outside: every `new Audio()` is recorded, and
 *      every createMediaElementSource marks the element it took.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {launch, new_page, boot, route, add_source, report} from "./lib.mjs";

const FIX = ensure_fixtures();
const browser = await launch();


function spy()
{
    const Real = window.Audio;
    window.__els = [];
    window.Audio = function(src) {
        const a = new Real(src);
        window.__els.push(a);
        return a;
    };
    window.Audio.prototype = Real.prototype;

    window.__ctxs = [];
    const AC = window.AudioContext;
    window.AudioContext = function(o) {
        const c = new AC(o);
        window.__ctxs.push(c);
        return c;
    };
    window.AudioContext.prototype = AC.prototype;
    const make = AC.prototype.createMediaElementSource;
    AC.prototype.createMediaElementSource = function(el) {
        el.__tapped = true;
        return make.call(this, el);
    };

    /*  The lock screen, as the page sees it. */
    window.__set_hidden = function(hidden) {
        Object.defineProperty(document, "visibilityState",
            {configurable: true, get: () => hidden ? "hidden" : "visible"});
        Object.defineProperty(document, "hidden",
            {configurable: true, get: () => hidden});
        document.dispatchEvent(new Event("visibilitychange"));
    };
}

function state()
{
    const sounding = window.__els.filter((a) => a.src && !a.paused);
    const loaded = window.__els.filter((a) => a.src);
    const a = sounding[0] || loaded[0] || null;
    return {
        sounding: sounding.length,
        tapped: !!(a && a.__tapped),
        pos: a ? a.currentTime : -1,
        paused: a ? a.paused : true,
        els: window.__els.length,
        ctx: window.__ctxs.map((c) => c.state).join(",") || "-"
    };
}

const bad = [];
function check(ok, msg)
{
    if(!ok) {
        bad.push(msg);
    }
}
function line(tag, s)
{
    console.log(`${tag.padEnd(22)} suenan=${s.sounding} tapped=${s.tapped} ` +
        `pos=${s.pos.toFixed(2)} ctx=${s.ctx} elementos=${s.els}`);
}


const page = await new_page(browser, {init: spy});
await boot(page);
await add_source(page, FIX.longtracks);
await route(page, "#/player");
await page.click(".MUS_TPLAY");
await page.waitForTimeout(1500);

/*  ---- playing, on screen: tapped ---- */
let s0 = await page.evaluate(state);
line("visible, sonando", s0);
check(s0.sounding === 1, "nothing is playing to start with");
check(s0.tapped, "the visualizer never tapped the music (the test proves nothing)");
check(s0.ctx.includes("running"), "the AudioContext is not running");

/*  ---- the screen locks ---- */
await page.evaluate(() => window.__set_hidden(true));
await page.waitForTimeout(2000);
let s1 = await page.evaluate(state);
line("bloqueada, sonando", s1);
check(s1.sounding === 1, `with the screen locked ${s1.sounding} elements sound, not one`);
check(!s1.tapped, "with the screen locked the music still goes through Web Audio");
check(!s1.ctx.includes("running"), "with the screen locked the AudioContext still runs");
/*  Two seconds went by: the clock must have gone on, not back to
    where the swap started nor to zero. */
check(s1.pos > s0.pos + 1.2, `the clock did not go on (${s0.pos.toFixed(2)} -> ${s1.pos.toFixed(2)})`);

/*  ---- the screen comes back ---- */
await page.evaluate(() => window.__set_hidden(false));
await page.waitForTimeout(1500);
let s2 = await page.evaluate(state);
line("visible otra vez", s2);
check(s2.sounding === 1, "the music stopped when the screen came back");
check(s2.tapped, "the visualizer did not take the music back");
check(s2.ctx.includes("running"), "the AudioContext did not come back");
check(s2.pos > s1.pos + 0.8, `the clock did not go on (${s1.pos.toFixed(2)} -> ${s2.pos.toFixed(2)})`);

/*  ---- paused, then locked: a silent swap ---- */
await page.click(".MUS_TPLAY");
await page.waitForTimeout(500);
let p0 = await page.evaluate(state);
await page.evaluate(() => window.__set_hidden(true));
await page.waitForTimeout(1500);
let p1 = await page.evaluate(state);
line("bloqueada, en pausa", p1);
check(p1.sounding === 0, "a paused deck started to play when the screen locked");
check(!p1.tapped, "a paused deck kept its Web Audio tap with the screen locked");
check(Math.abs(p1.pos - p0.pos) < 0.3, `the paused place moved (${p0.pos.toFixed(2)} -> ${p1.pos.toFixed(2)})`);

/*  …and play from the lock screen: it sounds, untapped. */
await page.click(".MUS_TPLAY");
await page.waitForTimeout(1200);
let p2 = await page.evaluate(state);
line("play con la pantalla bloqueada", p2);
check(p2.sounding === 1, "play with the screen locked does not sound");
check(!p2.tapped, "play with the screen locked tapped the music again");

bad.forEach((m) => console.log("    >>> " + m));
const errs = report(page);
await page.context().close();
await browser.close();

console.log(bad.length
    ? `>>> ${bad.length} problemas con la pantalla bloqueada`
    : "pantalla bloqueada: suena sin Web Audio, y al volver el visualizador recupera la música");
process.exit(bad.length + errs ? 1 : 0);
