/***********************************************************************
 *          stats_store.js
 *
 *      How often a track has been listened to, and how many times it
 *      has been loved.
 *
 *      TWO NUMBERS PER TRACK, and they answer different questions:
 *
 *        plays   how many times it was LISTENED TO — whole or in part.
 *                A track counts once it has really sounded for a
 *                while, so skipping past it does not count and neither
 *                does dragging the scrub bar across it.
 *        full    how many of those reached the end. The breakdown is
 *                on the track's card; the badge on the row shows the
 *                total, because "how often do I put this on" is the
 *                question people actually have.
 *        hearts  a number, not a flag. Loving a song twice as much as
 *                another one is a thing people mean, and a heart that
 *                only toggles cannot say it. It goes down and it
 *                resets, from the card.
 *
 *      WHAT THIS IS NOT. Version 4 of the database DELETED a listening
 *      history, and the reason it did is worth keeping in view: the
 *      screen that showed it had gone, and holding a record of
 *      behaviour that the app no longer admits to holding is not a
 *      thing to do quietly. Nothing here is a history. There are no
 *      timestamps, no order, nothing that reconstructs an evening —
 *      just a count per track, shown on the track itself, and erasable
 *      from the same card that shows it.
 *
 *      Keyed by source and path, like a saved list, because that is the
 *      identity that survives a reload: uids are handed out afresh on
 *      every scan.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {STORE_STATS, idb_all, idb_put, idb_del} from "./idb.js";
import {subscribe, progress, current_track} from "./music_store.js";


/***************************************************************
 *              Constants
 ***************************************************************/
/*  How long a track has to have really sounded before it counts as
    listened to. Twenty seconds, or half of it when it is shorter than
    forty — an interlude of eight seconds is a track someone heard, and
    a twenty-second rule would never count it. */
const COUNT_AFTER_S = 20;

/*  Close enough to the end to call it finished. The last `timeupdate`
    before a track ends lands within a quarter of a second of it, but
    the tail of a file can be shorter than the last tick. */
const END_SLACK_S = 1.5;

/*  A jump bigger than this between two readings of the clock is a seek,
    not listening. Two ticks of `timeupdate` are a quarter of a second
    apart; a second and a half of slack covers a stalled phone. */
const TICK_MAX_S = 1.5;

/*  Writes are coalesced: a heart tapped four times is one record. */
const WRITE_MS = 400;


/***************************************************************
 *      Pub/sub — one channel, "stats".
 ***************************************************************/
const listeners = new Set();

function subscribe_stats(fn)
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
            fn("stats");
        } catch(e) {
            console.error("stats_store listener failed", e);
        }
    }
}


const S = {
    by_key:  new Map(),     // key -> {key, plays, full, hearts}
    dirty:   new Set(),
    timer:   0,
    /*  The listen in progress. */
    key:     "",
    dur:     0,
    heard:   0,             // seconds that really sounded
    at:      0,             // where the clock was last seen
    counted: false,         // this listen already went into `plays`
    watching: null
};

const ZERO = {plays: 0, full: 0, hearts: 0};

/*  The identity that survives a rescan. A track with no source is not
    something we can file anything against. */
function key_of(track)
{
    if(!track || !track.source_id || !track.path) {
        return "";
    }
    return track.source_id + "|" + track.path;
}

function row_of(key, make)
{
    let row = S.by_key.get(key);
    if(!row && make) {
        row = {key: key, plays: 0, full: 0, hearts: 0};
        S.by_key.set(key, row);
    }
    return row || null;
}


/***************************************************************
 *              Reading
 ***************************************************************/
/*  Always an object, never null: every caller of this paints a row and
    none of them wants to ask twice. */
function stats_of(track)
{
    const key = key_of(track);
    if(!key) {
        return ZERO;
    }
    return S.by_key.get(key) || ZERO;
}

/***************************************************************
 *  Everything with a count, most first.
 *
 *  `by` is "hearts" or "plays". Ties break on the other one,
 *  because a list where equal favourites come out in whatever
 *  order a Map happened to hold them looks like a bug.
 ***************************************************************/
