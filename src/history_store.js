/***********************************************************************
 *          history_store.js
 *
 *      What has actually been listened to.
 *
 *      Two records, because "what have I been playing?" and "what do I
 *      keep coming back to?" are different questions:
 *
 *        - SESSIONS. A timeline of listening occasions: this list, that
 *          hand-made queue, when it started, how long it really sounded.
 *          Each one keeps its own references, so a queue from last week
 *          can be put back on the deck without having been saved as a
 *          list. That is the point of it — a queue you built and liked
 *          and never named is exactly the one that used to be lost.
 *
 *        - PLAYS. A counter per track. Favourite tracks, albums and
 *          artists are all derived from this one number; nothing is
 *          "marked" as a favourite by hand, because a star is a chore
 *          and what you play is the honest answer.
 *
 *      Both are LISTENING time, not wall-clock: a paused deck counts
 *      nothing, and a track skipped after two seconds never happened.
 *      A play is counted at 20 seconds or half the track, whichever
 *      comes first — the rule everyone else uses, and the one that
 *      stops a fast skim through an album from looking like a night
 *      with it.
 *
 *      This is a record of behaviour, so:
 *        - it never leaves the device, like everything else here;
 *        - it can be wiped, whole, from the screen that shows it.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {
    STORE_HISTORY, STORE_PLAYS,
    idb_all, idb_put, idb_del, idb_clear,
} from "./idb.js";

import {
    subscribe, current_track, is_playing, progress,
    queue_tracks, queue_origin, find_track,
} from "./music_store.js";


/***************************************************************
 *      Tuning
 ***************************************************************/
/*  A play counts at 20s, or at half the track for anything shorter. */
const PLAY_AT_SECS = 20;
const PLAY_AT_FRACTION = 0.5;

/*  Under this, a session is somebody landing on the app and leaving. */
const SESSION_MIN_SECS = 5;

/*  A session keeps its own references so it can be replayed. A queue of
    eight thousand tracks does not need to be kept in full to be worth
    keeping at all. */
const SESSION_MAX_ITEMS = 500;

/*  Old occasions fall off the end. */
const MAX_SESSIONS = 120;

/*  Counters are only written when they change, but a track that plays
    for an hour would otherwise write nothing until it ended. */
const FLUSH_MS = 20000;


/***************************************************************
 *      Pub/sub — one channel, "history".
 ***************************************************************/
const listeners = new Set();

function subscribe_history(fn)
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
            fn("history");
        } catch(e) {
            console.error("history_store listener failed", e);
        }
    }
}


const S = {
    sessions: [],       // newest first
    plays:    new Map(),// track key -> {key, title, artist, album, count, secs, last}

    open:     null,     // the session being written right now
    sig:      "",       // what identifies it; a change starts another one

    track_key: "",      // the track time is being added to
    track_secs: 0,      // how long it has sounded this time round
    counted:   false,   // its play has already been counted

    last_tick: 0,       // clock of the previous "time" event
    dirty:     false,
    flushing:  false,
    flush_at:  0,
};


/***************************************************************
 *      Identity
 *
 *      A session is "the same one" while the deck keeps playing
 *      the same thing. A saved list is itself; a hand-made queue
 *      is its own contents, so re-ordering one is still that
 *      queue but loading a different folder is not.
 ***************************************************************/
function track_key(t)
{
    return t ? (t.source_id + "|" + t.path) : "";
}

function queue_signature()
{
    let origin = queue_origin();
    if(origin && origin.list_id && !origin.edited) {
        return "list:" + origin.list_id;
    }
    let q = queue_tracks();
    if(!q.length) {
        return "";
    }
    /*  Ends and length: enough to tell two queues apart, and cheap
        enough to compute on every tick. */
    return "queue:" + q.length + ":" +
        track_key(q[0]) + ":" + track_key(q[q.length - 1]);
}

