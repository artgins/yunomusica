/***********************************************************************
 *          c_mus_deck.js
 *
 *      C_MUS_DECK — the home screen, and the first thing the app shows.
 *
 *      Two things, in this order, because this is what a music app is
 *      for:
 *
 *        1. The transport. Play/pause, previous, next, shuffle, repeat,
 *           the title of what is sounding, the cover, and a seek bar.
 *        2. The queue, right below it — the deck proper. It is what the
 *           user loaded, in the order they want it: rows can be played,
 *           moved up and down, and taken out while the music keeps going.
 *           Folders and loose tracks are loaded straight from here.
 *
 *      The queue is never reordered behind the user's back. Shuffle
 *      changes which track is picked NEXT (see music_store.step), it does
 *      not scramble what is on screen.
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
    subscribe,
    store_state, clear_notice,
    cover_url,
    queue_tracks, queue_index, queue_remove_at, queue_move, queue_clear,
    queue_play_at, queue_add, tracks_of_source, queue_origin,
    preview_track, stop_preview, previewing,
    current_track, is_playing, toggle, step, prev,
    seek_fraction, set_shuffle, get_shuffle, set_repeat, get_repeat,
    progress, fmt_time,
} from "./music_store.js";

import {
    add_dir, add_files,
    subscribe_sources, pending_authorisation, authorize_all,
} from "./sources_store.js";
import {save_queue_as} from "./playlists_store.js";
import {subscribe_update, is_stale, latest_version} from "./update_check.js";
import {open_about} from "./about_dialog.js";

import {t} from "i18next";


/***************************************************************
 *              Constants
 ***************************************************************/
const GCLASS_NAME = "C_MUS_DECK";

const svg = (path, size) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;

const P = {
    prev:    "M6 6h2v12H6zm12 0v12l-9-6z",
    next:    "M16 6h2v12h-2zM6 6l9 6-9 6z",
    play:    "M8 5v14l11-7z",
    pause:   "M6 5h4v14H6zm8 0h4v14h-4z",
    shuffle: "M17 3v3h-2.2l-2.4 3.2 1.3 1.7L16 8h1v3l4-4-4-4zM3 6h4.4l1.9 2.5 1.3-1.7L8.4 4H3v2zm14 9h-1l-2.6-3.4-1.3 1.7 2.4 3.2H17v3l4-4-4-4v3.5zM3 18h5.4l7-9.3-1.3-1.7L7.4 16H3v2z",
    repeat:  "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
    up:      "M12 8l6 6H6z",
    down:    "M12 16l-6-6h12z",
    cross:   "M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4L10.6 10.6l6.3-6.3z",
    folder:  "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z",
    file:    "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 7V3.5L18.5 9z",
    save:    "M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm3-10H5V5h10z",
    trash:   "M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 12H7z",
};

/*  createElement2 treats a leading string as a tag name, so an inline
    SVG has to ride inside its own element whose string content it
    parses. */
function ico(path, size)
{
    return ["span", {class: "MUS_ICO"}, svg(path, size)];
}

/*  `disabled: undefined` is NOT "no attribute": createElement2 writes it
    out as the string "undefined", and a `disabled` attribute with any
    value at all disables the button for good. The key has to be absent,
    so spread this instead of setting it. */
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
    unsub:      null,
    unsub_src:  null,   // sources channel, for the authorisation banner
    unsub_upd:  null,   // a newer build was deployed
    $now:       null,   // the transport card
    $queue:     null,   // the queue box
    naming:     false,  // the "save as list" row is open
    drag_from:  -1,
};

let __gclass__ = null;




                    /******************************
                     *      Framework Methods
                     ******************************/




/***************************************************************
 *          Framework Method: Create
 ***************************************************************/
function mt_create(gobj)
{
    let subscriber = gobj_read_pointer_attr(gobj, "subscriber");
    if(!subscriber) {
        subscriber = gobj_parent(gobj);
    }
    gobj_subscribe_event(gobj, null, {}, subscriber);

    build_ui(gobj);
}

/***************************************************************
 *          Framework Method: Start
 ***************************************************************/
