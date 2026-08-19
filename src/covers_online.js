/***********************************************************************
 *          covers_online.js
 *
 *      The one thing in this app that talks to the outside.
 *
 *      Most music on a phone is a folder of files with no picture inside
 *      them, and a wall of grey squares is a poor way to find a record
 *      you know by its sleeve. A name cannot BE a picture, but a name is
 *      enough to ask about one — which is the whole of what happens
 *      here: artist and album go out as text, an image comes back.
 *
 *      Everything about this file is arranged so that it cannot hurt the
 *      thing the app is actually for:
 *
 *        - It is OFF until switched on. The app's promise is that
 *          nothing leaves the device; while this is off that stays
 *          literally true, and turning it on is the user saying they
 *          would rather have the sleeves.
 *        - It never blocks. Nothing awaits it, no view waits for it, and
 *          the queue plays whether it succeeds, fails, or never runs.
 *        - It never asks twice. A hit is stored; so is a miss, so a
 *          library full of bootlegs does not re-ask the internet about
 *          them at every launch.
 *        - A cover found in the file always wins. See add_cover().
 *
 *      Two services, in order:
 *
 *        1. MusicBrainz + the Cover Art Archive — non-profit, no key, no
 *           advertising behind it. It is also the one that goes down:
 *           503 "currently busy" is a normal answer from it.
 *        2. The iTunes Search API — one request, and it answers when the
 *           first one does not.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {STORE_COVERS, idb_all, idb_put, pref_get, pref_set} from "./idb.js";
import {subscribe, albums_missing_cover, add_cover} from "./music_store.js";

const PREF_ON = "covers_online";

/*  MusicBrainz asks for no more than one request a second and answers
    503 when it means it. The archive and iTunes are easier, but there is
    no reason to hurry any of this: it is decoration arriving late. */
const MB_GAP   = 1200;
const NEXT_GAP = 400;
const TIMEOUT  = 8000;

/*  A miss is remembered, but not forever — the archive gains covers, and
    a record nobody had a picture of in March may have one in June. */
const RETRY_MISS_AFTER = 30 * 24 * 3600 * 1000;

const listeners = new Set();

const S = {
    on:      false,
    ready:   false,     // the preference has been read
    running: false,
    found:   0,
    missed:  0,
    left:    0,
    misses:  new Map(), // album key -> when we last drew a blank
    stop:    false,
};


function subscribe_covers(fn)
{
    listeners.add(fn);
    return function unsubscribe() {
        listeners.delete(fn);
    };
}

function emit()
{
    for(const fn of listeners) {
        try {
            fn();
        } catch(e) {
            console.error("covers_online listener failed", e);
        }
    }
}

function covers_online_on()
{
    return S.on;
}

function covers_online_state()
{
    return {on: S.on, running: S.running, found: S.found,
            missed: S.missed, left: S.left};
}


/***************************************************************
 *      Turning the name into something worth asking
 *
 *  This is the part the folder name earns its keep in. A ripped
 *  folder is called "0060 - Yes Going For the One", and no
 *  catalogue in the world has a record by that name. The
 *  numbering is the shelf, not the title.
 ***************************************************************/
const JUNK = /\s*[\(\[](?:disc|cd|disco)\s*\d+[\)\]]/ig;
const EDITION = /\s*[\(\[][^\)\]]*(?:remaster|remastered|deluxe|edition|edición|expanded|bonus|reissue|mono|stereo|anniversary)[^\)\]]*[\)\]]/ig;

function clean_album(s)
{
    return String(s || "")
        /*  "0060 - ", "01. ", "1_" — a position in a collection. */
        .replace(/^\s*\d{1,5}\s*[-._)]\s*/, "")
        .replace(JUNK, "")
        .replace(EDITION, "")
        .replace(/\s+/g, " ")
        .trim();
}

function clean_artist(s)
{
    const a = String(s || "").trim();
    if(!a || /^unknown artist$/i.test(a) || a === "—") {
        return "";
    }
    return a.replace(/^\s*\d{1,5}\s*[-._)]\s*/, "").replace(/\s+/g, " ").trim();
}


/***************************************************************
 *      Asking, carefully
 ***************************************************************/
/*  Every request out of this app goes through here: with a timeout,
    and never throwing. A captive portal that accepts connections and
    answers nothing is the case this exists for — without the abort, one
    album would hold the whole sweep open forever. */
