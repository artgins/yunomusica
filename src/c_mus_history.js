/***********************************************************************
 *          c_mus_history.js
 *
 *      C_MUS_HISTORY — what has been listened to, and what that adds up
 *      to.
 *
 *      Five chips over the same record (see history_store.js):
 *
 *        - RECENT: the occasions themselves, newest first. Each one can
 *          be put back on the deck, including a queue that was built by
 *          hand and never saved as a list — which is the one this
 *          screen exists for.
 *        - FAVOURITE LISTS: the same occasions grouped, ranked by how
 *          long they really sounded.
 *        - FAVOURITE TRACKS / ALBUMS / ARTISTS: counted plays, summed.
 *
 *      Nothing here is marked by hand. A star is a chore, and what
 *      somebody plays is a better answer than what they say they like.
 *
 *      Rows behave exactly as they do in the library, because the rules
 *      are the app's, not the screen's: ▶ on a track PREVIEWS, ▶ on a
 *      group asks before it replaces the deck, + always adds.
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
    subscribe_history, recent_sessions,
    favourite_lists, favourite_tracks, favourite_albums, favourite_artists,
    has_history, resolve_items, clear_history,
} from "./history_store.js";

import {
    subscribe, queue_add, set_queue_origin, preview_track,
    albums, groups_for, fmt_time,
} from "./music_store.js";

import {confirm_replace} from "./confirm_replace.js";
import {current_locale} from "./locales/locales.js";

import {t} from "i18next";


/***************************************************************
 *              Constants
 ***************************************************************/
const GCLASS_NAME = "C_MUS_HISTORY";

const VIEWS = ["recent", "favourite lists", "favourite tracks",
               "favourite albums", "favourite artists"];

/*  Long enough to be a history, short enough to be read. */
const SHOWN = 50;

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

/*  `disabled: undefined` becomes disabled="undefined", which disables
    the button. The key must be absent — see c_mus_deck.js. */
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
    unsub_hist:  null,
    unsub_music: null,
    $chips:      null,
    $content:    null,
    view:        "recent",
    confirming:  false,     // the "clear the history" confirmation is open
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

    let priv = gobj.priv;
    priv.$chips = createElement2(["nav", {class: "MUS_CHIPS"}, []]);
    priv.$content = createElement2(["div", {class: "MUS_CONTENT"}, []]);

    gobj_write_attr(gobj, "$container", createElement2(
        ["div", {class: "C_MUS_HISTORY MUS_VIEW"}, [
            ["div", {class: "MUS_HEADER"}, [priv.$chips]],
            priv.$content
        ]]));
}

