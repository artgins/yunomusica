/***********************************************************************
 *          about_dialog.js
 *
 *      The welcome / help / credits dialog.
 *
 *      This is where the pitch lives. It used to be the first screen of
 *      the app, which put an advertisement between the user and their
 *      music every single time. Now it shows once, carries a "do not
 *      show this again" checkbox, and stays reachable for good from the
 *      toolbar — so it can be read when it is wanted and never again
 *      when it is not.
 *
 *      It registers itself as a shell overlay, which buys the browser
 *      Back button and the Escape key for free.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {createElement2, refresh_language} from "@yuneta/gobj-js";

import {
    yui_shell_register_overlay,
    yui_shell_overlay_dismissed,
} from "@yuneta/gobj-ui/src/c_yui_shell.js";

import {pref_get, pref_set} from "./idb.js";

import {t} from "i18next";


const PREF_SEEN = "welcome_dismissed";

let $dialog = null;         // the open dialog, if any
let overlay = null;         // its shell overlay handle
let on_closed = null;       // what the caller wants doing afterwards


/***************************************************************
 *  Has the user asked never to see this again?
 ***************************************************************/
function welcome_dismissed()
{
    return pref_get(PREF_SEEN, false);
}


/***************************************************************
 *  Open. `first_run` shows the "do not show this again" line;
 *  opened from the toolbar it would be a strange thing to offer,
 *  since the user just asked for it on purpose.
 *
 *  `on_close` is run once the dialog is gone, whichever way it
 *  went. Two dialogs must never be stacked on a first run, and
 *  this is how the second one waits its turn.
 ***************************************************************/
function open_about(shell_gobj, first_run, on_close)
{
    if($dialog) {
        return;
    }
    on_closed = on_close || null;

    let $card = createElement2(
        ["div", {class: "MUS_ABOUT_CARD", role: "dialog", "aria-modal": "true"}, [
            ["header", {class: "MUS_ABOUT_HEAD"}, [
                ["img", {class: "MUS_ABOUT_MARK", src: "./yunomusica-mark.svg", alt: ""}],
                ["h2", {class: "MUS_ABOUT_TITLE", i18n: "your music your way"},
                    t("your music your way")]
            ]],
            ["p", {class: "MUS_ABOUT_LEAD", i18n: "about lead"}, t("about lead")],

            ["h3", {class: "MUS_ABOUT_H3", i18n: "how it works"}, t("how it works")],
            ["ul", {class: "MUS_ABOUT_LIST"}, [
                ["li", {i18n: "help pick"},    t("help pick")],
                ["li", {i18n: "help queue"},   t("help queue")],
                ["li", {i18n: "help lists"},   t("help lists")],
                ["li", {i18n: "help privacy"}, t("help privacy")]
            ]],

            build_footer(first_run)
        ]]
    );

    let $backdrop = createElement2(
        ["div", {class: "MUS_ABOUT_BACKDROP"}, [$card], {
            click: (ev) => {
                if(ev.target === ev.currentTarget) {
                    close_about(shell_gobj);
                }
            }
        }]
    );

    document.body.appendChild($backdrop);
    $dialog = $backdrop;

    /*  Back button and Escape, courtesy of the shell. */
    overlay = yui_shell_register_overlay(shell_gobj, () => close_about(shell_gobj, true));

    refresh_language($backdrop, t);

    let $close = $backdrop.querySelector(".MUS_ABOUT_CLOSE");
    if($close) {
        $close.focus();
    }
}


function build_footer(first_run)
{
    let children = [];

    if(first_run) {
        children.push(
            ["label", {class: "MUS_ABOUT_CHECK"}, [
                ["input", {class: "MUS_ABOUT_DONTSHOW", type: "checkbox"}],
                ["span", {i18n: "do not show this again"}, t("do not show this again")]
            ]]);
    }

    children.push(
        ["div", {class: "MUS_ABOUT_CREDITS"}, [
            ["a", {
                class: "MUS_ABOUT_BRAND",
                href: "https://artgins.com",
                target: "_blank",
                rel: "noopener noreferrer",
                i18n: "made by artgins"
            }, t("made by artgins")],
            /*  Both credits are links: who made it, and what it is made
                with. The framework earns a way to its own landing page,
                not just a mention in passing. */
            ["a", {
                class: "MUS_ABOUT_BRAND MUS_ABOUT_YUNETA",
                href: "https://yuneta.io",
                target: "_blank",
                rel: "noopener noreferrer",
                i18n: "made with yuneta"
            }, t("made with yuneta")],
            ["span", {class: "MUS_ABOUT_TAGLINE", i18n: "about tagline"},
                t("about tagline")],
            /*  Not translated on purpose: a copyright line and a licence
                identifier are the same in every language, and turning
                them into ten strings is ten chances to get a legal
                notice wrong. */
            ["span", {class: "MUS_ABOUT_COPY"}, "© 2026 ArtGins · MIT"],
            /*  Which build is this? Baked in at compile time, so it
                cannot drift from what is actually running. */
            ["span", {class: "MUS_ABOUT_VERSION"},
                "v" + __APP_VERSION__ + " · " + __BUILD_STAMP__]
        ]]);

    return ["footer", {class: "MUS_ABOUT_FOOT"}, [
        ["div", {class: "MUS_ABOUT_FOOTL"}, children],
        ["button", {class: "MUS_ABOUT_CLOSE button is-primary", type: "button",
                    i18n: "close"},
            t("close"), {click: (ev) => close_from_button(ev)}]
    ]];
}

/*  The close button has no reference to the shell; it is resolved from
    the dialog element the button lives in. */
let close_shell = null;

function close_from_button()
{
    close_about(close_shell);
}


function close_about(shell_gobj, from_history)
{
    if(!$dialog) {
        return;
    }

    /*  Honour the checkbox on the way out, whichever way the dialog was
        closed — including the Back button. */
    let $check = $dialog.querySelector(".MUS_ABOUT_DONTSHOW");
    if($check && $check.checked) {
        pref_set(PREF_SEEN, true);
    }

    if($dialog.parentNode) {
        $dialog.parentNode.removeChild($dialog);
    }
    $dialog = null;

    if(overlay && !from_history) {
        yui_shell_overlay_dismissed(shell_gobj, overlay);
    }
    overlay = null;

    let after = on_closed;
    on_closed = null;
    if(after) {
        after();
    }
}


/*  The host hands us the shell once, at start up, so the close button
    and the backdrop do not each have to carry it. */
function about_bind_shell(shell_gobj)
{
    close_shell = shell_gobj;
}


export {open_about, close_about, welcome_dismissed, about_bind_shell};
