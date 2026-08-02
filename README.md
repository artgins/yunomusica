# yunomúsica

Una SPA pequeña, offline y bonita para escuchar la música que tienes en el
móvil (o en el ordenador). Eliges una carpeta o unos ficheros, se leen **aquí,
en el dispositivo** —nada se sube a ningún sitio—, y la biblioteca queda
organizada de cuatro maneras, con un reproductor siempre a mano.

Construida con **Vite + Yuneta (`@yuneta/gobj-ui`)**: la cáscara declarativa
`C_YUI_SHELL` + `C_YUI_NAV` pone la barra superior y el menú (barra lateral en
escritorio, barra de iconos abajo en móvil); el resto son dos gclasses de la
app y un pequeño store de dominio.

## Qué hace

- **Cuatro vistas** de la misma biblioteca: **Artistas**, **Álbumes**,
  **Géneros** y **Carpetas**, más **Todas** (lista plana). Cada agrupación
  permite entrar a su detalle (las pistas del artista, del álbum…).
- **Buscador** que filtra por título, artista, álbum o género.
- **Reproductor** acoplado abajo (mini-player) y **pantalla completa**
  “sonando ahora”, con anterior / play-pausa / siguiente, aleatorio, repetir,
  barra de posición, `MediaSession` (controles del sistema y de los
  auriculares) y teclas (espacio, ←, →).
- **Etiquetas ID3** (v2.2/2.3/2.4 y v1) leídas sin dependencias, con carátula;
  si un fichero no tiene etiquetas, se deduce del nombre y de la carpeta.
- **Tema claro / oscuro** (por defecto oscuro) y **acento** que se tiñe con el
  color dominante de la carátula que suena.

Todo es local: los ficheros se leen con la File API y se reproducen desde un
object URL. Al recargar hay que volver a elegir (el navegador no guarda el
permiso sobre tus ficheros).

## Desarrollo

```bash
npm install      # instala bulma + i18next + los file: a ../gobj-ui.js y ../gobj-js
npm run dev      # http://localhost:5173
npm run build    # bundle de producción en ./dist
npm run preview  # sirve ./dist localmente
```

Se resuelve `@yuneta/gobj-js` a su fuente (`src/index.js`) y `@yuneta/gobj-ui`
a la raíz del repo hermano, igual que los demás consumidores in-repo — así la
app sigue la fuente que estés editando.

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
| `src/app_config.json` | la cáscara declarativa: barra, menú y las cinco vistas |
| `src/c_musica.js` | servicio raíz: aloja el shell + el reproductor + tema |
| `src/c_mus_view.js` | la vista que pinta cada agrupación y su detalle |
| `src/music_store.js` | dominio: lectura ID3, biblioteca y reproducción |
| `src/picker.js` | elegir carpeta / ficheros del dispositivo |
| `src/musica.css` | estilos de la app (las vistas y el reproductor) |
| `musica.html` | la página original de un chat, referencia del diseño |
