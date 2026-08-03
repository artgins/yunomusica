/***********************************************************************
 *          en.js
 *
 *          English translations — the CANONICAL key set.
 *
 *          Convention (all locale files share these rules):
 *            1. Keys are lower-case ASCII English.
 *            2. Values are sentence-case in their target language — a
 *               missing translation falls through to the lower-case key,
 *               making the gap visible to the user at a glance.
 *            3. Every locale file must carry the same key set as this one.
 *            4. No key interpolates a count. Numbers are rendered as their
 *               own node next to a plain noun ("12" + "tracks"), which
 *               keeps every language out of the plural-rule business —
 *               Arabic alone has six forms.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
const en = {
    name: "English",
    dir: "ltr",

    translation: {
        /* ---- navigation and toolbar ---- */
        "player":               "Player",
        "library":              "Library",
        "sources":              "Sources",
        "lists":                "Lists",
        "add folder":           "Add folder",
        "add files":            "Add files",
        "theme":                "Light / dark theme",
        "language":             "Language",
        "help":                 "Help and credits",

        /* ---- shared verbs and nouns ---- */
        "play":                 "Play",
        "pause":                "Pause",
        "previous":             "Previous",
        "next":                 "Next",
        "shuffle":              "Shuffle",
        "repeat":               "Repeat",
        "back":                 "Back",
        "close":                "Close",
        "cancel":               "Cancel",
        "save":                 "Save",
        "delete":               "Delete",
        "remove":               "Remove",
        "add to queue":         "Add to queue",
        "tracks":               "tracks",
        "n albums":             "albums",
        "albums":               "Albums",
        "entries":              "entries",
        "missing":              "missing",
        "reading tags":         "Reading tags…",

        /* ---- the deck ---- */
        "nothing cued":         "Nothing cued",
        "load something to start":
            "Add a folder or a few tracks, and they land here on the deck.",
        "queue":                "Queue",
        "the queue is empty":   "The queue is empty.",
        "clear queue":          "Clear the queue",
        "save as list":         "Save as list",
        "move up":              "Move up",
        "move down":            "Move down",
        "remove from queue":    "Take out of the queue",
        "name for this list":   "Name for this list",

        /* ---- the library ---- */
        "artists":              "Artists",
        "genres":               "Genres",
        "folders":              "Folders",
        "all":                  "All",
        "search placeholder":   "Search title, artist, album…",
        "search":               "Search",
        "nothing here":         "Nothing here.",
        "unknown artist":       "Unknown artist",
        "unknown album":        "Unknown album",
        "unknown genre":        "Unknown genre",
        "play all":             "Play all",
        "replace the queue":
            "Replace what is on the deck?",
        "replace warning":
            "Playing this discards the queue you have now, and starts from the beginning of what you chose.",
        "replace and play":
            "Replace and play",
        "on the deck":
            "already on the deck",
        "preview":              "Preview",
        "previewing":           "Previewing",
        "temporary queue":      "Queue put together by hand",
        "playing list":         "List",
        "edited":               "edited",
        "add music in sources": "Add music in Sources",
        "play this":            "Play this one",
        "album":                  "Album",
        "genre":                "Genre",
        "year":                 "Year",
        "track number":         "Track",
        "path":                 "File",
        "source":               "Source",

        /* ---- the sources ---- */
        "authorised sources":   "Authorised sources",
        "add a folder":         "Add a folder",
        "add loose files":      "Add loose files",
        "folders are recursive":
            "A folder is taken whole: that folder and every folder below it.",
        "nothing is copied":
            "Nothing is copied and nothing is uploaded. Only a reference to what is already on your disk is stored.",
        "allow on every visit":
            "A folder is remembered, but the permission on it is the browser's to keep. Chrome on Android asks again at every launch, and no setting in this app can change that — so authorising is one tap on the player screen, where you land. If your browser offers “Allow on every visit”, choosing it means it will not ask again.",
        "folders need authorising":
            "Folders waiting to be authorised",
        "sources persist":
            "This browser remembers your folders between sessions. After a reload one click re-authorises them.",
        "storage may be cleared":
            "Your browser has not granted durable storage, so it may discard your folders when it needs room — or when it is set to clear site data on exit. If your folders keep disappearing, that is why.",
        "could not be saved":
            "Your folders could not be saved: this browser is not letting the app store anything. They will be lost when you close it.",
        "sources do not persist":
            "This browser cannot keep folder permissions, so the files you pick are remembered as a fixed list. Tracks added to the folder later will not appear.",
        "upload warning explained":
            "Your browser will ask whether to “upload” the folder. That is its generic wording for handing files to a page: nothing is sent anywhere, and there is no server to send it to.",
        "snapshot warning":
            "A snapshot: files added to this folder later will not appear. Add it again to refresh it.",
        "authorise":            "Authorise",
        "rescan":               "Rescan",
        "no sources yet":       "No sources yet.",
        "reading":              "Reading…",
        "preparing folder":
            "Preparing the folder…",
        "this can take a while":
            "This can take a while: the browser is handing the files over, and a big music folder takes time. Nothing is being sent anywhere.",
        "stop":                 "Stop",
        "stopping":                 "Stopping…",
        "stopped":              "Stopped before the end of the folder",
        "waiting for permission": "Waiting for permission",
        "permission denied":    "Permission denied",
        "no audio here":        "No audio files in there.",
        "that file could not be read":
            "That file could not be read. It may have been moved or deleted.",
        "could not be read":    "Could not be read",
        "folder":               "Folder",
        "files":                "Files",
        "remove this source":   "Remove this source",
        "diagnostics":         "Diagnostics",
        "copy":                "Copy",
        "new version":         "A new version is available",
        "reload":             "Reload",

        /* ---- the saved lists ---- */
        "saved lists":          "Saved lists",
        "no saved lists yet":   "No saved lists yet.",
        "how to save a list":   "Build a queue on the player, then save it with a name.",
        "delete this list":     "Delete this list?",

        /* ---- help and credits ---- */
        "your music your way":  "Your music, the way you want to see it.",
        "about lead":
            "Yunomúsica reads the music already on your device and organises it by artist, album, genre and folder. It runs entirely in the browser: no account, no upload, no tracking.",
        "how it works":         "How it works",
        "help pick":
            "Authorise a folder in Sources. It is read whole, subfolders included, and the ID3 tags of every file give the artist, album and genre.",
        "help queue":
            "The player is the deck: the queue is what you loaded, in the order you want it. Add, reorder and take tracks out while it plays.",
        "help lists":
            "Save a queue with a name and it comes back next time — as references to your files, never as copies.",
        "help privacy":
            "Your files never leave the device. There is no server to send them to.",
        "do not show this again": "Do not show this again",
        "made by artgins":      "Made by ArtGins",
        "about tagline":        "Built on Yuneta — an event-driven framework for distributed systems.",
    },
};

export {en};
