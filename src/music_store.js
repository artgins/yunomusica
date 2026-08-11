/***********************************************************************
 *          music_store.js
 *
 *      The domain of yunomúsica, with no gobj and no chrome: reading the
 *      files a source hands over, parsing their ID3 tags, grouping the
 *      library four ways, and playing a queue the user curates.
 *
 *      The ID3 reader and the play logic are ported verbatim from the
 *      single self-contained page this app grew from, so nothing about
 *      the parsing changes; only its shape does, from inline globals to a
 *      module with a tiny pub/sub the gobj views subscribe to.
 *
 *      Everything runs on the device: a file is read with the File API
 *      and played from an object URL. Nothing is uploaded, and nothing is
 *      copied — see sources_store.js for what "authorised" means.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {attach as attach_analyser} from "./analyser.js";


/***************************************************************
 *      Tiny pub/sub
 *
 *  Channels:
 *    "loading"  — ingest progress moved (loaded/total/name).
 *    "library"  — the track list changed (a source came or went).
 *    "queue"    — the queue was edited (added, removed, reordered).
 *    "playing"  — the current track or the play/pause state changed.
 *    "time"     — the playback position moved (audio timeupdate).
 *
 *  A view subscribes to the channels it repaints on; the store never
 *  touches the DOM itself.
 ***************************************************************/
const listeners = new Set();

function subscribe(fn)
{
    listeners.add(fn);
    return function unsubscribe() {
        listeners.delete(fn);
    };
}

function emit(channel)
{
    for(const fn of listeners) {
        try {
            fn(channel);
        } catch(e) {
            /*  A broken listener must not stop the others. */
            console.error("music_store listener failed", e);
        }
    }
}


/***************************************************************
 *      1. ID3 tag reading (v2.2/2.3/2.4 + v1) — no dependencies
 ***************************************************************/
const GENRES = ("Blues,Classic Rock,Country,Dance,Disco,Funk,Grunge,Hip-Hop,Jazz,Metal,New Age,Oldies,Other,Pop,R&B,Rap,"+
"Reggae,Rock,Techno,Industrial,Alternative,Ska,Death Metal,Pranks,Soundtrack,Euro-Techno,Ambient,Trip-Hop,Vocal,"+
"Jazz+Funk,Fusion,Trance,Classical,Instrumental,Acid,House,Game,Sound Clip,Gospel,Noise,Alt. Rock,Bass,Soul,Punk,"+
"Space,Meditative,Instrumental Pop,Instrumental Rock,Ethnic,Gothic,Darkwave,Techno-Industrial,Electronic,Pop-Folk,"+
"Eurodance,Dream,Southern Rock,Comedy,Cult,Gangsta,Top 40,Christian Rap,Pop/Funk,Jungle,Native American,Cabaret,"+
"New Wave,Psychedelic,Rave,Showtunes,Trailer,Lo-Fi,Tribal,Acid Punk,Acid Jazz,Polka,Retro,Musical,Rock & Roll,Hard Rock").split(",");

function dec(bytes, enc)
{
    let label = "windows-1252", data = bytes;
    if(enc === 1) {
        if(data[0] === 0xFF && data[1] === 0xFE) { label="utf-16le"; data=data.subarray(2); }
        else if(data[0] === 0xFE && data[1] === 0xFF) { label="utf-16be"; data=data.subarray(2); }
        else { label = "utf-16le"; }
    } else if(enc === 2) {
        label = "utf-16be";
    } else if(enc === 3) {
        label = "utf-8";
    }
    try {
        return new TextDecoder(label).decode(data).replace(/\0+$/,"").trim();
    } catch(e) {
        return new TextDecoder().decode(data).replace(/\0+$/,"").trim();
    }
}

function syncsafe(b, o)
{
    return (b[o]<<21) | (b[o+1]<<14) | (b[o+2]<<7) | b[o+3];
}

function plain32(b, o)
{
    return (b[o]<<24) | (b[o+1]<<16) | (b[o+2]<<8) | b[o+3];
}

function parseID3(buf)
{
    const b = new Uint8Array(buf);
    const out = {};
    if(b[0]!==0x49 || b[1]!==0x44 || b[2]!==0x33) {     // "ID3"
        return out;
    }
    const major = b[3];
    const flags = b[5];
    const size  = syncsafe(b, 6);
    let p = 10;
    if(flags & 0x40) {
        p += major === 4 ? syncsafe(b, p) : plain32(b, p) + 4;
    }

    const idLen = major === 2 ? 3 : 4;
    const end = Math.min(10 + size, b.length);

    while(p + idLen + (major===2?3:6) <= end) {
        const id = String.fromCharCode(...b.subarray(p, p+idLen));
        if(!/^[A-Z0-9]+$/.test(id)) {                   // padding
            break;
        }
        let fsize, hdr;
        if(major === 2) {
            fsize = (b[p+3]<<16)|(b[p+4]<<8)|b[p+5];
            hdr = 6;
        } else {
            fsize = major === 4 ? syncsafe(b, p+4) : plain32(b, p+4);
            hdr = 10;
        }
        if(fsize <= 0 || p + hdr + fsize > end) {
            break;
        }
        const body = b.subarray(p+hdr, p+hdr+fsize);

        if(id === "APIC" || id === "PIC") {
            out.cover = readPicture(body, id === "PIC");
        } else if(id[0] === "T") {
            const txt = dec(body.subarray(1), body[0]).split("\0")[0];
            const key = {TIT2:"title",TT2:"title", TPE1:"artist",TP1:"artist",
                         TPE2:"albumArtist",TP2:"albumArtist", TALB:"album",TAL:"album",
                         TCON:"genre",TCO:"genre", TRCK:"track",TRK:"track",
                         TYER:"year",TYE:"year", TDRC:"year"}[id];
            if(key && txt) {
                out[key] = txt;
            }
        }
        p += hdr + fsize;
    }
    return out;
}

