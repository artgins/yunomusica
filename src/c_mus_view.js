/***********************************************************************
 *          c_mus_view.js
 *
 *      C_MUS_VIEW — the one view gclass every menu leaf mounts, told by
 *      its `view` attr which way to look at the library: "artistas",
 *      "albumes", "generos", "carpetas" or "pistas". It exposes the
 *      $container the shell requires and paints:
 *
 *        - an empty state with the two "load music" buttons, while the
 *          library is empty;
 *        - a progress line, while a pick is being read;
 *        - otherwise the grouped list (or the album grid, or the flat
 *          track list), with a one-level drill-down into a group/album.
 *
 *      A search box at the top filters the whole library into a flat
 *      result list, exactly as the reference musica.html did.
 *
 *      The view reads the library and drives playback through the shared
 *      music_store; it never talks to the host gobj. It repaints on the
 *      store's "library"/"loading" channels, and only re-highlights the
 *      playing row on "playing" (so a track change does not rebuild the
 *      list under the user's finger).
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
    createElement2,
} from "@yuneta/gobj-js";

import {
    subscribe,
    has_library, store_state,
    groups_for, albums, all_tracks_sorted, search, cover_url,
    play_list, current_track,
} from "./music_store.js";

import {pick_files, pick_dir} from "./picker.js";


/***************************************************************
 *              Constants
 ***************************************************************/
const GCLASS_NAME = "C_MUS_VIEW";

/*  Inline glyph (a filled triangle) for the "play all" buttons — the
 *  media controls live on the player, not the icon font. */
const ICON_PLAY = "<svg viewBox='0 0 24 24' width='16' height='16' fill='currentColor'><path d='M8 5v14l11-7z'/></svg>";
const ICON_BACK = "<svg viewBox='0 0 24 24' width='20' height='20' fill='currentColor'><path d='M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1z'/></svg>";

/*  createElement2 drops plain-string children inside an element array and
    treats a leading string as a tag, so an inline SVG must ride inside its
    own element whose (string) content it parses. */
function ico(svg)
{
    return ["span", {class: "MUS_ICO"}, svg];
}


/***************************************************************
 *              Attrs
 ***************************************************************/
const attrs_table = [
SDATA(data_type_t.DTP_POINTER,  "subscriber",  0,  null,       "Subscriber of output events"),
SDATA(data_type_t.DTP_STRING,   "view",        0,  "artistas", "artistas|albumes|generos|carpetas|pistas"),
SDATA(data_type_t.DTP_STRING,   "title",       0,  "",         "Human title of the view"),
SDATA(data_type_t.DTP_POINTER,  "$container",  0,  null,       "Root HTMLElement (shell contract)"),
SDATA_END()
];

let PRIVATE_DATA = {
    view:    "artistas",
    detail:  null,      // {kind, name, tracks} while drilled in
    search:  "",
    unsub:   null,      // store unsubscribe fn
    $content: null,
    search_timer: 0,
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
    let priv = gobj.priv;

    /*  CHILD subscription model: our output flows to the subscriber,
        defaulting to the parent (the shell). We do not emit anything
        today, but keep the contract. */
    let subscriber = gobj_read_pointer_attr(gobj, "subscriber");
    if(!subscriber) {
        subscriber = gobj_parent(gobj);
    }
    gobj_subscribe_event(gobj, null, {}, subscriber);

    priv.view = gobj_read_attr(gobj, "view") || "artistas";

    build_ui(gobj);
}

/***************************************************************
 *          Framework Method: Start
 ***************************************************************/