function ranked(by)
{
    const hearts = (by === "hearts");
    const out = [];
    for(const row of S.by_key.values()) {
        if((hearts ? row.hearts : row.plays) > 0) {
            out.push(row);
        }
    }
    out.sort(function(a, b) {
        return hearts
            ? (b.hearts - a.hearts) || (b.plays - a.plays)
            : (b.plays - a.plays) || (b.hearts - a.hearts);
    });
    return out;
}

/*  A key back into the pair it was made of. Split on the FIRST
    separator, not the last: a source id never contains one and a path
    on some systems can. */
function split_key(key)
{
    const i = key.indexOf("|");
    return i < 0
        ? {source_id: key, path: ""}
        : {source_id: key.slice(0, i), path: key.slice(i + 1)};
}

function stats_total()
{
    let tracks = 0;
    let hearts = 0;
    for(const row of S.by_key.values()) {
        if(row.plays) {
            tracks++;
        }
        hearts += row.hearts;
    }
    return {tracks: tracks, hearts: hearts};
}


/***************************************************************
 *              Writing
 ***************************************************************/
function touch(key)
{
    S.dirty.add(key);
    if(S.timer) {
        return;
    }
    S.timer = setTimeout(function() {
        S.timer = 0;
        const keys = Array.from(S.dirty);
        S.dirty.clear();
        keys.forEach(function(k) {
            const row = S.by_key.get(k);
            if(!row || (!row.plays && !row.full && !row.hearts)) {
                /*  Nothing left to say about this track. Deleting beats
                    storing a row of zeroes: the database should not
                    keep a list of everything that was ever played and
                    then reset. */
                S.by_key.delete(k);
                idb_del(STORE_STATS, k);
                return;
            }
            idb_put(STORE_STATS, row);
        });
    }, WRITE_MS);
}

/*  Hearts. `delta` is normally +1 or -1; it never goes below zero,
    because "minus two hearts" is not a thing anybody means. */
function heart(track, delta)
{
    const key = key_of(track);
    if(!key) {
        return 0;
    }
    const row = row_of(key, true);
    row.hearts = Math.max(0, row.hearts + delta);
    touch(key);
    emit();
    return row.hearts;
}

function heart_reset(track)
{
    const key = key_of(track);
    if(!key) {
        return;
    }
    const row = row_of(key, false);
    if(!row || !row.hearts) {
        return;
    }
    row.hearts = 0;
    touch(key);
    emit();
}

/*  Everything this app remembers about one track, gone. The card that
    shows the numbers is the place that erases them: a count you cannot
    clear from where you can read it is a count the app is keeping ON
    you rather than FOR you. */
function stats_reset(track)
{
    const key = key_of(track);
    if(!key) {
        return;
    }
    const row = row_of(key, false);
    if(!row) {
        return;
    }
    row.plays = 0;
    row.full = 0;
    row.hearts = 0;
    /*  The listen in progress would otherwise put its count back the
        moment the track passes the threshold again. */
    if(S.key === key) {
        S.counted = true;
    }
    touch(key);
    emit();
}

/***************************************************************
 *  One kind of count, gone, everywhere.
 *
 *  `kind` is "plays" or "hearts", and it clears ONLY that one:
 *  the button lives on a list, and pressing it should empty the
 *  list it is on and nothing else. Wiping the hearts from a
 *  button that says "most played" would be a surprise, and a
 *  surprise that cannot be undone.
 ***************************************************************/
function clear_counts(kind)
{
    const plays = (kind !== "hearts");
    let touched = false;
    for(const key of Array.from(S.by_key.keys())) {
        const row = S.by_key.get(key);
        if(plays ? (row.plays || row.full) : row.hearts) {
            if(plays) {
                row.plays = 0;
                row.full = 0;
            } else {
                row.hearts = 0;
            }
            touched = true;
            /*  A row left at all zeroes is deleted rather than stored:
                the database should not keep a list of everything that
                was ever played and then cleared. */
            touch(key);
        }
    }
    /*  The listen in progress would otherwise hand its count straight
        back the moment the track passes the threshold. */
    if(plays) {
        S.counted = true;
    }
    if(touched) {
        emit();
    }
}

