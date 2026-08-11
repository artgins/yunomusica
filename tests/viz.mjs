/***********************************************************************
 *          viz.mjs
 *
 *      The banner draws the sound, and it draws the RIGHT sound.
 *
 *      Every other fixture in this suite is silence, because nothing
 *      else cares what the audio contains. This one cannot use them: a
 *      visualizer fed silence draws an empty canvas, and an empty
 *      canvas is also what a broken one draws. So it plays sine waves
 *      at pitches with names — A4 at 440 Hz and C5 at 523.25 Hz — and
 *      reads the canvas back.
 *
 *      What goes red here, and why it matters:
 *
 *        1. The tallest bar is the one belonging to the note that is
 *           sounding. That single assertion covers the whole chain:
 *           the tap on the element, the FFT, the fold onto semitones,
 *           and the drawing. Get any of the four wrong and the peak
 *           lands on another bar.
 *        2. It moves when the note moves. A4 and C5 are three
 *           semitones apart, so a visualizer that draws something
 *           pretty and constant fails here and passes nowhere else.
 *        3. Sound still comes out. This is the one that would hurt:
 *           `createMediaElementSource` re-routes the element for good,
 *           and a suspended context would leave a player whose play
 *           button does nothing. The clock advancing is the proof that
 *           the audio survived being tapped.
 *        4. It stops when the music stops. Paused, the canvas must be
 *           the same two seconds later — an animation frame asked for
 *           over a still image is a battery bill on a phone.
 *        5. The scrub bar has drawn what has sounded, and only that.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {launch, new_page, boot, route, add_source, report, contrast, OUT} from "./lib.mjs";
import {join} from "path";

const FIX = ensure_fixtures();

/*  The rows the ribbon and the bars are made of start at C3 = MIDI 48,
    so a note's row is its MIDI number less that. */
const LOW_MIDI = 48;
const A4_ROW = 69 - LOW_MIDI;       // 21
const C5_ROW = 72 - LOW_MIDI;       // 24

/*  Kept in step with visualizer.js by hand: the test needs to know how
    many taps go all the way round. */
const MODES = ["flight", "notes", "spectrum", "wave", "chroma", "off"];

const browser = await launch();
const bad = [];


/***************************************************************
 *  The height of every bar, read off the canvas.
 *
 *  Sampled down the MIDDLE of each slot, not across it: the
 *  octave marks are drawn on the slot boundaries, and a
 *  boundary column would report one of those as a bar.
 ***************************************************************/
function read_bars()
{
    const $cv = document.querySelector(".MUS_VIZ_CV");
    if(!$cv || !$cv.width) {
        return null;
    }
    const g = $cv.getContext("2d");
    const H = $cv.height;
    const n = 48;
    const slot = $cv.width / n;
    const out = [];
    for(let i = 0; i < n; i++) {
        const x = Math.min($cv.width - 1, Math.floor(slot * (i + 0.5)));
        const col = g.getImageData(x, 0, 1, H).data;
        let top = H;
        for(let y = 0; y < H; y++) {
            if(col[y * 4 + 3] > 8) {
                top = y;
                break;
            }
        }
        out.push((H - top) / H);
    }
    return out;
}

function argmax(a)
{
    let best = 0;
    for(let i = 1; i < a.length; i++) {
        if(a[i] > a[best]) {
            best = i;
        }
    }
    return best;
}

/*  A fingerprint of the canvas, to tell "it stopped" from "it is still
    running". */
function canvas_hash(sel)
{
    const $cv = document.querySelector(sel);
    if(!$cv || !$cv.width) {
        return "";
    }
    const d = $cv.getContext("2d").getImageData(0, 0, $cv.width, $cv.height).data;
    let h = 0;
    for(let i = 0; i < d.length; i += 997) {
        h = (h * 31 + d[i]) | 0;
    }
    return String(h);
}

/*  The envelope in the scrub bar, as the tallest bar found in the
    first tenth of it and in the last tenth. Behind the playhead it has
    been heard and drawn; ahead of it there is only the flat line. */
function read_seekwave()
{
    const $cv = document.querySelector(".MUS_SEEKWAVE");
    if(!$cv || !$cv.width) {
        return null;
    }
    const g = $cv.getContext("2d");
    const H = $cv.height;
    const W = $cv.width;
    const band = function(x0, x1) {
        let tallest = 0;
        for(let x = x0; x < x1; x++) {
            const col = g.getImageData(x, 0, 1, H).data;
            let top = H;
            for(let y = 0; y < H; y++) {
                if(col[y * 4 + 3] > 8) {
                    top = y;
                    break;
                }
            }
            const h = (H - top * 2) / H;    /* the bars are symmetric */
            if(h > tallest) {
                tallest = h;
            }
        }
        return tallest;
    };
    return {
        played:   band(2, Math.floor(W * 0.08)),
        unplayed: band(Math.floor(W * 0.90), W - 2),
        height:   H
    };
}


