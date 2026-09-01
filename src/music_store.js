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
import {diag} from "./diag.js";


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


const SEQ_RE = /^\s*(\d{1,2})\s*[-._ ]\s*(.+)$/;

/*  DOES THIS FOLDER NAME ITS FILES "artist - title"?
 *
 *  One file name cannot say. "Gloria Estefan - Conga" and
 *  "The boy's burial - Pran sees the red cross" have the same shape and
 *  mean opposite things: the first names its artist, the second is one
 *  title with a dash in it, and reading the second the first way put a
 *  track of "The Killing Fields" under an artist called "The boy's
 *  burial" — one file split off from the record it belongs to.
 *
 *  The FOLDER can say. A folder names its files one way: a compilation
 *  writes "artist - title" on all of them, a record writes the title.
 *  So when hardly any file in a folder carries a dashed head, the one
 *  that does is not naming an artist.
 *
 *  Measured over one real 8,176-file library, and both halves matter.
 *  Requiring BOTH signals — a leading track number, which already says
 *  "track N of a record", AND a folder where fewer than one file in
 *  five is dashed — moves 20 tracks, every one of them a song wrongly
 *  filed as a performer: "Speak To Me", "North Star", "QE2", "Love Over
 *  Gold", "The More We Live". It leaves all 1,209 others alone, which is
 *  the half that took three tries to get right: a folder majority vote
 *  filed Gloria Estefan under "abba, varios", and trusting the title tag
 *  instead unmade "mr. mister" wherever a tagger had copied the whole
 *  file name into the title. Neither ships. This does nothing unless the
 *  folder itself is evidence.
 */
function dash_convention(paths)
{
    const tally = new Map();
    for(const rel of (paths || [])) {
        const parts = String(rel || "").split("/");
        const base = parts.pop().replace(/\.[a-z0-9]+$/i, "");
        const dir = parts.filter(Boolean).join("/");
        const m = base.match(SEQ_RE);
        const rest = m ? m[2] : base;
        let t = tally.get(dir);
        if(!t) {
            t = {n: 0, dashed: 0};
            tally.set(dir, t);
        }
        t.n++;
        if(rest.split(/\s+-\s+/).length >= 2) {
            t.dashed++;
        }
    }
    /*  Unknown folder, or dashes that are not rare: read the name the
        way it has always been read. The folder has to EARN the doubt. */
    return function(dir) {
        const t = tally.get(dir);
        return !t || t.dashed * 5 >= t.n;
    };
}

/*  Fallback: deduce from the file name and the folder path.
    `names_artists` is dash_convention()'s answer for a folder; without
    one every name is read as it always was. */
function fromPath(file, names_artists)
{
    const rel = file.webkitRelativePath || file.name;
    const parts = rel.split("/");
    const base = parts.pop().replace(/\.[a-z0-9]+$/i,"");
    /*  READ, not popped. Taking the parent off the array dropped it out
        of the path rebuilt below, so `folder` came out missing a level:
        "messy/Aqualung" for a file living in "messy/Jethro Tull/
        Aqualung". Nothing showed it until something tried to walk the
        tree with it. */
    const folder = parts[parts.length - 1] || "";
    const parent = parts[parts.length - 2] || "";
    const dir = parts.filter(Boolean).join("/");
    let track = "", artist = "", title = base;
    const seq = base.match(SEQ_RE);
    if(seq) {
        track = seq[1];
        title = seq[2];
    }
    const dash = title.split(/\s+-\s+/);
    /*  A number at the head already said "track N of a record", so what
        follows is the title — unless this folder does write its artists
        into the file names, which a compilation does. */
    const heads_an_artist = !seq || !names_artists || names_artists(dir);
    if(dash.length >= 2 && heads_an_artist) {
        artist = dash[0].trim();
        title = dash.slice(1).join(" - ").trim();
    }
    return {title, artist: artist || parent || "", album: folder || "", track,
            folder: dir || "—"};
}


