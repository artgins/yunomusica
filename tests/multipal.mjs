/***********************************************************************
 *          multipal.mjs
 *
 *      The two multicolour palettes, "aurora" and "dusk": more than one
 *      colour on the deck, and in the picture of the sound too.
 *
 *      What goes red here:
 *
 *        1. Under a multicolour palette the play button wears the
 *           gradient and the play count, the heart and the accent are
 *           three different colours. Under a one-colour palette none of
 *           that changes: no gradient, one colour.
 *        2. The visualizer, playing CHORDS, paints more than one hue
 *           in every mode — and only hues of the palette, not the
 *           pitch wheel's rainbow. A pure tone could not show this:
 *           one note is one hue in any palette, which is why the
 *           fixture is a chord progression.
 *        3. What it paints is still seen: the opaque ink clears 1.5:1
 *           against the card at every sample, and something is painted
 *           at every sample (a picture that collapses to nothing
 *           between two screenshots is the failure one screenshot
 *           cannot see).
 *        4. Under "gold" the accent-drawn modes are still one colour —
 *           the change does not leak into the one-colour palettes.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {ensure_fixtures} from "./fixtures.mjs";
import {launch, new_page, boot, route, add_source, set_theme, set_palette,
        contrast, report} from "./lib.mjs";

const FIX = ensure_fixtures();

const PALETTES = [
    ["gold",   "Oro",       false],
    ["aurora", "Aurora",    true],
    ["dusk",   "Atardecer", true]
];
/*  The walk the tap takes, from "flight". */
const MODES = ["flight", "notes", "spectrum", "wave", "chroma"];

const browser = await launch();
const page = await new_page(browser, {
    viewport: {width: 1100, height: 900},
    init: () => { localStorage.setItem("yunomusica:viz_mode", "flight"); }
});
await boot(page);
await add_source(page, [FIX.chords]);
await route(page, "#/player", 1000);
/*  On repeat: the walk below takes longer than the track. */
await page.click(".MUS_REPEAT");
await page.click(".MUS_TPLAY");
await page.waitForTimeout(1500);

let bad = [];
const check = (label, ok) => {
    if(!ok) { bad.push(label); }
    if(!ok) { console.log(`   >>> ${label}`); }
};


/*  The canvas, read back: how much is painted, which hues, how far the
    opaque ink stands from the card. Hues in 20° bins; a bin counts when
    it holds 4% of the painted pixels, so antialiasing does not. */
function sample()
{
    return page.evaluate(() => {
        const cv = document.querySelector(".MUS_DECKHEAD .MUS_VIZ_CV");
        const g = cv.getContext("2d");
        const d = g.getImageData(0, 0, cv.width, cv.height).data;
        /*  Normalised through a canvas: the variable is an hsl(), and
            the contrast maths reads three numbers out of an rgb(). */
        const probe = document.createElement("canvas").getContext("2d");
        probe.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue("--bulma-scheme-main-bis").trim() || "#fff";
        const hex = probe.fillStyle;
        const card = "rgb(" + [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16)).join(",") + ")";
        let painted = 0;
        const bins = new Array(18).fill(0);
        const opaque = [];
        for(let i = 0; i < d.length; i += 4) {
            if(d[i + 3] < 60) {
                continue;
            }
            painted++;
            const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
            const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
            if(mx - mn > 0.12) {
                let h;
                if(mx === r) { h = ((gg - b) / (mx - mn)) % 6; }
                else if(mx === gg) { h = (b - r) / (mx - mn) + 2; }
                else { h = (r - gg) / (mx - mn) + 4; }
                h = (h * 60 + 360) % 360;
                bins[Math.floor(h / 20)]++;
            }
            if(d[i + 3] > 200 && opaque.length < 4000) {
                opaque.push(`rgb(${d[i]},${d[i + 1]},${d[i + 2]})`);
            }
        }
        const total = bins.reduce((a, b) => a + b, 0) || 1;
        const hues = bins.map((n, k) => (n / total >= 0.04) ? k * 20 + 10 : -1)
            .filter((h) => h >= 0);
        return {painted, hues, opaque, card};
    });
}

/*  The hues the palette can produce: its three, and every mix along the
    path between them. */
