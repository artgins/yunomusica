/***********************************************************************
 *          idb.js
 *
 *      A very small promise wrapper over IndexedDB — the only thing
 *      yunomúsica persists in.
 *
 *      The stores:
 *        - "sources"   the folders and file sets the user authorised.
 *        - "playlists" the lists the user saved.
 *        - "prefs"     small app preferences (theme, locale, "don't show
 *                      the welcome again").
 *
 *      Why IndexedDB and not localStorage: the two things worth keeping
 *      are NOT strings. A FileSystemDirectoryHandle and a File are
 *      structured-cloneable objects, and IndexedDB is the only web store
 *      that keeps them. That is what lets an authorised folder survive a
 *      reload — see sources_store.js.
 *
 *      Every call resolves to a benign value when IndexedDB is missing or
 *      blocked (private mode, an old engine): the app then runs exactly as
 *      it did before, remembering nothing.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/

const DB_NAME = "yunomusica";
const DB_VERSION = 4;

const STORE_SOURCES   = "sources";
const STORE_PLAYLISTS = "playlists";
const STORE_PREFS     = "prefs";
/*  A source's File objects, in chunks. One record holding thousands of
    them exceeds the structured-clone limit and the write is refused —
    which is how a whole folder was silently lost on Firefox. */
const STORE_FILES     = "source_files";
/*  The tags already parsed for a source, by path. Re-reading 8000 files
    on every reload is minutes of work to reach a result we already had. */
const STORE_TAGS      = "source_tags";
const STORE_COVERS    = "covers";

let db_promise = null;


/***************************************************************
 *  Open (once) and memoise. A failure resolves to null rather
 *  than rejecting, so no caller has to guard with try/catch.
 ***************************************************************/
function open_db()
{
    if(db_promise) {
        return db_promise;
    }
    db_promise = new Promise(function(resolve) {
        if(typeof indexedDB === "undefined") {
            resolve(null);
            return;
        }
        let req;
        try {
            req = indexedDB.open(DB_NAME, DB_VERSION);
        } catch(e) {
            resolve(null);
            return;
        }
        req.onupgradeneeded = function() {
            let db = req.result;
            if(!db.objectStoreNames.contains(STORE_SOURCES)) {
                db.createObjectStore(STORE_SOURCES, {keyPath: "id"});
            }
            if(!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
                db.createObjectStore(STORE_PLAYLISTS, {keyPath: "id"});
            }
            if(!db.objectStoreNames.contains(STORE_PREFS)) {
                db.createObjectStore(STORE_PREFS, {keyPath: "key"});
            }
            if(!db.objectStoreNames.contains(STORE_FILES)) {
                db.createObjectStore(STORE_FILES, {keyPath: "id"});
            }
            if(!db.objectStoreNames.contains(STORE_TAGS)) {
                db.createObjectStore(STORE_TAGS, {keyPath: "source_id"});
            }
            if(!db.objectStoreNames.contains(STORE_COVERS)) {
                db.createObjectStore(STORE_COVERS, {keyPath: "key"});
            }
            /*  v4 dropped the listening history. The screen is gone, so
                the record of behaviour goes with it: leaving it in the
                database would mean the app still holds what it no longer
                admits to holding. */
            for(const gone of ["history", "plays"]) {
                if(db.objectStoreNames.contains(gone)) {
                    db.deleteObjectStore(gone);
                }
            }
        };
        req.onsuccess = function() {
            resolve(req.result);
        };
        req.onerror = function() {
            resolve(null);
        };
        req.onblocked = function() {
            resolve(null);
        };
    });
    return db_promise;
}


function run(store_name, mode, fn)
{
    return open_db().then(function(db) {
        if(!db) {
            return null;
        }
        return new Promise(function(resolve) {
            let tx;
            try {
                tx = db.transaction(store_name, mode);
            } catch(e) {
                resolve(null);
                return;
            }
            let req;
            try {
                req = fn(tx.objectStore(store_name));
            } catch(e) {
                resolve(null);
                return;
            }
            if(!req) {                      // a write we do not read back
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(null);
                return;
            }
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    });
}


/***************************************************************
 *  Public API. `store` is one of the STORE_* names below.
 ***************************************************************/
function idb_all(store)
{
    return run(store, "readonly", (os) => os.getAll()).then((r) => r || []);
}

function idb_get(store, key)
{
    return run(store, "readonly", (os) => os.get(key)).then((r) => r || null);
}

/*  Resolves to true only if the write really landed. Callers used to
    ignore this, so a failed write — a quota refusal, a browser with
    storage switched off — looked exactly like a successful one until the
    user restarted and found their folders gone. */
function idb_put(store, value)
{
    return run(store, "readwrite", (os) => os.put(value)).then((r) => r !== null);
}

function idb_del(store, key)
{
    return run(store, "readwrite", (os) => os.delete(key));
}

/*  Every record whose key starts with `prefix` — how a source's file
    chunks are removed, since they are keyed "<source id>:<n>". */
function idb_del_prefix(store, prefix)
{
    return run(store, "readwrite", function(os) {
        return os.delete(IDBKeyRange.bound(prefix, prefix + "￿"));
    });
}

/*  Read back every record under that prefix, in key order. */
function idb_get_prefix(store, prefix)
{
    return run(store, "readonly", function(os) {
        return os.getAll(IDBKeyRange.bound(prefix, prefix + "￿"));
    }).then((r) => r || []);
}


/***************************************************************
 *  Preferences: a key/value pair each, so a bad value in one
 *  cannot take the others down with it.
 ***************************************************************/
function pref_get(key, dflt)
{
    return idb_get(STORE_PREFS, key).then(function(row) {
        return (row && row.value !== undefined) ? row.value : dflt;
    });
}

function pref_set(key, value)
{
    return idb_put(STORE_PREFS, {key: key, value: value});
}


/***************************************************************
 *  Is anything at all going to be remembered? The Sources view
 *  says so out loud rather than letting the user find out by
 *  losing their folders.
 ***************************************************************/
function idb_available()
{
    return open_db().then((db) => !!db);
}


/***************************************************************
 *  Ask the browser NOT to evict what we store.
 *
 *  Without this the origin is "best-effort": the browser may
 *  throw the data away whenever it feels like it, and Firefox
 *  in particular clears it on exit when the user has "delete
 *  cookies and site data when Firefox is closed" on. That is
 *  the difference between "your folders are remembered" and
 *  "your folders were remembered until you closed the browser".
 *
 *  Chromium decides silently from site engagement; Firefox
 *  asks the user. So this is called when a source is ADDED —
 *  a moment when the request makes obvious sense — never on
 *  page load.
 ***************************************************************/
function request_persistence()
{
    if(typeof navigator === "undefined" || !navigator.storage ||
            !navigator.storage.persist) {
        return Promise.resolve(false);
    }
    return navigator.storage.persisted()
        .then((already) => already ? true : navigator.storage.persist())
        .catch(() => false);
}

function storage_persisted()
{
    if(typeof navigator === "undefined" || !navigator.storage ||
            !navigator.storage.persisted) {
        return Promise.resolve(null);       // the browser will not say
    }
    return navigator.storage.persisted().catch(() => null);
}


export {
    STORE_SOURCES,
    STORE_PLAYLISTS,
    STORE_PREFS,
    STORE_FILES,
    STORE_TAGS,
    STORE_COVERS,
    idb_all,
    idb_get,
    idb_put,
    idb_del,
    idb_del_prefix,
    idb_get_prefix,
    pref_get,
    pref_set,
    idb_available,
    request_persistence,
    storage_persisted,
};