function mt_start(gobj)
{
    let priv = gobj.priv;

    priv.unsub = subscribe(function(channel) {
        if(channel === "queue" || channel === "library") {
            paint_queue(gobj);
            paint_now(gobj);
        } else if(channel === "playing") {
            paint_now(gobj);
            paint_queue_highlight(gobj);
        } else if(channel === "time") {
            paint_time(gobj);
        }
    });

    /*  The authorisation banner lives on this screen, so it has to
        follow the sources too. */
    priv.unsub_src = subscribe_sources(() => paint_now(gobj));
    priv.unsub_upd = subscribe_update(() => paint_now(gobj));

    /*  A language switch re-renders everything this view composed with
        t() at build time — see the gobj-ui i18n contract. */
    let shell = yui_shell_of(gobj);
    if(shell) {
        gobj_subscribe_event(shell, "EV_LANGUAGE_CHANGED", {}, gobj);
    }

    paint_now(gobj);
    paint_queue(gobj);
}

/***************************************************************
 *          Framework Method: Stop
 ***************************************************************/
function mt_stop(gobj)
{
    let priv = gobj.priv;
    if(priv.unsub) {
        priv.unsub();
        priv.unsub = null;
    }
    if(priv.unsub_src) {
        priv.unsub_src();
        priv.unsub_src = null;
    }
    if(priv.unsub_upd) {
        priv.unsub_upd();
        priv.unsub_upd = null;
    }
}

/***************************************************************
 *          Framework Method: Destroy
 ***************************************************************/
function mt_destroy(gobj)
{
    let $c = gobj_read_attr(gobj, "$container");
    if($c && $c.parentNode) {
        $c.parentNode.removeChild($c);
    }
    gobj_write_attr(gobj, "$container", null);
}




                    /***************************
                     *      DOM scaffolding
                     ***************************/




function build_ui(gobj)
{
    let priv = gobj.priv;

    let $now   = createElement2(["div", {class: "MUS_NOWCARD"}, []]);
    let $queue = createElement2(["section", {class: "MUS_QUEUEBOX"}, []]);
    priv.$now = $now;
    priv.$queue = $queue;

    /*  The credit sits on the home screen, where it is actually seen,
        not only inside a dialog nobody opens twice. */
    let $credits = createElement2(
        ["footer", {class: "MUS_CREDITS"}, [
            ["a", {
                class: "MUS_CREDITS_BRAND",
                href: "https://artgins.com",
                target: "_blank",
                rel: "noopener noreferrer",
                i18n: "made by artgins"
            }, t("made by artgins")],
            ["button", {class: "MUS_CREDITS_HELP", type: "button", i18n: "help"},
                t("help"), {click: () => open_help(gobj)}]
        ]]
    );

    let $c = createElement2(
        ["div", {class: "C_MUS_DECK MUS_DECK"}, [$now, $queue, $credits]]
    );
    gobj_write_attr(gobj, "$container", $c);
}

function clear($node)
{
    while($node.firstChild) {
        $node.removeChild($node.firstChild);
    }
}

function go_to(gobj, route)
{
    let shell = yui_shell_of(gobj);
    if(shell) {
        yui_shell_navigate(shell, route);
    }
}

function open_help(gobj)
{
    let shell = yui_shell_of(gobj);
    if(shell) {
        open_about(shell, false);
    }
}

/***************************************************************
 *  Loading music FROM THE DECK means two things at once: the
 *  folder becomes an authorised source (so it is remembered and
 *  browsable in the library), and its tracks land on the deck
 *  straight away. Registering the source without filling the
 *  queue would leave the user pressing a button on the queue
 *  screen and watching the queue not change.
 ***************************************************************/
async function load_onto_deck(pick)
{
    let source_id = await pick();
    if(!source_id) {
        return;                 // the user closed the picker
    }
    queue_add(tracks_of_source(source_id), "append");
}




                    /***************************
                     *      The transport
                     ***************************/