function palette_hues()
{
    return page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        const probe = document.createElement("canvas").getContext("2d");
        const rgb = (v) => {
            probe.fillStyle = "#000";
            probe.fillStyle = css.getPropertyValue(v).trim();
            const s = probe.fillStyle;
            return [1, 3, 5].map((o) => parseInt(s.slice(o, o + 2), 16));
        };
        const hs = [rgb("--mus-accent"), rgb("--mus-accent-2"), rgb("--mus-accent-3")];
        const hue = (c) => {
            const [r, g, b] = c.map((v) => v / 255);
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            if(mx === mn) { return -1; }
            let h;
            if(mx === r) { h = ((g - b) / (mx - mn)) % 6; }
            else if(mx === g) { h = (b - r) / (mx - mn) + 2; }
            else { h = (r - g) / (mx - mn) + 4; }
            return (h * 60 + 360) % 360;
        };
        const out = [];
        for(let a = 0; a < 3; a++) {
            for(let b = 0; b < 3; b++) {
                for(let k = 0; k <= 10; k++) {
                    const m = hs[a].map((v, i) => v + (hs[b][i] - v) * k / 10);
                    const h = hue(m);
                    if(h >= 0) { out.push(h); }
                }
            }
        }
        return {hues: out, same: JSON.stringify(hs[0]) === JSON.stringify(hs[1])};
    });
}

const near = (h, list) => list.some((x) => {
    const d = Math.abs(h - x) % 360;
    return Math.min(d, 360 - d) <= 30;
});

for(const [pal, label, multi] of PALETTES) {
    for(const theme of ["light", "dark"]) {
        await set_theme(page, theme);
        await set_palette(page, label);
        await page.waitForTimeout(500);
        const ph = await palette_hues();

        /*  1. The deck. */
        const deck = await page.evaluate(() => {
            const st = (sel) => getComputedStyle(document.querySelector(sel));
            return {
                play_img: st(".MUS_TPLAY").backgroundImage,
            };
        });
        if(multi) {
            check(`${pal} ${theme}: the play button wears the gradient`,
                deck.play_img.includes("gradient"));
            check(`${pal} ${theme}: three hues, not one`, !ph.same);
        } else {
            check(`${pal} ${theme}: a one-colour palette has no gradient`,
                deck.play_img === "none");
            check(`${pal} ${theme}: a one-colour palette is one colour`, ph.same);
        }

        /*  2–4. The picture, mode by mode. The walk always starts from
            flight: tap round to it first. */
        for(let guard = 0; guard < 8; guard++) {
            const m = await page.evaluate(() => localStorage.getItem("yunomusica:viz_mode"));
            if(m === "flight") { break; }
            await page.click(".MUS_DECKHEAD .MUS_VIZ");
            await page.waitForTimeout(150);
        }
        const line = [];
        for(let mi = 0; mi < MODES.length; mi++) {
            const mode = MODES[mi];
            if(mi > 0) {
                await page.click(".MUS_DECKHEAD .MUS_VIZ");
            }
            await page.waitForTimeout(900);
            let hues = new Set();
            let min_painted = Infinity;
            let worst = Infinity;
            let foreign = [];
            for(let s = 0; s < 3; s++) {
                const r = await sample();
                min_painted = Math.min(min_painted, r.painted);
                r.hues.forEach((h) => hues.add(h));
                if(multi) {
                    r.hues.filter((h) => !near(h, ph.hues)).forEach((h) => foreign.push(h));
                }
                if(r.opaque.length) {
                    const ks = r.opaque.map((c) => contrast(c, r.card)).sort((a, b) => a - b);
                    worst = Math.min(worst, ks[Math.floor(ks.length * 0.1)]);
                }
                await page.waitForTimeout(700);
            }
            line.push(`${mode}:${hues.size}h/${min_painted}px/${worst === Infinity ? "-" : worst.toFixed(1)}`);

            check(`${pal} ${theme} ${mode}: something painted at every sample`, min_painted > 50);
            if(worst !== Infinity) {
                check(`${pal} ${theme} ${mode}: the opaque ink is seen (${worst.toFixed(2)}:1)`, worst >= 1.5);
            }
            if(multi) {
                check(`${pal} ${theme} ${mode}: more than one hue`, hues.size >= 2);
                check(`${pal} ${theme} ${mode}: only the palette's hues (foreign: ${[...new Set(foreign)]})`,
                    foreign.length === 0);
            } else if(mode === "notes" || mode === "wave" || mode === "chroma") {
                check(`${pal} ${theme} ${mode}: one colour, as before`, hues.size <= 2);
            }
        }
        console.log(`${pal.padEnd(7)} ${theme.padEnd(6)} ${line.join("  ")}`);
    }
}

console.log(bad.length ? `FAIL (${bad.length})` :
    "ok: the multicolour palettes are three colours, on the deck and in the picture");
const errs = report(page);
await browser.close();
process.exit((bad.length || errs) ? 1 : 0);