function readPicture(body, isV2)
{
    const enc = body[0];
    let i = 1, mime;
    if(isV2) {
        mime = "image/" + String.fromCharCode(...body.subarray(1,4)).toLowerCase();
        i = 4;
    } else {
        let s=i;
        while(i<body.length && body[i]!==0) {
            i++;
        }
        mime = dec(body.subarray(s,i),0)||"image/jpeg";
        i++;
    }
    i++;                                                // picture type
    if(enc === 1 || enc === 2) {
        while(i+1 < body.length && !(body[i]===0 && body[i+1]===0)) {
            i+=2;
        }
        i+=2;
    } else {
        while(i < body.length && body[i]!==0) {
            i++;
        }
        i++;
    }
    if(i >= body.length) {
        return null;
    }
    return new Blob([body.subarray(i)], {type: mime});
}

function parseID3v1(buf)
{
    const b = new Uint8Array(buf);
    const o = b.length - 128;
    if(o < 0 || b[o]!==0x54 || b[o+1]!==0x41 || b[o+2]!==0x47) {   // "TAG"
        return {};
    }
    const s = (a,z) => dec(b.subarray(o+a,o+z),0).replace(/\0.*$/,"").trim();
    const g = b[o+127];
    return {title:s(3,33), artist:s(33,63), album:s(63,93), year:s(93,97),
            genre: GENRES[g] || ""};
}

function cleanGenre(g)
{
    if(!g) {
        return "";
    }
    const m = g.match(/^\((\d+)\)\s*(.*)$/);
    if(m) {
        return m[2] || GENRES[+m[1]] || "";
    }
    if(/^\d+$/.test(g)) {
        return GENRES[+g] || "";
    }
    return g.replace(/\0/g," / ").trim();
}

/***************************************************************
 *  Read ONLY the tag, not a fixed slab off the front.
 *
 *  The ID3v2 header is 10 bytes and states the exact length of
 *  the tag that follows, so that is all there is to read: a few
 *  KB for a plain tag, more only when a cover is embedded, and
 *  nothing at all for a file with no ID3v2 at all.
 *
 *  This used to read a flat 512 KB per file. On a 5000-track
 *  library that is 2.4 GiB pulled off the disk and thrown away —
 *  minutes of "reading…" on a phone, which is exactly what it
 *  looked like: a scan that never finished.
 ***************************************************************/
const ID3_HEADER = 10;
const MAX_TAG = 4 * 1024 * 1024;    // a corrupt size field must not read the whole file

