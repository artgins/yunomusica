/***********************************************************************
 *          analyser.js
 *
 *      The tap on what is actually sounding.
 *
 *      One AudioContext, one AnalyserNode per <audio> element, and two
 *      readings of it per frame: the spectrum and the waveform. Nothing
 *      here draws — visualizer.js does that — and nothing here is
 *      guessed: every number handed out comes from the samples the
 *      browser is feeding the speakers right now.
 *
 *      TWO THINGS TO KNOW BEFORE TOUCHING THIS FILE
 *
 *      1. `createMediaElementSource` is a ONE-WAY DOOR. From the moment
 *         it exists, the element no longer reaches the output on its
 *         own: it reaches it through this graph, and there is no way to
 *         put it back. So the node is created only once the context is
 *         known to be RUNNING — a suspended context would route the
 *         music into silence, and the user would have a player whose
 *         play button does nothing. That is why `attach()` resumes
 *         first and taps second, and why it is called from the `play`
 *         listener: inside a gesture, `resume()` is granted.
 *
 *      2. The speakers are connected FIRST, before the analyser, so
 *         that anything throwing afterwards cannot take the sound with
 *         it. Whatever else fails here, the music keeps playing.
 *
 *      The escape hatch, for the day a browser makes this a bad trade:
 *
 *          localStorage["yunomusica:viz"] = "off"
 *
 *      …and then nothing below is ever built.
 *
 *      NOTES, HONESTLY
 *
 *      `notes` is the spectrum folded onto semitones, not a
 *      transcription: it is the energy that fell inside each
 *      semitone's band. A single note lights its own row AND the rows
 *      of its harmonics, which is a true statement about the sound and
 *      NOT a chord. The ribbon starts at C3 (130.8 Hz) because at 8192
 *      bins the FFT resolves 5.4 Hz and a semitone down there is 7.6 Hz
 *      wide — one bin. Below C3 the answer would be shared out between
 *      neighbours, so it is not offered.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/


/***************************************************************
 *              Constants
 ***************************************************************/
/*  8192 buys 5.4 Hz bins at 44.1 kHz, which is what makes the bottom
    of the semitone range resolvable at all. The cost is one 4096-float
    analysis per read, which is nothing next to a repaint. */
const FFT_SIZE = 8192;

/*  The window the byte spectrum is scaled into. The defaults (-100 to
    -30) put ordinary listening levels at the very top of the range and
    left everything pinned; this is measured against real tracks, not
    against a test tone. */
const MIN_DB = -85;
const MAX_DB = -25;

/*  C3 (MIDI 48) to B6 (MIDI 95): four octaves, 48 rows. See the header
    for why it does not start lower. */
const LOW_MIDI  = 48;
const SEMITONES = 48;

const A4_MIDI = 69;
const A4_HZ   = 440;

/*  The kill switch, read once. */
const OFF_KEY = "yunomusica:viz";


/***************************************************************
 *              State
 ***************************************************************/
let ctx     = null;
let active  = null;     // the tap of the element that is sounding
let taps    = new WeakMap();
let dead    = false;    // disabled, or failed once and never retried
let bands   = null;     // semitone -> [first bin, last bin]
let smoothing = 0.7;

const notes  = new Float32Array(SEMITONES);
const chroma = new Float32Array(12);

function noop() {}


/***************************************************************
 *  The context. Created on demand, never before: an AudioContext
 *  made at load time is one more thing a browser can decide to
 *  hold against the page.
 ***************************************************************/