function paint_now(gobj)
{
    let priv = gobj.priv;
    let $now = priv.$now;
    if(!$now) {
        return;
    }
    clear($now);

    let track = current_track();
    let playing = is_playing();
    let url = track ? cover_url(track.key) : null;

    let $art = url
        ? ["img", {class: "MUS_DECKART", src: url, alt: ""}]
        : ["div", {class: "MUS_DECKART is-empty"}, "♪"];

    let title = track ? track.title : t("nothing cued");
    let sub = track
        ? (track.artist + (track.album ? " · " + track.album : ""))
        : "";

    let $head = ["div", {class: "MUS_DECKHEAD"}, [
        $art,
        ["div", {class: "MUS_DECKMETA"}, [
            ["h2", {class: "MUS_DECKTITLE",
                    i18n: track ? undefined : "nothing cued"}, title],
            ["p", {class: "MUS_DECKSUB"}, sub]
        ]]
    ]];

    let $seek = ["div", {class: "MUS_SEEK", role: "progressbar"},
        [["i", {class: "MUS_SEEK_FILL"}]],
        {click: (ev) => seek_at(ev, ev.currentTarget)}];

    let $times = ["div", {class: "MUS_TIMES"}, [
        ["span", {class: "MUS_TCUR"}, "0:00"],
        ["span", {class: "MUS_TTOT"}, "0:00"]
    ]];

    let $transport = ["div", {class: "MUS_TRANSPORT"}, [
        tog_button("MUS_SHUFFLE", P.shuffle, 20, "shuffle", get_shuffle(),
            () => { set_shuffle(!get_shuffle()); paint_now(gobj); }),
        ctl_button("MUS_TPREV", P.prev, 26, "previous", () => prev()),
        ctl_button("MUS_TPLAY is-primary", playing ? P.pause : P.play, 30,
            playing ? "pause" : "play", () => toggle()),
        ctl_button("MUS_TNEXT", P.next, 26, "next", () => step(1)),
        tog_button("MUS_REPEAT", P.repeat, 20, "repeat", get_repeat(),
            () => { set_repeat(!get_repeat()); paint_now(gobj); })
    ]];

    $now.appendChild(createElement2(
        ["div", {class: "MUS_DECKCARD"}, [$head, $seek, $times, $transport]]));

    /*  A tab opened before a deploy goes on running the old bundle, and
        the only symptom is that a fix appears not to have worked. Say
        it, and let the user choose when to reload — they may be in the
        middle of listening to something. */
    if(is_stale()) {
        $now.appendChild(createElement2(
            ["div", {class: "MUS_AUTHBAR MUS_UPDBAR", role: "status"}, [
                ["div", {class: "MUS_AUTHBAR_TXT"}, [
                    ["span", {i18n: "new version"}, t("new version")],
                    ["span", {class: "MUS_AUTHBAR_WHICH"}, latest_version()]
                ]],
                ["button", {class: "MUS_QBTN button is-primary", type: "button",
                            i18n: "reload"},
                    t("reload"), {click: () => location.reload()}]
            ]]));
    }

    /*  Chrome hands back the folder but not the permission on it, every
        launch, and nothing the app can call changes that. What it CAN do
        is put the button where the user already is instead of making
        them go and find it in Sources. */
    let pending = pending_authorisation();
    if(pending.length) {
        $now.appendChild(createElement2(
            ["div", {class: "MUS_AUTHBAR", role: "status"}, [
                ["div", {class: "MUS_AUTHBAR_TXT"}, [
                    ["span", {i18n: "folders need authorising"},
                        t("folders need authorising")],
                    ["span", {class: "MUS_AUTHBAR_WHICH"},
                        pending.map((p) => p.name).join(" · ")]
                ]],
                ["button", {class: "MUS_QBTN button is-primary", type: "button",
                            i18n: "authorise"},
                    t("authorise"), {click: () => authorize_all()}]
            ]]));
    }

    /*  A file that vanished, or a pick with nothing playable in it. */
    if(store_state.notice) {
        $now.appendChild(createElement2(
            ["div", {class: "MUS_NOTICE", role: "status"}, [
                ["span", {i18n: store_state.notice}, t(store_state.notice)],
                ["button", {class: "MUS_NOTICE_X", type: "button",
                            "aria-label": t("close"),
                            "data-i18n-aria-label": "close"},
                    svg(P.cross, 14), {click: () => clear_notice()}]
            ]]));
    }

    paint_time(gobj);
    refresh_language($now, t);
}

function ctl_button(cls, path, size, key, on_click)
{
    return ["button", {
            class: "MUS_TBTN " + cls,
            type: "button",
            "aria-label": t(key),
            "data-i18n-aria-label": key,
            title: t(key),
            "data-i18n-title": key
        }, svg(path, size), {click: on_click}];
}

function tog_button(cls, path, size, key, on, on_click)
{
    return ["button", {
            class: "MUS_TBTN MUS_TOG " + cls + (on ? " is-on" : ""),
            type: "button",
            "aria-pressed": on ? "true" : "false",
            "aria-label": t(key),
            "data-i18n-aria-label": key,
            title: t(key),
            "data-i18n-title": key
        }, svg(path, size), {click: on_click}];
}

