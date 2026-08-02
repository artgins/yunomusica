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
y la barra de posición. Debajo, **la cola**: lo que has cargado, en el orden
que quieras. Se reordena, se quitan pistas y se añaden carpetas o ficheros
sueltos sin parar la música. Es el plato.

**Biblioteca** — cinco maneras de mirar las mismas pistas (artistas, álbumes,
géneros, carpetas y la lista plana), con buscador. Cada fila ofrece los dos
verbos: **reproducir** sustituye la cola y arranca; **añadir** la amplía sin
interrumpir lo que estás oyendo.

**Fuentes** — las carpetas autorizadas. Aquí es donde la app dice en voz alta
qué hace con tu disco: no copia nada, coge la carpeta **entera** (esa y todas
las de debajo), y te avisa de qué puede y qué no puede recordar tu navegador.

**Listas** — las colas que has guardado con nombre.

## Qué se guarda, y qué no

Los ficheros **nunca se copian ni se suben**. Lo que se guarda en IndexedDB es
una *referencia*:

- **Carpeta** (`FileSystemDirectoryHandle`, File System Access API): sobrevive
  a la recarga, así que la carpeta sigue en la lista y basta un clic para
  volver a autorizarla — sin navegar el árbol otra vez. Al releerla aparecen
  los ficheros nuevos. **Solo Chromium** (Chrome, Edge, Chrome en Android).
- **Ficheros** (los propios objetos `File`, que también son clonables): es lo
  que reciben los demás navegadores y el selector de ficheros sueltos. La lista
  se recuerda, pero es una **foto fija**: lo que añadas después a la carpeta no
  aparece.

Una lista guardada son pares `(fuente, ruta)`, no audio. Si su fuente no está
autorizada en esta sesión, la vista dice cuántas entradas faltan en vez de
reproducir una lista más corta a la callada.

## Idiomas

Diez, todos empaquetados (no hay backend del que bajarlos): español, inglés,
chino, hindi, árabe, portugués, ruso, japonés, alemán y francés. Las claves son
inglés en minúscula y el respaldo es `en`, así que una clave sin traducir sale
en inglés, no en crudo.

El árabe arrastra `dir="rtl"` a `<html>`. La hoja de estilos está escrita con
**propiedades lógicas** (`inline-start`/`inline-end`, `text-align: start`), así
que la interfaz se refleja sola: no hay una segunda hoja de estilos ni reglas
`[dir]` que mantener en sincronía.

Ningún texto interpola un número. Las cifras se pintan en su propio nodo junto
a un sustantivo llano (`12` + `pistas`), que deja a todos los idiomas fuera del
lío de las reglas de plural — el árabe solo ya tiene seis formas.

## Además

- **Etiquetas ID3** (v2.2/2.3/2.4 y v1) leídas sin dependencias, con carátula;
  si un fichero no las tiene, se deduce del nombre y de la carpeta.
- **`MediaSession`**: controles del sistema y de los auriculares.
- **Teclado**: espacio, ←, →.
- **Tema claro / oscuro**, y **acento** teñido con el color dominante de la
  carátula que suena.
- El **diálogo de bienvenida** (qué es esto, cómo se usa, créditos) sale una
  vez, lleva «no volver a mostrar» y queda siempre a mano en la barra y en el
  pie del reproductor.

## Desarrollo

```bash
npm install      # bulma, i18next y @yuneta/{gobj-js,gobj-ui} desde el registro npm
npm run dev      # http://localhost:5173
npm run build    # bundle de producción en ./dist
npm run preview  # sirve ./dist localmente
```

Las librerías de Yuneta se consumen como dependencias versionadas del registro,
no enlazadas a un checkout: `vite.config.js` no tiene alias.

## Despliegue

`npm run build` deja el sitio estático en `./dist`. `deploy_yunomusica.sh` hace
una copia de seguridad y un `rsync` de `./dist/` al host
(`yunomusica.com:/yuneta/gui/yunomusica.com`). No hay backend: es un árbol de
gobjs puro con enrutado por hash.

```bash
npm run build && ./deploy_yunomusica.sh
```

## Estructura

| Fichero | Qué es |
|---|---|
| `src/main.js` | arranque: registra gclasses, i18n, crea el yuno |
| `src/app_config.json` | la cáscara declarativa: barra, menú y las cuatro rutas |
| `src/c_musica.js` | servicio raíz: shell, mini-player, tema, idioma, arranque |
| `src/c_mus_deck.js` | **Reproductor**: mandos arriba, cola debajo |
| `src/c_mus_view.js` | **Biblioteca**: las cinco agrupaciones y su detalle |
| `src/c_mus_sources.js` | **Fuentes**: carpetas autorizadas, permisos, relectura |
| `src/c_mus_lists.js` | **Listas**: las colas guardadas |
| `src/about_dialog.js` | el diálogo de bienvenida / ayuda / créditos |
| `src/music_store.js` | dominio: ID3, biblioteca, cola y reproducción |
| `src/sources_store.js` | las fuentes autorizadas y su lectura recursiva |
| `src/playlists_store.js` | las listas guardadas y su resolución |
| `src/idb.js` | el envoltorio mínimo sobre IndexedDB |
| `src/locales/` | `locales.js` + los diez ficheros de traducción |
| `src/musica.css` | estilos de la app |