const page = await new_page(browser, {
    /*  The bars, not the ribbon: a still picture with one bar per
        semitone is the one mode that can be read back as numbers. */
    init: `localStorage.setItem("yunomusica:viz_mode", "spectrum")`
});
await boot(page);
await add_source(page, FIX.tones);
await route(page, "#/player", 1200);

/*  Play the first tone, from the queue — not a preview. */
await page.locator(".MUS_QROW").first().locator(".MUS_IBTN").first().click();
await page.waitForTimeout(2500);

/*  3. The audio survived the tap. If the context had been suspended
    when the element was re-routed, this clock would sit at 0:00 and
    everything below would still pass. */
const t1 = await page.evaluate(() => document.querySelector(".MUS_TCUR").textContent);
await page.waitForTimeout(1500);
const t2 = await page.evaluate(() => document.querySelector(".MUS_TCUR").textContent);
if(t1 === t2 || t2 === "0:00") {
    bad.push(`the music does not advance: the tap silenced it (${t1} → ${t2})`);
}

/*  1. The tallest bar is A4's. */
const a4 = await page.evaluate(read_bars);
if(!a4) {
    bad.push("no hay canvas del visualizador");
} else {
    const peak = argmax(a4);
    if(peak !== A4_ROW) {
        bad.push(`440 Hz is drawn at ${peak}, not at A4 (${A4_ROW})`);
    }
    if(a4[A4_ROW] < 0.4) {
        bad.push(`A4's bar is only ${a4[A4_ROW].toFixed(2)} of the height`);
    }
    /*  Two octaves below what is sounding there must be next to
        nothing: a visualizer wired to noise would fill this too. */
    let low = 0;
    for(let i = 0; i < 10; i++) {
        low = Math.max(low, a4[i]);
    }
    if(low > 0.35) {
        bad.push(`the bass is lit at ${low.toFixed(2)} under a pure 440 Hz tone`);
    }
}

await page.screenshot({path: join(OUT, "viz-spectrum-a4.png")});

/*  8. It is drawn in something you can SEE.
 *
 *  The picture is painted in --mus-accent, and under the default
 *  palette that accent is taken from the cover. This album's artwork is
 *  colourless on purpose, which drives the accent to near-white — and
 *  near-white lines on a near-white card are a picture that is drawn
 *  perfectly and seen by nobody. That failure shows up as a blank box
 *  and as nothing else: no error, no missing frame, the pixel count
 *  unchanged. Only a contrast measurement catches it. */
const ink = await page.evaluate(() => {
    const $cv = document.querySelector(".MUS_VIZ:not(.MUS_VIZ_MINI) .MUS_VIZ_CV");
    const d = $cv.getContext("2d").getImageData(0, 0, $cv.width, $cv.height).data;
    let n = 0;
    const sum = [0, 0, 0];
    for(let i = 0; i < d.length; i += 4) {
        /*  Only what was laid down at close to full strength: a
            half-transparent pixel says nothing about the ink. */
        if(d[i + 3] > 200) {
            sum[0] += d[i];
            sum[1] += d[i + 1];
            sum[2] += d[i + 2];
            n++;
        }
    }
    return {
        n:      n,
        ink:    n ? sum.map((x) => Math.round(x / n)) : null,
        /*  The card's own colour, computed rather than read off the
            custom property: the browser normalises this one to rgb(),
            and a hex is not something lib.mjs's lum() can read. */
        ground: getComputedStyle(document.querySelector(".MUS_DECKCARD")).backgroundColor,
        accent: getComputedStyle(document.documentElement)
                    .getPropertyValue("--mus-accent").trim()
    };
});
if(!ink.n) {
    bad.push("no hay tinta opaca que medir");
} else {
    const r = contrast(`rgb(${ink.ink.join(",")})`, ink.ground);
    console.log(`   tinta ${ink.ink.join(",")} sobre ${ink.ground} = ${r.toFixed(2)}:1` +
                `  (acento ${ink.accent})`);
    if(r < 2) {
        bad.push(`the picture is drawn at ${r.toFixed(2)}:1 against the card: ` +
                 `nobody can see it (accent ${ink.accent})`);
    }
}