async function get(url, as)
{
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT);
    try {
        const r = await fetch(url, {signal: ctl.signal, mode: "cors",
                                    credentials: "omit", cache: "no-store"});
        if(!r.ok) {
            return null;
        }
        return as === "blob" ? await r.blob() : await r.json();
    } catch(e) {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

function looks_like_art(blob)
{
    /*  A 404 page served with a 200, an empty body, a tracking pixel:
        all of them are "not a sleeve". Real cover art is never tiny. */
    return !!blob && blob.type.indexOf("image/") === 0 && blob.size > 2000;
}


/*  1. MusicBrainz for the id, the Cover Art Archive for the picture. */
async function from_musicbrainz(artist, album)
{
    const q = artist
        ? `releasegroup:"${album}" AND artist:"${artist}"`
        : `releasegroup:"${album}"`;
    const url = "https://musicbrainz.org/ws/2/release-group/?query=" +
                encodeURIComponent(q) + "&fmt=json&limit=3";

    const data = await get(url);
    const groups = (data && data["release-groups"]) || [];
    for(const g of groups.slice(0, 2)) {
        if(!g || !g.id) {
            continue;
        }
        /*  front-500 is a redirect to the archive; fetch follows it. A
            release group with no art answers 404, which get() turns into
            null, and we move on to the next candidate. */
        const blob = await get(
            "https://coverartarchive.org/release-group/" + g.id + "/front-500",
            "blob");
        if(looks_like_art(blob)) {
            return blob;
        }
    }
    return null;
}


/*  2. iTunes: one request, and the artwork URL is in the answer. */
async function from_itunes(artist, album)
{
    const term = (artist ? artist + " " + album : album);
    const url = "https://itunes.apple.com/search?term=" +
                encodeURIComponent(term) + "&entity=album&limit=1";

    const data = await get(url);
    const hit = data && data.results && data.results[0];
    if(!hit || !hit.artworkUrl100) {
        return null;
    }
    /*  The search answers with a thumbnail; the same URL serves any size,
        and 600 is what a phone screen deserves. */
    const big = hit.artworkUrl100.replace("100x100bb", "600x600bb");
    const blob = await get(big, "blob");
    return looks_like_art(blob) ? blob : null;
}


/***************************************************************
 *      The sweep
 ***************************************************************/
async function remember_miss(key)
{
    S.misses.set(key, Date.now());
    S.missed++;
    /*  Stored in the covers store beside the real ones, with no blob.
        prime_covers() skips a null blob, so this costs the painting
        nothing and saves the internet a question it already answered. */
    await idb_put(STORE_COVERS, {key: key, blob: null, missed: Date.now()});
}

async function keep(key, blob)
{
    if(add_cover(key, blob)) {
        S.found++;
        await idb_put(STORE_COVERS, {key: key, blob: blob});
    }
}

function skip_miss(key)
{
    const when = S.misses.get(key);
    return !!when && (Date.now() - when) < RETRY_MISS_AFTER;
}

async function sweep()
{
    if(S.running || !S.on) {
        return;
    }
    /*  Offline is the normal state of this app, and it is not a failure.
        Nothing is attempted; the next launch with a network picks it up. */
    if(navigator.onLine === false) {
        return;
    }

    const todo = albums_missing_cover().filter((a) => !skip_miss(a.key));
    if(!todo.length) {
        return;
    }

    S.running = true;
    S.stop = false;
    S.left = todo.length;
    emit();

    for(const album of todo) {
        if(S.stop || !S.on || navigator.onLine === false) {
            break;
        }

        const artist = clean_artist(album.albumArtist);
        const title  = clean_album(album.album);
        if(!title) {
            S.left--;
            continue;
        }

        let blob = await from_musicbrainz(artist, title);
        if(!blob) {
            await new Promise((r) => setTimeout(r, NEXT_GAP));
            blob = await from_itunes(artist, title);
        }

        if(blob) {
            await keep(album.key, blob);
        } else {
            await remember_miss(album.key);
        }

        S.left--;
        emit();
        await new Promise((r) => setTimeout(r, MB_GAP));
    }

    S.running = false;
    S.left = 0;
    emit();
}


/***************************************************************
 *      Wiring
 ***************************************************************/
let debounce = 0;

function schedule()
{
    if(!S.on) {
        return;
    }
    clearTimeout(debounce);
    /*  A scan emits "library" per batch of files. Waiting lets a folder
        of eight thousand tracks finish arriving before we ask about a
        single album, and keeps this off the critical path of a load. */
    debounce = setTimeout(function() {
        sweep().catch((e) => console.warn("covers_online:", e && e.message));
    }, 4000);
}

async function set_covers_online(on)
{
    S.on = !!on;
    await pref_set(PREF_ON, S.on);
    if(S.on) {
        schedule();
    } else {
        S.stop = true;
    }
    emit();
}

/*  Read the preference, remember what has already been asked, and follow
    the library from then on. Called once, from main(). */
async function start_covers_online()
{
    S.on = !!(await pref_get(PREF_ON, false));
    S.ready = true;

    const rows = await idb_all(STORE_COVERS);
    for(const row of (rows || [])) {
        if(row && row.missed && !row.blob) {
            S.misses.set(row.key, row.missed);
        }
    }

    subscribe(function(channel) {
        if(channel === "library") {
            schedule();
        }
    });

    /*  Coming back onto a network is exactly when the covers that were
        skipped on a plane can be fetched. */
    window.addEventListener("online", schedule);

    emit();
    schedule();
}


export {
    start_covers_online,
    set_covers_online,
    covers_online_on,
    covers_online_state,
    subscribe_covers,
    clean_album,
    clean_artist,
};