/***************************************************************
 *      A TAG THAT SAYS NOTHING
 *
 *  A tag is a CLAIM about the file, and some taggers claim
 *  nothing: they write boilerplate into the field and move on.
 *  The app believed all of it, so a folder came out as eleven
 *  rows of which two read "AlbumWrap Album", twice, with the
 *  artist "AlbumWrap - King Crimson" — a name that belongs to a
 *  program, not to a band. Meanwhile the file was called
 *  "King Crimson - Live at the Jazz Cafe (Albumwrap).mp3", which
 *  says the whole thing.
 *
 *  Counted over one real 8,176-file library, which is where every
 *  pattern below comes from and the only reason any of them is
 *  here:
 *
 *      title  "AlbumWrap Album"          19 files, all identical
 *      title  "Track 07", "Pista 4",     ~200 files, a number
 *             "AudioTrack 06"                  where a name goes
 *      artist "AlbumWrap - <artist>"      19 files
 *      artist "artist"                   123 files
 *      album  "title"                    133 files
 *      artist/album "Unknown"             35 files each
 *
 *  The last three are a tagger writing the FIELD'S OWN NAME, or
 *  the word for not knowing, into the field. "Unknown" spelled
 *  out is the same answer the app already has a word for, so it
 *  is folded into that one rather than left to stand beside it as
 *  a second group in English.
 *
 *  What is NOT touched: "Various Artists" and "Varios". A
 *  compilation really is by various artists — that is an answer,
 *  and a short one is not the same as a missing one.
 ***************************************************************/

/*  "AlbumWrap - King Crimson" is King Crimson, wrapped. The band
    is the part after the tool's name. */
const ALBUMWRAP_RE = /^\s*albumwrap\s*-\s*/i;

/*  The same tool signs the FILE too — "… (Albumwrap).mp3",
    "…_ALBW.mp3" — and that signature is not part of the name of
    the record either. Only a trailing one: "Live Detroit (13 Nov
    1971 ENTIRE ALBW)" is somebody's own note about the file and
    is left as they wrote it. */
const ALBW_TAIL_RE = /[\s_-]*[([]?\s*albumwrap\s*[)\]]?\s*$|[\s_-]+albw\s*$/i;

function unwrap(s)
{
    const out = String(s || "").replace(ALBUMWRAP_RE, "").trim();
    return out || String(s || "").trim();
}

function unsign(s)
{
    const out = String(s || "").replace(ALBW_TAIL_RE, "").trim();
    return out || String(s || "").trim();
}

/*  A title that is the word "track" and a number is the position
    the row already shows. Spanish and the odd "AudioTrack" are in
    the list because they are in the library. Matched against the
    NORMALISED value, so the accent of "canción" is already gone. */
