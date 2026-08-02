/***********************************************************************
 *          c_mus_lists.js
 *
 *      C_MUS_LISTS — the lists the user saved from the deck.
 *
 *      A saved list is a set of references, so how much of it can be
 *      played depends on which sources are authorised right now. That is
 *      reported per list ("3 missing") instead of quietly playing a
 *      shorter list than the one the user saved.
 *
 *          Copyright (c) 2026, ArtGins.
 *          All Rights Reserved.
 ***********************************************************************/
import {
    SDATA, SDATA_END, data_type_t,
    gclass_create, log_error,
    gobj_parent,
    gobj_read_attr, gobj_read_pointer_attr, gobj_write_attr,
    gobj_subscribe_event,
    createElement2, refresh_language,
} from "@yuneta/gobj-js";

import {yui_shell_of, yui_shell_navigate} from "@yuneta/gobj-ui/src/c_yui_shell.js";

import {
    subscribe_playlists, all_playlists, resolve, remove_playlist,
} from "./playlists_store.js";

import {subscribe, queue_add} from "./music_store.js";

import {t} from "i18next";


/***************************************************************
 *              Constants
 ***************************************************************/
const GCLASS_NAME = "C_MUS_LISTS";

const svg = (path, size) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;

const P = {
    play:  "M8 5v14l11-7z",
    plus:  "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
    trash: "M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 12H7z",
};

function ico(path, size)
{
    return ["span", {class: "MUS_ICO"}, svg(path, size)];
}

/*  `disabled: undefined` becomes the literal attribute disabled="undefined",
    which disables the button. The key must be absent — see c_mus_deck.js. */
function disabled_if(cond)
{
    return cond ? {disabled: "disabled"} : {};
}


/***************************************************************
 *              Attrs
 ***************************************************************/
const attrs_table = [
SDATA(data_type_t.DTP_POINTER,  "subscriber",  0,  null,  "Subscriber of output events"),
SDATA(data_type_t.DTP_STRING,   "title",       0,  "",    "Human title of the view"),
SDATA(data_type_t.DTP_POINTER,  "$container",  0,  null,  "Root HTMLElement (shell contract)"),
SDATA_END()
];

let PRIVATE_DATA = {
    unsub_lists: null,
    unsub_music: null,
    $content:    null,
    confirming:  "",        // id of the list awaiting a delete confirmation
};

let __gclass__ = null;




                    /******************************
                     *      Framework Methods
                     ******************************/




function mt_create(gobj)
{
    let subscriber = gobj_read_pointer_attr(gobj, "subscriber");
    if(!subscriber) {
        subscriber = gobj_parent(gobj);
    }
    gobj_subscribe_event(gobj, null, {}, subscriber);

    let $content = createElement2(["div", {class: "MUS_CONTENT"}, []]);
    gobj.priv.$content = $content;
    gobj_write_attr(gobj, "$container",
        createElement2(["div", {class: "C_MUS_LISTS MUS_VIEW"}, [$content]]));
}

function mt_start(gobj)
{
    let priv = gobj.priv;

    priv.unsub_lists = subscribe_playlists(() => render(gobj));
    /*  How many entries resolve depends on the library, so a source
        coming or going changes what this view has to say. */
    priv.unsub_music = subscribe(function(channel) {
        if(channel === "library") {
            render(gobj);
        }
    });

    let shell = yui_shell_of(gobj);
    if(shell) {
        gobj_subscribe_event(shell, "EV_LANGUAGE_CHANGED", {}, gobj);
    }

    render(gobj);
}

function mt_stop(gobj)
{
    let priv = gobj.priv;
    if(priv.unsub_lists) {
        priv.unsub_lists();
        priv.unsub_lists = null;
    }
    if(priv.unsub_music) {
        priv.unsub_music();
        priv.unsub_music = null;
    }
}

function mt_destroy(gobj)
{
    let $c = gobj_read_attr(gobj, "$container");
    if($c && $c.parentNode) {
        $c.parentNode.removeChild($c);
    }
    gobj_write_attr(gobj, "$container", null);
}




                    /***************************
                     *      Render
                     ***************************/




function clear($node)
{
    while($node.firstChild) {
        $node.removeChild($node.firstChild);
    }
}

