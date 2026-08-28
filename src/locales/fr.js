/***********************************************************************
 *          fr.js
 *
 *          French translations. See en.js for the conventions and for the
 *          canonical key set.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
const fr = {
    name: "Français",
    dir: "ltr",

    translation: {
        "player":               "Lecteur",
        "library":              "Bibliothèque",
        "sources":              "Sources",
        "lists":                "Listes",
        "add folder":           "Ajouter un dossier",
        "add files":            "Ajouter des fichiers",
        "theme":                "Thème clair / sombre",
        "colours":              "Couleur",
        "palette auto":         "D'après la pochette",
        "palette gold":         "Or",
        "palette ice":          "Glace",
        "palette rose":         "Rose",
        "palette leaf":         "Feuille",
        "language":             "Langue",
        "help":                 "Aide et crédits",

        "play":                 "Lire",
        "pause":                "Pause",
        "previous":             "Précédent",
        "next":                 "Suivant",
        "shuffle":              "Aléatoire",
        "repeat":               "Répéter",
        "back":                 "Retour",
        "close":                "Fermer",
        "cancel":               "Annuler",
        "save":                 "Enregistrer",
        "delete":               "Supprimer",
        "remove":               "Retirer",
        "add to queue":         "Ajouter à la file",
        /*  ---- counts ---- */
        "n tracks_one": "morceau",
        "n tracks_many": "morceaux",
        "n tracks_other": "morceaux",
        "n albums_one": "album",
        "n albums_many": "albums",
        "n albums_other": "albums",
        "n entries_one": "entrée",
        "n entries_many": "entrées",
        "n entries_other": "entrées",
        "n missing_one": "introuvable",
        "n missing_many": "introuvables",
        "n missing_other": "introuvables",
        "n folders inside_one": "dossier dedans",
        "n folders inside_many": "dossiers dedans",
        "n folders inside_other": "dossiers dedans",
        "albums":               "Albums",
        "reading tags":         "Lecture des étiquettes…",

        "nothing cued":         "Rien de chargé",
        "load something to start":
            "Ajoutez un dossier ou quelques morceaux : ils arrivent ici, sur la platine.",
        "queue":                "File",
        "empty the queue?":     "Vider la file ?",
        "maximise the queue":   "Voir toute la file",
        "show the player":      "Voir le lecteur",
        "the queue is empty":   "La file est vide.",
        "clear queue":          "Vider la file",
        "follow playing":       "Suivre ce qui joue",
        "save as list":         "Enregistrer comme liste",
        "already saved":        "Déjà enregistrée, et inchangée",
        "move up":              "Monter",
        "move down":            "Descendre",
        "remove from queue":    "Retirer de la file",
        "name for this list":   "Nom de cette liste",

        "artists":              "Artistes",
        "genres":               "Genres",
        "folders":              "Dossiers",
        "all":                  "Tous",
        "search placeholder":   "Rechercher un titre, un artiste, un album…",
        "search":               "Rechercher",
        "nothing here":         "Rien ici.",
        "unknown artist":       "Artiste inconnu",
        "unknown album":        "Album inconnu",
        "unknown genre":        "Genre inconnu",
        "play all":             "Tout lire",
        "replace the queue":
            "Remplacer ce qui est sur la platine ?",
        "replace warning":
            "Lire ceci écarte la file actuelle et repart du début de ce que vous avez choisi.",
        "replace and play":
            "Remplacer et lire",
        "on the deck":
            "déjà sur la platine",
        "preview":              "Écouter",
        "previewing":           "Écoute",
        "temporary list":      "Liste temporaire",
        "back to the deck":    "Revenir à la file",
        "to the deck":        "Dans la file",
        "look inside":       "Voir dedans",
        "already on the deck": "Déjà dans la file",
        "temporary queue":      "File composée à la main",
        "playing list":         "Liste",
        "edited":               "modifiée",
        "add music in sources": "Ajoutez de la musique dans Sources",
        "play this":            "Lire celui-ci",
        "album":                  "Album",
        "genre":                "Genre",
        "year":                 "Année",
        "track number":         "Piste",
        "path":                 "Fichier",
        "source":               "Source",

        /* ---- le graphique ---- */
        "viz flight":           "Vol",
        "viz notes":            "Notes",
        "viz spectrum":         "Spectre",
        "viz wave":             "Onde",
        "viz chroma":           "Chroma",
        "viz off":              "Désactivé",

        "loved":                "Avec un cœur",
        "most played":          "Les plus écoutées",
        "clear the counts":     "Remettre les compteurs à zéro",
        "yes, clear them":      "Oui, remettre à zéro",
        "hearts are not touched": "Les cœurs ne sont pas touchés",
        "no hearts yet":        "Aucun cœur pour l'instant.",
        "how to give a heart":  "Touchez le cœur à côté d'un nom pour en donner un. Encore une fois pour un autre.",
        "nothing played yet":   "Rien n'a encore été écouté.",
        "how playing counts":   "Un morceau compte quand il a vraiment sonné un moment : le passer ne compte pas.",
        "artist":               "Artiste",
        "times played":         "Fois écoutée",
        "played through":       "écoutées en entier",
        "hearts":               "Cœurs",
        "give a heart":         "Donner un cœur",
        "take one back":        "En reprendre un",
        "reset hearts":         "Remettre les cœurs à zéro",
        "forget these counts":  "Oublier ces compteurs",

        "no cover for this":    "Ce disque n’a pas de pochette",
        "covers offer detail":
            "Je peux la chercher en ligne : seuls l’artiste et l’album sortent, rien d’autre.",
        "look for it":          "La chercher",
        "retry the ones that failed": "Réessayer celles qui ont échoué",
        "cover not found":      "Pochette introuvable",
        "cover retry detail":
            "Le service était peut-être hors service. Vous pouvez réessayer.",
        "try again":            "Réessayer",
        "look for covers online": "Chercher les pochettes en ligne",
        "covers online explained":
            "Activé, quand démarre un disque dont le fichier ne contient pas de pochette, son artiste et son album sortent sous forme de texte — rien d’autre : aucun fichier, aucune liste, aucun identifiant. On ne demande que pour ce que vous écoutez, jamais pour toute votre bibliothèque, et ce qui revient reste ici : ce disque ne fera plus jamais l’objet d’une demande. Désactivez-le et absolument rien ne sort de cette application.",
        "covers online working": "Recherche de la pochette de « {{asking}} »…",
        "covers found_one":     "{{count}} trouvée.",
        "covers found_many":    "{{count}} trouvées.",
        "covers found_other":   "{{count}} trouvées.",
        "covers missed_one":
            "Sans résultat : {{count}} (on ne redemande pas avant un mois).",
        "covers missed_many":
            "Sans résultat : {{count}} (on ne redemande pas avant un mois).",
        "covers missed_other":
            "Sans résultat : {{count}} (on ne redemande pas avant un mois).",
        "authorised sources":   "Dossiers autorisés",
        "add a folder":         "Ajouter un dossier",
        "add loose files":      "Ajouter des fichiers isolés",
        "folders are recursive":
            "Un dossier est pris en entier : lui et tous ceux qui se trouvent en dessous.",
        "nothing is copied":
            "Rien n'est copié ni envoyé. Seule une référence à ce qui est déjà sur votre disque est conservée.",
        "allow on every visit":
            "Le dossier est retenu, mais l’autorisation qui va avec appartient au navigateur. Chrome sur Android la redemande à chaque lancement, et aucun réglage de cette application n’y change rien — autoriser tient donc en un appui sur l’écran du lecteur, là où vous arrivez. Si votre navigateur propose « Autoriser à chaque visite », le choisir met fin aux questions.",
        "folders need authorising":
            "Dossiers en attente d’autorisation",
        "sources persist":
            "Ce navigateur retient vos dossiers d'une session à l'autre. Après un rechargement, un clic suffit à les réautoriser.",
        "storage may be cleared":
            "Votre navigateur n’a pas accordé de stockage durable : il peut donc supprimer vos dossiers quand il manque de place — ou s’il est réglé pour effacer les données des sites à la fermeture. Si vos dossiers disparaissent, c’est pour cela.",
        "could not be saved":
            "Vos dossiers n’ont pas pu être enregistrés : ce navigateur n’autorise l’application à rien stocker. Ils seront perdus à la fermeture.",
        "another tab is holding it":
            "Un autre onglet de cette application est ouvert avec une version plus ancienne et retient la base de données. Fermez-le et rechargez cette page.",
        "sources do not persist":
            "Ce navigateur ne peut pas conserver l'autorisation d'un dossier ; les fichiers choisis sont donc retenus comme une liste figée. Les morceaux ajoutés ensuite au dossier n'apparaîtront pas.",
        "upload warning explained":
            "Votre navigateur va demander s’il faut « téléverser » le dossier. C’est sa formule générique pour « remettre ces fichiers à la page » : rien n’est envoyé nulle part, et il n’y a aucun serveur où l’envoyer.",
        "snapshot warning":
            "C'est un instantané : les fichiers ajoutés ensuite à ce dossier n'apparaîtront pas. Ajoutez-le de nouveau pour le rafraîchir.",
        "authorise":            "Autoriser",
        "rescan":               "Relire",
        "no sources yet":       "Pas encore de source.",
        "reading":              "Lecture…",
        "waiting its turn":   "En attente du dossier précédent",
        "preparing folder":
            "Préparation du dossier…",
        "this can take a while":
            "Cela peut prendre un moment : le navigateur remet les fichiers, et un gros dossier de musique demande du temps. Rien n’est envoyé nulle part.",
        "stop":                 "Arrêter",
        "stopping":                 "Arrêt…",
        "stopped":              "Arrêté avant la fin du dossier",
        "waiting for permission": "En attente d'autorisation",
        "permission denied":    "Autorisation refusée",
        "no audio here":        "Aucun fichier audio là-dedans.",
        "that file could not be read":
            "Ce fichier n'a pas pu être lu. Il a peut-être été déplacé ou supprimé.",
        "could not be read":    "Lecture impossible",
        "folder":               "Dossier",
        "files":                "Fichiers",
        "remove this source":   "Retirer cette source",
        "remove this source?":  "Retirer cette source ?",

        /*  ---- un choix qui aurait doublé quelque chose ---- */
        "folder already added":
            "« {{name}} » est déjà dans la liste. Rien n’a été ajouté deux fois. Pour prendre les fichiers déposés depuis, utilisez Relire sur sa ligne.",
        "folder inside another":
            "« {{name}} » est à l’intérieur de « {{other}} », déjà présent — et un dossier est pris en entier, donc ses morceaux sont déjà dans votre bibliothèque.",
        "files already added":
            "Ces fichiers sont déjà là. Ils sont dans : {{other}}. Rien n’a été ajouté deux fois.",
        "some were already in_one":
            "{{count}} d’entre eux était déjà là, dans : {{other}}. Celui-là a été laissé de côté ; les autres ont été ajoutés.",
        "some were already in_many":
            "{{count}} d’entre eux étaient déjà là, dans : {{other}}. Ceux-là ont été laissés de côté ; les autres ont été ajoutés.",
        "some were already in_other":
            "{{count}} d’entre eux étaient déjà là, dans : {{other}}. Ceux-là ont été laissés de côté ; les autres ont été ajoutés.",
        "folder contains others":
            "Dans « {{name}} » se trouve déjà ceci : {{other}}. Pour prendre le dossier entier sans que ces morceaux apparaissent deux fois, il faut d’abord le retirer — et ses écoutes et ses cœurs partent avec.",
        "remove it and add this":
            "Le retirer et ajouter celui-ci",
        "understood":           "Compris",
        "diagnostics":         "Diagnostic",
        "copy":                "Copier",
        "new version":         "Une nouvelle version est disponible",
        "reload":             "Recharger",

        /* ---- installing ---- */
        "install this app":     "Installer l'application",
        "install why":
            "Une fois installée, yunomúsica s'ouvre comme n'importe quelle autre application de l'appareil — et surtout, le navigateur peut conserver l'autorisation sur vos dossiers de musique au lieu de la redemander à chaque lancement.",
        "install so folders stay": "Pour que vos dossiers restent autorisés",
        "install":             "Installer",
        "not now":             "Pas maintenant",

        "saved lists":          "Listes enregistrées",
        "no saved lists yet":   "Pas encore de liste enregistrée.",
        "how to save a list":   "Composez une file dans le lecteur, puis enregistrez-la sous un nom.",
        "delete this list":     "Supprimer cette liste ?",

        "your music your way":  "Votre musique, comme vous voulez la voir.",
        "about lead":
            "Yunomúsica lit la musique déjà présente sur votre appareil et la range par artiste, album, genre et dossier. Tout se passe dans le navigateur : pas de compte, pas d'envoi, pas de pistage.",
        "how it works":         "Comment ça marche",
        "help pick":
            "Autorisez un dossier dans Sources. Il est lu en entier, sous-dossiers compris, et les étiquettes ID3 de chaque fichier donnent l'artiste, l'album et le genre.",
        "help queue":
            "Le lecteur est la platine : la file, c'est ce que vous avez chargé, dans l'ordre que vous voulez. Ajoutez, réordonnez et retirez des morceaux pendant la lecture.",
        "help lists":
            "Enregistrez une file sous un nom et vous la retrouverez — sous forme de références à vos fichiers, jamais de copies.",
        "help privacy":
            "Vos fichiers ne quittent pas l'appareil. Il n'y a aucun serveur où les envoyer.",
        "do not show this again": "Ne plus afficher",
        "made by artgins":      "Réalisé par ArtGins",
        "made with yuneta":     "Réalisé avec Yuneta",
        "about tagline":        "Un framework événementiel pour systèmes distribués.",
    },
};

export {fr};