/*  A source that is removed takes its counts with it. Anything else
    leaves an orphan nobody can see and nobody can clear. */
function drop_source_stats(source_id)
{
    const prefix = source_id + "|";
    let gone = false;
    for(const key of Array.from(S.by_key.keys())) {
        if(key.indexOf(prefix) === 0) {
            S.by_key.delete(key);
            idb_del(STORE_STATS, key);
            gone = true;
        }
    }
    if(gone) {
        emit();
    }
}


/***************************************************************
 *              Counting what is heard
 *
 *  Off the store's own clock, so nothing in the playback path
 *  has to know this file exists. What is added up is the time
 *  that REALLY SOUNDED: the difference between two readings is
 *  only believed when it is the size of a tick, so a seek adds
 *  nothing and neither does a pause.
 *
 *  A preview is not counted. It runs on its own element and
 *  `progress()` does not see it, which is the right answer as
 *  well as the easy one — listening without committing is what
 *  a preview is FOR.
 ***************************************************************/
function start_counting()
{
    if(S.watching) {
        return;
    }
    S.watching = subscribe(function(channel) {
        if(channel === "time" || channel === "playing" || channel === "queue") {
            tick();
        }
    });
}

function stop_counting()
{
    if(S.watching) {
        S.watching();
        S.watching = null;
    }
}

function tick()
{
    const track = current_track();
    const key = key_of(track);
    const p = progress();

    if(key !== S.key) {
        close_listen();
        S.key = key;
        S.dur = p.duration || 0;
        S.heard = 0;
        S.at = p.current || 0;
        S.counted = false;
        return;
    }
    if(p.duration) {
        S.dur = p.duration;
    }

    const delta = (p.current || 0) - S.at;
    S.at = p.current || 0;
    if(delta > 0 && delta <= TICK_MAX_S) {
        S.heard += delta;
    }

    if(!S.counted && S.key && S.heard >= threshold(S.dur)) {
        S.counted = true;
        const row = row_of(S.key, true);
        row.plays++;
        touch(S.key);
        emit();
    }
}

/*  Half of a short track, twenty seconds of a long one. An eight-second
    interlude is a track somebody heard, and a flat twenty would never
    count it. */
function threshold(duration)
{
    if(!duration || !isFinite(duration)) {
        return COUNT_AFTER_S;
    }
    return Math.min(COUNT_AFTER_S, Math.max(1, duration / 2));
}

/*  The listen that is ending: was it heard to the end?
 *
 *  Asked here rather than on an `ended` event because the store does
 *  not publish one — and because this catches the other way a track
 *  finishes, which is the user pressing next on the last second of it. */
function close_listen()
{
    if(!S.key || !S.counted || !S.dur) {
        return;
    }
    if(S.at >= S.dur - END_SLACK_S) {
        const row = row_of(S.key, true);
        row.full++;
        touch(S.key);
        emit();
    }
}


/***************************************************************
 *  Read back at boot. Every call resolves even with no
 *  storage: the app then counts for this session and forgets.
 ***************************************************************/
async function load_stats()
{
    const rows = await idb_all(STORE_STATS);
    S.by_key.clear();
    rows.forEach(function(r) {
        if(r && r.key) {
            S.by_key.set(r.key, {
                key:    r.key,
                plays:  r.plays  || 0,
                full:   r.full   || 0,
                hearts: r.hearts || 0
            });
        }
    });
    start_counting();
    emit();
    return S.by_key.size;
}


export {
    load_stats,
    subscribe_stats,
    stats_of,
    stats_total,
    ranked,
    split_key,
    heart,
    heart_reset,
    stats_reset,
    clear_counts,
    drop_source_stats,
    start_counting,
    stop_counting,
};
