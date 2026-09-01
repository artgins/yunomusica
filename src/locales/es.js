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
        "colours":              "Color",
        "palette auto":         "Según la carátula",
        "palette gold":         "Oro",
        "palette ice":          "Hielo",
        "palette rose":         "Rosa",
        "palette leaf":         "Hoja",
        "language":             "Idioma",
        "help":                 "Ayuda y créditos",
        "more":                 "Más",
        "developer":            "Desarrollo",
        "site map":             "Mapa del sitio",

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
        /*  ---- cuentas: todas las formas plurales del idioma ---- */
        "n tracks_one": "pista",
        "n tracks_many": "pistas",
        "n tracks_other": "pistas",
        "n albums_one": "álbum",
        "n albums_many": "álbumes",
        "n albums_other": "álbumes",
        "n entries_one": "entrada",
        "n entries_many": "entradas",
        "n entries_other": "entradas",
        "n missing_one": "no encontrada",
        "n missing_many": "no encontradas",
        "n missing_other": "no encontradas",
        "n folders inside_one": "carpeta dentro",
        "n folders inside_many": "carpetas dentro",
        "n folders inside_other": "carpetas dentro",
        "albums":               "Álbumes",
        "reading tags":         "Leyendo etiquetas…",

        /* ---- el plato ---- */
        "nothing cued":         "Nada cargado",
        "load something to start":
            "Añade una carpeta o unas pistas y caen aquí, en el plato.",
        "queue":                "Cola",
        "the queue is empty":   "La cola está vacía.",
        "empty the queue?":   "¿Vaciar la cola?",
        "clear queue":          "Vaciar la cola",
        "maximise the queue": "Ver la cola entera",
        "show the player":    "Ver el reproductor",
        "follow playing":       "Seguir lo que suena",
        "save as list":         "Guardar como lista",
        "already saved":        "Ya guardada, y sin cambios",
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
        "replace the queue":
            "¿Sustituir lo que hay en el plato?",
        "replace warning":
            "Reproducir esto descarta la cola que tienes ahora y empieza por el principio de lo que has elegido.",
        "replace and play":
            "Sustituir y reproducir",
        "on the deck":
            "ya en el plato",
        "preview":              "Escuchar",
        "previewing":           "Escuchando",
        "temporary list":      "Lista temporal",
        "back to the deck":    "Volver a la cola",
        "to the deck":        "A la cola",
        "look inside":       "Ver dentro",
        "already on the deck": "Ya en la cola",
        "temporary queue":      "Cola montada a mano",
        "playing list":         "Lista",
        "edited":               "modificada",
        "add music in sources": "Añade música en Fuentes",
        "play this":            "Reproducir esta",
        "album":                  "Álbum",
        "genre":                "Género",
        "year":                 "Año",
        "track number":         "Pista",
        "path":                 "Fichero",
        "source":               "Fuente",

        /* ---- el gráfico ---- */
        "viz flight":           "Vuelo",
        "viz notes":            "Notas",
        "viz spectrum":         "Espectro",
        "viz wave":             "Onda",
        "viz chroma":           "Cromática",
        "viz off":              "Sin gráfico",

        "loved":                "Con corazón",
        "most played":          "Más escuchadas",
        "clear the counts":     "Poner los contadores a cero",
        "yes, clear them":      "Sí, ponerlos a cero",
        "hearts are not touched": "Los corazones no se tocan",
        "no hearts yet":        "Todavía no hay ningún corazón.",
        "how to give a heart":  "Toca el corazón que hay junto a un nombre para dárselo. Otro toque, otro corazón.",
        "nothing played yet":   "Todavía no has escuchado nada.",
        "how playing counts":   "Una canción cuenta cuando ha sonado de verdad un rato, así que pasarla de largo no cuenta.",
        "artist":               "Artista",
        "times played":         "Veces escuchada",
        "played through":       "completas",
        "hearts":               "Corazones",
        "give a heart":         "Dar un corazón",
        "take one back":        "Quitar uno",
        "reset hearts":         "Poner los corazones a cero",
        "forget these counts":  "Olvidar estos contadores",

        /* ---- las fuentes ---- */
        "authorised sources":   "Carpetas autorizadas",
        "add a folder":         "Añadir una carpeta",
        "add loose files":      "Añadir ficheros sueltos",
        "folders are recursive":
            "Una carpeta se coge entera: esa y todas las que cuelgan de ella.",
        "no cover for this":
            "Este disco no trae carátula",
        "covers offer detail":
            "Puedo buscarla en internet: salen artista y álbum, nada más.",
        "look for it":
            "Buscarla",
        "retry the ones that failed":
            "Reintentar las que no salieron",
        "cover not found":
            "No encontré la carátula",
        "cover retry detail":
            "Puede que el servicio estuviera caído. Puedes volver a intentarlo.",
        "try again":
            "Reintentar",
        "look for covers online":
            "Buscar carátulas en internet",
        "covers online explained":
            "Encendido, cuando suena un disco sin carátula dentro del fichero salen su artista y su álbum como texto — nada más: ni ficheros, ni listas, ni identificadores. Se pregunta solo por lo que estás escuchando, nunca por tu biblioteca entera, y lo que llega se guarda aquí: ese disco no se vuelve a preguntar nunca. Apágalo y de esta app no sale absolutamente nada.",
        "covers online working":
            "Buscando la carátula de «{{asking}}»…",
        "covers found_one":
            "Encontrada {{count}}.",
        "covers found_many":
            "Encontradas {{count}}.",
        "covers found_other":
            "Encontradas {{count}}.",
        "covers missed_one":
            "Sin resultado: {{count}} (no se vuelve a preguntar en un mes).",
        "covers missed_many":
            "Sin resultado: {{count}} (no se vuelven a preguntar en un mes).",
        "covers missed_other":
            "Sin resultado: {{count}} (no se vuelven a preguntar en un mes).",
        "nothing is copied":
            "Tus ficheros no se copian ni se suben: solo se guarda una referencia a lo que ya está en tu disco. Lo único que sale de aquí es el artista y el álbum del disco que estés escuchando, como texto, para buscar su carátula — y eso se apaga justo aquí debajo.",
        "allow on every visit":
            "La carpeta se recuerda, pero el permiso sobre ella lo gestiona el navegador. Chrome en Android lo vuelve a pedir en cada arranque, y ningún ajuste de esta app puede evitarlo — por eso autorizar es un toque en la pantalla del reproductor, donde caes al abrir. Si tu navegador ofrece «Permitir en cada visita», al elegirlo dejará de preguntar.",
        "folders need authorising":
            "Carpetas pendientes de autorizar",
        "sources persist":
            "Este navegador recuerda tus carpetas entre sesiones. Al recargar basta un clic para volver a autorizarlas.",
        "storage may be cleared":
            "Tu navegador no ha concedido almacenamiento duradero, así que puede descartar tus carpetas cuando necesite espacio — o si está configurado para borrar los datos del sitio al salir. Si tus carpetas desaparecen, es por esto.",
        "could not be saved":
            "No se han podido guardar tus carpetas: este navegador no deja a la app almacenar nada. Se perderán al cerrarlo.",
        "another tab is holding it":
            "Otra pestaña de esta app está abierta con una versión anterior y tiene la base de datos retenida. Ciérrala y recarga esta página.",
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
        "waiting its turn":   "Esperando a la carpeta de antes",
        "preparing folder":
            "Preparando la carpeta…",
        "this can take a while":
            "Puede tardar un rato: el navegador está entregando los ficheros, y una carpeta de música grande lleva su tiempo. No se está enviando nada a ninguna parte.",
        "stop":                 "Parar",
        "stopping":                 "Parando…",
        "stopped":              "Parado antes de acabar la carpeta",
        "waiting for permission": "Esperando permiso",
        "permission denied":    "Permiso denegado",
        "no audio here":        "Ahí no hay ficheros de audio.",
        "that file could not be read":
            "Ese fichero no se ha podido leer. Puede que lo hayas movido o borrado.",
        "could not be read":    "No se ha podido leer",
        "folder":               "Carpeta",
        "files":                "Ficheros",
        "remove this source":   "Quitar esta fuente",
        "remove this source?":  "¿Quitar esta fuente?",

        /*  ---- una elección que habría duplicado algo ---- */
        "folder already added":
            "«{{name}}» ya está en la lista. No se ha añadido nada dos veces. Si le has metido ficheros desde entonces, usa Releer en su fila.",
        "folder inside another":
            "«{{name}}» está dentro de «{{other}}», que ya está — y una carpeta se toma entera, así que sus pistas ya están en tu biblioteca.",
        "files already added":
            "Esos ficheros ya están. Los tiene: {{other}}. No se ha añadido nada dos veces.",
        "some were already in_one":
            "{{count}} ya estaba, en: {{other}}. Ese se ha dejado fuera; el resto se ha añadido.",
        "some were already in_many":
            "{{count}} ya estaban, en: {{other}}. Esos se han dejado fuera; el resto se ha añadido.",
        "some were already in_other":
            "{{count}} ya estaban, en: {{other}}. Esos se han dejado fuera; el resto se ha añadido.",
        "folder contains others":
            "«{{name}}» tiene dentro algo que ya está añadido: {{other}}. Para coger la carpeta entera sin que esas pistas salgan dos veces hay que quitarlo primero — y sus escuchas y sus corazones se van con ello.",
        "remove it and add this":
            "Quitarlo y añadir esta",
        "understood":           "Entendido",
        "diagnostics":         "Diagnóstico",
        "copy":                "Copiar",
        "new version":         "Hay una versión nueva",
        "reload":             "Recargar",

        /* ---- instalar la app ---- */
        "install this app":     "Instalar la aplicación",
        "install why":
            "Instalada, yunomúsica se abre como cualquier otra aplicación del dispositivo — y, lo que más importa, el navegador puede conservar el permiso sobre tus carpetas de música en vez de volver a pedirlo en cada arranque.",
        "install so folders stay": "Así tus carpetas siguen autorizadas",
        "install":             "Instalar",
        "not now":             "Ahora no",

        /* ---- las listas guardadas ---- */
        "saved lists":          "Listas guardadas",
        "no saved lists yet":   "Todavía no hay listas guardadas.",
        "how to save a list":   "Monta una cola en el reproductor y guárdala con un nombre.",
        "delete this list":     "¿Borrar esta lista?",

        /* ---- ayuda y créditos ---- */
        "your music your way":  "Tu música, como quieras verla.",
        "about lead":
            "Yunomúsica lee la música que ya está en tu dispositivo y la ordena por artista, álbum, género y carpeta. Funciona entera en el navegador: sin cuenta, sin rastreo y sin subir tus ficheros a ningún sitio.",
        "how it works":         "Cómo funciona",
        "help pick":
            "Autoriza una carpeta en Fuentes. Se lee entera, con sus subcarpetas, y las etiquetas ID3 de cada fichero dan el artista, el álbum y el género.",
        "help queue":
            "El reproductor es el plato: la cola es lo que has cargado, en el orden que quieras. Añade, reordena y saca pistas mientras suena.",
        "help lists":
            "Guarda una cola con un nombre y la recuperas luego — como referencias a tus ficheros, nunca como copias.",
        "help privacy":
            "Tus ficheros no salen del dispositivo: no hay servidor al que mandarlos. Para buscar carátulas sí sale el artista y el álbum de lo que escuchas, y eso se apaga en Fuentes.",
        "do not show this again": "No volver a mostrar",
        "made by artgins":      "Hecho por ArtGins",
        "made with yuneta":     "Hecho con Yuneta",
        "about tagline":        "Un framework dirigido por eventos para sistemas distribuidos.",

        /* ---- el menú, y la hoja de desarrollo que hay detrás ---- */
        "source code":          "Código fuente",
        "session log":          "Registro de la sesión",
        "traces":               "Trazas",
        "refresh":              "Actualizar",
        "loading":              "Cargando…",
        "clear log":            "Vaciar registro",
        "copied":               "Copiado",
        "log empty":
            "Todavía no hay nada anotado. El registro se escribe solo mientras la app funciona.",
        "no unexpected stop":   "No consta ninguna parada inesperada.",
        "last unexpected stop": "La app se paró y volvió a arrancar",
        "browser discarded the app":
            "El navegador descartó la app para hacer sitio.",
        "stopped while playing": "Se paró mientras sonaba:",
        "silent for":           "Callada durante:",
        "memory in use":        "Memoria en uso:",
        "restarts today":       "Reinicios en las últimas 24 horas:",
        "unexpected stops today":
            "Paradas inesperadas en las últimas 24 horas:",

        /* ---- el mapa del sitio se dibuja con las claves PROPIAS de gobj-ui — sin traducir se ven como la clave ---- */
        "site map hint":
            "Cada sitio al que puede llegar la app es una URL. Toca uno para ir.",
        "print":                "Imprimir",
        "filter":               "Filtrar…",
        "matches":              "coincidencias",
        "show references":      "Mostrar referencias",
        "shown above":          "ya mostrado arriba",
        "you are here":         "Estás aquí",
    },
};

export {es};
