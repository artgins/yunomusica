/***********************************************************************
 *          locales.js
 *
 *      i18n (i18next) for yunomúsica. The app is Spanish-first: the keys
 *      ARE the Spanish strings the UI ships, so the default bundle is
 *      empty and every key falls back to itself. The shell and the views
 *      translate their DOM through this one shared i18next instance
 *      (deduped in vite.config.js).
 *
 *      There is no language toggle in the toolbar — the app is small and
 *      Spanish — but the shell still needs a translator `t`, so this wires
 *      one whose job is simply to return each key verbatim.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import i18next from "i18next";

export function setup_locale(lng = "es")
{
    i18next.init({
        lng:           lng,
        fallbackLng:   "es",
        resources:     {es: {translation: {}}},
        initImmediate: false,
    });
    return i18next.language || lng;
}