/*  5. The scrub bar drew what sounded, and nothing ahead of it. */
const wave = await page.evaluate(read_seekwave);
if(!wave) {
    bad.push("no hay canvas de la barra de scrub");
} else {
    if(wave.played < 0.3) {
        bad.push(`the played envelope is flat (${wave.played.toFixed(2)})`);
    }
    if(wave.unplayed > 0.25) {
        bad.push(`the bar draws what has NOT sounded yet (${wave.unplayed.toFixed(2)})`);
    }
}
const dj_h = await page.evaluate(
    () => document.querySelector(".MUS_SEEK_DJ").getBoundingClientRect().height);
if(dj_h < 34) {
    bad.push(`the scrub bar is ${Math.round(dj_h)}px tall, not a bar you can aim at`);
}

/*  2. It follows the note. C5 is three semitones up from A4. */
await page.click(".MUS_TNEXT");
await page.waitForTimeout(2600);
const c5 = await page.evaluate(read_bars);
if(c5) {
    const peak = argmax(c5);
    if(peak !== C5_ROW) {
        bad.push(`523 Hz is drawn at ${peak}, not at C5 (${C5_ROW})`);
    }
}

/*  6. Round the whole cycle WITH THE MUSIC PLAYING, and back.
 *
 *  This is the shape of a bug that shipped: turning it off stopped the
 *  loop, and turning it back on only nudged a loop that was already
 *  running — which by definition it was not. The box stayed blank for
 *  the rest of the track, with the mode's name flashing over it, and
 *  every test here passed because they all cycled the modes with the
 *  music PAUSED, where a blank canvas is the right answer. */
for(let i = 0; i < MODES.length; i++) {
    await page.click(".MUS_VIZ");
    await page.waitForTimeout(220);
}
await page.waitForTimeout(1000);
/*  Not two hashes compared: a steady tone draws the SAME bars every
    frame, so "it did not change" says nothing. What says everything is
    that the bars are there at all — going off clears the canvas, so a
    loop that never restarted leaves it empty — and that they are still
    C5's, which only live data can put there. */
const alive = await page.evaluate(read_bars);
if(!alive || argmax(alive) !== C5_ROW || alive[C5_ROW] < 0.4) {
    bad.push("after going round through \"off\" it never draws again " +
             `(peak at ${alive ? argmax(alive) : "nothing"})`);
}

/*  9. `flight` brings its own colour.
 *
 *  Four of the five modes draw in the accent; this one draws in the
 *  pitch, which is the whole point of it. With this album's colourless
 *  cover the accent is a grey, so "is there any colour on the canvas at
 *  all" is a real question with a real answer: if the pitch-to-hue
 *  mapping is not wired up, what comes out is grey too. */
for(let i = 0; i < MODES.length; i++) {
    const at = await page.evaluate(() => localStorage.getItem("yunomusica:viz_mode"));
    if(at === "flight") {
        break;
    }
    await page.click(".MUS_VIZ:not(.MUS_VIZ_MINI)");
    await page.waitForTimeout(220);
}
await page.waitForTimeout(1500);
const flight = await page.evaluate(() => {
    const $cv = document.querySelector(".MUS_VIZ:not(.MUS_VIZ_MINI) .MUS_VIZ_CV");
    const d = $cv.getContext("2d").getImageData(0, 0, $cv.width, $cv.height).data;
    let painted = 0;
    let coloured = 0;
    for(let i = 0; i < d.length; i += 4) {
        if(d[i + 3] < 40) {
            continue;
        }
        painted++;
        /*  Saturation, the cheap way: how far apart the channels are. */
        const mx = Math.max(d[i], d[i + 1], d[i + 2]);
        const mn = Math.min(d[i], d[i + 1], d[i + 2]);
        if(mx && (mx - mn) / mx > 0.25) {
            coloured++;
        }
    }
    return {
        mode:     localStorage.getItem("yunomusica:viz_mode"),
        painted:  painted,
        coloured: painted ? +(coloured / painted).toFixed(2) : 0
    };
});
if(flight.mode !== "flight") {
    bad.push(`el ciclo no llega a "flight" (${flight.mode})`);
} else if(!flight.painted) {
    bad.push("flight draws nothing at all");
} else if(flight.coloured < 0.5) {
    console.log(`   flight: ${flight.painted} px, ${flight.coloured * 100}% con color`);
    bad.push(`flight is drawing in grey (${flight.coloured * 100}% of its pixels ` +
             `carry any hue): the pitch is not reaching the colour`);
}
await page.screenshot({path: join(OUT, "viz-flight.png")});

