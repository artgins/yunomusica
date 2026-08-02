/***********************************************************************
 *          sources_store.js
 *
 *      The authorised sources: the folders and file sets the user let
 *      yunomúsica read, kept BETWEEN sessions.
 *
 *      Nothing is ever copied. A source holds a reference to what is on
 *      the disk, and the reference is what gets stored:
 *
 *        - kind "dir"   — a FileSystemDirectoryHandle (File System Access
 *          API). It survives in IndexedDB, so the folder is still listed
 *          after a reload; the browser only asks to re-confirm the read
 *          permission, one click, no navigating the tree again. A rescan
 *          picks up files added to the folder since. Chromium only.
 *
 *        - kind "files" — the File objects themselves, which are also
 *          structured-cloneable and so also survive in IndexedDB. This is
 *          what every other engine (and the loose-files picker) gets: the
 *          list is remembered, but it is a SNAPSHOT — files added to the
 *          folder afterwards are not seen, and a file that moved is
 *          reported as missing when it is read.
 *
 *      A folder is always taken WHOLE: the walk recurses into every
 *      subfolder below the one that was chosen.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {STORE_SOURCES, idb_all, idb_put, idb_del, idb_available} from "./idb.js";
import {ingest, drop_source_tracks, cancel_ingest} from "./music_store.js";


/***************************************************************
 *      Pub/sub — one channel, "sources".
 ***************************************************************/
const listeners = new Set();

function subscribe_sources(fn)
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
            fn("sources");
        } catch(e) {
            console.error("sources_store listener failed", e);
        }
    }
}


/***************************************************************
 *      State
 *
 *  `sources` holds what is persisted; `runtime` holds what is
 *  not worth persisting and would be stale anyway (the current
 *  permission, whether a scan is running, the last error).
 ***************************************************************/
const S = {
    sources: [],
    runtime: new Map(),     // id -> {permission, scanning, error}
    loaded:  false,
    persistent: false,      // IndexedDB actually works here
    preparing: false,       // the browser is still handing over a folder
};

function rt(id)
{
    let r = S.runtime.get(id);
    if(!r) {
        r = {permission: "granted", scanning: false, error: ""};
        S.runtime.set(id, r);
    }
    return r;
}

function fsa_supported()
{
    return typeof window !== "undefined" && !!window.showDirectoryPicker;
}

function is_persistent()
{
    return S.persistent;
}

/*  True between the picker closing and the browser handing the files
    over. Nothing of ours runs in that gap, and on a phone's whole music
    folder it is the longest part of the whole operation. */
function is_preparing()
{
    return S.preparing;
}

function all_sources()
{
    return S.sources.map(function(s) {
        let r = rt(s.id);
        return {
            id: s.id,
            name: s.name,
            kind: s.kind,
            added: s.added,
            count: s.count || 0,
            rescannable: s.kind === "dir",
            permission: r.permission,
            scanning: r.scanning,
            error: r.error,
        };
    });
}

function find(id)
{
    return S.sources.find((s) => s.id === id) || null;
}