function get_ctx()
{
    if(ctx || dead) {
        return ctx;
    }
    let off = false;
    try {
        off = (localStorage.getItem(OFF_KEY) === "off");
    } catch(e) {
        off = false;                    // storage blocked is not "off"
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if(off || !AC) {
        dead = true;
        return null;
    }
    try {
        ctx = new AC();
    } catch(e) {
        dead = true;
        return null;
    }
    return ctx;
}


/***************************************************************
 *  Tap an element and make it the one being read.
 *
 *  Safe to call on every `play`: the second call on the same
 *  element only re-points `active`.
 ***************************************************************/
function attach(audio)
{
    if(dead || !audio) {
        return;
    }
    const c = get_ctx();
    if(!c) {
        return;
    }

    const tap = taps.get(audio);
    if(tap) {
        active = tap;
        if(c.state !== "running") {
            /*  Already routed through the graph, so a suspended
                context here means silence: this is not optional. */
            c.resume().catch(noop);
        }
        return;
    }

    if(c.state === "running") {
        make_tap(audio);
        return;
    }
    /*  Not running yet. Resume first — we are inside the gesture that
        started playback, so it will be granted — and tap only once it
        really is running. Re-routing an element that is already
        playing is seamless; routing one into a suspended context is
        not. */
    c.resume().then(function() {
        if(!dead && c.state === "running" && !taps.get(audio)) {
            make_tap(audio);
        }
    }, noop);
}

function make_tap(audio)
{
    let source;
    try {
        source = ctx.createMediaElementSource(audio);
    } catch(e) {
        /*  Nothing was re-routed, so nothing was lost. */
        dead = true;
        return;
    }
    try {
        /*  The output BEFORE anything else. See the header. */
        source.connect(ctx.destination);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = smoothing;
        analyser.minDecibels = MIN_DB;
        analyser.maxDecibels = MAX_DB;
        /*  A branch off the path to the speakers, not a link in it: an
            AnalyserNode passes its input through, but nothing is
            listening on its output and nothing needs to. */
        source.connect(analyser);

        const tap = {
            source:   source,
            analyser: analyser,
            freq:     new Uint8Array(analyser.frequencyBinCount),
            wave:     new Uint8Array(analyser.fftSize)
        };
        taps.set(audio, tap);
        active = tap;
    } catch(e) {
        /*  The element is already routed through `source`, and source
            is connected to the destination, so the music is fine. All
            that is lost is the picture. */
        dead = true;
    }
}


/***************************************************************
 *  Where each semitone lives in the spectrum.
 *
 *  Built once per sample rate, from the band edges half a
 *  semitone either side of the note. Down at C3 that band is
 *  narrower than a bin and both edges land on the same one,
 *  which is the honest answer: that row IS that bin.
 ***************************************************************/
function build_bands(rate, bin_count)
{
    const hz_per_bin = rate / (bin_count * 2);
    const out = new Array(SEMITONES);
    for(let i = 0; i < SEMITONES; i++) {
        const midi = LOW_MIDI + i;
        const lo_hz = A4_HZ * Math.pow(2, (midi - 0.5 - A4_MIDI) / 12);
        const hi_hz = A4_HZ * Math.pow(2, (midi + 0.5 - A4_MIDI) / 12);
        let lo = Math.round(lo_hz / hz_per_bin);
        let hi = Math.round(hi_hz / hz_per_bin);
        if(hi < lo) {
            hi = lo;
        }
        if(hi >= bin_count) {
            hi = bin_count - 1;
        }
        out[i] = [Math.max(0, lo), Math.max(0, hi)];
    }
    return out;
}

/*  The loudest bin in the band, not the average: a spectrum is peaky,
    and averaging a narrow peak with the silence beside it reports a
    note that is sounding as a note that is not. */
function fold(freq, rate)
{
    if(!bands || bands.rate !== rate || bands.n !== freq.length) {
        bands = build_bands(rate, freq.length);
        bands.rate = rate;
        bands.n = freq.length;
    }
    chroma.fill(0);
    for(let i = 0; i < SEMITONES; i++) {
        const band = bands[i];
        let top = 0;
        for(let b = band[0]; b <= band[1]; b++) {
            if(freq[b] > top) {
                top = freq[b];
            }
        }
        const v = top / 255;
        notes[i] = v;
        /*  Pitch class: C3 is MIDI 48, and 48 % 12 is 0, so the row
            index folds straight onto it. */
        const pc = i % 12;
        if(v > chroma[pc]) {
            chroma[pc] = v;
        }
    }
}


/***************************************************************
 *  One reading, for one frame. The arrays are reused: this is
 *  called sixty times a second and must not make garbage.
 ***************************************************************/
function frame()
{
    if(dead || !active || !ctx) {
        return null;
    }
    const a = active.analyser;
    if(a.smoothingTimeConstant !== smoothing) {
        a.smoothingTimeConstant = smoothing;
    }
    a.getByteFrequencyData(active.freq);
    a.getByteTimeDomainData(active.wave);
    fold(active.freq, ctx.sampleRate);
    return {
        freq:   active.freq,
        wave:   active.wave,
        notes:  notes,
        chroma: chroma,
        rate:   ctx.sampleRate,
        low_midi: LOW_MIDI,
        semitones: SEMITONES
    };
}

/*  Whether a picture is possible at all. False before the first play:
    nothing has been tapped yet. */
function available()
{
    return !dead && !!active;
}

/*  How much of the previous frame survives into this one. The bars
    want a slow hand and the running ribbon wants none, or every column
    is a smear of the ten before it. */
function set_smoothing(v)
{
    smoothing = Math.max(0, Math.min(0.95, v));
}


export {
    attach,
    frame,
    available,
    set_smoothing,
    SEMITONES,
    LOW_MIDI,
};
