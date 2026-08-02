/***********************************************************************
 *          es.js
 *
 *          Spanish translations. See en.js for the conventions and for
 *          the canonical key set.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
const es = {
    name: "Español",
    dir: "ltr",

    translation: {
        /* ---- navegación y barra ---- */
        "player":               "Reproductor",
        "library":              "Biblioteca",
        "sources":              "Fuentes",
        "lists":                "Listas",
        "add folder":           "Añadir carpeta",
        "add files":            "Añadir ficheros",
        "theme":                "Tema claro / oscuro",
        "language":             "Idioma",
        "help":                 "Ayuda y créditos",

        /* ---- verbos y nombres comunes ---- */
        "play":                 "Reproducir",
        "pause":                "Pausa",
        "previous":             "Anterior",
        "next":                 "Siguiente",
        "shuffle":              "Aleatorio",
        "repeat":               "Repetir",
        "back":                 "Volver",
        "close":                "Cerrar",
        "cancel":               "Cancelar",
        "save":                 "Guardar",
        "delete":               "Borrar",
        "remove":               "Quitar",
        "add to queue":         "Añadir a la cola",
        "tracks":               "pistas",
        "n albums":             "álbumes",
        "albums":               "Álbumes",
        "entries":              "entradas",
        "missing":              "no encontradas",
        "reading tags":         "Leyendo etiquetas…",

        /* ---- el plato ---- */
        "nothing cued":         "Nada cargado",
        "load something to start":
            "Añade una carpeta o unas pistas y caen aquí, en el plato.",
        "queue":                "Cola",
        "the queue is empty":   "La cola está vacía.",
        "clear queue":          "Vaciar la cola",
        "save as list":         "Guardar como lista",
        "move up":              "Subir",
        "move down":            "Bajar",
        "remove from queue":    "Sacar de la cola",
        "name for this list":   "Nombre de la lista",

        /* ---- la biblioteca ---- */
        "artists":              "Artistas",
        "genres":               "Géneros",
        "folders":              "Carpetas",
        "all":                  "Todas",
        "search placeholder":   "Buscar título, artista, álbum…",
        "search":               "Buscar",
        "nothing here":         "Nada por aquí.",
        "unknown artist":       "Sin artista",
        "unknown album":        "Sin álbum",
        "unknown genre":        "Sin género",
        "play all":             "Reproducir todo",

        /* ---- las fuentes ---- */
        "authorised sources":   "Carpetas autorizadas",
        "add a folder":         "Añadir una carpeta",
        "add loose files":      "Añadir ficheros sueltos",
        "folders are recursive":
            "Una carpeta se coge entera: esa y todas las que cuelgan de ella.",
        "nothing is copied":
            "No se copia nada ni se sube nada. Solo se guarda una referencia a lo que ya está en tu disco.",
        "sources persist":
            "Este navegador recuerda tus carpetas entre sesiones. Al recargar basta un clic para volver a autorizarlas.",
        "sources do not persist":
            "Este navegador no puede guardar el permiso sobre una carpeta, así que los ficheros que elijas se recuerdan como una lista fija. Lo que añadas después a la carpeta no aparecerá.",
        "upload warning explained":
            "Tu navegador te preguntará si quieres «subir» la carpeta. Es su forma genérica de decir «entregar estos ficheros a la página»: no se envía nada a ninguna parte, y no hay servidor al que enviarlo.",
        "snapshot warning":
            "Es una foto fija: lo que añadas después a esta carpeta no aparecerá. Vuelve a añadirla para refrescarla.",
        "authorise":            "Autorizar",
        "rescan":               "Releer",
        "no sources yet":       "Todavía no hay fuentes.",
        "reading":              "Leyendo…",
        "waiting for permission": "Esperando permiso",
        "permission denied":    "Permiso denegado",
        "no audio here":        "Ahí no hay ficheros de audio.",
        "that file could not be read":
            "Ese fichero no se ha podido leer. Puede que lo hayas movido o borrado.",
        "could not be read":    "No se ha podido leer",
        "folder":               "Carpeta",
        "files":                "Ficheros",
        "remove this source":   "Quitar esta fuente",

        /* ---- las listas guardadas ---- */
        "saved lists":          "Listas guardadas",
        "no saved lists yet":   "Todavía no hay listas guardadas.",
        "how to save a list":   "Monta una cola en el reproductor y guárdala con un nombre.",
        "delete this list":     "¿Borrar esta lista?",

        /* ---- ayuda y créditos ---- */
        "your music your way":  "Tu música, como quieras verla.",
        "about lead":
            "Yunomúsica lee la música que ya está en tu dispositivo y la ordena por artista, álbum, género y carpeta. Funciona entera en el navegador: sin cuenta, sin subir nada, sin rastreo.",
        "how it works":         "Cómo funciona",
        "help pick":
            "Autoriza una carpeta en Fuentes. Se lee entera, con sus subcarpetas, y las etiquetas ID3 de cada fichero dan el artista, el álbum y el género.",
        "help queue":
            "El reproductor es el plato: la cola es lo que has cargado, en el orden que quieras. Añade, reordena y saca pistas mientras suena.",
        "help lists":
            "Guarda una cola con un nombre y la recuperas luego — como referencias a tus ficheros, nunca como copias.",
        "help privacy":
            "Tus ficheros no salen del dispositivo. No hay servidor al que mandarlos.",
        "do not show this again": "No volver a mostrar",
        "made by artgins":      "Hecho por ArtGins",
        "about tagline":        "Sobre Yuneta — un framework dirigido por eventos para sistemas distribuidos.",
    },
};

export {es};
