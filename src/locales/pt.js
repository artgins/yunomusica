/***********************************************************************
 *          pt.js
 *
 *          Portuguese translations. See en.js for the conventions and for
 *          the canonical key set.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
const pt = {
    name: "Português",
    dir: "ltr",

    translation: {
        "player":               "Reprodutor",
        "library":              "Biblioteca",
        "sources":              "Fontes",
        "lists":                "Listas",
        "add folder":           "Adicionar pasta",
        "add files":            "Adicionar ficheiros",
        "theme":                "Tema claro / escuro",
        "colours":              "Cor",
        "palette auto":         "Pela capa",
        "palette gold":         "Ouro",
        "palette ice":          "Gelo",
        "palette rose":         "Rosa",
        "palette leaf":         "Folha",
        "language":             "Idioma",
        "help":                 "Ajuda e créditos",

        "play":                 "Reproduzir",
        "pause":                "Pausa",
        "previous":             "Anterior",
        "next":                 "Seguinte",
        "shuffle":              "Aleatório",
        "repeat":               "Repetir",
        "back":                 "Voltar",
        "close":                "Fechar",
        "cancel":               "Cancelar",
        "save":                 "Guardar",
        "delete":               "Eliminar",
        "remove":               "Remover",
        "add to queue":         "Adicionar à fila",
        "tracks":               "faixas",
        "n albums":             "álbuns",
        "albums":               "Álbuns",
        "entries":              "entradas",
        "missing":              "em falta",
        "reading tags":         "A ler etiquetas…",

        "nothing cued":         "Nada carregado",
        "load something to start":
            "Adiciona uma pasta ou algumas faixas e aparecem aqui, no prato.",
        "queue":                "Fila",
        "the queue is empty":   "A fila está vazia.",
        "clear queue":          "Esvaziar a fila",
        "follow playing":       "Acompanhar o que toca",
        "save as list":         "Guardar como lista",
        "move up":              "Subir",
        "move down":            "Descer",
        "remove from queue":    "Tirar da fila",
        "name for this list":   "Nome desta lista",

        "artists":              "Artistas",
        "genres":               "Géneros",
        "folders":              "Pastas",
        "all":                  "Todas",
        "search placeholder":   "Procurar título, artista, álbum…",
        "search":               "Procurar",
        "nothing here":         "Não há nada aqui.",
        "unknown artist":       "Artista desconhecido",
        "unknown album":        "Álbum desconhecido",
        "unknown genre":        "Género desconhecido",
        "play all":             "Reproduzir tudo",
        "replace the queue":
            "Substituir o que está no prato?",
        "replace warning":
            "Reproduzir isto descarta a fila que tens agora e começa do início do que escolheste.",
        "replace and play":
            "Substituir e reproduzir",
        "on the deck":
            "já no prato",
        "preview":              "Ouvir",
        "previewing":           "A ouvir",
        "temporary queue":      "Fila montada à mão",
        "playing list":         "Lista",
        "edited":               "alterada",
        "add music in sources": "Adiciona música em Fontes",
        "play this":            "Reproduzir esta",
        "album":                  "Álbum",
        "genre":                "Género",
        "year":                 "Ano",
        "track number":         "Faixa",
        "path":                 "Ficheiro",
        "source":               "Fonte",

        "authorised sources":   "Pastas autorizadas",
        "add a folder":         "Adicionar uma pasta",
        "add loose files":      "Adicionar ficheiros soltos",
        "folders are recursive":
            "Uma pasta é lida por inteiro: essa e todas as que estão abaixo dela.",
        "nothing is copied":
            "Nada é copiado nem enviado. Guarda-se apenas uma referência ao que já está no teu disco.",
        "allow on every visit":
            "A pasta é lembrada, mas a permissão sobre ela é do navegador. O Chrome no Android volta a pedi-la em cada arranque, e nenhuma definição desta aplicação muda isso — por isso autorizar é um toque no ecrã do reprodutor, onde chegas ao abrir. Se o teu navegador oferecer «Permitir em todas as visitas», ao escolheres deixa de perguntar.",
        "folders need authorising":
            "Pastas à espera de autorização",
        "sources persist":
            "Este navegador lembra-se das tuas pastas entre sessões. Depois de recarregar, basta um clique para voltar a autorizá-las.",
        "storage may be cleared":
            "O teu navegador não concedeu armazenamento duradouro, por isso pode descartar as tuas pastas quando precisar de espaço — ou se estiver configurado para limpar os dados do site ao sair. Se as tuas pastas desaparecem, é por isto.",
        "could not be saved":
            "Não foi possível guardar as tuas pastas: este navegador não deixa a aplicação armazenar nada. Perder-se-ão quando o fechares.",
        "another tab is holding it":
            "Outro separador desta aplicação está aberto com uma versão anterior e está a reter a base de dados. Feche-o e recarregue esta página.",
        "sources do not persist":
            "Este navegador não consegue guardar a permissão sobre uma pasta, por isso os ficheiros que escolheres ficam como uma lista fixa. As faixas acrescentadas depois à pasta não aparecerão.",
        "upload warning explained":
            "O teu navegador vai perguntar se queres «carregar» a pasta. É a forma genérica de dizer «entregar estes ficheiros à página»: não é enviado nada para lado nenhum, e não há servidor para onde enviar.",
        "snapshot warning":
            "É uma fotografia fixa: os ficheiros acrescentados depois a esta pasta não aparecerão. Adiciona-a de novo para a atualizar.",
        "authorise":            "Autorizar",
        "rescan":               "Reler",
        "no sources yet":       "Ainda não há fontes.",
        "reading":              "A ler…",
        "preparing folder":
            "A preparar a pasta…",
        "this can take a while":
            "Pode demorar um bocado: o navegador está a entregar os ficheiros, e uma pasta de música grande leva tempo. Não está a ser enviado nada para lado nenhum.",
        "stop":                 "Parar",
        "stopping":                 "A parar…",
        "stopped":              "Parado antes de acabar a pasta",
        "waiting for permission": "À espera de permissão",
        "permission denied":    "Permissão negada",
        "no audio here":        "Não há ficheiros de áudio aí.",
        "that file could not be read":
            "Não foi possível ler esse ficheiro. Pode ter sido movido ou eliminado.",
        "could not be read":    "Não foi possível ler",
        "folder":               "Pasta",
        "files":                "Ficheiros",
        "remove this source":   "Remover esta fonte",
        "diagnostics":         "Diagnóstico",
        "copy":                "Copiar",
        "new version":         "Há uma versão nova",
        "reload":             "Recarregar",

        /* ---- installing ---- */
        "install this app":     "Instalar a aplicação",
        "install why":
            "Instalada, a yunomúsica abre como qualquer outra aplicação do dispositivo — e, o que mais importa, o navegador passa a poder guardar a permissão sobre as suas pastas de música em vez de a pedir de novo a cada arranque.",
        "install so folders stay": "Assim as suas pastas continuam autorizadas",
        "install":             "Instalar",
        "not now":             "Agora não",

        "saved lists":          "Listas guardadas",
        "no saved lists yet":   "Ainda não há listas guardadas.",
        "how to save a list":   "Monta uma fila no reprodutor e guarda-a com um nome.",
        "delete this list":     "Eliminar esta lista?",

        "your music your way":  "A tua música, como a quiseres ver.",
        "about lead":
            "O Yunomúsica lê a música que já está no teu dispositivo e organiza-a por artista, álbum, género e pasta. Funciona inteiramente no navegador: sem conta, sem envios, sem rastreio.",
        "how it works":         "Como funciona",
        "help pick":
            "Autoriza uma pasta em Fontes. É lida por inteiro, com as subpastas, e as etiquetas ID3 de cada ficheiro dão o artista, o álbum e o género.",
        "help queue":
            "O reprodutor é o prato: a fila é o que carregaste, na ordem que quiseres. Acrescenta, reordena e tira faixas enquanto toca.",
        "help lists":
            "Guarda uma fila com um nome e ela volta da próxima vez — como referências aos teus ficheiros, nunca como cópias.",
        "help privacy":
            "Os teus ficheiros não saem do dispositivo. Não há servidor para onde os enviar.",
        "do not show this again": "Não voltar a mostrar",
        "made by artgins":      "Feito pela ArtGins",
        "made with yuneta":     "Feito com Yuneta",
        "about tagline":        "Uma framework orientada a eventos para sistemas distribuídos.",
    },
};

export {pt};
