/***********************************************************************
 *          music_store.js
 *
 *      The domain of yunomúsica, with no gobj and no chrome: reading the
 *      files the user picks, parsing their ID3 tags, grouping the library
 *      four ways, and playing a queue through one <audio> element.
 *
 *      The ID3 reader and the play/queue logic are ported verbatim from
 *      the single self-contained page this app grew from, so nothing about
 *      the parsing changes; only its shape does, from inline globals to a
 *      module with a tiny pub/sub the gobj views subscribe to.
 *
 *      Everything runs on the device: a picked file is read with the File
 *      API and played from an object URL. Nothing is uploaded.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/


/***************************************************************
 *      Tiny pub/sub
 *
 *  Channels:
 *    "loading"  — ingest progress moved (loaded/total/name).
 *    "library"  — the track list changed (ingest finished).
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
 ***************************************************************/
const UNKNOWN = "Sin artista";

const norm = (s) => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const collator = new Intl.Collator("es", {sensitivity:"base"});
const byTrackNo = (a,b) => (a.track - b.track) || collator.compare(a.title, b.title);

const S = {
    tracks:  [],
    covers:  new Map(),
    /*  ingest progress */
    loading: false,
    loaded:  0,
    total:   0,
    load_name: "",
    notice:  "",        // a message the view shows in place (bad pick)
    /*  playback */
    audio:   null,
    queue:   [],
    qi:      -1,
    shuffle: false,
    repeat:  false,
    url:     null,
};


/***************************************************************
 *      3. Ingest
 ***************************************************************/
const AUDIO_RE = /\.(mp3|m4a|flac|ogg|opus|wav|aac|wma)$/i;

function has_library()
{
    return S.tracks.length > 0;
}

async function ingest(files)
{
    const list = [...files].filter((f) => AUDIO_RE.test(f.name));
    if(!list.length) {
        /*  A pick with nothing playable in it must not dead-end in
            silence: say it in place and let the user pick again. */
        S.notice = "No he encontrado ficheros de audio ahí.";
        emit("library");
        return {ok:false, reason:"no-audio"};
    }

    S.notice = "";
    S.loading = true;
    S.loaded  = 0;
    S.total   = list.length;
    S.load_name = "";
    emit("loading");

    for(let i = 0; i < list.length; i++) {
        const f = list[i];
        const guess = fromPath(f);
        let tag = {};
        try {
            const head = await f.slice(0, 512 * 1024).arrayBuffer();
            tag = parseID3(head);
            if(!tag.title && f.size > 128) {
                const tail = await f.slice(Math.max(0, f.size - 128)).arrayBuffer();
                tag = Object.assign(parseID3v1(tail), tag);
            }
        } catch(e) {
            /*  Unreadable header: fall back to the path guess below. */
        }

        const album  = (tag.album  || guess.album  || "Sin álbum").trim();
        const artist = (tag.artist || guess.artist || UNKNOWN).trim();
        const albumArtist = (tag.albumArtist || artist).trim();
        const key = norm(albumArtist) + "|" + norm(album);

        if(tag.cover && !S.covers.has(key)) {
            S.covers.set(key, URL.createObjectURL(tag.cover));
        }

        S.tracks.push({
            id: S.tracks.length, file: f,
            title: (tag.title || guess.title || f.name).trim(),
            artist, albumArtist, album,
            genre: cleanGenre(tag.genre) || "Sin género",
            track: parseInt((tag.track || guess.track || "0").split("/")[0], 10) || 0,
            year: (tag.year || "").slice(0,4),
            folder: guess.folder, key
        });

        if(i % 4 === 0 || i === list.length - 1) {
            S.loaded = i + 1;
            S.load_name = f.name;
            emit("loading");
            /*  Yield so the progress paints between chunks. */
            await new Promise((r) => setTimeout(r));
        }
    }

    S.loading = false;
    emit("loading");
    emit("library");
    return {ok:true, count:list.length};
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

/*  view: "artistas" | "generos" | "carpetas" -> [{name, tracks}]  */
function groups_for(view)
{
    const fn = view === "artistas" ? (t => t.albumArtist)
             : view === "generos"  ? (t => t.genre)
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


/***************************************************************
 *      5. Playback
 ***************************************************************/
function get_audio()
{
    if(!S.audio) {
        S.audio = new Audio();
        S.audio.addEventListener("timeupdate", () => emit("time"));
        S.audio.addEventListener("ended", () => step(1));
        S.audio.addEventListener("play",  () => emit("playing"));
        S.audio.addEventListener("pause", () => emit("playing"));
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

function play_list(list, i)
{
    S.queue = [...list];
    if(S.shuffle) {
        const first = S.queue.splice(i, 1)[0];
        for(let k = S.queue.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k+1));
            [S.queue[k], S.queue[j]] = [S.queue[j], S.queue[k]];
        }
        S.queue.unshift(first);
        i = 0;
    }
    S.qi = i;
    load_current(true);
}

function load_current(autoplay)
{
    const t = S.queue[S.qi];
    if(!t) {
        return;
    }
    const audio = get_audio();
    if(S.url) {
        URL.revokeObjectURL(S.url);
    }
    S.url = URL.createObjectURL(t.file);
    audio.src = S.url;
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
    const audio = get_audio();
    if(audio.paused) {
        audio.play().catch(() => {});
    } else {
        audio.pause();
    }
}

function step(n)
{
    if(!S.queue.length) {
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

function set_repeat(on)
{
    S.repeat = !!on;
    emit("playing");
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
 *      6. Time formatting
 ***************************************************************/
function fmt_time(s)
{
    return isFinite(s)
        ? Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,"0")
        : "0:00";
}


/***************************************************************
 *      Exports
 ***************************************************************/
export {
    subscribe,
    /*  library */
    has_library,
    ingest,
    groups_for,
    albums,
    all_tracks_sorted,
    search,
    cover_url,
    /*  ingest progress (read S through getters) */
    S as store_state,
    /*  playback */
    get_audio,
    current_track,
    is_playing,
    play_list,
    toggle,
    step,
    prev,
    seek_fraction,
    set_shuffle,
    set_repeat,
    progress,
    queue_position,
    setup_media_session,
    fmt_time,
};