function new_id()
{
    if(typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return "s" + Date.now() + "_" + Math.floor(Math.random() * 1e9);
}


/***************************************************************
 *      Permission (only "dir" sources have one)
 ***************************************************************/
async function query_permission(source)
{
    if(source.kind !== "dir" || !source.handle) {
        return "granted";           // a File snapshot needs no permission
    }
    if(typeof source.handle.queryPermission !== "function") {
        return "granted";
    }
    try {
        return await source.handle.queryPermission({mode: "read"});
    } catch(e) {
        return "denied";
    }
}

/*  Must be called from a user gesture, or the browser refuses. */
async function authorize(id)
{
    let source = find(id);
    if(!source) {
        return false;
    }
    if(source.kind !== "dir" || typeof source.handle.requestPermission !== "function") {
        return true;
    }
    let state;
    try {
        state = await source.handle.requestPermission({mode: "read"});
    } catch(e) {
        state = "denied";
    }
    rt(id).permission = state;
    emit();
    if(state === "granted") {
        await scan(id);
        return true;
    }
    return false;
}


/***************************************************************
 *      Loading what was remembered
 ***************************************************************/
async function load_sources()
{
    S.persistent = await idb_available();
    let rows = await idb_all(STORE_SOURCES);
    S.sources = (rows || []).sort((a, b) => (a.added || 0) - (b.added || 0));
    for(const s of S.sources) {
        rt(s.id).permission = await query_permission(s);
    }
    S.loaded = true;
    emit();

    /*  Read straight away everything that needs no further consent: a
        File snapshot always, a folder whose permission is still granted.
        The rest waits for the user to press "Authorise". */
    for(const s of S.sources) {
        if(rt(s.id).permission === "granted") {
            await scan(s.id);
        }
    }
    return S.sources.length;
}


/***************************************************************
 *      Adding sources
 ***************************************************************/
async function persist(source)
{
    /*  Store the reference, never the runtime state. */
    await idb_put(STORE_SOURCES, {
        id:     source.id,
        name:   source.name,
        kind:   source.kind,
        handle: source.handle || null,
        files:  source.files  || null,
        added:  source.added,
        count:  source.count || 0,
    });
}

/*  A whole folder, recursively. Returns the new source id, or "". */
async function add_dir()
{
    if(!fsa_supported()) {
        return add_dir_via_input();
    }
    let handle;
    try {
        handle = await window.showDirectoryPicker({id: "musica", mode: "read", startIn: "music"});
    } catch(e) {
        return "";                  // the user closed the picker
    }
    let source = {
        id: new_id(),
        name: handle.name || "—",
        kind: "dir",
        handle: handle,
        added: Date.now(),
        count: 0,
    };
    S.sources.push(source);
    rt(source.id).permission = "granted";
    await persist(source);
    emit();
    await scan(source.id);
    return source.id;
}

/*  Fallback folder picker for engines without the File System Access
    API: a <input webkitdirectory>. What comes back is a flat File list
    of the whole tree, which becomes a "files" snapshot. */
function add_dir_via_input()
{
    return pick_with_input(true);
}

function add_files()
{
    return pick_with_input(false);
}

let $inputs = null;

function ensure_inputs()
{
    if($inputs) {
        return $inputs;
    }
    const mk = (dir) => {
        let el = document.createElement("input");
        el.type = "file";
        el.multiple = true;
        el.hidden = true;
        if(dir) {
            el.setAttribute("webkitdirectory", "");
            el.setAttribute("directory", "");
        } else {
            el.accept = "audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.aac,.wma";
        }
        document.body.appendChild(el);
        return el;
    };
    $inputs = {dir: mk(true), files: mk(false)};
    return $inputs;
}

function pick_with_input(as_dir)
{
    let inputs = ensure_inputs();
    let el = as_dir ? inputs.dir : inputs.files;

    return new Promise(function(resolve) {
        /*  Between the user closing the picker and `change` firing, the
            BROWSER is enumerating the folder and building the FileList.
            For a phone's whole Music folder that is a long, silent gap
            in which our code has not run yet — the app looked dead
            through all of it.
            There is no event for "the dialog closed", but the page gets
            its focus back when it does. So: focus returns and no files
            have arrived => the browser is still handing them over. Say
            so. */
        let armed = 0;
        const on_focus = function() {
            armed = setTimeout(function() {
                if(S.preparing !== true) {
                    S.preparing = true;
                    emit();
                }
            }, 400);
        };
        const cancelled = function() {
            cleanup();
            resolve("");
        };
        const cleanup = function() {
            clearTimeout(armed);
            window.removeEventListener("focus", on_focus);
            if(S.preparing) {
                S.preparing = false;
                emit();
            }
            el.removeEventListener("change", done);
            el.removeEventListener("cancel", cancelled);
        };
        const done = async function() {
            cleanup();
            let files = [...el.files];
            el.value = "";                          // let the same pick fire again
            if(!files.length) {
                resolve("");
                return;
            }
            let name = as_dir ? top_folder_of(files) : label_for_files(files);
            let source = {
                id: new_id(),
                name: name,
                kind: "files",
                files: files,
                added: Date.now(),
                count: 0,
            };
            S.sources.push(source);
            rt(source.id).permission = "granted";
            emit();
            /*  No persist() before the scan: a "files" source carries
                every File it was given, and writing thousands of them to
                IndexedDB twice for one pick is a stall the user sees.
                scan() persists once, at the end, with the count filled
                in. */
            await scan(source.id);
            resolve(source.id);
        };
        el.addEventListener("change", done);
        /*  Not every engine fires `cancel`; where it does not, the promise
            simply never settles and nothing happens — which is what
            closing the dialog should look like anyway. */
        el.addEventListener("cancel", cancelled);
        el.click();
    });
}

function top_folder_of(files)
{
    let rel = files[0].webkitRelativePath || "";
    let head = rel.split("/")[0];
    return head || files[0].name;
}

/*  Loose files have no folder to be named after. Naming the source after
    the first file (and how many more came with it) at least says what is
    in it; a bare count would just repeat what the row already shows. */
function label_for_files(files)
{
    if(files.length === 1) {
        return files[0].name;
    }
    return files[0].name + " +" + (files.length - 1);
}


/***************************************************************
 *      Scanning — always recursive
 ***************************************************************/
async function walk_dir(handle, path, out)
{
    for await (const entry of handle.values()) {
        if(entry.kind === "file") {
            let f;
            try {
                f = await entry.getFile();
            } catch(e) {
                continue;               // vanished between listing and reading
            }
            try {
                Object.defineProperty(f, "webkitRelativePath", {value: path + f.name});
            } catch(e) {
                /*  Some engines freeze File; music_store falls back to
                    the plain name for its path guess. */
            }
            out.push(f);
        } else {
            /*  Recursive on purpose: choosing a folder means that folder
                and everything below it. */
            await walk_dir(entry, path + entry.name + "/", out);
        }
    }
}

async function scan(id)
{
    let source = find(id);
    if(!source) {
        return 0;
    }
    let r = rt(id);
    r.scanning = true;
    r.error = "";
    emit();

    let files = [];
    try {
        if(source.kind === "dir") {
            await walk_dir(source.handle, source.handle.name + "/", files);
        } else {
            files = source.files || [];
        }
    } catch(e) {
        r.error = (e && e.name === "NotAllowedError") ? "permission denied" : "could not be read";
        r.scanning = false;
        emit();
        return 0;
    }

    /*  A rescan replaces this source's tracks; it never doubles them. */
    drop_source_tracks(id);
    let res = await ingest(files, id);

    /*  The source can be removed WHILE it is being read. Everything the
        read added since then belongs to a source that no longer exists,
        so throw it away: otherwise the library quietly repopulates
        itself after the user emptied it, with tracks that can never be
        removed because there is no source left to remove. */
    if(!find(id)) {
        drop_source_tracks(id);
        S.runtime.delete(id);
        emit();
        return 0;
    }

    source.count = (res && res.count) || 0;
    r.scanning = false;
    if(res && res.cancelled) {
        /*  Stopped on purpose: what was read stays, and the source says
            it is only part of the folder rather than pretending it is
            all of it. */
        r.error = "stopped";
    } else if(!source.count) {
        r.error = "no audio here";
    }
    await persist(source);
    emit();
    return source.count;
}

async function remove_source(id)
{
    let i = S.sources.findIndex((s) => s.id === id);
    if(i < 0) {
        return;
    }
    S.sources.splice(i, 1);

    /*  Stop its read first. Removing a source while it is being read used
        to leave the read running: it went on adding tracks to the library
        for a folder the user had just deleted. scan() does the final
        clean-up when it notices the source is gone. */
    let r = S.runtime.get(id);
    if(r && r.scanning) {
        cancel_ingest(id);
    } else {
        S.runtime.delete(id);
    }

    drop_source_tracks(id);
    await idb_del(STORE_SOURCES, id);
    emit();
}

function source_name(id)
{
    let s = find(id);
    return s ? s.name : "";
}

/*  The source being read right now, if any. Scans are awaited one at a
    time, so there is at most one. The host paints a bar from this so a
    long read is visible from EVERY screen, not only from Sources. */
function scanning_source()
{
    for(const s of S.sources) {
        if(rt(s.id).scanning) {
            return {id: s.id, name: s.name};
        }
    }
    return null;
}


export {
    subscribe_sources,
    fsa_supported,
    is_persistent,
    is_preparing,
    load_sources,
    all_sources,
    source_name,
    scanning_source,
    add_dir,
    add_files,
    authorize,
    scan,
    remove_source,
};
