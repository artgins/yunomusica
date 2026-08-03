/***********************************************************************
 *          c_mus_view.js
 *
 *      C_MUS_VIEW — the library: the place you go to FILL the deck.
 *
 *      One view with five ways of looking at the same tracks, switched by
 *      a chip row rather than by five separate routes: artists, albums,
 *      genres, folders, and the flat list of everything. A tap on a group
 *      drills one level down; a search filters the whole library into a
 *      flat result list.
 *
 *      Every row offers the same two verbs, and the distinction matters:
 *      PLAY replaces the queue and starts, ADD appends to whatever the
 *      user has already built on the deck without interrupting it.
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
    subscribe,
    has_library, store_state,
    groups_for, albums, all_tracks_sorted, search, cover_url,
    queue_add, current_track, preview_track,
} from "./music_store.js";

import {add_dir, add_files, source_name} from "./sources_store.js";

import {t} from "i18next";


/***************************************************************
 *              Constants
 ***************************************************************/
const GCLASS_NAME = "C_MUS_VIEW";

const VIEWS = ["artists", "albums", "genres", "folders", "all"];

const svg = (path, size) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;

const P = {
    play:   "M8 5v14l11-7z",
    plus:   "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
    back:   "M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z",
    folder: "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z",
    file:   "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 7V3.5L18.5 9z",
};

function ico(path, size)
{
    return ["span", {class: "MUS_ICO"}, svg(path, size)];
}

/*  The three "unknown" group names are stored as their key, so they can
    follow the language like everything else. */
const UNKNOWN_KEYS = {
    "unknown artist": 1, "unknown album": 1, "unknown genre": 1,
};

function display_name(name)
{
    return UNKNOWN_KEYS[name] ? t(name) : name;
}


/***************************************************************
 *              Attrs
 ***************************************************************/
const attrs_table = [
SDATA(data_type_t.DTP_POINTER,  "subscriber",  0,  null,      "Subscriber of output events"),
SDATA(data_type_t.DTP_STRING,   "view",        0,  "artists", "artists|albums|genres|folders|all"),
SDATA(data_type_t.DTP_STRING,   "title",       0,  "",        "Human title of the view"),
SDATA(data_type_t.DTP_POINTER,  "$container",  0,  null,      "Root HTMLElement (shell contract)"),
SDATA_END()
];

let PRIVATE_DATA = {
    view:     "artists",
    detail:   null,     // {kind, name, tracks} while drilled in
    search:   "",
    selected: 0,        // uid of the row whose details are open
    unsub:    null,
    $chips:   null,
    $content: null,
    search_timer: 0,
};

let __gclass__ = null;




                    /******************************
                     *      Framework Methods
                     ******************************/




function mt_create(gobj)
{
    let priv = gobj.priv;

    let subscriber = gobj_read_pointer_attr(gobj, "subscriber");
    if(!subscriber) {
        subscriber = gobj_parent(gobj);
    }
    gobj_subscribe_event(gobj, null, {}, subscriber);

    priv.view = gobj_read_attr(gobj, "view") || "artists";
    if(VIEWS.indexOf(priv.view) < 0) {
        priv.view = "artists";
    }

    build_ui(gobj);
}