function mt_start(gobj)
{
    let priv = gobj.priv;

    /*  Repaint when the library or a load moves; only re-highlight the
        current row when playback moves — see file header. */
    priv.unsub = subscribe(function(channel) {
        if(channel === "library" || channel === "loading") {
            render(gobj);
        } else if(channel === "playing") {
            highlight_current(gobj);
        }
    });

    render(gobj);
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




/***************************************************************
 *  The persistent frame: a search header (kept across renders so
 *  its input never loses focus) and the content box that render()
 *  rebuilds.
 ***************************************************************/
function build_ui(gobj)
{
    let priv = gobj.priv;

    let $search = createElement2(
        ["input", {
            class: "MUS_SEARCH input",
            type: "search",
            placeholder: "Buscar título, artista, álbum…",
            autocomplete: "off",
            "aria-label": "Buscar"
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

    let $header = createElement2(
        ["div", {class: "MUS_HEADER"}, [
            ["div", {class: "MUS_SEARCH_WRAP"}, [$search]]
        ]]
    );

    let $content = createElement2(["div", {class: "MUS_CONTENT"}, []]);
    priv.$content = $content;

    let $c = createElement2(
        ["div", {class: "C_MUS_VIEW MUS_VIEW"}, [$header, $content]]
    );
    gobj_write_attr(gobj, "$container", $c);
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

/***************************************************************
 *  Repaint the content box for the current state.
 ***************************************************************/
function render(gobj)
{
    let priv = gobj.priv;
    let $content = priv.$content;
    if(!$content) {
        return;
    }
    clear($content);

    /*  Hide the search while there is nothing to search. */
    let $c = gobj_read_attr(gobj, "$container");
    let $header = $c && $c.querySelector(".MUS_HEADER");
    if($header) {
        $header.style.display = has_library() ? "" : "none";
    }

    if(!has_library()) {
        if(store_state.loading) {
            $content.appendChild(build_loading());
        } else {
            $content.appendChild(build_empty());
        }
        return;
    }

    if(priv.search) {
        render_list($content, search(priv.search));
        highlight_current(gobj);
        return;
    }

    if(priv.detail) {
        render_detail(gobj, $content);
        highlight_current(gobj);
        return;
    }

    if(priv.view === "pistas") {
        render_list($content, all_tracks_sorted());
    } else if(priv.view === "albumes") {
        render_albums(gobj, $content);
    } else {
        render_groups(gobj, $content, priv.view);
    }
    highlight_current(gobj);
}


/***************************************************************
 *  Empty state — the two ways to load music.
 ***************************************************************/
function build_empty()
{
    return createElement2(
        ["div", {class: "MUS_EMPTY"}, [
            ["h1", {class: "MUS_EMPTY_TITLE"}, [
                ["span", {}, "Tu música,"],
                ["br", {}],
                ["em", {}, "como quieras verla."]
            ]],
            ["p", {class: "MUS_EMPTY_LEAD"},
                "Elige la carpeta o los ficheros. Se leen aquí, en el móvil: nada sale del dispositivo."],
            ["div", {class: "MUS_PICKERS"}, [
                ["button", {class: "MUS_PICK button is-primary", type: "button"},
                    "Elegir una carpeta", {click: () => pick_dir()}],
                ["button", {class: "MUS_PICK is-ghost button", type: "button"},
                    "Elegir ficheros sueltos", {click: () => pick_files()}]
            ]],
            ["p", {class: "MUS_HINT"},
                "Se leen las etiquetas de cada fichero para agrupar por artista, álbum y género. " +
                "Al recargar la página hay que volver a elegir: el navegador no guarda el permiso sobre tus ficheros."]
        ]]
    );
}


/***************************************************************
 *  Loading progress.
 ***************************************************************/
function build_loading()
{
    let total = store_state.total || 1;
    let pct = Math.round((store_state.loaded / total) * 100);
    return createElement2(
        ["div", {class: "MUS_LOADING"}, [
            ["div", {class: "MUS_LOAD_COUNT"}, `${store_state.loaded} pistas`],
            ["div", {class: "MUS_BAR"}, [
                ["i", {class: "MUS_BAR_FILL", style: `width:${pct}%`}]
            ]],
            ["div", {class: "MUS_LOAD_NAME"}, store_state.load_name || "Leyendo etiquetas…"]
        ]]
    );
}


/***************************************************************
 *  Cover art: an <img> when the album has one, else a glyph tile.
 ***************************************************************/
function cover_spec(key, cls, fallback)
{
    let url = cover_url(key);
    if(url) {
        return ["img", {class: cls, src: url, loading: "lazy", alt: ""}];
    }
    return ["div", {class: cls}, fallback || "♪"];
}


/***************************************************************
 *  A single track row. `list` is the play context (the ordered
 *  list a tap starts a queue from); showNum swaps the cover for the
 *  track number in album/folder detail.
 ***************************************************************/
function track_row(t, list, showNum)
{
    let left = showNum
        ? ["div", {class: "MUS_NUM"}, t.track ? String(t.track) : "·"]
        : cover_spec(t.key, "MUS_ART");

    let subtitle = t.artist + (t.album && !showNum ? " · " + t.album : "");

    return ["button", {
            class: "MUS_ROW",
            type: "button",
            "data-tid": String(t.id)
        }, [
            left,
            ["div", {class: "MUS_META"}, [
                ["div", {class: "MUS_T1"}, t.title],
                ["div", {class: "MUS_T2"}, subtitle]
            ]]
        ], {
            click: () => play_list(list, list.indexOf(t))
        }];
}


/***************************************************************
 *  Flat track list.
 ***************************************************************/
function render_list($content, list)
{
    if(!list.length) {
        $content.appendChild(createElement2(
            ["div", {class: "MUS_EMPTY_NOTE"}, "Nada por aquí."]));
        return;
    }
    let $rows = createElement2(["div", {class: "MUS_ROWS"},
        list.map((t) => track_row(t, list, false))]);
    $content.appendChild($rows);
}


/***************************************************************
 *  Grouped list (artistas / generos / carpetas): one row per group,
 *  a tap drills in.
 ***************************************************************/
function render_groups(gobj, $content, view)
{
    let priv = gobj.priv;
    let groups = groups_for(view);
    let round = view === "artistas";
    let fallback = round ? "♫" : (view === "carpetas" ? "▤" : "♪");

    let rows = groups.map(function(g) {
        let subtitle = g.tracks.length + (g.tracks.length === 1 ? " pista" : " pistas");
        if(view === "artistas") {
            let nAlb = new Set(g.tracks.map((t) => t.album)).size;
            subtitle += " · " + nAlb + (nAlb === 1 ? " álbum" : " álbumes");
        }
        return ["button", {class: "MUS_ROW", type: "button"}, [
            cover_spec(g.tracks[0].key, "MUS_ART" + (round ? " is-round" : ""), fallback),
            ["div", {class: "MUS_META"}, [
                ["div", {class: "MUS_T1"}, g.name],
                ["div", {class: "MUS_T2"}, subtitle]
            ]]
        ], {
            click: () => {
                priv.detail = {kind: view, name: g.name, tracks: g.tracks};
                scroll_top(gobj);
                render(gobj);
            }
        }];
    });

    $content.appendChild(createElement2(["div", {class: "MUS_ROWS"}, rows]));
}


/***************************************************************
 *  Album grid.
 ***************************************************************/
function render_albums(gobj, $content)
{
    let priv = gobj.priv;
    let cards = albums().map(function(a) {
        return ["button", {class: "MUS_CARD", type: "button"}, [
            cover_spec(a.tracks[0].key, "MUS_COVER", "♪"),
            ["div", {class: "MUS_T1"}, a.name],
            ["div", {class: "MUS_T2"}, a.tracks[0].albumArtist]
        ], {
            click: () => {
                priv.detail = {kind: "album", name: a.name, tracks: a.tracks};
                scroll_top(gobj);
                render(gobj);
            }
        }];
    });
    $content.appendChild(createElement2(["div", {class: "MUS_GRID"}, cards]));
}


/***************************************************************
 *  Drill-down detail: a header with cover + "play all", then the
 *  tracks. An album is a flat, track-numbered list; an artist /
 *  genre / folder is split into per-album sections.
 ***************************************************************/
function render_detail(gobj, $content)
{
    let priv = gobj.priv;
    let d = priv.detail;
    let ordered = ordered_detail(d);

    let year = d.tracks[0].year;
    let meta = d.tracks.length + " pistas"
        + (d.kind === "album" ? " · " + d.tracks[0].albumArtist : "")
        + (d.kind === "album" && year ? " · " + year : "");

    let $head = createElement2(
        ["div", {class: "MUS_DHEAD"}, [
            cover_spec(d.tracks[0].key, "MUS_COVER MUS_DCOVER", d.kind === "artistas" ? "♫" : "♪"),
            ["div", {class: "MUS_DINFO"}, [
                ["h3", {class: "MUS_DTITLE"}, d.name],
                ["p", {class: "MUS_DMETA"}, meta],
                ["button", {class: "MUS_PLAYALL button is-primary", type: "button"},
                    [ico(ICON_PLAY), ["span", {}, "Reproducir"]],
                    {click: () => play_list(ordered, 0)}]
            ]]
        ]]
    );

    let $back = createElement2(
        ["button", {class: "MUS_BACK button is-ghost", type: "button"},
            [ico(ICON_BACK), ["span", {}, "Volver"]],
            {click: () => { priv.detail = null; render(gobj); scroll_top(gobj); }}]
    );

    $content.appendChild($back);
    $content.appendChild($head);

    if(d.kind === "album" || d.kind === "carpetas") {
        let $rows = createElement2(["div", {class: "MUS_ROWS"},
            ordered.map((t) => track_row(t, ordered, true))]);
        $content.appendChild($rows);
        return;
    }

    /*  Artist / genre: one section per album. */
    let sections = new Map();
    for(let t of ordered) {
        if(!sections.has(t.album)) {
            sections.set(t.album, []);
        }
        sections.get(t.album).push(t);
    }
    let $wrap = createElement2(["div", {class: "MUS_ROWS"}, []]);
    for(let [album, tracks] of sections.entries()) {
        $wrap.appendChild(createElement2(
            ["div", {class: "MUS_SECTION_H"}, album]));
        for(let t of tracks) {
            $wrap.appendChild(createElement2(track_row(t, ordered, true)));
        }
    }
    $content.appendChild($wrap);
}


function ordered_detail(d)
{
    let t = [...d.tracks];
    const collator = new Intl.Collator("es", {sensitivity: "base"});
    const byTrackNo = (a,b) => (a.track - b.track) || collator.compare(a.title, b.title);
    if(d.kind === "album") {
        return t.sort(byTrackNo);
    }
    return t.sort((a,b) => collator.compare(a.album, b.album) || byTrackNo(a,b));
}


/***************************************************************
 *  Toggle the "playing" tint on whichever row is the current
 *  track, without rebuilding the list.
 ***************************************************************/
function highlight_current(gobj)
{
    let priv = gobj.priv;
    if(!priv.$content) {
        return;
    }
    let cur = current_track();
    let cur_id = cur ? String(cur.id) : null;
    let rows = priv.$content.querySelectorAll(".MUS_ROW[data-tid]");
    for(let r of rows) {
        r.classList.toggle("is-playing", r.getAttribute("data-tid") === cur_id);
    }
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
        ["ST_IDLE", []]
    ];
    const event_types = [];

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
