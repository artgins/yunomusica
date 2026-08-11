/***********************************************************************
 *          visualizer.js
 *
 *      Five pictures of the sound, drawn from the sound.
 *
 *      Not a decoration that moves while music happens to be playing:
 *      every pixel below comes from analyser.js, which reads the
 *      samples on their way to the speakers. Pause, and it stops
 *      exactly where it is, because there is nothing left to draw.
 *
 *        flight    the loudest things in the room, moving: an arrow on
 *                  the lead line, the other strong peaks behind it, the
 *                  bass along the floor and a ring on every hit. The
 *                  one that PICKS instead of showing everything.
 *        notes     a ribbon that runs leftwards, one column per frame,
 *                  one row per semitone from C3 up. Brightness is the
 *                  energy in that semitone's band.
 *        spectrum  the same 48 bands as standing bars, with a peak
 *                  that holds and falls.
 *        wave      the waveform itself, triggered on a rising zero
 *                  crossing so it stands still instead of skidding.
 *        chroma    the twelve pitch classes, octaves folded together,
 *                  around the circle of fifths — so what is consonant
 *                  is adjacent and a chord is a shape, not a scatter.
 *        off       nothing, and no animation frame asked for either.
 *
 *      Tapping it moves to the next one; the choice is remembered.
 *
 *      NO GOBJ, ON PURPOSE. The deck builds its banner as plain DOM
 *      and updates it in place; this is one more node in it, with the
 *      same contract as the rest — build once, then start and stop.
 *
 *      THE COLOUR IS NOT CHOSEN HERE — with one deliberate exception.
 *      Four of the five draw in --mus-accent, which is the palette, or
 *      the dominant colour of the record when the palette is "from the
 *      cover": read from the document, never hard-coded, because a
 *      visualizer with a colour of its own would be the one thing on
 *      the deck that does not follow the record. `flight` is the
 *      exception, and it earns it: there the hue IS the pitch, so a
 *      note is always the same colour and a key change moves the whole
 *      picture through the wheel. Colour carrying meaning is worth
 *      more there than colour carrying the palette.
 *
 *      Either way the ink is MEASURED against the card before it is
 *      used — see readable(). An accent taken from a pale cover is
 *      near-white, and a near-white line on a near-white card is a
 *      picture that is drawn perfectly and seen by nobody.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {createElement2} from "@yuneta/gobj-js";
import {t} from "i18next";

import {frame, set_smoothing, SEMITONES} from "./analyser.js";
import {progress, is_playing, previewing, current_track} from "./music_store.js";


/***************************************************************
 *              Constants
 ***************************************************************/
/*  The order the tap walks. "off" is in it so that turning the thing
    off is the same gesture as changing it, and does not need a setting
    on another screen. */
const MODES = ["flight", "notes", "spectrum", "wave", "chroma", "off"];

const MODE_KEY = "yunomusica:viz_mode";

/*  How long the name of the mode stays on screen after a tap. */
const TAG_MS = 1600;

/*  How far the ribbon travels per frame, in CSS pixels. At 60 fps a
    column is 2 px, so a 300 px strip holds about two and a half
    seconds of music — long enough to see a phrase, short enough that
    what is sounding is still at the edge. */
const ROLL_STEP = 2;

/*  How fast the ribbon's ceiling falls back, per frame. It rises
    instantly. At 60 fps this halves in about a second and a half —
    long enough that a fade-out still reads as one, short enough that a
    quiet passage after a loud one does not stay invisible. */
const AGC_FALL = 0.9925;

/*  Below this fraction of that ceiling, nothing is drawn: it is the
    floor of the recording, and drawing the floor is what turned the
    whole ribbon grey. */
const NOTE_FLOOR = 0.34;

/*  How far above its neighbours a semitone has to peak before it counts
    as a note rather than as a bump in the noise. */
const NOTE_PROMINENCE = 0.06;

/*  Bars want a slow hand or they flicker; the ribbon wants none, or
    every column is a smear of the ten before it. */
const SMOOTHING = {
    /*  The arrow wants a steady hand — an unsmoothed lead jitters an
        octave on every stray harmonic — but not so steady that an
        onset arrives late. */
    flight:   0.42,
    notes:    0.25,
    spectrum: 0.78,
    wave:     0.0,
    chroma:   0.72,
    off:      0.7
};


/***************************************************************
 *              flight
 *
 *  The numbers behind the picture described in draw_flight().
 ***************************************************************/
/*  Where a lead line is looked for: G3 up. Below that is
    accompaniment and above it is mostly harmonics of both. */
const LEAD_LO_ROW = 7;

/*  Bass is taken from the spectrum BELOW the semitone rows, which
    start at C3 — everything under here, in hertz. */
const BASS_HZ = 160;

/*  How much of the trail survives each frame. Lower is longer: 0.028
    keeps about three seconds of history, which is a phrase rather than
    a moment, and is what makes the picture read as a flight path
    instead of a smudge at the right edge. */
const TRAIL_FADE = 0.028;

/*  A hit is a jump in broadband energy this many times the running
    average of those jumps. Percussion is a step; a held note is not. */
const ONSET_RATIO = 1.7;
const ONSET_MIN = 0.55;

/*  …and no more than this many at once, however busy the drummer. */
const MAX_BURSTS = 14;

/*  How fast the arrow flies to a new pitch. Per frame. */
const LEAD_CHASE = 0.22;

/*  Circle of fifths, as indices into the twelve pitch classes
    (0 = C). Adjacent entries are a fifth apart, which is what makes a
    chord come out as a compact shape instead of a scatter. */
const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

/*  Below this the wheel has no room to be a wheel and becomes a row of
    twelve lamps instead. Device pixels. */
const WHEEL_MIN_PX = 116;

/*  …and so does a box too wide to be one. A wheel is drawn at
    min(w, h), so on the mini-player's strip it would be a small circle
    marooned in the middle of nine hundred pixels. The deck's box is
    2.5 wide and keeps its wheel; the strip is thirteen and does not. */
const WHEEL_MAX_RATIO = 4;


/***************************************************************
 *  The mode is SHARED, not per instance.
 *
 *  There are two of these on screen — the deck's box and the
 *  layer behind the mini-player — and they are not two settings.
 *  Tapping one moves both, and what is stored is one value.
 ***************************************************************/