const NUMBERED_RE =
    /^(track|trk|pista|tema|audio\s*track|audiotrack|cancion)\s*[-_.#:]*\s*\d*$/;

const SAYS_NOTHING = {
    "albumwrap album": 1,
    "title": 1, "artist": 1, "album": 1, "genre": 1,
    "unknown": 1, "unknown artist": 1, "unknown album": 1,
    "<unknown>": 1, "(unknown)": 1, "unknown title": 1,
    "untitled": 1, "sin titulo": 1, "no title": 1,
    "no artist": 1, "no album": 1, "sin artista": 1,
    "none": 1, "n/a": 1, "-": 1,
};

function says_nothing(s)
{
    const v = norm(String(s || "")).trim().replace(/\s+/g, " ");
    if(!v) {
        return true;
    }
    return !!SAYS_NOTHING[v] || NUMBERED_RE.test(v);
}

/*  The number inside "Track 07" — the one thing such a title does
    say, and worth keeping when nothing else supplies it. */
function number_in(s)
{
    const m = String(s || "").match(/(\d+)\s*$/);
    return m ? m[1] : "";
}

/*  A name off the FILE is only better than a bad tag if it is a
    name. "06.mp3" reduces to "06", which is exactly as mute as
    the "Track 06" it would replace — so that swap is not made.
    Any LETTER, in any script: this app is read in ten languages
    and a title in Japanese is a title. */
function is_a_name(s)
{
    return /\p{L}/u.test(String(s || ""));
}

/*  What the three fields really say, given the tag and what the
 *  file is called. Pure, and given the stored values it returns
 *  them unchanged when they were fine — which is what lets a
 *  library that was already read be corrected on the way in
 *  rather than by reading eight thousand files again. */
function meaningful(tag, guess)
{
    let title = String(tag.title || "").trim();
    let artist = unwrap(tag.artist);
    let album = unwrap(tag.album);

    /*  An EMPTY tag was always answered with the file name, and
        still is. A tag that is present but mute is only worth
        overruling when the file name is better than it — see
        is_a_name. */
    if(says_nothing(title)) {
        if(is_a_name(guess.title) || !title) {
            title = unsign(String(guess.title || "").trim()) || title;
        }
    }
    if(says_nothing(artist)) {
        artist = (is_a_name(guess.artist) || !artist)
            ? String(guess.artist || "").trim() : "";
    }
    if(says_nothing(album)) {
        album = (is_a_name(guess.album) || !album)
            ? String(guess.album || "").trim() : "";
    }
    return {title, artist, album};
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
    said:    null,      // {added, already} — what the last add did, for the shell
    /*  THE TEMPORARY LIST.
     *
     *  What the user is looking at in the library is already a list —
     *  an album, a genre, a folder, the tracks of one artist — and
     *  pressing play on it must not cost them the deck. So it plays
     *  here: its own element, its own list, its own position, running
     *  beside the deck while the deck waits exactly where it was.
     *
     *  It runs ON, to the end of what is on the screen, because that is
     *  what a list means. Stopping dead after one track was the old
     *  behaviour and it was the wrong shape: nobody presses play on an
     *  album to hear its first song.
     *
     *  The way back is one button on the strip the two of them share. */
    temp_audio: null,
    temp:    null,      // the track sounding out of it
    temp_list: [],      // the list as it is on the screen, in that order
    temp_i:  -1,        // where in it
    temp_resume: false, // the deck was playing when this took over
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
/*  A read is starting, but there is nothing to count yet.
 *
 *  Between "this folder is being read" and the first file, the tree is
 *  being walked — long, on a real music folder, and it produces no
 *  numbers. The counters still held the LAST folder's, so the bar
 *  showed the new folder's name beside "300 / 300" and a full bar,
 *  before a single file of it had been opened. Zeroed here, the bar
 *  goes back to what is true: reading, and not yet countable. */
function begin_read(source_id)
{
    S.loading = true;
    S.loaded  = 0;
    S.total   = 0;
    S.load_name = "";
    S.load_source = source_id || "";
    S.load_started = Date.now();
    emit("loading");
}

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

    /*  What each FOLDER in this read looks like, decided once over the
        whole list: a file name alone cannot say whether "A - B" is an
        artist and a title or one title with a dash in it. */
    const names_artists = dash_convention(
        list.map((f) => f.webkitRelativePath || f.name));

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
            const guess = fromPath(f, names_artists);
            const tag = await read_tags(f);
            const said = meaningful(tag, guess);

            const album  = said.album  || UNKNOWN_ALBUM;
            const artist = said.artist || UNKNOWN_ARTIST;
            let albumArtist = unwrap(tag.albumArtist);
            if(says_nothing(albumArtist)) {
                albumArtist = artist;
            }
            const key = norm(albumArtist) + "|" + norm(album);

            if(tag.cover && !S.cover_blobs.has(key)) {
                S.cover_blobs.set(key, tag.cover);
                S.covers.set(key, URL.createObjectURL(tag.cover));
            }

            meta = {
                title: said.title || f.name.trim(),
                artist, albumArtist, album,
                genre: cleanGenre(tag.genre) || UNKNOWN_GENRE,
                /*  "Track 07" is a bad name and a good number: the
                    position is the one thing it does state, so it is
                    kept when nothing else supplies it. */
                track: parseInt((tag.track || guess.track ||
                                 number_in(tag.title) || "0")
                                .split("/")[0], 10) || 0,
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
/*  A library READ BY AN EARLIER BUILD carries the noise this one
 *  filters: "AlbumWrap Album" is what got stored, and startup restores
 *  the metadata rather than reading the files again — so without this
 *  the fix would only reach a library somebody thought to rescan, which
 *  on eight thousand files is not a thing to ask for a spelling.
 *
 *  It is affordable because the filter is a pure function of the
 *  metadata and the PATH, and the path is stored: it can run on the way
 *  out of the database exactly as it runs on the way in. Nothing is
 *  written back — it costs string work over what is already in memory,
 *  and doing it every start is cheaper than an extra write of every
 *  source.
 *
 *  The cover is filed under the album key, and correcting the album
 *  changes that key, so the sleeve moves with it. Otherwise every album
 *  this straightened out would go blank until a full rescan.
 */
function corrected(stored, path, names_artists)
{
    const guess = fromPath({webkitRelativePath: path, name: path},
                           names_artists);
    const said = meaningful(stored, guess);

    const album  = said.album  || UNKNOWN_ALBUM;
    const artist = said.artist || UNKNOWN_ARTIST;
    let albumArtist = unwrap(stored.albumArtist);
    if(says_nothing(albumArtist)) {
        albumArtist = artist;
    }
    const title = said.title || stored.title || "";
    const key = norm(albumArtist) + "|" + norm(album);

    if(title === stored.title && artist === stored.artist &&
       albumArtist === stored.albumArtist && album === stored.album &&
       key === stored.key) {
        return stored;
    }
    move_cover(stored.key, key);
    return {...stored, title, artist, albumArtist, album, key,
            track: stored.track ||
                   parseInt(number_in(stored.title) || "0", 10) || 0};
}

function move_cover(from, to)
{
    if(!from || !to || from === to || S.covers.has(to)) {
        return;
    }
    if(S.cover_blobs.has(from)) {
        S.cover_blobs.set(to, S.cover_blobs.get(from));
    }
    if(S.covers.has(from)) {
        S.covers.set(to, S.covers.get(from));
    }
}

function restore_tracks(source_id, entries, file_of)
{
    /*  The same folder-wide question as a read asks, from the paths
        that were stored — see dash_convention. */
    const names_artists = dash_convention((entries || []).map((e) => e[0]));

    for(const [path, stored] of (entries || [])) {
        const meta = corrected(stored, path, names_artists);
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
/*  Grouped on a NORMALISED key, and labelled with the spelling most of
 *  the tracks in the group actually carry.
 *
 *  Tags in a real library are not consistent, and the Map above keys on
 *  the raw string: "Aqualung", "aqualung" and "Aqualung " went into
 *  three buckets and came out as three rows with, to the eye, the same
 *  name. The sort then put them next to each other, which made it read
 *  less like a bug and more like the library being wrong about itself.
 *
 *  `id` is the normalised key and is what a drill-down must hold on to.
 *  The name cannot be: two albums may legitimately share one. */
/*  The spelling most of these tracks carry, and on a tie the one that
    came first. Anything is better than picking at random and having a
    name change between repaints. */
function most_common(tracks, of)
{
    const counts = new Map();
    for(const t of tracks) {
        const v = of(t);
        counts.set(v, (counts.get(v) || 0) + 1);
    }
    let best = "";
    let n = -1;
    for(const [v, c] of counts) {
        if(c > n) {
            n = c;
            best = v;
        }
    }
    return best;
}

function group_by_norm(tracks, id_of, label_of)
{
    const m = new Map();
    for(const t of tracks) {
        const k = id_of(t);
        let g = m.get(k);
        if(!g) {
            g = {id: k, tracks: []};
            m.set(k, g);
        }
        g.tracks.push(t);
    }
    const out = [];
    for(const g of m.values()) {
        out.push({id: g.id, name: most_common(g.tracks, label_of), tracks: g.tracks});
    }
    return out.sort((a, b) => collator.compare(a.name, b.name));
}

/*  view: "artists" | "genres" | "folders" -> [{id, name, tracks}]  */
function groups_for(view)
{
    if(view === "artists") {
        return group_by_norm(S.tracks, (t) => norm(t.albumArtist), (t) => t.albumArtist);
    }
    if(view === "genres") {
        return group_by_norm(S.tracks, (t) => norm(t.genre), (t) => t.genre);
    }
    /*  A folder is a path, and a path is already exact — there is no
        spelling of it to disagree about. */
    return group_by_norm(S.tracks, (t) => t.folder, (t) => t.folder);
}

/*  An album is an (artist, album) PAIR, never a title on its own.
 *
 *  Grouped by title alone, every "Greatest Hits" in a library collapsed
 *  into one album by nobody in particular, and one album tagged two ways
 *  split into two. `key` is already exactly the right thing — the
 *  normalised album artist and the normalised album — and it is what the
 *  covers are filed under, so a group and its sleeve cannot disagree. */
function albums()
{
    /*  How each artist is spelled is decided ONCE, over the whole
        library, and album cards then borrow that answer. Deciding it
        per album gives a different one for a record whose only track
        carries the minority spelling: "Mirage" was filed under "camel"
        while the artist itself was listed as "Camel". The name of an
        artist belongs to the artist, not to one of their records. */
    const spelling = new Map();
    for(const g of groups_for("artists")) {
        spelling.set(g.id, g.name);
    }
    return albums_of(S.tracks).map(function(a) {
        const raw = a.tracks[0].albumArtist;
        return {...a, artist: spelling.get(norm(raw)) || raw};
    });
}

/*  The albums inside a given set of tracks — one artist's, one genre's.
 *
 *  The same grouping as albums(), and it has to be: the artist screen
 *  split its sections on the raw title, so an artist whose record was
 *  tagged two ways showed it as two headings, one under the other,
 *  which is the very thing the Albums view was just stopped from
 *  doing. One rule, one place. */
function albums_of(tracks)
{
    return group_by_norm(tracks || [], (t) => t.key, (t) => t.album);
}

/*  One screen asking another to open something.
 *
 *  Fuentes holds a folder and wants the library to walk it. There is no
 *  route that carries a source id, and inventing one would put an
 *  internal id in the address bar for a hand-off between two screens of
 *  the same app. Left here, read once, and gone. */
let pending_open = null;

function open_in_library(what)
{
    pending_open = what || null;
}

function take_open_request()
{
    const w = pending_open;
    pending_open = null;
    return w;
}


/*  The directory a track lives in, taken from its PATH.
 *
 *  Not from `folder`, which is a guess made at scan time and is stored
 *  with the tags — a library read by an older build carries the old,
 *  broken value, and it would take a rescan of every source to correct
 *  it. The path is the path; it is what the file is FETCHED by, so it
 *  cannot be wrong without the track being unplayable. Loose files have
 *  no directory at all and belong to the root. */
function dir_of(t)
{
    const p = t.path || "";
    const i = p.lastIndexOf("/");
    return i < 0 ? "" : p.slice(0, i);
}


/*  Where a walk of a source STARTS.
 *
 *  Every path a pick produces carries the pick's own folder name at its
 *  head — the handle's name, or the top folder of the file list — so
 *  starting the walk at "" showed a single child named after the source
 *  and made the user click through a rung that told them nothing they
 *  had not just read. Loose files have no head segment at all, and two
 *  heads means the pick was not one folder, so both start at the root. */
function source_root_path(source_id)
{
    let first = null;
    for(const t of S.tracks) {
        if(t.source_id !== source_id) {
            continue;
        }
        const d = dir_of(t);
        const head = d ? d.split("/")[0] : "";
        if(first === null) {
            first = head;
        } else if(first !== head) {
            return "";
        }
    }
    return first || "";
}


/*  ONE LEVEL OF ONE SOURCE'S TREE, as it is on the disk.
 *
 *  "Folders" used to group on the whole path, which produced a flat
 *  list of every LEAF directory in the library — and since a leaf
 *  directory is nearly always an album, it was the Albums view again
 *  with worse names. What it never showed was the shape: what holds
 *  what, which is the one thing the file system knows and the tags do
 *  not.
 *
 *  So it is walked a level at a time. `path` is relative to the source
 *  and includes the picked folder's own name, exactly as `track.folder`
 *  carries it; "" is the source itself. Returns the directories
 *  directly inside it, each with everything below it, and the tracks
 *  that live in it rather than in one of its children.
 *
 *  Scoped to ONE source on purpose. Two sources can each hold a folder
 *  called "music", and merging them under one row would invent a folder
 *  that is not on anybody's disk. */
function folder_level(source_id, path)
{
    const prefix = path ? path + "/" : "";
    const dirs = new Map();
    const here = [];
    for(const t of S.tracks) {
        if(t.source_id !== source_id) {
            continue;
        }
        const f = dir_of(t);
        if(f === path) {
            here.push(t);
            continue;
        }
        if(path && !f.startsWith(prefix)) {
            continue;
        }
        const name = f.slice(prefix.length).split("/")[0];
        if(!name) {
            continue;
        }
        const child = prefix + name;
        let d = dirs.get(child);
        if(!d) {
            d = {name: name, path: child, tracks: []};
            dirs.set(child, d);
        }
        d.tracks.push(t);
    }
    return {
        dirs: [...dirs.values()].sort((a, b) => collator.compare(a.name, b.name)),
        tracks: here.sort(byTrackNo),
    };
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

/***************************************************************
 *  What the covers are costing, in memory, right now.
 *
 *  For the black box, and it is not a curiosity. Every launch
 *  primes EVERY stored cover into a blob and an object URL
 *  (prime_covers), so a library with six hundred illustrated
 *  albums is holding six hundred images from the first second,
 *  whether or not one of them is ever looked at. On a phone
 *  that is the difference between a tab the system keeps and a
 *  tab the system takes back — and the JS heap does not show
 *  it, because blob bytes are not on the JS heap. So it is
 *  measured where it is known: here.
 ***************************************************************/
function retained_covers()
{
    let bytes = 0;
    for(const blob of S.cover_blobs.values()) {
        bytes += (blob && blob.size) || 0;
    }
    return {count: S.cover_blobs.size, mb: Math.round(bytes / (1024 * 1024))};
}

/*  Put a cover on an album from outside the tag reader.
 *
 *  The only caller is covers_online.js, and the rule it obeys is here
 *  rather than there: a cover that came off the file ALWAYS wins. The
 *  network is a guess — right most of the time, and still a guess —
 *  while the picture inside the file is what the owner of the music
 *  chose. So a key that already has one is left alone. */
function add_cover(key, blob)
{
    if(!key || !blob || S.cover_blobs.has(key)) {
        return false;
    }
    S.cover_blobs.set(key, blob);
    S.covers.set(key, URL.createObjectURL(blob));
    emit("library");
    return true;
}

/*  The albums nobody has a picture for, once each. `unknown album` is
    left out on purpose: there is nothing to ask anyone about. */
function albums_missing_cover()
{
    const out = new Map();
    for(const t of S.tracks) {
        if(S.covers.has(t.key) || out.has(t.key)) {
            continue;
        }
        if(norm(t.album) === UNKNOWN_ALBUM) {
            continue;
        }
        out.set(t.key, {
            key: t.key,
            album: t.album,
            albumArtist: t.albumArtist,
            folder: t.folder
        });
    }
    return [...out.values()];
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
/*  The same track, twice on the deck, is not something anyone asks for.
 *
 *  It is what a second tap on "add album" used to produce, and the
 *  damage is quiet: the queue reads as longer than it is, the same song
 *  comes round again mid-evening, and a list saved from it carries the
 *  repeat for good. Adding what is already there is now a no-op for
 *  that track and a normal add for the rest — press twice and nothing
 *  bad happens, which is the whole point.
 *
 *  Identity is the track, not the song: two files of the same tune, in
 *  different albums or in a folder kept twice, are two records and the
 *  app has no business deciding they are one. What it refuses is the
 *  SAME file appearing twice over.
 */
function dedupe(list, against)
{
    const seen = new Set();
    for(const t of (against || [])) {
        seen.add(t.uid);
    }
    const out = [];
    for(const t of list) {
        if(!t || seen.has(t.uid)) {
            continue;
        }
        seen.add(t.uid);
        out.push(t);
    }
    return out;
}

/*  WHAT JUST HAPPENED TO THE DECK, so somebody can say it.
 *
 *  Adding to the queue was the one action in this app that did nothing
 *  visible. The deck is on another screen, and it refuses repeats — so
 *  pressing + on a record already on it did literally nothing and said
 *  literally nothing, which from the outside is a broken button. The
 *  refusal is right; the silence was not.
 *
 *  Counted, never phrased: the store has no business holding a sentence,
 *  and a count welded into one is a plural rule per language. */
function say_added(added, already)
{
    S.said = {added: added, already: already, at: Date.now()};
    emit("said");
}

/*  The last thing the deck was told to do, or null. */
function last_said()
{
    return S.said;
}

function clear_said()
{
    if(S.said) {
        S.said = null;
        emit("said");
    }
}

function queue_add(list, mode)
{
    if(!list || !list.length) {
        return 0;
    }
    const offered = list.length;
    if(mode === "replace") {
        /*  Nothing to compare against — the deck is being thrown away —
            but a list handed in with repeats inside it still gets them
            taken out. */
        S.queue = dedupe([...list], null);
        S.qi = -1;
        S.origin = null;
        S.edited = false;
        emit("queue");
        queue_play_at(0);
        return S.queue.length;
    }

    list = dedupe(list, S.queue);
    if(!list.length) {
        /*  Every one of them was already on the deck. Not an error, and
            not a change either: touch nothing. Marking the queue edited
            here would falsely un-save a saved list.
            It is still SAID, though — "nothing happened because it was
            already there" is the one thing the user cannot see for
            themselves from this screen. */
        say_added(0, offered);
        return 0;
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
    say_added(list.length, offered - list.length);
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
 *      The temporary list — listening without committing
 *
 *  Two lists exist at once, and they are not the same kind of
 *  thing. The DECK is the official one: persistent, curated,
 *  saved, survives a reload. What the user is looking at in the
 *  library is the other one — temporary, unsaved, exactly as
 *  long as the screen they are on.
 *
 *  Pressing play on a row starts the temporary one. The deck
 *  PAUSES and keeps its place; nothing of it is lost, nothing is
 *  asked, and no dialog stands between the user and the sound
 *  they asked for. It plays on through the list on screen to its
 *  end, and one button on the shared strip gives the deck back —
 *  playing again if it was playing when it was interrupted.
 ***************************************************************/
function get_temp_audio()
{
    if(!S.temp_audio) {
        S.temp_audio = new Audio();
        /*  Same channel as the deck's clock: whoever is painting a
            position repaints, and each asks for the one it owns. */
        /*  What comes out of here is also something that is sounding,
            so the visualizer follows it too. */
        S.temp_audio.addEventListener("play", () => attach_analyser(S.temp_audio));
        S.temp_audio.addEventListener("timeupdate", () => {
            attach_analyser(S.temp_audio);
            emit("time");
        });
        /*  ON to the next one. A list that stopped after its first
            track was not a list. */
        S.temp_audio.addEventListener("ended", () => temp_next());
        S.temp_audio.addEventListener("error", () => {
            let err = S.temp_audio.error;
            if(!S.temp_audio.src || (err && err.code === 1)) {
                return;                             // an abort, not a failure
            }
            S.notice = "that file could not be read";
            emit("library");
            /*  One unreadable file must not end the listening. Step
                over it, the same as a scan steps over a file it cannot
                open. */
            temp_next();
        });
    }
    return S.temp_audio;
}

/*  Start the list the user can see, at the row they pressed.

    `list` is taken as given: the order on the screen is the order it
    plays, because that is the promise the screen is making. */
async function play_temp(list, index)
{
    const items = (list || []).filter(Boolean);
    if(!items.length) {
        return;
    }
    /*  Remember whether the deck was SOUNDING, not merely loaded: it is
        what the way back has to restore, and pausing it below destroys
        the evidence. Only on the way IN — starting a second list from
        inside a temporary one must not overwrite it with false. */
    if(!S.temp) {
        S.temp_resume = is_playing();
    }
    if(S.audio && !S.audio.paused) {
        S.audio.pause();
    }
    S.temp_list = items;
    await temp_go(Math.max(0, Math.min(items.length - 1, index | 0)));
}

async function temp_go(i)
{
    const t = S.temp_list[i];
    if(!t) {
        back_to_deck();
        return;
    }
    S.temp_i = i;
    const file = await resolve_file(t);
    if(!file) {
        S.notice = "that file could not be read";
        emit("library");
        /*  Do not sit on a track that cannot sound. */
        if(i + 1 < S.temp_list.length) {
            await temp_go(i + 1);
        } else {
            back_to_deck();
        }
        return;
    }
    const a = get_temp_audio();
    const stale = S.temp_url;
    S.temp_url = URL.createObjectURL(file);
    S.temp = t;
    a.src = S.temp_url;
    if(stale) {
        setTimeout(() => URL.revokeObjectURL(stale), 1000);
    }
    a.play().catch(() => {});
    emit("temp");
}

function temp_next()
{
    if(!S.temp) {
        return;
    }
    if(S.temp_i + 1 >= S.temp_list.length) {
        /*  The end of what was on the screen. The deck gets its turn
            back rather than the app falling silent with no explanation
            of what just ended. */
        back_to_deck();
        return;
    }
    temp_go(S.temp_i + 1);
}

function temp_prev()
{
    if(!S.temp) {
        return;
    }
    temp_go(Math.max(0, S.temp_i - 1));
}

/*  Silence the temporary list and forget it. Does NOT touch the deck —
    back_to_deck is the one that decides what happens to that. */
function temp_clear()
{
    if(S.temp_audio) {
        S.temp_audio.pause();
        S.temp_audio.removeAttribute("src");
        S.temp_audio.load();
    }
    if(S.temp_url) {
        URL.revokeObjectURL(S.temp_url);
        S.temp_url = null;
    }
    S.temp = null;
    S.temp_list = [];
    S.temp_i = -1;
}

/*  The way back, and the only way back.
 *
 *  The deck was interrupted mid-track and kept its position, so it
 *  resumes where it stood — and only if it was actually sounding when
 *  the temporary list took over. Coming back to music that starts
 *  playing on its own, when nothing was playing before, would be the
 *  app deciding something nobody asked it to. */
function back_to_deck()
{
    const resume = S.temp_resume;
    S.temp_resume = false;
    temp_clear();
    emit("temp");
    if(!resume) {
        return;
    }
    if(S.audio && S.audio.src) {
        S.audio.play().catch(() => {});
        emit("playing");
    } else {
        toggle();
    }
}

/*  The track sounding out of the temporary list, or null. */
function temp_track()
{
    return S.temp;
}

function temp_playing()
{
    return !!S.temp && !!S.temp_audio && !S.temp_audio.paused;
}

/*  Pause and resume the temporary list. A list you cannot stop mid-song
    is not something anyone would call a player. */
function temp_toggle()
{
    if(!S.temp || !S.temp_audio) {
        return;
    }
    if(S.temp_audio.paused) {
        S.temp_audio.play().catch(() => {});
    } else {
        S.temp_audio.pause();
    }
    emit("temp");
}

/*  Where it has got to, for the strip to say "3 / 12". */
function temp_position()
{
    return {index: S.temp_i, length: S.temp_list.length};
}

/*  Everything still ahead of it, plus what is sounding — what "add all
    of this to the deck" means from inside a temporary list. */
function temp_tracks()
{
    return [...S.temp_list];
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
        /*  The element asking for bytes that are not coming. On a local
            file this should never happen, so when it does it is either a
            disk the system took away or a handle that went stale. */
        S.audio.addEventListener("stalled", () => diag("stalled", {}));
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
            /*  Worth a line in the black box: "the music stopped" has a
                media-layer answer and an app-layer one, and they are
                told apart by whether anything was wrong with the FILE at
                the moment it went quiet. */
            diag("audio", {code: (err && err.code) || 0});
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
    /*  The deck is loading a track of its own, so the temporary list is
        over — but silently: back_to_deck would try to resume the deck
        underneath the very load that is happening here. */
    if(S.temp) {
        S.temp_resume = false;
        temp_clear();
        emit("temp");
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

/*  The temporary list sounds on its own element, so it has its own
    clock, and the strip showing it must read THAT one. Asking
    `progress()` gave the position of the deck's track, which is paused
    underneath: the bar sat frozen wherever the deck was left, and a
    click on it seeked music nobody was listening to.

    The deck keeps reading `progress()` on purpose. Down there the
    transport still belongs to the queue, and it should go on showing
    where the queue is waiting. */
function temp_progress()
{
    const audio = S.temp_audio;
    const dur = (audio && audio.duration) || 0;
    return {
        current: (audio && audio.currentTime) || 0,
        duration: dur,
        fraction: dur ? (audio.currentTime / dur) : 0,
    };
}

function seek_temp_fraction(fraction)
{
    const audio = S.temp_audio;
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
    begin_read,
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
    albums_of,
    folder_level,
    source_root_path,
    open_in_library,
    take_open_request,
    all_tracks_sorted,
    search,
    cover_url,
    retained_covers,
    add_cover,
    albums_missing_cover,
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
    last_said,
    clear_said,
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
    /*  the temporary list */
    play_temp,
    temp_next,
    temp_prev,
    back_to_deck,
    temp_track,
    temp_playing,
    temp_toggle,
    temp_position,
    temp_tracks,
    temp_progress,
    seek_temp_fraction,
    /*  the deck across a reload */
    queue_snapshot,
    restore_queue,
    reload_current,
};
