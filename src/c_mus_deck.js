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
    progress, fmt_time, queue_position,
} from "./music_store.js";

import {
    add_dir, add_files,
    subscribe_sources, pending_authorisation, authorize_all,
} from "./sources_store.js";
import {save_queue_as} from "./playlists_store.js";
import {subscribe_update, is_stale, latest_version} from "./update_check.js";
import {
    subscribe_install, install_bar_due, dismiss_install_bar,
} from "./install_prompt.js";
import {open_install} from "./install_dialog.js";
import {open_about} from "./about_dialog.js";

import {t} from "i18next";


/***************************************************************
 *              Constants
 ***************************************************************/
const GCLASS_NAME = "C_MUS_DECK";

/*  How long a fact stays on the banner before the next one fades in. */
const FACT_MS = 4500;

/*  How long the fade of a leaving fact lasts — must match the CSS. */
const FACT_FADE_MS = 420;

/*  Follow: how long the scroll has to sit still before the playing row
    is brought back to the middle. Configurable in seconds, because ten
    is a guess and the right number depends on how long the reader
    takes: `localStorage["yunomusica:follow_delay"] = 20`. 0 or a
    number that does not parse means the default. */
const FOLLOW_MS_DEFAULT = 10000;

/*  Close enough to the middle that scrolling again would be fidgeting. */
const FOLLOW_SLACK_PX = 24;

/*  A smooth scroll of ours emits scroll events exactly like a finger
    does. Without a window in which they are ignored, our own scroll
    re-arms the idle timer and the deck follows itself for ever. */
const FOLLOW_SETTLE_MS = 900;

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
    follow:  "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A9 9 0 0 0 13 3.06V1h-2v2.06A9 9 0 0 0 3.06 11H1v2h2.06A9 9 0 0 0 11 20.94V23h2v-2.06A9 9 0 0 0 20.94 13H23v-2zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z",
};

/*  A value the tags did not carry is stored as its English key so that
    it can be translated at paint time, like the library does. */