let MODE = null;
const mode_listeners = new Set();

function current_mode()
{
    if(MODE === null) {
        MODE = initial_mode();
    }
    return MODE;
}

function set_mode(m)
{
    MODE = m;
    try {
        localStorage.setItem(MODE_KEY, m);
    } catch(e) {
        /*  A browser with storage blocked still gets the change, it
            just does not get it back tomorrow. */
    }
    mode_listeners.forEach(function(fn) {
        try {
            fn();
        } catch(e) {
            console.error("visualizer listener failed", e);
        }
    });
}


/***************************************************************
 *  A colour string the palette gave us, as three numbers.
 *
 *  --mus-accent is a hex in the stylesheet and whatever the
 *  cover sampler produced at run time, so it is not parsed by
 *  hand: a 2d context normalises any colour CSS accepts into
 *  "#rrggbb", which is the one form worth parsing.
 ***************************************************************/
function rgb_of(colour, probe)
{
    try {
        probe.fillStyle = "#000000";
        probe.fillStyle = colour;
        const s = probe.fillStyle;
        if(s.charAt(0) === "#" && s.length === 7) {
            return [
                parseInt(s.slice(1, 3), 16),
                parseInt(s.slice(3, 5), 16),
                parseInt(s.slice(5, 7), 16)
            ];
        }
        const m = s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
        if(m) {
            return [+m[1], +m[2], +m[3]];
        }
    } catch(e) {
        /*  fall through to the default */
    }
    return [201, 162, 39];              /* the gold of the base palette */
}


/***************************************************************
 *  Build one. Returns the node and the three verbs the deck
 *  needs: start, stop, destroy.
 ***************************************************************/
function create_visualizer(opts)
{
    opts = opts || {};
    /*  The deck's is a CONTROL: it is tapped to change the mode and it
        says which one it landed on. The mini-player's is a LAYER — that
        strip already has a gesture, it takes you to the deck, and a
        second one competing for the same 68 pixels would be a trap. So
        that one carries no button role, no label and no glyph. */
    const tap = (opts.tap !== false);

    const $cv  = createElement2(["canvas", {class: "MUS_VIZ_CV", "aria-hidden": "true"}]);
    const $tag = createElement2(["span", {class: "MUS_VIZ_TAG"}, ""]);
    const $off = createElement2(["span", {class: "MUS_VIZ_OFF", "aria-hidden": "true"}, "∿"]);

    const $el = createElement2(
        ["div", tap
            ? {class: "MUS_VIZ", role: "button", tabindex: "0"}
            : {class: "MUS_VIZ " + (opts.cls || ""), "aria-hidden": "true"},
            tap ? [$cv, $off, $tag] : [$cv]]);

    const V = {
        $el:      $el,
        tap:      tap,
        mode:     current_mode(),
        ctx:      null,
        probe:    null,     // the 1x1 context that normalises colours
        w:        0,        // device pixels
        h:        0,
        dpr:      1,
        raf:      0,
        running:  false,
        roll:     null,     // the ribbon's own canvas
        roll_ctx: null,
        roll_debt: 0,       // sub-pixel travel carried between frames
        peaks:    new Float32Array(SEMITONES),
        agc:      0,        // the ribbon's ceiling, chasing the music
        dark:     false,    // which way the colours have to lean
        /*  flight */
        lead:     -1,       // where the arrow is, in rows, fractional
        lead_v:   0,        // …and how sure of itself it is
        lead_dy:  0,        // its climb, for the tilt
        lead_py:  -1,       // where its trail left off, in pixels
        prev:     new Float32Array(SEMITONES),
        flux_avg: 0,
        bursts:   [],
        accent:   [201, 162, 39],
        accent_at: 0,       // frame count when the accent was last read
        frames:   0,
        tag_timer: 0,
        ro:       null,
        on_resize: null,
        on_mode:  null
    };

    try {
        V.ctx = $cv.getContext("2d");
        V.probe = document.createElement("canvas").getContext("2d");
    } catch(e) {
        V.ctx = null;
    }

    if(tap) {
        $el.addEventListener("click", () => cycle(V));
        $el.addEventListener("keydown", function(ev) {
            if(ev.key === "Enter" || ev.key === " " || ev.code === "Space") {
                /*  Space is the app's play/pause, listened for on the
                    document. A focused button must not do both, so this
                    one never reaches it. */
                ev.preventDefault();
                ev.stopPropagation();
                cycle(V);
            }
        });
    }

    /*  Tapped on the deck, changed here too. */
    V.on_mode = function() {
        apply_mode(V, V.tap);
    };
    mode_listeners.add(V.on_mode);

    /*  A canvas has to be told its pixel size; CSS only stretches what
        is there. ResizeObserver catches the wrap to its own line on a
        phone, which no window resize reports. */
    if(window.ResizeObserver) {
        V.ro = new ResizeObserver(() => resize(V));
        V.ro.observe($el);
    } else {
        V.on_resize = () => resize(V);
        window.addEventListener("resize", V.on_resize);
    }

    apply_mode(V, false);

    return {
        $el:     $el,
        start:   () => start(V),
        stop:    () => stop(V),
        sync:    () => sync(V),
        destroy: () => destroy(V),
        mode:    () => V.mode
    };
}

function initial_mode()
{
    let stored = null;
    try {
        stored = localStorage.getItem(MODE_KEY);
    } catch(e) {
        stored = null;
    }
    if(stored && MODES.indexOf(stored) >= 0) {
        return stored;
    }
    /*  "flight" is the one to meet first: it picks what matters out of
        the sound instead of handing over everything and leaving the
        eye to do it. The other four are still one tap away. */
    /*  Somebody who asked for less motion did not ask for a ribbon
        running under the title. They get the control, collapsed, and
        nothing moving until they tap it. */
    if(window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return "off";
    }
    return "flight";
}

/*  Sets the shared mode, which brings every instance along with it —
    this one included, through the listener registered above. */
function cycle(V)
{
    set_mode(MODES[(MODES.indexOf(current_mode()) + 1) % MODES.length]);
}