function new_id()
{
    if(typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return "h" + Date.now() + "_" + Math.floor(Math.random() * 1e9);
}


/***************************************************************
 *      Loading
 ***************************************************************/
async function load_history()
{
    let rows = await idb_all(STORE_HISTORY);
    S.sessions = (rows || []).sort((a, b) => (b.started || 0) - (a.started || 0));

    let plays = await idb_all(STORE_PLAYS);
    S.plays = new Map((plays || []).map((p) => [p.key, p]));

    emit();
    return S.sessions.length;
}


/***************************************************************
 *      Accounting
 *
 *      Driven by the store's "time" channel, which fires on the
 *      audio element's timeupdate — about four times a second
 *      while something sounds, and never while it does not.
 ***************************************************************/
function on_tick()
{
    let now = Date.now();
    let last = S.last_tick;
    S.last_tick = now;

    if(!is_playing()) {
        return;
    }
    let track = current_track();
    if(!track) {
        return;
    }

    /*  The gap between two timeupdates, not the audio position: seeking
        would otherwise credit a jump forward as time listened. Capped,
        because a backgrounded tab can go minutes between ticks and none
        of that was heard either. */
    let dt = (last && now > last) ? Math.min((now - last) / 1000, 5) : 0;
    if(!dt) {
        return;
    }

    let key = track_key(track);
    if(key !== S.track_key) {
        S.track_key = key;
        S.track_secs = 0;
        S.counted = false;
    }
    S.track_secs += dt;

    let sig = queue_signature();
    if(sig !== S.sig) {
        close_session();
        S.sig = sig;
        S.open = sig ? open_session() : null;
    }
    if(S.open) {
        S.open.secs += dt;
        S.open.last = now;
        S.dirty = true;
    }

    count_play(track);
    flush_soon();
}

/*  A play is counted once per pass through the track. */
function count_play(track)
{
    if(S.counted) {
        return;
    }
    let p = progress();
    let threshold = (p.duration && isFinite(p.duration))
        ? Math.min(PLAY_AT_SECS, p.duration * PLAY_AT_FRACTION)
        : PLAY_AT_SECS;
    if(S.track_secs < threshold) {
        return;
    }
    S.counted = true;

    let key = track_key(track);
    let row = S.plays.get(key);
    if(!row) {
        row = {key: key, source_id: track.source_id, path: track.path,
               title: track.title, artist: track.artist, album: track.album,
               count: 0, secs: 0, last: 0};
        S.plays.set(key, row);
    }
    row.count++;
    row.secs += S.track_secs;
    row.last = Date.now();
    row.title = track.title;        // a rescan may have improved the tags
    row.artist = track.artist;
    row.album = track.album;

    idb_put(STORE_PLAYS, row);
    if(S.open) {
        S.open.plays = (S.open.plays || 0) + 1;
    }
    emit();
}

function open_session()
{
    let origin = queue_origin();
    let q = queue_tracks();
    return {
        id:      new_id(),
        kind:    (origin && origin.list_id && !origin.edited) ? "list" : "queue",
        list_id: (origin && origin.list_id) || "",
        name:    (origin && origin.name) || "",
        started: Date.now(),
        last:    Date.now(),
        secs:    0,
        plays:   0,
        count:   q.length,
        items:   q.slice(0, SESSION_MAX_ITEMS).map((t) => ({
            source_id: t.source_id,
            path:      t.path,
            title:     t.title,
            artist:    t.artist,
        })),
    };
}

/*  A session is only written once it has been listened to. Opening the
    app, seeing the restored queue and going away again is not an
    occasion, and a history full of five-second entries is a history
    nobody reads. */
function close_session()
{
    let open = S.open;
    S.open = null;
    if(!open || open.secs < SESSION_MIN_SECS) {
        return;
    }
    store_session(open);
}

function store_session(session)
{
    let i = S.sessions.findIndex((s) => s.id === session.id);
    if(i >= 0) {
        S.sessions[i] = session;
    } else {
        S.sessions.unshift(session);
    }
    idb_put(STORE_HISTORY, session);

    while(S.sessions.length > MAX_SESSIONS) {
        let old = S.sessions.pop();
        idb_del(STORE_HISTORY, old.id);
    }
    emit();
}

/*  Written on a timer, not on every tick: four writes a second for as
    long as the music plays is not a record worth keeping that way. */
function flush_soon()
{
    if(!S.dirty || S.flushing) {
        return;
    }
    let now = Date.now();
    if(S.flush_at && now < S.flush_at) {
        return;
    }
    S.flush_at = now + FLUSH_MS;
    S.dirty = false;
    if(S.open && S.open.secs >= SESSION_MIN_SECS) {
        S.flushing = true;
        store_session(S.open);
        S.flushing = false;
    }
}

/*  The tab is going away. Whatever is open has to land now — there is
    no later. */
function flush_history()
{
    if(S.open && S.open.secs >= SESSION_MIN_SECS) {
        store_session(S.open);
    }
}

function start_history()
{
    S.last_tick = 0;
    return subscribe(function(channel) {
        if(channel === "time") {
            on_tick();
        } else if(channel === "playing") {
            /*  A pause must not be credited as listening when it
                resumes: the next tick starts a fresh interval. */
            S.last_tick = is_playing() ? Date.now() : 0;
            if(!is_playing()) {
                flush_history();
            }
        }
    });
}


/***************************************************************
 *      Reading it back
 ***************************************************************/
/*  The timeline, newest first. The session still open is included —
    what is playing right now IS what you have been listening to — but
    only once it counts as one. */
function recent_sessions(limit)
{
    let out = S.sessions.slice();
    if(S.open && S.open.secs >= SESSION_MIN_SECS &&
            !out.some((s) => s.id === S.open.id)) {
        out.unshift(S.open);
    }
    out.sort((a, b) => (b.last || b.started || 0) - (a.last || a.started || 0));
    return limit ? out.slice(0, limit) : out;
}

/*  The same list listened to on six occasions is ONE favourite, not
    six rows. Hand-made queues group by their signature, so the queue
    you keep rebuilding the same way is one line too. */
function favourite_lists(limit)
{
    let by = new Map();
    for(const s of recent_sessions(0)) {
        let key = s.kind === "list" && s.list_id
            ? "list:" + s.list_id
            : "queue:" + s.count + ":" + ((s.items && s.items[0])
                ? s.items[0].source_id + "|" + s.items[0].path : "");
        let row = by.get(key);
        if(!row) {
            row = {key: key, kind: s.kind, list_id: s.list_id, name: s.name,
                   items: s.items || [], count: s.count,
                   times: 0, secs: 0, last: 0};
            by.set(key, row);
        }
        row.times++;
        row.secs += s.secs || 0;
        row.last = Math.max(row.last, s.last || s.started || 0);
        /*  Keep the newest references: a list may have been added to. */
        if((s.last || 0) >= row.last && s.items && s.items.length) {
            row.items = s.items;
            row.count = s.count;
        }
    }
    let out = [...by.values()].sort((a, b) => b.secs - a.secs);
    return limit ? out.slice(0, limit) : out;
}

function favourite_tracks(limit)
{
    let out = [...S.plays.values()]
        .sort((a, b) => b.count - a.count || b.secs - a.secs);
    return limit ? out.slice(0, limit) : out;
}

/*  Albums and artists are the same sum over a different field. */
function group_plays(field, limit)
{
    let by = new Map();
    for(const p of S.plays.values()) {
        let name = p[field];
        if(!name) {
            continue;
        }
        let row = by.get(name);
        if(!row) {
            row = {name: name, artist: p.artist, count: 0, secs: 0,
                   last: 0, tracks: []};
            by.set(name, row);
        }
        row.count += p.count;
        row.secs += p.secs;
        row.last = Math.max(row.last, p.last || 0);
        row.tracks.push(p);
    }
    let out = [...by.values()].sort((a, b) => b.count - a.count);
    return limit ? out.slice(0, limit) : out;
}

function favourite_albums(limit)
{
    return group_plays("album", limit);
}

function favourite_artists(limit)
{
    return group_plays("artist", limit);
}

function has_history()
{
    return S.sessions.length > 0 || S.plays.size > 0;
}

/*  Turn stored references back into tracks that can be played. Same
    contract as a saved list: what is missing is reported, not hidden. */
function resolve_items(items)
{
    let tracks = [];
    let missing = 0;
    for(const item of (items || [])) {
        let t = find_track(item.source_id, item.path);
        if(t) {
            tracks.push(t);
        } else {
            missing++;
        }
    }
    return {tracks, missing, total: (items || []).length};
}

async function clear_history()
{
    S.sessions = [];
    S.plays = new Map();
    S.open = null;
    S.sig = "";
    S.track_key = "";
    S.track_secs = 0;
    S.counted = false;
    await idb_clear(STORE_HISTORY);
    await idb_clear(STORE_PLAYS);
    emit();
}


export {
    subscribe_history,
    load_history,
    start_history,
    flush_history,
    recent_sessions,
    favourite_lists,
    favourite_tracks,
    favourite_albums,
    favourite_artists,
    has_history,
    resolve_items,
    clear_history,
};