async function read_tags(f)
{
    let tag = {};
    try {
        const head = new Uint8Array(await f.slice(0, ID3_HEADER).arrayBuffer());
        if(head.length >= ID3_HEADER &&
                head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {    // "ID3"
            const len = Math.min(ID3_HEADER + syncsafe(head, 6), MAX_TAG, f.size);
            tag = parseID3(await f.slice(0, len).arrayBuffer());
        }
    } catch(e) {
        /*  Unreadable head: the ID3v1 tail and the path guess remain. */
    }
    if(!tag.title && f.size > 128) {
        try {
            const tail = await f.slice(Math.max(0, f.size - 128)).arrayBuffer();
            tag = Object.assign(parseID3v1(tail), tag);
        } catch(e) {
            /*  Unreadable tail: fall back to the path guess. */
        }
    }
    return tag;
}


/*  Fallback: deduce from the file name and the folder path. */
function fromPath(file)
{
    const rel = file.webkitRelativePath || file.name;
    const parts = rel.split("/");
    const base = parts.pop().replace(/\.[a-z0-9]+$/i,"");
    const folder = parts.pop() || "";
    const parent = parts.pop() || "";
    let track = "", artist = "", title = base;
    const seq = base.match(/^\s*(\d{1,2})\s*[-._ ]\s*(.+)$/);
    if(seq) {
        track = seq[1];
        title = seq[2];
    }
    const dash = title.split(/\s+-\s+/);
    if(dash.length >= 2) {
        artist = dash[0].trim();
        title = dash.slice(1).join(" - ").trim();
    }
    return {title, artist: artist || parent || "", album: folder || "", track,
            folder: parts.concat(folder).filter(Boolean).join("/") || "—"};
}


/***************************************************************
 *      2. State
 *
 *  A track's identity has two halves. `uid` is a per-session
 *  number, the handle the DOM and the queue use. `source_id` +
 *  `path` is what SURVIVES: a saved playlist stores those, and
 *  resolves them back to tracks the next time the source is
 *  read (see playlists_store.js).
 ***************************************************************/
const UNKNOWN_ARTIST = "unknown artist";
const UNKNOWN_ALBUM  = "unknown album";
const UNKNOWN_GENRE  = "unknown genre";

const norm = (s) => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const collator = new Intl.Collator(undefined, {sensitivity:"base", numeric:true});
const byTrackNo = (a,b) => (a.track - b.track) || collator.compare(a.title, b.title);

const S = {
    tracks:  [],
    covers:  new Map(),         // album key -> object URL, for painting
    cover_blobs: new Map(),     // album key -> the blob itself, for storing
    uid_seq: 1,
    /*  ingest progress */
    loading: false,
    loaded:  0,
    total:   0,
    retry_for: 0,       // uid whose stale File we already re-fetched once
    autoplay_intent: false,
    seen:    0,         // files the walk handed over, audio or not
    load_name: "",
    load_started: 0,    // Date.now() when the read began
    load_source: "",    // the source being read right now
    cancel:  false,     // stop requested (Stop, or its source was removed)
    notice:  "",        // a message the views show in place (bad pick)
    /*  playback */
    audio:   null,
    queue:   [],
    qi:      -1,
    loaded_uid: 0,      // uid of the track whose file is ON the element
    /*  Where a restored deck has to be cued, and which track that
        position belongs to. The seek waits for the metadata: an element
        that does not know its duration yet cannot be seeked. */
    resume_at:  0,
    resume_uid: 0,
    resolve_denied: false,  // the last resolve failed on permission, not on the file
    /*  Where the queue came from: a saved list, or built by hand. Shown
        on the deck, because "am I listening to my list or to something I
        threw together?" is not a question the user should have to guess. */
    origin:  null,      // {list_id, name} while it is a saved list
    edited:  false,     // …and whether it has been changed since
    /*  A separate element for previews. Clicking a row must never take
        over the queue, so a preview cannot share the queue's player. */
    preview_audio: null,
    preview:  null,     // the track being previewed
    shuffle: false,
    repeat:  false,
    url:     null,
};


/***************************************************************
 *      3. Ingest
 ***************************************************************/
const AUDIO_RE = /\.(mp3|m4a|flac|ogg|opus|wav|aac|wma|mp4|3gp|mid|midi|amr|aiff?)$/i;

/*  Recognise audio by TYPE as well as by name.
 *
 *  A file handed over by Android's Storage Access Framework often
 *  arrives with a display name that carries no usable extension, so
 *  matching the name alone silently rejected a whole phone's music
 *  library — the folder read as "no audio here" or as nothing at all.
 *  The browser already knows the MIME type; ask it too. */
/*  Playlists are typed as audio and are not audio.
 *
 *  A .m3u comes through as "audio/x-mpegurl", so accepting anything
 *  audio/* let every playlist file in a folder appear as a track that
 *  cannot play. Browsers disagree about these types, which is one way
 *  the same folder produces different track counts in Chrome and in
 *  Firefox. */
const NOT_AUDIO_RE = /\.(m3u8?|pls|cue|wpl|asx|xspf|nfo|log|sfv)$/i;
const NOT_AUDIO_TYPES = {
    "audio/x-mpegurl": 1, "audio/mpegurl": 1, "application/vnd.apple.mpegurl": 1,
    "audio/x-scpls": 1, "audio/scpls": 1,
};

function is_audio(f)
{
    const name = f.name || "";
    if(NOT_AUDIO_RE.test(name) || NOT_AUDIO_TYPES[f.type]) {
        return false;
    }
    if(AUDIO_RE.test(name)) {
        return true;
    }
    return !!(f.type && f.type.indexOf("audio/") === 0);
}

function has_library()
{
    return S.tracks.length > 0;
}

function track_count()
{
    return S.tracks.length;
}

/*  Read `files` into the library, tagging every track with the source
    they came from. Returns {ok, count}. */
/*  `cached` maps a path to the tag data already parsed for it in an
    earlier session. A hit means the file is not opened at all — which is
    the difference between a reload that takes a second and one that
    re-reads eight thousand files. A miss (a new or renamed file) is read
    normally, so a rescan still picks up what changed. */
async function ingest(files, source_id, cached)
{
    const list = [...files].filter(is_audio);
    S.seen = [...files].length;
    if(!list.length) {
        /*  A pick with nothing playable in it must not dead-end in
            silence: say it in place and let the user pick again. */
        S.notice = "no audio here";
        emit("library");
        return {ok:false, reason:"no-audio", count:0};
    }

    S.notice = "";
    S.loading = true;
    S.loaded  = 0;
    S.total   = list.length;
    S.load_name = "";
    S.load_started = Date.now();
    S.load_source = source_id || "";
    S.cancel = false;
    emit("loading");

    let last_emit = 0;
    let added = 0;
    for(let i = 0; i < list.length; i++) {
        if(S.cancel) {
            /*  Stop pressed: keep what has been read, drop the rest. */
            break;
        }
        const f = list[i];
        const path = f.webkitRelativePath || f.name;
        let meta = cached ? cached.get(path) : null;

        if(!meta) {
            const guess = fromPath(f);
            const tag = await read_tags(f);

            const album  = (tag.album  || guess.album  || UNKNOWN_ALBUM).trim();
            const artist = (tag.artist || guess.artist || UNKNOWN_ARTIST).trim();
            const albumArtist = (tag.albumArtist || artist).trim();
            const key = norm(albumArtist) + "|" + norm(album);

            if(tag.cover && !S.cover_blobs.has(key)) {
                S.cover_blobs.set(key, tag.cover);
                S.covers.set(key, URL.createObjectURL(tag.cover));
            }

            meta = {
                title: (tag.title || guess.title || f.name).trim(),
                artist, albumArtist, album,
                genre: cleanGenre(tag.genre) || UNKNOWN_GENRE,
                track: parseInt((tag.track || guess.track || "0").split("/")[0], 10) || 0,
                year: (tag.year || "").slice(0,4),
                folder: guess.folder, key
            };
        }

        S.tracks.push({
            uid: S.uid_seq++,
            source_id: source_id || "",
            path: path,
            file: f,
            title: meta.title,
            artist: meta.artist,
            albumArtist: meta.albumArtist,
            album: meta.album,
            genre: meta.genre,
            track: meta.track,
            year: meta.year,
            folder: meta.folder,
            key: meta.key
        });
        added++;

        /*  Report on a clock, not on a file count: a library of five
            thousand tracks would otherwise spend its time repainting
            instead of reading. */
        S.loaded = i + 1;
        S.load_name = f.name;
        const now = Date.now();
        if(now - last_emit > 120 || i === list.length - 1) {
            last_emit = now;
            emit("loading");
            /*  Yield so the progress actually paints between chunks. */
            await new Promise((r) => setTimeout(r));
        }
    }

    const cancelled = S.cancel;
    S.loading = false;
    S.cancel = false;
    S.load_source = "";
    emit("loading");
    emit("library");
    return {ok:true, count:added, cancelled:cancelled};
}

/*  Stop a running read. What was already read stays: the user asked to
    stop waiting, not to throw away the work.

    With a `source_id` it only stops a read of THAT source — used when a
    source is removed while it is being read, so the removal does not
    take down an unrelated scan. */
function cancel_ingest(source_id)
{
    if(!S.loading) {
        return false;
    }
    if(source_id && S.load_source !== source_id) {
        return false;
    }
    S.cancel = true;
    return true;
}

function scan_elapsed()
{
    return S.load_started ? (Date.now() - S.load_started) : 0;
}


/***************************************************************
 *      The tag cache
 *
 *  What a scan produced, in a shape that can be stored and fed
 *  back to the next one. Only what was PARSED — never the File,
 *  which the source keeps itself.
 ***************************************************************/
function tags_of_source(source_id)
{
    let out = [];
    for(const t of S.tracks) {
        if(t.source_id !== source_id) {
            continue;
        }
        out.push([t.path, {
            title: t.title, artist: t.artist, albumArtist: t.albumArtist,
            album: t.album, genre: t.genre, track: t.track, year: t.year,
            folder: t.folder, key: t.key
        }]);
    }
    return out;
}

function covers_snapshot()
{
    return [...S.cover_blobs.entries()];
}


/***************************************************************
 *  Put a source's tracks back WITHOUT touching the disk.
 *
 *  The library is metadata, and metadata is stored. Rebuilding
 *  it needs no folder walk and no file read: a track carries the
 *  path it came from, and the actual File is fetched only when
 *  something is about to be played (see resolve_file below).
 *
 *  `file_of(path)` supplies a File when the source already holds
 *  one — a snapshot source does — and may be omitted, in which
 *  case every track resolves lazily.
 ***************************************************************/
function restore_tracks(source_id, entries, file_of)
{
    for(const [path, meta] of (entries || [])) {
        S.tracks.push({
            uid: S.uid_seq++,
            source_id: source_id || "",
            path: path,
            file: file_of ? (file_of(path) || null) : null,
            title: meta.title,
            artist: meta.artist,
            albumArtist: meta.albumArtist,
            album: meta.album,
            genre: meta.genre,
            track: meta.track,
            year: meta.year,
            folder: meta.folder,
            key: meta.key
        });
    }
    emit("library");
    return (entries || []).length;
}


/***************************************************************
 *  How a track without a File in hand gets one. The sources
 *  module registers this, because only it knows how to walk a
 *  directory handle or where a snapshot keeps its files.
 ***************************************************************/
let file_resolver = null;

function set_file_resolver(fn)
{
    file_resolver = fn;
}

async function resolve_file(t)
{
    if(t.file) {
        return t.file;
    }
    S.resolve_denied = false;
    if(!file_resolver) {
        return null;
    }
    try {
        t.file = await file_resolver(t);
    } catch(e) {
        /*  A folder still waiting to be authorised is not a broken file,
            and must not be reported as one. */
        S.resolve_denied = !!e && e.name === "NotAllowedError";
        t.file = null;
    }
    return t.file;
}

/*  Cover art comes back from store as blobs; turn them into the object
    URLs the views paint from. Without this a cached scan would show
    every album with the fallback glyph. */
function prime_covers(entries)
{
    for(const [key, blob] of (entries || [])) {
        if(!blob || S.covers.has(key)) {
            continue;
        }
        S.cover_blobs.set(key, blob);
        S.covers.set(key, URL.createObjectURL(blob));
    }
}

/*  A source was removed or is being rescanned: forget its tracks, and
    take them out of the queue too — a queue entry whose file is gone
    would just fail to play. */
function drop_source_tracks(source_id)
{
    if(!source_id) {
        return;
    }
    let before = S.tracks.length;
    S.tracks = S.tracks.filter((t) => t.source_id !== source_id);
    if(S.tracks.length === before) {
        return;
    }

    let cur = S.queue[S.qi] || null;
    let kept = S.queue.filter((t) => t.source_id !== source_id);
    if(kept.length !== S.queue.length) {
        S.queue = kept;
        S.qi = cur ? kept.indexOf(cur) : -1;
        if(S.qi < 0) {
            stop_playback();
        }
        emit("queue");
    }
    emit("library");
}

function clear_notice()
{
    if(S.notice) {
        S.notice = "";
        emit("library");
    }
}


/***************************************************************
 *      4. Groupings and search
 ***************************************************************/
function group_by(fn)
{
    const m = new Map();
    for(const t of S.tracks) {
        const k = fn(t);
        if(!m.has(k)) {
            m.set(k, []);
        }
        m.get(k).push(t);
    }
    return [...m.entries()].sort((a,b) => collator.compare(a[0], b[0]));
}

/*  view: "artists" | "genres" | "folders" -> [{name, tracks}]  */
function groups_for(view)
{
    const fn = view === "artists" ? (t => t.albumArtist)
             : view === "genres"  ? (t => t.genre)
             : (t => t.folder);
    return group_by(fn).map(([name, tracks]) => ({name, tracks}));
}

function albums()
{
    return group_by(t => t.album).map(([name, tracks]) => ({name, tracks}));
}

function all_tracks_sorted()
{
    return [...S.tracks].sort((a,b) => collator.compare(a.title, b.title));
}

function search(query)
{
    const q = norm(query);
    if(!q) {
        return [];
    }
    return S.tracks.filter((t) =>
        norm(t.title).includes(q) || norm(t.artist).includes(q) ||
        norm(t.album).includes(q) || norm(t.genre).includes(q));
}

function cover_url(key)
{
    return S.covers.get(key) || null;
}

/*  Ordered the way a folder reads: by folder, then track number, then
    title. The browser hands entries over in whatever order it likes —
    reverse, as it turns out — and queueing a whole source backwards is
    not what anyone means by "add this folder". */
function tracks_of_source(source_id)
{
    return S.tracks
        .filter((t) => t.source_id === source_id)
        .sort((a, b) => collator.compare(a.folder, b.folder) || byTrackNo(a, b));
}

/*  Resolve a saved playlist entry back to a live track. */
function find_track(source_id, path)
{
    return S.tracks.find((t) => t.source_id === source_id && t.path === path) || null;
}


/***************************************************************
 *      5. The queue — the deck the user curates
 ***************************************************************/
function queue_tracks()
{
    return S.queue;
}

/*  What the deck is: a saved list, or a queue built by hand. */
function queue_origin()
{
    return S.origin ? {list_id: S.origin.list_id, name: S.origin.name,
                       edited: S.edited} : null;
}

function set_queue_origin(list_id, name)
{
    S.origin = (list_id && name) ? {list_id: list_id, name: name} : null;
    S.edited = false;
    emit("queue");
}

/*  Any hand edit detaches the queue from the list it came from — not by
    forgetting it, but by saying so. Silently letting "my list" mean
    something the user has since changed is worse than either. */
function mark_edited()
{
    if(S.origin && !S.edited) {
        S.edited = true;
    }
}

function queue_index()
{
    return S.qi;
}

function queue_length()
{
    return S.queue.length;
}

/*  mode: "append" (default) | "next" | "replace" */
function queue_add(list, mode)
{
    if(!list || !list.length) {
        return 0;
    }
    if(mode === "replace") {
        S.queue = [...list];
        S.qi = -1;
        S.origin = null;
        S.edited = false;
        emit("queue");
        queue_play_at(0);
        return list.length;
    }
    mark_edited();
    let at;
    if(mode === "next" && S.qi >= 0) {
        at = S.qi + 1;
        S.queue.splice(at, 0, ...list);
    } else {
        at = S.queue.length;
        S.queue.push(...list);
    }
    emit("queue");
    /*  An idle deck gets ARMED, not started: the first added track is
        cued and waits for Play. Loading a deck and starting it are two
        deliberate acts, and only "replace" (an explicit Play from the
        library) is the second one. */
    if(S.qi < 0) {
        S.qi = at;
        load_current(false);
    }
    return list.length;
}

function queue_remove_at(i)
{
    mark_edited();
    if(i < 0 || i >= S.queue.length) {
        return;
    }
    let was_current = (i === S.qi);
    S.queue.splice(i, 1);

    if(was_current) {
        if(!S.queue.length) {
            S.qi = -1;
            stop_playback();
        } else {
            /*  Slide onto whatever took its place (or the new last one). */
            S.qi = Math.min(i, S.queue.length - 1);
            load_current(is_playing());
        }
    } else if(i < S.qi) {
        S.qi--;
    }
    emit("queue");
}

function queue_move(from, to)
{
    mark_edited();
    if(from === to) {
        return;
    }
    if(from < 0 || from >= S.queue.length || to < 0 || to >= S.queue.length) {
        return;
    }
    let cur = S.queue[S.qi] || null;
    let [item] = S.queue.splice(from, 1);
    S.queue.splice(to, 0, item);
    if(cur) {
        S.qi = S.queue.indexOf(cur);
    }
    emit("queue");
}

function queue_clear()
{
    S.queue = [];
    S.qi = -1;
    S.origin = null;
    S.edited = false;
    stop_playback();
    emit("queue");
}

function queue_play_at(i)
{
    if(i < 0 || i >= S.queue.length) {
        return;
    }
    S.qi = i;
    load_current(true);
}


/***************************************************************
 *      Preview — listening without committing
 *
 *  Clicking a row must not hijack what is playing. A preview
 *  runs on its own element, pauses the queue while it sounds,
 *  and leaves the queue exactly where it was. From it the track
 *  can be added to the queue, which is the whole point: hear it
 *  first, decide after.
 ***************************************************************/
function get_preview_audio()
{
    if(!S.preview_audio) {
        S.preview_audio = new Audio();
        /*  Same channel as the queue's clock: whoever is painting a
            position repaints, and each asks for the one it owns. */
        /*  A preview is also something that is sounding, so the
            visualizer follows it too. */
        S.preview_audio.addEventListener("play", () => attach_analyser(S.preview_audio));
        S.preview_audio.addEventListener("timeupdate", () => {
            attach_analyser(S.preview_audio);
            emit("time");
        });
        S.preview_audio.addEventListener("ended", () => stop_preview());
        S.preview_audio.addEventListener("error", () => {
            let err = S.preview_audio.error;
            if(!S.preview_audio.src || (err && err.code === 1)) {
                return;                             // an abort, not a failure
            }
            S.notice = "that file could not be read";
            stop_preview();
            emit("library");
        });
    }
    return S.preview_audio;
}

async function preview_track(t)
{
    if(!t) {
        return;
    }
    /*  Two things sounding at once helps nobody. */
    if(S.audio && !S.audio.paused) {
        S.audio.pause();
    }
    const file = await resolve_file(t);
    if(!file) {
        S.notice = "that file could not be read";
        emit("library");
        return;
    }
    const a = get_preview_audio();
    const stale_preview = S.preview_url;
    S.preview_url = URL.createObjectURL(file);
    S.preview = t;
    a.src = S.preview_url;
    if(stale_preview) {
        setTimeout(() => URL.revokeObjectURL(stale_preview), 1000);
    }
    a.play().catch(() => {});
    emit("preview");
}

function stop_preview()
{
    if(S.preview_audio) {
        S.preview_audio.pause();
        S.preview_audio.removeAttribute("src");
        S.preview_audio.load();
    }
    if(S.preview_url) {
        URL.revokeObjectURL(S.preview_url);
        S.preview_url = null;
    }
    S.preview = null;
    emit("preview");
}

function previewing()
{
    return S.preview;
}


/***************************************************************
 *      The deck, across a reload
 *
 *  Stored as references, like everything else here: which list
 *  it came from (or none), the (source, path) of each track,
 *  which one it was on and how far into it. Closing a tab in the
 *  middle of a record and coming back to the top of the queue is
 *  the kind of small betrayal that makes an app feel careless.
 ***************************************************************/
function queue_snapshot()
{
    return {
        origin: S.origin,
        edited: S.edited,
        index:  S.qi,
        time:   (S.audio && isFinite(S.audio.currentTime)) ? S.audio.currentTime : 0,
        items:  S.queue.map((t) => ({source_id: t.source_id, path: t.path})),
    };
}

/*  Restored PAUSED and cued at the stored position: coming back to a
    page that starts making noise on its own is worse than not restoring
    at all — and browsers block it anyway without a gesture. */
function restore_queue(snap)
{
    if(!snap || !snap.items || !snap.items.length) {
        return 0;
    }
    let tracks = [];
    for(const it of snap.items) {
        let t = find_track(it.source_id, it.path);
        if(t) {
            tracks.push(t);
        }
    }
    if(!tracks.length) {
        return 0;
    }
    S.queue = tracks;
    S.origin = snap.origin || null;
    S.edited = !!snap.edited;
    /*  The index refers to the queue as it was; entries whose source is
        gone are dropped, so clamp rather than trust it. */
    S.qi = Math.max(0, Math.min(snap.index || 0, tracks.length - 1));
    /*  The position is CUED, not applied here. Setting `currentTime` on
        an element that has not read a byte yet does not seek: it only
        moves the "default playback start position", so the transport
        showed the old position over a track that was never loaded — and
        on a phone that is the normal case, because the folders are not
        authorised yet at start up. The seek happens on `loadedmetadata`,
        which is the first moment the element knows where it can go. */
    S.resume_at = snap.time || 0;
    S.resume_uid = tracks[S.qi].uid;
    emit("queue");
    load_current(false).then(function() {
        emit("playing");
    });
    return tracks.length;
}

/*  Cue the restored position, once and on the right track. */
function apply_resume()
{
    const t = S.queue[S.qi];
    if(!S.resume_at || !t || t.uid !== S.resume_uid || !S.audio) {
        return;
    }
    const dur = S.audio.duration;
    if(!isFinite(dur) || dur <= 0) {
        return;
    }
    try {
        S.audio.currentTime = Math.max(0, Math.min(S.resume_at, dur - 0.25));
    } catch(e) {
        /*  Not seekable; the position is simply lost. */
    }
    S.resume_at = 0;
    S.resume_uid = 0;
}

/*  The folder was authorised AFTER the deck was restored.
 *
 *  On Android the permission on a folder never survives a launch, so at
 *  start up the track resolves to nothing and the element is left empty:
 *  a play button that does nothing and a total stuck at 0:00, until the
 *  user changes track and comes back. Granting the permission is the
 *  event that makes the file readable, so that is when the load is done
 *  again — with the stored position still pending, so nothing is lost. */
function reload_current()
{
    const t = S.queue[S.qi];
    if(!t || (S.loaded_uid === t.uid && S.audio && S.audio.src)) {
        return;
    }
    load_current(false);
}


/***************************************************************
 *      6. Playback
 ***************************************************************/
function get_audio()
{
    if(!S.audio) {
        S.audio = new Audio();
        S.audio.preload = "metadata";
        /*  The tap is RETRIED here, not only taken on `play`.
         *
         *  Taking it needs the AudioContext to be running, and the
         *  first play is not always the moment that happens: a context
         *  can still be suspended when the handler runs, and if that
         *  one attempt is all there is, the visualizer stays blank for
         *  the rest of the session with no way back. This costs a Map
         *  lookup four times a second and nothing at all once the tap
         *  exists. */
        S.audio.addEventListener("timeupdate", () => {
            attach_analyser(S.audio);
            emit("time");
        });
        S.audio.addEventListener("ended", () => step(1));
        /*  The visualizer's tap is taken HERE and nowhere else: it can
            only be taken while the context is allowed to run, and a
            `play` handler is the one place we are certainly inside the
            gesture that granted it. See analyser.js. */
        S.audio.addEventListener("play",  () => {
            attach_analyser(S.audio);
            emit("playing");
        });
        S.audio.addEventListener("pause", () => emit("playing"));
        S.audio.addEventListener("canplay", () => { S.retry_for = 0; });
        /*  Metadata is the moment the element learns how long the track
            is, and it arrives well after the src was set — on a phone,
            not until the file is really being read. Two things wait for
            it: the total on the transport, which otherwise sits at 0:00
            for a track nobody has played yet, and the seek of a restored
            position. `timeupdate` alone did not cover it: it only fires
            while something is playing, which a restored deck is not. */
        S.audio.addEventListener("loadedmetadata", function() {
            apply_resume();
            emit("time");
        });
        S.audio.addEventListener("durationchange", () => emit("time"));
        S.audio.addEventListener("error", () => {
            /*  Swapping the source aborts whatever was loading, and an
                abort is not a broken file. Reporting it would put "that
                file could not be read" on screen every time the user
                changed track. */
            let err = S.audio.error;
            if(!S.audio.src || (err && err.code === 1)) {   // MEDIA_ERR_ABORTED
                return;
            }
            /*  A File is a snapshot of what was on disk when it was
                handed over. Re-tag a track, re-encode it, replace it —
                and the reference we are holding no longer matches, which
                the browser reports as a load failure. We know how to get
                a fresh one, so get one before declaring the file
                unreadable. */
            const t = S.queue[S.qi];
            if(t && S.retry_for !== t.uid) {
                S.retry_for = t.uid;
                t.file = null;
                load_current(S.autoplay_intent);
                return;
            }
            S.notice = "that file could not be read";
            emit("library");
        });
    }
    return S.audio;
}

function current_track()
{
    return S.queue[S.qi] || null;
}

function is_playing()
{
    return !!S.audio && !S.audio.paused;
}

function stop_playback()
{
    if(S.audio) {
        S.audio.pause();
        S.audio.removeAttribute("src");
        S.audio.load();
    }
    S.loaded_uid = 0;
    if(S.url) {
        URL.revokeObjectURL(S.url);
        S.url = null;
    }
    emit("playing");
}

/*  A restored track carries a path, not a File: the library is rebuilt
    from stored metadata and the disk is only touched when something is
    actually going to be played. Resolving can fail — the folder may be
    un-authorised since, or the file moved — and that is reported rather
    than left as a player that does nothing. */
async function load_current(autoplay)
{
    const t = S.queue[S.qi];
    if(!t) {
        return;
    }
    /*  A position restored for one track means nothing on another. */
    if(S.resume_uid && S.resume_uid !== t.uid) {
        S.resume_at = 0;
        S.resume_uid = 0;
    }
    if(S.preview) {
        stop_preview();
    }

    const file = await resolve_file(t);
    if(!file) {
        S.loaded_uid = 0;
        /*  A folder waiting to be authorised is not an unreadable file.
            The bar asking for the permission is already on screen, and a
            message contradicting it only confuses; the load is armed
            again the moment the permission arrives (reload_current). */
        if(!S.resolve_denied) {
            S.notice = "that file could not be read";
            emit("library");
        }
        emit("playing");
        return;
    }

    /*  The queue can have moved on while that was resolving. */
    if(S.queue[S.qi] !== t) {
        return;
    }

    const audio = get_audio();
    /*  Revoke the PREVIOUS url only once the new one is in place. Doing
        it first pulls the ground out from under a load still in flight,
        which surfaces as a network error and, worse, as a false "that
        file could not be read". */
    S.autoplay_intent = !!autoplay;
    const stale = S.url;
    S.url = URL.createObjectURL(file);
    audio.src = S.url;
    S.loaded_uid = t.uid;
    if(stale) {
        setTimeout(() => URL.revokeObjectURL(stale), 1000);
    }
    if(autoplay) {
        audio.play().catch(() => {});
    }
    update_media_session(t);
    emit("playing");
}

function toggle()
{
    if(!S.queue.length) {
        return;
    }
    if(S.qi < 0) {
        queue_play_at(0);
        return;
    }
    const audio = get_audio();
    /*  Play on a track that never got loaded — its folder was not
        authorised when the deck came back — has to load it first.
        Calling play() on an empty element is silence and nothing
        else, which is exactly how it looked. */
    if(!audio.src || S.loaded_uid !== S.queue[S.qi].uid) {
        load_current(true);
        return;
    }
    if(audio.paused) {
        audio.play().catch(() => {});
    } else {
        audio.pause();
    }
}

/*  Shuffle picks the NEXT track at random instead of reordering the
    queue: what the user sees on the deck stays exactly as they built
    it, which is the whole point of curating it by hand. */
function pick_random_index()
{
    if(S.queue.length < 2) {
        return 0;
    }
    let i = S.qi;
    while(i === S.qi) {
        i = Math.floor(Math.random() * S.queue.length);
    }
    return i;
}

function step(n)
{
    if(!S.queue.length) {
        return;
    }
    if(S.shuffle && n > 0) {
        S.qi = pick_random_index();
        load_current(true);
        return;
    }
    let i = S.qi + n;
    if(i >= S.queue.length) {
        if(!S.repeat) {
            get_audio().pause();
            return;
        }
        i = 0;
    }
    if(i < 0) {
        i = S.queue.length - 1;
    }
    S.qi = i;
    load_current(true);
}

/*  Back button: restart the track if we are past the intro, else go back. */
function prev()
{
    const audio = get_audio();
    if(audio.currentTime > 3) {
        audio.currentTime = 0;
    } else {
        step(-1);
    }
}

function seek_fraction(fraction)
{
    const audio = get_audio();
    if(!audio.duration) {
        return;
    }
    audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
}

function set_shuffle(on)
{
    S.shuffle = !!on;
    emit("playing");
}

function get_shuffle()
{
    return S.shuffle;
}

function set_repeat(on)
{
    S.repeat = !!on;
    emit("playing");
}

function get_repeat()
{
    return S.repeat;
}

function progress()
{
    const audio = get_audio();
    const dur = audio.duration || 0;
    return {
        current: audio.currentTime || 0,
        duration: dur,
        fraction: dur ? (audio.currentTime / dur) : 0,
    };
}

/*  A preview sounds on its own element, so it has its own clock — and
    the strip that shows it must read THAT one. Asking `progress()` gave
    the position of the queue track, which is paused underneath: the bar
    sat frozen wherever the queue was left, and a click on it seeked
    music nobody was listening to.

    The deck keeps reading `progress()` on purpose. Down there the
    transport still belongs to the queue, and it should go on showing
    where the queue is waiting. */
function preview_progress()
{
    const audio = S.preview_audio;
    const dur = (audio && audio.duration) || 0;
    return {
        current: (audio && audio.currentTime) || 0,
        duration: dur,
        fraction: dur ? (audio.currentTime / dur) : 0,
    };
}

function seek_preview_fraction(fraction)
{
    const audio = S.preview_audio;
    if(!audio || !audio.duration) {
        return;
    }
    audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
}

function queue_position()
{
    return {index: S.qi, length: S.queue.length};
}

function update_media_session(t)
{
    if(!("mediaSession" in navigator)) {
        return;
    }
    const url = cover_url(t.key);
    navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.artist, album: t.album,
        artwork: url ? [{src:url, sizes:"512x512", type:"image/jpeg"}] : []
    });
}

