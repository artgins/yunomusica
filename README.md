# yunomúsica

Una SPA pequeña y offline para escuchar la música que tienes en el móvil (o en
el ordenador). Autorizas una carpeta, se lee **aquí, en el dispositivo** —nada
se copia y nada se sube—, y montas con ella la cola que quieras.

Construida con **Vite + Yuneta (`@yuneta/gobj-ui`)**: la cáscara declarativa
`C_YUI_SHELL` + `C_YUI_NAV` pone la barra superior y el menú (barra lateral en
escritorio, barra de iconos abajo en móvil); el resto son cinco gclasses de la
app y tres stores de dominio.

## Las cuatro pantallas

**Reproductor** (inicio) — lo primero que ves son los mandos: play/pausa,
anterior, siguiente, aleatorio, repetir, la carátula, el título de lo que suena
y la barra de posición. Debajo, **la cola**: lo que has cargado, en el orden que
quieras. Se reordena y se quitan pistas sin parar la música. Es el plato, y dice
si lo que suena es una **lista guardada** (por su nombre, y si la has tocado
desde entonces) o una cola montada a mano.

**Biblioteca** — cinco maneras de mirar las mismas pistas (artistas, álbumes,
géneros, carpetas y la lista plana), con buscador.

**Fuentes** — las carpetas autorizadas, y el único sitio desde el que se añade
música. Aquí es donde la app dice en voz alta qué hace con tu disco: no copia
nada, coge la carpeta **entera** (esa y todas las de debajo), y te avisa de qué
puede y qué no puede recordar tu navegador.

**Listas** — las colas que has guardado con nombre.

## El play es explícito

Navegar no cambia nunca lo que suena. Es la regla de la que salen todas las
demás:

- **Pinchar una fila** la selecciona y despliega el resto de datos de la pista
  (álbum, género, año, número, fuente y ruta). Es el único gesto que solo mira.
- **▶ en una fila** es una **escucha previa**: suena en su propio elemento de
  audio, pausa la cola, no la toca, y ofrece la única decisión que importa —
  añadirla o dejarlo.
- **+ en una fila** la añade a la cola.
- **"Reproducir todo"** de un álbum o un artista sí sustituye la cola, y por eso
  **pregunta antes** si hay algo que perder. El diálogo ofrece tres respuestas,
  no dos: añadir, sustituir, o cancelar. Con el plato vacío no pregunta nada.

La cola sobrevive a un F5: qué pistas, de qué lista venían, cuál sonaba y por
qué segundo iba. Se restaura **en pausa**: una página que empieza a hacer ruido
sola es peor que una que no restaura nada.

## Qué se guarda, y qué no

Los ficheros **nunca se copian ni se suben**. Lo que se guarda en IndexedDB es
una *referencia*:

- **Carpeta** (`FileSystemDirectoryHandle`, File System Access API): sobrevive a
  la recarga, así que la carpeta sigue en la lista y basta un clic para volver a
  autorizarla — sin navegar el árbol otra vez. Al releerla aparecen los ficheros
  nuevos. **Solo Chromium** (Chrome, Edge, Chrome en Android).
- **Ficheros** (los propios objetos `File`, que también son clonables): es lo que
  reciben los demás navegadores y el selector de ficheros sueltos. La lista se
  recuerda, pero es una **foto fija**: lo que añadas después a la carpeta no
  aparece. Van en trozos de 250 por registro, porque un solo registro con miles
  de `File` supera el límite de clonado estructurado y la escritura se rechaza.

Una lista guardada son pares `(fuente, ruta)`, no audio. Si su fuente no está
autorizada en esta sesión, la vista dice cuántas entradas faltan en vez de
reproducir una lista más corta a la callada.

### Solo se escanea cuando hace falta

Una carpeta se recorre **al añadirla y al pulsar Releer**, no al arrancar. Las
etiquetas ya leídas se guardan por ruta, así que abrir la app **restaura** la
biblioteca sin abrir un solo fichero: medido, 0 recorridos y 0 lecturas frente a
los 2 y 6 del alta. Una pista restaurada lleva ruta pero no fichero; el fichero
se resuelve **al reproducir**, bajando por el handle de la carpeta, que es
además el único momento en que el permiso hace falta de verdad.

El precio, que conviene saber: **lo que añadas a la carpeta desde fuera no
aparece solo**. Hay que pulsar Releer.

De las etiquetas se lee **solo la etiqueta**. La cabecera ID3v2 son 10 bytes y
declara su tamaño exacto, así que se lee eso y nada más: en 300 ficheros, 0,04
MiB en vez de los 150 MiB que costaba leer un bloque fijo de 512 KB por fichero.

## Idiomas y colores

Diez idiomas, todos empaquetados (no hay backend del que bajarlos): español,
inglés, chino, hindi, árabe, portugués, ruso, japonés, alemán y francés. Las
claves son inglés en minúscula y el respaldo es `en`, así que una clave sin
traducir sale en inglés, no en crudo.

El árabe arrastra `dir="rtl"` a `<html>`. La hoja de estilos está escrita con
**propiedades lógicas** (`inline-start`/`inline-end`, `text-align: start`), así
que la interfaz se refleja sola: no hay una segunda hoja de estilos ni reglas
`[dir]` que mantener en sincronía.

Ningún texto interpola un número. Las cifras se pintan en su propio nodo junto a
un sustantivo llano (`12` + `pistas`), que deja a todos los idiomas fuera del
lío de las reglas de plural — el árabe solo ya tiene seis formas.

Cinco **paletas**: oro, hielo, rosa, hoja y *según la carátula*, que es la que
había antes de que hubiera paletas y sigue siendo la de por defecto — el acento
se tiñe con el color dominante del disco que suena. Elegir una paleta apaga ese
tinte; volver a «según la carátula» se lo devuelve.

