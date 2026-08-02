/***********************************************************************
 *          vite.config.js
 *
 *      Build config for yunomúsica.
 *
 *      Resolution mirrors the gobj-ui in-repo consumers (test-app /
 *      wattyzer):
 *        - @yuneta/gobj-js -> the sibling checkout SOURCE (src/index.js),
 *          not its built dist/, so the app tracks the current kernel.
 *        - @yuneta/gobj-ui -> that repo's ROOT, so package sub-paths
 *          (/src/*.js, /src/*.css) resolve to the source being edited.
 *      Both are also `file:` deps in package.json, so npm installs the
 *      peer libs (bulma, i18next) into node_modules.
 *
 *      The build emits ./dist, which deploy_yunomusica.sh rsyncs to the
 *      static host. No backend: a pure gobj tree with hash routing.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    /*  Hosted from the domain root (/yuneta/gui/yunomusica.com). */
    base: "./",
    resolve: {
        preserveSymlinks: true,
        /*
         *  gobj-ui ships its OWN node_modules copy of the shared libs.
         *  With preserveSymlinks:true a view that imported one of them
         *  could bind a second, uninitialised copy (i18next's module-level
         *  t() then renders blank). This app only uses i18next, but dedupe
         *  the same set the test-app does so it "just works" if a view
         *  later pulls in another.
         */
        dedupe: [
            "i18next",
        ],
        alias: [
            {
                find: "@yuneta/gobj-js",
                replacement: path.resolve(__dirname, "../gobj-js/src/index.js"),
            },
            {
                find: /^@yuneta\/gobj-ui($|\/)/,
                replacement: path.resolve(__dirname, "../gobj-ui.js") + "/",
            },
        ],
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
    server: {
        watch: {
            usePolling: true,
            interval: 300,
        },
    },
});
