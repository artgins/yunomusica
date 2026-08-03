/***********************************************************************
 *          confirm_replace.js
 *
 *      "Play all" throws away the queue. Ask first.
 *
 *      A yes/no would be the lazy version of this question. When someone
 *      presses Play on an album while a queue is running, the thing they
 *      usually meant — and the thing a plain confirmation cannot offer —
 *      is to ADD it. So the dialog has three answers, and the destructive
 *      one is not the default focus.
 *
 *      Nothing is asked when the deck is empty: there is nothing to lose
 *      and a dialog would be pure ceremony.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {createElement2, refresh_language} from "@yuneta/gobj-js";

import {
    yui_shell_register_overlay,
    yui_shell_overlay_dismissed,
} from "@yuneta/gobj-ui/src/c_yui_shell.js";

import {queue_length, queue_origin} from "./music_store.js";

import {t} from "i18next";


let $open = null;       // the dialog, while it is up


/***************************************************************
 *  Resolves to "replace", "append" or null (cancelled).
 *
 *  With an empty deck it resolves to "replace" without asking.
 ***************************************************************/
function confirm_replace(shell_gobj)
{
    let have = queue_length();
    if(!have) {
        return Promise.resolve("replace");
    }
    if($open) {
        return Promise.resolve(null);       // one at a time
    }

    return new Promise(function(resolve) {
        let overlay = null;

        const done = function(answer, from_history) {
            if(!$open) {
                return;
            }
            if($open.parentNode) {
                $open.parentNode.removeChild($open);
            }
            $open = null;
            if(overlay && !from_history) {
                yui_shell_overlay_dismissed(shell_gobj, overlay);
            }
            resolve(answer);
        };

        let origin = queue_origin();

        let $card = createElement2(
            ["div", {class: "MUS_CONFIRM_CARD", role: "dialog", "aria-modal": "true"}, [
                ["h2", {class: "MUS_CONFIRM_TITLE", i18n: "replace the queue"},
                    t("replace the queue")],
                /*  What is at stake, in the terms the deck uses: how many
                    tracks, and whether they are a saved list. */
                ["p", {class: "MUS_CONFIRM_WHAT"}, [
                    ["span", {class: "MUS_CONFIRM_N"}, String(have)],
                    ["span", {i18n: "tracks"}, t("tracks")],
                    ["span", {i18n: "on the deck"}, t("on the deck")],
                    origin
                        ? ["span", {class: "MUS_CONFIRM_LIST"}, "— " + origin.name]
                        : ["span", {}]
                ]],
                ["p", {class: "MUS_CONFIRM_BODY", i18n: "replace warning"},
                    t("replace warning")],
                ["div", {class: "MUS_CONFIRM_ACTIONS"}, [
                    ["button", {class: "MUS_QBTN button", type: "button",
                                i18n: "add to queue"},
                        t("add to queue"), {click: () => done("append")}],
                    ["button", {class: "MUS_QBTN button is-danger", type: "button",
                                i18n: "replace and play"},
                        t("replace and play"), {click: () => done("replace")}],
                    ["button", {class: "MUS_QBTN button is-ghost MUS_CONFIRM_CANCEL",
                                type: "button", i18n: "cancel"},
                        t("cancel"), {click: () => done(null)}]
                ]]
            ]]
        );

        let $backdrop = createElement2(
            ["div", {class: "MUS_ABOUT_BACKDROP"}, [$card], {
                click: (ev) => {
                    if(ev.target === ev.currentTarget) {
                        done(null);
                    }
                }
            }]
        );

        document.body.appendChild($backdrop);
        $open = $backdrop;

        overlay = yui_shell_register_overlay(shell_gobj, () => done(null, true));
        refresh_language($backdrop, t);

        /*  Cancel takes the focus, not the destructive button. */
        let $cancel = $backdrop.querySelector(".MUS_CONFIRM_CANCEL");
        if($cancel) {
            $cancel.focus();
        }
    });
}


export {confirm_replace};