function apply_mode(V, announce)
{
    V.mode = current_mode();
    const off = (V.mode === "off");
    V.$el.classList.toggle("is-off", off);
    set_smoothing(SMOOTHING[V.mode] === undefined ? 0.7 : SMOOTHING[V.mode]);
    sync(V);

    if(announce) {
        show_tag(V);
    }
    if(off) {
        stop(V);
        clear_all(V);
    } else {
        /*  The ribbon of the mode we just left says nothing about this
            one. */
        if(V.roll_ctx) {
            V.roll_ctx.clearRect(0, 0, V.roll.width, V.roll.height);
        }
        V.peaks.fill(0);
        /*  START it, do not merely nudge it.
         *
         *  `if(V.running) tick(V)` was the bug: coming back from "off"
         *  the loop is stopped by definition, so nothing restarted it
         *  and the box stayed blank — with the mode's name flashing
         *  over it, which is what made it look so broken. It only came
         *  back on the next repaint of the deck, i.e. when the track
         *  changed or playback was paused and resumed.
         *
         *  The tests never saw it because they cycled the modes with
         *  the music PAUSED, where a blank canvas is the right
         *  answer. */
        if(is_playing() || previewing()) {
            start(V);
        }
        if(V.running) {
            tick(V);
        }
    }
}

/*  The name of the mode, in whatever language is on. Also called by
    the deck after a language switch, which is why it is a verb of its
    own and not a line inside cycle(). */
function sync(V)
{
    if(!V.tap) {
        return;                     // a layer says nothing and is not focusable
    }
    const label = t("viz " + V.mode);
    V.$el.setAttribute("aria-label", label);
    V.$el.setAttribute("title", label);
    V.$el.querySelector(".MUS_VIZ_TAG").textContent = label;
}

function show_tag(V)
{
    const $tag = V.$el.querySelector(".MUS_VIZ_TAG");
    if(!$tag) {
        return;
    }
    $tag.classList.add("is-on");
    if(V.tag_timer) {
        clearTimeout(V.tag_timer);
    }
    V.tag_timer = setTimeout(function() {
        $tag.classList.remove("is-on");
        V.tag_timer = 0;
    }, TAG_MS);
}


/***************************************************************
 *              The loop
 ***************************************************************/
function start(V)
{
    if(V.running || V.mode === "off" || !V.ctx) {
        return;
    }
    V.running = true;
    tick(V);
}

function stop(V)
{
    V.running = false;
    if(V.raf) {
        cancelAnimationFrame(V.raf);
        V.raf = 0;
    }
    /*  What is on the canvas stays there. It is the last thing that
        sounded, and freezing it is the truth; wiping it would suggest
        the track ended. */
}

function destroy(V)
{
    stop(V);
    if(V.tag_timer) {
        clearTimeout(V.tag_timer);
        V.tag_timer = 0;
    }
    if(V.ro) {
        V.ro.disconnect();
        V.ro = null;
    }
    if(V.on_resize) {
        window.removeEventListener("resize", V.on_resize);
        V.on_resize = null;
    }
    if(V.on_mode) {
        mode_listeners.delete(V.on_mode);
        V.on_mode = null;
    }
}

function tick(V)
{
    if(!V.running) {
        return;
    }
    V.raf = requestAnimationFrame(() => tick(V));
    draw(V);
}

