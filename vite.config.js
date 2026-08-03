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
import { readFileSync } from "fs";

/*  The version, and the moment this bundle was built, baked in as
    constants. Both are shown in the help dialog and in the Sources
    diagnostics, so "am I looking at the latest one?" is a question the
    app answers itself instead of one settled by clearing caches. */
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const stamp = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
        __BUILD_STAMP__: JSON.stringify(stamp),
    },
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