const UNKNOWN_KEYS = {
    "unknown artist": true,
    "unknown album":  true,
    "unknown genre":  true
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
    unsub_ins:  null,   // the browser will let us offer an install
    $now:       null,   // the transport card and the bars under it
    $queue:     null,   // the queue box
    naming:     false,  // the "save as list" row is open
    drag_from:  -1,

    /*  The banner is built ONCE and updated in place. Rebuilding it on
        every repaint is what made it impossible to fade anything: a
        node that is thrown away and made again has no previous state
        to animate from. */
    $art:       null,   // the cover tile
    $art_l:     [],     // its two <img> layers, for the crossfade
    $bg_l:      [],     // the two blurred backdrop layers
    $meta:      null,   // title + subtitle, faded as a block
    $title:     null,
    $sub:       null,
    $facts:     null,   // the rotating line under the title
    $transport: null,
    $bars:      null,   // update / authorise / notice, rebuilt as before
    cover:      null,   // the cover URL currently on the front layer
    front:      0,      // which layer is the front one
    track_key:  "",     // identity of the track the banner is showing
    facts:      [],
    fact_i:     0,
    fact_timer: null,

    /*  Follow the playing row. */
    $scroll:     null,  // the only part of the deck that scrolls
    $scroller:   null,
    last_scroll: 0,
    on_scroll:   null,
    follow_timer: null,
    settle_timer: null,
    self_scroll: false,
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
            follow_now(gobj, false);
        } else if(channel === "playing") {
            paint_now(gobj);
            paint_queue_highlight(gobj);
            follow_now(gobj, false);
        } else if(channel === "time") {
            paint_time(gobj);
        }
    });

    start_follow(gobj);

    /*  The authorisation banner lives on this screen, so it has to
        follow the sources too. */
    priv.unsub_src = subscribe_sources(() => paint_now(gobj));
    priv.unsub_upd = subscribe_update(() => paint_now(gobj));
    priv.unsub_ins = subscribe_install(() => paint_now(gobj));

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
    if(priv.unsub_ins) {
        priv.unsub_ins();
        priv.unsub_ins = null;
    }
    stop_facts(gobj);
    stop_follow(gobj);
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

    let $now   = createElement2(["div", {class: "MUS_NOWCARD"}, [build_card(gobj)]]);
    let $queue = createElement2(["section", {class: "MUS_QUEUEBOX"}, []]);
    priv.$now = $now;
    priv.$queue = $queue;
    $now.appendChild(priv.$bars);

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
            ["a", {
                class: "MUS_CREDITS_BRAND",
                href: "https://yuneta.io",
                target: "_blank",
                rel: "noopener noreferrer",
                i18n: "made with yuneta"
            }, t("made with yuneta")],
            ["button", {class: "MUS_CREDITS_HELP", type: "button", i18n: "help"},
                t("help"), {click: () => open_help(gobj)}],
            ["span", {class: "MUS_CREDITS_COPY"}, "© 2026 ArtGins"]
        ]]
    );

    /*  The banner and the bars stay put; only the list moves. What is
        sounding is the one thing you should never have to scroll back
        up to find, and on a phone the queue used to push it off the
        top within half a dozen tracks.

        This is also what makes following the music possible at all:
        with the whole view scrolling inside the shell zone, "centre
        the playing row" meant scrolling the transport away. */
    let $scroll = createElement2(
        ["div", {class: "MUS_DECKSCROLL"}, [$queue, $credits]]);
    priv.$scroll = $scroll;

    let $c = createElement2(
        ["div", {class: "C_MUS_DECK MUS_DECK"}, [$now, $scroll]]
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




/***************************************************************
 *  The banner, built ONCE and updated in place.
 *
 *  A record is something to look at, and the deck is where it
 *  gets looked at: the cover blurred across the whole card, the
 *  cover itself in front of it, and under the title a line that
 *  changes on its own — year, genre, track number, where this
 *  one sits in the queue.
 *
 *  This is also the only place in the app that fades anything.
 *  Everywhere else the DOM is swapped outright, which is right
 *  for a list being edited under a finger; here nothing is being
 *  operated, so a cut between two covers is just abrupt. Fading
 *  needs the node to survive, though — a node thrown away and
 *  made again has no previous state to animate from — hence the
 *  handles kept in priv and the update-in-place below.
 ***************************************************************/
function build_card(gobj)
{
    let priv = gobj.priv;

    /*  Two of everything that crossfades: the outgoing image has to
        still be on screen while the incoming one arrives. */
    priv.$bg_l = [
        createElement2(["div", {class: "MUS_DECKBG_L"}]),
        createElement2(["div", {class: "MUS_DECKBG_L"}])
    ];
    priv.$art_l = [
        createElement2(["img", {class: "MUS_DECKART_L", alt: ""}]),
        createElement2(["img", {class: "MUS_DECKART_L", alt: ""}])
    ];

    priv.$art = createElement2(
        ["div", {class: "MUS_DECKART is-empty"}, [
            priv.$art_l[0],
            priv.$art_l[1],
            ["span", {class: "MUS_DECKART_GLYPH"}, "♪"]
        ]]);

    priv.$title = createElement2(["h2", {class: "MUS_DECKTITLE"}, ""]);
    priv.$sub   = createElement2(["p", {class: "MUS_DECKSUB"}, ""]);
    priv.$facts = createElement2(["div", {class: "MUS_DECKFACTS"}]);
    priv.$meta  = createElement2(
        ["div", {class: "MUS_DECKMETA"}, [priv.$title, priv.$sub, priv.$facts]]);

    priv.$transport = createElement2(["div", {class: "MUS_TRANSPORT"}]);
    priv.$bars = createElement2(["div", {class: "MUS_DECKBARS"}]);

    return createElement2(
        ["div", {class: "MUS_DECKCARD"}, [
            ["div", {class: "MUS_DECKBG", "aria-hidden": "true"},
                [priv.$bg_l[0], priv.$bg_l[1]]],
            ["div", {class: "MUS_DECKBODY"}, [
                ["div", {class: "MUS_DECKHEAD"}, [priv.$art, priv.$meta]],
                ["div", {class: "MUS_SEEK", role: "progressbar"},
                    [["i", {class: "MUS_SEEK_FILL"}]],
                    {click: (ev) => seek_at(ev, ev.currentTarget)}],
                ["div", {class: "MUS_TIMES"}, [
                    ["span", {class: "MUS_TCUR"}, "0:00"],
                    ["span", {class: "MUS_TTOT"}, "0:00"]
                ]],
                priv.$transport
            ]]
        ]]);
}

function paint_now(gobj)
{
    let priv = gobj.priv;
    if(!priv.$now) {
        return;
    }
    let track = current_track();

    update_cover(gobj, track ? cover_url(track.key) : null);
    update_meta(gobj, track);
    update_transport(gobj);
    paint_bars(gobj);
    paint_time(gobj);
    refresh_language(priv.$now, t);
}

/*  A tag the file did not carry is stored as its English key. */
function tr(value)
{
    return UNKNOWN_KEYS[value] ? t(value) : value;
}

/***************************************************************
 *  The cover, crossfaded. Two <img> layers in the tile and two
 *  more behind the whole card; the incoming pair is only
 *  revealed once it has decoded, or the fade goes through a
 *  blank frame.
 ***************************************************************/
function update_cover(gobj, url)
{
    let priv = gobj.priv;
    if(priv.cover === url) {
        return;
    }
    priv.cover = url;
    priv.$art.classList.toggle("is-empty", !url);

    if(!url) {
        priv.$art_l.forEach(function($l) {
            $l.classList.remove("is-on");
            /*  src="" is not "no image": it re-requests the page URL.
                The attribute has to go. */
            $l.removeAttribute("src");
        });
        priv.$bg_l.forEach(function($l) {
            $l.classList.remove("is-on");
            $l.style.backgroundImage = "";
        });
        return;
    }

    let back    = priv.front ? 0 : 1;
    let $in     = priv.$art_l[back];
    let $out    = priv.$art_l[priv.front];
    let $bg_in  = priv.$bg_l[back];
    let $bg_out = priv.$bg_l[priv.front];
    priv.front = back;

    const reveal = function() {
        /*  The track may have changed again while this one decoded. */
        if(priv.cover !== url) {
            return;
        }
        $bg_in.style.backgroundImage = `url("${url}")`;
        $in.classList.add("is-on");
        $bg_in.classList.add("is-on");
        $out.classList.remove("is-on");
        $bg_out.classList.remove("is-on");
    };

    $in.src = url;
    if($in.decode) {
        /*  decode() rejects when the src is replaced mid-flight, and an
            unhandled rejection is a console error — which the suite
            counts as a failed run. Both arms land on the same guard. */
        $in.decode().then(reveal, reveal);
    } else {
        $in.onload = reveal;
    }
}

/***************************************************************
 *  Title, subtitle and the rotating facts.
 ***************************************************************/
function update_meta(gobj, track)
{
    let priv = gobj.priv;
    let key = track ? (track.source_id + "|" + track.path) : "";
    let changed = (key !== priv.track_key);
    priv.track_key = key;

    if(changed) {
        if(track) {
            priv.$title.removeAttribute("data-i18n");
            priv.$title.textContent = track.title;
            priv.$sub.textContent = tr(track.artist) +
                (track.album ? " · " + tr(track.album) : "");
        } else {
            priv.$title.setAttribute("data-i18n", "nothing cued");
            priv.$title.textContent = t("nothing cued");
            priv.$sub.textContent = "";
        }
        flash(priv.$meta);
    }

    let facts = facts_of(track);
    if(changed || !same_facts(facts, priv.facts)) {
        priv.facts = facts;
        if(changed || priv.fact_i >= facts.length) {
            priv.fact_i = 0;
        }
        show_fact(gobj, priv.fact_i, false);
        start_facts(gobj);
    }
}

/*  Restart a CSS animation on a node that is already in the document:
    without the reflow the class goes off and on inside one frame and
    the browser sees no change at all. */
function flash($node)
{
    $node.classList.remove("is-swap");
    void $node.offsetWidth;
    $node.classList.add("is-swap");
}

/*  What the banner has to say beyond the title and the artist. The
    album is not here: it is in the subtitle, where it stays put — the
    record is the one thing that should never have to be waited for.

    No fact interpolates a number into a sentence: the value is its own
    node beside a plain noun, which is what keeps ten languages out of
    the plural-rule business. */
function facts_of(track)
{
    if(!track) {
        return [];
    }
    let out = [];
    if(track.year) {
        out.push({k: "year", v: track.year});
    }
    if(track.genre) {
        out.push({k: "genre", v: track.genre});
    }
    if(track.track) {
        out.push({k: "track number", v: String(track.track)});
    }
    let pos = queue_position();
    if(pos.length > 1 && pos.index >= 0) {
        out.push({k: "queue", v: (pos.index + 1) + " / " + pos.length});
    }
    return out;
}

function same_facts(a, b)
{
    if(a.length !== b.length) {
        return false;
    }
    return a.every((f, i) => f.k === b[i].k && f.v === b[i].v);
}

function show_fact(gobj, i, animate)
{
    let priv = gobj.priv;
    let $box = priv.$facts;
    if(!$box) {
        return;
    }
    /*  Anything still fading out has had its turn. */
    while($box.children.length > 1) {
        $box.removeChild($box.firstChild);
    }

    let fact = priv.facts[i];
    /*  `hidden` loses to any display rule; the style property does not. */
    $box.style.display = fact ? "" : "none";
    if(!fact) {
        clear($box);
        return;
    }

    let unknown = UNKNOWN_KEYS[fact.v];
    let $new = createElement2(
        ["span", {class: "MUS_FACT"}, [
            ["span", {class: "MUS_FACT_K", i18n: fact.k}, t(fact.k)],
            ["span", unknown
                ? {class: "MUS_FACT_V", i18n: fact.v}
                : {class: "MUS_FACT_V"},
                unknown ? t(fact.v) : fact.v]
        ]]);

    if(!animate) {
        clear($box);
        $box.appendChild($new);
        $new.classList.add("is-on");
        return;
    }

    let $old = $box.lastElementChild;
    if($old) {
        /*  Both classes at once would leave the outgoing fact relying on
            which rule the stylesheet happens to declare last. */
        $old.classList.remove("is-on");
        $old.classList.add("is-leaving");
        setTimeout(function() {
            if($old.parentNode) {
                $old.parentNode.removeChild($old);
            }
        }, FACT_FADE_MS);
    }
    $box.appendChild($new);
    /*  Appending a node and giving it its final class in the same frame
        never transitions: there is no start value to come from. */
    requestAnimationFrame(() => $new.classList.add("is-on"));
}

function start_facts(gobj)
{
    let priv = gobj.priv;
    stop_facts(gobj);
    if(priv.facts.length > 1) {
        priv.fact_timer = setInterval(() => next_fact(gobj), FACT_MS);
    }
}

function stop_facts(gobj)
{
    let priv = gobj.priv;
    if(priv.fact_timer) {
        clearInterval(priv.fact_timer);
        priv.fact_timer = null;
    }
}

function next_fact(gobj)
{
    let priv = gobj.priv;
    if(!priv.facts.length || !priv.$facts) {
        return;
    }
    /*  A tab in the background is not being read, and neither is a view
        the user has navigated away from — this one is kept alive. */
    if(document.hidden || !priv.$facts.offsetParent) {
        return;
    }
    priv.fact_i = (priv.fact_i + 1) % priv.facts.length;
    show_fact(gobj, priv.fact_i, true);
}

function update_transport(gobj)
{
    let priv = gobj.priv;
    let playing = is_playing();
    clear(priv.$transport);
    [
        tog_button("MUS_SHUFFLE", P.shuffle, 20, "shuffle", get_shuffle(),
            () => { set_shuffle(!get_shuffle()); paint_now(gobj); }),
        ctl_button("MUS_TPREV", P.prev, 26, "previous", () => prev()),
        ctl_button("MUS_TPLAY is-primary", playing ? P.pause : P.play, 30,
            playing ? "pause" : "play", () => toggle()),
        ctl_button("MUS_TNEXT", P.next, 26, "next", () => step(1)),
        tog_button("MUS_REPEAT", P.repeat, 20, "repeat", get_repeat(),
            () => { set_repeat(!get_repeat()); paint_now(gobj); })
    ].forEach((spec) => priv.$transport.appendChild(createElement2(spec)));
}

/***************************************************************
 *  The bars under the card: a newer build, folders waiting to be
 *  authorised, and whatever the store had to say. These do get
 *  rebuilt — they come and go, and none of them fades.
 ***************************************************************/
function paint_bars(gobj)
{
    let $now = gobj.priv.$bars;
    clear($now);

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

    /*  The way out of the bar above: an installed app is the only kind
        Chrome will keep folder permissions for. It is offered here, and
        not left to the browser, because Chrome's own banner stops
        appearing for months once it has been dismissed or the app has
        been installed and removed — a reinstall then finds nothing to
        press. This bar does not care what Chrome remembers. */
    if(install_bar_due()) {
        $now.appendChild(createElement2(
            ["div", {class: "MUS_AUTHBAR MUS_INSTBAR", role: "status"}, [
                ["div", {class: "MUS_AUTHBAR_TXT"}, [
                    ["span", {i18n: "install this app"}, t("install this app")],
                    ["span", {class: "MUS_AUTHBAR_WHICH", i18n: "install so folders stay"},
                        t("install so folders stay")]
                ]],
                ["button", {class: "MUS_QBTN button is-primary", type: "button",
                            i18n: "install"},
                    t("install"), {click: () => open_install(yui_shell_of(gobj))}],
                ["button", {class: "MUS_NOTICE_X", type: "button",
                            "aria-label": t("close"),
                            "data-i18n-aria-label": "close"},
                    svg(P.cross, 14), {click: () => dismiss_install_bar()}]
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
                    {click: () => queue_clear()}],
                /*  Last, and never disabled: it is a setting, not an
                    action on the queue. Anything before it would also
                    move the two buttons above, which the suite finds
                    by position. */
                ["button", {
                        class: "MUS_QBTN MUS_TOG button is-ghost" +
                            (follow_on() ? " is-on" : ""),
                        type: "button",
                        "aria-pressed": follow_on() ? "true" : "false"
                    },
                    [ico(P.follow, 16),
                     ["span", {i18n: "follow playing"}, t("follow playing")]],
                    {click: () => toggle_follow(gobj)}]
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
                     *      Follow the music
                     ***************************/




/***************************************************************
 *  A long queue plays past the bottom of the screen and the row
 *  that is sounding ends up somewhere the user cannot see. So:
 *  when the scroll has been still for a while — long enough that
 *  nobody is reading the part they scrolled to — the playing row
 *  is brought back to the middle, and it stays there as the
 *  queue advances.
 *
 *  Two rules make it a help rather than a fight:
 *
 *    - ANY scroll of the user's re-arms the wait from zero. While
 *      they are looking at something, the page is theirs.
 *    - Our own smooth scroll emits the same scroll events a
 *      finger does, so it is fenced off with `self_scroll`.
 *      Without that fence the deck follows itself for ever.
 *
 *  Ten seconds is a guess, and how long somebody needs depends on
 *  what they are doing, so it is configurable:
 *      localStorage["yunomusica:follow_delay"] = 20    // seconds
 *  The button on the queue header turns the whole thing off.
 ***************************************************************/
function follow_on()
{
    try {
        return localStorage.getItem("yunomusica:follow") !== "0";
    } catch(e) {
        return true;
    }
}

function set_follow_on(on)
{
    try {
        localStorage.setItem("yunomusica:follow", on ? "1" : "0");
    } catch(e) {
    }
}

function follow_delay()
{
    let secs = NaN;
    try {
        secs = parseFloat(localStorage.getItem("yunomusica:follow_delay"));
    } catch(e) {
    }
    return (isFinite(secs) && secs > 0) ? secs * 1000 : FOLLOW_MS_DEFAULT;
}

function start_follow(gobj)
{
    let priv = gobj.priv;
    priv.$scroller = priv.$scroll;
    priv.last_scroll = 0;
    if(!priv.$scroller) {
        return;
    }
    priv.on_scroll = function() {
        if(priv.self_scroll) {
            return;             // that one was ours
        }
        priv.last_scroll = Date.now();
        arm_follow(gobj);
    };
    priv.$scroller.addEventListener("scroll", priv.on_scroll, {passive: true});
    arm_follow(gobj);
}

function stop_follow(gobj)
{
    let priv = gobj.priv;
    if(priv.on_scroll && priv.$scroller) {
        priv.$scroller.removeEventListener("scroll", priv.on_scroll);
    }
    priv.on_scroll = null;
    priv.$scroller = null;
    if(priv.follow_timer) {
        clearTimeout(priv.follow_timer);
        priv.follow_timer = null;
    }
    if(priv.settle_timer) {
        clearTimeout(priv.settle_timer);
        priv.settle_timer = null;
    }
    priv.self_scroll = false;
}

function arm_follow(gobj)
{
    let priv = gobj.priv;
    if(priv.follow_timer) {
        clearTimeout(priv.follow_timer);
    }
    priv.follow_timer = setTimeout(() => follow_now(gobj, true), follow_delay());
}

function follow_idle(gobj)
{
    return (Date.now() - gobj.priv.last_scroll) >= follow_delay();
}

/*  from_timer: the wait ran out. Otherwise this is a track change, and
    it only centres if the user was not scrolling anyway. */
function follow_now(gobj, from_timer)
{
    let priv = gobj.priv;
    if(!follow_on() || document.hidden) {
        return;
    }
    if(!from_timer && !follow_idle(gobj)) {
        return;
    }
    let $c = gobj_read_attr(gobj, "$container");
    /*  keep_alive leaves this view mounted while another one is on the
        stage. Scrolling a page nobody is looking at is worse than not
        following at all: they come back to a queue that moved. */
    if(!$c || !$c.isConnected || !$c.offsetParent) {
        return;
    }
    let $row = priv.$queue
        ? priv.$queue.querySelector(".MUS_QROW.is-playing")
        : null;
    let $s = priv.$scroller;
    if(!$row || !$s) {
        return;
    }

    /*  Centre on the box the rows actually scroll in, not on the
        window: the banner above it does not move. */
    let box = $s.getBoundingClientRect();
    let r = $row.getBoundingClientRect();
    let delta = (r.top + r.height / 2) - (box.top + box.height / 2);
    if(Math.abs(delta) < FOLLOW_SLACK_PX) {
        return;                 // near enough; moving now would be fidgeting
    }

    priv.self_scroll = true;
    if(priv.settle_timer) {
        clearTimeout(priv.settle_timer);
    }
    priv.settle_timer = setTimeout(function() {
        priv.self_scroll = false;
    }, FOLLOW_SETTLE_MS);

    let smooth = !(window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    $s.scrollBy({top: delta, left: 0, behavior: smooth ? "smooth" : "auto"});
}

function toggle_follow(gobj)
{
    set_follow_on(!follow_on());
    paint_queue(gobj);
    if(follow_on()) {
        /*  Switching it on is itself a request to see what is playing. */
        follow_now(gobj, true);
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
    /*  The subtitle composes artist and album into ONE string, and a
        tag the file did not carry ("unknown album") is part of it —
        refresh_language cannot reach inside a composed node. Forgetting
        which track the banner is showing makes update_meta rewrite it. */
    gobj.priv.track_key = null;
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