function mt_start(gobj)
{
    let priv = gobj.priv;

    priv.unsub = subscribe(function(channel) {
        if(channel === "library" || channel === "loading") {
            render(gobj);
        } else if(channel === "playing") {
            highlight_current(gobj);
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
    if(priv.unsub) {
        priv.unsub();
        priv.unsub = null;
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
                     *      DOM scaffolding
                     ***************************/




/*  The persistent frame: a search box kept across renders so its input
    never loses focus, the chip row, and the content box render()
    rebuilds. */
function build_ui(gobj)
{
    let priv = gobj.priv;

    let $search = createElement2(
        ["input", {
            class: "MUS_SEARCH input",
            type: "search",
            placeholder: t("search placeholder"),
            "data-i18n-placeholder": "search placeholder",
            autocomplete: "off",
            "aria-label": t("search"),
            "data-i18n-aria-label": "search"
        }, null, {
            input: function(ev) {
                clearTimeout(priv.search_timer);
                let value = ev.target.value.trim();
                priv.search_timer = setTimeout(function() {
                    priv.search = value;
                    priv.detail = null;     // a search leaves any drill-down
                    render(gobj);
                }, 140);
            }
        }]
    );

    let $chips = createElement2(["nav", {class: "MUS_CHIPS"}, []]);
    priv.$chips = $chips;

    let $header = createElement2(
        ["div", {class: "MUS_HEADER"}, [
            ["div", {class: "MUS_SEARCH_WRAP"}, [$search]],
            $chips
        ]]
    );

    let $content = createElement2(["div", {class: "MUS_CONTENT"}, []]);
    priv.$content = $content;

    gobj_write_attr(gobj, "$container",
        createElement2(["div", {class: "C_MUS_VIEW MUS_VIEW"}, [$header, $content]]));
}

function clear($node)
{
    while($node.firstChild) {
        $node.removeChild($node.firstChild);
    }
}

/*  The shell's center zone is the scroll container; reset it to the top
    when we enter or leave a drill-down. */
function scroll_top(gobj)
{
    let $c = gobj_read_attr(gobj, "$container");
    let $zone = $c && $c.closest(".yui-zone-center");
    if($zone) {
        $zone.scrollTop = 0;
    }
}




                    /***************************
                     *      Render
                     ***************************/




/***************************************************************
 *  A drill-down holds the group's tracks as they were when it
 *  was opened. Removing a source changes the library underneath
 *  it, so re-resolve the group by name before painting: if it
 *  lost tracks, take the current ones; if it is gone entirely,
 *  drop back to the list rather than showing a group whose files
 *  are no longer there.
 ***************************************************************/
function revalidate_detail(gobj)
{
    let priv = gobj.priv;
    let d = priv.detail;
    if(!d) {
        return;
    }
    let groups = (d.kind === "albums") ? albums() : groups_for(d.kind);
    let g = groups.find((x) => x.name === d.name);
    if(!g) {
        priv.detail = null;
        return;
    }
    d.tracks = g.tracks;
}

function render(gobj)
{
    let priv = gobj.priv;
    let $content = priv.$content;
    if(!$content) {
        return;
    }
    revalidate_detail(gobj);
    clear($content);
    paint_chips(gobj);

    /*  Nothing to search or to switch between while the library is
        empty. */
    let $c = gobj_read_attr(gobj, "$container");
    let $header = $c && $c.querySelector(".MUS_HEADER");
    if($header) {
        $header.style.display = has_library() ? "" : "none";
    }

    if(!has_library()) {
        $content.appendChild(store_state.loading ? build_loading() : build_empty());
        refresh_language($content, t);
        return;
    }

    if(priv.search) {
        render_list(gobj, $content, search(priv.search));
    } else if(priv.detail) {
        render_detail(gobj, $content);
    } else if(priv.view === "all") {
        render_list(gobj, $content, all_tracks_sorted());
    } else if(priv.view === "albums") {
        render_albums(gobj, $content);
    } else {
        render_groups(gobj, $content, priv.view);
    }

    highlight_current(gobj);
    refresh_language($content, t);
}


function paint_chips(gobj)
{
    let priv = gobj.priv;
    let $chips = priv.$chips;
    if(!$chips) {
        return;
    }
    clear($chips);
    for(const v of VIEWS) {
        let on = (v === priv.view) && !priv.search;
        $chips.appendChild(createElement2(
            ["button", {
                class: "MUS_CHIP" + (on ? " is-on" : ""),
                type: "button",
                "aria-selected": on ? "true" : "false",
                i18n: v
            }, t(v), {
                click: () => {
                    priv.view = v;
                    priv.detail = null;
                    scroll_top(gobj);
                    render(gobj);
                }
            }]));
    }
    refresh_language($chips, t);
}


/***************************************************************
 *  Empty state — no marketing here any more, just the two ways
 *  to get music in. The pitch lives in the welcome dialog.
 ***************************************************************/
function build_empty()
{
    return createElement2(
        ["div", {class: "MUS_EMPTY"}, [
            ["p", {class: "MUS_EMPTY_LEAD", i18n: "load something to start"},
                t("load something to start")],
            ["div", {class: "MUS_QACTIONS"}, [
                ["button", {class: "MUS_QBTN button is-primary", type: "button"},
                    [ico(P.folder, 16), ["span", {i18n: "add a folder"}, t("add a folder")]],
                    {click: () => add_dir()}],
                ["button", {class: "MUS_QBTN button", type: "button"},
                    [ico(P.file, 16), ["span", {i18n: "add loose files"}, t("add loose files")]],
                    {click: () => add_files()}]
            ]],
            ["p", {class: "MUS_DIM MUS_HINT", i18n: "folders are recursive"},
                t("folders are recursive")]
        ]]
    );
}


function build_loading()
{
    let total = store_state.total || 1;
    let pct = Math.round((store_state.loaded / total) * 100);
    return createElement2(
        ["div", {class: "MUS_LOADING"}, [
            ["div", {class: "MUS_LOAD_COUNT"}, [
                ["span", {}, String(store_state.loaded)],
                ["span", {i18n: "tracks"}, t("tracks")]
            ]],
            ["div", {class: "MUS_BAR"}, [
                ["i", {class: "MUS_BAR_FILL", style: `width:${pct}%`}]
            ]],
            ["div", {class: "MUS_LOAD_NAME"},
                store_state.load_name || t("reading tags")]
        ]]
    );
}


/*  Cover art: an <img> when the album has one, else a glyph tile. */
function cover_spec(key, cls, fallback)
{
    let url = cover_url(key);
    if(url) {
        return ["img", {class: cls, src: url, loading: "lazy", alt: ""}];
    }
    return ["div", {class: cls}, fallback || "♪"];
}


/*  A single track offers LISTEN and ADD — not play.
 *
 *  Play used to replace the whole queue for one row, which threw away
 *  whatever the user had built to hear one song. Listening costs
 *  nothing and commits to nothing; adding puts it on the deck. To play a
 *  whole album outright there is "Play all" on the album itself, which
 *  is a deliberate act on a deliberate thing. */
function track_buttons(t_)
{
    return ["div", {class: "MUS_ROWCTL"}, [
        ["button", {
                class: "MUS_IBTN",
                type: "button",
                "aria-label": t("preview"),
                "data-i18n-aria-label": "preview",
                title: t("preview"),
                "data-i18n-title": "preview"
            }, svg(P.play, 16),
            {click: (ev) => { ev.stopPropagation(); preview_track(t_); }}],
        ["button", {
                class: "MUS_IBTN",
                type: "button",
                "aria-label": t("add to queue"),
                "data-i18n-aria-label": "add to queue",
                title: t("add to queue"),
                "data-i18n-title": "add to queue"
            }, svg(P.plus, 16),
            {click: (ev) => { ev.stopPropagation(); queue_add([t_], "append"); }}]
    ]];
}

/*  The pair of verbs a GROUP carries: play all (replace the queue) and
    add all. Deliberate, and about a whole album or artist. */
function verb_buttons(get_tracks)
{
    return ["div", {class: "MUS_ROWCTL"}, [
        ["button", {
                class: "MUS_IBTN",
                type: "button",
                "aria-label": t("play"),
                "data-i18n-aria-label": "play",
                title: t("play"),
                "data-i18n-title": "play"
            }, svg(P.play, 16),
            {click: (ev) => { ev.stopPropagation(); queue_add(get_tracks(), "replace"); }}],
        ["button", {
                class: "MUS_IBTN",
                type: "button",
                "aria-label": t("add to queue"),
                "data-i18n-aria-label": "add to queue",
                title: t("add to queue"),
                "data-i18n-title": "add to queue"
            }, svg(P.plus, 16),
            {click: (ev) => { ev.stopPropagation(); queue_add(get_tracks(), "append"); }}]
    ]];
}


/***************************************************************
 *  A single track row. `list` is the play context: the ordered
 *  list a Play starts the queue from. showNum swaps the cover
 *  for the track number in album/folder detail.
 ***************************************************************/
/*  What else is known about a track, shown under it when selected. */
function track_details(t_)
{
    let rows = [
        ["album", t_.album],
        ["genre", t_.genre],
        ["year", t_.year],
        ["track number", t_.track ? String(t_.track) : ""],
        ["source", source_name(t_.source_id)],
        ["path", t_.path]
    ];
    return ["dl", {class: "MUS_DETAILS"},
        rows.filter((r) => r[1]).map(([key, value]) => [
            "div", {class: "MUS_DETAIL"}, [
                ["dt", {i18n: key}, t(key)],
                ["dd", {}, UNKNOWN_KEYS[value] ? t(value) : value]
            ]
        ])];
}

function track_row(gobj, t_, list, showNum)
{
    let left = showNum
        ? ["div", {class: "MUS_NUM"}, t_.track ? String(t_.track) : "·"]
        : cover_spec(t_.key, "MUS_ART");

    let subtitle = t_.artist + (t_.album && !showNum ? " · " + t_.album : "");

    /*  Tapping the row SELECTS it and shows the rest of what is known
        about the track. Navigating a library must never take over what
        is sounding, and it should not commit to anything either: this
        is the one gesture in the app that only looks. */
    let selected = (gobj.priv.selected === t_.uid);

    let children = [
        left,
        ["button", {
                class: "MUS_ROWMAIN",
                type: "button",
                "aria-expanded": selected ? "true" : "false"
            }, [
            ["span", {class: "MUS_T1"}, t_.title],
            ["span", {class: "MUS_T2"}, subtitle]
        ], {click: () => {
            gobj.priv.selected = selected ? 0 : t_.uid;
            render(gobj);
        }}],
        track_buttons(t_)
    ];

    return ["div", {
        class: "MUS_ROWWRAP" + (selected ? " is-selected" : "")
    }, [
        ["div", {class: "MUS_ROW", "data-tid": String(t_.uid)}, children],
        selected ? track_details(t_) : ["span", {}]
    ]];
}


function render_list(gobj, $content, list)
{
    if(!list.length) {
        $content.appendChild(createElement2(
            ["div", {class: "MUS_EMPTY_NOTE", i18n: "nothing here"}, t("nothing here")]));
        return;
    }
    $content.appendChild(createElement2(
        ["div", {class: "MUS_ROWS"}, list.map((x) => track_row(gobj, x, list, false))]));
}


function render_groups(gobj, $content, view)
{
    let priv = gobj.priv;
    let groups = groups_for(view);
    let round = view === "artists";
    let fallback = round ? "♫" : (view === "folders" ? "▤" : "♪");

    let rows = groups.map(function(g) {
        let sub = [
            ["span", {}, String(g.tracks.length)],
            ["span", {i18n: "tracks"}, t("tracks")]
        ];
        if(view === "artists") {
            let n = new Set(g.tracks.map((x) => x.album)).size;
            sub.push(["span", {class: "MUS_SEP"}, "·"]);
            /*  "n albums" is the count noun; "albums" is the chip label,
                which is capitalised in the languages that capitalise. */
            sub.push(["span", {}, String(n)]);
            sub.push(["span", {i18n: "n albums"}, t("n albums")]);
        }
        return ["div", {class: "MUS_ROW"}, [
            cover_spec(g.tracks[0].key, "MUS_ART" + (round ? " is-round" : ""), fallback),
            ["button", {class: "MUS_ROWMAIN", type: "button"}, [
                ["span", {class: "MUS_T1"}, display_name(g.name)],
                ["span", {class: "MUS_T2"}, sub]
            ], {
                click: () => {
                    priv.detail = {kind: view, name: g.name, tracks: g.tracks};
                    scroll_top(gobj);
                    render(gobj);
                }
            }],
            verb_buttons(() => ordered_detail({kind: view, tracks: g.tracks}))
        ]];
    });

    $content.appendChild(createElement2(["div", {class: "MUS_ROWS"}, rows]));
}


function render_albums(gobj, $content)
{
    let priv = gobj.priv;
    let cards = albums().map(function(a) {
        return ["div", {class: "MUS_CARD"}, [
            ["button", {class: "MUS_CARDMAIN", type: "button"}, [
                cover_spec(a.tracks[0].key, "MUS_COVER", "♪"),
                ["span", {class: "MUS_T1"}, display_name(a.name)],
                ["span", {class: "MUS_T2"}, display_name(a.tracks[0].albumArtist)]
            ], {
                click: () => {
                    priv.detail = {kind: "albums", name: a.name, tracks: a.tracks};
                    scroll_top(gobj);
                    render(gobj);
                }
            }],
            verb_buttons(() => ordered_detail({kind: "albums", tracks: a.tracks}))
        ]];
    });
    $content.appendChild(createElement2(["div", {class: "MUS_GRID"}, cards]));
}


/***************************************************************
 *  Drill-down detail: a header with cover + the two verbs, then
 *  the tracks. An album or a folder is a flat, track-numbered
 *  list; an artist or a genre is split into per-album sections.
 ***************************************************************/
function render_detail(gobj, $content)
{
    let priv = gobj.priv;
    let d = priv.detail;
    let ordered = ordered_detail(d);

    $content.appendChild(createElement2(
        ["button", {class: "MUS_BACK button is-ghost", type: "button"},
            [ico(P.back, 18), ["span", {i18n: "back"}, t("back")]],
            {click: () => { priv.detail = null; render(gobj); scroll_top(gobj); }}]));

    let year = d.tracks[0].year;
    let meta = [
        ["span", {}, String(d.tracks.length)],
        ["span", {i18n: "tracks"}, t("tracks")]
    ];
    if(d.kind === "albums") {
        meta.push(["span", {class: "MUS_SEP"}, "·"]);
        meta.push(["span", {}, display_name(d.tracks[0].albumArtist)]);
        if(year) {
            meta.push(["span", {class: "MUS_SEP"}, "·"]);
            meta.push(["span", {}, year]);
        }
    }

    $content.appendChild(createElement2(
        ["div", {class: "MUS_DHEAD"}, [
            cover_spec(d.tracks[0].key, "MUS_COVER MUS_DCOVER",
                d.kind === "artists" ? "♫" : "♪"),
            ["div", {class: "MUS_DINFO"}, [
                ["h3", {class: "MUS_DTITLE"}, display_name(d.name)],
                ["p", {class: "MUS_DMETA"}, meta],
                ["div", {class: "MUS_QACTIONS"}, [
                    ["button", {class: "MUS_QBTN button is-primary", type: "button"},
                        [ico(P.play, 15), ["span", {i18n: "play all"}, t("play all")]],
                        {click: () => queue_add(ordered, "replace")}],
                    ["button", {class: "MUS_QBTN button", type: "button"},
                        [ico(P.plus, 15), ["span", {i18n: "add to queue"}, t("add to queue")]],
                        {click: () => queue_add(ordered, "append")}]
                ]]
            ]]
        ]]));

    if(d.kind === "albums" || d.kind === "folders") {
        $content.appendChild(createElement2(
            ["div", {class: "MUS_ROWS"},
                ordered.map((x) => track_row(gobj, x, ordered, true))]));
        return;
    }

    /*  Artist / genre: one section per album. */
    let sections = new Map();
    for(const x of ordered) {
        if(!sections.has(x.album)) {
            sections.set(x.album, []);
        }
        sections.get(x.album).push(x);
    }
    let $wrap = createElement2(["div", {class: "MUS_ROWS"}, []]);
    for(const [album, tracks] of sections.entries()) {
        $wrap.appendChild(createElement2(
            ["div", {class: "MUS_SECTION_H"}, display_name(album)]));
        for(const x of tracks) {
            $wrap.appendChild(createElement2(track_row(gobj, x, ordered, true)));
        }
    }
    $content.appendChild($wrap);
}


function ordered_detail(d)
{
    let list = [...d.tracks];
    const collator = new Intl.Collator(undefined, {sensitivity: "base", numeric: true});
    const byTrackNo = (a,b) => (a.track - b.track) || collator.compare(a.title, b.title);
    if(d.kind === "albums") {
        return list.sort(byTrackNo);
    }
    return list.sort((a,b) => collator.compare(a.album, b.album) || byTrackNo(a,b));
}


/*  Toggle the "playing" tint on whichever row is the current track,
    without rebuilding the list. */
function highlight_current(gobj)
{
    let priv = gobj.priv;
    if(!priv.$content) {
        return;
    }
    let cur = current_track();
    let cur_id = cur ? String(cur.uid) : null;
    for(const $row of priv.$content.querySelectorAll(".MUS_ROW[data-tid]")) {
        $row.classList.toggle("is-playing", $row.getAttribute("data-tid") === cur_id);
    }
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

function register_c_mus_view()
{
    return create_gclass(GCLASS_NAME);
}

export {register_c_mus_view};
