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
    subscribe_playlists, all_playlists, resolve, entries_of,
    remove_playlist,
} from "./playlists_store.js";

import {
    subscribe, queue_add, set_queue_origin, find_track,
} from "./music_store.js";
import {confirm_replace} from "./confirm_replace.js";
import {subscribe_stats, ranked, split_key} from "./stats_store.js";
import {open_track, track_counts} from "./track_card.js";

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
    unsub_stats: null,      // the two lists that build themselves
    $content:    null,
    confirming:  "",        // id of the list awaiting a delete confirmation
    open_id:     "",        // id of the list whose songs are unfolded
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
    /*  The two lists below the saved ones ARE the counts, so they are
        rebuilt whenever a count moves. */
    priv.unsub_stats = subscribe_stats(() => render(gobj));

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
    if(priv.unsub_stats) {
        priv.unsub_stats();
        priv.unsub_stats = null;
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
    } else {
        let $list = createElement2(["div", {class: "MUS_SRCLIST"}, []]);
        for(const p of lists) {
            $list.appendChild(build_list_row(gobj, p));
        }
        $c.appendChild($list);
    }

    /*  …and the two that make themselves. */
    build_ranked(gobj, $c, "hearts", "loved", "no hearts yet", "how to give a heart");
    build_ranked(gobj, $c, "plays", "most played", "nothing played yet",
        "how playing counts");

    refresh_language($c, t);
}


/***************************************************************
 *  The lists nobody saved.
 *
 *  A saved list is a decision; these two are a consequence —
 *  what you have loved and what you have actually played, in
 *  order. They are built from the counts every time this screen
 *  is drawn rather than stored anywhere, which is what keeps
 *  them from ever disagreeing with the numbers on the rows.
 *
 *  A track whose source is not authorised in this session
 *  cannot be resolved, and is REPORTED rather than dropped in
 *  silence — the same rule the saved lists follow. Its count is
 *  still real; it is the file that is out of reach.
 ***************************************************************/
function build_ranked(gobj, $c, by, title_key, empty_key, hint_key)
{
    const rows = ranked(by);
    const tracks = [];
    let missing = 0;

    for(const row of rows) {
        const id = split_key(row.key);
        const track = find_track(id.source_id, id.path);
        if(track) {
            tracks.push({track: track, n: (by === "hearts") ? row.hearts : row.plays});
        } else {
            missing++;
        }
    }

    $c.appendChild(createElement2(
        ["header", {class: "MUS_SECHEAD"}, [
            ["h2", {class: "MUS_SECTITLE", i18n: title_key}, t(title_key)],
            tracks.length
                ? ["span", {class: "MUS_SECCOUNT"}, String(tracks.length)]
                : ["span", {}]
        ]]));

    if(!tracks.length) {
        $c.appendChild(createElement2(
            ["div", {class: "MUS_EMPTY_NOTE"}, [
                ["p", {i18n: empty_key}, t(empty_key)],
                ["p", {class: "MUS_DIM", i18n: hint_key}, t(hint_key)]
            ]]));
        return;
    }

    const all = tracks.map((x) => x.track);

    $c.appendChild(createElement2(
        ["div", {class: "MUS_RANKACTIONS"}, [
            ["button", {class: "MUS_QBTN button is-primary", type: "button"},
                [ico(P.play, 15), ["span", {i18n: "play"}, t("play")]],
                {click: async () => {
                    let shell = yui_shell_of(gobj);
                    let answer = await confirm_replace(shell);
                    if(!answer) {
                        return;
                    }
                    queue_add(all, answer);
                    /*  Deliberately NOT stamped as a saved list: this
                        one has no id and is a different thing every
                        time a count moves. The deck says "queue put
                        together by hand", which is closer to true than
                        naming a list that cannot be reopened. */
                    if(shell) {
                        yui_shell_navigate(shell, "/player");
                    }
                }}],
            ["button", {class: "MUS_QBTN button", type: "button"},
                [ico(P.plus, 15), ["span", {i18n: "add to queue"}, t("add to queue")]],
                {click: () => queue_add(all, "append")}],
            missing
                ? ["span", {class: "MUS_T2 is-warn"}, [
                    ["span", {}, String(missing)],
                    ["span", {i18n: "missing"}, t("missing")]
                  ]]
                : ["span", {}]
        ]]));

    $c.appendChild(track_rows(gobj,
        tracks.map((x, i) => ({track: x.track, n: i + 1}))));
}