function resize(V)
{
    if(!V.ctx) {
        return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(V.$el.clientWidth * dpr);
    const h = Math.round(V.$el.clientHeight * dpr);
    if(w === V.w && h === V.h && dpr === V.dpr) {
        return;
    }
    V.w = w;
    V.h = h;
    V.dpr = dpr;
    if(w <= 0 || h <= 0) {
        return;
    }
    const $cv = V.$el.querySelector(".MUS_VIZ_CV");
    $cv.width = w;
    $cv.height = h;

    /*  The ribbon lives on its own canvas because it is CUMULATIVE:
        each frame is the previous one shifted, and a canvas that the
        browser resized has been cleared. */
    if(!V.roll) {
        V.roll = document.createElement("canvas");
        V.roll_ctx = V.roll.getContext("2d");
    }
    V.roll.width = w;
    V.roll.height = h;
    V.roll_debt = 0;
}

function clear_all(V)
{
    if(V.ctx && V.w > 0) {
        V.ctx.clearRect(0, 0, V.w, V.h);
    }
}

/***************************************************************
 *  Ink that can be seen on the ground it is drawn on.
 *
 *  The picture is painted in --mus-accent, and under the default
 *  palette that accent is TAKEN FROM THE COVER. The lift applied
 *  there puts the brightest channel at 235, which is right for a
 *  button with its own dark ink on top and wrong for a line
 *  drawn straight onto a near-white card: a record whose artwork
 *  is pale or nearly grey produces a pale accent, and a pale
 *  accent on a light card is a picture nobody can see. Nothing
 *  is broken in that case and nothing says so — it just looks
 *  like the visualizer is dead.
 *
 *  Elsewhere the app measures contrast in a test rather than
 *  judging it by eye. Here it cannot: the colour is not known
 *  until a record is playing. So it is measured at run time and
 *  pushed away from the ground until it clears.
 ***************************************************************/
const MIN_RATIO = 2.2;

function srgb_lum(c)
{
    const f = function(v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

function ratio_of(a, b)
{
    const la = srgb_lum(a);
    const lb = srgb_lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function readable(c, ground)
{
    /*  Towards white on a dark ground, towards black on a light one —
        keeping the hue, which is the whole point of taking it from the
        cover in the first place. */
    const up = srgb_lum(ground) < 0.5;
    let out = c;
    for(let i = 0; i < 16 && ratio_of(out, ground) < MIN_RATIO; i++) {
        out = up
            ? [Math.round(out[0] + (255 - out[0]) * 0.16),
               Math.round(out[1] + (255 - out[1]) * 0.16),
               Math.round(out[2] + (255 - out[2]) * 0.16)]
            : [Math.round(out[0] * 0.84),
               Math.round(out[1] * 0.84),
               Math.round(out[2] * 0.84)];
    }
    return out;
}

/*  The accent is re-read a few times a second, not every frame: it
    changes when the palette changes or when a record with another
    dominant colour comes on, and getComputedStyle is a style read. */
function accent_of(V)
{
    if(V.frames - V.accent_at < 20 && V.accent_at) {
        return V.accent;
    }
    V.accent_at = V.frames || 1;
    const css = getComputedStyle(document.documentElement);
    const c = css.getPropertyValue("--mus-accent").trim();
    if(c) {
        /*  The card the box sits on, or the page under the strip. */
        let bg = css.getPropertyValue("--bulma-scheme-main-bis").trim();
        if(!bg) {
            bg = getComputedStyle(document.body).backgroundColor;
        }
        const ground = rgb_of(bg || "#ffffff", V.probe);
        V.dark = srgb_lum(ground) < 0.5;
        V.accent = readable(rgb_of(c, V.probe), ground);
    }
    return V.accent;
}

function rgba(c, a)
{
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
}


/***************************************************************
 *              The drawing
 ***************************************************************/
function draw(V)
{
    if(!V.ctx || V.w <= 0 || V.h <= 0) {
        return;
    }
    const f = frame();
    V.frames++;
    const c = accent_of(V);
    if(!f) {
        /*  No tap yet, so no data — and a blank box is the worst way to
            say so: it is indistinguishable from a broken one. A flat
            line is what "no signal" looks like on anything else that
            draws sound, and it goes away by itself the moment the tap
            lands. */
        draw_flatline(V, c);
        return;
    }

    if(V.mode === "flight") {
        draw_flight(V, f, c);
    } else if(V.mode === "notes") {
        draw_notes(V, f, c);
    } else if(V.mode === "spectrum") {
        draw_spectrum(V, f, c);
    } else if(V.mode === "wave") {
        draw_wave(V, f, c);
    } else if(V.mode === "chroma") {
        draw_chroma(V, f, c);
    }
}


/***************************************************************
 *  flight — the loudest thing in the room, flying.
 *
 *  The other four modes draw everything that is there and let
 *  the eye do the picking. This one picks first: a lead line,
 *  the handful of other peaks worth naming, the bass, and the
 *  hits — and draws those, in colour, moving.
 *
 *    · The ARROW is the lead: the strongest peak from G3 up,
 *      chased rather than jumped to, tilted by its own climb.
 *    · The DOTS behind it are the other strong peaks, each in
 *      the colour of its pitch class.
 *    · The BAND along the bottom is the bass, taken from below
 *      the semitone rows where the rows cannot reach.
 *    · The RINGS are hits: a step in broadband energy well
 *      above the running average of such steps.
 *
 *  Everything drifts left and fades, so what is on screen is
 *  the last second or so of music with the present at the right
 *  edge — the arrow always at the front, everything else
 *  trailing behind it.
 *
 *  WHAT IT IS NOT. There is no source separation here and none
 *  is claimed. "The lead" is the strongest peak in the range a
 *  melody usually occupies, which most of the time IS the voice
 *  or the lead instrument and sometimes is a harmonic of the
 *  bass. "A hit" is a broadband transient, not a drum: a piano
 *  chord struck hard is one too. It is an honest picture of the
 *  loudest things in the sound, not a transcription of the band.
 *
 *  THE COLOUR IS THE PITCH. Hue comes from the pitch class, so
 *  a note is always the same colour and a key change moves the
 *  whole picture through the wheel. This is the one thing in
 *  the app that does not take its colour from the palette,
 *  which is a deliberate exception and the point of the mode.
 ***************************************************************/
function pitch_colour(pc, v, dark, a)
{
    const h = (pc * 30 + 20) % 360;
    /*  Light card: darker ink. Dark card: brighter. The same problem
        the accent has, answered the same way. */
    const l = dark ? (48 + 24 * v) : (30 + 14 * v);
    return "hsla(" + h + "," + (dark ? 82 : 88) + "%," + l + "%," + a + ")";
}

function draw_flight(V, f, c)
{
    const rc = V.roll_ctx;
    const n = f.notes;
    const rows = n.length;

    V.roll_debt += ROLL_STEP * V.dpr;
    const step = Math.floor(V.roll_debt);
    V.roll_debt -= step;

    /*  Drift, then fade. The fade is `destination-out`, which eats
        alpha instead of laying paint down, so the card keeps showing
        through and the trail thins out rather than going grey. */
    if(step > 0) {
        rc.globalCompositeOperation = "copy";
        rc.drawImage(V.roll, -step, 0);
        rc.globalCompositeOperation = "destination-out";
        rc.fillStyle = "rgba(0,0,0," + TRAIL_FADE + ")";
        rc.fillRect(0, 0, V.w, V.h);
        rc.globalCompositeOperation = "source-over";
    }

    /*  A ceiling that follows the music, as the ribbon has. */
    let top = 0;
    for(let i = 0; i < rows; i++) {
        if(n[i] > top) {
            top = n[i];
        }
    }
    V.agc = Math.max(top, (V.agc || 0) * AGC_FALL);
    const ceiling = Math.max(0.05, V.agc);

    /*  The hits: how much broadband energy STEPPED UP since the last
        frame. A held note contributes nothing to this, however loud —
        which is exactly the difference between a note and a hit. */
    let flux = 0;
    for(let i = 0; i < rows; i++) {
        const d = n[i] - V.prev[i];
        if(d > 0) {
            flux += d;
        }
        V.prev[i] = n[i];
    }
    const hit = (flux > ONSET_MIN && flux > V.flux_avg * ONSET_RATIO);
    V.flux_avg = V.flux_avg * 0.92 + flux * 0.08;

    /*  The bass, straight from the spectrum: the rows start at C3 and
        the bottom of a mix does not. */
    const per_bin = f.rate / (f.freq.length * 2);
    const bass_top = Math.min(f.freq.length - 1, Math.round(BASS_HZ / per_bin));
    let bass = 0;
    for(let b = 1; b <= bass_top; b++) {
        if(f.freq[b] > bass) {
            bass = f.freq[b];
        }
    }
    bass /= 255;

    /*  The peaks worth naming, strongest first. */
    const ridges = [];
    for(let i = 0; i < rows; i++) {
        const v = n[i];
        const lo = i > 0 ? n[i - 1] : 0;
        const hi = i < rows - 1 ? n[i + 1] : 0;
        if(v < lo || v < hi) {
            continue;
        }
        const near = lo > hi ? lo : hi;
        if(v - near < v * NOTE_PROMINENCE) {
            continue;
        }
        const r = (v / ceiling - NOTE_FLOOR) / (1 - NOTE_FLOOR);
        if(r > 0) {
            ridges.push({i: i, r: r});
        }
    }
    ridges.sort((a, b) => b.r - a.r);

    /*  The lead is the strongest of them that is high enough up to be
        a tune rather than an accompaniment. */
    let lead = null;
    for(const g of ridges) {
        if(g.i >= LEAD_LO_ROW) {
            lead = g;
            break;
        }
    }

    const dark = V.dark;
    const rh = V.h / rows;
    const y_of = (row) => V.h - (row + 0.5) * rh;
    const x = V.w - step;

    if(step > 0) {
        /*  The bass: a band along the floor, warm, wide and behind
            everything else. */
        if(bass > 0.06) {
            const bh = Math.max(1, bass * V.h * 0.38);
            const grad = rc.createLinearGradient(0, V.h, 0, V.h - bh);
            grad.addColorStop(0, "hsla(8,88%," + (dark ? 58 : 40) + "%," +
                (0.22 + 0.62 * bass).toFixed(3) + ")");
            grad.addColorStop(1, "hsla(28,90%," + (dark ? 62 : 46) + "%,0)");
            rc.fillStyle = grad;
            rc.fillRect(x, V.h - bh, step, bh);
        }

        /*  The others, behind: soft, smaller, and only the few that
            earned it. Drawing all of them is the fog this mode exists
            to get away from. */
        for(let k = 0; k < ridges.length && k < 5; k++) {
            const g = ridges[k];
            if(lead && g.i === lead.i) {
                continue;
            }
            const y = y_of(g.i);
            const rad = Math.max(1, (1.2 + 3.4 * g.r) * V.dpr);
            rc.fillStyle = pitch_colour(g.i % 12, g.r, dark,
                (0.30 + 0.60 * g.r).toFixed(3));
            rc.beginPath();
            rc.arc(x, y, rad, 0, Math.PI * 2);
            rc.fill();
        }

        /*  The lead's own trail: a LINE from where it was to where it
            is, not a dot at where it is. Dots leave gaps the moment the
            tune jumps an interval, and the jump is the part worth
            seeing — joining them is what turns a row of marks into a
            flight path. */
        if(lead) {
            const y = y_of(lead.i);
            const py = (V.lead_py >= 0) ? V.lead_py : y;
            rc.strokeStyle = pitch_colour(lead.i % 12, lead.r, dark,
                (0.55 + 0.45 * lead.r).toFixed(3));
            rc.lineWidth = Math.max(1.5, (1.6 + 2.6 * lead.r) * V.dpr);
            rc.lineCap = "round";
            rc.beginPath();
            rc.moveTo(x - step, py);
            rc.lineTo(x, y);
            rc.stroke();
            V.lead_py = y;
        } else {
            V.lead_py = -1;
        }

        /*  A hit leaves a mark in the history as well as throwing a
            ring, or the past would show no rhythm at all. */
        if(hit) {
            rc.fillStyle = dark ? "rgba(255,246,230,0.55)" : "rgba(40,20,0,0.42)";
            rc.fillRect(x, V.h * 0.62, step, V.h * 0.38);
        }
    }

    /*  Where the arrow is going, chased rather than jumped to. */
    if(lead) {
        const target = lead.i;
        if(V.lead < 0) {
            V.lead = target;
        }
        const next = V.lead + (target - V.lead) * LEAD_CHASE;
        V.lead_dy = next - V.lead;
        V.lead = next;
        V.lead_v = Math.min(1, V.lead_v * 0.7 + lead.r * 0.5);
    } else {
        V.lead_v *= 0.90;               // nothing to follow: it fades out
    }

    if(hit && V.bursts.length < MAX_BURSTS) {
        /*  Low and broad for a hit with bass under it, up at the lead
            for one without: a kick and a snare do not land in the same
            place. */
        V.bursts.push({
            x: V.w - step,
            y: bass > 0.4 ? V.h * 0.80 : V.h * 0.55,
            r: 2 * V.dpr,
            life: 1,
            hue: bass > 0.4 ? 10 : 45
        });
    }

    const g = V.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, V.w, V.h);
    g.drawImage(V.roll, 0, 0);

    /*  The rings: drawn live rather than stamped, because an explosion
        that has been baked into the trail cannot go on expanding. */
    for(let k = V.bursts.length - 1; k >= 0; k--) {
        const b = V.bursts[k];
        b.life -= 0.045;
        b.r += (2.6 + 26 * b.life) * V.dpr * 0.16;
        b.x -= step;
        if(b.life <= 0 || b.x + b.r < 0) {
            V.bursts.splice(k, 1);
            continue;
        }
        g.strokeStyle = "hsla(" + b.hue + ",95%," + (dark ? 66 : 44) + "%," +
            (b.life * b.life * 0.95).toFixed(3) + ")";
        g.lineWidth = Math.max(1.2, 3.4 * b.life * V.dpr);
        g.beginPath();
        g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        g.stroke();
    }

    /*  And the arrow itself, at the leading edge, tilted by its climb. */
    if(V.lead >= 0 && V.lead_v > 0.03) {
        const y = y_of(V.lead);
        const ax = V.w - 12 * V.dpr;
        const tilt = Math.max(-1, Math.min(1, -V.lead_dy * 0.55));
        const size = (5 + 4 * V.lead_v) * V.dpr;
        const pc = Math.round(V.lead) % 12;

        g.save();
        g.translate(ax, y);
        g.rotate(tilt);
        g.beginPath();
        g.moveTo(size * 1.5, 0);
        g.lineTo(-size, -size * 0.85);
        g.lineTo(-size * 0.35, 0);
        g.lineTo(-size, size * 0.85);
        g.closePath();
        g.fillStyle = pitch_colour(pc < 0 ? 0 : pc, 1, dark,
            Math.min(1, V.lead_v + 0.25).toFixed(3));
        g.fill();
        g.restore();
    }
}


function draw_flatline(V, c)
{
    const g = V.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, V.w, V.h);
    g.fillStyle = rgba(c, 0.3);
    g.fillRect(0, Math.round(V.h / 2), V.w, Math.max(1, V.dpr));
}


/***************************************************************
 *  notes — the ribbon.
 *
 *  One new column at the leading edge per frame, everything
 *  before it shifted along. The shift is done with the canvas
 *  drawn onto itself under "copy": under the default composite
 *  the transparent part of the source would leave the old
 *  pixels showing through and the ribbon would never clear.
 ***************************************************************/
function draw_notes(V, f, c)
{
    const rc = V.roll_ctx;
    const step_px = ROLL_STEP * V.dpr;

    /*  Whole pixels only — a fractional blit resamples the whole
        ribbon every frame and turns it to mush in a second. The
        remainder is carried. */
    V.roll_debt += step_px;
    const step = Math.floor(V.roll_debt);
    V.roll_debt -= step;

    const rows = f.notes.length;
    const rh = V.h / rows;

    if(step > 0) {
        rc.globalCompositeOperation = "copy";
        rc.drawImage(V.roll, -step, 0);
        rc.globalCompositeOperation = "source-over";

        const n = f.notes;
        const x = V.w - step;

        /*  A ceiling that follows the music instead of the format.
         *
         *  Painting against a fixed scale is what made this a pale
         *  wash: quiet passages never reached the top of it and loud
         *  ones pinned every row at once. This rises instantly and
         *  falls slowly, so the picture is drawn against what is
         *  sounding NOW — and a fade-out still reads as a fade-out,
         *  because the ceiling takes a couple of seconds to follow it
         *  down. */
        let top = 0;
        for(let i = 0; i < rows; i++) {
            if(n[i] > top) {
                top = n[i];
            }
        }
        V.agc = Math.max(top, (V.agc || 0) * AGC_FALL);
        const ceiling = Math.max(0.05, V.agc);

        for(let i = 0; i < rows; i++) {
            const v = n[i];

            /*  RIDGES, not blobs.
             *
             *  A semitone is drawn only where the spectrum PEAKS on
             *  it: louder than the semitone below and the one above.
             *  Music lights every band to some degree — harmonics,
             *  broadband noise, the skirts of every note — so drawing
             *  all of them draws a fog with the notes buried in it.
             *  The peaks are where the notes and their harmonics
             *  actually are, and this is still a true statement about
             *  the spectrum: it says "the energy has a maximum here",
             *  which it does. */
            const lo = i > 0 ? n[i - 1] : 0;
            const hi = i < rows - 1 ? n[i + 1] : 0;
            const near = lo > hi ? lo : hi;
            if(v < lo || v < hi) {
                continue;
            }
            /*  …and it has to STAND OUT, not merely tie. Broadband
                noise is bumpy, so it produces ridges too — shallow
                ones, a hair above their neighbours. A real note falls
                away sharply on both sides. Asking for a little
                prominence is what separates the two, and it is what
                cleared the speckle along the bottom, where a recording's
                floor lives. */
            if(v - near < v * NOTE_PROMINENCE) {
                continue;
            }
            /*  …and then only the part of the range worth seeing. Under
                a third of the ceiling is the floor of the recording,
                and drawing the floor is what made everything grey. */
            const r = (v / ceiling - NOTE_FLOOR) / (1 - NOTE_FLOOR);
            if(r <= 0) {
                continue;
            }
            /*  A ridge that survived both tests is a note, so it is
                drawn as one — clearly. The old ramp started at almost
                nothing, which is why half of what was on screen was
                barely there. */
            const a = Math.min(1, r * r * 0.75 + 0.25);

            /*  WHOLE PIXELS. 48 rows over 118 device pixels is 2.46
                each, so every rect used to land on a fraction and get
                antialiased into its neighbours — which is precisely
                what "blurry" was. Rounding both edges makes each row
                an exact band of pixels with a hard edge. */
            const y0 = Math.round(V.h - (i + 1) * rh);
            const y1 = Math.round(V.h - i * rh);
            rc.fillStyle = rgba(c, a);
            rc.fillRect(x, y0, step, Math.max(1, y1 - y0));
        }
    }

    const g = V.ctx;
    g.clearRect(0, 0, V.w, V.h);
    g.drawImage(V.roll, 0, 0);

    /*  A hairline at every C, so a row can be read as a pitch rather
        than as a height. */
    g.fillStyle = rgba(c, 0.16);
    for(let i = 0; i < rows; i += 12) {
        g.fillRect(0, Math.round(V.h - i * rh) - 1, V.w, 1);
    }
}


/***************************************************************
 *  spectrum — the same 48 bands, standing, with a peak that
 *  holds and falls. The peak is what makes a transient
 *  readable: without it the eye never catches the top.
 ***************************************************************/
function draw_spectrum(V, f, c)
{
    const g = V.ctx;
    g.clearRect(0, 0, V.w, V.h);

    const n = f.notes.length;
    const slot = V.w / n;
    const bw = Math.max(1, slot - Math.max(1, V.dpr));

    const grad = g.createLinearGradient(0, V.h, 0, 0);
    grad.addColorStop(0, rgba(c, 0.95));
    grad.addColorStop(1, rgba(c, 0.35));
    g.fillStyle = grad;

    for(let i = 0; i < n; i++) {
        const v = f.notes[i];
        const h = Math.max(v > 0.02 ? 1 : 0, v * V.h);
        if(h > 0) {
            g.fillRect(i * slot, V.h - h, bw, h);
        }
        /*  Falls at a constant rate rather than a proportional one, so
            the descent reads as a speed and not as a curve. */
        V.peaks[i] = Math.max(v, V.peaks[i] - 0.011);
    }

    g.fillStyle = rgba(c, 0.75);
    for(let i = 0; i < n; i++) {
        const p = V.peaks[i];
        if(p > 0.03) {
            const y = Math.max(0, V.h - p * V.h - V.dpr);
            g.fillRect(i * slot, y, bw, Math.max(1, V.dpr));
        }
    }

    /*  An octave mark every twelve bands: the same reading aid the
        ribbon gets from its hairlines. */
    g.fillStyle = rgba(c, 0.18);
    for(let i = 12; i < n; i += 12) {
        g.fillRect(Math.round(i * slot) - 1, V.h * 0.72, 1, V.h * 0.28);
    }
}


/***************************************************************
 *  wave — the waveform, triggered.
 *
 *  Drawing the buffer from index 0 shows a wave that skids
 *  sideways, because the frame boundary falls wherever it
 *  falls. Starting at the first rising zero crossing instead
 *  pins the picture: this is what an oscilloscope's trigger is
 *  for, and it costs one pass over the buffer.
 ***************************************************************/
function draw_wave(V, f, c)
{
    const g = V.ctx;
    g.clearRect(0, 0, V.w, V.h);

    const w = f.wave;
    const span = Math.min(w.length, 2048);
    let start = 0;
    const limit = w.length - span;
    for(let i = 1; i < limit; i++) {
        if(w[i - 1] < 128 && w[i] >= 128) {
            start = i;
            break;
        }
    }

    const mid = V.h / 2;
    g.strokeStyle = rgba(c, 0.22);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, Math.round(mid) + 0.5);
    g.lineTo(V.w, Math.round(mid) + 0.5);
    g.stroke();

    /*  Two passes: a wide soft one under a thin bright one. A glow
        that is drawn rather than shadow-blurred, because shadowBlur on
        a stroke this long costs more than a second pass. */
    const points = Math.min(V.w, span);
    const draw_line = function(width, alpha) {
        g.strokeStyle = rgba(c, alpha);
        g.lineWidth = width;
        g.lineJoin = "round";
        g.lineCap = "round";
        g.beginPath();
        for(let p = 0; p < points; p++) {
            const s = w[start + Math.floor(p / points * span)];
            const x = p / (points - 1) * V.w;
            const y = mid - ((s - 128) / 128) * (V.h * 0.44);
            if(p === 0) {
                g.moveTo(x, y);
            } else {
                g.lineTo(x, y);
            }
        }
        g.stroke();
    };
    draw_line(Math.max(3, 5 * V.dpr), 0.18);
    draw_line(Math.max(1.5, 2 * V.dpr), 0.95);
}


/***************************************************************
 *  chroma — the twelve pitch classes, octaves folded together.
 *
 *  Around the circle of fifths, not chromatically: consonant
 *  intervals end up adjacent, so a chord is a compact shape and
 *  a key change is that shape rotating. The polygon is the
 *  reading; the lamps are there to say which note is which.
 *
 *  A strip too short to hold a wheel gets a row of twelve lamps
 *  in the same order instead — the same data, laid flat.
 ***************************************************************/
function draw_chroma(V, f, c)
{
    const g = V.ctx;
    g.clearRect(0, 0, V.w, V.h);

    if(V.h < WHEEL_MIN_PX || V.w < WHEEL_MIN_PX || V.w > V.h * WHEEL_MAX_RATIO) {
        draw_chroma_row(V, f, c);
        return;
    }

    const cx = V.w / 2;
    const cy = V.h / 2;
    const R = Math.min(V.w, V.h) / 2 - 6 * V.dpr;
    const label = (R > 34 * V.dpr);
    const ring = label ? R * 0.80 : R;

    /*  The guide ring, so an empty wheel is still a wheel. */
    g.strokeStyle = rgba(c, 0.14);
    g.lineWidth = Math.max(1, V.dpr);
    g.beginPath();
    g.arc(cx, cy, ring, 0, Math.PI * 2);
    g.stroke();

    /*  The shape: a vertex per pitch class, at a radius its energy
        chose. */
    g.beginPath();
    for(let k = 0; k < 12; k++) {
        const v = f.chroma[FIFTHS[k]];
        const ang = -Math.PI / 2 + k * (Math.PI / 6);
        const r = ring * (0.14 + 0.86 * v);
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r;
        if(k === 0) {
            g.moveTo(x, y);
        } else {
            g.lineTo(x, y);
        }
    }
    g.closePath();
    g.fillStyle = rgba(c, 0.22);
    g.fill();
    g.strokeStyle = rgba(c, 0.7);
    g.lineWidth = Math.max(1.2, 1.6 * V.dpr);
    g.stroke();

    /*  The lamps, and their letters when there is room for them. */
    if(label) {
        g.font = Math.round(9 * V.dpr) + "px system-ui, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
    }
    for(let k = 0; k < 12; k++) {
        const pc = FIFTHS[k];
        const v = f.chroma[pc];
        const ang = -Math.PI / 2 + k * (Math.PI / 6);
        const x = cx + Math.cos(ang) * ring;
        const y = cy + Math.sin(ang) * ring;
        g.beginPath();
        g.arc(x, y, (1.2 + 2.6 * v) * V.dpr, 0, Math.PI * 2);
        g.fillStyle = rgba(c, 0.28 + 0.72 * v);
        g.fill();
        if(label) {
            g.fillStyle = rgba(c, 0.35 + 0.65 * v);
            g.fillText(NOTE_NAMES[pc],
                cx + Math.cos(ang) * R * 1.06,
                cy + Math.sin(ang) * R * 1.06);
        }
    }
}

function draw_chroma_row(V, f, c)
{
    const g = V.ctx;
    const slot = V.w / 12;
    const cy = V.h / 2;
    const rmax = Math.min(slot, V.h) * 0.42;
    for(let k = 0; k < 12; k++) {
        const v = f.chroma[FIFTHS[k]];
        const x = slot * (k + 0.5);
        g.beginPath();
        g.arc(x, cy, Math.max(1, rmax * (0.18 + 0.82 * v)), 0, Math.PI * 2);
        g.fillStyle = rgba(c, 0.25 + 0.75 * v);
        g.fill();
    }
}



                    /***************************
                     *      The scrub bar
                     ***************************/




/***************************************************************
 *  A DJ's bar, and honest about what it can know.
 *
 *  What a deck in a booth draws is the whole track, because it
 *  read the whole file before you touched it. This app will not
 *  do that: decoding a five-minute file to draw a picture of it
 *  means tens of megabytes of PCM on a phone, for every track,
 *  before a note is heard — and the whole point of this app is
 *  that it opens what it plays and nothing else.
 *
 *  So it draws WHAT HAS SOUNDED. The loudness of every moment is
 *  taken from the same tap the visualizer reads, twenty-five
 *  times a second, and kept against its position in the track.
 *  The bar fills in behind the playhead as the music goes by;
 *  ahead of it there is a flat line, because ahead of it we have
 *  not listened yet and would be inventing.
 *
 *  Play the track again and it is already drawn: the envelope is
 *  kept per track for as long as it is the one on the deck.
 ***************************************************************/

/*  Buckets across the track. 480 is more than the bar has pixels on
    any phone and less than the memory of anything. */
const WAVE_BUCKETS = 480;

/*  Twenty-five readings a second. `timeupdate` fires four times a
    second, which draws a staircase, not an envelope. */
const WAVE_MS = 40;

/*  A bucket nobody has heard yet. */
const UNHEARD = -1;

function create_seek_wave()
{
    const $cv = createElement2(["canvas", {class: "MUS_SEEKWAVE", "aria-hidden": "true"}]);

    const W = {
        $el:    $cv,
        ctx:    null,
        probe:  null,
        w:      0,
        h:      0,
        dpr:    1,
        levels: new Float32Array(WAVE_BUCKETS).fill(UNHEARD),
        key:    "",
        timer:  0,
        accent: [201, 162, 39],
        accent_at: 0,
        frames: 0,
        ro:     null
    };

    try {
        W.ctx = $cv.getContext("2d");
        W.probe = document.createElement("canvas").getContext("2d");
    } catch(e) {
        W.ctx = null;
    }

    if(window.ResizeObserver) {
        W.ro = new ResizeObserver(() => wave_resize(W));
        W.ro.observe($cv);
    }

    return {
        $el:     $cv,
        start:   () => wave_start(W),
        stop:    () => wave_stop(W),
        paint:   () => wave_paint(W),
        destroy: () => wave_destroy(W)
    };
}

function wave_start(W)
{
    if(W.timer || !W.ctx) {
        return;
    }
    W.timer = setInterval(() => wave_sample(W), WAVE_MS);
    wave_sample(W);
}

function wave_stop(W)
{
    if(W.timer) {
        clearInterval(W.timer);
        W.timer = 0;
    }
}

function wave_destroy(W)
{
    wave_stop(W);
    if(W.ro) {
        W.ro.disconnect();
        W.ro = null;
    }
}

function wave_resize(W)
{
    if(!W.ctx) {
        return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(W.$el.clientWidth * dpr);
    const h = Math.round(W.$el.clientHeight * dpr);
    if(w === W.w && h === W.h && dpr === W.dpr) {
        return;
    }
    W.w = w;
    W.h = h;
    W.dpr = dpr;
    if(w > 0 && h > 0) {
        W.$el.width = w;
        W.$el.height = h;
        wave_paint(W);
    }
}

/*  One reading, filed under where in the track it happened. */
function wave_sample(W)
{
    const track = current_track();
    const key = track ? (track.source_id + "|" + track.path) : "";
    if(key !== W.key) {
        W.key = key;
        W.levels.fill(UNHEARD);
    }

    const p = progress();
    if(is_playing() && p.duration > 0) {
        const f = frame();
        if(f) {
            /*  Peak, not average: what a DJ reads off a waveform is
                where the hits are, and an average buries them. */
            let peak = 0;
            const w = f.wave;
            /*  Every fourth sample. At 8192 samples per read, a
                transient is hundreds of samples wide — nothing that
                matters is between the ones we skip. */
            for(let i = 0; i < w.length; i += 4) {
                const v = Math.abs(w[i] - 128);
                if(v > peak) {
                    peak = v;
                }
            }
            const level = Math.min(1, peak / 128);
            let b = Math.floor(p.fraction * WAVE_BUCKETS);
            if(b < 0) {
                b = 0;
            }
            if(b >= WAVE_BUCKETS) {
                b = WAVE_BUCKETS - 1;
            }
            /*  The loudest reading that landed in this bucket wins.
                Two seconds of track can share a bucket on a long
                piece, and the quiet half must not erase the loud one. */
            if(level > W.levels[b]) {
                W.levels[b] = level;
            }
        }
    }
    wave_paint(W);
}

function wave_paint(W)
{
    const g = W.ctx;
    if(!g || W.w <= 0 || W.h <= 0) {
        return;
    }
    W.frames++;
    const c = accent_of(W);
    const p = progress();
    const played_x = Math.round(p.fraction * W.w);

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W.w, W.h);

    /*  In Arabic the bar runs the other way, and so must everything
        drawn in it. One flip, rather than a sign in every line. */
    if(getComputedStyle(W.$el).direction === "rtl") {
        g.setTransform(-1, 0, 0, 1, W.w, 0);
    }

    const mid = W.h / 2;
    const step = Math.max(1, Math.round(W.dpr));
    const gap = W.dpr >= 2 ? 1 : 0;
    const bw = Math.max(1, step - gap);

    for(let x = 0; x < W.w; x += step) {
        const b = Math.floor(x / W.w * WAVE_BUCKETS);
        const lv = W.levels[b];
        const before = (x < played_x);

        let half;
        let alpha;
        if(lv === UNHEARD) {
            /*  Not heard. Ahead of the playhead that is the normal
                case; behind it, it means the track was seeked over.
                Either way the honest drawing is a flat line. */
            half = Math.max(1, W.h * 0.045);
            alpha = before ? 0.34 : 0.16;
        } else {
            /*  A floor under the height, so a quiet passage is still a
                bar and not a hole. */
            half = Math.max(W.h * 0.05, lv * W.h * 0.46);
            alpha = before ? 0.92 : 0.42;
        }
        g.fillStyle = rgba(c, alpha);
        g.fillRect(x, mid - half, bw, half * 2);
    }

    /*  The playhead. On a bar this tall the boundary between played
        and unplayed is not enough on its own — the eye wants a line. */
    if(p.duration > 0) {
        g.fillStyle = rgba(c, 1);
        g.fillRect(Math.max(0, played_x - Math.round(W.dpr)), 0,
            Math.max(2, 2 * W.dpr), W.h);
    }
}


export {
    create_visualizer,
    create_seek_wave,
    MODES as VIZ_MODES,
};
