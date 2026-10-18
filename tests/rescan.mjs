/***********************************************************************
 *          rescan.mjs
 *
 *      A rescan reads a folder again and the library gets new objects
 *      for its tracks. The deck must come out of it as it went in: same
 *      tracks, same order, same one cued — only what left the folder
 *      leaves the deck. It used to be stripped of that source's tracks,
 *      stop the one sounding, and, left empty, be refilled with the
 *      whole folder in walk order.
 *
 *      In node, against music_store itself: the rescan is reachable
 *      only through a folder handle (File System Access), which no test
 *      browser hands over. The <audio> is a stand-in.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/

/*  Just enough of a document for a media element. */
function fake_media()
{
    const attrs = {};
    return {
        paused: true, ended: false, currentTime: 0, duration: 60, error: null,
        style: {}, crossOrigin: null,
        addEventListener() {}, removeEventListener() {},
        appendChild() {}, removeChild() {},
        setAttribute(k, v) { attrs[k] = String(v); },
        getAttribute(k) { return (k in attrs) ? attrs[k] : null; },
        removeAttribute(k) { delete attrs[k]; },
        set src(v) { attrs.src = v; }, get src() { return attrs.src || ""; },
        load() {}, pause() { this.paused = true; },
        play() { this.paused = false; return Promise.resolve(); },
    };
}
globalThis.document = {
    createElement: (tag) => ((tag === "audio" || tag === "video") ? fake_media()
        : {style: {}, setAttribute() {}, appendChild() {}, className: ""}),
    body: {appendChild() {}},
    addEventListener() {},
    visibilityState: "visible",
};
globalThis.Audio = function() {
    return fake_media();
};

const M = await import("../src/music_store.js");

let failures = 0;
function check(ok, what)
{
    console.log((ok ? "ok    " : "FAIL  ") + what);
    if(!ok) {
        failures++;
    }
}

const file = (path) => {
    const f = new File([new Uint8Array(8)], path.split("/").pop(), {type: "audio/mpeg"});
    Object.defineProperty(f, "webkitRelativePath", {value: path});
    return f;
};
const names = (list) => list.map((t) => t.path.split("/").pop());

await M.ingest([file("F/a.mp3"), file("F/b.mp3"), file("F/c.mp3"), file("F/d.mp3")], "S1");
await M.ingest([file("G/x.mp3")], "S2");

/*  A deck put together by hand, out of folder order, with another
    source in it, cued on its third entry. */
M.queue_add([M.find_track("S1", "F/c.mp3"), M.find_track("S2", "G/x.mp3"),
             M.find_track("S1", "F/a.mp3"), M.find_track("S1", "F/b.mp3")], "append");
M.queue_play_at(2);
await new Promise((r) => setTimeout(r, 20));
const before = M.current_track();
check(names(M.queue_tracks()).join() === "c.mp3,x.mp3,a.mp3,b.mp3" && before.path === "F/a.mp3",
      "before: a deck by hand, on a.mp3");

/*  The rescan: b.mp3 was deleted from the folder, e.mp3 added. */
M.unlist_source_tracks("S1");
await M.ingest([file("F/a.mp3"), file("F/c.mp3"), file("F/d.mp3"), file("F/e.mp3")], "S1");
M.relink_source("S1");

const q = M.queue_tracks();
check(names(q).join() === "c.mp3,x.mp3,a.mp3", `after: same order, only the deleted one gone: ${names(q).join()}`);
check(M.queue_index() === 2 && M.current_track().path === "F/a.mp3", "the same track is still the one on the deck");
check(M.current_track() !== before, "and it is the library's new object");
check(M.queue_length() === 3, "nothing was added: the folder was not poured onto the deck");

/*  The track on the deck is deleted too. */
M.unlist_source_tracks("S1");
await M.ingest([file("F/c.mp3"), file("F/d.mp3")], "S1");
M.relink_source("S1");
check(names(M.queue_tracks()).join() === "c.mp3,x.mp3", "a track deleted while on the deck leaves it");
check(M.queue_index() === 1, `and the deck stays where it was: ${M.queue_index()}`);

console.log("=== ERRORS (0) ===");
process.exit(failures ? 1 : 0);
