/***********************************************************************
 *          de.js
 *
 *          German translations. See en.js for the conventions and for the
 *          canonical key set.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
const de = {
    name: "Deutsch",
    dir: "ltr",

    translation: {
        "player":               "Player",
        "library":              "Bibliothek",
        "sources":              "Quellen",
        "lists":                "Listen",
        "add folder":           "Ordner hinzufügen",
        "add files":            "Dateien hinzufügen",
        "theme":                "Helles / dunkles Design",
        "colours":              "Farbe",
        "palette auto":         "Nach dem Cover",
        "palette gold":         "Gold",
        "palette ice":          "Eis",
        "palette rose":         "Rose",
        "palette leaf":         "Blatt",
        "language":             "Sprache",
        "help":                 "Hilfe und Credits",

        "play":                 "Abspielen",
        "pause":                "Pause",
        "previous":             "Vorheriger",
        "next":                 "Nächster",
        "shuffle":              "Zufall",
        "repeat":               "Wiederholen",
        "back":                 "Zurück",
        "close":                "Schließen",
        "cancel":               "Abbrechen",
        "save":                 "Speichern",
        "delete":               "Löschen",
        "remove":               "Entfernen",
        "add to queue":         "Zur Warteschlange",
        "tracks":               "Titel",
        "n albums":             "Alben",
        "albums":               "Alben",
        "entries":              "Einträge",
        "missing":              "fehlen",
        "reading tags":         "Tags werden gelesen…",

        "nothing cued":         "Nichts geladen",
        "load something to start":
            "Füge einen Ordner oder ein paar Titel hinzu — sie landen hier auf dem Deck.",
        "queue":                "Warteschlange",
        "the queue is empty":   "Die Warteschlange ist leer.",
        "clear queue":          "Warteschlange leeren",
        "follow playing":       "Dem Laufenden folgen",
        "save as list":         "Als Liste speichern",
        "move up":              "Nach oben",
        "move down":            "Nach unten",
        "remove from queue":    "Aus der Warteschlange nehmen",
        "name for this list":   "Name dieser Liste",

        "artists":              "Interpreten",
        "genres":               "Genres",
        "folders":              "Ordner",
        "all":                  "Alle",
        "search placeholder":   "Titel, Interpret, Album suchen…",
        "search":               "Suchen",
        "nothing here":         "Hier ist nichts.",
        "unknown artist":       "Unbekannter Interpret",
        "unknown album":        "Unbekanntes Album",
        "unknown genre":        "Unbekanntes Genre",
        "play all":             "Alles abspielen",
        "replace the queue":
            "Ersetzen, was auf dem Deck liegt?",
        "replace warning":
            "Das verwirft deine jetzige Warteschlange und beginnt am Anfang des Gewählten.",
        "replace and play":
            "Ersetzen und abspielen",
        "on the deck":
            "bereits auf dem Deck",
        "preview":              "Anhören",
        "previewing":           "Wird angehört",
        "temporary queue":      "Von Hand zusammengestellte Warteschlange",
        "playing list":         "Liste",
        "edited":               "geändert",
        "add music in sources": "Musik unter Quellen hinzufügen",
        "play this":            "Diesen abspielen",
        "album":                  "Album",
        "genre":                "Genre",
        "year":                 "Jahr",
        "track number":         "Titel-Nr.",
        "path":                 "Datei",
        "source":               "Quelle",

        "authorised sources":   "Freigegebene Ordner",
        "add a folder":         "Einen Ordner hinzufügen",
        "add loose files":      "Einzelne Dateien hinzufügen",
        "folders are recursive":
            "Ein Ordner wird ganz genommen: er und alle Ordner darunter.",
        "nothing is copied":
            "Es wird nichts kopiert und nichts hochgeladen. Gespeichert wird nur ein Verweis auf das, was ohnehin auf deiner Festplatte liegt.",
        "allow on every visit":
            "Der Ordner wird gemerkt, die Freigabe darauf verwaltet aber der Browser. Chrome unter Android fragt bei jedem Start erneut, und keine Einstellung dieser App ändert das — Freigeben ist deshalb ein Tippen auf dem Player-Bildschirm, auf dem du landest. Bietet dein Browser „Bei jedem Besuch zulassen“ an, fragt er danach nicht mehr.",
        "folders need authorising":
            "Ordner, die freigegeben werden müssen",
        "sources persist":
            "Dieser Browser merkt sich deine Ordner über Sitzungen hinweg. Nach dem Neuladen genügt ein Klick, um sie wieder freizugeben.",
        "storage may be cleared":
            "Dein Browser hat keinen dauerhaften Speicher gewährt, kann deine Ordner also verwerfen, wenn er Platz braucht — oder wenn er Website-Daten beim Beenden löscht. Wenn deine Ordner immer wieder verschwinden, liegt es daran.",
        "could not be saved":
            "Deine Ordner konnten nicht gespeichert werden: Dieser Browser lässt die App nichts speichern. Sie sind beim Schließen weg.",
        "sources do not persist":
            "Dieser Browser kann die Freigabe eines Ordners nicht speichern; die ausgewählten Dateien werden deshalb als feste Liste gemerkt. Später hinzugefügte Titel erscheinen nicht.",
        "upload warning explained":
            "Dein Browser fragt, ob der Ordner „hochgeladen“ werden soll. Das ist seine allgemeine Formulierung für „die Dateien an die Seite übergeben“: Es wird nichts irgendwohin gesendet, und es gibt auch keinen Server dafür.",
        "snapshot warning":
            "Eine Momentaufnahme: später in diesen Ordner gelegte Dateien erscheinen nicht. Füge ihn erneut hinzu, um ihn zu aktualisieren.",
        "authorise":            "Freigeben",
        "rescan":               "Neu einlesen",
        "no sources yet":       "Noch keine Quellen.",
        "reading":              "Wird gelesen…",
        "preparing folder":
            "Ordner wird vorbereitet…",
        "this can take a while":
            "Das kann dauern: Der Browser übergibt gerade die Dateien, und ein großer Musikordner braucht Zeit. Es wird nichts irgendwohin gesendet.",
        "stop":                 "Stopp",
        "stopping":                 "Wird gestoppt…",
        "stopped":              "Vor dem Ende des Ordners gestoppt",
        "waiting for permission": "Warten auf Freigabe",
        "permission denied":    "Freigabe verweigert",
        "no audio here":        "Dort sind keine Audiodateien.",
        "that file could not be read":
            "Diese Datei konnte nicht gelesen werden. Vielleicht wurde sie verschoben oder gelöscht.",
        "could not be read":    "Konnte nicht gelesen werden",
        "folder":               "Ordner",
        "files":                "Dateien",
        "remove this source":   "Diese Quelle entfernen",
        "diagnostics":         "Diagnose",
        "copy":                "Kopieren",
        "new version":         "Eine neue Version ist verfügbar",
        "reload":             "Neu laden",

        "saved lists":          "Gespeicherte Listen",
        "no saved lists yet":   "Noch keine gespeicherten Listen.",
        "how to save a list":   "Stelle im Player eine Warteschlange zusammen und speichere sie unter einem Namen.",
        "delete this list":     "Diese Liste löschen?",

        "your music your way":  "Deine Musik, so wie du sie sehen willst.",
        "about lead":
            "Yunomúsica liest die Musik, die schon auf deinem Gerät liegt, und ordnet sie nach Interpret, Album, Genre und Ordner. Es läuft vollständig im Browser: kein Konto, kein Upload, kein Tracking.",
        "how it works":         "So funktioniert es",
        "help pick":
            "Gib unter Quellen einen Ordner frei. Er wird ganz gelesen, samt Unterordnern, und die ID3-Tags jeder Datei liefern Interpret, Album und Genre.",
        "help queue":
            "Der Player ist das Deck: die Warteschlange ist das, was du geladen hast, in deiner Reihenfolge. Füge hinzu, sortiere um und nimm Titel heraus, während gespielt wird.",
        "help lists":
            "Speichere eine Warteschlange unter einem Namen, und sie ist beim nächsten Mal wieder da — als Verweise auf deine Dateien, nie als Kopien.",
        "help privacy":
            "Deine Dateien verlassen das Gerät nicht. Es gibt keinen Server, an den sie gehen könnten.",
        "do not show this again": "Nicht mehr anzeigen",
        "made by artgins":      "Gemacht von ArtGins",
        "made with yuneta":     "Gemacht mit Yuneta",
        "about tagline":        "Ein ereignisgesteuertes Framework für verteilte Systeme.",
    },
};

export {de};
