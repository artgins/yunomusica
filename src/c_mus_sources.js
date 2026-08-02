/***********************************************************************
 *          c_mus_sources.js
 *
 *      C_MUS_SOURCES — the authorised folders, listed and managed.
 *
 *      This is where the app is honest about what it does with your
 *      disk. It says, in the interface and not just in a README:
 *
 *        - nothing is copied and nothing is uploaded — only a reference
 *          to what is already on your disk is kept;
 *        - a folder is taken WHOLE, that folder and every folder below;
 *        - what this particular browser can and cannot remember.
 *
 *      A folder that the browser wants re-confirmed after a reload is
 *      shown with an Authorise button rather than being read silently:
 *      re-granting a permission has to be a deliberate click, and the
 *      browser demands the gesture anyway.
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

import {yui_shell_of} from "@yuneta/gobj-ui/src/c_yui_shell.js";

import {
    subscribe_sources, all_sources, fsa_supported, is_persistent,
    is_durable, write_failed,
    add_dir, add_files, authorize, scan, remove_source,
} from "./sources_store.js";

import {subscribe, tracks_of_source, queue_add, store_state} from "./music_store.js";

import {t} from "i18next";


/***************************************************************
 *              Constants
 ***************************************************************/
const GCLASS_NAME = "C_MUS_SOURCES";

const svg = (path, size) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;

const P = {
    folder:  "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z",
    file:    "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 7V3.5L18.5 9z",
    plus:    "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
    refresh: "M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z",
    trash:   "M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 12H7z",
    lock:    "M12 2a5 5 0 0 0-5 5v3H5v12h14V10h-2V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3z",
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
    unsub_sources: null,
    unsub_music:   null,
    $content:      null,
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
        createElement2(["div", {class: "C_MUS_SOURCES MUS_VIEW"}, [$content]]));
}

