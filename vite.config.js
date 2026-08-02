/***********************************************************************
 *          vite.config.js
 *
 *      Build config for yunomúsica.
 *
 *      @yuneta/gobj-js and @yuneta/gobj-ui come from the npm registry as
 *      ordinary versioned dependencies — no path alias, no `file:` link to
 *      a sibling checkout. gobj-ui publishes its `src/` and exports
 *      "./src/*", so the sub-path imports (/src/*.js, /src/*.css) resolve
 *      straight out of node_modules.
 *
 *      The build emits ./dist, which deploy_yunomusica.sh rsyncs to the
 *      static host. No backend: a pure gobj tree with hash routing.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import { defineConfig } from "vite";

export default defineConfig({
    /*  Hosted from the domain root (/yuneta/gui/yunomusica.com). */
    base: "./",
    resolve: {
        /*
         *  Should a version skew ever give gobj-ui its own nested copy of
         *  a shared lib, a view would bind a second, uninitialised
         *  instance (i18next's module-level t() then renders blank). This
         *  app only uses i18next; keep it deduped.
         */
        dedupe: [
            "i18next",
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