function seek_at(ev, node)
{
    let r = node.getBoundingClientRect();
    let x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    /*  In a right-to-left layout the bar grows the other way. */
    let f = getComputedStyle(node).direction === "rtl"
        ? 1 - (x / r.width)
        : (x / r.width);
    seek_fraction(r.width ? f : 0);
}

/*  Cheap; fires on every timeupdate. */
function paint_time(gobj)
{
    let priv = gobj.priv;
    if(!priv.$now) {
        return;
    }
    let p = progress();
    let $fill = priv.$now.querySelector(".MUS_SEEK_FILL");
    if($fill) {
        $fill.style.width = (p.fraction * 100) + "%";
    }
    let $cur = priv.$now.querySelector(".MUS_TCUR");
    let $tot = priv.$now.querySelector(".MUS_TTOT");
    if($cur) { $cur.textContent = fmt_time(p.current); }
    if($tot) { $tot.textContent = fmt_time(p.duration); }
}




                    /***************************
                     *      The queue
                     ***************************/




function paint_queue(gobj)
{
    let priv = gobj.priv;
    let $box = priv.$queue;
    if(!$box) {
        return;
    }
    clear($box);

    let queue = queue_tracks();
    let origin = queue_origin();

    let $head = createElement2(
        ["header", {class: "MUS_QHEAD"}, [
            ["h3", {class: "MUS_QTITLE"}, [
                ["span", {i18n: "queue"}, t("queue")],
                ["span", {class: "MUS_QCOUNT"}, String(queue.length)]
            ]],
            /*  Whether this is a saved list or something put together by
                hand, and whether it still matches the list it came from.
                Playing "my list" when it is no longer that list is the
                kind of quiet lie an app should not tell. */
            queue.length
                ? (origin
                    ? ["div", {class: "MUS_QORIGIN"}, [
                        ["span", {class: "MUS_QORIGIN_KIND", i18n: "playing list"},
                            t("playing list")],
                        ["span", {class: "MUS_QORIGIN_NAME"}, origin.name],
                        origin.edited
                            ? ["span", {class: "MUS_QORIGIN_EDIT", i18n: "edited"},
                                t("edited")]
                            : ["span", {}]
                      ]]
                    : ["div", {class: "MUS_QORIGIN MUS_DIM", i18n: "temporary queue"},
                        t("temporary queue")])
                : ["span", {}],
            ["div", {class: "MUS_QACTIONS"}, [
                ["button", {class: "MUS_QBTN button", type: "button",
                            ...disabled_if(!queue.length)},
                    [ico(P.save, 16), ["span", {i18n: "save as list"}, t("save as list")]],
                    {click: () => open_naming(gobj)}],
                ["button", {class: "MUS_QBTN button is-ghost", type: "button",
                            ...disabled_if(!queue.length)},
                    [ico(P.trash, 16), ["span", {i18n: "clear queue"}, t("clear queue")]],
                    {click: () => queue_clear()}]
            ]]
        ]]
    );
    $box.appendChild($head);

    if(priv.naming) {
        $box.appendChild(build_naming(gobj));
    }

    if(!queue.length) {
        $box.appendChild(createElement2(
            ["div", {class: "MUS_EMPTY_NOTE"}, [
                ["p", {i18n: "the queue is empty"}, t("the queue is empty")],
                ["p", {class: "MUS_DIM", i18n: "load something to start"},
                    t("load something to start")],
                ["div", {class: "MUS_QACTIONS"}, [
                    ["button", {class: "MUS_QBTN button", type: "button"},
                        [ico(P.folder, 16),
                         ["span", {i18n: "add music in sources"},
                            t("add music in sources")]],
                        {click: () => go_to(gobj, "/sources")}]
                ]]
            ]]));
        refresh_language($box, t);
        return;
    }

    let cur = queue_index();
    let $rows = createElement2(["ol", {class: "MUS_QROWS"}, []]);
    queue.forEach(function(track, i) {
        $rows.appendChild(createElement2(queue_row(gobj, track, i, cur, queue.length)));
    });
    $box.appendChild($rows);
    refresh_language($box, t);
}

