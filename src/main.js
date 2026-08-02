/***********************************************************************
 *          main.js
 *
 *      yunomúsica — entry point.
 *
 *      Wires the gobj-js kernel + the v2 shell/nav stack, registers the
 *      app's two gclasses (C_MUSICA host + C_MUS_VIEW), and starts a yuno
 *      whose default service hosts the shell. All navigation structure
 *      lives in app_config.json.
 *
 *      Import policy: pull the specific gobj-ui modules (shell + nav),
 *      NOT the @yuneta/gobj-ui/index.js barrel — the barrel transitively
 *      loads chart/map components this app does not use.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {
    gobj_start_up,
    gobj_create_yuno,
    gobj_create_default_service,
    gobj_start,
    gobj_play,
    register_c_yuno,
    register_c_timer,
} from "@yuneta/gobj-js";

import {register_c_yui_shell} from "@yuneta/gobj-ui/src/c_yui_shell.js";
import {register_c_yui_nav}   from "@yuneta/gobj-ui/src/c_yui_nav.js";

import {register_c_musica}    from "./c_musica.js";
import {register_c_mus_view}  from "./c_mus_view.js";

import {setup_locale} from "./locales.js";

import "bulma/css/bulma.css";
import "@yuneta/gobj-ui/src/c_yui_shell.css";
import "@yuneta/gobj-ui/src/yui_icons.css";
import "./musica.css";

import app_config from "./app_config.json";


/***************************************************************
 *          main()
 ***************************************************************/
function main()
{
    /*  Register gclasses */
    register_c_yuno();
    register_c_timer();

    register_c_yui_shell();
    register_c_yui_nav();

    register_c_musica();
    register_c_mus_view();

    /*  i18n: Spanish-first, keys are the strings. */
    setup_locale("es");

    /*  Start yuneta (no persistence backend). */
    gobj_start_up(
        null, null, null, null, null, null, null
    );

    let yuno = gobj_create_yuno(
        "musica_yuno",
        "C_YUNO",
        {
            yuno_name:    "yunomúsica",
            yuno_role:    "yunomusica",
            yuno_version: "1.0.0"
        }
    );

    gobj_create_default_service(
        "musica",
        "C_MUSICA",
        {
            config:   app_config,
            use_hash: true
        },
        yuno
    );

    gobj_start(yuno);
    gobj_play(yuno);
}


/***************************************************************
 *          Bootstrap on window load
 ***************************************************************/
window.addEventListener("load", function() {
    main();
});
