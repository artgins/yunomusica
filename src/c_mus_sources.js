/***********************************************************************
 *          c_mus_sources.js
 *
 *      C_MUS_SOURCES — the authorised folders, listed and managed.
 *
 *      This is where the app is honest about what it does with your
 *      disk. It says, in the interface and not just in a README:
 *
 *        - no file is copied and no file is uploaded — only a reference
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
    is_durable, write_failed, is_blocked, diagnose,
    add_dir, add_files, authorize, scan, remove_source,
    source_notice, dismiss_notice, accept_notice,
} from "./sources_store.js";

import {subscribe, tracks_of_source, queue_add, store_state} from "./music_store.js";
import {
    set_covers_online, covers_online_state, subscribe_covers, retry_covers
} from "./covers_online.js";

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
    unsub_covers:  null,
    $content:      null,
    diag_open:     false,   // the diagnostics panel is unfolded
    diag_text:     "",      // its last readout, kept across re-renders
    confirming:    "",      // id of the source awaiting a remove confirmation
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

    /*  A question left hanging when the view was left is not still being
        asked when it is come back to. */
    priv.confirming = "";

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

    /*  The cover hunt reports its own progress, and it runs long enough
        that a line saying how far it has got is worth repainting for. */
    priv.unsub_covers = subscribe_covers(() => render(gobj));

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
    if(priv.unsub_covers) {
        priv.unsub_covers();
        priv.unsub_covers = null;
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
    let $note = build_notice();
    if($note) {
        $c.appendChild($note);
    }
    $c.appendChild(build_explainer());
    $c.appendChild(build_covers_switch(gobj));

    let sources = all_sources();
    if(!sources.length) {
        $c.appendChild(createElement2(
            ["div", {class: "MUS_EMPTY_NOTE", i18n: "no sources yet"},
                t("no sources yet")]));
    } else {
        let $list = createElement2(["div", {class: "MUS_SRCLIST"}, []]);
        for(const s of sources) {
            $list.appendChild(build_source_row(gobj, s));
        }
        $c.appendChild($list);
    }

    $c.appendChild(build_diagnostics(gobj));

    refresh_language($c, t);
}


/***************************************************************
 *  What the browser actually does with file access is invisible
 *  from the outside and differs by engine, platform and whether
 *  the app is installed. This turns "it still asks for the
 *  permission" into a readout that can be acted on — and it is
 *  worth having permanently in an app whose whole promise is
 *  about what happens to your files.
 ***************************************************************/
function build_diagnostics(gobj)
{
    let priv = gobj.priv;

    let $body = createElement2(["pre", {class: "MUS_DIAG_BODY"}, ""]);

    let $wrap = createElement2(
        ["details", {class: "MUS_DIAG"}, [
            ["summary", {class: "MUS_DIAG_SUM", i18n: "diagnostics"}, t("diagnostics")],
            ["div", {class: "MUS_DIAG_ACTIONS"}, [
                ["button", {class: "MUS_QBTN button is-ghost", type: "button", i18n: "copy"},
                    t("copy"), {click: (ev) => copy_diag(ev, $body)}]
            ]],
            $body
        ]]
    );

    /*  Probed only when the panel is OPENED: the readable line touches
        the disk, and this view re-renders on every scan tick. A rebuild
        while it is open shows the last readout instead of probing
        again. */
    $wrap.addEventListener("toggle", function() {
        priv.diag_open = $wrap.open;
        if($wrap.open && !priv.diag_text) {
            fill_diagnostics(gobj, $body);
        }
    });
    if(priv.diag_open) {
        $wrap.open = true;
        $body.textContent = priv.diag_text || "…";
        if(!priv.diag_text) {
            fill_diagnostics(gobj, $body);
        }
    }

    return $wrap;
}

function fill_diagnostics(gobj, $body)
{
    $body.textContent = "…";
    diagnose().then(function(lines) {
        gobj.priv.diag_text = lines
            .map((l) => l.k.padEnd(22) + " " + l.v)
            .join("\n");
        $body.textContent = gobj.priv.diag_text;
    });
}