/*  7. The mini-player carries the same picture. It only exists off the
    deck, so this has to leave first. */
await route(page, "#/library", 1200);
await page.waitForTimeout(1500);
const mini = await page.evaluate(() => {
    const $cv = document.querySelector(".MUS_VIZ_MINI .MUS_VIZ_CV");
    if(!$cv || !$cv.width) {
        return null;
    }
    const d = $cv.getContext("2d").getImageData(0, 0, $cv.width, $cv.height).data;
    let painted = 0;
    for(let i = 3; i < d.length; i += 4 * 37) {
        if(d[i] > 8) {
            painted++;
        }
    }
    return {
        painted: painted,
        strip:   !!document.querySelector(".MUS_PLAYER.is-on"),
        /*  It is a layer, not a control: nothing here may take a tap
            away from the strip, whose job is to go to the deck. */
        role:    document.querySelector(".MUS_VIZ_MINI").getAttribute("role")
    };
});
if(!mini) {
    bad.push("el mini-reproductor no tiene visualizador");
} else {
    if(!mini.strip) {
        bad.push("la tira no está visible: la prueba no dice nada");
    } else if(mini.painted < 4) {
        bad.push(`the mini-player's layer drew ${mini.painted} pixels`);
    }
    if(mini.role) {
        bad.push(`the strip's layer claims role="${mini.role}" and steals its tap`);
    }
}
await page.screenshot({path: join(OUT, "viz-mini.png")});
await route(page, "#/player", 1000);

/*  4. Paused, it holds still. */
await page.click(".MUS_TPLAY");
await page.waitForTimeout(600);
const h1 = await page.evaluate(canvas_hash, ".MUS_VIZ_CV");
await page.waitForTimeout(1500);
const h2 = await page.evaluate(canvas_hash, ".MUS_VIZ_CV");
if(h1 !== h2) {
    bad.push("it goes on drawing with the music paused");
}

/*  The tap cycles the modes, and remembers.
 *
 *  Read from wherever the cycle happens to be rather than assuming a
 *  starting point: a mode added to the middle of the list used to make
 *  three assertions down here fail for no reason at all. */
const started = await page.evaluate(() => localStorage.getItem("yunomusica:viz_mode"));
const before = await page.evaluate(
    () => document.querySelector(".MUS_VIZ:not(.MUS_VIZ_MINI)").getAttribute("aria-label"));
await page.click(".MUS_VIZ:not(.MUS_VIZ_MINI)");
await page.waitForTimeout(300);
const after = await page.evaluate(
    () => document.querySelector(".MUS_VIZ:not(.MUS_VIZ_MINI)").getAttribute("aria-label"));
const stored = await page.evaluate(() => localStorage.getItem("yunomusica:viz_mode"));
const expect = MODES[(MODES.indexOf(started) + 1) % MODES.length];
if(before === after) {
    bad.push(`tapping it does not change the mode (${before})`);
}
if(stored !== expect) {
    bad.push(`one tap from "${started}" landed on "${stored}", not "${expect}"`);
}

/*  And it can be turned off, which is what the last stop on the cycle
    is for — however many stops there are before it. */
for(let i = 0; i < MODES.length; i++) {
    const at = await page.evaluate(() => localStorage.getItem("yunomusica:viz_mode"));
    if(at === "off") {
        break;
    }
    await page.click(".MUS_VIZ:not(.MUS_VIZ_MINI)");
    await page.waitForTimeout(220);
}
const off = await page.evaluate(() => ({
    cls:  document.querySelector(".MUS_VIZ:not(.MUS_VIZ_MINI)").className,
    mode: localStorage.getItem("yunomusica:viz_mode"),
    /*  Turned off it must still be tappable, or there is no way back. */
    w:    document.querySelector(".MUS_VIZ:not(.MUS_VIZ_MINI)").getBoundingClientRect().width
}));
if(off.mode !== "off") {
    bad.push(`the cycle does not reach "off" (${off.mode})`);
}
if(off.cls.indexOf("is-off") < 0) {
    bad.push("turned off, it does not say so");
}
if(off.w < 16) {
    bad.push(`turned off it leaves ${Math.round(off.w)}px to tap: no way back`);
}

await page.screenshot({path: join(OUT, "viz-off.png")});

bad.forEach((b) => console.log("  ✗ " + b));
const errs = report(page);
await browser.close();
process.exit(bad.length + errs ? 1 : 0);