function mt_start(gobj)
{
    let priv = gobj.priv;

    priv.unsub_sources = subscribe_sources(() => render(gobj));
    /*  A scan feeds the library, and the per-source track count comes
        from there, so repaint on the library channel too — and on
        "loading", which is what carries how far a scan has got. The
        store emits that on a 120 ms clock, so this is cheap. */
    priv.unsub_music = subscribe(function(channel) {
        if(channel === "library" || channel === "loading") {
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
    if(priv.unsub_sources) {
        priv.unsub_sources();
        priv.unsub_sources = null;
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

    $c.appendChild(build_header());
    $c.appendChild(build_explainer());

    let sources = all_sources();
    if(!sources.length) {
        $c.appendChild(createElement2(
            ["div", {class: "MUS_EMPTY_NOTE", i18n: "no sources yet"},
                t("no sources yet")]));
    } else {
        let $list = createElement2(["div", {class: "MUS_SRCLIST"}, []]);
        for(const s of sources) {
            $list.appendChild(build_source_row(s));
        }
        $c.appendChild($list);
    }

    refresh_language($c, t);
}


function build_header()
{
    return createElement2(
        ["header", {class: "MUS_SECHEAD"}, [
            ["h2", {class: "MUS_SECTITLE", i18n: "authorised sources"},
                t("authorised sources")],
            ["div", {class: "MUS_QACTIONS"}, [
                ["button", {class: "MUS_QBTN button is-primary", type: "button"},
                    [ico(P.folder, 16), ["span", {i18n: "add a folder"}, t("add a folder")]],
                    {click: () => add_dir()}],
                ["button", {class: "MUS_QBTN button", type: "button"},
                    [ico(P.file, 16), ["span", {i18n: "add loose files"}, t("add loose files")]],
                    {click: () => add_files()}]
            ]]
        ]]
    );
}


/*  What this browser will and will not remember, said before the user
    invests any effort in it.

    Without the File System Access API the only way to ask for a folder
    is a <input webkitdirectory>, and Firefox guards those with "Are you
    sure you want to upload all files from X?". "Upload" is the browser's
    generic word for handing files to a page, but on a page that reads
    music it reads as an accusation — so say what that dialog means
    BEFORE the user meets it, not after. */
function build_explainer()
{
    let persists = fsa_supported() && is_persistent();
    let key = persists ? "sources persist" : "sources do not persist";

    let children = [
        ["p", {i18n: "nothing is copied"}, t("nothing is copied")],
        ["p", {i18n: "folders are recursive"}, t("folders are recursive")],
        ["p", {class: "MUS_DIM", i18n: key}, t(key)]
    ];
    if(!fsa_supported()) {
        children.push(["p", {class: "MUS_DIM", i18n: "upload warning explained"},
            t("upload warning explained")]);
    }

    /*  Say out loud whether what we store is actually safe. Losing your
        folders on restart with no explanation is the worst outcome
        here, and the browser tells us in advance which of the two
        situations we are in. */
    if(!is_persistent() || write_failed()) {
        children.push(["p", {class: "is-warn", i18n: "could not be saved"},
            t("could not be saved")]);
    } else if(is_durable() === false) {
        children.push(["p", {class: "is-warn", i18n: "storage may be cleared"},
            t("storage may be cleared")]);
    }

    return createElement2(["div", {class: "MUS_EXPLAIN"}, children]);
}


function build_source_row(s)
{
    let needs_auth = (s.permission !== "granted");
    let kind_key = (s.kind === "dir") ? "folder" : "files";

    let $meta = ["div", {class: "MUS_SRCMETA"}, [
        ["div", {class: "MUS_T1"}, s.name],
        ["div", {class: "MUS_T2"}, [
            ["span", {i18n: kind_key}, t(kind_key)],
            ["span", {class: "MUS_SEP"}, "·"],
            ["span", {}, String(s.count)],
            ["span", {i18n: "tracks"}, t("tracks")]
        ]]
    ]];

    let $state = null;
    if(s.scanning) {
        /*  Say how far it has got. A big folder takes a while, and
            "reading…" next to "0 tracks" is indistinguishable from
            being stuck — which is exactly what it looked like. */
        let total = store_state.total || 0;
        let pct = total ? Math.round((store_state.loaded / total) * 100) : 0;
        let line = [
            ["span", {class: "MUS_SPINNER", "aria-hidden": "true"}],
            ["span", {i18n: "reading"}, t("reading")]
        ];
        if(total) {
            line.push(["span", {}, String(store_state.loaded)]);
            line.push(["span", {class: "MUS_SEP"}, "/"]);
            line.push(["span", {}, String(total)]);
        }
        $state = ["div", {class: "MUS_SRCSTATE MUS_SRCPROGRESS", role: "status"}, [
            ["div", {class: "MUS_SRCPROGRESS_LINE"}, line],
            ["div", {class: "MUS_BAR"}, [
                ["i", {
                    class: "MUS_BAR_FILL" + (total ? "" : " is-indeterminate"),
                    style: total ? `width:${pct}%` : ""
                }]
            ]]
        ]];
    } else if(needs_auth) {
        let k = (s.permission === "denied") ? "permission denied" : "waiting for permission";
        $state = ["div", {class: "MUS_SRCSTATE is-warn", i18n: k}, t(k)];
    } else if(s.error) {
        $state = ["div", {class: "MUS_SRCSTATE is-warn", i18n: s.error}, t(s.error)];
    } else if(s.kind === "files") {
        $state = ["div", {class: "MUS_SRCSTATE MUS_DIM", i18n: "snapshot warning"},
            t("snapshot warning")];
    }

    let actions = [];
    if(needs_auth) {
        actions.push(["button", {class: "MUS_QBTN button is-primary", type: "button"},
            [ico(P.lock, 15), ["span", {i18n: "authorise"}, t("authorise")]],
            {click: () => authorize(s.id)}]);
    } else {
        if(s.rescannable) {
            actions.push(["button", {class: "MUS_QBTN button", type: "button"},
                [ico(P.refresh, 15), ["span", {i18n: "rescan"}, t("rescan")]],
                {click: () => scan(s.id)}]);
        }
        actions.push(["button", {class: "MUS_QBTN button", type: "button",
                                 ...disabled_if(!s.count)},
            [ico(P.plus, 15), ["span", {i18n: "add to queue"}, t("add to queue")]],
            {click: () => queue_add(tracks_of_source(s.id), "append")}]);
    }
    actions.push(["button", {
            class: "MUS_QBTN button is-ghost",
            type: "button",
            "aria-label": t("remove this source"),
            "data-i18n-aria-label": "remove this source",
            title: t("remove this source"),
            "data-i18n-title": "remove this source"
        }, [ico(P.trash, 15), ["span", {i18n: "remove"}, t("remove")]],
        {click: () => remove_source(s.id)}]);

    let children = [$meta];
    if($state) {
        children.push($state);
    }
    children.push(["div", {class: "MUS_SRCACTIONS"}, actions]);

    return createElement2(["article", {class: "MUS_SRCROW"}, children]);
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

function register_c_mus_sources()
{
    return create_gclass(GCLASS_NAME);
}

export {register_c_mus_sources};
