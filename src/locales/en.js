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
        "colours":              "Colour",
        "palette auto":         "From the cover",
        "palette gold":         "Gold",
        "palette ice":          "Ice",
        "palette rose":         "Rose",
        "palette leaf":         "Leaf",
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
        "empty the queue?":   "Empty the queue?",
        "clear queue":          "Clear the queue",
        "maximise the queue": "Maximise the queue",
        "show the player":    "Show the player",
        "follow playing":       "Follow what is playing",
        "save as list":         "Save as list",
        "already saved":        "Already saved, and unchanged",
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

        /* ---- the visualizer ---- */
        "viz flight":           "Flight",
        "viz notes":            "Notes",
        "viz spectrum":         "Spectrum",
        "viz wave":             "Wave",
        "viz chroma":           "Chroma",
        "viz off":              "Visualizer off",

        "loved":                "Loved",
        "most played":          "Most played",
        "clear the counts":     "Clear the counts",
        "yes, clear them":      "Yes, clear them",
        "hearts are not touched": "The hearts are left alone",
        "no hearts yet":        "Nothing has a heart yet.",
        "how to give a heart":  "Tap the heart beside a name to give it one. Tap again for another.",
        "nothing played yet":   "Nothing has been played yet.",
        "how playing counts":   "A track counts once it has really sounded for a while, so skipping past one does not count it.",
        "artist":               "Artist",
        "times played":         "Times played",
        "played through":       "played through",
        "hearts":               "Hearts",
        "give a heart":         "Give a heart",
        "take one back":        "Take one back",
        "reset hearts":         "Reset the hearts",
        "forget these counts":  "Forget these counts",

        /* ---- the sources ---- */
        "authorised sources":   "Authorised sources",
        "add a folder":         "Add a folder",
        "add loose files":      "Add loose files",
        "folders are recursive":
            "A folder is taken whole: that folder and every folder below it.",
        "no cover for this":
            "This record has no cover",
        "covers offer detail":
            "I can look for it online: artist and album go out, nothing else.",
        "look for it":
            "Look for it",
        "retry the ones that failed":
            "Try the ones that failed again",
        "cover not found":
            "No cover found",
        "cover retry detail":
            "The service may have been down. You can try again.",
        "try again":
            "Try again",
        "look for covers online":
            "Look for covers online",
        "covers online explained":
            "On, when a record with no cover inside the file starts playing, its artist and album go out as text — nothing else: no files, no lists, no identifiers. Only what you are listening to is ever asked about, never your whole library, and what comes back is kept here: that record is never asked about again. Switch it off and absolutely nothing leaves this app.",
        "covers online working":
            "Looking for the cover of “{{asking}}”…",
        "covers online done":
            "Found {{found}}. No luck with {{missed}} (not asked again for a month).",
        "nothing is copied":
            "Your files are neither copied nor uploaded: only a reference to what is already on your disk is stored. The one thing that leaves here is the artist and album of the record you are listening to, as text, to look for its cover — and that is switched off just below.",
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
        "another tab is holding it":
            "Another tab of this app is open with an older version, and it is holding the database. Close it and reload this page.",
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
        "waiting its turn":   "Waiting for the folder before it",
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
        "remove this source?":  "Remove this source?",

        /*  ---- a pick that would have doubled something ---- */
        "folder already added":
            "“{{name}}” is already in the list. Nothing was added twice. To pick up files added to it since, use Rescan on its row.",
        "folder inside another":
            "“{{name}}” is inside “{{other}}”, which is already in — and a folder is taken whole, so its tracks are already in your library.",
        "files already added":
            "Those files are already in. They are held by: {{other}}. Nothing was added twice.",
        "some were already in":
            "{{skipped}} of them were already in, held by: {{other}}. Those were left out; the rest were added.",
        "folder contains others":
            "“{{name}}” holds something that is already in: {{other}}. To take the whole folder without those tracks appearing twice, that has to go first — and its play counts and hearts go with it.",
        "remove it and add this":
            "Remove it and add this one",
        "understood":           "Understood",
        "diagnostics":         "Diagnostics",
        "copy":                "Copy",
        "new version":         "A new version is available",
        "reload":             "Reload",

        /* ---- installing ---- */
        "install this app":     "Install the app",
        "install why":
            "Installed, yunomúsica opens like any other app on your device — and, more to the point, your browser can then keep the permission on your music folders instead of asking again at every launch.",
        "install so folders stay": "So your folders stay authorised",
        "install":             "Install",
        "not now":             "Not now",

        /* ---- the saved lists ---- */
        "saved lists":          "Saved lists",
        "no saved lists yet":   "No saved lists yet.",
        "how to save a list":   "Build a queue on the player, then save it with a name.",
        "delete this list":     "Delete this list?",

        /* ---- help and credits ---- */
        "your music your way":  "Your music, the way you want to see it.",
        "about lead":
            "Yunomúsica reads the music already on your device and sorts it by artist, album, genre and folder. It runs entirely in the browser: no account, no tracking, and your files are never uploaded anywhere.",
        "how it works":         "How it works",
        "help pick":
            "Authorise a folder in Sources. It is read whole, subfolders included, and the ID3 tags of every file give the artist, album and genre.",
        "help queue":
            "The player is the deck: the queue is what you loaded, in the order you want it. Add, reorder and take tracks out while it plays.",
        "help lists":
            "Save a queue with a name and it comes back next time — as references to your files, never as copies.",
        "help privacy":
            "Your files do not leave the device: there is no server to send them to. To look for covers, the artist and album of what you play do go out, and that is switched off in Sources.",
        "do not show this again": "Do not show this again",
        "made by artgins":      "Made by ArtGins",
        "made with yuneta":     "Made with Yuneta",
        "about tagline":        "An event-driven framework for distributed systems.",
    },
};

export {en};