Cada paleta está definida **dos veces**, porque un color que se lee bien sobre
blanco casi nunca es el que se lee bien sobre casi-negro: el bloque de esquema
oscuro cambia el color por su gemelo legible y la tinta que va encima. Los
contrastes se miden en un test, no se juzgan a ojo: las diez combinaciones de
paleta y esquema cumplen 3:1 para el acento sobre la página y 4,5:1 para la
tinta sobre el acento.

## Además

- **Etiquetas ID3** (v2.2/2.3/2.4 y v1) leídas sin dependencias, con carátula;
  si un fichero no las tiene, se deduce del nombre y de la carpeta. El audio se
  reconoce por extensión **y por tipo MIME**, porque Android entrega ficheros
  cuyo nombre no lleva extensión usable.
- **`MediaSession`**: controles del sistema y de los auriculares.
- **Teclado**: espacio, ←, →.
- **PWA instalable**: manifiesto con iconos 192/512 y uno *maskable*. Instalarla
  no es cosmético: Chrome solo ofrece el permiso permanente de carpetas a apps
  instaladas.
- **Barra de escaneo** visible desde cualquier pantalla mientras se lee una
  carpeta, con carpeta, contador, reloj y botón de **parar** — que conserva lo
  ya leído.
- **Aviso de versión nueva**: el build emite un `version.json` y la app compara
  su propio sello al arrancar y al volver a la pestaña. Sin esto, una pestaña
  abierta durante un despliegue sigue con el bundle viejo y el único síntoma es
  que un arreglo «no funciona».
- **Diagnóstico** en Fuentes: qué API tiene el navegador, si el almacenamiento
  es duradero, si la última escritura aterrizó, y por fuente cuántos ficheros
  entregó el recorrido, cuántos se tomaron como audio y si una referencia
  guardada **todavía se puede leer**.
- El **diálogo de bienvenida** (qué es esto, cómo se usa, créditos) sale una
  vez, lleva «no volver a mostrar» y queda siempre a mano en la barra y en el
  pie del reproductor. Lleva también la versión y la fecha de compilación.

## Desarrollo

```bash
npm install      # bulma, i18next y @yuneta/{gobj-js,gobj-ui} desde el registro npm
npm run dev      # http://localhost:5173
npm run build    # bundle de producción en ./dist
npm run preview  # sirve ./dist localmente
```

Las librerías de Yuneta se consumen como dependencias versionadas del registro,
no enlazadas a un checkout: `vite.config.js` no tiene alias.

**La versión se sube en cada cambio.** `vite.config.js` empotra `version` y la
fecha de compilación como constantes y las emite además en `version.json`; las
dos cosas se ven en el diálogo de ayuda y en el diagnóstico. Es lo que permite
saber, sin adivinar, si lo que hay en pantalla es lo último desplegado.

## Despliegue

`npm run build` deja el sitio estático en `./dist`. `deploy_yunomusica.sh` hace
una copia de seguridad y un `rsync` de `./dist/` al host
(`yunomusica.com:/yuneta/gui/yunomusica.com`). No hay backend: es un árbol de
gobjs puro con enrutado por hash.

```bash
npm run build && ./deploy_yunomusica.sh
```

El vhost sirve `.webmanifest` como `application/manifest+json` y revalida
`index.html` en cada petición, para que un redespliegue se recoja al momento.

## Estructura

| Fichero | Qué es |
|---|---|
| `src/main.js` | arranque: registra gclasses, i18n, crea el yuno |
| `src/app_config.json` | la cáscara declarativa: barra, menú y las cuatro rutas |
| `src/c_musica.js` | servicio raíz: shell, mini-player, barra de escaneo, tema, paleta, idioma, arranque |
| `src/c_mus_deck.js` | **Reproductor**: mandos arriba, cola debajo |
| `src/c_mus_view.js` | **Biblioteca**: las cinco agrupaciones y su detalle |
| `src/c_mus_sources.js` | **Fuentes**: carpetas autorizadas, permisos, relectura, diagnóstico |
| `src/c_mus_lists.js` | **Listas**: las colas guardadas |
| `src/about_dialog.js` | el diálogo de bienvenida / ayuda / créditos |
| `src/confirm_replace.js` | «¿sustituir lo que hay en el plato?» — añadir, sustituir o cancelar |
| `src/update_check.js` | ¿sigue esta pestaña con el bundle desplegado? |
| `src/music_store.js` | dominio: ID3, biblioteca, cola, escucha previa y reproducción |
| `src/sources_store.js` | las fuentes autorizadas, su lectura recursiva y su diagnóstico |
| `src/playlists_store.js` | las listas guardadas y su resolución |
| `src/idb.js` | el envoltorio mínimo sobre IndexedDB |
| `src/locales/` | `locales.js` + los diez ficheros de traducción |
| `src/musica.css` | estilos de la app, incluidas las paletas |

## Un par de cosas que cuesta descubrir dos veces

- El shell coloca sus vistas como `.yui-zone-center > * { flex: 1 0 auto }`: son
  **elementos flex con `shrink: 0`**, así que una vista sin `width: 100%` se
  dimensiona por su contenido y ya no encoge. Una sola cadena larga sin cortes
  (una ruta, una lista de nombres) se lleva la vista fuera de la pantalla del
  móvil. Lo mismo con `min-width: auto` en los elementos de un grid.
- Un `File` restaurado desde IndexedDB **no conserva `webkitRelativePath`**: hay
  que guardar la ruta a su lado o el caché de etiquetas falla en todos.
- `createElement2` recorta los nodos de texto: la separación entre una cifra y
  su sustantivo la pone el CSS, no el marcado.