/***************************************************************
 *  The rows under a list, wherever the list came from.
 *
 *  One builder for both: the two ranked lists number their
 *  rows, an unfolded saved list numbers them by position, and
 *  an entry whose source is not authorised right now still gets
 *  a row — greyed, from the title stored WITH the list, which
 *  is what those stored titles are for. Leaving it out would
 *  make an unfolded list quietly shorter than the list.
 ***************************************************************/
function track_rows(gobj, items)
{
    const $rows = createElement2(["ol", {class: "MUS_RANKS"}, []]);
    for(const item of items) {
        const track = item.track;
        if(!track) {
            $rows.appendChild(createElement2(
                ["li", {class: "MUS_RANK is-missing"}, [
                    ["span", {class: "MUS_RANKN"}, String(item.n)],
                    ["span", {class: "MUS_RANKMAIN"}, [
                        ["span", {class: "MUS_T1"}, item.title || "?"],
                        ["span", {class: "MUS_T2"}, item.artist || ""]
                    ]],
                    ["span", {class: "MUS_T2 is-warn", i18n: "missing"}, t("missing")]
                ]]));
            continue;
        }
        $rows.appendChild(createElement2(
            ["li", {class: "MUS_RANK"}, [
                ["span", {class: "MUS_RANKN"}, String(item.n)],
                ["button", {
                        class: "MUS_RANKMAIN", type: "button",
                        "aria-haspopup": "dialog"
                    }, [
                    ["span", {class: "MUS_T1"}, track.title],
                    ["span", {class: "MUS_T2"}, track.artist]
                ], {click: () => open_track(yui_shell_of(gobj), track)}],
                track_counts(track),
                ["button", {
                        class: "MUS_IBTN", type: "button",
                        "aria-label": t("add to queue"),
                        "data-i18n-aria-label": "add to queue",
                        title: t("add to queue"),
                        "data-i18n-title": "add to queue"
                    }, svg(P.plus, 16),
                    {click: () => queue_add([track], "append")}]
            ]]));
    }
    return $rows;
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
            {click: async () => {
                let shell = yui_shell_of(gobj);
                let answer = await confirm_replace(shell);
                if(!answer) {
                    return;
                }
                queue_add(r.tracks, answer);
                /*  Order matters: "replace" detaches the queue from
                    whatever it was, so the list is stamped on after.
                    Appending leaves the deck as whatever it already was. */
                if(answer === "replace") {
                    set_queue_origin(p.id, p.name);
                }
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

    /*  THE NAME OPENS THE LIST.
     *
     *  A button of its own was the alternative and this row already
     *  carries three; and tapping a name to see what is inside it is
     *  what the gesture already means everywhere else here — on a
     *  track it opens its card, in the library it drills into a group.
     *  The chevron is there so it does not have to be guessed at. */
    let open = (gobj.priv.open_id === p.id);

    let $row = createElement2(
        ["article", {class: "MUS_SRCROW"}, [
            ["button", {
                    class: "MUS_SRCMETA MUS_LISTNAME", type: "button",
                    "aria-expanded": open ? "true" : "false"
                }, [
                ["div", {class: "MUS_T1"}, [
                    ["span", {class: "MUS_LISTCHEV" + (open ? " is-open" : ""),
                              "aria-hidden": "true"}, "⌄"],
                    ["span", {}, p.name]
                ]],
                ["div", {class: "MUS_T2"}, sub]
            ], {click: () => {
                gobj.priv.open_id = open ? "" : p.id;
                render(gobj);
            }}],
            ["div", {class: "MUS_SRCACTIONS"}, actions]
        ]]
    );

    if(!open) {
        return $row;
    }

    /*  Every entry, in the order it was saved — including the ones
        that cannot be played right now, drawn from the title stored
        WITH the list. An unfolded list that is shorter than the list
        would be the same quiet lie the "3 missing" line exists to
        avoid. */
    let items = entries_of(p.id).map(function(item, i) {
        return {
            track:  find_track(item.source_id, item.path),
            title:  item.title,
            artist: item.artist,
            n:      i + 1
        };
    });

    return createElement2(
        ["div", {class: "MUS_LISTWRAP"}, [$row, track_rows(gobj, items)]]);
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