function setup_media_session()
{
    if(!("mediaSession" in navigator)) {
        return;
    }
    navigator.mediaSession.setActionHandler("play",  () => get_audio().play());
    navigator.mediaSession.setActionHandler("pause", () => get_audio().pause());
    navigator.mediaSession.setActionHandler("previoustrack", prev);
    navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
}


/***************************************************************
 *      7. Time formatting
 ***************************************************************/
function fmt_time(s)
{
    return isFinite(s)
        ? Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,"0")
        : "0:00";
}


/***************************************************************
 *              Exports
 ***************************************************************/
export {
    subscribe,
    /*  library */
    has_library,
    track_count,
    ingest,
    cancel_ingest,
    scan_elapsed,
    is_audio,
    tags_of_source,
    covers_snapshot,
    prime_covers,
    restore_tracks,
    set_file_resolver,
    drop_source_tracks,
    clear_notice,
    groups_for,
    albums,
    all_tracks_sorted,
    search,
    cover_url,
    tracks_of_source,
    find_track,
    /*  ingest progress (read S through getters) */
    S as store_state,
    /*  queue */
    queue_tracks,
    queue_origin,
    set_queue_origin,
    queue_index,
    queue_length,
    queue_add,
    queue_remove_at,
    queue_move,
    queue_clear,
    queue_play_at,
    /*  playback */
    get_audio,
    current_track,
    is_playing,
    toggle,
    step,
    prev,
    seek_fraction,
    set_shuffle,
    get_shuffle,
    set_repeat,
    get_repeat,
    progress,
    queue_position,
    setup_media_session,
    fmt_time,
    /*  preview */
    preview_track,
    stop_preview,
    previewing,
    preview_progress,
    seek_preview_fraction,
    /*  the deck across a reload */
    queue_snapshot,
    restore_queue,
    reload_current,
};
