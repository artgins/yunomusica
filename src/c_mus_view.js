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
 *      Every row offers the same two verbs, and the distinction is the
 *      whole design: PLAY sounds it NOW, on the temporary list, leaving
 *      the deck paused and intact; ADD puts it on the deck, which is the
 *      official, persistent list. Nothing here ever throws the deck
 *      away, so nothing here has to ask permission first.
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
    groups_for, albums, albums_of, all_tracks_sorted, search, cover_url,
    queue_add, current_track, play_temp,
} from "./music_store.js";

import {
    add_dir, add_files, subscribe_sources, source_notice, dismiss_notice,
} from "./sources_store.js";
import {open_track, track_counts, refresh_counts} from "./track_card.js";
import {subscribe_stats} from "./stats_store.js";

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
    unsub:    null,
    unsub_st: null,     // hearts and play counts, which rows show
    unsub_src: null,    // the sources, for what the empty screen has to say
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

    /*  A heart given from a row, or a play counted while this screen is
        up, changes a chip on it — two numbers, not a list. Re-rendering
        would throw away the button the finger is still on. */
    priv.unsub_st = subscribe_stats(() => paint_counts(gobj));

    /*  The empty screen carries the two pickers, so it also has to
        carry their answer. A pick that adds nothing changes nothing in
        the library, so the library channel never fires and the screen
        would sit there as if the button had not been pressed. */
    priv.unsub_src = subscribe_sources(() => render(gobj));

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
    if(priv.unsub_st) {
        priv.unsub_st();
        priv.unsub_st = null;
    }
    if(priv.unsub_src) {
        priv.unsub_src();
        priv.unsub_src = null;
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
    /*  By id, not by name. Two albums can carry the same title — that
        is the whole reason an album is an (artist, album) pair here —
        and re-finding one by its name would land on the other one's
        tracks after any repaint. */
    let g = groups.find((x) => x.id === d.id);
    if(!g) {
        priv.detail = null;
        return;
    }
    d.tracks = g.tracks;
    d.name = g.name;
    if(g.artist) {
        d.artist = g.artist;
    }
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
    let children = [
        ["p", {class: "MUS_EMPTY_LEAD", i18n: "load something to start"},
            t("load something to start")],
        ["div", {class: "MUS_QACTIONS"}, [
            ["button", {class: "MUS_QBTN button is-primary", type: "button"},
                [ico(P.folder, 16), ["span", {i18n: "add a folder"}, t("add a folder")]],
                {click: () => add_dir()}],
            ["button", {class: "MUS_QBTN button", type: "button"},
                [ico(P.file, 16), ["span", {i18n: "add loose files"}, t("add loose files")]],
                {click: () => add_files()}]
        ]]
    ];

    /*  These are the same two buttons as in Sources, so they can run
        into the same wall: a folder that is already in. Pressing a
        button on an empty screen and getting an empty screen back is
        the one answer that cannot be given here — the folder that WOULD
        have filled it is the one already in, and only this line says
        so. The question that needs an answer (a folder holding folders
        already added) is not asked here; it belongs beside the list of
        what would be dropped, which is in Sources. */
    const n = source_notice();
    if(n && !n.pending) {
        children.push(["div", {class: "MUS_SRCNOTE is-warn", role: "status"}, [
            ["p", {class: "MUS_SRCNOTE_TEXT"},
                t(n.kind, {name: n.name, other: n.other, skipped: n.skipped})],
            ["div", {class: "MUS_SRCNOTE_ACTIONS"}, [
                ["button", {class: "MUS_QBTN button is-ghost", type: "button",
                            i18n: "understood"},
                    t("understood"), {click: () => dismiss_notice()}]
            ]]
        ]]);
    }

    children.push(["p", {class: "MUS_DIM MUS_HINT", i18n: "folders are recursive"},
        t("folders are recursive")]);

    return createElement2(["div", {class: "MUS_EMPTY"}, children]);
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


/*  PLAY, on a track, means this list from here.
 *
 *  The rows on the screen are a list — the user can see that they are —
 *  so playing one of them starts there and runs on through the rest,
 *  the way pressing play on a record plays the record. It used to sound
 *  that one track and stop dead, which is not what anyone means by
 *  play; before that it replaced the whole deck for one row, which cost
 *  the user everything they had built to hear one song.
 *
 *  Neither happens now. It sounds on the temporary list, the deck waits
 *  paused exactly where it was, and the strip carries the way back. */
function track_buttons(t_, list)
{
    const context = () => {
        const l = (list && list.length) ? list : [t_];
        const i = l.indexOf(t_);
        return {l: l, i: i < 0 ? 0 : i};
    };
    return ["div", {class: "MUS_ROWCTL"}, [
        ["button", {
                class: "MUS_IBTN",
                type: "button",
                "aria-label": t("play"),
                "data-i18n-aria-label": "play",
                title: t("play"),
                "data-i18n-title": "play"
            }, svg(P.play, 16),
            {click: (ev) => {
                ev.stopPropagation();
                const c = context();
                play_temp(c.l, c.i);
            }}],
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

/*  The pair of verbs a GROUP carries: play it now, and put it on the
    deck. Playing an album used to throw the deck away, so it had to ask
    first, with a three-way dialog standing between the user and the
    sound. Nothing is thrown away any more, so nothing is asked: the
    album sounds on the temporary list and the deck waits. */
function verb_buttons(gobj, get_tracks)
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
            {click: (ev) => { ev.stopPropagation(); play_temp(get_tracks(), 0); }}],
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
function track_row(gobj, t_, list, showNum)
{
    let left = showNum
        ? ["div", {class: "MUS_NUM"}, t_.track ? String(t_.track) : "·"]
        : cover_spec(t_.key, "MUS_ART");

    let subtitle = t_.artist + (t_.album && !showNum ? " · " + t_.album : "");

    /*  Tapping the NAME opens the track's card: the whole title, over
        as many lines as it takes, and everything else known about it.
        Navigating a library must never take over what is sounding, and
        it should not commit to anything either — this is still the one
        gesture in the app that only looks.

        It used to unfold a block under the row instead. That block
        could show the album and the path but never the thing that was
        actually cut off, because the title above it stayed exactly as
        truncated as before; and it existed on this screen and not on
        the deck, so the same tap did different things depending on
        where you were. */
    let children = [
        left,
        ["button", {
                class: "MUS_ROWMAIN",
                type: "button",
                "aria-haspopup": "dialog"
            }, [
            ["span", {class: "MUS_T1"}, t_.title],
            ["span", {class: "MUS_T2"}, subtitle]
        ], {click: () => open_track(yui_shell_of(gobj), t_)}],
        track_counts(t_),
        track_buttons(t_, list)
    ];

    return ["div", {class: "MUS_ROWWRAP"}, [
        ["div", {class: "MUS_ROW", "data-tid": String(t_.uid)}, children]
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
            /*  By the album KEY, the same thing the Albums view groups
                on. Counting distinct titles said "12 albums" for an
                artist with nine, because three of them were tagged two
                ways. */
            let n = new Set(g.tracks.map((x) => x.key)).size;
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
                    priv.detail = {kind: view, id: g.id, name: g.name, tracks: g.tracks};
                    scroll_top(gobj);
                    render(gobj);
                }
            }],
            verb_buttons(gobj, () => ordered_detail({kind: view, tracks: g.tracks}))
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
                ["span", {class: "MUS_T2"}, display_name(a.artist)]
            ], {
                click: () => {
                    priv.detail = {kind: "albums", id: a.id, name: a.name,
                                   artist: a.artist, tracks: a.tracks};
                    scroll_top(gobj);
                    render(gobj);
                }
            }],
            verb_buttons(gobj, () => ordered_detail({kind: "albums", tracks: a.tracks}))
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
        meta.push(["span", {}, display_name(d.artist || d.tracks[0].albumArtist)]);
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
                        {click: () => play_temp(ordered, 0)}],
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

    /*  Artist / genre: ONE SECTION PER RECORD.
     *
     *  This is what "I need to see the albums by author" asks for, and
     *  the answer belongs here rather than in a sixth chip: an artist
     *  IS their records, so opening one should show records, not a
     *  run of songs with faint headings over it.
     *
     *  So each section carries what an album row carries — its sleeve,
     *  how many tracks, and the two verbs — and the tracks sit under
     *  it. Grouped through albums_of(), the same rule the Albums view
     *  uses: splitting on the raw title here showed one record tagged
     *  two ways as two headings, one directly under the other. */
    let $wrap = createElement2(["div", {class: "MUS_ROWS"}, []]);
    for(const a of albums_of(ordered)) {
        const tracks = ordered_detail({kind: "albums", tracks: a.tracks});
        $wrap.appendChild(createElement2(
            ["div", {class: "MUS_SECTION_H MUS_ALBHEAD"}, [
                cover_spec(a.tracks[0].key, "MUS_ART MUS_ALBHEAD_ART", "♪"),
                ["button", {class: "MUS_ROWMAIN", type: "button"}, [
                    ["span", {class: "MUS_T1"}, display_name(a.name)],
                    ["span", {class: "MUS_T2"}, [
                        ["span", {}, String(tracks.length)],
                        ["span", {i18n: "tracks"}, t("tracks")]
                    ]]
                ], {
                    click: () => {
                        priv.detail = {kind: "albums", id: a.id, name: a.name,
                                       tracks: a.tracks};
                        scroll_top(gobj);
                        render(gobj);
                    }
                }],
                verb_buttons(gobj, () => tracks)
            ]]));
        for(const x of tracks) {
            $wrap.appendChild(createElement2(track_row(gobj, x, tracks, true)));
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


/*  The counts on every row on screen, brought up to date in place. The
    rows carry the uid, which is what the library indexes tracks by. */
function paint_counts(gobj)
{
    let priv = gobj.priv;
    if(!priv.$content) {
        return;
    }
    let by_uid = new Map();
    all_tracks_sorted().forEach((x) => by_uid.set(String(x.uid), x));
    for(const $row of priv.$content.querySelectorAll(".MUS_ROW[data-tid]")) {
        let track = by_uid.get($row.getAttribute("data-tid"));
        if(track) {
            refresh_counts($row.querySelector(".MUS_CNTS"), track);
        }
    }
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