function copy_diag(ev, $body)
{
    let text = $body.textContent || "";
    /*  Captured NOW: by the time the clipboard promise settles the event
        has been dispatched and currentTarget is null. */
    let $b = ev.currentTarget;
    let done = () => {
        let old = $b.textContent;
        $b.textContent = "✓";
        setTimeout(() => { $b.textContent = old; }, 1200);
    };
    if(navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => {});
        return;
    }
    /*  No clipboard API (or no permission): select it so the user can
        copy it by hand rather than being told nothing happened. */
    let r = document.createRange();
    r.selectNodeContents($body);
    let sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
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


/*  What the last pick ran into, said next to the buttons that made it
 *  happen.
 *
 *  A folder that is already in used to be added again in silence, and
 *  the damage only showed up two screens away, as every track twice.
 *  Refusing it silently would be no better: the user pressed a button
 *  and nothing happened. So the refusal is spoken, in the row of the
 *  action, and it says which folder it collided with.
 *
 *  One case is not a refusal but a question. A folder that CONTAINS
 *  folders already added can be exactly what the user wants — the whole
 *  music folder, after one album was added months ago — and it can only
 *  be taken by dropping those, which drops their play counts and their
 *  hearts with them. That is not a decision to make for somebody. */
function build_notice()
{
    const n = source_notice();
    if(!n) {
        return null;
    }

    let actions = [];
    if(n.pending) {
        actions.push(["button", {class: "MUS_QBTN button is-danger", type: "button",
                                 i18n: "remove it and add this"},
            t("remove it and add this"), {click: () => accept_notice()}]);
        actions.push(["button", {class: "MUS_QBTN button is-ghost", type: "button",
                                 i18n: "cancel"},
            t("cancel"), {click: () => dismiss_notice()}]);
    } else {
        actions.push(["button", {class: "MUS_QBTN button is-ghost", type: "button",
                                 i18n: "understood"},
            t("understood"), {click: () => dismiss_notice()}]);
    }

    return createElement2(
        ["div", {class: "MUS_SRCNOTE is-warn", role: "status"}, [
            ["p", {class: "MUS_SRCNOTE_TEXT"},
                t(n.kind, {name: n.name, other: n.other, skipped: n.skipped})],
            ["div", {class: "MUS_SRCNOTE_ACTIONS"}, actions]
        ]]
    );
}


/*  The one switch that lets something out of the device.
 *
 *  It lives here, beside the paragraph about what is and is not sent,
 *  because this is the single exception to it and that is where the
 *  exception belongs. It ships ON — the owner of the app decided the
 *  sleeves are worth having without being asked for — so the paragraph
 *  above it says what goes out instead of promising nothing does. A
 *  default that quietly makes a written sentence false is the trap this
 *  app already fell into once, over the word "offline".
 *
 *  What goes out is said plainly — artist and album, as text, and
 *  nothing else. No file, no list, no identifier. */