function mt_start(gobj)
{
    let priv = gobj.priv;

    priv.unsub_hist = subscribe_history(() => render(gobj));
    /*  How much of a remembered queue can be played depends on which
        sources are authorised right now, so the library moving changes
        what this view has to say. */
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
    if(priv.unsub_hist) {
        priv.unsub_hist();
        priv.unsub_hist = null;
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
                     *      Formatting
                     ***************************/




function clear($node)
{
    while($node.firstChild) {
        $node.removeChild($node.firstChild);
    }
}

/*  A date in the reader's language, from the browser. Writing "3 days
    ago" would need a rule per language and a plural per rule; Intl
    already knows all of them. */
function when(ms)
{
    if(!ms) {
        return "";
    }
    try {
        return new Intl.DateTimeFormat(current_locale(),
            {dateStyle: "medium", timeStyle: "short"}).format(new Date(ms));
    } catch(e) {
        return new Date(ms).toLocaleString();
    }
}

/*  h:mm:ss over an hour, m:ss under it. The same clock as the deck's,
    which is the one the user is already reading. */
function fmt_span(secs)
{
    let s = Math.max(0, Math.round(secs || 0));
    if(s < 3600) {
        return fmt_time(s);
    }
    let h = Math.floor(s / 3600);
    let m = Math.floor((s % 3600) / 60);
    return h + ":" + String(m).padStart(2, "0") +
        ":" + String(s % 60).padStart(2, "0");
}

/*  A figure and its noun are always two nodes: no string in this app
    interpolates a number, which is what keeps ten languages out of the
    plural-rule business. */
function figure(value, key)
{
    return [
        ["span", {}, String(value)],
        ["span", {i18n: key}, t(key)]
    ];
}

function sep()
{
    return ["span", {class: "MUS_SEP"}, "·"];
}




                    /***************************
                     *      Render
                     ***************************/




function render(gobj)
{
    let priv = gobj.priv;
    if(!priv.$content) {
        return;
    }
    paint_chips(gobj);

    let $c = priv.$content;
    clear($c);

    if(!has_history()) {
        $c.appendChild(createElement2(
            ["div", {class: "MUS_EMPTY_NOTE"}, [
                ["p", {i18n: "no history yet"}, t("no history yet")],
                ["p", {class: "MUS_DIM", i18n: "how history works"},
                    t("how history works")]
            ]]));
        refresh_language($c, t);
        return;
    }

    let rows = build_rows(gobj);
    if(!rows.length) {
        $c.appendChild(createElement2(
            ["div", {class: "MUS_EMPTY_NOTE"}, [
                ["p", {i18n: "nothing here"}, t("nothing here")]
            ]]));
    } else {
        let $list = createElement2(["div", {class: "MUS_SRCLIST"}, []]);
        rows.forEach(($r) => $list.appendChild($r));
        $c.appendChild($list);
    }

    $c.appendChild(build_footer(gobj));
    refresh_language($c, t);
}

function paint_chips(gobj)
{
    let priv = gobj.priv;
    let $chips = priv.$chips;
    clear($chips);
    for(const v of VIEWS) {
        let on = (v === priv.view);
        $chips.appendChild(createElement2(
            ["button", {
                class: "MUS_CHIP" + (on ? " is-on" : ""),
                type: "button",
                "aria-selected": on ? "true" : "false",
                i18n: v
            }, t(v), {
                click: () => {
                    priv.view = v;
                    render(gobj);
                }
            }]));
    }
    refresh_language($chips, t);
}

function build_rows(gobj)
{
    let priv = gobj.priv;
    switch(priv.view) {
        case "recent":
            return recent_sessions(SHOWN).map((s) => session_row(gobj, s));
        case "favourite lists":
            return favourite_lists(SHOWN).map((f) => favourite_list_row(gobj, f));
        case "favourite tracks":
            return favourite_tracks(SHOWN).map((p) => track_row(gobj, p));
        case "favourite albums":
            return favourite_albums(SHOWN).map((g) => group_row(gobj, g, "albums"));
        case "favourite artists":
            return favourite_artists(SHOWN).map((g) => group_row(gobj, g, "artists"));
    }
    return [];
}

/*  The history is a record of behaviour. It is the one thing this app
    stores that somebody may simply not want kept, so getting rid of it
    is a button on the screen that shows it — and it asks first,
    because it cannot be undone. */
function build_footer(gobj)
{
    let priv = gobj.priv;
    if(!priv.confirming) {
        return createElement2(
            ["footer", {class: "MUS_HISTFOOT"}, [
                ["p", {class: "MUS_DIM", i18n: "how history works"},
                    t("how history works")],
                ["button", {class: "MUS_QBTN button is-ghost", type: "button"},
                    [ico(P.trash, 15),
                     ["span", {i18n: "clear history"}, t("clear history")]],
                    {click: () => { priv.confirming = true; render(gobj); }}]
            ]]);
    }
    return createElement2(
        ["footer", {class: "MUS_HISTFOOT"}, [
            ["p", {i18n: "delete the history?"}, t("delete the history?")],
            ["div", {class: "MUS_QACTIONS"}, [
                ["button", {class: "MUS_QBTN button is-danger", type: "button",
                            i18n: "delete"}, t("delete"),
                    {click: async () => {
                        priv.confirming = false;
                        await clear_history();
                        render(gobj);
                    }}],
                ["button", {class: "MUS_QBTN button is-ghost", type: "button",
                            i18n: "cancel"}, t("cancel"),
                    {click: () => { priv.confirming = false; render(gobj); }}]
            ]]
        ]]);
}


/***************************************************************
 *      Rows
 ***************************************************************/
/*  Put a set of tracks on the deck. Replacing is destructive, so it
    asks — and offers to add instead, which is usually what was meant. */
async function play_them(gobj, tracks, list_id, name)
{
    let shell = yui_shell_of(gobj);
    let answer = await confirm_replace(shell);
    if(!answer) {
        return;
    }
    queue_add(tracks, answer);
    /*  Order matters: "replace" detaches the queue from whatever it
        was, so the list is stamped on afterwards. */
    if(answer === "replace" && list_id && name) {
        set_queue_origin(list_id, name);
    }
    if(shell) {
        yui_shell_navigate(shell, "/player");
    }
}

function row(title, sub, actions)
{
    return createElement2(
        ["article", {class: "MUS_SRCROW"}, [
            ["div", {class: "MUS_SRCMETA"}, [
                ["div", {class: "MUS_T1"}, title],
                ["div", {class: "MUS_T2"}, sub]
            ]],
            ["div", {class: "MUS_SRCACTIONS"}, actions]
        ]]);
}

/*  Play + add, over tracks resolved from stored references. */
function group_actions(gobj, get, playable, list_id, name)
{
    return [
        ["button", {class: "MUS_QBTN button is-primary", type: "button",
                    ...disabled_if(!playable)},
            [ico(P.play, 15), ["span", {i18n: "play"}, t("play")]],
            {click: () => play_them(gobj, get(), list_id, name)}],
        ["button", {class: "MUS_QBTN button", type: "button",
                    ...disabled_if(!playable)},
            [ico(P.plus, 15), ["span", {i18n: "add to queue"}, t("add to queue")]],
            {click: () => queue_add(get(), "append")}]
    ];
}

function session_row(gobj, s)
{
    let r = resolve_items(s.items);
    let name = s.kind === "list" && s.name ? s.name : t("temporary queue");
    let name_spec = s.kind === "list" && s.name
        ? ["span", {}, s.name]
        : ["span", {i18n: "temporary queue"}, t("temporary queue")];

    let sub = [
        ["span", {}, when(s.last || s.started)],
        sep(),
        ...figure(fmt_span(s.secs), "listened"),
        sep(),
        ...figure(s.count, "tracks")
    ];
    if(r.missing) {
        sub.push(sep());
        sub.push(["span", {class: "is-warn"}, String(r.missing)]);
        sub.push(["span", {class: "is-warn", i18n: "missing"}, t("missing")]);
    }

    return row([name_spec], sub,
        group_actions(gobj, () => r.tracks, r.tracks.length,
            s.kind === "list" ? s.list_id : "", s.kind === "list" ? name : ""));
}

function favourite_list_row(gobj, f)
{
    let r = resolve_items(f.items);
    let name_spec = f.kind === "list" && f.name
        ? ["span", {}, f.name]
        : ["span", {i18n: "temporary queue"}, t("temporary queue")];

    let sub = [
        ...figure(fmt_span(f.secs), "listened"),
        sep(),
        ...figure(f.times, "times"),
        sep(),
        ["span", {}, when(f.last)]
    ];

    return row([name_spec], sub,
        group_actions(gobj, () => r.tracks, r.tracks.length,
            f.kind === "list" ? f.list_id : "", f.kind === "list" ? f.name : ""));
}

/*  A track's ▶ previews — it does not take the deck. Same rule as the
    library, and the reason it is a rule: browsing must not change what
    is sounding. */
function track_row(gobj, p)
{
    let live = resolve_items([p]);
    let track = live.tracks[0] || null;

    let sub = [
        ["span", {}, p.artist || ""],
        sep(),
        ...figure(p.count, "plays"),
        sep(),
        ...figure(fmt_span(p.secs), "listened")
    ];

    let actions = [
        ["button", {class: "MUS_QBTN button", type: "button",
                    ...disabled_if(!track)},
            [ico(P.play, 15), ["span", {i18n: "preview"}, t("preview")]],
            {click: () => track && preview_track(track)}],
        ["button", {class: "MUS_QBTN button", type: "button",
                    ...disabled_if(!track)},
            [ico(P.plus, 15), ["span", {i18n: "add to queue"}, t("add to queue")]],
            {click: () => track && queue_add([track], "append")}]
    ];

    return row([["span", {}, p.title]], sub, actions);
}

/*  An album or an artist is played WHOLE, from the library as it is
    now — not from the handful of its tracks that happen to have been
    counted. Liking an album is not the same as having played four of
    its songs. */
function tracks_of_group(name, kind)
{
    let groups = (kind === "albums") ? albums() : groups_for("artists");
    let g = groups.find((x) => x.name === name);
    return g ? g.tracks : [];
}

function group_row(gobj, g, kind)
{
    let resolved = tracks_of_group(g.name, kind);

    let sub = [];
    if(kind === "albums" && g.artist) {
        sub.push(["span", {}, g.artist]);
        sub.push(sep());
    }
    sub.push(...figure(g.count, "plays"));
    sub.push(sep());
    sub.push(...figure(fmt_span(g.secs), "listened"));

    return row([["span", {}, g.name]], sub,
        group_actions(gobj, () => resolved, resolved.length, "", ""));
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

function register_c_mus_history()
{
    return create_gclass(GCLASS_NAME);
}

export {register_c_mus_history};