function queue_row(gobj, track, i, cur, total)
{
    return ["li", {
            class: "MUS_QROW" + (i === cur ? " is-playing" : ""),
            "data-qi": String(i),
            draggable: "true"
        }, [
            /*  Not a button any more: browsing the queue must not change
                what is playing. Starting this track is the ▶ below. */
            ["div", {class: "MUS_QPLAY"}, [
                ["span", {class: "MUS_QNUM"}, String(i + 1)],
                ["span", {class: "MUS_QMETA"}, [
                    ["span", {class: "MUS_T1"}, track.title],
                    ["span", {class: "MUS_T2"}, track.artist]
                ]]
            ]],
            ["div", {class: "MUS_QCTL"}, [
                icon_button(P.play, 16, "play this", true,
                    () => queue_play_at(i)),
                icon_button(P.up, 16, "move up", i > 0,
                    () => queue_move(i, i - 1)),
                icon_button(P.down, 16, "move down", i < total - 1,
                    () => queue_move(i, i + 1)),
                icon_button(P.cross, 14, "remove from queue", true,
                    () => queue_remove_at(i))
            ]]
        ], {
            dragstart: (ev) => {
                gobj.priv.drag_from = i;
                ev.dataTransfer.effectAllowed = "move";
                /*  Firefox refuses to start a drag without payload. */
                try { ev.dataTransfer.setData("text/plain", String(i)); } catch(e) {}
            },
            dragover: (ev) => { ev.preventDefault(); },
            drop: (ev) => {
                ev.preventDefault();
                let from = gobj.priv.drag_from;
                gobj.priv.drag_from = -1;
                if(from >= 0 && from !== i) {
                    queue_move(from, i);
                }
            }
        }];
}

function icon_button(path, size, key, enabled, on_click)
{
    let attrs = {
        class: "MUS_IBTN",
        type: "button",
        "aria-label": t(key),
        "data-i18n-aria-label": key,
        title: t(key),
        "data-i18n-title": key
    };
    if(!enabled) {
        attrs.disabled = "disabled";
    }
    return ["button", attrs, svg(path, size), {click: on_click}];
}

/*  Only the "is-playing" class moves on a track change, so the list is
    not rebuilt under the user's finger while they are reordering it. */
function paint_queue_highlight(gobj)
{
    let priv = gobj.priv;
    if(!priv.$queue) {
        return;
    }
    let cur = String(queue_index());
    for(const $row of priv.$queue.querySelectorAll(".MUS_QROW[data-qi]")) {
        $row.classList.toggle("is-playing", $row.getAttribute("data-qi") === cur);
    }
}




                    /***************************
                     *      Save as list
                     ***************************/




function open_naming(gobj)
{
    gobj.priv.naming = true;
    paint_queue(gobj);
    let $input = gobj.priv.$queue.querySelector(".MUS_NAME_INPUT");
    if($input) {
        $input.focus();
    }
}

function close_naming(gobj)
{
    gobj.priv.naming = false;
    paint_queue(gobj);
}

function build_naming(gobj)
{
    const commit = async function() {
        let $input = gobj.priv.$queue.querySelector(".MUS_NAME_INPUT");
        let name = $input ? $input.value : "";
        await save_queue_as(name);
        close_naming(gobj);
    };

    return createElement2(
        ["div", {class: "MUS_NAMEROW"}, [
            ["input", {
                class: "MUS_NAME_INPUT input",
                type: "text",
                placeholder: t("name for this list"),
                "data-i18n-placeholder": "name for this list",
                "aria-label": t("name for this list"),
                "data-i18n-aria-label": "name for this list"
            }, null, {
                keydown: (ev) => {
                    if(ev.key === "Enter") { commit(); }
                    else if(ev.key === "Escape") { close_naming(gobj); }
                }
            }],
            ["button", {class: "button is-primary", type: "button", i18n: "save"},
                t("save"), {click: () => commit()}],
            ["button", {class: "button is-ghost", type: "button", i18n: "cancel"},
                t("cancel"), {click: () => close_naming(gobj)}]
        ]]
    );
}




                    /***************************
                     *      Actions
                     ***************************/




function ac_language_changed(gobj, event, kw, src)
{
    paint_now(gobj);
    paint_queue(gobj);
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

function register_c_mus_deck()
{
    return create_gclass(GCLASS_NAME);
}

export {register_c_mus_deck};