function build_covers_switch(gobj)
{
    const st = covers_online_state();

    let note = t("covers online explained");
    if(st.running) {
        note = t("covers online working", {asking: st.asking});
    } else if(st.on && (st.found || st.missed)) {
        note = t("covers online done", {found: st.found, missed: st.missed});
    }

    /*  The attribute is ADDED or it is absent. Passing `checked:
        undefined` writes the string "undefined" into the attribute, and
        an attribute that is present at all means checked — which showed
        the switch on while the feature was off. */
    const attrs = {class: "MUS_COVOPT_CHECK", type: "checkbox"};
    if(st.on) {
        attrs.checked = "checked";
    }

    let children = [
        ["label", {class: "MUS_COVOPT_ROW"}, [
            ["input", attrs, null,
                {change: (ev) => set_covers_online(!!ev.target.checked)}],
            ["span", {class: "MUS_COVOPT_TITLE", i18n: "look for covers online"},
                t("look for covers online")]
        ]],
        ["p", {class: "MUS_DIM MUS_COVOPT_NOTE"}, note]
    ];

    /*  A blank is remembered for a month so a library of bootlegs does
        not re-ask the internet at every launch. That is right until the
        day the archive gains the sleeve, or the day MusicBrainz was
        simply down when we asked — so the memory has to be arguable
        with, from the same place that reports it. */
    if(st.on && st.missed) {
        children.push(
            ["button", {class: "MUS_QBTN MUS_COVOPT_RETRY button is-ghost",
                        type: "button", i18n: "retry the ones that failed"},
                t("retry the ones that failed"),
                {click: () => retry_covers(true)}]);
    }

    return createElement2(["section", {class: "MUS_COVOPT"}, children]);
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
    } else {
        /*  A folder handle survives a restart; its permission does not,
            unless the user picks the persistent option — which the
            browser only OFFERS to an installed app. Say which button to
            press, because the wrong one silently means "ask me again
            every launch". */
        children.push(["p", {class: "MUS_DIM", i18n: "allow on every visit"},
            t("allow on every visit")]);
    }

    /*  Say out loud whether what we store is actually safe. Losing your
        folders on restart with no explanation is the worst outcome
        here, and the browser tells us in advance which of the two
        situations we are in. */
    if(is_blocked()) {
        /*  Not the browser's doing: another tab of this app is holding
            the database at an older schema, so the upgrade cannot start.
            Saying "this browser stores nothing" here sent people into
            their privacy settings looking for a switch that was never
            the problem. */
        children.push(["p", {class: "is-warn", i18n: "another tab is holding it"},
            t("another tab is holding it")]);
    } else if(!is_persistent() || write_failed()) {
        children.push(["p", {class: "is-warn", i18n: "could not be saved"},
            t("could not be saved")]);
    } else if(is_durable() === false) {
        children.push(["p", {class: "is-warn", i18n: "storage may be cleared"},
            t("storage may be cleared")]);
    }

    return createElement2(["div", {class: "MUS_EXPLAIN"}, children]);
}


function build_source_row(gobj, s)
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
    } else if(s.queued) {
        /*  Waiting behind another folder. Without this the row sits at
            "0 tracks" with nothing to explain it, which reads as an
            empty folder — the same silence the progress bar exists to
            break, one level up. */
        $state = ["div", {class: "MUS_SRCSTATE MUS_DIM", i18n: "waiting its turn"},
            t("waiting its turn")];
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
                {click: () => scan(s.id, true)}]);
        }
        actions.push(["button", {class: "MUS_QBTN button", type: "button",
                                 ...disabled_if(!s.count)},
            [ico(P.plus, 15), ["span", {i18n: "add to queue"}, t("add to queue")]],
            {click: () => queue_add(tracks_of_source(s.id), "append")}]);
    }
    /*  ASK BEFORE REMOVING.
     *
     *  Removing a source drops its tracks, its tags and its play counts,
     *  and re-authorising a folder is a browser dialog away — too much to
     *  hang on one mistaken tap next to "add to queue". The question is
     *  asked in the row itself, the same as the saved lists do it: no
     *  modal to dismiss, and the answer is where the finger already is. */
    if(gobj.priv.confirming === s.id) {
        actions.push(["button", {class: "MUS_QBTN button is-danger", type: "button",
                                 i18n: "remove this source?"}, t("remove this source?"),
            {click: async () => {
                gobj.priv.confirming = "";
                await remove_source(s.id);
            }}]);
        actions.push(["button", {class: "MUS_QBTN button is-ghost", type: "button",
                                 i18n: "cancel"}, t("cancel"),
            {click: () => { gobj.priv.confirming = ""; render(gobj); }}]);
    } else {
        actions.push(["button", {
                class: "MUS_QBTN button is-ghost",
                type: "button",
                "aria-label": t("remove this source"),
                "data-i18n-aria-label": "remove this source",
                title: t("remove this source"),
                "data-i18n-title": "remove this source"
            }, [ico(P.trash, 15), ["span", {i18n: "remove"}, t("remove")]],
            {click: () => { gobj.priv.confirming = s.id; render(gobj); }}]);
    }

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