function render(gobj)
{
    let priv = gobj.priv;
    let $c = priv.$content;
    if(!$c) {
        return;
    }
    clear($c);

    $c.appendChild(createElement2(
        ["header", {class: "MUS_SECHEAD"}, [
            ["h2", {class: "MUS_SECTITLE", i18n: "saved lists"}, t("saved lists")]
        ]]));

    let lists = all_playlists();
    if(!lists.length) {
        $c.appendChild(createElement2(
            ["div", {class: "MUS_EMPTY_NOTE"}, [
                ["p", {i18n: "no saved lists yet"}, t("no saved lists yet")],
                ["p", {class: "MUS_DIM", i18n: "how to save a list"},
                    t("how to save a list")]
            ]]));
        refresh_language($c, t);
        return;
    }

    let $list = createElement2(["div", {class: "MUS_SRCLIST"}, []]);
    for(const p of lists) {
        $list.appendChild(build_list_row(gobj, p));
    }
    $c.appendChild($list);

    refresh_language($c, t);
}


function build_list_row(gobj, p)
{
    let r = resolve(p.id);
    let playable = r.tracks.length > 0;

    let sub = [
        ["span", {}, String(p.count)],
        ["span", {i18n: "entries"}, t("entries")]
    ];
    if(r.missing) {
        sub.push(["span", {class: "MUS_SEP"}, "·"]);
        sub.push(["span", {class: "is-warn"}, String(r.missing)]);
        sub.push(["span", {class: "is-warn", i18n: "missing"}, t("missing")]);
    }

    let actions = [
        ["button", {class: "MUS_QBTN button is-primary", type: "button",
                    ...disabled_if(!playable)},
            [ico(P.play, 15), ["span", {i18n: "play"}, t("play")]],
            {click: () => {
                queue_add(r.tracks, "replace");
                let shell = yui_shell_of(gobj);
                if(shell) {
                    yui_shell_navigate(shell, "/player");
                }
            }}],
        ["button", {class: "MUS_QBTN button", type: "button",
                    ...disabled_if(!playable)},
            [ico(P.plus, 15), ["span", {i18n: "add to queue"}, t("add to queue")]],
            {click: () => queue_add(r.tracks, "append")}]
    ];

    if(gobj.priv.confirming === p.id) {
        actions.push(["button", {class: "MUS_QBTN button is-danger", type: "button",
                                 i18n: "delete this list"}, t("delete this list"),
            {click: async () => {
                gobj.priv.confirming = "";
                await remove_playlist(p.id);
            }}]);
        actions.push(["button", {class: "MUS_QBTN button is-ghost", type: "button",
                                 i18n: "cancel"}, t("cancel"),
            {click: () => { gobj.priv.confirming = ""; render(gobj); }}]);
    } else {
        actions.push(["button", {class: "MUS_QBTN button is-ghost", type: "button"},
            [ico(P.trash, 15), ["span", {i18n: "delete"}, t("delete")]],
            {click: () => { gobj.priv.confirming = p.id; render(gobj); }}]);
    }

    return createElement2(
        ["article", {class: "MUS_SRCROW"}, [
            ["div", {class: "MUS_SRCMETA"}, [
                ["div", {class: "MUS_T1"}, p.name],
                ["div", {class: "MUS_T2"}, sub]
            ]],
            ["div", {class: "MUS_SRCACTIONS"}, actions]
        ]]
    );
}




                    /***************************
                     *      Actions
                     ***************************/




function ac_language_changed(gobj, event, kw, src)
{
    render(gobj);
    return 0;
}




/***************************************************************
 *              FSM
 ***************************************************************/
const gmt = {
    mt_create:  mt_create,
    mt_start:   mt_start,
    mt_stop:    mt_stop,
    mt_destroy: mt_destroy
};

function create_gclass(gclass_name)
{
    if(__gclass__) {
        log_error(`GClass ALREADY created: ${gclass_name}`);
        return -1;
    }

    const states = [
        ["ST_IDLE", [
            ["EV_LANGUAGE_CHANGED", ac_language_changed, null]
        ]]
    ];
    const event_types = [
        ["EV_LANGUAGE_CHANGED", 0]
    ];

    __gclass__ = gclass_create(
        gclass_name,
        event_types,
        states,
        gmt,
        0,
        attrs_table,
        PRIVATE_DATA,
        0,
        0,
        0,
        0
    );
    if(!__gclass__) {
        return -1;
    }
    return 0;
}

function register_c_mus_lists()
{
    return create_gclass(GCLASS_NAME);
}

export {register_c_mus_lists};
