/***********************************************************************
 *          idb.js
 *
 *      A very small promise wrapper over IndexedDB — the only thing
 *      yunomúsica persists in.
 *
 *      Three stores:
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
const DB_VERSION = 1;

const STORE_SOURCES   = "sources";
const STORE_PLAYLISTS = "playlists";
const STORE_PREFS     = "prefs";

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

function idb_put(store, value)
{
    return run(store, "readwrite", (os) => os.put(value));
}

function idb_del(store, key)
{
    return run(store, "readwrite", (os) => os.delete(key));
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


export {
    STORE_SOURCES,
    STORE_PLAYLISTS,
    STORE_PREFS,
    idb_all,
    idb_get,
    idb_put,
    idb_del,
    pref_get,
    pref_set,
    idb_available,
};
